import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateJournalNumber } from "@/lib/journal";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get("search") || "";
        const type = searchParams.get("type") || "";
        const status = searchParams.get("status") || "";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Pagination
        const page = parseInt(searchParams.get("page") || "1");
        const pageSize = parseInt(searchParams.get("pageSize") || "50");
        const skip = (page - 1) * pageSize;

        const where: any = { companyId: user.companyId };

        if (type) where.journalType = type;
        if (status) where.status = status;
        if (startDate && endDate) {
            where.journalDate = {
                gte: new Date(startDate),
                lte: new Date(endDate),
            };
        }

        if (search) {
            where.OR = [
                { journalNumber: { contains: search, mode: "insensitive" } },
                { referenceNumber: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        const [journals, total] = await Promise.all([
            prisma.journal.findMany({
                where,
                orderBy: [{ journalDate: "desc" }, { createdAt: "desc" }],
                skip,
                take: pageSize,
                include: {
                    period: { select: { periodNumber: true, name: true } },
                    creator: { select: { name: true } },
                },
            }),
            prisma.journal.count({ where }),
        ]);

        return NextResponse.json({
            data: journals,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            }
        });
    } catch (error: any) {
        console.error("Journal GET error:", error);
        return NextResponse.json({ error: "Internal server error", detail: error?.message || String(error), stack: error?.stack }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const {
            journalType, journalDate, postingDate, referenceNumber, description,
            currencyCode, exchangeRate, lines
        } = body;

        if (!journalDate || !postingDate || !lines || lines.length < 2) {
            return NextResponse.json({ error: "Date, posting date, and minimum 2 lines are required" }, { status: 400 });
        }

        const jDate = new Date(journalDate);
        const pDate = new Date(postingDate);
        const exRate = parseFloat(exchangeRate?.toString() || "1");

        // Calculate totals
        let totalDebit = 0;
        let totalCredit = 0;

        for (const line of lines) {
            const d = parseFloat(line.debitAmount?.toString() || "0");
            const c = parseFloat(line.creditAmount?.toString() || "0");
            if (d === 0 && c === 0) return NextResponse.json({ error: "Lines must have non-zero debit or credit" }, { status: 400 });
            totalDebit += d;
            totalCredit += c;
        }

        totalDebit = Math.round(totalDebit * 100) / 100;
        totalCredit = Math.round(totalCredit * 100) / 100;

        // Find applicable period for postingDate
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: pDate },
                endDate: { gte: pDate },
            },
            include: { fiscalYear: true }
        });

        // We allow saving draft even if period is closed/missing, but we warn them (validation happens on Post)

        const journalNumber = await generateJournalNumber(user.companyId, jDate, journalType || "GJ");

        // Use transaction for header + lines
        const journal = await prisma.$transaction(async (tx) => {
            const header = await tx.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: journalType || "GJ",
                    journalDate: jDate,
                    postingDate: pDate,
                    periodId: period?.id || null,
                    fiscalYearId: period?.fiscalYearId || null,
                    referenceNumber: referenceNumber || null,
                    description: description || null,
                    currencyCode: currencyCode || "IDR",
                    exchangeRate: exRate,
                    totalDebit: totalDebit * exRate, // Base currency
                    totalCredit: totalCredit * exRate, // Base currency
                    status: "DRAFT", // New journals are always DRAFT
                    createdBy: user.id as string,
                }
            });

            // Insert lines
            let lineNum = 1;
            for (const line of lines) {
                const dAmt = parseFloat(line.debitAmount?.toString() || "0");
                const cAmt = parseFloat(line.creditAmount?.toString() || "0");

                await tx.journalLine.create({
                    data: {
                        journalId: header.id,
                        companyId: user.companyId,
                        lineNumber: lineNum++,
                        coaId: line.coaId,
                        departmentId: line.departmentId || null,
                        costCenterId: line.costCenterId || null,
                        description: line.description || null,
                        debitAmount: dAmt,
                        creditAmount: cAmt,
                        debitBase: dAmt * exRate,
                        creditBase: cAmt * exRate,
                    }
                });
            }

            return header;
        });

        return NextResponse.json(journal, { status: 201 });
    } catch (error) {
        console.error("Journal POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
