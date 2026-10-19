// Pencairan: periode, komponen hitungan, dan alur approval semuanya mengikuti setup program.
const express = require('express');
const db = require('../db');
const engine = require('../lib/engine');
const workflow = require('../lib/workflow');
const { readFieldValues } = require('../lib/fields');
const { flash, scopeSql } = require('../middleware/auth');

const router = express.Router();

function claimOpen(program, period) {
  if ((program.settings || {}).demo_open_windows) return true;
  return engine.isWithin(engine.today(), period.claim_start, period.claim_end);
}

function canSubmit(user, program) {
  return user.role === program.disbursement_submitter_role || user.role === 'ADMIN_HO';
}

async function loadCtx(req, res) {
  const program = await engine.loadProgram(Number(req.params.programId));
  if (!program || program.year !== req.session.year) {
    res.status(404).render('error', { title: 'Program tidak ditemukan', message: '' }); return null;
  }
  const period = program.periods.find((p) => p.id === Number(req.params.periodId));
  if (!period) { res.status(404).render('error', { title: 'Periode tidak ditemukan', message: '' }); return null; }
  return { program, period };
}

async function actualFor(program, pc, period, customerIds) {
  return engine.salesAgg({ customerIds, brandCodes: pc.brand_codes, start: period.achieve_start, end: period.achieve_end });
}

function readLmValues(program, cls, body) {
  const out = {};
  for (const lm of program.leadMeasures) {
    if (!cls || !lm.params[cls.id]) continue;
    const v = body[`lm_${lm.id}`];
    if (v !== undefined && String(v).trim() !== '') out[lm.id] = String(v).trim();
  }
  return out;
}

function readPayee(body) {
  const keys = ['npwp_no', 'npwp_name', 'bank_name', 'bank_account_no', 'bank_account_name'];
  return Object.fromEntries(keys.map((k) => [k, String(body[k] || '').trim()]));
}

// ---------------------------------------------------------------- pilih program & periode
router.get('/', async (req, res) => {
  const programs = await db.q("SELECT id FROM program WHERE year = $1 AND status IN ('active','closed') ORDER BY name", [req.session.year]);
  const list = [];
  for (const { id } of programs) {
    const p = await engine.loadProgram(id);
    for (const per of p.periods) {
      per.isOpen = claimOpen(p, per);
      per.stats = await db.one(
        `SELECT COUNT(*) FILTER (WHERE d.status = 'in_review') AS review,
                COUNT(*) FILTER (WHERE d.status = 'paid') AS paid,
                COUNT(*) FILTER (WHERE d.status = 'returned') AS returned,
                COALESCE(SUM(d.net_amount) FILTER (WHERE d.status = 'paid'), 0) AS paid_amount
         FROM disbursement d WHERE d.period_id = $1`, [per.id]);
    }
    list.push(p);
  }
  res.render('disbursement/index', { title: 'Pencairan', programs: list });
});

// ---------------------------------------------------------------- daftar peserta per periode
router.get('/program/:programId/:periodId', async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, period } = ctx;
  const params = [program.id, period.id];
  let where = scopeSql(req.session.user, 's', params);
  if (req.query.channel) { params.push(req.query.channel); where += ` AND s.channel_code = $${params.length}`; }
  const rows = await db.q(
    `SELECT pa.*, s.name AS store_name, s.dc_code, s.channel_code, s.npwp_no,
       d.id AS disb_id, d.status AS disb_status, d.net_amount, d.gross_amount, d.breakdown,
       d.target AS disb_target, d.actual AS disb_actual, d.achievement_pct AS disb_achievement, st.name AS step_name
     FROM participant pa JOIN store s ON s.customer_id = pa.customer_id
     LEFT JOIN disbursement d ON d.participant_id = pa.id AND d.period_id = $2
     LEFT JOIN program_step st ON st.id = d.current_step_id
     WHERE pa.program_id = $1 AND pa.status = 'active' ${where}
     ORDER BY s.channel_code, pa.customer_id`, params);

  // Estimasi (tanpa realisasi JTBD) untuk yang belum diajukan
  for (const pc of program.channels) {
    const ids = rows.filter((r) => r.program_channel_id === pc.id).map((r) => r.customer_id);
    if (!ids.length) continue;
    const agg = await actualFor(program, pc, period, ids);
    for (const r of rows.filter((x) => x.program_channel_id === pc.id)) {
      const a = agg.get(r.customer_id);
      const actual = a ? engine.metric(program, a) : 0;
      r.calc = engine.computeDisbursement({ program, participant: r, period, actual, lmValues: {}, data: {}, hasNpwp: !!r.npwp_no });
      r.channel_name = pc.channel_name;
    }
  }
  const totals = {
    count: rows.length,
    submitted: rows.filter((r) => r.disb_id).length,
    paid: rows.filter((r) => r.disb_status === 'paid').reduce((s, r) => s + r.net_amount, 0),
    estimate: rows.reduce((s, r) => s + (r.calc ? r.calc.gross : 0), 0),
  };
  res.render('disbursement/list', {
    title: `Pencairan ${period.name}`, program, period, rows, totals, query: req.query,
    isOpen: claimOpen(program, period), canSubmit: canSubmit(req.session.user, program),
  });
});

router.get('/program/:programId/:periodId/export', async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, period } = ctx;
  const params = [period.id];
  const rows = await db.q(
    `SELECT pa.customer_id, s.name, s.dc_code, s.channel_code, pa.class_name, d.target, d.actual, d.achievement_pct,
       d.breakdown, d.gross_amount, d.tax_rate, d.tax_amount, d.net_amount, d.status, d.payee
     FROM disbursement d JOIN participant pa ON pa.id = d.participant_id JOIN store s ON s.customer_id = pa.customer_id
     WHERE d.period_id = $1 ${scopeSql(req.session.user, 's', params)} ORDER BY s.channel_code, pa.customer_id`, params);
  const compNames = program.components.map((c) => c.name);
  const head = ['customer_id', 'nama_toko', 'dc', 'channel', 'kelas', 'target', 'aktual', 'pencapaian_%',
    ...compNames, 'bruto', 'pajak_%', 'pajak', 'netto', 'status', 'npwp', 'bank', 'no_rekening', 'nama_rekening'];
  const esc = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
  const lines = [head.map(esc).join(',')];
  for (const r of rows) {
    const byName = Object.fromEntries((r.breakdown || []).map((l) => [l.name, l.amount]));
    lines.push([r.customer_id, r.name, r.dc_code, r.channel_code, r.class_name, Math.round(r.target), Math.round(r.actual),
      r.achievement_pct.toFixed(2), ...compNames.map((n) => byName[n] || 0), r.gross_amount, r.tax_rate, r.tax_amount,
      r.net_amount, r.status, r.payee.npwp_no, r.payee.bank_name, r.payee.bank_account_no, r.payee.bank_account_name].map(esc).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="pencairan_${program.code}_${period.name.replace(/\W+/g, '_')}.csv"`);
  res.send('﻿' + lines.join('\n'));
});

// ---------------------------------------------------------------- form pencairan per peserta
async function participantCtx(req, res, program, period) {
  const params = [Number(req.params.paId), program.id];
  const pa = await db.one(
    `SELECT pa.*, s.name AS store_name, s.city, s.dc_code, s.channel_code, s.npwp_no, s.npwp_name,
       s.bank_name, s.bank_account_no, s.bank_account_name
     FROM participant pa JOIN store s ON s.customer_id = pa.customer_id
     WHERE pa.id = $1 AND pa.program_id = $2 ${scopeSql(req.session.user, 's', params)}`, params);
  if (!pa) { res.status(404).render('error', { title: 'Peserta tidak ditemukan', message: '' }); return null; }
  const pc = program.channels.find((c) => c.id === pa.program_channel_id);
  const cls = pc.classes.find((c) => c.id === pa.class_id);
  const agg = (await actualFor(program, pc, period, [pa.customer_id])).get(pa.customer_id);
  const actual = agg ? engine.metric(program, agg) : 0;
  const months = engine.monthsBetween(period.achieve_start, period.achieve_end).map((m) => ({
    m, actual: agg && agg.monthly[m] ? engine.metric(program, agg.monthly[m]) : 0, target: pa.target_monthly,
  }));
  const disb = await db.one('SELECT * FROM disbursement WHERE participant_id = $1 AND period_id = $2', [pa.id, period.id]);
  return { pa, pc, cls, actual, months, disb };
}

router.get('/program/:programId/:periodId/participant/:paId', async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, period } = ctx;
  const pctx = await participantCtx(req, res, program, period); if (!pctx) return;
  if (pctx.disb && pctx.disb.status !== 'returned') return res.redirect(`/disbursement/item/${pctx.disb.id}`);
  const payee = pctx.disb ? pctx.disb.payee : {
    npwp_no: pctx.pa.npwp_no || '', npwp_name: pctx.pa.npwp_name || '', bank_name: pctx.pa.bank_name || '',
    bank_account_no: pctx.pa.bank_account_no || '', bank_account_name: pctx.pa.bank_account_name || '',
  };
  const lmValues = pctx.disb ? pctx.disb.lm_values : {};
  const values = pctx.disb ? pctx.disb.data : {};
  const calc = engine.computeDisbursement({ program, participant: pctx.pa, period, actual: pctx.actual, lmValues, data: values, hasNpwp: !!payee.npwp_no });
  res.render('disbursement/form', {
    title: `Pencairan ${pctx.pa.store_name}`, program, period, ...pctx, payee, lmValues, values, calc, errors: [],
    fields: engine.fieldsFor(program, 'disbursement', pctx.pc.id),
    isOpen: claimOpen(program, period), canSubmit: canSubmit(req.session.user, program),
  });
});

// Preview hitungan (dipanggil via fetch saat user mengisi form)
router.post('/program/:programId/:periodId/participant/:paId/preview', async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, period } = ctx;
  const pctx = await participantCtx(req, res, program, period); if (!pctx) return;
  const fields = engine.fieldsFor(program, 'disbursement', pctx.pc.id);
  const { values } = readFieldValues(fields, req.body);
  const calc = engine.computeDisbursement({
    program, participant: pctx.pa, period, actual: pctx.actual,
    lmValues: readLmValues(program, pctx.cls, req.body), data: values, hasNpwp: !!String(req.body.npwp_no || '').trim(),
  });
  res.json({
    lines: calc.lines, gross: calc.gross, taxRate: calc.taxRate, tax: calc.tax, net: calc.net,
    lm: calc.lmItems.map((i) => ({ id: i.lm.id, achieved: i.achieved })),
  });
});

router.post('/program/:programId/:periodId/participant/:paId', async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, period } = ctx;
  const pctx = await participantCtx(req, res, program, period); if (!pctx) return;
  const { pa, pc, cls, actual, disb } = pctx;
  const fields = engine.fieldsFor(program, 'disbursement', pc.id);
  const { values, errors } = readFieldValues(fields, req.body);
  const lmValues = readLmValues(program, cls, req.body);
  const payee = readPayee(req.body);

  if (!canSubmit(req.session.user, program)) errors.unshift(`Pengajuan pencairan dilakukan oleh role ${program.disbursement_submitter_role}.`);
  if (!claimOpen(program, period)) errors.unshift('Periode klaim pencairan belum dibuka / sudah ditutup.');
  if (disb && disb.status !== 'returned') errors.unshift('Pencairan periode ini sudah diajukan.');
  if (!payee.bank_name || !payee.bank_account_no || !payee.bank_account_name) errors.push('Data rekening (bank, nomor, nama) wajib diisi.');
  if (payee.npwp_no && !/^[0-9.\-]{15,20}$/.test(payee.npwp_no)) errors.push('Format NPWP tidak valid (15-16 digit).');

  const calc = engine.computeDisbursement({ program, participant: pa, period, actual, lmValues, data: values, hasNpwp: !!payee.npwp_no });
  if (errors.length) {
    return res.status(400).render('disbursement/form', {
      title: `Pencairan ${pa.store_name}`, program, period, ...pctx, payee, lmValues, values: req.body, calc, errors, fields,
      isOpen: claimOpen(program, period), canSubmit: canSubmit(req.session.user, program), rawValues: true,
    });
  }

  const init = workflow.initialState(program, 'disbursement');
  const row = [calc.target, calc.actual, calc.achievement, lmValues, values, payee, JSON.stringify(calc.lines),
    calc.gross, calc.taxRate, calc.tax, calc.net, init.status, init.current_step_id, req.session.user.id];
  const id = await db.tx(async (tx) => {
    let did;
    if (disb) {
      await tx.q(
        `UPDATE disbursement SET target=$2, actual=$3, achievement_pct=$4, lm_values=$5, data=$6, payee=$7, breakdown=$8,
           gross_amount=$9, tax_rate=$10, tax_amount=$11, net_amount=$12, status=$13, current_step_id=$14, submitted_by=$15, updated_at=now()
         WHERE id=$1`, [disb.id, ...row]);
      did = disb.id;
      await workflow.log(tx, 'disbursement', did, null, 'resubmit', req.body.note || null, req.session.user.id);
    } else {
      did = (await tx.one(
        `INSERT INTO disbursement (participant_id, period_id, target, actual, achievement_pct, lm_values, data, payee, breakdown,
           gross_amount, tax_rate, tax_amount, net_amount, status, current_step_id, submitted_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`, [pa.id, period.id, ...row])).id;
      await workflow.log(tx, 'disbursement', did, null, 'submit', null, req.session.user.id);
    }
    return did;
  });
  flash(req, 'success', `Pencairan ${pa.store_name} diajukan (netto Rp ${calc.net.toLocaleString('id-ID')})` +
    (init.step ? `, menunggu "${init.step.name}".` : ', langsung berstatus cair.'));
  res.redirect(req.body.next === 'detail' ? `/disbursement/item/${id}` : `/disbursement/program/${program.id}/${period.id}`);
});

// ---------------------------------------------------------------- detail pencairan
router.get('/item/:id', async (req, res) => {
  const params = [Number(req.params.id), req.session.year];
  const d = await db.one(
    `SELECT d.*, pa.program_id, pa.program_channel_id, pa.class_id, pa.class_name, pa.customer_id, pa.baseline, pa.growth_pct,
       pa.target_monthly, s.name AS store_name, s.dc_code, s.channel_code, s.city, u.name AS submitted_by_name
     FROM disbursement d JOIN participant pa ON pa.id = d.participant_id JOIN program p ON p.id = pa.program_id
     JOIN store s ON s.customer_id = pa.customer_id LEFT JOIN app_user u ON u.id = d.submitted_by
     WHERE d.id = $1 AND p.year = $2 ${scopeSql(req.session.user, 's', params)}`, params);
  if (!d) return res.status(404).render('error', { title: 'Pencairan tidak ditemukan', message: '' });
  const program = await engine.loadProgram(d.program_id);
  const period = program.periods.find((p) => p.id === d.period_id);
  const pc = program.channels.find((c) => c.id === d.program_channel_id);
  const logs = await db.q(
    `SELECT l.*, u.name AS user_name, u.role AS user_role FROM workflow_log l LEFT JOIN app_user u ON u.id = l.user_id
     WHERE l.entity = 'disbursement' AND l.entity_id = $1 ORDER BY l.created_at`, [d.id]);
  const step = program.steps.find((s) => s.id === d.current_step_id);
  const lmRows = program.leadMeasures.filter((lm) => lm.params[d.class_id]).map((lm) => ({
    lm, param: lm.params[d.class_id], value: d.lm_values[lm.id], achieved: engine.lmAchieved(lm, lm.params[d.class_id], d.lm_values[lm.id]),
  }));
  res.render('disbursement/detail', {
    title: `Pencairan ${d.store_name}`, d, program, period, pc, logs, step, lmRows,
    fields: engine.fieldsFor(program, 'disbursement', pc.id),
    canAct: d.status === 'in_review' && step && step.role === req.session.user.role,
    canEdit: d.status === 'returned' && canSubmit(req.session.user, program),
  });
});

module.exports = router;
