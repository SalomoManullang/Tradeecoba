// Inbox approval & pencairan. Periode, komponen, dan tahapan mengikuti setup program.
(function () {
  const { h, route, actions, done, fail, inScope, store, flash } = UI;
  const { esc } = h;
  const E = window.Engine;

  const claimOpen = (p, per) => (p.settings || {}).demo_open_windows || E.isWithin(E.today(), per.claim_start, per.claim_end);
  const canSubmit = (user, p) => user.role === p.disbursement_submitter_role || user.role === 'ADMIN_HO';
  const chName = (code) => (DB.t('channels').find((c) => c.code === code) || {}).name;

  // ---------------------------------------------------------------- inbox
  route('/inbox', ({}, q, { user, year }) => {
    const progIds = DB.where('programs', (p) => p.year === year).map((p) => p.id);
    const mine = (sid) => { const s = DB.byId('steps', sid); return s && s.role === user.role ? s : null; };
    const parts = DB.where('participants', (pa) => progIds.includes(pa.program_id) && pa.status === 'in_review' && mine(pa.current_step_id) && inScope(user, store(pa.customer_id)));
    const disbs = DB.where('disbursements', (d) => {
      const pa = DB.byId('participants', d.participant_id);
      return pa && progIds.includes(pa.program_id) && d.status === 'in_review' && mine(d.current_step_id) && inScope(user, store(pa.customer_id));
    });
    const bulk = (entity, label) => `<div class="card-body border-top d-flex gap-2">
      <input name="note" class="form-control form-control-sm" style="max-width:360px" placeholder="Catatan (opsional)">
      <button class="btn btn-sm btn-success" data-confirm="Setujui semua ${label} yang dicentang?"><i class="bi bi-check2-all"></i> Setujui yang dicentang</button></div>`;
    return {
      title: 'Inbox Approval', html: `
      <div class="page-head"><div><h1>Inbox Approval</h1><div class="sub">Data yang sedang menunggu di tahap milik role <strong>${h.ROLE_LABEL[user.role]}</strong> (tahapan diatur Admin HO per program)</div></div></div>
      <div class="card mb-4"><div class="card-header">Pendaftaran toko <span class="badge badge-secondary">${parts.length}</span></div>
        ${parts.length ? `<form data-action="inbox.bulk" data-entity="participants"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide has-check">
          <thead><tr><th><input type="checkbox" class="form-check-input" data-check-all="ids"></th><th>Toko</th><th>Program · channel</th><th>Kelas</th><th class="num">Baseline</th><th class="num">Growth</th><th class="num">Target / bln</th><th>Tahap</th><th></th></tr></thead>
          <tbody>${parts.map((r) => { const s = store(r.customer_id);
            return `<tr><td><input type="checkbox" class="form-check-input" name="ids" value="${r.id}"></td>
              <td><span class="fw-semibold">${esc(s.name)}</span><div class="small text-muted">${r.customer_id} · ${s.dc_code}</div></td>
              <td class="small">${esc(DB.byId('programs', r.program_id).name)}<br>${esc(chName(s.channel_code))}</td><td>${h.cls(r.class_name)}</td>
              <td class="num">${h.rpShort(r.baseline)}</td><td class="num">${h.pct(r.growth_pct, 0)}</td><td class="num">${h.rpShort(r.target_monthly)}</td>
              <td class="small">${esc(DB.byId('steps', r.current_step_id).name)}</td>
              <td class="text-right"><a href="#/registration/participant/${r.id}" class="btn btn-sm btn-outline-brand">Review</a></td></tr>`; }).join('')}</tbody></table></div>
          ${bulk('participants', 'toko')}</form>` : '<div class="card-body text-muted">Tidak ada pendaftaran yang menunggu Anda.</div>'}</div>
      <div class="card"><div class="card-header">Pencairan <span class="badge badge-secondary">${disbs.length}</span></div>
        ${disbs.length ? `<form data-action="inbox.bulk" data-entity="disbursements"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide has-check">
          <thead><tr><th><input type="checkbox" class="form-check-input" data-check-all="ids"></th><th>Toko</th><th>Program · periode</th><th>Kelas</th><th class="num">Pencapaian</th><th class="num">Bruto</th><th class="num">Netto</th><th>Tahap</th><th></th></tr></thead>
          <tbody>${disbs.map((d) => { const pa = DB.byId('participants', d.participant_id); const s = store(pa.customer_id);
            return `<tr><td><input type="checkbox" class="form-check-input" name="ids" value="${d.id}"></td>
              <td><span class="fw-semibold">${esc(s.name)}</span><div class="small text-muted">${pa.customer_id} · ${esc(chName(s.channel_code))}</div></td>
              <td class="small">${esc(DB.byId('programs', pa.program_id).name)}<br>${esc(DB.byId('periods', d.period_id).name)}</td><td>${h.cls(pa.class_name)}</td>
              <td class="num">${h.pct(d.achievement_pct)}</td><td class="num">${h.rp(d.gross_amount)}</td><td class="num fw-semibold">${h.rp(d.net_amount)}</td>
              <td class="small">${esc(DB.byId('steps', d.current_step_id).name)}</td>
              <td class="text-right"><a href="#/disbursement/item/${d.id}" class="btn btn-sm btn-outline-brand">Review</a></td></tr>`; }).join('')}</tbody></table></div>
          ${bulk('disbursements', 'pencairan')}</form>` : '<div class="card-body text-muted">Tidak ada pencairan yang menunggu Anda.</div>'}</div>`,
    };
  });

  function actOne(entity, id, action, note) {
    const user = UI.currentUser();
    const rec = DB.byId(entity, id);
    const pa = entity === 'participants' ? rec : DB.byId('participants', rec.participant_id);
    if (!rec || !inScope(user, store(pa.customer_id))) throw new Error('Data tidak ditemukan');
    return E.act({ entity, record: rec, program: E.loadProgram(pa.program_id), action, user, note });
  }

  actions['inbox.act'] = (f, form) => {
    const action = f.get('action');
    try {
      const r = actOne(form.dataset.entity, Number(form.dataset.id), action, f.get('note'));
      const label = { approve: 'disetujui', reject: 'ditolak', return: 'dikembalikan untuk revisi' }[action];
      done('success', `Data ${label}.${r.nextStep ? ` Lanjut ke "${esc(r.nextStep.name)}".` : ''}`, form.dataset.back);
    } catch (e) {
      flash('danger', esc(e.message)); UI.render();
    }
  };

  actions['inbox.bulk'] = (f, form) => {
    const ids = f.all('ids').map(Number);
    if (!ids.length) throw new Error('Belum ada data yang dicentang.');
    let ok = 0; const errs = [];
    for (const id of ids) { try { actOne(form.dataset.entity, id, 'approve', f.get('note')); ok++; } catch (e) { errs.push(`#${id}: ${e.message}`); } }
    done(errs.length ? 'warning' : 'success', `${ok} data di-approve.${errs.length ? '<br>' + errs.map(esc).join('<br>') : ''}`, '/inbox');
  };

  // ---------------------------------------------------------------- pencairan: daftar program & periode
  route('/disbursement', ({}, q, { year }) => {
    const programs = DB.where('programs', (p) => p.year === year && ['active', 'closed'].includes(p.status)).map((x) => E.loadProgram(x.id));
    return {
      title: 'Pencairan', html: `<div class="page-head"><div><h1>Pencairan ${year}</h1><div class="sub">Periode, komponen hitungan, dan alur approval mengikuti setup tiap program.</div></div></div>
      ${programs.map((p) => `<div class="card mb-3"><div class="card-header d-flex justify-content-between">
        <span>${esc(p.name)} <span class="text-muted fw-normal">· ${esc(p.code)}</span></span>
        <span class="small fw-normal text-muted">Pengaju: ${h.ROLE_LABEL[p.disbursement_submitter_role]} → ${esc(E.stepsOf(p, 'disbursement').map((s) => s.name).join(' → ') || 'langsung cair')}</span></div>
        <div class="table-responsive"><table class="table mb-0">
          <thead><tr><th>Periode</th><th>Pencapaian dihitung</th><th>Klaim</th><th class="num">Diproses</th><th class="num">Dikembalikan</th><th class="num">Cair</th><th class="num">Total cair</th><th></th></tr></thead>
          <tbody>${p.periods.map((per) => {
            const ds = DB.where('disbursements', (d) => d.period_id === per.id);
            const n = (st) => ds.filter((d) => d.status === st).length;
            return `<tr><td class="fw-semibold">${esc(per.name)}</td><td>${h.date(per.achieve_start)} – ${h.date(per.achieve_end)}</td>
              <td>${h.date(per.claim_start)} – ${h.date(per.claim_end)} ${claimOpen(p, per) ? '<span class="badge badge-success">dibuka</span>' : '<span class="badge badge-secondary">ditutup</span>'}</td>
              <td class="num">${n('in_review')}</td><td class="num">${n('returned')}</td><td class="num">${n('paid')}</td>
              <td class="num">${h.rp(ds.filter((d) => d.status === 'paid').reduce((s, d) => s + d.net_amount, 0))}</td>
              <td class="text-right"><a href="#/disbursement/program/${p.id}/${per.id}" class="btn btn-sm btn-brand">Buka</a></td></tr>`;
          }).join('') || '<tr><td colspan="8" class="text-muted">Belum ada periode pencairan di setup.</td></tr>'}</tbody></table></div></div>`).join('')
        || '<div class="card"><div class="card-body text-muted">Belum ada program aktif.</div></div>'}`,
    };
  });

  function periodCtx(pid, perId, year) {
    const program = E.loadProgram(Number(pid));
    if (!program || program.year !== year) fail('Program tidak ditemukan');
    const period = program.periods.find((x) => x.id === Number(perId));
    if (!period) fail('Periode tidak ditemukan');
    return { program, period };
  }
  function actualOf(program, pa, period) {
    const pc = program.channels.find((c) => c.id === pa.program_channel_id);
    const a = E.salesAgg({ customerIds: [pa.customer_id], brandCodes: pc.brand_codes, start: period.achieve_start, end: period.achieve_end }).get(pa.customer_id);
    return { a, actual: a ? E.metric(program, a) : 0, pc };
  }

  route('/disbursement/program/:p/:per', ({ p: pid, per: perId }, q, { user, year }) => {
    const { program, period } = periodCtx(pid, perId, year);
    const rows = DB.where('participants', (pa) => {
      const s = store(pa.customer_id);
      return pa.program_id === program.id && pa.status === 'active' && inScope(user, s) && (!q.channel || s.channel_code === q.channel);
    }).sort((a, b) => a.customer_id.localeCompare(b.customer_id)).map((pa) => {
      const d = DB.t('disbursements').find((x) => x.participant_id === pa.id && x.period_id === period.id);
      const s = store(pa.customer_id);
      const { actual } = actualOf(program, pa, period);
      const calc = E.computeDisbursement({ program, participant: pa, period, actual, lmValues: {}, data: {}, hasNpwp: !!s.npwp_no });
      return { pa, s, d, calc };
    });
    const comps = program.components.filter((c) => c.is_active);
    const open = claimOpen(program, period); const can = canSubmit(user, program);
    const stat = (l, v) => `<div class="col-6 col-md-3"><div class="card stat"><div class="label">${l}</div><div class="value">${v}</div></div></div>`;
    return {
      title: `Pencairan ${period.name}`, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/disbursement">Pencairan</a> / ${esc(program.name)}</div><h1>${esc(period.name)}</h1>
        <div class="sub">Pencapaian ${h.date(period.achieve_start)} – ${h.date(period.achieve_end)} · klaim ${h.date(period.claim_start)} – ${h.date(period.claim_end)}
          ${open ? '<span class="badge badge-success">dibuka</span>' : '<span class="badge badge-secondary">ditutup</span>'}</div></div>
        <button class="btn btn-outline-brand" data-click="disb.export" data-p="${program.id}" data-per="${period.id}"><i class="bi bi-download"></i> Export CSV</button></div>
      <div class="row g-3 mb-3">${stat('Peserta aktif', rows.length)}${stat('Sudah diajukan', rows.filter((r) => r.d).length)}
        ${stat('Estimasi bruto*', h.rpShort(rows.reduce((s, r) => s + r.calc.gross, 0)))}${stat('Sudah cair (netto)', h.rpShort(rows.filter((r) => r.d && r.d.status === 'paid').reduce((s, r) => s + r.d.net_amount, 0)))}</div>
      <form class="mb-2" data-action="filter" data-path="/disbursement/program/${program.id}/${period.id}"><select name="channel" class="form-control form-control-sm" style="width:auto" onchange="this.form.requestSubmit()">
        <option value="">Semua channel</option>${program.channels.map((c) => `<option value="${c.channel_code}" ${h.sel(q.channel === c.channel_code)}>${esc(c.channel_name)}</option>`).join('')}</select></form>
      <div class="card"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide">
        <thead><tr><th>Toko</th><th>Kelas</th><th class="num">Target periode</th><th class="num">Aktual</th><th class="num">Pencapaian</th>
          ${comps.map((c) => `<th class="num">${esc(c.name)}</th>`).join('')}<th class="num">Bruto</th><th>Status</th><th></th></tr></thead>
        <tbody>${rows.map(({ pa, s, d, calc }) => {
          const lines = d ? d.breakdown : calc.lines;
          const tg = d ? d.target : calc.target; const ac = d ? d.actual : calc.actual; const ach = d ? d.achievement_pct : calc.achievement;
          const step = d && d.current_step_id && DB.byId('steps', d.current_step_id);
          const href = `#/disbursement/program/${program.id}/${period.id}/participant/${pa.id}`;
          return `<tr><td><span class="fw-semibold">${esc(s.name)}</span><div class="small text-muted">${pa.customer_id} · ${esc(chName(s.channel_code))} · ${s.dc_code}</div></td>
            <td>${h.cls(pa.class_name)}</td><td class="num">${h.rpShort(tg)}</td><td class="num">${h.rpShort(ac)}</td>
            <td class="num fw-semibold ${ach >= 100 ? 'text-success' : ach >= 90 ? 'text-warning' : 'text-danger'}">${h.pct(ach)}</td>
            ${comps.map((c) => { const l = lines.find((x) => x.component_id === c.id); return `<td class="num small" title="${esc(l ? l.detail : 'tidak berlaku')}">${l ? h.rpShort(l.amount) : '–'}</td>`; }).join('')}
            <td class="num">${h.rp(d ? d.gross_amount : calc.gross)}</td>
            <td>${d ? h.badge(d.status) + (step ? `<div class="small text-muted">${esc(step.name)}</div>` : '') : '<span class="badge badge-light">Belum diajukan</span>'}</td>
            <td class="text-right text-nowrap">${d && d.status !== 'returned' ? `<a href="#/disbursement/item/${d.id}" class="btn btn-sm btn-outline-brand">Detail</a>`
              : can ? `<a href="${href}" class="btn btn-sm btn-brand ${open ? '' : 'disabled'}">${d ? 'Revisi' : 'Ajukan'}</a>` : `<a href="${href}" class="btn btn-sm btn-outline-secondary">Lihat</a>`}</td></tr>`;
        }).join('') || '<tr><td colspan="20" class="text-center text-muted py-4">Belum ada peserta aktif dalam scope Anda.</td></tr>'}</tbody></table></div></div>
      <div class="form-text">* Estimasi untuk yang belum diajukan dihitung tanpa realisasi JTBD (reward JTBD = 0 sampai diisi saat pengajuan).</div>`,
    };
  });

  UI.clicks['disb.export'] = (d) => {
    const user = UI.currentUser();
    const program = E.loadProgram(Number(d.p));
    const period = program.periods.find((x) => x.id === Number(d.per));
    const comps = program.components.map((c) => c.name);
    const rows = [['customer_id', 'nama_toko', 'dc', 'channel', 'kelas', 'target', 'aktual', 'pencapaian_%', ...comps, 'bruto', 'pajak_%', 'pajak', 'netto', 'status', 'npwp', 'bank', 'no_rekening', 'nama_rekening']];
    for (const x of DB.where('disbursements', (y) => y.period_id === period.id)) {
      const pa = DB.byId('participants', x.participant_id); const s = store(pa.customer_id);
      if (!inScope(user, s)) continue;
      const by = Object.fromEntries(x.breakdown.map((l) => [l.name, l.amount]));
      rows.push([pa.customer_id, s.name, s.dc_code, s.channel_code, pa.class_name, Math.round(x.target), Math.round(x.actual), x.achievement_pct.toFixed(2),
        ...comps.map((n) => by[n] || 0), x.gross_amount, x.tax_rate, x.tax_amount, x.net_amount, x.status, x.payee.npwp_no, x.payee.bank_name, x.payee.bank_account_no, x.payee.bank_account_name]);
    }
    UI.download(`pencairan_${program.code}_${period.name.replace(/\W+/g, '_')}.csv`, UI.toCsv(rows), 'text/csv;charset=utf-8');
  };

  // ---------------------------------------------------------------- form pengajuan
  const PAYEE = ['npwp_no', 'npwp_name', 'bank_name', 'bank_account_no', 'bank_account_name'];
  function readLm(program, classId, get) {
    const out = {};
    for (const lm of program.leadMeasures) {
      if (!lm.params[classId]) continue;
      const v = get(`lm_${lm.id}`);
      if (v !== null && v !== undefined && String(v).trim() !== '') out[lm.id] = String(v).trim();
    }
    return out;
  }

  route('/disbursement/program/:p/:per/participant/:pa', ({ p: pid, per: perId, pa: paId }, q, { user, year, path }) => {
    const { program, period } = periodCtx(pid, perId, year);
    const pa = DB.byId('participants', paId);
    if (!pa || pa.program_id !== program.id || !inScope(user, store(pa.customer_id))) fail('Peserta tidak ditemukan');
    const s = store(pa.customer_id);
    const d = DB.t('disbursements').find((x) => x.participant_id === pa.id && x.period_id === period.id);
    if (d && d.status !== 'returned') UI.redirect(`/disbursement/item/${d.id}`);
    const { a, actual, pc } = actualOf(program, pa, period);
    const pend = UI.takePending(path);
    const get = pend ? (k) => pend.values[k] : null;
    const payee = pend ? Object.fromEntries(PAYEE.map((k) => [k, pend.values[k] || ''])) : d ? d.payee
      : Object.fromEntries(PAYEE.map((k) => [k, s[k] || '']));
    const lmValues = pend ? readLm(program, pa.class_id, get) : d ? d.lm_values : {};
    const values = pend ? Object.fromEntries(Object.entries(pend.values).filter(([k]) => k.startsWith('f_')).map(([k, v]) => [k.slice(2), v])) : d ? d.data : {};
    const fields = E.fieldsFor(program, 'disbursement', pc.id);
    const calc = E.computeDisbursement({ program, participant: pa, period, actual, lmValues, data: values, hasNpwp: !!payee.npwp_no });
    const open = claimOpen(program, period); const can = canSubmit(user, program);
    const ro = !can || !open ? 'disabled' : '';
    const months = E.monthsBetween(period.achieve_start, period.achieve_end).map((m) => ({ m, actual: a && a.monthly[m] ? E.metric(program, a.monthly[m]) : 0 }));
    const stat = (l, v, c = '') => `<div class="col-4"><div class="stat bg-light rounded"><div class="label">${l}</div><div class="value ${c}">${v}</div></div></div>`;
    const calcHtml = (c) => `<tbody>${c.lines.map((l) => `<tr><td>${esc(l.name)}<div class="text-muted">${esc(l.detail)}</div></td><td class="num">${h.rp(l.amount)}</td></tr>`).join('')}</tbody>
      <tfoot><tr class="fw-semibold"><td>Bruto</td><td class="num">${h.rp(c.gross)}</td></tr><tr><td>Pajak (${c.taxRate}%)</td><td class="num">-${h.rp(c.tax)}</td></tr>
        <tr class="fw-bold fs-6 text-brand"><td>Netto</td><td class="num">${h.rp(c.net)}</td></tr></tfoot>`;
    return {
      title: `Pencairan ${s.name}`, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/disbursement">Pencairan</a> / <a href="#/disbursement/program/${program.id}/${period.id}">${esc(program.name)} · ${esc(period.name)}</a></div>
        <h1>Pencairan ${esc(s.name)}</h1><div class="sub">${pa.customer_id} · ${esc(pc.channel_name)} · DC ${s.dc_code} · kelas ${h.cls(pa.class_name)}</div></div></div>
      ${d && d.status === 'returned' ? '<div class="alert alert-info">Pengajuan sebelumnya dikembalikan untuk revisi. Perbaiki lalu kirim ulang.</div>' : ''}
      ${UI.errorsHtml(pend && pend.errors)}
      ${can ? '' : `<div class="alert alert-secondary">Pengajuan dilakukan oleh ${h.ROLE_LABEL[program.disbursement_submitter_role]}. Halaman ini hanya simulasi.</div>`}
      ${open ? '' : `<div class="alert alert-secondary">Periode klaim ${esc(period.name)} belum dibuka / sudah ditutup.</div>`}
      <form data-action="disb.submit" id="dForm" data-p="${program.id}" data-per="${period.id}" data-pa="${pa.id}"><div class="row g-3">
        <div class="col-xl-8">
          <div class="card mb-3"><div class="card-header">Pencapaian ${esc(period.name)} <span class="text-muted fw-normal small">(${program.basis === 'sellin' ? 'sell in' : 'sell out'}, otomatis)</span></div><div class="card-body">
            <div class="row g-3 mb-3">${stat('Target periode', h.rpShort(calc.target))}${stat('Aktual', h.rpShort(calc.actual))}
              ${stat('Pencapaian', h.pct(calc.achievement), calc.achievement >= 100 ? 'text-success' : calc.achievement >= 90 ? 'text-warning' : 'text-danger')}</div>
            <div class="table-responsive"><table class="table table-sm small mb-0"><thead><tr><th></th>${months.map((m) => `<th class="num">${h.month(m.m)}</th>`).join('')}</tr></thead>
              <tbody><tr><td>Target</td>${months.map(() => `<td class="num text-muted">${h.rpShort(pa.target_monthly)}</td>`).join('')}</tr>
                <tr><td>Aktual</td>${months.map((m) => `<td class="num ${m.actual >= pa.target_monthly ? 'text-success' : ''}">${h.rpShort(m.actual)}</td>`).join('')}</tr></tbody></table></div>
          </div></div>
          <div class="card mb-3"><div class="card-header">Realisasi Vision Compass / JTBD — kelas ${esc(pa.class_name)}</div><div class="card-body p-0"><table class="table table-sm mb-0">
            <thead><tr><th>Pilar · JTBD</th><th>Lead measure</th><th>Target</th><th style="width:170px">Realisasi</th><th class="text-center">Tercapai</th></tr></thead>
            <tbody>${calc.lmItems.map((it) => { const lm = it.lm; const v = lmValues[lm.id] || '';
              return `<tr><td class="small text-muted">${esc(lm.pillar_name)}<br>${esc(lm.jtbd_name)}</td><td>${esc(lm.name)}</td>
                <td>${esc(it.param.target_value)} <span class="small text-muted">${esc(lm.unit || '')}</span><div class="small text-muted">${it.param.reward_pct ? 'reward ' + h.pct(it.param.reward_pct, 2) : ''}${it.param.reward_nominal ? ' + ' + h.rp(it.param.reward_nominal) : ''}</div></td>
                <td>${lm.input_type === 'yesno' ? `<select name="lm_${lm.id}" class="form-control form-control-sm" ${ro}><option value=""></option><option ${h.sel(v === 'Ya')}>Ya</option><option ${h.sel(v === 'Tidak')}>Tidak</option></select>`
                  : `<input name="lm_${lm.id}" type="${lm.input_type === 'number' ? 'number' : 'text'}" step="any" class="form-control form-control-sm" value="${esc(v)}" ${ro}>`}</td>
                <td class="text-center"><i class="bi bi-check-circle-fill lm-ok" data-lm="${lm.id}" style="${it.achieved ? '' : 'display:none'}"></i><i class="bi bi-dash-circle lm-no" data-lm-no="${lm.id}" style="${it.achieved ? 'display:none' : ''}"></i></td></tr>`;
            }).join('') || '<tr><td colspan="5" class="text-muted p-3">Tidak ada lead measure untuk kelas ini.</td></tr>'}</tbody></table></div></div>
          <div class="card mb-3"><div class="card-header">Data pencairan</div><div class="card-body"><div class="row g-3">
            <div class="col-md-6"><label class="form-label">No. NPWP</label><input name="npwp_no" class="form-control" value="${esc(payee.npwp_no)}" placeholder="kosong = tarif non-NPWP" ${ro}></div>
            <div class="col-md-6"><label class="form-label">Nama NPWP</label><input name="npwp_name" class="form-control" value="${esc(payee.npwp_name)}" ${ro}></div>
            <div class="col-md-4"><label class="form-label">Bank <span class="text-danger">*</span></label><input name="bank_name" class="form-control" value="${esc(payee.bank_name)}" ${ro}></div>
            <div class="col-md-4"><label class="form-label">No. rekening <span class="text-danger">*</span></label><input name="bank_account_no" class="form-control" value="${esc(payee.bank_account_no)}" ${ro}></div>
            <div class="col-md-4"><label class="form-label">Nama rekening <span class="text-danger">*</span></label><input name="bank_account_name" class="form-control" value="${esc(payee.bank_account_name)}" ${ro}></div></div>
            <hr>${fields.map((f) => UI.fieldInput(f, values[f.key], { disabled: !!ro })).join('')}
            ${d && d.status === 'returned' ? '<div class="mb-3"><label class="form-label">Catatan revisi</label><textarea name="note" class="form-control" rows="2"></textarea></div>' : ''}
          </div></div>
        </div>
        <div class="col-xl-4"><div class="card sticky-summary"><div class="card-header">Hitungan <span class="small text-muted fw-normal">(otomatis dari setup)</span></div><div class="card-body">
          <table class="table table-sm small" id="calcTbl">${calcHtml(calc)}</table>
          ${can && open ? `<button class="btn btn-brand w-100"><i class="bi bi-send"></i> ${d ? 'Kirim ulang' : 'Ajukan pencairan'}</button>
            <div class="form-text">Selanjutnya: ${esc(E.stepsOf(program, 'disbursement').map((x) => x.name).join(' → ') || 'langsung cair')}</div>` : ''}
        </div></div></div>
      </div></form>`,
      after(root) {
        const form = root.querySelector('#dForm');
        form.addEventListener('input', () => {
          const fd = new FormData(form);
          const g = (k) => fd.get(k);
          const { values: vals } = UI.readFieldValues(fields, g);
          const c = E.computeDisbursement({ program, participant: pa, period, actual, lmValues: readLm(program, pa.class_id, g), data: vals, hasNpwp: !!String(g('npwp_no') || '').trim() });
          root.querySelector('#calcTbl').innerHTML = calcHtml(c);
          for (const it of c.lmItems) {
            const okEl = root.querySelector(`[data-lm="${it.lm.id}"]`); const noEl = root.querySelector(`[data-lm-no="${it.lm.id}"]`);
            if (okEl) { okEl.style.display = it.achieved ? '' : 'none'; noEl.style.display = it.achieved ? 'none' : ''; }
          }
        });
      },
    };
  });

  actions['disb.submit'] = (f, form) => {
    const user = UI.currentUser();
    const program = E.loadProgram(Number(form.dataset.p));
    const period = program.periods.find((x) => x.id === Number(form.dataset.per));
    const pa = DB.byId('participants', form.dataset.pa);
    const s = store(pa.customer_id);
    const d = DB.t('disbursements').find((x) => x.participant_id === pa.id && x.period_id === period.id);
    const { actual, pc } = actualOf(program, pa, period);
    const { values, errors } = UI.readFieldValues(E.fieldsFor(program, 'disbursement', pc.id), (k) => f.get(k));
    const lmValues = readLm(program, pa.class_id, (k) => f.get(k));
    const payee = Object.fromEntries(PAYEE.map((k) => [k, String(f.get(k) || '').trim()]));
    if (!canSubmit(user, program)) errors.unshift(`Pengajuan pencairan dilakukan oleh role ${program.disbursement_submitter_role}.`);
    if (!claimOpen(program, period)) errors.unshift('Periode klaim pencairan belum dibuka / sudah ditutup.');
    if (d && d.status !== 'returned') errors.unshift('Pencairan periode ini sudah diajukan.');
    if (!payee.bank_name || !payee.bank_account_no || !payee.bank_account_name) errors.push('Data rekening (bank, nomor, nama) wajib diisi.');
    if (payee.npwp_no && !/^[0-9.\-]{15,20}$/.test(payee.npwp_no)) errors.push('Format NPWP tidak valid (15-16 digit).');
    if (errors.length) { UI.retry(errors, f); return; }

    const calc = E.computeDisbursement({ program, participant: pa, period, actual, lmValues, data: values, hasNpwp: !!payee.npwp_no });
    const init = E.initialState(program, 'disbursement');
    const row = { target: calc.target, actual: calc.actual, achievement_pct: calc.achievement, lm_values: lmValues, data: values, payee, breakdown: calc.lines,
      gross_amount: calc.gross, tax_rate: calc.taxRate, tax_amount: calc.tax, net_amount: calc.net, status: init.status, current_step_id: init.current_step_id,
      submitted_by: user.id, updated_at: new Date().toISOString() };
    let rec;
    if (d) { rec = Object.assign(d, row); E.log('disbursement', d.id, null, 'resubmit', f.get('note'), user.id); }
    else { rec = DB.insert('disbursements', Object.assign({ participant_id: pa.id, period_id: period.id, created_at: new Date().toISOString() }, row)); E.log('disbursement', rec.id, null, 'submit', null, user.id); }
    done('success', `Pencairan ${esc(s.name)} diajukan (netto ${h.rp(calc.net)})${init.step ? `, menunggu "${esc(init.step.name)}".` : ', langsung berstatus cair.'}`,
      `/disbursement/program/${program.id}/${period.id}`);
  };

  // ---------------------------------------------------------------- detail pencairan
  route('/disbursement/item/:id', ({ id }, q, { user, year }) => {
    const d = DB.byId('disbursements', id);
    const pa = d && DB.byId('participants', d.participant_id);
    if (!d || DB.byId('programs', pa.program_id).year !== year || !inScope(user, store(pa.customer_id))) fail('Pencairan tidak ditemukan');
    const program = E.loadProgram(pa.program_id);
    const period = program.periods.find((x) => x.id === d.period_id);
    const pc = program.channels.find((c) => c.id === pa.program_channel_id);
    const s = store(pa.customer_id);
    const step = program.steps.find((x) => x.id === d.current_step_id);
    const canAct = d.status === 'in_review' && step && step.role === user.role;
    const canEdit = d.status === 'returned' && canSubmit(user, program);
    const lmRows = program.leadMeasures.filter((lm) => lm.params[pa.class_id]);
    const by = DB.byId('users', d.submitted_by) || {};
    const stat = (l, v) => `<div class="col-4"><div class="stat bg-light rounded"><div class="label">${l}</div><div class="value">${v}</div></div></div>`;
    return {
      title: `Pencairan ${s.name}`, html: `
      <div class="page-head"><div>
        <div class="small text-muted"><a href="#/disbursement">Pencairan</a> / <a href="#/disbursement/program/${program.id}/${period.id}">${esc(program.name)} · ${esc(period.name)}</a></div>
        <h1>${esc(s.name)} ${h.badge(d.status)}</h1>
        <div class="sub">${pa.customer_id} · ${esc(pc.channel_name)} · DC ${s.dc_code} · kelas ${h.cls(pa.class_name)} · diajukan ${esc(by.name)} ${h.datetime(d.created_at)}</div></div>
        ${canEdit ? `<a href="#/disbursement/program/${program.id}/${period.id}/participant/${pa.id}" class="btn btn-brand"><i class="bi bi-pencil"></i> Revisi & kirim ulang</a>` : ''}</div>
      <div class="row g-3"><div class="col-lg-8">
        ${canAct ? UI.approvalBox('disbursements', d.id, step, `/disbursement/item/${d.id}`) : ''}
        <div class="card mb-3"><div class="card-header">Rincian hitungan</div><div class="card-body">
          <div class="row g-3 mb-3">${stat('Target', h.rpShort(d.target))}${stat('Aktual', h.rpShort(d.actual))}${stat('Pencapaian', h.pct(d.achievement_pct))}</div>
          <table class="table table-sm table-bordered">${d.breakdown.map((l) => `<tr><td>${esc(l.name)}<div class="small text-muted">${esc(l.detail)}</div></td><td class="num">${h.rp(l.amount)}</td></tr>`).join('')}
            <tr class="fw-semibold"><td>Bruto</td><td class="num">${h.rp(d.gross_amount)}</td></tr>
            <tr><td>Pajak ${d.tax_rate}% (${d.payee.npwp_no ? 'NPWP' : 'non-NPWP'})</td><td class="num">-${h.rp(d.tax_amount)}</td></tr>
            <tr class="fw-bold fs-5 text-brand"><td>Netto dibayarkan</td><td class="num">${h.rp(d.net_amount)}</td></tr></table>
          <div class="small text-muted">Angka dibekukan saat pengajuan, sesuai setup program & data sell out saat itu.</div></div></div>
        <div class="card mb-3"><div class="card-header">Realisasi JTBD</div><div class="card-body p-0"><table class="table table-sm mb-0">
          <thead><tr><th>Pilar · JTBD</th><th>Lead measure</th><th>Target</th><th>Realisasi</th><th></th></tr></thead>
          <tbody>${lmRows.map((lm) => { const prm = lm.params[pa.class_id]; const v = d.lm_values[lm.id];
            return `<tr><td class="small text-muted">${esc(lm.pillar_name)} · ${esc(lm.jtbd_name)}</td><td>${esc(lm.name)}</td><td>${esc(prm.target_value)} <span class="small text-muted">${esc(lm.unit || '')}</span></td>
              <td>${esc(v || '-')}</td><td>${E.lmAchieved(lm, prm, v) ? '<i class="bi bi-check-circle-fill lm-ok"></i>' : '<i class="bi bi-dash-circle lm-no"></i>'}</td></tr>`; }).join('')
            || '<tr><td colspan="5" class="text-muted p-3">Tidak ada lead measure.</td></tr>'}</tbody></table></div></div>
        <div class="card"><div class="card-header">Data pencairan</div><div class="card-body"><dl class="row mb-0">
          <dt class="col-sm-4">NPWP</dt><dd class="col-sm-8">${esc(d.payee.npwp_no || '-')} ${d.payee.npwp_name ? '· ' + esc(d.payee.npwp_name) : ''}</dd>
          <dt class="col-sm-4">Rekening</dt><dd class="col-sm-8">${esc(d.payee.bank_name)} ${esc(d.payee.bank_account_no)} a.n. ${esc(d.payee.bank_account_name)}</dd>
          ${E.fieldsFor(program, 'disbursement', pc.id).map((f) => `<dt class="col-sm-4">${esc(f.label)}</dt><dd class="col-sm-8">${esc(d.data[f.key] !== undefined ? d.data[f.key] : '-')}</dd>`).join('')}
        </dl></div></div>
      </div><div class="col-lg-4"><div class="card"><div class="card-header">Riwayat</div><div class="card-body">${UI.logHtml('disbursement', d.id)}</div></div></div></div>`,
    };
  });
})();
