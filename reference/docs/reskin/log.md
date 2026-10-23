# Log reskin Program Setup → COMPASS

Keputusan scope dan gap: [inventory.md §8b](inventory.md). Scope = **Opsi B** (konten `/setup*` + kerangka aplikasi semua modul).

## Fase 1 · Token dan fondasi (23 Okt 2026)

### File

| File | Perubahan |
|---|---|
| `css/compass-tokens.css` (baru) | Gabungan apa adanya `fig-tokens.css` + `typography.css` + `effects.css` dari `_ds`, lalu tambahan spec §2–§5 (skala tipe `--text-*`/`--lh-*`/`--ls-*`, spacing & radius yang belum ada, `--font-mono`, ukuran layout sidebar/topbar). Selector `.dark` di blok tema gelap dibuang (sisa `[data-theme="dark"]`, tidak aktif) supaya tidak bentrok dengan class Bootstrap. `effects.css` sengaja dimuat setelah `fig-tokens.css` karena menimpa `--radius-*` tanpa satuan dengan px. |
| `css/compass-skin.css` (baru) | Fondasi saja: latar `body.kt-aside--enabled` = `--color-bg-primary`; teks dasar Lato 14/20 (`--ls-body-md`, `--color-text-primary`) untuk `.cps` dan flash alert; `code`/`.text-monospace` = JetBrains Mono; kerangka (`#kt_header_mobile`, `#kt_aside`, `#kt_header`, `#kt_footer`) = Lato. |
| `index.html` | `<link>` Google Fonts Lato 400/700, Plus Jakarta Sans 500/600/700, JetBrains Mono 400/500; `compass-tokens.css` dan `compass-skin.css` setelah `app.css`. Link Poppins tetap (konten modul lain). |
| `js/pages/setup.js`, `js/pages/setup2.js` | Hanya wrapper `<div class="cps">…</div>` di awal/akhir 15 template route (+ `headerPage()` dan cabang simulasi tanpa channel). Tidak ada `${...}`, hook, atau class yang diubah. |

Tidak diubah: `engine.js`, `formula.js`, `store.js`, `catalog.js`, `seed.js`, `app.js`, `ui.js`, `css/app.css`.

### Tooling

- `capture.mjs --modules`: 21 route modul lain (Admin HO, CBD, Finance) + hook kerangka (`#kt_aside`, `#kt_header`, …) per route → `modules-<label>.json`, screenshot `screens/<label>/modules/`. `--root <folder>` menjalankan terhadap salinan kode lain.
- Baseline modul (`modules-before.json`) dan baseline Program Setup (`baseline.json`, `scenarios-before.json`, `state-before.json`) diambil dari git worktree di HEAD (kode sebelum Fase 1), lalu worktree dihapus.
- Perbaikan alat: "flash" di skenario kini hanya alert dari `UI.render()`; `UI.errorsHtml()` tercatat di `errors` (sebelumnya alert error header ikut terbaca sebagai flash karena posisinya). Console error disimpan baris pertama saja (stack berisi path file).

### Verifikasi

| Cek | Hasil |
|---|---|
| `diff.mjs` (128 route Setup: hook, state, parent semantik, class lama, copy, console, overflow 1440/1280) | **0 perbedaan** |
| Skenario inti (21 langkah, 72 kombinasi simulasi, validasi 3 program) | **Identik** |
| `localStorage` setelah skenario | **Identik** |
| `diff.mjs --modules` (21 route modul lain + hook kerangka) | **0 perbedaan** |
| Console error baru | Tidak ada |

Perubahan visual yang terlihat: font Lato di konten Setup dan kerangka, latar halaman `#F8F9FD` (sebelumnya `#f9f9fc`). Ukuran/warna kontrol masih Metronic sampai Fase 2.

### Berikutnya: Fase 2 · Komponen dasar

Card, button, form control, label/hint, table, tag/badge, alert, tab, step indicator di dalam `.cps`; kerangka aplikasi (sidebar 240/58px, NavigationTop 76px) lewat `layout()` di `ui.js` dengan semua hook `[data-hmenu]`, `[data-hover]`, `data-toggle="dropdown"`, `data-click` dipertahankan.

## Koreksi Fase 1 (ditemukan di Fase 2)

- Komentar pembuka `css/compass-tokens.css` berisi teks `compass-design-system-*/tokens/`. `*/` di situ menutup komentar terlalu awal, sehingga browser membuang blok `:root` pertama (semua token semantik & primitive). Akibatnya di Fase 1 hanya font Lato yang aktif; latar `--color-bg-primary` **tidak** pernah terpasang. Diperbaiki (path ditulis tanpa `*/`).
- `fig-tokens.css` tidak punya `--color-interactive` dan `--color-icon-secondary` walau ada di spec §1. Ditambahkan di bagian 4 `compass-tokens.css` (`primary-500`, `neutral-variant-800`).
- Pengaman baru di `capture.mjs`: run selain `before` gagal bila token kunci tidak ter-resolve.

## Fase 2 · Komponen dasar + kerangka aplikasi (23 Okt 2026)

### File

| File | Perubahan |
|---|---|
| `css/compass-skin.css` | Kerangka (`.cmp-*`) dan komponen di dalam `.cps`: tipografi & utilitas, kartu + section head, kartu editor (`class/layer/sec-card`), Button (Primary/Secondary/Tertiary/Link/destructive, S 36 & XS 28, disabled termasuk `<fieldset disabled>`), Input S 36 + `.form-control-sm` 32 (Gap 4) + addon Rp/% (Gap 5), label 12/600 + helper 12, checkbox `accent-color`, Table (header 14/20 bold kiri, body 12/16, garis horizontal, `.num` kanan, baris kosong Gap 12), Tag (h.badge DRAFT Grey+dot, PUBLISHED Green+dot, CLOSED Grey tanpa dot = Gap 1; `.badge`, `step-chip`, `class-pill`, severity validasi), jalur approval `.lp` (Gap 9), Alert (flash Metronic + alert sederhana + `alert-dark` → neutral), Tab underline S (`sub-tabs`, `nav-pills`; nomor step = Gap 3), step indicator `flow-steps`, lane berulang sebagai kartu (Gap 2), pohon pilar (Gap 10), chip katalog rumus/placeholder, `.warn-mark` (Gap 13). |
| `css/compass-tokens.css` | Perbaikan komentar + 2 token (lihat koreksi). |
| `js/ui.js` `layout()` | Kontainer kerangka diganti: `.cmp-shell` › `.cmp-side#kt_aside` (logo, tombol tahun, menu aside) + `.cmp-main#kt_wrapper` › `.cmp-top#kt_header` (menu header, tanggal, tombol tahun, avatar + nama + role) + `#kt_content` + `#kt_footer`. Builder menu (`headerMenu`, `renderHeaderItem`, `renderSubItem`, `asideMenu`, `yearDropdown`), `bindMenus`, isi dropdown user, header mobile, konten, dan footer tidak diubah. Ditambah ekspresi baru untuk tanggal hari ini dan inisial avatar (data yang sudah ada). Ikon dekoratif tahun/user diganti `bi-calendar3` / avatar; inline style tombol tahun dibuang. |

Tidak diubah: `engine.js`, `formula.js`, `store.js`, `catalog.js`, `seed.js`, `app.js`, `css/app.css`, builder menu & handler di `ui.js`, logika `setup.js` / `setup2.js`.

### Keputusan tata letak kerangka (tanpa logika baru)

- Menu header (role-based, dropdown `[data-hmenu]`) tetap di NavigationTop kiri; menu aside (grup `[data-hover]`) menjadi isi sidebar 240px dengan grup selalu terbuka.
- Sidebar 58px otomatis di lebar 1025–1199px (CSS saja): grup jadi ikon, isinya melayang saat hover lewat `kt-menu__item--hover` yang sudah diset `bindMenus`. Tidak ada tombol collapse (butuh state baru → usulan).
- ≤1024px: sidebar off-canvas lewat `toggleAside` yang sudah ada (`kt-aside--on`); header mobile Metronic tetap.
- Item aktif di sidebar belum ditandai (butuh logika path → usulan). Menu header tetap memakai `kt-menu__item--active` yang sudah ada.
- Kolom pencarian sidebar COMPASS tidak ditambahkan (kontrol baru tanpa fungsi).

### Verifikasi

| Cek | Hasil |
|---|---|
| `diff.mjs` (128 route Setup) | **0 perbedaan** (hook, state, parent semantik, class lama, copy, console, overflow 1440/1280) |
| Skenario inti (21) + `localStorage` | **Identik** |
| `diff.mjs --modules`: konten 21 route modul lain | **0 perbedaan** |
| `diff.mjs --modules`: hook kerangka | Semua `id`, `data-*`, `data-toggle`, `data-click`, `href`, teks menu tetap. 5 perubahan disengaja × 19 route: class layout Metronic dibuang dari kontainer `#kt_aside_brand` (`kt-grid__item`), `#kt_aside_menu_wrapper`, `#kt_aside_menu` (`kt-aside-menu kt-aside-menu--dropdown`), `#kt_header_menu_wrapper`, `#kt_header_menu` (`kt-header-menu …`). Tidak dipakai JS. |
| Interaksi kerangka (Playwright) | Dropdown header buka + navigasi; submenu bertingkat (CBD › Registration › program › channel); dropdown user + Ganti role; dropdown tahun + `chooseYear`; `goLobby`; link aside; sidebar 58px + flyout hover di 1100px; mobile 800px buka/tutup lewat `toggleAside`, tanpa overflow; Reset data (confirm) dari footer. Console error: 0. |

### Berikutnya: Fase 3 · Halaman per halaman

Daftar program (judul Plus Jakarta 24, tabel di dalam kartu) → DetailHeader (← Kembali + divider + judul 22 + Tag) → lalu tiap halaman, termasuk grid target lead measure (Gap 11) yang belum disentuh.

## Fase 3 · Halaman per halaman (23 Okt 2026)

- Daftar program: judul (Plus Jakarta 24/32), "Program baru", dan tabel dalam satu kartu (`.cps-list`); kartu Clone dengan section head 14 bold.
- DetailHeader di semua halaman program dan Program baru: ← Kembali (Ghost, ke `#/setup`) · divider · breadcrumb kecil · judul 22 + kode (Tag Grey) + status (Tag) · caption.
- Step indicator di kartu sendiri; lane channel/brand/fase sebagai kartu; tab sub-langkah menempel di dasar kartu lane.
- Grid target lead measure (Gap 11): header brand-subtle / bg-primary, garis 1px, input COMPASS, kolom beku; tinggi header 1 tetap 64px.
- Perbaikan hasil review visual: spasi hilang di kotak baca-saja ("diatur di 3b Brand"), kode slot rumus terpotong, checkbox konfirmasi publish menimpa label, tombol di `input-group-sm` terlalu tinggi, baris lead measure melebar keluar kartu (sudah ada sebelum reskin), warna sel gabungan terlalu pekat.

## Fase 4 · Verifikasi akhir

Diff Setup: hanya tombol "Kembali" (124 route detail). Skenario 21/21 identik, `localStorage` identik (472.331 byte). Modul lain: konten identik, hook kerangka utuh. Wrapper `.cps` benar di 128/128 route. Overflow 0 di 1440/1280. Console error 0. Uji interaksi kerangka + tombol Kembali lulus. Kontras diukur (lihat report §7).

## Fase 5 · Laporan

[report.md](report.md)

## Penataan ulang lanjutan · "Program Setup lebih dalam" (23 Okt 2026)

Permintaan: UI belum cukup berubah; pilihan "Program Setup lebih dalam" (aturan struktur dilonggarkan, field/tombol/logika tetap).
- `nav()`: caption → kotak ringkasan `.cps-facts`; kartu kerja `.cps-work` dibuka sebelum lane channel. Ditutup di akhir 8 route channel (5 di setup.js, 3 di setup2.js).
- CSS: kotak ringkasan, kartu kerja + panel dalam + sub-panel lane, section head dari catatan pertama, step indicator satu baris, tombol kelas rata kanan.
- Verifikasi: diff hanya "Kembali" + kotak ringkasan; skenario 21/21 & `localStorage` identik; `.cps-work` benar 105/105; overflow 0 (1440/1280, Setup + modul); console 0; tes kerangka & Kembali lulus.

## Iterasi bersih · "lebih modern, bersih, enak dibaca" (23 Okt 2026)

- Markup: `nav()` membungkus DetailHeader + langkah 1–8 dalam `.cps-head` (satu kartu).
- CSS: breadcrumb kecil disembunyikan (dobel dengan Kembali, link tetap di DOM); judul program 24/32; pemilih channel/brand = segmented control sejajar label; isi kartu kerja tanpa kotak bergaris (bagian dipisah judul + garis, jarak 40); panel samping abu-abu lembut; catatan pembuka = kotak catatan berikon info; input form M 44px, input tabel tetap 32px; blok kelas/layer/section abu-abu lembut; header tabel abu-abu muda, baris lebih lega.
- Verifikasi: diff hanya "Kembali" + kotak ringkasan; skenario 21/21 & `localStorage` identik; `.cps-work` 105/105; overflow 0; console 0; tes kerangka, Kembali, dan langkah satu baris (1440/1280) lulus.

## Sidebar bisa diperkecil (23 Okt 2026)

- `ui.js`: tombol `button.cmp-side-toggle[data-click="toggleSidebar"]` di kepala sidebar; `clicks.toggleSidebar` men-toggle `.cmp-shell.is-collapsed` dan menyimpan pilihan di `localStorage` (`tradee-sidebar-collapsed`, preferensi per browser, bukan data program); `layout()` membaca pilihan itu saat render.
- CSS: aturan sidebar 58px dipindah dari media query 1025–1199px ke `.cmp-shell.is-collapsed` (desktop ≥ 1025px); ikon « berputar jadi »; tombol disembunyikan di mobile.
- `index.html`: penanda versi aset `?v=2026102302` (cache browser lama menyimpan JS sebelum reskin).
- Verifikasi: toggle 240 ↔ 58 di 1440 & 1100, tetap setelah pindah halaman & reload, flyout hover bisa diklik, overflow 0, console 0. Setup diff/skenario/`localStorage` tidak berubah; kerangka modul hanya bertambah tombol toggle.

## Mengurangi kesan penuh (23 Okt 2026)

File baru `js/pages/setup-view.js` (dimuat setelah `setup2.js`), lapisan tampilan di atas DOM yang sudah dirender; `setup.js` / `setup2.js` / engine tidak diubah. Elemen buatannya diberi `data-cps-ui`.
1. Catatan pembuka > 140 karakter dilipat satu baris + "Selengkapnya / Ringkas".
2. Mode lihat / edit untuk 10 form konfigurasi (bukan clone, tipe, channel, exception, publish). Mode lihat: `fieldset` disabled, input tampil sebagai teks, tombol edit disembunyikan (link navigasi tetap), angka ≥ 10.000 diformat (40.000.000; dikembalikan ke angka mentah saat Edit). Bar "Mode lihat · Edit" / "Mode edit · Batal" di atas form; Batal (konfirmasi bila ada perubahan) menggambar ulang dari data tersimpan; Simpan → kembali mode lihat. Program terkunci (PUBLISHED/CLOSED) selalu mode lihat tanpa bar; MOU/SKN PUBLISHED tetap punya Edit. Gagal validasi header (retry) → mode edit. Program baru → langsung bisa diisi. Angka hanya diformat di mode lihat karena kode lama membaca nilai input langsung saat mengedit.
3. Kelas & tier: satu baris ringkas per kelas ("Kelas A · Rp 40,0 jt – 150,0 jt · Fix 1% · 3 tier (70–80%)"), klik untuk membuka, ringkasan ikut berubah saat diketik, kelas baru langsung terbuka. Approval layer: kondisi auto-approve diringkas ("1 kondisi auto-approve · Jika Growth per brand (%) ≥ 70"). Field fase: kolom Diulang / Min / Maks di balik "Tampilkan pengaturan lanjutan".
Tooling: `go()` memanggil `CPSView.audit()` (semua form edit, semua bagian terbuka, angka mentah) agar hook & skenario sebanding; screenshot memakai tampilan default; elemen `data-cps-ui` diabaikan diff.
Verifikasi: diff hanya Kembali + kotak ringkasan; skenario 21/21 & `localStorage` identik; tes perilaku 21 cek lulus (mode lihat default, format angka, cek cepat, lipat/buka, Edit, ringkasan live, kelas baru terbuka, Batal + konfirmasi tanpa mengubah data, Simpan → lihat, catatan, layer, kolom lanjutan, retry, program baru, PUBLISHED, MOU PUBLISHED, target LM); overflow 0; console 0.

## Permintaan 23 Okt 2026: tipe program, eligibility, warna

1. **Tipe program dihapus dari tampilan header**: dropdown "Tipe program", link "+ Tambah tipe baru", kartu "Tambah tipe program" (form `setup.addType` + daftar aktif/nonaktif), dan kotak ringkasan "Tipe program" di DetailHeader. Nilai tipe tetap dikirim lewat `<input type="hidden" name="program_type_id">` (validasi header mewajibkan tipe; program lama memakai tipenya, program baru memakai tipe default pertama). Handler `setup.addType` / `setup.toggleType` masih ada di `setup.js` tapi tidak dipanggil lagi. Kolom "Tipe" di tabel daftar program tidak diubah. Form header jadi selebar halaman: Kode | Nama · Tahun | Periode mulai | Periode selesai · Deskripsi.
2. **Eligibility per bagian**: Syarat pendaftaran · Syarat payout · Jadwal masing-masing kotak bergaris dengan judul yang bisa dilipat (`setup-view.js` memindah kolom bagian ke kotaknya di form yang sama); bagian pertama terbuka, lainnya terlipat; tombol simpan di luar kotak.
3. **Warna kartu kerja channel** (palet COMPASS): pita pemilih channel + tab biru muda (`--status-bg-200`), segmented aktif biru penuh, aksen biru di judul bagian, panel samping & catatan & header tabel biru muda dengan teks `--primary-700`, aksen kiri `--primary-300` + label kelas berwarna di blok kelas/section, kotak bagian eligibility berjudul biru.
Verifikasi: diff hanya Kembali, kotak ringkasan (tanpa Tipe), dan elemen tipe program yang dihapus; skenario identik kecuali 2c (form tambah tipe dihapus → tipe "Tipe Reskin" tidak terbentuk di data); tes perilaku 21/21; tes eligibility & header (lipat, simpan rasio, simpan header tipe tetap, program baru bertipe default) lulus; overflow 0; console 0.

## Role CBD/CDT disamakan dengan Program Setup (23 Okt 2026)

Keputusan (ditanyakan dulu): semua halaman yang bisa dibuka CDT, termasuk halaman bersama (Dashboard, Peserta, Detail monitoring, Inbox, Payout, Master Toko) · pola Setup dengan alur tetap · form isian tanpa mode lihat · tabel brand tetap tabel, dirapikan.

- `ui.js`: helper `UI.detailHead()` (markup DetailHeader yang sama dengan `nav()` Setup: Kembali · judul + tag · keterangan · kotak ringkasan · aksi).
- Kartu daftar (`.cps-list`, judul Plus Jakarta): Registration (tile channel biru muda), Peserta & Master Toko (filter = action bar), Monitoring, Payout ringkasan, Dashboard (tile statistik), Inbox.
- DetailHeader + kartu kerja (`.cps-work`): Saran toko (pemilih channel segmented, aturan eligibility = catatan), Payout per program (channel & komponen di pita, periode di sub-baris, Export di kanan header), Form daftar/revisi, Form monitoring, Form payout (panel approval + tombol kirim = panel biru muda).
- DetailHeader + kartu: Detail peserta, Detail monitoring, Detail payout (Revisi di kanan header; kotak "Menunggu Anda" beraksen kuning).
- Breadcrumb tetap di DOM tapi disembunyikan seperti di Setup; tombol Kembali ke induk langsung (form revisi → detail peserta).
- `setup-view.js`: catatan hanya dilipat bila benar-benar terpotong.
- CSS: aksi DetailHeader, tile, action bar, statistik, approval box, `dl`, `details`, segmented komponen/periode, tabel brand form daftar (hasil hitung menonjol), panel samping `col-lg`, checkbox tabel, kolom aksi selebar isi, alert sederhana block, label brand inline-block, tabel padat sedikit lebih rapat di < 1440.
- Tooling: capture modul 48 halaman (Admin HO, CBD, Admin DC, ABL, Finance, termasuk form & detail) + 12 skenario CDT/approver (daftar toko + hitung otomatis + error, approve dari detail, kembalikan → revisi → kirim ulang, inbox bulk + konfirmasi, monitoring dengan validasi bawaan & 11 evidence, filter peserta & toko, ajukan payout, dashboard 3 role). Baseline dari worktree HEAD; pra-cek pada kode sebelum perubahan CDT identik.
- Verifikasi: skenario CDT & `localStorage` identik dengan kode asli; 0 hook modul hilang/berubah; perbedaan konten hanya Kembali, kotak ringkasan berlabel (nilai sama), link toko di ringkasan, link channel di pemilih; overflow 0; console 0; Program Setup tidak berubah. Di 1280 tabel saran toko "tampilkan semua" bisa digeser di dalam kartu (tabel lebar).
