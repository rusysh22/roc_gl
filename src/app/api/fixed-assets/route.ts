import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/fixed-assets — List all fixed assets
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const sp = req.nextUrl.searchParams;
        const category = sp.get("category");
        const active = sp.get("active");

        const where: any = { companyId: user.companyId };
        if (category) where.category = category;
        if (active === "true") where.isActive = true;
        if (active === "false") where.isActive = false;

        const assets = await (prisma.fixedAsset.findMany as any)({
            where,
            include: {
                coaAsset: { select: { code: true, name: true } },
                coaAccumDep: { select: { code: true, name: true } },
                coaDepExpense: { select: { code: true, name: true } },
            },
            orderBy: { assetCode: "asc" },
        });

        return NextResponse.json(assets);
    } catch (error) {
        console.error("Fixed Assets list error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/fixed-assets — Create a new fixed asset
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const body = await req.json();
        const { assetCode, assetName, category, acquisitionDate, acquisitionCost, usefulLifeMonths,
            depreciationMethod, salvageValue, coaAssetId, coaAccumDepId, coaDepExpenseId } = body;

        if (!assetCode || !assetName || !category || !acquisitionDate || !acquisitionCost || !usefulLifeMonths) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const cost = Number(acquisitionCost);
        const sv = Number(salvageValue || 0);
        const bookValue = cost - sv; // initially full depreciable amount

        const asset = await (prisma.fixedAsset.create as any)({
            data: {
                companyId: user.companyId,
                assetCode,
                assetName,
                category,
                acquisitionDate: new Date(acquisitionDate),
                acquisitionCost: cost,
                usefulLifeMonths: Number(usefulLifeMonths),
                depreciationMethod: depreciationMethod || "STRAIGHT_LINE",
                salvageValue: sv,
                accumulatedDepreciation: 0,
                bookValue: cost, // initially equals acquisition cost
                coaAssetId,
                coaAccumDepId,
                coaDepExpenseId,
            },
        });

        return NextResponse.json(asset, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") return NextResponse.json({ error: "Duplicate asset code" }, { status: 409 });
        console.error("Fixed Asset create error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
