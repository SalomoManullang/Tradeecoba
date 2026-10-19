// Modul "Setup Program" - hanya Admin HO.
// Semua parameter program (kelas, baseline, growth, JTBD, kolom CBD, pencairan, alur approval)
// diatur dari sini, tidak ada lagi angka yang di-hardcode per tahun.
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const engine = require('../lib/engine');
const formula = require('../lib/formula');
const { toNum } = require('../lib/num');
const { requireRole, flash } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireRole('ADMIN_HO'));

// ---------------------------------------------------------------- utils
function arr(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function slugKey(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
}

function shiftYear(dateStr, years) {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const day = m === 2 && d === 29 ? 28 : d;
  return `${y + years}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

async function masters() {
  const [channels, brands] = await Promise.all([
    db.q('SELECT * FROM channel WHERE is_active ORDER BY sort'),
    db.q('SELECT * FROM brand WHERE is_active ORDER BY sort'),
  ]);
  return { channels, brands };
}

// Validasi kelengkapan program sebelum diaktifkan
function checklist(program) {
  const items = [];
  const add = (ok, text, level = 'error') => items.push({ ok, text, level });

  add(!!program.registration_start && !!program.registration_end, 'Periode pendaftaran diisi');
  add(program.program_start <= program.program_end, 'Periode program valid');
  add(program.baseline_start <= program.baseline_end, 'Periode baseline valid');
  add(program.channels.length > 0, 'Minimal 1 channel');

  for (const ch of program.channels) {
    add(ch.brand_codes.length > 0, `[${ch.channel_name}] Brand dipilih`);
    add(ch.classes.length > 0, `[${ch.channel_name}] Minimal 1 kelas`);
    const sorted = [...ch.classes].sort((a, b) => a.baseline_min - b.baseline_min);
    let overlap = false;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      if (prev.baseline_max === null || prev.baseline_max > sorted[i].baseline_min) overlap = true;
    }
    add(!overlap, `[${ch.channel_name}] Range baseline kelas tidak tumpang tindih`);
    add(ch.status === 'complete', `[${ch.channel_name}] Ditandai selesai`, 'warning');
    const hasJtbd = program.components.some((c) => c.is_active && c.comp_type === 'jtbd' &&
      (c.program_channel_id === null || c.program_channel_id === ch.id));
    if (hasJtbd) {
      const covered = ch.classes.filter((cl) => program.leadMeasures.some((lm) => lm.params[cl.id]));
      add(covered.length === ch.classes.length, `[${ch.channel_name}] Parameter JTBD terisi untuk semua kelas`, 'warning');
    }
  }

  add(program.periods.length > 0, 'Minimal 1 periode pencairan');
  for (const p of program.periods) {
    add(p.achieve_start >= program.program_start && p.achieve_end <= program.program_end,
      `Periode "${p.name}" berada di dalam periode program`);
  }
  add(program.components.some((c) => c.is_active), 'Minimal 1 komponen pencairan aktif');
  for (const c of program.components.filter((x) => x.comp_type === 'formula' && x.is_active)) {
    const err = formula.validate(c.config.expression, engine.FORMULA_VARS.concat(program.fields.map((f) => f.key)));
    add(!err, `Rumus "${c.name}" valid${err ? ': ' + err : ''}`);
  }
  add(program.steps.some((s) => s.phase === 'disbursement'), 'Alur approval pencairan diisi (tanpa tahapan = langsung cair)', 'warning');
  return items;
}

// ---------------------------------------------------------------- load program
router.param('id', async (req, res, next, id) => {
  const program = await engine.loadProgram(Number(id));
  if (!program || program.year !== req.session.year) {
    return res.status(404).render('error', { title: 'Program tidak ditemukan', message: 'Program tidak ada di tahun yang dipilih.' });
  }
  req.program = program;
  res.locals.program = program;
  res.locals.participantCount = (await db.one('SELECT COUNT(*) AS n FROM participant WHERE program_id = $1', [program.id])).n;
  next();
});

// ---------------------------------------------------------------- list & create
router.get('/', async (req, res) => {
  const programs = await db.q(
    `SELECT p.*, (SELECT COUNT(*) FROM program_channel pc WHERE pc.program_id = p.id) AS channel_count,
       (SELECT COUNT(*) FROM participant pa WHERE pa.program_id = p.id) AS participant_count
     FROM program p WHERE p.year = $1 ORDER BY p.created_at`, [req.session.year]);
  const others = await db.q(
    `SELECT p.id, p.name, p.code, p.year FROM program p WHERE p.year <> $1 ORDER BY p.year DESC, p.name`,
    [req.session.year]);
  const years = await db.q('SELECT year FROM program_year ORDER BY year DESC');
  res.render('setup/index', { title: 'Setup Program', programs, others, years });
});

router.get('/new', (req, res) => {
  const y = req.session.year;
  res.render('setup/general', {
    title: 'Program Baru',
    program: null,
    form: {
      code: '', name: '', description: '', basis: 'sellout', baseline_method: 'avg_monthly',
      baseline_start: `${y - 1}-01-01`, baseline_end: `${y - 1}-12-31`,
      program_start: `${y}-01-01`, program_end: `${y}-12-31`,
      registration_start: `${y - 1}-11-01`, registration_end: `${y}-02-28`,
      tax_rate_npwp: 2, tax_rate_non_npwp: 4, disbursement_submitter_role: 'ADMIN_DC',
      demo_open_windows: false, use_template: true,
    },
  });
});

function readGeneral(body) {
  return {
    code: String(body.code || '').trim().toUpperCase(),
    name: String(body.name || '').trim(),
    description: body.description || null,
    basis: body.basis === 'sellin' ? 'sellin' : 'sellout',
    baseline_method: body.baseline_method === 'avg_active_month' ? 'avg_active_month' : 'avg_monthly',
    baseline_start: body.baseline_start,
    baseline_end: body.baseline_end,
    program_start: body.program_start,
    program_end: body.program_end,
    registration_start: body.registration_start || null,
    registration_end: body.registration_end || null,
    tax_rate_npwp: toNum(body.tax_rate_npwp) ?? 0,
    tax_rate_non_npwp: toNum(body.tax_rate_non_npwp) ?? 0,
    disbursement_submitter_role: ['ADMIN_DC', 'CBD'].includes(body.disbursement_submitter_role) ? body.disbursement_submitter_role : 'ADMIN_DC',
    demo_open_windows: body.demo_open_windows === 'on',
    use_template: body.use_template === 'on',
  };
}

function generalErrors(f) {
  const errs = [];
  if (!/^[A-Z0-9_]{2,20}$/.test(f.code)) errs.push('Kode program 2-20 karakter (huruf besar, angka, _).');
  if (!f.name) errs.push('Nama program wajib diisi.');
  for (const k of ['baseline_start', 'baseline_end', 'program_start', 'program_end']) if (!f[k]) errs.push(`Tanggal ${k} wajib diisi.`);
  if (f.baseline_start > f.baseline_end) errs.push('Periode baseline: tanggal mulai > tanggal selesai.');
  if (f.program_start > f.program_end) errs.push('Periode program: tanggal mulai > tanggal selesai.');
  return errs;
}

router.post('/new', async (req, res) => {
  const f = readGeneral(req.body);
  const errs = generalErrors(f);
  if (errs.length) return res.render('setup/general', { title: 'Program Baru', program: null, form: f, errors: errs });
  const exists = await db.one('SELECT 1 FROM program WHERE year = $1 AND code = $2', [req.session.year, f.code]);
  if (exists) return res.render('setup/general', { title: 'Program Baru', program: null, form: f, errors: ['Kode program sudah dipakai di tahun ini.'] });

  const id = await db.tx(async (tx) => {
    const p = await tx.one(
      `INSERT INTO program (year, code, name, description, basis, baseline_method, baseline_start, baseline_end,
         program_start, program_end, registration_start, registration_end, tax_rate_npwp, tax_rate_non_npwp,
         disbursement_submitter_role, settings, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [req.session.year, f.code, f.name, f.description, f.basis, f.baseline_method, f.baseline_start, f.baseline_end,
        f.program_start, f.program_end, f.registration_start, f.registration_end, f.tax_rate_npwp, f.tax_rate_non_npwp,
        f.disbursement_submitter_role, { demo_open_windows: f.demo_open_windows }, req.session.user.id]
    );
    if (f.use_template) {
      // Template awal yang bisa diubah: 2 semester, 2 komponen, alur approval standar
      const y1 = f.program_start.slice(0, 4);
      const y2 = f.program_end.slice(0, 4);
      await tx.q(
        `INSERT INTO program_period (program_id, name, achieve_start, achieve_end, claim_start, claim_end, sort) VALUES
         ($1,'Semester 1',$2,$3,$4,$5,1), ($1,'Semester 2',$6,$7,$8,$9,2)`,
        [p.id, `${y1}-01-01`, `${y1}-06-30`, `${y1}-07-01`, `${y1}-08-31`,
          `${y2}-07-01`, `${y2}-12-31`, `${Number(y2) + 1}-01-01`, `${Number(y2) + 1}-02-28`]);
      await tx.q(
        `INSERT INTO program_component (program_id, name, comp_type, config, sort) VALUES
         ($1, 'Rebate Growth', 'growth_rebate', $2, 1),
         ($1, 'Reward JTBD', 'jtbd', $3, 2)`,
        [p.id,
          { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] },
          { base: 'actual', min_achievement: 90 }]);
      await tx.q(
        `INSERT INTO program_step (program_id, phase, name, role, sort) VALUES
         ($1,'registration','Approval RSM','RSM',1),
         ($1,'disbursement','Cek Berkas & NPWP','FINANCE',1),
         ($1,'disbursement','Approval HO','ADMIN_HO',2)`, [p.id]);
    }
    return p.id;
  });
  flash(req, 'success', 'Program dibuat. Lanjutkan dengan menambahkan channel.');
  res.redirect(`/setup/${id}/channels`);
});

// Duplikat program (mis. dari tahun lalu) ke tahun aktif - dipakai dari halaman list
router.post('/clone', async (req, res) => {
  const srcId = Number(req.body.source_id);
  const targetYear = req.session.year;
  const code = String(req.body.code || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  const src = await engine.loadProgram(srcId);
  if (!src) { flash(req, 'danger', 'Program sumber tidak ditemukan'); return res.redirect('/setup'); }
  if (!/^[A-Z0-9_]{2,20}$/.test(code) || !name) { flash(req, 'danger', 'Kode & nama program baru wajib diisi'); return res.redirect('/setup'); }
  if (await db.one('SELECT 1 FROM program WHERE year = $1 AND code = $2', [targetYear, code])) {
    flash(req, 'danger', 'Kode program sudah dipakai di tahun ini'); return res.redirect('/setup');
  }
  const dy = targetYear - src.year;
  const newId = await db.tx(async (tx) => {
    const p = await tx.one(
      `INSERT INTO program (year, code, name, description, basis, baseline_method, baseline_start, baseline_end,
         program_start, program_end, registration_start, registration_end, tax_rate_npwp, tax_rate_non_npwp,
         disbursement_submitter_role, settings, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id`,
      [targetYear, code, name, src.description, src.basis, src.baseline_method,
        shiftYear(src.baseline_start, dy), shiftYear(src.baseline_end, dy), shiftYear(src.program_start, dy), shiftYear(src.program_end, dy),
        shiftYear(src.registration_start, dy), shiftYear(src.registration_end, dy), src.tax_rate_npwp, src.tax_rate_non_npwp,
        src.disbursement_submitter_role, src.settings, req.session.user.id]);
    const pcMap = {}; const clMap = {}; const lmMap = {}; const perMap = {};
    for (const ch of src.channels) {
      const n = await tx.one(
        `INSERT INTO program_channel (program_id, channel_code, brand_codes, min_baseline, min_sellout_ratio, min_active_months, growth_editable, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'draft',$8) RETURNING id`,
        [p.id, ch.channel_code, ch.brand_codes, ch.min_baseline, ch.min_sellout_ratio, ch.min_active_months, ch.growth_editable, ch.notes]);
      pcMap[ch.id] = n.id;
      for (const cl of ch.classes) {
        const c = await tx.one(
          `INSERT INTO program_class (program_channel_id, name, baseline_min, baseline_max, min_growth, max_growth, rebate_pct, sort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [n.id, cl.name, cl.baseline_min, cl.baseline_max, cl.min_growth, cl.max_growth, cl.rebate_pct, cl.sort]);
        clMap[cl.id] = c.id;
      }
    }
    for (const pil of src.pillars) {
      const np = await tx.one('INSERT INTO program_pillar (program_id, name, description, sort) VALUES ($1,$2,$3,$4) RETURNING id',
        [p.id, pil.name, pil.description, pil.sort]);
      for (const j of pil.jtbds) {
        const nj = await tx.one('INSERT INTO program_jtbd (pillar_id, name, sort) VALUES ($1,$2,$3) RETURNING id', [np.id, j.name, j.sort]);
        for (const lm of j.lead_measures) {
          const nl = await tx.one('INSERT INTO program_lead_measure (jtbd_id, name, unit, input_type, sort) VALUES ($1,$2,$3,$4,$5) RETURNING id',
            [nj.id, lm.name, lm.unit, lm.input_type, lm.sort]);
          lmMap[lm.id] = nl.id;
          for (const prm of Object.values(lm.params)) {
            await tx.q('INSERT INTO program_lm_param (lead_measure_id, program_class_id, target_value, reward_pct, reward_nominal) VALUES ($1,$2,$3,$4,$5)',
              [nl.id, clMap[prm.program_class_id], prm.target_value, prm.reward_pct, prm.reward_nominal]);
          }
        }
      }
    }
    for (const f of src.fields) {
      await tx.q(
        `INSERT INTO program_field (program_id, program_channel_id, stage, key, label, field_type, required, options, help, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [p.id, f.program_channel_id ? pcMap[f.program_channel_id] : null, f.stage, f.key, f.label, f.field_type, f.required, f.options, f.help, f.sort]);
    }
    for (const per of src.periods) {
      const np = await tx.one(
        `INSERT INTO program_period (program_id, name, achieve_start, achieve_end, claim_start, claim_end, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [p.id, per.name, shiftYear(per.achieve_start, dy), shiftYear(per.achieve_end, dy), shiftYear(per.claim_start, dy), shiftYear(per.claim_end, dy), per.sort]);
      perMap[per.id] = np.id;
    }
    for (const c of src.components) {
      const cfg = Object.assign({}, c.config);
      await tx.q(
        `INSERT INTO program_component (program_id, program_channel_id, name, comp_type, config, period_ids, is_active, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [p.id, c.program_channel_id ? pcMap[c.program_channel_id] : null, c.name, c.comp_type, cfg,
          c.period_ids ? c.period_ids.map((x) => perMap[x]).filter(Boolean) : null, c.is_active, c.sort]);
    }
    for (const s of src.steps) {
      await tx.q('INSERT INTO program_step (program_id, phase, name, role, sort) VALUES ($1,$2,$3,$4,$5)',
        [p.id, s.phase, s.name, s.role, s.sort]);
    }
    return p.id;
  });
  flash(req, 'success', `Program "${src.name}" (${src.year}) berhasil diduplikat. Silakan sesuaikan angkanya untuk tahun ${targetYear}.`);
  res.redirect(`/setup/${newId}/general`);
});

// ---------------------------------------------------------------- general
router.get('/:id', (req, res) => res.redirect(`/setup/${req.program.id}/general`));

router.get('/:id/general', (req, res) => {
  const p = req.program;
  res.render('setup/general', {
    title: 'Umum', tab: 'general',
    form: Object.assign({}, p, { demo_open_windows: !!(p.settings || {}).demo_open_windows }),
  });
});

router.post('/:id/general', async (req, res) => {
  const f = readGeneral(req.body);
  f.code = req.program.code; // kode tidak diubah
  const errs = generalErrors(f);
  if (errs.length) return res.render('setup/general', { title: 'Umum', tab: 'general', form: f, errors: errs });
  const settings = Object.assign({}, req.program.settings, { demo_open_windows: f.demo_open_windows });
  await db.q(
    `UPDATE program SET name=$2, description=$3, basis=$4, baseline_method=$5, baseline_start=$6, baseline_end=$7,
       program_start=$8, program_end=$9, registration_start=$10, registration_end=$11, tax_rate_npwp=$12,
       tax_rate_non_npwp=$13, disbursement_submitter_role=$14, settings=$15, updated_at=now() WHERE id=$1`,
    [req.program.id, f.name, f.description, f.basis, f.baseline_method, f.baseline_start, f.baseline_end,
      f.program_start, f.program_end, f.registration_start, f.registration_end, f.tax_rate_npwp, f.tax_rate_non_npwp,
      f.disbursement_submitter_role, settings]);
  flash(req, 'success', 'Informasi umum disimpan.');
  res.redirect(`/setup/${req.program.id}/general`);
});

// ---------------------------------------------------------------- channels
router.get('/:id/channels', async (req, res) => {
  const m = await masters();
  res.render('setup/channels', { title: 'Channel & Kelas', tab: 'channels', ...m });
});

router.post('/:id/channels', async (req, res) => {
  const code = req.body.channel_code;
  const m = await masters();
  if (!m.channels.find((c) => c.code === code)) { flash(req, 'danger', 'Channel tidak valid'); return res.redirect(`/setup/${req.program.id}/channels`); }
  const exists = req.program.channels.find((c) => c.channel_code === code);
  if (exists) return res.redirect(`/setup/${req.program.id}/channels/${exists.id}`);
  const pc = await db.one(
    'INSERT INTO program_channel (program_id, channel_code, brand_codes) VALUES ($1,$2,$3) RETURNING id',
    [req.program.id, code, m.brands.map((b) => b.code)]);
  flash(req, 'success', 'Channel ditambahkan. Isi kelas & aturan eligibility channel ini.');
  res.redirect(`/setup/${req.program.id}/channels/${pc.id}`);
});

function findChannel(req, res) {
  const pc = req.program.channels.find((c) => c.id === Number(req.params.pcId));
  if (!pc) res.status(404).render('error', { title: 'Channel tidak ditemukan', message: '' });
  return pc;
}

router.get('/:id/channels/:pcId', async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const m = await masters();

  // Preview eligibility memakai data sell out nyata untuk periode baseline
  const stores = await db.q('SELECT customer_id FROM store WHERE channel_code = $1', [pc.channel_code]);
  const agg = await engine.salesAgg({
    customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes,
    start: req.program.baseline_start, end: req.program.baseline_end,
  });
  const dist = {}; let eligible = 0; let withData = 0;
  for (const s of stores) {
    const a = agg.get(s.customer_id);
    if (!a) continue;
    withData++;
    const base = engine.baselineOf(req.program, a);
    const e = engine.eligibility(pc, base, engine.sellRatio(a), a.activeMonths);
    if (e.eligible) { eligible++; dist[e.cls.name] = (dist[e.cls.name] || 0) + 1; }
  }
  res.render('setup/channel', {
    title: pc.channel_name, tab: 'channels', pc, ...m,
    preview: { total: stores.length, withData, eligible, dist },
  });
});

router.post('/:id/channels/:pcId', async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const b = req.body;
  const names = arr(b.class_name);
  const classes = names.map((name, i) => ({
    id: toNum(arr(b.class_id)[i]),
    name: String(name).trim(),
    baseline_min: toNum(arr(b.baseline_min)[i]),
    baseline_max: toNum(arr(b.baseline_max)[i]),
    min_growth: toNum(arr(b.min_growth)[i]),
    max_growth: toNum(arr(b.max_growth)[i]),
    rebate_pct: toNum(arr(b.rebate_pct)[i]) ?? 0,
  })).filter((c) => c.name);

  const errs = [];
  for (const c of classes) {
    if (c.baseline_min === null) errs.push(`Kelas ${c.name}: baseline minimal wajib diisi`);
    if (c.min_growth === null) errs.push(`Kelas ${c.name}: growth minimal wajib diisi`);
    if (c.baseline_max !== null && c.baseline_max <= c.baseline_min) errs.push(`Kelas ${c.name}: baseline maksimal harus > minimal`);
  }
  if (new Set(classes.map((c) => c.name)).size !== classes.length) errs.push('Nama kelas tidak boleh sama');
  if (errs.length) { flash(req, 'danger', errs.join('<br>')); return res.redirect(`/setup/${req.program.id}/channels/${pc.id}`); }

  await db.tx(async (tx) => {
    await tx.q(
      `UPDATE program_channel SET brand_codes=$2, min_baseline=$3, min_sellout_ratio=$4, min_active_months=$5,
         growth_editable=$6, status=$7, notes=$8 WHERE id=$1`,
      [pc.id, arr(b.brand_codes), toNum(b.min_baseline), toNum(b.min_sellout_ratio), toNum(b.min_active_months),
        b.growth_editable === 'on', b.status === 'complete' ? 'complete' : 'draft', b.notes || null]);
    const keep = [];
    for (const [i, c] of classes.entries()) {
      if (c.id && pc.classes.find((x) => x.id === c.id)) {
        await tx.q(
          `UPDATE program_class SET name=$2, baseline_min=$3, baseline_max=$4, min_growth=$5, max_growth=$6, rebate_pct=$7, sort=$8 WHERE id=$1`,
          [c.id, c.name, c.baseline_min, c.baseline_max, c.min_growth, c.max_growth, c.rebate_pct, i]);
        keep.push(c.id);
      } else {
        const n = await tx.one(
          `INSERT INTO program_class (program_channel_id, name, baseline_min, baseline_max, min_growth, max_growth, rebate_pct, sort)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [pc.id, c.name, c.baseline_min, c.baseline_max, c.min_growth, c.max_growth, c.rebate_pct, i]);
        keep.push(n.id);
      }
    }
    const removed = pc.classes.filter((c) => !keep.includes(c.id)).map((c) => c.id);
    if (removed.length) {
      const used = await tx.one('SELECT COUNT(*) AS n FROM participant WHERE class_id = ANY($1)', [removed]);
      if (used.n > 0) throw new Error('Kelas yang sudah dipakai peserta tidak bisa dihapus.');
      await tx.q('DELETE FROM program_class WHERE id = ANY($1)', [removed]);
    }
  });
  flash(req, 'success', `Channel ${pc.channel_name} disimpan${b.status === 'complete' ? ' & ditandai selesai' : ''}.`);
  res.redirect(`/setup/${req.program.id}/channels/${pc.id}`);
});

router.post('/:id/channels/:pcId/delete', async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const used = await db.one('SELECT COUNT(*) AS n FROM participant WHERE program_channel_id = $1', [pc.id]);
  if (used.n > 0) { flash(req, 'danger', 'Channel sudah punya peserta, tidak bisa dihapus.'); return res.redirect(`/setup/${req.program.id}/channels`); }
  await db.q('DELETE FROM program_channel WHERE id = $1', [pc.id]);
  flash(req, 'success', 'Channel dihapus.');
  res.redirect(`/setup/${req.program.id}/channels`);
});

// ---------------------------------------------------------------- JTBD matrix
router.get('/:id/jtbd', (req, res) => {
  const p = req.program;
  const pcId = Number(req.query.channel) || (p.channels[0] && p.channels[0].id);
  const pc = p.channels.find((c) => c.id === pcId) || null;
  res.render('setup/jtbd', { title: 'Matriks JTBD', tab: 'jtbd', pc });
});

// Simpan struktur Pilar -> JTBD -> Lead Measure (dikirim sebagai JSON dari editor)
router.post('/:id/jtbd/structure', async (req, res) => {
  let tree;
  try { tree = JSON.parse(req.body.structure || '[]'); } catch { tree = null; }
  if (!Array.isArray(tree)) { flash(req, 'danger', 'Data struktur tidak valid'); return res.redirect(`/setup/${req.program.id}/jtbd`); }
  const p = req.program;
  const oldPillars = p.pillars.map((x) => x.id);
  const oldJtbds = p.pillars.flatMap((x) => x.jtbds.map((j) => j.id));
  const oldLms = p.leadMeasures.map((x) => x.id);
  await db.tx(async (tx) => {
    const kP = []; const kJ = []; const kL = [];
    for (const [pi, pil] of tree.entries()) {
      if (!String(pil.name || '').trim()) continue;
      let pid = oldPillars.includes(Number(pil.id)) ? Number(pil.id) : null;
      if (pid) await tx.q('UPDATE program_pillar SET name=$2, description=$3, sort=$4 WHERE id=$1', [pid, pil.name.trim(), pil.description || null, pi]);
      else pid = (await tx.one('INSERT INTO program_pillar (program_id, name, description, sort) VALUES ($1,$2,$3,$4) RETURNING id', [p.id, pil.name.trim(), pil.description || null, pi])).id;
      kP.push(pid);
      for (const [ji, j] of (pil.jtbds || []).entries()) {
        if (!String(j.name || '').trim()) continue;
        let jid = oldJtbds.includes(Number(j.id)) ? Number(j.id) : null;
        if (jid) await tx.q('UPDATE program_jtbd SET pillar_id=$2, name=$3, sort=$4 WHERE id=$1', [jid, pid, j.name.trim(), ji]);
        else jid = (await tx.one('INSERT INTO program_jtbd (pillar_id, name, sort) VALUES ($1,$2,$3) RETURNING id', [pid, j.name.trim(), ji])).id;
        kJ.push(jid);
        for (const [li, lm] of (j.lead_measures || []).entries()) {
          if (!String(lm.name || '').trim()) continue;
          const type = ['number', 'yesno', 'text'].includes(lm.input_type) ? lm.input_type : 'number';
          let lid = oldLms.includes(Number(lm.id)) ? Number(lm.id) : null;
          if (lid) await tx.q('UPDATE program_lead_measure SET jtbd_id=$2, name=$3, unit=$4, input_type=$5, sort=$6 WHERE id=$1', [lid, jid, lm.name.trim(), lm.unit || null, type, li]);
          else lid = (await tx.one('INSERT INTO program_lead_measure (jtbd_id, name, unit, input_type, sort) VALUES ($1,$2,$3,$4,$5) RETURNING id', [jid, lm.name.trim(), lm.unit || null, type, li])).id;
          kL.push(lid);
        }
      }
    }
    // Hapus yang tidak ada lagi (bottom-up supaya relasi pindah induk aman)
    const delL = oldLms.filter((x) => !kL.includes(x));
    const delJ = oldJtbds.filter((x) => !kJ.includes(x));
    const delP = oldPillars.filter((x) => !kP.includes(x));
    if (delL.length) await tx.q('DELETE FROM program_lead_measure WHERE id = ANY($1)', [delL]);
    if (delJ.length) await tx.q('DELETE FROM program_jtbd WHERE id = ANY($1)', [delJ]);
    if (delP.length) await tx.q('DELETE FROM program_pillar WHERE id = ANY($1)', [delP]);
  });
  flash(req, 'success', 'Struktur pilar / JTBD / lead measure disimpan.');
  res.redirect(`/setup/${p.id}/jtbd${req.query.channel ? '?channel=' + req.query.channel : ''}`);
});

// Simpan parameter per kelas untuk satu channel
router.post('/:id/jtbd/params/:pcId', async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const b = req.body;
  await db.tx(async (tx) => {
    for (const lm of req.program.leadMeasures) {
      for (const cl of pc.classes) {
        const k = `${lm.id}_${cl.id}`;
        const target = String(b[`t_${k}`] ?? '').trim();
        const rpct = toNum(b[`r_${k}`]) ?? 0;
        const rnom = toNum(b[`n_${k}`]) ?? 0;
        if (target === '' && !rpct && !rnom) {
          await tx.q('DELETE FROM program_lm_param WHERE lead_measure_id=$1 AND program_class_id=$2', [lm.id, cl.id]);
        } else {
          await tx.q(
            `INSERT INTO program_lm_param (lead_measure_id, program_class_id, target_value, reward_pct, reward_nominal)
             VALUES ($1,$2,$3,$4,$5) ON CONFLICT (lead_measure_id, program_class_id)
             DO UPDATE SET target_value=EXCLUDED.target_value, reward_pct=EXCLUDED.reward_pct, reward_nominal=EXCLUDED.reward_nominal`,
            [lm.id, cl.id, target, rpct, rnom]);
        }
      }
    }
  });
  flash(req, 'success', `Parameter JTBD channel ${pc.channel_name} disimpan.`);
  res.redirect(`/setup/${req.program.id}/jtbd?channel=${pc.id}`);
});

const MATRIX_COLUMNS = ['Pilar', 'JTBD', 'Lead Measure', 'Satuan', 'Tipe Input (number/yesno/text)', 'Kelas', 'Parameter / Target', 'Reward %', 'Reward Nominal'];

router.get('/:id/jtbd/template/:pcId', async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Matriks JTBD');
  ws.addRow(MATRIX_COLUMNS).font = { bold: true };
  const lms = req.program.leadMeasures;
  if (lms.length) {
    for (const lm of lms) {
      for (const cl of pc.classes) {
        const prm = lm.params[cl.id];
        ws.addRow([lm.pillar_name, lm.jtbd_name, lm.name, lm.unit, lm.input_type, cl.name,
          prm ? prm.target_value : '', prm ? prm.reward_pct : '', prm ? prm.reward_nominal : '']);
      }
    }
  } else {
    for (const cl of pc.classes) ws.addRow(['Contoh Pilar', 'Contoh JTBD', 'Live streaming', 'jam/minggu', 'number', cl.name, '4', '0.5', '0']);
  }
  ws.columns.forEach((c, i) => { c.width = [22, 26, 32, 14, 18, 8, 18, 10, 14][i]; });
  const info = wb.addWorksheet('Petunjuk');
  info.addRows([
    ['Petunjuk upload matriks JTBD'],
    ['1 baris = 1 lead measure untuk 1 kelas.'],
    [`Nama kelas harus sama dengan kelas di channel ${pc.channel_name}: ${pc.classes.map((c) => c.name).join(', ')}`],
    ['Tipe input: number (target angka minimal), yesno (Ya/Tidak), text (bukti/teks bebas).'],
    ['Reward % dihitung dari aktual sell out periode; Reward Nominal = rupiah tetap.'],
    ['Pilar / JTBD / Lead Measure baru otomatis dibuat; yang sudah ada dicocokkan berdasarkan nama.'],
  ]);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="matriks_jtbd_${req.program.code}_${pc.channel_code}.xlsx"`);
  await wb.xlsx.write(res);
  res.end();
});

async function readSheetRows(file) {
  const wb = new ExcelJS.Workbook();
  if (/\.csv$/i.test(file.originalname)) {
    const { Readable } = require('stream');
    await wb.csv.read(Readable.from(file.buffer));
  } else {
    await wb.xlsx.load(file.buffer);
  }
  const ws = wb.worksheets[0];
  const rows = [];
  ws.eachRow((row, i) => {
    if (i === 1) return;
    const vals = [];
    for (let c = 1; c <= 9; c++) {
      let v = row.getCell(c).value;
      if (v && typeof v === 'object') v = v.result ?? v.text ?? v.richText?.map((t) => t.text).join('') ?? '';
      vals.push(v === null || v === undefined ? '' : String(v).trim());
    }
    if (vals.some((v) => v !== '')) rows.push({ line: i, vals });
  });
  return rows;
}

router.post('/:id/jtbd/upload/:pcId', upload.single('file'), async (req, res) => {
  const pc = findChannel(req, res); if (!pc) return;
  const back = `/setup/${req.program.id}/jtbd?channel=${pc.id}`;
  if (!req.file) { flash(req, 'danger', 'File belum dipilih'); return res.redirect(back); }
  let rows;
  try { rows = await readSheetRows(req.file); } catch (e) { flash(req, 'danger', 'File tidak bisa dibaca: ' + e.message); return res.redirect(back); }

  const classByName = Object.fromEntries(pc.classes.map((c) => [c.name.toLowerCase(), c]));
  const errs = [];
  for (const r of rows) {
    const [pil, jt, lm, , type, kelas] = r.vals;
    if (!pil || !jt || !lm || !kelas) errs.push(`Baris ${r.line}: Pilar, JTBD, Lead Measure, Kelas wajib diisi`);
    else if (!classByName[kelas.toLowerCase()]) errs.push(`Baris ${r.line}: kelas "${kelas}" tidak ada di channel ${pc.channel_name}`);
    if (type && !['number', 'yesno', 'text'].includes(type.toLowerCase())) errs.push(`Baris ${r.line}: tipe input "${type}" tidak dikenal`);
  }
  if (!rows.length) errs.push('File kosong');
  if (errs.length) { flash(req, 'danger', errs.slice(0, 10).join('<br>') + (errs.length > 10 ? `<br>... dan ${errs.length - 10} error lain` : '')); return res.redirect(back); }

  let created = 0; let params = 0;
  await db.tx(async (tx) => {
    const pillars = await tx.q('SELECT * FROM program_pillar WHERE program_id = $1', [req.program.id]);
    const jtbds = await tx.q('SELECT j.* FROM program_jtbd j JOIN program_pillar p ON p.id = j.pillar_id WHERE p.program_id = $1', [req.program.id]);
    const lms = await tx.q(`SELECT l.* FROM program_lead_measure l JOIN program_jtbd j ON j.id = l.jtbd_id
                            JOIN program_pillar p ON p.id = j.pillar_id WHERE p.program_id = $1`, [req.program.id]);
    const key = (s) => String(s).trim().toLowerCase();
    for (const r of rows) {
      const [pilName, jtName, lmName, unit, type, kelas, target, rpct, rnom] = r.vals;
      let pil = pillars.find((x) => key(x.name) === key(pilName));
      if (!pil) { pil = await tx.one('INSERT INTO program_pillar (program_id, name, sort) VALUES ($1,$2,$3) RETURNING *', [req.program.id, pilName, pillars.length]); pillars.push(pil); created++; }
      let jt = jtbds.find((x) => x.pillar_id === pil.id && key(x.name) === key(jtName));
      if (!jt) { jt = await tx.one('INSERT INTO program_jtbd (pillar_id, name, sort) VALUES ($1,$2,$3) RETURNING *', [pil.id, jtName, jtbds.length]); jtbds.push(jt); created++; }
      let lm = lms.find((x) => x.jtbd_id === jt.id && key(x.name) === key(lmName));
      const t = (type || 'number').toLowerCase();
      if (!lm) { lm = await tx.one('INSERT INTO program_lead_measure (jtbd_id, name, unit, input_type, sort) VALUES ($1,$2,$3,$4,$5) RETURNING *', [jt.id, lmName, unit || null, t, lms.length]); lms.push(lm); created++; }
      else await tx.q('UPDATE program_lead_measure SET unit = COALESCE($2, unit), input_type = $3 WHERE id = $1', [lm.id, unit || null, t]);
      const cl = classByName[kelas.toLowerCase()];
      await tx.q(
        `INSERT INTO program_lm_param (lead_measure_id, program_class_id, target_value, reward_pct, reward_nominal)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (lead_measure_id, program_class_id)
         DO UPDATE SET target_value=EXCLUDED.target_value, reward_pct=EXCLUDED.reward_pct, reward_nominal=EXCLUDED.reward_nominal`,
        [lm.id, cl.id, target, toNum(rpct) ?? 0, toNum(rnom) ?? 0]);
      params++;
    }
  });
  flash(req, 'success', `Upload berhasil: ${params} parameter disimpan, ${created} item struktur baru dibuat.`);
  res.redirect(back);
});

// ---------------------------------------------------------------- dynamic fields
router.get('/:id/fields', async (req, res) => {
  const m = await masters();
  const edit = req.query.edit ? req.program.fields.find((f) => f.id === Number(req.query.edit)) : null;
  res.render('setup/fields', { title: 'Kolom Input', tab: 'fields', edit, ...m });
});

router.post('/:id/fields', async (req, res) => {
  const b = req.body;
  const back = `/setup/${req.program.id}/fields`;
  const label = String(b.label || '').trim();
  const key = slugKey(b.key || label);
  const type = b.field_type;
  const stage = b.stage === 'disbursement' ? 'disbursement' : 'registration';
  const pcId = toNum(b.program_channel_id);
  const options = type === 'select' ? String(b.options || '').split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean) : null;
  const reserved = engine.FORMULA_VARS.concat(['growth_pct', 'customer_id']);
  if (!label || !key) { flash(req, 'danger', 'Label wajib diisi'); return res.redirect(back); }
  if (reserved.includes(key)) { flash(req, 'danger', `Key "${key}" dipakai sistem, gunakan key lain`); return res.redirect(back); }
  if (type === 'select' && !options.length) { flash(req, 'danger', 'Isi pilihan untuk tipe dropdown'); return res.redirect(back); }
  const id = toNum(b.id);
  try {
    if (id) {
      await db.q(
        `UPDATE program_field SET program_channel_id=$3, stage=$4, key=$5, label=$6, field_type=$7, required=$8, options=$9, help=$10, sort=$11
         WHERE id=$1 AND program_id=$2`,
        [id, req.program.id, pcId, stage, key, label, type, b.required === 'on', options, b.help || null, toNum(b.sort) ?? 0]);
    } else {
      await db.q(
        `INSERT INTO program_field (program_id, program_channel_id, stage, key, label, field_type, required, options, help, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [req.program.id, pcId, stage, key, label, type, b.required === 'on', options, b.help || null, toNum(b.sort) ?? 0]);
    }
  } catch (e) {
    flash(req, 'danger', e.code === '23505' ? `Key "${key}" sudah dipakai di tahap & channel yang sama` : e.message);
    return res.redirect(back);
  }
  flash(req, 'success', `Kolom "${label}" disimpan.`);
  res.redirect(back);
});

router.post('/:id/fields/:fid/delete', async (req, res) => {
  await db.q('DELETE FROM program_field WHERE id = $1 AND program_id = $2', [Number(req.params.fid), req.program.id]);
  flash(req, 'success', 'Kolom dihapus (data lama tetap tersimpan di peserta).');
  res.redirect(`/setup/${req.program.id}/fields`);
});

// ---------------------------------------------------------------- disbursement (periode & komponen)
router.get('/:id/disbursement', (req, res) => {
  const edit = req.query.edit ? req.program.components.find((c) => c.id === Number(req.query.edit)) : null;
  res.render('setup/disbursement', { title: 'Pencairan', tab: 'disbursement', edit, formulaVars: engine.FORMULA_VARS });
});

router.post('/:id/periods', async (req, res) => {
  const b = req.body;
  const back = `/setup/${req.program.id}/disbursement`;
  const names = arr(b.period_name);
  const rows = names.map((n, i) => ({
    id: toNum(arr(b.period_id)[i]), name: String(n).trim(),
    achieve_start: arr(b.achieve_start)[i], achieve_end: arr(b.achieve_end)[i],
    claim_start: arr(b.claim_start)[i] || null, claim_end: arr(b.claim_end)[i] || null,
  })).filter((r) => r.name);
  for (const r of rows) {
    if (!r.achieve_start || !r.achieve_end || r.achieve_start > r.achieve_end) {
      flash(req, 'danger', `Periode "${r.name}": tanggal pencapaian tidak valid`); return res.redirect(back);
    }
  }
  try {
    await db.tx(async (tx) => {
      const keep = [];
      for (const [i, r] of rows.entries()) {
        if (r.id && req.program.periods.find((p) => p.id === r.id)) {
          await tx.q('UPDATE program_period SET name=$2, achieve_start=$3, achieve_end=$4, claim_start=$5, claim_end=$6, sort=$7 WHERE id=$1',
            [r.id, r.name, r.achieve_start, r.achieve_end, r.claim_start, r.claim_end, i]);
          keep.push(r.id);
        } else {
          const n = await tx.one(`INSERT INTO program_period (program_id, name, achieve_start, achieve_end, claim_start, claim_end, sort)
                                  VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
          [req.program.id, r.name, r.achieve_start, r.achieve_end, r.claim_start, r.claim_end, i]);
          keep.push(n.id);
        }
      }
      const removed = req.program.periods.filter((p) => !keep.includes(p.id)).map((p) => p.id);
      if (removed.length) {
        const used = await tx.one('SELECT COUNT(*) AS n FROM disbursement WHERE period_id = ANY($1)', [removed]);
        if (used.n) throw new Error('Periode yang sudah punya pencairan tidak bisa dihapus.');
        await tx.q('DELETE FROM program_period WHERE id = ANY($1)', [removed]);
      }
    });
  } catch (e) { flash(req, 'danger', e.message); return res.redirect(back); }
  flash(req, 'success', 'Periode pencairan disimpan.');
  res.redirect(back);
});

router.post('/:id/components', async (req, res) => {
  const b = req.body;
  const back = `/setup/${req.program.id}/disbursement`;
  const type = b.comp_type;
  if (!['growth_rebate', 'jtbd', 'fixed', 'formula'].includes(type)) { flash(req, 'danger', 'Tipe komponen tidak valid'); return res.redirect(back); }
  const name = String(b.name || '').trim();
  if (!name) { flash(req, 'danger', 'Nama komponen wajib diisi'); return res.redirect(back); }
  const config = { base: b.base === 'target' ? 'target' : 'actual' };
  const minAch = toNum(b.min_achievement);
  if (minAch !== null) config.min_achievement = minAch;
  if (type === 'growth_rebate') {
    config.rebate_source = b.rebate_source === 'custom' ? 'custom' : 'class';
    config.rebate_pct = toNum(b.rebate_pct) ?? 0;
    config.tiers = arr(b.tier_min).map((m, i) => ({ min_achievement: toNum(m), payout_pct: toNum(arr(b.tier_payout)[i]) }))
      .filter((t) => t.min_achievement !== null && t.payout_pct !== null);
    delete config.min_achievement;
    if (!config.tiers.length) { flash(req, 'danger', 'Isi minimal 1 tier pencapaian'); return res.redirect(back); }
  } else if (type === 'fixed') {
    config.amounts = {};
    for (const [k, v] of Object.entries(b)) if (k.startsWith('amount_')) config.amounts[k.slice(7)] = toNum(v) ?? 0;
  } else if (type === 'formula') {
    config.expression = String(b.expression || '').trim();
    const err = formula.validate(config.expression, engine.FORMULA_VARS.concat(req.program.fields.map((f) => f.key)));
    if (err) { flash(req, 'danger', `Rumus tidak valid: ${err}`); return res.redirect(`${back}?edit=${b.id || ''}`); }
  }
  const periodIds = arr(b.period_ids).map(Number).filter(Boolean);
  const vals = [toNum(b.program_channel_id), name, type, config, periodIds.length ? periodIds : null, b.is_active === 'on', toNum(b.sort) ?? 0];
  const id = toNum(b.id);
  if (id) {
    await db.q(`UPDATE program_component SET program_channel_id=$3, name=$4, comp_type=$5, config=$6, period_ids=$7, is_active=$8, sort=$9
                WHERE id=$1 AND program_id=$2`, [id, req.program.id, ...vals]);
  } else {
    await db.q(`INSERT INTO program_component (program_id, program_channel_id, name, comp_type, config, period_ids, is_active, sort)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [req.program.id, ...vals]);
  }
  flash(req, 'success', `Komponen "${name}" disimpan.`);
  res.redirect(back);
});

router.post('/:id/components/:cid/delete', async (req, res) => {
  await db.q('DELETE FROM program_component WHERE id = $1 AND program_id = $2', [Number(req.params.cid), req.program.id]);
  flash(req, 'success', 'Komponen dihapus.');
  res.redirect(`/setup/${req.program.id}/disbursement`);
});

// Simulasi hitungan pencairan dari halaman setup (tanpa menyimpan)
router.post('/:id/simulate', async (req, res) => {
  const p = req.program;
  const pc = p.channels.find((c) => c.id === Number(req.body.pc_id));
  const period = p.periods.find((x) => x.id === Number(req.body.period_id));
  if (!pc || !period) return res.json({ error: 'Pilih channel & periode' });
  const baseline = toNum(req.body.baseline) ?? 0;
  const cls = engine.pickClass(pc.classes, baseline);
  if (!cls) return res.json({ error: 'Baseline tidak masuk kelas manapun' });
  const growth = toNum(req.body.growth) ?? cls.min_growth;
  const t = engine.computeTarget(baseline, growth, p.programMonths);
  const months = engine.monthsBetween(period.achieve_start, period.achieve_end).length;
  const achievement = toNum(req.body.achievement) ?? 100;
  const actual = t.monthly * months * achievement / 100;
  const lmValues = {};
  const lmAll = req.body.lm_all === 'true';
  for (const lm of p.leadMeasures) {
    const prm = lm.params[cls.id];
    if (prm && lmAll) lmValues[lm.id] = lm.input_type === 'yesno' ? 'Ya' : (lm.input_type === 'number' ? prm.target_value : 'ok');
  }
  const r = engine.computeDisbursement({
    program: p, period, actual, lmValues, data: {}, hasNpwp: true,
    participant: { program_channel_id: pc.id, class_id: cls.id, class_name: cls.name, baseline, growth_pct: growth, target_monthly: t.monthly, data: {} },
  });
  res.json({ cls: cls.name, growth, target: r.target, actual: r.actual, achievement: r.achievement, lines: r.lines, gross: r.gross, tax: r.tax, net: r.net, taxRate: r.taxRate });
});

// ---------------------------------------------------------------- workflow
router.get('/:id/workflow', (req, res) => {
  res.render('setup/workflow', { title: 'Alur Approval', tab: 'workflow' });
});

router.post('/:id/steps', async (req, res) => {
  const b = req.body;
  const phase = b.phase === 'disbursement' ? 'disbursement' : 'registration';
  const name = String(b.name || '').trim();
  if (!name) { flash(req, 'danger', 'Nama tahap wajib diisi'); return res.redirect(`/setup/${req.program.id}/workflow`); }
  const max = await db.one('SELECT COALESCE(MAX(sort),0) AS m FROM program_step WHERE program_id = $1 AND phase = $2', [req.program.id, phase]);
  await db.q('INSERT INTO program_step (program_id, phase, name, role, sort) VALUES ($1,$2,$3,$4,$5)',
    [req.program.id, phase, name, b.role, max.m + 1]);
  flash(req, 'success', `Tahap "${name}" ditambahkan.`);
  res.redirect(`/setup/${req.program.id}/workflow`);
});

router.post('/:id/steps/:sid/:action', async (req, res) => {
  const step = req.program.steps.find((s) => s.id === Number(req.params.sid));
  const back = `/setup/${req.program.id}/workflow`;
  if (!step) return res.redirect(back);
  const siblings = req.program.steps.filter((s) => s.phase === step.phase).sort((a, b) => a.sort - b.sort || a.id - b.id);
  const idx = siblings.findIndex((s) => s.id === step.id);
  if (req.params.action === 'delete') {
    const busy = await db.one(
      `SELECT (SELECT COUNT(*) FROM participant WHERE current_step_id = $1) + (SELECT COUNT(*) FROM disbursement WHERE current_step_id = $1) AS n`, [step.id]);
    if (busy.n) { flash(req, 'danger', `Masih ada ${busy.n} data menunggu di tahap ini.`); return res.redirect(back); }
    await db.q('DELETE FROM program_step WHERE id = $1', [step.id]);
  } else if (req.params.action === 'up' || req.params.action === 'down') {
    const j = req.params.action === 'up' ? idx - 1 : idx + 1;
    if (siblings[j]) {
      const order = siblings.map((s) => s.id);
      [order[idx], order[j]] = [order[j], order[idx]];
      await db.tx(async (tx) => {
        for (const [i, id] of order.entries()) await tx.q('UPDATE program_step SET sort = $2 WHERE id = $1', [id, i + 1]);
      });
    }
  }
  res.redirect(back);
});

// ---------------------------------------------------------------- review & status
router.get('/:id/review', (req, res) => {
  const items = checklist(req.program);
  res.render('setup/review', { title: 'Review & Aktivasi', tab: 'review', items });
});

router.post('/:id/status', async (req, res) => {
  const to = req.body.status;
  const back = `/setup/${req.program.id}/review`;
  if (to === 'active') {
    const blocking = checklist(req.program).filter((i) => !i.ok && i.level === 'error');
    if (blocking.length) { flash(req, 'danger', 'Masih ada item wajib yang belum lengkap.'); return res.redirect(back); }
  }
  if (!['draft', 'active', 'closed'].includes(to)) return res.redirect(back);
  await db.q('UPDATE program SET status = $2, updated_at = now() WHERE id = $1', [req.program.id, to]);
  flash(req, 'success', { draft: 'Program dikembalikan ke draft.', active: 'Program aktif! CBD sudah bisa mendaftarkan toko.', closed: 'Program ditutup.' }[to]);
  res.redirect(back);
});

router.post('/:id/delete', async (req, res) => {
  if (res.locals.participantCount > 0) { flash(req, 'danger', 'Program sudah punya peserta, tidak bisa dihapus.'); return res.redirect(`/setup/${req.program.id}/review`); }
  await db.q('DELETE FROM program WHERE id = $1', [req.program.id]);
  flash(req, 'success', 'Program dihapus.');
  res.redirect('/setup');
});

module.exports = router;
