# Tradee 2027 — Prototype Front-End (tanpa backend)

Prototype **front-end murni** untuk modul **Program Setup** (PRD v0.4, arsitektur v0.5) beserta alur
Registration, Monitoring, dan Payout yang membaca konfigurasinya. Tidak terhubung ke server maupun database:
semua data dummy dibuat dan disimpan di browser (`localStorage`, kunci `tradee2027-fe-v2`).

## Cara menjalankan

**Double-click `index.html`** (Chrome / Edge / Firefox). Tidak perlu `npm install` atau server.

- Login: klik salah satu akun demo (password `tradee2027`).
- **Ganti role (demo)** di dropdown ikon user (kanan atas).
- **Reset data demo** (dropdown user / footer) mengembalikan data ke kondisi awal.

## Data contoh

- **Loyalty Program 2026** (PUBLISHED): skema Locomm 2026 sebagai program referensi: 6 brand dengan kelas
  per brand (Wardah 5×3, OMG 4×2, Labore 3×2, …) dan Vision Compass 3 pilar → 5 JTBD → 11 lead measure.
- **Loyalty Program 2027** (PUBLISHED): hasil clone 2026 + channel CS. Berisi 9 registrasi Locomm
  (sebagian auto-approved di layer ABL), monitoring Q1/Q2, dan payout Conditional Q1 + Fix S1.

## Alur Program Setup (Admin HO / Superadmin saja)

| Step | Halaman | Isi |
|---|---|---|
| 0 / 1A | Daftar program | Status DRAFT / PUBLISHED / CLOSED, **clone** program apa pun → DRAFT baru |
| 1B | Header | Kode, nama, tipe program (+ tambah tipe), tahun, periode, deskripsi |
| 2 | Channel | LOCOMM / CS / LMT, sekali per program; channel baru otomatis berisi preset |
| 3a–3h | Konfigurasi channel *(diulang per channel)* | Brand & sub-brand · **kelas & tier per brand** · pillar framework · rumus per slot (+ override brand) · **form & approval layer per fase** (Registration / Monitoring / Payout, kondisi auto-approve) · eligibility & jadwal payout · template MOU/SKN |
| 4 | Simulasi | Sandbox tanpa menyimpan: kelas, tier, target, conditional/fix, jalur approval, trace rumus |
| 5–6 | Validasi & publish | Aturan FR11 (error memblokir, warning perlu konfirmasi); publish mengunci semuanya kecuali MOU/SKN |
| 7 | Edit MOU / SKN | Tetap bisa setelah publish; tiap simpan = revisi baru, dokumen lama memakai revisinya |
| 8 | Close | Program read-only sepenuhnya |
| — | Audit log | Siapa, kapan, sebelum → sesudah |

## Alur runtime (membaca konfigurasi)

| Role | Alur |
|---|---|
| CBD / CDT | Registration → saran toko eligible → isi **baseline & growth per brand** → kelas/tier/rebate otomatis. Monitoring → evidence per lead measure |
| Admin DC, ABL, Chadev | Inbox Approval sesuai layer Registration / Monitoring |
| Admin DC | Payout → ajukan **Conditional** atau **Fix** (record & jadwal terpisah) |
| Finance, Head of Finance | Inbox Approval Payout sampai final approval |

## Struktur

```
index.html            buka file ini
css/app.css           tambahan di atas tema Metronic (stepper, lane berulang, editor)
js/formula.js         evaluator rumus aman (whitelist MIN MAX AVG SUM ROUND IF, array per elemen, tanpa eval)
js/catalog.js         katalog developer: slot rumus, variabel, field katalog, role approval, objek auto-approve, placeholder
js/store.js           "database" di browser (tabel program* sesuai arsitektur §4.1)
js/engine.js          programConfig, programCalculation, auto-approve, validasi FR11, clone, audit, dokumen
js/seed.js            data dummy
js/ui.js              router hash, layout, helper, field fase, jalur approval
js/pages/setup.js     Program Setup step 0–3d
js/pages/setup2.js    Program Setup step 3a (eligibility & jadwal), 3f–8 + audit
js/pages/registration.js · monitoring.js · payout.js · inbox.js · auth.js · master.js
_backup_v1/           versi prototype sebelum revisi PRD v0.4
backend-node/         versi lama (Node.js + PostgreSQL), tidak dipakai prototype ini
```

## Catatan (⚠ masih dikonfirmasi di PRD)
- Daftar role approval & objek auto-approve; kondisi AND vs OR; objek per brand harus lolos semua brand.
- Menambah channel ke program yang sudah dipublish (UF9): di prototype dikunci.
- Skor Fix Rebate (Vision Compass): default `monitoring_approved` = periode Monitoring disetujui ÷ periode Monitoring
  di termin payout. Tanpa bobot pilar / lead measure, mengikuti sales_program 2026 (dibayar per termin, dihentikan bila
  toko tidak memenuhi kewajiban). Di 2026 persen Vision Compass diisi CDT per toko (≤ max rebate − conditional);
  di prototype memakai fix maks kelas.
- Definisi rasio sell out : sell in 96–100%: di prototype = total sell out ÷ total sell in tahun sebelumnya.
- Upload file hanya menyimpan nama file. Dokumen MOU/SKN ditampilkan sebagai HTML (belum PDF).
