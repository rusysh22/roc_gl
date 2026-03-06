"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search, TrendingUp, DollarSign, Briefcase, Activity } from "lucide-react";
import { format, startOfYear, endOfMonth } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

export default function FinancialDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date>(startOfYear(new Date()));
    const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
    const [data, setData] = useState<{
        kpi: { totalAssets: number, totalLiabilities: number, netProfit: number, operatingCashFlow: number, totalRevenue: number },
        monthlyTrend: { name: string, revenue: number, expense: number }[],
        assetComposition: { name: string, value: number }[],
        liabilityComposition: { name: string, value: number }[],
        topExpenses: { name: string, value: number }[],
    } | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
        if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
        try {
            const res = await fetch(`/api/reports/dashboard?${params}`);
            if (res.ok) setData(await res.json());
            else toast.error("Failed to fetch dashboard data");
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        handleGenerate();
    }, []);

    const fmt = (n: number) => new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(n);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    interface TooltipProps {
        active?: boolean;
        payload?: { color: string; name: string; value: number }[];
        label?: string;
    }

    const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[#1e293b] border border-white/[0.1] p-3 rounded-lg shadow-xl">
                    <p className="font-semibold text-white mb-2">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            {entry.name}: {fmt(entry.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" /> Financial Dashboard
                    </h2>
                    <p className="text-xs text-slate-400">PSAK Standardized Interactive Analytics</p>
                </div>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !startDate && "text-slate-500")}>
                                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !endDate && "text-slate-500")}>
                                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white h-9">
                        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Update Dashboard
                    </Button>
                </div>
            </div>

            {loading && !data && (
                <div className="h-64 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                </div>
            )}

            {data && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                                <Briefcase className="h-6 w-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Assets</p>
                                <p className="text-xl font-bold text-white mt-1">{fmt(data.kpi.totalAssets)}</p>
                            </div>
                        </div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                                <Activity className="h-6 w-6 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Liabilities</p>
                                <p className="text-xl font-bold text-white mt-1">{fmt(data.kpi.totalLiabilities)}</p>
                            </div>
                        </div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                <TrendingUp className="h-6 w-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Net Profit</p>
                                <p className={cn("text-xl font-bold mt-1", data.kpi.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                    {fmt(data.kpi.netProfit)}
                                </p>
                            </div>
                        </div>
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                                <DollarSign className="h-6 w-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Operating Cash Flow</p>
                                <p className={cn("text-xl font-bold mt-1", data.kpi.operatingCashFlow >= 0 ? "text-purple-400" : "text-red-400")}>
                                    {fmt(data.kpi.operatingCashFlow)}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Revenue vs Expense Trend */}
                        <div className="xl:col-span-2 bg-[#111827] border border-white/[0.08] rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-white mb-6">Revenue vs Expense Trend</h3>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                        <Area type="monotone" dataKey="expense" name="Expenses" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Expenses */}
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5 flex flex-col">
                            <h3 className="text-lg font-semibold text-white mb-6">Top Operating Expenses</h3>
                            <div className="flex-1 h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data.topExpenses} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" stroke="#cbd5e1" fontSize={11} tickLine={false} axisLine={false} width={100} />
                                        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1e293b' }} />
                                        <Bar dataKey="value" name="Amount" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24}>
                                            {data.topExpenses.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Asset Composition */}
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-white mb-2">Asset Composition</h3>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.assetComposition}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            {data.assetComposition.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Liability & Equity Composition */}
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-5">
                            <h3 className="text-lg font-semibold text-white mb-2">Liability & Equity</h3>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.liabilityComposition}
                                            cx="50%" cy="50%"
                                            innerRadius={60} outerRadius={90}
                                            paddingAngle={5} dataKey="value"
                                        >
                                            {data.liabilityComposition.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#8b5cf6'][index % 3]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Financial Snapshot Summary */}
                        <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 border border-blue-500/20 rounded-xl p-6 flex flex-col justify-center">
                            <h3 className="text-xl font-bold text-white mb-4">Financial Health Snapshot</h3>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                                Analysis for the period of <strong className="text-white">{format(startDate, "MMM dd, yyyy")}</strong> to <strong className="text-white">{format(endDate, "MMM dd, yyyy")}</strong> indicates a net profit margin based on operational data. Current ratio and debt-to-equity figures are reflected in the compositional breakdown.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#0a0e1a]/50 rounded-lg p-3 border border-white/[0.05]">
                                    <p className="text-xs text-slate-400 capitalize">Asset to Liability</p>
                                    <p className="text-lg font-bold text-emerald-400 mt-1">
                                        {data.kpi.totalLiabilities > 0 ? (data.kpi.totalAssets / data.kpi.totalLiabilities).toFixed(2) : "N/A"}x
                                    </p>
                                </div>
                                <div className="bg-[#0a0e1a]/50 rounded-lg p-3 border border-white/[0.05]">
                                    <p className="text-xs text-slate-400 capitalize">Profit Margin</p>
                                    <p className="text-lg font-bold text-blue-400 mt-1">
                                        {data.kpi.totalRevenue > 0 ? ((data.kpi.netProfit / data.kpi.totalRevenue) * 100).toFixed(1) : "0"}%
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    );
}
