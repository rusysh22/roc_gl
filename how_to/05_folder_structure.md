# 05 — Folder Structure

## Root Structure

```
roc_gl/
├── prisma/                      # Database
│   ├── schema.prisma            # Prisma schema
│   ├── seed.ts                  # Seed script
│   └── migrations/              # Migration files
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx           # Root layout (Providers, font, metadata)
│   │   ├── login/               # Login page (public)
│   │   │   └── page.tsx
│   │   ├── (dashboard)/         # Dashboard route group (authenticated)
│   │   │   ├── layout.tsx       # Dashboard layout (sidebar + breadcrumbs)
│   │   │   ├── page.tsx         # Dashboard home (server component)
│   │   │   └── master/          # Master data pages
│   │   │       ├── company/page.tsx
│   │   │       ├── branch/page.tsx
│   │   │       ├── fiscal-year/page.tsx
│   │   │       ├── period/page.tsx
│   │   │       ├── department/page.tsx
│   │   │       ├── cost-center/page.tsx
│   │   │       ├── currency/page.tsx
│   │   │       ├── exchange-rate/page.tsx
│   │   │       ├── users/page.tsx
│   │   │       └── roles/page.tsx
│   │   └── api/                 # API routes
│   │       ├── auth/[...nextauth]/route.ts
│   │       └── master/
│   │           ├── company/     # route.ts + [id]/route.ts
│   │           ├── branch/
│   │           ├── fiscal-year/
│   │           ├── period/
│   │           ├── department/
│   │           ├── cost-center/
│   │           ├── currency/
│   │           ├── exchange-rate/
│   │           ├── users/
│   │           └── roles/
│   ├── components/              # Shared components
│   │   ├── ui/                  # shadcn/ui components (auto-generated)
│   │   ├── providers.tsx        # SessionProvider + Toaster
│   │   └── sidebar-nav.tsx      # Sidebar navigation
│   ├── lib/                     # Core utilities
│   │   ├── auth.ts              # NextAuth config
│   │   ├── prisma.ts            # Prisma client singleton
│   │   └── utils.ts             # cn() utility
│   ├── types/                   # TypeScript types
│   │   └── next-auth.d.ts       # Session type augmentation
│   └── middleware.ts            # Route protection
├── implementation_plans/         # Phase documentation
├── how_to/                      # How-to guides
├── .env                         # Environment variables
├── .env.example                 # Template
├── package.json
└── tsconfig.json
```

## Key Conventions

### Route Groups

- `(dashboard)` — route group untuk halaman authenticated (tidak mempengaruhi URL)
- `login` — halaman publik (tanpa sidebar/header)

### API Routes

Semua API berada di `src/app/api/` mengikuti pola:
```
/api/master/<entity>/          → GET list, POST create
/api/master/<entity>/[id]/     → GET single, PUT update, DELETE
```

### Components

- `src/components/ui/` — komponen shadcn/ui (jangan edit manual)
- `src/components/` — komponen kustom aplikasi

### Server vs Client Components

- Dashboard home (`page.tsx`) = **Server Component** (fetch data langsung dari Prisma)
- Master data pages = **Client Components** (`"use client"`, fetch via API)
- Login page = **Client Component** (form interaktif)

### Styling

- **Tailwind CSS 4** — utility-first
- **Dark theme** — background `#0a0e1a`, cards `#111827`
- **Accent** — blue-500 to indigo-600 gradient
- **shadcn/ui** — pre-built component library
