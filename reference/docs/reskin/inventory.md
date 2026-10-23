# Inventaris Fase 0: Reskin Program Setup ke COMPASS

Status: **selesai** (Fase 0–5). Keputusan di bagian 8b, catatan per fase di [log.md](log.md), laporan akhir di [report.md](report.md).

Dokumen pendamping:
- [inventory-fields.md](inventory-fields.md): lampiran otomatis berisi field, tombol/link, dan tabel per route (dibaca dari DOM).
- [tools/](tools/): tooling verifikasi (Playwright). Cara pakai ada di bagian 9.
- `baseline.json`, `scenarios-before.json`, `state-before.json`, `screens/before/{1440,1280}/`: baseline sebelum reskin.

---

## 1. Route `/setup*` dan fungsi render

Semua route memanggil `UI.requireSetup()` (hanya Admin HO / Superadmin). Route dengan `:id` memakai `getProgram()` dan gagal bila tahun program ≠ tahun sesi. Kecuali daftar dan program baru, setiap route diawali `nav(p, step, ch, sub)` ([setup.js:41](../../../js/pages/setup.js#L41)): page head, `ol.flow-steps`, alert kunci PUBLISHED/CLOSED, lalu `loop-lane` channel + `sub-tabs` (hanya di step 3).

| Step | Route | Render | `after()` (JS interaktif) |
|---|---|---|---|
| 0 / 1A | `#/setup` (`?clone=:id`) | [setup.js:69](../../../js/pages/setup.js#L69) | – |
| 1B | `#/setup/new` | [setup.js:164](../../../js/pages/setup.js#L164) → `headerPage()` [:129](../../../js/pages/setup.js#L129) | – (inline `onclick` scroll ke `#typeForm`) |
| 1B | `#/setup/:id/header` | [setup.js:170](../../../js/pages/setup.js#L170) → `headerPage()` | – |
| 2 | `#/setup/:id/channels` | [setup.js:222](../../../js/pages/setup.js#L222) | – |
| 3a | `#/setup/:id/ch/:pc/eligibility` | [setup2.js:218](../../../js/pages/setup2.js#L218) | – |
| 3b | `#/setup/:id/ch/:pc/brands` | [setup.js:265](../../../js/pages/setup.js#L265) | – |
| 3c | `#/setup/:id/ch/:pc/brands/:b` | [setup.js:322](../../../js/pages/setup.js#L322) | `draw()`, `flags()`, `quick()`, `#addClass` |
| 3d | `#/setup/:id/ch/:pc/pillars` | [setup.js:485](../../../js/pages/setup.js#L485) + `pillarTabs()` [:474](../../../js/pages/setup.js#L474) | `draw()`, `wsum()`, `#addPillar` |
| 3d-2 | `#/setup/:id/ch/:pc/pillars/:b` | [setup.js:625](../../../js/pages/setup.js#L625) + `pillarTabs()` | `draw()`, `ensureCell()`, `applyWidths()`, resize, merge/section |
| 3e | `#/setup/:id/ch/:pc/formulas` | [setup.js:895](../../../js/pages/setup.js#L895) | cek sintaks `.fx`, preset, katalog, override |
| 3f–g | `#/setup/:id/ch/:pc/phases` → redirect `/phases/REGISTRATION` | [setup2.js:17](../../../js/pages/setup2.js#L17) | – |
| 3f–g | `#/setup/:id/ch/:pc/phases/:phase` | [setup2.js:18](../../../js/pages/setup2.js#L18) | `drawFields()`, `drawLayers()` |
| 3h / 7 | `#/setup/:id/ch/:pc/documents` → redirect `/documents/MOU` | [setup2.js:358](../../../js/pages/setup2.js#L358) | – |
| 3h / 7 | `#/setup/:id/ch/:pc/documents/:doc` | [setup2.js:359](../../../js/pages/setup2.js#L359) | `draw()`, placeholder, preview |
| 4 | `#/setup/:id/simulate` (`?ch=:pc`) | [setup2.js:447](../../../js/pages/setup2.js#L447) | `setup()`, `run()`, `approvalHtml()` |
| 5–6 / 8 | `#/setup/:id/validate` (`?focus=close`) | [setup2.js:530](../../../js/pages/setup2.js#L530) | – |
| – | `#/setup/:id/audit` | [setup2.js:579](../../../js/pages/setup2.js#L579) | – |

Urutan `flow-steps`: 1 Header · 2 Channel · 3 Konfigurasi channel · 4 Simulasi · 5–6 Validasi & publish (DRAFT) / Validasi · [7 Edit MOU / SKN · 8 Close, hanya non-DRAFT] · Audit log (ikon, tanpa nomor).
Urutan `sub-tabs` (`CH_TABS`, [setup.js:37](../../../js/pages/setup.js#L37)): 3a Eligibility & jadwal · 3b Brand · 3c Kelas & tier · 3d Pilar · 3e Rumus · 3f–g Fase: form & approval · 3h Dokumen.
Lane lain: brand (3c), "1. Struktur pilar / 2. Target per kelas" (3d), fase Registration · Monitoring · Payout (`nav-pills`), dokumen MOU · SKN (`nav-pills`).

## 2. Field, tombol, dan tabel per route

Daftar lengkap ada di [inventory-fields.md](inventory-fields.md), dibuat dari DOM supaya tidak ada yang terlewat. Ringkasan:

| Route | Form (`data-action`) | Field | Aksi utama | Tabel |
|---|---|---|---|---|
| Daftar + clone | `setup.clone` | source_id, code*, name*, year*, period_start*, period_end* | Program baru, Edit/Lihat, Clone (link), Clone (submit) | Daftar program: Kode · Nama · Tipe · Periode · Channel · Registrasi · Status · aksi |
| Header / baru | `setup.header`, `setup.addType` | code*, name*, program_type_id*, year*, period_start*, period_end*, description; tipe: name*, description, is_active (`#tAct`) | Simpan header / Buat program, Hapus DRAFT (`data-click` + `data-confirm`), + Tambah tipe baru (onclick), Simpan tipe, Aktifkan/Nonaktifkan (`setup.toggleType`) | – |
| Channel | `setup.addChannel` | channel_code | Konfigurasi, Hapus (`setup.deleteChannel` + confirm), Tambah | Channel · Brand · Pilar/LM · Approval Registration · aksi |
| 3a Eligibility | `setup.saveEligibility`, `setup.addException` | elig_min_sell_out_months, elig_prior_payout_required, excl_program[], elig_ratio_min, elig_ratio_max, elig_ratio_at_registration, monitoring_frequency*, pay_CONDITIONAL*, pay_FIX*; exception: customer_id*, reason* | Simpan, + Exception, hapus (`setup.delException`) | Toko · Alasan · Oleh · aksi |
| 3b Brand | `setup.saveBrands` | brand_codes[], members_<kode>[], est_/ir_/minb_<kode> | Kelas & tier (link), Simpan brand | Ikut · Brand · Sub-brand · EST · IR · Baseline minimal · Kelas · aksi |
| 3c Kelas | `setup.saveClasses` (+ hidden `#clsJson`) | per kelas: `data-c data-f` code/baseline_min/baseline_max/fix; per tier: `data-c data-t data-f` g/cond/total; cek cepat `#qBase` `#qGrowth` | `#addClass`, `data-act` up/down/delC/addT/delT, Simpan | Tier · Target growth · Conditional · Total · aksi (per kelas) |
| 3d Pilar | `setup.savePillars` (+ `#treeJson`) | framework*; `data-p/j/l data-f` name/unit/value_type | `#addPillar`, `data-act` addJ/addL/delP/delJ/delL, Simpan | – |
| 3d-2 Target LM | `setup.saveLmTargets` (+ `#lmtJson`) | `.lmt-in` value/text, `.lmt-op[data-rowop]`, `.lmt-sec-in[data-sec]` | `.lmt-rs` (resize), `#lmtResetW`, `data-act` addSec/secAll/delSec/merge/split, Simpan | `#lmtSheet` Pilar · JTBD · Lead measure · Class × section |
| 3e Rumus | `setup.saveFormulas` | expr_<slot>*, desc_<slot>, ov_slot/ov_brand/ov_expr/ov_desc | `.preset[data-slot]`, `#addOv`, `.del-ov`, `.formula-vars code`, Coba di simulasi, Simpan | Kolom · Rumus · Preset · Deskripsi; `#ovTable` |
| 3f–g Fase | `setup.savePhaseForm` (+ `#fieldsJson`), `setup.saveLayers` (+ `#layersJson`) | `tr[data-i]` + `data-f`; `.layer-card[data-l]` + `data-f`/`data-cf` | `#addCatalog`, `#addCustom`, `#addLayer`, `data-act` up/down/del/addC/delC, 2× Simpan | `.phase-fields` # · Field · Label · Tipe · Mode · Diulang · Tampil · Edit · Wajib · Min · Maks |
| 3h Dokumen | `setup.saveDoc` (+ `#secJson`) | `.sec-card[data-s]` + `data-f` heading/per_brand/body | `#addSec`, `#pvBtn`, `[data-ph]`, `data-act` up/down/del, Simpan revisi | Riwayat revisi: Rev · Dibuat · Oleh · Dokumen dibuat |
| 4 Simulasi | – (tanpa form) | `#sCh` `#sBrand` `#sBase` `#sGrowth` `#sMonths` `#sRatio` `#sActual` `#sMonOk` `.sp[data-i]` | – | hasil di `#sOut` (2 tabel + jalur approval + trace) |
| 5–6 / 8 | `setup.publish` | ack_warn (`#ack`), confirm (`#cf`) | Publish program, Close (`setup.close` + confirm) | `ul.checks` |
| Audit | – | – | – | Waktu · User · Entitas · Aksi · Sebelum · Sesudah |

## 3. Selector dan class yang dipakai JS

Semua wajib tetap ada di elemen yang sama. Class baru boleh ditambahkan.

### `js/ui.js` (bersama semua modul)

| Selector / class | Baris | Dipakai untuk |
|---|---|---|
| `#app` | 119, 131 | root render |
| `[data-hmenu] > .kt-menu__link`, `[data-hover]`, `:scope > .kt-menu__link`, `.kt-menu__item--hover` | 342–356 | buka/tutup menu header & aside |
| `[data-confirm]` | 377 | `confirm()` sebelum klik |
| `[data-click]` | 379 | dispatch `clicks[...]` (`setup.deleteProgram`, `setup.toggleType`, `setup.deleteChannel`, `setup.delException`, `setup.close`, `resetData`, `chooseYear`, `goLobby`, `toggleAside`) |
| `[data-check-all]` → `input[name=…]` | 387–388 | centang semua (tidak dipakai di Setup) |
| `form[data-action]` + `e.submitter` (name/value) | 391–397 | dispatch `actions[...]` |
| `.js-form-error` | 407–409 | error di atas form via `insertAdjacentHTML('beforebegin')` lalu `form.previousElementSibling` |
| `input[type=number]` | 413–419 | wheel blur, select-on-focus |
| `.alert` + `[data-dismiss="alert"]`, `[data-toggle="dropdown"]` | 137–141, 295 | plugin Bootstrap (jQuery) |

### `js/pages/setup.js`

| Selector / class | Baris |
|---|---|
| `#typeForm` (inline `onclick`) | 143, 152 |
| `#classes`, `#flags`, `#qBase`, `#qGrowth`, `#qOut`, `#addClass`, `#clsJson` | 340–431 |
| `[data-c][data-t][data-f]` (query presisi), `[data-act]` | 407, 411, 415 |
| `#tree`, `#wsum`, `#addPillar`, `#treeJson`, `[data-act]` | 506–557 |
| `#lmtJson` → `closest('form')` (listener mousedown/input/change/click/submit) | 659, 753–842 |
| `#lmtSheet`, `col[data-col]`, `#lmtSheet textarea.txt`, `#lmtSheet input/select/button/textarea` | 695–781 |
| `.lmt-rs[data-rs]`, `body.lmt-resizing`, `.lmt-cell` + `.is-empty`, `#lmtResetW` | 754–788 |
| CSS var `--w1`, `--w2` di `#lmtSheet`, `style.width` di tabel & `col` | 696–699 |
| `.fx` + `.fx-out` (sibling dalam parent yang sama) | 937, 943 |
| `.preset[data-slot][data-expr]` → `[name="expr_<slot>"]` | 945 |
| `.formula-vars code` | 946 |
| `#ovTable tbody`, `#ovTpl`, `#addOv`, `.del-ov` → `closest('tr')` | 950–953 |

### `js/pages/setup2.js`

| Selector / class | Baris |
|---|---|
| `#fRows`, `tr[data-i]`, `[data-f]`, `[data-f="expression"]` → `nextElementSibling` (= `.fx-out`) | 59–99 |
| `#addCatalog`, `#addCustom`, `#fieldsJson` | 100–111 |
| `#layers`, `[data-l]`, `[data-c]`, `[data-cf]`, `[data-act]`, `#addLayer`, `#layersJson` | 113–154 |
| `#secs`, `[data-s]`, `input[data-f="heading"]`, `textarea`, `[data-ph]`, `#addSec`, `#pvBtn`, `#pvOut`, `#secJson` | 391–425 |
| `#sCh`, `#sBrand`, `#sPillars`, `#sOut`, `#sBase`…`#sMonOk`, `.sp[data-i]` | 470–523 |
| `closest('.col-xl-4')` (input simulasi memicu `run()`) | 522 |

### Class dengan state visual (dibaca CSS, diset oleh template/JS)

`active` (`flow-steps li`, `.nav-link`), `is-empty`, `is-text`, `lmt-merged`, `lmt-gstart`, `lmt-class`, `lmt-sec`, `lmt-hr1/2`, `fz fz1/fz2/fz3`, `lp` + `cur/ok/auto/bad`, `layer-card`, `class-card`, `sec-card`, `tree-pillar/jtbd/lm`, `lm-head`, `ov`, `sticky-summary`, `fieldset[disabled]`, `text-uppercase` (kode program terlihat kapital), `text-monospace`.

## 4. Struktur DOM yang diandalkan JS

1. **Form adalah leluhur langsung dari hidden JSON dan semua input editor.** `#clsJson`, `#treeJson`, `#lmtJson`, `#fieldsJson`, `#layersJson`, `#secJson` → `closest('form')`. Semua `draw()` menulis ke container di dalam form itu (`#classes`, `#tree`, `#lmtSheet`, `#fRows`, `#layers`, `#secs`).
2. **`<fieldset ${fs(p)}>` membungkus isi form.** Atribut `disabled` di fieldset membuat seluruh program PUBLISHED/CLOSED read-only. Wrapper visual harus tetap di dalam fieldset.
3. **Error form.** `.js-form-error` disisipkan tepat sebelum `<form>`; `form.previousElementSibling` harus elemen itu. Jangan menaruh elemen lain yang dibuat JS di antara keduanya.
4. **Rumus.** `.fx` dan `.fx-out` harus saudara di parent yang sama (`<td>`), dan di field fase `input[data-f="expression"]` harus **langsung** diikuti `.fx-out`.
5. **Baris tabel.** `tr[data-i]` (field fase) membaca `data-i` dari `<tr>`; `del-ov` menghapus `closest('tr')`; template `#ovTpl` berisi satu `<tr class="ov">` yang di-append ke `#ovTable tbody` lalu `bind(tb.lastElementChild)`.
6. **Approval layer.** `[data-l]` di `.layer-card`, `[data-c]` di baris kondisi di dalamnya; tombol `data-act` dicari lewat `closest('[data-l]')` dan `closest('[data-c]')`.
7. **Grid target LM.** `colgroup > col[data-col]` sejajar dengan kolom; `thead` dua baris (`lmt-hr1` rowspan 2 untuk 3 kolom beku); sticky `top` baris kedua = tinggi baris pertama (64px) dan `left` kolom beku memakai `--w1`/`--w2`. Mengubah tinggi `lmt-hr1` atau padding sel tanpa menyesuaikan `top: 64px` akan membuat header kedua tumpang tindih.
8. **Simulasi.** Semua input di dalam elemen `.col-xl-4`; listener `input` di root memanggil `run()` hanya bila `closest('.col-xl-4')`.
9. **Elemen yang digambar ulang (`innerHTML`).** `#classes`, `#flags`, `#qOut`, `#tree`, `#wsum`, `#lmtSheet`, `#fRows`, `#layers` (+ penutup "Fase selesai" di-append), `#secs`, `#pvOut`, `#sBrand`, `#sPillars`, `#sOut`. Markup baru di dalamnya hanya bisa diubah lewat CSS atau di template string di fungsi draw itu sendiri (teks HTML statis saja).
10. **Header menu Metronic** (`ui.js` `layout()`): `[data-hmenu]`, `[data-hover]`, `.kt-menu__link`, `.kt-menu__item--hover`, dropdown Bootstrap di topbar (ganti role, reset data, logout).

## 5. Pemetaan ke pola COMPASS

Nilai komponen diambil dari `compass-ui-kit-design-spec.md` dan anatomi di `_ds_bundle.js` (Button, Input, Tag, Alert, Tab, HeaderCell, BodyCell) serta `Manage Project.dc.html`.

| Elemen prototype | Benchmark COMPASS | Arah reskin |
|---|---|---|
| Halaman (`.kt-container`) | Content area | bg `--color-bg-primary`, teks Lato 14/20 `--color-text-primary` |
| Daftar program | Manage Project list | Satu kartu putih radius 8 + `--shadow-md`, padding 24; judul Plus Jakarta Sans 700 24/32; tombol "Program baru" Primary S di kanan; tabel di dalam kartu |
| Tabel umum (`.table`) | HeaderCell / BodyCell | Header 14/20 bold rata kiri, bg putih, garis bawah `--color-border-default`; body 12/16, padding 12, garis bawah hairline; `.num` rata kanan; hover baris `--color-bg-primary`; tanpa border vertikal & zebra |
| `h.badge` DRAFT / PUBLISHED | Tag Grey / Green | Tag radius 4, 600; Grey = neutral-200/neutral-variant-900; Green = success-100/success-700 (+ dot) |
| `h.badge` CLOSED | – | **Gap 1** |
| Edit/Lihat, Clone (baris) | Button XS Secondary + Link | XS 28px, 12/16 600; Clone sebagai Button link |
| Kartu Clone | Section head (Manage Project) + form grid | Judul 14 bold + catatan 12 tertiary + border-bottom subtle; label 12/600; `*` `--error-500` |
| Page head program | DetailHeader | Kartu: Ghost "← Kembali" ke `#/setup` · divider 1px · judul 22/28 bold + kode (Tag Grey) + Tag status · caption 12 (tahun, tipe, periode, channel, registrasi). Breadcrumb lama tetap ada di DOM sebagai teks kecil (lihat Gap 6) |
| `ol.flow-steps` | Step indicator Manage Project | Lingkaran 28px nomor 12/700; aktif `--primary-500` + label 700 brand; non-aktif bg-primary + border default; garis penghubung 16×2 `--color-border-subtle`; tetap `<a href>`, tanpa state "selesai" |
| `loop-lane` channel | – | **Gap 2** |
| `sub-tabs`, `nav-pills` fase/dokumen | Tab (underline) | Tab S (8×16, 14/20 600) di dalam lane; aktif `--primary-500` + underline 2px; track `--color-border-default` |
| Nomor sub-tab `.n` | Tab badge | **Gap 3** |
| `.card` + `.card-header` + `step-chip` | Kartu + section head + Tag Blue | Kartu radius 8, `--shadow-md`, padding 24; judul kartu 16/24 bold; `step-chip` = Tag Blue (primary-100 / primary-700) |
| Form control (`.form-control`, select, textarea) | Input S | Tinggi 36, radius 4, border `--color-border-default`, padding 0 10, 14/20; focus border `--color-border-focus` + `--focus-ring`; disabled bg neutral-variant-100 |
| `.form-control-sm` (editor padat) | Input S (lebih padat) | **Gap 4** |
| Label / hint | Label / helper | Label 12/16 600 `--color-text-primary`; hint `.form-text` 12/16 `--color-text-tertiary` |
| `input-group-text` (Rp, %) | Input dengan ikon kiri/kanan | **Gap 5** |
| Checkbox | Checkbox | `accent-color: --primary-500`, ukuran 16 |
| Switch "Aktif" (tipe program) | Toggle | **Gap 7** |
| `.btn-brand` | Button Primary | `--color-interactive` / hover / active; S 36, 14/20 600, radius 4 |
| `.btn-outline-brand` | Button Secondary | Putih, border + teks `--color-text-primary` (lihat konflik K3) |
| `.btn-outline-secondary`, `.btn-light` | Button Tertiary (Subtle) | Putih, border default, teks primary |
| `.btn-link`, `.text-danger` link | Button Link / destructive | `--color-interactive`, hover underline; destructive `--error-500` |
| `.btn-outline-danger` | Button Secondary destructive | Border + teks `--error-500` |
| `.btn-success` "Publish program" | – | **Gap 8** |
| `.btn-outline-dark` "Close program" | Button Secondary | border + teks `--color-text-primary` |
| Alert flash / `.js-form-error` / lock PUBLISHED / CLOSED | Alert | bg status-100, border kiri 3px status-500, radius 8, padding 12×14, ikon 20; teks 14/20 `--color-text-secondary`. Mapping: success→success, danger→error, warning→warning, info→info, `alert-dark` (CLOSED)→neutral |
| Validasi `ul.checks .sev` | Tag Red / Yellow | Error = Red, Warning = Yellow |
| Simulasi, validasi, audit | Kartu + tabel + Tag + Alert | sesuai baris di atas |
| `.class-pill` (kode kelas) | Tag Blue | Hanya di dalam scope Program Setup |
| `.lp` jalur approval (`cur/ok/auto/bad`) | Tag Yellow/Green/Red | **Gap 9** untuk `auto` |
| `class-card`, `layer-card`, `sec-card` | Kartu dalam kartu | border `--color-border-subtle`, radius 8, padding 16, tanpa shadow; `layer-card` border kiri 3px `--color-border-brand` |
| Struktur pilar (`tree-pillar/jtbd/lm`) | – | **Gap 10** |
| Grid target LM (`lmt-sheet`) | Tabel padat + freeze (`.mpj-freeze`) | **Gap 11** untuk header kelas bertingkat; sisanya tabel padat COMPASS, kolom beku dengan bayangan kanan `rgba(42,61,74,.18)` seperti `is-scrolled` |
| Editor rumus (`.fx`, `.formula-vars code`) | Input + Tag | Input mono `--font-mono`; `code` di katalog = chip Tag Grey yang bisa diklik (cursor pointer, hover primary-100) |
| Empty row "Belum ada program…" | EmptyState Grey | **Gap 12** |
| Tanda `⚠` (`.warn-mark`) | Ikon outline | **Gap 13** |
| Kontrol `.sticky-summary` | Kartu | Tetap sticky `top: 90px` (tinggi header Metronic) |

### Konflik yang sudah diputuskan (ikut `compass-ui-kit-design-spec.md`)

| # | Konflik | Keputusan |
|---|---|---|
| K1 | Brand `#215AA8` (guardrail lama) vs `#304DDE` | `#304DDE` / hover `#273EB5` / active `#1E308B` |
| K2 | Shadow kartu `--shadow-card` (spec §4) vs `--shadow-md` (effects.css, layar referensi) | `--shadow-md` sesuai prompt |
| K3 | Button Secondary: spec "brand **atau** primary text" vs bundle (teks & border `--color-text-primary`) | Teks & border `--color-text-primary`, sesuai bundle dan layar referensi (spec membolehkan keduanya) |
| K4 | Tag S di bundle 10/14, spec "label-md 12px" | 12/16 600, tinggi 24 (ukuran M di bundle) |
| K5 | Header tabel: HeaderCell 14/20 bold vs prompt "label kecil bold" | **Perlu konfirmasi (Q4)**. Usulan: 14/20 bold seperti HeaderCell dan screenshot `mpj-tabs.png`; body 12/16 |
| K6 | Lato 600 hanya disintesis browser (Google Fonts menyediakan 400/700) | Pakai 400/700 dari Google Fonts, 600 disintesis seperti referensi COMPASS |
| K7 | Kartu: readme "hairline border + shadow sm" vs layar referensi "tanpa border + shadow-md" | Layar referensi (sesuai prompt) |
| K8 | `fig-tokens.css` punya tema gelap `[data-theme="dark"]` | Disertakan apa adanya di `compass-tokens.css` tapi tidak diaktifkan (prototype tidak punya mode gelap) |

## 6. Hal di luar reskin yang ditemukan (tidak diubah)

- `select[name=source_id]` di form Clone berlabel `*` tetapi tanpa `required` (selalu ada nilai, jadi tidak berdampak).
- Field fase: saat pindah fokus dari satu input ke input lain di baris yang sama, `change` memicu `drawFields()` dan input yang baru diklik ikut digambar ulang, sehingga fokus hilang. Perilaku ini ada sebelum reskin; skenario uji memakai blur eksplisit.
- Nomor `step-chip` "3d" dipakai untuk struktur pilar **dan** target lead measure, sementara komentar kode menyebut 3c. Usulan copy dicatat terpisah, tidak diterapkan.
- `form-switch` adalah class Bootstrap 5; di Bootstrap 4 + Metronic ia tampil sebagai checkbox biasa.

## 7. Gap terhadap spec COMPASS

```
⚠️ Tidak ada di spec COMPASS: Tag untuk status CLOSED (Gap 1)
- Dibutuhkan untuk: h.badge('CLOSED') di daftar program, page head, menu
- Padanan terdekat di spec: Tag Grey (dipakai DRAFT) · categorical status-100 (#6D7C8C on #EDEFF1)
- Opsi:
  1. Tag Grey tanpa dot (DRAFT = Grey dengan dot), tetap on-system (disarankan)
  2. Tag categorical status-100 slate: on-system (ramp categorical), tapi warna kategori bukan semantik
```

```
⚠️ Tidak ada di spec COMPASS: lane berulang "Ulangi untuk setiap channel / brand / fase" (Gap 2)
- Dibutuhkan untuk: .loop-lane (channel, brand, pilar, fase) yang menandai bagian yang diulang
- Padanan terdekat di spec: kartu + section head (Manage Project) · Tab · Button Secondary/Primary S
- Opsi:
  1. Kartu putih (radius 8, shadow-md, padding 16 24) dengan section head kecil: ikon ulang + "Ulangi untuk setiap channel" 12/600 tertiary.
     Tombol channel/brand: aktif = Primary S, lainnya = Tertiary S (segmented). Sub-tabs = Tab di bawahnya dengan track abu-abu.
     Lane dalam (brand/pilar/fase) = baris serupa tanpa kartu terpisah. (disarankan, on-system)
  2. Pertahankan garis putus-putus berwarna brand (off-system, perlu persetujuan)
```

```
⚠️ Tidak ada di spec COMPASS: nomor step di depan label tab (Gap 3)
- Dibutuhkan untuk: .sub-tabs .n ("3a", "3b", … "3f–g")
- Padanan terdekat di spec: Tab badge (bulatan 18px, untuk hitungan)
- Opsi:
  1. Nomor sebagai teks 12/700 berwarna tertiary di depan label (aktif = primary-500), tanpa bulatan (disarankan)
  2. Pakai bulatan Tab badge (menyerupai hitungan, bisa membingungkan)
```

```
⚠️ Tidak ada di spec COMPASS: input ukuran lebih kecil dari S (36px) (Gap 4)
- Dibutuhkan untuk: .form-control-sm di editor kelas/tier, rumus, field fase, layer, target LM (tabel padat)
- Padanan terdekat di spec: Input S 36px; Button XS 28px
- Opsi:
  1. Tinggi 32px, font 12/16, padding 0 8 di dalam tabel padat; anatomi lain sama dengan Input S (disarankan, menyesuaikan body tabel 12px)
  2. Pakai Input S 36px di mana-mana (tabel jadi lebih tinggi ±15%)
```

```
⚠️ Tidak ada di spec COMPASS: addon kotak "Rp" / "%" di samping input (Gap 5)
- Dibutuhkan untuk: .input-group-text di brand, kelas, eligibility, simulasi, cek cepat
- Padanan terdekat di spec: Input dengan ikon kiri/kanan di dalam field
- Opsi:
  1. Addon tetap kotak terpisah, bg --color-bg-primary, border default, teks tertiary 14 (disarankan; tidak mengubah markup)
  2. Gabungkan visual addon ke dalam field (border menyatu, tanpa latar) agar menyerupai ikon kiri/kanan
```

```
⚠️ Tidak ada di spec COMPASS: breadcrumb di halaman detail (Gap 6)
- Dibutuhkan untuk: "Program Setup / 2027" di page head; guardrail §7 melarang breadcrumb di halaman detail
- Padanan terdekat di spec: DetailHeader dengan Ghost "← Kembali"
- Opsi:
  1. Tambah tombol Ghost "Kembali" ke #/setup (tujuan sama), breadcrumb lama tetap di DOM sebagai caption kecil di atas judul (disarankan; tidak menghapus link/teks)
  2. Ganti breadcrumb dengan tombol Kembali (menghapus link + teks "Program Setup / 2027" → mengubah copy)
```

```
⚠️ Tidak ada di spec COMPASS: switch Bootstrap pada checkbox "Aktif" (Gap 7)
- Dibutuhkan untuk: form tambah tipe program (#tAct)
- Padanan terdekat di spec: Checkbox, Toggle
- Opsi:
  1. Tampilkan sebagai Checkbox COMPASS (sama dengan perilaku sekarang) (disarankan)
  2. Gaya Toggle lewat CSS (kontrol tetap checkbox, tapi tampil seperti saklar)
```

```
⚠️ Tidak ada di spec COMPASS: tombol hijau (btn-success) (Gap 8)
- Dibutuhkan untuk: "Publish program"
- Padanan terdekat di spec: Button Primary
- Opsi:
  1. Button Primary (brand) (disarankan, on-system)
  2. Pertahankan hijau success-500/600 (off-system untuk Button)
```

```
⚠️ Tidak ada di spec COMPASS: varian Tag bergaris putus untuk "auto-approved" (Gap 9)
- Dibutuhkan untuk: .lp.auto di jalur approval (channel, simulasi)
- Padanan terdekat di spec: Tag Green; ikon petir sudah ada di markup
- Opsi:
  1. .lp = Tag (radius 4, 12/16): cur = Yellow, ok = Green, auto = Green + border 1px dashed --color-border-success, bad = Red, default = Grey (disarankan)
  2. auto = Green tanpa pembeda (beda auto vs manual hilang)
```

```
⚠️ Tidak ada di spec COMPASS: tampilan pohon bertingkat (Gap 10)
- Dibutuhkan untuk: Pilar → JTBD → Lead measure (tree-pillar/jtbd/lm)
- Padanan terdekat di spec: kartu bersarang + border subtle
- Opsi:
  1. Garis kiri 2px: pilar --color-border-brand, JTBD --color-border-default, indentasi 16px (disarankan)
  2. Setiap level sebagai kartu bersarang (lebih berat)
```

```
⚠️ Tidak ada di spec COMPASS: header tabel bertingkat & gaya "sheet" (Gap 11)
- Dibutuhkan untuk: #lmtSheet (Class X + section, kolom beku Pilar/JTBD/Lead measure); sekarang garis hitam 2px dan header biru #0b7cc1
- Padanan terdekat di spec: HeaderCell (putih, bold), freeze kolom .mpj-freeze, bg/brand-subtle
- Opsi:
  1. Header baris 1 (kelas) bg --color-bg-brand-subtle teks --primary-700; baris 2 (section) bg --color-bg-primary; garis 1px --color-border-default;
     kolom beku bg putih + bayangan kanan. Tinggi baris 1 tetap 64px agar sticky tidak bergeser (disarankan)
  2. Semua header putih seperti HeaderCell (pembeda kelas vs section melemah)
```

```
⚠️ Tidak ada di spec COMPASS: EmptyState di dalam baris tabel (Gap 12)
- Dibutuhkan untuk: "Belum ada program…", "Belum ada channel.", "Belum ada exception.", "Belum ada perubahan.", dll.
- Padanan terdekat di spec: EmptyState Grey (ilustrasi + judul + deskripsi di kartu)
- Opsi:
  1. Gaya teks saja: rata tengah, padding 40, 14/20 tertiary, tanpa ilustrasi; teks tetap (disarankan, markup tidak berubah)
  2. Tambah ilustrasi grey lewat CSS ::before (SVG inline di CSS, off-markup)
```

```
⚠️ Tidak ada di spec COMPASS: karakter "⚠" sebagai ikon (Gap 13; COMPASS melarang emoji/glyph unicode)
- Dibutuhkan untuk: .warn-mark "masih dikonfirmasi" (7 tempat)
- Padanan terdekat di spec: ikon outline + warna --color-text-warning
- Opsi:
  1. Biarkan karakternya (copy tetap), hanya warna --color-text-warning (disarankan untuk tahap ini; diff teks nol)
  2. Ganti dengan <i class="bi bi-exclamation-triangle"> (teks "⚠" hilang dari DOM → perubahan copy)
```

## 8. Opsi scope

| | Opsi A (disarankan) | Opsi B |
|---|---|---|
| Yang berubah | Konten semua route `/setup*` | Konten `/setup*` + kerangka aplikasi (aside, header, topbar) |
| Kerangka | Metronic tetap (aside ikon 100px, header menu horizontal, topbar ikon) | Sidebar COMPASS 240/58px, NavigationTop 76px, untuk semua modul |
| Modul lain | Tidak berubah sama sekali | Dapat kerangka COMPASS, konten tetap Metronic (dua bahasa visual dalam satu layar) |
| Cara scope | Template Setup diberi wrapper `<div class="cps">` (div tanpa hook, aman untuk §2.5). Semua aturan skin di bawah `.cps`; flash alert dari `render()` (di luar wrapper) dijangkau dengan `.kt-container:has(> .cps) > .alert`. `h.badge` / `.card` / `.table` modul lain tidak tersentuh | Selain wrapper, `layout()` di `ui.js` harus diubah markup-nya (struktur menu, dropdown user, tombol tahun). Hook `[data-hmenu]`, `[data-hover]`, `data-toggle="dropdown"`, `data-click` harus dipertahankan; risiko regresi di 6 modul |
| File diubah | `index.html` (`<link>`), `css/compass-tokens.css`, `css/compass-skin.css`, template di `setup.js`/`setup2.js` (wrapper + class visual) | Opsi A + `js/ui.js` `layout()` + aturan kerangka di skin |
| Verifikasi tambahan | Screenshot modul lain identik dengan sebelum | Uji menu, dropdown, ganti role, reset data di semua modul |
| Catatan | Font Lato hanya di konten Setup; header Metronic tetap Poppins | Konsisten penuh dengan COMPASS |

Dampak Opsi A yang perlu diketahui: halaman error dari `fail()` (mis. "Channel tidak ditemukan") dirender oleh `errorHtml()` di `ui.js`, di luar wrapper, jadi tetap gaya Metronic.

## 8b. Keputusan yang dibutuhkan sebelum Fase 1

| # | Pertanyaan | Usulan | **Keputusan (23 Okt 2026)** |
|---|---|---|---|
| Q1 | Scope A atau B | A | **Opsi B**: Program Setup + kerangka aplikasi (sidebar, topbar) untuk semua modul |
| Q2 | Gap 1–13: pakai opsi 1 (disarankan) semuanya, atau ada yang berbeda | Opsi 1 semua | **Opsi 1 semua** |
| Q3 | Bentuk `loop-lane` (Gap 2) | Opsi 1: kartu + tombol segmented + Tab | **Gaya COMPASS (opsi 1)** |
| Q4 | Ukuran header tabel (K5) | 14/20 bold (HeaderCell); body 12/16 | **Ikut referensi COMPASS**: header 14/20 bold, body 12/16 |

## 9. Tooling verifikasi

Lokasi: `reference/docs/reskin/tools/` (`package.json` sendiri, `node_modules` di-ignore).

```
cd reference/docs/reskin/tools
npm install && npx playwright install chromium   # sekali
node capture.mjs --label before                  # sudah dijalankan → baseline
node capture.mjs --label after                   # setelah tiap halaman di-reskin
node diff.mjs                                    # → diff-report.md, exit 1 bila ada beda
node inventory.mjs                               # → inventory-fields.md
```

- `capture.mjs` membuka `index.html` lewat `file://`, menghapus `localStorage`, login Admin HO lewat UI, memilih tahun 2027, dan membekukan jam browser (`2026-10-22 09:00 WIB`) sehingga semua tanggal deterministik.
- **Ekstraksi**: 128 route (2026, 2027, dan program DRAFT hasil clone untuk tampilan yang bisa diedit). Per elemen dicatat `id`, `name`, `type`, `value`, `href`, semua `data-*`, `required/readonly/disabled` (termasuk efek `fieldset`), opsi select, class, teks label/tombol/sel, dan **jalur leluhur semantik** (form, fieldset, table, tr, td, label, elemen ber-id/ber-data). Wrapper `div` polos tidak tercatat, jadi menambah wrapper tidak dianggap perubahan. Semua node teks dicatat berurutan (tidak terpengaruh CSS). Juga console error dan overflow horizontal di 1440 dan 1280px.
- **Screenshot**: `screens/before/1440/` dan `/1280/`, satu per route. (`fullPage` Playwright membuat aside Metronic menutupi konten, jadi viewport disetel setinggi halaman.)
- **Skenario inti** (21 langkah): clone + clone dengan kode bentrok; header error (isian tetap) + simpan; tambah tipe; tambah channel; eligibility error + simpan; kelas & tier (`#addClass`, auto-hitung conditional, flag tumpang tindih, cek cepat) + simpan; struktur pilar error + simpan; target LM (isi sel, ganti operator, tambah section, merge) + simpan; resize kolom dengan mouse; rumus (preset, override, klik variabel katalog, hapus override) + simpan; form fase (field custom dihitung, urutan) + approval layer (tambah/hapus layer, kondisi); template MOU (section, placeholder, preview) + simpan; exception toko tambah/hapus; **simulasi 72 kombinasi** channel × brand × growth (semua angka kelas/tier/target/conditional/fix/jalur approval/trace); **validasi** 3 program; hapus DRAFT dan close program lewat `data-confirm`. Setelahnya isi `localStorage` disimpan utuh.
- **Diff** membandingkan elemen dengan LCS: elemen hilang/baru, atribut, state, parent semantik, teks, class lama yang hilang, copy, console error baru, overflow baru; ditambah deep diff skenario dan `localStorage`.
- **Uji alat**: capture kedua tanpa perubahan kode → diff nol (deterministik). Uji mutasi buatan (hapus `data-slot`, hapus class `fx`, tambah teks) → ketiganya tertangkap.
