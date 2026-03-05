import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const { id } = await params;

        // Get journal with lines and period
        const journal = await prisma.journal.findUnique({
            where: { id, companyId: user.companyId },
            include: {
                lines: { include: { coa: true } },
                period: true,
            }
        });

        if (!journal) return NextResponse.json({ error: "Journal not found" }, { status: 404 });
        if (journal.status !== "DRAFT" && journal.status !== "APPROVED") {
            return NextResponse.json({ error: `Cannot post journal with status ${journal.status}` }, { status: 400 });
        }

        // Validation 1: Debit = Credit
        const roundedDebit = Math.round(Number(journal.totalDebit) * 100) / 100;
        const roundedCredit = Math.round(Number(journal.totalCredit) * 100) / 100;
        if (roundedDebit !== roundedCredit) {
            return NextResponse.json({ error: `Unbalanced journal: Debit (${roundedDebit}) != Credit (${roundedCredit})` }, { status: 400 });
        }

        // Validation 2: Min 2 lines
        if (journal.lines.length < 2) {
            return NextResponse.json({ error: "Journal must have at least 2 lines" }, { status: 400 });
        }

        // Validation 3: Period is OPEN
        if (!journal.period) {
            return NextResponse.json({ error: "Journal is not assigned to any valid period" }, { status: 400 });
        }
        if (journal.period.status !== "OPEN") {
            return NextResponse.json({ error: `Cannot post to period ${journal.period.name} because it is ${journal.period.status}` }, { status: 400 });
        }

        // Validation 4: CoAs are active and not headers
        const invalidAccounts = journal.lines.filter(l => !l.coa.isActive || l.coa.isHeader);
        if (invalidAccounts.length > 0) {
            return NextResponse.json({
                error: `Cannot post to inactive or header accounts: ${invalidAccounts.map(l => l.coa.code).join(", ")}`
            }, { status: 400 });
        }

        // Validation 5: Verify lines debit vs credit
        for (const line of journal.lines) {
            const d = Number(line.debitAmount);
            const c = Number(line.creditAmount);
            if (d === 0 && c === 0) {
                return NextResponse.json({ error: `Line ${line.lineNumber} has 0 debit and 0 credit` }, { status: 400 });
            }
        }

        // All validations passed, post the journal
        const posted = await prisma.journal.update({
            where: { id },
            data: {
                status: "POSTED",
                postedBy: user.id,
                postedAt: new Date(),
            }
        });

        return NextResponse.json(posted);
    } catch (error) {
        console.error("Journal POST action error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
