import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/reports/tax-reconciliation — Tax Reconciliation Report
// Calculates: Accounting Profit → Fiscal Corrections → Taxable Income → Tax Payable
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const fiscalYearId = req.nextUrl.searchParams.get("fiscalYearId");
        if (!fiscalYearId) return NextResponse.json({ error: "fiscalYearId required" }, { status: 400 });

        const fy = await prisma.fiscalYear.findUnique({ where: { id: fiscalYearId } });
        if (!fy) return NextResponse.json({ error: "Fiscal year not found" }, { status: 404 });

        // Calculate accounting profit (Net Profit from IS)
        const isAccounts = await prisma.chartOfAccount.findMany({
            where: { companyId: user.companyId, isActive: true, isHeader: false, accountType: { in: ["REVENUE", "EXPENSE"] } },
            select: { id: true, normalBalance: true, accountType: true },
        });

        let totalRevenue = 0;
        let totalExpenses = 0;

        for (const account of isAccounts) {
            const lines = await prisma.journalLine.findMany({
                where: {
                    companyId: user.companyId, coaId: account.id,
                    journal: { status: "POSTED", journalDate: { gte: fy.startDate, lte: fy.endDate } },
                },
                select: { debitAmount: true, creditAmount: true },
            });
            for (const line of lines) {
                if (account.normalBalance === "CREDIT") {
                    const amt = Number(line.creditAmount) - Number(line.debitAmount);
                    if (account.accountType === "REVENUE") totalRevenue += amt;
                } else {
                    const amt = Number(line.debitAmount) - Number(line.creditAmount);
                    if (account.accountType === "EXPENSE") totalExpenses += amt;
                }
            }
        }

        const accountingProfit = totalRevenue - totalExpenses;

        // Get fiscal corrections
        const corrections = await (prisma.fiscalCorrection.findMany as any)({
            where: { companyId: user.companyId, fiscalYearId },
            include: { coa: { select: { code: true, name: true } } },
            orderBy: { createdAt: "asc" },
        });

        const positiveCorrections = corrections.filter((c: any) => c.correctionType === "POSITIVE");
        const negativeCorrections = corrections.filter((c: any) => c.correctionType === "NEGATIVE");
        const totalPositive = positiveCorrections.reduce((s: number, c: any) => s + Number(c.amount), 0);
        const totalNegative = negativeCorrections.reduce((s: number, c: any) => s + Number(c.amount), 0);

        const taxableIncome = accountingProfit + totalPositive - totalNegative;

        // Indonesian corporate tax calculation (simplified — PP 55/2022)
        // Up to 4.8B revenue: 0.5% of revenue (UMKM)
        // Standard: 22% flat rate
        let taxRate = 22;
        let taxPayable = Math.max(0, taxableIncome * (taxRate / 100));

        // Small company incentive (50% discount on first 4.8B revenue) — simplified
        const hasIncentive = totalRevenue <= 50_000_000_000; // 50B threshold
        if (hasIncentive && totalRevenue <= 4_800_000_000) {
            taxRate = 11; // 50% of 22%
            taxPayable = Math.max(0, taxableIncome * (taxRate / 100));
        }

        return NextResponse.json({
            fiscalYear: fy.name,
            accountingProfit,
            totalRevenue,
            totalExpenses,
            positiveCorrections,
            negativeCorrections,
            totalPositive,
            totalNegative,
            taxableIncome,
            taxRate,
            taxPayable,
        });
    } catch (error) {
        console.error("Tax Reconciliation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
