"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Search, Edit, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface CoaGroup {
    id: string; code: string; name: string; nameEn: string | null;
    accountType: string; sortOrder: number; isActive: boolean;
    _count?: { accounts: number };
}

const accountTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const typeColor: Record<string, string> = {
    ASSET: "bg-emerald-500/10 text-emerald-400",
    LIABILITY: "bg-red-500/10 text-red-400",
    EQUITY: "bg-blue-500/10 text-blue-400",
    REVENUE: "bg-amber-500/10 text-amber-400",
    EXPENSE: "bg-purple-500/10 text-purple-400",
};

export default function CoaGroupPage() {
    const [items, setItems] = useState<CoaGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<CoaGroup | null>(null);
    const [deleting, setDeleting] = useState<CoaGroup | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ code: "", name: "", nameEn: "", accountType: "ASSET", sortOrder: 0 });

    const fetchData = async () => {
        try { const res = await fetch("/api/master/coa-group"); if (res.ok) setItems(await res.json()); } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setEditing(null); setForm({ code: "", name: "", nameEn: "", accountType: "ASSET", sortOrder: 0 }); setDialogOpen(true); };
    const openEdit = (item: CoaGroup) => { setEditing(item); setForm({ code: item.code, name: item.name, nameEn: item.nameEn || "", accountType: item.accountType, sortOrder: item.sortOrder }); setDialogOpen(true); };

    const handleSave = async () => {
        if (!form.code || !form.name || !form.accountType) { toast.error("Code, Name, and Account Type are required"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/master/coa-group/${editing.id}` : "/api/master/coa-group";
            const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) { toast.success(editing ? "Updated" : "Created"); setDialogOpen(false); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return; setSaving(true);
        try {
            const res = await fetch(`/api/master/coa-group/${deleting.id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Deleted"); setDeleteOpen(false); setDeleting(null); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const filtered = items.filter(i => i.code.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><BookOpen className="h-6 w-6 text-blue-400" />CoA Group</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage chart of accounts groups</p>
                </div>
                <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Group</Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Order</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Code</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Name (EN)</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Type</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Accounts</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No groups found</td></tr>
                                : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{item.sortOrder}</td>
                                        <td className="px-5 py-3.5"><span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{item.code}</span></td>
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item.nameEn || "-"}</td>
                                        <td className="px-5 py-3.5"><Badge className={typeColor[item.accountType] || "bg-slate-500/10 text-slate-400"}>{item.accountType}</Badge></td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item._count?.accounts || 0}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/[0.06]"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/[0.08] text-white">
                                                    <DropdownMenuItem onClick={() => openEdit(item)} className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => { setDeleting(item); setDeleteOpen(true); }} className="text-red-400 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
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
                    <DialogHeader><DialogTitle>{editing ? "Edit CoA Group" : "Create CoA Group"}</DialogTitle><DialogDescription className="text-slate-400">Groups organize accounts by type (Asset, Liability, etc.)</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Account Type *</Label>
                                <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2"><Label className="text-slate-300">Name (ID) *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Aset Lancar" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Name (EN)</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Current Assets" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Sort Order</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-sm">
                    <DialogHeader><DialogTitle>Delete CoA Group</DialogTitle><DialogDescription className="text-slate-400">Delete <span className="text-white font-medium">{deleting?.name}</span>?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-500 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
