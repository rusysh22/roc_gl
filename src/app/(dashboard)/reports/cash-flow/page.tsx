"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Banknote, Search, Download } from "lucide-react";
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

export default function CashFlowPage() {
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
            const res = await fetch(`/api/reports/cash-flow?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const formatRow = (name: string, amount: number) => ({
        Description: name,
        Amount: amount
    });

    const handleExportExcel = () => {
        if (!data) return;

        const exportData = [
            { Description: "OPERATING ACTIVITIES", Amount: "" },
            { Description: "Net Profit", Amount: data.sections.operating.netProfit },
            { Description: "Adjustments:", Amount: "" },
            ...data.sections.operating.adjustments.map((a: any) => formatRow(`  ${a.name}`, a.amount)),
            { Description: "Net Cash from Operating", Amount: data.sections.operating.total },
            { Description: "", Amount: "" },

            { Description: "INVESTING ACTIVITIES", Amount: "" },
            ...data.sections.investing.items.map((a: any) => formatRow(`  ${a.name}`, a.amount)),
            { Description: "Net Cash from Investing", Amount: data.sections.investing.total },
            { Description: "", Amount: "" },

            { Description: "FINANCING ACTIVITIES", Amount: "" },
            ...data.sections.financing.items.map((a: any) => formatRow(`  ${a.name}`, a.amount)),
            { Description: "Net Cash from Financing", Amount: data.sections.financing.total },
            { Description: "", Amount: "" },

            { Description: "Net Increase/(Decrease) in Cash", Amount: data.summary.netCashChange },
            { Description: "Opening Cash", Amount: data.summary.openingCash },
            { Description: "CLOSING CASH", Amount: data.summary.closingCash }
        ];

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 60 }, { wch: 20 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
        XLSX.writeFile(wb, `Cash_Flow_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Cash Flow Statement", 14, 20);
        doc.setFontSize(10);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")}`, 14, 28);
        }

        const formatPdfRow = (desc: string, amt: any, indent = false) => [
            { content: desc, styles: { cellPadding: { left: indent ? 10 : 2 } } },
            amt !== "" ? fmt(amt) : ""
        ];

        const tableBody: any[][] = [
            [{ content: "OPERATING ACTIVITIES", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 255, 240] } }],
            ["Net Profit", fmt(data.sections.operating.netProfit)],
            [{ content: "Adjustments:", colSpan: 2, styles: { fontStyle: 'italic', textColor: [100, 100, 100] } }],
            ...data.sections.operating.adjustments.map((a: any) => formatPdfRow(a.name, a.amount, true)),
            [{ content: "Net Cash from Operating", styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.operating.total), styles: { fontStyle: 'bold', halign: 'right' } }],

            [{ content: "INVESTING ACTIVITIES", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
            ...data.sections.investing.items.map((a: any) => formatPdfRow(a.name, a.amount, true)),
            ...(data.sections.investing.items.length === 0 ? [[{ content: "No investing activities", colSpan: 2, styles: { fontStyle: 'italic', textColor: [150, 150, 150] } }]] : []),
            [{ content: "Net Cash from Investing", styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.investing.total), styles: { fontStyle: 'bold', halign: 'right' } }],

            [{ content: "FINANCING ACTIVITIES", colSpan: 2, styles: { fontStyle: 'bold', fillColor: [248, 240, 255] } }],
            ...data.sections.financing.items.map((a: any) => formatPdfRow(a.name, a.amount, true)),
            ...(data.sections.financing.items.length === 0 ? [[{ content: "No financing activities", colSpan: 2, styles: { fontStyle: 'italic', textColor: [150, 150, 150] } }]] : []),
            [{ content: "Net Cash from Financing", styles: { fontStyle: 'bold' } }, { content: fmt(data.sections.financing.total), styles: { fontStyle: 'bold', halign: 'right' } }],

            [{ content: "Net Increase/(Decrease) in Cash", styles: { fontStyle: 'bold' } }, { content: fmt(data.summary.netCashChange), styles: { fontStyle: 'bold', halign: 'right' } }],
            ["Opening Cash", fmt(data.summary.openingCash)],
            [{ content: "CLOSING CASH", styles: { fontStyle: 'bold', fontSize: 10 } }, { content: fmt(data.summary.closingCash), styles: { fontStyle: 'bold', halign: 'right', fontSize: 10 } }]
        ];

        autoTable(doc, {
            startY: 34,
            head: [["Description", "Amount"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', cellWidth: 40 }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`Cash_Flow_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Banknote className="h-5 w-5 text-cyan-400" /> Cash Flow Statement</h2><p className="text-xs text-slate-400">Indirect method — Operating, Investing, Financing</p></div>
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
                    <Button onClick={handleGenerate} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
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
                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-white/[0.03]">
                                {/* Operating */}
                                <tr className="bg-emerald-500/5"><td className="px-4 py-2 font-bold text-emerald-300 uppercase text-[10px] tracking-wider" colSpan={2}>Operating Activities</td></tr>
                                <tr><td className="pl-8 pr-3 py-1.5 text-slate-300">Net Profit</td><td className={cn("px-3 py-1.5 text-right font-mono", data.sections.operating.netProfit >= 0 ? "text-white" : "text-red-400")}>{fmt(data.sections.operating.netProfit)}</td></tr>
                                <tr className="bg-white/[0.02]"><td className="pl-8 pr-3 py-1 text-[10px] text-slate-500 uppercase" colSpan={2}>Adjustments:</td></tr>
                                {data.sections.operating.adjustments.map((a: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02]"><td className="pl-12 pr-3 py-1 text-slate-400">{a.name}</td><td className={cn("px-3 py-1 text-right font-mono", a.amount >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(a.amount)}</td></tr>
                                ))}
                                <tr className="border-t border-emerald-500/20 bg-emerald-500/5"><td className="px-4 py-2 font-semibold text-emerald-300">Net Cash from Operating</td><td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">{fmt(data.sections.operating.total)}</td></tr>

                                {/* Investing */}
                                <tr className="bg-blue-500/5"><td className="px-4 py-2 font-bold text-blue-300 uppercase text-[10px] tracking-wider" colSpan={2}>Investing Activities</td></tr>
                                {data.sections.investing.items.map((a: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02]"><td className="pl-8 pr-3 py-1 text-slate-400">{a.name}</td><td className={cn("px-3 py-1 text-right font-mono", a.amount >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(a.amount)}</td></tr>
                                ))}
                                {data.sections.investing.items.length === 0 && <tr><td className="pl-8 pr-3 py-1 text-slate-600 italic" colSpan={2}>No investing activities</td></tr>}
                                <tr className="border-t border-blue-500/20 bg-blue-500/5"><td className="px-4 py-2 font-semibold text-blue-300">Net Cash from Investing</td><td className="px-3 py-2 text-right font-mono font-bold text-blue-400">{fmt(data.sections.investing.total)}</td></tr>

                                {/* Financing */}
                                <tr className="bg-violet-500/5"><td className="px-4 py-2 font-bold text-violet-300 uppercase text-[10px] tracking-wider" colSpan={2}>Financing Activities</td></tr>
                                {data.sections.financing.items.map((a: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02]"><td className="pl-8 pr-3 py-1 text-slate-400">{a.name}</td><td className={cn("px-3 py-1 text-right font-mono", a.amount >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(a.amount)}</td></tr>
                                ))}
                                {data.sections.financing.items.length === 0 && <tr><td className="pl-8 pr-3 py-1 text-slate-600 italic" colSpan={2}>No financing activities</td></tr>}
                                <tr className="border-t border-violet-500/20 bg-violet-500/5"><td className="px-4 py-2 font-semibold text-violet-300">Net Cash from Financing</td><td className="px-3 py-2 text-right font-mono font-bold text-violet-400">{fmt(data.sections.financing.total)}</td></tr>
                            </tbody>
                            <tfoot className="bg-[#0a0e1a] border-t-2 border-cyan-500/30">
                                <tr><td className="px-4 py-2 text-cyan-300 font-semibold">Net Increase/(Decrease) in Cash</td><td className={cn("px-3 py-2 text-right font-mono font-bold", data.summary.netCashChange >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(data.summary.netCashChange)}</td></tr>
                                <tr><td className="px-4 py-1.5 text-slate-400">Opening Cash</td><td className="px-3 py-1.5 text-right font-mono text-slate-300">{fmt(data.summary.openingCash)}</td></tr>
                                <tr className="border-t border-cyan-500/20"><td className="px-4 py-2 text-cyan-300 font-bold">CLOSING CASH</td><td className="px-3 py-2 text-right font-mono font-bold text-white text-base">{fmt(data.summary.closingCash)}</td></tr>
                            </tfoot>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
