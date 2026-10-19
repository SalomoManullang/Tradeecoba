(function () {
// Evaluator rumus sederhana & aman (tanpa eval) untuk komponen pencairan tipe "formula".
// Mendukung: angka, variabel, + - * / %, perbandingan, && || !, a ? b : c,
// fungsi min, max, round(x, digit), floor, ceil, abs, if(kondisi, a, b).

const FUNCS = {
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  round: (x, d = 0) => {
    const f = Math.pow(10, d);
    return Math.round(x * f) / f;
  },
  floor: (x) => Math.floor(x),
  ceil: (x) => Math.ceil(x),
  abs: (x) => Math.abs(x),
  if: (c, a, b) => (c ? a : b),
};

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
      if (Number.isNaN(num)) throw new Error(`Angka tidak valid di posisi ${i + 1}`);
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
    if (['>=', '<=', '==', '!=', '&&', '||'].includes(two)) {
      tokens.push({ t: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/%()<>?:,!'.includes(ch)) {
      tokens.push({ t: 'op', v: ch });
      i++;
      continue;
    }
    throw new Error(`Karakter tidak dikenal "${ch}" di posisi ${i + 1}`);
  }
  return tokens;
}

function parse(src) {
  const tokens = tokenize(String(src || ''));
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = (v) => peek() && peek().t === 'op' && peek().v === v;
  const expect = (v) => {
    if (!isOp(v)) throw new Error(`Diharapkan "${v}"`);
    pos++;
  };

  function ternary() {
    const cond = or();
    if (isOp('?')) {
      pos++;
      const a = ternary();
      expect(':');
      const b = ternary();
      return { k: 'tern', cond, a, b };
    }
    return cond;
  }
  function or() {
    let left = and();
    while (isOp('||')) { pos++; left = { k: 'bin', op: '||', left, right: and() }; }
    return left;
  }
  function and() {
    let left = cmp();
    while (isOp('&&')) { pos++; left = { k: 'bin', op: '&&', left, right: cmp() }; }
    return left;
  }
  function cmp() {
    let left = add();
    while (peek() && peek().t === 'op' && ['>=', '<=', '>', '<', '==', '!='].includes(peek().v)) {
      const op = tokens[pos++].v;
      left = { k: 'bin', op, left, right: add() };
    }
    return left;
  }
  function add() {
    let left = mul();
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].v;
      left = { k: 'bin', op, left, right: mul() };
    }
    return left;
  }
  function mul() {
    let left = unary();
    while (isOp('*') || isOp('/') || isOp('%')) {
      const op = tokens[pos++].v;
      left = { k: 'bin', op, left, right: unary() };
    }
    return left;
  }
  function unary() {
    if (isOp('-')) { pos++; return { k: 'neg', e: unary() }; }
    if (isOp('!')) { pos++; return { k: 'not', e: unary() }; }
    return primary();
  }
  function primary() {
    const tok = peek();
    if (!tok) throw new Error('Rumus berakhir terlalu cepat');
    if (tok.t === 'num') { pos++; return { k: 'num', v: tok.v }; }
    if (tok.t === 'id') {
      pos++;
      if (isOp('(')) {
        pos++;
        const name = tok.v.toLowerCase();
        if (!Object.hasOwn(FUNCS, name)) throw new Error(`Fungsi "${tok.v}" tidak dikenal`);
        const args = [];
        if (!isOp(')')) {
          args.push(ternary());
          while (isOp(',')) { pos++; args.push(ternary()); }
        }
        expect(')');
        return { k: 'call', name, args };
      }
      return { k: 'var', name: tok.v };
    }
    if (isOp('(')) {
      pos++;
      const e = ternary();
      expect(')');
      return e;
    }
    throw new Error(`Token tidak terduga "${tok.v}"`);
  }

  const ast = ternary();
  if (pos < tokens.length) throw new Error(`Token tidak terduga "${tokens[pos].v}"`);
  return ast;
}

function evalAst(node, vars) {
  switch (node.k) {
    case 'num': return node.v;
    case 'var': {
      if (!Object.hasOwn(vars, node.name)) throw new Error(`Variabel "${node.name}" tidak dikenal`);
      const v = Number(vars[node.name]);
      return Number.isFinite(v) ? v : 0;
    }
    case 'neg': return -evalAst(node.e, vars);
    case 'not': return evalAst(node.e, vars) ? 0 : 1;
    case 'tern': return evalAst(node.cond, vars) ? evalAst(node.a, vars) : evalAst(node.b, vars);
    case 'call': return FUNCS[node.name](...node.args.map((a) => evalAst(a, vars)));
    case 'bin': {
      const l = evalAst(node.left, vars);
      const r = evalAst(node.right, vars);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return r === 0 ? 0 : l / r;
        case '%': return r === 0 ? 0 : l % r;
        case '>': return l > r ? 1 : 0;
        case '<': return l < r ? 1 : 0;
        case '>=': return l >= r ? 1 : 0;
        case '<=': return l <= r ? 1 : 0;
        case '==': return l === r ? 1 : 0;
        case '!=': return l !== r ? 1 : 0;
        case '&&': return l && r ? 1 : 0;
        case '||': return l || r ? 1 : 0;
      }
    }
  }
  throw new Error('Rumus tidak valid');
}

function evaluate(expression, vars) {
  const result = evalAst(parse(expression), vars);
  return Number.isFinite(result) ? result : 0;
}

// Mengembalikan pesan error (string) atau null bila rumus valid untuk daftar variabel tsb.
function validate(expression, varNames) {
  try {
    const vars = Object.fromEntries(varNames.map((n) => [n, 1]));
    evalAst(parse(expression), vars);
    return null;
  } catch (err) {
    return err.message;
  }
}

window.Formula = { evaluate, validate };
})();
