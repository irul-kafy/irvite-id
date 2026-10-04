# Verifikasi perbaikan web — 4 Oktober 2026

## Hasil lokal

- API unit/contract: 478 tes lulus.
- Web admin: 274 tes lulus.
- Web invitation: 314 tes lulus.
- API E2E: 326 tes, 19 suite lulus, dengan MySQL sementara dan enam migrasi existing.
- Production build: API, web admin, dan web invitation berhasil.
- Lint frontend: tidak ada error; warning existing tersisa (unused code dan img).
- Lint terarah pada kode backend baru/storage: berhasil.
- npm audit --omit=dev: 0 vulnerability saat pemeriksaan.
- Audit seluruh dependency: 5 high pada rantai development-only braces/micromatch/fast-glob/Next lint; belum ada perbaikan kompatibel yang ditawarkan.
- HTTP smoke: login dan situs publik 200; /health berjalan; /health/db status ok;
  endpoint /api/system-check tanpa sesi mengembalikan 401.

Database sementara dan media test dihapus setelah E2E. Database project tidak
dimigrasikan atau di-reset. Pengujian lokal memakai Node 22.17.1; workflow CI
menargetkan Node 24 sesuai engine dependency scanner.

## Perubahan

Lanjutan pemeriksaan lokal: dashboard menghitung seluruh event/guest/RSVP di
backend dalam snapshot transaksi sesuai ownership. Tidak dibatasi 10 event atau
100 undangan. Template count/nama memakai katalog AVAILABLE, tanpa angka/nama
contoh. Acara terdekat tidak memasukkan arsip atau tanggal lampau. Kegagalan
layanan ditampilkan sebagai error dengan retry, bukan angka nol palsu.

Daftar acara mendukung pagination dan filter aktif/arsip dari backend; BFF hanya
meneruskan page, limit, filter. Regresi mencakup 11 event tambahan, 101 undangan,
page kedua, filter, isolasi dua admin, SUPER_ADMIN, serta penolakan STAFF/anonim.
Workflow kini dipicu juga pada push branch fix/** agar tidak bergantung pada
izin membuat PR. Hasil CI tetap harus dibaca terpisah dari hasil lokal.

Cookie login mengikuti expiry JWT; proxy navigasi menangani cookie expired.
Endpoint /api/v1 ditambahkan sebagai alias ke controller existing, menjaga URL
lama, otorisasi, dan business logic. Konfigurasi lokasi media dibaca sesudah
environment dimuat. Startup production memerlukan secret dan disk persisten
yang dikonfigurasi. Port start kedua web dipisahkan.

Dashboard /dashboard/system-check menyediakan pengecekan sesi, API, database,
dan dukungan kamera browser. API-nya memverifikasi role ADMIN/SUPER_ADMIN.
Scanner memberi petunjuk HTTPS dan fallback manual saat browser tak mendukung kamera.

Next.js naik ke 16.3.8, dependency rentan dengan patch kompatibel diperbarui,
uuid khusus ExcelJS dipasang ke 11.1.1. Test runner tsx dipin agar tidak
diunduh secara implisit ketika test dijalankan. Konfigurasi Next kosong ganda
dihapus; konfigurasi mjs existing dipertahankan.

Normalizer template kini bertipe unknown dan membatasi order numerik sehingga
Infinity/angka tak aman tidak membuat loop tanpa akhir.

Suite E2E dibenahi untuk database kosong: seed katalog explicit, window
rate-limit terpisah antar kasus, dan assertion media sesuai kontrak private.
Tes terpisah memastikan endpoint RSVP asli tetap menolak request ke-16.

## Batas verifikasi

Hasil ini bukan jaminan bebas bug atau bukti deployment production.
Belum diuji: kamera fisik Android/iPhone, beban acara nyata, domain HTTPS
production, backup/restore hosting, atau object storage S3/R2.
Refresh token, pencabutan bearer token, dan reset password via email belum
ditambahkan. Kontrak auth tetap memakai access token dan login ulang.
Status GitHub Actions harus diperiksa pada PR; hasil lokal tidak membuktikan CI.

Langkah operasional ada di WEB-OPERATIONS.md.
