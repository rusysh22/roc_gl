"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Banknote, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CashFlowPage() {
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
            const res = await fetch(`/api/reports/cash-flow?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
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
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period</Label><Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setSelectedFY(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs text-slate-400">or Fiscal Year</Label><Select value={selectedFY} onValueChange={(v) => { setSelectedFY(v); setSelectedPeriod(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{fiscalYears.map((fy: any) => <SelectItem key={fy.id} value={fy.id} className="text-xs">{fy.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
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
            )}
        </div>
    );
}
