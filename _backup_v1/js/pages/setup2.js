// Setup Program bagian 2: kolom input, pencairan, alur approval, review & aktivasi.
(function () {
  const { h, route, actions, clicks, done, render } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;
  const { getProgram, nav, checklist, slugKey } = window.SetupShared;

  const chName = (p, id) => (id ? (p.channels.find((c) => c.id === id) || {}).channel_name : 'Semua channel');

  // ---------------------------------------------------------------- kolom input dinamis
  route('/setup/:id/fields', ({ id }, q) => {
    const p = getProgram(id);
    const e = (q.edit && p.fields.find((f) => f.id === Number(q.edit))) || { id: '', stage: 'registration', key: '', label: '', field_type: 'text', required: false, options: [], help: '', sort: 0, program_channel_id: null };
    const table = (stage, label, note) => {
      const list = p.fields.filter((f) => f.stage === stage);
      return `<div class="card mb-3"><div class="card-header">${label}</div><div class="card-body"><p class="small text-muted">${note}</p>
        <table class="table table-sm table-bordered"><thead><tr><th>#</th><th>Label</th><th>Key</th><th>Tipe</th><th>Channel</th><th>Wajib</th><th></th></tr></thead><tbody>
        ${list.map((f) => `<tr><td>${f.sort}</td><td>${esc(f.label)}${f.options ? `<div class="small text-muted">${esc(f.options.join(' / '))}</div>` : ''}</td>
          <td><code>${esc(f.key)}</code></td><td>${h.FIELD_TYPES[f.field_type]}</td><td>${esc(chName(p, f.program_channel_id))}</td>
          <td>${f.required ? '<i class="bi bi-check-lg text-success"></i>' : ''}</td>
          <td class="text-right text-nowrap"><a href="#/setup/${p.id}/fields?edit=${f.id}" class="btn btn-sm btn-link">Edit</a>
            <a href="#" class="btn btn-sm btn-link text-danger" data-click="setup.deleteField" data-id="${p.id}" data-fid="${f.id}" data-confirm="Hapus kolom ${esc(f.label)}?">Hapus</a></td></tr>`).join('')
          || '<tr><td colspan="7" class="text-muted">Belum ada kolom tambahan.</td></tr>'}</tbody></table></div></div>`;
    };
    return {
      title: 'Kolom Input', html: `${nav(p, 'fields')}
      <div class="row g-3"><div class="col-xl-7">
        ${table('registration', 'Form pendaftaran (diisi CBD)', 'Kolom sistem yang selalu ada: toko, baseline & kelas (otomatis), growth % (input CBD), target (otomatis).')}
        ${table('disbursement', 'Form pencairan', 'Kolom sistem yang selalu ada: realisasi lead measure sesuai kelas, NPWP, rekening bank.')}
        <div class="card"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-eye"></i> Preview form pendaftaran CBD</span>
          <select id="pvChannel" class="form-control form-control-sm" style="width:auto">${p.channels.map((c) => `<option value="${c.id}">${esc(c.channel_name)}</option>`).join('')}</select></div>
          <div class="card-body">${p.channels.map((ch) => `<div class="pv" data-ch="${ch.id}" style="display:none">
            <div class="row g-2 mb-3 small">
              <div class="col-4"><div class="bg-light rounded p-2">Baseline<br><strong>otomatis</strong></div></div>
              <div class="col-4"><div class="bg-light rounded p-2">Kelas<br><strong>otomatis</strong> (${esc(ch.classes.map((c) => c.name).join('/'))})</div></div>
              <div class="col-4"><div class="bg-light rounded p-2">Growth %<br><strong>input CBD</strong> (≥ min kelas)</div></div></div>
            ${E.fieldsFor(p, 'registration', ch.id).map((f) => UI.fieldInput(f, '', { disabled: true })).join('')}</div>`).join('') || '<span class="text-muted small">Belum ada channel.</span>'}</div></div>
      </div>
      <div class="col-xl-5"><div class="card sticky-summary"><div class="card-header">${e.id ? 'Edit kolom' : 'Tambah kolom'}</div><div class="card-body">
        <form data-action="setup.saveField" data-id="${p.id}" data-fid="${e.id}"><div class="row g-2">
          <div class="col-6"><label class="form-label">Tahap</label><select name="stage" class="form-control">
            <option value="registration" ${sel(e.stage === 'registration')}>Pendaftaran (CBD)</option><option value="disbursement" ${sel(e.stage === 'disbursement')}>Pencairan</option></select></div>
          <div class="col-6"><label class="form-label">Berlaku untuk</label><select name="program_channel_id" class="form-control"><option value="">Semua channel</option>
            ${p.channels.map((c) => `<option value="${c.id}" ${sel(e.program_channel_id === c.id)}>${esc(c.channel_name)}</option>`).join('')}</select></div>
          <div class="col-8"><label class="form-label">Label</label><input name="label" class="form-control" value="${esc(e.label)}" required></div>
          <div class="col-4"><label class="form-label">Urutan</label><input name="sort" type="number" class="form-control" value="${e.sort}"></div>
          <div class="col-6"><label class="form-label">Key</label><input name="key" class="form-control" value="${esc(e.key)}" placeholder="otomatis dari label"><div class="form-text">Bisa dipakai di rumus pencairan.</div></div>
          <div class="col-6"><label class="form-label">Tipe</label><select name="field_type" class="form-control" id="ftype">
            ${Object.entries(h.FIELD_TYPES).map(([k, v]) => `<option value="${k}" ${sel(e.field_type === k)}>${v}</option>`).join('')}</select></div>
          <div class="col-12" id="optBox"><label class="form-label">Pilihan (1 per baris)</label><textarea name="options" class="form-control" rows="3">${esc((e.options || []).join('\n'))}</textarea></div>
          <div class="col-12"><label class="form-label">Petunjuk</label><input name="help" class="form-control" value="${esc(e.help)}"></div>
          <div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" name="required" id="req" ${chk(e.required)}><label class="form-check-label" for="req">Wajib diisi</label></div></div>
        </div>
        <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan kolom</button>
        ${e.id ? `<a href="#/setup/${p.id}/fields" class="btn btn-link mt-3">Batal</a>` : ''}</form>
      </div></div></div></div>`,
      after(root) {
        const ft = root.querySelector('#ftype'); const ob = root.querySelector('#optBox');
        const syncOpt = () => { ob.style.display = ft.value === 'select' ? '' : 'none'; };
        ft.addEventListener('change', syncOpt); syncOpt();
        const pv = root.querySelector('#pvChannel');
        const syncPv = () => root.querySelectorAll('.pv').forEach((d) => { d.style.display = d.dataset.ch === pv.value ? '' : 'none'; });
        pv.addEventListener('change', syncPv); syncPv();
      },
    };
  });

  actions['setup.saveField'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const fid = Number(form.dataset.fid) || null;
    const label = String(f.get('label') || '').trim();
    const key = slugKey(f.get('key') || label);
    const type = f.get('field_type');
    const stage = f.get('stage') === 'disbursement' ? 'disbursement' : 'registration';
    const pcId = toNum(f.get('program_channel_id'));
    const options = type === 'select' ? String(f.get('options') || '').split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean) : null;
    if (!label || !key) throw new Error('Label wajib diisi');
    if (E.FORMULA_VARS.concat(['growth_pct', 'customer_id']).includes(key)) throw new Error(`Key "${key}" dipakai sistem, gunakan key lain`);
    if (type === 'select' && !options.length) throw new Error('Isi pilihan untuk tipe dropdown');
    if (DB.t('fields').some((x) => x.program_id === pid && x.id !== fid && x.stage === stage && x.key === key && x.program_channel_id === pcId)) {
      throw new Error(`Key "${key}" sudah dipakai di tahap & channel yang sama`);
    }
    const v = { program_id: pid, program_channel_id: pcId, stage, key, label, field_type: type, required: f.has('required'), options, help: f.get('help') || null, sort: toNum(f.get('sort')) ?? 0 };
    if (fid) Object.assign(DB.byId('fields', fid), v); else DB.insert('fields', v);
    done('success', `Kolom "${esc(label)}" disimpan.`, `/setup/${pid}/fields`);
  };
  clicks['setup.deleteField'] = (d) => {
    DB.remove('fields', (x) => x.id === Number(d.fid));
    done('success', 'Kolom dihapus (data lama tetap tersimpan di peserta).', `/setup/${d.id}/fields`);
  };

  // ---------------------------------------------------------------- pencairan
  function compSummary(c) {
    const k = c.config || {};
    const gate = k.min_achievement !== undefined && k.min_achievement !== null ? ` · syarat ≥ ${k.min_achievement}%` : '';
    if (c.comp_type === 'growth_rebate') {
      return `Rebate ${k.rebate_source === 'custom' ? h.pct(k.rebate_pct, 2) : '% sesuai kelas'} × ${k.base === 'target' ? 'target' : 'aktual'} periode. Tier:
        ${(k.tiers || []).map((t) => `<span class="badge badge-info mr-1">≥${t.min_achievement}% → bayar ${t.payout_pct}%</span>`).join('')}`;
    }
    if (c.comp_type === 'jtbd') return `Σ reward lead measure yang tercapai (reward % × ${k.base === 'target' ? 'target' : 'aktual'} + reward Rp)${gate}.`;
    if (c.comp_type === 'fixed') return Object.entries(k.amounts || {}).map(([cl, v]) => `<span class="mr-2">Kelas ${esc(cl)}: ${h.rp(v)}</span>`).join('') + gate;
    return `<code>${esc(k.expression)}</code>${gate}`;
  }

  route('/setup/:id/disbursement', ({ id }, q) => {
    const p = getProgram(id);
    const e = (q.edit && p.components.find((c) => c.id === Number(q.edit))) || { id: '', name: '', comp_type: 'growth_rebate', program_channel_id: null, period_ids: null, is_active: true,
      sort: p.components.length + 1, config: { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] } };
    const cfg = e.config || {};
    const classNames = [...new Set(p.channels.flatMap((c) => c.classes.map((x) => x.name)))];
    const perName = (ids) => (!ids || !ids.length ? 'Semua periode' : ids.map((i) => (p.periods.find((x) => x.id === i) || {}).name).join(', '));
    const pers = p.periods.length ? p.periods : [{ id: '', name: '', achieve_start: '', achieve_end: '', claim_start: '', claim_end: '' }];
    const tiers = cfg.tiers && cfg.tiers.length ? cfg.tiers : [{ min_achievement: 100, payout_pct: 100 }];
    const vars = E.FORMULA_VARS.concat(p.fields.filter((f) => ['number', 'currency', 'percent'].includes(f.field_type)).map((f) => f.key));
    return {
      title: 'Pencairan', html: `${nav(p, 'disbursement')}
      <div class="card mb-3"><div class="card-header">Periode pencairan</div><div class="card-body">
        <form data-action="setup.savePeriods" data-id="${p.id}">
          <table class="table table-sm table-bordered" id="perTable"><thead><tr><th>Nama</th><th>Pencapaian dihitung dari</th><th>s/d</th><th>Klaim dibuka</th><th>Klaim ditutup</th><th></th></tr></thead>
            <tbody>${pers.map((x) => `<tr>
              <td><input type="hidden" name="period_id" value="${x.id}"><input name="period_name" class="form-control form-control-sm" value="${esc(x.name)}" placeholder="Semester 1"></td>
              <td><input type="date" name="achieve_start" class="form-control form-control-sm" value="${x.achieve_start || ''}"></td>
              <td><input type="date" name="achieve_end" class="form-control form-control-sm" value="${x.achieve_end || ''}"></td>
              <td><input type="date" name="claim_start" class="form-control form-control-sm" value="${x.claim_start || ''}"></td>
              <td><input type="date" name="claim_end" class="form-control form-control-sm" value="${x.claim_end || ''}"></td>
              <td><button type="button" class="btn btn-sm btn-link text-danger del-row"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addPer"><i class="bi bi-plus"></i> Periode</button>
          <button class="btn btn-sm btn-brand"><i class="bi bi-save"></i> Simpan periode</button>
          <span class="form-text ml-2">Bisa semester, kuartal, atau bulanan. Target periode = target bulanan × jumlah bulan.</span>
        </form></div></div>
      <div class="row g-3"><div class="col-xl-7">
        <div class="card mb-3"><div class="card-header">Komponen hitungan pencairan</div><div class="card-body">
          <p class="small text-muted">Total pencairan = jumlah semua komponen aktif yang berlaku untuk channel & periode peserta, lalu dipotong pajak (${p.tax_rate_npwp}% NPWP / ${p.tax_rate_non_npwp}% non-NPWP).</p>
          ${p.components.map((c) => `<div class="border rounded p-2 mb-2 ${c.is_active ? '' : 'opacity-50'}"><div class="d-flex justify-content-between"><div>
              <strong>${c.sort}. ${esc(c.name)}</strong> <span class="badge badge-light">${h.COMP_TYPES[c.comp_type]}</span>${c.is_active ? '' : ' <span class="badge badge-secondary">nonaktif</span>'}
              <div class="small text-muted">${esc(chName(p, c.program_channel_id))} · ${esc(perName(c.period_ids))}</div></div>
            <div class="text-nowrap"><a href="#/setup/${p.id}/disbursement?edit=${c.id}" class="btn btn-sm btn-link">Edit</a>
              <a href="#" class="btn btn-sm btn-link text-danger" data-click="setup.deleteComp" data-id="${p.id}" data-cid="${c.id}" data-confirm="Hapus komponen ${esc(c.name)}?">Hapus</a></div></div>
            <div class="small mt-1">${compSummary(c)}</div></div>`).join('') || '<div class="text-muted">Belum ada komponen.</div>'}
        </div></div>
        <div class="card"><div class="card-header"><i class="bi bi-calculator"></i> Simulasi hitungan</div><div class="card-body">
          <div class="row g-2 align-items-end">
            <div class="col-md-3"><label class="form-label small">Channel</label><select id="sChannel" class="form-control form-control-sm">${p.channels.map((c) => `<option value="${c.id}">${esc(c.channel_name)}</option>`).join('')}</select></div>
            <div class="col-md-3"><label class="form-label small">Periode</label><select id="sPeriod" class="form-control form-control-sm">${p.periods.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>
            <div class="col-md-3"><label class="form-label small">Baseline / bulan</label><input id="sBase" type="number" class="form-control form-control-sm" value="70000000"></div>
            <div class="col-md-3"><label class="form-label small">Growth % (kosong = min)</label><input id="sGrowth" type="number" class="form-control form-control-sm"></div>
            <div class="col-md-4"><label class="form-label small">Pencapaian %</label><input id="sAch" type="range" min="50" max="150" value="105" class="custom-range"><span id="sAchV">105%</span></div>
            <div class="col-md-5"><div class="form-check"><input type="checkbox" id="sLm" class="form-check-input" checked><label for="sLm" class="form-check-label small">Semua lead measure tercapai</label></div></div>
            <div class="col-md-3"><button type="button" id="sRun" class="btn btn-sm btn-outline-brand w-100">Hitung</button></div>
          </div><div id="sOut" class="mt-3 small"></div></div></div>
      </div>
      <div class="col-xl-5"><div class="card sticky-summary"><div class="card-header">${e.id ? 'Edit komponen' : 'Tambah komponen'}</div><div class="card-body">
        <form data-action="setup.saveComp" data-id="${p.id}" data-cid="${e.id}"><div class="row g-2">
          <div class="col-8"><label class="form-label">Nama</label><input name="name" class="form-control" value="${esc(e.name)}" required></div>
          <div class="col-4"><label class="form-label">Urutan</label><input name="sort" type="number" class="form-control" value="${e.sort}"></div>
          <div class="col-12"><label class="form-label">Tipe</label><select name="comp_type" id="ctype" class="form-control">${Object.entries(h.COMP_TYPES).map(([k, v]) => `<option value="${k}" ${sel(e.comp_type === k)}>${v}</option>`).join('')}</select></div>
          <div class="col-6"><label class="form-label">Channel</label><select name="program_channel_id" class="form-control"><option value="">Semua channel</option>
            ${p.channels.map((c) => `<option value="${c.id}" ${sel(e.program_channel_id === c.id)}>${esc(c.channel_name)}</option>`).join('')}</select></div>
          <div class="col-6"><label class="form-label">Dasar %</label><select name="base" class="form-control"><option value="actual" ${sel(cfg.base !== 'target')}>Aktual periode</option><option value="target" ${sel(cfg.base === 'target')}>Target periode</option></select></div>
          <div class="col-12"><label class="form-label">Periode berlaku</label><div class="d-flex gap-3 flex-wrap">
            ${p.periods.map((x) => `<div class="form-check"><input class="form-check-input" type="checkbox" name="period_ids" value="${x.id}" id="pp${x.id}" ${chk(e.period_ids && e.period_ids.includes(x.id))}><label class="form-check-label" for="pp${x.id}">${esc(x.name)}</label></div>`).join('')}</div>
            <div class="form-text">Tidak dicentang = semua periode.</div></div>
          <div class="col-12 cfg cfg-growth_rebate"><hr class="my-2"><label class="form-label">Persentase rebate</label>
            <div class="input-group mb-2"><select name="rebate_source" class="form-control"><option value="class" ${sel(cfg.rebate_source !== 'custom')}>Ikut rebate % kelas</option><option value="custom" ${sel(cfg.rebate_source === 'custom')}>Angka khusus</option></select>
              <input name="rebate_pct" type="number" step="any" class="form-control" value="${cfg.rebate_pct || ''}" placeholder="%"></div>
            <label class="form-label">Tier pencapaian → % dibayar</label>
            <div id="tiers">${tiers.map((t) => `<div class="input-group input-group-sm mb-1 tier"><span class="input-group-text">Pencapaian ≥</span>
              <input name="tier_min" type="number" step="any" class="form-control" value="${t.min_achievement}"><span class="input-group-text">% bayar</span>
              <input name="tier_payout" type="number" step="any" class="form-control" value="${t.payout_pct}"><span class="input-group-text">%</span>
              <button type="button" class="btn btn-outline-danger del-tier"><i class="bi bi-x"></i></button></div>`).join('')}</div>
            <button type="button" id="addTier" class="btn btn-sm btn-link px-0">+ tier</button></div>
          <div class="col-12 cfg cfg-jtbd cfg-fixed cfg-formula"><hr class="my-2"><label class="form-label">Syarat pencapaian minimal (%)</label>
            <input name="min_achievement" type="number" step="any" class="form-control" value="${cfg.min_achievement === undefined || cfg.min_achievement === null ? '' : cfg.min_achievement}" placeholder="kosong = tanpa syarat"></div>
          <div class="col-12 cfg cfg-fixed"><label class="form-label mt-2">Nominal per kelas (Rp)</label>
            ${classNames.map((cl) => `<div class="input-group input-group-sm mb-1"><span class="input-group-text" style="width:90px">Kelas ${esc(cl)}</span>
              <input name="amount_${esc(cl)}" type="number" step="any" class="form-control" value="${(cfg.amounts || {})[cl] || ''}"></div>`).join('')}</div>
          <div class="col-12 cfg cfg-formula"><label class="form-label mt-2">Rumus</label>
            <textarea name="expression" class="form-control text-monospace" rows="3" placeholder="achievement >= 110 ? (actual - target) * 0.01 : 0">${esc(cfg.expression)}</textarea>
            <div class="form-text formula-vars">Variabel (klik untuk sisip): ${vars.map((v) => `<code class="mr-1">${esc(v)}</code>`).join('')}
              <br>Fungsi: <code>min max round floor ceil abs if(k,a,b)</code>, operator <code>+ - * / ? : &gt;= &amp;&amp; ||</code>.
              Contoh komponen promosi: <code>promo_budget * 0.5</code> (buat kolom angka dengan key <code>promo_budget</code>).</div></div>
          <div class="col-12"><div class="form-check form-switch mt-2"><input class="form-check-input" type="checkbox" name="is_active" id="act" ${chk(e.is_active)}><label class="form-check-label" for="act">Aktif</label></div></div>
        </div>
        <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan komponen</button>
        ${e.id ? `<a href="#/setup/${p.id}/disbursement" class="btn btn-link mt-3">Batal</a>` : ''}</form>
      </div></div></div></div>`,
      after(root) {
        const ptb = root.querySelector('#perTable tbody');
        root.querySelector('#addPer').addEventListener('click', () => { const tr = ptb.rows[ptb.rows.length - 1].cloneNode(true); tr.querySelectorAll('input').forEach((i) => { i.value = ''; }); ptb.appendChild(tr); });
        ptb.addEventListener('click', (ev) => { const b = ev.target.closest('.del-row'); if (b && ptb.rows.length > 1) b.closest('tr').remove(); });
        const ct = root.querySelector('#ctype');
        const syncCfg = () => root.querySelectorAll('.cfg').forEach((d) => { d.style.display = d.classList.contains('cfg-' + ct.value) ? '' : 'none'; });
        ct.addEventListener('change', syncCfg); syncCfg();
        const tiersEl = root.querySelector('#tiers');
        root.querySelector('#addTier').addEventListener('click', () => { const t = tiersEl.querySelector('.tier').cloneNode(true); t.querySelectorAll('input').forEach((i) => { i.value = ''; }); tiersEl.appendChild(t); });
        tiersEl.addEventListener('click', (ev) => { const b = ev.target.closest('.del-tier'); if (b && tiersEl.children.length > 1) b.closest('.tier').remove(); });
        root.querySelectorAll('.formula-vars code').forEach((c) => c.addEventListener('click', () => {
          const ta = root.querySelector('[name=expression]'); ta.value += (ta.value && !ta.value.endsWith(' ') ? ' ' : '') + c.textContent; ta.focus();
        }));
        const ach = root.querySelector('#sAch');
        ach.addEventListener('input', () => { root.querySelector('#sAchV').textContent = ach.value + '%'; });
        root.querySelector('#sRun').addEventListener('click', () => {
          const out = root.querySelector('#sOut');
          const r = simulate(p.id, Number(root.querySelector('#sChannel').value), Number(root.querySelector('#sPeriod').value),
            toNum(root.querySelector('#sBase').value) ?? 0, toNum(root.querySelector('#sGrowth').value), Number(ach.value), root.querySelector('#sLm').checked);
          if (r.error) { out.innerHTML = `<span class="text-danger">${esc(r.error)}</span>`; return; }
          out.innerHTML = `<div class="mb-2">Kelas ${h.cls(r.cls)} · growth ${r.growth}% · target periode <strong>${h.rp(Math.round(r.target))}</strong> · aktual ${h.rp(Math.round(r.actual))} (${h.num(r.achievement, 1)}%)</div>
            <table class="table table-sm mb-0">${r.lines.map((l) => `<tr><td>${esc(l.name)}<div class="text-muted">${esc(l.detail)}</div></td><td class="num">${h.rp(l.amount)}</td></tr>`).join('')}
            <tr class="fw-semibold"><td>Bruto</td><td class="num">${h.rp(r.gross)}</td></tr><tr><td>Pajak (${r.taxRate}%)</td><td class="num">-${h.rp(r.tax)}</td></tr>
            <tr class="fw-bold text-brand"><td>Netto</td><td class="num">${h.rp(r.net)}</td></tr></table>`;
        });
      },
    };
  });

  function simulate(pid, pcId, periodId, baseline, growthIn, achievement, lmAll) {
    const p = E.loadProgram(pid);
    const pc = p.channels.find((c) => c.id === pcId);
    const period = p.periods.find((x) => x.id === periodId);
    if (!pc || !period) return { error: 'Pilih channel & periode' };
    const cl = E.pickClass(pc.classes, baseline);
    if (!cl) return { error: 'Baseline tidak masuk kelas manapun' };
    const growth = growthIn ?? cl.min_growth;
    const t = E.computeTarget(baseline, growth, p.programMonths);
    const months = E.monthsBetween(period.achieve_start, period.achieve_end).length;
    const actual = t.monthly * months * achievement / 100;
    const lmValues = {};
    for (const lm of p.leadMeasures) {
      const prm = lm.params[cl.id];
      if (prm && lmAll) lmValues[lm.id] = lm.input_type === 'yesno' ? 'Ya' : (lm.input_type === 'number' ? prm.target_value : 'ok');
    }
    const r = E.computeDisbursement({ program: p, period, actual, lmValues, data: {}, hasNpwp: true,
      participant: { program_channel_id: pc.id, class_id: cl.id, class_name: cl.name, baseline, growth_pct: growth, target_monthly: t.monthly, data: {} } });
    return Object.assign(r, { cls: cl.name, growth });
  }

  actions['setup.savePeriods'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const ids = f.all('period_id');
    const rows = f.all('period_name').map((n, i) => ({ id: toNum(ids[i]), name: n.trim(), achieve_start: f.all('achieve_start')[i], achieve_end: f.all('achieve_end')[i],
      claim_start: f.all('claim_start')[i] || null, claim_end: f.all('claim_end')[i] || null })).filter((r) => r.name);
    for (const r of rows) if (!r.achieve_start || !r.achieve_end || r.achieve_start > r.achieve_end) throw new Error(`Periode "${r.name}": tanggal pencapaian tidak valid`);
    const existing = DB.where('periods', (x) => x.program_id === pid);
    const keep = rows.map((r) => r.id).filter(Boolean);
    const removed = existing.filter((x) => !keep.includes(x.id)).map((x) => x.id);
    if (DB.t('disbursements').some((d) => removed.includes(d.period_id))) throw new Error('Periode yang sudah punya pencairan tidak bisa dihapus.');
    DB.remove('periods', (x) => removed.includes(x.id));
    rows.forEach((r, i) => {
      const v = { name: r.name, achieve_start: r.achieve_start, achieve_end: r.achieve_end, claim_start: r.claim_start, claim_end: r.claim_end, sort: i };
      const ex = r.id && DB.byId('periods', r.id);
      if (ex) Object.assign(ex, v); else DB.insert('periods', Object.assign({ program_id: pid }, v));
    });
    done('success', 'Periode pencairan disimpan.', `/setup/${pid}/disbursement`);
  };

  actions['setup.saveComp'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const cid = Number(form.dataset.cid) || null;
    const p = E.loadProgram(pid);
    const type = f.get('comp_type');
    const name = String(f.get('name') || '').trim();
    if (!name) throw new Error('Nama komponen wajib diisi');
    const config = { base: f.get('base') === 'target' ? 'target' : 'actual' };
    const minAch = toNum(f.get('min_achievement'));
    if (type === 'growth_rebate') {
      config.rebate_source = f.get('rebate_source') === 'custom' ? 'custom' : 'class';
      config.rebate_pct = toNum(f.get('rebate_pct')) ?? 0;
      config.tiers = f.all('tier_min').map((m, i) => ({ min_achievement: toNum(m), payout_pct: toNum(f.all('tier_payout')[i]) })).filter((t) => t.min_achievement !== null && t.payout_pct !== null);
      if (!config.tiers.length) throw new Error('Isi minimal 1 tier pencapaian');
    } else {
      if (minAch !== null) config.min_achievement = minAch;
      if (type === 'fixed') {
        config.amounts = {};
        for (const [k, v] of f.entries()) if (k.startsWith('amount_')) config.amounts[k.slice(7)] = toNum(v) ?? 0;
      } else if (type === 'formula') {
        config.expression = String(f.get('expression') || '').trim();
        const err = window.Formula.validate(config.expression, E.FORMULA_VARS.concat(p.fields.map((x) => x.key)));
        if (err) throw new Error(`Rumus tidak valid: ${err}`);
      }
    }
    const periodIds = f.all('period_ids').map(Number).filter(Boolean);
    const v = { program_id: pid, program_channel_id: toNum(f.get('program_channel_id')), name, comp_type: type, config,
      period_ids: periodIds.length ? periodIds : null, is_active: f.has('is_active'), sort: toNum(f.get('sort')) ?? 0 };
    if (cid) Object.assign(DB.byId('components', cid), v); else DB.insert('components', v);
    done('success', `Komponen "${esc(name)}" disimpan.`, `/setup/${pid}/disbursement`);
  };
  clicks['setup.deleteComp'] = (d) => {
    DB.remove('components', (x) => x.id === Number(d.cid));
    done('success', 'Komponen dihapus.', `/setup/${d.id}/disbursement`);
  };

  // ---------------------------------------------------------------- alur approval
  route('/setup/:id/workflow', ({ id }) => {
    const p = getProgram(id);
    const col = (phase, title, start, end, emptyNote) => {
      const steps = E.stepsOf(p, phase);
      return `<div class="col-lg-6"><div class="card h-100"><div class="card-header">${title}</div><div class="card-body">
        <div class="d-flex flex-column gap-2"><div class="p-2 rounded bg-light small"><i class="bi bi-send"></i> ${start}</div>
          ${steps.map((s, i) => `<div class="text-center text-muted"><i class="bi bi-arrow-down"></i></div>
            <div class="p-2 rounded border d-flex align-items-center gap-2"><span class="badge badge-primary">${i + 1}</span>
              <div class="flex-grow-1"><strong>${esc(s.name)}</strong><div class="small text-muted">oleh ${h.ROLE_LABEL[s.role]}</div></div>
              <button class="btn btn-sm btn-link px-1" data-click="setup.step" data-act="up" data-id="${p.id}" data-sid="${s.id}" ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
              <button class="btn btn-sm btn-link px-1" data-click="setup.step" data-act="down" data-id="${p.id}" data-sid="${s.id}" ${i === steps.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
              <button class="btn btn-sm btn-link text-danger px-1" data-click="setup.step" data-act="delete" data-id="${p.id}" data-sid="${s.id}" data-confirm="Hapus tahap ${esc(s.name)}?"><i class="bi bi-trash"></i></button>
            </div>`).join('')}
          <div class="text-center text-muted"><i class="bi bi-arrow-down"></i></div><div class="p-2 rounded small bg-success-subtle"><i class="bi bi-check-circle"></i> ${end}</div></div>
        ${steps.length ? '' : `<div class="small text-muted mt-2">${emptyNote}</div>`}
        <form data-action="setup.addStep" data-id="${p.id}" data-phase="${phase}" class="row g-2 mt-3">
          <div class="col-6"><input name="name" class="form-control form-control-sm" placeholder="Nama tahap, mis. Approval RSM" required></div>
          <div class="col-4"><select name="role" class="form-control form-control-sm">${Object.entries(h.ROLE_LABEL).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="col-2"><button class="btn btn-sm btn-brand w-100">Tambah</button></div></form>
        <div class="form-text">Di setiap tahap approver bisa <strong>setuju</strong>, <strong>kembalikan</strong> (pengaju revisi & kirim ulang dari tahap pertama), atau <strong>tolak</strong>.</div>
      </div></div></div>`;
    };
    return {
      title: 'Alur Approval', html: `${nav(p, 'workflow')}<div class="row g-3">
        ${col('registration', 'Alur pendaftaran toko', 'CBD mendaftarkan toko', 'Peserta aktif', 'Tanpa tahapan: toko langsung aktif begitu CBD submit.')}
        ${col('disbursement', 'Alur pencairan', `${h.ROLE_LABEL[p.disbursement_submitter_role]} mengajukan pencairan`, 'Cair', 'Tanpa tahapan: pencairan langsung berstatus cair.')}</div>`,
    };
  });

  actions['setup.addStep'] = (f, form) => {
    const pid = Number(form.dataset.id); const phase = form.dataset.phase;
    const max = DB.where('steps', (s) => s.program_id === pid && s.phase === phase).reduce((m, s) => Math.max(m, s.sort), 0);
    DB.insert('steps', { program_id: pid, phase, name: f.get('name').trim(), role: f.get('role'), sort: max + 1 });
    done('success', `Tahap "${esc(f.get('name'))}" ditambahkan.`, `/setup/${pid}/workflow`);
  };
  clicks['setup.step'] = (d) => {
    const step = DB.byId('steps', d.sid);
    const siblings = DB.where('steps', (s) => s.program_id === step.program_id && s.phase === step.phase).sort((a, b) => a.sort - b.sort || a.id - b.id);
    const idx = siblings.indexOf(step);
    if (d.act === 'delete') {
      const busy = DB.where('participants', (x) => x.current_step_id === step.id).length + DB.where('disbursements', (x) => x.current_step_id === step.id).length;
      if (busy) throw new Error(`Masih ada ${busy} data menunggu di tahap ini.`);
      DB.remove('steps', (s) => s.id === step.id);
    } else {
      const j = d.act === 'up' ? idx - 1 : idx + 1;
      if (siblings[j]) { [siblings[idx], siblings[j]] = [siblings[j], siblings[idx]]; siblings.forEach((s, i) => { s.sort = i + 1; }); }
    }
    DB.save(); render();
  };

  // ---------------------------------------------------------------- review
  route('/setup/:id/review', ({ id }) => {
    const p = getProgram(id);
    const items = checklist(p);
    const blocking = items.filter((i) => !i.ok && i.level === 'error').length;
    const warns = items.filter((i) => !i.ok && i.level === 'warning').length;
    const icon = (i) => (i.ok ? '<i class="bi bi-check-circle-fill text-success"></i>' : i.level === 'warning' ? '<i class="bi bi-exclamation-circle-fill text-warning"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>');
    const stepNames = (ph, empty) => E.stepsOf(p, ph).map((s) => esc(s.name)).join(' → ') || empty;
    return {
      title: 'Review & Aktivasi', html: `${nav(p, 'review')}<div class="row g-3">
        <div class="col-lg-7"><div class="card"><div class="card-header">Checklist kelengkapan</div><ul class="list-group list-group-flush">
          ${items.map((i) => `<li class="list-group-item d-flex gap-2">${icon(i)}<span>${esc(i.text)}</span></li>`).join('')}</ul></div></div>
        <div class="col-lg-5">
          <div class="card mb-3"><div class="card-header">Ringkasan</div><div class="card-body small"><dl class="row mb-0">
            <dt class="col-5">Baseline</dt><dd class="col-7">${h.date(p.baseline_start)} – ${h.date(p.baseline_end)}</dd>
            <dt class="col-5">Program</dt><dd class="col-7">${h.date(p.program_start)} – ${h.date(p.program_end)} (${p.programMonths} bln)</dd>
            <dt class="col-5">Pendaftaran</dt><dd class="col-7">${h.date(p.registration_start)} – ${h.date(p.registration_end)}</dd>
            <dt class="col-5">Channel</dt><dd class="col-7">${esc(p.channels.map((c) => `${c.channel_name} (${c.classes.length} kelas)`).join(', ') || '-')}</dd>
            <dt class="col-5">Matriks</dt><dd class="col-7">${p.pillars.length} pilar · ${p.leadMeasures.length} lead measure</dd>
            <dt class="col-5">Pencairan</dt><dd class="col-7">${esc(p.periods.map((x) => x.name).join(', ') || '-')} · ${p.components.filter((c) => c.is_active).length} komponen</dd>
            <dt class="col-5">Approval</dt><dd class="col-7">Daftar: ${stepNames('registration', 'langsung aktif')}<br>Cair: ${stepNames('disbursement', 'langsung cair')}</dd>
          </dl></div></div>
          <div class="card"><div class="card-body">
            <div class="mb-2">Status saat ini: ${h.badge(p.status)}</div>
            ${blocking ? `<div class="alert alert-danger py-2 small">${blocking} item wajib belum lengkap.</div>` : ''}
            ${warns ? `<div class="alert alert-warning py-2 small">${warns} peringatan (tidak menghalangi aktivasi).</div>` : ''}
            <div class="d-flex gap-2 flex-wrap">
              ${p.status !== 'active' ? `<button class="btn btn-success" data-click="setup.status" data-id="${p.id}" data-to="active" ${blocking ? 'disabled' : ''}><i class="bi bi-play-fill"></i> Aktifkan program</button>` : ''}
              ${p.status === 'active' ? `<button class="btn btn-outline-secondary" data-click="setup.status" data-id="${p.id}" data-to="draft" data-confirm="Kembalikan ke draft? CBD tidak bisa mendaftarkan toko selama draft.">Kembali ke draft</button>
                <button class="btn btn-outline-dark" data-click="setup.status" data-id="${p.id}" data-to="closed" data-confirm="Tutup program? Pendaftaran berhenti, pencairan tetap bisa diproses.">Tutup program</button>` : ''}
              ${p.status === 'closed' ? `<button class="btn btn-outline-secondary" data-click="setup.status" data-id="${p.id}" data-to="draft">Buka lagi (draft)</button>` : ''}
            </div>
            ${p.participantCount === 0 ? `<a href="#" class="btn btn-sm btn-link text-danger px-0 mt-3" data-click="setup.deleteProgram" data-id="${p.id}" data-confirm="Hapus program ini beserta seluruh setup-nya?"><i class="bi bi-trash"></i> Hapus program</a>` : ''}
          </div></div>
        </div></div>`,
    };
  });

  clicks['setup.status'] = (d) => {
    const p = E.loadProgram(Number(d.id));
    if (d.to === 'active' && checklist(p).some((i) => !i.ok && i.level === 'error')) throw new Error('Masih ada item wajib yang belum lengkap.');
    DB.byId('programs', p.id).status = d.to;
    done('success', { draft: 'Program dikembalikan ke draft.', active: 'Program aktif! CBD sudah bisa mendaftarkan toko.', closed: 'Program ditutup.' }[d.to], `/setup/${p.id}/review`);
  };
  clicks['setup.deleteProgram'] = (d) => {
    const id = Number(d.id);
    if (DB.t('participants').some((x) => x.program_id === id)) throw new Error('Program sudah punya peserta, tidak bisa dihapus.');
    E.deleteProgram(id);
    done('success', 'Program dihapus.', '/setup');
  };

})();
