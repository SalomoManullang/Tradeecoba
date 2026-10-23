// Bandingkan hasil capture: baseline.json vs after.json, scenarios-before vs -after, state-before vs -after.
// Pemakaian: node diff.mjs [--a baseline.json] [--b after.json]
// Yang dianggap boleh: class baru (class lama tetap ada) dan wrapper div tanpa hook (tidak diekstrak).
// Selain itu dicatat di diff-report.md. Exit code 1 bila ada perbedaan.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RESKIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const read = (f) => JSON.parse(fs.readFileSync(path.join(RESKIN, f), 'utf8'));

// LCS sederhana untuk dua daftar kunci → pasangan indeks + sisa kiri/kanan
function align(a, b, key) {
  const n = a.length; const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = []; const del = []; const add = [];
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) { pairs.push([i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) del.push(i++); else add.push(j++);
  }
  while (i < n) del.push(i++);
  while (j < m) add.push(j++);
  return { pairs, del, add };
}

const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);

function diffRoutes(A, B) {
  const out = [];
  const keys = [...new Set([...Object.keys(A.routes), ...Object.keys(B.routes)])];
  for (const k of keys) {
    const a = A.routes[k]; const b = B.routes[k];
    const issues = [];
    if (!a || !b) { out.push({ route: k, issues: [`route hanya ada di ${a ? 'baseline' : 'after'}`] }); continue; }
    if (a.hash !== b.hash) issues.push(`hash tujuan: ${a.hash} → ${b.hash}`);
    if (a.title !== b.title) issues.push(`title: ${a.title} → ${b.title}`);
    // kunci = hook + href + teks, supaya elemen baru yang mirip (mis. dua link ke #/setup) tidak salah dipasangkan
    const { pairs, del, add } = align(a.elements, b.elements, (e) => `${e.sig}|${e.attrs.href || ''}|${e.text || ''}`);
    for (const i of del) issues.push(`HILANG  ${a.elements[i].sig}  (path: ${a.elements[i].path || '-'})${a.elements[i].text ? ` "${a.elements[i].text}"` : ''}`);
    for (const j of add) issues.push(`BARU    ${b.elements[j].sig}  (path: ${b.elements[j].path || '-'})${b.elements[j].text ? ` "${b.elements[j].text}"` : ''}`);
    for (const [i, j] of pairs) {
      const x = a.elements[i]; const y = b.elements[j];
      if (!same(x.attrs, y.attrs)) issues.push(`ATRIBUT ${x.sig}: ${JSON.stringify(x.attrs)} → ${JSON.stringify(y.attrs)}`);
      if (!same(x.props, y.props)) issues.push(`STATE   ${x.sig}: ${JSON.stringify(x.props)} → ${JSON.stringify(y.props)}`);
      if (x.path !== y.path) issues.push(`PARENT  ${x.sig}: ${x.path} → ${y.path}`);
      if ((x.text || '') !== (y.text || '')) issues.push(`TEKS    ${x.sig}: "${x.text}" → "${y.text}"`);
      const lost = x.cls.filter((c) => !y.cls.includes(c));
      if (lost.length) issues.push(`CLASS   ${x.sig}: class dihapus ${lost.join(' ')}`);
    }
    const t = align(a.texts, b.texts, (s) => s);
    if (t.del.length || t.add.length) issues.push(`COPY    teks hilang: ${JSON.stringify(t.del.map((i) => a.texts[i]))} · teks baru: ${JSON.stringify(t.add.map((j) => b.texts[j]))}`);
    const errs = (b.consoleErrors || []).filter((e) => !(a.consoleErrors || []).includes(e));
    if (errs.length) issues.push(`CONSOLE error baru: ${errs.join(' | ')}`);
    for (const w of [1440, 1280]) if (b[`overflowX_${w}`] && !a[`overflowX_${w}`]) issues.push(`OVERFLOW horizontal halaman di ${w}px`);
    // Kerangka (mode --modules): hook aside / header / topbar / footer
    for (const f of Object.keys(a.frame || {})) {
      const fa = a.frame[f]; const fb = (b.frame || {})[f];
      if (!Array.isArray(fa) || !Array.isArray(fb)) { if (!same(fa, fb)) issues.push(`KERANGKA ${f}: ${JSON.stringify(fa)?.slice(0, 40)} → ${JSON.stringify(fb)?.slice(0, 40)}`); continue; }
      const al = align(fa, fb, (e) => e.sig);
      for (const i of al.del) issues.push(`KERANGKA ${f} HILANG ${fa[i].sig}${fa[i].text ? ` "${fa[i].text}"` : ''}`);
      for (const j of al.add) issues.push(`KERANGKA ${f} BARU ${fb[j].sig}${fb[j].text ? ` "${fb[j].text}"` : ''}`);
      for (const [i, j] of al.pairs) {
        const x = fa[i]; const y = fb[j];
        if (!same(x.attrs, y.attrs) || !same(x.props, y.props) || (x.text || '') !== (y.text || '')) issues.push(`KERANGKA ${f} BERUBAH ${x.sig}`);
        const lost = x.cls.filter((c) => !y.cls.includes(c));
        if (lost.length) issues.push(`KERANGKA ${f} CLASS dihapus ${x.sig}: ${lost.join(' ')}`);
      }
    }
    if (issues.length) out.push({ route: k, issues });
  }
  return out;
}

// Deep diff JSON → daftar path yang berbeda
function deep(a, b, p = '$', acc = []) {
  if (same(a, b)) return acc;
  if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) deep(a[k], b[k], `${p}.${k}`, acc);
    return acc;
  }
  acc.push(`${p}: ${JSON.stringify(a)?.slice(0, 200)} → ${JSON.stringify(b)?.slice(0, 200)}`);
  return acc;
}

const MOD = args.includes('--modules');
const fa = arg('--a', MOD ? 'modules-before.json' : 'baseline.json'); const fb = arg('--b', MOD ? 'modules-after.json' : 'after.json');
const lines = [`# Diff reskin: ${fa} vs ${fb}`, '', `Dibuat: ${new Date().toISOString()}`, ''];
let bad = 0;

const routes = diffRoutes(read(fa), read(fb));
lines.push('## 1. Hook DOM, copy, console, overflow per route', '');
if (!routes.length) lines.push('Tidak ada perbedaan. Semua `id`, `name`, `data-*`, `href`, state field, parent semantik, class lama, dan teks identik.', '');
for (const r of routes) { bad += r.issues.length; lines.push(`### ${r.route}`, '', ...r.issues.map((x) => `- ${x}`), ''); }

for (const [title, f] of MOD ? [['2. Skenario CDT & approver', 'scenarios-cdt'], ['3. Data tersimpan setelah skenario CDT (localStorage)', 'state-cdt']] : [['2. Skenario inti', 'scenarios'], ['3. Data tersimpan (localStorage)', 'state']]) {
  const ext = f === 'state' ? 'json' : 'json';
  const pa = path.join(RESKIN, `${f}-before.${ext}`); const pb = path.join(RESKIN, `${f}-after.${ext}`);
  lines.push(`## ${title}`, '');
  if (!fs.existsSync(pa) || !fs.existsSync(pb)) { lines.push(`_${path.basename(pa)} atau ${path.basename(pb)} belum ada._`, ''); continue; }
  const d = deep(JSON.parse(fs.readFileSync(pa, 'utf8')), JSON.parse(fs.readFileSync(pb, 'utf8')));
  bad += d.length;
  lines.push(d.length ? d.map((x) => `- ${x}`).join('\n') : 'Identik.', '');
}

const report = MOD ? 'diff-report-modules.md' : 'diff-report.md';
fs.writeFileSync(path.join(RESKIN, report), lines.join('\n'));
console.log(`${bad ? `${bad} perbedaan` : 'Tidak ada perbedaan'} → reference/docs/reskin/${report}`);
process.exit(bad ? 1 : 0);
