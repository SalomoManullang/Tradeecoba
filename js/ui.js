// Kerangka UI: helper format, router hash, session demo, layout, form & aksi.
(function () {
  // ---------------------------------------------------------------- helper format
  const ROLE_LABEL = { ADMIN_HO: 'Admin HO', SUPERADMIN: 'Admin IT (Superadmin)', CBD: 'CBD / CDT', ADMIN_DC: 'Admin DC', ABL: 'ABL',
    CHADEV: 'Chadev', FINANCE: 'Finance', HEAD_FINANCE: 'Head of Finance' };
  // Hanya Admin HO & Superadmin yang boleh membuka Program Setup (PRD FR13)
  const SETUP_ROLES = ['ADMIN_HO', 'SUPERADMIN'];
  const STATUS = {
    DRAFT: ['Draft', 'secondary'], PUBLISHED: ['Published', 'success'], CLOSED: ['Closed', 'dark'],
    in_review: ['Menunggu approval', 'warning'], approved: ['Disetujui', 'success'], rejected: ['Ditolak', 'danger'],
    returned: ['Dikembalikan', 'info'], paid: ['Dibayar', 'success'],
  };
  const FIELD_TYPES = window.Catalog.FIELD_TYPES;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const num = (n, d = 0) => (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) ? '-'
    : Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
  const rp = (n) => (n === null || n === undefined || n === '') ? '-' : 'Rp ' + num(n);
  function rpShort(n) {
    if (n === null || n === undefined) return '-';
    const a = Math.abs(n);
    if (a >= 1e9) return num(n / 1e9, 2) + ' M';
    if (a >= 1e6) return num(n / 1e6, 1) + ' jt';
    if (a >= 1e3) return num(n / 1e3, 0) + ' rb';
    return num(n);
  }
  const pct = (n, d = 1) => (n === null || n === undefined || Number.isNaN(Number(n))) ? '-' : num(n, d) + '%';
  function date(d) {
    if (!d) return '-';
    const [y, m, dd] = String(d).slice(0, 10).split('-');
    return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`;
  }
  const datetime = (d) => d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';
  function month(d) { const [y, m] = String(d).slice(0, 7).split('-'); return `${MONTHS[Number(m) - 1]} ${y.slice(2)}`; }
  function badge(status) {
    const [l, c] = STATUS[status] || [status, 'secondary'];
    return `<span class="kt-badge kt-badge--inline kt-badge--pill kt-badge--${c === 'secondary' ? 'metal' : c}">${l}</span>`;
  }
  const cls = (name) => `<span class="class-pill">${esc(name)}</span>`;
  const sel = (cond) => (cond ? 'selected' : '');
  const chk = (cond) => (cond ? 'checked' : '');
  // Parse angka input: "70000000", "70.000.000", "2,5"
  function toNum(v) {
    if (v === undefined || v === null) return null;
    let s = String(v).trim().replace(/\s|_/g, '');
    if (s === '') return null;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  const h = { ROLE_LABEL, SETUP_ROLES, STATUS, FIELD_TYPES, MONTHS, esc, num, rp, rpShort, pct, date, datetime, month, badge, cls, sel, chk, toNum };

  // ---------------------------------------------------------------- session demo
  const SKEY = 'tradee2027-fe-session';
  const session = {
    get() { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch (e) { return {}; } },
    set(v) { try { localStorage.setItem(SKEY, JSON.stringify(Object.assign(this.get(), v))); } catch (e) { /* abaikan */ } },
    clear() { try { localStorage.removeItem(SKEY); } catch (e) { /* abaikan */ } },
  };
  function currentUser() { const s = session.get(); return s.userId ? DB.byId('users', s.userId) : null; }
  function currentYear() { return session.get().year || null; }

  // Scope user (DC / channel). null = semua
  function inScope(user, store) {
    if (user.dc_codes && user.dc_codes.length && !user.dc_codes.includes(store.dc_code)) return false;
    if (user.channel_codes && user.channel_codes.length && !user.channel_codes.includes(store.channel_code)) return false;
    return true;
  }
  const store = (cid) => DB.t('stores').find((s) => s.customer_id === cid);

  // ---------------------------------------------------------------- router
  const routes = [];
  function route(pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
    routes.push({ re, keys, handler, opts });
  }
  function parseHash() {
    const raw = decodeURIComponent(location.hash.replace(/^#/, '')) || '/';
    const [path, qs] = raw.split('?');
    return { path: path || '/', query: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  function go(path) {
    if (location.hash === '#' + path) render(); else location.hash = path;
  }

  let flashMsg = null;
  function flash(type, message) { flashMsg = { type, message }; }

  class Redirect { constructor(to) { this.to = to; } }
  class HttpError { constructor(title, message) { this.title = title; this.message = message || ''; } }
  const redirect = (to) => { throw new Redirect(to); };
  const fail = (title, message) => { throw new HttpError(title, message); };
  function requireRole(...roles) { if (!roles.includes(currentUser().role)) fail('Tidak ada akses', 'Halaman ini tidak tersedia untuk role Anda.'); }
  const requireSetup = () => { if (!SETUP_ROLES.includes(currentUser().role)) fail('Akses ditolak', 'Program Setup hanya untuk Admin HO dan Admin IT (Superadmin).'); };

  function render() {
    const { path, query } = parseHash();
    const user = currentUser();
    const year = currentYear();
    const r = routes.find((x) => x.re.test(path));
    let page;
    try {
      if (!r) fail('Halaman tidak ditemukan', `Tidak ada halaman ${path}`);
      if (!r.opts.public && !user) redirect('/login');
      if (!r.opts.public && !r.opts.noYear && !year) redirect('/lobby');
      const m = path.match(r.re);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
      page = r.handler(params, query, { user, year, path });
    } catch (e) {
      if (e instanceof Redirect) { go(e.to); return; }
      if (e instanceof HttpError) page = { title: e.title, html: errorHtml(e.title, e.message), bare: !user || !year };
      else { console.error(e); page = { title: 'Terjadi kesalahan', html: errorHtml('Terjadi kesalahan', e.message), bare: !user || !year }; }
    }
    document.title = (page.title ? page.title + ' · ' : '') + 'Trade Promo PTI';
    const app = document.getElementById('app');
    const fl = flashMsg; flashMsg = null;
    const flashHtml = fl ? flashAlert(fl.type, fl.message) : '';
    if (page.bare) {
      document.body.className = '';
      app.innerHTML = page.html.includes('<!--flash-->') ? page.html.replace('<!--flash-->', flashHtml) : flashHtml + page.html;
    } else {
      document.body.className = BODY_CLASS;
      app.innerHTML = layout(path, user, year, flashHtml + page.html);
      bindMenus(app);
    }
    window.scrollTo(0, 0);
    if (page.after) page.after(document.getElementById('app'));
  }

  // Alert dengan markup yang sama seperti flashdata di aplikasi Tradee
  function flashAlert(type, message) {
    const icon = { success: 'flaticon2-check-mark', danger: 'flaticon-danger', warning: 'flaticon-warning', info: 'flaticon2-information' }[type] || 'flaticon2-information';
    return `<div class="alert alert-${type} fade show" role="alert">
      <div class="alert-icon"><i class="${icon}"></i></div>
      <div class="alert-text">${message}</div>
      <div class="alert-close"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true"><i class="la la-close"></i></span></button></div>
    </div>`;
  }

  function errorHtml(title, message) {
    return `<div class="kt-portlet kt-margin-top-30"><div class="kt-portlet__body">
      <h3 class="kt-font-bold"><i class="flaticon-warning kt-font-warning"></i> ${esc(title)}</h3>
      <p class="text-muted">${esc(message)}</p><div><a href="javascript:history.back()" class="btn btn-secondary btn-sm">Kembali</a>
      <a href="#/" class="btn btn-brand btn-sm">Dashboard</a></div></div></div>`;
  }

  // Data (registration / monitoring / payout) yang sedang menunggu di layer milik role user
  function pendingFor(user, year) {
    const progIds = DB.where('programs', (p) => p.year === year).map((p) => p.id);
    const mine = (rec) => { const l = rec.current_layer_id && DB.byId('programApprovalLayers', rec.current_layer_id); return !!l && l.role_code === user.role; };
    const regOk = (r) => r && progIds.includes(r.program_id) && inScope(user, store(r.customer_id));
    return {
      registration: DB.where('registrations', (r) => r.status === 'in_review' && mine(r) && regOk(r)),
      monitoring: DB.where('monitorings', (m) => m.status === 'in_review' && mine(m) && regOk(DB.byId('registrations', m.registration_id))),
      payout: DB.where('payouts', (x) => x.status === 'in_review' && mine(x) && regOk(DB.byId('registrations', x.registration_id))),
    };
  }
  function inboxCount(user, year) { const p = pendingFor(user, year); return p.registration.length + p.monitoring.length + p.payout.length; }

  // ---------------------------------------------------------------- layout Metronic (sama dengan Tradee)
  const BODY_CLASS = 'kt-quick-panel--right kt-demo-panel--right kt-offcanvas-panel--right kt-header--fixed kt-header-mobile--fixed ' +
    'kt-subheader--enabled kt-subheader--transparent kt-aside--enabled kt-aside--fixed kt-aside--minimize';
  const PROGRAM_ICON = ['flaticon2-shopping-cart-1', 'flaticon2-gift', 'flaticon2-percentage', 'flaticon2-cube', 'flaticon2-delivery-package'];

  const mBadge = (n, color = 'brand') => (n > 0 ? `<span class="kt-menu__link-badge"><span class="kt-badge kt-badge--${color} kt-badge--rounded">${n}</span></span>` : '');

  // Menu header (horizontal) per role — pola sama dengan header/adminsalesHO.php dkk.
  function headerMenu(user, year, path) {
    const is = (...roles) => roles.includes(user.role);
    const programs = DB.where('programs', (p) => p.year === year);
    const published = programs.filter((p) => p.status === 'PUBLISHED');
    const running = programs.filter((p) => p.status !== 'DRAFT');
    const icon = (p) => PROGRAM_ICON[(p.id - 1) % PROGRAM_ICON.length];
    const n = inboxCount(user, year);
    const chs = (p) => DB.where('programChannels', (c) => c.program_id === p.id &&
      (!user.channel_codes || !user.channel_codes.length || user.channel_codes.includes(c.channel_code)));
    const chName = (c) => (DB.t('channels').find((x) => x.code === c.channel_code) || {}).name;
    const items = [{ label: `Dashboard ${ROLE_LABEL[user.role]}`, href: '/', active: path === '/' }];

    if (is(...SETUP_ROLES)) {
      items.push({ label: 'Program Setup', isNew: true, active: path.startsWith('/setup'), children: [
        ...programs.map((p) => ({ label: `${p.name} (${p.code})`, icon: icon(p), href: `/setup/${p.id}/header`, badge: STATUS[p.status][0] })),
        { label: 'Program baru', icon: 'flaticon2-plus', href: '/setup/new' },
        { label: 'Daftar & clone program', icon: 'flaticon2-copy', href: '/setup' },
      ] });
    }
    if (is('CBD')) {
      items.push({ label: 'Registration', active: path.startsWith('/registration/program') || path === '/registration', children: [
        ...published.map((p) => ({ label: p.name, icon: icon(p), children: chs(p).map((c) => ({ label: chName(c), icon: 'flaticon2-architecture-and-city', href: `/registration/program/${p.id}/${c.id}` })) })),
        { label: 'Semua program', icon: 'flaticon2-list-2', href: '/registration' },
      ] });
      items.push({ label: 'Monitoring', active: path.startsWith('/monitoring'), href: '/monitoring' });
    }
    items.push({ label: 'Approval', badge: n, active: path.startsWith('/inbox') || path.startsWith('/registration/participant'), children: [
      { label: 'Inbox Approval', icon: 'flaticon2-checkmark', href: '/inbox', badge: n },
      { label: 'Peserta', icon: 'flaticon-customer', href: '/registration/participants' },
    ] });
    if (is('ADMIN_DC', 'FINANCE', 'HEAD_FINANCE', ...SETUP_ROLES)) {
      items.push({ label: 'Payout', active: path.startsWith('/payout'), children: running.map((p) => ({ label: p.name, icon: icon(p), href: `/payout/program/${p.id}` }))
        .concat([{ label: 'Ringkasan payout', icon: 'flaticon2-list-2', href: '/payout' }]) });
    }
    return items;
  }

  function renderHeaderItem(it) {
    const label = `<span class="kt-menu__link-text">${esc(it.label)}${it.isNew ? '<span class="menu-new">BARU</span>' : ''}</span>`;
    if (!it.children) {
      return `<li class="kt-menu__item ${it.active ? 'kt-menu__item--active' : ''}" aria-haspopup="true"><a href="#${it.href}" class="kt-menu__link">${label}</a></li>`;
    }
    return `<li class="kt-menu__item kt-menu__item--submenu kt-menu__item--rel ${it.active ? 'kt-menu__item--active' : ''}" data-hmenu aria-haspopup="true">
      <a href="javascript:;" class="kt-menu__link kt-menu__toggle">${label}${mBadge(it.badge)}<i class="kt-menu__hor-arrow la la-angle-down"></i></a>
      <div class="kt-menu__submenu kt-menu__submenu--classic kt-menu__submenu--left"><ul class="kt-menu__subnav">${it.children.map(renderSubItem).join('') ||
        '<li class="kt-menu__item"><span class="kt-menu__link"><span class="kt-menu__link-text text-muted">Belum ada</span></span></li>'}</ul></div></li>`;
  }

  function renderSubItem(it) {
    const badge = typeof it.badge === 'string' ? `<span class="kt-menu__link-badge"><span class="kt-badge kt-badge--metal kt-badge--inline">${esc(it.badge)}</span></span>` : mBadge(it.badge);
    const inner = `<i class="kt-menu__link-icon ${it.icon || 'flaticon2-architecture-and-city'}"></i><span class="kt-menu__link-text">${esc(it.label)}</span>${badge}`;
    if (!it.children) return `<li class="kt-menu__item" aria-haspopup="true"><a href="#${it.href}" class="kt-menu__link">${inner}</a></li>`;
    return `<li class="kt-menu__item kt-menu__item--submenu" data-hover aria-haspopup="true">
      <a href="javascript:;" class="kt-menu__link kt-menu__toggle">${inner}<i class="kt-menu__hor-arrow la la-angle-right"></i></a>
      <div class="kt-menu__submenu kt-menu__submenu--classic kt-menu__submenu--right"><ul class="kt-menu__subnav">${it.children.map(renderSubItem).join('') ||
        '<li class="kt-menu__item"><span class="kt-menu__link"><span class="kt-menu__link-text text-muted">Belum ada</span></span></li>'}</ul></div></li>`;
  }

  // Menu aside (ikon di kiri, submenu melayang) — pola sama dengan sidebar/sidebar-awal.php
  function asideMenu(user) {
    const is = (...roles) => roles.includes(user.role);
    const groups = [
      { icon: 'flaticon-customer', title: 'Status Peserta', items: [['Disetujui', '/registration/participants?status=approved'], ['Menunggu approval', '/registration/participants?status=in_review'],
        ['Dikembalikan', '/registration/participants?status=returned'], ['Ditolak', '/registration/participants?status=rejected']] },
      { icon: 'flaticon2-graph-1', title: 'Monitoring & Payout', items: [['Monitoring', '/monitoring'], ['Ringkasan payout', '/payout'], ['Inbox approval', '/inbox']] },
      { icon: 'flaticon2-layers-1', title: 'Master Data', items: [
        ...(is(...SETUP_ROLES) ? [['Data Sell Out', '/master/sales']] : []), ['Master Toko', '/master/stores'],
        ...(is(...SETUP_ROLES) ? [['Channel & Brand', '/master/data']] : [])] },
    ];
    if (is(...SETUP_ROLES)) groups.splice(1, 0, { icon: 'flaticon2-settings', title: 'Program Setup', items: [['Daftar program', '/setup'], ['Program baru', '/setup/new']] });
    return groups.map((g) => `<li class="kt-menu__item kt-menu__item--submenu" data-hover aria-haspopup="true">
      <a href="javascript:;" class="kt-menu__link kt-menu__toggle" title="${esc(g.title)}"><i class="kt-menu__link-icon ${g.icon}"></i><span class="kt-menu__link-text"></span><i class="kt-menu__ver-arrow ${g.icon}"></i></a>
      <div class="kt-menu__submenu"><span class="kt-menu__arrow"></span><div class="kt-menu__wrapper"><ul class="kt-menu__subnav">
        <li class="kt-menu__item kt-menu__item--parent kt-menu__item--submenu-fullheight" aria-haspopup="true"><span class="kt-menu__link"><span class="kt-menu__link-text">${esc(g.title)}</span></span></li>
        ${g.items.map(([l, href]) => `<li class="kt-menu__item" aria-haspopup="true"><a href="#${href}" class="kt-menu__link"><i class="kt-menu__link-bullet kt-menu__link-bullet--line"><span></span></i><span class="kt-menu__link-text">${esc(l)}</span></a></li>`).join('')}
      </ul></div></div></li>`).join('');
  }

  function yearDropdown() {
    const years = DB.t('years').filter((y) => y.is_active).sort((a, b) => a.year - b.year);
    return `<div class="kt-user-card kt-user-card--skin-light kt-notification-item-padding-x" style="padding-bottom:0px">
        <div class="kt-user-card__name">Choose Year <small>to change Tradee Cycle</small></div></div>
      <div class="kt-user-card kt-user-card--skin-light kt-notification-item-padding-x"><div class="row">
        ${years.map((y) => `<div class="col-lg-4 mb-2"><button type="button" class="btn btn-brand btn-elevate kt-login__btn-primary" style="width:100%" data-click="chooseYear" data-year="${y.year}">
          <p style="font-size:30px; margin:0px; font-weight:600">${y.year}</p></button></div>`).join('')}
      </div></div>`;
  }

  function layout(path, user, year, content) {
    const logo = 'assets/paragon/tradee1.png';
    return `
    <div id="kt_header_mobile" class="kt-header-mobile kt-header-mobile--fixed">
      <div class="kt-header-mobile__logo"><a href="#/"><img alt="Logo" src="${logo}" style="height:30px" /></a></div>
      <div class="kt-header-mobile__toolbar"><button class="kt-header-mobile__toolbar-toggler kt-header-mobile__toolbar-toggler--left" data-click="toggleAside"><span></span></button></div>
    </div>
    <div class="kt-grid kt-grid--hor kt-grid--root">
      <div class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--ver kt-page">

        <div class="kt-aside kt-aside--fixed kt-grid__item kt-grid kt-grid--desktop kt-grid--hor-desktop" id="kt_aside">
          <div class="kt-grid__item" id="kt_aside_brand">
            <div class="kt-aside__brand-logo">
              <a href="#/"><img style="width:100px; margin-top:20px; margin-bottom:10px; padding:0px" alt="Logo" src="${logo}" /></a>
              <button class="btn btn-info btn-elevate kt-login__btn-primary" style="width:100%; padding:inherit; background-color:lightgrey; border-color:lightgrey" data-click="goLobby" title="Ganti tahun">
                <p style="font-size:20px; margin:0px; font-weight:600">${year}</p>
              </button>
            </div>
          </div>
          <div class="kt-aside-menu-wrapper kt-grid__item kt-grid__item--fluid" id="kt_aside_menu_wrapper">
            <div id="kt_aside_menu" class="kt-aside-menu kt-aside-menu--dropdown" data-ktmenu-vertical="1" data-ktmenu-dropdown="1" data-ktmenu-scroll="0">
              <ul class="kt-menu__nav">${asideMenu(user)}</ul>
            </div>
          </div>
        </div>

        <div class="kt-grid__item kt-grid__item--fluid kt-grid kt-grid--hor kt-wrapper" id="kt_wrapper">
          <div id="kt_header" class="kt-header kt-grid kt-grid--ver kt-header--fixed">
            <div class="kt-header-menu-wrapper kt-grid__item kt-grid__item--fluid" id="kt_header_menu_wrapper">
              <div id="kt_header_menu" class="kt-header-menu kt-header-menu-mobile kt-header-menu--layout-">
                <ul class="kt-menu__nav">${headerMenu(user, year, path).map(renderHeaderItem).join('')}</ul>
              </div>
            </div>
            <div class="kt-header__topbar">
              <div class="kt-header__topbar-item kt-header__topbar-item--user">
                <div class="kt-header__topbar-wrapper" data-toggle="dropdown" data-offset="10px,0px" title="Ganti tahun">
                  <span class="kt-header__topbar-icon" style="background-color:coral"><i class="flaticon2-calendar-1"></i></span>
                </div>
                <div class="dropdown-menu dropdown-menu-fit dropdown-menu-right dropdown-menu-anim dropdown-menu-xl">${yearDropdown()}</div>
              </div>
              <div class="kt-header__topbar-item kt-header__topbar-item--user">
                <div class="kt-header__topbar-wrapper" data-toggle="dropdown" data-offset="10px,0px">
                  <span class="kt-header__topbar-icon"><i class="flaticon2-user-outline-symbol"></i></span>
                </div>
                <div class="dropdown-menu dropdown-menu-fit dropdown-menu-right dropdown-menu-anim dropdown-menu-xl">
                  <div class="kt-user-card kt-user-card--skin-light kt-notification-item-padding-x">
                    <div class="kt-user-card__avatar"><img alt="Pic" src="assets/paragon/logo-paragon.png" /></div>
                    <div class="kt-user-card__name">${esc(user.name)}<br><small>Role: ${ROLE_LABEL[user.role]}${user.channel_codes ? ' · ' + esc(user.channel_codes.join(', ')) : ''}</small></div>
                  </div>
                  <div class="kt-notification">
                    <a href="#/switch" class="kt-notification__item"><div class="kt-notification__item-icon"><i class="flaticon2-avatar kt-font-brand"></i></div>
                      <div class="kt-notification__item-details"><div class="kt-notification__item-title kt-font-bold">Ganti role (demo)</div>
                        <div class="kt-notification__item-time">Coba alur dari sisi Admin HO, CBD/CDT, approver, Finance</div></div></a>
                    <a href="#" class="kt-notification__item" data-click="resetData"><div class="kt-notification__item-icon"><i class="flaticon2-refresh kt-font-warning"></i></div>
                      <div class="kt-notification__item-details"><div class="kt-notification__item-title kt-font-bold">Reset data demo</div>
                        <div class="kt-notification__item-time">Kembalikan data dummy ke kondisi awal</div></div></a>
                    <div class="kt-notification__custom kt-space-between"><a></a>
                      <a href="#/logout" class="btn btn-label btn-label-danger btn-sm btn-bold">Logout</a></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="kt-content kt-grid__item kt-grid__item--fluid kt-grid kt-grid--hor" id="kt_content">
            <div class="kt-container kt-container--fluid kt-grid__item kt-grid__item--fluid">${content}</div>
          </div>

          <div class="kt-footer kt-grid__item kt-grid kt-grid--desktop kt-grid--ver-desktop" id="kt_footer">
            <div class="kt-container kt-container--fluid">
              <div class="kt-footer__copyright">2020&nbsp;&copy;&nbsp;PT Paragon Technology and Innovation</div>
              <div class="kt-footer__menu proto-note">Prototype front-end 2027 · tanpa backend · data dummy di browser ini ·
                <a href="#" data-click="resetData">Reset data demo</a></div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // Submenu Metronic dibuka dengan class kt-menu__item--hover (tanpa KTMenu)
  function bindMenus(root) {
    root.querySelectorAll('[data-hmenu] > .kt-menu__link').forEach((a) => a.addEventListener('click', (e) => {
      e.preventDefault();
      const li = a.parentElement;
      const open = li.classList.contains('kt-menu__item--hover');
      root.querySelectorAll('[data-hmenu].kt-menu__item--hover').forEach((x) => x.classList.remove('kt-menu__item--hover'));
      if (!open) li.classList.add('kt-menu__item--hover');
    }));
    root.querySelectorAll('[data-hover]').forEach((li) => {
      li.addEventListener('mouseenter', () => li.classList.add('kt-menu__item--hover'));
      li.addEventListener('mouseleave', () => li.classList.remove('kt-menu__item--hover'));
      li.querySelector(':scope > .kt-menu__link').addEventListener('click', (e) => { e.preventDefault(); li.classList.toggle('kt-menu__item--hover'); });
    });
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-hmenu]')) document.querySelectorAll('[data-hmenu].kt-menu__item--hover').forEach((x) => x.classList.remove('kt-menu__item--hover'));
  });

  // ---------------------------------------------------------------- form & aksi
  const actions = {};
  const clicks = {};

  function formData(form, submitter) {
    const fd = new FormData(form);
    if (submitter && submitter.name) fd.append(submitter.name, submitter.value);
    return {
      get: (k) => { const v = fd.get(k); return v === null ? null : String(v); },
      all: (k) => fd.getAll(k).map(String),
      has: (k) => fd.has(k),
      entries: () => [...fd.entries()],
      file: (k) => fd.get(k),
      fd,
    };
  }

  document.addEventListener('click', (e) => {
    const c = e.target.closest('[data-confirm]');
    if (c && !confirm(c.dataset.confirm)) { e.preventDefault(); e.stopImmediatePropagation(); return; }
    const k = e.target.closest('[data-click]');
    if (k) {
      e.preventDefault();
      try { clicks[k.dataset.click](k.dataset, k); } catch (err) { flash('danger', esc(err.message)); render(); }
    }
  }, true);

  document.addEventListener('change', (e) => {
    const name = e.target.dataset && e.target.dataset.checkAll;
    if (name) document.querySelectorAll(`input[name="${name}"]`).forEach((c) => { c.checked = e.target.checked; });
  });

  document.addEventListener('submit', async (e) => {
    const form = e.target;
    const name = form.dataset.action;
    if (!name) return;
    e.preventDefault();
    try {
      await actions[name](formData(form, e.submitter), form);
    } catch (err) {
      if (err instanceof Redirect) { go(err.to); return; }
      console.error(err);
      showFormError(form, esc(err.message));
    }
  });

  // Gagal simpan: error tampil di atas form tanpa menggambar ulang halaman, jadi isian yang belum tersimpan tidak hilang
  function showFormError(form, message) {
    document.querySelectorAll('.js-form-error').forEach((x) => x.remove());
    form.insertAdjacentHTML('beforebegin', `<div class="js-form-error">${flashAlert('danger', message)}</div>`);
    form.previousElementSibling.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // Input angka: scroll mouse tidak mengubah nilai, dan klik langsung memilih seluruh isi (ketikan baru mengganti)
  const isNumberInput = (t) => t instanceof HTMLInputElement && t.type === 'number';
  document.addEventListener('wheel', (e) => { if (isNumberInput(e.target) && e.target === document.activeElement) e.target.blur(); }, { passive: true });
  document.addEventListener('focusin', (e) => { if (isNumberInput(e.target) && !e.target.readOnly) { e.target.select(); e.target.dataset.justFocused = '1'; } });
  document.addEventListener('focusout', (e) => { if (isNumberInput(e.target)) delete e.target.dataset.justFocused; });
  document.addEventListener('mouseup', (e) => {
    if (isNumberInput(e.target) && e.target.dataset.justFocused) { delete e.target.dataset.justFocused; e.preventDefault(); } // mouseup biasanya membatalkan seleksi
  });

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // CSV sederhana (mendukung tanda kutip)
  function parseCsv(text) {
    const rows = []; let row = []; let cur = ''; let q = false;
    text = text.replace(/^﻿/, '');
    const sep = (text.split('\n')[0].match(/;/g) || []).length > (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = ''; if (row.some((v) => v.trim() !== '')) rows.push(row); row = [];
      } else cur += ch;
    }
    row.push(cur); if (row.some((v) => v.trim() !== '')) rows.push(row);
    return rows.map((r) => r.map((v) => v.trim()));
  }
  function toCsv(rows) {
    const q = (v) => `"${String(v === null || v === undefined ? '' : v).replace(/"/g, '""')}"`;
    return '﻿' + rows.map((r) => r.map(q).join(',')).join('\n');
  }

  // ---------------------------------------------------------------- partial
  // Input untuk field fase (programPhaseField). Nama input: prefix + field_key.
  function fieldInput(f, value, opts = {}) {
    const name = (opts.prefix || 'f_') + f.field_key;
    const v = value === undefined || value === null ? '' : value;
    const dis = opts.disabled || f.is_editable === false || f.mode === 'CALCULATED' ? 'disabled' : '';
    const req = f.is_required && !dis && !(f.data_type === 'FILE' && v) ? 'required' : '';
    const has = (x) => x !== null && x !== undefined && x !== '';
    const mm = `${has(f.min_value) ? `min="${f.min_value}"` : ''} ${has(f.max_value) ? `max="${f.max_value}"` : ''}`;
    let input;
    if (f.data_type === 'OPTION') input = `<select class="form-control" id="${name}" name="${name}" ${req} ${dis}><option value="">- pilih -</option>${(f.options || []).map((o) => `<option ${sel(String(v) === o)}>${esc(o)}</option>`).join('')}</select>`;
    else if (['NUMBER', 'RUPIAH', 'PERCENT'].includes(f.data_type)) {
      input = `<div class="input-group">${f.data_type === 'RUPIAH' ? '<span class="input-group-text">Rp</span>' : ''}
        <input type="number" step="any" class="form-control" id="${name}" name="${name}" value="${esc(v)}" ${mm} ${req} ${dis}>
        ${f.data_type === 'PERCENT' ? '<span class="input-group-text">%</span>' : ''}</div>`;
    } else if (f.data_type === 'FILE') {
      input = `<input type="file" class="form-control" id="${name}" name="${name}" ${req} ${dis}><input type="hidden" name="${name}__prev" value="${esc(v)}">
        ${v ? `<div class="form-text"><i class="bi bi-paperclip"></i> ${esc(v)}</div>` : ''}`;
    } else input = `<input type="${f.data_type === 'DATE' ? 'date' : 'text'}" class="form-control" id="${name}" name="${name}" value="${esc(v)}" ${req} ${dis}>`;
    if (opts.bare) return input;
    return `<div class="mb-3"><label class="form-label" for="${name}">${esc(f.label)}${f.is_required ? ' <span class="text-danger">*</span>' : ''}</label>
      ${input}${f.mode === 'CALCULATED' ? '<div class="form-text">Dihitung otomatis</div>' : ''}</div>`;
  }

  // Validasi nilai field fase. read(nama) → nilai mentah; file(nama) → File atau null.
  function readFieldValues(fields, read, file, prefix = 'f_') {
    const values = {}; const errors = [];
    const has = (x) => x !== null && x !== undefined && x !== '';
    for (const f of fields) {
      if (f.mode === 'CALCULATED' || f.is_editable === false || !f.is_visible) continue;
      const name = prefix + f.field_key;
      let v;
      if (f.data_type === 'FILE') {
        const fl = file ? file(name) : null;
        v = fl && fl.name ? fl.name : String(read(name + '__prev') || '');
      } else { const raw = read(name); v = String(raw === null || raw === undefined ? '' : raw).trim(); }
      if (['NUMBER', 'RUPIAH', 'PERCENT'].includes(f.data_type) && v !== '') {
        const n = toNum(v);
        if (n === null) { errors.push(`${f.label} harus berupa angka`); continue; }
        if (has(f.min_value) && n < Number(f.min_value)) { errors.push(`${f.label} minimal ${f.min_value}`); continue; }
        if (has(f.max_value) && n > Number(f.max_value)) { errors.push(`${f.label} maksimal ${f.max_value}`); continue; }
        v = n;
      } else if (f.data_type === 'OPTION' && v !== '' && !(f.options || []).includes(v)) { errors.push(`${f.label}: pilihan tidak valid`); continue; }
      if (f.is_required && v === '') { errors.push(`${f.label} wajib diisi`); continue; }
      if (v !== '') values[f.field_key] = v;
    }
    return { values, errors };
  }

  function logHtml(entity, id) {
    const ACT = { SUBMITTED: ['Diajukan', 'primary', 'send'], RESUBMITTED: ['Diajukan ulang', 'primary', 'arrow-repeat'], APPROVED: ['Disetujui', 'success', 'check-circle'],
      AUTO_APPROVED: ['Auto-approved', 'success', 'lightning-charge'], REJECTED: ['Ditolak', 'danger', 'x-circle'], RETURNED: ['Dikembalikan', 'info', 'arrow-return-left'] };
    const logs = DB.where('approvalLogs', (l) => l.entity === entity && l.entity_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    if (!logs.length) return '<div class="text-muted small">Belum ada riwayat.</div>';
    const roles = window.Catalog.APPROVAL_ROLES;
    return `<ul class="timeline">${logs.map((l) => {
      const [label, color, icon] = ACT[l.decision] || [l.decision, 'secondary', 'dot'];
      const u = DB.byId('users', l.actor_id);
      return `<li><i class="bi bi-${icon} text-${color}"></i><div><strong>${label}</strong>${l.layer_order ? ` · Layer ${l.layer_order} ${esc(roles[l.role_code] || l.role_code)}` : ''}
        <div class="small text-muted">${u ? `${esc(u.name)} · ` : l.decision === 'AUTO_APPROVED' ? 'Sistem · ' : ''}${datetime(l.created_at)}</div>
        ${l.matched ? `<div class="small text-success">Kondisi terpenuhi: ${l.matched.map(esc).join('; ')}</div>` : ''}
        ${l.note ? `<div class="small fst-italic">"${esc(l.note)}"</div>` : ''}</div></li>`;
    }).join('')}</ul>`;
  }

  // Jalur approval sebuah fase. entity + rec (opsional) untuk menandai status tiap layer.
  function layerPath(layers, entity, rec) {
    const roles = window.Catalog.APPROVAL_ROLES;
    const logs = rec ? DB.where('approvalLogs', (l) => l.entity === entity && l.entity_id === rec.id) : [];
    return `<div class="layer-path">${layers.map((l) => {
      const last = logs.filter((x) => x.layer_id === l.id).pop();
      const cur = rec && rec.current_layer_id === l.id;
      const cls = cur ? 'cur' : last ? ({ AUTO_APPROVED: 'auto', APPROVED: 'ok' }[last.decision] || 'bad') : '';
      return `<span class="lp ${cls}" title="${(l.conditions || []).length ? 'Ada kondisi auto-approve' : 'Selalu manual'}">${l.layer_order}. ${esc(roles[l.role_code] || l.role_code)}${l.is_final ? ' · final' : ''}${(l.conditions || []).length ? ' <i class="bi bi-lightning-charge"></i>' : ''}</span>`;
    }).join('<i class="bi bi-chevron-right text-muted"></i>') || '<span class="text-muted small">Belum ada layer</span>'}</div>`;
  }

  function approvalBox(entity, id, layer, back) {
    const roles = window.Catalog.APPROVAL_ROLES;
    return `<div class="card border-warning mb-3">
      <div class="card-header bg-warning-subtle"><i class="bi bi-hourglass-split"></i>&nbsp;Menunggu Anda:&nbsp;<strong>Layer ${layer.layer_order} · ${esc(roles[layer.role_code])}</strong></div>
      <div class="card-body"><form data-action="inbox.act" data-entity="${entity}" data-id="${id}" data-back="${back}">
        <textarea name="note" class="form-control mb-2" rows="2" placeholder="Catatan (wajib untuk tolak / kembalikan)"></textarea>
        <div class="d-flex gap-2 flex-wrap">
          <button name="action" value="approve" class="btn btn-success"><i class="bi bi-check-lg"></i> Setujui</button>
          <button name="action" value="return" class="btn btn-outline-info"><i class="bi bi-arrow-return-left"></i> Kembalikan untuk revisi</button>
          <button name="action" value="reject" class="btn btn-outline-danger" data-confirm="Tolak data ini? Status akhir tidak bisa diajukan ulang."><i class="bi bi-x-lg"></i> Tolak</button>
        </div></form></div></div>`;
  }

  function errorsHtml(errors) {
    return errors && errors.length ? `<div class="alert alert-danger"><ul class="mb-0">${errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>` : '';
  }

  // Simpan + flash + pindah halaman
  function done(type, message, to) { DB.save(); flash(type, message); go(to); }

  // Gagal validasi: render ulang halaman yang sama dengan error + nilai form yang sudah diisi
  let pending = null;
  function retry(errors, f) {
    const values = {};
    for (const [k, v] of f.entries()) values[k] = typeof v === 'string' ? v : '';
    pending = { path: parseHash().path, errors, values };
    render();
  }
  function takePending(path) {
    const p = pending && pending.path === path ? pending : null;
    pending = null;
    return p;
  }

  window.fmtNum = (n, d) => num(n, d);
  window.fmtRp = rp;

  window.UI = {
    h, session, currentUser, currentYear, inScope, store, route, go, render, flash, redirect, fail, requireRole, requireSetup,
    actions, clicks, download, parseCsv, toCsv, fieldInput, readFieldValues, logHtml, layerPath, approvalBox, errorsHtml, done, parseHash, pendingFor,
    retry, takePending,
  };
})();
