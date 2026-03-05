"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ParsedRow {
    date: string;
    description: string;
    reference?: string;
    debit?: number;
    credit?: number;
}

export default function BankStatementImportPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const resolvedParams = use(params);
    const bankAccountId = resolvedParams.id;

    const [bankAccount, setBankAccount] = useState<any>(null);
    const [csvData, setCsvData] = useState("");
    const [headers, setHeaders] = useState<string[]>([]);
    const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
    const [importing, setImporting] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
        date: "",
        description: "",
        reference: "",
        debit: "",
        credit: "",
        amount: "",
        type: "",
    });

    useEffect(() => {
        fetch(`/api/bank-account/${bankAccountId}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => setBankAccount(data));
    }, [bankAccountId]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setCsvData(text);

            // Extract headers
            const firstLine = text.split("\n")[0];
            const cols = firstLine.split(",").map(h => h.trim().replace(/"/g, ""));
            setHeaders(cols);

            // Auto-map common column names
            const mapping: Record<string, string> = { date: "", description: "", reference: "", debit: "", credit: "", amount: "", type: "" };
            for (const col of cols) {
                const lower = col.toLowerCase();
                if (lower.includes("date") || lower.includes("tanggal")) mapping.date = col;
                else if (lower.includes("desc") || lower.includes("keterangan") || lower.includes("narrative")) mapping.description = col;
                else if (lower.includes("ref") || lower.includes("no_ref")) mapping.reference = col;
                else if (lower.includes("debit") || lower.includes("debet")) mapping.debit = col;
                else if (lower.includes("credit") || lower.includes("kredit")) mapping.credit = col;
                else if (lower.includes("amount") || lower.includes("jumlah") || lower.includes("nominal")) mapping.amount = col;
                else if (lower.includes("type") || lower.includes("tipe") || lower.includes("dc")) mapping.type = col;
            }
            setColumnMapping(mapping);
        };
        reader.readAsText(file);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && (file.name.endsWith(".csv") || file.name.endsWith(".txt"))) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                setCsvData(text);
                const firstLine = text.split("\n")[0];
                const cols = firstLine.split(",").map(h => h.trim().replace(/"/g, ""));
                setHeaders(cols);
            };
            reader.readAsText(file);
        }
    }, []);

    const handlePreview = async () => {
        if (!csvData || !columnMapping.date) {
            toast.error("Please upload a file and map the date column");
            return;
        }
        setPreviewing(true);
        try {
            const res = await fetch("/api/bank-statement/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bankAccountId, csvData, columnMapping, preview: true }),
            });
            if (res.ok) {
                const data = await res.json();
                setPreviewRows(data.rows);
                toast.success(`${data.count} rows parsed successfully`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed to preview");
            }
        } catch {
            toast.error("System error");
        } finally {
            setPreviewing(false);
        }
    };

    const handleImport = async () => {
        if (!csvData || !columnMapping.date) {
            toast.error("Please upload and preview first");
            return;
        }
        setImporting(true);
        try {
            const res = await fetch("/api/bank-statement/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bankAccountId, csvData, columnMapping, preview: false }),
            });
            if (res.ok) {
                const data = await res.json();
                setResult(data);
                toast.success(`Imported ${data.imported} transactions`);
            } else {
                const err = await res.json();
                toast.error(err.error || "Import failed");
            }
        } catch {
            toast.error("System error");
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push("/bank-accounts")} className="h-9 w-9 p-0 text-slate-400 hover:text-white">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Import Bank Statement</h2>
                    <p className="text-sm text-slate-400 mt-1">
                        {bankAccount ? `${bankAccount.accountName} - ${bankAccount.bankName}` : "Loading..."}
                    </p>
                </div>
            </div>

            {result ? (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Import Complete</h3>
                    <div className="space-y-1 text-slate-300">
                        <p>Imported: <strong className="text-emerald-400">{result.imported}</strong> transactions</p>
                        <p>Duplicates skipped: <strong className="text-amber-400">{result.duplicates}</strong></p>
                        <p>Total rows: {result.total}</p>
                        <p className="text-xs text-slate-500 mt-2">Batch ID: {result.importBatchId}</p>
                    </div>
                    <div className="flex items-center justify-center gap-3 mt-6">
                        <Button variant="outline" onClick={() => { setResult(null); setCsvData(""); setPreviewRows([]); }} className="border-white/[0.1] text-slate-300 hover:bg-white/5">
                            Import Another
                        </Button>
                        <Button onClick={() => router.push("/bank-accounts")} className="bg-blue-600 hover:bg-blue-500 text-white">
                            Back to Bank Accounts
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Upload Area */}
                    <div
                        className="bg-[#111827] border-2 border-dashed border-white/[0.1] rounded-xl p-12 text-center hover:border-blue-500/30 transition-colors cursor-pointer"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <Upload className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-300 font-medium mb-2">
                            {csvData ? "File loaded. Change file below." : "Drag & drop your CSV file here"}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">Supported formats: CSV (.csv)</p>
                        <Input
                            type="file"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            className="max-w-xs mx-auto bg-[#0a0e1a] border-white/[0.1] text-white file:text-slate-300 file:bg-white/5 file:border-0 file:mr-4 file:py-1 file:px-3 file:rounded"
                        />
                    </div>

                    {/* Column Mapping */}
                    {headers.length > 0 && (
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-white mb-4">Column Mapping</h3>
                            <p className="text-sm text-slate-400 mb-4">Map your CSV columns to the required fields.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { key: "date", label: "Date *", required: true },
                                    { key: "description", label: "Description" },
                                    { key: "reference", label: "Reference" },
                                    { key: "debit", label: "Debit Amount" },
                                    { key: "credit", label: "Credit Amount" },
                                    { key: "amount", label: "Amount (single col)" },
                                    { key: "type", label: "Type (D/C)" },
                                ].map(({ key, label }) => (
                                    <div key={key} className="space-y-1">
                                        <Label className="text-slate-400 text-xs">{label}</Label>
                                        <Select
                                            value={columnMapping[key] || "__none__"}
                                            onValueChange={(v) => setColumnMapping(prev => ({ ...prev, [key]: v === "__none__" ? "" : v }))}
                                        >
                                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.08] text-white h-9">
                                                <SelectValue placeholder="-- None --" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                                <SelectItem value="__none__">-- None --</SelectItem>
                                                {headers.map(h => (
                                                    <SelectItem key={h} value={h}>{h}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-3">
                                <Button onClick={handlePreview} disabled={previewing} className="bg-slate-700 hover:bg-slate-600 text-white">
                                    {previewing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                                    Preview
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Preview Table */}
                    {previewRows.length > 0 && (
                        <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Preview ({previewRows.length} rows)</h3>
                                    <p className="text-sm text-slate-400">Review the parsed data before importing.</p>
                                </div>
                                <Button onClick={handleImport} disabled={importing} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                                    {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                    Import {previewRows.length} Rows
                                </Button>
                            </div>
                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-[#0a0e1a] text-xs uppercase text-slate-400 font-semibold border-b border-white/[0.08] sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3">#</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Description</th>
                                            <th className="px-4 py-3">Reference</th>
                                            <th className="px-4 py-3 text-right">Debit</th>
                                            <th className="px-4 py-3 text-right">Credit</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                        {previewRows.slice(0, 50).map((row, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02]">
                                                <td className="px-4 py-2 text-slate-500">{i + 1}</td>
                                                <td className="px-4 py-2 text-slate-300 font-mono text-xs">{row.date}</td>
                                                <td className="px-4 py-2 text-slate-300 max-w-[200px] truncate">{row.description}</td>
                                                <td className="px-4 py-2 text-slate-400 font-mono text-xs">{row.reference || "-"}</td>
                                                <td className="px-4 py-2 text-right text-slate-300 font-mono">{row.debit ? row.debit.toLocaleString() : "-"}</td>
                                                <td className="px-4 py-2 text-right text-slate-300 font-mono">{row.credit ? row.credit.toLocaleString() : "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
