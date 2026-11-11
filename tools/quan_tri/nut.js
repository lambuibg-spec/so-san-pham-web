/* Nut "Nhan vien" o goc trang so — CHI hien voi quan tri vien (may chu tra admin:true). Nhan vien thuong khong thay gi. */
(function () {
  fetch('/quan-tri/api', { credentials: 'same-origin', cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.admin) return;
    var a = document.createElement('a');
    a.href = '/quan-tri/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '👥 Nhân viên';
    a.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:9999;background:#1a1a1a;color:#fff;padding:10px 16px;border-radius:999px;font:600 14px system-ui,sans-serif;text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.25)';
    document.body.appendChild(a);
  }).catch(function () {});
})();
