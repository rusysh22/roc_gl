"use client";

import { useEffect, useState } from "react";
import {
    Building,
    Plus,
    Search,
    Edit,
    Trash2,
    MoreHorizontal,
    Globe,
    DollarSign,
    Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface Company {
    id: string;
    code: string;
    name: string;
    npwp: string | null;
    address: string | null;
    baseCurrency: string;
    timezone: string;
    language: string;
    subscriptionPlan: string;
    isActive: boolean;
    createdAt: string;
    _count?: { users: number; branches: number };
}

export default function CompanyPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Company | null>(null);
    const [deleting, setDeleting] = useState<Company | null>(null);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        code: "",
        name: "",
        npwp: "",
        address: "",
        baseCurrency: "IDR",
        timezone: "Asia/Jakarta",
        language: "id",
    });

    const fetchCompanies = async () => {
        try {
            const res = await fetch("/api/master/company");
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch (error) {
            toast.error("Failed to fetch companies");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const openCreateDialog = () => {
        setEditing(null);
        setForm({
            code: "",
            name: "",
            npwp: "",
            address: "",
            baseCurrency: "IDR",
            timezone: "Asia/Jakarta",
            language: "id",
        });
        setDialogOpen(true);
    };

    const openEditDialog = (company: Company) => {
        setEditing(company);
        setForm({
            code: company.code,
            name: company.name,
            npwp: company.npwp || "",
            address: company.address || "",
            baseCurrency: company.baseCurrency,
            timezone: company.timezone,
            language: company.language,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.code || !form.name) {
            toast.error("Code and Name are required");
            return;
        }

        setSaving(true);
        try {
            const url = editing
                ? `/api/master/company/${editing.id}`
                : "/api/master/company";
            const method = editing ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            if (res.ok) {
                toast.success(editing ? "Company updated" : "Company created");
                setDialogOpen(false);
                fetchCompanies();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save");
            }
        } catch {
            toast.error("Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/master/company/${deleting.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Company deleted");
                setDeleteDialogOpen(false);
                setDeleting(null);
                fetchCompanies();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete");
            }
        } catch {
            toast.error("Failed to delete");
        } finally {
            setSaving(false);
        }
    };

    const filtered = companies.filter(
        (c) =>
            c.code.toLowerCase().includes(search.toLowerCase()) ||
            c.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Building className="h-6 w-6 text-blue-400" />
                        Company
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Manage company information
                    </p>
                </div>
                <Button
                    onClick={openCreateDialog}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/25"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Company
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    placeholder="Search by code or name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl"
                />
            </div>

            {/* Table */}
            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-white/[0.06]">
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Code
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Currency
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Plan
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Users
                                </th>
                                <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" />
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={7}
                                        className="text-center py-12 text-slate-400"
                                    >
                                        No companies found
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((company) => (
                                    <tr
                                        key={company.id}
                                        className="hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-5 py-3.5">
                                            <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                                                {company.code}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-sm text-white font-medium">
                                                {company.name}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-sm text-slate-300">
                                                {company.baseCurrency}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge
                                                variant="outline"
                                                className="text-xs capitalize border-white/10 text-slate-300"
                                            >
                                                {company.subscriptionPlan}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <Badge
                                                className={`text-xs ${company.isActive
                                                        ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                                        : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                                    }`}
                                            >
                                                {company.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className="text-sm text-slate-300">
                                                {company._count?.users || 0}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/[0.06]"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent
                                                    align="end"
                                                    className="bg-[#1e293b] border-white/[0.08] text-white"
                                                >
                                                    <DropdownMenuItem
                                                        onClick={() => openEditDialog(company)}
                                                        className="hover:bg-white/[0.06] cursor-pointer"
                                                    >
                                                        <Edit className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setDeleting(company);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                        className="hover:bg-red-500/10 text-red-400 cursor-pointer"
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editing ? "Edit Company" : "Create Company"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {editing
                                ? "Update company information."
                                : "Fill in the details to create a new company."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">
                                    Code <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    value={form.code}
                                    onChange={(e) =>
                                        setForm({ ...form, code: e.target.value.toUpperCase() })
                                    }
                                    disabled={!!editing}
                                    placeholder="DEMO"
                                    className="bg-[#0d1117] border-white/[0.08] text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">
                                    Name <span className="text-red-400">*</span>
                                </Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    placeholder="PT Company Name"
                                    className="bg-[#0d1117] border-white/[0.08] text-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">NPWP</Label>
                            <Input
                                value={form.npwp}
                                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                                placeholder="01.234.567.8-901.000"
                                className="bg-[#0d1117] border-white/[0.08] text-white"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-300">Address</Label>
                            <Input
                                value={form.address}
                                onChange={(e) => setForm({ ...form, address: e.target.value })}
                                placeholder="Jl. Sudirman No. 1, Jakarta"
                                className="bg-[#0d1117] border-white/[0.08] text-white"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Currency</Label>
                                <Select
                                    value={form.baseCurrency}
                                    onValueChange={(v) =>
                                        setForm({ ...form, baseCurrency: v })
                                    }
                                >
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="IDR">IDR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="SGD">SGD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Timezone</Label>
                                <Select
                                    value={form.timezone}
                                    onValueChange={(v) => setForm({ ...form, timezone: v })}
                                >
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="Asia/Jakarta">WIB</SelectItem>
                                        <SelectItem value="Asia/Makassar">WITA</SelectItem>
                                        <SelectItem value="Asia/Jayapura">WIT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Language</Label>
                                <Select
                                    value={form.language}
                                    onValueChange={(v) => setForm({ ...form, language: v })}
                                >
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="id">Indonesia</SelectItem>
                                        <SelectItem value="en">English</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDialogOpen(false)}
                            className="text-slate-400 hover:text-white hover:bg-white/[0.06]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {editing ? "Update" : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Company</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to delete{" "}
                            <span className="text-white font-medium">{deleting?.name}</span>?
                            This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setDeleteDialogOpen(false)}
                            className="text-slate-400 hover:text-white hover:bg-white/[0.06]"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDelete}
                            disabled={saving}
                            className="bg-red-600 hover:bg-red-500 text-white"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
