// Setup channel mengikuti mockup layar 7–15: fase Pendaftaran (Pengaturan · Matriks Kelas · Fixed Rebate Detail · Approval · MOU & Dokumen),
// fase Pencairan (Aturan Pencairan · Approval), fase tambahan (nama + approval), dan Simulasi.
(function () {
  const { route, go, flash, requireSetup } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, chip, sw, fp, fj, fr, pnum } = L;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const numOrNull = (v) => { const n = pnum(v); return isFinite(n) ? n : null; };
  const nv = (n) => (n === null || n === undefined || !isFinite(n) ? '' : String(n).replace('.', ','));
  const chName = (ch) => L.channelOf(ch.channel_code).name;

  // ---------------------------------------------------------------- builder approval (dipakai Pendaftaran, Pencairan, fase tambahan)
  const SAMPLE = {
    REGISTRATION: { GROWTH_YEARLY_MIN: '38', GROWTH_SEMESTER_MIN: '36', TOTAL_PCT_MAX: '3,5', TOTAL_TARGET: '4382', OUTSIDE_CLASS: true, VALUE_OVER_BUDGET: true },
    PAYOUT: { PAYOUT_TOTAL: '120', ACHIEVEMENT_MIN: '104', PAYOUT_ADJUSTED: false, FR_REALIZATION_DIFF: false },
    EXTRA: { SUBMISSION_TOTAL: '150', HAS_ADJUSTMENT: false },
  };
  const condList = (phase, p) => (L.COND[phase] || L.COND.EXTRA).filter(([code]) => code !== 'VALUE_OVER_BUDGET' || L.FR(p));
  function approvalHtml(S, phase, p, ro, title, desc) {
    const meta = L.condMeta(phase); const list = condList(phase, p);
    const n = S.layers.length;
    const steps = S.layers.map((l, i) => {
      const isIf = l.rule === 'IF';
      return `<div class="step"><div class="step-h"><span class="dot-n">${i + 1}</span>
        <label class="lbl row-f" style="margin:0">Approver<select class="inp sm" style="width:190px" data-chg="apRole" data-i="${i}">${Object.entries(L.ROLES).map(([k, v]) => `<option value="${k}" ${l.role === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></label>
        <div class="row-f"><span class="lbl">Wajib approve</span><div class="seg s" role="radiogroup" aria-label="Kapan approver wajib menyetujui">
          <button type="button" role="radio" aria-checked="${!isIf}" class="${isIf ? '' : 'on'}" data-on="apAlways" data-i="${i}">Selalu wajib</button>
          <button type="button" role="radio" aria-checked="${isIf}" class="${isIf ? 'on' : ''}" data-on="apIf" data-i="${i}">Hanya jika kondisi…</button></div></div>
        <span style="flex:1 1 auto"></span>
        <div class="row-f" style="gap:2px"><button type="button" class="x" aria-label="Naikkan layer" data-on="apUp" data-i="${i}" ${i === 0 ? 'disabled' : ''}>↑</button>
          <button type="button" class="x" aria-label="Turunkan layer" data-on="apDown" data-i="${i}" ${i === n - 1 ? 'disabled' : ''}>↓</button>
          <button type="button" class="x" aria-label="Hapus layer" data-on="apDel" data-i="${i}">${L.ico.trash}</button></div></div>
        ${isIf ? `<div class="conds"><div class="row-f sm">Berjalan jika<select class="inp sm" style="width:130px" data-chg="apMatch" data-i="${i}" aria-label="Cara menggabung kondisi"><option value="ANY" ${l.match === 'ANY' ? 'selected' : ''}>salah satu</option><option value="ALL" ${l.match === 'ALL' ? 'selected' : ''}>semua</option></select>kondisi berikut terpenuhi:</div>
          ${l.conds.map((c, j) => { const m = meta[c.code] || {}; return `<div class="row-f">
            <select class="inp sm" style="flex:1 1 280px" data-chg="apCode" data-i="${i}" data-j="${j}" aria-label="Kondisi">${list.map(([code, label]) => `<option value="${code}" ${c.code === code ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>
            ${m.type === 'num' ? `<select class="inp sm" style="width:72px" data-chg="apOp" data-i="${i}" data-j="${j}" aria-label="Operator">${Object.entries(L.OPS).map(([k, v]) => `<option value="${k}" ${c.op === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
              <input class="inp sm" style="width:120px" data-k="v${i}_${j}" data-chg="apVal" data-i="${i}" data-j="${j}" inputmode="decimal" value="${esc(c.val)}" aria-label="Nilai"><span class="muted xs" style="min-width:20px">${esc(m.unit.trim())}</span>` : ''}
            <button type="button" class="x" aria-label="Hapus kondisi" data-on="apCondDel" data-i="${i}" data-j="${j}">${L.ico.x}</button></div>`; }).join('')}
          ${!l.conds.length ? '<span class="warn-t">Tambahkan minimal satu kondisi.</span>' : ''}
          <button type="button" class="btn btn-g" style="align-self:flex-start" data-on="apCondAdd" data-i="${i}">+ Tambah kondisi</button></div>` : ''}
        <p class="sentence">${esc(L.sentenceOf(phase, l))}</p></div>`;
    }).join('');
    // pratinjau
    const used = []; S.layers.forEach((l) => { if (l.rule === 'IF') l.conds.forEach((c) => { if (!used.includes(c.code)) used.push(c.code); }); });
    const facts = {}; for (const code of used) { const m = meta[code]; const v = S.sample[code]; facts[code] = m && m.type === 'num' ? pnum(v) : !!v; }
    const rt = L.buildRoute(phase, S.layers, facts);
    const count = rt.filter((r) => r.status === 'RUN').length;
    return `<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">
      <section class="card pad" style="flex:999 1 560px;min-width:0"><div class="col-f" style="max-width:720px"><h2 class="h3">${title}</h2><span class="muted sm">${desc}</span></div>
        <fieldset ${ro ? 'disabled' : ''} style="display:flex;flex-direction:column;gap:16px;border:0;padding:0;margin:0;min-width:0">${steps || '<div class="muted">Belum ada layer.</div>'}
        <button type="button" class="btn btn-s" style="align-self:flex-start" data-on="apAdd">${L.ico.plus}Tambah Layer</button></fieldset>
        ${L.layersErrors(S.layers).length ? `<div class="note-r">${L.layersErrors(S.layers).map(esc).join('<br>')}</div>` : ''}</section>
      <aside class="card" style="flex:1 1 300px;min-width:0;padding:20px;display:flex;flex-direction:column;gap:14px">
        <div class="col-f"><h2 class="h3" style="font-size:16px">Pratinjau Layer Approval</h2><span class="muted sm">Isi contoh pengajuan untuk melihat layer yang berjalan.</span></div>
        ${used.length ? `<div style="display:flex;flex-direction:column;gap:10px;padding:12px 14px;border-radius:8px;background:#F8F9FD">${used.map((code) => { const m = meta[code]; if (!m) return '';
          return m.type === 'num' ? `<label class="lbl between" style="margin:0">${esc(m.label)}<input class="inp sm" style="width:96px" data-k="s_${code}" data-chg="apSample" data-code="${code}" inputmode="decimal" value="${esc(S.sample[code] === undefined ? '' : S.sample[code])}"></label>`
            : `<label class="row-f sm" style="margin:0;cursor:pointer"><input type="checkbox" data-chg="apFlag" data-code="${code}" ${S.sample[code] ? 'checked' : ''}><span>${esc(m.label)}</span></label>`; }).join('')}</div>` : ''}
        <div class="col-f" style="gap:0">${rt.map((r) => `<div class="row-f" style="gap:12px;align-items:flex-start;padding:10px 0;border-top:1px solid #EBEBEB;flex-wrap:nowrap">
          <span class="dot-n s ${r.status === 'RUN' ? '' : 'off'}">${r.n}</span><div class="col-f"><div class="row-f"><b>${esc(L.ROLES[r.role] || r.role)}</b>${r.status === 'RUN' ? chip('Wajib', 'c-blue') : r.status === 'MERGED' ? chip('Digabung dengan layer ' + r.mergedWith, 'c-grey') : chip('Dilewati', 'c-grey')}</div>
          <span class="muted xs">${esc(r.why)}</span></div></div>`).join('') || '<span class="muted sm">Belum ada layer.</span>'}</div>
        <span class="sm b">${count} approver untuk contoh ini.</span></aside></div>`;
  }
  function approvalOn(phase, p) {
    const firstCode = () => condList(phase, p)[0][0];
    const L_ = (S, el) => S.layers[Number(el.dataset.i)];
    return {
      apRole: (S, el) => { L_(S, el).role = el.value; },
      apAlways: (S, el) => { L_(S, el).rule = 'ALWAYS'; },
      apIf: (S, el) => { const l = L_(S, el); l.rule = 'IF'; if (!l.conds.length) l.conds.push({ code: firstCode(), op: 'gt', val: '' }); },
      apMatch: (S, el) => { L_(S, el).match = el.value; },
      apUp: (S, el) => { const i = Number(el.dataset.i); if (i > 0) [S.layers[i - 1], S.layers[i]] = [S.layers[i], S.layers[i - 1]]; },
      apDown: (S, el) => { const i = Number(el.dataset.i); if (i < S.layers.length - 1) [S.layers[i + 1], S.layers[i]] = [S.layers[i], S.layers[i + 1]]; },
      apDel: (S, el) => { S.layers.splice(Number(el.dataset.i), 1); },
      apAdd: (S) => { S.layers.push({ role: 'HEAD_FINANCE', rule: 'ALWAYS', match: 'ANY', conds: [] }); },
      apCondAdd: (S, el) => { L_(S, el).conds.push({ code: firstCode(), op: 'gt', val: '' }); },
      apCondDel: (S, el) => { L_(S, el).conds.splice(Number(el.dataset.j), 1); },
      apCode: (S, el) => { const c = L_(S, el).conds[Number(el.dataset.j)]; c.code = el.value; if (!c.op) c.op = 'gt'; },
      apOp: (S, el) => { L_(S, el).conds[Number(el.dataset.j)].op = el.value; },
      apVal: (S, el) => { L_(S, el).conds[Number(el.dataset.j)].val = el.value; },
      apSample: (S, el) => { S.sample[el.dataset.code] = el.value; },
      apFlag: (S, el) => { S.sample[el.dataset.code] = el.checked; },
    };
  }
  const cleanLayers = (layers, phase) => { const meta = L.condMeta(phase); return layers.map((l) => ({ role: l.role, rule: l.rule, match: l.match || 'ANY',
    conds: l.rule === 'IF' ? l.conds.map((c) => ({ code: c.code, op: (meta[c.code] || {}).type === 'num' ? c.op || 'gt' : '', val: (meta[c.code] || {}).type === 'num' ? String(c.val).trim() : '', type: (meta[c.code] || {}).type })) : [] })); };

  // ---------------------------------------------------------------- tab Pendaftaran
  const TAB = {};
  TAB.settings = {
    init: (p, ch) => ({ s: clone(ch.settings), dlg: null, copied: null, applied: '', src: null, parts: { matrix: true, fr: true, appr: true }, what: { mech: true, min: true }, pick: {} }),
    data: (S) => S.s,
    html: (S, p, ch, ro) => {
      const s = S.s; const FRon = L.FR(p);
      const banner = (S.copied ? `<div class="note-g" role="status"><span><b>Setup disalin dari ${esc(S.copied.from)}:</b> ${esc(S.copied.parts)}. Silakan cek tiap tab sebelum publikasi.</span><button type="button" class="btn btn-g" style="color:#1D5935" data-on="hideBanner">Tutup</button></div>` : '')
        + (S.applied ? `<div class="note-g" role="status"><span><b>Pengaturan diterapkan</b> ke ${esc(S.applied)}.</span><button type="button" class="btn btn-g" style="color:#1D5935" data-on="hideBanner">Tutup</button></div>` : '');
      const rowSw = (key, title, desc, extra = '') => `<div class="row-f box" style="gap:14px 24px;justify-content:space-between;padding:14px 16px;border-radius:8px">
        <div class="row-f" style="gap:14px;align-items:flex-start;flex:1 1 360px;flex-wrap:nowrap">${sw(s[key], `data-on="tg_${key}" aria-label="${esc(title)}"`)}<div class="col-f"><span class="b">${title}</span><span class="muted sm">${desc}</span></div></div>${extra}</div>`;
      return `${banner}
        <section class="card pad" style="flex-direction:row;flex-wrap:wrap;justify-content:space-between;align-items:center"><div class="col-f" style="flex:1 1 420px"><h2 class="h3">Salin Setup</h2></div>
          <button class="btn btn-s" type="button" data-on="openCopy" ${ro ? 'disabled' : ''}>${L.ico.copy}Salin Setup dari Channel Lain</button></section>
        <fieldset ${ro ? 'disabled' : ''} style="display:flex;flex-direction:column;gap:20px;border:0;padding:0;margin:0;min-width:0">
        <section class="card pad"><div class="between"><h2 class="h3">Mekanisme</h2><button type="button" class="btn btn-g" data-on="openApply">Terapkan juga ke channel lain…</button></div>
          ${rowSw('semester', 'Semester rebate', 'CBD mengisi growth S1 / S2, semester %, dan pembagian batas cair S1 / S2 di form pendaftaran.',
            s.semester ? `<label class="field lbl" style="width:240px;margin:0">Min. alokasi batas cair per semester %<input class="inp" data-k="alloc" data-chg="alloc" inputmode="decimal" value="${nv(s.alloc_min)}"></label>` : '')}
</section>
        <section class="card pad"><div class="col-f" style="max-width:760px"><h2 class="h3">Batas Minimum Rate</h2>
          <span class="muted sm">Opsional, kosongkan jika tidak ada batas. Batas maksimum mengikuti tier di Matriks Kelas: ${[s.semester && 'semester %', s.yearly && 'yearly %', FRon && 'fixed rebate %'].filter(Boolean).join(' + ') || '—'} per group brand per kelas.</span></div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
            ${s.yearly ? `<label class="field lbl" style="margin:0">Yearly % min<input class="inp" data-k="mY" data-chg="minY" value="${nv(s.min_yearly)}" placeholder="Tanpa batas" inputmode="decimal"></label>` : ''}
            ${FRon ? `<label class="field lbl" style="margin:0">${esc(L.frName(p))} % min<input class="inp" data-k="mF" data-chg="minF" value="${nv(s.min_fr)}" placeholder="Tanpa batas" inputmode="decimal"></label>` : ''}
            ${s.semester ? `<label class="field lbl" style="margin:0">Semester % min<input class="inp" data-k="mS" data-chg="minS" value="${nv(s.min_sem)}" placeholder="Tanpa batas" inputmode="decimal"></label>` : ''}</div></section></fieldset>
        ${S.dlg === 'copy' ? copyDlg(S, p, ch) : ''}${S.dlg === 'apply' ? applyDlg(S, p, ch) : ''}`;
    },
    on: (p, ch) => ({
      tg_semester: (S) => { S.s.semester = !S.s.semester; },
      alloc: (S, el) => { S.s.alloc_min = numOrNull(el.value); },
      minY: (S, el) => { S.s.min_yearly = numOrNull(el.value); },
      minF: (S, el) => { S.s.min_fr = numOrNull(el.value); },
      minS: (S, el) => { S.s.min_sem = numOrNull(el.value); },
      hideBanner: (S) => { S.copied = null; S.applied = ''; },
      openCopy: (S) => { S.dlg = 'copy'; const src = L.channels(p.id).find((c) => c.id !== ch.id && copyParts(p, c).length); S.src = src ? src.id : null; },
      openApply: (S) => { S.dlg = 'apply'; },
      closeDlg: (S) => { S.dlg = null; },
      cpSrc: (S, el) => { S.src = Number(el.value); },
      cpPart: (S, el) => { S.parts[el.dataset.key] = el.checked; },
      cpGo: (S) => {
        const src = L.channel(S.src); if (!src) return;
        const avail = copyParts(p, src); const picked = avail.filter((k) => S.parts[k]);
        if (picked.includes('matrix')) { ch.matrix = clone(src.matrix); ch.saved.matrix = true; }
        if (picked.includes('fr')) { ch.fr = clone(src.fr); ch.saved.fr = true; }
        if (picked.includes('appr')) { ch.layers.REGISTRATION = clone(src.layers.REGISTRATION); ch.saved.approval = true; }
        const label = picked.map((k) => ({ matrix: 'Matriks Kelas', fr: 'Fixed Rebate Detail', appr: 'Approval' })[k]).join(', ');
        L.audit(ch, 'Salin setup', `${label} dari ${chName(src)}`); DB.save();
        S.copied = { from: chName(src), parts: label }; S.dlg = null;
      },
      apWhat: (S, el) => { S.what[el.dataset.key] = el.checked; },
      apPick: (S, el) => { S.pick[el.dataset.id] = el.checked; },
      apGo: (S) => {
        const targets = L.channels(p.id).filter((c) => c.id !== ch.id && L.editable(c) && S.pick[c.id]);
        for (const t of targets) {
          if (S.what.mech) Object.assign(t.settings, { semester: S.s.semester, yearly: true, alloc_min: S.s.alloc_min });
          if (S.what.min) Object.assign(t.settings, { min_yearly: S.s.min_yearly, min_fr: S.s.min_fr, min_sem: S.s.min_sem });
          t.saved.settings = true; L.audit(t, 'Pengaturan diterapkan', `Dari ${chName(ch)}`);
        }
        DB.save(); S.applied = targets.map(chName).join(', '); S.dlg = null;
      },
    }),
    save: (S, p) => {
      const s = S.s; const e = [];
      if (s.semester && !(s.alloc_min > 0 && s.alloc_min <= 50)) e.push('Min. alokasi batas cair per semester harus di antara 0 dan 50%.');
      return e;
    },
    commit: (S, p, ch) => { ch.settings = Object.assign(clone(S.s), { yearly: true }); }, // yearly rebate selalu aktif (tanpa toggle)
  };
  const copyParts = (p, c) => ['matrix', 'fr', 'appr'].filter((k) => (k !== 'fr' || L.FR(p)) && (k === 'matrix' ? L.tabDone(p, c, 'matrix') : k === 'fr' ? c.saved.fr : L.tabDone(p, c, 'approval')));
  function copyDlg(S, p, ch) {
    const others = L.channels(p.id).filter((c) => c.id !== ch.id);
    const PN = { matrix: ['Matriks Kelas', 'Kelas, baseline, tier, growth, dan rate tiap group brand'], fr: ['Fixed Rebate Detail', 'Visibility rent, aktivitas, dan lainnya beserta daftar pilihannya'], appr: ['Approval', 'Layer approver, aturan berjalan, dan kondisinya'] };
    const src = L.channel(S.src); const avail = src ? copyParts(p, src) : [];
    const picked = avail.filter((k) => S.parts[k]);
    const body = `<span class="muted sm">Bagian yang dipilih akan mengganti setup ${esc(chName(ch))} saat ini.</span>
      <div class="field"><span class="lbl">1 · Channel sumber</span><div class="box">${others.map((c) => { const a = copyParts(p, c); const lock = !a.length; const st = L.channelStatus(p, c);
        return `<label class="ck ${lock ? 'lock' : ''}"><input type="radio" name="cpsrc" value="${c.id}" data-chg="cpSrc" ${S.src === c.id ? 'checked' : ''} ${lock ? 'disabled' : ''}>
          <span class="col-f" style="flex:1;gap:2px"><b>${esc(chName(c))}</b><span class="muted xs">${lock ? 'Belum ada setup yang bisa disalin' : a.map((k) => PN[k][0]).join(' · ') + ' sudah disetup'}</span></span>${chip(L.STATUS_CHIP[st][0], L.STATUS_CHIP[st][1] + ' s')}</label>`; }).join('')}</div></div>
      ${src ? `<div class="field"><span class="lbl">2 · Bagian yang disalin dari ${esc(chName(src))}</span><div class="box">${['matrix', 'fr', 'appr'].filter((k) => k !== 'fr' || L.FR(p)).map((k) => { const ok = avail.includes(k);
        return `<label class="ck ${ok ? '' : 'lock'}"><input type="checkbox" data-chg="cpPart" data-key="${k}" ${ok && S.parts[k] ? 'checked' : ''} ${ok ? '' : 'disabled'}><span class="col-f" style="flex:1;gap:2px"><b>${PN[k][0]}</b><span class="muted xs">${PN[k][1]}</span></span>${chip(ok ? 'Sudah disetup' : 'Belum disetup', (ok ? 'c-green' : 'c-grey') + ' s')}</label>`; }).join('')}</div></div>` : ''}
      <div class="note-y">Pengaturan (mekanisme dan batas minimum rate) serta MOU &amp; Dokumen tidak ikut disalin. Setelah disalin, setup tetap bisa diubah per tab.</div>`;
    return L.dialog('Salin Setup dari Channel Lain', body, `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="cpGo" ${picked.length ? '' : 'disabled'}>${picked.length ? `Salin ${picked.length} bagian ke ${esc(chName(ch))}` : 'Pilih bagian yang disalin'}</button>`, 'w680');
  }
  function applyDlg(S, p, ch) {
    const s = S.s; const others = L.channels(p.id).filter((c) => c.id !== ch.id);
    const chosen = others.filter((c) => L.editable(c) && S.pick[c.id]);
    const minTxt = [s.yearly && `Yearly ${s.min_yearly === null ? 'tanpa batas' : fp(s.min_yearly) + '%'}`, L.FR(p) && `${esc(L.frName(p))} ${s.min_fr === null ? 'tanpa batas' : fp(s.min_fr) + '%'}`, s.semester && `Semester ${s.min_sem === null ? 'tanpa batas' : fp(s.min_sem) + '%'}`].filter(Boolean).join(' · ');
    const body = `<span class="muted sm">Salin pengaturan ${esc(chName(ch))} ke channel lain di program ini. Nilai di channel tujuan akan diganti.</span>
      <div class="field"><span class="lbl">Yang diterapkan</span><div class="box">
        <label class="ck"><input type="checkbox" data-chg="apWhat" data-key="mech" ${S.what.mech ? 'checked' : ''}><span class="col-f" style="gap:0"><b>Mekanisme</b><span class="muted xs">Semester ${s.semester ? `aktif · min. alokasi ${nv(s.alloc_min)}%` : 'tidak aktif'}</span></span></label>
        <label class="ck"><input type="checkbox" data-chg="apWhat" data-key="min" ${S.what.min ? 'checked' : ''}><span class="col-f" style="gap:0"><b>Batas minimum rate</b><span class="muted xs">${minTxt || '—'}</span></span></label></div></div>
      <div class="field"><span class="lbl">Channel tujuan · ${chosen.length} dipilih</span><div class="box">${others.map((c) => { const lock = !L.editable(c); const st = L.channelStatus(p, c);
        return `<label class="ck ${lock ? 'lock' : ''}"><input type="checkbox" data-chg="apPick" data-id="${c.id}" ${!lock && S.pick[c.id] ? 'checked' : ''} ${lock ? 'disabled' : ''}><span class="col-f" style="flex:1;gap:0"><span>${esc(chName(c))}</span><span class="muted xs">${lock ? 'Pendaftaran sudah dibuka, pengaturan tidak bisa diubah' : S.pick[c.id] ? 'Pengaturan akan diganti' : 'Tidak berubah'}</span></span>${chip(L.STATUS_CHIP[st][0], L.STATUS_CHIP[st][1] + ' s')}</label>`; }).join('')}</div></div>`;
    return L.dialog('Terapkan Pengaturan ke Channel Lain', body, `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="apGo" ${chosen.length && (S.what.mech || S.what.min) ? '' : 'disabled'}>Terapkan ke ${chosen.length} channel</button>`);
  }

  // ---- Matriks Kelas
  TAB.matrix = {
    init: (p, ch) => ({ m: clone(ch.matrix), g: (L.groupsOf(p)[0] || {}).id, dlg: null, imp: null }),
    data: (S) => S.m,
    html: (S, p, ch, ro) => {
      const FRon = L.FR(p); const s = ch.settings; const g = L.groupsOf(p).find((x) => x.id === S.g) || L.groupsOf(p)[0];
      if (!g) return '<section class="card pad muted">Program belum punya group brand.</section>';
      const cls = S.m[g.id] || [];
      const cols = `grid-template-columns: 96px 230px ${FRon ? '90px ' : ''}64px 104px 110px ${s.semester ? '92px ' : ''}${s.yearly ? '92px ' : ''}minmax(100px,1fr) 44px;`;
      const errs = L.matrixErrors(p, Object.assign({}, ch, { matrix: S.m }));
      const tierCount = cls.reduce((a, k) => a + k.tiers.length, 0);
      const rows = cls.map((k, ci) => k.tiers.map((t, ti) => {
        const tot = (s.semester ? t.sem || 0 : 0) + (s.yearly ? t.yr || 0 : 0) + (FRon ? k.fr || 0 : 0);
        const nx = k.tiers[ti + 1];
        return `<div class="gr" style="${cols} border-top:1px solid ${ti === 0 ? '#C4CAD0' : '#EBEBEB'};${ci % 2 ? 'background:#FCFCFE;' : ''}">
          <div class="td c" style="gap:4px">${ti === 0 ? `<input class="cell l w64" style="font-weight:700;font-size:14px" data-k="c${ci}" data-chg="mCode" data-c="${ci}" value="${esc(k.code)}" aria-label="Kode kelas">
            <span class="row-f" style="gap:0"><button type="button" class="btn btn-g" style="padding:0 4px;font-size:12px" data-on="mTierAdd" data-c="${ci}">+ Tier</button><button type="button" class="x" title="Hapus kelas" aria-label="Hapus kelas ${esc(k.code)}" data-on="mClsDel" data-c="${ci}">${L.ico.trash}</button></span>` : ''}</div>
          <div class="td">${ti === 0 ? `<input class="cell w64" data-k="bmin${ci}" data-chg="mBmin" data-c="${ci}" value="${nv(k.bmin)}" aria-label="Baseline min (jt)"><span class="muted">–</span><input class="cell w64" data-k="bmax${ci}" data-chg="mBmax" data-c="${ci}" value="${nv(k.bmax)}" placeholder="∞" aria-label="Baseline maks (jt)">` : ''}</div>
          ${FRon ? `<div class="td">${ti === 0 ? `<input class="cell w64" data-k="fr${ci}" data-chg="mFr" data-c="${ci}" value="${nv(k.fr)}" aria-label="Fixed rebate %">` : ''}</div>` : ''}
          <div class="td">${chip('Tier ' + (ti + 1), 'c-blue')}</div>
          <div class="td"><input class="cell w64" data-k="g${ci}_${ti}" data-chg="mG" data-c="${ci}" data-t="${ti}" value="${nv(t.g)}" aria-label="Growth mulai"></div>
          <div class="td muted" title="Otomatis dari growth mulai tier berikutnya">${nx ? '< ' + nv(nx.g) + '%' : 'dan seterusnya'}</div>
          ${s.semester ? `<div class="td"><input class="cell w64" data-k="s${ci}_${ti}" data-chg="mSem" data-c="${ci}" data-t="${ti}" value="${nv(t.sem)}" aria-label="Semester %"></div>` : ''}
          ${s.yearly ? `<div class="td"><input class="cell w64" data-k="y${ci}_${ti}" data-chg="mYr" data-c="${ci}" data-t="${ti}" value="${nv(t.yr)}" aria-label="Yearly %"></div>` : ''}
          <div class="td b">${isFinite(tot) ? fp(tot) + '%' : '—'}</div>
          <div class="td">${k.tiers.length > 1 ? `<button type="button" class="x" aria-label="Hapus tier" data-on="mTierDel" data-c="${ci}" data-t="${ti}">${L.ico.x}</button>` : ''}</div></div>`;
      }).join('')).join('');
      return `<div class="between"><div class="col-f" style="max-width:640px"><h2 class="h3">Matriks Kelas</h2><p class="muted" style="margin:0">Matriks khusus ${esc(chName(ch))}. Kelas ditentukan oleh baseline per bulan (sebelum growth), tier oleh growth. Rate tier menjadi rekomendasi, dan jumlahnya menjadi batas total rebate.</p></div>
          <div class="row-f"><button class="btn btn-s" type="button" data-on="tpl">Unduh Template</button><button class="btn btn-p" type="button" data-on="openImp" ${ro ? 'disabled' : ''}>Impor Excel</button></div></div>
        <section class="card" style="padding:20px;display:flex;flex-direction:column;gap:16px">
          <div class="between" style="align-items:flex-end"><div class="field"><span class="lbl">Group Brand</span><div class="seg" role="group" aria-label="Pilih group brand">${L.groupsOf(p).map((x) => `<button type="button" class="${x.id === g.id ? 'on' : ''}" data-on="mGroup" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div></div>
            <div class="row-f">${chip(`${cls.length} kelas · ${tierCount} tier · ${chName(ch)}`, 'c-grey')}${chip(`${errs.length} error`, errs.length ? 'c-red' : 'c-green')}</div></div>
          <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;min-width:0;display:flex;flex-direction:column;gap:12px">
          <div class="tblbox" data-keep-scroll><div style="min-width:${880 + (FRon ? 90 : 0)}px">
            <div class="gr" style="${cols}"><div class="th">Kelas</div><div class="th">Baseline / bulan (Rp jt)</div>${FRon ? `<div class="th">${esc(L.frName(p))} %</div>` : ''}<div class="th">Tier</div><div class="th">Growth mulai %</div><div class="th">Growth sampai</div>${s.semester ? '<div class="th">Semester %</div>' : ''}${s.yearly ? '<div class="th">Yearly %</div>' : ''}<div class="th">Total maks %</div><div class="th"></div></div>
            ${rows || '<div class="td muted" style="justify-content:center;padding:20px">Belum ada kelas untuk group brand ini.</div>'}</div></div>
          <button type="button" class="btn btn-s" style="align-self:flex-start" data-on="mClsAdd">${L.ico.plus}Tambah kelas</button></fieldset>
          <p class="muted xs" style="margin:0">Baseline: min ≤ baseline &lt; maks; kosongkan maks untuk kelas tertinggi. Growth sampai dihitung otomatis dari growth mulai tier berikutnya. Total maks = ${[s.semester && 'semester', s.yearly && 'yearly', FRon && 'fixed rebate'].filter(Boolean).join(' + ')}, dan menjadi batas total rebate CBD untuk kelas dan tier ini.</p>
          ${errs.length ? `<div class="note-r"><b>Belum valid</b><ul>${errs.slice(0, 12).map((e) => `<li>${esc(e)}</li>`).join('')}${errs.length > 12 ? `<li>dan ${errs.length - 12} lainnya</li>` : ''}</ul></div>` : ''}
        </section>${S.dlg === 'imp' ? importDlg(S, p, ch) : ''}`;
    },
    on: (p, ch) => {
      const K = (S, el) => S.m[S.g][Number(el.dataset.c)];
      const Tt = (S, el) => K(S, el).tiers[Number(el.dataset.t)];
      return {
        mGroup: (S, el) => { S.g = el.dataset.g; },
        mCode: (S, el) => { K(S, el).code = el.value.trim().toUpperCase(); },
        mBmin: (S, el) => { K(S, el).bmin = numOrNull(el.value); },
        mBmax: (S, el) => { K(S, el).bmax = numOrNull(el.value); },
        mFr: (S, el) => { K(S, el).fr = numOrNull(el.value); },
        mG: (S, el) => { Tt(S, el).g = numOrNull(el.value); },
        mSem: (S, el) => { Tt(S, el).sem = numOrNull(el.value); },
        mYr: (S, el) => { Tt(S, el).yr = numOrNull(el.value); },
        mClsAdd: (S) => {
          const cls = S.m[S.g] = S.m[S.g] || []; const last = cls[cls.length - 1];
          if (last && last.bmax === null) last.bmax = last.bmin !== null ? last.bmin * 2 : null;
          cls.push({ code: String.fromCharCode(65 + cls.length), bmin: last ? last.bmax : null, bmax: null, fr: last ? last.fr : null,
            tiers: last ? clone(last.tiers) : [{ g: 20, sem: 0.5, yr: 1 }, { g: 25, sem: 0.75, yr: 1.25 }, { g: 30, sem: 1, yr: 1.5 }] });
        },
        mClsDel: (S, el) => { if (confirm('Hapus kelas ini beserta tier-nya?')) S.m[S.g].splice(Number(el.dataset.c), 1); },
        mTierAdd: (S, el) => { const k = K(S, el); const t = k.tiers[k.tiers.length - 1] || { g: 15, sem: 0.25, yr: 0.75 }; k.tiers.push({ g: (t.g || 0) + 5, sem: t.sem, yr: t.yr }); },
        mTierDel: (S, el) => { K(S, el).tiers.splice(Number(el.dataset.t), 1); },
        tpl: () => {
          const s = ch.settings; const rows = [['Group brand', 'Kelas', 'Baseline min (jt)', 'Baseline maks (jt)', 'Fixed rebate %', 'Tier', 'Growth mulai %', 'Semester %', 'Yearly %']];
          for (const g of L.groupsOf(p)) for (const k of (ch.matrix[g.id] || [])) k.tiers.forEach((t, i) => rows.push([g.name, k.code, k.bmin, k.bmax === null ? '' : k.bmax, L.FR(p) ? k.fr : '', i + 1, t.g, s.semester ? t.sem : '', s.yearly ? t.yr : '']));
          if (rows.length === 1) for (const g of L.groupsOf(p)) rows.push([g.name, 'A', '', '', '', 1, '', '', '']);
          UI.download(`template-matriks-${ch.channel_code.toLowerCase()}.csv`, UI.toCsv(rows), 'text/csv'); return false;
        },
        openImp: (S) => { S.dlg = 'imp'; S.imp = null; },
        closeDlg: (S) => { S.dlg = null; S.imp = null; },
        impFile: (S, el) => {
          const f = el.files && el.files[0]; if (!f) return false;
          const rd = new FileReader();
          rd.onload = () => { S.imp = parseMatrix(p, ch, UI.parseCsv(String(rd.result)), f); root().__lpPaint(); };
          rd.readAsText(f); return false;
        },
        impReset: (S) => { S.imp = null; },
        impGo: (S) => { Object.assign(S.m, clone(S.imp.matrix)); S.dlg = null; S.imp = null; },
      };
    },
    save: (S, p, ch) => L.matrixErrors(p, Object.assign({}, ch, { matrix: S.m })),
    softSave: true,
    commit: (S, p, ch) => { ch.matrix = clone(S.m); },
  };
  const root = () => document.querySelector('#app .lp');
  function parseMatrix(p, ch, rows, file) {
    const out = { file: file.name, size: Math.round(file.size / 1024) || 1, total: 0, bad: [], matrix: {} };
    const body = rows.slice(1); out.total = body.length;
    const byName = Object.fromEntries(L.groupsOf(p).map((g) => [g.name.toLowerCase(), g]));
    const tmp = {};
    body.forEach((r, i) => {
      const line = i + 2; const [gname, code, bmin, bmax, frp, tier, g, sem, yr] = r;
      const grp = byName[String(gname || '').toLowerCase()];
      const problem = (msg) => out.bad.push({ line, data: `${gname || '?'} · ${code || '?'} · tier ${tier || '?'}`, msg });
      if (!grp) return problem(`Group brand "${gname}" tidak ada di program`);
      if (!code) return problem('Kelas kosong');
      const n = (v) => numOrNull(v);
      if (n(bmin) === null) return problem('Baseline min kosong / bukan angka');
      if (n(g) === null) return problem('Growth mulai kosong / bukan angka');
      const cls = (tmp[grp.id] = tmp[grp.id] || []); let k = cls.find((x) => x.code === code.toUpperCase());
      if (!k) { k = { code: code.toUpperCase(), bmin: n(bmin), bmax: n(bmax), fr: n(frp), tiers: [] }; cls.push(k); }
      else if (k.bmin !== n(bmin) || k.bmax !== n(bmax) || k.fr !== n(frp)) return problem('Kolom kelas (baseline, fixed rebate %) berbeda dengan baris lain kelas yang sama');
      k.tiers.push({ g: n(g), sem: n(sem), yr: n(yr), _no: Number(tier) || k.tiers.length + 1 });
    });
    for (const id of Object.keys(tmp)) { tmp[id].sort((a, b) => a.bmin - b.bmin); tmp[id].forEach((k) => { k.tiers.sort((a, b) => a._no - b._no); k.tiers.forEach((t) => delete t._no); }); }
    const merged = Object.assign(clone(ch.matrix), tmp);
    const errs = L.matrixErrors(p, Object.assign({}, ch, { matrix: merged })).filter((e) => Object.keys(tmp).some((id) => e.startsWith(L.groupsOf(p).find((g) => g.id === id).name)));
    errs.forEach((m) => out.bad.push({ line: '—', data: 'Matriks', msg: m }));
    out.matrix = tmp; out.groups = Object.keys(tmp).length;
    return out;
  }
  function importDlg(S, p, ch) {
    const im = S.imp;
    const step = (n, title, desc, inner) => `<div class="row-f box" style="gap:12px;align-items:flex-start;padding:14px 16px;border-radius:8px;background:#F8F9FD;flex-wrap:nowrap">
      <span class="dot-n s">${n}</span><div class="col-f" style="gap:10px;flex:1"><div class="col-f" style="gap:0"><b>${title}</b><span class="muted sm">${desc}</span></div>${inner}</div></div>`;
    const res = im ? `<div class="between box" style="padding:10px 12px;background:#fff"><span class="sm"><b>${esc(im.file)}</b> <span class="muted">· ${im.size} KB · diunggah</span></span><button type="button" class="btn btn-g" data-on="impReset">Ganti file</button></div>
      ${im.bad.length ? `<div class="note-r"><b>${im.bad.length} masalah ditemukan</b><br>Perbaiki baris di bawah lalu unggah ulang. Impor hanya berjalan jika semua baris valid.</div>` : `<div class="note-g"><span><b>Semua baris valid.</b> ${im.groups} group brand akan diganti matriksnya.</span></div>`}
      <div class="g2" style="grid-template-columns:repeat(3,minmax(0,1fr))"><div class="box" style="padding:12px 14px;border-radius:8px"><div class="lbl">TOTAL BARIS</div><div style="font-size:24px;font-weight:700;line-height:32px">${im.total}</div></div>
        <div class="box" style="padding:12px 14px;border-radius:8px"><div class="lbl">VALID</div><div style="font-size:24px;font-weight:700;line-height:32px;color:#267346">${im.total - im.bad.filter((b) => b.line !== '—').length}</div></div>
        <div class="box" style="padding:12px 14px;border-radius:8px"><div class="lbl">TIDAK VALID</div><div style="font-size:24px;font-weight:700;line-height:32px;color:#B80016">${im.bad.length}</div></div></div>
      ${im.bad.length ? `<div class="tblbox"><div class="gr" style="display:grid;grid-template-columns:70px 200px minmax(220px,1fr)"><div class="th">Baris</div><div class="th">Data</div><div class="th">Masalah</div>
        ${im.bad.map((b) => `<div class="td">${b.line}</div><div class="td">${esc(b.data)}</div><div class="td" style="color:#8A0011">${esc(b.msg)}</div>`).join('')}</div></div>` : ''}`
      : `<label style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 16px;border:2px dashed #C4CAD0;border-radius:8px;background:#fff;text-align:center;cursor:pointer;margin:0">
        <span class="b">Pilih file template terisi</span><span class="muted sm">Format .csv (simpan dari Excel sebagai CSV)</span><input type="file" accept=".csv,text/csv" data-chg="impFile" style="max-width:240px"></label>`;
    const body = step(1, 'Unduh template matriks', `Kolom: Group brand, Kelas, Baseline min, Baseline maks, ${esc(L.frName(p) || 'Fixed rebate')} %, Tier, Growth mulai %, Semester %, Yearly %.`, '<button type="button" class="btn btn-s" style="align-self:flex-start" data-on="tpl">Unduh Template</button>')
      + step(2, 'Unggah file terisi &amp; validasi', 'File langsung divalidasi setelah diunggah.', res);
    return L.dialog('Impor Matriks Kelas', body, `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="impGo" ${im && !im.bad.length ? '' : 'disabled'}>Impor</button>`, 'w720');
  }

  // ---- Fixed Rebate Detail
  TAB.fr = {
    init: (p, ch) => ({ f: clone(ch.fr), draft: { rent: '', act: '' } }),
    data: (S) => S.f,
    html: (S, p, ch, ro) => {
      if (!L.FR(p)) return '<div class="card pad" style="border:1px dashed #C4CAD0;box-shadow:none"><b>Program ini tidak memakai fixed rebate.</b><span class="muted sm">Tab Fixed Rebate Detail disembunyikan dan form pendaftaran CBD tidak menampilkan isian fixed rebate.</span></div>';
      const meta = [['rent', 'Visibility Rent', 'Objek sewa, nilai (Rp) dan periode. Nilai selalu wajib.', 'Objek sewa', 'Nama objek baru'], ['act', 'Aktivitas', 'Jenis aktivitas dan periode. CBD memilih bernilai (Rp) atau teks.', 'Jenis aktivitas', 'Nama jenis baru']];
      const cards = meta.map(([k, title, rule, lbl, add]) => { const x = S.f[k];
        return `<section class="card" style="padding:18px 20px;display:flex;flex-direction:column;gap:14px;min-width:0">
          <div class="between" style="align-items:flex-start"><div class="col-f" style="gap:2px"><h3 class="h4">${title}</h3><span class="muted xs">${rule}</span></div>
            <div class="row-f lbl" style="flex-wrap:nowrap"><span>${x.on ? 'Tampil' : 'Disembunyikan'}</span>${sw(x.on, `data-on="frTg" data-key="${k}" aria-label="Tampilkan ${title} di pendaftaran"`)}</div></div>
          ${x.on ? `<div class="field"><span class="lbl">${lbl} · ${x.items.length} pilihan</span><div class="tblbox">
            ${x.items.map((it, j) => `<div class="orow"><span class="onum">${j + 1}</span><input class="oin" data-k="${k}${j}" data-chg="frRen" data-key="${k}" data-j="${j}" value="${esc(it)}" aria-label="${lbl}"><button type="button" class="x" aria-label="Hapus" data-on="frDel" data-key="${k}" data-j="${j}">${L.ico.trash}</button></div>`).join('')}
            <div class="orow add"><span class="onum">+</span><input class="oin" data-k="${k}new" data-inp="frDraft" data-key="${k}" value="${esc(S.draft[k])}" placeholder="${add}" aria-label="${add}"><button type="button" class="btn btn-s sm" style="height:32px" data-on="frAdd" data-key="${k}">Tambah</button></div></div></div>`
          : '<span class="muted sm" style="padding:12px 14px;border:1px dashed #D6D6D6;border-radius:8px">Tidak tampil di form pendaftaran. Daftar pilihan tetap tersimpan.</span>'}</section>`; }).join('');
      return `<div class="col-f" style="max-width:760px"><h2 class="h3">${esc(L.frName(p))} Detail</h2><span class="muted sm">Pilih bagian yang tampil di form pendaftaran bagian fixed rebate dan atur daftar pilihannya.</span></div>
        <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;min-width:0"><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;align-items:start">${cards}
          <section class="card" style="grid-column:1/-1;padding:18px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div class="col-f" style="gap:2px"><h3 class="h4">Lainnya</h3><span class="muted xs">Isian bebas. CBD dapat memilih bernilai (objek + Rp) atau teks saja.</span></div>
            <div class="row-f lbl"><span>${S.f.oth.on ? 'Tampil' : 'Disembunyikan'}</span>${sw(S.f.oth.on, 'data-on="frTg" data-key="oth" aria-label="Tampilkan Lainnya di pendaftaran"')}</div></section></div></fieldset>`;
    },
    on: () => ({
      frTg: (S, el) => { S.f[el.dataset.key].on = !S.f[el.dataset.key].on; },
      frRen: (S, el) => { S.f[el.dataset.key].items[Number(el.dataset.j)] = el.value; },
      frDel: (S, el) => { S.f[el.dataset.key].items.splice(Number(el.dataset.j), 1); },
      frDraft: (S, el) => { S.draft[el.dataset.key] = el.value; },
      frAdd: (S, el) => { const k = el.dataset.key; const v = S.draft[k].trim(); if (v) { S.f[k].items.push(v); S.draft[k] = ''; } },
    }),
    save: (S) => { const e = []; for (const k of ['rent', 'act']) if (S.f[k].on && !S.f[k].items.filter((x) => x.trim()).length) e.push(`${k === 'rent' ? 'Visibility Rent' : 'Aktivitas'}: tambahkan minimal satu pilihan.`); return e; },
    commit: (S, p, ch) => { for (const k of ['rent', 'act']) S.f[k].items = S.f[k].items.map((x) => x.trim()).filter(Boolean); ch.fr = clone(S.f); },
  };

  // ---- Approval Pendaftaran
  const apTab = (phase, getLayers, setLayers, title, desc) => ({
    init: (p, ch) => ({ layers: clone(getLayers(ch)), sample: clone(SAMPLE[phase] || SAMPLE.EXTRA) }),
    data: (S) => S.layers,
    html: (S, p, ch, ro) => approvalHtml(S, phase, p, ro, title, desc),
    on: (p) => approvalOn(phase, p),
    save: (S) => (S.layers.length ? [] : ['Tambahkan minimal satu layer approval.']).concat(L.layersErrors(cleanLayers(S.layers, phase))),
    commit: (S, p, ch) => setLayers(ch, cleanLayers(S.layers, phase)),
  });
  TAB.approval = apTab('REGISTRATION', (ch) => ch.layers.REGISTRATION, (ch, v) => { ch.layers.REGISTRATION = v; }, 'Layer Approval Pendaftaran',
    'Rute dibaca dari atas ke bawah. Layer yang kondisinya tidak terpenuhi dilewati. Setiap layer yang berjalan disetujui manual oleh approver-nya.');

  // ---- MOU & Dokumen
  const PLACEHOLDERS = [['{program.name}', 'Nama program'], ['{program.period}', 'Periode program'], ['{mou.number}', 'Nomor MOU otomatis'], ['{date.generated}', 'Tanggal MOU dibuat'],
    ['{store.name}', 'Nama customer atau group'], ['{store.code}', 'Kode customer atau group'], ['{store.address}', 'Alamat customer'], ['{group.name}', 'Channel'],
    ['{total.target}', 'Total target semua group brand'], ['{table.rebate}', 'Tabel group brand: kelas, target, semester %, yearly %, fixed rebate %'],
    ['{table.fixedRebate}', 'Tabel Fixed Rebate Detail: visibility rent, aktivitas, lainnya'], ['{signer.store}', 'Penanda tangan toko'], ['{signer.paragon}', 'Penanda tangan Paragon (CBD)']];
  L.PLACEHOLDERS = PLACEHOLDERS;
  function mouPreview(p, ch, sample, data) {
    const d = sample ? Object.assign({ program: p.name.toUpperCase(), number: 'MOU/LP2027/CS/0412', date: '12 Januari 2027', store: 'Cantik Kosmetik', code: '148795-000', address: 'Jl. Riau No. 45, Pekanbaru',
      period: L.periodTxt(p.period_start, p.period_end), signer: 'Budi Santoso', cbd: 'Rina Wulandari (CBD)',
      rows: [['Wardah', 'B', 'Rp 3.603.600.000', '0,75%', '1,25%', '1,50%'], ['Emina', 'A', 'Rp 568.371.000', '0,50%', '1,00%', '1,50%']],
      fr: 'Wardah · Visibility Rent: Gondola brand, Rp 30.000.000, Jan–Des. Aktivitas: Social Buzz, posting konten Wardah 4x per bulan di Instagram toko, Jan–Des.' }, data || {})
      : { program: '{program.name}', number: '{mou.number}', date: '{date.generated}', store: '{store.name}', code: '{store.code}', address: '{store.address}', period: '{program.period}', signer: '{signer.store}', cbd: '{signer.paragon}' };
    const FRon = L.FR(p);
    return `<div class="doc"><div style="text-align:center;font-weight:700;font-size:13px">PERJANJIAN KERJA SAMA<br>${esc(d.program)}</div><div>Nomor: ${esc(d.number)}</div>
      <div>Pada tanggal ${esc(d.date)}, yang bertanda tangan di bawah ini, <b>${esc(d.store)}</b> (${esc(d.code)}), beralamat di ${esc(d.address)}, selanjutnya disebut <b>Toko</b>, sepakat mengikuti program untuk periode ${esc(d.period)}.</div>
      <div style="font-weight:700">Lampiran 1 — Target dan Rebate</div>
      ${sample ? `<table><tr><th>Group brand</th><th>Kelas</th><th>Target / tahun</th><th>Semester</th><th>Yearly</th>${FRon ? `<th>${esc(L.frName(p))}</th>` : ''}</tr>${d.rows.map((r) => `<tr>${r.slice(0, FRon ? 6 : 5).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : '<span class="ph" style="align-self:flex-start">{table.rebate}</span>'}
      ${FRon ? `<div style="font-weight:700">Lampiran 2 — ${esc(L.frName(p))} Detail</div>${sample ? `<div>${esc(d.fr)}</div>` : '<span class="ph" style="align-self:flex-start">{table.fixedRebate}</span>'}` : ''}
      <div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px"><span>Toko,<br><br>${esc(d.signer)}</span><span style="text-align:right">PT Paragon,<br><br>${esc(d.cbd)}</span></div></div>`;
  }
  L.mouPreview = mouPreview;
  TAB.mou = {
    init: (p, ch) => ({ docs: clone(ch.mou.docs), sample: true, newDoc: '', note: '', dlg: null }),
    data: (S) => ({ d: S.docs }),
    html: (S, p, ch, ro) => {
      const revs = ch.mou.revisions; const last = revs[revs.length - 1];
      const others = L.channels(p.id).filter((c) => c.id !== ch.id && c.mou.revisions.length);
      return `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;align-items:start">
        <div class="col-f" style="gap:20px">
          <section class="card pad" style="gap:14px"><div class="between"><h2 class="h3">Template MOU</h2>${last ? chip(`Valid · ${PLACEHOLDERS.length} placeholder dikenali`, 'c-green') : chip('Belum ada template', 'c-grey')}</div>
            ${last ? `<div class="row-f box" style="gap:12px;padding:14px 16px;border-radius:8px;flex-wrap:nowrap"><span style="width:40px;height:48px;border-radius:4px;background:#D6DBF8;color:#1E308B;display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex-shrink:0">DOCX</span>
              <div class="col-f"><b style="overflow-wrap:anywhere">${esc(last.file)}</b><span class="muted sm">Revisi ${last.no} · diunggah ${L.dateTxt(last.at)} oleh ${esc(last.by)} · untuk ${esc(chName(ch))}</span></div></div>` : '<span class="muted sm">Unggah file .docx yang berisi placeholder di bawah.</span>'}
            <fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px">
              <div class="row-f"><label class="btn btn-p" style="margin:0">Unggah Revisi Baru<input type="file" accept=".docx" data-chg="mouUp" hidden></label>
                ${last ? '<button class="btn btn-s" type="button" data-on="mouDl">Unduh</button>' : ''}<button class="btn btn-s" type="button" data-on="mouOther" ${others.length ? '' : 'disabled'}>Pakai Template Channel Lain</button></div>
              <input class="inp sm" data-k="note" data-inp="mouNote" value="${esc(S.note)}" placeholder="Catatan revisi (opsional), mis. nama penanda tangan ditambahkan"></fieldset></section>
          <section class="card pad" style="gap:12px"><h2 class="h3">Placeholder</h2><span class="muted sm">Ketik placeholder di dokumen Word. Placeholder tabel otomatis berubah menjadi tabel lengkap.</span>
            <div class="col-f" style="gap:8px">${PLACEHOLDERS.filter(([t]) => t !== '{table.fixedRebate}' || L.FR(p)).map(([t, d]) => `<div style="display:grid;grid-template-columns:minmax(150px,190px) minmax(0,1fr);gap:12px;align-items:center"><span class="ph">${t}</span><span class="sm">${esc(d)}</span></div>`).join('')}</div></section></div>
        <div class="col-f" style="gap:20px">
          <section class="card pad" style="gap:14px"><div class="between"><h2 class="h3">Pratinjau</h2><div class="seg s" role="group" aria-label="Mode pratinjau"><button type="button" class="${S.sample ? 'on' : ''}" data-on="pv" data-v="1">Contoh data</button><button type="button" class="${S.sample ? '' : 'on'}" data-on="pv" data-v="0">Placeholder</button></div></div>
            ${mouPreview(p, ch, S.sample)}</section>
          <section class="card pad" style="gap:12px"><fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:12px"><h2 class="h3">Dokumen Wajib</h2>
            ${S.docs.map((d, i) => `<div class="between" style="padding:10px 0;border-top:1px solid #EBEBEB"><span class="b">${esc(d.name)}</span><span class="row-f"><label class="row-f sm" style="margin:0;cursor:pointer"><input type="checkbox" data-chg="docReq" data-i="${i}" ${d.req ? 'checked' : ''} ${d.locked ? 'disabled' : ''}>Wajib</label>
              ${d.locked ? '' : `<button type="button" class="x" aria-label="Hapus dokumen" data-on="docDel" data-i="${i}">${L.ico.trash}</button>`}</span></div>`).join('')}
            <div class="row-f"><input class="inp sm" style="flex:1" data-k="newDoc" data-inp="docNew" value="${esc(S.newDoc)}" placeholder="Nama dokumen baru"><button type="button" class="btn btn-g" data-on="docAdd">+ Tambah dokumen</button></div>
            <span class="muted xs">Dokumen diunggah Admin DC dan direview Admin HO.</span></fieldset></section>
          <section class="card pad" style="gap:10px"><h2 class="h3">Riwayat Revisi</h2>${revs.slice().reverse().map((r, i) => `<div class="between sm" style="${i ? 'border-top:1px solid #EBEBEB;padding-top:10px' : ''}"><span><b>Revisi ${r.no}</b> · ${esc(r.note || r.file)}</span><span class="muted">${L.dateTxt(r.at)}</span></div>`).join('') || '<span class="muted sm">Belum ada revisi.</span>'}</section></div></div>
        ${S.dlg === 'other' ? L.dialog('Pakai Template Channel Lain', `<span class="muted sm">Template terakhir channel yang dipilih menjadi revisi baru ${esc(chName(ch))}.</span><div class="box">${others.map((c) => { const r = c.mou.revisions[c.mou.revisions.length - 1];
          return `<label class="ck"><input type="radio" name="mouo" data-chg="mouPick" value="${c.id}" ${S.pick === c.id ? 'checked' : ''}><span class="col-f" style="gap:0"><b>${esc(chName(c))}</b><span class="muted xs">${esc(r.file)} · revisi ${r.no}</span></span></label>`; }).join('')}</div>`,
          `<button type="button" class="btn btn-s" data-on="closeDlg">Batal</button><button type="button" class="btn btn-p" data-on="mouUse" ${S.pick ? '' : 'disabled'}>Pakai Template</button>`) : ''}`;
    },
    on: (p, ch) => {
      const addRev = (file, note) => { const no = (ch.mou.revisions.length ? ch.mou.revisions[ch.mou.revisions.length - 1].no : 0) + 1;
        ch.mou.revisions.push({ no, file, note: note || '', by: UI.currentUser().name, at: L.now() }); L.audit(ch, 'Template MOU', `Revisi ${no}: ${file}`); DB.save(); };
      return {
        pv: (S, el) => { S.sample = el.dataset.v === '1'; },
        mouNote: (S, el) => { S.note = el.value; },
        mouUp: (S, el) => { const f = el.files && el.files[0]; if (!f) return false; if (!/\.docx$/i.test(f.name)) { alert('File harus .docx'); return false; } addRev(f.name, S.note.trim() || 'Revisi baru diunggah'); S.note = ''; },
        mouDl: () => { const html = `<html><head><meta charset="utf-8"></head><body>${mouPreview(p, ch, false)}</body></html>`; const last = ch.mou.revisions[ch.mou.revisions.length - 1];
          UI.download(last.file.replace(/\.docx$/i, '') + '.doc', html, 'application/msword'); return false; },
        mouOther: (S) => { S.dlg = 'other'; S.pick = null; },
        mouPick: (S, el) => { S.pick = Number(el.value); },
        mouUse: (S) => { const c = L.channel(S.pick); const r = c.mou.revisions[c.mou.revisions.length - 1]; addRev(r.file, `Dari template ${chName(c)} revisi ${r.no}`); S.dlg = null; },
        closeDlg: (S) => { S.dlg = null; },
        docReq: (S, el) => { S.docs[Number(el.dataset.i)].req = el.checked; },
        docDel: (S, el) => { S.docs.splice(Number(el.dataset.i), 1); },
        docNew: (S, el) => { S.newDoc = el.value; },
        docAdd: (S) => { const v = S.newDoc.trim(); if (v && !S.docs.some((d) => d.name.toLowerCase() === v.toLowerCase())) { S.docs.push({ name: v, req: true }); S.newDoc = ''; } },
      };
    },
    save: (S, p, ch) => (ch.mou.revisions.length ? [] : ['Unggah template MOU (.docx) dulu.']),
    softSave: true,
    commit: (S, p, ch) => { ch.mou.docs = clone(S.docs); },
  };

  // ---- Pencairan
  TAB['payout-rules'] = {
    init: (p, ch) => ({ r: clone(ch.payout_rules) }),
    data: (S) => S.r,
    html: (S, p, ch, ro) => `<fieldset ${ro ? 'disabled' : ''} style="border:0;padding:0;margin:0;min-width:0"><section class="card pad"><div class="col-f" style="max-width:760px"><h2 class="h3">Aturan Pencairan</h2>
        <span class="muted sm">Syarat yang dicek tiap semester sebelum CBD mengajukan pencairan. Batas cair S1 / S2 mengikuti pembagian di form pendaftaran.</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"><label class="field lbl" style="margin:0">Sell in minimal dari sell out %<input class="inp" data-k="ratio" data-chg="ratio" inputmode="decimal" value="${nv(S.r.ratio_min)}" placeholder="mis. 95"></label></div>
      <div class="row-f box" style="gap:14px;padding:14px 16px;border-radius:8px;flex-wrap:nowrap">${sw(S.r.carry_over, 'data-on="carry" aria-label="Sisa batas cair S1 boleh pindah ke S2"')}<div class="col-f"><span class="b">Sisa batas cair S1 boleh pindah ke S2</span><span class="muted sm">Jika aktif, batas cair S1 yang tidak terpakai menambah batas cair S2.</span></div></div></section></fieldset>`,
    on: () => ({ ratio: (S, el) => { S.r.ratio_min = numOrNull(el.value); }, carry: (S) => { S.r.carry_over = !S.r.carry_over; } }),
    save: (S) => (S.r.ratio_min !== null && !(S.r.ratio_min > 0 && S.r.ratio_min <= 100) ? ['Sell in minimal harus di antara 0 dan 100%.'] : []),
    commit: (S, p, ch) => { ch.payout_rules = clone(S.r); },
  };
  TAB['payout-approval'] = apTab('PAYOUT', (ch) => ch.layers.PAYOUT || [], (ch, v) => { ch.layers.PAYOUT = v; }, 'Layer Approval Pencairan',
    'Dipakai saat CBD mengajukan pencairan. Approver tiap layer diambil dari mapping role × area customer. Layer berurutan dengan approver yang sama digabung menjadi satu.');

  // ---------------------------------------------------------------- kerangka halaman channel
  const PHASE_TABS = {
    REG: [['settings', 'Pengaturan'], ['matrix', 'Matriks Kelas'], ['fr', 'Fixed Rebate Detail'], ['approval', 'Approval'], ['mou', 'MOU & Dokumen']],
    PAY: [['payout-rules', 'Aturan Pencairan'], ['payout-approval', 'Approval']],
  };
  const tabPhase = (tab) => (tab.startsWith('phase-') ? 'EXTRA' : tab.startsWith('payout') ? 'PAY' : 'REG');
  function readOnly(p, ch, tab, phase) {
    if (L.programClosed(p)) return true;
    if (tab === 'mou') return false;
    if (tabPhase(tab) === 'REG') return ch.reg_status === 'PUBLISHED';
    if (tabPhase(tab) === 'PAY') return ch.pay_status === 'PUBLISHED';
    return phase && phase.status === 'PUBLISHED';
  }
  const savedKey = (tab) => ({ 'payout-rules': 'payout_rules', 'payout-approval': 'payout_approval' })[tab] || tab;

  route('/setup/:id/ch/:pc/:tab', ({ id, pc, tab }) => {
    requireSetup();
    const p = L.program(id); const ch = L.channel(pc);
    if (!p || !ch || ch.program_id !== p.id) UI.fail('Channel tidak ditemukan');
    if (tab === 'simulate') return simulatePage(p, ch);
    let phase = null; let T;
    if (tab.startsWith('phase-')) {
      phase = (ch.extra_phases || []).find((x) => String(x.id) === tab.slice(6)); if (!phase || ch.reg_status !== 'PUBLISHED') UI.redirect(`/setup/${p.id}/ch/${ch.id}/settings`);
      T = apTab('EXTRA', () => phase.layers, (c, v) => { phase.layers = v; }, `Layer Approval ${phase.name}`, 'Atur siapa yang menyetujui pengajuan di fase ini.');
    } else T = TAB[tab];
    if (!T) UI.fail('Halaman tidak ditemukan');
    if (tab === 'fr' && !L.FR(p)) UI.redirect(`/setup/${p.id}/ch/${ch.id}/settings`);
    if (tabPhase(tab) === 'PAY' && ch.reg_status !== 'PUBLISHED') UI.redirect(`/setup/${p.id}/ch/${ch.id}/settings`);
    const ro = readOnly(p, ch, tab, phase);
    const name = chName(ch);
    return L.page(`${name} · ${p.name}`, (root) => {
      const base = T.init(p, ch);
      const snap = JSON.stringify(T.data(base));
      const state = Object.assign(base, { _err: [], _pubErr: [], _dlg: null });
      const tabOn = T.on(p, ch);
      const ph = tabPhase(tab);
      const v = L.view(root, {
        state,
        html: (S) => {
          const regPub = ch.reg_status === 'PUBLISHED'; const payPub = ch.pay_status === 'PUBLISHED';
          const comp = L.completeness(p, ch);
          const phaseCard = (key, n, title, chipHtml, desc, href, off) => off ? `<div class="phase off" aria-disabled="true"><span class="phase-h">${n} · ${esc(title)}${chipHtml}</span><span class="phase-d">${desc}</span></div>`
            : `<a class="phase ${(ph === key || (phase && key === 'X' + phase.id)) ? 'on' : ''}" href="${href}"><span class="phase-h">${n} · ${esc(title)}${chipHtml}</span><span class="phase-d">${desc}</span></a>`;
          const extra = (ch.extra_phases || []).map((x, i) => phaseCard('X' + x.id, i + 3, x.name, !regPub ? chip('Menunggu pendaftaran', 'c-grey') : x.status === 'PUBLISHED' ? chip('Published', 'c-green') : chip('Draft', 'c-blue'),
            regPub ? `Approval ${esc(x.name.toLowerCase())}` : 'Bisa disetup setelah pendaftaran dipublikasikan', `#/setup/${p.id}/ch/${ch.id}/phase-${x.id}`, !regPub)).join('');
          const phases = `<div class="phases" role="navigation" aria-label="Fase channel">
            ${phaseCard('REG', 1, 'Pendaftaran', regPub ? chip('Published', 'c-green') : chip('Draft', 'c-blue'), regPub ? `Dipublikasikan ${L.dateTxt(ch.reg_published_at)} · setup terkunci, MOU tetap bisa diubah` : ['Pengaturan', 'matriks kelas', L.FR(p) && 'fixed rebate', 'approval', 'MOU'].filter(Boolean).join(', '), `#/setup/${p.id}/ch/${ch.id}/settings`, false)}
            ${phaseCard('PAY', 2, 'Pencairan', !regPub ? chip('Menunggu pendaftaran', 'c-grey') : payPub ? chip('Published', 'c-green') : chip('Draft', 'c-blue'), regPub ? 'Aturan pencairan dan approval pencairan' : 'Bisa disetup setelah pendaftaran dipublikasikan', `#/setup/${p.id}/ch/${ch.id}/payout-rules`, !regPub)}
            ${extra}</div>`;
          const tabsList = ph === 'REG' ? PHASE_TABS.REG.filter(([k]) => k !== 'fr' || L.FR(p)) : ph === 'PAY' ? PHASE_TABS.PAY : [[tab, 'Approval']];
          const doneOf = (k) => (ph === 'REG' ? L.tabDone(p, ch, k) : !!ch.saved[savedKey(k)]);
          const tabs = `<nav class="tabs" aria-label="Setup fase">${tabsList.map(([k, l]) => `<a class="tab ${k === tab ? 'on' : ''}" href="#/setup/${p.id}/ch/${ch.id}/${k}">${esc(l)}<span class="dot ${doneOf(k) ? 'ok' : ''}" title="${doneOf(k) ? 'Sudah disimpan' : 'Belum disimpan'}"></span></a>`).join('')}</nav>`;
          let pubBtn = '';
          if (!L.programClosed(p)) {
            if (ph === 'REG' && !regPub) pubBtn = '<button class="btn btn-p" type="button" data-on="pubReg">Publikasikan Pendaftaran</button>';
            if (ph === 'PAY' && !payPub) pubBtn = '<button class="btn btn-p" type="button" data-on="pubPay">Publikasikan Pencairan</button>';
            if (ph === 'EXTRA' && phase.status !== 'PUBLISHED') pubBtn = `<button class="btn btn-p" type="button" data-on="pubX">Publikasikan ${esc(phase.name)}</button>`;
          }
          const lockNote = ro ? `<div class="note-b">${ph === 'REG' && tab !== 'mou' ? 'Pendaftaran sudah dipublikasikan: bagian ini hanya bisa dilihat. MOU &amp; Dokumen tetap bisa diubah.' : L.programClosed(p) ? 'Periode program sudah lewat: setup hanya bisa dilihat.' : 'Fase ini sudah dipublikasikan: bagian ini hanya bisa dilihat.'}</div>` : '';
          const errs = S._err.length ? `<div class="note-r"><b>Belum bisa disimpan</b><ul>${S._err.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '';
          const pubErr = S._pubErr.length ? `<div class="note-r"><b>Belum bisa dipublikasikan</b><ul>${S._pubErr.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '';
          const pubDlg = S._dlg === 'pub' ? L.dialog(S._pubTitle, `<span>${S._pubText}</span>`, `<button type="button" class="btn btn-s" data-on="closeX">Batal</button><button type="button" class="btn btn-p" data-on="pubDo">${esc(S._pubTitle)}</button>`, 'w520') : '';
          const phaseTools = ph === 'EXTRA' && !L.programClosed(p) ? `<div class="row-f">${phase.status === 'PUBLISHED' ? '' : `<button type="button" class="btn btn-g" data-on="phRename">Ubah nama fase</button><button type="button" class="btn btn-g" style="color:#B80016 !important" data-on="phDel">Hapus fase</button>`}</div>` : '';
          return `<section class="card head"><div class="head-l"><a href="#/setup/${p.id}" class="back">${L.ico.back}Kembali</a><div class="col-f" style="gap:6px"><h1 class="h1">${esc(name)}</h1><span class="muted sm">${esc(p.name)}</span></div></div>
            <div class="row-f"><a class="btn btn-s" href="#/setup/${p.id}/ch/${ch.id}/simulate">Simulasi</a>${ro ? '' : '<button class="btn btn-s" type="button" data-on="save">Simpan Draft</button>'}${pubBtn}</div></section>
            ${phases}${tabs}${phaseTools}${pubErr}${lockNote}${errs}${T.html(S, p, ch, ro)}
            ${ro ? '' : `<div class="row-f" style="justify-content:flex-end"><button class="btn btn-p" type="button" data-on="save">Simpan</button></div>`}${pubDlg}`;
        },
        on: Object.assign({}, tabOn, {
          save: (S) => {
            S._err = T.save(S, p, ch) || [];
            if (S._err.length && !T.softSave) { window.scrollTo(0, 0); return; }
            T.commit(S, p, ch); ch.saved[savedKey(tab)] = true; // kelengkapan tetap dicek ulang (L.tabDone)
            L.audit(ch, 'Simpan', (PHASE_TABS.REG.concat(PHASE_TABS.PAY).find(([k]) => k === tab) || [tab, phase ? phase.name : tab])[1]); L.touchProgram(p); DB.save();
            flash(S._err.length ? 'warning' : 'success', S._err.length ? 'Disimpan sebagai draft. Masih ada isian yang perlu diperbaiki sebelum publikasi.' : 'Tersimpan.');
            UI.render(); return false;
          },
          closeX: (S) => { S._dlg = null; },
          closeDlg: (S) => { if (tabOn.closeDlg) tabOn.closeDlg(S); S._dlg = null; },
          phRename: () => { const n = prompt('Nama fase', phase.name); if (n && n.trim()) { phase.name = n.trim(); DB.save(); UI.render(); } return false; },
          phDel: () => { if (!confirm(`Hapus fase ${phase.name}?`)) return false; ch.extra_phases = ch.extra_phases.filter((x) => x.id !== phase.id); L.audit(ch, 'Hapus fase', phase.name); DB.save(); go(`/setup/${p.id}/ch/${ch.id}/payout-rules`); return false; },
          pubReg: (S) => {
            const e = L.completeness(p, ch).tabs.filter((t) => !t.ok).map((t) => `${t.label} belum lengkap atau belum disimpan.`);
            if (JSON.stringify(T.data(S)) !== snap) e.unshift('Simpan perubahan di tab ini dulu.');
            S._pubErr = e; if (e.length) return;
            Object.assign(S, { _dlg: 'pub', _pubKind: 'REG', _pubTitle: 'Publikasikan Pendaftaran', _pubText: `Pendaftaran ${esc(name)} dibuka untuk CBD. Setup pendaftaran terkunci; MOU &amp; Dokumen tetap bisa diubah. Lanjutkan?` });
          },
          pubPay: (S) => {
            const e = []; if (!ch.saved.payout_rules) e.push('Aturan Pencairan belum disimpan.'); if (!(ch.layers.PAYOUT || []).length || !ch.saved.payout_approval) e.push('Approval pencairan belum disimpan.');
            S._pubErr = e; if (e.length) return;
            Object.assign(S, { _dlg: 'pub', _pubKind: 'PAY', _pubTitle: 'Publikasikan Pencairan', _pubText: `Setup pencairan ${esc(name)} dikunci. Lanjutkan?` });
          },
          pubX: (S) => { S._pubErr = phase.layers.length ? [] : ['Simpan minimal satu layer approval dulu.']; if (S._pubErr.length) return; if (ch.reg_status !== 'PUBLISHED') { S._pubErr = ['Publikasikan pendaftaran dulu.']; return; }
            Object.assign(S, { _dlg: 'pub', _pubKind: 'X', _pubTitle: `Publikasikan ${phase.name}`, _pubText: `Approval fase ${esc(phase.name)} dikunci. Lanjutkan?` }); },
          pubDo: (S) => {
            if (S._pubKind === 'REG') { ch.reg_status = 'PUBLISHED'; ch.reg_published_at = L.now(); L.audit(ch, 'Publikasikan Pendaftaran'); }
            if (S._pubKind === 'PAY') { ch.pay_status = 'PUBLISHED'; ch.pay_published_at = L.now(); L.audit(ch, 'Publikasikan Pencairan'); }
            if (S._pubKind === 'X') { phase.status = 'PUBLISHED'; L.audit(ch, 'Publikasikan fase', phase.name); }
            L.touchProgram(p); DB.save(); flash('success', `${esc(S._pubTitle.replace('Publikasikan', ''))} ${esc(name)} dipublikasikan.`); UI.render(); return false;
          },
        }),
      });
      root.__lpPaint = v.paint;
      // tinggalkan tab dengan perubahan belum disimpan → tanya dulu
      root.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#/"]'); if (!a || ro) return;
        if (JSON.stringify(T.data(state)) !== snap && !confirm('Ada perubahan yang belum disimpan. Tinggalkan halaman ini?')) { e.preventDefault(); e.stopPropagation(); }
      }, true);
    });
  });

  // ---------------------------------------------------------------- Simulasi
  function simulatePage(p, ch) {
    const name = chName(ch);
    return L.page(`Simulasi ${name}`, (root) => {
      const S0 = () => ({ sem: ch.settings.semester, vals: Object.fromEntries(L.groupsOf(p).map((g, i) => [g.id, { on: i < 3, b: String([231e6, 40e6, 30e6, 60e6, 80e6, 20e6][i] || 50e6), g: String([30, 20, 18, 25, 25, 25][i] || 25) }])), flags: { budget: false, tag: false, rate: false } });
      L.view(root, {
        state: S0(),
        html: (S) => {
          const FRon = L.FR(p); const set = Object.assign({}, ch.settings, { semester: ch.settings.semester && S.sem });
          const chS = Object.assign({}, ch, { settings: set });
          const calc = L.groupsOf(p).map((g) => { const v = S.vals[g.id]; const b = L.rpNum(v.b);
            return L.calcUnit(p, chS, g, [], { joined: v.on, growth: v.g, g1: v.g, g2: v.g, s1: '50' }, { sales: { si: b, so: b } }); });
          const ok = calc.filter((c) => c.joined && c.k && (!set.yearly || c.tierY >= 0) && (!set.semester || c.tierS >= 0));
          const tot = ok.reduce((a, c) => ({ t: a.t + c.annual, r: a.r + c.totalRp, s: a.s + c.semBudget, y: a.y + c.yrRp, f: a.f + c.frBudget }), { t: 0, r: 0, s: 0, y: 0, f: 0 });
          const cols = 'grid-template-columns: 52px 130px 150px 90px 72px 160px 180px 86px minmax(150px,1fr);';
          const rows = calc.map((c, i) => { const v = S.vals[c.g.id]; const valid = c.base > 0 && c.gOk;
            const note = !c.joined ? 'Tidak diikutkan' : !valid ? 'Isi baseline dan growth' : !c.k ? 'Tidak masuk kelas' : (set.yearly && c.tierY < 0) || (set.semester && c.tierS < 0) ? `Kelas ${c.k.code} · belum masuk tier` : `Kelas ${c.k.code} · Tier ${(set.yearly ? c.tierY : c.tierS) + 1}`;
            const good = ok.includes(c);
            const rates = good ? [set.semester ? fp(c.semV) + '%' : null, set.yearly ? fp(c.yrV) + '%' : null, FRon ? fp(c.frV) + '%' : null].filter(Boolean).join(' + ') : '—';
            return `<div class="gr" style="${cols}${c.joined ? '' : 'opacity:.5;'}${i % 2 ? 'background:#FCFCFE;' : ''}">
              <div class="td"><input type="checkbox" data-chg="sOn" data-g="${c.g.id}" ${v.on ? 'checked' : ''} aria-label="Ikutkan ${esc(c.g.name)}"></div><div class="td b sm">${esc(c.g.name)}</div>
              <div class="td"><input class="cell" style="width:126px" data-k="b${c.g.id}" data-chg="sB" data-g="${c.g.id}" inputmode="numeric" value="${L.fmtThousand(v.b)}" aria-label="Baseline per bulan"></div>
              <div class="td"><input class="cell w64" data-k="g${c.g.id}" data-chg="sG" data-g="${c.g.id}" inputmode="decimal" value="${esc(v.g)}" aria-label="Growth %"></div>
              <div class="td">${chip(c.k ? c.k.code : '—', c.k ? 'c-blue' : 'c-grey')}</div><div class="td r">${valid && c.joined ? fr(c.annual) : '—'}</div><div class="td">${rates}</div>
              <div class="td r b">${good ? fp(c.total) + '%' : '—'}</div><div class="td rc"><span class="b sm">${good ? fr(c.totalRp) : '—'}</span><span class="muted" style="font-size:11px">${note}</span></div></div>`; }).join('');
          // pengecekan & rute approval
          const checks = []; const minOk = (val, min) => !isFinite(min) || !isFinite(val) || val >= min;
          const below = ok.filter((c) => !minOk(c.yrV, set.min_yearly) || (set.semester && !minOk(c.semV, set.min_sem)) || (FRon && !minOk(c.frV, set.min_fr)));
          checks.push(below.length ? { tag: 'Cek', c: 'c-yellow', t: `Rate rekomendasi di bawah batas minimum Pengaturan untuk ${below.map((c) => c.g.name + ' kelas ' + c.k.code).join(', ')}.` } : { tag: 'Sesuai', c: 'c-green', t: 'Semua rate rekomendasi memenuhi batas minimum di Pengaturan.' });
          calc.forEach((c) => { if (!c.joined) return; if (c.base > 0 && !c.k) checks.push({ tag: 'Tidak masuk', c: 'c-yellow', t: `${c.g.name}: baseline ${fr(c.base)} di bawah kelas terendah${(ch.matrix[c.g.id] || [])[0] ? ` (min ${fj(ch.matrix[c.g.id][0].bmin * 1e6)})` : ''}. Group brand ini tidak bisa didaftarkan.` });
            else if (c.k && ((set.yearly && c.tierY < 0) || (set.semester && c.tierS < 0))) checks.push({ tag: 'Tidak masuk', c: 'c-yellow', t: `${c.g.name}: growth ${c.g0}% belum mencapai tier 1 (min ${c.k.tiers[0].g}%).` }); });
          if (!set.semester) checks.push({ tag: 'Info', c: 'c-grey', t: `Semester rebate tidak dihitung: hasil hanya ${[set.yearly && 'yearly', FRon && 'fixed rebate'].filter(Boolean).join(' dan ')}.` });
          if (ok.length) checks.push({ tag: 'Info', c: 'c-grey', t: `${ok.length} dari ${calc.filter((c) => c.joined).length} group brand yang diikutkan memenuhi syarat dan masuk ke MOU.` });
          const errs = L.matrixErrors(p, ch); if (errs.length) checks.unshift({ tag: 'Matriks', c: 'c-red', t: `Matriks Kelas belum valid (${errs.length} masalah).` });
          const facts = Object.assign(L.factsOf(p, chS, calc, []), { OUTSIDE_CLASS: calc.some((c) => c.joined && c.base > 0 && !c.k), BELOW_LOWEST_TIER: calc.some((c) => c.joined && c.k && ((set.yearly && c.tierY < 0) || (set.semester && c.tierS < 0))),
            RATE_CHANGED: S.flags.rate, RATE_BELOW_MIN: below.length > 0, VALUE_OVER_BUDGET: FRon && S.flags.budget, TAGGING_CHANGED: S.flags.tag });
          const rt = L.buildRoute('REGISTRATION', ch.layers.REGISTRATION, facts);
          const path = rt.filter((r) => r.status === 'RUN').map((r) => L.ROLES[r.role] || r.role);
          const dcols = `grid-template-columns: 160px repeat(${1 + (set.semester ? 1 : 0) + (set.yearly ? 1 : 0) + (FRon ? 1 : 0)}, minmax(0, 1fr));`;
          const cell = (rp, pc) => `<div class="td rc"><span class="b">${rp}</span><span class="muted" style="font-size:11px">${pc}</span></div>`;
          const pct = (v) => (tot.t ? fp(v / tot.t * 100) + '%' : '—');
          return `<section class="card head"><div class="head-l"><a href="#/setup/${p.id}/ch/${ch.id}/settings" class="back">${L.ico.back}Kembali ke Setup</a>
              <div class="col-f" style="gap:6px"><div class="row-f" style="gap:10px"><h1 class="h1">Simulasi ${esc(name)}</h1>${chip(ch.reg_status === 'PUBLISHED' ? 'Setup dipublikasikan' : 'Setup draft', ch.reg_status === 'PUBLISHED' ? 'c-green' : 'c-blue')}</div><span class="muted sm">${esc(p.name)}</span></div></div>
              <div class="row-f"><button class="btn btn-s" type="button" data-on="reset">Reset</button></div></section>
            <div class="note-b">Simulasi tidak disimpan dan tidak mengubah setup. Rate yang tampil adalah rate rekomendasi tier (batas maksimum); CBD bisa mengisi lebih rendah saat pendaftaran.</div>
            <section class="card pad"><div class="between" style="align-items:flex-end"><h2 class="h3">Toko Contoh</h2>
              ${ch.settings.semester ? `<div class="row-f" style="gap:10px">${sw(S.sem, 'data-on="sSem" aria-label="Sertakan semester rebate"')}<span class="sm b">Semester rebate</span></div>` : ''}</div>
              <div class="tblbox" data-keep-scroll><div style="min-width:1080px"><div class="gr" style="${cols}"><div class="th">Ikut</div><div class="th">Group brand</div><div class="th">Baseline / bulan (Rp)</div><div class="th">Growth %</div><div class="th">Kelas</div><div class="th r">Target / tahun</div>
                <div class="th">${[set.semester && 'Semester', set.yearly && 'Yearly', FRon && 'FR'].filter(Boolean).join(' + ')}</div><div class="th r">Total %</div><div class="th r">Potensi rebate</div></div>${rows}</div></div>
              <p class="muted xs" style="margin:0">Target / tahun = baseline per bulan × 12 × (1 + growth). Kelas dari baseline, tier dari growth. Potensi rebate = target × total %, jika target tercapai penuh.</p></section>
            <div class="grid-auto"><div class="card pad-s"><span class="lbl">Total target / tahun</span><span class="kpi-v" style="font-size:22px">${ok.length ? fr(tot.t) : '—'}</span><span class="muted xs">total dari semua brand</span></div>
              <div class="card pad-s"><span class="lbl">Potensi rebate</span><span class="kpi-v" style="font-size:22px">${ok.length ? fr(tot.r) : '—'}</span><span class="muted xs">Jika semua target tercapai</span></div>
              <div class="card pad-s"><span class="lbl">Rate efektif</span><span class="kpi-v" style="font-size:22px">${pct(tot.r)}</span><span class="muted xs">Potensi rebate ÷ total target</span></div></div>
            <section class="card pad" style="gap:12px"><h2 class="h3">Rincian Rebate</h2>${ok.length ? `<div class="tblbox"><div style="min-width:720px"><div class="gr" style="${dcols}"><div class="th">Group brand</div>${set.semester ? '<div class="th r">Semester rebate</div>' : ''}${set.yearly ? '<div class="th r">Yearly rebate</div>' : ''}${FRon ? `<div class="th r">${esc(L.frName(p))}</div>` : ''}<div class="th r">Total rebate</div></div>
              ${ok.map((c) => `<div class="gr" style="${dcols}"><div class="td b sm">${esc(c.g.name)}</div>${set.semester ? cell(fr(c.semBudget), fp(c.semV) + '%') : ''}${set.yearly ? cell(fr(c.yrRp), fp(c.yrV) + '%') : ''}${FRon ? cell(fr(c.frBudget), fp(c.frV) + '%') : ''}${cell(fr(c.totalRp), fp(c.total) + '%')}</div>`).join('')}
              <div class="gr" style="${dcols}border-top:1px solid #C4CAD0;background:#F8F9FD"><div class="td b sm">Total</div>${set.semester ? cell(fr(tot.s), pct(tot.s)) : ''}${set.yearly ? cell(fr(tot.y), pct(tot.y)) : ''}${FRon ? cell(fr(tot.f), pct(tot.f)) : ''}${cell(fr(tot.r), pct(tot.r))}</div></div></div>` : '<span class="muted sm">Belum ada group brand yang memenuhi syarat.</span>'}</section>
            <section class="card pad"><div class="between"><h2 class="h3">Layer Approval yang Dilalui</h2><a href="#/setup/${p.id}/ch/${ch.id}/approval" class="b sm">Lihat aturan approval</a></div>
              <div class="row-f box" style="gap:8px 24px;padding:12px 16px;border-radius:8px;background:#FCFCFE"><span class="lbl">Kondisi di luar simulasi</span>
                ${FRon ? `<label class="row-f sm" style="margin:0;cursor:pointer"><input type="checkbox" data-chg="sFlag" data-f="budget" ${S.flags.budget ? 'checked' : ''}>Fixed Rebate Detail melebihi budget</label>` : ''}
                <label class="row-f sm" style="margin:0;cursor:pointer"><input type="checkbox" data-chg="sFlag" data-f="tag" ${S.flags.tag ? 'checked' : ''}>Tagging berbeda dari tagging terakhir</label>
                <label class="row-f sm" style="margin:0;cursor:pointer"><input type="checkbox" data-chg="sFlag" data-f="rate" ${S.flags.rate ? 'checked' : ''}>Rate diubah dari rekomendasi</label></div>
              <div class="col-f" style="gap:0">${rt.map((r) => `<div class="row-f" style="gap:12px;align-items:flex-start;padding:12px 0;border-top:1px solid #EBEBEB;flex-wrap:nowrap"><span class="dot-n ${r.status === 'RUN' ? '' : 'off'}">${r.n}</span>
                <div class="col-f"><div class="row-f"><b>${esc(L.ROLES[r.role] || r.role)}</b>${r.status === 'RUN' ? chip('Dilalui', 'c-blue') : r.status === 'MERGED' ? chip('Digabung dengan layer ' + r.mergedWith, 'c-grey') : chip('Dilewati', 'c-grey')}</div>
                <span class="muted xs">${r.rule === 'IF' ? `Hanya jika ${r.match === 'ALL' ? 'semua' : 'salah satu'} kondisi terpenuhi` : 'Selalu'}</span><span class="sm">${esc(r.why)}</span></div></div>`).join('') || '<span class="muted sm">Approval belum disetup.</span>'}</div>
              <div class="note-b" role="status"><b>${path.length} layer approval</b>&nbsp;<span>${esc(path.join(' → '))}</span></div></section>
            <section class="card pad" style="gap:8px"><h2 class="h3">Pemeriksaan Setup</h2><div class="col-f" style="gap:0">${checks.map((c) => `<div class="chk">${chip(c.tag, c.c)}<span>${esc(c.t)}</span></div>`).join('')}</div></section>`;
        },
        on: {
          sOn: (S, el) => { S.vals[el.dataset.g].on = el.checked; },
          sB: (S, el) => { S.vals[el.dataset.g].b = el.value.replace(/\D/g, ''); },
          sG: (S, el) => { S.vals[el.dataset.g].g = el.value; },
          sSem: (S) => { S.sem = !S.sem; },
          sFlag: (S, el) => { S.flags[el.dataset.f] = el.checked; },
          reset: (S) => { Object.assign(S, S0()); },
        },
      });
    });
  }
})();
