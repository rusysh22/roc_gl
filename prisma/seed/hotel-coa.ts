import { prisma, uuid, d } from "./helpers";

type CoaDef = [string, string, string, string, string, string | null, string | null, boolean, boolean, boolean, number];
// [code,name,type,subType,normalBal,cashFlow,taxMap,isHeader,isBudget,isRE,level]

export async function seedHotelCoA(companyId: string) {
    console.log("📊 [HOTEL] Creating CoA...");

    // CoA Groups
    const grp = async (code: string, name: string, type: string, sort: number) => {
        const id = uuid();
        await prisma.coaGroup.create({ data: { id, companyId, code, name, accountType: type, sortOrder: sort } });
        return id;
    };
    const g1 = await grp("1", "Aset", "ASSET", 1);
    const g2 = await grp("2", "Liabilitas", "LIABILITY", 2);
    const g3 = await grp("3", "Ekuitas", "EQUITY", 3);
    const g4 = await grp("4", "Pendapatan", "REVENUE", 4);
    const g5 = await grp("5", "Harga Pokok", "EXPENSE", 5);
    const g6 = await grp("6", "Beban Operasional", "EXPENSE", 6);
    const g7 = await grp("7", "Pendapatan & Beban Lain", "REVENUE", 7);

    const coaIds: Record<string, string> = {};
    const mk = (gId: string) => async (c: string, n: string, t: string, st: string, nb: string, cf: string | null, tm: string | null, hdr: boolean, bud: boolean, re: boolean, lvl: number, parent?: string) => {
        const id = uuid(); coaIds[c] = id;
        await (prisma as any).chartOfAccount.create({
            data: {
                id, companyId, coaGroupId: gId, parentCoaId: parent ? coaIds[parent] : null, code: c, name: n,
                accountType: t, accountSubType: st || null, normalBalance: nb,
                cashFlowCategory: cf, taxMappingCode: tm, isHeader: hdr,
                isBudgetApplicable: bud, isRetainedEarnings: re, level: lvl, sortOrder: parseInt(c),
            }
        });
    };

    const a = mk(g1); // Asset
    await a("1000", "ASET", "ASSET", "", "DEBIT", null, null, true, false, false, 1);
    await a("1100", "Kas & Bank", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1101", "Kas Pemegang Kasir", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1102", "Bank BCA - IDR", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1103", "Bank Mandiri - IDR", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1104", "Bank CC (EDC Settlement)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");

    await a("1200", "Piutang", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1201", "Piutang Tamu (Guest Ledger)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1202", "Piutang Travel Agent", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1203", "Piutang OTA (Traveloka, Agoda)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");

    await a("1300", "Persediaan", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1301", "Persediaan F&B - Makanan", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1302", "Persediaan F&B - Minuman", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1303", "Persediaan Guest Supplies (Amenities)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1304", "Persediaan Cleaning Supplies", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");

    await a("1400", "Biaya Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1401", "PPN Masukan", "ASSET", "Current Asset", "DEBIT", "OPERATING", "PPN_MASUKAN", false, false, false, 3, "1400");
    await a("1403", "Asuransi Properti Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1400");

    await a("1500", "Aset Tetap", "ASSET", "Non-Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1501", "Tanah Hotel", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1502", "Bangunan Hotel", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1503", "Interior & Furniture", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1504", "Kitchen Equipment", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1505", "Kendaraan Operasional", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1506", "Sistem IT & Komputer", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");

    await a("1600", "Akumulasi Penyusutan", "ASSET", "Non-Current Asset", "CREDIT", null, null, true, false, false, 2, "1000");
    await a("1601", "Akum. Peny. Bangunan", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1602", "Akum. Peny. Interior", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1603", "Akum. Peny. Kitchen Equip", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1604", "Akum. Peny. Kendaraan", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1605", "Akum. Peny. Sistem IT", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");

    const l = mk(g2); // Liability
    await l("2000", "LIABILITAS", "LIABILITY", "", "CREDIT", null, null, true, false, false, 1);
    await l("2100", "Hutang Jangka Pendek", "LIABILITY", "Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2101", "Hutang Supplier F&B", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2102", "Hutang Supplier Amenities", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2104", "Pajak Pembangunan 1 (PB1)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PB1", false, false, false, 3, "2100");
    await l("2105", "Service Charge Payable", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "SERVICE_CHARGE", false, false, false, 3, "2100");
    await l("2106", "Hutang PPh 21", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_21", false, false, false, 3, "2100");
    await l("2110", "Deposit Reservasi Tamu (Advance Dep)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");

    await l("2200", "Hutang Jangka Panjang", "LIABILITY", "Non-Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2201", "Hutang Bank (Investasi Hotel)", "LIABILITY", "Non-Current Liability", "CREDIT", "FINANCING", null, false, false, false, 3, "2200");

    const e = mk(g3); // Equity
    await e("3000", "EKUITAS", "EQUITY", "", "CREDIT", null, null, true, false, false, 1);
    await e("3001", "Modal Disetor", "EQUITY", "Equity", "CREDIT", "FINANCING", null, false, false, false, 3, "3000");
    await e("3002", "Laba Ditahan", "EQUITY", "Equity", "CREDIT", null, null, false, false, true, 3, "3000");
    await e("3003", "Laba Tahun Berjalan", "EQUITY", "Equity", "CREDIT", null, null, false, false, false, 3, "3000");

    const r = mk(g4); // Revenue
    await r("4000", "PENDAPATAN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await r("4001", "Room Revenue", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4002", "Food & Beverage Revenue", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4003", "Banquet & Meeting Revenue", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4004", "Spa & Wellness Revenue", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4005", "Laundry Revenue (Guest)", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4006", "Other Operating Revenue", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, false, false, 3, "4000");

    const c = mk(g5); // COGS
    await c("5000", "HARGA POKOK PENJUALAN", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await c("5001", "COGS F&B - Food", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5002", "COGS F&B - Beverage", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5003", "COGS Spa Products", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5004", "Room Supplies & Amenities Exp", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5005", "Laundry Supplies & Outsourcing", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");

    const o = mk(g6); // OpEx
    await o("6000", "BEBAN OPERASIONAL", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await o("6001", "Gaji & Upah (Payroll)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6002", "BPJS & Tunjangan", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6004", "Beban Energi (Listrik, Air, Gas)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6005", "OTA Commissions", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6006", "Marketing, Ads & Promo", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6007", "Beban Penyusutan", "EXPENSE", "Operating Expense", "DEBIT", "NON_CASH", null, false, true, false, 3, "6000");
    await o("6008", "Beban Asuransi", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6009", "Property Maintenance & Repairs", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6012", "Professional Fees (Audit, Legal)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6014", "Beban Kartu Kredit (MDR)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6015", "Beban Operasional Lainnya", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");

    const x = mk(g7); // Other
    await x("7000", "PENDAPATAN & BEBAN LAIN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await x("7001", "Pendapatan Bunga Bank", "REVENUE", "Other Income", "CREDIT", "OPERATING", null, false, false, false, 3, "7000");
    await x("7002", "Beban Bunga Pinjaman Bank", "EXPENSE", "Other Expense", "DEBIT", "FINANCING", null, false, true, false, 3, "7000");

    console.log(`✅ [HOTEL] CoA done (${Object.keys(coaIds).length} accounts)`);
    return coaIds;
}

export async function seedHotelBankAccounts(companyId: string, coaIds: Record<string, string>) {
    console.log("🏦 [HOTEL] Creating bank accounts...");
    const ba1 = uuid(), ba2 = uuid(), ba3 = uuid();
    await prisma.bankAccount.createMany({
        data: [
            { id: ba1, companyId, coaId: coaIds["1102"], bankName: "Bank BCA", accountNumber: "123-000-1111", accountName: "PT Graha Dani Nusantara (Ops)", accountHolder: "PT Graha Dani Nusantara", currencyCode: "IDR", openingBalance: 800000000, openingDate: d(2024, 1, 1), isActive: true },
            { id: ba2, companyId, coaId: coaIds["1103"], bankName: "Bank Mandiri", accountNumber: "987-000-2222", accountName: "PT Graha Dani Nusantara (Payroll)", accountHolder: "PT Graha Dani Nusantara", currencyCode: "IDR", openingBalance: 350000000, openingDate: d(2024, 1, 1), isActive: true },
            { id: ba3, companyId, coaId: coaIds["1104"], bankName: "Bank EDC Settlement", accountNumber: "555-000-3333", accountName: "EDC Settlement BCA/Mandiri", accountHolder: "PT Graha Dani Nusantara", currencyCode: "IDR", openingBalance: 150000000, openingDate: d(2024, 1, 1), isActive: true },
        ]
    });
    console.log("✅ [HOTEL] Bank accounts done");
    return { ba1, ba2, ba3 };
}

export async function seedHotelFixedAssets(companyId: string, coaIds: Record<string, string>) {
    console.log("🏗️  [HOTEL] Creating fixed assets...");
    const assets = [
        { code: "FA-HTL-01", name: "Gedung Hotel & Resort", category: "Building", date: d(2022, 1, 1), cost: 15000000000, life: 240, coa: "1502", dep: "1601", exp: "6007" },
        { code: "FA-HTL-02", name: "Interior Lobby & Kamar", category: "Interior", date: d(2022, 5, 1), cost: 3500000000, life: 60, coa: "1503", dep: "1602", exp: "6007" },
        { code: "FA-HTL-03", name: "Heavy Kitchen Equipment Set", category: "Equipment", date: d(2022, 4, 1), cost: 1200000000, life: 120, coa: "1504", dep: "1603", exp: "6007" },
        { code: "FA-HTL-04", name: "Shuttle Bus Hiace", category: "Vehicle", date: d(2023, 2, 10), cost: 550000000, life: 60, coa: "1505", dep: "1604", exp: "6007" },
        { code: "FA-HTL-05", name: "Server & PMS System", category: "Computer", date: d(2023, 1, 1), cost: 250000000, life: 48, coa: "1506", dep: "1605", exp: "6007" },
    ];
    for (const a of assets) {
        const monthsUsed = Math.floor((d(2024, 1, 1).getTime() - a.date.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        const monthlyDep = (a.cost) / a.life;
        const accDep = Math.min(Math.round(monthlyDep * Math.max(0, monthsUsed)), a.cost);
        try {
            await (prisma as any).fixedAsset.create({
                data: {
                    companyId, assetCode: a.code, assetName: a.name, category: a.category,
                    acquisitionDate: a.date, acquisitionCost: a.cost, usefulLifeMonths: a.life,
                    depreciationMethod: "STRAIGHT_LINE", salvageValue: 0,
                    accumulatedDepreciation: accDep, bookValue: a.cost - accDep,
                    coaAssetId: coaIds[a.coa], coaAccumDepId: coaIds[a.dep], coaDepExpenseId: coaIds[a.exp],
                }
            });
        } catch (e: any) {
            if (e.code !== 'P2021') throw e;
        }
    }
    console.log("✅ [HOTEL] Fixed assets done");
}
