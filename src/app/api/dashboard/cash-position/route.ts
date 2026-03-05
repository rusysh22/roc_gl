import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const bankAccounts = await prisma.bankAccount.findMany({
            where: { companyId: user.companyId, isActive: true },
            include: { coa: true },
        });

        const positions = await Promise.all(
            bankAccounts.map(async (ba) => {
                // Calculate balance from opening + all posted journal entries
                const journalLines = await prisma.journalLine.findMany({
                    where: {
                        companyId: user.companyId,
                        coaId: ba.coaId,
                        journal: { status: "POSTED" },
                    },
                    select: { debitAmount: true, creditAmount: true },
                });

                let balance = Number(ba.openingBalance);
                for (const line of journalLines) {
                    balance += Number(line.debitAmount) - Number(line.creditAmount);
                }

                // Get latest reconciliation status
                const latestRecon = await prisma.bankReconciliation.findFirst({
                    where: { bankAccountId: ba.id, companyId: user.companyId },
                    orderBy: { createdAt: "desc" },
                    include: { period: true },
                });

                // Get transaction count for last 30 days
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const recentTxCount = await prisma.bankTransaction.count({
                    where: {
                        bankAccountId: ba.id,
                        transactionDate: { gte: thirtyDaysAgo },
                    },
                });

                return {
                    id: ba.id,
                    accountName: ba.accountName,
                    bankName: ba.bankName,
                    accountNumber: ba.accountNumber,
                    currencyCode: ba.currencyCode,
                    balance,
                    coaCode: ba.coa.code,
                    coaName: ba.coa.name,
                    reconciliationStatus: latestRecon?.status || "NONE",
                    reconciliationPeriod: latestRecon?.period?.name || null,
                    recentTransactions: recentTxCount,
                };
            })
        );

        const totalIDR = positions
            .filter(p => p.currencyCode === "IDR")
            .reduce((sum, p) => sum + p.balance, 0);

        return NextResponse.json({
            positions,
            totalIDR,
            totalAccounts: positions.length,
        });
    } catch (error) {
        console.error("Cash position error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
