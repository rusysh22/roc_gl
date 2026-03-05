import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/budget/[id]/vs-actual — Budget vs Actual comparison
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        // Get budget with details and fiscal year periods
        const budget = await prisma.budget.findUnique({
            where: { id },
            include: {
                fiscalYear: {
                    include: {
                        periods: { orderBy: { periodNumber: "asc" } },
                    },
                },
                details: {
                    include: {
                        coa: { select: { code: true, name: true, accountType: true, normalBalance: true } },
                    },
                    orderBy: { coa: { code: "asc" } },
                },
            },
        });

        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }

        // For each budget detail, calculate actuals from posted journals
        const comparison = await Promise.all(
            budget.details.map(async (detail) => {
                // Get actual amounts from posted journal lines for this CoA within the fiscal year
                const periodActuals: number[] = [];

                for (const period of budget.fiscalYear.periods) {
                    const journalLines = await prisma.journalLine.findMany({
                        where: {
                            companyId: user.companyId,
                            coaId: detail.coaId,
                            journal: {
                                status: "POSTED",
                                journalDate: {
                                    gte: period.startDate,
                                    lte: period.endDate,
                                },
                            },
                        },
                        select: { debitAmount: true, creditAmount: true },
                    });

                    let actual = 0;
                    for (const line of journalLines) {
                        // For EXPENSE/ASSET (normal debit), actual = debit - credit
                        // For REVENUE/LIABILITY/EQUITY (normal credit), actual = credit - debit
                        if (detail.coa.normalBalance === "DEBIT") {
                            actual += Number(line.debitAmount) - Number(line.creditAmount);
                        } else {
                            actual += Number(line.creditAmount) - Number(line.debitAmount);
                        }
                    }
                    periodActuals.push(actual);
                }

                const budgetPeriods = [
                    Number(detail.period1), Number(detail.period2), Number(detail.period3),
                    Number(detail.period4), Number(detail.period5), Number(detail.period6),
                    Number(detail.period7), Number(detail.period8), Number(detail.period9),
                    Number(detail.period10), Number(detail.period11), Number(detail.period12),
                ];
                const budgetTotal = Number(detail.totalAnnual);
                const actualTotal = periodActuals.reduce((s, a) => s + a, 0);
                const variance = budgetTotal - actualTotal;
                const variancePercent = budgetTotal > 0 ? Math.round((variance / budgetTotal) * 10000) / 100 : 0;

                return {
                    coaId: detail.coaId,
                    coaCode: detail.coa.code,
                    coaName: detail.coa.name,
                    accountType: detail.coa.accountType,
                    budgetPeriods,
                    budgetTotal,
                    actualPeriods: periodActuals,
                    actualTotal,
                    variance,
                    variancePercent,
                    periodVariances: budgetPeriods.map((b, i) => b - (periodActuals[i] || 0)),
                };
            })
        );

        // Grand totals
        const grandBudget = comparison.reduce((s, c) => s + c.budgetTotal, 0);
        const grandActual = comparison.reduce((s, c) => s + c.actualTotal, 0);
        const grandVariance = grandBudget - grandActual;

        return NextResponse.json({
            budget: {
                id: budget.id,
                budgetName: budget.budgetName,
                version: budget.version,
                status: budget.status,
                fiscalYear: budget.fiscalYear.name,
            },
            comparison,
            summary: {
                totalBudget: grandBudget,
                totalActual: grandActual,
                totalVariance: grandVariance,
                variancePercent: grandBudget > 0 ? Math.round((grandVariance / grandBudget) * 10000) / 100 : 0,
            },
        });
    } catch (error) {
        console.error("Budget vs Actual error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
