"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Building2,
    GitBranch,
    Calendar,
    CalendarDays,
    Users,
    Shield,
    Landmark,
    Wallet,
    ArrowRightLeft,
    Building,
    CircleDollarSign,
    ChevronDown,
    ChevronRight,
    LogOut,
    Menu,
    X,
    BookOpen,
    FileSpreadsheet,
    FileText,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
    title: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    children?: NavItem[];
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
    },
    {
        title: "Master Data",
        icon: Building2,
        children: [
            { title: "Company", href: "/master/company", icon: Building },
            { title: "Branch", href: "/master/branch", icon: GitBranch },
            { title: "Fiscal Year", href: "/master/fiscal-year", icon: Calendar },
            { title: "Period", href: "/master/period", icon: CalendarDays },
            { title: "Department", href: "/master/department", icon: Building2 },
            { title: "Cost Center", href: "/master/cost-center", icon: CircleDollarSign },
            { title: "Currency", href: "/master/currency", icon: Landmark },
            { title: "Exchange Rate", href: "/master/exchange-rate", icon: ArrowRightLeft },
            { title: "Users", href: "/master/users", icon: Users },
            { title: "Roles", href: "/master/roles", icon: Shield },
        ],
    },
    {
        title: "Cash & Bank",
        icon: Wallet,
        children: [
            { title: "Bank Accounts", href: "/bank-accounts", icon: Landmark },
            { title: "Spend & Receive", href: "/vouchers", icon: CircleDollarSign },
            { title: "Internal Transfers", href: "/transfers/new", icon: ArrowRightLeft },
        ],
    },
    {
        title: "Chart of Accounts",
        icon: FileSpreadsheet,
        children: [
            { title: "CoA Group", href: "/master/coa-group", icon: BookOpen },
            { title: "Chart of Accounts", href: "/master/coa", icon: FileSpreadsheet },
        ],
    },
    {
        title: "Transactions",
        icon: FileText,
        children: [
            { title: "Journal Entries", href: "/journal", icon: FileText },
        ],
    },
];

export function SidebarNav() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [collapsed, setCollapsed] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>(["Master Data"]);

    const toggleGroup = (title: string) => {
        setExpandedGroups((prev) =>
            prev.includes(title)
                ? prev.filter((g) => g !== title)
                : [...prev, title]
        );
    };

    const isActive = (href: string) => pathname === href;
    const isGroupActive = (item: NavItem) =>
        item.children?.some((child) => child.href && pathname.startsWith(child.href)) ?? false;

    const initials = session?.user?.name
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "U";

    return (
        <>
            {/* Mobile overlay */}
            {!collapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setCollapsed(true)}
                />
            )}

            {/* Mobile toggle */}
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-4 left-4 z-50 lg:hidden text-white hover:bg-white/10"
                onClick={() => setCollapsed(!collapsed)}
            >
                {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </Button>

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed left-0 top-0 h-full bg-[#0f1420] border-r border-white/[0.06] z-50 flex flex-col transition-all duration-300",
                    collapsed ? "w-0 lg:w-[68px]" : "w-[260px]",
                    collapsed && "overflow-hidden lg:overflow-visible"
                )}
            >
                {/* Logo */}
                <div className="h-16 flex items-center px-5 border-b border-white/[0.06] shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                            <BookOpen className="w-4 h-4 text-white" />
                        </div>
                        {!collapsed && (
                            <span className="text-lg font-bold text-white tracking-tight">
                                gl<span className="text-blue-400">_</span>roc
                            </span>
                        )}
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    {navItems.map((item) => {
                        if (item.children) {
                            const isExpanded = expandedGroups.includes(item.title);
                            const groupActive = isGroupActive(item);

                            return (
                                <div key={item.title}>
                                    {collapsed ? (
                                        <Tooltip delayDuration={0}>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => {
                                                        setCollapsed(false);
                                                        if (!isExpanded) toggleGroup(item.title);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-center h-10 rounded-lg transition-colors",
                                                        groupActive
                                                            ? "bg-blue-500/10 text-blue-400"
                                                            : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                                    )}
                                                >
                                                    <item.icon className="h-5 w-5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                                                {item.title}
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => toggleGroup(item.title)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                                                    groupActive
                                                        ? "text-blue-400"
                                                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                                )}
                                            >
                                                <item.icon className="h-5 w-5 shrink-0" />
                                                <span className="flex-1 text-left">{item.title}</span>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                )}
                                            </button>

                                            {isExpanded && (
                                                <div className="ml-4 mt-1 space-y-0.5 border-l border-white/[0.06] pl-3">
                                                    {item.children.map((child) => (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href!}
                                                            className={cn(
                                                                "flex items-center gap-3 px-3 h-9 rounded-lg text-sm transition-colors",
                                                                isActive(child.href!)
                                                                    ? "bg-blue-500/10 text-blue-400 font-medium"
                                                                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                                            )}
                                                        >
                                                            <child.icon className="h-4 w-4 shrink-0" />
                                                            <span>{child.title}</span>
                                                        </Link>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        }

                        // Single nav item (Dashboard)
                        return collapsed ? (
                            <Tooltip key={item.title} delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Link
                                        href={item.href!}
                                        className={cn(
                                            "flex items-center justify-center h-10 rounded-lg transition-colors",
                                            isActive(item.href!)
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                        )}
                                    >
                                        <item.icon className="h-5 w-5" />
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                                    {item.title}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <Link
                                key={item.title}
                                href={item.href!}
                                className={cn(
                                    "flex items-center gap-3 px-3 h-10 rounded-lg text-sm font-medium transition-colors",
                                    isActive(item.href!)
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                                )}
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User section */}
                <div className="border-t border-white/[0.06] p-3 shrink-0">
                    {collapsed ? (
                        <Tooltip delayDuration={0}>
                            <TooltipTrigger asChild>
                                <button
                                    onClick={() => signOut({ callbackUrl: "/login" })}
                                    className="w-full flex items-center justify-center h-10 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                                Logout
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 bg-gradient-to-br from-blue-500 to-indigo-600">
                                <AvatarFallback className="bg-transparent text-white text-xs font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {session?.user?.name || "User"}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {(session?.user as any)?.companyName || "Company"}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="text-slate-400 hover:text-red-400 transition-colors p-1"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Collapse toggle (desktop only) */}
                <div className="hidden lg:block border-t border-white/[0.06] p-2 shrink-0">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="w-full flex items-center justify-center h-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/[0.04] transition-colors"
                    >
                        {collapsed ? (
                            <ChevronRight className="h-4 w-4" />
                        ) : (
                            <ChevronDown className="h-4 w-4 rotate-90" />
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}
