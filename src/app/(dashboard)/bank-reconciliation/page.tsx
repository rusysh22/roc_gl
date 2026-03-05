"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Scale, Plus, Loader2, ArrowRight, CheckCircle, Clock, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Reconciliation {
    id: string;
    status: string;
    bankStatementBalance: string | number;
    glBalance: string | number;
    difference: string | number;
    createdAt: string;
    finalizedAt: string | null;
    bankAccount: { accountName: string; bankName: string; currencyCode: string };
    period: { name: string };
    _count: { items: number };
}

interface BankAccount {
    id: string;
    accountName: string;
    bankName: string;
    currencyCode: string;
}

interface Period {
    id: string;
    name: string;
    status: string;
}

export default function BankReconciliationPage() {
    const router = useRouter();
    const [reconciliations, setReconciliations] = useState<Reconciliation[]>([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [periods, setPeriods] = useState<Period[]>([]);
    const [creating, setCreating] = useState(false);
    const [newRecon, setNewRecon] = useState({ bankAccountId: "", periodId: "", bankStatementBalance: 0 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/bank-reconciliation");
            if (res.ok) setReconciliations(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFormData = async () => {
        try {
            const [baRes, pRes] = await Promise.all([
                fetch("/api/bank-account"),
                fetch("/api/master/period"),
            ]);
            if (baRes.ok) setBankAccounts(await baRes.json());
            if (pRes.ok) setPeriods(await pRes.json());
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const handleCreate = async () => {
        if (!newRecon.bankAccountId || !newRecon.periodId) {
            toast.error("Please select bank account and period");
            return;
        }
        setCreating(true);
        try {
            const res = await fetch("/api/bank-reconciliation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRecon),
            });
            if (res.ok) {
                const data = await res.json();
                toast.success("Reconciliation created");
                setCreateDialogOpen(false);
                router.push(`/bank-reconciliation/${data.id}`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to create");
            }
        } catch {
            toast.error("System error");
        } finally {
            setCreating(false);
        }
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "FINALIZED": return <CheckCircle className="h-4 w-4 text-emerald-400" />;
            case "LOCKED": return <Lock className="h-4 w-4 text-slate-400" />;
            default: return <Clock className="h-4 w-4 text-amber-400" />;
        }
    };

    const statusColor = (status: string) => {
        switch (status) {
            case "FINALIZED": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            case "LOCKED": return "bg-slate-500/10 text-slate-400 border-slate-500/20";
            case "IN_PROGRESS": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
            default: return "bg-amber-500/10 text-amber-400 border-amber-500/20";
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Bank Reconciliation</h2>
                    <p className="text-sm text-slate-400 mt-1">Match bank statements with GL records.</p>
                </div>
                <Button
                    onClick={() => { setCreateDialogOpen(true); fetchFormData(); }}
                    className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                >
                    <Plus className="h-4 w-4 mr-2" /> New Reconciliation
                </Button>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4">Bank Account</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4 text-right">Bank Statement</th>
                                <th className="px-6 py-4 text-right">GL Balance</th>
                                <th className="px-6 py-4 text-right">Difference</th>
                                <th className="px-6 py-4 text-center">Matches</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr><td colSpan={8} className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : reconciliations.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                                <Scale className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-300 font-medium">No reconciliations yet</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reconciliations.map((r) => {
                                    const diff = Number(r.difference);
                                    return (
                                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-200 font-medium">{r.bankAccount.accountName}</div>
                                                <div className="text-xs text-slate-500">{r.bankAccount.bankName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">{r.period.name}</td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-200">
                                                {Number(r.bankStatementBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-slate-200">
                                                {Number(r.glBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className={cn("px-6 py-4 text-right font-mono font-medium", Math.abs(diff) < 0.01 ? "text-emerald-400" : "text-red-400")}>
                                                {diff.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center text-slate-300">{r._count.items}</td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge variant="outline" className={cn("text-xs font-medium", statusColor(r.status))}>
                                                    {statusIcon(r.status)}
                                                    <span className="ml-1">{r.status}</span>
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/bank-reconciliation/${r.id}`)} className="text-slate-400 hover:text-white hover:bg-white/10">
                                                        Open <ArrowRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                    {r.status === "FINALIZED" && (
                                                        <Button variant="ghost" size="sm" onClick={() => router.push(`/bank-reconciliation/${r.id}/report`)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                                            Report
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>New Bank Reconciliation</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Bank Account</Label>
                            <Select value={newRecon.bankAccountId} onValueChange={(v) => setNewRecon(p => ({ ...p, bankAccountId: v }))}>
                                <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white">
                                    <SelectValue placeholder="Select bank account" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    {bankAccounts.map(ba => (
                                        <SelectItem key={ba.id} value={ba.id}>{ba.accountName} - {ba.bankName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Period</Label>
                            <Select value={newRecon.periodId} onValueChange={(v) => setNewRecon(p => ({ ...p, periodId: v }))}>
                                <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white">
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    {periods.filter(p => p.status === "OPEN").map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Bank Statement Ending Balance</Label>
                            <Input
                                type="number"
                                value={newRecon.bankStatementBalance || ""}
                                onChange={(e) => setNewRecon(p => ({ ...p, bankStatementBalance: parseFloat(e.target.value) || 0 }))}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
                        <Button onClick={handleCreate} disabled={creating} className="bg-blue-600 hover:bg-blue-500 text-white">
                            {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
