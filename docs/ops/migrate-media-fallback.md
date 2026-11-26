# Prosedur Manual Migrasi `_mediaFallback` (`Event.content`) ke Penyimpanan Media

> **PENTING (Kritis — Pencegahan Kehilangan Foto):**
> Jangan pernah menghapus `$._mediaFallback` dari kolom `events.content` melalui migrasi SQL otomatis (`JSON_REMOVE`)! Menghapus `_mediaFallback` lewat SQL sebelum file fisik terverifikasi di Vercel Blob / disk lokal akan menyebabkan foto undangan hilang permanen apabila `BLOB_READ_WRITE_TOKEN` belum terpasang atau penulisan file gagal.

---

## 1. Mengapa Dipindahkan dari Migrasi Otomatis & `onModuleInit`

1. **Migrasi SQL Otomatis Dihapus dari Jalur `prisma migrate deploy`**:
   - Sebelumnya, migrasi `20261124074000_remove_event_content_media_fallback` menjalankan `JSON_REMOVE(content, '$._mediaFallback')` langsung di MySQL saat *deploy*, sebelum aplikasi sempat menyalin isi base64 ke `MediaStorageService`.
   - Migrasi SQL tersebut telah dihapus dari `packages/database/prisma/migrations/` dan digantikan oleh skrip operasional sekali jalan (`apps/api-server/scripts/migrate-media-fallback.ts`).
2. **Dikeluarkan dari `EventsService.onModuleInit`**:
   - Memuat seluruh kolom `events.content` saat startup server berisiko menghabiskan memori ketika terdapat blob base64 berukuran besar, serta berisiko menulis ke `/tmp` yang bersifat sementara (*ephemeral*) di Vercel jika `BLOB_READ_WRITE_TOKEN` belum dikonfigurasi.

---

## 2. Langkah Eksekusi Manual (`migrate-media-fallback.ts`)

### Prasyarat
1. Pastikan variabel lingkungan `DATABASE_URL` mengarah ke database target.
2. Pada lingkungan **production** atau **Vercel**, variabel `BLOB_READ_WRITE_TOKEN` **wajib** terisi. Skrip akan otomatis membatalkan eksekusi (*abort*) jika dijalankan di production/Vercel tanpa `BLOB_READ_WRITE_TOKEN`.

### Menjalankan Skrip
Dari direktori `apps/api-server`:

```bash
npx ts-node scripts/migrate-media-fallback.ts
```

### Cara Kerja Skrip
1. Mengambil daftar `id` event terlebih dahulu (`SELECT id FROM events ORDER BY created_at ASC`), lalu memproses **satu event per satu waktu** tanpa memuat seluruh `content` sekaligus ke memori.
2. Untuk setiap entri `[storageKey, base64]` di dalam `content._mediaFallback`:
   - Menulis buffer ke `MediaStorageService.writeFile(storageKey, buffer)`.
   - **Memverifikasi file telah tertulis** menggunakan `head(storageKey)` (untuk Vercel Blob) serta `ensureFileLocal(storageKey)` + pemeriksaan ukuran byte (`stat.size === buffer.length`) **sebelum** menghapus `storageKey` dari `_mediaFallback`.
   - Jika verifikasi gagal, key tersebut **tetap dipertahankan** di `_mediaFallback` dan dicatat sebagai kegagalan (`[FAIL]`) agar foto tidak hilang.
3. Mencatat ringkasan akhir: `scannedEvents`, `migratedEvents`, `migratedFiles`, dan `failedFiles`.
