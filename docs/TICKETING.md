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
| `TICKET_QR_SECRET` | `apps/api-server` | Rahasia HMAC-SHA256 (minimal 32 karakter) untuk menandatangani dan memverifikasi payload QR tiket `v1.<ticketId>.<hmac>`. |
| `PAYMENT_WEBHOOK_SECRET` | `apps/api-server` | Rahasia HMAC-SHA256 untuk memverifikasi header signature `x-payment-signature` pada endpoint webhook pembayaran. |
| `PAYMENT_MODE` | `apps/api-server` | Mode layanan pembayaran (`mock` atau `gateway`). `MockPaymentService` hanya aktif jika `PAYMENT_MODE=mock` **dan** `NODE_ENV !== 'production'`. |
| `DEFAULT_SERVICE_FEE_BPS` | `apps/api-server` | Tarif biaya layanan default dalam basis poin (`0..1000`, default `350` = 3,5%). |
| `VA_MIN_TOTAL_IDR` | `apps/api-server` | Batas minimum total tagihan Rupiah agar metode Virtual Account (`VA_*`) diizinkan (default `150000`). |
| `ORDER_EXPIRY_MINUTES` | `apps/api-server` | Durasi masa berlaku pesanan `PENDING` sebelum kedaluwarsa (default `30` menit). |
| `CRON_SECRET` | `apps/api-server` | Token rahasia internal untuk mengotorisasi `POST /ticketing/cron/expire-orders`. |
| `INTERNAL_API_URL` | `web-invitation`, `web-admin` | URL internal `apps/api-server` (default `http://localhost:3000`) yang dituju oleh proxy BFF `/api/ticketing`. |
| `NEXT_PUBLIC_ENABLE_TICKETING` | `web-invitation` | Sakelar fitur modul tiket di frontend (`true` untuk mengaktifkan `/tiket` dan `/partnership`). |

---

## 4. Alur Operasional End-to-End

1. **Pengajuan Acara oleh EO ("Terima Beres")**
   - EO mengisi formulir kerja sama di `/partnership` → `POST /api/ticketing` (`action: 'submit-inquiry'`) → `POST /api/v1/ticketing/public/inquiries` → tersimpan di tabel `eo_inquiries`.
2. **Pembuatan & Publikasi Acara oleh Admin IRVITE**
   - Admin masuk ke `web-admin`, membuat acara beserta kategori tiket (`POST /api/v1/ticketing/events`), lalu memublikasikannya (`POST /api/v1/ticketing/events/:eventId/publish`).
3. **Katalog Publik & Checkout Tanpa Wajib Akun**
   - Pembeli membuka `/tiket`, melihat daftar acara `PUBLISHED` dari `GET /api/v1/ticketing/events` (atau *empty state* jujur bila belum ada acara).
   - Pembeli memilih kategori tiket dan jumlah (`1..maxPerOrder`), mengisi nama, email, dan nomor WhatsApp Indonesia, lalu menekan **Buat pesanan tiket** (`POST /api/v1/ticketing/checkout`).
   - Di dalam satu transaksi database (`prisma.$transaction`), server menahan kuota secara atomik (`sold_count + qty <= quota`), menghitung `subtotal`, `serviceFee`, `taxAmount`, dan `totalAmount` dalam **`Int` Rupiah**, menyimpan `accessTokenHash` (SHA-256), dan mengembalikan `orderCode` beserta `accessToken` satu kali kepada pembeli.
4. **Konfirmasi Pembayaran & Penerbitan Tiket**
   - Gateway pembayaran mengirimkan webhook ke `POST /api/v1/ticketing/webhooks/payment` dengan header `x-payment-signature`.
   - Setelah signature HMAC terverifikasi, pesanan ditandai `PAID` dan `IssuedTicket` dibuat beserta payload QR `v1.<ticketId>.<hmac>`.
5. **Verifikasi Pesanan & Pemindaian Gerbang (Check-in)**
   - Pembeli memeriksa status pesanan dan kode QR tiket di tab **Cek pesanan dan tiket** (`/tiket`) menggunakan `orderCode` dan `accessToken` (`GET /api/v1/ticketing/orders/:orderCode?accessToken=...`).
   - Pada hari acara, petugas (`SUPER_ADMIN`, `ADMIN`, atau `STAFF`) memindai QR melalui `POST /api/v1/ticketing/check-in`. Server memverifikasi HMAC `v1.<ticketId>.<hmac>`, memastikan tiket berstatus `ISSUED`, menandai `CHECKED_IN`, dan mencatat log ke `ticket_check_in_logs`.

---

## 5. Daftar File yang Dihapus Beserta Alasannya

| File yang Dihapus | Alasan Penghapusan |
| --- | --- |
| `apps/web-invitation/src/lib/ticketing-store.ts` | Menghilangkan penyimpanan state/store tiket di sisi frontend (`web-invitation`), termasuk data dummy awal (`INITIAL_EVENTS`), pembuatan matriks QR palsu di klien (`DeterministicQrMatrix`), dan mekanisme fallback lokal yang melanggar prinsip satu sumber kebenaran (*Single Source of Truth*). |
| `apps/web-admin/src/lib/ticketing-store.ts` | Menghilangkan duplikasi store tiket lokal dan konstanta biaya/katalog di sisi panel admin (`web-admin`) sehingga seluruh data inventaris acara, pesanan, dan ringkasan penjualan hanya bersumber dari `apps/api-server` + Prisma. |
