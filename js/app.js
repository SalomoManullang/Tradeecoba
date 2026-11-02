// Titik masuk aplikasi: siapkan data lalu render halaman sesuai hash URL.
(function () {
  DB.init();
  if (window.SeedPresentation) window.SeedPresentation.ensure(); // data lama: tambahkan program demo presentasi sekali
  window.addEventListener('hashchange', UI.render);
  if (!location.hash) location.hash = UI.currentUser() ? '/' : '/login';
  UI.render();
})();
