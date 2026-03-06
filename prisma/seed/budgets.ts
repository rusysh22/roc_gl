import { prisma, uuid } from "./helpers";

export async function seedBudgets(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId3: string,
    fy25: string, fy26: string, fy27: string
) {
    console.log("💰 Creating budgets...");

    // Budget lines: coaCode -> [p1..p12] monthly amounts
    const budgetLines: Record<string, number[]> = {
        "4001": [2500, 3000, 3500, 3000, 3500, 4000, 3500, 4000, 4500, 4000, 3500, 3000].map(v => v * 1000000),
        "4002": [100, 100, 150, 100, 150, 100, 150, 100, 200, 150, 100, 100].map(v => v * 1000000),
        "4003": [50, 80, 80, 100, 100, 120, 100, 80, 80, 60, 50, 50].map(v => v * 1000000),
        "5001": [800, 900, 1000, 900, 1000, 1200, 1000, 1200, 1400, 1200, 1000, 800].map(v => v * 1000000),
        "5002": [400, 450, 500, 450, 500, 550, 500, 550, 600, 550, 500, 400].map(v => v * 1000000),
        "5003": [300, 350, 400, 350, 400, 450, 400, 450, 500, 450, 400, 300].map(v => v * 1000000),
        "5004": [100, 120, 150, 120, 150, 180, 150, 180, 200, 180, 150, 100].map(v => v * 1000000),
        "5005": [80, 90, 100, 90, 100, 110, 100, 110, 120, 110, 100, 80].map(v => v * 1000000),
        "5006": [50, 0, 50, 0, 50, 0, 50, 0, 50, 0, 50, 0].map(v => v * 1000000),
        "6001": [180, 180, 185, 185, 190, 190, 195, 195, 200, 200, 200, 205].map(v => v * 1000000),
        "6002": [22, 22, 23, 23, 24, 24, 24, 25, 25, 25, 25, 26].map(v => v * 1000000),
        "6003": [35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35, 35].map(v => v * 1000000),
        "6004": [8, 8, 9, 9, 9, 10, 10, 9, 9, 8, 8, 8].map(v => v * 1000000),
        "6005": [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5].map(v => v * 1000000),
        "6007": [85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85].map(v => v * 1000000),
        "6008": [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6].map(v => v * 1000000),
        "6009": [15, 15, 20, 15, 20, 25, 20, 25, 20, 15, 15, 15].map(v => v * 1000000),
    };

    const createBudget = async (fyId: string, fyName: string, status: string, ver: string, isDefault: boolean, approver?: string) => {
        const budgetId = uuid();
        await (prisma as any).budget.create({
            data: {
                id: budgetId, companyId, fiscalYearId: fyId,
                budgetName: `Budget ${fyName}`, version: ver, status,
                isDefault, createdBy: userId1,
                approvedBy: approver || null,
                approvedAt: approver ? new Date() : null,
            }
        });

        for (const [coaCode, amounts] of Object.entries(budgetLines)) {
            if (!coaIds[coaCode]) continue;
            const totalAnnual = amounts.reduce((a: number, b: number) => a + b, 0);
            // Apply growth factor for future years
            const growth = fyName === "FY2026" ? 1.08 : fyName === "FY2027" ? 1.15 : 1;
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
        }
    };

    await createBudget(fy25, "FY2025", "APPROVED", "1", true, userId3);
    await createBudget(fy26, "FY2026", "APPROVED", "1", true, userId3);
    await createBudget(fy27, "FY2027", "DRAFT", "1", true);

    console.log("✅ Budgets done (3 budgets, ~51 detail lines each)");
}

export async function seedFiscalCorrections(companyId: string, fy25: string) {
    console.log("📋 Creating fiscal corrections...");

    await (prisma as any).fiscalCorrection.createMany({
        data: [
            { companyId, fiscalYearId: fy25, description: "Beban entertainment tanpa daftar nominatif", correctionType: "POSITIVE", amount: 45000000 },
            { companyId, fiscalYearId: fy25, description: "Sumbangan non-deductible (CSR)", correctionType: "POSITIVE", amount: 25000000 },
            { companyId, fiscalYearId: fy25, description: "Selisih penyusutan fiskal vs komersial", correctionType: "POSITIVE", amount: 18500000 },
            { companyId, fiscalYearId: fy25, description: "Pendapatan bunga deposito (PPh Final)", correctionType: "NEGATIVE", amount: 32000000 },
        ]
    });

    console.log("✅ Fiscal corrections done (4 items)");
}
