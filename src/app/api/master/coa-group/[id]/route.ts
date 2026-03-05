import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

        const group = await prisma.coaGroup.update({
            where: { id },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.nameEn !== undefined && { nameEn: body.nameEn }),
                ...(body.accountType !== undefined && { accountType: body.accountType }),
                ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
                ...(body.isActive !== undefined && { isActive: body.isActive }),
            },
        });
        return NextResponse.json(group);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        const accountCount = await prisma.chartOfAccount.count({ where: { coaGroupId: id } });
        if (accountCount > 0) return NextResponse.json({ error: "Cannot delete group with existing accounts" }, { status: 400 });

        await prisma.coaGroup.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
