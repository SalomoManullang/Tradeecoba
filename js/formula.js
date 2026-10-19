(function () {
// Evaluator rumus aman (tanpa eval / new Function) untuk slot rumus Program Setup (PRD FR5).
// Hanya variabel katalog + fungsi whitelist: MIN, MAX, AVG, SUM, ROUND, IF.
// Operator: + - * / , perbandingan (> >= < <= == !=), && || !, a ? b : c.
// Variabel array (mis. pillar_compliance, monthly_sell_in) dihitung per elemen dan
// hanya bisa dijadikan satu angka lewat fungsi agregat (SUM, AVG, MIN, MAX).

const MAX_LENGTH = 500;
const MAX_DEPTH = 20;

const flat = (args) => args.flatMap((a) => (Array.isArray(a) ? a : [a]));
const FUNCS = {
  MIN: (...a) => Math.min(...flat(a)),
  MAX: (...a) => Math.max(...flat(a)),
  SUM: (...a) => flat(a).reduce((s, x) => s + x, 0),
  AVG: (...a) => { const f = flat(a); return f.length ? f.reduce((s, x) => s + x, 0) / f.length : 0; },
  ROUND: (x, d = 0) => { const f = Math.pow(10, d); return Math.round(x * f) / f; },
  IF: (c, a, b) => (c ? a : b),
};
const FUNCTION_NAMES = Object.keys(FUNCS);

class FormulaError extends Error {}

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9._]/.test(src[j])) j++;
      const num = Number(src.slice(i, j).replace(/_/g, ''));
      if (Number.isNaN(num)) throw new FormulaError(`Angka tidak valid di posisi ${i + 1}`);
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      tokens.push({ t: 'id', v: src.slice(i, j) });
      i = j;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) { tokens.push({ t: 'op', v: two }); i += 2; continue; }
    if ('+-*/()<>?:,!'.includes(ch)) { tokens.push({ t: 'op', v: ch }); i++; continue; }
    throw new FormulaError(`Karakter tidak dikenal "${ch}" di posisi ${i + 1}`);
  }
  return tokens;
}

function parse(src) {
  src = String(src || '').trim();
  if (!src) throw new FormulaError('Rumus kosong');
  if (src.length > MAX_LENGTH) throw new FormulaError(`Rumus terlalu panjang (maks ${MAX_LENGTH} karakter)`);
  const tokens = tokenize(src);
  let pos = 0;
  let depth = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const expect = (v) => { if (!isOp(v)) throw new FormulaError(`Diharapkan "${v}"`); pos++; };
  const nest = (fn) => { if (++depth > MAX_DEPTH) throw new FormulaError('Rumus terlalu dalam (kurung bertingkat)'); const r = fn(); depth--; return r; };

  function ternary() {
    const cond = or();
    if (isOp('?')) { pos++; const a = ternary(); expect(':'); const b = ternary(); return { k: 'tern', cond, a, b }; }
    return cond;
  }
  function or() { let l = and(); while (isOp('||')) { pos++; l = { k: 'bin', op: '||', left: l, right: and() }; } return l; }
  function and() { let l = cmp(); while (isOp('&&')) { pos++; l = { k: 'bin', op: '&&', left: l, right: cmp() }; } return l; }
  function cmp() {
    let l = add();
    while (peek() && peek().t === 'op' && ['>=', '<=', '>', '<', '==', '!='].includes(peek().v)) { const op = tokens[pos++].v; l = { k: 'bin', op, left: l, right: add() }; }
    return l;
  }
  function add() { let l = mul(); while (isOp('+') || isOp('-')) { const op = tokens[pos++].v; l = { k: 'bin', op, left: l, right: mul() }; } return l; }
  function mul() { let l = unary(); while (isOp('*') || isOp('/')) { const op = tokens[pos++].v; l = { k: 'bin', op, left: l, right: unary() }; } return l; }
  function unary() {
    if (isOp('-')) { pos++; return { k: 'neg', e: unary() }; }
    if (isOp('!')) { pos++; return { k: 'not', e: unary() }; }
    return primary();
  }
  function primary() {
    const tok = peek();
    if (!tok) throw new FormulaError('Rumus berakhir terlalu cepat');
    if (tok.t === 'num') { pos++; return { k: 'num', v: tok.v }; }
    if (tok.t === 'id') {
      pos++;
      if (isOp('(')) {
        pos++;
        const name = tok.v.toUpperCase();
        if (!Object.hasOwn(FUNCS, name)) throw new FormulaError(`Fungsi "${tok.v}" tidak diizinkan. Fungsi yang boleh: ${FUNCTION_NAMES.join(', ')}`);
        const args = [];
        if (!isOp(')')) { args.push(nest(ternary)); while (isOp(',')) { pos++; args.push(nest(ternary)); } }
        expect(')');
        return { k: 'call', name, args };
      }
      return { k: 'var', name: tok.v };
    }
    if (isOp('(')) { pos++; const e = nest(ternary); expect(')'); return e; }
    throw new FormulaError(`Token tidak terduga "${tok.v}"`);
  }

  const ast = ternary();
  if (pos < tokens.length) throw new FormulaError(`Token tidak terduga "${tokens[pos].v}"`);
  return ast;
}

// Operasi per elemen: angka ⊕ array atau array ⊕ array (panjang sama)
function lift(l, r, fn) {
  const la = Array.isArray(l); const ra = Array.isArray(r);
  if (!la && !ra) return fn(l, r);
  if (la && ra && l.length !== r.length) throw new FormulaError('Panjang dua variabel array berbeda');
  const n = la ? l.length : r.length;
  return Array.from({ length: n }, (_, i) => fn(la ? l[i] : l, ra ? r[i] : r));
}

function evalAst(node, vars, used) {
  switch (node.k) {
    case 'num': return node.v;
    case 'var': {
      if (!Object.hasOwn(vars, node.name)) throw new FormulaError(`Variabel "${node.name}" tidak ada di katalog`);
      if (used) used.add(node.name);
      const v = vars[node.name];
      if (v === null || v === undefined) throw new FormulaError(`Data "${node.name}" belum tersedia`);
      return Array.isArray(v) ? v.map(Number) : Number(v);
    }
    case 'neg': return lift(evalAst(node.e, vars, used), 0, (a) => -a);
    case 'not': return lift(evalAst(node.e, vars, used), 0, (a) => (a ? 0 : 1));
    case 'tern': {
      const c = evalAst(node.cond, vars, used);
      if (Array.isArray(c)) throw new FormulaError('Kondisi tidak boleh berupa array');
      return c ? evalAst(node.a, vars, used) : evalAst(node.b, vars, used);
    }
    case 'call': {
      const args = node.args.map((a) => evalAst(a, vars, used));
      if (['ROUND', 'IF'].includes(node.name) && Array.isArray(args[0])) throw new FormulaError(`${node.name} tidak menerima array, pakai SUM/AVG dulu`);
      return FUNCS[node.name](...args);
    }
    case 'bin': {
      const l = evalAst(node.left, vars, used);
      const r = evalAst(node.right, vars, used);
      return lift(l, r, (a, b) => {
        switch (node.op) {
          case '+': return a + b;
          case '-': return a - b;
          case '*': return a * b;
          case '/': if (b === 0) throw new FormulaError('Pembagian dengan nol'); return a / b;
          case '>': return a > b ? 1 : 0;
          case '<': return a < b ? 1 : 0;
          case '>=': return a >= b ? 1 : 0;
          case '<=': return a <= b ? 1 : 0;
          case '==': return a === b ? 1 : 0;
          case '!=': return a !== b ? 1 : 0;
          case '&&': return a && b ? 1 : 0;
          case '||': return a || b ? 1 : 0;
        }
        throw new FormulaError('Operator tidak dikenal');
      });
    }
  }
  throw new FormulaError('Rumus tidak valid');
}

// Hasil harus satu angka. Error dilempar (bukan diam-diam jadi 0, PRD §6.1).
function evaluate(expression, vars) {
  const result = evalAst(parse(expression), vars);
  if (Array.isArray(result)) throw new FormulaError('Hasil rumus masih array. Bungkus dengan SUM / AVG / MIN / MAX');
  if (!Number.isFinite(result)) throw new FormulaError('Hasil rumus bukan angka');
  return result;
}

// Cek sintaks & variabel tanpa menyimpan: { isValid, errors, variablesUsed }
// sample: { nama: contoh nilai } (array untuk variabel array)
function check(expression, sample) {
  const used = new Set();
  try {
    const r = evalAst(parse(expression), sample, used);
    if (Array.isArray(r)) throw new FormulaError('Hasil rumus masih array. Bungkus dengan SUM / AVG / MIN / MAX');
    return { isValid: true, errors: [], variablesUsed: [...used] };
  } catch (err) {
    // Pembagian nol pada data contoh bukan kesalahan sintaks
    if (err.message === 'Pembagian dengan nol') return { isValid: true, errors: [], variablesUsed: [...used] };
    return { isValid: false, errors: [err.message], variablesUsed: [...used] };
  }
}

window.Formula = { evaluate, check, FUNCTION_NAMES, FormulaError };
})();
