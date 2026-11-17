// Berkas pendaftaran mengikuti mockup halaman 2 "Pendaftaran: MOU & Review HO":
// Admin Sales DC: Generate MoU → Upload Berkas Toko → (Submit to HO | Revisi to CDT) · Review from HO (revisi dari HO)
// Reviewer (Admin Sales HO / Admin HO): Review Berkas → (Approve → Terdaftar | Revisi to DC) · Histori Review (Cancel Review)
(function () {
  const { route, go, flash } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, fr } = L;
  const X = L.cx; const { ico, tag, modal } = X;
  const DC_ROLES = ['ADMIN_SALES_DC', 'ADMIN_DC', 'SUPERADMIN'];
  const isDc = (u) => DC_ROLES.includes(u.role);
  const isReviewer = (u) => ['ADMIN_SALES_HO', 'ADMIN_HO', 'SUPERADMIN'].includes(u.role);
  const dcOf = (r) => (L.store(r.codes[0]) || {}).dc || '';
  const reviewerOf = (r) => { const ch = L.channel(r.channel_id); return (ch && ch.mou && ch.mou.reviewer) || 'ADMIN_SALES_HO'; };
  const inScope = (u, r) => (u.role === 'SUPERADMIN' || u.role === 'ADMIN_HO' ? true : isDc(u) ? !u.lp_dc || dcOf(r) === u.lp_dc : reviewerOf(r) === u.role);
  const regsOf = (u, status) => L.regs().filter((r) => r.status === status && inScope(u, r));
  const COUNT = { generate: 'MOU_PENDING', upload: 'AWAITING_DOCS', revisi: 'DOC_REVISION', review: 'DOC_REVIEW' };
  L.berkasCount = (u, k) => regsOf(u, COUNT[k]).length;
  const need = (r) => { const ch = L.channel(r.channel_id); return ch ? Math.max(1, ch.mou.docs.filter((d) => d.req).length) : 3; };
  const ket = (r) => { const n = (r.files || []).length; const m = need(r); return n === 0 ? ['Belum Upload', 'err'] : n < m ? ['Kurang', 'warn'] : ['Complete', 'ok']; };
  const lastAt = (r, to) => { const h = (r.history || []).filter((x) => x.to === to); return h.length ? h[h.length - 1].at : r.updated_at; };
  const addrOf = (r) => (r.kind === 'Group' ? `${r.codes.length} toko anggota` : (L.store(r.codes[0]) || {}).address || '');
  const progsWith = (u, statuses) => L.programs().filter((p) => L.regs().some((r) => r.program_id === p.id && statuses.includes(r.status) && inScope(u, r)))
    .concat(L.programs().filter((p) => !L.programClosed(p) && L.channels(p.id).length)).filter((p, i, a) => a.indexOf(p) === i).sort((a, b) => b.period_start.localeCompare(a.period_start));
  const recentComment = (r, u) => (r.comments || []).some((c) => c.by === u.id && c.at >= (r.updated_at || ''));
  function mouNo(r) {
    const p = L.program(r.program_id); const ch = L.channel(r.channel_id); const d = new Date();
    const seq = L.regs().filter((x) => x.program_id === p.id && x.mou_no).length + 401;
    return `LP/${ch.channel_code.split('_')[0]}/${String(d.getMonth() + 1).padStart(2, '0')}/${p.year}/${String(seq).padStart(4, '0')}`;
  }
  function downloadMou(r) {
    const p = L.program(r.program_id); const ch = L.channel(r.channel_id); const { calc } = L.regCalc(r); const tg = calc.filter((c) => c.joined);
    const rows = tg.map((c) => [c.g.name, c.k ? c.k.code : '-', fr(c.annual), ch.settings.semester ? L.fp(c.semV) + '%' : '-', ch.settings.yearly ? L.fp(c.yrV) + '%' : '-', L.FR(p) ? L.fp(c.frV) + '%' : '-']);
    const st = L.store(r.codes[0]) || {}; const u = DB.byId('users', r.created_by);
    const html = `<html><head><meta charset="utf-8"></head><body>${L.mouPreview(p, ch, true, { program: p.name.toUpperCase(), number: r.mou_no, date: L.dateTxt(r.mou_at || r.updated_at), store: r.name, code: r.code, address: st.address || '', rows, fr: '-', signer: '(nama pemilik toko)', cbd: (u ? u.name : 'CBD') + ' (CBD)' })}</body></html>`;
    UI.download(`${r.mou_no.replace(/\//g, '-')}.doc`, html, 'application/msword');
  }
  L.downloadMou = downloadMou;

  // ---------------------------------------------------------------- kerangka halaman daftar berkas
  const headHtml = (title, desc, progs, S) => `<div class="cx-pagehead"><div class="cx-col" style="gap:6px;max-width:720px"><h1 class="t-h3" style="font-size:28px;line-height:36px">${title}</h1><span class="t-body" style="color:#445560">${desc}</span></div>
    <label class="cx-field" style="width:280px"><span class="t-sm-b">Program</span><select class="cx-in" data-chg="prog">${progs.map((p) => `<option value="${p.id}" ${p.id === S.prog ? 'selected' : ''}>${esc(p.code)} · ${esc(p.name)}</option>`).join('')}</select></label></div>`;
  const filters = (S, list, dcs) => `<div class="cx-between"><div class="cx-seg" role="group" aria-label="Tipe customer">${['Single', 'Group'].map((k) => `<button type="button" class="${S.kind === k ? 'on' : ''}" data-on="kind" data-v="${k}">${k} (${list.filter((r) => r.kind === k).length})</button>`).join('')}</div>
    <div class="cx-row"><div class="cx-search"><input class="cx-in" style="width:230px;height:40px" type="search" data-k="q" data-inp="q" value="${esc(S.q)}" placeholder="Cari kode atau nama..." aria-label="Cari customer"></div>
      <select class="cx-in" style="width:180px;height:40px" data-chg="dc" aria-label="Filter DC"><option value="">Semua DC (${dcs.length})</option>${dcs.map((d) => `<option ${S.dc === d ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div></div>`;
  const applyFilter = (S, list) => { const q = S.q.trim().toLowerCase(); return list.filter((r) => r.kind === S.kind && (!S.dc || dcOf(r) === S.dc) && (!q || (r.code + ' ' + r.name).toLowerCase().includes(q))); };
  const custCell = (r) => `<td class="top"><div class="t-strong">${esc(r.name)}</div><div class="t-sm">${esc(addrOf(r))}</div>${r.mou_no ? `<div class="t-sm">No. MoU ${esc(r.mou_no)}</div>` : ''}</td>`;
  const filesCell = (r, canDel) => `<td class="top">${(r.files || []).length ? `<div class="cx-col" style="gap:6px">${r.files.map((f, i) => `<span class="cx-row" style="gap:6px;flex-wrap:nowrap">${canDel ? `<button type="button" class="cx-icon-btn" style="color:#E6001C;padding:2px" aria-label="Hapus ${esc(f.name)}" data-on="fileDel" data-id="${r.id}" data-i="${i}">${ico.trash}</button>` : ico.file}<a class="cx-file" href="javascript:;" title="Diunggah ${X.dt(f.at)} oleh ${esc(f.by)}">${esc(f.name)}</a></span>`).join('')}</div>` : '<span class="t-sm">Belum ada berkas</span>'}</td>`;
  const ketCell = (r, extra = '') => { const [l, k] = ket(r); return `<td class="top"><div class="cx-col" style="gap:4px">${tag(l, k + ' plain')}<span class="t-sm">${(r.files || []).length} berkas</span>${extra}</div></td>`; };
  const cmtBtn = (r) => `<button type="button" class="cx-btn cx-s sm" style="height:32px;border-color:#304DDE;color:#304DDE !important" data-on="openCmt" data-id="${r.id}" aria-label="Komentar ${esc(r.name)}">${ico.chat}${(r.comments || []).length}</button>`;
  const apprSel = (S, r, opts) => `<select class="cx-in md" style="width:150px" data-chg="appr" data-id="${r.id}" aria-label="Approval ${esc(r.name)}"><option value="">Pilih status...</option>${opts.map(([v, l]) => `<option value="${v}" ${S.appr[r.id] === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;

  // modal komentar (histori sejak pendaftaran)
  function cmtModal(S) {
    const r = L.reg(S.cmt); const cs = r.comments || [];
    const hist = (r.history || []).filter((h) => h.note && ['RETURNED', 'DOC_REVISION'].includes(h.to)).map((h) => ({ at: h.at, name: (DB.byId('users', h.by) || {}).name || 'Sistem', role: '', text: h.note }));
    const all = cs.concat(hist.filter((h) => !cs.some((c) => c.at === h.at))).sort((a, b) => a.at.localeCompare(b.at));
    return modal(`Komentar · ${r.name}`, `<div class="cx-col" style="gap:0">${all.map((c) => `<div class="cx-col" style="gap:2px;padding:10px 0;border-top:1px solid #EBEBEB"><div class="cx-between" style="flex-wrap:nowrap"><span class="t-strong">${esc(c.name)}${c.role ? ` <span class="t-sm">· ${esc(UI.h.ROLE_LABEL[c.role] || c.role)}</span>` : ''}</span><span class="t-sm">${X.dt(c.at)}</span></div><span class="t-body">${esc(c.text)}</span></div>`).join('') || '<span class="t-sm">Belum ada komentar.</span>'}</div>
      <label class="cx-field"><span class="cx-label">Komentar baru</span><textarea class="cx-in" data-k="cmtTxt" data-inp="cmtTxt" placeholder="Tulis komentar…">${esc(S.cmtTxt)}</textarea><span class="cx-help">Komentar wajib diisi sebelum memilih Revisi.</span></label>`,
      `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Tutup</button><button type="button" class="cx-btn cx-p" data-on="cmtSend" ${S.cmtTxt.trim() ? '' : 'disabled'}>Kirim Komentar</button>`, 'l');
  }
  // modal unggah berkas (ZIP/JPG/PNG/PDF, maks 5 MB)
  function upModal(S) {
    const r = L.reg(S.up); const has = (r.files || []).length;
    return modal(`Upload Berkas · ${r.name}`, `<span class="t-body">Unggah KTP, NPWP, dan MoU yang sudah ditandatangani. Minimal ${need(r)} berkas.</span>
      <label class="cx-drop" data-drop="1"><span class="t-strong">${ico.upload} Tarik berkas ke sini atau klik untuk memilih</span><span class="t-sm">ZIP, JPG, PNG, atau PDF · maks 5 MB per berkas</span><input type="file" multiple accept=".zip,.jpg,.jpeg,.png,.pdf" data-chg="upPick" style="max-width:240px"></label>
      ${S.upErr ? `<span class="cx-err">${esc(S.upErr)}</span>` : ''}
      ${S.upNew.length ? `<div class="cx-col" style="gap:6px"><span class="t-sm-b">${S.upNew.length} berkas dipilih</span>${S.upNew.map((f) => `<span class="cx-file">${ico.file}${esc(f)}</span>`).join('')}</div>` : ''}
      ${S.upNew.length && has ? `<div class="cx-alert warn"><span class="ic">!</span><div class="cx-col" style="gap:8px"><b>Ganti berkas lama?</b><span>Toko ini sudah punya ${has} berkas.</span>
        <label class="cx-check"><input type="radio" name="upmode" data-chg="upMode" value="add" ${S.upMode === 'add' ? 'checked' : ''}>Tambahkan ke berkas lama</label>
        <label class="cx-check"><input type="radio" name="upmode" data-chg="upMode" value="replace" ${S.upMode === 'replace' ? 'checked' : ''}>Ganti semua berkas lama</label></div></div>` : ''}`,
      `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="upSave" ${S.upNew.length ? '' : 'disabled'}>Simpan Berkas</button>`);
  }
  const commonOn = (user) => ({
    prog: (S, el) => { S.prog = Number(el.value); S.sel = {}; S.appr = {}; },
    kind: (S, el) => { S.kind = el.dataset.v; S.sel = {}; },
    q: (S, el) => { S.q = el.value; return true; }, dc: (S, el) => { S.dc = el.value; },
    sel: (S, el) => { S.sel[el.dataset.id] = el.checked; },
    selAll: (S, el, ev) => { ev.target.closest('.cx-card').querySelectorAll('input[data-chg="sel"]:not(:disabled)').forEach((c) => { S.sel[c.dataset.id] = el.checked; }); },
    appr: (S, el) => { S.appr[el.dataset.id] = el.value; },
    bulk: (S, el) => { S.bulk = el.value; Object.keys(S.sel).filter((k) => S.sel[k]).forEach((k) => { S.appr[k] = el.value; }); },
    openCmt: (S, el) => { S.cmt = Number(el.dataset.id); S.cmtTxt = ''; },
    cmtTxt: (S, el) => { const was = !!S.cmtTxt.trim(); S.cmtTxt = el.value; return was !== !!el.value.trim(); },
    cmtSend: (S) => { const r = L.reg(S.cmt); L.addComment(r, S.cmtTxt.trim()); DB.save(); S.cmtTxt = ''; },
    openUp: (S, el) => { S.up = Number(el.dataset.id); S.upNew = []; S.upErr = ''; S.upMode = 'add'; },
    upPick: (S, el) => { const fs = Array.from(el.files || []); S.upErr = '';
      const bad = fs.filter((f) => !/\.(zip|jpe?g|png|pdf)$/i.test(f.name) || f.size > 5 * 1024 * 1024);
      if (bad.length) S.upErr = `${bad.map((f) => f.name).join(', ')}: format harus ZIP/JPG/PNG/PDF dan maks 5 MB.`;
      S.upNew = S.upNew.concat(fs.filter((f) => !bad.includes(f)).map((f) => f.name)); },
    upMode: (S, el) => { S.upMode = el.value; },
    upSave: (S) => { const r = L.reg(S.up); const add = S.upNew.map((name) => ({ name, at: L.now(), by: user.name }));
      r.files = S.upMode === 'replace' ? add : (r.files || []).concat(add); DB.save(); flash('success', `${add.length} berkas ${esc(r.name)} diunggah.`); S.up = null; },
    fileDel: (S, el) => { const r = L.reg(el.dataset.id); const f = r.files[Number(el.dataset.i)]; if (!confirm(`Hapus berkas ${f.name}?`)) return false; r.files.splice(Number(el.dataset.i), 1); DB.save(); },
    closeDlg: (S) => { S.cmt = null; S.up = null; S.dlg = null; },
  });
  const baseState = (progs, q) => ({ prog: Number(q.program) || (progs[0] || {}).id, kind: 'Single', q: '', dc: '', sel: {}, appr: {}, bulk: '', cmt: null, cmtTxt: '', up: null, upNew: [], upErr: '', upMode: 'add', err: '', tab: 'todo', dlg: null });
  // drag & drop ke kotak unggah
  const dropHook = (root, v) => {
    root.addEventListener('dragover', (e) => { if (e.target.closest('[data-drop]')) e.preventDefault(); });
    root.addEventListener('drop', (e) => { const z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); const inp = z.querySelector('input[type=file]'); if (!inp) return;
      const fake = { files: e.dataTransfer.files }; v.opts.on.upPick(v.state, fake); v.paint(); });
  };
  function view(root, opts) { const v = L.view(root, opts); v.opts = opts; dropHook(root, v); return v; }

  // ---------------------------------------------------------------- Generate MoU (Admin Sales DC)
  route('/berkas/generate', ({}, q, { user }) => {
    if (!isDc(user)) UI.fail('Tidak ada akses', 'Generate MoU untuk Admin Sales DC.');
    const progs = progsWith(user, ['MOU_PENDING']);
    return X.page('Generate MoU', (root) => {
      view(root, {
        state: baseState(progs, q),
        html: (S) => {
          const p = L.program(S.prog); if (!p) return '<div class="cx-card"><span class="t-sm">Belum ada program aktif.</span></div>';
          const todo = regsOf(user, 'MOU_PENDING').filter((r) => r.program_id === p.id);
          const hist = L.regs().filter((r) => r.program_id === p.id && r.mou_no && r.mou_at && inScope(user, r)).sort((a, b) => b.mou_at.localeCompare(a.mou_at));
          const list = S.tab === 'todo' ? todo : hist;
          const rows = applyFilter(S, list); const dcs = [...new Set(list.map(dcOf))].filter(Boolean).sort();
          const sel = rows.filter((r) => S.sel[r.id]);
          const calcOf = (r) => L.regCalc(r).calc.filter((c) => c.joined);
          const appr = (r) => { const s = (r.route || []).filter((x) => x.decision === 'APPROVED').pop(); return s ? [L.dateTxt(s.at), L.ROLES[s.role] || s.role] : [L.dateTxt(lastAt(r, 'MOU_PENDING')), 'Tanpa layer approval']; };
          const tbl = S.tab === 'todo' ? `<div class="cx-soft cx-between" style="flex-direction:row;padding:12px 16px"><span class="t-body">${sel.length ? `${sel.length} toko dipilih.` : 'Centang toko yang MoU-nya akan di-generate.'}</span><button type="button" class="cx-btn cx-s" data-on="gen" ${sel.length ? '' : 'disabled'}>${ico.doc}Generate MoU</button></div>
              <div class="cx-table"><table><thead><tr><th style="width:40px"><input type="checkbox" data-chg="selAll" aria-label="Pilih semua" ${rows.length && rows.every((r) => S.sel[r.id]) ? 'checked' : ''}></th><th>Customer ID</th><th>Customer</th><th>DC</th><th>Group brand · Tagging</th><th class="num">Total target / tahun</th><th>Disetujui</th><th>Siap generate</th></tr></thead><tbody>
              ${rows.map((r) => { const cs = calcOf(r); const [d, by] = appr(r); return `<tr class="${S.sel[r.id] ? 'sel' : ''}"><td class="top"><input type="checkbox" data-chg="sel" data-id="${r.id}" ${S.sel[r.id] ? 'checked' : ''} aria-label="Pilih ${esc(r.name)}"></td><td class="top t-strong" style="white-space:nowrap">${esc(r.code)}</td>${custCell(r)}<td class="top">${esc(dcOf(r))}</td>
                <td class="top"><div class="cx-col" style="gap:4px">${cs.map((c) => `<span class="cx-row" style="gap:6px">${esc(c.g.name)}${tag(c.tag, 'plain')}</span>`).join('')}</div></td><td class="top num t-strong">${fr(cs.reduce((a, c) => a + c.annual, 0))}</td>
                <td class="top"><div>${d}</div><div class="t-sm">${esc(by)}</div></td><td class="top">${tag('Siap', 'ok plain')}</td></tr>`; }).join('') || '<tr><td colspan="8" class="t-sm" style="text-align:center;padding:24px">Tidak ada toko yang perlu di-generate.</td></tr>'}</tbody></table></div>`
            : `<div class="cx-table"><table><thead><tr><th>Customer ID</th><th>Customer</th><th>DC</th><th>No. MoU</th><th>Di-generate</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
              ${rows.map((r) => { const m = L.REG_STATUS[r.status]; return `<tr><td class="t-strong">${esc(r.code)}</td><td><div class="t-strong">${esc(r.name)}</div><div class="t-sm">${esc(addrOf(r))}</div></td><td>${esc(dcOf(r))}</td><td>${esc(r.mou_no)}</td><td><div>${X.dt(r.mou_at)}</div><div class="t-sm">${esc(r.mou_by || '')}</div></td>
                <td>${tag(m[0], { 'c-green': 'ok', 'c-yellow': 'warn', 'c-red': 'err' }[m[1]] || '')}</td><td><button type="button" class="cx-btn cx-s sm" data-on="dl" data-id="${r.id}">Unduh ulang</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="t-sm" style="text-align:center;padding:24px">Belum ada MoU yang di-generate.</td></tr>'}</tbody></table></div>`;
          return `${headHtml('Generate MoU', 'Toko yang sudah disetujui di layer approval. Pilih toko, lalu generate MoU untuk dicetak dan ditandatangani. Setelah di-generate, toko pindah ke Upload Berkas Toko.', progs, S)}
            <div class="cx-alert info"><span class="ic">i</span><div>Hindari generate MoU pukul <b style="display:inline">02.00–07.00</b> karena data sedang diperbarui. Jika ada data yang tidak terambil di luar jam tersebut, laporkan ke servicedesk.</div></div>
            <section class="cx-card"><div class="cx-tabs" role="tablist"><button type="button" role="tab" class="cx-tab sm ${S.tab === 'todo' ? 'on' : ''}" style="padding:10px 4px;margin-right:16px" data-on="tab" data-v="todo">Perlu Generate (${todo.length})</button><button type="button" role="tab" class="cx-tab sm ${S.tab === 'hist' ? 'on' : ''}" style="padding:10px 4px" data-on="tab" data-v="hist">Histori (${hist.length})</button></div>
              ${filters(S, list, dcs)}${tbl}</section>
            ${S.dlg === 'gen' ? modal('Generate MoU?', `<span class="t-body">MoU untuk ${sel.length} toko dibuat dari template MOU aktif tiap channel dan diberi nomor otomatis. Toko pindah ke Upload Berkas Toko.</span>
              <div class="cx-soft">${sel.map((r) => `<span class="t-body">${esc(r.code)} · ${esc(r.name)}</span>`).join('')}</div>`, '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="genGo">Generate MoU</button>') : ''}`;
        },
        on: Object.assign(commonOn(user), {
          tab: (S, el) => { S.tab = el.dataset.v; S.sel = {}; },
          gen: (S) => { S.dlg = 'gen'; },
          genGo: (S) => {
            const list = regsOf(user, 'MOU_PENDING').filter((r) => r.program_id === S.prog && S.sel[r.id]);
            for (const r of list) { const ch = L.channel(r.channel_id); const last = ch.mou.revisions[ch.mou.revisions.length - 1];
              r.mou_no = mouNo(r); r.mou_rev = last ? last.no : null; r.mou_at = L.now(); r.mou_by = user.name; r.files = r.files || [];
              L.setStatus(r, 'AWAITING_DOCS', `MoU ${r.mou_no} di-generate dari template revisi ${r.mou_rev || '-'}`, user.id); }
            DB.save(); flash('success', `${list.length} MoU di-generate. Toko pindah ke Upload Berkas Toko.`); S.sel = {}; S.dlg = null; UI.render(); return false;
          },
          dl: (S, el) => { downloadMou(L.reg(el.dataset.id)); return false; },
        }),
      });
    });
  });

  // ---------------------------------------------------------------- Upload Berkas Toko & Review from HO (Admin Sales DC)
  function dcFilesPage(user, q, kind) {
    const status = kind === 'upload' ? 'AWAITING_DOCS' : 'DOC_REVISION';
    const progs = progsWith(user, [status]);
    const title = kind === 'upload' ? 'Upload Berkas Toko' : 'Review from HO';
    return X.page(title, (root) => {
      view(root, {
        state: baseState(progs, q),
        html: (S) => {
          const p = L.program(S.prog); if (!p) return '<div class="cx-card"><span class="t-sm">Belum ada program aktif.</span></div>';
          const list = regsOf(user, status).filter((r) => r.program_id === p.id);
          const rows = applyFilter(S, list); const dcs = [...new Set(list.map(dcOf))].filter(Boolean).sort();
          const opts = [['SUBMIT', 'Submit to HO'], ['CDT', 'Revisi to CDT']];
          const nSet = rows.filter((r) => S.appr[r.id]).length;
          const revNote = (r) => { const h = (r.history || []).filter((x) => x.to === 'DOC_REVISION').pop(); return h ? `<span class="t-sm" style="color:#8A0011">Revisi dari HO · ${L.dateTxt(h.at)}${h.note ? `: ${esc(h.note)}` : ''}</span>` : ''; };
          return `${headHtml(title, kind === 'upload' ? 'Toko yang MoU-nya sudah di-generate. Unggah KTP, NPWP dan MoU yang sudah ditandatangani, lalu Submit to HO untuk direview. Pilih Revisi to CDT jika target perlu diubah.'
              : 'Berkas yang dikembalikan reviewer HO. Perbaiki berkas sesuai komentar, lalu Submit to HO lagi. Pilih Revisi to CDT jika target perlu diubah.', progs, S)}
            ${S.err ? `<div class="cx-alert err"><span class="ic">!</span><div><b>Belum bisa diproses</b>${esc(S.err)}</div></div>` : ''}
            <section class="cx-card">${filters(S, list, dcs)}
              <div class="cx-soft cx-between" style="flex-direction:row;padding:12px 16px"><span class="t-body">Centang toko dan pilih status approval, lalu klik Update.</span>
                <div class="cx-row" style="flex-wrap:nowrap"><select class="cx-in md" style="width:200px" data-chg="bulk" aria-label="Set approval terpilih"><option value="">Set approval terpilih...</option>${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
                  <button type="button" class="cx-btn cx-p" data-on="update" ${nSet ? '' : 'disabled'}>Update</button></div></div>
              <div class="cx-table"><table><thead><tr><th style="width:40px"><input type="checkbox" data-chg="selAll" aria-label="Pilih semua"></th><th>Customer ID</th><th>Customer</th><th>DC</th><th>Berkas diupload (KTP, NPWP, MoU)</th><th>Keterangan</th><th>Upload</th><th>Komentar</th><th>Approval</th></tr></thead><tbody>
                ${rows.map((r) => { const done = ket(r)[1] === 'ok'; return `<tr class="${S.sel[r.id] ? 'sel' : ''}"><td class="top"><input type="checkbox" data-chg="sel" data-id="${r.id}" ${S.sel[r.id] ? 'checked' : ''} aria-label="Pilih ${esc(r.name)}"></td><td class="top t-strong" style="white-space:nowrap">${esc(r.code)}</td>${custCell(r)}
                  <td class="top">${esc(dcOf(r))}</td>${filesCell(r, true)}${ketCell(r, kind === 'revisi' ? revNote(r) : '')}
                  <td class="top"><button type="button" class="cx-btn ${done ? 'cx-s' : 'cx-p'} sm" style="height:32px;${done ? 'border-color:#304DDE;color:#304DDE !important' : ''}" data-on="openUp" data-id="${r.id}">${ico.upload}Upload</button>
                    <div style="margin-top:6px"><button type="button" class="cx-link" style="font-size:12px" data-on="dl" data-id="${r.id}">Unduh MoU</button></div></td>
                  <td class="top">${cmtBtn(r)}</td><td class="top">${apprSel(S, r, opts)}</td></tr>`; }).join('') || `<tr><td colspan="9" class="t-sm" style="text-align:center;padding:24px">${kind === 'upload' ? 'Tidak ada toko yang menunggu berkas.' : 'Tidak ada revisi dari HO.'}</td></tr>`}</tbody></table></div>
              <span class="t-sm">Keterangan Complete jika jumlah berkas memenuhi dokumen wajib channel (KTP, NPWP, MoU bertanda tangan). Submit to HO → Review Berkas oleh reviewer HO. Revisi to CDT → CDT merevisi target, lalu toko kembali ke approval.</span></section>
            ${S.cmt ? cmtModal(S) : ''}${S.up ? upModal(S) : ''}`;
        },
        on: Object.assign(commonOn(user), {
          dl: (S, el) => { downloadMou(L.reg(el.dataset.id)); return false; },
          update: (S) => {
            const list = regsOf(user, status).filter((r) => r.program_id === S.prog && S.appr[r.id]);
            const incomplete = list.filter((r) => S.appr[r.id] === 'SUBMIT' && ket(r)[1] !== 'ok');
            const noCmt = list.filter((r) => S.appr[r.id] === 'CDT' && !recentComment(r, user));
            S.err = [incomplete.length && `Terdapat customer yang belum upload berkas lengkap: ${incomplete.map((r) => r.name).join(', ')}.`, noCmt.length && `Isi komentar sebelum Revisi to CDT: ${noCmt.map((r) => r.name).join(', ')}.`].filter(Boolean).join(' ');
            if (S.err) { window.scrollTo(0, 0); return; }
            let a = 0, b = 0;
            for (const r of list) {
              if (S.appr[r.id] === 'SUBMIT') { L.setStatus(r, 'DOC_REVIEW', 'Submit to HO', user.id); a++; }
              else { const c = (r.comments || []).filter((x) => x.by === user.id).pop(); r.dc_return = { by: user.id, role: user.role, at: L.now(), note: c ? c.text : '' }; r.route = [];
                L.setStatus(r, 'RETURNED', c ? c.text : 'Revisi to CDT', user.id); b++; }
            }
            DB.save(); flash('success', [a && `${a} toko dikirim ke HO untuk direview.`, b && `${b} toko dikembalikan ke CDT untuk revisi target.`].filter(Boolean).join(' ')); S.appr = {}; S.sel = {}; UI.render(); return false;
          },
        }),
      });
    });
  }
  route('/berkas/upload', ({}, q, { user }) => { if (!isDc(user)) UI.fail('Tidak ada akses', 'Upload Berkas Toko untuk Admin Sales DC.'); return dcFilesPage(user, q, 'upload'); });
  route('/berkas/revisi', ({}, q, { user }) => { if (!isDc(user)) UI.fail('Tidak ada akses', 'Review from HO untuk Admin Sales DC.'); return dcFilesPage(user, q, 'revisi'); });

  // ---------------------------------------------------------------- Review Berkas & Histori Review (Admin Sales HO / Admin HO)
  route('/berkas/review', ({}, q, { user }) => {
    if (!isReviewer(user)) UI.fail('Tidak ada akses', 'Review Berkas untuk Admin Sales HO dan Admin HO.');
    const progs = progsWith(user, ['DOC_REVIEW']);
    return X.page('Review Berkas', (root) => {
      view(root, {
        state: baseState(progs, q),
        html: (S) => {
          const p = L.program(S.prog); if (!p) return '<div class="cx-card"><span class="t-sm">Belum ada program aktif.</span></div>';
          const todo = regsOf(user, 'DOC_REVIEW').filter((r) => r.program_id === p.id);
          const hist = L.regs().filter((r) => r.program_id === p.id && inScope(user, r) && (r.reviews || []).length).sort((a, b) => b.reviews[b.reviews.length - 1].at.localeCompare(a.reviews[a.reviews.length - 1].at));
          const list = S.tab === 'todo' ? todo : hist;
          const rows = applyFilter(S, list); const dcs = [...new Set(list.map(dcOf))].filter(Boolean).sort();
          const opts = [['APPROVE', 'Approve'], ['DC', 'Revisi to DC']];
          const nSet = rows.filter((r) => S.appr[r.id]).length;
          const body = S.tab === 'todo' ? `<div class="cx-soft cx-between" style="flex-direction:row;padding:12px 16px"><span class="t-body">Centang toko dan pilih status approval, lalu klik Update.</span>
                <div class="cx-row" style="flex-wrap:nowrap"><select class="cx-in md" style="width:200px" data-chg="bulk" aria-label="Set keputusan terpilih"><option value="">Set keputusan terpilih...</option>${opts.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
                  <button type="button" class="cx-btn cx-p" data-on="update" ${nSet ? '' : 'disabled'}>Update</button></div></div>
              <div class="cx-table"><table><thead><tr><th style="width:40px"><input type="checkbox" data-chg="selAll" aria-label="Pilih semua"></th><th>Customer ID</th><th>Customer</th><th>DC</th><th>Berkas diupload (KTP, NPWP, MoU)</th><th>Keterangan</th><th>Komentar</th><th>Approval</th></tr></thead><tbody>
                ${rows.map((r) => `<tr class="${S.sel[r.id] ? 'sel' : ''}"><td class="top"><input type="checkbox" data-chg="sel" data-id="${r.id}" ${S.sel[r.id] ? 'checked' : ''} aria-label="Pilih ${esc(r.name)}"></td><td class="top t-strong" style="white-space:nowrap"><a href="#/approval/${r.id}" style="color:inherit">${esc(r.code)}</a></td>${custCell(r)}
                  <td class="top"><div>${esc(dcOf(r))}</div><div class="t-sm">Dikirim ${L.dateTxt(lastAt(r, 'DOC_REVIEW'))}</div></td>${filesCell(r, false)}${ketCell(r)}<td class="top">${cmtBtn(r)}</td><td class="top">${apprSel(S, r, opts)}</td></tr>`).join('')
                  || '<tr><td colspan="8" class="t-sm" style="text-align:center;padding:24px">Tidak ada berkas yang menunggu review.</td></tr>'}</tbody></table></div>
              <span class="t-sm">Keterangan Complete jika jumlah berkas memenuhi dokumen wajib channel (KTP, NPWP, MoU). Approve → toko terdaftar dan masuk gerbang pencairan. Revisi to DC → kembali ke Admin Sales DC di menu Review from HO.</span>`
            : `<div class="cx-table"><table><thead><tr><th>Customer ID</th><th>Customer</th><th>DC</th><th>Keputusan</th><th>Direview</th><th>Status sekarang</th><th>Aksi</th></tr></thead><tbody>
                ${rows.map((r) => { const v = r.reviews[r.reviews.length - 1]; const can = (v.decision === 'APPROVE' && r.status === 'REGISTERED') || (v.decision === 'DC' && r.status === 'DOC_REVISION'); const m = L.REG_STATUS[r.status];
                  return `<tr><td class="t-strong">${esc(r.code)}</td><td><div class="t-strong">${esc(r.name)}</div><div class="t-sm">No. MoU ${esc(r.mou_no || '—')}</div></td><td>${esc(dcOf(r))}</td>
                  <td>${v.decision === 'APPROVE' ? tag('Approve', 'ok') : tag('Revisi to DC', 'err')}${v.note ? `<div class="t-sm" style="margin-top:4px">${esc(v.note)}</div>` : ''}</td><td><div>${X.dt(v.at)}</div><div class="t-sm">${esc(v.name)}</div></td>
                  <td>${tag(m[0], { 'c-green': 'ok', 'c-yellow': 'warn', 'c-red': 'err' }[m[1]] || '')}</td><td><button type="button" class="cx-btn cx-danger sm" data-on="askUndo" data-id="${r.id}" ${can ? '' : 'disabled title="Sudah diproses lebih lanjut"'}>Cancel Review</button></td></tr>`; }).join('')
                  || '<tr><td colspan="7" class="t-sm" style="text-align:center;padding:24px">Belum ada histori review.</td></tr>'}</tbody></table></div>
              <span class="t-sm">Cancel Review mengembalikan toko ke Review Berkas. Hanya bisa selama toko belum diproses lebih lanjut.</span>`;
          const undo = S.dlg && S.dlg.undo ? L.reg(S.dlg.undo) : null;
          return `${headHtml('Review Berkas', 'Berkas toko (KTP, NPWP, MoU bertanda tangan) yang dikirim Admin Sales DC. Approve untuk lanjut ke gerbang pencairan, atau Revisi to DC agar berkas diunggah ulang.', progs, S)}
            ${S.err ? `<div class="cx-alert err"><span class="ic">!</span><div><b>Belum bisa diproses</b>${esc(S.err)}</div></div>` : ''}
            <section class="cx-card"><div class="cx-tabs" role="tablist"><button type="button" role="tab" class="cx-tab sm ${S.tab === 'todo' ? 'on' : ''}" style="padding:10px 4px;margin-right:16px" data-on="tab" data-v="todo">Review Berkas (${todo.length})</button><button type="button" role="tab" class="cx-tab sm ${S.tab === 'hist' ? 'on' : ''}" style="padding:10px 4px" data-on="tab" data-v="hist">Histori Review (${hist.length})</button></div>
              ${filters(S, list, dcs)}${body}</section>
            ${S.cmt ? cmtModal(S) : ''}
            ${undo ? modal('Cancel Review?', `<span class="t-body">Keputusan review ${esc(undo.name)} dibatalkan dan toko kembali ke Review Berkas.</span>`, '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Kembali</button><button type="button" class="cx-btn cx-danger-p" data-on="undo">Cancel Review</button>') : ''}`;
        },
        on: Object.assign(commonOn(user), {
          tab: (S, el) => { S.tab = el.dataset.v; S.sel = {}; S.err = ''; },
          update: (S) => {
            const list = regsOf(user, 'DOC_REVIEW').filter((r) => r.program_id === S.prog && S.appr[r.id]);
            const noCmt = list.filter((r) => S.appr[r.id] === 'DC' && !recentComment(r, user));
            S.err = noCmt.length ? `Isi komentar sebelum Revisi to DC: ${noCmt.map((r) => r.name).join(', ')}.` : '';
            if (S.err) { window.scrollTo(0, 0); return; }
            let a = 0, b = 0;
            for (const r of list) {
              const ok = S.appr[r.id] === 'APPROVE'; const c = (r.comments || []).filter((x) => x.by === user.id).pop();
              r.reviews = r.reviews || []; r.reviews.push({ decision: ok ? 'APPROVE' : 'DC', at: L.now(), by: user.id, name: user.name, note: ok ? '' : (c ? c.text : '') });
              if (ok) { L.setStatus(r, 'REGISTERED', 'Berkas di-approve', user.id); a++; } else { L.setStatus(r, 'DOC_REVISION', c ? c.text : 'Revisi to DC', user.id); b++; }
            }
            DB.save(); flash('success', [a && `${a} toko di-approve dan terdaftar.`, b && `${b} toko dikembalikan ke Admin Sales DC.`].filter(Boolean).join(' ')); S.appr = {}; S.sel = {}; UI.render(); return false;
          },
          askUndo: (S, el) => { S.dlg = { undo: Number(el.dataset.id) }; },
          undo: (S) => { const r = L.reg(S.dlg.undo); r.reviews.pop(); L.setStatus(r, 'DOC_REVIEW', 'Cancel Review', user.id); DB.save(); flash('success', `Review ${esc(r.name)} dibatalkan. Toko kembali ke Review Berkas.`); S.dlg = null; },
        }),
      });
    });
  });

  // rute lama (alur dokumen sebelumnya) diarahkan ke halaman baru
  route('/dokumen', () => UI.redirect('/berkas/upload'));
  route('/dokumen/:id', () => UI.redirect('/berkas/upload'));
  route('/pendaftaran/dokumen/:id', () => UI.redirect('/berkas/review'));
})();
