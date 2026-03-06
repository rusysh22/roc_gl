"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Gauge, Search, CheckCircle, AlertTriangle, XCircle, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinancialRatiosPage() {
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
            const res = await fetch(`/api/reports/financial-ratios?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const handleExportExcel = () => {
        if (!data) return;

        const exportData: any[] = [];

        exportData.push(
            { Category: "KEY FIGURES", Ratio: "", Value: "", Benchmark: "", Health: "", Formula: "" },
            { Category: "", Ratio: "Total Assets", Value: data.figures.totalAssets, Benchmark: "", Health: "", Formula: "" },
            { Category: "", Ratio: "Total Liabilities", Value: data.figures.totalLiabilities, Benchmark: "", Health: "", Formula: "" },
            { Category: "", Ratio: "Revenue", Value: data.figures.totalRevenue, Benchmark: "", Health: "", Formula: "" },
            { Category: "", Ratio: "Net Profit", Value: data.figures.netProfit, Benchmark: "", Health: "", Formula: "" },
            { Category: "", Ratio: "", Value: "", Benchmark: "", Health: "", Formula: "" }
        );

        const pushRatios = (title: string, ratios: any[]) => {
            exportData.push({ Category: title, Ratio: "", Value: "", Benchmark: "", Health: "", Formula: "" });
            ratios.forEach((r: any) => {
                exportData.push({
                    Category: "",
                    Ratio: r.name,
                    Value: `${r.value}${r.unit === "%" ? "%" : "x"}`,
                    Benchmark: r.benchmark,
                    Health: r.health,
                    Formula: r.formula
                });
            });
            exportData.push({ Category: "", Ratio: "", Value: "", Benchmark: "", Health: "", Formula: "" });
        };

        pushRatios("LIQUIDITY & LEVERAGE", data.ratios.liquidity);
        pushRatios("PROFITABILITY", data.ratios.profitability);
        pushRatios("ACTIVITY", data.ratios.activity);

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 40 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financial Ratios");
        XLSX.writeFile(wb, `Financial_Ratios_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Financial Ratios Report", 14, 20);
        doc.setFontSize(10);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")}`, 14, 28);
        }

        const body: any[] = [];

        body.push(
            [{ content: "KEY FIGURES", colSpan: 5, styles: { fontStyle: 'bold', fillColor: [240, 248, 255] } }],
            ["Total Assets", fmt(data.figures.totalAssets), "", "", ""],
            ["Total Liabilities", fmt(data.figures.totalLiabilities), "", "", ""],
            ["Revenue", fmt(data.figures.totalRevenue), "", "", ""],
            ["Net Profit", fmt(data.figures.netProfit), "", "", ""]
        );

        const pushRatios = (title: string, ratios: any[]) => {
            body.push([{ content: title, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }]);
            ratios.forEach((r: any) => {
                let healthColor = [100, 100, 100];
                if (r.health === "HEALTHY") healthColor = [0, 150, 0];
                else if (r.health === "WARNING") healthColor = [200, 150, 0];
                else if (r.health === "CRITICAL") healthColor = [200, 0, 0];

                body.push([
                    r.name,
                    { content: `${r.value}${r.unit === "%" ? "%" : "x"}`, styles: { fontStyle: 'bold' } },
                    r.benchmark,
                    { content: r.health, styles: { textColor: healthColor, fontStyle: 'bold' } },
                    r.formula
                ]);
            });
        };

        pushRatios("LIQUIDITY & LEVERAGE", data.ratios.liquidity);
        pushRatios("PROFITABILITY", data.ratios.profitability);
        pushRatios("ACTIVITY", data.ratios.activity);

        autoTable(doc, {
            startY: 34,
            head: [["Metric / Ratio", "Value", "Benchmark", "Health", "Formula"]],
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 25 },
                2: { cellWidth: 35 },
                3: { cellWidth: 25 },
                4: { cellWidth: 'auto', fontSize: 7 }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`Financial_Ratios_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0 });
    const healthIcon = (h: string) => {
        switch (h) {
            case "HEALTHY": return <CheckCircle className="h-4 w-4 text-emerald-400" />;
            case "WARNING": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
            default: return <XCircle className="h-4 w-4 text-red-400" />;
        }
    };
    const healthColor = (h: string) => {
        switch (h) {
            case "HEALTHY": return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
            case "WARNING": return "bg-amber-500/10 border-amber-500/20 text-amber-400";
            default: return "bg-red-500/10 border-red-500/20 text-red-400";
        }
    };

    const RatioCard = ({ ratio }: { ratio: any }) => (
        <div className={cn("rounded-xl p-4 border", healthColor(ratio.health))}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">{ratio.name}</span>
                {healthIcon(ratio.health)}
            </div>
            <p className="text-2xl font-bold font-mono text-white">
                {ratio.value}{ratio.unit === "%" ? "%" : "x"}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">{ratio.formula}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Benchmark: {ratio.benchmark}</p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Gauge className="h-5 w-5 text-orange-400" /> Financial Ratios</h2><p className="text-xs text-slate-400">Key financial health indicators with benchmarks</p></div>
            </div>
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
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
                    <Button onClick={handleGenerate} disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white h-9 sm:col-span-2">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <>
                    <div className="flex justify-end gap-2 mb-4 mt-6">
                        <Button variant="outline" onClick={handleExportExcel} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> Excel
                        </Button>
                        <Button variant="outline" onClick={handleExportPdf} className="h-9 bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                            <Download className="h-4 w-4 mr-2" /> PDF
                        </Button>
                    </div>
                    {/* Key Figures */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-[#111827] border border-white/[0.08] rounded-lg p-3"><p className="text-[9px] text-slate-500 uppercase">Total Assets</p><p className="text-sm font-bold text-white font-mono">{fmt(data.figures.totalAssets)}</p></div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-lg p-3"><p className="text-[9px] text-slate-500 uppercase">Total Liabilities</p><p className="text-sm font-bold text-white font-mono">{fmt(data.figures.totalLiabilities)}</p></div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-lg p-3"><p className="text-[9px] text-slate-500 uppercase">Revenue</p><p className="text-sm font-bold text-white font-mono">{fmt(data.figures.totalRevenue)}</p></div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-lg p-3"><p className="text-[9px] text-slate-500 uppercase">Net Profit</p><p className={cn("text-sm font-bold font-mono", data.figures.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(data.figures.netProfit)}</p></div>
                    </div>

                    <div className="space-y-4">
                        <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Liquidity & Leverage</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{data.ratios.liquidity.map((r: any) => <RatioCard key={r.name} ratio={r} />)}</div></div>
                        <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Profitability</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{data.ratios.profitability.map((r: any) => <RatioCard key={r.name} ratio={r} />)}</div></div>
                        <div><h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Activity</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-3">{data.ratios.activity.map((r: any) => <RatioCard key={r.name} ratio={r} />)}</div></div>
                    </div>
                </>
            )}
        </div>
    );
}
