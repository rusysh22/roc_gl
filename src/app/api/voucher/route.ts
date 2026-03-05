import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateJournalNumber } from "@/lib/journal";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { type, bankAccountId, date, reference, description, lines } = body;
        // type: "PV" (Payment Voucher - Money Out) or "RV" (Receipt Voucher - Money In)

        if (!type || !bankAccountId || !date || !lines || lines.length === 0) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const voucherDate = new Date(date);

        // 1. Get Bank Account & its GL CoA
        const bankAcc = await prisma.bankAccount.findUnique({
            where: { id: bankAccountId, companyId: user.companyId },
            include: { coa: true }
        });
        if (!bankAcc) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });
        if (!bankAcc.isActive) return NextResponse.json({ error: "Bank account is inactive" }, { status: 400 });

        // 2. Resolve Period
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: voucherDate },
                endDate: { gte: voucherDate },
            },
            include: { fiscalYear: true }
        });

        if (!period || period.status !== "OPEN") {
            return NextResponse.json({ error: "Target period is not open or not found" }, { status: 400 });
        }

        // 3. Calculate Totals
        const totalAmount = lines.reduce((sum: number, line: any) => sum + Number(line.amount || 0), 0);
        if (totalAmount <= 0) return NextResponse.json({ error: "Total amount must be greater than zero" }, { status: 400 });

        // 4. Generate Journal Number (PV or RV)
        const journalNumber = await generateJournalNumber(user.companyId, voucherDate, type);

        // 5. Construct Journal Lines
        // For Payment (PV): Bank is CREDITED, Expense/Asset lines are DEBITED.
        // For Receipt (RV): Bank is DEBITED, Income/Liability lines are CREDITED.
        const journalLinesData: any[] = [];

        let lineNumber = 1;

        // Bank Line
        journalLinesData.push({
            companyId: user.companyId,
            lineNumber,
            coaId: bankAcc.coaId,
            description: description || `Voucher ${type}`,
            debitAmount: type === "RV" ? totalAmount : 0,
            creditAmount: type === "PV" ? totalAmount : 0,
            debitBase: type === "RV" ? totalAmount : 0,
            creditBase: type === "PV" ? totalAmount : 0,
        });

        // Offset Lines
        for (const line of lines) {
            lineNumber++;
            const lineAmt = Number(line.amount);
            journalLinesData.push({
                companyId: user.companyId,
                lineNumber,
                coaId: line.coaId,
                departmentId: line.departmentId,
                costCenterId: line.costCenterId,
                description: line.description || description,
                debitAmount: type === "PV" ? lineAmt : 0,
                creditAmount: type === "RV" ? lineAmt : 0,
                debitBase: type === "PV" ? lineAmt : 0,
                creditBase: type === "RV" ? lineAmt : 0,
            });
        }

        // 6. Execute Transaction
        const result = await prisma.$transaction(async (tx) => {
            // A. Create POSTED Journal
            const journal = await tx.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: type,
                    journalDate: voucherDate,
                    postingDate: voucherDate,
                    periodId: period.id,
                    fiscalYearId: period.fiscalYearId,
                    referenceNumber: reference,
                    description: description,
                    currencyCode: bankAcc.currencyCode,
                    exchangeRate: 1, // Simplifying multi-currency for vouchers temporarily
                    totalDebit: totalAmount,
                    totalCredit: totalAmount,
                    status: "POSTED",
                    createdBy: user.id || "system",
                    postedBy: user.id || "system",
                    postedAt: new Date(),
                    lines: {
                        create: journalLinesData
                    }
                },
                include: { lines: true }
            });

            // Find the ID of the newly created journal line that belongs to the bank
            const bankJournalLine = journal.lines.find(l => l.coaId === bankAcc.coaId);

            // B. Create MATCHED BankTransaction
            const bankTx = await tx.bankTransaction.create({
                data: {
                    companyId: user.companyId,
                    bankAccountId: bankAcc.id,
                    transactionDate: voucherDate,
                    valueDate: voucherDate,
                    transactionType: type === "RV" ? "DEBIT" : "CREDIT", // Bank perspective: RV increases Bank balance (DEBIT GL)
                    amount: totalAmount,
                    reference: reference || journalNumber,
                    description: description,
                    status: "MATCHED",
                    journalLineId: bankJournalLine?.id, // Link them directly!
                }
            });

            return { journal, bankTx };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Voucher POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get("search") || "";
        const type = searchParams.get("type"); // "PV", "RV", or empty

        const where: any = {
            companyId: user.companyId,
            journalType: { in: type ? [type] : ["PV", "RV"] }
        };

        if (search) {
            where.OR = [
                { journalNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { referenceNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        const vouchers = await prisma.journal.findMany({
            where,
            include: {
                period: true,
                lines: {
                    include: { coa: true },
                    take: 5
                }
            },
            orderBy: { journalDate: "desc" },
            take: 100
        });

        return NextResponse.json(vouchers);
    } catch (error) {
        console.error("Voucher GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
