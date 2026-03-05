"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, Search, Edit, Trash2, MoreHorizontal, Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface FiscalYear { id: string; name: string; startDate: string; endDate: string; status: string; _count?: { periods: number }; }

export default function FiscalYearPage() {
    const [items, setItems] = useState<FiscalYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editing, setEditing] = useState<FiscalYear | null>(null);
    const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });

    const fetchData = async () => {
        try { const res = await fetch("/api/master/fiscal-year"); if (res.ok) setItems(await res.json()); } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setEditing(null); setForm({ name: "", startDate: "", endDate: "" }); setDialogOpen(true); };

    const handleSave = async () => {
        if (!form.name || !form.startDate || !form.endDate) { toast.error("All fields are required"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/master/fiscal-year/${editing.id}` : "/api/master/fiscal-year";
            const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) { toast.success(editing ? "Updated" : "Created with 12 periods"); setDialogOpen(false); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed to save"); } finally { setSaving(false); }
    };

    const toggleStatus = async (item: FiscalYear) => {
        const newStatus = item.status === "OPEN" ? "CLOSED" : "OPEN";
        try {
            const res = await fetch(`/api/master/fiscal-year/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
            if (res.ok) { toast.success(`Status changed to ${newStatus}`); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed to update"); }
    };

    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Calendar className="h-6 w-6 text-blue-400" />Fiscal Year</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage fiscal years and periods</p>
                </div>
                <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Fiscal Year</Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Start Date</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">End Date</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Periods</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan={6} className="text-center py-12 text-slate-400">No fiscal years found</td></tr>
                                : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{new Date(item.startDate).toLocaleDateString("id-ID")}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{new Date(item.endDate).toLocaleDateString("id-ID")}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item._count?.periods || 0}</td>
                                        <td className="px-5 py-3.5"><Badge className={item.status === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}>{item.status}</Badge></td>
                                        <td className="px-5 py-3.5 text-right">
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/[0.06]"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/[0.08] text-white">
                                                    <DropdownMenuItem onClick={() => toggleStatus(item)} className="cursor-pointer">{item.status === "OPEN" ? <><Lock className="h-4 w-4 mr-2" />Close</> : <><Unlock className="h-4 w-4 mr-2" />Reopen</>}</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-md">
                    <DialogHeader><DialogTitle>Create Fiscal Year</DialogTitle><DialogDescription className="text-slate-400">12 monthly periods will be automatically created.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2"><Label className="text-slate-300">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="FY2026" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">End Date *</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        </div>
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
