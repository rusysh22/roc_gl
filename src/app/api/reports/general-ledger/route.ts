import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/general-ledger — General Ledger Report
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const coaId = sp.get("coaId");
        const periodId = sp.get("periodId");
        const startDate = sp.get("startDate");
        const endDate = sp.get("endDate");
        const departmentId = sp.get("departmentId");

        if (!coaId) return NextResponse.json({ error: "coaId is required" }, { status: 400 });

        // Get CoA info
        const coa = await prisma.chartOfAccount.findUnique({
            where: { id: coaId },
            select: { id: true, code: true, name: true, normalBalance: true, accountType: true },
        });
        if (!coa) return NextResponse.json({ error: "Account not found" }, { status: 404 });

        // Determine date range
        let dateFrom: Date | undefined;
        let dateTo: Date | undefined;

        if (periodId) {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (period) {
                dateFrom = period.startDate;
                dateTo = period.endDate;
            }
        } else if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
        }

        // Calculate opening balance: sum all posted journal lines before dateFrom
        let openingBalance = 0;
        if (dateFrom) {
            const priorLines = await prisma.journalLine.findMany({
                where: {
                    companyId: user.companyId,
                    coaId,
                    ...(departmentId ? { departmentId } : {}),
                    journal: {
                        status: "POSTED",
                        journalDate: { lt: dateFrom },
                    },
                },
                select: { debitAmount: true, creditAmount: true },
            });
            for (const line of priorLines) {
                if (coa.normalBalance === "DEBIT") {
                    openingBalance += Number(line.debitAmount) - Number(line.creditAmount);
                } else {
                    openingBalance += Number(line.creditAmount) - Number(line.debitAmount);
                }
            }
        }

        // Get transactions in range
        const whereClause: any = {
            companyId: user.companyId,
            coaId,
            journal: { status: "POSTED" },
        };
        if (departmentId) whereClause.departmentId = departmentId;
        if (dateFrom && dateTo) {
            whereClause.journal.journalDate = { gte: dateFrom, lte: dateTo };
        }

        const journalLines = await (prisma.journalLine.findMany as any)({
            where: whereClause,
            include: {
                journal: true,
                department: true,
                costCenter: true,
            },
            orderBy: { journal: { journalDate: "asc" } },
        });

        // Build running balance
        let runningBalance = openingBalance;
        const transactions = journalLines.map((line: any) => {
            const debit = Number(line.debitAmount);
            const credit = Number(line.creditAmount);
            if (coa.normalBalance === "DEBIT") {
                runningBalance += debit - credit;
            } else {
                runningBalance += credit - debit;
            }
            return {
                journalId: line.journal.id,
                journalNumber: line.journal.journalNumber,
                journalDate: line.journal.journalDate,
                journalType: line.journal.journalType,
                description: line.description || line.journal.description,
                reference: line.journal.referenceNumber,
                debit, credit,
                runningBalance,
                department: line.department ? { code: line.department.code, name: line.department.name } : null,
                costCenter: line.costCenter ? { code: line.costCenter.code, name: line.costCenter.name } : null,
            };
        });

        const totalDebit = transactions.reduce((s: number, t: any) => s + t.debit, 0);
        const totalCredit = transactions.reduce((s: number, t: any) => s + t.credit, 0);
        const closingBalance = runningBalance;

        return NextResponse.json({
            account: coa,
            openingBalance,
            transactions,
            totalDebit,
            totalCredit,
            closingBalance,
            transactionCount: transactions.length,
        });
    } catch (error) {
        console.error("GL Report error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
