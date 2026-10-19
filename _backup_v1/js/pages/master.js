// Master data: sell out bulanan (upload CSV), toko, channel & brand.
(function () {
  const { h, route, actions, clicks, done, flash, render, inScope } = UI;
  const { esc } = h;

  route('/master/sales', () => {
    UI.requireRole('ADMIN_HO');
    const sales = DB.state.sales;
    const sum = {};
    for (const byMonth of Object.values(sales)) {
      for (const [m, row] of Object.entries(byMonth)) {
        const s = sum[m] || (sum[m] = { stores: 0, so: 0, si: 0 });
        s.stores++;
        for (const v of Object.values(row)) { s.so += v[0]; s.si += v[1]; }
      }
    }
    const up = Object.fromEntries((DB.state.salesUploads || []).map((u) => [u.period, u.uploaded_at]));
    const months = Object.keys(sum).sort().reverse();
    return {
      title: 'Data Sell Out', html: `<div class="page-head"><div><h1>Data Sell Out Bulanan</h1><div class="sub">Data yang dikirim rutin tiap bulan. Dipakai untuk baseline, saran toko eligible, dan aktual pencairan.</div></div></div>
      <div class="row g-3"><div class="col-lg-4"><div class="card"><div class="card-header"><i class="bi bi-upload"></i> Upload data (CSV)</div><div class="card-body">
        <p class="small text-muted">Kolom: <code>customer_id</code>, <code>periode</code> (YYYY-MM), <code>brand</code>, <code>sell_out</code>, <code>sell_in</code>. Data periode + toko + brand yang sama akan ditimpa.</p>
        <form data-action="master.uploadSales"><input type="file" name="file" accept=".csv" class="form-control mb-2" required><button class="btn btn-brand w-100">Upload</button></form>
        <a href="#" class="btn btn-link px-0 mt-2" data-click="master.salesTemplate"><i class="bi bi-download"></i> Download template</a></div></div></div>
      <div class="col-lg-8"><div class="card"><div class="table-responsive"><table class="table table-sm mb-0">
        <thead><tr><th>Periode</th><th class="num">Toko</th><th class="num">Sell out</th><th class="num">Sell in</th><th class="num">SO:SI</th><th>Update terakhir</th></tr></thead>
        <tbody>${months.map((m) => { const s = sum[m]; return `<tr><td>${h.month(m)}</td><td class="num">${s.stores}</td><td class="num">${h.rpShort(s.so)}</td>
          <td class="num">${h.rpShort(s.si)}</td><td class="num">${h.pct(s.si ? s.so / s.si * 100 : null)}</td><td class="small text-muted">${h.datetime(up[m])}</td></tr>`; }).join('')}</tbody>
      </table></div></div></div></div>`,
    };
  });

  clicks['master.salesTemplate'] = () => {
    const rows = [['customer_id', 'periode', 'brand', 'sell_out', 'sell_in']];
    for (const s of DB.t('stores').slice(0, 3)) for (const b of DB.t('brands').slice(0, 2)) rows.push([s.customer_id, '2027-07', b.code, 15000000, 16000000]);
    UI.download('template_sell_out.csv', UI.toCsv(rows), 'text/csv;charset=utf-8');
  };

  actions['master.uploadSales'] = async (f) => {
    const file = f.file('file');
    if (!file || !file.size) throw new Error('File belum dipilih');
    const rows = UI.parseCsv(await file.text()).slice(1);
    const stores = new Set(DB.t('stores').map((s) => s.customer_id));
    const brands = new Set(DB.t('brands').map((b) => b.code));
    const ok = []; const errs = [];
    rows.forEach((r, i) => {
      const [cid, per, brand, so, si] = r;
      const nso = Number(String(so).replace(/[^\d.-]/g, '')); const nsi = Number(String(si).replace(/[^\d.-]/g, ''));
      if (!stores.has(cid)) errs.push(`Baris ${i + 2}: customer_id "${cid}" tidak ada di master toko`);
      else if (!/^\d{4}-\d{2}$/.test(String(per).slice(0, 7))) errs.push(`Baris ${i + 2}: periode "${per}" harus YYYY-MM`);
      else if (!brands.has(brand)) errs.push(`Baris ${i + 2}: brand "${brand}" tidak dikenal`);
      else if (!Number.isFinite(nso) || !Number.isFinite(nsi)) errs.push(`Baris ${i + 2}: nilai sell out / sell in bukan angka`);
      else ok.push([cid, String(per).slice(0, 7) + '-01', brand, nso, nsi]);
    });
    if (errs.length) { flash('danger', errs.slice(0, 10).map(esc).join('<br>') + (errs.length > 10 ? `<br>... dan ${errs.length - 10} error lain` : '')); render(); return; }
    const now = new Date().toISOString();
    const ups = DB.state.salesUploads || (DB.state.salesUploads = []);
    for (const [cid, m, b, so, si] of ok) {
      const byMonth = DB.state.sales[cid] || (DB.state.sales[cid] = {});
      (byMonth[m] || (byMonth[m] = {}))[b] = [so, si];
      const u = ups.find((x) => x.period === m); if (u) u.uploaded_at = now; else ups.push({ period: m, uploaded_at: now });
    }
    done('success', `${ok.length} baris sell out berhasil di-upload / diperbarui.`, '/master/sales');
  };

  route('/master/stores', ({}, q, { user }) => {
    const months = window.Engine.monthsBetween('2026-07-01', '2027-06-01');
    const stores = DB.t('stores').filter((s) => inScope(user, s) && (!q.channel || s.channel_code === q.channel) &&
      (!q.q || (s.name + ' ' + s.customer_id).toLowerCase().includes(q.q.toLowerCase())));
    const so12 = (cid) => months.reduce((t, m) => t + Object.values((DB.state.sales[cid] || {})[m] || {}).reduce((a, v) => a + v[0], 0), 0);
    return {
      title: 'Master Toko', html: `<div class="page-head"><div><h1>Master Toko</h1><div class="sub">${stores.length} toko dalam scope Anda</div></div></div>
      <form class="card card-body py-2 mb-3 d-flex flex-row gap-2" data-action="filter" data-path="/master/stores">
        <select name="channel" class="form-control form-control-sm" style="width:auto"><option value="">Semua channel</option>
          ${DB.t('channels').map((c) => `<option value="${c.code}" ${h.sel(q.channel === c.code)}>${esc(c.name)}</option>`).join('')}</select>
        <input name="q" class="form-control form-control-sm" style="max-width:260px" placeholder="Cari nama / ID" value="${esc(q.q)}">
        <button class="btn btn-sm btn-outline-brand">Cari</button></form>
      <div class="card"><div class="table-responsive"><table class="table table-sm table-hover mb-0">
        <thead><tr><th>ID</th><th>Nama</th><th>Channel</th><th>DC</th><th>Kota</th><th>NPWP</th><th>Rekening</th><th class="num">Sell out 12 bln</th></tr></thead>
        <tbody>${stores.map((s) => `<tr><td><code>${s.customer_id}</code></td><td>${esc(s.name)}</td><td>${esc((DB.t('channels').find((c) => c.code === s.channel_code) || {}).name)}</td>
          <td>${esc((DB.t('dcs').find((d) => d.code === s.dc_code) || {}).name)}</td><td>${esc(s.city)}</td><td class="small">${esc(s.npwp_no || '-')}</td>
          <td class="small">${esc(s.bank_name)} ${esc(s.bank_account_no)}</td><td class="num">${h.rpShort(so12(s.customer_id))}</td></tr>`).join('')}</tbody></table></div></div>`,
    };
  });

  route('/master/data', () => {
    UI.requireRole('ADMIN_HO');
    const box = (kind, title, list) => `<div class="col-lg-6"><div class="card"><div class="card-header">${title}</div><div class="card-body">
      <table class="table table-sm table-bordered"><thead><tr><th>Kode</th><th>Nama</th><th>Status</th><th></th></tr></thead><tbody>
        ${list.map((x) => `<tr class="${x.is_active ? '' : 'text-muted'}"><td><code>${esc(x.code)}</code></td><td>${esc(x.name)}</td><td>${x.is_active ? 'Aktif' : 'Nonaktif'}</td>
          <td class="text-right"><a href="#" class="btn btn-sm btn-link" data-click="master.toggle" data-kind="${kind}" data-code="${esc(x.code)}">${x.is_active ? 'Nonaktifkan' : 'Aktifkan'}</a></td></tr>`).join('')}</tbody></table>
      <form data-action="master.add" data-kind="${kind}" class="row g-2">
        <div class="col-4"><input name="code" class="form-control form-control-sm text-uppercase" placeholder="Kode" required></div>
        <div class="col-5"><input name="name" class="form-control form-control-sm" placeholder="Nama" required></div>
        <div class="col-3"><button class="btn btn-sm btn-brand w-100">Tambah</button></div></form></div></div></div>`;
    return {
      title: 'Channel & Brand', html: `<div class="page-head"><div><h1>Channel & Brand</h1><div class="sub">Channel/brand baru bisa ditambahkan tanpa ubah kode.</div></div></div>
      <div class="row g-3">${box('channels', 'Channel', DB.t('channels'))}${box('brands', 'Brand', DB.t('brands'))}
        <div class="col-12"><div class="card"><div class="card-header">DC</div><div class="card-body small">
          ${DB.t('dcs').map((d) => `<span class="badge badge-light mr-1">${d.code} · ${esc(d.name)} (${esc(d.region)})</span>`).join('')}</div></div></div></div>`,
    };
  });

  actions['master.add'] = (f, form) => {
    const kind = form.dataset.kind;
    const code = String(f.get('code') || '').trim().toUpperCase();
    const name = String(f.get('name') || '').trim();
    if (!/^[A-Z0-9_]{1,12}$/.test(code) || !name) throw new Error('Kode (maks 12, huruf besar/angka) & nama wajib diisi');
    const list = DB.t(kind);
    const ex = list.find((x) => x.code === code);
    if (ex) Object.assign(ex, { name, is_active: true }); else list.push({ code, name, sort: list.length + 1, is_active: true });
    done('success', `${kind === 'channels' ? 'Channel' : 'Brand'} ${esc(name)} disimpan.`, '/master/data');
  };
  clicks['master.toggle'] = (d) => {
    const x = DB.t(d.kind).find((y) => y.code === d.code);
    x.is_active = !x.is_active;
    DB.save(); render();
  };
})();
