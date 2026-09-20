# 📋 DIREKTIF OPERASIONAL: PERSIAPAN LIVE PRODUCTION & FULL BUG AUDIT
### Platform: **For you, Always.** — Digital Atelier
### Produk: **Storybook Edition** (`storybook-edition`)
### Target Agent: **Lead Production Auditor & QA Specialist**

---

## 1. MISI & TANGGUNG JAWAB AGENT

Dokumen ini adalah **mandat instruksi resmi** untuk kamu sebagai AI Agent yang ditugaskan menyiapkan **Storybook Edition** menuju tahap **Live Production**. 

Tugas utamamu adalah melakukan **audit menyeluruh (*deep comprehensive audit*)** tanpa kompromi, memburu bug tersembunyi, menguji skenario ekstrem (*edge cases*), dan memastikan seluruh alur dari **Admin Dashboard**, **Studio Editor (Step 01–09)**, hingga **Gift Pages** berjalan 100% mulus, stabil, dan bebas cacat visual maupun fungsional.

### Prinsip Eksekusi Wajib
1. **Zero Assumption**: Uji setiap asumsi langsung pada kode, logika skema, dan alur interaksi.
2. **Zero Regression**: Setiap perbaikan tidak boleh merusak 42 test suites yang sudah ada (`npm run check` wajib selalu 42/42 passing).
3. **No Trial-and-Error**: Selalu cari akar masalah (*root cause*) sebelum menyentuh kode.
4. **Commit Hygiene**: Lakukan commit terstruktur dengan format konvensional (`fix(...)`, `feat(...)`, `refactor(...)`) dan selalu push ke branch `main`.

---

## 2. PANDUAN AUDIT LENGKAP PER LAPISAN APLIKASI

Lakukan audit dan pengujian mendalam pada setiap komponen berikut:

```
+-----------------------------------------------------------------------------------+
| 1. ADMIN DASHBOARD (/admin)                                                       |
|    - Secret Auth Gate, Project Generator, Link Formatter, KV Storage Management   |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 2. STUDIO EDITOR (/studio) — 9 STEPS WIZARD                                       |
|    - Autosave Debounce, Dynamic Theming, Previews, Presets, Validation, Publishing|
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
| 3. GIFT VIEWER (/gift/:id) — PUBLIC RECIPIENT EXPERIENCE                          |
|    - Gate Box, 3D Transition, Greeting, Chapters Menu, 5 Modular Rooms, Finale    |
+-----------------------------------------------------------------------------------+
                                         ^
                                         |
+-----------------------------------------------------------------------------------+
| 4. BACKEND & INFRASTRUKTUR (Cloudflare Worker + KV + R2 + Vercel Static)          |
|    - Schema Validation, Cache Invalidation, CORS, Error Handling, Asset Budgets  |
+-----------------------------------------------------------------------------------+
```

---

### AREA 1: ADMIN DASHBOARD (`/admin`)

Periksa file `admin/app.js`, `admin/index.html`:

| No | Komponen Uji | Hal yang Harus Di-audit & Dipastikan | Status Target |
|---|---|---|---|
| 1.1 | **Authentication Gate** | Pastikan akses admin membutuhkan `ADMIN_SECRET` yang aman, dan penolakan kredensial salah memberikan pesan ramah tanpa membocorkan log server. | [ ] PASS |
| 1.2 | **Project Link Generator** | Generator membuat slug acak aman (`/studio?id=...`), ID tersimpan rapi di KV, dan link studio yang di-copy ke clipboard formatnya sudah mengarah ke domain produksi yang benar. | [ ] PASS |
| 1.3 | **Daftar & Pencarian Proyek** | Tabel list membedakan status `draft` vs `published`, fitur search berfungsi mencari nama penerima/pengirim, dan fungsi restore/delete tidak menimbulkan *orphaned files* di storage. | [ ] PASS |
| 1.4 | **Batch Cleanup R2 Media** | Saat proyek dihapus permanen oleh admin, pastikan file gambar/audio kustom pembeli ikut terhapus dari R2 untuk menghemat kuota. | [ ] PASS |

---

### AREA 2: STUDIO EDITOR (`/studio`) — AUDIT PER LANGKAH (STEP 01 - 09)

Periksa file `studio/app.js`, `studio/index.html`, `studio/styles.css`, `shared/project.js`, `shared/themes.js`:

#### Step 01: Occasion & Theme
- [ ] **Seleksi Tema**: Pilihan tema (Spider-Man vs Batman) mengubah seluruh CSS variabel workspace secara instan (`applyStudioTheme()`) tanpa menimpa background form secara agresif.
- [ ] **Persistensi Autosave**: Setelah tema diubah dan browser langsung di-refresh (`F5`), tema yang dipilih TIDAK boleh kembali ke default.
- [ ] **Aksesibilitas**: Atribut `aria-pressed="true"` terpasang akurat pada tombol tema aktif.
- [ ] **Bilingual Switcher**: Dropdown bahasa (ID/EN) default ke English (`en`) untuk pengguna baru, dan mengubah bahasa tidak merusak teks kustom pengguna.

#### Step 02: Opening Panels (Cover Story)
- [ ] **Default Fallback**: Saat belum mengunggah foto, 4 panel default komik (baik Spider-Man maupun Batman) tampil proporsional di pratinjau thumbnail.
- [ ] **Upload & Crop**: Pengunggahan foto kustom (file picker, batas ukuran 8 MB) otomatis membuka modal crop rasio komik dan menghasilkan URL tersimpan di `draft.opening.panels[]`.
- [ ] **Hapus & Ganti**: Tombol ganti/hapus foto mengembalikan slot ke status default tanpa memicu error null pointer.

#### Step 03: Reasons Why
- [ ] **Preset Overwrite Protection**: Mengganti preset momen memunculkan dialog konfirmasi (*"Ganti alasan dengan template ini?"*) agar tulisan personal pembeli tidak terhapus tanpa sengaja.
- [ ] **Batas Minimum & Maksimum**: Pembeli dapat menambah kartu hingga batas wajar (min 3, max 10) dengan tombol hapus yang responsif di mobile.
- [ ] **Autosave Realtime**: Input teks di setiap kartu tersinkronisasi realtime ke `draft.reasons.items[]` melalui dynamic lookup `dataset.id`.

#### Step 04: Memory Archive (Galeri Polaroid & Video)
- [ ] **Sinkronisasi Judul Modul**: Judul modul (`#gallery-module-title`) dan subtitle tersinkronisasi dua arah (*two-way binding*) dengan Step 08 (*Arrange*).
- [ ] **Multi-line Caption**: Caption foto mendukung format baris baru (enter/break) dan tersimpan dengan format `white-space: pre-line`.
- [ ] **Media Responsiveness**: Pratinjau media polaroid tidak meluap keluar layar pada viewport ponsel cerdas (iPhone SE s/d 15 Pro Max).

#### Step 05: Atlas of us (Peta Kenangan)
- [ ] **Input Koordinat**: Parser Google Maps (`shared/maps.js`) mampu membaca link pencarian, link place, dan koordinat bertanda kurung. Input koordinat manual memvalidasi rentang lintang (-90 s/d 90) dan bujur (-180 s/d 180).
- [ ] **Tanpa Kalkulasi KM**: Pastikan sama sekali tidak ada teks atau formula kilometer (KM) yang muncul.
- [ ] **Pencegahan Overwrite Antar Lokasi**: Mengedit lokasi ke-2 tidak boleh menimpa koordinat lokasi ke-1.
- [ ] **Batas Karakter Catatan**: Catatan lokasi dibatasi proporsional dan tidak merusak layout popup.

#### Step 06: Our Soundtrack (Katalog & Quotes)
- [ ] **Katalog Bawaan**: 37 lagu terdaftar dapat diputar di pratinjau audio Studio.
- [ ] **Default Quotes**: 28 lagu dengan quote bawaan menyalin kutipan otomatis ke textarea quote, dan pengguna bebas mengedit/menghapusnya.
- [ ] **Custom Artwork Upload**: Unggah cover custom (crop 1:1, max 8 MB) menghasilkan preview instan dan tersimpan pada `track.coverUrl`.
- [ ] **Custom MP3 Upload**: Pembeli dapat mengunggah file MP3 sendiri dengan player yang tetap dapat membaca durasi audio.

#### Step 07: Letter (Surat Fisik Digital)
- [ ] **Konfirmasi Template**: Sama seperti Reasons, mengganti template surat memicu modal konfirmasi.
- [ ] **Form Fields**: Field `Penerima (Recipient)`, `Isi Surat (Body)`, dan `Pengirim (Sender)` tervalidasi rapi.
- [ ] **Typewriter Alignment**: Pengirim surat disiapkan untuk styling rata kanan (*right-aligned*) di Gift Viewer.

#### Step 08: Arrange & Finale
- [ ] **Reordering**: Tombol naik/turun (`data-move`) mengubah urutan array `draft.modules` tanpa error console.
- [ ] **Validasi Minimum Modul**: Sistem menolak penerbitan jika modul aktif kurang dari 2.
- [ ] **Mobile Wrapping**: Kartu susunan bab tidak boleh berantakan atau terpotong teksnya di viewport mobile (`min-width: 701px` separation).
- [ ] **Toggle Preview**: Tombol toggle antara kartu Greeting dan kartu Finale di panel preview kanan berfungsi mulus.

#### Step 09: Publish & Review
- [ ] **Pre-publish Validation**: Checklist menampilkan modul apa saja yang sudah lengkap dan belum lengkap.
- [ ] **Anti-Double Click**: Saat tombol "Terbitkan Kado" ditekan, tombol langsung disabled + menampilkan state loading spinner untuk mencegah duplikasi entri KV.
- [ ] **Async KV Confirmation**: Client WAJIB menunggu status `200 OK` dari Worker sebelum menampilkan link kado dan kartu QR.
- [ ] **QR Gift Card Canvas**: Kartu QR resolusi tinggi (1080x1350) ter-generate lengkap dengan artwork hero dan 2 stiker tema, dapat di-download sebagai gambar PNG jernih.

---

### AREA 3: GIFT VIEWER (`/gift/:id`) — AUDIT PENGALAMAN PENERIMA

Periksa file `app.js`, `index.html`, `styles.css`, `rooms/atlas.js`, `rooms/atlas.css`:

#### A. Gate Screen & Transisi Pembuka
- [ ] **Single Click Target**: Kotak kado adalah satu-satunya elemen klik pembuka (bebas tombol cue pengganggu).
- [ ] **3D Comic Fold-out**: 4 panel pembuka melipat keluar dengan mulus (durasi ~1.2 detik), menampilkan foto kustom pembeli atau 4 panel default tema yang proporsional.
- [ ] **Impact Burst**: Teks sambutan meletup di tengah layar (*comic explosion*) dan bertransisi bersih ke layar Greeting.

#### B. Greeting & Menu Bab Cerita
- [ ] **Zero Outline Glitch**: Teks headline tidak memunculkan kotak border/focus outline biru pada browser Safari iOS.
- [ ] **Menu Layout**: Karakter tema (Spider-Man / Batman) mengapit judul menu secara proporsional. Jika tema netral, layout otomatis memusat (*center*).
- [ ] **Progress Tracking**: Setiap bab yang selesai dikunjungi diberi badge centang hijau (`is-opened`).
- [ ] **Finale Unlock**: Tombol menuju layar penutup (Finale) terkunci sampai semua bab terbuka, atau dapat diakses jika semua modul selesai.

#### C. Modular Rooms Audit
- [ ] **Reasons Room**: Kartu alasan muncul dengan animasi berurutan (*staggered animation*), font tulisan tangan (`Caveat`) terbaca kontras di atas latar kertas.
- [ ] **Memory Archive Room**: Swipe polaroid di layar sentuh mobile responsif, transisi foto tidak berbayang, video ter-loop otomatis tanpa audio bentrok.
- [ ] **Atlas of us Room**:
  - Peta Leaflet termuat mulus tanpa jeda putih.
  - Kartu popup komik berukuran compact (242px desktop, 205px mobile, aspek rasio foto 16:10).
  - Teks catatan tidak terpotong di tepi kanan (`overflow-wrap: break-word`) dan baris terakhir terbaca utuh tanpa tertutup gradient gelap.
  - Kamera peta memposisikan pin dan popup di tengah frame dengan ruang bebas di atas dan bawah.
  - Cinematic Tour berjalan tepat 1x saat kado pertama dibuka, dan tidak berulang saat masuk kembali (*revisit*).
- [ ] **Our Soundtrack Room**:
  - Audio play/pause sinkron dengan animasi piringan hitam vinyl.
  - Piringan vinyl berputar saat lagu berputar, dan berhenti saat di-pause.
  - Quote personal per lagu muncul di kotak kutipan tema tanpa teks meluap ke luar kartu.
  - Berpindah lagu di playlist otomatis mengganti cover dan quote secara instan.
- [ ] **Letter Room**:
  - Amplop retro terbuka saat di-tap/klik.
  - Efek mesin tik (*typewriter*) mengetik teks isi surat terlebih dahulu.
  - Tanda tangan pengirim diketik sekuensial setelah jeda sejenak di pojok kanan bawah surat.
  - Tombol "Tampilkan seluruh surat" langsung merender semua teks seketika jika pengguna tidak ingin menunggu.
- [ ] **Finale Room**:
  - Ilustrasi utama dan pendamping (`finale-companion`) tampil presisi dengan latar siluet kota bertema.
  - Tombol "Replay Story" me-reset seluruh status kunjungan bab dan mengizinkan Cinematic Tour Atlas diputar ulang.

---

### AREA 4: BACKEND CLOUDFLARE WORKER, STORAGE & DEPLOYMENT

Periksa file `worker/src/index.js`, `worker/src/project.js`, `worker/wrangler.toml`, `build.mjs`:

- [ ] **KV Key Separation**: Key tersimpan rapi: `draft:{id}` untuk mode studio editor, `gift:{id}` untuk publik, dan `order:{id}` untuk metadata.
- [ ] **Cache Header**: Endpoint `GET /api/gift/:id` mengirimkan header `Cache-Control: no-cache, no-store, must-revalidate` untuk mencegah browser menyajikan kado versi lama.
- [ ] **CORS & Origin Security**: Endpoint hanya mengizinkan origin platform terdaftar dan menolak request mencurigakan.
- [ ] **Asset Local Bundling**: Seluruh aset vendor (Leaflet JS/CSS, font DM Sans, Caveat, Bangers) ter-bundle lokal di folder `dist/` tanpa ketergantungan CDN luar yang berisiko blokir atau latensi tinggi.
- [ ] **Performance Budget**: Ukuran total aset per tema berada di bawah 1 MB, dan ukuran individual gambar WebP tidak melebihi 250 KB.

---

## 3. MATRIKS UJI KASUS EKSTREM (EDGE CASES MATRIX)

Agent wajib menguji skenario-skenario kritis ini:

| Skenario | Langkah Pengujian | Perilaku yang Diharapkan |
|---|---|---|
| **E1. Catatan Sangat Panjang** | Isi alasan/catatan Atlas dengan 300+ karakter. | Teks membungkus rapi, kontainer scrollbar aktif dengan smooth scrolling, tidak ada teks yang menembus kontainer (*no overflow*). |
| **E2. Format Gambar Aneh** | Upload foto potret vertikal tinggi (9:16) dan ultra-wide (21:9). | Foto di-crop dengan `object-fit: cover` dan `object-position: center 20%`, kepala subjek tidak terpenggal. |
| **E3. Jaringan Offline/Lemah** | Buka kado dalam mode koneksi lambat (*Slow 3G*). | Loading spinner komik muncul, resource esensial di-preload, peta menampilkan tile fallback gracefully jika tile server lambat. |
| **E4. Autoplay Policy Safari iOS** | Buka room Soundtrack di iPhone tanpa interaksi sebelumnya. | Player tidak melempar uncaught promise error; tombol play menampilkan ikon play siap sentuh. |
| **E5. Refresh Cepat Pasca Simpan** | Ubah data di Step 05, lalu tekan `Ctrl+R` / `Cmd+R` seketika. | Autosave melakukan synchronous flush / draft tersimpan di KV tanpa ada input yang hilang. |

---

## 4. PROTOKOL PENYELESAIAN & CHECKLIST GO-LIVE

Sebelum mendeklarasikan sistem siap 100% untuk Live Production, Agent wajib menyelesaikan verifikasi berikut:

1. [ ] Jalankan `npm run check` di direktori `storybook-edition`:
   - 41 test suites wajib **PASS (100% green)**.
   - Build statis `node build.mjs` menghasilkan folder `dist/` yang bersih tanpa file rahasia (`.env`, `wrangler.toml`).
2. [ ] Validasi tampilan di 3 ukuran viewport utama:
   - **Mobile**: 375x667 (iPhone SE) dan 390x844 (iPhone 14/15)
   - **Tablet**: 768x1024 (iPad mini/Air)
   - **Desktop**: 1440x900 dan 1920x1080
3. [ ] Pastikan tidak ada karakter emoji di kode UI teks antarmuka Studio maupun dialog panduan.
4. [ ] Lakukan `git status` untuk memastikan tidak ada file terlantar (*untracked files*).
5. [ ] Lakukan push ke remote: `git add . ; git commit -m "audit: complete live-production readiness check" ; git push origin main`.

---

*Dokumen ini disusun sebagai panduan audit produksi tertinggi (SSOT) untuk Storybook Edition.*
