# Database Design & Roles

Dokumen ini menjelaskan struktur data, peran (role), dan hubungan antar entitas. Skema aktual diimplementasikan dengan **Prisma** di `packages/database/prisma/schema.prisma`.

## 1. Pengguna dan Peran (Role)

Terdapat 3 peran (Role) utama pengguna sistem:
1. **SUPER_ADMIN**: Akses penuh ke platform. Bisa mengelola semua event, melihat seluruh user, dan mengelola *Template* global sistem.
2. **ADMIN**: Pengguna umum (seperti Event Organizer atau individu). Bisa membuat Event, mengunggah daftar tamu, mengelola undangan acaranya, dan melihat analitik dari event miliknya sendiri.
3. **STAFF**: Petugas operasional di lapangan. Tugas utamanya hanya memindai QR Code pengunjung untuk acara tertentu dan melihat status kehadiran tamu saat hari-H.

## 2. Hubungan Antar Entitas & Pax Model

Sistem mendefinisikan alur: **User → Event → Guest → Invitation → QR → Attendance**

- **User (Admin)** memiliki relasi One-to-Many (1:N) dengan **Event**. Aturan penghapusan: **RESTRICT** (mencegah akun admin dihapus tak sengaja membawa seluruh acara).
- **Event** memiliki relasi One-to-Many (1:N) dengan **Guest**, **Invitation**, **Attendance**, dan **Media**. Aturan penghapusan: **CASCADE** (jika event dihapus, seluruh data operasionalnya ikut bersih).
- **Guest** yang diundang ke suatu event akan memiliki entitas **Invitation** (Relasi 1:1 antara Tamu dan Undangan). Aturan penghapusan: **CASCADE** (jika tamu dihapus, undangannya ikut terhapus).
- **Pax Model**: Sistem menggunakan pendekatan undangan rombongan (keluarga/pasangan). 
  - `Guest` memiliki `maxPax` (kuota tamu maksimal).
  - `Invitation` memiliki `rsvpPax` (berapa orang yang janji hadir).
  - `Attendance` mencatat `scannedPax` (berapa fisik orang yang datang saat tiket di-*scan*).
- **Invitation** memegang atribut `uniqueCode`. Atribut inilah yang diproses menjadi **QR Code** unik. (Satu keluarga = 1 QR = 1 Invitation).
- Ketika **QR Code** discan, sistem mencatat riwayat masuk ke tabel **Attendance**. Aturan penghapusan: **CASCADE** terhadap Invitation (jika undangan dihapus, riwayat kehadirannya ikut terhapus).

## 3. Entitas Database Utama

1. **`User`**: Menyimpan data akun pengelola (SUPER_ADMIN, ADMIN, STAFF).
2. **`Event`**: Menyimpan detail acara.
3. **`Template`**: Menyimpan definisi desain berbasis konfigurasi (tidak menyimpan raw HTML/CSS, melainkan `themeCode` dan `config` JSON).
4. **`Guest`**: Menyimpan data identitas tamu (Nama, Email, No HP, `customGreeting`, dan `maxPax`).
5. **`Invitation`**: Menyambungkan `Guest` dan `Event`. Menyimpan `uniqueCode`, `status` RSVP, dan `rsvpPax`.
6. **`Attendance`**: Tabel log transaksi. Merekam waktu tamu check-in, staf yang memindai (`scannedById`), waktu (`scannedAt`), dan jumlah orang yang dibawa (`scannedPax`).
7. **`Media`**: Entitas terpisah untuk skalabilitas tinggi. Menyimpan metadata foto, video, atau audio yang dilampirkan ke sebuah `Event`, beserta atribut `order` untuk kebutuhan galeri.

## 4. Indexing & Optimization

Indeks database (`@@index`) dibuat pada field-field relasi yang sering dipanggil:
- `Event`: `userId`
- `Guest`: `eventId`
- `Invitation`: `eventId` (kolom `uniqueCode` dan `guestId` sudah diindeks otomatis via `@unique`)
- `Attendance`: `invitationId`, `eventId`, `scannedById`
- `Media`: `eventId`
