const path = require('path');
const express = require('express');
const session = require('express-session');
const db = require('./db');
const h = require('./lib/view-helpers');
const { requireLogin, requireYear } = require('./middleware/auth');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '..', 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'tradee-2027-prototype',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 },
}));

app.use(async (req, res, next) => {
  res.locals.h = h;
  res.locals.user = req.session.user || null;
  res.locals.year = req.session.year || null;
  res.locals.path = req.path;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.inboxCount = 0;
  if (req.session.user && req.session.year) {
    const r = await db.one(
      `SELECT
         (SELECT COUNT(*) FROM participant pa JOIN program p ON p.id = pa.program_id
            JOIN program_step s ON s.id = pa.current_step_id
            WHERE p.year = $1 AND pa.status = 'in_review' AND s.role = $2)
       + (SELECT COUNT(*) FROM disbursement d JOIN participant pa ON pa.id = d.participant_id
            JOIN program p ON p.id = pa.program_id JOIN program_step s ON s.id = d.current_step_id
            WHERE p.year = $1 AND d.status = 'in_review' AND s.role = $2) AS n`,
      [req.session.year, req.session.user.role]
    );
    res.locals.inboxCount = r ? r.n : 0;
  }
  next();
});

app.use('/', require('./routes/auth'));
app.use('/setup', requireLogin, requireYear, require('./routes/setup'));
app.use('/master', requireLogin, require('./routes/master'));
app.use('/registration', requireLogin, requireYear, require('./routes/registration'));
app.use('/inbox', requireLogin, requireYear, require('./routes/inbox'));
app.use('/disbursement', requireLogin, requireYear, require('./routes/disbursement'));

app.use((req, res) => {
  res.status(404).render('error', { title: 'Halaman tidak ditemukan', message: `Tidak ada halaman ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', { title: 'Terjadi kesalahan', message: err.message });
});

const port = Number(process.env.PORT || 3027);
app.listen(port, () => console.log(`Tradee 2027 prototype berjalan di http://localhost:${port}`));
