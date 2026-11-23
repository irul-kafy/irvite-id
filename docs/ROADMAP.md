# Development Roadmap

## Status Terkini — Arsitektur Web-Only

Platform **IRVITE.ID** berjalan sepenuhnya berbasis web (Next.js `web-admin`, Next.js `web-invitation`, NestJS `api-server`, dan Prisma + MySQL). Seluruh aktivitas pemindaian QR (*scanner*) dan buku tamu (*check-in*, *walk-in*, *undo*, serta sinkronisasi luring PWA) diakses langsung melalui browser tanpa aplikasi mobile native Android/iOS.

---

## Ringkasan Fase yang Telah Selesai

### Fase 1: Foundation & Database Architecture (Selesai)
- [x] Struktur monorepo Turborepo (`apps/api-server`, `apps/web-admin`, `apps/web-invitation`, `packages/database`, `packages/ui`).
- [x] Skema Prisma & MySQL dengan integritas referensial (`onDelete: Restrict` untuk `User`/`Template`, `onDelete: SetNull` untuk retensi `Order`/`ActivityLog`, `onDelete: Cascade` untuk entitas operasional acara).
- [x] Validasi variabel lingkungan saat startup (`validateEnvironment`) dan endpoint pemeriksaan kesehatan (`/health`, `/health/db`).

### Fase 2: Authentication, RBAC & Tenant Isolation (Selesai)
- [x] Autentikasi JWT dengan kuki sesi dan guard RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
- [x] Isolasi kepemilikan (*tenant isolation*): `ADMIN` hanya dapat mengakses acara miliknya sendiri (`userId`), `STAFF` hanya mengakses acara yang ditugaskan (`StaffEvent`), dan `SUPER_ADMIN` mengelola seluruh platform.
- [x] Portal Klien (`/kelola/[token]`) dengan kunci acak kriptografis tersimpan, validasi waktu konstan (`crypto.timingSafeEqual`), dan pengiriman kunci melalui header `x-client-portal-key`.

### Fase 3: Admin & Staff Dashboard (`apps/web-admin`) (Selesai)
- [x] Manajemen siklus hidup acara (`DRAFT`, `PUBLISHED`, `ARCHIVED`, *restore*, dan *permanent delete* dengan retensi data keuangan `Order` & `ActivityLog`).
- [x] Impor daftar tamu massal (CSV/Excel/Google Sheets) dengan deteksi duplikat, normalisasi nomor telepon, dan sanitasi formula.
- [x] Manajemen staf lapangan, moderasi ucapan & doa, ekspor laporan kehadiran, dan halaman pemeriksaan sistem (`/dashboard/system-check`).

### Fase 4: Digital Invitation Engine (`apps/web-invitation`) (Selesai)
- [x] Katalog template undangan pernikahan multi-tema dengan editor konten dan slot media tervalidasi (`MediaStorageService`).
- [x] Halaman undangan personal berbasis `uniqueCode` dengan pelacakan statistik buka undangan, formulir RSVP, kirim ucapan & doa, dan kode QR tamu.
- [x] Penyeragaman aturan kedaluwarsa acara (`isPublicInvitationExpired` berdasarkan `activeUntil` atau `eventDate + 30 hari`).

### Fase 5: Web QR Scanner, Offline PWA Sync & Google Sheets Webhook (Selesai)
- [x] Pemindaian QR via kamera browser dan input manual dengan dukungan check-in bertahap (*partial pax*), tamu dadakan (*walk-in* `ON_THE_SPOT`), dan pembatalan (*undo check-in*).
- [x] Sinkronisasi luring (*offline snapshot* & `syncAttendance` via `OfflineSyncOp`) yang membedakan kegagalan validasi permanen vs kegagalan jaringan/DB sementara (*retryable*).
- [x] Integrasi Webhook Google Sheets terproteksi SSRF (hanya `https://script.google.com/macros/s/.../exec`, khusus `SUPER_ADMIN`/`ADMIN`, dan sinkronisasi latar belakang *fire-and-forget* / *batched resync*).

---

## Pekerjaan Lanjutan Sebelum Peluncuran Produksi Skala Penuh

- [ ] Integrasi penyimpanan objek eksternal (S3 / Cloudflare R2) untuk menggantikan penyimpanan disk lokal pada lingkungan multi-instance.
- [ ] Mekanisme *refresh token* / pencabutan sesi dan fitur atur ulang kata sandi mandiri (*self-service password reset*).
- [ ] Uji beban dan latihan pencadangan serta pemulihan (*backup & restore drill*) basis data produksi.
