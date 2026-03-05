"use client";

import { useEffect, useState } from "react";
import { Landmark, Plus, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Currency { id: string; code: string; name: string; symbol: string; decimalPlaces: number; }

export default function CurrencyPage() {
    const [items, setItems] = useState<Currency[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ code: "", name: "", symbol: "", decimalPlaces: 2 });

    const fetchData = async () => {
        try { const res = await fetch("/api/master/currency"); if (res.ok) setItems(await res.json()); } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setForm({ code: "", name: "", symbol: "", decimalPlaces: 2 }); setDialogOpen(true); };

    const handleSave = async () => {
        if (!form.code || !form.name || !form.symbol) { toast.error("All fields required"); return; }
        setSaving(true);
        try {
            const res = await fetch("/api/master/currency", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) { toast.success("Currency created"); setDialogOpen(false); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const filtered = items.filter(i => i.code.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Landmark className="h-6 w-6 text-blue-400" />Currency</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage available currencies (ISO 4217)</p>
                </div>
                <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Currency</Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Code</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Symbol</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Decimal Places</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={4} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan={4} className="text-center py-12 text-slate-400">No currencies found</td></tr>
                                : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5"><span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{item.code}</span></td>
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300 font-medium">{item.symbol}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item.decimalPlaces}</td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-md">
                    <DialogHeader><DialogTitle>Add Currency</DialogTitle><DialogDescription className="text-slate-400">Use ISO 4217 3-letter currency codes.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="JPY" maxLength={3} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">Symbol *</Label><Input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="¥" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        </div>
                        <div className="space-y-2"><Label className="text-slate-300">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Japanese Yen" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Decimal Places</Label><Input type="number" value={form.decimalPlaces} onChange={(e) => setForm({ ...form, decimalPlaces: parseInt(e.target.value) || 0 })} min={0} max={6} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
