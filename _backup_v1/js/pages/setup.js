// Setup Program (Admin HO) bagian 1: daftar, buat/duplikat, umum, channel & kelas, matriks JTBD.
(function () {
  const { h, route, actions, clicks, done, flash, render, go, redirect, fail } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;

  // ---------------------------------------------------------------- util bersama
  function getProgram(id) {
    UI.requireRole('ADMIN_HO');
    const p = E.loadProgram(Number(id));
    if (!p || p.year !== UI.currentYear()) fail('Program tidak ditemukan', 'Program tidak ada di tahun yang dipilih.');
    p.participantCount = DB.where('participants', (x) => x.program_id === p.id).length;
    return p;
  }

  const TABS = [['general', 'Umum'], ['channels', 'Channel & Kelas'], ['jtbd', 'Matriks JTBD'], ['fields', 'Kolom Input'],
    ['disbursement', 'Pencairan'], ['workflow', 'Alur Approval'], ['review', 'Review & Aktivasi']];

  function nav(p, tab) {
    return `<div class="page-head"><div>
        <div class="small text-muted"><a href="#/setup">Setup Program</a> / ${p.year}</div>
        <h1>${esc(p.name)} <span class="text-muted fw-normal fs-6">${esc(p.code)}</span> ${h.badge(p.status)}</h1></div>
      <div class="small text-muted text-right">${p.channels.length} channel · ${p.leadMeasures.length} lead measure · ${p.participantCount} peserta</div></div>
      ${p.status === 'active' && p.participantCount > 0 ? `<div class="alert alert-warning py-2 small"><i class="bi bi-exclamation-triangle"></i>
        Program sudah aktif & punya peserta. Perubahan kelas/target tidak mengubah peserta yang sudah terdaftar (target tersimpan saat pendaftaran), tapi perubahan komponen pencairan berlaku untuk pengajuan berikutnya.</div>` : ''}
      <ul class="nav nav-tabs nav-tabs-line nav-tabs-line-2x nav-tabs-line-brand setup-tabs" role="tablist">
        ${TABS.map(([k, l], i) => `<li class="nav-item"><a href="#/setup/${p.id}/${k}" class="nav-link ${tab === k ? 'active' : ''}"><span class="n">${i + 1}</span>${l}</a></li>`).join('')}</ul>`;
  }

  function shiftYear(d, years) {
    if (!d) return null;
    const [y, m, dd] = String(d).slice(0, 10).split('-').map(Number);
    return `${y + years}-${String(m).padStart(2, '0')}-${String(m === 2 && dd === 29 ? 28 : dd).padStart(2, '0')}`;
  }
  const slugKey = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

  // Checklist kelengkapan sebelum aktivasi
  function checklist(p) {
    const items = [];
    const add = (ok, text, level = 'error') => items.push({ ok, text, level });
    add(!!p.registration_start && !!p.registration_end, 'Periode pendaftaran diisi');
    add(p.program_start <= p.program_end, 'Periode program valid');
    add(p.baseline_start <= p.baseline_end, 'Periode baseline valid');
    add(p.channels.length > 0, 'Minimal 1 channel');
    for (const ch of p.channels) {
      add(ch.brand_codes.length > 0, `[${ch.channel_name}] Brand dipilih`);
      add(ch.classes.length > 0, `[${ch.channel_name}] Minimal 1 kelas`);
      const s = [...ch.classes].sort((a, b) => a.baseline_min - b.baseline_min);
      let overlap = false;
      for (let i = 1; i < s.length; i++) if (s[i - 1].baseline_max === null || s[i - 1].baseline_max > s[i].baseline_min) overlap = true;
      add(!overlap, `[${ch.channel_name}] Range baseline kelas tidak tumpang tindih`);
      add(ch.status === 'complete', `[${ch.channel_name}] Ditandai selesai`, 'warning');
      if (p.components.some((c) => c.is_active && c.comp_type === 'jtbd' && (c.program_channel_id === null || c.program_channel_id === ch.id))) {
        const covered = ch.classes.filter((cl) => p.leadMeasures.some((lm) => lm.params[cl.id]));
        add(covered.length === ch.classes.length, `[${ch.channel_name}] Parameter JTBD terisi untuk semua kelas`, 'warning');
      }
    }
    add(p.periods.length > 0, 'Minimal 1 periode pencairan');
    for (const per of p.periods) add(per.achieve_start >= p.program_start && per.achieve_end <= p.program_end, `Periode "${per.name}" berada di dalam periode program`);
    add(p.components.some((c) => c.is_active), 'Minimal 1 komponen pencairan aktif');
    for (const c of p.components.filter((x) => x.comp_type === 'formula' && x.is_active)) {
      const err = window.Formula.validate(c.config.expression, E.FORMULA_VARS.concat(p.fields.map((f) => f.key)));
      add(!err, `Rumus "${c.name}" valid${err ? ': ' + err : ''}`);
    }
    add(p.steps.some((s) => s.phase === 'disbursement'), 'Alur approval pencairan diisi (tanpa tahapan = langsung cair)', 'warning');
    return items;
  }

  // ---------------------------------------------------------------- daftar & duplikat
  route('/setup', ({}, q, { year }) => {
    UI.requireRole('ADMIN_HO');
    const programs = DB.where('programs', (p) => p.year === year);
    const others = DB.where('programs', (p) => p.year !== year).sort((a, b) => b.year - a.year);
    return {
      title: 'Setup Program', html: `
      <div class="page-head"><div><h1>Setup Program ${year}</h1><div class="sub">Admin HO membuat & mengatur program loyalty. Semua parameter diatur dari sini, tanpa hardcode.</div></div>
        <a href="#/setup/new" class="btn btn-brand"><i class="bi bi-plus-lg"></i> Program baru</a></div>
      <div class="card mb-4"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0">
        <thead><tr><th>Kode</th><th>Nama</th><th>Periode program</th><th>Basis</th><th class="num">Channel</th><th class="num">Peserta</th><th>Status</th><th></th></tr></thead>
        <tbody>${programs.map((p) => `<tr><td><code>${esc(p.code)}</code></td><td class="fw-semibold">${esc(p.name)}</td>
          <td>${h.date(p.program_start)} – ${h.date(p.program_end)}</td><td>${p.basis === 'sellin' ? 'Sell in' : 'Sell out'}</td>
          <td class="num">${DB.where('programChannels', (c) => c.program_id === p.id).length}</td>
          <td class="num">${DB.where('participants', (x) => x.program_id === p.id).length}</td><td>${h.badge(p.status)}</td>
          <td class="text-right"><a href="#/setup/${p.id}/general" class="btn btn-sm btn-outline-brand">Buka setup</a></td></tr>`).join('')
          || `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada program di tahun ${year}.</td></tr>`}</tbody></table></div></div>
      ${others.length ? `<div class="card"><div class="card-header"><i class="bi bi-copy"></i> Duplikat program dari tahun lain</div><div class="card-body">
        <p class="small text-muted">Salin seluruh setup (channel, kelas, matriks JTBD, kolom, pencairan, alur approval) ke tahun ${year}. Tanggal digeser otomatis; angka bisa disesuaikan setelahnya.</p>
        <form data-action="setup.clone" class="row g-2 align-items-end">
          <div class="col-md-5"><label class="form-label small">Program sumber</label><select name="source_id" class="form-control">
            ${others.map((o) => `<option value="${o.id}">${o.year} · ${esc(o.name)} (${esc(o.code)})</option>`).join('')}</select></div>
          <div class="col-md-2"><label class="form-label small">Kode baru</label><input name="code" class="form-control" placeholder="VC${String(year).slice(2)}" required></div>
          <div class="col-md-3"><label class="form-label small">Nama baru</label><input name="name" class="form-control" placeholder="Vision Compass ${year}" required></div>
          <div class="col-md-2"><button class="btn btn-outline-brand w-100">Duplikat</button></div>
        </form></div></div>` : ''}`,
    };
  });

  actions['setup.clone'] = (f) => {
    const year = UI.currentYear();
    const src = E.loadProgram(Number(f.get('source_id')));
    const code = String(f.get('code') || '').trim().toUpperCase();
    const name = String(f.get('name') || '').trim();
    if (!/^[A-Z0-9_]{2,20}$/.test(code) || !name) throw new Error('Kode (2-20 huruf besar/angka) & nama program baru wajib diisi');
    if (DB.t('programs').some((p) => p.year === year && p.code === code)) throw new Error('Kode program sudah dipakai di tahun ini');
    const dy = year - src.year;
    const p = DB.insert('programs', Object.assign({}, DB.byId('programs', src.id), {
      year, code, name, status: 'draft', created_at: new Date().toISOString(), created_by: UI.currentUser().id,
      baseline_start: shiftYear(src.baseline_start, dy), baseline_end: shiftYear(src.baseline_end, dy),
      program_start: shiftYear(src.program_start, dy), program_end: shiftYear(src.program_end, dy),
      registration_start: shiftYear(src.registration_start, dy), registration_end: shiftYear(src.registration_end, dy),
      settings: Object.assign({}, src.settings),
    }));
    const pcMap = {}; const clMap = {}; const perMap = {};
    for (const ch of src.channels) {
      const n = DB.insert('programChannels', { program_id: p.id, channel_code: ch.channel_code, brand_codes: [...ch.brand_codes], min_baseline: ch.min_baseline,
        min_sellout_ratio: ch.min_sellout_ratio, min_active_months: ch.min_active_months, growth_editable: ch.growth_editable, status: 'draft', notes: ch.notes });
      pcMap[ch.id] = n.id;
      for (const c of ch.classes) clMap[c.id] = DB.insert('classes', Object.assign({}, c, { program_channel_id: n.id })).id;
    }
    for (const pil of src.pillars) {
      const np = DB.insert('pillars', { program_id: p.id, name: pil.name, description: pil.description, sort: pil.sort });
      for (const j of pil.jtbds) {
        const nj = DB.insert('jtbds', { pillar_id: np.id, name: j.name, sort: j.sort });
        for (const lm of j.lead_measures) {
          const nl = DB.insert('lms', { jtbd_id: nj.id, name: lm.name, unit: lm.unit, input_type: lm.input_type, sort: lm.sort });
          for (const prm of Object.values(lm.params)) {
            DB.insert('params', { lead_measure_id: nl.id, program_class_id: clMap[prm.program_class_id], target_value: prm.target_value, reward_pct: prm.reward_pct, reward_nominal: prm.reward_nominal });
          }
        }
      }
    }
    for (const fl of src.fields) DB.insert('fields', Object.assign({}, fl, { program_id: p.id, program_channel_id: fl.program_channel_id ? pcMap[fl.program_channel_id] : null, options: fl.options ? [...fl.options] : null }));
    for (const per of src.periods) {
      perMap[per.id] = DB.insert('periods', { program_id: p.id, name: per.name, achieve_start: shiftYear(per.achieve_start, dy), achieve_end: shiftYear(per.achieve_end, dy),
        claim_start: shiftYear(per.claim_start, dy), claim_end: shiftYear(per.claim_end, dy), sort: per.sort }).id;
    }
    for (const c of src.components) {
      DB.insert('components', { program_id: p.id, program_channel_id: c.program_channel_id ? pcMap[c.program_channel_id] : null, name: c.name, comp_type: c.comp_type,
        config: JSON.parse(JSON.stringify(c.config)), period_ids: c.period_ids ? c.period_ids.map((x) => perMap[x]).filter(Boolean) : null, is_active: c.is_active, sort: c.sort });
    }
    for (const s of src.steps) DB.insert('steps', { program_id: p.id, phase: s.phase, name: s.name, role: s.role, sort: s.sort });
    done('success', `Program "${esc(src.name)}" (${src.year}) berhasil diduplikat. Silakan sesuaikan angkanya untuk tahun ${year}.`, `/setup/${p.id}/general`);
  };

  // ---------------------------------------------------------------- umum (baru & edit)
  function generalForm(p, form, errors) {
    const isNew = !p;
    const fv = form;
    return `${isNew ? `<div class="page-head"><div><div class="small text-muted"><a href="#/setup">Setup Program</a> / ${UI.currentYear()}</div><h1>Program Baru</h1></div></div>` : nav(p, 'general')}
      ${UI.errorsHtml(errors)}
      <form data-action="setup.general" data-id="${isNew ? '' : p.id}"><div class="row g-3">
      <div class="col-lg-7">
        <div class="card mb-3"><div class="card-header">Identitas program</div><div class="card-body row g-3">
          <div class="col-md-3"><label class="form-label">Kode</label><input name="code" class="form-control text-uppercase" value="${esc(fv.code)}" ${isNew ? 'required' : 'disabled'} placeholder="VC27"></div>
          <div class="col-md-9"><label class="form-label">Nama program</label><input name="name" class="form-control" value="${esc(fv.name)}" required placeholder="Vision Compass ${UI.currentYear()}"></div>
          <div class="col-12"><label class="form-label">Deskripsi</label><textarea name="description" class="form-control" rows="2">${esc(fv.description)}</textarea></div>
          <div class="col-md-6"><label class="form-label">Basis perhitungan</label><select name="basis" class="form-control">
            <option value="sellout" ${sel(fv.basis === 'sellout')}>Sell out</option><option value="sellin" ${sel(fv.basis === 'sellin')}>Sell in</option></select>
            <div class="form-text">Dipakai untuk baseline & aktual. Basis lain (mis. promosi) bisa ditambah lewat komponen rumus.</div></div>
          <div class="col-md-6"><label class="form-label">Metode baseline</label><select name="baseline_method" class="form-control">
            <option value="avg_monthly" ${sel(fv.baseline_method === 'avg_monthly')}>Rata-rata per bulan (total ÷ jumlah bulan periode)</option>
            <option value="avg_active_month" ${sel(fv.baseline_method === 'avg_active_month')}>Rata-rata bulan aktif saja</option></select></div>
        </div></div>
        <div class="card mb-3"><div class="card-header">Periode</div><div class="card-body row g-3">
          ${[['baseline', 'Periode baseline', 'Data sell out di periode ini = baseline toko → menentukan kelas.', true], ['program', 'Periode program', '', true], ['registration', 'Periode pendaftaran (CBD)', '', false]].map(([k, label, help, req]) => `
            <div class="col-md-6"><label class="form-label">${label}</label><div class="input-group">
              <input type="date" name="${k}_start" class="form-control" value="${esc(fv[k + '_start'])}" ${req ? 'required' : ''}><span class="input-group-text">s/d</span>
              <input type="date" name="${k}_end" class="form-control" value="${esc(fv[k + '_end'])}" ${req ? 'required' : ''}></div>${help ? `<div class="form-text">${help}</div>` : ''}</div>`).join('')}
        </div></div>
      </div>
      <div class="col-lg-5">
        <div class="card mb-3"><div class="card-header">Pencairan & pajak</div><div class="card-body row g-3">
          <div class="col-6"><label class="form-label">Pajak ber-NPWP</label><div class="input-group"><input type="number" step="any" name="tax_rate_npwp" class="form-control" value="${esc(fv.tax_rate_npwp)}"><span class="input-group-text">%</span></div></div>
          <div class="col-6"><label class="form-label">Pajak tanpa NPWP</label><div class="input-group"><input type="number" step="any" name="tax_rate_non_npwp" class="form-control" value="${esc(fv.tax_rate_non_npwp)}"><span class="input-group-text">%</span></div></div>
          <div class="col-12"><label class="form-label">Yang mengajukan pencairan</label><select name="disbursement_submitter_role" class="form-control">
            <option value="ADMIN_DC" ${sel(fv.disbursement_submitter_role === 'ADMIN_DC')}>Admin DC (input NPWP & rekening)</option>
            <option value="CBD" ${sel(fv.disbursement_submitter_role === 'CBD')}>CBD</option></select>
            <div class="form-text">Tahapan approval setelahnya diatur di tab "Alur Approval".</div></div>
        </div></div>
        <div class="card mb-3"><div class="card-body">
          <div class="form-check form-switch"><input class="form-check-input" type="checkbox" name="demo_open_windows" id="demo" ${chk(fv.demo_open_windows)}>
            <label class="form-check-label" for="demo">Mode prototype: abaikan jendela tanggal</label></div>
          <div class="form-text">Pendaftaran & klaim pencairan tetap bisa dicoba walau di luar tanggalnya.</div>
          ${isNew ? `<div class="form-check form-switch mt-3"><input class="form-check-input" type="checkbox" name="use_template" id="tpl" ${chk(fv.use_template)}>
            <label class="form-check-label" for="tpl">Isi template awal</label></div>
            <div class="form-text">Semester 1 & 2, komponen rebate growth + JTBD, alur RSM → Finance → HO. Semua bisa diubah.</div>` : ''}
        </div></div>
        <button class="btn btn-brand w-100"><i class="bi bi-save"></i> ${isNew ? 'Buat program & lanjut ke Channel' : 'Simpan'}</button>
      </div></div></form>`;
  }

  route('/setup/new', ({}, q, { year, path }) => {
    UI.requireRole('ADMIN_HO');
    const pend = UI.takePending(path);
    const form = pend ? Object.assign({}, pend.values, { demo_open_windows: pend.values.demo_open_windows === 'on', use_template: pend.values.use_template === 'on' }) : {
      code: '', name: '', description: '', basis: 'sellout', baseline_method: 'avg_monthly',
      baseline_start: `${year - 1}-01-01`, baseline_end: `${year - 1}-12-31`, program_start: `${year}-01-01`, program_end: `${year}-12-31`,
      registration_start: `${year - 1}-11-01`, registration_end: `${year}-02-28`, tax_rate_npwp: 2, tax_rate_non_npwp: 4,
      disbursement_submitter_role: 'ADMIN_DC', demo_open_windows: true, use_template: true,
    };
    return { title: 'Program Baru', html: generalForm(null, form, pend && pend.errors) };
  });

  route('/setup/:id/general', ({ id }, q, { path }) => {
    const p = getProgram(id);
    const pend = UI.takePending(path);
    const form = pend ? Object.assign({}, p, pend.values, { demo_open_windows: pend.values.demo_open_windows === 'on' })
      : Object.assign({}, p, { demo_open_windows: !!(p.settings || {}).demo_open_windows });
    return { title: 'Umum', html: generalForm(p, form, pend && pend.errors) };
  });

  actions['setup.general'] = (f, form) => {
    const year = UI.currentYear();
    const id = Number(form.dataset.id) || null;
    const v = {
      name: String(f.get('name') || '').trim(), description: f.get('description') || null,
      basis: f.get('basis') === 'sellin' ? 'sellin' : 'sellout',
      baseline_method: f.get('baseline_method') === 'avg_active_month' ? 'avg_active_month' : 'avg_monthly',
      baseline_start: f.get('baseline_start'), baseline_end: f.get('baseline_end'), program_start: f.get('program_start'), program_end: f.get('program_end'),
      registration_start: f.get('registration_start') || null, registration_end: f.get('registration_end') || null,
      tax_rate_npwp: toNum(f.get('tax_rate_npwp')) ?? 0, tax_rate_non_npwp: toNum(f.get('tax_rate_non_npwp')) ?? 0,
      disbursement_submitter_role: f.get('disbursement_submitter_role') === 'CBD' ? 'CBD' : 'ADMIN_DC',
    };
    const errs = [];
    const code = id ? DB.byId('programs', id).code : String(f.get('code') || '').trim().toUpperCase();
    if (!/^[A-Z0-9_]{2,20}$/.test(code)) errs.push('Kode program 2-20 karakter (huruf besar, angka, _).');
    if (!v.name) errs.push('Nama program wajib diisi.');
    if (v.baseline_start > v.baseline_end) errs.push('Periode baseline: tanggal mulai > tanggal selesai.');
    if (v.program_start > v.program_end) errs.push('Periode program: tanggal mulai > tanggal selesai.');
    if (!id && DB.t('programs').some((p) => p.year === year && p.code === code)) errs.push('Kode program sudah dipakai di tahun ini.');
    if (errs.length) { UI.retry(errs, f); return; }

    if (id) {
      const p = DB.byId('programs', id);
      Object.assign(p, v, { settings: Object.assign({}, p.settings, { demo_open_windows: f.has('demo_open_windows') }), updated_at: new Date().toISOString() });
      done('success', 'Informasi umum disimpan.', `/setup/${id}/general`);
      return;
    }
    const p = DB.insert('programs', Object.assign(v, { year, code, status: 'draft', settings: { demo_open_windows: f.has('demo_open_windows') },
      created_by: UI.currentUser().id, created_at: new Date().toISOString() }));
    if (f.has('use_template')) {
      const y1 = v.program_start.slice(0, 4); const y2 = v.program_end.slice(0, 4);
      DB.insert('periods', { program_id: p.id, name: 'Semester 1', achieve_start: `${y1}-01-01`, achieve_end: `${y1}-06-30`, claim_start: `${y1}-07-01`, claim_end: `${y1}-08-31`, sort: 1 });
      DB.insert('periods', { program_id: p.id, name: 'Semester 2', achieve_start: `${y2}-07-01`, achieve_end: `${y2}-12-31`, claim_start: `${Number(y2) + 1}-01-01`, claim_end: `${Number(y2) + 1}-02-28`, sort: 2 });
      DB.insert('components', { program_id: p.id, program_channel_id: null, name: 'Rebate Growth', comp_type: 'growth_rebate', period_ids: null, is_active: true, sort: 1,
        config: { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] } });
      DB.insert('components', { program_id: p.id, program_channel_id: null, name: 'Reward JTBD', comp_type: 'jtbd', period_ids: null, is_active: true, sort: 2, config: { base: 'actual', min_achievement: 90 } });
      DB.insert('steps', { program_id: p.id, phase: 'registration', name: 'Approval RSM', role: 'RSM', sort: 1 });
      DB.insert('steps', { program_id: p.id, phase: 'disbursement', name: 'Cek Berkas & NPWP', role: 'FINANCE', sort: 1 });
      DB.insert('steps', { program_id: p.id, phase: 'disbursement', name: 'Approval HO', role: 'ADMIN_HO', sort: 2 });
    }
    done('success', 'Program dibuat. Lanjutkan dengan menambahkan channel.', `/setup/${p.id}/channels`);
  };

  // ---------------------------------------------------------------- channel
  route('/setup/:id/channels', ({ id }) => {
    const p = getProgram(id);
    const avail = DB.t('channels').filter((c) => c.is_active && !p.channels.some((x) => x.channel_code === c.code));
    return {
      title: 'Channel & Kelas', html: `${nav(p, 'channels')}
      <div class="row g-3"><div class="col-lg-8">
        ${p.channels.map((ch) => `<div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center"><span><i class="bi bi-diagram-3"></i> ${esc(ch.channel_name)}</span>${h.badge(ch.status)}</div>
          <div class="card-body"><div class="table-responsive"><table class="table table-sm mb-2">
            <thead><tr><th>Kelas</th><th class="num">Baseline / bulan</th><th class="num">Min growth</th><th class="num">Rebate</th></tr></thead>
            <tbody>${ch.classes.map((c) => `<tr><td>${h.cls(c.name)}</td><td class="num">${h.rpShort(c.baseline_min)} – ${c.baseline_max === null ? '∞' : h.rpShort(c.baseline_max)}</td>
              <td class="num">${h.pct(c.min_growth, 0)}</td><td class="num">${h.pct(c.rebate_pct, 2)}</td></tr>`).join('') || '<tr><td colspan="4" class="text-muted">Belum ada kelas.</td></tr>'}</tbody></table></div>
            <div class="d-flex justify-content-between"><span class="small text-muted">Brand: ${ch.brand_codes.join(', ') || '-'}</span><div>
              <a href="#" class="btn btn-sm btn-link text-danger" data-click="setup.deleteChannel" data-pc="${ch.id}" data-id="${p.id}" data-confirm="Hapus channel ${esc(ch.channel_name)} dari program?">Hapus</a>
              <a href="#/setup/${p.id}/channels/${ch.id}" class="btn btn-sm btn-brand">Atur channel</a></div></div>
          </div></div>`).join('') || '<div class="card"><div class="card-body text-muted">Belum ada channel. Tambahkan channel di samping.</div></div>'}
      </div><div class="col-lg-4"><div class="card"><div class="card-header">Tambah channel</div><div class="card-body">
        <p class="small text-muted">Admin bisa menyelesaikan satu channel dulu (kelas, eligibility, matriks JTBD), lalu pindah ke channel berikutnya.</p>
        ${avail.length ? `<form data-action="setup.addChannel" data-id="${p.id}" class="d-flex gap-2"><select name="channel_code" class="form-control">
          ${avail.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-brand">Tambah</button></form>` : '<div class="small text-muted">Semua channel sudah ditambahkan.</div>'}
        <div class="form-text">Channel baru bisa dibuat di Master Data → Channel & Brand.</div>
      </div></div></div></div>`,
    };
  });

  actions['setup.addChannel'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const pc = DB.insert('programChannels', { program_id: pid, channel_code: f.get('channel_code'), brand_codes: DB.t('brands').filter((b) => b.is_active).map((b) => b.code),
      min_baseline: null, min_sellout_ratio: null, min_active_months: null, growth_editable: true, status: 'draft', notes: null });
    done('success', 'Channel ditambahkan. Isi kelas & aturan eligibility channel ini.', `/setup/${pid}/channels/${pc.id}`);
  };
  clicks['setup.deleteChannel'] = (d) => {
    const pcId = Number(d.pc);
    if (DB.t('participants').some((x) => x.program_channel_id === pcId)) { flash('danger', 'Channel sudah punya peserta, tidak bisa dihapus.'); render(); return; }
    E.deleteChannel(pcId);
    done('success', 'Channel dihapus.', `/setup/${d.id}/channels`);
  };

  route('/setup/:id/channels/:pc', ({ id, pc: pcId }) => {
    const p = getProgram(id);
    const pc = p.channels.find((c) => c.id === Number(pcId));
    if (!pc) fail('Channel tidak ditemukan');
    // preview eligibility dengan data sell out
    const stores = DB.t('stores').filter((s) => s.channel_code === pc.channel_code);
    const agg = E.salesAgg({ customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes, start: p.baseline_start, end: p.baseline_end });
    const dist = {}; let eligible = 0;
    for (const [, a] of agg) {
      const e = E.eligibility(pc, E.baselineOf(p, a), E.sellRatio(a), a.activeMonths);
      if (e.eligible) { eligible++; dist[e.cls.name] = (dist[e.cls.name] || 0) + 1; }
    }
    const rows = pc.classes.length ? pc.classes : [{ id: '', name: 'A', baseline_min: '', baseline_max: null, min_growth: '', max_growth: null, rebate_pct: '' }];
    const nv = (v) => (v === null || v === undefined ? '' : v);
    return {
      title: pc.channel_name, html: `${nav(p, 'channels')}
      <div class="mb-2 small"><a href="#/setup/${p.id}/channels"><i class="bi bi-arrow-left"></i> Semua channel</a></div>
      <form data-action="setup.saveChannel" data-id="${p.id}" data-pc="${pc.id}"><div class="row g-3">
        <div class="col-xl-8">
          <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span>Kelas ${esc(pc.channel_name)}</span><span class="small text-muted fw-normal">Kelas otomatis dari baseline rata-rata per bulan</span></div>
            <div class="card-body"><div class="table-responsive"><table class="table table-sm table-bordered" id="classTable">
              <thead><tr><th style="width:90px">Nama</th><th>Baseline min (Rp)</th><th>Baseline maks (Rp)<br><span class="text-lowercase fw-normal">kosong = tak terbatas</span></th><th>Min growth %</th><th>Maks growth %</th><th>Rebate %</th><th></th></tr></thead>
              <tbody>${rows.map((c) => `<tr>
                <td><input type="hidden" name="class_id" value="${c.id}"><input name="class_name" class="form-control form-control-sm" value="${esc(c.name)}" required></td>
                <td><input name="baseline_min" type="number" step="any" class="form-control form-control-sm" value="${nv(c.baseline_min)}" required></td>
                <td><input name="baseline_max" type="number" step="any" class="form-control form-control-sm" value="${nv(c.baseline_max)}"></td>
                <td><input name="min_growth" type="number" step="any" class="form-control form-control-sm" value="${nv(c.min_growth)}" required></td>
                <td><input name="max_growth" type="number" step="any" class="form-control form-control-sm" value="${nv(c.max_growth)}"></td>
                <td><input name="rebate_pct" type="number" step="any" class="form-control form-control-sm" value="${nv(c.rebate_pct)}"></td>
                <td><button type="button" class="btn btn-sm btn-link text-danger del-row"><i class="bi bi-trash"></i></button></td></tr>`).join('')}</tbody></table></div>
              <button type="button" class="btn btn-sm btn-outline-brand" id="addClass"><i class="bi bi-plus"></i> Tambah kelas</button></div></div>
          <div class="card mb-3"><div class="card-header">Eligibility & brand</div><div class="card-body row g-3">
            <div class="col-12"><label class="form-label">Brand yang dihitung (baseline & aktual)</label><div class="d-flex flex-wrap gap-3">
              ${DB.t('brands').filter((b) => b.is_active).map((b) => `<div class="form-check"><input class="form-check-input" type="checkbox" name="brand_codes" value="${b.code}" id="b_${b.code}" ${chk(pc.brand_codes.includes(b.code))}>
                <label class="form-check-label" for="b_${b.code}">${esc(b.name)}</label></div>`).join('')}</div></div>
            <div class="col-md-4"><label class="form-label">Baseline minimal (Rp)</label><input name="min_baseline" type="number" step="any" class="form-control" value="${nv(pc.min_baseline)}" placeholder="ikut kelas terendah"></div>
            <div class="col-md-4"><label class="form-label">Rasio SO : SI minimal (%)</label><input name="min_sellout_ratio" type="number" step="any" class="form-control" value="${nv(pc.min_sellout_ratio)}" placeholder="kosong = hanya ditampilkan">
              <div class="form-text">Mis. 96. Kosongkan bila belum dipakai sebagai syarat.</div></div>
            <div class="col-md-4"><label class="form-label">Min. bulan aktif di baseline</label><input name="min_active_months" type="number" class="form-control" value="${nv(pc.min_active_months)}" placeholder="opsional"></div>
            <div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" name="growth_editable" id="ge" ${chk(pc.growth_editable)}>
              <label class="form-check-label" for="ge">CBD boleh menaikkan growth di atas minimal kelas</label></div></div>
            <div class="col-12"><label class="form-label">Catatan</label><textarea name="notes" class="form-control" rows="2">${esc(pc.notes)}</textarea></div>
          </div></div>
        </div>
        <div class="col-xl-4"><div class="sticky-summary">
          <div class="card mb-3"><div class="card-header"><i class="bi bi-calculator"></i> Cek kelas dari baseline</div><div class="card-body">
            <div class="input-group mb-2"><span class="input-group-text">Rp</span><input type="number" id="simBase" class="form-control" placeholder="70000000"></div>
            <div id="simOut" class="small text-muted">Ketik baseline rata-rata per bulan.</div></div></div>
          <div class="card mb-3"><div class="card-header"><i class="bi bi-funnel"></i> Preview eligibility (tersimpan)</div><div class="card-body small">
            <div><strong>${eligible}</strong> toko eligible dari ${agg.size} toko yang punya data (total ${stores.length} toko di channel).</div>
            <div class="mt-2 d-flex flex-wrap gap-2">${Object.entries(dist).map(([k, v]) => `<span>${h.cls(k)} ${v}</span>`).join('')}</div>
            <div class="text-muted mt-2">Periode baseline ${h.date(p.baseline_start)} – ${h.date(p.baseline_end)}. Simpan untuk memperbarui.</div></div></div>
          <div class="card"><div class="card-body">
            <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" name="status" value="complete" id="st" ${chk(pc.status === 'complete')}>
              <label class="form-check-label" for="st">Tandai channel ini <strong>selesai</strong></label></div>
            <button class="btn btn-brand w-100"><i class="bi bi-save"></i> Simpan channel</button>
            <a href="#/setup/${p.id}/jtbd?channel=${pc.id}" class="btn btn-outline-brand w-100 mt-2">Lanjut: matriks JTBD ${esc(pc.channel_name)} <i class="bi bi-arrow-right"></i></a>
          </div></div>
        </div></div>
      </div></form>`,
      after(root) {
        const tbody = root.querySelector('#classTable tbody');
        root.querySelector('#addClass').addEventListener('click', () => {
          const last = tbody.rows[tbody.rows.length - 1];
          const tr = last.cloneNode(true);
          tr.querySelectorAll('input').forEach((i) => { i.value = ''; });
          const ln = last.querySelector('[name=class_name]').value;
          tr.querySelector('[name=class_name]').value = ln.length === 1 ? String.fromCharCode(ln.charCodeAt(0) + 1) : '';
          tbody.appendChild(tr);
        });
        tbody.addEventListener('click', (e) => {
          const b = e.target.closest('.del-row'); if (!b) return;
          if (tbody.rows.length === 1) { alert('Minimal 1 kelas'); return; }
          b.closest('tr').remove(); sim();
        });
        function sim() {
          const v = parseFloat(root.querySelector('#simBase').value);
          const out = root.querySelector('#simOut');
          if (isNaN(v)) { out.textContent = 'Ketik baseline rata-rata per bulan.'; return; }
          const cl = [...tbody.rows].map((r) => ({
            name: r.querySelector('[name=class_name]').value, min: parseFloat(r.querySelector('[name=baseline_min]').value),
            max: r.querySelector('[name=baseline_max]').value === '' ? null : parseFloat(r.querySelector('[name=baseline_max]').value),
            g: r.querySelector('[name=min_growth]').value, reb: r.querySelector('[name=rebate_pct]').value,
          })).sort((a, b) => b.min - a.min).find((c) => v >= c.min && (c.max === null || v < c.max));
          out.innerHTML = cl ? `Masuk ${h.cls(cl.name)} · min growth <strong>${esc(cl.g)}%</strong> · rebate ${esc(cl.reb)}%<br>Target min/bulan: <strong>${h.rp(Math.round(v * (1 + cl.g / 100)))}</strong>`
            : '<span class="text-danger">Tidak masuk kelas manapun (tidak eligible).</span>';
        }
        root.querySelector('#simBase').addEventListener('input', sim);
        tbody.addEventListener('input', sim);
      },
    };
  });

  actions['setup.saveChannel'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const pc = DB.byId('programChannels', form.dataset.pc);
    const ids = f.all('class_id'); const names = f.all('class_name');
    const classes = names.map((name, i) => ({
      id: toNum(ids[i]), name: name.trim(), baseline_min: toNum(f.all('baseline_min')[i]), baseline_max: toNum(f.all('baseline_max')[i]),
      min_growth: toNum(f.all('min_growth')[i]), max_growth: toNum(f.all('max_growth')[i]), rebate_pct: toNum(f.all('rebate_pct')[i]) ?? 0,
    })).filter((c) => c.name);
    const errs = [];
    for (const c of classes) {
      if (c.baseline_min === null) errs.push(`Kelas ${c.name}: baseline minimal wajib diisi`);
      if (c.min_growth === null) errs.push(`Kelas ${c.name}: growth minimal wajib diisi`);
      if (c.baseline_max !== null && c.baseline_max <= c.baseline_min) errs.push(`Kelas ${c.name}: baseline maksimal harus > minimal`);
    }
    if (new Set(classes.map((c) => c.name)).size !== classes.length) errs.push('Nama kelas tidak boleh sama');
    const existing = DB.where('classes', (c) => c.program_channel_id === pc.id);
    const keepIds = classes.map((c) => c.id).filter(Boolean);
    const removed = existing.filter((c) => !keepIds.includes(c.id)).map((c) => c.id);
    if (removed.length && DB.t('participants').some((x) => removed.includes(x.class_id))) errs.push('Kelas yang sudah dipakai peserta tidak bisa dihapus.');
    if (errs.length) throw new Error(errs.join(' · '));

    Object.assign(pc, {
      brand_codes: f.all('brand_codes'), min_baseline: toNum(f.get('min_baseline')), min_sellout_ratio: toNum(f.get('min_sellout_ratio')),
      min_active_months: toNum(f.get('min_active_months')), growth_editable: f.has('growth_editable'),
      status: f.get('status') === 'complete' ? 'complete' : 'draft', notes: f.get('notes') || null,
    });
    E.deleteClasses(removed);
    classes.forEach((c, i) => {
      const row = { name: c.name, baseline_min: c.baseline_min, baseline_max: c.baseline_max, min_growth: c.min_growth, max_growth: c.max_growth, rebate_pct: c.rebate_pct, sort: i };
      const ex = c.id && DB.byId('classes', c.id);
      if (ex) Object.assign(ex, row); else DB.insert('classes', Object.assign({ program_channel_id: pc.id }, row));
    });
    const ch = DB.t('channels').find((x) => x.code === pc.channel_code);
    done('success', `Channel ${esc(ch.name)} disimpan${pc.status === 'complete' ? ' & ditandai selesai' : ''}.`, `/setup/${pid}/channels/${pc.id}`);
  };

  // ---------------------------------------------------------------- matriks JTBD
  route('/setup/:id/jtbd', ({ id }, q) => {
    const p = getProgram(id);
    const pc = p.channels.find((c) => c.id === Number(q.channel)) || p.channels[0] || null;
    const tree = p.pillars.map((pil) => ({ id: pil.id, name: pil.name, jtbds: pil.jtbds.map((j) => ({ id: j.id, name: j.name,
      lead_measures: j.lead_measures.map((l) => ({ id: l.id, name: l.name, unit: l.unit, input_type: l.input_type })) })) }));
    let right;
    if (!pc) right = '<div class="card"><div class="card-body text-muted">Tambahkan channel & kelas terlebih dahulu.</div></div>';
    else if (!pc.classes.length) right = `<div class="card"><div class="card-body text-muted">Channel ${esc(pc.channel_name)} belum punya kelas. <a href="#/setup/${p.id}/channels/${pc.id}">Atur kelas</a>.</div></div>`;
    else {
      const span = 1 + pc.classes.length * 3;
      right = `<div class="card mb-3"><div class="card-header">2. Parameter per kelas — ${esc(pc.channel_name)}</div><div class="card-body">
        ${!p.leadMeasures.length ? '<p class="text-muted">Belum ada lead measure. Buat struktur di kiri atau upload CSV di bawah.</p>' : `
        <form data-action="setup.saveParams" data-id="${p.id}" data-pc="${pc.id}">
          <div class="small text-muted mb-2">Per sel: <strong>target</strong> · <strong>reward %</strong> (× aktual periode) · <strong>reward Rp</strong> (nominal tetap). Kosongkan semua = tidak berlaku.</div>
          <div class="table-responsive"><table class="table table-sm table-bordered table-matrix">
            <thead><tr><th rowspan="2">Pilar / JTBD / Lead measure</th>${pc.classes.map((c) => `<th colspan="3" class="text-center">${h.cls(c.name)}</th>`).join('')}</tr>
              <tr>${pc.classes.map(() => '<th>Target</th><th>Rew %</th><th>Rew Rp</th>').join('')}</tr></thead>
            <tbody>${p.pillars.map((pil) => `<tr class="table-light"><td colspan="${span}" class="fw-semibold"><i class="bi bi-flag"></i> ${esc(pil.name)}</td></tr>
              ${pil.jtbds.map((j) => `<tr><td colspan="${span}" class="pl-3 text-brand small fw-semibold">${esc(j.name)}</td></tr>
                ${j.lead_measures.map((lm) => `<tr><td class="pl-4 small">${esc(lm.name)}${lm.unit ? ` <span class="text-muted">(${esc(lm.unit)})</span>` : ''} <span class="badge badge-light">${lm.input_type}</span></td>
                  ${pc.classes.map((c) => { const prm = lm.params[c.id] || {}; const k = lm.id + '_' + c.id;
                    return `<td>${lm.input_type === 'yesno' ? `<select name="t_${k}" class="form-control form-control-sm"><option value=""></option><option ${sel(prm.target_value === 'Ya')}>Ya</option></select>`
                      : `<input name="t_${k}" class="form-control form-control-sm" value="${esc(prm.target_value)}">`}</td>
                      <td><input name="r_${k}" type="number" step="any" class="form-control form-control-sm" value="${prm.reward_pct || ''}"></td>
                      <td><input name="n_${k}" type="number" step="any" class="form-control form-control-sm" value="${prm.reward_nominal || ''}"></td>`; }).join('')}</tr>`).join('')}`).join('')}`).join('')}</tbody>
          </table></div>
          <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan parameter ${esc(pc.channel_name)}</button>
        </form>`}</div></div>
        <div class="card"><div class="card-header"><i class="bi bi-file-earmark-spreadsheet"></i> Upload matriks dari CSV — ${esc(pc.channel_name)}</div><div class="card-body">
          <p class="small text-muted mb-2">Kolom: Pilar | JTBD | Lead Measure | Satuan | Tipe Input | Kelas | Parameter | Reward % | Reward Nominal. Item baru otomatis dibuat; yang sudah ada dicocokkan berdasarkan nama.
            File Excel bisa disimpan sebagai CSV (File → Save As → CSV).</p>
          <form data-action="setup.uploadMatrix" data-id="${p.id}" data-pc="${pc.id}" class="d-flex gap-2 flex-wrap">
            <input type="file" name="file" accept=".csv" class="form-control" style="max-width:320px" required>
            <button class="btn btn-outline-brand"><i class="bi bi-upload"></i> Upload</button>
            <a href="#" class="btn btn-link" data-click="setup.matrixTemplate" data-id="${p.id}" data-pc="${pc.id}"><i class="bi bi-download"></i> Download template / isi saat ini</a>
          </form></div></div>`;
    }
    return {
      title: 'Matriks JTBD', html: `${nav(p, 'jtbd')}
      <div class="row g-3"><div class="col-xl-5"><div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center"><span>1. Struktur Pilar → JTBD → Lead Measure</span>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addPillar"><i class="bi bi-plus"></i> Pilar</button></div>
        <div class="card-body">
          <p class="small text-muted mb-2">Struktur berlaku untuk semua channel. Parameter & reward diatur per kelas di sebelah (per channel). Lead measure tanpa parameter = tidak berlaku untuk kelas tsb.</p>
          <div id="tree"></div>
          <form data-action="setup.saveTree" data-id="${p.id}" data-pc="${pc ? pc.id : ''}"><input type="hidden" name="structure" id="structure">
            <button class="btn btn-brand mt-2"><i class="bi bi-save"></i> Simpan struktur</button></form>
        </div></div></div>
        <div class="col-xl-7">
          <ul class="nav nav-pills mb-2">${p.channels.map((ch) => `<li class="nav-item"><a class="nav-link ${pc && pc.id === ch.id ? 'active' : ''}" href="#/setup/${p.id}/jtbd?channel=${ch.id}">${esc(ch.channel_name)}</a></li>`).join('')}</ul>
          ${right}
        </div></div>`,
      after(root) {
        const el = root.querySelector('#tree');
        const t = tree;
        function draw() {
          el.innerHTML = t.map((pil, pi) => `<div class="tree-pillar pl-2 mb-3">
            <div class="input-group input-group-sm mb-1"><span class="input-group-text"><i class="bi bi-flag"></i></span>
              <input class="form-control fw-semibold" data-p="${pi}" data-f="name" value="${esc(pil.name)}" placeholder="Nama pilar">
              <button type="button" class="btn btn-outline-brand" data-act="addJ" data-p="${pi}"><i class="bi bi-plus"></i> JTBD</button>
              <button type="button" class="btn btn-outline-danger" data-act="delP" data-p="${pi}"><i class="bi bi-trash"></i></button></div>
            ${pil.jtbds.map((j, ji) => `<div class="tree-jtbd pl-2 mb-2">
              <div class="input-group input-group-sm mb-1"><span class="input-group-text">JTBD</span>
                <input class="form-control" data-p="${pi}" data-j="${ji}" data-f="name" value="${esc(j.name)}" placeholder="Job to be done">
                <button type="button" class="btn btn-outline-brand" data-act="addL" data-p="${pi}" data-j="${ji}"><i class="bi bi-plus"></i> LM</button>
                <button type="button" class="btn btn-outline-danger" data-act="delJ" data-p="${pi}" data-j="${ji}"><i class="bi bi-trash"></i></button></div>
              ${j.lead_measures.map((l, li) => `<div class="tree-lm input-group input-group-sm mb-1">
                <input class="form-control" style="flex:3" data-p="${pi}" data-j="${ji}" data-l="${li}" data-f="name" value="${esc(l.name)}" placeholder="Lead measure">
                <input class="form-control" style="flex:1.3" data-p="${pi}" data-j="${ji}" data-l="${li}" data-f="unit" value="${esc(l.unit)}" placeholder="satuan">
                <select class="form-control" style="flex:1.2" data-p="${pi}" data-j="${ji}" data-l="${li}" data-f="input_type">${['number', 'yesno', 'text'].map((x) => `<option ${sel(l.input_type === x)}>${x}</option>`).join('')}</select>
                <button type="button" class="btn btn-outline-danger" data-act="delL" data-p="${pi}" data-j="${ji}" data-l="${li}"><i class="bi bi-x"></i></button></div>`).join('')}
            </div>`).join('')}</div>`).join('') || '<div class="text-muted small">Belum ada pilar.</div>';
        }
        el.addEventListener('input', (e) => {
          const d = e.target.dataset; if (!d.f) return;
          let o = t[d.p]; if (d.j !== undefined) o = o.jtbds[d.j]; if (d.l !== undefined) o = o.lead_measures[d.l];
          o[d.f] = e.target.value;
        });
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const d = b.dataset;
          if (d.act === 'addJ') t[d.p].jtbds.push({ name: '', lead_measures: [] });
          if (d.act === 'addL') t[d.p].jtbds[d.j].lead_measures.push({ name: '', unit: '', input_type: 'number' });
          if (d.act === 'delP' && confirm('Hapus pilar beserta JTBD & parameternya?')) t.splice(d.p, 1);
          if (d.act === 'delJ' && confirm('Hapus JTBD beserta lead measure & parameternya?')) t[d.p].jtbds.splice(d.j, 1);
          if (d.act === 'delL') t[d.p].jtbds[d.j].lead_measures.splice(d.l, 1);
          draw();
        });
        root.querySelector('#addPillar').addEventListener('click', () => { t.push({ name: '', jtbds: [{ name: '', lead_measures: [] }] }); draw(); });
        root.querySelector('#structure').closest('form').addEventListener('submit', () => { root.querySelector('#structure').value = JSON.stringify(t); }, true);
        draw();
      },
    };
  });

  actions['setup.saveTree'] = (f, form) => {
    const pid = Number(form.dataset.id);
    const tree = JSON.parse(f.get('structure') || '[]');
    const p = E.loadProgram(pid);
    const oldP = p.pillars.map((x) => x.id);
    const oldJ = p.pillars.flatMap((x) => x.jtbds.map((j) => j.id));
    const oldL = p.leadMeasures.map((x) => x.id);
    const kP = []; const kJ = []; const kL = [];
    tree.forEach((pil, pi) => {
      if (!String(pil.name || '').trim()) return;
      let row = oldP.includes(pil.id) && DB.byId('pillars', pil.id);
      if (row) Object.assign(row, { name: pil.name.trim(), sort: pi }); else row = DB.insert('pillars', { program_id: pid, name: pil.name.trim(), description: null, sort: pi });
      kP.push(row.id);
      (pil.jtbds || []).forEach((j, ji) => {
        if (!String(j.name || '').trim()) return;
        let jr = oldJ.includes(j.id) && DB.byId('jtbds', j.id);
        if (jr) Object.assign(jr, { pillar_id: row.id, name: j.name.trim(), sort: ji }); else jr = DB.insert('jtbds', { pillar_id: row.id, name: j.name.trim(), sort: ji });
        kJ.push(jr.id);
        (j.lead_measures || []).forEach((l, li) => {
          if (!String(l.name || '').trim()) return;
          const type = ['number', 'yesno', 'text'].includes(l.input_type) ? l.input_type : 'number';
          let lr = oldL.includes(l.id) && DB.byId('lms', l.id);
          const v = { jtbd_id: jr.id, name: l.name.trim(), unit: l.unit || null, input_type: type, sort: li };
          if (lr) Object.assign(lr, v); else lr = DB.insert('lms', v);
          kL.push(lr.id);
        });
      });
    });
    E.deleteLeadMeasures(oldL.filter((x) => !kL.includes(x)));
    E.deleteJtbds(oldJ.filter((x) => !kJ.includes(x)));
    E.deletePillars(oldP.filter((x) => !kP.includes(x)));
    done('success', 'Struktur pilar / JTBD / lead measure disimpan.', `/setup/${pid}/jtbd${form.dataset.pc ? '?channel=' + form.dataset.pc : ''}`);
  };

  function upsertParam(lmId, classId, target, rpct, rnom) {
    const ex = DB.t('params').find((x) => x.lead_measure_id === lmId && x.program_class_id === classId);
    if (target === '' && !rpct && !rnom) { if (ex) DB.remove('params', (x) => x === ex); return; }
    if (ex) Object.assign(ex, { target_value: target, reward_pct: rpct, reward_nominal: rnom });
    else DB.insert('params', { lead_measure_id: lmId, program_class_id: classId, target_value: target, reward_pct: rpct, reward_nominal: rnom });
  }

  actions['setup.saveParams'] = (f, form) => {
    const p = E.loadProgram(Number(form.dataset.id));
    const pc = p.channels.find((c) => c.id === Number(form.dataset.pc));
    for (const lm of p.leadMeasures) {
      for (const c of pc.classes) {
        const k = `${lm.id}_${c.id}`;
        upsertParam(lm.id, c.id, String(f.get('t_' + k) || '').trim(), toNum(f.get('r_' + k)) ?? 0, toNum(f.get('n_' + k)) ?? 0);
      }
    }
    done('success', `Parameter JTBD channel ${esc(pc.channel_name)} disimpan.`, `/setup/${p.id}/jtbd?channel=${pc.id}`);
  };

  const MATRIX_HEAD = ['Pilar', 'JTBD', 'Lead Measure', 'Satuan', 'Tipe Input (number/yesno/text)', 'Kelas', 'Parameter / Target', 'Reward %', 'Reward Nominal'];
  clicks['setup.matrixTemplate'] = (d) => {
    const p = E.loadProgram(Number(d.id));
    const pc = p.channels.find((c) => c.id === Number(d.pc));
    const rows = [MATRIX_HEAD];
    if (p.leadMeasures.length) {
      for (const lm of p.leadMeasures) for (const c of pc.classes) {
        const prm = lm.params[c.id];
        rows.push([lm.pillar_name, lm.jtbd_name, lm.name, lm.unit, lm.input_type, c.name, prm ? prm.target_value : '', prm ? prm.reward_pct : '', prm ? prm.reward_nominal : '']);
      }
    } else for (const c of pc.classes) rows.push(['Contoh Pilar', 'Contoh JTBD', 'Live streaming', 'jam/minggu', 'number', c.name, '4', '0.5', '0']);
    UI.download(`matriks_jtbd_${p.code}_${pc.channel_code}.csv`, UI.toCsv(rows), 'text/csv;charset=utf-8');
  };

  actions['setup.uploadMatrix'] = async (f, form) => {
    const pid = Number(form.dataset.id);
    const p = E.loadProgram(pid);
    const pc = p.channels.find((c) => c.id === Number(form.dataset.pc));
    const back = `/setup/${pid}/jtbd?channel=${pc.id}`;
    const file = f.file('file');
    if (!file || !file.size) throw new Error('File belum dipilih');
    if (!/\.csv$/i.test(file.name)) throw new Error('Prototype FE hanya membaca CSV. Simpan file Excel sebagai CSV terlebih dahulu.');
    const rows = UI.parseCsv(await file.text()).slice(1);
    const byClass = Object.fromEntries(pc.classes.map((c) => [c.name.toLowerCase(), c]));
    const errs = [];
    rows.forEach((r, i) => {
      const [pil, jt, lm, , type, kelas] = r;
      if (!pil || !jt || !lm || !kelas) errs.push(`Baris ${i + 2}: Pilar, JTBD, Lead Measure, Kelas wajib diisi`);
      else if (!byClass[kelas.toLowerCase()]) errs.push(`Baris ${i + 2}: kelas "${kelas}" tidak ada di channel ${pc.channel_name}`);
      if (type && !['number', 'yesno', 'text'].includes(type.toLowerCase())) errs.push(`Baris ${i + 2}: tipe input "${type}" tidak dikenal`);
    });
    if (!rows.length) errs.push('File kosong');
    if (errs.length) { flash('danger', errs.slice(0, 10).map(esc).join('<br>') + (errs.length > 10 ? `<br>... dan ${errs.length - 10} error lain` : '')); go(back); return; }
    const key = (s) => String(s).trim().toLowerCase();
    let created = 0;
    for (const r of rows) {
      const [pilName, jtName, lmName, unit, type, kelas, target, rpct, rnom] = r;
      let pil = DB.t('pillars').find((x) => x.program_id === pid && key(x.name) === key(pilName));
      if (!pil) { pil = DB.insert('pillars', { program_id: pid, name: pilName, description: null, sort: DB.where('pillars', (x) => x.program_id === pid).length }); created++; }
      let jt = DB.t('jtbds').find((x) => x.pillar_id === pil.id && key(x.name) === key(jtName));
      if (!jt) { jt = DB.insert('jtbds', { pillar_id: pil.id, name: jtName, sort: DB.where('jtbds', (x) => x.pillar_id === pil.id).length }); created++; }
      const t = (type || 'number').toLowerCase();
      let lm = DB.t('lms').find((x) => x.jtbd_id === jt.id && key(x.name) === key(lmName));
      if (!lm) { lm = DB.insert('lms', { jtbd_id: jt.id, name: lmName, unit: unit || null, input_type: t, sort: DB.where('lms', (x) => x.jtbd_id === jt.id).length }); created++; }
      else Object.assign(lm, { unit: unit || lm.unit, input_type: t });
      const ex = DB.t('params').find((x) => x.lead_measure_id === lm.id && x.program_class_id === byClass[kelas.toLowerCase()].id);
      const v = { target_value: target || '', reward_pct: toNum(rpct) ?? 0, reward_nominal: toNum(rnom) ?? 0 };
      if (ex) Object.assign(ex, v); else DB.insert('params', Object.assign({ lead_measure_id: lm.id, program_class_id: byClass[kelas.toLowerCase()].id }, v));
    }
    done('success', `Upload berhasil: ${rows.length} parameter disimpan, ${created} item struktur baru dibuat.`, back);
  };

  window.SetupShared = { getProgram, nav, checklist, slugKey };
})();
