"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function IncomeStatementPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [periods, setPeriods] = useState<any[]>([]);
    const [fiscalYears, setFiscalYears] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [selectedFY, setSelectedFY] = useState("");
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        Promise.all([
            fetch("/api/master/period").then(r => r.ok ? r.json() : []),
            fetch("/api/master/fiscal-year").then(r => r.ok ? r.json() : []),
        ]).then(([p, fy]) => { setPeriods(p); setFiscalYears(fy); });
    }, []);

    const handleGenerate = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedPeriod) params.set("periodId", selectedPeriod);
        else if (selectedFY) params.set("fiscalYearId", selectedFY);
        try {
            const res = await fetch(`/api/reports/income-statement?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
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
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period</Label><Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setSelectedFY(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs text-slate-400">or Fiscal Year</Label><Select value={selectedFY} onValueChange={(v) => { setSelectedFY(v); setSelectedPeriod(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{fiscalYears.map((fy: any) => <SelectItem key={fy.id} value={fy.id} className="text-xs">{fy.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>

            {data && (
                <>
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
