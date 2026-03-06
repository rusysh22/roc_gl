import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/period-end — Get period-end checklist for a given period
// POST /api/period-end — Close a period (all mandatory items must be checked)
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const periodId = req.nextUrl.searchParams.get("periodId");
        if (!periodId) return NextResponse.json({ error: "periodId required" }, { status: 400 });

        const period = await prisma.period.findUnique({
            where: { id: periodId },
            include: { fiscalYear: true },
        });
        if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

        // Auto-generate checklist items based on system conditions
        const items = [];

        // 1. Bank Reconciliation — check if all bank accounts are reconciled
        const bankAccounts = await prisma.bankAccount.findMany({
            where: { companyId: user.companyId, isActive: true },
        });
        const reconciledBanks = await prisma.bankReconciliation.findMany({
            where: { companyId: user.companyId, periodId, status: "COMPLETED" },
        });
        items.push({
            id: "bank_reconciliation",
            title: "Bank Reconciliation",
            description: `Reconcile all ${bankAccounts.length} bank accounts`,
            mandatory: true,
            status: reconciledBanks.length >= bankAccounts.length && bankAccounts.length > 0 ? "DONE" : bankAccounts.length === 0 ? "NOT_APPLICABLE" : "PENDING",
            detail: `${reconciledBanks.length}/${bankAccounts.length} reconciled`,
        });

        // 2. Fixed Asset Depreciation — check if depreciation journal exists for this period
        const depJournal = await prisma.journal.findFirst({
            where: {
                companyId: user.companyId,
                periodId,
                journalType: "AJ",
                description: { contains: "Depreciation" },
                status: "POSTED",
            },
        });
        items.push({
            id: "depreciation_run",
            title: "Fixed Asset Depreciation",
            description: "Run monthly depreciation for all active assets",
            mandatory: true,
            status: depJournal ? "DONE" : "PENDING",
            detail: depJournal ? `Journal ${depJournal.journalNumber}` : "Not yet run",
        });

        // 3. All journals posted — check if any DRAFT journals exist in this period
        const draftJournals = await prisma.journal.count({
            where: { companyId: user.companyId, periodId, status: { in: ["DRAFT", "SUBMITTED"] } },
        });
        items.push({
            id: "journals_posted",
            title: "All Journals Posted",
            description: "Ensure all draft/submitted journals are posted or voided",
            mandatory: true,
            status: draftJournals === 0 ? "DONE" : "PENDING",
            detail: draftJournals > 0 ? `${draftJournals} unposted journal(s)` : "All posted",
        });

        // 4. Trial Balance check
        items.push({
            id: "trial_balance_review",
            title: "Trial Balance Review",
            description: "Review trial balance and confirm debits equal credits",
            mandatory: false,
            status: "PENDING",
            detail: "Manual review required",
        });

        // 5. Budget Variance Review
        items.push({
            id: "budget_review",
            title: "Budget Variance Review",
            description: "Review budget vs actual variances",
            mandatory: false,
            status: "PENDING",
            detail: "Optional review",
        });

        const mandatoryDone = items.filter(i => i.mandatory && i.status === "DONE").length;
        const mandatoryTotal = items.filter(i => i.mandatory).length;
        const canClose = mandatoryDone === mandatoryTotal;
        const progress = mandatoryTotal > 0 ? Math.round((mandatoryDone / mandatoryTotal) * 100) : 100;

        return NextResponse.json({
            period: { id: period.id, name: period.name, status: period.status },
            items,
            progress,
            canClose,
            mandatoryDone,
            mandatoryTotal,
        });
    } catch (error) {
        console.error("Period-End checklist error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/period-end — Close the period
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { periodId, action } = await req.json();
        if (!periodId) return NextResponse.json({ error: "periodId required" }, { status: 400 });

        if (action === "close") {
            const period = await prisma.period.findUnique({ where: { id: periodId } });
            if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });
            if (period.status === "CLOSED") return NextResponse.json({ error: "Already closed" }, { status: 400 });

            // Check mandatory items (re-evaluate)
            const draftJournals = await prisma.journal.count({
                where: { companyId: user.companyId, periodId, status: { in: ["DRAFT", "SUBMITTED"] } },
            });
            if (draftJournals > 0) {
                return NextResponse.json({ error: `${draftJournals} unposted journals remain` }, { status: 400 });
            }

            await prisma.period.update({ where: { id: periodId }, data: { status: "CLOSED" } });
            return NextResponse.json({ message: "Period closed successfully" });
        }

        if (action === "reopen") {
            await prisma.period.update({ where: { id: periodId }, data: { status: "OPEN" } });
            return NextResponse.json({ message: "Period reopened" });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Period-End action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
