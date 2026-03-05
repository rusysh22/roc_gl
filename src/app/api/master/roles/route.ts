import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const roles = await prisma.role.findMany({
            where: { companyId: user.companyId },
            orderBy: { name: "asc" },
            include: { _count: { select: { users: true } } },
        });
        return NextResponse.json(roles);
    } catch (error) {
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
        const { name, description, permissions } = body;
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const existing = await prisma.role.findUnique({ where: { companyId_name: { companyId: user.companyId, name } } });
        if (existing) return NextResponse.json({ error: "Role name already exists" }, { status: 409 });

        const role = await prisma.role.create({
            data: { companyId: user.companyId, name, description: description || null, permissions: permissions || [] },
        });
        return NextResponse.json(role, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
