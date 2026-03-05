"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    ArrowLeft, Scale, Loader2, CheckCircle, Link2, Unlink2,
    Sparkles, Lock, FileText, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BankTx {
    id: string;
    transactionDate: string;
    transactionType: string;
    amount: string | number;
    reference: string | null;
    description: string | null;
    status: string;
    journalLineId: string | null;
}

interface GlTx {
    id: string;
    lineNumber: number;
    debitAmount: string | number;
    creditAmount: string | number;
    description: string | null;
    journal: {
        journalNumber: string;
        journalDate: string;
        description: string | null;
    };
}

interface ReconciliationItem {
    id: string;
    bankTransactionId: string | null;
    journalLineId: string | null;
    matchType: string;
    confidenceScore: string | number | null;
    status: string;
}

export default function BankReconciliationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const reconId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [recon, setRecon] = useState<any>(null);
    const [bankTxns, setBankTxns] = useState<BankTx[]>([]);
    const [glTxns, setGlTxns] = useState<GlTx[]>([]);
    const [items, setItems] = useState<ReconciliationItem[]>([]);
    const [selectedBankTx, setSelectedBankTx] = useState<string | null>(null);
    const [selectedGlTx, setSelectedGlTx] = useState<string | null>(null);
    const [matching, setMatching] = useState(false);
    const [autoMatching, setAutoMatching] = useState(false);
    const [finalizing, setFinalizing] = useState(false);
    const [stmtBalance, setStmtBalance] = useState(0);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}`);
            if (res.ok) {
                const data = await res.json();
                setRecon(data);
                setBankTxns(data.bankTransactions || []);
                setGlTxns(data.glTransactions || []);
                setItems(data.items || []);
                setStmtBalance(Number(data.bankStatementBalance));
            } else {
                toast.error("Failed to load reconciliation");
                router.push("/bank-reconciliation");
            }
        } catch {
            toast.error("System error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [reconId]);

    const matchedBankIds = new Set(items.map(i => i.bankTransactionId).filter(Boolean));
    const matchedGlIds = new Set(items.map(i => i.journalLineId).filter(Boolean));

    const unmatchedBankTxns = bankTxns.filter(t => !matchedBankIds.has(t.id) && t.status !== "RECONCILED");
    const unmatchedGlTxns = glTxns.filter(t => !matchedGlIds.has(t.id));
    const matchedCount = items.length;
    const totalCount = bankTxns.length + glTxns.length;

    const handleMatch = async () => {
        if (!selectedBankTx || !selectedGlTx) {
            toast.error("Select one item from each side");
            return;
        }
        setMatching(true);
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}/match`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bankTransactionId: selectedBankTx, journalLineId: selectedGlTx }),
            });
            if (res.ok) {
                toast.success("Items matched");
                setSelectedBankTx(null);
                setSelectedGlTx(null);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Match failed");
            }
        } catch {
            toast.error("System error");
        } finally {
            setMatching(false);
        }
    };

    const handleUnmatch = async (itemId: string) => {
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}/match`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId }),
            });
            if (res.ok) {
                toast.success("Items unmatched");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Unmatch failed");
            }
        } catch {
            toast.error("System error");
        }
    };

    const handleAutoMatch = async () => {
        setAutoMatching(true);
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}/auto-match`, { method: "POST" });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Auto-matched ${data.matched} items`);
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Auto-match failed");
            }
        } catch {
            toast.error("System error");
        } finally {
            setAutoMatching(false);
        }
    };

    const handleUpdateBalance = async () => {
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bankStatementBalance: stmtBalance }),
            });
            if (res.ok) {
                toast.success("Balance updated");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Update failed");
            }
        } catch {
            toast.error("System error");
        }
    };

    const handleFinalize = async () => {
        if (!confirm("Finalize this reconciliation? This will mark all matched transactions as RECONCILED.")) return;
        setFinalizing(true);
        try {
            const res = await fetch(`/api/bank-reconciliation/${reconId}/finalize`, { method: "POST" });
            if (res.ok) {
                toast.success("Reconciliation finalized");
                fetchData();
            } else {
                const err = await res.json();
                toast.error(err.error || "Finalize failed");
            }
        } catch {
            toast.error("System error");
        } finally {
            setFinalizing(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;
    if (!recon) return null;

    const diff = Number(recon.difference);
    const isFinalized = recon.status === "FINALIZED" || recon.status === "LOCKED";

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/bank-reconciliation")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {recon.bankAccount?.accountName} - {recon.period?.name}
                        </h2>
                        <p className="text-sm text-slate-400">{recon.bankAccount?.bankName}</p>
                    </div>
                    <Badge variant="outline" className={cn("text-xs ml-2",
                        isFinalized ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                        {recon.status}
                    </Badge>
                </div>
                <div className="flex items-center gap-2">
                    {!isFinalized && (
                        <>
                            <Button onClick={handleAutoMatch} disabled={autoMatching} variant="outline" className="border-white/[0.1] text-slate-300 hover:bg-white/5">
                                {autoMatching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                Auto Match
                            </Button>
                            <Button onClick={handleFinalize} disabled={finalizing || Math.abs(diff) > 0.01} className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50">
                                {finalizing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                                Finalize
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={() => router.push(`/bank-reconciliation/${reconId}/report`)} className="border-white/[0.1] text-slate-300 hover:bg-white/5">
                        <FileText className="h-4 w-4 mr-2" /> Report
                    </Button>
                </div>
            </div>

            {/* Balance Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Bank Statement</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Input
                            type="number"
                            value={stmtBalance || ""}
                            onChange={(e) => setStmtBalance(parseFloat(e.target.value) || 0)}
                            className="bg-[#0a0e1a] border-white/[0.08] text-white font-mono h-8 text-sm"
                            disabled={isFinalized}
                        />
                        {!isFinalized && stmtBalance !== Number(recon.bankStatementBalance) && (
                            <Button size="sm" onClick={handleUpdateBalance} className="bg-blue-600 text-white h-8 text-xs px-2">Save</Button>
                        )}
                    </div>
                </div>
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">GL Balance</p>
                    <p className="text-lg font-bold text-white mt-1 font-mono">
                        {Number(recon.glBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Difference</p>
                    <p className={cn("text-lg font-bold mt-1 font-mono", Math.abs(diff) < 0.01 ? "text-emerald-400" : "text-red-400")}>
                        {diff.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Progress</p>
                    <p className="text-lg font-bold text-white mt-1">{matchedCount} matched</p>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${totalCount > 0 ? (matchedCount / totalCount * 200) : 0}%` }} />
                    </div>
                </div>
            </div>

            {/* Match Action Bar */}
            {!isFinalized && (selectedBankTx || selectedGlTx) && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div className="text-sm text-blue-300">
                        {selectedBankTx && selectedGlTx
                            ? "Ready to match selected items"
                            : `Select ${!selectedBankTx ? "a bank transaction" : "a GL transaction"} to match`
                        }
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedBankTx(null); setSelectedGlTx(null); }} className="text-slate-400">
                            Clear
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleMatch}
                            disabled={!selectedBankTx || !selectedGlTx || matching}
                            className="bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            {matching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link2 className="h-4 w-4 mr-1" />}
                            Match
                        </Button>
                    </div>
                </div>
            )}

            {/* 2-Panel Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Bank Transactions */}
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-white/[0.08] bg-black/20">
                        <h3 className="text-sm font-semibold text-white">Bank Transactions ({unmatchedBankTxns.length} unmatched)</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[500px]">
                        {unmatchedBankTxns.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">All bank transactions matched</div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {unmatchedBankTxns.map(tx => (
                                    <div
                                        key={tx.id}
                                        onClick={() => !isFinalized && setSelectedBankTx(selectedBankTx === tx.id ? null : tx.id)}
                                        className={cn(
                                            "px-4 py-3 cursor-pointer transition-colors",
                                            selectedBankTx === tx.id ? "bg-blue-500/10 border-l-2 border-blue-500" : "hover:bg-white/[0.02]"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-slate-500 font-mono">{format(new Date(tx.transactionDate), "dd MMM yyyy")}</div>
                                                <div className="text-sm text-slate-200 mt-0.5">{tx.description || "-"}</div>
                                                {tx.reference && <div className="text-xs text-slate-500">Ref: {tx.reference}</div>}
                                            </div>
                                            <div className="text-right">
                                                <div className={cn("font-mono font-medium text-sm", tx.transactionType === "DEBIT" ? "text-emerald-400" : "text-red-400")}>
                                                    {tx.transactionType === "DEBIT" ? "+" : "-"}{Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </div>
                                                <Badge variant="outline" className="text-[10px] mt-1 border-amber-500/20 text-amber-400">
                                                    {tx.status}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: GL Transactions */}
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-white/[0.08] bg-black/20">
                        <h3 className="text-sm font-semibold text-white">GL Transactions ({unmatchedGlTxns.length} unmatched)</h3>
                    </div>
                    <div className="overflow-y-auto max-h-[500px]">
                        {unmatchedGlTxns.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">All GL transactions matched</div>
                        ) : (
                            <div className="divide-y divide-white/[0.04]">
                                {unmatchedGlTxns.map(gl => {
                                    const amount = Number(gl.debitAmount) || Number(gl.creditAmount);
                                    const isDebit = Number(gl.debitAmount) > 0;
                                    return (
                                        <div
                                            key={gl.id}
                                            onClick={() => !isFinalized && setSelectedGlTx(selectedGlTx === gl.id ? null : gl.id)}
                                            className={cn(
                                                "px-4 py-3 cursor-pointer transition-colors",
                                                selectedGlTx === gl.id ? "bg-blue-500/10 border-l-2 border-blue-500" : "hover:bg-white/[0.02]"
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className="text-xs text-slate-500 font-mono">
                                                        {format(new Date(gl.journal.journalDate), "dd MMM yyyy")} · {gl.journal.journalNumber}
                                                    </div>
                                                    <div className="text-sm text-slate-200 mt-0.5">{gl.description || gl.journal.description || "-"}</div>
                                                </div>
                                                <div className={cn("font-mono font-medium text-sm", isDebit ? "text-emerald-400" : "text-red-400")}>
                                                    {isDebit ? "+" : "-"}{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Matched Items */}
            {items.length > 0 && (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                    <div className="p-3 border-b border-white/[0.08] bg-black/20">
                        <h3 className="text-sm font-semibold text-white">Matched Items ({items.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 border-b border-white/[0.08]">
                                <tr>
                                    <th className="px-4 py-3 text-left">Match Type</th>
                                    <th className="px-4 py-3 text-left">Bank Tx</th>
                                    <th className="px-4 py-3 text-left">GL Tx</th>
                                    <th className="px-4 py-3 text-center">Confidence</th>
                                    <th className="px-4 py-3 text-center">Status</th>
                                    {!isFinalized && <th className="px-4 py-3 text-right">Action</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                                {items.map(item => {
                                    const bt = bankTxns.find(t => t.id === item.bankTransactionId);
                                    const gl = glTxns.find(t => t.id === item.journalLineId);
                                    return (
                                        <tr key={item.id} className="hover:bg-white/[0.02]">
                                            <td className="px-4 py-2">
                                                <Badge variant="outline" className="text-[10px] border-white/[0.1] text-slate-300">{item.matchType}</Badge>
                                            </td>
                                            <td className="px-4 py-2 text-slate-300 text-xs">
                                                {bt ? `${bt.description || bt.reference || "N/A"} (${Number(bt.amount).toLocaleString()})` : item.bankTransactionId?.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-2 text-slate-300 text-xs">
                                                {gl ? `${gl.journal.journalNumber} (${(Number(gl.debitAmount) || Number(gl.creditAmount)).toLocaleString()})` : item.journalLineId?.slice(0, 8)}
                                            </td>
                                            <td className="px-4 py-2 text-center text-slate-400 text-xs">
                                                {item.confidenceScore ? `${Number(item.confidenceScore).toFixed(0)}%` : "-"}
                                            </td>
                                            <td className="px-4 py-2 text-center">
                                                <Badge variant="outline" className={cn("text-[10px]",
                                                    item.status === "CONFIRMED" ? "border-emerald-500/20 text-emerald-400" : "border-blue-500/20 text-blue-400"
                                                )}>{item.status}</Badge>
                                            </td>
                                            {!isFinalized && (
                                                <td className="px-4 py-2 text-right">
                                                    <Button size="sm" variant="ghost" onClick={() => handleUnmatch(item.id)} className="text-red-400 hover:text-red-300 h-7 text-xs">
                                                        <Unlink2 className="h-3 w-3 mr-1" /> Unmatch
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
