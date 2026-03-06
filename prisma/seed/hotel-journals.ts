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

export async function seedHotelJournals(
    companyId: string, coaIds: Record<string, string>,
    userId1: string, userId2: string,
    periodIds: Record<string, string>,
    fy24: string, fy25: string, fy26: string,
    deptFO: string, deptFB: string, deptHK: string, deptMKT: string, deptGA: string
) {
    console.log("📝 [HOTEL] Creating journals (Daily & Monthly for 2024-2026)...");
    jCounter = 0;

    // ============ OPENING BALANCE (Jan 1, 2024) ============
    const pJan24 = periodIds["2024-01"];
    await createJournal({
        num: jNum("OB"), type: "GJ", date: d(2024, 1, 1), fyId: fy24, periodId: pJan24,
        desc: "Opening Balance — Migrasi Sistem Awal 2024", userId: userId1, tags: ["opening-balance"],
        lines: [
            // Assets
            { coaCode: "1101", desc: "Saldo Kasir FO", dr: 50000000, cr: 0 },
            { coaCode: "1102", desc: "Saldo Bank BCA Ops", dr: 2500000000, cr: 0 },
            { coaCode: "1103", desc: "Saldo Bank Mandiri", dr: 850000000, cr: 0 },
            { coaCode: "1104", desc: "Saldo Bank EDC", dr: 150000000, cr: 0 },

            { coaCode: "1201", desc: "Piutang Tamu In-house", dr: 120000000, cr: 0 },
            { coaCode: "1202", desc: "Piutang Travel Agent", dr: 850000000, cr: 0 },
            { coaCode: "1203", desc: "Piutang OTA", dr: 1350000000, cr: 0 },

            { coaCode: "1301", desc: "Inventory Makanan", dr: 320000000, cr: 0 },
            { coaCode: "1302", desc: "Inventory Minuman", dr: 210000000, cr: 0 },
            { coaCode: "1303", desc: "Inventory Guest Amenities", dr: 180000000, cr: 0 },

            { coaCode: "1501", desc: "Tanah Hotel", dr: 25000000000, cr: 0 },
            { coaCode: "1502", desc: "Bangunan Hotel", dr: 85000000000, cr: 0 },
            { coaCode: "1503", desc: "Interior & Furniture", dr: 15000000000, cr: 0 },

            // Accumulated Depreciation (contra)
            { coaCode: "1601", desc: "Akum peny bangunan", dr: 0, cr: 8500000000 },
            { coaCode: "1602", desc: "Akum peny interior", dr: 0, cr: 4500000000 },

            // Liabilities
            { coaCode: "2101", desc: "Hutang Supplier F&B", dr: 0, cr: 450000000 },
            { coaCode: "2110", desc: "Deposit Reservasi", dr: 0, cr: 350000000 },
            { coaCode: "2201", desc: "Hutang Bank (Investasi)", dr: 0, cr: 65000000000 },

            // Equity
            { coaCode: "3001", desc: "Modal Disetor", dr: 0, cr: 40000000000 },
            { coaCode: "3002", desc: "Laba Ditahan", dr: 0, cr: 2780000000 }, // Plug
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

        let monthRoomRev = 0;
        let monthFbRev = 0;
        let monthSpaRev = 0;

        // Daily Night Audit (Revenues)
        // To prevent thousands of db calls freezing the seed, we do a weekly summary representing daily Night Audits
        for (let week = 1; week <= 4; week++) {
            const dDate = d(mo.y, mo.m, week * 7 > maxDays ? maxDays : week * 7);

            // Seasonal multiplier (High season mid yr & end yr)
            const seasonality = (mo.m >= 6 && mo.m <= 8) || mo.m === 12 ? 1.5 : 1.0;
            const growthBase = mo.y === 2024 ? 1 : mo.y === 2025 ? 1.2 : 1.4;

            const baseRoom = (500000000 + Math.random() * 200000000) * seasonality * growthBase;
            const baseFb = (250000000 + Math.random() * 80000000) * seasonality * growthBase;
            const baseSpa = (40000000 + Math.random() * 20000000) * seasonality * growthBase;

            monthRoomRev += baseRoom;
            monthFbRev += baseFb;
            monthSpaRev += baseSpa;

            const totalRev = baseRoom + baseFb + baseSpa;
            const pb1 = totalRev * 0.1;
            const sc = totalRev * 0.05; // Service charge
            const totalGross = totalRev + pb1 + sc;

            // Payment Split (Cash vs OTA vs CC)
            const viaCC = totalGross * 0.4;
            const viaOTA = totalGross * 0.4;
            const viaCash = totalGross * 0.2;

            await createJournal({
                num: jNum("SJ"), type: "SJ", date: dDate, fyId: mo.fyId, periodId: pid,
                desc: `Night Audit Revenue Week ${week} ${pk}`, userId: userId2, tags: ["revenue", "night-audit"],
                lines: [
                    // AR / Cash
                    { coaCode: "1104", desc: "Terima EDC", dr: viaCC, cr: 0 },
                    { coaCode: "1203", desc: "Piutang OTA", dr: viaOTA, cr: 0 },
                    { coaCode: "1101", desc: "Kas Kasir", dr: viaCash, cr: 0 },

                    // Revenues
                    { coaCode: "4001", desc: "Room Revenue", dr: 0, cr: baseRoom, deptId: deptFO },
                    { coaCode: "4002", desc: "F&B Revenue", dr: 0, cr: baseFb, deptId: deptFB },
                    { coaCode: "4004", desc: "Spa Revenue", dr: 0, cr: baseSpa, deptId: deptFO },

                    // Tax & SC
                    { coaCode: "2104", desc: "PB1 10%", dr: 0, cr: pb1 },
                    { coaCode: "2105", desc: "Service Charge 5%", dr: 0, cr: sc },
                ]
            }, companyId, coaIds);
        }

        // ================= MONTHLY END / RECURRING =================
        const payDay = d(mo.y, mo.m, 25);
        const midMonth = d(mo.y, mo.m, 15);
        const endMonth = d(mo.y, mo.m, maxDays);

        // 1. Payroll + Service Charge distribution
        const baseSalary = 850000000 + (mo.y - 2024) * 100000000; // growing payload
        const scDist = (monthRoomRev + monthFbRev + monthSpaRev) * 0.05 * 0.8; // 80% to employee
        const bpjs = 45000000;
        const pph21 = Math.round((baseSalary + scDist) * 0.06);

        await createJournal({
            num: jNum("GJ"), type: "GJ", date: payDay, fyId: mo.fyId, periodId: pid,
            desc: `Gaji & Service Charge ${pk}`, userId: userId2, tags: ["payroll", "recurring"],
            lines: [
                { coaCode: "6001", desc: "Gaji & tunjangan", dr: baseSalary, cr: 0, deptId: deptGA },
                { coaCode: "2105", desc: "Distribusi Service Charge", dr: scDist, cr: 0 }, // relieve liability
                { coaCode: "6002", desc: "BPJS", dr: bpjs, cr: 0, deptId: deptGA },

                { coaCode: "1103", desc: "Transfer bank Mandiri (Payroll)", dr: 0, cr: baseSalary + scDist + bpjs - pph21 },
                { coaCode: "2106", desc: "Hutang PPh 21", dr: 0, cr: pph21 },
            ]
        }, companyId, coaIds);

        // 2. Settlement EDC to BCA (Transfer from 1104 to 1102)
        const totalEdc = (monthRoomRev + monthFbRev + monthSpaRev) * 1.15 * 0.4; // rough
        const mdr = totalEdc * 0.018; // 1.8% MDR fee
        await createJournal({
            num: jNum("RC"), type: "RC", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Settlement Bank EDC -> Ops ${pk}`, userId: userId2, tags: ["settlement"],
            lines: [
                { coaCode: "1102", desc: "Masuk BCA", dr: totalEdc - mdr, cr: 0 },
                { coaCode: "6014", desc: "MDR Fee", dr: mdr, cr: 0, deptId: deptFO },
                { coaCode: "1104", desc: "Clear EDC", dr: 0, cr: totalEdc },
            ]
        }, companyId, coaIds);

        // 3. Collect OTA Receivables
        const otaCollected = (monthRoomRev + monthFbRev + monthSpaRev) * 1.15 * 0.4;
        const otaComm = monthRoomRev * 0.15; // 15% commission on room
        await createJournal({
            num: jNum("RC"), type: "RC", date: d(mo.y, mo.m, 20), fyId: mo.fyId, periodId: pid,
            desc: `Pencairan Piutang OTA ${pk}`, userId: userId2, tags: ["collection", "ota"],
            lines: [
                { coaCode: "1102", desc: "Cair ke BCA", dr: otaCollected - otaComm, cr: 0 },
                { coaCode: "6005", desc: "OTA Commission Expense", dr: otaComm, cr: 0, deptId: deptMKT },
                { coaCode: "1203", desc: "Pelunasan Piutang OTA", dr: 0, cr: otaCollected },
            ]
        }, companyId, coaIds);

        // 4. Procurement of Inventory & Supplies (F&B / Amenities)
        const fbPurch = monthFbRev * 0.35; // 35% food cost
        const amenPurch = monthRoomRev * 0.05;
        await createJournal({
            num: jNum("PJ"), type: "PJ", date: d(mo.y, mo.m, 10), fyId: mo.fyId, periodId: pid,
            desc: `Purchasing F&B dan Amenities ${pk}`, userId: userId2, tags: ["purchasing", "inventory"],
            lines: [
                { coaCode: "1301", desc: "Beli Bahan Makanan", dr: fbPurch, cr: 0 },
                { coaCode: "1303", desc: "Beli Guest Amenities", dr: amenPurch, cr: 0 },
                { coaCode: "1401", desc: "PPN Masukan", dr: (fbPurch + amenPurch) * 0.11, cr: 0 },

                { coaCode: "2101", desc: "Hutang Supplier", dr: 0, cr: (fbPurch + amenPurch) * 1.11 },
            ]
        }, companyId, coaIds);

        // 5. AP Payment
        const apPaid = fbPurch + amenPurch;
        await createJournal({
            num: jNum("CD"), type: "CD", date: d(mo.y, mo.m, 28), fyId: mo.fyId, periodId: pid,
            desc: `Bayar Supplier Hotel ${pk}`, userId: userId2, tags: ["payment"],
            lines: [
                { coaCode: "2101", desc: "Pelunasan AP", dr: apPaid, cr: 0 },
                { coaCode: "1102", desc: "Bank BCA", dr: 0, cr: apPaid },
            ]
        }, companyId, coaIds);

        // 6. COGS Recognition (Cost of Goods Sold based on usage)
        await createJournal({
            num: jNum("AJ"), type: "AJ", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Pengakuan COGS Pemakaian Inventory ${pk}`, userId: userId1, tags: ["cogs", "adjusting"],
            lines: [
                { coaCode: "5001", desc: "COGS Makanan FB", dr: fbPurch * 1.02, cr: 0, deptId: deptFB },
                { coaCode: "5004", desc: "Pemakaian Amenities Room", dr: amenPurch * 1.05, cr: 0, deptId: deptHK },

                { coaCode: "1301", desc: "Kredit Inventory F&B", dr: 0, cr: fbPurch * 1.02 },
                { coaCode: "1303", desc: "Kredit Inventory Amenities", dr: 0, cr: amenPurch * 1.05 },
            ]
        }, companyId, coaIds);

        // 7. Utilities (Listrik Air)
        const listrikAir = 300000000 + Math.random() * 20000000;
        await createJournal({
            num: jNum("GJ"), type: "GJ", date: d(mo.y, mo.m, 15), fyId: mo.fyId, periodId: pid,
            desc: `Listrik & Air ${pk}`, userId: userId2, tags: ["utilities"],
            lines: [
                { coaCode: "6004", desc: "Beban Listrik, Air, Gas Hotel", dr: listrikAir, cr: 0, deptId: deptGA },
                { coaCode: "1102", desc: "Bayar via BCA", dr: 0, cr: listrikAir },
            ]
        }, companyId, coaIds);

        // 8. Fixed Asset Depreciation
        await createJournal({
            num: jNum("AJ"), type: "AJ", date: endMonth, fyId: mo.fyId, periodId: pid,
            desc: `Penyusutan Aktiva Tetap Hotel ${pk}`, userId: userId1, tags: ["depreciation"],
            lines: [
                { coaCode: "6007", desc: "Beban Penyusutan Hotel", dr: 62500000 + 58333333 + 10000000 + 9166666 + 5208333, cr: 0, deptId: deptGA },

                { coaCode: "1601", desc: "Akum Peny Gedung", dr: 0, cr: 62500000 },
                { coaCode: "1602", desc: "Akum Peny Interior", dr: 0, cr: 58333333 },
                { coaCode: "1603", desc: "Akum Peny Kitchen", dr: 0, cr: 10000000 },
                { coaCode: "1604", desc: "Akum Peny Kendaraan", dr: 0, cr: 9166666 },
                { coaCode: "1605", desc: "Akum Peny Sistem IT", dr: 0, cr: 5208333 },
            ]
        }, companyId, coaIds);

        // 9. Bank Loan Repayment (Quarterly)
        if (mo.m % 3 === 0) {
            await createJournal({
                num: jNum("CD"), type: "CD", date: endMonth, fyId: mo.fyId, periodId: pid,
                desc: `Cicilan Pokok & Bunga Bank Investasi (Q${mo.m / 3} ${mo.y})`, userId: userId1, tags: ["loan"],
                lines: [
                    { coaCode: "2201", desc: "Pokok Pinjaman", dr: 1500000000, cr: 0 },
                    { coaCode: "7002", desc: "Beban Bunga Pinjaman Bank", dr: 350000000, cr: 0 }, // Simplified
                    { coaCode: "1102", desc: "BCA", dr: 0, cr: 1850000000 },
                ]
            }, companyId, coaIds);
        }
    }

    console.log(`✅ [HOTEL] Journals done (${jCounter} journals created across 2024-2026)`);
}
