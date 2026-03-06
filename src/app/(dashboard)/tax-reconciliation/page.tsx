"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TaxReconciliationPage() {
    const [fiscalYears, setFiscalYears] = useState<any[]>([]);
    const [selectedFY, setSelectedFY] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [corrections, setCorrections] = useState<any>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [form, setForm] = useState({ description: "", correctionType: "POSITIVE", amount: "" });

    useEffect(() => { fetch("/api/master/fiscal-year").then(r => r.ok ? r.json() : []).then(setFiscalYears); }, []);

    const handleGenerate = async () => {
        if (!selectedFY) { toast.error("Select fiscal year"); return; }
        setLoading(true);
        const [reconRes, corrRes] = await Promise.all([
            fetch(`/api/reports/tax-reconciliation?fiscalYearId=${selectedFY}`),
            fetch(`/api/fiscal-corrections?fiscalYearId=${selectedFY}`),
        ]);
        if (reconRes.ok) setData(await reconRes.json());
        if (corrRes.ok) setCorrections(await corrRes.json());
        setLoading(false);
    };

    const handleAddCorrection = async () => {
        const res = await fetch("/api/fiscal-corrections", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, fiscalYearId: selectedFY }),
        });
        if (res.ok) { toast.success("Correction added"); setCreateOpen(false); setForm({ description: "", correctionType: "POSITIVE", amount: "" }); handleGenerate(); }
        else { const e = await res.json(); toast.error(e.error); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this correction?")) return;
        const res = await fetch(`/api/fiscal-corrections?id=${id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Deleted"); handleGenerate(); }
    };

    const fmt = (n: number) => n < 0 ? `(${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 0 })})` : n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="h-5 w-5 text-indigo-400" /> Tax Reconciliation</h2><p className="text-xs text-slate-400">Accounting profit → Fiscal corrections → Taxable income</p></div>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Fiscal Year *</Label><Select value={selectedFY} onValueChange={setSelectedFY}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{fiscalYears.map((fy: any) => <SelectItem key={fy.id} value={fy.id} className="text-xs">{fy.name}</SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate</Button>
                </div>
            </div>

            {data && (
                <>
                    {/* Reconciliation Table */}
                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                            <tbody className="divide-y divide-white/[0.03]">
                                <tr className="bg-emerald-500/5"><td className="px-4 py-2 font-semibold text-emerald-300">Revenue</td><td className="px-4 py-2 text-right font-mono text-white font-medium">{fmt(data.totalRevenue)}</td></tr>
                                <tr className="bg-red-500/5"><td className="px-4 py-2 font-semibold text-red-300">Expenses</td><td className="px-4 py-2 text-right font-mono text-red-400">({fmt(data.totalExpenses)})</td></tr>
                                <tr className="border-t-2 border-blue-500/20 bg-blue-500/5"><td className="px-4 py-2 font-bold text-blue-300">Accounting Profit (EBT)</td><td className={cn("px-4 py-2 text-right font-mono font-bold", data.accountingProfit >= 0 ? "text-blue-400" : "text-red-400")}>{fmt(data.accountingProfit)}</td></tr>

                                {/* Positive Corrections */}
                                <tr className="bg-white/[0.02]"><td className="px-4 py-1.5 text-[10px] text-amber-400 uppercase font-semibold" colSpan={2}>Positive Fiscal Corrections (+)</td></tr>
                                {data.positiveCorrections.length === 0 && <tr><td className="pl-8 py-1 text-slate-600 italic" colSpan={2}>None</td></tr>}
                                {data.positiveCorrections.map((c: any) => (
                                    <tr key={c.id}><td className="pl-8 pr-3 py-1 text-slate-400">{c.description}</td><td className="px-4 py-1 text-right font-mono text-amber-400">{fmt(Number(c.amount))}</td></tr>
                                ))}
                                <tr><td className="pl-8 py-1.5 text-xs text-slate-300 font-medium">Total Positive</td><td className="px-4 py-1.5 text-right font-mono text-amber-400">{fmt(data.totalPositive)}</td></tr>

                                {/* Negative Corrections */}
                                <tr className="bg-white/[0.02]"><td className="px-4 py-1.5 text-[10px] text-cyan-400 uppercase font-semibold" colSpan={2}>Negative Fiscal Corrections (-)</td></tr>
                                {data.negativeCorrections.length === 0 && <tr><td className="pl-8 py-1 text-slate-600 italic" colSpan={2}>None</td></tr>}
                                {data.negativeCorrections.map((c: any) => (
                                    <tr key={c.id}><td className="pl-8 pr-3 py-1 text-slate-400">{c.description}</td><td className="px-4 py-1 text-right font-mono text-cyan-400">({fmt(Number(c.amount))})</td></tr>
                                ))}
                                <tr><td className="pl-8 py-1.5 text-xs text-slate-300 font-medium">Total Negative</td><td className="px-4 py-1.5 text-right font-mono text-cyan-400">({fmt(data.totalNegative)})</td></tr>

                                {/* Taxable Income */}
                                <tr className="border-t-2 border-violet-500/20 bg-violet-500/5"><td className="px-4 py-2 font-bold text-violet-300">Taxable Income (Laba Fiskal)</td><td className={cn("px-4 py-2 text-right font-mono font-bold", data.taxableIncome >= 0 ? "text-violet-400" : "text-red-400")}>{fmt(data.taxableIncome)}</td></tr>
                                <tr><td className="px-4 py-2 text-slate-400">Tax Rate</td><td className="px-4 py-2 text-right text-white font-mono">{data.taxRate}%</td></tr>
                                <tr className="border-t-2 border-rose-500/30 bg-rose-500/10"><td className="px-4 py-3 font-bold text-rose-300 text-base">PPh Badan Payable</td><td className="px-4 py-3 text-right font-mono font-bold text-rose-400 text-base">{fmt(data.taxPayable)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Add Correction Button */}
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild><Button variant="outline" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Fiscal Correction</Button></DialogTrigger>
                        <DialogContent className="bg-[#111827] border-white/[0.08] text-white">
                            <DialogHeader><DialogTitle>Add Fiscal Correction</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div className="space-y-1"><Label className="text-xs text-slate-400">Description *</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs min-h-[60px]" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1"><Label className="text-xs text-slate-400">Type *</Label><Select value={form.correctionType} onValueChange={v => setForm(p => ({ ...p, correctionType: v }))}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white"><SelectItem value="POSITIVE">Positive (+)</SelectItem><SelectItem value="NEGATIVE">Negative (-)</SelectItem></SelectContent></Select></div>
                                    <div className="space-y-1"><Label className="text-xs text-slate-400">Amount *</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                                </div>
                            </div>
                            <Button onClick={handleAddCorrection} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white mt-2">Add Correction</Button>
                        </DialogContent>
                    </Dialog>

                    {/* Corrections List */}
                    {corrections && corrections.corrections.length > 0 && (
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                            <div className="p-3 border-b border-white/[0.06] bg-indigo-500/5 flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-indigo-300">Fiscal Corrections ({corrections.corrections.length})</h3>
                            </div>
                            <div className="divide-y divide-white/[0.03]">
                                {corrections.corrections.map((c: any) => (
                                    <div key={c.id} className="px-4 py-2 flex items-center justify-between hover:bg-white/[0.02]">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={cn("text-[8px]", c.correctionType === "POSITIVE" ? "text-amber-400 border-amber-500/20" : "text-cyan-400 border-cyan-500/20")}>{c.correctionType}</Badge>
                                            <span className="text-xs text-slate-300">{c.description}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono text-white">{fmt(Number(c.amount))}</span>
                                            <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="h-6 w-6 p-0 text-red-500 hover:text-red-400"><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
