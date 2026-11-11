// Model Loyalty Program (mengikuti mockup Program Setup & spesifikasi Pendaftaran v2.5).
// Data disimpan di DB (localStorage) pada tabel lp*. Satu engine dipakai Simulasi, form Pendaftaran, dan approval.
(function () {
  const DB = window.DB;
  const T = { programs: 'lpPrograms', channels: 'lpChannels', regs: 'lpRegs', exc: 'lpExceptions', groups: 'lpCustomerGroups' };

  // ---------------------------------------------------------------- format
  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fp = (n) => (isFinite(n) ? Number(n).toFixed(2).replace('.', ',') : '—');
  const fr = (n) => (isFinite(n) ? 'Rp ' + Math.round(n).toLocaleString('id-ID') : '—');
  const fj = (n) => (isFinite(n) ? 'Rp ' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : '—');
  const pnum = (v) => { if (v === null || v === undefined) return NaN; const s = String(v).trim(); if (!s) return NaN; return parseFloat(s.replace(/\./g, (m, i, str) => (/,/.test(str) ? '' : m)).replace(',', '.')); };
  const rpNum = (v) => { const d = String(v === null || v === undefined ? '' : v).replace(/[^0-9]/g, ''); return d ? parseInt(d, 10) : 0; };
  const fmtThousand = (v) => { const n = rpNum(v); return n ? n.toLocaleString('id-ID') : ''; };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dateTxt = (d) => { if (!d) return '—'; const [y, m, dd] = String(d).slice(0, 10).split('-'); return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`; };
  const periodTxt = (a, b) => { const [ya, ma, da] = a.split('-'); const [yb, mb, db] = b.split('-'); return ya === yb ? `${Number(da)} ${MONTHS[ma - 1]} – ${Number(db)} ${MONTHS[mb - 1]} ${yb}` : `${dateTxt(a)} – ${dateTxt(b)}`; };
  const today = () => new Date().toISOString().slice(0, 10);
  const now = () => new Date().toISOString();

  // ---------------------------------------------------------------- master
  const CHANNELS = [
    ['CS_LIFESTYLE', 'CS Lifestyle', 'COSMETICS STORE LIFESTYLE'], ['CS_RETAIL', 'CS Retail', 'COSMETICS STORE RETAIL'],
    ['CS_WS_PASSIVE', 'CS Wholesaler (Passive)', 'COSMETICS STORE WHOLESALER (PASSIVE)'], ['CS_WS_ACTIVE', 'CS Wholesaler (Active)', 'COSMETICS STORE WHOLESALER (ACTIVE)'],
    ['GT_WS', 'GT Wholesaler', 'GENERAL TRADE WHOLESALER'], ['GT_RETAIL', 'GT Retail', 'GENERAL TRADE RETAIL'], ['OTHERS', 'Others', 'OTHERS'],
  ].map(([code, name, full]) => ({ code, name, full }));
  const BRANDS = ['Wardah', 'Light+', 'BrightNow', 'Emina', 'Make Over', 'Kahf', 'OMG', 'Labore', 'Putri', 'Biodef', 'Crystallure'];
  const DCS = ['DC Pekanbaru', 'DC Padang', 'DC Medan', 'DC Batam'];
  const channelOf = (code) => CHANNELS.find((c) => c.code === code) || { code, name: code, full: code };

  // Role approver (daftar tetap) — dipakai builder approval & user demo
  const ROLES = { RSBL: 'RSBL', RTP: 'RTP', ADMIN_SALES_HO: 'Admin sales HO', HEAD_FINANCE: 'Head of Finance', AP: 'Accounts Payable', TAX: 'Tax' };
  const REVIEWERS = { ADMIN_HO: 'Admin HO', ADMIN_SALES_DC: 'Admin Sales DC' };

  // Objek kondisi approval per fase
  const COND = {
    REGISTRATION: [
      ['OUTSIDE_CLASS', 'Ada group brand di luar kelas', 'ada group brand di luar kelas', 'flag', ''],
      ['BELOW_LOWEST_TIER', 'Ada group brand di bawah tier terendah', 'ada group brand di bawah tier terendah', 'flag', ''],
      ['RATE_CHANGED', 'Ada rate yang diubah dari rekomendasi', 'ada rate yang diubah dari rekomendasi', 'flag', ''],
      ['RATE_BELOW_MIN', 'Ada rate di bawah minimum channel', 'ada rate di bawah minimum channel', 'flag', ''],
      ['VALUE_OVER_BUDGET', 'Fixed Rebate Detail melebihi budget', 'Fixed Rebate Detail melebihi budget', 'flag', ''],
      ['BRAND_EXCLUDED', 'Ada group brand yang tidak diikuti toko', 'ada group brand yang tidak diikuti toko', 'flag', ''],
      ['TAGGING_CHANGED', 'Tagging berbeda dari tagging terakhir', 'tagging berbeda dari tagging terakhir', 'flag', ''],
      ['GROWTH_YEARLY_MIN', 'Growth yearly terendah (%)', 'growth yearly terendah', 'num', '%'],
      ['GROWTH_SEMESTER_MIN', 'Growth semester terendah, S1 atau S2 (%)', 'growth semester terendah (S1 / S2)', 'num', '%'],
      ['TOTAL_PCT_MAX', 'Total rebate tertinggi (%)', 'total rebate tertinggi', 'num', '%'],
      ['TOTAL_TARGET', 'Total target pengajuan (Rp jt)', 'total target', 'num', ' jt'],
    ],
    PAYOUT: [
      ['PAYOUT_TOTAL', 'Total nilai pencairan (Rp jt)', 'total nilai pencairan', 'num', ' jt'],
      ['ACHIEVEMENT_MIN', 'Pencapaian target terendah (%)', 'pencapaian target terendah', 'num', '%'],
      ['PAYOUT_ADJUSTED', 'Ada penyesuaian manual nilai pencairan', 'ada penyesuaian manual nilai pencairan', 'flag', ''],
      ['FR_REALIZATION_DIFF', 'Realisasi Fixed Rebate Detail berbeda dari rencana', 'realisasi Fixed Rebate Detail berbeda dari rencana', 'flag', ''],
    ],
    EXTRA: [
      ['SUBMISSION_TOTAL', 'Total nilai pengajuan (Rp jt)', 'total nilai pengajuan', 'num', ' jt'],
      ['HAS_ADJUSTMENT', 'Ada penyesuaian manual', 'ada penyesuaian manual', 'flag', ''],
    ],
  };
  const condMeta = (phase) => Object.fromEntries((COND[phase] || COND.EXTRA).map(([code, label, phrase, type, unit]) => [code, { code, label, phrase, type, unit }]));
  const OPS = { lt: '<', lte: '≤', gte: '≥', gt: '>' };

  // ---------------------------------------------------------------- default setup channel
  const DEFAULT_FR = () => ({
    rent: { on: true, items: ['Gondola brand', 'Endcap', 'Backwall', 'Shelf eye level', 'Neon box', 'Floor display'] },
    act: { on: true, items: ['Social Buzz', 'CRM', 'Relevant Beauty Lifestyle', 'Beauty class', 'In-store event', 'Sampling'] },
    oth: { on: true },
  });
  const DEFAULT_DOCS = () => [{ name: 'MOU ditandatangani', req: true, locked: true }, { name: 'KTP pemilik toko', req: true }, { name: 'NPWP', req: true }, { name: 'Foto toko', req: false }];
  function newChannel(programId, code) {
    return {
      program_id: programId, channel_code: code, reg_status: 'DRAFT', pay_status: 'DRAFT', reg_published_at: null, pay_published_at: null,
      saved: {}, settings: { semester: true, yearly: true, alloc_min: 30, min_yearly: null, min_fr: null, min_sem: null },
      matrix: {}, fr: DEFAULT_FR(), layers: { REGISTRATION: [], PAYOUT: [] }, payout_rules: { ratio_min: 95, carry_over: false },
      mou: { revisions: [], docs: DEFAULT_DOCS(), reviewer: 'ADMIN_HO' }, extra_phases: [], audit: [], updated_at: now(),
    };
  }

  // ---------------------------------------------------------------- akses data
  const programs = () => DB.t(T.programs);
  const program = (id) => DB.byId(T.programs, id);
  const channels = (pid) => DB.where(T.channels, (c) => c.program_id === Number(pid));
  const channel = (id) => DB.byId(T.channels, id);
  const groupsOf = (p) => p.brand_groups || [];
  const stores = () => DB.t('lpStores');
  const store = (code) => stores().find((s) => s.code === code);
  const custGroups = () => DB.t(T.groups);
  const custGroup = (id) => DB.byId(T.groups, id);
  const groupOfStore = (code) => custGroups().find((g) => g.members.includes(code));
  const regs = () => DB.t(T.regs);
  const reg = (id) => DB.byId(T.regs, id);
  const exceptions = () => DB.t(T.exc);

  // ---------------------------------------------------------------- status
  const FR = (p) => !!p.fr_enabled;
  const frName = (p) => (p.fr_enabled ? String(p.fr_name || '').trim() || 'Fixed Rebate' : '');
  const TABS = [['settings', 'Pengaturan', 'Pengaturan'], ['matrix', 'Matriks Kelas', 'Matriks'], ['fr', 'Fixed Rebate Detail', 'Fixed Rebate'], ['approval', 'Approval', 'Approval'], ['mou', 'MOU & Dokumen', 'MOU']];
  const tabsOf = (p) => TABS.filter(([k]) => k !== 'fr' || FR(p));
  function matrixErrors(p, ch) {
    const errs = [];
    for (const g of groupsOf(p)) {
      const cls = (ch.matrix[g.id] || []);
      if (!cls.length) { errs.push(`${g.name}: belum ada kelas`); continue; }
      cls.forEach((k, i) => {
        if (!isFinite(k.bmin)) errs.push(`${g.name} kelas ${k.code}: baseline min kosong`);
        if (k.bmax !== null && isFinite(k.bmax) && k.bmax <= k.bmin) errs.push(`${g.name} kelas ${k.code}: baseline maks harus lebih besar dari min`);
        if (i < cls.length - 1 && (k.bmax === null || !isFinite(k.bmax))) errs.push(`${g.name} kelas ${k.code}: hanya kelas tertinggi yang boleh tanpa batas atas`);
        const nx = cls[i + 1];
        if (nx && isFinite(k.bmax) && isFinite(nx.bmin) && Math.abs(nx.bmin - k.bmax) > 1e-9) errs.push(`${g.name}: kelas ${k.code} dan ${nx.code} ${nx.bmin < k.bmax ? 'tumpang tindih' : 'berjarak'} (${k.bmax} vs ${nx.bmin} jt)`);
        if (!k.tiers.length) errs.push(`${g.name} kelas ${k.code}: belum ada tier`);
        k.tiers.forEach((t, j) => {
          if (!isFinite(t.g)) errs.push(`${g.name} kelas ${k.code} tier ${j + 1}: growth mulai kosong`);
          if (j > 0 && isFinite(t.g) && t.g <= k.tiers[j - 1].g) errs.push(`${g.name} kelas ${k.code} tier ${j + 1}: growth mulai harus lebih besar dari tier ${j}`);
          if (ch.settings.semester && !isFinite(t.sem)) errs.push(`${g.name} kelas ${k.code} tier ${j + 1}: semester % kosong`);
          if (ch.settings.yearly && !isFinite(t.yr)) errs.push(`${g.name} kelas ${k.code} tier ${j + 1}: yearly % kosong`);
        });
        if (FR(p) && !isFinite(k.fr)) errs.push(`${g.name} kelas ${k.code}: fixed rebate % kosong`);
      });
    }
    return errs;
  }
  function tabDone(p, ch, k) {
    if (!ch.saved[k]) return false;
    if (k === 'settings') return ch.settings.semester || ch.settings.yearly || FR(p);
    if (k === 'matrix') return matrixErrors(p, ch).length === 0;
    if (k === 'fr') return true;
    if (k === 'approval') return (ch.layers.REGISTRATION || []).length > 0 && layersErrors(ch.layers.REGISTRATION).length === 0;
    if (k === 'mou') return ch.mou.revisions.length > 0;
    return false;
  }
  function completeness(p, ch) { const t = tabsOf(p); const done = t.filter(([k]) => tabDone(p, ch, k)); return { done: done.length, total: t.length, tabs: t.map(([k, l, s]) => ({ k, label: l, short: s, ok: tabDone(p, ch, k) })) }; }
  const programClosed = (p) => p.period_end < today();
  function channelStatus(p, ch) {
    if (programClosed(p)) return 'CLOSED';
    const extraOk = (ch.extra_phases || []).every((x) => x.status === 'PUBLISHED');
    return ch.reg_status === 'PUBLISHED' && ch.pay_status === 'PUBLISHED' && extraOk ? 'PUBLISHED' : 'DRAFT';
  }
  function programStatus(p) {
    if (programClosed(p)) return 'CLOSED';
    const chs = channels(p.id);
    return chs.length && chs.every((c) => channelStatus(p, c) === 'PUBLISHED') ? 'PUBLISHED' : 'DRAFT';
  }
  const STATUS_CHIP = { DRAFT: ['Draft', 'c-blue'], PUBLISHED: ['Published', 'c-green'], CLOSED: ['Closed', 'c-grey'] };
  const regOpen = (ch) => ch.reg_status === 'PUBLISHED';
  const editable = (ch) => ch.reg_status !== 'PUBLISHED';

  function layersErrors(layers) {
    const e = [];
    (layers || []).forEach((l, i) => { if (l.rule === 'IF' && !l.conds.length) e.push(`Layer ${i + 1}: tambahkan minimal satu kondisi`); if (l.rule === 'IF' && l.conds.some((c) => c.type === 'num' && !isFinite(pnum(c.val)))) e.push(`Layer ${i + 1}: nilai kondisi belum diisi`); });
    return e;
  }

  // ---------------------------------------------------------------- perhitungan per group brand
  // sales: { brand: { si, so } } rata-rata / bulan. Group brand = jumlah semua brand anggota (dan semua toko anggota untuk customer group).
  function salesFor(codes, members) {
    let si = 0, so = 0;
    for (const c of codes) { const s = store(c); if (!s) continue; for (const b of members) { const v = s.sales[b]; if (v) { si += v.si; so += v.so; } } }
    return { si, so };
  }
  const findClass = (cls, base) => cls.find((k) => base >= k.bmin * 1e6 && (k.bmax === null || !isFinite(k.bmax) || base < k.bmax * 1e6)) || null;
  const tierOf = (k, g) => { let t = -1; if (k && isFinite(g)) k.tiers.forEach((x, i) => { if (g >= x.g) t = i; }); return t; };
  const near = (a, b) => Math.abs(a - b) < 0.0001;

  // u = input unit (dari registrasi / simulasi): { joined, tag, growth, g1, g2, s1, sem, yr, fr, plan }
  function calcUnit(p, ch, g, codes, u, opt = {}) {
    const S = ch.settings; const frOn = FR(p);
    const sales = opt.sales || salesFor(codes, g.members);
    const joined = u.joined !== false;
    const recTag = sales.si >= sales.so ? 'SI' : 'SO';
    const tag = u.tag || recTag;
    const base = joined ? (tag === 'SI' ? sales.si : sales.so) : 0;
    const cls = ch.matrix[g.id] || [];
    const g0 = pnum(u.growth), g1 = pnum(u.g1), g2 = pnum(u.g2);
    const gOk = isFinite(g0), g1Ok = isFinite(g1), g2Ok = isFinite(g2);
    const monthly = base * (1 + (gOk ? g0 : 0) / 100);
    const annual = monthly * 12;
    const t1 = S.semester ? base * (1 + (g1Ok ? g1 : 0) / 100) * 6 : 0;
    const t2 = S.semester ? base * (1 + (g2Ok ? g2 : 0) / 100) * 6 : 0;
    const semAnnual = t1 + t2;
    const gsOk = S.semester && g1Ok && g2Ok && base > 0;
    const gs = gsOk ? (semAnnual / (base * 12) - 1) * 100 : NaN;
    let k = joined ? findClass(cls, base) : null;
    const viaExc = !!opt.viaException && joined && !k && cls.length && base > 0 && base < cls[0].bmin * 1e6;
    if (viaExc) k = cls[0];
    const tierY = k && gOk ? tierOf(k, g0) : -1;
    const tierS = k && gsOk ? tierOf(k, gs) : -1;
    const rec = {
      sem: S.semester && k && tierS >= 0 ? k.tiers[tierS].sem : null,
      yr: S.yearly && k && tierY >= 0 ? k.tiers[tierY].yr : null,
      fr: frOn && k ? k.fr : null,
    };
    const val = (key, on) => (!on || !joined ? (on ? NaN : 0) : (u[key] !== null && u[key] !== undefined && String(u[key]).trim() !== '' ? pnum(u[key]) : (rec[key] !== null ? rec[key] : NaN)));
    const semV = val('sem', S.semester), yrV = val('yr', S.yearly), frV = val('fr', frOn);
    const total = (S.semester ? semV || 0 : 0) + (S.yearly ? yrV || 0 : 0) + (frOn ? frV || 0 : 0);
    const capOk = (!S.semester || rec.sem !== null) && (!S.yearly || rec.yr !== null) && (!frOn || rec.fr !== null) && !!k;
    const cap = capOk ? (S.semester ? rec.sem : 0) + (S.yearly ? rec.yr : 0) + (frOn ? rec.fr : 0) : NaN;
    const semBudget = S.semester ? semAnnual * (semV || 0) / 100 : 0;
    const yrRp = S.yearly ? annual * (yrV || 0) / 100 : 0;
    const frBudget = frOn ? annual * (frV || 0) / 100 : 0;
    const P = u.plan || { rent: [], act: [], oth: [] };
    const fset = ch.fr;
    const rentSum = fset.rent.on ? P.rent.reduce((a, r) => a + rpNum(r.val), 0) : 0;
    const actSum = fset.act.on ? P.act.reduce((a, r) => a + (r.on ? rpNum(r.val) : 0), 0) : 0;
    const othSum = fset.oth.on ? P.oth.reduce((a, r) => a + (r.on ? rpNum(r.val) : 0), 0) : 0;
    const incomplete = !frOn || !joined ? 0 : (fset.rent.on ? P.rent.filter((r) => !rpNum(r.val)).length : 0)
      + (fset.act.on ? P.act.filter((r) => (r.on ? !rpNum(r.val) : !String(r.note || '').trim())).length : 0)
      + (fset.oth.on ? P.oth.filter((r) => (r.on ? !String(r.obj || '').trim() || !rpNum(r.val) : !String(r.note || '').trim())).length : 0);
    return { g, u, joined, sales, recTag, tag, base, g0, gOk, g1, g2, gs, gsOk, monthly, annual, t1, t2, semAnnual, k, viaExc, tierY, tierS, rec, semV, yrV, frV, total, cap,
      semBudget, yrRp, frBudget, totalRp: semBudget + yrRp + frBudget, rentSum, actSum, othSum, used: joined && frOn ? rentSum + actSum + othSum : 0, incomplete };
  }

  // Pengecekan: hard = memblokir, appr = butuh alasan, info
  function checksOf(p, ch, calc) {
    const S = ch.settings; const out = [];
    const add = (c, code, label, kind) => out.push({ unit: c.g.name, code, label, kind, key: code + '_' + c.g.id });
    const tiers0 = (c) => (c.k && c.k.tiers[0] ? c.k.tiers[0].g : NaN);
    calc.forEach((c) => {
      if (!c.joined) { add(c, 'BRAND_EXCLUDED', 'Toko tidak ikut group brand ini. Tidak ada target, rebate, dan Fixed Rebate Detail; tidak masuk MOU.', 'info'); return; }
      if (!c.base) { add(c, 'NO_SALES', 'Belum ada data penjualan untuk group brand ini.', 'hard'); return; }
      if (!c.k) add(c, 'OUTSIDE_CLASS', `Baseline ${fj(c.base)} di luar semua kelas${(ch.matrix[c.g.id] || [])[0] ? ` (kelas terendah mulai ${fj(ch.matrix[c.g.id][0].bmin * 1e6)})` : ''}. Rate diisi manual.`, 'appr');
      else if ((S.yearly && c.tierY < 0) || (S.semester && c.tierS < 0)) add(c, 'BELOW_LOWEST_TIER', [S.yearly && c.tierY < 0 ? `Growth yearly ${c.gOk ? c.g0 : 0}%` : '', S.semester && c.tierS < 0 ? `growth semester gabungan ${c.gsOk ? fp(c.gs) : '0'}%` : ''].filter(Boolean).join(' dan ') + ` di bawah tier terendah (${tiers0(c)}%).`, 'appr');
      const keys = [S.semester && 'sem', S.yearly && 'yr', FR(p) && 'fr'].filter(Boolean);
      if (keys.some((key) => c.u[key] !== null && c.u[key] !== undefined && String(c.u[key]).trim() !== '' && c.rec[key] !== null && !near(pnum(c.u[key]), c.rec[key]))) add(c, 'RATE_CHANGED', 'Rate berbeda dari rekomendasi tier.', 'appr');
      const below = (S.semester && isFinite(S.min_sem) && isFinite(c.semV) && c.semV < S.min_sem) || (S.yearly && isFinite(S.min_yearly) && isFinite(c.yrV) && c.yrV < S.min_yearly) || (FR(p) && isFinite(S.min_fr) && isFinite(c.frV) && c.frV < S.min_fr);
      if (below) add(c, 'RATE_BELOW_MIN', 'Ada rate di bawah minimum channel.', 'appr');
      if (FR(p) && c.used > c.frBudget) add(c, 'VALUE_OVER_BUDGET', `Nilai Fixed Rebate Detail ${fj(c.used)} melebihi budget fixed rebate ${fj(c.frBudget)}.`, 'appr');
      if (S.semester) { const s1 = pnum(c.u.s1); if (!(s1 >= S.alloc_min && 100 - s1 >= S.alloc_min)) add(c, 'SPLIT_INVALID', `Pembagian batas cair harus minimal ${S.alloc_min}% per semester.`, 'hard'); }
      if (c.incomplete) add(c, 'FR_INCOMPLETE', `Lengkapi ${c.incomplete} baris Fixed Rebate Detail (isian wajib masih kosong).`, 'hard');
      if (c.tag !== c.recTag) add(c, 'TAGGING_CHANGED', `Tagging diubah dari rekomendasi sistem (${c.recTag === 'SI' ? 'Sell In' : 'Sell Out'}, nilai terbesar).`, 'info');
      if (isFinite(c.cap) && c.total > c.cap + 0.0001) add(c, 'TOTAL_OVER_CAP', `Total ${fp(c.total)}% melebihi maks tier ${fp(c.cap)}%.`, 'hard');
    });
    if (calc.length && calc.every((c) => !c.joined)) out.push({ unit: 'Pengajuan', code: 'NO_BRAND_JOINED', label: 'Minimal satu group brand harus ikut.', kind: 'hard', key: 'NB' });
    return out;
  }
  // Nilai objek kondisi approval (fase Pendaftaran) untuk satu pengajuan
  function factsOf(p, ch, calc, checks) {
    const has = (code) => checks.some((c) => c.code === code);
    const inc = calc.filter((c) => c.joined && c.base > 0);
    const min = (xs) => (xs.length ? Math.min.apply(null, xs) : NaN);
    const max = (xs) => (xs.length ? Math.max.apply(null, xs) : NaN);
    return {
      OUTSIDE_CLASS: has('OUTSIDE_CLASS'), BELOW_LOWEST_TIER: has('BELOW_LOWEST_TIER'), RATE_CHANGED: has('RATE_CHANGED'), RATE_BELOW_MIN: has('RATE_BELOW_MIN'),
      VALUE_OVER_BUDGET: has('VALUE_OVER_BUDGET'), BRAND_EXCLUDED: calc.some((c) => !c.joined), TAGGING_CHANGED: has('TAGGING_CHANGED'),
      GROWTH_YEARLY_MIN: min(inc.filter((c) => c.gOk).map((c) => c.g0)),
      GROWTH_SEMESTER_MIN: min(inc.flatMap((c) => [c.g1, c.g2].filter(isFinite))),
      TOTAL_PCT_MAX: max(inc.map((c) => c.total)),
      TOTAL_TARGET: calc.reduce((a, c) => a + (c.joined ? c.annual : 0), 0) / 1e6,
    };
  }

  // ---------------------------------------------------------------- approval: rute dari layer + fakta
  function testCond(meta, c, facts) {
    const m = meta[c.code]; if (!m) return false;
    if (m.type !== 'num') return !!facts[c.code];
    const a = facts[c.code], b = pnum(c.val);
    if (!isFinite(a) || !isFinite(b)) return false;
    return c.op === 'lt' ? a < b : c.op === 'lte' ? a <= b : c.op === 'gte' ? a >= b : a > b;
  }
  const phraseOf = (meta, c) => { const m = meta[c.code]; if (!m) return c.code; return m.type === 'num' ? `${m.phrase} ${OPS[c.op] || '>'} ${String(c.val).trim() ? c.val + m.unit : '…'}` : m.phrase; };
  function buildRoute(phase, layers, facts) {
    const meta = condMeta(phase);
    let lastRole = null, lastN = 0;
    return (layers || []).map((l, i) => {
      let runs, why;
      if (l.rule !== 'IF') { runs = true; why = 'Selalu wajib, approve manual.'; } else {
        const hits = l.conds.filter((c) => testCond(meta, c, facts));
        runs = l.conds.length > 0 && (l.match === 'ALL' ? hits.length === l.conds.length : hits.length > 0);
        why = runs ? 'Terpenuhi: ' + hits.map((c) => phraseOf(meta, c)).join(', ') + '.' : (l.conds.length ? 'Kondisi tidak terpenuhi.' : 'Kondisi belum diisi.');
      }
      let status = runs ? 'RUN' : 'SKIP';
      if (runs && lastRole === l.role) status = 'MERGED';
      else if (runs) { lastRole = l.role; lastN = i + 1; }
      return { n: i + 1, role: l.role, status, mergedWith: status === 'MERGED' ? lastN : null, why, rule: l.rule, match: l.match };
    });
  }
  function sentenceOf(phase, l) {
    const meta = condMeta(phase); const role = ROLES[l.role] || l.role;
    if (l.rule !== 'IF') return `${role} wajib menyetujui setiap pengajuan secara manual.`;
    if (!l.conds.length) return `${role}: kondisi belum diisi.`;
    return `${role} wajib menyetujui hanya jika ${l.conds.map((c) => phraseOf(meta, c)).join(l.match === 'ALL' ? ' dan ' : ' atau ')}. Jika tidak terpenuhi, layer ini dilewati.`;
  }

  // ---------------------------------------------------------------- pendaftaran: toko & status
  const REG_STATUS = {
    NEW: ['Belum didaftarkan', 'c-grey', 'todo'], DRAFT: ['Draft', 'c-blue', 'proc'], IN_APPROVAL: ['Menunggu approval', 'c-yellow', 'proc'],
    RETURNED: ['Dikembalikan', 'c-red', 'ret'], AWAITING_DOCS: ['Menunggu dokumen', 'c-yellow', 'proc'], DOC_REVIEW: ['Review dokumen', 'c-yellow', 'proc'],
    REGISTERED: ['Terdaftar', 'c-green', 'done'], CANCELLED: ['Dibatalkan', 'c-grey', 'todo'], CLOSED: ['Belum dibuka', 'c-grey', 'locked'],
  };
  // Peserta = toko single (tidak di group) atau customer group. code: kode toko / kode group
  function participants(dc) {
    const out = [];
    for (const g of custGroups()) { const first = store(g.members[0]); if (!first || (dc && g.dc !== dc)) continue; out.push({ kind: 'Group', code: g.code, group_id: g.id, name: g.name, sub: `${g.members.length} toko · ${g.members.map((c) => (store(c) || {}).name).join(', ')}`, dc: g.dc, channel: first.channel, codes: g.members.slice() }); }
    for (const s of stores()) { if (groupOfStore(s.code) || (dc && s.dc !== dc)) continue; out.push({ kind: 'Single', code: s.code, name: s.name, sub: s.address, dc: s.dc, channel: s.channel, codes: [s.code] }); }
    return out;
  }
  const participant = (code) => participants().find((x) => x.code === code);
  // eligible = ada group brand yang baseline-nya (SI/SO terbesar) ≥ min kelas A channel
  function eligibility(p, ch, part) {
    const res = groupsOf(p).map((g) => {
      const s = salesFor(part.codes, g.members); const best = Math.max(s.si, s.so);
      const cls = ch.matrix[g.id] || []; const min = cls[0] ? cls[0].bmin * 1e6 : NaN;
      return { g, si: s.si, so: s.so, best, min, ratio: isFinite(min) && min > 0 ? best / min * 100 : NaN, ok: isFinite(min) && best >= min };
    });
    return { eligible: res.some((r) => r.ok), brands: res, top: res.filter((r) => isFinite(r.ratio)).sort((a, b) => b.ratio - a.ratio)[0] };
  }
  const exceptionOf = (pid, code) => exceptions().find((e) => e.program_id === Number(pid) && e.code === code);
  const activeReg = (pid, code) => regs().filter((r) => r.program_id === Number(pid) && r.code === code && r.status !== 'CANCELLED').sort((a, b) => b.id - a.id)[0];

  function audit(ch, action, note) { ch.audit = ch.audit || []; const u = window.UI && UI.currentUser(); ch.audit.push({ at: now(), by: u ? u.name : 'Sistem', action, note: note || '' }); ch.updated_at = now(); }
  function touchProgram(p) { const u = window.UI && UI.currentUser(); p.updated_at = now(); p.updated_by = u ? u.name : ''; }

  // ---------------------------------------------------------------- tampilan kecil
  const chip = (txt, cls, extra = '') => `<span class="lp-chip ${cls}" ${extra}>${esc(txt)}</span>`;
  const statusChip = (st) => chip(STATUS_CHIP[st][0], STATUS_CHIP[st][1]);
  const sw = (on, attrs) => `<button type="button" role="switch" aria-checked="${on ? 'true' : 'false'}" class="lp-switch${on ? ' on' : ''}" ${attrs}><span></span></button>`;

  // View kecil dengan state lokal: render ulang kontainer saat state berubah, fokus input dipertahankan (data-k)
  function view(root, opts) {
    const st = opts.state;
    function paint() {
      const a = document.activeElement; const key = a && root.contains(a) && a.dataset ? a.dataset.k : null;
      const selStart = key && a.selectionStart !== undefined ? a.selectionStart : null;
      const sc = root.querySelector('[data-keep-scroll]'); const sx = sc ? sc.scrollLeft : 0;
      root.innerHTML = opts.html(st);
      const sc2 = root.querySelector('[data-keep-scroll]'); if (sc2) sc2.scrollLeft = sx;
      if (key) { const el = root.querySelector(`[data-k="${CSS.escape(key)}"]`); if (el) { el.focus(); try { if (selStart !== null && el.setSelectionRange && /text|search/.test(el.type)) el.setSelectionRange(selStart, selStart); } catch (e) { /* abaikan */ } } }
      if (opts.after) opts.after(st, root);
    }
    const handle = (ev, kind) => {
      const el = ev.target.closest(`[data-${kind}]`); if (!el || !root.contains(el)) return;
      const name = el.dataset[kind]; const fn = opts.on[name]; if (!fn) return;
      if (kind === 'on') ev.preventDefault();
      const r = fn(st, el, ev); if (r !== false) paint();
    };
    root.addEventListener('click', (e) => handle(e, 'on'));
    root.addEventListener('change', (e) => handle(e, 'chg'));
    root.addEventListener('input', (e) => { const el = e.target.closest('[data-inp]'); if (!el || !root.contains(el)) return; const fn = opts.on[el.dataset.inp]; if (fn && fn(st, el, e) === true) paint(); });
    paint();
    return { paint, state: st };
  }

  // ---------------------------------------------------------------- pengajuan: hitung semua group brand + rute
  const blankPlan = () => ({ rent: [], act: [], oth: [] });
  const blankUnit = (ch) => ({ joined: true, tag: null, growth: '', g1: '', g2: '', s1: '50', sem: null, yr: null, fr: null, plan: blankPlan(), _alloc: ch ? ch.settings.alloc_min : 30 });
  function regCalc(r) {
    const p = program(r.program_id); const ch = channel(r.channel_id);
    const calc = groupsOf(p).map((g) => calcUnit(p, ch, g, r.codes, r.units[g.id] || blankUnit(ch), { viaException: r.via_exception }));
    const checks = checksOf(p, ch, calc);
    const facts = factsOf(p, ch, calc, checks);
    return { p, ch, calc, checks, facts };
  }
  // Rute disimpan saat Ajukan: layer yang berjalan (digabung bila approver sama berurutan)
  function makeRoute(r) {
    const { ch, facts } = regCalc(r);
    return buildRoute('REGISTRATION', ch.layers.REGISTRATION, facts).map((s) => Object.assign(s, { decision: null, comment: '', by: null, at: null }));
  }
  const currentStep = (r) => (r.route || []).find((s) => s.status === 'RUN' && !s.decision) || null;
  function setStatus(r, to, note, by) { r.history = r.history || []; r.history.push({ from: r.status, to, by: by || null, at: now(), note: note || '' }); r.status = to; r.updated_at = now(); }

  // Antrian approver: layer berjalan milik role user, atau review dokumen milik reviewer channel
  function myQueue(user) {
    return regs().filter((r) => {
      if (r.status === 'IN_APPROVAL') { const st = currentStep(r); return !!st && st.role === user.role; }
      if (r.status === 'DOC_REVIEW') { const ch = channel(r.channel_id); return !!ch && ch.mou.reviewer === user.role && (!user.lp_dc || (store(r.codes[0]) || {}).dc === user.lp_dc); }
      return false;
    });
  }
  const pendingCount = (user) => myQueue(user).length;

  window.LP = {
    myQueue, pendingCount, blankUnit, blankPlan, regCalc, makeRoute, currentStep, setStatus,
    T, esc, fp, fr, fj, pnum, rpNum, fmtThousand, dateTxt, periodTxt, MONTHS, today, now,
    CHANNELS, BRANDS, DCS, channelOf, ROLES, REVIEWERS, COND, condMeta, OPS, DEFAULT_FR, DEFAULT_DOCS, newChannel,
    programs, program, channels, channel, groupsOf, stores, store, custGroups, custGroup, groupOfStore, regs, reg, exceptions,
    FR, frName, TABS, tabsOf, matrixErrors, tabDone, completeness, channelStatus, programStatus, programClosed, STATUS_CHIP, regOpen, editable, layersErrors,
    salesFor, findClass, tierOf, calcUnit, checksOf, factsOf, testCond, phraseOf, buildRoute, sentenceOf,
    REG_STATUS, participants, participant, eligibility, exceptionOf, activeReg, audit, touchProgram, chip, statusChip, sw, view,
  };
})();
