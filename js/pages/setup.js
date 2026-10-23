// Program Setup (Admin HO / Superadmin) bagian 1, mengikuti "Program Setup Flow":
// 0 daftar · 1A clone · 1B header · 2 channel · 3a eligibility & jadwal (setup2.js) · 3b brand · 3c kelas & tier per brand · 3d pilar · 3e rumus
(function () {
  const { h, route, actions, clicks, done, fail } = UI;
  const { esc, toNum, sel, chk } = h;
  const E = window.Engine;
  const C = window.Catalog;

  // ---------------------------------------------------------------- util bersama
  function getProgram(id) {
    UI.requireSetup();
    const p = E.loadProgram(Number(id));
    if (!p || p.year !== UI.currentYear()) fail('Program tidak ditemukan', 'Program tidak ada di tahun yang dipilih.');
    p.registrationCount = DB.where('registrations', (x) => x.program_id === p.id).length;
    return p;
  }
  function getChannel(p, pcId) {
    const ch = p.channels.find((c) => c.id === Number(pcId));
    if (!ch) fail('Channel tidak ditemukan');
    return ch;
  }
  // Semua penulisan konfigurasi hanya untuk DRAFT; template dokumen boleh DRAFT & PUBLISHED (FR1, FR10)
  function assertDraft(pid) {
    const p = DB.byId('programs', pid);
    if (!p || p.status !== 'DRAFT') throw new Error(`Program ${p ? p.status : ''} terkunci. Hanya template MOU/SKN yang masih bisa diubah setelah publish.`);
    return p;
  }
  function assertDocsEditable(pid) {
    const p = DB.byId('programs', pid);
    if (!p || p.status === 'CLOSED') throw new Error('Program CLOSED sepenuhnya read-only, termasuk template dokumen.');
    return p;
  }
  function touch(pid) { const p = DB.byId('programs', pid); p.updated_at = new Date().toISOString(); p.lock_version = (p.lock_version || 1) + 1; }
  const editable = (p) => p.status === 'DRAFT';
  const fs = (p) => (editable(p) ? '' : 'disabled'); // <fieldset ${fs(p)}> → read-only setelah publish

  const CH_TABS = [['eligibility', '3a', 'Eligibility & jadwal'], ['brands', '3b', 'Brand'], ['classes', '3c', 'Kelas & tier'], ['pillars', '3d', 'Pilar'], ['formulas', '3e', 'Rumus'],
    ['phases', '3f–g', 'Fase: form & approval'], ['documents', '3h', 'Dokumen']];

  // Header program + stepper alur setup (step 1–8) + sub-tab per channel (step 3, diulang per channel)
  function nav(p, step, ch, sub) {
    const st = p.status;
    const first = p.channels[0];
    const steps = [
      ['header', '1', 'Header', `#/setup/${p.id}/header`],
      ['channels', '2', 'Channel', `#/setup/${p.id}/channels`],
      ['config', '3', 'Konfigurasi channel', first ? `#/setup/${p.id}/ch/${first.id}/eligibility` : `#/setup/${p.id}/channels`],
      ['simulate', '4', 'Simulasi', `#/setup/${p.id}/simulate`],
      ['validate', '5–6', st === 'DRAFT' ? 'Validasi & publish' : 'Validasi', `#/setup/${p.id}/validate`],
      ...(st !== 'DRAFT' ? [['docs', '7', 'Edit MOU / SKN', first ? `#/setup/${p.id}/ch/${first.id}/documents` : '#'], ['close', '8', 'Close', `#/setup/${p.id}/validate?focus=close`]] : []),
      ['audit', '', 'Audit log', `#/setup/${p.id}/audit`],
    ];
    const lock = st === 'PUBLISHED'
      ? `<div class="alert alert-success py-2 small mb-3"><i class="bi bi-lock"></i>&nbsp;<span>PUBLISHED: kelas, tier, rumus, pilar, form, approval & aturan <strong>read-only</strong>. Hanya template MOU / SKN yang masih bisa diubah (revisi baru).</span></div>`
      : st === 'CLOSED' ? '<div class="alert alert-dark py-2 small mb-3"><i class="bi bi-archive"></i>&nbsp;<span>CLOSED: seluruh program read-only, termasuk template dokumen. Tetap tersedia untuk audit & laporan.</span></div>' : '';
    // Kartu kerja channel (pemilih channel + tab 3a–3h + isi halaman); ditutup di akhir template tiap route channel
    const chNav = ch ? `<div class="cps-work"><div class="loop-lane mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Ulangi untuk setiap channel</div>
        <div class="d-flex flex-wrap gap-2 align-items-center mb-2">${p.channels.map((c) => `<a class="btn btn-sm ${c.id === ch.id ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${c.id}/${sub === 'classes' ? 'brands' : sub}">${esc(c.channel_name)}</a>`).join('')}</div>
        <ul class="nav nav-tabs nav-tabs-line nav-tabs-line-brand sub-tabs mb-0">${CH_TABS.map(([k, n, l]) => `<li class="nav-item"><a class="nav-link ${sub === k ? 'active' : ''}"
          href="#/setup/${p.id}/ch/${ch.id}/${k === 'classes' ? (ch.brands[0] ? 'brands/' + ch.brands[0].id : 'brands') : k}"><span class="n">${n}</span>${l}</a></li>`).join('')}</ul></div>` : '';
    return `<div class="cps-head"><div class="page-head cps-detail"><a href="#/setup" class="btn btn-ghost cps-back"><i class="bi bi-arrow-left"></i> Kembali</a><span class="cps-divider"></span><div class="cps-detail-main"><div>
        <div class="small text-muted"><a href="#/setup">Program Setup</a> / ${p.year}</div>
        <h1>${esc(p.name)} <span class="text-muted fw-normal fs-6">${esc(p.code)}</span> ${h.badge(st)}</h1></div>
      </div>
      <div class="cps-facts">
        <div class="cps-fact"><span class="cps-fact-label">Periode</span><span class="cps-fact-value">${h.date(p.period_start)} – ${h.date(p.period_end)}</span></div>
        <div class="cps-fact"><span class="cps-fact-label">Channel</span><span class="cps-fact-value">${p.channels.length}</span></div>
        <div class="cps-fact"><span class="cps-fact-label">Registrasi</span><span class="cps-fact-value">${p.registrationCount}</span></div>
      </div></div>
      <ol class="flow-steps">${steps.map(([k, n, l, href]) => `<li class="${step === k ? 'active' : ''}"><a href="${href}">${n ? `<span class="n">${n}</span>` : '<i class="bi bi-clock-history"></i>'}${l}</a></li>`).join('')}</ol></div>
      ${lock}${chNav}`;
  }

  // ---------------------------------------------------------------- 0 · daftar program & 1A · clone
  route('/setup', ({}, q, { year }) => {
    UI.requireSetup();
    const all = DB.t('programs').slice().sort((a, b) => b.year - a.year || a.id - b.id);
    const programs = all.filter((p) => p.year === year);
    const types = Object.fromEntries(DB.t('programTypes').map((t) => [t.id, t.name]));
    return {
      title: 'Program Setup', html: `<div class="cps"><div class="cps-list">
      <div class="page-head"><div><h1>Program Setup ${year}</h1><div class="sub">Konfigurasi program loyalty tanpa code release. Hanya Admin HO & Admin IT (Superadmin).</div></div>
        <a href="#/setup/new" class="btn btn-brand"><i class="bi bi-plus-lg"></i> Program baru</a></div>
      <div class="card mb-4"><div class="table-responsive"><table class="table table-bordered table-striped table-hover mb-0">
        <thead><tr><th>Kode</th><th>Nama</th><th>Tipe</th><th>Periode</th><th class="num">Channel</th><th class="num">Registrasi</th><th>Status</th><th></th></tr></thead>
        <tbody>${programs.map((p) => `<tr><td><code>${esc(p.code)}</code></td><td class="fw-semibold">${esc(p.name)}</td><td>${esc(types[p.program_type_id])}</td>
          <td>${h.date(p.period_start)} – ${h.date(p.period_end)}</td>
          <td class="num">${DB.where('programChannels', (c) => c.program_id === p.id).length}</td>
          <td class="num">${DB.where('registrations', (x) => x.program_id === p.id).length}</td><td>${h.badge(p.status)}</td>
          <td class="text-right text-nowrap"><a href="#/setup/${p.id}/header" class="btn btn-sm btn-outline-brand">${p.status === 'DRAFT' ? 'Edit' : 'Lihat'}</a>
            <a href="#/setup?clone=${p.id}" class="btn btn-sm btn-link">Clone</a></td></tr>`).join('')
          || `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada program di tahun ${year}.</td></tr>`}</tbody></table></div></div></div>
      <div class="card" id="clone"><div class="card-header"><span class="step-chip">1A</span>&nbsp;Clone program</div><div class="card-body">
        <p class="small text-muted">Membuat program <strong>DRAFT</strong> baru dengan semua channel, brand, kelas, tier, pilar, rumus, form fase, approval layer & template dokumen tersalin. Lanjutkan di step 2 untuk mengubah yang berbeda saja.</p>
        <form data-action="setup.clone" class="row g-2 align-items-end">
          <div class="col-md-4"><label class="form-label small">Program sumber <span class="text-danger">*</span></label><select name="source_id" class="form-control">
            ${all.map((o) => `<option value="${o.id}" ${sel(Number(q.clone) === o.id)}>${o.year} · ${esc(o.name)} (${esc(o.code)}) · ${h.STATUS[o.status][0]}</option>`).join('')}</select></div>
          <div class="col-md-2"><label class="form-label small">Kode baru <span class="text-danger">*</span></label><input name="code" class="form-control text-uppercase" placeholder="LOYALTY-${year + 1}" required></div>
          <div class="col-md-3"><label class="form-label small">Nama baru <span class="text-danger">*</span></label><input name="name" class="form-control" placeholder="Loyalty Program ${year + 1}" required></div>
          <div class="col-md-1"><label class="form-label small">Tahun <span class="text-danger">*</span></label><input name="year" type="number" class="form-control" value="${year}" required></div>
          <div class="col-md-2"><label class="form-label small">&nbsp;</label><button class="btn btn-brand w-100"><i class="bi bi-copy"></i> Clone</button></div>
          <div class="col-md-3"><label class="form-label small">Periode mulai <span class="text-danger">*</span></label><input name="period_start" type="date" class="form-control" value="${year}-01-01" required></div>
          <div class="col-md-3"><label class="form-label small">Periode selesai <span class="text-danger">*</span></label><input name="period_end" type="date" class="form-control" value="${year}-12-31" required></div>
        </form></div></div></div>`,
    };
  });

  const CODE_RE = /^[A-Z0-9_-]{2,30}$/;
  function headerErrors(v, id) {
    const errs = [];
    if (!CODE_RE.test(v.code)) errs.push('Kode program 2–30 karakter (huruf besar, angka, - atau _).');
    if (DB.t('programs').some((p) => p.code === v.code && p.id !== id)) errs.push(`Kode "${v.code}" sudah dipakai program lain.`);
    if (!v.name) errs.push('Nama program wajib diisi.');
    if (!Number.isInteger(v.year) || v.year < 2020 || v.year > 2100) errs.push('Tahun tidak valid.');
    if (!v.period_start || !v.period_end) errs.push('Periode mulai & selesai wajib diisi.');
    else if (v.period_end <= v.period_start) errs.push('Periode selesai harus setelah tanggal mulai.');
    return errs;
  }

  actions['setup.clone'] = (f) => {
    UI.requireSetup();
    const src = DB.byId('programs', f.get('source_id'));
    const v = { code: String(f.get('code') || '').trim().toUpperCase(), name: String(f.get('name') || '').trim(), year: Number(f.get('year')),
      period_start: f.get('period_start'), period_end: f.get('period_end') };
    const errs = headerErrors(v, null);
    if (errs.length) throw new Error(errs.join(' · '));
    if (!DB.t('years').some((y) => y.year === v.year)) DB.t('years').push({ year: v.year, is_active: true, note: null });
    const p = E.cloneProgram(src.id, v, UI.currentUser().id);
    E.audit(p.id, 'program', p.id, 'clone', null, { from: src.code, code: v.code });
    if (v.year !== UI.currentYear()) UI.session.set({ year: v.year });
    done('success', `"${esc(src.name)}" berhasil di-clone menjadi DRAFT <strong>${esc(v.name)}</strong>. Ubah hanya bagian yang berbeda.`, `/setup/${p.id}/channels`);
  };

  // ---------------------------------------------------------------- 1B · header program (+ tipe program)
  function headerPage(p, fv, errors) {
    const isNew = !p;
    const lockAttr = isNew ? '' : fs(p);
    return `<div class="cps">${isNew ? `<div class="page-head cps-detail"><a href="#/setup" class="btn btn-ghost cps-back"><i class="bi bi-arrow-left"></i> Kembali</a><span class="cps-divider"></span><div class="cps-detail-main"><div><div class="small text-muted"><a href="#/setup">Program Setup</a> / ${UI.currentYear()}</div><h1>Program baru</h1>
        <div class="sub">Step 1B · program dibuat dengan status DRAFT</div></div></div></div>` : nav(p, 'header')}
      ${UI.errorsHtml(errors)}
      <div class="row g-3"><div class="col-12">
        <form data-action="setup.header" data-id="${isNew ? '' : p.id}"><fieldset ${lockAttr}>
        <div class="card"><div class="card-header"><span class="step-chip">1B</span>&nbsp;Program header</div><div class="card-body row g-3">
          <div class="col-md-4"><label class="form-label">Kode program <span class="text-danger">*</span></label><input name="code" class="form-control text-uppercase" value="${esc(fv.code)}" required placeholder="LOYALTY-2027"><div class="form-text">Unik</div></div>
          <div class="col-md-8"><label class="form-label">Nama program <span class="text-danger">*</span></label><input name="name" class="form-control" value="${esc(fv.name)}" required placeholder="Loyalty Program 2027"></div>
          <input type="hidden" name="program_type_id" value="${esc(fv.program_type_id)}">
          <div class="col-md-4"><label class="form-label">Tahun <span class="text-danger">*</span></label><input name="year" type="number" class="form-control" value="${esc(fv.year)}" required></div>
          <div class="col-md-4"><label class="form-label">Periode mulai <span class="text-danger">*</span></label><input name="period_start" type="date" class="form-control" value="${esc(fv.period_start)}" required></div>
          <div class="col-md-4"><label class="form-label">Periode selesai <span class="text-danger">*</span></label><input name="period_end" type="date" class="form-control" value="${esc(fv.period_end)}" required><div class="form-text">Harus setelah tanggal mulai</div></div>
          <div class="col-12"><label class="form-label">Deskripsi</label><textarea name="description" class="form-control" rows="3">${esc(fv.description)}</textarea></div>
          <div class="col-12"><button class="btn btn-brand"><i class="bi bi-save"></i> ${isNew ? 'Buat program (DRAFT) & lanjut ke channel' : 'Simpan header'}</button>
            ${!isNew && p.status === 'DRAFT' && !p.registrationCount ? `<a href="#" class="btn btn-link text-danger" data-click="setup.deleteProgram" data-id="${p.id}" data-confirm="Hapus program DRAFT ini beserta seluruh konfigurasinya?"><i class="bi bi-trash"></i> Hapus DRAFT</a>` : ''}</div>
        </div></div></fieldset></form>
      </div>
      </div></div>`;
  }

  route('/setup/new', ({}, q, { year, path }) => {
    UI.requireSetup();
    const pend = UI.takePending(path);
    const fv = pend ? pend.values : { code: '', name: '', program_type_id: (DB.t('programTypes')[0] || {}).id, year, period_start: `${year}-01-01`, period_end: `${year}-12-31`, description: '' };
    return { title: 'Program baru', html: headerPage(null, fv, pend && pend.errors) };
  });
  route('/setup/:id/header', ({ id }, q, { path }) => {
    const p = getProgram(id);
    const pend = UI.takePending(path);
    return { title: 'Header', html: headerPage(p, pend ? Object.assign({}, p, pend.values) : p, pend && pend.errors) };
  });

  actions['setup.header'] = (f, form) => {
    UI.requireSetup();
    const id = Number(form.dataset.id) || null;
    if (id) assertDraft(id);
    const v = { code: String(f.get('code') || '').trim().toUpperCase(), name: String(f.get('name') || '').trim(), program_type_id: Number(f.get('program_type_id')),
      year: Number(f.get('year')), period_start: f.get('period_start'), period_end: f.get('period_end'), description: f.get('description') || null };
    const errs = headerErrors(v, id);
    if (!DB.byId('programTypes', v.program_type_id)) errs.push('Tipe program wajib dipilih.');
    if (errs.length) { UI.retry(errs, f); return; }
    if (!DB.t('years').some((y) => y.year === v.year)) DB.t('years').push({ year: v.year, is_active: true, note: null });
    if (v.year !== UI.currentYear()) UI.session.set({ year: v.year });
    if (id) {
      const p = DB.byId('programs', id);
      const before = { code: p.code, name: p.name, year: p.year, period_start: p.period_start, period_end: p.period_end, program_type_id: p.program_type_id };
      Object.assign(p, v); touch(id);
      E.audit(id, 'program', id, 'update', before, v);
      done('success', 'Header program disimpan.', `/setup/${id}/header`);
      return;
    }
    const p = DB.insert('programs', Object.assign(v, { status: 'DRAFT', published_at: null, published_by: null, cloned_from_program_id: null, lock_version: 1,
      created_by: UI.currentUser().id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
    E.audit(p.id, 'program', p.id, 'create', null, v);
    done('success', 'Program DRAFT dibuat. Lanjut tambahkan channel.', `/setup/${p.id}/channels`);
  };
  actions['setup.addType'] = (f, form) => {
    UI.requireSetup();
    const name = String(f.get('name') || '').trim();
    if (!name) throw new Error('Nama tipe wajib diisi');
    if (DB.t('programTypes').some((t) => t.name.toLowerCase() === name.toLowerCase())) throw new Error('Tipe dengan nama itu sudah ada');
    DB.insert('programTypes', { name, description: f.get('description') || null, is_active: f.has('is_active') });
    done('success', `Tipe program "${esc(name)}" ditambahkan.`, form.dataset.back);
  };
  clicks['setup.toggleType'] = (d) => {
    const t = DB.byId('programTypes', d.tid);
    t.is_active = !t.is_active;
    done('success', `Tipe "${esc(t.name)}" ${t.is_active ? 'diaktifkan' : 'dinonaktifkan'}.`, d.back);
  };
  clicks['setup.deleteProgram'] = (d) => {
    const id = Number(d.id);
    assertDraft(id);
    if (DB.t('registrations').some((x) => x.program_id === id)) throw new Error('Program sudah punya registrasi.');
    E.deleteProgram(id);
    done('success', 'Program DRAFT dihapus.', '/setup');
  };

  // ---------------------------------------------------------------- 2 · channel
  route('/setup/:id/channels', ({ id }) => {
    const p = getProgram(id);
    const avail = DB.t('channels').filter((c) => c.is_active && !p.channels.some((x) => x.channel_code === c.code));
    return {
      title: 'Channel', html: `<div class="cps">${nav(p, 'channels')}
      <div class="row g-3"><div class="col-lg-8"><div class="card"><div class="card-header"><span class="step-chip">2</span>&nbsp;Channel program</div><div class="card-body p-0">
        <table class="table mb-0"><thead><tr><th>Channel</th><th class="num">Brand</th><th class="num">Pilar / LM</th><th>Approval Registration</th><th></th></tr></thead><tbody>
        ${p.channels.map((ch) => `<tr><td class="fw-semibold">${esc(ch.channel_name)} <code class="small">${ch.channel_code}</code></td><td class="num">${ch.brands.length}</td>
          <td class="num">${ch.pillars.length} / ${ch.leadMeasures.length}</td><td>${UI.layerPath(ch.phases.REGISTRATION.layers)}</td>
          <td class="text-right text-nowrap"><a href="#/setup/${p.id}/ch/${ch.id}/eligibility" class="btn btn-sm btn-brand">Konfigurasi</a>
            ${editable(p) ? `<a href="#" class="btn btn-sm btn-link text-danger" data-click="setup.deleteChannel" data-id="${p.id}" data-pc="${ch.id}" data-confirm="Hapus channel ${esc(ch.channel_name)} beserta konfigurasinya?">Hapus</a>` : ''}</td></tr>`).join('')
          || '<tr><td colspan="5" class="text-muted p-4">Belum ada channel.</td></tr>'}</tbody></table></div></div></div>
      <div class="col-lg-4"><div class="card"><div class="card-header">Tambah channel</div><div class="card-body">
        <p class="small text-muted">Satu program bisa punya beberapa channel (tetap dihitung satu program). Setiap channel dapat konfigurasi sendiri di step 3. Satu channel hanya sekali per program.</p>
        ${!editable(p) ? '<div class="small text-muted">Program sudah dipublish. Menambah channel setelah publish <span class="warn-mark" title="Masih dikonfirmasi">⚠</span> masih dikonfirmasi (PRD UF9).</div>'
          : avail.length ? `<form data-action="setup.addChannel" data-id="${p.id}" class="d-flex gap-2"><select name="channel_code" class="form-control">
          ${avail.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join('')}</select><button class="btn btn-brand">Tambah</button></form>
          <div class="form-text">Channel baru langsung berisi preset rumus "${C.PRESET_NAME}", form fase, approval layer contoh & template MOU/SKN. Semua bisa diubah.</div>`
          : '<div class="small text-muted">Semua channel master sudah ditambahkan.</div>'}
      </div></div></div></div></div>`,
    };
  });
  actions['setup.addChannel'] = (f, form) => {
    const pid = Number(form.dataset.id);
    assertDraft(pid);
    const code = f.get('channel_code');
    if (DB.t('programChannels').some((c) => c.program_id === pid && c.channel_code === code)) throw new Error('Channel sudah ada di program ini.');
    const pc = DB.insert('programChannels', { program_id: pid, channel_code: code, pillar_framework_name: 'Vision Compass', monitoring_frequency: 'QUARTERLY',
      elig_min_sell_out_months: null, elig_ratio_min: null, elig_ratio_max: null, elig_ratio_at_registration: false, elig_min_baseline: {}, elig_prior_payout_required: false,
      elig_exclusive_program_ids: [], elig_exceptions: [] });
    E.createChannelDefaults(pc, UI.currentUser().id);
    E.audit(pid, 'programChannel', pc.id, 'create', null, { channel_code: code });
    touch(pid);
    done('success', 'Channel ditambahkan. Lanjut atur eligibility & jadwal.', `/setup/${pid}/ch/${pc.id}/eligibility`);
  };
  clicks['setup.deleteChannel'] = (d) => {
    assertDraft(Number(d.id));
    E.deleteChannel(Number(d.pc));
    E.audit(Number(d.id), 'programChannel', Number(d.pc), 'delete', null, null);
    done('success', 'Channel dihapus.', `/setup/${d.id}/channels`);
  };

  // ---------------------------------------------------------------- 3b · brand
  route('/setup/:id/ch/:pc/brands', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const master = DB.t('brands').filter((b) => b.is_active);
    const inCh = Object.fromEntries(ch.brands.map((b) => [b.brand_code, b]));
    const usedAsMember = new Set(ch.brands.flatMap((b) => b.member_codes || []));
    return {
      title: `Brand · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'brands')}
      <form data-action="setup.saveBrands" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p)}>
      <div class="card"><div class="card-header"><span class="step-chip">3b</span>&nbsp;Brand peserta — ${esc(ch.channel_name)}</div><div class="card-body">
        <p class="small text-muted mb-3">Baseline <strong>tidak</strong> diatur di sini: CBD/CDT mengisi baseline tiap toko di form Registration. EST & IR growth hanya informasi (<span class="warn-mark" title="Definisi masih dikonfirmasi">⚠</span> definisi dikonfirmasi).</p>
        <div class="table-responsive"><table class="table table-sm table-bordered">
          <thead><tr><th style="width:60px">Ikut</th><th>Brand (skema)</th><th>Sub-brand yang memakai skema ini</th><th style="width:120px">EST growth %</th><th style="width:120px">IR growth %</th><th style="width:170px">Baseline minimal / bln</th><th class="num">Kelas</th><th></th></tr></thead>
          <tbody>${master.filter((b) => !usedAsMember.has(b.code) || inCh[b.code]).map((b) => { const x = inCh[b.code];
            return `<tr><td class="text-center"><input type="checkbox" class="form-check-input position-static" name="brand_codes" value="${b.code}" ${chk(!!x)}></td>
              <td class="fw-semibold">${esc(b.name)} <code class="small">${b.code}</code></td>
              <td><div class="d-flex flex-wrap gap-2">${master.filter((m) => m.code !== b.code && !inCh[m.code]).map((m) => `<label class="small mb-0"><input type="checkbox" name="members_${b.code}" value="${m.code}" ${chk(x && (x.member_codes || []).includes(m.code))}> ${esc(m.name)}</label>`).join('') || '<span class="small text-muted">-</span>'}</div></td>
              <td><div class="input-group input-group-sm"><input name="est_${b.code}" type="number" step="any" class="form-control" value="${x && x.est_growth_pct !== null ? x.est_growth_pct : ''}"><span class="input-group-text">%</span></div></td>
              <td><div class="input-group input-group-sm"><input name="ir_${b.code}" type="number" step="any" class="form-control" value="${x && x.ir_growth_pct !== null ? x.ir_growth_pct : ''}"><span class="input-group-text">%</span></div></td>
              <td><div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input name="minb_${b.code}" type="number" class="form-control" value="${(ch.elig_min_baseline || {})[b.code] === undefined || (ch.elig_min_baseline || {})[b.code] === null ? '' : ch.elig_min_baseline[b.code]}"
                placeholder="${x && x.classes[0] ? h.rpShort(x.classes[0].baseline_min) : 'kelas terendah'}"></div></td>
              <td class="num">${x ? x.classes.length : '-'}</td>
              <td class="text-right">${x ? `<a href="#/setup/${p.id}/ch/${ch.id}/brands/${x.id}" class="btn btn-sm btn-outline-brand">Kelas & tier</a>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
        <div class="form-text mb-2">Baseline minimal = syarat pendaftaran per brand (saran baseline toko harus ≥ angka ini). Kosong = batas bawah kelas terendah brand tsb (3c).</div>
        <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan brand</button>
        <span class="form-text d-inline ml-2">Contoh: Light+ memakai skema & target Wardah.</span>
      </div></div></fieldset></form></div></div>`,
    };
  });
  actions['setup.saveBrands'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid);
    const codes = f.all('brand_codes');
    if (!codes.length) throw new Error('Pilih minimal satu brand peserta.');
    const members = Object.fromEntries(codes.map((c) => [c, f.all('members_' + c).filter((m) => !codes.includes(m))]));
    const all = Object.values(members).flat();
    if (new Set(all).size !== all.length) throw new Error('Satu sub-brand hanya boleh ikut satu skema brand.');
    const existing = DB.where('programChannelBrands', (b) => b.program_channel_id === pcId);
    const before = existing.map((b) => b.brand_code);
    for (const b of existing.filter((x) => !codes.includes(x.brand_code))) {
      DB.remove('programClasses', (c) => c.program_channel_brand_id === b.id);
      DB.remove('programChannelBrands', (x) => x.id === b.id);
      DB.remove('programFormulas', (x) => x.program_channel_id === pcId && x.brand_code === b.brand_code);
    }
    codes.forEach((code, i) => {
      const v = { member_codes: members[code], est_growth_pct: toNum(f.get('est_' + code)), ir_growth_pct: toNum(f.get('ir_' + code)), sort_order: i + 1 };
      const ex = existing.find((b) => b.brand_code === code);
      if (ex) Object.assign(ex, v); else DB.insert('programChannelBrands', Object.assign({ program_channel_id: pcId, brand_code: code }, v));
    });
    const pc = DB.byId('programChannels', pcId);
    pc.elig_min_baseline = Object.fromEntries(codes.map((c) => [c, toNum(f.get('minb_' + c))]).filter(([, n]) => n !== null));
    E.audit(pid, 'programChannelBrand', pcId, 'update', before, { brands: codes, min_baseline: pc.elig_min_baseline });
    touch(pid);
    done('success', 'Brand peserta disimpan. Isi kelas & tier tiap brand.', `/setup/${pid}/ch/${pcId}/brands`);
  };

  // ---------------------------------------------------------------- 3c · kelas & tier per brand
  route('/setup/:id/ch/:pc/brands/:b', ({ id, pc, b }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const brand = ch.brands.find((x) => x.id === Number(b));
    if (!brand) fail('Brand tidak ditemukan');
    const state = brand.classes.map((c) => ({ id: c.id, code: c.code, baseline_min: c.baseline_min, baseline_max: c.baseline_max, fix: c.fix_rebate_max_pct,
      tiers: c.tiers.map((t) => ({ g: t.target_growth_pct, cond: t.conditional_rebate_pct, total: t.total_rebate_pct })) }));
    return {
      title: `Kelas ${brand.brand_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'classes')}
      <div class="loop-lane inner mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Ulangi untuk setiap brand</div>
        <div class="d-flex flex-wrap gap-2">${ch.brands.map((x) => `<a class="btn btn-sm ${x.id === brand.id ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/brands/${x.id}">${esc(x.brand_name)} <span class="badge badge-light">${x.classes.length}</span></a>`).join('')}</div></div>
      <div class="row g-3"><div class="col-xl-8">
        <form data-action="setup.saveClasses" data-id="${p.id}" data-pc="${ch.id}" data-b="${brand.id}"><fieldset ${fs(p)}><input type="hidden" name="classes" id="clsJson">
        <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3c</span>&nbsp;Kelas & tier — ${esc(brand.brand_name)}${brand.member_names.length ? ` <span class="small text-muted">(+ ${esc(brand.member_names.join(', '))})</span>` : ''}</span>
          <button type="button" class="btn btn-sm btn-outline-brand" id="addClass"><i class="bi bi-plus"></i> Kelas</button></div>
          <div class="card-body">
            <p class="small text-muted">Batas kelas khusus brand ini (brand lain di channel yang sama punya batas sendiri). Urutan 1 = kelas terendah. Baseline min <strong>inklusif</strong>, maks <strong>eksklusif</strong>, maks kosong = tak terbatas.
              Per tier isi <strong>salah satu</strong>: conditional % atau total %; yang lain dihitung (total = fix maks + conditional). Growth boleh di atas 100%.</p>
            <div id="flags"></div><div id="classes"></div>
            <button class="btn btn-brand mt-2"><i class="bi bi-save"></i> Simpan kelas ${esc(brand.brand_name)}</button>
          </div></div></fieldset></form>
      </div>
      <div class="col-xl-4"><div class="card sticky-summary"><div class="card-header"><i class="bi bi-calculator"></i>&nbsp;Cek cepat</div><div class="card-body">
        <label class="form-label small">Baseline / bulan</label><div class="input-group input-group-sm mb-2"><span class="input-group-text">Rp</span><input type="number" id="qBase" class="form-control" value="200000000"></div>
        <label class="form-label small">Growth komitmen</label><div class="input-group input-group-sm mb-2"><input type="number" id="qGrowth" class="form-control" value="76"><span class="input-group-text">%</span></div>
        <div id="qOut" class="small"></div>
        <div class="form-text">Cek lengkap (rumus, approval path) ada di step 4 Simulasi.</div></div></div></div></div></div></div>`,
      after(root) {
        const el = root.querySelector('#classes');
        const ro = !editable(p);
        const num = (v) => (v === null || v === undefined || v === '' ? '' : v);
        function draw() {
          el.innerHTML = state.map((c, ci) => `<div class="class-card">
            <div class="d-flex flex-wrap gap-2 align-items-end mb-2">
              <div style="width:70px"><label class="form-label small mb-0">Kelas</label><input class="form-control form-control-sm fw-bold" data-c="${ci}" data-f="code" value="${h.esc(c.code)}"></div>
              <div><label class="form-label small mb-0">Urutan</label><div class="form-control form-control-sm bg-light text-center" style="width:56px">${ci + 1}</div></div>
              <div style="flex:1;min-width:150px"><label class="form-label small mb-0">Baseline min / bln (Rp)</label><input type="number" class="form-control form-control-sm" data-c="${ci}" data-f="baseline_min" value="${num(c.baseline_min)}"></div>
              <div style="flex:1;min-width:150px"><label class="form-label small mb-0">Baseline maks / bln (Rp)</label><input type="number" class="form-control form-control-sm" data-c="${ci}" data-f="baseline_max" value="${num(c.baseline_max)}" placeholder="tak terbatas"></div>
              <div style="width:110px"><label class="form-label small mb-0">Fix rebate maks</label><div class="input-group input-group-sm"><input type="number" step="any" class="form-control" data-c="${ci}" data-f="fix" value="${num(c.fix)}"><span class="input-group-text">%</span></div></div>
              <div class="btn-group btn-group-sm"><button type="button" class="btn btn-outline-secondary" data-act="up" data-c="${ci}" ${ci === 0 ? 'disabled' : ''}><i class="bi bi-arrow-up"></i></button>
                <button type="button" class="btn btn-outline-secondary" data-act="down" data-c="${ci}" ${ci === state.length - 1 ? 'disabled' : ''}><i class="bi bi-arrow-down"></i></button>
                <button type="button" class="btn btn-outline-danger" data-act="delC" data-c="${ci}"><i class="bi bi-trash"></i></button></div>
            </div>
            <table class="table table-sm table-bordered mb-1"><thead><tr><th>Tier</th><th>Target growth %</th><th>Conditional rebate %</th><th>Total rebate %</th><th></th></tr></thead><tbody>
              ${c.tiers.map((t, ti) => `<tr><td class="text-center">${ti + 1}</td>
                <td><input type="number" step="any" class="form-control form-control-sm" data-c="${ci}" data-t="${ti}" data-f="g" value="${num(t.g)}"></td>
                <td><input type="number" step="any" class="form-control form-control-sm" data-c="${ci}" data-t="${ti}" data-f="cond" value="${num(t.cond)}"></td>
                <td><input type="number" step="any" class="form-control form-control-sm" data-c="${ci}" data-t="${ti}" data-f="total" value="${num(t.total)}"></td>
                <td class="text-center"><button type="button" class="btn btn-sm btn-link text-danger p-0" data-act="delT" data-c="${ci}" data-t="${ti}"><i class="bi bi-x-lg"></i></button></td></tr>`).join('')}
            </tbody></table><button type="button" class="btn btn-sm btn-link px-0" data-act="addT" data-c="${ci}">+ tier</button></div>`).join('')
            || '<div class="text-muted small">Belum ada kelas.</div>';
          if (ro) el.querySelectorAll('input,button').forEach((x) => { x.disabled = true; });
          flags();
        }
        const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
        function flags() {
          const msgs = [];
          const s = state.map((c) => ({ code: c.code, min: n(c.baseline_min), max: n(c.baseline_max) })).filter((c) => c.min !== null).sort((a, b) => a.min - b.min);
          for (let i = 1; i < s.length; i++) {
            if (s[i - 1].max === null || s[i - 1].max > s[i].min) msgs.push(`Range kelas ${s[i - 1].code} & ${s[i].code} tumpang tindih`);
            else if (s[i - 1].max < s[i].min) msgs.push(`Celah baseline antara kelas ${s[i - 1].code} & ${s[i].code} (peringatan)`);
          }
          if (state.filter((c) => n(c.baseline_max) === null).length > 1) msgs.push('Lebih dari satu kelas tanpa batas atas');
          state.forEach((c) => c.tiers.forEach((t, i) => {
            if (i && n(t.g) !== null && n(c.tiers[i - 1].g) !== null && n(t.g) <= n(c.tiers[i - 1].g)) msgs.push(`Kelas ${c.code}: target growth tier ${i + 1} tidak naik`);
            if (i && n(t.total) !== null && n(c.tiers[i - 1].total) !== null && n(t.total) < n(c.tiers[i - 1].total)) msgs.push(`Kelas ${c.code}: rebate tier ${i + 1} turun`);
          }));
          root.querySelector('#flags').innerHTML = msgs.length ? `<div class="alert alert-warning py-2 small">${msgs.map(h.esc).join('<br>')}</div>` : '';
          quick();
        }
        function quick() {
          const v = Number(root.querySelector('#qBase').value); const g = Number(root.querySelector('#qGrowth').value);
          const cls = state.find((c) => n(c.baseline_min) !== null && v >= n(c.baseline_min) && (n(c.baseline_max) === null || v < n(c.baseline_max)));
          const out = root.querySelector('#qOut');
          if (!cls) { out.innerHTML = '<span class="text-danger">Tidak masuk kelas mana pun → tidak eligible untuk brand ini.</span>'; return; }
          let tier = null; cls.tiers.forEach((t) => { if (n(t.g) !== null && g >= n(t.g)) tier = t; });
          out.innerHTML = `Kelas ${h.cls(cls.code)} · ${tier ? `tier ${tier.g}% → total <strong>${tier.total}%</strong> (fix ${cls.fix}% + conditional ${tier.cond}%)` : 'di bawah tier 1 → conditional 0'}`;
        }
        el.addEventListener('input', (e) => {
          const d = e.target.dataset; if (!d.f) return;
          const c = state[d.c];
          if (d.t === undefined) { c[d.f] = e.target.value; }
          else {
            const t = c.tiers[d.t]; t[d.f] = e.target.value;
            const fix = n(c.fix) || 0;
            const other = (k, val) => { t[k] = val; const inp = el.querySelector(`[data-c="${d.c}"][data-t="${d.t}"][data-f="${k}"]`); if (inp) inp.value = val; };
            if (d.f === 'total' && e.target.value !== '') other('cond', +(Number(e.target.value) - fix).toFixed(4));
            if (d.f === 'cond' && e.target.value !== '') other('total', +(Number(e.target.value) + fix).toFixed(4));
          }
          if (d.f === 'fix') c.tiers.forEach((t, ti) => { if (t.total !== '' && t.total !== null) { t.cond = +(Number(t.total) - (n(c.fix) || 0)).toFixed(4); const inp = el.querySelector(`[data-c="${d.c}"][data-t="${ti}"][data-f="cond"]`); if (inp) inp.value = t.cond; } });
          flags();
        });
        el.addEventListener('click', (e) => {
          const b2 = e.target.closest('[data-act]'); if (!b2) return;
          const d = b2.dataset; const ci = Number(d.c);
          if (d.act === 'addT') { const last = state[ci].tiers[state[ci].tiers.length - 1]; state[ci].tiers.push({ g: last ? Number(last.g) + 5 : '', cond: '', total: '' }); }
          if (d.act === 'delT') state[ci].tiers.splice(Number(d.t), 1);
          if (d.act === 'delC' && confirm(`Hapus kelas ${state[ci].code}?`)) state.splice(ci, 1);
          if (d.act === 'up' || d.act === 'down') { const j = d.act === 'up' ? ci - 1 : ci + 1; [state[ci], state[j]] = [state[j], state[ci]]; }
          draw();
        });
        root.querySelector('#addClass').addEventListener('click', () => {
          const last = state[state.length - 1];
          state.push({ id: null, code: last ? String.fromCharCode(last.code.charCodeAt(0) + 1) : 'A', baseline_min: last ? last.baseline_max : '', baseline_max: '', fix: last ? last.fix : 1,
            tiers: last ? last.tiers.map((t) => ({ ...t })) : [{ g: 50, cond: '', total: '' }] });
          draw();
        });
        ['#qBase', '#qGrowth'].forEach((s) => root.querySelector(s).addEventListener('input', quick));
        root.querySelector('#clsJson').closest('form').addEventListener('submit', () => { root.querySelector('#clsJson').value = JSON.stringify(state); }, true);
        if (ro) root.querySelector('#addClass').disabled = true;
        draw();
      },
    };
  });

  actions['setup.saveClasses'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const bId = Number(form.dataset.b);
    assertDraft(pid);
    const raw = JSON.parse(f.get('classes') || '[]');
    const n = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    const errs = [];
    const rows = raw.map((c, i) => {
      const code = String(c.code || '').trim();
      const fix = n(c.fix);
      if (!code) errs.push(`Kelas urutan ${i + 1}: kode wajib diisi`);
      if (n(c.baseline_min) === null) errs.push(`Kelas ${code}: baseline min wajib diisi`);
      if (fix === null) errs.push(`Kelas ${code}: fix rebate maks wajib diisi`);
      const tiers = (c.tiers || []).map((t, ti) => {
        const g = n(t.g); let cond = n(t.cond); let total = n(t.total);
        if (g === null) errs.push(`Kelas ${code} tier ${ti + 1}: target growth wajib`);
        if (cond === null && total === null) errs.push(`Kelas ${code} tier ${ti + 1}: isi conditional % atau total %`);
        if (cond === null && total !== null) cond = +(total - (fix || 0)).toFixed(4);
        if (total === null && cond !== null) total = +(cond + (fix || 0)).toFixed(4);
        if (cond !== null && total !== null && Math.abs(total - (cond + (fix || 0))) > 0.0001) errs.push(`Kelas ${code} tier ${ti + 1}: total ${total}% tidak sama dengan fix ${fix}% + conditional ${cond}%`);
        return { tier_no: ti + 1, target_growth_pct: g, conditional_rebate_pct: cond, total_rebate_pct: total };
      });
      if (!tiers.length) errs.push(`Kelas ${code}: minimal 1 tier`);
      return { id: c.id, code, sort_order: i + 1, baseline_min: n(c.baseline_min), baseline_max: n(c.baseline_max), fix_rebate_max_pct: fix, tiers };
    });
    if (new Set(rows.map((r) => r.code)).size !== rows.length) errs.push('Kode kelas tidak boleh sama dalam satu brand');
    if (errs.length) throw new Error(errs.slice(0, 8).join(' · '));
    const before = DB.where('programClasses', (c) => c.program_channel_brand_id === bId);
    DB.remove('programClasses', (c) => c.program_channel_brand_id === bId);
    for (const r of rows) { delete r.id; DB.insert('programClasses', Object.assign({ program_channel_brand_id: bId }, r)); }
    E.audit(pid, 'programClass', bId, 'replace', before, rows);
    touch(pid);
    const brand = DB.byId('programChannelBrands', bId);
    done('success', `Kelas & tier ${esc(brand.brand_code)} disimpan (${rows.length} kelas). Peringatan tumpang tindih/celah dicek ulang di step 5.`, `/setup/${pid}/ch/${pcId}/brands/${bId}`);
  };

  // ---------------------------------------------------------------- 3c · pillar framework
  // 3c dua langkah: (1) struktur pilar → JTBD → lead measure per channel, (2) target tiap lead measure per brand × kelas (× section)
  function pillarTabs(p, ch, active) {
    const done = (b) => b.classes.filter((c) => (b.lm_targets || {})[c.code]).length;
    return `<div class="loop-lane inner mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Struktur sekali per channel, lalu target per kelas untuk setiap brand</div>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <a class="btn btn-sm ${active === 'tree' ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/pillars"><i class="bi bi-diagram-3"></i> 1. Struktur pilar</a>
        <span class="small text-muted ml-2">2. Target per kelas:</span>
        ${ch.brands.map((b) => `<a class="btn btn-sm ${active === b.id ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/pillars/${b.id}">${esc(b.brand_name)}
          <span class="badge ${b.classes.length && done(b) === b.classes.length ? 'badge-success' : 'badge-light'}">${done(b)}/${b.classes.length}</span></a>`).join('') || '<span class="small text-muted">Pilih brand dulu di 3b.</span>'}
      </div></div>`;
  }

  route('/setup/:id/ch/:pc/pillars', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const tree = ch.pillars.map((pl) => ({ id: pl.id, name: pl.name, jtbds: pl.jtbds.map((j) => ({ id: j.id, name: j.name,
      lms: j.lead_measures.map((l) => ({ id: l.id, name: l.name, description: l.description, unit: l.unit, value_type: l.value_type })) })) }));
    return {
      title: `Pilar · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'pillars')}
      ${pillarTabs(p, ch, 'tree')}
      <form data-action="setup.savePillars" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p)}><input type="hidden" name="tree" id="treeJson">
      <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3d</span>&nbsp;Pillar framework — ${esc(ch.channel_name)}</span>
        <button type="button" class="btn btn-sm btn-outline-brand" id="addPillar"><i class="bi bi-plus"></i> Pilar</button></div>
        <div class="card-body">
          <div class="row g-2 mb-3"><div class="col-md-5"><label class="form-label">Nama framework <span class="text-danger">*</span></label>
            <input name="framework" class="form-control" value="${esc(ch.pillar_framework_name)}" required placeholder="Vision Compass"><div class="form-text">Juga dipakai sebagai label Fix Rebate.</div></div>
            <div class="col-md-7 small text-muted pt-md-4">Pilar → JTBD → Lead measure berlaku untuk semua brand di channel ini. Angka target (mis. 2 jam / 4 jam) diisi per brand × kelas di langkah 2; evidence diunggah di fase Monitoring.
              Tanpa bobot (sama seperti 2026): Fix Rebate dibayar per termin bila Monitoring periodenya disetujui (rumus <code>pillar_score</code> di 3d). Referensi 2026: 3 pilar → 5 JTBD → 11 lead measure.</div></div>
          <div id="tree"></div><div id="wsum" class="small mt-2"></div>
          <datalist id="lmUnits">${['jam', 'etalase', 'bulan', 'creator', 'slide', 'video', 'sesi/minggu', 'SKU', 'toko', 'kali', 'orang/bulan'].map((u) => `<option value="${u}">`).join('')}</datalist>
          <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan pillar framework</button>
        </div></div></fieldset></form></div></div>`,
      after(root) {
        const el = root.querySelector('#tree');
        const t = tree;
        const ro = !editable(p);
        const opt = (cur) => Object.entries(C.LM_VALUE_TYPES).map(([k, v]) => `<option value="${k}" ${sel(cur === k)}>${v}</option>`).join('');
        // Satuan: bebas untuk Angka (jam, etalase, bulan, …); otomatis % untuk Persentase; tidak dipakai untuk Teks
        const unitInput = (l, a) => (l.value_type === 'PERCENT' ? '<input class="form-control bg-light" style="flex:1.3" value="%" disabled title="Persentase selalu %">'
          : l.value_type === 'TEXT' ? '<input class="form-control bg-light" style="flex:1.3" value="" placeholder="(target berupa teks)" disabled>'
          : `<input class="form-control" style="flex:1.3" ${a} data-f="unit" value="${h.esc(l.unit)}" list="lmUnits" placeholder="satuan, mis. jam / etalase">`);
        function draw() {
          el.innerHTML = t.map((pl, pi) => `<div class="tree-pillar pl-2 mb-3">
            <div class="input-group input-group-sm mb-1"><span class="input-group-text"><i class="bi bi-flag"></i>&nbsp;${pi + 1}</span>
              <input class="form-control fw-semibold" style="flex:4" data-p="${pi}" data-f="name" value="${h.esc(pl.name)}" placeholder="Nama pilar">
              <button type="button" class="btn btn-outline-brand" data-act="addJ" data-p="${pi}">+ JTBD</button>
              <button type="button" class="btn btn-outline-danger" data-act="delP" data-p="${pi}"><i class="bi bi-trash"></i></button></div>
            ${pl.jtbds.map((j, ji) => `<div class="tree-jtbd pl-2 mb-2">
              <div class="input-group input-group-sm mb-1"><span class="input-group-text">JTBD</span>
                <input class="form-control" data-p="${pi}" data-j="${ji}" data-f="name" value="${h.esc(j.name)}" placeholder="Job to be done">
                <button type="button" class="btn btn-outline-brand" data-act="addL" data-p="${pi}" data-j="${ji}">+ Lead measure</button>
                <button type="button" class="btn btn-outline-danger" data-act="delJ" data-p="${pi}" data-j="${ji}"><i class="bi bi-trash"></i></button></div>
              ${j.lms.length ? '<div class="tree-lm lm-head"><span style="flex:4">Lead measure</span><span style="flex:1.3">Satuan <span class="fw-normal">(bukan angka target)</span></span><span style="flex:1.2">Tipe</span><span class="lm-head-x"></span></div>' : ''}
              ${j.lms.map((l, li) => `<div class="tree-lm input-group input-group-sm mb-1">
                <input class="form-control" style="flex:4" data-p="${pi}" data-j="${ji}" data-l="${li}" data-f="name" value="${h.esc(l.name)}" placeholder="Lead measure *">
                ${unitInput(l, `data-p="${pi}" data-j="${ji}" data-l="${li}"`)}
                <select class="form-control" style="flex:1.2" data-p="${pi}" data-j="${ji}" data-l="${li}" data-f="value_type">${opt(l.value_type)}</select>
                <button type="button" class="btn btn-outline-danger" data-act="delL" data-p="${pi}" data-j="${ji}" data-l="${li}"><i class="bi bi-x"></i></button></div>`).join('')}
            </div>`).join('')}</div>`).join('') || '<div class="text-muted small">Belum ada pilar.</div>';
          if (ro) el.querySelectorAll('input,select,button').forEach((x) => { x.disabled = true; });
          wsum();
        }
        function wsum() {
          const nJ = t.reduce((a, pl) => a + pl.jtbds.length, 0); const nL = t.reduce((a, pl) => a + pl.jtbds.reduce((b, j) => b + j.lms.length, 0), 0);
          root.querySelector('#wsum').innerHTML = `${t.length} pilar → ${nJ} JTBD → ${nL} lead measure`;
        }
        el.addEventListener('input', (e) => {
          const d = e.target.dataset; if (!d.f) return;
          let o = t[d.p]; if (d.j !== undefined) o = o.jtbds[d.j]; if (d.l !== undefined) o = o.lms[d.l];
          o[d.f] = e.target.value; wsum();
          if (d.f === 'value_type') draw(); // kolom satuan menyesuaikan tipe
        });
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const d = b.dataset;
          if (d.act === 'addJ') t[d.p].jtbds.push({ name: '', lms: [] });
          if (d.act === 'addL') t[d.p].jtbds[d.j].lms.push({ name: '', description: null, unit: '', value_type: 'NUMBER' });
          if (d.act === 'delP' && confirm('Hapus pilar beserta JTBD & lead measure-nya?')) t.splice(d.p, 1);
          if (d.act === 'delJ' && confirm('Hapus JTBD beserta lead measure-nya?')) t[d.p].jtbds.splice(d.j, 1);
          if (d.act === 'delL') t[d.p].jtbds[d.j].lms.splice(d.l, 1);
          draw();
        });
        root.querySelector('#addPillar').addEventListener('click', () => { t.push({ name: '', jtbds: [{ name: '', lms: [] }] }); draw(); });
        if (ro) root.querySelector('#addPillar').disabled = true;
        root.querySelector('#treeJson').closest('form').addEventListener('submit', () => { root.querySelector('#treeJson').value = JSON.stringify(t); }, true);
        draw();
      },
    };
  });

  actions['setup.savePillars'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid);
    const tree = JSON.parse(f.get('tree') || '[]');
    const framework = String(f.get('framework') || '').trim();
    if (!framework) throw new Error('Nama framework wajib diisi');
    const errs = [];
    tree.forEach((pl, pi) => {
      if (!String(pl.name || '').trim()) errs.push(`Pilar ${pi + 1}: nama wajib`);
      pl.jtbds.forEach((j) => {
        if (!String(j.name || '').trim()) errs.push(`Pilar "${pl.name}": ada JTBD tanpa nama`);
        if (!j.lms.length) errs.push(`JTBD "${j.name}": minimal 1 lead measure`);
        j.lms.forEach((l) => {
          if (!String(l.name || '').trim()) errs.push(`JTBD "${j.name}": ada lead measure tanpa nama`);
          const unit = String(l.unit || '').trim();
          if (C.lmType(l.value_type) !== 'NUMBER') return;
          if (!unit) errs.push(`Lead measure "${l.name}": satuan wajib untuk tipe Angka`);
          else if (/^[\d.,\s]+$/.test(unit)) errs.push(`Lead measure "${l.name}": satuan "${unit}" berupa angka. Isi satuannya (mis. jam, etalase); angka target diisi di Target per kelas`);
        });
      });
      if (!pl.jtbds.length) errs.push(`Pilar "${pl.name}": minimal 1 JTBD`);
    });
    if (errs.length) throw new Error(errs.slice(0, 8).join(' · '));
    const pc = DB.byId('programChannels', pcId);
    const before = { framework: pc.pillar_framework_name };
    pc.pillar_framework_name = framework;
    // Lead measure lama dipertahankan id-nya (evidence monitoring merujuk id ini)
    const oldP = DB.where('programPillars', (x) => x.program_channel_id === pcId).map((x) => x.id);
    const oldJ = DB.where('programJtbds', (x) => oldP.includes(x.program_pillar_id)).map((x) => x.id);
    const oldL = DB.where('programLeadMeasures', (x) => oldJ.includes(x.program_jtbd_id)).map((x) => x.id);
    const kP = []; const kJ = []; const kL = [];
    tree.forEach((pl, pi) => {
      const pv = { program_channel_id: pcId, name: pl.name.trim(), sort_order: pi + 1, weight_pct: null };
      let pr = oldP.includes(pl.id) && DB.byId('programPillars', pl.id);
      if (pr) Object.assign(pr, pv); else pr = DB.insert('programPillars', pv);
      kP.push(pr.id);
      pl.jtbds.forEach((j, ji) => {
        const jv = { program_pillar_id: pr.id, name: j.name.trim(), sort_order: ji + 1 };
        let jr = oldJ.includes(j.id) && DB.byId('programJtbds', j.id);
        if (jr) Object.assign(jr, jv); else jr = DB.insert('programJtbds', jv);
        kJ.push(jr.id);
        j.lms.forEach((l, li) => {
          const type = C.lmType(l.value_type);
          const lv = { program_jtbd_id: jr.id, name: l.name.trim(), description: l.description || null, unit: type === 'NUMBER' ? String(l.unit || '').trim() || null : null,
            value_type: type, weight_pct: null, sort_order: li + 1 };
          let lr = oldL.includes(l.id) && DB.byId('programLeadMeasures', l.id);
          if (lr) Object.assign(lr, lv); else lr = DB.insert('programLeadMeasures', lv);
          kL.push(lr.id);
        });
      });
    });
    DB.remove('programLeadMeasures', (x) => oldL.includes(x.id) && !kL.includes(x.id));
    DB.remove('programJtbds', (x) => oldJ.includes(x.id) && !kJ.includes(x.id));
    DB.remove('programPillars', (x) => oldP.includes(x.id) && !kP.includes(x.id));
    E.audit(pid, 'programPillar', pcId, 'replace', before, { framework, pillars: tree.length, lead_measures: kL.length });
    touch(pid);
    done('success', `Pillar framework "${esc(framework)}" disimpan (${kP.length} pilar, ${kJ.length} JTBD, ${kL.length} lead measure). Lanjut isi target per kelas tiap brand.`, `/setup/${pid}/ch/${pcId}/pillars`);
  };

  // ---------------------------------------------------------------- 3c (2) · target lead measure per brand × kelas (× section)
  // Tabel seperti Excel Vision Compass: Pilar · JTBD · Lead measure dibekukan di kiri, tiap kelas = kolom (section = sub-kolom).
  // Sel kosong = lead measure tidak berlaku untuk kelas/section itu. Data tetap programChannelBrands.lm_targets.
  route('/setup/:id/ch/:pc/pillars/:b', ({ id, pc, b }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const brand = ch.brands.find((x) => x.id === Number(b));
    if (!brand) fail('Brand tidak ditemukan');
    const lms = ch.leadMeasures;
    const saved = brand.lm_targets || {};
    // state per kode kelas; cells sejajar dengan sections (tanpa section / "gabung" → cells[0]; null = kosong / tidak berlaku)
    const state = Object.fromEntries(brand.classes.map((c) => {
      const t = saved[c.code];
      return [c.code, { configured: !!t, sections: ((t && t.sections) || []).slice(),
        rows: Object.fromEntries(lms.map((l) => {
          const r = t && (t.rows || {})[l.id];
          return [l.id, r ? { off: !!r.off, same: !!r.same, cells: JSON.parse(JSON.stringify(r.cells || [])) } : { off: true, same: false, cells: [] }];
        })) }];
    }));
    const empty = !brand.classes.length ? `Brand ini belum punya kelas. <a href="#/setup/${p.id}/ch/${ch.id}/brands/${brand.id}">Isi kelas di 3c</a>.`
      : !lms.length ? `Channel belum punya lead measure. <a href="#/setup/${p.id}/ch/${ch.id}/pillars">Isi struktur pilar dulu</a>.` : '';
    return {
      title: `Target pilar ${brand.brand_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'pillars')}
      ${pillarTabs(p, ch, brand.id)}
      <form data-action="setup.saveLmTargets" data-id="${p.id}" data-pc="${ch.id}" data-b="${brand.id}"><fieldset ${fs(p)}><input type="hidden" name="targets" id="lmtJson">
      <div class="card"><div class="card-header"><span class="step-chip">3d</span>&nbsp;Target lead measure per kelas — ${esc(brand.brand_name)}${brand.member_names.length ? ` <span class="small text-muted">(+ ${esc(brand.member_names.join(', '))})</span>` : ''}</div>
        <div class="card-body">${empty ? `<div class="text-muted">${empty}</div>` : `
          <p class="small text-muted">Isi target tiap lead measure per kelas langsung di tabel. <strong>Sel kosong = tidak berlaku</strong> untuk kelas itu. Satuan mengikuti struktur pilar; operator (Minimal / Maksimal / = / Teks) dipilih sekali di kolom Lead measure dan berlaku untuk semua kelas.
            Bila kelas dibagi lagi (mis. Wardah: <em>Face Care</em> &amp; <em>Makeup</em>), klik <i class="bi bi-plus"></i> Section di judul kelas; tombol <i class="bi bi-arrows-collapse-vertical"></i> menggabung section jadi satu target (mis. "Have a Store Community Affiliate").</p>
          <div class="d-flex justify-content-between align-items-center mb-1 small text-muted"><span><i class="bi bi-arrows-expand-vertical"></i> Tarik garis di tepi kanan judul kolom untuk melebarkan / mengecilkan kolom: judul <em>Class</em> = seluruh kelas, judul section / Target = kolom itu saja.</span>
            <button type="button" class="btn btn-sm btn-link p-0" id="lmtResetW">Reset lebar kolom</button></div>
          <div class="lmt-sheet-wrap"><table class="lmt-sheet" id="lmtSheet"></table></div>
          <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan target ${esc(brand.brand_name)}</button>`}
        </div></div></fieldset></form></div></div>`,
      after(root) {
        if (empty) return;
        const ro = !editable(p);
        const box = root.querySelector('#lmtJson').closest('form');
        const v = (x) => (x === null || x === undefined ? '' : x);
        const lmOf = (idv) => lms.find((l) => l.id === Number(idv));
        const multi = (s) => s.sections.length > 1;
        const ncol = (s) => Math.max(1, s.sections.length);
        const range = (n) => Array.from({ length: n }, (_, i) => i);
        // operator satu per lead measure untuk brand ini (berlaku di semua kelas & section); diambil dari sel tersimpan pertama
        const rowOps = Object.fromEntries(lms.map((l) => {
          const ops = C.lmTargetOps(l.value_type);
          const found = brand.classes.map((c) => state[c.code].rows[l.id]).flatMap((r) => (r.off ? [] : r.cells)).find((x) => x && ops.includes(x.op));
          return [l.id, found ? found.op : ops[0]];
        }));
        const newCell = (l) => ({ op: rowOps[l.id], value: '', text: '' });
        // sel yang ditampilkan di kolom i (null = kosong)
        const cellAt = (s, r, i) => (r.off ? null : !multi(s) || r.same ? r.cells[0] || null : r.cells[i] || null);
        // pastikan ada objek sel untuk diketik (sel kosong → baris jadi berlaku)
        function ensureCell(code, l, i) {
          const s = state[code]; const r = s.rows[l.id];
          if (r.off) { r.off = false; r.same = false; r.cells = range(multi(s) ? ncol(s) : 1).map(() => null); }
          const k = !multi(s) || r.same ? 0 : i;
          if (!r.cells[k]) r.cells[k] = newCell(l);
          r.cells[k].op = rowOps[l.id];
          s.configured = true;
          return r.cells[k];
        }

        // ---- lebar kolom: bisa ditarik, diingat per brand di browser ini (bukan data program)
        const WKEY = `tradee-lmt-widths-${brand.id}`;
        const DEF_W = { f1: 150, f2: 210, f3: 240 };
        let W = {};
        try { W = JSON.parse(localStorage.getItem(WKEY)) || {}; } catch (e) { W = {}; }
        const colW = (k) => W[k] || DEF_W[k] || 240;
        const saveW = () => { try { localStorage.setItem(WKEY, JSON.stringify(W)); } catch (e) { /* abaikan */ } };
        const colKeys = () => ['f1', 'f2', 'f3', ...brand.classes.flatMap((c) => range(ncol(state[c.code])).map((i) => `${c.code}:${i}`))];
        const fit = (el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 2}px`; };
        function applyWidths() {
          const t = root.querySelector('#lmtSheet');
          t.querySelectorAll('col[data-col]').forEach((col) => { col.style.width = `${colW(col.dataset.col)}px`; });
          t.style.setProperty('--w1', `${colW('f1')}px`);
          t.style.setProperty('--w2', `${colW('f2')}px`);
          t.style.width = `${colKeys().reduce((sum, k) => sum + colW(k), 0)}px`;
        }
        const rs = (k) => (ro ? '' : `<span class="lmt-rs" data-rs="${h.esc(k)}" title="Tarik untuk ubah lebar kolom"></span>`);

        function cellHtml(code, l, i, merged) {
          const s = state[code]; const r = s.rows[l.id];
          const c = cellAt(s, r, i);
          const op = rowOps[l.id];
          const a = `data-c="${h.esc(code)}" data-l="${l.id}" data-i="${i}"`;
          const unit = C.lmUnit(l);
          const mergeBtn = multi(s) && (merged || i === 0)
            ? `<button type="button" class="lmt-merge" data-act="${merged ? 'split' : 'merge'}" ${a} title="${merged ? 'Pisahkan per section' : 'Gabung semua section jadi satu target'}"><i class="bi bi-${merged ? 'arrows-expand-vertical' : 'arrows-collapse-vertical'}"></i></button>` : '';
          return `<div class="lmt-cell${c ? '' : ' is-empty'}${op === 'TEXT' ? ' is-text' : ''}">
            ${op === 'TEXT' ? `<textarea class="lmt-in txt" rows="1" ${a} data-f="text" placeholder="${l.value_type === 'TEXT' ? 'teks target' : 'teks'}">${h.esc(c ? c.text : '')}</textarea>`
              : `<input type="number" step="any" class="lmt-in num" ${a} data-f="value" value="${v(c ? c.value : '')}" placeholder="–"><span class="lmt-unit" title="${h.esc(unit)}">${h.esc(unit)}</span>`}
            ${mergeBtn}</div>`;
        }

        function draw() {
          const cls = brand.classes;
          // rowspan pilar & JTBD (lead measure sudah terurut pilar → JTBD)
          const span = (key) => lms.reduce((m, l) => { m[key(l)] = (m[key(l)] || 0) + 1; return m; }, {});
          const pSpan = span((l) => l.pillar_id); const jSpan = span((l) => `${l.pillar_id}|${l.jtbd_name}`);
          const head1 = cls.map((c) => { const s = state[c.code];
            return `<th colspan="${ncol(s)}" class="lmt-class">${rs(`cls:${c.code}`)}Class ${h.esc(c.code)}<div class="lmt-class-sub">${h.rpShort(c.baseline_min)} – ${c.baseline_max === null || c.baseline_max === undefined ? '∞' : h.rpShort(c.baseline_max)}</div>
              ${ro ? '' : `<div class="lmt-class-act"><button type="button" class="btn btn-link btn-sm p-0" data-act="addSec" data-c="${h.esc(c.code)}"><i class="bi bi-plus"></i> Section</button>
                ${s.sections.length ? `<button type="button" class="btn btn-link btn-sm p-0" data-act="secAll" data-c="${h.esc(c.code)}" title="Pakai section kelas ini di semua kelas"><i class="bi bi-files"></i> ke semua kelas</button>` : ''}</div>`}</th>`; }).join('');
          const head2 = cls.map((c) => { const s = state[c.code];
            return s.sections.length ? s.sections.map((x, i) => `<th class="lmt-sec${i ? '' : ' lmt-gstart'}"><div class="d-flex align-items-center gap-1"><input class="lmt-sec-in" data-sec="${i}" data-c="${h.esc(c.code)}" value="${h.esc(x)}" placeholder="nama section">
              ${ro ? '' : `<button type="button" class="lmt-merge text-danger" data-act="delSec" data-c="${h.esc(c.code)}" data-i="${i}" title="Hapus section"><i class="bi bi-x"></i></button>`}</div>${rs(`${c.code}:${i}`)}</th>`).join('')
              : `<th class="lmt-sec lmt-gstart">Target${rs(`${c.code}:0`)}</th>`; }).join('');
          let lastP = null; let lastJ = null;
          const body = lms.map((l) => {
            const jk = `${l.pillar_id}|${l.jtbd_name}`;
            const pc1 = l.pillar_id !== lastP ? `<td class="fz fz1" rowspan="${pSpan[l.pillar_id]}">${h.esc(l.pillar_name)}</td>` : '';
            const pc2 = jk !== lastJ ? `<td class="fz fz2" rowspan="${jSpan[jk]}">${h.esc(l.jtbd_name)}</td>` : '';
            lastP = l.pillar_id; lastJ = jk;
            const cells = cls.map((c) => { const s = state[c.code]; const r = s.rows[l.id];
              if (multi(s) && !r.off && r.same) return `<td colspan="${ncol(s)}" class="lmt-merged lmt-gstart">${cellHtml(c.code, l, 0, true)}</td>`;
              return range(ncol(s)).map((i) => `<td${i ? '' : ' class="lmt-gstart"'}>${cellHtml(c.code, l, i, false)}</td>`).join(''); }).join('');
            const ops = C.lmTargetOps(l.value_type);
            const opSel = ops.length > 1 ? `<select class="lmt-op" data-rowop="${l.id}" title="Operator untuk semua kelas">${ops.map((o) => `<option value="${o}" ${sel(rowOps[l.id] === o)}>${C.LM_TARGET_OPS[o]}</option>`).join('')}</select>` : '';
            return `<tr>${pc1}${pc2}<td class="fz fz3"><div class="lmt-lm"><span>${h.esc(l.name)}</span>${opSel}</div></td>${cells}</tr>`;
          }).join('');
          root.querySelector('#lmtSheet').innerHTML = `<colgroup>${colKeys().map((k) => `<col data-col="${h.esc(k)}">`).join('')}</colgroup>
            <thead><tr class="lmt-hr1"><th rowspan="2" class="fz fz1">Pilar${rs('f1')}</th><th rowspan="2" class="fz fz2">JTBD${rs('f2')}</th><th rowspan="2" class="fz fz3">Lead measure${rs('f3')}</th>${head1}</tr>
            <tr class="lmt-hr2">${head2}</tr></thead><tbody>${body}</tbody>`;
          applyWidths();
          root.querySelectorAll('#lmtSheet textarea.txt').forEach(fit);
          if (ro) root.querySelectorAll('#lmtSheet input,#lmtSheet select,#lmtSheet button,#lmtSheet textarea').forEach((x) => { x.disabled = true; });
        }

        // tarik tepi judul kolom → ubah lebar. Listener dokumen dipasang sekali dan menunjuk ke halaman yang sedang tampil.
        let drag = null;
        box.addEventListener('mousedown', (e) => {
          const hd = e.target.closest('.lmt-rs'); if (!hd) return;
          e.preventDefault();
          const key = hd.dataset.rs;
          // judul kelas → semua kolom section kelas itu ikut melebar/menyempit sebanding
          const parts = key.startsWith('cls:') ? range(ncol(state[key.slice(4)])).map((i) => `${key.slice(4)}:${i}`) : [key];
          drag = { x: e.clientX, parts: parts.map((k) => ({ k, w: colW(k) })) };
          document.body.classList.add('lmt-resizing');
        });
        window.lmtResize = {
          move(e) {
            if (!drag) return;
            const sum = drag.parts.reduce((t, x) => t + x.w, 0);
            const dx = e.clientX - drag.x;
            drag.parts.forEach((x) => { W[x.k] = Math.round(Math.max(110, Math.min(900, x.w + dx * (x.w / sum)))); });
            applyWidths();
          },
          up() { if (!drag) return; drag = null; document.body.classList.remove('lmt-resizing'); saveW(); root.querySelectorAll('#lmtSheet textarea.txt').forEach(fit); },
        };
        if (!window.lmtResizeBound) {
          window.lmtResizeBound = true;
          document.addEventListener('mousemove', (e) => window.lmtResize && window.lmtResize.move(e));
          document.addEventListener('mouseup', () => window.lmtResize && window.lmtResize.up());
        }
        const fitAll = () => root.querySelectorAll('#lmtSheet textarea.txt').forEach(fit);
        let lastW = 0; // hanya saat lebar berubah (perubahan tinggi akibat fit tidak memicu ulang)
        if (window.ResizeObserver) new ResizeObserver(([en]) => { const w = Math.round(en.contentRect.width); if (w !== lastW) { lastW = w; fitAll(); } }).observe(root.querySelector('#lmtSheet'));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
        root.querySelector('#lmtResetW').addEventListener('click', () => { W = {}; saveW(); applyWidths(); root.querySelectorAll('#lmtSheet textarea.txt').forEach(fit); });

        box.addEventListener('input', (e) => {
          const d = e.target.dataset;
          if (d.sec !== undefined) { state[d.c].sections[Number(d.sec)] = e.target.value; state[d.c].configured = true; return; }
          if (!d.l || !['value', 'text'].includes(d.f)) return;
          ensureCell(d.c, lmOf(d.l), Number(d.i))[d.f] = e.target.value;
          e.target.closest('.lmt-cell').classList.toggle('is-empty', e.target.value === '');
          if (e.target.tagName === 'TEXTAREA') fit(e.target);
        });
        box.addEventListener('change', (e) => {
          const id = e.target.dataset.rowop; if (!id) return;
          rowOps[id] = e.target.value;
          for (const c of brand.classes) {
            const r = state[c.code].rows[id];
            if (r.off) continue;
            r.cells.forEach((x) => { if (x) x.op = rowOps[id]; });
            state[c.code].configured = true;
          }
          draw();
        });
        box.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-act]'); if (!btn || !btn.dataset.c) return;
          const code = btn.dataset.c; const s = state[code]; const act = btn.dataset.act;
          if (act === 'merge' || act === 'split') {
            const l = lmOf(btn.dataset.l); const r = s.rows[l.id];
            if (act === 'merge') { const first = r.off ? null : r.cells.find((x) => x); r.off = false; r.same = true; r.cells = [first || newCell(l)]; }
            else { const c0 = r.cells[0]; r.same = false; r.cells = range(ncol(s)).map(() => (c0 ? Object.assign({}, c0) : null)); }
          } else if (act === 'addSec') {
            s.sections.push('');
            // section baru mulai dari target kolom pertama supaya tidak perlu isi ulang
            if (s.sections.length > 1) Object.values(s.rows).forEach((r) => { if (!r.off && !r.same) r.cells[s.sections.length - 1] = r.cells[0] ? Object.assign({}, r.cells[0]) : null; });
          } else if (act === 'delSec') {
            const i = Number(btn.dataset.i); s.sections.splice(i, 1);
            Object.values(s.rows).forEach((r) => {
              if (r.off) return;
              if (!r.same) r.cells.splice(i, 1);
              if (s.sections.length <= 1) { r.same = false; r.cells = r.cells.slice(0, 1); }
              if (!r.cells.length || r.cells.every((x) => !x)) { r.off = true; r.cells = []; }
            });
          } else if (act === 'secAll') {
            if (!confirm(`Pakai section [${s.sections.join(', ')}] di semua kelas ${brand.brand_name}? Target kelas lain disesuaikan per kolom.`)) return;
            for (const [k, o] of Object.entries(state)) {
              if (k === code) continue;
              while (o.sections.length < s.sections.length) {
                const n = o.sections.length; o.sections.push('');
                Object.values(o.rows).forEach((r) => { if (n && !r.off && !r.same) r.cells[n] = r.cells[0] ? Object.assign({}, r.cells[0]) : null; });
              }
              o.sections.length = s.sections.length;
              Object.values(o.rows).forEach((r) => { r.cells.length = Math.min(r.cells.length, Math.max(1, s.sections.length)); });
              s.sections.forEach((x, i) => { o.sections[i] = x; });
              o.configured = true;
            }
          } else return;
          s.configured = true;
          draw();
        });
        box.addEventListener('submit', () => {
          // samakan operator semua sel dengan operator lead measure-nya
          for (const c of brand.classes) for (const l of lms) state[c.code].rows[l.id].cells.forEach((x) => { if (x) x.op = rowOps[l.id]; });
          root.querySelector('#lmtJson').value = JSON.stringify(state);
        }, true);
        draw();
      },
    };
  });

  actions['setup.saveLmTargets'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const bId = Number(form.dataset.b);
    assertDraft(pid);
    const brandRow = DB.byId('programChannelBrands', bId);
    const ch = E.loadProgram(pid).channels.find((c) => c.id === pcId);
    const brand = ch.brands.find((x) => x.id === bId);
    const raw = JSON.parse(f.get('targets') || '{}');
    const errs = [];
    const out = {};
    for (const c of brand.classes) {
      const s = raw[c.code];
      if (!s || !s.configured) { if ((brandRow.lm_targets || {})[c.code]) out[c.code] = brandRow.lm_targets[c.code]; continue; }
      const sections = (s.sections || []).map((x) => String(x || '').trim());
      if (sections.some((x) => !x)) errs.push(`Kelas ${c.code}: nama section wajib diisi`);
      if (new Set(sections).size !== sections.length) errs.push(`Kelas ${c.code}: nama section tidak boleh sama`);
      const nCols = sections.length > 1 ? sections.length : 1;
      const rows = {};
      for (const l of ch.leadMeasures) {
        const r = (s.rows || {})[l.id] || {};
        if (r.off) { rows[l.id] = { off: true, same: false, cells: [] }; continue; }
        const same = sections.length > 1 && !!r.same;
        const n = same ? 1 : nCols;
        // sel kosong / null = lead measure tidak berlaku di kelas / section itu
        const cells = Array.from({ length: n }, (_, i) => (r.cells || [])[i]).map((cell) => {
          if (!cell) return null;
          const x = cell || {};
          const op = C.lmTargetOps(l.value_type).includes(x.op) ? x.op : C.lmTargetOps(l.value_type)[0];
          const value = op === 'TEXT' || x.value === '' || x.value === null || x.value === undefined ? null : Number(x.value);
          if (value !== null && !Number.isFinite(value)) errs.push(`Kelas ${c.code} · ${l.name}: target harus angka`);
          const text = op === 'TEXT' ? String(x.text || '').trim() : null;
          if (op === 'TEXT' ? !text : value === null) return null; // sel kosong = tidak berlaku
          return { op, value, text };
        });
        rows[l.id] = cells.every((x) => x === null) ? { off: true, same: false, cells: [] } : { off: false, same, cells };
      }
      out[c.code] = { sections, rows };
    }
    if (errs.length) throw new Error(errs.slice(0, 8).join(' · '));
    const before = brandRow.lm_targets || null;
    brandRow.lm_targets = out;
    E.audit(pid, 'programLeadMeasureTarget', bId, 'replace', before, out);
    touch(pid);
    const n = Object.keys(out).length;
    done('success', `Target lead measure ${esc(brand.brand_name)} disimpan (${n}/${brand.classes.length} kelas). Sel kosong = tidak berlaku.`, `/setup/${pid}/ch/${pcId}/pillars/${bId}`);
  };

  // ---------------------------------------------------------------- 3d · rumus
  route('/setup/:id/ch/:pc/formulas', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const base = Object.fromEntries(C.FORMULA_SLOTS.map((s) => [s.code, E.formulaFor(ch, s.code, null) || { expression: '', description: '' }]));
    const overrides = ch.formulas.filter((f) => f.brand_code);
    const brandOpts = (cur) => ch.brands.map((b) => `<option value="${b.brand_code}" ${sel(cur === b.brand_code)}>${esc(b.brand_name)}</option>`).join('');
    const slotOpts = (cur) => C.FORMULA_SLOTS.map((s) => `<option value="${s.code}" ${sel(cur === s.code)}>${s.code}</option>`).join('');
    const ovRow = (o) => `<tr class="ov"><td><select name="ov_slot" class="form-control form-control-sm">${slotOpts(o.slot)}</select></td>
      <td><select name="ov_brand" class="form-control form-control-sm">${brandOpts(o.brand_code)}</select></td>
      <td><input name="ov_expr" class="form-control form-control-sm text-monospace fx" value="${esc(o.expression)}"><div class="fx-out small"></div></td>
      <td><input name="ov_desc" class="form-control form-control-sm" value="${esc(o.description)}"></td>
      <td><button type="button" class="btn btn-sm btn-link text-danger del-ov"><i class="bi bi-x-lg"></i></button></td></tr>`;
    return {
      title: `Rumus · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'formulas')}
      <div class="row g-3"><div class="col-xl-9">
      <form data-action="setup.saveFormulas" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p)}>
      <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3e</span>&nbsp;Rumus per slot — ${esc(ch.channel_name)}</span>
        <a href="#/setup/${p.id}/simulate?ch=${ch.id}" class="btn btn-sm btn-outline-brand"><i class="bi bi-play"></i> Coba di simulasi</a></div><div class="card-body">
        <p class="small text-muted">Daftar slot tetap (developer). Isi rumus hanya dengan variabel katalog & fungsi ${window.Formula.FUNCTION_NAMES.join(', ')}. Sintaks dicek saat mengetik & saat simpan; hasil dicek di simulasi (step 4).</p>
        <div class="table-responsive"><table class="table table-sm table-bordered"><thead><tr><th style="width:190px">Kolom</th><th>Rumus</th><th style="width:110px">Preset</th><th style="width:220px">Deskripsi (untuk Finance)</th></tr></thead><tbody>
          ${C.FORMULA_SLOTS.map((s) => `<tr><td><code>${s.code}</code><div class="small text-muted">${esc(s.label)} · ${esc(s.produces)}</div></td>
            <td><input name="expr_${s.code}" class="form-control form-control-sm text-monospace fx" value="${esc(base[s.code].expression)}" required><div class="fx-out small"></div></td>
            <td><button type="button" class="btn btn-sm btn-outline-secondary preset" data-slot="${s.code}" data-expr="${esc(s.preset)}" title="${esc(s.preset)}">${C.PRESET_NAME}</button></td>
            <td><input name="desc_${s.code}" class="form-control form-control-sm" value="${esc(base[s.code].description)}"></td></tr>`).join('')}</tbody></table></div>
        <h6 class="mt-3">Override per brand <span class="small text-muted fw-normal">— rumus berbeda untuk satu brand</span></h6>
        <table class="table table-sm table-bordered" id="ovTable"><thead><tr><th style="width:190px">Kolom</th><th style="width:150px">Brand</th><th>Rumus</th><th style="width:220px">Deskripsi</th><th></th></tr></thead>
          <tbody>${overrides.map(ovRow).join('')}</tbody></table>
        <template id="ovTpl">${ovRow({ slot: 'target', brand_code: ch.brands[0] ? ch.brands[0].brand_code : '', expression: '', description: '' })}</template>
        <button type="button" class="btn btn-sm btn-link px-0" id="addOv">+ override brand</button>
        <div><button class="btn btn-brand mt-2"><i class="bi bi-save"></i> Simpan rumus</button></div>
      </div></div></fieldset></form></div>
      <div class="col-xl-3"><div class="card sticky-summary"><div class="card-header">Katalog</div><div class="card-body small formula-vars">
        <div class="mb-1 text-muted">Klik untuk menyisipkan ke kolom rumus yang aktif.</div>
        <div class="fw-semibold">Variabel</div>${C.FORMULA_VARIABLES.map((v) => `<div><code>${v.code}</code> <span class="text-muted">${esc(v.label)}</span></div>`).join('')}
        <div class="fw-semibold mt-2">Hasil slot sebelumnya</div>${C.FORMULA_SLOTS.map((s) => `<code class="mr-1">${s.code}</code>`).join('')}
        <div class="fw-semibold mt-2">Fungsi</div>${window.Formula.FUNCTION_NAMES.map((n) => `<code class="mr-1">${n}(</code>`).join('')}
        <div class="text-muted mt-2">Variabel baru (data yang belum ada di Tradee) butuh development lalu didaftarkan di katalog.</div>
      </div></div></div></div></div></div>`,
      after(root) {
        const sample = C.sampleVars();
        let active = null;
        const checkOne = (inp) => {
          const out = inp.parentElement.querySelector('.fx-out');
          if (!inp.value.trim()) { out.innerHTML = '<span class="text-danger">Rumus kosong</span>'; return; }
          const r = window.Formula.check(inp.value, sample);
          out.innerHTML = r.isValid ? `<span class="text-success"><i class="bi bi-check-circle"></i> valid</span> <span class="text-muted">· ${r.variablesUsed.join(', ') || 'tanpa variabel'}</span>`
            : `<span class="text-danger"><i class="bi bi-x-circle"></i> ${h.esc(r.errors.join(', '))}</span>`;
        };
        const bind = (scope) => scope.querySelectorAll('.fx').forEach((inp) => { checkOne(inp); inp.addEventListener('input', () => checkOne(inp)); inp.addEventListener('focus', () => { active = inp; }); });
        bind(root);
        root.querySelectorAll('.preset').forEach((b) => b.addEventListener('click', () => { const inp = root.querySelector(`[name="expr_${b.dataset.slot}"]`); inp.value = b.dataset.expr; checkOne(inp); }));
        root.querySelectorAll('.formula-vars code').forEach((c) => c.addEventListener('click', () => {
          if (!active || active.disabled) return;
          active.value += (active.value && !/[\s(]$/.test(active.value) ? ' ' : '') + c.textContent; active.focus(); checkOne(active);
        }));
        const tb = root.querySelector('#ovTable tbody');
        root.querySelector('#addOv').addEventListener('click', () => { tb.insertAdjacentHTML('beforeend', root.querySelector('#ovTpl').innerHTML); bind(tb.lastElementChild); });
        tb.addEventListener('click', (e) => { const b = e.target.closest('.del-ov'); if (b) b.closest('tr').remove(); });
        if (!editable(p)) root.querySelector('#addOv').disabled = true;
      },
    };
  });

  actions['setup.saveFormulas'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid);
    const sample = C.sampleVars();
    const rows = []; const errs = [];
    for (const s of C.FORMULA_SLOTS) {
      const expr = String(f.get('expr_' + s.code) || '').trim();
      const r = window.Formula.check(expr, sample);
      if (!r.isValid) errs.push(`${s.code}: ${r.errors.join(', ')}`);
      rows.push({ slot: s.code, brand_code: null, expression: expr, preset_code: expr === s.preset ? 'PRESET_2026' : null, description: f.get('desc_' + s.code) || null, variables_used: r.variablesUsed, is_valid: r.isValid });
    }
    const os = f.all('ov_slot'); const ob = f.all('ov_brand'); const oe = f.all('ov_expr'); const od = f.all('ov_desc');
    const seen = new Set();
    os.forEach((slot, i) => {
      const expr = String(oe[i] || '').trim(); if (!expr) return;
      const k = slot + '|' + ob[i];
      if (seen.has(k)) errs.push(`Override ${slot} untuk ${ob[i]} ganda`); seen.add(k);
      const r = window.Formula.check(expr, sample);
      if (!r.isValid) errs.push(`Override ${slot} (${ob[i]}): ${r.errors.join(', ')}`);
      rows.push({ slot, brand_code: ob[i], expression: expr, preset_code: null, description: od[i] || null, variables_used: r.variablesUsed, is_valid: r.isValid });
    });
    if (errs.length) throw new Error('Rumus tidak valid — ' + errs.join(' · '));
    const before = DB.where('programFormulas', (x) => x.program_channel_id === pcId).map((x) => ({ slot: x.slot, brand_code: x.brand_code, expression: x.expression }));
    DB.remove('programFormulas', (x) => x.program_channel_id === pcId);
    for (const r of rows) DB.insert('programFormulas', Object.assign({ program_channel_id: pcId }, r));
    E.audit(pid, 'programFormula', pcId, 'replace', before, rows.map((r) => ({ slot: r.slot, brand_code: r.brand_code, expression: r.expression })));
    touch(pid);
    done('success', 'Rumus disimpan. Cek hasilnya di step 4 Simulasi.', `/setup/${pid}/ch/${pcId}/formulas`);
  };

  window.SetupShared = { getProgram, getChannel, nav, assertDraft, assertDocsEditable, touch, editable, fs };
})();
