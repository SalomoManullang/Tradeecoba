-- =====================================================================
-- Tradee 2027 - Prototype "Setup Program" dinamis
-- Satu database untuk semua tahun (beda dengan aplikasi lama yang
-- memakai 1 database per tahun: db2023, db2024, ...).
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- ---------------------------------------------------------------------
-- MASTER
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
  id            serial PRIMARY KEY,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role          text NOT NULL CHECK (role IN ('ADMIN_HO','CBD','RSM','ADMIN_DC','FINANCE')),
  dc_codes      text[],          -- NULL = semua DC
  channel_codes text[],          -- NULL = semua channel
  is_active     boolean NOT NULL DEFAULT true
);

-- Tahun program ditambahkan Admin HO dari website (pengganti get_db() per tahun)
CREATE TABLE program_year (
  year       int PRIMARY KEY,
  is_active  boolean NOT NULL DEFAULT true,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE channel (
  code      text PRIMARY KEY,
  name      text NOT NULL,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE brand (
  code      text PRIMARY KEY,
  name      text NOT NULL,
  sort      int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE dc (
  code   text PRIMARY KEY,
  name   text NOT NULL,
  region text
);

CREATE TABLE store (
  customer_id       text PRIMARY KEY,
  name              text NOT NULL,
  dc_code           text NOT NULL REFERENCES dc(code),
  channel_code      text NOT NULL REFERENCES channel(code),
  city              text,
  owner_name        text,
  npwp_no           text,
  npwp_name         text,
  bank_name         text,
  bank_account_no   text,
  bank_account_name text
);

-- Data sell in / sell out bulanan (dikirim rutin tiap bulan)
CREATE TABLE sales_monthly (
  customer_id text NOT NULL REFERENCES store(customer_id) ON DELETE CASCADE,
  period      date NOT NULL,                -- selalu tanggal 1
  brand_code  text NOT NULL REFERENCES brand(code),
  sellout     numeric NOT NULL DEFAULT 0,
  sellin      numeric NOT NULL DEFAULT 0,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, period, brand_code)
);
CREATE INDEX sales_monthly_period_idx ON sales_monthly(period);

-- ---------------------------------------------------------------------
-- SETUP PROGRAM (diisi Admin HO)
-- ---------------------------------------------------------------------
CREATE TABLE program (
  id                 serial PRIMARY KEY,
  year               int NOT NULL REFERENCES program_year(year),
  code               text NOT NULL,
  name               text NOT NULL,
  description        text,
  basis              text NOT NULL DEFAULT 'sellout' CHECK (basis IN ('sellout','sellin')),
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed')),
  baseline_start     date NOT NULL,
  baseline_end       date NOT NULL,
  baseline_method    text NOT NULL DEFAULT 'avg_monthly' CHECK (baseline_method IN ('avg_monthly','avg_active_month')),
  program_start      date NOT NULL,
  program_end        date NOT NULL,
  registration_start date,
  registration_end   date,
  tax_rate_npwp      numeric NOT NULL DEFAULT 2,
  tax_rate_non_npwp  numeric NOT NULL DEFAULT 4,
  disbursement_submitter_role text NOT NULL DEFAULT 'ADMIN_DC',
  settings           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- ruang untuk aturan baru tanpa ubah skema
  created_by         int REFERENCES app_user(id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, code)
);

-- Program per channel (CS / LOCOMM / LMT). Admin mengisi satu channel sampai selesai.
CREATE TABLE program_channel (
  id                 serial PRIMARY KEY,
  program_id         int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  channel_code       text NOT NULL REFERENCES channel(code),
  brand_codes        text[] NOT NULL DEFAULT '{}',
  min_baseline       numeric,              -- eligibility: baseline minimal (kosong = ikut kelas terendah)
  min_sellout_ratio  numeric,              -- eligibility: rasio sell out : sell in minimal (%), kosong = hanya ditampilkan
  min_active_months  int,                  -- eligibility: minimal bulan ada transaksi di periode baseline
  growth_editable    boolean NOT NULL DEFAULT true,  -- CBD boleh menaikkan growth di atas minimal kelas
  status             text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','complete')),
  notes              text,
  UNIQUE (program_id, channel_code)
);

-- Kelas ditentukan otomatis dari baseline (range rata-rata per bulan)
CREATE TABLE program_class (
  id                 serial PRIMARY KEY,
  program_channel_id int NOT NULL REFERENCES program_channel(id) ON DELETE CASCADE,
  name               text NOT NULL,
  baseline_min       numeric NOT NULL,
  baseline_max       numeric,              -- NULL = tak terbatas
  min_growth         numeric NOT NULL,     -- %
  max_growth         numeric,              -- %, NULL = bebas
  rebate_pct         numeric NOT NULL DEFAULT 0,
  sort               int NOT NULL DEFAULT 0
);

-- Matriks JTBD: Pilar -> JTBD -> Lead Measure -> parameter per kelas
CREATE TABLE program_pillar (
  id          serial PRIMARY KEY,
  program_id  int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  sort        int NOT NULL DEFAULT 0
);

CREATE TABLE program_jtbd (
  id        serial PRIMARY KEY,
  pillar_id int NOT NULL REFERENCES program_pillar(id) ON DELETE CASCADE,
  name      text NOT NULL,
  sort      int NOT NULL DEFAULT 0
);

CREATE TABLE program_lead_measure (
  id         serial PRIMARY KEY,
  jtbd_id    int NOT NULL REFERENCES program_jtbd(id) ON DELETE CASCADE,
  name       text NOT NULL,
  unit       text,
  input_type text NOT NULL DEFAULT 'number' CHECK (input_type IN ('number','yesno','text')),
  sort       int NOT NULL DEFAULT 0
);

-- Parameter per kelas (kelas sudah melekat ke channel). Tidak ada baris = lead measure tidak berlaku.
CREATE TABLE program_lm_param (
  id               serial PRIMARY KEY,
  lead_measure_id  int NOT NULL REFERENCES program_lead_measure(id) ON DELETE CASCADE,
  program_class_id int NOT NULL REFERENCES program_class(id) ON DELETE CASCADE,
  target_value     text,
  reward_pct       numeric NOT NULL DEFAULT 0,
  reward_nominal   numeric NOT NULL DEFAULT 0,
  UNIQUE (lead_measure_id, program_class_id)
);

-- Kolom input dinamis (form CBD saat pendaftaran / form saat pencairan)
CREATE TABLE program_field (
  id                 serial PRIMARY KEY,
  program_id         int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  program_channel_id int REFERENCES program_channel(id) ON DELETE CASCADE,  -- NULL = semua channel
  stage              text NOT NULL CHECK (stage IN ('registration','disbursement')),
  key                text NOT NULL,
  label              text NOT NULL,
  field_type         text NOT NULL CHECK (field_type IN ('text','textarea','number','currency','percent','select','date','yesno')),
  required           boolean NOT NULL DEFAULT false,
  options            text[],
  help               text,
  sort               int NOT NULL DEFAULT 0,
  UNIQUE (program_id, stage, key, program_channel_id)
);

-- Periode pencairan (mis. Semester 1 / Semester 2 / Kuartal)
CREATE TABLE program_period (
  id            serial PRIMARY KEY,
  program_id    int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  name          text NOT NULL,
  achieve_start date NOT NULL,
  achieve_end   date NOT NULL,
  claim_start   date,
  claim_end     date,
  sort          int NOT NULL DEFAULT 0
);

-- Komponen hitungan pencairan
--   growth_rebate : rebate % kelas x dasar, dengan tier pencapaian
--   jtbd          : reward per lead measure yang tercapai
--   fixed         : nominal tetap per kelas
--   formula       : rumus bebas (untuk aturan baru, mis. promosi)
CREATE TABLE program_component (
  id                 serial PRIMARY KEY,
  program_id         int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  program_channel_id int REFERENCES program_channel(id) ON DELETE CASCADE,  -- NULL = semua channel
  name               text NOT NULL,
  comp_type          text NOT NULL CHECK (comp_type IN ('growth_rebate','jtbd','fixed','formula')),
  config             jsonb NOT NULL DEFAULT '{}'::jsonb,
  period_ids         int[],              -- NULL = semua periode
  is_active          boolean NOT NULL DEFAULT true,
  sort               int NOT NULL DEFAULT 0
);

-- Alur approval yang dibuat Admin HO (pendaftaran & pencairan)
CREATE TABLE program_step (
  id         serial PRIMARY KEY,
  program_id int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  phase      text NOT NULL CHECK (phase IN ('registration','disbursement')),
  name       text NOT NULL,
  role       text NOT NULL CHECK (role IN ('ADMIN_HO','CBD','RSM','ADMIN_DC','FINANCE')),
  sort       int NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- TRANSAKSI
-- ---------------------------------------------------------------------
CREATE TABLE participant (
  id                 serial PRIMARY KEY,
  program_id         int NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  program_channel_id int NOT NULL REFERENCES program_channel(id),
  customer_id        text NOT NULL REFERENCES store(customer_id),
  class_id           int REFERENCES program_class(id),
  class_name         text,
  baseline           numeric NOT NULL,
  sellout_ratio      numeric,
  growth_pct         numeric NOT NULL,
  target_monthly     numeric NOT NULL,
  target_period      numeric NOT NULL,
  data               jsonb NOT NULL DEFAULT '{}'::jsonb,
  status             text NOT NULL CHECK (status IN ('in_review','active','rejected','returned')),
  current_step_id    int REFERENCES program_step(id) ON DELETE SET NULL,
  registered_by      int REFERENCES app_user(id),
  registered_at      timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (program_id, customer_id)
);

CREATE TABLE disbursement (
  id              serial PRIMARY KEY,
  participant_id  int NOT NULL REFERENCES participant(id) ON DELETE CASCADE,
  period_id       int NOT NULL REFERENCES program_period(id) ON DELETE CASCADE,
  target          numeric NOT NULL,
  actual          numeric NOT NULL,
  achievement_pct numeric NOT NULL,
  lm_values       jsonb NOT NULL DEFAULT '{}'::jsonb,
  data            jsonb NOT NULL DEFAULT '{}'::jsonb,
  payee           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- NPWP & rekening
  breakdown       jsonb NOT NULL DEFAULT '[]'::jsonb,
  gross_amount    numeric NOT NULL DEFAULT 0,
  tax_rate        numeric NOT NULL DEFAULT 0,
  tax_amount      numeric NOT NULL DEFAULT 0,
  net_amount      numeric NOT NULL DEFAULT 0,
  status          text NOT NULL CHECK (status IN ('in_review','paid','rejected','returned')),
  current_step_id int REFERENCES program_step(id) ON DELETE SET NULL,
  submitted_by    int REFERENCES app_user(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, period_id)
);

CREATE TABLE workflow_log (
  id         serial PRIMARY KEY,
  entity     text NOT NULL CHECK (entity IN ('participant','disbursement')),
  entity_id  int NOT NULL,
  step_name  text,
  action     text NOT NULL,
  note       text,
  user_id    int REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflow_log_entity_idx ON workflow_log(entity, entity_id);
