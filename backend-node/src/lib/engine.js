// Logika bisnis inti: baseline, kelas otomatis, eligibility, target, dan hitungan pencairan.
// Semua angka/aturan dibaca dari setup program (tidak ada hardcode per tahun).
const db = require('../db');
const formula = require('./formula');

// ---------------------------------------------------------------- tanggal
function toMonthStart(d) {
  const s = String(d).slice(0, 7);
  return `${s}-01`;
}

function monthsBetween(start, end) {
  const out = [];
  let [y, m] = String(start).slice(0, 7).split('-').map(Number);
  const [ey, em] = String(end).slice(0, 7).split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}-01`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

function isWithin(dateStr, start, end) {
  if (!start && !end) return true;
  if (start && dateStr < start) return false;
  if (end && dateStr > end) return false;
  return true;
}

function today() {
  const d = new Date();
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- program
async function loadProgram(programId) {
  const program = await db.one('SELECT * FROM program WHERE id = $1', [programId]);
  if (!program) return null;

  const [channels, classes, pillars, jtbds, lms, params, fields, periods, components, steps] = await Promise.all([
    db.q(`SELECT pc.*, c.name AS channel_name FROM program_channel pc
          JOIN channel c ON c.code = pc.channel_code
          WHERE pc.program_id = $1 ORDER BY c.sort`, [programId]),
    db.q(`SELECT cl.* FROM program_class cl JOIN program_channel pc ON pc.id = cl.program_channel_id
          WHERE pc.program_id = $1 ORDER BY cl.program_channel_id, cl.sort, cl.baseline_min DESC`, [programId]),
    db.q('SELECT * FROM program_pillar WHERE program_id = $1 ORDER BY sort, id', [programId]),
    db.q(`SELECT j.* FROM program_jtbd j JOIN program_pillar p ON p.id = j.pillar_id
          WHERE p.program_id = $1 ORDER BY j.sort, j.id`, [programId]),
    db.q(`SELECT l.* FROM program_lead_measure l JOIN program_jtbd j ON j.id = l.jtbd_id
          JOIN program_pillar p ON p.id = j.pillar_id WHERE p.program_id = $1 ORDER BY l.sort, l.id`, [programId]),
    db.q(`SELECT pr.* FROM program_lm_param pr JOIN program_class cl ON cl.id = pr.program_class_id
          JOIN program_channel pc ON pc.id = cl.program_channel_id WHERE pc.program_id = $1`, [programId]),
    db.q('SELECT * FROM program_field WHERE program_id = $1 ORDER BY stage, sort, id', [programId]),
    db.q('SELECT * FROM program_period WHERE program_id = $1 ORDER BY sort, achieve_start', [programId]),
    db.q('SELECT * FROM program_component WHERE program_id = $1 ORDER BY sort, id', [programId]),
    db.q('SELECT * FROM program_step WHERE program_id = $1 ORDER BY phase, sort, id', [programId]),
  ]);

  for (const ch of channels) ch.classes = classes.filter((c) => c.program_channel_id === ch.id);

  // Bangun pohon matriks: pilar -> jtbd -> lead measure (+ params by class id)
  for (const lm of lms) {
    lm.params = {};
    for (const p of params.filter((x) => x.lead_measure_id === lm.id)) lm.params[p.program_class_id] = p;
  }
  for (const j of jtbds) j.lead_measures = lms.filter((l) => l.jtbd_id === j.id);
  for (const p of pillars) p.jtbds = jtbds.filter((j) => j.pillar_id === p.id);

  program.channels = channels;
  program.pillars = pillars;
  // Urut sesuai pohon: pilar -> jtbd -> lead measure
  program.leadMeasures = pillars.flatMap((p) => p.jtbds.flatMap((j) =>
    j.lead_measures.map((lm) => Object.assign(lm, { jtbd_name: j.name, pillar_name: p.name }))));
  program.fields = fields;
  program.periods = periods;
  program.components = components;
  program.steps = steps;
  program.programMonths = monthsBetween(program.program_start, program.program_end).length;
  return program;
}

function fieldsFor(program, stage, programChannelId) {
  return program.fields.filter(
    (f) => f.stage === stage && (f.program_channel_id === null || f.program_channel_id === programChannelId)
  );
}

// ---------------------------------------------------------------- sales
// Mengembalikan Map customer_id -> { sellout, sellin, activeMonths, monthly: { 'YYYY-MM-01': {sellout, sellin} } }
async function salesAgg({ customerIds, brandCodes, start, end }) {
  const params = [toMonthStart(start), toMonthStart(end)];
  let where = 'period BETWEEN $1 AND $2';
  if (customerIds) {
    params.push(customerIds);
    where += ` AND customer_id = ANY($${params.length})`;
  }
  if (brandCodes && brandCodes.length) {
    params.push(brandCodes);
    where += ` AND brand_code = ANY($${params.length})`;
  }
  const rows = await db.q(
    `SELECT customer_id, period, SUM(sellout) AS sellout, SUM(sellin) AS sellin
     FROM sales_monthly WHERE ${where} GROUP BY customer_id, period`,
    params
  );
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.customer_id)) map.set(r.customer_id, { sellout: 0, sellin: 0, activeMonths: 0, monthly: {} });
    const a = map.get(r.customer_id);
    a.sellout += r.sellout;
    a.sellin += r.sellin;
    if (r.sellout > 0 || r.sellin > 0) a.activeMonths++;
    a.monthly[r.period] = { sellout: r.sellout, sellin: r.sellin };
  }
  return map;
}

function metric(program, agg) {
  return program.basis === 'sellin' ? agg.sellin : agg.sellout;
}

function baselineOf(program, agg) {
  if (!agg) return 0;
  const total = metric(program, agg);
  if (program.baseline_method === 'avg_active_month') {
    return agg.activeMonths ? total / agg.activeMonths : 0;
  }
  return total / monthsBetween(program.baseline_start, program.baseline_end).length;
}

function sellRatio(agg) {
  if (!agg || !agg.sellin) return null;
  return (agg.sellout / agg.sellin) * 100;
}

// ---------------------------------------------------------------- kelas & eligibility
function pickClass(classes, baseline) {
  const sorted = [...classes].sort((a, b) => b.baseline_min - a.baseline_min);
  return sorted.find((c) => baseline >= c.baseline_min && (c.baseline_max === null || baseline < c.baseline_max)) || null;
}

function eligibility(pc, baseline, ratio, activeMonths) {
  const reasons = [];
  const cls = pickClass(pc.classes, baseline);
  if (!cls) reasons.push('Baseline tidak masuk range kelas manapun');
  if (pc.min_baseline !== null && baseline < pc.min_baseline) reasons.push('Baseline di bawah minimal');
  if (pc.min_sellout_ratio !== null) {
    if (ratio === null) reasons.push('Tidak ada data sell in untuk rasio');
    else if (ratio < pc.min_sellout_ratio) reasons.push(`Rasio SO:SI ${ratio.toFixed(1)}% < ${pc.min_sellout_ratio}%`);
  }
  if (pc.min_active_months !== null && activeMonths < pc.min_active_months) {
    reasons.push(`Bulan aktif ${activeMonths} < ${pc.min_active_months}`);
  }
  return { eligible: reasons.length === 0, reasons, cls };
}

function computeTarget(baseline, growthPct, months) {
  const monthly = baseline * (1 + growthPct / 100);
  return { monthly, period: monthly * months };
}

function validateGrowth(pc, cls, growth) {
  if (!Number.isFinite(growth)) return 'Growth wajib diisi';
  if (growth < cls.min_growth) return `Growth minimal kelas ${cls.name} adalah ${cls.min_growth}%`;
  if (cls.max_growth !== null && growth > cls.max_growth) return `Growth maksimal kelas ${cls.name} adalah ${cls.max_growth}%`;
  if (!pc.growth_editable && growth !== cls.min_growth) return `Growth untuk channel ini dikunci di ${cls.min_growth}%`;
  return null;
}

// ---------------------------------------------------------------- pencairan
function lmAchieved(lm, param, value) {
  if (value === undefined || value === null || value === '') return false;
  if (lm.input_type === 'yesno') return String(value).toLowerCase() === 'ya';
  if (lm.input_type === 'number') {
    const target = parseFloat(param.target_value);
    const real = parseFloat(value);
    if (!Number.isFinite(real)) return false;
    return Number.isFinite(target) ? real >= target : real > 0;
  }
  return String(value).trim() !== '';
}

function numericData(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const n = parseFloat(v);
    if (Number.isFinite(n) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) out[k] = n;
  }
  return out;
}

// Variabel yang bisa dipakai di komponen formula
const FORMULA_VARS = ['actual', 'target', 'baseline', 'achievement', 'growth', 'rebate_pct', 'months',
  'jtbd_achieved', 'jtbd_total', 'target_monthly'];

/**
 * Menghitung pencairan satu peserta untuk satu periode.
 * @returns {{ target, actual, achievement, lmItems, lines, gross, taxRate, tax, net }}
 */
function computeDisbursement({ program, participant, period, actual, lmValues, data, hasNpwp }) {
  const pc = program.channels.find((c) => c.id === participant.program_channel_id);
  const cls = pc.classes.find((c) => c.id === participant.class_id) || { name: participant.class_name, rebate_pct: 0 };
  const months = monthsBetween(period.achieve_start, period.achieve_end).length;
  const target = participant.target_monthly * months;
  const achievement = target > 0 ? (actual / target) * 100 : 0;

  // Lead measure yang berlaku untuk kelas peserta
  const lmItems = program.leadMeasures
    .filter((lm) => lm.params[cls.id])
    .map((lm) => {
      const param = lm.params[cls.id];
      const value = (lmValues || {})[lm.id];
      return { lm, param, value: value === undefined ? '' : value, achieved: lmAchieved(lm, param, value) };
    });

  const vars = Object.assign(
    {},
    numericData(participant.data),
    numericData(data),
    {
      actual, target, baseline: participant.baseline, achievement, growth: participant.growth_pct,
      rebate_pct: cls.rebate_pct, months, target_monthly: participant.target_monthly,
      jtbd_achieved: lmItems.filter((i) => i.achieved).length, jtbd_total: lmItems.length,
    }
  );

  const lines = [];
  const comps = program.components.filter(
    (c) => c.is_active &&
      (c.program_channel_id === null || c.program_channel_id === pc.id) &&
      (!c.period_ids || c.period_ids.length === 0 || c.period_ids.includes(period.id))
  );

  for (const c of comps) {
    const cfg = c.config || {};
    const baseVal = cfg.base === 'target' ? target : actual;
    const minAch = cfg.min_achievement === undefined || cfg.min_achievement === null || cfg.min_achievement === ''
      ? null : Number(cfg.min_achievement);
    const gateOk = minAch === null || achievement >= minAch;
    let amount = 0;
    let detail = '';

    try {
      if (c.comp_type === 'growth_rebate') {
        const pct = cfg.rebate_source === 'custom' ? Number(cfg.rebate_pct || 0) : Number(cls.rebate_pct || 0);
        const tiers = (cfg.tiers || []).map((t) => ({ min: Number(t.min_achievement), payout: Number(t.payout_pct) }))
          .sort((a, b) => b.min - a.min);
        const tier = tiers.find((t) => achievement >= t.min);
        if (tier) {
          amount = baseVal * (pct / 100) * (tier.payout / 100);
          detail = `${pct}% x ${cfg.base === 'target' ? 'target' : 'aktual'} x payout ${tier.payout}% (tier >= ${tier.min}%)`;
        } else {
          detail = tiers.length ? `Pencapaian ${achievement.toFixed(1)}% < tier terendah ${tiers[tiers.length - 1].min}%` : 'Tier belum diatur';
        }
      } else if (c.comp_type === 'jtbd') {
        if (!gateOk) {
          detail = `Pencapaian ${achievement.toFixed(1)}% < syarat ${minAch}%`;
        } else {
          let n = 0;
          for (const item of lmItems) {
            if (!item.achieved) continue;
            amount += baseVal * (Number(item.param.reward_pct || 0) / 100) + Number(item.param.reward_nominal || 0);
            n++;
          }
          detail = `${n} dari ${lmItems.length} lead measure tercapai`;
        }
      } else if (c.comp_type === 'fixed') {
        const amounts = cfg.amounts || {};
        const val = Number(amounts[cls.name] || 0);
        if (gateOk) {
          amount = val;
          detail = `Nominal kelas ${cls.name}`;
        } else {
          detail = `Pencapaian ${achievement.toFixed(1)}% < syarat ${minAch}%`;
        }
      } else if (c.comp_type === 'formula') {
        if (gateOk) {
          amount = formula.evaluate(cfg.expression, vars);
          detail = cfg.expression;
        } else {
          detail = `Pencapaian ${achievement.toFixed(1)}% < syarat ${minAch}%`;
        }
      }
    } catch (err) {
      detail = `Error rumus: ${err.message}`;
      amount = 0;
    }

    amount = Math.max(0, Math.round(amount));
    lines.push({ component_id: c.id, name: c.name, type: c.comp_type, amount, detail });
  }

  const gross = lines.reduce((s, l) => s + l.amount, 0);
  const taxRate = hasNpwp ? Number(program.tax_rate_npwp) : Number(program.tax_rate_non_npwp);
  const tax = Math.round(gross * taxRate / 100);
  return { target, actual, achievement, months, lmItems, lines, gross, taxRate, tax, net: gross - tax };
}

module.exports = {
  monthsBetween, toMonthStart, isWithin, today,
  loadProgram, fieldsFor, salesAgg, metric, baselineOf, sellRatio,
  pickClass, eligibility, computeTarget, validateGrowth,
  computeDisbursement, lmAchieved, FORMULA_VARS,
};
