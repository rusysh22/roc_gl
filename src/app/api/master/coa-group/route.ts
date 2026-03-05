import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const groups = await prisma.coaGroup.findMany({
            where: { companyId: user.companyId },
            orderBy: { sortOrder: "asc" },
            include: { _count: { select: { accounts: true } } },
        });
        return NextResponse.json(groups);
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
        const { code, name, nameEn, accountType, sortOrder } = body;
        if (!code || !name || !accountType) return NextResponse.json({ error: "Code, name, and account type are required" }, { status: 400 });

        const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
        if (!validTypes.includes(accountType)) return NextResponse.json({ error: "Invalid account type" }, { status: 400 });

        const existing = await prisma.coaGroup.findUnique({ where: { companyId_code: { companyId: user.companyId, code } } });
        if (existing) return NextResponse.json({ error: "Group code already exists" }, { status: 409 });

        const group = await prisma.coaGroup.create({
            data: { companyId: user.companyId, code, name, nameEn: nameEn || null, accountType, sortOrder: sortOrder ?? 0 },
        });
        return NextResponse.json(group, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
