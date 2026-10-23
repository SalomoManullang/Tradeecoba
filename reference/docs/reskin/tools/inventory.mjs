// Lampiran inventaris otomatis: field, tombol/link, dan tabel per route Program Setup (dibaca dari DOM).
// Pemakaian: node inventory.mjs → reference/docs/reskin/inventory-fields.md
// Baris yang diulang oleh draw() (per kelas, tier, field, layer, section) diringkas: indeks angka diganti "#", jumlahnya dicatat.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { freshPage, go, settle, setYear, programInfo } from './capture.mjs';

const RESKIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readPage() {
  const root = document.querySelector('#kt_content');
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const generic = (v) => String(v).replace(/^\d+$/, '#');
  const attrsOf = (el, keys) => keys.filter((k) => el.hasAttribute(k)).map((k) => (el.getAttribute(k) === '' ? k : `${k}=${generic(el.getAttribute(k))}`));
  const dataOf = (el) => [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => `${a.name}=${generic(a.value)}`);
  function labelOf(el) {
    if (el.labels && el.labels[0]) return norm(el.labels[0].textContent);
    const td = el.closest('td');
    if (td) {
      const tr = td.closest('tr'); const table = td.closest('table');
      const idx = [...tr.children].indexOf(td);
      const th = table && table.querySelector('thead tr:last-child') && table.querySelector('thead tr:last-child').children[idx];
      if (th && norm(th.textContent)) return `[kolom] ${norm(th.textContent)}`;
    }
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const l = p.querySelector(':scope > label, :scope > .form-label');
      if (l && !l.contains(el)) return norm(l.textContent);
      if (p.tagName === 'FORM') break;
    }
    return el.getAttribute('placeholder') ? `(placeholder) ${el.getAttribute('placeholder')}` : el.getAttribute('title') || '-';
  }
  const forms = [...root.querySelectorAll('form')].map((f) => ({ action: f.dataset.action, data: dataOf(f).join(' '), cls: f.className }));
  const controls = new Map();
  for (const el of root.querySelectorAll('input, select, textarea')) {
    if (el.type === 'hidden' && !el.id) continue;
    const ident = [el.name && `name=${generic(el.name)}`, el.id && `#${el.id}`, ...dataOf(el)].filter(Boolean).join(' ') || `.${[...el.classList].join('.')}`;
    const form = el.closest('form');
    const key = `${form ? form.dataset.action : '-'}|${ident}|${el.type}`;
    const row = controls.get(key) || { form: form ? form.dataset.action : '(tanpa form)', label: labelOf(el), control: el.tagName === 'INPUT' ? `input[${el.type}]` : el.tagName.toLowerCase(), ident,
      flags: [...attrsOf(el, ['required', 'readonly', 'disabled']), el.matches(':disabled') && !el.hasAttribute('disabled') ? 'disabled (fieldset)' : null].filter(Boolean).join(', ') || '-',
      placeholder: el.getAttribute('placeholder') || '-',
      value: el.tagName === 'SELECT' ? `${el.options.length} opsi; terpilih "${norm((el.selectedOptions[0] || {}).textContent)}"` : el.type === 'checkbox' ? (el.checked ? 'dicentang' : 'tidak') : (el.value ? el.value.slice(0, 40) : '-'),
      n: 0 };
    row.n++; controls.set(key, row);
  }
  const actions = new Map();
  for (const el of root.querySelectorAll('button, a[href], [data-click], [data-act]')) {
    if (el.matches('[data-act]') && el.closest('[data-act]') !== el) continue;
    const text = norm(el.textContent) || el.getAttribute('title') || '(ikon)';
    const what = [el.tagName === 'BUTTON' ? `button[${el.getAttribute('type') || 'submit'}]` : el.tagName.toLowerCase(), el.id && `#${el.id}`, ...dataOf(el).filter((d) => !d.startsWith('data-confirm')),
      el.getAttribute('href') && el.getAttribute('href') !== '#' && `href=${el.getAttribute('href').replace(/\/\d+/g, '/#')}`, el.getAttribute('name') && `name=${el.name} value=${el.value}`].filter(Boolean).join(' ');
    const form = el.closest('form');
    const key = `${what}|${text.replace(/\d+/g, '#')}`;
    const row = actions.get(key) || { text, what, form: form ? form.dataset.action : '-', confirm: el.dataset.confirm ? 'ya' : '-', disabled: el.matches(':disabled') ? 'ya' : '-', n: 0 };
    row.n++; actions.set(key, row);
  }
  const tables = [...root.querySelectorAll('table')].map((t) => ({ id: t.id || [...t.classList].join('.'), head: [...t.querySelectorAll('thead th')].map((th) => norm(th.textContent) || '(kosong)').join(' · '),
    rows: t.querySelectorAll('tbody tr').length }));
  return { title: document.title, forms, controls: [...controls.values()], actions: [...actions.values()], tables };
}

const esc = (s) => String(s).replace(/\|/g, '\\|');
const browser = await chromium.launch();
try {
  const page = await freshPage(browser, 1440);
  await go(page, '/setup?clone=2');
  await page.fill('form[data-action="setup.clone"] [name="code"]', 'RESKIN-DRAFT');
  await page.fill('form[data-action="setup.clone"] [name="name"]', 'Reskin Draft');
  await page.click('form[data-action="setup.clone"] button:not([type="button"])');
  await settle(page);
  const d = await programInfo(page, 3);
  const ch = d.channels[0]; const b = ch.brands[0]; const c = `/setup/3/ch/${ch.id}`;
  const list = [['0 · Daftar program & 1A · Clone', '/setup?clone=2'], ['1B · Program baru', '/setup/new'], ['1B · Header program', '/setup/3/header'], ['2 · Channel', '/setup/3/channels'],
    ['3a · Eligibility & jadwal', `${c}/eligibility`], ['3b · Brand', `${c}/brands`], ['3c · Kelas & tier per brand', `${c}/brands/${b}`], ['3d · Struktur pilar', `${c}/pillars`],
    ['3d-2 · Target lead measure per kelas', `${c}/pillars/${b}`], ['3e · Rumus', `${c}/formulas`], ['3f–g · Fase: form & approval (Registration)', `${c}/phases/REGISTRATION`],
    ['3h / 7 · Template dokumen (MOU)', `${c}/documents/MOU`], ['4 · Simulasi', '/setup/3/simulate'], ['5–6 · Validasi & publish (DRAFT)', '/setup/3/validate'], ['8 · Close (PUBLISHED)', '/setup/2/validate'],
    ['Audit log', '/setup/3/audit']];
  const out = ['# Lampiran inventaris: field, aksi, dan tabel per route', '',
    'Dibuat otomatis oleh `tools/inventory.mjs` dari DOM program DRAFT hasil clone (id 3, channel pertama, brand pertama). Angka id di `data-*` / `href` diganti `#`.',
    'Kolom **n** = jumlah elemen sejenis (baris yang digambar ulang oleh `draw()` diringkas). Route program PUBLISHED identik, hanya `disabled (fieldset)`.', ''];
  for (const [title, route] of list) {
    await setYear(page, 2027);
    await go(page, route);
    const r = await page.evaluate(readPage);
    out.push(`## ${title}`, '', `Route \`#${route.replace(/\/\d+/g, '/:id')}\` · title "${r.title}"`, '');
    if (r.forms.length) out.push('**Form**', '', ...r.forms.map((f) => `- \`${f.action || '(tanpa data-action)'}\` ${f.data ? `· ${f.data}` : ''}`), '');
    if (r.controls.length) {
      out.push('**Field**', '', '| Form | Label | Kontrol | name / id / data-* | Wajib · readonly · disabled | Placeholder | Default | n |', '|---|---|---|---|---|---|---|---|');
      for (const x of r.controls) out.push(`| ${esc(x.form)} | ${esc(x.label)} | ${x.control} | \`${esc(x.ident)}\` | ${x.flags} | ${esc(x.placeholder)} | ${esc(x.value)} | ${x.n} |`);
      out.push('');
    }
    if (r.actions.length) {
      out.push('**Tombol & link**', '', '| Teks | Elemen & hook | Di form | data-confirm | Disabled | n |', '|---|---|---|---|---|---|');
      for (const x of r.actions) out.push(`| ${esc(x.text.slice(0, 60))} | \`${esc(x.what)}\` | ${x.form || '-'} | ${x.confirm} | ${x.disabled} | ${x.n} |`);
      out.push('');
    }
    if (r.tables.length) out.push('**Tabel**', '', ...r.tables.map((t) => `- \`${t.id || 'table'}\` · ${t.rows} baris · kolom: ${t.head || '(tanpa thead)'}`), '');
  }
  fs.writeFileSync(path.join(RESKIN, 'inventory-fields.md'), out.join('\n'));
  console.log('→ reference/docs/reskin/inventory-fields.md');
} finally {
  await browser.close();
}
