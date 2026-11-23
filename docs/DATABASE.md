# Database Design & Roles

Dokumen ini menjelaskan struktur data, peran (`Role`), integritas referensial, dan hubungan antar entitas. Skema aktual diimplementasikan dengan **Prisma** di `packages/database/prisma/schema.prisma`.

## 1. Pengguna dan Peran (`Role`)

Terdapat 3 peran (`Role`) utama pengguna sistem:
1. **`SUPER_ADMIN`**: Operator global platform. Memiliki akses penuh ke seluruh event, pesanan (`Order`), log aktivitas (`ActivityLog`), manajemen akun (`User`), dan katalog *Template* global.
2. **`ADMIN`**: Pemilik acara (*tenant* terisolasi). Hanya dapat membuat, membaca, memperbarui, mengimpor tamu, memoderasi ucapan, dan melihat analitik dari **Event miliknya sendiri (`userId`)**.
3. **`STAFF`**: Petugas operasional di lapangan. Hanya dapat mengakses pemindaian QR, check-in/walk-in/undo, dan pantauan kehadiran langsung pada `Event` yang ditugaskan kepadanya melalui tabel `StaffEvent`. `STAFF` tidak memiliki akses ke konfigurasi maupun URL Webhook Google Sheets.

## 2. Hubungan Antar Entitas, Pax Model & Retensi Data Keuangan

Alur utama undangan pernikahan & buku tamu:
**`User` → `Event` → `Guest` → `Invitation` → `Attendance` → `AttendanceCheckIn`**

- **`User` → `Event` (1:N)**: Menggunakan `onDelete: Restrict` untuk mencegah penghapusan akun menghilangkan acara aktif secara tidak sengaja.
- **`Template` → `Event` (1:N) & `Template` → `TemplateAsset` (1:N)**: Menggunakan `onDelete: Restrict` agar template atau aset yang sedang dipakai acara tidak dapat dihapus paksa.
- **`Event` → Entitas Operasional (`Guest`, `Invitation`, `Attendance`, `Media`, `StaffEvent`, `Wish`, `OfflineSyncOp`)**: Menggunakan `onDelete: Cascade` (dan dibersihkan secara bottom-up saat `permanentDelete` pada acara yang sudah berstatus `ARCHIVED`).
- **`Event` → Data Keuangan & Audit (`Order`, `ActivityLog`)**:
  - `Order.eventId` dan `ActivityLog.eventId` bersifat **nullable (`String?`)** dengan **`onDelete: SetNull`**.
  - Saat sebuah `Event` dihapus permanen (`permanentDelete`), baris `Order` dan `ActivityLog` **tidak ikut dihapus** melainkan dipertahankan (`eventId = null`) demi integritas pembukuan keuangan dan jejak audit.
- **Pax Model & Audit Bertahap**:
  - `Guest` memiliki `maxPax` (kuota maksimum tamu) dan `tableNumber` (nomor meja).
  - `Invitation` memiliki `uniqueCode` (token QR unik), `status` (`PENDING`, `SENT`, `OPENED`, `RSVP_YES`, `RSVP_NO`), `rsvpPax`, serta statistik buka undangan (`firstOpenedAt`, `lastOpenedAt`, `openCount`).
  - `Attendance` mencatat total kumulatif `scannedPax` per undangan, sedangkan setiap pemindaian parsial maupun *walk-in* dicatat sebagai baris jejak audit di `AttendanceCheckIn`.

## 3. Daftar Model Database (`schema.prisma`)

1. **`User` (`users`)**: Akun pengelola (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
2. **`Template` (`templates`)**: Definisi desain undangan (`themeCode`, `renderer`, `status`, `config` JSON, `previewImageUrl`).
3. **`TemplateAsset` (`template_assets`)**: Aset visual/dekorasi milik template (`templateId`, `slot`, `storageKey`, `mimeType`, `order`).
4. **`Event` (`events`)**: Acara utama (`userId`, `templateId`, `title`, `slug`, `eventDate`, `activeUntil`, `locationDetails`, `content` JSON, `status`).
5. **`Guest` (`guests`)**: Data tamu (`eventId`, `name`, `customGreeting`, `email`, `phoneNumber`, `category`, `maxPax`, `tableNumber`).
6. **`Invitation` (`invitations`)**: Undangan personal 1:1 dengan `Guest` (`uniqueCode`, `status`, `rsvpPax`, `firstOpenedAt`, `lastOpenedAt`, `openCount`).
7. **`Attendance` (`attendances`)**: Status kehadiran teragregasi per `Invitation` (`scannedPax`, `scannedAt`, `scannedById`, `status`).
8. **`AttendanceCheckIn` (`attendance_check_ins`)**: Log audit setiap kejadian check-in bertahap maupun *walk-in* (`attendanceId`, `scannedById`, `scannedPax`, `scannedAt`).
9. **`Media` (`medias`)**: Metadata file foto/audio/video acara yang disimpan melalui `MediaStorageService` (`eventId`, `slot`, `url`, `type`, `order`).
10. **`StaffEvent` (`staff_events`)**: Penugasan akun `STAFF` ke `Event` tertentu (`@@unique([eventId, userId])`).
11. **`Wish` (`wishes`)**: Ucapan dan doa tamu pada undangan publik (`eventId`, `name`, `message`, `createdAt`).
12. **`OfflineSyncOp` (`offline_sync_ops`)**: Tabel idempotensi operasi sinkronisasi scanner PWA luring (`id` = `opId`, `eventId`, `opType`, `status`, `deviceId`, `clientTimestamp`).
13. **`Order` (`orders`)**: Data pesanan paket undangan (`eventId` nullable dengan `onDelete: SetNull`, `referenceCode`, `clientName`, `clientWhatsapp`, `packageCode`, `priceAmount`, `status`, `paidAt`).
14. **`ActivityLog` (`activity_logs`)**: Jejak audit aktivitas sistem (`actorUserId`, `actorRole`, `action`, `entityType`, `entityId`, `eventId` nullable dengan `onDelete: SetNull`, `metadata`, `ip`).

## 4. Indexing & Optimization

Indeks database (`@@index` dan `@unique`) diterapkan pada jalur kueri utama:
- `Event`: `@@index([userId])`, `@unique([slug])`
- `Guest`: `@@index([eventId])`
- `Invitation`: `@@index([eventId])`, `@unique([guestId])`, `@unique([uniqueCode])`
- `Attendance`: `@@index([eventId])`, `@@index([scannedById])`, `@unique([invitationId])`
- `AttendanceCheckIn`: `@@index([attendanceId])`, `@@index([scannedById])`, `@@index([scannedAt])`
- `Media`: `@@index([eventId])`, `@@index([eventId, slot])`
- `Wish`: `@@index([eventId])`, `@@index([eventId, createdAt])`
- `OfflineSyncOp`: `@@index([eventId])`, `@@index([eventId, createdAt])`
- `Order`: `@@index([status])`, `@@index([referenceCode])`
- `ActivityLog`: `@@index([eventId, createdAt])`, `@@index([actorUserId, createdAt])`, `@@index([action])`
