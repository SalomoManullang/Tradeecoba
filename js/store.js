// "Database" di browser: tabel = array JS, disimpan ke localStorage.
// Tidak ada koneksi ke backend / server apa pun.
(function () {
  const KEY = 'tradee2027-fe-v2'; // v2: model data PRD v0.4 (data v1 tidak dipakai lagi)
  // Nama tabel mengikuti arsitektur v0.5 §4.1. Anak kecil (tier, kondisi auto-approve, sub-brand)
  // disimpan sebagai array di dalam baris induknya supaya prototype tetap sederhana.
  const TABLES = ['users', 'years', 'channels', 'brands', 'dcs', 'stores',
    'programTypes', 'programs', 'programChannels', 'programChannelBrands', 'programClasses',
    'programPillars', 'programJtbds', 'programLeadMeasures', 'programFormulas', 'programPhaseFields',
    'programApprovalLayers', 'programPayoutSchedules', 'programDocumentTemplates', 'programDocumentTemplateRevisions',
    'programAuditLogs', 'registrations', 'monitorings', 'payouts', 'approvalLogs', 'generatedDocuments'];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  const DB = {
    state: null,
    persistent: true,

    init() {
      this.state = load();
      if (!this.state) {
        this.state = window.Seed.build();
        this.save();
      }
    },
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.state));
      } catch (e) {
        this.persistent = false; // mis. private mode / storage penuh: tetap jalan di memori
      }
    },
    reset() {
      this.state = window.Seed.build();
      this.save();
    },
    t(name) {
      if (!this.state[name]) this.state[name] = [];
      return this.state[name];
    },
    nextId(name) {
      this.state.seq = this.state.seq || {};
      const max = this.t(name).reduce((m, r) => Math.max(m, r.id || 0), 0);
      this.state.seq[name] = Math.max(this.state.seq[name] || 0, max) + 1;
      return this.state.seq[name];
    },
    insert(name, row) {
      const r = Object.assign({}, row, { id: this.nextId(name) }); // id selalu baru
      this.t(name).push(r);
      return r;
    },
    byId(name, id) {
      return this.t(name).find((r) => r.id === Number(id)) || null;
    },
    where(name, pred) {
      return this.t(name).filter(pred);
    },
    remove(name, pred) {
      const before = this.t(name).length;
      this.state[name] = this.t(name).filter((r) => !pred(r));
      return before - this.state[name].length;
    },
    TABLES,
  };

  window.DB = DB;
})();
