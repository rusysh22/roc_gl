import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Petty cash uses existing bank account + voucher mechanism
// A petty cash fund is a bank account where bankName contains "Petty Cash" or "Kas Kecil"
// or the linked CoA name contains "Kas"

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        // Get all bank accounts that could be petty cash
        const bankAccounts = await prisma.bankAccount.findMany({
            where: {
                companyId: user.companyId,
                isActive: true,
            },
            include: { coa: true },
        });

        // Calculate balances
        const funds = await Promise.all(
            bankAccounts.map(async (ba) => {
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

                // Get recent transactions
                const recentTxns = await prisma.bankTransaction.findMany({
                    where: { bankAccountId: ba.id },
                    orderBy: { transactionDate: "desc" },
                    take: 10,
                });

                return {
                    id: ba.id,
                    accountName: ba.accountName,
                    bankName: ba.bankName,
                    accountNumber: ba.accountNumber,
                    currencyCode: ba.currencyCode,
                    openingBalance: Number(ba.openingBalance),
                    currentBalance: balance,
                    coaCode: ba.coa.code,
                    coaName: ba.coa.name,
                    recentTransactions: recentTxns,
                };
            })
        );

        return NextResponse.json(funds);
    } catch (error) {
        console.error("Petty cash GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
