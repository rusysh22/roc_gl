import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/fixed-assets/depreciation — Run depreciation for a period
// Body: { periodId, preview?: boolean }
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { periodId, preview } = body;

        if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 });

        const period = await prisma.period.findUnique({
            where: { id: periodId },
            include: { fiscalYear: true },
        });
        if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

        // Get all active assets
        const assets = await (prisma.fixedAsset.findMany as any)({
            where: { companyId: user.companyId, isActive: true, disposalDate: null },
        });

        // Calculate depreciation per asset
        const depreciationLines: Array<{
            assetId: string; assetCode: string; assetName: string;
            acquisitionCost: number; accumulatedBefore: number;
            depreciationAmount: number; accumulatedAfter: number; bookValueAfter: number;
            coaDepExpenseId: string; coaAccumDepId: string;
        }> = [];

        for (const asset of assets) {
            const cost = Number(asset.acquisitionCost);
            const salvage = Number(asset.salvageValue);
            const depreciableAmount = cost - salvage;
            const accumulated = Number(asset.accumulatedDepreciation);
            const remaining = depreciableAmount - accumulated;

            if (remaining <= 0) continue; // Fully depreciated

            let monthlyDep = 0;
            if (asset.depreciationMethod === "STRAIGHT_LINE") {
                monthlyDep = depreciableAmount / asset.usefulLifeMonths;
            } else {
                // Declining balance: double the straight-line rate applied to book value
                const rate = (2 / asset.usefulLifeMonths);
                const bookValue = cost - accumulated;
                monthlyDep = bookValue * rate;
            }

            // Don't exceed remaining
            const depAmount = Math.min(Math.round(monthlyDep * 100) / 100, remaining);

            depreciationLines.push({
                assetId: asset.id,
                assetCode: asset.assetCode,
                assetName: asset.assetName,
                acquisitionCost: cost,
                accumulatedBefore: accumulated,
                depreciationAmount: depAmount,
                accumulatedAfter: accumulated + depAmount,
                bookValueAfter: cost - (accumulated + depAmount),
                coaDepExpenseId: asset.coaDepExpenseId,
                coaAccumDepId: asset.coaAccumDepId,
            });
        }

        const totalDepreciation = depreciationLines.reduce((s, l) => s + l.depreciationAmount, 0);

        if (preview) {
            return NextResponse.json({
                preview: true,
                period: period.name,
                lines: depreciationLines,
                totalDepreciation,
                assetCount: depreciationLines.length,
            });
        }

        // Post depreciation — create journal and update assets
        // Generate journal number
        const journalCount = await prisma.journal.count({ where: { companyId: user.companyId } });
        const journalNumber = `DEP-${String(journalCount + 1).padStart(6, "0")}`;

        const journal = await prisma.journal.create({
            data: {
                companyId: user.companyId,
                journalNumber,
                journalType: "AJ",
                journalDate: period.endDate,
                postingDate: period.endDate,
                periodId: period.id,
                fiscalYearId: period.fiscalYearId,
                description: `Fixed Asset Depreciation — ${period.name}`,
                totalDebit: totalDepreciation,
                totalCredit: totalDepreciation,
                status: "POSTED",
                createdBy: user.id,
                postedBy: user.id,
                postedAt: new Date(),
            },
        });

        // Create journal lines (debit expense, credit accum dep)
        let lineNumber = 1;
        for (const line of depreciationLines) {
            // Debit: Depreciation Expense
            await prisma.journalLine.create({
                data: {
                    journalId: journal.id,
                    companyId: user.companyId,
                    lineNumber: lineNumber++,
                    coaId: line.coaDepExpenseId,
                    description: `Depreciation — ${line.assetCode} ${line.assetName}`,
                    debitAmount: line.depreciationAmount,
                    creditAmount: 0,
                },
            });
            // Credit: Accumulated Depreciation
            await prisma.journalLine.create({
                data: {
                    journalId: journal.id,
                    companyId: user.companyId,
                    lineNumber: lineNumber++,
                    coaId: line.coaAccumDepId,
                    description: `Accum Dep — ${line.assetCode} ${line.assetName}`,
                    debitAmount: 0,
                    creditAmount: line.depreciationAmount,
                },
            });

            // Update asset accumulated depreciation and book value
            await (prisma.fixedAsset.update as any)({
                where: { id: line.assetId },
                data: {
                    accumulatedDepreciation: line.accumulatedAfter,
                    bookValue: line.bookValueAfter,
                },
            });
        }

        return NextResponse.json({
            preview: false,
            journalId: journal.id,
            journalNumber,
            lines: depreciationLines,
            totalDepreciation,
            assetCount: depreciationLines.length,
        }, { status: 201 });
    } catch (error) {
        console.error("Depreciation run error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
