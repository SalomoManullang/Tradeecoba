// Membaca & memvalidasi nilai kolom dinamis (program_field) dari form.
const { toNum } = require('./num');

function readFieldValues(fields, body, prefix = 'f_') {
  const values = {};
  const errors = [];
  for (const f of fields) {
    const raw = body[prefix + f.key];
    let v = raw === undefined || raw === null ? '' : String(raw).trim();
    if (['number', 'currency', 'percent'].includes(f.field_type)) {
      if (v !== '') {
        const n = toNum(v);
        if (n === null) { errors.push(`${f.label} harus berupa angka`); continue; }
        v = n;
      }
    } else if (f.field_type === 'yesno') {
      v = v === 'Ya' || v === 'Tidak' ? v : '';
    } else if (f.field_type === 'select') {
      if (v !== '' && !(f.options || []).includes(v)) { errors.push(`${f.label}: pilihan tidak valid`); continue; }
    }
    if (f.required && (v === '' || v === null)) { errors.push(`${f.label} wajib diisi`); continue; }
    if (v !== '') values[f.key] = v;
  }
  return { values, errors };
}

module.exports = { readFieldValues };
