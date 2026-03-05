import { prisma } from "@/lib/prisma";

/**
 * Generates a unique journal number.
 * Format: {TYPE}/{YYYY}/{MM}/{SEQUENCE}
 * Example: GJ/2025/03/0001
 * 
 * @param companyId The company ID
 * @param date The journal date
 * @param type The journal type (e.g., GJ, AJ, RC, etc.)
 * @returns A unique journal number string
 */
export async function generateJournalNumber(companyId: string, date: Date, type: string = "GJ"): Promise<string> {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");

    // Prefix format: GJ/2025/03/
    const prefix = `${type}/${year}/${month}/`;

    // Find the latest journal number with this prefix for this company
    const latestJournal = await prisma.journal.findFirst({
        where: {
            companyId,
            journalNumber: {
                startsWith: prefix,
            },
        },
        orderBy: {
            journalNumber: "desc",
        },
    });

    let sequence = 1;

    if (latestJournal) {
        // Extract the sequence part and increment
        const lastNumStr = latestJournal.journalNumber.split("/").pop();
        if (lastNumStr) {
            sequence = parseInt(lastNumStr, 10) + 1;
        }
    }

    // Format sequence to 4 digits: 0001
    const sequenceStr = sequence.toString().padStart(4, "0");

    return `${prefix}${sequenceStr}`;
}
