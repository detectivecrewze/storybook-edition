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
- **SELALU** jalankan `npm run check` untuk memvalidasi syntax, build, dan 33 test suites sebelum commit.
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

# Validasi menyeluruh (syntax check + build dist/ + 30 unit/integration tests)
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

## 6. FITUR STUDIO PREVIEW, PRESET CONFIRMATION, CHAPTER PLANNER & SOUNDTRACK ARTWORK (Commit `a52f6b6`)

Pembaruan yang telah terintegrasi dan di-commit pada branch `main`:

1. **Room Preview Modal (Step 02–08)**
   - Tombol `Lihat preview` dinamis pada header tiap Step 02–08.
   - Iframe hanya dibuat saat tombol ditekan (*lazy-mount*) dan dihapus saat modal ditutup (*unmount*), sehingga audio, Leaflet, timer, dan media preview berhenti sepenuhnya tanpa kebocoran memori.
   - Preview otomatis memilih frame mobile untuk viewport mobile dan landscape lebar untuk desktop.
   - Target preview sesuai room aktif: gate, reasons, gallery, atlas, music, letter, menu cerita, serta finale. Step 09 tetap memiliki preview penuh permanen.
   - File utama: `studio/app.js`, `studio/index.html`, `studio/styles.css`, `app.js`.

2. **Konfirmasi Sebelum Preset Menimpa Tulisan**
   - Preset Reasons, Letter, dan Occasion memakai dialog konfirmasi sebelum mengganti copy yang sudah ditulis pengguna.
   - Fokus dikembalikan ke tombol pemicu ketika dialog ditutup.

3. **Step 08 — Arrange & Finale**
   - Chapter planner dan finale diberi visual komik/retro.
   - Kartu modul memiliki mini “Chapter preview” ringan berbasis CSS dan aset manifest; preview ikut berubah ketika judul/subtitle diedit tanpa membuat iframe baru.
   - Handler module menggunakan lookup berdasarkan `type` saat mengubah title, subtitle, dan status enabled, mencegah stale object closure.
   - Tombol panah urutan memakai selector `$$('[data-move]', row)` (memperbaiki bug `moveButtons.forEach is not a function`).

4. **Step 06 — Our Soundtrack (Custom Artwork & Layout Flex)**
   - Ditambahkan heading dan panel soundtrack bergaya komik.
   - Pengguna dapat mengunggah, memotong (crop 1:1, max 8 MB), mengganti, atau menghapus cover tiap lagu. Disimpan pada `music.tracks[].coverUrl`.
   - `.track-editor` memakai flex layout tunggal yang ringkas: cover di kiri, metadata di kolom terstruktur, aksi artwork berada di dalam kartu, dan tombol hapus di kanan atas.

---

## 7. PEMBARUAN TERKINI — TEMA BATMAN (GOTHAM NOIR), DYNAMIC STUDIO THEMING & FINALE COMPANION

> **Status saat ini:** File-file berikut sedang berada di working tree dan telah divalidasi dengan **30/30 passed** pada `npm run check`.

### A. Tema Baru: Batman (Gotham Noir)
- **Aset Lengkap (`assets/themes/batman/`)**:
  - `city-silhouette.webp`: Skyline gedung Gotham untuk background finale.
  - `finale-friends.webp`: Ilustrasi utama Greeting & Finale.
  - `gift-box-v2.webp`: Kotak kado pembuka bernuansa noir.
  - `gotham-night-paper.webp` & `paper-grain.webp`: Tekstur latar belakang dan kertas komik.
  - `noir-emblem.webp`: Emblem segel malam Gotham.
  - `icon-reasons.webp`, `icon-gallery.webp`, `icon-atlas.webp`, `icon-music.webp`, `icon-letter.webp`: Set ikon room bertema Batman.
  - `menu-hero-left.webp` & `menu-bat-right.webp`: Karakter Batman & Bat-Signal pengapit judul menu cerita.
  - `thumbnail.webp`: Kartu preview tema di Step 01 Studio.
  - `theme.css`: Variabel CSS dan styling spesifik tema Batman.
- **Registrasi Manifest (`shared/themes.js`)**:
  - Didaftarkan dengan palet warna emas & biru gelap Gotham:
    - `primary`: `#d6a62e` (emas lampu sorot Batman)
    - `primaryDark`: `#7a5a12`
    - `secondary`: `#273b55`
    - `surface`: `#0b111b`
    - `paper`: `#f4eedf` & `ink`: `#11151c`
    - `studio`: Topbar `#09111c` & Sidebar `#0b1522`.
- **Dukungan Cloudflare Worker (`worker/src/project.js`)**:
  - `SUPPORTED_THEME_IDS` diperbarui menjadi `new Set(["spiderman", "batman"])`.
  - Health check endpoint mengembalikan `["spiderman", "batman"]`.

### B. Dynamic Studio Theming (`applyStudioTheme`)
- Di `studio/app.js`: Fungsi baru `applyStudioTheme()` memetakan palet tema aktif ke variabel CSS di `:root`:
  `--red`, `--red-dark`, `--blue`, `--yellow`, `--paper`, `--ink`, `--muted`, `--studio-topbar`, `--studio-sidebar`, `--line`.
- **Efek Visual**: Saat pengguna memilih tema Batman di Step 01, seluruh sidebar navigasi, topbar, kartu QR, dan tombol aksi di Studio Editor seketika berganti warna menyesuaikan nuansa Batman.
- Ikon Atlas di Studio (`#atlas-theme-icon`) otomatis berganti mengikuti tema yang dipilih.
- Tombol kartu tema di Step 01 kini memiliki atribut aksesibilitas `aria-pressed="true/false"`.

### C. Proteksi Normalisasi Tema di Client Studio
- Di `saveDraft()` (`studio/app.js`): Jika Worker lama merespons dengan me-reset `themeId` kembali ke `spiderman`, client Studio menahan `draft = { ...draft, themeId: snapshot.themeId }` agar pilihan tema baru dan ketikan pengguna di step lain tidak tertimpa/hilang sepihak.

### D. Penyempurnaan Layar Gate & Finale di Gift Viewer
- **Layar Pembuka (Gate Screen)**: Tombol cue `.gift-open-cue` telah dihilangkan dari `gift/index.html` dan `styles.css`. Kotak kado `#open-wrap` kembali menjadi satu-satunya *clean click target* yang fokus dan bersih.
- **Layar Finale**: Ditambahkan stage baru `.finale-art-stage` dengan elemen companion baru: `<img id="finale-companion" class="finale-companion" alt="" hidden>`. `app.js` kini mendukung `theme.assets.finaleCompanion` untuk merender ilustrasi pendamping di kartu penutup finale.
- **Layout Judul Menu Adaptif**: Class `.has-menu-characters` diaktifkan secara dinamis oleh `app.js`. Jika tema tidak memiliki karakter komik pengapit judul, layout baris judul otomatis memusat (*center*) secara proporsional dengan `minmax(0, 1fr)`.

### E. Validasi & Pengujian (30/30 Tests Pass)
- `npm run check` lulus seluruh **30 automated tests**, termasuk:
  - `Batman is selectable while Spider-Man remains the legacy default`
  - `Studio keeps a selected supported theme when an older Worker normalizes it away`
  - Validasi budget aset WebP untuk tema Batman (< 600 KB total, < 250 KB per file).
  - `gift opening keeps the full gift box as its only clean click target`.

### F. File Terkait di Working Tree
- `app.js`
- `gift/index.html`
- `shared/themes.js`
- `studio/app.js`
- `studio/index.html`
- `studio/styles.css`
- `styles.css`
- `tests/frontend.test.js`
- `tests/project.test.js`
- `tests/worker.test.mjs`
- `worker/src/project.js`
- `assets/themes/batman/` (folder aset tema baru)

---

## 8. STUDIO ONBOARDING MODAL, ENGLISH DEFAULT, & MOBILE VIEWPORT PERFECTION (Commit 3e689a5, 61a7f5c, 8c27ed9)

Fitur dan perbaikan komprehensif yang dikerjakan pada branch `feat/studio-onboarding-modal` dan telah digabungkan ke `main`:

### A. Studio Onboarding Guide Modal (Zero Emoji)
- **Kebutuhan**: Memberikan panduan cepat bagi pembuat kado saat pertama kali masuk ke Studio Editor tanpa mengganggu estetika.
- **Komponen**: Dialog modal `#studio-guide-modal` di `studio/index.html` dan `studio/styles.css`.
- **Poin Panduan**:
  1. Room Count & Customization: Storybook terdiri dari 5 ruang cerita modular (Reasons, Memory Archive, Atlas of us, Soundtrack, dan Letter).
  2. Flexible Activation: Setiap ruang cerita dapat dinonaktifkan jika tidak diperlukan (minimal 2 ruang aktif untuk menerbitkan kado).
  3. Continuous Editing: Kado yang sudah dipublikasikan tetap bisa disunting dan diperbarui kapan saja tanpa mengubah tautan kado.
- **Interaksi & UX**:
  - Otomatis muncul saat pengguna pertama kali membuka Studio (dikontrol via `localStorage` key `storybook_studio_guided`).
  - Dilengkapi tombol "Petunjuk Studio" / "Studio Guide" di topbar Studio untuk membuka kembali modal kapan pun diperlukan.
  - Desain mengikuti palet tema aktif (`applyStudioTheme()`), backdrop blur tipis, border retro khas komik, dan sepenuhnya bersih dari emoji sesuai standar brand.

### B. Deskripsi Tema Ringkas & Ramah Mobile
- **Problem**: Deskripsi tema di Step 01 Studio sebelumnya terlalu panjang dan membuat tampilan kartu berantakan pada layar smartphone.
- **Solusi**:
  - Di `shared/themes.js` dan `shared/i18n.js`, deskripsi tema dipersingkat menjadi kalimat pendek, padat, dan elegan.
  - Spider-Man: "Red webs, retro halftone textures, and heroic warmth." / "Jaring merah klasik, tekstur halftone komik retro, dan nuansa hangat."
  - Batman: "Gotham noir darkness, spotlight gold accents, and vintage comic lines." / "Nuansa gelap Gotham noir, aksen emas lampu sorot, dan garis komik vintage."

### C. Default Bahasa Studio: English
- **Kebutuhan**: Standarisasi agar saat Studio Editor pertama kali dimuat oleh pengguna baru (tanpa preferensi tersimpan di storage), bahasa default yang aktif adalah English (`en`), bukan Bahasa Indonesia.
- **Solusi**:
  - `shared/i18n.js`: Mengatur `I18n.resolveInitialLocale()` default ke `'en'`.
  - `studio/index.html`: Update default selector `<select id="lang-select">` memilih opsi `en`.
  - `admin/app.js`: Konsisten default ke `'en'`.
  - Ditambahkan unit test otomatis: `Studio defaults to English language and locale`.

### D. Standarisasi Tampilan Mobile Gift Pages (Clean Default)
- **Keputusan Desain**: Pewarnaan paksa pada status bar dan tepi canvas mobile dikembalikan ke pengaturan default bersih bawaan platform. Setiap `.screen` di Gift Viewer menangani background tekstur dan permukaan tema secara mandiri tanpa memaksakan tinting warna pada status bar browser iOS/Android.
- **Implementasi**:
  - `styles.css`: `html, body` dikembalikan ke layout default bersih (`width: 100%; min-height: 100%; margin: 0; background: #1b1113; color-scheme: light;`).
  - `gift/index.html`: `<meta name="theme-color">` dikembalikan ke warna default `#7b0d1b`, tanpa tag status bar translucent buatan.
  - `app.js`: Pengaturan background dinamis `document.documentElement` dan `document.body` dihapus sehingga tidak memengaruhi browser chrome mobile.

### E. Eliminasi Kotak / Outline Biru pada Headline Greeting Screen
- **Problem**: Pada tampilan mobile, saat layar greeting pertama kali muncul terdapat kotak/garis outline biru di sekitar teks judul utama ("FOR THE ONE WHO MAKES EVERYTHING FEEL BRIGHTER").
- **Akar Masalah**: Fungsi `showScreen()` di `app.js` memanggil `target.focus()` pada elemen heading pertama untuk screen reader accessibility. WebKit/iOS secara otomatis menggambar outline focus ring biru bawaan browser pada elemen yang menerima fokus JS.
- **Solusi yang Diterapkan**:
  - Menambahkan reset `outline: none !important; box-shadow: none !important; -webkit-tap-highlight-color: transparent;` pada heading `h1, h2, h3` dan spesifik `.greeting-card h1` di `styles.css`.
  - Di `app.js` (`showScreen()`): Menambahkan `target.style.outline = "none"` sebelum memanggil `target.focus()`.

### F. Isolasi Background Studio Editor & Gift Viewer
- **Problem**: Saat menerapkan tema Spider-Man, area kerja (workspace) Studio Editor ikut berubah menjadi merah pekat sehingga teks heading dan form menjadi sulit dibaca.
- **Akar Masalah**: Fungsi `Themes.applyTheme()` sebelumnya menginjeksi inline style `target.style.backgroundColor = theme.palette.surface` dan `document.body.style.backgroundColor = theme.palette.surface`. Karena `Themes.applyTheme()` dipanggil bersama oleh Gift Viewer dan Studio Editor, background Studio tertimpa warna tema kado.
- **Solusi yang Diterapkan**:
  - `shared/themes.js`: Menjaga `applyTheme()` murni hanya menetapkan CSS custom properties (`--theme-*`, `--font-*`), tanpa memutasi background body secara global.
  - `studio/styles.css`: Mengunci background `html` dan `body` Studio secara permanen di `#eee8e2 !important; color-scheme: light !important;` dengan teks gelap yang kontras dan nyaman untuk form editing.
  - `studio/app.js`: Mereset inline `backgroundColor` pada `root` dan `body` di `applyStudioTheme()`.
  - `app.js`: Gift Viewer tetap memegang kontrol penuh atas background merah/hitam dan tekstur komik di fullscreen kado dan iframe preview.

### G. Status Pengujian & Integrasi
- Seluruh 33 unit & integration test suites lulus 100% (`33/33 passed`).
- Perubahan dari branch `feat/studio-onboarding-modal` di-merge secara bersih ke branch `main`.