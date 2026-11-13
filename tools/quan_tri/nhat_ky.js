/* NHAT KY AI TICH / TIM (14/11/2026, chu du an: "so san pham co xem duoc ai tich hay thao tac gi ko ... tu code lam di").
   Trang so ghi tich "da quay" (Firebase /daquay) va tim (Firebase /tim/<ds>) khong kem nguoi. Script nay LANG NGHE cac lenh ghi do (boc window.fetch,
   KHONG doi lenh goc) roi ghi them 1 ban nhat ky mang ten nguoi dang nhap, vao cac muc /tim/a<ma-bam-email>_<loai> ma luat Firebase hien co da cho ghi
   (khoa = ma 19 so, v = 0/1, t = gio). Email KHONG ghi ro: chi 10 ky tu dau cua SHA-256(email thuong). Trang /quan-tri/ (chi admin) doc lai va hien bang.
   Loai: t0..t3 = tich da quay (kenh chia 4 nhom; so kenh nam trong t = giay*10000 + kenh) · h = tim (t = mili-giay). Chi ghi thao tac vua xay ra (<= 2 phut) de khong gan nham tich cu duoc day lai. */
(function () {
  var FB = 'https://project-c3d8a9ea-5303-4e42-969-default-rtdb.asia-southeast1.firebasedatabase.app';
  var goc = window.fetch.bind(window);
  function sha10(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s).toLowerCase().trim())).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('').slice(0, 10);
    });
  }
  var ai = goc('/cdn-cgi/access/get-identity', { credentials: 'same-origin' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) { return j && j.email ? sha10(j.email) : null; })
    .catch(function () { return null; });
  function ghi(loai, ma, v, t) {
    ai.then(function (h) {
      if (!h) return;
      return goc(FB + '/tim/a' + h + '_' + loai + '/' + ma + '.json', { method: 'PUT', body: JSON.stringify({ v: v ? 1 : 0, t: t }) });
    }).catch(function () {});
  }
  function moi(t) { return t && Math.abs(Date.now() - t) <= 120000; }
  function tich(k, o) {
    var p = String(k).split('|');
    if (p.length !== 3 || !/^\d{19}$/.test(p[0]) || !o || typeof o !== 'object' || !moi(+o.t)) return;
    var kn = parseInt(p[2].replace(/\D/g, ''), 10) || 0;                  // so kenh (c501 -> 501)
    ghi('t' + (kn % 4), p[0], o.x, Math.floor(+o.t / 1000) * 10000 + (kn % 10000));   // 4 muc cho gon: t = giay*10000 + so kenh
  }
  function tim(ma, o) {
    if (!/^\d{19}$/.test(ma) || !o || typeof o !== 'object' || !moi(+o.t)) return;
    ghi('h', ma, o.v, +o.t);
  }
  function xet(url, method, body) {
    if (url.indexOf(FB) !== 0 || (method !== 'PUT' && method !== 'PATCH')) return;
    var path = url.slice(FB.length).split('?')[0], d, m, k;
    try { d = JSON.parse(body); } catch (e) { return; }
    if (path === '/daquay.json' && method === 'PATCH') { for (k in d) tich(k, d[k]); }
    else if ((m = /^\/daquay\/([^/]+)\.json$/.exec(path)) && method === 'PUT') { tich(decodeURIComponent(m[1]), d); }
    else if ((m = /^\/tim\/([^/]+)\.json$/.exec(path)) && method === 'PATCH') { if (!/^a[0-9a-f]{10}_/.test(decodeURIComponent(m[1]))) for (k in d) tim(k, d[k]); }
    else if ((m = /^\/tim\/([^/]+)\/(\d{19})\.json$/.exec(path)) && method === 'PUT') { if (!/^a[0-9a-f]{10}_/.test(decodeURIComponent(m[1]))) tim(m[2], d); }
  }
  window.fetch = function (u, o) {
    try {
      var url = typeof u === 'string' ? u : (u && u.url) || '';
      var method = String((o && o.method) || (u && u.method) || 'GET').toUpperCase();
      if (o && typeof o.body === 'string') xet(url, method, o.body);
    } catch (e) {}
    return goc(u, o);
  };
})();
