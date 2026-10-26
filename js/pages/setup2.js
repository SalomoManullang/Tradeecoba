// Program Setup bagian 2: 3a eligibility & jadwal · 3f form fase · 3g approval layer & auto-approve ·
// 3h / 7 template MOU-SKN · 4 simulasi · 5 validasi · 6 publish · 8 close · audit log
(function () {
  const { h, route, actions, clicks, done, fail } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;
  const C = window.Catalog;
  const { getProgram, getChannel, nav, assertDraft, assertDocsEditable, touch, editable, fs, confirmTag, soonTag } = window.SetupShared;
  const SM = window.SetupModel;
  const PL = SM.PHASE_LABEL;

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
      title: `${PL[phase]} · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'phases/' + phase)}
      ${phase === 'REGISTRATION' ? '' : `<div class="alert alert-light py-2 small">${soonTag} Fase ${PL[phase]} masih kerangka: editor di bawah dipertahankan dari setup sebelumnya dan akan diperbarui menyusul.</div>`}
      <div class="small text-muted mb-3"><strong>Contoh ${ph.label}:</strong> form — ${PHASE_EXAMPLE[phase].form}; approval — ${PHASE_EXAMPLE[phase].approval}.</div>

      <form data-action="setup.savePhaseForm" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}"><fieldset ${fs(p, ch, phase)}><input type="hidden" name="fields" id="fieldsJson">
      <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3f</span>&nbsp;Form input ${ph.label}</span>
        <span><button type="button" class="btn btn-sm btn-outline-brand" id="addCatalog"><i class="bi bi-plus"></i> Field katalog</button>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addCustom"><i class="bi bi-plus"></i> Field custom</button></span></div>
        <div class="card-body">
          <p class="small text-muted">Field katalog sudah dipahami sistem (mis. baseline, growth, evidence_upload). Field custom bisa ditambah tanpa development; mode <em>Dihitung</em> memakai aturan rumus FR5. Urutan baris = posisi di form.</p>
          <div class="table-responsive"><table class="table table-sm table-bordered phase-fields"><thead><tr><th>#</th><th>Field</th><th>Label</th><th>Tipe</th><th>Mode</th><th>Diulang</th>
            <th title="Visible">Tampil</th><th title="Editable">Edit</th><th title="Required">Wajib</th><th>Min</th><th>Maks</th><th></th></tr></thead><tbody id="fRows"></tbody></table></div>
          <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan form ${ph.label}</button>
        </div></div></fieldset></form>

      <form data-action="setup.saveLayers" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}"><fieldset ${fs(p, ch, phase)}><input type="hidden" name="layers" id="layersJson">
      <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3g</span>&nbsp;Approval layer & auto-approve — ${ph.label}</span>
        <button type="button" class="btn btn-sm btn-outline-brand" id="addLayer"><i class="bi bi-plus"></i> Layer</button></div>
        <div class="card-body">
          <p class="small text-muted">Role dari daftar tetap (<span class="warn-mark" title="Daftar final masih dikonfirmasi">⚠</span>). Layer terakhir = tempat fase berakhir${phase === 'PAYOUT' ? '; Payout <strong>wajib</strong> diakhiri final approval' : ''}.
            Bila submission memenuhi <strong>semua</strong> kondisi sebuah layer (AND, <span class="warn-mark" title="OR masih dikonfirmasi">⚠</span>), layer itu disetujui otomatis & dicatat dengan kondisi yang cocok.
            Objek per brand harus lolos untuk setiap brand. Layer tanpa kondisi selalu butuh orang. Nilai objek kosong = kondisi tidak terpenuhi.</p>
          <div id="layers"></div>
          ${phase === 'REGISTRATION' ? (() => { const ex = SM.setupOf(ch).exception;
            return `<div class="alert alert-warning py-2 small mt-3"><i class="bi bi-signpost-split"></i>&nbsp;<span>Bila pendaftaran <strong>ada exception</strong> (${[ex.trigger_total ? 'total persen melebihi batas total channel' : '', ex.trigger_vc ? 'alokasi Vision Compass per pilar melebihi plafon brand' : ''].filter(Boolean).join(' · ') || 'pemicu belum diaktifkan'}),
              pendaftaran diteruskan ke approver exception <strong>${esc(C.APPROVAL_ROLES[ex.approver_role] || ex.approver_role)}</strong> (RSM = RSBL / ABL)${ex.reason_required ? '; CBD wajib mengisi alasan untuk setiap exception' : ''}.
              Atur di <a href="#/setup/${p.id}/ch/${ch.id}/limits">Batas & exception</a>.</span></div>`; })() : ''}
          <button class="btn btn-brand mt-2"><i class="bi bi-save"></i> Simpan approval ${ph.label}</button>
        </div></div></fieldset></form></div></div>`,
      after(root) {
        const ro = !editable(p, ch, phase);
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
    assertDraft(pid, pcId, phase);
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
    assertDraft(pid, pcId, phase);
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
    const canExc = SM.phaseStatus(ch, 'REGISTRATION') !== 'CLOSED';
    const notElig = elig.filter((x) => !x.eligible && !exceptions.some((e) => e.customer_id === x.s.customer_id));
    const sec = (t) => `<div class="col-12"><div class="elig-sec">${t}</div></div>`;
    return {
      title: `Eligibility · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'eligibility')}
      <div class="row g-3"><div class="col-xl-8">
      <form data-action="setup.saveEligibility" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
      <div class="card mb-3"><div class="card-header"><span class="step-chip">3a</span>&nbsp;Eligibility & jadwal — ${esc(ch.channel_name)}</div><div class="card-body row g-3">
        ${sec('<i class="bi bi-person-check"></i> Syarat pendaftaran <span class="fw-normal text-muted">· dicek saat CBD/CDT mendaftarkan toko</span>')}
        <div class="col-md-4"><label class="form-label">Min. bulan sell out dikirim</label><input name="elig_min_sell_out_months" type="number" class="form-control" value="${nv(ch.elig_min_sell_out_months)}" placeholder="kosong = tidak dicek">
          <div class="form-text">Dari data tahun ${E.baselineMonths(p)[0].slice(0, 4)}. <span class="warn-mark" title="Tidak ada di sales_program 2026; dikonfirmasi">⚠</span></div></div>
        <div class="col-md-4"><label class="form-label">Wajib pernah menerima payout</label><select name="elig_prior_payout_required" class="form-control">
          <option value="0" ${sel(!ch.elig_prior_payout_required)}>Tidak</option><option value="1" ${sel(ch.elig_prior_payout_required)}>Ya</option></select>
          <div class="form-text">Di program tahun ${p.year - 1}. <span class="warn-mark" title="Dikonfirmasi">⚠</span></div></div>
        <div class="col-md-4"><label class="form-label">Baseline minimal per brand</label><div class="form-control bg-light small">baseline kelas terendah di <a href="#/setup/${p.id}/ch/${ch.id}/scheme">Skema kelas</a></div></div>
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

      ${(() => { const th = SM.setupOf(ch).threshold; const tb = th.brands || {};
        const yn = (name, cur, withDefault) => `<select name="${name}" class="form-control form-control-sm">${withDefault ? `<option value="" ${sel(cur === undefined || cur === null)}>Ikut default channel</option>` : ''}
          <option value="1" ${sel(cur === true)}>Ya</option><option value="0" ${sel(cur === false || (!withDefault && !cur))}>Tidak</option></select>`;
        const pctIn = (name, v) => `<div class="input-group input-group-sm"><input name="${name}" type="number" step="any" min="0" class="form-control" value="${nv(v)}"><span class="input-group-text">%</span></div>`;
        const rpIn = (name, v) => `<div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input name="${name}" type="number" min="0" class="form-control" value="${nv(v)}"></div>`;
        return `<form data-action="setup.saveThreshold" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
        <div class="card mb-3"><div class="card-header"><i class="bi bi-arrow-down-short"></i>&nbsp;Threshold di bawah baseline kelas terendah</div><div class="card-body">
          <div class="small text-muted mb-3">Toko dengan baseline di bawah kelas terendah brand: boleh ikut atau tidak. Bila boleh, berlaku rebate minimum dan target minimum. Diatur per channel (default) dan bisa dibedakan per brand.</div>
          <div class="table-responsive"><table class="table table-sm mb-2"><thead><tr><th>Berlaku untuk</th><th style="width:190px">Boleh ikut</th><th style="width:150px">Rebate minimum</th><th style="width:210px">Target minimum</th></tr></thead><tbody>
            <tr class="table-active"><td class="fw-semibold">Default channel</td><td>${yn('th_allowed', th.channel.allowed, false)}</td><td>${pctIn('th_rebate', th.channel.rebate_min)}</td><td>${rpIn('th_target', th.channel.target_min)}</td></tr>
            ${ch.brands.map((b) => { const x = tb[b.brand_code] || {}; return `<tr><td>${esc(b.brand_name)}</td><td>${yn('th_allowed_' + b.brand_code, x.allowed, true)}</td>
              <td>${pctIn('th_rebate_' + b.brand_code, x.rebate_min)}</td><td>${rpIn('th_target_' + b.brand_code, x.target_min)}</td></tr>`; }).join('')}</tbody></table></div>
          <div class="form-text mb-2">Kolom brand yang kosong mengikuti default channel.</div>
          <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan threshold</button>
        </div></div></fieldset></form>`; })()}

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
      </div></div></div></div></div></div>`,
    };
  });
  actions['setup.saveEligibility'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
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
  actions['setup.saveThreshold'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
    const pc = DB.byId('programChannels', pcId);
    const st = SM.setupOf(pc);
    const before = JSON.parse(JSON.stringify(st.threshold));
    const yn = (v) => (v === '1' ? true : v === '0' ? false : null);
    const brands = {};
    for (const b of DB.where('programChannelBrands', (x) => x.program_channel_id === pcId)) {
      const x = { allowed: yn(f.get('th_allowed_' + b.brand_code)), rebate_min: toNum(f.get('th_rebate_' + b.brand_code)), target_min: toNum(f.get('th_target_' + b.brand_code)) };
      const set = Object.fromEntries(Object.entries(x).filter(([, v]) => v !== null));
      if (Object.keys(set).length) brands[b.brand_code] = set;
    }
    st.threshold = { channel: { allowed: f.get('th_allowed') === '1', rebate_min: toNum(f.get('th_rebate')), target_min: toNum(f.get('th_target')) }, brands };
    pc.setup = st;
    touch(pid);
    E.audit(pid, 'programChannel', pcId, 'threshold', before, st.threshold);
    done('success', 'Threshold disimpan.', `/setup/${pid}/ch/${pcId}/eligibility`);
  };

  // Exception boleh diubah saat fase Pendaftaran DRAFT & PUBLISHED (keputusan operasional), tidak saat CLOSED
  function assertNotClosed(pid, pcId) {
    if (!DB.byId('programs', pid) || SM.phaseStatus(DB.byId('programChannels', pcId), 'REGISTRATION') === 'CLOSED') throw new Error('Fase Pendaftaran channel ini CLOSED: read-only.');
  }
  actions['setup.addException'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertNotClosed(pid, pcId);
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
    assertNotClosed(pid, pcId);
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
    const canEdit = SM.phaseStatus(ch, 'REGISTRATION') !== 'CLOSED';
    const generated = DB.where('generatedDocuments', (g) => g.doc_type === doc && d.revisions.some((r) => r.id === g.revision_id));
    return {
      title: `${doc} · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'documents')}
      ${(() => { const st = SM.setupOf(ch);
        const docRow = (v) => `<div class="input-group input-group-sm mb-1 req-doc"><input name="req_doc" class="form-control" value="${esc(v)}" placeholder="Nama dokumen"><button type="button" class="btn btn-light text-danger" data-rm-doc title="Hapus"><i class="bi bi-x-lg"></i></button></div>`;
        return `<form data-action="setup.saveDocsConfig" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
        <div class="card mb-3"><div class="card-header"><i class="bi bi-folder-check"></i>&nbsp;Dokumen wajib & template MoU — ${esc(ch.channel_name)}</div><div class="card-body row g-3">
          <div class="col-md-7"><label class="form-label">Dokumen wajib</label><div id="reqDocs">${st.required_docs.map(docRow).join('')}</div>
            <button type="button" class="btn btn-sm btn-light" id="addReqDoc"><i class="bi bi-plus"></i> Dokumen</button>
            <div class="form-text">Dipakai untuk validasi kelengkapan dokumen di Stage 2.</div></div>
          <div class="col-md-5"><label class="form-label">Template MoU</label><select name="mou_template_pc" class="form-control">
            <option value="" ${sel(!st.mou_template_pc)}>Template MoU channel ini</option>
            ${p.channels.filter((c) => c.id !== ch.id).map((c) => `<option value="${c.id}" ${sel(st.mou_template_pc === c.id)}>Pakai template MoU ${esc(c.channel_name)}</option>`).join('')}</select>
            <div class="form-text">Template yang dipakai saat MoU channel ini dibuat.</div></div>
          <div class="col-12"><button class="btn btn-brand"><i class="bi bi-save"></i> Simpan dokumen wajib & template</button></div>
          <template id="reqDocTpl">${docRow('')}</template>
        </div></div></fieldset></form>`; })()}
      <ul class="nav nav-pills mb-3">${Object.keys(C.DOC_TYPES).map((k) => `<li class="nav-item"><a class="nav-link ${k === doc ? 'active' : ''}" href="#/setup/${p.id}/ch/${ch.id}/documents/${k}">${k}</a></li>`).join('')}</ul>
      ${SM.phaseStatus(ch, 'REGISTRATION') === 'PUBLISHED' ? `<div class="alert alert-info py-2 small"><span class="step-chip">${PL.REGISTRATION}</span>&nbsp;Setelah publish: template ini tetap bisa diubah. Simpan = revisi baru; dokumen yang sudah dibuat tetap memakai revisinya.</div>` : ''}
      <div class="row g-3"><div class="col-xl-7">
        <form data-action="setup.saveDoc" data-id="${p.id}" data-pc="${ch.id}" data-doc="${doc}"><fieldset ${canEdit ? '' : 'disabled'}><input type="hidden" name="sections" id="secJson">
        <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">${doc}</span>&nbsp;Template ${doc} — revisi ${d.latest ? d.latest.revision : '-'}</span>
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
      </div></div></div></div>`,
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
        const reqBox = root.querySelector('#reqDocs');
        root.querySelector('#addReqDoc').addEventListener('click', () => { reqBox.insertAdjacentHTML('beforeend', root.querySelector('#reqDocTpl').innerHTML); reqBox.lastElementChild.querySelector('input').focus(); });
        reqBox.addEventListener('click', (e) => { const b = e.target.closest('[data-rm-doc]'); if (b) b.closest('.req-doc').remove(); });
        draw();
      },
    };
  });
  actions['setup.saveDocsConfig'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
    const pc = DB.byId('programChannels', pcId);
    const st = SM.setupOf(pc);
    const before = { required_docs: st.required_docs, mou_template_pc: st.mou_template_pc };
    const docs = f.all('req_doc').map((x) => String(x).trim()).filter(Boolean);
    if (new Set(docs.map((x) => x.toLowerCase())).size !== docs.length) throw new Error('Nama dokumen wajib tidak boleh dobel.');
    st.required_docs = docs;
    st.mou_template_pc = toNum(f.get('mou_template_pc'));
    pc.setup = st;
    touch(pid);
    E.audit(pid, 'programChannel', pcId, 'documents', before, { required_docs: st.required_docs, mou_template_pc: st.mou_template_pc });
    done('success', 'Dokumen wajib & template MoU disimpan.', `/setup/${pid}/ch/${pcId}/documents`);
  };
  actions['setup.saveDoc'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const doc = form.dataset.doc;
    assertDocsEditable(pid, pcId);
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

  // Sandbox rumus runtime (perhitungan Registration / Payout yang sedang berjalan), dilipat di bawah pratinjau form CBD
  function runtimeSandbox(p, ch0) {
    return { html: `<div class="row g-3"><div class="col-xl-4"><div class="card sticky-summary"><div class="card-header"><span class="step-chip">4</span>&nbsp;Input contoh</div><div class="card-body">
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
        root.querySelector('.sim-old').addEventListener('input', (e) => { if (e.target.closest('.col-xl-4')) run(); });
        $('#sBrand').addEventListener('change', run);
        setup();
      },
    };
  }

  // ---------------------------------------------------------------- 4 · simulasi: pratinjau form CBD (tidak menyimpan apa pun)
  route('/setup/:id/simulate', ({ id }, q) => {
    const p = getProgram(id);
    if (!p.channels.length) return { title: 'Simulasi', html: `<div class="cps">${nav(p, 'simulate')}<div class="card"><div class="card-body text-muted">Tambahkan channel dulu.</div></div></div>` };
    const ch0 = p.channels.find((c) => c.id === Number(q.ch)) || p.channels[0];
    const old = runtimeSandbox(p, ch0);
    const lbl = (t, req) => `<label class="form-label small">${t}${req ? ' <span class="text-danger">*</span>' : ''}</label>`;
    return {
      title: 'Simulasi', html: `<div class="cps">${nav(p, 'simulate')}
      <div class="alert alert-light py-2 small"><i class="bi bi-eye"></i>&nbsp;<span>Pratinjau form CBD dengan konfigurasi saat ini. <strong>Tidak ada data yang disimpan.</strong></span></div>
      <div class="row g-3 sim-cbd"><div class="col-xl-4"><div class="card sticky-summary"><div class="card-header"><span class="step-chip">4</span>&nbsp;Input form CBD</div><div class="card-body">
        <div class="row g-2">
          <div class="col-12">${lbl('Channel', 1)}<select id="pCh" class="form-control form-control-sm">${p.channels.map((c) => `<option value="${c.id}" ${sel(c.id === ch0.id)}>${esc(c.channel_name)}</option>`).join('')}</select></div>
          <div class="col-12">${lbl('Brand', 1)}<select id="pBrand" class="form-control form-control-sm"></select></div>
          <div class="col-12">${lbl('Baseline / bulan', 1)}<div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input id="pBase" type="number" min="0" class="form-control" value="200000000"></div>
            <div class="form-text">Kelas ditentukan otomatis dari rentang baseline brand.</div></div>
          <div class="col-12" id="pGrowthBox"></div>
          <div class="col-12" id="pLowerBox"></div>
          <div class="col-12"><div class="d-flex justify-content-between align-items-center"><label class="form-label small mb-0">Alokasi Vision Compass per pilar (contoh)</label>
            <button type="button" class="btn btn-sm btn-light" id="pAddAlloc"><i class="bi bi-plus"></i> Baris</button></div><div id="pAlloc" class="mt-1"></div></div>
        </div>
      </div></div></div>
      <div class="col-xl-8"><div id="pOut"></div></div></div>
      <details class="cps-fold sim-old mt-3"><summary><i class="bi bi-calculator"></i> Sandbox rumus runtime <span class="small text-muted fw-normal">— perhitungan Registration / Payout yang sedang berjalan (rumus, approval, trace)</span></summary>
        <div class="pt-3">${old.html}</div></details></div>`,
      after(root) {
        old.after(root);
        const $ = (x) => root.querySelector(x);
        const rp = (v) => (v === null || v === undefined ? '-' : h.rp(Math.round(v)));
        const pct = SM.fmtPct;
        const chOf = () => p.channels.find((c) => c.id === Number($('#pCh').value));
        let alloc = [];
        let growthKey = '';
        // isian alokasi yang sedang fokus di-commit dulu: change saat blur baru terpicu ketika barisnya diganti
        const commitFocus = () => { if ($('#pAlloc').contains(document.activeElement)) document.activeElement.blur(); };
        function setupCh() {
          commitFocus();
          const ch = chOf(); const st = SM.setupOf(ch);
          $('#pBrand').innerHTML = ch.brands.map((b) => `<option value="${b.brand_code}">${esc(b.brand_name)}${b.member_names && b.member_names.length ? ` (+ ${esc(b.member_names.join(', '))})` : ''}</option>`).join('');
          $('#pLowerBox').innerHTML = st.cbd_can_lower_conditional ? `${lbl('Turunkan conditional rebate ke')}<div class="input-group input-group-sm"><input id="pLower" type="number" step="any" min="0" class="form-control" placeholder="kosong = tidak diturunkan"><span class="input-group-text">%</span></div>
            <div class="form-text">Diizinkan sampai 0%${st.lowering_adds_vc ? '; selisih penurunan menambah plafon Vision Compass brand' : ''}.</div>` : '';
          alloc = [{ pillar: '', detail: '', nominal: '' }];
          growthKey = '';
          renderAlloc(); run();
        }
        // [⚠ KONFIRMASI] contoh teks detail activation = saran lead measure pilar itu untuk brand × kelas
        function lmExample(ch, brandCode, cls, pillar) {
          const st = SM.setupOf(ch);
          if (!st.lm_as_detail_example || !cls || !pillar) return 'Detail aktivasi';
          const b = E.brandOf(ch, brandCode);
          for (const l of ch.leadMeasures.filter((x) => x.pillar_name === pillar)) { const r = E.lmTarget(b, cls.code, l); if (r && r.applies) return `Contoh dari saran lead measure: ${l.name} ${E.lmTargetText(r)}`; }
          return 'Detail aktivasi';
        }
        function renderAlloc() {
          commitFocus();
          const ch = chOf(); const st = SM.setupOf(ch);
          const cls = SM.classOf(st, $('#pBrand').value, $('#pBase').value);
          $('#pAlloc').innerHTML = !ch.pillars.length ? `<div class="small text-muted">Channel ini belum punya pilar. Atur di <a href="#/setup/${p.id}/ch/${ch.id}/pillars">Pilar & saran lead measure</a>.</div>`
            : alloc.map((a, i) => { const ph = lmExample(ch, $('#pBrand').value, cls, a.pillar);
              return `<div class="alloc-row border rounded p-2 mb-2" data-i="${i}"><div class="row g-1">
              <div class="col-12"><select class="form-control form-control-sm" data-k="pillar"><option value="">Pilih pilar</option>${ch.pillars.map((x) => `<option ${sel(a.pillar === x.name)}>${esc(x.name)}</option>`).join('')}</select></div>
              <div class="col-12"><input class="form-control form-control-sm" data-k="detail" value="${esc(a.detail)}" placeholder="${esc(ph)}" title="${esc(ph)}"></div>
              <div class="col-9"><div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input type="number" min="0" class="form-control" data-k="nominal" value="${esc(a.nominal)}" placeholder="Nominal"></div></div>
              <div class="col-3 text-end"><button type="button" class="btn btn-sm btn-light text-danger" data-del="${i}" title="Hapus baris"><i class="bi bi-trash"></i></button></div></div></div>`; }).join('');
        }
        // growth per tier diisi CBD (tanpa saran); kelas tetap dari baseline
        function renderGrowth(brand, cls) {
          const key = [brand, cls && cls.code].join('|');
          if (key === growthKey) return;
          growthKey = key;
          $('#pGrowthBox').innerHTML = !cls ? '' : `${lbl('Growth per tier (diisi CBD)')}
            <div class="row g-1">${cls.tiers.map((t, i) => `<div class="col-4"><div class="small text-muted mb-1">Tier ${i + 1}</div><div class="input-group input-group-sm"><input type="number" step="any" class="form-control pg" data-i="${i}" placeholder="isi"><span class="input-group-text">%</span></div></div>`).join('')}</div>
            <div class="mt-2">${lbl('Tier yang dipilih CBD')}<select id="pTier" class="form-control form-control-sm">${cls.tiers.map((t, i) => `<option value="${i + 1}">Tier ${i + 1}</option>`).join('')}</select></div>`;
        }
        function run() {
          const ch = chOf(); const st = SM.setupOf(ch);
          const brand = $('#pBrand').value;
          const out = $('#pOut');
          if (!brand) { out.innerHTML = '<div class="card"><div class="card-body text-muted">Channel belum punya brand.</div></div>'; return; }
          if (!SM.schemeOf(st, brand).classes.length) { out.innerHTML = `<div class="card"><div class="card-body text-muted">Brand ini belum punya skema kelas. Atur di <a href="#/setup/${p.id}/ch/${ch.id}/scheme/${brand}">Skema kelas</a>.</div></div>`; $('#pGrowthBox').innerHTML = ''; growthKey = ''; return; }
          renderGrowth(brand, SM.classOf(st, brand, $('#pBase').value));
          const r = SM.preview(p, ch, { brand, baseline: $('#pBase').value, growth: [...root.querySelectorAll('.pg')].map((x) => x.value), tier: ($('#pTier') || {}).value,
            alloc, lower_to: ($('#pLower') || {}).value });
          const bn = esc((ch.brands.find((b) => b.brand_code === brand) || {}).brand_name || brand);
          if (!r.cls) {
            const th = r.threshold || {};
            out.innerHTML = `<div class="card"><div class="card-header">Kelas</div><div class="card-body">
              ${r.below ? `<p class="mb-2">Baseline ${rp(Number($('#pBase').value))} <strong>di bawah baseline kelas terendah</strong> ${bn}.</p>
                ${th.allowed ? `<div class="alert alert-info py-2 small mb-0">Threshold: <strong>boleh ikut</strong> dengan rebate minimum ${pct(th.rebate_min)} dan target minimum ${rp(th.target_min)}.</div>`
                  : '<div class="alert alert-warning py-2 small mb-0">Threshold: <strong>tidak boleh ikut</strong> untuk brand ini.</div>'}`
                : '<div class="text-muted">Baseline tidak masuk kelas mana pun. Periksa rentang baseline di Skema kelas.</div>'}</div></div>`;
            return;
          }
          const sel1 = r.selected;
          const tierRows = r.tiers.map((t) => `<tr class="${sel1 && t.tier === sel1.tier ? 'sel-tier' : ''}"><td class="text-nowrap">Tier ${t.tier}${sel1 && t.tier === sel1.tier ? ' <span class="badge badge-light">dipilih</span>' : ''}</td><td class="num">${pct(t.growth)}</td><td class="num">${rp(t.target)}</td>
            <td class="num">${pct(t.semester_pct)}<div class="small text-muted">${rp(t.semester_rp)}</div></td><td class="num">${pct(t.yearly_pct)}<div class="small text-muted">${rp(t.yearly_rp)}</div></td>
            <td class="num fw-semibold">${pct(t.total_pct)}<div class="small text-muted">${rp(t.total_rp)}</div></td></tr>`).join('');
          const byPillar = ch.pillars.map((x) => [x.name, alloc.filter((a) => a.pillar === x.name).reduce((s2, a) => s2 + (Number(a.nominal) || 0), 0)]).filter(([, v]) => v);
          const lim = r.rules.total_max_pct;
          out.innerHTML = `
            <div class="card"><div class="card-header">Kelas & target <span class="small text-muted fw-normal">&nbsp;— ${bn} · ${esc(ch.channel_name)}</span></div><div class="card-body">
              <div class="cps-facts mb-3"><div class="cps-fact"><span class="cps-fact-label">Kelas</span><span class="cps-fact-value">${h.cls(r.cls.code)}</span></div>
                <div class="cps-fact"><span class="cps-fact-label">Baseline / bulan</span><span class="cps-fact-value">${rp(Number($('#pBase').value))}</span></div>
                <div class="cps-fact"><span class="cps-fact-label">Rumus target</span><span class="cps-fact-value"><code>baseline × 12 × (1 + growth)</code></span></div></div>
              <div class="table-responsive"><table class="table table-sm mb-0"><thead><tr><th>Tier</th><th class="num">Growth</th><th class="num">Target 2027</th><th class="num">Semester benefit</th><th class="num">Yearly benefit</th><th class="num">Total conditional</th></tr></thead>
                <tbody>${tierRows}</tbody></table></div>
              ${sel1 && sel1.growth === null ? '<div class="small text-muted mt-2">Isi growth tier yang dipilih untuk menghitung target, nilai benefit, dan plafon Vision Compass.</div>' : ''}
              ${r.lowered ? `<div class="alert alert-info py-2 small mt-2 mb-0">Conditional rebate diturunkan dari ${pct(r.lowered.from)} ke ${pct(r.lowered.to)} (selisih ${rp(r.lowered.diff_rp)})${r.lowered.adds_vc ? '; selisih menambah plafon Vision Compass' : ''}.</div>` : ''}
            </div></div>
            <div class="row g-3"><div class="col-md-6"><div class="card h-100"><div class="card-header">Vision Compass</div><div class="card-body p-0"><table class="table table-sm mb-0">
              <tr><td>Persen Vision Compass kelas ${esc(r.cls.code)}</td><td class="num">${pct(r.vc_pct)}</td></tr>
              <tr><td>Plafon brand <span class="small text-muted">(target tier ${sel1 ? sel1.tier : '-'} × persen VC)</span></td><td class="num fw-semibold">${rp(r.plafon)}</td></tr>
              ${byPillar.map(([n, v]) => `<tr><td class="small">Alokasi · ${esc(n)}</td><td class="num small">${rp(v)}</td></tr>`).join('')}
              <tr><td>Total alokasi contoh</td><td class="num">${rp(r.alloc_total)}</td></tr>
              <tr><td><strong>Sisa plafon</strong></td><td class="num fw-semibold ${r.sisa !== null && r.sisa < 0 ? 'text-danger' : 'text-success'}">${rp(r.sisa)}</td></tr></table></div></div></div>
            <div class="col-md-6"><div class="card h-100"><div class="card-header">Total & exception</div><div class="card-body">
              <div class="d-flex justify-content-between"><span>Total persen <span class="small text-muted">(conditional ${pct(r.cond_pct)} + VC ${pct(r.vc_pct)})</span></span><strong>${pct(r.total_pct)}</strong></div>
              <div class="d-flex justify-content-between small text-muted mb-3"><span>Batas total channel</span><span>${lim === null ? 'belum ditentukan' : pct(lim)}</span></div>
              ${r.exceptions.length ? r.exceptions.map((x, i) => `<div class="alert alert-warning py-2 small mb-2"><strong>Exception ${i + 1}:</strong> ${esc(x)}
                <textarea class="form-control form-control-sm mt-2" rows="2" placeholder="Alasan exception${st.exception.reason_required ? ' (wajib)' : ''}"></textarea></div>`).join('')
                + `<div class="small text-muted">Pendaftaran akan diteruskan ke approver exception <strong>${esc(C.APPROVAL_ROLES[st.exception.approver_role] || st.exception.approver_role)}</strong> (RSM = RSBL / ABL).</div>`
                : '<div class="text-success small"><i class="bi bi-check-circle-fill"></i> Tidak ada exception.</div>'}
            </div></div></div></div>
            <div class="card"><div class="card-header">Termin pencairan <span class="small text-muted fw-normal">&nbsp;— porsi berlaku untuk: ${esc(SM.TERM_BASIS[st.term_basis] || '-')}</span>&nbsp;${confirmTag}</div><div class="card-body p-0">
              ${r.terms && r.terms.length ? `<table class="table table-sm mb-0"><thead><tr><th>Termin</th><th>Tipe</th><th class="num">Porsi</th><th class="num">Target termin</th><th class="num">Benefit maks termin</th></tr></thead><tbody>
                ${r.terms.map((t) => `<tr><td>${esc(t.name)}</td><td>${esc(SM.TERM_TYPES[t.type] || t.type)}</td><td class="num">${pct(t.portion_pct)}</td><td class="num">${t.target === null ? '<span class="text-muted">-</span>' : rp(t.target)}</td><td class="num">${t.rebate === null ? '<span class="text-muted">-</span>' : rp(t.rebate)}</td></tr>`).join('')}</tbody></table>
                <div class="small text-muted p-3 pt-2">Pencapaian dinilai per termin; payout termin tidak melebihi porsinya.</div>`
                : '<div class="small text-muted p-3">Belum ada termin pencairan.</div>'}</div></div>`;
        }
        $('#pCh').addEventListener('change', setupCh);
        $('#pBrand').addEventListener('change', () => { renderAlloc(); run(); });
        $('#pBase').addEventListener('input', () => { run(); renderAlloc(); });
        $('#pGrowthBox').addEventListener('input', run);
        $('#pGrowthBox').addEventListener('change', run);
        $('#pLowerBox').addEventListener('input', run);
        $('#pAddAlloc').addEventListener('click', () => { alloc.push({ pillar: '', detail: '', nominal: '' }); renderAlloc(); });
        const onAlloc = (e) => {
          const del = e.target.closest('[data-del]');
          if (del && e.type === 'click') { alloc.splice(Number(del.dataset.del), 1); renderAlloc(); run(); return; }
          const row = e.target.closest('.alloc-row'); const k = e.target.dataset.k;
          if (!row || !k || e.type === 'click') return;
          alloc[Number(row.dataset.i)][k] = e.target.value;
          if (k === 'pillar' && e.type === 'change') renderAlloc();
          run();
        };
        ['click', 'input', 'change'].forEach((t) => $('#pAlloc').addEventListener(t, onAlloc));
        setupCh();
      },
    };
  });

  // ---------------------------------------------------------------- 5 · validasi & publish per channel × fase · close
  // Simpan sebagian selalu boleh; validasi hanya memblokir publish fase yang bersangkutan.
  const { phaseMatrix } = window.SetupShared;
  route('/setup/:id/validate', ({ id }, q) => {
    const p = getProgram(id);
    const res = {};
    for (const ch of p.channels) for (const [ph] of SM.PHASES) res[ch.id + ph] = SM.validatePhase(p, ch, ph);
    const ch = p.channels.find((c) => c.id === Number(q.ch)) || p.channels[0];
    const phase = SM.PHASE_LABEL[q.ph] ? q.ph : 'REGISTRATION';
    const cellHtml = (c, ph) => {
      const r = res[c.id + ph]; const st = SM.phaseStatus(c, ph);
      const cnt = st !== 'DRAFT' ? '' : r.errors.length ? `<span class="small text-danger">${r.errors.length} error</span>` : r.warnings.length ? `<span class="small text-warning">${r.warnings.length} warning</span>` : '<span class="small text-success">siap publish</span>';
      return `<a class="cps-cell ${ch && c.id === ch.id && ph === phase ? 'active' : ''}" href="#/setup/${p.id}/validate?ch=${c.id}&ph=${ph}">
        <span class="cps-phase-st st-${st.toLowerCase()}">${h.STATUS[st][0]}</span>${ph !== 'REGISTRATION' ? soonTag : ''} ${cnt}</a>`;
    };
    const li = (x, sev) => `<li class="${sev}"><span class="sev">${sev === 'error' ? 'Error' : 'Warning'}</span><span>${esc(x)}</span></li>`;
    let detail = '';
    if (ch) {
      const { errors, warnings } = res[ch.id + phase];
      const st = SM.phaseStatus(ch, phase);
      const ref = `${esc(ch.channel_name)} · ${PL[phase]}`;
      detail = `<div class="row g-3"><div class="col-lg-7"><div class="card"><div class="card-header">Validasi · ${ref}</div><div class="card-body">
          ${!errors.length && !warnings.length ? '<div class="text-success"><i class="bi bi-check-circle-fill"></i> Semua aturan lolos.</div>' : ''}
          <ul class="checks">${errors.map((x) => li(x, 'error')).join('')}${warnings.map((x) => li(x, 'warning')).join('')}</ul>
          <div class="small text-muted mt-3">Error memblokir publish fase ini. Warning boleh, setelah dikonfirmasi. Simpan sebagian tetap boleh kapan saja; halaman ini selalu memvalidasi ulang.</div>
        </div></div></div>
        <div class="col-lg-5">
        ${st === 'DRAFT' ? `<div class="card"><div class="card-header"><span class="step-chip">6</span>&nbsp;Publish ${ref}</div><div class="card-body">
          <form data-action="setup.publishPhase" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}">
            ${errors.length ? `<div class="alert alert-danger py-2 small">${errors.length} error harus diperbaiki dulu.</div>` : ''}
            ${warnings.length && !errors.length ? `<div class="form-check mb-2"><input type="checkbox" class="form-check-input" name="ack_warn" id="ack" required><label for="ack" class="form-check-label small">Saya sudah membaca ${warnings.length} warning dan tetap ingin publish</label></div>` : ''}
            <div class="form-check mb-3"><input type="checkbox" class="form-check-input" name="confirm" id="cf" required ${errors.length ? 'disabled' : ''}>
              <label for="cf" class="form-check-label small"><strong>Publish mengunci bagian fase ${PL[phase]} channel ini</strong>${phase === 'REGISTRATION' ? ' (kecuali template MoU / SKN)' : ''}. Fase lain tetap bisa diedit.</label></div>
            <button class="btn btn-success" ${errors.length ? 'disabled' : ''}><i class="bi bi-send-check"></i> Publish ${PL[phase]}</button>
          </form></div></div>` : ''}
        ${st === 'PUBLISHED' ? `<div class="card"><div class="card-header"><span class="step-chip">8</span>&nbsp;Close ${ref}</div><div class="card-body small">
          <p>Status CLOSED: fase ini sepenuhnya read-only${phase === 'REGISTRATION' ? ' termasuk template dokumen' : ''}; tetap tersedia untuk audit & laporan.</p>
          ${(ch.phase_published || {})[phase] ? `<p>Dipublish ${h.datetime(ch.phase_published[phase].at)} oleh ${esc((DB.byId('users', ch.phase_published[phase].by) || {}).name || '-')}.</p>` : ''}
          <button class="btn btn-outline-dark" data-click="setup.closePhase" data-id="${p.id}" data-pc="${ch.id}" data-phase="${phase}" data-confirm="Close fase ${PL[phase]} channel ${esc(ch.channel_name)}? Fase ini menjadi read-only sepenuhnya."><i class="bi bi-archive"></i> Close ${PL[phase]}</button></div></div>` : ''}
        ${st === 'CLOSED' ? `<div class="card"><div class="card-body small text-muted"><i class="bi bi-archive"></i> Fase ${PL[phase]} channel ini sudah CLOSED.</div></div>` : ''}
        </div></div>`;
    }
    return {
      title: 'Validasi & publish', html: `<div class="cps">${nav(p, 'validate')}
      <div class="card"><div class="card-header"><span class="step-chip">5</span>&nbsp;Status channel × fase <span class="small text-muted fw-normal">&nbsp;— pilih sel untuk melihat validasi lalu publish / close</span></div>
        <div class="card-body p-0">${phaseMatrix(p, cellHtml)}</div></div>
      ${detail}</div>`,
    };
  });
  actions['setup.publishPhase'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const phase = form.dataset.phase;
    assertDraft(pid, pcId, phase);
    const p = E.loadProgram(pid);
    const ch = p.channels.find((c) => c.id === pcId);
    const { errors, warnings } = SM.validatePhase(p, ch, phase);
    if (errors.length) throw new Error(`Tidak bisa publish: ${errors.length} error validasi.`);
    if (warnings.length && !f.has('ack_warn')) throw new Error('Konfirmasi warning terlebih dahulu.');
    if (!f.has('confirm')) throw new Error('Centang konfirmasi publish.');
    const pc = DB.byId('programChannels', pcId);
    pc.phase_status = Object.assign({}, pc.phase_status, { [phase]: 'PUBLISHED' });
    pc.phase_published = Object.assign({}, pc.phase_published, { [phase]: { at: new Date().toISOString(), by: UI.currentUser().id } });
    touch(pid);
    E.audit(pid, 'programChannel', pcId, 'publish', { phase, status: 'DRAFT' }, { phase, status: 'PUBLISHED', warnings: warnings.length });
    done('success', `Fase <strong>${PL[phase]}</strong> channel ${esc(ch.channel_name)} PUBLISHED.${phase === 'REGISTRATION' ? ' CBD/CDT sudah bisa registrasi toko di channel ini.' : ''}`, `/setup/${pid}/validate?ch=${pcId}&ph=${phase}`);
  };
  clicks['setup.closePhase'] = (d) => {
    const pc = DB.byId('programChannels', Number(d.pc)); const phase = d.phase;
    if (SM.phaseStatus(pc, phase) !== 'PUBLISHED') throw new Error('Hanya fase PUBLISHED yang bisa di-close.');
    pc.phase_status = Object.assign({}, pc.phase_status, { [phase]: 'CLOSED' });
    touch(Number(d.id));
    E.audit(Number(d.id), 'programChannel', pc.id, 'close', { phase, status: 'PUBLISHED' }, { phase, status: 'CLOSED' });
    done('success', `Fase ${PL[phase]} CLOSED (read-only).`, `/setup/${d.id}/validate?ch=${pc.id}&ph=${phase}`);
  };

  // ---------------------------------------------------------------- audit log (FR13)
  route('/setup/:id/audit', ({ id }) => {
    const p = getProgram(id);
    const logs = DB.where('programAuditLogs', (x) => x.program_id === p.id).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
    const short = (v) => { if (v === null || v === undefined) return '-'; const s = JSON.stringify(v); return esc(s.length > 140 ? s.slice(0, 140) + '…' : s); };
    return {
      title: 'Audit log', html: `<div class="cps">${nav(p, 'audit')}
      <div class="card"><div class="card-header">Audit log <span class="small text-muted fw-normal">&nbsp;— siapa, kapan, apa (sebelum → sesudah)</span></div><div class="table-responsive"><table class="table table-sm mb-0">
        <thead><tr><th>Waktu</th><th>User</th><th>Entitas</th><th>Aksi</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
        <tbody>${logs.map((l) => `<tr><td class="small text-nowrap">${h.datetime(l.created_at)}</td><td class="small">${esc((DB.byId('users', l.actor_id) || {}).name || 'Sistem')}</td>
          <td class="small"><code>${esc(l.entity)}</code></td><td><span class="badge badge-light">${esc(l.action)}</span></td>
          <td class="small text-muted audit-json">${short(l.before_data)}</td><td class="small audit-json">${short(l.after_data)}</td></tr>`).join('') || '<tr><td colspan="6" class="text-muted p-3">Belum ada perubahan.</td></tr>'}</tbody></table></div></div></div>`,
    };
  });
})();
