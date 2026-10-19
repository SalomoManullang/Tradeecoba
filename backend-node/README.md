# Tradee 2027 — Prototype Setup Program Dinamis

Prototype **terpisah** dari aplikasi `sales_program` (CodeIgniter). Tujuannya: Admin HO bisa membuat
tahun & program loyalty sendiri lewat website — kelas, baseline, target growth, matriks JTBD,
kolom input CBD, hitungan pencairan, dan alur approval — tanpa angka yang di-hardcode per tahun.

Contoh program yang sudah terisi: **Vision Compass 2027** (channel CS, Locomm, LMT).
Semua data (toko, sell out, matriks JTBD) adalah **dummy**.

## Menjalankan

Butuh Node.js ≥ 18 dan PostgreSQL.

```bash
cp .env.example .env          # isi DATABASE_URL, mis. postgres://postgres:PASSWORD@localhost:5432/tradee_2027
createdb tradee_2027          # atau buat lewat pgAdmin
npm install
npm run db:reset              # buat tabel + isi data dummy (MENGHAPUS isi database tsb)
npm start                     # http://localhost:3027
```

Akun demo (password `tradee2027`), bisa diklik langsung di halaman login:

| Role | Email | Yang bisa dicoba |
|---|---|---|
| Admin HO | admin.ho@tradee.test | tambah tahun, setup/duplikat program, approval HO |
| CBD | cbd.locomm@tradee.test, cbd.cs@tradee.test, cbd.lmt@tradee.test | saran toko eligible & pendaftaran (per channel) |
| RSM | rsm@tradee.test | approval pendaftaran |
| Admin DC | admin.dc@tradee.test | pengajuan pencairan (NPWP, rekening, realisasi JTBD) |
| Finance / AP | finance@tradee.test | cek berkas pencairan |

Test: `npm test` (unit, tanpa DB) dan `npm run test:e2e` (alur lengkap lewat HTTP; server harus jalan
dan database baru saja di-`db:reset`).

## Alur

```
Admin HO: tambah tahun → buat program → per channel: kelas & eligibility → matriks JTBD (form / upload Excel)
          → kolom input → periode & komponen pencairan → alur approval → aktifkan
CBD:      pilih program & channel → saran toko eligible (dari sell out) → isi growth + kolom dinamis → toko langsung terdaftar
Approval: tahapan sesuai setup (default: RSM)            → setujui / kembalikan / tolak
Pencairan: Admin DC isi realisasi JTBD + NPWP/rekening → hitungan otomatis dari komponen → tahapan sesuai setup → Cair
```

## Field / parameter yang bisa di-setup Admin HO

### 1. Umum (per program)
| Field | Keterangan |
|---|---|
| Tahun | ditambahkan dari halaman Lobby (bukan database baru per tahun) |
| Kode, nama, deskripsi | |
| Basis perhitungan | sell out / sell in (dipakai baseline & aktual) |
| Periode baseline + metode | rata-rata per bulan, atau rata-rata bulan aktif saja |
| Periode program | menentukan jumlah bulan target |
| Periode pendaftaran | jendela CBD boleh mendaftarkan toko |
| Pajak NPWP / non-NPWP (%) | |
| Pengaju pencairan | Admin DC atau CBD |
| Status | draft → aktif → ditutup (aktivasi diblok bila checklist wajib belum lengkap) |

### 2. Channel (CS / Locomm / LMT / channel baru), dikerjakan satu per satu
| Field | Keterangan |
|---|---|
| Brand yang dihitung | |
| Kelas: nama, baseline min–maks, growth min–maks, rebate % | kelas dipilih **otomatis** dari baseline (70 jt → kelas A, min growth 45%) |
| Baseline minimal | opsional |
| Rasio sell out : sell in minimal | opsional — kosong = hanya ditampilkan (belum jelas apakah 96% jadi syarat) |
| Minimal bulan aktif | opsional |
| Growth boleh dinaikkan CBD? | atau dikunci di min growth kelas |
| Status selesai | penanda progres per channel |

### 3. Matriks JTBD
Pilar → JTBD → Lead Measure (satuan, tipe input angka / Ya-Tidak / teks), lalu **parameter per kelas per channel**:
target, reward % (× aktual periode), reward nominal. Sel kosong = lead measure tidak berlaku untuk kelas tsb.
Bisa diisi lewat form atau **upload Excel per channel** (template bisa di-download, berisi isi saat ini).

### 4. Kolom input dinamis
Untuk form pendaftaran CBD atau form pencairan: label, key, tipe (teks, angka, rupiah, persen, dropdown,
tanggal, Ya/Tidak), wajib/tidak, berlaku untuk semua channel atau channel tertentu. Nilai disimpan sebagai
JSONB, jadi kolom baru tidak butuh perubahan tabel. Kolom angka bisa dipakai di rumus pencairan.

### 5. Pencairan
- **Periode**: nama, rentang pencapaian, jendela klaim (semester, kuartal, atau bulanan).
- **Komponen** (dijumlah, lalu dipotong pajak), masing-masing bisa khusus channel/periode tertentu:
  - *Rebate growth*: rebate % kelas (atau angka khusus) × aktual/target, dengan tier pencapaian (mis. ≥90% bayar 50%, ≥100% bayar 100%).
  - *Reward JTBD*: jumlah reward lead measure yang tercapai, dengan syarat pencapaian minimal.
  - *Nominal tetap per kelas*.
  - *Rumus bebas*: mis. `achievement >= 110 ? (actual - target) * 0.01 : 0`, atau untuk program promosi
    tahun depan `min(promo_budget * 0.5, actual * 0.02)`. Evaluator rumus aman (bukan `eval`).
- Ada **simulator** di halaman setup untuk mencoba hasil hitungan sebelum program aktif.

### 6. Alur approval
Tahapan untuk pendaftaran dan pencairan: nama tahap, role penanggung jawab, urutan. Tanpa tahapan =
langsung aktif / langsung cair. Approver bisa setuju, kembalikan (revisi, wajib catatan), atau tolak.

### 7. Lain-lain
- **Duplikat program** dari tahun lain (tanggal digeser otomatis) supaya tahun depan tinggal ubah angka.
- Master data: upload sell out bulanan (xlsx/csv), channel & brand baru.

## Pemetaan ke aplikasi lama (`sales_program`)

| Aplikasi lama (hardcode) | Prototype |
|---|---|
| `get_db()` — 1 database per tahun (`db2025`, `db2026`) | tabel `program_year`, satu database |
| `Model_general::set_program()` — daftar program aktif per tahun | `program.status` + tanggal pendaftaran/klaim |
| `Model_general::set_brand()` / `class_program_helper` | `program_channel.brand_codes`, `program_class` |
| `set_jtbd_txt()` — 4 label JTBD tetap | `program_pillar` / `program_jtbd` / `program_lead_measure` / `program_lm_param` |
| kolom `base_w`, `growth_e`, `jtbd_1_k` … di view CDT | `program_field` + `participant.data` (JSONB) |
| `Pencairan::hitung_pajak()` — cabang if per tahun & program | `program_component` + `engine.computeDisbursement()` |
| `set_min_rebate`, `set_kode_budget`, dst. | konfigurasi komponen / `program.settings` |
| `stage_now` / `stage_next` (1, 2, 4, 8, 11, 20 …) | `program_step` + `workflow.act()` |

## Struktur

```
db/schema.sql        skema PostgreSQL
db/seed.js           data dummy + program Vision Compass 2027
src/lib/engine.js    baseline, kelas, eligibility, target, hitungan pencairan
src/lib/formula.js   evaluator rumus aman
src/lib/workflow.js  alur approval generik
src/routes/          setup (HO), registration (CBD), inbox, disbursement, master
views/               EJS + Bootstrap 5
```

## Keterbatasan prototype / perlu dikonfirmasi user
- Matriks JTBD masih **dummy** (file Excel Vision Compass asli belum dimasukkan). Bisa langsung di-upload
  lewat halaman Matriks JTBD memakai template yang disediakan.
- Arti rasio **sell out : sell in 96%** belum pasti, jadi untuk sementara jadi parameter opsional per channel.
- Target dihitung di level total brand per toko (bukan per brand seperti `base_w`/`base_e` di aplikasi lama).
- Belum ada: toko group/multi-outlet, upload berkas bukti (sekarang berupa link), MOU/surat pencapaian PDF,
  email notifikasi, dan login LDAP. Login memakai akun demo dan session in-memory.
- Mode prototype "abaikan jendela tanggal" aktif di program contoh supaya pendaftaran & pencairan bisa dicoba kapan saja.
