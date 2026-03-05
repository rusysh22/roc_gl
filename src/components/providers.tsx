"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TooltipProvider delayDuration={0}>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: "#1e293b",
                            border: "1px solid rgba(255,255,255,0.06)",
                            color: "#f1f5f9",
                        },
                    }}
                />
            </TooltipProvider>
        </SessionProvider>
    );
}
