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
            include: { bankAccount: { include: { coa: true } }, period: true },
        });

        if (!reconciliation || reconciliation.companyId !== user.companyId) {
            return NextResponse.json({ error: "Reconciliation not found" }, { status: 404 });
        }
        if (reconciliation.status === "FINALIZED" || reconciliation.status === "LOCKED") {
            return NextResponse.json({ error: "Cannot modify a finalized/locked reconciliation" }, { status: 400 });
        }

        // Get unmatched bank transactions
        const bankTxns = await prisma.bankTransaction.findMany({
            where: {
                bankAccountId: reconciliation.bankAccountId,
                companyId: user.companyId,
                status: "UNMATCHED",
                transactionDate: { lte: reconciliation.period.endDate },
            },
        });

        // Get unmatched GL transactions (journal lines not yet matched)
        const matchedJournalLineIds = (await prisma.bankReconciliationItem.findMany({
            where: { reconciliationId: id },
            select: { journalLineId: true },
        })).map(i => i.journalLineId).filter(Boolean) as string[];

        const glTxns = await prisma.journalLine.findMany({
            where: {
                companyId: user.companyId,
                coaId: reconciliation.bankAccount.coaId,
                id: { notIn: matchedJournalLineIds },
                journal: {
                    status: "POSTED",
                    journalDate: { lte: reconciliation.period.endDate },
                },
            },
            include: {
                journal: { select: { journalNumber: true, journalDate: true, referenceNumber: true, description: true } },
            },
        });

        const matches: Array<{
            bankTransactionId: string;
            journalLineId: string;
            matchType: string;
            confidenceScore: number;
        }> = [];

        const usedBankTxIds = new Set<string>();
        const usedGlTxIds = new Set<string>();

        // Rule 1: Exact amount + date match (tolerance +/- 3 days)
        for (const bt of bankTxns) {
            if (usedBankTxIds.has(bt.id)) continue;
            const btAmount = Number(bt.amount);
            const btDate = new Date(bt.transactionDate).getTime();

            for (const gl of glTxns) {
                if (usedGlTxIds.has(gl.id)) continue;
                const glAmount = bt.transactionType === "DEBIT" ? Number(gl.debitAmount) : Number(gl.creditAmount);
                const glDate = new Date(gl.journal.journalDate).getTime();
                const daysDiff = Math.abs(btDate - glDate) / (1000 * 60 * 60 * 24);

                if (Math.abs(btAmount - glAmount) < 0.01 && daysDiff <= 3) {
                    matches.push({
                        bankTransactionId: bt.id,
                        journalLineId: gl.id,
                        matchType: "AUTO_EXACT",
                        confidenceScore: 95 - daysDiff * 5,
                    });
                    usedBankTxIds.add(bt.id);
                    usedGlTxIds.add(gl.id);
                    break;
                }
            }
        }

        // Rule 2: Reference number match
        for (const bt of bankTxns) {
            if (usedBankTxIds.has(bt.id) || !bt.reference) continue;
            const btRef = bt.reference.toLowerCase().trim();

            for (const gl of glTxns) {
                if (usedGlTxIds.has(gl.id)) continue;
                const glRef = (gl.journal.referenceNumber || "").toLowerCase().trim();
                const glNum = gl.journal.journalNumber.toLowerCase().trim();

                if (btRef && (btRef === glRef || btRef === glNum)) {
                    matches.push({
                        bankTransactionId: bt.id,
                        journalLineId: gl.id,
                        matchType: "AUTO_REF",
                        confidenceScore: 80,
                    });
                    usedBankTxIds.add(bt.id);
                    usedGlTxIds.add(gl.id);
                    break;
                }
            }
        }

        // Rule 3: Description keyword match (with amount match)
        for (const bt of bankTxns) {
            if (usedBankTxIds.has(bt.id) || !bt.description) continue;
            const btDesc = bt.description.toLowerCase();
            const btAmount = Number(bt.amount);

            for (const gl of glTxns) {
                if (usedGlTxIds.has(gl.id)) continue;
                const glAmount = bt.transactionType === "DEBIT" ? Number(gl.debitAmount) : Number(gl.creditAmount);
                const glDesc = (gl.journal.description || "").toLowerCase();

                if (Math.abs(btAmount - glAmount) < 0.01 && btDesc && glDesc) {
                    const btWords = btDesc.split(/\s+/).filter(w => w.length > 3);
                    const matchingWords = btWords.filter(w => glDesc.includes(w));
                    if (matchingWords.length >= 2) {
                        matches.push({
                            bankTransactionId: bt.id,
                            journalLineId: gl.id,
                            matchType: "AUTO_DESC",
                            confidenceScore: 60,
                        });
                        usedBankTxIds.add(bt.id);
                        usedGlTxIds.add(gl.id);
                        break;
                    }
                }
            }
        }

        // Save matches as items (status = MATCHED, user must confirm)
        const created = await prisma.$transaction(async (tx) => {
            const items = [];
            for (const m of matches) {
                const item = await tx.bankReconciliationItem.create({
                    data: {
                        reconciliationId: id,
                        bankTransactionId: m.bankTransactionId,
                        journalLineId: m.journalLineId,
                        matchType: m.matchType,
                        confidenceScore: m.confidenceScore,
                        status: "MATCHED",
                    },
                });
                items.push(item);

                // Update bank transaction
                await tx.bankTransaction.update({
                    where: { id: m.bankTransactionId },
                    data: { status: "MATCHED", journalLineId: m.journalLineId },
                });
            }

            if (reconciliation.status === "DRAFT") {
                await tx.bankReconciliation.update({
                    where: { id },
                    data: { status: "IN_PROGRESS" },
                });
            }

            return items;
        });

        return NextResponse.json({
            matched: created.length,
            matches: created,
        });
    } catch (error) {
        console.error("Auto-match error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
