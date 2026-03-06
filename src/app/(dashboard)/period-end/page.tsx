"use client";

import { useEffect, useState } from "react";
import { Loader2, ClipboardCheck, CheckCircle, AlertTriangle, Clock, Lock, Unlock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function PeriodEndPage() {
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { fetch("/api/master/period").then(r => r.ok ? r.json() : []).then(setPeriods); }, []);

    const handleGenerate = async () => {
        if (!selectedPeriod) { toast.error("Select a period"); return; }
        setLoading(true);
        const res = await fetch(`/api/period-end?periodId=${selectedPeriod}`);
        if (res.ok) setData(await res.json());
        setLoading(false);
    };

    const handleAction = async (action: string) => {
        setActionLoading(true);
        const res = await fetch("/api/period-end", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ periodId: selectedPeriod, action }),
        });
        if (res.ok) { toast.success(action === "close" ? "Period closed!" : "Period reopened"); handleGenerate(); }
        else { const e = await res.json(); toast.error(e.error); }
        setActionLoading(false);
    };

    const statusIcon = (status: string) => {
        switch (status) {
            case "DONE": return <CheckCircle className="h-4 w-4 text-emerald-400" />;
            case "PENDING": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
            default: return <Clock className="h-4 w-4 text-slate-500" />;
        }
    };
    const statusColor = (s: string) => s === "DONE" ? "bg-emerald-500/10 border-emerald-500/20" : s === "PENDING" ? "bg-amber-500/10 border-amber-500/20" : "bg-slate-500/10 border-slate-500/20";

    return (
        <div className="space-y-6 pb-20">
            <div><h2 className="text-xl font-bold text-white flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-cyan-400" /> Period-End Checklist</h2><p className="text-xs text-slate-400">Complete all mandatory items to close the period</p></div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div className="space-y-1"><Label className="text-xs text-slate-400">Period *</Label><Select value={selectedPeriod} onValueChange={setSelectedPeriod}><SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue placeholder="Select Period" /></SelectTrigger><SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">{periods.map((p: any) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.name} <span className="text-slate-500 ml-1">({p.status})</span></SelectItem>)}</SelectContent></Select></div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-cyan-600 hover:bg-cyan-500 text-white h-9">{loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-1" />} Load Checklist</Button>
                </div>
            </div>

            {data && (
                <>
                    {/* Progress Bar */}
                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white font-semibold">{data.period.name}</span>
                            <Badge variant="outline" className={cn("text-[10px]", data.period.status === "CLOSED" ? "border-red-500/20 text-red-400" : "border-emerald-500/20 text-emerald-400")}>{data.period.status}</Badge>
                        </div>
                        <div className="h-3 bg-white/[0.05] rounded-full overflow-hidden"><div className={cn("h-full rounded-full transition-all", data.canClose ? "bg-emerald-500" : "bg-amber-500")} style={{ width: `${data.progress}%` }} /></div>
                        <p className="text-[10px] text-slate-400 mt-1">{data.mandatoryDone}/{data.mandatoryTotal} mandatory items completed ({data.progress}%)</p>
                    </div>

                    {/* Checklist Items */}
                    <div className="space-y-3">
                        {data.items.map((item: any) => (
                            <div key={item.id} className={cn("rounded-xl p-4 border", statusColor(item.status))}>
                                <div className="flex items-center gap-3">
                                    {statusIcon(item.status)}
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-white">{item.title}</span>
                                            {item.mandatory && <Badge variant="outline" className="text-[8px] border-violet-500/20 text-violet-400">MANDATORY</Badge>}
                                        </div>
                                        <p className="text-xs text-slate-400">{item.description}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">{item.detail}</p>
                                    </div>
                                    <Badge variant="outline" className={cn("text-[9px]", item.status === "DONE" ? "text-emerald-400 border-emerald-500/20" : item.status === "PENDING" ? "text-amber-400 border-amber-500/20" : "text-slate-400 border-slate-500/20")}>{item.status}</Badge>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        {data.period.status !== "CLOSED" && (
                            <Button onClick={() => handleAction("close")} disabled={!data.canClose || actionLoading} className={cn("h-9", data.canClose ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-700 cursor-not-allowed")}>
                                {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Lock className="h-4 w-4 mr-1" />}
                                {data.canClose ? "Close Period" : "Cannot Close (checklist incomplete)"}
                            </Button>
                        )}
                        {data.period.status === "CLOSED" && (
                            <Button onClick={() => handleAction("reopen")} disabled={actionLoading} variant="outline" className="h-9 border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                                <Unlock className="h-4 w-4 mr-1" /> Reopen Period
                            </Button>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
