// Login demo, pilih / tambah tahun, ganti role, dashboard.
(function () {
  const { h, route, actions, clicks, session, done, go, flash, render } = UI;
  const { esc } = h;

  function userList() {
    return DB.t('users').map((u) => `
      <button type="button" class="list-group-item list-group-item-action d-flex justify-content-between" data-click="loginAs" data-id="${u.id}">
        <span><strong>${h.ROLE_LABEL[u.role]}</strong>${u.channel_codes ? ' · ' + u.channel_codes.join(', ') : ''}<br><span class="text-muted">${esc(u.email)}</span></span>
        <i class="flaticon2-right-arrow align-self-center kt-font-brand"></i>
      </button>`).join('');
  }

  // Kerangka halaman login-3 Tradee: background login6.png + kotak di kiri / tengah
  function loginShell(colLeft, colMain, inner) {
    return `<div class="kt-grid kt-grid--ver kt-grid--root kt-page">
      <div class="kt-grid kt-grid--hor kt-grid--root kt-login kt-login--v3 kt-login--signin" id="kt_login">
        <div class="login-bg"></div>
        <div class="login-wrap"><div class="row m-0">
          <div class="${colLeft}"></div>
          <div class="${colMain}">
            <div class="kt-grid__item kt-grid__item--fluid kt-login__wrapper"><div class="kt-login__container">
              <div class="kt-login__logo text-center">
                <a><img style="width:100%; max-width:400px; margin-bottom:10px" src="assets/paragon/tradee_highrest.png"></a><br>
                <a>powered by</a> <a><img style="width:100px" src="assets/paragon/logo-paragon-blue.png"></a>
              </div>
              ${inner}
            </div></div>
          </div>
        </div></div>
      </div></div>`;
  }

  route('/login', () => {
    if (UI.currentUser()) UI.redirect('/lobby');
    return {
      title: 'Login', bare: true, html: loginShell('col-lg-1', 'col-lg-4', `
        <div class="kt-login__signin">
          <div class="kt-login__head"><h3 class="kt-login__title">Sign In</h3></div>
          <!--flash-->
          <form data-action="login">
            <div class="input-group"><input class="form-control" type="text" placeholder="Email / username" name="email" autocomplete="off" required></div><br>
            <div class="input-group"><input class="form-control" type="password" placeholder="Password" name="password" required></div><br>
            <button type="submit" class="btn btn-brand btn-elevate kt-login__btn-primary">Sign In</button>
          </form>
          <div class="kt-portlet mt-4 demo-users"><div class="kt-portlet__body p-3">
            <div class="kt-font-bold mb-2">Akun demo prototype <span class="text-muted font-weight-normal small">(klik untuk masuk · password <code>${window.Seed.PASSWORD}</code>)</span></div>
            <div class="list-group small">${userList()}</div>
            <div class="small text-muted mt-2">Prototype front-end: tidak terhubung ke server, data dummy tersimpan di browser ini.</div>
          </div></div>
        </div>`),
    };
  }, { public: true });

  actions.login = (f) => {
    const u = DB.t('users').find((x) => x.email.toLowerCase() === String(f.get('email')).toLowerCase());
    if (!u || f.get('password') !== window.Seed.PASSWORD) { flash('danger', 'Wrong email or password!'); render(); return; }
    session.set({ userId: u.id });
    go('/lobby');
  };
  clicks.loginAs = (d) => {
    const s = session.get();
    session.set({ userId: Number(d.id) });
    go(s.year ? '/' : '/lobby');
  };
  clicks.goLobby = () => go('/lobby');
  clicks.toggleAside = () => { const a = document.getElementById('kt_aside'); if (a) a.classList.toggle('kt-aside--on'); };

  route('/logout', () => { session.clear(); UI.redirect('/login'); }, { noYear: true });

  route('/switch', ({}, q, { user }) => ({
    title: 'Ganti Role', bare: true, html: loginShell('col-lg-4', 'col-lg-4', `
      <div class="kt-login__signin">
        <div class="kt-login__head"><h3 class="kt-login__title">Ganti Role (demo)</h3></div>
        <p class="text-center text-muted">Sekarang: ${esc(user.name)} (${h.ROLE_LABEL[user.role]})</p>
        <div class="list-group small demo-users">${userList()}</div>
        <div class="text-center mt-3"><a href="#/" class="btn btn-secondary btn-sm">Batal</a></div>
      </div>`),
  }), { noYear: true });

  // ---------------------------------------------------------------- lobby (Choose Year)
  route('/lobby', ({}, q, { user }) => {
    const isHo = h.SETUP_ROLES.includes(user.role);
    const years = DB.t('years').filter((y) => y.is_active || isHo).sort((a, b) => a.year - b.year);
    return {
      title: 'Lobby', bare: true, html: loginShell('col-lg-4', 'col-lg-4', `
        <div class="kt-login__signin">
          <div class="kt-login__head" style="margin-bottom:10px"><h3 class="kt-login__title">Choose Year</h3></div>
          <!--flash-->
          <br>
          <div class="row">
            ${years.map((y) => `<div class="col-lg-4 mb-3"><button type="button" class="btn ${y.is_active ? 'btn-brand' : 'btn-secondary'} btn-elevate kt-login__btn-primary" style="width:100%"
              data-click="chooseYear" data-year="${y.year}" title="${y.is_active ? '' : 'Nonaktif'}"><p style="font-size:30px; margin:0px; font-weight:600">${y.year}</p></button></div>`).join('')}
          </div>
          ${isHo ? `<div class="kt-portlet mt-3"><div class="kt-portlet__body p-3">
            <div class="kt-font-bold mb-2">Tambah tahun program <span class="menu-new">BARU</span></div>
            <form data-action="addYear" class="d-flex gap-2">
              <input type="number" name="year" class="form-control" min="2020" max="2100" placeholder="${new Date().getFullYear() + 1}" required>
              <input type="text" name="note" class="form-control" placeholder="Catatan (opsional)">
              <button class="btn btn-brand">Tambah</button>
            </form>
            <div class="form-text small text-muted mt-2">Aktif/nonaktifkan: ${years.map((y) => `<a href="#" class="mr-2" data-click="toggleYear" data-year="${y.year}">${y.year} <i class="la la-toggle-${y.is_active ? 'on' : 'off'}"></i></a>`).join('')}</div>
          </div></div>` : ''}
          <div class="text-center mt-2"><span class="text-muted small">${esc(user.name)} (${h.ROLE_LABEL[user.role]}) · </span><a href="#/logout" class="small">Logout</a></div>
        </div>`),
    };
  }, { noYear: true });

  clicks.chooseYear = (d) => { session.set({ year: Number(d.year) }); go('/'); };
  clicks.toggleYear = (d) => { const y = DB.t('years').find((x) => x.year === Number(d.year)); y.is_active = !y.is_active; DB.save(); render(); };
  actions.addYear = (f) => {
    const year = Number(f.get('year'));
    if (!Number.isInteger(year) || year < 2020 || year > 2100) { flash('danger', 'Tahun tidak valid'); render(); return; }
    const ex = DB.t('years').find((y) => y.year === year);
    if (ex) ex.is_active = true; else DB.t('years').push({ year, is_active: true, note: f.get('note') || null });
    done('success', `Tahun ${year} ditambahkan. Silakan pilih tahun lalu buat program.`, '/lobby');
  };
  clicks.resetData = () => {
    if (!confirm('Kembalikan semua data demo ke kondisi awal? Semua perubahan Anda akan hilang.')) return;
    DB.reset();
    session.set({ year: 2027 });
    flash('success', 'Data demo sudah di-reset.');
    go('/');
  };

  // ---------------------------------------------------------------- dashboard
  route('/', ({}, q, { user, year }) => {
    const programs = DB.where('programs', (p) => p.year === year);
    const isHo = h.SETUP_ROLES.includes(user.role);
    const pending = UI.pendingFor(user, year);
    const cards = programs.map((p) => {
      const regs = DB.where('registrations', (x) => x.program_id === p.id);
      const pays = DB.where('payouts', (d) => regs.some((x) => x.id === d.registration_id));
      const sum = (st, comp) => pays.filter((d) => d.status === st && (!comp || d.component === comp)).reduce((s, d) => s + d.amount, 0);
      const chs = DB.where('programChannels', (c) => c.program_id === p.id).map((c) => {
        const ch = DB.t('channels').find((x) => x.code === c.channel_code) || {};
        return `<span class="mr-2">${esc(ch.name)} (${regs.filter((x) => x.program_channel_id === c.id && x.status !== 'rejected').length})</span>`;
      }).join('');
      const stat = (label, val) => `<div class="col-6 col-lg-3"><div class="stat bg-light rounded"><div class="label">${label}</div><div class="value">${val}</div></div></div>`;
      return `<div class="card mb-3">
        <div class="card-header d-flex justify-content-between align-items-center"><span>${esc(p.name)}&nbsp;<span class="text-muted fw-normal">· ${esc(p.code)}</span></span>${h.badge(p.status)}</div>
        <div class="card-body">
          <div class="row g-3">${stat('Registrasi disetujui', regs.filter((x) => x.status === 'approved').length)}${stat('Menunggu approval', regs.filter((x) => x.status === 'in_review').length)}
            ${stat('Dibayar · Conditional', h.rpShort(sum('paid', 'CONDITIONAL')))}${stat('Dibayar · Fix', h.rpShort(sum('paid', 'FIX')))}</div>
          <div class="d-flex gap-3 flex-wrap mt-3 small text-muted">
            <span><i class="bi bi-calendar3"></i> ${h.date(p.period_start)} – ${h.date(p.period_end)}</span>
            <span><i class="bi bi-diagram-3"></i> Channel: ${chs || '-'}</span>
          </div>
          <div class="mt-3 d-flex gap-2 flex-wrap">
            ${isHo ? `<a class="btn btn-sm btn-outline-brand" href="#/setup/${p.id}/header"><i class="bi bi-sliders"></i> Program Setup</a>` : ''}
            ${user.role === 'CBD' && p.status === 'PUBLISHED' ? '<a class="btn btn-sm btn-outline-brand" href="#/registration"><i class="bi bi-shop"></i> Registrasi toko</a><a class="btn btn-sm btn-outline-brand" href="#/monitoring"><i class="bi bi-camera"></i> Monitoring</a>' : ''}
            ${p.status !== 'DRAFT' ? `<a class="btn btn-sm btn-outline-brand" href="#/registration/participants?program=${p.id}"><i class="bi bi-people"></i> Peserta</a>
              <a class="btn btn-sm btn-outline-brand" href="#/payout/program/${p.id}"><i class="bi bi-cash-coin"></i> Payout</a>` : ''}
          </div>
        </div></div>`;
    }).join('');
    const tips = {
      ADMIN_HO: 'Coba: Program Setup → clone program / ubah kelas per brand, rumus, approval layer → Simulasi → Validasi & publish.',
      SUPERADMIN: 'Superadmin punya akses Program Setup yang sama dengan Admin HO, plus memantau audit log.',
      CBD: 'Coba: Registration → pilih channel → isi baseline & growth per brand. Lalu Monitoring → upload evidence per lead measure.',
      ADMIN_DC: 'Coba: Inbox Approval (layer Admin DC) atau Payout → ajukan Conditional / Fix.',
      ABL: 'Coba: Inbox Approval. Registrasi dengan growth per brand ≥ 70% sudah auto-approved di layer ABL.',
      CHADEV: 'Coba: Inbox Approval → layer akhir Registration.',
      FINANCE: 'Coba: Inbox Approval → payout Conditional / Fix.',
      HEAD_FINANCE: 'Coba: Inbox Approval → final approval payout.',
    };
    const n = pending.registration.length + pending.monitoring.length + pending.payout.length;
    return {
      title: 'Dashboard', html: `
      <div class="page-head"><div><h1>Dashboard ${year}</h1><div class="sub">Ringkasan program loyalty tahun ${year}</div></div>
        ${isHo ? '<a href="#/setup/new" class="btn btn-brand"><i class="bi bi-plus-lg"></i> Program baru</a>' : n ? `<a href="#/inbox" class="btn btn-brand"><i class="bi bi-inbox"></i> ${n} menunggu Anda</a>` : ''}</div>
      <div class="alert alert-light alert-elevate py-2 small"><i class="flaticon2-light kt-font-brand mr-2"></i> ${tips[user.role] || ''} Gunakan <a href="#/switch">Ganti role</a> untuk melihat alur dari sisi lain.</div>
      ${cards || `<div class="card"><div class="card-body text-center py-5"><i class="bi bi-inboxes fs-1 text-muted"></i><p class="mt-2 mb-3">Belum ada program di tahun ${year}.</p>
        ${isHo ? '<a href="#/setup/new" class="btn btn-brand">Buat program</a> <a href="#/setup" class="btn btn-outline-brand">Clone dari tahun lain</a>' : '<p class="text-muted small">Program dibuat oleh Admin HO lewat Program Setup.</p>'}</div></div>`}`,
    };
  });
})();
