# Development Database Diagnostic Scripts

Kumpulan skrip utilitas dan diagnostik ad-hoc untuk lingkungan pengembangan lokal (local development).

> [!WARNING]
> Skrip di folder ini ditujukan khusus untuk kebutuhan debugging dan verifikasi database lokal. Jangan dijalankan di lingkungan produksi tanpa pengawasan ketat.

## Daftar Skrip

| Skrip | Deskripsi |
|---|---|
| `check.js` | Memeriksa ringkasan jumlah baris tiap entitas (User, Event, Guest, Invitation, Attendance, Template, Media). |
| `count.js` | Menghitung total data tamu (`Guest`) dan status terkait. |
| `inspect-db.js` | Menginspeksi struktur dan koneksi database aktif. |
| `query.js` / `query2.js` | Skrip query pengujian relasi data. |
| `verify-checksum.js` | Verifikasi integritas checksum migrasi Prisma. |
| `version.js` | Memeriksa versi database server MySQL. |

## Cara Menjalankan

Dari direktori root `packages/database`:
```bash
node scripts/dev/check.js
```
Pastikan variabel lingkungan `DATABASE_URL` sudah terisi di `.env`.

