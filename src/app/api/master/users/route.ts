import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hash } from "bcryptjs";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json([]);

        const users = await prisma.user.findMany({
            where: { companyId: user.companyId },
            orderBy: { name: "asc" },
            select: {
                id: true, email: true, name: true, systemRole: true, isActive: true,
                lastLoginAt: true, twoFaEnabled: true, createdAt: true,
                role: { select: { id: true, name: true } },
            },
        });
        return NextResponse.json(users);
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
        const { email, password, name, systemRole, roleId } = body;
        if (!email || !password || !name) return NextResponse.json({ error: "Email, password, and name are required" }, { status: 400 });

        // Validate password strength
        if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
        if (!/[A-Z]/.test(password)) return NextResponse.json({ error: "Password must contain uppercase letter" }, { status: 400 });
        if (!/[a-z]/.test(password)) return NextResponse.json({ error: "Password must contain lowercase letter" }, { status: 400 });
        if (!/[0-9]/.test(password)) return NextResponse.json({ error: "Password must contain a number" }, { status: 400 });

        // Check unique email per company
        const existing = await prisma.user.findFirst({ where: { companyId: user.companyId, email } });
        if (existing) return NextResponse.json({ error: "Email already exists in this company" }, { status: 409 });

        const passwordHash = await hash(password, 12);

        const newUser = await prisma.user.create({
            data: {
                companyId: user.companyId,
                email,
                passwordHash,
                name,
                systemRole: systemRole || "VIEWER",
                roleId: roleId || null,
            },
            select: { id: true, email: true, name: true, systemRole: true, isActive: true },
        });
        return NextResponse.json(newUser, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
