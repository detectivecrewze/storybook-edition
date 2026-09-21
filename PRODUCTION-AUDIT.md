# PERSIAPAN LIVE PRODUCTION & AUDIT BUG — STORYBOOK EDITION
### Platform: For you, Always. (`storybook-edition`)

---

## 1. MANDAT & TUJUAN

Dokumen ini berisi ruang lingkup dan checklist pengujian menyeluruh (*full bug audit*) untuk memastikan Storybook Edition 100% siap dirilis ke live production.

Fokus pengujian:
- Memastikan tidak ada bug visual maupun fungsional di semua alur (Admin, Studio, dan Gift Pages).
- Memastikan pengalaman pengguna mulus di mobile (terutama iOS Safari dan Android Chrome) serta desktop.
- Memastikan integritas data antara editor pembeli dan tampilan penerima kado.

---

## 2. RUANG LINGKUP AUDIT

### A. Admin Dashboard (`/admin`)
Audit fungsionalitas dan keamanan internal:
- **Authentication Gate**: Keamanan akses admin dan penanganan sesi.
- **Link & Project Generator**: Pembuatan slug/ID kado baru, format tautan studio pembeli, dan keabsahan URL domain produksi.
- **Manajemen Proyek**: Pencarian proyek, filter status (draft vs published), fungsi arsip, pemulihan (restore), dan penghapusan permanen.
- **Storage Cleanup**: Penghapusan media kustom pembeli saat proyek dihapus permanen.

---

### B. Studio Editor (`/studio`) — Alur Pembuatan Kado (Step 01 - 09)
Audit menyeluruh dari perspektif pembeli yang sedang menyusun kado:

1. **Step 01: Occasion & Theme**
   - Pemilihan tema visual dan peralihan styling workspace.
   - Ketahanan tema saat halaman di-refresh (persistensi autosave).
   - Penggantian bahasa antarmuka (ID / EN) tanpa merusak input kustom pembeli.

2. **Step 02: Opening Panels (Cover Story)**
   - Tampilan visual panel default per tema saat pembeli belum mengunggah foto.
   - Alur unggah foto kustom, cropping, dan penggantian/penghapusan gambar.

3. **Step 03: Reasons Why**
   - Proteksi konfirmasi saat mengganti preset/template agar tulisan kustom tidak tertimpa tanpa sengaja.
   - Penambahan, pengeditan, dan penghapusan kartu alasan.
   - Batas minimum dan maksimum kartu yang diizinkan.

4. **Step 04: Memory Archive (Galeri & Video)**
   - Pengunggahan foto dan video polaroid serta rendering preview.
   - Pengeditan judul bab dan subtitle.
   - Dukungan pemformatan baris baru pada caption media.

5. **Step 05: Atlas of us (Peta Kenangan)**
   - Input lokasi via link Google Maps maupun koordinat manual.
   - Validasi data lokasi dan catatan personal pada tiap pin.
   - Penambahan multi-lokasi tanpa ada data yang saling menimpa.
   - Penanganan status aktif/nonaktif bab peta.

6. **Step 06: Our Soundtrack (Koleksi Lagu & Kutipan)**
   - Pemilihan lagu dari katalog dan pemutaran preview audio.
   - Pengunggahan MP3 kustom dan cover art kustom.
   - Pengeditan pesan/kutipan personal per lagu.

7. **Step 07: Letter (Surat Digital)**
   - Input penerima, pesan surat, dan nama pengirim.
   - Proteksi konfirmasi pergantian template surat.

8. **Step 08: Arrange & Finale**
   - Pengaturan urutan bab (reorder) dan toggle aktif/nonaktif bab.
   - Validasi batas minimal bab aktif sebelum diizinkan terbit.
   - Responsivitas tata letak kartu susunan bab pada layar mobile.
   - Preview kartu sambutan (Greeting) dan penutup (Finale).

9. **Step 09: Publish & Review**
   - Validasi pra-penerbitan (kelengkapan data kado).
   - Pencegahan klik ganda saat proses penerbitan.
   - Pembuatan tautan publik kado dan kartu QR resolusi tinggi untuk dicetak/dibagikan.

---

### C. Gift Viewer (`/gift/:id`) — Pengalaman Penerima Kado
Audit visual dan interaksi langsung penerima kado:
- **Gate Screen**: Animasi pembuka kotak kado, interaksi sentuh, dan transisi komik menuju layar sambutan.
- **Greeting Screen**: Tampilan nama penerima, judul momen, dan pesan pembuka.
- **Chapters Menu**: Navigasi bab cerita, artwork karakter pendamping tema, pelacakan status bab yang sudah dibaca, dan status buka-kunci penutup (*Finale*).
- **Modular Chapters**:
  - *Reasons*: Animasi kemunculan kartu alasan dan keterbacaan teks.
  - *Memory Archive*: Swipe/navigasi galeri, pemutaran video, dan tampilan caption.
  - *Atlas of us*: Rendering peta, tur kamera awal (cinematic tour), marker lokasi, framing popup, keterbacaan catatan, dan perilaku saat bab dikunjungi ulang.
  - *Our Soundtrack*: Pemutar audio, visualisasi animasi pemutar musik, kutipan personal, dan pergantian track playlist.
  - *Letter*: Interaksi buka amplop, efek pengetikan surat (*typewriter*), penempatan tanda tangan pengirim, dan opsi lewati animasi.
  - *Finale*: Layar penutup, artwork penutup, pesan perpisahan, dan tombol putar ulang kado (*Replay Story*).

---

### D. Infrastruktur & Backend
- **Endpoint API**: Keandalan endpoint pembuatan draft, autosave, penerbitan, dan pengambilan data publik.
- **Cache Policy**: Pencegahan penyajian data basi (*stale cache*) pada kado yang baru diperbarui.
- **Keamanan & CORS**: Pembatasan akses origin dan validasi skema data masuk.
- **Aset & Performa**: Kelengkapan seluruh aset lokal tanpa dependensi eksternal yang rentan diblokir, serta optimalisasi waktu muat di jaringan seluler.

---

## 3. SKENARIO PENGUJIAN EKSTREM (EDGE CASES)

Pengujian skenario batas yang wajib diverifikasi:
1. **Input Teks Sangat Panjang**: Teks alasan, catatan peta, atau isi surat yang sangat panjang tidak merusak tata letak atau meluap keluar layar.
2. **Karakter Khusus**: Input berisi simbol, tanda petik, karakter non-Latin, atau pemformatan baris baru.
3. **Media Ekstrem**: Foto dengan rasio sangat tinggi/lebar atau resolusi besar tetap ter-crop proporsional tanpa membebani browser.
4. **Koneksi Tidak Stabil / Lambat**: Interaksi tetap responsif, state loading tampil jelas, dan tidak terjadi crash saat request tertunda.
5. **Aksi Cepat Pengguna**: Me-refresh halaman tepat setelah mengedit data, navigasi cepat antar-halaman, atau klik berulang pada tombol aksi.
6. **Autoplay & Audio Policy**: Pemutaran audio kado berjalan mulus sesuai aturan autoplay pada perangkat mobile (iOS Safari & Android).

---

## 4. CHECKLIST KELULUSAN GO-LIVE

Kado Storybook Edition dinyatakan siap rilis ke live production apabila:
- [ ] Seluruh alur pembuatan kado dari Step 01 sampai Step 09 dapat diselesaikan tanpa hambatan.
- [ ] Kado yang diterbitkan tampil presisi dan identik antara preview editor dan link penerima kado.
- [ ] Pengujian visual dan interaksi lulus pada perangkat nyata (iPhone, Android, dan Desktop).
- [ ] Tidak ada error console atau unhandled promise rejection pada browser.
- [ ] Seluruh automated tests proyek lulus 100%.
- [ ] Konfigurasi domain dan environment production sudah terpasang dan terverifikasi.

---

## 5. HASIL PELAKSANAAN AUDIT — 21 SEPTEMBER 2026

### Perbaikan yang sudah diterapkan

- Pretty URL Vercel sekarang meneruskan project ID secara eksplisit ke `/gift?project=:id` dan `/studio?project=:id`, sehingga tidak bergantung pada perilaku rewrite menuju `index.html` saat `cleanUrls` aktif.
- Gift dan Studio mendapat cache policy yang mencegah shell HTML lama tetap tersaji setelah update.
- Header production memakai CSP dan Permissions Policy. `frame-ancestors` membatasi embed ke origin sendiri serta `https://for-you-always.my.id` untuk modal demo storefront; allowlist tidak memakai wildcard.
- GIF Spider-Man tidak lagi bergantung pada Tenor. Aset transparan disimpan lokal dan dioptimasi dari 199 KB menjadi sekitar 54 KB tanpa menghilangkan animasinya.
- CORS Worker production tidak lagi menerima seluruh domain `*.vercel.app`; preview harus memakai environment Worker terpisah.
- Payload JSON Worker dibatasi maksimal 1 MB dan mengembalikan HTTP 413 jika melampaui batas.
- Daftar dan statistik Admin sekarang membaca seluruh halaman KV, termasuk saat proyek melebihi 1.000 record.
- Fallback Atlas tidak lagi membuat link eksternal Google Maps. Saat Leaflet atau tile gagal, nama dan catatan tempat tetap tersedia sebagai daftar statis bertema.
- Pemutar musik menampilkan status yang jelas bila file audio gagal dimuat, tanpa merusak navigasi track.
- README root dan Worker sudah diselaraskan dengan schema 2, sembilan langkah Studio, lima room, Atlas, Batman, dan batas produksi saat ini.

### Verifikasi yang sudah lulus

- `npm run check`: build production dan seluruh automated test lulus.
- Katalog musik: 37 track dan seluruh 74 URL cover/audio merespons sukses pada audit.
- Studio mock: Step 01–09 hanya menampilkan satu panel aktif, tombol preview tersedia pada Step 02–08, dan preview Atlas membuka target room yang benar.
- Modal preview: Escape menutup dialog, menghapus iframe, dan melepas scroll lock.
- Autosave tema: Batman tetap terpilih setelah reload; pengujian dikembalikan ke Spider-Man setelah selesai.
- Gift mock: gate, greeting, menu, pembukaan room Reasons, dan kembali ke menu berfungsi tanpa horizontal overflow.
- Responsive smoke test: Studio dan Gift tidak mengalami horizontal overflow pada 320×700, 390×844, 428×926, dan 1280×800.
- Console QA lokal tidak menampilkan error; warning yang ada hanya penanda bahwa mock upload tidak dikirim ke Worker/R2.
- Endpoint root production dan Worker health merespons HTTP 200. Endpoint data gift pada Worker juga sudah terverifikasi dengan cache `no-store` dan CORS domain produksi.

### Blocker sebelum status go-live

- Deployment frontend yang sedang live belum memuat konfigurasi terbaru: pretty URL `/gift/gift-2cf4f3ec9cf1eb9b` masih HTTP 404, sedangkan fallback query `/gift?project=gift-2cf4f3ec9cf1eb9b` HTTP 200. Header CSP allowlist storefront terbaru juga belum terlihat. Keduanya baru dapat diverifikasi setelah frontend di-deploy ulang.
- Worker perlu di-deploy ulang agar pembatasan payload, pagination Admin, dan allowlist CORS production aktif.
- Secret Cloudflare (`PROJECT_SIGNING_SECRET`, `ADMIN_SECRET`, dan `INTERNAL_GENERATOR_SECRET`) tidak dapat diverifikasi dari repository dan harus dicek langsung di environment Worker sebelum release.
- QA perangkat nyata iPhone Safari dan Android Chrome masih wajib. Browser emulation sudah lulus, tetapi autoplay, safe area, keyboard virtual, cropper, kamera Atlas, upload foto/video/MP3, serta download QR perlu satu pass pada perangkat fisik.
- Katalog musik masih dilayani oleh Worker `arcade-edition`. Seluruh URL hidup saat audit, tetapi ini tetap menjadi dependensi lintas produk. Sebelum trafik penjualan dibuka, putuskan apakah dependensi ini diterima sementara atau medianya dipindah ke storage yang dikelola Storybook.

### Status kelulusan saat ini

Repository Gift sudah lulus build, automated test, lintasan UI lokal, dan hardening yang bisa dilakukan tanpa deployment. Status production masih **belum final** sampai frontend dan Worker terbaru di-deploy, pretty URL serta header diuji ulang pada domain live, dan QA perangkat fisik selesai. Integrasi storefront sebaiknya dimulai setelah seluruh verifikasi di atas ditutup.

---

## 6. AUDIT PAYMENT, FULFILLMENT, DAN EMAIL — 21 SEPTEMBER 2026

### Yang sudah tersedia di source lokal

- Storefront mengirim `product_type: storybook`, `gross_amount`, data pembeli, dan `item_details` ke Pakasir Gateway. Cart mencegah Storybook ditambahkan dua kali.
- Gateway memiliki validasi satu Storybook per checkout, harga item Rp25.000, quantity satu, serta larangan paket tiga kuota.
- Setelah webhook Pakasir berstatus `completed` dan diverifikasi kembali ke API Pakasir, gateway menyiapkan proyek melalui binding `STORYBOOK_WORKER`.
- Generator memakai `source: pakasir` dan idempotency key stabil `<order_id>:storybook`, lalu mengembalikan `studioUrl` dan `giftUrl`.
- Template email Storybook dan kartu Order Status sudah tersedia. Email berisi link Studio Storybook dan link dashboard pesanan.
- Test gateway lulus 16/16 dan build `wrangler deploy --dry-run` berhasil membaca binding `STORYBOOK_WORKER`.

### Status production yang terverifikasi

- Worker Storybook production sehat dan endpoint health merespons HTTP 200.
- Pakasir Gateway production aktif, tetapi deployment terakhir tercatat 28 Agustus 2026; integrasi Storybook baru berada pada working tree lokal tanggal 21 September 2026.
- Storefront production belum memiliki `/catalog/storybook` dan masih merespons HTTP 404.
- Database production belum memiliki order Storybook.
- Gateway production belum memiliki secret `STORYBOOK_GENERATOR_SECRET`, sedangkan Worker Storybook sudah memiliki `INTERNAL_GENERATOR_SECRET`.

### Blocker kritis sebelum checkout dibuka

- `gross_amount` belum dicocokkan dengan jumlah `price × quantity` dari item. Validasi item Storybook dapat lolos sementara total pembayaran dimanipulasi lebih rendah.
- Webhook memverifikasi transaksi memakai `amount` dari payload webhook, tetapi belum mencocokkannya dengan `gross_amount` order yang tersimpan.
- Respons Resend tidak diperiksa dengan `response.ok`. Respons 4xx/5xx dapat dianggap selesai, lalu order tetap ditandai `success`.
- Tidak ada status pengiriman email, retry email, atau idempotency email di database. Webhook berikutnya berhenti pada `Already processed`, sehingga email yang gagal tidak otomatis dikirim ulang.
- Jika generator Storybook gagal, gateway tetap dapat menandai order `success` dengan link error. Endpoint retry admin tersedia, tetapi tidak mengirim ulang email setelah fulfillment pulih.
- Secret payment, email, dan generator masih tersimpan sebagai plaintext di file yang dilacak Git. Seluruh credential terkait wajib dirotasi, dipindahkan ke Cloudflare Secrets, dan dihapus dari riwayat Git sebelum production.

### Kesimpulan payment

Alur otomatis sudah dirancang di source lokal, tetapi **belum terintegrasi di production dan belum aman untuk menerima pembayaran Storybook**. Email memang dijadwalkan otomatis setelah payment terverifikasi dan proyek berhasil dibuat, tetapi belum memiliki jaminan delivery atau retry. Jangan membuka checkout Storybook sebelum validasi total, verifikasi amount, failure state fulfillment, email delivery tracking/retry, rotasi secret, deployment gateway/storefront, dan satu transaksi sandbox end-to-end lulus.
