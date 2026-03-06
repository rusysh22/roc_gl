import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export const prisma = new PrismaClient();

export async function hashPw(pw: string) { return hash(pw, 10); }

export function d(y: number, m: number, day: number) {
    return new Date(Date.UTC(y, m - 1, day));
}

export function uuid() {
    return crypto.randomUUID();
}

export async function truncateAll() {
    console.log("🗑️  Truncating all tables...");
    await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE fiscal_corrections, budget_details, budgets,
      bank_reconciliation_items, bank_reconciliations, bank_transactions, bank_accounts,
      journal_approvals, journal_lines, journals, fixed_assets,
      chart_of_accounts, coa_groups, exchange_rates, company_currencies, currencies,
      cost_centers, departments, periods, fiscal_years,
      login_histories, users, roles, branches, companies CASCADE
  `);
    console.log("✅ All tables truncated");
}
