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

        const journal = await prisma.journal.findUnique({
            where: { id, companyId: user.companyId },
            include: {
                lines: {
                    include: {
                        coa: { select: { code: true, name: true, accountType: true } },
                        department: { select: { code: true, name: true } },
                        costCenter: { select: { code: true, name: true } },
                    },
                    orderBy: { lineNumber: "asc" },
                },
                period: { select: { name: true, periodNumber: true } },
                creator: { select: { name: true } },
                poster: { select: { name: true } },
            },
        });

        if (!journal) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
        return NextResponse.json(journal);
    } catch (error) {
        console.error("Journal GET error:", error);
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

        // Validate journal exists and is DRAFT
        const existing = await prisma.journal.findUnique({ where: { id, companyId: user.companyId } });
        if (!existing) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
        if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
            return NextResponse.json({ error: "Only DRAFT or REJECTED journals can be updated" }, { status: 400 });
        }

        const {
            journalType, journalDate, postingDate, referenceNumber, description,
            currencyCode, exchangeRate, lines
        } = body;

        // Use transaction for update
        const updated = await prisma.$transaction(async (tx) => {
            let updateData: any = {};

            const jDate = journalDate ? new Date(journalDate) : existing.journalDate;
            const pDate = postingDate ? new Date(postingDate) : existing.postingDate;
            const exRate = exchangeRate !== undefined ? parseFloat(exchangeRate.toString()) : parseFloat(existing.exchangeRate.toString());

            if (journalDate) updateData.journalDate = jDate;
            if (postingDate) {
                updateData.postingDate = pDate;
                const period = await tx.period.findFirst({
                    where: { companyId: user.companyId, startDate: { lte: pDate }, endDate: { gte: pDate } },
                    include: { fiscalYear: true }
                });
                updateData.periodId = period?.id || null;
                updateData.fiscalYearId = period?.fiscalYearId || null;
            }

            if (journalType) updateData.journalType = journalType;
            if (referenceNumber !== undefined) updateData.referenceNumber = referenceNumber || null;
            if (description !== undefined) updateData.description = description || null;
            if (currencyCode) updateData.currencyCode = currencyCode;
            if (exchangeRate !== undefined) updateData.exchangeRate = exRate;

            // Update lines if provided
            if (lines && lines.length > 0) {
                // Delete old lines
                await tx.journalLine.deleteMany({ where: { journalId: id } });

                let totalDebit = 0;
                let totalCredit = 0;
                let lineNum = 1;

                for (const line of lines) {
                    const dAmt = parseFloat(line.debitAmount?.toString() || "0");
                    const cAmt = parseFloat(line.creditAmount?.toString() || "0");

                    totalDebit += dAmt;
                    totalCredit += cAmt;

                    await tx.journalLine.create({
                        data: {
                            journalId: id,
                            companyId: user.companyId,
                            lineNumber: lineNum++,
                            coaId: line.coaId,
                            departmentId: line.departmentId || null,
                            costCenterId: line.costCenterId || null,
                            description: line.description || null,
                            debitAmount: dAmt,
                            creditAmount: cAmt,
                            debitBase: dAmt * exRate,
                            creditBase: cAmt * exRate,
                        }
                    });
                }

                updateData.totalDebit = totalDebit * exRate;
                updateData.totalCredit = totalCredit * exRate;
            }

            return await tx.journal.update({
                where: { id },
                data: updateData
            });
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Journal PUT error:", error);
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

        const existing = await prisma.journal.findUnique({ where: { id, companyId: user.companyId } });
        if (!existing) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
        if (existing.status !== "DRAFT" && existing.status !== "REJECTED") {
            return NextResponse.json({ error: "Only DRAFT or REJECTED journals can be deleted" }, { status: 400 });
        }

        await prisma.journal.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Journal DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
