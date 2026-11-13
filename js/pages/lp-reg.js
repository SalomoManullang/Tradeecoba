// Pendaftaran mengikuti mockup layar 16–18 + alur spesifikasi v2.5:
// Daftar Toko (CBD) · Form Pendaftaran · Approval (Setujui / Kembalikan) · MOU & dokumen · Toko Exception (Admin HO) · Customer Group (CBD)
// Dokumen: Admin DC mengunggah MOU & dokumen wajib (Dokumen Toko), Admin HO mereview kelengkapannya (Daftar Toko Admin HO)
(function () {
  const { route, go, flash } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, chip, sw, fp, fj, fr, pnum, rpNum } = L;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const isHo = (u) => ['ADMIN_HO', 'SUPERADMIN'].includes(u.role);
  const userDc = (u) => (u.role === 'CBD' ? u.lp_dc || null : null);
  const chOf = (p, code) => L.channels(p.id).find((c) => c.channel_code === code);
  const MO = L.MONTHS;
  const monthSel = (val, attrs) => `<select class="cell l" ${attrs}>${MO.map((m) => `<option ${m === val ? 'selected' : ''}>${m}</option>`).join('')}</select>`;
  const userName = (id) => { const u = DB.byId('users', id); return u ? u.name : 'Sistem'; };

  // status baris Daftar Toko untuk satu peserta di satu program
  function rowStatus(p, part) {
    const ch = chOf(p, part.channel); if (!ch) return null;
    if (!L.regOpen(ch)) return { key: 'CLOSED', ch };
    const r = L.activeReg(p.id, part.code);
    if (r) return { key: r.status, ch, r };
    const exc = L.exceptionOf(p.id, part.code);
    const el = L.eligibility(p, ch, part);
    if (!el.eligible && !exc) return null; // masuk Toko Exception
    if (!p.multi_program) {
      const other = L.regs().find((x) => x.code === part.code && x.program_id !== p.id && !['CANCELLED'].includes(x.status) && (() => { const q = L.program(x.program_id); return q && q.period_start <= p.period_end && q.period_end >= p.period_start; })());
      if (other) return { key: 'NEW', ch, blocked: `Terdaftar di ${L.program(other.program_id).code}` };
    }
    return { key: 'NEW', ch, exc };
  }
  function statusNote(st) {
    const r = st.r; if (st.blocked) return st.blocked; if (st.exc && !r) return 'Toko exception · kelas A';
    if (!r) return '';
    if (r.status === 'DRAFT') return `Disimpan ${L.dateTxt(r.updated_at)}`;
    if (r.status === 'IN_APPROVAL') { const run = r.route.filter((s) => s.status === 'RUN'); const cur = L.currentStep(r); return cur ? `Di ${L.ROLES[cur.role] || cur.role} (layer ${run.indexOf(cur) + 1} dari ${run.length})` : ''; }
    if (r.status === 'RETURNED') { const s = r.route.find((x) => x.decision === 'RETURNED'); return s ? `Dikembalikan ${L.ROLES[s.role] || s.role}: ${s.comment}` : 'Dikembalikan'; }
    if (r.status === 'AWAITING_DOCS') return r.review && r.review.status === 'REVISE' ? 'Dokumen direvisi Admin DC' : 'Menunggu dokumen dari Admin DC';
    if (r.status === 'DOC_REVIEW') return 'Dokumen sedang direview';
    if (r.status === 'REGISTERED') return `Terdaftar ${L.dateTxt(r.updated_at)}`;
    return '';
  }

  // ---------------------------------------------------------------- 16 · Daftar Toko
  route('/pendaftaran', ({}, q, { user }) => {
    if (!['CBD', 'ADMIN_HO', 'SUPERADMIN'].includes(user.role)) UI.fail('Tidak ada akses', 'Daftar Toko untuk CBD dan Admin HO.');
    if (isHo(user)) return docsPage(user, 'HO');
    const progs = L.programs().filter((p) => !L.programClosed(p) && L.channels(p.id).length).sort((a, b) => b.period_start.localeCompare(a.period_start) || a.code.localeCompare(b.code));
    const dc = userDc(user);
    return L.page('Pendaftaran', (root) => {
      L.view(root, {
        state: { prog: q.program ? Number(q.program) : (progs.find((p) => L.channels(p.id).some(L.regOpen)) || progs[0] || {}).id, f: 'all', q: '', ch: '', type: '' },
        html: (S) => {
          const scope = S.prog === 'ALL' ? progs : progs.filter((p) => p.id === Number(S.prog));
          const parts = L.participants(dc);
          const all = [];
          for (const p of scope) for (const part of parts) { const st = rowStatus(p, part); if (st) all.push({ p, part, st, m: L.REG_STATUS[st.key] }); }
          const qq = S.q.trim().toLowerCase();
          const rows = all.filter((x) => (!S.type || x.part.kind === S.type) && (!S.ch || x.part.channel === S.ch) && (S.f === 'all' || x.m[2] === S.f) && (!qq || (x.part.code + ' ' + x.part.name).toLowerCase().includes(qq)));
          const count = (g) => all.filter((x) => x.m[2] === g).length;
          const allP = S.prog === 'ALL';
          const cols = `grid-template-columns: 130px minmax(220px,2fr) ${allP ? '180px ' : ''}160px 90px 230px 150px;`;
          const opts = [['all', `Semua (${all.length})`], ['todo', `Belum didaftarkan (${count('todo')})`], ['proc', `Dalam proses (${count('proc')})`], ['ret', `Dikembalikan (${count('ret')})`], ['done', `Terdaftar (${count('done')})`], ['locked', `Belum dibuka (${count('locked')})`]];
          const tile = (l, v, n, c) => `<div class="card pad-s"><span class="lbl up">${l}</span><span class="kpi-v" style="color:${c}">${v}</span><span class="muted xs">${n}</span></div>`;
          const act = (x) => { const k = x.st.key; const href = `#/pendaftaran/form/${x.p.id}/${encodeURIComponent(x.part.code)}`;
            if (k === 'CLOSED' || x.st.blocked) return '<span class="btn btn-d sm" aria-disabled="true">Belum bisa</span>';
            if (!['CBD'].includes(user.role) && k === 'NEW') return '<span class="muted xs">Didaftarkan CBD</span>';
            const [label, cls] = { NEW: ['Daftarkan', 'btn-p'], DRAFT: ['Lanjutkan', 'btn-o'], RETURNED: ['Perbaiki', 'btn-p'], AWAITING_DOCS: ['Lihat', 'btn-s'] }[k] || ['Lihat', 'btn-s'];
            return `<a class="btn sm ${cls}" href="${href}">${label}</a>`; };
          return `<div class="between" style="align-items:flex-end"><div class="col-f" style="gap:6px;max-width:640px"><h1 class="title">Pendaftaran</h1><p class="muted" style="margin:0">Toko dan customer group di area ${dc ? `Anda (${esc(dc)})` : 'semua DC'}.</p></div>
              <label class="lbl field" style="margin:0">Program<select class="inp" style="width:280px" data-chg="prog"><option value="ALL" ${allP ? 'selected' : ''}>Semua Program</option>${progs.map((p) => `<option value="${p.id}" ${Number(S.prog) === p.id ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label></div>
            <div class="grid-auto">${tile(allP ? 'Peserta semua program' : 'Toko & group', all.length, dc ? `di ${esc(dc)}` : 'semua DC', '#2A3D4A')}${tile('Belum didaftarkan', count('todo'), 'channel sudah dibuka', '#304DDE')}
              ${tile('Dalam proses', count('proc'), 'draft, approval, dokumen', '#8A6A00')}${tile('Dikembalikan', count('ret'), 'perlu diperbaiki CBD', '#A3001A')}${tile('Terdaftar', count('done'), 'MOU dan dokumen lengkap', '#267346')}</div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px">
              <div class="between"><div class="seg" role="group" aria-label="Filter status">${opts.map(([k, l]) => `<button type="button" class="${S.f === k ? 'on' : ''}" data-on="f" data-f="${k}">${l}</button>`).join('')}</div>
                <div class="row-f"><input class="inp" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama toko..." style="width:240px" aria-label="Cari toko">
                  <select class="inp" style="width:190px" data-chg="ch" aria-label="Filter channel"><option value="">Semua channel</option>${L.CHANNELS.map((c) => `<option value="${c.code}" ${S.ch === c.code ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
                  <select class="inp" style="width:150px" data-chg="type" aria-label="Filter tipe toko"><option value="">Semua tipe</option><option ${S.type === 'Single' ? 'selected' : ''}>Single</option><option ${S.type === 'Group' ? 'selected' : ''}>Group</option></select></div></div>
              <div class="tblbox"><div style="min-width:${allP ? 1140 : 960}px"><div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Toko / Customer Group</div>${allP ? '<div class="th">Program</div>' : ''}<div class="th">Channel</div><div class="th">Tipe</div><div class="th">Status Pendaftaran</div><div class="th">Aksi</div></div>
                ${rows.map((x) => `<div class="gr" style="${cols}"><div class="td b">${esc(x.part.code)}</div><div class="td c"><b>${esc(x.part.name)}</b><span class="muted">${esc(x.part.sub)}${dc ? '' : ` · ${esc(x.part.dc)}`}</span></div>
                  ${allP ? `<div class="td c"><b>${esc(x.p.code)}</b><span class="muted">${esc(x.p.name)}</span></div>` : ''}<div class="td">${esc(L.channelOf(x.part.channel).name)}</div><div class="td">${chip(x.part.kind, 'c-grey')}</div>
                  <div class="td c" style="gap:4px">${chip(x.m[0], x.m[1])}<span class="muted">${esc(statusNote(x.st))}</span></div><div class="td">${act(x)}</div></div>`).join('')
                  || '<div class="td muted" style="justify-content:center;padding:24px">Tidak ada toko untuk filter ini.</div>'}</div></div>
              <span class="muted xs">Toko yang masuk customer group didaftarkan lewat group-nya. Toko di channel yang pendaftarannya belum dibuka tampil tetapi belum bisa didaftarkan.</span></section>`;
        },
        on: { prog: (S, el) => { S.prog = el.value === 'ALL' ? 'ALL' : Number(el.value); }, f: (S, el) => { S.f = el.dataset.f; }, q: (S, el) => { S.q = el.value; return true; },
          ch: (S, el) => { S.ch = el.value; }, type: (S, el) => { S.type = el.value; } },
      });
    });
  });

  // ---------------------------------------------------------------- Dokumen toko: unggah (Admin DC) · review kelengkapan (Admin HO)
  // Hanya pendaftaran yang sudah disetujui (MOU dibuat). Admin HO melihat yang sudah diunggah: menunggu review, dikembalikan untuk revisi, disetujui.
  const isRevise = (r) => r.status === 'AWAITING_DOCS' && r.review && r.review.status === 'REVISE';
  const docState = (r) => (r.status === 'DOC_REVIEW' ? 'review' : r.status === 'REGISTERED' ? 'done' : isRevise(r) ? 'revise' : r.status === 'AWAITING_DOCS' ? 'upload' : null);
  const DOC_STATE = { upload: ['Menunggu dokumen', 'c-yellow'], revise: ['Perlu revisi', 'c-red'], review: ['Menunggu review', 'c-yellow'], done: ['Disetujui', 'c-green'] };
  function docCount(r) {
    const ch = L.channel(r.channel_id); const docs = ch ? ch.mou.docs.filter((d) => !d.locked) : [];
    const files = (r.docs && r.docs.files) || {};
    return { done: (r.docs && r.docs.mou ? 1 : 0) + docs.filter((d) => files[d.name]).length, total: 1 + docs.length };
  }
  const lastAt = (r, to) => { const h = (r.history || []).filter((x) => x.to === to); return h.length ? h[h.length - 1].at : r.updated_at; };
  function docsPage(user, who) {
    const ho = who === 'HO';
    const tabs = ho ? [['review', 'Menunggu review'], ['revise', 'Dikembalikan untuk revisi'], ['done', 'Disetujui'], ['all', 'Semua']]
      : [['upload', 'Perlu diunggah'], ['revise', 'Perlu revisi'], ['review', 'Menunggu review'], ['done', 'Disetujui'], ['all', 'Semua']];
    const states = ho ? ['review', 'revise', 'done'] : ['upload', 'revise', 'review', 'done'];
    const base = ho ? '#/pendaftaran/dokumen/' : '#/dokumen/';
    return L.page(ho ? 'Daftar Toko' : 'Dokumen Toko', (root) => {
      L.view(root, {
        state: { tab: tabs[0][0], q: '' },
        html: (S) => {
          const dcOf = (r) => (L.store(r.codes[0]) || {}).dc || '';
          const all = L.regs().filter((r) => states.includes(docState(r)) && (ho || !user.lp_dc || dcOf(r) === user.lp_dc))
            .sort((a, b) => String(lastAt(b, b.status)).localeCompare(String(lastAt(a, a.status))));
          const count = (k) => (k === 'all' ? all.length : all.filter((r) => docState(r) === k).length);
          const qq = S.q.trim().toLowerCase();
          const rows = all.filter((r) => (S.tab === 'all' || docState(r) === S.tab) && (!qq || (r.code + ' ' + r.name).toLowerCase().includes(qq)));
          const cols = 'grid-template-columns: 130px minmax(180px,2fr) 170px 120px 110px minmax(180px,1.5fr) 160px;';
          const note = (r) => { const k = docState(r);
            if (k === 'review') return `Dikirim ${L.dateTxt(lastAt(r, 'DOC_REVIEW'))}`;
            if (k === 'revise') return `Catatan: ${r.review.note}`;
            if (k === 'done') return `${L.dateTxt(lastAt(r, 'REGISTERED'))}${r.review && r.review.by ? ' · ' + userName(r.review.by) : ''}`;
            return r.mou_no || ''; };
          const act = (r) => { const k = docState(r);
            const main = ho ? k === 'review' && user.role === 'ADMIN_HO' && ['Review', 'btn-p'] : k === 'upload' ? ['Unggah Dokumen', 'btn-p'] : k === 'revise' && ['Perbaiki Dokumen', 'btn-p'];
            const [label, cls] = main || ['Lihat', 'btn-s'];
            return `<a class="btn sm ${cls}" href="${base}${r.id}">${label}</a>`; };
          const tile = (l, v, n, c) => `<div class="card pad-s"><span class="lbl up">${l}</span><span class="kpi-v" style="color:${c}">${v}</span><span class="muted xs">${n}</span></div>`;
          const intro = ho ? 'Toko yang MOU dan dokumen wajibnya sudah diunggah Admin DC. Review kelengkapan dokumen, lalu setujui atau minta revisi.'
            : `Toko yang pendaftarannya sudah disetujui di area ${user.lp_dc ? esc(user.lp_dc) : 'semua DC'}. Unggah MOU yang sudah ditandatangani dan dokumen wajib untuk direview Admin HO.`;
          return `<div class="col-f" style="gap:6px;max-width:720px"><h1 class="title">${ho ? 'Daftar Toko' : 'Dokumen Toko'}</h1><p class="muted" style="margin:0">${intro}</p></div>
            <div class="grid-auto">${ho ? tile('Menunggu review', count('review'), 'dokumen dari Admin DC', '#8A6A00') + tile('Dikembalikan', count('revise'), 'menunggu revisi Admin DC', '#A3001A') + tile('Disetujui', count('done'), 'toko terdaftar', '#267346')
              : tile('Perlu diunggah', count('upload'), 'MOU siap ditandatangani', '#304DDE') + tile('Perlu revisi', count('revise'), 'catatan dari Admin HO', '#A3001A') + tile('Menunggu review', count('review'), 'di Admin HO', '#8A6A00') + tile('Disetujui', count('done'), 'toko terdaftar', '#267346')}</div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px">
              <div class="between"><div class="seg" role="group" aria-label="Filter status dokumen">${tabs.map(([k, l]) => `<button type="button" class="${S.tab === k ? 'on' : ''}" data-on="tab" data-t="${k}">${l} (${count(k)})</button>`).join('')}</div>
                <input class="inp" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama toko..." style="width:240px" aria-label="Cari toko"></div>
              <div class="tblbox"><div style="min-width:1050px"><div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Toko / Customer Group</div><div class="th">Program · Channel</div><div class="th">DC</div><div class="th">Dokumen</div><div class="th">Status</div><div class="th">Aksi</div></div>
                ${rows.map((r) => { const p = L.program(r.program_id); const ch = L.channel(r.channel_id); const k = docState(r); const d = docCount(r);
                  return `<div class="gr" style="${cols}"><div class="td b">${esc(r.code)}</div><div class="td c"><b>${esc(r.name)}</b><span class="muted">${esc(r.kind)}${r.via_exception ? ' · toko exception' : ''}</span></div>
                  <div class="td c"><b>${esc(p ? p.code : '')}</b><span class="muted">${ch ? esc(L.channelOf(ch.channel_code).name) : ''}</span></div><div class="td">${esc(dcOf(r))}</div>
                  <div class="td"><span class="${d.done < d.total ? '' : 'b'}">${d.done}/${d.total} diunggah</span></div>
                  <div class="td c" style="gap:4px">${chip(DOC_STATE[k][0], DOC_STATE[k][1])}<span class="muted">${esc(note(r))}</span></div><div class="td">${act(r)}</div></div>`; }).join('')
                  || '<div class="td muted" style="justify-content:center;padding:24px">Tidak ada toko untuk filter ini.</div>'}</div></div></section>`;
        },
        on: { tab: (S, el) => { S.tab = el.dataset.t; }, q: (S, el) => { S.q = el.value; return true; } },
      });
    });
  }
  // detail satu pendaftaran untuk halaman dokumen (form pendaftaran read-only + panel MOU & Dokumen)
  function docDetail(id, user, who) {
    const r = L.reg(id); if (!r || !docState(r)) UI.fail('Dokumen tidak ditemukan', 'Pendaftaran ini belum sampai tahap dokumen.');
    const ho = who === 'HO';
    if (ho && docState(r) === 'upload') UI.fail('Dokumen belum diunggah', 'Admin DC belum mengunggah MOU dan dokumen toko ini.');
    const p = L.program(r.program_id); const ch = L.channel(r.channel_id);
    const part = L.participant(r.code) || { code: r.code, name: r.name, kind: r.kind, sub: '', dc: '', channel: ch.channel_code, codes: r.codes };
    const mode = ho && user.role === 'ADMIN_HO' && r.status === 'DOC_REVIEW' ? 'review' : 'view';
    return L.page(`Dokumen · ${r.name}`, regForm(p, ch, Object.assign({}, part, { codes: r.codes }), r, mode, user, ho ? '#/pendaftaran' : '#/dokumen'));
  }
  route('/pendaftaran/dokumen/:id', ({ id }, q, { user }) => {
    if (!isHo(user)) UI.fail('Tidak ada akses', 'Review dokumen untuk Admin HO.');
    return docDetail(id, user, 'HO');
  });
  route('/dokumen', ({}, q, { user }) => {
    if (user.role !== 'ADMIN_DC') UI.fail('Tidak ada akses', 'Dokumen Toko untuk Admin DC.');
    return docsPage(user, 'DC');
  });
  route('/dokumen/:id', ({ id }, q, { user }) => {
    if (user.role !== 'ADMIN_DC') UI.fail('Tidak ada akses', 'Dokumen Toko untuk Admin DC.');
    return docDetail(id, user, 'DC');
  });

  // ---------------------------------------------------------------- 17 · Form Pendaftaran (isi, lihat, approve, review)
  function regForm(p, ch, part, r, mode, user, back) {
    // mode: edit | view | approve | review · back: tujuan tombol Kembali & setelah aksi dokumen (default sesuai mode)
    return (root) => {
      const units = {}; for (const g of L.groupsOf(p)) { units[g.id] = clone((r && r.units[g.id]) || L.blankUnit(ch)); if (!r) { const s_ = L.salesFor(part.codes, g.members); if (!s_.si && !s_.so) units[g.id].joined = false; } }
      const viaExc = r ? r.via_exception : !!L.exceptionOf(p.id, part.code);
      const firstJoined = L.groupsOf(p).find((g) => units[g.id].joined !== false);
      const S0 = { units, reasons: clone((r && r.reasons) || {}), pUnit: firstJoined ? firstJoined.id : null, err: [], comment: '', files: clone((r && r.docs) || { mou: '', files: {} }) };
      const ro = mode !== 'edit';
      const FRon = L.FR(p); const FRN = L.frName(p); const set = ch.settings;
      L.view(root, {
        state: S0,
        html: (S) => {
          const calc = L.groupsOf(p).map((g) => L.calcUnit(p, ch, g, part.codes, S.units[g.id], { viaException: viaExc }));
          const checks = L.checksOf(p, ch, calc);
          const hard = checks.filter((c) => c.kind === 'hard').length; const appr = checks.filter((c) => c.kind === 'appr');
          const missing = appr.filter((c) => !String(S.reasons[c.key] || '').trim()).length;
          const tierTxt = (k, t) => (t >= 0 ? `Tier ${t + 1} (≥ ${k.tiers[t].g}%)` : 'di bawah tier 1');
          // 1 · Baseline & target yearly
          const c1 = 'grid-template-columns: 64px 160px 160px 120px 140px 100px 180px minmax(170px,1fr);';
          const sec1 = calc.map((c) => { const u = S.units[c.g.id]; const out = !c.joined; return `<div class="gr" style="${c1}${out ? 'background:#F8F9FD;color:#77848D;' : ''}">
            <div class="td"><input type="checkbox" data-chg="ikut" data-g="${c.g.id}" ${c.joined ? 'checked' : ''} aria-label="Toko ikut ${esc(c.g.name)}"></div>
            <div class="td c"><b class="sm">${esc(c.g.name)}</b><span class="muted">${esc(c.g.members.concat(c.g.others || []).join(' + '))}</span></div>
            <div class="td c"><span><span class="muted">SI</span> ${fj(c.sales.si)}</span><span><span class="muted">SO</span> ${fj(c.sales.so)}</span></div>
            <div class="td c"><select class="cell l" data-chg="tag" data-g="${c.g.id}" ${out ? 'disabled' : ''} aria-label="Tagging"><option value="SI" ${c.tag === 'SI' ? 'selected' : ''}>Sell In</option><option value="SO" ${c.tag === 'SO' ? 'selected' : ''}>Sell Out</option></select><span class="rec">${out ? '' : 'Rekomendasi: ' + (c.recTag === 'SI' ? 'Sell In' : 'Sell Out')}</span></div>
            <div class="td b">${c.joined ? fj(c.base) : '—'}</div>
            <div class="td"><input class="cell" data-k="gy${c.g.id}" data-chg="u" data-f="growth" data-g="${c.g.id}" inputmode="decimal" value="${esc(u.growth)}" ${out ? 'disabled' : ''} aria-label="Growth yearly %"></div>
            <div class="td c"><span class="b">${c.joined ? fr(c.annual) : '—'}</span><span class="muted">${c.joined ? fj(c.monthly) + ' / bln' : ''}</span></div>
            <div class="td c">${chip(!c.joined ? 'Tidak ikut' : c.k ? 'Kelas ' + c.k.code + (c.viaExc ? ' (exception)' : '') : 'Di luar kelas', !c.joined ? 'c-grey' : c.k ? 'c-blue' : 'c-yellow')}
              <span class="muted">${c.k && set.yearly ? 'Yearly: ' + tierTxt(c.k, c.tierY) : c.joined && !c.k ? 'Rate diisi manual' : ''}</span><span class="muted">${c.k && set.semester ? 'Semester: ' + tierTxt(c.k, c.tierS) : ''}</span></div></div>`; }).join('');
          // 2 · Target semester
          const c2 = 'grid-template-columns: 150px 110px minmax(150px,1fr) 110px minmax(150px,1fr) minmax(150px,1fr) 150px;';
          const sec2 = !set.semester ? '' : `<section class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px"><div class="between"><h2 class="h3">2 · Target Semester (S1 / S2)</h2><span class="muted xs">Growth per semester menentukan target S1 dan S2. Growth gabungan menentukan tier semester.</span></div>
            <div class="tblbox" data-keep-scroll><div style="min-width:980px"><div class="gr" style="${c2}"><div class="th">Group Brand</div><div class="th">Growth S1 %</div><div class="th">Target S1<br><span class="rec">Jan – Jun · 6 bln</span></div><div class="th">Growth S2 %</div><div class="th">Target S2<br><span class="rec">Jul – Des · 6 bln</span></div><div class="th">Total target semester</div><div class="th">Growth gabungan</div></div>
            ${calc.map((c) => { const u = S.units[c.g.id]; const out = !c.joined; return `<div class="gr" style="${c2}"><div class="td b sm">${esc(c.g.name)}</div>
              <div class="td"><input class="cell" data-k="g1${c.g.id}" data-chg="u" data-f="g1" data-g="${c.g.id}" inputmode="decimal" value="${esc(u.g1)}" ${out ? 'disabled' : ''} aria-label="Growth S1 %"></div><div class="td b">${c.joined ? fr(c.t1) : '—'}</div>
              <div class="td"><input class="cell" data-k="g2${c.g.id}" data-chg="u" data-f="g2" data-g="${c.g.id}" inputmode="decimal" value="${esc(u.g2)}" ${out ? 'disabled' : ''} aria-label="Growth S2 %"></div><div class="td b">${c.joined ? fr(c.t2) : '—'}</div>
              <div class="td b">${c.joined ? fr(c.semAnnual) : '—'}</div><div class="td b">${c.joined && c.gsOk ? fp(c.gs) + '%' : '—'}</div></div>`; }).join('')}</div></div></section>`;
          // 3 · Rate
          const keys = [set.semester && ['sem', 'Semester', '% × target S1 + S2', 'semBudget'], set.yearly && ['yr', 'Yearly', '% × target yearly', 'yrRp'], FRon && ['fr', FRN, '% × target yearly', 'frBudget']].filter(Boolean);
          const c3 = `grid-template-columns: 160px repeat(${keys.length}, minmax(110px,1fr) minmax(130px,1fr)) minmax(120px,1fr) minmax(120px,1fr);`;
          const rateCell = (c, [key, , , rpKey]) => { const u = S.units[c.g.id]; const has = c.rec[key] !== null; const set_ = u[key] !== null && u[key] !== undefined && String(u[key]).trim() !== '';
            const changed = c.joined && set_ && (!has || Math.abs(pnum(u[key]) - c.rec[key]) > 0.0001);
            return `<div class="td c"><input class="cell ${changed ? 'chg' : ''}" data-k="${key}${c.g.id}" data-chg="u" data-f="${key}" data-g="${c.g.id}" inputmode="decimal" value="${esc(!c.joined ? '' : set_ ? u[key] : has ? fp(c.rec[key]) : '')}" ${c.joined ? '' : 'disabled'} aria-label="${key} %"><span class="rec">Rek ${has ? fp(c.rec[key]) : '—'}</span></div>
              <div class="td rc rp"><b>${c.joined ? fj(c[rpKey]) : '—'}</b></div>`; };
          const sec3 = `<section class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px"><div class="between"><h2 class="h3">${set.semester ? 3 : 2} · ${FRon ? 'Conditional &amp; ' + esc(FRN) : 'Conditional Rebate'}</h2><span class="muted xs">Rate rekomendasi dari tier; kolom Rp = rate × target.</span></div>
            <div class="tblbox" data-keep-scroll><div style="min-width:${300 + keys.length * 260}px"><div class="gr" style="${c3}"><div class="th">Group Brand</div>${keys.map(([, l, h]) => `<div class="th">${esc(l)} %</div><div class="th r rp">${esc(l)} (Rp)<br><span class="rec">${h}</span></div>`).join('')}<div class="th">Total %<br><span class="rec">maks dari tier</span></div><div class="th r rp">Total (Rp)</div></div>
            ${calc.map((c) => { const over = isFinite(c.cap) && c.total > c.cap + 0.0001; return `<div class="gr" style="${c3}"><div class="td c"><b class="sm">${esc(c.g.name)}</b><span class="muted">${!c.joined ? 'Tidak ikut program' : c.k ? 'Kelas ' + c.k.code : 'Di luar kelas · rate manual'}</span></div>
              ${keys.map((k) => rateCell(c, k)).join('')}<div class="td c"><span class="b sm" style="color:${over ? '#B80016' : '#2A3D4A'}">${c.joined ? fp(c.total) + '%' : '—'}</span><span class="rec">Maks ${isFinite(c.cap) ? fp(c.cap) + '%' : c.joined ? 'tidak ada, lewat approval' : '—'}</span></div>
              <div class="td rc rp"><b style="color:${over ? '#B80016' : '#2A3D4A'}">${c.joined ? fj(c.totalRp) : '—'}</b></div></div>`; }).join('')}</div></div>
            <span class="muted xs">Kolom kuning = berbeda dari rekomendasi. Total merah = melebihi maks tier.</span></section>`;
          // 4 · Batas cair
          const c4 = 'grid-template-columns: 160px minmax(150px,1fr) 110px 90px minmax(150px,1fr) minmax(150px,1fr);';
          const sec4 = !set.semester ? '' : `<section class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px"><div class="between"><h2 class="h3">4 · Pembagian Batas Cair (S1 / S2)</h2><span class="muted xs">Membagi budget semester menjadi batas cair S1 dan S2. Minimal ${set.alloc_min}% per semester.</span></div>
            <div class="tblbox"><div style="min-width:860px"><div class="gr" style="${c4}"><div class="th">Group Brand</div><div class="th r rp">Budget semester (Rp)</div><div class="th">S1 %</div><div class="th">S2 %</div><div class="th r rp">Batas cair S1 (Rp)</div><div class="th r rp">Batas cair S2 (Rp)</div></div>
            ${calc.map((c) => { const s1 = pnum(S.units[c.g.id].s1); const s2 = isFinite(s1) ? 100 - s1 : NaN; const bad = c.joined && !(s1 >= set.alloc_min && s2 >= set.alloc_min);
              return `<div class="gr" style="${c4}"><div class="td b sm">${esc(c.g.name)}</div><div class="td rc rp"><b>${c.joined ? fr(c.semBudget) : '—'}</b></div>
              <div class="td"><input class="cell ${bad ? 'warn' : ''}" data-k="s1${c.g.id}" data-chg="u" data-f="s1" data-g="${c.g.id}" inputmode="decimal" value="${esc(S.units[c.g.id].s1)}" ${c.joined ? '' : 'disabled'} aria-label="Batas cair S1 %"></div>
              <div class="td b">${c.joined && isFinite(s2) ? fp(s2).replace(',00', '') + '%' : '—'}</div><div class="td rc rp"><b>${c.joined && isFinite(s1) ? fr(c.semBudget * s1 / 100) : '—'}</b></div><div class="td rc rp"><b>${c.joined && isFinite(s2) ? fr(c.semBudget * s2 / 100) : '—'}</b></div></div>`; }).join('')}</div></div></section>`;
          // 5 · Fixed Rebate Detail
          let sec5 = '';
          const joined = calc.filter((c) => c.joined);
          if (FRon && joined.length) {
            const pu = joined.find((c) => c.g.id === S.pUnit) || joined[0]; const P = S.units[pu.g.id].plan; const F = ch.fr;
            const over = pu.used > pu.frBudget; const scale = Math.max(pu.frBudget, pu.used) || 1; const b = pu.frBudget;
            const pc = (v) => (b > 0 ? fp(v / b * 100) + '%' : '—');
            const seg = (v, col, l) => `<div style="height:100%;width:${(v / scale * 100).toFixed(2)}%;background:${col}" title="${l} ${fj(v)}"></div>`;
            const dot = (col) => `<span style="width:10px;height:10px;border-radius:2px;flex-shrink:0;background:${col}"></span>`;
            const left = b - pu.used;
            const pcols = 'grid-template-columns: minmax(200px,2fr) minmax(120px,1fr) minmax(120px,1fr) minmax(140px,1fr);';
            const prow = (col, l, v, note, style = '') => `<div class="gr" style="${pcols}${style}"><div class="td">${col ? dot(col) : ''}<b>${l}</b></div><div class="td rc rp"><b>${fj(v)}</b></div><div class="td rc rp">${pc(v)}</div><div class="td muted">${note}</div></div>`;
            const gi = pu.g.id; const warn = 'warn';
            const rentRows = P.rent.map((r_, j) => `<div class="gr" style="grid-template-columns: minmax(180px,1.3fr) minmax(150px,1fr) 190px 44px"><div class="td"><select class="cell l" data-chg="pl" data-sec="rent" data-j="${j}" data-f="obj" aria-label="Objek sewa">${F.rent.items.concat(F.rent.items.includes(r_.obj) ? [] : [r_.obj]).map((o) => `<option ${o === r_.obj ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
              <div class="td"><input class="cell ${rpNum(r_.val) ? '' : warn}" data-k="rv${gi}${j}" data-chg="plRp" data-sec="rent" data-j="${j}" inputmode="numeric" placeholder="Rp" value="${esc(r_.val)}" aria-label="Nilai sewa"></div>
              <div class="td">${monthSel(r_.from, `data-chg="pl" data-sec="rent" data-j="${j}" data-f="from" aria-label="Bulan mulai"`)}<span class="muted">–</span>${monthSel(r_.to, `data-chg="pl" data-sec="rent" data-j="${j}" data-f="to" aria-label="Bulan selesai"`)}</div>
              <div class="td"><button type="button" class="x" aria-label="Hapus baris" data-on="plDel" data-sec="rent" data-j="${j}">${L.ico.trash}</button></div></div>`).join('');
            const actRows = P.act.map((r_, j) => `<div class="gr" style="grid-template-columns: minmax(170px,1fr) 80px minmax(220px,1.5fr) 190px 44px"><div class="td"><select class="cell l" data-chg="pl" data-sec="act" data-j="${j}" data-f="type" aria-label="Jenis aktivitas">${F.act.items.concat(F.act.items.includes(r_.type) ? [] : [r_.type]).map((o) => `<option ${o === r_.type ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>
              <div class="td">${sw(r_.on, `data-on="plTg" data-sec="act" data-j="${j}" aria-label="Bernilai"`)}</div>
              <div class="td">${r_.on ? `<input class="cell ${rpNum(r_.val) ? '' : warn}" data-k="av${gi}${j}" data-chg="plRp" data-sec="act" data-j="${j}" inputmode="numeric" placeholder="Rp" value="${esc(r_.val)}" aria-label="Nilai">` : `<input class="cell l ${String(r_.note || '').trim() ? '' : warn}" data-k="an${gi}${j}" data-chg="pl" data-sec="act" data-j="${j}" data-f="note" placeholder="Keterangan aktivitas" value="${esc(r_.note)}" aria-label="Keterangan">`}</div>
              <div class="td">${monthSel(r_.from, `data-chg="pl" data-sec="act" data-j="${j}" data-f="from" aria-label="Bulan mulai"`)}<span class="muted">–</span>${monthSel(r_.to, `data-chg="pl" data-sec="act" data-j="${j}" data-f="to" aria-label="Bulan selesai"`)}</div>
              <div class="td"><button type="button" class="x" aria-label="Hapus baris" data-on="plDel" data-sec="act" data-j="${j}">${L.ico.trash}</button></div></div>`).join('');
            const othRows = P.oth.map((r_, j) => `<div class="gr" style="grid-template-columns: 80px minmax(260px,2fr) minmax(160px,1fr) 44px"><div class="td">${sw(r_.on, `data-on="plTg" data-sec="oth" data-j="${j}" aria-label="Bernilai"`)}</div>
              <div class="td">${r_.on ? `<input class="cell l ${String(r_.obj || '').trim() ? '' : warn}" data-k="oo${gi}${j}" data-chg="pl" data-sec="oth" data-j="${j}" data-f="obj" placeholder="Objek" value="${esc(r_.obj)}" aria-label="Objek">` : `<input class="cell l ${String(r_.note || '').trim() ? '' : warn}" data-k="on${gi}${j}" data-chg="pl" data-sec="oth" data-j="${j}" data-f="note" placeholder="Keterangan" value="${esc(r_.note)}" aria-label="Keterangan">`}</div>
              <div class="td">${r_.on ? `<input class="cell ${rpNum(r_.val) ? '' : warn}" data-k="ov${gi}${j}" data-chg="plRp" data-sec="oth" data-j="${j}" inputmode="numeric" placeholder="Rp" value="${esc(r_.val)}" aria-label="Nilai">` : '<span class="muted">Tanpa nilai</span>'}</div>
              <div class="td"><button type="button" class="x" aria-label="Hapus baris" data-on="plDel" data-sec="oth" data-j="${j}">${L.ico.trash}</button></div></div>`).join('');
            const block = (on, title, desc, add, head, rowsH, empty, minW) => !on ? '' : `<div class="col-f" style="gap:8px"><div class="between"><div class="col-f" style="gap:0"><b>${title}</b>${desc ? `<span class="muted xs">${desc}</span>` : ''}</div><button type="button" class="btn btn-g" data-on="plAdd" data-sec="${add}">+ Tambah baris</button></div>
              <div class="tblbox"><div style="min-width:${minW}px">${head}${rowsH || `<div class="td muted">${empty}</div>`}</div></div></div>`;
            sec5 = `<section class="card pad" style="gap:18px"><div class="between" style="align-items:flex-end"><div class="col-f"><h2 class="h3">${set.semester ? 5 : 3} · ${esc(FRN)} Detail</h2><span class="muted sm">Rencana per group brand. Total nilai harus di dalam budget fixed rebate; jika lebih, isi alasan di Pengecekan.</span></div>
                <div class="seg" role="group" aria-label="Pilih group brand">${joined.map((c) => `<button type="button" class="${c.g.id === pu.g.id ? 'on' : ''}" data-on="pTab" data-g="${c.g.id}">${esc(c.g.name)}</button>`).join('')}</div></div>
              <div class="box" style="display:flex;flex-direction:column;gap:8px;padding:14px 16px;border-radius:8px;background:#FCFCFE">
                <div class="between"><span class="sm b" style="color:${over ? '#B80016' : '#267346'}">${esc(pu.g.name)}: ${fj(pu.used)} dari budget fixed rebate ${fj(b)}${over ? ' · melebihi budget, butuh alasan dan approval' : ' · di dalam budget'}</span><span class="muted xs">Budget fixed rebate ${fj(b)}</span></div>
                <div style="display:flex;height:14px;border-radius:7px;background:#EBEBEB;overflow:hidden" role="img" aria-label="Pemakaian budget">${seg(pu.rentSum, '#304DDE', 'Visibility Rent')}${seg(pu.actSum, '#E07A1F', 'Aktivitas')}${seg(pu.othSum, '#1F9E8A', 'Lainnya')}</div>
                <div class="tblbox"><div class="gr" style="${pcols}"><div class="th">Bagian</div><div class="th r rp">Nilai (Rp)</div><div class="th r rp">% dari budget</div><div class="th">Baris</div></div>
                  ${F.rent.on ? prow('#304DDE', 'Visibility Rent', pu.rentSum, `${P.rent.length} objek sewa`) : ''}${F.act.on ? prow('#E07A1F', 'Aktivitas (bernilai)', pu.actSum, `${P.act.filter((x) => x.on).length} bernilai dari ${P.act.length} aktivitas`) : ''}
                  ${F.oth.on ? prow('#1F9E8A', 'Lainnya (bernilai)', pu.othSum, `${P.oth.filter((x) => x.on).length} bernilai dari ${P.oth.length} baris`) : ''}${prow(null, 'Total dipakai', pu.used, '', 'font-weight:700;')}
                  ${prow(left >= 0 ? '#EBEBEB' : '#E6001C', left >= 0 ? 'Sisa budget' : 'Melebihi budget', Math.abs(left), left >= 0 ? '' : 'butuh alasan dan approval', left >= 0 ? '' : 'color:#B80016;')}</div></div>
              ${block(F.rent.on, 'Visibility Rent', 'Objek sewa, nilai, dan periode. Nilai wajib.', 'rent', '<div class="gr" style="grid-template-columns: minmax(180px,1.3fr) minmax(150px,1fr) 190px 44px"><div class="th">Objek sewa</div><div class="th">Nilai (Rp)</div><div class="th">Periode</div><div class="th"></div></div>', rentRows, 'Belum ada sewa.', 700)}
              ${block(F.act.on, 'Aktivitas', '', 'act', '<div class="gr" style="grid-template-columns: minmax(170px,1fr) 80px minmax(220px,1.5fr) 190px 44px"><div class="th">Jenis aktivitas</div><div class="th">Bernilai</div><div class="th">Nilai (Rp) / keterangan</div><div class="th">Periode</div><div class="th"></div></div>', actRows, 'Belum ada aktivitas.', 700)}
              ${block(F.oth.on, 'Lainnya', '', 'oth', '<div class="gr" style="grid-template-columns: 80px minmax(260px,2fr) minmax(160px,1fr) 44px"><div class="th">Bernilai</div><div class="th">Objek / keterangan</div><div class="th">Nilai (Rp)</div><div class="th"></div></div>', othRows, 'Belum ada.', 600)}</section>`;
          }
          // pengecekan & ringkasan
          const KM = { hard: ['Tidak bisa diajukan', 'c-red'], appr: ['Butuh alasan', 'c-yellow'], info: ['Info', 'c-grey'] };
          const chkHtml = checks.map((c) => `<div class="col-f" style="gap:8px;padding:12px 0;border-top:1px solid #EBEBEB"><div class="row-f">${chip(KM[c.kind][0], KM[c.kind][1])}<b>${esc(c.unit)}</b></div><span class="sm">${esc(c.label)}</span>
            ${c.kind === 'appr' ? (mode === 'edit' ? `<textarea class="ta ${String(S.reasons[c.key] || '').trim() ? '' : 'warn'}" data-k="rs${c.key}" data-inp="reason" data-key="${c.key}" placeholder="Tulis alasan untuk approver..." aria-label="Alasan">${esc(S.reasons[c.key] || '')}</textarea>`
              : `<div class="note-y"><b>Alasan CBD:</b> ${esc(S.reasons[c.key] || '—')}</div>`) : ''}</div>`).join('');
          const tg = calc.filter((c) => c.joined);
          const sumBase = tg.reduce((a, c) => a + c.base, 0); const totT = tg.reduce((a, c) => a + c.annual, 0); const totS = tg.reduce((a, c) => a + c.semAnnual, 0);
          const cond = tg.reduce((a, c) => a + c.semBudget + c.yrRp, 0); const frT = tg.reduce((a, c) => a + c.frBudget, 0);
          const share = (v) => (totT > 0 ? fp(v / totT * 100) + '%' : '—');
          const info = [['Channel', L.channelOf(ch.channel_code).full], ['Group brand ikut', `${tg.length} dari ${calc.length}`], ['Periode', L.periodTxt(p.period_start, p.period_end)], ['Total avg baseline', fj(sumBase) + ' / bln'], ['Target yearly', fr(totT)]]
            .concat(set.semester ? [['Target semester (S1 + S2)', fr(totS)]] : []);
          const reb = [['Conditional rebate (' + [set.semester && 'semester', set.yearly && 'yearly'].filter(Boolean).join(' + ') + ')', share(cond), fj(cond), '']].concat(FRon ? [[FRN, share(frT), fj(frT), '']] : []).concat([['Total rebate', share(cond + frT), fj(cond + frT), 'font-weight:700;background:#F8F9FD;']]);
          const blocked = hard > 0 || missing > 0;
          const blockText = hard ? `Perbaiki ${hard} temuan merah sebelum mengajukan.` : missing ? `Isi alasan untuk ${missing} kasus exception.` : appr.length ? `Alasan untuk ${appr.length} kasus sudah diisi. Siap diajukan.` : 'Siap diajukan.';
          return `${headHtml(p, ch, part, r, mode, back)}${sidePanels(S, p, ch, part, r, mode, user)}
            <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:20px">
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:14px"><div class="between"><h2 class="h3">1 · Baseline &amp; Target Yearly</h2><span class="muted xs">Hapus centang Ikut jika toko tidak ikut group brand tersebut. Growth yearly menentukan target tahunan${set.yearly ? ' dan tier yearly' : ''}.</span></div>
              <div class="tblbox" data-keep-scroll><div style="min-width:1084px"><div class="gr" style="${c1}"><div class="th">Ikut</div><div class="th">Group Brand</div><div class="th">Sell In · Sell Out / bln</div><div class="th">Tagging</div><div class="th">Baseline / bln</div><div class="th">Growth yearly %</div><div class="th">Target yearly</div><div class="th">Kelas · Tier</div></div>${sec1}</div></div></section>
            ${sec2}${sec3}${sec4}${sec5}</fieldset>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;align-items:start">
              <section class="card pad" style="gap:12px"><div class="between"><h2 class="h3">Pengecekan</h2>${chip(hard ? `${hard} memblokir · ${appr.length} butuh alasan` : appr.length ? `${appr.length} butuh alasan` : 'Tidak ada temuan', hard ? 'c-red' : appr.length ? 'c-yellow' : 'c-green')}</div>
                ${checks.length ? chkHtml : '<span class="muted">Semua nilai sesuai rekomendasi dan batas.</span>'}</section>
              <section class="card pad" style="gap:12px"><h2 class="h3">Summary Toko</h2>
                <div class="tblbox">${info.map(([l, v]) => `<div class="gr" style="grid-template-columns:minmax(150px,1fr) minmax(0,1.4fr)"><div class="td b" style="background:#F8F9FD;color:#445560">${esc(l)}</div><div class="td r"><b>${esc(v)}</b></div></div>`).join('')}</div>
                <div class="tblbox"><div class="gr" style="grid-template-columns:minmax(150px,1fr) 90px minmax(120px,1fr)"><div class="th">Rebate</div><div class="th r">%</div><div class="th r">Rp</div>
                  ${reb.map(([l, pc_, rp_, st]) => `<div class="td" style="${st}">${esc(l)}</div><div class="td r" style="${st}">${pc_}</div><div class="td r" style="${st}">${rp_}</div>`).join('')}</div></div>
                <span class="muted xs">% = nilai Rp ÷ total target yearly. Estimasi; nilai cair dihitung di Pencairan dari penjualan aktual.</span></section></div>
            ${S.err.length ? `<div class="note-r"><ul>${S.err.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : ''}
            ${mode === 'edit' ? `<section class="card head" style="padding:16px 24px"><span class="b" style="color:${blocked ? '#B80016' : '#2A3D4A'}">${blockText}</span>
              <div class="row-f">${r ? '<button type="button" class="btn btn-g" style="color:#B80016 !important" data-on="cancel">Batalkan pendaftaran</button>' : ''}<button type="button" class="btn btn-s" data-on="draft">Simpan Draft</button><button type="button" class="btn btn-p" data-on="submit" ${blocked ? 'disabled' : ''}>${r && r.status === 'RETURNED' ? 'Ajukan Ulang' : 'Ajukan Pendaftaran'}</button></div></section>` : ''}`;
        },
        on: Object.assign({
          ikut: (S, el) => { const u = S.units[el.dataset.g]; u.joined = el.checked; if (u.joined && !S.pUnit) S.pUnit = el.dataset.g; },
          tag: (S, el) => { S.units[el.dataset.g].tag = el.value; },
          u: (S, el) => { S.units[el.dataset.g][el.dataset.f] = el.value.trim(); },
          reason: (S, el) => { S.reasons[el.dataset.key] = el.value; el.classList.toggle('warn', !el.value.trim()); },
          pTab: (S, el) => { S.pUnit = el.dataset.g; },
          plAdd: (S, el) => { const P = S.units[curUnit(S, p, ch)].plan; const F = ch.fr; const sec = el.dataset.sec;
            if (sec === 'rent') P.rent.push({ obj: F.rent.items[0] || '', val: '', from: 'Jan', to: 'Des' });
            if (sec === 'act') P.act.push({ type: F.act.items[0] || '', on: false, val: '', note: '', from: 'Jan', to: 'Des' });
            if (sec === 'oth') P.oth.push({ on: false, obj: '', val: '', note: '' }); },
          plDel: (S, el) => { S.units[curUnit(S, p, ch)].plan[el.dataset.sec].splice(Number(el.dataset.j), 1); },
          plTg: (S, el) => { const r_ = S.units[curUnit(S, p, ch)].plan[el.dataset.sec][Number(el.dataset.j)]; r_.on = !r_.on; },
          pl: (S, el) => { S.units[curUnit(S, p, ch)].plan[el.dataset.sec][Number(el.dataset.j)][el.dataset.f] = el.value; },
          plRp: (S, el) => { S.units[curUnit(S, p, ch)].plan[el.dataset.sec][Number(el.dataset.j)].val = L.fmtThousand(el.value); },
          draft: (S) => { saveReg(S, p, ch, part, r, viaExc, false); return false; },
          submit: (S) => { const e = saveReg(S, p, ch, part, r, viaExc, true); if (e) { S.err = e; } else return false; },
          cancel: () => { if (!confirm('Batalkan pendaftaran ini? Data pendaftaran tidak bisa diajukan lagi.')) return false; L.setStatus(r, 'CANCELLED', 'Dibatalkan CBD', UI.currentUser().id); DB.save(); flash('success', 'Pendaftaran dibatalkan.'); go('/pendaftaran'); return false; },
        }, sideOn(p, ch, part, r, mode, user, back)),
      });
    };
  }
  const curUnit = (S, p) => { const g = L.groupsOf(p).find((x) => x.id === S.pUnit && S.units[x.id].joined !== false) || L.groupsOf(p).find((x) => S.units[x.id].joined !== false); return g.id; };

  function saveReg(S, p, ch, part, r, viaExc, submit) {
    const user = UI.currentUser();
    if (!r) r = DB.insert(L.T.regs, { program_id: p.id, channel_id: ch.id, code: part.code, kind: part.kind, name: part.name, codes: part.codes.slice(), status: 'DRAFT', revision: 0,
      via_exception: viaExc, units: {}, reasons: {}, route: [], docs: { mou: '', files: {} }, review: { status: null, note: '' }, history: [], created_by: user.id, created_at: L.now(), updated_at: L.now() });
    r.units = clone(S.units); r.reasons = clone(S.reasons); r.codes = part.codes.slice(); r.updated_at = L.now();
    if (!submit) { if (r.status !== 'RETURNED') r.status = 'DRAFT'; DB.save(); flash('success', 'Draft pendaftaran disimpan.'); go(`/pendaftaran/form/${p.id}/${encodeURIComponent(part.code)}`); return null; }
    const { checks } = L.regCalc(r);
    const e = checks.filter((c) => c.kind === 'hard').map((c) => `${c.unit}: ${c.label}`).concat(checks.filter((c) => c.kind === 'appr' && !String(S.reasons[c.key] || '').trim()).map((c) => `${c.unit}: isi alasan (${c.label})`));
    if (e.length) { DB.save(); return e; }
    r.revision = (r.revision || 0) + 1; r.route = L.makeRoute(r); r.submitted_at = L.now(); r.checks = checks;
    if (!r.route.some((s) => s.status === 'RUN')) { finishApproval(r, ch); flash('success', 'Pendaftaran diajukan. Tidak ada layer approval yang berjalan: MOU langsung dibuat.'); }
    else { L.setStatus(r, 'IN_APPROVAL', r.revision > 1 ? 'Diajukan ulang' : 'Diajukan', user.id); const c = L.currentStep(r); flash('success', `<b>Pendaftaran diajukan.</b> Menunggu approval ${esc(L.ROLES[c.role] || c.role)}.`); }
    DB.save(); go('/pendaftaran'); return null;
  }
  function finishApproval(r, ch) {
    const last = ch.mou.revisions[ch.mou.revisions.length - 1];
    r.mou_rev = last ? last.no : null; r.mou_no = r.mou_no || `MOU/${L.program(r.program_id).code.replace(/-/g, '')}/${ch.channel_code.split('_')[0]}/${String(r.id).padStart(4, '0')}`;
    L.setStatus(r, 'AWAITING_DOCS', `MOU dibuat dari template revisi ${r.mou_rev || '-'}`, null);
  }

  function headHtml(p, ch, part, r, mode, back) {
    const st = r ? L.REG_STATUS[r.status] : L.REG_STATUS.NEW;
    back = back || (mode === 'approve' || mode === 'review' ? '#/approval' : '#/pendaftaran');
    return `<section class="card head"><div class="head-l"><a href="${back}" class="back">${L.ico.back}Kembali</a><div class="col-f" style="gap:8px">
      <div class="row-f" style="gap:10px"><h1 class="h1">${esc(part.name)}</h1>${chip(part.kind, 'c-grey')}${chip(st[0], st[1])}${r && r.via_exception ? chip('Toko exception', 'c-yellow') : ''}</div>
      <span class="muted sm">${esc(part.code)} · ${esc(part.sub)} · ${esc(part.dc)}${r && r.revision > 1 ? ` · revisi ${r.revision}` : ''}</span>
      <div class="row-f" style="gap:6px">${chip(p.name, 'c-green')}${chip(L.channelOf(ch.channel_code).full, 'c-blue')}</div></div></div></section>`;
  }
  // panel status: rute approval, aksi approver, dokumen, review
  function routeHtml(r) {
    if (!r || !r.route || !r.route.length) return '';
    return `<div class="col-f" style="gap:0">${r.route.map((s) => { const cur = L.currentStep(r) === s;
      const st = s.status === 'SKIP' ? chip('Dilewati', 'c-grey') : s.status === 'MERGED' ? chip('Digabung', 'c-grey') : s.decision === 'APPROVED' ? chip('Disetujui', 'c-green') : s.decision === 'RETURNED' ? chip('Dikembalikan', 'c-red') : cur && r.status === 'IN_APPROVAL' ? chip('Menunggu', 'c-yellow') : chip('Belum', 'c-grey');
      return `<div class="row-f" style="gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #EBEBEB;flex-wrap:nowrap"><span class="dot-n s ${s.status === 'RUN' ? '' : 'off'}">${s.n}</span>
        <div class="col-f"><div class="row-f"><b>${esc(L.ROLES[s.role] || s.role)}</b>${st}</div><span class="muted xs">${esc(s.why)}</span>
        ${s.by ? `<span class="xs">${esc(userName(s.by))} · ${L.dateTxt(s.at)}${s.comment ? ` · "${esc(s.comment)}"` : ''}</span>` : ''}</div></div>`; }).join('')}</div>`;
  }
  function sidePanels(S, p, ch, part, r, mode, user) {
    if (!r) return '';
    const out = [];
    if (r.status === 'RETURNED') { const s = r.route.find((x) => x.decision === 'RETURNED'); out.push(`<div class="note-r"><b>Dikembalikan ${esc(s ? L.ROLES[s.role] || s.role : '')}:</b> ${esc(s ? s.comment : '')} Perbaiki lalu ajukan ulang.</div>`); }
    if (['IN_APPROVAL', 'RETURNED', 'AWAITING_DOCS', 'DOC_REVIEW', 'REGISTERED'].includes(r.status) && r.route.length) out.push(`<section class="card pad" style="gap:8px"><h2 class="h3">Rute Approval</h2>${routeHtml(r)}</section>`);
    if (mode === 'approve') out.push(`<section class="card pad" style="gap:12px;border:2px solid #F2E08A"><h2 class="h3">Menunggu Anda: ${esc(L.ROLES[user.role] || user.role)}</h2>
      <textarea class="ta" data-k="cmt" data-inp="cmt" placeholder="Komentar (wajib jika dikembalikan)">${esc(S.comment)}</textarea>
      <div class="row-f"><button type="button" class="btn btn-p" data-on="approve">Setujui</button><button type="button" class="btn btn-s" data-on="return">Kembalikan ke CBD</button></div></section>`);
    if (['AWAITING_DOCS', 'DOC_REVIEW', 'REGISTERED'].includes(r.status)) {
      const docs = ch.mou.docs; const canUp = r.status === 'AWAITING_DOCS' && user.role === 'ADMIN_DC';
      const fileRow = (name, req, val, key) => `<div class="between" style="padding:10px 0;border-top:1px solid #EBEBEB"><span><b>${esc(name)}</b>${req ? ' <span style="color:#B80016">*</span>' : ''}</span>
        <span class="row-f">${val ? `<span class="sm">📎 ${esc(val)}</span>` : '<span class="muted sm">Belum diunggah</span>'}${canUp ? `<label class="btn btn-s sm" style="margin:0">Pilih file<input type="file" hidden data-chg="docUp" data-key="${esc(key)}"></label>` : ''}</span></div>`;
      out.push(`<section class="card pad" style="gap:12px"><div class="between"><h2 class="h3">MOU &amp; Dokumen</h2>${r.review && r.review.status === 'REVISE' && r.status === 'AWAITING_DOCS' ? chip('Perlu revisi', 'c-red') : ''}</div>
        ${r.review && r.review.status === 'REVISE' && r.status === 'AWAITING_DOCS' ? `<div class="note-r"><b>Catatan reviewer:</b> ${esc(r.review.note)}</div>` : ''}
        <div class="row-f box" style="gap:12px;padding:12px 16px;border-radius:8px;flex-wrap:nowrap"><span style="width:40px;height:48px;border-radius:4px;background:#D6DBF8;color:#1E308B;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">MOU</span>
          <div class="col-f" style="flex:1"><b>${esc(r.mou_no || '')}</b><span class="muted sm">Dibuat dari template revisi ${r.mou_rev || '-'} · ${esc(L.channelOf(ch.channel_code).name)}</span></div><button type="button" class="btn btn-s sm" data-on="mouDl">Unduh MOU</button></div>
        ${fileRow('MOU ditandatangani', true, S.files.mou, '__mou')}${docs.filter((d) => !d.locked).map((d) => fileRow(d.name, d.req, S.files.files[d.name], d.name)).join('')}
        ${canUp ? '<div class="row-f" style="justify-content:flex-end"><button type="button" class="btn btn-p" data-on="docSend">Kirim untuk Review</button></div>' : ''}
        ${mode === 'review' ? `<textarea class="ta" data-k="cmt" data-inp="cmt" placeholder="Catatan (wajib jika perlu revisi)">${esc(S.comment)}</textarea>
          <div class="row-f"><button type="button" class="btn btn-p" data-on="docOk">Dokumen OK · Terdaftar</button><button type="button" class="btn btn-s" data-on="docRev">Minta Revisi</button></div>` : ''}</section>`);
    }
    return out.join('');
  }
  function sideOn(p, ch, part, r, mode, user, back) {
    const to = back ? back.slice(1) : null;
    return {
      cmt: (S, el) => { S.comment = el.value; },
      approve: (S) => { const s = L.currentStep(r); if (!s) return; Object.assign(s, { decision: 'APPROVED', by: user.id, at: L.now(), comment: S.comment.trim() });
        if (!L.currentStep(r)) { finishApproval(r, ch); flash('success', `${esc(part.name)} disetujui. MOU dibuat dan menunggu dokumen dari Admin DC.`); }
        else { const n = L.currentStep(r); r.updated_at = L.now(); flash('success', `${esc(part.name)} disetujui, diteruskan ke ${esc(L.ROLES[n.role] || n.role)}.`); }
        DB.save(); go('/approval'); return false; },
      return: (S) => { if (!S.comment.trim()) { alert('Isi komentar untuk CBD.'); return false; } const s = L.currentStep(r);
        Object.assign(s, { decision: 'RETURNED', by: user.id, at: L.now(), comment: S.comment.trim() }); L.setStatus(r, 'RETURNED', S.comment.trim(), user.id);
        DB.save(); flash('success', `${esc(part.name)} dikembalikan ke CBD.`); go('/approval'); return false; },
      mouDl: () => {
        const { calc } = L.regCalc(r); const tg = calc.filter((c) => c.joined);
        const rows = tg.map((c) => [c.g.name, c.k ? c.k.code : '-', fr(c.annual), ch.settings.semester ? fp(c.semV) + '%' : '-', ch.settings.yearly ? fp(c.yrV) + '%' : '-', L.FR(p) ? fp(c.frV) + '%' : '-']);
        const frTxt = tg.map((c) => { const P = r.units[c.g.id].plan; return `${c.g.name} · ` + [P.rent.map((x) => `${x.obj} ${x.val ? 'Rp ' + x.val : ''} ${x.from}–${x.to}`).join(', '), P.act.map((x) => `${x.type}: ${x.on ? 'Rp ' + x.val : x.note}`).join(', ')].filter(Boolean).join('. '); }).join(' · ');
        const st = L.store(part.codes[0]) || {};
        const html = `<html><head><meta charset="utf-8"></head><body>${L.mouPreview(p, ch, true, { program: p.name.toUpperCase(), number: r.mou_no, date: L.dateTxt(r.updated_at), store: part.name, code: part.code, address: st.address || '', rows, fr: frTxt || '-', signer: '(nama pemilik toko)', cbd: userName(r.created_by) + ' (CBD)' })}</body></html>`;
        UI.download(`${r.mou_no.replace(/\//g, '-')}.doc`, html, 'application/msword'); return false; },
      docUp: (S, el) => { const f = el.files && el.files[0]; if (!f) return false; if (el.dataset.key === '__mou') S.files.mou = f.name; else S.files.files[el.dataset.key] = f.name; },
      docSend: (S) => {
        const miss = (S.files.mou ? [] : ['MOU ditandatangani']).concat(ch.mou.docs.filter((d) => !d.locked && d.req && !S.files.files[d.name]).map((d) => d.name));
        if (miss.length) { alert('Lengkapi dokumen wajib: ' + miss.join(', ')); return false; }
        r.docs = clone(S.files); r.review = { status: null, note: '' }; L.setStatus(r, 'DOC_REVIEW', 'Dokumen dikirim', user.id); DB.save();
        flash('success', 'Dokumen dikirim ke Admin HO untuk direview.'); go(to || '/dokumen'); return false; },
      docOk: (S) => { r.review = { status: 'OK', note: S.comment.trim(), by: user.id, at: L.now() }; L.setStatus(r, 'REGISTERED', 'Dokumen OK', user.id); DB.save(); flash('success', `Dokumen ${esc(part.name)} disetujui, toko terdaftar.`); go(to || '/approval'); return false; },
      docRev: (S) => { if (!S.comment.trim()) { alert('Isi catatan revisi untuk Admin DC.'); return false; } r.review = { status: 'REVISE', note: S.comment.trim(), by: user.id, at: L.now() };
        L.setStatus(r, 'AWAITING_DOCS', 'Dokumen perlu revisi: ' + S.comment.trim(), user.id); DB.save(); flash('success', 'Dikembalikan ke Admin DC untuk revisi dokumen.'); go(to || '/approval'); return false; },
    };
  }

  route('/pendaftaran/form/:pid/:code', ({ pid, code }, q, { user }) => {
    const p = L.program(pid); const part = L.participant(decodeURIComponent(code));
    if (!p || !part) UI.fail('Data tidak ditemukan');
    const ch = chOf(p, part.channel); if (!ch || !L.regOpen(ch)) UI.fail('Pendaftaran belum dibuka', 'Channel toko ini belum membuka pendaftaran.');
    const r = L.activeReg(p.id, part.code);
    const st = r ? r.status : 'NEW';
    const canEdit = user.role === 'CBD' && ['NEW', 'DRAFT', 'RETURNED'].includes(st);
    if (!r && user.role !== 'CBD') UI.fail('Belum didaftarkan', 'Toko ini belum didaftarkan CBD.');
    if (!r) { const rs = rowStatus(p, part); if (!rs || rs.blocked) UI.fail('Tidak bisa didaftarkan', rs && rs.blocked ? rs.blocked : 'Baseline toko di bawah kelas terendah. Admin HO dapat mengajukannya lewat Toko Exception.'); }
    return L.page(`Pendaftaran · ${part.name}`, regForm(p, ch, part, r, canEdit ? 'edit' : 'view', user));
  });

  // ---------------------------------------------------------------- Approval (antrian approver & reviewer dokumen)
  route('/approval', ({}, q, { user }) => {
    return L.page('Approval', (root) => {
      L.view(root, {
        state: { tab: 'mine' },
        html: (S) => {
          const mine = L.myQueue(user);
          const all = L.regs().filter((r) => ['IN_APPROVAL', 'DOC_REVIEW'].includes(r.status));
          const list = S.tab === 'mine' ? mine : all;
          const cols = 'grid-template-columns: 130px minmax(220px,2fr) 200px 160px 220px 130px;';
          return `<div class="col-f" style="gap:6px"><h1 class="title">Approval</h1><p class="muted" style="margin:0">Pendaftaran yang menunggu keputusan ${esc(UI.h.ROLE_LABEL[user.role] || user.role)}.</p></div>
            <div class="grid-auto"><div class="card pad-s"><span class="lbl up">Menunggu Anda</span><span class="kpi-v" style="color:#304DDE">${mine.length}</span><span class="muted xs">approval dan review dokumen</span></div>
              <div class="card pad-s"><span class="lbl up">Semua dalam proses</span><span class="kpi-v">${all.length}</span><span class="muted xs">di semua approver</span></div></div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px"><div class="seg" role="group"><button type="button" class="${S.tab === 'mine' ? 'on' : ''}" data-on="tab" data-t="mine">Menunggu saya (${mine.length})</button><button type="button" class="${S.tab === 'all' ? 'on' : ''}" data-on="tab" data-t="all">Semua dalam proses (${all.length})</button></div>
              <div class="tblbox"><div style="min-width:1000px"><div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Toko / Customer Group</div><div class="th">Program · Channel</div><div class="th">Diajukan</div><div class="th">Tahap</div><div class="th">Aksi</div></div>
              ${list.map((r) => { const p = L.program(r.program_id); const ch = L.channel(r.channel_id); const cur = L.currentStep(r); const m = L.REG_STATUS[r.status]; const isMine = mine.includes(r);
                return `<div class="gr" style="${cols}"><div class="td b">${esc(r.code)}</div><div class="td c"><b>${esc(r.name)}</b><span class="muted">${esc(r.kind)}${r.via_exception ? ' · toko exception' : ''}</span></div>
                <div class="td c"><b>${esc(p.code)}</b><span class="muted">${esc(L.channelOf(ch.channel_code).name)}</span></div><div class="td c"><span>${L.dateTxt(r.submitted_at)}</span><span class="muted">${esc(userName(r.created_by))}</span></div>
                <div class="td c" style="gap:4px">${chip(m[0], m[1])}<span class="muted">${r.status === 'DOC_REVIEW' ? 'Reviewer: Admin HO' : cur ? 'Di ' + esc(L.ROLES[cur.role] || cur.role) : ''}</span></div>
                <div class="td"><a class="btn sm ${isMine ? 'btn-p' : 'btn-s'}" href="#/approval/${r.id}">${isMine ? (r.status === 'DOC_REVIEW' ? 'Review' : 'Putuskan') : 'Lihat'}</a></div></div>`; }).join('')
                || `<div class="td muted" style="justify-content:center;padding:24px">${S.tab === 'mine' ? 'Tidak ada yang menunggu Anda.' : 'Tidak ada pendaftaran dalam proses.'}</div>`}</div></div></section>`;
        },
        on: { tab: (S, el) => { S.tab = el.dataset.t; } },
      });
    });
  });
  route('/approval/:id', ({ id }, q, { user }) => {
    const r = L.reg(id); if (!r) UI.fail('Pendaftaran tidak ditemukan');
    const p = L.program(r.program_id); const ch = L.channel(r.channel_id);
    const part = L.participant(r.code) || { code: r.code, name: r.name, kind: r.kind, sub: '', dc: '', channel: ch.channel_code, codes: r.codes };
    const mine = L.myQueue(user).includes(r);
    const mode = mine ? (r.status === 'DOC_REVIEW' ? 'review' : 'approve') : 'view';
    return L.page(`Approval · ${r.name}`, regForm(p, ch, Object.assign({}, part, { codes: r.codes }), r, mode, user));
  });

  // ---------------------------------------------------------------- 18 · Toko Exception (Admin HO)
  route('/exception', ({}, q, { user }) => {
    if (!isHo(user)) UI.fail('Tidak ada akses', 'Toko Exception untuk Admin HO.');
    const progs = L.programs().filter((p) => !L.programClosed(p) && L.channels(p.id).length);
    return L.page('Toko Exception', (root) => {
      L.view(root, {
        state: { prog: (progs[0] || {}).id, f: 'all', q: '', dc: '', type: '', ch: '', sel: {}, open: null, note: '', banner: null },
        html: (S) => {
          const p = L.program(S.prog); if (!p) return '<div class="card pad muted">Belum ada program aktif.</div>';
          const all = [];
          for (const part of L.participants()) {
            const ch = chOf(p, part.channel); if (!ch) continue;
            const el = L.eligibility(p, ch, part); if (el.eligible || !el.top) continue;
            const exc = L.exceptionOf(p.id, part.code);
            all.push({ part, ch, el, exc, status: !L.regOpen(ch) ? 'closed' : exc ? 'reg' : 'todo' });
          }
          const META = { todo: ['Belum didaftarkan', 'c-grey'], reg: ['Didaftarkan', 'c-green'], closed: ['Belum dibuka', 'c-grey'] };
          const scoped = all.filter((x) => !S.dc || x.part.dc === S.dc);
          const qq = S.q.trim().toLowerCase();
          const vis = scoped.filter((x) => (!S.type || x.part.kind === S.type) && (!S.ch || x.part.channel === S.ch) && (S.f === 'all' || x.status === S.f) && (!qq || (x.part.code + ' ' + x.part.name).toLowerCase().includes(qq)));
          const selectable = vis.filter((x) => x.status === 'todo'); const selCodes = Object.keys(S.sel).filter((k) => S.sel[k] && all.some((x) => x.part.code === k && x.status === 'todo'));
          const cnt = (st) => scoped.filter((x) => x.status === st).length;
          const bar = (ratio) => `<div class="track"><div style="width:${Math.min(100, Math.round(ratio))}%;background:${ratio >= 80 ? '#304DDE' : '#8A9BEF'}"></div></div>`;
          const cols = 'grid-template-columns: 44px 110px minmax(200px,2fr) 140px 80px 220px 140px 120px;';
          const opts = [['all', `Semua (${scoped.length})`], ['todo', `Belum didaftarkan (${cnt('todo')})`], ['reg', `Didaftarkan (${cnt('reg')})`], ['closed', `Belum dibuka (${cnt('closed')})`]];
          const cur = S.open ? all.find((x) => x.part.code === S.open) : null;
          const det = cur ? L.dialog(cur.part.name, `<span class="muted sm">${esc(cur.part.code)} · ${esc(cur.part.sub)} · ${esc(cur.part.dc)} · ${esc(L.channelOf(cur.part.channel).name)} · ${chip(cur.part.kind, 'c-grey')} ${chip(META[cur.status][0], META[cur.status][1])}</span>
              <div class="col-f" style="gap:8px"><h3 class="h3" style="font-size:16px">Baseline vs Kelas Terendah</h3><div class="tblbox"><div class="gr" style="display:grid;grid-template-columns:1.1fr 1fr 1fr 1fr 1.2fr"><div class="th">Group brand</div><div class="th">Sell In / bln</div><div class="th">Sell Out / bln</div><div class="th">Min kelas A</div><div class="th">Pencapaian</div>
              ${cur.el.brands.filter((b) => b.best > 0).map((b) => `<div class="td b">${esc(b.g.name)}</div><div class="td">${fr(b.si)}</div><div class="td">${fr(b.so)}</div><div class="td">${fr(b.min)}</div><div class="td" style="flex-direction:column;align-items:stretch;gap:4px"><span class="b">${Math.round(b.ratio)}%</span>${bar(b.ratio)}<span class="muted">kurang ${fr(Math.max(0, b.min - b.best))}</span></div>`).join('')}</div></div>
              <span class="muted xs">Pencapaian = baseline tertinggi (Sell In atau Sell Out) dibagi minimum kelas A. Toko yang didaftarkan masuk kelas A untuk group brand yang di bawah kelas A.</span></div>
              ${cur.status === 'todo' ? `<label class="field lbl">Catatan untuk CBD (opsional)<textarea class="ta" data-k="note" data-inp="note" placeholder="Contoh: toko baru buka, potensi area tinggi, fokus aktivasi Wardah.">${esc(S.note)}</textarea></label>` : ''}
              ${cur.status === 'reg' ? `<div class="note-g" style="font-size:13px"><span><b>Didaftarkan ${L.dateTxt(cur.exc.at)}.</b> Toko sudah diteruskan ke CBD ${esc(cur.part.dc)} untuk diisi target dan rate.${cur.exc.note ? ` Catatan: ${esc(cur.exc.note)}` : ''}</span></div>` : ''}
              ${cur.status === 'closed' ? `<div class="note-grey">Pendaftaran channel ${esc(L.channelOf(cur.part.channel).name)} belum dibuka. Toko bisa didaftarkan setelah channel dibuka.</div>` : ''}`,
            `<button type="button" class="btn btn-s" data-on="closeDlg">Tutup</button>${cur.status === 'todo' ? '<button type="button" class="btn btn-p" data-on="regOne">Daftarkan ke Program</button>' : ''}`, 'w680') : '';
          return `<div class="between" style="align-items:flex-end"><h1 class="title">Toko Exception</h1><label class="lbl field" style="margin:0">Program<select class="inp" style="width:280px" data-chg="prog">${progs.map((x) => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${esc(x.code)} · ${esc(x.name)}</option>`).join('')}</select></label></div>
            <div class="grid-auto"><div class="card pad-s"><span class="lbl up">Toko exception</span><span class="kpi-v">${scoped.length}</span><span class="muted xs">di ${esc(S.dc || 'semua DC')}</span></div>
              <div class="card pad-s"><span class="lbl up">Belum didaftarkan</span><span class="kpi-v" style="color:#304DDE">${cnt('todo')}</span><span class="muted xs">menunggu keputusan Admin HO</span></div>
              <div class="card pad-s"><span class="lbl up">Didaftarkan</span><span class="kpi-v" style="color:#267346">${cnt('reg')}</span><span class="muted xs">diteruskan ke CBD, masuk kelas A</span></div></div>
            ${S.banner ? `<div class="note-g" role="status"><span><b>${S.banner} toko didaftarkan ke ${esc(p.name)}.</b> Group brand di bawah kelas A masuk kelas A dan toko diteruskan ke CBD area masing-masing untuk diisi target dan rate.</span><button type="button" class="btn btn-g" style="color:#1D5935" data-on="hideBanner">Tutup</button></div>` : ''}
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px">
              <div class="between"><div class="seg" role="group" aria-label="Filter status">${opts.map(([k, l]) => `<button type="button" class="${S.f === k ? 'on' : ''}" data-on="f" data-f="${k}">${l}</button>`).join('')}</div>
                <div class="row-f"><input class="inp" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama toko..." style="width:240px" aria-label="Cari toko">
                  <select class="inp" style="width:170px" data-chg="dc" aria-label="Filter DC"><option value="">Semua DC</option>${L.DCS.map((d) => `<option ${S.dc === d ? 'selected' : ''}>${d}</option>`).join('')}</select>
                  <select class="inp" style="width:170px" data-chg="ch" aria-label="Filter channel"><option value="">Semua channel</option>${L.channels(p.id).map((c) => `<option value="${c.channel_code}" ${S.ch === c.channel_code ? 'selected' : ''}>${esc(L.channelOf(c.channel_code).name)}</option>`).join('')}</select>
                  <select class="inp" style="width:150px" data-chg="type" aria-label="Filter tipe toko"><option value="">Semua tipe</option><option ${S.type === 'Single' ? 'selected' : ''}>Single</option><option ${S.type === 'Group' ? 'selected' : ''}>Group</option></select></div></div>
              ${selCodes.length ? `<div class="note-b" style="justify-content:space-between;flex-wrap:wrap;align-items:center"><span><b>${selCodes.length} toko dipilih</b> · group brand di bawah kelas A akan masuk kelas A, lalu diteruskan ke CBD area masing-masing.</span>
                <span class="row-f"><button type="button" class="btn btn-s sm" data-on="clearSel">Batal pilih</button><button type="button" class="btn btn-p sm" data-on="regSel">Daftarkan ke Program</button></span></div>` : ''}
              <div class="tblbox"><div style="min-width:1000px"><div class="gr" style="${cols}"><div class="th"><input type="checkbox" data-chg="all" ${selectable.length && selectable.every((x) => S.sel[x.part.code]) ? 'checked' : ''} ${selectable.length ? '' : 'disabled'} aria-label="Pilih semua"></div>
                <div class="th">Kode</div><div class="th">Toko</div><div class="th">DC · Channel</div><div class="th">Tipe</div><div class="th">Baseline terdekat ke kelas A</div><div class="th">Status</div><div class="th">Aksi</div></div>
                ${vis.map((x) => `<div class="gr" style="${cols}${S.sel[x.part.code] && x.status === 'todo' ? 'background:#F5F7FE;' : ''}"><div class="td"><input type="checkbox" data-chg="sel" data-code="${esc(x.part.code)}" ${S.sel[x.part.code] && x.status === 'todo' ? 'checked' : ''} ${x.status === 'todo' ? '' : 'disabled'} aria-label="Pilih ${esc(x.part.name)}"></div>
                  <div class="td b">${esc(x.part.code)}</div><div class="td c"><b>${esc(x.part.name)}</b><span class="muted">${esc(x.part.sub)}</span></div><div class="td c"><span>${esc(x.part.dc)}</span><span class="muted">${esc(L.channelOf(x.part.channel).name)}</span></div>
                  <div class="td">${chip(x.part.kind, 'c-grey')}</div><div class="td" style="flex-direction:column;align-items:stretch;gap:4px"><div class="between"><b>${esc(x.el.top.g.name)}</b><span>${Math.round(x.el.top.ratio)}%</span></div>${bar(x.el.top.ratio)}<span class="muted">${fr(x.el.top.best)} / min ${fr(x.el.top.min)}</span></div>
                  <div class="td">${chip(META[x.status][0], META[x.status][1])}</div><div class="td"><button type="button" class="btn btn-s sm" data-on="open" data-code="${esc(x.part.code)}">Lihat Detail</button></div></div>`).join('')
                  || '<div class="td muted" style="justify-content:center;padding:24px">Tidak ada toko exception untuk filter ini.</div>'}</div></div></section>${det}`;
        },
        on: {
          prog: (S, el) => { S.prog = Number(el.value); S.sel = {}; }, f: (S, el) => { S.f = el.dataset.f; }, q: (S, el) => { S.q = el.value; return true; },
          dc: (S, el) => { S.dc = el.value; }, type: (S, el) => { S.type = el.value; }, ch: (S, el) => { S.ch = el.value; },
          sel: (S, el) => { S.sel[el.dataset.code] = el.checked; },
          all: (S, el) => { root.querySelectorAll('input[data-chg="sel"]:not(:disabled)').forEach((c) => { S.sel[c.dataset.code] = el.checked; }); },
          clearSel: (S) => { S.sel = {}; },
          open: (S, el) => { S.open = el.dataset.code; S.note = ''; }, closeDlg: (S) => { S.open = null; },
          note: (S, el) => { S.note = el.value; }, hideBanner: (S) => { S.banner = null; },
          regOne: (S) => { register(S, [S.open], S.note); },
          regSel: (S) => { register(S, Object.keys(S.sel).filter((k) => S.sel[k]), ''); },
        },
      });
      function register(S, codes, note) {
        const u = UI.currentUser();
        for (const code of codes) if (!L.exceptionOf(S.prog, code)) DB.insert(L.T.exc, { program_id: S.prog, code, status: 'SUBMITTED', note: note.trim(), by: u.id, at: L.now() });
        DB.save(); S.banner = codes.length; S.sel = {}; S.open = null;
      }
    });
  });

  // ---------------------------------------------------------------- Master Data · Customer Group (CBD)
  route('/customer-group', ({}, q, { user }) => {
    if (!['CBD', 'ADMIN_HO', 'SUPERADMIN'].includes(user.role)) UI.fail('Tidak ada akses');
    const dc = userDc(user);
    return L.page('Customer Group', (root) => {
      L.view(root, {
        state: { dlg: null, q: '' },
        html: (S) => {
          const groups = L.custGroups().filter((g) => !dc || g.dc === dc);
          const locked = (g) => L.regs().some((r) => r.code === g.code && ['IN_APPROVAL', 'DOC_REVIEW'].includes(r.status));
          const hasReg = (g) => L.regs().some((r) => r.code === g.code && r.status !== 'CANCELLED');
          const cols = 'grid-template-columns: 120px minmax(180px,1fr) 140px minmax(280px,2fr) 170px;';
          const d = S.dlg;
          let dlg = '';
          if (d) {
            const free = L.stores().filter((s) => (!dc || s.dc === dc) && (!L.groupOfStore(s.code) || (d.id && L.groupOfStore(s.code).id === d.id)) && (!d.members.length || s.channel === L.store(d.members[0]).channel));
            const qq = d.q.trim().toLowerCase();
            dlg = L.dialog(d.id ? 'Ubah Customer Group' : 'Buat Customer Group', `<div class="g2"><label class="field lbl">Kode<input class="inp" value="${esc(d.code)}" readonly></label><label class="field lbl">Nama group<input class="inp" data-k="gname" data-inp="gname" value="${esc(d.name)}" placeholder="mis. Group Melati"></label></div>
              <div class="field"><div class="between"><span class="lbl">Anggota · ${d.members.length} toko</span><input class="inp sm" style="width:220px" data-k="gq" data-inp="gq" value="${esc(d.q)}" placeholder="Cari toko..."></div>
                <div class="box" style="max-height:280px;overflow-y:auto">${free.filter((s) => !qq || (s.code + ' ' + s.name).toLowerCase().includes(qq)).map((s) => `<label class="ck"><input type="checkbox" data-chg="gm" data-code="${s.code}" ${d.members.includes(s.code) ? 'checked' : ''}><span class="col-f" style="gap:0;flex:1"><b>${esc(s.name)}</b><span class="muted xs">${esc(s.code)} · ${esc(s.address)} · ${esc(L.channelOf(s.channel).name)}</span></span></label>`).join('') || '<div class="ck muted">Tidak ada toko yang bisa dipilih.</div>'}</div>
                <span class="muted xs">Satu toko hanya boleh ada di satu group. Anggota satu group harus dari channel yang sama.</span></div>${d.err ? `<div class="note-r">${esc(d.err)}</div>` : ''}`,
              `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="gSave">Simpan</button>`, 'w680');
          }
          return `<div class="between" style="align-items:flex-end"><div class="col-f" style="gap:6px"><h1 class="title">Customer Group</h1><p class="muted" style="margin:0">Group toko di ${esc(dc || 'semua DC')}. Toko dalam group didaftarkan lewat group-nya.</p></div>
              ${user.role === 'CBD' ? `<button type="button" class="btn btn-p" data-on="new">${L.ico.plus}Buat Customer Group</button>` : ''}</div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px"><div class="tblbox"><div style="min-width:960px"><div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Nama</div><div class="th">DC · Channel</div><div class="th">Anggota</div><div class="th">Aksi</div></div>
              ${groups.map((g) => { const lk = locked(g); const first = L.store(g.members[0]) || {}; return `<div class="gr" style="${cols}"><div class="td b">${esc(g.code)}</div><div class="td c"><b>${esc(g.name)}</b>${lk ? '<span class="muted">Terkunci: pendaftaran sedang diproses</span>' : ''}</div>
                <div class="td c"><span>${esc(g.dc)}</span><span class="muted">${esc(L.channelOf(first.channel).name)}</span></div><div class="td wrap">${g.members.map((c) => chip((L.store(c) || {}).name || c, 'c-grey')).join('')}</div>
                <div class="td">${user.role === 'CBD' ? `<button type="button" class="btn btn-s sm" data-on="edit" data-id="${g.id}" ${lk ? 'disabled' : ''}>Ubah</button>${hasReg(g) ? '' : `<button type="button" class="x" aria-label="Hapus group" data-on="del" data-id="${g.id}">${L.ico.trash}</button>`}` : '<span class="muted xs">Dikelola CBD</span>'}</div></div>`; }).join('')
              || '<div class="td muted" style="justify-content:center;padding:24px">Belum ada customer group.</div>'}</div></div></section>${dlg}`;
        },
        on: {
          new: (S) => { const pre = `G-${({ 'DC Pekanbaru': 'PKU', 'DC Padang': 'PDG', 'DC Medan': 'MDN', 'DC Batam': 'BTM' })[dc] || 'HO'}-`; const n = L.custGroups().filter((g) => g.code.startsWith(pre)).map((g) => Number(g.code.slice(pre.length)) || 0);
            S.dlg = { id: null, code: pre + String((n.length ? Math.max(...n) : 0) + 1).padStart(2, '0'), name: '', members: [], q: '', err: '' }; },
          edit: (S, el) => { const g = L.custGroup(el.dataset.id); S.dlg = { id: g.id, code: g.code, name: g.name, members: g.members.slice(), q: '', err: '' }; },
          del: (S, el) => { if (!confirm('Hapus customer group ini? Toko anggotanya kembali menjadi toko single.')) return false; DB.remove(L.T.groups, (g) => g.id === Number(el.dataset.id)); DB.save(); },
          closeDlg: (S) => { S.dlg = null; },
          gname: (S, el) => { S.dlg.name = el.value; },
          gq: (S, el) => { S.dlg.q = el.value; return true; },
          gm: (S, el) => { const m = S.dlg.members; const c = el.dataset.code; if (el.checked && !m.includes(c)) m.push(c); if (!el.checked) m.splice(m.indexOf(c), 1); },
          gSave: (S) => { const d = S.dlg; if (!d.name.trim()) { d.err = 'Nama group wajib diisi.'; return; } if (d.members.length < 2) { d.err = 'Pilih minimal dua toko.'; return; }
            if (d.id) Object.assign(L.custGroup(d.id), { name: d.name.trim(), members: d.members.slice() });
            else DB.insert(L.T.groups, { code: d.code, name: d.name.trim(), dc: dc || L.store(d.members[0]).dc, members: d.members.slice(), owner_id: user.id, created_at: L.now() });
            DB.save(); S.dlg = null; },
        },
      });
    });
  });
})();
