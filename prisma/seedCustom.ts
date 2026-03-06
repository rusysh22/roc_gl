import { prisma } from "./seed/helpers";
import { seedHotelFoundation } from "./seed/hotel";
import {
    seedHotelCoA,
    seedHotelBankAccounts,
    seedHotelFixedAssets
} from "./seed/hotel-coa";
import { seedHotelBudgets, seedHotelFiscalCorrections } from "./seed/hotel-budgets";
import { seedHotelJournals } from "./seed/hotel-journals";

import { seedRetailFoundation } from "./seed/retail";
import {
    seedRetailCoA,
    seedRetailBankAccounts,
    seedRetailFixedAssets
} from "./seed/retail-coa";
import { seedRetailBudgets, seedRetailFiscalCorrections } from "./seed/retail-budgets";
import { seedRetailJournals } from "./seed/retail-journals";

async function main() {
    console.log("🚀 Starting Custom Full Seeding (Hotel & Retail)...");

    // Clean up existing data to prevent unique constraints during re-runs
    console.log("🧹 Cleaning up old data before seeding...");
    const tables = [
        "journalLine", "journal", "budgetDetail", "budget", "fixedAsset",
        "bankAccount", "fiscalCorrection", "chartOfAccount", "coaGroup",
        "exchangeRate", "companyCurrency", "currency", "period", "fiscalYear",
        "user", "role", "costCenter", "department", "branch", "company"
    ];

    for (const table of tables) {
        try {
            if ((prisma as any)[table]) {
                await (prisma as any)[table].deleteMany();
            }
        } catch (e: any) {
            // Ignore P2021 (Table does not exist) which happens if the feature isn't fully migrated
            if (e.code !== 'P2021') {
                console.warn(`Warning: Could not clear ${table}: ${e.message}`);
            }
        }
    }

    // Pre-requisites (Taxes & Dimensions - shared)
    await createSharedTaxes();
    await createCustomDimensions();

    // 1️⃣  --- HOTEL COMPANY SEEDING ---
    console.log("\n==============================================");
    console.log("🏢 STARTING HOTEL COMPANY SEEDING");
    console.log("==============================================\n");
    const hFs = await seedHotelFoundation();
    const hCoa = await seedHotelCoA(hFs.companyId);
    await seedHotelBankAccounts(hFs.companyId, hCoa);
    await seedHotelFixedAssets(hFs.companyId, hCoa);
    await seedHotelBudgets(hFs.companyId, hCoa, hFs.userId1, hFs.userId3, hFs.fy24, hFs.fy25, hFs.fy26, hFs.fy27);
    await seedHotelFiscalCorrections(hFs.companyId, hFs.fy24);
    await seedHotelJournals(
        hFs.companyId, hCoa, hFs.userId1, hFs.userId2,
        hFs.periodIds, hFs.fy24, hFs.fy25, hFs.fy26,
        hFs.deptFO, hFs.deptFB, hFs.deptHK, hFs.deptMKT, hFs.deptGA
    );


    // 2️⃣ --- RETAIL COMPANY SEEDING ---
    console.log("\n==============================================");
    console.log("🏬 STARTING RETAIL COMPANY SEEDING");
    console.log("==============================================\n");
    // Ensure the functions exist, we made them in retail.ts, retail-coa.ts, etc.
    const rFs = await seedRetailFoundation();
    const rCoa = await seedRetailCoA(rFs.companyId);
    await seedRetailBankAccounts(rFs.companyId, rCoa);
    await seedRetailFixedAssets(rFs.companyId, rCoa);
    await seedRetailBudgets(rFs.companyId, rCoa, rFs.userId1, rFs.userId3, rFs.fy24, rFs.fy25, rFs.fy26, rFs.fy27);
    await seedRetailFiscalCorrections(rFs.companyId, rFs.fy24);
    await seedRetailJournals(
        rFs.companyId, rCoa, rFs.userId1, rFs.userId2,
        rFs.periodIds, rFs.fy24, rFs.fy25, rFs.fy26,
        rFs.deptStore, rFs.deptMD, rFs.deptLOG, rFs.deptMKT, rFs.deptFin // Based on seedRetailFoundation return signature
    );


    console.log("\n🎉 ALL CUSTOM SEEDING FINISHED SUCCESSFULLY! 🎉");
    console.log("Login Info:");
    console.log("🏢 HOTEL:");
    console.log("  - Super Admin: admin@grahadani.co.id (Hotel@123)");
    console.log("  - Accountant: akuntan@grahadani.co.id (Hotel@123)");
    console.log("  - Finance Manager: manajer@grahadani.co.id (Hotel@123)");

    console.log("\n🏬 RETAIL:");
    console.log("  - Super Admin: admin@daniretail.co.id (Retail@123)");
    console.log("  - Accountant: accounting@daniretail.co.id (Retail@123)");
    console.log("  - Finance Manager: finance@daniretail.co.id (Retail@123)");

}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

// Helper for Shared Default Settings required by Schema
async function createSharedTaxes() {
    // Just a placeholder, assume it's created or we can add default taxes
    // Often there is a default tax type or dimension like cost center types
    // Add real creation logic here if some generic data needs to exist across companies.
}
async function createCustomDimensions() { }
