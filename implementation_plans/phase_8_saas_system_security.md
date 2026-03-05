# 🚀 PHASE 8: SAAS SUBSCRIPTION, SYSTEM & SECURITY

## 📋 Overview

| Item | Detail |
|------|--------|
| **Objective** | Membangun modul SaaS Subscription & Billing, Notification Center, Data Import Center, Audit Trail, System Configuration, Security, Backup & Recovery, Help & Onboarding, REST API |
| **Estimasi** | 3–4 minggu |
| **Dependencies** | Phase 1–7 (seluruh core system) |
| **Tech Stack** | Next.js 14, Prisma, PostgreSQL, Redis, Swagger/OpenAPI, S3-compatible storage, SMTP |

---

## 📝 Context & Background

Phase terakhir ini melengkapi gl_roc sebagai produk SaaS yang siap dijual ke publik. Subscription management adalah tulang punggung bisnis SaaS. Security, backup, dan monitoring memastikan keandalan sistem untuk pelanggan korporat.

---

## 📦 Tasks & Requirements

### 1. Subscription & Billing Management

| # | Task | Detail |
|---|------|--------|
| 1.1 | Pricing Plans | Free (terbatas), Basic, Pro, Enterprise |
| 1.2 | Feature Flags | Setiap fitur bisa di-enable/disable per plan |
| 1.3 | Trial Period | 14 hari gratis untuk plan Pro/Enterprise |
| 1.4 | Tenant Onboarding | Wizard setup setelah registrasi (Company → CoA → User → Bank Account) |
| 1.5 | Invoice otomatis | Setiap bulan/tahun per tenant |
| 1.6 | Payment tracking | Status lunas/menunggak |
| 1.7 | Grace period | Suspend otomatis untuk tenant yang tidak bayar |
| 1.8 | Usage monitoring | Jumlah user aktif, jumlah jurnal, storage yang digunakan |

### 2. Notification Center

| # | Task | Detail |
|---|------|--------|
| 2.1 | In-app bell | Notification bell dengan unread counter |
| 2.2 | Events | Approval pending, journal posted, budget alert, period close reminder, bounced transaction |
| 2.3 | Email config | Configurable per user (bisa opt-out per jenis notifikasi) |
| 2.4 | Summary email | Weekly/monthly summary report via email (opsional) |
| 2.5 | History | Semua notifikasi tersimpan 90 hari |

### 3. Data Import Center

Satu halaman terpusat untuk semua kebutuhan import data.

| # | Import Type | Detail |
|---|-------------|--------|
| 3.1 | Import CoA | Dari Excel dengan template, validasi duplikat dan hierarki |
| 3.2 | Import Opening Balance | Saldo awal per CoA saat setup baru |
| 3.3 | Import Historical Journal | Jurnal masa lalu saat migrasi sistem |
| 3.4 | Import Budget | Dari Excel dengan template per fiscal year |
| 3.5 | Import Bank Statement | CSV/Excel/MT940 |
| 3.6 | Import Fixed Asset | Daftar aset tetap dari Excel |
| 3.7 | Import Vendor/Customer | Master data dari Excel |

> Semua import flow: **Preview → Validasi → Konfirmasi → Eksekusi → Error Report**

### 4. Audit Trail & Activity Log

| # | Task | Detail |
|---|------|--------|
| 4.1 | Auto-log | Setiap create, update, delete di semua tabel dicatat otomatis |
| 4.2 | Field tracking | Nilai sebelum dan sesudah perubahan |
| 4.3 | Informasi | User, timestamp, IP address, action, modul, record ID |
| 4.4 | View by User | Lihat semua aktivitas satu user dalam range waktu |
| 4.5 | View by Document | Lihat semua perubahan pada satu dokumen/jurnal |
| 4.6 | Export | Export audit trail ke Excel untuk audit eksternal |
| 4.7 | Retention | 5 tahun (configurable per company) |

### 5. System Configuration per Tenant

| # | Task | Detail |
|---|------|--------|
| 5.1 | Branding | Upload logo, set watermark teks pada laporan |
| 5.2 | Format angka | Separator ribuan dan desimal (`1.000.000,00` atau `1,000,000.00`) |
| 5.3 | Format tanggal | DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD |
| 5.4 | Journal number format | Prefix, format tahun, format bulan, nomor urut |
| 5.5 | Email settings | SMTP konfigurasi sendiri atau gunakan default |
| 5.6 | Timezone | Pilih timezone perusahaan |
| 5.7 | Bahasa default | Indonesia / English |

### 6. Security

Fitur keamanan enterprise-grade.

| # | Task | Detail |
|---|------|--------|
| 6.1 | 2FA (TOTP) | Via Google Authenticator / Authy |
| 6.2 | IP Whitelist | Batasi akses hanya dari IP tertentu per company |
| 6.3 | Login History | Catat semua percobaan login (berhasil dan gagal) |
| 6.4 | Password Policy | Complexity, expiry (90 hari), history (tidak bisa pakai 5 password terakhir) |
| 6.5 | Session Management | Force logout semua session aktif |
| 6.6 | Account lockout | 5× salah password → locked 30 menit |
| 6.7 | Sensitive action | Konfirmasi password untuk aksi kritis (delete, year-end closing) |

### 7. Backup & Recovery

| # | Task | Detail |
|---|------|--------|
| 7.1 | Auto backup | Harian ke storage eksternal (S3-compatible) |
| 7.2 | Manual backup | Trigger kapan saja on-demand |
| 7.3 | Per tenant | Setiap company bisa download backup data mereka sendiri |
| 7.4 | Restore | Super Admin bisa restore dari backup ke staging untuk verifikasi |
| 7.5 | Retention | 30 hari daily, 12 bulan monthly |
| 7.6 | Alert | Notifikasi jika backup gagal |

### 8. Help & Onboarding System

| # | Task | Detail |
|---|------|--------|
| 8.1 | Guided Tour | Wizard interaktif saat pertama login di setiap modul baru |
| 8.2 | Tooltip | Hover pada field → muncul penjelasan singkat |
| 8.3 | Knowledge Base | Artikel FAQ yang bisa dicari, terintegrasi di dalam aplikasi |
| 8.4 | Onboarding checklist | Daftar setup saat tenant baru (Company → CoA → Bank → User) |
| 8.5 | Video tutorial | Link per fitur (bisa di-manage oleh Super Admin) |

### 9. REST API

API publik untuk integrasi dengan sistem eksternal.

| # | Task | Detail |
|---|------|--------|
| 9.1 | Authentication | API Key per tenant |
| 9.2 | Endpoints | GET/POST Journal Entry, GET Reports (GL, Trial Balance), GET/POST Master Data |
| 9.3 | Rate limiting | Configurable per plan |
| 9.4 | Documentation | Swagger/OpenAPI auto-generated |
| 9.5 | Webhook | Notifikasi ke sistem eksternal saat ada event tertentu |
| 9.6 | Sandbox | Sandbox environment untuk testing integrasi |

---

## 🗄️ Database Schema

### Tabel: `subscriptions`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `plan` | VARCHAR(20) | free/basic/pro/enterprise |
| `status` | VARCHAR(20) | TRIAL/ACTIVE/SUSPENDED/CANCELLED |
| `trial_ends_at` | TIMESTAMP nullable | Akhir masa trial |
| `current_period_start` | DATE | Awal periode billing |
| `current_period_end` | DATE | Akhir periode billing |
| `max_users` | INTEGER | Batas jumlah user |
| `max_journals_per_month` | INTEGER | Batas jurnal per bulan |
| `storage_limit_gb` | DECIMAL(5,2) | Batas storage |

### Tabel: `audit_logs`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `user_id` | UUID FK | User yang melakukan aksi |
| `action` | VARCHAR(20) | CREATE/UPDATE/DELETE/VIEW |
| `module` | VARCHAR(50) | Nama modul |
| `record_id` | UUID | ID record yang diubah |
| `old_values` | JSONB nullable | Nilai sebelum perubahan |
| `new_values` | JSONB nullable | Nilai sesudah perubahan |
| `ip_address` | VARCHAR(50) | IP address user |
| `created_at` | TIMESTAMP | Waktu aksi |

### Tabel: `api_keys`

| Field | Type | Keterangan |
|-------|------|------------|
| `id` | UUID PK | Primary key |
| `company_id` | UUID FK | Referensi ke companies |
| `key_hash` | VARCHAR(500) | Hash dari API key |
| `name` | VARCHAR(100) | Nama/deskripsi key |
| `permissions` | JSONB | Array permission yang diizinkan |
| `last_used_at` | TIMESTAMP nullable | Terakhir digunakan |
| `expires_at` | TIMESTAMP nullable | Tanggal kadaluarsa |
| `is_active` | BOOLEAN | Status aktif |

---

## 🎨 UI/UX Notes

- **Onboarding wizard** menggunakan step-by-step progress indicator
- Subscription plan ditampilkan dengan **card comparison** yang jelas per fitur
- Security settings menggunakan **toggle** dengan konfirmasi untuk aksi sensitif
- Audit trail menggunakan **infinite scroll** atau virtual list untuk performa
- API documentation terintegrasi di dalam aplikasi (tidak butuh buka tab lain)
- Backup status ditampilkan di **dashboard Super Admin**

---

## ✅ Validation & Business Rules

| # | Rule |
|---|------|
| 1 | API Key tidak pernah disimpan plain text — hanya hash yang disimpan di database |
| 2 | Audit log tidak bisa dihapus oleh siapapun (immutable) |
| 3 | Backup harus diverifikasi checksumnya setelah selesai |
| 4 | Feature flags harus dicek di setiap API request berdasarkan subscription plan |
| 5 | Tenant yang expired/suspended tidak bisa login tapi datanya tetap tersimpan 90 hari |
| 6 | GDPR/data privacy: tenant bisa request export semua data mereka |

---

## 📦 Deliverables Checklist

- [ ] Subscription & Billing Management dengan feature flags
- [ ] Tenant Onboarding Wizard
- [ ] Notification Center (in-app + email)
- [ ] Data Import Center (semua jenis import)
- [ ] Audit Trail & Activity Log
- [ ] System Configuration per Tenant
- [ ] Security: 2FA, IP Whitelist, Login History, Password Policy
- [ ] Backup & Recovery (auto + manual)
- [ ] Help & Onboarding System dengan guided tour
- [ ] REST API dengan dokumentasi Swagger
- [ ] Performance Monitoring & Error Tracking
- [ ] Super Admin Dashboard (kelola semua tenant)
