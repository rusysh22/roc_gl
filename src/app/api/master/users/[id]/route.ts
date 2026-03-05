import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

        const data: any = {};
        if (body.name !== undefined) data.name = body.name;
        if (body.systemRole !== undefined) data.systemRole = body.systemRole;
        if (body.roleId !== undefined) data.roleId = body.roleId || null;
        if (body.isActive !== undefined) data.isActive = body.isActive;
        if (body.password) {
            data.passwordHash = await hash(body.password, 12);
        }

        const user = await prisma.user.update({
            where: { id },
            data,
            select: { id: true, email: true, name: true, systemRole: true, isActive: true },
        });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        // Don't delete, deactivate instead (business rule)
        const user = await prisma.user.update({
            where: { id },
            data: { isActive: false },
            select: { id: true, name: true, isActive: true },
        });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
