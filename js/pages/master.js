// Master data: sell out bulanan (upload CSV), toko, channel & brand, library rumus (Admin IT).
(function () {
  const { h, route, actions, clicks, done, flash, render, inScope } = UI;
  const { esc } = h;

  route('/master/sales', () => {
    UI.requireSetup();
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
      title: 'Data Sell Out', html: `<div class="page-head"><div><h1>Data Sell Out Bulanan</h1><div class="sub">Data yang dikirim rutin tiap bulan. Dipakai untuk saran baseline & eligibility, achievement Monitoring, dan dasar rebate Payout.</div></div></div>
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
    for (const s of DB.t('stores').slice(0, 3)) for (const b of DB.t('brands').slice(0, 2)) rows.push([s.customer_id, '2027-07', b.code, 150000000, 153000000]);
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
      title: 'Master Toko', html: `<div class="cps cps-app"><div class="cps-list"><div class="page-head"><div><h1>Master Toko</h1><div class="sub">${stores.length} toko dalam scope Anda</div></div></div>
      <form class="card card-body py-2 mb-3 d-flex flex-row gap-2 cps-filter" data-action="filter" data-path="/master/stores">
        <select name="channel" class="form-control form-control-sm" style="width:auto"><option value="">Semua channel</option>
          ${DB.t('channels').map((c) => `<option value="${c.code}" ${h.sel(q.channel === c.code)}>${esc(c.name)}</option>`).join('')}</select>
        <input name="q" class="form-control form-control-sm" style="max-width:260px" placeholder="Cari nama / ID" value="${esc(q.q)}">
        <button class="btn btn-sm btn-outline-brand">Cari</button></form>
      <div class="card"><div class="table-responsive"><table class="table table-sm table-hover mb-0">
        <thead><tr><th>ID</th><th>Nama</th><th>Channel</th><th>DC</th><th>Kota</th><th class="num">Sell out 12 bln</th></tr></thead>
        <tbody>${stores.map((s) => `<tr><td><code>${s.customer_id}</code></td><td>${esc(s.name)}</td><td>${esc((DB.t('channels').find((c) => c.code === s.channel_code) || {}).name)}</td>
          <td>${esc((DB.t('dcs').find((d) => d.code === s.dc_code) || {}).name)}</td><td>${esc(s.city)}</td><td class="num">${h.rpShort(so12(s.customer_id))}</td></tr>`).join('')}</tbody></table></div></div></div></div>`,
    };
  });

  route('/master/data', () => {
    UI.requireSetup();
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

  // ---------------------------------------------------------------- library rumus
  // Rumus field form (mode "Dihitung") dibuat & diubah Admin IT; Admin HO hanya melihat dan memilihnya di Program Setup.
  const C = window.Catalog;
  const E = window.Engine;
  const isIT = () => UI.currentUser().role === 'SUPERADMIN';
  const PHASE_NAME = { REGISTRATION: 'Pendaftaran', MONITORING: 'Monitoring', PAYOUT: 'Pencairan' };
  const fmtFx = (v, type) => (type === 'PERCENT' ? h.pct(v * 100, 2) : type === 'RUPIAH' ? h.rp(Math.round(v)) : h.num(v, 2));
  function fxResult(expr, phase, type) {
    if (!expr) return '<span class="text-muted">isi rumus</span>';
    const samples = C.fieldFormulaSamples(phase);
    const r = window.Formula.check(expr, samples);
    if (!r.isValid) return `<span class="text-danger">${esc(r.errors.join(', '))}</span>`;
    try { return `<span class="text-success">valid</span> · contoh = <strong>${esc(fmtFx(window.Formula.evaluate(expr, samples), type))}</strong>`; } catch (e) { return `<span class="text-danger">${esc(e.message)}</span>`; }
  }
  const usageOf = (id) => DB.where('programPhaseFields', (f) => f.formula_id === id).length;

  route('/master/formulas', ({}, q) => {
    UI.requireSetup();
    const it = isIT();
    const list = E.formulaLibrary();
    const edit = it && q.edit ? (q.edit === 'new' ? { id: null, name: '', phase: 'REGISTRATION', data_type: 'RUPIAH', expression: '', description: '' } : list.find((x) => x.id === Number(q.edit))) : null;
    const phases = Object.keys(C.FIELD_FORMULA_VARS);
    const ref = (phase) => {
      const vars = C.FIELD_FORMULA_VARS[phase] || [];
      return `<div class="row g-3"><div class="col-lg-7"><div class="fx-h">Variabel ${esc(PHASE_NAME[phase])} <span class="text-muted fw-normal">${it && edit ? '· klik untuk menyisipkan' : ''}</span></div>
        <table class="table table-sm fx-table mb-0"><tbody>${vars.map((x) => `<tr><td>${it && edit ? `<button type="button" class="fx-chip" data-ins="${x.code}">${x.code}</button>` : `<code>${x.code}</code>`}</td>
          <td>${esc(x.label)}<div class="small text-muted">${esc(x.unit)} · contoh ${esc(x.unit === 'Rp' ? h.rp(x.sample) : String(x.sample).replace('.', ','))}</div></td></tr>`).join('')}</tbody></table>
        <div class="small text-muted mt-1">Persen ditulis pecahan: 1,5% = <code>0.015</code>. Pakai titik untuk desimal.</div></div>
        <div class="col-lg-5"><div class="fx-h">Fungsi &amp; operator</div>
        <table class="table table-sm fx-table mb-0"><tbody>${C.FORMULA_FUNCTIONS.map(([fn, d, ex]) => `<tr><td class="text-nowrap"><code>${esc(fn)}</code></td><td>${esc(d)}<div class="small text-muted"><code>${esc(ex)}</code></div></td></tr>`).join('')}</tbody></table></div></div>`;
    };
    return {
      title: 'Library rumus', html: `
      <div class="page-head"><div><h1>Library rumus</h1><div class="sub">Rumus untuk field form bermode <em>Dihitung</em>. ${it ? 'Anda (Admin IT) dapat membuat & mengubah rumus.' : 'Hanya Admin IT yang dapat membuat & mengubah rumus; Admin HO memilihnya di Program Setup → Form & approval.'}</div></div>
        ${it && !edit ? '<a href="#/master/formulas?edit=new" class="btn btn-brand"><i class="bi bi-plus"></i> Rumus baru</a>' : ''}</div>
      ${edit ? `<form data-action="formula.save" data-id="${edit.id || ''}" class="card mb-3"><div class="card-header">${edit.id ? 'Ubah rumus' : 'Rumus baru'}</div><div class="card-body">
        <div class="row g-2">
          <div class="col-md-4"><label class="form-label">Nama rumus <span class="text-danger">*</span></label><input name="name" class="form-control" value="${esc(edit.name)}" required placeholder="mis. Target setahun"></div>
          <div class="col-md-2"><label class="form-label">Fase</label><select name="phase" class="form-control">${phases.map((x) => `<option value="${x}" ${h.sel(edit.phase === x)}>${PHASE_NAME[x]}</option>`).join('')}</select></div>
          <div class="col-md-2"><label class="form-label">Tipe hasil</label><select name="data_type" id="fxType" class="form-control">${C.CALC_TYPES.map((x) => `<option value="${x}" ${h.sel(edit.data_type === x)}>${C.FIELD_TYPES[x]}</option>`).join('')}</select></div>
          <div class="col-md-4"><label class="form-label">Keterangan</label><input name="description" class="form-control" value="${esc(edit.description || '')}" placeholder="untuk Admin HO, mis. dipakai di MoU"></div>
          <div class="col-12"><label class="form-label">Rumus <span class="text-danger">*</span></label><input name="expression" id="fxExpr" class="form-control text-monospace" value="${esc(edit.expression)}" placeholder="mis. target * months" autocomplete="off">
            <div class="small mt-1" id="fxRes">${fxResult(edit.expression, edit.phase, edit.data_type)}</div>
            ${edit.id && usageOf(edit.id) ? `<div class="small text-warning mt-1">Dipakai di ${usageOf(edit.id)} field form. Form yang sudah disimpan tetap memakai versi lama sampai disimpan ulang oleh Admin HO.</div>` : ''}</div>
        </div>
        <div class="fx-guide mt-3">${ref(edit.phase)}</div>
        <div class="d-flex gap-2 mt-3"><button class="btn btn-brand"><i class="bi bi-save"></i> Simpan rumus</button><a href="#/master/formulas" class="btn btn-outline-secondary">Batal</a></div>
      </div></form>` : ''}
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-hover mb-0">
        <thead><tr><th>Nama</th><th>Fase</th><th>Tipe</th><th>Rumus</th><th>Contoh hasil</th><th class="num">Dipakai</th><th>Status</th>${it ? '<th></th>' : ''}</tr></thead>
        <tbody>${list.map((x) => `<tr class="${x.is_active ? '' : 'text-muted'}"><td class="fw-semibold">${esc(x.name)}${x.description ? `<div class="small text-muted fw-normal">${esc(x.description)}</div>` : ''}</td>
          <td>${PHASE_NAME[x.phase] || x.phase}</td><td>${C.FIELD_TYPES[x.data_type]}</td><td><code class="fx-code">${esc(x.expression)}</code></td>
          <td class="small">${fxResult(x.expression, x.phase, x.data_type)}</td><td class="num">${usageOf(x.id)} field</td>
          <td>${x.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-secondary">Nonaktif</span>'}</td>
          ${it ? `<td class="text-nowrap text-right"><a href="#/master/formulas?edit=${x.id}" class="btn btn-sm btn-outline-brand">Ubah</a>
            <a href="#" class="btn btn-sm btn-link" data-click="formula.toggle" data-id="${x.id}">${x.is_active ? 'Nonaktifkan' : 'Aktifkan'}</a></td>` : ''}</tr>`).join('')
          || `<tr><td colspan="${it ? 8 : 7}" class="text-center text-muted py-4">Belum ada rumus.</td></tr>`}</tbody></table></div></div>
      ${edit ? '' : `<div class="card mt-3"><div class="card-header">Panduan penulisan rumus</div><div class="card-body">${ref('REGISTRATION')}</div></div>`}`,
      after(root) {
        const expr = root.querySelector('#fxExpr'); if (!expr) return;
        const form = expr.closest('form');
        const upd = () => { root.querySelector('#fxRes').innerHTML = fxResult(expr.value, form.phase.value, form.data_type.value); };
        expr.addEventListener('input', upd);
        form.addEventListener('change', upd);
        form.addEventListener('mousedown', (e) => { if (e.target.closest('[data-ins]')) e.preventDefault(); });
        form.addEventListener('click', (e) => {
          const b = e.target.closest('[data-ins]'); if (!b) return;
          const s = expr.selectionStart ?? expr.value.length; const t = expr.selectionEnd ?? expr.value.length;
          expr.value = expr.value.slice(0, s) + b.dataset.ins + expr.value.slice(t);
          expr.focus(); expr.setSelectionRange(s + b.dataset.ins.length, s + b.dataset.ins.length);
          upd();
        });
      },
    };
  });
  actions['formula.save'] = (f, form) => {
    if (!isIT()) throw new Error('Hanya Admin IT yang dapat membuat atau mengubah rumus.');
    const id = Number(form.dataset.id) || null;
    const v = { name: String(f.get('name') || '').trim(), phase: f.get('phase'), data_type: f.get('data_type'), expression: String(f.get('expression') || '').trim(), description: String(f.get('description') || '').trim() || null };
    if (!v.name) throw new Error('Nama rumus wajib diisi');
    if (!C.FIELD_FORMULA_VARS[v.phase]) throw new Error('Fase tidak mendukung field rumus');
    if (!C.CALC_TYPES.includes(v.data_type)) throw new Error('Tipe hasil tidak dikenal');
    const r = window.Formula.check(v.expression, C.fieldFormulaSamples(v.phase));
    if (!r.isValid) throw new Error(`Rumus tidak valid: ${r.errors.join(', ')}`);
    const list = E.formulaLibrary();
    if (list.some((x) => x.id !== id && x.name.toLowerCase() === v.name.toLowerCase())) throw new Error('Nama rumus sudah dipakai');
    Object.assign(v, { updated_by: UI.currentUser().id, updated_at: new Date().toISOString() });
    if (id) Object.assign(DB.byId('formulaLibrary', id), v); else DB.insert('formulaLibrary', Object.assign({ is_active: true }, v));
    done('success', `Rumus "${esc(v.name)}" disimpan.`, '/master/formulas');
  };
  clicks['formula.toggle'] = (d) => {
    if (!isIT()) throw new Error('Hanya Admin IT yang dapat mengubah rumus.');
    const x = DB.byId('formulaLibrary', d.id); if (!x) return;
    x.is_active = !x.is_active;
    x.updated_by = UI.currentUser().id; x.updated_at = new Date().toISOString();
    done('success', `Rumus "${esc(x.name)}" ${x.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`, '/master/formulas');
  };
})();
