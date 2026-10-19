// Inbox approval: menampilkan data yang sedang menunggu di tahap milik role user.
const express = require('express');
const db = require('../db');
const engine = require('../lib/engine');
const workflow = require('../lib/workflow');
const { flash, scopeSql } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  const user = req.session.user;
  const p1 = [req.session.year, user.role];
  const participants = await db.q(
    `SELECT pa.*, s.name AS store_name, s.dc_code, c.name AS channel_name, p.name AS program_name, st.name AS step_name
     FROM participant pa JOIN program p ON p.id = pa.program_id JOIN store s ON s.customer_id = pa.customer_id
     JOIN channel c ON c.code = s.channel_code JOIN program_step st ON st.id = pa.current_step_id
     WHERE p.year = $1 AND pa.status = 'in_review' AND st.role = $2 ${scopeSql(user, 's', p1)}
     ORDER BY pa.registered_at`, p1);
  const p2 = [req.session.year, user.role];
  const disbursements = await db.q(
    `SELECT d.*, pa.class_name, s.name AS store_name, s.customer_id, s.dc_code, c.name AS channel_name,
       p.name AS program_name, pr.name AS period_name, st.name AS step_name
     FROM disbursement d JOIN participant pa ON pa.id = d.participant_id JOIN program p ON p.id = pa.program_id
     JOIN store s ON s.customer_id = pa.customer_id JOIN channel c ON c.code = s.channel_code
     JOIN program_period pr ON pr.id = d.period_id JOIN program_step st ON st.id = d.current_step_id
     WHERE p.year = $1 AND d.status = 'in_review' AND st.role = $2 ${scopeSql(user, 's', p2)}
     ORDER BY d.created_at`, p2);
  res.render('inbox/index', { title: 'Inbox Approval', participants, disbursements });
});

async function loadRecord(entity, id, year) {
  if (entity === 'participant') {
    return db.one(`SELECT pa.*, s.dc_code, s.channel_code FROM participant pa JOIN program p ON p.id = pa.program_id
                   JOIN store s ON s.customer_id = pa.customer_id WHERE pa.id = $1 AND p.year = $2`, [id, year]);
  }
  return db.one(`SELECT d.*, pa.program_id, s.dc_code, s.channel_code FROM disbursement d
                 JOIN participant pa ON pa.id = d.participant_id JOIN program p ON p.id = pa.program_id
                 JOIN store s ON s.customer_id = pa.customer_id WHERE d.id = $1 AND p.year = $2`, [id, year]);
}

function inScope(user, rec) {
  if (user.dc_codes && user.dc_codes.length && !user.dc_codes.includes(rec.dc_code)) return false;
  if (user.channel_codes && user.channel_codes.length && !user.channel_codes.includes(rec.channel_code)) return false;
  return true;
}

async function actOne(req, entity, id, action, note) {
  const rec = await loadRecord(entity, id, req.session.year);
  if (!rec || !inScope(req.session.user, rec)) throw new Error('Data tidak ditemukan');
  const program = await engine.loadProgram(rec.program_id);
  return db.tx((tx) => workflow.act(tx, { entity, record: rec, program, action, user: req.session.user, note }));
}

router.post('/bulk', async (req, res) => {
  const ids = [].concat(req.body.ids || []).map(Number).filter(Boolean);
  const entity = req.body.entity === 'disbursement' ? 'disbursement' : 'participant';
  let ok = 0; const errs = [];
  for (const id of ids) {
    try { await actOne(req, entity, id, 'approve', req.body.note); ok++; } catch (e) { errs.push(`#${id}: ${e.message}`); }
  }
  flash(req, errs.length ? 'warning' : 'success', `${ok} data di-approve.` + (errs.length ? '<br>' + errs.join('<br>') : ''));
  res.redirect(req.body.back || '/inbox');
});

router.post('/:entity/:id', async (req, res) => {
  const entity = req.params.entity === 'disbursement' ? 'disbursement' : 'participant';
  try {
    const r = await actOne(req, entity, Number(req.params.id), req.body.action, req.body.note);
    const label = { approve: 'disetujui', reject: 'ditolak', return: 'dikembalikan untuk revisi' }[req.body.action];
    flash(req, 'success', `Data ${label}.` + (r.nextStep ? ` Lanjut ke "${r.nextStep.name}".` : ''));
  } catch (e) {
    flash(req, 'danger', e.message);
  }
  res.redirect(req.body.back || '/inbox');
});

module.exports = router;
