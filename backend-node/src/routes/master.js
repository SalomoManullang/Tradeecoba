// Master data: data sell out bulanan (upload rutin), toko, channel & brand.
const express = require('express');
const multer = require('multer');
const ExcelJS = require('exceljs');
const db = require('../db');
const { requireRole, flash, scopeSql } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ---------------------------------------------------------------- sell out
router.get('/sales', requireRole('ADMIN_HO'), async (req, res) => {
  const summary = await db.q(
    `SELECT period, COUNT(DISTINCT customer_id) AS stores, SUM(sellout) AS sellout, SUM(sellin) AS sellin, MAX(uploaded_at) AS uploaded_at
     FROM sales_monthly GROUP BY period ORDER BY period DESC LIMIT 36`);
  res.render('master/sales', { title: 'Data Sell Out Bulanan', summary });
});

router.get('/sales/template', requireRole('ADMIN_HO'), async (req, res) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sell Out');
  ws.addRow(['customer_id', 'periode (YYYY-MM)', 'brand', 'sell_out', 'sell_in']).font = { bold: true };
  const sample = await db.q('SELECT customer_id FROM store ORDER BY customer_id LIMIT 3');
  const brands = await db.q('SELECT code FROM brand WHERE is_active ORDER BY sort LIMIT 2');
  for (const s of sample) for (const b of brands) ws.addRow([s.customer_id, '2027-01', b.code, 15000000, 16000000]);
  ws.columns.forEach((c) => { c.width = 20; });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template_sell_out.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

router.post('/sales/upload', requireRole('ADMIN_HO'), upload.single('file'), async (req, res) => {
  if (!req.file) { flash(req, 'danger', 'File belum dipilih'); return res.redirect('/master/sales'); }
  const wb = new ExcelJS.Workbook();
  try {
    if (/\.csv$/i.test(req.file.originalname)) await wb.csv.read(require('stream').Readable.from(req.file.buffer));
    else await wb.xlsx.load(req.file.buffer);
  } catch (e) { flash(req, 'danger', 'File tidak bisa dibaca: ' + e.message); return res.redirect('/master/sales'); }

  const stores = new Set((await db.q('SELECT customer_id FROM store')).map((s) => s.customer_id));
  const brands = new Set((await db.q('SELECT code FROM brand')).map((b) => b.code));
  const rows = []; const errs = [];
  const cell = (row, i) => {
    let v = row.getCell(i).value;
    if (v && typeof v === 'object' && !(v instanceof Date)) v = v.result ?? v.text ?? '';
    return v;
  };
  wb.worksheets[0].eachRow((row, i) => {
    if (i === 1) return;
    const cid = String(cell(row, 1) ?? '').trim();
    let per = cell(row, 2);
    per = per instanceof Date ? per.toISOString().slice(0, 7) : String(per ?? '').trim().slice(0, 7);
    const brand = String(cell(row, 3) ?? '').trim();
    const so = Number(cell(row, 4) || 0);
    const si = Number(cell(row, 5) || 0);
    if (!cid && !per) return;
    if (!stores.has(cid)) errs.push(`Baris ${i}: customer_id "${cid}" tidak ada di master toko`);
    else if (!/^\d{4}-\d{2}$/.test(per)) errs.push(`Baris ${i}: periode "${per}" harus YYYY-MM`);
    else if (!brands.has(brand)) errs.push(`Baris ${i}: brand "${brand}" tidak dikenal`);
    else if (!Number.isFinite(so) || !Number.isFinite(si)) errs.push(`Baris ${i}: nilai sell out / sell in bukan angka`);
    else rows.push([cid, `${per}-01`, brand, so, si]);
  });
  if (errs.length) {
    flash(req, 'danger', errs.slice(0, 10).join('<br>') + (errs.length > 10 ? `<br>... dan ${errs.length - 10} error lain` : ''));
    return res.redirect('/master/sales');
  }
  await db.tx(async (tx) => {
    for (const r of rows) {
      await tx.q(
        `INSERT INTO sales_monthly (customer_id, period, brand_code, sellout, sellin) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (customer_id, period, brand_code) DO UPDATE SET sellout = EXCLUDED.sellout, sellin = EXCLUDED.sellin, uploaded_at = now()`, r);
    }
  });
  flash(req, 'success', `${rows.length} baris sell out berhasil di-upload / diperbarui.`);
  res.redirect('/master/sales');
});

// ---------------------------------------------------------------- toko
router.get('/stores', async (req, res) => {
  const params = [];
  let where = 'WHERE 1=1' + scopeSql(req.session.user, 's', params);
  if (req.query.channel) { params.push(req.query.channel); where += ` AND s.channel_code = $${params.length}`; }
  if (req.query.q) { params.push(`%${req.query.q}%`); where += ` AND (s.name ILIKE $${params.length} OR s.customer_id ILIKE $${params.length})`; }
  const stores = await db.q(
    `SELECT s.*, c.name AS channel_name, d.name AS dc_name,
       (SELECT COALESCE(SUM(sellout),0) FROM sales_monthly m WHERE m.customer_id = s.customer_id
          AND m.period >= date_trunc('month', now()) - interval '12 months') AS sellout_12m
     FROM store s JOIN channel c ON c.code = s.channel_code JOIN dc d ON d.code = s.dc_code
     ${where} ORDER BY s.channel_code, s.customer_id LIMIT 500`, params);
  const channels = await db.q('SELECT * FROM channel ORDER BY sort');
  res.render('master/stores', { title: 'Master Toko', stores, channels, query: req.query });
});

// ---------------------------------------------------------------- channel & brand
router.get('/data', requireRole('ADMIN_HO'), async (req, res) => {
  const [channels, brands, dcs] = await Promise.all([
    db.q('SELECT * FROM channel ORDER BY sort'),
    db.q('SELECT * FROM brand ORDER BY sort'),
    db.q('SELECT * FROM dc ORDER BY code'),
  ]);
  res.render('master/data', { title: 'Channel & Brand', channels, brands, dcs });
});

router.post('/data/:kind', requireRole('ADMIN_HO'), async (req, res) => {
  const table = { channel: 'channel', brand: 'brand' }[req.params.kind];
  if (!table) return res.redirect('/master/data');
  const code = String(req.body.code || '').trim().toUpperCase();
  const name = String(req.body.name || '').trim();
  if (!/^[A-Z0-9_]{1,12}$/.test(code) || !name) { flash(req, 'danger', 'Kode (maks 12, huruf besar/angka) & nama wajib diisi'); return res.redirect('/master/data'); }
  await db.q(
    `INSERT INTO ${table} (code, name, sort) VALUES ($1, $2, (SELECT COALESCE(MAX(sort),0)+1 FROM ${table}))
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, is_active = true`, [code, name]);
  flash(req, 'success', `${req.params.kind === 'channel' ? 'Channel' : 'Brand'} ${name} disimpan.`);
  res.redirect('/master/data');
});

router.post('/data/:kind/:code/toggle', requireRole('ADMIN_HO'), async (req, res) => {
  const table = { channel: 'channel', brand: 'brand' }[req.params.kind];
  if (table) await db.q(`UPDATE ${table} SET is_active = NOT is_active WHERE code = $1`, [req.params.code]);
  res.redirect('/master/data');
});

module.exports = router;
