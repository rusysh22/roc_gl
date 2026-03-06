import { truncateAll, prisma } from "./seed/helpers";
import { seedFoundation } from "./seed/foundation";
import { seedCoA, seedBankAccounts, seedFixedAssets } from "./seed/coa-assets";
import { seedJournals } from "./seed/journals";
import { seedBudgets, seedFiscalCorrections } from "./seed/budgets";

async function main() {
    console.log("🚀 Starting seed: PT Bangun Jaya Konstruksi (Kontraktor)");
    console.log("============================================================\n");

    // 1. Clear everything
    await truncateAll();

    // 2. Foundation (company, users, roles, FY, periods, depts, cost centers, currencies)
    const foundation = await seedFoundation();

    // 3. Chart of Accounts (68 accounts)
    const coaIds = await seedCoA(foundation.companyId);

    // 4. Bank Accounts (3)
    await seedBankAccounts(foundation.companyId, coaIds);

    // 5. Fixed Assets (8)
    await seedFixedAssets(foundation.companyId, coaIds);

    // 6. Journals (130+ journals, Mar 2025 - Mar 2026)
    await seedJournals(
        foundation.companyId, coaIds,
        foundation.userId1, foundation.userId2,
        foundation.periodIds,
        foundation.fy25, foundation.fy26,
        foundation.deptHQ, foundation.deptA, foundation.deptB, foundation.deptC
    );

    // 7. Budgets (FY2025, FY2026, FY2027)
    await seedBudgets(
        foundation.companyId, coaIds,
        foundation.userId1, foundation.userId3,
        foundation.fy25, foundation.fy26, foundation.fy27
    );

    // 8. Fiscal Corrections (FY2025)
    await seedFiscalCorrections(foundation.companyId, foundation.fy25);

    console.log("\n============================================================");
    console.log("🎉 Seed complete! Login with:");
    console.log("   Email: admin@bjk.co.id");
    console.log("   Password: Demo@123");
    console.log("============================================================");
}

main()
    .catch(e => { console.error("❌ Seed error:", e); process.exit(1); })
    .finally(() => prisma.$disconnect());
