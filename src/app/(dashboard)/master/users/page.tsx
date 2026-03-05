"use client";

import { useEffect, useState } from "react";
import { Users, Plus, Search, Edit, MoreHorizontal, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface User {
    id: string; email: string; name: string; systemRole: string;
    isActive: boolean; lastLoginAt: string | null; twoFaEnabled: boolean;
    role?: { id: string; name: string } | null;
}
interface Role { id: string; name: string; }

const systemRoles = ["COMPANY_ADMIN", "FINANCE_MANAGER", "ACCOUNTANT", "VIEWER"];

export default function UsersPage() {
    const [items, setItems] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        email: "", password: "", name: "", systemRole: "VIEWER", roleId: "",
    });

    const fetchData = async () => {
        try {
            const [uRes, rRes] = await Promise.all([
                fetch("/api/master/users"), fetch("/api/master/roles"),
            ]);
            if (uRes.ok) setItems(await uRes.json());
            if (rRes.ok) setRoles(await rRes.json());
        } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const openCreate = () => {
        setEditing(null);
        setForm({ email: "", password: "", name: "", systemRole: "VIEWER", roleId: "" });
        setDialogOpen(true);
    };
    const openEdit = (item: User) => {
        setEditing(item);
        setForm({ email: item.email, password: "", name: item.name, systemRole: item.systemRole, roleId: item.role?.id || "" });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name) { toast.error("Name is required"); return; }
        if (!editing && (!form.email || !form.password)) { toast.error("Email and password required"); return; }
        setSaving(true);
        try {
            const url = editing ? `/api/master/users/${editing.id}` : "/api/master/users";
            const payload: Record<string, unknown> = { name: form.name, systemRole: form.systemRole, roleId: form.roleId || null };
            if (!editing) { payload.email = form.email; payload.password = form.password; }
            if (editing && form.password) payload.password = form.password;
            const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) { toast.success(editing ? "Updated" : "User created"); setDialogOpen(false); fetchData(); }
            else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const toggleActive = async (item: User) => {
        try {
            const res = await fetch(`/api/master/users/${item.id}`, {
                method: item.isActive ? "DELETE" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !item.isActive }),
            });
            if (res.ok) { toast.success(item.isActive ? "Deactivated" : "Activated"); fetchData(); }
        } catch { toast.error("Failed"); }
    };

    const filtered = items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.email.toLowerCase().includes(search.toLowerCase())
    );

    const roleColor = (r: string) =>
        r === "SUPER_ADMIN" ? "bg-purple-500/10 text-purple-400"
            : r === "COMPANY_ADMIN" ? "bg-blue-500/10 text-blue-400"
                : r === "FINANCE_MANAGER" ? "bg-amber-500/10 text-amber-400"
                    : r === "ACCOUNTANT" ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-500/10 text-slate-400";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Users className="h-6 w-6 text-blue-400" />Users
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Manage user accounts</p>
                </div>
                <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white">
                    <Plus className="h-4 w-4 mr-2" />Add User
                </Button>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Email</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Role</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Custom Role</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Status</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-12 text-slate-400">No users found</td></tr>
                        ) : filtered.map(item => (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                <td className="px-5 py-3.5 text-sm text-slate-300">{item.email}</td>
                                <td className="px-5 py-3.5"><Badge className={roleColor(item.systemRole)}>{item.systemRole.replace("_", " ")}</Badge></td>
                                <td className="px-5 py-3.5 text-sm text-slate-300">{item.role?.name || "-"}</td>
                                <td className="px-5 py-3.5"><Badge className={item.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}>{item.isActive ? "Active" : "Inactive"}</Badge></td>
                                <td className="px-5 py-3.5 text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/[0.06]"><MoreHorizontal className="h-4 w-4" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/[0.08] text-white">
                                            <DropdownMenuItem onClick={() => openEdit(item)} className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => toggleActive(item)} className={item.isActive ? "text-red-400 cursor-pointer" : "text-emerald-400 cursor-pointer"}>
                                                <Shield className="h-4 w-4 mr-2" />{item.isActive ? "Deactivate" : "Activate"}
                                            </DropdownMenuItem>
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
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit User" : "Create User"}</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {editing ? "Leave password blank to keep current." : "Create a new user account."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {!editing && (
                            <div className="space-y-2">
                                <Label className="text-slate-300">Email *</Label>
                                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label className="text-slate-300">Name *</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-[#0d1117] border-white/[0.08] text-white" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">{editing ? "New Password" : "Password *"}</Label>
                            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 chars" className="bg-[#0d1117] border-white/[0.08] text-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">System Role</Label>
                                <Select value={form.systemRole} onValueChange={(v) => setForm({ ...form, systemRole: v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {systemRoles.map(r => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Custom Role</Label>
                                <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v === "none" ? "" : v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="none">None</SelectItem>
                                        {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
