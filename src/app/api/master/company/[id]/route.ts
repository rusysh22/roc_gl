import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/master/company/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                branches: true,
                _count: {
                    select: { users: true, branches: true },
                },
            },
        });

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        return NextResponse.json(company);
    } catch (error) {
        console.error("[COMPANY_GET_ID]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT /api/master/company/[id]
export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        if (user.systemRole !== "SUPER_ADMIN" && user.systemRole !== "COMPANY_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await req.json();
        const { name, npwp, address, timezone, language, isActive } = body;

        const company = await prisma.company.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(npwp !== undefined && { npwp }),
                ...(address !== undefined && { address }),
                ...(timezone !== undefined && { timezone }),
                ...(language !== undefined && { language }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json(company);
    } catch (error) {
        console.error("[COMPANY_PUT]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/master/company/[id]
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = session.user as any;
        if (user.systemRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Check if company has users
        const userCount = await prisma.user.count({ where: { companyId: id } });
        if (userCount > 0) {
            return NextResponse.json(
                { error: "Cannot delete company with existing users. Deactivate instead." },
                { status: 400 }
            );
        }

        await prisma.company.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[COMPANY_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
