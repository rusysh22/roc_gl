import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/trial-balance — Trial Balance Report
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const periodId = sp.get("periodId");
        const mode = sp.get("mode") || "simple"; // simple | extended

        // Get period info
        let dateFrom: Date | undefined;
        let dateTo: Date | undefined;
        let periodName = "All Time";

        if (periodId) {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (period) {
                dateFrom = period.startDate;
                dateTo = period.endDate;
                periodName = period.name;
            }
        }

        // Get all active CoAs ordered by code
        const accounts = await prisma.chartOfAccount.findMany({
            where: { companyId: user.companyId, isActive: true, isHeader: false },
            include: { coaGroup: { select: { name: true, accountType: true } } },
            orderBy: { code: "asc" },
        });

        const rows = await Promise.all(
            accounts.map(async (account) => {
                // Opening balance: journals posted before period start
                let openingDebit = 0;
                let openingCredit = 0;
                if (dateFrom) {
                    const priorLines = await prisma.journalLine.findMany({
                        where: {
                            companyId: user.companyId,
                            coaId: account.id,
                            journal: { status: "POSTED", journalDate: { lt: dateFrom } },
                        },
                        select: { debitAmount: true, creditAmount: true },
                    });
                    for (const l of priorLines) {
                        openingDebit += Number(l.debitAmount);
                        openingCredit += Number(l.creditAmount);
                    }
                }

                // Period mutations
                const periodWhere: any = {
                    companyId: user.companyId,
                    coaId: account.id,
                    journal: { status: "POSTED" },
                };
                if (dateFrom && dateTo) {
                    periodWhere.journal.journalDate = { gte: dateFrom, lte: dateTo };
                }

                const periodLines = await prisma.journalLine.findMany({
                    where: periodWhere,
                    select: { debitAmount: true, creditAmount: true },
                });

                let mutationDebit = 0;
                let mutationCredit = 0;
                for (const l of periodLines) {
                    mutationDebit += Number(l.debitAmount);
                    mutationCredit += Number(l.creditAmount);
                }

                const endingDebit = openingDebit + mutationDebit;
                const endingCredit = openingCredit + mutationCredit;

                // Calculate balance based on normal balance
                const openingBalance = account.normalBalance === "DEBIT"
                    ? openingDebit - openingCredit
                    : openingCredit - openingDebit;
                const endingBalance = account.normalBalance === "DEBIT"
                    ? endingDebit - endingCredit
                    : endingCredit - endingDebit;

                // For simple mode: show ending debit/credit columns
                const debitBalance = endingBalance > 0 && account.normalBalance === "DEBIT" ? endingBalance : (endingBalance > 0 ? 0 : 0);
                const creditBalance = endingBalance > 0 && account.normalBalance === "CREDIT" ? endingBalance : (endingBalance < 0 ? Math.abs(endingBalance) : 0);

                // Corrected: simple TB just shows total debit and credit in period (or all time)
                const totalDebit = dateFrom ? mutationDebit : (openingDebit + mutationDebit);
                const totalCredit = dateFrom ? mutationCredit : (openingCredit + mutationCredit);

                return {
                    coaId: account.id,
                    code: account.code,
                    name: account.name,
                    accountType: account.accountType,
                    normalBalance: account.normalBalance,
                    groupName: account.coaGroup.name,
                    // Simple mode
                    totalDebit,
                    totalCredit,
                    balance: endingBalance,
                    // Extended mode
                    openingDebit, openingCredit, openingBalance,
                    mutationDebit, mutationCredit,
                    endingDebit, endingCredit, endingBalance,
                    // Classification for worksheet
                    isIncomeStatement: ["REVENUE", "EXPENSE"].includes(account.accountType),
                    isBalanceSheet: ["ASSET", "LIABILITY", "EQUITY"].includes(account.accountType),
                };
            })
        );

        // Filter out rows with zero activity (optional: show all)
        const activeRows = rows.filter(r => r.totalDebit !== 0 || r.totalCredit !== 0 || r.balance !== 0);

        // Totals
        const totalDebit = activeRows.reduce((s, r) => s + r.totalDebit, 0);
        const totalCredit = activeRows.reduce((s, r) => s + r.totalCredit, 0);
        const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

        return NextResponse.json({
            mode,
            periodName,
            rows: activeRows,
            totals: {
                totalDebit,
                totalCredit,
                difference: totalDebit - totalCredit,
                isBalanced,
            },
        });
    } catch (error) {
        console.error("Trial Balance error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
