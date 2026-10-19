// Logika bisnis prototype, mengikuti arsitektur v0.5:
//  - programConfig   : satu-satunya jalur baca konfigurasi program (loadProgram, formulaFor, ...)
//  - programCalculation : kelas & tier per brand, rumus per slot, dua jalur payout, auto-approve
//  - programValidation  : aturan FR11 sebelum publish
//  - alur approval per fase (Registration / Monitoring / Payout) + audit log
// Tidak ada angka skema yang di-hardcode: semuanya dibaca dari tabel program*.
(function () {
  const DB = window.DB;
  const C = window.Catalog;
  const bySort = (a, b) => (a.sort_order || 0) - (b.sort_order || 0) || a.id - b.id;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const nowIso = () => new Date().toISOString();

  // ---------------------------------------------------------------- tanggal & periode
  function monthsBetween(start, end) {
    const out = [];
    let [y, m] = String(start).slice(0, 7).split('-').map(Number);
    const [ey, em] = String(end).slice(0, 7).split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      out.push(`${y}-${String(m).padStart(2, '0')}-01`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  }
  function today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  const lastDay = (ym) => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; };

  // Periode monitoring / payout diturunkan dari periode program + frekuensi
  function periodsOf(start, end, frequency) {
    const months = monthsBetween(start, end);
    const size = { MONTHLY: 1, QUARTERLY: 3, SEMESTER: 6 }[frequency] || 3;
    const prefix = { MONTHLY: 'M', QUARTERLY: 'Q', SEMESTER: 'S' }[frequency] || 'Q';
    const out = [];
    for (let i = 0; i < months.length; i += size) {
      const ms = months.slice(i, i + size);
      const n = i / size + 1;
      const y = ms[0].slice(0, 4);
      out.push({ key: `${prefix}${n}-${y}`, label: frequency === 'MONTHLY' ? `${window.UI ? UI.h.month(ms[0]) : ms[0]}` : `${prefix}${n} ${y}`,
        start: ms[0], end: lastDay(ms[ms.length - 1].slice(0, 7)), months: ms });
    }
    return out;
  }

  // ---------------------------------------------------------------- penjualan
  // sales[customer_id][YYYY-MM-01][brand] = [sell_out, sell_in]
  function brandSales(cid, brandCodes, months) {
    const byMonth = (DB.state.sales || {})[cid] || {};
    return months.map((m) => {
      let so = 0; let si = 0;
      for (const b of brandCodes) { const v = (byMonth[m] || {})[b]; if (v) { so += v[0]; si += v[1]; } }
      return { m, sellout: so, sellin: si };
    });
  }

  // ---------------------------------------------------------------- programConfig (read service)
  function loadProgram(programId) {
    const p = DB.byId('programs', programId);
    if (!p) return null;
    const program = clone(p);
    program.type = DB.byId('programTypes', p.program_type_id);
    program.programMonths = monthsBetween(p.period_start, p.period_end).length;
    program.channels = DB.where('programChannels', (x) => x.program_id === p.id).map((pc) => loadChannel(pc))
      .sort((a, b) => a.channel_sort - b.channel_sort);
    return program;
  }

  function loadChannel(pcRow) {
    const ch = clone(pcRow);
    const master = DB.t('channels').find((c) => c.code === ch.channel_code) || {};
    ch.channel_name = master.name || ch.channel_code;
    ch.channel_sort = master.sort || 0;
    ch.brands = DB.where('programChannelBrands', (b) => b.program_channel_id === ch.id).sort(bySort).map((b) => {
      const brand = clone(b);
      brand.brand_name = (DB.t('brands').find((x) => x.code === b.brand_code) || {}).name || b.brand_code;
      brand.member_names = (b.member_codes || []).map((c) => (DB.t('brands').find((x) => x.code === c) || {}).name || c);
      brand.classes = DB.where('programClasses', (c) => c.program_channel_brand_id === b.id).sort(bySort).map((c) => {
        const cl = clone(c);
        cl.tiers = (cl.tiers || []).slice().sort((a, b2) => a.target_growth_pct - b2.target_growth_pct);
        return cl;
      });
      return brand;
    });
    ch.pillars = DB.where('programPillars', (x) => x.program_channel_id === ch.id).sort(bySort).map((pl) => {
      const pil = clone(pl);
      pil.jtbds = DB.where('programJtbds', (j) => j.program_pillar_id === pl.id).sort(bySort).map((j) => {
        const jt = clone(j);
        jt.lead_measures = DB.where('programLeadMeasures', (l) => l.program_jtbd_id === j.id).sort(bySort)
          .map((l) => Object.assign(clone(l), { jtbd_name: j.name, pillar_id: pl.id, pillar_name: pl.name }));
        return jt;
      });
      return pil;
    });
    ch.leadMeasures = ch.pillars.flatMap((pl) => pl.jtbds.flatMap((j) => j.lead_measures));
    ch.formulas = DB.where('programFormulas', (f) => f.program_channel_id === ch.id).map(clone);
    ch.phases = {};
    for (const ph of C.PHASES) {
      ch.phases[ph.code] = {
        fields: DB.where('programPhaseFields', (f) => f.program_channel_id === ch.id && f.phase === ph.code).sort(bySort).map(clone),
        layers: DB.where('programApprovalLayers', (l) => l.program_channel_id === ch.id && l.phase === ph.code).sort((a, b) => a.layer_order - b.layer_order).map(clone),
      };
    }
    ch.payoutSchedule = {};
    for (const s of DB.where('programPayoutSchedules', (x) => x.program_channel_id === ch.id)) ch.payoutSchedule[s.component] = s.frequency;
    ch.documents = {};
    for (const docType of Object.keys(C.DOC_TYPES)) {
      const t = DB.t('programDocumentTemplates').find((x) => x.program_channel_id === ch.id && x.doc_type === docType);
      const revisions = t ? DB.where('programDocumentTemplateRevisions', (r) => r.program_document_template_id === t.id).sort((a, b) => a.revision - b.revision) : [];
      ch.documents[docType] = { template: t, revisions, latest: revisions[revisions.length - 1] || null };
    }
    return ch;
  }

  // Rumus per slot: override brand > rumus channel
  function formulaFor(ch, slot, brandCode) {
    return ch.formulas.find((f) => f.slot === slot && f.brand_code === brandCode) || ch.formulas.find((f) => f.slot === slot && !f.brand_code) || null;
  }

  const brandOf = (ch, code) => ch.brands.find((b) => b.brand_code === code) || null;

  // ---------------------------------------------------------------- programCalculation
  // Kelas: min inklusif, max eksklusif (asumsi A3); max kosong = tak terbatas
  function resolveClass(brand, baseline) {
    if (!brand || !Number.isFinite(baseline)) return null;
    return brand.classes.find((c) => baseline >= c.baseline_min && (c.baseline_max === null || c.baseline_max === undefined || baseline < c.baseline_max)) || null;
  }
  // Tier tercapai = tier tertinggi yang target growth-nya terpenuhi (tanpa aturan tier)
  function resolveTier(cls, growthPct) {
    if (!cls || !Number.isFinite(growthPct)) return null;
    let reached = null;
    for (const t of cls.tiers) if (growthPct >= t.target_growth_pct) reached = t;
    return reached;
  }

  function runSlot(ch, slot, brandCode, vars, trace) {
    const f = formulaFor(ch, slot, brandCode);
    if (!f || !String(f.expression || '').trim()) throw new Error(`Slot rumus "${slot}" belum diisi`);
    try {
      const value = window.Formula.evaluate(f.expression, vars);
      if (trace) trace.push({ slot, expression: f.expression, value, override: !!f.brand_code });
      return value;
    } catch (err) {
      throw new Error(`Rumus "${slot}" (${f.expression}): ${err.message}`);
    }
  }

  // Komitmen saat Registration: kelas dari baseline, tier dari growth komitmen, target & rebate %
  function commitment(ch, brandCode, baseline, growthPct, months) {
    const brand = brandOf(ch, brandCode);
    const out = { brand_code: brandCode, baseline, growth_pct: growthPct, trace: [], error: null, reason: null };
    if (!brand) { out.reason = 'Brand tidak ada di channel ini'; return out; }
    const cls = resolveClass(brand, baseline);
    if (!cls) {
      const low = brand.classes[0];
      out.reason = low ? `Baseline di bawah kelas terendah (${brand.brand_name} kelas ${low.code} mulai ${fmtRp(low.baseline_min)})` : 'Brand belum punya kelas';
      return out;
    }
    const tier = resolveTier(cls, growthPct);
    Object.assign(out, {
      class_id: cls.id, class_code: cls.code, fix_max_pct: cls.fix_rebate_max_pct,
      tier_no: tier ? tier.tier_no : null, tier_growth_pct: tier ? tier.target_growth_pct : null,
      conditional_pct: tier ? tier.conditional_rebate_pct : 0, total_pct: tier ? tier.total_rebate_pct : cls.fix_rebate_max_pct,
    });
    out.trace.push({ step: 'class', text: `Baseline ${fmtRp(baseline)} → kelas ${cls.code} (${fmtRp(cls.baseline_min)} – ${cls.baseline_max === null ? '∞' : fmtRp(cls.baseline_max)})` });
    out.trace.push({ step: 'tier', text: tier ? `Growth ${growthPct}% → tier ${tier.target_growth_pct}% (total ${tier.total_rebate_pct}% = fix ${cls.fix_rebate_max_pct}% + conditional ${tier.conditional_rebate_pct}%)`
      : `Growth ${growthPct}% di bawah tier terendah ${cls.tiers[0] ? cls.tiers[0].target_growth_pct + '%' : '-'}: conditional 0` });
    try {
      out.target_monthly = runSlot(ch, 'target', brandCode, { baseline, growth: growthPct / 100, months }, out.trace);
      out.target_total = out.target_monthly * months;
    } catch (err) { out.error = err.message; }
    return out;
  }

  // Kepatuhan pilar dari evidence Monitoring yang sudah approved di dalam rentang [start, end]
  function pillarCompliance(ch, registrationId, start, end) {
    const mons = DB.where('monitorings', (m) => m.registration_id === registrationId && m.status === 'approved' && m.end >= start && m.end <= end);
    return ch.pillars.map((pl) => {
      const lms = pl.jtbds.flatMap((j) => j.lead_measures);
      if (!lms.length || !mons.length) return 0;
      const useW = lms.some((l) => Number(l.weight_pct) > 0);
      const wsum = useW ? lms.reduce((s, l) => s + (Number(l.weight_pct) || 0), 0) : lms.length;
      const perMon = mons.map((m) => lms.reduce((s, l) => s + ((m.evidence || {})[l.id] ? (useW ? Number(l.weight_pct) || 0 : 1) : 0), 0) / wsum);
      return perMon.reduce((s, x) => s + x, 0) / perMon.length;
    });
  }
  function pillarWeights(ch) {
    const ws = ch.pillars.map((pl) => Number(pl.weight_pct) || 0);
    const sum = ws.reduce((s, x) => s + x, 0);
    return sum > 0 ? ws.map((w) => w / 100) : ch.pillars.map(() => (ch.pillars.length ? 1 / ch.pillars.length : 0));
  }

  // Hitungan satu brand untuk satu periode payout (dua jalur, PRD FR14)
  // input: { baseline, growth_pct, class_id, monthly: [{sellout, sellin}], compliance: [..] }
  function periodCalc(ch, brandCode, input) {
    const brand = brandOf(ch, brandCode);
    const cls = brand && brand.classes.find((c) => c.id === input.class_id) || resolveClass(brand, input.baseline);
    const trace = [];
    const months = input.monthly.length;
    const vars = {
      baseline: input.baseline, growth: input.growth_pct / 100, months,
      monthly_sell_in: input.monthly.map((x) => x.sellin), monthly_sell_out: input.monthly.map((x) => x.sellout),
      period_net_sell_in: input.monthly.reduce((s, x) => s + x.sellin, 0), period_sell_out: input.monthly.reduce((s, x) => s + x.sellout, 0),
      period_baseline: input.baseline * months, fix_max_pct: cls ? cls.fix_rebate_max_pct / 100 : 0,
      pillar_compliance: input.compliance, pillar_weight: pillarWeights(ch),
    };
    vars.period_actual = vars.period_net_sell_in;
    const out = { brand_code: brandCode, class_code: cls ? cls.code : null, trace, error: null };
    try {
      vars.target = runSlot(ch, 'target', brandCode, vars, trace);
      vars.achievement = runSlot(ch, 'achievement', brandCode, vars, trace);
      const achPct = vars.achievement * 100;
      const tier = resolveTier(cls, achPct);
      vars.reached_tier_conditional_pct = tier ? tier.conditional_rebate_pct / 100 : 0;
      vars.reached_tier_total_pct = tier ? tier.total_rebate_pct / 100 : 0;
      trace.push({ step: 'tier', text: tier ? `Achievement ${achPct.toFixed(1)}% → tier ${tier.target_growth_pct}% (conditional ${tier.conditional_rebate_pct}%)` : `Achievement ${achPct.toFixed(1)}% di bawah tier 1 → conditional 0` });
      vars.rebate_base_conditional = runSlot(ch, 'rebate_base_conditional', brandCode, vars, trace);
      vars.rebate_base_fix = runSlot(ch, 'rebate_base_fix', brandCode, vars, trace);
      vars.pillar_score = ch.pillars.length ? runSlot(ch, 'pillar_score', brandCode, vars, trace) : 0;
      vars.conditional_rebate = tier ? runSlot(ch, 'conditional_rebate', brandCode, vars, trace) : 0;
      vars.fix_rebate = runSlot(ch, 'fix_rebate', brandCode, vars, trace);
      Object.assign(out, {
        achievement_pct: achPct, tier_growth_pct: tier ? tier.target_growth_pct : null, conditional_pct: tier ? tier.conditional_rebate_pct : 0,
        fix_max_pct: cls ? cls.fix_rebate_max_pct : 0, pillar_score: vars.pillar_score, net_sell_in: vars.period_net_sell_in,
        conditional_amount: Math.max(0, Math.round(vars.conditional_rebate)), fix_amount: Math.max(0, Math.round(vars.fix_rebate)),
      });
    } catch (err) { out.error = err.message; out.conditional_amount = 0; out.fix_amount = 0; }
    return out;
  }

  // Payout satu jalur (CONDITIONAL / FIX) untuk satu registrasi & satu periode payout
  function payoutCalc(ch, reg, component, period) {
    const compliance = pillarCompliance(ch, reg.id, period.start, period.end);
    const lines = reg.brands.filter((b) => b.class_id).map((b) => {
      const brand = brandOf(ch, b.brand_code);
      const monthly = brandSales(reg.customer_id, [b.brand_code, ...((brand && brand.member_codes) || [])], period.months);
      const r = periodCalc(ch, b.brand_code, { baseline: b.baseline, growth_pct: b.growth_pct, class_id: b.class_id, monthly, compliance });
      r.brand_name = brand ? brand.brand_name : b.brand_code;
      r.amount = component === 'CONDITIONAL' ? r.conditional_amount : r.fix_amount;
      return r;
    });
    return { component, compliance, lines, amount: lines.reduce((s, l) => s + l.amount, 0), errors: lines.filter((l) => l.error).map((l) => `${l.brand_name}: ${l.error}`) };
  }

  // Nilai objek auto-approve per fase (formulaVariable service)
  function registrationObjects(brands) {
    const ok = brands.filter((b) => b.class_id);
    const base = ok.reduce((s, b) => s + b.baseline, 0);
    const tgt = ok.reduce((s, b) => s + b.baseline * (1 + b.growth_pct / 100), 0);
    return {
      GROWTH_PER_BRAND: ok.map((b) => ({ brand_code: b.brand_code, value: b.growth_pct })),
      TOTAL_GROWTH: base ? (tgt / base - 1) * 100 : null,
      CONDITIONAL_REBATE_PCT: ok.map((b) => ({ brand_code: b.brand_code, value: b.conditional_pct })),
      TOTAL_REBATE_PCT: ok.map((b) => ({ brand_code: b.brand_code, value: b.total_pct })),
    };
  }
  function achievementPerBrand(ch, reg, months) {
    return reg.brands.filter((b) => b.class_id).map((b) => {
      const brand = brandOf(ch, b.brand_code);
      const si = brandSales(reg.customer_id, [b.brand_code, ...((brand && brand.member_codes) || [])], months).reduce((s, x) => s + x.sellin, 0);
      return { brand_code: b.brand_code, value: b.baseline ? (si / (b.baseline * months.length) - 1) * 100 : null };
    });
  }
  function monitoringObjects(ch, reg, evidence, period) {
    const n = ch.leadMeasures.length;
    return { EVIDENCE_COMPLETE_PCT: n ? ch.leadMeasures.filter((l) => (evidence || {})[l.id]).length / n * 100 : null, ACHIEVEMENT_PCT: achievementPerBrand(ch, reg, period.months) };
  }
  function payoutObjects(ch, reg, calc, period) {
    return { PAYOUT_AMOUNT: calc.amount, ACHIEVEMENT_PCT: achievementPerBrand(ch, reg, period.months) };
  }

  // MOU & SKN dibuat dari revisi template terbaru saat registrasi disetujui; revisi yang dipakai disimpan
  function generateDocuments(reg) {
    const program = loadProgram(reg.program_id);
    const ch = program.channels.find((c) => c.id === reg.program_channel_id);
    for (const docType of Object.keys(C.DOC_TYPES)) {
      const d = ch.documents[docType];
      if (!d.latest) continue;
      DB.insert('generatedDocuments', { registration_id: reg.id, doc_type: docType, revision_id: d.latest.id, revision: d.latest.revision, created_at: nowIso() });
    }
  }

  // ---------------------------------------------------------------- eligibility (FR9)
  function baselineMonths(program) {
    const y = Number(String(program.period_start).slice(0, 4)) - 1;
    return monthsBetween(`${y}-01-01`, `${y}-12-01`);
  }
  function minBaseline(ch, brand) {
    const v = (ch.elig_min_baseline || {})[brand.brand_code];
    if (v !== null && v !== undefined && v !== '') return Number(v);
    return brand.classes.length ? brand.classes[0].baseline_min : null;
  }
  function eligibility(program, ch, cid) {
    const months = baselineMonths(program);
    const allCodes = ch.brands.flatMap((b) => [b.brand_code, ...(b.member_codes || [])]);
    const total = brandSales(cid, allCodes, months);
    const soMonths = total.filter((x) => x.sellout > 0).length;
    const so = total.reduce((s, x) => s + x.sellout, 0); const si = total.reduce((s, x) => s + x.sellin, 0);
    const ratio = si ? so / si * 100 : null;
    const reasons = [];
    if (ch.elig_min_sell_out_months && soMonths < ch.elig_min_sell_out_months) reasons.push(`Sell out baru ${soMonths} bulan (min ${ch.elig_min_sell_out_months})`);
    if (ch.elig_ratio_min !== null && ch.elig_ratio_min !== undefined && (ratio === null || ratio < ch.elig_ratio_min)) reasons.push(`Rasio SO:SI ${ratio === null ? '-' : ratio.toFixed(1) + '%'} < ${ch.elig_ratio_min}%`);
    if (ch.elig_ratio_max !== null && ch.elig_ratio_max !== undefined && ratio !== null && ratio > ch.elig_ratio_max) reasons.push(`Rasio SO:SI ${ratio.toFixed(1)}% > ${ch.elig_ratio_max}%`);
    if (ch.elig_prior_payout_required) {
      const prev = DB.where('programs', (p) => p.year === program.year - 1).map((p) => p.id);
      const regs = DB.where('registrations', (r) => prev.includes(r.program_id) && r.customer_id === cid).map((r) => r.id);
      if (!DB.t('payouts').some((x) => regs.includes(x.registration_id) && x.status === 'paid')) reasons.push('Belum pernah menerima payout di program sebelumnya');
    }
    const brands = ch.brands.map((b) => {
      const rows = brandSales(cid, [b.brand_code, ...(b.member_codes || [])], months);
      const active = rows.filter((x) => x.sellin > 0);
      const suggested = active.length ? active.reduce((s, x) => s + x.sellin, 0) / active.length : 0;
      const min = minBaseline(ch, b);
      const cls = resolveClass(b, suggested);
      return { brand_code: b.brand_code, brand_name: b.brand_name, suggested, min, eligible: min === null ? !!cls : suggested >= min && !!cls, cls };
    });
    if (!brands.some((b) => b.eligible)) reasons.push('Tidak ada brand dengan baseline ≥ minimal');
    return { eligible: reasons.length === 0, reasons, ratio, soMonths, brands, months };
  }

  // ---------------------------------------------------------------- auto-approve (FR8)
  function compare(op, a, b) {
    switch (op) { case 'GT': return a > b; case 'GTE': return a >= b; case 'LT': return a < b; case 'LTE': return a <= b; case 'EQ': return a === b; case 'NEQ': return a !== b; }
    return false;
  }
  // objects: { OBJECT_CODE: number | [{brand_code, value}] }. Nilai kosong = kondisi tidak terpenuhi.
  function evalLayer(layer, objects) {
    const conds = layer.conditions || [];
    if (!conds.length) return { auto: false, matched: [], failed: [], note: 'Tanpa kondisi: selalu manual' };
    const matched = []; const failed = [];
    for (const c of conds) {
      const def = C.AUTO_APPROVE_OBJECTS[c.object_code];
      const v = objects ? objects[c.object_code] : undefined;
      const label = `${def ? def.label : c.object_code} ${C.OPERATORS[c.operator] || c.operator} ${c.value}`;
      let ok;
      if (Array.isArray(v)) ok = v.length > 0 && v.every((x) => Number.isFinite(x.value) && compare(c.operator, x.value, Number(c.value)));
      else ok = Number.isFinite(v) && compare(c.operator, v, Number(c.value));
      (ok ? matched : failed).push(label + (Array.isArray(v) ? ` (${v.map((x) => `${x.brand_code} ${Number.isFinite(x.value) ? x.value.toFixed(1) : '-'}`).join(', ')})`
        : Number.isFinite(v) ? ` (nilai ${v.toFixed(1)})` : ' (nilai belum ada)'));
    }
    return { auto: failed.length === 0, matched, failed }; // semua kondisi harus terpenuhi (AND)
  }
  function evaluateApproval(layers, objects) {
    return layers.map((layer) => Object.assign({ layer }, evalLayer(layer, objects)));
  }

  // ---------------------------------------------------------------- alur approval runtime
  const FINAL = { registration: 'approved', monitoring: 'approved', payout: 'paid' };
  const TABLE = { registration: 'registrations', monitoring: 'monitorings', payout: 'payouts' };
  const PHASE_OF = { registration: 'REGISTRATION', monitoring: 'MONITORING', payout: 'PAYOUT' };

  function logApproval(entity, id, layer, decision, note, actorId, matched) {
    DB.insert('approvalLogs', { entity, entity_id: id, layer_id: layer ? layer.id : null, layer_order: layer ? layer.layer_order : null,
      role_code: layer ? layer.role_code : null, decision, matched: matched || null, note: note || null, actor_id: actorId || null, created_at: nowIso() });
  }
  function channelOfRecord(entity, rec) {
    const reg = entity === 'registration' ? rec : DB.byId('registrations', rec.registration_id);
    const program = loadProgram(reg.program_id);
    return { program, ch: program.channels.find((c) => c.id === reg.program_channel_id), reg };
  }

  // Jalan dari layer ke-idx: layer yang kondisinya terpenuhi di-auto-approve, berhenti di layer manual pertama
  function advance(entity, rec, layers, idx) {
    for (let i = idx; i < layers.length; i++) {
      const ev = evalLayer(layers[i], rec.approval_objects);
      if (ev.auto) { logApproval(entity, rec.id, layers[i], 'AUTO_APPROVED', null, null, ev.matched); continue; }
      rec.status = 'in_review'; rec.current_layer_id = layers[i].id; rec.updated_at = nowIso();
      return layers[i];
    }
    rec.status = FINAL[entity]; rec.current_layer_id = null; rec.updated_at = nowIso();
    if (entity === 'registration') generateDocuments(rec);
    return null;
  }
  function submit(entity, rec, actorId, resubmit, note) {
    const { ch } = channelOfRecord(entity, rec);
    const layers = ch.phases[PHASE_OF[entity]].layers;
    logApproval(entity, rec.id, null, resubmit ? 'RESUBMITTED' : 'SUBMITTED', note, actorId);
    return advance(entity, rec, layers, 0);
  }
  function act(entity, rec, action, user, note) {
    const { ch } = channelOfRecord(entity, rec);
    const layers = ch.phases[PHASE_OF[entity]].layers;
    const idx = layers.findIndex((l) => l.id === rec.current_layer_id);
    const layer = layers[idx];
    if (rec.status !== 'in_review' || !layer) throw new Error('Data ini tidak sedang menunggu approval.');
    if (layer.role_code !== user.role) throw new Error(`Layer ${layer.layer_order} hanya bisa diproses oleh ${C.APPROVAL_ROLES[layer.role_code]}.`);
    if (['reject', 'return'].includes(action) && !String(note || '').trim()) throw new Error('Catatan wajib diisi untuk tolak / kembalikan.');
    if (action === 'approve') { logApproval(entity, rec.id, layer, 'APPROVED', note, user.id); return { next: advance(entity, rec, layers, idx + 1) }; }
    if (action === 'reject') { logApproval(entity, rec.id, layer, 'REJECTED', note, user.id); rec.status = 'rejected'; }
    else if (action === 'return') { logApproval(entity, rec.id, layer, 'RETURNED', note, user.id); rec.status = 'returned'; }
    else throw new Error('Aksi tidak dikenal');
    rec.current_layer_id = null; rec.updated_at = nowIso();
    return { next: null };
  }
  const currentLayer = (rec) => (rec.current_layer_id ? DB.byId('programApprovalLayers', rec.current_layer_id) : null);

  // ---------------------------------------------------------------- dokumen MOU / SKN
  function fillPlaceholders(text, map) {
    return String(text || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (m, k) => (Object.hasOwn(map, k) ? map[k] : m));
  }
  function renderDocument(content, ctx) {
    const esc = UI.h.esc;
    const base = {
      'store.name': esc(ctx.store.name), 'store.id': esc(ctx.store.customer_id), 'program.name': esc(ctx.program.name),
      'program.period': `${UI.h.date(ctx.program.period_start)} – ${UI.h.date(ctx.program.period_end)}`, 'channel.name': esc(ctx.ch.channel_name),
      'date.today': UI.h.date(today()),
      brands: `<table class="table table-sm table-bordered doc-table"><thead><tr><th>Brand</th><th>Kelas</th><th>Baseline / bln</th><th>Growth</th><th>Target / bln</th><th>Fix maks</th><th>Conditional</th><th>Total</th></tr></thead><tbody>${
        ctx.brands.map((b) => `<tr><td>${esc(b.brand_name)}</td><td>${esc(b.class_code)}</td><td class="num">${UI.h.rp(Math.round(b.baseline))}</td><td class="num">${b.growth_pct}%</td>
          <td class="num">${UI.h.rp(Math.round(b.target_monthly || 0))}</td><td class="num">${b.fix_max_pct}%</td><td class="num">${b.conditional_pct}%</td><td class="num">${b.total_pct}%</td></tr>`).join('')}</tbody></table>`,
      pillars: `<ul>${ctx.ch.pillars.map((pl) => `<li><strong>${esc(pl.name)}</strong><ul>${pl.jtbds.flatMap((j) => j.lead_measures).map((l) => `<li>${esc(l.name)}${l.description ? ` — ${esc(l.description)}` : ''}</li>`).join('')}</ul></li>`).join('')}</ul>`,
    };
    const sections = (content && content.sections) || [];
    return sections.map((s) => {
      const list = s.per_brand ? ctx.brands : [null];
      return list.map((b) => {
        const map = Object.assign({}, base, b ? {
          'brand.name': esc(b.brand_name), 'brand.class': esc(b.class_code), 'brand.baseline': UI.h.rp(Math.round(b.baseline)), 'brand.growth': `${b.growth_pct}%`,
          'brand.target': UI.h.rp(Math.round(b.target_monthly || 0)), 'brand.conditionalRebatePct': `${b.conditional_pct}%`, 'brand.fixRebateMaxPct': `${b.fix_max_pct}%`, 'brand.totalRebatePct': `${b.total_pct}%`,
        } : {});
        return `<section class="doc-section"><h4>${fillPlaceholders(esc(s.heading), map)}</h4><div>${fillPlaceholders(esc(s.body).replace(/\n/g, '<br>'), map)}</div></section>`;
      }).join('');
    }).join('');
  }
  function unknownPlaceholders(content) {
    const known = new Set(C.PLACEHOLDERS.map((p) => p[0]));
    const bad = new Set();
    for (const s of (content && content.sections) || []) {
      for (const m of `${s.heading} ${s.body}`.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) if (!known.has(m[1])) bad.add(m[1]);
    }
    return [...bad];
  }

  // ---------------------------------------------------------------- audit log (FR13)
  function audit(programId, entity, entityId, action, before, after) {
    const u = window.UI && UI.currentUser();
    DB.insert('programAuditLogs', { program_id: programId, entity, entity_id: entityId, action, before_data: before === undefined ? null : clone(before),
      after_data: after === undefined ? null : clone(after), actor_id: u ? u.id : null, created_at: nowIso() });
  }

  // ---------------------------------------------------------------- default channel baru
  function defaultSections(docType) {
    if (docType === 'MOU') {
      return [
        { heading: 'Memorandum of Understanding — {{program.name}}', body: 'Antara PT Paragon Technology and Innovation dan {{store.name}} ({{store.id}}), channel {{channel.name}}, periode {{program.period}}.', per_brand: false },
        { heading: 'Target & rebate', body: '{{brands}}', per_brand: false },
        { heading: 'Komitmen {{brand.name}}', body: 'Kelas {{brand.class}}, growth {{brand.growth}}, target {{brand.target}} per bulan. Total rebate komitmen {{brand.totalRebatePct}} (fix maks {{brand.fixRebateMaxPct}} + conditional {{brand.conditionalRebatePct}}).', per_brand: true },
        { heading: 'Pilar & lead measure', body: '{{pillars}}', per_brand: false },
      ];
    }
    return [
      { heading: 'Surat Keterangan Nilai — {{program.name}}', body: 'Diberikan kepada {{store.name}} ({{store.id}}) pada {{date.today}}.', per_brand: false },
      { heading: 'Nilai program', body: '{{brands}}', per_brand: false },
    ];
  }
  function createChannelDefaults(pc, actorId) {
    for (const s of C.FORMULA_SLOTS) DB.insert('programFormulas', { program_channel_id: pc.id, slot: s.code, brand_code: null, expression: s.preset, preset_code: 'PRESET_2026', description: null, is_valid: true });
    let order = 1;
    for (const f of C.CATALOG_FIELDS) {
      if (['notes', 'total_target'].includes(f.key)) continue;
      DB.insert('programPhaseFields', { program_channel_id: pc.id, phase: f.phases[0], field_key: f.key, label: f.label, source: 'CATALOG', data_type: f.dataType,
        options: f.options || null, mode: f.mode, expression: null, repeat_per: f.repeatPer, is_visible: true, is_editable: f.mode === 'ENTERED',
        is_required: ['baseline', 'growth', 'evidence_upload'].includes(f.key), min_value: f.key === 'growth' ? 0 : null, max_value: null, sort_order: order++ });
    }
    const layers = { REGISTRATION: [['ADMIN_DC'], ['ABL'], ['CHADEV']], MONITORING: [['ADMIN_DC'], ['ABL']], PAYOUT: [['FINANCE'], ['HEAD_FINANCE', true]] };
    for (const [phase, list] of Object.entries(layers)) {
      list.forEach(([role, fin], i) => DB.insert('programApprovalLayers', { program_channel_id: pc.id, phase, layer_order: i + 1, role_code: role, is_final: !!fin, conditions: [] }));
    }
    DB.insert('programPayoutSchedules', { program_channel_id: pc.id, component: 'CONDITIONAL', frequency: 'QUARTERLY' });
    DB.insert('programPayoutSchedules', { program_channel_id: pc.id, component: 'FIX', frequency: 'SEMESTER' });
    for (const docType of Object.keys(C.DOC_TYPES)) {
      const t = DB.insert('programDocumentTemplates', { program_channel_id: pc.id, doc_type: docType, current_revision: 1 });
      DB.insert('programDocumentTemplateRevisions', { program_document_template_id: t.id, revision: 1, content: { sections: defaultSections(docType) }, created_by: actorId, created_at: nowIso() });
    }
  }

  // ---------------------------------------------------------------- clone (UF1 / FR1)
  function cloneProgram(srcId, v, actorId) {
    const src = DB.byId('programs', srcId);
    const p = DB.insert('programs', {
      code: v.code, name: v.name, program_type_id: src.program_type_id, year: v.year, period_start: v.period_start, period_end: v.period_end,
      description: src.description, status: 'DRAFT', published_at: null, published_by: null, cloned_from_program_id: src.id, lock_version: 1,
      created_by: actorId, created_at: nowIso(), updated_at: nowIso(),
    });
    for (const pc of DB.where('programChannels', (x) => x.program_id === src.id)) {
      const npc = DB.insert('programChannels', Object.assign(clone(pc), { program_id: p.id }));
      for (const b of DB.where('programChannelBrands', (x) => x.program_channel_id === pc.id)) {
        const nb = DB.insert('programChannelBrands', Object.assign(clone(b), { program_channel_id: npc.id }));
        for (const c of DB.where('programClasses', (x) => x.program_channel_brand_id === b.id)) DB.insert('programClasses', Object.assign(clone(c), { program_channel_brand_id: nb.id }));
      }
      for (const pl of DB.where('programPillars', (x) => x.program_channel_id === pc.id)) {
        const npl = DB.insert('programPillars', Object.assign(clone(pl), { program_channel_id: npc.id }));
        for (const j of DB.where('programJtbds', (x) => x.program_pillar_id === pl.id)) {
          const nj = DB.insert('programJtbds', Object.assign(clone(j), { program_pillar_id: npl.id }));
          for (const l of DB.where('programLeadMeasures', (x) => x.program_jtbd_id === j.id)) DB.insert('programLeadMeasures', Object.assign(clone(l), { program_jtbd_id: nj.id }));
        }
      }
      for (const t of ['programFormulas', 'programPhaseFields', 'programApprovalLayers', 'programPayoutSchedules']) {
        for (const r of DB.where(t, (x) => x.program_channel_id === pc.id)) DB.insert(t, Object.assign(clone(r), { program_channel_id: npc.id }));
      }
      for (const t of DB.where('programDocumentTemplates', (x) => x.program_channel_id === pc.id)) {
        const latest = DB.where('programDocumentTemplateRevisions', (r) => r.program_document_template_id === t.id).sort((a, b) => b.revision - a.revision)[0];
        const nt = DB.insert('programDocumentTemplates', { program_channel_id: npc.id, doc_type: t.doc_type, current_revision: 1 });
        DB.insert('programDocumentTemplateRevisions', { program_document_template_id: nt.id, revision: 1, content: latest ? clone(latest.content) : { sections: defaultSections(t.doc_type) }, created_by: actorId, created_at: nowIso() });
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- hapus berantai
  function deletePillarTree(pcId) {
    const pils = DB.where('programPillars', (x) => x.program_channel_id === pcId).map((x) => x.id);
    const jts = DB.where('programJtbds', (x) => pils.includes(x.program_pillar_id)).map((x) => x.id);
    DB.remove('programLeadMeasures', (x) => jts.includes(x.program_jtbd_id));
    DB.remove('programJtbds', (x) => jts.includes(x.id));
    DB.remove('programPillars', (x) => pils.includes(x.id));
  }
  function deleteChannel(pcId) {
    const brands = DB.where('programChannelBrands', (x) => x.program_channel_id === pcId).map((x) => x.id);
    DB.remove('programClasses', (x) => brands.includes(x.program_channel_brand_id));
    DB.remove('programChannelBrands', (x) => brands.includes(x.id));
    deletePillarTree(pcId);
    const tpls = DB.where('programDocumentTemplates', (x) => x.program_channel_id === pcId).map((x) => x.id);
    DB.remove('programDocumentTemplateRevisions', (x) => tpls.includes(x.program_document_template_id));
    for (const t of ['programFormulas', 'programPhaseFields', 'programApprovalLayers', 'programPayoutSchedules', 'programDocumentTemplates']) DB.remove(t, (x) => x.program_channel_id === pcId);
    DB.remove('programChannels', (x) => x.id === pcId);
  }
  function deleteProgram(id) {
    DB.where('programChannels', (c) => c.program_id === id).forEach((c) => deleteChannel(c.id));
    DB.remove('programAuditLogs', (x) => x.program_id === id);
    DB.remove('programs', (p) => p.id === id);
  }

  // ---------------------------------------------------------------- programValidation (FR11)
  function validateProgram(program) {
    const errors = []; const warnings = [];
    const E = (ch, text) => errors.push({ channel: ch ? ch.channel_name : null, text });
    const W = (ch, text) => warnings.push({ channel: ch ? ch.channel_name : null, text });
    if (!program.channels.length) E(null, 'Program belum punya channel.');
    if (program.period_start > program.period_end) E(null, 'Periode program: tanggal mulai setelah tanggal selesai.');
    const sample = C.sampleVars();
    for (const ch of program.channels) {
      if (!ch.brands.length) E(ch, 'Belum ada brand peserta.');
      for (const b of ch.brands) {
        const bn = b.brand_name;
        if (!b.classes.length) { E(ch, `${bn}: belum punya kelas.`); continue; }
        const sorted = b.classes.slice().sort((x, y) => x.baseline_min - y.baseline_min);
        const open = b.classes.filter((c) => c.baseline_max === null || c.baseline_max === undefined);
        if (open.length > 1) E(ch, `${bn}: lebih dari satu kelas tanpa batas atas.`);
        if (open.length === 1 && sorted[sorted.length - 1] !== open[0]) E(ch, `${bn}: kelas tanpa batas atas (${open[0].code}) bukan kelas tertinggi.`);
        for (const c of b.classes) {
          if (c.baseline_max !== null && c.baseline_max !== undefined && c.baseline_max <= c.baseline_min) E(ch, `${bn} kelas ${c.code}: baseline maks harus lebih besar dari min.`);
          if (c.fix_rebate_max_pct < 0 || c.fix_rebate_max_pct > 100) E(ch, `${bn} kelas ${c.code}: fix rebate maks di luar 0–100%.`);
          if (!c.tiers.length) E(ch, `${bn} kelas ${c.code}: belum punya tier.`);
          c.tiers.forEach((t, i) => {
            if (t.target_growth_pct < 0) E(ch, `${bn} kelas ${c.code} tier ${i + 1}: growth negatif.`);
            if (t.total_rebate_pct > 100 || t.conditional_rebate_pct < 0) E(ch, `${bn} kelas ${c.code} tier ${i + 1}: rebate di luar rentang wajar.`);
            if (i > 0) {
              const prev = c.tiers[i - 1];
              if (t.target_growth_pct <= prev.target_growth_pct) E(ch, `${bn} kelas ${c.code}: target growth tier tidak naik.`);
              if (t.total_rebate_pct < prev.total_rebate_pct || t.conditional_rebate_pct < prev.conditional_rebate_pct) E(ch, `${bn} kelas ${c.code}: rebate turun padahal growth naik.`);
            }
            if (Math.abs(t.total_rebate_pct - (c.fix_rebate_max_pct + t.conditional_rebate_pct)) > 0.0001) W(ch, `${bn} kelas ${c.code} tier ${t.target_growth_pct}%: total ${t.total_rebate_pct}% ≠ fix ${c.fix_rebate_max_pct}% + conditional ${t.conditional_rebate_pct}%.`);
          });
        }
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          if (prev.baseline_max === null || prev.baseline_max === undefined || prev.baseline_max > sorted[i].baseline_min) E(ch, `${bn}: range baseline kelas ${prev.code} dan ${sorted[i].code} tumpang tindih.`);
          else if (prev.baseline_max < sorted[i].baseline_min) W(ch, `${bn}: ada celah baseline ${fmtRp(prev.baseline_max)} – ${fmtRp(sorted[i].baseline_min)} yang tidak masuk kelas mana pun.`);
        }
      }
      for (const s of C.FORMULA_SLOTS) {
        const f = formulaFor(ch, s.code, null);
        if (!f || !String(f.expression || '').trim()) { E(ch, `Slot rumus "${s.code}" kosong.`); continue; }
        for (const fx of ch.formulas.filter((x) => x.slot === s.code)) {
          const r = window.Formula.check(fx.expression, sample);
          if (!r.isValid) E(ch, `Rumus "${s.code}"${fx.brand_code ? ` (override ${fx.brand_code})` : ''} tidak valid: ${r.errors.join(', ')}`);
        }
      }
      const reg = ch.phases.REGISTRATION.fields;
      if (!reg.some((f) => f.field_key === 'baseline' && f.is_visible)) E(ch, 'Form Registration belum punya field baseline.');
      if (!reg.some((f) => f.field_key === 'growth' && f.is_visible)) E(ch, 'Form Registration belum punya field growth.');
      for (const ph of C.PHASES) {
        const layers = ch.phases[ph.code].layers;
        if (!layers.length) E(ch, `Fase ${ph.label} belum punya approval layer.`);
        if (ph.code === 'PAYOUT' && layers.length && !layers[layers.length - 1].is_final) E(ch, 'Fase Payout harus diakhiri layer final approval.');
        if (layers.some((l, i) => l.is_final && i < layers.length - 1)) E(ch, `Fase ${ph.label}: layer final harus layer terakhir.`);
        for (const l of layers) {
          if (!C.APPROVAL_ROLES[l.role_code]) E(ch, `Fase ${ph.label} layer ${l.layer_order}: role tidak dikenal.`);
          for (const c of l.conditions || []) {
            if (!C.AUTO_APPROVE_OBJECTS[c.object_code] || !C.OPERATORS[c.operator] || c.value === null || c.value === '' || !Number.isFinite(Number(c.value))) {
              E(ch, `Fase ${ph.label} layer ${l.layer_order}: kondisi auto-approve tidak lengkap / tidak dikenal.`);
            }
          }
        }
      }
      if (ch.pillars.length) {
        const sum = ch.pillars.reduce((s, pl) => s + (Number(pl.weight_pct) || 0), 0);
        if (Math.abs(sum - 100) > 0.0001) W(ch, `Bobot pilar berjumlah ${sum}% (bukan 100%).`);
      }
      for (const docType of Object.keys(C.DOC_TYPES)) {
        const d = ch.documents[docType];
        if (!d.latest || !(d.latest.content.sections || []).length) E(ch, `Template ${docType} kosong.`);
        else { const bad = unknownPlaceholders(d.latest.content); if (bad.length) E(ch, `Template ${docType} memakai placeholder tidak dikenal: ${bad.join(', ')}`); }
      }
    }
    return { errors, warnings };
  }

  const fmtRp = (n) => (window.UI ? UI.h.rpShort(n) : String(n));

  window.Engine = {
    monthsBetween, today, periodsOf, brandSales, baselineMonths,
    loadProgram, formulaFor, brandOf, resolveClass, resolveTier, commitment, periodCalc, pillarCompliance, pillarWeights, payoutCalc,
    registrationObjects, monitoringObjects, payoutObjects, generateDocuments,
    eligibility, minBaseline, evalLayer, evaluateApproval, submit, act, currentLayer, logApproval, TABLE, PHASE_OF,
    renderDocument, unknownPlaceholders, defaultSections, audit, createChannelDefaults, cloneProgram,
    deleteChannel, deleteProgram, deletePillarTree, validateProgram,
  };
})();
