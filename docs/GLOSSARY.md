# Glosarium Istilah Platform IRVITE (IRVITE Standard Glossary)

Dokumen ini menjadi standar acuan tunggal untuk konsistensi terminologi, teks antarmuka (UI/UX), komunikasi klien, pesan notifikasi, dan penamaan entitas domain di seluruh ekosistem **IRVITE** (`apps/web-invitation`, `apps/web-admin`, dan `apps/api-server`).

---

## 1. Entitas & Istilah Utama (Core Terminology)

| Istilah Bahasa Indonesia | Istilah Bahasa Inggris | Entitas Kode / Basis Data | Definisi & Standar Penggunaan |
|---|---|---|---|
| **Tamu** | Guest | `model Guest` | Individu, keluarga, atau instansi yang diundang ke acara. Memiliki atribut nama lengkap, kategori (VIP, Reguler, Keluarga, Rekan Kerja), kuota kehadiran maksimal (`maxPax`), nomor meja (`tableNumber`), dan nomor WhatsApp. |
| **Undangan** | Invitation | `model Invitation` | Tautan digital personal atau publik dengan kode unik (`uniqueCode`). Menyimpan status pengiriman (`PENDING`, `SENT`, `OPENED`, `CONFIRMED`), statistik pembukaan (`firstOpenedAt`, `lastOpenedAt`, `openCount`), dan QR Code check-in. |
| **Check-in / Presensi** | Attendance / Check-In | `model AttendanceCheckIn` | Pencatatan kedatangan tamu di lokasi acara secara langsung via pemindaian QR Code (Scanner PWA) atau pencarian nama oleh Staf Lapangan. Mencatat stempel waktu kehadiran (`checkInTime`), jumlah orang yang hadir (`paxCheckedIn`), ID perangkat, dan status verifikasi. |
| **Tamu Dadakan** | Walk-in Guest | `isWalkIn: true` | Tamu yang hadir langsung di lokasi acara tanpa tercatat sebelumnya di buku tamu undangan. Didaftarkan secara cepat di meja penerimaan tamu oleh Staf Lapangan dengan status hadir langsung, alokasi pax, dan nomor meja. |
| **Doa & Ucapan** | Wishes / Guestbook | `model Wish` | Pesan doa restu, ucapan selamat, dan konfirmasi kehadiran yang dikirimkan tamu melalui halaman undangan digital. Ditampilkan pada buku tamu digital dan dapat dimoderasi/dihapus oleh Admin melalui dashboard. |
| **Pesanan** | Order | `model Order` | Transaksi pemesanan undangan digital oleh klien. Menyimpan kode referensi (`referenceCode`), nama pemesan, kontak WhatsApp, paket layanan, nilai nominal rupiah (`priceAmount`), bukti pembayaran transfer manual, dan status siklus pesanan. |
| **Paket Layanan** | Subscription Package | `packageCode` | Tingkatan paket fitur undangan digital: **Silver** (Rp 149.000, 3 bulan), **Gold** (Rp 249.000, 6 bulan, QRIS & RSVP), dan **Platinum** (Rp 399.000, 12 bulan, Scanner PWA offline, WhatsApp auto-sender, VIP badge, laporan resmi pasca-acara). |
| **Masa Aktif** | Event Validity Period | `Event.activeUntil` | Batas akhir penayangan undangan digital secara publik (`/i/[code]` dan `/e/[slug]`). Setelah tanggal ini berlalu, halaman otomatis menampilkan status arsip netral tanpa membocorkan privasi atau data personal pengantin/tamu. |
| **Laporan Pasca-Acara** | Post-Event Report | `post-event-exporter` | Dokumen laporan resmi berformat cetak A4/PDF pasca-selesainya acara. Memuat metrik kehadiran total, grafik distribusi kedatangan per jam, daftar tamu VIP hadir, daftar tamu dadakan, dan kompilasi buku ucapan tamu. |

---

## 2. Status Siklus Hidup Pesanan (Order Lifecycle Status)

Setiap pesanan di IRVITE mengikuti alur status terstruktur:

1. `DRAFT`: Pesanan dibuat dari studio kustomisasi atau form registrasi awal, menunggu konfirmasi rincian acara.
2. `AWAITING_PAYMENT`: Pesanan telah dikonfirmasi dan sedang menunggu pembayaran transfer bank / QRIS dari klien.
3. `PAID`: Pembayaran telah diverifikasi oleh tim admin (melalui pengecekan bukti transfer manual).
4. `IN_PROGRESS`: Tim desain atau klien sedang melengkapi konten undangan, galeri foto, cerita cinta, dan daftar tamu.
5. `LIVE`: Undangan telah dipublikasikan dan aktif dapat diakses publik oleh tamu undangan.
6. `COMPLETED`: Acara telah selesai dilaksanakan dan laporan pasca-acara telah digenerate.
7. `CANCELLED`: Pesanan dibatalkan atas permintaan klien atau kedaluwarsa pembayaran.

---

## 3. Tingkatan Peran Pengguna (User Roles & Access Control)

| Peran | Kode Role | Wewenang & Batas Akses |
|---|---|---|
| **Super Admin** | `SUPER_ADMIN` | Akses tingkat tertinggi: manajemen akun admin/klien, pemantauan sistem kesehatan (`system-check`), audit log global, katalog template, dan pengaturan infrastruktur monorepo. |
| **Admin** | `ADMIN` | Pengelola acara: membuat & menyunting acara, mengelola buku tamu, mengunggah bukti bayar, mengubah status pesanan, moderasi doa & ucapan, dan mengunduh laporan acara miliknya. |
| **Staf Lapangan** | `STAFF` | Tim penerima tamu di lokasi (greeter/receptionist): hanya memiliki akses ke Scanner PWA (pemindai QR offline/online), registrasi tamu dadakan, dan monitor kedatangan langsung. Dilarang mengakses pengaturan sensitif atau laporan keuangan. |

---

## 4. Panduan Penulisan UI (UI Copywriting Guidelines)

1. **Gunakan Bahasa Indonesia yang Sopan dan Jelas**:
   - Gunakan istilah baku: "Unduh Tiket", "Salin Tautan", "Pindai Kode QR", "Doa & Ucapan", "Tamu VIP".
   - Hindari mencampur istilah Inggris-Indonesia tanpa alasan (contoh: gunakan "Presensi Kehadiran" atau "Check-in", bukan "Attendance Checkin Record").
2. **Keamanan & Etika WhatsApp**:
   - Selalu edukasi pengguna bahwa pesan undangan dibuka langsung di aplikasi WhatsApp resmi milik pengantin/penyelenggara.
   - Hindari kata "Blast Otomatis" tanpa peringatan; gunakan istilah **"Asisten Kirim Cepat WhatsApp"** dengan jeda aman anti-spam Meta.
3. **Privasi Tamu**:
   - Jangan pernah menampilkan nomor telepon atau alamat pribadi tamu di halaman publik.
   - Halaman undangan yang telah kedaluwarsa harus tampil netral ("Masa Aktif Undangan Telah Berakhir") tanpa menampilkan nama atau foto mempelai.

