import { prisma, uuid, d } from "./helpers";

type CoaDef = [string, string, string, string, string, string | null, string | null, boolean, boolean, boolean, number];
// [code,name,type,subType,normalBal,cashFlow,taxMap,isHeader,isBudget,isRE,level]

export async function seedCoA(companyId: string) {
    console.log("📊 Creating CoA...");

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
    await a("1101", "Kas Kecil", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1102", "Bank BCA - IDR", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1103", "Bank Mandiri - IDR", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1104", "Bank BNI - USD", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1100");
    await a("1200", "Piutang", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1201", "Piutang Usaha", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1202", "Piutang Retensi", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1203", "Piutang Karyawan", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1204", "Uang Muka Proyek", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1200");
    await a("1300", "Persediaan", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1301", "Material Bangunan", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1302", "Bahan Bakar & Pelumas", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1303", "Suku Cadang Alat", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1300");
    await a("1400", "Biaya Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1401", "PPN Masukan", "ASSET", "Current Asset", "DEBIT", "OPERATING", "PPN_MASUKAN", false, false, false, 3, "1400");
    await a("1402", "PPh 23 Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", "OPERATING", "PPH_23", false, false, false, 3, "1400");
    await a("1403", "Asuransi Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1400");
    await a("1404", "Sewa Dibayar Dimuka", "ASSET", "Current Asset", "DEBIT", "OPERATING", null, false, false, false, 3, "1400");
    await a("1500", "Aset Tetap", "ASSET", "Non-Current Asset", "DEBIT", null, null, true, false, false, 2, "1000");
    await a("1501", "Tanah", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1502", "Bangunan & Gudang", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1503", "Alat Berat", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1504", "Kendaraan", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1505", "Peralatan Kantor", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1506", "Peralatan Proyek", "ASSET", "Non-Current Asset", "DEBIT", "INVESTING", null, false, false, false, 3, "1500");
    await a("1600", "Akumulasi Penyusutan", "ASSET", "Non-Current Asset", "CREDIT", null, null, true, false, false, 2, "1000");
    await a("1601", "Akum. Peny. Bangunan", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1602", "Akum. Peny. Alat Berat", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1603", "Akum. Peny. Kendaraan", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1604", "Akum. Peny. Peralatan Kantor", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");
    await a("1605", "Akum. Peny. Peralatan Proyek", "ASSET", "Non-Current Asset", "CREDIT", "NON_CASH", null, false, false, false, 3, "1600");

    const l = mk(g2); // Liability
    await l("2000", "LIABILITAS", "LIABILITY", "", "CREDIT", null, null, true, false, false, 1);
    await l("2100", "Hutang Jangka Pendek", "LIABILITY", "Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2101", "Hutang Usaha", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2102", "Hutang Retensi", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2103", "Hutang Subkontraktor", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2104", "PPN Keluaran", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPN_KELUARAN", false, false, false, 3, "2100");
    await l("2105", "Hutang PPh 21", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_21", false, false, false, 3, "2100");
    await l("2106", "Hutang PPh 23", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_23", false, false, false, 3, "2100");
    await l("2107", "Hutang PPh 4(2)", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_4_2", false, false, false, 3, "2100");
    await l("2108", "Hutang PPh Badan", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", "PPH_BADAN", false, false, false, 3, "2100");
    await l("2109", "Biaya YMH Dibayar", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2110", "Uang Muka Pelanggan", "LIABILITY", "Current Liability", "CREDIT", "OPERATING", null, false, false, false, 3, "2100");
    await l("2200", "Hutang Jangka Panjang", "LIABILITY", "Non-Current Liability", "CREDIT", null, null, true, false, false, 2, "2000");
    await l("2201", "Hutang Bank BJB", "LIABILITY", "Non-Current Liability", "CREDIT", "FINANCING", null, false, false, false, 3, "2200");
    await l("2202", "Hutang Sewa Pembiayaan", "LIABILITY", "Non-Current Liability", "CREDIT", "FINANCING", null, false, false, false, 3, "2200");

    const e = mk(g3); // Equity
    await e("3000", "EKUITAS", "EQUITY", "", "CREDIT", null, null, true, false, false, 1);
    await e("3001", "Modal Disetor", "EQUITY", "Equity", "CREDIT", "FINANCING", null, false, false, false, 3, "3000");
    await e("3002", "Laba Ditahan", "EQUITY", "Equity", "CREDIT", null, null, false, false, true, 3, "3000");
    await e("3003", "Laba Tahun Berjalan", "EQUITY", "Equity", "CREDIT", null, null, false, false, false, 3, "3000");

    const r = mk(g4); // Revenue
    await r("4000", "PENDAPATAN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await r("4001", "Pendapatan Proyek Konstruksi", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4002", "Pendapatan Jasa Konsultasi", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4003", "Pendapatan Sewa Alat Berat", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, true, false, 3, "4000");
    await r("4004", "Pendapatan Lain-lain", "REVENUE", "Revenue", "CREDIT", "OPERATING", null, false, false, false, 3, "4000");

    const c = mk(g5); // COGS
    await c("5000", "HARGA POKOK PROYEK", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await c("5001", "Biaya Material Langsung", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5002", "Biaya Tenaga Kerja Langsung", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5003", "Biaya Subkontraktor", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5004", "Biaya Sewa Alat", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5005", "Biaya Overhead Proyek", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5006", "Biaya Mobilisasi/Demobilisasi", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, true, false, 3, "5000");
    await c("5007", "Biaya Izin & Perijinan", "EXPENSE", "COGS", "DEBIT", "OPERATING", null, false, false, false, 3, "5000");

    const o = mk(g6); // OpEx
    await o("6000", "BEBAN OPERASIONAL", "EXPENSE", "", "DEBIT", null, null, true, false, false, 1);
    await o("6001", "Gaji & Tunjangan", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6002", "BPJS Kesehatan & TK", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6003", "Beban Sewa Kantor", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6004", "Beban Listrik, Air, Gas", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6005", "Beban Telepon & Internet", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6006", "Beban ATK & Perlengkapan", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6007", "Beban Penyusutan", "EXPENSE", "Operating Expense", "DEBIT", "NON_CASH", null, false, true, false, 3, "6000");
    await o("6008", "Beban Asuransi", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6009", "Beban Pemeliharaan & Perbaikan", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, true, false, 3, "6000");
    await o("6010", "Beban Perjalanan Dinas", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6011", "Beban Entertaint & Representasi", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6012", "Beban Jasa Profesional", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6013", "Beban Marketing & Tender", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6014", "Beban Administrasi Bank", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");
    await o("6015", "Beban Lain-lain", "EXPENSE", "Operating Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "6000");

    const x = mk(g7); // Other
    await x("7000", "PENDAPATAN & BEBAN LAIN", "REVENUE", "", "CREDIT", null, null, true, false, false, 1);
    await x("7001", "Pendapatan Bunga", "REVENUE", "Other Income", "CREDIT", "OPERATING", null, false, false, false, 3, "7000");
    await x("7002", "Beban Bunga Pinjaman", "EXPENSE", "Other Expense", "DEBIT", "FINANCING", null, false, false, false, 3, "7000");
    await x("7003", "Laba/(Rugi) Selisih Kurs", "REVENUE", "Other Income", "CREDIT", "OPERATING", null, false, false, false, 3, "7000");
    await x("7004", "Pendapatan Denda Keterlambatan", "REVENUE", "Other Income", "CREDIT", "OPERATING", null, false, false, false, 3, "7000");
    await x("7005", "Beban Denda & Penalti", "EXPENSE", "Other Expense", "DEBIT", "OPERATING", null, false, false, false, 3, "7000");

    console.log(`✅ CoA done (${Object.keys(coaIds).length} accounts)`);
    return coaIds;
}

export async function seedBankAccounts(companyId: string, coaIds: Record<string, string>) {
    console.log("🏦 Creating bank accounts...");
    const ba1 = uuid(), ba2 = uuid(), ba3 = uuid();
    await prisma.bankAccount.createMany({
        data: [
            { id: ba1, companyId, coaId: coaIds["1102"], bankName: "Bank BCA", accountNumber: "123-456-7890", accountName: "PT Bangun Jaya Konstruksi", accountHolder: "PT Bangun Jaya Konstruksi", currencyCode: "IDR", openingBalance: 2500000000, openingDate: d(2025, 3, 1), isActive: true },
            { id: ba2, companyId, coaId: coaIds["1103"], bankName: "Bank Mandiri", accountNumber: "987-654-3210", accountName: "PT Bangun Jaya Konstruksi - Payroll", accountHolder: "PT Bangun Jaya Konstruksi", currencyCode: "IDR", openingBalance: 500000000, openingDate: d(2025, 3, 1), isActive: true },
            { id: ba3, companyId, coaId: coaIds["1104"], bankName: "Bank BNI", accountNumber: "555-888-1234", accountName: "PT Bangun Jaya Konstruksi - USD", accountHolder: "PT Bangun Jaya Konstruksi", currencyCode: "USD", openingBalance: 50000, openingDate: d(2025, 3, 1), isActive: true },
        ]
    });
    console.log("✅ Bank accounts done");
    return { ba1, ba2, ba3 };
}

export async function seedFixedAssets(companyId: string, coaIds: Record<string, string>) {
    console.log("🏗️  Creating fixed assets...");
    const assets = [
        { code: "FA-001", name: "Excavator Komatsu PC200", category: "Equipment", date: d(2023, 6, 15), cost: 1800000000, life: 96, coa: "1503", dep: "1602", exp: "6007" },
        { code: "FA-002", name: "Crane Tadano TR-250", category: "Equipment", date: d(2022, 3, 1), cost: 2500000000, life: 120, coa: "1503", dep: "1602", exp: "6007" },
        { code: "FA-003", name: "Dump Truck Hino 500 #1", category: "Vehicle", date: d(2023, 1, 10), cost: 650000000, life: 96, coa: "1504", dep: "1603", exp: "6007" },
        { code: "FA-004", name: "Dump Truck Hino 500 #2", category: "Vehicle", date: d(2023, 8, 20), cost: 650000000, life: 96, coa: "1504", dep: "1603", exp: "6007" },
        { code: "FA-005", name: "Toyota Hilux Double Cab", category: "Vehicle", date: d(2024, 2, 1), cost: 380000000, life: 96, coa: "1504", dep: "1603", exp: "6007" },
        { code: "FA-006", name: "Gedung Kantor Pusat", category: "Building", date: d(2020, 1, 1), cost: 3200000000, life: 240, coa: "1502", dep: "1601", exp: "6007" },
        { code: "FA-007", name: "Peralatan Kantor Set", category: "Computer", date: d(2024, 1, 1), cost: 120000000, life: 48, coa: "1505", dep: "1604", exp: "6007" },
        { code: "FA-008", name: "Scaffolding & Formwork Set", category: "Equipment", date: d(2023, 4, 1), cost: 450000000, life: 60, coa: "1506", dep: "1605", exp: "6007" },
    ];
    for (const a of assets) {
        // Calculate accumulated depreciation up to Feb 2025
        const monthsUsed = Math.floor((d(2025, 3, 1).getTime() - a.date.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
        const monthlyDep = (a.cost) / a.life;
        const accDep = Math.min(Math.round(monthlyDep * monthsUsed), a.cost);
        await (prisma as any).fixedAsset.create({
            data: {
                companyId, assetCode: a.code, assetName: a.name, category: a.category,
                acquisitionDate: a.date, acquisitionCost: a.cost, usefulLifeMonths: a.life,
                depreciationMethod: "STRAIGHT_LINE", salvageValue: 0,
                accumulatedDepreciation: accDep, bookValue: a.cost - accDep,
                coaAssetId: coaIds[a.coa], coaAccumDepId: coaIds[a.dep], coaDepExpenseId: coaIds[a.exp],
            }
        });
    }
    console.log("✅ Fixed assets done (8 assets)");
}
