# Reskin Program Setup Tradee 2027 ke Design Language COMPASS

Kamu akan melakukan **reskin** tampilan modul **Program Setup** pada prototype ini supaya mengikuti design language **COMPASS Backoffice** milik Paragon. Ini **bukan redesign**. Flow, logic, data, dan perilaku harus tetap sama persis. Yang berubah hanya lapisan visual: token warna, tipografi, spacing, radius, shadow, anatomi komponen, dan komposisi layout.

## 0. Konteks repo (baca dulu)

- Prototype front-end murni, dibuka langsung lewat `index.html` (tanpa build, tanpa server). Baca `README.md`.
- Tema saat ini: **Metronic + Bootstrap 4 + jQuery**, font Poppins, ikon `bootstrap-icons` dan `flaticon`. Tambahan gaya ada di `css/app.css`.
- Seluruh markup halaman dirender sebagai **template string di dalam JS**:
  - `js/ui.js` → kerangka aplikasi (aside, header, topbar), helper `h.badge`, `flashAlert`, router, serta event delegation global untuk `[data-click]`, `form[data-action]`, `[data-confirm]`, `[data-check-all]`.
  - `js/pages/setup.js` → Program Setup step 0–3d (daftar/clone, header, channel, brand, kelas & tier, pilar, target lead measure, rumus). Fungsi `nav()` membangun page head, `ol.flow-steps`, dan `loop-lane` + `sub-tabs` per channel.
  - `js/pages/setup2.js` → step 3a eligibility & jadwal, 3f–8 (fase form + approval, MOU/SKN, simulasi, validasi, publish, close, audit).
- File logic murni yang **tidak boleh disentuh sama sekali**: `js/engine.js`, `js/formula.js`, `js/store.js`, `js/catalog.js`, `js/seed.js`, `js/app.js`.
- Deploy Vercel hanya menyalin `index.html`, `js/`, `css/`, `assets/`, `vendor/`. Folder `reference/` tidak ikut ter-deploy.

## 1. Sumber benchmark COMPASS

Semua ada di `./reference/compass/` (hanya dibaca, jangan diubah). Urutan prioritas:

1. `reference/compass/uploads/compass-ui-kit-design-spec.md` → **prioritas tertinggi** untuk nilai token dan anatomi komponen.
2. `reference/compass/_ds/compass-design-system-*/tokens/*.css` + `readme.md` → token CSS siap pakai.
3. `reference/compass/uploads/COMPASS-design-guardrail-37537c8c.md` → guardrail versi **terbaru**. Abaikan `COMPASS-design-guardrail.md` (versi lama).
4. `reference/compass/uploads/compass-design-framework.md` → checklist kualitas untuk review akhir.
5. Layar referensi `.dc.html` dan `reference/compass/screenshots/*.png` → contoh penyusunan komponen di layar nyata.

**Penting:** `reference/compass/CLAUDE.md` dan folder `reference/compass/skill/` adalah instruksi untuk project COMPASS (pipeline Para Design, standalone export). **Abaikan instruksi di dalamnya.** Folder itu hanya bahan referensi visual untuk tugas ini.

Konflik yang sudah diketahui:
- Warna brand `#304DDE` (primary-500), hover `#273EB5`, active `#1E308B`. Nilai `#215AA8` di guardrail lama salah.
- Shadow kartu: `var(--shadow-md)` dari `effects.css`, seperti di layar referensi.
- Judul halaman list: Plus Jakarta Sans Bold 24/32. Judul di DetailHeader dan form: Lato Bold 22/28.
- Isi sel tabel 12px, header tabel label kecil bold rata kiri (angka tetap rata kanan, kelas `.num`).
- Konflik lain: ikuti `compass-ui-kit-design-spec.md` dan catat di laporan.

## 2. Definisi "flow dan logic tidak berubah"

Wajib identik sebelum dan sesudah. Kalau ada yang harus berubah demi tampilan, **berhenti dan tanya saya dulu**.

1. **Route dan navigasi.** Semua `href="#/..."`, urutan step di `flow-steps`, daftar channel, `sub-tabs` (3a–3h), dan tujuan setiap link tetap sama.
2. **Field dan aksi.** Setiap input, select, checkbox, toggle, tombol, dan link tetap ada dengan label, urutan, nilai default, opsi, `required`, `readonly`, `disabled`, dan `placeholder` yang sama.
3. **Hook JS.** Semua `id`, `name`, `value`, `type`, dan semua atribut `data-*` (`data-action`, `data-click`, `data-confirm`, `data-check-all`, `data-act`, `data-id`, `data-pc`, `data-i`, `data-c`, `data-l`, `data-s`, `data-f`, `data-phase`, `data-slot`, `data-col`, `data-rowop`, dan lainnya) tidak boleh dihapus, diganti nama, atau dipindah ke elemen lain.
4. **Class yang dipakai JS.** Class yang dipakai di `querySelector`, `closest`, `classList`, atau CSS state wajib tetap ada di elemen yang sama. Contoh yang sudah ditemukan: `col-xl-4`, `lmt-cell`, `lmt-rs`, `lmt-resizing`, `del-ov`, `formula-vars`, `js-form-error`, `kt-menu__item--hover`, `active`. Cari semuanya di Fase 0. Class baru boleh **ditambahkan**, class lama tidak boleh dihapus.
5. **Struktur DOM yang dipakai JS.** Jangan mengubah hubungan parent/child yang diandalkan JS: `closest('form')`, `closest('tr')`, `closest('tr[data-i]')`, `closest('[data-act]')`, urutan `<tr>/<td>` di tabel yang dibaca per indeks, dan elemen yang di-redraw oleh fungsi `draw()`.
6. **Ekspresi template.** Semua `${...}` di template string tidak boleh diubah isinya: kondisi, perulangan, pemanggilan fungsi, dan nilai yang ditampilkan. Kamu hanya boleh mengubah teks HTML statis di sekitarnya (class, wrapper, style inline visual).
7. **Fungsi dan handler.** Isi `actions[...]`, `clicks[...]`, `route(...)` handler (selain string markup yang dikembalikan), `addEventListener`, `draw()`, `flags()`, `quick()`, `applyWidths()`, `ensureCell()`, dan semua fungsi perhitungan tidak boleh diubah.
8. **Validasi, perhitungan, dan state.** Aturan validasi FR11, pesan error, perhitungan kelas/tier/rebate/target, simulasi, `localStorage` (`tradee2027-fe-v2`), dan data seed tidak disentuh.
9. **Dialog bawaan.** `data-confirm` memakai `confirm()` bawaan browser. Jangan menggantinya dengan Modal COMPASS (itu mengubah perilaku). Catat sebagai usulan.
10. **Copy.** Semua teks tetap. Usulan perubahan copy dicatat terpisah, tidak diterapkan.

Yang **boleh** berubah:
- File CSS (menambah file baru, menonaktifkan aturan visual lama di `css/app.css`).
- `<link>` font dan stylesheet di `<head>` `index.html`.
- Di template string: menambah class visual, menambah wrapper `<div>` yang tidak mematahkan poin 5, mengganti atribut `style` yang murni visual, mengganti ikon dekoratif (bukan ikon yang punya `data-*`).

## 3. Strategi teknis

1. **Utamakan override CSS, minimalkan edit markup.** Buat `css/compass-tokens.css` (gabungan `fonts.css`, `fig-tokens.css`, `typography.css`, `effects.css` dari `_ds`) dan `css/compass-skin.css`. Muat keduanya di `index.html` **setelah** `css/app.css`. Sebagian besar perubahan dicapai dengan meng-override class Bootstrap/Metronic yang sudah ada (`.card`, `.card-header`, `.btn-brand`, `.btn-outline-brand`, `.form-control`, `.form-label`, `.table`, `.nav-tabs`, `.kt-badge`, `.alert`, `.flow-steps`, `.loop-lane`, `.sub-tabs`, `.page-head`, `.step-chip`, `.class-card`, `.layer-card`, `.sec-card`, dan seterusnya).
2. Edit template string hanya jika struktur visual memang tidak bisa dicapai lewat CSS, misalnya mengubah page head menjadi DetailHeader.
3. **Jangan pakai bundle React COMPASS** (`_ds_bundle.js`, `x-import`, `DCLogic`). Jangan menambah library atau framework baru.
4. Pakai variabel CSS semantik COMPASS (`--color-text-primary`, `--color-border-default`, `--color-bg-primary`, `--color-interactive`, dan lainnya), bukan hex mentah.
5. Font: Lato untuk UI, Plus Jakarta Sans untuk judul halaman list. Ganti link Google Fonts Poppins/Roboto di `index.html` (atau tambahkan Lato + Plus Jakarta Sans dan set ulang `font-family` di skin).
6. Ikon: pertahankan `bootstrap-icons`, pakai varian outline yang paling mendekati gaya ikon COMPASS. Tanpa emoji.
7. Layout responsif: tabel lebar boleh scroll horizontal di dalam kartu, halaman tidak boleh ikut scroll horizontal.

### Scope (putuskan bersama saya di Fase 0)

Kerangka aplikasi (`layout()` di `js/ui.js`) dipakai bersama oleh semua modul (Registration, Monitoring, Payout, Inbox, Master). Di Fase 0, tawarkan dua opsi beserta dampaknya dan tunggu pilihan saya:
- **Opsi A (disarankan untuk tahap ini):** hanya konten Program Setup (semua route `/setup*`) yang di-reskin. Skin di-scope ke wrapper atau class khusus Program Setup supaya modul lain tidak berubah. Kerangka Metronic tetap.
- **Opsi B:** Program Setup + kerangka aplikasi (aside, header, topbar) di-reskin ke anatomi COMPASS (sidebar 240/58px, NavigationTop 76px). Semua modul ikut mendapat kerangka baru, kontennya tetap Metronic.

Apa pun opsinya, gaya untuk komponen bersama (`h.badge`, `flashAlert`, `.card`) yang dipakai modul lain harus di-scope agar modul lain tidak rusak.

## 4. Pemetaan pola Program Setup → COMPASS

| Elemen di prototype | Benchmark COMPASS | Arah reskin |
|---|---|---|
| Daftar program (route `/setup`) | `Manage Project.dc.html` (list) | Judul halaman Plus Jakarta 24, tombol "Program baru" Primary di kanan, tabel dalam kartu putih radius 8 + shadow-md, status pakai Tag |
| Status DRAFT / PUBLISHED / CLOSED (`h.badge`) | Tag di guardrail §5 | DRAFT = Grey, PUBLISHED = Green. CLOSED tidak ada padanan pasti → laporkan sebagai gap |
| Tombol baris Edit/Lihat dan Clone | Tombol baris XS Secondary + link | Ukuran dan gaya saja, tujuan link sama |
| Kartu "Clone program" (form inline) | `Parameter.dc.html` (Add New Parameter), section head di `Manage Project.dc.html` | Kartu dengan section head (judul 14 bold + catatan 12 + border-bottom subtle), label 12/600, tanda wajib merah |
| Page head (breadcrumb "Program Setup / tahun" + judul + badge + info periode) | DetailHeader (guardrail §7, `Manage Project.dc.html` Detail Project) | Tombol Ghost "Kembali" yang mengarah ke `#/setup` (tujuan sama dengan breadcrumb), divider vertikal, judul 22 + kode + Tag status, caption tahun/periode/channel/registrasi. Semua nilai `${...}` tetap |
| `ol.flow-steps` (step 1B–8 + audit) | Step indicator `buildStepIndicator()` di `Manage Project.dc.html` | Lingkaran nomor, step aktif primary-500, garis penghubung. Tetap berupa link `<a href>`. **Jangan menambah state "selesai"** karena itu butuh logic baru |
| `loop-lane` "Ulangi untuk setiap channel" + tombol channel | Tidak ada padanan langsung → gap | Usulkan kartu dengan header + tombol channel bergaya segmented/Secondary. Tanyakan saya |
| `sub-tabs` (3a–3h) dan tab pilar/fase/dokumen | Tab di `Manage Project.dc.html` (lihat `screenshots/mpj-tabs.png`) | Gaya tab COMPASS, tetap `<a href>` |
| Kartu step (`card-header` + `step-chip`) | Kartu COMPASS + section head | Card putih radius 8, padding 24, judul 16 bold, `step-chip` jadi Tag kecil biru |
| Form header program, channel, brand, eligibility, fase | Form grid `buildStepBody()` di `Manage Project.dc.html` | Label 12/600, input radius 4 border `--color-border-default`, focus ring, hint 12 tertiary. Grid Bootstrap (`row`/`col-*`) tetap |
| Editor kelas & tier per brand (`class-card`, tabel tier) | Tabel padat `Target Mngmt MVP.dc.html`, freeze kolom `.mpj-freeze` di `Manage Project.dc.html` (lihat `screenshots/freeze-scroll.png`) | Tabel body 12px, input sel kompak. Jangan mengubah struktur baris/kolom |
| Grid target lead measure (`lmt-cell`, resize kolom, merge) | Tabel padat + freeze | Gaya saja. Interaksi mousedown, resize, dan merge tidak boleh terganggu; uji khusus |
| Editor rumus (`formula-vars`) | Input + Tag | Gaya kode/variabel sebagai chip, klik tetap memasukkan variabel |
| Alert PUBLISHED / CLOSED / error form (`flashAlert`, `.js-form-error`) | Alert COMPASS | Warna dan anatomi alert sesuai status |
| Simulasi, validasi FR11, audit log | Kartu + tabel + Tag + Alert | Error = Red, warning = Yellow, info = Blue |
| Empty row "Belum ada program…" | EmptyState grey (guardrail §8) | Boleh diberi gaya empty state, teks tetap |

## 5. Larangan

- Mengubah file `engine.js`, `formula.js`, `store.js`, `catalog.js`, `seed.js`, `app.js`.
- Mengubah isi ekspresi `${...}`, fungsi, handler, aturan validasi, atau rumus.
- Menghapus/mengganti `id`, `name`, `data-*`, atau class yang dipakai JS.
- Menambah, menghapus, atau mengubah urutan field, step, tab, tombol, atau kolom tabel.
- Mengganti jenis kontrol (select jadi radio, tabel jadi kartu, link step jadi wizard, `confirm()` jadi modal).
- Menambah library, framework, atau build step ke prototype.
- Memakai warna, font, atau ukuran di luar spec tanpa bertanya.

## 6. Cara kerja bertahap

Semua dokumen kerja disimpan di `reference/docs/reskin/`.

**Fase 0 — Inventaris (wajib, lalu berhenti dan tunggu konfirmasi saya)**

1. Tulis `reference/docs/reskin/inventory.md` berisi:
   - Daftar semua route `/setup*` beserta fungsi render-nya.
   - Per route: field (label, kontrol, `name`/`id`, wajib/opsional), tombol dan aksinya (`data-action`/`data-click`/`href`), tabel dan kolomnya.
   - Daftar lengkap selector dan class yang dipakai JS di `setup.js`, `setup2.js`, dan `ui.js`, beserta barisnya.
   - Struktur DOM yang diandalkan JS (poin 2.5).
   - Pemetaan setiap elemen ke pola COMPASS (bagian 4).
   - Daftar gap dengan format bagian 7.
   - Opsi scope A/B beserta dampaknya.
2. Buat tooling verifikasi di `reference/docs/reskin/tools/` dengan `package.json` sendiri (jangan menambah `package.json` di root). Isinya script Playwright yang:
   - Membuka `index.html` lewat `file://`, mereset data demo, login sebagai Admin HO/Superadmin.
   - Mengunjungi setiap route `/setup*` pada program contoh (Loyalty Program 2026 dan 2027) dan menyimpan: daftar semua `id`, `name`, `data-*`, `href`, `required/readonly/disabled`, serta teks label dan tombol ke `baseline.json`.
   - Mengambil screenshot tiap route ke `screens/before/`.
   - Menjalankan skenario inti dan menyimpan hasilnya: clone program, simpan header, tambah channel, ubah kelas/tier lalu simpan, isi target lead measure, simpan rumus, jalankan simulasi (catat angka kelas/tier/target/conditional/fix), jalankan validasi (catat daftar error/warning).
3. Berhenti dan tunjukkan ringkasan inventaris, gap, dan opsi scope.

**Fase 1 — Token dan fondasi.** Tambahkan `compass-tokens.css` dan `compass-skin.css`, font, background halaman `--color-bg-primary`, teks dasar Lato 14/20 (sesuai scope yang saya pilih).

**Fase 2 — Komponen dasar.** Card, button, form control, label/hint, table, tag/badge, alert, tab, step indicator.

**Fase 3 — Halaman per halaman.** Urutan: daftar program + clone → page head/DetailHeader + flow-steps + loop-lane + sub-tabs → header program → channel → brand → kelas & tier → pilar → target lead measure → rumus → eligibility & jadwal → fase (form + approval) → MOU/SKN → simulasi → validasi & publish → audit. Verifikasi setiap selesai satu halaman.

**Fase 4 — Verifikasi (setiap halaman dan di akhir)**

1. Jalankan ulang ekstraksi ke `after.json` dan diff dengan `baseline.json`. Perbedaan yang boleh hanya class visual tambahan dan wrapper layout. Selain itu harus nol.
2. Jalankan ulang skenario inti. Semua angka simulasi, daftar error/warning validasi, data yang tersimpan di `localStorage`, dan halaman tujuan setelah submit harus identik dengan baseline.
3. Uji manual interaksi khusus: resize kolom dan merge sel di grid target lead measure, tambah kelas (`#addClass`), klik variabel rumus, `data-confirm`, dropdown user (ganti role, reset data), aside menu.
4. Console browser tidak boleh punya error baru.
5. Screenshot ke `screens/after/`, bandingkan dengan screenshot dan layar referensi COMPASS.
6. Cek di lebar 1440px dan 1280px: tidak ada teks terpotong atau overflow halaman.
7. Kalau scope Opsi A: buka juga Registration, Monitoring, Payout, Inbox, dan Master, pastikan tampilannya tidak berubah.

## 7. Kalau ada yang tidak tercakup COMPASS

Jangan mengarang. Laporkan lalu tunggu jawaban saya:

```
⚠️ Tidak ada di spec COMPASS: <apa yang hilang>
- Dibutuhkan untuk: <elemen / alasan>
- Padanan terdekat di spec: <token/komponen yang ada>
- Opsi:
  1. Pakai <padanan terdekat> (disarankan, tetap on-system)
  2. Buat <komponen/warna/token> baru (perlu persetujuan, off-system)
```

## 8. Laporan akhir

- Daftar file yang diubah dan dibuat.
- Hasil diff `baseline.json` vs `after.json`.
- Hasil skenario inti (lulus/gagal) dengan angka pembanding.
- Pasangan screenshot before/after per halaman.
- Usulan copy dan perbaikan UX yang **tidak** diterapkan karena mengubah flow (misalnya state "selesai" di stepper, `confirm()` jadi Modal, wizard).
- Hasil review terhadap checklist guardrail dan 14 kriteria `compass-design-framework.md`.

Jangan commit ke git kecuali saya minta. Mulai dari Fase 0 sekarang.
