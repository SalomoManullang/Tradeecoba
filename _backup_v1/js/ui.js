// Kerangka UI: helper format, router hash, session demo, layout, form & aksi.
(function () {
  // ---------------------------------------------------------------- helper format
  const ROLE_LABEL = { ADMIN_HO: 'Admin HO', CBD: 'CBD', RSM: 'RSM', ADMIN_DC: 'Admin DC', FINANCE: 'Finance / AP' };
  const STATUS = {
    draft: ['Draft', 'secondary'], active: ['Aktif', 'success'], closed: ['Ditutup', 'dark'], complete: ['Selesai', 'success'],
    in_review: ['Menunggu approval', 'warning'], rejected: ['Ditolak', 'danger'], returned: ['Dikembalikan', 'info'], paid: ['Cair', 'success'],
  };
  const FIELD_TYPES = { text: 'Teks singkat', textarea: 'Teks panjang', number: 'Angka', currency: 'Rupiah', percent: 'Persen', select: 'Pilihan (dropdown)', date: 'Tanggal', yesno: 'Ya / Tidak' };
  const COMP_TYPES = { growth_rebate: 'Rebate growth (tier pencapaian)', jtbd: 'Reward JTBD / lead measure', fixed: 'Nominal tetap per kelas', formula: 'Rumus bebas' };
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

  const h = { ROLE_LABEL, STATUS, FIELD_TYPES, COMP_TYPES, MONTHS, esc, num, rp, rpShort, pct, date, datetime, month, badge, cls, sel, chk, toNum };

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

  function inboxCount(user, year) {
    const progIds = DB.where('programs', (p) => p.year === year).map((p) => p.id);
    const myStep = (sid) => { const s = DB.byId('steps', sid); return s && s.role === user.role; };
    const inS = (pa) => inScope(user, store(pa.customer_id));
    const a = DB.where('participants', (pa) => progIds.includes(pa.program_id) && pa.status === 'in_review' && myStep(pa.current_step_id) && inS(pa)).length;
    const b = DB.where('disbursements', (d) => {
      const pa = DB.byId('participants', d.participant_id);
      return pa && progIds.includes(pa.program_id) && d.status === 'in_review' && myStep(d.current_step_id) && inS(pa);
    }).length;
    return a + b;
  }

  // ---------------------------------------------------------------- layout Metronic (sama dengan Tradee)
  const BODY_CLASS = 'kt-quick-panel--right kt-demo-panel--right kt-offcanvas-panel--right kt-header--fixed kt-header-mobile--fixed ' +
    'kt-subheader--enabled kt-subheader--transparent kt-aside--enabled kt-aside--fixed kt-aside--minimize';
  const PROGRAM_ICON = ['flaticon2-shopping-cart-1', 'flaticon2-gift', 'flaticon2-percentage', 'flaticon2-cube', 'flaticon2-delivery-package'];

  const mBadge = (n, color = 'brand') => (n > 0 ? `<span class="kt-menu__link-badge"><span class="kt-badge kt-badge--${color} kt-badge--rounded">${n}</span></span>` : '');

  // Menu header (horizontal) per role — pola sama dengan header/adminsalesHO.php dkk.
  function headerMenu(user, year, path) {
    const is = (...roles) => roles.includes(user.role);
    const programs = DB.where('programs', (p) => p.year === year);
    const running = programs.filter((p) => ['active', 'closed'].includes(p.status));
    const icon = (p) => PROGRAM_ICON[(p.id - 1) % PROGRAM_ICON.length];
    const n = inboxCount(user, year);
    const items = [{ label: `Dashboard ${ROLE_LABEL[user.role]} (${user.id})`, href: '/', active: path === '/' }];

    if (is('ADMIN_HO')) {
      items.push({ label: 'Setup Program', isNew: true, active: path.startsWith('/setup'), children: [
        ...programs.map((p) => ({ label: `${p.name} (${p.code})`, icon: icon(p), href: `/setup/${p.id}/general`, badge: p.status === 'draft' ? 'draft' : null })),
        { label: 'Program baru', icon: 'flaticon2-plus', href: '/setup/new' },
        { label: 'Daftar & duplikat program', icon: 'flaticon2-copy', href: '/setup' },
      ] });
    }
    if (is('CBD', 'ADMIN_HO')) {
      items.push({ label: 'Pendaftaran', active: path === '/registration' || path.startsWith('/registration/program'), children: [
        ...programs.filter((p) => p.status === 'active').map((p) => {
          const chs = DB.where('programChannels', (c) => c.program_id === p.id &&
            (!user.channel_codes || !user.channel_codes.length || user.channel_codes.includes(c.channel_code)));
          return { label: p.name, icon: icon(p), children: chs.map((c) => ({
            label: (DB.t('channels').find((x) => x.code === c.channel_code) || {}).name, icon: 'flaticon2-architecture-and-city',
            href: `/registration/program/${p.id}/${c.id}` })) };
        }),
        { label: 'Semua program', icon: 'flaticon2-list-2', href: '/registration' },
      ] });
    }
    items.push({ label: 'Approval', badge: n, active: path.startsWith('/inbox'), children: [
      { label: 'Inbox Approval', icon: 'flaticon2-checkmark', href: '/inbox', badge: n },
      { label: 'Status Peserta', icon: 'flaticon-customer', href: '/registration/participants' },
    ] });
    items.push({ label: 'Pencairan', active: path.startsWith('/disbursement'), children: running.map((p) => ({
      label: p.name, icon: icon(p), children: DB.where('periods', (x) => x.program_id === p.id).sort((a, b) => a.sort - b.sort)
        .map((per) => ({ label: per.name, icon: 'flaticon2-calendar-3', href: `/disbursement/program/${p.id}/${per.id}` })),
    })).concat([{ label: 'Ringkasan pencairan', icon: 'flaticon2-list-2', href: '/disbursement' }]) });
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
      { icon: 'flaticon-customer', title: 'Status Peserta', items: [['Active', '/registration/participants?status=active'], ['Menunggu approval', '/registration/participants?status=in_review'],
        ['Dikembalikan', '/registration/participants?status=returned'], ['Reject', '/registration/participants?status=rejected']] },
      { icon: 'flaticon2-graph-1', title: 'Pencairan', items: [['Ringkasan pencairan', '/disbursement'], ['Inbox approval', '/inbox']] },
      { icon: 'flaticon2-layers-1', title: 'Master Data', items: [
        ...(is('ADMIN_HO') ? [['Data Sell Out', '/master/sales']] : []), ['Master Toko', '/master/stores'],
        ...(is('ADMIN_HO') ? [['Channel & Brand', '/master/data']] : [])] },
    ];
    if (is('ADMIN_HO')) groups.splice(1, 0, { icon: 'flaticon2-settings', title: 'Setup Program', items: [['Daftar program', '/setup'], ['Program baru', '/setup/new']] });
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
                        <div class="kt-notification__item-time">Coba alur dari sisi Admin HO, CBD, RSM, Admin DC, Finance</div></div></a>
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
      flash('danger', esc(err.message));
      render();
    }
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
  function fieldInput(f, value, opts = {}) {
    const name = (opts.prefix || 'f_') + f.key;
    const v = value === undefined || value === null ? '' : value;
    const dis = opts.disabled ? 'disabled' : '';
    const req = f.required ? 'required' : '';
    let input;
    if (f.field_type === 'textarea') input = `<textarea class="form-control" id="${name}" name="${name}" rows="2" ${req} ${dis}>${esc(v)}</textarea>`;
    else if (f.field_type === 'select') input = `<select class="form-control" id="${name}" name="${name}" ${req} ${dis}><option value="">- pilih -</option>${(f.options || []).map((o) => `<option ${sel(String(v) === o)}>${esc(o)}</option>`).join('')}</select>`;
    else if (f.field_type === 'yesno') input = `<select class="form-control" id="${name}" name="${name}" ${req} ${dis}><option value="">- pilih -</option><option ${sel(v === 'Ya')}>Ya</option><option ${sel(v === 'Tidak')}>Tidak</option></select>`;
    else if (['number', 'currency', 'percent'].includes(f.field_type)) {
      input = `<div class="input-group">${f.field_type === 'currency' ? '<span class="input-group-text">Rp</span>' : ''}
        <input type="number" step="any" class="form-control" id="${name}" name="${name}" value="${esc(v)}" ${req} ${dis}>
        ${f.field_type === 'percent' ? '<span class="input-group-text">%</span>' : ''}</div>`;
    } else input = `<input type="${f.field_type === 'date' ? 'date' : 'text'}" class="form-control" id="${name}" name="${name}" value="${esc(v)}" ${req} ${dis}>`;
    return `<div class="mb-3"><label class="form-label" for="${name}">${esc(f.label)}${f.required ? ' <span class="text-danger">*</span>' : ''}</label>
      ${input}${f.help ? `<div class="form-text">${esc(f.help)}</div>` : ''}</div>`;
  }

  // Validasi kolom dinamis. read(k) mengambil nilai mentah dari form.
  function readFieldValues(fields, read) {
    const values = {}; const errors = [];
    for (const f of fields) {
      let v = read('f_' + f.key);
      v = v === null || v === undefined ? '' : String(v).trim();
      if (['number', 'currency', 'percent'].includes(f.field_type) && v !== '') {
        const n = toNum(v);
        if (n === null) { errors.push(`${f.label} harus berupa angka`); continue; }
        v = n;
      } else if (f.field_type === 'yesno') v = v === 'Ya' || v === 'Tidak' ? v : '';
      else if (f.field_type === 'select' && v !== '' && !(f.options || []).includes(v)) { errors.push(`${f.label}: pilihan tidak valid`); continue; }
      if (f.required && v === '') { errors.push(`${f.label} wajib diisi`); continue; }
      if (v !== '') values[f.key] = v;
    }
    return { values, errors };
  }

  function logHtml(entity, id) {
    const ACT = { submit: ['Diajukan', 'primary', 'send'], resubmit: ['Diajukan ulang', 'primary', 'arrow-repeat'], approve: ['Disetujui', 'success', 'check-circle'], reject: ['Ditolak', 'danger', 'x-circle'], return: ['Dikembalikan', 'info', 'arrow-return-left'] };
    const logs = DB.where('logs', (l) => l.entity === entity && l.entity_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
    if (!logs.length) return '<div class="text-muted small">Belum ada riwayat.</div>';
    return `<ul class="timeline">${logs.map((l) => {
      const [label, color, icon] = ACT[l.action] || [l.action, 'secondary', 'dot'];
      const u = DB.byId('users', l.user_id) || {};
      return `<li><i class="bi bi-${icon} text-${color}"></i><div><strong>${label}</strong>${l.step_name ? ' · ' + esc(l.step_name) : ''}
        <div class="small text-muted">${esc(u.name || '-')} (${ROLE_LABEL[u.role] || ''}) · ${datetime(l.created_at)}</div>
        ${l.note ? `<div class="small fst-italic">"${esc(l.note)}"</div>` : ''}</div></li>`;
    }).join('')}</ul>`;
  }

  function approvalBox(entity, id, step, back) {
    return `<div class="card border-warning mb-3">
      <div class="card-header bg-warning-subtle"><i class="bi bi-hourglass-split"></i> Menunggu Anda: <strong>${esc(step.name)}</strong></div>
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
    h, session, currentUser, currentYear, inScope, store, route, go, render, flash, redirect, fail, requireRole,
    actions, clicks, download, parseCsv, toCsv, fieldInput, readFieldValues, logHtml, approvalBox, errorsHtml, done, parseHash,
    retry, takePending,
  };
})();
