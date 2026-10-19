// Pendaftaran toko oleh CBD.
// Saran toko eligible diambil dari data sell out bulanan, kelas ditentukan otomatis dari baseline,
// kolom form mengikuti setup program. Begitu CBD submit, toko langsung terdaftar (tanpa admin DC).
const express = require('express');
const db = require('../db');
const engine = require('../lib/engine');
const workflow = require('../lib/workflow');
const { toNum } = require('../lib/num');
const { readFieldValues } = require('../lib/fields');
const { requireRole, flash, scopeSql } = require('../middleware/auth');

const router = express.Router();
const CAN_REGISTER = ['CBD', 'ADMIN_HO'];

function canSeeChannel(user, code) {
  return !user.channel_codes || !user.channel_codes.length || user.channel_codes.includes(code);
}

function registrationOpen(program) {
  if ((program.settings || {}).demo_open_windows) return true;
  return engine.isWithin(engine.today(), program.registration_start, program.registration_end);
}

async function loadCtx(req, res) {
  const program = await engine.loadProgram(Number(req.params.programId));
  if (!program || program.year !== req.session.year) {
    res.status(404).render('error', { title: 'Program tidak ditemukan', message: '' });
    return null;
  }
  const pc = program.channels.find((c) => c.id === Number(req.params.pcId));
  if (!pc || !canSeeChannel(req.session.user, pc.channel_code)) {
    res.status(404).render('error', { title: 'Channel tidak ditemukan', message: 'Channel tidak ada atau di luar scope Anda.' });
    return null;
  }
  return { program, pc };
}

// ---------------------------------------------------------------- pilih program & channel
router.get('/', requireRole(...CAN_REGISTER), async (req, res) => {
  const programs = await db.q("SELECT id FROM program WHERE year = $1 AND status = 'active' ORDER BY name", [req.session.year]);
  const list = [];
  for (const { id } of programs) {
    const p = await engine.loadProgram(id);
    p.isOpen = registrationOpen(p);
    p.channels = p.channels.filter((c) => canSeeChannel(req.session.user, c.channel_code));
    for (const c of p.channels) {
      const r = await db.one(
        `SELECT COUNT(*) FILTER (WHERE status IN ('active','in_review')) AS registered,
                COUNT(*) FILTER (WHERE status = 'returned') AS returned
         FROM participant WHERE program_channel_id = $1`, [c.id]);
      Object.assign(c, r);
    }
    list.push(p);
  }
  res.render('registration/index', { title: 'Pendaftaran Toko', programs: list });
});

// ---------------------------------------------------------------- saran toko eligible
router.get('/program/:programId/:pcId', requireRole(...CAN_REGISTER), async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, pc } = ctx;
  const params = [pc.channel_code, program.id];
  const scope = scopeSql(req.session.user, 's', params);
  const stores = await db.q(
    `SELECT s.*, d.name AS dc_name FROM store s JOIN dc d ON d.code = s.dc_code
     WHERE s.channel_code = $1 ${scope}
       AND NOT EXISTS (SELECT 1 FROM participant pa WHERE pa.program_id = $2 AND pa.customer_id = s.customer_id)
     ORDER BY s.customer_id`, params);
  const agg = await engine.salesAgg({
    customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes,
    start: program.baseline_start, end: program.baseline_end,
  });
  const baselineMonths = engine.monthsBetween(program.baseline_start, program.baseline_end);
  const rows = stores.map((s) => {
    const a = agg.get(s.customer_id);
    const baseline = engine.baselineOf(program, a);
    const ratio = engine.sellRatio(a);
    const e = engine.eligibility(pc, baseline, ratio, a ? a.activeMonths : 0);
    if (!a) e.reasons.unshift('Tidak ada data sell out di periode baseline');
    return {
      store: s, baseline, ratio, activeMonths: a ? a.activeMonths : 0,
      eligible: !!a && e.eligible, reasons: e.reasons, cls: e.cls,
      monthly: baselineMonths.map((m) => (a && a.monthly[m] ? engine.metric(program, a.monthly[m]) : 0)),
    };
  }).sort((x, y) => Number(y.eligible) - Number(x.eligible) || y.baseline - x.baseline);
  const showAll = req.query.all === '1';
  res.render('registration/suggest', {
    title: `Saran Toko - ${pc.channel_name}`, program, pc, baselineMonths,
    rows: showAll ? rows : rows.filter((r) => r.eligible),
    counts: { eligible: rows.filter((r) => r.eligible).length, total: rows.length },
    showAll, isOpen: registrationOpen(program),
  });
});

// ---------------------------------------------------------------- form daftar
async function storeContext(program, pc, customerId, user) {
  const params = [customerId, pc.channel_code];
  const scope = scopeSql(user, 's', params);
  const store = await db.one(
    `SELECT s.*, d.name AS dc_name FROM store s JOIN dc d ON d.code = s.dc_code
     WHERE s.customer_id = $1 AND s.channel_code = $2 ${scope}`, params);
  if (!store) return null;
  const agg = (await engine.salesAgg({
    customerIds: [customerId], brandCodes: pc.brand_codes, start: program.baseline_start, end: program.baseline_end,
  })).get(customerId);
  const baseline = engine.baselineOf(program, agg);
  const ratio = engine.sellRatio(agg);
  const e = engine.eligibility(pc, baseline, ratio, agg ? agg.activeMonths : 0);
  const months = engine.monthsBetween(program.baseline_start, program.baseline_end);
  const monthly = months.map((m) => ({ m, sellout: agg && agg.monthly[m] ? agg.monthly[m].sellout : 0, sellin: agg && agg.monthly[m] ? agg.monthly[m].sellin : 0 }));
  return { store, agg, baseline, ratio, elig: e, monthly };
}

router.get('/program/:programId/:pcId/store/:customerId', requireRole(...CAN_REGISTER), async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, pc } = ctx;
  const sc = await storeContext(program, pc, req.params.customerId, req.session.user);
  if (!sc) return res.status(404).render('error', { title: 'Toko tidak ditemukan', message: 'Toko tidak ada di channel / scope Anda.' });
  const existing = await db.one('SELECT id FROM participant WHERE program_id = $1 AND customer_id = $2', [program.id, sc.store.customer_id]);
  if (existing) return res.redirect(`/registration/participant/${existing.id}`);
  res.render('registration/form', {
    title: `Daftarkan ${sc.store.name}`, program, pc, ...sc,
    fields: engine.fieldsFor(program, 'registration', pc.id),
    values: {}, growth: sc.elig.cls ? sc.elig.cls.min_growth : '', errors: [],
    isOpen: registrationOpen(program), participant: null,
  });
});

router.post('/program/:programId/:pcId/store/:customerId', requireRole(...CAN_REGISTER), async (req, res) => {
  const ctx = await loadCtx(req, res); if (!ctx) return;
  const { program, pc } = ctx;
  const sc = await storeContext(program, pc, req.params.customerId, req.session.user);
  if (!sc) return res.status(404).render('error', { title: 'Toko tidak ditemukan', message: '' });
  const fields = engine.fieldsFor(program, 'registration', pc.id);
  const { values, errors } = readFieldValues(fields, req.body);
  const growth = toNum(req.body.growth);

  if (program.status !== 'active') errors.unshift('Program belum aktif.');
  if (!registrationOpen(program)) errors.unshift('Periode pendaftaran sudah ditutup / belum dibuka.');
  if (!sc.agg) errors.unshift('Toko tidak punya data sell out di periode baseline.');
  if (!sc.elig.eligible) errors.unshift('Toko tidak eligible: ' + sc.elig.reasons.join(', '));
  if (sc.elig.cls) {
    const gErr = engine.validateGrowth(pc, sc.elig.cls, growth);
    if (gErr) errors.push(gErr);
  }

  if (errors.length) {
    return res.status(400).render('registration/form', {
      title: `Daftarkan ${sc.store.name}`, program, pc, ...sc, fields, values: req.body, growth: req.body.growth,
      errors, isOpen: registrationOpen(program), participant: null, rawValues: true,
    });
  }

  const target = engine.computeTarget(sc.baseline, growth, program.programMonths);
  const init = workflow.initialState(program, 'registration');
  let id;
  try {
    id = await db.tx(async (tx) => {
      const p = await tx.one(
        `INSERT INTO participant (program_id, program_channel_id, customer_id, class_id, class_name, baseline, sellout_ratio,
           growth_pct, target_monthly, target_period, data, status, current_step_id, registered_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [program.id, pc.id, sc.store.customer_id, sc.elig.cls.id, sc.elig.cls.name, sc.baseline, sc.ratio,
          growth, target.monthly, target.period, values, init.status, init.current_step_id, req.session.user.id]);
      await workflow.log(tx, 'participant', p.id, null, 'submit', null, req.session.user.id);
      return p.id;
    });
  } catch (e) {
    if (e.code === '23505') { flash(req, 'warning', 'Toko sudah terdaftar di program ini.'); return res.redirect(`/registration/program/${program.id}/${pc.id}`); }
    throw e;
  }
  flash(req, 'success', `${sc.store.name} terdaftar di kelas ${sc.elig.cls.name}` +
    (init.step ? ` dan menunggu "${init.step.name}".` : ' dan langsung aktif.'));
  res.redirect(req.body.next === 'detail' ? `/registration/participant/${id}` : `/registration/program/${program.id}/${pc.id}`);
});

// ---------------------------------------------------------------- daftar peserta
router.get('/participants', async (req, res) => {
  const params = [req.session.year];
  let where = 'WHERE p.year = $1' + scopeSql(req.session.user, 's', params);
  if (req.query.program) { params.push(Number(req.query.program)); where += ` AND p.id = $${params.length}`; }
  if (req.query.status) { params.push(req.query.status); where += ` AND pa.status = $${params.length}`; }
  if (req.query.channel) { params.push(req.query.channel); where += ` AND s.channel_code = $${params.length}`; }
  const rows = await db.q(
    `SELECT pa.*, s.name AS store_name, s.dc_code, c.name AS channel_name, p.name AS program_name, p.code AS program_code,
       st.name AS step_name, st.role AS step_role, u.name AS registered_by_name
     FROM participant pa JOIN program p ON p.id = pa.program_id JOIN store s ON s.customer_id = pa.customer_id
     JOIN channel c ON c.code = s.channel_code LEFT JOIN program_step st ON st.id = pa.current_step_id
     LEFT JOIN app_user u ON u.id = pa.registered_by
     ${where} ORDER BY pa.registered_at DESC LIMIT 1000`, params);
  const programs = await db.q('SELECT id, name FROM program WHERE year = $1 ORDER BY name', [req.session.year]);
  const channels = await db.q('SELECT * FROM channel ORDER BY sort');
  res.render('registration/participants', { title: 'Peserta Program', rows, programs, channels, query: req.query });
});

// ---------------------------------------------------------------- detail / revisi peserta
async function loadParticipant(req, res) {
  const params = [Number(req.params.id), req.session.year];
  const scope = scopeSql(req.session.user, 's', params);
  const pa = await db.one(
    `SELECT pa.*, s.name AS store_name, s.city, s.dc_code, s.channel_code, u.name AS registered_by_name
     FROM participant pa JOIN store s ON s.customer_id = pa.customer_id JOIN program p ON p.id = pa.program_id
     LEFT JOIN app_user u ON u.id = pa.registered_by
     WHERE pa.id = $1 AND p.year = $2 ${scope}`, params);
  if (!pa) { res.status(404).render('error', { title: 'Peserta tidak ditemukan', message: '' }); return null; }
  const program = await engine.loadProgram(pa.program_id);
  const pc = program.channels.find((c) => c.id === pa.program_channel_id);
  return { pa, program, pc };
}

router.get('/participant/:id', async (req, res) => {
  const ctx = await loadParticipant(req, res); if (!ctx) return;
  const { pa, program, pc } = ctx;
  const logs = await db.q(
    `SELECT l.*, u.name AS user_name, u.role AS user_role FROM workflow_log l LEFT JOIN app_user u ON u.id = l.user_id
     WHERE l.entity = 'participant' AND l.entity_id = $1 ORDER BY l.created_at`, [pa.id]);
  const disb = await db.q(
    `SELECT d.*, pr.name AS period_name FROM disbursement d JOIN program_period pr ON pr.id = d.period_id
     WHERE d.participant_id = $1 ORDER BY pr.sort`, [pa.id]);
  const cls = pc.classes.find((c) => c.id === pa.class_id);
  const lmForClass = cls ? program.leadMeasures.filter((lm) => lm.params[cls.id]) : [];
  const step = program.steps.find((s) => s.id === pa.current_step_id);
  const canEdit = pa.status === 'returned' && CAN_REGISTER.includes(req.session.user.role);
  const canAct = pa.status === 'in_review' && step && step.role === req.session.user.role;
  res.render('registration/detail', {
    title: pa.store_name, pa, program, pc, cls, lmForClass, logs, disb, step, canEdit, canAct,
    fields: engine.fieldsFor(program, 'registration', pc.id),
  });
});

router.get('/participant/:id/edit', requireRole(...CAN_REGISTER), async (req, res) => {
  const ctx = await loadParticipant(req, res); if (!ctx) return;
  const { pa, program, pc } = ctx;
  if (pa.status !== 'returned') { flash(req, 'warning', 'Hanya data yang dikembalikan yang bisa direvisi.'); return res.redirect(`/registration/participant/${pa.id}`); }
  const sc = await storeContext(program, pc, pa.customer_id, req.session.user);
  res.render('registration/form', {
    title: `Revisi ${pa.store_name}`, program, pc, ...sc,
    fields: engine.fieldsFor(program, 'registration', pc.id),
    values: pa.data, growth: pa.growth_pct, errors: [], isOpen: true, participant: pa,
  });
});

router.post('/participant/:id/edit', requireRole(...CAN_REGISTER), async (req, res) => {
  const ctx = await loadParticipant(req, res); if (!ctx) return;
  const { pa, program, pc } = ctx;
  if (pa.status !== 'returned') return res.redirect(`/registration/participant/${pa.id}`);
  const sc = await storeContext(program, pc, pa.customer_id, req.session.user);
  const fields = engine.fieldsFor(program, 'registration', pc.id);
  const { values, errors } = readFieldValues(fields, req.body);
  const growth = toNum(req.body.growth);
  // Kelas & baseline dikunci sesuai saat pendaftaran
  const cls = pc.classes.find((c) => c.id === pa.class_id) || sc.elig.cls;
  const gErr = cls ? engine.validateGrowth(pc, cls, growth) : 'Kelas tidak ditemukan';
  if (gErr) errors.push(gErr);
  if (errors.length) {
    return res.status(400).render('registration/form', {
      title: `Revisi ${pa.store_name}`, program, pc, ...sc, fields, values: req.body, growth: req.body.growth,
      errors, isOpen: true, participant: pa, rawValues: true,
    });
  }
  const target = engine.computeTarget(pa.baseline, growth, program.programMonths);
  const init = workflow.initialState(program, 'registration');
  await db.tx(async (tx) => {
    await tx.q(
      `UPDATE participant SET growth_pct=$2, target_monthly=$3, target_period=$4, data=$5, status=$6, current_step_id=$7, updated_at=now()
       WHERE id=$1`, [pa.id, growth, target.monthly, target.period, values, init.status, init.current_step_id]);
    await workflow.log(tx, 'participant', pa.id, null, 'resubmit', req.body.note || null, req.session.user.id);
  });
  flash(req, 'success', 'Revisi dikirim ulang.');
  res.redirect(`/registration/participant/${pa.id}`);
});

module.exports = router;
