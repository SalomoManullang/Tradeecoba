// Program Setup bagian 3 (deck Loyalti Program 2027), per channel:
// Pendaftaran — skema kelas & rentang baseline (kelas dari baseline) · aturan benefit, batas total & exception per channel
// Pencairan — termin & conditional rebate (semester + yearly benefit) · Monitoring — kerangka (menyusul)
// Data di programChannels.setup (js/setup-model.js); simpan sebagian selalu boleh, validasi lengkap saat publish fase.
(function () {
  const { h, route, actions, done } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;
  const C = window.Catalog;
  const SM = window.SetupModel;
  const { getProgram, getChannel, nav, assertDraft, touch, fs, editable, confirmTag, soonTag } = window.SetupShared;
  const nv = (v) => (v === null || v === undefined ? '' : v);
  const pct = SM.fmtPct;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const JUTA = 1e6;

  // Ubah pc.setup di bawah kunci fase; before/after dicatat di audit log
  function saveSetup(pid, pcId, phase, entity, mutate) {
    assertDraft(pid, pcId, phase);
    const pc = DB.byId('programChannels', pcId);
    const st = SM.setupOf(pc);
    const before = clone(st);
    const after = mutate(st, pc);
    pc.setup = st;
    touch(pid);
    E.audit(pid, 'programChannel', pcId, entity, after ? after(before) : null, after ? after(st) : null);
    return st;
  }
  const brandsOf = (pcId) => DB.where('programChannelBrands', (x) => x.program_channel_id === pcId);
  const pctIn = (name, v, extra = '') => `<div class="input-group input-group-sm"><input name="${name}" type="number" step="any" class="form-control" value="${nv(v)}" ${extra}><span class="input-group-text">%</span></div>`;

  // Halaman yang dihapus: sub-channel & role (diganti channel Active / Passive), target growth (kelas dari baseline),
  // Vision Compass (dicakup Pilar & saran lead measure). Link lama diarahkan ke halaman penggantinya.
  route('/setup/:id/ch/:pc/subchannels', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/eligibility`));
  route('/setup/:id/ch/:pc/growth', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/scheme`));
  route('/setup/:id/ch/:pc/vc', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/pillars`));

  // ---------------------------------------------------------------- Pendaftaran · skema kelas per brand (kelas + rentang baseline + tier + rebate)
  // Satu tab per brand. Brand boleh mengikuti seluruh skema brand lain (tab-nya tampil read-only).
  const issuesOf = (st, code) => {
    const r = SM.brandRanges(st, code).filter((x) => x.min !== null);
    const out = [];
    for (const x of r) if (x.max !== null && x.max <= x.min) out.push(`kelas ${x.code}: rentang baseline terbalik`);
    if (r.filter((x) => x.max === null).length > 1) out.push('lebih dari satu kelas tanpa batas atas');
    const sorted = r.slice().sort((a, b) => a.min - b.min);
    for (let i = 1; i < sorted.length; i++) if (sorted[i - 1].max === null || sorted[i - 1].max > sorted[i].min) out.push(`rentang baseline kelas ${sorted[i - 1].code} & ${sorted[i].code} tumpang tindih`);
    for (const c of SM.schemeOf(st, code).classes) out.push(...SM.growthIssues(c));
    return out;
  };
  route('/setup/:id/ch/:pc/scheme', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    if (ch.brands.length) UI.redirect(`/setup/${p.id}/ch/${ch.id}/scheme/${ch.brands[0].brand_code}`);
    return { title: `Skema kelas · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'scheme')}
      <div class="card"><div class="card-body text-muted small">Belum ada brand. Pilih di <a href="#/setup/${p.id}/ch/${ch.id}/brands">Brand</a>.</div></div></div></div>` };
  });
  route('/setup/:id/ch/:pc/scheme/:b', ({ id, pc, b }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const brand = ch.brands.find((x) => x.brand_code === b);
    if (!brand) UI.redirect(`/setup/${p.id}/ch/${ch.id}/scheme`);
    const st = SM.setupOf(ch);
    const nameOf = Object.fromEntries(ch.brands.map((x) => [x.brand_code, x.brand_name]));
    const follow = (st.scheme_follow || {})[b] || '';
    const followers = ch.brands.filter((x) => (st.scheme_follow || {})[x.brand_code] === b).map((x) => x.brand_name);
    // brand acuan: brand lain di channel ini yang punya skema sendiri
    const refs = ch.brands.filter((x) => x.brand_code !== b && !(st.scheme_follow || {})[x.brand_code]);
    const own = SM.schemeOf(Object.assign({}, st, { scheme_follow: {} }), b).classes;
    const iss = follow ? [] : issuesOf(st, b);
    const tabs = `<div class="loop-lane inner mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Skema kelas setiap brand</div>
      <div class="d-flex flex-wrap gap-2 align-items-center">${ch.brands.map((x) => { const f = (st.scheme_follow || {})[x.brand_code];
        return `<a class="btn btn-sm ${x.brand_code === b ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/scheme/${x.brand_code}">${esc(x.brand_name)}
          <span class="badge badge-light">${f ? `ikut ${esc(nameOf[f] || f)}` : `${SM.schemeOf(st, x.brand_code).classes.length} kelas`}</span></a>`; }).join('')}</div></div>`;
    return {
      title: `Skema kelas · ${brand.brand_name} · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'scheme')}
      ${tabs}
      <form data-action="setup.saveScheme" data-id="${p.id}" data-pc="${ch.id}" data-brand="${esc(b)}"><fieldset ${fs(p, ch, 'REGISTRATION')}><input type="hidden" name="classes" id="clsJson">
      <div class="card"><div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-layers"></i>&nbsp;Skema kelas — ${esc(brand.brand_name)}${brand.member_names && brand.member_names.length ? ` <span class="small text-muted fw-normal">+ ${esc(brand.member_names.join(', '))}</span>` : ''}</span>
        <button type="button" class="btn btn-sm btn-outline-brand" id="addCls"><i class="bi bi-plus"></i> Kelas</button></div><div class="card-body">
        <div class="row g-2 align-items-end mb-3"><div class="col-md-5"><label class="form-label">Skema brand ini</label>
          <select name="follow" id="follow" class="form-control" ${followers.length ? 'disabled' : ''}><option value="">Skema sendiri</option>
            ${refs.map((x) => `<option value="${x.brand_code}" ${sel(follow === x.brand_code)}>Ikuti skema ${esc(x.brand_name)}</option>`).join('')}</select></div>
          <div class="col-md-7 small text-muted">${followers.length ? `Skema ini diikuti ${esc(followers.join(', '))}, jadi brand ini tidak bisa mengikuti brand lain.`
            : 'Mengikuti brand lain = kelas, tier, rebate, Vision Compass, dan rentang baseline brand acuan dipakai seluruhnya.'}</div></div>
        <div id="followNote"></div>
        ${iss.length ? `<div class="alert alert-danger py-2 small">${esc(iss.join('; '))}. Diblokir saat publish Pendaftaran.</div>` : ''}
        <div class="small text-muted mb-2">Kelas toko ditentukan dari baseline: baseline ≥ min dan &lt; maks masuk kelas itu (Rp juta / bulan; batas atas boleh kosong). <strong>Growth</strong> = target growth tier (step kelipatan 5%, naik per tier); target 2027 = baseline × 12 × (1 + growth). <strong>Total conditional = semester rebate + yearly rebate</strong> (dihitung, tidak diisi).</div>
        <div class="d-flex justify-content-end mb-1"><span class="cps-cls-all small text-brand" role="button" tabindex="0" id="clsAll">Ringkas semua kelas</span></div>
        <div class="table-responsive"><table class="table table-sm scheme-table mb-2"><thead><tr><th style="width:100px">Kelas</th><th style="width:230px">Baseline / bulan <span class="text-muted fw-normal">Rp juta, min – maks</span></th>
          <th style="width:80px">Tier</th><th style="width:120px">Growth</th><th>Semester rebate</th><th>Yearly rebate</th><th class="num">Total conditional</th><th>Total Vision Compass</th><th></th></tr></thead><tbody id="clsRows"></tbody></table></div>
        <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan skema ${esc(brand.brand_name)}</button>
      </div></div></fieldset></form></div></div>`,
      after(root) {
        const ro = !editable(p, ch, 'REGISTRATION');
        const juta = (v) => (v === null || v === undefined || v === '' ? null : v / JUTA);
        // state = skema sendiri (nilai baseline dalam Rp juta); brand acuan ditampilkan read-only
        const toState = (cls) => clone(cls).map((c) => ({ code: c.code, orig: c.code, min: juta(c.min), max: juta(c.max), vc_pct: c.vc_pct, tiers: c.tiers }));
        const state = toState(own);
        const box = root.querySelector('#clsRows'); const sel2 = root.querySelector('#follow');
        const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
        const inp = (ci, ti, k, v, unit) => `<div class="input-group input-group-sm"><input type="number" step="any" min="0" class="form-control" data-c="${ci}" ${ti === null ? '' : `data-t="${ti}"`} data-k="${k}" value="${nv(v)}" ${k === 'max' ? 'placeholder="∞"' : k === 'min' ? 'placeholder="min"' : ''}>${unit ? `<span class="input-group-text">${unit}</span>` : ''}</div>`;
        // Kelas terbuka: kelas baru & kelas yang bermasalah; sisanya cukup baris ringkasan
        const open = new Set(state.map((c, ci) => ci)); // semua kelas terbuka; baris kelas bisa diklik untuk diringkas
        const rangeText = (c) => (c.min === null ? '<span class="text-danger">baseline min kosong</span>' : c.max === null ? `≥ Rp ${fmtNum(c.min, 1)} jt` : `Rp ${fmtNum(c.min, 1)} – ${fmtNum(c.max, 1)} jt`);
        const sumCells = (c, ci) => `<td class="cls-cell"><span class="cps-cls-tg" role="button" tabindex="0" data-tg="${ci}"><i class="bi bi-chevron-${open.has(ci) ? 'down' : 'right'}"></i> <strong>${h.esc(c.code || 'Kelas baru')}</strong></span></td>
          <td class="small">${rangeText(c)}</td>
          <td colspan="5" class="small text-muted">${c.tiers.length ? `${c.tiers.length} tier` : '<span class="text-danger">Belum ada tier</span>'}${open.has(ci) ? '' : ' · klik untuk membuka'}</td>
          <td class="small">${c.vc_pct === null || c.vc_pct === undefined || c.vc_pct === '' ? '-' : pct(n(c.vc_pct))}</td>
          <td></td>`;
        function draw() {
          const ref = sel2.value;
          const rows = ref ? toState(SM.schemeOf(st, ref).classes) : state;
          root.querySelector('#followNote').innerHTML = ref ? `<div class="alert alert-info py-2 small">Mengikuti skema <strong>${h.esc(nameOf[ref] || ref)}</strong> (read-only). Ubah di <a href="#/setup/${p.id}/ch/${ch.id}/scheme/${ref}">tab ${h.esc(nameOf[ref] || ref)}</a>.</div>` : '';
          box.innerHTML = rows.map((c, ci) => {
            const span = Math.max(1, c.tiers.length);
            const head = `<td rowspan="${span}" class="cls-cell"><input class="form-control form-control-sm fw-semibold" data-c="${ci}" data-k="code" value="${h.esc(c.code)}" placeholder="Kode"></td>
              <td rowspan="${span}"><div class="d-flex gap-1 align-items-center base-rng">${inp(ci, null, 'min', c.min)}${inp(ci, null, 'max', c.max)}</div></td>`;
            const tail = `<td rowspan="${span}">${inp(ci, null, 'vc_pct', c.vc_pct, '%')}</td>
              <td rowspan="${span}" class="text-right text-nowrap"><button type="button" class="btn btn-sm btn-light" data-act="addTier" data-c="${ci}" title="Tambah tier"><i class="bi bi-plus"></i> Tier</button>
                <button type="button" class="btn btn-sm btn-light text-danger" data-act="delCls" data-c="${ci}" title="Hapus kelas"><i class="bi bi-trash"></i></button></td>`;
            const hid = open.has(ci) ? '' : 'hidden';
            const sum = `<tr class="cps-cls-sum ${open.has(ci) ? 'is-open' : ''}" data-sum="${ci}" data-tg="${ci}" title="${open.has(ci) ? 'Klik untuk meringkas' : 'Klik untuk membuka'}">${sumCells(c, ci)}</tr>`;
            if (!c.tiers.length) return `${sum}<tr class="cls-first cps-cls-detail" ${hid}>${head}<td colspan="5" class="text-danger small">Belum ada tier.</td>${tail}</tr>`;
            return sum + c.tiers.map((t, ti) => `<tr class="cps-cls-detail ${ti === 0 ? 'cls-first' : ''}" ${hid}>${ti === 0 ? head : ''}
              <td class="text-nowrap">Tier ${ti + 1} <button type="button" class="btn btn-sm btn-link text-danger p-0" data-act="delTier" data-c="${ci}" data-t="${ti}" title="Hapus tier"><i class="bi bi-x"></i></button></td>
              <td>${inp(ci, ti, 'growth_pct', t.growth_pct, '%')}</td><td>${inp(ci, ti, 'semester_pct', t.semester_pct, '%')}</td><td>${inp(ci, ti, 'yearly_pct', t.yearly_pct, '%')}</td>
              <td class="num fw-semibold" data-total="${ci}-${ti}">${pct(SM.tierTotal(t))}</td>${ti === 0 ? tail : ''}</tr>`).join('');
          }).join('') || '<tr><td colspan="9" class="text-muted small">Belum ada kelas.</td></tr>';
          if (ro || ref) box.querySelectorAll('input,button').forEach((x) => { x.disabled = true; });
          const tb = root.querySelector('#clsAll');
          if (tb) tb.textContent = rows.length && rows.every((c, ci) => open.has(ci)) ? 'Ringkas semua kelas' : 'Buka semua kelas';
          root.querySelector('#addCls').disabled = ro || !!ref;
        }
        box.addEventListener('input', (e) => {
          const x = e.target; const ci = x.dataset.c; const k = x.dataset.k; if (ci === undefined || !k || sel2.value) return;
          const tgt = x.dataset.t === undefined ? state[ci] : state[ci].tiers[x.dataset.t];
          tgt[k] = k === 'code' ? x.value.trim().toUpperCase() : n(x.value);
          if (x.dataset.t !== undefined) box.querySelector(`[data-total="${ci}-${x.dataset.t}"]`).textContent = pct(SM.tierTotal(tgt));
          const sr = box.querySelector(`[data-sum="${ci}"]`);
          if (sr) sr.innerHTML = sumCells(state[ci], Number(ci));
        });
        const toggleCls = (ci) => { if (open.has(ci)) open.delete(ci); else open.add(ci); draw(); };
        box.addEventListener('click', (e) => { const t = e.target.closest('[data-tg]'); if (t) toggleCls(Number(t.dataset.tg)); });
        box.addEventListener('keydown', (e) => { const t = e.target.closest('[data-tg]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggleCls(Number(t.dataset.tg)); } });
        root.querySelector('#clsAll').addEventListener('click', () => {
          const total = (sel2.value ? SM.schemeOf(st, sel2.value).classes : state).length;
          const all = total && [...Array(total).keys()].every((i) => open.has(i));
          open.clear(); if (!all) for (let i = 0; i < total; i++) open.add(i);
          draw();
        });
        box.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-act]'); if (!btn || sel2.value) return;
          const c = state[btn.dataset.c];
          if (btn.dataset.act === 'addTier') {
            const last = c.tiers[c.tiers.length - 1] || {};
            c.tiers.push({ growth_pct: n(last.growth_pct) === null ? null : n(last.growth_pct) + 5, semester_pct: nv(last.semester_pct) === '' ? null : last.semester_pct, yearly_pct: null }); // step kelipatan 5%
          }
          if (btn.dataset.act === 'delTier') c.tiers.splice(Number(btn.dataset.t), 1);
          if (btn.dataset.act === 'delCls') {
            const ci = Number(btn.dataset.c);
            state.splice(ci, 1);
            const moved = [...open].filter((i) => i !== ci).map((i) => (i > ci ? i - 1 : i)); open.clear(); moved.forEach((i) => open.add(i));
          }
          draw();
        });
        root.querySelector('#addCls').addEventListener('click', () => {
          const last = state[state.length - 1];
          state.push({ code: '', orig: null, min: last && last.max !== null ? last.max : null, max: null, vc_pct: null, tiers: last ? last.tiers.map((t) => ({ growth_pct: t.growth_pct, semester_pct: null, yearly_pct: null })) : [{ growth_pct: null, semester_pct: null, yearly_pct: null }] });
          open.add(state.length - 1);
          draw();
        });
        sel2.addEventListener('change', draw);
        root.querySelector('#clsJson').closest('form').addEventListener('submit', () => { root.querySelector('#clsJson').value = JSON.stringify(state); }, true);
        draw();
      },
    };
  });
  actions['setup.saveScheme'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const b = form.dataset.brand;
    const input = JSON.parse(f.get('classes') || '[]');
    const codes = brandsOf(pcId).map((x) => x.brand_code);
    if (!codes.includes(b)) throw new Error('Brand bukan peserta channel ini.');
    saveSetup(pid, pcId, 'REGISTRATION', 'scheme', (st) => {
      st.schemes = Object.assign({}, st.schemes); st.scheme_follow = Object.assign({}, st.scheme_follow);
      const ref = f.get('follow') || '';
      const followers = codes.filter((x) => st.scheme_follow[x] === b);
      if (ref) {
        // ikuti seluruh skema brand acuan; skema sendiri brand ini tidak diubah
        if (!codes.includes(ref) || ref === b) throw new Error('Brand acuan tidak dikenal.');
        if (st.scheme_follow[ref]) throw new Error('Brand acuan juga mengikuti brand lain; pilih brand dengan skema sendiri.');
        if (followers.length) throw new Error('Skema brand ini diikuti brand lain, jadi tidak bisa mengikuti brand lain.');
        st.scheme_follow[b] = ref;
        return (s) => ({ brand: b, follow: s.scheme_follow[b] || null });
      }
      delete st.scheme_follow[b];
      const nn = (v, label) => { const x = toNum(v); if (x !== null && x < 0) throw new Error(`${label} tidak boleh negatif.`); return x; };
      const classes = input.map((c) => {
        const code = String(c.code || '').trim().toUpperCase();
        if (!/^[A-Z0-9+_-]{1,10}$/.test(code)) throw new Error(`Kode kelas "${code || '(kosong)'}" tidak valid (huruf/angka, maks 10).`);
        const mn = nn(c.min, 'Baseline'); const mx = nn(c.max, 'Baseline');
        return { code, orig: c.orig, min: mn === null ? null : Math.round(mn * JUTA), max: mx === null ? null : Math.round(mx * JUTA), vc_pct: nn(c.vc_pct, 'Persen'),
          tiers: (c.tiers || []).map((t) => ({ growth_pct: nn(t.growth_pct, 'Growth'), semester_pct: nn(t.semester_pct, 'Persen'), yearly_pct: nn(t.yearly_pct, 'Persen') })) };
      });
      if (new Set(classes.map((c) => c.code)).size !== classes.length) throw new Error('Kode kelas tidak boleh dobel.');
      // kode kelas yang diganti: pindahkan target lead measure brand ini & brand yang mengikutinya ke kode baru
      const ren = Object.fromEntries(classes.filter((c) => c.orig && c.orig !== c.code).map((c) => [c.orig, c.code]));
      if (Object.keys(ren).length) {
        const mv = (obj) => Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [ren[k] || k, v]));
        for (const x of brandsOf(pcId)) if ((x.brand_code === b || followers.includes(x.brand_code)) && x.lm_targets) x.lm_targets = mv(x.lm_targets);
      }
      st.schemes[b] = { classes: classes.map(({ orig, ...c }) => c) };
      return (s) => ({ brand: b, follow: null, classes: (s.schemes[b] || { classes: [] }).classes });
    });
    const st = SM.setupOf(DB.byId('programChannels', pcId));
    const iss = (st.scheme_follow || {})[b] ? [] : issuesOf(st, b);
    done(iss.length ? 'warning' : 'success', `Skema kelas disimpan.${iss.length ? ` Perlu diperbaiki sebelum publish: ${esc(iss.join('; '))}.` : ''}`, `/setup/${pid}/ch/${pcId}/scheme/${b}`);
  };

  // ---------------------------------------------------------------- Exception (tingkat program, opsional) · dibuka dari kartu di Daftar program
  // Per channel: exception toko + batas persen benefit & approver exception. Tidak dihitung di kelengkapan setup / syarat publish.
  route('/setup/:id/ch/:pc/limits', ({ id, pc }) => UI.redirect(`/setup/${id}/exceptions?ch=${pc}`));
  route('/setup/:id/exceptions', ({ id }, q) => {
    const p = getProgram(id);
    // Bukan bagian alur setup: header sendiri, kembali ke Daftar program
    const head = `<div class="page-head cps-detail"><a href="#/setup" class="btn btn-ghost cps-back"><i class="bi bi-arrow-left"></i> Kembali</a><span class="cps-divider"></span><div class="cps-detail-main"><div>
        <div class="small text-muted"><a href="#/setup">Program Setup</a> / ${esc(p.code)}</div><h1>Exception · ${esc(p.name)}</h1>
        <div class="sub">Opsional dan di luar proses setup: tidak dihitung di kelengkapan dan tidak wajib untuk publish.</div></div></div></div>`;
    if (!p.channels.length) return { title: 'Exception', html: `<div class="cps">${head}<div class="card"><div class="card-body text-muted">Belum ada channel. Tambahkan channel dulu di <a href="#/setup/${p.id}/channels">Channel</a>.</div></div></div>` };
    const ch = p.channels.find((c) => c.id === Number(q.ch)) || p.channels[0];
    const st = SM.setupOf(ch);
    const ex = st.exception; const ru = st.rules;
    // kelas × tier yang total (conditional + Vision Compass) / persen benefit-nya di luar aturan channel
    const rows = ch.brands.filter((b) => !(st.scheme_follow || {})[b.brand_code]).flatMap((b) => SM.schemeOf(st, b.brand_code).classes.flatMap((c) => c.tiers.map((t, i) => ({
      b: b.brand_name, c: c.code, t: i + 1, sem: t.semester_pct, yr: t.yearly_pct, tot: (SM.tierTotal(t) || 0) + (Number(c.vc_pct) || 0) }))));
    const out = (v, lo, hi) => v !== null && v !== undefined && ((lo !== null && v < lo) || (hi !== null && v > hi));
    const over = ru.total_max_pct === null ? [] : rows.filter((x) => x.tot > ru.total_max_pct + 1e-9);
    const semOut = rows.filter((x) => out(x.sem, ru.semester_min, ru.semester_max)); const yrOut = rows.filter((x) => out(x.yr, ru.yearly_min, ru.yearly_max));
    // dikelompokkan per brand: "Wardah: D1 (1,25%), D2 (1,25%) · Emina: …"
    const list = (xs, f) => { if (!xs.length) return '<span class="text-success">tidak ada</span>';
      const by = {}; for (const x of xs) (by[x.b] = by[x.b] || []).push(`${esc(x.c)}${x.t} (${pct(f(x))})`);
      return `<span class="text-warning">${Object.entries(by).map(([bn, v]) => `<strong>${esc(bn)}</strong>: ${v.join(', ')}`).join(' · ')}</span>`; };
    const rng = (n1, v1, n2, v2) => `<div class="d-flex gap-1 align-items-center rng">${pctIn(n1, v1, 'placeholder="min"')}${pctIn(n2, v2, 'placeholder="maks"')}</div>`;
    // exception toko: toko yang tidak lolos eligibility tetap boleh didaftarkan (boleh diubah saat DRAFT & PUBLISHED)
    const stores = DB.t('stores').filter((s) => s.channel_code === ch.channel_code);
    const exceptions = ch.elig_exceptions || [];
    const canExc = SM.phaseStatus(ch, 'REGISTRATION') !== 'CLOSED';
    const notElig = stores.map((s) => Object.assign({ s }, E.eligibility(p, ch, s.customer_id))).filter((x) => !x.eligible && !exceptions.some((e) => e.customer_id === x.s.customer_id));
    return {
      title: `Exception · ${p.name}`, html: `<div class="cps">${head}
      <div class="cps-chhead"><h2>Channel</h2>
        <div class="cps-seg" role="group">${p.channels.map((c) => `<a href="#/setup/${p.id}/exceptions?ch=${c.id}" class="${c.id === ch.id ? 'active' : ''}">${esc(c.channel_name)}${(c.elig_exceptions || []).length ? ` (${c.elig_exceptions.length})` : ''}</a>`).join('')}</div></div>

      <div class="card mb-3"><div class="card-header"><i class="bi bi-shield-check"></i>&nbsp;Exception toko — ${esc(ch.channel_name)} <span class="small text-muted fw-normal">&nbsp;· toko yang tidak lolos eligibility tetap boleh didaftarkan</span></div><div class="card-body">
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

      <form data-action="setup.saveLimits" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
      <div class="row g-3"><div class="col-xl-7"><div class="card h-100"><div class="card-header"><i class="bi bi-speedometer2"></i>&nbsp;Batas benefit (opsional) — ${esc(ch.channel_name)}</div><div class="card-body">
          <div class="small text-muted mb-2">Kosongkan bila tidak ada batas. Bila diisi: kelas di luar rentang menjadi warning saat validasi, dan total di atas batas menjadi exception di form CBD.</div>
          <table class="table table-sm mb-2"><thead><tr><th>Aturan</th><th style="width:260px">Nilai</th><th>Kelas × tier di luar aturan</th></tr></thead><tbody>
            <tr><td class="fw-semibold">Semester benefit</td><td>${rng('semester_min', ru.semester_min, 'semester_max', ru.semester_max)}</td><td class="small">${list(semOut, (x) => x.sem)}</td></tr>
            <tr><td class="fw-semibold">Yearly benefit</td><td>${rng('yearly_min', ru.yearly_min, 'yearly_max', ru.yearly_max)}</td><td class="small">${list(yrOut, (x) => x.yr)}</td></tr>
            <tr><td class="fw-semibold">Batas total</td><td><div class="rng">${pctIn('total_max_pct', ru.total_max_pct, 'placeholder="tanpa batas"')}</div></td><td class="small">${ru.total_max_pct === null ? '<span class="text-muted">-</span>' : list(over, (x) => x.tot)}</td></tr>
          </tbody></table>
        </div></div></div>
        <div class="col-xl-5"><div class="card h-100"><div class="card-header"><i class="bi bi-exclamation-diamond"></i>&nbsp;Approver exception</div><div class="card-body">
          <label class="form-label">Pemicu exception</label>
          <ul class="small mb-3"><li>Total persen melebihi batas total channel (hanya bila batas total diisi).</li><li>Alokasi Vision Compass per pilar melebihi plafon brand (target 2027 × persen Vision Compass kelas).</li></ul>
          <label class="form-label">Approver exception</label>
          <select name="approver_role" class="form-control">${Object.entries(C.APPROVAL_ROLES).map(([k, l]) => `<option value="${k}" ${sel(ex.approver_role === k)}>${esc(l)}</option>`).join('')}</select>
          <div class="form-text mb-3">Contoh: RSM = RSBL / ABL. Bila ada exception, pendaftaran diteruskan ke approver ini.</div>
          <div class="small"><i class="bi bi-chat-left-text"></i> CBD <strong>wajib mengisi alasan</strong> untuk setiap exception.</div>
        </div></div></div></div>
      <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan batas & approver</button>
      </fieldset></form></div>`,
    };
  });
  actions['setup.saveLimits'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    saveSetup(pid, pcId, 'REGISTRATION', 'limits', (st) => {
      const r = Object.fromEntries(['semester_min', 'semester_max', 'yearly_min', 'yearly_max', 'total_max_pct'].map((k) => [k, toNum(f.get(k))]));
      if (Object.values(r).some((v) => v !== null && v < 0)) throw new Error('Persen tidak boleh negatif.');
      for (const [lo, hi, l] of [['semester_min', 'semester_max', 'semester benefit'], ['yearly_min', 'yearly_max', 'yearly benefit']]) if (r[lo] !== null && r[hi] !== null && r[lo] > r[hi]) throw new Error(`Rentang ${l} terbalik (min > maks).`);
      st.rules = r;
      const ap = f.get('approver_role');
      if (!C.APPROVAL_ROLES[ap]) throw new Error('Approver exception tidak dikenal.');
      st.exception = Object.assign({}, st.exception, { approver_role: ap, trigger_total: true, trigger_vc: true, reason_required: true });
      return (s) => ({ rules: s.rules, exception: s.exception });
    });
    done('success', 'Batas & approver exception disimpan.', `/setup/${pid}/exceptions?ch=${pcId}`);
  };

  // ---------------------------------------------------------------- Pencairan · termin & conditional rebate (semester + yearly)
  route('/setup/:id/ch/:pc/terms', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const st = SM.setupOf(ch);
    const errs = SM.termErrors(st);
    const row = (t) => `<tr class="rep-row"><td><input type="hidden" name="t_id" value="${esc(t.id || '')}"><input name="t_name" class="form-control form-control-sm" value="${esc(t.name || '')}" placeholder="mis. S1"></td>
      <td><select name="t_type" class="form-control form-control-sm t-type">${Object.entries(SM.TERM_TYPES).map(([k, l]) => `<option value="${k}" ${sel(t.type === k)}>${l}</option>`).join('')}</select></td>
      <td><div class="d-flex gap-1"><input name="t_start" type="date" class="form-control form-control-sm" value="${esc(t.start || '')}"><input name="t_end" type="date" class="form-control form-control-sm" value="${esc(t.end || '')}"></div></td>
      <td><div class="input-group input-group-sm"><input name="t_portion" type="number" step="any" min="0" max="100" class="form-control t-portion" value="${nv(t.portion_pct)}"><span class="input-group-text">%</span></div></td>
      <td><input name="t_schedule" class="form-control form-control-sm" value="${esc(t.schedule || '')}" placeholder="Jadwal pembayaran"></td>
      <td class="text-right"><button type="button" class="btn btn-sm btn-light text-danger" data-rm-row title="Hapus"><i class="bi bi-trash"></i></button></td></tr>`;
    return {
      title: `Termin · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'terms')}
      <form data-action="setup.saveTerms" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'PAYOUT')}>
      <div class="card mb-3"><div class="card-header"><i class="bi bi-calendar-range"></i>&nbsp;Termin pencairan <span class="small text-muted fw-normal">&nbsp;· conditional rebate = semester benefit + yearly benefit</span></div><div class="card-body">
        <div class="small text-muted mb-2">Termin berlaku untuk channel ini. Porsi termin semester harus berjumlah 100%.</div>
        <div class="table-responsive"><table class="table table-sm mb-2"><thead><tr><th style="width:120px">Nama</th><th style="width:170px">Tipe</th><th style="width:270px">Periode</th><th style="width:120px">Porsi</th><th>Jadwal pembayaran</th><th></th></tr></thead>
          <tbody id="termRows">${st.terms.map(row).join('')}</tbody></table></div>
        <button type="button" class="btn btn-sm btn-light" data-add-row="termRows"><i class="bi bi-plus"></i> Termin</button>
        <template data-tpl="termRows">${row({ type: 'SEMESTER' })}</template>
        <div id="termSum" class="mt-3">${errs.map((x) => `<div class="alert alert-danger py-2 small mb-1">${esc(x)}</div>`).join('')}</div>
        <div class="alert alert-light py-2 small mt-2 mb-0"><i class="bi bi-info-circle"></i>&nbsp;<span>Pencapaian dinilai per termin; payout termin tidak melebihi porsinya.</span></div>
      </div></div>
      <div class="row g-3"><div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-pie-chart"></i>&nbsp;Porsi termin berlaku untuk ${confirmTag}</div><div class="card-body">
          <select name="term_basis" class="form-control">${Object.entries(SM.TERM_BASIS).map(([k, l]) => `<option value="${k}" ${sel(st.term_basis === k)}>${l}${k === 'TARGET' ? ' (default)' : ''}</option>`).join('')}</select>
          <div class="form-text">Belum dipastikan: porsi termin diterapkan ke target, ke nilai benefit, atau keduanya.</div></div></div></div>
        <div class="col-lg-6"><div class="card h-100"><div class="card-header"><i class="bi bi-toggles"></i>&nbsp;Penurunan conditional rebate oleh CBD</div><div class="card-body">
          <label class="d-block mb-2"><input type="checkbox" name="cbd_can_lower_conditional" value="1" ${chk(st.cbd_can_lower_conditional)}> CBD boleh menurunkan conditional rebate sampai 0%</label>
          <label class="d-block mb-0"><input type="checkbox" name="lowering_adds_vc" value="1" ${chk(st.lowering_adds_vc)}> Selisih penurunan menambah plafon Vision Compass brand</label>
          <div class="form-text">Opsi kedua berlaku bila penurunan diizinkan.</div></div></div></div></div>
      <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan termin & conditional rebate</button>
      </fieldset></form></div></div>`,
      after(root) {
        const box = root.querySelector('#termRows'); const out = root.querySelector('#termSum');
        function check() {
          const sums = {};
          box.querySelectorAll('tr').forEach((tr) => { const type = tr.querySelector('.t-type').value; sums[type] = (sums[type] || 0) + (Number(tr.querySelector('.t-portion').value) || 0); });
          out.innerHTML = Object.entries(sums).filter(([, v]) => Math.round(v * 100) / 100 !== 100)
            .map(([type, v]) => `<div class="alert alert-danger py-2 small mb-1">Porsi termin ${SM.TERM_TYPES[type].toLowerCase()} berjumlah ${Math.round(v * 100) / 100}%, harus 100%.</div>`).join('');
        }
        ['input', 'change', 'click'].forEach((t) => box.addEventListener(t, () => setTimeout(check)));
        root.querySelector('[data-add-row="termRows"]').addEventListener('click', () => setTimeout(check));
      },
    };
  });
  actions['setup.saveTerms'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    const st = saveSetup(pid, pcId, 'PAYOUT', 'terms', (s) => {
      const names = f.all('t_name'); const ids = f.all('t_id');
      const cols = Object.fromEntries(['t_type', 't_start', 't_end', 't_portion', 't_schedule'].map((k) => [k, f.all(k)]));
      let n = Math.max(0, ...s.terms.map((x) => Number(String(x.id).replace(/\D/g, '')) || 0));
      s.terms = names.map((nm, i) => ({ nm: nm.trim(), i })).filter((x) => x.nm).map(({ nm, i }) => {
        const portion = toNum(cols.t_portion[i]);
        if (portion !== null && (portion < 0 || portion > 100)) throw new Error(`Termin ${nm}: porsi harus 0–100%.`);
        if (cols.t_start[i] && cols.t_end[i] && cols.t_start[i] > cols.t_end[i]) throw new Error(`Termin ${nm}: tanggal mulai setelah tanggal selesai.`);
        return { id: ids[i] || `t${++n}`, name: nm, type: SM.TERM_TYPES[cols.t_type[i]] ? cols.t_type[i] : 'SEMESTER',
          start: cols.t_start[i] || '', end: cols.t_end[i] || '', portion_pct: portion, schedule: cols.t_schedule[i].trim() };
      });
      s.term_basis = SM.TERM_BASIS[f.get('term_basis')] ? f.get('term_basis') : 'TARGET';
      s.cbd_can_lower_conditional = f.has('cbd_can_lower_conditional');
      s.lowering_adds_vc = f.has('lowering_adds_vc');
      return (x) => ({ terms: x.terms, term_basis: x.term_basis, cbd_can_lower_conditional: x.cbd_can_lower_conditional, lowering_adds_vc: x.lowering_adds_vc });
    });
    const errs = SM.termErrors(st);
    done(errs.length ? 'warning' : 'success', errs.length ? `Termin disimpan, tetapi: ${esc(errs.join(' '))} Publish Pencairan diblokir sampai diperbaiki.` : 'Termin & conditional rebate disimpan.', `/setup/${pid}/ch/${pcId}/terms`);
  };

  // ---------------------------------------------------------------- Monitoring · kerangka (menyusul)
  route('/setup/:id/ch/:pc/monitoring', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const link = (sub, l) => `<a href="#/setup/${p.id}/ch/${ch.id}/${sub}">${l}</a>`;
    return {
      title: `Monitoring · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'monitoring')}
      <div class="card"><div class="card-header"><i class="bi bi-binoculars"></i>&nbsp;Fase Monitoring ${soonTag}</div><div class="card-body">
        <p class="small text-muted">Konfigurasi fase Monitoring akan diperbarui menyusul. Sampai saat itu, pengaturan yang sudah ada tetap dipakai:</p>
        <ul class="small mb-0">
          <li>Frekuensi monitoring: <strong>${esc((C.FREQUENCIES || {})[ch.monitoring_frequency] || ch.monitoring_frequency || '-')}</strong> — di ${link('payout-rules', 'Syarat payout & jadwal')} (fase Pencairan).</li>
          <li>Lead measure & evidence: ${ch.leadMeasures.length} lead measure — di ${link('pillars', 'Pilar & saran lead measure')}.</li>
          <li>Form & approval Monitoring: ${ch.phases.MONITORING.layers.length} approval layer — di ${link('phases/MONITORING', 'Form & approval')}.</li>
        </ul></div></div></div></div>`,
    };
  });

  // Baris berulang (termin): tambah dari <template data-tpl>, hapus baris
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-row]');
    if (add) {
      const tpl = document.querySelector(`template[data-tpl="${add.dataset.addRow}"]`);
      const body = document.getElementById(add.dataset.addRow);
      if (tpl && body) { body.insertAdjacentHTML('beforeend', tpl.innerHTML); const i = body.lastElementChild.querySelector('input:not([type=hidden])'); if (i) i.focus(); }
      return;
    }
    const rm = e.target.closest('[data-rm-row]');
    if (rm && !rm.disabled) rm.closest('.rep-row').remove();
  });
})();
