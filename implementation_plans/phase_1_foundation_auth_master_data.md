# 🚀 PHASE 1: FOUNDATION, AUTH & MASTER DATA DASAR

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Setup project Next.js fullstack, sistem autentikasi multi-tenant, dan master data dasar |
| **Estimasi** | 3–4 minggu |
| **Dependencies** | Tidak ada (phase pertama) |
| **Tech Stack** | Next.js 14 + TypeScript, Prisma ORM, PostgreSQL, NextAuth.js, shadcn/ui, Tailwind CSS |

---

## 🎯 Objectives

Setup project Next.js fullstack, sistem autentikasi multi-tenant, dan master data dasar (Company, Branch, Fiscal Year, Department, Cost Center, Currency, User & Role).

---

## 📝 Context & Background

Phase ini adalah fondasi seluruh sistem. Semua phase berikutnya bergantung pada struktur multi-tenant, autentikasi, dan master data yang dibangun di sini. Pastikan setiap keputusan arsitektur di phase ini sudah tepat sebelum melanjutkan.

---

## 📦 Tasks & Requirements

### 1. Project Setup

Inisialisasi project Next.js 14 dengan TypeScript, Prisma ORM, PostgreSQL, dan konfigurasi dasar.

| # | Task | Detail |
|---|------|--------|
| 1.1 | Inisialisasi project | `npx create-next-app@latest gl-roc --typescript --tailwind --app` |
| 1.2 | Install dependencies | `prisma`, `@prisma/client`, `next-auth`, `shadcn/ui`, `zod`, `react-hook-form` |
| 1.3 | Setup folder structure | `/app`, `/components`, `/lib`, `/prisma`, `/types` |
| 1.4 | Environment variables | `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` |
| 1.5 | Prisma schema awal | Setup multi-tenant base model |

### 2. Multi-Tenant Architecture

Setiap perusahaan (tenant) adalah entitas terpisah. Semua tabel transaksi dan master data harus memiliki `companyId` sebagai foreign key wajib.

| # | Task | Detail |
|---|------|--------|
| 2.1 | Row-Level Security (RLS) | Implementasi RLS di PostgreSQL untuk isolasi data |
| 2.2 | API validation | Setiap request API wajib memvalidasi `companyId` dari session user |
| 2.3 | Super Admin access | Super Admin memiliki akses lintas tenant untuk management |
| 2.4 | Middleware injection | Tenant ID harus selalu di-inject via middleware, bukan dari client |

### 3. Autentikasi & Otorisasi

Sistem login berbasis email/password dengan JWT. Role-based access control (RBAC) per company.

| # | Task | Detail |
|---|------|--------|
| 3.1 | Roles setup | `SUPER_ADMIN`, `COMPANY_ADMIN`, `FINANCE_MANAGER`, `ACCOUNTANT`, `VIEWER` |
| 3.2 | Permission matrix | Setiap role memiliki permission matrix yang dapat dikonfigurasi |
| 3.3 | 2FA (TOTP) | Implementasi Two-Factor Authentication menggunakan TOTP |
| 3.4 | Session management | Refresh token otomatis |
| 3.5 | Login history | Catat IP, device, timestamp setiap login |
| 3.6 | Password policy | Minimal 8 karakter, kombinasi huruf + angka + simbol |
| 3.7 | IP Whitelist | Per company (opsional, bisa diaktifkan di settings) |

### 4. Master Data: Company & Branch

| # | Task | Detail |
|---|------|--------|
| 4.1 | Company CRUD | Nama, kode, NPWP, alamat, logo, mata uang default, timezone, bahasa |
| 4.2 | Branch CRUD | Nama, kode, alamat, company reference, `is_active` |
| 4.3 | Relasi | Satu company bisa memiliki banyak branch |
| 4.4 | Filter laporan | Laporan bisa di-filter per branch atau konsolidasi semua branch |

### 5. Master Data: Fiscal Year & Period

| # | Task | Detail |
|---|------|--------|
| 5.1 | Fiscal Year CRUD | Nama, start date, end date, status (Open/Closed) |
| 5.2 | Period management | Bulan 1–12, fiscal year reference, status (Open/Closed/Locked) |
| 5.3 | Posting restriction | Tidak boleh ada posting ke period yang Closed kecuali dengan override permission |
| 5.4 | Period Close | Hanya bisa dilakukan setelah Period-End Checklist selesai |

### 6. Master Data: Department & Cost Center

| # | Task | Detail |
|---|------|--------|
| 6.1 | Department CRUD | Kode, nama, parent department (hierarki), company, branch, `is_active` |
| 6.2 | Cost Center CRUD | Kode, nama, department reference, `budget_applicable`, `is_active` |
| 6.3 | Cross-department | Cost Center bisa lintas department jika diperlukan |

### 7. Master Data: Currency & Exchange Rate

| # | Task | Detail |
|---|------|--------|
| 7.1 | Currency CRUD | Kode ISO (IDR, USD, SGD, EUR, dll), nama, simbol, decimal places |
| 7.2 | Exchange Rate CRUD | Currency, date, rate terhadap base currency, source (manual/auto) |
| 7.3 | Date-specific rate | Sistem mengambil rate berdasarkan tanggal transaksi |
| 7.4 | Fallback rate | Jika rate tidak ada untuk tanggal tertentu, gunakan rate terdekat sebelumnya |

### 8. Master Data: User & Role Management

| # | Task | Detail |
|---|------|--------|
| 8.1 | User CRUD | Nama, email, password (hashed bcrypt), role, company, `is_active`, `last_login` |
| 8.2 | Role CRUD | Nama, deskripsi, permission list (JSON) |
| 8.3 | Permission format | `module.action` format — contoh: `journal.create`, `report.view`, `budget.approve` |
| 8.4 | User company scope | Satu user hanya aktif di satu company (atau multi jika di-invite) |

---

## 🗄️ Database Schema

### Tabel: `companies`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `code` | VARCHAR(20) | Kode unik perusahaan |
| `name` | VARCHAR(200) | Nama perusahaan |
| `npwp` | VARCHAR(30) | NPWP perusahaan |
| `address` | TEXT | Alamat lengkap |
| `logo_url` | VARCHAR(500) | URL logo |
| `base_currency` | VARCHAR(3) | Mata uang dasar (IDR) |
| `timezone` | VARCHAR(50) | Asia/Jakarta |
| `language` | VARCHAR(10) | id / en |
| `subscription_plan` | VARCHAR(20) | free/basic/pro/enterprise |
| `is_active` | BOOLEAN | Status aktif |
| `created_at` | TIMESTAMP | Waktu dibuat |

### Tabel: `users`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `email` | VARCHAR(200) | Email unik per company |
| `password_hash` | VARCHAR(500) | Bcrypt hash |
| `name` | VARCHAR(200) | Nama lengkap |
| `role` | VARCHAR(50) | COMPANY_ADMIN / ACCOUNTANT / dll |
| `is_active` | BOOLEAN | Status aktif |
| `last_login_at` | TIMESTAMP | Waktu login terakhir |
| `two_fa_enabled` | BOOLEAN | Status 2FA |
| `two_fa_secret` | VARCHAR(200) | TOTP secret (encrypted) |

### Tabel: `fiscal_years`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `name` | VARCHAR(100) | Contoh: FY2025 |
| `start_date` | DATE | Awal tahun buku |
| `end_date` | DATE | Akhir tahun buku |
| `status` | VARCHAR(20) | OPEN / CLOSED |

### Tabel: `periods`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `fiscal_year_id` | UUID FK | Referensi ke fiscal_years |
| `company_id` | UUID FK | Referensi ke companies |
| `period_number` | INTEGER | 1–12 |
| `start_date` | DATE | Awal periode |
| `end_date` | DATE | Akhir periode |
| `status` | VARCHAR(20) | OPEN / CLOSED / LOCKED |

---

## 🎨 UI/UX Notes

- Semua form menggunakan `react-hook-form` + `zod` validation
- **Login page**: desain clean, logo gl_roc di tengah, field email & password, tombol login biru navy
- Setelah login, redirect ke dashboard utama menampilkan company name dan fiscal year aktif
- Master data menggunakan **DataTable** dengan fitur search, filter, sort, dan pagination
- Setiap form master data memiliki tombol **Save**, **Cancel**, dan (jika edit) **Delete** dengan konfirmasi
- **Toast notification** untuk setiap aksi berhasil/gagal
- **Breadcrumb** navigasi di setiap halaman
- **Sidebar** navigasi dengan collapse/expand per modul

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | Email harus unik per company (bukan global unik) |
| 2 | Password minimal 8 karakter, wajib kombinasi huruf besar, kecil, angka |
| 3 | Company code harus unik secara global di sistem |
| 4 | Fiscal year tidak boleh overlap untuk satu company |
| 5 | Period hanya bisa di-close jika semua journal di periode tersebut sudah berstatus Posted |
| 6 | User tidak bisa dihapus jika sudah membuat transaksi — hanya bisa di-deactivate |
| 7 | Currency base company tidak bisa diubah setelah ada transaksi |

---

## 📦 Deliverables Checklist

- [ ] Project Next.js 14 berjalan di local development
- [ ] Skema database Prisma lengkap untuk semua tabel Phase 1
- [ ] Halaman Login dengan autentikasi JWT berfungsi
- [ ] CRUD Master Data: Company, Branch, Fiscal Year, Period, Department, Cost Center, Currency, Exchange Rate, User, Role
- [ ] Middleware autentikasi dan otorisasi per route
- [ ] Dashboard awal setelah login dengan info company & fiscal year aktif
- [ ] Semua tabel menggunakan DataTable dengan search & pagination
