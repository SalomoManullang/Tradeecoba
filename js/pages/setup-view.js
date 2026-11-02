// Program Setup: lapisan tampilan supaya halaman tidak terasa penuh.
//   1. Catatan panjang di awal kartu pindah ke panel "(?) Bantuan"; catatan review (⚠, Perlu konfirmasi, Menyusul) hanya tampil bila toggle aktif.
//   2. Fase DRAFT langsung bisa diisi; bar simpan menempel di bawah (N perubahan · Batal · Simpan · Simpan & lanjut).
//      Fase PUBLISHED / CLOSED = mode lihat, angka besar diformat (40.000.000).
//   3. Bagian form eligibility dilipat per bagian; kelas & tier dan kondisi approval layer tampil sebagai ringkasan satu baris yang bisa dibuka;
//      kolom Diulang / Min / Maks di tabel field fase masuk "Pengaturan lanjutan".
// Hanya bekerja di atas DOM yang sudah dirender (setup.js / setup2.js); tidak mengubah state, aksi, validasi, atau data.
// Elemen buatan file ini diberi atribut data-cps-ui. Program terkunci (fieldset disabled dari awal) selalu mode lihat.
(function () {
  const { h } = UI;
  // Form konfigurasi yang punya mode lihat; form aksi cepat (clone, tipe, channel, exception, publish) selalu bisa diisi
  const VIEW_FORMS = ['setup.header', 'setup.saveBrands', 'setup.savePillars', 'setup.saveLmTargets', 'setup.saveFormulas',
    'setup.savePhaseForm', 'setup.saveLayers', 'setup.saveEligibility', 'setup.savePayoutRules', 'setup.saveThreshold', 'setup.saveDoc', 'setup.saveDocsConfig',
    'setup.saveLmExample', 'setup.saveScheme', 'setup.saveLimits', 'setup.saveTerms'];
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

  // ---------------------------------------------------------------- 2 · DRAFT langsung bisa diisi; mode lihat hanya untuk fase yang sudah PUBLISHED / CLOSED
  function setMode(form, mode) {
    const f = forms.get(form);
    const fs = form.querySelector(':scope > fieldset');
    const view = mode === 'view' || f.locked;
    form.classList.toggle('cps-viewing', view);
    if (fs && !f.locked) fs.disabled = view;
    if (view && !audit) formatNumbers(form); else restoreNumbers(form);
    f.dirty.clear();
  }

  let structN = 0;
  let lastDirty = null;
  function enhanceForm(form) {
    if (forms.has(form)) return;
    const fs = form.querySelector(':scope > fieldset');
    const isNew = form.dataset.action === 'setup.header' && !form.dataset.id;
    const f = { locked: !!(fs && fs.disabled), isNew, dirty: new Set() };
    forms.set(form, f);
    if (isNew) return; // program baru: tombol simpan form sendiri
    setMode(form, f.locked ? 'view' : 'edit');
    if (f.locked) return;
    // tombol simpan di dalam form diganti bar simpan di bawah layar (tetap dipakai sebagai submitter)
    form.querySelectorAll('button').forEach((b) => { if ((b.getAttribute('type') || 'submit') === 'submit') b.classList.add('cps-inline-save'); });
    const mark = (key) => { f.dirty.add(key); lastDirty = form; updateBar(); };
    form.addEventListener('input', (e) => mark(e.target));
    form.addEventListener('change', (e) => mark(e.target));
    // tambah / hapus / geser baris lewat tombol di form juga dihitung sebagai perubahan
    form.addEventListener('click', (e) => {
      const b = e.target.closest('button[type="button"], [data-act]');
      if (b && form.contains(b) && !b.closest('[data-cps-ui]')) mark('s' + (++structN));
    });
  }
  // Isi form yang digambar ulang oleh draw() saat mode lihat ikut diformat
  function refreshViewing(root) {
    if (audit) return;
    root.querySelectorAll('form.cps-viewing').forEach((form) => formatNumbers(form));
  }

  // ---------------------------------------------------------------- 2 · bar simpan menempel di bawah: N perubahan · Batal · Simpan · Simpan & lanjut
  let bar = null;
  const editableForms = () => [...document.querySelectorAll('#app .cps form[data-action]')].filter((x) => forms.has(x) && !forms.get(x).locked && !forms.get(x).isNew);
  const dirtyForms = () => editableForms().filter((x) => forms.get(x).dirty.size);
  const nextInfo = () => document.querySelector('#app [data-cps-next]');
  const isDirty = () => dirtyForms().length > 0;
  function saveTarget() { const d = dirtyForms(); return d.includes(lastDirty) ? lastDirty : d[0] || null; }

  // Bar ada di akhir .cps (sticky bawah, selebar isi); dibuat ulang setiap halaman digambar ulang
  function ensureBar() {
    const host = document.querySelector('#app .cps');
    if (bar && host.contains(bar)) return bar;
    bar = ui(`<div class="cps-savebar" hidden><div class="cps-savebar-in">
      <a class="btn btn-sm btn-ghost cps-savebar-prev" data-sb="prev"><i class="bi bi-arrow-left"></i> Kembali</a>
      <span class="cps-savebar-text"></span>
      <span class="cps-savebar-act">
        <button type="button" class="btn btn-sm btn-ghost" data-sb="cancel">Batal</button>
        <button type="button" class="btn btn-sm btn-outline-brand" data-sb="save"><i class="bi bi-save"></i> Simpan</button>
        <button type="button" class="btn btn-sm btn-brand" data-sb="next">Simpan & lanjut <i class="bi bi-arrow-right"></i></button>
        <a class="btn btn-sm btn-brand" data-sb="go">Lanjut <i class="bi bi-arrow-right"></i></a>
      </span></div></div>`);
    host.appendChild(bar);
    bar.addEventListener('click', (e) => {
      const b = e.target.closest('[data-sb]');
      if (!b) return;
      const act = b.dataset.sb;
      if (act === 'cancel') { if (confirm('Batalkan perubahan yang belum disimpan?')) UI.render(); return; }
      if (act === 'save' || act === 'next') save(act === 'next');
    });
    return bar;
  }
  function save(withNext) {
    const form = saveTarget();
    if (!form) return;
    const others = dirtyForms().filter((x) => x !== form);
    if (others.length && !confirm('Ada perubahan di bagian lain halaman ini yang belum disimpan dan akan hilang. Simpan bagian yang terakhir diubah saja?')) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const nx = nextInfo();
    UI.setNext(withNext && nx ? nx.dataset.cpsNext : null);
    const btn = form.querySelector('.cps-inline-save');
    form.requestSubmit(btn || undefined);
  }
  function updateBar() {
    const onSetup = !!document.querySelector('#app .cps');
    const list = onSetup ? editableForms() : [];
    const nx = onSetup ? nextInfo() : null;
    const show = !!(list.length || nx);
    if (!show) { if (bar) bar.hidden = true; return; }
    const b = ensureBar();
    b.hidden = false;
    const d = dirtyForms();
    const n = d.reduce((s, x) => s + forms.get(x).dirty.size, 0);
    b.classList.toggle('is-dirty', n > 0);
    b.querySelector('.cps-savebar-text').innerHTML = n ? `<i class="bi bi-pencil-square"></i> <strong>${n} perubahan</strong> belum disimpan${d.length > 1 ? ` di ${d.length} bagian` : ''}`
      : list.length ? '<i class="bi bi-check2"></i> Semua perubahan tersimpan' : '<i class="bi bi-lock"></i> Fase ini read-only';
    const label = nx ? nx.dataset.cpsNextLabel : '';
    const vis = (k, on) => { b.querySelector(`[data-sb="${k}"]`).hidden = !on; };
    const pv = document.querySelector('#app [data-cps-prev]');
    vis('cancel', n > 0); vis('save', n > 0); vis('next', n > 0 && !!nx); vis('go', !n && !!nx); vis('prev', !!pv);
    if (pv) { const a = b.querySelector('[data-sb="prev"]'); a.href = '#' + pv.dataset.cpsPrev; a.innerHTML = `<i class="bi bi-arrow-left"></i> ${h.esc(pv.dataset.cpsPrevLabel)}`; }
    if (nx) {
      b.querySelector('[data-sb="next"]').innerHTML = `Simpan & lanjut: ${h.esc(label)} <i class="bi bi-arrow-right"></i>`;
      const go = b.querySelector('[data-sb="go"]');
      go.href = '#' + nx.dataset.cpsNext;
      go.innerHTML = `Lanjut: ${h.esc(label)} <i class="bi bi-arrow-right"></i>`;
    }
  }
  // Pindah halaman (link / pemilih channel) saat masih ada perubahan → konfirmasi dulu
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#/"]');
    if (!a || !isDirty()) return;
    if (!confirm('Perubahan di halaman ini belum disimpan dan akan hilang. Tetap pindah?')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
  document.addEventListener('change', (e) => {
    const s = e.target.closest && e.target.closest('[data-cps-goto]');
    if (s) {
      if (isDirty() && !confirm('Perubahan di halaman ini belum disimpan dan akan hilang. Tetap pindah?')) { s.value = s.querySelector('option[selected]') ? s.querySelector('option[selected]').value : s.value; return; }
      location.hash = s.value;
      return;
    }
    const r = e.target.closest && e.target.closest('[data-cps-review]');
    if (r) setReview(r.checked);
  });

  // "Penjelasan lengkap" di judul langkah membuka panel Bantuan (hanya tampil bila halaman punya catatan panjang)
  document.addEventListener('click', (e) => { if (e.target.closest('[data-cps-help-open]')) openHelp(null); });
  document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('[data-cps-help-open]')) { e.preventDefault(); openHelp(null); } });

  // ---------------------------------------------------------------- catatan review (⚠, "Perlu konfirmasi", "Menyusul") disembunyikan kecuali toggle aktif
  const REVIEW_KEY = 'tradee2027-show-review';
  function getReview() { try { return localStorage.getItem(REVIEW_KEY) === '1'; } catch (e) { return false; } }
  function setReview(on) {
    try { localStorage.setItem(REVIEW_KEY, on ? '1' : '0'); } catch (e) { /* storage tidak tersedia */ }
    applyReview();
  }
  function applyReview() {
    const on = audit || getReview();
    document.body.classList.toggle('cps-review-on', on);
    document.querySelectorAll('[data-cps-review]').forEach((c) => { c.checked = on; });
  }

  // ---------------------------------------------------------------- 1 · catatan panjang pindah ke panel (?) Bantuan
  let drawer = null;
  const headTitle = (head) => {
    const c = head.cloneNode(true);
    c.querySelectorAll('[data-cps-ui], .cps-confirm, .cps-soon, .step-chip, .warn-mark, .btn, .cps-phase-st').forEach((x) => x.remove());
    return c.textContent.replace(/\s+/g, ' ').trim();
  };
  function ensureDrawer() {
    if (drawer) return drawer;
    drawer = ui(`<aside class="cps-help" hidden aria-label="Bantuan"><div class="cps-help-head"><strong><i class="bi bi-question-circle"></i> Bantuan</strong>
      <button type="button" class="btn btn-sm btn-ghost" data-help-close aria-label="Tutup"><i class="bi bi-x-lg"></i></button></div><div class="cps-help-body"></div></aside>`);
    document.body.appendChild(drawer);
    drawer.querySelector('[data-help-close]').addEventListener('click', () => { drawer.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer && !drawer.hidden) drawer.hidden = true; });
    window.addEventListener('hashchange', () => { if (drawer) drawer.hidden = true; });
    return drawer;
  }
  function openHelp(focusNote) {
    const d = ensureDrawer();
    const notes = [...document.querySelectorAll('#app .cps-help-src')];
    d.querySelector('.cps-help-body').innerHTML = '';
    let prevCard = null;
    notes.forEach((p) => {
      const card = p.closest('.card');
      const head = card.querySelector(':scope > .card-header');
      const sec = document.createElement('section');
      sec.className = 'cps-help-sec' + (p === focusNote ? ' is-focus' : '') + (card === prevCard ? ' is-cont' : '');
      sec.innerHTML = card === prevCard ? '' : `<h6>${h.esc(headTitle(head))}</h6>`;
      prevCard = card;
      const body = p.cloneNode(true);
      body.hidden = false;
      body.classList.remove('cps-help-src', 'small', 'text-muted', 'mb-3', 'mb-2', 'form-text');
      sec.appendChild(body);
      d.querySelector('.cps-help-body').appendChild(sec);
      if (p === focusNote) setTimeout(() => sec.scrollIntoView({ block: 'start' }), 0);
    });
    d.hidden = false;
  }
  function enhanceHelp(root) {
    // catatan pembuka kartu + penjelasan panjang lain langsung di badan kartu (teks kecil abu-abu / form-text)
    root.querySelectorAll('.cps .card-body > p.small.text-muted:first-child, .cps .card-body > div.small.text-muted, .cps .card-body > .form-text').forEach((p) => {
      if (bound.has(p) || p.textContent.trim().length < NOTE_MIN || p.querySelector('input, select, button, a.btn')) return;
      const head = p.closest('.card') && p.closest('.card').querySelector(':scope > .card-header');
      if (!head) return; // tanpa header kartu: dilipat seperti biasa (enhanceNotes)
      bound.add(p);
      p.classList.add('cps-help-src');
      p.hidden = !audit;
      if (!head.querySelector('.cps-help-btn') && !root.querySelector('[data-cps-help-open]')) { // halaman channel: cukup "Penjelasan lengkap" di judul langkah
        const btn = ui('<span class="cps-help-btn" role="button" tabindex="0" title="Penjelasan bagian ini"><i class="bi bi-question-circle"></i> Bantuan</span>');
        const act = head.querySelector(':scope > .btn, :scope > button, :scope > a.btn');
        if (act) act.before(btn); else head.appendChild(btn);
        btn.addEventListener('click', () => openHelp(p));
        btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openHelp(p); } });
      }
    });
  }

  // ---------------------------------------------------------------- catatan pendek tanpa header kartu dilipat
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

  // Bagian form (eligibility: Syarat pendaftaran · Pencairan: Syarat payout · Jadwal) = kotak bergaris yang bisa dilipat.
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
    if (!root || !root.querySelector('.cps')) { updateBar(); return; }
    root.querySelectorAll('.cps form[data-action]').forEach((form) => { if (VIEW_FORMS.includes(form.dataset.action)) enhanceForm(form); });
    enhanceHelp(root);
    const ho = root.querySelector('[data-cps-help-open]'); if (ho) ho.hidden = !root.querySelector('.cps-help-src');
    enhanceNotes(root);
    enhanceSections(root);
    enhanceClasses(root);
    enhanceLayers(root);
    enhancePhaseFields(root);
    refreshViewing(root);
    applyReview();
    updateBar();
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
      document.querySelectorAll('.cps .cps-help-src').forEach((x) => { x.hidden = false; });
      document.querySelectorAll('.cps tr.cps-cls-detail[hidden], .cps tr.cps-brand-detail[hidden]').forEach((x) => { x.hidden = false; });
      applyReview();
    },
  };
})();
