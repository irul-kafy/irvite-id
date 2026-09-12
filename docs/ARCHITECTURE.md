# Architecture

Platform Undangan Digital ini menggunakan arsitektur **Client-Server** dalam format **Monorepo (Turborepo)**. Hal ini dilakukan untuk mempermudah berbagi code (seperti tipe TypeScript, package database, dan komponen UI) antara berbagai layanan.

## 1. High-Level Overview

- **Client Tier (Frontend)**:
  - **Web Admin Dashboard (Next.js)**: Untuk manajemen event, template, dan tamu.
  - **Web Digital Invitation (Next.js)**: Aplikasi untuk menampilkan halaman undangan secara personal kepada tamu.
  - **Mobile App Scanner (React Native/Expo)**: Aplikasi Android/iOS untuk Staff di lokasi acara melakukan scan QR Code tamu.
- **API Tier (Backend)**:
  - **API Server (NestJS)**: Bertanggung jawab atas business logic (Authentication, Event Management, Invitation/QR Generation, Check-in Attendance).
- **Data Tier (Database & Storage)**:
  - **MySQL**: Primary relational database, dikelola dengan ORM Prisma. Dioptimalkan dengan *index* pada *foreign keys* untuk skalabilitas tinggi.
  - **Cloud Object Storage (AWS S3 / Cloudflare R2)**: Menyimpan aset statis seperti foto galeri tamu, video, dan thumbnail template. Direferensikan melalui entitas `Media` di database.

## 2. Monorepo Structure

Pendekatan Monorepo memastikan seluruh bagian sistem sinkron:
- `apps/` berisi executable apps (Admin web, Invitation web, API, Mobile).
- `packages/` berisi dependencies internal. `packages/database` menampung `schema.prisma` yang digenerate menjadi client, sehingga Backend dan script internal lain dapat menggunakan tipe data database yang sama persis.

## 3. Alur Komunikasi (Dengan Dukungan Pax)

1. Admin menggunakan `Web Admin` untuk membuat acara (`Event`).
2. Admin mengunggah/mengisi data tamu beserta jatah orang (`Guest.maxPax`).
3. `Web Admin` mengirim data ke `API Server`.
4. `API Server` menyimpan ke MySQL dan men-generate record `Invitation` yang berisi `uniqueCode`.
5. Tamu mendapat URL spesifik.
6. `Web Invitation` mengakses URL, meminta data dan `Media` foto/video ke `API Server`, dan merender desain (serta QR Code) kepada Tamu.
7. Saat hari H, Tamu menunjukkan QR ke Staff.
8. Staff menggunakan `Mobile App` atau `Web Staff Dashboard` untuk memindai QR.
9. Scanner mengecek sisa `maxPax` dan menginput berapa orang yang datang.
10. Scanner mengirimkan `uniqueCode` dan `scannedPax` ke endpoint `API Server`.
11. `API Server` memvalidasi QR, menyimpan record `Attendance`, dan merespon status (Valid/Invalid/Duplicate).

## 4. Keamanan dan Autentikasi

- **Internal Authentication**: Menggunakan JWT Access Token untuk otentikasi internal (`User` seperti Admin/Staff) ke API.
- **Secure-By-Default API**: Seluruh endpoint API dilindungi secara global. Endpoint publik (seperti `/api/v1/auth/login`) dideklarasikan secara eksplisit menggunakan dekorator `@Public()`.
- **Role-Based Access Control (RBAC)**: Otorisasi operasional dibagi atas `SUPER_ADMIN`, `ADMIN`, dan `STAFF`.
- **Resource Authorization Boundary**: RBAC digunakan secara eksklusif untuk memvalidasi *jenis aksi* (misal: "Bolehkah role ini membuat Event?"). Namun, kepemilikan data spesifik ("Bolehkah ADMIN ini mengakses Event ID 5?") akan divalidasi terpisah di layer API Core melalui mekanisme otorisasi level entitas (Event Ownership).
- Public endpoint eksternal (seperti render template undangan) akan diamankan menggunakan Rate Limiting dan proteksi CORS (Cross-Origin Resource Sharing).
- Data sensitif dienkripsi selama perpindahan menggunakan HTTPS/TLS.
