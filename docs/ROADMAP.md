# Development Roadmap

## Status terkini — 4 Oktober 2026

Keputusan user: platform sepenuhnya web. Tidak ada rencana aplikasi Android/iOS.
Scanner ada di dashboard staff, melalui kamera browser atau input manual.

Fitur yang sudah ada di kode: auth/RBAC/ownership, event & lifecycle,
guest import, invitation personal, RSVP, attendance bertahap, scanner web,
guest export & attendance report, staff management, content/media editor,
template catalog, renderer dan preview.

Pengerjaan operasional saat ini: cookie sesuai expiry JWT, endpoint versi dengan
alias kompatibilitas, konfigurasi media saat startup, upgrade dependency,
CI untuk test/build/E2E disposable, dan halaman admin Pengecekan Sistem.
Lihat WEB-OPERATIONS.md untuk konfigurasi dan langkah verifikasi.

Sebelum launch: jalankan E2E dengan MySQL disposable, uji browser HP nyata,
tetapkan hosting/domain HTTPS dan disk persisten, lalu uji backup/restore.
CI belum terbukti di GitHub sampai workflow dipush dan run selesai.
S3/R2, refresh token, pencabutan bearer token dan self-service reset password
masih pekerjaan lanjutan; bukan fitur yang sudah tersedia.

## Arsip rencana awal

Checklist berikut disimpan sebagai riwayat, bukan status implementasi terkini.
Rencana mobile dalam arsip sudah dibatalkan oleh keputusan web-only di atas.

Berikut adalah peta jalan pengembangan sistem mulai dari fase arsitektur awal hingga mencapai fase *Production Ready*.

## Fase 1: Foundation & Architecture (Selesai)
- [x] Mendefinisikan arsitektur utama (Client-Server Monorepo).
- [x] Mendefinisikan Tech Stack (Next.js, NestJS, Prisma, React Native).
- [x] Membuat rancangan struktur folder dan *file guidelines* (`AGENTS.md`).
- [x] Merancang Entity Relationship Database (`docs/DATABASE.md`).
- [x] Menginisialisasi dan memvalidasi final skema `schema.prisma` (Clean Architecture).
- [x] Database Foundation
- [x] Turborepo Foundation
- [x] NestJS API Foundation
- [x] MySQL Initialization
- [x] Prisma Client
- [x] Environment Loading
- [x] GET `/health`
- [x] GET `/health/db`

## Fase 2: Authentication + JWT + RBAC (Selesai)
- [x] Implementasi Autentikasi JWT dan Role-Based Access Control (RBAC).

## NEXT TARGET: API Core (Users, Events, Guests, Templates)
- [ ] Pembuatan CRUD REST API untuk `User`, `Event`, `Guest`, dan `Template`.
- [ ] Implementasi otorisasi kepemilikan Event (Event Ownership Authorization).

## Fase 3: Admin & Staff Dashboard (Web Frontend)
- [ ] Inisialisasi Next.js (`apps/web-admin`).
- [ ] Konfigurasi Tailwind CSS dan pembuatan desain sistem (UI Components).
- [ ] Integrasi Login Admin/Staff ke API.
- [ ] Pengembangan modul Manajemen Event dan Upload Tamu (CSV).
- [ ] Pembuatan visualisasi data (Dashboard Chart).

## Fase 4: Digital Invitation Engine
- [ ] Inisialisasi Next.js (`apps/web-invitation`).
- [ ] Logika *routing* unik per tamu (berdasarkan `unique_code`).
- [ ] Mekanisme pemanggilan template dan injeksi data dinamis ke UI undangan.
- [ ] Pembuatan form RSVP.
- [ ] Generasi visual QR Code (Base64/SVG) yang siap ditampilkan di web.

## Fase 5: Check-in System & Mobile App
- [ ] Inisialisasi React Native / Expo (`apps/mobile-scanner`).
- [ ] Desain dan fungsionalitas UI Camera Scanner.
- [ ] Integrasi endpoint API `Check-in/Attendance`.
- [ ] Penanganan *error response* (contoh: QR palsu, QR ganda).

## Fase 6: Polish, Testing & Production Launch
- [ ] QA, Unit Testing (Jest), & End-to-End Testing (Cypress/Playwright).
- [ ] Integrasi AWS S3 / Cloudflare R2 untuk aset media.
- [ ] Optimasi Animasi Web Invitation & SEO Metadata.
- [ ] CI/CD Pipeline (GitHub Actions).
- [ ] Deployment ke Production (Vercel untuk Frontend, Railway/Render/AWS untuk Backend & DB).
