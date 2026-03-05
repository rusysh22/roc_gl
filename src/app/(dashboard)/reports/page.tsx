"use client";

import { useRouter } from "next/navigation";
import {
    BookOpen, Scale, TrendingUp, Landmark, Banknote,
    Users, Gauge, BarChart3, ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const reports = [
    { title: "General Ledger", description: "Transaction detail per account with running balance", icon: BookOpen, href: "/reports/general-ledger", color: "from-blue-500/20 to-blue-500/5 border-blue-500/20 hover:border-blue-400/40", iconColor: "text-blue-400" },
    { title: "Trial Balance", description: "Verify total debits equal total credits", icon: Scale, href: "/reports/trial-balance", color: "from-violet-500/20 to-violet-500/5 border-violet-500/20 hover:border-violet-400/40", iconColor: "text-violet-400" },
    { title: "Income Statement", description: "Revenue, expenses, and profitability (P&L)", icon: TrendingUp, href: "/reports/income-statement", color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 hover:border-emerald-400/40", iconColor: "text-emerald-400" },
    { title: "Balance Sheet", description: "Assets, liabilities, and equity position", icon: Landmark, href: "/reports/balance-sheet", color: "from-amber-500/20 to-amber-500/5 border-amber-500/20 hover:border-amber-400/40", iconColor: "text-amber-400" },
    { title: "Cash Flow Statement", description: "Operating, investing, and financing activities", icon: Banknote, href: "/reports/cash-flow", color: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 hover:border-cyan-400/40", iconColor: "text-cyan-400" },
    { title: "Changes in Equity", description: "Equity movement with retained earnings", icon: Users, href: "/reports/equity", color: "from-pink-500/20 to-pink-500/5 border-pink-500/20 hover:border-pink-400/40", iconColor: "text-pink-400" },
    { title: "Financial Ratios", description: "Liquidity, profitability, and leverage analysis", icon: Gauge, href: "/reports/financial-ratios", color: "from-orange-500/20 to-orange-500/5 border-orange-500/20 hover:border-orange-400/40", iconColor: "text-orange-400" },
];

export default function ReportsHubPage() {
    const router = useRouter();

    return (
        <div className="space-y-6 pb-20">
            <div>
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <BarChart3 className="h-6 w-6 text-violet-400" /> Financial Reports
                </h2>
                <p className="text-sm text-slate-400 mt-1">Generate comprehensive financial reports and analysis.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {reports.map(report => (
                    <div
                        key={report.href}
                        onClick={() => router.push(report.href)}
                        className={cn(
                            "bg-gradient-to-br rounded-xl p-5 border cursor-pointer transition-all group",
                            report.color
                        )}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <report.icon className={cn("h-6 w-6", report.iconColor)} />
                            <ArrowRight className="h-4 w-4 text-slate-600 group-hover:text-white transition-colors" />
                        </div>
                        <h3 className="text-base font-semibold text-white">{report.title}</h3>
                        <p className="text-xs text-slate-400 mt-1">{report.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
