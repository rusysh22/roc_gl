# Panduan Deployment ke Vercel

Vercel adalah platform terbaik dan termudah untuk mendeploy aplikasi Next.js. Karena aplikasi ini menggunakan Next.js dengan Prisma, ada beberapa langkah tambahan yang perlu disiapkan, terutama terkait database (karena Vercel tidak bisa meng-host database SQL bawaan Anda).

Berikut adalah langkah-langkah lengkap persiapan dan deployment ke Vercel:

## 1. Persiapan Database (Cloud)
Karena Vercel adalah serverless environment, local SQLite atau database yang berjalan di server fisik tidak bisa digunakan. Anda butuh database PostgreSQL yang di-host di Cloud.
Beberapa opsi gratis/murah:
- **Supabase** (Sangat disarankan)
- **Neon Postgres**
- **Vercel Postgres** (Terintegrasi langsung)

**Cara mendapatkan URL Database (Contoh dengan Supabase):**
1. Buat akun dan project baru di [Supabase](https://supabase.com/).
2. Masuk ke **Settings > Database**.
3. Copy **Connection String (URI) / Transaction URL**, formatnya kira-kira: `postgresql://postgres.[xxx]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`.

## 2. Persiapan Git Repository
Kode proyek harus berada di repositori online (GitHub/GitLab/Bitbucket) agar Vercel bisa menarik kodenya.
1. Buat repositori baru di GitHub.
2. Push kode proyek saat ini ke GitHub:
   ```bash
   git add .
   git commit -m "Siap untuk Vercel"
   git branch -M main
   git remote add origin https://github.com/username-anda/nama-repo.git
   git push -u origin main
   ```

## 3. Proses Deployment di Vercel
1. Buka [Vercel](https://vercel.com/) dan login menggunakan akun GitHub Anda.
2. Klik tombol **"Add New..." > "Project"**.
3. Pilih repository GitHub proyek `roc_gl` yang baru saja Anda push, klik **Import**.
4. Di bagian **Configure Project**:
   - Biarkan **Framework Preset** sebagai `Next.js`.
   - Buka bagian **Environment Variables**, dan tambahkan:
     - **Name**: `DATABASE_URL` 
     - **Value**: *(Paste URL Database Cloud/Supabase Anda dari langkah 1)* 
     - **Name**: `AUTH_SECRET` 
     - **Value**: *(Buat kombinasi asal/secret key Anda, contoh: `kunci123kunci123kunci321`)* 
     - *(Tambahkan environment variable lain jika ada di file `.env` lokal Anda)*.
5. Klik **Deploy**.

## 4. Proses Migrasi & Seeding Awal di Cloud
Saat aplikasi berhasil di-deploy, database di Supabase/cloud Anda masih kosong. Anda perlu melakukan migrasi tabel dan memasukkan data admin pertama kali.
1. Di komputer lokal Anda, buka file `.env` sementara dan ganti `DATABASE_URL` menjadi URL database Cloud yang ada di Vercel.
2. Jalankan perintah migrasi:
   ```bash
   npx prisma migrate deploy
   ```
3. Jika Anda punya seed data awal (seperti Company default, Roles, Auth User), jalankan seed:
   ```bash
   npx prisma db seed
   ```
4. Setelah beres, kembalikan isi file `.env` lokal Anda menunjuk ke database lokal Anda lagi. 

## 5. Selamat! Aplikasi sudah Online
- Vercel akan memberikan domain otomatis (misalnya: `roc-gl.vercel.app`).
- Setiap kali Anda melakukan `git push` ke GitHub, Vercel secara otomatis mendeteksi perubahan dan melakukan re-deploy aplikasi secara live.

### *Catatan Tambahan untuk Vercel: Post-install Script*
Untuk memastikan bahwa Prisma Client otomatis di-generate ketika Vercel melakukan build, saya (Antigravity Assistant) sudah menambahkan script `"postinstall": "prisma generate"` di file `package.json` Anda. Jadi Anda tidak perlu khawatir aplikasi error *"Prisma Client not found"* di cloud.
