// Unit test logika murni (tidak butuh database). Jalankan: npm test
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://unused/unused';
const test = require('node:test');
const assert = require('node:assert');
const formula = require('../src/lib/formula');
const engine = require('../src/lib/engine');

test('formula: operator, ternary, fungsi', () => {
  assert.strictEqual(formula.evaluate('1 + 2 * 3', {}), 7);
  assert.strictEqual(formula.evaluate('achievement >= 110 ? (actual - target) * 0.01 : 0', { achievement: 120, actual: 1200, target: 1000 }), 2);
  assert.strictEqual(formula.evaluate('min(promo, actual * 0.02)', { promo: 50, actual: 1000 }), 20);
  assert.strictEqual(formula.evaluate('if(a > 1 && b < 1, 5, 6)', { a: 2, b: 0 }), 5);
  assert.strictEqual(formula.evaluate('10 / 0', {}), 0);
});

test('formula: validasi menolak variabel / sintaks salah', () => {
  assert.match(formula.validate('actual * (', ['actual']), /terlalu cepat/);
  assert.match(formula.validate('foo + 1', ['actual']), /foo/);
  assert.notStrictEqual(formula.validate('process.exit()', []), null);
  assert.match(formula.validate('constructor(1)', []), /tidak dikenal/);
  assert.strictEqual(formula.validate('actual * 0.1', ['actual']), null);
});

test('monthsBetween', () => {
  assert.deepStrictEqual(engine.monthsBetween('2026-11-01', '2027-02-28'), ['2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01']);
});

const classes = [
  { id: 1, name: 'A', baseline_min: 60e6, baseline_max: null, min_growth: 45, max_growth: null, rebate_pct: 3 },
  { id: 2, name: 'B', baseline_min: 30e6, baseline_max: 60e6, min_growth: 35, max_growth: null, rebate_pct: 2.5 },
  { id: 3, name: 'C', baseline_min: 15e6, baseline_max: 30e6, min_growth: 25, max_growth: 40, rebate_pct: 2 },
];

test('kelas otomatis dari baseline (contoh rekaman: 70 jt -> kelas A, growth 45%)', () => {
  assert.strictEqual(engine.pickClass(classes, 70e6).name, 'A');
  assert.strictEqual(engine.pickClass(classes, 60e6).name, 'A');
  assert.strictEqual(engine.pickClass(classes, 59_999_999).name, 'B');
  assert.strictEqual(engine.pickClass(classes, 10e6), null);
});

test('eligibility & validasi growth', () => {
  const pc = { classes, min_baseline: null, min_sellout_ratio: 96, min_active_months: 6, growth_editable: true };
  assert.strictEqual(engine.eligibility(pc, 70e6, 97, 12).eligible, true);
  const e = engine.eligibility(pc, 70e6, 90, 4);
  assert.strictEqual(e.eligible, false);
  assert.strictEqual(e.reasons.length, 2);
  assert.match(engine.validateGrowth(pc, classes[0], 40), /minimal/);
  assert.match(engine.validateGrowth(pc, classes[2], 50), /maksimal/);
  assert.strictEqual(engine.validateGrowth(pc, classes[0], 50), null);
  assert.match(engine.validateGrowth({ ...pc, growth_editable: false }, classes[0], 50), /dikunci/);
});

test('hitung pencairan: tier, JTBD per kelas, rumus, pajak', () => {
  const lm = (id, type, target, reward) => ({ id, input_type: type, params: { 1: { target_value: target, reward_pct: reward, reward_nominal: 0 } } });
  const program = {
    tax_rate_npwp: 2, tax_rate_non_npwp: 4,
    channels: [{ id: 10, classes }],
    leadMeasures: [lm(100, 'number', '4', 0.5), lm(101, 'yesno', 'Ya', 0.5)],
    components: [
      { id: 1, is_active: true, program_channel_id: null, period_ids: null, comp_type: 'growth_rebate', name: 'Rebate',
        config: { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] } },
      { id: 2, is_active: true, program_channel_id: null, period_ids: null, comp_type: 'jtbd', name: 'JTBD', config: { base: 'actual', min_achievement: 90 } },
      { id: 3, is_active: true, program_channel_id: null, period_ids: [99], comp_type: 'fixed', name: 'Periode lain', config: { amounts: { A: 1e6 } } },
      { id: 4, is_active: true, program_channel_id: null, period_ids: null, comp_type: 'formula', name: 'Promo', config: { expression: 'promo_budget * 0.5' } },
    ],
  };
  const participant = { program_channel_id: 10, class_id: 1, class_name: 'A', baseline: 70e6, growth_pct: 45, target_monthly: 100e6, data: { promo_budget: 2e6 } };
  const period = { id: 1, achieve_start: '2027-01-01', achieve_end: '2027-06-30' };

  const r = engine.computeDisbursement({ program, participant, period, actual: 570e6, lmValues: { 100: '5', 101: 'Tidak' }, data: {}, hasNpwp: true });
  assert.strictEqual(r.target, 600e6);
  assert.strictEqual(Math.round(r.achievement), 95);
  const by = Object.fromEntries(r.lines.map((l) => [l.name, l.amount]));
  assert.strictEqual(by.Rebate, Math.round(570e6 * 0.03 * 0.5));   // tier 90% -> bayar 50%
  assert.strictEqual(by.JTBD, Math.round(570e6 * 0.005));          // hanya 1 dari 2 LM tercapai
  assert.strictEqual(by['Periode lain'], undefined);                // komponen khusus periode lain
  assert.strictEqual(by.Promo, 1e6);
  assert.strictEqual(r.taxRate, 2);
  assert.strictEqual(r.net, r.gross - Math.round(r.gross * 0.02));

  const low = engine.computeDisbursement({ program, participant, period, actual: 500e6, lmValues: { 100: '5' }, data: {}, hasNpwp: false });
  const byLow = Object.fromEntries(low.lines.map((l) => [l.name, l.amount]));
  assert.strictEqual(byLow.Rebate, 0);
  assert.strictEqual(byLow.JTBD, 0);
  assert.strictEqual(low.taxRate, 4);
});
