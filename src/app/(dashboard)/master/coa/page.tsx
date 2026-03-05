"use client";

import { useEffect, useState } from "react";
import { FileSpreadsheet, Plus, Search, Edit, Trash2, MoreHorizontal, Loader2, ChevronRight, ChevronDown, Download, ShieldCheck, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface CoaAccount {
    id: string; code: string; name: string; nameEn: string | null;
    accountType: string; accountSubType: string | null; normalBalance: string;
    cashFlowCategory: string | null; taxMappingCode: string | null; psakTag: string | null;
    isBudgetApplicable: boolean; isIntercompany: boolean; isHeader: boolean;
    isRetainedEarnings: boolean; isActive: boolean; sortOrder: number; level: number;
    coaGroupId: string; parentCoaId: string | null;
    coaGroup: { code: string; name: string; accountType: string };
    parent: { code: string; name: string } | null;
    _count: { children: number };
}
interface CoaGroup { id: string; code: string; name: string; accountType: string; }

const accountTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
const subTypes: Record<string, string[]> = {
    ASSET: ["Current Asset", "Fixed Asset", "Intangible Asset", "Other Asset"],
    LIABILITY: ["Current Liability", "Long-term Liability", "Other Liability"],
    EQUITY: ["Paid-in Capital", "Retained Earnings", "Other Equity"],
    REVENUE: ["Operating Revenue", "Other Revenue"],
    EXPENSE: ["Cost of Goods Sold", "Operating Expense", "Other Expense", "Tax Expense"],
};
const cashFlowCategories = ["OPERATING", "INVESTING", "FINANCING", "NON_CASH", "NONE"];
const typeColor: Record<string, string> = {
    ASSET: "bg-emerald-500/10 text-emerald-400",
    LIABILITY: "bg-red-500/10 text-red-400",
    EQUITY: "bg-blue-500/10 text-blue-400",
    REVENUE: "bg-amber-500/10 text-amber-400",
    EXPENSE: "bg-purple-500/10 text-purple-400",
};

const defaultForm = {
    code: "", name: "", nameEn: "", coaGroupId: "", parentCoaId: "",
    accountType: "ASSET", accountSubType: "", cashFlowCategory: "",
    taxMappingCode: "", psakTag: "", isBudgetApplicable: false,
    isIntercompany: false, isHeader: false, isRetainedEarnings: false,
    sortOrder: 0, level: 3,
};

export default function CoaPage() {
    const [items, setItems] = useState<CoaAccount[]>([]);
    const [groups, setGroups] = useState<CoaGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterGroup, setFilterGroup] = useState("");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editing, setEditing] = useState<CoaAccount | null>(null);
    const [deleting, setDeleting] = useState<CoaAccount | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ ...defaultForm });
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [loadingTemplate, setLoadingTemplate] = useState(false);
    const [validationResults, setValidationResults] = useState<any>(null);
    const [showValidator, setShowValidator] = useState(false);

    const handleLoadTemplate = async () => {
        if (!confirm("Load default Trading Company CoA template?\nNote: this will only work if no CoA data exists yet.")) return;
        setLoadingTemplate(true);
        try {
            const res = await fetch("/api/master/coa/template", { method: "POST" });
            const data = await res.json();
            if (res.ok) { toast.success(data.message); fetchData(); }
            else toast.error(data.error);
        } catch { toast.error("Failed"); } finally { setLoadingTemplate(false); }
    };

    const handleValidate = async () => {
        try {
            const res = await fetch("/api/master/coa/validate");
            if (res.ok) { setValidationResults(await res.json()); setShowValidator(true); }
        } catch { toast.error("Failed to validate"); }
    };

    const fetchData = async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filterGroup) params.set("groupId", filterGroup);
            const [aRes, gRes] = await Promise.all([
                fetch(`/api/master/coa?${params}`), fetch("/api/master/coa-group"),
            ]);
            if (aRes.ok) setItems(await aRes.json());
            if (gRes.ok) setGroups(await gRes.json());
        } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, [search, filterGroup]);

    const openCreate = () => {
        setEditing(null); setForm({ ...defaultForm }); setDialogOpen(true);
    };
    const openEdit = (item: CoaAccount) => {
        setEditing(item);
        setForm({
            code: item.code, name: item.name, nameEn: item.nameEn || "",
            coaGroupId: item.coaGroupId, parentCoaId: item.parentCoaId || "",
            accountType: item.accountType, accountSubType: item.accountSubType || "",
            cashFlowCategory: item.cashFlowCategory || "",
            taxMappingCode: item.taxMappingCode || "", psakTag: item.psakTag || "",
            isBudgetApplicable: item.isBudgetApplicable, isIntercompany: item.isIntercompany,
            isHeader: item.isHeader, isRetainedEarnings: item.isRetainedEarnings,
            sortOrder: item.sortOrder, level: item.level,
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.code || !form.name || !form.coaGroupId || !form.accountType) {
            toast.error("Code, Name, Group, and Account Type are required"); return;
        }
        setSaving(true);
        try {
            const url = editing ? `/api/master/coa/${editing.id}` : "/api/master/coa";
            const payload = { ...form, parentCoaId: form.parentCoaId || null };
            const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            if (res.ok) { toast.success(editing ? "Updated" : "Created"); setDialogOpen(false); fetchData(); }
            else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleting) return; setSaving(true);
        try {
            const res = await fetch(`/api/master/coa/${deleting.id}`, { method: "DELETE" });
            if (res.ok) { toast.success("Deleted"); setDeleteOpen(false); setDeleting(null); fetchData(); }
            else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed"); } finally { setSaving(false); }
    };

    const toggleExpand = (id: string) => {
        setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    };

    // Build tree structure
    const rootItems = items.filter(i => !i.parentCoaId);
    const getChildren = (parentId: string) => items.filter(i => i.parentCoaId === parentId);

    const renderRow = (item: CoaAccount, depth: number = 0) => {
        const children = getChildren(item.id);
        const hasChildren = children.length > 0 || item._count.children > 0;
        const isExpanded = expanded.has(item.id);

        return (
            <div key={item.id}>
                <div className={`flex items-center hover:bg-white/[0.02] transition-colors border-b border-white/[0.04] ${item.isHeader ? "bg-white/[0.01]" : ""}`}>
                    <div className="flex items-center gap-1 px-3 py-2.5 min-w-[350px]" style={{ paddingLeft: `${12 + depth * 24}px` }}>
                        {hasChildren ? (
                            <button onClick={() => toggleExpand(item.id)} className="text-slate-400 hover:text-white p-0.5">
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                        ) : <span className="w-[18px]" />}
                        <span className="text-sm font-mono text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded text-xs">{item.code}</span>
                        <span className={`text-sm ml-2 ${item.isHeader ? "font-semibold text-white" : "text-slate-200"}`}>{item.name}</span>
                        {item.isHeader && <Badge className="ml-2 bg-slate-500/10 text-slate-400 text-[10px] px-1.5">HEADER</Badge>}
                        {item.isRetainedEarnings && <Badge className="ml-1 bg-amber-500/10 text-amber-400 text-[10px] px-1.5">RE</Badge>}
                    </div>
                    <div className="px-3 py-2.5 w-[100px]"><Badge className={`text-[10px] ${typeColor[item.accountType] || ""}`}>{item.accountType}</Badge></div>
                    <div className="px-3 py-2.5 w-[80px] text-xs text-slate-300">{item.normalBalance}</div>
                    <div className="px-3 py-2.5 w-[100px] text-xs text-slate-400">{item.cashFlowCategory || "-"}</div>
                    <div className="px-3 py-2.5 w-[100px] text-xs text-slate-400">{item.coaGroup.name}</div>
                    <div className="px-3 py-2.5 flex-1 text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white hover:bg-white/[0.06]"><MoreHorizontal className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-[#1e293b] border-white/[0.08] text-white">
                                <DropdownMenuItem onClick={() => openEdit(item)} className="cursor-pointer"><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setDeleting(item); setDeleteOpen(true); }} className="text-red-400 cursor-pointer"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                {isExpanded && children.map(child => renderRow(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><FileSpreadsheet className="h-6 w-6 text-blue-400" />Chart of Accounts</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage accounts with hierarchical tree view</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleLoadTemplate} disabled={loadingTemplate} className="border-white/[0.08] text-slate-300 hover:bg-white/[0.04]">{loadingTemplate ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}Load Template</Button>
                    <Button variant="outline" onClick={handleValidate} className="border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"><ShieldCheck className="h-4 w-4 mr-2" />Validate</Button>
                    <Button onClick={openCreate} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"><Plus className="h-4 w-4 mr-2" />Add Account</Button>
                </div>
            </div>

            {/* Validator Panel */}
            {showValidator && validationResults && (
                <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-blue-400" />CoA Structure Validation</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowValidator(false)} className="text-slate-400 hover:text-white">Close</Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-emerald-500/10 rounded-lg p-2"><span className="text-emerald-400 font-bold text-lg">{validationResults.summary.pass}</span><br /><span className="text-emerald-400/70">Pass</span></div>
                        <div className="bg-amber-500/10 rounded-lg p-2"><span className="text-amber-400 font-bold text-lg">{validationResults.summary.warn}</span><br /><span className="text-amber-400/70">Warning</span></div>
                        <div className="bg-red-500/10 rounded-lg p-2"><span className="text-red-400 font-bold text-lg">{validationResults.summary.fail}</span><br /><span className="text-red-400/70">Fail</span></div>
                    </div>
                    <div className="space-y-2">
                        {validationResults.results.map((r: any) => (
                            <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                                {r.status === "pass" ? <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" /> : r.status === "warn" ? <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />}
                                <div><p className="text-sm font-medium text-white">{r.label}</p><p className="text-xs text-slate-400 mt-0.5">{r.message}</p></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex gap-3">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Search code or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-[#111827] border-white/[0.08] text-white placeholder:text-slate-500 h-10 rounded-xl" />
                </div>
                <Select value={filterGroup} onValueChange={(v) => setFilterGroup(v === "all" ? "" : v)}>
                    <SelectTrigger className="w-[200px] bg-[#111827] border-white/[0.08] text-white h-10 rounded-xl"><SelectValue placeholder="All Groups" /></SelectTrigger>
                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                        <SelectItem value="all">All Groups</SelectItem>
                        {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => setExpanded(new Set(items.map(i => i.id)))} className="border-white/[0.08] text-slate-300 hover:bg-white/[0.04] h-10 rounded-xl">Expand All</Button>
                <Button variant="outline" onClick={() => setExpanded(new Set())} className="border-white/[0.08] text-slate-300 hover:bg-white/[0.04] h-10 rounded-xl">Collapse All</Button>
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <div className="flex border-b border-white/[0.06] bg-white/[0.02]">
                    <div className="px-3 py-3 min-w-[350px] text-xs font-medium text-slate-400 uppercase">Account</div>
                    <div className="px-3 py-3 w-[100px] text-xs font-medium text-slate-400 uppercase">Type</div>
                    <div className="px-3 py-3 w-[80px] text-xs font-medium text-slate-400 uppercase">Balance</div>
                    <div className="px-3 py-3 w-[100px] text-xs font-medium text-slate-400 uppercase">Cash Flow</div>
                    <div className="px-3 py-3 w-[100px] text-xs font-medium text-slate-400 uppercase">Group</div>
                    <div className="px-3 py-3 flex-1 text-right text-xs font-medium text-slate-400 uppercase">Actions</div>
                </div>
                {loading ? (
                    <div className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></div>
                ) : rootItems.length === 0 ? (
                    <div className="text-center py-12 text-slate-400">No accounts found. Create CoA Groups first, then add accounts.</div>
                ) : (
                    rootItems.map(item => renderRow(item))
                )}
            </div>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="bg-[#1e293b] border-white/[0.08] text-white max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editing ? "Edit Account" : "Create Account"}</DialogTitle><DialogDescription className="text-slate-400">Normal balance auto-set: DEBIT for Asset/Expense, CREDIT for others.</DialogDescription></DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Code *</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} placeholder="1-1001" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">CoA Group *</Label>
                                <Select value={form.coaGroupId} onValueChange={(v) => {
                                    const grp = groups.find(g => g.id === v);
                                    setForm({ ...form, coaGroupId: v, accountType: grp?.accountType || form.accountType });
                                }}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Account Type *</Label>
                                <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v, accountSubType: "" })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {accountTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Name (ID) *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kas Besar" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">Name (EN)</Label><Input value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} placeholder="Petty Cash" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Sub Type</Label>
                                <Select value={form.accountSubType} onValueChange={(v) => setForm({ ...form, accountSubType: v === "none" ? "" : v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="none">None</SelectItem>
                                        {(subTypes[form.accountType] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Cash Flow</Label>
                                <Select value={form.cashFlowCategory} onValueChange={(v) => setForm({ ...form, cashFlowCategory: v === "none" ? "" : v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="none">None</SelectItem>
                                        {cashFlowCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Parent Account</Label>
                                <Select value={form.parentCoaId} onValueChange={(v) => setForm({ ...form, parentCoaId: v === "none" ? "" : v })}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white"><SelectValue placeholder="None (Root)" /></SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white max-h-[200px]">
                                        <SelectItem value="none">None (Root)</SelectItem>
                                        {items.filter(i => i.id !== editing?.id).map(a => <SelectItem key={a.id} value={a.id}>{a.code} - {a.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2"><Label className="text-slate-300">Tax Mapping</Label><Input value={form.taxMappingCode} onChange={(e) => setForm({ ...form, taxMappingCode: e.target.value })} placeholder="PPN, PPh23" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">PSAK Tag</Label><Input value={form.psakTag} onChange={(e) => setForm({ ...form, psakTag: e.target.value })} placeholder="PSAK 1" className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                            <div className="space-y-2"><Label className="text-slate-300">Sort Order</Label><Input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} className="bg-[#0d1117] border-white/[0.08] text-white" /></div>
                        </div>
                        <div className="flex flex-wrap gap-5 pt-1">
                            <div className="flex items-center gap-2"><Checkbox id="isHeader" checked={form.isHeader} onCheckedChange={(v) => setForm({ ...form, isHeader: !!v })} className="border-white/20" /><Label htmlFor="isHeader" className="text-sm text-slate-300">Header (non-postable)</Label></div>
                            <div className="flex items-center gap-2"><Checkbox id="isBudget" checked={form.isBudgetApplicable} onCheckedChange={(v) => setForm({ ...form, isBudgetApplicable: !!v })} className="border-white/20" /><Label htmlFor="isBudget" className="text-sm text-slate-300">Budget Applicable</Label></div>
                            <div className="flex items-center gap-2"><Checkbox id="isIC" checked={form.isIntercompany} onCheckedChange={(v) => setForm({ ...form, isIntercompany: !!v })} className="border-white/20" /><Label htmlFor="isIC" className="text-sm text-slate-300">Intercompany</Label></div>
                            <div className="flex items-center gap-2"><Checkbox id="isRE" checked={form.isRetainedEarnings} onCheckedChange={(v) => setForm({ ...form, isRetainedEarnings: !!v })} className="border-white/20" /><Label htmlFor="isRE" className="text-sm text-slate-300">Retained Earnings</Label></div>
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
                    <DialogHeader><DialogTitle>Delete Account</DialogTitle><DialogDescription className="text-slate-400">Delete <span className="text-white font-medium">{deleting?.code} - {deleting?.name}</span>?</DialogDescription></DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/[0.06]">Cancel</Button>
                        <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-500 text-white">{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
