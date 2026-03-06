import { PrismaClient } from '@prisma/client';
import { seedJournals } from './prisma/seed/journals';

const prisma = new PrismaClient();

async function main() {
    console.log("Starting manual seed...");

    // Fetch the required mapping IDs from the newly seeded database
    const company = await prisma.company.findFirst();
    if (!company) throw new Error("No company found. Did you run prisma db seed first?");

    const coas = await prisma.chartOfAccount.findMany({ where: { companyId: company.id } });
    const coaIds: Record<string, string> = {};
    coas.forEach(c => coaIds[c.code] = c.id);

    const users = await prisma.user.findMany({ where: { companyId: company.id } });
    const userId1 = users[0].id;
    const userId2 = users[1] ? users[1].id : users[0].id;

    const periods = await prisma.period.findMany();
    const periodIds: Record<string, string> = {};
    periods.forEach(p => {
        const d = p.startDate.toISOString().substring(0, 7); // YYYY-MM
        periodIds[d] = p.id;
    });

    const fms = await prisma.fiscalYear.findMany();
    const fy25 = fms.find(f => f.name === 'FY2025')?.id || fms[0].id;
    const fy26 = fms.find(f => f.name === 'FY2026')?.id || fms[0].id;

    const depts = await prisma.department.findMany({ where: { companyId: company.id } });
    const deptHQ = depts.find(d => d.code === 'HQ')?.id || depts[0].id;
    const deptA = depts.find(d => d.code === 'PRJ-A')?.id || depts[0].id;
    const deptB = depts.find(d => d.code === 'PRJ-B')?.id || depts[0].id;
    const deptC = depts.find(d => d.code === 'PRJ-C')?.id || depts[0].id;

    console.log("Data mappings loaded. Seeding journals...");
    await seedJournals(
        company.id, coaIds,
        userId1, userId2,
        periodIds,
        fy25, fy26,
        deptHQ, deptA, deptB, deptC
    );
    console.log("Manual seed complete!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
