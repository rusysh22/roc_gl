import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/balance-sheet — Balance Sheet Report
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const periodId = sp.get("periodId");
        const asOfDate = sp.get("asOfDate");

        let dateTo: Date | undefined;
        let periodName = "As of Today";

        if (periodId) {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (period) { dateTo = period.endDate; periodName = `As of ${period.name}`; }
        } else if (asOfDate) {
            dateTo = new Date(asOfDate);
            periodName = `As of ${asOfDate}`;
        }

        // Get all BS accounts
        const accounts = await prisma.chartOfAccount.findMany({
            where: {
                companyId: user.companyId,
                isActive: true,
                isHeader: false,
                accountType: { in: ["ASSET", "LIABILITY", "EQUITY"] },
            },
            include: { coaGroup: { select: { name: true, code: true } } },
            orderBy: { code: "asc" },
        });

        // Calculate cumulative balances for each account
        const lineItems = await Promise.all(
            accounts.map(async (account) => {
                const where: any = {
                    companyId: user.companyId,
                    coaId: account.id,
                    journal: { status: "POSTED" },
                };
                if (dateTo) {
                    where.journal.journalDate = { lte: dateTo };
                }

                const lines = await prisma.journalLine.findMany({
                    where,
                    select: { debitAmount: true, creditAmount: true },
                });

                let balance = 0;
                for (const line of lines) {
                    if (account.normalBalance === "DEBIT") {
                        balance += Number(line.debitAmount) - Number(line.creditAmount);
                    } else {
                        balance += Number(line.creditAmount) - Number(line.debitAmount);
                    }
                }

                return {
                    coaId: account.id,
                    code: account.code,
                    name: account.name,
                    accountType: account.accountType,
                    accountSubType: account.accountSubType,
                    groupName: account.coaGroup.name,
                    balance,
                };
            })
        );

        // Also compute Net Profit from IS accounts (Revenue - Expense) → goes into Equity
        const isAccounts = await prisma.chartOfAccount.findMany({
            where: {
                companyId: user.companyId,
                isActive: true,
                isHeader: false,
                accountType: { in: ["REVENUE", "EXPENSE"] },
            },
            select: { id: true, normalBalance: true },
        });

        let netProfit = 0;
        for (const account of isAccounts) {
            const where: any = {
                companyId: user.companyId,
                coaId: account.id,
                journal: { status: "POSTED" },
            };
            if (dateTo) where.journal.journalDate = { lte: dateTo };

            const lines = await prisma.journalLine.findMany({
                where,
                select: { debitAmount: true, creditAmount: true },
            });
            for (const line of lines) {
                if (account.normalBalance === "CREDIT") {
                    netProfit += Number(line.creditAmount) - Number(line.debitAmount);
                } else {
                    netProfit -= Number(line.debitAmount) - Number(line.creditAmount);
                }
            }
        }

        // Categorize
        const assets = lineItems.filter(i => i.accountType === "ASSET");
        const currentAssets = assets.filter(i => i.accountSubType?.includes("Current") || !i.accountSubType);
        const nonCurrentAssets = assets.filter(i => i.accountSubType?.includes("Non-Current") || i.accountSubType?.includes("Fixed"));
        const liabilities = lineItems.filter(i => i.accountType === "LIABILITY");
        const currentLiabilities = liabilities.filter(i => i.accountSubType?.includes("Current") || !i.accountSubType);
        const nonCurrentLiabilities = liabilities.filter(i => i.accountSubType?.includes("Non-Current") || i.accountSubType?.includes("Long"));
        const equity = lineItems.filter(i => i.accountType === "EQUITY");

        const totalAssets = assets.reduce((s, i) => s + i.balance, 0);
        const totalLiabilities = liabilities.reduce((s, i) => s + i.balance, 0);
        const totalEquity = equity.reduce((s, i) => s + i.balance, 0) + netProfit;
        const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

        return NextResponse.json({
            periodName,
            sections: {
                currentAssets: { items: currentAssets, total: currentAssets.reduce((s, i) => s + i.balance, 0) },
                nonCurrentAssets: { items: nonCurrentAssets, total: nonCurrentAssets.reduce((s, i) => s + i.balance, 0) },
                totalAssets,
                currentLiabilities: { items: currentLiabilities, total: currentLiabilities.reduce((s, i) => s + i.balance, 0) },
                nonCurrentLiabilities: { items: nonCurrentLiabilities, total: nonCurrentLiabilities.reduce((s, i) => s + i.balance, 0) },
                totalLiabilities,
                equity: { items: equity, total: equity.reduce((s, i) => s + i.balance, 0) },
                retainedEarnings: netProfit,
                totalEquity,
            },
            validation: {
                totalAssets,
                totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
                difference: totalAssets - (totalLiabilities + totalEquity),
                isBalanced,
            },
        });
    } catch (error) {
        console.error("Balance Sheet error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
