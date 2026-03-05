import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const searchParams = req.nextUrl.searchParams;
        const search = searchParams.get("search") || "";

        const where: any = { companyId: user.companyId };
        if (search) {
            where.OR = [
                { accountName: { contains: search, mode: "insensitive" } },
                { bankName: { contains: search, mode: "insensitive" } },
                { accountNumber: { contains: search, mode: "insensitive" } },
            ];
        }

        const accounts = await prisma.bankAccount.findMany({
            where,
            include: { coa: true },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(accounts);
    } catch (error) {
        console.error("BankAccount GET error:", error);
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
        const { accountName, bankName, accountNumber, accountHolder, currencyCode, coaId, openingBalance, openingDate, isActive } = body;

        // Validation
        if (!accountName || !bankName || !accountNumber || !currencyCode || !coaId || !openingDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check CoA
        const coa = await prisma.chartOfAccount.findUnique({ where: { id: coaId, companyId: user.companyId } });
        if (!coa) return NextResponse.json({ error: "CoA not found" }, { status: 404 });
        if (coa.accountType !== "ASSET" || coa.isHeader) {
            return NextResponse.json({ error: "Bank account must be linked to a detail ASSET account" }, { status: 400 });
        }

        // Check unique account number in company
        const existing = await prisma.bankAccount.findUnique({
            where: { companyId_accountNumber: { companyId: user.companyId, accountNumber } }
        });
        if (existing) {
            return NextResponse.json({ error: `Account number ${accountNumber} already exists in this company` }, { status: 400 });
        }

        const account = await prisma.bankAccount.create({
            data: {
                companyId: user.companyId,
                accountName,
                bankName,
                accountNumber,
                accountHolder: accountHolder || accountName,
                currencyCode,
                coaId,
                openingBalance: openingBalance || 0,
                openingDate: new Date(openingDate),
                isActive: isActive ?? true,
            }
        });

        return NextResponse.json(account, { status: 201 });
    } catch (error) {
        console.error("BankAccount POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
