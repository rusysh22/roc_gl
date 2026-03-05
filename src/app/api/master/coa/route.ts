import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get("search") || "";
        const groupId = searchParams.get("groupId") || "";

        const where: any = { companyId: user.companyId };
        if (groupId) where.coaGroupId = groupId;
        if (search) {
            where.OR = [
                { code: { contains: search, mode: "insensitive" } },
                { name: { contains: search, mode: "insensitive" } },
            ];
        }

        const accounts = await prisma.chartOfAccount.findMany({
            where,
            orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
            include: {
                coaGroup: { select: { code: true, name: true, accountType: true } },
                parent: { select: { code: true, name: true } },
                _count: { select: { children: true } },
            },
        });
        return NextResponse.json(accounts);
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
        const { code, name, nameEn, coaGroupId, parentCoaId, accountType, accountSubType,
            cashFlowCategory, taxMappingCode, psakTag, isBudgetApplicable,
            isIntercompany, isHeader, isRetainedEarnings, sortOrder, level } = body;

        if (!code || !name || !coaGroupId || !accountType) {
            return NextResponse.json({ error: "Code, name, group, and account type are required" }, { status: 400 });
        }

        // Auto-set normal balance
        const normalBalance = ["ASSET", "EXPENSE"].includes(accountType) ? "DEBIT" : "CREDIT";

        const existing = await prisma.chartOfAccount.findUnique({ where: { companyId_code: { companyId: user.companyId, code } } });
        if (existing) return NextResponse.json({ error: "Account code already exists" }, { status: 409 });

        const account = await prisma.chartOfAccount.create({
            data: {
                companyId: user.companyId, code, name, nameEn: nameEn || null,
                coaGroupId, parentCoaId: parentCoaId || null,
                accountType, accountSubType: accountSubType || null, normalBalance,
                cashFlowCategory: cashFlowCategory || null,
                taxMappingCode: taxMappingCode || null, psakTag: psakTag || null,
                isBudgetApplicable: isBudgetApplicable ?? false,
                isIntercompany: isIntercompany ?? false,
                isHeader: isHeader ?? false, isRetainedEarnings: isRetainedEarnings ?? false,
                sortOrder: sortOrder ?? 0, level: level ?? 3,
            },
        });
        return NextResponse.json(account, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
