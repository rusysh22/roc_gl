import { prisma, uuid } from "./helpers";

export async function seedHotelBudgets(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId3: string,
    fy24: string, fy25: string, fy26: string, fy27: string
) {
    console.log("💰 [HOTEL] Creating budgets...");

    // Budget lines: coaCode -> [p1..p12] monthly amounts (in millions, then mapped to actuals)
    const budgetLines: Record<string, number[]> = {
        // Revenues (Rooms, F&B, Banquet, Spa)
        "4001": [3500, 3200, 3600, 3800, 4200, 4800, 5200, 5000, 4000, 4500, 4800, 6000].map(v => v * 1000000), // Room
        "4002": [1200, 1100, 1250, 1300, 1400, 1600, 1800, 1750, 1350, 1500, 1650, 2200].map(v => v * 1000000), // F&B
        "4003": [800, 850, 900, 800, 850, 900, 950, 1000, 1100, 1200, 1150, 1300].map(v => v * 1000000), // Banquet
        "4004": [150, 140, 160, 180, 200, 250, 300, 280, 180, 220, 240, 350].map(v => v * 1000000), // Spa
        // COGS
        "5001": [400, 380, 420, 450, 480, 550, 600, 580, 460, 520, 550, 750].map(v => v * 1000000),
        "5002": [200, 190, 210, 220, 240, 280, 300, 290, 230, 260, 280, 380].map(v => v * 1000000),
        "5004": [180, 160, 180, 190, 210, 240, 260, 250, 200, 225, 240, 300].map(v => v * 1000000),
        // OPEX
        "6001": [850, 850, 850, 850, 850, 950, 950, 950, 950, 950, 950, 1200].map(v => v * 1000000), // Payroll + THR
        "6004": [300, 280, 310, 320, 340, 380, 410, 400, 330, 350, 370, 450].map(v => v * 1000000), // Energy
        "6005": [450, 410, 470, 500, 550, 650, 700, 680, 520, 580, 620, 800].map(v => v * 1000000), // OTA Comm
        "6006": [150, 150, 150, 150, 150, 200, 200, 200, 150, 200, 250, 300].map(v => v * 1000000), // Marketing
        "6009": [100, 100, 150, 100, 150, 100, 150, 100, 150, 100, 150, 100].map(v => v * 1000000), // Maintenance
    };

    const createBudget = async (fyId: string, fyName: string, status: string, ver: string, isDefault: boolean, approver?: string) => {
        const budgetId = uuid();
        try {
            await (prisma as any).budget.create({
                data: {
                    id: budgetId, companyId, fiscalYearId: fyId,
                    budgetName: `Hotel Operational Budget ${fyName}`, version: ver, status,
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

            // Apply growth factor based on year
            let growth = 1.0;
            if (fyName === "FY2025") growth = 1.15;
            if (fyName === "FY2026") growth = 1.30;
            if (fyName === "FY2027") growth = 1.45;

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

    console.log("✅ [HOTEL] Budgets done (4 budgets for 2024-2027)");
}

export async function seedHotelFiscalCorrections(companyId: string, fy24: string) {
    console.log("📋 [HOTEL] Creating fiscal corrections for FY2024...");

    try {
        await (prisma as any).fiscalCorrection.createMany({
            data: [
                { companyId, fiscalYearId: fy24, description: "Koreksi Positif Biaya Entertainment (tanpa daftar nominatif)", correctionType: "POSITIVE", amount: 125000000 },
                { companyId, fiscalYearId: fy24, description: "Sumbangan Banjar & Desa Adat (Non-Deductible)", correctionType: "POSITIVE", amount: 85000000 },
                { companyId, fiscalYearId: fy24, description: "Selisih Penyusutan Fiskal Bangunan Hotel vs Komersial", correctionType: "POSITIVE", amount: 45500000 },
                { companyId, fiscalYearId: fy24, description: "Pendapatan Bunga Deposito (Dikenakan PPh Final)", correctionType: "NEGATIVE", amount: 112000000 },
            ]
        });
    } catch (e: any) {
        if (e.code !== 'P2021') throw e;
    }

    console.log("✅ [HOTEL] Fiscal corrections done (4 items)");
}
