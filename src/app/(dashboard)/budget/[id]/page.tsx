"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowLeft, Loader2, Save, Send, CheckCircle, Lock,
    Star, Sparkles, Trash2, Plus, Calculator
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface CoaOption { id: string; code: string; name: string; accountType: string; }

interface DetailLine {
    id?: string;
    coaId: string;
    coaCode?: string;
    coaName?: string;
    accountType?: string;
    departmentId?: string | null;
    costCenterId?: string | null;
    periods: number[];
    total: number;
    dirty?: boolean;
}

export default function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const budgetId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [budget, setBudget] = useState<any>(null);
    const [lines, setLines] = useState<DetailLine[]>([]);
    const [coaOptions, setCoaOptions] = useState<CoaOption[]>([]);
    const [spreadOpen, setSpreadOpen] = useState(false);
    const [spreadIdx, setSpreadIdx] = useState(-1);
    const [spreadAmount, setSpreadAmount] = useState(0);
    const [spreadMode, setSpreadMode] = useState("equal");
    const [actionLoading, setActionLoading] = useState(false);
    const [addCoaOpen, setAddCoaOpen] = useState(false);
    const [coaSearch, setCoaSearch] = useState("");

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [budgetRes, coaRes] = await Promise.all([
                fetch(`/api/budget/${budgetId}`),
                fetch("/api/master/coa/search?q=&limit=500"),
            ]);
            if (budgetRes.ok) {
                const data = await budgetRes.json();
                setBudget(data);
                setLines(
                    (data.details || []).map((d: any) => ({
                        id: d.id,
                        coaId: d.coaId,
                        coaCode: d.coa?.code,
                        coaName: d.coa?.name,
                        accountType: d.coa?.accountType,
                        departmentId: d.departmentId,
                        costCenterId: d.costCenterId,
                        periods: [
                            Number(d.period1), Number(d.period2), Number(d.period3), Number(d.period4),
                            Number(d.period5), Number(d.period6), Number(d.period7), Number(d.period8),
                            Number(d.period9), Number(d.period10), Number(d.period11), Number(d.period12),
                        ],
                        total: Number(d.totalAnnual),
                    }))
                );
            } else {
                toast.error("Budget not found");
                router.push("/budget");
            }
            if (coaRes.ok) {
                const coaData = await coaRes.json();
                setCoaOptions(Array.isArray(coaData) ? coaData : coaData.results || []);
            }
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    }, [budgetId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const isEditable = budget?.status === "DRAFT" || budget?.status === "SUBMITTED";

    const updateCell = (lineIdx: number, monthIdx: number, value: number) => {
        setLines(prev => prev.map((line, i) => {
            if (i !== lineIdx) return line;
            const newPeriods = [...line.periods];
            newPeriods[monthIdx] = value;
            const total = newPeriods.reduce((s, p) => s + p, 0);
            return { ...line, periods: newPeriods, total, dirty: true };
        }));
    };

    const addLine = (coa: CoaOption) => {
        if (lines.some(l => l.coaId === coa.id)) {
            toast.error("This account is already in the budget");
            return;
        }
        setLines(prev => [...prev, {
            coaId: coa.id,
            coaCode: coa.code,
            coaName: coa.name,
            accountType: coa.accountType,
            periods: new Array(12).fill(0),
            total: 0,
            dirty: true,
        }]);
        setAddCoaOpen(false);
        setCoaSearch("");
    };

    const removeLine = (idx: number) => {
        setLines(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = lines.map(l => ({
                coaId: l.coaId,
                departmentId: l.departmentId || null,
                costCenterId: l.costCenterId || null,
                periods: {
                    period1: l.periods[0], period2: l.periods[1], period3: l.periods[2], period4: l.periods[3],
                    period5: l.periods[4], period6: l.periods[5], period7: l.periods[6], period8: l.periods[7],
                    period9: l.periods[8], period10: l.periods[9], period11: l.periods[10], period12: l.periods[11],
                },
            }));
            const res = await fetch(`/api/budget/${budgetId}/detail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lines: payload }),
            });
            if (res.ok) {
                toast.success("Budget saved");
                setLines(prev => prev.map(l => ({ ...l, dirty: false })));
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Save failed");
            }
        } catch { toast.error("System error"); }
        finally { setSaving(false); }
    };

    const handleWorkflow = async (action: string) => {
        const confirmMsg: Record<string, string> = {
            submit: "Submit this budget for approval?",
            approve: "Approve this budget?",
            lock: "Lock this budget? It cannot be edited after locking.",
            reject: "Reject this budget? It will return to DRAFT status.",
        };
        if (!confirm(confirmMsg[action] || "Proceed?")) return;
        setActionLoading(true);
        try {
            const res = await fetch(`/api/budget/${budgetId}/workflow?action=${action}`, { method: "POST" });
            if (res.ok) {
                toast.success(`Budget ${action}ed successfully`);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Action failed");
            }
        } catch { toast.error("System error"); }
        finally { setActionLoading(false); }
    };

    const handleSpread = () => {
        if (spreadIdx < 0 || spreadIdx >= lines.length) return;
        const amount = spreadAmount;
        let periods: number[];
        if (spreadMode === "equal") {
            const monthly = Math.floor(amount / 12 * 100) / 100;
            const remainder = Math.round((amount - monthly * 12) * 100) / 100;
            periods = new Array(12).fill(monthly);
            periods[11] = Math.round((monthly + remainder) * 100) / 100;
        } else {
            periods = new Array(12).fill(Math.floor(amount / 12 * 100) / 100);
            periods[11] = Math.round((amount - periods.slice(0, 11).reduce((s, p) => s + p, 0)) * 100) / 100;
        }
        setLines(prev => prev.map((line, i) => {
            if (i !== spreadIdx) return line;
            return { ...line, periods, total: amount, dirty: true };
        }));
        setSpreadOpen(false);
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 0 });

    const grandTotal = lines.reduce((s, l) => s + l.total, 0);
    const monthTotals = MONTHS.map((_, mi) => lines.reduce((s, l) => s + (l.periods[mi] || 0), 0));

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-violet-400 mx-auto" /></div>;
    if (!budget) return null;

    const statusColor: Record<string, string> = {
        DRAFT: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        SUBMITTED: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        APPROVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        LOCKED: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    };

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={() => router.push("/budget")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">{budget.budgetName}</h2>
                            {budget.isDefault && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                        </div>
                        <p className="text-xs text-slate-400">{budget.fiscalYear?.name} • {budget.version}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs ml-1", statusColor[budget.status] || "")}>
                        {budget.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isEditable && (
                        <>
                            <Button size="sm" variant="outline" onClick={() => setAddCoaOpen(true)} className="border-white/[0.1] text-slate-300 hover:bg-white/5">
                                <Plus className="h-4 w-4 mr-1" /> Add Account
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white">
                                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                                Save
                            </Button>
                        </>
                    )}
                    {budget.status === "DRAFT" && (
                        <Button size="sm" onClick={() => handleWorkflow("submit")} disabled={actionLoading} className="bg-blue-600 hover:bg-blue-500 text-white">
                            <Send className="h-4 w-4 mr-1" /> Submit
                        </Button>
                    )}
                    {budget.status === "SUBMITTED" && (
                        <>
                            <Button size="sm" onClick={() => handleWorkflow("approve")} disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleWorkflow("reject")} disabled={actionLoading} className="border-red-500/20 text-red-400 hover:bg-red-500/10">
                                Reject
                            </Button>
                        </>
                    )}
                    {budget.status === "APPROVED" && (
                        <Button size="sm" onClick={() => handleWorkflow("lock")} disabled={actionLoading} className="bg-slate-600 hover:bg-slate-500 text-white">
                            <Lock className="h-4 w-4 mr-1" /> Lock
                        </Button>
                    )}
                </div>
            </div>

            {/* Grand Total Banner */}
            <div className="bg-gradient-to-r from-violet-500/10 to-[#111827] border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Calculator className="h-5 w-5 text-violet-400" />
                    <span className="text-sm text-violet-300 font-semibold">Total Annual Budget</span>
                </div>
                <span className="text-xl font-bold text-white font-mono">{fmt(grandTotal)}</span>
            </div>

            {/* Spreadsheet Grid */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold border-b border-white/[0.08] sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2.5 text-left sticky left-0 bg-[#0a0e1a] min-w-[200px] z-20">Account</th>
                                {MONTHS.map(m => (
                                    <th key={m} className="px-2 py-2.5 text-right min-w-[85px]">{m}</th>
                                ))}
                                <th className="px-3 py-2.5 text-right min-w-[100px] bg-[#0a0e1a]">Total</th>
                                {isEditable && <th className="px-2 py-2.5 w-[70px]"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {lines.length === 0 ? (
                                <tr>
                                    <td colSpan={15} className="px-4 py-8 text-center text-slate-500">
                                        No budget lines yet. Click "Add Account" to begin.
                                    </td>
                                </tr>
                            ) : (
                                lines.map((line, li) => (
                                    <tr key={line.coaId} className={cn("hover:bg-white/[0.02] transition-colors", line.dirty && "bg-violet-500/5")}>
                                        <td className="px-3 py-1.5 sticky left-0 bg-[#111827] group-hover:bg-[#131b2e] z-10">
                                            <div className="text-slate-200 font-medium truncate">{line.coaCode}</div>
                                            <div className="text-[10px] text-slate-500 truncate">{line.coaName}</div>
                                        </td>
                                        {MONTHS.map((_, mi) => (
                                            <td key={mi} className="px-1 py-1">
                                                {isEditable ? (
                                                    <input
                                                        type="number"
                                                        value={line.periods[mi] || ""}
                                                        onChange={(e) => updateCell(li, mi, parseFloat(e.target.value) || 0)}
                                                        className="w-full bg-transparent border border-transparent hover:border-white/[0.1] focus:border-violet-500/50 focus:bg-[#0a0e1a] rounded px-1.5 py-1 text-right text-slate-200 font-mono text-xs outline-none transition-colors"
                                                        placeholder="0"
                                                    />
                                                ) : (
                                                    <span className="block text-right text-slate-300 font-mono px-1.5 py-1">
                                                        {line.periods[mi] ? fmt(line.periods[mi]) : "-"}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-3 py-1.5 text-right font-mono font-semibold text-white bg-[#0d1117]">
                                            {fmt(line.total)}
                                        </td>
                                        {isEditable && (
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex gap-0.5 justify-center">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-500 hover:text-violet-400"
                                                        onClick={() => { setSpreadIdx(li); setSpreadAmount(line.total || 0); setSpreadOpen(true); }}
                                                        title="Auto-spread"
                                                    >
                                                        <Sparkles className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-500 hover:text-red-400"
                                                        onClick={() => removeLine(li)}
                                                        title="Remove"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {lines.length > 0 && (
                            <tfoot className="bg-[#0a0e1a] border-t-2 border-violet-500/20">
                                <tr className="text-xs font-semibold text-violet-300">
                                    <td className="px-3 py-2.5 sticky left-0 bg-[#0a0e1a] z-10">TOTAL</td>
                                    {monthTotals.map((mt, i) => (
                                        <td key={i} className="px-2 py-2.5 text-right font-mono">{fmt(mt)}</td>
                                    ))}
                                    <td className="px-3 py-2.5 text-right font-mono text-white font-bold bg-[#0a0e1a]">{fmt(grandTotal)}</td>
                                    {isEditable && <td></td>}
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Add CoA Dialog */}
            <Dialog open={addCoaOpen} onOpenChange={setAddCoaOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white max-h-[70vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add Account to Budget</DialogTitle>
                    </DialogHeader>
                    <Input
                        value={coaSearch}
                        onChange={(e) => setCoaSearch(e.target.value)}
                        placeholder="Search by code or name..."
                        className="bg-[#0a0e1a] border-white/[0.1] text-white"
                    />
                    <div className="overflow-y-auto flex-1 space-y-1 mt-2">
                        {coaOptions
                            .filter(c => !c.accountType || ["REVENUE", "EXPENSE"].includes(c.accountType))
                            .filter(c => !coaSearch || c.code.toLowerCase().includes(coaSearch.toLowerCase()) || c.name.toLowerCase().includes(coaSearch.toLowerCase()))
                            .slice(0, 50)
                            .map(coa => (
                                <div
                                    key={coa.id}
                                    onClick={() => addLine(coa)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors",
                                        lines.some(l => l.coaId === coa.id) && "opacity-30 pointer-events-none"
                                    )}
                                >
                                    <span className="text-sm text-white font-medium">{coa.code}</span>
                                    <span className="text-sm text-slate-400 ml-2">{coa.name}</span>
                                    <Badge variant="outline" className="ml-2 text-[9px] border-white/[0.1] text-slate-500">{coa.accountType}</Badge>
                                </div>
                            ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Spread Dialog */}
            <Dialog open={spreadOpen} onOpenChange={setSpreadOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Auto-Spread Budget</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-slate-400">
                        Distribute the annual amount equally across 12 months for:
                        <br /><span className="text-white font-medium">{lines[spreadIdx]?.coaCode} — {lines[spreadIdx]?.coaName}</span>
                    </p>
                    <div className="space-y-3 mt-2">
                        <div className="space-y-1">
                            <Label className="text-slate-300 text-xs">Annual Amount</Label>
                            <Input
                                type="number" value={spreadAmount || ""}
                                onChange={(e) => setSpreadAmount(parseFloat(e.target.value) || 0)}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-slate-300 text-xs">Mode</Label>
                            <Select value={spreadMode} onValueChange={setSpreadMode}>
                                <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    <SelectItem value="equal">Equal (÷ 12)</SelectItem>
                                    <SelectItem value="front_loaded">Front-Loaded (Q1 heavier)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="mt-4">
                        <Button variant="ghost" onClick={() => setSpreadOpen(false)} className="text-slate-300">Cancel</Button>
                        <Button onClick={handleSpread} className="bg-violet-600 hover:bg-violet-500 text-white">
                            <Sparkles className="h-4 w-4 mr-1" /> Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
