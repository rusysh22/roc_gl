# 03 — Authentication & Authorization

## Overview

Sistem autentikasi menggunakan **NextAuth.js v5 (Auth.js)** dengan strategi JWT.

### File Terkait

| File | Fungsi |
|------|--------|
| `src/lib/auth.ts` | Konfigurasi NextAuth (Credentials provider) |
| `src/middleware.ts` | Route protection middleware |
| `src/types/next-auth.d.ts` | Type augmentation untuk session |
| `src/app/api/auth/[...nextauth]/route.ts` | API route handler |
| `src/components/providers.tsx` | SessionProvider wrapper |

## Login Flow

1. User buka `/login` → tampil form email + password
2. Submit → NextAuth `Credentials` provider
3. Server: cari user di database, validasi password dengan **bcrypt**
4. Jika valid → buat JWT token dengan data: `userId`, `companyId`, `companyName`, `systemRole`, `roleId`
5. Redirect ke dashboard (`/`)
6. Catat login di tabel `login_histories`

## Session Data

Setiap request yang terautentikasi memiliki session berisi:

```typescript
{
  user: {
    id: string;          // UUID user
    name: string;        // Nama lengkap
    email: string;       // Email
    companyId: string;   // UUID company (tenant)
    companyName: string; // Nama company
    systemRole: string;  // SUPER_ADMIN | COMPANY_ADMIN | FINANCE_MANAGER | ACCOUNTANT | VIEWER
    roleId: string;      // UUID custom role (nullable)
  }
}
```

## System Roles (RBAC)

| Role | Akses | Keterangan |
|------|-------|------------|
| `SUPER_ADMIN` | Full access semua tenant | System administrator |
| `COMPANY_ADMIN` | Full access 1 company | Admin perusahaan |
| `FINANCE_MANAGER` | Journal, budget, reports | Manajer keuangan |
| `ACCOUNTANT` | Input journal, view reports | Akuntan |
| `VIEWER` | Read-only | Hanya lihat |

## Custom Roles

Selain system roles, setiap company bisa membuat **custom roles** dengan permission matrix:

```
Format: module.action
Contoh: journal.create, report.view, budget.approve
```

## Route Protection

Middleware di `src/middleware.ts` melindungi semua route kecuali:
- `/login` — login page
- `/api/auth/*` — NextAuth API routes
- Static files (`/_next/*`, `favicon.ico`)

Jika user belum login, akan di-redirect ke `/login`.

## API Authentication

Setiap API route harus memvalidasi session:

```typescript
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const companyId = (session.user as any).companyId;
  // Query data scoped to companyId...
}
```
