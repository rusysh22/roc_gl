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

        // Get all bank transactions for this period
        const bankTxns = await prisma.bankTransaction.findMany({
            where: {
                bankAccountId: reconciliation.bankAccountId,
                companyId: user.companyId,
                transactionDate: { lte: reconciliation.period.endDate },
            },
            orderBy: { transactionDate: "asc" },
        });

        // Categorize unmatched bank transactions
        const unmatchedBankTxIds = new Set(
            bankTxns.filter(t => t.status === "UNMATCHED").map(t => t.id)
        );

        // Deposits in transit: GL debits not yet in bank statement
        const glTxns = await prisma.journalLine.findMany({
            where: {
                companyId: user.companyId,
                coaId: reconciliation.bankAccount.coaId,
                journal: {
                    status: "POSTED",
                    journalDate: { lte: reconciliation.period.endDate },
                },
            },
            include: {
                journal: { select: { journalNumber: true, journalDate: true, description: true } },
            },
        });

        const matchedJournalLineIds = new Set(
            reconciliation.items.map(i => i.journalLineId).filter(Boolean)
        );

        const depositsInTransit = glTxns
            .filter(gl => Number(gl.debitAmount) > 0 && !matchedJournalLineIds.has(gl.id))
            .map(gl => ({
                journalNumber: gl.journal.journalNumber,
                date: gl.journal.journalDate,
                description: gl.journal.description,
                amount: Number(gl.debitAmount),
            }));

        const outstandingChecks = glTxns
            .filter(gl => Number(gl.creditAmount) > 0 && !matchedJournalLineIds.has(gl.id))
            .map(gl => ({
                journalNumber: gl.journal.journalNumber,
                date: gl.journal.journalDate,
                description: gl.journal.description,
                amount: Number(gl.creditAmount),
            }));

        // Unrecorded items: bank transactions not matched to GL
        const unrecordedDeposits = bankTxns
            .filter(t => t.transactionType === "DEBIT" && unmatchedBankTxIds.has(t.id))
            .map(t => ({
                date: t.transactionDate,
                reference: t.reference,
                description: t.description,
                amount: Number(t.amount),
            }));

        const unrecordedCharges = bankTxns
            .filter(t => t.transactionType === "CREDIT" && unmatchedBankTxIds.has(t.id))
            .map(t => ({
                date: t.transactionDate,
                reference: t.reference,
                description: t.description,
                amount: Number(t.amount),
            }));

        const bankStmtBalance = Number(reconciliation.bankStatementBalance);
        const glBalance = Number(reconciliation.glBalance);
        const totalDepositsInTransit = depositsInTransit.reduce((s, d) => s + d.amount, 0);
        const totalOutstandingChecks = outstandingChecks.reduce((s, d) => s + d.amount, 0);
        const totalUnrecordedDeposits = unrecordedDeposits.reduce((s, d) => s + d.amount, 0);
        const totalUnrecordedCharges = unrecordedCharges.reduce((s, d) => s + d.amount, 0);

        const adjustedBankBalance = bankStmtBalance + totalDepositsInTransit - totalOutstandingChecks;
        const adjustedGlBalance = glBalance + totalUnrecordedDeposits - totalUnrecordedCharges;

        return NextResponse.json({
            reconciliation: {
                id: reconciliation.id,
                status: reconciliation.status,
                bankAccount: reconciliation.bankAccount,
                period: reconciliation.period,
            },
            sectionA: {
                bankStatementBalance: bankStmtBalance,
                depositsInTransit,
                totalDepositsInTransit,
                outstandingChecks,
                totalOutstandingChecks,
                adjustedBankBalance,
            },
            sectionB: {
                glBalance,
                unrecordedDeposits,
                totalUnrecordedDeposits,
                unrecordedCharges,
                totalUnrecordedCharges,
                adjustedGlBalance,
            },
            summary: {
                adjustedBankBalance,
                adjustedGlBalance,
                difference: adjustedBankBalance - adjustedGlBalance,
            },
        });
    } catch (error) {
        console.error("Reconciliation report error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
