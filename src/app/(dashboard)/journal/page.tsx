"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { FileText, Plus, Search, Filter, ArrowRight, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Journal {
    id: string;
    journalNumber: string;
    journalType: string;
    journalDate: string;
    totalDebit: number;
    totalCredit: number;
    currencyCode: string;
    status: string;
    description: string | null;
    period: { name: string } | null;
    creator: { name: string } | null;
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-500/10 text-slate-400",
    SUBMITTED: "bg-amber-500/10 text-amber-400",
    APPROVED: "bg-blue-500/10 text-blue-400",
    POSTED: "bg-emerald-500/10 text-emerald-400",
    REVERSED: "bg-red-500/10 text-red-400",
};

const formatCurrency = (amount: number, currency: string = "IDR") => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency }).format(amount);
};

export default function JournalListPage() {
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState("");
    const [type, setType] = useState("all");
    const [status, setStatus] = useState("all");
    const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
        from: undefined, to: undefined
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (type !== "all") params.set("type", type);
            if (status !== "all") params.set("status", status);
            if (dateRange.from) params.set("startDate", dateRange.from.toISOString());
            if (dateRange.to) params.set("endDate", dateRange.to.toISOString());

            const res = await fetch(`/api/journal?${params.toString()}`);
            if (res.ok) {
                const json = await res.json();
                setJournals(json.data || []);
            } else {
                toast.error("Failed to fetch journals");
            }
        } catch {
            toast.error("An error occurred fetching journals");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => { fetchData(); }, 500); // debounce search
        return () => clearTimeout(timer);
    }, [search, type, status, dateRange]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2"><FileText className="h-6 w-6 text-blue-400" />Journal Entries</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage and review all general ledger transactions</p>
                </div>
                <Link href="/journal/new">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white">
                        <Plus className="h-4 w-4 mr-2" />New Journal
                    </Button>
                </Link>
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by journal#, reference, desc..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-[#0d1117] border-white/[0.08] text-white h-10 w-full"
                        />
                    </div>

                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-[160px] bg-[#0d1117] border-white/[0.08] text-white h-10">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="GJ">General Journal (GJ)</SelectItem>
                            <SelectItem value="AJ">Adjusting (AJ)</SelectItem>
                            <SelectItem value="RJ">Reversing (RJ)</SelectItem>
                            <SelectItem value="IC">Intercompany (IC)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger className="w-[160px] bg-[#0d1117] border-white/[0.08] text-white h-10">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="POSTED">Posted</SelectItem>
                            <SelectItem value="REVERSED">Reversed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn(
                                "w-[260px] justify-start text-left font-normal bg-[#0d1117] border-white/[0.08] hover:bg-white/[0.04]",
                                !dateRange.from && "text-slate-400"
                            )}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange.from ? (
                                    dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "dd/MM/yyyy")
                                    )
                                ) : (
                                    <span>Pick a date range</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.08] text-white" align="start">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange.from}
                                selected={{ from: dateRange.from, to: dateRange.to }}
                                onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                                numberOfMonths={2}
                                className="text-white"
                            />
                        </PopoverContent>
                    </Popover>

                    {(search || type !== "all" || status !== "all" || dateRange.from) && (
                        <Button variant="ghost" onClick={() => { setSearch(""); setType("all"); setStatus("all"); setDateRange({ from: undefined, to: undefined }); }} className="text-slate-400 hover:text-white">Clear</Button>
                    )}
                </div>

                <div className="border border-white/[0.06] rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/[0.06]">
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Journal No</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Date</th>
                                <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 uppercase">Description</th>
                                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Amount</th>
                                <th className="text-center px-4 py-3 text-xs font-medium text-slate-400 uppercase">Status</th>
                                <th className="text-right px-4 py-3 text-xs font-medium text-slate-400 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.04]">
                            {loading ? (
                                <tr><td colSpan={6} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            ) : journals.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-12 text-slate-400">No journal entries found</td></tr>
                            ) : (
                                journals.map((journal) => (
                                    <tr key={journal.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-mono text-blue-400 font-medium">{journal.journalNumber}</span>
                                                <span className="text-xs text-slate-500">{journal.journalType} • {journal.period?.name || "-"}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-300">
                                            {format(new Date(journal.journalDate), "dd/MM/yyyy")}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-slate-200 line-clamp-1 max-w-[250px]">{journal.description || "-"}</div>
                                            <div className="text-xs text-slate-500">By: {journal.creator?.name || "System"}</div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="text-sm font-medium text-slate-200">{formatCurrency(journal.totalDebit, journal.currencyCode)}</div>
                                            <div className="text-xs text-slate-500">Bal: {formatCurrency(journal.totalCredit, journal.currencyCode)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge className={cn("text-[10px]", statusColors[journal.status] || "bg-slate-500/10 text-slate-400")}>
                                                {journal.status}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/journal/${journal.id}`}>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-white/[0.08]">
                                                    <ArrowRight className="h-4 w-4" />
                                                </Button>
                                            </Link>
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
