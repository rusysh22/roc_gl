import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const periods = await prisma.period.findMany({
            where: { companyId: user.companyId },
            orderBy: [{ fiscalYear: { startDate: "desc" } }, { periodNumber: "asc" }],
            include: { fiscalYear: { select: { name: true } } },
        });
        return NextResponse.json(periods);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
