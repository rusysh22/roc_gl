import { prisma, hashPw, d, uuid } from "./helpers";

export async function seedRetailFoundation() {
    console.log("🏪 [RETAIL] Creating foundation data...");
    const pw = await hashPw("Retail@123");
    const companyId = uuid();

    // Company
    await prisma.company.create({
        data: {
            id: companyId, code: "R-DRG", name: "PT Dani Retail Garuda",
            npwp: "02.345.678.9-012.000", address: "Gedung Garuda Lt. 5, Jl. Sudirman No. 10, Jakarta 10220",
            baseCurrency: "IDR", subscriptionPlan: "enterprise",
        }
    });

    // Roles
    const roleAdmin = uuid(), roleAcct = uuid(), roleMgr = uuid();
    await prisma.role.createMany({
        data: [
            { id: roleAdmin, companyId, name: "Super Admin", description: "Full system access", permissions: JSON.stringify(["*"]) },
            { id: roleAcct, companyId, name: "Retail Accountant", description: "POS and Accounting access", permissions: JSON.stringify(["journal.*", "report.*", "master.view", "budget.view"]) },
            { id: roleMgr, companyId, name: "Retail Finance Head", description: "Finance operations & approval", permissions: JSON.stringify(["journal.*", "report.*", "budget.*", "master.*", "approval.*"]) },
        ]
    });

    // Users
    const userId1 = uuid(), userId2 = uuid(), userId3 = uuid();
    await prisma.user.createMany({
        data: [
            { id: userId1, companyId, email: "admin@daniretail.co.id", passwordHash: pw, name: "Reza Hermawan", roleId: roleAdmin, systemRole: "COMPANY_ADMIN" },
            { id: userId2, companyId, email: "accounting@daniretail.co.id", passwordHash: pw, name: "Dewi Lestari", roleId: roleAcct, systemRole: "ACCOUNTANT" },
            { id: userId3, companyId, email: "finance@daniretail.co.id", passwordHash: pw, name: "Andi Saputra", roleId: roleMgr, systemRole: "FINANCE_MANAGER" },
        ]
    });

    // Branch
    await prisma.branch.createMany({
        data: [
            { companyId, code: "HQ", name: "Headquarter Jakarta", address: "Jl. Sudirman No. 10, Jakarta" },
            { companyId, code: "S-JKT", name: "Store Garuda Sudirman", address: "Jl. Sudirman No. 15, Jakarta" },
            { companyId, code: "S-BDG", name: "Store Garuda Paskal", address: "Paskal Hyper Square, Bandung" },
        ]
    });

    // Fiscal Years (2024 - 2027)
    const fy24 = uuid(), fy25 = uuid(), fy26 = uuid(), fy27 = uuid();
    await prisma.fiscalYear.createMany({
        data: [
            { id: fy24, companyId, name: "FY2024", startDate: d(2024, 1, 1), endDate: d(2024, 12, 31), status: "CLOSED" },
            { id: fy25, companyId, name: "FY2025", startDate: d(2025, 1, 1), endDate: d(2025, 12, 31), status: "OPEN" },
            { id: fy26, companyId, name: "FY2026", startDate: d(2026, 1, 1), endDate: d(2026, 12, 31), status: "OPEN" },
            { id: fy27, companyId, name: "FY2027", startDate: d(2027, 1, 1), endDate: d(2027, 12, 31), status: "OPEN" },
        ]
    });

    // Periods
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const periodIds: Record<string, string> = {};
    for (const [fyId, year] of [[fy24, 2024], [fy25, 2025], [fy26, 2026], [fy27, 2027]] as [string, number][]) {
        for (let m = 1; m <= 12; m++) {
            const pid = uuid();
            const key = `${year}-${String(m).padStart(2, "0")}`;
            periodIds[key] = pid;
            const isClosed = year === 2024 || (year === 2025);
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

    // Departments (Retail Specific)
    const deptStore = uuid(), deptMD = uuid(), deptLOG = uuid(), deptMKT = uuid(), deptFin = uuid();
    await prisma.department.createMany({
        data: [
            { id: deptStore, companyId, code: "R-SO", name: "Store Operations" },
            { id: deptMD, companyId, code: "R-MD", name: "Merchandising & Sourcing" },
            { id: deptLOG, companyId, code: "R-LOG", name: "Logistics & Warehouse" },
            { id: deptMKT, companyId, code: "R-MKT", name: "Marketing & E-commerce" },
            { id: deptFin, companyId, code: "R-FIN", name: "Finance & Admin" },
        ]
    });

    // Cost Centers
    const ccStore = uuid(), ccMD = uuid(), ccLOG = uuid(), ccMKT = uuid(), ccFin = uuid();
    await prisma.costCenter.createMany({
        data: [
            { id: ccStore, companyId, code: "CC-R-SO", name: "Branches & Stores", departmentId: deptStore },
            { id: ccMD, companyId, code: "CC-R-MD", name: "Product & Merchandising", departmentId: deptMD },
            { id: ccLOG, companyId, code: "CC-R-LOG", name: "Central Warehouse", departmentId: deptLOG },
            { id: ccMKT, companyId, code: "CC-R-MKT", name: "Digital & Campaign", departmentId: deptMKT },
            { id: ccFin, companyId, code: "CC-R-FIN", name: "Headquarters Backoffice", departmentId: deptFin },
        ]
    });
    // Currencies
    const curIdr = uuid();
    const curUsd = uuid();
    const currencies = [
        { id: curIdr, code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
        { id: curUsd, code: "USD", name: "US Dollar", symbol: "$" }
    ];
    for (const c of currencies) {
        await prisma.currency.upsert({
            where: { code: c.code },
            update: {},
            create: c
        });
    }

    // Get the actual IDs assigned
    const dbIdr = await prisma.currency.findUnique({ where: { code: "IDR" } });
    const dbUsd = await prisma.currency.findUnique({ where: { code: "USD" } });

    await prisma.companyCurrency.createMany({
        data: [
            { companyId, currencyId: dbIdr!.id, isActive: true },
            { companyId, currencyId: dbUsd!.id, isActive: true },
        ]
    });

    // Exchange Rates (monthly USD rates 2024 - 2026)
    const usdRates: [number, number, number][] = [];
    for (let y = 2024; y <= 2026; y++) {
        for (let m = 1; m <= 12; m++) {
            const rate = 15000 + Math.floor(Math.random() * 1500);
            usdRates.push([y, m, rate]);
        }
    }

    for (const [y, m, rate] of usdRates) {
        await prisma.exchangeRate.create({
            data: {
                companyId, currencyId: dbUsd!.id,
                rate, date: d(y, m, 1),
            }
        });
    }

    console.log("✅ [RETAIL] Foundation done");
    return {
        companyId, userId1, userId2, userId3,
        fy24, fy25, fy26, fy27, periodIds,
        deptStore, deptMD, deptLOG, deptMKT, deptFin,
        ccStore, ccMD, ccLOG, ccMKT, ccFin,
    };
}

