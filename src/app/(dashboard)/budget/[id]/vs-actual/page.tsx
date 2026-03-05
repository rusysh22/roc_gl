"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, TrendingUp, TrendingDown, BarChart3, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface ComparisonLine {
    coaCode: string;
    coaName: string;
    accountType: string;
    budgetPeriods: number[];
    budgetTotal: number;
    actualPeriods: number[];
    actualTotal: number;
    variance: number;
    variancePercent: number;
    periodVariances: number[];
}

export default function BudgetVsActualPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const budgetId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch(`/api/budget/${budgetId}/vs-actual`);
                if (res.ok) setData(await res.json());
                else toast.error("Failed to load comparison");
            } catch { toast.error("System error"); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [budgetId]);

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" /></div>;
    if (!data) return null;

    const { budget, comparison, summary } = data;
    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0 });
    const isPositive = summary.totalVariance >= 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => router.push(`/budget/${budgetId}`)} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-violet-400" /> Budget vs Actual
                        </h2>
                        <p className="text-xs text-slate-400">{budget.budgetName} • {budget.fiscalYear} • {budget.version}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Budget</p>
                    <p className="text-xl font-bold text-white font-mono mt-1">{fmt(summary.totalBudget)}</p>
                </div>
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Total Actual</p>
                    <p className="text-xl font-bold text-white font-mono mt-1">{fmt(summary.totalActual)}</p>
                </div>
                <div className={cn("rounded-xl p-4 border", isPositive ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        Variance
                        {isPositive ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-red-400" />}
                    </p>
                    <p className={cn("text-xl font-bold font-mono mt-1", isPositive ? "text-emerald-400" : "text-red-400")}>
                        {isPositive ? "+" : ""}{fmt(summary.totalVariance)} <span className="text-xs font-normal">({summary.variancePercent}%)</span>
                    </p>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                            <tr className="border-b border-white/[0.08]">
                                <th className="px-3 py-2.5 text-left sticky left-0 bg-[#0a0e1a] min-w-[180px] z-10" rowSpan={2}>Account</th>
                                {MONTHS.map(m => (
                                    <th key={m} className="px-2 py-1.5 text-center border-l border-white/[0.04]" colSpan={1}>{m}</th>
                                ))}
                                <th className="px-3 py-1.5 text-center border-l border-violet-500/20 bg-[#0a0e1a]" colSpan={1}>Total</th>
                                <th className="px-3 py-1.5 text-center border-l border-violet-500/20 bg-[#0a0e1a]" colSpan={1}>Var%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {comparison.length === 0 ? (
                                <tr><td colSpan={15} className="px-4 py-8 text-center text-slate-500">No budget lines to compare.</td></tr>
                            ) : (
                                comparison.map((line: ComparisonLine) => (
                                    <tr key={line.coaCode} className="hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 sticky left-0 bg-[#111827] z-10">
                                            <div className="text-slate-200 font-medium">{line.coaCode}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{line.coaName}</div>
                                            <div className="flex gap-1 mt-0.5">
                                                <span className="text-[9px] text-violet-400 font-mono">B:{fmt(line.budgetTotal)}</span>
                                                <Minus className="h-2 w-2 text-slate-600 mt-0.5" />
                                                <span className="text-[9px] text-blue-400 font-mono">A:{fmt(line.actualTotal)}</span>
                                            </div>
                                        </td>
                                        {MONTHS.map((_, mi) => {
                                            const v = line.periodVariances[mi] || 0;
                                            return (
                                                <td key={mi} className="px-1.5 py-2 text-right border-l border-white/[0.03]">
                                                    <div className="text-slate-400 font-mono">{fmt(line.budgetPeriods[mi] || 0)}</div>
                                                    <div className="text-blue-400 font-mono text-[10px]">{fmt(line.actualPeriods[mi] || 0)}</div>
                                                    <div className={cn("text-[9px] font-mono", v >= 0 ? "text-emerald-500" : "text-red-500")}>
                                                        {v >= 0 ? "+" : ""}{fmt(v)}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        <td className="px-3 py-2 text-right border-l border-violet-500/20 bg-[#0d1117]">
                                            <div className="text-white font-mono font-medium">{fmt(line.budgetTotal)}</div>
                                            <div className="text-blue-400 font-mono text-[10px]">{fmt(line.actualTotal)}</div>
                                            <div className={cn("font-mono text-[10px] font-semibold", line.variance >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                {line.variance >= 0 ? "+" : ""}{fmt(line.variance)}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-center border-l border-violet-500/20 bg-[#0d1117]">
                                            <Badge
                                                variant="outline"
                                                className={cn("text-[9px] font-mono",
                                                    line.variancePercent >= 20 ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" :
                                                        line.variancePercent >= 0 ? "border-slate-500/20 text-slate-400 bg-slate-500/10" :
                                                            line.variancePercent >= -10 ? "border-amber-500/20 text-amber-400 bg-amber-500/10" :
                                                                "border-red-500/20 text-red-400 bg-red-500/10"
                                                )}
                                            >
                                                {line.variancePercent >= 0 ? "+" : ""}{line.variancePercent}%
                                            </Badge>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
