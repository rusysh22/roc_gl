import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const currencies = await prisma.currency.findMany({
            orderBy: { code: "asc" },
        });
        return NextResponse.json(currencies);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (user.systemRole !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const body = await req.json();
        const { code, name, symbol, decimalPlaces } = body;
        if (!code || !name || !symbol) return NextResponse.json({ error: "Code, name, and symbol are required" }, { status: 400 });

        const existing = await prisma.currency.findUnique({ where: { code } });
        if (existing) return NextResponse.json({ error: "Currency code already exists" }, { status: 409 });

        const currency = await prisma.currency.create({
            data: { code: code.toUpperCase(), name, symbol, decimalPlaces: decimalPlaces ?? 2 },
        });
        return NextResponse.json(currency, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
