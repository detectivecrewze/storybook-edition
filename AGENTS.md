# 🤖 PANDUAN ONBOARDING & REKAM JEJAK PENGERJAAN — AI AGENT
### Platform: **For you, Always.** — Digital Atelier
### Produk: **Storybook Edition** (`storybook-edition`)
### Dokumen ini wajib dibaca tuntas sebelum menyentuh kode apapun di repositori ini.

---

## 1. IDENTITAS & PRINSIP KERJA

### Siapa yang Kamu Bantu?
**Aldo** adalah Solo Founder dari **For you, Always.** — brand digital premium yang menjual produk kado & surat interaktif. Aldo memegang visi produk, arah desain, dan estetika.

**Aldo tidak melakukan coding sendiri.** Tugas AI Agent adalah sebagai **eksekutor teknis murni**:
- Memahami codebase secara mendalam sebelum menyentuh kode.
- Bekerja secara cermat: **Zero Trial-and-Error**. Telusuri akar masalah (*root cause*) sebelum mengubah file.
- **JANGAN** menghapus modul, tema, atau kode yang tidak diminta.
- **SELALU** jalankan `npm run check` untuk memvalidasi syntax, build, dan 21 test suites sebelum commit.
- **SELALU** lakukan `git add . ; git commit -m "..." ; git push origin main` setelah setiap perubahan selesai.
- Format commit: `feat(scope): pesan` / `fix(scope): pesan` / `update(scope): pesan`.
- Gaya komunikasi: Bahasa Indonesia santai, ringkas, langsung ke inti permasalahan.

---

## 2. ARSITEKTUR & STACK TEKNIS

Produk **Storybook Edition** adalah gift digital interaktif bertema cerita komik retro/vintage multi-tema yang sepenuhnya berdiri sendiri (*isolated* dari KV/Worker produk lain).

| Komponen | Teknologi | Deskripsi |
|---|---|---|
| **Gift Viewer** | Vanilla HTML5 / CSS3 / JavaScript (ESM + browser globals) | Fullscreen web experience: Cover Gate, Comic Transition, Greeting, Story Chapters Menu, Modular Rooms, dan Finale. |
| **Studio Editor** | Vanilla JS / CSS Grid / Flexbox | Studio 9 langkah: Occasion & Theme, Opening Photos, Reasons, Memory Archive, Atlas of us, Music, Letter, Arrange & Finale, Publish. |
| **Peta Interaktif** | Leaflet.js (local bundle di `/assets/vendor/leaflet/`) | Lazy-loaded saat room Atlas dibuka, render rute putus-putus, pin vintage, dan popup kenangan. |
| **Backend / Worker** | Cloudflare Worker + Cloudflare KV + R2 Storage | Worker independen untuk draft autosave, publishing, media upload, dan admin link generation. |
| **Build & Check** | Node.js (`build.mjs`, `node --test`) | Build menyalin file allowlist ke `dist/` untuk deployment statis (Vercel). |

### Perintah Utama:
```powershell
# Development lokal (port 3100)
npm start

# Validasi menyeluruh (syntax check + build dist/ + 25 unit/integration tests)
npm run check
```

---

## 3. PETA FILE & STRUKTUR CODEBASE

```
storybook-edition/
├── app.js                     <- Controller & renderer utama Gift Viewer publik
├── index.html                 <- Entry point Gift publik
├── styles.css                 <- Styling global & tema Gift Viewer
├── runtime-config.js          <- Konfigurasi endpoint Worker API
├── build.mjs                  <- Build script statis ke folder dist/
├── shared/
│   ├── project.js             <- Model data, skema, normalisasi draft, validasi publish
│   ├── maps.js                <- Parser URL Google Maps & koordinator titik koordinat
│   ├── i18n.js                <- Kamus bahasa bilingual (id & en)
│   ├── themes.js              <- Registri manifest tema visual (spiderman, dll)
│   └── api.js                 <- Client API komunikasi ke Cloudflare Worker
├── rooms/
│   ├── atlas.js               <- Logic room peta interaktif Leaflet ("Atlas of us")
│   └── atlas.css              <- Styling khusus peta, pin vintage, popup, dan tombol navigasi
├── studio/
│   ├── app.js                 <- Controller Studio Editor 9 langkah (autosave, sync, preview)
│   ├── index.html             <- UI form wizard Studio Editor
│   └── styles.css             <- Styling Studio Editor & responsive form
├── admin/
│   ├── app.js                 <- Control room admin internal
│   └── index.html             <- Dashboard admin
├── worker/
│   ├── src/index.js           <- Cloudflare Worker API entry point
│   ├── src/project.js         <- Project normalizer & validator di server Worker
│   └── wrangler.toml          <- Konfigurasi KV & R2 Storybook
└── tests/
    ├── frontend.test.js       <- Contract & DOM tests untuk Studio & Gift
    ├── project.test.js        <- Unit tests skema, migrasi, maps, tema, dan i18n
    └── worker.test.mjs        <- Integration tests Cloudflare Worker
```

---

## 4. REKAM JEJAK PENGERJAAN & PERUBAHAN ABSOLUT (SESI INI)

Berikut adalah daftar pekerjaan, perbaikan bug, dan pembaruan fitur yang telah diselesaikan secara tuntas:

### A. Memory Archive: Perbaikan Sinkronisasi Judul & Caption Foto (`b9227cf`)
* **Problem**: Judul dan caption foto yang diketik di Step 04 Studio Editor tidak muncul di Gift Viewer (selalu menampilkan default "Memory 1" dan caption kosong).
* **Akar Masalah**:
  1. *Stale Closure Object*: Event listener `input` mengikat referensi objek item lama. Saat autosave background berjalan, `Project.normalizeProject()` memperbarui objek `draft`, sehingga ketikan tersangkut di objek lama yang terlepas dari memori.
  2. *SyncAll Omission*: Fungsi `syncAll()` sebelumnya melewatkan kartu galeri `.gallery-editor`.
  3. *SendPreview Freshness*: `sendPreview()` mengirim draft ke iframe sebelum DOM input sempat dibaca.
* **Solusi yang Diterapkan**:
  - Dibuat fungsi helper `syncGalleryCard(item, card)`.
  - Dynamic lookup realtime `getActiveItem = () => draft.gallery.items.find(...)` pada setiap ketikan `input` dan event `blur`.
  - `syncAll()` sekarang menyinkronkan seluruh input kartu galeri ke `draft.gallery.items`.
  - Di `styles.css`: Ditambahkan `white-space: pre-line; word-break: break-word;` pada caption polaroid agar format baris baru (enter) tampil rapi.

---

### B. Standardisasi Nama Modul Menjadi "Atlas of us" (`d13b7d3`)
* **Problem**: Modul peta sebelumnya bernama "The Map Of Perfect Tiny Thing" dan inkonsisten dengan brand platform.
* **Solusi yang Diterapkan**:
  - Diperbarui di `shared/i18n.js` untuk bahasa ID & EN menjadi `"Atlas of us"`.
  - Diperbarui di `shared/project.js` dan `worker/src/project.js`: normalisasi modul otomatis memigrasi nama lama (`"Atlas Kita"`, `"Atlas of Us"`, `"The Map Of Perfect Tiny Thing"`) menjadi `"Atlas of us"`.
  - Label sidebar nav dan heading Step 05 Studio diubah menjadi "Atlas of us".

---

### C. Bugfix Ekstraksi Koordinat Google Maps & Redesign Peta Arcade (`862b31b`, `031e5e8`)
* **Problem**:
  1. Ketika paste koordinat baru di lokasi ke-2 (misal `-6.243697, 106.797721`), kolom malah tertimpa koordinat lokasi ke-1 (`-6.22806, 106.71875`).
  2. Desain peta dinilai kaku dan terdapat perhitungan KM (kilometer) yang tidak diinginkan Aldo ("saya tidak mau ada KM dan perhitungan KM-nya").
* **Akar Masalah Koordinat**:
  - Pada URL Google Maps lengkap dari browser, parameter path pencarian `/search/lat,lng` atau `/place/lat,lng` sering berdampingan dengan viewport kamera lama `/@lat,lng`. Regex lama mencocokkan `/@lat,lng` terlebih dahulu sehingga koordinat lama yang terambil.
* **Solusi yang Diterapkan**:
  - **`shared/maps.js`**: Menata ulang prioritas regex: path `/search/` dan `/place/` diprioritaskan di atas `/@lat,lng`. Menambahkan dukungan koordinat bertanda kurung `(-6.2, 106.8)`.
  - **Penghapusan Total KM**: Formula Haversine, fungsi `totalDistance`, konstanta radius bumi, dan elemen badge KM di `rooms/atlas.js` dihapus total. Header kini hanya menampilkan jumlah tempat bersih (*clean count*).
  - **Studio Data Integrity**: Menambahkan `card.dataset.id` dan dynamic lookup `getActiveLocation()` pada setiap kartu lokasi Atlas di `studio/app.js` agar data lokasi ke-2 tidak tertimpa lokasi ke-1.

---

### D. Animasi Cinematic Tour & Styling Peta Vintage (`bd87ab6`, `ca08b8f`)
* **Update**:
  - Menambahkan animasi pembuka sinematik (*Cinematic Tour*) saat room Atlas pertama kali dibuka: kamera otomatis terbang (*flyTo*) berurutan menyorot setiap pin kenangan dengan zoom halus sebelum membuka kontrol navigasi bebas.
  - Menghubungkan seluruh titik lokasi dengan garis rute putus-putus vintage berwarna hangat (`dashArray: '6, 10'`, color `#8b3a2b`).
  - Mengganti tile provider Leaflet ke Humanitarian OSM / CartoDB yang bersih, berestetika hangat, dan minim visual noise jalan raya modern.

---

### E. Penghapusan Tombol "Open in Google Maps" & Dimensi Foto (`f130972`, `d5b3f26`)
* **Update**:
  - Atas instruksi Aldo, tombol eksternal *"Open in Google Maps"* di dalam kartu popup pin dihapus sepenuhnya agar penerima tetap fokus di dalam cerita web.
  - Ukuran kartu popup dikunci stabil (`min-width: 250px`, `max-width: 270px`) dan tinggi foto diatur 130px–145px dengan `object-fit: cover` agar foto kenangan tampil sinematik dan tidak gepeng.

---

### F. Fix Framing Kamera & Headroom Kartu Popup (`4c6f954`, `5078353`)
* **Problem**: Saat menekan tombol Next (`→`) / Kembali (`←`) atau mengklik pin, bagian atas kartu popup (termasuk tombol close `x` dan bingkai atas foto) terpotong atau mepet ke batas atas layar.
* **Akar Masalah**:
  1. Opsi Leaflet popup bawaan memiliki `autoPan: true`. Ketika popup dibuka serentak dengan `flyTo`, algoritma `autoPan` Leaflet membajak kamera dan menggeser peta ke framing default Leaflet yang memotong bagian atas kartu.
  2. Offset vertikal kamera yang belum cukup tinggi untuk menampung tinggi kartu popup + margin atas.
* **Solusi yang Diterapkan ([`rooms/atlas.js`](file:///C:/Users/aldor/OneDrive/Desktop/storybook-edition/rooms/atlas.js) & [`rooms/atlas.css`](file:///C:/Users/aldor/OneDrive/Desktop/storybook-edition/rooms/atlas.css))**:
  - Set `autoPan: false` pada `bindPopup`.
  - Kamera menutup popup terlebih dahulu (`map.closePopup()`), lalu melakukan `flyTo` ke koordinat dengan offset vertikal utara yang telah dikalkulasi secara presisi (`getCameraCenterForPin()`).
  - Popup baru dibuka setelah animasi kamera selesai pada event `moveend` (`map.once("moveend", ...)`).
  - Offset vertikal kamera ditingkatkan ke `Math.min(190, Math.max(125, Math.round(size.y * 0.38)))`.
  - Tinggi foto disesuaikan ke 130px dan padding kartu dirampingkan, menghasilkan total penambahan ruang bebas (*headroom*) lebih dari **55px**. Foto dan tombol `x` kini 100% aman dan tidak akan pernah terpotong.

---

### G. Judul & Subtitle Memory Archive Dinamis di Studio Editor (`45ffe1a`)
* **Permintaan**: Aldo meminta agar judul dan nama bagian Memory Archive bisa diubah-ubah secara dinamis melalui Studio Editor.
* **Solusi yang Diterapkan**:
  1. **`studio/index.html`**:
     - Ditambahkan input `#gallery-module-title` (maxlength 80) dan `#gallery-module-subtitle` (maxlength 160) pada Step 04.
     - Diberikan `id="gallery-step-heading"` pada `<h1>` Step 04 dan `id="gallery-step-nav-label"` pada label sidebar navigasi.
  2. **`shared/i18n.js`**:
     - Ditambahkan key bilingual: `studio.galleryTitleLabel`, `studio.gallerySubtitleLabel`, `studio.galleryTitlePlaceholder`, dan `studio.gallerySubtitlePlaceholder`.
  3. **`studio/app.js`**:
     - Dibuat fungsi `updateGalleryTitleUI(title)`: Mengupdate heading Step 04 dan label navigasi sidebar secara instan dengan fallback aman ke nama default jika input kosong.
     - `renderGallery()`: Memuat nilai tersimpan dari `draft.modules.find(m => m.type === "gallery")` ke dalam kedua input dan memanggil `updateGalleryTitleUI()`.
     - **Two-Way Synchronization**:
       - Mengubah input di Step 04 otomatis memperbarui input galeri di Step 08 (*Arrange & Finale*), memperbarui sidebar, mengirim `postMessage` ke preview gift, dan trigger autosave.
       - Mengubah judul di Step 08 juga otomatis memperbarui input Step 04 dan label navigasi.
     - `syncAll()`: Memastikan `galleryModule.title` dan `galleryModule.subtitle` disinkronkan ke objek `draft.modules` sebelum autosave dan publish.
  4. **`tests/frontend.test.js`**:
     - Ditambahkan automated regression test suite baru. Total pengujian pada handoff terbaru kini **25/25 passed**.

---

## 5. ATURAN ANTI-REGRESI (PENTING UNTUK AGENT SELANJUTNYA)

Jika kamu adalah AI Agent yang melanjutkan pekerjaan di repositori ini, **PATUHI ATURAN BERIKUT**:

1. **JANGAN kembalikan kalkulasi jarak KM di Atlas**:
   - Aldo secara eksplisit menolak fitur jarak / KM pada room peta. Jangan pernah memasang kembali Haversine atau badge kilometer.
2. **JANGAN nyalakan `autoPan: true` pada Leaflet Popup Atlas**:
   - `autoPan: true` akan merusak sinkronisasi kamera `flyTo` dan menyebabkan foto kartu popup terpotong batas atas frame peta.
3. **JANGAN ubah urutan regex koordinat di `shared/maps.js`**:
   - Pencarian path `/search/` dan `/place/` HARUS selalu dievaluasi sebelum fallback kamera viewport `/@lat,lng`.
4. **PERTAHANKAN Dynamic Lookup di `studio/app.js`**:
   - Saat menangani event listener pada list item (`gallery`, `atlas`, `reasons`, `music`), selalu gunakan fungsi dinamis `draft.gallery.items.find(...)` atau `draft.atlas.locations.find(...)` dengan pencocokan `dataset.id`. Jangan mengandalkan referensi closure statis karena akan terlepas setelah autosave.
5. **JAGA KESETARAAN KEY i18n**:
   - Test suite `tests/project.test.js` memvalidasi bahwa `Object.keys(I18n.messages.id).sort()` HARUS identik dengan `Object.keys(I18n.messages.en).sort()`. Jika menambah key baru, wajib tambahkan di kedua bahasa!
6. **PASTIKAN `npm run check` HIJAU SEBELUM COMMIT**:
   - Jangan pernah melakukan push jika `npm run check` gagal.

---

*Dokumen ini dibuat September 2026 sebagai Single Source of Truth (SSOT) teknis repositori storybook-edition.*

---

## 6. HANDOFF TERBARU — STUDIO PREVIEW, PRESET, CHAPTER PLANNER & SOUNDTRACK

> **Status handoff:** perubahan di bawah masih berada di working tree dan **belum di-commit, push, atau deploy**, sesuai instruksi Aldo pada sesi ini. Jalankan `git status --short` sebelum melanjutkan agar perubahan lokal lain tidak tertimpa.

### A. Perubahan Studio yang sudah diterapkan

1. **Room Preview Modal (Step 02–08)**
   - Tombol `Lihat preview` dibuat dinamis pada header tiap Step 02–08.
   - Iframe hanya dibuat saat tombol ditekan dan dihapus saat modal ditutup, sehingga audio, Leaflet, timer, dan media preview berhenti sepenuhnya.
   - Preview otomatis memilih frame mobile untuk viewport mobile dan landscape lebar untuk desktop. Tidak ada toggle manual yang membiarkan pengguna mobile memaksa layout desktop.
   - Target preview sesuai room aktif: gate, reasons, gallery, atlas, music, letter, menu cerita, serta finale. Step 09 tetap memiliki preview penuh permanen.
   - File utama: `studio/app.js`, `studio/index.html`, `studio/styles.css`, `app.js`.

2. **Konfirmasi sebelum preset menimpa tulisan**
   - Preset Reasons, Letter, dan Occasion memakai dialog konfirmasi sebelum mengganti copy yang sudah ditulis pengguna.
   - Fokus dikembalikan ke tombol pemicu ketika dialog ditutup.

3. **Step 08 — Arrange & Finale**
   - Chapter planner dan finale telah diberi visual comic/premium baru.
   - Kartu module sekarang memiliki mini “Chapter preview” ringan berbasis CSS dan aset manifest; preview ikut berubah ketika judul/subtitle diedit. Ini bukan iframe baru, sehingga tidak menambah request atau beban preview.
   - Handler module menggunakan lookup berdasarkan `type` saat mengubah title, subtitle, dan status enabled, agar respons save lama tidak mengarah ke objek yang sudah stale.
   - Tombol panah urutan memakai selector `$$('[data-move]', row)`. Sebelumnya ada regression `moveButtons.forEach is not a function`; ini sudah diperbaiki.

4. **Step 06 — Our Soundtrack**
   - Ditambahkan heading dan panel soundtrack bergaya comic.
   - Pengguna dapat mengganti atau menghapus cover tiap lagu. Foto cover memakai cropper yang sama, rasio 1:1, JPG/PNG/WebP maksimal 8 MB, upload type `photo`, dan disimpan pada `music.tracks[].coverUrl`.
   - Upload cover mencari track memakai `id` stabil dan `syncAll()` juga mencari `.track-editor` memakai `card.dataset.id`, agar autosave tidak salah mengubah track setelah render ulang.
   - File utama: `studio/app.js`, `studio/index.html`, `studio/styles.css`, `shared/i18n.js`.

### B. Handoff UI terbaru

Screenshot terakhir Aldo (file `codex-clipboard-f3f1a9b1-6e1b-46af-914f-3259a63e08ad.png`) menemukan konflik CSS pada **Our Soundtrack**: grid lama dan grid baru saling memosisikan aksi cover di luar kartu serta membuat kartu sangat tinggi.

- **Perbaikan terbaru:** `.track-editor` sekarang memakai flex layout tunggal, bukan grid bertumpuk. Cover, metadata, aksi cover, dan tombol hapus memiliki area eksplisit.
- Tombol hapus diikat dengan `position:absolute` di kanan atas kartu; aksi `Change artwork`/`Remove artwork` dan hint tetap berada di dalam kartu.
- Pada breakpoint kecil, aksi pindah ke baris bawah metadata dengan lebar yang terukur. Cover tidak lagi melebar menjadi panel besar.
- Visual QA mock lokal menunjukkan satu kartu lagu berukuran ringkas dan semua aksi berada dalam kartu. Tetap periksa browser desktop nyata dan viewport 320–428px sebelum release.
- Jangan menghapus fungsi upload/crop/ID lookup yang sudah ada.

Screenshot sebelumnya (`codex-clipboard-accaa4fd-fdc4-4dc4-a58e-da525efaaf9f.png`) juga menunjukkan kontrol Step 08 pernah terpotong di desktop. CSS terbaru mencoba memisahkan toggle dan dua tombol panah ke kolom kontrol vertikal agar seluruh tombol dapat diklik. Agent berikutnya tetap wajib memeriksa visual nyata di desktop dan 320–428px; jangan hanya mengandalkan test tekstual.

### C. Validasi terakhir

- `npm run check` terakhir: **lulus**.
- Production build berhasil.
- Semua **25/25 test** lulus, termasuk kontrak preview modal, dialog preset, schema/i18n, media/Atlas, mini preview chapter, dan upload cover soundtrack.
- `git diff --check` tidak menemukan whitespace error.
- Visual QA mock Studio telah dilakukan pada `http://127.0.0.1:3100/studio/sample-demo?mock=1#token=demo-token`; tombol panah module berhasil mengubah urutan. Ini hanya mock lokal dan tidak menyentuh data customer.

### D. File yang sedang berubah di working tree

Pada handoff ini, setidaknya file berikut memiliki perubahan lokal dari sesi sebelumnya:

- `app.js`
- `rooms/atlas.js`
- `shared/i18n.js`
- `shared/themes.js`
- `studio/app.js`
- `studio/index.html`
- `studio/styles.css`
- `tests/frontend.test.js`
- `assets/themes/spiderman/icon-atlas-v2.webp` (baru)

Jangan melakukan `git reset`, `git checkout .`, commit, push, atau deploy tanpa instruksi eksplisit Aldo.