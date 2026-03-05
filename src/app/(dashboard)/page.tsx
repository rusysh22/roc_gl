import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import {
    Building2,
    Calendar,
    Users,
    DollarSign,
    TrendingUp,
    BookOpen,
    ArrowUpRight,
} from "lucide-react";

async function getDashboardData(companyId: string) {
    const [company, fiscalYear, branchCount, userCount, departmentCount, periodInfo] =
        await Promise.all([
            prisma.company.findUnique({ where: { id: companyId } }),
            prisma.fiscalYear.findFirst({
                where: { companyId, status: "OPEN" },
                orderBy: { startDate: "desc" },
            }),
            prisma.branch.count({ where: { companyId, isActive: true } }),
            prisma.user.count({ where: { companyId, isActive: true } }),
            prisma.department.count({ where: { companyId, isActive: true } }),
            prisma.period.findFirst({
                where: { companyId, status: "OPEN" },
                orderBy: { periodNumber: "desc" },
            }),
        ]);

    return { company, fiscalYear, branchCount, userCount, departmentCount, periodInfo };
}

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const companyId = (session.user as any).companyId;
    if (!companyId) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <p className="text-slate-400">No company assigned. Contact administrator.</p>
            </div>
        );
    }

    const { company, fiscalYear, branchCount, userCount, departmentCount, periodInfo } =
        await getDashboardData(companyId);

    const stats = [
        {
            title: "Branches",
            value: branchCount.toString(),
            icon: Building2,
            color: "from-blue-500 to-cyan-500",
            bgColor: "bg-blue-500/10",
            textColor: "text-blue-400",
        },
        {
            title: "Active Users",
            value: userCount.toString(),
            icon: Users,
            color: "from-emerald-500 to-teal-500",
            bgColor: "bg-emerald-500/10",
            textColor: "text-emerald-400",
        },
        {
            title: "Departments",
            value: departmentCount.toString(),
            icon: Building2,
            color: "from-purple-500 to-pink-500",
            bgColor: "bg-purple-500/10",
            textColor: "text-purple-400",
        },
        {
            title: "Active Period",
            value: periodInfo?.name || "-",
            icon: Calendar,
            color: "from-amber-500 to-orange-500",
            bgColor: "bg-amber-500/10",
            textColor: "text-amber-400",
        },
    ];

    return (
        <div className="space-y-8">
            {/* Welcome section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-purple-600/20 border border-white/[0.06] p-8">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <BookOpen className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">
                                Selamat datang, {session.user.name}
                            </h1>
                            <p className="text-slate-400 text-sm mt-0.5">
                                {company?.name || "Company"} · {fiscalYear?.name || "No active fiscal year"}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <div
                        key={stat.title}
                        className="group relative bg-[#111827]/80 border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.1] transition-all duration-200"
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    {stat.title}
                                </p>
                                <p className="text-2xl font-bold text-white mt-2">{stat.value}</p>
                            </div>
                            <div className={`${stat.bgColor} p-2.5 rounded-lg`}>
                                <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Company Info */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-blue-400" />
                        Company Information
                    </h3>
                    <div className="space-y-3">
                        {[
                            { label: "Company Code", value: company?.code },
                            { label: "NPWP", value: company?.npwp || "-" },
                            { label: "Base Currency", value: company?.baseCurrency },
                            { label: "Timezone", value: company?.timezone },
                            { label: "Subscription", value: company?.subscriptionPlan?.toUpperCase() },
                        ].map((item) => (
                            <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                                <span className="text-sm text-slate-400">{item.label}</span>
                                <span className="text-sm text-white font-medium">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-emerald-400" />
                        Fiscal Year Info
                    </h3>
                    {fiscalYear ? (
                        <div className="space-y-3">
                            {[
                                { label: "Fiscal Year", value: fiscalYear.name },
                                {
                                    label: "Period",
                                    value: `${new Date(fiscalYear.startDate).toLocaleDateString("id-ID")} - ${new Date(fiscalYear.endDate).toLocaleDateString("id-ID")}`,
                                },
                                { label: "Status", value: fiscalYear.status },
                                { label: "Active Period", value: periodInfo?.name || "-" },
                            ].map((item) => (
                                <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                                    <span className="text-sm text-slate-400">{item.label}</span>
                                    <span className="text-sm text-white font-medium">
                                        {item.label === "Status" ? (
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.value === "OPEN"
                                                        ? "bg-emerald-500/10 text-emerald-400"
                                                        : "bg-red-500/10 text-red-400"
                                                    }`}
                                            >
                                                {item.value}
                                            </span>
                                        ) : (
                                            item.value
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 text-sm">No active fiscal year found.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
