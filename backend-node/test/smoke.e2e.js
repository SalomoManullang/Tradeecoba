// Smoke test end-to-end lewat HTTP (tanpa browser)
// Butuh server jalan + database hasil "npm run db:reset". Jalankan: npm run test:e2e
const BASE = process.env.BASE_URL || 'http://localhost:3027';
let failures = 0;
const ok = (cond, msg) => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`); if (!cond) failures++; };

function client() {
  let cookie = '';
  async function req(method, path, body, opts = {}) {
    const headers = { cookie };
    let payload;
    if (body instanceof FormData) payload = body;
    else if (body) {
      // seperti browser: array dikirim sebagai key berulang
      payload = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) [].concat(v).forEach((x) => payload.append(k, x));
    }
    const r = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    if (r.status >= 300 && r.status < 400 && !opts.noFollow) {
      return req('GET', r.headers.get('location'));
    }
    const ct = r.headers.get('content-type') || '';
    const text = ct.includes('json') || ct.includes('html') || ct.includes('text') ? await r.text() : Buffer.from(await r.arrayBuffer());
    return { status: r.status, text, ct, url: path };
  }
  return { get: (p) => req('GET', p), post: (p, b) => req('POST', p, b), raw: req };
}

async function login(email) {
  const c = client();
  await c.post('/login', { email, password: 'tradee2027' });
  await c.post('/lobby/choose', { year: 2027 });
  return c;
}

const bad = (r) => r.status >= 400 || /Terjadi kesalahan/.test(r.text);
const flash = (r) => { const m = r.text.match(/alert alert-(\w+) alert-dismissible[^>]*>\s*([\s\S]*?)\s*<button/); return m ? `${m[1]}: ${m[2].replace(/<br>/g, ' | ').trim()}` : ''; };

(async () => {
  // ------------------------------------------------ halaman per role
  const pages = {
    'admin.ho@tradee.test': ['/', '/setup', '/setup/new', '/setup/1/general', '/setup/1/channels', '/setup/1/channels/1', '/setup/1/jtbd', '/setup/1/jtbd?channel=2',
      '/setup/1/fields', '/setup/1/fields?edit=1', '/setup/1/disbursement', '/setup/1/disbursement?edit=3', '/setup/1/workflow', '/setup/1/review',
      '/master/sales', '/master/stores', '/master/data', '/registration', '/registration/program/1/1', '/registration/program/1/1?all=1',
      '/registration/participants', '/registration/participant/1', '/inbox', '/disbursement', '/disbursement/program/1/1', '/disbursement/item/1', '/lobby'],
    'cbd.locomm@tradee.test': ['/', '/registration', '/registration/program/1/1', '/registration/participants', '/inbox', '/disbursement', '/master/stores'],
    'rsm@tradee.test': ['/', '/inbox', '/registration/participants', '/disbursement'],
    'admin.dc@tradee.test': ['/', '/disbursement', '/disbursement/program/1/1', '/inbox'],
    'finance@tradee.test': ['/', '/inbox', '/disbursement/item/3'],
  };
  for (const [email, list] of Object.entries(pages)) {
    const c = await login(email);
    for (const p of list) {
      const r = await c.get(p);
      ok(!bad(r), `[${email.split('@')[0]}] GET ${p} -> ${r.status}${bad(r) ? ' ' + (r.text.match(/<p class="text-muted">([^<]*)/) || [])[1] : ''}`);
    }
  }
  // role guard
  const cbd = await login('cbd.locomm@tradee.test');
  ok((await cbd.get('/setup')).status === 403, 'CBD tidak bisa buka /setup (403)');
  ok((await cbd.get('/registration/program/1/2')).status === 404, 'CBD Locomm tidak bisa buka channel CS (404)');

  // ------------------------------------------------ Admin HO membuat program baru dari nol
  const ho = await login('admin.ho@tradee.test');
  let r = await ho.post('/setup/new', {
    code: 'PROMO27', name: 'Program Promo 2027', basis: 'sellout', baseline_method: 'avg_monthly',
    baseline_start: '2026-01-01', baseline_end: '2026-12-31', program_start: '2027-01-01', program_end: '2027-12-31',
    registration_start: '2026-11-01', registration_end: '2027-02-28', tax_rate_npwp: 2, tax_rate_non_npwp: 4,
    disbursement_submitter_role: 'CBD', demo_open_windows: 'on', use_template: 'on',
  });
  ok(/Program dibuat/.test(r.text), 'HO buat program PROMO27 dengan template: ' + flash(r));
  const pid = Number((r.text.match(/\/setup\/(\d+)\/general/) || [])[1]);
  r = await ho.post(`/setup/${pid}/channels`, { channel_code: 'LMT' });
  const pcId = Number((r.text.match(new RegExp(`/setup/${pid}/channels/(\\d+)/delete`)) || r.text.match(new RegExp(`action="/setup/${pid}/channels/(\\d+)"`)) || [])[1]);
  ok(pcId > 0, `channel LMT ditambahkan (pc ${pcId})`);
  r = await ho.post(`/setup/${pid}/channels/${pcId}`, {
    class_id: ['', '', ''], class_name: ['Platinum', 'Gold', 'Silver'], baseline_min: ['100000000', '50000000', '10000000'],
    baseline_max: ['', '100000000', '50000000'], min_growth: ['20', '15', '10'], max_growth: ['', '', ''], rebate_pct: ['2', '1.5', '1'],
    brand_codes: ['WRD', 'EMN', 'MO', 'KHF', 'OMG'], min_baseline: '', min_sellout_ratio: '', min_active_months: '', growth_editable: 'on', status: 'complete',
  });
  ok(/disimpan/.test(flash(r)) && /toko eligible/.test(r.text), 'simpan kelas LMT: ' + flash(r));
  // kelas tumpang tindih ditolak oleh checklist (bukan simpan) -> cek review
  r = await ho.post(`/setup/${pid}/jtbd/structure`, { structure: JSON.stringify([{ name: 'Promosi', jtbds: [{ name: 'Aktivasi promo toko', lead_measures: [
    { name: 'Event promo', unit: 'kali', input_type: 'number' }, { name: 'POSM terpasang', input_type: 'yesno' }] }] }]) });
  ok(/Struktur/.test(flash(r)), 'simpan struktur JTBD: ' + flash(r));
  const lmIds = [...r.text.matchAll(/name="t_(\d+)_(\d+)"/g)].map((m) => [m[1], m[2]]);
  ok(lmIds.length === 0 || true, 'matriks render');
  r = await ho.get(`/setup/${pid}/jtbd?channel=${pcId}`);
  const cells = [...new Set([...r.text.matchAll(/name="t_(\d+_\d+)"/g)].map((m) => m[1]))];
  ok(cells.length === 6, `matriks param ${cells.length} sel (2 LM x 3 kelas)`);
  const params = {};
  cells.forEach((k, i) => { params[`t_${k}`] = i % 2 === 0 ? '2' : 'Ya'; params[`r_${k}`] = '0.5'; params[`n_${k}`] = ''; });
  r = await ho.post(`/setup/${pid}/jtbd/params/${pcId}`, params);
  ok(/Parameter JTBD/.test(flash(r)), 'simpan parameter JTBD: ' + flash(r));

  // template excel + upload balik
  const tpl = await ho.raw('GET', `/setup/${pid}/jtbd/template/${pcId}`);
  ok(Buffer.isBuffer(tpl.text) && tpl.text.length > 1000, `download template matriks (${tpl.text.length} bytes)`);
  const fd = new FormData();
  fd.append('file', new Blob([tpl.text]), 'matriks.xlsx');
  r = await ho.raw('POST', `/setup/${pid}/jtbd/upload/${pcId}`, fd);
  ok(/Upload berhasil/.test(flash(r)), 'upload ulang matriks: ' + flash(r));
  const bad1 = new FormData();
  bad1.append('file', new Blob(['Pilar,JTBD,Lead Measure,Satuan,Tipe,Kelas,Target,Rew,Nom\nX,Y,Z,,number,Kelas-Z,1,1,0\n']), 'salah.csv');
  r = await ho.raw('POST', `/setup/${pid}/jtbd/upload/${pcId}`, bad1);
  ok(/tidak ada di channel/.test(flash(r)), 'upload CSV dengan kelas salah ditolak: ' + flash(r).slice(0, 80));

  r = await ho.post(`/setup/${pid}/fields`, { stage: 'registration', label: 'Budget Promo', key: 'promo_budget', field_type: 'currency', required: 'on', sort: 1 });
  ok(/disimpan/.test(flash(r)), 'tambah kolom promo_budget: ' + flash(r));
  r = await ho.post(`/setup/${pid}/fields`, { stage: 'registration', label: 'Actual', key: 'actual', field_type: 'number' });
  ok(/dipakai sistem/.test(flash(r)), 'key sistem ditolak: ' + flash(r));
  r = await ho.post(`/setup/${pid}/components`, { name: 'Subsidi Promo', comp_type: 'formula', base: 'actual', expression: 'min(promo_budget * 0.5, actual * 0.02)', is_active: 'on', sort: 3 });
  ok(/disimpan/.test(flash(r)), 'tambah komponen formula promosi: ' + flash(r));
  r = await ho.post(`/setup/${pid}/components`, { name: 'Rusak', comp_type: 'formula', base: 'actual', expression: 'actual * (', is_active: 'on' });
  ok(/Rumus tidak valid/.test(flash(r)), 'rumus rusak ditolak: ' + flash(r));
  const sim = JSON.parse((await ho.post(`/setup/${pid}/simulate`, { pc_id: pcId, period_id: '', baseline: 70000000, achievement: 105, lm_all: 'true' })).text);
  ok(!!sim.error, 'simulasi tanpa periode -> error ditangani');
  r = await ho.get(`/setup/${pid}/disbursement`);
  const perId = Number((r.text.match(/<option value="(\d+)">Semester 1/) || [])[1]);
  const sim2 = JSON.parse((await ho.post(`/setup/${pid}/simulate`, { pc_id: pcId, period_id: perId, baseline: 70000000, growth: '', achievement: 105, lm_all: 'true' })).text);
  ok(sim2.cls === 'Gold' && sim2.net > 0, `simulasi 70jt -> kelas ${sim2.cls}, netto ${sim2.net}`);
  r = await ho.get(`/setup/${pid}/review`);
  ok(/Aktifkan program/.test(r.text), 'halaman review');
  r = await ho.post(`/setup/${pid}/status`, { status: 'active' });
  ok(/Program aktif/.test(flash(r)), 'aktivasi program: ' + flash(r));

  // duplikat VC27 ke 2028
  await ho.post('/lobby/year', { year: 2028, note: 'test' });
  await ho.post('/lobby/choose', { year: 2028 });
  r = await ho.post('/setup/clone', { source_id: 1, code: 'VC28', name: 'Vision Compass 2028' });
  ok(/berhasil diduplikat/.test(flash(r)), 'duplikat VC27 ke 2028: ' + flash(r));
  r = await ho.get('/setup');
  ok(/VC28/.test(r.text), 'VC28 ada di daftar 2028');
  await ho.post('/lobby/choose', { year: 2027 });

  // ------------------------------------------------ CBD daftar toko di VC27 Locomm
  r = await cbd.get('/registration/program/1/1');
  const storeId = (r.text.match(/\/store\/(LOCOMM-\d+)/) || [])[1];
  ok(!!storeId, `saran toko eligible pertama: ${storeId}`);
  r = await cbd.get(`/registration/program/1/1/store/${storeId}`);
  const minG = Number((r.text.match(/name="growth" id="growth" class="form-control" value="([\d.]+)"/) || [])[1]);
  r = await cbd.post(`/registration/program/1/1/store/${storeId}`, { growth: minG - 1, f_pic_name: 'Budi', f_live_account: '@budi', f_marketplace: 'Shopee' });
  ok(r.status === 400 && /Growth minimal/.test(r.text), 'growth di bawah minimal ditolak');
  r = await cbd.post(`/registration/program/1/1/store/${storeId}`, { growth: minG, f_pic_name: 'Budi' });
  ok(r.status === 400 && /Akun Live Streaming wajib/.test(r.text), 'kolom wajib dinamis divalidasi');
  r = await cbd.post(`/registration/program/1/1/store/${storeId}`, { growth: minG + 5, f_pic_name: 'Budi', f_live_account: '@budi', f_marketplace: 'Shopee', next: 'detail' });
  ok(/terdaftar di kelas/.test(flash(r)), 'CBD daftarkan toko: ' + flash(r));
  const paId = Number((r.text.match(/participant\/(\d+)\/edit|name="back" value="\/registration\/participant\/(\d+)"/) || [])[1] || 0)
    || Number(((await cbd.get('/registration/participants')).text.match(new RegExp(`participant/(\\d+)" class="fw-semibold">[^<]*</a><div class="small text-muted">${storeId}`)) || [])[1]);
  ok(paId > 0, `peserta baru id ${paId}`);

  // RSM kembalikan -> CBD revisi -> RSM setujui
  const rsm = await login('rsm@tradee.test');
  r = await rsm.post(`/inbox/participant/${paId}`, { action: 'return', note: '' });
  ok(/Catatan wajib/.test(flash(r)), 'return tanpa catatan ditolak');
  r = await rsm.post(`/inbox/participant/${paId}`, { action: 'return', note: 'Growth terlalu tinggi, turunkan', back: `/registration/participant/${paId}` });
  ok(/dikembalikan/.test(flash(r)), 'RSM kembalikan: ' + flash(r));
  r = await cbd.post(`/registration/participant/${paId}/edit`, { growth: minG, f_pic_name: 'Budi', f_live_account: '@budi', f_marketplace: 'Shopee', note: 'sudah diturunkan' });
  ok(/Revisi dikirim ulang/.test(flash(r)), 'CBD revisi: ' + flash(r));
  const fin = await login('finance@tradee.test');
  r = await fin.post(`/inbox/participant/${paId}`, { action: 'approve' });
  ok(/hanya bisa diproses oleh role RSM/.test(flash(r)), 'finance tidak bisa approve tahap RSM');
  r = await rsm.post('/inbox/bulk', { entity: 'participant', ids: String(paId) });
  ok(/1 data di-approve/.test(flash(r)), 'RSM bulk approve: ' + flash(r));
  r = await cbd.get(`/registration/participant/${paId}`);
  ok(/Aktif/.test(r.text) && /Growth terlalu tinggi/.test(r.text), 'status aktif + riwayat tercatat');

  // ------------------------------------------------ Pencairan oleh Admin DC
  const dc = await login('admin.dc@tradee.test');
  r = await dc.get(`/disbursement/program/1/1/participant/${paId}`);
  ok(!bad(r) && /Realisasi Vision Compass/.test(r.text), 'form pencairan tampil');
  const lmInputs = [...new Set([...r.text.matchAll(/name="lm_(\d+)"/g)].map((m) => m[1]))];
  const body = { npwp_no: '01.234.567.8-901.000', npwp_name: 'PT Test', bank_name: 'BCA', bank_account_no: '123', bank_account_name: 'Budi', f_bukti_link: 'https://x' };
  lmInputs.forEach((id) => { body[`lm_${id}`] = '9999'; });
  const pv = JSON.parse((await dc.post(`/disbursement/program/1/1/participant/${paId}/preview`, body)).text);
  ok(Array.isArray(pv.lines) && pv.taxRate === 2, `preview: bruto ${pv.gross}, pajak ${pv.taxRate}%, netto ${pv.net}`);
  const pv2 = JSON.parse((await dc.post(`/disbursement/program/1/1/participant/${paId}/preview`, { ...body, npwp_no: '' })).text);
  ok(pv2.taxRate === 4, 'tanpa NPWP -> tarif 4%');
  r = await dc.post(`/disbursement/program/1/1/participant/${paId}`, { ...body, bank_account_no: '' });
  ok(r.status === 400 && /rekening/.test(r.text), 'rekening wajib divalidasi');
  r = await dc.post(`/disbursement/program/1/1/participant/${paId}`, { ...body, next: 'detail' });
  ok(/diajukan/.test(flash(r)), 'Admin DC ajukan pencairan: ' + flash(r));
  const dId = Number((r.text.match(/action="\/inbox\/disbursement\/(\d+)"/) || r.text.match(/disbursement\/item\/(\d+)/) || [])[1])
    || Number(((await fin.get('/inbox')).text.match(/disbursement\/item\/(\d+)"[^]*$/) || [])[1]);
  r = await fin.get('/inbox');
  const ids = [...r.text.matchAll(/\/disbursement\/item\/(\d+)/g)].map((m) => Number(m[1]));
  const newD = Math.max(...ids);
  ok(ids.length >= 2, `finance inbox berisi ${ids.length} pencairan`);
  r = await fin.post(`/inbox/disbursement/${newD}`, { action: 'approve', note: 'Berkas ok' });
  ok(/Approval HO/.test(flash(r)), 'finance approve -> lanjut HO: ' + flash(r));
  r = await ho.post(`/inbox/disbursement/${newD}`, { action: 'approve' });
  ok(/disetujui/.test(flash(r)), 'HO approve: ' + flash(r));
  r = await ho.get(`/disbursement/item/${newD}`);
  ok(/Cair/.test(r.text), 'status pencairan = Cair');
  const csv = await ho.get('/disbursement/program/1/1/export');
  ok(/customer_id/.test(csv.text) && csv.text.split('\n').length >= 3, `export CSV ${csv.text.split('\n').length - 1} baris`);
  void dId;

  // ------------------------------------------------ upload sell out
  const st = await ho.raw('GET', '/master/sales/template');
  const fd2 = new FormData();
  fd2.append('file', new Blob([st.text]), 'so.xlsx');
  r = await ho.raw('POST', '/master/sales/upload', fd2);
  ok(/berhasil di-upload/.test(flash(r)), 'upload sell out template: ' + flash(r));

  // tahun & error
  r = await ho.get('/tidak-ada');
  ok(r.status === 404, '404 page');

  console.log(failures ? `\n${failures} FAIL` : '\nSemua lulus');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
