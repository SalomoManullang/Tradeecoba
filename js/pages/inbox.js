// Inbox approval: data Registration / Monitoring / Payout yang sedang menunggu di layer milik role user.
// Layer, role, dan auto-approve dibaca dari konfigurasi fase tiap channel.
(function () {
  const { h, route, actions, done, flash, store } = UI;
  const { esc } = h;
  const E = window.Engine;
  const C = window.Catalog;

  const DETAIL = { registration: (id) => `/registration/participant/${id}`, monitoring: (id) => `/monitoring/item/${id}`, payout: (id) => `/payout/item/${id}` };
  const regOf = (entity, rec) => (entity === 'registration' ? rec : DB.byId('registrations', rec.registration_id));

  route('/inbox', ({}, q, { user, year }) => {
    const pend = UI.pendingFor(user, year);
    const chName = (r) => (DB.t('channels').find((c) => c.code === store(r.customer_id).channel_code) || {}).name;
    const section = (entity, title, cols, cells) => {
      const list = pend[entity];
      return `<div class="card mb-4"><div class="card-header">${title}&nbsp;<span class="badge badge-secondary">${list.length}</span></div>
        ${list.length ? `<form data-action="inbox.bulk" data-entity="${entity}"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0 table-wide has-check">
          <thead><tr><th><input type="checkbox" class="form-check-input" data-check-all="ids_${entity}"></th><th>Toko</th>${cols.map((c) => `<th>${c}</th>`).join('')}<th>Layer</th><th></th></tr></thead>
          <tbody>${list.map((rec) => { const r = regOf(entity, rec); const s = store(r.customer_id); const l = E.currentLayer(rec);
            return `<tr><td><input type="checkbox" class="form-check-input" name="ids_${entity}" value="${rec.id}"></td>
              <td><span class="fw-semibold">${esc(s.name)}</span><div class="small text-muted">${r.customer_id} · ${esc(chName(r))}</div></td>${cells(rec, r).map((c) => `<td class="small">${c}</td>`).join('')}
              <td class="small">${l.layer_order}. ${esc(C.APPROVAL_ROLES[l.role_code])}${l.is_final ? ' · final' : ''}</td>
              <td class="text-right"><a href="#${DETAIL[entity](rec.id)}" class="btn btn-sm btn-outline-brand">Review</a></td></tr>`; }).join('')}</tbody></table></div>
          <div class="card-body border-top d-flex gap-2"><input name="note" class="form-control form-control-sm" style="max-width:360px" placeholder="Catatan (opsional)">
            <button class="btn btn-sm btn-success" data-confirm="Setujui semua yang dicentang?"><i class="bi bi-check2-all"></i> Setujui yang dicentang</button></div></form>`
          : '<div class="card-body text-muted">Tidak ada yang menunggu Anda.</div>'}</div>`;
    };
    const bName = (code) => (DB.t('brands').find((b) => b.code === code) || {}).name || code;
    return {
      title: 'Inbox Approval', html: `
      <div class="page-head"><div><h1>Inbox Approval</h1><div class="sub">Menunggu di layer milik <strong>${h.ROLE_LABEL[user.role]}</strong>. Layer yang kondisinya terpenuhi sudah dilewati otomatis.</div></div></div>
      ${section('registration', 'Registration', ['Program', 'Brand · growth · total rebate'], (rec) => [esc(DB.byId('programs', rec.program_id).code),
        rec.brands.map((b) => `<span class="mr-2 text-nowrap">${esc(bName(b.brand_code))} ${b.growth_pct}% · ${b.total_pct}%</span>`).join('')])}
      ${section('monitoring', 'Monitoring', ['Periode', 'Evidence'], (rec, r) => { const ch = E.loadProgram(r.program_id).channels.find((c) => c.id === r.program_channel_id);
        return [esc(rec.period_label), `${Object.keys(rec.evidence || {}).length} / ${ch.leadMeasures.length} lead measure`]; })}
      ${section('payout', 'Payout', ['Komponen · periode', 'Nominal'], (rec) => [`${rec.component === 'CONDITIONAL' ? 'Conditional' : 'Fix'} · ${esc(rec.period_label)}`, `<strong>${h.rp(rec.amount)}</strong>`])}`,
    };
  });

  function actOne(entity, id, action, note) {
    const user = UI.currentUser();
    const rec = DB.byId(E.TABLE[entity], id);
    if (!rec || !UI.inScope(user, store(regOf(entity, rec).customer_id))) throw new Error('Data tidak ditemukan');
    return E.act(entity, rec, action, user, note);
  }

  actions['inbox.act'] = (f, form) => {
    const action = f.get('action');
    try {
      const r = actOne(form.dataset.entity, Number(form.dataset.id), action, f.get('note'));
      const label = { approve: 'disetujui', reject: 'ditolak', return: 'dikembalikan untuk revisi' }[action];
      const rec = DB.byId(E.TABLE[form.dataset.entity], form.dataset.id);
      done('success', `Data ${label}.${r.next ? ` Lanjut ke layer ${r.next.layer_order} · ${esc(C.APPROVAL_ROLES[r.next.role_code])}.` : action === 'approve' ? ` Fase selesai (${h.STATUS[rec.status][0]}).` : ''}`, form.dataset.back);
    } catch (e) {
      flash('danger', esc(e.message)); UI.render();
    }
  };

  actions['inbox.bulk'] = (f, form) => {
    const entity = form.dataset.entity;
    const ids = f.all('ids_' + entity).map(Number);
    if (!ids.length) throw new Error('Belum ada data yang dicentang.');
    let ok = 0; const errs = [];
    for (const id of ids) { try { actOne(entity, id, 'approve', f.get('note')); ok++; } catch (e) { errs.push(`#${id}: ${e.message}`); } }
    done(errs.length ? 'warning' : 'success', `${ok} data disetujui.${errs.length ? '<br>' + errs.map(esc).join('<br>') : ''}`, '/inbox');
  };
})();
