# 📘 GL ROC — Implementation Plans Overview

## Deskripsi Sistem

**gl_roc** (General Ledger Rusydani on Cloud) adalah aplikasi SaaS akuntansi berbasis web yang dirancang untuk semua jenis bisnis. Sistem ini menyediakan fitur General Ledger lengkap, mulai dari master data, journal entry, bank reconciliation, budget management, hingga laporan keuangan dan pajak yang komprehensif.

---

## Tech Stack

| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| Frontend | Next.js 14 + TypeScript | SSR, routing, fullstack |
| UI Library | shadcn/ui + Tailwind CSS | Komponen profesional |
| Backend | Next.js API Routes | Fullstack dalam 1 project |
| Database | PostgreSQL | ACID compliant, multi-tenant |
| ORM | Prisma | Type-safe, migration mudah |
| Auth | NextAuth.js / Auth.js | JWT + RBAC + 2FA |
| Hosting | VPS Ubuntu + Nginx + PM2 | Self-managed |
| Cache | Redis | Session & query cache |

---

## Prinsip Multi-Tenant

- Isolasi data menggunakan **Row-Level Security (RLS)** di PostgreSQL
- Setiap tenant (company) memiliki schema data yang terpisah secara logis
- Subscription plan mengontrol fitur yang dapat diakses per tenant
- Super Admin dapat manage semua tenant dari satu dashboard

---

## 🗺️ Roadmap Phase

| Phase | Nama | Fokus Utama | Estimasi | File |
|-------|------|-------------|----------|------|
| **Phase 1** | Foundation & Auth | Setup project, auth, multi-tenant, master data dasar | 3–4 minggu | [phase_1_foundation_auth_master_data.md](./phase_1_foundation_auth_master_data.md) |
| **Phase 2** | Chart of Accounts | Master CoA lengkap dengan semua atribut | 2–3 minggu | [phase_2_chart_of_accounts.md](./phase_2_chart_of_accounts.md) |
| **Phase 3** | Journal Entry | Input jurnal, validasi, approval workflow | 3–4 minggu | [phase_3_journal_entry.md](./phase_3_journal_entry.md) |
| **Phase 4** | Bank & Cash | Bank account, rekonsiliasi manual & auto | 3–4 minggu | [phase_4_bank_cash_management.md](./phase_4_bank_cash_management.md) |
| **Phase 5** | Budget Module | Input budget, spreading, versioning | 2–3 minggu | [phase_5_budget_module.md](./phase_5_budget_module.md) |
| **Phase 6** | Financial Reports | GL, Trial Balance, P&L, Balance Sheet, Cash Flow | 4–5 minggu | [phase_6_financial_reports.md](./phase_6_financial_reports.md) |
| **Phase 7** | Tax & Period-End | PPN, PPh, koreksi fiskal, depreciation, year-end closing | 2–3 minggu | [phase_7_tax_reports_period_end.md](./phase_7_tax_reports_period_end.md) |
| **Phase 8** | SaaS & System | Subscription, billing, notification, API, security | 3–4 minggu | [phase_8_saas_system_security.md](./phase_8_saas_system_security.md) |

**Total Estimasi: ~24–32 minggu (6–8 bulan)**

---

## 📁 Structure

```
implementation_plans/
├── README.md                               ← File ini (overview)
├── phase_1_foundation_auth_master_data.md   ← Foundation, Auth & Master Data
├── phase_2_chart_of_accounts.md             ← Chart of Accounts (CoA)
├── phase_3_journal_entry.md                 ← Journal Entry
├── phase_4_bank_cash_management.md          ← Bank & Cash Management
├── phase_5_budget_module.md                 ← Budget Module
├── phase_6_financial_reports.md             ← Financial Reports
├── phase_7_tax_reports_period_end.md        ← Tax Reports & Period-End Process
└── phase_8_saas_system_security.md          ← SaaS Subscription, System & Security
```

---

## 📋 Setiap File Berisi

Setiap implementation plan per-phase berisi section berikut:

1. **📋 Overview** — Objective, estimasi waktu, dependencies, tech stack
2. **📝 Context & Background** — Konteks dan latar belakang phase
3. **📦 Tasks & Requirements** — Detail tugas dengan tabel spesifikasi per komponen
4. **🗄️ Database Schema** — Struktur tabel lengkap dengan field, type, dan keterangan
5. **🎨 UI/UX Notes** — Panduan desain antarmuka
6. **✅ Validation & Business Rules** — Aturan validasi dan bisnis yang harus diterapkan
7. **📦 Deliverables Checklist** — Checklist deliverable per phase
