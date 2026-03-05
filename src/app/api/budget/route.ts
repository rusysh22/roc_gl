import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const fiscalYearId = searchParams.get("fiscalYearId");
        const status = searchParams.get("status");

        const where: any = { companyId: user.companyId };
        if (fiscalYearId) where.fiscalYearId = fiscalYearId;
        if (status) where.status = status;

        const budgets = await prisma.budget.findMany({
            where,
            include: {
                fiscalYear: { select: { name: true } },
                creator: { select: { name: true } },
                approver: { select: { name: true } },
                _count: { select: { details: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(budgets);
    } catch (error) {
        console.error("Budget GET error:", error);
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
        const { fiscalYearId, budgetName, version, notes } = body;

        if (!fiscalYearId || !budgetName) {
            return NextResponse.json({ error: "fiscalYearId and budgetName are required" }, { status: 400 });
        }

        // Verify fiscal year
        const fy = await prisma.fiscalYear.findUnique({
            where: { id: fiscalYearId },
        });
        if (!fy || fy.companyId !== user.companyId) {
            return NextResponse.json({ error: "Fiscal year not found" }, { status: 404 });
        }

        // Check duplicate version
        const existing = await prisma.budget.findFirst({
            where: { companyId: user.companyId, fiscalYearId, version: version || "v1" },
        });
        if (existing) {
            return NextResponse.json({ error: `Budget version "${version || "v1"}" already exists for this fiscal year` }, { status: 400 });
        }

        const budget = await prisma.budget.create({
            data: {
                companyId: user.companyId,
                fiscalYearId,
                budgetName,
                version: version || "v1",
                notes: notes || null,
                createdBy: user.id,
            },
            include: {
                fiscalYear: { select: { name: true } },
                creator: { select: { name: true } },
            },
        });

        return NextResponse.json(budget, { status: 201 });
    } catch (error) {
        console.error("Budget POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
