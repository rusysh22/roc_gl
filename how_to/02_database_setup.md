# 02 — Database Setup

## Prisma ORM

Project ini menggunakan **Prisma ORM v6** dengan PostgreSQL.

### File Utama

| File | Fungsi |
|------|--------|
| `prisma/schema.prisma` | Definisi schema database |
| `prisma/seed.ts` | Script untuk seed data awal |
| `src/lib/prisma.ts` | Singleton Prisma Client |

### Schema Models (Phase 1)

| Model | Tabel | Keterangan |
|-------|-------|------------|
| `Company` | `companies` | Multi-tenant root entity |
| `Branch` | `branches` | Cabang per company |
| `User` | `users` | User account |
| `Role` | `roles` | Custom role dengan permission JSON |
| `FiscalYear` | `fiscal_years` | Tahun buku |
| `Period` | `periods` | Periode akuntansi (12 per FY) |
| `Department` | `departments` | Departemen (hierarki) |
| `CostCenter` | `cost_centers` | Pusat biaya |
| `Currency` | `currencies` | Mata uang (global) |
| `CompanyCurrency` | `company_currencies` | Mata uang per company |
| `ExchangeRate` | `exchange_rates` | Kurs harian |
| `LoginHistory` | `login_histories` | Log login |

### Multi-Tenant Design

Semua tabel transaksi dan master data memiliki kolom `company_id` sebagai foreign key:

```
Company (tenant root)
├── Branch
├── User
├── Role
├── FiscalYear → Period
├── Department → CostCenter
├── CompanyCurrency
└── ExchangeRate
```

### Perintah Database

```bash
# Buat migration baru
npx prisma migrate dev --name <nama_migration>

# Reset database (hapus semua data)
npx prisma migrate reset

# Generate Prisma Client setelah ubah schema
npx prisma generate

# Buka Prisma Studio (GUI database)
npm run db:studio

# Seed data awal
npm run db:seed
```

### Data Seed Default

| Data | Detail |
|------|--------|
| **Currencies** | IDR, USD, EUR, SGD |
| **Company** | PT Demo Indonesia (code: DEMO) |
| **Branch** | Head Office (code: HQ) |
| **Super Admin** | admin@glroc.com / Admin@123 |
| **Roles** | Company Admin, Finance Manager, Accountant, Viewer |
| **Fiscal Year** | FY2025 (Jan-Dec 2025) + 12 periods |
| **Departments** | Finance, Operations, HR |
| **Cost Centers** | Finance Operations |
