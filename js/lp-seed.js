// Data contoh Loyalty Program, mengikuti angka di mockup Program Setup (LP-2027-001 dst).
// Dipanggil di akhir Seed.build() sehingga ikut ter-reset lewat "Reset data demo".
(function () {
  const M = 1e6;
  // [kode, nama, alamat, DC, channel, { brand: [sell in jt, sell out jt] }]
  const STORES = [
    ['148795-000', 'Cantik Kosmetik', 'Jl. Riau No. 45, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [150, 130], 'Light+': [45, 38], 'BrightNow': [15, 12], 'Emina': [34.319392, 28.4], 'Make Over': [12.5, 9.1], 'Kahf': [8, 7] }],
    ['148801-000', 'Glow Beauty Store', 'Jl. Tuanku Tambusai 40, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [88, 79], 'Emina': [41, 36], 'Make Over': [26, 22] }],
    ['149002-000', 'Ayu Kosmetik', 'Jl. Riau 7, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [175, 160], 'Light+': [20, 18], 'Emina': [62, 55], 'Make Over': [31, 27] }],
    ['149101-000', 'Melati 1', 'Jl. Melati 1, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [60, 55], 'Emina': [22, 20], 'Make Over': [9, 8] }],
    ['149102-000', 'Melati 2', 'Jl. Melati 2, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [48, 44], 'Emina': [18, 16], 'Make Over': [8, 7] }],
    ['149103-000', 'Melati 3', 'Jl. Melati 3, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [40, 36], 'Emina': [15, 13] }],
    ['148990-000', 'Sinar Jaya Kosmetik', 'Jl. Nangka 21, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [260, 240], 'Emina': [110, 98], 'Make Over': [55, 50] }],
    ['148650-000', 'Dewi Beauty', 'Jl. Ahmad Yani 3, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [120, 115], 'Emina': [45, 40], 'Make Over': [24, 21] }],
    ['152001-000', 'Lestari Beauty', 'Jl. Paus 3, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [70, 66], 'Emina': [33, 30] }],
    ['150112-000', 'Mega Beauty', 'Jl. Arifin Ahmad 88, Pekanbaru', 'DC Pekanbaru', 'CS_RETAIL', { 'Wardah': [95, 90], 'Emina': [38, 35] }],
    ['151004-000', 'Bintang Kosmetik', 'Jl. Kaharuddin Nasution 5, Pekanbaru', 'DC Pekanbaru', 'GT_WS', { 'Wardah': [140, 120], 'Emina': [60, 52] }],
    // calon Toko Exception (baseline di bawah kelas A semua group brand)
    ['149120-000', 'Putri Kosmetik', 'Jl. Durian 9, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [42, 38], 'Emina': [26, 22.5], 'Make Over': [9.5, 8] }],
    ['149131-000', 'Nona Beauty 1', 'Jl. Sukajadi 12, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [20, 18], 'Emina': [13, 11] }],
    ['149132-000', 'Nona Beauty 2', 'Jl. Sukajadi 40, Pekanbaru', 'DC Pekanbaru', 'CS_LIFESTYLE', { 'Wardah': [15, 13], 'Emina': [11, 9] }],
    ['152310-000', 'Salsa Kosmetik', 'Jl. Veteran 17, Padang', 'DC Padang', 'CS_LIFESTYLE', { 'Wardah': [44, 40], 'Make Over': [15, 13] }],
    ['161402-000', 'Laris Beauty', 'Jl. Gatot Subroto 102, Medan', 'DC Medan', 'CS_LIFESTYLE', { 'Wardah': [38, 35] }],
    ['171455-000', 'Elok Kosmetik', 'Jl. Raja Ali Haji 4, Batam', 'DC Batam', 'CS_LIFESTYLE', { 'Emina': [27.5, 25], 'Make Over': [12, 10] }],
    ['150210-000', 'Rina Kosmetik', 'Jl. Kartama 30, Pekanbaru', 'DC Pekanbaru', 'CS_RETAIL', { 'Wardah': [31, 28], 'Emina': [18, 16] }],
    // toko eligible di DC lain
    ['152402-000', 'Anggun Kosmetik', 'Jl. Sudirman 5, Padang', 'DC Padang', 'CS_LIFESTYLE', { 'Wardah': [130, 118], 'Emina': [52, 47] }],
    ['161510-000', 'Medan Beauty Center', 'Jl. Iskandar Muda 8, Medan', 'DC Medan', 'CS_LIFESTYLE', { 'Wardah': [210, 190], 'Emina': [70, 66], 'Make Over': [40, 35] }],
  ];
  const USERS = [
    ['CBD Pekanbaru', 'cbd.pku@tradee.test', 'CBD', 'DC Pekanbaru'],
    ['CBD Padang', 'cbd.pdg@tradee.test', 'CBD', 'DC Padang'],
    ['RSBL Sumatera', 'rsbl@tradee.test', 'RSBL', null],
    ['RTP Sumatera', 'rtp@tradee.test', 'RTP', null],
    ['Admin Sales HO', 'admin.sales.ho@tradee.test', 'ADMIN_SALES_HO', null],
    ['Accounts Payable', 'ap@tradee.test', 'AP', null],
    ['Tax', 'tax@tradee.test', 'TAX', null],
    ['Admin Sales DC Pekanbaru', 'admin.sales.dc@tradee.test', 'ADMIN_SALES_DC', 'DC Pekanbaru'],
  ];

  // kelas: [kode, min jt, maks jt|null, FR %, semester % tier 1]; tier: growth 20/25/30, semester +0,25 per tier, yearly 1 / 1,25 / 1,5
  const CLS = {
    'Wardah': [['A', 50, 150, 1.5, 0.5], ['B', 150, 400, 1.5, 0.75], ['C', 400, 800, 2, 1], ['D', 800, null, 2.5, 1.25]],
    'Emina': [['A', 30, 100, 1.5, 0.5], ['B', 100, 250, 1.5, 0.75], ['C', 250, null, 2, 1]],
    'Make Over': [['A', 20, 50, 1, 0.5], ['B', 50, null, 1.5, 0.75]],
    'Kahf': [['A', 30, 120, 1, 0.5], ['B', 120, null, 1.5, 0.75]],
    'OMG': [['A', 40, 150, 1, 0.5], ['B', 150, null, 1.5, 0.75]],
    'Labore': [['A', 10, 50, 1, 0.5], ['B', 50, null, 1.25, 0.75]],
  };
  const mkMatrix = (name) => (CLS[name] || CLS['Make Over']).map(([code, bmin, bmax, fr, sem]) => ({ code, bmin, bmax, fr,
    tiers: [20, 25, 30].map((g, i) => ({ g, sem: sem + i * 0.25, yr: [1, 1.25, 1.5][i] })) }));

  const REG_LAYERS = () => [
    { role: 'RSBL', rule: 'IF', match: 'ANY', conds: [{ code: 'GROWTH_YEARLY_MIN', op: 'gte', val: '40' }] },
    { role: 'RTP', rule: 'ALWAYS', match: 'ANY', conds: [] },
  ];
  const PAY_LAYERS = () => [
    { role: 'RSBL', rule: 'ALWAYS', match: 'ANY', conds: [] },
    { role: 'RTP', rule: 'IF', match: 'ANY', conds: [{ code: 'PAYOUT_TOTAL', op: 'gt', val: '100' }, { code: 'PAYOUT_ADJUSTED', op: '', val: '' }] },
    { role: 'HEAD_FINANCE', rule: 'IF', match: 'ANY', conds: [{ code: 'PAYOUT_TOTAL', op: 'gt', val: '500' }] },
  ];

  function run() {
    const DB = window.DB; const LP = window.LP;
    const ago = (n) => new Date(Date.now() - n * 864e5).toISOString();
    for (const t of Object.values(LP.T)) DB.state[t] = [];
    DB.state.lpStores = STORES.map(([code, name, address, dc, channel, s]) => ({ code, name, address, dc, channel,
      sales: Object.fromEntries(Object.entries(s).map(([b, [si, so]]) => [b, { si: Math.round(si * M), so: Math.round(so * M) }])) }));
    for (const [name, email, role, dc] of USERS) if (!DB.t('users').some((u) => u.email === email)) DB.insert('users', { name, email, role, dc_codes: null, channel_codes: null, lp_dc: dc });
    const U = Object.fromEntries(DB.t('users').map((u) => [u.email.split('@')[0], u]));
    const admin = U['admin.ho'] || DB.t('users')[0];

    // customer group (Master Data, dikelola CBD)
    DB.insert(LP.T.groups, { code: 'G-PKU-03', name: 'Group Melati', dc: 'DC Pekanbaru', members: ['149101-000', '149102-000', '149103-000'], owner_id: U['cbd.pku'].id, created_at: ago(90) });
    DB.insert(LP.T.groups, { code: 'G-PKU-07', name: 'Group Nona', dc: 'DC Pekanbaru', members: ['149131-000', '149132-000'], owner_id: U['cbd.pku'].id, created_at: ago(60) });

    const GROUPS = [['Wardah', ['Wardah', 'Light+', 'BrightNow']], ['Emina', ['Emina']], ['Make Over', ['Make Over']], ['Kahf', ['Kahf']], ['OMG', ['OMG']], ['Labore', ['Labore']]];
    const mkGroups = (list) => list.map(([name, members], i) => ({ id: 'g' + (i + 1), name, members: members.slice(), others: [] }));
    const mkProgram = (o) => DB.insert(LP.T.programs, Object.assign({ multi_program: true, cloned_from: null, brand_locked_at: ago(30), created_at: ago(30), updated_at: ago(2), updated_by: admin.name }, o));
    const fullChannel = (p, code, o = {}) => {
      const ch = Object.assign(LP.newChannel(p.id, code), o);
      for (const g of p.brand_groups) ch.matrix[g.id] = mkMatrix(g.name);
      ch.layers = { REGISTRATION: REG_LAYERS(), PAYOUT: PAY_LAYERS() };
      ch.settings = { semester: true, yearly: true, alloc_min: 30, min_yearly: 0.5, min_fr: null, min_sem: 0.5 };
      ch.mou.revisions = [{ no: 1, file: 'MOU_LP2027_rev1.docx', note: 'Disalin dari LP-2026-001', by: admin.name, at: '2026-10-28T09:00:00Z' },
        { no: 2, file: 'MOU_LP2027_rev2.docx', note: 'Nama penanda tangan Paragon ditambahkan', by: admin.name, at: '2026-10-30T09:00:00Z' }];
      ch.saved = { settings: true, matrix: true, fr: true, approval: true, mou: true };
      return ch;
    };
    // channel sebagian: done = jumlah tab yang sudah disimpan (urutan Pengaturan, Matriks, FR, Approval, MOU)
    const partial = (p, code, done) => {
      const ch = fullChannel(p, code);
      const keys = ['settings', 'matrix', 'fr', 'approval', 'mou'].filter((k) => k !== 'fr' || p.fr_enabled);
      ch.saved = Object.fromEntries(keys.map((k, i) => [k, i < done]));
      if (!ch.saved.matrix) ch.matrix = {};
      if (!ch.saved.approval) ch.layers.REGISTRATION = [];
      if (!ch.saved.mou) ch.mou.revisions = [];
      if (!ch.saved.settings) ch.settings = { semester: true, yearly: true, alloc_min: 30, min_yearly: null, min_fr: null, min_sem: null };
      return ch;
    };
    const ins = (ch) => DB.insert(LP.T.channels, ch);

    // LP-2027-001: 7 channel, CS Lifestyle pendaftaran dibuka
    const p1 = mkProgram({ code: 'LP-2027-001', name: 'Loyalty Program 2027', year: 2027, period_start: '2027-01-01', period_end: '2027-12-31', fr_enabled: true, fr_name: 'Vision Compass', brand_groups: mkGroups(GROUPS), updated_at: '2026-11-02T08:00:00Z' });
    const c1 = ins(fullChannel(p1, 'CS_LIFESTYLE', { reg_status: 'PUBLISHED', reg_published_at: '2026-11-01T08:00:00Z' }));
    ins(partial(p1, 'CS_RETAIL', 4)); ins(partial(p1, 'CS_WS_PASSIVE', 3)); ins(partial(p1, 'CS_WS_ACTIVE', 2));
    ins(partial(p1, 'GT_WS', 1)); ins(partial(p1, 'GT_RETAIL', 0)); ins(partial(p1, 'OTHERS', 0));

    // LP-2027-002: tanpa fixed rebate
    const p2 = mkProgram({ code: 'LP-2027-002', name: 'Loyalty LMT 2027', year: 2027, period_start: '2027-01-01', period_end: '2027-12-31', fr_enabled: false, fr_name: '',
      brand_groups: mkGroups([['Wardah', ['Wardah', 'Light+']], ['Emina', ['Emina']]]), updated_at: '2026-10-28T08:00:00Z' });
    const c2 = ins(fullChannel(p2, 'CS_LIFESTYLE', { reg_status: 'PUBLISHED', reg_published_at: '2026-10-28T08:00:00Z' }));
    ins(partial(p2, 'CS_RETAIL', 2));

    // LP-2026-002: semua fase dibuka
    const p3 = mkProgram({ code: 'LP-2026-002', name: 'Loyalty LMT Semester 2 2026', year: 2026, period_start: '2026-07-01', period_end: '2027-06-30', fr_enabled: true, fr_name: 'Vision Compass',
      brand_groups: mkGroups(GROUPS.slice(0, 3)), updated_at: '2026-07-01T08:00:00Z' });
    for (const code of ['CS_LIFESTYLE', 'CS_RETAIL']) ins(fullChannel(p3, code, { reg_status: 'PUBLISHED', pay_status: 'PUBLISHED', reg_published_at: '2026-06-20T08:00:00Z', pay_published_at: '2026-07-01T08:00:00Z' }));

    // LP-2026-001: sudah lewat periode
    const p4 = mkProgram({ code: 'LP-2026-001', name: 'Loyalty Program 2026', year: 2026, period_start: '2026-01-01', period_end: '2026-10-31', fr_enabled: true, fr_name: 'Vision Compass',
      brand_groups: mkGroups(GROUPS.slice(0, 4)), updated_at: '2026-10-15T08:00:00Z', updated_by: 'Admin IT' });
    for (const code of ['CS_LIFESTYLE', 'CS_RETAIL', 'CS_WS_PASSIVE', 'GT_WS']) ins(fullChannel(p4, code, { reg_status: 'PUBLISHED', pay_status: 'PUBLISHED' }));

    // ---------------------------------------------------------- pendaftaran contoh (LP-2027-001 · CS Lifestyle)
    const cbd = U['cbd.pku'];
    const unit = (o) => Object.assign(LP.blankUnit(c1), o);
    const mkReg = (p, ch, code, units, status, extra = {}) => {
      const part = LP.participant(code);
      const r = DB.insert(LP.T.regs, Object.assign({ program_id: p.id, channel_id: ch.id, code, kind: part.kind, name: part.name, codes: part.codes.slice(), status: 'DRAFT', revision: 1,
        via_exception: false, units, reasons: {}, route: [], docs: { mou: '', files: {} }, review: { status: null, note: '' }, history: [], created_by: cbd.id, created_at: ago(12), updated_at: ago(3) }, extra));
      if (status !== 'DRAFT') {
        r.route = LP.makeRoute(r);
        for (const c of LP.regCalc(r).checks) if (c.kind === 'appr') r.reasons[c.key] = 'Toko strategis di area, sudah dibahas dengan RSBL.';
        LP.setStatus(r, 'IN_APPROVAL', '', cbd.id); r.submitted_at = ago(4);
      }
      return r;
    };
    const decide = (r, n, decision, by, comment = '') => { const s = r.route.find((x) => x.status === 'RUN' && !x.decision); if (!s) return; Object.assign(s, { decision, by: by.id, at: ago(n), comment }); };
    const W = { growth: '43', g1: '34', g2: '38', s1: '50' };
    // Cantik Kosmetik — draft (contoh form mockup)
    mkReg(p1, c1, '148795-000', {
      g1: unit({ growth: '43', g1: '34', g2: '38', s1: '50', plan: { rent: [{ obj: 'Gondola brand', val: '30.000.000', from: 'Jan', to: 'Des' }],
        act: [{ type: 'Social Buzz', on: false, val: '', note: 'Posting konten Wardah 4x per bulan di Instagram toko', from: 'Jan', to: 'Des' }, { type: 'Beauty class', on: true, val: '12.000.000', note: '', from: 'Mar', to: 'Mar' }],
        oth: [{ on: true, obj: 'Hadiah member saat anniversary toko', val: '5.000.000', note: '' }] } }),
      g2: unit({ growth: '38', g1: '36', g2: '40', s1: '50', plan: { rent: [{ obj: 'Endcap', val: '10.000.000', from: 'Jan', to: 'Jun' }], act: [{ type: 'CRM', on: false, val: '', note: 'Promo Emina ke database member setiap bulan', from: 'Jan', to: 'Des' }], oth: [] } }),
      g3: unit({ growth: '40', g1: '38', g2: '42', s1: '40', sem: '0,50', yr: '0,75', fr: '1,00', plan: { rent: [], act: [{ type: 'Sampling', on: false, val: '', note: 'Sampling Make Over di area kasir', from: 'Feb', to: 'Feb' }], oth: [] } }),
      g4: unit({ joined: false }), g5: unit({ joined: false }), g6: unit({ joined: false }),
    }, 'DRAFT', { created_at: ago(1), updated_at: ago(0) });
    const plain = (o = {}) => ({ g1: unit(Object.assign({}, W, o)), g2: unit({ growth: '30', g1: '28', g2: '32', s1: '50' }), g3: unit({ growth: '25', g1: '24', g2: '26', s1: '50' }), g4: unit({ joined: false }), g5: unit({ joined: false }), g6: unit({ joined: false }) });
    // Ayu Kosmetik — menunggu RSBL (layer 1 dari 2)
    mkReg(p1, c1, '149002-000', { g1: unit({ growth: '43', g1: '40', g2: '44', s1: '50' }), g2: unit({ growth: '41', g1: '40', g2: '42', s1: '50' }), g3: unit({ growth: '45', g1: '44', g2: '46', s1: '50' }), g4: unit({ joined: false }), g5: unit({ joined: false }), g6: unit({ joined: false }) }, 'SUBMIT');
    // Group Melati — dikembalikan RTP
    const rm = mkReg(p1, c1, 'G-PKU-03', plain({ growth: '22' }), 'SUBMIT');
    decide(rm, 3, 'RETURNED', U.rtp, 'Cek lagi growth Wardah, terlalu rendah untuk kelas B.'); LP.setStatus(rm, 'RETURNED', 'Cek lagi growth Wardah, terlalu rendah untuk kelas B.', U.rtp.id);
    // Sinar Jaya — disetujui, menunggu dokumen
    const rs = mkReg(p1, c1, '148990-000', plain(), 'SUBMIT');
    rs.route.filter((s) => s.status === 'RUN').forEach((s) => Object.assign(s, { decision: 'APPROVED', by: (s.role === 'RSBL' ? U.rsbl : U.rtp).id, at: ago(5) }));
    LP.setStatus(rs, 'AWAITING_DOCS', 'MOU dibuat dari template revisi 2', null); rs.mou_rev = 2; rs.mou_no = 'MOU/LP2027/CS/0398';
    // Dewi Beauty — terdaftar
    const rd = mkReg(p1, c1, '148650-000', plain({ growth: '26' }), 'SUBMIT');
    rd.route.filter((s) => s.status === 'RUN').forEach((s) => Object.assign(s, { decision: 'APPROVED', by: (s.role === 'RSBL' ? U.rsbl : U.rtp).id, at: ago(9) }));
    rd.mou_rev = 2; rd.mou_no = 'MOU/LP2027/CS/0377'; rd.docs = { mou: 'MOU_Dewi_Beauty_ttd.pdf', files: { 'KTP pemilik toko': 'ktp_dewi.jpg', 'NPWP': 'npwp_dewi.pdf', 'Foto toko': 'foto_dewi.jpg' } };
    rd.review = { status: 'OK', note: '' }; LP.setStatus(rd, 'REGISTERED', 'Dokumen lengkap', admin.id);
    // LP-2027-002 · Lestari Beauty — draft
    mkReg(p2, c2, '152001-000', { g1: unit({ growth: '30', g1: '28', g2: '31', s1: '50' }), g2: unit({ growth: '25', g1: '24', g2: '26', s1: '50' }) }, 'DRAFT');

    // Toko Exception: Elok Kosmetik sudah diajukan Admin HO
    DB.insert(LP.T.exc, { program_id: p1.id, code: '171455-000', status: 'SUBMITTED', note: 'Toko baru, potensi area tinggi.', by: admin.id, at: '2027-01-08T08:00:00Z' });
  }

  window.LpSeed = { run };
})();
