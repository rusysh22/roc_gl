"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    Coins, Loader2, ArrowUpRight, ArrowDownRight, Plus,
    Wallet, TrendingUp, TrendingDown, MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RecentTx {
    id: string;
    transactionDate: string;
    transactionType: string;
    amount: string | number;
    description: string | null;
    reference: string | null;
}

interface PettyCashFund {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    currencyCode: string;
    openingBalance: number;
    currentBalance: number;
    coaCode: string;
    coaName: string;
    recentTransactions: RecentTx[];
}

export default function PettyCashPage() {
    const router = useRouter();
    const [funds, setFunds] = useState<PettyCashFund[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("/api/petty-cash");
                if (res.ok) setFunds(await res.json());
            } catch (error) {
                console.error(error);
                toast.error("Failed to load petty cash data");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const totalBalance = funds.reduce((sum, f) => sum + f.currentBalance, 0);

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <Coins className="h-6 w-6 text-amber-400" /> Petty Cash
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                        Monitor all cash fund balances and recent spending activity.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => router.push("/vouchers/new?type=PV")}
                        variant="outline"
                        className="border-white/[0.1] text-slate-300 hover:bg-white/5"
                    >
                        <ArrowUpRight className="h-4 w-4 mr-2 text-red-400" /> Spend Money
                    </Button>
                    <Button
                        onClick={() => router.push("/vouchers/new?type=RV")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                    >
                        <ArrowDownRight className="h-4 w-4 mr-2" /> Top Up / Receive
                    </Button>
                </div>
            </div>

            {/* Total Balance Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-[#111827] to-[#111827] border border-amber-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-amber-400/80 uppercase tracking-widest font-semibold">Total Cash On Hand</p>
                        <p className="text-3xl font-bold text-white font-mono mt-1">
                            IDR {totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{funds.length} active fund{funds.length !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-amber-400" />
                    </div>
                </div>
            </div>

            {/* Fund Cards Grid */}
            {funds.length === 0 ? (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-12 text-center">
                    <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                        <Coins className="h-7 w-7 text-slate-500" />
                    </div>
                    <p className="text-slate-300 font-medium mb-1">No cash funds found</p>
                    <p className="text-sm text-slate-500 mb-4">Create a Bank Account to get started with Petty Cash.</p>
                    <Button onClick={() => router.push("/bank-accounts/new")} className="bg-blue-600 hover:bg-blue-500 text-white">
                        <Plus className="h-4 w-4 mr-2" /> Create Fund
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {funds.map(fund => {
                        const hasActivity = fund.recentTransactions.length > 0;
                        return (
                            <div key={fund.id} className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/[0.15] transition-colors group">
                                {/* Card Header */}
                                <div className="p-5 border-b border-white/[0.06]">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-white truncate">{fund.accountName}</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">{fund.bankName} &bull; {fund.accountNumber}</p>
                                            <p className="text-[10px] text-slate-600 font-mono mt-0.5">{fund.coaCode} — {fund.coaName}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => router.push(`/bank-accounts/${fund.id}`)}
                                            className="h-8 w-8 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-2xl font-bold text-white font-mono">
                                            {fund.currencyCode} {fund.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>

                                {/* Recent Transactions */}
                                <div className="p-4">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Recent Activity</p>
                                    {!hasActivity ? (
                                        <p className="text-xs text-slate-600 italic">No transactions yet</p>
                                    ) : (
                                        <div className="space-y-2 max-h-[160px] overflow-y-auto">
                                            {fund.recentTransactions.slice(0, 5).map(tx => (
                                                <div key={tx.id} className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                                        <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
                                                            tx.transactionType === "DEBIT" ? "bg-emerald-500/10" : "bg-red-500/10"
                                                        )}>
                                                            {tx.transactionType === "DEBIT"
                                                                ? <TrendingUp className="h-3 w-3 text-emerald-400" />
                                                                : <TrendingDown className="h-3 w-3 text-red-400" />
                                                            }
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-slate-300 truncate">{tx.description || tx.reference || "-"}</p>
                                                            <p className="text-slate-600 font-mono">{format(new Date(tx.transactionDate), "dd MMM")}</p>
                                                        </div>
                                                    </div>
                                                    <span className={cn("font-mono font-medium shrink-0 ml-2",
                                                        tx.transactionType === "DEBIT" ? "text-emerald-400" : "text-red-400"
                                                    )}>
                                                        {tx.transactionType === "DEBIT" ? "+" : "-"}{Number(tx.amount).toLocaleString("en-US")}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
