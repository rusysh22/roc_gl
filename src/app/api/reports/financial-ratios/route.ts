import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/financial-ratios — Financial Ratio Analysis
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const startDate = sp.get("startDate");
        const endDate = sp.get("endDate");

        let dateTo: Date | undefined;
        let dateFrom: Date | undefined;
        let periodName = "All Time";

        if (startDate && endDate) {
            dateFrom = new Date(startDate);
            dateTo = new Date(endDate);
            periodName = `${startDate} to ${endDate}`;
        }

        // Helper to get cumulative balance for accounts matching a filter
        const getBalance = async (filter: { accountType?: string; accountSubType?: string; nameIncludes?: string }) => {
            const whereAcct: any = {
                companyId: user.companyId, isActive: true, isHeader: false,
            };
            if (filter.accountType) whereAcct.accountType = filter.accountType;

            const accts = await prisma.chartOfAccount.findMany({
                where: whereAcct,
                select: { id: true, normalBalance: true, accountSubType: true, name: true },
            });

            let filteredAccts = accts;
            if (filter.accountSubType) {
                filteredAccts = accts.filter(a => a.accountSubType?.includes(filter.accountSubType!));
            }
            if (filter.nameIncludes) {
                filteredAccts = accts.filter(a => a.name.toLowerCase().includes(filter.nameIncludes!.toLowerCase()));
            }

            let total = 0;
            for (const acct of filteredAccts) {
                const where: any = {
                    companyId: user.companyId, coaId: acct.id,
                    journal: { status: "POSTED" },
                };
                if (dateTo) where.journal.journalDate = { lte: dateTo };

                const lines = await prisma.journalLine.findMany({
                    where, select: { debitAmount: true, creditAmount: true },
                });
                for (const l of lines) {
                    if (acct.normalBalance === "DEBIT") total += Number(l.debitAmount) - Number(l.creditAmount);
                    else total += Number(l.creditAmount) - Number(l.debitAmount);
                }
            }
            return total;
        };

        // Helper for IS amounts (period range)
        const getISAmount = async (accountType: string) => {
            const accts = await prisma.chartOfAccount.findMany({
                where: { companyId: user.companyId, isActive: true, isHeader: false, accountType },
                select: { id: true, normalBalance: true },
            });
            let total = 0;
            for (const acct of accts) {
                const where: any = {
                    companyId: user.companyId, coaId: acct.id,
                    journal: { status: "POSTED" },
                };
                if (dateFrom && dateTo) where.journal.journalDate = { gte: dateFrom, lte: dateTo };

                const lines = await prisma.journalLine.findMany({
                    where, select: { debitAmount: true, creditAmount: true },
                });
                for (const l of lines) {
                    if (acct.normalBalance === "CREDIT") total += Number(l.creditAmount) - Number(l.debitAmount);
                    else total += Number(l.debitAmount) - Number(l.creditAmount);
                }
            }
            return total;
        };

        // Calculate all needed figures
        const [totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses] = await Promise.all([
            getBalance({ accountType: "ASSET" }),
            getBalance({ accountType: "LIABILITY" }),
            getBalance({ accountType: "EQUITY" }),
            getISAmount("REVENUE"),
            getISAmount("EXPENSE"),
        ]);

        const currentAssets = await getBalance({ accountType: "ASSET", accountSubType: "Current" });
        const currentLiabilities = await getBalance({ accountType: "LIABILITY", accountSubType: "Current" });
        const netProfit = totalRevenue - totalExpenses;

        const safeDiv = (a: number, b: number) => b !== 0 ? Math.round((a / b) * 10000) / 100 : 0;
        const rateHealth = (value: number, good: number, warn: number, higherIsBetter: boolean): string => {
            if (higherIsBetter) {
                if (value >= good) return "HEALTHY";
                if (value >= warn) return "WARNING";
                return "CRITICAL";
            } else {
                if (value <= good) return "HEALTHY";
                if (value <= warn) return "WARNING";
                return "CRITICAL";
            }
        };

        const ratios = {
            liquidity: [
                {
                    name: "Current Ratio",
                    formula: "Current Assets ÷ Current Liabilities",
                    value: safeDiv(currentAssets, currentLiabilities),
                    unit: "x",
                    health: rateHealth(safeDiv(currentAssets, currentLiabilities), 150, 100, true),
                    benchmark: "≥ 1.5x",
                },
                {
                    name: "Debt to Equity",
                    formula: "Total Liabilities ÷ Total Equity",
                    value: safeDiv(totalLiabilities, totalEquity + netProfit),
                    unit: "x",
                    health: rateHealth(safeDiv(totalLiabilities, totalEquity + netProfit), 100, 200, false),
                    benchmark: "≤ 1.0x",
                },
                {
                    name: "Debt to Assets",
                    formula: "Total Liabilities ÷ Total Assets",
                    value: safeDiv(totalLiabilities, totalAssets),
                    unit: "%",
                    health: rateHealth(safeDiv(totalLiabilities, totalAssets), 50, 70, false),
                    benchmark: "≤ 50%",
                },
            ],
            profitability: [
                {
                    name: "Net Profit Margin",
                    formula: "Net Profit ÷ Revenue",
                    value: safeDiv(netProfit, totalRevenue),
                    unit: "%",
                    health: rateHealth(safeDiv(netProfit, totalRevenue), 10, 5, true),
                    benchmark: "≥ 10%",
                },
                {
                    name: "Return on Assets (ROA)",
                    formula: "Net Profit ÷ Total Assets",
                    value: safeDiv(netProfit, totalAssets),
                    unit: "%",
                    health: rateHealth(safeDiv(netProfit, totalAssets), 5, 2, true),
                    benchmark: "≥ 5%",
                },
                {
                    name: "Return on Equity (ROE)",
                    formula: "Net Profit ÷ Total Equity",
                    value: safeDiv(netProfit, totalEquity + netProfit),
                    unit: "%",
                    health: rateHealth(safeDiv(netProfit, totalEquity + netProfit), 15, 8, true),
                    benchmark: "≥ 15%",
                },
            ],
            activity: [
                {
                    name: "Asset Turnover",
                    formula: "Revenue ÷ Total Assets",
                    value: safeDiv(totalRevenue, totalAssets),
                    unit: "x",
                    health: rateHealth(safeDiv(totalRevenue, totalAssets), 100, 50, true),
                    benchmark: "≥ 1.0x",
                },
            ],
        };

        return NextResponse.json({
            periodName,
            figures: { totalAssets, totalLiabilities, totalEquity, currentAssets, currentLiabilities, totalRevenue, totalExpenses, netProfit },
            ratios,
        });
    } catch (error) {
        console.error("Financial Ratios error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
