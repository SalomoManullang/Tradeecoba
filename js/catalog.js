// Katalog yang dikelola developer (setara src/helpers/ProgramCatalog di arsitektur v0.5).
// Admin HO hanya memilih dari daftar ini; menambah isi daftar = pekerjaan development.
(function () {
  const PHASES = [
    { code: 'REGISTRATION', label: 'Registration', short: 'Pendaftaran' },
    { code: 'MONITORING', label: 'Monitoring', short: 'Monitoring' },
    { code: 'PAYOUT', label: 'Payout', short: 'Pencairan' },
  ];

  // Slot rumus per channel (PRD FR5). Urutan = urutan evaluasi; slot berikutnya boleh memakai hasil slot sebelumnya.
  const FORMULA_SLOTS = [
    { code: 'target', label: 'Target per bulan', produces: 'Rupiah', preset: 'baseline * (1 + growth)' },
    { code: 'achievement', label: 'Pencapaian (growth aktual)', produces: 'Pecahan (0,72 = 72%)', preset: '(period_actual / period_baseline) - 1' },
    { code: 'rebate_base_conditional', label: 'Dasar Conditional Rebate', produces: 'Rupiah', preset: 'period_net_sell_in' },
    { code: 'rebate_base_fix', label: 'Dasar Fix Rebate', produces: 'Rupiah', preset: 'period_net_sell_in' },
    { code: 'pillar_score', label: 'Skor Vision Compass (0–1)', produces: 'Pecahan 0–1', preset: 'monitoring_approved' },
    { code: 'conditional_rebate', label: 'Nominal Conditional Rebate', produces: 'Rupiah', preset: 'reached_tier_conditional_pct * rebate_base_conditional' },
    { code: 'fix_rebate', label: 'Nominal Fix Rebate', produces: 'Rupiah', preset: 'fix_max_pct * pillar_score * rebate_base_fix' },
  ];
  const PRESET_NAME = 'Perilaku 2026';

  // Variabel katalog (data yang memang ada di Tradee). Persen dikirim ke rumus sebagai pecahan.
  const FORMULA_VARIABLES = [
    { code: 'baseline', label: 'Baseline / bulan (diisi CBD/CDT)', sample: 200e6 },
    { code: 'growth', label: 'Growth komitmen (pecahan)', sample: 0.76 },
    { code: 'months', label: 'Jumlah bulan periode', sample: 3 },
    { code: 'monthly_sell_in', label: 'Sell in per bulan periode (array)', sample: [380e6, 350e6, 360e6] },
    { code: 'monthly_sell_out', label: 'Sell out per bulan periode (array)', sample: [370e6, 340e6, 350e6] },
    { code: 'period_actual', label: 'Aktual periode (net sell in)', sample: 1.09e9 },
    { code: 'period_baseline', label: 'Baseline × bulan periode', sample: 600e6 },
    { code: 'period_net_sell_in', label: 'Net sell in periode', sample: 1.09e9 },
    { code: 'period_sell_out', label: 'Sell out periode', sample: 1.06e9 },
    { code: 'fix_max_pct', label: 'Fix rebate maks kelas (pecahan)', sample: 0.01 },
    { code: 'reached_tier_conditional_pct', label: 'Conditional % tier tercapai (pecahan)', sample: 0.0175 },
    { code: 'reached_tier_total_pct', label: 'Total % tier tercapai (pecahan)', sample: 0.0275 },
    { code: 'monitoring_approved', label: 'Periode Monitoring disetujui / periode Monitoring di termin payout (0–1)', sample: 1 },
    { code: 'pillar_compliance', label: 'Kelengkapan evidence per pilar (array 0–1, lead measure sama rata)', sample: [1, 1, 0.5] },
  ];
  // Hasil slot juga bisa dipakai slot sesudahnya
  const SLOT_SAMPLES = { target: 352e6, achievement: 0.82, rebate_base_conditional: 1.09e9, rebate_base_fix: 1.09e9, pillar_score: 1, conditional_rebate: 19e6, fix_rebate: 9e6 };

  const sampleVars = () => Object.assign(Object.fromEntries(FORMULA_VARIABLES.map((v) => [v.code, v.sample])), SLOT_SAMPLES);

  const FIELD_TYPES = { NUMBER: 'Angka', PERCENT: 'Persen', RUPIAH: 'Rupiah', TEXT: 'Teks', OPTION: 'Pilihan', DATE: 'Tanggal', FILE: 'File' };
  const REPEAT = { NONE: 'Tidak diulang', BRAND: 'Per brand', LEAD_MEASURE: 'Per lead measure' };
  const MODES = { ENTERED: 'Diisi user', CALCULATED: 'Dihitung (rumus)' };

  // Field katalog per fase (PRD FR7). system = makna dipahami engine.
  const CATALOG_FIELDS = [
    { key: 'baseline', label: 'Baseline / bulan', dataType: 'RUPIAH', mode: 'ENTERED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'growth', label: 'Growth komitmen', dataType: 'PERCENT', mode: 'ENTERED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'target_class', label: 'Kelas', dataType: 'TEXT', mode: 'CALCULATED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'avg_target', label: 'Target / bulan', dataType: 'RUPIAH', mode: 'CALCULATED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'total_target', label: 'Target program', dataType: 'RUPIAH', mode: 'CALCULATED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'conditional_rebate', label: 'Conditional rebate', dataType: 'PERCENT', mode: 'CALCULATED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'total_rebate', label: 'Total rebate', dataType: 'PERCENT', mode: 'CALCULATED', repeatPer: 'BRAND', phases: ['REGISTRATION'] },
    { key: 'notes', label: 'Catatan', dataType: 'TEXT', mode: 'ENTERED', repeatPer: 'NONE', phases: ['REGISTRATION'] },
    { key: 'evidence_upload', label: 'Upload evidence', dataType: 'FILE', mode: 'ENTERED', repeatPer: 'LEAD_MEASURE', phases: ['MONITORING'] },
    { key: 'monitoring_notes', label: 'Catatan monitoring', dataType: 'TEXT', mode: 'ENTERED', repeatPer: 'NONE', phases: ['MONITORING'] },
    { key: 'payout_amount', label: 'Nominal payout', dataType: 'RUPIAH', mode: 'CALCULATED', repeatPer: 'NONE', phases: ['PAYOUT'] },
    { key: 'payout_schedule', label: 'Jadwal payout', dataType: 'OPTION', options: ['Quarterly', 'Semester'], mode: 'ENTERED', repeatPer: 'NONE', phases: ['PAYOUT'] },
    { key: 'transfer_evidence', label: 'Bukti transfer', dataType: 'FILE', mode: 'ENTERED', repeatPer: 'NONE', phases: ['PAYOUT'] },
  ];

  // Role approval: daftar tetap (⚠ daftar final masih dikonfirmasi)
  const APPROVAL_ROLES = { ADMIN_DC: 'Admin DC', ABL: 'ABL', CHADEV: 'Chadev', FINANCE: 'Finance', HEAD_FINANCE: 'Head of Finance' };

  // Objek auto-approve (⚠ daftar final masih dikonfirmasi). perBrand = harus lolos untuk setiap brand.
  const AUTO_APPROVE_OBJECTS = {
    GROWTH_PER_BRAND: { label: 'Growth per brand (%)', perBrand: true, phases: ['REGISTRATION'] },
    TOTAL_GROWTH: { label: 'Total growth (%)', perBrand: false, phases: ['REGISTRATION'] },
    CONDITIONAL_REBATE_PCT: { label: 'Conditional rebate % per brand', perBrand: true, phases: ['REGISTRATION'] },
    TOTAL_REBATE_PCT: { label: 'Total rebate % per brand', perBrand: true, phases: ['REGISTRATION'] },
    ACHIEVEMENT_PCT: { label: 'Achievement % per brand', perBrand: true, phases: ['MONITORING', 'PAYOUT'] },
    EVIDENCE_COMPLETE_PCT: { label: 'Kelengkapan evidence (%)', perBrand: false, phases: ['MONITORING'] },
    PAYOUT_AMOUNT: { label: 'Nominal payout (Rp)', perBrand: false, phases: ['PAYOUT'] },
  };
  const OPERATORS = { GT: '>', GTE: '≥', LT: '<', LTE: '≤', EQ: '=', NEQ: '≠' };

  const PLACEHOLDERS = [
    ['store.name', 'Nama toko'], ['store.id', 'ID toko'], ['program.name', 'Nama program'], ['program.period', 'Periode program'],
    ['channel.name', 'Channel'], ['brands', 'Tabel semua brand (kelas, target, rebate)'], ['pillars', 'Daftar pilar & lead measure'],
    ['brand.name', 'Brand (bagian per brand)'], ['brand.class', 'Kelas'], ['brand.baseline', 'Baseline / bulan'], ['brand.growth', 'Growth'],
    ['brand.target', 'Target / bulan'], ['brand.conditionalRebatePct', 'Conditional %'], ['brand.fixRebateMaxPct', 'Fix maks %'], ['brand.totalRebatePct', 'Total rebate %'],
    ['brand.leadMeasureTargets', 'Target lead measure kelas brand (per section)'],
    ['date.today', 'Tanggal dokumen'],
  ];

  const FREQUENCIES = { MONTHLY: 'Bulanan', QUARTERLY: 'Quarterly', SEMESTER: 'Semester' };
  const LM_VALUE_TYPES = { NUMBER: 'Angka', PERCENT: 'Persentase', TEXT: 'Teks' };
  // Tipe lama (COUNT, DURATION_HOURS, MONTH_COUNT → angka; BOOLEAN → teks) tetap terbaca
  const lmType = (valueType) => (LM_VALUE_TYPES[valueType] ? valueType : valueType === 'BOOLEAN' ? 'TEXT' : 'NUMBER');
  const lmUnit = (lm) => (lm && lmType(lm.value_type) === 'PERCENT' ? '%' : (lm && lm.unit) || '');
  const DOC_TYPES = { MOU: 'MOU', SKN: 'SKN' };
  // Target lead measure per kelas: operator yang boleh dipakai bergantung tipe nilai lead measure
  const LM_TARGET_OPS = { GTE: 'Minimal', LTE: 'Maksimal', EQ: '=', REQ: 'Wajib', TEXT: 'Teks' };
  const lmTargetOps = (valueType) => (lmType(valueType) === 'TEXT' ? ['TEXT'] : ['GTE', 'LTE', 'EQ', 'TEXT']);

  window.Catalog = {
    PHASES, FORMULA_SLOTS, PRESET_NAME, FORMULA_VARIABLES, sampleVars, FIELD_TYPES, REPEAT, MODES, CATALOG_FIELDS,
    APPROVAL_ROLES, AUTO_APPROVE_OBJECTS, OPERATORS, PLACEHOLDERS, FREQUENCIES, LM_VALUE_TYPES, DOC_TYPES,
    LM_TARGET_OPS, lmTargetOps, lmType, lmUnit,
  };
})();
