// Registration (CBD/CDT): saran toko dari aturan eligibility, baseline & growth per brand diisi CBD/CDT,
// kelas/tier/rebate otomatis dari konfigurasi, approval layer Registration + auto-approve, MOU/SKN.
(function () {
  const { h, route, actions, done, fail, inScope, store } = UI;
  const { esc, toNum } = h;
  const E = window.Engine;
  const C = window.Catalog;

  const canSeeChannel = (user, code) => !user.channel_codes || !user.channel_codes.length || user.channel_codes.includes(code);

  function ctx(programId, pcId, user, year) {
    UI.requireRole('CBD');
    const program = E.loadProgram(Number(programId));
    if (!program || program.year !== year) fail('Program tidak ditemukan');
    if (program.status !== 'PUBLISHED') fail('Program belum dipublish', 'Registration hanya membaca program PUBLISHED.');
    const ch = program.channels.find((c) => c.id === Number(pcId));
    if (!ch || !canSeeChannel(user, ch.channel_code)) fail('Channel tidak ditemukan', 'Channel tidak ada atau di luar scope Anda.');
    return { program, ch };
  }

  // ---------------------------------------------------------------- pilih program & channel
  route('/registration', ({}, q, { user, year }) => {
    UI.requireRole('CBD');
    const programs = DB.where('programs', (p) => p.year === year && p.status === 'PUBLISHED').map((x) => E.loadProgram(x.id));
    return {
      title: 'Registration', html: `<div class="page-head"><div><h1>Registration ${year}</h1><div class="sub">Pilih program & channel. Saran toko mengikuti aturan eligibility yang diatur Admin HO.</div></div></div>
      ${programs.map((p) => `<div class="card mb-3"><div class="card-header">${esc(p.name)}&nbsp;<span class="text-muted fw-normal">· ${esc(p.code)} · ${h.date(p.period_start)} – ${h.date(p.period_end)}</span></div>
        <div class="card-body"><div class="row g-3">${p.channels.filter((c) => canSeeChannel(user, c.channel_code)).map((c) => {
          const regs = DB.where('registrations', (x) => x.program_channel_id === c.id);
          return `<div class="col-md-4"><div class="border rounded p-3 h-100 d-flex flex-column">
            <div class="fw-semibold">${esc(c.channel_name)}</div>
            <div class="small text-muted mb-2">${c.brands.map((b) => esc(b.brand_name)).join(', ')}</div>
            <div class="small mb-3"><strong>${regs.filter((x) => x.status !== 'rejected').length}</strong> toko terdaftar${regs.some((x) => x.status === 'returned') ? ` · <span class="text-info">${regs.filter((x) => x.status === 'returned').length} perlu revisi</span>` : ''}</div>
            <a href="#/registration/program/${p.id}/${c.id}" class="btn btn-brand btn-sm mt-auto">Lihat saran toko <i class="bi bi-arrow-right"></i></a></div></div>`;
        }).join('') || '<div class="col-12 text-muted">Tidak ada channel dalam scope Anda.</div>'}</div></div></div>`).join('')
        || `<div class="card"><div class="card-body text-muted">Belum ada program PUBLISHED di tahun ${year}.</div></div>`}`,
    };
  });

  // ---------------------------------------------------------------- saran toko (eligibility)
  route('/registration/program/:p/:pc', ({ p: pid, pc: pcid }, q, { user, year }) => {
    const { program, ch } = ctx(pid, pcid, user, year);
    const registered = new Set(DB.where('registrations', (x) => x.program_id === program.id && x.program_channel_id === ch.id).map((x) => x.customer_id));
    const stores = DB.t('stores').filter((s) => s.channel_code === ch.channel_code && inScope(user, s) && !registered.has(s.customer_id));
    let rows = stores.map((s) => ({ s, el: E.eligibility(program, ch, s.customer_id) })).sort((a, b) => Number(b.el.eligible) - Number(a.el.eligible));
    const nElig = rows.filter((r) => r.el.eligible).length;
    const showAll = q.all === '1';
    if (!showAll) rows = rows.filter((r) => r.el.eligible);
    const ref = E.baselineMonths(program)[0].slice(0, 4);
    return {
      title: `Saran toko · ${ch.channel_name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/registration">Registration</a> / ${esc(program.name)}</div>
        <h1>Saran toko · ${esc(ch.channel_name)}</h1><div class="sub">Saran baseline = rata-rata sell in ${ref} per brand. Baseline final diisi CBD/CDT di form.</div></div>
        <div class="text-right"><div class="fs-5"><strong>${nElig}</strong> <span class="text-muted fs-6">eligible dari ${stores.length} toko belum terdaftar</span></div>
          <a href="#/registration/program/${program.id}/${ch.id}?all=${showAll ? '0' : '1'}" class="small">${showAll ? 'Sembunyikan yang tidak eligible' : 'Tampilkan juga yang tidak eligible'}</a></div></div>
      <div class="card mb-2"><div class="card-body py-2 small d-flex flex-wrap gap-3"><span class="text-muted">Aturan eligibility:</span>
        ${ch.elig_min_sell_out_months ? `<span>Min ${ch.elig_min_sell_out_months} bulan sell out</span>` : ''}
        ${ch.elig_ratio_min !== null ? `<span>· SO:SI ${ch.elig_ratio_min}–${ch.elig_ratio_max === null ? '∞' : ch.elig_ratio_max}%</span>` : ''}
        <span>· Baseline min per brand: ${ch.brands.map((b) => `${esc(b.brand_name)} ${h.rpShort(E.minBaseline(ch, b))}`).join(', ')}</span>
        ${ch.elig_prior_payout_required ? '<span>· Wajib pernah menerima payout</span>' : ''}</div></div>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide">
        <thead><tr><th>Toko</th><th>DC</th><th class="num">Bln SO</th><th class="num">SO:SI</th>${ch.brands.map((b) => `<th class="num">${esc(b.brand_name)}</th>`).join('')}<th></th></tr></thead>
        <tbody>${rows.map(({ s, el }) => `<tr class="${el.eligible ? '' : 'text-muted'}">
          <td><div class="fw-semibold">${esc(s.name)}</div><div class="small text-muted">${s.customer_id} · ${esc(s.city)}</div></td><td>${s.dc_code}</td>
          <td class="num">${el.soMonths}</td><td class="num">${h.pct(el.ratio)}</td>
          ${el.brands.map((b) => `<td class="num small ${b.eligible ? '' : 'text-muted'}">${b.suggested ? h.rpShort(b.suggested) : '-'}${b.cls ? `<br>${h.cls(b.cls.code)}` : ''}</td>`).join('')}
          <td class="text-right">${el.eligible ? `<a href="#/registration/program/${program.id}/${ch.id}/store/${s.customer_id}" class="btn btn-sm btn-brand">Daftarkan</a>`
            : `<span class="small text-danger">${esc(el.reasons.join('; '))}</span>`}</td></tr>`).join('')
          || `<tr><td colspan="${5 + ch.brands.length}" class="text-center text-muted py-4">Tidak ada toko ${showAll ? '' : 'eligible '}yang belum terdaftar.</td></tr>`}</tbody></table></div></div>`,
    };
  });

  // ---------------------------------------------------------------- form registration
  const isBrandField = (f) => f.repeat_per === 'BRAND' && f.is_visible;
  function customCalc(f, c, months) {
    if (!f.expression || !c.class_id) return null;
    try {
      return window.Formula.evaluate(f.expression, { baseline: c.baseline, growth: c.growth_pct / 100, months, target: c.target_monthly || 0,
        fix_max_pct: c.fix_max_pct / 100, reached_tier_conditional_pct: c.conditional_pct / 100, reached_tier_total_pct: c.total_pct / 100 });
    } catch (e) { return null; }
  }
  function calcCell(f, c, months) {
    if (!c || !c.class_id) return '<span class="text-muted">-</span>';
    switch (f.field_key) {
      case 'target_class': return h.cls(c.class_code);
      case 'avg_target': return h.rp(Math.round(c.target_monthly || 0));
      case 'total_target': return h.rp(Math.round(c.target_total || 0));
      case 'conditional_rebate': return `${c.conditional_pct}%`;
      case 'total_rebate': return `<strong>${c.total_pct}%</strong> <span class="small text-muted">(fix ${c.fix_max_pct}%)</span>`;
      default: { const v = customCalc(f, c, months); return v === null ? '-' : f.data_type === 'PERCENT' ? h.pct(v * 100, 2) : f.data_type === 'RUPIAH' ? h.rp(Math.round(v)) : h.num(v, 2); }
    }
  }

  function formPage({ program, ch, el, s, reg, values, errors }) {
    const fields = ch.phases.REGISTRATION.fields;
    const bf = fields.filter(isBrandField);
    const other = fields.filter((f) => !isBrandField(f) && f.is_visible && f.repeat_per === 'NONE');
    const fBase = fields.find((f) => f.field_key === 'baseline'); const fGrowth = fields.find((f) => f.field_key === 'growth');
    const brandRows = ch.brands.map((b) => {
      const sug = el.brands.find((x) => x.brand_code === b.brand_code) || {};
      const prev = reg ? reg.brands.find((x) => x.brand_code === b.brand_code) : null;
      const v = values.brands[b.brand_code] || {};
      const join = v.join !== undefined ? v.join : prev ? true : !reg && sug.eligible;
      return { b, sug, join, baseline: v.baseline !== undefined ? v.baseline : prev ? prev.baseline : sug.suggested ? Math.round(sug.suggested / 1e6) * 1e6 : '',
        growth: v.growth !== undefined ? v.growth : prev ? prev.growth_pct : (sug.cls && sug.cls.tiers[0] ? sug.cls.tiers[0].target_growth_pct : ''), data: v.data || (prev && prev.data) || {} };
    });
    const layers = ch.phases.REGISTRATION.layers;
    return {
      title: `${reg ? 'Revisi' : 'Daftarkan'} ${s.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/registration">Registration</a> / <a href="#/registration/program/${program.id}/${ch.id}">${esc(program.name)} · ${esc(ch.channel_name)}</a></div>
        <h1>${reg ? 'Revisi' : 'Daftarkan'} ${esc(s.name)}</h1><div class="sub">${s.customer_id} · ${esc(s.city)} · SO:SI ${h.pct(el.ratio)} · ${el.soMonths} bulan sell out</div></div></div>
      ${UI.errorsHtml(errors)}
      <form data-action="reg.submit" id="regForm" data-program="${program.id}" data-pc="${ch.id}" data-cid="${s.customer_id}" data-reg="${reg ? reg.id : ''}">
      <div class="card mb-3"><div class="card-header">Target per brand&nbsp;<span class="small text-muted fw-normal">— baseline & growth diisi CBD/CDT, kelas/tier/rebate otomatis</span></div>
        <div class="table-responsive"><table class="table table-sm table-bordered mb-0 reg-brands"><thead><tr><th>Ikut</th><th>Brand</th><th class="num">Saran baseline</th>
          ${bf.map((f) => `<th>${esc(f.label)}${f.is_required ? ' <span class="text-danger">*</span>' : ''}</th>`).join('')}</tr></thead>
          <tbody>${brandRows.map((r) => `<tr data-b="${r.b.brand_code}">
            <td class="text-center"><input type="checkbox" class="form-check-input position-static join" name="join_${r.b.brand_code}" ${r.join ? 'checked' : ''}></td>
            <td class="fw-semibold">${esc(r.b.brand_name)}${r.b.member_names.length ? `<div class="small text-muted">+ ${esc(r.b.member_names.join(', '))}</div>` : ''}<div class="small text-danger reason"></div></td>
            <td class="num small">${r.sug.suggested ? h.rpShort(r.sug.suggested) : '-'}</td>
            ${bf.map((f) => {
              if (f.mode === 'CALCULATED') return `<td class="calc small" data-k="${f.field_key}"></td>`;
              const val = f.field_key === 'baseline' ? r.baseline : f.field_key === 'growth' ? r.growth : r.data[f.field_key];
              return `<td style="min-width:${f.data_type === 'RUPIAH' ? 180 : 120}px">${UI.fieldInput(Object.assign({}, f, { is_required: false }), val, { prefix: `b_${r.b.brand_code}_`, bare: true })}</td>`;
            }).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="card-body py-2 small text-muted">Kelas dari baseline/bulan (min inklusif, maks eksklusif). Tier = tier tertinggi yang growth-nya terpenuhi. Total rebate = fix maks + conditional (komitmen; dibayar terpisah di Payout).
          ${fGrowth && (fGrowth.min_value !== null || fGrowth.max_value !== null) ? ` Growth: ${fGrowth.min_value !== null ? 'min ' + fGrowth.min_value + '%' : ''} ${fGrowth.max_value !== null ? 'maks ' + fGrowth.max_value + '%' : ''}.` : ''}
          ${fBase ? '' : '<span class="text-danger">Form belum punya field baseline.</span>'}</div></div>
      <div class="row g-3"><div class="col-lg-7"><div class="card"><div class="card-header">Data lain</div><div class="card-body">
        ${other.map((f) => UI.fieldInput(f, values.data[f.field_key] !== undefined ? values.data[f.field_key] : reg ? reg.data[f.field_key] : '')).join('') || '<div class="small text-muted">Tidak ada field tambahan.</div>'}
        ${reg ? '<div class="mb-3"><label class="form-label">Catatan revisi</label><textarea name="note" class="form-control" rows="2"></textarea></div>' : ''}
      </div></div></div>
      <div class="col-lg-5"><div class="card sticky-summary"><div class="card-header">Approval Registration</div><div class="card-body">
        <div id="apPath"></div>
        <button class="btn btn-brand w-100 mt-3"><i class="bi bi-check2-circle"></i> ${reg ? 'Kirim ulang' : 'Ajukan registrasi'}</button>
        <div class="form-text">Layer dengan kondisi yang terpenuhi langsung auto-approved & tercatat.</div></div></div></div></div></form>`,
      after(root) {
        const form = root.querySelector('#regForm');
        function calc() {
          const brands = [];
          form.querySelectorAll('tr[data-b]').forEach((tr) => {
            const code = tr.dataset.b;
            const on = tr.querySelector('.join').checked;
            tr.classList.toggle('opacity-50', !on);
            const base = toNum((form.querySelector(`[name="b_${code}_baseline"]`) || {}).value);
            const g = toNum((form.querySelector(`[name="b_${code}_growth"]`) || {}).value);
            const c = on && base !== null && g !== null ? E.commitment(ch, code, base, g, program.programMonths) : null;
            tr.querySelector('.reason').textContent = c && !c.class_id ? c.reason : c && c.error ? c.error : '';
            tr.querySelectorAll('.calc').forEach((td) => { td.innerHTML = calcCell(bf.find((f) => f.field_key === td.dataset.k), c, program.programMonths); });
            if (c && c.class_id) brands.push(c);
          });
          const ev = E.evaluateApproval(layers, E.registrationObjects(brands));
          root.querySelector('#apPath').innerHTML = `<div class="sim-path">${ev.map((x) => `<span class="lp ${x.auto ? 'auto' : ''}">${x.layer.layer_order}. ${esc(C.APPROVAL_ROLES[x.layer.role_code])}
            <small>${x.auto ? 'auto-approve' : 'manual'}</small></span>`).join('<i class="bi bi-chevron-right text-muted"></i>')}</div>`;
        }
        form.addEventListener('input', calc); form.addEventListener('change', calc); calc();
      },
    };
  }

  // nilai form saat render ulang setelah error
  function pendValues(pend, ch) {
    const v = { brands: {}, data: {} };
    if (!pend) return v;
    for (const b of ch.brands) {
      const p = (k) => pend.values[`b_${b.brand_code}_${k}`];
      v.brands[b.brand_code] = { join: pend.values['join_' + b.brand_code] === 'on', baseline: p('baseline'), growth: p('growth'), data: {} };
      for (const f of ch.phases.REGISTRATION.fields.filter(isBrandField)) if (!['baseline', 'growth'].includes(f.field_key)) v.brands[b.brand_code].data[f.field_key] = p(f.field_key);
    }
    for (const [k, val] of Object.entries(pend.values)) if (k.startsWith('f_')) v.data[k.slice(2)] = val;
    return v;
  }

  route('/registration/program/:p/:pc/store/:cid', ({ p: pid, pc: pcid, cid }, q, { user, year, path }) => {
    const { program, ch } = ctx(pid, pcid, user, year);
    const ex = DB.t('registrations').find((x) => x.program_id === program.id && x.program_channel_id === ch.id && x.customer_id === cid);
    if (ex) UI.redirect(`/registration/participant/${ex.id}`);
    const s = store(cid);
    if (!s || s.channel_code !== ch.channel_code || !inScope(user, s)) fail('Toko tidak ditemukan');
    const pend = UI.takePending(path);
    return formPage({ program, ch, el: E.eligibility(program, ch, cid), s, reg: null, values: pendValues(pend, ch), errors: pend && pend.errors });
  });

  route('/registration/participant/:id/edit', ({ id }, q, { user, year, path }) => {
    const reg = loadReg(id, user, year);
    if (reg.status !== 'returned') UI.redirect(`/registration/participant/${reg.id}`);
    const { program, ch } = ctx(reg.program_id, reg.program_channel_id, user, year);
    const pend = UI.takePending(path);
    return formPage({ program, ch, el: E.eligibility(program, ch, reg.customer_id), s: store(reg.customer_id), reg, values: pendValues(pend, ch), errors: pend && pend.errors });
  });

  actions['reg.submit'] = (f, form) => {
    const user = UI.currentUser();
    const { program, ch } = ctx(form.dataset.program, form.dataset.pc, user, UI.currentYear());
    const cid = form.dataset.cid;
    const existing = form.dataset.reg ? DB.byId('registrations', form.dataset.reg) : null;
    const fields = ch.phases.REGISTRATION.fields;
    const bf = fields.filter(isBrandField).filter((x) => x.mode === 'ENTERED' && x.is_editable);
    const errors = [];
    if (!existing && DB.t('registrations').some((x) => x.program_channel_id === ch.id && x.customer_id === cid)) errors.push('Toko sudah terdaftar di channel ini (sekali per channel per program).');
    if (!existing) { const el = E.eligibility(program, ch, cid); if (!el.eligible) errors.push('Toko tidak eligible: ' + el.reasons.join(', ')); }
    const brands = [];
    for (const b of ch.brands) {
      if (!f.has('join_' + b.brand_code)) continue;
      const { values, errors: errs } = UI.readFieldValues(bf, (k) => f.get(k), (k) => f.file(k), `b_${b.brand_code}_`);
      errs.forEach((e) => errors.push(`${b.brand_name}: ${e}`));
      if (errs.length) continue;
      if (values.baseline === undefined || values.growth === undefined) { errors.push(`${b.brand_name}: baseline & growth wajib diisi`); continue; }
      const c = E.commitment(ch, b.brand_code, values.baseline, values.growth, program.programMonths);
      if (!c.class_id) { errors.push(`${b.brand_name}: tidak eligible (${c.reason})`); continue; }
      if (c.error) { errors.push(`${b.brand_name}: ${c.error}`); continue; }
      c.data = Object.fromEntries(Object.entries(values).filter(([k]) => !['baseline', 'growth'].includes(k)));
      brands.push(c);
    }
    if (!brands.length && !errors.length) errors.push('Pilih minimal satu brand.');
    const { values: data, errors: e2 } = UI.readFieldValues(fields.filter((x) => x.repeat_per === 'NONE'), (k) => f.get(k), (k) => f.file(k));
    errors.push(...e2);
    if (errors.length) { UI.retry(errors, f); return; }

    const now = new Date().toISOString();
    let reg = existing;
    if (reg) Object.assign(reg, { brands, data, approval_objects: E.registrationObjects(brands), updated_at: now });
    else reg = DB.insert('registrations', { program_id: program.id, program_channel_id: ch.id, customer_id: cid, brands, data, status: 'in_review', current_layer_id: null,
      approval_objects: E.registrationObjects(brands), registered_by: user.id, registered_at: now, updated_at: now });
    const next = E.submit('registration', reg, user.id, !!existing, f.get('note'));
    const s = store(cid);
    done('success', `${esc(s.name)} ${existing ? 'dikirim ulang' : 'diajukan'} (${brands.length} brand). ${next ? `Menunggu layer ${next.layer_order} · ${esc(C.APPROVAL_ROLES[next.role_code])}.` : 'Semua layer auto-approved: registrasi disetujui & MOU/SKN dibuat.'}`,
      `/registration/participant/${reg.id}`);
  };

  // ---------------------------------------------------------------- daftar peserta
  function loadReg(id, user, year) {
    const r = DB.byId('registrations', id);
    const p = r && DB.byId('programs', r.program_id);
    if (!r || p.year !== year || !inScope(user, store(r.customer_id))) fail('Registrasi tidak ditemukan');
    return r;
  }

  route('/registration/participants', ({}, q, { user, year }) => {
    const programs = DB.where('programs', (p) => p.year === year);
    const ids = programs.map((p) => p.id);
    const rows = DB.where('registrations', (r) => {
      const s = store(r.customer_id);
      return ids.includes(r.program_id) && inScope(user, s) && (!q.program || r.program_id === Number(q.program)) && (!q.status || r.status === q.status) && (!q.channel || s.channel_code === q.channel);
    }).sort((a, b) => b.registered_at.localeCompare(a.registered_at));
    const opt = (v, cur, label) => `<option value="${v}" ${h.sel(String(cur || '') === String(v))}>${esc(label)}</option>`;
    const bName = (code) => (DB.t('brands').find((b) => b.code === code) || {}).name || code;
    return {
      title: 'Peserta', html: `<div class="page-head"><div><h1>Peserta ${year}</h1><div class="sub">${rows.length} registrasi sesuai filter & scope Anda</div></div></div>
      <form class="card card-body py-2 mb-3 d-flex flex-row flex-wrap gap-2 align-items-center" data-action="filter" data-path="/registration/participants">
        <select name="program" class="form-control form-control-sm" style="width:auto"><option value="">Semua program</option>${programs.map((p) => opt(p.id, q.program, p.name)).join('')}</select>
        <select name="channel" class="form-control form-control-sm" style="width:auto"><option value="">Semua channel</option>${DB.t('channels').map((c) => opt(c.code, q.channel, c.name)).join('')}</select>
        <select name="status" class="form-control form-control-sm" style="width:auto"><option value="">Semua status</option>${['approved', 'in_review', 'returned', 'rejected'].map((s) => opt(s, q.status, h.STATUS[s][0])).join('')}</select>
        <button class="btn btn-sm btn-outline-brand">Filter</button></form>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0">
        <thead><tr><th>Toko</th><th>Program · channel</th><th>Brand · kelas · total rebate</th><th>Status</th><th>Didaftarkan</th></tr></thead>
        <tbody>${rows.map((r) => {
          const s = store(r.customer_id); const p = programs.find((x) => x.id === r.program_id);
          const l = E.currentLayer(r); const by = DB.byId('users', r.registered_by) || {};
          return `<tr><td><a href="#/registration/participant/${r.id}" class="fw-semibold">${esc(s.name)}</a><div class="small text-muted">${r.customer_id} · ${s.dc_code}</div></td>
            <td class="small">${esc(p.code)}<br>${esc((DB.t('channels').find((c) => c.code === s.channel_code) || {}).name)}</td>
            <td class="small">${r.brands.map((b) => `<span class="mr-2 text-nowrap">${esc(bName(b.brand_code))} ${h.cls(b.class_code)} ${b.total_pct}%</span>`).join('')}</td>
            <td>${h.badge(r.status)}${l ? `<div class="small text-muted">Layer ${l.layer_order} · ${esc(C.APPROVAL_ROLES[l.role_code])}</div>` : ''}</td>
            <td class="small">${esc(by.name)}<div class="text-muted">${h.datetime(r.registered_at)}</div></td></tr>`;
        }).join('') || '<tr><td colspan="5" class="text-center text-muted py-4">Tidak ada data.</td></tr>'}</tbody></table></div></div>`,
    };
  });

  actions.filter = (f, form) => {
    const qs = new URLSearchParams(f.entries().filter(([, v]) => v !== '')).toString();
    UI.go(form.dataset.path + (qs ? '?' + qs : ''));
  };

  // ---------------------------------------------------------------- detail peserta
  route('/registration/participant/:id', ({ id }, q, { user, year }) => {
    const reg = loadReg(id, user, year);
    const program = E.loadProgram(reg.program_id);
    const ch = program.channels.find((c) => c.id === reg.program_channel_id);
    const s = store(reg.customer_id);
    const layer = E.currentLayer(reg);
    const canAct = reg.status === 'in_review' && layer && layer.role_code === user.role;
    const canEdit = reg.status === 'returned' && user.role === 'CBD';
    const fields = ch.phases.REGISTRATION.fields.filter((f) => f.repeat_per === 'NONE' && f.is_visible);
    const docs = DB.where('generatedDocuments', (g) => g.registration_id === reg.id);
    const mons = DB.where('monitorings', (m) => m.registration_id === reg.id);
    const pays = DB.where('payouts', (x) => x.registration_id === reg.id);
    const docCtx = { store: s, program, ch, brands: reg.brands.map((b) => Object.assign({ brand_name: (E.brandOf(ch, b.brand_code) || {}).brand_name || b.brand_code }, b)) };
    return {
      title: s.name, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/registration/participants">Peserta</a> / ${esc(program.name)} · ${esc(ch.channel_name)}</div>
        <h1>${esc(s.name)} ${h.badge(reg.status)}</h1><div class="sub">${reg.customer_id} · ${esc(s.city)} · DC ${s.dc_code} · didaftarkan ${esc((DB.byId('users', reg.registered_by) || {}).name)} ${h.datetime(reg.registered_at)}</div></div>
        ${canEdit ? `<a href="#/registration/participant/${reg.id}/edit" class="btn btn-brand"><i class="bi bi-pencil"></i> Revisi & kirim ulang</a>` : ''}</div>
      <div class="row g-3"><div class="col-lg-8">
        ${canAct ? UI.approvalBox('registration', reg.id, layer, `/registration/participant/${reg.id}`) : ''}
        <div class="card mb-3"><div class="card-header">Hasil per brand</div><div class="table-responsive"><table class="table table-sm mb-0">
          <thead><tr><th>Brand</th><th>Kelas</th><th class="num">Baseline / bln</th><th class="num">Growth</th><th class="num">Target / bln</th><th class="num">Fix maks</th><th class="num">Conditional</th><th class="num">Total</th></tr></thead>
          <tbody>${docCtx.brands.map((b) => `<tr><td class="fw-semibold">${esc(b.brand_name)}</td><td>${h.cls(b.class_code)}</td><td class="num">${h.rp(Math.round(b.baseline))}</td><td class="num">${b.growth_pct}%</td>
            <td class="num">${h.rp(Math.round(b.target_monthly || 0))}</td><td class="num">${b.fix_max_pct}%</td><td class="num">${b.conditional_pct}%</td><td class="num fw-bold">${b.total_pct}%</td></tr>`).join('')}</tbody></table></div>
          <div class="card-body py-2 small text-muted">Angka disimpan saat registrasi (registrationBrandResult). Total rebate = komitmen; payout Conditional & Fix dibayar terpisah.</div></div>
        ${fields.length ? `<div class="card mb-3"><div class="card-header">Data registrasi</div><div class="card-body"><dl class="row mb-0">
          ${fields.map((f) => `<dt class="col-sm-4">${esc(f.label)}</dt><dd class="col-sm-8">${esc(reg.data[f.field_key] !== undefined ? reg.data[f.field_key] : '-')}</dd>`).join('')}</dl></div></div>` : ''}
        ${docs.length ? `<div class="card mb-3"><div class="card-header">Dokumen MOU / SKN</div><div class="card-body">
          ${docs.map((g) => { const rev = DB.byId('programDocumentTemplateRevisions', g.revision_id);
            return `<details class="mb-2"><summary><strong>${g.doc_type}</strong> · revisi template ${g.revision} · dibuat ${h.datetime(g.created_at)}</summary><div class="doc-preview mt-2">${rev ? E.renderDocument(rev.content, docCtx) : 'Revisi tidak ditemukan'}</div></details>`; }).join('')}</div></div>` : ''}
        ${reg.status === 'approved' ? `<div class="card"><div class="card-header">Monitoring & payout</div><div class="card-body small">
          <div class="mb-2"><strong>Monitoring:</strong> ${mons.map((m) => `<a href="#/monitoring/item/${m.id}" class="mr-2">${esc(m.period_label)} ${h.badge(m.status)}</a>`).join('') || '<span class="text-muted">belum ada</span>'}</div>
          <div><strong>Payout:</strong> ${pays.map((x) => `<a href="#/payout/item/${x.id}" class="mr-2">${x.component === 'CONDITIONAL' ? 'Conditional' : 'Fix'} ${esc(x.period_label)} ${h.rp(x.amount)} ${h.badge(x.status)}</a>`).join('') || '<span class="text-muted">belum ada</span>'}</div></div></div>` : ''}
      </div>
      <div class="col-lg-4"><div class="card mb-3"><div class="card-header">Jalur approval</div><div class="card-body">${UI.layerPath(ch.phases.REGISTRATION.layers, 'registration', reg)}</div></div>
        <div class="card"><div class="card-header">Riwayat</div><div class="card-body">${UI.logHtml('registration', reg.id)}</div></div></div></div>`,
    };
  });
})();
