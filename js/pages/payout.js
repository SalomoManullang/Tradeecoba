// Payout dua jalur (PRD FR14): CONDITIONAL (growth → tier) dan FIX (kepatuhan pilar), masing-masing dengan
// jadwal sendiri (quarterly / semester), form Payout, dan approval layer Payout sampai final approval.
(function () {
  const { h, route, actions, clicks, done, fail, inScope, store } = UI;
  const { esc } = h;
  const E = window.Engine;
  const C = window.Catalog;
  const COMP = { CONDITIONAL: 'Conditional Rebate', FIX: 'Fix Rebate' };
  const canSubmit = (user) => ['ADMIN_DC', ...h.SETUP_ROLES].includes(user.role);
  // Periode bisa diajukan bila data penjualan semua bulannya sudah masuk
  const dataReady = (per) => { const up = new Set((DB.state.salesUploads || []).map((u) => u.period)); return per.months.every((m) => up.has(m)); };

  function programCtx(pid, year) {
    const program = E.loadProgram(Number(pid));
    if (!program || program.year !== year || program.status === 'DRAFT') fail('Program tidak ditemukan');
    return program;
  }
  const periodsFor = (program, ch, comp) => E.periodsOf(program.period_start, program.period_end, ch.payoutSchedule[comp] || 'QUARTERLY');

  // ---------------------------------------------------------------- ringkasan
  route('/payout', ({}, q, { year }) => {
    const programs = DB.where('programs', (p) => p.year === year && p.status !== 'DRAFT').map((p) => E.loadProgram(p.id));
    return {
      title: 'Payout', html: `<div class="page-head"><div><h1>Payout ${year}</h1><div class="sub">Conditional & Fix dibayar terpisah, masing-masing dengan jadwal & record sendiri.</div></div></div>
      ${programs.map((p) => `<div class="card mb-3"><div class="card-header d-flex justify-content-between"><span>${esc(p.name)}&nbsp;<span class="text-muted fw-normal">· ${esc(p.code)}</span></span>
        <a href="#/payout/program/${p.id}" class="btn btn-sm btn-brand">Buka</a></div><div class="table-responsive"><table class="table table-sm mb-0">
        <thead><tr><th>Channel</th><th>Komponen</th><th>Jadwal</th><th class="num">Diproses</th><th class="num">Dibayar</th><th class="num">Total dibayar</th></tr></thead><tbody>
        ${p.channels.flatMap((ch) => Object.keys(COMP).map((comp) => {
          const regIds = DB.where('registrations', (r) => r.program_channel_id === ch.id).map((r) => r.id);
          const ps = DB.where('payouts', (x) => regIds.includes(x.registration_id) && x.component === comp);
          return `<tr><td>${esc(ch.channel_name)}</td><td>${COMP[comp]}</td><td>${C.FREQUENCIES[ch.payoutSchedule[comp]] || '-'}</td>
            <td class="num">${ps.filter((x) => x.status === 'in_review').length}</td><td class="num">${ps.filter((x) => x.status === 'paid').length}</td>
            <td class="num">${h.rp(ps.filter((x) => x.status === 'paid').reduce((s, x) => s + x.amount, 0))}</td></tr>`;
        })).join('')}</tbody></table></div></div>`).join('') || '<div class="card"><div class="card-body text-muted">Belum ada program PUBLISHED.</div></div>'}`,
    };
  });

  // ---------------------------------------------------------------- per program: pilih channel, komponen, periode
  route('/payout/program/:p', ({ p: pid }, q, { user, year }) => {
    const program = programCtx(pid, year);
    const ch = program.channels.find((c) => c.id === Number(q.ch)) || program.channels[0];
    const comp = COMP[q.c] ? q.c : 'CONDITIONAL';
    const pers = periodsFor(program, ch, comp);
    const per = pers.find((x) => x.key === q.per) || pers[0];
    const regs = DB.where('registrations', (r) => r.program_channel_id === ch.id && r.status === 'approved' && inScope(user, store(r.customer_id)));
    const ready = dataReady(per);
    const rows = regs.map((r) => {
      const pay = DB.t('payouts').find((x) => x.registration_id === r.id && x.component === comp && x.period_key === per.key);
      return { r, pay, calc: pay ? null : E.payoutCalc(ch, r, comp, per) };
    });
    const link = (o) => `#/payout/program/${program.id}?ch=${o.ch || ch.id}&c=${o.c || comp}&per=${o.per || ''}`;
    return {
      title: `Payout ${program.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/payout">Payout</a> / ${esc(program.name)}</div>
        <h1>${COMP[comp]} · ${esc(per.label)}</h1><div class="sub">${esc(ch.channel_name)} · ${h.date(per.start)} – ${h.date(per.end)} · jadwal ${C.FREQUENCIES[ch.payoutSchedule[comp]]}</div></div>
        <button class="btn btn-outline-brand" data-click="payout.export" data-p="${program.id}" data-ch="${ch.id}"><i class="bi bi-download"></i> Export CSV (per komponen)</button></div>
      <div class="d-flex flex-wrap gap-2 mb-3">
        ${program.channels.map((c) => `<a class="btn btn-sm ${c.id === ch.id ? 'btn-brand' : 'btn-outline-brand'}" href="${link({ ch: c.id })}">${esc(c.channel_name)}</a>`).join('')}
        <span class="mx-2 border-left"></span>
        ${Object.entries(COMP).map(([k, l]) => `<a class="btn btn-sm ${k === comp ? 'btn-dark' : 'btn-outline-secondary'}" href="${link({ c: k })}">${l}</a>`).join('')}
        <span class="mx-2 border-left"></span>
        ${pers.map((x) => `<a class="btn btn-sm ${x.key === per.key ? 'btn-info' : 'btn-outline-info'}" href="${link({ per: x.key })}">${esc(x.label)}</a>`).join('')}</div>
      ${ready ? '' : '<div class="alert alert-secondary py-2 small">Data penjualan periode ini belum lengkap. Pengajuan dibuka setelah data semua bulan masuk.</div>'}
      <div class="alert alert-light py-2 small">${comp === 'CONDITIONAL' ? 'Conditional = conditional % tier tercapai (dari achievement periode) × dasar rebate. Growth di bawah tier 1 → 0.'
        : `Fix = fix maks kelas × skor pilar (${esc(ch.pillar_framework_name || '')}, dari evidence Monitoring yang disetujui) × dasar rebate. Tidak bergantung pada growth.`}</div>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide">
        <thead><tr><th>Toko</th><th>Brand: ${comp === 'CONDITIONAL' ? 'achievement → tier' : 'skor pilar'}</th><th class="num">Nominal</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(({ r, pay, calc }) => { const s = store(r.customer_id); const lines = pay ? pay.lines : calc.lines; const l = pay && E.currentLayer(pay);
          return `<tr><td><span class="fw-semibold">${esc(s.name)}</span><div class="small text-muted">${r.customer_id}</div></td>
            <td class="small">${lines.map((x) => `<div>${esc(x.brand_name)}: ${x.error ? `<span class="text-danger">${esc(x.error)}</span>` : comp === 'CONDITIONAL'
              ? `${h.pct(x.achievement_pct)} → ${x.tier_growth_pct !== null && x.tier_growth_pct !== undefined ? `tier ${x.tier_growth_pct}% (${x.conditional_pct}%)` : 'di bawah tier 1'}`
              : `skor ${h.num(x.pillar_score, 2)} × fix ${x.fix_max_pct}%`} · ${h.rpShort(x.amount)}</div>`).join('')}</td>
            <td class="num fw-semibold">${h.rp(pay ? pay.amount : calc.amount)}${pay ? '' : '<div class="small text-muted">estimasi</div>'}</td>
            <td>${pay ? h.badge(pay.status) + (l ? `<div class="small text-muted">${esc(C.APPROVAL_ROLES[l.role_code])}</div>` : '') : '<span class="badge badge-light">Belum diajukan</span>'}</td>
            <td class="text-right text-nowrap">${pay && pay.status !== 'returned' ? `<a href="#/payout/item/${pay.id}" class="btn btn-sm btn-outline-brand">Detail</a>`
              : canSubmit(user) ? `<a href="#/payout/form/${r.id}/${comp}/${per.key}" class="btn btn-sm btn-brand ${ready ? '' : 'disabled'}">${pay ? 'Revisi' : 'Ajukan'}</a>` : ''}</td></tr>`; }).join('')
          || '<tr><td colspan="5" class="text-center text-muted py-4">Belum ada peserta yang disetujui.</td></tr>'}</tbody></table></div></div>`,
    };
  });

  clicks['payout.export'] = (d) => {
    const user = UI.currentUser();
    const program = E.loadProgram(Number(d.p));
    const ch = program.channels.find((c) => c.id === Number(d.ch));
    const rows = [['customer_id', 'nama_toko', 'channel', 'komponen', 'periode', 'brand', 'kelas', 'achievement_%', 'tier_growth_%', 'skor_pilar', 'net_sell_in', 'nominal_brand', 'total_payout', 'status']];
    for (const x of DB.t('payouts')) {
      const r = DB.byId('registrations', x.registration_id);
      if (r.program_channel_id !== ch.id || !inScope(user, store(r.customer_id))) continue;
      for (const l of x.lines) rows.push([r.customer_id, store(r.customer_id).name, ch.channel_code, x.component, x.period_key, l.brand_code, l.class_code,
        l.achievement_pct !== undefined ? l.achievement_pct.toFixed(2) : '', l.tier_growth_pct === null ? '' : l.tier_growth_pct, l.pillar_score !== undefined ? l.pillar_score.toFixed(4) : '', Math.round(l.net_sell_in || 0), l.amount, x.amount, x.status]);
    }
    UI.download(`payout_${program.code}_${ch.channel_code}.csv`, UI.toCsv(rows), 'text/csv;charset=utf-8');
  };

  // ---------------------------------------------------------------- form payout
  function linesHtml(lines, comp) {
    return `<table class="table table-sm mb-0"><thead><tr><th>Brand</th><th>Kelas</th><th class="num">Net sell in</th>${comp === 'CONDITIONAL' ? '<th class="num">Achievement</th><th class="num">Tier</th><th class="num">Conditional %</th>'
      : '<th class="num">Skor pilar</th><th class="num">Fix maks</th>'}<th class="num">Nominal</th></tr></thead><tbody>
      ${lines.map((l) => `<tr><td>${esc(l.brand_name)}${l.error ? `<div class="small text-danger">${esc(l.error)}</div>` : ''}</td><td>${h.cls(l.class_code)}</td><td class="num">${h.rpShort(l.net_sell_in)}</td>
        ${comp === 'CONDITIONAL' ? `<td class="num">${h.pct(l.achievement_pct)}</td><td class="num">${l.tier_growth_pct === null || l.tier_growth_pct === undefined ? '-' : l.tier_growth_pct + '%'}</td><td class="num">${l.conditional_pct}%</td>`
          : `<td class="num">${h.num(l.pillar_score, 3)}</td><td class="num">${l.fix_max_pct}%</td>`}<td class="num fw-semibold">${h.rp(l.amount)}</td></tr>`).join('')}</tbody></table>`;
  }
  function traceHtml(lines) {
    return lines.map((l) => `<div class="mb-2"><strong>${esc(l.brand_name)}</strong><ol class="mb-0 small">${(l.trace || []).map((t) => `<li>${t.slot ? `<code>${t.slot}</code> = <code>${esc(t.expression)}</code> → ${h.num(t.value, Math.abs(t.value) < 10 ? 4 : 0)}` : esc(t.text)}</li>`).join('')}</ol></div>`).join('');
  }

  route('/payout/form/:reg/:comp/:per', ({ reg: rid, comp, per: key }, q, { user, year, path }) => {
    if (!canSubmit(user)) fail('Tidak ada akses', 'Payout diajukan oleh Admin DC.');
    const reg = DB.byId('registrations', rid);
    if (!reg || reg.status !== 'approved' || !COMP[comp]) fail('Data tidak ditemukan');
    const program = programCtx(reg.program_id, year);
    const ch = program.channels.find((c) => c.id === reg.program_channel_id);
    const per = periodsFor(program, ch, comp).find((x) => x.key === key);
    if (!per) fail('Periode tidak ditemukan');
    const ex = DB.t('payouts').find((x) => x.registration_id === reg.id && x.component === comp && x.period_key === key);
    if (ex && ex.status !== 'returned') UI.redirect(`/payout/item/${ex.id}`);
    const calc = E.payoutCalc(ch, reg, comp, per);
    const pend = UI.takePending(path);
    const fields = ch.phases.PAYOUT.fields.filter((f) => f.is_visible);
    const vals = pend ? Object.fromEntries(Object.entries(pend.values).filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), v])) : ex ? ex.data : { payout_schedule: comp === 'CONDITIONAL' ? (ch.payoutSchedule.CONDITIONAL === 'SEMESTER' ? 'Semester' : 'Quarterly') : (ch.payoutSchedule.FIX === 'SEMESTER' ? 'Semester' : 'Quarterly') };
    vals.payout_amount = calc.amount;
    const s = store(reg.customer_id);
    const objects = E.payoutObjects(ch, reg, calc, per);
    const ev = E.evaluateApproval(ch.phases.PAYOUT.layers, objects);
    return {
      title: `Payout ${s.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/payout/program/${program.id}?ch=${ch.id}&c=${comp}&per=${per.key}">Payout ${esc(program.name)}</a></div>
        <h1>${COMP[comp]} ${esc(per.label)} · ${esc(s.name)}</h1><div class="sub">${reg.customer_id} · ${esc(ch.channel_name)} · ${h.date(per.start)} – ${h.date(per.end)}</div></div></div>
      ${UI.errorsHtml(pend && pend.errors)}${calc.errors.length ? `<div class="alert alert-danger">${calc.errors.map(esc).join('<br>')}</div>` : ''}
      <form data-action="payout.submit" data-reg="${reg.id}" data-comp="${comp}" data-per="${per.key}"><div class="row g-3"><div class="col-xl-8">
        <div class="card mb-3"><div class="card-header">Hitungan otomatis (dari setup)</div><div class="table-responsive">${linesHtml(calc.lines, comp)}</div></div>
        ${comp === 'FIX' ? `<div class="card mb-3"><div class="card-header">Kepatuhan pilar</div><div class="card-body small">${ch.pillars.map((pl, i) => `<div class="d-flex justify-content-between"><span>${esc(pl.name)} <span class="text-muted">bobot ${pl.weight_pct || 0}%</span></span><strong>${h.pct(calc.compliance[i] * 100, 0)}</strong></div>`).join('')}
          <div class="text-muted mt-1">Dari monitoring yang disetujui dengan akhir periode di ${h.date(per.start)} – ${h.date(per.end)}.</div></div></div>` : ''}
        <details class="card mb-3"><summary class="card-header">Trace rumus</summary><div class="card-body">${traceHtml(calc.lines)}</div></details>
      </div>
      <div class="col-xl-4"><div class="card sticky-summary"><div class="card-header">Form Payout</div><div class="card-body">
        ${fields.map((f) => UI.fieldInput(f, vals[f.field_key])).join('')}
        ${ex ? '<div class="mb-3"><label class="form-label">Catatan revisi</label><textarea name="note" class="form-control" rows="2"></textarea></div>' : ''}
        <div class="small mb-2">Jalur approval:</div><div class="sim-path mb-3">${ev.map((x) => `<span class="lp ${x.auto ? 'auto' : ''}">${x.layer.layer_order}. ${esc(C.APPROVAL_ROLES[x.layer.role_code])}${x.layer.is_final ? ' · final' : ''}<small>${x.auto ? 'auto' : 'manual'}</small></span>`).join('<i class="bi bi-chevron-right text-muted"></i>')}</div>
        <button class="btn btn-brand w-100" ${calc.errors.length ? 'disabled' : ''}><i class="bi bi-send"></i> ${ex ? 'Kirim ulang' : 'Ajukan payout'} ${h.rp(calc.amount)}</button>
      </div></div></div></div></form>`,
    };
  });

  actions['payout.submit'] = (f, form) => {
    const user = UI.currentUser();
    if (!canSubmit(user)) throw new Error('Payout diajukan oleh Admin DC.');
    const reg = DB.byId('registrations', form.dataset.reg);
    const program = E.loadProgram(reg.program_id);
    const ch = program.channels.find((c) => c.id === reg.program_channel_id);
    const comp = form.dataset.comp;
    const per = periodsFor(program, ch, comp).find((x) => x.key === form.dataset.per);
    if (!dataReady(per)) throw new Error('Data penjualan periode ini belum lengkap.');
    const ex = DB.t('payouts').find((x) => x.registration_id === reg.id && x.component === comp && x.period_key === per.key);
    if (ex && ex.status !== 'returned') throw new Error('Payout periode ini sudah diajukan.');
    const calc = E.payoutCalc(ch, reg, comp, per);
    if (calc.errors.length) throw new Error('Hitungan gagal: ' + calc.errors.join('; '));
    const { values, errors } = UI.readFieldValues(ch.phases.PAYOUT.fields.filter((x) => x.is_visible), (k) => f.get(k), (k) => f.file(k));
    if (errors.length) { UI.retry(errors, f); return; }
    values.payout_amount = calc.amount;
    const now = new Date().toISOString();
    const row = { amount: calc.amount, compliance: calc.compliance, data: values, approval_objects: E.payoutObjects(ch, reg, calc, per), updated_at: now,
      lines: calc.lines.map((l) => ({ brand_code: l.brand_code, brand_name: l.brand_name, class_code: l.class_code, achievement_pct: l.achievement_pct, tier_growth_pct: l.tier_growth_pct,
        conditional_pct: l.conditional_pct, fix_max_pct: l.fix_max_pct, pillar_score: l.pillar_score, net_sell_in: l.net_sell_in, amount: l.amount, trace: l.trace, error: l.error })) };
    const pay = ex ? Object.assign(ex, row) : DB.insert('payouts', Object.assign({ registration_id: reg.id, component: comp, period_key: per.key, period_label: per.label, start: per.start, end: per.end,
      status: 'in_review', current_layer_id: null, submitted_by: user.id, created_at: now }, row));
    const next = E.submit('payout', pay, user.id, !!ex, f.get('note'));
    done('success', `${COMP[comp]} ${esc(per.label)} diajukan (${h.rp(calc.amount)}). ${next ? `Menunggu ${esc(C.APPROVAL_ROLES[next.role_code])}.` : 'Langsung dibayar.'}`, `/payout/item/${pay.id}`);
  };

  // ---------------------------------------------------------------- detail payout
  route('/payout/item/:id', ({ id }, q, { user, year }) => {
    const pay = DB.byId('payouts', id);
    const reg = pay && DB.byId('registrations', pay.registration_id);
    if (!pay || !inScope(user, store(reg.customer_id))) fail('Payout tidak ditemukan');
    const program = programCtx(reg.program_id, year);
    const ch = program.channels.find((c) => c.id === reg.program_channel_id);
    const layer = E.currentLayer(pay);
    const canAct = pay.status === 'in_review' && layer && layer.role_code === user.role;
    const s = store(reg.customer_id);
    const fields = ch.phases.PAYOUT.fields.filter((f) => f.is_visible);
    return {
      title: `Payout ${s.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/payout/program/${program.id}?ch=${ch.id}&c=${pay.component}&per=${pay.period_key}">Payout ${esc(program.name)}</a> / <a href="#/registration/participant/${reg.id}">${esc(s.name)}</a></div>
        <h1>${COMP[pay.component]} ${esc(pay.period_label)} ${h.badge(pay.status)}</h1><div class="sub">${reg.customer_id} · ${esc(ch.channel_name)} · diajukan ${esc((DB.byId('users', pay.submitted_by) || {}).name)} ${h.datetime(pay.created_at)}</div></div>
        ${pay.status === 'returned' && canSubmit(user) ? `<a href="#/payout/form/${reg.id}/${pay.component}/${pay.period_key}" class="btn btn-brand"><i class="bi bi-pencil"></i> Revisi</a>` : ''}</div>
      <div class="row g-3"><div class="col-lg-8">
        ${canAct ? UI.approvalBox('payout', pay.id, layer, `/payout/item/${pay.id}`) : ''}
        <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span>Rincian</span><span class="text-brand fw-bold">${h.rp(pay.amount)}</span></div><div class="table-responsive">${linesHtml(pay.lines, pay.component)}</div>
          <div class="card-body py-2 small text-muted">Angka dibekukan saat pengajuan. Record ini hanya komponen ${COMP[pay.component]}; komponen lain punya record & status sendiri.</div></div>
        <div class="card mb-3"><div class="card-header">Data payout</div><div class="card-body"><dl class="row mb-0">
          ${fields.map((f) => `<dt class="col-sm-4">${esc(f.label)}</dt><dd class="col-sm-8">${f.data_type === 'RUPIAH' ? h.rp(pay.data[f.field_key]) : esc(pay.data[f.field_key] !== undefined && pay.data[f.field_key] !== '' ? pay.data[f.field_key] : '-')}</dd>`).join('')}</dl></div></div>
        <details class="card"><summary class="card-header">Trace rumus</summary><div class="card-body">${traceHtml(pay.lines)}</div></details>
      </div>
      <div class="col-lg-4"><div class="card mb-3"><div class="card-header">Jalur approval</div><div class="card-body">${UI.layerPath(ch.phases.PAYOUT.layers, 'payout', pay)}</div></div>
        <div class="card"><div class="card-header">Riwayat</div><div class="card-body">${UI.logHtml('payout', pay.id)}</div></div></div></div>`,
    };
  });
})();
