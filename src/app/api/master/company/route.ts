import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/master/company — List all companies (Super Admin) or current company
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;

        let companies;
        if (user.systemRole === "SUPER_ADMIN") {
            companies = await prisma.company.findMany({
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { users: true, branches: true },
                    },
                },
            });
        } else {
            companies = await prisma.company.findMany({
                where: { id: user.companyId },
                include: {
                    _count: {
                        select: { users: true, branches: true },
                    },
                },
            });
        }

        return NextResponse.json(companies);
    } catch (error) {
        console.error("[COMPANY_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST /api/master/company — Create company (Super Admin only)
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        if (user.systemRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const { code, name, npwp, address, baseCurrency, timezone, language } = body;

        if (!code || !name) {
            return NextResponse.json(
                { error: "Code and name are required" },
                { status: 400 }
            );
        }

        // Check unique code
        const existing = await prisma.company.findUnique({ where: { code } });
        if (existing) {
            return NextResponse.json(
                { error: "Company code already exists" },
                { status: 409 }
            );
        }

        const company = await prisma.company.create({
            data: {
                code,
                name,
                npwp: npwp || null,
                address: address || null,
                baseCurrency: baseCurrency || "IDR",
                timezone: timezone || "Asia/Jakarta",
                language: language || "id",
            },
        });

        return NextResponse.json(company, { status: 201 });
    } catch (error) {
        console.error("[COMPANY_POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
