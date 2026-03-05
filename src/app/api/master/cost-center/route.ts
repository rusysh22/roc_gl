import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const costCenters = await prisma.costCenter.findMany({
            where: { companyId: user.companyId },
            orderBy: { code: "asc" },
            include: { department: { select: { name: true, code: true } } },
        });
        return NextResponse.json(costCenters);
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
        const { code, name, departmentId, budgetApplicable } = body;
        if (!code || !name) return NextResponse.json({ error: "Code and name are required" }, { status: 400 });

        const existing = await prisma.costCenter.findUnique({ where: { companyId_code: { companyId: user.companyId, code } } });
        if (existing) return NextResponse.json({ error: "Cost center code already exists" }, { status: 409 });

        const cc = await prisma.costCenter.create({
            data: { companyId: user.companyId, code, name, departmentId: departmentId || null, budgetApplicable: budgetApplicable ?? true },
        });
        return NextResponse.json(cc, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
