// Pendaftaran mengikuti mockup layar 16–18 + alur spesifikasi v2.5:
// Daftar Toko (CBD) · Form Pendaftaran · Approval (Setujui / Kembalikan) · MOU & dokumen · Toko Exception (Admin HO) · Customer Group (CBD)
// Setelah approval selesai: Generate MoU, Upload Berkas, dan Review Berkas ada di lp-docs.js (Admin Sales DC / reviewer HO)
(function () {
  const { route, go, flash } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, chip, sw, fp, fj, fr, pnum, rpNum } = L;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const isHo = (u) => ['ADMIN_HO', 'SUPERADMIN'].includes(u.role);
  const userDc = (u) => (u.role === 'CBD' ? u.lp_dc || null : null);
  const chOf = (p, code) => L.channels(p.id).find((c) => c.channel_code === code);
  const MO = L.MONTHS;
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
    if (r.status === 'RETURNED') { if (r.dc_return) return `Dikembalikan Admin Sales DC: ${r.dc_return.note}`; const s = r.route.find((x) => x.decision === 'RETURNED'); return s ? `Dikembalikan ${L.ROLES[s.role] || s.role}: ${s.comment}` : 'Dikembalikan'; }
    if (r.status === 'MOU_PENDING') return 'Menunggu Admin Sales DC generate MoU';
    if (r.status === 'AWAITING_DOCS') return `MoU ${r.mou_no || ''} · menunggu berkas dari Admin Sales DC`;
    if (r.status === 'DOC_REVIEW') return 'Berkas sedang direview HO';
    if (r.status === 'DOC_REVISION') return 'Berkas dikembalikan HO ke Admin Sales DC';
    if (r.status === 'REGISTERED') return `Terdaftar ${L.dateTxt(r.updated_at)}`;
    return '';
  }

  // ---------------------------------------------------------------- 16 · Daftar Toko
  route('/pendaftaran', ({}, q, { user }) => {
    if (!['CBD', 'ADMIN_HO', 'SUPERADMIN'].includes(user.role)) UI.fail('Tidak ada akses', 'Daftar Toko untuk CBD dan Admin HO.');
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
            const [label, cls] = { NEW: ['Daftarkan', 'btn-p'], DRAFT: ['Lanjutkan', 'btn-o'], RETURNED: ['Perbaiki', 'btn-p'] }[k] || ['Lihat', 'btn-s'];
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

  // ---------------------------------------------------------------- 17 · Form Pendaftaran (isi, lihat, approve) — langkah mengikuti mockup "Cantik Kosmetik":
  // Toko dan Group Brand · Target · Rate dan Batas Cair · Fixed Rebate Detail · Tinjau dan Ajukan, dengan panel Ringkasan di kanan.
  // Target S1 / S2 tidak diisi CBD: dihitung dari target yearly × rasio pencairan semester di Pengaturan channel.
  const X = L.cx;
  const jt = (n) => (isFinite(n) ? 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' juta' : '—');
  const pc = (n) => (isFinite(n) ? fp(n) + '%' : '—');
  const nv = (n) => (isFinite(n) && n !== null ? String(n).replace('.', ',') : '—');
  const TAGK = { 'c-grey': '', 'c-blue': 'info', 'c-yellow': 'warn', 'c-red': 'err', 'c-green': 'ok' };
  const CHECK_TITLE = Object.assign(Object.fromEntries(L.COND.REGISTRATION.map(([c, l]) => [c, l])), {
    NO_SALES: 'Belum ada data penjualan', GROWTH_EMPTY: 'Growth yearly belum diisi', FR_INCOMPLETE: 'Fixed Rebate Detail belum lengkap', TOTAL_OVER_CAP: 'Total rate di atas maksimum',
    NO_BRAND_JOINED: 'Belum ada group brand yang diikuti', TAGGING_CHANGED: 'Tagging berbeda dari rekomendasi sistem' });
  const CHECK_STEP = { NO_SALES: 'brand', NO_BRAND_JOINED: 'brand', BRAND_EXCLUDED: 'brand', TAGGING_CHANGED: 'brand', OUTSIDE_CLASS: 'brand', GROWTH_EMPTY: 'target', BELOW_LOWEST_TIER: 'target',
    RATE_CHANGED: 'rate', RATE_BELOW_MIN: 'rate', TOTAL_OVER_CAP: 'rate', VALUE_OVER_BUDGET: 'fr', FR_INCOMPLETE: 'fr' };

  function regForm(p, ch, part, r, mode, user, back) {
    // mode: edit | view | approve · back: tujuan tombol Kembali
    return (root) => {
      const { ico, tag, sw } = X;
      const groups = L.groupsOf(p);
      const units = {}; for (const g of groups) { units[g.id] = clone((r && r.units[g.id]) || L.blankUnit(ch)); if (!r) { const s_ = L.salesFor(part.codes, g.members); if (!s_.si && !s_.so) units[g.id].joined = false; } }
      const viaExc = r ? r.via_exception : !!L.exceptionOf(p.id, part.code);
      const GRP = part.codes.length > 1; // customer group: detail fixed rebate diisi per toko anggota
      if (GRP) for (const u of Object.values(units)) for (const k of ['rent', 'act', 'oth']) (u.plan[k] || []).forEach((x) => { if (!x.store) x.store = part.codes[0]; });
      const storeName = (code) => (L.store(code) || {}).name || code;
      const ro = mode !== 'edit';
      const FRon = L.FR(p); const FRN = L.frName(p); const set = ch.settings; const ratio = L.ratioOf(ch); const F = ch.fr;
      const yr = String(p.period_start || '').slice(0, 4);
      const STEPS = [['brand', 'Toko dan Group Brand'], ['target', 'Target'], ['rate', 'Rate dan Batas Cair'], FRon && ['fr', 'Fixed Rebate Detail'], ['review', 'Tinjau dan Ajukan']].filter(Boolean);
      const sIdx = (k) => STEPS.findIndex(([x]) => x === k);
      const LAST = STEPS.length - 1;
      const backHref = back || (mode === 'approve' || (r && user.role !== 'CBD') ? '#/approval' : '#/pendaftaran');
      const monthSel_ = (val, attrs) => `<select class="cx-in md" ${attrs}>${MO.map((m) => `<option value="${m}" ${m === val ? 'selected' : ''}>${m} ${yr}</option>`).join('')}</select>`;
      L.view(root, {
        state: { step: ro ? LAST : 0, units, reasons: clone((r && r.reasons) || {}), err: [], comment: '', rentStore: part.codes[0] },
        html: (S) => {
          const calc = groups.map((g) => L.calcUnit(p, ch, g, part.codes, S.units[g.id], { viaException: viaExc }));
          const checks = L.checksOf(p, ch, calc);
          const tg = calc.filter((c) => c.joined);
          const hard = checks.filter((c) => c.kind === 'hard'); const appr = checks.filter((c) => c.kind === 'appr');
          const missing = appr.filter((c) => !String(S.reasons[c.key] || '').trim()).length;
          const blocked = hard.length > 0 || missing > 0;
          const planRows = (c) => { const P = S.units[c.g.id].plan; return P.rent.length + P.act.length + P.oth.length; };
          const done = {
            brand: tg.length > 0 && !checks.some((c) => c.code === 'NO_SALES'),
            target: tg.length > 0 && tg.every((c) => c.gOk),
            rate: tg.length > 0 && tg.every((c) => (!set.semester || isFinite(c.semV)) && (!set.yearly || isFinite(c.yrV)) && (!FRon || isFinite(c.frV))),
            fr: tg.length > 0 && tg.every((c) => !c.incomplete) && tg.some((c) => planRows(c) > 0),
            review: ro && !!r && r.status !== 'DRAFT',
          };
          const key = STEPS[S.step][0];
          const stepper = `<section class="cx-card" style="padding:16px 24px"><nav class="cx-steps" aria-label="Langkah pendaftaran">${STEPS.map(([k, l], i) => { const cur = i === S.step; const ok = done[k];
            return `<a href="#" class="cx-step ${cur ? 'cur' : ok ? 'done' : ''}" data-on="go" data-s="${i}" ${cur ? 'aria-current="step"' : ''}><span class="sh"><span class="sd">${ok && !cur ? ico.check : i + 1}</span>${esc(l)}</span><span class="ss">${cur ? (ro ? 'Sedang dilihat' : 'Sedang diisi') : ok ? 'Lengkap' : 'Belum diisi'}</span></a>`; }).join('')}</nav></section>`;
          let body = '';
          // ---- 1 · Toko dan Group Brand
          if (key === 'brand') {
            const st0 = L.store(part.codes[0]) || {};
            const info = [['Kode', part.code], GRP ? ['Anggota', part.codes.map(storeName).join(', ')] : ['Alamat', st0.address || part.sub], ['Channel', L.channelOf(ch.channel_code).name], ['Tipe', part.kind]];
            body = `<div class="cx-col"><h2 class="t-h4">Toko dan Group Brand</h2><span class="t-sm">Pilih group brand yang diikuti toko. Baseline dan kelas dihitung sistem dari penjualan.</span></div>
              <div class="cx-soft"><div class="cx-grid4">${info.map(([l, v]) => `<div class="cx-col"><span class="t-sm-b">${l}</span><span class="t-body">${esc(v)}</span></div>`).join('')}</div></div>
              ${calc.map((c) => { const out = !c.joined; const has = c.sales.si || c.sales.so; const tagNow = c.tag; const bv = tagNow === 'SO' ? c.sales.so : c.sales.si;
                const k = c.k || (out ? L.findClass(ch.matrix[c.g.id] || [], bv) : null);
                const kTag = !has ? tag('Tanpa penjualan', 'plain') : k ? tag(`Kelas ${k.code}${c.viaExc ? ' (exception)' : ''}`, 'info plain') : tag('Di luar kelas', 'warn plain');
                return `<div class="cx-sub cx-brandrow ${out ? 'off' : ''}">${sw(c.joined, `data-on="ikut" data-g="${c.g.id}" aria-label="Ikut ${esc(c.g.name)}"`)}
                  <div class="cx-col" style="flex:1 1 240px"><span class="t-h5">${esc(c.g.name)}</span><span class="t-sm">${has ? `Baseline rata-rata ${jt(bv)} per bulan · 6 bulan terakhir` : 'Belum ada data penjualan untuk group brand ini'}</span></div>
                  <span style="${out ? 'opacity:.6' : ''}">${kTag}</span>
                  <label class="cx-col" style="gap:6px;width:220px"><span class="t-sm-b">Tagging</span><select class="cx-in md" data-chg="tag" data-g="${c.g.id}" ${out ? 'disabled' : ''} aria-label="Tagging ${esc(c.g.name)}"><option value="SI" ${tagNow === 'SI' ? 'selected' : ''}>Sell-in (SI)</option><option value="SO" ${tagNow === 'SO' ? 'selected' : ''}>Sell-out (SO)</option></select>
                    ${!out && c.tag !== c.recTag ? `<span class="cx-help">Rekomendasi sistem: ${c.recTag === 'SI' ? 'Sell-in' : 'Sell-out'}</span>` : ''}</label></div>`; }).join('')}`;
          }
          // ---- 2 · Target
          if (key === 'target') {
            body = `<div class="cx-col"><h2 class="t-h4">Target</h2><span class="t-sm">${set.semester ? `Isi growth yearly. Target S1 dan S2 dihitung dari rasio pencairan semester di setup (S1 ${nv(ratio.s1)}% · S2 ${nv(ratio.s2)}%).` : 'Isi growth yearly untuk menghitung target yearly.'}</span></div>
              ${tg.map((c) => { const u = S.units[c.g.id]; const tn = set.yearly ? c.tierY : c.tierS;
                const tierTag = !c.k ? tag('Di luar kelas · rate diisi manual', 'warn') : !c.gOk ? tag('Isi growth yearly', 'plain') : tn < 0 ? tag(`Di bawah tier terendah (${nv(c.k.tiers[0].g)}%)`, 'warn')
                  : tag(`Tier ${tn + 1} · ${[set.semester && 'semester ' + pc(c.rec.sem), set.yearly && 'yearly ' + pc(c.rec.yr)].filter(Boolean).join(' · ')}`, 'ok');
                return `<div class="cx-sub"><div class="cx-between"><span class="t-h5">${esc(c.g.name)}</span>${tierTag}</div>
                  <div class="cx-grid3" style="align-items:stretch"><div class="cx-field"><span class="cx-label">Growth yearly</span><div class="cx-suffix"><input class="cx-in" data-k="gy${c.g.id}" data-inp="uIn" data-f="growth" data-g="${c.g.id}" inputmode="decimal" value="${esc(u.growth)}" aria-label="Growth yearly ${esc(c.g.name)} (%)"><span>%</span></div>
                    <span class="cx-help">Target yearly: <b>${c.gOk ? jt(c.annual) : '—'}</b></span></div>
                    ${set.semester ? [['S1 · Jan – Jun', c.t1, ratio.s1], ['S2 · Jul – Des', c.t2, ratio.s2]].map(([l, v, rr]) => `<div class="cx-soft"><span class="t-sm-b">Target ${l}</span><span class="t-h5">${c.gOk ? jt(v) : '—'}</span><span class="t-sm">${nv(rr)}% dari target yearly</span></div>`).join('') : ''}</div></div>`; }).join('') || '<span class="t-sm">Belum ada group brand yang diikuti.</span>'}`;
          }
          // ---- 3 · Rate dan Batas Cair
          if (key === 'rate') {
            const keys = [set.semester && ['sem', 'Semester %'], set.yearly && ['yr', 'Yearly %'], FRon && ['fr', `${FRN === 'Fixed Rebate' ? 'Fixed rebate' : esc(FRN)} %`]].filter(Boolean);
            body = `<div class="cx-col"><h2 class="t-h4">Rate dan Batas Cair</h2><span class="t-sm">Sesuaikan rate bila perlu. Hanya total yang dibatasi: di atas maksimum ditandai, tidak diblok. Pencairan dihitung otomatis.</span></div>
              ${tg.map((c) => { const u = S.units[c.g.id]; const over = isFinite(c.cap) && c.total > c.cap + 0.0001;
                const recTxt = c.k ? `Rekomendasi sistem: ${keys.map(([k]) => (c.rec[k] !== null ? pc(c.rec[k]) : '—')).join(' + ')}${isFinite(c.cap) ? ` · maksimum ${pc(c.cap)}` : ''}` : 'Di luar kelas: rate diisi manual, tanpa maksimum.';
                const inp = ([k, l]) => { const has = c.rec[k] !== null; const filled = u[k] !== null && u[k] !== undefined && String(u[k]).trim() !== ''; const changed = filled && has && (Math.abs(pnum(u[k]) - c.rec[k]) > 0.0001);
                  return `<div class="cx-field"><span class="cx-label">${l}</span><div class="cx-suffix"><input class="cx-in ${changed ? 'need' : ''}" data-k="${k}${c.g.id}" data-inp="uIn" data-f="${k}" data-g="${c.g.id}" inputmode="decimal" value="${esc(filled ? u[k] : has ? fp(c.rec[k]) : '')}" aria-label="${esc(c.g.name)} ${l}"><span>%</span></div>
                    ${changed && has ? `<span class="cx-help">Diubah dari rekomendasi ${pc(c.rec[k])}</span>` : ''}</div>`; };
                const pay = [set.semester && [`Pencairan S1`, c.semS1], set.semester && ['Pencairan S2', c.semS2], set.semester && ['Total semester', c.semBudget], set.yearly && ['Pencairan yearly', c.yrRp], FRon && [`Pencairan ${esc(FRN)}`, c.frBudget]].filter(Boolean);
                return `<div class="cx-sub"><div class="cx-between"><span class="t-h5">${esc(c.g.name)}</span><span class="t-sm">${recTxt}</span></div>
                  <div class="cx-rgrid" style="--n:${keys.length}">${keys.map(inp).join('')}<div class="cx-col" style="gap:4px"><span class="cx-label">Total</span><span class="t-h4">${pc(c.total)}</span>
                    <span>${over ? tag('Di atas maksimum', 'warn') : isFinite(c.cap) ? tag('Dalam batas maksimum', 'ok') : tag('Tanpa maksimum', 'plain')}</span></div></div>
                  <hr class="cx-hr"><span class="t-strong">Pencairan jika target tercapai penuh</span>
                  <div class="cx-pgrid">${pay.map(([l, v]) => `<div class="cx-col"><span class="t-sm-b">${l}</span><span class="t-body">${jt(v)}</span></div>`).join('')}<div class="cx-col"><span class="t-sm-b">Total</span><span class="t-strong">${jt(c.totalRp)}</span></div></div></div>`; }).join('') || '<span class="t-sm">Belum ada group brand yang diikuti.</span>'}`;
          }
          // ---- 4 · Fixed Rebate Detail (budget untuk seluruh group brand yang diikuti)
          if (key === 'fr') {
            const sum = (k) => tg.reduce((a, c) => a + c[k], 0);
            const usedAll = sum('used'); const budAll = sum('frBudget'); const overB = usedAll > budAll + 0.5;
            const bOpts = tg.flatMap((c) => c.g.members.concat(c.g.others || []).map((b) => [c.g.id, b]));
            const mine = (sec) => tg.flatMap((c) => (S.units[c.g.id].plan[sec] || []).map((x, j) => ({ c, x, j }))).filter(({ x }) => !GRP || x.store === S.rentStore);
            const at = (c, sec, j) => `data-g="${c.g.id}" data-sec="${sec}" data-j="${j}"`;
            const kk = (c, sec, j, f) => `data-k="${sec}${c.g.id}_${j}_${f}"`;
            const need = (bad) => (bad ? 'need' : '');
            const brandF = ({ c, x, j }, sec) => `<label class="cx-field"><span class="cx-label">Brand</span><select class="cx-in md" data-chg="plBrand" ${at(c, sec, j)} aria-label="Brand">${bOpts.map(([g, b]) => `<option value="${g}|${esc(b)}" ${g === c.g.id && (x.brand || c.g.members[0]) === b ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
            const del = ({ c, j }, sec) => `<button type="button" class="cx-icon-btn" style="margin-bottom:6px" aria-label="Hapus baris" data-on="plDel" ${at(c, sec, j)}>${ico.x}</button>`;
            const months = ({ c, x, j }, sec) => `<label class="cx-field"><span class="cx-label">Mulai</span>${monthSel_(x.from, `data-chg="pl" ${at(c, sec, j)} data-f="from" aria-label="Mulai"`)}</label><label class="cx-field"><span class="cx-label">Sampai</span>${monthSel_(x.to, `data-chg="pl" ${at(c, sec, j)} data-f="to" aria-label="Sampai"`)}</label>`;
            const rp = ({ c, x, j }, sec) => `<input class="cx-in md ${need(!rpNum(x.val))}" ${kk(c, sec, j, 'v')} data-chg="plRp" ${at(c, sec, j)} inputmode="numeric" placeholder="Rp" value="${esc(x.val)}" aria-label="Nilai (Rp)">`;
            const payOpts = [set.semester && 'Semester', set.yearly && 'Yearly'].filter(Boolean);
            const rentRows = mine('rent').map((o) => { const { c, x, j } = o; const payV = x.pay || payOpts[0] || 'Yearly';
              return `<div class="cx-frblock"><div class="cx-frrow" style="grid-template-columns:130px minmax(0,1.3fr) minmax(0,1fr) 104px 104px 32px">${brandF(o, 'rent')}
                  <label class="cx-field"><span class="cx-label">Objek sewa</span><select class="cx-in md" data-chg="pl" ${at(c, 'rent', j)} data-f="obj" aria-label="Objek sewa">${F.rent.items.concat(F.rent.items.includes(x.obj) ? [] : [x.obj]).map((v) => `<option ${v === x.obj ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
                  <label class="cx-field"><span class="cx-label">Nilai (Rp)</span>${rp(o, 'rent')}</label>${months(o, 'rent')}${del(o, 'rent')}</div>
                <div class="cx-frrow" style="grid-template-columns:130px minmax(0,1fr) minmax(0,1.3fr)">
                  <label class="cx-field"><span class="cx-label">Periode pencairan</span><select class="cx-in md" data-chg="pl" ${at(c, 'rent', j)} data-f="pay" aria-label="Periode pencairan">${payOpts.concat(payOpts.includes(payV) ? [] : [payV]).map((v) => `<option ${v === payV ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
                  <div class="cx-field"><span class="cx-label">Foto / attachment</span><div class="cx-row" style="gap:8px;min-height:36px"><label class="cx-btn cx-s" style="margin:0">Unggah Foto<input type="file" accept="image/*,.pdf" hidden data-chg="plFile" ${at(c, 'rent', j)}></label>
                    ${(x.files || []).map((f, fi) => `<span class="cx-tag plain" title="${esc(f)}" style="max-width:200px"><span style="overflow:hidden;text-overflow:ellipsis">${esc(f)}</span><button type="button" style="border:0;background:none;padding:0;cursor:pointer;color:#304DDE;display:inline-flex" aria-label="Hapus ${esc(f)}" data-on="plFileDel" ${at(c, 'rent', j)} data-fi="${fi}">${ico.x}</button></span>`).join('') || tag('Belum ada foto', 'plain')}</div></div>
                  <label class="cx-field"><span class="cx-label">Deskripsi posisi</span><input class="cx-in md" ${kk(c, 'rent', j, 'p')} data-chg="pl" ${at(c, 'rent', j)} data-f="pos" placeholder="Mis. lantai 1, dekat pintu masuk" value="${esc(x.pos || '')}" aria-label="Deskripsi posisi"></label></div></div>`; }).join('');
            const valOrNote = (o, sec, objToo) => { const { c, x, j } = o; const lbl = x.on ? 'Nilai (Rp)' : 'Catatan';
              return `<div class="cx-field"><span class="cx-between" style="gap:8px"><span class="cx-label">${lbl}</span><button type="button" class="cx-link" style="font-size:12px" data-on="plTg" ${at(c, sec, j)}>${x.on ? 'Tanpa nilai' : 'Bernilai'}</button></span>
                ${x.on ? rp(o, sec) : `<input class="cx-in md ${need(!String(x.note || '').trim())}" ${kk(c, sec, j, 'n')} data-chg="pl" ${at(c, sec, j)} data-f="note" placeholder="${objToo ? 'Keterangan' : 'Keterangan aktivitas'}" value="${esc(x.note || '')}" aria-label="Catatan">`}</div>`; };
            const actRows = mine('act').map((o) => { const { c, x, j } = o; return `<div class="cx-frblock"><div class="cx-frrow" style="grid-template-columns:130px minmax(0,1.2fr) minmax(0,1.2fr) 104px 104px 32px">${brandF(o, 'act')}
                <label class="cx-field"><span class="cx-label">Jenis aktivitas</span><select class="cx-in md" data-chg="pl" ${at(c, 'act', j)} data-f="type" aria-label="Jenis aktivitas">${F.act.items.concat(F.act.items.includes(x.type) ? [] : [x.type]).map((v) => `<option ${v === x.type ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
                ${valOrNote(o, 'act')}${months(o, 'act')}${del(o, 'act')}</div></div>`; }).join('');
            const othRows = mine('oth').map((o) => { const { c, x, j } = o; return `<div class="cx-frblock"><div class="cx-frrow" style="grid-template-columns:130px minmax(0,1.6fr) minmax(0,1fr) 32px">${brandF(o, 'oth')}
                ${x.on ? `<label class="cx-field"><span class="cx-label">Objek</span><input class="cx-in md ${need(!String(x.obj || '').trim())}" ${kk(c, 'oth', j, 'o')} data-chg="pl" ${at(c, 'oth', j)} data-f="obj" placeholder="Mis. hadiah member" value="${esc(x.obj || '')}" aria-label="Objek"></label>` : '<span></span>'}
                ${valOrNote(o, 'oth', true)}${del(o, 'oth')}</div></div>`; }).join('');
            const block = (on, sec, title, desc, rowsH, what) => (!on ? '' : `<div class="cx-sub" style="gap:0"><div class="cx-col" style="padding-bottom:8px"><span class="t-h5">${title}</span><span class="t-sm">${desc}</span></div>
              ${rowsH || `<span class="t-sm" style="padding:12px 0;border-top:1px solid #EBEBEB">Belum ada ${what}${GRP ? ` untuk ${esc(storeName(S.rentStore))}` : ''}.</span>`}
              <div style="padding-top:12px;border-top:1px solid #EBEBEB"><button type="button" class="cx-btn cx-s" data-on="plAdd" data-sec="${sec}">Tambah Baris</button></div></div>`);
            const perStore = !GRP ? '' : part.codes.map((code) => { const v = tg.reduce((a, c) => { const Q = S.units[c.g.id].plan; return a + (F.rent.on ? Q.rent.filter((x) => x.store === code).reduce((s_, x) => s_ + rpNum(x.val), 0) : 0) + (F.act.on ? Q.act.filter((x) => x.store === code && x.on).reduce((s_, x) => s_ + rpNum(x.val), 0) : 0) + (F.oth.on ? Q.oth.filter((x) => x.store === code && x.on).reduce((s_, x) => s_ + rpNum(x.val), 0) : 0); }, 0);
              return `<span style="${code === S.rentStore ? 'color:#304DDE' : ''}"><b>${esc(storeName(code))}</b> ${jt(v)}</span>`; }).join(' · ');
            body = `<div class="cx-col"><h2 class="t-h4">Fixed Rebate Detail · ${esc(FRN)}</h2><span class="t-sm">Rincikan penggunaan fixed rebate. Total bernilai tidak boleh melebihi budget.</span></div>
              <div class="cx-soft" style="gap:10px"><div class="cx-between"><span class="t-strong">Total bernilai ${jt(usedAll)} dari budget ${jt(budAll)}</span>${overB ? tag('Melebihi budget', 'warn') : tag('Dalam budget', 'ok')}</div>
                <div style="height:8px;border-radius:4px;background:#EBEBEB;overflow:hidden" role="img" aria-label="Pemakaian budget"><div style="height:100%;width:${budAll > 0 ? Math.min(100, usedAll / budAll * 100) : usedAll > 0 ? 100 : 0}%;background:${overB ? '#E6001C' : '#304DDE'}"></div></div>
                <span class="t-sm">${[F.rent.on && `Visibility Rent ${jt(sum('rentSum'))}`, F.act.on && `Aktivitas ${jt(sum('actSum'))}`, F.oth.on && `Lainnya ${jt(sum('othSum'))}`].filter(Boolean).join(' · ')}</span>
                <span class="t-sm">Budget per group brand: ${tg.map((c) => `${esc(c.g.name)} ${jt(c.frBudget)}`).join(' · ') || '—'}</span></div>
              ${GRP ? `<div class="cx-row" style="align-items:flex-end;gap:8px 16px"><label class="cx-field" style="width:320px;max-width:100%"><span class="cx-label">Cust ID (Toko)</span><select class="cx-in md" data-chg="rentStore" aria-label="Pilih toko">${part.codes.map((code) => `<option value="${esc(code)}" ${code === S.rentStore ? 'selected' : ''}>${esc(code)} · ${esc(storeName(code))}</option>`).join('')}</select></label>
                <span class="t-sm" style="padding-bottom:10px">Rincian per toko: ${perStore}</span></div>` : ''}
              ${!tg.length ? '<span class="t-sm">Belum ada group brand yang diikuti.</span>' : `${block(F.rent.on, 'rent', 'Visibility Rent', 'Brand, objek sewa, nilai (Rp), periode sewa, dan periode pencairan. Nilai selalu wajib.', rentRows, 'sewa')}
              ${block(F.act.on, 'act', 'Aktivitas', 'Jenis aktivitas dan periode. Pilih bernilai (Rp) atau cukup teks.', actRows, 'aktivitas')}
              ${block(F.oth.on, 'oth', 'Lainnya', 'Bernilai (objek dan nilai) atau cukup keterangan.', othRows, 'baris lain')}`}`;
          }
          // ---- 5 · Tinjau dan Ajukan
          if (key === 'review') {
            const facts = L.factsOf(p, ch, calc, checks); const meta = L.condMeta('REGISTRATION');
            const layers = ch.layers.REGISTRATION || [];
            const used = []; layers.forEach((l) => { if (l.rule === 'IF') l.conds.forEach((c) => { if (!used.includes(c.code)) used.push(c.code); }); });
            const live = ro && r && r.route && r.route.length && r.status !== 'DRAFT';
            const rt = live ? r.route : L.buildRoute('REGISTRATION', layers, facts);
            const roles = rt.filter((s) => s.status === 'RUN').map((s) => L.ROLES[s.role] || s.role);
            const stepTag = (s, i) => { const l = layers[i] || {}; const cur = live && L.currentStep(r) === s;
              if (s.status === 'SKIP') return tag('Dilewati'); if (s.status === 'MERGED') return tag(`Digabung dengan layer ${s.mergedWith}`, 'plain');
              if (live && s.decision === 'APPROVED') return tag('Disetujui', 'ok'); if (live && s.decision === 'RETURNED') return tag('Dikembalikan', 'err');
              if (cur && r.status === 'IN_APPROVAL') return tag('Menunggu', 'warn'); return (s.rule || l.rule) === 'IF' ? tag('Berjalan', 'ok') : tag('Wajib', 'info'); };
            const whyOf = (s, i) => { const l = layers[i]; if (s.status === 'SKIP') return 'Kondisi layer tidak terpenuhi.'; if ((s.rule || (l || {}).rule) !== 'IF') return 'Selalu berjalan.';
              const hits = l && !live ? l.conds.filter((c) => L.testCond(meta, c, facts)).map((c) => (meta[c.code] || {}).label) : null; return hits ? `Karena: ${hits.join(', ')}.` : s.why; };
            const route = `<div class="cx-sub" style="gap:12px"><div class="cx-col"><span class="t-h5">Rute Approval: ${esc(roles.join(' → ') || 'tidak ada layer yang berjalan')}</span><span class="t-sm">${live ? 'Rute saat pengajuan diajukan.' : 'Dihitung dari hasil pengecekan pengajuan ini.'}</span></div>
              ${used.length && !live ? `<div class="cx-col" style="gap:8px"><span class="t-sm-b">Hasil Pengecekan</span>${used.map((code) => { const m = meta[code]; if (!m) return '';
                return m.type === 'num' ? `<span class="t-sm">${esc(m.label)}: <b>${isFinite(facts[code]) ? fp(facts[code]) + m.unit : '—'}</b></span>` : `<label class="cx-check" style="cursor:default"><input type="checkbox" disabled ${facts[code] ? 'checked' : ''}><span>${esc(m.label)}</span></label>`; }).join('')}</div><hr class="cx-hr">` : ''}
              ${rt.map((s, i) => `<div class="cx-row" style="flex-wrap:nowrap;align-items:flex-start"><span class="cx-numdot ${s.status === 'RUN' ? 'solid' : 'off'}">${s.n || i + 1}</span><div class="cx-col" style="gap:6px"><span class="t-strong">${esc(L.ROLES[s.role] || s.role)}</span><span>${stepTag(s, i)}</span><span class="t-sm">${esc(whyOf(s, i))}</span>
                ${live && s.by ? `<span class="t-sm">${esc(userName(s.by))} · ${L.dateTxt(s.at)}${s.comment ? ` · "${esc(s.comment)}"` : ''}</span>` : ''}</div></div>`).join('') || '<span class="t-sm">Layer approval belum disetup.</span>'}</div>`;
            const chkRows = checks.map((c) => { const st = sIdx(CHECK_STEP[c.code]); const val = String(S.reasons[c.key] || '');
              const kindTag = c.kind === 'hard' ? tag('Memblokir pengajuan', 'err') : c.kind === 'appr' ? tag('Alasan wajib', 'warn') : tag('Alasan opsional', 'plain');
              const right = c.kind === 'hard' ? `<div class="cx-col" style="justify-content:center">${!ro && st >= 0 ? `<button type="button" class="cx-link" style="align-self:flex-start" data-on="go" data-s="${st}">Perbaiki di langkah ${st + 1}</button>` : ''}</div>`
                : ro ? `<div class="cx-col"><span class="t-sm-b">Alasan CBD</span><span class="t-body">${esc(val || '—')}</span></div>`
                : `<label class="cx-field"><span class="cx-label">Alasan${c.kind === 'appr' ? '<span class="req">*</span>' : ' (opsional)'}</span><input class="cx-in md ${c.kind === 'appr' && !val.trim() ? 'need' : ''}" data-k="rs${c.key}" data-inp="reason" data-chg="noop" data-key="${c.key}" data-need="${c.kind === 'appr' ? 1 : ''}" value="${esc(val)}" placeholder="${c.kind === 'appr' ? 'Tulis alasan untuk approver' : 'Tambahkan alasan bila perlu'}"></label>`;
              return `<div class="cx-chkrow"><div class="cx-col" style="gap:6px"><span class="t-strong">${esc(CHECK_TITLE[c.code] || c.label)}</span><span class="t-sm">${c.unit !== 'Pengajuan' ? esc(c.unit) + ': ' : ''}${esc(c.label)}</span><span>${kindTag}</span></div>${right}</div>`; }).join('');
            body = `<div class="cx-col"><h2 class="t-h4">Tinjau dan Pengecekan</h2><span class="t-sm">Periksa ringkasan dan isi alasan untuk pengecekan yang mewajibkannya sebelum mengajukan.</span></div>
              <div class="cx-table"><table><thead><tr><th>Group brand</th><th>Kelas dan Tier</th><th class="num">Target yearly</th><th class="num">Total rate</th><th class="num">Rebate estimasi</th></tr></thead><tbody>
                ${tg.map((c) => { const tn = set.yearly ? c.tierY : c.tierS; return `<tr><td><b>${esc(c.g.name)}</b></td><td>${c.k ? `Kelas ${esc(c.k.code)} · ${tn >= 0 ? 'Tier ' + (tn + 1) : 'di bawah tier'}` : 'Di luar kelas'}</td><td class="num">${jt(c.annual)}</td><td class="num">${pc(c.total)}</td><td class="num"><b>${jt(c.totalRp)}</b></td></tr>`; }).join('')
                  || '<tr><td colspan="5" class="t-sm">Belum ada group brand yang diikuti.</td></tr>'}</tbody></table></div>
              <div class="cx-sub" style="gap:0"><div class="cx-between" style="padding-bottom:8px"><span class="t-h5">Pengecekan</span>${hard.length ? tag(`${hard.length} memblokir`, 'err') : missing ? tag(`${missing} alasan belum diisi`, 'warn') : checks.length ? tag(`${checks.length} temuan`, 'plain') : tag('Tidak ada temuan', 'ok')}</div>
                ${chkRows || '<span class="t-sm" style="padding:12px 0;border-top:1px solid #EBEBEB">Tidak ada temuan. Semua nilai sesuai rekomendasi dan batas.</span>'}</div>
              ${route}`;
          }
          // ---- Ringkasan & panel samping
          const totT = tg.reduce((a, c) => a + c.annual, 0); const usedAll = tg.reduce((a, c) => a + c.used, 0); const frT = tg.reduce((a, c) => a + c.frBudget, 0);
          const mechTxt = set.semester && set.yearly ? 'Semester dan yearly sesuai rate' : set.semester ? 'Semester sesuai rate' : set.yearly ? 'Yearly sesuai rate' : 'Tidak ada';
          const uniq = []; checks.forEach((c) => { if (!uniq.some((x) => x.code === c.code)) uniq.push(c); });
          const kv = (l, v) => `<div class="cx-col" style="gap:2px;padding:12px 0;border-top:1px solid #EBEBEB"><span class="t-sm-b">${l}</span><span class="t-body">${v}</span></div>`;
          const summary = `<section class="cx-card" style="gap:0"><h2 class="t-h5" style="padding-bottom:12px">Ringkasan</h2>
            ${kv('Group brand ikut', `${tg.length} dari ${calc.length}`)}${kv('Total baseline', `${jt(tg.reduce((a, c) => a + c.base, 0))} per bulan`)}${kv('Target yearly', jt(totT))}${kv('Rebate kondisional', mechTxt)}
            ${FRon ? kv('Fixed rebate', usedAll > 0 ? `${jt(usedAll)} dari budget ${jt(frT)}` : `Dirinci di langkah ${sIdx('fr') + 1}`) : ''}${kv('Estimasi total rebate', jt(tg.reduce((a, c) => a + c.totalRp, 0)))}
            ${kv(`Hasil Pengecekan · ${checks.length}`, `<span class="cx-row" style="gap:6px;padding-top:4px">${uniq.map((c) => tag(CHECK_TITLE[c.code] || c.label, c.kind === 'hard' ? 'err' : c.kind === 'appr' ? 'warn' : '')).join('') || tag('Tidak ada', 'ok')}</span>`)}</section>`;
          const extra = [];
          if (r && mode === 'approve') extra.push(`<section class="cx-card" style="border:2px solid #FFCD00"><h2 class="t-h5">Menunggu Anda: ${esc(L.ROLES[user.role] || user.role)}</h2>
            <label class="cx-field"><span class="cx-label">Komentar</span><textarea class="cx-in" data-k="cmt" data-inp="cmt" placeholder="Wajib diisi jika dikembalikan">${esc(S.comment)}</textarea></label>
            <div class="cx-row"><button type="button" class="cx-btn cx-p" data-on="approve">Setujui</button><button type="button" class="cx-btn cx-s" data-on="return">Kembalikan ke CBD</button></div></section>`);
          if (r && r.mou_no && ['AWAITING_DOCS', 'DOC_REVIEW', 'DOC_REVISION', 'REGISTERED'].includes(r.status)) extra.push(`<section class="cx-card"><div class="cx-between"><h2 class="t-h5">MoU dan Berkas</h2>${tag(L.REG_STATUS[r.status][0], TAGK[L.REG_STATUS[r.status][1]])}</div>
            <span class="t-body"><b>${esc(r.mou_no)}</b> <span class="t-sm">· di-generate ${L.dateTxt(r.mou_at)}${r.mou_by ? ' oleh ' + esc(r.mou_by) : ''}</span></span>
            <span class="t-sm">${(r.files || []).length ? (r.files || []).map((f) => esc(f.name)).join(', ') : 'Belum ada berkas diunggah.'}</span><button type="button" class="cx-btn cx-s" style="align-self:flex-start" data-on="mouDl">Unduh MoU</button></section>`);
          // ---- kepala, banner status, navigasi
          const stt = r ? L.REG_STATUS[r.status] : L.REG_STATUS.NEW;
          const head = X.head({ back: backHref, title: esc(part.name), tagHtml: tag(r ? stt[0] : 'Draft', r ? TAGK[stt[1]] : '') + (viaExc ? ' ' + tag('Toko exception', 'warn') : ''), sub: esc(part.code), sub2: `${esc(p.name)} · ${esc(L.channelOf(ch.channel_code).name)} · ${esc(part.dc)}${r && r.revision > 1 ? ` · revisi ${r.revision}` : ''}`,
            actions: mode === 'edit' ? `${r ? '<button type="button" class="cx-btn cx-t" data-on="cancel">Batalkan Pendaftaran</button>' : ''}<button type="button" class="cx-btn cx-s" data-on="draft">Simpan Draft</button>` : '' });
          let banner = '';
          if (r && r.status === 'RETURNED') { const s = r.route.find((x) => x.decision === 'RETURNED'); const who = r.dc_return ? 'Admin Sales DC' : s ? L.ROLES[s.role] || s.role : ''; const note = r.dc_return ? r.dc_return.note : s ? s.comment : '';
            banner = `<div class="cx-alert err"><span class="ic">!</span><div><b>Dikembalikan ${esc(who)}</b>${esc(note)} Perbaiki lalu ajukan ulang.</div></div>`; }
          else if (r && ro) banner = `<div class="cx-alert info"><span class="ic">i</span><div><b>${esc(stt[0])}</b>${esc(statusNote({ r }) || '')}</div></div>`;
          const blockText = hard.length ? `Perbaiki ${hard.length} temuan yang memblokir.` : missing ? `Isi alasan untuk ${missing} pengecekan.` : 'Siap diajukan.';
          const nav = `<div class="cx-between" style="padding-top:20px;border-top:1px solid #EBEBEB">${S.step > 0 ? '<button type="button" class="cx-btn cx-s lg" data-on="prev">Kembali</button>' : `<a class="cx-btn cx-s lg" href="${backHref}">Kembali ke Daftar</a>`}
            ${S.step < LAST ? `<button type="button" class="cx-btn cx-p lg" data-on="next">Lanjut: ${esc(STEPS[S.step + 1][1])}</button>`
              : mode === 'edit' ? `<div class="cx-row"><span class="t-sm" style="color:${blocked ? '#B80016' : '#267346'}">${blockText}</span><button type="button" class="cx-btn cx-p lg" data-on="submit" ${blocked ? 'disabled' : ''}>${r && r.status === 'RETURNED' ? 'Ajukan Ulang' : 'Ajukan Pendaftaran'}</button></div>` : ''}</div>`;
          return `${head}${banner}${stepper}<div class="cx-layout"><section class="cx-card" style="gap:20px">
              <fieldset ${ro ? 'disabled' : ''} class="cx-col" style="gap:16px;border:0;padding:0;margin:0">${body}</fieldset>
              ${S.err.length ? `<div class="cx-alert err"><span class="ic">!</span><div><b>Belum bisa diajukan</b><ul>${S.err.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : ''}${nav}</section>
            <aside class="cx-sidecol">${summary}${extra.join('')}</aside></div>`;
        },
        on: Object.assign({
          go: (S, el) => { S.step = Number(el.dataset.s); window.scrollTo(0, 0); },
          next: (S) => { S.step = Math.min(LAST, S.step + 1); window.scrollTo(0, 0); },
          prev: (S) => { S.step = Math.max(0, S.step - 1); window.scrollTo(0, 0); },
          ikut: (S, el) => { const u = S.units[el.dataset.g]; u.joined = u.joined === false; },
          tag: (S, el) => { S.units[el.dataset.g].tag = el.value; },
          uIn: (S, el) => { S.units[el.dataset.g][el.dataset.f] = el.value.trim(); return true; },
          reason: (S, el) => { S.reasons[el.dataset.key] = el.value; if (el.dataset.need) el.classList.toggle('need', !el.value.trim()); },
          noop: () => {},
          plAdd: (S, el) => { const g = groups.find((x) => S.units[x.id].joined !== false); if (!g) return false; const P = S.units[g.id].plan; const sec = el.dataset.sec;
            const base = { store: GRP ? S.rentStore : part.codes[0], brand: g.members[0] };
            if (sec === 'rent') P.rent.push(Object.assign(base, { obj: F.rent.items[0] || '', val: '', from: 'Jan', to: 'Des', pay: set.semester ? 'Semester' : 'Yearly', files: [], pos: '' }));
            if (sec === 'act') P.act.push(Object.assign(base, { type: F.act.items[0] || '', on: true, val: '', note: '', from: 'Jan', to: 'Des' }));
            if (sec === 'oth') P.oth.push(Object.assign(base, { on: true, obj: '', val: '', note: '' })); },
          plBrand: (S, el) => { const [ng, b] = el.value.split('|'); const g = el.dataset.g; const list = S.units[g].plan[el.dataset.sec]; const row = list[Number(el.dataset.j)]; row.brand = b;
            if (ng !== g) { list.splice(Number(el.dataset.j), 1); S.units[ng].plan[el.dataset.sec].push(row); } },
          plDel: (S, el) => { S.units[el.dataset.g].plan[el.dataset.sec].splice(Number(el.dataset.j), 1); },
          plTg: (S, el) => { const x = S.units[el.dataset.g].plan[el.dataset.sec][Number(el.dataset.j)]; x.on = !x.on; },
          pl: (S, el) => { S.units[el.dataset.g].plan[el.dataset.sec][Number(el.dataset.j)][el.dataset.f] = el.value; },
          plRp: (S, el) => { S.units[el.dataset.g].plan[el.dataset.sec][Number(el.dataset.j)].val = L.fmtThousand(el.value); },
          plFile: (S, el) => { const f = el.files && el.files[0]; if (!f) return false; const x = S.units[el.dataset.g].plan.rent[Number(el.dataset.j)]; x.files = (x.files || []).concat(f.name); },
          plFileDel: (S, el) => { S.units[el.dataset.g].plan.rent[Number(el.dataset.j)].files.splice(Number(el.dataset.fi), 1); },
          rentStore: (S, el) => { S.rentStore = el.value; },
          draft: (S) => { saveReg(S, p, ch, part, r, viaExc, false); return false; },
          submit: (S) => { const e = saveReg(S, p, ch, part, r, viaExc, true); if (e) { S.err = e; } else return false; },
          cancel: () => { if (!confirm('Batalkan pendaftaran ini? Data pendaftaran tidak bisa diajukan lagi.')) return false; L.setStatus(r, 'CANCELLED', 'Dibatalkan CBD', UI.currentUser().id); DB.save(); flash('success', 'Pendaftaran dibatalkan.'); go('/pendaftaran'); return false; },
        }, sideOn(p, ch, part, r, mode, user, back)),
      });
    };
  }

  function saveReg(S, p, ch, part, r, viaExc, submit) {
    const user = UI.currentUser();
    if (!r) r = DB.insert(L.T.regs, { program_id: p.id, channel_id: ch.id, code: part.code, kind: part.kind, name: part.name, codes: part.codes.slice(), status: 'DRAFT', revision: 0,
      via_exception: viaExc, units: {}, reasons: {}, route: [], docs: { mou: '', files: {} }, review: { status: null, note: '' }, history: [], created_by: user.id, created_at: L.now(), updated_at: L.now() });
    r.units = clone(S.units); r.reasons = clone(S.reasons); r.codes = part.codes.slice(); r.updated_at = L.now();
    if (!submit) { if (r.status !== 'RETURNED') r.status = 'DRAFT'; DB.save(); flash('success', 'Draft pendaftaran disimpan.'); go(`/pendaftaran/form/${p.id}/${encodeURIComponent(part.code)}`); return null; }
    const { checks } = L.regCalc(r);
    const e = checks.filter((c) => c.kind === 'hard').map((c) => `${c.unit}: ${c.label}`).concat(checks.filter((c) => c.kind === 'appr' && !String(S.reasons[c.key] || '').trim()).map((c) => `${c.unit}: isi alasan (${c.label})`));
    if (e.length) { DB.save(); return e; }
    r.revision = (r.revision || 0) + 1; r.dc_return = null; r.route = L.makeRoute(r); r.submitted_at = L.now(); r.checks = checks;
    if (!r.route.some((s) => s.status === 'RUN')) { finishApproval(r); flash('success', 'Pendaftaran diajukan. Tidak ada layer approval yang berjalan: toko langsung menunggu generate MoU.'); }
    else { L.setStatus(r, 'IN_APPROVAL', r.revision > 1 ? 'Diajukan ulang' : 'Diajukan', user.id); const c = L.currentStep(r); flash('success', `<b>Pendaftaran diajukan.</b> Menunggu approval ${esc(L.ROLES[c.role] || c.role)}.`); }
    DB.save(); go('/pendaftaran'); return null;
  }
  function finishApproval(r) {
    r.dc_return = null;
    L.setStatus(r, 'MOU_PENDING', 'Approval selesai, menunggu generate MoU', null);
  }

  function sideOn(p, ch, part, r, mode, user, back) {
    const to = back ? back.slice(1) : null;
    return {
      cmt: (S, el) => { S.comment = el.value; },
      approve: (S) => { const s = L.currentStep(r); if (!s) return; Object.assign(s, { decision: 'APPROVED', by: user.id, at: L.now(), comment: S.comment.trim() });
        if (!L.currentStep(r)) { finishApproval(r); flash('success', `${esc(part.name)} disetujui. Toko menunggu generate MoU oleh Admin Sales DC.`); }
        else { const n = L.currentStep(r); r.updated_at = L.now(); flash('success', `${esc(part.name)} disetujui, diteruskan ke ${esc(L.ROLES[n.role] || n.role)}.`); }
        DB.save(); go('/approval'); return false; },
      return: (S) => { if (!S.comment.trim()) { alert('Isi komentar untuk CBD.'); return false; } const s = L.currentStep(r);
        Object.assign(s, { decision: 'RETURNED', by: user.id, at: L.now(), comment: S.comment.trim() }); L.setStatus(r, 'RETURNED', S.comment.trim(), user.id);
        DB.save(); flash('success', `${esc(part.name)} dikembalikan ke CBD.`); go('/approval'); return false; },
      mouDl: () => { L.downloadMou(r); return false; },
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
    return X.page(`Pendaftaran · ${part.name}`, regForm(p, ch, part, r, canEdit ? 'edit' : 'view', user));
  });

  // ---------------------------------------------------------------- Approval (antrian approver & reviewer dokumen)
  route('/approval', ({}, q, { user }) => {
    return L.page('Approval', (root) => {
      L.view(root, {
        state: { tab: 'mine' },
        html: (S) => {
          const mine = L.myQueue(user);
          const all = L.regs().filter((r) => r.status === 'IN_APPROVAL');
          const list = S.tab === 'mine' ? mine : all;
          const cols = 'grid-template-columns: 130px minmax(220px,2fr) 200px 160px 220px 130px;';
          return `<div class="col-f" style="gap:6px"><h1 class="title">Approval</h1><p class="muted" style="margin:0">Pendaftaran yang menunggu keputusan ${esc(UI.h.ROLE_LABEL[user.role] || user.role)}.</p></div>
            <div class="grid-auto"><div class="card pad-s"><span class="lbl up">Menunggu Anda</span><span class="kpi-v" style="color:#304DDE">${mine.length}</span><span class="muted xs">approval pendaftaran</span></div>
              <div class="card pad-s"><span class="lbl up">Semua dalam proses</span><span class="kpi-v">${all.length}</span><span class="muted xs">di semua approver</span></div></div>
            <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px"><div class="seg" role="group"><button type="button" class="${S.tab === 'mine' ? 'on' : ''}" data-on="tab" data-t="mine">Menunggu saya (${mine.length})</button><button type="button" class="${S.tab === 'all' ? 'on' : ''}" data-on="tab" data-t="all">Semua dalam proses (${all.length})</button></div>
              <div class="tblbox"><div style="min-width:1000px"><div class="gr" style="${cols}"><div class="th">Kode</div><div class="th">Toko / Customer Group</div><div class="th">Program · Channel</div><div class="th">Diajukan</div><div class="th">Tahap</div><div class="th">Aksi</div></div>
              ${list.map((r) => { const p = L.program(r.program_id); const ch = L.channel(r.channel_id); const cur = L.currentStep(r); const m = L.REG_STATUS[r.status]; const isMine = mine.includes(r);
                return `<div class="gr" style="${cols}"><div class="td b">${esc(r.code)}</div><div class="td c"><b>${esc(r.name)}</b><span class="muted">${esc(r.kind)}${r.via_exception ? ' · toko exception' : ''}</span></div>
                <div class="td c"><b>${esc(p.code)}</b><span class="muted">${esc(L.channelOf(ch.channel_code).name)}</span></div><div class="td c"><span>${L.dateTxt(r.submitted_at)}</span><span class="muted">${esc(userName(r.created_by))}</span></div>
                <div class="td c" style="gap:4px">${chip(m[0], m[1])}<span class="muted">${cur ? 'Di ' + esc(L.ROLES[cur.role] || cur.role) : ''}</span></div>
                <div class="td"><a class="btn sm ${isMine ? 'btn-p' : 'btn-s'}" href="#/approval/${r.id}">${isMine ? 'Putuskan' : 'Lihat'}</a></div></div>`; }).join('')
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
    const mode = mine ? 'approve' : 'view';
    return X.page(`Approval · ${r.name}`, regForm(p, ch, Object.assign({}, part, { codes: r.codes }), r, mode, user));
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
          const locked = (g) => L.regs().some((r) => r.code === g.code && ['IN_APPROVAL', 'MOU_PENDING', 'AWAITING_DOCS', 'DOC_REVIEW', 'DOC_REVISION'].includes(r.status));
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
