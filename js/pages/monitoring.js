// Monitoring: CBD/CDT mengisi form Monitoring (evidence per lead measure, catatan) per periode monitoring.
// Evidence yang disetujui = kepatuhan pilar → dasar Fix Rebate.
(function () {
  const { h, route, actions, done, fail, inScope, store } = UI;
  const { esc } = h;
  const E = window.Engine;
  const C = window.Catalog;

  function ctxOf(reg) {
    const program = E.loadProgram(reg.program_id);
    return { program, ch: program.channels.find((c) => c.id === reg.program_channel_id) };
  }

  route('/monitoring', ({}, q, { user, year }) => {
    const programs = DB.where('programs', (p) => p.year === year && p.status !== 'DRAFT').map((p) => E.loadProgram(p.id));
    return {
      title: 'Monitoring', html: `<div class="page-head"><div><h1>Monitoring ${year}</h1><div class="sub">Evidence per lead measure untuk peserta yang registrasinya sudah disetujui. Frekuensi mengikuti setup channel.</div></div></div>
      ${programs.map((p) => p.channels.map((ch) => {
        const regs = DB.where('registrations', (r) => r.program_channel_id === ch.id && r.status === 'approved' && inScope(user, store(r.customer_id)));
        if (!regs.length) return '';
        const pers = E.periodsOf(p.period_start, p.period_end, ch.monitoring_frequency);
        return `<div class="card mb-3"><div class="card-header">${esc(p.name)} · ${esc(ch.channel_name)}&nbsp;<span class="small text-muted fw-normal">· ${C.FREQUENCIES[ch.monitoring_frequency]} · ${ch.leadMeasures.length} lead measure ${esc(ch.pillar_framework_name || '')}</span></div>
          <div class="table-responsive"><table class="table table-sm table-bordered mb-0"><thead><tr><th>Toko</th>${pers.map((x) => `<th>${esc(x.label)}</th>`).join('')}</tr></thead><tbody>
          ${regs.map((r) => `<tr><td><a href="#/registration/participant/${r.id}" class="fw-semibold">${esc(store(r.customer_id).name)}</a><div class="small text-muted">${r.customer_id}</div></td>
            ${pers.map((per) => { const m = DB.t('monitorings').find((x) => x.registration_id === r.id && x.period_key === per.key);
              if (m && m.status !== 'returned') return `<td><a href="#/monitoring/item/${m.id}">${h.badge(m.status)}</a><div class="small text-muted">${Object.keys(m.evidence || {}).length}/${ch.leadMeasures.length} evidence</div></td>`;
              return `<td>${user.role === 'CBD' ? `<a class="btn btn-sm ${m ? 'btn-outline-info' : 'btn-outline-brand'}" href="#/monitoring/form/${r.id}/${per.key}">${m ? 'Revisi' : 'Isi'}</a>` : '<span class="text-muted small">belum</span>'}</td>`; }).join('')}</tr>`).join('')}
          </tbody></table></div></div>`;
      }).join('')).join('') || '<div class="card"><div class="card-body text-muted">Belum ada peserta yang disetujui dalam scope Anda.</div></div>'}`,
    };
  });

  route('/monitoring/form/:reg/:per', ({ reg: rid, per: key }, q, { user, year, path }) => {
    UI.requireRole('CBD');
    const reg = DB.byId('registrations', rid);
    if (!reg || reg.status !== 'approved' || !inScope(user, store(reg.customer_id))) fail('Peserta tidak ditemukan');
    const { program, ch } = ctxOf(reg);
    if (program.year !== year) fail('Peserta tidak ditemukan');
    const per = E.periodsOf(program.period_start, program.period_end, ch.monitoring_frequency).find((x) => x.key === key);
    if (!per) fail('Periode tidak ditemukan');
    const ex = DB.t('monitorings').find((x) => x.registration_id === reg.id && x.period_key === key);
    if (ex && ex.status !== 'returned') UI.redirect(`/monitoring/item/${ex.id}`);
    const pend = UI.takePending(path);
    const fields = ch.phases.MONITORING.fields.filter((f) => f.is_visible);
    const lmFields = fields.filter((f) => f.repeat_per === 'LEAD_MEASURE');
    const other = fields.filter((f) => f.repeat_per === 'NONE');
    const s = store(reg.customer_id);
    return {
      title: `Monitoring ${s.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/monitoring">Monitoring</a> / ${esc(program.name)} · ${esc(ch.channel_name)}</div>
        <h1>Monitoring ${esc(per.label)} · ${esc(s.name)}</h1><div class="sub">${h.date(per.start)} – ${h.date(per.end)}</div></div></div>
      ${UI.errorsHtml(pend && pend.errors)}
      <form data-action="mon.submit" data-reg="${reg.id}" data-per="${per.key}">
      <div class="card mb-3"><div class="card-header">${esc(ch.pillar_framework_name || 'Pilar')} — evidence per lead measure</div><div class="table-responsive"><table class="table table-sm mb-0">
        <thead><tr><th>Pilar · JTBD</th><th>Lead measure</th>${lmFields.map((f) => `<th>${esc(f.label)}${f.is_required ? ' <span class="text-danger">*</span>' : ''}</th>`).join('')}</tr></thead>
        <tbody>${ch.leadMeasures.map((l) => `<tr><td class="small text-muted">${esc(l.pillar_name)}<br>${esc(l.jtbd_name)}</td>
          <td>${esc(l.name)}<div class="small text-muted">${esc(l.description || '')}${l.unit ? ` · ${esc(l.unit)}` : ''}</div></td>
          ${lmFields.map((f) => `<td style="min-width:240px">${UI.fieldInput(f, f.field_key === 'evidence_upload' ? (ex ? (ex.evidence || {})[l.id] : '') : ex ? ((ex.data.lm || {})[l.id] || {})[f.field_key] : '', { prefix: `lm_${l.id}_`, bare: true })}</td>`).join('')}</tr>`).join('')
          || '<tr><td colspan="3" class="text-muted">Channel belum punya lead measure.</td></tr>'}</tbody></table></div></div>
      <div class="row g-3"><div class="col-lg-7"><div class="card"><div class="card-body">
        ${other.map((f) => UI.fieldInput(f, ex ? ex.data[f.field_key] : '')).join('') || '<span class="small text-muted">Tidak ada field lain.</span>'}
        ${ex ? '<div class="mb-3"><label class="form-label">Catatan revisi</label><textarea name="note" class="form-control" rows="2"></textarea></div>' : ''}
      </div></div></div>
      <div class="col-lg-5"><div class="card"><div class="card-header">Approval Monitoring</div><div class="card-body">${UI.layerPath(ch.phases.MONITORING.layers)}
        <div class="small text-muted mt-2">Prototype menyimpan nama file saja.</div>
        <button class="btn btn-brand w-100 mt-3"><i class="bi bi-send"></i> ${ex ? 'Kirim ulang' : 'Ajukan monitoring'}</button></div></div></div></div></form>`,
    };
  });

  actions['mon.submit'] = (f, form) => {
    const user = UI.currentUser();
    const reg = DB.byId('registrations', form.dataset.reg);
    const { program, ch } = ctxOf(reg);
    const per = E.periodsOf(program.period_start, program.period_end, ch.monitoring_frequency).find((x) => x.key === form.dataset.per);
    const fields = ch.phases.MONITORING.fields.filter((x) => x.is_visible);
    const errors = []; const evidence = {}; const lmData = {};
    for (const l of ch.leadMeasures) {
      const { values, errors: errs } = UI.readFieldValues(fields.filter((x) => x.repeat_per === 'LEAD_MEASURE'), (k) => f.get(k), (k) => f.file(k), `lm_${l.id}_`);
      errs.forEach((e) => errors.push(`${l.name}: ${e}`));
      if (values.evidence_upload) evidence[l.id] = values.evidence_upload;
      const rest = Object.fromEntries(Object.entries(values).filter(([k]) => k !== 'evidence_upload'));
      if (Object.keys(rest).length) lmData[l.id] = rest;
    }
    const { values: data, errors: e2 } = UI.readFieldValues(fields.filter((x) => x.repeat_per === 'NONE'), (k) => f.get(k), (k) => f.file(k));
    errors.push(...e2);
    if (errors.length) { UI.retry(errors.slice(0, 12), f); return; }
    data.lm = lmData;
    const ex = DB.t('monitorings').find((x) => x.registration_id === reg.id && x.period_key === per.key);
    const now = new Date().toISOString();
    const row = { evidence, data, approval_objects: E.monitoringObjects(ch, reg, evidence, per), updated_at: now };
    const mon = ex ? Object.assign(ex, row) : DB.insert('monitorings', Object.assign({ registration_id: reg.id, period_key: per.key, period_label: per.label, start: per.start, end: per.end,
      status: 'in_review', current_layer_id: null, submitted_by: user.id, created_at: now }, row));
    const next = E.submit('monitoring', mon, user.id, !!ex, f.get('note'));
    done('success', `Monitoring ${esc(per.label)} diajukan (${Object.keys(evidence).length}/${ch.leadMeasures.length} evidence). ${next ? `Menunggu ${esc(C.APPROVAL_ROLES[next.role_code])}.` : 'Langsung disetujui.'}`, `/monitoring/item/${mon.id}`);
  };

  route('/monitoring/item/:id', ({ id }, q, { user, year }) => {
    const m = DB.byId('monitorings', id);
    const reg = m && DB.byId('registrations', m.registration_id);
    if (!m || !inScope(user, store(reg.customer_id))) fail('Monitoring tidak ditemukan');
    const { program, ch } = ctxOf(reg);
    if (program.year !== year) fail('Monitoring tidak ditemukan');
    const layer = E.currentLayer(m);
    const canAct = m.status === 'in_review' && layer && layer.role_code === user.role;
    const s = store(reg.customer_id);
    const comp = E.pillarCompliance(ch, reg.id, m.start, m.end);
    return {
      title: `Monitoring ${s.name}`, html: `
      <div class="page-head"><div><div class="small text-muted"><a href="#/monitoring">Monitoring</a> / <a href="#/registration/participant/${reg.id}">${esc(s.name)}</a></div>
        <h1>Monitoring ${esc(m.period_label)} ${h.badge(m.status)}</h1><div class="sub">${esc(program.name)} · ${esc(ch.channel_name)} · ${h.date(m.start)} – ${h.date(m.end)}</div></div>
        ${m.status === 'returned' && user.role === 'CBD' ? `<a href="#/monitoring/form/${reg.id}/${m.period_key}" class="btn btn-brand"><i class="bi bi-pencil"></i> Revisi</a>` : ''}</div>
      <div class="row g-3"><div class="col-lg-8">
        ${canAct ? UI.approvalBox('monitoring', m.id, layer, `/monitoring/item/${m.id}`) : ''}
        <div class="card mb-3"><div class="card-header">Evidence</div><div class="table-responsive"><table class="table table-sm mb-0">
          <thead><tr><th>Pilar</th><th>Lead measure</th><th>Evidence</th></tr></thead>
          <tbody>${ch.leadMeasures.map((l) => `<tr><td class="small text-muted">${esc(l.pillar_name)}</td><td>${esc(l.name)}<div class="small text-muted">${esc(l.description || '')}</div></td>
            <td>${(m.evidence || {})[l.id] ? `<i class="bi bi-paperclip lm-ok"></i> ${esc(m.evidence[l.id])}` : '<i class="bi bi-dash-circle lm-no"></i> <span class="small text-muted">tidak ada</span>'}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><div class="card-header">Kepatuhan pilar periode ini <span class="small text-muted fw-normal">&nbsp;(hanya monitoring yang disetujui)</span></div><div class="card-body small">
          ${ch.pillars.map((pl, i) => `<div class="d-flex justify-content-between"><span>${esc(pl.name)} <span class="text-muted">bobot ${pl.weight_pct || 0}%</span></span><strong>${h.pct(comp[i] * 100, 0)}</strong></div>`).join('')}</div></div>
      </div>
      <div class="col-lg-4"><div class="card mb-3"><div class="card-header">Jalur approval</div><div class="card-body">${UI.layerPath(ch.phases.MONITORING.layers, 'monitoring', m)}</div></div>
        <div class="card"><div class="card-header">Riwayat</div><div class="card-body">${UI.logHtml('monitoring', m.id)}</div></div></div></div>`,
    };
  });
})();
