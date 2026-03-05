import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Default CoA template: Perusahaan Dagang (Trading Company)
const tradingTemplate = {
    groups: [
        { code: "1", name: "Aset", nameEn: "Assets", accountType: "ASSET", sortOrder: 1 },
        { code: "2", name: "Liabilitas", nameEn: "Liabilities", accountType: "LIABILITY", sortOrder: 2 },
        { code: "3", name: "Ekuitas", nameEn: "Equity", accountType: "EQUITY", sortOrder: 3 },
        { code: "4", name: "Pendapatan", nameEn: "Revenue", accountType: "REVENUE", sortOrder: 4 },
        { code: "5", name: "Beban", nameEn: "Expenses", accountType: "EXPENSE", sortOrder: 5 },
    ],
    accounts: [
        // ASSET
        { code: "1-1000", name: "Aset Lancar", nameEn: "Current Assets", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", isHeader: true, sortOrder: 1, cashFlowCategory: null },
        { code: "1-1100", name: "Kas & Bank", nameEn: "Cash & Bank", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", isHeader: true, parentCode: "1-1000", sortOrder: 2, cashFlowCategory: null },
        { code: "1-1101", name: "Kas Besar", nameEn: "Cash on Hand", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1100", sortOrder: 3, cashFlowCategory: "OPERATING" },
        { code: "1-1102", name: "Bank BCA", nameEn: "Bank BCA", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1100", sortOrder: 4, cashFlowCategory: "OPERATING" },
        { code: "1-1103", name: "Bank Mandiri", nameEn: "Bank Mandiri", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1100", sortOrder: 5, cashFlowCategory: "OPERATING" },
        { code: "1-1200", name: "Piutang Usaha", nameEn: "Accounts Receivable", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1000", sortOrder: 10, cashFlowCategory: "OPERATING" },
        { code: "1-1300", name: "Persediaan Barang", nameEn: "Inventory", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1000", sortOrder: 15, cashFlowCategory: "OPERATING" },
        { code: "1-1400", name: "Pajak Dibayar Dimuka", nameEn: "Prepaid Tax", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1000", sortOrder: 20, cashFlowCategory: "OPERATING", taxMappingCode: "PPh" },
        { code: "1-1500", name: "Biaya Dibayar Dimuka", nameEn: "Prepaid Expenses", groupCode: "1", accountType: "ASSET", accountSubType: "Current Asset", parentCode: "1-1000", sortOrder: 25, cashFlowCategory: "OPERATING" },
        { code: "1-2000", name: "Aset Tetap", nameEn: "Fixed Assets", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", isHeader: true, sortOrder: 30, cashFlowCategory: null },
        { code: "1-2100", name: "Tanah", nameEn: "Land", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", parentCode: "1-2000", sortOrder: 31, cashFlowCategory: "INVESTING" },
        { code: "1-2200", name: "Bangunan", nameEn: "Building", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", parentCode: "1-2000", sortOrder: 32, cashFlowCategory: "INVESTING" },
        { code: "1-2300", name: "Kendaraan", nameEn: "Vehicles", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", parentCode: "1-2000", sortOrder: 33, cashFlowCategory: "INVESTING" },
        { code: "1-2400", name: "Peralatan", nameEn: "Equipment", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", parentCode: "1-2000", sortOrder: 34, cashFlowCategory: "INVESTING" },
        { code: "1-2900", name: "Akumulasi Penyusutan", nameEn: "Accumulated Depreciation", groupCode: "1", accountType: "ASSET", accountSubType: "Fixed Asset", parentCode: "1-2000", sortOrder: 39, cashFlowCategory: "NON_CASH" },
        // LIABILITY
        { code: "2-1000", name: "Liabilitas Jangka Pendek", nameEn: "Current Liabilities", groupCode: "2", accountType: "LIABILITY", accountSubType: "Current Liability", isHeader: true, sortOrder: 50, cashFlowCategory: null },
        { code: "2-1100", name: "Hutang Usaha", nameEn: "Accounts Payable", groupCode: "2", accountType: "LIABILITY", accountSubType: "Current Liability", parentCode: "2-1000", sortOrder: 51, cashFlowCategory: "OPERATING" },
        { code: "2-1200", name: "Hutang Pajak", nameEn: "Tax Payable", groupCode: "2", accountType: "LIABILITY", accountSubType: "Current Liability", parentCode: "2-1000", sortOrder: 52, cashFlowCategory: "OPERATING", taxMappingCode: "PPN" },
        { code: "2-1300", name: "Hutang Gaji", nameEn: "Salaries Payable", groupCode: "2", accountType: "LIABILITY", accountSubType: "Current Liability", parentCode: "2-1000", sortOrder: 53, cashFlowCategory: "OPERATING" },
        { code: "2-2000", name: "Liabilitas Jangka Panjang", nameEn: "Long-term Liabilities", groupCode: "2", accountType: "LIABILITY", accountSubType: "Long-term Liability", isHeader: true, sortOrder: 60, cashFlowCategory: null },
        { code: "2-2100", name: "Hutang Bank", nameEn: "Bank Loan", groupCode: "2", accountType: "LIABILITY", accountSubType: "Long-term Liability", parentCode: "2-2000", sortOrder: 61, cashFlowCategory: "FINANCING" },
        // EQUITY
        { code: "3-1000", name: "Modal", nameEn: "Capital", groupCode: "3", accountType: "EQUITY", accountSubType: "Paid-in Capital", isHeader: true, sortOrder: 70, cashFlowCategory: null },
        { code: "3-1100", name: "Modal Disetor", nameEn: "Paid-in Capital", groupCode: "3", accountType: "EQUITY", accountSubType: "Paid-in Capital", parentCode: "3-1000", sortOrder: 71, cashFlowCategory: "FINANCING" },
        { code: "3-2000", name: "Laba Ditahan", nameEn: "Retained Earnings", groupCode: "3", accountType: "EQUITY", accountSubType: "Retained Earnings", sortOrder: 75, cashFlowCategory: "NONE", isRetainedEarnings: true },
        { code: "3-3000", name: "Laba Tahun Berjalan", nameEn: "Current Year Earnings", groupCode: "3", accountType: "EQUITY", accountSubType: "Other Equity", sortOrder: 76, cashFlowCategory: "NONE" },
        // REVENUE
        { code: "4-1000", name: "Pendapatan Usaha", nameEn: "Operating Revenue", groupCode: "4", accountType: "REVENUE", accountSubType: "Operating Revenue", isHeader: true, sortOrder: 80, cashFlowCategory: null },
        { code: "4-1100", name: "Penjualan", nameEn: "Sales", groupCode: "4", accountType: "REVENUE", accountSubType: "Operating Revenue", parentCode: "4-1000", sortOrder: 81, cashFlowCategory: "OPERATING", taxMappingCode: "PPN" },
        { code: "4-1200", name: "Diskon Penjualan", nameEn: "Sales Discount", groupCode: "4", accountType: "REVENUE", accountSubType: "Operating Revenue", parentCode: "4-1000", sortOrder: 82, cashFlowCategory: "OPERATING" },
        { code: "4-1300", name: "Retur Penjualan", nameEn: "Sales Return", groupCode: "4", accountType: "REVENUE", accountSubType: "Operating Revenue", parentCode: "4-1000", sortOrder: 83, cashFlowCategory: "OPERATING" },
        { code: "4-2000", name: "Pendapatan Lain-lain", nameEn: "Other Revenue", groupCode: "4", accountType: "REVENUE", accountSubType: "Other Revenue", sortOrder: 89, cashFlowCategory: "OPERATING" },
        // EXPENSE
        { code: "5-1000", name: "Harga Pokok Penjualan", nameEn: "Cost of Goods Sold", groupCode: "5", accountType: "EXPENSE", accountSubType: "Cost of Goods Sold", isHeader: true, sortOrder: 90, cashFlowCategory: null },
        { code: "5-1100", name: "HPP Barang Dagang", nameEn: "COGS - Merchandise", groupCode: "5", accountType: "EXPENSE", accountSubType: "Cost of Goods Sold", parentCode: "5-1000", sortOrder: 91, cashFlowCategory: "OPERATING" },
        { code: "5-2000", name: "Beban Operasional", nameEn: "Operating Expenses", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", isHeader: true, sortOrder: 100, cashFlowCategory: null },
        { code: "5-2100", name: "Beban Gaji", nameEn: "Salary Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 101, cashFlowCategory: "OPERATING" },
        { code: "5-2200", name: "Beban Sewa", nameEn: "Rent Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 102, cashFlowCategory: "OPERATING" },
        { code: "5-2300", name: "Beban Utilitas", nameEn: "Utilities Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 103, cashFlowCategory: "OPERATING" },
        { code: "5-2400", name: "Beban Penyusutan", nameEn: "Depreciation Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 104, cashFlowCategory: "NON_CASH" },
        { code: "5-2500", name: "Beban Transportasi", nameEn: "Transport Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 105, cashFlowCategory: "OPERATING" },
        { code: "5-2600", name: "Beban Administrasi", nameEn: "Administrative Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Operating Expense", parentCode: "5-2000", sortOrder: 106, cashFlowCategory: "OPERATING" },
        { code: "5-3000", name: "Beban Lain-lain", nameEn: "Other Expenses", groupCode: "5", accountType: "EXPENSE", accountSubType: "Other Expense", sortOrder: 110, cashFlowCategory: "OPERATING" },
        { code: "5-4000", name: "Beban Pajak", nameEn: "Tax Expense", groupCode: "5", accountType: "EXPENSE", accountSubType: "Tax Expense", sortOrder: 115, cashFlowCategory: "OPERATING", taxMappingCode: "PPh" },
    ],
};

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = session.user as any;
        if (!user.companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

        // Check if already has CoA data
        const existingCount = await prisma.chartOfAccount.count({ where: { companyId: user.companyId } });
        if (existingCount > 0) {
            return NextResponse.json({ error: "Company already has CoA data. Delete existing data first." }, { status: 400 });
        }

        const companyId = user.companyId;
        const template = tradingTemplate;

        // Create groups
        const groupMap: Record<string, string> = {};
        for (const g of template.groups) {
            const created = await prisma.coaGroup.create({
                data: { companyId, code: g.code, name: g.name, nameEn: g.nameEn, accountType: g.accountType, sortOrder: g.sortOrder },
            });
            groupMap[g.code] = created.id;
        }

        // Create accounts (2 passes: first create all, then update parent references)
        const accountMap: Record<string, string> = {};
        for (const a of template.accounts) {
            const normalBalance = ["ASSET", "EXPENSE"].includes(a.accountType) ? "DEBIT" : "CREDIT";
            const created = await prisma.chartOfAccount.create({
                data: {
                    companyId, code: a.code, name: a.name, nameEn: a.nameEn || null,
                    coaGroupId: groupMap[a.groupCode], accountType: a.accountType,
                    accountSubType: a.accountSubType || null, normalBalance,
                    cashFlowCategory: a.cashFlowCategory || null,
                    taxMappingCode: (a as any).taxMappingCode || null,
                    isHeader: (a as any).isHeader ?? false,
                    isRetainedEarnings: (a as any).isRetainedEarnings ?? false,
                    isBudgetApplicable: !((a as any).isHeader),
                    sortOrder: a.sortOrder,
                    level: (a as any).isHeader ? 1 : ((a as any).parentCode ? 3 : 2),
                },
            });
            accountMap[a.code] = created.id;
        }

        // Update parent references
        for (const a of template.accounts) {
            if ((a as any).parentCode && accountMap[(a as any).parentCode]) {
                await prisma.chartOfAccount.update({
                    where: { id: accountMap[a.code] },
                    data: { parentCoaId: accountMap[(a as any).parentCode] },
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: `Template loaded: ${template.groups.length} groups, ${template.accounts.length} accounts`,
            groupsCreated: template.groups.length,
            accountsCreated: template.accounts.length,
        }, { status: 201 });
    } catch (error) {
        console.error("Template load error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
