"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Search, ArrowRightLeft, Loader2, ArrowRight, Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Transfer {
    id: string;
    journalNumber: string;
    journalDate: string;
    description: string;
    totalDebit: string | number;
    status: string;
    currencyCode: string;
    period: { name: string } | null;
    lines: Array<{
        lineNumber: number;
        description: string;
        debitAmount: string | number;
        creditAmount: string | number;
        coa: { code: string; name: string };
    }>;
}

export default function TransfersPage() {
    const router = useRouter();
    const [transfers, setTransfers] = useState<Transfer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchTransfers = async (query = "") => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append("search", query);
            const res = await fetch(`/api/transfer?${params.toString()}`);
            if (res.ok) setTransfers(await res.json());
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTransfers(); }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchTransfers(search);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Internal Transfers</h2>
                    <p className="text-sm text-slate-400 mt-1">Inter-bank fund transfers history.</p>
                </div>
                <Button onClick={() => router.push("/transfers/new")} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    <Plus className="h-4 w-4 mr-2" /> New Transfer
                </Button>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-white/[0.08] bg-black/20">
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search transfers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0d1117] border-white/[0.08] text-white pl-9 h-9 ring-offset-[#111827] focus-visible:ring-blue-500"
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4">Transfer No</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4">Destination</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr><td colSpan={7} className="px-6 py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
                            ) : transfers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                                <ArrowRightLeft className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-300 font-medium">No transfers found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((t) => {
                                    const sourceLine = t.lines.find(l => l.lineNumber === 2);
                                    const destLine = t.lines.find(l => l.lineNumber === 1);
                                    return (
                                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-slate-200 font-medium">{t.journalNumber}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                {format(new Date(t.journalDate), "dd/MM/yyyy")}
                                                {t.period && <div className="text-xs text-slate-500 mt-0.5">{t.period.name}</div>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div className="text-sm">{sourceLine?.coa.name || "-"}</div>
                                                <div className="text-xs text-slate-500 font-mono">{sourceLine?.coa.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300">
                                                <div className="text-sm">{destLine?.coa.name || "-"}</div>
                                                <div className="text-xs text-slate-500 font-mono">{destLine?.coa.code}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap text-slate-200 font-mono font-medium">
                                                {t.currencyCode} {Number(t.totalDebit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <Badge className={cn("text-xs font-medium", t.status === "POSTED" ? "bg-emerald-500/10 text-emerald-400 border-transparent" : t.status === "REVERSED" ? "bg-red-500/10 text-red-400 border-transparent" : "bg-amber-500/10 text-amber-400 border-transparent")}>
                                                    {t.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/journal/${t.id}`)} className="text-slate-400 hover:text-white hover:bg-white/10">
                                                    View GL <ArrowRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
