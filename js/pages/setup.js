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
  // Status publish per CHANNEL × FASE (Pendaftaran · Monitoring · Pencairan), bukan per program (js/setup-model.js).
  // Halaman konfigurasi terkunci bila fase miliknya di channel itu sudah PUBLISHED / CLOSED; fase lain tetap bisa diedit.
  // Header program & daftar channel terkunci begitu ada satu fase yang tidak lagi DRAFT.
  const SM = window.SetupModel;
  const PL = SM.PHASE_LABEL;
  const programLocked = (pid) => DB.where('programChannels', (c) => c.program_id === pid).some((c) => SM.PHASES.some(([ph]) => SM.isRunning(c, ph)));
  function assertDraft(pid, pcId, phase) {
    const p = DB.byId('programs', pid);
    if (!p) throw new Error('Program tidak ditemukan.');
    if (pcId) {
      const st = SM.phaseStatus(DB.byId('programChannels', pcId), phase);
      if (st !== 'DRAFT') throw new Error(`Fase ${PL[phase]} channel ini ${st}: read-only. Fase lain di channel yang sama tetap bisa diedit.`);
      return p;
    }
    if (programLocked(pid)) throw new Error('Sudah ada fase yang PUBLISHED: header program & daftar channel terkunci.');
    return p;
  }
  // Template dokumen tetap bisa diubah setelah Pendaftaran PUBLISHED (revisi baru); terkunci saat CLOSED
  function assertDocsEditable(pid, pcId) {
    const p = DB.byId('programs', pid);
    if (!p || SM.phaseStatus(DB.byId('programChannels', pcId), 'REGISTRATION') === 'CLOSED') throw new Error('Fase Pendaftaran channel ini CLOSED: template dokumen read-only.');
    return p;
  }
  function touch(pid) { const p = DB.byId('programs', pid); p.updated_at = new Date().toISOString(); p.lock_version = (p.lock_version || 1) + 1; }
  const editable = (p, ch, phase) => (ch ? SM.phaseStatus(ch, phase) === 'DRAFT' : !programLocked(p.id));
  const fs = (p, ch, phase) => (editable(p, ch, phase) ? '' : 'disabled'); // <fieldset ${fs(p, ch, fase)}> → read-only setelah fase PUBLISHED
  const confirmTag = '<span class="cps-confirm" title="Belum dipastikan user, dibahas saat review">Perlu konfirmasi</span>';
  const soonTag = '<span class="cps-soon">Menyusul</span>';

  // Bagian konfigurasi channel dikelompokkan per fase; Monitoring & Pencairan masih kerangka ("Menyusul") kecuali termin pencairan
  const PHASE_TABS = {
    REGISTRATION: [['brands', 'Brand'], ['scheme', 'Skema kelas'], ['pillars', 'Pilar & saran lead measure'],
      ['phases/REGISTRATION', 'Form & approval'], ['documents', 'Dokumen & MoU']],
    MONITORING: [['monitoring', 'Kerangka', true], ['phases/MONITORING', 'Form & approval', true]],
    PAYOUT: [['payout-rules', 'Syarat payout & jadwal'], ['terms', 'Termin & conditional rebate'], ['formulas', 'Rumus', true], ['phases/PAYOUT', 'Form & approval', true]],
  };
  const phaseOfSub = (sub) => (Object.entries(PHASE_TABS).find(([, tabs]) => tabs.some(([k]) => k === sub)) || ['REGISTRATION'])[0];
  const statusTag = (st) => `<span class="cps-phase-st st-${st.toLowerCase()}">${h.STATUS[st][0]}</span>`;

  // Matriks status channel × fase (halaman detail program & validasi)
  function phaseMatrix(p, cell) {
    return `<div class="table-responsive"><table class="table mb-0 cps-matrix"><thead><tr><th>Channel</th>${SM.PHASES.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>
      ${p.channels.map((ch) => `<tr><td class="fw-semibold">${esc(ch.channel_name)}</td>${SM.PHASES.map(([ph]) => `<td>${cell ? cell(ch, ph) : statusTag(SM.phaseStatus(ch, ph))}</td>`).join('')}</tr>`).join('')
        || `<tr><td colspan="${SM.PHASES.length + 1}" class="text-center text-muted py-4">Belum ada channel.</td></tr>`}</tbody></table></div>`;
  }

  // Status satu bagian konfigurasi channel untuk panel "Daftar langkah": done · partial · todo · info (halaman ringkasan)
  function sectionStatus(ch, k) {
    const pc = DB.byId('programChannels', ch.id) || {};
    const st = SM.setupOf(ch);
    const n = ch.brands.length;
    const of = (ok, total, unit) => ({ s: !total || !ok ? 'todo' : ok >= total ? 'done' : 'partial', hint: total ? `${ok}/${total}${unit ? ' ' + unit : ''}` : '' });
    const isSet = (v) => v !== null && v !== undefined && v !== '';
    if (k === 'brands') return { s: n ? 'done' : 'todo', hint: n ? `${n} brand` : '' };
    if (k === 'scheme') {
      const ok = ch.brands.filter((b) => {
        if ((st.scheme_follow || {})[b.brand_code]) return true;
        const cls = SM.hasSchemes(st) ? SM.schemeOf(st, b.brand_code).classes : b.classes;
        return cls.length && cls.every((c) => !c.tiers || (c.tiers.length && !SM.growthIssues(c).length));
      }).length;
      return of(ok, n, 'brand');
    }
    if (k === 'pillars') {
      if (!ch.pillars.length) return { s: 'todo', hint: '' };
      const ok = ch.brands.filter((b) => lmClasses(ch, b).every((c) => (b.lm_targets || {})[c.code])).length;
      return ok < n ? of(ok, n, 'target') : { s: 'done', hint: `${ch.pillars.length} pilar` };
    }
    if (k === 'limits') return { s: Object.values(st.rules || {}).some(isSet) ? 'done' : 'todo', hint: '' };
    if (k.startsWith('phases/')) {
      const ph = ch.phases[k.split('/')[1]];
      return { s: ph.fields.length && ph.layers.length ? 'done' : ph.fields.length || ph.layers.length ? 'partial' : 'todo', hint: ph.layers.length ? `${ph.layers.length} layer` : '' };
    }
    if (k === 'documents') {
      const types = Object.keys(C.DOC_TYPES);
      return of(types.filter((t) => ch.documents[t] && ch.documents[t].latest && E.docFilled(ch.documents[t].latest.content)).length, types.length);
    }
    if (k === 'monitoring') return { s: 'info', hint: '' };
    if (k === 'payout-rules') return { s: DB.where('programPayoutSchedules', (x) => x.program_channel_id === ch.id).length ? 'done' : 'todo', hint: '' };
    if (k === 'terms') return { s: !st.terms.length ? 'todo' : SM.termErrors(st).length ? 'partial' : 'done', hint: st.terms.length ? `${st.terms.length} termin` : '' };
    if (k === 'formulas') return of(C.FORMULA_SLOTS.filter((x) => { const f = E.formulaFor(ch, x.code, null); return f && String(f.expression || '').trim(); }).length, C.FORMULA_SLOTS.length);
    return { s: 'todo', hint: '' };
  }
  const ST_ICON = { done: 'bi-check-circle-fill', partial: 'bi-circle-half', todo: 'bi-circle', info: 'bi-info-circle' };
  const ST_TITLE = { done: 'Sudah diisi', partial: 'Sebagian', todo: 'Belum diisi', info: 'Ringkasan' };

  // Satu kalimat "yang diisi di sini" per bagian (selalu tampil; penjelasan panjang tetap di Bantuan)
  const SECTION_INFO = {
    brands: 'Pilih brand yang ikut program di channel ini.',
    scheme: 'Atur kelas toko (rentang baseline) serta target growth dan rebate tiap tier, untuk setiap brand.',
    pillars: 'Tentukan pilar channel, lalu JTBD, lead measure, dan target per kelas untuk setiap brand.',
    limits: 'Tentukan batas persen benefit di channel ini dan siapa yang menyetujui exception bila batas terlampaui.',
    'phases/REGISTRATION': 'Atur field yang diisi CBD/CDT saat mendaftarkan toko, dan urutan approval-nya.',
    documents: 'Atur template MoU dan SKN yang dibuat otomatis untuk toko yang disetujui.',
    monitoring: 'Ringkasan pengaturan Monitoring.',
    'phases/MONITORING': 'Atur field laporan monitoring dan urutan approval-nya.',
    'payout-rules': 'Atur syarat pencairan dan jadwal payout.',
    terms: 'Atur termin pencairan (semester / tahunan) dan porsi tiap termin.',
    formulas: 'Rumus perhitungan payout yang dipakai channel ini (dibuat Admin IT).',
    'phases/PAYOUT': 'Atur field form pencairan dan urutan approval sampai final.',
  };

  // Navigasi channel yang selalu terlihat: channel · tab fase · langkah bernomor fase aktif · judul "Langkah N dari M" + ringkasan
  function outline(p, ch, sub) {
    const cur = phaseOfSub(sub);
    const items = SM.PHASES.map(([ph, l]) => ({ ph, l, st: SM.phaseStatus(ch, ph), rows: PHASE_TABS[ph].map(([k, label, later]) => Object.assign({ k, label, later }, sectionStatus(ch, k))) }));
    const prog = (rows) => { const c = rows.filter((r) => r.s !== 'info'); return [c.filter((r) => r.s === 'done').length, c.length]; };
    const curItem = items.find((x) => x.ph === cur);
    const idx = Math.max(0, curItem.rows.findIndex((r) => r.k === sub));
    const curRow = curItem.rows[idx];
    const href = (k) => `#/setup/${p.id}/ch/${ch.id}/${k}`;
    return `<div class="cps-chrow"><label class="mb-0" for="cpsCh">Channel</label>
        <select id="cpsCh" class="form-control form-control-sm" data-cps-goto>${p.channels.map((c) => `<option value="#/setup/${p.id}/ch/${c.id}/${sub}" ${sel(c.id === ch.id)}>${esc(c.channel_name)}</option>`).join('')}</select>
        <a class="btn btn-sm btn-outline-brand" href="#/setup/${p.id}/channels"><i class="bi bi-plus-lg"></i> Channel</a>
        <label class="cps-ol-switch mb-0"><input type="checkbox" data-cps-review> Tampilkan catatan review</label></div>
      <ul class="cps-phtabs">${items.map(({ ph, l, st, rows }) => { const [d, t] = prog(rows);
        return `<li><a class="${ph === cur ? 'active' : ''}" href="${href(rows[0].k)}"><span class="cps-phtab-l">${l}</span>${statusTag(st)}<span class="cps-phtab-count">${d}/${t} selesai</span></a></li>`; }).join('')}</ul>
      <ol class="cps-stepper">${curItem.rows.map((r, i) => `<li class="st-${r.s} ${r.k === sub ? 'active' : ''}"><a href="${href(r.k)}" title="${i + 1}. ${r.label}: ${ST_TITLE[r.s]}${r.hint ? ' · ' + r.hint : ''}">
        <span class="cps-step-n">${r.s === 'done' && r.k !== sub ? '<i class="bi bi-check-lg"></i>' : i + 1}</span><span class="cps-step-l">${r.label}${r.later ? soonTag : ''}${r.k === 'pillars' ? confirmTag : ''}</span></a></li>`).join('')}</ol>
      <div class="cps-steptitle"><div class="cps-steptitle-n">Langkah ${idx + 1} dari ${curItem.rows.length} · ${PL[cur]}</div>
        <h2>${curRow.label} <span class="cps-steptitle-st st-${curRow.s}"><i class="bi ${ST_ICON[curRow.s]}"></i> ${ST_TITLE[curRow.s]}${curRow.hint ? ` · ${curRow.hint}` : ''}</span></h2>
        <p>${SECTION_INFO[curRow.k] || ''} <span class="cps-help-open" role="button" tabindex="0" data-cps-help-open hidden><i class="bi bi-question-circle"></i> Penjelasan lengkap</span></p></div>`;
  }
  // Bagian sebelumnya (tombol "← Kembali" di bar bawah)
  function prevStep(p, ch, sub) {
    const flat = SM.PHASES.flatMap(([ph]) => PHASE_TABS[ph].map(([k, l]) => [`/setup/${p.id}/ch/${ch.id}/${k}`, l, k]));
    const i = flat.findIndex((x) => x[2] === sub);
    return i > 0 ? flat[i - 1] : [`/setup/${p.id}/channels`, 'Daftar channel'];
  }

  // Tujuan "Simpan & lanjut": bagian berikutnya di fase yang sama → fase berikutnya → channel berikutnya → Simulasi
  function nextStep(p, step, ch, sub) {
    if (ch) {
      const flat = SM.PHASES.flatMap(([ph]) => PHASE_TABS[ph].map(([k, l]) => [`/setup/${p.id}/ch/${ch.id}/${k}`, l, k]));
      const i = flat.findIndex((x) => x[2] === sub);
      if (i >= 0 && i < flat.length - 1) return flat[i + 1];
      const nextCh = p.channels[p.channels.findIndex((c) => c.id === ch.id) + 1];
      return nextCh ? [`/setup/${p.id}/ch/${nextCh.id}/brands`, `Channel ${nextCh.channel_name}`] : [`/setup/${p.id}/simulate`, 'Simulasi'];
    }
    const first = p.channels[0];
    if (step === 'header') return [`/setup/${p.id}/channels`, 'Channel'];
    if (step === 'channels') return first ? [`/setup/${p.id}/ch/${first.id}/brands`, `Konfigurasi ${first.channel_name}`] : null;
    if (step === 'simulate') return [`/setup/${p.id}/validate`, 'Validasi & publish'];
    return null;
  }

  // Header program + langkah program (breadcrumb ringkas) + area kerja channel (tab fase + langkah bernomor di atas, isi selebar penuh)
  function nav(p, step, ch, sub) {
    const first = p.channels[0];
    const steps = [
      ['header', '1', 'Header', `#/setup/${p.id}/header`],
      ['channels', '2', 'Channel', `#/setup/${p.id}/channels`],
      ['config', '3', 'Konfigurasi channel', first ? `#/setup/${p.id}/ch/${first.id}/brands` : `#/setup/${p.id}/channels`],
      ['simulate', '4', 'Simulasi', `#/setup/${p.id}/simulate`],
      ['validate', '5', 'Validasi & publish', `#/setup/${p.id}/validate`],
      ['audit', '', 'Audit log', `#/setup/${p.id}/audit`, 'bi-clock-history'],
    ];
    const phase = ch ? phaseOfSub(sub) : null;
    const st = ch ? SM.phaseStatus(ch, phase) : null;
    const lock = !ch || st === 'DRAFT' ? ''
      : st === 'PUBLISHED' ? `<div class="cps-lock st-published" title="Fase lain di channel ini tetap bisa diedit.${phase === 'REGISTRATION' ? ' Template MoU / SKN tetap bisa direvisi.' : ''}"><i class="bi bi-lock"></i> ${PL[phase]} sudah <strong>Published</strong>: bagian ini hanya bisa dilihat${phase === 'REGISTRATION' ? ' (MoU / SKN tetap bisa direvisi)' : ''}.</div>`
      : `<div class="cps-lock st-closed" title="Tetap tersedia untuk audit & laporan."><i class="bi bi-archive"></i> ${PL[phase]} sudah <strong>Closed</strong>: read-only, termasuk template dokumen.</div>`;
    const next = nextStep(p, step, ch, sub);
    const prev = ch ? prevStep(p, ch, sub) : null;
    const nextEl = (next ? `<span hidden data-cps-next="${next[0]}" data-cps-next-label="${esc(next[1])}"></span>` : '')
      + (prev ? `<span hidden data-cps-prev="${prev[0]}" data-cps-prev-label="${esc(prev[1])}"></span>` : '');
    // Area kerja channel: .cps-work ditutup di akhir template tiap route channel; .cps-main (kolom kanan) ikut tertutup otomatis oleh parser
    const chNav = ch ? `<div class="cps-work cps-top"><div class="cps-nav">${outline(p, ch, sub)}</div><div class="cps-main">${lock}` : lock;
    return `<div class="cps-head"><div class="page-head cps-detail"><a href="#/setup" class="btn btn-ghost cps-back"><i class="bi bi-arrow-left"></i> Kembali</a><span class="cps-divider"></span><div class="cps-detail-main"><div>
        <div class="small text-muted"><a href="#/setup">Program Setup</a> / ${p.year}</div>
        <h1>${esc(p.name)} <span class="text-muted fw-normal fs-6">${esc(p.code)}</span> <span class="badge badge-light">${SM.summaryLabel(p.id)}</span></h1></div>
      </div>
      <div class="cps-facts">
        <div class="cps-fact"><span class="cps-fact-label">Periode</span><span class="cps-fact-value">${h.date(p.period_start)} – ${h.date(p.period_end)}</span></div>
        <div class="cps-fact"><span class="cps-fact-label">Channel</span><span class="cps-fact-value">${p.channels.length}</span></div>
        <div class="cps-fact"><span class="cps-fact-label">Registrasi</span><span class="cps-fact-value">${p.registrationCount}</span></div>
      </div></div>
      <ol class="flow-steps flow-crumb">${steps.map(([k, n, l, href2, ic]) => `<li class="${step === k ? 'active' : ''}"><a href="${href2}">${n ? `<span class="n">${n}</span>` : `<i class="bi ${ic}"></i>`}${l}</a></li>`).join('')}</ol></div>
      ${nextEl}${chNav}`;
  }

  // ---------------------------------------------------------------- 0 · daftar program & 1A · salin (prototype "Program Setup Mockup" layar 1)
  // Status ringkas program dari status fase Pendaftaran per channel: Draft · Sebagian dibuka · Dibuka · Ditutup
  function programState(pid) {
    const pcs = DB.where('programChannels', (c) => c.program_id === pid);
    const st = pcs.map((c) => SM.phaseStatus(c, 'REGISTRATION'));
    const open = st.filter((s) => s === 'PUBLISHED').length;
    const closed = st.filter((s) => s === 'CLOSED').length;
    const key = !pcs.length || (!open && !closed) ? 'DRAFT' : closed === pcs.length ? 'CLOSED' : open + closed === pcs.length ? 'OPEN' : 'PARTIAL';
    const [label, chip] = { DRAFT: ['Draft', 'c-blue'], PARTIAL: ['Sebagian dibuka', 'c-green'], OPEN: ['Dibuka', 'c-green'], CLOSED: ['Ditutup', 'c-grey'] }[key];
    const groups = !pcs.length ? 'Belum ada channel' : `${pcs.length} channel · ${closed === pcs.length ? 'ditutup' : `${open} dibuka`}`;
    return { key, label, chip, open, closed, total: pcs.length, groups };
  }
  const CH_CHIP = { DRAFT: ['Draft', 'c-blue'], PUBLISHED: ['Dibuka', 'c-green'], CLOSED: ['Ditutup', 'c-grey'] };
  const userName = (id) => (DB.byId('users', id) || {}).name || '-';

  route('/setup', ({}, q, { year }) => {
    UI.requireSetup();
    const programs = DB.t('programs').filter((p) => p.year === year).sort((a, b) => a.id - b.id);
    const sources = DB.t('programs').slice().sort((a, b) => b.year - a.year || b.id - a.id);
    const rows = programs.map((p) => {
      const s = programState(p.id);
      const last = DB.where('programAuditLogs', (x) => x.program_id === p.id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      const updated = last ? last.created_at : p.updated_at;
      const by = last && last.actor_id ? userName(last.actor_id) : userName(p.created_by);
      return { p, s, updated, by };
    });
    const allPcs = DB.where('programChannels', (c) => programs.some((p) => p.id === c.program_id));
    const nOpen = allPcs.filter((c) => SM.phaseStatus(c, 'REGISTRATION') === 'PUBLISHED').length;
    const stat = (label, value, note, color) => `<div class="pv-stat"><span class="pv-stat-l">${label}</span><span class="pv-stat-v" ${color ? `style="color:${color}"` : ''}>${value}</span><span class="pv-stat-n">${note}</span></div>`;
    // Channel tiap program sumber untuk dialog salin
    const srcChannels = Object.fromEntries(sources.map((p) => [p.id, DB.where('programChannels', (c) => c.program_id === p.id).map((c) => {
      const [l, chip] = CH_CHIP[SM.phaseStatus(c, 'REGISTRATION')];
      return { id: c.id, name: E.channelName(c), status: l, chip };
    })]));
    return {
      title: 'Program Setup', html: `<div class="cps pv">
      <div class="pv-pagehead"><h1 class="pv-title">Program Setup</h1>
        <div class="pv-actions"><button type="button" class="btn pv-btn-s" data-clone="${sources[0] ? sources[0].id : ''}" ${sources.length ? '' : 'disabled'}><i class="bi bi-copy"></i> Salin dari Program Lalu</button>
          <a class="btn pv-btn-p" href="#/setup/new"><i class="bi bi-plus-lg"></i> Buat Program</a></div></div>
      <div class="pv-stats">
        ${stat('Total Program', programs.length, `tahun ${year}`)}
        ${stat('Draft', rows.filter((r) => r.s.key === 'DRAFT').length, 'masih bisa diubah', 'var(--primary-500)')}
        ${stat('Channel Dibuka', nOpen, `dari ${allPcs.length} channel`, 'var(--success-500, #33995E)')}
        ${stat('Ditutup', rows.filter((r) => r.s.key === 'CLOSED').length, 'arsip &amp; laporan')}
      </div>
      <section class="pv-card">
        <div class="pv-cardhead"><h2 class="pv-h3">Daftar Program</h2>
          <div class="pv-actions"><input class="pv-inp" type="search" id="pvSearch" aria-label="Cari program" placeholder="Cari kode atau nama program..." style="width:280px">
            <select class="pv-inp" id="pvStatus" aria-label="Filter status" style="width:170px"><option value="">Semua Status</option><option value="DRAFT">Draft</option><option value="PARTIAL">Sebagian dibuka</option><option value="OPEN">Dibuka</option><option value="CLOSED">Ditutup</option></select></div></div>
        <div class="pv-tblbox"><table class="pv-table">
          <thead><tr><th style="width:150px">Kode</th><th>Nama Program</th><th style="width:190px">Periode</th><th style="width:170px">Channel</th><th style="width:140px">Status</th><th style="width:140px">Diubah</th><th style="width:160px">Aksi</th></tr></thead>
          <tbody>${rows.map(({ p, s, updated, by }) => `<tr data-st="${s.key}" data-q="${esc((p.code + ' ' + p.name).toLowerCase())}">
            <td class="fw-bold">${esc(p.code)}</td><td class="fw-bold">${esc(p.name)}</td>
            <td>${h.date(p.period_start)} – ${h.date(p.period_end)}</td><td>${s.groups}</td>
            <td><span class="pv-chip ${s.chip}">${s.label}</span></td>
            <td><div>${h.date(updated)}</div><div class="pv-muted">${esc(by)}</div></td>
            <td><a href="#/setup/${p.id}/channels" class="fw-bold">Buka Setup</a><button type="button" class="pv-btn-g" data-clone="${p.id}">Salin</button></td></tr>`).join('')
            || `<tr><td colspan="7" class="pv-empty">Belum ada program di tahun ${year}. Klik <strong>Buat Program</strong> untuk mulai.</td></tr>`}
            <tr class="pv-noresult" hidden><td colspan="7" class="pv-empty">Tidak ada program yang cocok.</td></tr></tbody></table></div>
      </section>
      <dialog class="pv-dialog" id="cloneDlg" aria-labelledby="cloneDlgTitle">
        <form data-action="setup.clone">
          <div class="pv-dialog-head"><h2 class="pv-h3" id="cloneDlgTitle">Salin dari Program Lalu</h2>
            <button type="button" class="pv-btn-g" data-dlg-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div>
          <div class="pv-dialog-body">
            <label class="pv-field">Program sumber<select class="pv-inp" name="source_id" id="cloneSrc">${sources.map((p) => `<option value="${p.id}">${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label>
            <div class="pv-grid2">
              <label class="pv-field">Kode baru<input class="pv-inp text-uppercase" name="code" id="cloneCode" required></label>
              <label class="pv-field">Nama program<input class="pv-inp" name="name" id="cloneName" required></label>
              <label class="pv-field">Periode mulai<input class="pv-inp" type="date" name="period_start" id="cloneStart" required></label>
              <label class="pv-field">Periode selesai<input class="pv-inp" type="date" name="period_end" id="cloneEnd" required></label>
            </div>
            <div class="pv-field-wrap">
              <div class="pv-row-between"><span class="pv-lbl" id="cloneChCount"></span><button type="button" class="pv-btn-g sm" id="cloneAll"></button></div>
              <div class="pv-cklist" id="cloneChList"></div>
            </div>
          </div>
          <div class="pv-dialog-foot"><button type="button" class="btn pv-btn-s" data-dlg-close>Batal</button>
            <button class="btn pv-btn-p" id="cloneSubmit">Salin Program</button></div>
        </form></dialog></div>`,
      after(root) {
        // filter tabel
        const search = root.querySelector('#pvSearch'); const status = root.querySelector('#pvStatus');
        const filter = () => {
          const t = search.value.trim().toLowerCase(); let n = 0;
          root.querySelectorAll('.pv-table tbody tr[data-st]').forEach((tr) => { tr.hidden = (status.value && tr.dataset.st !== status.value) || (t && !tr.dataset.q.includes(t)); if (!tr.hidden) n++; });
          const nr = root.querySelector('.pv-noresult'); if (nr) nr.hidden = n > 0 || !rows.length;
        };
        search.addEventListener('input', filter); status.addEventListener('change', filter);
        // dialog salin: sumber → saran kode/nama/periode tahun berikutnya + daftar channel yang disalin
        const dlg = root.querySelector('#cloneDlg');
        const $ = (s) => root.querySelector(s);
        const list = $('#cloneChList');
        const counts = () => {
          const boxes = [...list.querySelectorAll('input')]; const n = boxes.filter((b) => b.checked).length;
          $('#cloneChCount').textContent = `Channel yang disalin · ${n} dari ${boxes.length} dipilih`;
          $('#cloneAll').textContent = n === boxes.length ? 'Kosongkan' : 'Pilih semua';
          $('#cloneAll').hidden = !boxes.length;
          $('#cloneSubmit').textContent = `Salin Program (${n} channel)`;
        };
        const fill = () => {
          const src = DB.byId('programs', Number($('#cloneSrc').value)); if (!src) return;
          const y = src.year + 1;
          const bump = (s) => (String(s).match(/\d{4}/) ? String(s).replace(/\d{4}/, (m) => String(Number(m) + 1)) : `${s}-${y}`);
          $('#cloneCode').value = bump(src.code); $('#cloneName').value = bump(src.name);
          $('#cloneStart').value = `${y}-01-01`; $('#cloneEnd').value = `${y}-12-31`;
          const chs = srcChannels[src.id] || [];
          list.innerHTML = chs.map((c) => `<label class="pv-ck"><input type="checkbox" name="channel_ids" value="${c.id}" checked><span class="pv-ck-name">${esc(c.name)}</span><span class="pv-chip sm ${c.chip}">${c.status}</span></label>`).join('')
            || '<div class="pv-ck pv-muted">Program sumber belum punya channel.</div>';
          counts();
        };
        list.addEventListener('change', counts);
        $('#cloneAll').addEventListener('click', () => { const boxes = [...list.querySelectorAll('input')]; const all = boxes.every((b) => b.checked); boxes.forEach((b) => { b.checked = !all; }); counts(); });
        $('#cloneSrc').addEventListener('change', fill);
        const open = (id) => {
          if (!id || !DB.byId('programs', Number(id))) return;
          $('#cloneSrc').value = id; fill();
          dlg.querySelectorAll('.js-form-error').forEach((x) => x.remove());
          dlg.showModal(); $('#cloneCode').focus();
        };
        root.querySelectorAll('[data-clone]').forEach((b) => b.addEventListener('click', () => open(b.dataset.clone)));
        dlg.querySelectorAll('[data-dlg-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
        dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
        if (q.clone) open(q.clone);
      },
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
    const src = DB.byId('programs', Number(f.get('source_id')));
    if (!src) throw new Error('Pilih program sumber.');
    const start = String(f.get('period_start') || '');
    const v = { code: String(f.get('code') || '').trim().toUpperCase(), name: String(f.get('name') || '').trim(), year: Number(start.slice(0, 4)),
      period_start: start, period_end: f.get('period_end'), channel_ids: f.all('channel_ids').map(Number) };
    const errs = headerErrors(v, null);
    const srcCount = DB.where('programChannels', (c) => c.program_id === src.id).length;
    if (srcCount && !v.channel_ids.length) errs.push('Pilih minimal satu channel yang disalin.');
    if (errs.length) throw new Error(errs.join(' · '));
    if (!DB.t('years').some((y) => y.year === v.year)) DB.t('years').push({ year: v.year, is_active: true, note: null });
    const p = E.cloneProgram(src.id, v, UI.currentUser().id);
    E.audit(p.id, 'program', p.id, 'clone', null, { from: src.code, code: v.code, channels: v.channel_ids.length });
    if (v.year !== UI.currentYear()) UI.session.set({ year: v.year });
    done('success', `"${esc(src.name)}" disalin menjadi DRAFT <strong>${esc(v.name)}</strong> (${v.channel_ids.length} channel). Ubah hanya bagian yang berbeda.`, `/setup/${p.id}/channels`);
  };

  // ---------------------------------------------------------------- 1B · header program (+ tipe program)
  function headerPage(p, fv, errors) {
    const isNew = !p;
    const lockAttr = isNew ? '' : fs(p);
    return `<div class="cps">${isNew ? `<div class="page-head cps-detail"><a href="#/setup" class="btn btn-ghost cps-back"><i class="bi bi-arrow-left"></i> Kembali</a><span class="cps-divider"></span><div class="cps-detail-main"><div><div class="small text-muted"><a href="#/setup">Program Setup</a> / ${UI.currentYear()}</div><h1>Program baru</h1>
        <div class="sub">Step 1B · program dibuat dengan status DRAFT</div></div></div></div>` : nav(p, 'header')}
      ${UI.errorsHtml(errors)}
      ${isNew ? '' : `<div class="card"><div class="card-header"><i class="bi bi-grid-3x3-gap"></i>&nbsp;Status channel × fase</div>
        <div class="card-body p-0">${phaseMatrix(p)}</div></div>`}
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
            ${!isNew && !programLocked(p.id) && !p.registrationCount ? `<a href="#" class="btn btn-link text-danger" data-click="setup.deleteProgram" data-id="${p.id}" data-confirm="Hapus program DRAFT ini beserta seluruh konfigurasinya?"><i class="bi bi-trash"></i> Hapus DRAFT</a>` : ''}</div>
        </div></div></fieldset></form>
      </div>
      </div></div>`;
  }

  // ---------------------------------------------------------------- 1B · Buat Program: wizard 3 langkah (prototype layar 2–4)
  // 1 Informasi program · 2 Setup Brand (group brand di level program) · 3 Channel. Semua disimpan sekali di langkah terakhir.
  // Group brand = brand utama (pemilik matriks kelas) + brand anggota; di tiap channel menjadi satu brand skema dengan sub-brand anggota.
  function brandGroupsOf(pid) {
    const p = DB.byId('programs', pid);
    if (p && p.brand_groups && p.brand_groups.length) return p.brand_groups;
    const seen = {};
    for (const pc of DB.where('programChannels', (c) => c.program_id === pid)) {
      for (const b of DB.where('programChannelBrands', (x) => x.program_channel_id === pc.id).sort((a, b2) => (a.sort_order || 0) - (b2.sort_order || 0))) {
        const g = seen[b.brand_code] || (seen[b.brand_code] = { lead: b.brand_code, members: [b.brand_code] });
        for (const m of b.member_codes || []) if (!g.members.includes(m)) g.members.push(m);
      }
    }
    const nameOf = (c) => (DB.t('brands').find((x) => x.code === c) || {}).name || c;
    // channel lama bisa berbeda susunan: brand yang punya skema sendiri tetap jadi group sendiri, dan tiap brand hanya di satu group
    const taken = new Set(Object.keys(seen));
    return Object.values(seen).map((g) => {
      const members = [g.lead, ...g.members.filter((m) => m !== g.lead && !taken.has(m))];
      members.forEach((m) => taken.add(m));
      return { name: nameOf(g.lead), lead: g.lead, members };
    });
  }
  const WIZ_STEPS = ['Informasi Program', 'Setup Brand', 'Channel'];

  route('/setup/new', ({}, q, { year, path }) => {
    UI.requireSetup();
    const pend = UI.takePending(path);
    const ny = year + 1;
    const fv = pend ? pend.values : { code: `LOYALTY-${ny}`, name: `Loyalty Program ${ny}`, period_start: `${ny}-01-01`, period_end: `${ny}-12-31` };
    const brands = DB.t('brands').filter((b) => b.is_active);
    const last = DB.t('programs').slice().sort((a, b) => b.year - a.year || b.id - a.id)[0];
    let groups = last ? brandGroupsOf(last.id) : [];
    if (!groups.length) groups = brands.map((b) => ({ name: b.name, lead: b.code, members: [b.code] }));
    if (pend && pend.values.groups_json) { try { groups = JSON.parse(pend.values.groups_json); } catch (e) { /* pakai default */ } }
    const chans = DB.t('channels').filter((c) => c.is_active).sort((a, b) => (a.sort || 0) - (b.sort || 0))
      .flatMap((c) => Object.entries(E.CHANNEL_TYPES).map(([t, l]) => ({ key: `${c.code}|${t}`, name: `${c.name} · ${l}`, code: c.code })));
    const picked = pend ? new Set(String(pend.values.channels_csv || '').split(',').filter(Boolean)) : new Set(chans.filter((c) => c.key.endsWith('|ACTIVE')).map((c) => c.key));
    const startStep = pend ? Math.min(2, Math.max(0, Number(pend.values.wiz_step) || 0)) : 0;
    return {
      title: 'Buat Program', html: `<div class="cps pv">
      <section class="pv-card pv-detailhead"><div class="pv-detailhead-l">
        <a href="#/setup" class="pv-back"><i class="bi bi-arrow-left"></i> Kembali</a>
        <div class="pv-detailhead-t"><h1 class="pv-h1">Buat Program</h1><span class="pv-chip c-blue">Draft</span></div></div></section>
      ${UI.errorsHtml(pend && pend.errors)}
      <ol class="pv-steps" aria-label="Langkah">${WIZ_STEPS.map((l, i) => `<li data-wiz-mark="${i}"><span class="pv-steps-n">${i + 1}</span><span class="pv-steps-l">${l}</span></li>`).join('')}</ol>
      <form data-action="setup.create" id="wizForm" novalidate>
        <input type="hidden" name="groups_json" id="wizGroups"><input type="hidden" name="channels_csv" id="wizChannels"><input type="hidden" name="wiz_step" id="wizStep" value="0">
        <section class="pv-card" data-wiz="0"><h2 class="pv-h3">Informasi Program</h2>
          <div class="pv-grid2">
            <label class="pv-field">Kode program<input class="pv-inp text-uppercase" name="code" value="${esc(fv.code)}" required></label>
            <label class="pv-field">Nama program<input class="pv-inp" name="name" value="${esc(fv.name)}" required></label>
            <label class="pv-field">Periode mulai<input class="pv-inp" type="date" name="period_start" value="${esc(fv.period_start)}" required></label>
            <label class="pv-field">Periode selesai<input class="pv-inp" type="date" name="period_end" value="${esc(fv.period_end)}" required></label>
          </div></section>
        <section class="pv-card" data-wiz="1" hidden>
          <div class="pv-cardhead"><div class="pv-cardhead-t"><h2 class="pv-h3">Setup Brand</h2>
            <span class="pv-muted">Atur brand dan group brand yang terdapat pada program ini. Kelas memakai matriks brand utama; baseline dan target memakai jumlah semua brand anggota.</span></div>
            <button type="button" class="btn pv-btn-s" id="wizAddGroup"><i class="bi bi-plus-lg"></i> Tambah Group Brand</button></div>
          <div class="pv-tblbox"><table class="pv-table pv-table-edit">
            <thead><tr><th style="width:220px">Group Brand</th><th style="width:200px">Brand utama</th><th>Brand anggota</th><th style="width:56px"></th></tr></thead>
            <tbody id="wizGroupRows"></tbody></table></div>
          <span class="pv-muted" id="wizUnused"></span></section>
        <section class="pv-card" data-wiz="2" hidden>
          <div class="pv-cardhead-t"><h2 class="pv-h3">Channel</h2><span class="pv-muted">Pilih channel yang ikut program. Channel bisa ditambah nanti.</span></div>
          <div class="pv-tblbox"><table class="pv-table"><thead><tr><th>Channel</th></tr></thead>
            <tbody>${chans.map((c) => `<tr><td><label class="pv-ck2"><input type="checkbox" data-ch="${c.key}" ${chk(picked.has(c.key))}><span><b>${esc(c.name)}</b><span class="pv-muted">${esc(c.code)}</span></span></label></td></tr>`).join('')}</tbody></table></div>
        </section>
        <section class="pv-card pv-wizfoot"><span class="pv-muted" id="wizNote"></span>
          <div class="pv-actions"><button type="button" class="btn pv-btn-s" id="wizBack">Sebelumnya</button>
            <button type="button" class="btn pv-btn-p" id="wizNext">Lanjut</button>
            <button type="submit" class="btn pv-btn-p" id="wizDone">Buat Program</button></div></section>
      </form></div>`,
      after(root) {
        const $ = (s) => root.querySelector(s);
        const nameOf = Object.fromEntries(brands.map((b) => [b.code, b.name]));
        let step = startStep;
        let gs = groups.map((g) => ({ name: g.name, lead: g.lead, members: (g.members || []).slice() }));
        const opts = (selCode, exclude) => brands.filter((b) => !exclude || !exclude.includes(b.code)).map((b) => `<option value="${b.code}" ${sel(b.code === selCode)}>${esc(b.name)}</option>`).join('');
        const used = () => new Set(gs.flatMap((g) => g.members));
        const renderGroups = () => {
          const u = used();
          $('#wizGroupRows').innerHTML = gs.map((g, i) => `<tr data-g="${i}">
            <td><input class="pv-cellin" aria-label="Nama group brand" data-gname value="${esc(g.name)}" placeholder="Nama group brand"></td>
            <td><select class="pv-cellin" aria-label="Brand utama" data-glead>${g.lead ? '' : '<option value="">Pilih brand</option>'}${opts(g.lead, [...u].filter((c) => !g.members.includes(c)))}</select></td>
            <td><div class="pv-members">${g.members.map((m) => `<span class="pv-chip c-blue">${esc(nameOf[m] || m)}${m === g.lead ? '' : `<button type="button" class="pv-chip-x" aria-label="Hapus ${esc(nameOf[m] || m)}" data-gdel="${m}"><i class="bi bi-x"></i></button>`}</span>`).join('')}
              <select class="pv-cellin pv-cellin-add" aria-label="Tambah brand anggota" data-gadd><option value="">+ Tambah brand</option>${opts(null, [...u])}</select></div></td>
            <td><button type="button" class="pv-x" aria-label="Hapus group brand" data-gremove><i class="bi bi-trash"></i></button></td></tr>`).join('')
            || '<tr><td colspan="4" class="pv-empty">Belum ada group brand. Klik <strong>Tambah Group Brand</strong>.</td></tr>';
          const left = brands.filter((b) => !u.has(b.code)).map((b) => b.name);
          $('#wizUnused').textContent = left.length ? `Brand tidak ikut program: ${left.join(', ')}.` : 'Semua brand ikut program.';
        };
        const tbody = $('#wizGroupRows');
        tbody.addEventListener('input', (e) => { const tr = e.target.closest('[data-g]'); if (tr && e.target.matches('[data-gname]')) gs[tr.dataset.g].name = e.target.value; });
        tbody.addEventListener('change', (e) => {
          const tr = e.target.closest('[data-g]'); if (!tr) return; const g = gs[tr.dataset.g];
          if (e.target.matches('[data-glead]')) {
            const v = e.target.value; const prev = g.lead;
            g.members = g.members.filter((m) => m !== prev || false); if (v && !g.members.includes(v)) g.members.unshift(v);
            if (!g.name || g.name === nameOf[prev]) g.name = nameOf[v] || '';
            g.lead = v; renderGroups();
          } else if (e.target.matches('[data-gadd]') && e.target.value) { g.members.push(e.target.value); renderGroups(); }
        });
        tbody.addEventListener('click', (e) => {
          const tr = e.target.closest('[data-g]'); if (!tr) return; const i = Number(tr.dataset.g);
          const del = e.target.closest('[data-gdel]');
          if (del) { gs[i].members = gs[i].members.filter((m) => m !== del.dataset.gdel); renderGroups(); }
          if (e.target.closest('[data-gremove]')) { gs.splice(i, 1); renderGroups(); }
        });
        $('#wizAddGroup').addEventListener('click', () => {
          const free = brands.find((b) => !used().has(b.code));
          gs.push(free ? { name: free.name, lead: free.code, members: [free.code] } : { name: '', lead: '', members: [] });
          renderGroups();
        });
        const chBoxes = () => [...root.querySelectorAll('[data-ch]')];
        const notes = [() => 'Langkah 1 dari 3 · program dibuat dengan status Draft.',
          () => `Langkah 2 dari 3 · ${gs.length} group brand.`,
          () => `Langkah 3 dari 3 · ${chBoxes().filter((b) => b.checked).length} channel dipilih.`];
        const show = () => {
          root.querySelectorAll('[data-wiz]').forEach((s) => { s.hidden = Number(s.dataset.wiz) !== step; });
          root.querySelectorAll('[data-wiz-mark]').forEach((li) => {
            const i = Number(li.dataset.wizMark);
            li.className = i < step ? 'is-done' : i === step ? 'is-on' : '';
            li.querySelector('.pv-steps-n').innerHTML = i < step ? '<i class="bi bi-check-lg"></i>' : String(i + 1);
          });
          $('#wizBack').hidden = step === 0; $('#wizNext').hidden = step === 2; $('#wizDone').hidden = step !== 2;
          $('#wizNote').textContent = notes[step]();
          $('#wizStep').value = step;
        };
        root.addEventListener('change', (e) => { if (e.target.matches('[data-ch]')) show(); });
        // validasi ringan per langkah (validasi lengkap tetap di aksi setup.create)
        const stepError = () => {
          if (step === 0) {
            const bad = [...root.querySelectorAll('[data-wiz="0"] input')].find((x) => !x.value.trim());
            if (bad) { bad.focus(); return 'Lengkapi informasi program.'; }
          }
          if (step === 1) {
            if (!gs.length) return 'Tambahkan minimal satu group brand.';
            if (gs.some((g) => !g.name.trim() || !g.lead)) return 'Setiap group brand perlu nama dan brand utama.';
          }
          return '';
        };
        const msg = (t) => { root.querySelectorAll('.pv-wizerr').forEach((x) => x.remove()); if (t) $('.pv-wizfoot').insertAdjacentHTML('beforebegin', `<div class="pv-alert pv-wizerr" role="alert">${esc(t)}</div>`); };
        $('#wizNext').addEventListener('click', () => { const t = stepError(); msg(t); if (!t) { step++; show(); window.scrollTo(0, 0); } });
        $('#wizBack').addEventListener('click', () => { msg(''); step--; show(); });
        $('#wizForm').addEventListener('submit', () => {
          $('#wizGroups').value = JSON.stringify(gs);
          $('#wizChannels').value = chBoxes().filter((b) => b.checked).map((b) => b.dataset.ch).join(',');
        }, true);
        renderGroups(); show();
      },
    };
  });

  actions['setup.create'] = (f) => {
    UI.requireSetup();
    const start = String(f.get('period_start') || '');
    const v = { code: String(f.get('code') || '').trim().toUpperCase(), name: String(f.get('name') || '').trim(), year: Number(start.slice(0, 4)),
      period_start: start, period_end: f.get('period_end') };
    const errs = headerErrors(v, null);
    let groups = [];
    try { groups = JSON.parse(f.get('groups_json') || '[]'); } catch (e) { errs.push('Data group brand tidak terbaca.'); }
    const brandCodes = new Set(DB.t('brands').map((b) => b.code));
    groups = groups.map((g) => ({ name: String(g.name || '').trim(), lead: g.lead, members: (g.members || []).filter((m) => brandCodes.has(m)) }));
    if (!groups.length) errs.push('Tambahkan minimal satu group brand.');
    if (groups.some((g) => !g.name || !brandCodes.has(g.lead))) errs.push('Setiap group brand perlu nama dan brand utama.');
    const all = groups.flatMap((g) => g.members);
    if (new Set(all).size !== all.length) errs.push('Satu brand hanya boleh masuk satu group brand.');
    const chKeys = String(f.get('channels_csv') || '').split(',').filter(Boolean)
      .filter((k) => { const [c, t] = k.split('|'); return E.CHANNEL_TYPES[t] && DB.t('channels').some((x) => x.code === c); });
    if (errs.length) { UI.retry(errs, f); return; }
    if (!DB.t('years').some((y) => y.year === v.year)) DB.t('years').push({ year: v.year, is_active: true, note: null });
    const type = DB.t('programTypes').find((t) => t.is_active) || DB.t('programTypes')[0];
    const now = new Date().toISOString();
    const p = DB.insert('programs', Object.assign({}, v, { program_type_id: type ? type.id : null, description: null, status: 'DRAFT', published_at: null, published_by: null,
      cloned_from_program_id: null, lock_version: 1, brand_groups: groups, created_by: UI.currentUser().id, created_at: now, updated_at: now }));
    for (const k of chKeys) {
      const [code, ctype] = k.split('|');
      const pc = DB.insert('programChannels', { program_id: p.id, channel_code: code, channel_type: ctype, pillar_framework_name: 'Vision Compass', monitoring_frequency: 'QUARTERLY',
        elig_min_sell_out_months: null, elig_ratio_min: null, elig_ratio_max: null, elig_ratio_at_registration: false, elig_min_baseline: {}, elig_prior_payout_required: false,
        elig_exclusive_program_ids: [], elig_exceptions: [] });
      E.createChannelDefaults(pc, UI.currentUser().id);
      groups.forEach((g, i) => DB.insert('programChannelBrands', { program_channel_id: pc.id, brand_code: g.lead, member_codes: g.members.filter((m) => m !== g.lead),
        est_growth_pct: null, ir_growth_pct: null, sort_order: i + 1 }));
    }
    E.audit(p.id, 'program', p.id, 'create', null, Object.assign({}, v, { brand_groups: groups.length, channels: chKeys.length }));
    if (v.year !== UI.currentYear()) UI.session.set({ year: v.year });
    done('success', `Program DRAFT <strong>${esc(v.name)}</strong> dibuat dengan ${groups.length} group brand dan ${chKeys.length} channel.`, `/setup/${p.id}/channels`);
  };
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
    // master channel × tipe (Active / Passive) yang belum ada di program
    const taken = (code, type) => p.channels.some((x) => x.channel_code === code && (x.channel_type || null) === type);
    const avail = DB.t('channels').filter((c) => c.is_active && Object.keys(E.CHANNEL_TYPES).some((t) => !taken(c.code, t)));
    // Kartu per channel: status & kelengkapan mengikuti 7 langkah fase Pendaftaran
    const cards = p.channels.map((ch) => {
      const st = SM.phaseStatus(ch, 'REGISTRATION');
      const rows = PHASE_TABS.REGISTRATION.map(([k, label]) => Object.assign({ k, label }, sectionStatus(ch, k)));
      const nDone = rows.filter((r) => r.s === 'done').length;
      const todo = rows.find((r) => r.s !== 'done');
      const [btnLabel, btnCls, k] = st !== 'DRAFT' || !todo ? ['Lihat Setup', 'btn-outline-secondary', 'brands']
        : nDone ? ['Lanjutkan Setup', 'btn-brand', todo.k] : ['Mulai Setup', 'btn-outline-brand', todo.k];
      return `<div class="cps-chcard" data-st="${st}">
        <div class="cps-chcard-top"><div class="cps-chcard-name">${esc(ch.channel_name)}</div>${statusTag(st)}</div>
        <div class="cps-chcard-code">${esc(ch.channel_code)}</div>
        <div class="cps-chcard-meta"><i class="bi bi-tags"></i> ${ch.brands.length} brand · ${ch.pillars.length} pilar</div>
        <div class="cps-chcard-prog"><span>Kelengkapan setup</span><span>${nDone} dari ${rows.length}</span></div>
        <div class="cps-chcard-bar ${nDone === rows.length ? 'is-full' : ''}"><span style="width:${Math.round((nDone / rows.length) * 100)}%"></span></div>
        <div class="cps-chcard-chips">${rows.map((r) => `<a href="#/setup/${p.id}/ch/${ch.id}/${r.k}" class="cps-chcard-chip st-${r.s}" title="${ST_TITLE[r.s]}${r.hint ? ' · ' + r.hint : ''}">${r.s === 'done' ? '<i class="bi bi-check-lg"></i>' : ''}${r.label}</a>`).join('')}</div>
        <div class="cps-chcard-foot">${editable(p) ? `<a href="#" class="btn btn-sm btn-link text-danger" data-click="setup.deleteChannel" data-id="${p.id}" data-pc="${ch.id}" data-confirm="Hapus channel ${esc(ch.channel_name)} beserta konfigurasinya?">Hapus</a>` : '<span></span>'}
          <a href="#/setup/${p.id}/ch/${ch.id}/${k}" class="btn ${btnCls}">${btnLabel}</a></div></div>`;
    }).join('');
    const count = (s) => p.channels.filter((ch) => !s || SM.phaseStatus(ch, 'REGISTRATION') === s).length;
    const filters = [['', 'Semua'], ['PUBLISHED', 'Published'], ['DRAFT', 'Draft'], ['CLOSED', 'Closed']].filter(([s], i) => !i || count(s));
    return {
      title: 'Channel', html: `<div class="cps">${nav(p, 'channels')}
      <div class="cps-chhead"><h2>Channel program</h2>
        <div class="cps-chhead-r"><div class="cps-seg" role="group">${filters.map(([s, l], i) => `<button type="button" class="${i ? '' : 'active'}" data-f="${s}">${l} (${count(s)})</button>`).join('')}</div>
          ${editable(p) && avail.length ? '<button type="button" class="btn btn-brand" id="addChBtn"><i class="bi bi-plus-lg"></i> Tambah Channel</button>' : ''}</div></div>
      <div class="cps-chgrid">${cards || '<div class="text-muted p-4">Belum ada channel. Klik <strong>Tambah Channel</strong> untuk mulai.</div>'}</div>
      <div class="card" id="addCh" ${!editable(p) || avail.length ? 'hidden' : ''}><div class="card-header">Tambah channel</div><div class="card-body">
        <p class="small text-muted">Pilih channel dan tipenya (Active / Passive).</p>
        ${!editable(p) ? '' : avail.length ? `<form data-action="setup.addChannel" data-id="${p.id}"><select name="channel_code" class="form-control mb-2">
          ${avail.map((c) => `<option value="${c.code}">${esc(c.name)}</option>`).join('')}</select>
          <div class="d-flex gap-3 mb-2">${Object.entries(E.CHANNEL_TYPES).map(([k, l], i) => `<label class="mb-0"><input type="radio" name="channel_type" value="${k}" ${i === 0 ? 'checked' : ''} required> ${l}</label>`).join('')}</div>
          <label class="form-label small mb-1">Mulai dari</label><select name="copy_from" class="form-control mb-2">
            <option value="">Preset standar (brand & skema kosong)</option>
            ${p.channels.map((c) => `<option value="${c.id}">Salin dari ${esc(c.channel_name)} (brand, skema, pilar, form, approval, dokumen)</option>`).join('')}</select>
          <button class="btn btn-brand">Tambah</button></form>
          <div class="form-text">Preset standar berisi rumus "${C.PRESET_NAME}", form fase, approval layer contoh & template MOU/SKN. Salin dari channel lain = tinggal ubah yang berbeda. Semua bisa diubah.</div>`
          : '<div class="small text-muted">Semua channel master (Active & Passive) sudah ditambahkan.</div>'}
      </div></div></div>`,
      after(root) {
        const box = root.querySelector('#addCh'); const btn = root.querySelector('#addChBtn');
        if (btn) btn.addEventListener('click', () => { box.hidden = !box.hidden; if (!box.hidden) box.scrollIntoView({ block: 'nearest' }); });
        if (btn && !p.channels.length) box.hidden = false;
        root.querySelectorAll('.cps-seg [data-f]').forEach((b) => b.addEventListener('click', () => {
          root.querySelectorAll('.cps-seg [data-f]').forEach((x) => x.classList.toggle('active', x === b));
          root.querySelectorAll('.cps-chcard').forEach((c) => { c.hidden = !!b.dataset.f && c.dataset.st !== b.dataset.f; });
        }));
      },
    };
  });
  actions['setup.addChannel'] = (f, form) => {
    const pid = Number(form.dataset.id);
    assertDraft(pid);
    const code = f.get('channel_code'); const type = f.get('channel_type');
    if (!E.CHANNEL_TYPES[type]) throw new Error('Pilih tipe channel: Active atau Passive.');
    if (DB.t('programChannels').some((c) => c.program_id === pid && c.channel_code === code && c.channel_type === type)) throw new Error(`Channel ${E.CHANNEL_TYPES[type]} ini sudah ada di program.`);
    const src = f.get('copy_from') ? DB.byId('programChannels', Number(f.get('copy_from'))) : null;
    if (f.get('copy_from') && (!src || src.program_id !== pid)) throw new Error('Channel sumber tidak ditemukan di program ini.');
    let pc;
    if (src) pc = E.cloneChannel(src, pid, UI.currentUser().id, { channel_code: code, channel_type: type });
    else {
      pc = DB.insert('programChannels', { program_id: pid, channel_code: code, channel_type: type, pillar_framework_name: 'Vision Compass', monitoring_frequency: 'QUARTERLY',
        elig_min_sell_out_months: null, elig_ratio_min: null, elig_ratio_max: null, elig_ratio_at_registration: false, elig_min_baseline: {}, elig_prior_payout_required: false,
        elig_exclusive_program_ids: [], elig_exceptions: [] });
      E.createChannelDefaults(pc, UI.currentUser().id);
    }
    E.audit(pid, 'programChannel', pc.id, 'create', null, { channel_code: code, channel_type: type, copied_from: src ? src.id : null });
    touch(pid);
    done('success', src ? 'Channel ditambahkan dari salinan. Periksa bagian yang berbeda di daftar langkah.' : 'Channel ditambahkan. Lanjut pilih brand peserta.', `/setup/${pid}/ch/${pc.id}/brands`);
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
      <form data-action="setup.saveBrands" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
      <div class="card"><div class="card-header"><span class="step-chip">3b</span>&nbsp;Brand peserta — ${esc(ch.channel_name)}</div><div class="card-body">
        <p class="small text-muted mb-3">Baseline diisi CBD/CDT saat pendaftaran.</p>
        <div class="table-responsive"><table class="table table-sm table-bordered">
          <thead><tr><th style="width:60px">Ikut</th><th>Brand (skema) <span class="text-muted fw-normal">+ sub-brand</span></th><th style="width:210px">Baseline minimal <span class="text-muted fw-normal">Rp / bulan</span></th><th class="num" style="width:70px">Kelas</th><th style="width:190px"></th></tr></thead>
          <tbody>${master.filter((b) => !usedAsMember.has(b.code) || inCh[b.code]).map((b) => { const x = inCh[b.code];
            const members = master.filter((m) => m.code !== b.code && !inCh[m.code]);
            const chosen = x ? members.filter((m) => (x.member_codes || []).includes(m.code)) : [];
            const growthInfo = x && (x.est_growth_pct !== null || x.ir_growth_pct !== null) ? `EST ${x.est_growth_pct === null ? '-' : x.est_growth_pct + '%'} · IR ${x.ir_growth_pct === null ? '-' : x.ir_growth_pct + '%'}` : '';
            return `<tr class="cps-brand-row"><td class="text-center"><input type="checkbox" class="form-check-input position-static" name="brand_codes" value="${b.code}" ${chk(!!x)}></td>
              <td><span class="fw-semibold">${esc(b.name)}</span> <code class="small">${b.code}</code>
                <span class="cps-chips">${chosen.map((m) => `<span class="cps-chip">${esc(m.name)}</span>`).join('')}${growthInfo ? `<span class="cps-chip cps-chip-muted">${growthInfo}</span>` : ''}</span></td>
              <td><div class="input-group input-group-sm"><span class="input-group-text">Rp</span><input name="minb_${b.code}" type="number" class="form-control" value="${(ch.elig_min_baseline || {})[b.code] === undefined || (ch.elig_min_baseline || {})[b.code] === null ? '' : ch.elig_min_baseline[b.code]}"
                placeholder="${x && x.classes[0] ? h.rpShort(x.classes[0].baseline_min) : 'kelas terendah'}"></div></td>
              <td class="num">${x ? lmClasses(ch, x).length : '-'}</td>
              <td class="text-right text-nowrap"><span class="cps-brand-tg cps-txtbtn" role="button" tabindex="0" data-btg="${b.code}"><i class="bi bi-chevron-down"></i> Sub-brand & EST/IR</span>
                ${x ? `<a href="#/setup/${p.id}/ch/${ch.id}/scheme/${b.code}" class="btn btn-sm btn-outline-brand ml-2">Skema kelas</a>` : ''}</td></tr>
              <tr class="cps-brand-detail" data-bd="${b.code}" hidden><td></td><td colspan="4"><div class="row g-3">
                <div class="col-md-7"><div class="form-label small mb-1">Sub-brand yang memakai skema ${esc(b.name)}</div>
                  <div class="d-flex flex-wrap gap-2">${members.map((m) => `<label class="small mb-0"><input type="checkbox" name="members_${b.code}" value="${m.code}" ${chk(x && (x.member_codes || []).includes(m.code))}> ${esc(m.name)}</label>`).join('') || '<span class="small text-muted">-</span>'}</div></div>
                <div class="col-md-5"><div class="form-label small mb-1">Growth informasi <span class="warn-mark" title="Definisi masih dikonfirmasi">⚠</span></div><div class="d-flex gap-2">
                  <div class="input-group input-group-sm"><span class="input-group-text">EST</span><input name="est_${b.code}" type="number" step="any" class="form-control" value="${x && x.est_growth_pct !== null ? x.est_growth_pct : ''}"><span class="input-group-text">%</span></div>
                  <div class="input-group input-group-sm"><span class="input-group-text">IR</span><input name="ir_${b.code}" type="number" step="any" class="form-control" value="${x && x.ir_growth_pct !== null ? x.ir_growth_pct : ''}"><span class="input-group-text">%</span></div></div></div>
              </div></td></tr>`; }).join('')}</tbody></table></div>
        <div class="form-text mb-2">Baseline minimal = syarat pendaftaran per brand (saran baseline toko harus ≥ angka ini). Kosong = batas bawah kelas terendah brand tsb (3c).</div>
        <button class="btn btn-brand"><i class="bi bi-save"></i> Simpan brand</button>
        <span class="form-text d-inline ml-2">Contoh: Light+ punya skema sendiri dengan anggota BrightNow; brand juga bisa mengikuti skema brand lain di Skema kelas.</span>
      </div></div></fieldset></form></div></div>`,
      after(root) {
        // baris rincian (sub-brand, EST / IR) dibuka per brand
        const toggle = (code) => {
          const d = root.querySelector(`[data-bd="${code}"]`); const t = root.querySelector(`[data-btg="${code}"]`);
          d.hidden = !d.hidden;
          t.innerHTML = `<i class="bi bi-chevron-${d.hidden ? 'down' : 'up'}"></i> ${d.hidden ? 'Sub-brand & EST/IR' : 'Tutup'}`;
        };
        const form = root.querySelector('form[data-action="setup.saveBrands"]'); // #app tetap ada antar render: listener dipasang di form
        form.addEventListener('click', (e) => { const t = e.target.closest('[data-btg]'); if (t) toggle(t.dataset.btg); });
        form.addEventListener('keydown', (e) => { const t = e.target.closest('[data-btg]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(t.dataset.btg); } });
      },
    };
  });
  actions['setup.saveBrands'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
    const codes = f.all('brand_codes');
    if (!codes.length) throw new Error('Pilih minimal satu brand peserta.');
    const members = Object.fromEntries(codes.map((c) => [c, f.all('members_' + c).filter((m) => !codes.includes(m))]));
    const all = Object.values(members).flat();
    if (new Set(all).size !== all.length) throw new Error('Satu sub-brand hanya boleh ikut satu skema brand.');
    const existing = DB.where('programChannelBrands', (b) => b.program_channel_id === pcId);
    const before = existing.map((b) => b.brand_code);
    for (const b of existing.filter((x) => !codes.includes(x.brand_code))) {
      DB.remove('programClasses', (c) => c.program_channel_brand_id === b.id);
      // JTBD & lead measure milik brand yang dilepas ikut terhapus
      const bj = DB.where('programJtbds', (j) => j.program_channel_brand_id === b.id).map((j) => j.id);
      DB.remove('programLeadMeasures', (l) => bj.includes(l.program_jtbd_id));
      DB.remove('programJtbds', (j) => bj.includes(j.id));
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
    done('success', 'Brand peserta disimpan. Atur rentang baseline tiap brand di Skema kelas.', `/setup/${pid}/ch/${pcId}/brands`);
  };

  // ---------------------------------------------------------------- kelas & tier lama per brand
  // Diganti Skema kelas seragam (setup3.js). Nilai kelas lama (fix rebate maks, conditional / total per tier) tetap tersimpan
  // karena dipakai perhitungan Registration / Payout yang sudah berjalan; editornya tidak ditampilkan lagi.
  route('/setup/:id/ch/:pc/brands/:b', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/scheme`));

  // Kelas yang dipakai editor saran lead measure: kelas skema brand (atau brand acuannya) bila channel sudah memakai skema per brand, selain itu kelas lama brand
  function lmClasses(ch, brand) {
    const st = SM.setupOf(ch);
    if (!SM.hasSchemes(st)) return brand.classes;
    return SM.brandRanges(st, brand.brand_code).map((r) => ({ code: r.code, baseline_min: r.min, baseline_max: r.max }));
  }

  // ---------------------------------------------------------------- 3d · pilar (per channel) → JTBD, lead measure & target (per brand)
  // Langkah 1: pilar sama untuk semua brand di channel. Langkah 2: tiap brand menambah JTBD & lead measure di bawah pilar channel
  // dan mengisi target per kelas di tabel yang sama. Brand yang mengikuti skema brand lain memakai JTBD, lead measure & target brand acuannya.
  function pillarTabs(p, ch, active) {
    const nameOf = Object.fromEntries(ch.brands.map((b) => [b.brand_code, b.brand_name]));
    const done = (b) => lmClasses(ch, b).filter((c) => (b.lm_targets || {})[c.code]).length;
    return `<div class="loop-lane inner mb-3"><div class="loop-label"><i class="bi bi-arrow-repeat"></i> Pilar sekali per channel, lalu JTBD, lead measure & target untuk setiap brand</div>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <a class="btn btn-sm ${active === 'tree' ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/pillars"><i class="bi bi-flag"></i> 1. Pilar channel <span class="badge badge-light">${ch.pillars.length}</span></a>
        <span class="small text-muted ml-2">2. JTBD, lead measure & target:</span>
        ${ch.brands.map((b) => { const fol = b.jtbd_source !== b.brand_code;
          return `<a class="btn btn-sm ${active === b.id ? 'btn-brand' : 'btn-outline-brand'}" href="#/setup/${p.id}/ch/${ch.id}/pillars/${b.id}">${esc(b.brand_name)}
          ${fol ? `<span class="badge badge-light">ikut ${esc(nameOf[b.jtbd_source] || b.jtbd_source)}</span>`
            : `<span class="badge ${lmClasses(ch, b).length && done(b) === lmClasses(ch, b).length ? 'badge-success' : 'badge-light'}">${b.leadMeasures.length} LM · ${done(b)}/${lmClasses(ch, b).length}</span>`}</a>`; }).join('')
          || '<span class="small text-muted">Pilih brand dulu di 3b.</span>'}
      </div></div>`;
  }

  route('/setup/:id/ch/:pc/pillars', ({ id, pc }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const used = (plId) => ch.leadMeasures.filter((l) => l.pillar_id === plId).length;
    const list = ch.pillars.map((pl) => ({ id: pl.id, name: pl.name, used: used(pl.id) }));
    return {
      title: `Pilar · ${ch.channel_name}`, html: `<div class="cps">${nav(p, 'config', ch, 'pillars')}
      ${pillarTabs(p, ch, 'tree')}
      <form data-action="setup.savePillars" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}><input type="hidden" name="tree" id="treeJson">
      <div class="card"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3d</span>&nbsp;Pilar channel — ${esc(ch.channel_name)} ${confirmTag}</span>
        <button type="button" class="btn btn-sm btn-outline-brand" id="addPillar"><i class="bi bi-plus"></i> Pilar</button></div>
        <div class="card-body">
          <div class="row g-2 mb-3"><div class="col-md-5"><label class="form-label">Nama framework <span class="text-danger">*</span></label>
            <input name="framework" class="form-control" value="${esc(ch.pillar_framework_name)}" required placeholder="Vision Compass"><div class="form-text">Juga dipakai sebagai label Fix Rebate.</div></div>
            <div class="col-md-7 small text-muted pt-md-4">Pilar berlaku untuk semua brand di channel ini.</div></div>
          <div id="tree"></div>
          <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan pilar</button>
        </div></div></fieldset></form>
      <form data-action="setup.saveLmExample" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}>
      <div class="card mt-3"><div class="card-header"><i class="bi bi-lightbulb"></i>&nbsp;Pilar di form CBD ${confirmTag}</div><div class="card-body small">
        <label class="d-block mb-2"><input type="checkbox" name="lm_as_detail_example" value="1" ${SM.setupOf(ch).lm_as_detail_example ? 'checked' : ''}> Tampilkan saran lead measure pilar tersebut sebagai contoh teks (placeholder) kolom <strong>detail activation</strong></label>
        <button class="btn btn-brand btn-sm"><i class="bi bi-save"></i> Simpan</button></div></div></fieldset></form></div></div>`,
      after(root) {
        const el = root.querySelector('#tree');
        const ro = !editable(p, ch, 'REGISTRATION');
        function draw() {
          el.innerHTML = list.map((pl, i) => `<div class="input-group input-group-sm mb-2 tree-pillar pl-2"><span class="input-group-text"><i class="bi bi-flag"></i>&nbsp;${i + 1}</span>
              <input class="form-control fw-semibold" data-i="${i}" value="${h.esc(pl.name)}" placeholder="Nama pilar, mis. Being Relevant With Trend">
              <span class="input-group-text small">${pl.used} lead measure (semua brand)</span>
              <button type="button" class="btn btn-outline-secondary" data-act="up" data-i="${i}" ${i ? '' : 'disabled'}><i class="bi bi-arrow-up"></i></button>
              <button type="button" class="btn btn-outline-danger" data-act="del" data-i="${i}"><i class="bi bi-trash"></i></button></div>`).join('')
            || '<div class="text-muted small">Belum ada pilar.</div>';
          if (ro) el.querySelectorAll('input,button').forEach((x) => { x.disabled = true; });
        }
        el.addEventListener('input', (e) => { if (e.target.dataset.i !== undefined) list[e.target.dataset.i].name = e.target.value; });
        el.addEventListener('click', (e) => {
          const b = e.target.closest('[data-act]'); if (!b) return;
          const i = Number(b.dataset.i);
          if (b.dataset.act === 'up') [list[i - 1], list[i]] = [list[i], list[i - 1]];
          if (b.dataset.act === 'del' && confirm(list[i].used ? `Hapus pilar "${list[i].name}" beserta ${list[i].used} lead measure di semua brand?` : `Hapus pilar "${list[i].name}"?`)) list.splice(i, 1);
          draw();
        });
        root.querySelector('#addPillar').addEventListener('click', () => { list.push({ id: null, name: '', used: 0 }); draw(); });
        if (ro) root.querySelector('#addPillar').disabled = true;
        root.querySelector('#treeJson').closest('form').addEventListener('submit', () => { root.querySelector('#treeJson').value = JSON.stringify(list); }, true);
        draw();
      },
    };
  });

  actions['setup.savePillars'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
    const list = JSON.parse(f.get('tree') || '[]');
    const framework = String(f.get('framework') || '').trim();
    if (!framework) throw new Error('Nama framework wajib diisi');
    const errs = [];
    list.forEach((pl, i) => { if (!String(pl.name || '').trim()) errs.push(`Pilar ${i + 1}: nama wajib`); });
    const names = list.map((pl) => String(pl.name || '').trim().toLowerCase());
    if (new Set(names).size !== names.length) errs.push('Nama pilar tidak boleh sama');
    if (errs.length) throw new Error(errs.join(' · '));
    const pc = DB.byId('programChannels', pcId);
    const before = { framework: pc.pillar_framework_name, pillars: DB.where('programPillars', (x) => x.program_channel_id === pcId).map((x) => x.name) };
    pc.pillar_framework_name = framework;
    const oldP = DB.where('programPillars', (x) => x.program_channel_id === pcId).map((x) => x.id);
    const kept = [];
    list.forEach((pl, i) => {
      const v = { program_channel_id: pcId, name: pl.name.trim(), sort_order: i + 1, weight_pct: null };
      let row = oldP.includes(pl.id) && DB.byId('programPillars', pl.id);
      if (row) Object.assign(row, v); else row = DB.insert('programPillars', v);
      kept.push(row.id);
    });
    // pilar dihapus → JTBD & lead measure semua brand di pilar itu ikut terhapus
    const gone = oldP.filter((x) => !kept.includes(x));
    const goneJ = DB.where('programJtbds', (j) => gone.includes(j.program_pillar_id)).map((j) => j.id);
    DB.remove('programLeadMeasures', (l) => goneJ.includes(l.program_jtbd_id));
    DB.remove('programJtbds', (j) => goneJ.includes(j.id));
    DB.remove('programPillars', (x) => gone.includes(x.id));
    E.audit(pid, 'programPillar', pcId, 'replace', before, { framework, pillars: list.map((x) => x.name) });
    touch(pid);
    done('success', `Pilar disimpan (${kept.length} pilar). Lanjut isi JTBD, lead measure & target per brand.`, `/setup/${pid}/ch/${pcId}/pillars`);
  };

  actions['setup.saveLmExample'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    assertDraft(pid, pcId, 'REGISTRATION');
    const pc = DB.byId('programChannels', pcId);
    const st = SM.setupOf(pc); const before = st.lm_as_detail_example;
    st.lm_as_detail_example = f.has('lm_as_detail_example');
    pc.setup = st;
    touch(pid);
    E.audit(pid, 'programChannel', pcId, 'lm_as_detail_example', before, st.lm_as_detail_example);
    done('success', 'Pengaturan saran lead measure disimpan.', `/setup/${pid}/ch/${pcId}/pillars`);
  };

  // ---------------------------------------------------------------- 3d (2) · JTBD, lead measure & target per brand × kelas (× section)
  // Tabel seperti Excel Vision Compass: Pilar (dari channel) · JTBD · Lead measure dibekukan di kiri dan bisa diubah langsung;
  // tiap kelas = kolom (section = sub-kolom). Sel kosong = lead measure tidak berlaku untuk kelas/section itu.
  route('/setup/:id/ch/:pc/pillars/:b', ({ id, pc, b }) => {
    const p = getProgram(id);
    const ch = getChannel(p, pc);
    const brand = ch.brands.find((x) => x.id === Number(b));
    if (!brand) fail('Brand tidak ditemukan');
    const head = `<div class="cps">${nav(p, 'config', ch, 'pillars')}${pillarTabs(p, ch, brand.id)}`;
    if (brand.jtbd_source !== brand.brand_code) {
      const ref = ch.brands.find((x) => x.brand_code === brand.jtbd_source);
      return { title: `Pilar ${brand.brand_name}`, html: `${head}<div class="card"><div class="card-body">
        <div class="alert alert-info mb-0"><i class="bi bi-link-45deg"></i>&nbsp;<strong>${esc(brand.brand_name)}</strong> mengikuti skema <strong>${esc(ref ? ref.brand_name : brand.jtbd_source)}</strong>, jadi JTBD, lead measure, dan target per kelasnya memakai milik ${esc(ref ? ref.brand_name : brand.jtbd_source)}.
          Ubah di <a href="#/setup/${p.id}/ch/${ch.id}/pillars/${ref ? ref.id : ''}">tab ${esc(ref ? ref.brand_name : brand.jtbd_source)}</a>, atau lepas ikatannya di <a href="#/setup/${p.id}/ch/${ch.id}/scheme/${brand.brand_code}">Skema kelas</a>.</div></div></div></div>` };
    }
    brand.classes = lmClasses(ch, brand); // kelas dari Skema kelas (hanya untuk editor ini)
    // struktur milik brand ini di bawah pilar channel; key = id tersimpan atau kunci sementara (baru)
    const tree = brand.pillars.map((pl) => ({ id: pl.id, name: pl.name, jtbds: pl.jtbds.map((j) => ({ key: `j${j.id}`, id: j.id, name: j.name,
      lms: j.lead_measures.map((l) => ({ key: String(l.id), id: l.id, name: l.name, unit: l.unit || '', value_type: l.value_type })) })) }));
    const saved = brand.lm_targets || {};
    // state per kode kelas; rows[key lead measure]; cells sejajar dengan sections (tanpa section / "gabung" → cells[0]; null = kosong / tidak berlaku)
    const state = Object.fromEntries(brand.classes.map((c) => {
      const t = saved[c.code];
      return [c.code, { configured: !!t, sections: ((t && t.sections) || []).slice(),
        rows: Object.fromEntries(Object.entries((t && t.rows) || {}).map(([k, r]) => [k, { off: !!r.off, same: !!r.same, cells: JSON.parse(JSON.stringify(r.cells || [])) }])) }];
    }));
    const empty = !brand.classes.length ? `Brand ini belum punya kelas. <a href="#/setup/${p.id}/ch/${ch.id}/scheme/${brand.brand_code}">Isi Skema kelas dulu</a>.`
      : !ch.pillars.length ? `Channel belum punya pilar. <a href="#/setup/${p.id}/ch/${ch.id}/pillars">Isi pilar channel dulu</a>.` : '';
    return {
      title: `Pilar ${brand.brand_name}`, html: `${head}
      <form data-action="setup.saveLmTargets" data-id="${p.id}" data-pc="${ch.id}" data-b="${brand.id}"><fieldset ${fs(p, ch, 'REGISTRATION')}><input type="hidden" name="targets" id="lmtJson">
      <div class="card"><div class="card-header"><span class="step-chip">3d</span>&nbsp;JTBD, lead measure & target per kelas ${confirmTag} — ${esc(brand.brand_name)}${brand.member_names.length ? ` <span class="small text-muted">(+ ${esc(brand.member_names.join(', '))})</span>` : ''}</div>
        <div class="card-body">${empty ? `<div class="text-muted">${empty}</div>` : `
          <p class="small text-muted">Sel kosong = tidak berlaku.</p>
          <div class="d-flex justify-content-end align-items-center mb-1 small text-muted">
            <button type="button" class="btn btn-sm btn-link p-0" id="lmtResetW">Reset lebar kolom</button></div>
          <datalist id="lmUnits">${['jam', 'etalase', 'bulan', 'creator', 'slide', 'video', 'sesi/minggu', 'SKU', 'toko', 'kali', 'orang/bulan'].map((u) => `<option value="${u}">`).join('')}</datalist>
          <div class="lmt-sheet-wrap"><table class="lmt-sheet" id="lmtSheet"></table></div>
          <button class="btn btn-brand mt-3"><i class="bi bi-save"></i> Simpan ${esc(brand.brand_name)}</button>`}
        </div></div></fieldset></form></div></div>`,
      after(root) {
        if (empty) return;
        const ro = !editable(p, ch, 'REGISTRATION');
        const box = root.querySelector('#lmtJson').closest('form');
        const v = (x) => (x === null || x === undefined ? '' : x);
        const multi = (s) => s.sections.length > 1;
        const ncol = (s) => Math.max(1, s.sections.length);
        const range = (n) => Array.from({ length: n }, (_, i) => i);
        let seq = 0;
        const newKey = (pre) => `${pre}n${++seq}`;
        const allLms = () => tree.flatMap((pl) => pl.jtbds.flatMap((j) => j.lms));
        const lmOf = (key) => allLms().find((l) => l.key === String(key));
        const jtbdOf = (key) => tree.flatMap((pl) => pl.jtbds).find((j) => j.key === key);
        const rowOf = (code, key) => state[code].rows[key] || (state[code].rows[key] = { off: true, same: false, cells: [] });
        // operator satu per lead measure (berlaku di semua kelas & section); diambil dari sel tersimpan pertama
        const rowOps = {};
        const opOf = (l) => {
          const ops = C.lmTargetOps(l.value_type);
          if (!ops.includes(rowOps[l.key])) {
            const found = brand.classes.map((c) => rowOf(c.code, l.key)).flatMap((r) => (r.off ? [] : r.cells)).find((x) => x && ops.includes(x.op));
            rowOps[l.key] = found ? found.op : ops[0];
          }
          return rowOps[l.key];
        };
        const newCell = (l) => ({ op: opOf(l), value: '', text: '' });
        const cellAt = (s, r, i) => (r.off ? null : !multi(s) || r.same ? r.cells[0] || null : r.cells[i] || null);
        function ensureCell(code, l, i) {
          const s = state[code]; const r = rowOf(code, l.key);
          if (r.off) { r.off = false; r.same = false; r.cells = range(multi(s) ? ncol(s) : 1).map(() => null); }
          const k = !multi(s) || r.same ? 0 : i;
          if (!r.cells[k]) r.cells[k] = newCell(l);
          r.cells[k].op = opOf(l);
          s.configured = true;
          return r.cells[k];
        }

        // ---- lebar kolom: bisa ditarik, diingat per brand di browser ini (bukan data program)
        const WKEY = `tradee-lmt-widths-${brand.id}`;
        const DEF_W = { f1: 170, f2: 240, f3: 330 };
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
          const s = state[code]; const r = rowOf(code, l.key);
          const c = cellAt(s, r, i);
          const op = opOf(l);
          const a = `data-c="${h.esc(code)}" data-l="${h.esc(l.key)}" data-i="${i}"`;
          const unit = C.lmUnit(l);
          const mergeBtn = multi(s) && (merged || i === 0)
            ? `<button type="button" class="lmt-merge" data-act="${merged ? 'split' : 'merge'}" ${a} title="${merged ? 'Pisahkan per section' : 'Gabung semua section jadi satu target'}"><i class="bi bi-${merged ? 'arrows-expand-vertical' : 'arrows-collapse-vertical'}"></i></button>` : '';
          return `<div class="lmt-cell${c ? '' : ' is-empty'}${op === 'TEXT' ? ' is-text' : ''}">
            ${op === 'TEXT' ? `<textarea class="lmt-in txt" rows="1" ${a} data-f="text" placeholder="${l.value_type === 'TEXT' ? 'teks target' : 'teks'}">${h.esc(c ? c.text : '')}</textarea>`
              : `<input type="number" step="any" class="lmt-in num" ${a} data-f="value" value="${v(c ? c.value : '')}" placeholder="–"><span class="lmt-unit" title="${h.esc(unit)}">${h.esc(unit)}</span>`}
            ${mergeBtn}</div>`;
        }
        // kolom Lead measure: nama · satuan · tipe · operator · hapus
        function lmHtml(l) {
          const ops = C.lmTargetOps(l.value_type);
          const a = `data-l="${h.esc(l.key)}"`;
          const unit = l.value_type === 'PERCENT' ? '<span class="lmt-st-unit">%</span>' : l.value_type === 'TEXT' ? '<span class="lmt-st-unit text-muted">teks</span>'
            : `<input class="lmt-st-in unit" ${a} data-sf="lunit" value="${h.esc(l.unit)}" list="lmUnits" placeholder="satuan">`;
          return `<div class="lmt-st"><div class="d-flex gap-1"><input class="lmt-st-in name" ${a} data-sf="lname" value="${h.esc(l.name)}" placeholder="Nama lead measure *">
              <button type="button" class="lmt-st-del" data-act="delL" ${a} title="Hapus lead measure"><i class="bi bi-x-lg"></i></button></div>
            <div class="d-flex gap-1 mt-1 align-items-center">${unit}
              <select class="lmt-st-in type" ${a} data-sf="ltype" title="Tipe">${Object.entries(C.LM_VALUE_TYPES).map(([k, t]) => `<option value="${k}" ${sel(l.value_type === k)}>${t}</option>`).join('')}</select>
              ${ops.length > 1 ? `<select class="lmt-op" data-rowop="${h.esc(l.key)}" title="Operator untuk semua kelas">${ops.map((o) => `<option value="${o}" ${sel(opOf(l) === o)}>${C.LM_TARGET_OPS[o]}</option>`).join('')}</select>` : ''}</div></div>`;
        }

        function draw() {
          const cls = brand.classes;
          const leaf = cls.reduce((sum, c) => sum + ncol(state[c.code]), 0);
          const blank = `<td colspan="${leaf}" class="lmt-blank"></td>`;
          const head1 = cls.map((c) => { const s = state[c.code];
            return `<th colspan="${ncol(s)}" class="lmt-class">${rs(`cls:${c.code}`)}Class ${h.esc(c.code)}<div class="lmt-class-sub">${h.rpShort(c.baseline_min)} – ${c.baseline_max === null || c.baseline_max === undefined ? '∞' : h.rpShort(c.baseline_max)}</div>
              ${ro ? '' : `<div class="lmt-class-act"><button type="button" class="btn btn-link btn-sm p-0" data-act="addSec" data-c="${h.esc(c.code)}"><i class="bi bi-plus"></i> Section</button>
                ${s.sections.length ? `<button type="button" class="btn btn-link btn-sm p-0" data-act="secAll" data-c="${h.esc(c.code)}" title="Pakai section kelas ini di semua kelas"><i class="bi bi-files"></i> ke semua kelas</button>` : ''}</div>`}</th>`; }).join('');
          const head2 = cls.map((c) => { const s = state[c.code];
            return s.sections.length ? s.sections.map((x, i) => `<th class="lmt-sec${i ? '' : ' lmt-gstart'}"><div class="d-flex align-items-center gap-1"><input class="lmt-sec-in" data-sec="${i}" data-c="${h.esc(c.code)}" value="${h.esc(x)}" placeholder="nama section">
              ${ro ? '' : `<button type="button" class="lmt-merge text-danger" data-act="delSec" data-c="${h.esc(c.code)}" data-i="${i}" title="Hapus section"><i class="bi bi-x"></i></button>`}</div>${rs(`${c.code}:${i}`)}</th>`).join('')
              : `<th class="lmt-sec lmt-gstart">Target${rs(`${c.code}:0`)}</th>`; }).join('');
          const body = tree.map((pl, pi) => {
            const span = Math.max(1, pl.jtbds.reduce((sum, j) => sum + Math.max(1, j.lms.length), 0));
            const plCell = `<td class="fz fz1" rowspan="${span}"><div class="fw-bold">${h.esc(pl.name)}</div>
              ${ro ? '' : `<button type="button" class="btn btn-sm btn-link p-0 mt-1" data-act="addJ" data-p="${pi}"><i class="bi bi-plus"></i> JTBD</button>`}</td>`;
            if (!pl.jtbds.length) return `<tr class="lmt-pfirst">${plCell}<td class="fz fz2 text-muted small">Belum ada JTBD</td><td class="fz fz3"></td>${blank}</tr>`;
            return pl.jtbds.map((j, ji) => {
              const jCell = `<td class="fz fz2" rowspan="${Math.max(1, j.lms.length)}"><div class="lmt-st"><div class="d-flex gap-1">
                <textarea class="lmt-st-in name" rows="2" data-j="${h.esc(j.key)}" data-sf="jname" placeholder="Nama JTBD *">${h.esc(j.name)}</textarea>
                <button type="button" class="lmt-st-del" data-act="delJ" data-j="${h.esc(j.key)}" title="Hapus JTBD"><i class="bi bi-trash"></i></button></div>
                ${ro ? '' : `<button type="button" class="btn btn-sm btn-link p-0 mt-1" data-act="addL" data-j="${h.esc(j.key)}"><i class="bi bi-plus"></i> Lead measure</button>`}</div></td>`;
              const first = ji === 0 ? plCell : '';
              const cls1 = ji === 0 ? ' class="lmt-pfirst"' : '';
              if (!j.lms.length) return `<tr${cls1}>${first}${jCell}<td class="fz fz3 text-muted small">Belum ada lead measure</td>${blank}</tr>`;
              return j.lms.map((l, li) => {
                const cells = cls.map((c) => { const s = state[c.code]; const r = rowOf(c.code, l.key);
                  if (multi(s) && !r.off && r.same) return `<td colspan="${ncol(s)}" class="lmt-merged lmt-gstart">${cellHtml(c.code, l, 0, true)}</td>`;
                  return range(ncol(s)).map((i) => `<td${i ? '' : ' class="lmt-gstart"'}>${cellHtml(c.code, l, i, false)}</td>`).join(''); }).join('');
                return `<tr${li === 0 ? cls1 : ''}>${li === 0 ? first + jCell : ''}<td class="fz fz3">${lmHtml(l)}</td>${cells}</tr>`;
              }).join('');
            }).join('');
          }).join('');
          root.querySelector('#lmtSheet').innerHTML = `<colgroup>${colKeys().map((k) => `<col data-col="${h.esc(k)}">`).join('')}</colgroup>
            <thead><tr class="lmt-hr1"><th rowspan="2" class="fz fz1">Pilar${rs('f1')}</th><th rowspan="2" class="fz fz2">JTBD${rs('f2')}</th><th rowspan="2" class="fz fz3">Lead measure${rs('f3')}</th>${head1}</tr>
            <tr class="lmt-hr2">${head2}</tr></thead><tbody>${body}</tbody>`;
          applyWidths();
          root.querySelectorAll('#lmtSheet textarea').forEach(fit);
          if (ro) root.querySelectorAll('#lmtSheet input,#lmtSheet select,#lmtSheet button,#lmtSheet textarea').forEach((x) => { x.disabled = true; });
        }

        // tarik tepi judul kolom → ubah lebar. Listener dokumen dipasang sekali dan menunjuk ke halaman yang sedang tampil.
        let drag = null;
        box.addEventListener('mousedown', (e) => {
          const hd = e.target.closest('.lmt-rs'); if (!hd) return;
          e.preventDefault();
          const key = hd.dataset.rs;
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
          up() { if (!drag) return; drag = null; document.body.classList.remove('lmt-resizing'); saveW(); root.querySelectorAll('#lmtSheet textarea').forEach(fit); },
        };
        if (!window.lmtResizeBound) {
          window.lmtResizeBound = true;
          document.addEventListener('mousemove', (e) => window.lmtResize && window.lmtResize.move(e));
          document.addEventListener('mouseup', () => window.lmtResize && window.lmtResize.up());
        }
        const fitAll = () => root.querySelectorAll('#lmtSheet textarea').forEach(fit);
        let lastW = 0;
        if (window.ResizeObserver) new ResizeObserver(([en]) => { const w = Math.round(en.contentRect.width); if (w !== lastW) { lastW = w; fitAll(); } }).observe(root.querySelector('#lmtSheet'));
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
        root.querySelector('#lmtResetW').addEventListener('click', () => { W = {}; saveW(); applyWidths(); fitAll(); });

        box.addEventListener('input', (e) => {
          const d = e.target.dataset;
          if (d.sec !== undefined) { state[d.c].sections[Number(d.sec)] = e.target.value; state[d.c].configured = true; return; }
          if (d.sf === 'jname') { jtbdOf(d.j).name = e.target.value; fit(e.target); return; }
          if (d.sf === 'lname') { lmOf(d.l).name = e.target.value; return; }
          if (d.sf === 'lunit') { lmOf(d.l).unit = e.target.value; return; }
          if (!d.l || !['value', 'text'].includes(d.f)) return;
          ensureCell(d.c, lmOf(d.l), Number(d.i))[d.f] = e.target.value;
          e.target.closest('.lmt-cell').classList.toggle('is-empty', e.target.value === '');
          if (e.target.tagName === 'TEXTAREA') fit(e.target);
        });
        box.addEventListener('change', (e) => {
          const d = e.target.dataset;
          if (d.sf === 'lunit') { draw(); return; } // satuan tampil di sel target
          if (d.sf === 'ltype') { const l = lmOf(d.l); l.value_type = e.target.value; if (l.value_type !== 'NUMBER') l.unit = ''; opOf(l); draw(); return; }
          const id = d.rowop; if (!id) return;
          rowOps[id] = e.target.value;
          for (const c of brand.classes) {
            const r = rowOf(c.code, id);
            if (r.off) continue;
            r.cells.forEach((x) => { if (x) x.op = rowOps[id]; });
            state[c.code].configured = true;
          }
          draw();
        });
        box.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-act]'); if (!btn) return;
          const act = btn.dataset.act;
          // ---- struktur JTBD & lead measure
          if (act === 'addJ') { tree[Number(btn.dataset.p)].jtbds.push({ key: newKey('j'), id: null, name: '', lms: [{ key: newKey('l'), id: null, name: '', unit: '', value_type: 'NUMBER' }] }); draw(); return; }
          if (act === 'addL') { jtbdOf(btn.dataset.j).lms.push({ key: newKey('l'), id: null, name: '', unit: '', value_type: 'NUMBER' }); draw(); return; }
          if (act === 'delJ') {
            const pl = tree.find((x) => x.jtbds.some((j) => j.key === btn.dataset.j)); const j = jtbdOf(btn.dataset.j);
            if (!confirm(`Hapus JTBD "${j.name || '(tanpa nama)'}" beserta ${j.lms.length} lead measure & targetnya?`)) return;
            pl.jtbds = pl.jtbds.filter((x) => x !== j); draw(); return;
          }
          if (act === 'delL') {
            const j = tree.flatMap((pl) => pl.jtbds).find((x) => x.lms.some((l) => l.key === btn.dataset.l)); const l = lmOf(btn.dataset.l);
            if (!confirm(`Hapus lead measure "${l.name || '(tanpa nama)'}" beserta targetnya?`)) return;
            j.lms = j.lms.filter((x) => x !== l); draw(); return;
          }
          // ---- target & section
          if (!btn.dataset.c) return;
          const code = btn.dataset.c; const s = state[code];
          if (act === 'merge' || act === 'split') {
            const l = lmOf(btn.dataset.l); const r = rowOf(code, l.key);
            if (act === 'merge') { const first = r.off ? null : r.cells.find((x) => x); r.off = false; r.same = true; r.cells = [first || newCell(l)]; }
            else { const c0 = r.cells[0]; r.same = false; r.cells = range(ncol(s)).map(() => (c0 ? Object.assign({}, c0) : null)); }
          } else if (act === 'addSec') {
            s.sections.push('');
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
          for (const l of allLms()) opOf(l);
          root.querySelector('#lmtJson').value = JSON.stringify({ tree, targets: state, ops: rowOps });
        }, true);
        draw();
      },
    };
  });

  actions['setup.saveLmTargets'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc); const bId = Number(form.dataset.b);
    assertDraft(pid, pcId, 'REGISTRATION');
    const brandRow = DB.byId('programChannelBrands', bId);
    const ch = E.loadProgram(pid).channels.find((c) => c.id === pcId);
    const brand = ch.brands.find((x) => x.id === bId);
    if (brand.jtbd_source !== brand.brand_code) throw new Error(`${brand.brand_name} mengikuti skema brand lain; ubah JTBD di brand acuannya.`);
    brand.classes = lmClasses(ch, brand);
    const payload = JSON.parse(f.get('targets') || '{}');
    const tree = payload.tree || []; const raw = payload.targets || {}; const ops = payload.ops || {};
    const pillarIds = ch.pillars.map((pl) => pl.id);
    const errs = [];
    tree.forEach((pl) => {
      if (!pillarIds.includes(pl.id)) errs.push('Pilar sudah tidak ada di channel; muat ulang halaman');
      pl.jtbds.forEach((j) => {
        if (!String(j.name || '').trim()) errs.push(`Pilar "${pl.name}": ada JTBD tanpa nama`);
        if (!j.lms.length) errs.push(`JTBD "${j.name}": minimal 1 lead measure`);
        j.lms.forEach((l) => {
          if (!String(l.name || '').trim()) errs.push(`JTBD "${j.name}": ada lead measure tanpa nama`);
          const unit = String(l.unit || '').trim();
          if (C.lmType(l.value_type) !== 'NUMBER') return;
          if (!unit) errs.push(`Lead measure "${l.name}": satuan wajib untuk tipe Angka`);
          else if (/^[\d.,\s]+$/.test(unit)) errs.push(`Lead measure "${l.name}": satuan "${unit}" berupa angka; isi satuannya (mis. jam, etalase)`);
        });
      });
    });
    // target: section & angka divalidasi sebelum apa pun disimpan (simpan semua atau tidak sama sekali)
    const lmName = Object.fromEntries(tree.flatMap((pl) => pl.jtbds.flatMap((j) => j.lms)).map((l) => [String(l.key), l.name]));
    for (const c of brand.classes) {
      const s = raw[c.code]; if (!s || !s.configured) continue;
      const sections = (s.sections || []).map((x) => String(x || '').trim());
      if (sections.some((x) => !x)) errs.push(`Kelas ${c.code}: nama section wajib diisi`);
      if (new Set(sections).size !== sections.length) errs.push(`Kelas ${c.code}: nama section tidak boleh sama`);
      for (const [key, r] of Object.entries(s.rows || {})) {
        if (!lmName[key] || r.off) continue;
        for (const cell of r.cells || []) if (cell && cell.value !== '' && cell.value !== null && cell.value !== undefined && ops[key] !== 'TEXT' && !Number.isFinite(Number(cell.value))) errs.push(`Kelas ${c.code} · ${lmName[key]}: target harus angka`);
      }
    }
    if (errs.length) throw new Error([...new Set(errs)].slice(0, 8).join(' · '));
    // ---- struktur JTBD & lead measure milik brand ini (id lama dipertahankan: evidence monitoring merujuk id lead measure)
    const oldJ = DB.where('programJtbds', (j) => j.program_channel_brand_id === bId).map((j) => j.id);
    const oldL = DB.where('programLeadMeasures', (l) => oldJ.includes(l.program_jtbd_id)).map((l) => l.id);
    const keptJ = []; const lmSaved = []; // [{ key, id, value_type, name }]
    tree.forEach((pl) => pl.jtbds.forEach((j, ji) => {
      const jv = { program_pillar_id: pl.id, program_channel_brand_id: bId, name: j.name.trim(), sort_order: ji + 1 };
      let jr = oldJ.includes(j.id) && DB.byId('programJtbds', j.id);
      if (jr) Object.assign(jr, jv); else jr = DB.insert('programJtbds', jv);
      keptJ.push(jr.id);
      j.lms.forEach((l, li) => {
        const type = C.lmType(l.value_type);
        const lv = { program_jtbd_id: jr.id, name: l.name.trim(), description: null, unit: type === 'NUMBER' ? String(l.unit || '').trim() || null : null, value_type: type, weight_pct: null, sort_order: li + 1 };
        let lr = oldL.includes(l.id) && DB.byId('programLeadMeasures', l.id);
        if (lr) Object.assign(lr, lv); else lr = DB.insert('programLeadMeasures', lv);
        lmSaved.push({ key: String(l.key), id: lr.id, value_type: type, name: lv.name });
      });
    }));
    const keptL = lmSaved.map((x) => x.id);
    DB.remove('programLeadMeasures', (l) => oldL.includes(l.id) && !keptL.includes(l.id));
    DB.remove('programJtbds', (j) => oldJ.includes(j.id) && !keptJ.includes(j.id));
    // ---- target per kelas (kunci baris = id lead measure)
    const out = {};
    for (const c of brand.classes) {
      const s = raw[c.code];
      if (!s || !s.configured) {
        const prev = (brandRow.lm_targets || {})[c.code];
        if (prev) out[c.code] = Object.assign({}, prev, { rows: Object.fromEntries(Object.entries(prev.rows || {}).filter(([k]) => keptL.includes(Number(k)))) });
        continue;
      }
      const sections = (s.sections || []).map((x) => String(x || '').trim());
      const nCols = sections.length > 1 ? sections.length : 1;
      const rows = {};
      for (const l of lmSaved) {
        const r = (s.rows || {})[l.key] || { off: true };
        if (r.off) { rows[l.id] = { off: true, same: false, cells: [] }; continue; }
        const same = sections.length > 1 && !!r.same;
        const n = same ? 1 : nCols;
        const opAll = C.lmTargetOps(l.value_type).includes(ops[l.key]) ? ops[l.key] : C.lmTargetOps(l.value_type)[0];
        // sel kosong / null = lead measure tidak berlaku di kelas / section itu
        const cells = Array.from({ length: n }, (_, i) => (r.cells || [])[i]).map((cell) => {
          if (!cell) return null;
          const op = opAll;
          const value = op === 'TEXT' || cell.value === '' || cell.value === null || cell.value === undefined ? null : Number(cell.value);
          const text = op === 'TEXT' ? String(cell.text || '').trim() : null;
          if (op === 'TEXT' ? !text : value === null) return null;
          return { op, value, text };
        });
        rows[l.id] = cells.every((x) => x === null) ? { off: true, same: false, cells: [] } : { off: false, same, cells };
      }
      out[c.code] = { sections, rows };
    }
    const before = { lm_targets: brandRow.lm_targets || null };
    brandRow.lm_targets = out;
    E.audit(pid, 'programLeadMeasureTarget', bId, 'replace', before, { jtbd: keptJ.length, lead_measures: keptL.length, lm_targets: out });
    touch(pid);
    done('success', `${esc(brand.brand_name)} disimpan: ${keptJ.length} JTBD, ${keptL.length} lead measure, target ${Object.keys(out).length}/${brand.classes.length} kelas. Sel kosong = tidak berlaku.`, `/setup/${pid}/ch/${pcId}/pillars/${bId}`);
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
      ${UI.currentUser().role === 'SUPERADMIN' ? '' : '<div class="alert alert-info py-2 small"><i class="bi bi-lock"></i>&nbsp;Rumus hanya dapat diubah Admin IT. Admin HO dapat melihat rumus yang berlaku.</div>'}
      <form data-action="setup.saveFormulas" data-id="${p.id}" data-pc="${ch.id}"><fieldset ${fs(p, ch, 'PAYOUT') || (UI.currentUser().role === 'SUPERADMIN' ? '' : 'disabled')}>
      <div class="card mb-3"><div class="card-header d-flex justify-content-between"><span><span class="step-chip">3e</span>&nbsp;Rumus per slot — ${esc(ch.channel_name)} ${soonTag}</span>
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
        if (!editable(p, ch, 'PAYOUT') || UI.currentUser().role !== 'SUPERADMIN') root.querySelector('#addOv').disabled = true;
      },
    };
  });

  actions['setup.saveFormulas'] = (f, form) => {
    const pid = Number(form.dataset.id); const pcId = Number(form.dataset.pc);
    if (UI.currentUser().role !== 'SUPERADMIN') throw new Error('Rumus hanya dapat diubah Admin IT.');
    assertDraft(pid, pcId, 'PAYOUT');
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

  window.SetupShared = { getProgram, getChannel, nav, assertDraft, assertDocsEditable, touch, editable, fs, phaseMatrix, statusTag, programLocked, confirmTag, soonTag, lmClasses };
})();
