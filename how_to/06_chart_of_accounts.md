# 06 — Chart of Accounts

## Overview

Modul Chart of Accounts (CoA) menyediakan struktur akun lengkap untuk sistem akuntansi gl_roc.

### Hierarki CoA

```
CoA Group          → Level tertinggi (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)
└── Account Header → Header/parent (tidak bisa diposting)
    └── Account    → Detail account (bisa diposting)
```

## File Terkait

### Database
| File | Fungsi |
|------|--------|
| `prisma/schema.prisma` | Model `CoaGroup` dan `ChartOfAccount` |

### API Routes

| Route | Method | Fungsi |
|-------|--------|--------|
| `/api/master/coa-group` | GET | List semua group per company |
| `/api/master/coa-group` | POST | Create group baru |
| `/api/master/coa-group/[id]` | PUT | Update group |
| `/api/master/coa-group/[id]` | DELETE | Hapus group (jika tidak ada akun) |
| `/api/master/coa` | GET | List akun (search, filter by group) |
| `/api/master/coa` | POST | Create akun baru (auto normal_balance) |
| `/api/master/coa/[id]` | PUT | Update akun |
| `/api/master/coa/[id]` | DELETE | Hapus akun (jika tidak ada sub-akun) |
| `/api/master/coa/search` | GET | Autocomplete search (untuk form jurnal) |
| `/api/master/coa/validate` | GET | Validasi struktur CoA |
| `/api/master/coa/template` | POST | Load template CoA standar |

### UI Pages
| Path | Fungsi |
|------|--------|
| `/master/coa-group` | Kelola group CoA |
| `/master/coa` | Tree view CoA, create/edit, template loader, validator |

## Atribut Akun

| Atribut | Tipe | Keterangan |
|---------|------|------------|
| `code` | String | Kode unik per company (e.g., 1-1001) |
| `name` | String | Nama Bahasa Indonesia |
| `nameEn` | String? | Nama Bahasa Inggris |
| `accountType` | Enum | ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE |
| `accountSubType` | String? | Current Asset, Fixed Asset, dll. |
| `normalBalance` | Enum | DEBIT / CREDIT (otomatis) |
| `cashFlowCategory` | Enum? | OPERATING, INVESTING, FINANCING, NON_CASH, NONE |
| `taxMappingCode` | String? | Kode pajak: PPN, PPh21, PPh23 |
| `psakTag` | String? | Kode PSAK/IFRS |
| `isBudgetApplicable` | Boolean | Bisa dianggarkan |
| `isIntercompany` | Boolean | Akun intercompany |
| `isHeader` | Boolean | Header = tidak bisa diposting |
| `isRetainedEarnings` | Boolean | Akun laba ditahan |

## Normal Balance (Otomatis)

| Account Type | Normal Balance |
|-------------|---------------|
| ASSET | DEBIT |
| EXPENSE | DEBIT |
| LIABILITY | CREDIT |
| EQUITY | CREDIT |
| REVENUE | CREDIT |

## Fitur

### 1. Load Template
Klik **Load Template** di halaman CoA untuk mengisi CoA standar Perusahaan Dagang:
- 5 Groups (Asset, Liability, Equity, Revenue, Expense)
- 40+ Accounts dengan hierarki lengkap
- Cash flow mapping tersedia
- Tax mapping untuk akun pajak
- Retained Earnings sudah di-set

> **Catatan:** Template hanya bisa di-load jika belum ada data CoA.

### 2. Validate
Klik **Validate** untuk mengecek kelengkapan CoA:
- ✅ Semua account type ada
- ✅ Tidak ada akun orphan
- ✅ Cash flow mapping lengkap
- ✅ Retained Earnings sudah di-set
- ✅ Tidak ada kode duplikat

### 3. Search / Autocomplete
API `/api/master/coa/search?q=kas` untuk pencarian akun di form jurnal.
Hanya menampilkan akun aktif yang bukan header.
