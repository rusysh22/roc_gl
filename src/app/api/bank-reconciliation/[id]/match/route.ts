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
        const body = await req.json();
        const { bankTransactionId, journalLineId } = body;

        if (!bankTransactionId || !journalLineId) {
            return NextResponse.json({ error: "Both bankTransactionId and journalLineId are required" }, { status: 400 });
        }

        const reconciliation = await prisma.bankReconciliation.findUnique({ where: { id } });
        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }
        if (reconciliation.status === "FINALIZED" || reconciliation.status === "LOCKED") {
            return NextResponse.json({ error: "Cannot modify a finalized/locked reconciliation" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Create match item
            const item = await tx.bankReconciliationItem.create({
                data: {
                    reconciliationId: id,
                    bankTransactionId,
                    journalLineId,
                    matchType: "MANUAL",
                    confidenceScore: 100,
                    status: "MATCHED",
                },
            });

            // Update bank transaction status
            await tx.bankTransaction.update({
                where: { id: bankTransactionId },
                data: { status: "MATCHED", journalLineId },
            });

            // Update reconciliation status to IN_PROGRESS
            if (reconciliation.status === "DRAFT") {
                await tx.bankReconciliation.update({
                    where: { id },
                    data: { status: "IN_PROGRESS" },
                });
            }

            return item;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Bank reconciliation match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();
        const { itemId } = body;

        if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

        const reconciliation = await prisma.bankReconciliation.findUnique({ where: { id } });
        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }
        if (reconciliation.status === "FINALIZED" || reconciliation.status === "LOCKED") {
            return NextResponse.json({ error: "Cannot modify a finalized/locked reconciliation" }, { status: 400 });
        }

        const item = await prisma.bankReconciliationItem.findUnique({ where: { id: itemId } });
        if (!item || item.reconciliationId !== id) {
            return NextResponse.json({ error: "Match item not found" }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            // Unmatch bank transaction
            if (item.bankTransactionId) {
                await tx.bankTransaction.update({
                    where: { id: item.bankTransactionId },
                    data: { status: "UNMATCHED", journalLineId: null },
                });
            }

            await tx.bankReconciliationItem.delete({ where: { id: itemId } });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Bank reconciliation unmatch error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
