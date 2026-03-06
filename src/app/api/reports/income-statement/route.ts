import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/income-statement — Income Statement (P&L)
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
            // Quick format for display Name
            periodName = `${startDate} to ${endDate}`;
        }

        // Get all Revenue and Expense accounts
        const accounts = await prisma.chartOfAccount.findMany({
            where: {
                companyId: user.companyId,
                isActive: true,
                isHeader: false,
                accountType: { in: ["REVENUE", "EXPENSE"] },
            },
            include: { coaGroup: { select: { name: true, code: true } } },
            orderBy: { code: "asc" },
        });

        // Get actual amounts for each account
        const lineItems = await Promise.all(
            accounts.map(async (account) => {
                const where: any = {
                    companyId: user.companyId,
                    coaId: account.id,
                    journal: { status: "POSTED" },
                };
                if (dateFrom && dateTo) {
                    where.journal.journalDate = { gte: dateFrom, lte: dateTo };
                }

                const lines = await prisma.journalLine.findMany({
                    where,
                    select: { debitAmount: true, creditAmount: true },
                });

                let amount = 0;
                for (const line of lines) {
                    if (account.normalBalance === "CREDIT") {
                        amount += Number(line.creditAmount) - Number(line.debitAmount);
                    } else {
                        amount += Number(line.debitAmount) - Number(line.creditAmount);
                    }
                }

                return {
                    coaId: account.id,
                    code: account.code,
                    name: account.name,
                    accountType: account.accountType,
                    accountSubType: account.accountSubType,
                    groupName: account.coaGroup.name,
                    groupCode: account.coaGroup.code,
                    amount,
                };
            })
        );

        // Categorize items
        const revenue = lineItems.filter(i => i.accountType === "REVENUE");
        const expenses = lineItems.filter(i => i.accountType === "EXPENSE");

        // Sub-categorize expenses by accountSubType or group
        const cogs = expenses.filter(i =>
            i.accountSubType?.includes("COGS") || i.accountSubType?.includes("Cost of") ||
            i.groupName?.toLowerCase().includes("hpp") || i.groupName?.toLowerCase().includes("cost of")
        );
        const opex = expenses.filter(i => !cogs.some(c => c.coaId === i.coaId));

        // Totals
        const totalRevenue = revenue.reduce((s, i) => s + i.amount, 0);
        const totalCogs = cogs.reduce((s, i) => s + i.amount, 0);
        const grossProfit = totalRevenue - totalCogs;
        const totalOpex = opex.reduce((s, i) => s + i.amount, 0);
        const operatingProfit = grossProfit - totalOpex;
        const netProfit = totalRevenue - expenses.reduce((s, i) => s + i.amount, 0);

        // Margins
        const grossMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 10000) / 100 : 0;
        const operatingMargin = totalRevenue > 0 ? Math.round((operatingProfit / totalRevenue) * 10000) / 100 : 0;
        const netMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 10000) / 100 : 0;

        return NextResponse.json({
            periodName,
            sections: {
                revenue: { items: revenue, total: totalRevenue },
                cogs: { items: cogs, total: totalCogs },
                grossProfit: { amount: grossProfit, margin: grossMargin },
                operatingExpenses: { items: opex, total: totalOpex },
                operatingProfit: { amount: operatingProfit, margin: operatingMargin },
                netProfit: { amount: netProfit, margin: netMargin },
            },
            summary: {
                totalRevenue,
                totalExpenses: expenses.reduce((s, i) => s + i.amount, 0),
                netProfit,
                grossMargin,
                operatingMargin,
                netMargin,
            },
        });
    } catch (error) {
        console.error("Income Statement error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
