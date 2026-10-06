# Operasional IRVITE web

Keputusan produk 4 Oktober 2026: website saja, termasuk scanner staff di browser.

## Konfigurasi dan menjalankan

Target runtime deployment/CI: Node.js 24 (dependency scanner mensyaratkan >=24).

- API: root .env, DATABASE_URL, JWT_ACCESS_SECRET, JWT_ACCESS_EXPIRATION (default 12h), PORT (default 3000), MEDIA_STORAGE_PATH.
- Admin: apps/web-admin/.env.local atau environment hosting: INTERNAL_API_URL, WEB_ADMIN_ORIGIN, PUBLIC_INVITATION_URL, NEXT_PUBLIC_INVITATION_ORIGIN.
- Undangan: apps/web-invitation/.env.local atau environment hosting: INTERNAL_API_URL, NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN, NEXT_PUBLIC_WHATSAPP_NUMBER.
- Nilai NEXT_PUBLIC dibekukan saat build; build ulang setelah mengubah domain/contact.
- Jangan mengirim JWT secret atau database URL ke browser.

Jalankan dari root: npm ci, npm run generate --workspace packages/database, lalu npm run dev.
Admin di http://localhost:3001, undangan di http://localhost:3002, API di http://localhost:3000.
Production: npm run build, lalu jalankan tiga proses terpisah:

    npm run start:prod --workspace apps/api-server
    npm run start --workspace apps/web-admin
    npm run start --workspace apps/web-invitation

Gunakan HTTPS di reverse proxy, domain origin yang persis sesuai konfigurasi, dan restart policy.
API memiliki graceful shutdown. /health adalah liveness; /health/db mengembalikan JSON status koneksi DB (monitor harus memeriksa status body).

## Storage dan backup

Untuk deployment awal satu instance API, pasang disk persisten pada MEDIA_STORAGE_PATH absolut.
Jangan gunakan filesystem sementara/serverless untuk media. Backup MySQL dan disk media bersama, simpan salinan di luar server, dan uji restore sebelum launch.
Multi-instance API memerlukan shared persistent storage atau implementasi object storage; jangan scale horizontal dengan disk lokal yang berbeda.

## Kontrak API dan template

Endpoint bisnis mendukung /api/v1/...; URL lama tetap alias ke controller, guard, dan service yang sama.
Jangan mengaktifkan global prefix tambahan: itu akan menggandakan prefix auth/media.
Migrasikan konsumen lama secara bertahap; jangan mengubah /i/<uniqueCode> atau /e/<slug>.

Renderer hanya menerima { data, uniqueCode, mode: "PUBLIC" | "PERSONAL" }.
PUBLIC: tanpa identitas tamu, RSVP, atau QR. PERSONAL: gunakan data IRVITE, RSVP existing, dan QRDisplay pada level page.
Template hanya visual; tidak membuat API, persistence, QR generator, atau identitas sendiri.
Untuk template baru, selaraskan definition backend, renderer registry, catalog registry, demo fixture, asset preview, dan uji kedua mode.
Gunakan script templates:sync yang existing setelah review definisi; jangan memasukkan template standalone otomatis ke katalog production.

## Login dan scanner

Cookie HttpOnly mengikuti exp token API. Sesi habis mengharuskan login lagi.
Proxy hanya memeriksa kelayakan navigasi; JWT dan role tetap diverifikasi API, termasuk status user terkini.
Refresh token, self-service reset email, dan daftar pencabutan token bukan bagian kontrak saat ini.
Reset password staff melalui manajemen staff existing; logout menghapus cookie browser, bukan mencabut salinan bearer token.

Staff membuka event yang ditugaskan melalui web. Izinkan kamera. Gunakan HTTPS di HP:
alamat HTTP IP LAN bukan secure context. Input manual tetap tersedia ketika kamera gagal.
Uji kamera nyata di browser Android/iPhone sebelum acara; hasil unit test bukan bukti kamera fisik bekerja.

## Pemeriksaan sebelum launch

### Pemeriksaan layanan lokal tanpa login

Setelah MySQL, API, admin, dan web undangan aktif, jalankan `npm run test:smoke`
dari root. Tujuh pemeriksaan read-only mencakup kesehatan API/database, halaman
login/undangan, dan penolakan akses endpoint terlindungi tanpa sesi. Exit code
nonzero berarti ada pemeriksaan gagal; HTTP 200 dengan database status error
tetap gagal. Tidak ada credential dikirim, login, migrasi, atau perubahan data.

Port alternatif dapat diberikan lewat IRVITE_SMOKE_API_ORIGIN,
IRVITE_SMOKE_ADMIN_ORIGIN, dan IRVITE_SMOKE_INVITATION_ORIGIN. Hanya origin
HTTP(S) localhost/loopback diterima, tanpa path, query, atau credential.
Pemeriksaan ini bukan pengganti transaksi E2E, uji visual, maupun kamera fisik.

Jika koneksi localhost:3306 gagal, nyalakan MySQL existing terlebih dahulu;
jangan reset database project. Setelah aktif, ulangi smoke dan test:e2e:local.

Di dashboard admin buka /dashboard/system-check, lalu tekan Jalankan pengecekan.
Hasil diperiksa saat tombol ditekan: sesi/role API, kesehatan API, koneksi DB,
dan dukungan kamera browser. Halaman tidak menguji izin kamera atau transaksi
attendance nyata dan tidak mengklaim lulus UAT hanya karena layanan online.

1. npm run verify untuk unit/contract tests dan production build.
2. GitHub workflow verify.yml menjalankan migrasi dan E2E pada MySQL disposable, bukan database client.
3. Login sebagai admin dan staff; pastikan staff hanya melihat event assignment.
4. Buat event uji, impor tamu, buka PUBLIC/PERSONAL, RSVP, scan bertahap sampai maxPax, lalu coba scan ulang.
5. Uji foto/audio, ekspor guest dan attendance, arsip/restore, dan penolakan akses event milik admin lain.
6. Uji backup/restore, restart server tanpa kehilangan media, domain HTTPS, dan kontak WhatsApp asli.

Workflow berjalan pada push main, fix/**, dan PR. Keberhasilan lokal tidak menjamin
run GitHub berhasil; periksa tab Actions. Deployment, DNS, credential hosting,
dan verifikasi perangkat nyata tetap membutuhkan lingkungan operasional.

Dashboard menyediakan tombol Perbarui statistik: hitungan seluruh data sesuai
ownership, bukan polling/push real-time. Total acara/tamu/RSVP mencakup arsip;
acara mendatang mengecualikan arsip. Katalog hanya menghitung AVAILABLE.
Daftar acara memakai pagination dan filter server sehingga data setelah halaman
pertama tetap dapat diakses.

E2E database wajib memakai E2E_DATABASE_URL ke MySQL lokal disposable dengan
nama berakhiran _test. Setup menolak URL kosong, host remote, atau nama database
client. Terapkan migrasi ke database test tersebut terlebih dahulu. Jangan
mengganti URL development/client untuk menjalankan suite E2E.

Alternatif lokal: npm run test:e2e:local --workspace apps/api-server.
Script membutuhkan akun MySQL lokal yang boleh CREATE/DROP DATABASE; membuat
database sementara dengan nama unik, migrasi dan tes di sana, lalu menghapus
hanya database buatannya beserta media test sementara. Data project tetap utuh.

Dependency: Next.js diperbarui ke 16.3.8. Override uuid khusus exceljs ke 11.1.1
mempertahankan CommonJS/v4 yang digunakan ExcelJS dan menghindari versi rentan.
Jangan menjalankan npm audit fix --force: saran downgrade framework/export
dapat mematahkan fitur. Advisory development-only pada braces masih perlu
dipantau sampai upstream merilis perbaikan kompatibel.
