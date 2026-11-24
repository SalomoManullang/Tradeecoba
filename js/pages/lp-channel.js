// Setup channel mengikuti mockup "Tradee - Program Setup (COMPASS)" layar S8–S16:
// Fase Pendaftaran (Pengaturan · Matriks Kelas · Fixed Rebate Detail · Layer Approval · MOU dan Dokumen · Tinjau dan Publikasikan),
// Fase Pencairan (Aturan Pencairan · Layer Approval · Tinjau dan Publikasikan), Simulasi, dan Salin Pengaturan.
(function () {
  const { route, go, flash, requireSetup } = UI;
  const L = window.LP; const DB = window.DB;
  const { esc, fp, fr, pnum } = L;
  const X = L.cx; const { ico, tag, sw, modal, field } = X;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const numOrNull = (v) => { const n = pnum(v); return isFinite(n) ? n : null; };
  const nv = (n) => (n === null || n === undefined || !isFinite(n) ? '' : String(n).replace('.', ','));
  const rpTxt = (jt) => (jt === null || jt === undefined || !isFinite(jt) ? '' : Math.round(jt * 1e6).toLocaleString('id-ID'));
  const chName = (ch) => L.channelOf(ch.channel_code).name;
  const REVIEWERS = { ADMIN_SALES_HO: 'Admin Sales HO', ADMIN_HO: 'Admin HO' };
  L.REVIEWERS = REVIEWERS;
  const reviewerOf = (ch) => (ch.mou && ch.mou.reviewer) || 'ADMIN_SALES_HO';
  const pctIn = (key, val, attrs = '') => `<div class="cx-suffix"><input class="cx-in" data-k="${key}" inputmode="decimal" value="${nv(val)}" placeholder="Tanpa batas" ${attrs}><span>%</span></div>`;

  // ---------------------------------------------------------------- Layer Approval (Pendaftaran & Pencairan)
  const SAMPLE = { REGISTRATION: { BELOW_LOWEST_TIER: false, RATE_BELOW_MIN: true }, PAYOUT: {} };
  const condList = (phase, p, cur) => (L.COND[phase] || []).filter(([code, , , type]) => (type === 'flag' || code === cur) && (code !== 'VALUE_OVER_BUDGET' || L.FR(p)));
  function approvalHtml(S, phase, p, ro) {
    const pay = phase === 'PAYOUT'; const meta = L.condMeta(phase);
    const cards = S.layers.map((l, i) => {
      const isIf = l.rule === 'IF';
      return `<div class="cx-sub" style="gap:16px">
        <div class="cx-row" style="flex-wrap:nowrap;align-items:flex-end"><span class="cx-numdot" style="margin-bottom:6px">${i + 1}</span>
          <div style="flex:1;min-width:0">${field('Role approver', `<select class="cx-in" data-chg="apRole" data-i="${i}">${Object.entries(L.ROLES).map(([k, v]) => `<option value="${k}" ${l.role === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select>`, { req: true })}</div>
          <button type="button" class="cx-icon-btn" style="margin-bottom:8px" aria-label="Hapus layer ${i + 1}" data-on="apDel" data-i="${i}">${ico.x}</button></div>
        <div class="cx-col" style="gap:8px"><span class="t-sm-b">Aturan layer</span><div class="cx-row" style="gap:24px">
          <label class="cx-check"><input type="radio" name="rule${i}" data-chg="apAlways" data-i="${i}" ${isIf ? '' : 'checked'}>Selalu wajib</label>
          <label class="cx-check ${pay ? 'lock' : ''}"><input type="radio" name="rule${i}" data-chg="apIf" data-i="${i}" ${isIf ? 'checked' : ''} ${pay ? 'disabled' : ''}>Hanya jika kondisi</label></div></div>
        ${isIf ? `<div class="cx-cond"><span class="t-strong">Layer berjalan jika</span>
          <select class="cx-in" style="max-width:280px" data-chg="apMatch" data-i="${i}" aria-label="Cara menggabung kondisi"><option value="ANY" ${l.match !== 'ALL' ? 'selected' : ''}>Salah satu kondisi terpenuhi</option><option value="ALL" ${l.match === 'ALL' ? 'selected' : ''}>Semua kondisi terpenuhi</option></select>
          ${l.conds.map((c, j) => { const m = meta[c.code] || {}; return `<div class="cx-row" style="flex-wrap:nowrap;gap:8px">
            <select class="cx-in" style="max-width:340px" data-chg="apCode" data-i="${i}" data-j="${j}" aria-label="Kondisi ${j + 1}">${condList(phase, p, c.code).map(([code, label]) => `<option value="${code}" ${c.code === code ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select>
            ${m.type === 'num' ? `<select class="cx-in" style="width:72px" data-chg="apOp" data-i="${i}" data-j="${j}" aria-label="Operator">${Object.entries(L.OPS).map(([k, v]) => `<option value="${k}" ${c.op === k ? 'selected' : ''}>${v}</option>`).join('')}</select><input class="cx-in" style="width:96px" data-k="v${i}_${j}" data-inp="apVal" data-i="${i}" data-j="${j}" value="${esc(c.val)}" aria-label="Nilai">` : ''}
            <button type="button" class="cx-icon-btn" aria-label="Hapus kondisi" data-on="apCondDel" data-i="${i}" data-j="${j}">${ico.x}</button></div>`; }).join('')}
          ${l.conds.length ? '' : '<span class="cx-err">Tambahkan minimal satu kondisi.</span>'}
          <button type="button" class="cx-link" style="align-self:flex-start;padding:4px 16px" data-on="apCondAdd" data-i="${i}">Tambah Kondisi</button></div>` : ''}</div>`;
    }).join('');
    const used = []; S.layers.forEach((l) => { if (l.rule === 'IF') l.conds.forEach((c) => { if (!used.includes(c.code)) used.push(c.code); }); });
    const facts = {}; for (const code of used) { const m = meta[code]; const v = S.sample[code]; facts[code] = m && m.type === 'num' ? pnum(v) : !!v; }
    const rt = L.buildRoute(phase, S.layers, facts);
    const roles = rt.filter((r) => r.status === 'RUN').map((r) => L.ROLES[r.role] || r.role);
    const preview = `<aside class="cx-sub" style="gap:12px"><div class="cx-col"><h3 class="t-h5">Pratinjau Rute</h3><span class="t-sm">Coba kondisi untuk melihat layer mana yang berjalan.</span></div>
      ${used.length ? `<div class="cx-col" style="gap:10px"><span class="t-sm-b">Contoh Hasil Pengecekan</span>${used.map((code) => { const m = meta[code]; if (!m) return '';
        return m.type === 'num' ? `<label class="cx-col" style="gap:4px"><span class="t-sm">${esc(m.label)}</span><input class="cx-in md" data-k="s_${code}" data-inp="apSample" data-code="${code}" value="${esc(S.sample[code] === undefined ? '' : S.sample[code])}"></label>`
          : `<label class="cx-check" style="align-items:flex-start"><input type="checkbox" data-chg="apFlag" data-code="${code}" ${S.sample[code] ? 'checked' : ''}><span>${esc(m.label)}</span></label>`; }).join('')}</div>` : ''}
      <hr class="cx-hr"><span class="t-strong">${roles.length ? `Rute: ${esc(roles.join(' → '))}` : 'Rute: belum ada layer yang berjalan'}</span>
      ${rt.map((r, i) => { const l = S.layers[i]; const hits = l.rule === 'IF' ? l.conds.filter((c) => L.testCond(meta, c, facts)).map((c) => (meta[c.code] || {}).label) : [];
        const t = r.status === 'MERGED' ? tag(`Digabung dengan layer ${r.mergedWith}`, 'plain') : r.status === 'SKIP' ? tag('Dilewati') : l.rule === 'IF' ? tag('Berjalan', 'ok') : tag('Wajib', 'info');
        const why = r.status === 'SKIP' ? 'Kondisi tidak terpenuhi.' : l.rule === 'IF' ? `Karena: ${hits.join(', ')}.` : 'Selalu berjalan.';
        return `<div class="cx-row" style="flex-wrap:nowrap;align-items:flex-start"><span class="cx-numdot ${r.status === 'RUN' ? 'solid' : 'off'}">${i + 1}</span><div class="cx-col" style="gap:6px"><span class="t-strong">${esc(L.ROLES[r.role] || r.role)}</span><span>${t}</span><span class="t-sm">${esc(why)}</span></div></div>`; }).join('')}</aside>`;
    return `<div class="cx-col"><h2 class="t-h4">Layer Approval · Fase ${pay ? 'Pencairan' : 'Pendaftaran'}</h2><span class="t-sm">${pay ? 'Siapa yang menyetujui pencairan rebate untuk channel ini.' : 'Siapa yang menyetujui pendaftaran toko, dan kapan tiap layer berjalan.'}</span></div>
      ${pay ? '<div class="cx-alert blue"><span class="ic">i</span><div><b>Kondisi approval Pencairan belum ditentukan</b>Layer di bawah ini selalu wajib. Kondisi untuk Pencairan dan Aturan Pencairan dibahas di fase berikutnya.</div></div>' : ''}
      <div class="cx-apgrid"><fieldset ${ro ? 'disabled' : ''} class="cx-col" style="gap:16px;border:0;padding:0;margin:0">${cards || '<span class="t-sm">Belum ada layer.</span>'}
        <button type="button" class="cx-btn cx-s" style="align-self:flex-start" data-on="apAdd">Tambah Layer</button>
        <span class="t-sm">Layer berurutan dengan role yang sama digabung otomatis saat rute dibuat.<br>Tidak ada persetujuan otomatis.</span></fieldset>${preview}</div>`;
  }
  function approvalOn(phase, p) {
    const firstCode = () => condList(phase, p)[0][0];
    const Ly = (S, el) => S.layers[Number(el.dataset.i)];
    return {
      apRole: (S, el) => { Ly(S, el).role = el.value; },
      apAlways: (S, el) => { Ly(S, el).rule = 'ALWAYS'; },
      apIf: (S, el) => { const l = Ly(S, el); l.rule = 'IF'; if (!l.conds.length) l.conds.push({ code: firstCode(), op: '', val: '' }); },
      apMatch: (S, el) => { Ly(S, el).match = el.value; },
      apDel: (S, el) => { S.layers.splice(Number(el.dataset.i), 1); },
      apAdd: (S) => { S.layers.push({ role: phase === 'PAYOUT' ? 'HEAD_FINANCE' : 'RTP', rule: 'ALWAYS', match: 'ANY', conds: [] }); },
      apCondAdd: (S, el) => { const l = Ly(S, el); const used = l.conds.map((c) => c.code); const nx = condList(phase, p).find(([c]) => !used.includes(c)); l.conds.push({ code: nx ? nx[0] : firstCode(), op: '', val: '' }); },
      apCondDel: (S, el) => { Ly(S, el).conds.splice(Number(el.dataset.j), 1); },
      apCode: (S, el) => { const c = Ly(S, el).conds[Number(el.dataset.j)]; c.code = el.value; const m = L.condMeta(phase)[c.code]; if (m && m.type === 'num' && !c.op) c.op = 'gt'; },
      apOp: (S, el) => { Ly(S, el).conds[Number(el.dataset.j)].op = el.value; },
      apVal: (S, el) => { Ly(S, el).conds[Number(el.dataset.j)].val = el.value; },
      apSample: (S, el) => { S.sample[el.dataset.code] = el.value; return true; },
      apFlag: (S, el) => { S.sample[el.dataset.code] = el.checked; },
    };
  }
  const cleanLayers = (layers, phase) => { const meta = L.condMeta(phase); return layers.map((l) => ({ role: l.role, rule: phase === 'PAYOUT' ? 'ALWAYS' : l.rule, match: l.match || 'ANY',
    conds: l.rule === 'IF' && phase !== 'PAYOUT' ? l.conds.map((c) => { const t = (meta[c.code] || {}).type; return { code: c.code, op: t === 'num' ? c.op || 'gt' : '', val: t === 'num' ? String(c.val).trim() : '', type: t }; }) : [] })); };
  const routeTxt = (layers) => (layers || []).map((l) => `${L.ROLES[l.role] || l.role}${l.rule === 'IF' ? ' (kondisional)' : ''}`).join(' lalu ') || '—';
  const apTab = (phase, getL, setL) => ({
    init: (p, ch) => ({ layers: clone(getL(ch)), sample: clone(SAMPLE[phase] || {}) }),
    data: (S) => S.layers,
    html: (S, p, ch, ro) => approvalHtml(S, phase, p, ro),
    on: (p) => approvalOn(phase, p),
    save: (S) => (S.layers.length ? [] : ['Tambahkan minimal satu layer approval.']).concat(L.layersErrors(cleanLayers(S.layers, phase))),
    note: (S, p, ch) => `Rute: ${routeTxt(cleanLayers(S.layers, phase))}`,
    commit: (S, p, ch) => setL(ch, cleanLayers(S.layers, phase)),
  });

  // ---------------------------------------------------------------- langkah Fase Pendaftaran
  const TAB = {};
  const SET_LABEL = { ratio_s1: 'Rasio pencairan S1', min_yearly: 'Yearly % minimum', min_fr: 'Fixed rebate % minimum', min_sem: 'Semester % minimum' };
  TAB.settings = {
    init: (p, ch) => ({ s: clone(ch.settings) }),
    data: (S) => S.s,
    html: (S, p, ch, ro) => {
      const s = S.s; const FRon = L.FR(p);
      return `<div class="cx-col"><h2 class="t-h4">Pengaturan</h2><span class="t-sm">Mekanisme rebate dan batas minimum untuk channel ini. Batas maksimum berasal dari Matriks Kelas.</span></div>
        <fieldset ${ro ? 'disabled' : ''} class="cx-grid2" style="gap:24px;align-items:start;border:0;padding:0;margin:0">
          <div class="cx-col" style="gap:20px"><div class="cx-col"><h3 class="t-h5">Mekanisme</h3>
            <span class="t-sm">Diatur di Informasi Program: ${[s.semester && 'rebate semester', s.yearly && 'rebate yearly', FRon && `fixed rebate ${esc(L.frName(p))}`].filter(Boolean).join(', ') || 'tidak ada'} aktif.</span></div>
            ${s.semester ? (() => { const r1 = isFinite(s.ratio_s1) && s.ratio_s1 !== null ? s.ratio_s1 : NaN; const r2 = isFinite(r1) ? 100 - r1 : NaN; const bad = !(r1 > 0 && r2 > 0);
              return `<div class="cx-col" style="gap:16px"><div class="cx-col"><h3 class="t-h5">Pencairan Semester</h3><span class="t-sm">Target dan pencairan semester toko dibagi dengan rasio ini. CBD tidak mengisi pembagian per toko.</span></div>
              <div class="cx-field"><span class="cx-label">Pembagian rasio pencairan semester</span>
                <div class="cx-grid2" style="gap:12px"><label class="cx-col" style="gap:6px"><span class="t-sm-b">S1 · Jan – Jun</span><div class="cx-suffix"><input class="cx-in ${bad ? 'bad' : ''}" data-k="r1" data-chg="ratio" data-f="s1" inputmode="decimal" value="${nv(r1)}" aria-label="Rasio S1 (%)"><span>%</span></div></label>
                  <label class="cx-col" style="gap:6px"><span class="t-sm-b">S2 · Jul – Des</span><div class="cx-suffix"><input class="cx-in ${bad ? 'bad' : ''}" data-k="r2" data-chg="ratio" data-f="s2" inputmode="decimal" value="${nv(r2)}" aria-label="Rasio S2 (%)"><span>%</span></div></label></div>
                <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;background:#EBEBEB" role="img" aria-label="Rasio S1 ${nv(r1)}% dan S2 ${nv(r2)}%"><div style="width:${isFinite(r1) ? Math.max(0, Math.min(100, r1)) : 0}%;background:#304DDE"></div><div style="flex:1;background:#ADB7F2"></div></div>
                ${bad ? '<span class="cx-err">S1 dan S2 harus di antara 0 dan 100%, jumlahnya 100%.</span>' : `<span class="cx-help">S1 ${nv(r1)}% : S2 ${nv(r2)}%. Isi salah satu, sisi lain menyesuaikan otomatis.</span>`}</div></div>`; })() : ''}</div>
          <div class="cx-col" style="gap:20px"><div class="cx-col"><h3 class="t-h5">Batas Minimum Rate</h3><span class="t-sm">Semua isian opsional. Kosong berarti tidak ada batas bawah.</span></div>
            ${s.yearly ? field('Yearly % minimum', pctIn('mY', s.min_yearly, 'data-inp="num" data-f="min_yearly"')) : ''}
            ${FRon ? field(`${esc(L.frName(p))} % minimum`, pctIn('mF', s.min_fr, 'data-inp="num" data-f="min_fr"')) : ''}
            ${s.semester ? field('Semester % minimum', pctIn('mS', s.min_sem, 'data-inp="num" data-f="min_sem"')) : ''}
            </div></fieldset>`;
    },
    on: () => ({ tg: (S, el) => { S.s[el.dataset.f] = !S.s[el.dataset.f]; }, num: (S, el) => { S.s[el.dataset.f] = numOrNull(el.value); },
      ratio: (S, el) => { const v = numOrNull(el.value); S.s.ratio_s1 = v === null ? null : el.dataset.f === 's1' ? v : 100 - v; } }),
    save: (S, p) => { const s = S.s; const e = [];
      if (s.semester && !(s.ratio_s1 > 0 && s.ratio_s1 < 100)) e.push('Rasio pencairan semester: S1 dan S2 harus di antara 0 dan 100%.');
      return e; },
    note: (S, p, ch) => { const a = ch.settings; const b = S.s; const v = (k, x) => (typeof x === 'boolean' ? (x ? 'aktif' : 'nonaktif') : x === null || x === undefined ? 'kosong' : nv(x) + '%');
      const d = Object.keys(SET_LABEL).filter((k) => a[k] !== b[k]).map((k) => `${SET_LABEL[k]}: ${v(k, a[k])} menjadi ${v(k, b[k])}`); return d.join('; ') || 'Menyimpan pengaturan'; },
    commit: (S, p, ch) => { ch.settings = clone(S.s); },
  };

  // ---- Matriks Kelas
  TAB.matrix = {
    init: (p, ch) => ({ m: clone(ch.matrix), g: (L.groupsOf(p)[0] || {}).id, dlg: null, imp: null }),
    data: (S) => S.m,
    html: (S, p, ch, ro) => {
      const FRon = L.FR(p); const s = ch.settings; const g = L.groupsOf(p).find((x) => x.id === S.g) || L.groupsOf(p)[0];
      if (!g) return '<span class="t-sm">Program belum punya group brand.</span>';
      const cls = S.m[g.id] || [];
      const errs = L.matrixErrors(p, Object.assign({}, ch, { matrix: S.m }));
      // satu kartu per kelas: data kelas di atas, tabel tier di bawah — kelas & tier bisa ditambah/dihapus langsung
      const pctCell = (ci, ti, f, v, lbl) => `<td><div class="cx-suffix" style="width:96px"><input class="cx-in sm" data-k="${f}${ci}_${ti}" data-inp="mTier" data-f="${f}" data-c="${ci}" data-t="${ti}" inputmode="decimal" value="${nv(v)}" aria-label="${lbl} kelas ${ci + 1} tier ${ti + 1}"><span>%</span></div></td>`;
      const rows = cls.map((k, ci) => `<div class="cx-sub" style="gap:14px">
          <div class="cx-between" style="align-items:flex-end;flex-wrap:nowrap"><div class="cx-row" style="align-items:flex-end;gap:12px">
            ${field('Kelas', `<input class="cx-in md" style="width:64px;font-weight:700" data-k="c${ci}" data-inp="mCode" data-c="${ci}" value="${esc(k.code)}">`)}
            ${field('Baseline min (Rp)', `<input class="cx-in md" style="width:160px" data-k="bmin${ci}" data-inp="mRp" data-f="bmin" data-c="${ci}" inputmode="numeric" value="${rpTxt(k.bmin)}">`)}
            ${field('Baseline maks (Rp)', `<input class="cx-in md" style="width:160px" data-k="bmax${ci}" data-inp="mRp" data-f="bmax" data-c="${ci}" inputmode="numeric" value="${rpTxt(k.bmax)}" placeholder="Tanpa batas atas">`)}
            ${FRon ? field('Fixed rebate', `<div class="cx-suffix" style="width:110px"><input class="cx-in md" data-k="fr${ci}" data-inp="mNum" data-f="fr" data-c="${ci}" inputmode="decimal" value="${nv(k.fr)}"><span>%</span></div>`) : ''}</div>
            <button type="button" class="cx-link red" style="white-space:nowrap;padding-bottom:8px" data-on="mClsDel" data-c="${ci}">Hapus Kelas</button></div>
          <div class="cx-table"><table class="sm"><thead><tr><th>Tier</th><th>Growth dari</th><th>Growth s/d</th>${s.semester ? '<th>Semester</th>' : ''}${s.yearly ? '<th>Yearly</th>' : ''}<th>Total maks</th><th></th></tr></thead><tbody>
            ${k.tiers.map((t, ti) => { const nx = k.tiers[ti + 1]; const tot = (s.semester ? t.sem || 0 : 0) + (s.yearly ? t.yr || 0 : 0) + (FRon ? k.fr || 0 : 0);
              return `<tr><td class="t-strong">${ti + 1}</td>${pctCell(ci, ti, 'g', t.g, 'Growth dari')}<td>${nx ? `&lt; ${nv(nx.g)}%` : 'Tanpa batas'}</td>
                ${s.semester ? pctCell(ci, ti, 'sem', t.sem, 'Semester') : ''}${s.yearly ? pctCell(ci, ti, 'yr', t.yr, 'Yearly') : ''}<td class="t-strong">${fp(tot)}%</td>
                <td style="width:40px">${k.tiers.length > 1 ? `<button type="button" class="cx-icon-btn" aria-label="Hapus tier ${ti + 1} kelas ${esc(k.code)}" data-on="mTierDel" data-c="${ci}" data-t="${ti}">${ico.x}</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
          <button type="button" class="cx-link" style="align-self:flex-start" data-on="mTierAdd" data-c="${ci}">+ Tambah Tier</button></div>`).join('');
      return `<div class="cx-col"><h2 class="t-h4">Matriks Kelas</h2><span class="t-sm">Kelas toko dan tier rebate per group brand. Baseline dalam Rp, rata-rata per bulan.</span></div>
        <div class="cx-row">${errs.length ? tag(`${errs.length} masalah`, 'err') : tag('Matriks valid', 'ok')}<button class="cx-btn cx-s" type="button" data-on="tpl">Unduh Template</button><button class="cx-btn cx-s" type="button" data-on="openImp" ${ro ? 'disabled' : ''}>Impor Excel</button></div>
        <div class="cx-tabs" role="tablist" aria-label="Group brand">${L.groupsOf(p).map((x) => `<button type="button" role="tab" class="cx-tab sm ${x.id === g.id ? 'on' : ''}" style="padding:10px 20px" aria-selected="${x.id === g.id}" data-on="mGroup" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div>
        <fieldset ${ro ? 'disabled' : ''} class="cx-col" style="gap:12px;border:0;padding:0;margin:0">
          <div class="cx-between"><span class="t-strong">${esc(g.name)} · ${cls.length} kelas</span><button type="button" class="cx-btn cx-s" data-on="mClsAdd">Tambah Kelas</button></div>
          ${rows || `<div class="cx-soft" style="align-items:center;text-align:center;padding:24px"><span class="t-strong">Belum ada kelas untuk ${esc(g.name)}</span><span class="t-sm">Klik Tambah Kelas untuk mengisi langsung, atau Impor Excel.</span></div>`}</fieldset>
        <span class="t-sm">Isi langsung di sini atau lewat Impor Excel. Growth s/d dan Total maks dihitung otomatis. Growth dari harus naik pada tiap tier, dan batas baseline antar kelas tidak boleh tumpang tindih atau bercelah.</span>
        ${errs.length ? `<div class="cx-alert err"><span class="ic">!</span><div><b>Matriks belum valid</b><ul>${errs.slice(0, 8).map((e) => `<li>${esc(e)}</li>`).join('')}${errs.length > 8 ? `<li>dan ${errs.length - 8} lainnya</li>` : ''}</ul></div></div>` : ''}
        ${S.dlg === 'imp' ? importDlg(S, p, ch) : ''}`;
    },
    on: (p, ch) => {
      const K = (S, el) => S.m[S.g][Number(el.dataset.c)];
      return {
        mGroup: (S, el) => { S.g = el.dataset.g; },
        mCode: (S, el) => { K(S, el).code = el.value.trim().toUpperCase(); },
        mRp: (S, el) => { const n = L.rpNum(el.value); K(S, el)[el.dataset.f] = n ? n / 1e6 : null; },
        mNum: (S, el) => { K(S, el)[el.dataset.f] = numOrNull(el.value); },
        mTier: (S, el) => { K(S, el).tiers[Number(el.dataset.t)][el.dataset.f] = numOrNull(el.value); },
        mClsAdd: (S) => {
          const cls = S.m[S.g] = S.m[S.g] || []; const last = cls[cls.length - 1];
          if (last && last.bmax === null) last.bmax = last.bmin !== null ? last.bmin * 2 : null;
          cls.push({ code: String.fromCharCode(65 + cls.length), bmin: last ? last.bmax : null, bmax: null, fr: last ? last.fr : null,
            tiers: last ? clone(last.tiers) : [{ g: 20, sem: 0.5, yr: 1 }, { g: 25, sem: 0.75, yr: 1.25 }] });
        },
        mClsDel: (S, el) => { S.m[S.g].splice(Number(el.dataset.c), 1); },
        mTierAdd: (S, el) => { const k = K(S, el); const t = k.tiers[k.tiers.length - 1] || { g: 15, sem: 0.25, yr: 0.75 }; k.tiers.push({ g: (t.g || 0) + 5, sem: t.sem, yr: t.yr }); },
        mTierDel: (S, el) => { K(S, el).tiers.splice(Number(el.dataset.t), 1); },
        tpl: () => {
          const s = ch.settings; const rows = [['Group brand', 'Kelas', 'Baseline min (Rp)', 'Baseline maks (Rp)', 'Fixed rebate %', 'Tier', 'Growth dari %', 'Semester %', 'Yearly %']];
          for (const g of L.groupsOf(p)) for (const k of (ch.matrix[g.id] || [])) k.tiers.forEach((t, i) => rows.push([g.name, k.code, Math.round(k.bmin * 1e6), k.bmax === null ? '' : Math.round(k.bmax * 1e6), L.FR(p) ? k.fr : '', i + 1, t.g, s.semester ? t.sem : '', s.yearly ? t.yr : '']));
          if (rows.length === 1) for (const g of L.groupsOf(p)) rows.push([g.name, 'A', '', '', '', 1, '', '', '']);
          UI.download(`template-matriks-${ch.channel_code.toLowerCase()}.csv`, UI.toCsv(rows), 'text/csv'); return false;
        },
        openImp: (S) => { S.dlg = 'imp'; S.imp = null; },
        closeDlg: (S) => { S.dlg = null; S.imp = null; },
        impFile: (S, el) => {
          const f = el.files && el.files[0]; if (!f) return false;
          const rd = new FileReader(); rd.onload = () => { S.imp = parseMatrix(p, ch, UI.parseCsv(String(rd.result)), f); if (L._chPaint) L._chPaint(); }; rd.readAsText(f); return false;
        },
        impReset: (S) => { S.imp = null; },
        impGo: (S) => { Object.assign(S.m, clone(S.imp.matrix)); S.impNote = `Mengimpor matriks ${S.imp.names.join(', ')} (${S.imp.total} baris)`; S.dlg = null; S.imp = null; },
      };
    },
    save: (S, p, ch) => L.matrixErrors(p, Object.assign({}, ch, { matrix: S.m })),
    softSave: true,
    note: (S, p, ch) => { if (S.impNote) return S.impNote; const ch2 = L.groupsOf(p).filter((g) => JSON.stringify(ch.matrix[g.id] || []) !== JSON.stringify(S.m[g.id] || [])).map((g) => g.name); return ch2.length ? `Mengubah matriks ${ch2.join(', ')}` : 'Menyimpan matriks'; },
    commit: (S, p, ch) => { ch.matrix = clone(S.m); delete S.impNote; },
  };
  function parseMatrix(p, ch, rows, file) {
    const out = { file: file.name, size: Math.round(file.size / 1024) || 1, total: 0, bad: [], matrix: {}, names: [] };
    const body = rows.slice(1).filter((r) => r.some((c) => String(c || '').trim())); out.total = body.length;
    const byName = Object.fromEntries(L.groupsOf(p).map((g) => [g.name.toLowerCase(), g]));
    const tmp = {};
    const rp = (v) => { const n = L.rpNum(v); return String(v || '').trim() === '' ? null : n / 1e6; };
    body.forEach((r, i) => {
      const line = i + 2; const [gname, code, bmin, bmax, frp, tier, g, sem, yr] = r;
      const grp = byName[String(gname || '').toLowerCase()];
      const problem = (msg) => out.bad.push({ line, data: `${gname || '?'} · ${code || '?'} · tier ${tier || '?'}`, msg });
      if (!grp) return problem(`Group brand "${gname}" tidak ada di program`);
      if (!code) return problem('Kelas kosong');
      if (rp(bmin) === null) return problem('Baseline min kosong');
      if (numOrNull(g) === null) return problem('Growth dari kosong / bukan angka');
      const cls = (tmp[grp.id] = tmp[grp.id] || []); let k = cls.find((x) => x.code === String(code).toUpperCase());
      if (!k) { k = { code: String(code).toUpperCase(), bmin: rp(bmin), bmax: rp(bmax), fr: numOrNull(frp), tiers: [] }; cls.push(k); }
      else if (k.bmin !== rp(bmin) || k.bmax !== rp(bmax) || k.fr !== numOrNull(frp)) return problem('Kolom kelas (baseline, fixed rebate %) berbeda dengan baris lain kelas yang sama');
      k.tiers.push({ g: numOrNull(g), sem: numOrNull(sem), yr: numOrNull(yr), _no: Number(tier) || k.tiers.length + 1 });
    });
    for (const id of Object.keys(tmp)) { tmp[id].sort((a, b) => a.bmin - b.bmin); tmp[id].forEach((k) => { k.tiers.sort((a, b) => a._no - b._no); k.tiers.forEach((t) => delete t._no); }); }
    const merged = Object.assign(clone(ch.matrix), tmp);
    const names = Object.keys(tmp).map((id) => L.groupsOf(p).find((g) => g.id === id).name);
    L.matrixErrors(p, Object.assign({}, ch, { matrix: merged })).filter((e) => names.some((n) => e.startsWith(n))).forEach((m) => out.bad.push({ line: '—', data: 'Matriks', msg: m }));
    out.matrix = tmp; out.names = names;
    return out;
  }
  function importDlg(S, p) {
    const im = S.imp;
    const step = (n, title, desc, inner) => `<div class="cx-row" style="flex-wrap:nowrap;align-items:flex-start;padding:16px;border-radius:8px;background:#F8F9FD"><span class="cx-numdot">${n}</span>
      <div class="cx-col" style="gap:10px;flex:1;min-width:0"><div class="cx-col" style="gap:2px"><span class="t-strong">${title}</span><span class="t-sm">${desc}</span></div>${inner}</div></div>`;
    const res = im ? `<div class="cx-between" style="padding:10px 12px;border:1px solid #D6D6D6;border-radius:4px;background:#fff"><span class="t-sm"><b>${esc(im.file)}</b> · ${im.size} KB</span><button type="button" class="cx-link" data-on="impReset">Ganti berkas</button></div>
      ${im.bad.length ? `<div class="cx-alert err"><span class="ic">!</span><div><b>${im.bad.length} masalah ditemukan</b>Perbaiki baris berikut lalu unggah ulang. Impor hanya berjalan jika semua baris valid.<ul>${im.bad.slice(0, 8).map((b) => `<li>Baris ${b.line} · ${esc(b.data)}: ${esc(b.msg)}</li>`).join('')}</ul></div></div>`
        : `<div class="cx-alert ok"><span class="ic">✓</span><div><b>${im.total} baris valid</b>Matriks ${esc(im.names.join(', '))} akan diganti.</div></div>`}`
      : '<label class="cx-drop" style="background:#fff"><span class="t-strong">Pilih berkas template yang sudah diisi</span><span class="t-sm">Format .csv (simpan dari Excel sebagai CSV)</span><input type="file" accept=".csv,text/csv" data-chg="impFile" style="max-width:240px"></label>';
    return modal('Impor Matriks Kelas', step(1, 'Unduh template', `Kolom: Group brand, Kelas, Baseline min, Baseline maks, ${L.FR(p) ? 'Fixed rebate %, ' : ''}Tier, Growth dari %, Semester %, Yearly %.`, '<button type="button" class="cx-btn cx-s" style="align-self:flex-start" data-on="tpl">Unduh Template</button>')
      + step(2, 'Unggah berkas terisi', 'Berkas langsung divalidasi setelah diunggah.', res),
      `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="impGo" ${im && !im.bad.length ? '' : 'disabled'}>Impor</button>`, 'l');
  }

  // ---- Fixed Rebate Detail
  TAB.fr = {
    init: (p, ch) => ({ f: clone(ch.fr), draft: { rent: '', act: '' } }),
    data: (S) => S.f,
    html: (S, p, ch, ro) => {
      const meta = [['rent', 'Visibility Rent', 'Objek sewa, nilai (Rp), dan periode. Nilai selalu wajib.', 'Objek sewa', 'Nama objek sewa baru'], ['act', 'Aktivitas', 'Jenis aktivitas dan periode. CBD memilih bernilai (Rp) atau hanya teks.', 'Jenis aktivitas', 'Nama jenis aktivitas baru']];
      const head = (k, title, desc) => `<div class="cx-between" style="align-items:flex-start;flex-wrap:nowrap"><div class="cx-col"><h3 class="t-h5">${title}</h3><span class="t-sm">${desc}</span></div>
        <div class="cx-row" style="flex-wrap:nowrap;gap:12px"><span class="t-strong">Tampil</span>${sw(S.f[k].on, `data-on="frTg" data-key="${k}" aria-label="Tampilkan ${title} di form pendaftaran"`)}</div></div>`;
      const cards = meta.map(([k, title, desc, lbl, add]) => { const x = S.f[k];
        return `<div class="cx-sub" style="gap:16px">${head(k, title, desc)}
          ${x.on ? `<span class="t-strong">${lbl} · ${x.items.length} pilihan</span><div class="cx-row" style="gap:8px">${x.items.map((it, j) => `<span class="cx-pill sq">${esc(it)}<button type="button" aria-label="Hapus ${esc(it)}" data-on="frDel" data-key="${k}" data-j="${j}">${ico.x}</button></span>`).join('')}</div>
            <div class="cx-row" style="flex-wrap:nowrap"><input class="cx-in md" style="max-width:420px" data-k="${k}new" data-inp="frDraft" data-key="${k}" value="${esc(S.draft[k])}" placeholder="${add}" aria-label="${add}"><button type="button" class="cx-btn cx-t" data-on="frAdd" data-key="${k}" ${S.draft[k].trim() ? '' : 'disabled'}>Tambah</button></div>`
          : '<span class="t-sm">Tidak tampil di form pendaftaran. Daftar pilihan tetap tersimpan.</span>'}</div>`; }).join('');
      return `<div class="cx-col"><h2 class="t-h4">Fixed Rebate Detail · ${esc(L.frName(p))}</h2><span class="t-sm">Bagian dan pilihan yang tampil di form pendaftaran CBD. Nilai Visibility Rent selalu wajib diisi CBD.</span></div>
        <fieldset ${ro ? 'disabled' : ''} class="cx-col" style="gap:16px;border:0;padding:0;margin:0">${cards}<div class="cx-sub">${head('oth', 'Lainnya', 'Baris bebas yang diisi CBD, bernilai (Rp) atau hanya teks.')}</div></fieldset>`;
    },
    on: () => ({
      frTg: (S, el) => { S.f[el.dataset.key].on = !S.f[el.dataset.key].on; },
      frDel: (S, el) => { S.f[el.dataset.key].items.splice(Number(el.dataset.j), 1); },
      frDraft: (S, el) => { const was = !!S.draft[el.dataset.key].trim(); S.draft[el.dataset.key] = el.value; return was !== !!el.value.trim(); },
      frAdd: (S, el) => { const k = el.dataset.key; const v = S.draft[k].trim(); if (v && !S.f[k].items.some((x) => x.toLowerCase() === v.toLowerCase())) { S.f[k].items.push(v); S.draft[k] = ''; } },
    }),
    save: (S) => { const e = []; for (const k of ['rent', 'act']) if (S.f[k].on && !S.f[k].items.length) e.push(`${k === 'rent' ? 'Visibility Rent' : 'Aktivitas'}: tambahkan minimal satu pilihan.`); return e; },
    note: (S, p, ch) => { const d = []; const nm = { rent: 'Visibility Rent', act: 'Aktivitas', oth: 'Lainnya' };
      for (const k of ['rent', 'act']) { const a = ch.fr[k].items; const b = S.f[k].items; b.filter((x) => !a.includes(x)).forEach((x) => d.push(`Menambah pilihan ${nm[k]} "${x}"`)); a.filter((x) => !b.includes(x)).forEach((x) => d.push(`Menghapus pilihan ${nm[k]} "${x}"`)); }
      for (const k of ['rent', 'act', 'oth']) if (ch.fr[k].on !== S.f[k].on) d.push(`${nm[k]} ${S.f[k].on ? 'ditampilkan' : 'disembunyikan'}`);
      return d.join('; ') || 'Menyimpan Fixed Rebate Detail'; },
    commit: (S, p, ch) => { ch.fr = clone(S.f); },
  };

  TAB.approval = apTab('REGISTRATION', (ch) => ch.layers.REGISTRATION, (ch, v) => { ch.layers.REGISTRATION = v; });

  // ---- MOU dan Dokumen
  const PLACEHOLDERS = [['{program.name}', 'Nama program'], ['{program.period}', 'Periode program'], ['{mou.number}', 'Nomor MOU otomatis'], ['{date.generated}', 'Tanggal MOU dibuat'],
    ['{store.name}', 'Nama customer atau group'], ['{store.code}', 'Kode customer atau group'], ['{store.address}', 'Alamat customer'], ['{group.name}', 'Channel'],
    ['{total.target}', 'Total target semua group brand'], ['{table.rebate}', 'Tabel group brand: kelas, target, semester %, yearly %, fixed rebate %'],
    ['{table.fixedRebate}', 'Tabel Fixed Rebate Detail: visibility rent, aktivitas, lainnya'], ['{signer.store}', 'Penanda tangan toko'], ['{signer.paragon}', 'Penanda tangan Paragon (CBD)']];
  L.PLACEHOLDERS = PLACEHOLDERS;
  function mouPreview(p, ch, sample, data) {
    const d = sample ? Object.assign({ program: p.name.toUpperCase(), number: 'MOU/LP2027/CS/0412', date: '12 Januari 2027', store: 'Cantik Kosmetik', code: '148795-000', address: 'Jl. Riau No. 45, Pekanbaru',
      period: L.periodTxt(p.period_start, p.period_end), signer: 'Budi Santoso', cbd: 'Rina Wulandari (CBD)',
      rows: [['Wardah', 'B', 'Rp 3.603.600.000', '0,75%', '1,25%', '1,50%'], ['Emina', 'A', 'Rp 568.371.000', '0,50%', '1,00%', '1,50%']],
      fr: 'Wardah · Visibility Rent: Gondola brand, Rp 30.000.000, Jan–Des.' }, data || {})
      : { program: '{program.name}', number: '{mou.number}', date: '{date.generated}', store: '{store.name}', code: '{store.code}', address: '{store.address}', period: '{program.period}', signer: '{signer.store}', cbd: '{signer.paragon}' };
    const FRon = L.FR(p);
    return `<div class="doc"><div style="text-align:center;font-weight:700;font-size:13px">PERJANJIAN KERJA SAMA<br>${esc(d.program)}</div><div>Nomor: ${esc(d.number)}</div>
      <div>Pada tanggal ${esc(d.date)}, yang bertanda tangan di bawah ini, <b>${esc(d.store)}</b> (${esc(d.code)}), beralamat di ${esc(d.address)}, selanjutnya disebut <b>Toko</b>, sepakat mengikuti program untuk periode ${esc(d.period)}.</div>
      <div style="font-weight:700">Lampiran 1 — Target dan Rebate</div>
      ${sample ? `<table><tr><th>Group brand</th><th>Kelas</th><th>Target / tahun</th><th>Semester</th><th>Yearly</th>${FRon ? `<th>${esc(L.frName(p))}</th>` : ''}</tr>${d.rows.map((r) => `<tr>${r.slice(0, FRon ? 6 : 5).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : '<span class="ph">{table.rebate}</span>'}
      ${FRon ? `<div style="font-weight:700">Lampiran 2 — ${esc(L.frName(p))} Detail</div>${sample ? `<div>${esc(d.fr)}</div>` : '<span class="ph">{table.fixedRebate}</span>'}` : ''}
      <div style="display:flex;justify-content:space-between;gap:16px;margin-top:12px"><span>Toko,<br><br>${esc(d.signer)}</span><span style="text-align:right">PT Paragon,<br><br>${esc(d.cbd)}</span></div></div>`;
  }
  L.mouPreview = mouPreview;
  const lastRev = (ch, S) => { const all = ch.mou.revisions.concat(S ? S.newRevs : []); return all[all.length - 1] || null; };
  TAB.mou = {
    init: (p, ch) => ({ docs: clone(ch.mou.docs), reviewer: reviewerOf(ch), newRevs: [] }),
    data: (S) => ({ d: S.docs, r: S.reviewer, n: S.newRevs }),
    html: (S, p, ch, ro) => {
      const last = lastRev(ch, S);
      return `<div class="cx-col"><h2 class="t-h4">MOU dan Dokumen</h2><span class="t-sm">Template MOU, dokumen wajib, dan role yang memeriksa dokumen untuk channel ini.</span></div>
        <fieldset ${ro ? 'disabled' : ''} class="cx-grid2" style="gap:24px;align-items:start;border:0;padding:0;margin:0">
          <div class="cx-col" style="gap:24px">
            <div class="cx-sub" style="gap:16px"><h3 class="t-h5">Template MOU</h3>
              ${last ? `<div class="cx-soft cx-between" style="flex-wrap:nowrap;align-items:center"><div class="cx-col"><span class="t-strong" style="overflow-wrap:anywhere">${esc(last.file)}</span><span class="t-sm">Revisi ${last.no} · diunggah ${L.dateTxt(last.at)} oleh ${esc(last.by)}</span></div>${S.newRevs.length ? tag('Belum disimpan', 'warn') : tag('Revisi aktif', 'ok')}</div>`
                : '<div class="cx-soft"><span class="t-strong">Belum ada template</span><span class="t-sm">Unggah berkas .docx yang memuat placeholder.</span></div>'}
              <div class="cx-row"><label class="cx-btn cx-s" style="margin:0">Unggah Revisi Baru<input type="file" accept=".docx" data-chg="mouUp" hidden></label>${last ? '<button class="cx-btn cx-s" type="button" data-on="mouDl">Unduh</button>' : ''}</div>
              <span class="t-sm">Setiap unggahan menjadi revisi baru. Berkas harus .docx.</span></div>
            <div class="cx-sub" style="gap:0"><h3 class="t-h5" style="padding-bottom:16px">Dokumen Wajib</h3>
              ${S.docs.map((d, i) => `<div class="cx-row" style="flex-wrap:nowrap;padding:10px 0;border-top:1px solid #EBEBEB">
                <input class="cx-in md" style="flex:1" data-k="dn${i}" data-inp="docName" data-i="${i}" value="${esc(d.name)}" aria-label="Nama dokumen ${i + 1}" ${d.locked ? 'readonly' : ''}>
                <div class="cx-row" style="flex-wrap:nowrap;gap:8px;width:118px">${d.locked ? `${sw(true, 'disabled aria-label="Selalu wajib"')}<span class="t-sm">Selalu wajib</span>` : `${sw(d.req, `data-on="docReq" data-i="${i}" aria-label="Wajib"`)}<span class="t-sm">${d.req ? 'Wajib' : 'Opsional'}</span>`}</div>
                <button type="button" class="cx-icon-btn" aria-label="Hapus dokumen" data-on="docDel" data-i="${i}" ${d.locked ? 'disabled' : ''}>${ico.x}</button></div>`).join('')}
              <button type="button" class="cx-btn cx-s" style="align-self:flex-start;margin-top:12px" data-on="docAdd">Tambah Dokumen</button></div>
            <div class="cx-sub"><h3 class="t-h5">Reviewer Dokumen</h3>${field('Role reviewer', `<select class="cx-in" data-chg="rev">${Object.entries(REVIEWERS).map(([k, v]) => `<option value="${k}" ${S.reviewer === k ? 'selected' : ''}>${v}</option>`).join('')}</select>`)}
              <span class="t-sm">MoU dibuat dan berkas diunggah Admin Sales DC, lalu diperiksa reviewer ini.</span></div></div>
          <div class="cx-sub"><h3 class="t-h5">Placeholder yang Tersedia</h3><span class="t-sm">Tulis persis seperti di bawah di dalam berkas .docx. Placeholder lain ditolak.</span>
            <div class="cx-row" style="gap:8px">${PLACEHOLDERS.filter(([t]) => t !== '{table.fixedRebate}' || L.FR(p)).map(([t, d]) => `<span class="cx-tag plain" title="${esc(d)}" style="font-weight:400">${t}</span>`).join('')}</div></div>
        </fieldset>`;
    },
    on: (p, ch) => ({
      mouUp: (S, el) => { const f = el.files && el.files[0]; if (!f) return false; if (!/\.docx$/i.test(f.name)) { flash('danger', 'Berkas template harus .docx.'); UI.render(); return false; }
        const prev = lastRev(ch, S); S.newRevs.push({ no: (prev ? prev.no : 0) + 1, file: f.name, note: '', by: UI.currentUser().name, at: L.now() }); },
      mouDl: () => { const last = ch.mou.revisions[ch.mou.revisions.length - 1]; const html = `<html><head><meta charset="utf-8"></head><body>${mouPreview(p, ch, false)}</body></html>`;
        UI.download(((last && last.file) || 'template-mou').replace(/\.docx$/i, '') + '.doc', html, 'application/msword'); return false; },
      docName: (S, el) => { S.docs[Number(el.dataset.i)].name = el.value; },
      docReq: (S, el) => { const d = S.docs[Number(el.dataset.i)]; d.req = !d.req; },
      docDel: (S, el) => { S.docs.splice(Number(el.dataset.i), 1); },
      docAdd: (S) => { S.docs.push({ name: '', req: true }); },
      rev: (S, el) => { S.reviewer = el.value; },
    }),
    save: (S, p, ch) => { const e = []; if (!lastRev(ch, S)) e.push('Unggah template MOU (.docx).');
      if (S.docs.some((d) => !d.name.trim())) e.push('Nama dokumen wajib diisi.');
      const n = S.docs.map((d) => d.name.trim().toLowerCase()); if (n.some((x, i) => x && n.indexOf(x) !== i)) e.push('Nama dokumen tidak boleh sama.');
      return e; },
    note: (S, p, ch) => { const d = []; S.newRevs.forEach((r) => d.push(`Mengunggah template MOU revisi ${r.no}${r.no > 1 ? ` (sebelumnya revisi ${r.no - 1})` : ''}`));
      if (JSON.stringify(ch.mou.docs) !== JSON.stringify(S.docs)) d.push('Mengubah dokumen wajib'); if (reviewerOf(ch) !== S.reviewer) d.push(`Reviewer dokumen: ${REVIEWERS[S.reviewer]}`); return d.join('; ') || 'Menyimpan MOU dan dokumen'; },
    commit: (S, p, ch) => { ch.mou.revisions.push(...S.newRevs); ch.mou.docs = S.docs.map((d) => Object.assign({}, d, { name: d.name.trim() })); ch.mou.reviewer = S.reviewer; S.newRevs = []; },
  };

  // ---- Tinjau dan Publikasikan (Pendaftaran)
  const runningRegs = (ch) => L.regs().filter((r) => r.channel_id === ch.id && !['NEW', 'REGISTERED', 'CANCELLED'].includes(r.status)).length;
  function summaryOf(p, ch) {
    const s = ch.settings; const gs = L.groupsOf(p); const last = ch.mou.revisions[ch.mou.revisions.length - 1];
    const mech = [s.semester && 'semester', s.yearly && 'yearly'].filter(Boolean);
    const clsN = [...new Set(gs.map((g) => (ch.matrix[g.id] || []).length))];
    const tierN = [...new Set(gs.flatMap((g) => (ch.matrix[g.id] || []).map((k) => k.tiers.length)))];
    const frParts = [ch.fr.rent.on && `Visibility Rent ${ch.fr.rent.items.length} pilihan`, ch.fr.act.on && `Aktivitas ${ch.fr.act.items.length} pilihan`, ch.fr.oth.on && 'Lainnya'].filter(Boolean);
    const req = ch.mou.docs.filter((d) => d.req);
    return {
      settings: [`${mech.length ? mech.map((x, i) => (i ? x : x[0].toUpperCase() + x.slice(1))).join(' dan ') + ' aktif' : 'Tanpa semester dan yearly'}${s.semester ? `, rasio S1 ${nv(L.ratioOf(ch).s1)}% : S2 ${nv(L.ratioOf(ch).s2)}%` : ''}`,
        `${mech.length ? 'Rebate ' + mech.join(' dan ') + ' aktif' : 'Rebate semester dan yearly nonaktif'}${L.FR(p) ? `; fixed rebate ${L.frName(p)} aktif` : ''}`],
      matrix: [`${gs.length} group brand, ${clsN.length === 1 ? clsN[0] : clsN.join('–')} kelas dan ${tierN.length === 1 ? tierN[0] : tierN.join('–')} tier per kelas`, `${gs.map((g) => g.name).join(', ')}: ${clsN.length === 1 ? clsN[0] : clsN.join('–')} kelas per group brand`],
      fr: [frParts.join(', ') || 'Semua bagian disembunyikan', frParts.length ? [ch.fr.rent.on && 'Visibility Rent', ch.fr.act.on && 'Aktivitas', ch.fr.oth.on && 'Lainnya'].filter(Boolean).join(', ') + ' tampil' : 'Tidak ada bagian yang tampil'],
      approval: [routeTxt(ch.layers.REGISTRATION), (ch.layers.REGISTRATION || []).map((l) => `${L.ROLES[l.role] || l.role}${l.rule === 'IF' ? ' (jika kondisi terpenuhi)' : ''}`).join(' lalu ') || '—'],
      mou: [`${last ? `Template revisi ${last.no}` : 'Belum ada template'}, ${req.length} dokumen wajib, reviewer ${REVIEWERS[reviewerOf(ch)]}`, `${last ? `Template revisi ${last.no}` : 'Belum ada template'}; ${req.map((d) => d.name).join(', ')}`],
    };
  }
  TAB.review = {
    html: (S, p, ch) => {
      const comp = L.completeness(p, ch); const sm = summaryOf(p, ch); const pub = ch.reg_status === 'PUBLISHED'; const cancel = ch.reg_status === 'CANCELLED';
      const open = comp.tabs.filter((t) => !t.ok); const ready = !open.length;
      const st = pub ? tag('Pendaftaran dibuka', 'ok') : cancel ? tag('Dibatalkan', 'err') : ready ? tag('Siap dipublikasikan', 'info') : tag('Belum siap', 'warn');
      const alert = pub ? `<div class="cx-alert blue"><span class="ic">i</span><div><b>Pendaftaran dibuka sejak ${X.dt(ch.reg_published_at)}</b>CBD dapat mendaftarkan toko ke channel ini. Setup terkunci, kecuali MOU dan dokumen. Channel tetap Draft sampai Fase Pencairan juga dipublikasikan.</div></div>`
        : cancel ? `<div class="cx-alert err"><span class="ic">!</span><div><b>Pendaftaran dibatalkan ${X.dt(ch.reg_cancelled_at)}</b>Pendaftaran baru ditutup permanen. Pendaftaran yang sudah berjalan tetap dilanjutkan.</div></div>`
        : open.length ? `<div class="cx-alert warn"><span class="ic">!</span><div><b>${open.length} langkah belum lengkap</b>Lengkapi ${open.map((t) => t.label).join(' dan ')} sebelum Pendaftaran dapat dipublikasikan.</div></div>`
        : '<div class="cx-alert ok"><span class="ic">✓</span><div><b>Semua langkah lengkap</b>Tinjau ringkasan di bawah, lalu publikasikan Fase Pendaftaran.</div></div>';
      const locked = ch.reg_status !== 'DRAFT';
      return `<div class="cx-between" style="align-items:flex-start"><div class="cx-col"><h2 class="t-h4">Tinjau dan Publikasikan</h2><span class="t-sm">Periksa kesiapan dan ringkasan setup sebelum membuka Fase Pendaftaran untuk CBD.</span></div>${st}</div>${alert}
        <div class="cx-grid2" style="align-items:start">
          <div class="cx-sub" style="gap:0"><h3 class="t-h5" style="padding-bottom:16px">Kesiapan Setup</h3>${comp.tabs.map((t) => `<div class="cx-row" style="flex-wrap:nowrap;padding:14px 0;border-top:1px solid #EBEBEB">
            <div class="cx-col" style="flex:1"><span class="t-strong">${esc(t.label)}</span><span class="t-sm">${esc(sm[t.k][0])}</span></div>${t.ok ? tag('Lengkap', 'ok') : tag('Belum lengkap', 'warn')}
            <a class="cx-btn cx-t sm" href="#/setup/${p.id}/ch/${ch.id}/${t.k}">${locked && t.k !== 'mou' ? 'Lihat' : t.ok ? 'Ubah' : 'Lengkapi'}</a></div>`).join('')}</div>
          <div class="cx-sub" style="gap:0"><h3 class="t-h5" style="padding-bottom:16px">Ringkasan Setup</h3>
            ${[['Mekanisme', sm.settings[1]], ['Matriks Kelas', sm.matrix[1]], L.FR(p) && ['Fixed Rebate Detail', sm.fr[1]], ['Layer Approval', sm.approval[1]], ['MOU dan Dokumen', sm.mou[1]], ['Reviewer dokumen', REVIEWERS[reviewerOf(ch)]]].filter(Boolean)
              .map(([k, v]) => `<div class="cx-kv"><span class="t-sm-b">${k}</span><span class="t-body">${esc(v)}</span></div>`).join('')}</div></div>`;
    },
    side: (S, p, ch) => {
      const ready = L.completeness(p, ch).tabs.every((t) => t.ok); const closed = L.programClosed(p);
      if (ch.reg_status === 'PUBLISHED') return `<span class="t-sm">${runningRegs(ch)} pendaftaran toko sedang berjalan. Pembatalan menutup pendaftaran baru dan tidak dapat dibuka kembali.</span><hr class="cx-hr"><button type="button" class="cx-btn cx-danger lg full" data-on="askCancel" ${closed ? 'disabled' : ''}>Batalkan Pendaftaran</button>`;
      if (ch.reg_status === 'CANCELLED') return '<span class="t-sm">Pendaftaran sudah dibatalkan dan tidak dapat dibuka kembali.</span>';
      return `<span class="t-sm">Publikasikan aktif setelah semua langkah lengkap.</span><hr class="cx-hr"><button type="button" class="cx-btn cx-p lg full" data-on="askPub" ${ready && !closed ? '' : 'disabled'}>Publikasikan Pendaftaran</button>`;
    },
  };

  // ---------------------------------------------------------------- langkah Fase Pencairan
  TAB['payout-rules'] = {
    html: () => `<div class="cx-col"><h2 class="t-h4">Aturan Pencairan</h2><span class="t-sm">Syarat yang dicek sebelum rebate dicairkan.</span></div>
      <div class="cx-alert blue"><span class="ic">i</span><div><b>Disiapkan di fase berikutnya</b>Aturan Pencairan dan kondisinya dibahas di fase berikutnya. Langkah ini tidak menghalangi publikasi Fase Pencairan.</div></div>`,
    side: () => '<span class="t-sm">Langkah ini belum perlu diisi.</span>',
  };
  TAB['payout-approval'] = apTab('PAYOUT', (ch) => ch.layers.PAYOUT || [], (ch, v) => { ch.layers.PAYOUT = v; });
  const payReady = (ch) => !!ch.saved.payout_approval && (ch.layers.PAYOUT || []).length > 0;
  TAB['payout-review'] = {
    html: (S, p, ch) => {
      const pub = ch.pay_status === 'PUBLISHED'; const ok = payReady(ch);
      return `<div class="cx-between" style="align-items:flex-start"><div class="cx-col"><h2 class="t-h4">Tinjau dan Publikasikan</h2><span class="t-sm">Periksa setup Fase Pencairan sebelum dipublikasikan.</span></div>${pub ? tag('Dipublikasikan', 'ok') : ok ? tag('Siap dipublikasikan', 'info') : tag('Belum siap', 'warn')}</div>
        ${pub ? `<div class="cx-alert ok"><span class="ic">✓</span><div><b>Fase Pencairan dipublikasikan ${X.dt(ch.pay_published_at)}</b>Setup Fase Pencairan terkunci.</div></div>` : ok ? '' : '<div class="cx-alert warn"><span class="ic">!</span><div><b>1 langkah belum lengkap</b>Lengkapi Layer Approval sebelum Fase Pencairan dapat dipublikasikan.</div></div>'}
        <div class="cx-sub" style="gap:0"><h3 class="t-h5" style="padding-bottom:16px">Kesiapan Setup</h3>
          <div class="cx-row" style="flex-wrap:nowrap;padding:14px 0;border-top:1px solid #EBEBEB"><div class="cx-col" style="flex:1"><span class="t-strong">Aturan Pencairan</span><span class="t-sm">Disiapkan di fase berikutnya</span></div>${tag('Fase berikutnya')}</div>
          <div class="cx-row" style="flex-wrap:nowrap;padding:14px 0;border-top:1px solid #EBEBEB"><div class="cx-col" style="flex:1"><span class="t-strong">Layer Approval</span><span class="t-sm">${esc(routeTxt(ch.layers.PAYOUT))}</span></div>${ok ? tag('Lengkap', 'ok') : tag('Belum lengkap', 'warn')}
            <a class="cx-btn cx-t sm" href="#/setup/${p.id}/ch/${ch.id}/payout-approval">${pub ? 'Lihat' : ok ? 'Ubah' : 'Lengkapi'}</a></div></div>`;
    },
    side: (S, p, ch) => (ch.pay_status === 'PUBLISHED' ? '<span class="t-sm">Fase Pencairan sudah dipublikasikan.</span>'
      : `<span class="t-sm">Publikasikan aktif setelah Layer Approval lengkap.</span><hr class="cx-hr"><button type="button" class="cx-btn cx-p lg full" data-on="askPubPay" ${payReady(ch) && !L.programClosed(p) ? '' : 'disabled'}>Publikasikan Pencairan</button>`),
  };

  // ---------------------------------------------------------------- kerangka halaman channel
  const REG_STEPS = (p) => L.tabsOf(p).map(([k, l]) => [k, l]).concat([['review', 'Tinjau dan Publikasikan']]);
  const PAY_STEPS = [['payout-rules', 'Aturan Pencairan'], ['payout-approval', 'Layer Approval'], ['payout-review', 'Tinjau dan Publikasikan']];
  const phaseOf = (tab) => (tab.startsWith('payout') ? 'PAY' : 'REG');
  const savedKey = (tab) => ({ 'payout-approval': 'payout_approval' })[tab] || tab;
  const payOpen = (ch) => !!ch.reg_published_at;
  function readOnly(p, ch, tab) {
    if (L.programClosed(p)) return true;
    if (phaseOf(tab) === 'PAY') return ch.pay_status === 'PUBLISHED';
    if (tab === 'mou') return ch.reg_status === 'CANCELLED';
    return ch.reg_status !== 'DRAFT';
  }
  function stepState(p, ch, k) {
    if (k === 'review') { if (ch.reg_status === 'PUBLISHED') return [true, ch.pay_status === 'PUBLISHED' ? 'Dipublikasikan' : 'Menunggu Pencairan']; if (ch.reg_status === 'CANCELLED') return [true, 'Dibatalkan'];
      return [false, L.completeness(p, ch).tabs.every((t) => t.ok) ? 'Siap' : 'Belum siap']; }
    if (k === 'payout-rules') return [false, 'Fase berikutnya'];
    if (k === 'payout-approval') { const ok = payReady(ch); return [ok, ok ? 'Lengkap' : 'Belum lengkap']; }
    if (k === 'payout-review') return ch.pay_status === 'PUBLISHED' ? [true, 'Dipublikasikan'] : [false, payReady(ch) ? 'Siap' : 'Belum siap'];
    const ok = L.tabDone(p, ch, k); return [ok, ok ? 'Lengkap' : 'Belum lengkap'];
  }
  function chHead(p, ch) {
    const closed = L.programClosed(p);
    return X.head({ back: `#/setup/${p.id}`, title: esc(chName(ch)), tagHtml: X.statusTag(L.channelStatus(p, ch)), sub: `${esc(p.name)} · ${esc(p.code)}`,
      actions: `<a class="cx-btn cx-s" href="#/setup/${p.id}/ch/${ch.id}/simulate">Simulasi</a>${closed ? '' : '<button type="button" class="cx-btn cx-s" data-on="openCopy">Salin Pengaturan</button>'}` });
  }
  function phasePill(p, ch, ph) {
    return `<nav class="cx-phase" aria-label="Fase channel"><a class="${ph === 'REG' ? 'on' : ''}" href="#/setup/${p.id}/ch/${ch.id}/settings">Fase Pendaftaran</a>
      ${payOpen(ch) ? `<a class="${ph === 'PAY' ? 'on' : ''}" href="#/setup/${p.id}/ch/${ch.id}/payout-approval">Fase Pencairan</a>` : '<span class="off" title="Bisa disetup setelah Fase Pendaftaran dipublikasikan">Fase Pencairan</span>'}</nav>`;
  }
  function stepper(p, ch, ph, cur) {
    const steps = ph === 'PAY' ? PAY_STEPS : REG_STEPS(p);
    return `<nav class="cx-steps" aria-label="Langkah setup">${steps.map(([k, l], i) => { const [ok, st] = stepState(p, ch, k);
      return `<a class="cx-step ${ok ? 'done' : ''} ${k === cur ? 'cur' : ''}" href="#/setup/${p.id}/ch/${ch.id}/${k}" ${k === cur ? 'aria-current="step"' : ''}><span class="sh"><span class="sd">${ok ? ico.check : i + 1}</span>${esc(l)}</span><span class="ss">${esc(st)}</span></a>`; }).join('')}</nav>`;
  }
  function history(ch) {
    const a = (ch.audit || []).slice(-5).reverse();
    return `<section class="cx-card"><div class="cx-between"><h2 class="t-h4">Riwayat Perubahan</h2><span class="t-sm-b">${a.length} perubahan terakhir</span></div>
      <div class="cx-list">${a.map((x) => `<div><div class="cx-between" style="flex-wrap:nowrap;align-items:flex-start"><span class="t-strong">${esc(x.step || x.action)}</span><span class="t-sm" style="white-space:nowrap">${X.dt(x.at)} · ${esc(x.by)}</span></div>${x.note ? `<span class="t-body">${esc(x.note)}</span>` : ''}</div>`).join('') || '<div><span class="t-sm">Belum ada perubahan.</span></div>'}</div></section>`;
  }
  // Salin Pengaturan (push ke channel lain, versi tersimpan)
  const COPYABLE = { settings: 'Mekanisme dan batas minimum rate', matrix: 'Kelas, baseline, tier, dan rate tiap group brand', fr: 'Bagian dan pilihan Fixed Rebate Detail', approval: 'Layer approval dan kondisinya', mou: 'Template MOU, dokumen wajib, dan reviewer' };
  function copyInto(p, src, dst, k) {
    if (k === 'settings') dst.settings = clone(src.settings);
    if (k === 'matrix') dst.matrix = clone(src.matrix);
    if (k === 'fr') dst.fr = clone(src.fr);
    if (k === 'approval') dst.layers.REGISTRATION = clone(src.layers.REGISTRATION);
    if (k === 'mou') { const r = src.mou.revisions[src.mou.revisions.length - 1]; if (r) dst.mou.revisions.push({ no: (dst.mou.revisions.length ? dst.mou.revisions[dst.mou.revisions.length - 1].no : 0) + 1, file: r.file, note: `Dari ${chName(src)}`, by: UI.currentUser().name, at: L.now() });
      dst.mou.docs = clone(src.mou.docs); dst.mou.reviewer = reviewerOf(src); }
    L.markSaved(dst, k);
  }
  function copyModal(S, p, ch, tab) {
    const stepOk = !!COPYABLE[tab] && (tab !== 'fr' || L.FR(p)); const scope = stepOk ? S._cp.scope : 'all';
    const lbl = (REG_STEPS(p).find(([k]) => k === tab) || [])[1];
    const others = L.channels(p.id).filter((c) => c.id !== ch.id); const drafts = others.filter((c) => c.reg_status === 'DRAFT');
    const picked = drafts.filter((c) => S._cp.pick[c.id]);
    const radio = (v, title, desc, dis) => `<label class="cx-check ${dis ? 'lock' : ''}" style="align-items:flex-start"><input type="radio" name="cpscope" data-chg="cpScope" value="${v}" ${scope === v ? 'checked' : ''} ${dis ? 'disabled' : ''}><span class="cx-col" style="gap:0"><span class="t-strong">${title}</span><span class="t-sm">${desc}</span></span></label>`;
    const body = `<div class="cx-col" style="gap:12px"><span class="t-strong">Yang dibagikan</span>
        ${radio('step', `Hanya langkah ini${stepOk ? ': ' + esc(lbl) : ''}`, stepOk ? COPYABLE[tab] : 'Langkah ini tidak dapat disalin', !stepOk)}
        ${radio('all', 'Seluruh setup channel', 'Semua langkah yang sudah lengkap')}</div>
      <div class="cx-col" style="gap:8px"><span class="t-strong">Salin ke Channel · ${picked.length} dari ${drafts.length} Draft dipilih</span>
        <div class="box rows">${others.map((c) => { const lock = c.reg_status !== 'DRAFT';
          return `<label class="cx-check ${lock ? 'lock' : ''}" style="justify-content:space-between"><span class="cx-row" style="gap:10px;flex-wrap:nowrap"><input type="checkbox" data-chg="cpPick" data-id="${c.id}" ${!lock && S._cp.pick[c.id] ? 'checked' : ''} ${lock ? 'disabled' : ''}><span class="t-strong">${esc(chName(c))}</span></span>
            <span class="t-sm" style="text-align:right">${lock ? 'Sudah dipublikasikan, tidak dapat diubah' : S._cp.pick[c.id] ? (scope === 'all' ? 'Setup akan diganti' : `${esc(lbl)} akan diganti`) : 'Tidak berubah'}</span></label>`; }).join('') || '<span class="t-sm">Belum ada channel lain di program ini.</span>'}</div></div>
      ${picked.length ? `<div class="cx-alert warn"><span class="ic">!</span><div><b>Isi channel tujuan akan diganti</b>Isi ${scope === 'all' ? 'seluruh setup' : esc(lbl)} ${picked.length} channel akan diganti dan tidak dapat dikembalikan. Setiap channel tetap dapat diubah sendiri sesudahnya.</div></div>` : ''}
      ${S._dirty ? '<span class="t-sm">Yang disalin adalah versi tersimpan. Perubahan yang belum disimpan tidak ikut.</span>' : ''}`;
    return modal(`Salin Pengaturan dari ${chName(ch)}`, body, `<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="cpGo" ${picked.length ? '' : 'disabled'}>Salin ke ${picked.length} Channel</button>`, 'l');
  }

  route('/setup/:id/ch/:pc/:tab', ({ id, pc, tab }) => {
    requireSetup();
    const p = L.program(id); const ch = L.channel(pc);
    if (!p || !ch || ch.program_id !== p.id) UI.fail('Channel tidak ditemukan');
    if (tab === 'simulate') return simulatePage(p, ch);
    if (tab.startsWith('phase-') || tab === 'payout') UI.redirect(`/setup/${p.id}/ch/${ch.id}/settings`);
    const T = TAB[tab]; if (!T) UI.fail('Halaman tidak ditemukan');
    if (tab === 'fr' && !L.FR(p)) UI.redirect(`/setup/${p.id}/ch/${ch.id}/settings`);
    const ph = phaseOf(tab);
    if (ph === 'PAY' && !payOpen(ch)) UI.redirect(`/setup/${p.id}/ch/${ch.id}/review`);
    const ro = readOnly(p, ch, tab);
    const steps = ph === 'PAY' ? PAY_STEPS : REG_STEPS(p); const idx = steps.findIndex(([k]) => k === tab); const label = steps[idx][1];
    const auditLabel = ph === 'PAY' && tab !== 'payout-review' ? `${label} Pencairan` : label;
    return X.page(`${chName(ch)} · ${p.name}`, (root) => {
      const state = Object.assign(T.init ? T.init(p, ch) : {}, { _err: [], _dlg: null, _go: null, _cp: { scope: 'step', pick: {} } });
      const snap = T.data ? JSON.stringify(T.data(state)) : null;
      const dirty = () => !ro && !!T.data && JSON.stringify(T.data(state)) !== snap;
      const tabOn = T.on ? T.on(p, ch) : {};
      const on = {};
      for (const [k, fn] of Object.entries(tabOn)) on[k] = (S, el, ev) => { const d0 = dirty(); const r = fn(S, el, ev); if (ev && ev.type === 'input') return r === true || dirty() !== d0; return r; };
      const doSave = (S) => {
        S._err = (T.save && T.save(S, p, ch)) || [];
        if (S._err.length && !T.softSave) { window.scrollTo(0, 0); return false; }
        const note = T.note ? T.note(S, p, ch) : ''; T.commit(S, p, ch); L.markSaved(ch, savedKey(tab)); L.audit(ch, auditLabel, note); L.touchProgram(p); DB.save();
        flash(S._err.length ? 'warning' : 'success', S._err.length ? `${label} disimpan, tetapi masih ada isian yang perlu diperbaiki.` : `${label} tersimpan.`);
        return true;
      };
      const v = L.view(root, {
        state,
        html: (S) => {
          S._dirty = dirty();
          const sv = ch.saved_at && ch.saved_at[savedKey(tab)];
          const savedTxt = sv ? `Tersimpan ${X.dt(sv.at)} oleh ${esc(sv.by)}` : ch.saved[savedKey(tab)] ? 'Tersimpan' : 'Belum disimpan';
          const side = T.side ? T.side(S, p, ch) : ro
            ? `<span class="t-sm">${savedTxt}</span><hr class="cx-hr"><span class="t-sm">${L.programClosed(p) ? 'Periode program sudah lewat. Setup hanya bisa dilihat.' : ph === 'PAY' ? 'Fase Pencairan sudah dipublikasikan. Langkah ini hanya bisa dilihat.' : ch.reg_status === 'CANCELLED' ? 'Pendaftaran dibatalkan. Setup hanya bisa dilihat.' : 'Fase Pendaftaran sudah dipublikasikan. Langkah ini terkunci, kecuali MOU dan Dokumen.'}</span>`
            : `<span class="t-sm">${savedTxt}</span><hr class="cx-hr"><button type="button" class="cx-btn cx-p lg full" data-on="save" ${S._dirty ? '' : 'disabled'}>Simpan ${esc(auditLabel)}</button>
              <button type="button" class="cx-btn cx-t lg full" data-on="discard" ${S._dirty ? '' : 'disabled'}>Batalkan Perubahan</button>`;
          const errs = S._err.length ? `<div class="cx-alert err"><span class="ic">!</span><div><b>${T.softSave ? 'Masih ada isian yang perlu diperbaiki' : `${esc(label)} belum bisa disimpan`}</b><ul>${S._err.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>` : '';
          let dlg = '';
          if (S._dlg === 'copy') dlg = copyModal(S, p, ch, tab);
          if (S._dlg === 'leave') dlg = modal('Simpan Perubahan Dulu?', `<span class="t-body">Perubahan di langkah ${esc(label)} belum disimpan. Simpan agar tidak hilang, atau buang untuk kembali ke versi tersimpan.</span>`,
            '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Tetap di Halaman</button><button type="button" class="cx-btn cx-danger" data-on="leaveDiscard">Buang Perubahan</button><button type="button" class="cx-btn cx-p" data-on="leaveSave">Simpan Perubahan</button>');
          if (S._dlg === 'pub') dlg = modal('Publikasikan Fase Pendaftaran?', `<span class="t-body">CBD dapat mendaftarkan toko ke ${esc(chName(ch))} setelah dipublikasikan. Setup Fase Pendaftaran terkunci, kecuali MOU dan dokumen.</span>`,
            '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="doPub">Publikasikan</button>');
          if (S._dlg === 'pubPay') dlg = modal('Publikasikan Fase Pencairan?', `<span class="t-body">Layer approval pencairan ${esc(chName(ch))} dikunci. Channel menjadi Published setelah kedua fase dipublikasikan.</span>`,
            '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Batal</button><button type="button" class="cx-btn cx-p" data-on="doPubPay">Publikasikan</button>');
          if (S._dlg === 'cancel') dlg = modal('Batalkan Pendaftaran?', `<span class="t-body">Pendaftaran baru ke ${esc(chName(ch))} ditutup permanen dan tidak dapat dibuka kembali. ${runningRegs(ch)} pendaftaran yang sedang berjalan tetap dilanjutkan.</span>`,
            '<button type="button" class="cx-btn cx-t" data-on="closeDlg">Kembali</button><button type="button" class="cx-btn cx-danger-p" data-on="doCancel">Batalkan Pendaftaran</button>');
          return `${chHead(p, ch)}${phasePill(p, ch, ph)}
            <div class="cx-layout"><div class="cx-main">${stepper(p, ch, ph, tab)}<section class="cx-card">${errs}${T.html(S, p, ch, ro)}</section>${history(ch)}</div>
              <aside class="cx-side"><h2 class="t-h5">Langkah ${idx + 1} dari ${steps.length}: ${esc(label)}</h2>${side}</aside></div>${dlg}`;
        },
        on: Object.assign(on, {
          save: (S) => { if (doSave(S)) { UI.render(); return false; } },
          discard: (S) => { Object.assign(S, T.init(p, ch), { _err: [] }); },
          closeDlg: (S) => { if (tabOn.closeDlg) tabOn.closeDlg(S); S._dlg = null; },
          leaveDiscard: (S) => { S._leaving = true; go(S._go); return false; },
          leaveSave: (S) => { S._dlg = null; if (doSave(S)) { S._leaving = true; go(S._go); return false; } },
          openCopy: (S) => { S._dlg = 'copy'; S._cp = { scope: COPYABLE[tab] && (tab !== 'fr' || L.FR(p)) ? 'step' : 'all', pick: {} }; },
          cpScope: (S, el) => { S._cp.scope = el.value; },
          cpPick: (S, el) => { S._cp.pick[el.dataset.id] = el.checked; },
          cpGo: (S) => {
            const targets = L.channels(p.id).filter((c) => c.id !== ch.id && c.reg_status === 'DRAFT' && S._cp.pick[c.id]);
            const keys = S._cp.scope === 'all' ? Object.keys(COPYABLE).filter((k) => (k !== 'fr' || L.FR(p)) && ch.saved[k]) : [tab];
            const names = keys.map((k) => REG_STEPS(p).find(([x]) => x === k)[1]);
            for (const t of targets) { keys.forEach((k) => copyInto(p, ch, t, k)); L.audit(t, 'Salin Pengaturan', `${names.join(', ')} disalin dari ${chName(ch)}`); }
            L.audit(ch, 'Salin Pengaturan', `${names.join(', ')} disalin ke ${targets.map(chName).join(', ')}`); L.touchProgram(p); DB.save();
            flash('success', `${names.join(', ')} disalin ke ${targets.length} channel.`); UI.render(); return false;
          },
          askPub: (S) => { S._dlg = 'pub'; }, askPubPay: (S) => { S._dlg = 'pubPay'; }, askCancel: (S) => { S._dlg = 'cancel'; },
          doPub: () => { ch.reg_status = 'PUBLISHED'; ch.reg_published_at = L.now(); L.audit(ch, 'Tinjau dan Publikasikan', 'Mempublikasikan Fase Pendaftaran'); L.touchProgram(p); DB.save();
            flash('success', `Fase Pendaftaran ${esc(chName(ch))} dipublikasikan.`); UI.render(); return false; },
          doPubPay: () => { ch.pay_status = 'PUBLISHED'; ch.pay_published_at = L.now(); L.audit(ch, 'Tinjau dan Publikasikan Pencairan', 'Mempublikasikan Fase Pencairan'); L.touchProgram(p); DB.save();
            flash('success', `Fase Pencairan ${esc(chName(ch))} dipublikasikan.`); UI.render(); return false; },
          doCancel: () => { ch.reg_status = 'CANCELLED'; ch.reg_cancelled_at = L.now(); L.audit(ch, 'Tinjau dan Publikasikan', 'Membatalkan Fase Pendaftaran'); L.touchProgram(p); DB.save();
            flash('success', `Pendaftaran ${esc(chName(ch))} dibatalkan.`); UI.render(); return false; },
        }),
      });
      L._chPaint = v.paint;
      // tinggalkan langkah dengan perubahan belum disimpan → dialog "Simpan Perubahan Dulu?"
      root.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#/"]'); if (!a || state._leaving || !dirty()) return;
        e.preventDefault(); e.stopPropagation(); state._go = a.getAttribute('href').slice(1); state._dlg = 'leave'; v.paint();
      }, true);
    });
  });
  route('/setup/:id/ch/:pc', ({ id, pc }) => UI.redirect(`/setup/${id}/ch/${pc}/settings`));

  // ---------------------------------------------------------------- Simulasi
  // Simulasi mengikuti mockup halaman "Phase 1 TPO Initiative" layar 15 (pakai mesin hitung yang sama dengan form CBD)
  function simulatePage(p, ch) {
    const chip = L.chip; const sw = L.sw; const fj = L.fj;
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
