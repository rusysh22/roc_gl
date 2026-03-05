"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Save, Plus, Trash2, ShieldCheck, Landmark, Receipt, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoA {
    id: string;
    code: string;
    name: string;
}

interface BankAccount {
    id: string;
    accountName: string;
    bankName: string;
    currencyCode: string;
    openingBalance: string | number;
}

interface VoucherLine {
    id: number;
    coaId: string;
    description: string;
    amount: number | "";
}

function NewVoucherContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get("type"); // "PV" or "RV"

    // Default to PV if none provided
    const voucherType = typeParam === "RV" ? "RV" : "PV";
    const isPayment = voucherType === "PV";

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [coas, setCoas] = useState<CoA[]>([]);

    const [header, setHeader] = useState({
        bankAccountId: "",
        date: new Date(),
        reference: "",
        description: "",
    });

    const [lines, setLines] = useState<VoucherLine[]>([
        { id: Date.now(), coaId: "", description: "", amount: "" }
    ]);

    const totalAmount = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const selectedBank = bankAccounts.find(b => b.id === header.bankAccountId);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active Bank Accounts
                const bankRes = await fetch("/api/bank-account");
                if (bankRes.ok) {
                    const banks = await bankRes.json();
                    setBankAccounts(banks.filter((b: any) => b.isActive));
                }

                // Fetch ALL CoAs for the offset lines (usually expenses, revenues, or liabilities)
                // Filter out headers
                const coaRes = await fetch("/api/master/coa");
                if (coaRes.ok) {
                    const data = await coaRes.json();
                    setCoas(data.filter((c: any) => !c.isHeader && c.isActive));
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load select data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const addLine = () => {
        setLines([...lines, { id: Date.now(), coaId: "", description: "", amount: "" }]);
    };

    const removeLine = (id: number) => {
        if (lines.length === 1) return;
        setLines(lines.filter(l => l.id !== id));
    };

    const updateLine = (id: number, field: keyof VoucherLine, value: any) => {
        setLines(lines.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const handleSave = async () => {
        if (!header.bankAccountId) {
            toast.error("Please select a Bank Account");
            return;
        }
        if (lines.some(l => !l.coaId || !l.amount || Number(l.amount) <= 0)) {
            toast.error("All lines must have an account and an amount > 0");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                type: voucherType,
                bankAccountId: header.bankAccountId,
                date: format(header.date, "yyyy-MM-dd"),
                reference: header.reference,
                description: header.description,
                lines: lines.map(l => ({
                    coaId: l.coaId,
                    description: l.description,
                    amount: Number(l.amount)
                }))
            };

            const res = await fetch("/api/voucher", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Voucher posted successfully as ${data.journal?.journalNumber}`);
                router.push("/vouchers");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to post voucher");
            }
        } catch {
            toast.error("System error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/vouchers")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            {isPayment ? (
                                <><span className="text-blue-400">Spend Money</span> (Payment Voucher)</>
                            ) : (
                                <><span className="text-emerald-400">Receive Money</span> (Receipt Voucher)</>
                            )}
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            {isPayment
                                ? "Record an outgoing payment. This will automatically credit the bank and debit the selected accounts."
                                : "Record an incoming payment. This will automatically debit the bank and credit the selected accounts."}
                        </p>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className={cn("text-white shadow-lg", isPayment ? "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20")}>
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Post Official Voucher
                </Button>
            </div>

            {/* Main Form Card */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-white/[0.08] bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Col */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Bank Account <span className="text-red-400">*</span></Label>
                                <Select value={header.bankAccountId} onValueChange={(v) => setHeader(p => ({ ...p, bankAccountId: v }))}>
                                    <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white py-6">
                                        <div className="flex items-center gap-3 w-full text-left">
                                            <Landmark className="h-5 w-5 text-slate-400 shrink-0" />
                                            {selectedBank ? (
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{selectedBank.accountName}</span>
                                                    <span className="text-xs text-slate-400">{selectedBank.bankName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Select Source Bank</span>
                                            )}
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        {bankAccounts.length === 0 ? (
                                            <div className="p-3 text-sm text-center text-slate-400">No active bank accounts</div>
                                        ) : (
                                            bankAccounts.map(b => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    <div className="flex flex-col text-left py-1">
                                                        <span className="font-medium text-slate-200">{b.accountName}</span>
                                                        <span className="text-xs text-slate-500">{b.bankName} &bull; {b.currencyCode}</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">Transaction Date <span className="text-red-400">*</span></Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04] h-11", !header.date && "text-slate-500")}>
                                            {header.date ? format(header.date, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                        <Calendar mode="single" selected={header.date} onSelect={(d) => d && setHeader(p => ({ ...p, date: d }))} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        {/* Right Col */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-slate-300">Reference Number</Label>
                                <Input
                                    placeholder="e.g., INV-2026-001, CHQ-1234"
                                    value={header.reference}
                                    onChange={(e) => setHeader(p => ({ ...p, reference: e.target.value }))}
                                    className="bg-[#0a0e1a] border-white/[0.1] text-white h-11"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-300">General Description</Label>
                                <Input
                                    placeholder={isPayment ? "Payment for office supplies..." : "Client payment for services..."}
                                    value={header.description}
                                    onChange={(e) => setHeader(p => ({ ...p, description: e.target.value }))}
                                    className="bg-[#0a0e1a] border-white/[0.1] text-white h-11"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Line Items */}
                <div className="p-6">
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <FileText className="h-4 w-4 text-slate-400" />
                        Cost Breakdown Lines
                    </h3>

                    <div className="space-y-3">
                        {lines.map((line, index) => (
                            <div key={line.id} className="flex flex-col sm:flex-row gap-3 items-start group">
                                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                    <div className="sm:col-span-5">
                                        <Select value={line.coaId} onValueChange={(v) => updateLine(line.id, "coaId", v)}>
                                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white h-11">
                                                <SelectValue placeholder="Select Account" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white max-h-[300px]">
                                                {coas.map(coa => (
                                                    <SelectItem key={coa.id} value={coa.id}>
                                                        <span className="font-mono text-xs text-slate-400 mr-2">{coa.code}</span>
                                                        <span className="font-medium text-slate-200">{coa.name}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="sm:col-span-4">
                                        <Input
                                            placeholder="Line description (optional)"
                                            value={line.description}
                                            onChange={(e) => updateLine(line.id, "description", e.target.value)}
                                            className="bg-[#0a0e1a] border-white/[0.1] text-white h-11"
                                        />
                                    </div>
                                    <div className="sm:col-span-3">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{selectedBank?.currencyCode || "IDR"}</span>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={line.amount}
                                                onChange={(e) => updateLine(line.id, "amount", e.target.value)}
                                                className="bg-[#0a0e1a] border-white/[0.1] text-white h-11 pl-12 text-right font-mono font-medium"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeLine(line.id)}
                                    disabled={lines.length === 1}
                                    className="h-11 w-11 shrink-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button variant="outline" onClick={addLine} className="mt-4 border-dashed border-white/[0.2] bg-transparent text-slate-300 hover:text-white hover:bg-white/5 w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" /> Add Line Item
                    </Button>

                    <div className="mt-8 flex justify-end pt-6 border-t border-white/[0.06]">
                        <div className="bg-black/30 rounded-xl p-5 border border-white/[0.05] min-w-[300px] flex items-center justify-between">
                            <span className="text-slate-400 font-medium">Total Amount</span>
                            <span className={cn("text-2xl font-bold font-mono tracking-tight", isPayment ? "text-blue-400" : "text-emerald-400")}>
                                {selectedBank?.currencyCode || "IDR"} {totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function NewVoucherPage() {
    return (
        <React.Suspense fallback={<div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>}>
            <NewVoucherContent />
        </React.Suspense>
    );
}
