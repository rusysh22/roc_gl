"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
    ArrowLeft, Save, Send, ShieldCheck, Undo2, Plus, Trash2,
    Search, Calculator, FileText, CheckCircle2, AlertTriangle, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface CoA {
    id: string;
    code: string;
    name: string;
    accountType: string;
}

interface JournalLine {
    id?: string;
    lineNumber: number;
    coaId: string;
    coa?: CoA;
    description: string;
    debitAmount: number;
    creditAmount: number;
    departmentId?: string;
    costCenterId?: string;
}

const statusColors: Record<string, string> = {
    DRAFT: "bg-slate-500/10 text-slate-400",
    SUBMITTED: "bg-amber-500/10 text-amber-400",
    APPROVED: "bg-blue-500/10 text-blue-400",
    POSTED: "bg-emerald-500/10 text-emerald-400",
    REVERSED: "bg-red-500/10 text-red-400",
};

export default function JournalFormPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const isNew = id === "new";

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    // Header state
    const [journalNumber, setJournalNumber] = useState("");
    const [journalType, setJournalType] = useState("GJ");
    const [status, setStatus] = useState("DRAFT");
    const [journalDate, setJournalDate] = useState<Date>(new Date());
    const [postingDate, setPostingDate] = useState<Date>(new Date());
    const [referenceNumber, setReferenceNumber] = useState("");
    const [description, setDescription] = useState("");
    const [currencyCode, setCurrencyCode] = useState("IDR");
    const [exchangeRate, setExchangeRate] = useState(1);
    const [periodName, setPeriodName] = useState("");
    const [creatorName, setCreatorName] = useState("");
    const [reversalOfId, setReversalOfId] = useState<string | null>(null);

    // Dialog State
    const [postDialogOpen, setPostDialogOpen] = useState(false);
    const [reverseDialogOpen, setReverseDialogOpen] = useState(false);
    const [reverseDateInput, setReverseDateInput] = useState<Date>(new Date());

    // Lines state
    const [lines, setLines] = useState<JournalLine[]>([
        { lineNumber: 1, coaId: "", description: "", debitAmount: 0, creditAmount: 0 },
        { lineNumber: 2, coaId: "", description: "", debitAmount: 0, creditAmount: 0 },
    ]);

    // Autocomplete state
    const [searchResults, setSearchResults] = useState<CoA[]>([]);
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debitAmount) || 0), 0);
    const totalCredit = lines.reduce((sum, l) => sum + (Number(l.creditAmount) || 0), 0);
    const isBalanced = totalDebit > 0 && totalDebit === totalCredit;
    const isReadonly = status !== "DRAFT" && status !== "REJECTED";

    useEffect(() => {
        if (!isNew) {
            fetchJournal();
        }
    }, [id]);

    const fetchJournal = async () => {
        try {
            const res = await fetch(`/api/journal/${id}`);
            if (res.ok) {
                const data = await res.json();
                setJournalNumber(data.journalNumber);
                setJournalType(data.journalType);
                setStatus(data.status);
                setJournalDate(new Date(data.journalDate));
                setPostingDate(new Date(data.postingDate));
                setReferenceNumber(data.referenceNumber || "");
                setDescription(data.description || "");
                setCurrencyCode(data.currencyCode);
                setExchangeRate(data.exchangeRate);
                setPeriodName(data.period?.name || "-");
                setCreatorName(data.creator?.name || "");
                setReversalOfId(data.reversalOfId);

                if (data.lines && data.lines.length > 0) {
                    setLines(data.lines.map((l: any) => ({
                        ...l,
                        debitAmount: Number(l.debitAmount),
                        creditAmount: Number(l.creditAmount),
                    })));
                }
            } else {
                toast.error("Failed to load journal");
                router.push("/journal");
            }
        } catch {
            toast.error("Error loading journal");
        } finally {
            setLoading(false);
        }
    };

    // Autocomplete search
    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/master/coa/search?q=${encodeURIComponent(searchQuery)}`);
                if (res.ok) {
                    setSearchResults(await res.json());
                }
            } catch (err) {
                console.error(err);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const addLine = () => {
        if (isReadonly) return;
        setLines([...lines, {
            lineNumber: lines.length + 1,
            coaId: "",
            description: "",
            debitAmount: 0,
            creditAmount: 0
        }]);
    };

    const removeLine = (index: number) => {
        if (isReadonly || lines.length <= 2) return;
        const newLines = [...lines];
        newLines.splice(index, 1);
        // reindex
        newLines.forEach((l, i) => l.lineNumber = i + 1);
        setLines(newLines);
    };

    const updateLine = (index: number, field: keyof JournalLine, value: any) => {
        if (isReadonly) return;
        const newLines = [...lines];
        newLines[index] = { ...newLines[index], [field]: value };

        // Auto-clear opposite amount if entering new amount
        if (field === "debitAmount" && Number(value) > 0) newLines[index].creditAmount = 0;
        if (field === "creditAmount" && Number(value) > 0) newLines[index].debitAmount = 0;

        setLines(newLines);
    };

    const selectCoA = (index: number, coa: CoA) => {
        if (isReadonly) return;
        const newLines = [...lines];
        newLines[index].coaId = coa.id;
        newLines[index].coa = coa;
        setLines(newLines);
        setActiveRowIndex(null);
        setSearchQuery("");
    };

    const saveDraft = async () => {
        if (isReadonly) return;
        // Validate basics
        if (!journalDate || !postingDate || lines.length < 2) {
            toast.error("Please fill in required fields and at least 2 lines");
            return;
        }

        const payload = {
            journalType, journalDate, postingDate, referenceNumber, description,
            currencyCode, exchangeRate, lines
        };

        setSaving(true);
        try {
            const url = isNew ? "/api/journal" : `/api/journal/${id}`;
            const method = isNew ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Journal ${isNew ? 'created' : 'updated'} successfully`);
                if (isNew) {
                    router.push(`/journal/${data.id}`);
                } else {
                    fetchJournal(); // refresh
                }
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to save journal");
            }
        } catch {
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    const handlePostClick = () => {
        if (!isBalanced) {
            toast.error("Cannot post unbalanced journal");
            return;
        }
        const missingCoA = lines.some(l => !l.coaId);
        if (missingCoA) {
            toast.error("Please select Account for all lines");
            return;
        }
        if (isNew) {
            toast.error("Please save as draft first");
            return;
        }
        setPostDialogOpen(true);
    };

    const executePostJournal = async () => {
        setPostDialogOpen(false);
        setSaving(true);
        try {
            const res = await fetch(`/api/journal/${id}/post`, { method: "POST" });
            if (res.ok) {
                toast.success("Journal POSTED successfully!");
                fetchJournal();
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to post journal");
            }
        } catch {
            toast.error("Error posting journal");
        } finally {
            setSaving(false);
        }
    };

    const handleReverseClick = () => {
        setReverseDateInput(new Date());
        setReverseDialogOpen(true);
    };

    const executeReverseJournal = async () => {
        setReverseDialogOpen(false);
        setSaving(true);
        try {
            const revDateStr = format(reverseDateInput, "yyyy-MM-dd");
            const res = await fetch(`/api/journal/${id}/reverse`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reversalDate: revDateStr })
            });
            if (res.ok) {
                const rev = await res.json();
                toast.success("Journal reversed successfully!");
                router.push(`/journal/${rev.id}`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to reverse journal");
            }
        } catch {
            toast.error("Error reversing journal");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" /></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* Header Bar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => router.push("/journal")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white">
                                {isNew ? "New Journal Entry" : journalNumber}
                            </h2>
                            {!isNew && (
                                <Badge className={cn("text-xs font-medium px-2.5 py-0.5", statusColors[status])}>
                                    {status}
                                </Badge>
                            )}
                        </div>
                        {!isNew && (
                            <p className="text-sm text-slate-400 mt-1">
                                Period: {periodName} | Creator: {creatorName} {reversalOfId ? "| Reversal" : ""}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex gap-2">
                    {!isReadonly && (
                        <Button onClick={saveDraft} disabled={saving} className="bg-slate-800 hover:bg-slate-700 text-white">
                            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                    )}

                    {(status === "DRAFT" || status === "APPROVED") && !isNew && (
                        <Button onClick={handlePostClick} disabled={saving || !isBalanced} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                            <ShieldCheck className="h-4 w-4 mr-2" /> Post Journal
                        </Button>
                    )}

                    {status === "POSTED" && (
                        <Button onClick={handleReverseClick} disabled={saving} className="bg-amber-600 hover:bg-amber-500 text-white">
                            <Undo2 className="h-4 w-4 mr-2" /> Reverse
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Form Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Col: Header Fields */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl p-5 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-200 border-b border-white/[0.06] pb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-400" /> Header Information
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-slate-400">Journal Type</label>
                                <Select disabled={isReadonly} value={journalType} onValueChange={setJournalType}>
                                    <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                        <SelectItem value="GJ">General Journal</SelectItem>
                                        <SelectItem value="AJ">Adjusting Journal</SelectItem>
                                        <SelectItem value="IC">Intercompany Journal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-400">Journal Date</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button disabled={isReadonly} variant="outline" className="w-full justify-start text-left mt-1 bg-[#0d1117] border-white/[0.08] text-white hover:bg-white/[0.04] px-3">
                                                {format(journalDate, "dd MMM yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#1e293b] outline-none border-white/[0.08] text-white">
                                            <Calendar mode="single" selected={journalDate} onSelect={(d) => d && setJournalDate(d)} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400">Posting Date</label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button disabled={isReadonly} variant="outline" className="w-full justify-start text-left mt-1 bg-[#0d1117] border-white/[0.08] text-white hover:bg-white/[0.04] px-3">
                                                {format(postingDate, "dd MMM yyyy")}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 bg-[#1e293b] outline-none border-white/[0.08] text-white">
                                            <Calendar mode="single" selected={postingDate} onSelect={(d) => d && setPostingDate(d)} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400">Reference Number</label>
                                <Input disabled={isReadonly} value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className="bg-[#0d1117] border-white/[0.08] text-white mt-1" />
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-400">Description / Memo</label>
                                <Textarea disabled={isReadonly} value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[#0d1117] border-white/[0.08] text-white mt-1 min-h-[80px]" />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-400">Currency</label>
                                    <Select disabled={isReadonly} value={currencyCode} onValueChange={setCurrencyCode}>
                                        <SelectTrigger className="bg-[#0d1117] border-white/[0.08] text-white mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                            <SelectItem value="IDR">IDR</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="SGD">SGD</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-400">Exchange Rate</label>
                                    <Input disabled={isReadonly || currencyCode === "IDR"} type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} className="bg-[#0d1117] border-white/[0.08] text-white mt-1" />
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Right Col: Lines Table */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-[#111827]/80 border border-white/[0.06] rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
                            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                                <Calculator className="h-4 w-4 text-emerald-400" /> Journal Lines
                            </h3>
                            {!isReadonly && (
                                <Button onClick={addLine} variant="outline" size="sm" className="h-8 bg-white/[0.04] border-white/[0.08] text-white hover:bg-white/[0.08]">
                                    <Plus className="h-3 w-3 mr-1" /> Add Line
                                </Button>
                            )}
                        </div>

                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-black/20 text-slate-400 border-b border-white/[0.06]">
                                        <th className="px-3 py-2 text-center w-10">#</th>
                                        <th className="px-3 py-2 text-left w-[250px]">Account</th>
                                        <th className="px-3 py-2 text-left min-w-[200px]">Description</th>
                                        <th className="px-3 py-2 text-right w-[150px]">Debit</th>
                                        <th className="px-3 py-2 text-right w-[150px]">Credit</th>
                                        <th className="px-3 py-2 text-center w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {lines.map((line, index) => (
                                        <tr key={index} className="hover:bg-white/[0.02] group">
                                            <td className="px-3 py-2 text-center text-slate-500">{line.lineNumber}</td>
                                            <td className="px-3 py-2 relative">
                                                {isReadonly ? (
                                                    <div className="text-slate-300">
                                                        {line.coa?.code} - {line.coa?.name}
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <Input
                                                            placeholder="Search CoA..."
                                                            value={activeRowIndex === index ? searchQuery : (line.coa ? `${line.coa.code} - ${line.coa.name}` : "")}
                                                            onChange={(e) => {
                                                                setActiveRowIndex(index);
                                                                setSearchQuery(e.target.value);
                                                            }}
                                                            onFocus={() => {
                                                                setActiveRowIndex(index);
                                                                setSearchQuery(line.coa ? line.coa.code : "");
                                                            }}
                                                            className="h-8 text-xs bg-[#0d1117] border-white/[0.08] text-white w-full"
                                                        />
                                                        {activeRowIndex === index && searchResults.length > 0 && (
                                                            <div className="absolute top-10 left-0 w-[400px] max-h-[300px] overflow-y-auto bg-[#1e293b] border border-white/[0.1] rounded-md shadow-xl z-50 p-1">
                                                                {searchResults.map(coa => (
                                                                    <div
                                                                        key={coa.id}
                                                                        onClick={() => selectCoA(index, coa)}
                                                                        className="px-3 py-2 text-xs hover:bg-white/[0.05] cursor-pointer text-slate-200 border-b border-white/[0.05] last:border-0"
                                                                    >
                                                                        <div className="font-medium text-blue-400">{coa.code}</div>
                                                                        <div className="flex justify-between mt-1">
                                                                            <span>{coa.name}</span>
                                                                            <span className="text-[10px] text-slate-500 uppercase">{coa.accountType}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isReadonly ? (
                                                    <div className="text-slate-300">{line.description || "-"}</div>
                                                ) : (
                                                    <Input
                                                        value={line.description}
                                                        onChange={(e) => updateLine(index, "description", e.target.value)}
                                                        className="h-8 text-xs bg-[#0d1117] border-white/[0.08] text-white w-full"
                                                        placeholder="Line memo..."
                                                    />
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isReadonly ? (
                                                    <div className="text-slate-300 text-right font-medium">{Number(line.debitAmount).toLocaleString("en-US")}</div>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.debitAmount || ""}
                                                        onChange={(e) => updateLine(index, "debitAmount", e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="h-8 text-xs bg-[#0d1117] border-white/[0.08] text-white text-right font-medium w-full"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {isReadonly ? (
                                                    <div className="text-slate-300 text-right font-medium">{Number(line.creditAmount).toLocaleString("en-US")}</div>
                                                ) : (
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={line.creditAmount || ""}
                                                        onChange={(e) => updateLine(index, "creditAmount", e.target.value)}
                                                        onFocus={(e) => e.target.select()}
                                                        className="h-8 text-xs bg-[#0d1117] border-white/[0.08] text-white text-right font-medium w-full"
                                                    />
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {!isReadonly && lines.length > 2 && (
                                                    <Button onClick={() => removeLine(index)} variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Balances */}
                        <div className="bg-black/30 p-4 border-t border-white/[0.06] mt-auto">
                            <div className="flex justify-end gap-12 text-sm">
                                <div className="text-right">
                                    <div className="text-slate-400 mb-1">Total Debit</div>
                                    <div className={cn("text-lg font-bold font-mono tracking-tight", totalDebit > 0 ? "text-slate-200" : "text-slate-600")}>
                                        {totalDebit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-slate-400 mb-1">Total Credit</div>
                                    <div className={cn("text-lg font-bold font-mono tracking-tight", totalCredit > 0 ? "text-slate-200" : "text-slate-600")}>
                                        {totalCredit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                                <div className="w-40 text-right pl-6 border-l border-white/[0.1]">
                                    <div className="text-slate-400 mb-1">Balance</div>
                                    <div className="flex items-center justify-end gap-2">
                                        {totalDebit === 0 && totalCredit === 0 ? (
                                            <span className="text-lg font-bold font-mono text-slate-600">0.00</span>
                                        ) : isBalanced ? (
                                            <>
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                <span className="text-lg font-bold font-mono text-emerald-500">BALANCED</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                                <span className="text-lg font-bold font-mono text-red-500">
                                                    {Math.abs(totalDebit - totalCredit).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>

            {/* Post Confirmation Dialog */}
            <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Post Journal Entry?</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Are you sure you want to <strong>POST</strong> this journal?
                            This action cannot be undone. Once posted, the journal balances will be official and cannot be freely edited.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-4 flex sm:justify-end">
                        <Button variant="ghost" onClick={() => setPostDialogOpen(false)} className="text-slate-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={executePostJournal} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Yes, Post Journal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reverse Journal Dialog */}
            <Dialog open={reverseDialogOpen} onOpenChange={setReverseDialogOpen}>
                <DialogContent className="bg-[#111827] border-white/[0.1] text-white">
                    <DialogHeader>
                        <DialogTitle>Reverse Journal Entry</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Select the date for the reversal journal. A new Draft Journal will be created with swapped Debit/Credit amounts.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <label className="text-xs font-medium text-slate-400 mb-2 block">Reversal Date</label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start text-left bg-[#0d1117] border-white/[0.08] text-white hover:bg-white/[0.04] px-3">
                                    {format(reverseDateInput, "dd MMM yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] outline-none border-white/[0.08] text-white">
                                <Calendar mode="single" selected={reverseDateInput} onSelect={(d) => d && setReverseDateInput(d)} />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <DialogFooter className="mt-4 flex sm:justify-end">
                        <Button variant="ghost" onClick={() => setReverseDialogOpen(false)} className="text-slate-300 hover:text-white hover:bg-white/10">
                            Cancel
                        </Button>
                        <Button onClick={executeReverseJournal} className="bg-amber-600 hover:bg-amber-500 text-white">
                            <Undo2 className="h-4 w-4 mr-2" />
                            Create Reversal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
