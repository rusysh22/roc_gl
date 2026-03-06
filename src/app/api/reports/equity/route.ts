import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/equity — Statement of Changes in Equity
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const startDate = sp.get("startDate");
        const endDate = sp.get("endDate");

        let dateFrom: Date | undefined;
        let dateTo: Date | undefined;
        let periodName = "All Time";

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
            periodName = `${startDate} to ${endDate}`;
        }

        // Get all equity accounts
        const equityAccounts = await prisma.chartOfAccount.findMany({
            where: { companyId: user.companyId, isActive: true, accountType: "EQUITY", isHeader: false },
            orderBy: { code: "asc" },
        });

        const components = await Promise.all(
            equityAccounts.map(async (account) => {
                // Opening balance: before period start
                let openingBalance = 0;
                if (dateFrom) {
                    const priorLines = await prisma.journalLine.findMany({
                        where: {
                            companyId: user.companyId, coaId: account.id,
                            journal: { status: "POSTED", journalDate: { lt: dateFrom } },
                        },
                        select: { debitAmount: true, creditAmount: true },
                    });
                    for (const l of priorLines) {
                        openingBalance += Number(l.creditAmount) - Number(l.debitAmount);
                    }
                }

                // Period movements
                const periodWhere: any = {
                    companyId: user.companyId, coaId: account.id,
                    journal: { status: "POSTED" },
                };
                if (dateFrom && dateTo) {
                    periodWhere.journal.journalDate = { gte: dateFrom, lte: dateTo };
                }

                const periodLines = await prisma.journalLine.findMany({
                    where: periodWhere,
                    select: { debitAmount: true, creditAmount: true },
                });

                let additions = 0;
                let deductions = 0;
                for (const l of periodLines) {
                    const cr = Number(l.creditAmount);
                    const dr = Number(l.debitAmount);
                    if (cr > dr) additions += cr - dr;
                    else deductions += dr - cr;
                }

                const closingBalance = openingBalance + additions - deductions;

                return {
                    coaId: account.id,
                    code: account.code,
                    name: account.name,
                    isRetainedEarnings: account.isRetainedEarnings,
                    openingBalance,
                    additions,
                    deductions,
                    closingBalance,
                };
            })
        );

        // Calculate Net Profit for current period (to show as part of RE changes)
        let netProfit = 0;
        const isAccounts = await prisma.chartOfAccount.findMany({
            where: { companyId: user.companyId, isActive: true, accountType: { in: ["REVENUE", "EXPENSE"] }, isHeader: false },
            select: { id: true, normalBalance: true },
        });
        for (const account of isAccounts) {
            const where: any = {
                companyId: user.companyId, coaId: account.id,
                journal: { status: "POSTED" },
            };
            if (dateFrom && dateTo) where.journal.journalDate = { gte: dateFrom, lte: dateTo };

            const lines = await prisma.journalLine.findMany({
                where, select: { debitAmount: true, creditAmount: true },
            });
            for (const l of lines) {
                if (account.normalBalance === "CREDIT") {
                    netProfit += Number(l.creditAmount) - Number(l.debitAmount);
                } else {
                    netProfit -= Number(l.debitAmount) - Number(l.creditAmount);
                }
            }
        }

        const totalOpening = components.reduce((s, c) => s + c.openingBalance, 0);
        const totalClosing = components.reduce((s, c) => s + c.closingBalance, 0) + netProfit;

        return NextResponse.json({
            periodName,
            components,
            netProfit,
            totalOpening,
            totalClosing,
            netChange: totalClosing - totalOpening,
        });
    } catch (error) {
        console.error("Equity Statement error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
