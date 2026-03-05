"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ExchangeRate { id: string; currencyId: string; date: string; rate: string; source: string; currency: { code: string; name: string; symbol: string }; }
interface Currency { id: string; code: string; name: string; }

export default function ExchangeRatePage() {
    const [items, setItems] = useState<ExchangeRate[]>([]);
    const [currencies, setCurrencies] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ currencyId: "", date: new Date().toISOString().split("T")[0], rate: "" });

    const fetchData = async () => {
        try {
            const [rRes, cRes] = await Promise.all([fetch("/api/master/exchange-rate"), fetch("/api/master/currency")]);
            if (rRes.ok) setItems(await rRes.json());
            if (cRes.ok) setCurrencies(await cRes.json());
        } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleSave = async () => {
        if (!form.currencyId || !form.date || !form.rate) { toast.error("All fields required"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/master/exchange-rate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) { toast.success("Exchange rate saved"); setDialogOpen(false); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><ArrowRightLeft className="h-6 w-6 text-blue-400" />Exchange Rate</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage daily exchange rates against base currency</p>
                </div>
                <Button onClick={() => { setForm({ currencyId: "", date: new Date().toISOString().split("T")[0], rate: "" }); setDialogOpen(true); }} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Rate</Button>
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Currency</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Rate</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Source</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : items.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">No exchange rates found</td></tr>
                                : items.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div>
                                                <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{item.currency.code}</span>
                                                <span className="text-xs text-slate-400 ml-2">{item.currency.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{new Date(item.date).toLocaleDateString("id-ID")}</td>
                                        <td className="px-5 py-3.5 text-sm text-white font-mono text-right">{Number(item.rate).toLocaleString("id-ID", { minimumFractionDigits: 2 })}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300 capitalize">{item.source}</td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-md">
                    <DialogHeader><DialogTitle>Add Exchange Rate</DialogTitle><DialogDescription className="text-slate-400">Rate against base currency (IDR). If rate exists for same date & currency, it will be updated.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Currency *</Label>
                            <Select value={form.currencyId} onValueChange={(v) => setForm({ ...form, currencyId: v })}>
                                <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="Select currency" /></SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    {currencies.filter(c => c.code !== "IDR").map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2"><Label className="text-slate-300">Date *</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Rate (vs IDR) *</Label><Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} placeholder="15500.00" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
