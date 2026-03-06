"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Loader2, BookOpen, Search, Download } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { ComboboxCoA } from "@/components/ui/combobox-coa";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GeneralLedgerPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [selectedCoa, setSelectedCoa] = useState("");
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        const load = async () => {
            const res = await fetch("/api/master/coa/search?q=&limit=500");
            if (res.ok) {
                const d = await res.json();
                setAccounts(Array.isArray(d) ? d : d.results || []);
            }
        };
        load();
    }, []);

    const handleGenerate = async () => {
        if (!selectedCoa) { toast.error("Select an account"); return; }
        setLoading(true);
        try {
            const params = new URLSearchParams({ coaId: selectedCoa });
            if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
            if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
            const res = await fetch(`/api/reports/general-ledger?${params}`);
            if (res.ok) setData(await res.json());
            else toast.error("Failed to generate report");
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const handleExportExcel = () => {
        if (!data || !data.transactions) return;

        const exportData = [
            {
                Date: "",
                Journal: "Opening Balance",
                Description: "",
                Debit: "",
                Credit: "",
                Balance: data.openingBalance
            },
            ...data.transactions.map((tx: any) => ({
                Date: format(new Date(tx.journalDate), "dd/MM/yyyy"),
                Journal: tx.journalNumber,
                Description: tx.description || "-",
                Debit: tx.debit > 0 ? tx.debit : "",
                Credit: tx.credit > 0 ? tx.credit : "",
                Balance: tx.runningBalance
            })),
            {
                Date: "",
                Journal: "TOTAL",
                Description: "",
                Debit: data.totalDebit,
                Credit: data.totalCredit,
                Balance: data.closingBalance
            }
        ];

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "General Ledger");
        XLSX.writeFile(wb, `General_Ledger_${data.account.code}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data || !data.transactions) return;

        const doc = new jsPDF();

        doc.setFontSize(16);
        doc.text("General Ledger Report", 14, 20);

        doc.setFontSize(10);
        doc.text(`Account: ${data.account.code} - ${data.account.name}`, 14, 30);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")}`, 14, 36);
        }

        const tableBody = [
            ["", "Opening Balance", "", "", "", fmt(data.openingBalance)],
            ...data.transactions.map((tx: any) => [
                format(new Date(tx.journalDate), "dd/MM/yyyy"),
                tx.journalNumber,
                tx.description || "-",
                tx.debit > 0 ? fmt(tx.debit) : "-",
                tx.credit > 0 ? fmt(tx.credit) : "-",
                fmt(tx.runningBalance)
            ]),
            ["", "TOTAL", "", fmt(data.totalDebit), fmt(data.totalCredit), fmt(data.closingBalance)]
        ];

        autoTable(doc, {
            startY: 42,
            head: [["Date", "Journal", "Description", "Debit", "Credit", "Balance"]],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: {
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 'auto' },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', cellWidth: 25 },
                5: { halign: 'right', cellWidth: 25 }
            },
            styles: { fontSize: 8 }
        });

        doc.save(`General_Ledger_${data.account.code}.pdf`);
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><BookOpen className="h-5 w-5 text-blue-400" /> General Ledger Report</h2>
                    <p className="text-xs text-slate-400">View transaction detail per account with running balance</p>
                </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="sm:col-span-2 space-y-1">
                        <Label className="text-xs text-slate-400">Account</Label>
                        <ComboboxCoA accounts={accounts} value={selectedCoa} onValueChange={setSelectedCoa} />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Start Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !startDate && "text-slate-500")}>
                                    {startDate ? format(startDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">End Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-full justify-start text-left font-normal bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]", !endDate && "text-slate-500")}>
                                    {endDate ? format(endDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-[#1e293b] border-white/[0.1] text-white shadow-xl">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white h-9">
                        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate
                    </Button>
                </div>
            </div>

            {/* Report */}
            {data && (
                <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden mt-6">
                    <div className="p-4 border-b border-white/[0.06] bg-blue-500/5 flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-semibold text-blue-300">{data.account.code} — {data.account.name}</h3>
                            <p className="text-[10px] text-slate-500 mt-0.5">{data.transactionCount} transaction{data.transactionCount !== 1 ? "s" : ""} • Opening: {fmt(data.openingBalance)} • Closing: {fmt(data.closingBalance)}</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleExportExcel} className="h-8 text-xs bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]">
                                <Download className="h-3 w-3 mr-2" /> Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportPdf} className="h-8 text-xs bg-[#0a0e1a] border-white/[0.1] text-white hover:bg-white/[0.04]">
                                <Download className="h-3 w-3 mr-2" /> PDF
                            </Button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                                <tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Journal</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Credit</th><th className="px-3 py-2 text-right">Balance</th></tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                <tr className="bg-slate-800/30">
                                    <td className="px-3 py-2 text-slate-400" colSpan={5}>Opening Balance</td>
                                    <td className="px-3 py-2 text-right font-mono font-medium text-white">{fmt(data.openingBalance)}</td>
                                </tr>
                                {data.transactions.map((tx: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 text-slate-400 font-mono">{format(new Date(tx.journalDate), "dd/MM/yyyy")}</td>
                                        <td className="px-3 py-2">
                                            <button onClick={() => router.push(`/journal/${tx.journalId}`)} className="text-blue-400 hover:underline font-mono">{tx.journalNumber}</button>
                                        </td>
                                        <td className="px-3 py-2 text-slate-300 max-w-[200px] truncate">{tx.description || "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{tx.debit > 0 ? fmt(tx.debit) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{tx.credit > 0 ? fmt(tx.credit) : "-"}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white font-medium">{fmt(tx.runningBalance)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-[#0a0e1a] border-t-2 border-blue-500/20">
                                <tr className="text-xs font-semibold">
                                    <td className="px-3 py-2 text-blue-300" colSpan={3}>TOTAL</td>
                                    <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(data.totalDebit)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-red-400">{fmt(data.totalCredit)}</td>
                                    <td className="px-3 py-2 text-right font-mono text-white font-bold">{fmt(data.closingBalance)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
