"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Landmark, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function BalanceSheetPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [data, setData] = useState<any>(null);

    useEffect(() => { fetch("/api/master/period").then(r => r.ok ? r.json() : []).then(setPeriods); }, []);

    const handleGenerate = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedPeriod) params.set("periodId", selectedPeriod);
        try {
            const res = await fetch(`/api/reports/balance-sheet?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
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
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period (As of)</Label><Select value={selectedPeriod} onValueChange={setSelectedPeriod}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Latest" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-amber-600 hover:bg-amber-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <>
                    <div className={cn("rounded-xl p-4 border flex items-center gap-3", data.validation.isBalanced ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                        {data.validation.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                        <div>
                            <p className={cn("font-semibold text-sm", data.validation.isBalanced ? "text-emerald-400" : "text-red-400")}>{data.validation.isBalanced ? "BALANCED — Assets = Liabilities + Equity ✓" : `UNBALANCED — Difference: ${fmt(data.validation.difference)}`}</p>
                            <p className="text-[10px] text-slate-500">Assets: {fmt(data.validation.totalAssets)} | L+E: {fmt(data.validation.totalLiabilitiesAndEquity)}</p>
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
