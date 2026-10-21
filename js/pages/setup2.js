// Program Setup bagian 2: 3a eligibility & jadwal · 3f form fase · 3g approval layer & auto-approve ·
// 3h / 7 template MOU-SKN · 4 simulasi · 5 validasi · 6 publish · 8 close · audit log
(function () {
  const { h, route, actions, clicks, done, fail } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;
  const C = window.Catalog;
  const { getProgram, getChannel, nav, assertDraft, assertDocsEditable, touch, editable, fs } = window.SetupShared;

  const PHASE_EXAMPLE = {
    REGISTRATION: { form: 'Baseline per brand (diisi CBD/CDT, wajib) · growth per brand · conditional rebate · catatan', approval: 'Admin DC → ABL (auto-approve bila growth per brand ≥ 70%) → Chadev (fase selesai)' },
    MONITORING: { form: 'Upload evidence per lead measure (file) · catatan monitoring', approval: 'Admin DC → ABL (verifikasi evidence)' },
    PAYOUT: { form: 'Nominal payout (rupiah) · jadwal payout (quarterly / semester) · bukti transfer (file)', approval: 'Finance → Head of Finance (final approval)' },
  };

  // ---------------------------------------------------------------- 3e + 3f · fase
  route('/setup/:id/ch/:pc/phases', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/phases/REGISTRATION`));
  route('/setup/:id/ch/:pc/phases/:phase', ({ id, pc, phase }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const ph = C.PHASES.find((x) => x.code === phase);
    if (!ph) fail('Fase tidak dikenal');
    const cfg = ch.phases[phase];
    const catalog = C.CATALOG_FIELDS.filter((f) => f.phases.includes(phase));
    const fields = cfg.fields.map((f) => ({ id: f.id, source: f.source, field_key: f.field_key, label: f.label, data_type: f.data_type, options: (f.options || []).join(', '),
      mode: f.mode, expression: f.expression || '', repeat_per: f.repeat_per, is_visible: f.is_visible, is_editable: f.is_editable, is_required: f.is_required,
      min_value: f.min_value === null ? '' : f.min_value, max_value: f.max_value === null ? '' : f.max_value }));
    const layers = cfg.layers.map((l) => ({ role_code: l.role_code, is_final: l.is_final, conditions: (l.conditions || []).map((c) => ({ ...c })) }));
    const objects = Object.entries(C.AUTO_APPROVE_OBJECTS).filter(([, o]) => o.phases.includes(phase));
    return {
      title: `${ph.label} · ${ch.channel_name}`, html: `${nav(p, 'config', ch, 'phases')}
      <div class="loop-lane inner mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Ulangi untuk setiap fase: Registration · Monitoring · Payout</div>
        <ul class="nav nav-pills">${C.PHASES.map((x) => `<li class="nav-item"><a class="nav-link ${x.code === phase ? 'active' : ''}" href="#/setup/${p.id}/ch/${ch.id}/phases/${x.code}">${x.label}</a></li>`).join('')}</ul>
        <div class="small text-muted mt-2"><strong>Contoh ${ph.label}:</strong> form — ${PHASE_EXAMPLE[phase].form}; approval — ${PHASE_EXAMPLE[phase].approval}.</div></div>

      <form data-action="setup.savePhaseForm" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}"><fieldset ${fs(p)}><input type="hidden" name="fields" id="fieldsJson">
      <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3f</span>&nbsp;Form input ${ph.label}</span>
        <span><button type="button" class="btn btn-sm btn-outline-brand" id="addCatalog"><i class="bi bi-plus"></i> Field katalog</button>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addCustom"><i class="bi bi-plus"></i> Field custom</button></span></div>
        <div class="card-body">
          <p class="small text-muted">Field katalog sudah dipahami sistem (mis. baseline, growth, evidence_upload). Field custom bisa ditambah tanpa development; mode <em>Dihitung</em> memakai aturan rumus FR5. Urutan baris = posisi di form.</p>
          <div class="table-responsive"><table class="table table-sm table-bordered phase-fields"><thead><tr><th>#</th><th>Field</th><th>Label</th><th>Tipe</th><th>Mode</th><th>Diulang</th>
            <th title="Visible">Tampil</th><th title="Editable">Edit</th><th title="Required">Wajib</th><th>Min</th><th>Maks</th><th></th></tr></thead><tbody id="fRows"></tbody></table></div>
          <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan form ${ph.label}</button>
        </div></div></fieldset></form>

      <form data-action="setup.saveLayers" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}"><fieldset ${fs(p)}><input type="hidden" name="layers" id="layersJson">
      <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3g</span>&nbsp;Approval layer & auto-approve — ${ph.label}</span>
        <button type="button" class="btn btn-sm btn-outline-brand" id="addLayer"><i class="bi bi-plus"></i> Layer</button></div>
        <div class="card-body">
          <p class="small text-muted">Role dari daftar tetap (<span class="warn-mark" title="Daftar final masih dikonfirmasi">⚠</span>). Layer terakhir = tempat fase berakhir${phase === 'PAYOUT' ? '; Payout <strong>wajib</strong> diakhiri final approval' : ''}.
            Bila submission memenuhi <strong>semua</strong> kondisi sebuah layer (AND, <span class="warn-mark" title="OR masih dikonfirmasi">⚠</span>), layer itu disetujui otomatis & dicatat dengan kondisi yang cocok.
            Objek per brand harus lolos untuk setiap brand. Layer tanpa kondisi selalu butuh orang. Nilai objek kosong = kondisi tidak terpenuhi.</p>
          <div id="layers"></div>
          <button class="btn btn-brand mt-2"><i class="bi bi-save"></i> Simpan approval ${ph.label}</button>
        </div></div></fieldset></form>`,
      after(root) {
        const ro = !editable(p);
        const fr = root.querySelector('#fRows');
        const typeOpts = (cur) => Object.entries(C.FIELD_TYPES).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        const modeOpts = (cur) => Object.entries(C.MODES).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        const repOpts = (cur) => Object.entries(C.REPEAT).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        function drawFields() {
          fr.innerHTML = fields.map((f, i) => {
            const cat = f.source === 'CATALOG';
            return `<tr data-i="${i}"><td class="text-nowrap">${i + 1}
                <button type="button" class="btn btn-sm btn-link p-0" data-act="up" ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button><button type="button" class="btn btn-sm btn-link p-0" data-act="down" ${i === fields.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button></td>
              <td>${cat ? `<select class="form-control form-control-sm" data-f="field_key">${catalog.map((c) => `<option value="${c.key}" ${sel(f.field_key === c.key)}>${c.key}</option>`).join('')}</select><span class="badge badge-light">katalog</span>`
                : `<input class="form-control form-control-sm" data-f="field_key" value="${h.esc(f.field_key)}" placeholder="nama_field"><span class="badge badge-info">custom</span>`}</td>
              <td><input class="form-control form-control-sm" data-f="label" value="${h.esc(f.label)}"></td>
              <td>${cat ? `<span class="small">${C.FIELD_TYPES[f.data_type]}</span>` : `<select class="form-control form-control-sm" data-f="data_type">${typeOpts(f.data_type)}</select>`}
                ${!cat && f.data_type === 'OPTION' ? `<input class="form-control form-control-sm mt-1" data-f="options" value="${h.esc(f.options)}" placeholder="Quarterly, Semester">` : ''}</td>
              <td>${cat ? `<span class="small">${C.MODES[f.mode]}</span>` : `<select class="form-control form-control-sm" data-f="mode">${modeOpts(f.mode)}</select>`}
                ${!cat && f.mode === 'CALCULATED' ? `<input class="form-control form-control-sm mt-1 text-monospace" data-f="expression" value="${h.esc(f.expression)}" placeholder="baseline * (1 + growth)"><div class="small fx-out"></div>` : ''}</td>
              <td>${cat ? `<span class="small">${C.REPEAT[f.repeat_per]}</span>` : `<select class="form-control form-control-sm" data-f="repeat_per">${repOpts(f.repeat_per)}</select>`}</td>
              ${['is_visible', 'is_editable', 'is_required'].map((k) => `<td class="text-center"><input type="checkbox" data-f="${k}" ${chk(f[k])} ${f.mode === 'CALCULATED' && k !== 'is_visible' ? 'disabled' : ''}></td>`).join('')}
              <td><input type="number" step="any" class="form-control form-control-sm" style="width:80px" data-f="min_value" value="${f.min_value}"></td>
              <td><input type="number" step="any" class="form-control form-control-sm" style="width:80px" data-f="max_value" value="${f.max_value}"></td>
              <td><button type="button" class="btn btn-sm btn-link text-danger p-0" data-act="del"><i class="bi bi-x-lg"></i></button></td></tr>`;
          }).join('') || '<tr><td colspan="12" class="text-muted">Belum ada field.</td></tr>';
          fr.querySelectorAll('[data-f="expression"]').forEach((inp) => { const r = window.Formula.check(inp.value, C.sampleVars()); inp.nextElementSibling.innerHTML = inp.value ? (r.isValid ? '<span class="text-success">valid</span>' : `<span class="text-danger">${h.esc(r.errors.join(', '))}</span>`) : ''; });
          if (ro) fr.querySelectorAll('input,select,button').forEach((x) => { x.disabled = true; });
        }
        fr.addEventListener('change', (e) => {
          const tr = e.target.closest('tr[data-i]'); const k = e.target.dataset.f; if (!tr || !k) return;
          const f = fields[tr.dataset.i];
          f[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          if (k === 'field_key' && f.source === 'CATALOG') { const c = catalog.find((x) => x.key === f.field_key); Object.assign(f, { label: c.label, data_type: c.dataType, mode: c.mode, repeat_per: c.repeatPer, options: (c.options || []).join(', '), is_editable: c.mode === 'ENTERED' }); }
          if (k === 'mode' && f.mode === 'CALCULATED') { f.is_editable = false; f.is_required = false; }
          drawFields();
        });
        fr.addEventListener('input', (e) => { const tr = e.target.closest('tr[data-i]'); const k = e.target.dataset.f; if (tr && k && e.target.type !== 'checkbox') fields[tr.dataset.i][k] = e.target.value; });
        fr.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const i = Number(b.closest('tr').dataset.i);
          if (b.dataset.act === 'del') fields.splice(i, 1);
          if (b.dataset.act === 'up' || b.dataset.act === 'down') { const j = b.dataset.act === 'up' ? i - 1 : i + 1; [fields[i], fields[j]] = [fields[j], fields[i]]; }
          drawFields();
        });
        root.querySelector('#addCatalog').addEventListener('click', () => {
          const c = catalog.find((x) => !fields.some((f) => f.field_key === x.key)) || catalog[0];
          if (!c) return;
          fields.push({ source: 'CATALOG', field_key: c.key, label: c.label, data_type: c.dataType, options: (c.options || []).join(', '), mode: c.mode, expression: '', repeat_per: c.repeatPer,
            is_visible: true, is_editable: c.mode === 'ENTERED', is_required: false, min_value: '', max_value: '' });
          drawFields();
        });
        root.querySelector('#addCustom').addEventListener('click', () => {
          fields.push({ source: 'CUSTOM', field_key: '', label: '', data_type: 'TEXT', options: '', mode: 'ENTERED', expression: '', repeat_per: 'NONE', is_visible: true, is_editable: true, is_required: false, min_value: '', max_value: '' });
          drawFields();
        });
        root.querySelector('#fieldsJson').closest('form').addEventListener('submit', () => { root.querySelector('#fieldsJson').value = JSON.stringify(fields); }, true);

        const le = root.querySelector('#layers');
        const roleOpts = (cur) => Object.entries(C.APPROVAL_ROLES).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        const objOpts = (cur) => objects.map(([k, o]) => `<option value="${k}" ${sel(cur === k)}>${o.label}</option>`).join('');
        const opOpts = (cur) => Object.entries(C.OPERATORS).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        function drawLayers() {
          le.innerHTML = layers.map((l, i) => `<div class="layer-card" data-l="${i}">
            <div class="d-flex flex-wrap align-items-center gap-2"><span class="badge badge-primary">${i + 1}</span>
              <select class="form-control form-control-sm" style="width:200px" data-f="role_code">${roleOpts(l.role_code)}</select>
              <label class="small mb-0"><input type="checkbox" data-f="is_final" ${chk(l.is_final)}> Final approval</label>
              <span class="small ${l.conditions.length ? 'text-success' : 'text-muted'}">${l.conditions.length ? '<i class="bi bi-lightning-charge"></i> auto-approve bila semua kondisi terpenuhi' : 'selalu manual'}</span>
              <span class="ml-auto"><button type="button" class="btn btn-sm btn-link p-0" data-act="up" ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
                <button type="button" class="btn btn-sm btn-link p-0" data-act="down" ${i === layers.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
                <button type="button" class="btn btn-sm btn-link text-danger p-0 ml-2" data-act="del"><i class="bi bi-trash"></i></button></span></div>
            ${l.conditions.map((c, ci) => `<div class="d-flex gap-2 mt-2 ml-4" data-c="${ci}"><span class="small text-muted pt-1">${ci ? 'DAN' : 'JIKA'}</span>
              <select class="form-control form-control-sm" style="width:240px" data-cf="object_code">${objOpts(c.object_code)}</select>
              <select class="form-control form-control-sm" style="width:70px" data-cf="operator">${opOpts(c.operator)}</select>
              <input type="number" step="any" class="form-control form-control-sm" style="width:110px" data-cf="value" value="${c.value === null || c.value === undefined ? '' : c.value}" placeholder="70">
              <button type="button" class="btn btn-sm btn-link text-danger p-0" data-act="delC"><i class="bi bi-x-lg"></i></button></div>`).join('')}
            ${objects.length ? '<button type="button" class="btn btn-sm btn-link ml-4 px-0" data-act="addC">+ kondisi auto-approve</button>' : ''}
          </div>`).join('<div class="text-center text-muted"><i class="bi bi-arrow-down"></i></div>') || '<div class="text-muted small">Belum ada layer.</div>';
          if (layers.length) le.insertAdjacentHTML('beforeend', `<div class="text-center text-muted"><i class="bi bi-arrow-down"></i></div><div class="p-2 rounded small bg-success-subtle text-center"><i class="bi bi-flag"></i> Fase ${ph.label} selesai</div>`);
          if (ro) le.querySelectorAll('input,select,button').forEach((x) => { x.disabled = true; });
        }
        le.addEventListener('change', (e) => {
          const card = e.target.closest('[data-l]'); if (!card) return;
          const l = layers[card.dataset.l];
          if (e.target.dataset.f) l[e.target.dataset.f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
          if (e.target.dataset.cf) l.conditions[e.target.closest('[data-c]').dataset.c][e.target.dataset.cf] = e.target.value;
          drawLayers();
        });
        le.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const i = Number(b.closest('[data-l]').dataset.l);
          if (b.dataset.act === 'del') layers.splice(i, 1);
          if (b.dataset.act === 'addC') layers[i].conditions.push({ object_code: objects[0][0], operator: 'GTE', value: '' });
          if (b.dataset.act === 'delC') layers[i].conditions.splice(Number(b.closest('[data-c]').dataset.c), 1);
          if (b.dataset.act === 'up' || b.dataset.act === 'down') { const j = b.dataset.act === 'up' ? i - 1 : i + 1; [layers[i], layers[j]] = [layers[j], layers[i]]; }
          drawLayers();
        });
        root.querySelector('#addLayer').addEventListener('click', () => { layers.push({ role_code: 'ADMIN_DC', is_final: false, conditions: [] }); drawLayers(); });
        root.querySelector('#layersJson').closest('form').addEventListener('submit', () => { root.querySelector('#layersJson').value = JSON.stringify(layers); }, true);
        ['#addCatalog', '#addCustom', '#addLayer'].forEach((s) => { if (ro) root.querySelector(s).disabled = true; });
        drawFields(); drawLayers();
      },
    };
  });

  actions['setup.savePhaseForm'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const phase = form.dataset.phase;
    assertDraft(pid);
    const rows = JSON.parse(f.get('fields') || '[]');
    const errs = [];
    const keys = new Set();
    const out = rows.map((r, i) => {
      const key = String(r.field_key || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      if (!key) errs.push(`Baris ${i + 1}: nama field wajib`);
      if (keys.has(key)) errs.push(`Field "${key}" dobel`); keys.add(key);
      if (r.source === 'CUSTOM' && C.CATALOG_FIELDS.some((c) => c.key === key)) errs.push(`"${key}" adalah nama field katalog; pilih dari katalog`);
      if (!String(r.label || '').trim()) errs.push(`Field "${key}": label wajib`);
      const options = r.data_type === 'OPTION' ? String(r.options || '').split(',').map((s) => s.trim()).filter(Boolean) : null;
      if (r.data_type === 'OPTION' && !options.length) errs.push(`Field "${key}": isi pilihan`);
      if (r.source === 'CUSTOM' && r.mode === 'CALCULATED') {
        const chk2 = window.Formula.check(r.expression, C.sampleVars());
        if (!chk2.isValid) errs.push(`Field "${key}": rumus tidak valid (${chk2.errors.join(', ')})`);
      }
      return { phase, field_key: key, label: String(r.label || '').trim(), source: r.source, data_type: r.data_type, options, mode: r.mode, expression: r.mode === 'CALCULATED' && r.source === 'CUSTOM' ? r.expression : null,
        repeat_per: r.repeat_per, is_visible: !!r.is_visible, is_editable: r.mode === 'CALCULATED' ? false : !!r.is_editable, is_required: r.mode === 'CALCULATED' ? false : !!r.is_required,
        min_value: toNum(r.min_value), max_value: toNum(r.max_value), sort_order: i + 1 };
    });
    if (errs.length) throw new Error(errs.slice(0, 8).join(' · '));
    const before = DB.where('programPhaseFields', (x) => x.program_channel_id === pcId && x.phase === phase).map((x) => x.field_key);
    DB.remove('programPhaseFields', (x) => x.program_channel_id === pcId && x.phase === phase);
    for (const r of out) DB.insert('programPhaseFields', Object.assign({ program_channel_id: pcId }, r));
    E.audit(pid, 'programPhaseField', pcId, 'replace', { phase, fields: before }, { phase, fields: out.map((x) => x.field_key) });
    touch(pid);
    done('success', `Form ${phase} disimpan (${out.length} field).`, `/setup/${pid}/ch/${pcId}/phases/${phase}`);
  };

  actions['setup.saveLayers'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const phase = form.dataset.phase;
    assertDraft(pid);
    const rows = JSON.parse(f.get('layers') || '[]');
    const errs = [];
    rows.forEach((l, i) => {
      if (!C.APPROVAL_ROLES[l.role_code]) errs.push(`Layer ${i + 1}: role tidak dikenal`);
      if (l.is_final && i < rows.length - 1) errs.push('Layer final harus layer terakhir');
      (l.conditions || []).forEach((c) => {
        if (!C.AUTO_APPROVE_OBJECTS[c.object_code] || !C.OPERATORS[c.operator]) errs.push(`Layer ${i + 1}: objek/operator tidak dikenal`);
        if (c.value === '' || !Number.isFinite(Number(c.value))) errs.push(`Layer ${i + 1}: nilai kondisi wajib angka`);
      });
    });
    if (phase === 'PAYOUT' && rows.length && !rows[rows.length - 1].is_final) errs.push('Fase Payout harus diakhiri final approval');
    if (errs.length) throw new Error(errs.join(' · '));
    const before = DB.where('programApprovalLayers', (x) => x.program_channel_id === pcId && x.phase === phase).map((x) => ({ role: x.role_code, conditions: x.conditions }));
    DB.remove('programApprovalLayers', (x) => x.program_channel_id === pcId && x.phase === phase);
    rows.forEach((l, i) => DB.insert('programApprovalLayers', { program_channel_id: pcId, phase, layer_order: i + 1, role_code: l.role_code, is_final: !!l.is_final,
      conditions: (l.conditions || []).map((c) => ({ object_code: c.object_code, operator: c.operator, value: Number(c.value) })) }));
    E.audit(pid, 'programApprovalLayer', pcId, 'replace', { phase, layers: before }, { phase, layers: rows });
    touch(pid);
    done('success', `Approval layer ${phase} disimpan (${rows.length} layer).`, `/setup/${pid}/ch/${pcId}/phases/${phase}`);
  };

  // ---------------------------------------------------------------- 3a · eligibility & jadwal (sebelum pilih brand)
  // Syarat pendaftaran · syarat payout (rasio SO:SI, MOU 2026) · jadwal monitoring & payout · exception toko oleh Admin HO.
  // Baseline minimal per brand ada di 3b Brand (butuh brand terpilih).
  route('/setup/:id/ch/:pc/eligibility', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const nv = (v) => (v === null || v === undefined ? '' : v);
    const stores = DB.t('stores').filter((s) => s.channel_code === ch.channel_code);
    const elig = stores.map((s) => Object.assign({ s }, E.eligibility(p, ch, s.customer_id)));
    const freqOpts = (cur, list) => list.map((k) => `<option value="${k}" ${sel(cur === k)}>${C.FREQUENCIES[k]}</option>`).join('');
    const per = (fq) => E.periodsOf(p.period_start, p.period_end, fq).map((x) => x.label).join(', ');
    const others = DB.where('programs', (x) => x.year === p.year && x.id !== p.id);
    const excl = new Set(ch.elig_exclusive_program_ids || []);
    const exceptions = ch.elig_exceptions || [];
    const canExc = p.status !== 'CLOSED';
    const notElig = elig.filter((x) => !x.eligible && !exceptions.some((e) => e.customer_id === x.s.customer_id));
    const sec = (t) => `<div class="col-12"><div class="elig-sec">${t}</div></div>`;
    return {
      title: `Eligibility · ${ch.channel_name}`, html: `${nav(p, 'config', ch, 'eligibility')}
      <div class="row g-3"><div class="col-xl-8">
      <form data-action="setup.saveEligibility" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p)}>
      <div class="card mb-3"><div class="card-header"><span class="step-chip">3a</span>&nbsp;Eligibility & jadwal — ${esc(ch.channel_name)}</div><div class="card-body row g-3">
        ${sec('<i class="bi bi-person-check"></i> Syarat pendaftaran <span class="fw-normal text-muted">· dicek saat CBD/CDT mendaftarkan toko</span>')}
        <div class="col-md-4"><label class="form-label">Min. bulan sell out dikirim</label><input name="elig_min_sell_out_months" type="number" class="form-control" value="${nv(ch.elig_min_sell_out_months)}" placeholder="kosong = tidak dicek">
          <div class="form-text">Dari data tahun ${E.baselineMonths(p)[0].slice(0, 4)}. <span class="warn-mark" title="Tidak ada di sales_program 2026; dikonfirmasi">⚠</span></div></div>
        <div class="col-md-4"><label class="form-label">Wajib pernah menerima payout</label><select name="elig_prior_payout_required" class="form-control">
          <option value="0" ${sel(!ch.elig_prior_payout_required)}>Tidak</option><option value="1" ${sel(ch.elig_prior_payout_required)}>Ya</option></select>
          <div class="form-text">Di program tahun ${p.year - 1}. <span class="warn-mark" title="Dikonfirmasi">⚠</span></div></div>
        <div class="col-md-4"><label class="form-label">Baseline minimal per brand</label><div class="form-control bg-light small">diatur di <a href="#/setup/${p.id}/ch/${ch.id}/brands">3b Brand</a></div></div>
        <div class="col-12"><label class="form-label">Tidak boleh diikuti bersamaan dengan program</label>
          <div class="d-flex flex-wrap gap-3">${others.map((x) => `<label class="mb-0"><input type="checkbox" name="excl_program" value="${x.id}" ${chk(excl.has(x.id))}> ${esc(x.name)} <span class="small text-muted">${esc(x.code)}</span></label>`).join('')
            || `<span class="small text-muted">Belum ada program lain di tahun ${p.year}.</span>`}</div>
          <div class="form-text">Toko yang sudah terdaftar (dan tidak ditolak) di program yang dicentang tidak bisa didaftarkan di sini, seperti aturan JBP CS 2026 terhadap PLP, PSF, LMT, dst.</div></div>

        ${sec('<i class="bi bi-cash-coin"></i> Syarat payout <span class="fw-normal text-muted">· dicek tiap termin; tidak memenuhi → payout tidak dibayar</span>')}
        <div class="col-md-4"><label class="form-label">Rasio sell out : sell in min</label><div class="input-group"><input name="elig_ratio_min" type="number" step="any" class="form-control" value="${nv(ch.elig_ratio_min)}" placeholder="96"><span class="input-group-text">%</span></div></div>
        <div class="col-md-4"><label class="form-label">Rasio sell out : sell in maks</label><div class="input-group"><input name="elig_ratio_max" type="number" step="any" class="form-control" value="${nv(ch.elig_ratio_max)}" placeholder="100"><span class="input-group-text">%</span></div></div>
        <div class="col-md-4"><label class="form-label">&nbsp;</label><label class="d-block mb-0 pt-2"><input type="checkbox" name="elig_ratio_at_registration" value="1" ${chk(ch.elig_ratio_at_registration)}> Cek juga saat pendaftaran</label>
          <div class="form-text">Pakai data tahun ${E.baselineMonths(p)[0].slice(0, 4)}.</div></div>
        <div class="col-12"><div class="form-text mt-0">MOU 2026: <em>"Rebate akan diberikan jika toko mencapai target sell out dan sell-in minimal 95% sell out-nya."</em> Rasio dihitung dari bulan-bulan termin payout, semua brand yang didaftarkan. Definisi <span class="warn-mark" title="Masih dikonfirmasi">⚠</span> dikonfirmasi.</div></div>

        ${sec('<i class="bi bi-calendar3"></i> Jadwal')}
        <div class="col-md-4"><label class="form-label">Frekuensi monitoring <span class="text-danger">*</span></label><select name="monitoring_frequency" class="form-control">${freqOpts(ch.monitoring_frequency, ['MONTHLY', 'QUARTERLY', 'SEMESTER'])}</select>
          <div class="form-text">${per(ch.monitoring_frequency || 'QUARTERLY')}</div></div>
        <div class="col-md-4"><label class="form-label">Payout · Conditional <span class="text-danger">*</span></label><select name="pay_CONDITIONAL" class="form-control">${freqOpts(ch.payoutSchedule.CONDITIONAL, ['QUARTERLY', 'SEMESTER'])}</select>
          <div class="form-text">${per(ch.payoutSchedule.CONDITIONAL || 'QUARTERLY')}</div></div>
        <div class="col-md-4"><label class="form-label">Payout · Fix <span class="text-danger">*</span></label><select name="pay_FIX" class="form-control">${freqOpts(ch.payoutSchedule.FIX, ['QUARTERLY', 'SEMESTER'])}</select>
          <div class="form-text">${per(ch.payoutSchedule.FIX || 'SEMESTER')}</div></div>
        <div class="col-12"><div class="form-text mt-0">Fix dibayar sesuai porsi periode Monitoring yang disetujui di termin itu, jadi termin Fix tidak boleh lebih pendek dari periode Monitoring.</div></div>
        <div class="col-12"><button class="btn btn-brand"><i class="bi bi-save"></i> Simpan eligibility & jadwal</button></div>
      </div></div></fieldset></form>

      <div class="card"><div class="card-header"><i class="bi bi-shield-check"></i>&nbsp;Exception toko <span class="small text-muted fw-normal">&nbsp;· toko yang tidak lolos aturan tetap boleh didaftarkan</span></div><div class="card-body">
        ${canExc ? `<form data-action="setup.addException" data-id="${p.id}" data-pc="${ch.id}" class="row g-2 mb-3">
          <div class="col-md-5"><select name="customer_id" class="form-control form-control-sm" required><option value="">Pilih toko tidak eligible (${notElig.length})</option>
            ${notElig.map((x) => `<option value="${x.s.customer_id}">${esc(x.s.name)} · ${x.s.customer_id} — ${esc(x.reasons.join('; '))}</option>`).join('')}</select></div>
          <div class="col-md-5"><input name="reason" class="form-control form-control-sm" required placeholder="Alasan exception (wajib), mis. toko baru strategis"></div>
          <div class="col-md-2"><button class="btn btn-sm btn-brand w-100"><i class="bi bi-plus"></i> Exception</button></div></form>` : ''}
        <table class="table table-sm table-bordered mb-0"><thead><tr><th>Toko</th><th>Alasan exception</th><th>Oleh</th><th></th></tr></thead><tbody>
          ${exceptions.map((x) => { const s = UI.store(x.customer_id) || { name: x.customer_id }; return `<tr><td>${esc(s.name)}<div class="small text-muted">${x.customer_id}</div></td><td>${esc(x.reason)}</td>
            <td class="small">${esc((DB.byId('users', x.by) || {}).name || '-')}<div class="text-muted">${h.datetime(x.at)}</div></td>
            <td class="text-right">${canExc ? `<a href="#" class="text-danger small" data-click="setup.delException" data-id="${p.id}" data-pc="${ch.id}" data-cid="${x.customer_id}">hapus</a>` : ''}</td></tr>`; }).join('')
            || '<tr><td colspan="4" class="text-muted small">Belum ada exception.</td></tr>'}</tbody></table>
        <div class="form-text">Bisa ditambah setelah publish. Semua exception tercatat di audit log dan terlihat di daftar toko Registration.</div></div></div>
      </div>
      <div class="col-xl-4"><div class="card sticky-summary"><div class="card-header"><i class="bi bi-funnel"></i>&nbsp;Preview eligibility (tersimpan)</div><div class="card-body small">
        <div><strong>${elig.filter((x) => x.eligible).length}</strong> dari ${stores.length} toko ${esc(ch.channel_name)} eligible${exceptions.length ? ` (termasuk ${exceptions.length} exception)` : ''}.</div>
        ${ch.brands.map((b) => `<div>${esc(b.brand_name)}: ${elig.filter((x) => x.eligible && x.brands.find((y) => y.brand_code === b.brand_code && y.eligible)).length} toko</div>`).join('') || '<div class="text-muted">Brand belum dipilih (3b).</div>'}
        <div class="text-muted mt-2">Alasan tidak eligible terbanyak: ${esc(Object.entries(elig.filter((x) => !x.eligible).flatMap((x) => x.reasons.map((r) => r.replace(/[\d.,]+%?/g, '#'))).reduce((m, r) => { m[r] = (m[r] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([r, n]) => `${r} (${n})`).join('; ') || '-')}</div>
        <div class="text-muted mt-2">Saran baseline = total sell in ${E.baselineMonths(p)[0].slice(0, 4)} ÷ bulan aktif sejak first DO.</div>
      </div></div></div></div>`,
    };
  });
  actions['setup.saveEligibility'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid);
    const pc = DB.byId('programChannels', pcId);
    const v = { elig_min_sell_out_months: toNum(f.get('elig_min_sell_out_months')), elig_ratio_min: toNum(f.get('elig_ratio_min')), elig_ratio_max: toNum(f.get('elig_ratio_max')),
      elig_ratio_at_registration: f.has('elig_ratio_at_registration'), elig_prior_payout_required: f.get('elig_prior_payout_required') === '1',
      elig_exclusive_program_ids: f.all('excl_program').map(Number), monitoring_frequency: f.get('monitoring_frequency') };
    if (v.elig_ratio_min !== null && v.elig_ratio_max !== null && v.elig_ratio_min > v.elig_ratio_max) throw new Error('Rasio min lebih besar dari rasio maks');
    if (!C.FREQUENCIES[v.monitoring_frequency]) throw new Error('Frekuensi monitoring wajib dipilih');
    const pay = {};
    for (const comp of ['CONDITIONAL', 'FIX']) {
      pay[comp] = f.get('pay_' + comp);
      if (!['QUARTERLY', 'SEMESTER'].includes(pay[comp])) throw new Error(`Jadwal payout ${comp} wajib dipilih`);
    }
    const len = { MONTHLY: 1, QUARTERLY: 3, SEMESTER: 6 };
    if (len[pay.FIX] < len[v.monitoring_frequency]) throw new Error(`Payout Fix ${C.FREQUENCIES[pay.FIX]} lebih pendek dari Monitoring ${C.FREQUENCIES[v.monitoring_frequency]}: ada termin Fix tanpa periode Monitoring sehingga Fix = 0.`);
    const before = Object.fromEntries(Object.keys(v).map((k) => [k, pc[k]]));
    Object.assign(pc, v);
    for (const comp of ['CONDITIONAL', 'FIX']) {
      const ex = DB.t('programPayoutSchedules').find((x) => x.program_channel_id === pcId && x.component === comp);
      if (ex) ex.frequency = pay[comp]; else DB.insert('programPayoutSchedules', { program_channel_id: pcId, component: comp, frequency: pay[comp] });
    }
    E.audit(pid, 'programChannel', pcId, 'update', before, Object.assign({}, v, { payout: pay }));
    touch(pid);
    done('success', 'Eligibility & jadwal disimpan. Lanjut pilih brand peserta.', `/setup/${pid}/ch/${pcId}/eligibility`);
  };
  // Exception boleh diubah saat DRAFT & PUBLISHED (keputusan operasional), tidak saat CLOSED
  function assertNotClosed(pid) {
    const p = DB.byId('programs', pid);
    if (!p || p.status === 'CLOSED') throw new Error('Program CLOSED sepenuhnya read-only.');
  }
  actions['setup.addException'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertNotClosed(pid);
    const pc = DB.byId('programChannels', pcId);
    const cid = String(f.get('customer_id') || ''); const reason = String(f.get('reason') || '').trim();
    if (!cid) throw new Error('Pilih toko');
    if (!reason) throw new Error('Alasan exception wajib diisi');
    pc.elig_exceptions = (pc.elig_exceptions || []).filter((x) => x.customer_id !== cid);
    const row = { customer_id: cid, reason, by: UI.currentUser().id, at: new Date().toISOString() };
    pc.elig_exceptions.push(row);
    E.audit(pid, 'eligibilityException', pcId, 'create', null, row);
    touch(pid);
    done('success', `Exception untuk ${esc(cid)} ditambahkan.`, `/setup/${pid}/ch/${pcId}/eligibility`);
  };
  clicks['setup.delException'] = (d) => {
    const pid = Number(d.id); const pcId = Number(d.pc);
    assertNotClosed(pid);
    const pc = DB.byId('programChannels', pcId);
    const row = (pc.elig_exceptions || []).find((x) => x.customer_id === d.cid);
    if (!row) return;
    if (DB.t('registrations').some((r) => r.program_channel_id === pcId && r.customer_id === d.cid)) throw new Error('Toko sudah terdaftar; exception tidak bisa dihapus.');
    if (!confirm(`Hapus exception ${d.cid}?`)) return;
    pc.elig_exceptions = pc.elig_exceptions.filter((x) => x !== row);
    E.audit(pid, 'eligibilityException', pcId, 'delete', row, null);
    touch(pid);
    done('success', 'Exception dihapus.', `/setup/${pid}/ch/${pcId}/eligibility`);
  };

  // ---------------------------------------------------------------- 3h / 7 · template MOU & SKN
  function sampleDocCtx(p, ch) {
    const reg = DB.t('registrations').find((r) => r.program_channel_id === ch.id && r.status === 'approved');
    if (reg) return { store: UI.store(reg.customer_id), program: p, ch, brands: reg.brands.filter((b) => b.class_id).map((b) => Object.assign({ brand_name: (E.brandOf(ch, b.brand_code) || {}).brand_name }, b)) };
    const brands = ch.brands.slice(0, 2).map((b) => {
      const cls = b.classes[1] || b.classes[0];
      const g = cls && cls.tiers[1] ? cls.tiers[1].target_growth_pct : 50;
      return Object.assign({ brand_name: b.brand_name }, E.commitment(ch, b.brand_code, cls ? cls.baseline_min : 0, g, p.programMonths));
    });
    return { store: { name: 'Toko Contoh', customer_id: 'DEMO-0001' }, program: p, ch, brands };
  }
  route('/setup/:id/ch/:pc/documents', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/documents/MOU`));
  route('/setup/:id/ch/:pc/documents/:doc', ({ id, pc, doc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    if (!C.DOC_TYPES[doc]) fail('Dokumen tidak dikenal');
    const d = ch.documents[doc];
    const sections = d.latest ? JSON.parse(JSON.stringify(d.latest.content.sections || [])) : E.defaultSections(doc);
    const canEdit = p.status !== 'CLOSED';
    const generated = DB.where('generatedDocuments', (g) => g.doc_type === doc && d.revisions.some((r) => r.id === g.revision_id));
    return {
      title: `${doc} · ${ch.channel_name}`, html: `${nav(p, p.status === 'DRAFT' ? 'config' : 'docs', ch, 'documents')}
      <ul class="nav nav-pills mb-3">${Object.keys(C.DOC_TYPES).map((k) => `<li class="nav-item"><a class="nav-link ${k === doc ? 'active' : ''}" href="#/setup/${p.id}/ch/${ch.id}/documents/${k}">${k}</a></li>`).join('')}</ul>
      ${p.status === 'PUBLISHED' ? `<div class="alert alert-info py-2 small"><span class="step-chip">7</span>&nbsp;Setelah publish: template ini tetap bisa diubah. Simpan = revisi baru; dokumen yang sudah dibuat tetap memakai revisinya.</div>` : ''}
      <div class="row g-3"><div class="col-xl-7">
        <form data-action="setup.saveDoc" data-id="${p.id}" data-pc="${ch.id}" data-doc="${doc}"><fieldset ${canEdit ? '' : 'disabled'}><input type="hidden" name="sections" id="secJson">
        <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">${p.status === 'DRAFT' ? '3h' : '7'}</span>&nbsp;Template ${doc} — revisi ${d.latest ? d.latest.revision : '-'}</span>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addSec"><i class="bi bi-plus"></i> Section</button></div><div class="card-body">
          <div id="secs"></div>
          <div class="d-flex gap-2 mt-2"><button class="btn btn-brand"><i class="bi bi-save"></i> Simpan sebagai revisi baru</button>
            <button type="button" class="btn btn-outline-brand" id="pvBtn"><i class="bi bi-eye"></i> Preview</button></div>
        </div></div></fieldset></form>
      </div>
      <div class="col-xl-5">
        <div class="card mb-3"><div class="card-header">Placeholder</div><div class="card-body small placeholder-pick">
          <div class="text-muted mb-1">Klik untuk menyisipkan ke kolom yang aktif. Placeholder <code>brand.*</code> dipakai di section "per brand".</div>
          ${C.PLACEHOLDERS.map(([k, l]) => `<div><code data-ph="${k}">{{${k}}}</code> <span class="text-muted">${esc(l)}</span></div>`).join('')}</div></div>
        <div class="card mb-3"><div class="card-header">Preview <span class="small text-muted fw-normal">&nbsp;(data contoh)</span></div><div class="card-body doc-preview" id="pvOut"><span class="text-muted small">Klik Preview.</span></div></div>
        <div class="card"><div class="card-header">Riwayat revisi</div><div class="card-body p-0"><table class="table table-sm mb-0">
          <thead><tr><th>Rev</th><th>Dibuat</th><th>Oleh</th><th class="num">Dokumen dibuat</th></tr></thead>
          <tbody>${d.revisions.slice().reverse().map((r) => `<tr><td>${r.revision}${d.latest && r.id === d.latest.id ? ' <span class="badge badge-success">terbaru</span>' : ''}</td><td class="small">${h.datetime(r.created_at)}</td>
            <td class="small">${esc((DB.byId('users', r.created_by) || {}).name || '-')}</td><td class="num">${generated.filter((g) => g.revision_id === r.id).length}</td></tr>`).join('')}</tbody></table></div></div>
      </div></div>`,
      after(root) {
        const el = root.querySelector('#secs');
        let active = null;
        function draw() {
          el.innerHTML = sections.map((s, i) => `<div class="sec-card" data-s="${i}">
            <div class="d-flex gap-2 align-items-center mb-1"><span class="badge badge-light">${i + 1}</span>
              <input class="form-control form-control-sm fw-semibold" data-f="heading" value="${h.esc(s.heading)}" placeholder="Judul section">
              <label class="small mb-0 text-nowrap"><input type="checkbox" data-f="per_brand" ${chk(s.per_brand)}> per brand</label>
              <button type="button" class="btn btn-sm btn-link p-0" data-act="up" ${i === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
              <button type="button" class="btn btn-sm btn-link p-0" data-act="down" ${i === sections.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
              <button type="button" class="btn btn-sm btn-link text-danger p-0" data-act="del"><i class="bi bi-trash"></i></button></div>
            <textarea class="form-control form-control-sm" rows="3" data-f="body" placeholder="Isi section dengan {{placeholder}}">${h.esc(s.body)}</textarea></div>`).join('') || '<div class="text-muted small">Belum ada section.</div>';
          el.querySelectorAll('input[data-f="heading"],textarea').forEach((x) => x.addEventListener('focus', () => { active = x; }));
          if (!canEdit) el.querySelectorAll('input,textarea,button').forEach((x) => { x.disabled = true; });
        }
        el.addEventListener('input', (e) => { const c = e.target.closest('[data-s]'); const k = e.target.dataset.f; if (c && k) sections[c.dataset.s][k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; });
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const i = Number(b.closest('[data-s]').dataset.s);
          if (b.dataset.act === 'del') sections.splice(i, 1);
          if (b.dataset.act === 'up' || b.dataset.act === 'down') { const j = b.dataset.act === 'up' ? i - 1 : i + 1; [sections[i], sections[j]] = [sections[j], sections[i]]; }
          draw();
        });
        root.querySelectorAll('[data-ph]').forEach((c) => c.addEventListener('click', () => {
          if (!active || active.disabled) return;
          const pos = active.selectionStart || active.value.length;
          active.value = active.value.slice(0, pos) + `{{${c.dataset.ph}}}` + active.value.slice(pos);
          active.dispatchEvent(new Event('input', { bubbles: true })); active.focus();
        }));
        root.querySelector('#addSec').addEventListener('click', () => { sections.push({ heading: '', body: '', per_brand: false }); draw(); });
        root.querySelector('#pvBtn').addEventListener('click', () => {
          const bad = E.unknownPlaceholders({ sections });
          root.querySelector('#pvOut').innerHTML = (bad.length ? `<div class="alert alert-danger py-1 small">Placeholder tidak dikenal: ${bad.map(h.esc).join(', ')}</div>` : '') + E.renderDocument({ sections }, sampleDocCtx(p, ch));
        });
        root.querySelector('#secJson').closest('form').addEventListener('submit', () => { root.querySelector('#secJson').value = JSON.stringify(sections); }, true);
        if (!canEdit) root.querySelector('#addSec').disabled = true;
        draw();
      },
    };
  });
  actions['setup.saveDoc'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const doc = form.dataset.doc;
    assertDocsEditable(pid);
    const sections = JSON.parse(f.get('sections') || '[]').map((s) => ({ heading: String(s.heading || '').trim(), body: String(s.body || ''), per_brand: !!s.per_brand }));
    if (!sections.length || sections.every((s) => !s.heading && !s.body.trim())) throw new Error('Template tidak boleh kosong');
    const bad = E.unknownPlaceholders({ sections });
    if (bad.length) throw new Error(`Placeholder tidak dikenal: ${bad.join(', ')}`);
    let t = DB.t('programDocumentTemplates').find((x) => x.program_channel_id === pcId && x.doc_type === doc);
    if (!t) t = DB.insert('programDocumentTemplates', { program_channel_id: pcId, doc_type: doc, current_revision: 0 });
    const rev = DB.where('programDocumentTemplateRevisions', (r) => r.program_document_template_id === t.id).reduce((m, r) => Math.max(m, r.revision), 0) + 1;
    DB.insert('programDocumentTemplateRevisions', { program_document_template_id: t.id, revision: rev, content: { sections }, created_by: UI.currentUser().id, created_at: new Date().toISOString() });
    t.current_revision = rev;
    E.audit(pid, 'programDocumentTemplate', t.id, 'revision', { doc, revision: rev - 1 }, { doc, revision: rev });
    done('success', `Template ${doc} disimpan sebagai revisi ${rev}. Dokumen baru memakai revisi ini; dokumen lama tidak berubah.`, `/setup/${pid}/ch/${pcId}/documents/${doc}`);
  };

  // ---------------------------------------------------------------- 4 · simulasi (sandbox, tidak menyimpan apa pun)
  route('/setup/:id/simulate', ({ id }, q) => {
    const p = getProgram(id);
    if (!p.channels.length) return { title: 'Simulasi', html: `${nav(p, 'simulate')}<div class="card"><div class="card-body text-muted">Tambahkan channel dulu.</div></div>` };
    const ch0 = p.channels.find((c) => c.id === Number(q.ch)) || p.channels[0];
    return {
      title: 'Simulasi', html: `${nav(p, 'simulate')}
      <div class="row g-3"><div class="col-xl-4"><div class="card sticky-summary"><div class="card-header"><span class="step-chip">4</span>&nbsp;Input contoh</div><div class="card-body">
        <div class="row g-2">
          <div class="col-6"><label class="form-label small">Channel <span class="text-danger">*</span></label><select id="sCh" class="form-control form-control-sm">${p.channels.map((c) => `<option value="${c.id}" ${sel(c.id === ch0.id)}>${esc(c.channel_name)}</option>`).join('')}</select></div>
          <div class="col-6"><label class="form-label small">Brand <span class="text-danger">*</span></label><select id="sBrand" class="form-control form-control-sm"></select></div>
          <div class="col-12"><label class="form-label small">Baseline / bulan <span class="text-danger">*</span></label><div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input id="sBase" type="number" class="form-control" value="200000000"></div></div>
          <div class="col-12"><label class="form-label small">Growth komitmen <span class="text-danger">*</span></label><div class="input-group input-group-sm"><input id="sGrowth" type="number" step="any" class="form-control" value="76"><span class="input-group-text">%</span></div></div>
          <div class="col-6"><label class="form-label small">Bulan periode</label><input id="sMonths" type="number" class="form-control form-control-sm" value="3" min="1" max="12"></div>
          <div class="col-6"><label class="form-label small">Sell out : sell in</label><div class="input-group input-group-sm"><input id="sRatio" type="number" class="form-control" value="98"><span class="input-group-text">%</span></div></div>
          <div class="col-12"><label class="form-label small">Aktual sell in periode <span class="text-muted">(opsional)</span></label><div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input id="sActual" type="number" class="form-control" placeholder="kosong = baseline × bulan × (1 + growth)"></div></div>
          <div class="col-12"><label class="form-label small">Monitoring disetujui di termin ini</label><div class="input-group input-group-sm"><input id="sMonOk" type="number" class="form-control" value="100" min="0" max="100"><span class="input-group-text">%</span></div>
            <div class="form-text">100% = semua periode Monitoring di termin disetujui → Fix Rebate penuh.</div></div>
          <div class="col-12"><label class="form-label small">Kelengkapan evidence per pilar <span class="text-muted">(untuk auto-approve Monitoring)</span></label><div id="sPillars"></div></div>
        </div>
        <div class="small text-muted mt-2">Tidak ada data yang disimpan. Memakai rumus & konfigurasi saat ini, jadi di sinilah rumus dicoba.</div>
      </div></div></div>
      <div class="col-xl-8"><div id="sOut"></div></div></div>`,
      after(root) {
        const $ = (s) => root.querySelector(s);
        const chOf = () => p.channels.find((c) => c.id === Number($('#sCh').value));
        function setup() {
          const ch = chOf();
          $('#sBrand').innerHTML = ch.brands.map((b) => `<option value="${b.brand_code}">${h.esc(b.brand_name)}</option>`).join('');
          $('#sPillars').innerHTML = ch.pillars.map((pl, i) => `<div class="input-group input-group-sm mb-1"><span class="input-group-text text-truncate" style="max-width:190px" title="${h.esc(pl.name)}">${h.esc(pl.name)}</span>
            <input type="number" class="form-control sp" data-i="${i}" value="${[100, 100, 50][i] === undefined ? 100 : [100, 100, 50][i]}"><span class="input-group-text">%</span></div>`).join('') || '<span class="small text-muted">Channel belum punya pilar.</span>';
          run();
        }
        function approvalHtml(ch, phase, objects) {
          const ev = E.evaluateApproval(ch.phases[phase].layers, objects);
          return `<div class="sim-path">${ev.map((x) => `<span class="lp ${x.auto ? 'auto' : ''}">${x.layer.layer_order}. ${h.esc(C.APPROVAL_ROLES[x.layer.role_code])}${x.layer.is_final ? ' · final' : ''}
            <small>${x.auto ? `auto-approved (${h.esc(x.matched.join('; '))})` : x.failed && x.failed.length ? `manual — tidak terpenuhi: ${h.esc(x.failed.join('; '))}` : 'manual'}</small></span>`).join('<i class="bi bi-chevron-right text-muted"></i>') || '<span class="text-danger small">Belum ada approval layer</span>'}</div>`;
        }
        function run() {
          const ch = chOf();
          const code = $('#sBrand').value;
          const base = Number($('#sBase').value); const g = Number($('#sGrowth').value);
          const months = Math.max(1, Math.min(12, Number($('#sMonths').value) || 3)); const ratio = (Number($('#sRatio').value) || 100) / 100;
          const out = $('#sOut');
          if (!code) { out.innerHTML = '<div class="card"><div class="card-body text-muted">Channel belum punya brand.</div></div>'; return; }
          const c = E.commitment(ch, code, base, g, p.programMonths);
          const brand = E.brandOf(ch, code);
          if (!c.class_id) { out.innerHTML = `<div class="card"><div class="card-body"><div class="alert alert-warning mb-0">Tidak eligible untuk ${h.esc(brand.brand_name)}: ${h.esc(c.reason)}</div></div></div>`; return; }
          const actualIn = $('#sActual').value === '' ? base * months * (1 + g / 100) : Number($('#sActual').value);
          const monthly = Array.from({ length: months }, () => ({ sellin: actualIn / months, sellout: actualIn / months * ratio }));
          const comp = [...root.querySelectorAll('.sp')].map((x) => (Number(x.value) || 0) / 100);
          const monOk = Math.max(0, Math.min(100, Number($('#sMonOk').value) || 0)) / 100;
          const r = E.periodCalc(ch, code, { baseline: base, growth_pct: g, class_id: c.class_id, monthly, monitoring_approved: monOk, compliance: comp });
          const regObj = E.registrationObjects([c]);
          const n = ch.leadMeasures.length;
          const monObj = { EVIDENCE_COMPLETE_PCT: comp.length ? comp.reduce((s, x) => s + x, 0) / comp.length * 100 : null, ACHIEVEMENT_PCT: [{ brand_code: code, value: r.achievement_pct }] };
          const payObj = { PAYOUT_AMOUNT: (r.conditional_amount || 0) + (r.fix_amount || 0), ACHIEVEMENT_PCT: [{ brand_code: code, value: r.achievement_pct }] };
          const row = (l, v, cls = '') => `<tr><td>${l}</td><td class="num ${cls}">${v}</td></tr>`;
          out.innerHTML = `
            ${c.error || r.error ? `<div class="alert alert-danger">${h.esc(c.error || r.error)}</div>` : ''}
            <div class="row g-3"><div class="col-md-6"><div class="card"><div class="card-header">Komitmen (Registration)</div><div class="card-body p-0"><table class="table table-sm mb-0">
              ${row('Kelas', h.cls(c.class_code))}${row('Tier dari growth komitmen', c.tier_growth_pct !== null ? c.tier_growth_pct + '%' : 'di bawah tier 1')}
              ${row('Target / bulan', h.rp(Math.round(c.target_monthly || 0)))}${row(`Target program (${p.programMonths} bln)`, h.rp(Math.round(c.target_total || 0)))}
              ${row('Conditional rebate', c.conditional_pct + '%')}${row('Fix rebate maks', c.fix_max_pct + '%')}${row('<strong>Total rebate</strong>', `<strong>${c.total_pct}%</strong>`)}</table></div></div></div>
            <div class="col-md-6"><div class="card"><div class="card-header">Periode ${months} bulan (Payout)</div><div class="card-body p-0"><table class="table table-sm mb-0">
              ${row('Aktual net sell in', h.rp(Math.round(actualIn)))}${row('Achievement', h.pct(r.achievement_pct))}${row('Tier tercapai', r.tier_growth_pct !== null && r.tier_growth_pct !== undefined ? r.tier_growth_pct + '% → ' + r.conditional_pct + '%' : 'di bawah tier 1')}
              ${row('<strong>Conditional rebate</strong>', `<strong>${h.rp(r.conditional_amount)}</strong>`)}${row('Skor Vision Compass', h.num(r.pillar_score, 3))}
              ${row(`<strong>Fix rebate</strong> (${h.esc(ch.pillar_framework_name || '')})`, `<strong>${h.rp(r.fix_amount)}</strong>`)}
              ${(() => { const rr = ratio * 100; const bad = (ch.elig_ratio_min !== null && ch.elig_ratio_min !== undefined && rr < ch.elig_ratio_min) || (ch.elig_ratio_max !== null && ch.elig_ratio_max !== undefined && rr > ch.elig_ratio_max);
                return row('Syarat payout · SO:SI', bad ? `<span class="text-danger">${h.pct(rr)} di luar rentang → tidak dibayar</span>` : `<span class="text-success">${h.pct(rr)} memenuhi</span>`); })()}</table></div></div></div></div>
            <div class="card"><div class="card-header">Jalur approval per fase</div><div class="card-body">
              ${C.PHASES.map((ph) => `<div class="mb-2"><div class="small fw-semibold">${ph.label}</div>${approvalHtml(ch, ph.code, { REGISTRATION: regObj, MONITORING: monObj, PAYOUT: payObj }[ph.code])}</div>`).join('')}</div></div>
            <div class="card"><div class="card-header">Trace perhitungan</div><div class="card-body small"><ol class="mb-0">
              ${c.trace.concat(r.trace).map((t) => `<li>${t.slot ? `<code>${t.slot}</code>${t.override ? ' <span class="badge badge-info">override brand</span>' : ''} = <code>${h.esc(t.expression)}</code> → <strong>${h.num(t.value, Math.abs(t.value) < 10 ? 4 : 0)}</strong>` : h.esc(t.text)}</li>`).join('')}</ol></div></div>`;
        }
        $('#sCh').addEventListener('change', setup);
        root.addEventListener('input', (e) => { if (e.target.closest('.col-xl-4')) run(); });
        $('#sBrand').addEventListener('change', run);
        setup();
      },
    };
  });

  // ---------------------------------------------------------------- 5 · validasi · 6 · publish · 8 · close
  route('/setup/:id/validate', ({ id }) => {
    const p = getProgram(id);
    const { errors, warnings } = E.validateProgram(p);
    const li = (x, sev) => `<li class="${sev}"><span class="sev">${sev === 'error' ? 'Error' : 'Warning'}</span><span>${x.channel ? `<strong>${esc(x.channel)}</strong> · ` : ''}${esc(x.text)}</span></li>`;
    return {
      title: 'Validasi & publish', html: `${nav(p, 'validate')}
      <div class="row g-3"><div class="col-lg-7"><div class="card"><div class="card-header"><span class="step-chip">5</span>&nbsp;Validasi sistem</div><div class="card-body">
        ${!errors.length && !warnings.length ? '<div class="text-success"><i class="bi bi-check-circle-fill"></i> Semua aturan lolos.</div>' : ''}
        <ul class="checks">${errors.map((x) => li(x, 'error')).join('')}${warnings.map((x) => li(x, 'warning')).join('')}</ul>
        <div class="small text-muted mt-3">Error memblokir publish. Warning boleh, setelah dikonfirmasi. Perbaiki di step 3 lalu validasi lagi (halaman ini selalu memvalidasi ulang).</div>
      </div></div></div>
      <div class="col-lg-5">
        ${p.status === 'DRAFT' ? `<div class="card"><div class="card-header"><span class="step-chip">6</span>&nbsp;Publish</div><div class="card-body">
          <form data-action="setup.publish" data-id="${p.id}">
            ${errors.length ? `<div class="alert alert-danger py-2 small">${errors.length} error harus diperbaiki dulu.</div>` : ''}
            ${warnings.length && !errors.length ? `<div class="form-check mb-2"><input type="checkbox" class="form-check-input" name="ack_warn" id="ack" required><label for="ack" class="form-check-label small">Saya sudah membaca ${warnings.length} warning dan tetap ingin publish</label></div>` : ''}
            <div class="form-check mb-3"><input type="checkbox" class="form-check-input" name="confirm" id="cf" required ${errors.length ? 'disabled' : ''}>
              <label for="cf" class="form-check-label small"><strong>Publish mengunci semuanya kecuali template MOU/SKN.</strong> Registration, Monitoring & Payout mulai membaca konfigurasi ini.</label></div>
            <button class="btn btn-success" ${errors.length ? 'disabled' : ''}><i class="bi bi-send-check"></i> Publish program</button>
          </form></div></div>` : ''}
        ${p.status === 'PUBLISHED' ? `<div class="card"><div class="card-header"><span class="step-chip">8</span>&nbsp;Close program</div><div class="card-body small">
          <p>Dilakukan setelah periode & payout terakhir selesai. Status CLOSED: sepenuhnya read-only termasuk template dokumen; tetap tersedia untuk audit & laporan.</p>
          <p>Dipublish ${h.datetime(p.published_at)} oleh ${esc((DB.byId('users', p.published_by) || {}).name || '-')}.</p>
          <button class="btn btn-outline-dark" data-click="setup.close" data-id="${p.id}" data-confirm="Close program ${esc(p.name)}? Tindakan ini membuat program read-only sepenuhnya."><i class="bi bi-archive"></i> Close program</button></div></div>` : ''}
        ${p.status === 'CLOSED' ? '<div class="card"><div class="card-body small text-muted"><i class="bi bi-archive"></i> Program sudah CLOSED.</div></div>' : ''}
      </div></div>`,
    };
  });
  actions['setup.publish'] = (f, form) => {
    const pid = Number(form.dataset.id);
    assertDraft(pid);
    const { errors, warnings } = E.validateProgram(E.loadProgram(pid));
    if (errors.length) throw new Error(`Tidak bisa publish: ${errors.length} error validasi.`);
    if (warnings.length && !f.has('ack_warn')) throw new Error('Konfirmasi warning terlebih dahulu.');
    if (!f.has('confirm')) throw new Error('Centang konfirmasi publish.');
    const p = DB.byId('programs', pid);
    Object.assign(p, { status: 'PUBLISHED', published_at: new Date().toISOString(), published_by: UI.currentUser().id });
    E.audit(pid, 'program', pid, 'publish', { status: 'DRAFT' }, { status: 'PUBLISHED', warnings: warnings.length });
    done('success', `<strong>${esc(p.name)}</strong> PUBLISHED. CBD/CDT sudah bisa registrasi toko.`, `/setup/${pid}/validate`);
  };
  clicks['setup.close'] = (d) => {
    const p = DB.byId('programs', d.id);
    if (p.status !== 'PUBLISHED') throw new Error('Hanya program PUBLISHED yang bisa di-close.');
    p.status = 'CLOSED';
    E.audit(p.id, 'program', p.id, 'close', { status: 'PUBLISHED' }, { status: 'CLOSED' });
    done('success', 'Program CLOSED (read-only).', `/setup/${p.id}/validate`);
  };

  // ---------------------------------------------------------------- audit log (FR13)
  route('/setup/:id/audit', ({ id }) => {
    const p = getProgram(id);
    const logs = DB.where('programAuditLogs', (x) => x.program_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const short = (v) => { if (v === null || v === undefined) return '-'; const s = JSON.stringify(v); return esc(s.length > 140 ? s.slice(0, 140) + '…' : s); };
    return {
      title: 'Audit log', html: `${nav(p, 'audit')}
      <div class="card"><div class="card-header">Audit log <span class="small text-muted fw-normal">&nbsp;— siapa, kapan, apa (sebelum → sesudah)</span></div><div class="table-responsive"><table class="table table-sm mb-0">
        <thead><tr><th>Waktu</th><th>User</th><th>Entitas</th><th>Aksi</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
        <tbody>${logs.map((l) => `<tr><td class="small text-nowrap">${h.datetime(l.created_at)}</td><td class="small">${esc((DB.byId('users', l.actor_id) || {}).name || 'Sistem')}</td>
          <td class="small"><code>${esc(l.entity)}</code></td><td><span class="badge badge-light">${esc(l.action)}</span></td>
          <td class="small text-muted audit-json">${short(l.before_data)}</td><td class="small audit-json">${short(l.after_data)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted p-3">Belum ada perubahan.</td></tr>'}</tbody></table></div></div>`,
    };
  });
})();
