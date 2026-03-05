"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, BookOpen, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GeneralLedgerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedCoa, setSelectedCoa] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const [coaRes, periodRes] = await Promise.all([
                fetch("/api/master/coa/search?q=&limit=500"),
                fetch("/api/master/period"),
            ]);
            if (coaRes.ok) {
                const d = await coaRes.json();
                setAccounts(Array.isArray(d) ? d : d.results || []);
            }
            if (periodRes.ok) setPeriods(await periodRes.json());
        };
        load();
    }, []);

    const handleGenerate = async () => {
        if (!selectedCoa) { toast.error("Select an account"); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ coaId: selectedCoa });
            if (selectedPeriod) params.set("periodId", selectedPeriod);
            const res = await fetch(`/api/reports/general-ledger?${params}`);
            if (res.ok) setData(await res.json());
            else toast.error("Failed to generate report");
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-400" /> General Ledger Report</h2>
                    <p className="text-xs text-slate-400">View transaction detail per account with running balance</p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Account *</Label>
                        <Select value={selectedCoa} onValueChange={setSelectedCoa}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select Account" /></SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white max-h-[300px]">
                                {accounts.map((a: any) => <SelectItem key={a.id} value={a.id} className="text-xs">{a.code} — {a.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Period</Label>
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="All Time" /></SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                {periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white h-9">
                        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate
                    </Button>
                </div>
            </div>

            {/* Report */}
            {data && (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/[0.06] bg-blue-500/5">
                        <h3 className="text-sm font-semibold text-blue-300">{data.account.code} — {data.account.name}</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">{data.transactionCount} transaction{data.transactionCount !== 1 ? "s" : ""} • Opening: {fmt(data.openingBalance)} • Closing: {fmt(data.closingBalance)}</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                                <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Journal</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                <tr className="bg-slate-800/30">
                                    <td className="px-3 py-2 text-slate-400" colSpan={5}>Opening Balance</td>
                                    <td className="px-3 py-2 text-right font-mono font-medium text-white">{fmt(data.openingBalance)}</td>
                                </tr>
                                {data.transactions.map((tx: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 text-slate-400 font-mono">{format(new Date(tx.journalDate), "dd/MM/yy")}</td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => router.push(`/journal/${tx.journalId}`)} className="text-blue-400 hover:underline font-mono">{tx.journalNumber}</button>
                                        </td>
                                        <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate">{tx.description || "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{tx.debit > 0 ? fmt(tx.debit) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{tx.credit > 0 ? fmt(tx.credit) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white font-medium">{fmt(tx.runningBalance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#0a0e1a] border-t-2 border-blue-500/20">
                                <tr className="text-xs font-semibold">
                                    <td className="px-3 py-2 text-blue-300" colSpan={3}>TOTAL</td>
                                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(data.totalDebit)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-red-400">{fmt(data.totalCredit)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-white font-bold">{fmt(data.closingBalance)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
