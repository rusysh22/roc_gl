import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const companyId = (session.user as any).companyId;
        const searchParams = req.nextUrl.searchParams;
        const startDateParam = searchParams.get("startDate");
        const endDateParam = searchParams.get("endDate");

        if (!startDateParam || !endDateParam) {
            return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 });
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        endDate.setHours(23, 59, 59, 999); // Include entire end date

        // 1. Fetch Data: all active CoA for the company
        const allCoas = await prisma.chartOfAccount.findMany({
            where: { companyId, isActive: true },
            include: { coaGroup: true }
        });

        // 2. Fetch all journal items within the date range
        const journalLines = await prisma.journalLine.findMany({
            where: {
                journal: {
                    companyId,
                    journalDate: {
                        gte: startDate,
                        lte: endDate
                    },
                    status: "POSTED"
                }
            },
            include: {
                journal: true
            }
        });

        // 3. Helper to get balances (sum of debit - credit depending on normal balance)
        const getBalanceByType = (accountTypes: string[]) => {
            let balance = 0;
            const targetCoas = allCoas.filter(c => accountTypes.includes(c.accountType));
            const targetCoaIds = targetCoas.map(c => c.id);

            journalLines.forEach(line => {
                if (targetCoaIds.includes(line.coaId)) {
                    const coa = targetCoas.find(c => c.id === line.coaId);
                    if (coa?.normalBalance === "DEBIT") {
                        balance += Number(line.debitAmount) - Number(line.creditAmount);
                    } else {
                        balance += Number(line.creditAmount) - Number(line.debitAmount);
                    }
                }
            });
            return balance;
        };

        const getRevenue = () => getBalanceByType(["REVENUE"]);
        const getExpense = () => getBalanceByType(["EXPENSE"]);
        const getAssets = () => getBalanceByType(["ASSET"]);
        const getLiabilities = () => getBalanceByType(["LIABILITY"]);
        const getEquity = () => getBalanceByType(["EQUITY"]);
        const getOperatingCashFlow = () => {
            // Simplified approximation: Net Profit + Depreciation
            // For a highly accurate CF, we'd need to trace cash accounts, but this serves the KPI
            const netProfit = getRevenue() - getExpense();
            return netProfit; // Real implementation requires detailed CF mapping
        };

        const totalAssets = getAssets();
        const totalLiabilities = getLiabilities();
        const totalEquity = getEquity();
        const totalRevenue = getRevenue();
        const totalExpense = getExpense();
        const netProfit = totalRevenue - totalExpense;

        // 4. Monthly Trend Data (Revenue vs Expenses)
        const monthlyDataMap = new Map();

        journalLines.forEach(line => {
            const coa = allCoas.find(c => c.id === line.coaId);
            if (coa && coa.coaGroup) {
                const isRevenue = coa.accountType === "REVENUE";
                const isExpense = coa.accountType === "EXPENSE";

                if (isRevenue || isExpense) {
                    const monthKey = line.journal.journalDate.toLocaleString('default', { month: 'short', year: 'numeric' });

                    if (!monthlyDataMap.has(monthKey)) {
                        monthlyDataMap.set(monthKey, { name: monthKey, revenue: 0, expense: 0, order: line.journal.journalDate.getTime() });
                    }

                    const amount = coa.normalBalance === "CREDIT"
                        ? Number(line.creditAmount) - Number(line.debitAmount)
                        : Number(line.debitAmount) - Number(line.creditAmount);

                    const current = monthlyDataMap.get(monthKey);
                    if (isRevenue) current.revenue += amount;
                    if (isExpense) current.expense += amount;
                }
            }
        });

        // Ensure at least empty months exist between start and end date
        const currentMonth = new Date(startDate);
        while (currentMonth <= endDate) {
            const monthKey = currentMonth.toLocaleString('default', { month: 'short', year: 'numeric' });
            if (!monthlyDataMap.has(monthKey)) {
                monthlyDataMap.set(monthKey, { name: monthKey, revenue: 0, expense: 0, order: currentMonth.getTime() });
            }
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        const monthlyTrend = Array.from(monthlyDataMap.values())
            .sort((a, b) => a.order - b.order)
            .map(({ name, revenue, expense }) => ({ name, revenue, expense }));

        // 5. Composition Details
        const currentAsset = allCoas.filter(c => c.accountSubType === "Current Asset" || c.accountSubType === "Cash").map(c => c.id);
        const fixedAsset = allCoas.filter(c => c.accountSubType === "Fixed Asset").map(c => c.id);

        const getSubsetBalance = (targetCoaIds: string[]) => {
            let balance = 0;
            journalLines.forEach(line => {
                if (targetCoaIds.includes(line.coaId)) {
                    const coa = allCoas.find(c => c.id === line.coaId);
                    if (coa?.normalBalance === "DEBIT") {
                        balance += Number(line.debitAmount) - Number(line.creditAmount);
                    } else {
                        balance += Number(line.creditAmount) - Number(line.debitAmount);
                    }
                }
            });
            return balance;
        };

        const caBalance = getSubsetBalance(currentAsset);
        const faBalance = getSubsetBalance(fixedAsset);
        const oaBalance = totalAssets - caBalance - faBalance;

        const assetComposition = [
            { name: "Current Assets", value: caBalance },
            { name: "Fixed Assets", value: faBalance },
            { name: "Other Assets", value: oaBalance }
        ].filter(a => a.value > 0);

        const currentLiability = allCoas.filter(c => c.accountSubType === "Current Liability").map(c => c.id);
        const clBalance = getSubsetBalance(currentLiability);
        const ltlBalance = totalLiabilities - clBalance;

        const liabilityComposition = [
            { name: "Current Liabilities", value: clBalance },
            { name: "Long-term Liabilities", value: ltlBalance },
            { name: "Equity", value: totalEquity + netProfit } // Include retained earnings
        ].filter(l => l.value > 0);

        // 6. Top 5 Operating Expenses
        const expenseCoas = new Map();
        journalLines.forEach(line => {
            const coa = allCoas.find(c => c.id === line.coaId);
            if (coa && coa.accountType === "EXPENSE") {
                const amount = Number(line.debitAmount) - Number(line.creditAmount);
                if (!expenseCoas.has(coa.name)) {
                    expenseCoas.set(coa.name, { name: coa.name, value: 0 });
                }
                expenseCoas.get(coa.name).value += amount;
            }
        });
        const topExpenses = Array.from(expenseCoas.values())
            .filter(e => e.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);


        return NextResponse.json({
            kpi: {
                totalAssets,
                totalLiabilities,
                netProfit,
                operatingCashFlow: getOperatingCashFlow(),
                totalRevenue
            },
            monthlyTrend,
            assetComposition: assetComposition.length ? assetComposition : [{ name: "No Assets", value: 1 }],
            liabilityComposition: liabilityComposition.length ? liabilityComposition : [{ name: "No Liabilities/Equity", value: 1 }],
            topExpenses: topExpenses.length ? topExpenses : [{ name: "No Expenses", value: 0 }]
        });
    } catch (error) {
        console.error("[DASHBOARD_GET]", error);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
