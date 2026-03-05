# 01 — Project Setup

## Prerequisites

- **Node.js** v18+ (direkomendasikan v22+)
- **npm** v10+
- **PostgreSQL** v14+
- **Git**

## Langkah Instalasi

### 1. Clone Repository

```bash
git clone <repository-url> roc_gl
cd roc_gl
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env` di root project (copy dari `.env.example`):

```bash
cp .env.example .env
```

Edit `.env` sesuai konfigurasi lokal:

```env
# Database
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/gl_roc?schema=public"

# NextAuth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3019"
AUTH_SECRET="your-secret-key-here"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3019"
```

### 4. Setup Database

```bash
# Jalankan migration (otomatis create database jika belum ada)
npx prisma migrate dev

# Seed data awal (Super Admin, currencies, demo company)
npm run db:seed
```

### 5. Jalankan Development Server

```bash
npm run dev
```

Buka browser: **http://localhost:3019**

### 6. Login

Gunakan kredensial default:
- **Email**: `admin@glroc.com`
- **Password**: `Admin@123`

## Available Scripts

| Script | Perintah | Deskripsi |
|--------|----------|-----------|
| `npm run dev` | `next dev --port 3019` | Development server |
| `npm run build` | `next build` | Production build |
| `npm run start` | `next start --port 3019` | Production server |
| `npm run lint` | `eslint` | Lint check |
| `npm run db:generate` | `npx prisma generate` | Regenerate Prisma Client |
| `npm run db:migrate` | `npx prisma migrate dev` | Run migration |
| `npm run db:seed` | `npx tsx prisma/seed.ts` | Seed database |
| `npm run db:studio` | `npx prisma studio --port 5574` | Prisma Studio GUI |
