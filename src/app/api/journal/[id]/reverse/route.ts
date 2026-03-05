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

        // Get original journal
        const original = await prisma.journal.findUnique({
            where: { id, companyId: user.companyId },
            include: { lines: true }
        });

        if (!original) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
        if (original.status !== "POSTED") {
            return NextResponse.json({ error: `Cannot reverse journal with status ${original.status}. Only POSTED journals can be reversed.` }, { status: 400 });
        }

        // B1: Prevent reversal of reversal (double reversal)
        if (original.reversalOfId) {
            return NextResponse.json({ error: "Cannot reverse a reversal journal" }, { status: 400 });
        }

        // Parse request body for reversal date (default to today if not provided)
        let body;
        try { body = await req.json(); } catch { body = {}; }
        const reverseDate = body.reversalDate ? new Date(body.reversalDate) : new Date();

        // Check if period for reverseDate is open
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: reverseDate },
                endDate: { gte: reverseDate },
            },
            include: { fiscalYear: true }
        });

        if (!period || period.status !== "OPEN") {
            return NextResponse.json({ error: "Target period for reversal is not open or not found" }, { status: 400 });
        }

        const journalNumber = await generateJournalNumber(user.companyId, reverseDate, "RJ");

        // Use transaction to create reversal and update original
        const reversal = await prisma.$transaction(async (tx) => {
            // Create reversal journal
            const rev = await tx.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: "RJ",
                    journalDate: reverseDate,
                    postingDate: reverseDate,
                    periodId: period.id,
                    fiscalYearId: period.fiscalYearId,
                    referenceNumber: original.journalNumber, // Refers to the original
                    description: `Reversal of ${original.journalNumber}: ${original.description || ""}`,
                    currencyCode: original.currencyCode,
                    exchangeRate: original.exchangeRate,
                    totalDebit: original.totalDebit, // Swapped in lines, but total is same
                    totalCredit: original.totalCredit,
                    status: "DRAFT", // Created as draft so it can be reviewed before posting
                    reversalOfId: original.id,
                    createdBy: user.id,
                }
            });

            // Create swapped lines
            for (const line of original.lines) {
                await tx.journalLine.create({
                    data: {
                        journalId: rev.id,
                        companyId: user.companyId,
                        lineNumber: line.lineNumber,
                        coaId: line.coaId,
                        departmentId: line.departmentId,
                        costCenterId: line.costCenterId,
                        description: line.description,
                        // SWAPPING DEBIT AND CREDIT:
                        debitAmount: line.creditAmount,
                        creditAmount: line.debitAmount,
                        debitBase: line.creditBase,
                        creditBase: line.debitBase,
                    }
                });
            }

            // Update original journal status
            await tx.journal.update({
                where: { id },
                data: { status: "REVERSED" }
            });

            return rev;
        });

        return NextResponse.json(reversal, { status: 201 });
    } catch (error) {
        console.error("Journal REVERSE action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
