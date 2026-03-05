import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { id } = await params;
        const body = await req.json();

        if (body.status === "CLOSED") {
            // Business rule: only close if no unposted journals (future check)
        }

        const period = await prisma.period.update({
            where: { id },
            data: { ...(body.status !== undefined && { status: body.status }) },
        });
        return NextResponse.json(period);
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
