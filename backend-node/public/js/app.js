// Util kecil yang dipakai di semua halaman
window.fmtNum = (n, d = 0) => (n === null || n === undefined || isNaN(n)) ? '-' :
  Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
window.fmtRp = (n) => 'Rp ' + window.fmtNum(n);

// Konfirmasi sebelum submit: <button data-confirm="...">
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-confirm]');
  if (el && !confirm(el.dataset.confirm)) { e.preventDefault(); e.stopPropagation(); }
});

// Checkbox "pilih semua": <input type="checkbox" data-check-all="name">
document.addEventListener('change', (e) => {
  const name = e.target.dataset && e.target.dataset.checkAll;
  if (!name) return;
  document.querySelectorAll(`input[name="${name}"]`).forEach((c) => { c.checked = e.target.checked; });
});
