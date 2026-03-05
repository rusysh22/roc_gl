import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// A4: Helper to detect circular parent reference
async function hasCircularParent(accountId: string, newParentId: string | null): Promise<boolean> {
    if (!newParentId) return false;
    if (newParentId === accountId) return true;
    let currentId: string | null = newParentId;
    const visited = new Set<string>();
    while (currentId) {
        if (visited.has(currentId)) return true;
        if (currentId === accountId) return true;
        visited.add(currentId);
        const parent: { parentCoaId: string | null } | null = await prisma.chartOfAccount.findUnique({ where: { id: currentId }, select: { parentCoaId: true } });
        currentId = parent?.parentCoaId ?? null;
    }
    return false;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

        // A2: Prevent changing accountType if account has transactions
        if (body.accountType !== undefined) {
            const existing = await prisma.chartOfAccount.findUnique({ where: { id }, select: { accountType: true } });
            if (existing && existing.accountType !== body.accountType) {
                const txCount = await prisma.journalLine.count({ where: { coaId: id } });
                if (txCount > 0) {
                    return NextResponse.json({ error: `Cannot change account type: account has ${txCount} transaction(s)` }, { status: 400 });
                }
            }
        }

        // A4: Prevent circular parent reference
        if (body.parentCoaId !== undefined) {
            const parentId = body.parentCoaId || null;
            if (await hasCircularParent(id, parentId)) {
                return NextResponse.json({ error: "Cannot set parent: circular reference detected" }, { status: 400 });
            }
        }

        const data: any = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.nameEn !== undefined) data.nameEn = body.nameEn;
        if (body.coaGroupId !== undefined) data.coaGroupId = body.coaGroupId;
        if (body.parentCoaId !== undefined) data.parentCoaId = body.parentCoaId || null;
        if (body.accountType !== undefined) {
            data.accountType = body.accountType;
            data.normalBalance = ["ASSET", "EXPENSE"].includes(body.accountType) ? "DEBIT" : "CREDIT";
        }
        if (body.accountSubType !== undefined) data.accountSubType = body.accountSubType;
        if (body.cashFlowCategory !== undefined) data.cashFlowCategory = body.cashFlowCategory;
        if (body.taxMappingCode !== undefined) data.taxMappingCode = body.taxMappingCode;
        if (body.psakTag !== undefined) data.psakTag = body.psakTag;
        if (body.isBudgetApplicable !== undefined) data.isBudgetApplicable = body.isBudgetApplicable;
        if (body.isIntercompany !== undefined) data.isIntercompany = body.isIntercompany;
        if (body.isHeader !== undefined) data.isHeader = body.isHeader;
        if (body.isRetainedEarnings !== undefined) data.isRetainedEarnings = body.isRetainedEarnings;
        if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
        if (body.level !== undefined) data.level = body.level;
        if (body.isActive !== undefined) data.isActive = body.isActive;

        const account = await prisma.chartOfAccount.update({ where: { id }, data });
        return NextResponse.json(account);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        // A1: Check children
        const childCount = await prisma.chartOfAccount.count({ where: { parentCoaId: id } });
        if (childCount > 0) return NextResponse.json({ error: "Cannot delete account with sub-accounts" }, { status: 400 });

        // A1: Check journal lines usage
        const journalLineCount = await prisma.journalLine.count({ where: { coaId: id } });
        if (journalLineCount > 0) {
            return NextResponse.json({ error: `Cannot delete: account is used in ${journalLineCount} journal entries` }, { status: 400 });
        }

        // A1: Check bank account usage
        const bankAccountCount = await prisma.bankAccount.count({ where: { coaId: id } });
        if (bankAccountCount > 0) {
            return NextResponse.json({ error: `Cannot delete: account is linked to ${bankAccountCount} bank account(s)` }, { status: 400 });
        }

        await prisma.chartOfAccount.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
