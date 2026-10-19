# Tradee 2027 — Prototype Front-End (tanpa backend)

Prototype **front-end murni** untuk modul *Setup Program* dinamis. Tidak terhubung ke aplikasi
`sales_program`, server, maupun database: semua data dummy dibuat dan disimpan di browser (`localStorage`).

## Cara menjalankan

**Double-click `index.html`** (Chrome / Edge / Firefox). Tidak perlu `npm install` atau server.

Tampilan memakai tema **Metronic yang sama dengan aplikasi Tradee** (CSS/JS & logo disalin dari
`sales_program-main/assets` ke folder `assets/`). Font Poppins diambil dari Google Fonts seperti aslinya;
tanpa internet aplikasi tetap jalan dengan font cadangan.

- Login: klik salah satu akun demo (password `tradee2027`).
- **Ganti role (demo)** di dropdown ikon user (kanan atas) untuk melihat alur dari sisi Admin HO, CBD, RSM, Admin DC, Finance.
- **Reset data demo** (dropdown user / footer) mengembalikan semua data ke kondisi awal.
- Yang baru dibanding Tradee: menu header **Setup Program** (label BARU) dan form **Tambah tahun** di halaman Choose Year.
- Data tersimpan per browser. Browser lain / mode incognito mulai dari data awal.

## Yang bisa dicoba

| Role | Alur |
|---|---|
| Admin HO | Lobby → tambah tahun; Setup Program → buat / duplikat program, channel & kelas, matriks JTBD (form / upload CSV), kolom input, komponen pencairan + simulator, alur approval, aktivasi |
| CBD | Pendaftaran Toko → saran toko eligible dari sell out → isi growth & kolom dinamis → toko langsung terdaftar |
| RSM | Inbox Approval → setujui / kembalikan / tolak pendaftaran |
| Admin DC | Pencairan → isi realisasi JTBD, NPWP, rekening → hitungan live → ajukan |
| Finance / Admin HO | Inbox Approval → cek berkas → approval HO → Cair |

Program contoh: **Vision Compass 2027** (channel CS, Locomm, LMT), lengkap dengan 15 peserta & 3 pencairan.

## Field / parameter yang bisa di-setup Admin HO

1. **Umum**: tahun (ditambah dari Lobby), kode, nama, basis (sell out / sell in), periode & metode baseline,
   periode program, periode pendaftaran, pajak NPWP / non-NPWP, role pengaju pencairan, status draft/aktif/ditutup.
2. **Per channel**: brand yang dihitung; kelas (nama, range baseline, growth min–maks, rebate %) — kelas dipilih
   otomatis dari baseline (70 jt → kelas A, growth ≥ 45%); baseline minimal; rasio SO:SI minimal (opsional);
   minimal bulan aktif; growth boleh dinaikkan CBD atau dikunci; tandai channel selesai.
3. **Matriks JTBD**: Pilar → JTBD → Lead Measure (satuan, tipe angka / Ya-Tidak / teks) → parameter per kelas
   per channel (target, reward %, reward Rp). Bisa via form atau upload CSV per channel.
4. **Kolom input dinamis** untuk form CBD & form pencairan (teks, angka, rupiah, persen, dropdown, tanggal,
   Ya/Tidak; wajib/opsional; semua channel atau channel tertentu).
5. **Pencairan**: periode (semester/kuartal/bulanan + jendela klaim) dan komponen hitungan:
   rebate growth bertingkat, reward JTBD, nominal per kelas, dan **rumus bebas**
   (mis. `min(promo_budget * 0.5, actual * 0.02)` untuk program promosi).
6. **Alur approval** pendaftaran & pencairan: tahap, role, urutan (tanpa tahap = langsung aktif / cair).
7. **Duplikat program** dari tahun lain, master channel/brand, upload sell out bulanan (CSV).

## Struktur

```
index.html            buka file ini
css/app.css           tambahan kecil di atas tema Metronic
assets/metronic/      tema Metronic (sama dengan Tradee)
assets/paragon/       logo Tradee / Paragon
vendor/icons/         Bootstrap Icons (ikon tambahan)
js/formula.js         evaluator rumus aman (tanpa eval)
js/store.js           "database" di browser (localStorage)
js/engine.js          baseline, kelas, eligibility, target, hitungan pencairan, workflow
js/seed.js            data dummy
js/ui.js              router hash, layout, helper
js/pages/*.js         halaman: auth/dashboard, setup, registration, disbursement+inbox, master
backend-node/         versi sebelumnya (Node.js + PostgreSQL), tidak dipakai prototype ini
```

## Catatan
- Upload matriks & sell out memakai **CSV** (Excel → Save As → CSV). Template bisa di-download dari halamannya.
- Matriks JTBD masih dummy; arti rasio SO:SI 96% belum pasti (dibuat parameter opsional).
- Target dihitung total brand per toko (aplikasi lama per brand). Belum ada toko group, upload berkas, PDF, email.
