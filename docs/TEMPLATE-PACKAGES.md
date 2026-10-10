# Menambah template dari admin

Masuk sebagai SUPER_ADMIN, buka **Template → Tambah Template**.

1. Unduh contoh JSON, ubah `name` dan `themeCode` menjadi kode baru yang unik.
2. Atur empat warna hex, font, serta bagian dalam `config`. Font yang didukung: `INTER`, `PLAYFAIR_DISPLAY`, `LORA`, `MONTSERRAT`. Bagian `eventDetails` harus tetap aktif. ID dan urutan bagian tidak boleh duplikat.
3. Unggah JSON untuk desain tanpa aset. Untuk aset, gunakan ZIP dengan `manifest.json` langsung di akar ZIP.
4. Periksa preview, lalu **Simpan sebagai Draft**. Status awal `HIDDEN`.
5. Di katalog admin, **Preview & Edit** membuka kembali konfigurasi dan aset. Ubah status ke `AVAILABLE` untuk menampilkan di katalog publik dan mengizinkan pemilihan saat membuat event.
6. `ARCHIVED` menonaktifkan pemilihan baru. Penghapusan permanen hanya tersedia untuk arsip tanpa event terkait.

Alternatif tanpa menulis JSON: **Buat dari desain dasar**, masukkan nama/kode baru, pilih preset warna, atur font dan bagian, lalu simpan draft.

## Struktur ZIP

```text
manifest.json
assets/
  thumbnail.webp
  background.webp
  flower-left.png
  flower-right.png
  music.mp3
```

Tambahkan properti berikut pada contoh JSON yang diunduh:

```json
"assets": {
  "thumbnail": "assets/thumbnail.webp",
  "background": "assets/background.webp",
  "ornaments": ["assets/flower-left.png", "assets/flower-right.png"],
  "music": "assets/music.mp3"
}
```

`schemaVersion` harus `1`, `renderer` harus `GENERIC`. Kode template bawaan tidak boleh digunakan. Aset harus dideklarasikan; ZIP dengan file lain, HTML, CSS, JavaScript, SVG, atau path traversal ditolak. Path relatif memakai `/`.

Batas: JSON 64 KB; config 16 KB; ZIP/input 30 MB; total hasil ekstraksi 30 MB; gambar PNG/JPEG/WebP maksimal 5 MB/file; MP3 maksimal 10 MB; maksimal 8 ornamen, 1 background, 1 thumbnail, dan 1 musik. Jangan masukkan rahasia atau data tamu ke aset template: aset visual dilayani sebagai file publik dengan URL UUID.

## Batas desain dan integrasi

JSON mengatur renderer GENERIC yang sudah tersedia: warna, font, bagian, dan aset dekoratif. Ini **bukan** konverter otomatis website HTML/React menjadi template. Desain mandiri yang pernah dibuat di folder `tamplate codex` perlu diadaptasi menjadi renderer IRVITE bila tata letak dan animasinya harus dipertahankan persis. Unggah ZIP source project tidak didukung.

Data acara dan foto client diisi di editor event yang sudah ada. Media event memiliki prioritas atas foto/musik paket. Perubahan template berdampak pada semua event yang memakai template itu.

- PUBLIC `/e/<slug>` tidak menerima identitas tamu, RSVP, atau QR tamu.
- PERSONAL `/i/<uniqueCode>` memakai data dan RSVP existing IRVITE. QR tetap dikelola page-level `QRDisplay`, bukan importer/renderer.
- Preview memakai data contoh sementara dan tidak menyimpan RSVP/guest/attendance. Gift tetap mengikuti kebijakan MVP existing (dinonaktifkan); paket v1 tidak mengonfigurasi rekening gift.
- Tidak ada API, auth, scanner, uniqueCode, atau persistence tamu baru.

## Menjalankan lokal

Jalankan migrasi database lokal dan Prisma generate sesuai panduan operasi sebelum build. Admin berjalan di port 3001, undangan di 3002, API di 3000. Origin preview harus sesuai `NEXT_PUBLIC_INVITATION_ORIGIN` pada admin dan `NEXT_PUBLIC_TRUSTED_ADMIN_ORIGIN` pada undangan. Login diperlukan untuk halaman admin.

File aset disimpan melalui `MediaStorageService` dan lokasi `MEDIA_STORAGE_PATH` existing. Backup database **dan** direktori media bersama-sama. Jangan menghapus direktori media saat meng-upgrade aplikasi.
