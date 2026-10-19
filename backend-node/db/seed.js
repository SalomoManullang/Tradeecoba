// Data dummy untuk prototype. Semua angka & nama hanya contoh (bukan data asli).
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const engine = require('../src/lib/engine');
const workflow = require('../src/lib/workflow');

// PRNG deterministik supaya hasil seed selalu sama
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(2027);
const between = (a, b) => a + (b - a) * rnd();
const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

const PASSWORD = 'tradee2027';

const CHANNELS = [
  ['CS', 'Cosmetic Store', 1],
  ['LOCOMM', 'Local E-Commerce (Locomm)', 2],
  ['LMT', 'Local Modern Trade', 3],
];
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

function months(start, end) { return engine.monthsBetween(start, end); }

async function seedMaster() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  for (const [name, email, role, dcs, chans] of USERS) {
    await db.q('INSERT INTO app_user (name, email, password_hash, role, dc_codes, channel_codes) VALUES ($1,$2,$3,$4,$5,$6)',
      [name, email, hash, role, dcs, chans]);
  }
  await db.q("INSERT INTO program_year (year, note) VALUES (2026, 'Tahun data baseline'), (2027, 'Prototype setup program dinamis')");
  for (const [code, name, sort] of CHANNELS) await db.q('INSERT INTO channel (code, name, sort) VALUES ($1,$2,$3)', [code, name, sort]);
  for (const [i, [code, name]] of BRANDS.entries()) await db.q('INSERT INTO brand (code, name, sort) VALUES ($1,$2,$3)', [code, name, i + 1]);
  for (const [code, name, region] of DCS) await db.q('INSERT INTO dc (code, name, region) VALUES ($1,$2,$3)', [code, name, region]);
}

async function seedStoresAndSales() {
  const baseMonths = months('2026-01-01', '2026-12-01');
  const runMonths = months('2027-01-01', '2027-06-01');
  let n = 0;
  for (const [ch] of CHANNELS) {
    for (let i = 1; i <= 24; i++) {
      const dc = DCS[(i - 1) % DCS.length][0];
      const id = `${ch}-${String(i).padStart(4, '0')}`;
      const nm = `${NAME[ch][(i - 1) % NAME[ch].length]} ${SUFFIX[ch]} ${pick(CITY[dc]).split(' ')[0]}`.replace(/\s+/g, ' ').trim();
      const hasNpwp = rnd() > 0.25;
      await db.q(
        `INSERT INTO store (customer_id, name, dc_code, channel_code, city, owner_name, npwp_no, npwp_name, bank_name, bank_account_no, bank_account_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [id, nm, dc, ch, pick(CITY[dc]), `Pemilik ${i}`,
          hasNpwp ? `0${Math.floor(between(10, 99))}.${Math.floor(between(100, 999))}.${Math.floor(between(100, 999))}.${Math.floor(between(1, 9))}-${Math.floor(between(100, 999))}.000` : null,
          hasNpwp ? `PT/CV ${nm}` : null, pick(['BCA', 'Mandiri', 'BRI', 'BNI']), String(Math.floor(between(1e9, 9e9))), `Pemilik ${i}`]);

      // Rata-rata sell out per bulan (log-uniform 3 jt - 130 jt)
      const base = Math.exp(between(Math.log(3e6), Math.log(130e6)));
      const ratio = rnd() < 0.15 ? between(0.65, 0.85) : between(0.9, 1.05);     // sell out : sell in
      const active = rnd() < 0.12 ? new Set(baseMonths.filter(() => rnd() < 0.5)) : new Set(baseMonths);
      const growth = between(0.9, 1.75);                                           // simulasi 2027 vs 2026
      const rows = [];
      for (const m of baseMonths) {
        if (!active.has(m)) continue;
        const season = m === '2026-03-01' ? 1.2 : m === '2026-12-01' ? 1.1 : 1;
        for (const [b, , share] of BRANDS) {
          const so = Math.round(base * share * season * between(0.85, 1.15) / 1000) * 1000;
          rows.push([id, m, b, so, Math.round(so / ratio / 1000) * 1000]);
        }
      }
      for (const m of runMonths) {
        for (const [b, , share] of BRANDS) {
          const so = Math.round(base * growth * share * between(0.85, 1.15) / 1000) * 1000;
          rows.push([id, m, b, so, Math.round(so / ratio / 1000) * 1000]);
        }
      }
      const values = rows.map((_, k) => `($${k * 5 + 1},$${k * 5 + 2},$${k * 5 + 3},$${k * 5 + 4},$${k * 5 + 5})`).join(',');
      await db.q(`INSERT INTO sales_monthly (customer_id, period, brand_code, sellout, sellin) VALUES ${values}`, rows.flat());
      n++;
    }
  }
  return n;
}

async function seedProgram(adminId) {
  const p = await db.one(
    `INSERT INTO program (year, code, name, description, basis, baseline_method, baseline_start, baseline_end, program_start, program_end,
       registration_start, registration_end, tax_rate_npwp, tax_rate_non_npwp, disbursement_submitter_role, settings, status, created_by)
     VALUES (2027, 'VC27', 'Vision Compass 2027',
       'Program loyalty berbasis growth sell out + 3 pilar Vision Compass (contoh dummy).',
       'sellout', 'avg_monthly', '2026-01-01', '2026-12-31', '2027-01-01', '2027-12-31', '2026-11-01', '2027-02-28',
       2, 4, 'ADMIN_DC', $1, 'active', $2) RETURNING id`,
    [{ demo_open_windows: true }, adminId]);
  const pid = p.id;
  const allBrands = BRANDS.map((b) => b[0]);

  // Channel & kelas -------------------------------------------------
  const chDefs = {
    LOCOMM: { status: 'complete', ratio: null, minActive: 6, classes: [
      ['A', 60e6, null, 45, null, 3], ['B', 30e6, 60e6, 35, null, 2.5], ['C', 15e6, 30e6, 25, null, 2], ['D', 5e6, 15e6, 20, null, 1.5]] },
    CS: { status: 'complete', ratio: 85, minActive: 9, classes: [
      ['A', 80e6, null, 30, null, 2.5], ['B', 40e6, 80e6, 25, null, 2], ['C', 10e6, 40e6, 20, null, 1.5]] },
    LMT: { status: 'draft', ratio: null, minActive: null, classes: [
      ['Platinum', 100e6, null, 20, null, 2], ['Gold', 50e6, 100e6, 15, null, 1.5], ['Silver', 20e6, 50e6, 10, null, 1]] },
  };
  const pcIds = {}; const classIds = {};
  for (const [code, def] of Object.entries(chDefs)) {
    const pc = await db.one(
      `INSERT INTO program_channel (program_id, channel_code, brand_codes, min_sellout_ratio, min_active_months, status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [pid, code, allBrands, def.ratio, def.minActive, def.status,
        code === 'LOCOMM' ? 'Rasio SO:SI belum dipakai sebagai syarat (masih dikonfirmasi user), hanya ditampilkan.' : null]);
    pcIds[code] = pc.id;
    classIds[code] = {};
    for (const [i, [name, min, max, g, gmax, reb]] of def.classes.entries()) {
      const c = await db.one(
        `INSERT INTO program_class (program_channel_id, name, baseline_min, baseline_max, min_growth, max_growth, rebate_pct, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [pc.id, name, min, max, g, gmax, reb, i]);
      classIds[code][name] = c.id;
    }
  }

  // Matriks JTBD (contoh) ---------------------------------------------
  const matrix = [
    ['Digital Presence', 'Owning Social Media Toko', [
      ['Live streaming', 'jam/minggu', 'number', { LOCOMM: { A: 4, B: 3, C: 2, D: 1 }, CS: { A: 2, B: 1 } }],
      ['Konten feed / reels', 'post/minggu', 'number', { LOCOMM: { A: 5, B: 4, C: 3, D: 2 }, CS: { A: 3, B: 2, C: 1 } }],
    ]],
    ['In-Store / In-App Experience', 'Visibility & Display', [
      ['Banner / brand store aktif', null, 'yesno', { LOCOMM: { A: 'Ya', B: 'Ya', C: 'Ya', D: 'Ya' }, CS: { A: 'Ya', B: 'Ya', C: 'Ya' } }],
      ['Listing SKU sesuai planogram', 'SKU', 'number', { LOCOMM: { A: 60, B: 45, C: 30, D: 20 }, CS: { A: 80, B: 60, C: 40 } }],
    ]],
    ['Shopper Engagement', 'CRM & Repeat Order', [
      ['Member / follower baru', 'orang/bulan', 'number', { LOCOMM: { A: 300, B: 200, C: 100, D: 50 }, CS: { A: 100, B: 60, C: 30 } }],
      ['Campaign bulanan diikuti', 'kali/periode', 'number', { LOCOMM: { A: 6, B: 5, C: 4, D: 3 } }],
    ]],
  ];
  const reward = { A: 0.3, B: 0.25, C: 0.2, D: 0.15 };
  for (const [pi, [pilName, jtName, lms]] of matrix.entries()) {
    const pil = await db.one('INSERT INTO program_pillar (program_id, name, sort) VALUES ($1,$2,$3) RETURNING id', [pid, pilName, pi]);
    const jt = await db.one('INSERT INTO program_jtbd (pillar_id, name, sort) VALUES ($1,$2,0) RETURNING id', [pil.id, jtName]);
    for (const [li, [lmName, unit, type, params]] of lms.entries()) {
      const lm = await db.one('INSERT INTO program_lead_measure (jtbd_id, name, unit, input_type, sort) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [jt.id, lmName, unit, type, li]);
      for (const [ch, byClass] of Object.entries(params)) {
        for (const [cls, target] of Object.entries(byClass)) {
          await db.q('INSERT INTO program_lm_param (lead_measure_id, program_class_id, target_value, reward_pct) VALUES ($1,$2,$3,$4)',
            [lm.id, classIds[ch][cls], String(target), reward[cls] || 0.2]);
        }
      }
    }
  }

  // Kolom input dinamis ----------------------------------------------
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
    await db.q(
      `INSERT INTO program_field (program_id, program_channel_id, stage, key, label, field_type, required, options, help, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [pid, ch ? pcIds[ch] : null, stage, key, label, type, req, opts, help, sort]);
  }

  // Periode, komponen, alur approval ------------------------------------
  await db.q(
    `INSERT INTO program_period (program_id, name, achieve_start, achieve_end, claim_start, claim_end, sort) VALUES
     ($1,'Semester 1','2027-01-01','2027-06-30','2027-07-01','2027-08-31',1),
     ($1,'Semester 2','2027-07-01','2027-12-31','2028-01-01','2028-02-28',2)`, [pid]);
  await db.q(
    `INSERT INTO program_component (program_id, name, comp_type, config, sort) VALUES
     ($1,'Rebate Growth','growth_rebate',$2,1),
     ($1,'Reward Vision Compass (JTBD)','jtbd',$3,2),
     ($1,'Bonus Over Achievement','formula',$4,3)`,
    [pid,
      { base: 'actual', rebate_source: 'class', tiers: [{ min_achievement: 90, payout_pct: 50 }, { min_achievement: 100, payout_pct: 100 }] },
      { base: 'actual', min_achievement: 90 },
      { base: 'actual', expression: 'achievement >= 110 ? (actual - target) * 0.01 : 0' }]);
  await db.q(
    `INSERT INTO program_step (program_id, phase, name, role, sort) VALUES
     ($1,'registration','Approval RSM','RSM',1),
     ($1,'disbursement','Cek Berkas & NPWP','FINANCE',1),
     ($1,'disbursement','Approval HO','ADMIN_HO',2)`, [pid]);
  return pid;
}

// Contoh peserta & pencairan supaya alur bisa langsung dicoba
async function seedParticipants(pid, users) {
  const program = await engine.loadProgram(pid);
  const s1 = program.periods[0];
  const plan = { LOCOMM: 10, CS: 5 };
  let registered = 0; let disb = 0;
  const candidates = [];
  for (const [code, count] of Object.entries(plan)) {
    const pc = program.channels.find((c) => c.channel_code === code);
    const stores = await db.q('SELECT * FROM store WHERE channel_code = $1 ORDER BY customer_id', [code]);
    const agg = await engine.salesAgg({ customerIds: stores.map((s) => s.customer_id), brandCodes: pc.brand_codes, start: program.baseline_start, end: program.baseline_end });
    const eligible = stores.map((s) => {
      const a = agg.get(s.customer_id);
      const base = engine.baselineOf(program, a);
      return { s, a, base, e: engine.eligibility(pc, base, engine.sellRatio(a), a ? a.activeMonths : 0) };
    }).filter((x) => x.a && x.e.eligible);

    for (const [i, x] of eligible.slice(0, count).entries()) {
      const growth = x.e.cls.min_growth + (i % 3 === 0 ? 5 : 0);
      const t = engine.computeTarget(x.base, growth, program.programMonths);
      const reviewing = i >= count - 2;                       // 2 terakhir masih menunggu RSM
      const step = program.steps.find((s) => s.phase === 'registration');
      const data = code === 'LOCOMM'
        ? { pic_name: `PIC ${x.s.name}`, pic_phone: '0812' + String(10000000 + i), live_account: `@${x.s.customer_id.toLowerCase()}`, marketplace: pick(['Shopee', 'TikTok Shop', 'Tokopedia']) }
        : { pic_name: `PIC ${x.s.name}`, display_area: 4 + i };
      const pa = await db.one(
        `INSERT INTO participant (program_id, program_channel_id, customer_id, class_id, class_name, baseline, sellout_ratio, growth_pct,
           target_monthly, target_period, data, status, current_step_id, registered_by, registered_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now() - interval '30 days') RETURNING *`,
        [pid, pc.id, x.s.customer_id, x.e.cls.id, x.e.cls.name, x.base, engine.sellRatio(x.a), growth, t.monthly, t.period, data,
          reviewing ? 'in_review' : 'active', reviewing ? step.id : null, users[code === 'LOCOMM' ? 'cbd.locomm' : 'cbd.cs']]);
      await db.tx(async (tx) => {
        await workflow.log(tx, 'participant', pa.id, null, 'submit', null, pa.registered_by);
        if (!reviewing) await workflow.log(tx, 'participant', pa.id, 'Approval RSM', 'approve', null, users.rsm);
      });
      registered++;
      if (code === 'LOCOMM' && !reviewing) {
        const a = (await engine.salesAgg({ customerIds: [x.s.customer_id], brandCodes: pc.brand_codes, start: s1.achieve_start, end: s1.achieve_end })).get(x.s.customer_id);
        const actual = engine.metric(program, a);
        candidates.push({ pa, x, pc, actual, ach: actual / (pa.target_monthly * 6) });
      }
    }
  }

  // Pencairan semester 1 untuk 3 peserta Locomm dengan pencapaian tertinggi:
  // 1 sudah cair, 1 menunggu Approval HO, 1 menunggu Finance
  const steps = program.steps.filter((s) => s.phase === 'disbursement');
  candidates.sort((a, b) => b.ach - a.ach);
  for (const [i, { pa, x, actual }] of candidates.slice(0, 3).entries()) {
    const lmValues = {};
    for (const lm of program.leadMeasures) {
      const prm = lm.params[x.e.cls.id];
      if (!prm) continue;
      // peserta ke-2 sengaja tidak mencapai sebagian lead measure
      lmValues[lm.id] = lm.input_type === 'yesno' ? 'Ya' : String(Number(prm.target_value) - (lm.sort === 1 && i === 1 ? 1 : 0));
    }
    const calc = engine.computeDisbursement({ program, participant: pa, period: s1, actual, lmValues, data: {}, hasNpwp: !!x.s.npwp_no });
    const state = i === 0 ? ['paid', null] : i === 1 ? ['in_review', steps[1].id] : ['in_review', steps[0].id];
    const d = await db.one(
      `INSERT INTO disbursement (participant_id, period_id, target, actual, achievement_pct, lm_values, data, payee, breakdown,
         gross_amount, tax_rate, tax_amount, net_amount, status, current_step_id, submitted_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [pa.id, s1.id, calc.target, calc.actual, calc.achievement, lmValues, { bukti_link: 'https://drive.example/bukti' },
        { npwp_no: x.s.npwp_no || '', npwp_name: x.s.npwp_name || '', bank_name: x.s.bank_name, bank_account_no: x.s.bank_account_no, bank_account_name: x.s.bank_account_name },
        JSON.stringify(calc.lines), calc.gross, calc.taxRate, calc.tax, calc.net, state[0], state[1], users['admin.dc']]);
    await db.tx(async (tx) => {
      await workflow.log(tx, 'disbursement', d.id, null, 'submit', null, users['admin.dc']);
      if (i <= 1) await workflow.log(tx, 'disbursement', d.id, steps[0].name, 'approve', 'Berkas lengkap', users.finance);
      if (i === 0) await workflow.log(tx, 'disbursement', d.id, steps[1].name, 'approve', null, users['admin.ho']);
    });
    disb++;
  }
  return { registered, disb };
}

(async () => {
  const already = await db.one('SELECT COUNT(*) AS n FROM app_user').catch(() => null);
  if (already && already.n > 0) {
    console.log('Database sudah berisi data. Jalankan "npm run db:reset" untuk mengulang dari awal.');
    return db.pool.end();
  }
  await seedMaster();
  const nStores = await seedStoresAndSales();
  const userRows = await db.q('SELECT id, email FROM app_user');
  const users = Object.fromEntries(userRows.map((u) => [u.email.split('@')[0], u.id]));
  const pid = await seedProgram(users['admin.ho']);
  const r = await seedParticipants(pid, users);
  console.log(`Seed selesai: ${nStores} toko, program VC27 (id ${pid}), ${r.registered} peserta, ${r.disb} pencairan.`);
  console.log(`Akun demo (password: ${PASSWORD}):`);
  for (const [name, email, role] of USERS) console.log(`  ${role.padEnd(9)} ${email.padEnd(26)} ${name}`);
  await db.pool.end();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
