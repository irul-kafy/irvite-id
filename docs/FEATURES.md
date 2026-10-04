# Features Requirements

Dokumen ini memuat kebutuhan awal, bukan checklist kelulusan. Status lokal diperbarui 4 Oktober 2026: modul inti sudah tersedia; lihat WEB-READINESS-VERIFICATION.md untuk bukti tes dan batas verifikasi.

## 1. Web Admin Dashboard (Untuk Role: SUPER_ADMIN & ADMIN)
- **Event Management**: Create, Read, Update, Delete (CRUD) detail acara.
- **Template Selection**: Memilih dan melihat *preview* template undangan untuk event.
- **Guest Management**: Import data tamu dari file Excel/CSV, input manual, dan edit detail tamu.
- **Invitation Delivery**: Link personal untuk dibagikan melalui kanal existing. Pengiriman otomatis Email/WhatsApp belum diimplementasikan dan memerlukan keputusan penyedia; tidak termasuk penyelesaian versi lokal.
- **Analytics**: Ringkasan RSVP menyeluruh sesuai kepemilikan acara, dapat diperbarui melalui tombol dashboard. Ini snapshot database, bukan push real-time. Laporan attendance tersedia pada event.

## 2. Web Staff Dashboard (Untuk Role: STAFF)
- **Manual Check-in**: Pencarian tamu berdasarkan nama jika tamu lupa/tidak membawa QR code.
- **Web-based QR Scanner**: Fitur fallback untuk scan QR menggunakan webcam laptop/tablet.
- **Real-time Attendance Status**: Melihat daftar siapa saja yang baru tiba.

## 3. Web Digital Invitation Personal (Untuk Guest)
- **Tampilan Dinamis & Responsif**: Berjalan mulus di perangkat Mobile dan Desktop.
- **Personalisasi**: Menyebutkan nama tamu yang diundang (Greeting: "Kepada Yth. Bapak Budi").
- **QR Code View**: Halaman menampilkan QR code khusus untuk tamu tersebut.
- **Media Galeri**: Penayangan foto/video *pre-wedding* atau dokumentasi acara.
- **RSVP Form**: Formulir bagi tamu untuk mengkonfirmasi kehadiran dan jumlah pendamping (pax).
- **Animasi & Interaktivitas**: Elemen memukau (*wow-factor*), transisi *smooth*, efek *glassmorphism*, atau *background music*.

## 4. Scanner web (tanpa aplikasi native)
- Berjalan di browser melalui kamera atau input manual, menggunakan API attendance existing.
- Validasi uniqueCode, assignment staff, maxPax, dan pencatatan check-in tetap di backend.
- Uji kamera perangkat nyata masih diperlukan; localhost/test otomatis bukan bukti kompatibilitas semua kamera.

## Batas versi lokal

Tidak melakukan deployment, pengiriman pesan berbayar, atau migrasi auth baru. Hosting, HTTPS domain, backup/restore hosting, object storage multi-instance, email reset, dan refresh/revocation token memerlukan tahap berikutnya. Tidak mengklaim fitur-fitur itu selesai.
