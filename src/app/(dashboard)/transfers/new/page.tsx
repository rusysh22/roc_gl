"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Save, ShieldCheck, Landmark, ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BankAccount {
    id: string;
    accountName: string;
    bankName: string;
    currencyCode: string;
    openingBalance: string | number;
}

export default function NewTransferPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

    const [formData, setFormData] = useState({
        sourceBankId: "",
        targetBankId: "",
        date: new Date(),
        reference: "",
        description: "",
        amount: "",
    });

    const sourceBank = bankAccounts.find(b => b.id === formData.sourceBankId);
    const targetBank = bankAccounts.find(b => b.id === formData.targetBankId);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const bankRes = await fetch("/api/bank-account");
                if (bankRes.ok) {
                    const banks = await bankRes.json();
                    setBankAccounts(banks.filter((b: any) => b.isActive));
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load bank data");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!formData.sourceBankId || !formData.targetBankId || !formData.amount) {
            toast.error("Please fill all required fields");
            return;
        }

        if (formData.sourceBankId === formData.targetBankId) {
            toast.error("Source and destination accounts must be different");
            return;
        }

        if (Number(formData.amount) <= 0) {
            toast.error("Amount must be greater than zero");
            return;
        }

        if (sourceBank?.currencyCode !== targetBank?.currencyCode) {
            toast.error("Cross-currency transfers are not yet supported directly via this wizard.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                sourceBankId: formData.sourceBankId,
                targetBankId: formData.targetBankId,
                date: format(formData.date, "yyyy-MM-dd"),
                amount: Number(formData.amount),
                reference: formData.reference,
                description: formData.description
            };

            const res = await fetch("/api/transfer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Transfer posted successfully as ${data.journalNumber}`);
                router.push("/bank-accounts");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to post transfer");
            }
        } catch {
            toast.error("System error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header Area */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/bank-accounts")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            Transfer Money
                        </h2>
                        <p className="text-sm text-slate-400 mt-1">
                            Move funds between two company bank or cash accounts securely.
                        </p>
                    </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Execute Transfer
                </Button>
            </div>

            {/* Main Form Card */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl shadow-sm overflow-hidden relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-32 opacity-[0.02] pointer-events-none">
                    <ArrowRightLeft className="w-64 h-64 text-white" />
                </div>

                <div className="p-6 md:p-10 relative z-10 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                    {/* Source */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-300 font-medium">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400">1</div>
                            Source Account <span className="text-red-400 text-sm">*</span>
                        </div>
                        <div className="space-y-4 bg-black/20 p-5 rounded-xl border border-white/[0.05]">
                            <Select value={formData.sourceBankId} onValueChange={(v) => setFormData(p => ({ ...p, sourceBankId: v }))}>
                                <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white py-6">
                                    <div className="flex items-center gap-3 w-full text-left">
                                        <Landmark className="h-5 w-5 text-blue-400 shrink-0" />
                                        {sourceBank ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{sourceBank.accountName}</span>
                                                <span className="text-xs text-slate-400">{sourceBank.currencyCode}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Transfer From...</span>
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    {bankAccounts.map(b => (
                                        <SelectItem key={b.id} value={b.id} disabled={b.id === formData.targetBankId}>
                                            <div className="flex flex-col text-left py-1">
                                                <span className="font-medium text-slate-200">{b.accountName}</span>
                                                <span className="text-xs text-slate-500">{b.bankName} &bull; {b.currencyCode}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="space-y-2">
                                <Label className="text-slate-400 text-xs uppercase tracking-wider">Amount to Transfer</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                        {sourceBank?.currencyCode || "CUR"}
                                    </span>
                                    <Input
                                        type="number"
                                        name="amount"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className="bg-[#0a0e1a] border-white/[0.1] text-white h-12 pl-12 text-lg font-mono font-medium focus-visible:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Target */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 text-slate-300 font-medium">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">2</div>
                            Destination Account <span className="text-red-400 text-sm">*</span>
                        </div>
                        <div className="space-y-4 bg-black/20 p-5 rounded-xl border border-white/[0.05] h-full">
                            <Select value={formData.targetBankId} onValueChange={(v) => setFormData(p => ({ ...p, targetBankId: v }))}>
                                <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white py-6">
                                    <div className="flex items-center gap-3 w-full text-left">
                                        <Landmark className="h-5 w-5 text-emerald-400 shrink-0" />
                                        {targetBank ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium">{targetBank.accountName}</span>
                                                <span className="text-xs text-slate-400">{targetBank.currencyCode}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Transfer To...</span>
                                        )}
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                    {bankAccounts.map(b => (
                                        <SelectItem key={b.id} value={b.id} disabled={b.id === formData.sourceBankId || (sourceBank && sourceBank.currencyCode !== b.currencyCode)}>
                                            <div className="flex flex-col text-left py-1">
                                                <span className="font-medium text-slate-200">{b.accountName}</span>
                                                <span className="text-xs text-slate-500">{b.bankName} &bull; {b.currencyCode}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {sourceBank && targetBank && sourceBank.currencyCode === targetBank.currencyCode && Number(formData.amount) > 0 && (
                                <div className="mt-6 flex flex-col items-center justify-center pt-4 text-emerald-400 animation-in fade-in slide-in-from-bottom-2">
                                    <span className="text-xs uppercase tracking-widest opacity-80 mb-1">Incoming Value</span>
                                    <span className="text-2xl font-mono font-bold">+{Number(formData.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="md:col-span-2 w-full h-px bg-white/[0.06] my-2"></div>

                    {/* Meta */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-300">Transfer Date <span className="text-red-400">*</span></Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !formData.date && "text-slate-500")}>
                                        {formData.date ? format(formData.date, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                    <Calendar mode="single" selected={formData.date} onSelect={(d) => d && setFormData(p => ({ ...p, date: d }))} initialFocus />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Reference Number</Label>
                            <Input
                                name="reference"
                                placeholder="e.g., TRF-1029"
                                value={formData.reference}
                                onChange={handleChange}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">Description</Label>
                            <Input
                                name="description"
                                placeholder="Moving operational funds..."
                                value={formData.description}
                                onChange={handleChange}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white"
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
