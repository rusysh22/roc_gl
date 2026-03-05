"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Plus, Search, Landmark, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BankAccount {
    id: string;
    accountName: string;
    bankName: string;
    accountNumber: string;
    currencyCode: string;
    openingBalance: number;
    isActive: boolean;
    coa: { code: string; name: string };
}

export default function BankAccountsPage() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchAccounts = async (query = "") => {
        setLoading(true);
        try {
            const res = await fetch(`/api/bank-account${query ? `?search=${encodeURIComponent(query)}` : ""}`);
            if (res.ok) {
                const data = await res.json();
                setAccounts(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAccounts(search);
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Bank Accounts</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage your company's bank and cash accounts.</p>
                </div>
                <Button onClick={() => router.push("/bank-accounts/new")} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                    <Plus className="h-4 w-4 mr-2" /> Add Bank Account
                </Button>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-black/20">
                    <form onSubmit={handleSearch} className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search accounts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-[#0d1117] border-white/[0.08] text-white pl-9 h-9 ring-offset-[#111827] focus-visible:ring-blue-500 transition-colors"
                        />
                    </form>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08]">
                            <tr>
                                <th className="px-6 py-4">Account details</th>
                                <th className="px-6 py-4">Bank</th>
                                <th className="px-6 py-4">Linked CoA</th>
                                <th className="px-6 py-4 whitespace-nowrap">Opening Balance</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" />
                                    </td>
                                </tr>
                            ) : accounts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                                                <Landmark className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <p className="text-slate-300 font-medium">No bank accounts found</p>
                                            <p className="text-slate-500 text-sm mt-1">Get started by adding a new bank account.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                accounts.map((acc) => (
                                    <tr key={acc.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
                                                    <Landmark className="h-5 w-5 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200">{acc.accountName}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{acc.accountNumber}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {acc.bankName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-slate-300">{acc.coa.name}</div>
                                            <div className="text-xs text-slate-500 font-mono mt-0.5">{acc.coa.code}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-mono">
                                            {acc.currencyCode} {Number(acc.openingBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Badge className={cn("text-xs px-2.5 py-0.5 font-medium", acc.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20")} variant="outline">
                                                {acc.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => router.push(`/bank-accounts/${acc.id}`)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                View <ArrowRight className="h-4 w-4 ml-1" />
                                            </Button>
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
