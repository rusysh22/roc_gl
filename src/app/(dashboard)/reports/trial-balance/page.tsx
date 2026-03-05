"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Scale, Search, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TrialBalancePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [mode, setMode] = useState("simple");
    const [data, setData] = useState<any>(null);

    useEffect(() => { fetch("/api/master/period").then(r => r.ok ? r.json() : []).then(setPeriods); }, []);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ mode });
            if (selectedPeriod) params.set("periodId", selectedPeriod);
            const res = await fetch(`/api/reports/trial-balance?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale className="h-5 w-5 text-violet-400" /> Trial Balance</h2>
                    <p className="text-xs text-slate-400">Verify total debits equal total credits</p>
                </div>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Period</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="All Time" /></SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Mode</Label>
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                <SelectItem value="simple">Simple</SelectItem>
                                <SelectItem value="extended">Extended (Worksheet)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white h-9">
                        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate
                    </Button>
                </div>
            </div>

            {data && (
                <>
                    {/* Balance Validation */}
                    <div className={cn("rounded-xl p-4 border flex items-center gap-3", data.totals.isBalanced ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                        {data.totals.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                        <div>
                            <p className={cn("font-semibold text-sm", data.totals.isBalanced ? "text-emerald-400" : "text-red-400")}>
                                {data.totals.isBalanced ? "BALANCED ✓" : `UNBALANCED — Difference: ${fmt(data.totals.difference)}`}
                            </p>
                            <p className="text-[10px] text-slate-500">Total Debit: {fmt(data.totals.totalDebit)} | Total Credit: {fmt(data.totals.totalCredit)}</p>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Code</th>
                                        <th className="px-3 py-2 text-left">Account Name</th>
                                        {mode === "extended" && (<><th className="px-2 py-2 text-right">Open Debit</th><th className="px-2 py-2 text-right">Open Credit</th><th className="px-2 py-2 text-right">Mut. Debit</th><th className="px-2 py-2 text-right">Mut. Credit</th></>)}
                                        <th className="px-3 py-2 text-right">Debit</th>
                                        <th className="px-3 py-2 text-right">Credit</th>
                                        <th className="px-3 py-2 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {data.rows.map((row: any) => (
                                        <tr key={row.coaId} className="hover:bg-white/[0.02]">
                                            <td className="px-3 py-1.5 font-mono text-slate-300">{row.code}</td>
                                            <td className="px-3 py-1.5 text-slate-200 truncate max-w-[200px]">{row.name}</td>
                                            {mode === "extended" && (
                                                <>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">{row.openingDebit > 0 ? fmt(row.openingDebit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">{row.openingCredit > 0 ? fmt(row.openingCredit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-emerald-500/60">{row.mutationDebit > 0 ? fmt(row.mutationDebit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-red-500/60">{row.mutationCredit > 0 ? fmt(row.mutationCredit) : "-"}</td>
                                                </>
                                            )}
                                            <td className="px-3 py-1.5 text-right font-mono text-emerald-400">{row.totalDebit > 0 ? fmt(row.totalDebit) : "-"}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-red-400">{row.totalCredit > 0 ? fmt(row.totalCredit) : "-"}</td>
                                            <td className={cn("px-3 py-1.5 text-right font-mono font-medium", row.balance >= 0 ? "text-white" : "text-red-400")}>
                                                {row.balance < 0 ? `(${fmt(Math.abs(row.balance))})` : fmt(row.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[#0a0e1a] border-t-2 border-violet-500/20 text-xs font-bold">
                                    <tr>
                                        <td className="px-3 py-2 text-violet-300" colSpan={mode === "extended" ? 6 : 2}>TOTAL</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(data.totals.totalDebit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{fmt(data.totals.totalCredit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white">{fmt(data.totals.totalDebit - data.totals.totalCredit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
