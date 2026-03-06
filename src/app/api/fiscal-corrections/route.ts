import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/fiscal-corrections — List fiscal corrections for a fiscal year
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const fiscalYearId = req.nextUrl.searchParams.get("fiscalYearId");
        if (!fiscalYearId) return NextResponse.json({ error: "fiscalYearId required" }, { status: 400 });

        const corrections = await (prisma.fiscalCorrection.findMany as any)({
            where: { companyId: user.companyId, fiscalYearId },
            include: {
                coa: { select: { code: true, name: true } },
                fiscalYear: { select: { name: true } },
            },
            orderBy: { createdAt: "asc" },
        });

        // Group by type
        const positive = corrections.filter((c: any) => c.correctionType === "POSITIVE");
        const negative = corrections.filter((c: any) => c.correctionType === "NEGATIVE");
        const totalPositive = positive.reduce((s: number, c: any) => s + Number(c.amount), 0);
        const totalNegative = negative.reduce((s: number, c: any) => s + Number(c.amount), 0);

        return NextResponse.json({
            corrections,
            summary: { totalPositive, totalNegative, netCorrection: totalPositive - totalNegative },
        });
    } catch (error) {
        console.error("Fiscal corrections list error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/fiscal-corrections — Create a fiscal correction
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { fiscalYearId, description, correctionType, amount, coaId } = await req.json();
        if (!fiscalYearId || !description || !correctionType || !amount) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }
        if (!["POSITIVE", "NEGATIVE"].includes(correctionType)) {
            return NextResponse.json({ error: "Invalid correctionType" }, { status: 400 });
        }

        const correction = await (prisma.fiscalCorrection.create as any)({
            data: {
                companyId: user.companyId,
                fiscalYearId,
                description,
                correctionType,
                amount: Number(amount),
                coaId: coaId || null,
            },
        });

        return NextResponse.json(correction, { status: 201 });
    } catch (error) {
        console.error("Fiscal correction create error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/fiscal-corrections — Delete a fiscal correction
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const id = req.nextUrl.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        await (prisma.fiscalCorrection.delete as any)({ where: { id } });
        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        console.error("Fiscal correction delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
