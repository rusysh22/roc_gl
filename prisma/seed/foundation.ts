import { prisma, hashPw, d, uuid } from "./helpers";

export async function seedFoundation() {
    console.log("🏗️  Creating foundation data...");
    const pw = await hashPw("Demo@123");
    const companyId = uuid();

    // Company
    await prisma.company.create({
        data: {
            id: companyId, code: "BJK", name: "PT Bangun Jaya Konstruksi",
            npwp: "01.234.567.8-901.000", address: "Jl. Gatot Subroto No. 88, Jakarta Selatan 12930",
            baseCurrency: "IDR", subscriptionPlan: "professional",
        }
    });

    // Roles
    const roleAdmin = uuid(), roleAcct = uuid(), roleMgr = uuid();
    await prisma.role.createMany({
        data: [
            { id: roleAdmin, companyId, name: "Admin", description: "Full access", permissions: JSON.stringify(["*"]) },
            { id: roleAcct, companyId, name: "Accountant", description: "Accounting access", permissions: JSON.stringify(["journal.*", "report.*", "master.view", "budget.view"]) },
            { id: roleMgr, companyId, name: "Finance Manager", description: "Finance & approval", permissions: JSON.stringify(["journal.*", "report.*", "budget.*", "master.*", "approval.*"]) },
        ]
    });

    // Users
    const userId1 = uuid(), userId2 = uuid(), userId3 = uuid();
    await prisma.user.createMany({
        data: [
            { id: userId1, companyId, email: "admin@bjk.co.id", passwordHash: pw, name: "Budi Santoso", roleId: roleAdmin, systemRole: "COMPANY_ADMIN" },
            { id: userId2, companyId, email: "akuntan@bjk.co.id", passwordHash: pw, name: "Siti Rahayu", roleId: roleAcct, systemRole: "ACCOUNTANT" },
            { id: userId3, companyId, email: "manajer@bjk.co.id", passwordHash: pw, name: "Agus Pratama", roleId: roleMgr, systemRole: "FINANCE_MANAGER" },
        ]
    });

    // Branch
    await prisma.branch.create({ data: { companyId, code: "HQ", name: "Kantor Pusat Jakarta", address: "Jl. Gatot Subroto No. 88" } });

    // Fiscal Years
    const fy25 = uuid(), fy26 = uuid(), fy27 = uuid();
    await prisma.fiscalYear.createMany({
        data: [
            { id: fy25, companyId, name: "FY2025", startDate: d(2025, 1, 1), endDate: d(2025, 12, 31), status: "OPEN" },
            { id: fy26, companyId, name: "FY2026", startDate: d(2026, 1, 1), endDate: d(2026, 12, 31), status: "OPEN" },
            { id: fy27, companyId, name: "FY2027", startDate: d(2027, 1, 1), endDate: d(2027, 12, 31), status: "OPEN" },
        ]
    });

    // Periods
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const periodIds: Record<string, string> = {};
    for (const [fyId, year] of [[fy25, 2025], [fy26, 2026], [fy27, 2027]] as [string, number][]) {
        for (let m = 1; m <= 12; m++) {
            const pid = uuid();
            const key = `${year}-${String(m).padStart(2, "0")}`;
            periodIds[key] = pid;
            // Close Mar-Oct 2025
            const isClosed = year === 2025 && m >= 3 && m <= 10;
            await prisma.period.create({
                data: {
                    id: pid, fiscalYearId: fyId, companyId, periodNumber: m,
                    name: `${months[m - 1]} ${year}`, startDate: d(year, m, 1),
                    endDate: d(year, m + 1, 0), // last day of month
                    status: isClosed ? "CLOSED" : "OPEN",
                }
            });
        }
    }

    // Departments
    const deptHQ = uuid(), deptA = uuid(), deptB = uuid(), deptC = uuid(), deptEQ = uuid();
    await prisma.department.createMany({
        data: [
            { id: deptHQ, companyId, code: "HQ", name: "Head Office" },
            { id: deptA, companyId, code: "PROJ-A", name: "Proyek Alpha – Gedung Perkantoran", parentId: null },
            { id: deptB, companyId, code: "PROJ-B", name: "Proyek Beta – Jalan Tol", parentId: null },
            { id: deptC, companyId, code: "PROJ-C", name: "Proyek Gamma – Jembatan", parentId: null },
            { id: deptEQ, companyId, code: "EQUIP", name: "Equipment & Workshop" },
        ]
    });

    // Cost Centers
    const ccAdm = uuid(), ccFin = uuid(), ccPA = uuid(), ccPB = uuid(), ccPC = uuid(), ccEQ = uuid();
    await prisma.costCenter.createMany({
        data: [
            { id: ccAdm, companyId, code: "CC-ADM", name: "Administrasi & Umum", departmentId: deptHQ },
            { id: ccFin, companyId, code: "CC-FIN", name: "Keuangan & Akuntansi", departmentId: deptHQ },
            { id: ccPA, companyId, code: "CC-PA", name: "Proyek Alpha", departmentId: deptA },
            { id: ccPB, companyId, code: "CC-PB", name: "Proyek Beta", departmentId: deptB },
            { id: ccPC, companyId, code: "CC-PC", name: "Proyek Gamma", departmentId: deptC },
            { id: ccEQ, companyId, code: "CC-EQ", name: "Workshop & Alat Berat", departmentId: deptEQ },
        ]
    });

    // Currencies
    const curIdr = uuid();
    const curUsd = uuid();
    await prisma.currency.createMany({
        data: [
            { id: curIdr, code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
            { id: curUsd, code: "USD", name: "US Dollar", symbol: "$" },
        ]
    });
    await prisma.companyCurrency.createMany({
        data: [
            { companyId, currencyId: curIdr, isActive: true },
            { companyId, currencyId: curUsd, isActive: true },
        ]
    });

    // Exchange Rates (monthly USD rates Mar 2025 - Mar 2026)
    const usdRates: [number, number, number][] = [
        [2025, 3, 15850], [2025, 4, 15920], [2025, 5, 15780], [2025, 6, 15900], [2025, 7, 16050],
        [2025, 8, 16100], [2025, 9, 15950], [2025, 10, 16000], [2025, 11, 16150], [2025, 12, 16200],
        [2026, 1, 16100], [2026, 2, 16050], [2026, 3, 15980],
    ];
    for (const [y, m, rate] of usdRates) {
        await prisma.exchangeRate.create({
            data: {
                companyId, currencyId: curUsd,
                rate, date: d(y, m, 1),
            }
        });
    }

    console.log("✅ Foundation done");
    return {
        companyId, userId1, userId2, userId3,
        fy25, fy26, fy27, periodIds,
        deptHQ, deptA, deptB, deptC, deptEQ,
        ccAdm, ccFin, ccPA, ccPB, ccPC, ccEQ,
    };
}
