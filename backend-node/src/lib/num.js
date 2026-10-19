// Parse angka dari input user. Menerima "70000000", "70.000.000", "2,5", "2.5".
function toNum(v) {
  if (v === undefined || v === null) return null;
  let s = String(v).trim().replace(/\s|_/g, '');
  if (s === '') return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

module.exports = { toNum };
