# 🚀 PHASE 2: CHART OF ACCOUNTS (CoA)

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun modul Chart of Accounts lengkap dengan Group CoA, Sub-Group, dan semua atribut untuk auto-generate laporan keuangan dan pajak |
| **Estimasi** | 2–3 minggu |
| **Dependencies** | Phase 1 (Company, User, Auth, Fiscal Year) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, react-hook-form, zod |

---

## 📝 Context & Background

CoA adalah jantung dari sistem akuntansi. Struktur CoA yang benar akan menentukan akurasi semua laporan keuangan. Setiap akun harus memiliki atribut yang cukup sehingga sistem dapat auto-generate Cash Flow Statement, laporan pajak, dan konsolidasi tanpa mapping manual tambahan.

---

## 📦 Tasks & Requirements

### 1. Group CoA & Sub-Group

Struktur hierarki CoA: **Group → Sub-Group → CoA Detail**. Group adalah level tertinggi.

| # | Task | Detail |
|---|------|--------|
| 1.1 | Group CoA CRUD | Kode, nama, `account_type` (ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE) |
| 1.2 | Sub-Group CoA CRUD | Kode, nama, group_coa reference, urutan tampil di laporan |
| 1.3 | Hierarki 3 level | Group > Sub-Group > Detail |
| 1.4 | Header restriction | Group dan Sub-Group adalah header account — tidak bisa diposting langsung |

### 2. Chart of Accounts Detail

Akun detail tempat transaksi diposting. Setiap akun memiliki atribut lengkap.

| # | Task | Detail |
|---|------|--------|
| 2.1 | Kode akun | Format configurable per company (misal: `1-1001-001`) |
| 2.2 | Nama bilingual | Nama akun dalam Bahasa Indonesia dan Bahasa Inggris |
| 2.3 | `account_type` | ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE |
| 2.4 | `account_sub_type` | Current Asset, Fixed Asset, Current Liability, Long-term Liability, dll |
| 2.5 | `normal_balance` | DEBIT / CREDIT (otomatis berdasarkan account_type) |
| 2.6 | `cash_flow_category` | OPERATING / INVESTING / FINANCING / NON_CASH / NONE |
| 2.7 | `tax_mapping_code` | Kode untuk auto-mapping ke laporan pajak (PPN, PPh21, PPh23, dll) |
| 2.8 | `is_budget_applicable` | Apakah akun ini bisa dianggarkan |
| 2.9 | `is_intercompany` | Apakah akun ini digunakan untuk transaksi antar perusahaan |
| 2.10 | `psak_tag` | Kode PSAK/IFRS untuk mapping standar akuntansi |
| 2.11 | `is_header` | True jika ini akun header (tidak bisa diposting) |
| 2.12 | `parent_coa_id` | Referensi ke akun parent (untuk hierarki) |

### 3. CoA Template / Default

Sediakan template CoA standar yang bisa dipilih saat setup company baru.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Template standar | Perusahaan Dagang, Perusahaan Jasa, Manufaktur, Konstruksi |
| 3.2 | Import template | User bisa import template lalu modifikasi sesuai kebutuhan |
| 3.3 | Import via Excel | Import CoA via Excel dengan template yang sudah disediakan |
| 3.4 | Validasi import | Cek kode duplikat, hierarki tidak valid, field wajib kosong |

### 4. CoA Structure Validator

Fitur validasi otomatis untuk memastikan struktur CoA sudah benar sebelum mulai transaksi.

| # | Task | Detail |
|---|------|--------|
| 4.1 | Cek account_type | Semua account_type sudah ada (Asset, Liability, Equity, Revenue, Expense) |
| 4.2 | Cek orphan | Tidak ada CoA orphan (detail tanpa group/sub-group) |
| 4.3 | Cek cash flow | Cash flow category mapping lengkap untuk semua akun |
| 4.4 | Cek Retained Earnings | Retained Earnings account sudah di-set |
| 4.5 | Cek duplikat | Tidak ada kode akun duplikat |
| 4.6 | Tampilkan hasil | Daftar issue yang harus diperbaiki |

---

## 🗄️ Database Schema

### Tabel: `coa_groups`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `code` | VARCHAR(20) | Kode group |
| `name` | VARCHAR(200) | Nama group |
| `name_en` | VARCHAR(200) | Nama dalam Bahasa Inggris |
| `account_type` | VARCHAR(20) | ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE |
| `sort_order` | INTEGER | Urutan tampil di laporan |
| `is_active` | BOOLEAN | Status aktif |

### Tabel: `chart_of_accounts`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `coa_group_id` | UUID FK | Referensi ke coa_groups |
| `parent_coa_id` | UUID FK nullable | Untuk hierarki CoA |
| `code` | VARCHAR(30) | Kode akun unik per company |
| `name` | VARCHAR(200) | Nama akun |
| `name_en` | VARCHAR(200) | Nama akun bahasa Inggris |
| `account_type` | VARCHAR(20) | ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE |
| `account_sub_type` | VARCHAR(50) | Current Asset, Fixed Asset, dll |
| `normal_balance` | VARCHAR(10) | DEBIT / CREDIT |
| `cash_flow_category` | VARCHAR(20) | OPERATING/INVESTING/FINANCING/NONE |
| `tax_mapping_code` | VARCHAR(50) | Kode mapping pajak |
| `is_budget_applicable` | BOOLEAN | Bisa dianggarkan |
| `is_intercompany` | BOOLEAN | Akun intercompany |
| `is_header` | BOOLEAN | Header account (tidak bisa diposting) |
| `is_active` | BOOLEAN | Status aktif |
| `sort_order` | INTEGER | Urutan dalam laporan |

---

## 🎨 UI/UX Notes

- Tampilan CoA menggunakan **tree view / hierarki** yang bisa expand/collapse
- Warna berbeda per account_type: 🟢 hijau = Asset, 🔴 merah = Liability, 🔵 biru = Equity, dll
- **Quick search** CoA by kode atau nama saat input jurnal (typeahead/autocomplete)
- **Import Excel CoA**: tampilkan preview sebelum konfirmasi import
- **CoA Validator** menampilkan checklist dengan ikon ✅ / ⚠️ / ❌
- Tombol **"Load Template"** untuk memilih template CoA standar saat setup baru

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Kode CoA harus unik per company |
| 2 | Header account (`is_header=true`) tidak bisa dipilih saat input jurnal |
| 3 | Inactive account tidak bisa dipilih di jurnal baru |
| 4 | Account type tidak bisa diubah jika sudah ada transaksi |
| 5 | Normal balance otomatis: DEBIT untuk Asset & Expense, CREDIT untuk Liability, Equity & Revenue |
| 6 | Cash flow category wajib diisi untuk semua akun (kecuali header) |

---

## 📦 Deliverables Checklist

- [ ] CRUD Group CoA dan Sub-Group CoA
- [ ] CRUD Chart of Accounts dengan semua atribut lengkap
- [ ] Tree view hierarki CoA
- [ ] Import CoA via Excel dengan validasi
- [ ] Template CoA standar (minimal 2 jenis bisnis)
- [ ] CoA Structure Validator dengan laporan hasil validasi
- [ ] Autocomplete search CoA untuk digunakan di form jurnal (Phase 3)
