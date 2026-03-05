# 04 — Master Data CRUD

## Overview

Semua master data mengikuti pola yang sama:
1. **API Route** untuk backend CRUD
2. **UI Page** untuk frontend dengan DataTable

## Daftar Master Data (Phase 1)

| Entitas | API Route | UI Page | Fitur |
|---------|-----------|---------|-------|
| Company | `/api/master/company` | `/master/company` | CRUD, search |
| Branch | `/api/master/branch` | `/master/branch` | CRUD, search, per-company |
| Fiscal Year | `/api/master/fiscal-year` | `/master/fiscal-year` | Create + auto 12 periods, open/close |
| Period | `/api/master/period` | `/master/period` | Open/Close toggle |
| Department | `/api/master/department` | `/master/department` | CRUD, hierarki parent-child |
| Cost Center | `/api/master/cost-center` | `/master/cost-center` | CRUD, link ke department, budget flag |
| Currency | `/api/master/currency` | `/master/currency` | Create, search (global) |
| Exchange Rate | `/api/master/exchange-rate` | `/master/exchange-rate` | Add rate per date (upsert) |
| Users | `/api/master/users` | `/master/users` | CRUD, role assignment, activate/deactivate |
| Roles | `/api/master/roles` | `/master/roles` | CRUD, permission matrix editor |

## API Endpoints Pattern

Setiap entitas memiliki 2 file API route:

```
src/app/api/master/<entity>/
├── route.ts          → GET (list) & POST (create)
└── [id]/route.ts     → PUT (update) & DELETE
```

### Request/Response Format

**GET** `/api/master/<entity>` → `200 OK` + `[]`
**POST** `/api/master/<entity>` → `201 Created` + `{}`
**PUT** `/api/master/<entity>/<id>` → `200 OK` + `{}`
**DELETE** `/api/master/<entity>/<id>` → `200 OK` + `{ success: true }`

### Error Responses

| Status | Arti |
|--------|------|
| `400` | Validation error |
| `401` | Unauthorized (belum login) |
| `403` | Forbidden (tidak punya akses) |
| `404` | Not found |
| `409` | Conflict (duplicate code/name) |
| `500` | Internal server error |

## Business Rules

| # | Rule | Implementasi |
|---|------|-------------|
| 1 | Email unik per company | Unique constraint `[companyId, email]` |
| 2 | Password min 8 char, uppercase, lowercase, angka | Validasi di API `POST /users` |
| 3 | Company code unik global | Unique constraint `code` |
| 4 | Fiscal year tidak overlap | Validasi overlap di API `POST /fiscal-year` |
| 5 | User tidak bisa dihapus | DELETE = deactivate (isActive=false) |
| 6 | Role tidak bisa dihapus jika ada user | Check user count sebelum delete |
| 7 | Department tidak bisa dihapus jika ada children | Check child count sebelum delete |
| 8 | Company tidak bisa dihapus jika ada users | Check user count sebelum delete |

## Cara Menambah Master Data Baru

1. Tambahkan model di `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name add_<nama_model>`
3. Buat API route di `src/app/api/master/<nama>/route.ts`
4. Buat API route detail di `src/app/api/master/<nama>/[id]/route.ts`
5. Buat UI page di `src/app/(dashboard)/master/<nama>/page.tsx`
6. Tambahkan link di `src/components/sidebar-nav.tsx`
