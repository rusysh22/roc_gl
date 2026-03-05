# 🚀 PHASE 4: BANK & CASH MANAGEMENT

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun modul Bank Account Master, Bank Transaction, Payment & Receipt Voucher, Petty Cash, Inter-Bank Transfer, dan Bank Reconciliation (Manual & Auto Mode) |
| **Estimasi** | 3–4 minggu |
| **Dependencies** | Phase 1 (Auth, Company), Phase 2 (CoA), Phase 3 (Journal Entry) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, react-hook-form, zod |

---

## 📝 Context & Background

Modul Bank & Cash adalah jembatan antara General Ledger dan rekening bank nyata. Semua transaksi kas/bank harus bisa dilacak dan direkonsiliasi. Bank Reconciliation adalah fitur kritis yang memastikan saldo GL sesuai dengan rekening koran dari bank.

---

## 📦 Tasks & Requirements

### 1. Bank Account Master

Setup rekening bank yang dimiliki perusahaan. Setiap bank account di-link ke CoA kas/bank di GL.

| # | Field | Detail |
|---|-------|--------|
| 1.1 | `account_name` | Nama rekening (misal: BCA Operasional IDR) |
| 1.2 | `bank_name` | Nama bank |
| 1.3 | `account_number` | Nomor rekening |
| 1.4 | `account_holder` | Nama pemegang rekening |
| 1.5 | `branch_name` | Nama cabang bank |
| 1.6 | `currency` | Mata uang rekening |
| 1.7 | `coa_id` | Link ke akun Kas/Bank di Chart of Accounts |
| 1.8 | `company_id` & `branch_id` | Kepemilikan rekening |
| 1.9 | `opening_balance` & `opening_date` | Saldo awal saat setup |
| 1.10 | `is_active` | Status aktif |

### 2. Payment & Receipt Voucher

Voucher pengeluaran dan penerimaan kas/bank yang otomatis generate jurnal.

| # | Task | Detail |
|---|------|--------|
| 2.1 | Payment Voucher | Tanggal, bank account, payee, amount, payment method, referensi, deskripsi, attachment |
| 2.2 | Receipt Voucher | Tanggal, bank account, payer, amount, receipt method, referensi, deskripsi, attachment |
| 2.3 | Auto-journal | Setelah voucher di-approve dan di-post, auto-generate Journal Entry |
| 2.4 | Nomor auto | `PV/2025/001`, `RV/2025/001` |
| 2.5 | Void | Voucher bisa di-void jika terjadi kesalahan (dengan jurnal balik otomatis) |

### 3. Inter-Bank Transfer

Transfer dana antar rekening bank milik perusahaan yang sama.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Bank selection | Pilih bank sumber dan bank tujuan |
| 3.2 | Date handling | Transfer date dan value date bisa berbeda (handling float) |
| 3.3 | Multi-currency | Amount dan exchange rate jika beda currency |
| 3.4 | Auto-journal | Auto-generate 2 journal lines: kredit bank sumber, debit bank tujuan |
| 3.5 | In-Transit | Jika value date berbeda, generate In-Transit entry |

### 4. Petty Cash Management

| # | Task | Detail |
|---|------|--------|
| 4.1 | Setup fund | Petty cash fund per lokasi/department dengan saldo awal |
| 4.2 | Top-up | Transfer dari bank ke kas kecil |
| 4.3 | Pengeluaran | Input per transaksi dengan CoA dan attachment |
| 4.4 | Laporan mutasi | Saldo awal, penerimaan, pengeluaran, saldo akhir |
| 4.5 | Rekonsiliasi fisik | Input saldo fisik, sistem hitung selisih |

### 5. Returned / Bounced Transaction

| # | Task | Detail |
|---|------|--------|
| 5.1 | Cek mundur | Bounced check: auto-reverse jurnal terkait |
| 5.2 | Transfer gagal | Auto-reverse dan notifikasi ke user |
| 5.3 | Tandai returned | Tandai transaksi yang di-return di bank statement |
| 5.4 | Jurnal koreksi | Generate jurnal koreksi otomatis |
| 5.5 | Alert | Notifikasi saat ada bounced transaction |

### 6. Bank Statement Import

Import mutasi rekening koran dari file untuk digunakan dalam rekonsiliasi.

| # | Task | Detail |
|---|------|--------|
| 6.1 | Format support | CSV, Excel (.xlsx), MT940 (format SWIFT) |
| 6.2 | Template config | Template Excel per bank bisa dikonfigurasi (mapping kolom) |
| 6.3 | Preview | Preview sebelum import: tampilkan daftar transaksi yang akan diimport |
| 6.4 | Validasi duplikat | Cek duplikat berdasarkan referensi dan tanggal |
| 6.5 | Status awal | Setelah import, semua transaksi berstatus UNMATCHED |

### 7. Bank Reconciliation — Manual Mode

User melakukan matching satu per satu antara transaksi bank dan GL.

| # | Task | Detail |
|---|------|--------|
| 7.1 | Workspace 2 panel | Kiri = transaksi bank, kanan = transaksi GL |
| 7.2 | Matching | User centang transaksi di kedua sisi yang cocok → sistem match-kan |
| 7.3 | Counter real-time | Saldo bank vs GL update real-time saat matching |
| 7.4 | Create Journal | Tombol untuk transaksi bank yang belum ada di GL (bank charges, bunga) |
| 7.5 | Mark Outstanding | Tombol untuk transaksi GL yang belum muncul di bank |
| 7.6 | Finalize | Selisih harus = 0 sebelum bisa finalize |

### 8. Bank Reconciliation — Auto Mode

Sistem otomatis matching transaksi bank dengan GL berdasarkan rules.

| # | Rule | Detail |
|---|------|--------|
| 8.1 | Rule 1 | Match by exact amount + date (toleransi ±3 hari) |
| 8.2 | Rule 2 | Match by reference number |
| 8.3 | Rule 3 | Match by description keyword (configurable) |
| 8.4 | Rule 4 | Kombinasi rules di atas dengan confidence score |
| 8.5 | Review | User review hasilnya: confirm atau unmatch |
| 8.6 | Low confidence | Transaksi dengan confidence score rendah → review manual |
| 8.7 | Config | Matching rules bisa dikonfigurasi per company |

### 9. Bank Reconciliation Report

| # | Task | Detail |
|---|------|--------|
| 9.1 | Bagian A | Saldo per rekening koran + penyesuaian deposit in transit & outstanding checks |
| 9.2 | Bagian B | Saldo per GL + penyesuaian item yang belum dijurnal |
| 9.3 | Kesimpulan | Adjusted Bank Balance vs Adjusted GL Balance (selisih harus 0) |
| 9.4 | Detail | Transaksi matched, unmatched, dan outstanding per section |
| 9.5 | Summary | Jumlah transaksi matched, unmatched, completion percentage |
| 9.6 | History | History rekonsiliasi per periode per bank account |
| 9.7 | Export | PDF dan Excel |

### 10. Cash Position Dashboard

| # | Task | Detail |
|---|------|--------|
| 10.1 | Saldo per bank | Saldo per bank account (IDR equivalent) |
| 10.2 | Total position | Total cash & bank position |
| 10.3 | Indicator | Reconciled vs unreconciled per bank account |
| 10.4 | Chart | Mini chart pergerakan saldo 30 hari terakhir |
| 10.5 | Alert | Alert jika saldo di bawah threshold |

---

## 🗄️ Database Schema

### Tabel: `bank_accounts`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `account_name` | VARCHAR(200) | Nama rekening |
| `bank_name` | VARCHAR(100) | Nama bank |
| `account_number` | VARCHAR(50) | Nomor rekening |
| `account_holder` | VARCHAR(200) | Nama pemegang |
| `currency_code` | VARCHAR(3) | Mata uang |
| `coa_id` | UUID FK | Link ke CoA Kas/Bank |
| `opening_balance` | DECIMAL(18,2) | Saldo awal |
| `opening_date` | DATE | Tanggal saldo awal |
| `is_active` | BOOLEAN | Status aktif |

### Tabel: `bank_transactions`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `bank_account_id` | UUID FK | Referensi ke bank_accounts |
| `company_id` | UUID FK | Referensi ke companies |
| `transaction_date` | DATE | Tanggal transaksi |
| `value_date` | DATE | Tanggal efektif |
| `transaction_type` | VARCHAR(10) | DEBIT / CREDIT |
| `amount` | DECIMAL(18,2) | Nominal |
| `reference` | VARCHAR(200) | Nomor referensi |
| `description` | TEXT | Deskripsi |
| `status` | VARCHAR(20) | UNMATCHED/MATCHED/RECONCILED |
| `journal_line_id` | UUID FK nullable | Link ke journal_lines setelah matched |
| `is_bounced` | BOOLEAN | Transaksi dikembalikan |
| `import_batch_id` | UUID nullable | Batch import reference |

### Tabel: `bank_reconciliations`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `bank_account_id` | UUID FK | Referensi ke bank_accounts |
| `company_id` | UUID FK | Referensi ke companies |
| `period_id` | UUID FK | Referensi ke periods |
| `status` | VARCHAR(20) | DRAFT/IN_PROGRESS/FINALIZED/LOCKED |
| `bank_statement_balance` | DECIMAL(18,2) | Saldo per rekening koran |
| `gl_balance` | DECIMAL(18,2) | Saldo per GL |
| `adjusted_bank_balance` | DECIMAL(18,2) | Saldo bank setelah penyesuaian |
| `adjusted_gl_balance` | DECIMAL(18,2) | Saldo GL setelah penyesuaian |
| `difference` | DECIMAL(18,2) | Selisih (harus 0) |
| `finalized_by` | UUID FK nullable | User yang finalize |
| `finalized_at` | TIMESTAMP nullable | Waktu finalisasi |

---

## 🎨 UI/UX Notes

- **Reconciliation Workspace**: layout 2 panel side-by-side yang responsif
- Highlight transaksi yang sudah di-match dengan warna 🟢 hijau
- Tombol **"Auto Match"** yang menjalankan auto-matching dan menampilkan hasilnya
- **Progress bar** showing reconciliation completion percentage
- **Cash Position Dashboard** menggunakan card layout dengan chart mini
- **Import bank statement**: drag & drop file dengan progress bar
- **Voucher**: form yang clean dengan auto-fill dari bank account master

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Bank account harus di-link ke CoA yang `account_type` = ASSET |
| 2 | Selisih rekonsiliasi harus = 0 sebelum bisa di-Finalize |
| 3 | Rekonsiliasi yang sudah Finalized tidak bisa diubah (kecuali di-reopen dengan approval) |
| 4 | Satu periode hanya bisa memiliki satu rekonsiliasi per bank account |
| 5 | Payment/Receipt Voucher yang sudah di-post tidak bisa diedit, hanya bisa di-void |
| 6 | Inter-bank transfer hanya bisa antara bank account dengan company yang sama |

---

## 📦 Deliverables Checklist

- [ ] CRUD Bank Account Master
- [ ] Payment Voucher & Receipt Voucher dengan auto-journal
- [ ] Inter-Bank Transfer
- [ ] Petty Cash Management
- [ ] Bank Statement Import (CSV/Excel/MT940)
- [ ] Bank Reconciliation Workspace (Manual Mode)
- [ ] Bank Reconciliation Auto-Match Engine
- [ ] Returned/Bounced Transaction handling
- [ ] Bank Reconciliation Report (PDF & Excel)
- [ ] Cash Position Dashboard
- [ ] Reconciliation History per bank per periode
