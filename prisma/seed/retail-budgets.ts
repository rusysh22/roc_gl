import { prisma, uuid } from "./helpers";

export async function seedRetailBudgets(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId3: string,
    fy24: string, fy25: string, fy26: string, fy27: string
) {
    console.log("💰 [RETAIL] Creating budgets...");

    // Budget lines: coaCode -> [p1..p12] monthly amounts (in millions, then mapped to actuals)
    const budgetLines: Record<string, number[]> = {
        // Revenues (Offline, Ecomm, B2B)
        "4001": [8500, 8200, 9500, 10500, 11000, 12000, 11500, 10800, 9800, 10500, 11800, 14000].map(v => v * 1000000), // Offline
        "4002": [4200, 4100, 4800, 5500, 5800, 6500, 6200, 5800, 5100, 5800, 6800, 8500].map(v => v * 1000000), // E-commerce (11.11, 12.12 bumps)
        "4003": [1500, 1800, 1900, 1600, 1700, 1800, 2100, 2000, 1800, 2200, 2500, 3000].map(v => v * 1000000), // B2B Corporate

        // COGS
        "5001": [4250, 4100, 4750, 5250, 5500, 6000, 5750, 5400, 4900, 5250, 5900, 7000].map(v => v * 1000000), // ~50% margin offline
        "5002": [2520, 2460, 2880, 3300, 3480, 3900, 3720, 3480, 3060, 3480, 4080, 5100].map(v => v * 1000000), // ~40% margin online
        "5003": [1050, 1260, 1330, 1120, 1190, 1260, 1470, 1400, 1260, 1540, 1750, 2100].map(v => v * 1000000), // ~30% margin B2B
        "5004": [300, 280, 320, 350, 380, 450, 400, 350, 300, 380, 480, 600].map(v => v * 1000000), // Packaging (High end year)

        // OPEX
        "6001": [1200, 1200, 1200, 1200, 1200, 1400, 1400, 1400, 1400, 1400, 1400, 1600].map(v => v * 1000000), // Store Staff + THR
        "6002": [900, 900, 900, 900, 900, 1100, 1100, 1100, 1100, 1100, 1100, 1300].map(v => v * 1000000), // HQ Staff
        "6004": [1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500, 1500].map(v => v * 1000000), // Store Rent (Flat)
        "6005": [400, 380, 410, 420, 440, 480, 510, 500, 430, 450, 470, 550].map(v => v * 1000000), // Utility
        "6006": [350, 330, 400, 480, 510, 580, 550, 480, 400, 500, 600, 800].map(v => v * 1000000), // MPL Fees (Scales with online rules)
        "6007": [500, 450, 550, 600, 650, 750, 700, 600, 500, 800, 1200, 1500].map(v => v * 1000000), // Marketing Ads (Q4 Heavy)
        "6008": [800, 750, 900, 1100, 1200, 1400, 1300, 1100, 900, 1100, 1500, 2000].map(v => v * 1000000), // Logistics 
    };

    const createBudget = async (fyId: string, fyName: string, status: string, ver: string, isDefault: boolean, approver?: string) => {
        const budgetId = uuid();
        try {
            await (prisma as any).budget.create({
                data: {
                    id: budgetId, companyId, fiscalYearId: fyId,
                    budgetName: `Retail Operational Budget ${fyName}`, version: ver, status,
                    isDefault, createdBy: userId1,
                    approvedBy: approver || null,
                    approvedAt: approver ? new Date() : null,
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2021') throw e;
        }

        for (const [coaCode, amounts] of Object.entries(budgetLines)) {
            if (!coaIds[coaCode]) continue;
            const totalAnnual = amounts.reduce((a: number, b: number) => a + b, 0);

            // Apply growth factor based on year (Retail growth expectations)
            let growth = 1.0;
            if (fyName === "FY2025") growth = 1.25;
            if (fyName === "FY2026") growth = 1.50; // Opening new stores
            if (fyName === "FY2027") growth = 1.85;

            try {
                await (prisma as any).budgetDetail.create({
                    data: {
                        budgetId, companyId, coaId: coaIds[coaCode],
                        period1: Math.round(amounts[0] * growth),
                        period2: Math.round(amounts[1] * growth),
                        period3: Math.round(amounts[2] * growth),
                        period4: Math.round(amounts[3] * growth),
                        period5: Math.round(amounts[4] * growth),
                        period6: Math.round(amounts[5] * growth),
                        period7: Math.round(amounts[6] * growth),
                        period8: Math.round(amounts[7] * growth),
                        period9: Math.round(amounts[8] * growth),
                        period10: Math.round(amounts[9] * growth),
                        period11: Math.round(amounts[10] * growth),
                        period12: Math.round(amounts[11] * growth),
                        totalAnnual: Math.round(totalAnnual * growth),
                    }
                });
            } catch (e: any) {
                if (e.code !== 'P2021') throw e;
            }
        }
    };

    await createBudget(fy24, "FY2024", "LOCKED", "1", true, userId3);
    await createBudget(fy25, "FY2025", "APPROVED", "1", true, userId3);
    await createBudget(fy26, "FY2026", "APPROVED", "1", true, userId3);
    await createBudget(fy27, "FY2027", "DRAFT", "1", true);

    console.log("✅ [RETAIL] Budgets done (4 budgets for 2024-2027)");
}

export async function seedRetailFiscalCorrections(companyId: string, fy24: string) {
    console.log("📋 [RETAIL] Creating fiscal corrections for FY2024...");

    try {
        await (prisma as any).fiscalCorrection.createMany({
            data: [
                { companyId, fiscalYearId: fy24, description: "Koreksi Positif Biaya Promosi/Gimmick tanpa daftar nominatif", correctionType: "POSITIVE", amount: 450000000 },
                { companyId, fiscalYearId: fy24, description: "Koreksi Kehilangan Barang / Shrinkage melebihi batas yang diakui pajak", correctionType: "POSITIVE", amount: 215000000 },
                { companyId, fiscalYearId: fy24, description: "Selisih Penyusutan Fiskal Gedung Gudang", correctionType: "POSITIVE", amount: 85500000 },
                { companyId, fiscalYearId: fy24, description: "Pendapatan Bunga Bank Operasional (Final)", correctionType: "NEGATIVE", amount: 312000000 },
            ]
        });
    } catch (e: any) {
        if (e.code !== 'P2021') throw e;
    }

    console.log("✅ [RETAIL] Fiscal corrections done (4 items)");
}
