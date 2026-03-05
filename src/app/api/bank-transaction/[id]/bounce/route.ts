import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateJournalNumber } from "@/lib/journal";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();
        const { reason } = body;

        const bankTx = await prisma.bankTransaction.findUnique({
            where: { id },
            include: { bankAccount: true },
        });

        if (!bankTx || bankTx.companyId !== user.companyId) {
            return NextResponse.json({ error: "Bank transaction not found" }, { status: 404 });
        }
        if (bankTx.isBounced) {
            return NextResponse.json({ error: "Transaction is already marked as bounced" }, { status: 400 });
        }

        const bounceDate = new Date();

        // Check period
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: bounceDate },
                endDate: { gte: bounceDate },
            },
            include: { fiscalYear: true },
        });

        if (!period || period.status !== "OPEN") {
            return NextResponse.json({ error: "Current period is not open" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // Mark as bounced
            await tx.bankTransaction.update({
                where: { id },
                data: {
                    isBounced: true,
                    bouncedAt: bounceDate,
                    bouncedReason: reason || "Bounced/Returned",
                    status: "UNMATCHED",
                },
            });

            // If there's a linked journal line, create a reversal journal
            if (bankTx.journalLineId) {
                const journalLine = await tx.journalLine.findUnique({
                    where: { id: bankTx.journalLineId },
                    include: { journal: { include: { lines: true } } },
                });

                if (journalLine && journalLine.journal.status === "POSTED") {
                    const journalNumber = await generateJournalNumber(user.companyId, bounceDate, "RJ");

                    // Create reversal for the bounced transaction
                    const reversal = await tx.journal.create({
                        data: {
                            companyId: user.companyId,
                            journalNumber,
                            journalType: "RJ",
                            journalDate: bounceDate,
                            postingDate: bounceDate,
                            periodId: period.id,
                            fiscalYearId: period.fiscalYearId,
                            referenceNumber: journalLine.journal.journalNumber,
                            description: `Bounced: ${reason || bankTx.description || ""}`,
                            currencyCode: journalLine.journal.currencyCode,
                            exchangeRate: journalLine.journal.exchangeRate,
                            totalDebit: journalLine.journal.totalDebit,
                            totalCredit: journalLine.journal.totalCredit,
                            status: "POSTED",
                            reversalOfId: journalLine.journal.id,
                            createdBy: user.id,
                            postedBy: user.id,
                            postedAt: new Date(),
                        },
                    });

                    // Create swapped lines
                    for (const line of journalLine.journal.lines) {
                        await tx.journalLine.create({
                            data: {
                                journalId: reversal.id,
                                companyId: user.companyId,
                                lineNumber: line.lineNumber,
                                coaId: line.coaId,
                                departmentId: line.departmentId,
                                costCenterId: line.costCenterId,
                                description: `Bounce reversal: ${line.description || ""}`,
                                debitAmount: line.creditAmount,
                                creditAmount: line.debitAmount,
                                debitBase: line.creditBase,
                                creditBase: line.debitBase,
                            },
                        });
                    }

                    // Update original journal
                    await tx.journal.update({
                        where: { id: journalLine.journal.id },
                        data: { status: "REVERSED" },
                    });

                    return { bounced: true, reversalJournalId: reversal.id };
                }
            }

            return { bounced: true, reversalJournalId: null };
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error("Bounce transaction error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
