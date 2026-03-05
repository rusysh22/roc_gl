# 🚀 PHASE 6: FINANCIAL REPORTS

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun semua laporan keuangan utama: GL, Sub-Ledger, Trial Balance, Income Statement, Balance Sheet, Cash Flow Statement, Statement of Changes in Equity, Budget vs Actual, dan Custom Report Builder |
| **Estimasi** | 4–5 minggu |
| **Dependencies** | Phase 1–5 (semua data master dan transaksi) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, PDF generation (e.g., react-pdf), Excel export (e.g., exceljs) |

---

## 📝 Context & Background

Laporan keuangan adalah output utama dari sistem GL. Semua laporan harus akurat, mendukung comparison mode (Actual vs Budget vs Prior Year), dapat di-drill-down ke jurnal, dan bisa diexport ke PDF dan Excel. Semua laporan menggunakan data dari `journal_lines` yang sudah Posted.

---

## 📦 Tasks & Requirements

### 1. General Ledger Report

Laporan semua transaksi per CoA dalam periode tertentu.

| # | Task | Detail |
|---|------|--------|
| 1.1 | Filter | Company, branch, fiscal year, period range, CoA (single/multi), department, cost center |
| 1.2 | Kolom | Tanggal, nomor jurnal, deskripsi, referensi, debit, kredit, saldo berjalan |
| 1.3 | Saldo | Saldo awal periode, mutasi, saldo akhir per CoA |
| 1.4 | Reconciliation | Status per baris (✅ Reconciled / ⏳ Pending / -) |
| 1.5 | Drill-down | Klik nomor jurnal → lihat detail jurnal |
| 1.6 | Export | PDF dan Excel |

### 2. Trial Balance

| # | Task | Detail |
|---|------|--------|
| 2.1 | Mode Simple | Kode, nama CoA, total debit, total kredit, saldo |
| 2.2 | Mode Extended (Worksheet/Lajur) | Saldo awal, mutasi debit, mutasi kredit, saldo akhir, kolom penyesuaian, kolom Income Statement, kolom Balance Sheet |
| 2.3 | Comparison | Actual \| vs Budget \| vs Prior Year \| vs Budget vs Prior Year |
| 2.4 | Departmental | Filter per department atau cost center |
| 2.5 | Validasi | Total debit harus = total kredit (alert jika tidak balance) |

### 3. Income Statement (P&L)

Laporan laba rugi komprehensif dengan breakdown yang jelas.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Struktur | Revenue → COGS → Gross Profit → OPEX → EBITDA → Depreciation → EBIT → Interest → EBT → Tax → Net Profit |
| 3.2 | Auto-calculate | Gross Margin %, EBITDA Margin %, Net Margin % |
| 3.3 | Mode | Single Entity, Departmental (side by side), Consolidated (semua branch) |
| 3.4 | Comparison | Actual vs Budget vs Prior Year dengan variance nominal dan % |
| 3.5 | Multi-period | Tampilkan 12 bulan sekaligus dalam satu tabel |
| 3.6 | Drill-down | Per line item ke General Ledger |
| 3.7 | Contribution margin | Fixed vs variable cost analysis |

### 4. Balance Sheet

| # | Task | Detail |
|---|------|--------|
| 4.1 | Struktur | Asset (Current + Non-Current) \| Liability (Current + Non-Current) + Equity |
| 4.2 | Validasi | Total Asset = Total Liability + Equity |
| 4.3 | Comparison | Actual vs Prior Year dengan variance |
| 4.4 | Consolidated | Consolidated balance sheet untuk multi-branch |
| 4.5 | Drill-down | Per akun ke General Ledger |

### 5. Cash Flow Statement

| # | Task | Detail |
|---|------|--------|
| 5.1 | Direct Method | Arus kas masuk dan keluar per kategori operasional |
| 5.2 | Indirect Method | Mulai dari Net Profit, adjusted dengan perubahan working capital |
| 5.3 | Auto-generate | Berdasarkan `cash_flow_category` di CoA |
| 5.4 | Section | Operating Activities, Investing Activities, Financing Activities |
| 5.5 | Validasi | Net increase/decrease in cash + opening cash = closing cash (= saldo kas di Balance Sheet) |
| 5.6 | Comparison | Actual vs Budget vs Prior Year |

### 6. Statement of Changes in Equity

| # | Task | Detail |
|---|------|--------|
| 6.1 | Komponen | Share Capital, Retained Earnings, Other Comprehensive Income |
| 6.2 | Perubahan | Saldo awal, penambahan modal, dividen, net profit, saldo akhir |
| 6.3 | Link | Link ke net profit dari Income Statement secara otomatis |

### 7. Budget vs Actual Report

| # | Task | Detail |
|---|------|--------|
| 7.1 | Filter | Per CoA, department, cost center, project |
| 7.2 | Kolom | Budget, Actual, Variance (Rp), Variance (%), Achievement (%) |
| 7.3 | Highlight | Variance negatif 🔴 merah, positif 🟢 hijau |
| 7.4 | Drill-down | Dari setiap variance ke detail transaksi |
| 7.5 | Summary | Per Group CoA dan per Department |

### 8. Financial Ratio Report

| # | Task | Detail |
|---|------|--------|
| 8.1 | Liquidity | Current Ratio, Quick Ratio, Cash Ratio |
| 8.2 | Leverage | Debt to Equity, Debt to Asset |
| 8.3 | Profitability | ROE, ROA, Net Margin, Gross Margin, EBITDA Margin |
| 8.4 | Activity | Asset Turnover |
| 8.5 | Comparison | Semua rasio vs periode sebelumnya |
| 8.6 | Indicator | ✅ Healthy, ⚠️ Warning, ❌ Critical (berdasarkan benchmark) |

### 9. Custom Report Builder

| # | Task | Detail |
|---|------|--------|
| 9.1 | Drag & drop | CoA ke dalam laporan |
| 9.2 | Settings | Pilih periode, comparison mode, dan level detail |
| 9.3 | Save | Simpan konfigurasi sebagai laporan favorit |
| 9.4 | Share | Bisa share laporan custom ke user lain di company yang sama |
| 9.5 | Export | PDF dan Excel |

---

## 🗄️ Database Schema

### Tabel: `report_cache` (opsional, untuk performance)

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `report_type` | VARCHAR(50) | Jenis laporan |
| `period_id` | UUID FK | Periode laporan |
| `cache_data` | JSONB | Data cache laporan |
| `generated_at` | TIMESTAMP | Waktu generate |
| `is_valid` | BOOLEAN | Apakah cache masih valid |

### Tabel: `custom_reports`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `name` | VARCHAR(200) | Nama laporan custom |
| `config` | JSONB | Konfigurasi laporan (CoA, filter, dll) |
| `created_by` | UUID FK | User pembuat |
| `is_shared` | BOOLEAN | Bisa dilihat user lain |

---

## 🎨 UI/UX Notes

- Semua laporan menggunakan **filter panel** di bagian atas yang collapsible
- **Loading state** yang jelas saat laporan sedang di-generate
- Nomor diformat dengan separator ribuan (`1.000.000`) dan desimal (`,00`)
- Angka negatif ditampilkan dengan 🔴 warna merah dan tanda kurung `(1.000.000)`
- Setiap laporan punya tombol **Export PDF** dan **Export Excel** di pojok kanan atas
- **Drill-down**: klik angka → buka modal atau halaman baru dengan detail transaksi
- Comparison columns: Budget dan Prior Year ditampilkan dengan warna berbeda (abu-abu)
- Variance positif/negatif: warna hijau/merah dengan ikon panah naik/turun ↑ ↓
- **Print-friendly**: layout PDF menggunakan header perusahaan dan watermark

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Semua laporan hanya mengambil data dari `journal_lines` dengan status POSTED |
| 2 | Cash Flow Statement harus balance: Net Cash Change + Opening Cash = Closing Cash |
| 3 | Balance Sheet harus balance: Total Asset = Total Liability + Equity |
| 4 | Laporan hanya bisa diakses oleh user dengan permission `report.view` |
| 5 | Cache laporan harus di-invalidate setiap kali ada posting jurnal baru di periode tersebut |

---

## 📦 Deliverables Checklist

- [ ] General Ledger Report (dengan drill-down)
- [ ] Sub-Ledger Report
- [ ] Trial Balance (Simple & Extended/Worksheet mode)
- [ ] Income Statement (Single, Departmental, Consolidated)
- [ ] Balance Sheet (Single & Consolidated)
- [ ] Cash Flow Statement (Direct & Indirect Method)
- [ ] Statement of Changes in Equity
- [ ] Budget vs Actual Report
- [ ] Multi-Period Comparison Report (12 bulan)
- [ ] Financial Ratio Report
- [ ] Custom Report Builder
- [ ] Export PDF & Excel untuk semua laporan
