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
