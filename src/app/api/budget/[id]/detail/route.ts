import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Save budget detail lines (upsert approach — replaces existing lines)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();
        const { lines } = body;

        if (!Array.isArray(lines)) {
            return NextResponse.json({ error: "lines array is required" }, { status: 400 });
        }

        const budget = await prisma.budget.findUnique({ where: { id } });
        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }
        if (budget.status === "LOCKED" || budget.status === "APPROVED") {
            return NextResponse.json({ error: "Cannot modify an approved/locked budget" }, { status: 400 });
        }

        const results = await prisma.$transaction(async (tx) => {
            const saved = [];
            for (const line of lines) {
                const { coaId, departmentId, costCenterId, periods } = line;
                if (!coaId) continue;

                const p = periods || {};
                const p1 = Number(p.period1 || 0);
                const p2 = Number(p.period2 || 0);
                const p3 = Number(p.period3 || 0);
                const p4 = Number(p.period4 || 0);
                const p5 = Number(p.period5 || 0);
                const p6 = Number(p.period6 || 0);
                const p7 = Number(p.period7 || 0);
                const p8 = Number(p.period8 || 0);
                const p9 = Number(p.period9 || 0);
                const p10 = Number(p.period10 || 0);
                const p11 = Number(p.period11 || 0);
                const p12 = Number(p.period12 || 0);
                const total = p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + p10 + p11 + p12;

                // Upsert: find existing by budget + coa + department + costCenter
                const existing = await tx.budgetDetail.findFirst({
                    where: {
                        budgetId: id,
                        coaId,
                        departmentId: departmentId || null,
                        costCenterId: costCenterId || null,
                    },
                });

                const data = {
                    period1: p1, period2: p2, period3: p3, period4: p4,
                    period5: p5, period6: p6, period7: p7, period8: p8,
                    period9: p9, period10: p10, period11: p11, period12: p12,
                    totalAnnual: total,
                };

                if (existing) {
                    const updated = await tx.budgetDetail.update({
                        where: { id: existing.id },
                        data,
                    });
                    saved.push(updated);
                } else {
                    const created = await tx.budgetDetail.create({
                        data: {
                            budgetId: id,
                            companyId: user.companyId,
                            coaId,
                            departmentId: departmentId || null,
                            costCenterId: costCenterId || null,
                            ...data,
                        },
                    });
                    saved.push(created);
                }
            }
            return saved;
        });

        return NextResponse.json({ saved: results.length }, { status: 200 });
    } catch (error) {
        console.error("Budget detail POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Spread budget: distribute annual amount across 12 periods
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();
        const { detailId, annualAmount, mode, weights } = body;

        if (!detailId || annualAmount === undefined) {
            return NextResponse.json({ error: "detailId and annualAmount are required" }, { status: 400 });
        }

        const budget = await prisma.budget.findUnique({ where: { id } });
        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }
        if (budget.status === "LOCKED" || budget.status === "APPROVED") {
            return NextResponse.json({ error: "Cannot modify" }, { status: 400 });
        }

        const amount = Number(annualAmount);
        let periods: number[] = new Array(12).fill(0);

        switch (mode || "equal") {
            case "equal": {
                const monthly = Math.floor(amount / 12 * 100) / 100;
                const remainder = Math.round((amount - monthly * 12) * 100) / 100;
                periods = new Array(12).fill(monthly);
                periods[11] = Math.round((monthly + remainder) * 100) / 100;
                break;
            }
            case "weighted": {
                if (!weights || weights.length !== 12) {
                    return NextResponse.json({ error: "12 weights are required for weighted mode" }, { status: 400 });
                }
                const totalWeight = weights.reduce((s: number, w: number) => s + w, 0);
                if (totalWeight === 0) {
                    return NextResponse.json({ error: "Total weight cannot be 0" }, { status: 400 });
                }
                periods = weights.map((w: number) => Math.round(amount * (w / totalWeight) * 100) / 100);
                // Adjust rounding differences onto last period
                const sum = periods.reduce((s, p) => s + p, 0);
                periods[11] = Math.round((periods[11] + (amount - sum)) * 100) / 100;
                break;
            }
            default: {
                // Manual: no auto-spread, just set the total
                const monthly = Math.floor(amount / 12 * 100) / 100;
                const remainder = Math.round((amount - monthly * 12) * 100) / 100;
                periods = new Array(12).fill(monthly);
                periods[11] = Math.round((monthly + remainder) * 100) / 100;
            }
        }

        const updated = await prisma.budgetDetail.update({
            where: { id: detailId },
            data: {
                period1: periods[0], period2: periods[1], period3: periods[2], period4: periods[3],
                period5: periods[4], period6: periods[5], period7: periods[6], period8: periods[7],
                period9: periods[8], period10: periods[9], period11: periods[10], period12: periods[11],
                totalAnnual: amount,
            },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Budget spread error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
