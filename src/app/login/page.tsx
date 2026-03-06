"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Loader2, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const loginSchema = z.object({
    email: z.email("Email tidak valid"),
    password: z.string().min(1, "Password wajib diisi"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        try {
            const result = await signIn("credentials", {
                email: data.email,
                password: data.password,
                redirect: false,
            });

            if (result?.error) {
                toast.error("Login gagal", {
                    description: "Email atau password tidak valid.",
                });
            } else {
                toast.success("Login berhasil!");
                router.push("/");
                router.refresh();
            }
        } catch {
            toast.error("Terjadi kesalahan", {
                description: "Silakan coba lagi.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0e1a] relative overflow-hidden">
            {/* Background gradient orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px]" />
            <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-cyan-500/5 rounded-full blur-[80px]" />

            {/* Grid pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            <div className="relative z-10 w-full max-w-md px-6">
                {/* Logo & Brand */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-5 shadow-lg shadow-blue-500/25">
                        <BookOpen className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        gl<span className="text-blue-400">_</span>roc
                    </h1>
                    <p className="text-sm text-slate-400 mt-2">
                        General Ledger · Rusydani on Cloud
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 shadow-2xl">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-white">Masuk ke akun Anda</h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Masukkan email dan password untuk melanjutkan
                        </p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm text-slate-300">
                                Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="nama@perusahaan.com"
                                className="bg-[#0d1117] border-white/[0.08] text-white placeholder:text-slate-500 h-11 rounded-xl focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                                {...register("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm text-slate-300">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="bg-[#0d1117] border-white/[0.08] text-white placeholder:text-slate-500 h-11 rounded-xl pr-10 focus:border-blue-500 focus:ring-blue-500/20 transition-all"
                                    {...register("password")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="text-xs text-red-400 mt-1">
                                    {errors.password.message}
                                </p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-600/25 transition-all duration-200 hover:shadow-blue-500/30 hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {isLoading ? "Memproses..." : "Masuk"}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-slate-500 mt-8">
                    © 2025 RoC GL · General Ledger Rusydani on Cloud
                </p>
            </div>
        </div>
    );
}
