# Rencana Migrasi Database Produksi (`feature/wedding-packages`)

Dokumen operasional ini menjelaskan prosedur pemeriksaan status migrasi, *baselining* (bila tabel `_prisma_migrations` belum terisi), latihan (*dry-run*) di MySQL lokal, evaluasi peran `migrate-deploy-safe.cjs`, serta urutan rilis dan *rollback* untuk branch `feature/wedding-packages`.

> **Aturan Keamanan Operasional**
> - Seluruh pengujian dan simulasi wajib dijalankan terhadap **MySQL lokal** (hasil *restore* dump).
> - Jangan menjalankan perubahan skema di produksi sebelum backup terverifikasi.

---

## a) Cara Memeriksa Status Migrasi Produksi (Read-Only)

Jalankan langkah *read-only* berikut dari mesin operator yang memiliki akses baca ke database produksi:

1. **Periksa isi tabel `_prisma_migrations` (SQL Read-Only)**:
   ```sql
   -- Cek apakah tabel _prisma_migrations sudah ada
   SHOW TABLES LIKE '_prisma_migrations';

   -- Jika ada, tampilkan seluruh riwayat migrasi beserta statusnya
   SELECT
     migration_name,
     started_at,
     finished_at,
     applied_steps_count,
     LEFT(COALESCE(logs, ''), 200) AS error_log_preview
   FROM `_prisma_migrations`
   ORDER BY started_at ASC;
   ```
   - Pastikan **tidak ada** baris dengan `finished_at IS NULL` (migrasi menggantung/gagal).
   - Pastikan migrasi `20261124074000_remove_event_content_media_fallback` **tidak pernah dijalankan** atau bila tercatat hanya merupakan versi `SELECT 1;` (cek apakah `events.content` masih menyimpan `_mediaFallback` bila relevan).

2. **Periksa status sinkronisasi direktori migrasi dengan `prisma migrate status` (Read-Only)**:
   ```bash
   npx prisma@5.22.0 migrate status --schema=packages/database/prisma/schema.prisma
   ```
   Perintah ini hanya membaca tabel `_prisma_migrations` dan membandingkannya dengan daftar folder di `packages/database/prisma/migrations/` tanpa mengubah skema.

---

## b) Skenario A: `_prisma_migrations` Ada dan Lengkap Sampai Migrasi Tertentu

Apabila tabel `_prisma_migrations` sudah ada di database produksi, seluruh migrasi lama tercatat `finished_at IS NOT NULL`, dan `prisma migrate status` hanya melaporkan migrasi-migrasi baru dari branch ini sebagai *"Following migration(s) have not yet been applied"*:

1. Pastikan backup database telah diambil dan diverifikasi (lihat Bagian d & f).
2. Jalankan `prisma migrate deploy`:
   ```bash
   npx prisma@5.22.0 migrate deploy --schema=packages/database/prisma/schema.prisma
   ```
3. Jalankan kembali `npx prisma@5.22.0 migrate status --schema=packages/database/prisma/schema.prisma` dan pastikan outputnya:
   ```text
   Database schema is up to date!
   ```

---

## c) Skenario B: `_prisma_migrations` Tidak Ada atau Kosong (Prosedur Baselining)

Jika database produksi selama ini dibangun menggunakan `prisma db push` atau `migrate-deploy-safe.cjs` sehingga tabel `_prisma_migrations` belum ada atau belum lengkap:

### 1. Bandingkan Skema Produksi dengan `schema.prisma` (`prisma migrate diff`)
Jalankan perbandingan *read-only* dari database terhadap `packages/database/prisma/schema.prisma`:
```bash
npx prisma@5.22.0 migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel packages/database/prisma/schema.prisma \
  --script > /tmp/prod_to_target_diff.sql
```
Selain itu, cek keberadaan kolom/tabel kunci di database produksi secara langsung (read-only):
```sql
SHOW COLUMNS FROM `guests` LIKE 'is_walk_in';
SHOW INDEX FROM `guests` WHERE Key_name = 'guests_event_id_phone_number_key';
SHOW TABLES LIKE 'guests_migration_audit';
SHOW COLUMNS FROM `orders` WHERE Field IN ('options', 'pricing_version');
```

### 2. Tandai Migrasi yang Efeknya SUDAH Ada di Produksi (`prisma migrate resolve --applied`)
Untuk setiap migrasi historis (mulai dari `0_init` sampai `20261124063000_retain_orders_and_activity_logs_on_event_delete`) yang tabel/kolomnya **sudah ada** di database produksi, tandai sebagai sudah diterapkan tanpa mengeksekusi ulang SQL-nya:
```bash
for mig in \
  0_init \
  1_add_auth_user_status \
  20260827230000_attendance_integrity_staff_event \
  20260913193000_event_content_and_media_slot \
  20260920104500_attendance_check_ins_audit \
  20260920121000_template_lifecycle_and_event_template_restrict \
  20261007220000_template_assets \
  20261010090000_template_asset_restrict \
  20261103235500_add_guest_table_number \
  20261111220000_add_event_wishes \
  20261113170500_add_offline_sync_ops \
  20261113180000_add_orders_and_event_expiry \
  20261113190000_add_activity_logs \
  20261113200000_add_invitation_open_stats \
  20261124060000_backfill_event_client_portal_key \
  20261124063000_retain_orders_and_activity_logs_on_event_delete
do
  npx prisma@5.22.0 migrate resolve --applied "$mig" --schema=packages/database/prisma/schema.prisma
done
```
*(Catatan:
- Jika salah satu dari migrasi di atas ternyata belum ada efeknya di produksi berdasarkan `migrate diff`, jangan di-`resolve --applied` agar ikut dieksekusi oleh `migrate deploy`.
- `20261124060000_backfill_event_client_portal_key` adalah migrasi data-saja (mengisi `$.clientKey` pada `events.content`), sehingga **tidak terdeteksi oleh `prisma migrate diff`**. Namun migrasi pemulihan `20261127105500_reconcile_audit_table_client_key_v2_and_walkin` akan tetap membuat `clientKey` baru untuk event yang `clientKey`-nya masih kosong.
- `20261124063000_retain_orders_and_activity_logs_on_event_delete` mengubah foreign key `orders.event_id` dan `activity_logs.event_id` menjadi `ON DELETE SET NULL`; periksa `SHOW CREATE TABLE orders;` dan `SHOW CREATE TABLE activity_logs;` sebelum menandainya `--applied`.
- Seluruh prosedur baselining Skenario B **wajib dilatih terlebih dahulu pada salinan dump di MySQL lokal**.)*

### 3. Urutan dan Risiko 6 Migrasi Baru (Jalankan via `prisma migrate deploy`)

Setelah migrasi historis di-*baseline*, jalankan `npx prisma@5.22.0 migrate deploy --schema=packages/database/prisma/schema.prisma` untuk mengeksekusi 6 migrasi baru secara berurutan:

| Urutan | Nama Migrasi | Perubahan Skema / Data | Risiko & Mitigasi |
| :--- | :--- | :--- | :--- |
| **1** | `20261124071000_add_guest_is_walk_in` | `ALTER TABLE guests ADD COLUMN is_walk_in BOOLEAN NOT NULL DEFAULT false;` + backfill `is_walk_in = true` untuk tamu `ON_THE_SPOT` ber-`attendance` dengan `COUNT(attendance_check_ins) = 1` dan tanpa RSVP. | **Risiko**: Gagal dengan `Duplicate column name 'is_walk_in'` bila kolom sudah pernah ditambah manual.<br>**Mitigasi**: Cek `SHOW COLUMNS FROM guests LIKE 'is_walk_in'` sebelum deploy. Bersifat *additive* (`DEFAULT false`). |
| **2** | `20261124072000_rotate_uuid_client_portal_keys` | Merotasi `events.content.$.clientKey` yang belum memiliki `$.clientKeyVersion = 2` menjadi 24-hex acak baru (`RANDOM_BYTES(12)`) dan menandai `$.clientKeyVersion = 2`. | **Risiko**: Mengganti URL portal pengantin (`/kelola/[eventId]~[clientKey]`) untuk event aktif yang belum bertanda `clientKeyVersion = 2`.<br>**Mitigasi**: Catat daftar `(id, slug, clientKey)` sebelum migrasi atau bagikan ulang tautan portal dari dashboard admin jika pengantin sedang aktif mengakses link lama. *(Catatan: bila database sudah pernah menjalankan `20261124072000` versi lama, migrasi ini tidak jalan ulang dan rekonsiliasi ditangani oleh `20261127105500`).* |
| **3** | `20261124073000_guest_category_and_unique_event_phone` | Membuat tabel `guests_migration_audit`; menormalisasi `guests.category` ke 9 kategori kanonis (`REGULAR`, `VIP`, `VVIP`, `FAMILY`, `FAMILY_GROOM`, `FAMILY_BRIDE`, `FRIEND`, `COLLEAGUE`, `ON_THE_SPOT`); menormalisasi `phone_number` (menghapus spasi/tanda hubung/titik/kurung, mengubah `08...`/`8...` ke `628...`); **mengosongkan (`NULL`) nomor HP duplikat dalam satu event yang sama** pada baris yang dibuat belakangan; membuat `UNIQUE INDEX guests_event_id_phone_number_key (event_id, phone_number)`. | **Risiko**: Tamu kedua dst. yang memiliki nomor HP sama persis di satu event akan kehilangan `phone_number` (`NULL`), dan kategori non-standar diubah ke `REGULAR`.<br>**Mitigasi**: Seluruh nilai asli (`old_category`, `old_phone_number`, `change_reason`: `CATEGORY_NORMALIZED`, `PHONE_NORMALIZED`, `PHONE_DEDUP_CLEARED`) disimpan di tabel `guests_migration_audit` sebelum `UPDATE` sehingga dapat dipulihkan kapan saja. |
| **4** | `20261124075000_backfill_walk_in_zero_check_ins` | Backfill `is_walk_in = true` untuk tamu `ON_THE_SPOT` yang punya `attendance` namun `0` baris `attendance_check_ins` dan belum berstatus `RSVP_YES`/`RSVP_NO`. | **Risiko**: Rendah (idempoten, hanya mengubah `is_walk_in = true` pada walk-in lama). |
| **5** | `20261126120000_add_order_options_and_pricing_version` | `ALTER TABLE orders ADD COLUMN options JSON NULL, ADD COLUMN pricing_version INT NOT NULL DEFAULT 1;` | **Risiko**: Gagal bila kolom `options` / `pricing_version` sudah ada.<br>**Mitigasi**: Bersifat *additive* murni; order lama (`SILVER`/`GOLD`/`PLATINUM`) tetap memiliki `options = NULL` dan tidak dibatasi kuota tamunya. |
| **6** | `20261127105500_reconcile_audit_table_client_key_v2_and_walkin` | Memastikan `guests_migration_audit` ada (`CREATE TABLE IF NOT EXISTS`); merotasi `clientKey` **hanya** bila kosong atau cocok regex UUID v1 (`^[0-9a-f]{12}1[0-9a-f]{3}[89ab][0-9a-f]{7}$`) dan belum `clientKeyVersion = 2`; memberi stempel `clientKeyVersion = 2` tanpa merotasi untuk `clientKey` non-UUID-v1; mem-backfill `is_walk_in = true` untuk tamu `ON_THE_SPOT` ber-`attendance` dengan `0` baris `attendance_check_ins` (termasuk yang berstatus `RSVP_YES`). | **Risiko**: Rendah (idempoten penuh, menyamakan state baik untuk DB yang baru menjalankan migrasi maupun DB yang sempat menjalankan versi awal `20261124072000`/`20261124073000`). |

---

## d) Prosedur Latihan (Dry-Run) dengan Dump di MySQL Lokal

Sebelum menyentuh produksi, lakukan latihan penuh di MySQL lokal dengan urutan berikut:

### 1. Buat Dump dari Database Produksi
```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  -h "$PROD_DB_HOST" -P "$PROD_DB_PORT" -u "$PROD_DB_USER" -p \
  "$PROD_DB_NAME" > prod_backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Restore Dump ke MySQL Lokal
```bash
mysql -h 127.0.0.1 -u root -p -e "DROP DATABASE IF EXISTS irvite_prod_rehearsal; CREATE DATABASE irvite_prod_rehearsal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h 127.0.0.1 -u root -p irvite_prod_rehearsal < prod_backup_YYYYMMDD_HHMMSS.sql
```

### 3. Catat Baseline Sebelum Migrasi di MySQL Lokal
```sql
SELECT COUNT(*) AS total_guests,
       SUM(CASE WHEN phone_number IS NOT NULL THEN 1 ELSE 0 END) AS guests_with_phone
FROM `guests`;

SELECT category, COUNT(*) AS cnt FROM `guests` GROUP BY category;

SELECT id, slug,
       JSON_UNQUOTE(JSON_EXTRACT(content, '$.clientKey')) AS client_key,
       JSON_UNQUOTE(JSON_EXTRACT(content, '$.clientKeyVersion')) AS client_key_version
FROM `events`;

SELECT COUNT(*) AS total_orders, package_code, SUM(price_amount) AS total_amount
FROM `orders`
GROUP BY package_code;
```

### 4. Jalankan Rencana Migrasi (Skenario A atau Skenario B) terhadap `irvite_prod_rehearsal`
```bash
DATABASE_URL="mysql://root:PASSWORD@127.0.0.1:3306/irvite_prod_rehearsal" \
  npx prisma@5.22.0 migrate deploy --schema=packages/database/prisma/schema.prisma
```

### 5. Verifikasi Hasil dengan Query Pasca-Migrasi
```sql
-- 1. Pastikan jumlah total tamu tidak berubah dan cek berapa tamu yang masuk audit
SELECT COUNT(*) AS total_guests,
       SUM(CASE WHEN is_walk_in = 1 THEN 1 ELSE 0 END) AS walk_in_guests,
       SUM(CASE WHEN phone_number IS NOT NULL THEN 1 ELSE 0 END) AS guests_with_phone
FROM `guests`;

-- 2. Periksa rincian perubahan kategori & nomor HP yang tercatat di tabel audit
SELECT change_reason, COUNT(*) AS affected_rows
FROM `guests_migration_audit`
GROUP BY change_reason;

SELECT guest_id, event_id, old_category, old_phone_number, change_reason
FROM `guests_migration_audit`
WHERE change_reason LIKE '%PHONE_DEDUP_CLEARED%';

-- 3. Pastikan seluruh kategori tamu kini berada dalam 9 nilai kanonis
SELECT category, COUNT(*) AS cnt
FROM `guests`
GROUP BY category;

-- 4. Pastikan seluruh event memiliki clientKey 24-hex dan clientKeyVersion = 2
SELECT id, slug,
       JSON_UNQUOTE(JSON_EXTRACT(content, '$.clientKey')) AS client_key,
       JSON_UNQUOTE(JSON_EXTRACT(content, '$.clientKeyVersion')) AS client_key_version
FROM `events`;

-- 5. Pastikan seluruh order lama utuh dan kolom options + pricing_version tersedia
SELECT id, reference_code, package_code, price_amount, options, pricing_version
FROM `orders`
ORDER BY created_at DESC;
```

---

## e) Peran `apps/api-server/scripts/migrate-deploy-safe.cjs` (`npm run db:migrate`)

1. **Bukan `prisma migrate`**:
   `apps/api-server/scripts/migrate-deploy-safe.cjs` **tidak** membaca folder `packages/database/prisma/migrations/*` dan **tidak** mencatat apa pun ke tabel `_prisma_migrations`. Skrip ini hanya mengeksekusi 9 langkah DDL hardcoded lama (`guests.table_number`, `wishes`, `offline_sync_ops`, `events.active_until`, tabel `orders` versi awal tanpa `options`/`pricing_version`, `activity_logs`, dan `invitations.*_opened_at`) serta menghapus baris yatim di `orders`/`wishes`/`offline_sync_ops`.
2. **Kapan Boleh / Tidak Boleh Dipakai**:
   - **TIDAK BOLEH** dijadikan pengganti `npx prisma@5.22.0 migrate deploy` karena tidak akan pernah menerapkan migrasi baru (`guests.is_walk_in`, `guests_migration_audit`, unique index `(event_id, phone_number)`, `orders.options`, `orders.pricing_version`, maupun rotasi `clientKey`).
   - **BOLEH** dijalankan hanya sebagai pemeriksaan *smoke* konektivitas pasca-migrasi (karena seluruh DDL di dalamnya bersifat `IF NOT EXISTS` / mengabaikan `Duplicate column`), tetapi redundant bila `prisma migrate deploy` sudah digunakan.
3. **Keputusan Operasional (`migrate-deploy-safe.cjs`)**:
   - **Sekarang**: Biarkan `migrate-deploy-safe.cjs` apa adanya, dan **jangan** menggunakan `npm run db:migrate` untuk menjalankan migrasi baru. Gunakan `npx prisma@5.22.0 migrate deploy --schema=packages/database/prisma/schema.prisma`.
   - **Setelah Produksi Berhasil Di-baseline**: Pensiunkan DDL hardcoded di `migrate-deploy-safe.cjs` dan ganti script `"db:migrate"` di `apps/api-server/package.json` menjadi `prisma migrate deploy`.

---

## f) Urutan Rilis ke Produksi & Rencana Rollback

### Urutan Rilis
1. **Backup Database Produksi**:
   Ambil full dump `mysqldump --single-transaction` dan pastikan file dump tidak kosong serta sudah diuji *restore* di MySQL lokal.
2. **Jalankan Migrasi Database Produksi (Sebelum Merge PR)**:
   Jalankan `npx prisma@5.22.0 migrate deploy --schema=packages/database/prisma/schema.prisma` dari mesin operator terhadap database produksi, lalu verifikasi dengan query pada Bagian (d.5).
   - **Mengapa aman dijalankan sebelum merge**: Seluruh perubahan skema (`guests.is_walk_in DEFAULT false`, `orders.options NULL`, `orders.pricing_version DEFAULT 1`, tabel baru `guests_migration_audit`, dan index unik `(event_id, phone_number)`) bersifat **additive / backward-compatible**, sehingga kode produksi yang sedang berjalan di `main` tetap berfungsi normal selama jeda antara selesainya migrasi dan selesainya deploy Vercel.
   - **Perhatian Rotasi `clientKey`**: Rotasi `clientKey` (untuk kunci lama berpola UUID v1) terjadi **pada saat migrasi dijalankan** (sebelum merge PR). Artinya, URL portal klien (`/kelola/[eventId]~[clientKey]`) untuk event yang terdampak langsung berubah saat itu juga. Siapkan pemberitahuan *"link portal diperbarui"* bagi klien yang sedang aktif menggunakan portal.
3. **Merge PR `feature/wedding-packages` ke `main` & Pantau Deploy Vercel**:
   - Pastikan deployment **`irvite-api`** berstatus **Ready** dan endpoint `/health` serta `/health/db` (atau `/templates/public/availability`) merespons `200 OK` tanpa error `"Cannot find module 'pricing'"`.
   - Pastikan deployment **`web-invitation`** dan **`web-admin`** berstatus **Ready**.
4. **Rebase & Merge `chore/next-security-upgrade` (Terpisah Setelah Rilis Paket Stabil)**:
   Setelah rilis paket pernikahan terverifikasi stabil di produksi, rebase branch `chore/next-security-upgrade` di atas `main` terbaru, jalankan `test:unit` dan `build`, lalu merge dalam PR terpisah.

### Prosedur Rollback
1. **Rollback Aplikasi (Tanpa Restore DB)**:
   Karena migrasi database bersifat *additive* (menambah kolom dengan nilai default/nullable dan tabel audit baru), apabila ditemukan regresi pada kode aplikasi di `irvite-api`, `web-invitation`, atau `web-admin`, Anda dapat langsung melakukan **Instant Rollback** ke deployment sebelumnya di dashboard Vercel **tanpa** harus membatalkan kolom `is_walk_in`, `options`, atau `pricing_version`.
   - *Catatan Indeks Unik*: Indeks unik `guests_event_id_phone_number_key` (`(event_id, phone_number)`) tetap aktif di database kecuali di-drop manual (`DROP INDEX guests_event_id_phone_number_key ON guests;`). Kode lama yang mencoba membuat dua tamu dengan nomor HP sama di satu event akan ditolak oleh indeks unik tersebut.
2. **Pemulihan Data Tamu Selektif dari `guests_migration_audit`**:
   Jika ada nomor HP atau kategori tamu tertentu yang perlu dikembalikan ke nilai sebelum normalisasi tanpa merestore seluruh database:
   ```sql
   -- Contoh melihat data asli tamu dari tabel audit
   SELECT * FROM `guests_migration_audit` WHERE `event_id` = '<EVENT_ID>';
   ```
3. **Rollback Database Penuh (Kondisi Darurat)**:
   Jika terjadi kegagalan fatal pada level database saat jendela migrasi, lakukan restore dari file `prod_backup_YYYYMMDD_HHMMSS.sql` yang diambil pada Langkah 1.
