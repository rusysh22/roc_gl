# 🚀 PHASE 7: TAX REPORTS & PERIOD-END PROCESS

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun laporan pajak (PPN, PPh 21/23/4ayat2, Koreksi Fiskal, Pajak Tangguhan), fitur Period-End Checklist, Fixed Asset Depreciation, Foreign Currency Revaluation, dan Year-End Closing |
| **Estimasi** | 2–3 minggu |
| **Dependencies** | Phase 1–6 (semua master data, journal, dan laporan keuangan) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, cron/scheduler, Excel export |

---

## 📝 Context & Background

Phase ini menyelesaikan siklus akuntansi penuh dengan laporan pajak yang komprehensif dan proses tutup buku yang terstruktur. Period-End Checklist memastikan semua proses wajib selesai sebelum periode bisa ditutup.

---

## 📦 Tasks & Requirements

### 1. Tax Reports — PPN

Laporan Pajak Pertambahan Nilai Masukan dan Keluaran.

| # | Task | Detail |
|---|------|--------|
| 1.1 | Rekap PPN Masukan | Daftar semua transaksi dengan `tax_mapping_code = PPN_MASUKAN` |
| 1.2 | Rekap PPN Keluaran | Daftar semua transaksi dengan `tax_mapping_code = PPN_KELUARAN` |
| 1.3 | Summary | PPN Keluaran - PPN Masukan = PPN Kurang/Lebih Bayar |
| 1.4 | Filter | Per periode dan per vendor/customer |
| 1.5 | Export e-Faktur | Format siap upload ke e-Faktur DJP |
| 1.6 | Validasi NPWP | Cek kelengkapan NPWP vendor/customer |

### 2. Tax Reports — PPh

Laporan Pajak Penghasilan berbagai pasal.

| # | Task | Detail |
|---|------|--------|
| 2.1 | PPh 21 Summary | Rekap beban gaji dan pajak karyawan per periode |
| 2.2 | PPh 23 Summary | Rekap jasa, royalti, sewa per vendor dengan tarif pajak |
| 2.3 | PPh Pasal 4 Ayat 2 | Sewa tanah/bangunan, jasa konstruksi, dll |
| 2.4 | Withholding Tax Tracking | Pajak yang dipotong pihak lain atas penghasilan perusahaan |
| 2.5 | PPh Badan Estimasi | Estimasi pajak badan berdasarkan EBT dari Income Statement |
| 2.6 | Export | Semua laporan PPh bisa di-export ke Excel |

### 3. Tax Reconciliation (Koreksi Fiskal)

Rekonsiliasi laba akuntansi vs laba fiskal untuk keperluan SPT Badan.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Koreksi positif | Input biaya yang tidak diakui fiskal |
| 3.2 | Koreksi negatif | Input penghasilan yang tidak diakui fiskal |
| 3.3 | Hitung laba fiskal | Laba akuntansi + koreksi positif - koreksi negatif |
| 3.4 | Hitung PPh Badan | PPh Badan terutang berdasarkan laba fiskal |
| 3.5 | Export | Laporan koreksi fiskal ke Excel |

### 4. Deferred Tax Calculation (PSAK 46)

Perhitungan pajak tangguhan sesuai standar akuntansi.

| # | Task | Detail |
|---|------|--------|
| 4.1 | Identify | Identifikasi temporary differences per CoA |
| 4.2 | Calculate | Hitung Deferred Tax Asset dan Deferred Tax Liability |
| 4.3 | Auto-journal | Auto-generate jurnal pengakuan pajak tangguhan |
| 4.4 | Laporan | Rekonsiliasi pajak kini dan pajak tangguhan |

### 5. Period-End Checklist

Checklist otomatis yang harus diselesaikan sebelum periode bisa ditutup.

| # | Task | Detail |
|---|------|--------|
| 5.1 | Configurable | Item checklist dikonfigurasi per company (bisa tambah/kurang) |
| 5.2 | Default items | Bank Reconciliation semua akun, Fixed Asset Depreciation, Recurring Journal, Currency Revaluation, Accrual Review, Budget Variance Review |
| 5.3 | Status per item | Pending ⚠️, Done ✅, Not Applicable - |
| 5.4 | Close requirement | Periode hanya bisa di-Close jika semua item mandatory sudah Done |
| 5.5 | Progress | Tampilkan completion percentage (misal: 6/8 = 75%) |

### 6. Fixed Asset Depreciation Run

Proses kalkulasi dan posting penyusutan aset tetap setiap periode.

| # | Task | Detail |
|---|------|--------|
| 6.1 | Hitung | Penyusutan per aset berdasarkan metode (Straight Line / Declining Balance) |
| 6.2 | Preview | Preview hasil kalkulasi sebelum posting |
| 6.3 | Bulk post | Bulk post jurnal penyusutan setelah review |
| 6.4 | Schedule | Laporan fixed asset schedule: nilai perolehan, akumulasi penyusutan, nilai buku |
| 6.5 | Disposal | Asset disposal: jurnal otomatis saat aset dijual atau dihapus |

### 7. Foreign Currency Revaluation

Penyesuaian nilai akun berdenominasi mata uang asing ke kurs akhir periode.

| # | Task | Detail |
|---|------|--------|
| 7.1 | Identifikasi | Semua akun non-base-currency dengan saldo |
| 7.2 | Hitung | Unrealized gain/loss berdasarkan kurs akhir periode |
| 7.3 | Auto-journal | Auto-generate jurnal revaluation |
| 7.4 | Laporan | Revaluation per akun |
| 7.5 | Auto-reversal | Reversal otomatis di awal periode berikutnya |

### 8. Year-End Closing

Proses tutup buku akhir tahun yang otomatis.

| # | Task | Detail |
|---|------|--------|
| 8.1 | Transfer saldo | Revenue dan Expense ke Retained Earnings (jurnal penutup otomatis) |
| 8.2 | Zero-out | Semua akun nominal (Income Statement accounts) |
| 8.3 | Carry forward | Saldo akun riil (Balance Sheet accounts) sebagai Opening Balance tahun baru |
| 8.4 | Lock | Lock fiscal year yang sudah di-close |
| 8.5 | Opening Journal | Generate Opening Journal untuk fiscal year baru |

---

## 🗄️ Database Schema

### Tabel: `fixed_assets`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `asset_code` | VARCHAR(30) | Kode aset |
| `asset_name` | VARCHAR(200) | Nama aset |
| `category` | VARCHAR(100) | Kategori aset |
| `acquisition_date` | DATE | Tanggal perolehan |
| `acquisition_cost` | DECIMAL(18,2) | Nilai perolehan |
| `useful_life_months` | INTEGER | Umur ekonomis (bulan) |
| `depreciation_method` | VARCHAR(20) | STRAIGHT_LINE / DECLINING_BALANCE |
| `salvage_value` | DECIMAL(18,2) | Nilai sisa |
| `accumulated_depreciation` | DECIMAL(18,2) | Akumulasi penyusutan |
| `book_value` | DECIMAL(18,2) | Nilai buku (auto) |
| `coa_asset_id` | UUID FK | CoA aset tetap |
| `coa_accum_dep_id` | UUID FK | CoA akumulasi penyusutan |
| `coa_dep_expense_id` | UUID FK | CoA beban penyusutan |
| `is_active` | BOOLEAN | Status aktif |
| `disposal_date` | DATE nullable | Tanggal disposal |

### Tabel: `fiscal_corrections`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `fiscal_year_id` | UUID FK | Tahun pajak |
| `description` | TEXT | Deskripsi koreksi |
| `correction_type` | VARCHAR(20) | POSITIVE / NEGATIVE |
| `amount` | DECIMAL(18,2) | Nominal koreksi |
| `coa_id` | UUID FK nullable | CoA terkait |

---

## 🎨 UI/UX Notes

- **Period-End Checklist** ditampilkan sebagai card dengan progress bar di dashboard
- Checklist item yang belum selesai highlighted dengan warna kuning/oranye
- Tombol **"Run Depreciation"** membuka modal konfirmasi dengan preview hasil kalkulasi
- **Year-End Closing** memiliki konfirmasi multi-step: preview jurnal penutup → konfirmasi → eksekusi
- Tax reports menggunakan layout tabel yang bisa di-scroll horizontal untuk banyak kolom

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Year-End Closing tidak bisa dijalankan jika masih ada periode dalam fiscal year berstatus OPEN |
| 2 | Depreciation run hanya bisa dilakukan sekali per periode per aset |
| 3 | Koreksi fiskal hanya bisa diinput setelah Income Statement periode tersebut sudah final |
| 4 | Period tidak bisa di-Close jika Period-End Checklist belum 100% complete (semua mandatory) |
| 5 | Jurnal revaluation harus di-reverse otomatis di awal periode berikutnya |

---

## 📦 Deliverables Checklist

- [ ] Laporan PPN Masukan & Keluaran dengan export e-Faktur
- [ ] Laporan PPh 21, 23, Pasal 4 Ayat 2
- [ ] Withholding Tax Tracking
- [ ] Tax Reconciliation / Koreksi Fiskal
- [ ] Deferred Tax Calculation (PSAK 46)
- [ ] PPh Badan Estimasi
- [ ] Period-End Checklist
- [ ] Fixed Asset Depreciation Run & Schedule
- [ ] Foreign Currency Revaluation
- [ ] Year-End Closing (auto journal)
- [ ] Asset Disposal dengan jurnal otomatis
