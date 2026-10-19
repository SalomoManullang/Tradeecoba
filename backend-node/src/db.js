require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool, types } = require('pg');

// numeric -> number, bigint (count) -> number, date -> 'YYYY-MM-DD'
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));
types.setTypeParser(1082, (v) => v);

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL belum di-set. Salin .env.example menjadi .env lalu isi koneksi PostgreSQL.');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function wrap(runner) {
  return {
    q: async (text, params) => (await runner.query(text, params)).rows,
    one: async (text, params) => (await runner.query(text, params)).rows[0] || null,
  };
}

const db = wrap(pool);

db.tx = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(wrap(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

db.pool = pool;

module.exports = db;
