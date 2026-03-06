import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// CoA search/autocomplete for journal entry and other forms
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const searchParams = req.nextUrl.searchParams;
        const q = searchParams.get("q") || "";
        const limit = parseInt(searchParams.get("limit") || "20");

        const whereClause: any = {
            companyId: user.companyId,
            isHeader: false,
            isActive: true,
        };

        if (q && q.length > 0) {
            whereClause.OR = [
                { code: { contains: q, mode: "insensitive" } },
                { name: { contains: q, mode: "insensitive" } },
                { nameEn: { contains: q, mode: "insensitive" } },
            ];
        }

        const accounts = await prisma.chartOfAccount.findMany({
            where: whereClause,
            select: {
                id: true, code: true, name: true, nameEn: true,
                accountType: true, normalBalance: true,
                cashFlowCategory: true,
            },
            orderBy: { code: "asc" },
            take: limit,
        });

        return NextResponse.json(accounts);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
