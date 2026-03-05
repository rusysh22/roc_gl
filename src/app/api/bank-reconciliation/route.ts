import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const bankAccountId = searchParams.get("bankAccountId");

        const where: any = { companyId: user.companyId };
        if (bankAccountId) where.bankAccountId = bankAccountId;

        const reconciliations = await prisma.bankReconciliation.findMany({
            where,
            include: {
                bankAccount: true,
                period: true,
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json(reconciliations);
    } catch (error) {
        console.error("Bank reconciliation GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { bankAccountId, periodId, bankStatementBalance } = body;

        if (!bankAccountId || !periodId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check bank account
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id: bankAccountId, companyId: user.companyId },
            include: { coa: true },
        });
        if (!bankAccount) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        // Check period
        const period = await prisma.period.findUnique({ where: { id: periodId } });
        if (!period) return NextResponse.json({ error: "Period not found" }, { status: 404 });

        // Check duplicate
        const existing = await prisma.bankReconciliation.findUnique({
            where: { bankAccountId_periodId: { bankAccountId, periodId } },
        });
        if (existing) {
            return NextResponse.json({ error: "Reconciliation already exists for this bank account and period" }, { status: 400 });
        }

        // Calculate GL balance: opening balance + sum of journal lines for this CoA up to period end
        const journalLines = await prisma.journalLine.findMany({
            where: {
                companyId: user.companyId,
                coaId: bankAccount.coaId,
                journal: {
                    status: "POSTED",
                    journalDate: { lte: period.endDate },
                },
            },
            select: { debitAmount: true, creditAmount: true },
        });

        let glBalance = Number(bankAccount.openingBalance);
        for (const line of journalLines) {
            glBalance += Number(line.debitAmount) - Number(line.creditAmount);
        }

        const stmtBalance = Number(bankStatementBalance || 0);

        const reconciliation = await prisma.bankReconciliation.create({
            data: {
                companyId: user.companyId,
                bankAccountId,
                periodId,
                status: "DRAFT",
                bankStatementBalance: stmtBalance,
                glBalance,
                adjustedBankBalance: stmtBalance,
                adjustedGlBalance: glBalance,
                difference: stmtBalance - glBalance,
            },
            include: { bankAccount: true, period: true },
        });

        return NextResponse.json(reconciliation, { status: 201 });
    } catch (error) {
        console.error("Bank reconciliation POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
