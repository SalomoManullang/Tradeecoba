// Program demo untuk presentasi: salinan Loyalty Program 2027 dengan SEMUA langkah setup terisi & valid (tanpa error / peringatan), semua fase DRAFT.
// Dibuat saat seed (Seed.build) dan ditambahkan sekali ke data lama yang belum punya (app.js → SeedPresentation.ensure()).
(function () {
  const CODE = 'DEMO-2027';
  const clone = (x) => JSON.parse(JSON.stringify(x));

  function run() {
    const SM = window.SetupModel; const E = window.Engine;
    const src = DB.t('programs').find((p) => p.code === 'LOYALTY-2027');
    if (!src || DB.t('programs').some((p) => p.code === CODE)) return null;
    const admin = DB.t('users').find((u) => u.role === 'ADMIN_HO');
    const p = E.cloneProgram(src.id, { code: CODE, name: 'Loyalty Program 2027 · Demo Presentasi', year: 2027, period_start: src.period_start, period_end: src.period_end }, admin ? admin.id : null);
    p.description = 'Contoh lengkap untuk presentasi: semua channel, brand, skema kelas, pilar & target, eligibility, batas, form & approval, dokumen, jadwal, termin, dan rumus sudah terisi.';

    for (const pc of DB.where('programChannels', (x) => x.program_id === p.id)) {
      pc.phase_status = { REGISTRATION: 'DRAFT', MONITORING: 'DRAFT', PAYOUT: 'DRAFT' };
      const brands = DB.where('programChannelBrands', (x) => x.program_channel_id === pc.id);
      // skema kelas, aturan benefit & termin: pakai data deck; channel tanpa skema (Locomm) ikut aturan Passive
      const demo = SM.demoSetup(pc.channel_type === 'ACTIVE' ? 'ACTIVE' : 'PASSIVE');
      const st = Object.assign(SM.emptySetup(), pc.setup || {});
      st.schemes = Object.assign({}, st.schemes);
      for (const b of brands) if (!(st.schemes[b.brand_code] || { classes: [] }).classes.length) st.schemes[b.brand_code] = clone(demo.schemes[b.brand_code] || demo.schemes.WRD);
      if (!st.terms || !st.terms.length) st.terms = clone(demo.terms);
      // batas channel dilonggarkan secukupnya supaya semua kelas di dalam rentang (tidak ada peringatan / exception saat presentasi)
      let semMax = 0; let yrMax = 0; let totMax = 0;
      for (const b of brands) for (const c of st.schemes[b.brand_code].classes) for (const t of c.tiers) {
        semMax = Math.max(semMax, Number(t.semester_pct) || 0); yrMax = Math.max(yrMax, Number(t.yearly_pct) || 0);
        totMax = Math.max(totMax, SM.tierTotal(t) + (Number(c.vc_pct) || 0));
      }
      st.rules = { semester_min: 0.5, semester_max: Math.max(1, semMax), yearly_min: 0.5, yearly_max: Math.max(1.5, yrMax), total_max_pct: Math.ceil(Math.max(5.25, totMax) * 4) / 4 };
      pc.setup = st;
      // target lead measure: kelas yang belum punya target disalin dari kelas di bawahnya (lead measure brand yang sama)
      for (const b of brands) {
        const t = b.lm_targets || (b.lm_targets = {});
        let last = null;
        for (const c of st.schemes[b.brand_code].classes) { if (t[c.code]) last = t[c.code]; else if (last) t[c.code] = clone(last); }
      }
      // eligibility: syarat contoh
      if (pc.elig_min_sell_out_months === null || pc.elig_min_sell_out_months === undefined) pc.elig_min_sell_out_months = 3;
      pc.elig_prior_payout_required = true;
    }
    return p;
  }

  // Data lama (localStorage) belum punya program demo → tambahkan sekali
  function ensure() {
    if (DB.t('programs').some((p) => p.code === CODE)) return;
    if (run()) DB.save();
  }

  window.SeedPresentation = { run, ensure, CODE };
})();
