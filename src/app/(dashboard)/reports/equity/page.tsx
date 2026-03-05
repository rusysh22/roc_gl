"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Users, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EquityPage() {
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
            const res = await fetch(`/api/reports/equity?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
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
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period</Label><Select value={selectedPeriod} onValueChange={(v) => { setSelectedPeriod(v); setSelectedFY(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-1"><Label className="text-xs text-slate-400">or Fiscal Year</Label><Select value={selectedFY} onValueChange={(v) => { setSelectedFY(v); setSelectedPeriod(""); }}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{fiscalYears.map((fy: any) => <SelectItem key={fy.id} value={fy.id} className="text-xs">{fy.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-pink-600 hover:bg-pink-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
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
