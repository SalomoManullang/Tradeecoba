// Logika bisnis: baseline, kelas otomatis, eligibility, target, hitungan pencairan, alur approval.
// Semua aturan dibaca dari setup program (tidak ada hardcode per tahun).
(function () {
  const DB = window.DB;

  // ---------------------------------------------------------------- tanggal
  function monthsBetween(start, end) {
    const out = [];
    let [y, m] = String(start).slice(0, 7).split('-').map(Number);
    const [ey, em] = String(end).slice(0, 7).split('-').map(Number);
    while (y < ey || (y === ey && m <= em)) {
      out.push(`${y}-${String(m).padStart(2, '0')}-01`);
      m++;
      if (m > 12) { m = 1; y++; }
    }
    return out;
  }

  function isWithin(dateStr, start, end) {
    if (start && dateStr < start) return false;
    if (end && dateStr > end) return false;
    return true;
  }

  function today() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  // ---------------------------------------------------------------- program
  // Menyusun program lengkap (channel, kelas, matriks, kolom, periode, komponen, tahapan)
  function loadProgram(programId) {
    const p = DB.byId('programs', programId);
    if (!p) return null;
    const program = Object.assign({}, p);
    const bySort = (a, b) => (a.sort || 0) - (b.sort || 0) || a.id - b.id;

    const channels = DB.where('programChannels', (x) => x.program_id === p.id)
      .map((pc) => {
        const ch = DB.t('channels').find((c) => c.code === pc.channel_code) || {};
        return Object.assign({}, pc, { channel_name: ch.name, channel_sort: ch.sort || 0 });
      })
      .sort((a, b) => a.channel_sort - b.channel_sort);
    for (const ch of channels) {
      ch.classes = DB.where('classes', (c) => c.program_channel_id === ch.id).sort(bySort);
    }
    const classIds = channels.flatMap((c) => c.classes.map((x) => x.id));

    const pillars = DB.where('pillars', (x) => x.program_id === p.id).sort(bySort).map((x) => Object.assign({}, x));
    for (const pil of pillars) {
      pil.jtbds = DB.where('jtbds', (j) => j.pillar_id === pil.id).sort(bySort).map((x) => Object.assign({}, x));
      for (const j of pil.jtbds) {
        j.lead_measures = DB.where('lms', (l) => l.jtbd_id === j.id).sort(bySort).map((l) => {
          const lm = Object.assign({}, l, { jtbd_name: j.name, pillar_name: pil.name, params: {} });
          for (const prm of DB.where('params', (x) => x.lead_measure_id === l.id && classIds.includes(x.program_class_id))) {
            lm.params[prm.program_class_id] = prm;
          }
          return lm;
        });
      }
    }

    program.channels = channels;
    program.pillars = pillars;
    program.leadMeasures = pillars.flatMap((pil) => pil.jtbds.flatMap((j) => j.lead_measures));
    program.fields = DB.where('fields', (f) => f.program_id === p.id).sort(bySort);
    program.periods = DB.where('periods', (x) => x.program_id === p.id).sort(bySort);
    program.components = DB.where('components', (x) => x.program_id === p.id).sort(bySort);
    program.steps = DB.where('steps', (x) => x.program_id === p.id).sort(bySort);
    program.programMonths = monthsBetween(p.program_start, p.program_end).length;
    return program;
  }

  function fieldsFor(program, stage, programChannelId) {
    return program.fields.filter((f) => f.stage === stage && (f.program_channel_id === null || f.program_channel_id === programChannelId));
  }

  // ---------------------------------------------------------------- sales
  // sales[customer_id][YYYY-MM-01][brand] = [sellout, sellin]
  function salesAgg({ customerIds, brandCodes, start, end }) {
    const months = monthsBetween(start, end);
    const map = new Map();
    const sales = DB.state.sales || {};
    for (const cid of customerIds) {
      const byMonth = sales[cid];
      if (!byMonth) continue;
      const a = { sellout: 0, sellin: 0, activeMonths: 0, monthly: {} };
      let any = false;
      for (const m of months) {
        const row = byMonth[m];
        if (!row) continue;
        let so = 0; let si = 0;
        for (const [b, v] of Object.entries(row)) {
          if (brandCodes && brandCodes.length && !brandCodes.includes(b)) continue;
          so += v[0]; si += v[1];
        }
        a.sellout += so; a.sellin += si;
        if (so > 0 || si > 0) { a.activeMonths++; any = true; }
        a.monthly[m] = { sellout: so, sellin: si };
      }
      if (any) map.set(cid, a);
    }
    return map;
  }

  function metric(program, agg) {
    return program.basis === 'sellin' ? agg.sellin : agg.sellout;
  }

  function baselineOf(program, agg) {
    if (!agg) return 0;
    const total = metric(program, agg);
    if (program.baseline_method === 'avg_active_month') return agg.activeMonths ? total / agg.activeMonths : 0;
    return total / monthsBetween(program.baseline_start, program.baseline_end).length;
  }

  function sellRatio(agg) {
    if (!agg || !agg.sellin) return null;
    return (agg.sellout / agg.sellin) * 100;
  }

  // ---------------------------------------------------------------- kelas & eligibility
  function pickClass(classes, baseline) {
    const sorted = [...classes].sort((a, b) => b.baseline_min - a.baseline_min);
    return sorted.find((c) => baseline >= c.baseline_min && (c.baseline_max === null || baseline < c.baseline_max)) || null;
  }

  function eligibility(pc, baseline, ratio, activeMonths) {
    const reasons = [];
    const cls = pickClass(pc.classes, baseline);
    if (!cls) reasons.push('Baseline tidak masuk range kelas manapun');
    if (pc.min_baseline !== null && baseline < pc.min_baseline) reasons.push('Baseline di bawah minimal');
    if (pc.min_sellout_ratio !== null) {
      if (ratio === null) reasons.push('Tidak ada data sell in untuk rasio');
      else if (ratio < pc.min_sellout_ratio) reasons.push(`Rasio SO:SI ${ratio.toFixed(1)}% < ${pc.min_sellout_ratio}%`);
    }
    if (pc.min_active_months !== null && activeMonths < pc.min_active_months) reasons.push(`Bulan aktif ${activeMonths} < ${pc.min_active_months}`);
    return { eligible: reasons.length === 0, reasons, cls };
  }

  function computeTarget(baseline, growthPct, months) {
    const monthly = baseline * (1 + growthPct / 100);
    return { monthly, period: monthly * months };
  }

  function validateGrowth(pc, cls, growth) {
    if (!Number.isFinite(growth)) return 'Growth wajib diisi';
    if (growth < cls.min_growth) return `Growth minimal kelas ${cls.name} adalah ${cls.min_growth}%`;
    if (cls.max_growth !== null && growth > cls.max_growth) return `Growth maksimal kelas ${cls.name} adalah ${cls.max_growth}%`;
    if (!pc.growth_editable && growth !== cls.min_growth) return `Growth untuk channel ini dikunci di ${cls.min_growth}%`;
    return null;
  }

  // ---------------------------------------------------------------- pencairan
  function lmAchieved(lm, param, value) {
    if (value === undefined || value === null || value === '') return false;
    if (lm.input_type === 'yesno') return String(value).toLowerCase() === 'ya';
    if (lm.input_type === 'number') {
      const target = parseFloat(param.target_value);
      const real = parseFloat(value);
      if (!Number.isFinite(real)) return false;
      return Number.isFinite(target) ? real >= target : real > 0;
    }
    return String(value).trim() !== '';
  }

  function numericData(obj) {
    const out = {};
    for (const [k, v] of Object.entries(obj || {})) {
      const n = parseFloat(v);
      if (Number.isFinite(n) && /^[A-Za-z_][A-Za-z0-9_]*$/.test(k)) out[k] = n;
    }
    return out;
  }

  const FORMULA_VARS = ['actual', 'target', 'baseline', 'achievement', 'growth', 'rebate_pct', 'months',
    'jtbd_achieved', 'jtbd_total', 'target_monthly'];

  function computeDisbursement({ program, participant, period, actual, lmValues, data, hasNpwp }) {
    const pc = program.channels.find((c) => c.id === participant.program_channel_id);
    const cls = pc.classes.find((c) => c.id === participant.class_id) || { id: -1, name: participant.class_name, rebate_pct: 0 };
    const months = monthsBetween(period.achieve_start, period.achieve_end).length;
    const target = participant.target_monthly * months;
    const achievement = target > 0 ? (actual / target) * 100 : 0;

    const lmItems = program.leadMeasures.filter((lm) => lm.params[cls.id]).map((lm) => {
      const param = lm.params[cls.id];
      const value = (lmValues || {})[lm.id];
      return { lm, param, value: value === undefined ? '' : value, achieved: lmAchieved(lm, param, value) };
    });

    const vars = Object.assign({}, numericData(participant.data), numericData(data), {
      actual, target, baseline: participant.baseline, achievement, growth: participant.growth_pct,
      rebate_pct: cls.rebate_pct, months, target_monthly: participant.target_monthly,
      jtbd_achieved: lmItems.filter((i) => i.achieved).length, jtbd_total: lmItems.length,
    });

    const lines = [];
    const comps = program.components.filter((c) => c.is_active &&
      (c.program_channel_id === null || c.program_channel_id === pc.id) &&
      (!c.period_ids || !c.period_ids.length || c.period_ids.includes(period.id)));

    for (const c of comps) {
      const cfg = c.config || {};
      const baseVal = cfg.base === 'target' ? target : actual;
      const minAch = cfg.min_achievement === undefined || cfg.min_achievement === null || cfg.min_achievement === '' ? null : Number(cfg.min_achievement);
      const gateOk = minAch === null || achievement >= minAch;
      const gateMsg = `Pencapaian ${achievement.toFixed(1)}% < syarat ${minAch}%`;
      let amount = 0;
      let detail = '';
      try {
        if (c.comp_type === 'growth_rebate') {
          const pct = cfg.rebate_source === 'custom' ? Number(cfg.rebate_pct || 0) : Number(cls.rebate_pct || 0);
          const tiers = (cfg.tiers || []).map((t) => ({ min: Number(t.min_achievement), payout: Number(t.payout_pct) })).sort((a, b) => b.min - a.min);
          const tier = tiers.find((t) => achievement >= t.min);
          if (tier) {
            amount = baseVal * (pct / 100) * (tier.payout / 100);
            detail = `${pct}% x ${cfg.base === 'target' ? 'target' : 'aktual'} x payout ${tier.payout}% (tier >= ${tier.min}%)`;
          } else {
            detail = tiers.length ? `Pencapaian ${achievement.toFixed(1)}% < tier terendah ${tiers[tiers.length - 1].min}%` : 'Tier belum diatur';
          }
        } else if (c.comp_type === 'jtbd') {
          if (!gateOk) detail = gateMsg;
          else {
            let n = 0;
            for (const it of lmItems) {
              if (!it.achieved) continue;
              amount += baseVal * (Number(it.param.reward_pct || 0) / 100) + Number(it.param.reward_nominal || 0);
              n++;
            }
            detail = `${n} dari ${lmItems.length} lead measure tercapai`;
          }
        } else if (c.comp_type === 'fixed') {
          if (gateOk) { amount = Number((cfg.amounts || {})[cls.name] || 0); detail = `Nominal kelas ${cls.name}`; } else detail = gateMsg;
        } else if (c.comp_type === 'formula') {
          if (gateOk) { amount = window.Formula.evaluate(cfg.expression, vars); detail = cfg.expression; } else detail = gateMsg;
        }
      } catch (err) {
        detail = `Error rumus: ${err.message}`;
        amount = 0;
      }
      amount = Math.max(0, Math.round(amount));
      lines.push({ component_id: c.id, name: c.name, type: c.comp_type, amount, detail });
    }

    const gross = lines.reduce((s, l) => s + l.amount, 0);
    const taxRate = hasNpwp ? Number(program.tax_rate_npwp) : Number(program.tax_rate_non_npwp);
    const tax = Math.round(gross * taxRate / 100);
    return { target, actual, achievement, months, lmItems, lines, gross, taxRate, tax, net: gross - tax };
  }

  // ---------------------------------------------------------------- workflow
  const FINAL_STATUS = { registration: 'active', disbursement: 'paid' };
  const PHASE = { participants: 'registration', disbursements: 'disbursement' };

  function stepsOf(program, phase) {
    return program.steps.filter((s) => s.phase === phase).sort((a, b) => a.sort - b.sort || a.id - b.id);
  }

  function initialState(program, phase) {
    const steps = stepsOf(program, phase);
    if (!steps.length) return { status: FINAL_STATUS[phase], current_step_id: null, step: null };
    return { status: 'in_review', current_step_id: steps[0].id, step: steps[0] };
  }

  function log(entity, entityId, stepName, action, note, userId) {
    DB.insert('logs', { entity, entity_id: entityId, step_name: stepName, action, note: note || null, user_id: userId, created_at: new Date().toISOString() });
  }

  // entity: 'participants' | 'disbursements' ; action: approve | reject | return
  function act({ entity, record, program, action, user, note }) {
    const phase = PHASE[entity];
    const steps = stepsOf(program, phase);
    const idx = steps.findIndex((s) => s.id === record.current_step_id);
    const step = steps[idx];
    if (record.status !== 'in_review' || !step) throw new Error('Data ini tidak sedang menunggu approval.');
    if (step.role !== user.role) throw new Error(`Tahap "${step.name}" hanya bisa diproses oleh role ${step.role}.`);
    if ((action === 'reject' || action === 'return') && !String(note || '').trim()) throw new Error('Catatan wajib diisi untuk tolak / kembalikan.');
    let nextStep = null;
    if (action === 'approve') {
      nextStep = steps[idx + 1] || null;
      record.status = nextStep ? 'in_review' : FINAL_STATUS[phase];
    } else if (action === 'reject') record.status = 'rejected';
    else if (action === 'return') record.status = 'returned';
    else throw new Error('Aksi tidak dikenal');
    record.current_step_id = nextStep ? nextStep.id : null;
    record.updated_at = new Date().toISOString();
    log(entity === 'participants' ? 'participant' : 'disbursement', record.id, step.name, action, note, user.id);
    return { status: record.status, nextStep };
  }

  // ---------------------------------------------------------------- hapus berantai (pengganti ON DELETE CASCADE)
  function deleteLeadMeasures(ids) {
    DB.remove('params', (p) => ids.includes(p.lead_measure_id));
    DB.remove('lms', (l) => ids.includes(l.id));
  }
  function deleteJtbds(ids) {
    deleteLeadMeasures(DB.where('lms', (l) => ids.includes(l.jtbd_id)).map((l) => l.id));
    DB.remove('jtbds', (j) => ids.includes(j.id));
  }
  function deletePillars(ids) {
    deleteJtbds(DB.where('jtbds', (j) => ids.includes(j.pillar_id)).map((j) => j.id));
    DB.remove('pillars', (p) => ids.includes(p.id));
  }
  function deleteClasses(ids) {
    DB.remove('params', (p) => ids.includes(p.program_class_id));
    DB.remove('classes', (c) => ids.includes(c.id));
  }
  function deleteChannel(pcId) {
    deleteClasses(DB.where('classes', (c) => c.program_channel_id === pcId).map((c) => c.id));
    DB.remove('fields', (f) => f.program_channel_id === pcId);
    DB.remove('components', (c) => c.program_channel_id === pcId);
    DB.remove('programChannels', (c) => c.id === pcId);
  }
  function deleteProgram(id) {
    DB.where('programChannels', (c) => c.program_id === id).forEach((c) => deleteChannel(c.id));
    deletePillars(DB.where('pillars', (p) => p.program_id === id).map((p) => p.id));
    for (const t of ['fields', 'periods', 'components', 'steps']) DB.remove(t, (x) => x.program_id === id);
    DB.remove('programs', (p) => p.id === id);
  }

  window.Engine = {
    monthsBetween, isWithin, today, loadProgram, fieldsFor, salesAgg, metric, baselineOf, sellRatio,
    pickClass, eligibility, computeTarget, validateGrowth, lmAchieved, computeDisbursement, FORMULA_VARS,
    stepsOf, initialState, act, log, FINAL_STATUS,
    deleteLeadMeasures, deleteJtbds, deletePillars, deleteClasses, deleteChannel, deleteProgram,
  };
})();
