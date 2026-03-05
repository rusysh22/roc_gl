import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // 1. Create default currencies
    const idr = await prisma.currency.upsert({
        where: { code: "IDR" },
        update: {},
        create: {
            code: "IDR",
            name: "Indonesian Rupiah",
            symbol: "Rp",
            decimalPlaces: 0,
        },
    });

    const usd = await prisma.currency.upsert({
        where: { code: "USD" },
        update: {},
        create: {
            code: "USD",
            name: "US Dollar",
            symbol: "$",
            decimalPlaces: 2,
        },
    });

    const eur = await prisma.currency.upsert({
        where: { code: "EUR" },
        update: {},
        create: {
            code: "EUR",
            name: "Euro",
            symbol: "€",
            decimalPlaces: 2,
        },
    });

    const sgd = await prisma.currency.upsert({
        where: { code: "SGD" },
        update: {},
        create: {
            code: "SGD",
            name: "Singapore Dollar",
            symbol: "S$",
            decimalPlaces: 2,
        },
    });

    console.log("  ✅ Currencies created");

    // 2. Create sample company
    const company = await prisma.company.upsert({
        where: { code: "DEMO" },
        update: {},
        create: {
            code: "DEMO",
            name: "PT Demo Indonesia",
            npwp: "01.234.567.8-901.000",
            address: "Jl. Sudirman No. 1, Jakarta Pusat 10210",
            baseCurrency: "IDR",
            timezone: "Asia/Jakarta",
            language: "id",
            subscriptionPlan: "enterprise",
        },
    });

    console.log("  ✅ Demo company created");

    // 3. Link currencies to company  
    for (const currency of [idr, usd, eur, sgd]) {
        await prisma.companyCurrency.upsert({
            where: {
                companyId_currencyId: {
                    companyId: company.id,
                    currencyId: currency.id,
                },
            },
            update: {},
            create: {
                companyId: company.id,
                currencyId: currency.id,
            },
        });
    }

    console.log("  ✅ Company currencies linked");

    // 4. Create Super Admin user
    const hashedPassword = await hash("Admin@123", 12);

    const superAdmin = await prisma.user.upsert({
        where: {
            companyId_email: {
                companyId: company.id,
                email: "admin@glroc.com",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            email: "admin@glroc.com",
            passwordHash: hashedPassword,
            name: "Super Administrator",
            systemRole: "SUPER_ADMIN",
        },
    });

    console.log("  ✅ Super Admin user created");
    console.log("     📧 Email: admin@glroc.com");
    console.log("     🔑 Password: Admin@123");

    // 5. Create default roles
    const roles = [
        {
            name: "Company Admin",
            description: "Full access to all company features",
            permissions: JSON.stringify([
                "company.view", "company.edit",
                "branch.view", "branch.create", "branch.edit", "branch.delete",
                "user.view", "user.create", "user.edit", "user.delete",
                "role.view", "role.create", "role.edit", "role.delete",
                "fiscal_year.view", "fiscal_year.create", "fiscal_year.edit",
                "period.view", "period.close",
                "department.view", "department.create", "department.edit", "department.delete",
                "cost_center.view", "cost_center.create", "cost_center.edit", "cost_center.delete",
                "currency.view", "currency.create", "currency.edit",
                "exchange_rate.view", "exchange_rate.create", "exchange_rate.edit",
                "journal.view", "journal.create", "journal.edit", "journal.post", "journal.approve",
                "report.view",
                "budget.view", "budget.create", "budget.edit", "budget.approve",
            ]),
        },
        {
            name: "Finance Manager",
            description: "Can manage journals, budgets, and view reports",
            permissions: JSON.stringify([
                "journal.view", "journal.create", "journal.edit", "journal.post", "journal.approve",
                "report.view",
                "budget.view", "budget.create", "budget.edit", "budget.approve",
                "fiscal_year.view", "period.view", "period.close",
                "department.view", "cost_center.view", "currency.view", "exchange_rate.view",
            ]),
        },
        {
            name: "Accountant",
            description: "Can create and manage journals and view reports",
            permissions: JSON.stringify([
                "journal.view", "journal.create", "journal.edit",
                "report.view",
                "budget.view",
                "department.view", "cost_center.view", "currency.view", "exchange_rate.view",
            ]),
        },
        {
            name: "Viewer",
            description: "Read-only access to reports and data",
            permissions: JSON.stringify([
                "journal.view", "report.view", "budget.view",
                "department.view", "cost_center.view", "currency.view",
            ]),
        },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: {
                companyId_name: {
                    companyId: company.id,
                    name: role.name,
                },
            },
            update: {},
            create: {
                companyId: company.id,
                name: role.name,
                description: role.description,
                permissions: JSON.parse(role.permissions),
            },
        });
    }

    console.log("  ✅ Default roles created");

    // 6. Create branch
    await prisma.branch.upsert({
        where: {
            companyId_code: {
                companyId: company.id,
                code: "HQ",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            code: "HQ",
            name: "Head Office",
            address: "Jl. Sudirman No. 1, Jakarta Pusat",
        },
    });

    console.log("  ✅ Default branch created");

    // 7. Create fiscal year and periods
    const fiscalYear = await prisma.fiscalYear.upsert({
        where: {
            companyId_name: {
                companyId: company.id,
                name: "FY2025",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            name: "FY2025",
            startDate: new Date("2025-01-01"),
            endDate: new Date("2025-12-31"),
            status: "OPEN",
        },
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
    ];

    for (let i = 0; i < 12; i++) {
        const year = 2025;
        const month = i + 1;
        const startDate = new Date(year, i, 1);
        const endDate = new Date(year, i + 1, 0);

        await prisma.period.upsert({
            where: {
                fiscalYearId_periodNumber: {
                    fiscalYearId: fiscalYear.id,
                    periodNumber: month,
                },
            },
            update: {},
            create: {
                fiscalYearId: fiscalYear.id,
                companyId: company.id,
                periodNumber: month,
                name: `${months[i]} ${year}`,
                startDate,
                endDate,
                status: "OPEN",
            },
        });
    }

    console.log("  ✅ Fiscal year FY2025 with 12 periods created");

    // 8. Create sample departments
    const finance = await prisma.department.upsert({
        where: {
            companyId_code: {
                companyId: company.id,
                code: "FIN",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            code: "FIN",
            name: "Finance & Accounting",
        },
    });

    await prisma.department.upsert({
        where: {
            companyId_code: {
                companyId: company.id,
                code: "OPS",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            code: "OPS",
            name: "Operations",
        },
    });

    await prisma.department.upsert({
        where: {
            companyId_code: {
                companyId: company.id,
                code: "HR",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            code: "HR",
            name: "Human Resources",
        },
    });

    console.log("  ✅ Sample departments created");

    // 9. Create sample cost centers
    await prisma.costCenter.upsert({
        where: {
            companyId_code: {
                companyId: company.id,
                code: "CC-FIN-01",
            },
        },
        update: {},
        create: {
            companyId: company.id,
            code: "CC-FIN-01",
            name: "Finance Operations",
            departmentId: finance.id,
        },
    });

    console.log("  ✅ Sample cost centers created");

    console.log("\n🎉 Seeding completed successfully!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("  Login credentials:");
    console.log("  📧 Email:    admin@glroc.com");
    console.log("  🔑 Password: Admin@123");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
