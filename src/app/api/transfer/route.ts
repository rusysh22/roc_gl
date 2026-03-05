import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateJournalNumber } from "@/lib/journal";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get("search") || "";
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");

        const where: any = {
            companyId: user.companyId,
            journalType: "IC",
        };

        if (search) {
            where.OR = [
                { journalNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { referenceNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        if (dateFrom || dateTo) {
            where.journalDate = {};
            if (dateFrom) where.journalDate.gte = new Date(dateFrom);
            if (dateTo) where.journalDate.lte = new Date(dateTo);
        }

        const transfers = await prisma.journal.findMany({
            where,
            include: {
                lines: { include: { coa: true } },
                period: true,
            },
            orderBy: { journalDate: "desc" },
            take: 100,
        });

        return NextResponse.json(transfers);
    } catch (error) {
        console.error("Transfer GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { sourceBankId, targetBankId, date, amount, reference, description } = body;

        if (!sourceBankId || !targetBankId || !date || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (sourceBankId === targetBankId) {
            return NextResponse.json({ error: "Source and Target banks cannot be the same" }, { status: 400 });
        }

        const transferDate = new Date(date);
        const transferAmount = Number(amount);

        if (transferAmount <= 0) {
            return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
        }

        // 1. Get Both Bank Accounts & verify active
        const sourceBank = await prisma.bankAccount.findUnique({ where: { id: sourceBankId, companyId: user.companyId } });
        const targetBank = await prisma.bankAccount.findUnique({ where: { id: targetBankId, companyId: user.companyId } });

        if (!sourceBank || !targetBank) return NextResponse.json({ error: "One or both bank accounts not found" }, { status: 404 });
        if (!sourceBank.isActive || !targetBank.isActive) return NextResponse.json({ error: "One or both bank accounts are inactive" }, { status: 400 });

        // Ensure same currency for simple transfers (Phase v1 limitation for simplicity)
        if (sourceBank.currencyCode !== targetBank.currencyCode) {
            return NextResponse.json({ error: "Inter-currency transfers require an Exchange Rate setup (coming soon)." }, { status: 400 });
        }

        // 2. Resolve Period
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: transferDate },
                endDate: { gte: transferDate },
            },
            include: { fiscalYear: true }
        });

        if (!period || period.status !== "OPEN") {
            return NextResponse.json({ error: "Target period is not open or not found" }, { status: 400 });
        }

        // 3. Generate Journal Number type IC (Inter-Company/Internal Cash) or TR (Transfer)
        const journalNumber = await generateJournalNumber(user.companyId, transferDate, "IC");

        // 4. Transaction Atomicity
        const result = await prisma.$transaction(async (tx) => {
            // A. Create POSTED Journal (Credit Source, Debit Target)
            const journal = await tx.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: "IC", // Internal Cash Transfer
                    journalDate: transferDate,
                    postingDate: transferDate,
                    periodId: period.id,
                    fiscalYearId: period.fiscalYearId,
                    referenceNumber: reference,
                    description: description || `Fund transfer from ${sourceBank.accountName} to ${targetBank.accountName}`,
                    currencyCode: sourceBank.currencyCode,
                    totalDebit: transferAmount,
                    totalCredit: transferAmount,
                    status: "POSTED",
                    createdBy: user.id || "system",
                    postedBy: user.id || "system",
                    postedAt: new Date(),
                    lines: {
                        create: [
                            {
                                companyId: user.companyId,
                                lineNumber: 1,
                                coaId: targetBank.coaId, // Money IN -> Debit
                                description: `Transfer In from ${sourceBank.accountName}`,
                                debitAmount: transferAmount,
                                creditAmount: 0,
                                debitBase: transferAmount,
                                creditBase: 0,
                            },
                            {
                                companyId: user.companyId,
                                lineNumber: 2,
                                coaId: sourceBank.coaId, // Money OUT -> Credit
                                description: `Transfer Out to ${targetBank.accountName}`,
                                debitAmount: 0,
                                creditAmount: transferAmount,
                                debitBase: 0,
                                creditBase: transferAmount,
                            }
                        ]
                    }
                },
                include: { lines: true }
            });

            // Find line IDs explicitly by line number to avoid issues if both banks share the same GL CoA
            const targetLine = journal.lines.find(l => l.lineNumber === 1);
            const sourceLine = journal.lines.find(l => l.lineNumber === 2);

            // B. Bank Transaction for Source (Money Out => CREDIT type for bank statement perspective)
            await tx.bankTransaction.create({
                data: {
                    companyId: user.companyId,
                    bankAccountId: sourceBank.id,
                    transactionDate: transferDate,
                    valueDate: transferDate,
                    transactionType: "CREDIT",
                    amount: transferAmount,
                    reference: reference || journalNumber,
                    description: `Transfer to ${targetBank.accountName}`,
                    status: "MATCHED",
                    journalLineId: sourceLine?.id,
                }
            });

            // C. Bank Transaction for Target (Money In => DEBIT type)
            await tx.bankTransaction.create({
                data: {
                    companyId: user.companyId,
                    bankAccountId: targetBank.id,
                    transactionDate: transferDate,
                    valueDate: transferDate,
                    transactionType: "DEBIT",
                    amount: transferAmount,
                    reference: reference || journalNumber,
                    description: `Transfer from ${sourceBank.accountName}`,
                    status: "MATCHED",
                    journalLineId: targetLine?.id,
                }
            });

            return journal;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Transfer POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
