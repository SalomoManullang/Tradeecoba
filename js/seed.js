// Data dummy prototype. Skema & pilar mengikuti contoh Locomm 2026 (arsitektur v0.5 §4.3);
// angka yang tidak tercantum di dokumen hanya contoh. Dibuat ulang setiap "Reset data demo".
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const CHANNELS = [['LOCOMM', 'Local E-Commerce (Locomm)', 1], ['CS', 'Cosmetic Store', 2], ['LMT', 'Local Modern Trade', 3]];
  // [kode, nama, range sell in / bulan untuk dummy]
  const BRANDS = [['WRD', 'Wardah', 60e6, 900e6], ['LIGHT', 'Light+', 5e6, 30e6], ['EMN', 'Emina', 30e6, 500e6], ['KHF', 'Kahf', 50e6, 600e6],
    ['MO', 'MakeOver', 20e6, 450e6], ['OMG', 'OMG', 100e6, 800e6], ['LAB', 'Labore', 10e6, 200e6]];
  const DCS = [['JKT', 'DC Jakarta', 'Jabodetabek'], ['BDG', 'DC Bandung', 'Jawa Barat'], ['SBY', 'DC Surabaya', 'Jawa Timur'], ['MDN', 'DC Medan', 'Sumatera']];
  const CITY = { JKT: ['Jakarta Selatan', 'Jakarta Barat', 'Bekasi', 'Depok'], BDG: ['Bandung', 'Cimahi'], SBY: ['Surabaya', 'Sidoarjo', 'Malang'], MDN: ['Medan', 'Binjai'] };
  const NAME = {
    LOCOMM: ['Beauty Hub', 'Glowup', 'Skincare ID', 'Kosmetik Kita', 'Makeup Center', 'Cantikku', 'Halal Beauty', 'Shopbeauty', 'Pinkish', 'Lovely', 'Rumah Cantik', 'Pusat Kosmetik'],
    CS: ['Cantik', 'Ayu', 'Glow', 'Bunga', 'Mutiara', 'Pesona', 'Dewi', 'Sari'],
    LMT: ['Swalayan', 'Mart', 'Supermarket', 'Toserba', 'Plaza', 'Fresh Mart'],
  };
  const STORE_COUNT = { LOCOMM: 24, CS: 16, LMT: 12 };
  const CH_SCALE = { LOCOMM: 1, CS: 0.5, LMT: 0.8 };

  const USERS = [
    ['Admin HO (Demo)', 'admin.ho@tradee.test', 'ADMIN_HO', null],
    ['Admin IT (Superadmin)', 'superadmin@tradee.test', 'SUPERADMIN', null],
    ['CBD Locomm', 'cbd.locomm@tradee.test', 'CBD', ['LOCOMM']],
    ['CDT Cosmetic Store', 'cdt.cs@tradee.test', 'CBD', ['CS']],
    ['Admin DC', 'admin.dc@tradee.test', 'ADMIN_DC', null],
    ['ABL Nasional', 'abl@tradee.test', 'ABL', null],
    ['Chadev', 'chadev@tradee.test', 'CHADEV', null],
    ['Finance', 'finance@tradee.test', 'FINANCE', null],
    ['Head of Finance', 'head.finance@tradee.test', 'HEAD_FINANCE', null],
  ];

  // Skema Locomm 2026: per brand → kelas [kode, min, max, fix maks %, tier [growth %, total %] atau [growth %, total %, conditional %]]
  const M = 1e6;
  const SCHEME = {
    WRD: { members: ['LIGHT'], est: 59, ir: 50, classes: [
      ['A', 40 * M, 150 * M, 1, [[70, 2.0], [75, 2.25], [80, 2.5]]], ['B', 150 * M, 400 * M, 1, [[70, 2.5], [75, 2.75], [80, 3.0]]],
      ['C', 400 * M, 750 * M, 2, [[65, 3.0], [70, 3.5], [75, 3.75]]], ['D', 750 * M, 3000 * M, 2, [[60, 4.0], [65, 4.25], [70, 4.5]]],
      ['E', 3000 * M, null, 2, [[40, 4.0], [45, 4.25], [50, 4.5]]]] },
    EMN: { members: [], est: 52, ir: 45, classes: [
      ['A', 30 * M, 100 * M, 1, [[55, 1.75], [60, 2.0], [65, 2.25]]], ['B', 100 * M, 250 * M, 1, [[50, 2.0], [55, 2.25], [60, 2.5]]],
      ['C', 250 * M, 400 * M, 2, [[45, 3.0], [50, 3.25], [55, 3.5]]], ['D', 400 * M, null, 2, [[45, 3.25], [50, 3.5], [55, 3.75]]]] },
    KHF: { members: [], est: 60, ir: 55, classes: [
      ['A', 50 * M, 200 * M, 1, [[55, 1.75], [60, 2.0], [65, 2.25]]], ['B', 200 * M, 500 * M, 1, [[50, 2.0], [55, 2.25], [60, 2.5]]],
      ['C', 500 * M, null, 1.5, [[45, 2.75], [50, 3.0], [55, 3.25]]]] },
    MO: { members: [], est: 48, ir: 40, classes: [
      ['A', 20 * M, 50 * M, 1, [[50, 2.0, 1.0], [55, 2.25, 1.25], [60, 2.5, 1.5]]], ['B', 50 * M, 250 * M, 1, [[50, 2.25, 1.25], [55, 2.5, 1.5], [60, 2.75, 1.75]]],
      ['C', 250 * M, 400 * M, 2, [[45, 3.5, 1.5], [50, 3.75, 1.75], [55, 4.0, 2.0]]], ['D', 400 * M, null, 2, [[45, 3.5, 1.5], [50, 3.75, 1.75], [55, 4.0, 2.0]]]] },
    OMG: { members: [], est: 85, ir: 80, classes: [
      ['A', 100 * M, 250 * M, 1, [[90, 2.0], [100, 2.5]]], ['B', 250 * M, 500 * M, 1, [[90, 2.25], [100, 2.75]]],
      ['C', 500 * M, 750 * M, 1.5, [[80, 3.0], [90, 3.5]]], ['D', 750 * M, null, 1.5, [[80, 3.25], [90, 3.75]]]] },
    LAB: { members: [], est: 250, ir: 200, classes: [
      ['A', 10 * M, 50 * M, 1, [[300, 2.0, 1.0], [400, 2.5, 1.5]]], ['B', 50 * M, 150 * M, 1, [[200, 2.25, 1.25], [300, 2.75, 1.75]]],
      ['C', 150 * M, null, 1, [[150, 2.5, 1.5], [200, 3.0, 2.0]]]] },
  };
  const SCHEME_BRANDS = ['WRD', 'EMN', 'KHF', 'MO', 'OMG', 'LAB'];

  // Vision Compass 2026: 3 pilar → 5 JTBD → 11 lead measure
  const PILLARS = [
    ['Being Relevant With Trend', 40, [
      ['Driving High-Impact Livestream Commerce', [['Live Stream Duration Dedicated', '2–4 jam per sesi', 'DURATION_HOURS', 'jam'], ['Live Stream Frequency', 'Min 3 sesi per minggu', 'COUNT', 'sesi/minggu']]],
      ['Creating Trend-Led Content', [['Short Video Content', 'Min 8 video per bulan', 'COUNT', 'video/bulan'], ['Trend Campaign Participation', 'Ikut campaign tren bulanan', 'BOOLEAN', '']]]]],
    ['Instore Experience', 30, [
      ['Optimizing Brand Store Visibility', [['Brand Store Banner Active', 'Banner brand aktif di toko', 'BOOLEAN', ''], ['Etalase Brand', 'Min 5 etalase', 'COUNT', 'etalase'], ['SKU Listing Completeness', 'Listing sesuai planogram', 'COUNT', 'SKU']]],
      ['Assortment Excellence', [['Hero SKU Always Available', 'Hero SKU tersedia tiap bulan', 'MONTH_COUNT', 'bulan']]]]],
    ['Shopper Experience', 30, [
      ['Building Loyal Shoppers', [['Follower Growth', 'Follower baru per bulan', 'COUNT', 'orang/bulan'], ['Chat Response Time', 'Balas chat < 1 jam', 'DURATION_HOURS', 'jam'], ['Voucher Program Active', 'Voucher toko aktif', 'MONTH_COUNT', 'bulan']]]]],
  ];

  function build() {
    const DB = window.DB;
    const E = window.Engine;
    const rnd = mulberry32(2027);
    const between = (a, b) => a + (b - a) * rnd();
    const pick = (xs) => xs[Math.floor(rnd() * xs.length)];
    const ago = (n) => new Date(Date.now() - n * 864e5).toISOString();

    DB.state = { seq: {}, sales: {} };
    for (const t of DB.TABLES) DB.state[t] = [];

    // ---------------------------------------------------------- master
    for (const [name, email, role, chans] of USERS) DB.insert('users', { name, email, role, dc_codes: null, channel_codes: chans });
    const u = Object.fromEntries(DB.t('users').map((x) => [x.email.split('@')[0], x]));
    DB.state.years = [{ year: 2026, is_active: true, note: 'Program referensi Locomm 2026' }, { year: 2027, is_active: true, note: 'Reframe 2027' }];
    DB.state.channels = CHANNELS.map(([code, name, sort]) => ({ code, name, sort, is_active: true }));
    DB.state.brands = BRANDS.map(([code, name], i) => ({ code, name, sort: i + 1, is_active: true }));
    DB.state.dcs = DCS.map(([code, name, region]) => ({ code, name, region }));

    // ---------------------------------------------------------- toko & penjualan (sell out, sell in) per brand
    const months2026 = E.monthsBetween('2026-01-01', '2026-12-01');
    const months2027 = E.monthsBetween('2027-01-01', '2027-06-01');
    for (const [ch] of CHANNELS) {
      for (let i = 1; i <= STORE_COUNT[ch]; i++) {
        const dc = DCS[(i - 1) % DCS.length][0];
        const id = `${ch}-${String(i).padStart(4, '0')}`;
        const city = pick(CITY[dc]);
        DB.state.stores.push({ customer_id: id, name: `${NAME[ch][(i - 1) % NAME[ch].length]} ${city.split(' ')[0]}`, dc_code: dc, channel_code: ch, city });
        const ratio = rnd() < 0.75 ? between(0.965, 0.995) : pick([between(0.8, 0.94), between(1.02, 1.08)]);
        const fewMonths = rnd() < 0.1;
        const s = (DB.state.sales[id] = {});
        for (const [b, , lo, hi] of BRANDS) {
          if (b !== 'WRD' && rnd() < 0.25) continue; // tidak semua toko jual semua brand
          const base = Math.exp(between(Math.log(lo), Math.log(hi))) * CH_SCALE[ch];
          const growth = b === 'LAB' ? between(2.2, 4.6) : between(1.35, 2.05);
          const put = (m, factor) => {
            const si = Math.round(base * factor * between(0.9, 1.1) / 1e5) * 1e5;
            (s[m] || (s[m] = {}))[b] = [Math.round(si * ratio / 1e5) * 1e5, si];
          };
          months2026.forEach((m, k) => { if (!fewMonths || k >= 10) put(m, 1); });
          for (const m of months2027) put(m, growth);
        }
      }
    }
    DB.state.salesUploads = months2026.concat(months2027).map((m) => ({ period: m, uploaded_at: ago(20) }));

    // ---------------------------------------------------------- program type & program 2026 (referensi)
    const tLoyalty = DB.insert('programTypes', { name: 'Loyalty Program', description: 'Program loyalty berbasis growth & pilar', is_active: true });
    DB.insert('programTypes', { name: 'JBP', description: 'Joint Business Plan', is_active: true });

    function scheme(pc, scale) {
      SCHEME_BRANDS.forEach((code, bi) => {
        const d = SCHEME[code];
        const b = DB.insert('programChannelBrands', { program_channel_id: pc.id, brand_code: code, member_codes: d.members, est_growth_pct: d.est, ir_growth_pct: d.ir, sort_order: bi + 1 });
        d.classes.forEach(([cls, min, max, fix, tiers], i) => {
          DB.insert('programClasses', { program_channel_brand_id: b.id, code: cls, sort_order: i + 1, baseline_min: min * scale, baseline_max: max === null ? null : max * scale, fix_rebate_max_pct: fix,
            tiers: tiers.map(([g, total, cond], k) => ({ tier_no: k + 1, target_growth_pct: g, total_rebate_pct: total, conditional_rebate_pct: cond !== undefined ? cond : +(total - fix).toFixed(4) })) });
        });
      });
      PILLARS.forEach(([pName, w, jtbds], pi) => {
        const pl = DB.insert('programPillars', { program_channel_id: pc.id, name: pName, sort_order: pi + 1, weight_pct: w });
        jtbds.forEach(([jName, lms], ji) => {
          const j = DB.insert('programJtbds', { program_pillar_id: pl.id, name: jName, sort_order: ji + 1 });
          lms.forEach(([lName, desc, type, unit], li) => DB.insert('programLeadMeasures', { program_jtbd_id: j.id, name: lName, description: desc, value_type: type, unit, weight_pct: null, sort_order: li + 1 }));
        });
      });
    }
    function channel(program, code, scale) {
      const pc = DB.insert('programChannels', { program_id: program.id, channel_code: code, pillar_framework_name: 'Vision Compass', monitoring_frequency: 'QUARTERLY',
        elig_min_sell_out_months: 3, elig_ratio_min: 96, elig_ratio_max: 100, elig_min_baseline: {}, elig_prior_payout_required: false });
      scheme(pc, scale);
      E.createChannelDefaults(pc, u['admin.ho'].id);
      // ABL auto-approve bila growth per brand ≥ 70% (contoh PRD FR8)
      const abl = DB.t('programApprovalLayers').find((l) => l.program_channel_id === pc.id && l.phase === 'REGISTRATION' && l.role_code === 'ABL');
      abl.conditions = [{ object_code: 'GROWTH_PER_BRAND', operator: 'GTE', value: 70 }];
      DB.insert('programPhaseFields', { program_channel_id: pc.id, phase: 'REGISTRATION', field_key: 'store_pic_phone', label: 'No. HP PIC toko', source: 'CUSTOM', data_type: 'TEXT',
        options: null, mode: 'ENTERED', expression: null, repeat_per: 'NONE', is_visible: true, is_editable: true, is_required: false, min_value: null, max_value: null, sort_order: 50 });
      return pc;
    }

    const p26 = DB.insert('programs', { code: 'LOYALTY-2026', name: 'Loyalty Program 2026', program_type_id: tLoyalty.id, year: 2026, period_start: '2026-01-01', period_end: '2026-12-31',
      description: 'Skema Locomm 2026 yang selama ini di-hardcode, dimasukkan sebagai program referensi (parity run).', status: 'PUBLISHED', published_at: ago(300), published_by: u['admin.ho'].id,
      cloned_from_program_id: null, lock_version: 1, created_by: u['admin.ho'].id, created_at: ago(320), updated_at: ago(300) });
    channel(p26, 'LOCOMM', 1);
    E.audit(p26.id, 'program', p26.id, 'publish', null, { status: 'PUBLISHED' });

    // ---------------------------------------------------------- program 2027: clone dari 2026 + channel CS
    const p27 = E.cloneProgram(p26.id, { code: 'LOYALTY-2027', name: 'Loyalty Program 2027', year: 2027, period_start: '2027-01-01', period_end: '2027-12-31' }, u['admin.ho'].id);
    channel(DB.byId('programs', p27.id), 'CS', 0.5);
    Object.assign(DB.byId('programs', p27.id), { description: 'Clone dari Loyalty Program 2026. Locomm dan CS dalam satu program.', status: 'PUBLISHED', published_at: ago(25), published_by: u['admin.ho'].id });
    E.audit(p27.id, 'program', p27.id, 'clone', null, { from: 'LOYALTY-2026' });
    E.audit(p27.id, 'program', p27.id, 'publish', { status: 'DRAFT' }, { status: 'PUBLISHED' });

    // ---------------------------------------------------------- registrasi contoh (Locomm 2027)
    const program = E.loadProgram(p27.id);
    const ch = program.channels.find((c) => c.channel_code === 'LOCOMM');
    const stores = DB.state.stores.filter((s) => s.channel_code === 'LOCOMM');
    const regs = [];
    for (const s of stores) {
      if (regs.length >= 9) break;
      const el = E.eligibility(program, ch, s.customer_id);
      if (!el.eligible) continue;
      const k = regs.length;
      const brands = el.brands.filter((b) => b.eligible).map((b) => {
        const cls = b.cls;
        const tiers = cls.tiers;
        // growth komitmen: sebagian tepat di tier tengah, sebagian di bawah 70% supaya ABL manual
        // k 3 & 7: semua brand ≥ 70% → layer ABL auto-approved
        const tierG = tiers[Math.min(tiers.length - 1, (k % tiers.length))].target_growth_pct + (k % 2);
        const g = k === 6 ? Math.max(0, tiers[0].target_growth_pct - 10) : [3, 7].includes(k) ? Math.max(70, tierG) : tierG;
        return E.commitment(ch, b.brand_code, Math.round(b.suggested / 1e6) * 1e6, g, program.programMonths);
      });
      const reg = DB.insert('registrations', { program_id: program.id, program_channel_id: ch.id, customer_id: s.customer_id, brands, data: { store_pic_phone: `0812${String(30000000 + k)}` },
        status: 'in_review', current_layer_id: null, approval_objects: E.registrationObjects(brands), registered_by: u['cbd.locomm'].id, registered_at: ago(60 - k), updated_at: ago(60 - k) });
      E.submit('registration', reg, u['cbd.locomm'].id);
      regs.push(reg);
    }
    // Jalankan approval: 0–5 disetujui penuh, 6 menunggu ABL (growth < 70%), 7 menunggu Chadev, 8 menunggu Admin DC
    const approveUntil = (rec, entity, stopRole) => {
      for (let guard = 0; guard < 6 && rec.status === 'in_review'; guard++) {
        const l = E.currentLayer(rec);
        if (!l || l.role_code === stopRole) break;
        const actor = DB.t('users').find((x) => x.role === l.role_code);
        E.act(entity, rec, 'approve', actor, null);
      }
    };
    regs.forEach((r, i) => {
      if (i <= 5) approveUntil(r, 'registration', null);
      else if (i === 6) approveUntil(r, 'registration', 'ABL');
      else if (i === 7) approveUntil(r, 'registration', 'CHADEV');
    });

    // ---------------------------------------------------------- monitoring Q1 & Q2 2027 (evidence per lead measure)
    const mPeriods = E.periodsOf(program.period_start, program.period_end, ch.monitoring_frequency);
    const lms = ch.leadMeasures;
    regs.slice(0, 6).forEach((r, i) => {
      mPeriods.slice(0, 2).forEach((per, pi) => {
        const evidence = {};
        lms.forEach((l, li) => { if (!(i === 2 && li % 3 === 0) && !(pi === 1 && i === 4 && li > 5)) evidence[l.id] = `evidence_${l.id}_${per.key}.jpg`; });
        const mon = DB.insert('monitorings', { registration_id: r.id, period_key: per.key, period_label: per.label, start: per.start, end: per.end, evidence, data: {},
          status: 'in_review', current_layer_id: null, approval_objects: E.monitoringObjects(ch, r, evidence, per), submitted_by: u['cbd.locomm'].id, created_at: ago(30 - pi * 10), updated_at: ago(30 - pi * 10) });
        E.submit('monitoring', mon, u['cbd.locomm'].id);
        if (!(pi === 1 && i >= 4)) approveUntil(mon, 'monitoring', null);
      });
    });

    // ---------------------------------------------------------- payout: conditional Q1 & fix S1
    const cPer = E.periodsOf(program.period_start, program.period_end, ch.payoutSchedule.CONDITIONAL)[0];
    const fPer = E.periodsOf(program.period_start, program.period_end, ch.payoutSchedule.FIX)[0];
    const mkPayout = (r, component, per, stop) => {
      const calc = E.payoutCalc(ch, r, component, per);
      const pay = DB.insert('payouts', { registration_id: r.id, component, period_key: per.key, period_label: per.label, start: per.start, end: per.end,
        amount: calc.amount, lines: calc.lines.map((l) => ({ brand_code: l.brand_code, brand_name: l.brand_name, class_code: l.class_code, achievement_pct: l.achievement_pct, tier_growth_pct: l.tier_growth_pct,
          conditional_pct: l.conditional_pct, fix_max_pct: l.fix_max_pct, pillar_score: l.pillar_score, net_sell_in: l.net_sell_in, amount: l.amount, trace: l.trace, error: l.error })),
        compliance: calc.compliance, data: { payout_schedule: per.key.startsWith('Q') ? 'Quarterly' : 'Semester', transfer_evidence: stop ? '' : `transfer_${r.customer_id}_${per.key}.pdf` },
        status: 'in_review', current_layer_id: null, approval_objects: E.payoutObjects(ch, r, calc, per), submitted_by: u['admin.dc'].id, created_at: ago(8), updated_at: ago(8) });
      E.submit('payout', pay, u['admin.dc'].id);
      approveUntil(pay, 'payout', stop);
    };
    mkPayout(regs[0], 'CONDITIONAL', cPer, null);
    mkPayout(regs[1], 'CONDITIONAL', cPer, 'HEAD_FINANCE');
    mkPayout(regs[2], 'CONDITIONAL', cPer, 'FINANCE');
    mkPayout(regs[0], 'FIX', fPer, 'HEAD_FINANCE');
    return DB.state;
  }

  window.Seed = { build, PASSWORD: 'tradee2027' };
})();
