"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Gauge, Search, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FinancialRatiosPage() {
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
            const res = await fetch(`/api/reports/financial-ratios?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
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
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period</Label><Select value={selectedPeriod} onValueChange={setSelectedPeriod}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Latest" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-orange-600 hover:bg-orange-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>
            {data && (
                <>
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
