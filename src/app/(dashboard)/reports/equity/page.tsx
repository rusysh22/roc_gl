"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Users, Search, Download } from "lucide-react";
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

export default function EquityPage() {
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
            const res = await fetch(`/api/reports/equity?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const handleExportExcel = () => {
        if (!data) return;

        const exportData = data.components.map((c: any) => ({
            Component: `${c.code} — ${c.name}`,
            Opening: c.openingBalance,
            Additions: c.additions || "",
            Deductions: c.deductions ? -c.deductions : "",
            Closing: c.closingBalance
        }));

        exportData.push({
            Component: "Net Profit (from P&L)",
            Opening: "",
            Additions: data.netProfit >= 0 ? data.netProfit : "",
            Deductions: data.netProfit < 0 ? data.netProfit : "",
            Closing: data.netProfit
        });

        exportData.push({
            Component: "TOTAL EQUITY",
            Opening: data.totalOpening,
            Additions: "",
            Deductions: "",
            Closing: data.totalClosing
        });

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Changes in Equity");
        XLSX.writeFile(wb, `Changes_In_Equity_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Statement of Changes in Equity", 14, 20);
        doc.setFontSize(10);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")}`, 14, 28);
        }

        const body: any[] = data.components.map((c: any) => [
            `${c.code} — ${c.name}${c.isRetainedEarnings ? " (RE)" : ""}`,
            fmt(c.openingBalance),
            c.additions > 0 ? fmt(c.additions) : "-",
            c.deductions > 0 ? `(${fmt(c.deductions)})` : "-",
            fmt(c.closingBalance)
        ]);

        body.push([
            { content: "Net Profit (from P&L)", styles: { fontStyle: 'italic' } },
            "-",
            data.netProfit >= 0 ? fmt(data.netProfit) : "-",
            data.netProfit < 0 ? `(${fmt(Math.abs(data.netProfit))})` : "-",
            fmt(data.netProfit)
        ]);

        body.push([
            { content: "TOTAL EQUITY", styles: { fontStyle: 'bold' } },
            { content: fmt(data.totalOpening), styles: { fontStyle: 'bold', halign: 'right' } },
            "",
            "",
            { content: fmt(data.totalClosing), styles: { fontStyle: 'bold', halign: 'right' } }
        ]);

        autoTable(doc, {
            startY: 34,
            head: [["Component", "Opening", "Additions", "Deductions", "Closing"]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', cellWidth: 25 },
                2: { halign: 'right', cellWidth: 25, textColor: [0, 150, 0] },
                3: { halign: 'right', cellWidth: 25, textColor: [200, 0, 0] },
                4: { halign: 'right', cellWidth: 25, fontStyle: 'bold' }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`Changes_In_Equity_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="h-5 w-5 text-pink-400" /> Statement of Changes in Equity</h2><p className="text-xs text-slate-400">Equity movement analysis</p></div>
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
                    <Button onClick={handleGenerate} disabled={loading} className="bg-pink-600 hover:bg-pink-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden mt-6">
                    <div className="p-4 border-b border-white/[0.06] flex justify-end gap-2">
                        <Button variant="outline" onClick={handleExportExcel} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> Excel
                        </Button>
                        <Button variant="outline" onClick={handleExportPdf} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> PDF
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold"><tr><th className="px-4 py-2 text-left">Component</th><th className="px-3 py-2 text-right">Opening</th><th className="px-3 py-2 text-right text-emerald-500">Additions</th><th className="px-3 py-2 text-right text-red-500">Deductions</th><th className="px-3 py-2 text-right">Closing</th></tr></thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {data.components.map((c: any) => (
                                    <tr key={c.coaId} className="hover:bg-white/[0.02]">
                                        <td className="px-4 py-2 text-slate-200">{c.code} — {c.name}{c.isRetainedEarnings && <span className="text-[9px] text-violet-400 ml-1">(RE)</span>}</td>
                                        <td className="px-3 py-2 text-right font-mono text-slate-400">{fmt(c.openingBalance)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{c.additions > 0 ? fmt(c.additions) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{c.deductions > 0 ? `(${fmt(c.deductions)})` : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white font-medium">{fmt(c.closingBalance)}</td>
                                    </tr>
                                ))}
                                <tr className="bg-violet-500/5"><td className="px-4 py-2 text-violet-300 italic">Net Profit (from P&L)</td><td className="px-3 py-2 text-right font-mono text-slate-500">-</td><td className="px-3 py-2 text-right font-mono text-emerald-400">{data.netProfit >= 0 ? fmt(data.netProfit) : "-"}</td><td className="px-3 py-2 text-right font-mono text-red-400">{data.netProfit < 0 ? `(${fmt(Math.abs(data.netProfit))})` : "-"}</td><td className="px-3 py-2 text-right font-mono text-violet-400 font-medium">{fmt(data.netProfit)}</td></tr>
                            </tbody>
                            <tfoot className="bg-[#0a0e1a] border-t-2 border-pink-500/20">
                                <tr><td className="px-4 py-2 font-bold text-pink-300">TOTAL EQUITY</td><td className="px-3 py-2 text-right font-mono text-slate-400">{fmt(data.totalOpening)}</td><td className="px-3 py-2" colSpan={2}></td><td className="px-3 py-2 text-right font-mono font-bold text-white">{fmt(data.totalClosing)}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
