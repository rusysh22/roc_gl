"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, Search, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function IncomeStatementPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [data, setData] = useState<any>(null);

    const handleGenerate = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
        if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
        try {
            const res = await fetch(`/api/reports/income-statement?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const flatSection = (sectionName: string, sectionData: any, isSubtraction = false) => {
        const rows = [
            ...sectionData.items.map((i: any) => ({
                Account: `${i.code} — ${i.name}`,
                Amount: isSubtraction ? -i.amount : i.amount
            })),
            { Account: `Total ${sectionName}`, Amount: isSubtraction ? -sectionData.total : sectionData.total }
        ];
        return rows;
    };

    const handleExportExcel = () => {
        if (!data) return;

        const exportData = [
            { Account: "REVENUE", Amount: "" },
            ...flatSection("Revenue", data.sections.revenue),
            { Account: "", Amount: "" },
            { Account: "COST OF GOODS SOLD", Amount: "" },
            ...flatSection("Cost of Goods Sold", data.sections.cogs, true),
            { Account: "", Amount: "" },
            { Account: "GROSS PROFIT", Amount: data.sections.grossProfit.amount },
            { Account: "", Amount: "" },
            { Account: "OPERATING EXPENSES", Amount: "" },
            ...flatSection("Operating Expenses", data.sections.operatingExpenses, true),
            { Account: "", Amount: "" },
            { Account: "OPERATING PROFIT", Amount: data.sections.operatingProfit.amount },
            { Account: "", Amount: "" },
            { Account: "NET PROFIT", Amount: data.sections.netProfit.amount }
        ];

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 60 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Income Statement");
        XLSX.writeFile(wb, `Income_Statement_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Income Statement", 14, 20);
        doc.setFontSize(10);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")}`, 14, 28);
        }

        const formatRow = (acc: string, amt: any) => [acc, amt !== "" ? fmt(amt) : ""];

        let tableBody: any[] = [
            [{ content: "REVENUE", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
            ...flatSection("Revenue", data.sections.revenue).map(r => formatRow(r.Account, r.Amount)),

            [{ content: "COST OF GOODS SOLD", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [255, 245, 238] } }],
            ...flatSection("Cost of Goods Sold", data.sections.cogs, true).map(r => formatRow(r.Account, r.Amount)),

            [{ content: "GROSS PROFIT", styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.grossProfit.amount), styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 150, 0] } }],

            [{ content: "OPERATING EXPENSES", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [255, 250, 240] } }],
            ...flatSection("Operating Expenses", data.sections.operatingExpenses, true).map(r => formatRow(r.Account, r.Amount)),

            [{ content: "OPERATING PROFIT", styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.operatingProfit.amount), styles: { fontStyle: 'bold', halign: 'right', textColor: [0, 0, 150] } }],

            [{ content: "NET PROFIT", styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmt(data.sections.netProfit.amount), styles: { fontStyle: 'bold', halign: 'right', fontSize: 10, textColor: data.sections.netProfit.amount >= 0 ? [0, 150, 0] : [200, 0, 0] } }]
        ];

        tableBody = tableBody.map(row => {
            if (row.length === 2 && typeof row[0] === 'string' && row[0].startsWith("Total")) {
                const newRow = [{ content: row[0], styles: { fontStyle: 'italic' } }, row[1]];
                return newRow;
            }
            return row;
        });

        autoTable(doc, {
            startY: 34,
            head: [["Account", "Amount"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', cellWidth: 40 }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`Income_Statement_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    const SectionRow = ({ label, items, total, isSubtraction }: { label: string; items: any[]; total: number; isSubtraction?: boolean }) => (
        <>
            <tr className="bg-white/[0.02]"><td className="px-4 py-2 font-semibold text-slate-200 uppercase text-[10px] tracking-wider" colSpan={2}>{label}</td></tr>
            {items.map((item: any) => (
                <tr key={item.coaId} className="hover:bg-white/[0.02]">
                    <td className="pl-8 pr-3 py-1.5 text-slate-400">{item.code} — {item.name}</td>
                    <td className={cn("px-3 py-1.5 text-right font-mono", isSubtraction ? "text-red-400" : "text-white")}>{isSubtraction ? `(${fmt(item.amount)})` : fmt(item.amount)}</td>
                </tr>
            ))}
            <tr className="border-t border-white/[0.06]">
                <td className="pl-8 pr-3 py-1.5 text-slate-300 font-medium text-xs">Total {label}</td>
                <td className={cn("px-3 py-1.5 text-right font-mono font-medium", isSubtraction ? "text-red-400" : "text-white")}>{isSubtraction ? `(${fmt(total)})` : fmt(total)}</td>
            </tr>
        </>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-400" /> Income Statement</h2><p className="text-xs text-slate-400">Profit & Loss report</p></div>
            </div>
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !startDate && "text-slate-500")}>
                                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !endDate && "text-slate-500")}>
                                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>

            {data && (
                <>
                    <div className="flex justify-end gap-2 mb-4">
                        <Button variant="outline" onClick={handleExportExcel} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> Excel
                        </Button>
                        <Button variant="outline" onClick={handleExportPdf} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> PDF
                        </Button>
                    </div>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Revenue</p><p className="text-xl font-bold text-white font-mono mt-1">{fmt(data.summary.totalRevenue)}</p></div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4"><p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Expenses</p><p className="text-xl font-bold text-red-400 font-mono mt-1">({fmt(data.summary.totalExpenses)})</p></div>
                        <div className={cn("rounded-xl p-4 border", data.summary.netProfit >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Net Profit</p>
                            <p className={cn("text-xl font-bold font-mono mt-1", data.summary.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(data.summary.netProfit)}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Margin: {data.summary.netMargin}%</p>
                        </div>
                    </div>

                    {/* P&L Table */}
                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                                <tr><th className="px-4 py-2 text-left">Account</th><th className="px-3 py-2 text-right">Amount</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                <SectionRow label="Revenue" items={data.sections.revenue.items} total={data.sections.revenue.total} />
                                {data.sections.cogs.items.length > 0 && <SectionRow label="Cost of Goods Sold" items={data.sections.cogs.items} total={data.sections.cogs.total} isSubtraction />}

                                {/* Gross Profit */}
                                <tr className="bg-emerald-500/5 border-t-2 border-emerald-500/20">
                                    <td className="px-4 py-2 font-bold text-emerald-300">GROSS PROFIT</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">{fmt(data.sections.grossProfit.amount)} <span className="text-[10px] text-emerald-500/60">({data.sections.grossProfit.margin}%)</span></td>
                                </tr>

                                <SectionRow label="Operating Expenses" items={data.sections.operatingExpenses.items} total={data.sections.operatingExpenses.total} isSubtraction />

                                {/* Operating Profit */}
                                <tr className="bg-blue-500/5 border-t-2 border-blue-500/20">
                                    <td className="px-4 py-2 font-bold text-blue-300">OPERATING PROFIT</td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-blue-400">{fmt(data.sections.operatingProfit.amount)} <span className="text-[10px] text-blue-500/60">({data.sections.operatingProfit.margin}%)</span></td>
                                </tr>

                                {/* Net Profit */}
                                <tr className={cn("border-t-2", data.sections.netProfit.amount >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
                                    <td className={cn("px-4 py-3 font-bold text-lg", data.sections.netProfit.amount >= 0 ? "text-emerald-300" : "text-red-300")}>NET PROFIT</td>
                                    <td className={cn("px-3 py-3 text-right font-mono font-bold text-lg", data.sections.netProfit.amount >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(data.sections.netProfit.amount)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
