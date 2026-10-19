const ROLE_LABEL = {
  ADMIN_HO: 'Admin HO',
  CBD: 'CBD',
  RSM: 'RSM',
  ADMIN_DC: 'Admin DC',
  FINANCE: 'Finance / AP',
};

const STATUS = {
  draft: ['Draft', 'secondary'],
  active: ['Aktif', 'success'],
  closed: ['Ditutup', 'dark'],
  complete: ['Selesai', 'success'],
  in_review: ['Menunggu approval', 'warning'],
  rejected: ['Ditolak', 'danger'],
  returned: ['Dikembalikan', 'info'],
  paid: ['Cair', 'success'],
};

const FIELD_TYPES = {
  text: 'Teks singkat',
  textarea: 'Teks panjang',
  number: 'Angka',
  currency: 'Rupiah',
  percent: 'Persen',
  select: 'Pilihan (dropdown)',
  date: 'Tanggal',
  yesno: 'Ya / Tidak',
};

const COMP_TYPES = {
  growth_rebate: 'Rebate growth (tier pencapaian)',
  jtbd: 'Reward JTBD / lead measure',
  fixed: 'Nominal tetap per kelas',
  formula: 'Rumus bebas',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function num(n, digits = 0) {
  if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '-';
  return Number(n).toLocaleString('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function rp(n) {
  if (n === null || n === undefined || n === '') return '-';
  return 'Rp ' + num(n);
}

// Ringkas: 70.000.000 -> 70 jt
function rpShort(n) {
  if (n === null || n === undefined) return '-';
  const a = Math.abs(n);
  if (a >= 1e9) return num(n / 1e9, 2) + ' M';
  if (a >= 1e6) return num(n / 1e6, 1) + ' jt';
  if (a >= 1e3) return num(n / 1e3, 0) + ' rb';
  return num(n);
}

function pct(n, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '-';
  return num(n, digits) + '%';
}

function date(d) {
  if (!d) return '-';
  const s = String(d instanceof Date ? d.toISOString() : d).slice(0, 10);
  const [y, m, dd] = s.split('-');
  return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`;
}

function datetime(d) {
  if (!d) return '-';
  const x = new Date(d);
  return x.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function month(d) {
  const s = String(d).slice(0, 7);
  const [y, m] = s.split('-');
  return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`;
}

function badge(status) {
  const [label, color] = STATUS[status] || [status, 'secondary'];
  return `<span class="badge text-bg-${color}">${label}</span>`;
}

function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = { ROLE_LABEL, STATUS, FIELD_TYPES, COMP_TYPES, MONTHS, num, rp, rpShort, pct, date, datetime, month, badge, esc };
