"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Scale, Search, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function TrialBalancePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [mode, setMode] = useState("simple");
    const [data, setData] = useState<any>(null);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ mode });
            if (startDate) params.set("startDate", format(startDate, "yyyy-MM-dd"));
            if (endDate) params.set("endDate", format(endDate, "yyyy-MM-dd"));
            const res = await fetch(`/api/reports/trial-balance?${params}`);
            if (res.ok) setData(await res.json());
        } catch { toast.error("System error"); }
        finally { setLoading(false); }
    };

    const handleExportExcel = () => {
        if (!data) return;

        const isExtended = mode === "extended";

        const exportData = data.rows.map((row: any) => {
            const base: any = {
                Code: row.code,
                "Account Name": row.name
            };

            if (isExtended) {
                Object.assign(base, {
                    "Open Debit": row.openingDebit || "",
                    "Open Credit": row.openingCredit || "",
                    "Mut. Debit": row.mutationDebit || "",
                    "Mut. Credit": row.mutationCredit || ""
                });
            }

            Object.assign(base, {
                Debit: row.totalDebit || "",
                Credit: row.totalCredit || "",
                Balance: row.balance
            });

            return base;
        });

        const totalsRow: any = {
            Code: "",
            "Account Name": "TOTAL"
        };

        if (isExtended) {
            Object.assign(totalsRow, {
                "Open Debit": "",
                "Open Credit": "",
                "Mut. Debit": "",
                "Mut. Credit": ""
            });
        }

        Object.assign(totalsRow, {
            Debit: data.totals.totalDebit,
            Credit: data.totals.totalCredit,
            Balance: data.totals.totalDebit - data.totals.totalCredit
        });

        exportData.push(totalsRow);

        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = isExtended
            ? [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }]
            : [{ wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
        XLSX.writeFile(wb, `Trial_Balance_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.xlsx`);
    };

    const handleExportPdf = () => {
        if (!data) return;

        const isExtended = mode === "extended";
        const doc = new jsPDF(isExtended ? 'landscape' : 'portrait');

        doc.setFontSize(16);
        doc.text("Trial Balance Report", 14, 20);
        doc.setFontSize(10);
        if (startDate && endDate) {
            doc.text(`Period: ${format(startDate, "dd/MM/yyyy")} to ${format(endDate, "dd/MM/yyyy")} (${isExtended ? 'Extended' : 'Simple'})`, 14, 28);
        }

        const head = isExtended
            ? [["Code", "Account Name", "Open Debit", "Open Credit", "Mut. Debit", "Mut. Credit", "Debit", "Credit", "Balance"]]
            : [["Code", "Account Name", "Debit", "Credit", "Balance"]];

        const body = data.rows.map((row: any) => {
            const rowData: any[] = [row.code, row.name];
            if (isExtended) {
                rowData.push(
                    row.openingDebit ? fmt(row.openingDebit) : "-",
                    row.openingCredit ? fmt(row.openingCredit) : "-",
                    row.mutationDebit ? fmt(row.mutationDebit) : "-",
                    row.mutationCredit ? fmt(row.mutationCredit) : "-"
                );
            }
            rowData.push(
                row.totalDebit ? fmt(row.totalDebit) : "-",
                row.totalCredit ? fmt(row.totalCredit) : "-",
                row.balance < 0 ? `(${fmt(Math.abs(row.balance))})` : fmt(row.balance)
            );
            return rowData;
        });

        const totalsRow: any[] = [
            { content: "TOTAL", colSpan: 2, styles: { fontStyle: 'bold' } }
        ];
        if (isExtended) {
            totalsRow.push("", "", "", "");
        }
        totalsRow.push(
            { content: fmt(data.totals.totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt(data.totals.totalCredit), styles: { fontStyle: 'bold', halign: 'right' } },
            { content: fmt(data.totals.totalDebit - data.totals.totalCredit), styles: { fontStyle: 'bold', halign: 'right' } }
        );
        body.push(totalsRow);

        const columnStyles: any = isExtended
            ? {
                0: { cellWidth: 20 },
                1: { cellWidth: 'auto' },
                2: { halign: 'right', cellWidth: 25 },
                3: { halign: 'right', cellWidth: 25 },
                4: { halign: 'right', cellWidth: 25 },
                5: { halign: 'right', cellWidth: 25 },
                6: { halign: 'right', cellWidth: 25 },
                7: { halign: 'right', cellWidth: 25 },
                8: { halign: 'right', cellWidth: 25 }
            }
            : {
                0: { cellWidth: 25 },
                1: { cellWidth: 'auto' },
                2: { halign: 'right', cellWidth: 35 },
                3: { halign: 'right', cellWidth: 35 },
                4: { halign: 'right', cellWidth: 35 }
            };

        autoTable(doc, {
            startY: 34,
            head: head,
            body: body,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42] },
            columnStyles: columnStyles,
            styles: { fontSize: 8 }
        });

        doc.save(`Trial_Balance_${format(startDate || new Date(), "yyyyMMdd")}_${format(endDate || new Date(), "yyyyMMdd")}.pdf`);
    };

    const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push("/reports")} className="h-9 w-9 p-0 text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /></Button>
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Scale className="h-5 w-5 text-violet-400" /> Trial Balance</h2>
                    <p className="text-xs text-slate-400">Verify total debits equal total credits</p>
                </div>
            </div>

            <div className="bg-[#111827] border border-white/[0.08] rounded-xl p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
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
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Mode</Label>
                        <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="bg-[#0a0e1a] border-white/[0.1] text-white text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-[#1e293b] border-white/[0.08] text-white">
                                <SelectItem value="simple">Simple</SelectItem>
                                <SelectItem value="extended">Extended (Worksheet)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleGenerate} disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white h-9">
                        {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />} Generate
                    </Button>
                </div>
            </div>

            {data && (
                <>
                    {/* Balance Validation */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 mb-4">
                        <div className={cn("rounded-xl p-4 border flex items-center gap-3 w-full sm:w-auto", data.totals.isBalanced ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20")}>
                            {data.totals.isBalanced ? <CheckCircle className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
                            <div>
                                <p className={cn("font-semibold text-sm", data.totals.isBalanced ? "text-emerald-400" : "text-red-400")}>
                                    {data.totals.isBalanced ? "BALANCED ✓" : `UNBALANCED — Difference: ${fmt(data.totals.difference)}`}
                                </p>
                                <p className="text-[10px] text-slate-500">Total Debit: {fmt(data.totals.totalDebit)} | Total Credit: {fmt(data.totals.totalCredit)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleExportExcel} className="h-10 sm:h-9 flex-1 sm:flex-none bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                                <Download className="h-4 w-4 mr-2" /> Excel
                            </Button>
                            <Button variant="outline" onClick={handleExportPdf} className="h-10 sm:h-9 flex-1 sm:flex-none bg-[#111827] border-white/[0.08] text-white hover:bg-white/[0.04]">
                                <Download className="h-4 w-4 mr-2" /> PDF
                            </Button>
                        </div>
                    </div>

                    <div className="bg-[#111827] border border-white/[0.08] rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-[#0a0e1a] text-[10px] uppercase text-slate-500 font-semibold">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Code</th>
                                        <th className="px-3 py-2 text-left">Account Name</th>
                                        {mode === "extended" && (<><th className="px-2 py-2 text-right">Open Debit</th><th className="px-2 py-2 text-right">Open Credit</th><th className="px-2 py-2 text-right">Mut. Debit</th><th className="px-2 py-2 text-right">Mut. Credit</th></>)}
                                        <th className="px-3 py-2 text-right">Debit</th>
                                        <th className="px-3 py-2 text-right">Credit</th>
                                        <th className="px-3 py-2 text-right">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {data.rows.map((row: any) => (
                                        <tr key={row.coaId} className="hover:bg-white/[0.02]">
                                            <td className="px-3 py-1.5 font-mono text-slate-300">{row.code}</td>
                                            <td className="px-3 py-1.5 text-slate-200 truncate max-w-[200px]">{row.name}</td>
                                            {mode === "extended" && (
                                                <>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">{row.openingDebit > 0 ? fmt(row.openingDebit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">{row.openingCredit > 0 ? fmt(row.openingCredit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-emerald-500/60">{row.mutationDebit > 0 ? fmt(row.mutationDebit) : "-"}</td>
                                                    <td className="px-2 py-1.5 text-right font-mono text-red-500/60">{row.mutationCredit > 0 ? fmt(row.mutationCredit) : "-"}</td>
                                                </>
                                            )}
                                            <td className="px-3 py-1.5 text-right font-mono text-emerald-400">{row.totalDebit > 0 ? fmt(row.totalDebit) : "-"}</td>
                                            <td className="px-3 py-1.5 text-right font-mono text-red-400">{row.totalCredit > 0 ? fmt(row.totalCredit) : "-"}</td>
                                            <td className={cn("px-3 py-1.5 text-right font-mono font-medium", row.balance >= 0 ? "text-white" : "text-red-400")}>
                                                {row.balance < 0 ? `(${fmt(Math.abs(row.balance))})` : fmt(row.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-[#0a0e1a] border-t-2 border-violet-500/20 text-xs font-bold">
                                    <tr>
                                        <td className="px-3 py-2 text-violet-300" colSpan={mode === "extended" ? 6 : 2}>TOTAL</td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-400">{fmt(data.totals.totalDebit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-red-400">{fmt(data.totals.totalCredit)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-white">{fmt(data.totals.totalDebit - data.totals.totalCredit)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
