import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

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

        const childCount = await prisma.chartOfAccount.count({ where: { parentCoaId: id } });
        if (childCount > 0) return NextResponse.json({ error: "Cannot delete account with sub-accounts" }, { status: 400 });

        await prisma.chartOfAccount.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
