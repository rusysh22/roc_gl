import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const branches = await prisma.branch.findMany({
            where: { companyId: user.companyId },
            orderBy: { code: "asc" },
        });
        return NextResponse.json(branches);
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
        const { code, name, address } = body;
        if (!code || !name) return NextResponse.json({ error: "Code and name are required" }, { status: 400 });

        const existing = await prisma.branch.findUnique({ where: { companyId_code: { companyId: user.companyId, code } } });
        if (existing) return NextResponse.json({ error: "Branch code already exists" }, { status: 409 });

        const branch = await prisma.branch.create({
            data: { companyId: user.companyId, code, name, address: address || null },
        });
        return NextResponse.json(branch, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
