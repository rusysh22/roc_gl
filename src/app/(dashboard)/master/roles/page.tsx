"use client";

import { useEffect, useState } from "react";
import { Shield, Plus, Search, Edit, Trash2, MoreHorizontal, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Role { id: string; name: string; description: string | null; permissions: string[]; isActive: boolean; _count?: { users: number }; }

const allPermissions = [
    { group: "Journal", perms: ["journal.view", "journal.create", "journal.edit", "journal.post", "journal.approve"] },
    { group: "Report", perms: ["report.view"] },
    { group: "Budget", perms: ["budget.view", "budget.create", "budget.edit", "budget.approve"] },
    { group: "Company", perms: ["company.view", "company.edit"] },
    { group: "Branch", perms: ["branch.view", "branch.create", "branch.edit", "branch.delete"] },
    { group: "User", perms: ["user.view", "user.create", "user.edit", "user.delete"] },
    { group: "Role", perms: ["role.view", "role.create", "role.edit", "role.delete"] },
    { group: "Fiscal Year", perms: ["fiscal_year.view", "fiscal_year.create", "fiscal_year.edit"] },
    { group: "Period", perms: ["period.view", "period.close"] },
    { group: "Department", perms: ["department.view", "department.create", "department.edit", "department.delete"] },
    { group: "Cost Center", perms: ["cost_center.view", "cost_center.create", "cost_center.edit", "cost_center.delete"] },
    { group: "Currency", perms: ["currency.view", "currency.create", "currency.edit"] },
    { group: "Exchange Rate", perms: ["exchange_rate.view", "exchange_rate.create", "exchange_rate.edit"] },
];

export default function RolesPage() {
    const [items, setItems] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const [deleting, setDeleting] = useState<Role | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", permissions: [] as string[] });

    const fetchData = async () => {
        try { const res = await fetch("/api/master/roles"); if (res.ok) setItems(await res.json()); } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openCreate = () => { setEditing(null); setForm({ name: "", description: "", permissions: [] }); setDialogOpen(true); };
    const openEdit = (item: Role) => { setEditing(item); setForm({ name: item.name, description: item.description || "", permissions: item.permissions || [] }); setDialogOpen(true); };

    const togglePerm = (perm: string) => {
        setForm(f => ({ ...f, permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm] }));
    };

    const handleSave = async () => {
        if (!form.name) { toast.error("Name is required"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/master/roles/${editing.id}` : "/api/master/roles";
            const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
            if (res.ok) { toast.success(editing ? "Updated" : "Created"); setDialogOpen(false); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return; setSaving(true);
        try {
            const res = await fetch(`/api/master/roles/${deleting.id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Deleted"); setDeleteOpen(false); setDeleting(null); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="h-6 w-6 text-blue-400" />Roles</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage roles and permission matrix</p>
                </div>
                <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Role</Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Permissions</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Users</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={5} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : filtered.length === 0 ? <tr><td colSpan={5} className="text-center py-12 text-slate-400">No roles found</td></tr>
                                : filtered.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300 max-w-xs truncate">{item.description || "-"}</td>
                                        <td className="px-5 py-3.5"><Badge className="bg-blue-500/10 text-blue-400">{(item.permissions as string[])?.length || 0} permissions</Badge></td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item._count?.users || 0}</td>
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
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editing ? "Edit Role" : "Create Role"}</DialogTitle><DialogDescription className="text-slate-400">Define role name and select permissions.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2"><Label className="text-slate-300">Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-2"><Label className="text-slate-300">Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        <div className="space-y-3">
                            <Label className="text-slate-300">Permissions</Label>
                            <div className="grid grid-cols-2 gap-4">
                                {allPermissions.map(g => (
                                    <div key={g.group} className="bg-[#0d1117] rounded-lg p-3 border border-white/[0.04]">
                                        <p className="text-xs font-medium text-slate-400 uppercase mb-2">{g.group}</p>
                                        <div className="space-y-1.5">
                                            {g.perms.map(p => (
                                                <div key={p} className="flex items-center gap-2">
                                                    <Checkbox id={p} checked={form.permissions.includes(p)} onCheckedChange={() => togglePerm(p)} className="border-white/20 h-3.5 w-3.5" />
                                                    <label htmlFor={p} className="text-xs text-slate-300 cursor-pointer">{p.split(".")[1]}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-sm">
                    <DialogHeader><DialogTitle>Delete Role</DialogTitle><DialogDescription className="text-slate-400">Delete <span className="text-white font-medium">{deleting?.name}</span>?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-500 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
