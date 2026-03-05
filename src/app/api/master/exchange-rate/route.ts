import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const rates = await prisma.exchangeRate.findMany({
            where: { companyId: user.companyId },
            orderBy: [{ date: "desc" }, { currency: { code: "asc" } }],
            include: { currency: { select: { code: true, name: true, symbol: true } } },
        });
        return NextResponse.json(rates);
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
        const { currencyId, date, rate, source } = body;
        if (!currencyId || !date || !rate) return NextResponse.json({ error: "Currency, date, and rate are required" }, { status: 400 });

        const exchangeRate = await prisma.exchangeRate.upsert({
            where: { companyId_currencyId_date: { companyId: user.companyId, currencyId, date: new Date(date) } },
            update: { rate, source: source || "manual" },
            create: { companyId: user.companyId, currencyId, date: new Date(date), rate, source: source || "manual" },
        });
        return NextResponse.json(exchangeRate, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
