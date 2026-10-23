// Program Setup: lapisan tampilan supaya halaman tidak terasa penuh.
//   1. Catatan panjang di awal kartu dilipat jadi satu baris ("Selengkapnya").
//   2. Mode lihat / mode edit per form konfigurasi; di mode lihat angka besar diformat (40.000.000).
//   3. Bagian form eligibility dilipat per bagian; kelas & tier dan kondisi approval layer tampil sebagai ringkasan satu baris yang bisa dibuka;
//      kolom Diulang / Min / Maks di tabel field fase masuk "Pengaturan lanjutan".
// Hanya bekerja di atas DOM yang sudah dirender (setup.js / setup2.js); tidak mengubah state, aksi, validasi, atau data.
// Elemen buatan file ini diberi atribut data-cps-ui. Program terkunci (fieldset disabled dari awal) selalu mode lihat.
(function () {
  const { h } = UI;
  // Form konfigurasi yang punya mode lihat; form aksi cepat (clone, tipe, channel, exception, publish) selalu bisa diisi
  const VIEW_FORMS = ['setup.header', 'setup.saveBrands', 'setup.saveClasses', 'setup.savePillars', 'setup.saveLmTargets', 'setup.saveFormulas',
    'setup.savePhaseForm', 'setup.saveLayers', 'setup.saveEligibility', 'setup.saveDoc'];
  const NOTE_MIN = 140; // catatan sependek ini tidak dilipat

  let audit = false; // dipakai tooling verifikasi: semua form mode edit, semua bagian terbuka
  const forms = new WeakMap(); // form → { locked, bar, dirty }
  const folds = new WeakMap(); // container (#classes / #layers) → { open: Set<index>, count }
  const bound = new WeakSet();

  const ui = (html) => {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    const el = t.content.firstElementChild;
    el.setAttribute('data-cps-ui', '');
    return el;
  };
  const raw = (inp) => (inp ? (inp.dataset.cpsRaw !== undefined ? inp.dataset.cpsRaw : inp.value) : '');
  const nOrNull = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));

  // ---------------------------------------------------------------- 2 · angka besar (hanya saat form tidak bisa diedit)
  // Batas 10.000 supaya tahun (2027) dan persen tidak ikut diberi titik
  function formatNumbers(form) {
    form.querySelectorAll('input[type="number"]').forEach((inp) => {
      const v = inp.value;
      if (v === '' || Math.abs(Number(v)) < 10000) return;
      inp.dataset.cpsRaw = v;
      inp.type = 'text';
      inp.value = Number(v).toLocaleString('id-ID', { maximumFractionDigits: 4 });
    });
  }
  function restoreNumbers(form) {
    form.querySelectorAll('input[data-cps-raw]').forEach((inp) => {
      inp.type = 'number';
      inp.value = inp.dataset.cpsRaw;
      delete inp.dataset.cpsRaw;
    });
  }

  // ---------------------------------------------------------------- 2 · mode lihat / edit
  function setMode(form, mode) {
    const f = forms.get(form);
    const fs = form.querySelector(':scope > fieldset');
    const view = mode === 'view' || f.locked;
    form.classList.toggle('cps-viewing', view);
    if (fs && !f.locked) fs.disabled = view;
    if (view && !audit) formatNumbers(form); else restoreNumbers(form);
    f.dirty = false;
    if (f.bar) {
      f.bar.classList.toggle('is-edit', !view);
      f.bar.querySelector('.cps-modebar-text').textContent = view ? 'Mode lihat' : 'Mode edit · simpan untuk menerapkan perubahan';
    }
  }

  function enhanceForm(form) {
    if (forms.has(form)) return;
    const fs = form.querySelector(':scope > fieldset');
    const isNew = form.dataset.action === 'setup.header' && !form.dataset.id;
    const f = { locked: !!(fs && fs.disabled), bar: null, dirty: false };
    forms.set(form, f);
    if (isNew) return; // program baru langsung diisi
    if (!f.locked) {
      f.bar = ui(`<div class="cps-modebar"><span class="cps-modebar-text"></span>
        <span class="cps-modebar-act">
          <button type="button" class="btn btn-sm btn-outline-secondary" data-cps-cancel><i class="bi bi-x-lg"></i> Batal</button>
          <button type="button" class="btn btn-sm btn-outline-brand" data-cps-edit><i class="bi bi-pencil"></i> Edit</button>
        </span></div>`);
      form.before(f.bar);
      f.bar.querySelector('[data-cps-edit]').addEventListener('click', () => setMode(form, 'edit'));
      f.bar.querySelector('[data-cps-cancel]').addEventListener('click', () => {
        if (f.dirty && !confirm('Batalkan perubahan yang belum disimpan?')) return;
        UI.render(); // gambar ulang dari data tersimpan
      });
      form.addEventListener('input', () => { f.dirty = true; });
      form.addEventListener('change', () => { f.dirty = true; });
    }
    // gagal validasi header (UI.retry) → tetap di mode edit supaya isian bisa langsung diperbaiki
    const retryErrors = form.closest('.cps') && form.closest('.cps').querySelector('.alert-danger ul');
    setMode(form, audit || retryErrors ? 'edit' : 'view');
  }
  // Isi form yang digambar ulang oleh draw() saat mode lihat ikut diformat
  function refreshViewing(root) {
    if (audit) return;
    root.querySelectorAll('form.cps-viewing').forEach((form) => formatNumbers(form));
  }

  // ---------------------------------------------------------------- 1 · catatan panjang dilipat
  function enhanceNotes(root) {
    root.querySelectorAll('.cps .card-body > p.small.text-muted:first-child').forEach((p) => {
      if (bound.has(p) || p.textContent.trim().length < NOTE_MIN) return;
      bound.add(p);
      p.classList.add('cps-note', 'is-folded');
      if (p.scrollWidth <= p.clientWidth) { p.classList.remove('is-folded'); return; } // sudah muat satu baris: tidak perlu dilipat
      const t = ui('<span class="cps-note-toggle" role="button" tabindex="0">Selengkapnya</span>');
      p.after(t);
      const toggle = () => { const open = p.classList.toggle('is-folded') === false; t.textContent = open ? 'Ringkas' : 'Selengkapnya'; };
      t.addEventListener('click', toggle);
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  // ---------------------------------------------------------------- 3 · ringkasan yang bisa dibuka
  function foldState(box, count) {
    const st = folds.get(box) || { open: new Set(), count };
    if (count > st.count) for (let i = st.count; i < count; i++) st.open.add(i); // item baru langsung terbuka
    st.count = count;
    folds.set(box, st);
    return st;
  }
  function foldable(card, i, st, sumEl) {
    const set = (open) => { card.classList.toggle('is-folded', !open); if (open) st.open.add(i); else st.open.delete(i); };
    set(audit || st.open.has(i));
    const toggle = () => set(card.classList.contains('is-folded'));
    sumEl.addEventListener('click', toggle);
    sumEl.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
  }

  // Kelas & tier: "Kelas A · Rp 40,0 jt – 150,0 jt · Fix 1% · 3 tier (70–80%)"
  function classSummary(card) {
    const q = (s) => card.querySelector(s);
    const code = raw(q('[data-f="code"]')) || '?';
    const min = nOrNull(raw(q('[data-f="baseline_min"]:not([data-t])')));
    const max = nOrNull(raw(q('[data-f="baseline_max"]:not([data-t])')));
    const fix = nOrNull(raw(q('[data-f="fix"]:not([data-t])')));
    const g = [...card.querySelectorAll('[data-t][data-f="g"]')].map((x) => nOrNull(raw(x))).filter((x) => x !== null);
    const nT = card.querySelectorAll('[data-t][data-f="g"]').length;
    const range = min === null ? 'baseline belum diisi' : max === null ? `≥ Rp ${h.rpShort(min)}` : `Rp ${h.rpShort(min)} – ${h.rpShort(max)}`;
    const tiers = `${nT} tier${g.length ? ` (${Math.min(...g)}${g.length > 1 ? `–${Math.max(...g)}` : ''}%)` : ''}`;
    return `<strong>Kelas ${h.esc(code)}</strong><span>${range}</span><span>Fix ${fix === null ? '-' : `${fix}%`}</span><span>${tiers}</span>`;
  }
  function enhanceClasses(root) {
    const box = root.querySelector('#classes');
    if (!box) return;
    const cards = [...box.querySelectorAll(':scope > .class-card')];
    const st = foldState(box, cards.length);
    cards.forEach((card, i) => {
      if (card.querySelector(':scope > .cps-sum')) return;
      const sum = ui('<div class="cps-sum" role="button" tabindex="0"><i class="bi bi-chevron-right cps-sum-ic"></i><span class="cps-sum-text"></span></div>');
      card.prepend(sum);
      sum.querySelector('.cps-sum-text').innerHTML = classSummary(card);
      foldable(card, i, st, sum);
    });
    if (!bound.has(box)) {
      bound.add(box);
      box.addEventListener('input', (e) => {
        const card = e.target.closest('.class-card');
        const t = card && card.querySelector(':scope > .cps-sum .cps-sum-text');
        if (t) t.innerHTML = classSummary(card);
      });
    }
  }

  // Approval layer: kondisi auto-approve diringkas satu baris ("Jika Growth per brand (%) ≥ 70")
  function layerSummary(card) {
    const conds = [...card.querySelectorAll(':scope > [data-c]')].map((c) => {
      const o = c.querySelector('[data-cf="object_code"]'); const op = c.querySelector('[data-cf="operator"]'); const v = c.querySelector('[data-cf="value"]');
      const txt = (s) => (s && s.selectedOptions[0] ? s.selectedOptions[0].textContent : '');
      return `${h.esc(txt(o))} ${h.esc(txt(op))} ${h.esc(raw(v) || '…')}`;
    });
    return conds.length ? `<strong>${conds.length} kondisi auto-approve</strong><span>Jika ${conds.join(' dan ')}</span>`
      : '<strong>Tanpa kondisi auto-approve</strong><span>Layer ini selalu disetujui manual</span>';
  }
  function enhanceLayers(root) {
    const box = root.querySelector('#layers');
    if (!box) return;
    const cards = [...box.querySelectorAll(':scope > .layer-card')];
    const st = foldState(box, cards.length);
    cards.forEach((card, i) => {
      if (card.querySelector(':scope > .cps-sum')) return;
      const sum = ui('<div class="cps-sum cps-sum-layer" role="button" tabindex="0"><i class="bi bi-chevron-right cps-sum-ic"></i><span class="cps-sum-text"></span></div>');
      const head = card.firstElementChild;
      head.after(sum);
      sum.querySelector('.cps-sum-text').innerHTML = layerSummary(card);
      foldable(card, i, st, sum);
    });
  }

  // Field fase: kolom Diulang / Min / Maks disembunyikan sampai "Pengaturan lanjutan" dibuka
  function enhancePhaseFields(root) {
    root.querySelectorAll('table.phase-fields').forEach((table) => {
      if (bound.has(table)) return;
      bound.add(table);
      table.classList.toggle('cps-adv-off', !audit);
      const wrap = table.closest('.table-responsive') || table;
      const t = ui('<span class="cps-adv-toggle" role="button" tabindex="0"><i class="bi bi-sliders"></i> <span>Tampilkan pengaturan lanjutan (Diulang, Min, Maks)</span></span>');
      wrap.before(t);
      const toggle = () => {
        const off = table.classList.toggle('cps-adv-off');
        t.querySelector('span').textContent = off ? 'Tampilkan pengaturan lanjutan (Diulang, Min, Maks)' : 'Sembunyikan pengaturan lanjutan';
      };
      t.addEventListener('click', toggle);
      t.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
    });
  }

  // Bagian form (eligibility: Syarat pendaftaran · Syarat payout · Jadwal) = kotak bergaris yang bisa dilipat.
  // Kolom milik satu bagian dipindah ke dalam kotaknya (tetap di form yang sama); tombol simpan tetap di luar.
  function enhanceSections(root) {
    root.querySelectorAll('.cps .card-body.row').forEach((body) => {
      if (bound.has(body)) return;
      const heads = [...body.querySelectorAll(':scope > .col-12 > .elig-sec')];
      if (!heads.length) return;
      bound.add(body);
      heads.forEach((sec, idx) => {
        const headCol = sec.parentElement;
        const box = document.createElement('div');
        box.className = 'col-12 cps-sec-box';
        const inner = document.createElement('div');
        inner.className = 'row g-3 cps-sec-body';
        headCol.before(box);
        const items = [];
        for (let n = headCol.nextElementSibling; n; n = n.nextElementSibling) {
          if (n.querySelector('.elig-sec') || n.querySelector('button:not([type="button"])')) break;
          items.push(n);
        }
        items.forEach((n) => inner.appendChild(n));
        box.appendChild(sec);
        box.appendChild(inner);
        headCol.remove();
        sec.classList.add('cps-sec-head');
        sec.setAttribute('role', 'button');
        sec.tabIndex = 0;
        sec.appendChild(ui('<i class="bi bi-chevron-down cps-sec-ic"></i>'));
        box.classList.toggle('is-folded', !audit && idx > 0);
        const toggle = () => box.classList.toggle('is-folded');
        sec.addEventListener('click', (e) => { if (!e.target.closest('a')) toggle(); });
        sec.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      });
    });
  }

  // ---------------------------------------------------------------- jalankan setelah setiap render / draw()
  function enhance() {
    const root = document.getElementById('app');
    if (!root || !root.querySelector('.cps')) return;
    root.querySelectorAll('.cps form[data-action]').forEach((form) => { if (VIEW_FORMS.includes(form.dataset.action)) enhanceForm(form); });
    enhanceNotes(root);
    enhanceSections(root);
    enhanceClasses(root);
    enhanceLayers(root);
    enhancePhaseFields(root);
    refreshViewing(root);
  }
  const app = document.getElementById('app');
  const mo = new MutationObserver(() => {
    mo.disconnect();
    try { enhance(); } finally { mo.takeRecords(); mo.observe(app, { childList: true, subtree: true }); }
  });
  if (app) mo.observe(app, { childList: true, subtree: true });

  // Tooling verifikasi (reference/docs/reskin/tools): semua form mode edit, semua bagian terbuka, angka mentah
  window.CPSView = {
    audit() {
      audit = true;
      document.querySelectorAll('.cps form').forEach((form) => {
        const f = forms.get(form);
        if (!f) return;
        if (f.locked) restoreNumbers(form); else setMode(form, 'edit');
      });
      document.querySelectorAll('.cps .class-card.is-folded, .cps .layer-card.is-folded').forEach((c) => c.classList.remove('is-folded'));
      document.querySelectorAll('.cps table.phase-fields.cps-adv-off').forEach((t) => t.classList.remove('cps-adv-off'));
      document.querySelectorAll('.cps .cps-sec-box.is-folded').forEach((b) => b.classList.remove('is-folded'));
    },
  };
})();
