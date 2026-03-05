# 07 — Journal Entry

## Overview

Modul **Journal Entry** adalah tempat utama untuk mencatat transaksi akuntansi secara langsung atau melakukan penyesuaian. Sistem menjamin bahwa setiap jurnal harus seimbang (balanced) sebelum dapat diposting ke buku besar.

### Jenis Jurnal

| Kode | Jenis | Keterangan |
|------|-------|------------|
| **GJ** | General Journal | Jurnal umum (input manual) |
| **AJ** | Adjusting Journal | Jurnal penyesuaian akhir periode |
| **RJ** | Reversing Journal | Jurnal pembalik otomatis |
| **IC** | Intercompany | Jurnal antar perusahaan |

## File Terkait

### Database
| File | Fungsi |
|------|--------|
| `prisma/schema.prisma` | Model `Journal`, `JournalLine`, `JournalApproval` |

### API Routes

| Route | Method | Fungsi |
|-------|--------|--------|
| `/api/journal` | GET | List journal dengan filter & search |
| `/api/journal` | POST | Buat draft journal baru |
| `/api/journal/[id]` | GET | Ambil detail journal + lines |
| `/api/journal/[id]` | PUT | Update draft journal |
| `/api/journal/[id]` | DELETE | Hapus draft journal |
| `/api/journal/[id]/post` | POST | Validasi dan ubah status ke POSTED |
| `/api/journal/[id]/reverse` | POST | Buat jurnal pembalik (RJ) dari jurnal POSTED |

### UI Pages
| Path | Fungsi |
|------|--------|
| `/journal` | Halaman daftar jurnal, filter, pencarian |
| `/journal/[id]` | Form transaksi untuk create, edit, view, post, reverse |

## Validasi & Business Rules

Sebelum jurnal dapat di-POST, sistem melakukan validasi berikut:
1. **Balance Check**: Total Debit dalam base currency harus sama persis dengan Total Credit.
2. **Minimal Baris**: Jurnal minimal memiliki 2 baris.
3. **Valid CoA**: Akun yang dipilih harus aktif dan tidak boleh "Header Account".
4. **Open Period**: Tanggal posting (Posting Date) harus jatuh pada Period yang berstatus **OPEN**.
5. **Non-Zero Lines**: Tidak boleh ada baris jurnal di mana debit dan kredit keduanya 0.

## Fitur Form Jurnal

### Autocomplete Chart of Accounts
Saat mengetik nomor akun atau nama akun di tabel baris jurnal, sistem memanggil API `/api/master/coa/search` secara asinkron untuk mencari akun yang cocok untuk meminimalkan salah ketik.

### Multi-Currency
Pilih mata uang di Header jurnal. Jika bukan `IDR` (base currency default), silakan isi **Exchange Rate**. Sistem otomatis menghitung `debitBase` dan `creditBase` pada baris jurnal di belakang layar.

### Reversal (Jurnal Pembalik)
Jika jurnal sudah `POSTED` dan terdapat kesalahan, jurnal tidak dapat di-edit atau di-delete. Anda dapat menggunakan tombol **Reverse**. Ini akan:
1. Mengubah status jurnal lama menjadi `REVERSED`.
2. Membuat jurnal baru (jenis `RJ`) berstatus `DRAFT` dengan nilai debet-kredit yang **dibalik** dari jurnal asal.
3. Anda dapat me-review (menyimpan draft) dan lalu memposting jurnal pembalik tersebut di periode yang sesuai.

## Cara Penggunaan

1. Buka menu **Transactions > Journal Entries**.
2. Klik tombol **New Journal**.
3. Isi Header: Journal Type, Journal Date, Posting Date, Currency.
4. Di bagian **Journal Lines**, klik input kosong di kolom **Account** dan cari nama akun, lalu klik hasil dari dropdown.
5. Masukkan memo di description dan nominal di Debit atau Credit.
6. Berkas dipastikan **Balanced** (indikator hijau di pojok kanan bawah).
7. Klik **Save Draft**.
8. Klik **Post Journal** untuk menyelesaikan. Jurnal sekarang final dan saldo CoA telah diperbarui.
