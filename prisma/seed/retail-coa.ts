import { prisma, uuid, d } from "./helpers";

type CoaDef = [string, string, string, string, string, string | null, string | null, boolean, boolean, boolean, number];
// [code,name,type,subType,normalBal,cashFlow,taxMap,isHeader,isBudget,isRE,level]

export async function seedRetailCoA(companyId: string) {
    console.log("📊 [RETAIL] Creating CoA...");

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
    await a("1101", "Kas Gerai (Petty Cash)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1102", "Bank BCA - Operasional", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1103", "Bank Mandiri - Payroll", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1104", "Kas Dalam Perjalanan (EDC/Qris)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");

    await a("1200", "Piutang", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1201", "Piutang E-Commerce (Shopee/Tokped)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1202", "Piutang Konsinyasi B2B", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1203", "Piutang Karyawan", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");

    await a("1300", "Persediaan", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1301", "Persediaan Barang Dagangan (Gudang Pusat)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1302", "Persediaan Barang Dagangan (Store)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1303", "Persediaan Barang Promosi / Gimmick", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1304", "Persediaan Supplies & Packaging", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");

    await a("1400", "Biaya Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1401", "PPN Masukan", "ASSET", "Current Asset", "DEBIT", "OPERATING", "PPN_MASUKAN", false, false, false, 3, "1400");
    await a("1402", "Sewa Ruang Toko Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1400");
    await a("1403", "Uang Muka Pembelian (DP Supplier)", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1400");

    await a("1500", "Aset Tetap", "ASSET", "Non-Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1501", "Tanah Bangunan (HQ)", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1502", "Gedung (HQ & Gudang)", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1503", "Interior & Fit-Out Toko", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1504", "Peralatan Toko (Rak, Display, Showcase)", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1505", "Kendaraan Operasional (Delivery)", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1506", "Sistem Mesin POS / IT", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");

    await a("1600", "Akumulasi Penyusutan", "ASSET", "Non-Current Asset", "CREDIT", null, null, true, false, false, 2, "1000");
    await a("1601", "Akum. Peny. Gedung", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1602", "Akum. Peny. Fit-Out Toko", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1603", "Akum. Peny. Peralatan Toko", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1604", "Akum. Peny. Kendaraan", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1605", "Akum. Peny. Sistem/POS", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");

    const l = mk(g2); // Liability
    await l("2000", "LIABILITAS", "LIABILITY", "", "CREDIT", null, null, true, false, false, 1);
    await l("2100", "Hutang Jangka Pendek", "LIABILITY", "Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2101", "Hutang Dagang (Vendor Principal)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2102", "Hutang Supplier Non-Trade (Packaging dsb)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2104", "PPN Keluaran", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2105", "Hutang Konsinyasi", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2106", "Hutang PPh 21", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_21", false, false, false, 3, "2100");
    await l("2110", "Program Loyalty (Poin / Voucher Deposit)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");

    await l("2200", "Hutang Jangka Panjang", "LIABILITY", "Non-Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2201", "Hutang Bank (Investasi Buka Gerai)", "LIABILITY", "Non-Current Liability", "CREDIT", "FINANCING", null, false, false, false, 3, "2200");

    const e = mk(g3); // Equity
    await e("3000", "EKUITAS", "EQUITY", "", "CREDIT", null, null, true, false, false, 1);
    await e("3001", "Modal Disetor", "EQUITY", "Equity", "CREDIT", "FINANCING", null, false, false, false, 3, "3000");
    await e("3002", "Laba Ditahan", "EQUITY", "Equity", "CREDIT", null, null, false, false, true, 3, "3000");
    await e("3003", "Laba Tahun Berjalan", "EQUITY", "Equity", "CREDIT", null, null, false, false, false, 3, "3000");

    const r = mk(g4); // Revenue
    await r("4000", "PENDAPATAN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await r("4001", "Penjualan Ritel POS (Offline Store)", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4002", "Penjualan E-Commerce (Shopee dll)", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4003", "Penjualan B2B / Korporasi", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4004", "Retur Penjualan (Sales Return)", "REVENUE", "Revenue", "DEBIT", "OPERATING", null, false, true, false, 3, "4000");  // Contra revenue
    await r("4005", "Diskon Penjualan POS", "REVENUE", "Revenue", "DEBIT", "OPERATING", null, false, true, false, 3, "4000"); // Contra revenue
    await r("4006", "Fee Konsinyasi (Konsinyi)", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, false, false, 3, "4000");

    const c = mk(g5); // COGS
    await c("5000", "HARGA POKOK PENJUALAN", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await c("5001", "HPP Barang Dagangan (Offline)", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5002", "HPP Barang Dagangan (Online/E-Comm)", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5003", "HPP B2B Corp", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5004", "Biaya Pengemasan & Plastik Belanja", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5005", "Shrinkage / Kehilangan Barang", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");

    const o = mk(g6); // OpEx
    await o("6000", "BEBAN OPERASIONAL", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await o("6001", "Gaji & Upah Karyawan Toko", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6002", "Gaji & Upah Karyawan Pusat/Gudang", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6003", "BPJS & Tunjangan", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6004", "Beban Sewa Ruang Gerai / Toko", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6005", "Beban Energi Toko (Listrik, Air)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6006", "Platform/Marketplace Fees", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6007", "Marketing, Ads & Endorsements", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6008", "Beban Logistik & Kurir (Ongkir)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6009", "Beban Penyusutan Aset", "EXPENSE", "Operating Expense", "DEBIT", "NON_CASH", null, false, true, false, 3, "6000");
    await o("6012", "Professional Fees (Audit, Konsultan)", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6014", "Beban Kartu Kredit / MDR EDC", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6015", "Beban Stationery Toko & ATK", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");

    const x = mk(g7); // Other
    await x("7000", "PENDAPATAN & BEBAN LAIN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await x("7001", "Pendapatan Bunga Bank", "REVENUE", "Other Income", "CREDIT", "OPERATING", null, false, false, false, 3, "7000");
    await x("7002", "Beban Bunga Pinjaman Bank", "EXPENSE", "Other Expense", "DEBIT", "FINANCING", null, false, true, false, 3, "7000");
    await x("7003", "Laba/Rugi Selisih Cek Fisik Gudang", "EXPENSE", "Other Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "7000");

    console.log(`✅ [RETAIL] CoA done (${Object.keys(coaIds).length} accounts)`);
    return coaIds;
}

export async function seedRetailBankAccounts(companyId: string, coaIds: Record<string, string>) {
    console.log("🏦 [RETAIL] Creating bank accounts...");
    const ba1 = uuid(), ba2 = uuid(), ba3 = uuid();
    await prisma.bankAccount.createMany({
        data: [
            { id: ba1, companyId, coaId: coaIds["1102"], bankName: "Bank BCA", accountNumber: "345-000-8888", accountName: "PT Dani Retail Garuda (Ops)", accountHolder: "PT Dani Retail Garuda", currencyCode: "IDR", openingBalance: 1500000000, openingDate: d(2024, 1, 1), isActive: true },
            { id: ba2, companyId, coaId: coaIds["1103"], bankName: "Bank Mandiri", accountNumber: "112-000-7777", accountName: "PT Dani Retail Garuda (Payroll)", accountHolder: "PT Dani Retail Garuda", currencyCode: "IDR", openingBalance: 750000000, openingDate: d(2024, 1, 1), isActive: true },
            { id: ba3, companyId, coaId: coaIds["1104"], bankName: "Bank EDC Holding", accountNumber: "555-000-9999", accountName: "EDC/Qris Settlement Holding", accountHolder: "PT Dani Retail Garuda", currencyCode: "IDR", openingBalance: 300000000, openingDate: d(2024, 1, 1), isActive: true },
        ]
    });
    console.log("✅ [RETAIL] Bank accounts done");
    return { ba1, ba2, ba3 };
}

export async function seedRetailFixedAssets(companyId: string, coaIds: Record<string, string>) {
    console.log("🏗️  [RETAIL] Creating fixed assets...");
    const assets = [
        { code: "FA-RTL-01", name: "Gudang Utama & HQ Building", category: "Building", date: d(2023, 1, 1), cost: 12000000000, life: 240, coa: "1502", dep: "1601", exp: "6009" },
        { code: "FA-RTL-02", name: "Fit-Out Store Sudirman", category: "Interior", date: d(2023, 5, 1), cost: 850000000, life: 60, coa: "1503", dep: "1602", exp: "6009" },
        { code: "FA-RTL-03", name: "Display Racks & Showcases (All Stores)", category: "Equipment", date: d(2023, 4, 1), cost: 1500000000, life: 120, coa: "1504", dep: "1603", exp: "6009" },
        { code: "FA-RTL-04", name: "Fleet Delivery Trucks (3 Units)", category: "Vehicle", date: d(2023, 2, 10), cost: 1350000000, life: 60, coa: "1505", dep: "1604", exp: "6009" },
        { code: "FA-RTL-05", name: "POS Systems & Warehouse Management IT", category: "Computer", date: d(2023, 1, 1), cost: 450000000, life: 48, coa: "1506", dep: "1605", exp: "6009" },
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
    console.log("✅ [RETAIL] Fixed assets done");
}
