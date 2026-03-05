"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Calculator, Plus, Loader2, Star, ArrowRight,
    CheckCircle, Clock, Lock, Send, FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Budget {
    id: string;
    budgetName: string;
    version: string;
    status: string;
    isDefault: boolean;
    notes: string | null;
    createdAt: string;
    approvedAt: string | null;
    fiscalYear: { name: string };
    creator: { name: string };
    approver: { name: string } | null;
    _count: { details: number };
}

interface FiscalYear {
    id: string;
    name: string;
    status: string;
}

export default function BudgetListPage() {
    const router = useRouter();
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);
    const [createOpen, setCreateOpen] = useState(false);
    const [fiscalYears, setFiscalYears] = useState<FiscalYear[]>([]);
    const [creating, setCreating] = useState(false);
    const [newBudget, setNewBudget] = useState({ fiscalYearId: "", budgetName: "", version: "v1", notes: "" });

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/budget");
            if (res.ok) setBudgets(await res.json());
        } catch { } finally { setLoading(false); }
    };

    const fetchFiscalYears = async () => {
        try {
            const res = await fetch("/api/master/fiscal-year");
            if (res.ok) setFiscalYears(await res.json());
        } catch { }
    };

    useEffect(() => { fetchBudgets(); }, []);

    const handleCreate = async () => {
        if (!newBudget.fiscalYearId || !newBudget.budgetName) {
            toast.error("Fiscal year and budget name are required");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/budget", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newBudget),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success("Budget created");
                setCreateOpen(false);
                router.push(`/budget/${data.id}`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed");
            }
        } catch { toast.error("System error"); }
        finally { setCreating(false); }
    };

    const statusIcon = (s: string) => {
        switch (s) {
            case "APPROVED": return <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />;
            case "LOCKED": return <Lock className="h-3.5 w-3.5 text-slate-400" />;
            case "SUBMITTED": return <Send className="h-3.5 w-3.5 text-blue-400" />;
            default: return <Clock className="h-3.5 w-3.5 text-amber-400" />;
        }
    };

    const statusColor = (s: string) => {
        switch (s) {
            case "APPROVED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "LOCKED": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
            case "SUBMITTED": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default: return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Calculator className="h-6 w-6 text-violet-400" /> Budget Management
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Plan and manage annual budgets with spreadsheet-like input.</p>
                </div>
                <Button
                    onClick={() => { setCreateOpen(true); fetchFiscalYears(); }}
                    className="bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                >
                    <Plus className="h-4 w-4 mr-2" /> New Budget
                </Button>
            </div>

            {/* Budget Cards */}
            {loading ? (
                <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin text-violet-400 mx-auto" /></div>
            ) : budgets.length === 0 ? (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-12 text-center">
                    <FileSpreadsheet className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium">No budgets yet</p>
                    <p className="text-sm text-slate-500 mt-1">Create your first budget to start planning.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {budgets.map(b => (
                        <div
                            key={b.id}
                            onClick={() => router.push(`/budget/${b.id}`)}
                            className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 hover:border-violet-500/30 transition-all cursor-pointer group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-semibold text-white truncate">{b.budgetName}</h3>
                                        {b.isDefault && (
                                            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{b.fiscalYear.name} • {b.version}</p>
                                </div>
                                <Badge variant="outline" className={cn("text-[10px] font-medium shrink-0", statusColor(b.status))}>
                                    {statusIcon(b.status)}
                                    <span className="ml-1">{b.status}</span>
                                </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-slate-500">Created by</p>
                                    <p className="text-slate-300 font-medium">{b.creator.name}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">CoA Lines</p>
                                    <p className="text-slate-300 font-medium">{b._count.details}</p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                                <span className="text-[10px] text-slate-600">{format(new Date(b.createdAt), "dd MMM yyyy")}</span>
                                <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-violet-400 transition-colors" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Budget</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Budget Name *</Label>
                            <Input
                                value={newBudget.budgetName}
                                onChange={(e) => setNewBudget(p => ({ ...p, budgetName: e.target.value }))}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white"
                                placeholder="e.g., Annual Budget 2026"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Fiscal Year *</Label>
                                <Select value={newBudget.fiscalYearId} onValueChange={(v) => setNewBudget(p => ({ ...p, fiscalYearId: v }))}>
                                    <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white">
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {fiscalYears.map(fy => (
                                            <SelectItem key={fy.id} value={fy.id}>{fy.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">Version</Label>
                                <Input
                                    value={newBudget.version}
                                    onChange={(e) => setNewBudget(p => ({ ...p, version: e.target.value }))}
                                    className="bg-[#0a0e1a] border-white/[0.1] text-white"
                                    placeholder="v1"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Notes</Label>
                            <Input
                                value={newBudget.notes}
                                onChange={(e) => setNewBudget(p => ({ ...p, notes: e.target.value }))}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white"
                                placeholder="Optional notes"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setCreateOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating} className="bg-violet-600 hover:bg-violet-500 text-white">
                            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
