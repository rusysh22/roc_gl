import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

interface ValidationResult {
    id: string; label: string; status: "pass" | "warn" | "fail"; message: string;
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        const companyId = user.companyId;
        const accounts = await prisma.chartOfAccount.findMany({ where: { companyId } });
        const groups = await prisma.coaGroup.findMany({ where: { companyId } });
        const results: ValidationResult[] = [];

        // 1. Check all account types exist
        const types = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
        const existingTypes = new Set(groups.map(g => g.accountType));
        const missingTypes = types.filter(t => !existingTypes.has(t));
        results.push({
            id: "account_types", label: "All Account Types Present",
            status: missingTypes.length === 0 ? "pass" : "fail",
            message: missingTypes.length === 0 ? "All 5 types present" : `Missing: ${missingTypes.join(", ")}`,
        });

        // 2. Check orphan accounts (detail without group)
        const groupIds = new Set(groups.map(g => g.id));
        const orphans = accounts.filter(a => !groupIds.has(a.coaGroupId));
        results.push({
            id: "orphans", label: "No Orphan Accounts",
            status: orphans.length === 0 ? "pass" : "fail",
            message: orphans.length === 0 ? "All accounts linked to groups" : `${orphans.length} orphan(s): ${orphans.map(o => o.code).join(", ")}`,
        });

        // 3. Check cash flow mapping
        const detailAccounts = accounts.filter(a => !a.isHeader);
        const noCashFlow = detailAccounts.filter(a => !a.cashFlowCategory);
        results.push({
            id: "cash_flow", label: "Cash Flow Mapping Complete",
            status: noCashFlow.length === 0 ? "pass" : "warn",
            message: noCashFlow.length === 0 ? "All detail accounts have cash flow mapping" : `${noCashFlow.length} account(s) missing: ${noCashFlow.slice(0, 5).map(a => a.code).join(", ")}${noCashFlow.length > 5 ? "..." : ""}`,
        });

        // 4. Check Retained Earnings
        const reAccount = accounts.find(a => a.isRetainedEarnings);
        results.push({
            id: "retained_earnings", label: "Retained Earnings Set",
            status: reAccount ? "pass" : "fail",
            message: reAccount ? `Set to: ${reAccount.code} - ${reAccount.name}` : "No Retained Earnings account designated",
        });

        // 5. Check duplicate codes
        const codeCounts: Record<string, number> = {};
        accounts.forEach(a => { codeCounts[a.code] = (codeCounts[a.code] || 0) + 1; });
        const dupes = Object.entries(codeCounts).filter(([, c]) => c > 1).map(([k]) => k);
        results.push({
            id: "duplicates", label: "No Duplicate Codes",
            status: dupes.length === 0 ? "pass" : "fail",
            message: dupes.length === 0 ? "All codes are unique" : `Duplicates: ${dupes.join(", ")}`,
        });

        // 6. Check total accounts
        results.push({
            id: "total_accounts", label: "Accounts Count",
            status: accounts.length >= 5 ? "pass" : "warn",
            message: `${accounts.length} total accounts (${detailAccounts.length} detail, ${accounts.length - detailAccounts.length} header)`,
        });

        return NextResponse.json({ results, summary: { total: accounts.length, groups: groups.length, pass: results.filter(r => r.status === "pass").length, fail: results.filter(r => r.status === "fail").length, warn: results.filter(r => r.status === "warn").length } });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
