// Program Setup level program — mengikuti mockup "Tradee - Program Setup (COMPASS)":
// S1 Daftar Program (+ dialog pilih cara membuat) · S2 Salin dari Program Lalu · S3–S5 Buat Program (+ konfirmasi S26) · S6 Program: Channel / Brand
(function () {
  const { route, go, flash, requireSetup } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc } = L;

  // ---------------------------------------------------------------- komponen COMPASS kecil (dipakai juga lp-channel.js & lp-docs.js)
  const ico = {
    plus: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1.5"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg>',
    back: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 3L5 8l5 5"/></svg>',
    close: '×',
    trash: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 4h10M6.5 4V2.5h3V4M4.5 4l.7 9.5h5.6l.7-9.5"/></svg>',
    x: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 8.5l3.2 3L13 5"/></svg>',
    upload: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 11V3M5 6l3-3 3 3M3 13h10"/></svg>',
    file: '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 1.5h5l3 3V14.5H4z"/><path d="M9 1.5v3h3"/></svg>',
    chat: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M2.5 3h11v8h-6l-3 2.5V11h-2z"/></svg>',
    doc: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 1.5h5l3 3V14.5H4z"/><path d="M6 8h4M6 10.5h4"/></svg>',
  };
  const tag = (txt, kind = '') => `<span class="cx-tag ${kind}">${esc(txt)}</span>`;
  const STATUS_TAG = { DRAFT: ['Draft', ''], PUBLISHED: ['Published', 'ok'], CLOSED: ['Closed', 'err'] };
  const statusTag = (st) => tag(STATUS_TAG[st][0], STATUS_TAG[st][1]);
  const sw = (on, attrs) => `<button type="button" role="switch" aria-checked="${on ? 'true' : 'false'}" class="cx-sw${on ? ' on' : ''}" ${attrs}><span></span></button>`;
  const modal = (title, body, foot, size = '') => `<div class="cx-ov"><div class="cx-modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="mh"><h2>${esc(title)}</h2><button type="button" aria-label="Tutup" data-on="closeDlg">${ico.close}</button></div>
    <div class="mb">${body}</div>${foot ? `<div class="mf">${foot}</div>` : ''}</div></div>`;
  const head = ({ back, title, tagHtml = '', sub = '', sub2 = '', actions = '' }) => `<section class="cx-head"><div class="cx-head-l">
      <a href="${back}" class="cx-back">${ico.back}Kembali</a>
      <div class="cx-col" style="gap:4px;justify-content:center"><div class="cx-row" style="gap:10px"><h1 class="cx-title">${title}</h1>${tagHtml}</div>
        ${sub ? `<span class="t-strong">${sub}</span>` : ''}${sub2 ? `<span class="t-sm">${sub2}</span>` : ''}</div></div>
      ${actions ? `<div class="cx-row">${actions}</div>` : ''}</section>`;
  const field = (label, input, { req = false, help = '', err = '' } = {}) => `<label class="cx-field"><span class="cx-label">${label}${req ? '<span class="req">*</span>' : ''}</span>${input}
    ${err ? `<span class="cx-err">${esc(err)}</span>` : help ? `<span class="cx-help">${help}</span>` : ''}</label>`;
  const page = (title, after) => ({ title, html: '<div class="lp cx"></div>', after: (root) => after(root.querySelector('.lp')) });
  const dt = (iso) => { if (!iso) return '—'; const d = new Date(iso); return `${L.dateTxt(iso)}, ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`; };
  L.cx = { ico, tag, statusTag, STATUS_TAG, sw, modal, head, field, page, dt };
  // kompatibel dengan halaman lama (lp-reg.js memakai L.page/L.dialog/L.ico)
  L.ico = ico;
  L.page = (title, after) => ({ title, html: '<div class="lp"></div>', after: (root) => after(root.querySelector('.lp')) });
  L.dialog = (title, body, foot, cls = '') => `<div class="lp-ov"><div class="lp-dlg ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="dh"><h2 class="h3">${esc(title)}</h2><button type="button" class="btn btn-g" aria-label="Tutup" data-on="closeDlg">${ico.close}</button></div>
    <div class="db">${body}</div><div class="df">${foot}</div></div></div>`;

  const nextCode = (year) => { const pre = `LP-${year}-`; const n = L.programs().filter((p) => p.code.startsWith(pre)).map((p) => Number(p.code.slice(pre.length)) || 0); return pre + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0'); };
  L.nextCode = nextCode;
  const openCount = (p) => L.channels(p.id).filter((c) => L.regOpen(c)).length;
  const getP = (id) => { const p = L.program(id); if (!p) UI.fail('Program tidak ditemukan'); return p; };

  // ---------------------------------------------------------------- S1 · Daftar Program
  route('/setup', () => {
    requireSetup();
    return page('Program Setup', (root) => {
      L.view(root, {
        state: { q: '', st: 'ALL', dlg: false },
        html: (S) => {
          const all = L.programs().slice().sort((a, b) => b.period_start.localeCompare(a.period_start) || a.code.localeCompare(b.code));
          const cnt = (st) => all.filter((p) => L.programStatus(p) === st).length;
          const years = all.map((p) => p.year);
          const q = S.q.trim().toLowerCase();
          const rows = all.filter((p) => (S.st === 'ALL' || L.programStatus(p) === S.st) && (!q || (p.code + ' ' + p.name).toLowerCase().includes(q)));
          const tile = (l, v, n) => `<div class="cx-card" style="padding:16px 20px;gap:8px"><span class="t-sm-b">${l}</span><div class="t-h3">${v}</div><span class="t-sm">${n}</span></div>`;
          const chips = [['ALL', 'Semua'], ['DRAFT', 'Draft'], ['PUBLISHED', 'Published'], ['CLOSED', 'Closed']];
          return `<div class="cx-pagehead"><div class="cx-col"><h1 class="t-h3">Program Setup</h1><span class="t-sm">Kelola program loyalty, group brand, dan channel per periode.</span></div>
              <button type="button" class="cx-btn cx-p" data-on="openNew">Buat Program</button></div>
            <div class="cx-grid4">${tile('Total Program', all.length, years.length ? `periode ${Math.min(...years)}–${Math.max(...years)}` : '—')}${tile('Draft', cnt('DRAFT'), 'belum semua channel dipublikasikan')}
              ${tile('Published', cnt('PUBLISHED'), 'semua channel dan fase dipublikasikan')}${tile('Closed', cnt('CLOSED'), 'periode program sudah berakhir')}</div>
            <section class="cx-card"><h2 class="t-h5">Daftar Program</h2>
              <div class="cx-search" style="max-width:440px"><input class="cx-in md" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama program" aria-label="Cari program"></div>
              <div class="cx-chips" role="group" aria-label="Filter status program">${chips.map(([k, l]) => `<button type="button" class="cx-chip ${S.st === k ? 'on' : ''}" aria-pressed="${S.st === k}" data-on="st" data-v="${k}">${l}</button>`).join('')}</div>
              ${rows.length ? `<div class="cx-table"><table><thead><tr><th>Kode</th><th>Nama Program</th><th>Periode</th><th>Pendaftaran Dibuka</th><th>Status</th><th>Terakhir Diubah</th><th>Aksi</th></tr></thead><tbody>
                ${rows.map((p) => `<tr><td>${esc(p.code)}</td><td class="t-strong">${esc(p.name)}</td><td>${L.periodTxt(p.period_start, p.period_end)}</td><td>${openCount(p)} dari ${L.channels(p.id).length}</td>
                  <td>${statusTag(L.programStatus(p))}</td><td><div>${L.dateTxt(p.updated_at)}</div><div class="t-sm">${esc(p.updated_by || '')}</div></td>
                  <td><div class="cx-row" style="gap:8px;flex-wrap:nowrap"><a class="cx-btn cx-s sm" href="#/setup/${p.id}">Buka Setup</a><a class="cx-btn cx-s sm" href="#/setup/copy?from=${p.id}">Salin</a></div></td></tr>`).join('')}
                </tbody></table></div><span class="t-sm">Menampilkan ${rows.length} dari ${all.length} program</span>`
                : `<div class="cx-col" style="align-items:center;padding:40px 24px;gap:8px;text-align:center"><span class="t-h5">${all.length ? 'Tidak ada program yang cocok' : 'Belum ada program'}</span>
                  <span class="t-sm">${all.length ? 'Ubah kata kunci atau filter status.' : 'Buat program pertama untuk mulai menyiapkan channel.'}</span>${all.length ? '' : '<button type="button" class="cx-btn cx-p" data-on="openNew">Buat Program</button>'}</div>`}
            </section>
            ${S.dlg ? modal('Buat Program', `<span class="t-body">Pilih cara memulai program.</span>
              <a class="opt" href="#/setup/new"><span class="t-h5">Buat Program Baru</span><span class="t-sm">Mulai dari kosong: isi informasi program, group brand, dan channel.</span></a>
              <a class="opt" href="#/setup/copy"><span class="t-h5">Salin dari Program Lalu</span><span class="t-sm">Mulai dari program sebelumnya. Informasi, group brand, dan channel yang dipilih ikut tersalin.</span></a>`, '') : ''}`;
        },
        on: { q: (S, el) => { S.q = el.value; return true; }, st: (S, el) => { S.st = el.dataset.v; }, openNew: (S) => { S.dlg = true; }, closeDlg: (S) => { S.dlg = false; } },
      });
    });
  });

  // ---------------------------------------------------------------- S2 · Salin dari Program Lalu (halaman) → dilanjutkan di wizard Buat Program
  route('/setup/copy', ({}, q) => {
    requireSetup();
    const progs = L.programs().slice().sort((a, b) => b.period_start.localeCompare(a.period_start));
    if (!progs.length) UI.redirect('/setup/new');
    const init = (src) => { const y = Number(src.period_start.slice(0, 4)) + 1;
      return { src: src.id, name: /\d{4}/.test(src.name) ? src.name.replace(/\d{4}/, String(y)) : `${src.name} ${y}`, start: `${y}-01-01`, end: `${y}-12-31`, off: {}, err: {} }; };
    return page('Salin dari Program Lalu', (root) => {
      L.view(root, {
        state: init(L.program(q.from) || progs[0]),
        html: (S) => {
          const src = L.program(S.src); const chs = L.channels(src.id); const sel = chs.filter((c) => !S.off[c.id]).length;
          const code = nextCode((S.start || '2028').slice(0, 4));
          return `${head({ back: '#/setup', title: 'Salin dari Program Lalu', sub: `Program baru dari salinan · ${code}` })}
            <div class="cx-layout"><div class="cx-main"><section class="cx-card">
              <h2 class="t-h4">Program Sumber</h2>
              <div style="max-width:520px">${field('Program sumber', `<select class="cx-in" data-chg="src">${progs.map((p) => `<option value="${p.id}" ${p.id === src.id ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select>`, { req: true })}</div>
              <hr class="cx-hr"><h2 class="t-h4">Informasi Program Baru</h2>
              <div class="cx-grid2">${field('Kode baru', `<input class="cx-in" value="${code}" readonly>`)}
                ${field('Nama program', `<input class="cx-in ${S.err.name ? 'bad' : ''}" data-k="name" data-inp="name" value="${esc(S.name)}">`, { req: true, err: S.err.name })}
                ${field('Periode mulai', `<input class="cx-in" type="date" data-chg="start" value="${S.start}">`, { req: true })}
                ${field('Periode selesai', `<input class="cx-in ${S.err.end ? 'bad' : ''}" type="date" data-chg="end" value="${S.end}">`, { req: true, err: S.err.end })}</div>
              <hr class="cx-hr"><div class="cx-between"><h2 class="t-h4">Channel yang Disalin</h2><span class="t-sm-b">${sel} dari ${chs.length} dipilih</span></div>
              <div class="cx-col" style="gap:0">${chs.map((c) => `<label class="cx-check" style="padding:12px 0;border-top:1px solid #EBEBEB;justify-content:space-between"><span class="cx-row" style="gap:10px"><input type="checkbox" data-chg="ch" data-id="${c.id}" ${S.off[c.id] ? '' : 'checked'}>${esc(L.channelOf(c.channel_code).name)}</span>${statusTag(L.channelStatus(src, c))}</label>`).join('') || '<span class="t-sm">Program ini belum punya channel.</span>'}</div>
              ${S.err.ch ? `<span class="cx-err">${esc(S.err.ch)}</span>` : ''}
            </section></div>
            <aside class="cx-side"><h2 class="t-h5">Yang perlu diketahui</h2><ul><li>Informasi program, group brand, dan channel yang dipilih ikut tersalin.</li><li>Setup tiap channel ikut tersalin dan kembali berstatus Draft.</li><li>Program baru berstatus Draft dan dilanjutkan di wizard Buat Program.</li></ul>
              <hr class="cx-hr"><button type="button" class="cx-btn cx-p lg full" data-on="go">Lanjutkan</button><a class="cx-btn cx-s lg full" href="#/setup">Batal</a></aside></div>`;
        },
        on: {
          src: (S, el) => { Object.assign(S, init(L.program(el.value))); },
          name: (S, el) => { S.name = el.value; }, start: (S, el) => { S.start = el.value; }, end: (S, el) => { S.end = el.value; },
          ch: (S, el) => { S.off[el.dataset.id] = !el.checked; },
          go: (S) => {
            S.err = {}; const src = L.program(S.src); const ids = L.channels(src.id).filter((c) => !S.off[c.id]).map((c) => c.id);
            if (!S.name.trim()) S.err.name = 'Nama program wajib diisi.';
            if (!S.start || !S.end || S.end <= S.start) S.err.end = 'Periode selesai harus setelah periode mulai.';
            if (!ids.length) S.err.ch = 'Pilih minimal satu channel.';
            if (Object.keys(S.err).length) return;
            L._prefill = { from: src.id, chIds: ids, name: S.name.trim(), start: S.start, end: S.end, fr: src.fr_enabled, frName: src.fr_name || '', multi: src.multi_program !== false,
              groups: src.brand_groups.map((g) => ({ name: g.name, members: g.members.slice(), others: (g.others || []).slice() })),
              chans: Object.fromEntries(L.channels(src.id).filter((c) => ids.includes(c.id)).map((c) => [c.channel_code, true])) };
            go('/setup/new'); return false;
          },
        },
      });
    });
  });

  // salin setup channel dari program sumber (status kembali Draft)
  function copyChannelSetup(src, p, code) {
    const c = L.channels(src.id).find((x) => x.channel_code === code); if (!c) return null;
    const n = JSON.parse(JSON.stringify(c)); delete n.id;
    Object.assign(n, { program_id: p.id, reg_status: 'DRAFT', pay_status: 'DRAFT', reg_published_at: null, pay_published_at: null, audit: [], extra_phases: [] });
    // group brand bisa berubah di wizard: matriks hanya untuk group yang namanya sama
    const byName = Object.fromEntries(src.brand_groups.map((g) => [g.name.toLowerCase(), g.id]));
    n.matrix = {}; for (const g of p.brand_groups) { const old = byName[g.name.toLowerCase()]; if (old && c.matrix[old]) n.matrix[g.id] = JSON.parse(JSON.stringify(c.matrix[old])); }
    const last = c.mou.revisions[c.mou.revisions.length - 1];
    n.mou.revisions = last ? [{ no: 1, file: last.file, note: `Disalin dari ${src.code}`, by: UI.currentUser().name, at: L.now() }] : [];
    L.audit(n, 'Salin program', `Setup disalin dari ${src.code}`);
    return n;
  }

  // ---------------------------------------------------------------- S3–S5 · Buat Program (wizard 3 langkah)
  route('/setup/new', () => {
    requireSetup();
    const pre = L._prefill || null; L._prefill = null;
    const y = new Date().getFullYear() + 1;
    return page('Buat Program', (root) => {
      L.view(root, {
        state: pre ? { step: 0, name: pre.name, start: pre.start, end: pre.end, fr: pre.fr, frName: pre.frName, multi: pre.multi, groups: pre.groups, chans: pre.chans, from: pre.from, err: {}, dlg: null, pick: {}, bq: '', cq: '' }
          : { step: 0, name: `Loyalty Program ${y}`, start: `${y}-01-01`, end: `${y}-12-31`, fr: true, frName: 'Vision Compass', multi: true,
            groups: [{ name: '', members: [], others: [] }], chans: {}, from: null, err: {}, dlg: null, pick: {}, bq: '', cq: '' },
        html: (S) => {
          const used = new Set(S.groups.flatMap((g) => g.members));
          const free = L.BRANDS.filter((b) => !used.has(b));
          const code = nextCode((S.start || String(y)).slice(0, 4));
          const src = S.from ? L.program(S.from) : null;
          const labels = ['Informasi Program', 'Setup Brand', 'Channel'];
          const steps = `<div class="cx-wsteps" aria-label="Langkah">${labels.map((l, i) => `${i ? `<span class="line ${i <= S.step ? 'done' : ''}"></span>` : ''}<span class="st ${i < S.step ? 'done' : i === S.step ? 'cur' : ''}"><span class="dot">${i < S.step ? ico.check : i + 1}</span>${l}</span>`).join('')}</div>`;
          const nCh = Object.values(S.chans).filter(Boolean).length;
          let body = ''; let side = '';
          if (S.step === 0) {
            body = `<h2 class="t-h4">Informasi Program</h2>
              ${field('Kode program', `<input class="cx-in" value="${code}" readonly>`)}
              ${field('Nama program', `<input class="cx-in ${S.err.name ? 'bad' : ''}" data-k="name" data-inp="name" value="${esc(S.name)}">`, { req: true, err: S.err.name })}
              <div class="cx-grid2">${field('Periode mulai', `<input class="cx-in" type="date" data-chg="start" value="${S.start}">`, { req: true })}
                ${field('Periode selesai', `<input class="cx-in ${S.err.end ? 'bad' : ''}" type="date" data-chg="end" value="${S.end}">`, { req: true, err: S.err.end })}</div>
              <hr class="cx-hr"><div class="cx-row">${sw(S.fr, 'data-on="fr" aria-label="Program memiliki fixed rebate"')}<span class="t-strong">Program memiliki fixed rebate</span></div>
              ${S.fr ? field('Nama fixed rebate', `<input class="cx-in ${S.err.fr ? 'bad' : ''}" data-k="frName" data-inp="frName" value="${esc(S.frName)}" placeholder="Contoh: Vision Compass">`, { req: true, err: S.err.fr }) : ''}
              <hr class="cx-hr"><div class="cx-row" style="align-items:flex-start;flex-wrap:nowrap">${sw(S.multi, 'data-on="multi" aria-label="Toko boleh mengikuti program lain"')}
                <div class="cx-col"><span class="t-strong">Toko boleh mengikuti program lain</span><span class="t-sm">${S.multi ? 'Toko yang sudah terdaftar di program lain tetap bisa didaftarkan ke program ini.' : 'Toko yang sudah terdaftar di program lain dengan periode beririsan tidak bisa didaftarkan ke program ini.'}</span></div></div>`;
            side = ['Langkah 1 dari 3: Informasi Program', ['Kode program dibuat otomatis.', 'Periode menentukan bulan aktif program.', 'Isian belum disimpan. Program baru dibuat di langkah terakhir.'], 'Lanjut: Setup Brand', '<a class="cx-btn cx-s lg full" href="#/setup">Batal</a>'];
          }
          if (S.step === 1) {
            body = `<h2 class="t-h4">Setup Brand</h2>
              <div class="cx-alert warn"><span class="ic">!</span><div><b>Group brand terkunci saat Buat Program</b>Setelah program dibuat, group brand dan anggotanya tidak dapat ditambah atau dihapus.</div></div>
              <div class="cx-between"><span class="t-h5">Group Brand · ${S.groups.length}</span><button type="button" class="cx-btn cx-s" data-on="addGroup">Tambah Group Brand</button></div>
              ${S.groups.map((g, i) => { const e = (S.err.groups || {})[i] || {}; return `<div class="cx-sub">
                <div class="cx-row" style="align-items:flex-end;flex-wrap:nowrap"><div style="flex:1">${field(`Group ${i + 1}`, `<input class="cx-in ${e.name ? 'bad' : ''}" data-k="gn${i}" data-inp="gName" data-i="${i}" value="${esc(g.name)}" placeholder="Nama group brand">`, { req: true, err: e.name })}</div>
                  <button type="button" class="cx-link red" style="padding:12px 16px" data-on="rmGroup" data-i="${i}">Hapus Group</button></div>
                <div class="cx-row" style="gap:8px"><span class="t-sm">${g.members.length} brand</span>${g.members.map((m, j) => `<span class="cx-pill">${esc(m)}<button type="button" aria-label="Hapus ${esc(m)}" data-on="rmMember" data-i="${i}" data-j="${j}">${ico.x}</button></span>`).join('')}
                  <button type="button" class="cx-pill-add" data-on="openBrand" data-i="${i}" ${free.length ? '' : 'disabled'}>${ico.plus}Tambah Brand</button></div>
                ${e.members ? `<span class="cx-err">${esc(e.members)}</span>` : ''}</div>`; }).join('')}
              ${S.err.group ? `<span class="cx-err">${esc(S.err.group)}</span>` : ''}
              <div class="cx-soft"><span class="t-strong">Brand tidak ikut program · ${free.length}</span><span class="t-sm">${free.length ? esc(free.join(', ')) + '.' : 'Semua brand masuk group brand.'}</span></div>`;
            side = ['Langkah 2 dari 3: Setup Brand', ['Satu brand hanya boleh masuk satu group brand.', 'Brand yang tidak masuk group tidak ikut program.', 'Nama group brand masih dapat diubah di langkah ini.'], 'Lanjut: Channel', '<button type="button" class="cx-btn cx-s lg full" data-on="back">Langkah Sebelumnya</button>'];
          }
          if (S.step === 2) {
            const cq = S.cq.trim().toLowerCase();
            body = `<h2 class="t-h4">Channel</h2><div class="cx-between"><span class="t-h5">Channel dari Master</span><span class="t-sm-b">${nCh} dipilih</span></div>
              <div class="cx-search"><input class="cx-in md" type="search" data-k="cq" data-inp="cq" value="${esc(S.cq)}" placeholder="Cari channel" aria-label="Cari channel"></div>
              <div class="cx-col" style="gap:0">${L.CHANNELS.filter((c) => !cq || (c.name + ' ' + c.full).toLowerCase().includes(cq)).map((c) => `<label class="cx-check" style="padding:12px 0;border-top:1px solid #EBEBEB">
                <input type="checkbox" data-chg="ch" data-code="${c.code}" ${S.chans[c.code] ? 'checked' : ''}><span class="cx-col" style="gap:0"><span class="t-strong">${esc(c.name)}</span><span class="t-sm">${esc(c.full)}</span></span></label>`).join('')}</div>
              ${S.err.ch ? `<span class="cx-err">${esc(S.err.ch)}</span>` : ''}`;
            side = ['Langkah 3 dari 3: Channel', ['Pilih channel yang ikut program ini.', 'Ringkasan ditampilkan sebelum program dibuat.', 'Setup tiap channel dilanjutkan dari halaman program.'], 'Buat Program', '<button type="button" class="cx-btn cx-s lg full" data-on="back">Langkah Sebelumnya</button>'];
          }
          let dlg = '';
          if (S.dlg === 'brand') {
            const g = S.groups[S.bi]; const bq = S.bq.trim().toLowerCase(); const list = free.filter((b) => !bq || b.toLowerCase().includes(bq)); const n = free.filter((b) => S.pick[b]).length;
            dlg = modal(`Tambah Brand ke ${g.name || 'Group ' + (S.bi + 1)}`, `<span class="t-body">Pilih satu atau beberapa brand. Satu brand hanya boleh masuk satu group brand.</span>
              <div class="cx-search"><input class="cx-in md" type="search" data-k="bq" data-inp="bq" value="${esc(S.bq)}" placeholder="Cari brand" aria-label="Cari brand"></div>
              <span class="t-sm-b">${n} dari ${free.length} brand dipilih</span>
              <div class="box rows">${list.map((b) => `<label class="cx-check"><input type="checkbox" data-chg="pick" data-b="${esc(b)}" ${S.pick[b] ? 'checked' : ''}>${esc(b)}</label>`).join('') || '<span class="t-sm">Tidak ada brand yang cocok.</span>'}</div>`,
              `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="addBrands" ${n ? '' : 'disabled'}>Tambah ${n} Brand</button>`);
          }
          if (S.dlg === 'confirm') {
            const chs = L.CHANNELS.filter((c) => S.chans[c.code]).map((c) => c.name);
            dlg = modal('Buat Program?', `<span class="t-body">Setelah dibuat, group brand dan anggotanya terkunci dan tidak dapat diubah. Setup tiap channel disiapkan dari halaman program.</span>
              <div class="cx-soft" style="gap:12px;padding:16px"><span class="t-h5">Ringkasan</span><hr class="cx-hr">
                <div class="cx-col"><span class="t-sm-b">Informasi</span><span class="t-body">${esc(code)} · ${esc(S.name)}</span><span class="t-body">${L.periodTxt(S.start, S.end)}</span>
                  <span class="t-body">Fixed rebate: ${S.fr ? esc(S.frName) : 'Tidak ada'}</span><span class="t-body">Toko boleh mengikuti program lain: ${S.multi ? 'Ya' : 'Tidak'}</span>${src ? `<span class="t-body">Disalin dari ${esc(src.code)} (setup channel ikut tersalin)</span>` : ''}</div><hr class="cx-hr">
                <div class="cx-col"><span class="t-sm-b">Group Brand · ${S.groups.length}</span>${S.groups.map((g) => `<span class="t-body">${esc(g.name)} · ${g.members.length} brand</span>`).join('')}<span class="t-body">${free.length} brand tidak ikut program</span></div><hr class="cx-hr">
                <div class="cx-col"><span class="t-sm-b">Channel · ${chs.length} dipilih</span><span class="t-body">${esc(chs.join(', '))}</span></div></div>`,
              '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="create">Buat Program</button>');
          }
          return `${head({ back: '#/setup', title: 'Buat Program', sub: src ? `Program baru dari salinan ${esc(src.code)} · ${code}` : `Program baru · ${code}` })}
            <div class="cx-layout"><div class="cx-main">${steps}<section class="cx-card">${body}</section></div>
            <aside class="cx-side"><h2 class="t-h5">${side[0]}</h2><ul>${side[1].map((x) => `<li>${x}</li>`).join('')}</ul><hr class="cx-hr">
              <button type="button" class="cx-btn cx-p lg full" data-on="next">${side[2]}</button>${side[3]}</aside></div>${dlg}`;
        },
        on: {
          name: (S, el) => { S.name = el.value; }, frName: (S, el) => { S.frName = el.value; },
          start: (S, el) => { S.start = el.value; }, end: (S, el) => { S.end = el.value; },
          fr: (S) => { S.fr = !S.fr; }, multi: (S) => { S.multi = !S.multi; },
          addGroup: (S) => { S.groups.push({ name: '', members: [], others: [] }); },
          rmGroup: (S, el) => { S.groups.splice(Number(el.dataset.i), 1); },
          gName: (S, el) => { S.groups[el.dataset.i].name = el.value; },
          rmMember: (S, el) => { S.groups[el.dataset.i].members.splice(Number(el.dataset.j), 1); },
          openBrand: (S, el) => { S.dlg = 'brand'; S.bi = Number(el.dataset.i); S.pick = {}; S.bq = ''; },
          bq: (S, el) => { S.bq = el.value; return true; },
          pick: (S, el) => { S.pick[el.dataset.b] = el.checked; },
          addBrands: (S) => { const g = S.groups[S.bi]; for (const b of L.BRANDS) if (S.pick[b] && !g.members.includes(b)) g.members.push(b); if (!g.name && g.members[0]) g.name = g.members[0]; S.dlg = null; },
          cq: (S, el) => { S.cq = el.value; return true; },
          ch: (S, el) => { S.chans[el.dataset.code] = el.checked; },
          closeDlg: (S) => { S.dlg = null; },
          back: (S) => { S.step--; S.err = {}; },
          next: (S) => {
            S.err = {};
            if (S.step === 0) {
              if (!S.name.trim()) S.err.name = 'Nama program wajib diisi.';
              if (!S.start || !S.end || S.end <= S.start) S.err.end = 'Periode selesai harus setelah periode mulai.';
              if (S.fr && !S.frName.trim()) S.err.fr = 'Nama fixed rebate wajib diisi jika program memiliki fixed rebate.';
              if (Object.keys(S.err).length) return;
            }
            if (S.step === 1) {
              if (!S.groups.length) { S.err.group = 'Tambahkan minimal satu group brand.'; return; }
              const ge = {}; const names = S.groups.map((g) => g.name.trim().toLowerCase());
              S.groups.forEach((g, i) => { const e = {}; if (!g.name.trim()) e.name = 'Nama group brand wajib diisi.'; else if (names.indexOf(names[i]) !== i) e.name = 'Nama group brand tidak boleh sama.'; if (!g.members.length) e.members = 'Tambahkan minimal satu brand.'; if (Object.keys(e).length) ge[i] = e; });
              if (Object.keys(ge).length) { S.err.groups = ge; return; }
            }
            if (S.step === 2) { if (!Object.values(S.chans).some(Boolean)) { S.err.ch = 'Pilih minimal satu channel.'; return; } S.dlg = 'confirm'; return; }
            S.step++;
          },
          create: (S) => {
            const codes = L.CHANNELS.map((c) => c.code).filter((c) => S.chans[c]);
            const p = DB.insert(L.T.programs, { code: nextCode(S.start.slice(0, 4)), name: S.name.trim(), year: Number(S.start.slice(0, 4)), period_start: S.start, period_end: S.end,
              fr_enabled: S.fr, fr_name: S.fr ? S.frName.trim() : '', multi_program: S.multi, cloned_from: S.from || null,
              brand_groups: S.groups.map((g, i) => ({ id: 'g' + (i + 1), name: g.name.trim(), members: g.members.slice(), others: (g.others || []).slice() })),
              brand_locked_at: L.now(), created_at: L.now(), updated_at: L.now(), updated_by: UI.currentUser().name });
            const src = S.from ? L.program(S.from) : null;
            for (const c of codes) { const ch = (src && copyChannelSetup(src, p, c)) || L.newChannel(p.id, c); if (!src || !ch.audit.length) L.audit(ch, 'Program', 'Channel dibuat'); DB.insert(L.T.channels, ch); }
            DB.save(); go(`/setup/${p.id}?baru=1`); return false;
          },
        },
      });
    });
  });

  // ---------------------------------------------------------------- S6 · Program: Channel / Brand
  const firstOpenStep = (p, ch) => { const t = L.completeness(p, ch).tabs.find((x) => !x.ok); return t ? t.k : 'review'; };
  function programHead(p) {
    return head({ back: '#/setup', title: esc(p.name), tagHtml: statusTag(L.programStatus(p)), sub: `${esc(p.code)} · ${L.periodTxt(p.period_start, p.period_end)}`,
      sub2: `Terakhir diubah ${L.dateTxt(p.updated_at)} oleh ${esc(p.updated_by || '—')}`,
      actions: L.programClosed(p) ? '' : '<button type="button" class="cx-btn cx-s" data-on="openAdd">Tambah Channel</button>' });
  }
  function addChannelModal(p, S) {
    const have = new Set(L.channels(p.id).map((c) => c.channel_code)); const avail = L.CHANNELS.filter((c) => !have.has(c.code)); const n = avail.filter((c) => S.add[c.code]).length;
    return modal('Tambah Channel', `<span class="t-body">Channel baru berstatus Draft dengan setup kosong.</span>
      <div class="box rows">${avail.map((c) => `<label class="cx-check"><input type="checkbox" data-chg="addCh" data-code="${c.code}" ${S.add[c.code] ? 'checked' : ''}><span class="cx-col" style="gap:0"><span class="t-strong">${esc(c.name)}</span><span class="t-sm">${esc(c.full)}</span></span></label>`).join('') || '<span class="t-sm">Semua channel master sudah ada di program ini.</span>'}</div>`,
      `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="doAdd" ${n ? '' : 'disabled'}>Tambah ${n} Channel</button>`);
  }
  route('/setup/:id', ({ id }, q) => {
    requireSetup();
    const p = getP(id);
    return page(p.name, (root) => {
      L.view(root, {
        state: { tab: q.tab === 'brand' ? 'brand' : 'channel', dlg: null, add: {}, baru: q.baru === '1' },
        html: (S) => {
          const chs = L.channels(p.id);
          const comps = chs.map((c) => ({ c, comp: L.completeness(p, c) }));
          const full = comps.filter((x) => x.comp.done === x.comp.total).length;
          const ready = comps.find((x) => x.comp.done === x.comp.total && x.c.reg_status === 'DRAFT');
          const nm = (c) => L.channelOf(c.channel_code).name;
          const card = ({ c, comp }) => {
            const reg = c.reg_status === 'PUBLISHED' ? tag('Published', 'ok') : c.reg_status === 'CANCELLED' ? tag('Dibatalkan', 'err') : tag('Draft');
            const pay = c.pay_status === 'PUBLISHED' ? tag('Published', 'ok') : tag('Draft');
            let foot; let btn; let href = `#/setup/${p.id}/ch/${c.id}/`;
            if (c.reg_status === 'PUBLISHED') { foot = 'Setup terkunci kecuali MOU dan dokumen'; btn = 'Lihat Channel'; href += 'review'; }
            else if (c.reg_status === 'CANCELLED') { foot = 'Pendaftaran dibatalkan'; btn = 'Lihat Channel'; href += 'review'; }
            else if (comp.done === comp.total) { foot = 'Siap dipublikasikan'; btn = 'Tinjau dan Publikasikan'; href += 'review'; }
            else if (comp.done) { foot = 'Setup belum lengkap'; btn = 'Lanjutkan Setup'; href += firstOpenStep(p, c); }
            else { foot = 'Setup belum lengkap'; btn = 'Mulai Setup'; href += 'settings'; }
            return `<article class="cx-sub" style="gap:16px"><span class="t-h5">${esc(nm(c))}</span>
              <div class="cx-grid2" style="gap:12px"><div class="cx-col" style="gap:6px"><span class="t-sm-b">Fase Pendaftaran</span><span>${reg}</span></div><div class="cx-col" style="gap:6px"><span class="t-sm-b">Fase Pencairan</span><span>${pay}</span></div></div>
              <div class="cx-col" style="gap:8px"><span class="t-sm-b">${comp.done} dari ${comp.total} langkah setup</span><div class="cx-segbar">${comp.tabs.map((t) => `<span class="${t.ok ? 'on' : ''}"></span>`).join('')}</div></div>
              <hr class="cx-hr"><div class="cx-between" style="flex-wrap:nowrap"><span class="t-sm">${foot}</span><a class="cx-btn cx-s" href="${href}">${btn}</a></div></article>`;
          };
          const brandTab = () => {
            const used = new Set(L.groupsOf(p).flatMap((g) => g.members)); const free = L.BRANDS.filter((b) => !used.has(b));
            return `<div class="cx-alert warn"><span class="ic">!</span><div><b>Group brand terkunci</b>Group brand dan anggotanya ditentukan saat program dibuat dan dipakai semua channel.</div></div>
              <div class="cx-table"><table><thead><tr><th>Group Brand</th><th>Brand anggota</th><th>Baseline minimal per channel</th></tr></thead><tbody>
              ${L.groupsOf(p).map((g) => `<tr><td class="top t-strong">${esc(g.name)}</td><td class="top"><div class="cx-row" style="gap:6px">${g.members.map((m) => `<span class="cx-pill">${esc(m)}</span>`).join('')}</div></td>
                <td class="top"><div class="cx-col" style="gap:6px">${chs.map((c) => { const k = (c.matrix[g.id] || [])[0];
                  return `<div class="cx-between" style="flex-wrap:nowrap"><span class="t-sm">${esc(nm(c))}</span><span class="t-strong">${k ? L.fr(k.bmin * 1e6) + ` <span class="t-sm">(kelas ${esc(k.code)})</span>` : '<span class="t-sm">belum ada matriks</span>'}</span></div>`; }).join('') || '<span class="t-sm">Belum ada channel</span>'}</div></td></tr>`).join('')}</tbody></table></div>
              <span class="t-sm">${free.length ? `Brand tidak ikut program: ${esc(free.join(', '))}.` : 'Semua brand ikut program.'} Baseline minimal = batas bawah kelas terendah di Matriks Kelas tiap channel.</span>`;
          };
          return `${programHead(p)}
            ${S.baru ? `<div class="cx-alert ok"><span class="ic">✓</span><div><b>Program dibuat</b>Group brand sudah terkunci. Lanjutkan dengan setup tiap channel.</div></div>` : ''}
            <section class="cx-card"><h2 class="t-h5">Ringkasan</h2><div class="cx-grid3"><div class="cx-tile"><span class="t-sm-b">Total channel</span><span class="t-h3">${chs.length}</span></div>
              <div class="cx-tile"><span class="t-sm-b">Setup lengkap</span><span class="t-h3">${full} dari ${chs.length}</span></div><div class="cx-tile"><span class="t-sm-b">Pendaftaran dibuka</span><span class="t-h3">${openCount(p)} dari ${chs.length}</span></div></div></section>
            ${ready ? `<div class="cx-alert info"><span class="ic">i</span><div class="cx-col" style="gap:8px"><div><b>Langkah berikutnya: publikasikan ${esc(nm(ready.c))}</b>${ready.comp.total === 5 ? 'Kelima' : 'Semua'} langkah setup ${esc(nm(ready.c))} sudah lengkap. Tinjau ringkasannya, lalu publikasikan Fase Pendaftaran agar CBD dapat mendaftarkan toko.</div>
              <a class="cx-btn cx-p" style="align-self:flex-start" href="#/setup/${p.id}/ch/${ready.c.id}/review">Tinjau dan Publikasikan</a></div></div>` : ''}
            <section class="cx-card"><div class="cx-tabs" role="tablist"><button type="button" role="tab" class="cx-tab ${S.tab === 'channel' ? 'on' : ''}" data-on="tab" data-v="channel">Channel</button><button type="button" role="tab" class="cx-tab ${S.tab === 'brand' ? 'on' : ''}" data-on="tab" data-v="brand">Brand</button></div>
              ${S.tab === 'channel' ? `<div class="cx-grid3">${comps.map(card).join('') || '<span class="t-sm">Belum ada channel. Klik Tambah Channel.</span>'}</div>` : brandTab()}</section>
            ${S.dlg === 'add' ? addChannelModal(p, S) : ''}`;
        },
        on: {
          tab: (S, el) => { S.tab = el.dataset.v; },
          openAdd: (S) => { S.dlg = 'add'; S.add = {}; }, closeDlg: (S) => { S.dlg = null; },
          addCh: (S, el) => { S.add[el.dataset.code] = el.checked; },
          doAdd: (S) => { const codes = Object.keys(S.add).filter((k) => S.add[k]); for (const c of codes) { const ch = L.newChannel(p.id, c); L.audit(ch, 'Program', 'Channel ditambahkan'); DB.insert(L.T.channels, ch); }
            L.touchProgram(p); DB.save(); flash('success', `${codes.length} channel ditambahkan.`); go(`/setup/${p.id}`); return false; },
        },
      });
    });
  });
  route('/setup/:id/brands', ({ id }) => UI.redirect(`/setup/${id}?tab=brand`));
})();
