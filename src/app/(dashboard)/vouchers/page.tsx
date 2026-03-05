"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, FileText, ArrowUpRight, ArrowDownRight, Loader2, ArrowRight, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Voucher is basically a Journal of type PV or RV
interface Voucher {
    id: string;
    journalNumber: string;
    journalType: "PV" | "RV";
    journalDate: string;
    referenceNumber: string;
    description: string;
    totalDebit: string | number;
    status: string;
    period: { name: string };
    currencyCode: string;
}

export default function VouchersPage() {
    const router = useRouter();
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");

    const fetchVouchers = async (query = "", type = "ALL") => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (query) params.append("search", query);
            if (type !== "ALL") params.append("type", type);

            const res = await fetch(`/api/voucher?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setVouchers(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers("", typeFilter);
    }, [typeFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchVouchers(search, typeFilter);
    };

    const handleVoid = async (voucherId: string) => {
        if (!confirm("Are you sure you want to void this voucher? This will create a reversal journal.")) return;
        try {
            const res = await fetch(`/api/voucher/${voucherId}/void`, { method: "POST" });
            if (res.ok) {
                toast.success("Voucher voided successfully");
                fetchVouchers(search, typeFilter);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to void voucher");
            }
        } catch {
            toast.error("System error occurred");
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Spend & Receive Money</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage Payment Vouchers (PV) and Receipt Vouchers (RV).</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={() => router.push("/vouchers/new?type=RV")} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <ArrowDownRight className="h-4 w-4 mr-2" /> Receive Money
                    </Button>
                    <Button onClick={() => router.push("/vouchers/new?type=PV")} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                        <ArrowUpRight className="h-4 w-4 mr-2" /> Spend Money
                    </Button>
                </div>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-white/[0.08] flex flex-col sm:flex-row items-center gap-4 bg-black/20">
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search descriptions, refs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0d1117] border-white/[0.08] text-white pl-9 h-9 ring-offset-[#111827] focus-visible:ring-blue-500 transition-colors"
                        />
                    </form>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 bg-[#0d1117] border-white/[0.08] text-white">
                            <SelectValue placeholder="All Types" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                            <SelectItem value="ALL">All Vouchers</SelectItem>
                            <SelectItem value="PV">Payment Vouchers (Out)</SelectItem>
                            <SelectItem value="RV">Receipt Vouchers (In)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4">Voucher No</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                                    </td>
                                </tr>
                            ) : vouchers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                                <FileText className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-300 font-medium">No vouchers found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                vouchers.map((v) => (
                                    <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-slate-200 font-medium">{v.journalNumber}</span>
                                            {v.referenceNumber && (
                                                <div className="text-xs text-slate-500 mt-0.5">Ref: {v.referenceNumber}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge className={cn("text-xs", v.journalType === "RV" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20")} variant="outline">
                                                {v.journalType === "RV" ? "RECEIPT" : "PAYMENT"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {format(new Date(v.journalDate), "dd MMM yyyy")}
                                            <div className="text-xs text-slate-500 mt-0.5">{v.period?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300 max-w-[200px] truncate">
                                            {v.description || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap text-slate-200 font-mono font-medium">
                                            {v.currencyCode} {Number(v.totalDebit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge className={cn("text-xs font-medium", v.status === "POSTED" ? "bg-emerald-500/10 text-emerald-400 border-transparent" : "bg-amber-500/10 text-amber-400 border-transparent")}>
                                                {v.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {v.status === "POSTED" && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleVoid(v.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                                        <Ban className="h-4 w-4 mr-1" /> Void
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/journal/${v.id}`)} className="text-slate-400 hover:text-white hover:bg-white/10">
                                                    View GL <ArrowRight className="h-4 w-4 ml-1" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
