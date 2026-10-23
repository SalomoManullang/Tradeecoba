# Lampiran inventaris: field, aksi, dan tabel per route

Dibuat otomatis oleh `tools/inventory.mjs` dari DOM program DRAFT hasil clone (id 3, channel pertama, brand pertama). Angka id di `data-*` / `href` diganti `#`.
Kolom **n** = jumlah elemen sejenis (baris yang digambar ulang oleh `draw()` diringkas). Route program PUBLISHED identik, hanya `disabled (fieldset)`.

## 0 · Daftar program & 1A · Clone

Route `#/setup?clone=2` · title "Program Setup · Trade Promo PTI"

**Form**

- `setup.clone` · data-action=setup.clone

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.clone | Program sumber * | select | `name=source_id` | - | - | 3 opsi; terpilih "2027 · Loyalty Program 2027 (LOYALTY-2027) · Published" | 1 |
| setup.clone | Kode baru * | input[text] | `name=code` | required | LOYALTY-2028 | - | 1 |
| setup.clone | Nama baru * | input[text] | `name=name` | required | Loyalty Program 2028 | - | 1 |
| setup.clone | Tahun * | input[number] | `name=year` | required | - | 2027 | 1 |
| setup.clone | Periode mulai * | input[date] | `name=period_start` | required | - | 2027-01-01 | 1 |
| setup.clone | Periode selesai * | input[date] | `name=period_end` | required | - | 2027-12-31 | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program baru | `a href=#/setup/new` | - | - | - | 1 |
| Lihat | `a href=#/setup/#/header` | - | - | - | 1 |
| Clone | `a href=#/setup?clone=2` | - | - | - | 1 |
| Edit | `a href=#/setup/#/header` | - | - | - | 1 |
| Clone | `a href=#/setup?clone=3` | - | - | - | 1 |
| Clone | `button[submit]` | setup.clone | - | - | 1 |

**Tabel**

- `table.table-bordered.table-striped.table-hover.mb-0` · 2 baris · kolom: Kode · Nama · Tipe · Periode · Channel · Registrasi · Status · (kosong)

## 1B · Program baru

Route `#/setup/new` · title "Program baru · Trade Promo PTI"

**Form**

- `setup.header` · data-action=setup.header data-id=
- `setup.addType` · data-action=setup.addType data-back=/setup/new

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.header | Kode program * | input[text] | `name=code` | required | LOYALTY-2027 | - | 1 |
| setup.header | Nama program * | input[text] | `name=name` | required | Loyalty Program 2027 | - | 1 |
| setup.header | Tipe program * | select | `name=program_type_id` | required | - | 2 opsi; terpilih "Loyalty Program" | 1 |
| setup.header | Tahun * | input[number] | `name=year` | required | - | 2027 | 1 |
| setup.header | Periode mulai * | input[date] | `name=period_start` | required | - | 2027-01-01 | 1 |
| setup.header | Periode selesai * | input[date] | `name=period_end` | required | - | 2027-12-31 | 1 |
| setup.header | Deskripsi | textarea | `name=description` | - | - | - | 1 |
| setup.addType | Nama tipe * | input[text] | `name=name` | required | Trading Term | - | 1 |
| setup.addType | Deskripsi | input[text] | `name=description` | - | - | - | 1 |
| setup.addType | Aktif | input[checkbox] | `name=is_active #tAct` | - | - | dicentang | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| + Tambah tipe baru | `a href=javascript:void(0)` | setup.header | - | - | 1 |
| Buat program (DRAFT) & lanjut ke channel | `button[submit]` | setup.header | - | - | 1 |
| Simpan tipe | `button[submit]` | setup.addType | - | - | 1 |
| Nonaktifkan | `a data-click=setup.toggleType data-tid=# data-back=/setup/new` | - | - | - | 2 |

## 1B · Header program

Route `#/setup/:id/header` · title "Header · Trade Promo PTI"

**Form**

- `setup.header` · data-action=setup.header data-id=#
- `setup.addType` · data-action=setup.addType data-back=/setup/3/header

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.header | Kode program * | input[text] | `name=code` | required | LOYALTY-2027 | RESKIN-DRAFT | 1 |
| setup.header | Nama program * | input[text] | `name=name` | required | Loyalty Program 2027 | Reskin Draft | 1 |
| setup.header | Tipe program * | select | `name=program_type_id` | required | - | 2 opsi; terpilih "Loyalty Program" | 1 |
| setup.header | Tahun * | input[number] | `name=year` | required | - | 2027 | 1 |
| setup.header | Periode mulai * | input[date] | `name=period_start` | required | - | 2027-01-01 | 1 |
| setup.header | Periode selesai * | input[date] | `name=period_end` | required | - | 2027-12-31 | 1 |
| setup.header | Deskripsi | textarea | `name=description` | - | - | Clone dari Loyalty Program 2026. Locomm  | 1 |
| setup.addType | Nama tipe * | input[text] | `name=name` | required | Trading Term | - | 1 |
| setup.addType | Deskripsi | input[text] | `name=description` | - | - | - | 1 |
| setup.addType | Aktif | input[checkbox] | `name=is_active #tAct` | - | - | dicentang | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| + Tambah tipe baru | `a href=javascript:void(0)` | setup.header | - | - | 1 |
| Simpan header | `button[submit]` | setup.header | - | - | 1 |
| Hapus DRAFT | `a data-click=setup.deleteProgram data-id=#` | setup.header | ya | - | 1 |
| Simpan tipe | `button[submit]` | setup.addType | - | - | 1 |
| Nonaktifkan | `a data-click=setup.toggleType data-tid=# data-back=/setup/3/header` | - | - | - | 2 |

## 2 · Channel

Route `#/setup/:id/channels` · title "Channel · Trade Promo PTI"

**Form**

- `setup.addChannel` · data-action=setup.addChannel data-id=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.addChannel | - | select | `name=channel_code` | - | - | 1 opsi; terpilih "Local Modern Trade" | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Konfigurasi | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 2 |
| Hapus | `a data-click=setup.deleteChannel data-id=# data-pc=#` | - | ya | - | 2 |
| Tambah | `button[submit]` | setup.addChannel | - | - | 1 |

**Tabel**

- `table.mb-0` · 2 baris · kolom: Channel · Brand · Pilar / LM · Approval Registration · (kosong)

## 3a · Eligibility & jadwal

Route `#/setup/:id/ch/:id/eligibility` · title "Eligibility · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.saveEligibility` · data-action=setup.saveEligibility data-id=# data-pc=#
- `setup.addException` · data-action=setup.addException data-id=# data-pc=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveEligibility | Min. bulan sell out dikirim | input[number] | `name=elig_min_sell_out_months` | - | kosong = tidak dicek | 3 | 1 |
| setup.saveEligibility | Wajib pernah menerima payout | select | `name=elig_prior_payout_required` | - | - | 2 opsi; terpilih "Tidak" | 1 |
| setup.saveEligibility | Loyalty Program 2027 LOYALTY-2027 | input[checkbox] | `name=excl_program` | - | - | tidak | 1 |
| setup.saveEligibility | Rasio sell out : sell in min | input[number] | `name=elig_ratio_min` | - | 96 | 96 | 1 |
| setup.saveEligibility | Rasio sell out : sell in maks | input[number] | `name=elig_ratio_max` | - | 100 | 100 | 1 |
| setup.saveEligibility | Cek juga saat pendaftaran | input[checkbox] | `name=elig_ratio_at_registration` | - | - | tidak | 1 |
| setup.saveEligibility | Frekuensi monitoring * | select | `name=monitoring_frequency` | - | - | 3 opsi; terpilih "Quarterly" | 1 |
| setup.saveEligibility | Payout · Conditional * | select | `name=pay_CONDITIONAL` | - | - | 2 opsi; terpilih "Quarterly" | 1 |
| setup.saveEligibility | Payout · Fix * | select | `name=pay_FIX` | - | - | 2 opsi; terpilih "Semester" | 1 |
| setup.addException | - | select | `name=customer_id` | required | - | 4 opsi; terpilih "Pilih toko tidak eligible (3)" | 1 |
| setup.addException | (placeholder) Alasan exception (wajib), mis. toko baru strategis | input[text] | `name=reason` | required | Alasan exception (wajib), mis. toko baru strategis | - | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| 3b Brand | `a href=#/setup/#/ch/#/brands` | setup.saveEligibility | - | - | 1 |
| Simpan eligibility & jadwal | `button[submit]` | setup.saveEligibility | - | - | 1 |
| Exception | `button[submit]` | setup.addException | - | - | 1 |

**Tabel**

- `table.table-sm.table-bordered.mb-0` · 1 baris · kolom: Toko · Alasan exception · Oleh · (kosong)

## 3b · Brand

Route `#/setup/:id/ch/:id/brands` · title "Brand · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.saveBrands` · data-action=setup.saveBrands data-id=# data-pc=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveBrands | [kolom] Ikut | input[checkbox] | `name=brand_codes` | - | - | dicentang | 6 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_WRD` | - | - | dicentang | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_WRD` | - | - | 59 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_WRD` | - | - | 50 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_WRD` | - | 40,0 jt | - | 1 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_EMN` | - | - | tidak | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_EMN` | - | - | 52 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_EMN` | - | - | 45 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_EMN` | - | 30,0 jt | - | 1 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_KHF` | - | - | tidak | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_KHF` | - | - | 60 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_KHF` | - | - | 55 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_KHF` | - | 50,0 jt | - | 1 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_MO` | - | - | tidak | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_MO` | - | - | 48 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_MO` | - | - | 40 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_MO` | - | 20,0 jt | - | 1 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_OMG` | - | - | tidak | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_OMG` | - | - | 85 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_OMG` | - | - | 80 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_OMG` | - | 100,0 jt | - | 1 |
| setup.saveBrands | Light+ | input[checkbox] | `name=members_LAB` | - | - | tidak | 1 |
| setup.saveBrands | [kolom] EST growth % | input[number] | `name=est_LAB` | - | - | 250 | 1 |
| setup.saveBrands | [kolom] IR growth % | input[number] | `name=ir_LAB` | - | - | 200 | 1 |
| setup.saveBrands | [kolom] Baseline minimal / bln | input[number] | `name=minb_LAB` | - | 10,0 jt | - | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| Kelas & tier | `a href=#/setup/#/ch/#/brands/#` | setup.saveBrands | - | - | 6 |
| Simpan brand | `button[submit]` | setup.saveBrands | - | - | 1 |

**Tabel**

- `table.table-sm.table-bordered` · 6 baris · kolom: Ikut · Brand (skema) · Sub-brand yang memakai skema ini · EST growth % · IR growth % · Baseline minimal / bln · Kelas · (kosong)

## 3c · Kelas & tier per brand

Route `#/setup/:id/ch/:id/brands/:id` · title "Kelas Wardah · Trade Promo PTI"

**Form**

- `setup.saveClasses` · data-action=setup.saveClasses data-id=# data-pc=# data-b=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveClasses | - | input[hidden] | `name=classes #clsJson` | - | - | - | 1 |
| setup.saveClasses | Kelas | input[text] | `data-c=# data-f=code` | - | - | A | 5 |
| setup.saveClasses | Baseline min / bln (Rp) | input[number] | `data-c=# data-f=baseline_min` | - | - | 40000000 | 5 |
| setup.saveClasses | Baseline maks / bln (Rp) | input[number] | `data-c=# data-f=baseline_max` | - | tak terbatas | 150000000 | 5 |
| setup.saveClasses | Fix rebate maks | input[number] | `data-c=# data-f=fix` | - | - | 1 | 5 |
| setup.saveClasses | [kolom] Target growth % | input[number] | `data-c=# data-t=# data-f=g` | - | - | 70 | 15 |
| setup.saveClasses | [kolom] Conditional rebate % | input[number] | `data-c=# data-t=# data-f=cond` | - | - | 1 | 15 |
| setup.saveClasses | [kolom] Total rebate % | input[number] | `data-c=# data-t=# data-f=total` | - | - | 2 | 15 |
| (tanpa form) | Baseline / bulan | input[number] | `#qBase` | - | - | 200000000 | 1 |
| (tanpa form) | Baseline / bulan | input[number] | `#qGrowth` | - | - | 76 | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| Wardah 5 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| Emina 4 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| Kahf 3 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| MakeOver 4 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| OMG 4 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| Labore 3 | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| Kelas | `button[button] #addClass` | setup.saveClasses | - | - | 1 |
| (ikon) | `button[button] data-act=up data-c=#` | setup.saveClasses | - | ya | 5 |
| (ikon) | `button[button] data-act=down data-c=#` | setup.saveClasses | - | - | 5 |
| (ikon) | `button[button] data-act=delC data-c=#` | setup.saveClasses | - | - | 5 |
| (ikon) | `button[button] data-act=delT data-c=# data-t=#` | setup.saveClasses | - | - | 15 |
| + tier | `button[button] data-act=addT data-c=#` | setup.saveClasses | - | - | 5 |
| Simpan kelas Wardah | `button[submit]` | setup.saveClasses | - | - | 1 |

**Tabel**

- `table.table-sm.table-bordered.mb-1` · 3 baris · kolom: Tier · Target growth % · Conditional rebate % · Total rebate % · (kosong)
- `table.table-sm.table-bordered.mb-1` · 3 baris · kolom: Tier · Target growth % · Conditional rebate % · Total rebate % · (kosong)
- `table.table-sm.table-bordered.mb-1` · 3 baris · kolom: Tier · Target growth % · Conditional rebate % · Total rebate % · (kosong)
- `table.table-sm.table-bordered.mb-1` · 3 baris · kolom: Tier · Target growth % · Conditional rebate % · Total rebate % · (kosong)
- `table.table-sm.table-bordered.mb-1` · 3 baris · kolom: Tier · Target growth % · Conditional rebate % · Total rebate % · (kosong)

## 3d · Struktur pilar

Route `#/setup/:id/ch/:id/pillars` · title "Pilar · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.savePillars` · data-action=setup.savePillars data-id=# data-pc=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.savePillars | - | input[hidden] | `name=tree #treeJson` | - | - | - | 1 |
| setup.savePillars | Nama framework * | input[text] | `name=framework` | required | Vision Compass | Vision Compass | 1 |
| setup.savePillars | (placeholder) Nama pilar | input[text] | `data-p=# data-f=name` | - | Nama pilar | Being Relevant With Trend | 3 |
| setup.savePillars | (placeholder) Job to be done | input[text] | `data-p=# data-j=# data-f=name` | - | Job to be done | Driving High-Impact Livestream Commerce | 5 |
| setup.savePillars | (placeholder) Lead measure * | input[text] | `data-p=# data-j=# data-l=# data-f=name` | - | Lead measure * | Live Stream Duration Dedicated | 11 |
| setup.savePillars | (placeholder) satuan, mis. jam / etalase | input[text] | `data-p=# data-j=# data-l=# data-f=unit` | - | satuan, mis. jam / etalase | jam | 8 |
| setup.savePillars | - | select | `data-p=# data-j=# data-l=# data-f=value_type` | - | - | 3 opsi; terpilih "Angka" | 11 |
| setup.savePillars | (placeholder) (target berupa teks) | input[text] | `.form-control.bg-light` | disabled | (target berupa teks) | - | 3 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| 1. Struktur pilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| Wardah 5/5 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Emina 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Kahf 3/3 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| MakeOver 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| OMG 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Labore 3/3 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Pilar | `button[button] #addPillar` | setup.savePillars | - | - | 1 |
| + JTBD | `button[button] data-act=addJ data-p=#` | setup.savePillars | - | - | 3 |
| (ikon) | `button[button] data-act=delP data-p=#` | setup.savePillars | - | - | 3 |
| + Lead measure | `button[button] data-act=addL data-p=# data-j=#` | setup.savePillars | - | - | 5 |
| (ikon) | `button[button] data-act=delJ data-p=# data-j=#` | setup.savePillars | - | - | 5 |
| (ikon) | `button[button] data-act=delL data-p=# data-j=# data-l=#` | setup.savePillars | - | - | 11 |
| Simpan pillar framework | `button[submit]` | setup.savePillars | - | - | 1 |

## 3d-2 · Target lead measure per kelas

Route `#/setup/:id/ch/:id/pillars/:id` · title "Target pilar Wardah · Trade Promo PTI"

**Form**

- `setup.saveLmTargets` · data-action=setup.saveLmTargets data-id=# data-pc=# data-b=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveLmTargets | - | input[hidden] | `name=targets #lmtJson` | - | - | - | 1 |
| setup.saveLmTargets | (placeholder) nama section | input[text] | `data-sec=# data-c=A` | - | nama section | Face Care | 2 |
| setup.saveLmTargets | (placeholder) nama section | input[text] | `data-sec=# data-c=B` | - | nama section | Face Care | 2 |
| setup.saveLmTargets | (placeholder) nama section | input[text] | `data-sec=# data-c=C` | - | nama section | Face Care | 2 |
| setup.saveLmTargets | (placeholder) nama section | input[text] | `data-sec=# data-c=D` | - | nama section | Face Care | 2 |
| setup.saveLmTargets | (placeholder) nama section | input[text] | `data-sec=# data-c=E` | - | nama section | Face Care | 2 |
| setup.saveLmTargets | Operator untuk semua kelas | select | `data-rowop=#` | - | - | 4 opsi; terpilih "Minimal" | 9 |
| setup.saveLmTargets | (placeholder) – | input[number] | `data-c=A data-l=# data-i=# data-f=value` | - | – | 1 | 11 |
| setup.saveLmTargets | (placeholder) – | input[number] | `data-c=B data-l=# data-i=# data-f=value` | - | – | 1 | 11 |
| setup.saveLmTargets | (placeholder) – | input[number] | `data-c=C data-l=# data-i=# data-f=value` | - | – | 1.5 | 11 |
| setup.saveLmTargets | (placeholder) – | input[number] | `data-c=D data-l=# data-i=# data-f=value` | - | – | 2 | 11 |
| setup.saveLmTargets | (placeholder) – | input[number] | `data-c=E data-l=# data-i=# data-f=value` | - | – | 2 | 11 |
| setup.saveLmTargets | (placeholder) teks target | textarea | `data-c=A data-l=# data-i=# data-f=text` | - | teks target | Ikut campaign tren setiap bulan | 2 |
| setup.saveLmTargets | (placeholder) teks target | textarea | `data-c=B data-l=# data-i=# data-f=text` | - | teks target | Ikut campaign tren setiap bulan | 2 |
| setup.saveLmTargets | (placeholder) teks target | textarea | `data-c=C data-l=# data-i=# data-f=text` | - | teks target | Ikut campaign tren setiap bulan | 2 |
| setup.saveLmTargets | (placeholder) teks target | textarea | `data-c=D data-l=# data-i=# data-f=text` | - | teks target | Ikut campaign tren setiap bulan | 2 |
| setup.saveLmTargets | (placeholder) teks target | textarea | `data-c=E data-l=# data-i=# data-f=text` | - | teks target | Ikut campaign tren setiap bulan | 2 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| 1. Struktur pilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| Wardah 5/5 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Emina 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Kahf 3/3 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| MakeOver 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| OMG 4/4 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Labore 3/3 | `a href=#/setup/#/ch/#/pillars/#` | - | - | - | 1 |
| Reset lebar kolom | `button[button] #lmtResetW` | setup.saveLmTargets | - | - | 1 |
| Section | `button[button] data-act=addSec data-c=A` | setup.saveLmTargets | - | - | 1 |
| ke semua kelas | `button[button] data-act=secAll data-c=A` | setup.saveLmTargets | - | - | 1 |
| Section | `button[button] data-act=addSec data-c=B` | setup.saveLmTargets | - | - | 1 |
| ke semua kelas | `button[button] data-act=secAll data-c=B` | setup.saveLmTargets | - | - | 1 |
| Section | `button[button] data-act=addSec data-c=C` | setup.saveLmTargets | - | - | 1 |
| ke semua kelas | `button[button] data-act=secAll data-c=C` | setup.saveLmTargets | - | - | 1 |
| Section | `button[button] data-act=addSec data-c=D` | setup.saveLmTargets | - | - | 1 |
| ke semua kelas | `button[button] data-act=secAll data-c=D` | setup.saveLmTargets | - | - | 1 |
| Section | `button[button] data-act=addSec data-c=E` | setup.saveLmTargets | - | - | 1 |
| ke semua kelas | `button[button] data-act=secAll data-c=E` | setup.saveLmTargets | - | - | 1 |
| Hapus section | `button[button] data-act=delSec data-c=A data-i=#` | setup.saveLmTargets | - | - | 2 |
| Hapus section | `button[button] data-act=delSec data-c=B data-i=#` | setup.saveLmTargets | - | - | 2 |
| Hapus section | `button[button] data-act=delSec data-c=C data-i=#` | setup.saveLmTargets | - | - | 2 |
| Hapus section | `button[button] data-act=delSec data-c=D data-i=#` | setup.saveLmTargets | - | - | 2 |
| Hapus section | `button[button] data-act=delSec data-c=E data-i=#` | setup.saveLmTargets | - | - | 2 |
| Gabung semua section jadi satu target | `button[button] data-act=merge data-c=A data-l=# data-i=#` | setup.saveLmTargets | - | - | 2 |
| Gabung semua section jadi satu target | `button[button] data-act=merge data-c=B data-l=# data-i=#` | setup.saveLmTargets | - | - | 2 |
| Gabung semua section jadi satu target | `button[button] data-act=merge data-c=C data-l=# data-i=#` | setup.saveLmTargets | - | - | 2 |
| Gabung semua section jadi satu target | `button[button] data-act=merge data-c=D data-l=# data-i=#` | setup.saveLmTargets | - | - | 2 |
| Gabung semua section jadi satu target | `button[button] data-act=merge data-c=E data-l=# data-i=#` | setup.saveLmTargets | - | - | 2 |
| Pisahkan per section | `button[button] data-act=split data-c=A data-l=# data-i=#` | setup.saveLmTargets | - | - | 9 |
| Pisahkan per section | `button[button] data-act=split data-c=B data-l=# data-i=#` | setup.saveLmTargets | - | - | 9 |
| Pisahkan per section | `button[button] data-act=split data-c=C data-l=# data-i=#` | setup.saveLmTargets | - | - | 9 |
| Pisahkan per section | `button[button] data-act=split data-c=D data-l=# data-i=#` | setup.saveLmTargets | - | - | 9 |
| Pisahkan per section | `button[button] data-act=split data-c=E data-l=# data-i=#` | setup.saveLmTargets | - | - | 9 |
| Simpan target Wardah | `button[submit]` | setup.saveLmTargets | - | - | 1 |

**Tabel**

- `lmtSheet` · 11 baris · kolom: Pilar · JTBD · Lead measure · Class A40,0 jt – 150,0 jt Section ke semua kelas · Class B150,0 jt – 400,0 jt Section ke semua kelas · Class C400,0 jt – 750,0 jt Section ke semua kelas · Class D750,0 jt – 3,00 M Section ke semua kelas · Class E3,00 M – ∞ Section ke semua kelas · (kosong) · (kosong) · (kosong) · (kosong) · (kosong) · (kosong) · (kosong) · (kosong) · (kosong) · (kosong)

## 3e · Rumus

Route `#/setup/:id/ch/:id/formulas` · title "Rumus · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.saveFormulas` · data-action=setup.saveFormulas data-id=# data-pc=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_target` | required | - | baseline * (1 + growth) | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_target` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_achievement` | required | - | (period_actual / period_baseline) - 1 | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_achievement` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_rebate_base_conditional` | required | - | period_net_sell_in | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_rebate_base_conditional` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_rebate_base_fix` | required | - | period_net_sell_in | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_rebate_base_fix` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_pillar_score` | required | - | monitoring_approved | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_pillar_score` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_conditional_rebate` | required | - | reached_tier_conditional_pct * rebate_ba | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_conditional_rebate` | - | - | - | 1 |
| setup.saveFormulas | [kolom] Rumus | input[text] | `name=expr_fix_rebate` | required | - | fix_max_pct * pillar_score * rebate_base | 1 |
| setup.saveFormulas | [kolom] Deskripsi (untuk Finance) | input[text] | `name=desc_fix_rebate` | - | - | - | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| Coba di simulasi | `a href=#/setup/#/simulate?ch=4` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=target data-expr=baseline * (1 + growth)` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=achievement data-expr=(period_actual / period_baseline) - 1` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=rebate_base_conditional data-expr=period_net_sell_in` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=rebate_base_fix data-expr=period_net_sell_in` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=pillar_score data-expr=monitoring_approved` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=conditional_rebate data-expr=reached_tier_conditional_pct * rebate_base_conditional` | setup.saveFormulas | - | - | 1 |
| Perilaku 2026 | `button[button] data-slot=fix_rebate data-expr=fix_max_pct * pillar_score * rebate_base_fix` | setup.saveFormulas | - | - | 1 |
| + override brand | `button[button] #addOv` | setup.saveFormulas | - | - | 1 |
| Simpan rumus | `button[submit]` | setup.saveFormulas | - | - | 1 |

**Tabel**

- `table.table-sm.table-bordered` · 7 baris · kolom: Kolom · Rumus · Preset · Deskripsi (untuk Finance)
- `ovTable` · 0 baris · kolom: Kolom · Brand · Rumus · Deskripsi · (kosong)

## 3f–g · Fase: form & approval (Registration)

Route `#/setup/:id/ch/:id/phases/REGISTRATION` · title "Registration · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.savePhaseForm` · data-action=setup.savePhaseForm data-id=# data-pc=# data-phase=REGISTRATION
- `setup.saveLayers` · data-action=setup.saveLayers data-id=# data-pc=# data-phase=REGISTRATION

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.savePhaseForm | - | input[hidden] | `name=fields #fieldsJson` | - | - | - | 1 |
| setup.savePhaseForm | [kolom] Field | select | `data-f=field_key` | - | - | 8 opsi; terpilih "baseline" | 6 |
| setup.savePhaseForm | [kolom] Label | input[text] | `data-f=label` | - | - | Baseline / bulan | 7 |
| setup.savePhaseForm | [kolom] Tampil | input[checkbox] | `data-f=is_visible` | - | - | dicentang | 7 |
| setup.savePhaseForm | [kolom] Edit | input[checkbox] | `data-f=is_editable` | - | - | dicentang | 7 |
| setup.savePhaseForm | [kolom] Wajib | input[checkbox] | `data-f=is_required` | - | - | dicentang | 7 |
| setup.savePhaseForm | [kolom] Min | input[number] | `data-f=min_value` | - | - | - | 7 |
| setup.savePhaseForm | [kolom] Maks | input[number] | `data-f=max_value` | - | - | - | 7 |
| setup.savePhaseForm | [kolom] Field | input[text] | `data-f=field_key` | - | nama_field | store_pic_phone | 1 |
| setup.savePhaseForm | [kolom] Tipe | select | `data-f=data_type` | - | - | 7 opsi; terpilih "Teks" | 1 |
| setup.savePhaseForm | [kolom] Mode | select | `data-f=mode` | - | - | 2 opsi; terpilih "Diisi user" | 1 |
| setup.savePhaseForm | [kolom] Diulang | select | `data-f=repeat_per` | - | - | 3 opsi; terpilih "Tidak diulang" | 1 |
| setup.saveLayers | - | input[hidden] | `name=layers #layersJson` | - | - | - | 1 |
| setup.saveLayers | Final approval | select | `data-f=role_code` | - | - | 5 opsi; terpilih "Admin DC" | 3 |
| setup.saveLayers | Final approval | input[checkbox] | `data-f=is_final` | - | - | tidak | 3 |
| setup.saveLayers | - | select | `data-cf=object_code` | - | - | 4 opsi; terpilih "Growth per brand (%)" | 1 |
| setup.saveLayers | - | select | `data-cf=operator` | - | - | 6 opsi; terpilih "≥" | 1 |
| setup.saveLayers | (placeholder) 70 | input[number] | `data-cf=value` | - | 70 | 70 | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| Registration | `a href=#/setup/#/ch/#/phases/REGISTRATION` | - | - | - | 1 |
| Monitoring | `a href=#/setup/#/ch/#/phases/MONITORING` | - | - | - | 1 |
| Payout | `a href=#/setup/#/ch/#/phases/PAYOUT` | - | - | - | 1 |
| Field katalog | `button[button] #addCatalog` | setup.savePhaseForm | - | - | 1 |
| Field custom | `button[button] #addCustom` | setup.savePhaseForm | - | - | 1 |
| (ikon) | `button[button] data-act=up` | setup.savePhaseForm | - | ya | 10 |
| (ikon) | `button[button] data-act=down` | setup.savePhaseForm | - | - | 10 |
| (ikon) | `button[button] data-act=del` | setup.savePhaseForm | - | - | 10 |
| Simpan form Registration | `button[submit]` | setup.savePhaseForm | - | - | 1 |
| Layer | `button[button] #addLayer` | setup.saveLayers | - | - | 1 |
| + kondisi auto-approve | `button[button] data-act=addC` | setup.saveLayers | - | - | 3 |
| (ikon) | `button[button] data-act=delC` | setup.saveLayers | - | - | 1 |
| Simpan approval Registration | `button[submit]` | setup.saveLayers | - | - | 1 |

**Tabel**

- `table.table-sm.table-bordered.phase-fields` · 7 baris · kolom: # · Field · Label · Tipe · Mode · Diulang · Tampil · Edit · Wajib · Min · Maks · (kosong)

## 3h / 7 · Template dokumen (MOU)

Route `#/setup/:id/ch/:id/documents/MOU` · title "MOU · Local E-Commerce (Locomm) · Trade Promo PTI"

**Form**

- `setup.saveDoc` · data-action=setup.saveDoc data-id=# data-pc=# data-doc=MOU

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.saveDoc | - | input[hidden] | `name=sections #secJson` | - | - | - | 1 |
| setup.saveDoc | per brand | input[text] | `data-f=heading` | - | Judul section | Memorandum of Understanding — {{program. | 4 |
| setup.saveDoc | per brand | input[checkbox] | `data-f=per_brand` | - | - | tidak | 4 |
| setup.saveDoc | (placeholder) Isi section dengan {{placeholder}} | textarea | `data-f=body` | - | Isi section dengan {{placeholder}} | Antara PT Paragon Technology and Innovat | 4 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Local E-Commerce (Locomm) | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| Cosmetic Store | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| 3aEligibility & jadwal | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 3bBrand | `a href=#/setup/#/ch/#/brands` | - | - | - | 1 |
| 3cKelas & tier | `a href=#/setup/#/ch/#/brands/#` | - | - | - | 1 |
| 3dPilar | `a href=#/setup/#/ch/#/pillars` | - | - | - | 1 |
| 3eRumus | `a href=#/setup/#/ch/#/formulas` | - | - | - | 1 |
| 3f–gFase: form & approval | `a href=#/setup/#/ch/#/phases` | - | - | - | 1 |
| 3hDokumen | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| MOU | `a href=#/setup/#/ch/#/documents/MOU` | - | - | - | 1 |
| SKN | `a href=#/setup/#/ch/#/documents/SKN` | - | - | - | 1 |
| Section | `button[button] #addSec` | setup.saveDoc | - | - | 1 |
| (ikon) | `button[button] data-act=up` | setup.saveDoc | - | ya | 4 |
| (ikon) | `button[button] data-act=down` | setup.saveDoc | - | - | 4 |
| (ikon) | `button[button] data-act=del` | setup.saveDoc | - | - | 4 |
| Simpan sebagai revisi baru | `button[submit]` | setup.saveDoc | - | - | 1 |
| Preview | `button[button] #pvBtn` | setup.saveDoc | - | - | 1 |

**Tabel**

- `table.table-sm.mb-0` · 1 baris · kolom: Rev · Dibuat · Oleh · Dokumen dibuat

## 4 · Simulasi

Route `#/setup/:id/simulate` · title "Simulasi · Trade Promo PTI"

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| (tanpa form) | Channel * | select | `#sCh` | - | - | 2 opsi; terpilih "Local E-Commerce (Locomm)" | 1 |
| (tanpa form) | Brand * | select | `#sBrand` | - | - | 6 opsi; terpilih "Wardah" | 1 |
| (tanpa form) | Baseline / bulan * | input[number] | `#sBase` | - | - | 200000000 | 1 |
| (tanpa form) | Growth komitmen * | input[number] | `#sGrowth` | - | - | 76 | 1 |
| (tanpa form) | Bulan periode | input[number] | `#sMonths` | - | - | 3 | 1 |
| (tanpa form) | Sell out : sell in | input[number] | `#sRatio` | - | - | 98 | 1 |
| (tanpa form) | Aktual sell in periode (opsional) | input[number] | `#sActual` | - | kosong = baseline × bulan × (1 + growth) | - | 1 |
| (tanpa form) | Monitoring disetujui di termin ini | input[number] | `#sMonOk` | - | - | 100 | 1 |
| (tanpa form) | Kelengkapan evidence per pilar (untuk auto-approve Monitoring) | input[number] | `data-i=#` | - | - | 100 | 3 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |

**Tabel**

- `table.table-sm.mb-0` · 7 baris · kolom: (tanpa thead)
- `table.table-sm.mb-0` · 7 baris · kolom: (tanpa thead)

## 5–6 · Validasi & publish (DRAFT)

Route `#/setup/:id/validate` · title "Validasi & publish · Trade Promo PTI"

**Form**

- `setup.publish` · data-action=setup.publish data-id=#

**Field**

| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |
|---|---|---|---|---|---|---|---|
| setup.publish | Publish mengunci semuanya kecuali template MOU/SKN. Registration, Monitoring & Payout mulai membaca konfigurasi ini. | input[checkbox] | `name=confirm #cf` | required | - | tidak | 1 |

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Publish program | `button[submit]` | setup.publish | - | - | 1 |

## 8 · Close (PUBLISHED)

Route `#/setup/:id/validate` · title "Validasi & publish · Trade Promo PTI"

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi | `a href=#/setup/#/validate` | - | - | - | 1 |
| 7Edit MOU / SKN | `a href=#/setup/#/ch/#/documents` | - | - | - | 1 |
| 8Close | `a href=#/setup/#/validate?focus=close` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |
| Close program | `button[submit] data-click=setup.close data-id=#` | - | ya | - | 1 |

## Audit log

Route `#/setup/:id/audit` · title "Audit log · Trade Promo PTI"

**Tombol & link**

| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |
|---|---|---|---|---|---|
| Program Setup | `a href=#/setup` | - | - | - | 1 |
| 1Header | `a href=#/setup/#/header` | - | - | - | 1 |
| 2Channel | `a href=#/setup/#/channels` | - | - | - | 1 |
| 3Konfigurasi channel | `a href=#/setup/#/ch/#/eligibility` | - | - | - | 1 |
| 4Simulasi | `a href=#/setup/#/simulate` | - | - | - | 1 |
| 5–6Validasi & publish | `a href=#/setup/#/validate` | - | - | - | 1 |
| Audit log | `a href=#/setup/#/audit` | - | - | - | 1 |

**Tabel**

- `table.table-sm.mb-0` · 1 baris · kolom: Waktu · User · Entitas · Aksi · Sebelum · Sesudah
