# Storybook Edition

Produk gift digital general dan multi-theme yang berdiri sendiri. Project ini tidak membaca KV, Worker, atau project Birthday Scrapbook sehingga customer lama tidak terpengaruh.

## Isi project

- Gift publik fullscreen dengan opening, greeting, menu modular, lima room, dan finale.
- Studio Editor sembilan langkah dengan autosave draft, upload R2, crop foto, reorder, toggle module, live preview, publish, QR, serta Bahasa Indonesia/English.
- Admin dashboard untuk generate Studio link, statistik, pencarian, archive/restore, dan permanent delete.
- Cloudflare Worker terpisah dengan KV project/draft dan media R2 pada prefix `storybook/{projectId}/`.
- Tema `spiderman` dan `batman` dibaca melalui manifest. Renderer tidak memiliki kondisi khusus tema.
- Fixture tema tambahan di `tests/fixtures/second-theme.json` membuktikan kontrak penambahan tema.

## Development lokal

```text
npm start
```

Server default berjalan pada port `3100`:

- Landing: `http://localhost:3100/`
- Gift demo: `http://localhost:3100/gift/sample-demo?mock=1`
- Studio demo: `http://localhost:3100/studio/sample-demo?mock=1#token=demo-token`
- Admin: `http://localhost:3100/admin`

Mock hanya aktif di localhost. Draft demo disimpan di `localStorage`; production selalu memakai Worker.

## Kontrak project

Schema version `2` memakai istilah netral:

- `themeId`, `occasionPreset`, dan `settings.language`.
- `identity`, `opening`, `modules`, `reasons`, `gallery`, `music`, `letter`, dan `finale`.
- Module type terbatas pada `reasons`, `gallery`, `atlas`, `music`, dan `letter`.
- Maksimal 10 alasan, 15 foto/video, 10 lokasi Atlas, dan 3 lagu dengan quote opsional per lagu.
- Publish mewajibkan minimal dua module aktif dan hanya memvalidasi isi module yang aktif.

Preset yang tersedia: Romantic, Anniversary, Birthday, Appreciation, Friendship, Graduation, dan Just Because. Mengganti bahasa mengubah UI serta copy bawaan yang belum diedit. Tulisan personal customer tidak diterjemahkan.

## Menambah tema

1. Tambahkan folder aset dan optional stylesheet pada `assets/themes/{theme-id}/`.
2. Tambahkan satu manifest di `shared/themes.js` berisi palette, fonts, textures, assets, dan motion.
3. Tambahkan ID tersebut ke allowlist Worker di `worker/src/project.js`.
4. Jalankan `npm run check`. Contract test harus tetap lolos tanpa kondisi `if themeId === ...` pada renderer.

PNG master dan contact sheet ada di `design-source/` dan tidak masuk build. Aset production memakai WebP serta GIF teroptimasi untuk elemen animasi. Total manifest setiap tema diuji otomatis agar tetap di bawah 1 MB, dengan setiap file maksimal 250 KB.

Tema bergaya Spider-Man membawa risiko hak kekayaan intelektual untuk penggunaan komersial. Ilustrasi bawaan project ini adalah motif komik laba-laba orisinal karena generator tidak membuat karakter berlisensi secara langsung. Jika aset resmi atau berlisensi tersedia, file dapat diganti melalui manifest tanpa mengubah gift renderer.

## Build dan verifikasi

```text
npm run check
```

Perintah ini menjalankan syntax check, production build statis, unit test schema/theme/i18n, serta integration test Worker untuk generator idempotent, draft/publish, public gift, upload, Admin, archive/restore, permanent delete, dan CORS.

Build frontend hanya menyalin allowlist ke `dist/`. Worker, test, fixture, tools, dan PNG master tidak ikut deployment.

## Go-live

Integrasi storefront tetap dilakukan setelah audit Gift dinyatakan lulus. Urutan release:

1. Verifikasi KV khusus Storybook dan binding R2 pada `worker/wrangler.toml`.
2. Verifikasi tiga secret mengikuti `worker/README.md`.
3. Deploy Worker terlebih dahulu.
4. Pastikan `runtime-config.js` menunjuk URL Worker yang benar.
5. Deploy frontend dan uji health, Studio, upload, publish, dan public gift.

Kontrak storefront yang sudah disiapkan:

- `product_id: "storybook"`
- binding `STORYBOOK_WORKER`
- `POST /api/internal/projects`
- input `source`, `idempotencyKey`, dan optional `project`
- output `projectId`, `studioUrl`, `giftUrl`, dan `created`

Harga, halaman katalog, dan payment gateway belum termasuk repository Gift ini.
