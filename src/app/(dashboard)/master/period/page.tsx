"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Loader2, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Period { id: string; periodNumber: number; name: string; startDate: string; endDate: string; status: string; fiscalYear: { name: string }; }

export default function PeriodPage() {
    const [items, setItems] = useState<Period[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try { const res = await fetch("/api/master/period"); if (res.ok) setItems(await res.json()); } catch { toast.error("Failed to fetch"); } finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const toggleStatus = async (item: Period) => {
        const newStatus = item.status === "OPEN" ? "CLOSED" : "OPEN";
        try {
            const res = await fetch(`/api/master/period/${item.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
            if (res.ok) { toast.success(`Period ${item.name} ${newStatus.toLowerCase()}`); fetchData(); } else { const err = await res.json(); toast.error(err.error); }
        } catch { toast.error("Failed to update"); }
    };

    const statusColor = (s: string) => s === "OPEN" ? "bg-emerald-500/10 text-emerald-400" : s === "CLOSED" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400";

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2"><CalendarDays className="h-6 w-6 text-blue-400" />Periods</h2>
                <p className="text-sm text-slate-400 mt-1">Manage accounting periods (auto-created with fiscal year)</p>
            </div>

            <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden">
                <table className="w-full">
                    <thead><tr className="border-b border-white/[0.06]">
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">#</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Period Name</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Fiscal Year</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Start</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">End</th>
                        <th className="text-left px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-right px-5 py-3.5 text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-white/[0.04]">
                        {loading ? <tr><td colSpan={7} className="text-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-400 mx-auto" /></td></tr>
                            : items.length === 0 ? <tr><td colSpan={7} className="text-center py-12 text-slate-400">No periods found</td></tr>
                                : items.map(item => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-5 py-3.5 text-sm text-slate-400">{item.periodNumber}</td>
                                        <td className="px-5 py-3.5 text-sm text-white font-medium">{item.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{item.fiscalYear.name}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{new Date(item.startDate).toLocaleDateString("id-ID")}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-300">{new Date(item.endDate).toLocaleDateString("id-ID")}</td>
                                        <td className="px-5 py-3.5"><Badge className={statusColor(item.status)}>{item.status}</Badge></td>
                                        <td className="px-5 py-3.5 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toggleStatus(item)} className="text-slate-400 hover:text-white h-8">
                                                {item.status === "OPEN" ? <><Lock className="h-3.5 w-3.5 mr-1" />Close</> : <><Unlock className="h-3.5 w-3.5 mr-1" />Open</>}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
