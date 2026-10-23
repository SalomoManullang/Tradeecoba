# Diff reskin: baseline.json vs after.json

Dibuat: 2026-10-23T06:43:24.371Z

## 1. Hook DOM, copy, console, overflow per route

### 2027:/setup/new

- HILANG  label  (path: form[data-action=setup.header][data-id=] > fieldset) "Tipe program *"
- HILANG  select[name=program_type_id]  (path: form[data-action=setup.header][data-id=] > fieldset)
- HILANG  option  (path: form[data-action=setup.header][data-id=] > fieldset > select[name=program_type_id]) "Loyalty Program"
- HILANG  option  (path: form[data-action=setup.header][data-id=] > fieldset > select[name=program_type_id]) "JBP"
- HILANG  a  (path: form[data-action=setup.header][data-id=] > fieldset) "+ Tambah tipe baru"
- HILANG  div#typeForm  (path: -)
- HILANG  form[data-action=setup.addType][data-back=/setup/new]  (path: div#typeForm)
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new]) "Nama tipe *"
- HILANG  input[name=name]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new]) "Deskripsi"
- HILANG  input[name=description]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new])
- HILANG  input#tAct[name=is_active]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new]) "Aktif"
- HILANG  button  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/new]) "Simpan tipe"
- HILANG  a[data-click=setup.toggleType][data-tid=1][data-back=/setup/new]  (path: div#typeForm) "Nonaktifkan"
- HILANG  a[data-click=setup.toggleType][data-tid=2][data-back=/setup/new]  (path: div#typeForm) "Nonaktifkan"
- BARU    a  (path: -) "Kembali"
- BARU    input[name=program_type_id]  (path: form[data-action=setup.header][data-id=] > fieldset)
- COPY    teks hilang: ["Tipe program","*","Loyalty Program","JBP","+ Tambah tipe baru","Tambah tipe program","Tipe program baru bisa ditambah tanpa development (FR1).","Nama tipe","*","Deskripsi","Aktif","Simpan tipe","Loyalty Program","Nonaktifkan","JBP","Nonaktifkan"] · teks baru: ["Kembali"]

### 2026:/setup/1/header

- HILANG  label  (path: form[data-action=setup.header][data-id=1] > fieldset) "Tipe program *"
- HILANG  select[name=program_type_id]  (path: form[data-action=setup.header][data-id=1] > fieldset)
- HILANG  option  (path: form[data-action=setup.header][data-id=1] > fieldset > select[name=program_type_id]) "Loyalty Program"
- HILANG  option  (path: form[data-action=setup.header][data-id=1] > fieldset > select[name=program_type_id]) "JBP"
- HILANG  a  (path: form[data-action=setup.header][data-id=1] > fieldset) "+ Tambah tipe baru"
- HILANG  div#typeForm  (path: -)
- HILANG  form[data-action=setup.addType][data-back=/setup/1/header]  (path: div#typeForm)
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header]) "Nama tipe *"
- HILANG  input[name=name]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header]) "Deskripsi"
- HILANG  input[name=description]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header])
- HILANG  input#tAct[name=is_active]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header]) "Aktif"
- HILANG  button  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/1/header]) "Simpan tipe"
- HILANG  a[data-click=setup.toggleType][data-tid=1][data-back=/setup/1/header]  (path: div#typeForm) "Nonaktifkan"
- HILANG  a[data-click=setup.toggleType][data-tid=2][data-back=/setup/1/header]  (path: div#typeForm) "Nonaktifkan"
- BARU    a  (path: -) "Kembali"
- BARU    input[name=program_type_id]  (path: form[data-action=setup.header][data-id=1] > fieldset)
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi","Tipe program","*","Loyalty Program","JBP","+ Tambah tipe baru","Tambah tipe program","Tipe program baru bisa ditambah tanpa development (FR1).","Nama tipe","*","Deskripsi","Aktif","Simpan tipe","Loyalty Program","Nonaktifkan","JBP","Nonaktifkan"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/channels

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/simulate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/validate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/validate?focus=close

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/audit

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/eligibility

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/1

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/2

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/3

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/4

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/5

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/brands/6

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/1

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/2

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/3

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/4

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/5

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/pillars/6

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/formulas

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/phases/REGISTRATION

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/phases/MONITORING

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/phases/PAYOUT

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/documents/MOU

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2026:/setup/1/ch/1/documents/SKN

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2026 – 31 Des 2026","1 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2026 – 31 Des 2026","Channel","Registrasi","0","1"]

### 2027:/setup/2/header

- HILANG  label  (path: form[data-action=setup.header][data-id=2] > fieldset) "Tipe program *"
- HILANG  select[name=program_type_id]  (path: form[data-action=setup.header][data-id=2] > fieldset)
- HILANG  option  (path: form[data-action=setup.header][data-id=2] > fieldset > select[name=program_type_id]) "Loyalty Program"
- HILANG  option  (path: form[data-action=setup.header][data-id=2] > fieldset > select[name=program_type_id]) "JBP"
- HILANG  a  (path: form[data-action=setup.header][data-id=2] > fieldset) "+ Tambah tipe baru"
- HILANG  div#typeForm  (path: -)
- HILANG  form[data-action=setup.addType][data-back=/setup/2/header]  (path: div#typeForm)
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header]) "Nama tipe *"
- HILANG  input[name=name]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header]) "Deskripsi"
- HILANG  input[name=description]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header])
- HILANG  input#tAct[name=is_active]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header]) "Aktif"
- HILANG  button  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/2/header]) "Simpan tipe"
- HILANG  a[data-click=setup.toggleType][data-tid=1][data-back=/setup/2/header]  (path: div#typeForm) "Nonaktifkan"
- HILANG  a[data-click=setup.toggleType][data-tid=2][data-back=/setup/2/header]  (path: div#typeForm) "Nonaktifkan"
- BARU    a  (path: -) "Kembali"
- BARU    input[name=program_type_id]  (path: form[data-action=setup.header][data-id=2] > fieldset)
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi","Tipe program","*","Loyalty Program","JBP","+ Tambah tipe baru","Tambah tipe program","Tipe program baru bisa ditambah tanpa development (FR1).","Nama tipe","*","Deskripsi","Aktif","Simpan tipe","Loyalty Program","Nonaktifkan","JBP","Nonaktifkan"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/channels

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/simulate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/validate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/validate?focus=close

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/audit

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/eligibility

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/7

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/8

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/9

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/10

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/11

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/brands/12

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/7

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/8

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/9

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/10

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/11

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/pillars/12

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/formulas

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/phases/REGISTRATION

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/phases/MONITORING

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/phases/PAYOUT

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/documents/MOU

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/2/documents/SKN

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/eligibility

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/13

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/14

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/15

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/16

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/17

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/brands/18

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/13

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/14

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/15

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/16

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/17

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/pillars/18

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/formulas

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/phases/REGISTRATION

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/phases/MONITORING

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/phases/PAYOUT

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/documents/MOU

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/2/ch/3/documents/SKN

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 9 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","9"]

### 2027:/setup/3/header

- HILANG  label  (path: form[data-action=setup.header][data-id=3] > fieldset) "Tipe program *"
- HILANG  select[name=program_type_id]  (path: form[data-action=setup.header][data-id=3] > fieldset)
- HILANG  option  (path: form[data-action=setup.header][data-id=3] > fieldset > select[name=program_type_id]) "Loyalty Program"
- HILANG  option  (path: form[data-action=setup.header][data-id=3] > fieldset > select[name=program_type_id]) "JBP"
- HILANG  a  (path: form[data-action=setup.header][data-id=3] > fieldset) "+ Tambah tipe baru"
- HILANG  div#typeForm  (path: -)
- HILANG  form[data-action=setup.addType][data-back=/setup/3/header]  (path: div#typeForm)
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header]) "Nama tipe *"
- HILANG  input[name=name]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header]) "Deskripsi"
- HILANG  input[name=description]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header])
- HILANG  input#tAct[name=is_active]  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header])
- HILANG  label  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header]) "Aktif"
- HILANG  button  (path: div#typeForm > form[data-action=setup.addType][data-back=/setup/3/header]) "Simpan tipe"
- HILANG  a[data-click=setup.toggleType][data-tid=1][data-back=/setup/3/header]  (path: div#typeForm) "Nonaktifkan"
- HILANG  a[data-click=setup.toggleType][data-tid=2][data-back=/setup/3/header]  (path: div#typeForm) "Nonaktifkan"
- BARU    a  (path: -) "Kembali"
- BARU    input[name=program_type_id]  (path: form[data-action=setup.header][data-id=3] > fieldset)
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi","Tipe program","*","Loyalty Program","JBP","+ Tambah tipe baru","Tambah tipe program","Tipe program baru bisa ditambah tanpa development (FR1).","Nama tipe","*","Deskripsi","Aktif","Simpan tipe","Loyalty Program","Nonaktifkan","JBP","Nonaktifkan"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/channels

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/simulate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/validate

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/validate?focus=close

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/audit

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/eligibility

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/19

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/20

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/21

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/22

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/23

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/brands/24

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/19

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/20

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/21

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/22

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/23

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/pillars/24

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/formulas

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/phases/REGISTRATION

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/phases/MONITORING

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/phases/PAYOUT

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/documents/MOU

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/4/documents/SKN

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/eligibility

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/25

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/26

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/27

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/28

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/29

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/brands/30

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/25

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/26

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/27

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/28

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/29

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/pillars/30

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/formulas

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/phases/REGISTRATION

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/phases/MONITORING

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/phases/PAYOUT

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/documents/MOU

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

### 2027:/setup/3/ch/5/documents/SKN

- BARU    a  (path: -) "Kembali"
- COPY    teks hilang: ["Loyalty Program · 1 Jan 2027 – 31 Des 2027","2 channel · 0 registrasi"] · teks baru: ["Kembali","Periode","1 Jan 2027 – 31 Des 2027","Channel","2","Registrasi","0"]

## 2. Skenario inti

- $.2c_add_type.hash: "#/setup/3/header" → undefined
- $.2c_add_type.flash: "Tipe program \"Tipe Reskin\" ditambahkan." → undefined
- $.2c_add_type.formError: null → undefined
- $.2c_add_type.errors: null → undefined
- $.2c_add_type.skipped: undefined → "form tambah tipe dihapus (permintaan 23 Okt 2026)"

## 3. Data tersimpan (localStorage)

- $.seq.programTypes: 3 → 2
- $.programTypes.2: {"name":"Tipe Reskin","description":null,"is_active":true,"id":3} → undefined
