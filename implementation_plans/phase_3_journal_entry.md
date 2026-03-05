# 🚀 PHASE 3: JOURNAL ENTRY

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun modul Journal Entry lengkap meliputi semua jenis jurnal, validasi ketat, approval workflow, recurring journal, template, dan attachment dokumen |
| **Estimasi** | 3–4 minggu |
| **Dependencies** | Phase 1 (Auth, Company, Period), Phase 2 (Chart of Accounts) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, react-hook-form, zod |

---

## 📝 Context & Background

Journal Entry adalah inti dari seluruh sistem GL. Semua transaksi keuangan masuk melalui jurnal. Phase ini harus menghasilkan sistem jurnal yang robust, aman, dan user-friendly. Setiap jurnal yang di-Post akan mempengaruhi saldo CoA dan semua laporan keuangan.

---

## 📦 Tasks & Requirements

### 1. Journal Types

Sistem mendukung 7 jenis jurnal dengan behavior yang berbeda.

| Kode | Jenis | Deskripsi |
|------|-------|-----------|
| **GJ** | General Journal | Jurnal umum, input manual oleh user |
| **AJ** | Adjusting Journal | Jurnal penyesuaian akhir periode |
| **RJ** | Reversing Journal | Auto-generate dari AJ, dieksekusi di awal periode berikutnya |
| **CJ** | Closing Journal | Auto-generate saat year-end closing |
| **OJ** | Opening Journal | Auto-generate saat opening balance tahun baru |
| **RC** | Recurring Journal | Dijadwalkan otomatis berulang sesuai konfigurasi |
| **IC** | Intercompany Journal | Transaksi antar company dalam satu grup |

### 2. Journal Entry Form — Header

| # | Field | Detail |
|---|-------|--------|
| 2.1 | `journal_number` | Auto-generate dengan format configurable (JE/2025/001/0001) |
| 2.2 | `journal_type` | GJ / AJ / RJ / CJ / OJ / RC / IC |
| 2.3 | `journal_date` | Tanggal jurnal |
| 2.4 | `posting_date` | Tanggal efektif (default = `journal_date`) |
| 2.5 | `period` | Auto-detect dari `posting_date` |
| 2.6 | `reference_number` | Nomor referensi dokumen sumber (invoice, PO, kontrak) |
| 2.7 | `description` | Deskripsi transaksi |
| 2.8 | `currency` | Mata uang (default base currency company) |
| 2.9 | `exchange_rate` | Jika bukan base currency |
| 2.10 | `status` | DRAFT / SUBMITTED / APPROVED / POSTED / REVERSED |
| 2.11 | `attachment` | Upload file bukti transaksi (PDF, JPG, PNG) |
| 2.12 | `tags` | Label bebas untuk filter (bisa multi-tag) |

### 3. Journal Entry Form — Lines

Setiap jurnal minimal memiliki 2 baris. Total debit harus sama dengan total credit.

| # | Field | Detail |
|---|-------|--------|
| 3.1 | `line_number` | Urutan baris (auto) |
| 3.2 | `coa_id` | Pilih dari CoA aktif yang bukan header (autocomplete) |
| 3.3 | `department_id` | Opsional, untuk departmental report |
| 3.4 | `cost_center_id` | Opsional |
| 3.5 | `project_id` | Opsional |
| 3.6 | `description` | Deskripsi per baris |
| 3.7 | `debit_amount` | Nominal debit dalam mata uang jurnal |
| 3.8 | `credit_amount` | Nominal kredit dalam mata uang jurnal |
| 3.9 | `debit_base` | Otomatis = `debit_amount` × `exchange_rate` |
| 3.10 | `credit_base` | Otomatis = `credit_amount` × `exchange_rate` |
| 3.11 | `vendor_customer_id` | Opsional, untuk sub-ledger tracking |
| 3.12 | `tags` | Tag per baris (opsional) |

### 4. Validation Rules

Semua validasi ini harus dijalankan sebelum jurnal bisa di-Post.

| # | Rule |
|---|------|
| 4.1 | Total debit HARUS = Total credit (dalam base currency) |
| 4.2 | Minimal 2 baris jurnal |
| 4.3 | Period harus berstatus OPEN |
| 4.4 | CoA yang dipilih harus aktif dan bukan header account |
| 4.5 | Tanggal tidak boleh di luar fiscal year aktif |
| 4.6 | Jika currency bukan base currency, `exchange_rate` wajib > 0 |
| 4.7 | Jurnal dengan approval workflow harus berstatus APPROVED sebelum bisa di-Post |
| 4.8 | Nominal debit atau kredit per baris tidak boleh keduanya 0 |

### 5. Approval Workflow

Konfigurasi approval matrix berdasarkan nominal transaksi.

| # | Task | Detail |
|---|------|--------|
| 5.1 | Approval Matrix | Configurable per company berdasarkan amount range |
| 5.2 | Level contoh | < 10jt = auto approve, 10–50jt = 1 level, 50–500jt = 2 level, > 500jt = 3 level |
| 5.3 | Notifikasi | Approver mendapat notifikasi email & in-app saat ada jurnal pending |
| 5.4 | Approve/Reject | Approver bisa Approve atau Reject dengan mandatory comment |
| 5.5 | Reject flow | Status kembali ke DRAFT, pembuat mendapat notifikasi |
| 5.6 | History | Approval history tersimpan lengkap (siapa, kapan, action, comment) |

### 6. Template Journal

User bisa simpan jurnal yang sering dipakai sebagai template.

| # | Task | Detail |
|---|------|--------|
| 6.1 | Save template | Menyimpan: nama template, deskripsi, semua lines (CoA, dept, amount) |
| 6.2 | Use template | User tinggal adjust tanggal dan nominal |
| 6.3 | Share template | Bisa di-share ke user lain di company yang sama |
| 6.4 | Edit/Delete | Template bisa di-edit atau dihapus oleh pembuatnya |

### 7. Recurring Journal

Jurnal yang dijalankan otomatis secara berkala.

| # | Task | Detail |
|---|------|--------|
| 7.1 | Konfigurasi | Nama, template jurnal, frekuensi (daily/weekly/monthly), start date, end date |
| 7.2 | Auto-generate | Sistem auto-generate draft jurnal sesuai jadwal |
| 7.3 | Konfirmasi | User perlu konfirmasi / posting setelah jurnal recurring ter-generate |
| 7.4 | Auto-post | Bisa set auto-post jika tidak butuh review (jurnal rutin sederhana) |
| 7.5 | Notifikasi | Notifikasi dikirim saat recurring journal ter-generate |

### 8. Bulk Actions

| # | Action | Detail |
|---|--------|--------|
| 8.1 | Bulk Submit | Pilih beberapa jurnal DRAFT sekaligus, submit ke approval |
| 8.2 | Bulk Approve | Approver bisa approve banyak jurnal sekaligus |
| 8.3 | Bulk Post | Post banyak jurnal APPROVED sekaligus |
| 8.4 | Bulk Export | Export jurnal terpilih ke Excel/PDF |
| 8.5 | Bulk Reverse | Reverse beberapa jurnal sekaligus |

---

## 🗄️ Database Schema

### Tabel: `journals`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `journal_number` | VARCHAR(50) | Nomor jurnal auto-generate |
| `journal_type` | VARCHAR(5) | GJ/AJ/RJ/CJ/OJ/RC/IC |
| `journal_date` | DATE | Tanggal jurnal |
| `posting_date` | DATE | Tanggal efektif posting |
| `period_id` | UUID FK | Referensi ke periods |
| `fiscal_year_id` | UUID FK | Referensi ke fiscal_years |
| `reference_number` | VARCHAR(100) | Nomor referensi dokumen |
| `description` | TEXT | Deskripsi transaksi |
| `currency_code` | VARCHAR(3) | Kode mata uang |
| `exchange_rate` | DECIMAL(18,6) | Nilai tukar |
| `total_debit` | DECIMAL(18,2) | Total debit base currency |
| `total_credit` | DECIMAL(18,2) | Total credit base currency |
| `status` | VARCHAR(20) | DRAFT/SUBMITTED/APPROVED/POSTED/REVERSED |
| `reversal_of_id` | UUID FK nullable | Referensi ke jurnal asli jika ini reversal |
| `recurring_config_id` | UUID FK nullable | Referensi ke recurring config |
| `created_by` | UUID FK | User pembuat |
| `posted_by` | UUID FK nullable | User yang posting |
| `posted_at` | TIMESTAMP nullable | Waktu posting |

### Tabel: `journal_lines`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `journal_id` | UUID FK | Referensi ke journals |
| `company_id` | UUID FK | Referensi ke companies |
| `line_number` | INTEGER | Urutan baris |
| `coa_id` | UUID FK | Referensi ke chart_of_accounts |
| `department_id` | UUID FK nullable | Referensi ke departments |
| `cost_center_id` | UUID FK nullable | Referensi ke cost_centers |
| `project_id` | UUID FK nullable | Referensi ke projects |
| `description` | TEXT | Deskripsi baris |
| `debit_amount` | DECIMAL(18,2) | Debit dalam mata uang jurnal |
| `credit_amount` | DECIMAL(18,2) | Kredit dalam mata uang jurnal |
| `debit_base` | DECIMAL(18,2) | Debit dalam base currency |
| `credit_base` | DECIMAL(18,2) | Kredit dalam base currency |
| `vendor_customer_id` | UUID FK nullable | Untuk sub-ledger |
| `reconcile_status` | VARCHAR(20) | NOT_APPLICABLE/PENDING/RECONCILED |

### Tabel: `journal_approvals`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `journal_id` | UUID FK | Referensi ke journals |
| `approver_id` | UUID FK | User approver |
| `level` | INTEGER | Level approval (1, 2, 3) |
| `status` | VARCHAR(20) | PENDING/APPROVED/REJECTED |
| `comment` | TEXT nullable | Komentar approver |
| `action_at` | TIMESTAMP nullable | Waktu aksi |

---

## 🎨 UI/UX Notes

- Form jurnal menggunakan layout **split**: header di atas, tabel lines di bawah
- Tabel lines bisa **add/remove row** secara dinamis, mirip spreadsheet
- Counter debit vs credit **real-time** di bawah tabel (🟢 hijau jika balance, 🔴 merah jika tidak)
- Tombol **Post** hanya aktif jika total debit = total credit dan semua validasi lulus
- Status jurnal ditampilkan dengan **badge warna**: DRAFT=abu, SUBMITTED=kuning, APPROVED=biru, POSTED=hijau, REVERSED=merah
- List jurnal menggunakan **DataTable** dengan filter by: date range, type, status, CoA, amount range
- Klik nomor jurnal untuk lihat detail dalam modal atau halaman baru
- Tombol **Print/Export** di setiap jurnal untuk cetak bukti jurnal

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Total debit harus sama dengan total credit sebelum bisa di-Post (selisih = 0) |
| 2 | Tidak bisa post jurnal ke period yang Closed atau Locked |
| 3 | Tidak bisa post ke CoA header atau CoA yang inactive |
| 4 | Journal yang sudah Posted tidak bisa diedit — hanya bisa di-Reverse |
| 5 | Reversal journal otomatis membalik semua debit/kredit dari jurnal aslinya |
| 6 | Recurring journal harus memiliki template yang valid sebelum bisa diaktifkan |

---

## 📦 Deliverables Checklist

- [ ] Form Journal Entry lengkap (header + lines) dengan semua field
- [ ] Auto-generate journal number dengan format configurable
- [ ] Validasi real-time (debit = kredit)
- [ ] Approval workflow dengan notification
- [ ] Template Journal (CRUD)
- [ ] Recurring Journal konfigurasi dan auto-generate
- [ ] Bulk Actions (submit, approve, post, reverse)
- [ ] List Journal dengan filter dan search lengkap
- [ ] Attachment upload di jurnal
- [ ] Tag / Label di jurnal dan lines
