// Membuat ulang seluruh tabel (HATI-HATI: menghapus semua data di database DATABASE_URL)
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await db.pool.query(sql);
  console.log('Skema berhasil dibuat.');
  await db.pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
