"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarCheck, AlertTriangle, CheckCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function YearEndPage() {
    const [fiscalYears, setFiscalYears] = useState<any[]>([]);
    const [selectedFY, setSelectedFY] = useState("");
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [executing, setExecuting] = useState(false);

    useEffect(() => { fetch("/api/master/fiscal-year").then(r => r.ok ? r.json() : []).then(setFiscalYears); }, []);

    const handlePreview = async () => {
        if (!selectedFY) { toast.error("Select fiscal year"); return; }
        setLoading(true);
        const res = await fetch("/api/year-end", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fiscalYearId: selectedFY, action: "preview" }),
        });
        if (res.ok) setPreview(await res.json());
        else { const e = await res.json(); toast.error(e.error); }
        setLoading(false);
    };

    const handleExecute = async () => {
        if (!confirm("Are you sure? This will close the fiscal year and cannot be easily undone.")) return;
        setExecuting(true);
        const res = await fetch("/api/year-end", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fiscalYearId: selectedFY, action: "execute" }),
        });
        if (res.ok) { const d = await res.json(); toast.success(d.message); setPreview(null); }
        else { const e = await res.json(); toast.error(e.error); }
        setExecuting(false);
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    return (
        <div className="space-y-6 pb-20">
            <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><CalendarCheck className="h-5 w-5 text-rose-400" /> Year-End Closing</h2><p className="text-xs text-slate-400">Close revenue/expense accounts and transfer net profit to retained earnings</p></div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Fiscal Year *</Label><Select value={selectedFY} onValueChange={setSelectedFY}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{fiscalYears.map((fy: any) => <SelectItem key={fy.id} value={fy.id} className="text-xs">{fy.name} ({fy.status})</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handlePreview} disabled={loading} className="bg-rose-600 hover:bg-rose-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-1" />} Preview Closing</Button>
                </div>
            </div>

            {preview && (
                <>
                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4"><p className="text-[10px] text-slate-500 uppercase">Total Revenue</p><p className="text-xl font-bold text-emerald-400 font-mono mt-1">{fmt(preview.totalRevenue)}</p></div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4"><p className="text-[10px] text-slate-500 uppercase">Total Expenses</p><p className="text-xl font-bold text-red-400 font-mono mt-1">({fmt(preview.totalExpenses)})</p></div>
                        <div className={cn("rounded-xl p-4 border", preview.netProfit >= 0 ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}><p className="text-[10px] text-slate-500 uppercase">Net Profit</p><p className={cn("text-xl font-bold font-mono mt-1", preview.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>{fmt(preview.netProfit)}</p><p className="text-[10px] text-slate-500 mt-0.5">→ {preview.retainedEarningsAccount.code} {preview.retainedEarningsAccount.name}</p></div>
                    </div>

                    {/* Closing Lines */}
                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <div className="p-3 border-b border-white/[0.06] bg-rose-500/5"><h3 className="text-xs font-semibold text-rose-300">Closing Journal Preview — {preview.closingLines.length} line(s)</h3></div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500"><tr><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Balance</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th></tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {preview.closingLines.map((l: any) => (
                                        <tr key={l.coaId} className="hover:bg-white/[0.02]">
                                            <td className="px-3 py-1.5 font-mono text-slate-400">{l.code}</td>
                                            <td className="px-3 py-1.5 text-slate-200">{l.name}</td>
                                            <td className="px-3 py-1.5"><Badge variant="outline" className={cn("text-[8px]", l.accountType === "REVENUE" ? "text-emerald-400 border-emerald-500/20" : "text-red-400 border-red-500/20")}>{l.accountType}</Badge></td>
                                            <td className="px-3 py-1.5 text-right font-mono text-white">{fmt(l.balance)}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-emerald-400">{l.accountType === "REVENUE" ? fmt(l.balance) : "-"}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-red-400">{l.accountType === "EXPENSE" ? fmt(l.balance) : "-"}</td>
                                        </tr>
                                    ))}
                                    <tr className="bg-violet-500/5 border-t-2 border-violet-500/20">
                                        <td className="px-3 py-2 font-mono text-violet-400">{preview.retainedEarningsAccount.code}</td>
                                        <td className="px-3 py-2 text-violet-300 font-medium">{preview.retainedEarningsAccount.name}</td>
                                        <td className="px-3 py-2"><Badge variant="outline" className="text-[8px] text-violet-400 border-violet-500/20">EQUITY</Badge></td>
                                        <td className="px-3 py-2 text-right font-mono text-violet-400">{fmt(preview.netProfit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{preview.netProfit < 0 ? fmt(Math.abs(preview.netProfit)) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{preview.netProfit >= 0 ? fmt(preview.netProfit) : "-"}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <Button onClick={handleExecute} disabled={executing} className="bg-rose-600 hover:bg-rose-500 text-white h-10 w-full">
                        {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                        Execute Year-End Closing & Lock {preview.fiscalYear}
                    </Button>
                </>
            )}
        </div>
    );
}
