import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const fiscalYears = await prisma.fiscalYear.findMany({
            where: { companyId: user.companyId },
            orderBy: { startDate: "desc" },
            include: { _count: { select: { periods: true } } },
        });
        return NextResponse.json(fiscalYears);
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
        const { name, startDate, endDate, autoCreatePeriods } = body;
        if (!name || !startDate || !endDate) return NextResponse.json({ error: "Name, start date, and end date are required" }, { status: 400 });

        // Check overlap
        const overlap = await prisma.fiscalYear.findFirst({
            where: {
                companyId: user.companyId,
                OR: [
                    { startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
                ],
            },
        });
        if (overlap) return NextResponse.json({ error: "Fiscal year dates overlap with existing fiscal year" }, { status: 409 });

        const fiscalYear = await prisma.fiscalYear.create({
            data: { companyId: user.companyId, name, startDate: new Date(startDate), endDate: new Date(endDate) },
        });

        // Auto-create 12 monthly periods
        if (autoCreatePeriods !== false) {
            const start = new Date(startDate);
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            for (let i = 0; i < 12; i++) {
                const pStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
                const pEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 0);
                await prisma.period.create({
                    data: {
                        fiscalYearId: fiscalYear.id,
                        companyId: user.companyId,
                        periodNumber: i + 1,
                        name: `${months[pStart.getMonth()]} ${pStart.getFullYear()}`,
                        startDate: pStart,
                        endDate: pEnd,
                    },
                });
            }
        }

        return NextResponse.json(fiscalYear, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
