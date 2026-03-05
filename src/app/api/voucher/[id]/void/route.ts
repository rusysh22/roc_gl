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

        // Get the voucher journal with lines
        const voucher = await prisma.journal.findUnique({
            where: { id, companyId: user.companyId },
            include: { lines: true }
        });

        if (!voucher) return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
        if (!["PV", "RV", "IC"].includes(voucher.journalType)) {
            return NextResponse.json({ error: "This journal is not a voucher" }, { status: 400 });
        }
        if (voucher.status !== "POSTED") {
            return NextResponse.json({ error: `Cannot void voucher with status ${voucher.status}` }, { status: 400 });
        }
        if (voucher.reversalOfId) {
            return NextResponse.json({ error: "Cannot void a reversal journal" }, { status: 400 });
        }

        let body;
        try { body = await req.json(); } catch { body = {}; }
        const voidDate = body.voidDate ? new Date(body.voidDate) : new Date();

        // Check period
        const period = await prisma.period.findFirst({
            where: {
                companyId: user.companyId,
                startDate: { lte: voidDate },
                endDate: { gte: voidDate },
            },
            include: { fiscalYear: true }
        });

        if (!period || period.status !== "OPEN") {
            return NextResponse.json({ error: "Target period for void is not open or not found" }, { status: 400 });
        }

        const journalNumber = await generateJournalNumber(user.companyId, voidDate, "RJ");

        const result = await prisma.$transaction(async (tx) => {
            // Create reversal journal
            const reversal = await tx.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: "RJ",
                    journalDate: voidDate,
                    postingDate: voidDate,
                    periodId: period.id,
                    fiscalYearId: period.fiscalYearId,
                    referenceNumber: voucher.journalNumber,
                    description: `Void of ${voucher.journalNumber}: ${voucher.description || ""}`,
                    currencyCode: voucher.currencyCode,
                    exchangeRate: voucher.exchangeRate,
                    totalDebit: voucher.totalDebit,
                    totalCredit: voucher.totalCredit,
                    status: "POSTED",
                    reversalOfId: voucher.id,
                    createdBy: user.id,
                    postedBy: user.id,
                    postedAt: new Date(),
                },
            });

            // Create swapped lines
            for (const line of voucher.lines) {
                await tx.journalLine.create({
                    data: {
                        journalId: reversal.id,
                        companyId: user.companyId,
                        lineNumber: line.lineNumber,
                        coaId: line.coaId,
                        departmentId: line.departmentId,
                        costCenterId: line.costCenterId,
                        description: line.description,
                        debitAmount: line.creditAmount,
                        creditAmount: line.debitAmount,
                        debitBase: line.creditBase,
                        creditBase: line.debitBase,
                    },
                });
            }

            // Update original journal status
            await tx.journal.update({
                where: { id },
                data: { status: "REVERSED" },
            });

            // Update related bank transactions
            await tx.bankTransaction.updateMany({
                where: {
                    companyId: user.companyId,
                    journalLineId: { in: voucher.lines.map(l => l.id) },
                },
                data: { status: "UNMATCHED" },
            });

            return reversal;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Voucher void error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
