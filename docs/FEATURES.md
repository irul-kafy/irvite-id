# Features Requirements

Dokumen ini merangkum kebutuhan fitur (requirements) sistem. **(Penting: Implementasi fitur ini dilakukan pada fase pengembangan selanjutnya, BUKAN pada fase pondasi saat ini).**

## 1. Web Admin Dashboard (Untuk Role: SUPER_ADMIN & ADMIN)
- **Event Management**: Create, Read, Update, Delete (CRUD) detail acara.
- **Template Selection**: Memilih dan melihat *preview* template undangan untuk event.
- **Guest Management**: Import data tamu dari file Excel/CSV, input manual, dan edit detail tamu.
- **Invitation Delivery**: Trigger pengiriman undangan secara otomatis (via Email/WhatsApp) atau generate link manual untuk dibagikan (WhatsApp Blast).
- **Real-time Analytics**: Dashboard visual (grafik) untuk RSVP (Yes/No/Pending) dan kehadiran hari-H.

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

## 4. Mobile App (APK Android/iOS) Scanner
- **Fast Scanning**: Menggunakan native kamera perangkat genggam dengan efisiensi tinggi (ZXing / Expo Camera).
- **Check-in Validation**: Menampilkan pesan instan (*Valid/Invalid/Already Scanned*).
- **Data Sync**: Mengirim data check-in langsung ke database pusat melalui REST API.
