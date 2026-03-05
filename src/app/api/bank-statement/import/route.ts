import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

interface ParsedRow {
    date: string;
    description: string;
    reference?: string;
    debit?: number;
    credit?: number;
    amount?: number;
    type?: string; // DEBIT or CREDIT
}

function parseCSV(text: string, columnMapping: Record<string, string>): ParsedRow[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
    const rows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/"/g, ""));
        if (values.length < 2) continue;

        const getVal = (mappedField: string) => {
            const headerName = columnMapping[mappedField];
            if (!headerName) return undefined;
            const idx = headers.indexOf(headerName);
            return idx >= 0 ? values[idx] : undefined;
        };

        const dateStr = getVal("date");
        const description = getVal("description") || "";
        const reference = getVal("reference");
        const debitStr = getVal("debit");
        const creditStr = getVal("credit");
        const amountStr = getVal("amount");
        const typeStr = getVal("type");

        if (!dateStr) continue;

        let debit = debitStr ? parseFloat(debitStr.replace(/[^0-9.-]/g, "")) || 0 : 0;
        let credit = creditStr ? parseFloat(creditStr.replace(/[^0-9.-]/g, "")) || 0 : 0;

        // If single amount column with type
        if (amountStr && !debitStr && !creditStr) {
            const amt = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
            if (typeStr?.toUpperCase() === "DEBIT" || amt > 0) {
                debit = Math.abs(amt);
            } else {
                credit = Math.abs(amt);
            }
        }

        // If single amount column, negative = credit, positive = debit
        if (amountStr && !debitStr && !creditStr && !typeStr) {
            const amt = parseFloat(amountStr.replace(/[^0-9.-]/g, "")) || 0;
            if (amt >= 0) {
                debit = amt;
                credit = 0;
            } else {
                credit = Math.abs(amt);
                debit = 0;
            }
        }

        rows.push({ date: dateStr, description, reference, debit, credit });
    }

    return rows;
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { bankAccountId, csvData, columnMapping, preview } = body;

        if (!bankAccountId || !csvData || !columnMapping) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Verify bank account
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id: bankAccountId, companyId: user.companyId },
        });
        if (!bankAccount) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        const rows = parseCSV(csvData, columnMapping);
        if (rows.length === 0) {
            return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
        }

        // Preview mode - return parsed data without importing
        if (preview) {
            return NextResponse.json({ rows, count: rows.length });
        }

        const importBatchId = randomUUID();
        let imported = 0;
        let duplicates = 0;

        await prisma.$transaction(async (tx) => {
            for (const row of rows) {
                const txDate = new Date(row.date);
                if (isNaN(txDate.getTime())) continue;

                const amount = (row.debit || 0) + (row.credit || 0);
                const transactionType = (row.debit || 0) > 0 ? "DEBIT" : "CREDIT";

                // Simple duplicate check: same date + same amount + same reference
                if (row.reference) {
                    const existing = await tx.bankTransaction.findFirst({
                        where: {
                            bankAccountId,
                            transactionDate: txDate,
                            amount,
                            reference: row.reference,
                        },
                    });
                    if (existing) {
                        duplicates++;
                        continue;
                    }
                }

                await tx.bankTransaction.create({
                    data: {
                        companyId: user.companyId,
                        bankAccountId,
                        transactionDate: txDate,
                        valueDate: txDate,
                        transactionType,
                        amount,
                        reference: row.reference || null,
                        description: row.description,
                        status: "UNMATCHED",
                        importBatchId,
                    },
                });
                imported++;
            }
        });

        return NextResponse.json({
            success: true,
            importBatchId,
            imported,
            duplicates,
            total: rows.length,
        }, { status: 201 });
    } catch (error) {
        console.error("Bank statement import error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
