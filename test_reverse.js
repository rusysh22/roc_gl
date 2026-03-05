const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const journals = await prisma.journal.findMany({ where: { status: 'POSTED' } });
    if (journals.length === 0) {
        console.log("No POSTED journals found to reverse.");
        return;
    }
    const j = journals[0];
    console.log("Reversing POSTED journal:", j.id);

    const original = await prisma.journal.findUnique({
        where: { id: j.id },
        include: { lines: true }
    });

    const reverseDate = new Date(); // today

    const period = await prisma.period.findFirst({
        where: {
            companyId: original.companyId,
            startDate: { lte: reverseDate },
            endDate: { gte: reverseDate },
        },
        include: { fiscalYear: true }
    });

    if (!period || period.status !== "OPEN") {
        console.log("Target period for reversal is not open or not found");
        return;
    }
    console.log("Period OK");

    // generate number
    // Format: {TYPE}/{YYYY}/{MM}/{SEQUENCE}
    const year = reverseDate.getFullYear().toString();
    const month = (reverseDate.getMonth() + 1).toString().padStart(2, "0");
    const prefix = `RJ/${year}/${month}/`;
    const latestJournal = await prisma.journal.findFirst({
        where: { companyId: original.companyId, journalNumber: { startsWith: prefix } },
        orderBy: { journalNumber: "desc" },
    });
    let sequence = 1;
    if (latestJournal) {
        const lastNumStr = latestJournal.journalNumber.split("/").pop();
        if (lastNumStr) sequence = parseInt(lastNumStr, 10) + 1;
    }
    const sequenceStr = sequence.toString().padStart(4, "0");
    const journalNumber = `${prefix}${sequenceStr}`;
    console.log("Generated Number:", journalNumber);

    try {
        // Use transaction to create reversal and update original
        const reversal = await prisma.$transaction(async (tx) => {
            // Create reversal journal
            console.log("Creating header...");
            const rev = await tx.journal.create({
                data: {
                    companyId: original.companyId,
                    journalNumber,
                    journalType: "RJ",
                    journalDate: reverseDate,
                    postingDate: reverseDate,
                    periodId: period.id,
                    fiscalYearId: period.fiscalYearId,
                    referenceNumber: original.journalNumber,
                    description: `Reversal of ${original.journalNumber}: ${original.description || ""}`,
                    currencyCode: original.currencyCode,
                    exchangeRate: original.exchangeRate,
                    totalDebit: original.totalDebit,
                    totalCredit: original.totalCredit,
                    status: "DRAFT",
                    reversalOfId: original.id,
                    createdBy: original.createdBy, // fallback
                }
            });

            console.log("Creating lines...", original.lines.length);
            for (const line of original.lines) {
                await tx.journalLine.create({
                    data: {
                        journalId: rev.id,
                        companyId: original.companyId,
                        lineNumber: line.lineNumber,
                        coaId: line.coaId,
                        departmentId: line.departmentId,
                        costCenterId: line.costCenterId,
                        description: line.description,
                        debitAmount: line.creditAmount,
                        creditAmount: line.debitAmount,
                        debitBase: line.creditBase,
                        creditBase: line.debitBase,
                    }
                });
            }

            console.log("Updating original status...");
            await tx.journal.update({
                where: { id: original.id },
                data: { status: "REVERSED" }
            });

            return rev;
        });
        console.log("Success reversing!", reversal.id);
    } catch (err) {
        console.error("Prisma Transaction Error:", err);
    }
}

main().finally(() => prisma.$disconnect());
