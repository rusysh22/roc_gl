import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        const reconciliation = await prisma.bankReconciliation.findUnique({
            where: { id },
            include: { items: true },
        });

        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }

        if (reconciliation.status === "FINALIZED" || reconciliation.status === "LOCKED") {
            return NextResponse.json({ error: "Reconciliation is already finalized" }, { status: 400 });
        }

        // Recalculate and check difference
        const diff = Number(reconciliation.bankStatementBalance) - Number(reconciliation.glBalance);
        if (Math.abs(diff) > 0.01) {
            return NextResponse.json({
                error: `Cannot finalize: difference is ${diff.toFixed(2)}. Bank statement and GL must be reconciled (difference = 0).`,
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Update all matched bank transactions to RECONCILED
            const matchedBankTxIds = reconciliation.items
                .filter(i => i.bankTransactionId)
                .map(i => i.bankTransactionId!);

            if (matchedBankTxIds.length > 0) {
                await tx.bankTransaction.updateMany({
                    where: { id: { in: matchedBankTxIds } },
                    data: { status: "RECONCILED" },
                });
            }

            // Confirm all match items
            await tx.bankReconciliationItem.updateMany({
                where: { reconciliationId: id, status: "MATCHED" },
                data: { status: "CONFIRMED" },
            });

            // Finalize reconciliation
            const updated = await tx.bankReconciliation.update({
                where: { id },
                data: {
                    status: "FINALIZED",
                    difference: 0,
                    adjustedBankBalance: Number(reconciliation.bankStatementBalance),
                    adjustedGlBalance: Number(reconciliation.glBalance),
                    finalizedBy: user.id,
                    finalizedAt: new Date(),
                },
            });

            return updated;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Finalize reconciliation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
