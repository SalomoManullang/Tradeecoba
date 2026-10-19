const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireLogin, requireYear, requireRole, flash } = require('../middleware/auth');

const router = express.Router();

router.get('/login', async (req, res) => {
  if (req.session.user) return res.redirect('/lobby');
  const demoUsers = await db.q('SELECT name, email, role FROM app_user WHERE is_active ORDER BY id');
  res.render('login', { title: 'Login', demoUsers, error: null, email: '' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const u = await db.one('SELECT * FROM app_user WHERE lower(email) = lower($1) AND is_active', [email || '']);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    const demoUsers = await db.q('SELECT name, email, role FROM app_user WHERE is_active ORDER BY id');
    return res.status(401).render('login', { title: 'Login', demoUsers, error: 'Email atau password salah', email });
  }
  req.session.user = { id: u.id, name: u.name, email: u.email, role: u.role, dc_codes: u.dc_codes, channel_codes: u.channel_codes };
  res.redirect('/lobby');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// ---------------------------------------------------------------- lobby (pilih tahun)
router.get('/lobby', requireLogin, async (req, res) => {
  const years = await db.q(
    `SELECT y.*, COUNT(p.id) AS program_count
     FROM program_year y LEFT JOIN program p ON p.year = y.year
     WHERE y.is_active OR $1
     GROUP BY y.year ORDER BY y.year DESC`,
    [req.session.user.role === 'ADMIN_HO']
  );
  res.render('lobby', { title: 'Pilih Tahun', years });
});

router.post('/lobby/choose', requireLogin, async (req, res) => {
  const y = await db.one('SELECT * FROM program_year WHERE year = $1', [Number(req.body.year)]);
  if (!y) return res.redirect('/lobby');
  req.session.year = y.year;
  res.redirect('/');
});

router.post('/lobby/year', requireLogin, requireRole('ADMIN_HO'), async (req, res) => {
  const year = Number(req.body.year);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) {
    flash(req, 'danger', 'Tahun tidak valid');
    return res.redirect('/lobby');
  }
  await db.q(
    'INSERT INTO program_year (year, note) VALUES ($1, $2) ON CONFLICT (year) DO UPDATE SET is_active = true',
    [year, req.body.note || null]
  );
  flash(req, 'success', `Tahun ${year} ditambahkan. Silakan pilih tahun lalu buat program.`);
  res.redirect('/lobby');
});

router.post('/lobby/year/:year/toggle', requireLogin, requireRole('ADMIN_HO'), async (req, res) => {
  await db.q('UPDATE program_year SET is_active = NOT is_active WHERE year = $1', [Number(req.params.year)]);
  res.redirect('/lobby');
});

// ---------------------------------------------------------------- dashboard
router.get('/', requireLogin, requireYear, async (req, res) => {
  const programs = await db.q(
    `SELECT p.*,
       (SELECT COUNT(*) FROM program_channel pc WHERE pc.program_id = p.id) AS channel_count,
       (SELECT COUNT(*) FROM program_channel pc WHERE pc.program_id = p.id AND pc.status = 'complete') AS channel_done,
       (SELECT COUNT(*) FROM participant pa WHERE pa.program_id = p.id AND pa.status = 'active') AS active_count,
       (SELECT COUNT(*) FROM participant pa WHERE pa.program_id = p.id AND pa.status = 'in_review') AS review_count,
       (SELECT COALESCE(SUM(d.net_amount),0) FROM disbursement d JOIN participant pa ON pa.id = d.participant_id
          WHERE pa.program_id = p.id AND d.status = 'paid') AS paid_amount,
       (SELECT COALESCE(SUM(d.net_amount),0) FROM disbursement d JOIN participant pa ON pa.id = d.participant_id
          WHERE pa.program_id = p.id AND d.status = 'in_review') AS pending_amount
     FROM program p WHERE p.year = $1 ORDER BY p.status, p.name`,
    [req.session.year]
  );
  const channels = await db.q(
    `SELECT pc.program_id, c.name, pc.status,
       (SELECT COUNT(*) FROM participant pa WHERE pa.program_channel_id = pc.id AND pa.status IN ('active','in_review')) AS n
     FROM program_channel pc JOIN channel c ON c.code = pc.channel_code
     JOIN program p ON p.id = pc.program_id WHERE p.year = $1 ORDER BY c.sort`,
    [req.session.year]
  );
  res.render('dashboard', { title: 'Dashboard', programs, channels });
});

module.exports = router;
