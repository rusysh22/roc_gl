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

        const account = await prisma.bankAccount.findUnique({
            where: { id, companyId: user.companyId },
            include: { coa: true }
        });

        if (!account) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        return NextResponse.json(account);
    } catch (error) {
        console.error("BankAccount GET [id] error:", error);
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
        const { accountName, bankName, accountNumber, accountHolder, currencyCode, coaId, openingBalance, openingDate, isActive } = body;

        // Validation
        if (!accountName || !bankName || !accountNumber || !currencyCode || !coaId || !openingDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if exists
        const existing = await prisma.bankAccount.findUnique({ where: { id, companyId: user.companyId } });
        if (!existing) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        // Check CoA
        const coa = await prisma.chartOfAccount.findUnique({ where: { id: coaId, companyId: user.companyId } });
        if (!coa) return NextResponse.json({ error: "CoA not found" }, { status: 404 });
        if (coa.accountType !== "ASSET" || coa.isHeader) {
            return NextResponse.json({ error: "Bank account must be linked to a detail ASSET account" }, { status: 400 });
        }

        // Check unique account number in company (if changed)
        if (accountNumber !== existing.accountNumber) {
            const conflict = await prisma.bankAccount.findUnique({
                where: { companyId_accountNumber: { companyId: user.companyId, accountNumber } }
            });
            if (conflict) {
                return NextResponse.json({ error: `Account number ${accountNumber} already exists in this company` }, { status: 400 });
            }
        }

        const account = await prisma.bankAccount.update({
            where: { id },
            data: {
                accountName,
                bankName,
                accountNumber,
                accountHolder: accountHolder || accountName,
                currencyCode,
                coaId,
                openingBalance: openingBalance ?? existing.openingBalance,
                openingDate: new Date(openingDate),
                isActive: isActive ?? true,
            }
        });

        return NextResponse.json(account);
    } catch (error) {
        console.error("BankAccount PUT error:", error);
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

        // Check if exists
        const existing = await prisma.bankAccount.findUnique({
            where: { id, companyId: user.companyId },
            include: { bankTransactions: { select: { id: true }, take: 1 } }
        });

        if (!existing) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        // Check for related transactions before deleting
        if (existing.bankTransactions.length > 0) {
            return NextResponse.json({ error: "Cannot delete bank account with existing transactions" }, { status: 400 });
        }

        await prisma.bankAccount.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("BankAccount DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
