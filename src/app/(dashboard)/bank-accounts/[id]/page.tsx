"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Save, Trash2, Landmark, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxCoA } from "@/components/ui/combobox-coa";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CoA {
    id: string;
    code: string;
    name: string;
    accountType: string;
    isHeader: boolean;
    isActive: boolean;
}

export default function BankAccountFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const id = resolvedParams.id;
    const isNew = id === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [coas, setCoas] = useState<CoA[]>([]);

    // Delete dialog
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [formData, setFormData] = useState({
        accountName: "",
        bankName: "",
        accountNumber: "",
        accountHolder: "",
        currencyCode: "IDR",
        coaId: "",
        openingBalance: 0,
        openingDate: new Date(),
        isActive: true,
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch ASSET CoAs
                const coaRes = await fetch("/api/master/coa");
                if (coaRes.ok) {
                    const data = await coaRes.json();
                    setCoas(data.filter((c: CoA) => c.accountType === "ASSET" && !c.isHeader && c.isActive));
                }

                if (!isNew) {
                    const accRes = await fetch(`/api/bank-account/${id}`);
                    if (accRes.ok) {
                        const acc = await accRes.json();
                        setFormData({
                            accountName: acc.accountName,
                            bankName: acc.bankName,
                            accountNumber: acc.accountNumber,
                            accountHolder: acc.accountHolder,
                            currencyCode: acc.currencyCode,
                            coaId: acc.coaId,
                            openingBalance: Number(acc.openingBalance),
                            openingDate: new Date(acc.openingDate),
                            isActive: acc.isActive
                        });
                    } else if (accRes.status === 404) {
                        toast.error("Bank account not found");
                        router.push("/bank-accounts");
                    }
                }
            } catch (error) {
                console.error(error);
                toast.error("Failed to load data");
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id, isNew, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) || 0 : value
        }));
    };

    const handleSave = async () => {
        if (!formData.accountName || !formData.bankName || !formData.accountNumber || !formData.coaId) {
            toast.error("Please fill all required fields");
            return;
        }

        setSaving(true);
        try {
            const url = isNew ? "/api/bank-account" : `/api/bank-account/${id}`;
            const method = isNew ? "POST" : "PUT";

            const payload = {
                ...formData,
                openingDate: format(formData.openingDate, "yyyy-MM-dd")
            };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast.success(`Bank account ${isNew ? 'created' : 'updated'} successfully`);
                router.push("/bank-accounts");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save bank account");
            }
        } catch {
            toast.error("System error occurred");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/bank-account/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Bank account deleted successfully");
                router.push("/bank-accounts");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to delete bank account");
            }
        } catch {
            toast.error("System error occurred");
        } finally {
            setSaving(false);
            setDeleteDialogOpen(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/bank-accounts")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {isNew ? "New Bank Account" : "Edit Bank Account"}
                            </h2>
                            {!isNew && (
                                <Badge className={cn("text-xs font-medium px-2.5 py-0.5", formData.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-500/20")}>
                                    {formData.isActive ? "ACTIVE" : "INACTIVE"}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                            {isNew ? "Create a new bank account linked to your Chart of Accounts." : "Manage bank details and GL tracking."}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isNew && (
                        <Button variant="outline" className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300" onClick={() => setDeleteDialogOpen(true)} disabled={saving}>
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20">
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Account
                    </Button>
                </div>
            </div>

            {/* Form */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl shadow-sm p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-32 opacity-[0.02] pointer-events-none">
                    <Landmark className="w-64 h-64 text-white" />
                </div>

                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3 border border-blue-500/20">
                        <Landmark className="h-4 w-4 text-blue-400" />
                    </div>
                    Bank Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Account Internal Name <span className="text-red-400">*</span></Label>
                        <Input
                            name="accountName"
                            placeholder="e.g., BCA Operasional"
                            value={formData.accountName}
                            onChange={handleChange}
                            className="bg-[#0a0e1a] border-white/[0.1] text-white focus-visible:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500">Name used internally across the app</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Bank Name <span className="text-red-400">*</span></Label>
                        <Input
                            name="bankName"
                            placeholder="e.g., Bank Central Asia"
                            value={formData.bankName}
                            onChange={handleChange}
                            className="bg-[#0a0e1a] border-white/[0.1] text-white focus-visible:ring-blue-500"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Account Number <span className="text-red-400">*</span></Label>
                        <Input
                            name="accountNumber"
                            placeholder="e.g., 1234567890"
                            value={formData.accountNumber}
                            onChange={handleChange}
                            className="bg-[#0a0e1a] border-white/[0.1] text-white focus-visible:ring-blue-500 font-mono"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Account Holder Name</Label>
                        <Input
                            name="accountHolder"
                            placeholder="e.g., PT Perusahaan Terbuka"
                            value={formData.accountHolder}
                            onChange={handleChange}
                            className="bg-[#0a0e1a] border-white/[0.1] text-white focus-visible:ring-blue-500"
                        />
                        <p className="text-xs text-slate-500">Legal name registered at the bank</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Currency <span className="text-red-400">*</span></Label>
                        <Select value={formData.currencyCode} onValueChange={(v) => setFormData(p => ({ ...p, currencyCode: v }))}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white">
                                <SelectValue placeholder="Select Currency" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
                                <SelectItem value="USD">USD - US Dollar</SelectItem>
                                <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="w-full h-px bg-white/[0.06] my-8"></div>

                <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3 border border-emerald-500/20">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    </div>
                    Accounting Integration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 relative z-10">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Linked GL Account (Asset) <span className="text-red-400">*</span></Label>
                        <ComboboxCoA
                            value={formData.coaId}
                            onValueChange={(v) => setFormData(p => ({ ...p, coaId: v }))}
                            accounts={coas}
                            placeholder="Select an Asset Account"
                        />
                        <p className="text-xs text-slate-500">Only detail ASSET accounts are available to link.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Opening Balance Date <span className="text-red-400">*</span></Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !formData.openingDate && "text-slate-500")}>
                                    {formData.openingDate ? format(formData.openingDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={formData.openingDate} onSelect={(d) => d && setFormData(p => ({ ...p, openingDate: d }))} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-slate-300">Opening Balance</Label>
                        <div className="relative relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">{formData.currencyCode}</span>
                            <Input
                                type="number"
                                name="openingBalance"
                                value={formData.openingBalance || ""}
                                onChange={handleChange}
                                className="bg-[#0a0e1a] border-white/[0.1] text-white focus-visible:ring-blue-500 pl-12 font-mono"
                                disabled={!isNew} // Usually opening balance shouldn't easily change after setup
                            />
                        </div>
                        <p className="text-xs text-slate-500">
                            {isNew ? "Set the initial ledger balance upon creation." : "Opening balances cannot be changed after creation for audit integrity."}
                        </p>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="isActive"
                            checked={formData.isActive}
                            onCheckedChange={(checked) => setFormData(p => ({ ...p, isActive: !!checked }))}
                            className="border-white/[0.2] data-[state=checked]:bg-blue-600"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label htmlFor="isActive" className="text-sm font-medium leading-none text-slate-200 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                Active Bank Account
                            </label>
                            <p className="text-sm text-slate-500">
                                Uncheck this if the account is closed and no longer allows transactions.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">Delete Bank Account?</DialogTitle>
                        <DialogDescription className="text-slate-400 mt-2">
                            This will permanently remove the bank account <strong>{formData.accountName}</strong>.
                            Note: If there are existing bank transactions linked to this account, the system will block the deletion to maintain data integrity.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-end gap-2">
                        <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-slate-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} className="bg-red-600 hover:bg-red-500 text-white">
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Confirm Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
