# Aturan Agent untuk Digital Invitation Platform

## Tujuan Project
Membangun sistem Undangan Digital yang scalable, di mana satu template dapat digunakan untuk banyak event, dan setiap tamu memiliki halaman undangan personal dengan QR Code unik. Platform ini mencakup dashboard admin, dashboard staff, website undangan, serta aplikasi mobile untuk scanning QR.

## Aturan AI Agent (CRITICAL)
- Agent **DILARANG** mengubah arsitektur utama (Monorepo, Next.js, NestJS, React Native, Prisma) tanpa persetujuan eksplisit dari Lead Engineer / User.
- Jika ada kebingungan atau ketidakjelasan keputusan teknis, dokumentasikan sebagai `TODO` atau `DECISION` dan tanyakan kepada User. DILARANG menebak sembarangan.
- Agent tidak boleh menghapus file existing tanpa alasan yang jelas.
- Jangan mengganti tech stack tanpa menjelaskan alasannya dan mendapat persetujuan.

## Aturan Coding
- Gunakan **TypeScript** secara ketat (Strict Mode) di seluruh ekosistem (Frontend, Backend, Mobile).
- Gunakan modern JavaScript ES6+ (arrow functions, destructuring, dll).
- Dilarang meninggalkan `console.log` di production code.
- Prioritaskan clean code, modularitas, reusability, dan mobile responsiveness.

## Aturan Struktur Folder
- Project ini menggunakan struktur **Turborepo (Monorepo)**.
  - `apps/web-admin`: Dashboard admin & staff (Next.js).
  - `apps/web-invitation`: Halaman publik undangan (Next.js).
  - `apps/api-server`: Backend services (NestJS).
  - `apps/mobile-scanner`: Aplikasi Android (React Native/Expo).
  - `packages/database`: Prisma schema dan koneksi DB.
  - `packages/ui`: Shared UI components.
- Agent tidak boleh membuat root direktori baru di luar struktur monorepo tanpa izin.

## Aturan Database
- Dilarang membuat **database production** dalam fase development.
- Operasi migrasi (seperti `prisma migrate dev`) hanya boleh dijalankan di environment lokal/development.
- Dilarang membuat data dummy permanen (hardcoded) yang dapat bocor atau mengganggu database production. Gunakan script *seeders* terpisah untuk data dummy.
- Prisma merupakan satu-satunya ORM yang digunakan untuk interaksi database.
- **Referential Integrity**: Gunakan `onDelete: Cascade` dengan sangat berhati-hati. Hanya gunakan Cascade dari hierarki `Event` ke entitas turunannya (`Guest`, `Invitation`, `Attendance`, `Media`), dari `Guest` ke `Invitation`, dan dari `Invitation` ke `Attendance` jika entitas induknya dihapus. Sebaliknya, gunakan `onDelete: Restrict` untuk referensi *top-level* (seperti `User` ke `Event`) guna mencegah hilangnya data operasional besar secara tidak sengaja oleh kelalaian penghapusan User.

## Aturan Security
- **DILARANG** menaruh password, API key, JWT secret, atau token apa pun secara *hardcoded* ke dalam source code.
- Gunakan Environment Variables (`.env`) untuk semua rahasia dan kredensial.
- Terapkan hashing untuk password (misal: `bcrypt`).
- API endpoint harus dilindungi dengan guard/middleware autentikasi berbasis role (RBAC), kecuali untuk public endpoint (seperti load undangan tamu).

## Aturan Naming Convention
- **File & Folder Name**: `kebab-case` (misal: `user-controller.ts`, `button-component.tsx`).
- **Variables & Functions**: `camelCase`.
- **Classes, Interfaces, Types**: `PascalCase`.
- **Konstanta Global**: `UPPER_SNAKE_CASE`.
- **Database Tables & Columns**: Mengikuti gaya database relational/Prisma (Model dalam `PascalCase`, Field dalam `camelCase` dan di-map ke `snake_case` di database menggunakan `@map`).

## Aturan API
- Gunakan arsitektur RESTful.
- Format response seragam. Contoh:
  ```json
  { "status": "success", "data": {...}, "message": "..." }
  ```
- Versioning pada endpoint wajib digunakan, misalnya `/api/v1/...`.

## Aturan Testing
- Tulis *unit test* untuk logika bisnis kritikal (seperti fungsi QR generation, perhitungan waktu, dan validasi attendance).
- Gunakan `Jest` untuk environment NestJS dan Next.js.

## Aturan Penggunaan Environment Variables
- Seluruh rahasia, token, URL layanan eksternal, dan konfigurasi host/port harus ditaruh di `.env`.
- Sediakan file `.env.example` sebagai referensi struktur variabel tanpa berisi *value* rahasia. Jangan pernah mengkomit file `.env` ke version control.
