import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/fixed-assets/[id] — Get asset detail
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        const asset = await (prisma.fixedAsset.findUnique as any)({
            where: { id },
            include: {
                coaAsset: { select: { code: true, name: true } },
                coaAccumDep: { select: { code: true, name: true } },
                coaDepExpense: { select: { code: true, name: true } },
            },
        });
        if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(asset);
    } catch (error) {
        console.error("Fixed Asset detail error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/fixed-assets/[id] — Update asset
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

        const asset = await (prisma.fixedAsset.update as any)({
            where: { id },
            data: {
                ...(body.assetName && { assetName: body.assetName }),
                ...(body.category && { category: body.category }),
                ...(body.salvageValue !== undefined && { salvageValue: Number(body.salvageValue) }),
                ...(body.coaAssetId && { coaAssetId: body.coaAssetId }),
                ...(body.coaAccumDepId && { coaAccumDepId: body.coaAccumDepId }),
                ...(body.coaDepExpenseId && { coaDepExpenseId: body.coaDepExpenseId }),
            },
        });
        return NextResponse.json(asset);
    } catch (error) {
        console.error("Fixed Asset update error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/fixed-assets/[id] — Delete asset (only if no depreciation posted)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;

        const asset = await (prisma.fixedAsset.findUnique as any)({ where: { id } });
        if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
        if (Number(asset.accumulatedDepreciation) > 0) {
            return NextResponse.json({ error: "Cannot delete asset with posted depreciation" }, { status: 400 });
        }

        await (prisma.fixedAsset.delete as any)({ where: { id } });
        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        console.error("Fixed Asset delete error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
