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

export async function seedJournals(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId2: string,
    periodIds: Record<string, string>,
    fy25: string, fy26: string,
    deptHQ: string, deptA: string, deptB: string, deptC: string
) {
    console.log("📝 Creating journals...");
    jCounter = 0;

    // ============ OPENING BALANCE (March 1, 2025) ============
    const pMar25 = periodIds["2025-03"];
    await createJournal({
        num: jNum("OB"), type: "GJ", date: d(2025, 3, 1), fyId: fy25, periodId: pMar25,
        desc: "Opening Balance — Migrasi Sistem", userId: userId1, tags: ["opening-balance"],
        lines: [
            // Assets
            { coaCode: "1101", desc: "Saldo awal Kas Kecil", dr: 25000000, cr: 0 },
            { coaCode: "1102", desc: "Saldo awal Bank BCA", dr: 2500000000, cr: 0 },
            { coaCode: "1103", desc: "Saldo awal Bank Mandiri", dr: 500000000, cr: 0 },
            { coaCode: "1104", desc: "Saldo awal Bank BNI USD", dr: 790000000, cr: 0 }, // ~$50K × 15800
            { coaCode: "1201", desc: "Saldo awal Piutang Usaha", dr: 1850000000, cr: 0 },
            { coaCode: "1202", desc: "Saldo awal Piutang Retensi", dr: 320000000, cr: 0 },
            { coaCode: "1301", desc: "Saldo awal Material", dr: 180000000, cr: 0 },
            { coaCode: "1302", desc: "Saldo awal BBM", dr: 45000000, cr: 0 },
            { coaCode: "1403", desc: "Saldo awal Asuransi Prepaid", dr: 72000000, cr: 0 },
            { coaCode: "1501", desc: "Tanah", dr: 2000000000, cr: 0 },
            { coaCode: "1502", desc: "Bangunan kantor", dr: 3200000000, cr: 0 },
            { coaCode: "1503", desc: "Alat berat", dr: 4300000000, cr: 0 },
            { coaCode: "1504", desc: "Kendaraan", dr: 1680000000, cr: 0 },
            { coaCode: "1505", desc: "Peralatan kantor", dr: 120000000, cr: 0 },
            { coaCode: "1506", desc: "Peralatan proyek", dr: 450000000, cr: 0 },
            // Accumulated Depreciation (contra)
            { coaCode: "1601", desc: "Akum peny bangunan", dr: 0, cr: 800000000 },
            { coaCode: "1602", desc: "Akum peny alat berat", dr: 0, cr: 1150000000 },
            { coaCode: "1603", desc: "Akum peny kendaraan", dr: 0, cr: 380000000 },
            { coaCode: "1604", desc: "Akum peny peralatan kantor", dr: 0, cr: 30000000 },
            { coaCode: "1605", desc: "Akum peny peralatan proyek", dr: 0, cr: 165000000 },
            // Liabilities
            { coaCode: "2101", desc: "Saldo awal Hutang Usaha", dr: 0, cr: 650000000 },
            { coaCode: "2103", desc: "Saldo awal Hutang Subkon", dr: 0, cr: 420000000 },
            { coaCode: "2104", desc: "Saldo awal PPN Keluaran", dr: 0, cr: 185000000 },
            { coaCode: "2105", desc: "Saldo awal PPh 21", dr: 0, cr: 28000000 },
            { coaCode: "2109", desc: "Saldo awal Biaya YMH Bayar", dr: 0, cr: 95000000 },
            { coaCode: "2201", desc: "Saldo awal Hutang Bank", dr: 0, cr: 3500000000 },
            // Equity
            { coaCode: "3001", desc: "Modal Disetor", dr: 0, cr: 5000000000 },
            { coaCode: "3002", desc: "Laba Ditahan", dr: 0, cr: 5629000000 },
        ]
    }, companyId, coaIds);

    // ============ MONTHLY JOURNALS (Mar 2025 - Mar 2026) ============
    const months: { y: number; m: number; fyId: string }[] = [
        { y: 2025, m: 3, fyId: fy25 }, { y: 2025, m: 4, fyId: fy25 }, { y: 2025, m: 5, fyId: fy25 }, { y: 2025, m: 6, fyId: fy25 },
        { y: 2025, m: 7, fyId: fy25 }, { y: 2025, m: 8, fyId: fy25 }, { y: 2025, m: 9, fyId: fy25 }, { y: 2025, m: 10, fyId: fy25 },
        { y: 2025, m: 11, fyId: fy25 }, { y: 2025, m: 12, fyId: fy25 },
        { y: 2026, m: 1, fyId: fy26 }, { y: 2026, m: 2, fyId: fy26 }, { y: 2026, m: 3, fyId: fy26 },
    ];

    // Project termin schedules
    const alphaTermins = [3, 5, 7, 9, 10, 11]; // months in 2025
    const alphaTermins26 = [1, 2]; // months in 2026
    const betaTermins = [5, 7, 9, 11]; // months in 2025
    const betaTermins26 = [1, 3]; // months in 2026
    const gammaTermins = [8, 10, 12]; // months in 2025
    const gammaTermins26 = [3]; // months in 2026

    for (const mo of months) {
        const pk = `${mo.y}-${String(mo.m).padStart(2, "0")}`;
        const pid = periodIds[pk];
        if (!pid) continue;

        const payDay = d(mo.y, mo.m, 25);
        const midMonth = d(mo.y, mo.m, 15);
        const endMonth = d(mo.y, mo.m + 1, 0);
        const d5 = d(mo.y, mo.m, 5);
        const d10 = d(mo.y, mo.m, 10);
        const d20 = d(mo.y, mo.m, 20);

        // Vary payroll slightly
        const baseSalary = 175000000 + Math.floor(Math.random() * 20000000);
        const bpjs = 22000000 + Math.floor(Math.random() * 3000000);
        const pph21 = Math.round(baseSalary * 0.05);

        // 1. Payroll
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: payDay, fyId: mo.fyId, periodId: pid,
            desc: `Gaji & BPJS ${pk}`, userId: userId2, tags: ["payroll", "recurring"],
            lines: [
                { coaCode: "6001", desc: "Gaji & tunjangan", dr: baseSalary, cr: 0, deptId: deptHQ },
                { coaCode: "6002", desc: "BPJS", dr: bpjs, cr: 0, deptId: deptHQ },
                { coaCode: "1103", desc: "Transfer bank Mandiri", dr: 0, cr: baseSalary + bpjs - pph21 },
                { coaCode: "2105", desc: "PPh 21", dr: 0, cr: pph21 },
            ]
        }, companyId, coaIds);

        // 2. Office Rent
        await createJournal({
            num: jNum("RJ"), type: "RJ", date: d5, fyId: mo.fyId, periodId: pid,
            desc: `Sewa kantor ${pk}`, userId: userId2, tags: ["recurring"],
            lines: [
                { coaCode: "6003", desc: "Sewa kantor bulan ini", dr: 35000000, cr: 0, deptId: deptHQ },
                { coaCode: "1102", desc: "BCA", dr: 0, cr: 35000000 },
            ]
        }, companyId, coaIds);

        // 3. Utilities
        const listrik = 7000000 + Math.floor(Math.random() * 2000000);
        const telp = 4500000 + Math.floor(Math.random() * 1000000);
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d10, fyId: mo.fyId, periodId: pid,
            desc: `Listrik, air, telepon ${pk}`, userId: userId2, tags: ["recurring"],
            lines: [
                { coaCode: "6004", desc: "Listrik & air", dr: listrik, cr: 0, deptId: deptHQ },
                { coaCode: "6005", desc: "Telepon & internet", dr: telp, cr: 0, deptId: deptHQ },
                { coaCode: "1102", desc: "BCA", dr: 0, cr: listrik + telp },
            ]
        }, companyId, coaIds);

        // 4. Bank charges + interest
        const bunga = 2500000 + Math.floor(Math.random() * 2000000);
        await createJournal({
            num: jNum("RC"), type: "RC", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Bunga bank & admin ${pk}`, userId: userId2, tags: ["bank"],
            lines: [
                { coaCode: "1102", desc: "Pendapatan bunga BCA", dr: bunga, cr: 0 },
                { coaCode: "6014", desc: "Admin bank", dr: 350000, cr: 0 },
                { coaCode: "7001", desc: "Pendapatan bunga", dr: 0, cr: bunga },
                { coaCode: "1102", desc: "Admin dari BCA", dr: 0, cr: 350000 },
            ]
        }, companyId, coaIds);

        // 5. Loan repayment (starts April 2025)
        if (!(mo.y === 2025 && mo.m === 3)) {
            await createJournal({
                num: jNum("GJ"), type: "GJ", date: d20, fyId: mo.fyId, periodId: pid,
                desc: `Cicilan hutang bank BJB ${pk}`, userId: userId2, tags: ["loan"],
                lines: [
                    { coaCode: "2201", desc: "Pokok pinjaman", dr: 200000000, cr: 0 },
                    { coaCode: "7002", desc: "Bunga pinjaman", dr: 45000000, cr: 0 },
                    { coaCode: "1102", desc: "BCA", dr: 0, cr: 245000000 },
                ]
            }, companyId, coaIds);
        }

        // 6. Depreciation (AJ)
        await createJournal({
            num: jNum("AJ"), type: "AJ", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Penyusutan aset tetap ${pk}`, userId: userId1, tags: ["depreciation", "adjusting"],
            lines: [
                { coaCode: "6007", desc: "Beban penyusutan", dr: 99270000, cr: 0 },
                { coaCode: "1601", desc: "Akum peny bangunan", dr: 0, cr: 13333333 },
                { coaCode: "1602", desc: "Akum peny alat berat", dr: 0, cr: 44791667 },
                { coaCode: "1603", desc: "Akum peny kendaraan", dr: 0, cr: 17500000 },
                { coaCode: "1604", desc: "Akum peny peralatan kantor", dr: 0, cr: 2500000 },
                { coaCode: "1605", desc: "Akum peny peralatan proyek", dr: 0, cr: 7500000 },
                { coaCode: "6007", desc: "Rounding adj", dr: 0, cr: 13645000 }, // balance adjustment
            ]
        }, companyId, coaIds);

        // ======= PROJECT ALPHA (Gedung 25B) =======
        if (mo.y === 2025 && mo.m >= 3 || mo.y === 2026 && mo.m <= 2) {
            const matCost = 350000000 + Math.floor(Math.random() * 100000000);
            const laborCost = 180000000 + Math.floor(Math.random() * 40000000);
            // Material purchase
            await createJournal({
                num: jNum("GJ"), type: "GJ", date: midMonth, fyId: mo.fyId, periodId: pid,
                desc: `Material Proyek Alpha ${pk}`, userId: userId2, tags: ["proyek-alpha"],
                lines: [
                    { coaCode: "5001", desc: "Beli material bangunan", dr: matCost, cr: 0, deptId: deptA },
                    { coaCode: "1401", desc: "PPN Masukan 11%", dr: Math.round(matCost * 0.11), cr: 0 },
                    { coaCode: "2101", desc: "Hutang supplier", dr: 0, cr: matCost + Math.round(matCost * 0.11) },
                ]
            }, companyId, coaIds);
            // Labor
            await createJournal({
                num: jNum("GJ"), type: "GJ", date: payDay, fyId: mo.fyId, periodId: pid,
                desc: `Upah TK Proyek Alpha ${pk}`, userId: userId2, tags: ["proyek-alpha"],
                lines: [
                    { coaCode: "5002", desc: "Tenaga kerja langsung", dr: laborCost, cr: 0, deptId: deptA },
                    { coaCode: "1102", desc: "BCA", dr: 0, cr: laborCost },
                ]
            }, companyId, coaIds);
            // Revenue termin
            const isAlphaTermin25 = mo.y === 2025 && alphaTermins.includes(mo.m);
            const isAlphaTermin26 = mo.y === 2026 && alphaTermins26.includes(mo.m);
            if (isAlphaTermin25 || isAlphaTermin26) {
                const termin = 3125000000;
                const ppn = Math.round(termin * 0.11);
                const retensi = Math.round(termin * 0.05);
                await createJournal({
                    num: jNum("GJ"), type: "GJ", date: endMonth, fyId: mo.fyId, periodId: pid,
                    desc: `Termin Proyek Alpha – Gedung`, userId: userId1, tags: ["proyek-alpha", "revenue"],
                    lines: [
                        { coaCode: "1201", desc: "Piutang termin", dr: termin + ppn - retensi, cr: 0, deptId: deptA },
                        { coaCode: "1202", desc: "Retensi 5%", dr: retensi, cr: 0, deptId: deptA },
                        { coaCode: "4001", desc: "Pendapatan konstruksi", dr: 0, cr: termin, deptId: deptA },
                        { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppn },
                    ]
                }, companyId, coaIds);
            }
        }

        // ======= PROJECT BETA (Jalan Tol 18B) =======
        if ((mo.y === 2025 && mo.m >= 5) || (mo.y === 2026 && mo.m <= 3)) {
            const matCost = 280000000 + Math.floor(Math.random() * 80000000);
            const subkonCost = 200000000 + Math.floor(Math.random() * 50000000);
            await createJournal({
                num: jNum("GJ"), type: "GJ", date: midMonth, fyId: mo.fyId, periodId: pid,
                desc: `Material & Subkon Proyek Beta ${pk}`, userId: userId2, tags: ["proyek-beta"],
                lines: [
                    { coaCode: "5001", desc: "Material jalan", dr: matCost, cr: 0, deptId: deptB },
                    { coaCode: "5003", desc: "Subkontraktor", dr: subkonCost, cr: 0, deptId: deptB },
                    { coaCode: "2101", desc: "Hutang material", dr: 0, cr: matCost },
                    { coaCode: "2103", desc: "Hutang subkon", dr: 0, cr: subkonCost },
                ]
            }, companyId, coaIds);
            const isBetaTermin25 = mo.y === 2025 && betaTermins.includes(mo.m);
            const isBetaTermin26 = mo.y === 2026 && betaTermins26.includes(mo.m);
            if (isBetaTermin25 || isBetaTermin26) {
                const termin = 3000000000;
                const ppn = Math.round(termin * 0.11);
                const retensi = Math.round(termin * 0.05);
                await createJournal({
                    num: jNum("GJ"), type: "GJ", date: endMonth, fyId: mo.fyId, periodId: pid,
                    desc: `Termin Proyek Beta – Jalan Tol`, userId: userId1, tags: ["proyek-beta", "revenue"],
                    lines: [
                        { coaCode: "1201", desc: "Piutang termin", dr: termin + ppn - retensi, cr: 0, deptId: deptB },
                        { coaCode: "1202", desc: "Retensi 5%", dr: retensi, cr: 0, deptId: deptB },
                        { coaCode: "4001", desc: "Pendapatan konstruksi", dr: 0, cr: termin, deptId: deptB },
                        { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppn },
                    ]
                }, companyId, coaIds);
            }
        }

        // ======= PROJECT GAMMA (Jembatan 8.5B) =======
        if ((mo.y === 2025 && mo.m >= 8) || (mo.y === 2026 && mo.m <= 3)) {
            const matCost = 150000000 + Math.floor(Math.random() * 50000000);
            const sewaCost = 85000000;
            await createJournal({
                num: jNum("GJ"), type: "GJ", date: midMonth, fyId: mo.fyId, periodId: pid,
                desc: `Material & Sewa Alat Proyek Gamma ${pk}`, userId: userId2, tags: ["proyek-gamma"],
                lines: [
                    { coaCode: "5001", desc: "Material jembatan", dr: matCost, cr: 0, deptId: deptC },
                    { coaCode: "5004", desc: "Sewa alat berat ext", dr: sewaCost, cr: 0, deptId: deptC },
                    { coaCode: "2101", desc: "Hutang", dr: 0, cr: matCost + sewaCost },
                ]
            }, companyId, coaIds);
            const isGammaTermin25 = mo.y === 2025 && gammaTermins.includes(mo.m);
            const isGammaTermin26 = mo.y === 2026 && gammaTermins26.includes(mo.m);
            if (isGammaTermin25 || isGammaTermin26) {
                const termin = 2125000000;
                const ppn = Math.round(termin * 0.11);
                const retensi = Math.round(termin * 0.05);
                await createJournal({
                    num: jNum("GJ"), type: "GJ", date: endMonth, fyId: mo.fyId, periodId: pid,
                    desc: `Termin Proyek Gamma – Jembatan`, userId: userId1, tags: ["proyek-gamma", "revenue"],
                    lines: [
                        { coaCode: "1201", desc: "Piutang termin", dr: termin + ppn - retensi, cr: 0, deptId: deptC },
                        { coaCode: "1202", desc: "Retensi 5%", dr: retensi, cr: 0, deptId: deptC },
                        { coaCode: "4001", desc: "Pendapatan konstruksi", dr: 0, cr: termin, deptId: deptC },
                        { coaCode: "2104", desc: "PPN Keluaran 11%", dr: 0, cr: ppn },
                    ]
                }, companyId, coaIds);
            }
        }

        // Customer payment (collect receivables every month)
        if (mo.m % 2 === 0 || mo.m === 3) {
            const collectAmt = 1500000000 + Math.floor(Math.random() * 1000000000);
            await createJournal({
                num: jNum("RC"), type: "RC", date: d(mo.y, mo.m, 18), fyId: mo.fyId, periodId: pid,
                desc: `Penerimaan piutang pelanggan ${pk}`, userId: userId2, tags: ["collection"],
                lines: [
                    { coaCode: "1102", desc: "Terima via BCA", dr: collectAmt, cr: 0 },
                    { coaCode: "1201", desc: "Pelunasan piutang", dr: 0, cr: collectAmt },
                ]
            }, companyId, coaIds);
        }

        // Supplier payment (pay AP)
        const payAP = 400000000 + Math.floor(Math.random() * 200000000);
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, 12), fyId: mo.fyId, periodId: pid,
            desc: `Pembayaran hutang supplier ${pk}`, userId: userId2,
            lines: [
                { coaCode: "2101", desc: "Bayar hutang usaha", dr: payAP, cr: 0 },
                { coaCode: "1102", desc: "BCA", dr: 0, cr: payAP },
            ]
        }, companyId, coaIds);
    }

    // Special: Bank loan disbursement (April 2025)
    await createJournal({
        num: jNum("GJ"), type: "GJ", date: d(2025, 4, 8), fyId: fy25, periodId: periodIds["2025-04"],
        desc: "Pencairan KMK Bank BJB", userId: userId1, tags: ["loan", "financing"],
        lines: [
            { coaCode: "1102", desc: "Dana masuk BCA", dr: 5000000000, cr: 0 },
            { coaCode: "2201", desc: "Hutang Bank BJB", dr: 0, cr: 5000000000 },
        ]
    }, companyId, coaIds);

    // Insurance payment (Jan 2025 equivalent, charged to prepaid)
    await createJournal({
        num: jNum("GJ"), type: "GJ", date: d(2025, 3, 5), fyId: fy25, periodId: periodIds["2025-03"],
        desc: "Perpanjangan asuransi all risk", userId: userId2,
        lines: [
            { coaCode: "6008", desc: "Asuransi bulan ini", dr: 6000000, cr: 0, deptId: deptHQ },
            { coaCode: "1403", desc: "Dari prepaid", dr: 0, cr: 6000000 },
        ]
    }, companyId, coaIds);

    console.log(`✅ Journals done (${jCounter} journals created)`);
}
