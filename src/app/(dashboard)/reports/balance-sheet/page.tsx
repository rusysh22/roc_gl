"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Landmark, Search, AlertTriangle, CheckCircle, Download } from "lucide-react";
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

export default function BalanceSheetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [asOfDate, setAsOfDate] = useState<Date | undefined>(new Date());

    const handleGenerate = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (asOfDate) params.set("asOfDate", format(asOfDate, "yyyy-MM-dd"));
        try {
            const res = await fetch(`/api/reports/balance-sheet?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const flatSection = (sectionName: string, sectionData: any, isSubtraction = false) => {
        const rows = [
            { Category: sectionName, Code: "", Account: "", Balance: "" },
            ...sectionData.items.map((i: any) => ({
                Category: "",
                Code: i.code,
                Account: i.name,
                Balance: isSubtraction ? -i.balance : i.balance
            })),
            { Category: `Total ${sectionName}`, Code: "", Account: "", Balance: isSubtraction ? -sectionData.total : sectionData.total }
        ];
        return rows;
    };

    const handleExportExcel = () => {
        if (!data) return;

        const exportData = [
            { Category: "ASSETS", Code: "", Account: "", Balance: "" },
            ...flatSection("Current Assets", data.sections.currentAssets),
            ...flatSection("Non-Current Assets", data.sections.nonCurrentAssets),
            { Category: "TOTAL ASSETS", Code: "", Account: "", Balance: data.sections.totalAssets },
            { Category: "", Code: "", Account: "", Balance: "" },
            { Category: "LIABILITIES & EQUITY", Code: "", Account: "", Balance: "" },
            ...flatSection("Current Liabilities", data.sections.currentLiabilities),
            ...flatSection("Non-Current Liabilities", data.sections.nonCurrentLiabilities),
            ...flatSection("Equity", data.sections.equity),
            { Category: "", Code: "", Account: "Retained Earnings", Balance: data.sections.retainedEarnings },
            { Category: "TOTAL LIABILITIES & EQUITY", Code: "", Account: "", Balance: data.sections.totalLiabilities + data.sections.totalEquity }
        ];

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
        XLSX.writeFile(wb, `Balance_Sheet_${format(asOfDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Balance Sheet", 14, 20);
        doc.setFontSize(10);
        doc.text(`As of: ${format(asOfDate || new Date(), "dd/MM/yyyy")}`, 14, 28);

        const formatRow = (cat: string, code: string, acc: string, bal: any) => [
            cat, code, acc, bal !== "" ? fmt(bal) : ""
        ];

        let tableBody: any[] = [
            [{ content: "ASSETS", colSpan: 4, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
            ...flatSection("Current Assets", data.sections.currentAssets).filter(r => r.Category !== "ASSETS").map(r => formatRow(r.Category, r.Code, r.Account, r.Balance)),
            ...flatSection("Non-Current Assets", data.sections.nonCurrentAssets).map(r => formatRow(r.Category, r.Code, r.Account, r.Balance)),
            [{ content: "TOTAL ASSETS", colSpan: 3, styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.totalAssets), styles: { fontStyle: 'bold', halign: 'right' } }],

            [{ content: "LIABILITIES & EQUITY", colSpan: 4, styles: { fontStyle: 'bold', fillColor: [255, 250, 240] } }],
            ...flatSection("Current Liabilities", data.sections.currentLiabilities).filter(r => r.Category !== "LIABILITIES & EQUITY").map(r => formatRow(r.Category, r.Code, r.Account, r.Balance)),
            ...flatSection("Non-Current Liabilities", data.sections.nonCurrentLiabilities).map(r => formatRow(r.Category, r.Code, r.Account, r.Balance)),
            ...flatSection("Equity", data.sections.equity).map(r => formatRow(r.Category, r.Code, r.Account, r.Balance)),
            ["", "", "Retained Earnings", fmt(data.sections.retainedEarnings)],
            [{ content: "TOTAL LIAB & EQUITY", colSpan: 3, styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.totalLiabilities + data.sections.totalEquity), styles: { fontStyle: 'bold', halign: 'right' } }]
        ];

        tableBody = tableBody.map(row => {
            if (row.length === 4 && typeof row[0] === 'string' && row[0].startsWith("Total")) {
                const newRow = [{ content: row[0], colSpan: 3, styles: { fontStyle: 'italic' } }, row[3]];
                return newRow;
            }
            return row;
        });

        autoTable(doc, {
            startY: 34,
            head: [["Category", "Code", "Account", "Balance"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 25 },
                2: { cellWidth: 'auto' },
                3: { halign: 'right', cellWidth: 35 }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`Balance_Sheet_${format(asOfDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    const Section = ({ title, items, total, color }: { title: string; items: any[]; total: number; color: string }) => (
        <>
            <tr className="bg-white/[0.02]"><td className={cn("px-4 py-2 font-semibold uppercase text-[10px] tracking-wider", color)} colSpan={2}>{title}</td></tr>
            {items.map((i: any) => (
                <tr key={i.coaId} className="hover:bg-white/[0.02]">
                    <td className="pl-8 pr-3 py-1.5 text-slate-400 text-xs">{i.code} — {i.name}</td>
                    <td className={cn("px-3 py-1.5 text-right font-mono text-xs", i.balance < 0 ? "text-red-400" : "text-white")}>{fmt(i.balance)}</td>
                </tr>
            ))}
            <tr className="border-t border-white/[0.06]">
                <td className="pl-8 pr-3 py-1.5 text-xs text-slate-300 font-medium">Total {title}</td>
                <td className="px-3 py-1.5 text-right font-mono font-medium text-xs text-white">{fmt(total)}</td>
            </tr>
        </>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Landmark className="h-5 w-5 text-amber-400" /> Balance Sheet</h2><p className="text-xs text-slate-400">Statement of Financial Position</p></div>
            </div>
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">As of Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !asOfDate && "text-slate-500")}>
                                    {asOfDate ? format(asOfDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={asOfDate} onSelect={setAsOfDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                        <div className={cn("rounded-xl p-4 border flex items-center gap-3 w-full sm:w-auto", data.validation.isBalanced ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                            {data.validation.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                            <div>
                                <p className={cn("font-semibold text-sm", data.validation.isBalanced ? "text-emerald-400" : "text-red-400")}>{data.validation.isBalanced ? "BALANCED — Assets = Liabilities + Equity ✓" : `UNBALANCED — Difference: ${fmt(data.validation.difference)}`}</p>
                                <p className="text-[10px] text-slate-500">Assets: {fmt(data.validation.totalAssets)} | L+E: {fmt(data.validation.totalLiabilitiesAndEquity)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleExportExcel} className="h-10 sm:h-9 flex-1 sm:flex-none bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                                <Download className="h-4 w-4 mr-2" /> Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportPdf} className="h-10 sm:h-9 flex-1 sm:flex-none bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                                <Download className="h-4 w-4 mr-2" /> PDF
                            </Button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Assets Side */}
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-white/[0.06] bg-blue-500/5"><h3 className="text-sm font-bold text-blue-300">ASSETS</h3></div>
                            <table className="w-full text-xs"><tbody className="divide-y divide-white/[0.03]">
                                <Section title="Current Assets" items={data.sections.currentAssets.items} total={data.sections.currentAssets.total} color="text-blue-300" />
                                <Section title="Non-Current Assets" items={data.sections.nonCurrentAssets.items} total={data.sections.nonCurrentAssets.total} color="text-blue-300" />
                            </tbody><tfoot className="bg-[#0a0e1a] border-t-2 border-blue-500/20"><tr><td className="px-4 py-2 font-bold text-blue-300">TOTAL ASSETS</td><td className="px-3 py-2 text-right font-mono font-bold text-white">{fmt(data.sections.totalAssets)}</td></tr></tfoot></table>
                        </div>
                        {/* Liabilities + Equity Side */}
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-white/[0.06] bg-amber-500/5"><h3 className="text-sm font-bold text-amber-300">LIABILITIES & EQUITY</h3></div>
                            <table className="w-full text-xs"><tbody className="divide-y divide-white/[0.03]">
                                <Section title="Current Liabilities" items={data.sections.currentLiabilities.items} total={data.sections.currentLiabilities.total} color="text-amber-300" />
                                <Section title="Non-Current Liabilities" items={data.sections.nonCurrentLiabilities.items} total={data.sections.nonCurrentLiabilities.total} color="text-amber-300" />
                                <Section title="Equity" items={data.sections.equity.items} total={data.sections.equity.total} color="text-violet-300" />
                                <tr className="bg-violet-500/5"><td className="pl-8 pr-3 py-1.5 text-xs text-violet-400 italic">Retained Earnings (Net Profit)</td><td className="px-3 py-1.5 text-right font-mono text-xs text-violet-400">{fmt(data.sections.retainedEarnings)}</td></tr>
                            </tbody><tfoot className="bg-[#0a0e1a] border-t-2 border-amber-500/20"><tr><td className="px-4 py-2 font-bold text-amber-300">TOTAL LIABILITIES & EQUITY</td><td className="px-3 py-2 text-right font-mono font-bold text-white">{fmt(data.sections.totalLiabilities + data.sections.totalEquity)}</td></tr></tfoot></table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
