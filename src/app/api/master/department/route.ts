import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const departments = await prisma.department.findMany({
            where: { companyId: user.companyId },
            orderBy: { code: "asc" },
            include: { parent: { select: { name: true, code: true } }, _count: { select: { children: true, costCenters: true } } },
        });
        return NextResponse.json(departments);
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
        const { code, name, parentId } = body;
        if (!code || !name) return NextResponse.json({ error: "Code and name are required" }, { status: 400 });

        const existing = await prisma.department.findUnique({ where: { companyId_code: { companyId: user.companyId, code } } });
        if (existing) return NextResponse.json({ error: "Department code already exists" }, { status: 409 });

        const dept = await prisma.department.create({
            data: { companyId: user.companyId, code, name, parentId: parentId || null },
        });
        return NextResponse.json(dept, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
