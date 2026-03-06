import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// POST /api/year-end — Year-End Closing Process
// Actions: preview, execute
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { fiscalYearId, action } = body;

        if (!fiscalYearId) return NextResponse.json({ error: "fiscalYearId required" }, { status: 400 });

        const fy = await prisma.fiscalYear.findUnique({
            where: { id: fiscalYearId },
            include: { periods: true },
        });
        if (!fy) return NextResponse.json({ error: "Fiscal year not found" }, { status: 404 });
        if (fy.status === "CLOSED") return NextResponse.json({ error: "Already closed" }, { status: 400 });

        // Check all periods are CLOSED
        const openPeriods = fy.periods.filter(p => p.status !== "CLOSED");
        if (openPeriods.length > 0) {
            return NextResponse.json({
                error: `${openPeriods.length} period(s) still open: ${openPeriods.map(p => p.name).join(", ")}`,
            }, { status: 400 });
        }

        // Get all Revenue and Expense accounts
        const isAccounts = await prisma.chartOfAccount.findMany({
            where: {
                companyId: user.companyId, isActive: true, isHeader: false,
                accountType: { in: ["REVENUE", "EXPENSE"] },
            },
            select: { id: true, code: true, name: true, accountType: true, normalBalance: true },
        });

        // Get Retained Earnings account
        const reAccount = await prisma.chartOfAccount.findFirst({
            where: { companyId: user.companyId, isRetainedEarnings: true },
        });
        if (!reAccount) {
            return NextResponse.json({ error: "No Retained Earnings account found (isRetainedEarnings = true)" }, { status: 400 });
        }

        // Calculate balance of each IS account for this fiscal year
        const closingLines: Array<{
            coaId: string; code: string; name: string;
            accountType: string; balance: number;
        }> = [];

        let totalRevenue = 0;
        let totalExpenses = 0;

        for (const account of isAccounts) {
            const journalLines = await prisma.journalLine.findMany({
                where: {
                    companyId: user.companyId,
                    coaId: account.id,
                    journal: {
                        status: "POSTED",
                        journalDate: { gte: fy.startDate, lte: fy.endDate },
                    },
                },
                select: { debitAmount: true, creditAmount: true },
            });

            let balance = 0;
            for (const line of journalLines) {
                if (account.normalBalance === "CREDIT") {
                    balance += Number(line.creditAmount) - Number(line.debitAmount);
                } else {
                    balance += Number(line.debitAmount) - Number(line.creditAmount);
                }
            }

            if (Math.abs(balance) > 0.01) {
                closingLines.push({
                    coaId: account.id, code: account.code, name: account.name,
                    accountType: account.accountType, balance,
                });
                if (account.accountType === "REVENUE") totalRevenue += balance;
                else totalExpenses += balance;
            }
        }

        const netProfit = totalRevenue - totalExpenses;

        if (action === "preview") {
            return NextResponse.json({
                preview: true,
                fiscalYear: fy.name,
                closingLines,
                totalRevenue,
                totalExpenses,
                netProfit,
                retainedEarningsAccount: { code: reAccount.code, name: reAccount.name },
            });
        }

        if (action === "execute") {
            // Create closing journal
            const journalCount = await prisma.journal.count({ where: { companyId: user.companyId } });
            const journalNumber = `CLS-${String(journalCount + 1).padStart(6, "0")}`;

            const journal = await prisma.journal.create({
                data: {
                    companyId: user.companyId,
                    journalNumber,
                    journalType: "AJ",
                    journalDate: fy.endDate,
                    postingDate: fy.endDate,
                    fiscalYearId: fy.id,
                    description: `Year-End Closing — ${fy.name}`,
                    totalDebit: closingLines.reduce((s, l) => s + Math.abs(l.balance), 0),
                    totalCredit: closingLines.reduce((s, l) => s + Math.abs(l.balance), 0),
                    status: "POSTED",
                    createdBy: user.id,
                    postedBy: user.id,
                    postedAt: new Date(),
                },
            });

            let lineNumber = 1;
            // Zero out each IS account (reverse their balances)
            for (const line of closingLines) {
                await prisma.journalLine.create({
                    data: {
                        journalId: journal.id,
                        companyId: user.companyId,
                        lineNumber: lineNumber++,
                        coaId: line.coaId,
                        description: `Close ${line.code} — ${line.name}`,
                        // Revenue (credit normal) → debit to zero out
                        // Expense (debit normal) → credit to zero out
                        debitAmount: line.accountType === "REVENUE" ? line.balance : 0,
                        creditAmount: line.accountType === "EXPENSE" ? line.balance : 0,
                    },
                });
            }

            // Transfer net profit to Retained Earnings
            await prisma.journalLine.create({
                data: {
                    journalId: journal.id,
                    companyId: user.companyId,
                    lineNumber: lineNumber++,
                    coaId: reAccount.id,
                    description: `Net Profit to Retained Earnings — ${fy.name}`,
                    debitAmount: netProfit < 0 ? Math.abs(netProfit) : 0,
                    creditAmount: netProfit >= 0 ? netProfit : 0,
                },
            });

            // Lock fiscal year
            await prisma.fiscalYear.update({
                where: { id: fiscalYearId },
                data: { status: "CLOSED" },
            });

            return NextResponse.json({
                preview: false,
                journalId: journal.id,
                journalNumber,
                netProfit,
                message: `Year-end closing completed. ${fy.name} is now CLOSED.`,
            }, { status: 201 });
        }

        return NextResponse.json({ error: "Invalid action. Use 'preview' or 'execute'" }, { status: 400 });
    } catch (error) {
        console.error("Year-End Closing error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
