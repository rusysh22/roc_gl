# 🚀 PHASE 5: BUDGET MODULE

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun modul Budget lengkap dengan input spreadsheet-like, budget spreading otomatis, multiple version, approval workflow, dan import via Excel |
| **Estimasi** | 2–3 minggu |
| **Dependencies** | Phase 1 (Auth, Company, Period), Phase 2 (CoA), Phase 3 (Journal Entry — untuk actual data) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, shadcn/ui, ag-Grid / TanStack Table (editable), zod |

---

## 📝 Context & Background

Budget adalah alat perencanaan keuangan yang kritis. Dengan modul ini, perusahaan bisa menetapkan anggaran per CoA per periode, dan sistem akan otomatis membandingkan anggaran dengan realisasi di semua laporan keuangan.

---

## 📦 Tasks & Requirements

### 1. Budget Header

| # | Field | Detail |
|---|-------|--------|
| 1.1 | `budget_name` | Nama budget (misal: Annual Budget 2025, Revised Budget Q2 2025) |
| 1.2 | `fiscal_year` | Tahun anggaran |
| 1.3 | `company` & `branch` | Scope perusahaan |
| 1.4 | `version` | v1, v2, Revised, dll |
| 1.5 | `status` | DRAFT / SUBMITTED / APPROVED / LOCKED |
| 1.6 | `is_default` | Apakah ini budget aktif yang digunakan untuk comparison di laporan |
| 1.7 | `notes` | Catatan budget |
| 1.8 | `created_by`, `approved_by`, `approved_at` | Tracking user |

### 2. Budget Detail Input

Input anggaran per CoA per periode dalam tampilan spreadsheet.

| # | Task | Detail |
|---|------|--------|
| 2.1 | Layout | Baris = CoA, kolom = bulan (Jan–Des) + Total |
| 2.2 | Filter | Bisa filter per department, cost center, atau project |
| 2.3 | Editable grid | Input langsung di sel seperti Excel |
| 2.4 | Auto-sum | Per CoA per tahun dan per kolom bulan |
| 2.5 | CoA filter | Hanya CoA yang `is_budget_applicable = true` yang muncul |
| 2.6 | Granular input | Bisa input di level department atau cost center |

### 3. Budget Spreading Otomatis

User cukup input total tahunan, sistem distribusikan ke 12 bulan.

| Mode | Detail |
|------|--------|
| **Equal** | Bagi rata ke 12 bulan |
| **Weighted** | Distribusi berdasarkan bobot yang dikonfigurasi user (misal lebih besar di Q4) |
| **Copy Pattern** | Ikuti pola realisasi tahun sebelumnya |
| **Manual** | User input sendiri per bulan |

> Setelah spreading, user masih bisa adjust per sel.

### 4. Multiple Budget Version

| # | Task | Detail |
|---|------|--------|
| 4.1 | Versioning | Original Budget, Revised Budget Q1, Q2, dll |
| 4.2 | Default | Hanya satu versi berstatus `is_default = true` untuk comparison di laporan |
| 4.3 | Comparison | Perbandingan antar versi di Budget Analysis Report |
| 4.4 | Audit trail | Versi lama tetap tersimpan |

### 5. Copy from Prior Year

| # | Task | Detail |
|---|------|--------|
| 5.1 | Source | Pilih: realisasi tahun lalu atau budget tahun lalu |
| 5.2 | Adjustment | +/- persentase tertentu dari source |
| 5.3 | Scope | Bisa copy per CoA tertentu atau semua sekaligus |
| 5.4 | Output | Hasil copy menjadi draft yang bisa diedit |

### 6. Budget Approval Workflow

| # | Step | Detail |
|---|------|--------|
| 6.1 | Flow | DRAFT → SUBMITTED → APPROVED → LOCKED |
| 6.2 | Notifikasi | Notifikasi ke approver saat budget di-submit |
| 6.3 | Action | Approver bisa Approve atau Reject dengan komentar |
| 6.4 | Lock | Setelah LOCKED, budget tidak bisa diubah |
| 6.5 | Revisi | Buat versi baru berdasarkan yang sudah Locked |

### 7. Import Budget via Excel

| # | Task | Detail |
|---|------|--------|
| 7.1 | Download template | Template dari sistem |
| 7.2 | Pre-filled | Template berisi daftar CoA aktif yang budget-applicable |
| 7.3 | Input | User isi nominal per bulan di Excel |
| 7.4 | Upload | Sistem validasi dan preview sebelum import |
| 7.5 | Error report | Jika ada baris yang tidak valid |

### 8. Budget Alert

| # | Task | Detail |
|---|------|--------|
| 8.1 | Alert 80% | Alert saat realisasi mencapai 80% dari budget (configurable threshold) |
| 8.2 | Alert 100% | Alert saat realisasi melebihi 100% budget |
| 8.3 | Scope | Alert per CoA, per Department, atau per Cost Center |
| 8.4 | Channel | Notifikasi via in-app dan email ke Finance Manager & CFO |

---

## 🗄️ Database Schema

### Tabel: `budgets`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `fiscal_year_id` | UUID FK | Referensi ke fiscal_years |
| `budget_name` | VARCHAR(200) | Nama budget |
| `version` | VARCHAR(50) | Versi budget |
| `status` | VARCHAR(20) | DRAFT/SUBMITTED/APPROVED/LOCKED |
| `is_default` | BOOLEAN | Budget aktif untuk comparison |
| `notes` | TEXT | Catatan |
| `created_by` | UUID FK | User pembuat |
| `approved_by` | UUID FK nullable | User approver |
| `approved_at` | TIMESTAMP nullable | Waktu approval |

### Tabel: `budget_details`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `budget_id` | UUID FK | Referensi ke budgets |
| `company_id` | UUID FK | Referensi ke companies |
| `coa_id` | UUID FK | Referensi ke chart_of_accounts |
| `department_id` | UUID FK nullable | Referensi ke departments |
| `cost_center_id` | UUID FK nullable | Referensi ke cost_centers |
| `project_id` | UUID FK nullable | Referensi ke projects |
| `period_1` – `period_12` | DECIMAL(18,2) | Budget bulan Januari – Desember |
| `total_annual` | DECIMAL(18,2) | Total tahunan (auto-sum) |

---

## 🎨 UI/UX Notes

- Budget input menggunakan **editable grid/table** mirip spreadsheet (ag-Grid atau TanStack Table editable)
- Perubahan sel langsung tersimpan secara otomatis (**auto-save**)
- Total per baris dan total per kolom **update real-time**
- Tombol **"Spreading"** membuka modal pilih mode spreading
- Warna berbeda untuk: budget lebih tinggi dari tahun lalu (🟢 hijau), lebih rendah (🔴 merah)
- **Import Excel**: drag & drop dengan preview tabel sebelum konfirmasi

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Hanya CoA dengan `is_budget_applicable = true` yang bisa dianggarkan |
| 2 | Budget yang sudah LOCKED tidak bisa diedit — harus buat versi revisi baru |
| 3 | Hanya satu budget berstatus `is_default` per fiscal year per company |
| 4 | Budget detail tidak boleh memiliki nominal negatif |
| 5 | Copy from prior year hanya bisa dilakukan jika data source tersedia |

---

## 📦 Deliverables Checklist

- [ ] CRUD Budget Header (dengan versioning)
- [ ] Budget Detail Input — Spreadsheet-like editable grid
- [ ] Budget Spreading Otomatis (4 mode)
- [ ] Copy from Prior Year
- [ ] Budget Approval Workflow
- [ ] Import Budget via Excel
- [ ] Budget Alert System
- [ ] Budget vs Actual summary widget di dashboard
