import { prisma, hashPw, d, uuid } from "./helpers";

export async function seedHotelFoundation() {
    console.log("🏨 [HOTEL] Creating foundation data...");
    const pw = await hashPw("Hotel@123");
    const companyId = uuid();

    // Company
    await prisma.company.create({
        data: {
            id: companyId, code: "H-GDN", name: "PT Graha Dani Nusantara",
            npwp: "01.234.567.8-901.001", address: "Jl. Benoa Raya No. 1, Bali 80361",
            baseCurrency: "IDR", subscriptionPlan: "enterprise",
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
            { id: userId1, companyId, email: "admin@grahadani.co.id", passwordHash: pw, name: "Budi Santoso", roleId: roleAdmin, systemRole: "COMPANY_ADMIN" },
            { id: userId2, companyId, email: "akuntan@grahadani.co.id", passwordHash: pw, name: "Siti Rahayu", roleId: roleAcct, systemRole: "ACCOUNTANT" },
            { id: userId3, companyId, email: "manajer@grahadani.co.id", passwordHash: pw, name: "Agus Pratama", roleId: roleMgr, systemRole: "FINANCE_MANAGER" },
        ]
    });

    // Branch
    await prisma.branch.create({ data: { companyId, code: "BALI", name: "Graha Dani Bali Resort", address: "Jl. Benoa Raya No. 1, Bali" } });

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
            // Close 2024, and up to early 2026 optionally
            const isClosed = year === 2024 || (year === 2025); // Close all 2024 and 2025
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

    // Departments (Hotel Specific)
    const deptFO = uuid(), deptFB = uuid(), deptHK = uuid(), deptMKT = uuid(), deptGA = uuid();
    await prisma.department.createMany({
        data: [
            { id: deptFO, companyId, code: "H-FO", name: "Front Office" },
            { id: deptFB, companyId, code: "H-FB", name: "Food & Beverage", parentId: null },
            { id: deptHK, companyId, code: "H-HK", name: "Housekeeping", parentId: null },
            { id: deptMKT, companyId, code: "H-MKT", name: "Sales & Marketing", parentId: null },
            { id: deptGA, companyId, code: "H-GA", name: "General Administration" },
        ]
    });

    // Cost Centers
    const ccFO = uuid(), ccFB = uuid(), ccHK = uuid(), ccMKT = uuid(), ccGA = uuid();
    await prisma.costCenter.createMany({
        data: [
            { id: ccFO, companyId, code: "CC-H-FO", name: "Front Office Operations", departmentId: deptFO },
            { id: ccFB, companyId, code: "CC-H-FB", name: "Restaurant & Bar", departmentId: deptFB },
            { id: ccHK, companyId, code: "CC-H-HK", name: "Housekeeping & Laundry", departmentId: deptHK },
            { id: ccMKT, companyId, code: "CC-H-MKT", name: "Marketing & Promos", departmentId: deptMKT },
            { id: ccGA, companyId, code: "CC-H-GA", name: "G&A Backoffice", departmentId: deptGA },
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

    // Exchange Rates (monthly USD rates 2024 - 2026)
    const usdRates: [number, number, number][] = [];
    for (let y = 2024; y <= 2026; y++) {
        for (let m = 1; m <= 12; m++) {
            // roughly 15000 to 16500 range
            const rate = 15000 + Math.floor(Math.random() * 1500);
            usdRates.push([y, m, rate]);
        }
    }

    for (const [y, m, rate] of usdRates) {
        await prisma.exchangeRate.create({
            data: {
                companyId, currencyId: curUsd,
                rate, date: d(y, m, 1),
            }
        });
    }

    console.log("✅ [HOTEL] Foundation done");
    return {
        companyId, userId1, userId2, userId3,
        fy24, fy25, fy26, fy27, periodIds,
        deptFO, deptFB, deptHK, deptMKT, deptGA,
        ccFO, ccFB, ccHK, ccMKT, ccGA,
    };
}
