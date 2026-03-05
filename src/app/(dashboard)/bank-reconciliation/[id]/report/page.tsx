"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    ArrowLeft, Printer, Loader2, CheckCircle2, AlertTriangle,
    TrendingUp, TrendingDown, Scale
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ReportItem {
    journalNumber?: string;
    date: string;
    description: string | null;
    reference?: string | null;
    amount: number;
}

interface ReportData {
    reconciliation: {
        id: string;
        status: string;
        bankAccount: { accountName: string; bankName: string; currencyCode: string; coa: { code: string; name: string } };
        period: { name: string };
    };
    sectionA: {
        bankStatementBalance: number;
        depositsInTransit: ReportItem[];
        totalDepositsInTransit: number;
        outstandingChecks: ReportItem[];
        totalOutstandingChecks: number;
        adjustedBankBalance: number;
    };
    sectionB: {
        glBalance: number;
        unrecordedDeposits: ReportItem[];
        totalUnrecordedDeposits: number;
        unrecordedCharges: ReportItem[];
        totalUnrecordedCharges: number;
        adjustedGlBalance: number;
    };
    summary: {
        adjustedBankBalance: number;
        adjustedGlBalance: number;
        difference: number;
    };
}

export default function ReconciliationReportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const reconId = resolvedParams.id;

    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ReportData | null>(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const res = await fetch(`/api/bank-reconciliation/${reconId}/report`);
                if (res.ok) {
                    setData(await res.json());
                } else {
                    toast.error("Failed to load report");
                    router.push(`/bank-reconciliation/${reconId}`);
                }
            } catch {
                toast.error("System error");
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [reconId]);

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;
    if (!data) return null;

    const { reconciliation, sectionA, sectionB, summary } = data;
    const isReconciled = Math.abs(summary.difference) < 0.01;
    const currency = reconciliation.bankAccount.currencyCode;

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push(`/bank-reconciliation/${reconId}`)} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Bank Reconciliation Statement</h2>
                        <p className="text-sm text-slate-400 mt-0.5">
                            {reconciliation.bankAccount.accountName} — {reconciliation.period.name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className={cn("text-xs",
                        reconciliation.status === "FINALIZED" ? "border-emerald-500/20 text-emerald-400 bg-emerald-500/10" : "border-amber-500/20 text-amber-400 bg-amber-500/10"
                    )}>
                        {reconciliation.status}
                    </Badge>
                    <Button variant="outline" onClick={() => window.print()} className="border-white/[0.1] text-slate-300 hover:bg-white/5">
                        <Printer className="h-4 w-4 mr-2" /> Print
                    </Button>
                </div>
            </div>

            {/* Report Title (print friendly) */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 text-center">
                <Scale className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <h1 className="text-lg font-bold text-white">BANK RECONCILIATION STATEMENT</h1>
                <p className="text-sm text-slate-400 mt-1">
                    {reconciliation.bankAccount.accountName} ({reconciliation.bankAccount.bankName})
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                    GL Account: {reconciliation.bankAccount.coa.code} — {reconciliation.bankAccount.coa.name}
                </p>
                <p className="text-xs text-slate-500">Period: {reconciliation.period.name}</p>
            </div>

            {/* Section A: Bank Statement to Adjusted */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] bg-blue-500/5">
                    <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wider">Section A — Bank Statement Side</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Balance per Bank Statement</span>
                        <span className="font-mono text-white font-bold text-lg">{currency} {fmt(sectionA.bankStatementBalance)}</span>
                    </div>

                    {/* Add: Deposits in Transit */}
                    {sectionA.depositsInTransit.length > 0 && (
                        <div className="pl-4 border-l-2 border-emerald-500/30 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-2">
                                <TrendingUp className="h-3 w-3" /> Add: Deposits in Transit
                            </div>
                            {sectionA.depositsInTransit.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400 flex-1 truncate">
                                        <span className="font-mono text-xs text-slate-500 mr-2">{format(new Date(item.date), "dd/MM")}</span>
                                        {item.journalNumber} — {item.description || "-"}
                                    </span>
                                    <span className="font-mono text-emerald-400 ml-4">+{fmt(item.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-medium border-t border-white/[0.06] pt-1 mt-1">
                                <span className="text-slate-300 text-xs">Total Deposits in Transit</span>
                                <span className="font-mono text-emerald-400">{fmt(sectionA.totalDepositsInTransit)}</span>
                            </div>
                        </div>
                    )}

                    {/* Less: Outstanding Checks */}
                    {sectionA.outstandingChecks.length > 0 && (
                        <div className="pl-4 border-l-2 border-red-500/30 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-red-400 uppercase tracking-wider font-semibold mb-2">
                                <TrendingDown className="h-3 w-3" /> Less: Outstanding Checks
                            </div>
                            {sectionA.outstandingChecks.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400 flex-1 truncate">
                                        <span className="font-mono text-xs text-slate-500 mr-2">{format(new Date(item.date), "dd/MM")}</span>
                                        {item.journalNumber} — {item.description || "-"}
                                    </span>
                                    <span className="font-mono text-red-400 ml-4">-{fmt(item.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-medium border-t border-white/[0.06] pt-1 mt-1">
                                <span className="text-slate-300 text-xs">Total Outstanding Checks</span>
                                <span className="font-mono text-red-400">({fmt(sectionA.totalOutstandingChecks)})</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t-2 border-blue-500/20">
                        <span className="text-blue-300 font-semibold">Adjusted Bank Balance</span>
                        <span className="font-mono text-blue-400 font-bold text-lg">{currency} {fmt(sectionA.adjustedBankBalance)}</span>
                    </div>
                </div>
            </div>

            {/* Section B: GL Balance to Adjusted */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.08] bg-indigo-500/5">
                    <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Section B — General Ledger Side</h3>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-medium">Balance per General Ledger</span>
                        <span className="font-mono text-white font-bold text-lg">{currency} {fmt(sectionB.glBalance)}</span>
                    </div>

                    {/* Add: Unrecorded Deposits */}
                    {sectionB.unrecordedDeposits.length > 0 && (
                        <div className="pl-4 border-l-2 border-emerald-500/30 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-emerald-400 uppercase tracking-wider font-semibold mb-2">
                                <TrendingUp className="h-3 w-3" /> Add: Unrecorded Bank Deposits
                            </div>
                            {sectionB.unrecordedDeposits.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400 flex-1 truncate">
                                        <span className="font-mono text-xs text-slate-500 mr-2">{format(new Date(item.date), "dd/MM")}</span>
                                        {item.reference || "-"} — {item.description || "-"}
                                    </span>
                                    <span className="font-mono text-emerald-400 ml-4">+{fmt(item.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-medium border-t border-white/[0.06] pt-1 mt-1">
                                <span className="text-slate-300 text-xs">Total Unrecorded Deposits</span>
                                <span className="font-mono text-emerald-400">{fmt(sectionB.totalUnrecordedDeposits)}</span>
                            </div>
                        </div>
                    )}

                    {/* Less: Unrecorded Charges */}
                    {sectionB.unrecordedCharges.length > 0 && (
                        <div className="pl-4 border-l-2 border-red-500/30 space-y-1">
                            <div className="flex items-center gap-2 text-xs text-red-400 uppercase tracking-wider font-semibold mb-2">
                                <TrendingDown className="h-3 w-3" /> Less: Unrecorded Bank Charges
                            </div>
                            {sectionB.unrecordedCharges.map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-slate-400 flex-1 truncate">
                                        <span className="font-mono text-xs text-slate-500 mr-2">{format(new Date(item.date), "dd/MM")}</span>
                                        {item.reference || "-"} — {item.description || "-"}
                                    </span>
                                    <span className="font-mono text-red-400 ml-4">-{fmt(item.amount)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between text-sm font-medium border-t border-white/[0.06] pt-1 mt-1">
                                <span className="text-slate-300 text-xs">Total Unrecorded Charges</span>
                                <span className="font-mono text-red-400">({fmt(sectionB.totalUnrecordedCharges)})</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t-2 border-indigo-500/20">
                        <span className="text-indigo-300 font-semibold">Adjusted GL Balance</span>
                        <span className="font-mono text-indigo-400 font-bold text-lg">{currency} {fmt(sectionB.adjustedGlBalance)}</span>
                    </div>
                </div>
            </div>

            {/* Final Summary: Reconciliation Result */}
            <div className={cn("rounded-xl overflow-hidden border", isReconciled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                <div className="p-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        {isReconciled ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-6 w-6 text-red-400" />
                        )}
                        <h3 className={cn("text-lg font-bold", isReconciled ? "text-emerald-400" : "text-red-400")}>
                            {isReconciled ? "RECONCILED ✓" : "UNRECONCILED — DIFFERENCE EXISTS"}
                        </h3>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Adjusted Bank</p>
                            <p className="font-mono font-bold text-blue-400 text-lg">{fmt(summary.adjustedBankBalance)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Adjusted GL</p>
                            <p className="font-mono font-bold text-indigo-400 text-lg">{fmt(summary.adjustedGlBalance)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Difference</p>
                            <p className={cn("font-mono font-bold text-lg", isReconciled ? "text-emerald-400" : "text-red-400")}>
                                {fmt(summary.difference)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
