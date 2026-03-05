"use client";

import { SidebarNav } from "@/components/sidebar-nav";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

const breadcrumbMap: Record<string, string> = {
    "": "Dashboard",
    master: "Master Data",
    company: "Company",
    branch: "Branch",
    "fiscal-year": "Fiscal Year",
    period: "Period",
    department: "Department",
    "cost-center": "Cost Center",
    currency: "Currency",
    "exchange-rate": "Exchange Rate",
    users: "Users",
    roles: "Roles",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { data: session } = useSession();
    const pathname = usePathname();

    const segments = pathname.split("/").filter(Boolean);
    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = breadcrumbMap[segment] || segment;
        return { href, label };
    });

    return (
        <div className="min-h-screen bg-[#0a0e1a]">
            <SidebarNav />

            {/* Main content */}
            <main className="lg:ml-[260px] min-h-screen transition-all duration-300">
                {/* Top bar */}
                <header className="h-16 border-b border-white/[0.06] bg-[#0f1420]/80 backdrop-blur-xl flex items-center px-6 sticky top-0 z-30">
                    <div className="flex items-center gap-2 text-sm">
                        <Link
                            href="/"
                            className="text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            <Home className="h-4 w-4" />
                        </Link>
                        {breadcrumbs.map((crumb, index) => (
                            <div key={crumb.href} className="flex items-center gap-2">
                                <ChevronRight className="h-3 w-3 text-slate-600" />
                                {index === breadcrumbs.length - 1 ? (
                                    <span className="text-slate-200 font-medium">
                                        {crumb.label}
                                    </span>
                                ) : (
                                    <Link
                                        href={crumb.href}
                                        className="text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </header>

                {/* Page content */}
                <div className="p-6">{children}</div>
            </main>
        </div>
    );
}
