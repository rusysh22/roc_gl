import { prisma, uuid, d } from "./helpers";

type JLine = { coaCode: string; desc: string; dr: number; cr: number; deptId?: string };
type JDef = { num: string; type: string; date: Date; desc: string; periodId: string; fyId: string; tags?: string[]; lines: JLine[]; userId: string; status?: string };

let jCounter = 0;
function jNum(prefix: string) { jCounter++; return `${prefix}-${String(jCounter).padStart(6, "0")}`; }

async function createJournal(j: JDef, companyId: string, coaIds: Record<string, string>) {
    const totalDr = j.lines.reduce((s, l) => s + l.dr, 0);
    const totalCr = j.lines.reduce((s, l) => s + l.cr, 0);
    const jId = uuid();
    const status = j.status || "POSTED";
    await prisma.journal.create({
        data: {
            id: jId, companyId, journalNumber: j.num, journalType: j.type,
            journalDate: j.date, postingDate: j.date, periodId: j.periodId, fiscalYearId: j.fyId,
            description: j.desc, totalDebit: totalDr, totalCredit: totalCr,
            status, createdBy: j.userId,
            postedBy: status === "POSTED" ? j.userId : null,
            postedAt: status === "POSTED" ? j.date : null,
            tags: j.tags ? JSON.stringify(j.tags) : "[]",
        }
    });
    for (let i = 0; i < j.lines.length; i++) {
        const l = j.lines[i];
        if (!coaIds[l.coaCode]) {
            console.error(`COA CODE NOT FOUND: ${l.coaCode} for retail`);
            throw new Error(`COA CODE NOT FOUND: ${l.coaCode}`);
        }
        await prisma.journalLine.create({
            data: {
                journalId: jId, companyId, lineNumber: i + 1,
                coaId: coaIds[l.coaCode], description: l.desc,
                debitAmount: l.dr, creditAmount: l.cr,
                departmentId: l.deptId || null,
            }
        });
    }
    return jId;
}

export async function seedRetailJournals(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId2: string,
    periodIds: Record<string, string>,
    fy24: string, fy25: string, fy26: string,
    deptStore: string, deptMD: string, deptLOG: string, deptMKT: string, deptFin: string
) {
    console.log("📝 [RETAIL] Creating journals (Daily & Monthly for 2024-2026)...");
    jCounter = 0;

    // ============ OPENING BALANCE (Jan 1, 2024) ============
    const pJan24 = periodIds["2024-01"];
    await createJournal({
        num: jNum("OB"), type: "GJ", date: d(2024, 1, 1), fyId: fy24, periodId: pJan24,
        desc: "Opening Balance — Migrasi Sistem Retail Awal 2024", userId: userId1, tags: ["opening-balance"],
        lines: [
            // Assets
            { coaCode: "1101", desc: "Kas Gerai (Petty Cash)", dr: 75000000, cr: 0 },
            { coaCode: "1102", desc: "Saldo Bank BCA Ops", dr: 3500000000, cr: 0 },
            { coaCode: "1103", desc: "Saldo Bank Mandiri Payroll", dr: 1500000000, cr: 0 },
            { coaCode: "1104", desc: "Kas Dalam Perjalanan EDC", dr: 450000000, cr: 0 },

            { coaCode: "1201", desc: "Piutang E-Commerce", dr: 850000000, cr: 0 },
            { coaCode: "1202", desc: "Piutang B2B", dr: 1250000000, cr: 0 },

            { coaCode: "1301", desc: "Inventory Gudang Pusat", dr: 4500000000, cr: 0 },
            { coaCode: "1302", desc: "Inventory Toko", dr: 2200000000, cr: 0 },
            { coaCode: "1304", desc: "Inventory Packaging", dr: 250000000, cr: 0 },

            { coaCode: "1501", desc: "Tanah & Bangunan HQ", dr: 12000000000, cr: 0 },
            { coaCode: "1502", desc: "Gedung & Gudang", dr: 8000000000, cr: 0 },
            { coaCode: "1503", desc: "Interior Toko", dr: 3500000000, cr: 0 },
            { coaCode: "1504", desc: "Peralatan & Showcase", dr: 2500000000, cr: 0 },

            // Accumulated Depreciation (contra)
            { coaCode: "1601", desc: "Akum Peny Gedung", dr: 0, cr: 1500000000 },
            { coaCode: "1602", desc: "Akum Peny Interior", dr: 0, cr: 850000000 },
            { coaCode: "1603", desc: "Akum Peny Peralatan", dr: 0, cr: 1200000000 },

            // Liabilities
            { coaCode: "2101", desc: "Hutang Dagang Vendor", dr: 0, cr: 3250000000 },
            { coaCode: "2110", desc: "Program Point Loyalty", dr: 0, cr: 150000000 },
            { coaCode: "2201", desc: "Hutang Bank (Ekspansi)", dr: 0, cr: 15000000000 },

            // Equity
            { coaCode: "3001", desc: "Modal Disetor", dr: 0, cr: 15000000000 },
            { coaCode: "3002", desc: "Laba Ditahan", dr: 0, cr: 3625000000 }, // Plug
        ]
    }, companyId, coaIds);

    // ============ MONTHLY & DAILY JOURNALS (Jan 2024 - Dec 2026) ============
    const months: { y: number; m: number; fyId: string }[] = [];
    for (let y = 2024; y <= 2026; y++) {
        const _fy = y === 2024 ? fy24 : y === 2025 ? fy25 : fy26;
        for (let m = 1; m <= 12; m++) {
            if (y === 2026 && m > 3) continue; // Only up to Mar 2026 to mirror reality
            months.push({ y, m, fyId: _fy });
        }
    }

    // Daily Generator Loop
    for (const mo of months) {
        const pk = `${mo.y}-${String(mo.m).padStart(2, "0")}`;
        const pid = periodIds[pk];
        if (!pid) continue;

        const maxDays = new Date(mo.y, mo.m, 0).getDate();

        let monthOfflineRev = 0;
        let monthOnlineRev = 0;
        let monthB2BRev = 0;

        // Daily Point Of Sales (Revenues)
        // Simulated weekly sweeps for performance instead of 30 daily journals * 36 months = 1000s of journals
        for (let week = 1; week <= 4; week++) {
            const dDate = d(mo.y, mo.m, week * 7 > maxDays ? maxDays : week * 7);

            // Retail Seasonality multipliers (Ramadhan/Lebaran peaks, Year end Peaks)
            let seasonality = 1.0;
            if (mo.m === 3 || mo.m === 4) seasonality = 1.6; // Ramadhan bump
            if (mo.m === 11 || mo.m === 12) seasonality = 1.5; // End of year, 11.11, 12.12
            const growthBase = mo.y === 2024 ? 1 : mo.y === 2025 ? 1.25 : 1.5;

            const baseOffline = (1500000000 + Math.random() * 500000000) * seasonality * growthBase;
            const baseOnline = (800000000 + Math.random() * 300000000) * seasonality * growthBase;
            const baseB2B = (200000000 + Math.random() * 100000000) * seasonality * growthBase;

            monthOfflineRev += baseOffline;
            monthOnlineRev += baseOnline;
            monthB2BRev += baseB2B;

            const ppnOff = baseOffline * 0.11;
            const offlineGross = baseOffline + ppnOff;

            // Offline Payment Split (Cash vs EDC/Qris)
            const viaEdcOnline = offlineGross * 0.75;
            const viaCashOff = offlineGross * 0.25;

            // Online Payment (Shopee/Tokped Receivable)
            const ppnOnl = baseOnline * 0.11;
            const onlineGross = baseOnline + ppnOnl;

            // B2B Payment (Invoiced)
            const ppnB2B = baseB2B * 0.11;
            const b2bGross = baseB2B + ppnB2B;

            // 1. Offline Revenue (POS Integration sweep)
            await createJournal({
                num: jNum("SJ"), type: "SJ", date: dDate, fyId: mo.fyId, periodId: pid,
                desc: `Penjualan Kasir Offline Gabungan Mingguan W${week} ${pk}`, userId: userId2, tags: ["revenue", "offline-pos"],
                lines: [
                    { coaCode: "1104", desc: "Setoran EDC & Qris Terminal", dr: viaEdcOnline, cr: 0 },
                    { coaCode: "1101", desc: "Kas Tunai Toko", dr: viaCashOff, cr: 0 },
                    { coaCode: "4001", desc: "Penjualan Offline", dr: 0, cr: baseOffline, deptId: deptStore },
                    { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppnOff },
                ]
            }, companyId, coaIds);

            // 2. Online Revenue (E-commerce Integration sweep)
            await createJournal({
                num: jNum("SJ"), type: "SJ", date: dDate, fyId: mo.fyId, periodId: pid,
                desc: `Penjualan Online Marketplace Gabungan W${week} ${pk}`, userId: userId2, tags: ["revenue", "e-commerce"],
                lines: [
                    { coaCode: "1201", desc: "Piutang Marketplace (Pending Settlement)", dr: onlineGross, cr: 0 },
                    { coaCode: "4002", desc: "Penjualan Online", dr: 0, cr: baseOnline, deptId: deptMKT },
                    { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppnOnl },
                ]
            }, companyId, coaIds);

            // 3. B2B Revenue (Invoice drops)
            await createJournal({
                num: jNum("SJ"), type: "SJ", date: dDate, fyId: mo.fyId, periodId: pid,
                desc: `Penjualan Korporasi Gabungan W${week} ${pk}`, userId: userId2, tags: ["revenue", "b2b"],
                lines: [
                    { coaCode: "1202", desc: "Piutang B2B Corp", dr: b2bGross, cr: 0 },
                    { coaCode: "4003", desc: "Penjualan B2B", dr: 0, cr: baseB2B, deptId: deptMD },
                    { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppnB2B },
                ]
            }, companyId, coaIds);
        }

        // ================= MONTHLY END / RECURRING =================
        const payDay = d(mo.y, mo.m, 25);
        const endMonth = d(mo.y, mo.m, maxDays);

        // 1. Payroll Store & HQ
        const baseSalaryStore = 1200000000 + (mo.y - 2024) * 200000000;
        const baseSalaryHQ = 800000000 + (mo.y - 2024) * 100000000;
        const bpjs = 105000000;
        const pph21 = Math.round((baseSalaryStore + baseSalaryHQ) * 0.08); // Higher bracket

        await createJournal({
            num: jNum("GJ"), type: "GJ", date: payDay, fyId: mo.fyId, periodId: pid,
            desc: `Gaji Karyawan Retail Pusat & Cabang ${pk}`, userId: userId2, tags: ["payroll", "recurring"],
            lines: [
                { coaCode: "6001", desc: "Gaji & Tunjangan Toko", dr: baseSalaryStore, cr: 0, deptId: deptStore },
                { coaCode: "6002", desc: "Gaji & Tunjangan HQ/Gudang", dr: baseSalaryHQ, cr: 0, deptId: deptFin },
                { coaCode: "6003", desc: "BPJS Ketenagakerjaan & Kesehatan", dr: bpjs, cr: 0, deptId: deptFin },

                { coaCode: "1103", desc: "Transfer bank Mandiri (Payroll)", dr: 0, cr: baseSalaryStore + baseSalaryHQ + bpjs - pph21 },
                { coaCode: "2106", desc: "Hutang PPh 21", dr: 0, cr: pph21 },
            ]
        }, companyId, coaIds);

        // 2. Settlement EDC Offline Sales
        const totalEdc = (monthOfflineRev * 1.11) * 0.75;
        const mdr = totalEdc * 0.015; // 1.5% MDR average
        await createJournal({
            num: jNum("RC"), type: "RC", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Settlement Bank EDC -> BCA Ops ${pk}`, userId: userId2, tags: ["settlement", "pos"],
            lines: [
                { coaCode: "1102", desc: "BCA Masuk", dr: totalEdc - mdr, cr: 0 },
                { coaCode: "6014", desc: "Beban Kartu Kredit & MDR", dr: mdr, cr: 0, deptId: deptStore },
                { coaCode: "1104", desc: "Kliring EDC", dr: 0, cr: totalEdc },
            ]
        }, companyId, coaIds);

        // 3. Collect Marketplace E-commerce Funds
        const totalMPReceivable = monthOnlineRev * 1.11;
        const mpFees = monthOnlineRev * 0.085; // Marketplace platform fees ~8.5%
        await createJournal({
            num: jNum("RC"), type: "RC", date: d(mo.y, mo.m, 18), fyId: mo.fyId, periodId: pid,
            desc: `Pencairan Dana Marketplace (Shopee/Tokped) ${pk}`, userId: userId2, tags: ["collection", "e-commerce"],
            lines: [
                { coaCode: "1102", desc: "Cair ke BCA", dr: totalMPReceivable - mpFees, cr: 0 },
                { coaCode: "6006", desc: "Platform Fees & Commission", dr: mpFees, cr: 0, deptId: deptMKT },
                { coaCode: "1201", desc: "Pelunasan Piutang E-Commerce", dr: 0, cr: totalMPReceivable },
            ]
        }, companyId, coaIds);

        // 4. Collect B2B Receivables (90% collected in month)
        const b2bCollected = monthB2BRev * 1.11 * 0.9;
        await createJournal({
            num: jNum("RC"), type: "RC", date: d(mo.y, mo.m, 22), fyId: mo.fyId, periodId: pid,
            desc: `Penerimaan Pelunasan Faktur B2B Corp ${pk}`, userId: userId2, tags: ["collection", "b2b"],
            lines: [
                { coaCode: "1102", desc: "Transfer Masuk B2B", dr: b2bCollected, cr: 0 },
                { coaCode: "1202", desc: "Pengurangan Piutang Korporasi", dr: 0, cr: b2bCollected },
            ]
        }, companyId, coaIds);

        // 5. Procurement of Inventory (Merchandising purchases)
        const inventoryPurch = monthOfflineRev * 0.45 + monthOnlineRev * 0.35 + monthB2BRev * 0.25;
        const packagingPurch = (monthOfflineRev + monthOnlineRev) * 0.05;
        await createJournal({
            num: jNum("PJ"), type: "PJ", date: d(mo.y, mo.m, 10), fyId: mo.fyId, periodId: pid,
            desc: `Purchasing Barang Dagangan dari Principal ${pk}`, userId: userId2, tags: ["purchasing", "inventory"],
            lines: [
                { coaCode: "1301", desc: "Penerimaan Barang di Gudang Pusat", dr: inventoryPurch, cr: 0 },
                { coaCode: "1304", desc: "Penerimaan Kantong/Packaging", dr: packagingPurch, cr: 0 },
                { coaCode: "1401", desc: "PPN Masukan (11%)", dr: (inventoryPurch + packagingPurch) * 0.11, cr: 0 },

                { coaCode: "2101", desc: "Hutang AP Principal", dr: 0, cr: (inventoryPurch + packagingPurch) * 1.11 },
            ]
        }, companyId, coaIds);

        // 6. AP Payment (Vendor Principal)
        const apPaid = (inventoryPurch + packagingPurch) * 0.85; // pay 85% of purchases monthly
        await createJournal({
            num: jNum("CD"), type: "CD", date: d(mo.y, mo.m, 28), fyId: mo.fyId, periodId: pid,
            desc: `Setor Pembayaran Principal Vendor ${pk}`, userId: userId2, tags: ["payment", "vendor"],
            lines: [
                { coaCode: "2101", desc: "Mengurangi Hutang", dr: apPaid, cr: 0 },
                { coaCode: "1102", desc: "Bank BCA Keluar", dr: 0, cr: apPaid },
            ]
        }, companyId, coaIds);

        // 7. Store Transfer (Gudang Pusat -> Store)
        const trfToStore = inventoryPurch * 0.70; // 70% goes to store shelves
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, 12), fyId: mo.fyId, periodId: pid,
            desc: `Mutasi Barang Pusat ke Gerai ${pk}`, userId: userId1, tags: ["inventory", "transfer"],
            lines: [
                { coaCode: "1302", desc: "Persediaan Barang Toko++", dr: trfToStore, cr: 0 },
                { coaCode: "1301", desc: "Persediaan Gudang Pusat--", dr: 0, cr: trfToStore },
            ]
        }, companyId, coaIds);

        // 8. COGS Recognition (Cost of Goods Sold based on mapped sales)
        const cogsOffline = monthOfflineRev * 0.50; // 50% margin
        const cogsOnline = monthOnlineRev * 0.40;   // 60% margin online
        const cogsB2B = monthB2BRev * 0.70;         // thinner B2B margin 30%
        const packUsage = packagingPurch * 0.95;

        // 8.b Random Shrinkage (Theft, damage, expiration) - typical retail 1-2% of sales
        const shrinkage = (monthOfflineRev + monthOnlineRev) * 0.015;

        await createJournal({
            num: jNum("AJ"), type: "AJ", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Pengakuan Harga Pokok Penjualan (HPP) & Shrinkage ${pk}`, userId: userId1, tags: ["cogs", "adjusting"],
            lines: [
                { coaCode: "5001", desc: "HPP Offline", dr: cogsOffline, cr: 0, deptId: deptStore },
                { coaCode: "5002", desc: "HPP Online", dr: cogsOnline, cr: 0, deptId: deptMKT },
                { coaCode: "5003", desc: "HPP B2B", dr: cogsB2B, cr: 0, deptId: deptMD },
                { coaCode: "5004", desc: "HPP Packaging Pemakaian", dr: packUsage, cr: 0, deptId: deptLOG },
                { coaCode: "5005", desc: "Beban Susut/Kehilangan Barang (Shrinkage)", dr: shrinkage, cr: 0, deptId: deptStore },

                // Take out of inventory. Online and B2B fulfilled from HQ (1301). Offline from Store (1302).
                { coaCode: "1302", desc: "Pengurang Persediaan Toko", dr: 0, cr: cogsOffline + shrinkage },
                { coaCode: "1301", desc: "Pengurang Persediaan Pusat (Online/B2B)", dr: 0, cr: cogsOnline + cogsB2B },
                { coaCode: "1304", desc: "Pengurang Packaging", dr: 0, cr: packUsage },
            ]
        }, companyId, coaIds);

        // 9. Utilities & Rent Expensing (Lease monthly amortizations & pure utilities)
        const utilitiesRent = 1250000000 + Math.random() * 50000000;
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, 15), fyId: mo.fyId, periodId: pid,
            desc: `Amortisasi Sewa & Utilities Toko ${pk}`, userId: userId2, tags: ["utilities", "rent"],
            lines: [
                { coaCode: "6004", desc: "Beban Sewa Ruang Gerai", dr: 900000000, cr: 0, deptId: deptStore },
                { coaCode: "6005", desc: "Beban Listrik Air", dr: utilitiesRent - 900000000, cr: 0, deptId: deptStore },

                { coaCode: "1402", desc: "Amortisasi Sewa Dibayar Dimuka", dr: 0, cr: 900000000 },
                { coaCode: "1102", desc: "Bayar Tagihan via BCA", dr: 0, cr: utilitiesRent - 900000000 },
            ]
        }, companyId, coaIds);

        // 10. Logistics & Courier Fees
        const ongkir = monthOnlineRev * 0.12; // Free shipping subsidies & couriers for online orders
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, endMonth.getDate() - 1), fyId: mo.fyId, periodId: pid,
            desc: `Subisidi Ongkir & Ekspedisi E-Commerce ${pk}`, userId: userId2, tags: ["logistics"],
            lines: [
                { coaCode: "6008", desc: "Beban Logistik & Kurir Online", dr: ongkir, cr: 0, deptId: deptLOG },
                { coaCode: "1102", desc: "Bayar Kurir", dr: 0, cr: ongkir },
            ]
        }, companyId, coaIds);

        // 11. Fixed Asset Depreciation
        await createJournal({
            num: jNum("AJ"), type: "AJ", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Penyusutan Aktiva Tetap Retail HQ & Gerai ${pk}`, userId: userId1, tags: ["depreciation"],
            lines: [
                { coaCode: "6009", desc: "Beban Total Penyusutan Retail", dr: 50000000 + 14166666 + 12500000 + 22500000 + 9375000, cr: 0, deptId: deptFin },

                { coaCode: "1601", desc: "Akum Peny Gedung HQ", dr: 0, cr: 50000000 },
                { coaCode: "1602", desc: "Akum Peny Fit Out", dr: 0, cr: 14166666 },
                { coaCode: "1603", desc: "Akum Peny Showcase", dr: 0, cr: 12500000 },
                { coaCode: "1604", desc: "Akum Kendaraan Kurir", dr: 0, cr: 22500000 },
                { coaCode: "1605", desc: "Akum POS & Server", dr: 0, cr: 9375000 },
            ]
        }, companyId, coaIds);

        // 12. Marketing Ads (Endorsements & Digital Paid Ads)
        const marketing = (monthOnlineRev + monthOfflineRev) * 0.04;
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, 5), fyId: mo.fyId, periodId: pid,
            desc: `Pembayaran Digital Ads & KOL ${pk}`, userId: userId2, tags: ["marketing", "ads"],
            lines: [
                { coaCode: "6007", desc: "Beban Ads & Endorsement", dr: marketing, cr: 0, deptId: deptMKT },
                { coaCode: "1102", desc: "Transfer BCA", dr: 0, cr: marketing },
            ]
        }, companyId, coaIds);

    }

    console.log(`✅ [RETAIL] Journals done (${jCounter} journals created across 2024-2026)`);
}
