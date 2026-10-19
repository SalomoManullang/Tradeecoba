// Data dummy prototype. Semua angka & nama hanya contoh (bukan data asli).
// Dibuat ulang secara deterministik setiap "Reset data demo".
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CHANNELS = [['CS', 'Cosmetic Store', 1], ['LOCOMM', 'Local E-Commerce (Locomm)', 2], ['LMT', 'Local Modern Trade', 3]];
  const BRANDS = [['WRD', 'Wardah', 0.35], ['EMN', 'Emina', 0.25], ['MO', 'Make Over', 0.15], ['KHF', 'Kahf', 0.15], ['OMG', 'OMG', 0.10]];
  const DCS = [['JKT', 'DC Jakarta', 'Jabodetabek'], ['BDG', 'DC Bandung', 'Jawa Barat'], ['SBY', 'DC Surabaya', 'Jawa Timur'], ['MDN', 'DC Medan', 'Sumatera']];
  const CITY = { JKT: ['Jakarta Selatan', 'Jakarta Barat', 'Bekasi', 'Depok', 'Tangerang'], BDG: ['Bandung', 'Cimahi', 'Garut'], SBY: ['Surabaya', 'Sidoarjo', 'Malang'], MDN: ['Medan', 'Binjai', 'Pematangsiantar'] };
  const NAME = {
    CS: ['Cantik', 'Ayu', 'Glow', 'Bunga', 'Mutiara', 'Pesona', 'Dewi', 'Sari', 'Melati', 'Kenanga', 'Anggrek', 'Seroja'],
    LOCOMM: ['Beauty', 'Glowup', 'Skincare', 'Kosmetik', 'Makeup', 'Cantikku', 'Halal Beauty', 'Shopbeauty', 'Pinkish', 'Lovely', 'Rumah Cantik', 'Pusat Kosmetik'],
    LMT: ['Swalayan', 'Mart', 'Supermarket', 'Toserba', 'Plaza', 'Grosir', 'Fresh Mart', 'Hypermart Lokal', 'Mitra', 'Sentosa', 'Jaya', 'Makmur'],
  };
  const SUFFIX = { CS: 'Cosmetic', LOCOMM: 'Official Store', LMT: '' };

  const USERS = [
    ['Admin HO (Demo)', 'admin.ho@tradee.test', 'ADMIN_HO', null, null],
    ['CBD Locomm', 'cbd.locomm@tradee.test', 'CBD', null, ['LOCOMM']],
    ['CBD Cosmetic Store', 'cbd.cs@tradee.test', 'CBD', null, ['CS']],
    ['CBD LMT', 'cbd.lmt@tradee.test', 'CBD', null, ['LMT']],
    ['RSM Nasional', 'rsm@tradee.test', 'RSM', null, null],
    ['Admin DC', 'admin.dc@tradee.test', 'ADMIN_DC', null, null],
    ['Finance / AP', 'finance@tradee.test', 'FINANCE', null, null],
  ];

  function build() {
    const DB = window.DB;
    const E = window.Engine;
    const rnd = mulberry32(2027);
    const between = (a, b) => a + (b - a) * rnd();
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const now = new Date().toISOString();
    const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

    DB.state = { seq: {}, sales: {} };
    for (const t of DB.TABLES) DB.state[t] = [];

    // ---------------------------------------------------------- master
    for (const [name, email, role, dcs, chans] of USERS) DB.insert('users', { name, email, role, dc_codes: dcs, channel_codes: chans });
    DB.state.years = [
      { year: 2026, is_active: true, note: 'Tahun data baseline' },
      { year: 2027, is_active: true, note: 'Prototype setup program dinamis' },
    ];
    DB.state.channels = CHANNELS.map(([code, name, sort]) => ({ code, name, sort, is_active: true }));
    DB.state.brands = BRANDS.map(([code, name], i) => ({ code, name, sort: i + 1, is_active: true }));
    DB.state.dcs = DCS.map(([code, name, region]) => ({ code, name, region }));
    const u = Object.fromEntries(DB.t('users').map((x) => [x.email.split('@')[0], x.id]));

    // ---------------------------------------------------------- toko & sell out
    const baseMonths = E.monthsBetween('2026-01-01', '2026-12-01');
    const runMonths = E.monthsBetween('2027-01-01', '2027-06-01');
    for (const [ch] of CHANNELS) {
      for (let i = 1; i <= 24; i++) {
        const dc = DCS[(i - 1) % DCS.length][0];
        const id = `${ch}-${String(i).padStart(4, '0')}`;
        const nm = `${NAME[ch][(i - 1) % NAME[ch].length]} ${SUFFIX[ch]} ${pick(CITY[dc]).split(' ')[0]}`.replace(/\s+/g, ' ').trim();
        const hasNpwp = rnd() > 0.25;
        DB.state.stores.push({
          customer_id: id, name: nm, dc_code: dc, channel_code: ch, city: pick(CITY[dc]), owner_name: `Pemilik ${i}`,
          npwp_no: hasNpwp ? `0${Math.floor(between(10, 99))}.${Math.floor(between(100, 999))}.${Math.floor(between(100, 999))}.${Math.floor(between(1, 9))}-${Math.floor(between(100, 999))}.000` : null,
          npwp_name: hasNpwp ? `PT/CV ${nm}` : null, bank_name: pick(['BCA', 'Mandiri', 'BRI', 'BNI']),
          bank_account_no: String(Math.floor(between(1e9, 9e9))), bank_account_name: `Pemilik ${i}`,
        });
        const base = Math.exp(between(Math.log(3e6), Math.log(130e6)));        // rata-rata sell out / bulan
        const ratio = rnd() < 0.15 ? between(0.65, 0.85) : between(0.9, 1.05);    // sell out : sell in
        const active = rnd() < 0.12 ? new Set(baseMonths.filter(() => rnd() < 0.5)) : new Set(baseMonths);
        const growth = between(0.9, 1.75);                                          // simulasi 2027 vs 2026
        const s = (DB.state.sales[id] = {});
        const put = (m, factor) => {
          s[m] = {};
          for (const [b, , share] of BRANDS) {
            const so = Math.round(base * factor * share * between(0.85, 1.15) / 1000) * 1000;
            s[m][b] = [so, Math.round(so / ratio / 1000) * 1000];
          }
        };
        for (const m of baseMonths) if (active.has(m)) put(m, m === '2026-03-01' ? 1.2 : m === '2026-12-01' ? 1.1 : 1);
        for (const m of runMonths) put(m, growth);
      }
    }
    DB.state.salesUploads = baseMonths.concat(runMonths).map((m) => ({ period: m, uploaded_at: daysAgo(30) }));

    // ---------------------------------------------------------- program Vision Compass 2027
    const p = DB.insert('programs', {
      year: 2027, code: 'VC27', name: 'Vision Compass 2027',
      description: 'Program loyalty berbasis growth sell out + 3 pilar Vision Compass (contoh dummy).',
      basis: 'sellout', baseline_method: 'avg_monthly', baseline_start: '2026-01-01', baseline_end: '2026-12-31',
      program_start: '2027-01-01', program_end: '2027-12-31', registration_start: '2026-11-01', registration_end: '2027-02-28',
      tax_rate_npwp: 2, tax_rate_non_npwp: 4, disbursement_submitter_role: 'ADMIN_DC',
      settings: { demo_open_windows: true }, status: 'active', created_by: u['admin.ho'], created_at: daysAgo(40),
    });
    const allBrands = BRANDS.map((b) => b[0]);
    const chDefs = {
      LOCOMM: { status: 'complete', ratio: null, minActive: 6, notes: 'Rasio SO:SI belum dipakai sebagai syarat (masih dikonfirmasi user), hanya ditampilkan.',
        classes: [['A', 60e6, null, 45, 3], ['B', 30e6, 60e6, 35, 2.5], ['C', 15e6, 30e6, 25, 2], ['D', 5e6, 15e6, 20, 1.5]] },
      CS: { status: 'complete', ratio: 85, minActive: 9, notes: null,
        classes: [['A', 80e6, null, 30, 2.5], ['B', 40e6, 80e6, 25, 2], ['C', 10e6, 40e6, 20, 1.5]] },
      LMT: { status: 'draft', ratio: null, minActive: null, notes: null,
        classes: [['Platinum', 100e6, null, 20, 2], ['Gold', 50e6, 100e6, 15, 1.5], ['Silver', 20e6, 50e6, 10, 1]] },
    };
    const pcIds = {}; const classIds = {};
    for (const [code, d] of Object.entries(chDefs)) {
      const pc = DB.insert('programChannels', {
        program_id: p.id, channel_code: code, brand_codes: allBrands, min_baseline: null, min_sellout_ratio: d.ratio,
        min_active_months: d.minActive, growth_editable: true, status: d.status, notes: d.notes,
      });
      pcIds[code] = pc.id; classIds[code] = {};
      d.classes.forEach(([name, min, max, g, reb], i) => {
        classIds[code][name] = DB.insert('classes', { program_channel_id: pc.id, name, baseline_min: min, baseline_max: max, min_growth: g, max_growth: null, rebate_pct: reb, sort: i }).id;
      });
    }

    const matrix = [
      ['Digital Presence', 'Owning Social Media Toko', [
        ['Live streaming', 'jam/minggu', 'number', { LOCOMM: { A: 4, B: 3, C: 2, D: 1 }, CS: { A: 2, B: 1 } }],
        ['Konten feed / reels', 'post/minggu', 'number', { LOCOMM: { A: 5, B: 4, C: 3, D: 2 }, CS: { A: 3, B: 2, C: 1 } }]]],
      ['In-Store / In-App Experience', 'Visibility & Display', [
        ['Banner / brand store aktif', null, 'yesno', { LOCOMM: { A: 'Ya', B: 'Ya', C: 'Ya', D: 'Ya' }, CS: { A: 'Ya', B: 'Ya', C: 'Ya' } }],
        ['Listing SKU sesuai planogram', 'SKU', 'number', { LOCOMM: { A: 60, B: 45, C: 30, D: 20 }, CS: { A: 80, B: 60, C: 40 } }]]],
      ['Shopper Engagement', 'CRM & Repeat Order', [
        ['Member / follower baru', 'orang/bulan', 'number', { LOCOMM: { A: 300, B: 200, C: 100, D: 50 }, CS: { A: 100, B: 60, C: 30 } }],
        ['Campaign bulanan diikuti', 'kali/periode', 'number', { LOCOMM: { A: 6, B: 5, C: 4, D: 3 } }]]],
    ];
    const reward = { A: 0.3, B: 0.25, C: 0.2, D: 0.15 };
    matrix.forEach(([pilName, jtName, lms], pi) => {
      const pil = DB.insert('pillars', { program_id: p.id, name: pilName, description: null, sort: pi });
      const jt = DB.insert('jtbds', { pillar_id: pil.id, name: jtName, sort: 0 });
      lms.forEach(([lmName, unit, type, params], li) => {
        const lm = DB.insert('lms', { jtbd_id: jt.id, name: lmName, unit, input_type: type, sort: li });
        for (const [ch, byClass] of Object.entries(params)) {
          for (const [cls, target] of Object.entries(byClass)) {
            DB.insert('params', { lead_measure_id: lm.id, program_class_id: classIds[ch][cls], target_value: String(target), reward_pct: reward[cls] || 0.2, reward_nominal: 0 });
          }
        }
      });
    });

    const fields = [
      [null, 'registration', 'pic_name', 'Nama PIC Toko', 'text', true, null, null, 1],
      [null, 'registration', 'pic_phone', 'No. HP PIC', 'text', false, null, 'Untuk konfirmasi program', 2],
      ['LOCOMM', 'registration', 'live_account', 'Akun Live Streaming', 'text', true, null, 'Username toko di platform live', 3],
      ['LOCOMM', 'registration', 'marketplace', 'Marketplace Utama', 'select', true, ['Shopee', 'Tokopedia', 'TikTok Shop', 'Lazada', 'Lainnya'], null, 4],
      ['CS', 'registration', 'display_area', 'Komitmen Area Display (m2)', 'number', true, null, null, 3],
      [null, 'disbursement', 'bukti_link', 'Link Folder Bukti JTBD', 'text', true, null, 'Google Drive / SharePoint berisi bukti pelaksanaan', 1],
      [null, 'disbursement', 'catatan', 'Catatan', 'textarea', false, null, null, 2],
    ];
    for (const [ch, stage, key, label, type, req, opts, help, sort] of fields) {
      DB.insert('fields', { program_id: p.id, program_channel_id: ch ? pcIds[ch] : null, stage, key, label, field_type: type, required: req, options: opts, help, sort });
    }
    const s1 = DB.insert('periods', { program_id: p.id, name: 'Semester 1', achieve_start: '2027-01-01', achieve_end: '2027-06-30', claim_start: '2027-07-01', claim_end: '2027-08-31', sort: 1 });
    DB.insert('periods', { program_id: p.id, name: 'Semester 2', achieve_start: '2027-07-01', achieve_end: '2027-12-31', claim_start: '2028-01-01', claim_end: '2028-02-28', sort: 2 });
    const comp = (name, type, config, sort) => DB.insert('components', { program_id: p.id, program_channel_id: null, name, comp_type: type, config, period_ids: null, is_active: true, sort });
    comp('Rebate Growth', 'growth_rebate', { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] }, 1);
    comp('Reward Vision Compass (JTBD)', 'jtbd', { base: 'actual', min_achievement: 90 }, 2);
    comp('Bonus Over Achievement', 'formula', { base: 'actual', expression: 'achievement >= 110 ? (actual - target) * 0.01 : 0' }, 3);
    const stRsm = DB.insert('steps', { program_id: p.id, phase: 'registration', name: 'Approval RSM', role: 'RSM', sort: 1 });
    const stFin = DB.insert('steps', { program_id: p.id, phase: 'disbursement', name: 'Cek Berkas & NPWP', role: 'FINANCE', sort: 1 });
    const stHo = DB.insert('steps', { program_id: p.id, phase: 'disbursement', name: 'Approval HO', role: 'ADMIN_HO', sort: 2 });

    // ---------------------------------------------------------- contoh peserta & pencairan
    const program = E.loadProgram(p.id);
    const candidates = [];
    for (const [code, count] of [['LOCOMM', 10], ['CS', 5]]) {
      const pc = program.channels.find((c) => c.channel_code === code);
      const stores = DB.state.stores.filter((s) => s.channel_code === code);
      const agg = E.salesAgg({ customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes, start: program.baseline_start, end: program.baseline_end });
      const eligible = stores.map((s) => {
        const a = agg.get(s.customer_id);
        const base = E.baselineOf(program, a);
        return { s, a, base, e: E.eligibility(pc, base, E.sellRatio(a), a ? a.activeMonths : 0) };
      }).filter((x) => x.a && x.e.eligible);
      eligible.slice(0, count).forEach((x, i) => {
        const growth = x.e.cls.min_growth + (i % 3 === 0 ? 5 : 0);
        const t = E.computeTarget(x.base, growth, program.programMonths);
        const reviewing = i >= count - 2;
        const data = code === 'LOCOMM'
          ? { pic_name: `PIC ${x.s.name}`, pic_phone: '0812' + String(10000000 + i), live_account: `@${x.s.customer_id.toLowerCase()}`, marketplace: pick(['Shopee', 'TikTok Shop', 'Tokopedia']) }
          : { pic_name: `PIC ${x.s.name}`, display_area: 4 + i };
        const by = u[code === 'LOCOMM' ? 'cbd.locomm' : 'cbd.cs'];
        const pa = DB.insert('participants', {
          program_id: p.id, program_channel_id: pc.id, customer_id: x.s.customer_id, class_id: x.e.cls.id, class_name: x.e.cls.name,
          baseline: x.base, sellout_ratio: E.sellRatio(x.a), growth_pct: growth, target_monthly: t.monthly, target_period: t.period, data,
          status: reviewing ? 'in_review' : 'active', current_step_id: reviewing ? stRsm.id : null, registered_by: by,
          registered_at: daysAgo(30 - i), updated_at: daysAgo(30 - i),
        });
        E.log('participant', pa.id, null, 'submit', null, by);
        if (!reviewing) E.log('participant', pa.id, 'Approval RSM', 'approve', null, u.rsm);
        if (code === 'LOCOMM' && !reviewing) {
          const a = E.salesAgg({ customerIds: [x.s.customer_id], brandCodes: pc.brand_codes, start: s1.achieve_start, end: s1.achieve_end }).get(x.s.customer_id);
          const actual = E.metric(program, a);
          candidates.push({ pa, x, actual, ach: actual / (pa.target_monthly * 6) });
        }
      });
    }
    // 3 pencairan Semester 1 (pencapaian tertinggi): 1 cair, 1 menunggu HO, 1 menunggu Finance
    candidates.sort((a, b) => b.ach - a.ach);
    candidates.slice(0, 3).forEach(({ pa, x, actual }, i) => {
      const lmValues = {};
      for (const lm of program.leadMeasures) {
        const prm = lm.params[x.e.cls.id];
        if (!prm) continue;
        lmValues[lm.id] = lm.input_type === 'yesno' ? 'Ya' : String(Number(prm.target_value) - (lm.sort === 1 && i === 1 ? 1 : 0));
      }
      const calc = E.computeDisbursement({ program, participant: pa, period: s1, actual, lmValues, data: {}, hasNpwp: !!x.s.npwp_no });
      const state = i === 0 ? ['paid', null] : i === 1 ? ['in_review', stHo.id] : ['in_review', stFin.id];
      const d = DB.insert('disbursements', {
        participant_id: pa.id, period_id: s1.id, target: calc.target, actual: calc.actual, achievement_pct: calc.achievement,
        lm_values: lmValues, data: { bukti_link: 'https://drive.example/bukti' },
        payee: { npwp_no: x.s.npwp_no || '', npwp_name: x.s.npwp_name || '', bank_name: x.s.bank_name, bank_account_no: x.s.bank_account_no, bank_account_name: x.s.bank_account_name },
        breakdown: calc.lines, gross_amount: calc.gross, tax_rate: calc.taxRate, tax_amount: calc.tax, net_amount: calc.net,
        status: state[0], current_step_id: state[1], submitted_by: u['admin.dc'], created_at: daysAgo(5 - i), updated_at: now,
      });
      E.log('disbursement', d.id, null, 'submit', null, u['admin.dc']);
      if (i <= 1) E.log('disbursement', d.id, stFin.name, 'approve', 'Berkas lengkap', u.finance);
      if (i === 0) E.log('disbursement', d.id, stHo.name, 'approve', null, u['admin.ho']);
    });
    return DB.state;
  }

  window.Seed = { build, PASSWORD: 'tradee2027' };
})();
