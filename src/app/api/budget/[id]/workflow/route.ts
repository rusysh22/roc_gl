import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Submit budget for approval
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const action = searchParams.get("action"); // submit, approve, reject, lock

        const budget = await prisma.budget.findUnique({
            where: { id },
            include: { _count: { select: { details: true } } },
        });
        if (!budget || budget.companyId !== user.companyId) {
            return NextResponse.json({ error: "Budget not found" }, { status: 404 });
        }

        switch (action) {
            case "submit": {
                if (budget.status !== "DRAFT") {
                    return NextResponse.json({ error: "Only DRAFT budgets can be submitted" }, { status: 400 });
                }
                if (budget._count.details === 0) {
                    return NextResponse.json({ error: "Cannot submit a budget with no detail lines" }, { status: 400 });
                }
                const updated = await prisma.budget.update({
                    where: { id },
                    data: { status: "SUBMITTED" },
                });
                return NextResponse.json(updated);
            }
            case "approve": {
                if (budget.status !== "SUBMITTED") {
                    return NextResponse.json({ error: "Only SUBMITTED budgets can be approved" }, { status: 400 });
                }
                const updated = await prisma.budget.update({
                    where: { id },
                    data: { status: "APPROVED", approvedBy: user.id, approvedAt: new Date() },
                });
                return NextResponse.json(updated);
            }
            case "reject": {
                if (budget.status !== "SUBMITTED") {
                    return NextResponse.json({ error: "Only SUBMITTED budgets can be rejected" }, { status: 400 });
                }
                const updated = await prisma.budget.update({
                    where: { id },
                    data: { status: "DRAFT" }, // Back to draft
                });
                return NextResponse.json(updated);
            }
            case "lock": {
                if (budget.status !== "APPROVED") {
                    return NextResponse.json({ error: "Only APPROVED budgets can be locked" }, { status: 400 });
                }
                const updated = await prisma.budget.update({
                    where: { id },
                    data: { status: "LOCKED" },
                });
                return NextResponse.json(updated);
            }
            default:
                return NextResponse.json({ error: "Invalid action. Use: submit, approve, reject, lock" }, { status: 400 });
        }
    } catch (error) {
        console.error("Budget workflow error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
