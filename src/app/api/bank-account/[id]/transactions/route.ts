import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const dateFrom = searchParams.get("dateFrom");
        const dateTo = searchParams.get("dateTo");
        const type = searchParams.get("type"); // DEBIT, CREDIT
        const status = searchParams.get("status"); // UNMATCHED, MATCHED, RECONCILED

        // Verify bank account belongs to company
        const bankAccount = await prisma.bankAccount.findUnique({
            where: { id, companyId: user.companyId },
        });
        if (!bankAccount) return NextResponse.json({ error: "Bank account not found" }, { status: 404 });

        const where: any = {
            bankAccountId: id,
            companyId: user.companyId,
        };

        if (dateFrom || dateTo) {
            where.transactionDate = {};
            if (dateFrom) where.transactionDate.gte = new Date(dateFrom);
            if (dateTo) where.transactionDate.lte = new Date(dateTo);
        }
        if (type) where.transactionType = type;
        if (status) where.status = status;

        const transactions = await prisma.bankTransaction.findMany({
            where,
            orderBy: { transactionDate: "desc" },
            take: 500,
        });

        return NextResponse.json(transactions);
    } catch (error) {
        console.error("Bank transactions GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
