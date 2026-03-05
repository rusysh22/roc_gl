import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        const budget = await prisma.budget.findUnique({
            where: { id },
            include: {
                fiscalYear: true,
                creator: { select: { name: true } },
                approver: { select: { name: true } },
                details: {
                    include: {
                        coa: { select: { code: true, name: true, accountType: true } },
                        department: { select: { code: true, name: true } },
                        costCenter: { select: { code: true, name: true } },
                    },
                    orderBy: { coa: { code: "asc" } },
                },
            },
        });

        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }

        return NextResponse.json(budget);
    } catch (error) {
        console.error("Budget detail GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const body = await req.json();

        const budget = await prisma.budget.findUnique({ where: { id } });
        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }
        if (budget.status === "LOCKED") {
            return NextResponse.json({ error: "Cannot modify a locked budget" }, { status: 400 });
        }

        const data: any = {};
        if (body.budgetName !== undefined) data.budgetName = body.budgetName;
        if (body.notes !== undefined) data.notes = body.notes;
        if (body.isDefault !== undefined) {
            // Ensure only one default per fiscal year
            if (body.isDefault) {
                await prisma.budget.updateMany({
                    where: { companyId: user.companyId, fiscalYearId: budget.fiscalYearId, isDefault: true },
                    data: { isDefault: false },
                });
            }
            data.isDefault = body.isDefault;
        }

        const updated = await prisma.budget.update({
            where: { id },
            data,
            include: { fiscalYear: { select: { name: true } }, creator: { select: { name: true } } },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("Budget PUT error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        const budget = await prisma.budget.findUnique({ where: { id } });
        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }
        if (budget.status !== "DRAFT") {
            return NextResponse.json({ error: "Only DRAFT budgets can be deleted" }, { status: 400 });
        }

        await prisma.budget.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Budget DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
