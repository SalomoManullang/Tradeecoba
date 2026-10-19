// Titik masuk aplikasi: siapkan data lalu render halaman sesuai hash URL.
(function () {
  DB.init();
  window.addEventListener('hashchange', UI.render);
  if (!location.hash) location.hash = UI.currentUser() ? '/' : '/login';
  UI.render();
})();
