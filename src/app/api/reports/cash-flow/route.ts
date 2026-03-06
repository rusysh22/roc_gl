import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/cash-flow — Cash Flow Statement (Indirect Method)
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

        // Get all accounts with cashFlowCategory
        const accounts = await prisma.chartOfAccount.findMany({
            where: { companyId: user.companyId, isActive: true, isHeader: false },
            select: {
                id: true, code: true, name: true, accountType: true,
                normalBalance: true, cashFlowCategory: true,
            },
        });

        // Calculate net profit first (for indirect method)
        let netProfit = 0;
        const isAccounts = accounts.filter(a => ["REVENUE", "EXPENSE"].includes(a.accountType));
        for (const account of isAccounts) {
            const where: any = {
                companyId: user.companyId, coaId: account.id,
                journal: { status: "POSTED" },
            };
            if (dateFrom && dateTo) where.journal.journalDate = { gte: dateFrom, lte: dateTo };

            const lines = await prisma.journalLine.findMany({
                where, select: { debitAmount: true, creditAmount: true },
            });
            for (const line of lines) {
                if (account.normalBalance === "CREDIT") {
                    netProfit += Number(line.creditAmount) - Number(line.debitAmount);
                } else {
                    netProfit -= Number(line.debitAmount) - Number(line.creditAmount);
                }
            }
        }

        // Build cash flow items by category using cashFlowCategory
        const bsAccounts = accounts.filter(a =>
            ["ASSET", "LIABILITY", "EQUITY"].includes(a.accountType) &&
            a.cashFlowCategory && a.cashFlowCategory !== "NONE"
        );

        const categoryItems: Record<string, Array<{ code: string; name: string; amount: number }>> = {
            OPERATING: [],
            INVESTING: [],
            FINANCING: [],
        };

        for (const account of bsAccounts) {
            const cat = account.cashFlowCategory || "OPERATING";
            if (!categoryItems[cat]) continue;

            const where: any = {
                companyId: user.companyId, coaId: account.id,
                journal: { status: "POSTED" },
            };
            if (dateFrom && dateTo) where.journal.journalDate = { gte: dateFrom, lte: dateTo };

            const lines = await prisma.journalLine.findMany({
                where, select: { debitAmount: true, creditAmount: true },
            });

            let change = 0;
            for (const line of lines) {
                if (account.normalBalance === "DEBIT") {
                    change += Number(line.debitAmount) - Number(line.creditAmount);
                } else {
                    change += Number(line.creditAmount) - Number(line.debitAmount);
                }
            }

            if (Math.abs(change) > 0.01) {
                // For operating (indirect): asset increases reduce cash, liability increases add cash
                let cashEffect = change;
                if (cat === "OPERATING") {
                    if (account.accountType === "ASSET") cashEffect = -change;
                    // LIABILITY increase = cash source (positive)
                }
                categoryItems[cat].push({ code: account.code, name: account.name, amount: cashEffect });
            }
        }

        const operatingTotal = netProfit + categoryItems.OPERATING.reduce((s, i) => s + i.amount, 0);
        const investingTotal = categoryItems.INVESTING.reduce((s, i) => s + i.amount, 0);
        const financingTotal = categoryItems.FINANCING.reduce((s, i) => s + i.amount, 0);
        const netCashChange = operatingTotal + investingTotal + financingTotal;

        // Get opening cash (cash accounts balance before period)
        const cashAccounts = accounts.filter(a =>
            a.accountType === "ASSET" && (
                a.name.toLowerCase().includes("kas") || a.name.toLowerCase().includes("cash") ||
                a.name.toLowerCase().includes("bank")
            )
        );
        let openingCash = 0;
        if (dateFrom) {
            for (const ca of cashAccounts) {
                const priorLines = await prisma.journalLine.findMany({
                    where: {
                        companyId: user.companyId, coaId: ca.id,
                        journal: { status: "POSTED", journalDate: { lt: dateFrom } },
                    },
                    select: { debitAmount: true, creditAmount: true },
                });
                for (const line of priorLines) {
                    openingCash += Number(line.debitAmount) - Number(line.creditAmount);
                }
            }
        }
        const closingCash = openingCash + netCashChange;

        return NextResponse.json({
            periodName,
            method: "indirect",
            sections: {
                operating: {
                    netProfit,
                    adjustments: categoryItems.OPERATING,
                    total: operatingTotal,
                },
                investing: {
                    items: categoryItems.INVESTING,
                    total: investingTotal,
                },
                financing: {
                    items: categoryItems.FINANCING,
                    total: financingTotal,
                },
            },
            summary: {
                netCashChange,
                openingCash,
                closingCash,
            },
        });
    } catch (error) {
        console.error("Cash Flow error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
