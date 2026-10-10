# Verifikasi perbaikan web — diperbarui 10 Oktober 2026

## Tambah Template admin — 10 Oktober 2026

- SUPER_ADMIN dapat mengimpor JSON/ZIP visual, memeriksa preview, menyimpan
  HIDDEN/Draft, mengedit konfigurasi, lalu mempublikasikan AVAILABLE ke katalog.
  ADMIN/STAFF tidak dapat mengimpor. Petunjuk: [TEMPLATE-PACKAGES.md](TEMPLATE-PACKAGES.md).
- JSON mengonfigurasi renderer GENERIC existing; bukan konverter otomatis
  source HTML/React atau pengganti renderer desain khusus.
- Aset memakai MediaStorageService existing. Dua migrasi penambahan aset
  template dan koreksi FK Restrict telah diterapkan ke MySQL lokal (8 migrasi
  total). Database project tidak di-reset; E2E memakai database disposable.
- QR page-level, RSVP, guest identity, URL personal, attendance, scanner, dan
  auth existing tetap digunakan. PUBLIC tidak memperoleh identitas/RSVP/QR.
- `npm run verify`: 485 tes API, 285 admin, 315 invitation, 4 smoke-unit lulus;
  production build ketiga aplikasi berhasil setelah patch dependency runtime.
- E2E MySQL: 329 tes dalam 20 suite lulus. Meliputi upload multipart nyata,
  RBAC, paket invalid, kode duplikat, Draft/Publish, katalog/demo publik,
  pengambilan aset, kontrak PUBLIC/PERSONAL, dan proteksi penghapusan.
- Total unit/contract/E2E: 1.418 tes. Setelah patch Handlebars development-only,
  485 tes API dijalankan ulang dan lulus; kompilasi template Handlebars juga lulus.
- Lint tidak memiliki error. Warning existing masih tersisa (backend 2,
  admin 8, invitation 6); tidak diklaim warning-free.
- `npm audit --omit=dev`: 0 vulnerability pada pemeriksaan ini. Patch
  kompatibel proxy-addr 2.0.8, sharp 0.35.5, source-map-js 1.2.2, dan
  Handlebars 4.7.10 diterapkan. Encode gambar Sharp juga diuji berhasil.
- Audit seluruh dependency masih melaporkan 25 temuan development-only
  (20 moderate, 5 high) pada rantai Jest/ts-jest dan ESLint/fast-glob.
  Saran npm mencakup downgrade major Jest/Next lint; tidak dijalankan secara
  paksa. Ini pekerjaan pemeliharaan tooling yang belum diselesaikan.
- API, admin, dan invitation diaktifkan kembali pada port 3000/3001/3002.
  Tujuh HTTP smoke read-only lulus, termasuk MySQL dan penolakan akses anonim.
- Katalog publik telah diperiksa di browser. Interaksi admin setelah login
  (impor/preview/edit/publish secara visual) masih menunggu login pengguna;
  hasil otomatis tidak menggantikan pemeriksaan tersebut. Kamera fisik dan
  deployment production juga belum diverifikasi.

Hasil lokal ini tidak membuktikan status GitHub Actions commit baru. Node lokal
masih 22.17.1; CI memakai Node 24 sesuai engine dependency scanner.

## Pemeriksaan ulang 6 Oktober 2026

- Unit/contract backend dan kedua frontend: 1.066 tes lulus.
- E2E MySQL disposable: 326 tes dalam 19 suite lulus setelah MySQL existing dinyalakan.
- Tiga production build berhasil (dua hasil build direuse dari cache Turborepo).
- Empat tes unit baru untuk pemeriksa layanan lokal lulus.
- `npm run test:smoke`: tujuh pemeriksaan runtime lulus, tanpa login atau perubahan data.
- Total tes otomatis unit/contract/E2E: 1.396, terpisah dari tujuh smoke runtime.
- GitHub Actions commit kode aplikasi d2f94f7 terkonfirmasi success:
  https://github.com/irul-kafy/irvite-id/actions/runs/37217595350

Percobaan E2E pertama hari ini tidak berjalan karena MySQL localhost:3306 belum
aktif; bukan hasil lulus. Pengguna menyalakan MySQL existing, lalu percobaan ulang
berhasil. Database project tidak di-reset atau dimigrasikan.
Pengguna memilih tes otomatis dulu; uji visual setelah login dan kamera fisik
masih belum dilakukan. Tidak ada klaim seluruh pekerjaan production selesai.

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

## Perbaikan UI admin — 7 Oktober 2026

- Ikon pencarian katalog sebelumnya tidak memiliki ukuran SVG intrinsik maupun
  batas CSS. Sekarang keduanya dibatasi 18 x 18 px.
- Navigasi dashboard, acara, dan katalog memiliki loading fallback. Pengambilan
  sesi/katalog berjalan paralel, dibatasi 15 detik, dibatalkan saat unmount, dan
  kegagalan API katalog ditampilkan sebagai error.
- Verifikasi patch: 276 tes admin lulus, production build admin berhasil,
  dan 7 pemeriksaan HTTP read-only lokal lulus termasuk koneksi database.
- Pengujian visual/interaksi admin setelah login masih menunggu sesi pengguna;
  tes sumber dan build tidak membuktikan pengalaman klik di browser.
- Tidak ada perubahan database, kontrak undangan, QR, RSVP, scanner, atau auth.
