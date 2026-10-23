// Ekstraksi hook DOM + screenshot + skenario inti Program Setup.
// Pemakaian: node capture.mjs --label before|after [--widths 1440,1280] [--only <potongan route>] [--no-shots] [--no-scenarios]
// Output (di reference/docs/reskin/):
//   baseline.json / after.json          id, name, data-*, href, required/readonly/disabled, teks label & tombol per route
//   scenarios-before.json / -after.json hasil skenario inti (hash tujuan, flash, error, angka simulasi, validasi)
//   state-before.json / -after.json     isi localStorage tradee2027-fe-v2 setelah skenario
//   screens/<label>/<lebar>/<route>.png
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const RESKIN = path.resolve(HERE, '..');
const _argv = process.argv.slice(2);
const _root = _argv.indexOf('--root');
// --root <folder>: jalankan terhadap salinan kode lain (mis. git worktree di HEAD untuk baseline modul)
const ROOT = _root >= 0 ? path.resolve(_argv[_root + 1]) : path.resolve(HERE, '../../../..');
const INDEX = pathToFileURL(path.join(ROOT, 'index.html')).href;
const STORE_KEY = 'tradee2027-fe-v2';
// Waktu dibekukan supaya created_at / published_at / audit log sama di setiap run
const FIXED_TIME = new Date('2026-10-22T09:00:00+07:00');

const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const LABEL = arg('--label', 'before');
const WIDTHS = arg('--widths', '1440,1280').split(',').map(Number);
const ONLY = arg('--only', null);
const SHOTS = !args.includes('--no-shots');
const SCENARIOS = !args.includes('--no-scenarios');
const MODULES = args.includes('--modules');
const EXTRACT_FILE = path.join(RESKIN, MODULES ? `modules-${LABEL}.json` : LABEL === 'before' ? 'baseline.json' : `${LABEL}.json`);

// ---------------------------------------------------------------- browser
export async function freshPage(browser, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  await page.clock.setFixedTime(FIXED_TIME);
  page.consoleErrors = [];
  // baris pertama saja: stack berisi path file yang berbeda antar salinan kode
  page.on('console', (m) => { if (m.type() === 'error') page.consoleErrors.push(m.text().split('\n')[0]); });
  page.on('pageerror', (e) => page.consoleErrors.push(String(e && e.message || e)));
  page.dialogs = [];
  page.on('dialog', (d) => { page.dialogs.push(d.message()); d.accept(); });
  await page.goto(INDEX);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${INDEX}#/login`);
  await page.reload();
  await page.click('[data-click="loginAs"]:has-text("Admin HO")');
  await page.waitForSelector('[data-click="chooseYear"][data-year="2027"]');
  await page.click('[data-click="chooseYear"][data-year="2027"]');
  await page.waitForFunction(() => location.hash === '#/');
  return page;
}

// Pindah route lewat hash, tunggu render (termasuk redirect) selesai
// audit (default): js/pages/setup-view.js diminta membuka semua form (mode edit) & bagian, supaya hook dan skenario sebanding dengan baseline.
// Screenshot memakai audit:false (tampilan default: mode lihat, ringkasan terlipat).
export async function go(page, route, { audit = true } = {}) {
  const hash = `#${route}`;
  await page.evaluate((h) => new Promise((res) => {
    if (location.hash === h) { UI.render(); res(); return; }
    window.addEventListener('hashchange', () => setTimeout(res, 0), { once: true });
    location.hash = h;
  }), hash);
  await settle(page);
  if (audit) await page.evaluate(() => { if (window.CPSView) window.CPSView.audit(); });
}
export async function settle(page) {
  let last = '';
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(60);
    const h = await page.evaluate(() => location.hash);
    if (h === last) break;
    last = h;
  }
}
export const setYear = (page, year) => page.evaluate((y) => UI.session.set({ year: y }), year);

export async function programInfo(page, pid) {
  return page.evaluate((id) => {
    const p = Engine.loadProgram(id);
    return p && { id: p.id, year: p.year, status: p.status, channels: p.channels.map((c) => ({ id: c.id, code: c.channel_code, brands: c.brands.map((b) => b.id) })) };
  }, pid);
}

export function routesFor(info) {
  const b = `/setup/${info.id}`;
  const out = [`${b}/header`, `${b}/channels`, `${b}/simulate`, `${b}/validate`, `${b}/validate?focus=close`, `${b}/audit`];
  for (const c of info.channels) {
    const cb = `${b}/ch/${c.id}`;
    out.push(`${cb}/eligibility`, `${cb}/brands`, ...c.brands.map((x) => `${cb}/brands/${x}`), `${cb}/pillars`, ...c.brands.map((x) => `${cb}/pillars/${x}`),
      `${cb}/formulas`, `${cb}/phases/REGISTRATION`, `${cb}/phases/MONITORING`, `${cb}/phases/PAYOUT`, `${cb}/documents/MOU`, `${cb}/documents/SKN`);
  }
  return out;
}

// ---------------------------------------------------------------- ekstraksi (dijalankan di halaman)
function extractInPage(sel = '#kt_content') {
  const root = document.querySelector(sel) || document.getElementById('app');
  const ATTRS = ['id', 'name', 'type', 'value', 'href', 'for', 'required', 'readonly', 'disabled', 'placeholder', 'checked', 'selected', 'multiple',
    'min', 'max', 'step', 'rowspan', 'colspan', 'list', 'title', 'rows', 'onclick', 'role', 'aria-label', 'data-dismiss', 'data-toggle'];
  const TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'OPTION', 'LABEL', 'FORM', 'FIELDSET', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD',
    'COLGROUP', 'COL', 'DATALIST', 'TEMPLATE', 'UL', 'OL', 'LI', 'CODE']);
  const TEXT_TAGS = new Set(['A', 'BUTTON', 'LABEL', 'OPTION', 'TH', 'TD', 'LI', 'CODE']);
  const PATH_TAGS = new Set(['FORM', 'FIELDSET', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'UL', 'OL', 'LI', 'LABEL', 'SELECT', 'A', 'BUTTON', 'TEMPLATE', 'DATALIST', 'COLGROUP']);
  const hasData = (el) => [...el.attributes].some((a) => a.name.startsWith('data-'));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const sig = (el) => {
    let s = el.tagName.toLowerCase();
    if (el.id) s += `#${el.id}`;
    for (const a of el.attributes) if (a.name.startsWith('data-') || a.name === 'name') s += `[${a.name}=${a.value}]`;
    return s;
  };
  const elements = [];
  function visit(scope, inTemplate) {
    for (const el of scope.querySelectorAll('*')) {
      if (el.closest('[data-cps-ui]')) continue; // elemen buatan setup-view.js (bar mode, ringkasan, toggle)
      if (!(TAGS.has(el.tagName) || el.id || el.hasAttribute('name') || hasData(el))) continue;
      const attrs = {};
      for (const a of el.attributes) if (ATTRS.includes(a.name) || a.name.startsWith('data-')) attrs[a.name] = a.value;
      const props = {};
      if ('disabled' in el && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'FIELDSET', 'OPTION'].includes(el.tagName)) {
        props.disabled = inTemplate ? el.hasAttribute('disabled') : el.matches(':disabled');
      }
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') { props.value = el.value; props.readOnly = el.readOnly; props.required = el.required; }
      if (el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type)) props.checked = el.checked;
      if (el.tagName === 'SELECT') { props.value = el.value; props.required = el.required; props.options = [...el.options].map((o) => `${o.value}|${norm(o.textContent)}`); }
      const p = [];
      for (let a = el.parentElement; a && a !== root; a = a.parentElement) if (PATH_TAGS.has(a.tagName) || a.id || hasData(a)) p.unshift(sig(a));
      elements.push({ sig: sig(el), tag: el.tagName.toLowerCase(), attrs, props, cls: [...el.classList].sort(), path: (inTemplate ? 'template > ' : '') + p.join(' > '),
        text: TEXT_TAGS.has(el.tagName) ? norm(el.textContent) : undefined });
      if (el.tagName === 'TEMPLATE') visit(el.content, true);
    }
  }
  visit(root, false);
  // Semua teks (urutan dokumen), tidak terpengaruh CSS / wrapper
  const texts = [];
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) { if (n.parentElement && n.parentElement.closest('[data-cps-ui]')) continue; const t = norm(n.nodeValue); if (t) texts.push(t); }
  // Struktur wrapper: di halaman Setup, .kt-container hanya berisi flash alert + satu .cps
  const kc = document.querySelector('#kt_content > .kt-container');
  const wrap = kc && kc.querySelector(':scope > .cps') ? [...kc.children].filter((c) => !(c.classList.contains('cps') || c.classList.contains('alert'))).length : null;
  // Kartu kerja channel: tepat satu .cps-work, anak terakhir .cps (semua isi route ada di dalamnya)
  const works = document.querySelectorAll('.cps-work');
  const workOk = works.length ? works.length === 1 && works[0].parentElement.classList.contains('cps') && works[0] === works[0].parentElement.lastElementChild : null;
  return { hash: location.hash, title: document.title, elements, texts, strayOutsideCps: wrap, workOk,
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth };
}

const slug = (route) => route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '_').replace(/_+$/, '') || 'root';

async function captureRoutes(browser) {
  const page = await freshPage(browser, 1440);
  const shotPages = SHOTS ? await Promise.all(WIDTHS.map((w) => freshPage(browser, w))) : [];
  const result = { label: LABEL, fixedTime: FIXED_TIME.toISOString(), routes: {} };

  // Program DRAFT dibuat lewat UI clone yang sama di semua tab, supaya tampilan editable ikut terekam
  async function makeDraft(pg, audit = true) {
    await go(pg, '/setup?clone=2', { audit });
    await pg.fill('form[data-action="setup.clone"] [name="code"]', 'RESKIN-DRAFT');
    await pg.fill('form[data-action="setup.clone"] [name="name"]', 'Reskin Draft');
    await pg.click('form[data-action="setup.clone"] button:not([type="button"])');
    await settle(pg);
    return Number((await pg.evaluate(() => location.hash)).match(/setup\/(\d+)/)[1]);
  }

  const plan = [];
  plan.push({ year: 2027, routes: ['/setup', '/setup/new', '/setup?clone=2'] });
  plan.push({ year: 2026, routes: ['/setup'] });
  for (const pid of [1, 2]) {
    const info = await programInfo(page, pid);
    plan.push({ year: info.year, routes: routesFor(info) });
  }
  // Token COMPASS harus ter-resolve (mis. komentar CSS yang tertutup terlalu awal membuang blok :root)
  if (LABEL !== 'before') {
    const tok = await page.evaluate(() => ['--color-text-primary', '--neutral-100', '--color-border-default', '--shadow-md', '--radius-lg', '--color-interactive', '--color-icon-secondary']
      .filter((k) => !getComputedStyle(document.documentElement).getPropertyValue(k).trim()));
    if (tok.length) throw new Error(`Token COMPASS tidak ter-resolve: ${tok.join(', ')}`);
  }
  const draftId = await makeDraft(page);
  for (const sp of shotPages) await makeDraft(sp, false);
  const draft = await programInfo(page, draftId);
  plan.push({ year: draft.year, routes: ['/setup', ...routesFor(draft)], key: 'draft' });

  const seen = new Set();
  for (const step of plan) {
    for (const pg of [page, ...shotPages]) await setYear(pg, step.year);
    for (const route of step.routes) {
      const key = `${step.year}:${route}${step.key && route === '/setup' ? ':after-clone' : ''}`;
      if (seen.has(key) || (ONLY && !route.includes(ONLY))) continue;
      seen.add(key);
      page.consoleErrors.length = 0;
      await go(page, route);
      const data = await page.evaluate(extractInPage);
      data.consoleErrors = page.consoleErrors.slice();
      result.routes[key] = data;
      for (let i = 0; i < shotPages.length; i++) {
        const sp = shotPages[i];
        await go(sp, route, { audit: false });
        const dir = path.join(RESKIN, 'screens', LABEL, String(WIDTHS[i]));
        fs.mkdirSync(dir, { recursive: true });
        // fullPage membuat aside Metronic (fixed) melebar menutupi konten; viewport disetel setinggi konten sebagai gantinya
        const fullH = await sp.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
        await sp.setViewportSize({ width: WIDTHS[i], height: Math.min(Math.max(fullH, 900), 8000) });
        await sp.waitForTimeout(80);
        await sp.screenshot({ path: path.join(dir, `${step.year}_${slug(route)}${key.endsWith(':after-clone') ? '_after-clone' : ''}.png`) });
        await sp.setViewportSize({ width: WIDTHS[i], height: 900 });
        data[`overflowX_${WIDTHS[i]}`] = await sp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      }
      process.stdout.write(`  ${key} (${data.elements.length} elemen)\n`);
    }
  }
  await page.context().close();
  for (const sp of shotPages) await sp.context().close();
  return result;
}

// ---------------------------------------------------------------- modul lain + kerangka (Opsi B)
// Konten modul lain harus identik; hook kerangka (aside, header, topbar, footer) dicatat terpisah per role.
const FRAME = ['#kt_header_mobile', '#kt_aside', '#kt_header', '#kt_footer'];
async function captureModules(browser) {
  const page = await freshPage(browser, 1440);
  const shotPages = SHOTS ? await Promise.all(WIDTHS.map((w) => freshPage(browser, w))) : [];
  const result = { label: LABEL, fixedTime: FIXED_TIME.toISOString(), routes: {} };
  const asRole = (pg, role) => pg.evaluate((r) => { UI.session.set({ userId: DB.t('users').find((u) => u.role === r).id, year: 2027 }); }, role);
  const pc = await page.evaluate(() => DB.t('programChannels').find((c) => c.program_id === 2).id);
  const reg = await page.evaluate(() => DB.t('registrations')[0].id);
  // id dinamis untuk halaman form & detail (seed deterministik)
  const ids = await page.evaluate(() => {
    const p = Engine.loadProgram(2); const ch = p.channels.find((c) => c.channel_code === 'LOCOMM');
    const free = DB.t('stores').filter((s) => s.channel_code === 'LOCOMM' && !DB.t('registrations').some((r) => r.program_channel_id === ch.id && r.customer_id === s.customer_id));
    const elig = free.find((s) => Engine.eligibility(p, ch, s.customer_id).eligible);
    return { pc: ch.id, cid: elig && elig.customer_id };
  });
  const plan = {
    ADMIN_HO: ['/', '/inbox', '/registration/participants', `/registration/participant/${reg}`, '/payout', '/payout/program/2', '/master/stores', '/master/sales', '/master/data', '/switch', '/lobby', '/setup',
      '/monitoring', '/monitoring/item/1', '/payout/item/1', '/registration/participants?status=in_review'],
    CBD: ['/', '/registration', `/registration/program/2/${pc}`, '/registration/participants', '/monitoring', '/inbox',
      `/registration/program/2/${ids.pc}?all=1`, `/registration/program/2/${ids.pc}/store/${ids.cid}`, '/registration/participant/1', '/registration/participant/9',
      '/monitoring/form/1/Q3-2027', '/monitoring/item/1', '/monitoring/item/10', '/payout', '/payout/program/2', '/payout/program/2?ch=2&c=FIX&per=S1-2027', '/payout/item/1', '/payout/item/4', '/master/stores'],
    ADMIN_DC: ['/', '/inbox', '/registration/participant/9', '/monitoring/item/10', '/payout/program/2', '/payout/form/4/CONDITIONAL/Q1-2027', '/payout/item/2'],
    ABL: ['/inbox', '/registration/participant/7'],
    FINANCE: ['/', '/inbox', '/payout', '/payout/item/2'],
  };
  for (const [role, routes] of Object.entries(plan)) {
    for (const pg of [page, ...shotPages]) await asRole(pg, role);
    for (const route of routes) {
      const key = `${role}:${route}`;
      page.consoleErrors.length = 0;
      await go(page, route);
      const data = await page.evaluate(extractInPage, '#kt_content');
      data.frame = {};
      for (const f of FRAME) data.frame[f] = await page.evaluate((sel) => (document.querySelector(sel) ? null : 'tidak ada'), f) || (await page.evaluate(extractInPage, f)).elements;
      data.consoleErrors = page.consoleErrors.slice();
      result.routes[key] = data;
      for (let i = 0; i < shotPages.length; i++) {
        const sp = shotPages[i];
        await go(sp, route);
        const dir = path.join(RESKIN, 'screens', LABEL, 'modules', String(WIDTHS[i]));
        fs.mkdirSync(dir, { recursive: true });
        const fullH = await sp.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
        await sp.setViewportSize({ width: WIDTHS[i], height: Math.min(Math.max(fullH, 900), 8000) });
        await sp.waitForTimeout(80);
        await sp.screenshot({ path: path.join(dir, `${role}_${slug(route)}.png`) });
        await sp.setViewportSize({ width: WIDTHS[i], height: 900 });
        data[`overflowX_${WIDTHS[i]}`] = await sp.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      }
      process.stdout.write(`  ${key} (${data.elements.length} elemen)\n`);
    }
  }
  await page.context().close();
  for (const sp of shotPages) await sp.context().close();
  return result;
}

// ---------------------------------------------------------------- skenario CDT & approver (modul lain)
async function runCdtScenarios(browser) {
  const page = await freshPage(browser, 1440);
  const S = {};
  const log = (k, v) => { S[k] = v; process.stdout.write(`  skenario-cdt ${k}\n`); };
  const asRole = async (role, name) => { await page.evaluate(([r, n]) => { const u = DB.t('users').find((x) => x.role === r && (!n || x.name === n)); UI.session.set({ userId: u.id, year: 2027 }); }, [role, name]); };
  const txt = (sel) => page.$$eval(sel, (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  await asRole('CBD', 'CBD Locomm');

  // C1 · pilih program & channel → saran toko
  await go(page, '/registration');
  log('C1_registration', { links: await page.$$eval('#kt_content a[href^="#/registration/program/"]', (as) => as.map((a) => a.getAttribute('href'))) });
  const pc = await page.evaluate(() => DB.t('programChannels').find((c) => c.program_id === 2 && c.channel_code === 'LOCOMM').id);
  await go(page, `/registration/program/2/${pc}`);
  const daftar = await page.$$eval('#kt_content a[href*="/store/"]', (as) => as.map((a) => a.getAttribute('href')));
  await go(page, `/registration/program/2/${pc}?all=1`);
  log('C1b_saran', { daftar, semuaBaris: await page.locator('#kt_content tbody tr').count(), alasan: (await txt('#kt_content tbody td .text-danger')).slice(0, 5) });

  // C2 · form daftarkan: hitung otomatis, error, ajukan
  const formUrl = daftar[0].slice(1);
  await go(page, formUrl);
  const brandRow = (code, sel) => `#regForm tr[data-b="${code}"] ${sel}`;
  const codes = await page.$$eval('#regForm tr[data-b]', (trs) => trs.map((t) => t.dataset.b));
  const calcSnap = () => page.evaluate(() => [...document.querySelectorAll('#regForm tr[data-b]')].map((tr) => [tr.dataset.b, tr.querySelector('.join').checked, tr.classList.contains('opacity-50'),
    [...tr.querySelectorAll('.calc')].map((td) => td.textContent.replace(/\s+/g, ' ').trim()), tr.querySelector('.reason').textContent]).concat([[document.querySelector('#apPath').textContent.replace(/\s+/g, ' ').trim()]]));
  const awal = await calcSnap();
  await page.fill(brandRow(codes[0], `[name="b_${codes[0]}_growth"]`), '80');
  await page.fill(brandRow(codes[0], `[name="b_${codes[0]}_baseline"]`), '420000000');
  if (codes[1]) await page.locator(brandRow(codes[1], '.join')).uncheck();
  const ubah = await calcSnap();
  // error: baseline kosong pada brand yang ikut
  await page.fill(brandRow(codes[0], `[name="b_${codes[0]}_baseline"]`), '');
  await submit(page, '#regForm');
  const err = await outcome(page);
  await page.fill(brandRow(codes[0], `[name="b_${codes[0]}_baseline"]`), '420000000');
  await page.fill(brandRow(codes[0], `[name="b_${codes[0]}_growth"]`), '80');
  if (codes[1]) await page.locator(brandRow(codes[1], '.join')).uncheck();
  await submit(page, '#regForm');
  const ok = await outcome(page);
  const newReg = Number((ok.hash.match(/participant\/(\d+)/) || [])[1]);
  log('C2_daftar', { codes, awal, ubah, err, ok, reg: await page.evaluate((id) => { const r = DB.byId('registrations', id); return r && { status: r.status, brands: r.brands.map((b) => [b.brand_code, b.baseline, b.growth_pct, b.class_code, b.total_pct]), layer: r.current_layer_id }; }, newReg) });

  // C3 · detail peserta baru
  await go(page, `/registration/participant/${newReg}`);
  log('C3_detail', { hasil: await txt('#kt_content table tbody tr'), jalur: await txt('#kt_content .layer-path .lp'), riwayat: await txt('#kt_content .timeline li') });

  // C4 · approver layer saat ini menyetujui lewat detail (approvalBox)
  const role = await page.evaluate((id) => { const r = DB.byId('registrations', id); const l = r.current_layer_id && DB.byId('programApprovalLayers', r.current_layer_id); return l && l.role_code; }, newReg);
  if (role) {
    await asRole(role);
    await go(page, `/registration/participant/${newReg}`);
    await page.fill('form[data-action="inbox.act"] [name="note"]', 'ok reskin');
    await page.click('form[data-action="inbox.act"] button[value="approve"]'); await settle(page);
    log('C4_approve_detail', { role, ...(await outcome(page)), status: await page.evaluate((id) => DB.byId('registrations', id).status, newReg) });
  } else log('C4_approve_detail', { role: null });

  // C5 · Admin DC mengembalikan reg 9 → CBD merevisi & kirim ulang
  await asRole('ADMIN_DC');
  await go(page, '/registration/participant/9');
  await page.fill('form[data-action="inbox.act"] [name="note"]', 'perbaiki baseline');
  await page.click('form[data-action="inbox.act"] button[value="return"]'); await settle(page);
  const ret = await outcome(page);
  await asRole('CBD', 'CBD Locomm');
  await go(page, '/registration/participant/9');
  const editLink = await page.$$eval('#kt_content a[href$="/edit"]', (as) => as.map((a) => a.getAttribute('href')));
  await go(page, '/registration/participant/9/edit');
  const c9 = await page.$$eval('#regForm tr[data-b]', (trs) => trs.map((t) => t.dataset.b));
  await page.fill(`#regForm tr[data-b="${c9[0]}"] [name="b_${c9[0]}_growth"]`, '78');
  await page.fill('#regForm [name="note"]', 'sudah diperbaiki');
  await submit(page, '#regForm');
  log('C5_revisi', { ret, editLink, kirimUlang: await outcome(page), reg: await page.evaluate(() => { const r = DB.byId('registrations', 9); return { status: r.status, growth: r.brands.map((b) => b.growth_pct) }; }) });

  // C6 · inbox Admin DC: centang semua + konfirmasi setujui
  await asRole('ADMIN_DC');
  await go(page, '/inbox');
  const inboxAwal = { reg: await page.locator('input[name="ids_registration"]').count(), mon: await page.locator('input[name="ids_monitoring"]').count(), pay: await page.locator('input[name="ids_payout"]').count() };
  page.dialogs.length = 0;
  if (inboxAwal.mon) {
    await page.check('[data-check-all="ids_monitoring"]');
    await page.click('form[data-action="inbox.bulk"][data-entity="monitoring"] button:not([type="button"])'); await settle(page);
  }
  log('C6_inbox_bulk', { inboxAwal, dialogs: page.dialogs.slice(), ...(await outcome(page)), mon: await page.evaluate(() => DB.t('monitorings').filter((m) => m.status === 'in_review').length) });

  // C7 · monitoring: CBD isi Q3 untuk reg 1 dengan file evidence
  await asRole('CBD', 'CBD Locomm');
  await go(page, '/monitoring');
  const isi = await page.$$eval('#kt_content a[href^="#/monitoring/form/"]', (as) => as.map((a) => a.getAttribute('href')));
  await go(page, '/monitoring/form/1/Q3-2027');
  const files = page.locator('form[data-action="mon.submit"] input[type="file"]');
  const nFile = await files.count();
  // validasi bawaan browser: coba ajukan tanpa evidence dulu (harus tertahan), lalu isi semua evidence + field wajib lain
  await submit(page, 'form[data-action="mon.submit"]');
  const tertahan = await page.evaluate(() => ({ hash: location.hash, invalid: document.querySelectorAll('form[data-action="mon.submit"] :invalid').length }));
  for (let i = 0; i < nFile; i++) await files.nth(i).setInputFiles({ name: `evidence-${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from('x') });
  const wajib = page.locator('form[data-action="mon.submit"] :is(input:not([type="file"]):not([type="hidden"]), textarea, select)[required]');
  for (let i = 0; i < await wajib.count(); i++) {
    const el = wajib.nth(i); const tag = await el.evaluate((e) => e.tagName + ':' + e.type);
    if (tag.startsWith('SELECT')) { const v = await el.locator('option').nth(1).getAttribute('value'); await el.selectOption(v); }
    else if (tag.endsWith(':number')) await el.fill('1'); else if (tag.endsWith(':date')) await el.fill('2027-08-01'); else await el.fill('uji reskin');
  }
  await submit(page, 'form[data-action="mon.submit"]');
  const mon = await outcome(page);
  log('C7_monitoring', { isi: isi.slice(0, 6), nFile, tertahan, mon, rec: await page.evaluate(() => { const m = DB.t('monitorings').find((x) => x.registration_id === 1 && x.period_key === 'Q3-2027'); return m && { status: m.status, evidence: m.evidence }; }) });
  const monId = Number((mon.hash.match(/item\/(\d+)/) || [])[1]);
  if (monId) { await go(page, `/monitoring/item/${monId}`); log('C7b_monitoring_item', { evidence: await txt('#kt_content table tbody tr'), jalur: await txt('#kt_content .layer-path .lp') }); }

  // C8 · filter peserta & master toko
  await go(page, '/registration/participants');
  await page.selectOption('form[data-action="filter"] [name="status"]', 'approved');
  await submit(page, 'form[data-action="filter"]');
  log('C8_filter_peserta', { hash: await page.evaluate(() => location.hash), baris: await page.locator('#kt_content tbody tr').count() });
  await go(page, '/master/stores');
  await page.fill('form[data-action="filter"] [name="q"]', 'Malang');
  await submit(page, 'form[data-action="filter"]');
  log('C8b_filter_toko', { hash: await page.evaluate(() => location.hash), baris: await page.locator('#kt_content tbody tr').count() });

  // C9 · payout: Admin DC ajukan Conditional Q1 untuk reg 4
  await asRole('ADMIN_DC');
  await go(page, '/payout/program/2');
  const nav = await page.$$eval('#kt_content a[href^="#/payout/program/2?"]', (as) => as.map((a) => a.getAttribute('href')));
  await go(page, '/payout/form/4/CONDITIONAL/Q1-2027');
  const fpay = await page.evaluate(() => ({ total: (document.querySelector('form[data-action="payout.submit"] button:not([type="button"])') || {}).textContent?.replace(/\s+/g, ' ').trim(), baris: [...document.querySelectorAll('#kt_content table tbody tr')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()) }));
  await submit(page, 'form[data-action="payout.submit"]');
  log('C9_payout', { nav, fpay, ...(await outcome(page)), rec: await page.evaluate(() => { const x = DB.t('payouts').find((y) => y.registration_id === 4 && y.component === 'CONDITIONAL' && y.period_key === 'Q1-2027'); return x && { status: x.status, amount: x.amount }; }) });

  // C10 · dashboard per role: tombol & angka ringkasan
  const dash = {};
  for (const r of ['CBD', 'ADMIN_HO', 'FINANCE']) { await asRole(r, r === 'CBD' ? 'CBD Locomm' : null); await go(page, '/'); dash[r] = { links: await page.$$eval('#kt_content a[href^="#/"]', (as) => as.map((a) => a.getAttribute('href'))), stat: await txt('#kt_content .stat') }; }
  log('C10_dashboard', dash);

  const state = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), STORE_KEY));
  S.consoleErrors = page.consoleErrors.slice();
  await page.context().close();
  return { scenarios: S, state };
}

// ---------------------------------------------------------------- skenario inti
const q = (page, sel) => page.locator(sel).first();
async function submit(page, formSel) {
  await page.locator(`${formSel} button:not([type="button"])`).first().click();
  await settle(page);
}
async function outcome(page) {
  return page.evaluate(() => {
    const t = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : null);
    // flash = alert dari UI.render() (anak langsung .kt-container, di luar wrapper konten); errors = UI.errorsHtml() (daftar <ul>)
    const flash = [...document.querySelectorAll('#kt_content .kt-container > .alert')].find((x) => !x.querySelector(':scope > ul'));
    return { hash: location.hash, flash: t(flash), formError: t(document.querySelector('.js-form-error')),
      errors: t(document.querySelector('#kt_content .alert-danger ul')) };
  });
}
const dbRead = (page, fn, arg) => page.evaluate(new Function('arg', `return (${fn})(arg)`), arg);

async function runScenarios(browser) {
  const page = await freshPage(browser, 1440);
  const S = {};
  const log = (k, v) => { S[k] = v; process.stdout.write(`  skenario ${k}\n`); };

  // 1 · clone program (1A)
  await go(page, '/setup?clone=2');
  await page.fill('form[data-action="setup.clone"] [name="code"]', 'reskin-test');
  await page.fill('form[data-action="setup.clone"] [name="name"]', 'Reskin Test');
  await submit(page, 'form[data-action="setup.clone"]');
  const cloneOut = await outcome(page);
  const pid = Number(cloneOut.hash.match(/setup\/(\d+)/)[1]);
  log('1_clone', { ...cloneOut, program: await dbRead(page, '(id) => { const p = DB.byId("programs", id); return { code: p.code, name: p.name, status: p.status, year: p.year }; }', pid) });

  // 1b · clone dengan kode bentrok → error di atas form, isian tetap
  await go(page, '/setup?clone=2');
  await page.fill('form[data-action="setup.clone"] [name="code"]', 'LOYALTY-2027');
  await page.fill('form[data-action="setup.clone"] [name="name"]', 'Bentrok');
  await submit(page, 'form[data-action="setup.clone"]');
  log('1b_clone_error', { ...(await outcome(page)), nameKept: await page.inputValue('form[data-action="setup.clone"] [name="name"]') });

  // 2 · simpan header (1B) + validasi header (retry dengan nilai yang sudah diisi)
  await go(page, `/setup/${pid}/header`);
  await page.fill('form[data-action="setup.header"] [name="period_end"]', '2026-01-01');
  await submit(page, 'form[data-action="setup.header"]');
  log('2a_header_error', { ...(await outcome(page)), periodKept: await page.inputValue('form[data-action="setup.header"] [name="period_end"]') });
  await go(page, `/setup/${pid}/header`);
  await page.fill('form[data-action="setup.header"] [name="description"]', 'Uji reskin');
  await submit(page, 'form[data-action="setup.header"]');
  log('2b_header_save', { ...(await outcome(page)), description: await dbRead(page, '(id) => DB.byId("programs", id).description', pid) });

  // 2c · tambah tipe program
  await go(page, `/setup/${pid}/header`);
  if (await page.locator('form[data-action="setup.addType"]').count()) {
    await page.fill('form[data-action="setup.addType"] [name="name"]', 'Tipe Reskin');
    await submit(page, 'form[data-action="setup.addType"]');
    log('2c_add_type', await outcome(page));
  } else log('2c_add_type', { skipped: 'form tambah tipe dihapus (permintaan 23 Okt 2026)' });

  // 3 · tambah channel (2) + simpan eligibility (3a)
  await go(page, `/setup/${pid}/channels`);
  const chOpt = await page.locator('form[data-action="setup.addChannel"] select[name="channel_code"] option').first().getAttribute('value');
  await submit(page, 'form[data-action="setup.addChannel"]');
  log('3a_add_channel', { channel: chOpt, ...(await outcome(page)) });
  await page.fill('form[data-action="setup.saveEligibility"] [name="elig_ratio_min"]', '95');
  await page.selectOption('form[data-action="setup.saveEligibility"] [name="pay_FIX"]', 'QUARTERLY');
  await page.selectOption('form[data-action="setup.saveEligibility"] [name="monitoring_frequency"]', 'SEMESTER');
  await submit(page, 'form[data-action="setup.saveEligibility"]');
  log('3b_eligibility_error', await outcome(page));
  await page.selectOption('form[data-action="setup.saveEligibility"] [name="monitoring_frequency"]', 'QUARTERLY');
  await submit(page, 'form[data-action="setup.saveEligibility"]');
  log('3c_eligibility_save', await outcome(page));

  const info = await programInfo(page, pid);
  const ch = info.channels.find((c) => c.code === 'LOCOMM') || info.channels[0];
  const brandId = ch.brands[0];

  // 4 · kelas & tier (3c): ubah batas, tambah kelas (#addClass), cek cepat, simpan
  await go(page, `/setup/${pid}/ch/${ch.id}/brands/${brandId}`);
  const nCls = await page.locator('#classes .class-card').count();
  await page.fill(`#classes [data-c="${nCls - 1}"][data-f="baseline_max"]:not([data-t])`, '5000000000');
  await page.click('#addClass');
  await page.fill(`#classes [data-c="${nCls}"][data-f="baseline_min"]:not([data-t])`, '5000000000');
  await page.fill(`#classes [data-c="${nCls}"][data-f="fix"]:not([data-t])`, '4');
  await page.fill(`#classes [data-c="${nCls}"][data-t="0"][data-f="total"]`, '9');
  await page.click(`#classes [data-act="addT"][data-c="${nCls}"]`);
  const nT = await page.locator(`#classes [data-c="${nCls}"][data-f="total"][data-t]`).count();
  await page.fill(`#classes [data-c="${nCls}"][data-t="${nT - 1}"][data-f="cond"]`, '8');
  await page.fill('#qBase', '2500000000');
  await page.fill('#qGrowth', '80');
  const classUi = await page.evaluate(() => ({ flags: document.querySelector('#flags').textContent.trim(), quick: document.querySelector('#qOut').textContent.replace(/\s+/g, ' ').trim(),
    cond: document.querySelector(`#classes [data-c="${document.querySelectorAll('#classes .class-card').length - 1}"][data-t="0"][data-f="cond"]`).value }));
  await submit(page, 'form[data-action="setup.saveClasses"]');
  log('4_classes', { ui: classUi, ...(await outcome(page)),
    stored: await dbRead(page, '(b) => DB.where("programClasses", (c) => c.program_channel_brand_id === b).map((c) => [c.code, c.baseline_min, c.baseline_max, c.fix_rebate_max_pct, c.tiers.map((t) => [t.target_growth_pct, t.conditional_rebate_pct, t.total_rebate_pct])])', brandId) });

  // 5 · struktur pilar (3d): error lalu sukses
  await go(page, `/setup/${pid}/ch/${ch.id}/pillars`);
  await page.click('#addPillar');
  const k = (await page.locator('#tree .tree-pillar').count()) - 1;
  await page.fill(`#tree input[data-p="${k}"][data-f="name"]:not([data-j])`, 'Pilar Reskin');
  await page.fill(`#tree input[data-p="${k}"][data-j="0"][data-f="name"]:not([data-l])`, 'JTBD Reskin');
  await submit(page, 'form[data-action="setup.savePillars"]');
  const pilErr = await outcome(page);
  await page.click(`#tree [data-act="addL"][data-p="${k}"][data-j="0"]`);
  await page.fill(`#tree [data-p="${k}"][data-j="0"][data-l="0"][data-f="name"]`, 'LM Reskin');
  await page.fill(`#tree [data-p="${k}"][data-j="0"][data-l="0"][data-f="unit"]`, 'jam');
  const wsum = await page.textContent('#wsum');
  await submit(page, 'form[data-action="setup.savePillars"]');
  log('5_pillars', { error: pilErr, wsum, ...(await outcome(page)) });

  // 6 · target lead measure (3d-2): isi sel angka & teks, ganti operator, simpan
  await go(page, `/setup/${pid}/ch/${ch.id}/pillars/${brandId}`);
  const numCells = page.locator('#lmtSheet input.lmt-in.num');
  await numCells.nth(0).fill('7');
  if (await numCells.count() > 1) await numCells.nth(1).fill('');
  const op = page.locator('#lmtSheet select.lmt-op').first();
  if (await op.count()) { const opts = await op.locator('option').evaluateAll((os) => os.map((o) => o.value)); await op.selectOption(opts[opts.length - 1]); }
  // kelas kedua: tambah 2 section baru, beri nama unik, lalu gabung baris pertama
  const secBtn = page.locator('#lmtSheet [data-act="addSec"]').nth(1);
  const secCls = await secBtn.getAttribute('data-c');
  for (const nm of ['Reskin Satu', 'Reskin Dua']) {
    await page.locator(`#lmtSheet [data-act="addSec"][data-c="${secCls}"]`).click();
    const ins = page.locator(`#lmtSheet .lmt-sec-in[data-c="${secCls}"]`);
    const n = await ins.count();
    for (let i = 0; i < n; i++) if (!(await ins.nth(i).inputValue())) await ins.nth(i).fill(i === n - 1 ? nm : `Reskin Awal ${i + 1}`);
  }
  await page.locator(`#lmtSheet [data-act="merge"][data-c="${secCls}"]`).first().click();
  const lmtUi = await page.evaluate(() => ({ merged: document.querySelectorAll('#lmtSheet td.lmt-merged').length, empty: document.querySelectorAll('#lmtSheet .lmt-cell.is-empty').length,
    cols: document.querySelectorAll('#lmtSheet col[data-col]').length }));
  await submit(page, 'form[data-action="setup.saveLmTargets"]');
  log('6_lm_targets', { ui: lmtUi, ...(await outcome(page)), stored: await dbRead(page, '(b) => DB.byId("programChannelBrands", b).lm_targets', brandId) });

  // 6b · resize kolom lewat mousedown/mousemove/mouseup
  await go(page, `/setup/${pid}/ch/${ch.id}/pillars/${brandId}`);
  const rs = page.locator('#lmtSheet .lmt-rs[data-rs="f3"]');
  const bx = await rs.boundingBox();
  await page.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2);
  await page.mouse.down();
  await page.mouse.move(bx.x + 80, bx.y + bx.height / 2, { steps: 4 });
  await page.mouse.up();
  log('6b_lmt_resize', await page.evaluate((b) => ({ widths: JSON.parse(localStorage.getItem(`tradee-lmt-widths-${b}`) || '{}'), resizingCleared: !document.body.classList.contains('lmt-resizing') }), brandId));

  // 7 · rumus (3e): preset, override brand, klik variabel katalog, simpan
  await go(page, `/setup/${pid}/ch/${ch.id}/formulas`);
  const fxBefore = await page.$$eval('.fx-out', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  await page.locator('.preset').first().click();
  await page.click('#addOv');
  const ovExpr = page.locator('#ovTable tbody tr.ov [name="ov_expr"]').last();
  await ovExpr.focus();
  await page.locator('.formula-vars code').first().click();
  const ovValue = await ovExpr.inputValue();
  const ovCheck = await page.locator('#ovTable tbody tr.ov .fx-out').last().textContent();
  await page.click('#addOv');
  await page.locator('#ovTable .del-ov').last().click();
  await submit(page, 'form[data-action="setup.saveFormulas"]');
  log('7_formulas', { fxBefore, ovValue, ovCheck: ovCheck.trim(), ovRows: await page.locator('#ovTable tbody tr.ov').count(), ...(await outcome(page)),
    stored: await dbRead(page, '(pc) => DB.where("programFormulas", (x) => x.program_channel_id === pc).map((x) => [x.slot, x.brand_code, x.expression, x.is_valid])', ch.id) });

  // 8 · form fase + approval layer (3f–g)
  await go(page, `/setup/${pid}/ch/${ch.id}/phases/REGISTRATION`);
  await page.click('#addCustom');
  const last = (await page.locator('#fRows tr[data-i]').count()) - 1;
  // blur setelah tiap isian: change → drawFields menggambar ulang baris, jadi elemen dicari ulang
  const fillBlur = async (sel, v) => { const l = page.locator(sel); await l.fill(v); await l.evaluate((e) => e.blur()); };
  await fillBlur(`#fRows tr[data-i="${last}"] [data-f="field_key"]`, 'catatan_reskin');
  await fillBlur(`#fRows tr[data-i="${last}"] [data-f="label"]`, 'Catatan reskin');
  await page.selectOption(`#fRows tr[data-i="${last}"] [data-f="mode"]`, 'CALCULATED');
  await fillBlur(`#fRows tr[data-i="${last}"] [data-f="expression"]`, 'baseline * 2');
  const exprCheck = await page.locator(`#fRows tr[data-i="${last}"] .fx-out`).textContent();
  await page.click(`#fRows tr[data-i="${last}"] [data-act="up"]`);
  await submit(page, 'form[data-action="setup.savePhaseForm"]');
  log('8a_phase_form', { exprCheck, ...(await outcome(page)),
    stored: await dbRead(page, '(pc) => DB.where("programPhaseFields", (x) => x.program_channel_id === pc && x.phase === "REGISTRATION").map((x) => [x.field_key, x.mode, x.sort_order])', ch.id) });
  await page.click('#addLayer');
  await submit(page, 'form[data-action="setup.saveLayers"]');
  const layerErr = await outcome(page);
  await page.locator('#layers [data-act="del"]').last().click();
  const lc = page.locator('#layers .layer-card').first();
  await lc.locator('[data-act="addC"]').click();
  await lc.locator('[data-cf="value"]').last().fill('75');
  await submit(page, 'form[data-action="setup.saveLayers"]');
  log('8b_layers', { error: layerErr, ...(await outcome(page)),
    stored: await dbRead(page, '(pc) => DB.where("programApprovalLayers", (x) => x.program_channel_id === pc && x.phase === "REGISTRATION").map((x) => [x.layer_order, x.role_code, x.is_final, x.conditions])', ch.id) });

  // 9 · template MOU (3h): section baru, placeholder, preview, simpan revisi
  await go(page, `/setup/${pid}/ch/${ch.id}/documents/MOU`);
  await page.click('#addSec');
  const ls = (await page.locator('#secs [data-s]').count()) - 1;
  await page.fill(`#secs [data-s="${ls}"] [data-f="heading"]`, 'Reskin');
  await page.locator(`#secs [data-s="${ls}"] textarea`).focus();
  await page.locator('[data-ph]').first().click();
  await page.click('#pvBtn');
  const pv = (await page.textContent('#pvOut')).replace(/\s+/g, ' ').trim();
  await submit(page, 'form[data-action="setup.saveDoc"]');
  log('9_document', { previewHead: pv.slice(0, 400), previewLen: pv.length, ...(await outcome(page)) });

  // 10 · exception toko (3a) + data-click hapus
  await go(page, `/setup/${pid}/ch/${ch.id}/eligibility`);
  const excOpt = page.locator('form[data-action="setup.addException"] [name="customer_id"] option').nth(1);
  const exc = (await excOpt.count()) ? await excOpt.getAttribute('value') : null;
  if (exc) {
    await page.selectOption('form[data-action="setup.addException"] [name="customer_id"]', exc);
    await page.fill('form[data-action="setup.addException"] [name="reason"]', 'Uji reskin');
    await submit(page, 'form[data-action="setup.addException"]');
    const add = await outcome(page);
    await page.locator('[data-click="setup.delException"]').first().click();
    await settle(page);
    log('10_exception', { customer: exc, add, del: await outcome(page) });
  }

  // 11 · simulasi (4): angka per channel × brand × growth, program DRAFT dan 2027
  const sim = {};
  for (const sp of [pid, 2]) {
    await go(page, `/setup/${sp}/simulate`);
    const chans = await page.$$eval('#sCh option', (os) => os.map((o) => o.value));
    for (const c of chans) {
      await page.selectOption('#sCh', c);
      const brands = await page.$$eval('#sBrand option', (os) => os.map((o) => o.value));
      for (const b of brands) {
        await page.selectOption('#sBrand', b);
        for (const [g, actual] of [['30', ''], ['76', ''], ['120', '900000000']]) {
          await page.fill('#sGrowth', g);
          await page.fill('#sActual', actual);
          sim[`${sp}/${c}/${b}/g${g}${actual ? '/actual' : ''}`] = await page.evaluate(() => [...document.querySelectorAll('#sOut tr, #sOut li, #sOut .alert, #sOut .lp')]
            .map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
        }
      }
    }
  }
  log('11_simulation', sim);

  // 12 · validasi (5) untuk 2026, 2027, DRAFT
  const val = {};
  for (const [vp, year] of [[1, 2026], [2, 2027], [pid, 2027]]) {
    await setYear(page, year);
    await go(page, `/setup/${vp}/validate`);
    val[vp] = await page.evaluate(() => ({ checks: [...document.querySelectorAll('ul.checks li')].map((li) => li.textContent.replace(/\s+/g, ' ').trim()),
      publishForm: !!document.querySelector('form[data-action="setup.publish"]'), publishDisabled: (document.querySelector('form[data-action="setup.publish"] button') || {}).disabled ?? null,
      closeBtn: !!document.querySelector('[data-click="setup.close"]') }));
  }
  log('12_validation', val);

  // 13 · hapus DRAFT lewat data-confirm (confirm() diterima)
  await setYear(page, 2027);
  await go(page, '/setup?clone=1');
  await page.fill('form[data-action="setup.clone"] [name="code"]', 'RESKIN-DEL');
  await page.fill('form[data-action="setup.clone"] [name="name"]', 'Reskin Hapus');
  await submit(page, 'form[data-action="setup.clone"]');
  const delId = Number((await page.evaluate(() => location.hash)).match(/setup\/(\d+)/)[1]);
  await go(page, `/setup/${delId}/header`);
  page.dialogs.length = 0;
  await page.click('[data-click="setup.deleteProgram"]');
  await settle(page);
  log('13_delete_confirm', { dialogs: page.dialogs.slice(), ...(await outcome(page)), exists: await dbRead(page, '(id) => !!DB.byId("programs", id)', delId) });

  // 14 · close program 2027 lewat data-confirm
  await go(page, '/setup/2/validate');
  page.dialogs.length = 0;
  await page.click('[data-click="setup.close"]');
  await settle(page);
  log('14_close', { dialogs: page.dialogs.slice(), ...(await outcome(page)), status: await dbRead(page, '() => DB.byId("programs", 2).status') });

  const state = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), STORE_KEY));
  S.consoleErrors = page.consoleErrors.slice();
  await page.context().close();
  return { scenarios: S, state };
}

// ---------------------------------------------------------------- main
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
const browser = isMain ? await chromium.launch() : null;
if (isMain) try {
  console.log(`[${LABEL}] ekstraksi route${SHOTS ? ` + screenshot ${WIDTHS.join('/')}px` : ''}`);
  const ex = MODULES ? await captureModules(browser) : await captureRoutes(browser);
  fs.writeFileSync(EXTRACT_FILE, JSON.stringify(ex, null, 1));
  console.log(`→ ${path.relative(ROOT, EXTRACT_FILE)} (${Object.keys(ex.routes).length} route)`);
  if (SCENARIOS && !ONLY && MODULES) {
    console.log(`[${LABEL}] skenario CDT & approver`);
    const { scenarios, state } = await runCdtScenarios(browser);
    fs.writeFileSync(path.join(RESKIN, `scenarios-cdt-${LABEL}.json`), JSON.stringify(scenarios, null, 1));
    fs.writeFileSync(path.join(RESKIN, `state-cdt-${LABEL}.json`), JSON.stringify(state));
    console.log(`→ scenarios-cdt-${LABEL}.json, state-cdt-${LABEL}.json`);
  }
  if (SCENARIOS && !ONLY && !MODULES) {
    console.log(`[${LABEL}] skenario inti`);
    const { scenarios, state } = await runScenarios(browser);
    fs.writeFileSync(path.join(RESKIN, `scenarios-${LABEL}.json`), JSON.stringify(scenarios, null, 1));
    fs.writeFileSync(path.join(RESKIN, `state-${LABEL}.json`), JSON.stringify(state));
    console.log(`→ scenarios-${LABEL}.json, state-${LABEL}.json`);
  }
} finally {
  await browser.close();
}
