function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

function requireYear(req, res, next) {
  if (!req.session.year) return res.redirect('/lobby');
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).render('error', { title: 'Tidak ada akses', message: 'Halaman ini tidak tersedia untuk role Anda.' });
    }
    next();
  };
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

// Filter scope user (DC / channel). NULL di user = semua.
function scopeSql(user, alias, params) {
  let sql = '';
  if (user.dc_codes && user.dc_codes.length) {
    params.push(user.dc_codes);
    sql += ` AND ${alias}.dc_code = ANY($${params.length})`;
  }
  if (user.channel_codes && user.channel_codes.length) {
    params.push(user.channel_codes);
    sql += ` AND ${alias}.channel_code = ANY($${params.length})`;
  }
  return sql;
}

module.exports = { requireLogin, requireYear, requireRole, flash, scopeSql };
