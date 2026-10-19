// Pendaftaran toko oleh CBD: saran toko eligible dari sell out, kelas otomatis, kolom dinamis.
(function () {
  const { h, route, actions, done, fail, inScope, store } = UI;
  const { esc, toNum } = h;
  const E = window.Engine;
  const CAN_REGISTER = ['CBD', 'ADMIN_HO'];

  const canSeeChannel = (user, code) => !user.channel_codes || !user.channel_codes.length || user.channel_codes.includes(code);
  const regOpen = (p) => (p.settings || {}).demo_open_windows || E.isWithin(E.today(), p.registration_start, p.registration_end);

  function ctx(programId, pcId, user, year) {
    UI.requireRole(...CAN_REGISTER);
    const program = E.loadProgram(Number(programId));
    if (!program || program.year !== year) fail('Program tidak ditemukan');
    const pc = program.channels.find((c) => c.id === Number(pcId));
    if (!pc || !canSeeChannel(user, pc.channel_code)) fail('Channel tidak ditemukan', 'Channel tidak ada atau di luar scope Anda.');
    return { program, pc };
  }

  function storeContext(program, pc, cid, user) {
    const s = store(cid);
    if (!s || s.channel_code !== pc.channel_code || !inScope(user, s)) return null;
    const agg = E.salesAgg({ customerIds: [cid], brandCodes: pc.brand_codes, start: program.baseline_start, end: program.baseline_end }).get(cid);
    const baseline = E.baselineOf(program, agg);
    const ratio = E.sellRatio(agg);
    const elig = E.eligibility(pc, baseline, ratio, agg ? agg.activeMonths : 0);
    const monthly = E.monthsBetween(program.baseline_start, program.baseline_end).map((m) => ({ m, sellout: agg && agg.monthly[m] ? agg.monthly[m].sellout : 0, sellin: agg && agg.monthly[m] ? agg.monthly[m].sellin : 0 }));
    const dc = DB.t('dcs').find((d) => d.code === s.dc_code) || {};
    return { store: Object.assign({}, s, { dc_name: dc.name }), agg, baseline, ratio, elig, monthly };
  }

  // ---------------------------------------------------------------- pilih program & channel
  route('/registration', ({}, q, { user, year }) => {
    UI.requireRole(...CAN_REGISTER);
    const programs = DB.where('programs', (p) => p.year === year && p.status === 'active').map((x) => E.loadProgram(x.id));
    return {
      title: 'Pendaftaran Toko', html: `<div class="page-head"><div><h1>Pendaftaran Toko ${year}</h1><div class="sub">Pilih program & channel. Sistem menyarankan toko eligible dari data sell out.</div></div></div>
      ${programs.map((p) => {
        const chs = p.channels.filter((c) => canSeeChannel(user, c.channel_code));
        return `<div class="card mb-3"><div class="card-header d-flex justify-content-between"><span>${esc(p.name)} <span class="text-muted fw-normal">· ${esc(p.code)}</span></span>
          <span class="small fw-normal">Pendaftaran ${h.date(p.registration_start)} – ${h.date(p.registration_end)} ${regOpen(p) ? '<span class="badge badge-success">dibuka</span>' : '<span class="badge badge-secondary">ditutup</span>'}</span></div>
          <div class="card-body"><div class="row g-3">${chs.map((c) => {
            const pas = DB.where('participants', (x) => x.program_channel_id === c.id);
            const reg = pas.filter((x) => ['active', 'in_review'].includes(x.status)).length;
            const ret = pas.filter((x) => x.status === 'returned').length;
            return `<div class="col-md-4"><div class="border rounded p-3 h-100 d-flex flex-column">
              <div class="fw-semibold">${esc(c.channel_name)}</div>
              <div class="small text-muted mb-2">Kelas: ${esc(c.classes.map((x) => `${x.name} (≥${x.min_growth}%)`).join(', ') || '-')}</div>
              <div class="small mb-3"><strong>${reg}</strong> toko terdaftar${ret ? ` · <span class="text-info">${ret} perlu revisi</span>` : ''}</div>
              ${c.classes.length ? `<a href="#/registration/program/${p.id}/${c.id}" class="btn btn-brand btn-sm mt-auto">Lihat saran toko <i class="bi bi-arrow-right"></i></a>` : '<span class="small text-muted mt-auto">Channel belum di-setup HO.</span>'}
            </div></div>`;
          }).join('') || '<div class="text-muted">Tidak ada channel dalam scope Anda.</div>'}</div></div></div>`;
      }).join('') || `<div class="card"><div class="card-body text-muted">Belum ada program aktif di tahun ${year}.</div></div>`}`,
    };
  });

  // ---------------------------------------------------------------- saran toko
  route('/registration/program/:p/:pc', ({ p: pid, pc: pcid }, q, { user, year }) => {
    const { program, pc } = ctx(pid, pcid, user, year);
    const registered = new Set(DB.where('participants', (x) => x.program_id === program.id).map((x) => x.customer_id));
    const stores = DB.t('stores').filter((s) => s.channel_code === pc.channel_code && inScope(user, s) && !registered.has(s.customer_id));
    const agg = E.salesAgg({ customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes, start: program.baseline_start, end: program.baseline_end });
    const months = E.monthsBetween(program.baseline_start, program.baseline_end);
    let rows = stores.map((s) => {
      const a = agg.get(s.customer_id);
      const baseline = E.baselineOf(program, a);
      const ratio = E.sellRatio(a);
      const e = E.eligibility(pc, baseline, ratio, a ? a.activeMonths : 0);
      if (!a) e.reasons.unshift('Tidak ada data sell out di periode baseline');
      return { s, baseline, ratio, active: a ? a.activeMonths : 0, eligible: !!a && e.eligible, reasons: e.reasons, cls: e.cls,
        monthly: months.map((m) => (a && a.monthly[m] ? E.metric(program, a.monthly[m]) : 0)) };
    }).sort((x, y) => Number(y.eligible) - Number(x.eligible) || y.baseline - x.baseline);
    const nElig = rows.filter((r) => r.eligible).length;
    const total = rows.length;
    const showAll = q.all === '1';
    if (!showAll) rows = rows.filter((r) => r.eligible);
    const open = regOpen(program);
    return {
      title: `Saran Toko - ${pc.channel_name}`, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/registration">Pendaftaran</a> / ${esc(program.name)}</div>
        <h1>Saran Toko · ${esc(pc.channel_name)}</h1>
        <div class="sub">Baseline = ${program.baseline_method === 'avg_monthly' ? 'rata-rata' : 'rata-rata bulan aktif'} ${program.basis === 'sellin' ? 'sell in' : 'sell out'} ${h.date(program.baseline_start)} – ${h.date(program.baseline_end)} · brand ${pc.brand_codes.join(', ')}</div></div>
        <div class="text-right"><div class="fs-5"><strong>${nElig}</strong> <span class="text-muted fs-6">eligible dari ${total} toko belum terdaftar</span></div>
          <a href="#/registration/program/${program.id}/${pc.id}?all=${showAll ? '0' : '1'}" class="small">${showAll ? 'Sembunyikan yang tidak eligible' : 'Tampilkan juga yang tidak eligible'}</a></div></div>
      ${open ? '' : '<div class="alert alert-secondary">Periode pendaftaran sedang ditutup. Data hanya bisa dilihat.</div>'}
      <div class="card mb-2"><div class="card-body py-2 small d-flex flex-wrap gap-3"><span class="text-muted">Aturan eligibility:</span>
        ${pc.classes.map((c) => `<span>${h.cls(c.name)} ${h.rpShort(c.baseline_min)}–${c.baseline_max === null ? '∞' : h.rpShort(c.baseline_max)}, growth ≥${c.min_growth}%</span>`).join('')}
        ${pc.min_sellout_ratio !== null ? `<span>· Rasio SO:SI ≥ ${pc.min_sellout_ratio}%</span>` : '<span class="text-muted">· Rasio SO:SI hanya informasi</span>'}
        ${pc.min_active_months !== null ? `<span>· Min ${pc.min_active_months} bulan aktif</span>` : ''}</div></div>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide">
        <thead><tr><th>Toko</th><th>DC</th><th>Sell out ${h.month(months[0])} – ${h.month(months[months.length - 1])}</th><th class="num">Baseline / bln</th><th class="num">SO:SI</th><th class="num">Bln aktif</th><th>Kelas</th><th class="num">Target min / bln</th><th></th></tr></thead>
        <tbody>${rows.map((r) => {
          const max = Math.max(...r.monthly, 1);
          return `<tr class="${r.eligible ? '' : 'table-light text-muted'}">
            <td><div class="fw-semibold">${esc(r.s.name)}</div><div class="small text-muted">${r.s.customer_id} · ${esc(r.s.city)}</div></td><td>${r.s.dc_code}</td>
            <td><div class="spark" title="${esc(r.monthly.map((v, i) => `${h.month(months[i])}: ${h.rp(v)}`).join('\n'))}">${r.monthly.map((v) => `<span class="${v ? '' : 'zero'}" style="height:${Math.max(2, Math.round(v / max * 26))}px"></span>`).join('')}</div></td>
            <td class="num fw-semibold">${h.rp(Math.round(r.baseline))}</td>
            <td class="num ${pc.min_sellout_ratio !== null && r.ratio !== null && r.ratio < pc.min_sellout_ratio ? 'text-danger' : ''}">${h.pct(r.ratio)}</td>
            <td class="num">${r.active}</td><td>${r.cls ? h.cls(r.cls.name) : '-'}</td>
            <td class="num">${r.cls ? h.rp(Math.round(r.baseline * (1 + r.cls.min_growth / 100))) : '-'}</td>
            <td class="text-right">${r.eligible ? `<a href="#/registration/program/${program.id}/${pc.id}/store/${r.s.customer_id}" class="btn btn-sm btn-brand ${open ? '' : 'disabled'}">Daftarkan</a>`
              : `<span class="small text-danger">${esc(r.reasons.join('; '))}</span>`}</td></tr>`;
        }).join('') || `<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada toko ${showAll ? '' : 'eligible '}yang belum terdaftar.</td></tr>`}</tbody></table></div></div>`,
    };
  });

  // ---------------------------------------------------------------- form daftar / revisi
  function formPage({ program, pc, sc, participant, values, growth, errors }) {
    const isEdit = !!participant;
    const cl = isEdit ? (pc.classes.find((c) => c.id === participant.class_id) || sc.elig.cls) : sc.elig.cls;
    const base = isEdit ? participant.baseline : sc.baseline;
    const open = isEdit || regOpen(program);
    const canSubmit = open && (isEdit || sc.elig.eligible);
    const fields = E.fieldsFor(program, 'registration', pc.id);
    const st = E.stepsOf(program, 'registration');
    return {
      title: `${isEdit ? 'Revisi' : 'Daftarkan'} ${sc.store.name}`, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/registration">Pendaftaran</a> / <a href="#/registration/program/${program.id}/${pc.id}">${esc(program.name)} · ${esc(pc.channel_name)}</a></div>
        <h1>${isEdit ? 'Revisi' : 'Daftarkan'} ${esc(sc.store.name)}</h1><div class="sub">${sc.store.customer_id} · ${esc(sc.store.city)} · ${esc(sc.store.dc_name)}</div></div></div>
      ${UI.errorsHtml(errors)}
      ${open ? '' : '<div class="alert alert-secondary">Periode pendaftaran ditutup.</div>'}
      <form data-action="reg.submit" data-program="${program.id}" data-pc="${pc.id}" data-cid="${sc.store.customer_id}" data-pa="${isEdit ? participant.id : ''}"><div class="row g-3">
        <div class="col-lg-8">
          <div class="card mb-3"><div class="card-header">Data otomatis dari sell out</div><div class="card-body">
            <div class="row g-3 mb-3">
              <div class="col-sm-4"><div class="stat bg-light rounded"><div class="label">Baseline / bulan</div><div class="value">${h.rpShort(base)}</div><div class="small text-muted">${h.rp(Math.round(base))}</div></div></div>
              <div class="col-sm-4"><div class="stat bg-light rounded"><div class="label">Kelas</div><div class="value">${cl ? `<span class="class-pill fs-5">${esc(cl.name)}</span>` : '-'}</div>
                <div class="small text-muted">${cl ? `min growth ${cl.min_growth}% · rebate ${cl.rebate_pct}%` : 'tidak eligible'}</div></div></div>
              <div class="col-sm-4"><div class="stat bg-light rounded"><div class="label">Rasio SO : SI</div><div class="value">${h.pct(sc.ratio)}</div>
                <div class="small text-muted">${pc.min_sellout_ratio !== null ? `syarat ≥ ${pc.min_sellout_ratio}%` : 'informasi saja'}</div></div></div></div>
            <div class="table-responsive"><table class="table table-sm small mb-0">
              <thead><tr><th></th>${sc.monthly.map((m) => `<th class="num">${h.month(m.m)}</th>`).join('')}</tr></thead>
              <tbody><tr><td>Sell out</td>${sc.monthly.map((m) => `<td class="num ${m.sellout ? '' : 'text-danger'}">${h.rpShort(m.sellout)}</td>`).join('')}</tr>
                <tr class="text-muted"><td>Sell in</td>${sc.monthly.map((m) => `<td class="num">${h.rpShort(m.sellin)}</td>`).join('')}</tr></tbody></table></div>
            ${!sc.elig.eligible && !isEdit ? `<div class="alert alert-warning mt-3 mb-0 py-2 small">Tidak eligible: ${esc(sc.elig.reasons.join('; '))}</div>` : ''}
          </div></div>
          <div class="card mb-3"><div class="card-header">Data dari CBD <span class="text-muted fw-normal small">— kolom sesuai setup program</span></div><div class="card-body">
            ${fields.map((f) => UI.fieldInput(f, values[f.key])).join('') || '<div class="text-muted small">Program ini tidak punya kolom tambahan.</div>'}
            ${isEdit ? '<div class="mb-3"><label class="form-label">Catatan revisi</label><textarea name="note" class="form-control" rows="2"></textarea></div>' : ''}
          </div></div>
        </div>
        <div class="col-lg-4"><div class="card sticky-summary"><div class="card-header">Target</div><div class="card-body">
          <label class="form-label">Growth (%) <span class="text-danger">*</span></label>
          <div class="input-group mb-1"><input type="number" step="any" name="growth" id="growth" class="form-control" value="${esc(growth)}" min="${cl ? cl.min_growth : 0}"
            ${cl && cl.max_growth !== null ? `max="${cl.max_growth}"` : ''} ${pc.growth_editable ? '' : 'readonly'} required><span class="input-group-text">%</span></div>
          <div class="form-text mb-3">${cl ? `Minimal ${cl.min_growth}%${cl.max_growth !== null ? `, maksimal ${cl.max_growth}%` : ''}` : ''}${pc.growth_editable ? '' : ' (dikunci HO)'}</div>
          <dl class="row small mb-3"><dt class="col-6">Target / bulan</dt><dd class="col-6 num" id="tMonth">-</dd>
            <dt class="col-6">Target program (${program.programMonths} bln)</dt><dd class="col-6 num fw-bold" id="tPeriod">-</dd>
            ${program.periods.map((per) => { const n = E.monthsBetween(per.achieve_start, per.achieve_end).length;
              return `<dt class="col-6 fw-normal text-muted">${esc(per.name)} (${n} bln)</dt><dd class="col-6 num text-muted" data-months="${n}">-</dd>`; }).join('')}</dl>
          <button class="btn btn-brand w-100" ${canSubmit ? '' : 'disabled'}><i class="bi bi-check2-circle"></i> ${isEdit ? 'Kirim ulang' : 'Daftarkan toko'}</button>
          <div class="form-text">${st.length ? `Setelah submit toko langsung terdaftar & menunggu: ${esc(st.map((s) => s.name).join(' → '))}` : 'Setelah submit toko langsung aktif.'}</div>
        </div></div></div>
      </div></form>`,
      after(root) {
        const g = root.querySelector('#growth');
        const calc = () => {
          const v = parseFloat(g.value);
          const m = isNaN(v) ? null : base * (1 + v / 100);
          root.querySelector('#tMonth').textContent = m === null ? '-' : h.rp(Math.round(m));
          root.querySelector('#tPeriod').textContent = m === null ? '-' : h.rp(Math.round(m * program.programMonths));
          root.querySelectorAll('[data-months]').forEach((d) => { d.textContent = m === null ? '-' : h.rp(Math.round(m * d.dataset.months)); });
        };
        g.addEventListener('input', calc); calc();
      },
    };
  }

  // nilai form saat render ulang setelah error: pend.values pakai prefix f_
  const unprefix = (vals) => Object.fromEntries(Object.entries(vals).filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), v]));

  route('/registration/program/:p/:pc/store/:cid', ({ p: pid, pc: pcid, cid }, q, { user, year, path }) => {
    const { program, pc } = ctx(pid, pcid, user, year);
    const ex = DB.t('participants').find((x) => x.program_id === program.id && x.customer_id === cid);
    if (ex) UI.redirect(`/registration/participant/${ex.id}`);
    const sc = storeContext(program, pc, cid, user);
    if (!sc) fail('Toko tidak ditemukan', 'Toko tidak ada di channel / scope Anda.');
    const pend = UI.takePending(path);
    return formPage({ program, pc, sc, participant: null, values: pend ? unprefix(pend.values) : {},
      growth: pend ? pend.values.growth : (sc.elig.cls ? sc.elig.cls.min_growth : ''), errors: pend ? pend.errors : [] });
  });

  route('/registration/participant/:id/edit', ({ id }, q, { user, year, path }) => {
    UI.requireRole(...CAN_REGISTER);
    const pa = loadParticipant(id, user, year);
    if (pa.status !== 'returned') UI.redirect(`/registration/participant/${pa.id}`);
    const program = E.loadProgram(pa.program_id);
    const pc = program.channels.find((c) => c.id === pa.program_channel_id);
    const sc = storeContext(program, pc, pa.customer_id, user);
    const pend = UI.takePending(path);
    return formPage({ program, pc, sc, participant: pa, values: pend ? unprefix(pend.values) : pa.data, growth: pend ? pend.values.growth : pa.growth_pct, errors: pend ? pend.errors : [] });
  });

  actions['reg.submit'] = (f, form) => {
    const user = UI.currentUser();
    const program = E.loadProgram(Number(form.dataset.program));
    const pc = program.channels.find((c) => c.id === Number(form.dataset.pc));
    const sc = storeContext(program, pc, form.dataset.cid, user);
    const fields = E.fieldsFor(program, 'registration', pc.id);
    const { values, errors } = UI.readFieldValues(fields, (k) => f.get(k));
    const growth = toNum(f.get('growth'));
    const paId = Number(form.dataset.pa) || null;
    const existing = paId ? DB.byId('participants', paId) : null;

    if (!existing) {
      if (program.status !== 'active') errors.unshift('Program belum aktif.');
      if (!regOpen(program)) errors.unshift('Periode pendaftaran sudah ditutup / belum dibuka.');
      if (!sc.agg) errors.unshift('Toko tidak punya data sell out di periode baseline.');
      if (!sc.elig.eligible) errors.unshift('Toko tidak eligible: ' + sc.elig.reasons.join(', '));
    }
    const cl = existing ? (pc.classes.find((c) => c.id === existing.class_id) || sc.elig.cls) : sc.elig.cls;
    if (cl) { const gErr = E.validateGrowth(pc, cl, growth); if (gErr) errors.push(gErr); }
    if (errors.length) { UI.retry(errors, f); return; }

    const init = E.initialState(program, 'registration');
    if (existing) {
      const t = E.computeTarget(existing.baseline, growth, program.programMonths);
      Object.assign(existing, { growth_pct: growth, target_monthly: t.monthly, target_period: t.period, data: values, status: init.status, current_step_id: init.current_step_id, updated_at: new Date().toISOString() });
      E.log('participant', existing.id, null, 'resubmit', f.get('note'), user.id);
      done('success', 'Revisi dikirim ulang.', `/registration/participant/${existing.id}`);
      return;
    }
    const t = E.computeTarget(sc.baseline, growth, program.programMonths);
    const pa = DB.insert('participants', {
      program_id: program.id, program_channel_id: pc.id, customer_id: sc.store.customer_id, class_id: cl.id, class_name: cl.name,
      baseline: sc.baseline, sellout_ratio: sc.ratio, growth_pct: growth, target_monthly: t.monthly, target_period: t.period, data: values,
      status: init.status, current_step_id: init.current_step_id, registered_by: user.id, registered_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    E.log('participant', pa.id, null, 'submit', null, user.id);
    done('success', `${esc(sc.store.name)} terdaftar di kelas ${esc(cl.name)}${init.step ? ` dan menunggu "${esc(init.step.name)}".` : ' dan langsung aktif.'}`,
      `/registration/program/${program.id}/${pc.id}`);
  };

  // ---------------------------------------------------------------- daftar peserta
  route('/registration/participants', ({}, q, { user, year }) => {
    const programs = DB.where('programs', (p) => p.year === year);
    const progIds = programs.map((p) => p.id);
    const rows = DB.where('participants', (pa) => {
      const s = store(pa.customer_id);
      return progIds.includes(pa.program_id) && inScope(user, s) &&
        (!q.program || pa.program_id === Number(q.program)) && (!q.status || pa.status === q.status) && (!q.channel || s.channel_code === q.channel);
    }).sort((a, b) => b.registered_at.localeCompare(a.registered_at));
    const opt = (v, cur, label) => `<option value="${v}" ${h.sel(String(cur || '') === String(v))}>${esc(label)}</option>`;
    return {
      title: 'Peserta Program', html: `<div class="page-head"><div><h1>Peserta Program ${year}</h1><div class="sub">${rows.length} peserta sesuai filter & scope Anda</div></div></div>
      <form class="card card-body py-2 mb-3 d-flex flex-row flex-wrap gap-2 align-items-center" data-action="filter" data-path="/registration/participants">
        <select name="program" class="form-control form-control-sm" style="width:auto"><option value="">Semua program</option>${programs.map((p) => opt(p.id, q.program, p.name)).join('')}</select>
        <select name="channel" class="form-control form-control-sm" style="width:auto"><option value="">Semua channel</option>${DB.t('channels').map((c) => opt(c.code, q.channel, c.name)).join('')}</select>
        <select name="status" class="form-control form-control-sm" style="width:auto"><option value="">Semua status</option>${['active', 'in_review', 'returned', 'rejected'].map((s) => opt(s, q.status, h.STATUS[s][0])).join('')}</select>
        <button class="btn btn-sm btn-outline-brand">Filter</button></form>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0">
        <thead><tr><th>Toko</th><th>Program</th><th>Channel</th><th>Kelas</th><th class="num">Baseline</th><th class="num">Growth</th><th class="num">Target / bln</th><th>Status</th><th>Didaftarkan</th></tr></thead>
        <tbody>${rows.map((r) => {
          const s = store(r.customer_id); const p = programs.find((x) => x.id === r.program_id);
          const step = r.current_step_id && DB.byId('steps', r.current_step_id); const by = DB.byId('users', r.registered_by) || {};
          return `<tr><td><a href="#/registration/participant/${r.id}" class="fw-semibold">${esc(s.name)}</a><div class="small text-muted">${r.customer_id} · ${s.dc_code}</div></td>
            <td class="small">${esc(p.code)}</td><td class="small">${esc((DB.t('channels').find((c) => c.code === s.channel_code) || {}).name)}</td><td>${h.cls(r.class_name)}</td>
            <td class="num">${h.rpShort(r.baseline)}</td><td class="num">${h.pct(r.growth_pct, 0)}</td><td class="num">${h.rpShort(r.target_monthly)}</td>
            <td>${h.badge(r.status)}${step ? `<div class="small text-muted">${esc(step.name)}</div>` : ''}</td>
            <td class="small">${esc(by.name)}<div class="text-muted">${h.datetime(r.registered_at)}</div></td></tr>`;
        }).join('') || '<tr><td colspan="9" class="text-center text-muted py-4">Tidak ada data.</td></tr>'}</tbody></table></div></div>`,
    };
  });

  // Filter GET-style: form -> query string di hash
  actions.filter = (f, form) => {
    const qs = new URLSearchParams(f.entries().filter(([, v]) => v !== '')).toString();
    UI.go(form.dataset.path + (qs ? '?' + qs : ''));
  };

  // ---------------------------------------------------------------- detail peserta
  function loadParticipant(id, user, year) {
    const pa = DB.byId('participants', id);
    const p = pa && DB.byId('programs', pa.program_id);
    if (!pa || p.year !== year || !inScope(user, store(pa.customer_id))) fail('Peserta tidak ditemukan');
    return pa;
  }

  route('/registration/participant/:id', ({ id }, q, { user, year }) => {
    const pa = loadParticipant(id, user, year);
    const program = E.loadProgram(pa.program_id);
    const pc = program.channels.find((c) => c.id === pa.program_channel_id);
    const s = store(pa.customer_id);
    const cl = pc.classes.find((c) => c.id === pa.class_id);
    const lms = cl ? program.leadMeasures.filter((lm) => lm.params[cl.id]) : [];
    const step = program.steps.find((x) => x.id === pa.current_step_id);
    const canEdit = pa.status === 'returned' && CAN_REGISTER.includes(user.role);
    const canAct = pa.status === 'in_review' && step && step.role === user.role;
    const fields = E.fieldsFor(program, 'registration', pc.id);
    const by = DB.byId('users', pa.registered_by) || {};
    const disb = DB.where('disbursements', (d) => d.participant_id === pa.id);
    const stat = (label, val, sub = '') => `<div class="col-6 col-md-3"><div class="stat bg-light rounded"><div class="label">${label}</div><div class="value">${val}</div>${sub}</div></div>`;
    return {
      title: s.name, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/registration/participants">Peserta</a> / ${esc(program.name)} · ${esc(pc.channel_name)}</div>
        <h1>${esc(s.name)} ${h.badge(pa.status)}</h1>
        <div class="sub">${pa.customer_id} · ${esc(s.city)} · DC ${s.dc_code} · didaftarkan ${esc(by.name)} ${h.datetime(pa.registered_at)}</div></div>
        ${canEdit ? `<a href="#/registration/participant/${pa.id}/edit" class="btn btn-brand"><i class="bi bi-pencil"></i> Revisi & kirim ulang</a>` : ''}</div>
      <div class="row g-3"><div class="col-lg-8">
        ${canAct ? UI.approvalBox('participants', pa.id, step, `/registration/participant/${pa.id}`) : ''}
        <div class="card mb-3"><div class="card-header">Target</div><div class="card-body"><div class="row g-3">
          ${stat('Kelas', h.cls(pa.class_name))}${stat('Baseline / bln', h.rpShort(pa.baseline))}${stat('Growth', h.pct(pa.growth_pct, 0))}
          ${stat('Target program', h.rpShort(pa.target_period), `<div class="small text-muted">${h.rp(Math.round(pa.target_monthly))}/bln</div>`)}</div>
          <div class="small text-muted mt-2">Rasio SO:SI saat daftar: ${h.pct(pa.sellout_ratio)}</div></div></div>
        <div class="card mb-3"><div class="card-header">Data dari CBD</div><div class="card-body"><dl class="row mb-0">
          ${fields.map((f) => `<dt class="col-sm-4">${esc(f.label)}</dt><dd class="col-sm-8">${esc(pa.data[f.key] !== undefined ? pa.data[f.key] : '-')}</dd>`).join('')}
          ${Object.entries(pa.data).filter(([k]) => !fields.some((f) => f.key === k)).map(([k, v]) => `<dt class="col-sm-4 text-muted">${esc(k)} <span class="small">(kolom lama)</span></dt><dd class="col-sm-8">${esc(v)}</dd>`).join('')}
        </dl></div></div>
        <div class="card mb-3"><div class="card-header">Parameter JTBD kelas ${esc(pa.class_name)}</div><div class="card-body p-0"><table class="table table-sm mb-0">
          <thead><tr><th>Pilar</th><th>JTBD</th><th>Lead measure</th><th>Target</th><th class="num">Reward</th></tr></thead>
          <tbody>${lms.map((lm) => { const prm = lm.params[cl.id];
            return `<tr><td class="small">${esc(lm.pillar_name)}</td><td class="small">${esc(lm.jtbd_name)}</td><td>${esc(lm.name)}</td>
              <td>${esc(prm.target_value)} <span class="text-muted small">${esc(lm.unit || '')}</span></td>
              <td class="num small">${prm.reward_pct ? h.pct(prm.reward_pct, 2) : ''}${prm.reward_nominal ? ' + ' + h.rp(prm.reward_nominal) : ''}</td></tr>`; }).join('')
            || '<tr><td colspan="5" class="text-muted">Tidak ada lead measure untuk kelas ini.</td></tr>'}</tbody></table></div></div>
        <div class="card"><div class="card-header">Pencairan</div><div class="card-body p-0"><table class="table table-sm mb-0">
          <thead><tr><th>Periode</th><th class="num">Pencapaian</th><th class="num">Netto</th><th>Status</th><th></th></tr></thead>
          <tbody>${disb.map((d) => `<tr><td>${esc((DB.byId('periods', d.period_id) || {}).name)}</td><td class="num">${h.pct(d.achievement_pct)}</td><td class="num">${h.rp(d.net_amount)}</td>
            <td>${h.badge(d.status)}</td><td class="text-right"><a href="#/disbursement/item/${d.id}" class="btn btn-sm btn-link">Detail</a></td></tr>`).join('')
            || '<tr><td colspan="5" class="text-muted">Belum ada pengajuan.</td></tr>'}</tbody></table></div></div>
      </div>
      <div class="col-lg-4"><div class="card"><div class="card-header">Riwayat</div><div class="card-body">${UI.logHtml('participant', pa.id)}</div></div></div></div>`,
    };
  });
})();
