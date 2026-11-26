# Modul Tiket Event & Kerja Sama Penyelenggara (EO)

Dokumen ini menjelaskan arsitektur, aturan integritas data, status pesanan dan acara, variabel lingkungan (`env`), alur operasional modul penjualan tiket acara publik serta kerja sama penyelenggara (*Event Organizer* / EO) pada platform **IRVITE**, dan daftar berkas warisan (*legacy*) yang telah dihapus.

---

## 1. Arsitektur & Satu Sumber Kebenaran (Single Source of Truth)

```text
[ Pembeli / EO (Browser) ]                  [ Admin / Petugas Gerbang ]
           │                                             │
           ▼                                             ▼
apps/web-invitation (/tiket, /partnership)     apps/web-admin (/events, /orders)
           │                                             │
           ▼                                             ▼
/api/ticketing (BFF Proxy Tipis)              /api/ticketing (BFF Proxy + Sesi JWT)
           │                                             │
           └──────────────────────┬──────────────────────┘
                                  ▼
                apps/api-server (NestJS TicketingModule)
                                  │
                                  ▼
              packages/database (Prisma + MySQL 8.0)
```

- **Satu Sumber Kebenaran**: Seluruh logika bisnis, perhitungan harga/biaya/pajak, pembuatan kode pesanan/tiket, penandatanganan HMAC QR, dan penyimpanan data tiket **hanya** berada di `apps/api-server` (NestJS) dan basis data MySQL melalui Prisma (`packages/database`).
- **Frontend & BFF Proxy Tipis**:
  - `apps/web-invitation/src/app/api/ticketing/route.ts` hanya meneruskan permintaan publik ke `apps/api-server` tanpa logika bisnis dan tanpa *fallback* data lokal. Jika `api-server` gagal dihubungi atau mengembalikan galat `5xx`, BFF mengembalikan status **`502 Bad Gateway`** beserta pesan galat bahasa Indonesia yang jelas. Antarmuka pengguna (`/tiket` dan `/partnership`) menampilkan pesan galat tersebut bersama tombol **"Coba lagi"**.
  - `apps/web-admin/src/app/api/ticketing/route.ts` dilindungi oleh middleware `apps/web-admin/src/proxy.ts` (`matcher: ['/api/ticketing', '/api/ticketing/:path*']`) serta pemeriksaan kuki `auth_token` di dalam handler `GET` dan `POST`. Permintaan tanpa sesi aktif langsung ditolak dengan **`401 Unauthorized`**.

---

## 2. Siklus Status Acara, Pesanan, dan Tiket

### A. Status Acara Tiket (`TicketEventStatus` pada `Event.ticketStatus`)
- `DRAFT`: Acara baru dibuat oleh admin, belum tampil di katalog publik.
- `REVIEW`: Acara sedang ditinjau sebelum publikasi.
- `PUBLISHED`: Acara aktif dan tampil di `GET /ticketing/events` selama `endAt > now`.
- `ENDED`: Acara telah selesai dilaksanakan.
- `CANCELLED`: Acara dibatalkan.

### B. Status Pesanan Tiket (`TicketOrderStatus` pada `TicketOrder.status`)
- `PENDING`: Status awal wajib untuk setiap pesanan berbayar baru (`expiresAt = now + ORDER_EXPIRY_MINUTES`, default 30 menit). Kuota kategori tiket sudah ditahan secara atomik, tetapi `IssuedTicket` belum diterbitkan.
- `PAID`: Pembayaran telah terverifikasi melalui webhook (`POST /ticketing/webhooks/payment`) atau acara gratis (`totalAmount === 0`). Pada transisi ini `IssuedTicket` diterbitkan memakai `holderNames` yang tersimpan di pesanan.
- `EXPIRED`: Pesanan `PENDING` melewati batas waktu (`expiresAt < now`). Kuota kategori tiket dilepaskan kembali secara atomik melalui mekanisme *lazy-expire* saat dibaca maupun job cron (`POST /ticketing/cron/expire-orders`).
- `CANCELLED`: Pesanan dibatalkan.
- `REFUNDED`: Dana pesanan dikembalikan.
- `REFUND_PENDING`: Pembayaran masuk terlambat ketika pesanan sudah kedaluwarsa dan kuota sudah habis, sehingga memerlukan pengembalian dana (*refund*) manual.

### C. Aturan Perhitungan Biaya (`computeOrderAmounts`) & Metode Pembayaran
- **Perhitungan Biaya Layanan (`serviceFeeBps` & Promo)**:
  - Seluruh perhitungan uang dilakukan di server dalam **`Int` Rupiah** melalui fungsi murni `computeOrderAmounts(subtotal, bps, feePayer, taxRatePercent, taxIncluded)` di `apps/api-server/src/ticketing/ticketing-pricing.ts`.
  - `serviceFee = Math.round(subtotal * bps / 10000)` dihitung untuk seluruh pesanan (bukan per tiket), **tanpa biaya minimum**. Untuk pesanan gratis (`subtotal === 0`), `serviceFee = 0`.
  - Tarif default berasal dari env `DEFAULT_SERVICE_FEE_BPS` (default `350` = 3,5%). Admin dapat mengatur `serviceFeeBps` (`0..1000`), `feePayer` (`BUYER` atau `ORGANIZER`), serta promo berbatas waktu (`promoFeeBps` dan `promoEndsAt`). Jika `promoEndsAt` masih di masa depan, tarif efektif memakai `promoFeeBps` (misal `300` = 3%); jika promo berakhir atau tidak disetel, tarif efektif memakai `serviceFeeBps`.
  - Jika `feePayer === 'BUYER'`: `totalAmount = subtotal + serviceFee + taxAmount`, `organizerNet = subtotal`.
  - Jika `feePayer === 'ORGANIZER'`: `totalAmount = subtotal + taxAmount`, `organizerNet = subtotal - serviceFee` (informasi pendapatan bersih EO; pajak `taxAmount` ditampilkan terpisah dan bukan bagian pendapatan EO).
  - Snapshot `serviceFeeBps`, `feePayer`, dan `holderNames` disimpan di baris `ticket_orders` saat checkout agar perubahan tarif di masa depan tidak mengubah pesanan lama.
- **Aturan Metode Pembayaran**:
  - Pesanan gratis (`totalAmount === 0`): hanya metode `FREE` yang diizinkan.
  - Pesanan berbayar (`totalAmount > 0`):
    - `QRIS` dan `EWALLET` selalu diizinkan.
    - `VA_*` (`VA_BCA`, `VA_BNI`, `VA_BRI`, `VA_MANDIRI`, `VA_PERMATA`) hanya diizinkan jika `totalAmount >= VA_MIN_TOTAL_IDR` (default `150000`).
    - `CARD` tidak diizinkan.
- **Endpoint Quote Publik (`POST /ticketing/events/:slug/quote`)**:
  - Endpoint `@Public()` dengan `@Throttle` (30 permintaan/menit) yang menerima `{ tierId, quantity }` dan mengembalikan rincian harga (`subtotal`, `serviceFee`, `serviceFeeBps`, `taxAmount`, `totalAmount`, `organizerNet`, `allowedPaymentMethods`) tanpa menahan kuota dan tanpa menyimpan apa pun ke database.
  - Frontend (`/tiket`) mengambil rincian biaya dari endpoint quote dan tidak menghitung uang sendiri. DTO checkout menolak field angka uang dari klien (`forbidNonWhitelisted`).

### C. Status Tiket Terbit (`IssuedTicketStatus` pada `IssuedTicket.status`)
- `ISSUED`: Tiket resmi telah terbit dan siap dipindai di gerbang acara.
- `CHECKED_IN`: Tiket telah dipindai di gerbang (`POST /ticketing/check-in`), waktu dan petugas tercatat di `TicketCheckInLog`.
- `VOID`: Tiket dibatalkan/tidak berlaku.

---

## 3. Variabel Lingkungan (Environment Variables)

| Variabel | Lokasi | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | `apps/api-server`, `packages/database` | URL koneksi MySQL utama (`mysql://...`). |
| `E2E_DATABASE_URL` | `apps/api-server` (Test) | URL database MySQL khusus pengujian E2E yang wajib berakhiran `_test`. |
| `TICKETING_ENABLED` | `apps/api-server` | Sakelar fitur modul tiket di API (`true` untuk mengaktifkan rute `/ticketing` dan validasi rahasia saat *startup*; jika `false` atau kosong, rute tiket mengembalikan `404` dan server tetap *boot* untuk produk undangan tanpa memeriksa env rahasia tiket). |
| `TICKET_QR_SECRET` | `apps/api-server` | Rahasia HMAC-SHA256 (wajib minimal 16 karakter & berbeda dari secret lain) untuk menandatangani payload QR tiket `v1.<ticketId>.<hmac>`. |
| `PAYMENT_WEBHOOK_SECRET` | `apps/api-server` | Rahasia HMAC-SHA256 tersendiri (minimal 16 karakter & berbeda dari secret lain) untuk memverifikasi header `x-payment-signature`. |
| `CRON_SECRET` | `apps/api-server` | Rahasia internal tersendiri (minimal 16 karakter & berbeda dari secret lain) untuk mengotorisasi `POST /ticketing/cron/expire-orders` (dibandingkan via SHA-256 + `timingSafeEqual`). |
| `PAYMENT_MODE` | `apps/api-server` | Mode layanan pembayaran (`mock` atau `gateway`). `MockPaymentService` hanya aktif jika `PAYMENT_MODE=mock` **dan** `NODE_ENV !== 'production'`. |
| `DEFAULT_SERVICE_FEE_BPS` | `apps/api-server` | Tarif biaya layanan default dalam basis poin (`0..1000`, default `350` = 3,5%). |
| `VA_MIN_TOTAL_IDR` | `apps/api-server` | Batas minimum total tagihan Rupiah agar metode Virtual Account (`VA_*`) diizinkan (default `150000`). |
| `ORDER_EXPIRY_MINUTES` | `apps/api-server` | Durasi masa berlaku pesanan `PENDING` sebelum kedaluwarsa (default `30` menit). |
| `CHECKIN_OPEN_HOURS_BEFORE` | `apps/api-server` | Jumlah jam sebelum `startAt` saat jendela check-in dibuka (default `6` jam; ditutup pada `endAt + 6` jam). |
| `INTERNAL_API_URL` | `web-invitation`, `web-admin` | URL internal `apps/api-server` (default `http://localhost:3000`) yang dituju oleh proxy BFF `/api/ticketing`. |
| `NEXT_PUBLIC_ENABLE_TICKETING` | `web-invitation` | Sakelar fitur modul tiket di frontend (`true` untuk mengaktifkan `/tiket` dan `/partnership`). |

---

## 4. Alur Operasional End-to-End

1. **Pengajuan Acara oleh EO ("Terima Beres") & Tinjauan Admin**
   - EO mengisi formulir kerja sama di `/partnership` → `POST /api/ticketing` (`action: 'submit-inquiry'`) → `POST /api/v1/ticketing/public/inquiries` (`@Public()`, `@Throttle` 5 permintaan / 10 menit, `200 OK`) → tersimpan di tabel `eo_inquiries` dengan kode acak `INQ-...` (`randomBytes`) serta `access_token_hash` (SHA-256).
   - **Honeypot Anti-Bot (`website`)**: Jika field tersembunyi `website` terisi, server langsung membalas **`200 OK`** dengan respons sukses palsu (`{ inquiryCode, accessToken, status: 'PENDING' }`) dan **tidak menyimpan apa pun** ke database (bukan `400 Bad Request`), agar bot tidak mengetahui bahwa pengajuannya tertangkap honeypot.
   - **Cek Status Pengajuan Publik (`GET /api/v1/ticketing/public/inquiries/:code`)**: Pemohon dapat memeriksa status pengajuannya menggunakan `inquiryCode` dan `accessToken` (melalui header `X-Access-Token` atau query `accessToken`).
   - **Tinjauan Admin (`GET /api/v1/ticketing/inquiries` & `PATCH /api/v1/ticketing/inquiries/:id/status`)**: Admin dapat memfilter daftar pengajuan berdasarkan `status` (`PENDING`, `REVIEWED`, `NEED_INFO`, `APPROVED`, `REJECTED`) dan memperbarui status beserta catatan admin. Catatan admin disimpan di kolom terpisah `admin_notes` (bersama `reviewed_by` dan `reviewed_at`) sehingga **tidak pernah menimpa** kolom `notes` asli milik pemohon.
   - **TODO (Di Luar Scope Fase Ini)**: Notifikasi pengajuan baru secara otomatis ke tim internal IRVITE (melalui email maupun WhatsApp) belum termasuk dalam scope fase ini dan dicatat sebagai TODO pengembangan berikutnya.
2. **Pembuatan, Pengeditan, & Publikasi Acara oleh Admin IRVITE (Tanpa Data Karangan)**
   - Admin masuk ke `web-admin`, membuat acara beserta kategori tiket (`POST /api/v1/ticketing/events`), mengedit acara (`PATCH /api/v1/ticketing/events/:eventId`), lalu memublikasikannya (`POST /api/v1/ticketing/events/:eventId/publish`).
   - **Validasi Ketat Tanpa Nilai Default Karangan**: Pembuatan acara mewajibkan `title`, `organizerName`, `city`, `startAt` (harus di masa depan: `startAt > now`), `venue`/`venueName`, serta minimal 1 kategori tier (`tiers.length >= 1`). Setiap tier memvalidasi `price >= 0`, `quota >= 1`, `maxPerOrder >= 1`, dan `salesEndAt > salesStartAt` (bila keduanya diisi). Server tidak pernah mengarang kota `'Jakarta'`, penyelenggara `'Mitra penyelenggara IRVITE'`, jam `'19:00 - 22:00 WIB'`, maupun tier `'Tiket reguler Rp 50.000'`.
   - **Format Jam & Tanggal WIB (`Asia/Jakarta`)**: Label tanggal (`dateLabel`) dan rentang waktu (`eventTime`) diformat secara dinamis dari `startAt` dan `endAt` menggunakan `Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', ... })` sehingga tetap akurat dalam WIB meskipun server berjalan di zona waktu UTC (termasuk untuk waktu acara mendekati tengah malam).
3. **Katalog Publik & Checkout Tanpa Wajib Akun**
   - Pembeli membuka `/tiket`, melihat daftar acara `PUBLISHED` dari `GET /api/v1/ticketing/events` (atau *empty state* jujur bila belum ada acara).
   - Pembeli memilih kategori tiket dan jumlah (`1..maxPerOrder`), mengisi nama, email, dan nomor WhatsApp Indonesia, lalu menekan **Buat pesanan tiket** (`POST /api/v1/ticketing/checkout`).
   - **Urutan Checkout Aman**:
     1. Di dalam satu transaksi database (`prisma.$transaction`), server menahan kuota secara atomik (`sold_count + qty <= quota`) dan membuat pesanan berstatus `PENDING` (atau langsung `PAID` + `IssuedTicket` dengan `sequence_number` `1..quantity` untuk pesanan gratis). Server tidak pernah memanggil gateway pembayaran sebelum baris pesanan tersimpan di database.
     2. Setelah transaksi pesanan berhasil di-*commit*, server memanggil `paymentService.createPaymentIntent(...)` lalu menyimpan `paymentReference` ke pesanan.
     3. Jika pembuatan *payment intent* gagal (mis. `GatewayPaymentService` belum terhubung ke gateway nyata sehingga menolak dengan **`503 ServiceUnavailableException`** `"Pembayaran belum tersedia"`), server menjalankan transaksi kompensasi untuk menandai pesanan `CANCELLED`, melepaskan kembali kuota yang sempat ditahan, dan mengembalikan respons **`503 Service Unavailable`** secara jujur.
4. **Konfirmasi Pembayaran, State Machine Webhook, & Audit `payment_events`**
   - Gateway pembayaran mengirimkan webhook ke `POST /api/v1/ticketing/webhooks/payment` (`200 OK`) dengan header `x-payment-signature`.
   - **Audit Semua Webhook (`payment_events`)**: Setiap permintaan webhook yang masuk—termasuk yang ditolak karena signature tidak valid (`401`), `orderCode` tidak ditemukan (`404` tanpa membocorkan detail), atau `grossAmount` tidak sesuai (`400`)—dicatat ke tabel `payment_events` (`order_code`, `provider`, `provider_event_id`, `raw_status`, `gross_amount`, `signature_valid`, `outcome`, `payload` tanpa rahasia) untuk keperluan audit, deteksi *replay*, dan rekonsiliasi uang.
   - **Validasi `grossAmount` & Normalisasi Status**:
     - `grossAmount` wajib dikirim dan harus sama persis dengan `order.totalAmount`; jika tidak cocok, server mencatat peringatan di log, merekam `REJECTED_AMOUNT_MISMATCH` di `payment_events`, dan menolak dengan `400 Bad Request`.
     - Hanya status sukses (`PAID`, `SETTLEMENT`, `CAPTURE`) yang menerbitkan tiket.
     - Status kegagalan/pembatalan (`EXPIRED`, `CANCELLED`, `FAILED`) melepaskan kuota maksimal satu kali (`updateMany` dari `PENDING`).
     - Status non-final lainnya (mis. `PENDING`) tidak mengubah data dan dibalas `200 OK`.
     - Pesanan yang sudah berstatus `PAID`, `REFUND_PENDING`, atau `REFUNDED` bersifat idempoten dan langsung dibalas `200 OK` tanpa perubahan.
   - **Idempotensi Paralel & Penanganan `PENDING` Lewat Waktu vs `EXPIRED`/`CANCELLED`**:
     - Untuk pesanan yang masih berstatus `PENDING` (termasuk yang `expiresAt`-nya sudah lewat tetapi **belum** disapu oleh cron, sehingga kuotanya masih ditahan oleh pesanan tersebut), webhook pembayaran sukses melakukan klaim atomik `updateMany({ where: { id, status: 'PENDING' }, data: { status: 'PAID', paidAt, paymentReference } })`. Tiket (`IssuedTicket` dengan `sequence_number` `1..quantity` dan `UNIQUE(order_id, sequence_number)`) hanya diterbitkan oleh pekerja yang mendapatkan `count === 1`.
     - Untuk pembayaran sukses yang datang terlambat ketika status pesanan sudah `EXPIRED` atau `CANCELLED` (kuota sudah dilepas), server mengklaim transisi secara atomik dan mencoba menahan ulang kuota (`sold_count + qty <= quota`). Jika kuota masih tersedia, pesanan menjadi `PAID` dan tiket diterbitkan; jika kuota sudah habis, status pesanan disimpan sebagai `REFUND_PENDING` tanpa melempar *exception* di dalam transaksi agar perubahan status tetap ter-*commit*.
5. **Verifikasi Pesanan, Check-in Atomik, & Scanner Offline**
   - Pembeli memeriksa status pesanan dan kode QR tiket di tab **Cek pesanan dan tiket** (`/tiket`) menggunakan `orderCode` dan `accessToken`. Untuk mencegah kebocoran token melalui URL/log/Referer, token dikirim melalui header `X-Access-Token` atau body `POST /api/v1/ticketing/orders/:orderCode` (query `?accessToken=...` tetap didukung dengan `@Throttle` untuk kompatibilitas mundur), serta halaman `/tiket` dan rute BFF `/api/ticketing` menetapkan kebijakan `Referrer-Policy: no-referrer`.
   - **Check-in Atomik (`POST /api/v1/ticketing/check-in`)**:
     - Mewajibkan `eventId`. Untuk peran `STAFF`, server memastikan petugas ditugaskan ke acara tersebut melalui `staff_events` (`403` bila tidak ditugaskan).
     - Memvalidasi bahwa acara berstatus `PUBLISHED` dan waktu pemindaian berada dalam jendela `[startAt - CHECKIN_OPEN_HOURS_BEFORE, endAt + 6 jam]`.
     - Menggunakan klaim atomik `updateMany({ where: { id, eventId, status: 'ISSUED' }, data: { status: 'CHECKED_IN', ... } })`. Jika `count === 0`, tiket dibaca ulang untuk membedakan `DUPLICATE` vs `VOID`. Setiap percobaan (`VALID`, `DUPLICATE`, `VOID`, `WRONG_EVENT`, `NOT_PAID`, `OUTSIDE_WINDOW`, `INVALID`) dicatat ke `ticket_check_in_logs`.
     - Demi privasi, respons check-in dan pencarian manual (`GET /api/v1/ticketing/events/:eventId/tickets/search?q=...`) **tidak pernah** menampilkan email maupun nomor WhatsApp pembeli (hanya nama pemegang, kategori tier, dan status).
   - **Undo Check-in (`POST /api/v1/ticketing/check-in/undo`)**:
     - Khusus `ADMIN`/`SUPER_ADMIN` selama acara belum berstatus `ENDED`. Mengembalikan `CHECKED_IN` ke `ISSUED` serta mencatat `actor_user_id` dan `reason` wajib dengan hasil `UNDO` di `ticket_check_in_logs`.
   - **Offline Snapshot & Offline Sync (`GET .../offline-snapshot` & `POST .../offline-sync`)**:
     - `offline-snapshot` hanya dapat diakses oleh pengelola atau `STAFF` yang ditugaskan pada acara tersebut, dan mengirimkan `{ ticketId, ticketCode, attendeeName, tierName, status, qrDigest }` (`qrDigest = SHA-256(signedQr)`) tanpa menyertakan rahasia HMAC, payload QR mentah, email, maupun nomor WhatsApp pembeli.
     - Perangkat mencocokkan digest SHA-256 dari QR yang dipindai dengan `qrDigest` pada snapshot, lalu menyinkronkannya melalui `offline-sync` secara idempoten memakai `offline_sync_ops` (`opType: 'TICKET_CHECK_IN'`) dan kunci unik `ticket_check_in_logs.sync_op_id` di dalam satu transaksi database.
   - **Statistik Check-in (`GET /api/v1/ticketing/events/:eventId/checkin-stats`)**:
     - Menyajikan jumlah tiket terbit, sudah check-in, dan sisa kuota masuk per acara, per kategori tier (`byTier`), dan per gerbang (`byGate`).

---

## 5. Daftar File yang Dihapus Beserta Alasannya

| File yang Dihapus | Alasan Penghapusan |
| --- | --- |
| `apps/web-invitation/src/lib/ticketing-store.ts` | Menghilangkan penyimpanan state/store tiket di sisi frontend (`web-invitation`), termasuk data dummy awal (`INITIAL_EVENTS`), pembuatan matriks QR palsu di klien (`DeterministicQrMatrix`), dan mekanisme fallback lokal yang melanggar prinsip satu sumber kebenaran (*Single Source of Truth*). |
| `apps/web-admin/src/lib/ticketing-store.ts` | Menghilangkan duplikasi store tiket lokal dan konstanta biaya/katalog di sisi panel admin (`web-admin`) sehingga seluruh data inventaris acara, pesanan, dan ringkasan penjualan hanya bersumber dari `apps/api-server` + Prisma. |
