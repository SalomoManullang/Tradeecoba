# Laporan akhir: Reskin Program Setup Tradee 2027 ke COMPASS

Tanggal: 23 Okt 2026 · Scope: **Opsi B** (konten semua route `/setup*` + kerangka aplikasi semua modul) · Belum di-commit.

Ringkasan: tampilan Program Setup dan kerangka aplikasi sekarang memakai design language COMPASS. Flow, logic, data, dan perilaku tidak berubah. Perubahan DOM di konten Setup hanya dua: tombol **← Kembali** di DetailHeader (Gap 6 opsi 1) dan caption program yang diganti **kotak ringkasan berlabel** (Tipe program · Periode · Channel · Registrasi, nilai sama) pada penataan ulang lanjutan 23 Okt 2026. Semua skenario, angka simulasi, hasil validasi, dan isi `localStorage` identik dengan sebelum reskin.

Dokumen pendukung: [inventory.md](inventory.md) (Fase 0 + keputusan), [log.md](log.md) (catatan per fase), [diff-report.md](diff-report.md), [diff-report-modules.md](diff-report-modules.md).

---

## 1. File yang diubah dan dibuat

| File | Status | Isi perubahan |
|---|---|---|
| `css/compass-tokens.css` | baru | Token COMPASS apa adanya dari `_ds` (fig-tokens, typography, effects) + tambahan spec §1–§5 (`--color-interactive`, `--color-icon-secondary`, skala tipe, spacing, radius, ukuran layout). |
| `css/compass-skin.css` | baru | Fase 1 fondasi, Fase 2 kerangka + komponen, Fase 3 komposisi halaman. Semua aturan konten di-scope ke `.cps`; kerangka memakai class `.cmp-*`. |
| `index.html` | ubah | `<link>` font Lato, Plus Jakarta Sans, JetBrains Mono + dua CSS baru setelah `app.css`. |
| `js/ui.js` | ubah | Hanya `layout()`: kontainer kerangka jadi sidebar + NavigationTop; avatar, nama, role, tanggal. Builder menu, `bindMenus`, dropdown, handler tidak diubah. |
| `js/pages/setup.js` | ubah | Wrapper `<div class="cps">` di semua template; wrapper `.cps-list` di daftar program; DetailHeader (← Kembali + divider + `.cps-detail-main` + kotak ringkasan `.cps-facts`) di `nav()` dan halaman Program baru; kartu kerja `.cps-work` dibuka di `nav()` dan ditutup di akhir 5 route channel. |
| `js/pages/setup2.js` | ubah | Wrapper `<div class="cps">` di semua template; penutup `.cps-work` di 3 route channel (fase, eligibility, dokumen). |
| `README.md` | ubah | Dua baris struktur untuk file CSS baru. |
| `reference/` | baru | Salinan COMPASS (referensi), dokumen kerja, tooling verifikasi. Tidak ikut deploy Vercel. |

Tidak disentuh: `js/engine.js`, `js/formula.js`, `js/store.js`, `js/catalog.js`, `js/seed.js`, `js/app.js`, `css/app.css`, semua `${...}`, fungsi, handler, validasi, rumus, data seed.

Deploy: build Vercel menyalin `index.html`, `js/`, `css/`, `assets/`, `vendor/`, sehingga dua CSS baru ikut ter-deploy tanpa mengubah `vercel.json`.

## 2. Diff `baseline.json` vs `after.json`

Baseline diambil dari kode sebelum reskin (git worktree di HEAD `73e51e9`).

| Cek | Program Setup (128 route) | Modul lain (21 route, 3 role) |
|---|---|---|
| `id`, `name`, `type`, `value`, `href`, semua `data-*` | Identik | Identik |
| `required` / `readonly` / `disabled` (termasuk `fieldset`), opsi select | Identik | Identik |
| Parent semantik (form, fieldset, table, tr, td, label, elemen ber-hook) | Identik | Identik |
| Class lama | Tidak ada yang hilang | Tidak ada yang hilang |
| Teks / copy | Identik kecuali "Kembali" dan caption → kotak ringkasan (label baru "Tipe program", "Periode", "Channel", "Registrasi"; nilai sama; kata "channel"/"registrasi" kecil dan pemisah "·" hilang) | Identik |
| Elemen baru | `a.btn-ghost.cps-back` "Kembali" (124 route detail) | – |
| Struktur kartu kerja (`.cps-work` tepat satu, anak terakhir `.cps`) | 105/105 route channel benar | – |
| Hook kerangka | – | Semua `id`, `data-*`, `data-toggle`, `data-click`, teks menu tetap; class layout Metronic dibuang dari 5 kontainer (`kt-grid__item`, `kt-aside-menu…`, `kt-header-menu…`), tidak dipakai JS |
| Struktur wrapper (`.kt-container` hanya flash + `.cps`) | 128/128 benar | – |
| Console error baru | 0 | 0 |
| Overflow horizontal halaman 1440 / 1280 | 0 / 0 | 0 / 0 |

## 3. Skenario inti

Semua **lulus (identik)**. 21 skenario, deep-compare JSON sebelum vs sesudah.

| Skenario | Hasil | Contoh pembanding (sebelum = sesudah) |
|---|---|---|
| 1 Clone program, 1b kode bentrok | Lulus | → `#/setup/3/channels`; error "Kode "LOYALTY-2027" sudah dipakai program lain.", isian tetap |
| 2 Header error + simpan, 2c tambah tipe | Lulus | "Periode selesai harus setelah tanggal mulai." · "Header program disimpan." |
| 3 Tambah channel, eligibility error + simpan | Lulus | channel LMT → `#/setup/3/ch/6/eligibility`; error Payout Fix < Monitoring |
| 4 Kelas & tier (`#addClass`, auto-hitung, flag, cek cepat) | Lulus | flag "Kelas F: rebate tier 2 turun"; cek cepat "Kelas D · tier 70% → total 4.5%"; 6 kelas tersimpan |
| 5 Struktur pilar error + simpan | Lulus | "4 pilar → 6 JTBD → 12 lead measure" |
| 6 Target LM (isi, operator, section, merge), 6b resize | Lulus | "5/6 kelas" tersimpan; lebar `f3` 315px; `lmt-resizing` dilepas |
| 7 Rumus (preset, override, klik variabel, hapus) | Lulus | variabel `baseline` tersisip, valid; 7 slot + override tersimpan |
| 8 Form fase + approval layer | Lulus | 8 field; layer 4 → 3 dengan kondisi ≥ 75 |
| 9 Template MOU (section, placeholder, preview) | Lulus | preview "Memorandum of Understanding — Reskin Test…" |
| 10 Exception toko tambah/hapus | Lulus | LOCOMM-0003 |
| 11 Simulasi 72 kombinasi | Lulus | Wardah, growth 76%: Kelas B · target program Rp 2.400.000.000 · conditional 1.75% · fix maks 1% · total 2.75% · achievement 76,0% · conditional Rp 18.480.000 · fix Rp 10.560.000 |
| 12 Validasi 2026 / 2027 / DRAFT | Lulus | DRAFT 21 baris error/warning identik, mis. "Local Modern Trade · Belum ada brand peserta." |
| 13 Hapus DRAFT (`data-confirm`), 14 Close program | Lulus | dialog `confirm()` sama; program terhapus; status CLOSED |
| `localStorage` setelah skenario | Identik | 472.331 byte, sama persis |

Uji interaksi tambahan (Playwright, CSS final): dropdown menu header + navigasi; submenu bertingkat; dropdown user + Ganti role; dropdown tahun + pilih tahun; tombol tahun → lobby; link sidebar; sidebar 58px + flyout hover (1100px); sidebar mobile buka/tutup (800px); Reset data dari footer; tombol Kembali di 4 jenis halaman → `#/setup`. Semua lulus, console error 0.

## 4. Screenshot sebelum / sesudah

Semua route ada di `screens/before/{1440,1280}/` dan `screens/after/{1440,1280}/` dengan nama file sama; modul lain di `screens/{before,after}/modules/`. Pasangan utama (1440):

| Halaman | Sebelum | Sesudah |
|---|---|---|
| Daftar program + clone | [before](screens/before/1440/2027_setup_after-clone.png) | [after](screens/after/1440/2027_setup_after-clone.png) |
| Program baru | [before](screens/before/1440/2027_setup_new.png) | [after](screens/after/1440/2027_setup_new.png) |
| Header program | [before](screens/before/1440/2027_setup_3_header.png) | [after](screens/after/1440/2027_setup_3_header.png) |
| Channel | [before](screens/before/1440/2027_setup_3_channels.png) | [after](screens/after/1440/2027_setup_3_channels.png) |
| Eligibility & jadwal | [before](screens/before/1440/2027_setup_3_ch_4_eligibility.png) | [after](screens/after/1440/2027_setup_3_ch_4_eligibility.png) |
| Brand | [before](screens/before/1440/2027_setup_3_ch_4_brands.png) | [after](screens/after/1440/2027_setup_3_ch_4_brands.png) |
| Kelas & tier | [before](screens/before/1440/2027_setup_3_ch_4_brands_19.png) | [after](screens/after/1440/2027_setup_3_ch_4_brands_19.png) |
| Struktur pilar | [before](screens/before/1440/2027_setup_3_ch_4_pillars.png) | [after](screens/after/1440/2027_setup_3_ch_4_pillars.png) |
| Target lead measure | [before](screens/before/1440/2027_setup_3_ch_4_pillars_19.png) | [after](screens/after/1440/2027_setup_3_ch_4_pillars_19.png) |
| Rumus | [before](screens/before/1440/2027_setup_3_ch_4_formulas.png) | [after](screens/after/1440/2027_setup_3_ch_4_formulas.png) |
| Fase: form & approval | [before](screens/before/1440/2027_setup_3_ch_4_phases_REGISTRATION.png) | [after](screens/after/1440/2027_setup_3_ch_4_phases_REGISTRATION.png) |
| Dokumen MOU | [before](screens/before/1440/2027_setup_3_ch_4_documents_MOU.png) | [after](screens/after/1440/2027_setup_3_ch_4_documents_MOU.png) |
| Simulasi (PUBLISHED) | [before](screens/before/1440/2027_setup_2_simulate.png) | [after](screens/after/1440/2027_setup_2_simulate.png) |
| Validasi & publish (DRAFT) | [before](screens/before/1440/2027_setup_3_validate.png) | [after](screens/after/1440/2027_setup_3_validate.png) |
| Close (PUBLISHED) | [before](screens/before/1440/2027_setup_2_validate.png) | [after](screens/after/1440/2027_setup_2_validate.png) |
| Audit log | [before](screens/before/1440/2027_setup_2_audit.png) | [after](screens/after/1440/2027_setup_2_audit.png) |
| Modul lain: Registration (CBD) | [before](screens/before/modules/1440/CBD_registration_program_2_2.png) | [after](screens/after/modules/1440/CBD_registration_program_2_2.png) |

## 4b. Penataan ulang lanjutan (permintaan "Program Setup lebih dalam", 23 Okt 2026)

Mengikuti pola layar detail COMPASS (DetailHeader + kotak ringkasan + satu kartu berisi tab dan panel):

1. **DetailHeader**: info program jadi 4 kotak ringkasan (label 12 tersier + nilai 16 bold, latar `--color-bg-primary`) di kanan; judul + Tag di kiri.
2. **Kartu kerja channel** (`.cps-work`): pemilih channel, tab 3a–3h, dan seluruh isi halaman konfigurasi dalam satu kartu. Kartu di dalamnya jadi panel bergaris `--color-border-subtle` tanpa bayangan; lane brand / struktur pilar / fase jadi sub-panel abu-abu.
3. **Section head**: paragraf catatan pertama di kartu jadi note 12 tersier dengan garis pemisah, seperti `head(title, note)` di Manage Project.
4. **Step indicator** selalu satu baris; di < 1440px garis penghubung dirapatkan (muat di 1280; di 1200 bisa digeser di dalam kartu).
5. Kartu kelas: grup tombol ↑ ↓ hapus rata kanan.

Field, tombol, urutan, `id`/`name`/`data-*`, dan logika tetap sama (diff + 21 skenario identik).

## 4c. Iterasi bersih (permintaan "lebih modern, bersih, enak dibaca", 23 Okt 2026)

Header + langkah dalam satu kartu · breadcrumb kecil disembunyikan (tetap di DOM) · segmented control untuk channel/brand · isi kartu kerja tanpa kotak bergaris · panel samping abu-abu lembut · catatan pembuka berikon info · input form 44px (M), tabel tetap padat · blok editor abu-abu lembut · header tabel abu-abu muda. Hasil verifikasi sama dengan §2–§3 (diff hanya Kembali + kotak ringkasan; 21 skenario dan `localStorage` identik).

## 4d. Mengurangi kesan penuh (23 Okt 2026)

Lapisan tampilan `js/pages/setup-view.js`: catatan panjang dilipat · mode lihat / edit per form konfigurasi (angka besar diformat di mode lihat) · kelas & tier dan kondisi approval layer sebagai ringkasan satu baris yang bisa dibuka · kolom Diulang / Min / Maks field fase di "Pengaturan lanjutan". Alur berubah sengaja: form konfigurasi DRAFT perlu klik **Edit** sebelum diubah. Detail dan hasil uji di [log.md](log.md).

## 4e. Permintaan 23 Okt 2026: tipe program, eligibility, warna

Tipe program dihapus dari tampilan header (nilainya tetap dikirim tersembunyi karena wajib di validasi) · bagian eligibility jadi kotak yang bisa dilipat · kartu kerja channel diberi warna biru muda dan aksen biru dari palet COMPASS. Skenario 2c (tambah tipe) kini dilewati karena formnya dihapus. Detail di [log.md](log.md).

## 4f. Halaman CDT & approver disamakan dengan Program Setup (23 Okt 2026)

16 route di `registration.js`, `monitoring.js`, `payout.js`, `inbox.js`, `auth.js` (dashboard), `master.js` (Master Toko) memakai pola Setup: kartu daftar, DetailHeader dengan kotak ringkasan, kartu kerja berwarna dengan pemilih segmented. Alur, field, dan logika tetap; 12 skenario CDT/approver dan data identik dengan kode asli. Perbandingan visual: [compare.html](compare.html). Detail di [log.md](log.md).

## 5. Usulan yang tidak diterapkan (mengubah flow / copy / butuh logika baru)

UX:
1. **State "selesai" di step indicator** (lingkaran hijau + centang seperti Manage Project). Butuh logika kelengkapan per step.
2. **`confirm()` → Modal COMPASS** untuk hapus DRAFT, hapus channel, hapus kelas/pilar/JTBD, close program, reset data. Mengubah perilaku dialog.
3. **Penanda halaman aktif di sidebar**. Butuh logika path. (Tombol perkecil sidebar 240 ↔ 58px sudah dibuat atas permintaan, pilihan diingat per browser.)
4. **Kolom pencarian menu di sidebar** (anatomi Sidebar COMPASS). Kontrol baru tanpa fungsi saat ini.
5. **Breadcrumb "Program Setup / tahun" dihapus** karena guardrail §7 tidak memakai breadcrumb di halaman detail; tombol Kembali sudah ke tujuan yang sama (Gap 6 opsi 2).
6. **Tab dokumen MOU / SKN di dalam kartu** bersama template (sekarang tab berdiri di atas latar halaman).
7. **Field fase kehilangan fokus** saat pindah input di baris yang sama (`change` → `drawFields()` menggambar ulang baris). Perilaku lama; perlu perubahan logika.
8. **`required` di "Program sumber"** form Clone (label sudah `*`, atribut tidak ada).
9. **Mode gelap**: token COMPASS sudah punya `[data-theme="dark"]`, belum diaktifkan.

Copy:
1. `step-chip` "3d" dipakai untuk struktur pilar dan target lead measure; usul target = "3d-2" atau sesuaikan dengan komentar kode (3c).
2. Karakter "⚠" (`.warn-mark`) diganti ikon outline `bi-exclamation-triangle` (Gap 13 opsi 2; teks "⚠" hilang dari DOM).
3. Title Case untuk judul kartu & tombol sesuai konvensi COMPASS (mis. "Simpan Header", "Program Baru", "Tambah Tipe Program").
4. Kotak ringkasan bisa ditambah CTA di kanan DetailHeader (mis. "Simulasi", "Validasi") seperti layar detail COMPASS; tidak dibuat karena menduplikasi langkah 1–8.

## 6. Review guardrail COMPASS (checklist §Quick foundation)

| Item | Status | Catatan |
|---|---|---|
| Tiga zona: Sidebar + NavigationTop + Content | ✅ | Semua modul. Sidebar 240px (58px di 1025–1199px), top bar 76px |
| Latar `color/bg/primary`; kartu `bg/secondary`, radius 8, shadow `md` | ✅ | |
| Padding konten 24/24/24/40; gap dominan 24 | ✅ | |
| Komponen standar (sidebar, top bar, tabel, action bar, pagination) | ⚠️ sebagian | Dibangun dengan CSS di atas markup Metronic, bukan komponen React COMPASS (sesuai larangan bundle). Tidak ada action bar search/filter/export dan pagination karena fiturnya memang tidak ada di prototype |
| Judul Title/Large Bold; list Plus Jakarta 24/32 | ✅ | DetailHeader Lato 22/28 bold; daftar program Plus Jakarta 24/32 |
| Action bar: Search + Filter + Export kiri, Primary kanan | n/a | Hanya "Program baru" (Primary, kanan) yang ada di prototype |
| Tabel: warna Tag status, kolom aksi 75px, 10 baris, rata kiri | ⚠️ sebagian | Tag & rata kiri ✅ (`.num` kanan). Kolom aksi berisi 2 kontrol (Edit/Lihat + Clone) sehingga > 75px; jumlah baris mengikuti data |
| DetailHeader, bukan breadcrumb; tanpa CTA → rata kiri | ⚠️ | DetailHeader ✅ rata kiri gap 24; breadcrumb masih tampil sebagai caption kecil (Gap 6 opsi 1, copy tidak dihapus) |
| Responsif, tanpa clipping/overflow | ✅ | 0 overflow di 1440/1280 (128 + 21 route); tabel lebar scroll di dalam kartu |

## 7. Review 14 kriteria `compass-design-framework.md`

| # | Kriteria | Status | Catatan |
|---|---|---|---|
| 1 | Contrast: satu aksi utama jelas | ✅ | Satu Primary per kartu form (Simpan …); aksi lain Secondary/Tertiary/Link |
| 2 | Figure clarity | ✅ | Kartu putih + shadow md di atas #F8F9FD; kartu editor bergaris subtle |
| 3 | Proximity | ✅ | Gap 24 antar kartu, 16 antar field, section head di eligibility |
| 4 | Similarity | ✅ | Satu gaya per jenis kontrol di semua halaman (Button, Input, Tag, Tab) |
| 5 | Alignment | ✅ | Grid gutter 24; header tabel rata kiri, angka rata kanan |
| 6 | Consistency | ✅ | Semua warna/ukuran lewat token; ikon tetap bootstrap-icons outline |
| 7 | Accessibility (kontras diukur) | ⚠️ | Teks utama 11,26:1 · sekunder 7,74 · tersier 5,40 · link/Primary 6,48 · Tag Grey 9,45 · Green 4,90 · Blue 8,29 · Red 8,91 · alert 5,61–6,54 · asterisk 4,79. **Di bawah 4,5:** Tag Yellow (warning-700 di warning-100) 3,83, dipakai di warning validasi & layer "menunggu"; placeholder & teks tombol disabled 2,24 (disabled dikecualikan WCAG; placeholder nilai resmi COMPASS). Tidak diubah karena nilai on-system |
| 8 | Style cohesion | ✅ | Konten Setup + kerangka memakai satu bahasa visual. Konten modul lain masih Metronic (scope Opsi B) |
| 9 | Iconography | ✅ | Ikon 14–18px, berlabel teks kecuali up/down/hapus di editor (pola lama, ber-`title` di beberapa tempat) |
| 10 | Continuity | ✅ | DetailHeader → langkah 1–8 → lane channel → tab sub-langkah → kartu kerja |
| 11 | Minimalism | ✅ | Tidak ada elemen dekoratif baru; garis putus-putus lane & warna Excel grid dihapus |
| 12 | Recognition over recall | ⚠️ | Sidebar 58px (1025–1199px) menaruh isi grup di hover; di ≥ 1200px semua terlihat |
| 13 | Feedback / states | ✅ | Hover, focus ring, disabled (termasuk read-only PUBLISHED), Alert 5 status, Tag status, baris kosong |
| 14 | Error prevention | ✅ | Aksi hapus tetap `confirm()` + warna destructive; error form di Alert merah di atas form, isian tidak hilang |

## 8. Gap yang diterapkan (semua opsi 1, keputusan 23 Okt 2026)

Gap 1 CLOSED = Tag Grey tanpa dot · Gap 2 lane = kartu + tombol segmented + Tab · Gap 3 nomor tab = teks 12/700 · Gap 4 input padat 32px · Gap 5 addon Rp/% kotak terpisah · Gap 6 Kembali + breadcrumb sebagai caption · Gap 7 checkbox tetap checkbox · Gap 8 Publish = Primary · Gap 9 auto-approve = Tag Green bergaris putus · Gap 10 pohon pilar dengan garis kiri · Gap 11 grid target: header brand-subtle / bg-primary, garis 1px, kolom beku · Gap 12 baris kosong teks tersier rata tengah · Gap 13 "⚠" tetap, warna warning.

Catatan tambahan di luar daftar gap: sel gabungan di grid target memakai `--status-bg-200` (tint kategori COMPASS) karena `--primary-100` terlalu pekat saat banyak baris tergabung.

## 9. Kesalahan yang terjadi selama pengerjaan (sudah diperbaiki)

1. Fase 1: komentar di `compass-tokens.css` memuat `*/` sehingga blok token utama dibuang browser; Fase 1 sempat dilaporkan "latar berubah" padahal belum. Diperbaiki di Fase 2 + pengaman di `capture.mjs`.
2. `fig-tokens.css` tidak punya `--color-interactive` / `--color-icon-secondary`; tombol Primary sempat tak terlihat. Ditambahkan dari spec.
3. Tooling: klasifikasi "flash" di skenario dan pencocokan elemen di diff diperbaiki supaya tidak memberi perbedaan palsu.

## 10. Cara mengulang verifikasi

```
cd reference/docs/reskin/tools
npm install && npx playwright install chromium   # sekali
node capture.mjs --label after                   # 128 route Setup + skenario + screenshot
node capture.mjs --label after --modules         # modul lain + kerangka
node diff.mjs && node diff.mjs --modules         # → diff-report*.md
```
