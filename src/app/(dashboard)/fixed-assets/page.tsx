"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Package, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxCoA } from "@/components/ui/combobox-coa";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function FixedAssetsPage() {
    const router = useRouter();
    const [assets, setAssets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [form, setForm] = useState({ assetCode: "", assetName: "", category: "Equipment", acquisitionDate: "", acquisitionCost: "", usefulLifeMonths: "60", depreciationMethod: "STRAIGHT_LINE", salvageValue: "0", coaAssetId: "", coaAccumDepId: "", coaDepExpenseId: "" });

    const fetchAssets = async () => {
        setLoading(true);
        const res = await fetch("/api/fixed-assets");
        if (res.ok) setAssets(await res.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchAssets();
        fetch("/api/master/coa/search?q=&limit=500").then(r => r.ok ? r.json() : []).then(d => setAccounts(Array.isArray(d) ? d : d.results || []));
    }, []);

    const handleCreate = async () => {
        const res = await fetch("/api/fixed-assets", {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
        });
        if (res.ok) { toast.success("Asset created"); setCreateOpen(false); fetchAssets(); }
        else { const e = await res.json(); toast.error(e.error); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this asset?")) return;
        const res = await fetch(`/api/fixed-assets/${id}`, { method: "DELETE" });
        if (res.ok) { toast.success("Deleted"); fetchAssets(); }
        else { const e = await res.json(); toast.error(e.error); }
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><Package className="h-5 w-5 text-amber-400" /> Fixed Assets</h2><p className="text-xs text-slate-400">{assets.length} asset(s) registered</p></div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild><Button className="bg-amber-600 hover:bg-amber-500 text-white h-8 text-xs"><Plus className="h-3 w-3 mr-1" /> Add Asset</Button></DialogTrigger>
                    <DialogContent className="bg-[#111827] border-white/[0.08] text-white max-w-lg max-h-[85vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Register New Asset</DialogTitle></DialogHeader>
                        <div className="grid grid-cols-2 gap-3 mt-2">
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Code *</Label><Input value={form.assetCode} onChange={e => setForm(p => ({ ...p, assetCode: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Name *</Label><Input value={form.assetName} onChange={e => setForm(p => ({ ...p, assetName: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Category</Label><Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white"><SelectItem value="Equipment">Equipment</SelectItem><SelectItem value="Vehicle">Vehicle</SelectItem><SelectItem value="Building">Building</SelectItem><SelectItem value="Furniture">Furniture</SelectItem><SelectItem value="Computer">Computer</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Acquisition Date *</Label><Input type="date" value={form.acquisitionDate} onChange={e => setForm(p => ({ ...p, acquisitionDate: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Acquisition Cost *</Label><Input type="number" value={form.acquisitionCost} onChange={e => setForm(p => ({ ...p, acquisitionCost: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Useful Life (months) *</Label><Input type="number" value={form.usefulLifeMonths} onChange={e => setForm(p => ({ ...p, usefulLifeMonths: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Salvage Value</Label><Input type="number" value={form.salvageValue} onChange={e => setForm(p => ({ ...p, salvageValue: e.target.value }))} className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs" /></div>
                            <div className="space-y-1"><Label className="text-[10px] text-slate-400">Method</Label><Select value={form.depreciationMethod} onValueChange={v => setForm(p => ({ ...p, depreciationMethod: v }))}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white"><SelectItem value="STRAIGHT_LINE">Straight Line</SelectItem><SelectItem value="DECLINING_BALANCE">Declining Balance</SelectItem></SelectContent></Select></div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-[10px] text-slate-400">CoA Asset *</Label>
                                <ComboboxCoA value={form.coaAssetId} onValueChange={v => setForm(p => ({ ...p, coaAssetId: v }))} accounts={accounts} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-[10px] text-slate-400">CoA Accum. Depreciation *</Label>
                                <ComboboxCoA value={form.coaAccumDepId} onValueChange={v => setForm(p => ({ ...p, coaAccumDepId: v }))} accounts={accounts} />
                            </div>
                            <div className="col-span-2 space-y-1">
                                <Label className="text-[10px] text-slate-400">CoA Dep. Expense *</Label>
                                <ComboboxCoA value={form.coaDepExpenseId} onValueChange={v => setForm(p => ({ ...p, coaDepExpenseId: v }))} accounts={accounts} />
                            </div>
                        </div>
                        <Button onClick={handleCreate} className="w-full bg-amber-600 hover:bg-amber-500 text-white mt-2 h-8 text-xs">Create Asset</Button>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {assets.map((a: any) => {
                    const depPercent = Number(a.acquisitionCost) > 0 ? Math.round((Number(a.accumulatedDepreciation) / (Number(a.acquisitionCost) - Number(a.salvageValue))) * 100) : 0;
                    return (
                        <div key={a.id} className="bg-[#111827] border border-white/[0.08] rounded-xl p-4 hover:border-amber-500/30 transition-all">
                            <div className="flex items-start justify-between mb-2">
                                <div><p className="text-sm font-semibold text-white">{a.assetCode}</p><p className="text-xs text-slate-400">{a.assetName}</p></div>
                                <Badge variant="outline" className={cn("text-[9px]", a.isActive ? "border-emerald-500/20 text-emerald-400" : "border-red-500/20 text-red-400")}>{a.isActive ? "Active" : "Disposed"}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                                <div><p className="text-slate-500 uppercase">Cost</p><p className="text-white font-mono">{fmt(Number(a.acquisitionCost))}</p></div>
                                <div><p className="text-slate-500 uppercase">Book Value</p><p className="text-amber-400 font-mono">{fmt(Number(a.bookValue))}</p></div>
                                <div><p className="text-slate-500 uppercase">Accum. Dep</p><p className="text-red-400 font-mono">({fmt(Number(a.accumulatedDepreciation))})</p></div>
                                <div><p className="text-slate-500 uppercase">Method</p><p className="text-slate-300">{a.depreciationMethod === "STRAIGHT_LINE" ? "SL" : "DB"} • {a.usefulLifeMonths}mo</p></div>
                            </div>
                            <div className="mt-3"><div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${Math.min(depPercent, 100)}%` }} /></div><p className="text-[9px] text-slate-500 mt-0.5">{Math.min(depPercent, 100)}% depreciated</p></div>
                            <div className="flex gap-2 mt-3">
                                <Badge variant="outline" className="text-[9px] border-slate-500/20 text-slate-400">{a.category}</Badge>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="ml-auto h-6 w-6 p-0 text-red-500 hover:text-red-400"><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
