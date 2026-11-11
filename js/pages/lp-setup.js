// Program Setup (level program) mengikuti mockup layar 1–6:
// Daftar Program · Buat Program (Informasi → Setup Brand → Channel) · halaman program (Channel / Daftar Brand) · Salin Program · Tambah Channel
(function () {
  const { route, go, flash, requireSetup } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, chip, sw } = L;
  const ico = {
    plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
    back: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M16 10H4M9 5l-5 5 5 5"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#2A3D4A" stroke-width="1.8" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.7 9.5h5.6l.7-9.5"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };
  L.ico = ico;
  const page = (title, after) => ({ title, html: '<div class="lp"></div>', after: (root) => after(root.querySelector('.lp')) });
  L.page = page;
  const dialog = (title, body, foot, cls = '') => `<div class="lp-ov"><div class="lp-dlg ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="dh"><h2 class="h3">${esc(title)}</h2><button type="button" class="btn btn-g" aria-label="Tutup" data-on="closeDlg">${ico.close}</button></div>
    <div class="db">${body}</div><div class="df">${foot}</div></div></div>`;
  L.dialog = dialog;
  const nextCode = (year) => { const pre = `LP-${year}-`; const n = L.programs().filter((p) => p.code.startsWith(pre)).map((p) => Number(p.code.slice(pre.length)) || 0); return pre + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0'); };
  const openCount = (p) => L.channels(p.id).filter((c) => L.regOpen(c)).length;

  // Salin program: group brand + fixed rebate + channel terpilih beserta setup-nya (status kembali Draft)
  function copyProgram(src, v, chIds) {
    const p = DB.insert(L.T.programs, { code: nextCode(v.start.slice(0, 4)), name: v.name, year: Number(v.start.slice(0, 4)), period_start: v.start, period_end: v.end,
      fr_enabled: src.fr_enabled, fr_name: src.fr_name, multi_program: src.multi_program, brand_groups: JSON.parse(JSON.stringify(src.brand_groups)),
      cloned_from: src.id, brand_locked_at: L.now(), created_at: L.now(), updated_at: L.now(), updated_by: UI.currentUser().name });
    for (const c of L.channels(src.id).filter((c) => chIds.includes(c.id))) {
      const n = JSON.parse(JSON.stringify(c)); delete n.id;
      Object.assign(n, { program_id: p.id, reg_status: 'DRAFT', pay_status: 'DRAFT', reg_published_at: null, pay_published_at: null, audit: [] });
      n.extra_phases = (n.extra_phases || []).map((x) => Object.assign(x, { status: 'DRAFT' }));
      const last = c.mou.revisions[c.mou.revisions.length - 1];
      n.mou.revisions = last ? [{ no: 1, file: last.file, note: `Disalin dari ${src.code}`, by: UI.currentUser().name, at: L.now() }] : [];
      L.audit(n, 'Salin channel', `Dari ${src.code}`);
      DB.insert(L.T.channels, n);
    }
    return p;
  }
  L.nextCode = nextCode;

  // ---------------------------------------------------------------- 1 · Daftar Program
  route('/setup', () => {
    requireSetup();
    return page('Program Setup', (root) => {
      const progs = () => L.programs().slice().sort((a, b) => b.period_start.localeCompare(a.period_start) || b.id - a.id);
      L.view(root, {
        state: { q: '', st: '', dlg: null },
        html: (S) => {
          const all = progs();
          const cnt = (st) => all.filter((p) => L.programStatus(p) === st).length;
          const years = all.map((p) => p.year); const yr = years.length ? `tahun ${Math.min(...years)}–${Math.max(...years)}` : '';
          const q = S.q.trim().toLowerCase();
          const rows = all.filter((p) => (!S.st || L.programStatus(p) === S.st) && (!q || (p.code + ' ' + p.name).toLowerCase().includes(q)));
          const cols = 'grid-template-columns: 120px minmax(220px, 2fr) 170px 150px 120px 140px 150px;';
          const tile = (label, v, note, color = '') => `<div class="card pad-s"><span class="lbl up">${label}</span><span class="kpi-v" style="${color}">${v}</span><span class="muted xs">${note}</span></div>`;
          return `<div class="between" style="align-items:flex-end"><h1 class="title">Program Setup</h1>
            <div class="row-f"><button type="button" class="btn btn-s" data-on="openClone">${ico.copy}Salin dari Program Lalu</button><a class="btn btn-p" href="#/setup/new">${ico.plus}Buat Program</a></div></div>
          <div class="grid-auto">${tile('Total Program', all.length, yr)}${tile('Draft', cnt('DRAFT'), 'belum semua channel dipublikasikan', 'color:#304DDE')}
            ${tile('Published', cnt('PUBLISHED'), 'semua channel &amp; fase dipublikasikan', 'color:#33995E')}${tile('Closed', cnt('CLOSED'), 'periode program sudah lewat')}</div>
          <section class="card pad">
            <div class="between"><h2 class="h3">Daftar Program</h2>
              <div class="row-f"><input class="inp" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama program..." aria-label="Cari program" style="width:280px">
                <select class="inp" data-chg="st" aria-label="Filter status" style="width:160px"><option value="">Semua Status</option>${['DRAFT', 'PUBLISHED', 'CLOSED'].map((s) => `<option value="${s}" ${S.st === s ? 'selected' : ''}>${L.STATUS_CHIP[s][0]}</option>`).join('')}</select></div></div>
            <div class="tblbox"><div style="min-width:900px">
              <div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Nama Program</div><div class="th">Periode</div><div class="th">Channel</div><div class="th">Status</div><div class="th">Diubah</div><div class="th">Aksi</div></div>
              ${rows.map((p) => { const chs = L.channels(p.id); const st = L.programStatus(p); const o = openCount(p);
                return `<div class="gr" style="${cols}"><div class="td b">${esc(p.code)}</div><div class="td b">${esc(p.name)}</div><div class="td">${L.periodTxt(p.period_start, p.period_end)}</div>
                <div class="td">${chs.length} channel${st === 'CLOSED' ? '' : ` · ${o === chs.length && o ? 'semua' : o} dibuka`}</div><div class="td">${L.statusChip(st)}</div>
                <div class="td c"><span>${L.dateTxt(p.updated_at)}</span><span class="muted">${esc(p.updated_by || '')}</span></div>
                <div class="td" style="gap:12px"><a href="#/setup/${p.id}" class="b" style="text-decoration:none">Buka Setup</a><button type="button" class="btn btn-g" data-on="openClone" data-id="${p.id}">Salin</button></div></div>`; }).join('')
                || '<div class="td muted" style="justify-content:center;padding:24px">Tidak ada program untuk filter ini.</div>'}
            </div></div>
            <div class="row-f muted xs" style="gap:6px 16px">
              <span class="row-f" style="gap:6px">${chip('Draft', 'c-blue')}belum semua channel dipublikasikan</span>
              <span class="row-f" style="gap:6px">${chip('Published', 'c-green')}semua channel dan fase (pendaftaran &amp; pencairan) dipublikasikan</span>
              <span class="row-f" style="gap:6px">${chip('Closed', 'c-grey')}periode program sudah lewat</span></div>
          </section>${S.dlg ? cloneDlg(S) : ''}`;
        },
        on: {
          q: (S, el) => { S.q = el.value; return true; },
          st: (S, el) => { S.st = el.value; },
          openClone: (S, el) => { const src = L.program(el.dataset.id) || progs()[0]; S.dlg = cloneState(src); },
          closeDlg: (S) => { S.dlg = null; },
          cSrc: (S, el) => { S.dlg = cloneState(L.program(el.value)); },
          cName: (S, el) => { S.dlg.name = el.value; return false; },
          cStart: (S, el) => { S.dlg.start = el.value; return false; },
          cEnd: (S, el) => { S.dlg.end = el.value; return false; },
          cCh: (S, el) => { const id = Number(el.dataset.id); S.dlg.off[id] = !el.checked; },
          cAll: (S) => { const chs = L.channels(S.dlg.src); const all = chs.every((c) => !S.dlg.off[c.id]); chs.forEach((c) => { S.dlg.off[c.id] = all; }); },
          cGo: (S) => {
            const d = S.dlg; const ids = L.channels(d.src).filter((c) => !d.off[c.id]).map((c) => c.id);
            if (!d.name.trim()) { d.err = 'Nama program wajib diisi.'; return; }
            if (!d.start || !d.end || d.end <= d.start) { d.err = 'Periode selesai harus setelah periode mulai.'; return; }
            const p = copyProgram(L.program(d.src), { name: d.name.trim(), start: d.start, end: d.end }, ids);
            DB.save(); flash('success', `Program <b>${esc(p.name)}</b> dibuat dari ${esc(L.program(d.src).code)} dengan ${ids.length} channel.`); go(`/setup/${p.id}`); return false;
          },
        },
      });
    });
  });
  function cloneState(src) {
    const y = Number(src.period_start.slice(0, 4)) + 1;
    return { src: src.id, name: /\d{4}/.test(src.name) ? src.name.replace(/\d{4}/, String(y)) : `${src.name} ${y}`, start: `${y}-01-01`, end: `${y}-12-31`, off: {}, err: '' };
  }
  function cloneDlg(S) {
    const d = S.dlg; const src = L.program(d.src); const chs = L.channels(src.id); const sel = chs.filter((c) => !d.off[c.id]).length;
    const body = `<label class="field lbl">Program sumber<select class="inp" data-chg="cSrc">${L.programs().map((p) => `<option value="${p.id}" ${p.id === src.id ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label>
      <div class="g2"><label class="field lbl">Kode baru<input class="inp" value="${nextCode(d.start.slice(0, 4) || '2028')}" readonly><span class="muted xs" style="font-weight:400">Dibuat otomatis</span></label>
        <label class="field lbl">Nama program<input class="inp" data-k="cName" data-chg="cName" value="${esc(d.name)}"></label>
        <label class="field lbl">Periode mulai<input class="inp" type="date" data-chg="cStart" value="${d.start}"></label>
        <label class="field lbl">Periode selesai<input class="inp" type="date" data-chg="cEnd" value="${d.end}"></label></div>
      <div class="field"><div class="row-f" style="justify-content:space-between"><span class="lbl">Channel yang disalin · ${sel} dari ${chs.length} dipilih</span>
        <button type="button" class="btn btn-g xs" data-on="cAll">${sel === chs.length ? 'Kosongkan' : 'Pilih semua'}</button></div>
        <div class="box" style="max-height:236px;overflow-y:auto">${chs.map((c) => { const st = L.channelStatus(src, c);
          return `<label class="ck"><input type="checkbox" data-chg="cCh" data-id="${c.id}" ${d.off[c.id] ? '' : 'checked'}><span style="flex:1">${esc(L.channelOf(c.channel_code).name)}</span>${chip(L.STATUS_CHIP[st][0], L.STATUS_CHIP[st][1] + ' s')}</label>`; }).join('') || '<div class="ck muted">Program ini belum punya channel.</div>'}</div></div>
      ${d.err ? `<div class="note-r">${esc(d.err)}</div>` : ''}`;
    return dialog('Salin dari Program Lalu', body, `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="cGo">Salin Program (${sel} channel)</button>`, 'w560');
  }

  // ---------------------------------------------------------------- 2–4 · Buat Program
  route('/setup/new', () => {
    requireSetup();
    return page('Buat Program', (root) => {
      const y = new Date().getFullYear() + 1;
      L.view(root, {
        state: { step: 0, name: `Loyalty Program ${y}`, start: `${y}-01-01`, end: `${y}-12-31`, fr: true, frName: 'Vision Compass', multi: true,
          groups: [{ name: '', members: [], others: [] }], other: {}, chans: {}, confirm: false, err: '' },
        html: (S) => {
          const used = new Set(S.groups.flatMap((g) => g.members.concat(g.others)));
          const free = L.BRANDS.filter((b) => !used.has(b));
          const labels = ['Informasi Program', 'Setup Brand', 'Channel'];
          const code = nextCode((S.start || String(y)).slice(0, 4));
          let body = '';
          if (S.step === 0) body = `<section class="card pad"><h2 class="h3">Informasi Program</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">
              <label class="field lbl">Kode program<input class="inp" value="${code}" readonly><span class="muted xs" style="font-weight:400">Terbuat otomatis</span></label>
              <label class="field lbl">Nama program<input class="inp" data-k="name" data-inp="name" value="${esc(S.name)}"></label>
              <label class="field lbl">Periode mulai<input class="inp" type="date" data-chg="start" value="${S.start}"></label>
              <label class="field lbl">Periode selesai<input class="inp" type="date" data-chg="end" value="${S.end}"></label></div>
            <div class="box" style="padding:14px 16px;display:flex;flex-direction:column;gap:14px;border-radius:8px">
              <div class="row-f" style="gap:14px;align-items:flex-start">${sw(S.fr, 'data-on="fr" aria-label="Program memakai fixed rebate"')}
                <div class="col-f"><span class="b">Fixed rebate</span><span class="muted sm">${S.fr ? 'Program memberikan fixed rebate. Rate diatur di Matriks Kelas dan rinciannya di tab Fixed Rebate Detail.' : 'Program tanpa fixed rebate. Input fixed rebate di Matriks Kelas, tab Fixed Rebate Detail, serta isian fixed rebate di form pendaftaran CBD tidak ditampilkan.'}</span></div></div>
              ${S.fr ? `<label class="field lbl" style="max-width:460px;padding-left:54px">Nama fixed rebate<input class="inp ${S.frName.trim() ? '' : 'warn'}" data-k="frName" data-inp="frName" value="${esc(S.frName)}" placeholder="Contoh: Vision Compass"></label>` : ''}</div>
            <div class="box" style="padding:14px 16px;border-radius:8px"><div class="row-f" style="gap:14px;align-items:flex-start">${sw(S.multi, 'data-on="multi" aria-label="Toko boleh mengikuti program lain"')}
              <div class="col-f"><span class="b">Toko boleh mengikuti program lain</span><span class="muted sm">${S.multi ? 'Toko yang sudah terdaftar di program lain tetap bisa didaftarkan ke program ini.' : 'Toko yang sudah terdaftar di program lain dengan periode yang beririsan tidak bisa didaftarkan ke program ini. Toko tersebut ditandai di Daftar Toko CBD.'}</span></div></div></div></section>`;
          if (S.step === 1) {
            const cols = 'grid-template-columns: 220px minmax(320px, 1fr) 48px;';
            body = `<section class="card pad"><div class="between"><div class="col-f" style="max-width:680px"><h2 class="h3">Setup Brand</h2>
              <span class="muted sm">Atur brand dan group brand yang terdapat pada program ini. Baseline, kelas dan target group brand dihitung dari jumlah penjualan semua brand anggota.</span></div>
              <button class="btn btn-s" type="button" data-on="addGroup">${ico.plus}Tambah Group Brand</button></div>
              <div class="tblbox"><div style="min-width:720px"><div class="gr" style="${cols}"><div class="th">Group Brand</div><div class="th">Brand anggota</div><div class="th"></div></div>
              ${S.groups.map((g, i) => `<div class="gr" style="${cols}"><div class="td"><input class="cell l" data-k="gn${i}" data-inp="gName" data-i="${i}" value="${esc(g.name)}" placeholder="Nama group brand" aria-label="Nama group brand"></div>
                <div class="td wrap">${g.members.map((m, j) => `<span class="lp-chip c-blue" style="height:26px">${esc(m)}<button type="button" class="x" style="padding:0;color:#1E308B" aria-label="Hapus brand" data-on="rmMember" data-i="${i}" data-j="${j}">${ico.x}</button></span>`).join('')}
                  ${g.others.map((m, j) => `<span class="lp-chip c-yellow" style="height:26px" title="Brand di luar master (Others)">${esc(m)}<button type="button" class="x" style="padding:0;color:#695200" aria-label="Hapus brand" data-on="rmOther" data-i="${i}" data-j="${j}">${ico.x}</button></span>`).join('')}
                  ${S.other[i] !== undefined ? `<input class="cell l" style="width:160px" data-k="oth${i}" data-inp="othName" data-i="${i}" value="${esc(S.other[i])}" placeholder="Nama brand (Others)"><button type="button" class="btn btn-g" data-on="addOther" data-i="${i}">Tambah</button>`
                  : `<select class="cell l" style="width:160px" data-chg="addMember" data-i="${i}" aria-label="Tambah brand anggota"><option value="">+ Tambah brand</option>${free.map((b) => `<option>${esc(b)}</option>`).join('')}<option value="__other">Others…</option></select>`}</div>
                <div class="td"><button type="button" class="x" aria-label="Hapus group brand" data-on="rmGroup" data-i="${i}">${ico.trash}</button></div></div>`).join('')}
              </div></div><span class="muted xs">${free.length ? 'Brand tidak ikut program: ' + free.join(', ') + '.' : 'Semua brand sudah masuk group brand.'}</span></section>`;
          }
          if (S.step === 2) {
            body = `<section class="card pad"><div class="col-f"><h2 class="h3">Channel</h2><span class="muted sm">Pilih channel yang ikut program. Channel bisa ditambah nanti.</span></div>
              <div class="tblbox"><div style="min-width:360px"><div class="th">Channel</div>
              ${L.CHANNELS.map((c) => `<div class="td"><label class="row-f" style="gap:10px;cursor:pointer;margin:0;font-weight:400"><input type="checkbox" data-chg="ch" data-code="${c.code}" ${S.chans[c.code] ? 'checked' : ''}><span class="col-f" style="gap:0"><b>${esc(c.name)}</b><span class="muted" style="font-size:11px">${esc(c.full)}</span></span></label></div>`).join('')}
              </div></div></section>`;
          }
          const conf = S.confirm ? dialog(`${free.length} brand belum masuk group brand`, `<div class="row-f">${free.map((b) => chip(b, 'c-grey')).join('')}</div>
            <span>Brand ini tidak akan ikut program. Setup brand tidak bisa diubah setelah program dibuat, sehingga brand ini tidak dapat ditambahkan nanti.</span>`,
            '<button type="button" class="btn btn-s" data-on="closeDlg">Kembali ke Setup Brand</button><button type="button" class="btn btn-p" data-on="confirmNext">Tetap Lanjut</button>', 'w520') : '';
          return `<section class="card head"><div class="head-l"><a href="#/setup" class="back">${ico.back}Kembali</a><div class="row-f" style="gap:10px"><h1 class="h1">Buat Program</h1>${chip('Draft', 'c-blue')}</div></div></section>
            <ol class="steps" aria-label="Langkah">${labels.map((l, i) => `<li class="${i < S.step ? 'done' : i === S.step ? 'cur' : ''}"><span class="n">${i < S.step ? '✓' : i + 1}</span>${l}</li>`).join('')}</ol>
            ${body}${S.err ? `<div class="note-r">${esc(S.err)}</div>` : ''}
            <section class="card head" style="padding:16px 24px"><span class="muted sm">${['Kode program dibuat otomatis.', 'Satu brand hanya boleh masuk satu group brand. Setup brand tidak bisa diubah setelah program dibuat.', `${Object.values(S.chans).filter(Boolean).length} channel dipilih.`][S.step]}</span>
              <div class="row-f">${S.step > 0 ? '<button type="button" class="btn btn-s" data-on="back">Sebelumnya</button>' : ''}${S.step < 2 ? '<button type="button" class="btn btn-p" data-on="next">Lanjut</button>' : '<button type="button" class="btn btn-p" data-on="create">Buat Program</button>'}</div></section>${conf}`;
        },
        on: {
          name: (S, el) => { S.name = el.value; },
          frName: (S, el) => { S.frName = el.value; el.classList.toggle('warn', !el.value.trim()); },
          start: (S, el) => { S.start = el.value; },
          end: (S, el) => { S.end = el.value; },
          fr: (S) => { S.fr = !S.fr; },
          multi: (S) => { S.multi = !S.multi; },
          addGroup: (S) => { S.groups.push({ name: '', members: [], others: [] }); },
          rmGroup: (S, el) => { S.groups.splice(Number(el.dataset.i), 1); },
          gName: (S, el) => { S.groups[el.dataset.i].name = el.value; },
          addMember: (S, el) => { const i = Number(el.dataset.i); if (el.value === '__other') S.other[i] = ''; else if (el.value) { S.groups[i].members.push(el.value); if (!S.groups[i].name) S.groups[i].name = el.value; } },
          othName: (S, el) => { S.other[el.dataset.i] = el.value; },
          addOther: (S, el) => { const i = Number(el.dataset.i); const v = String(S.other[i] || '').trim(); const used = S.groups.flatMap((g) => g.members.concat(g.others)).map((x) => x.toLowerCase());
            if (v && !used.includes(v.toLowerCase())) S.groups[i].others.push(v); delete S.other[i]; },
          rmMember: (S, el) => { S.groups[el.dataset.i].members.splice(Number(el.dataset.j), 1); },
          rmOther: (S, el) => { S.groups[el.dataset.i].others.splice(Number(el.dataset.j), 1); },
          ch: (S, el) => { S.chans[el.dataset.code] = el.checked; },
          closeDlg: (S) => { S.confirm = false; },
          back: (S) => { S.step--; S.err = ''; },
          next: (S) => {
            S.err = '';
            if (S.step === 0) {
              if (!S.name.trim()) { S.err = 'Nama program wajib diisi.'; return; }
              if (!S.start || !S.end || S.end <= S.start) { S.err = 'Periode selesai harus setelah periode mulai.'; return; }
              if (S.fr && !S.frName.trim()) { S.err = 'Nama fixed rebate wajib diisi jika fixed rebate aktif.'; return; }
            }
            if (S.step === 1) {
              if (!S.groups.length) { S.err = 'Tambahkan minimal satu group brand.'; return; }
              if (S.groups.some((g) => !g.name.trim() || !(g.members.length + g.others.length))) { S.err = 'Setiap group brand perlu nama dan minimal satu brand anggota.'; return; }
              const names = S.groups.map((g) => g.name.trim().toLowerCase()); if (new Set(names).size !== names.length) { S.err = 'Nama group brand tidak boleh sama.'; return; }
              const used = new Set(S.groups.flatMap((g) => g.members)); if (L.BRANDS.some((b) => !used.has(b))) { S.confirm = true; return; }
            }
            S.step++;
          },
          confirmNext: (S) => { S.confirm = false; S.step = 2; },
          create: (S) => {
            const codes = L.CHANNELS.map((c) => c.code).filter((c) => S.chans[c]);
            if (!codes.length) { S.err = 'Pilih minimal satu channel.'; return; }
            const p = DB.insert(L.T.programs, { code: nextCode(S.start.slice(0, 4)), name: S.name.trim(), year: Number(S.start.slice(0, 4)), period_start: S.start, period_end: S.end,
              fr_enabled: S.fr, fr_name: S.fr ? S.frName.trim() : '', multi_program: S.multi, cloned_from: null,
              brand_groups: S.groups.map((g, i) => ({ id: 'g' + (i + 1), name: g.name.trim(), members: g.members.slice(), others: g.others.slice() })),
              brand_locked_at: L.now(), created_at: L.now(), updated_at: L.now(), updated_by: UI.currentUser().name });
            for (const c of codes) { const ch = L.newChannel(p.id, c); L.audit(ch, 'Channel dibuat'); DB.insert(L.T.channels, ch); }
            DB.save(); flash('success', `Program <b>${esc(p.name)}</b> dibuat dengan ${p.brand_groups.length} group brand dan ${codes.length} channel.`); go(`/setup/${p.id}`); return false;
          },
        },
      });
    });
  });

  // ---------------------------------------------------------------- 5–6 · Halaman program: Channel / Daftar Brand
  function programHead(p, extra = '') {
    const chs = L.channels(p.id); const o = openCount(p); const st = L.programStatus(p);
    return `<section class="card head"><div class="head-l"><a href="#/setup" class="back">${ico.back}Kembali</a>
      <div class="col-f" style="gap:6px"><div class="row-f" style="gap:10px"><h1 class="h1">${esc(p.name)}</h1>${st === 'DRAFT' ? chip(`${o} dari ${chs.length} channel dibuka`, o ? 'c-green' : 'c-blue') : L.statusChip(st)}</div>
      <span class="muted sm">${esc(p.code)} · Periode ${L.periodTxt(p.period_start, p.period_end)}${p.fr_enabled ? ` · Fixed rebate: ${esc(p.fr_name)}` : ' · Tanpa fixed rebate'}${p.cloned_from && L.program(p.cloned_from) ? ` · disalin dari ${esc(L.program(p.cloned_from).code)}` : ''}</span></div></div>
      <div class="row-f">${extra}</div></section>`;
  }
  L.programHead = programHead;
  const tabsHtml = (p, on) => `<nav class="tabs" aria-label="Bagian program"><a class="tab ${on === 'ch' ? 'on' : ''}" href="#/setup/${p.id}">Channel</a><a class="tab ${on === 'br' ? 'on' : ''}" href="#/setup/${p.id}/brands">Daftar Brand</a></nav>`;
  function addChannelDlg(p, S) {
    const have = new Set(L.channels(p.id).map((c) => c.channel_code)); const avail = L.CHANNELS.filter((c) => !have.has(c.code));
    const sel = avail.filter((c) => S.add[c.code]).length;
    return dialog('Tambah Channel', `<span class="muted sm">Channel baru dimulai dengan status Draft dan setup kosong.</span>
      <div class="box">${avail.map((c) => `<label class="ck"><input type="checkbox" data-chg="addCh" data-code="${c.code}" ${S.add[c.code] ? 'checked' : ''}><span class="col-f" style="gap:0"><b>${esc(c.name)}</b><span class="muted" style="font-size:11px">${esc(c.full)}</span></span></label>`).join('') || '<div class="ck muted">Semua channel master sudah ada di program ini.</div>'}</div>`,
      `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="doAdd" ${sel ? '' : 'disabled'}>Tambah ${sel} channel</button>`, 'w520');
  }
  const channelOn = (p) => ({
    openAdd: (S) => { S.dlg = 'add'; S.add = {}; },
    closeDlg: (S) => { S.dlg = null; },
    addCh: (S, el) => { S.add[el.dataset.code] = el.checked; },
    doAdd: (S) => {
      const codes = Object.keys(S.add).filter((k) => S.add[k]);
      for (const c of codes) { const ch = L.newChannel(p.id, c); L.audit(ch, 'Channel ditambahkan'); DB.insert(L.T.channels, ch); }
      L.touchProgram(p); DB.save(); flash('success', `${codes.length} channel ditambahkan.`); go(`/setup/${p.id}`); return false;
    },
  });
  const getP = (id) => { const p = L.program(id); if (!p) UI.fail('Program tidak ditemukan'); return p; };

  route('/setup/:id', ({ id }) => {
    requireSetup();
    const p = getP(id);
    return page(p.name, (root) => {
      L.view(root, {
        state: { f: 'all', dlg: null, add: {} },
        html: (S) => {
          const chs = L.channels(p.id);
          const st = (c) => L.channelStatus(p, c);
          const list = chs.filter((c) => S.f === 'all' || st(c) === S.f);
          const cnt = (s) => chs.filter((c) => st(c) === s).length;
          const filters = [['all', `Semua (${chs.length})`], ['PUBLISHED', `Published (${cnt('PUBLISHED')})`], ['DRAFT', `Draft (${cnt('DRAFT')})`]];
          const card = (c) => {
            const m = L.channelOf(c.channel_code); const comp = L.completeness(p, c);
            const reg = c.reg_status === 'PUBLISHED' ? chip('Published', 'c-green') : chip('Draft', 'c-blue');
            const pay = c.reg_status !== 'PUBLISHED' ? chip('Menunggu pendaftaran', 'c-grey') : c.pay_status === 'PUBLISHED' ? chip('Published', 'c-green') : chip('Draft', 'c-blue');
            const extra = (c.extra_phases || []).map((x, i) => `<div class="mini"><span class="lbl">${i + 3} · ${esc(x.name)}</span><span style="align-self:flex-start">${x.status === 'PUBLISHED' ? chip('Published', 'c-green') : chip('Draft', 'c-blue')}</span></div>`).join('');
            const action = comp.done === 0 && c.reg_status !== 'PUBLISHED' ? ['Mulai Setup', 'btn-p'] : c.reg_status === 'PUBLISHED' ? ['Buka Channel', 'btn-o'] : ['Lanjutkan Setup', 'btn-o'];
            return `<article class="card" style="padding:18px 20px;display:flex;flex-direction:column;gap:12px;min-width:0">
              <div class="between" style="align-items:flex-start"><div class="col-f" style="gap:2px"><span class="b" style="font-size:16px">${esc(m.name)}</span><span class="muted xs">${esc(m.full)}</span></div>${L.statusChip(st(c))}</div>
              <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"><div class="mini"><span class="lbl">1 · Pendaftaran</span><span style="align-self:flex-start">${reg}</span></div>
                <div class="mini"><span class="lbl">2 · Pencairan</span><span style="align-self:flex-start">${pay}</span></div>${extra}</div>
              <div class="col-f" style="gap:6px"><div class="between xs"><span class="lbl">Kelengkapan setup pendaftaran</span><span class="muted">${comp.done} dari ${comp.total}</span></div>
                <div class="bar6"><div style="width:${Math.round(comp.done / comp.total * 100)}%;background:${c.reg_status === 'PUBLISHED' ? '#33995E' : '#304DDE'}"></div></div>
                <div class="row-f" style="gap:6px">${comp.tabs.map((t) => chip((t.ok ? '✓ ' : '') + t.short, (t.ok ? 'c-green' : 'c-grey') + ' s')).join('')}</div></div>
              <div class="row-f" style="justify-content:flex-end;border-top:1px solid #EBEBEB;padding-top:12px"><a class="btn sm ${action[1]}" href="#/setup/${p.id}/ch/${c.id}/settings">${action[0]}</a></div></article>`;
          };
          return `${programHead(p, L.programClosed(p) ? '' : `<button class="btn btn-p" type="button" data-on="openAdd">${ico.plus}Tambah Channel</button>`)}${tabsHtml(p, 'ch')}
            <div class="between"><h2 class="h3">Channel Program</h2><div class="seg" role="group" aria-label="Filter status">${filters.map(([k, l]) => `<button type="button" class="${S.f === k ? 'on' : ''}" aria-pressed="${S.f === k}" data-on="f" data-f="${k}">${l}</button>`).join('')}</div></div>
            <div class="chgrid">${list.map(card).join('') || '<div class="muted" style="padding:24px">Belum ada channel untuk filter ini.</div>'}</div>
            ${S.dlg === 'add' ? addChannelDlg(p, S) : ''}`;
        },
        on: Object.assign({ f: (S, el) => { S.f = el.dataset.f; } }, channelOn(p)),
      });
    });
  });

  route('/setup/:id/brands', ({ id }) => {
    requireSetup();
    const p = getP(id);
    return page(`Daftar Brand · ${p.name}`, (root) => {
      L.view(root, {
        state: { dlg: null, add: {} },
        html: (S) => {
          const chs = L.channels(p.id);
          const used = new Set(L.groupsOf(p).flatMap((g) => g.members));
          const free = L.BRANDS.filter((b) => !used.has(b));
          const cols = 'grid-template-columns: 200px minmax(280px, 2fr) minmax(260px, 1.4fr);';
          const minLine = (g) => chs.map((c) => { const k = (c.matrix[g.id] || [])[0];
            return `<div class="between" style="width:100%"><span class="muted">${esc(L.channelOf(c.channel_code).name)}</span><b>${k ? L.fj(k.bmin * 1e6) + ` <span class="muted" style="font-weight:400">(kelas ${esc(k.code)})</span>` : '<span class="muted" style="font-weight:400">belum ada matriks</span>'}</b></div>`; }).join('');
          return `${programHead(p, L.programClosed(p) ? '' : `<button class="btn btn-p" type="button" data-on="openAdd">${ico.plus}Tambah Channel</button>`)}${tabsHtml(p, 'br')}
            <div class="col-f" style="max-width:700px"><h2 class="h3">Setup Brand</h2><p class="muted" style="margin:0">Daftar group brand dan brand anggota di program ini. Setup brand ditentukan saat program dibuat dan dipakai semua channel.</p></div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px">
              <div class="tblbox"><div style="min-width:760px"><div class="gr" style="${cols}"><div class="th">Group Brand</div><div class="th">Brand anggota</div><div class="th">Baseline minimal per channel</div></div>
              ${L.groupsOf(p).map((g) => `<div class="gr" style="${cols}"><div class="td b">${esc(g.name)}</div><div class="td wrap">${g.members.map((m) => chip(m, 'c-grey')).join('')}${(g.others || []).map((m) => chip(m + ' (Others)', 'c-yellow')).join('')}</div>
                <div class="td c" style="gap:4px">${minLine(g) || '<span class="muted">Belum ada channel</span>'}</div></div>`).join('')}</div></div>
              <p class="muted xs" style="margin:0">${free.length ? `Brand tidak ikut program: ${free.join(', ')}.` : 'Semua brand ikut program.'} Baseline minimal = batas bawah kelas terendah di Matriks Kelas tiap channel.</p>
            </section>${S.dlg === 'add' ? addChannelDlg(p, S) : ''}`;
        },
        on: channelOn(p),
      });
    });
  });
})();
