// Model Program Setup 2027 (deck Loyalti Program 2027):
//   status publish per CHANNEL × FASE (Pendaftaran · Monitoring · Pencairan), channel Active / Passive (lihat Engine.CHANNEL_TYPES),
//   skema kelas per brand (kelas dari baseline; brand boleh mengikuti skema brand lain), aturan benefit & batas total per channel, termin pencairan, exception,
//   threshold di bawah baseline kelas terendah, dokumen wajib & template MoU, pratinjau form CBD, validasi per fase.
// Disimpan di baris programChannels (pc.phase_status, pc.setup) sehingga ikut ter-clone & terhapus bersama channel.
// Perhitungan runtime lama (Registration / Payout di engine.js) tidak memakai model ini.
(function () {
  const PHASES = [['REGISTRATION', 'Pendaftaran'], ['MONITORING', 'Monitoring'], ['PAYOUT', 'Pencairan']];
  const PHASE_LABEL = Object.fromEntries(PHASES);
  const TERM_TYPES = { SEMESTER: 'Semester', YEARLY: 'Yearly (full year)' };
  // [⚠ KONFIRMASI] porsi termin berlaku untuk apa; default target penjualan
  const TERM_BASIS = { TARGET: 'Target penjualan', REBATE: 'Nilai benefit', BOTH: 'Target penjualan & nilai benefit' };
  const M = 1e6;

  const phaseStatus = (pc, phase) => ((pc && pc.phase_status) || {})[phase] || 'DRAFT';
  const isPublished = (pc, phase) => phaseStatus(pc, phase) === 'PUBLISHED';
  const isRunning = (pc, phase) => phaseStatus(pc, phase) !== 'DRAFT';

  function emptySetup() {
    return {
      // schemes[brand].classes = [{ code, min, max (baseline / bulan, Rp), vc_pct, tiers: [{ growth_pct, semester_pct, yearly_pct }] }]; scheme_follow[brand] = kode brand acuan
      schemes: {}, scheme_follow: {},
      // aturan channel: rentang persen semester / yearly benefit yang boleh dipakai kelas, batas total (conditional + Vision Compass)
      rules: { semester_min: null, semester_max: null, yearly_min: null, yearly_max: null, total_max_pct: null },
      terms: [], term_basis: 'TARGET', cbd_can_lower_conditional: false, lowering_adds_vc: false,
      lm_as_detail_example: true,
      exception: { trigger_total: true, trigger_vc: true, approver_role: 'ABL', reason_required: true },
      threshold: { channel: { allowed: false, rebate_min: null, target_min: null }, brands: {} },
      required_docs: [], mou_template_pc: null,
    };
  }
  const setupOf = (pc) => { const s = Object.assign(emptySetup(), (pc && pc.setup) || {}); s.rules = Object.assign(emptySetup().rules, s.rules || {}); return s; };
  const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
  const round = (v, d = 4) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

  // ---------------------------------------------------------------- skema & kelas per brand (kelas ditentukan dari baseline)
  const tierTotal = (t) => round((num(t.semester_pct) || 0) + (num(t.yearly_pct) || 0)); // total conditional = semester + yearly
  // growth tiap tier diisi Admin HO di skema kelas: wajib, dan harus naik dari tier ke tier
  function growthIssues(c) {
    const out = [];
    c.tiers.forEach((t, i) => {
      const g = num(t.growth_pct);
      if (g === null) out.push(`kelas ${c.code} tier ${i + 1}: growth belum diisi`);
      else if (i && num(c.tiers[i - 1].growth_pct) !== null && g <= num(c.tiers[i - 1].growth_pct)) out.push(`kelas ${c.code} tier ${i + 1}: growth harus lebih tinggi dari tier ${i}`);
    });
    return out;
  }
  // Brand yang mengikuti brand lain memakai seluruh skema brand acuan (kelas, tier, rebate, Vision Compass, rentang baseline)
  const schemeBrand = (setup, brand) => ((setup.scheme_follow || {})[brand] && (setup.scheme_follow || {})[brand] !== brand ? setup.scheme_follow[brand] : brand);
  const schemeOf = (setup, brand) => (setup.schemes || {})[schemeBrand(setup, brand)] || { classes: [] };
  const hasSchemes = (setup) => Object.values(setup.schemes || {}).some((x) => (x.classes || []).length);
  const brandRanges = (setup, brand) => schemeOf(setup, brand).classes.map((c) => ({ code: c.code, min: num(c.min), max: num(c.max) }));
  function classOf(setup, brand, baseline) {
    const v = num(baseline);
    if (v === null) return null;
    return schemeOf(setup, brand).classes.find((c) => num(c.min) !== null && v >= num(c.min) && (num(c.max) === null || v < num(c.max))) || null;
  }

  // ---------------------------------------------------------------- pratinjau form CBD (simulasi, tidak menyimpan)
  // in: { brand, baseline, growth: [g tier1..n] (opsional; default growth tier dari skema), tier (1..n), alloc: [{ pillar, nominal }], lower_to }
  function preview(program, ch, input) {
    const setup = setupOf(ch);
    const out = { exceptions: [], tiers: [], rules: setup.rules };
    const brand = input.brand;
    const baseline = num(input.baseline);
    const cls = classOf(setup, brand, baseline);
    out.cls = cls;
    if (!cls) {
      const ranges = brandRanges(setup, brand).filter((x) => x.min !== null);
      const lowest = ranges.length ? Math.min(...ranges.map((x) => x.min)) : null;
      out.below = lowest !== null && baseline !== null && baseline < lowest;
      out.threshold = Object.assign({}, setup.threshold.channel, (setup.threshold.brands || {})[brand] || {});
      return out;
    }
    out.tiers = cls.tiers.map((t, i) => {
      const gIn = num((input.growth || [])[i]);
      const g = gIn !== null ? gIn : num(t.growth_pct); // growth tier ditetapkan di skema kelas
      const target = baseline === null || g === null ? null : baseline * 12 * (1 + g / 100); // target 2027 = baseline / bulan × 12 × (1 + growth)
      const sem = num(t.semester_pct); const yr = num(t.yearly_pct); const tot = tierTotal(t);
      return { tier: i + 1, growth: g, target, semester_pct: sem, yearly_pct: yr, total_pct: tot,
        semester_rp: target === null || sem === null ? null : target * sem / 100, yearly_rp: target === null || yr === null ? null : target * yr / 100,
        total_rp: target === null ? null : target * tot / 100 };
    });
    const sel = out.tiers[Math.max(0, Math.min(out.tiers.length - 1, (num(input.tier) || 1) - 1))];
    out.selected = sel;
    const vcPct = num(cls.vc_pct);
    out.vc_pct = vcPct;
    out.plafon = sel && sel.target !== null && vcPct !== null ? sel.target * vcPct / 100 : null; // plafon per brand = target 2027 × persen Vision Compass kelas
    // Toggle: CBD boleh menurunkan conditional rebate sampai 0%; selisihnya boleh menambah plafon Vision Compass brand
    out.lowered = null;
    const low = num(input.lower_to);
    if (sel && setup.cbd_can_lower_conditional && low !== null && sel.total_pct !== null && low < sel.total_pct) {
      const to = Math.max(0, low);
      const diffRp = sel.target === null ? null : sel.target * (sel.total_pct - to) / 100;
      out.lowered = { from: sel.total_pct, to, diff_rp: diffRp, adds_vc: !!setup.lowering_adds_vc };
      if (setup.lowering_adds_vc && out.plafon !== null && diffRp !== null) out.plafon += diffRp;
    }
    out.alloc_total = (input.alloc || []).reduce((s, a) => s + (num(a.nominal) || 0), 0);
    out.sisa = out.plafon === null ? null : out.plafon - out.alloc_total;
    out.cond_pct = sel ? (out.lowered ? round(out.lowered.to) : sel.total_pct) : null; // conditional yang dipakai (setelah penurunan, bila ada)
    out.cond_rp = sel && sel.target !== null && out.cond_pct !== null ? sel.target * out.cond_pct / 100 : null;
    out.total_pct = sel ? round((out.cond_pct || 0) + (vcPct || 0)) : null; // conditional + Vision Compass
    const ex = setup.exception; const lim = num(setup.rules.total_max_pct);
    if (lim !== null && out.total_pct !== null && out.total_pct > lim && ex.trigger_total) {
      out.exceptions.push(`Total persen ${fmtPct(out.total_pct)} (conditional ${fmtPct(out.cond_pct)} + Vision Compass ${fmtPct(vcPct)}) melebihi batas total channel ${fmtPct(lim)}`);
    }
    if (out.plafon !== null && out.alloc_total > out.plafon && ex.trigger_vc) {
      out.exceptions.push(`Alokasi Vision Compass per pilar ${fmtRp(out.alloc_total)} melebihi plafon brand ${fmtRp(out.plafon)}`);
    }
    // termin: porsi diterapkan sesuai pilihan dasar porsi [⚠ KONFIRMASI]
    out.terms = sel ? setup.terms.map((x) => {
      const p = (num(x.portion_pct) || 0) / 100;
      const benefit = x.type === 'YEARLY' ? sel.yearly_rp : sel.semester_rp;
      return { name: x.name, type: x.type, portion_pct: num(x.portion_pct),
        target: ['TARGET', 'BOTH'].includes(setup.term_basis) && sel.target !== null ? sel.target * p : null,
        rebate: ['REBATE', 'BOTH'].includes(setup.term_basis) && benefit !== null ? benefit * p : null };
    }) : [];
    return out;
  }
  const fmtPct = (v) => (v === null || v === undefined ? '-' : `${Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`);
  const fmtRp = (v) => (window.UI ? UI.h.rp(Math.round(v)) : String(v));

  // ---------------------------------------------------------------- validasi per channel × fase
  function termSums(setup) {
    const sum = (type) => setup.terms.filter((x) => x.type === type).reduce((s, x) => s + (num(x.portion_pct) || 0), 0);
    return { has: { SEMESTER: setup.terms.some((x) => x.type === 'SEMESTER'), YEARLY: setup.terms.some((x) => x.type === 'YEARLY') }, SEMESTER: round(sum('SEMESTER'), 2), YEARLY: round(sum('YEARLY'), 2) };
  }
  function termErrors(setup) {
    const s = termSums(setup);
    return ['SEMESTER', 'YEARLY'].filter((type) => s.has[type] && s[type] !== 100).map((type) => `Porsi termin ${TERM_TYPES[type].toLowerCase()} berjumlah ${s[type]}%, harus 100%.`);
  }

  function validateRegistration(ch) {
    const setup = setupOf(ch);
    const errors = []; const warnings = [];
    const brands = ch.brands.map((b) => [b.brand_code, b.brand_name]);
    const nameOf = Object.fromEntries(brands);
    if (!brands.length) errors.push('Belum ada brand peserta.');
    // skema per brand (brand yang mengikuti brand lain divalidasi lewat brand acuannya)
    for (const [code, name] of brands) {
      const ref = schemeBrand(setup, code);
      if (ref !== code) {
        if (!nameOf[ref]) errors.push(`${name}: mengikuti skema brand yang bukan peserta channel ini.`);
        else if (schemeBrand(setup, ref) !== ref) errors.push(`${name}: mengikuti ${nameOf[ref]} yang juga mengikuti brand lain.`);
        continue;
      }
      const classes = schemeOf(setup, code).classes;
      if (!classes.length) { errors.push(`${name}: belum punya kelas.`); continue; }
      for (const c of classes) if (!c.tiers.length) errors.push(`${name} kelas ${c.code}: belum punya tier.`);
      for (const c of classes) growthIssues(c).forEach((x) => errors.push(`${name} ${x}.`));
      // rentang baseline: tumpang tindih, terbalik, lebih dari satu kelas tanpa batas atas
      const r = brandRanges(setup, code);
      const filled = r.filter((x) => x.min !== null);
      for (const x of r) if (x.min === null) errors.push(`${name} kelas ${x.code}: baseline min kosong.`);
      for (const x of filled) if (x.max !== null && x.max <= x.min) errors.push(`${name} kelas ${x.code}: rentang baseline terbalik (maks ≤ min).`);
      if (filled.filter((x) => x.max === null).length > 1) errors.push(`${name}: lebih dari satu kelas tanpa batas atas.`);
      const s = filled.slice().sort((a, b) => a.min - b.min);
      for (let i = 1; i < s.length; i++) if (s[i - 1].max === null || s[i - 1].max > s[i].min) errors.push(`${name}: rentang baseline kelas ${s[i - 1].code} dan ${s[i].code} tumpang tindih.`);
      // persen semester / yearly benefit di luar rentang channel; total persen melebihi batas channel (warning → exception)
      const ru = setup.rules;
      for (const c of classes) c.tiers.forEach((t, i) => {
        const chk = (v, lo, hi, label) => { if (v !== null && ((num(lo) !== null && v < num(lo)) || (num(hi) !== null && v > num(hi)))) warnings.push(`${name} kelas ${c.code} tier ${i + 1}: ${label} ${fmtPct(v)} di luar rentang channel (${fmtPct(num(lo))}–${fmtPct(num(hi))}).`); };
        chk(num(t.semester_pct), ru.semester_min, ru.semester_max, 'semester benefit');
        chk(num(t.yearly_pct), ru.yearly_min, ru.yearly_max, 'yearly benefit');
        const tot = round(tierTotal(t) + (num(c.vc_pct) || 0));
        if (num(ru.total_max_pct) !== null && tot > num(ru.total_max_pct)) warnings.push(`${name} kelas ${c.code} tier ${i + 1}: total ${fmtPct(tot)} (conditional + Vision Compass) melebihi batas total channel ${fmtPct(ru.total_max_pct)}; akan menjadi exception.`);
      });
    }
    // bawaan sebelumnya yang tetap relevan untuk fase Pendaftaran
    validateLayers(ch, 'REGISTRATION').forEach((x) => errors.push(x));
    const regFields = ch.phases.REGISTRATION.fields;
    if (!regFields.some((f) => f.field_key === 'baseline' && f.is_visible)) errors.push('Form Pendaftaran belum punya field baseline.');
    if (!regFields.some((f) => f.field_key === 'growth' && f.is_visible)) errors.push('Form Pendaftaran belum punya field growth.');
    if (ch.pillars.length) for (const b of ch.brands) {
      const own = schemeOf(setup, b.brand_code).classes;
      const codes = hasSchemes(setup) ? own.map((c) => c.code) : b.classes.map((c) => c.code);
      const missing = codes.filter((c) => !(b.lm_targets || {})[c]);
      if (missing.length) warnings.push(`${b.brand_name}: target lead measure kelas ${missing.join(', ')} belum diatur.`);
    }
    for (const docType of Object.keys(window.Catalog.DOC_TYPES)) {
      const d = ch.documents[docType];
      if (!d.latest || !(d.latest.content.sections || []).length) errors.push(`Template ${docType} kosong.`);
      else { const bad = window.Engine.unknownPlaceholders(d.latest.content); if (bad.length) errors.push(`Template ${docType} memakai placeholder tidak dikenal: ${bad.join(', ')}`); }
    }
    return { errors, warnings };
  }
  function validateLayers(ch, phase) {
    const errors = [];
    const label = PHASE_LABEL[phase];
    const layers = ch.phases[phase].layers;
    if (!layers.length) errors.push(`Fase ${label} belum punya approval layer.`);
    if (phase === 'PAYOUT' && layers.length && !layers[layers.length - 1].is_final) errors.push('Fase Pencairan harus diakhiri layer final approval.');
    if (layers.some((l, i) => l.is_final && i < layers.length - 1)) errors.push(`Fase ${label}: layer final harus layer terakhir.`);
    const C = window.Catalog;
    for (const l of layers) {
      if (!C.APPROVAL_ROLES[l.role_code]) errors.push(`Fase ${label} layer ${l.layer_order}: role tidak dikenal.`);
      if ((l.conditions || []).some((c) => !C.AUTO_APPROVE_OBJECTS[c.object_code] || !C.OPERATORS[c.operator] || c.value === null || c.value === '' || !Number.isFinite(Number(c.value)))) {
        errors.push(`Fase ${label} layer ${l.layer_order}: kondisi auto-approve tidak lengkap / tidak dikenal.`);
      }
    }
    return errors;
  }
  function validatePhase(program, ch, phase) {
    if (phase === 'REGISTRATION') return validateRegistration(ch);
    const errors = validateLayers(ch, phase);
    if (phase === 'PAYOUT') {
      termErrors(setupOf(ch)).forEach((x) => errors.push(x));
      const sample = window.Catalog.sampleVars();
      for (const s of window.Catalog.FORMULA_SLOTS) {
        const f = window.Engine.formulaFor(ch, s.code, null);
        if (!f || !String(f.expression || '').trim()) errors.push(`Slot rumus "${s.code}" kosong.`);
        else { const r = window.Formula.check(f.expression, sample); if (!r.isValid) errors.push(`Rumus "${s.code}" tidak valid: ${r.errors.join(', ')}`); }
      }
    }
    return { errors, warnings: [] };
  }

  // Ringkasan status program dari matriks channel × fase (tanpa status level program)
  function programSummary(programId) {
    const pcs = DB.where('programChannels', (c) => c.program_id === programId);
    const count = { DRAFT: 0, PUBLISHED: 0, CLOSED: 0 };
    for (const pc of pcs) for (const [ph] of PHASES) count[phaseStatus(pc, ph)]++;
    return { count, total: pcs.length * PHASES.length, anyRunning: count.PUBLISHED + count.CLOSED > 0 };
  }
  const programHas = (programId, phase, test) => DB.where('programChannels', (c) => c.program_id === programId).some((pc) => test(pc, phase));
  // "4 Published · 2 Draft" (urutan tetap, status yang nol tidak ditampilkan)
  function summaryLabel(programId) {
    const { count, total } = programSummary(programId);
    if (!total) return 'Belum ada channel';
    return [['PUBLISHED', 'Published'], ['DRAFT', 'Draft'], ['CLOSED', 'Closed']].filter(([k]) => count[k]).map(([k, l]) => `${count[k]} ${l}`).join(' · ');
  }

  // ---------------------------------------------------------------- data contoh deck Loyalti Program 2027 (channel CS Passive & Active)
  // Aturan Passive = role Full Experience di deck, Active = role Hub
  const DEMO_RULES = {
    PASSIVE: { semester_min: 0.5, semester_max: 1, yearly_min: 0.5, yearly_max: 1.5, total_max_pct: 5.25 },
    ACTIVE: { semester_min: 0.5, semester_max: 1, yearly_min: 0.5, yearly_max: 2.5, total_max_pct: 4.25 },
  };
  function demoSetup(type) {
    const s = emptySetup();
    s.rules = Object.assign({}, DEMO_RULES[type]);
    // skema per brand: persen rebate deck sama untuk semua brand (semester berlaku S1 & S2, yearly 1,00 / 1,25 / 1,50%),
    // rentang baseline / bulan (Rp juta) per brand; kelas D tanpa batas atas
    const REBATE = [['A', 0.5, 1.5], ['B', 0.75, 1.5], ['C', 1, 2], ['D', 1.25, 2.5]];
    // growth tier 1 per brand (deck hal. 2–8); tier 2 & 3 = +5% & +10%
    const GROWTH = type === 'ACTIVE' ? { WRD: 20, LIGHT: 30, KHF: 40, EMN: 10, OMG: 40, MO: 15, LAB: 95 } : { WRD: 35, LIGHT: 25, KHF: 45, EMN: 20, OMG: 25, MO: 35, LAB: 95 };
    const BASE = { WRD: [50, 150, 400, 800], LIGHT: [50, 80, 120, 200], KHF: [50, 80, 125, 330], EMN: [50, 80, 120, 210], OMG: [50, 85, 170, 320], MO: [50, 75, 135, 270], LAB: [50, 70, 90, 100] };
    for (const [b, xs] of Object.entries(BASE)) {
      s.schemes[b] = { classes: REBATE.map(([code, sem, vc], i) => ({ code, min: xs[i] * M, max: i < 3 ? xs[i + 1] * M : null, vc_pct: vc,
        tiers: [1, 1.25, 1.5].map((yr, ti) => ({ growth_pct: GROWTH[b] + ti * 5, semester_pct: sem, yearly_pct: yr })) })) };
    }
    s.terms = [
      { id: 't1', name: 'S1', type: 'SEMESTER', start: '2027-01-01', end: '2027-06-30', portion_pct: 30, schedule: '' },
      { id: 't2', name: 'S2', type: 'SEMESTER', start: '2027-07-01', end: '2027-12-31', portion_pct: 70, schedule: '' },
      { id: 't3', name: 'Yearly', type: 'YEARLY', start: '2027-01-01', end: '2027-12-31', portion_pct: 100, schedule: '' },
    ];
    return s;
  }

  // Dipanggil di akhir Seed.build(): status fase + data contoh deck. Channel CS 2027 dipecah jadi Passive (baris lama) & Active (salinan).
  function seedDemo() {
    const brands = DB.t('brands');
    if (!brands.some((b) => b.code === 'BRIGHT')) DB.insert('brands', { code: 'BRIGHT', name: 'BrightNow', sort: brands.length + 1, is_active: true });
    const pcs = DB.t('programChannels').slice();
    for (const pc of pcs) {
      const p = DB.byId('programs', pc.program_id);
      const cs27 = p.year === 2027 && pc.channel_code === 'CS';
      pc.phase_status = Object.fromEntries(PHASES.map(([ph]) => [ph, cs27 ? 'DRAFT' : 'PUBLISHED']));
      if (!cs27) continue;
      // Light+ punya skema sendiri dengan BrightNow sebagai brand anggota
      for (const b of DB.where('programChannelBrands', (x) => x.program_channel_id === pc.id)) b.member_codes = (b.member_codes || []).filter((m) => m !== 'LIGHT');
      if (!DB.t('programChannelBrands').some((x) => x.program_channel_id === pc.id && x.brand_code === 'LIGHT')) {
        const n = DB.where('programChannelBrands', (x) => x.program_channel_id === pc.id).length;
        DB.insert('programChannelBrands', { program_channel_id: pc.id, brand_code: 'LIGHT', member_codes: ['BRIGHT'], est_growth_pct: null, ir_growth_pct: null, sort_order: n + 1 });
      }
      pc.channel_type = 'PASSIVE';
      pc.setup = demoSetup('PASSIVE');
      const admin = DB.t('users').find((u) => u.role === 'ADMIN_HO');
      window.Engine.cloneChannel(pc, pc.program_id, admin ? admin.id : null, { channel_type: 'ACTIVE', setup: demoSetup('ACTIVE'), elig_exceptions: [] });
    }
  }

  window.SetupModel = {
    PHASES, PHASE_LABEL, TERM_TYPES, TERM_BASIS,
    phaseStatus, isPublished, isRunning, emptySetup, setupOf, tierTotal, growthIssues, brandRanges, classOf, schemeBrand, schemeOf, hasSchemes,
    preview, termSums, termErrors, validatePhase, programSummary, programHas, summaryLabel, demoSetup, seedDemo, fmtPct,
  };
})();
