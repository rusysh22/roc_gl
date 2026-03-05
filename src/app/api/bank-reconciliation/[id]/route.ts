import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        const reconciliation = await prisma.bankReconciliation.findUnique({
            where: { id },
            include: {
                bankAccount: { include: { coa: true } },
                period: true,
                items: true,
            },
        });

        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }

        // Get unmatched bank transactions for this bank account up to period end
        const bankTransactions = await prisma.bankTransaction.findMany({
            where: {
                bankAccountId: reconciliation.bankAccountId,
                companyId: user.companyId,
                transactionDate: { lte: reconciliation.period.endDate },
                status: { in: ["UNMATCHED", "MATCHED"] },
            },
            orderBy: { transactionDate: "asc" },
        });

        // Get GL transactions (journal lines for this CoA) up to period end
        const glTransactions = await prisma.journalLine.findMany({
            where: {
                companyId: user.companyId,
                coaId: reconciliation.bankAccount.coaId,
                journal: {
                    status: "POSTED",
                    journalDate: { lte: reconciliation.period.endDate },
                },
            },
            include: {
                journal: { select: { journalNumber: true, journalDate: true, description: true, status: true } },
            },
            orderBy: { journal: { journalDate: "asc" } },
        });

        return NextResponse.json({
            ...reconciliation,
            bankTransactions,
            glTransactions,
        });
    } catch (error) {
        console.error("Bank reconciliation detail GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();

        const reconciliation = await prisma.bankReconciliation.findUnique({ where: { id } });
        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }
        if (reconciliation.status === "FINALIZED" || reconciliation.status === "LOCKED") {
            return NextResponse.json({ error: "Cannot modify a finalized/locked reconciliation" }, { status: 400 });
        }

        const data: any = {};
        if (body.bankStatementBalance !== undefined) data.bankStatementBalance = Number(body.bankStatementBalance);
        if (body.status !== undefined && ["DRAFT", "IN_PROGRESS"].includes(body.status)) data.status = body.status;

        // Recalculate difference
        const stmtBal = data.bankStatementBalance ?? Number(reconciliation.bankStatementBalance);
        const glBal = Number(reconciliation.glBalance);
        data.adjustedBankBalance = stmtBal;
        data.difference = stmtBal - glBal;

        const updated = await prisma.bankReconciliation.update({
            where: { id },
            data,
            include: { bankAccount: true, period: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Bank reconciliation PUT error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
