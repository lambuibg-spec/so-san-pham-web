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
  /* MA MAY (25/11/2026, chu du an: "so sanh voi phieu quay da tich chua tich tung kenh, kenh nao tich roi chua co video? o may dien thoai nao?" -> "Co, sua so").
     Moi dien thoai tu co 1 MA MAY 19 so (ngau nhien, luu trong may, khong lay thong tin ca nhan); goc trang hien "📱 Máy <4 so cuoi>" de biet may nao.
     Moi lan tich "da quay" ghi them /tim/m<ma may>_t<nhom>/<ma 19 so> = {v, t} (cung kieu nhat ky nguoi, luat Firebase hien co da cho ghi)
     + danh sach may /tim/may_ds/<ma may> = {v:1, t:lan mo trang}. Tool cat ghep doc lai: ma san pham tich ma chua co clip nam o may nao. */
  var MAY = '';
  try {
    MAY = localStorage.getItem('soSP_ma_may') || '';
    if (!/^9\d{18}$/.test(MAY)) {
      var r = new Uint32Array(3); crypto.getRandomValues(r);
      MAY = ('9' + String(r[0]).padStart(10, '0') + String(r[1]).padStart(10, '0')).slice(0, 19);
      localStorage.setItem('soSP_ma_may', MAY);
    }
    var hom = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem('soSP_ma_may_bao') !== hom) {
      goc(FB + '/tim/may_ds/' + MAY + '.json', { method: 'PUT', body: JSON.stringify({ v: 1, t: Date.now() }) })
        .then(function (q) { if (q.ok) localStorage.setItem('soSP_ma_may_bao', hom); }).catch(function () {});
    }
    var hien = function () {
      if (!document.body || document.getElementById('soMaMay')) return;
      var e = document.createElement('div'); e.id = 'soMaMay'; e.textContent = '📱 Máy ' + MAY.slice(-4);
      e.title = 'Mã máy này: ' + MAY + ' — dùng để biết clip tích ở điện thoại nào';
      e.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99990;font:600 11px/1.2 system-ui,sans-serif;color:#555;background:rgba(255,255,255,.85);border:1px solid #ddd;border-radius:8px;padding:2px 6px;pointer-events:none';
      document.body.appendChild(e);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hien); else hien();
  } catch (e) { MAY = ''; }
  /* DAU NGUON TUNG CANH (27/11/2026, chu du an: «hien thi gio quay cua tung phieu, may nao quay» + «phat hien phieu nao tich tay ma chua quay video tren app, bao do»).
     Ban ghi /tim/m<may>_t<nhom>/<ma> o tren bi GHI DE (moi may chi giu 4 o / san pham) => khong du de biet tung canh. Ghi them 1 khoa KHONG ghi de vao chinh so tich:
       daquay/<ma19>|<kenh*1000+phieu>|c<L*100000000 + 4 so cuoi ma may*10000 + luot*100+canh> = {x:0, t}
       L = 7 TICH TAY tren trang so (t = gio tich) · 8 MO APP Mai Thi Quay de quay canh do (t = luc bam) · 9 video QUA SO (camera trong so / LAY VIDEO / app gui &da=).
     x = 0 de MOI tool cu (chi dem x = 1) bo qua; dung khuon khoa + {x,t} luat Firebase hien co. lich_quay_kenh.py doc lai: canh nao TICH TAY ma khong co video app => bao DO. */
  var M4 = MAY ? MAY.slice(-4) : '';
  window.SO_MAY = { id: MAY, m4: M4, FB: FB };
  function dauKhoa(L, k, t) {
    var p = String(k).split('|'), c = parseInt(String(p[2] || '').replace(/^c/, ''), 10);
    if (!M4 || p.length !== 3 || !/^\d{19}$/.test(p[0]) || !/^\d+$/.test(p[1]) || !(c >= 0 && c < 10000)) return null;
    return [p[0] + '|' + p[1] + '|c' + (L * 100000000 + (+M4) * 10000 + c), { x: 0, t: +t }];
  }
  function ghiDau(ds) {
    ds = ds.filter(Boolean); if (!ds.length) return;
    var o = {}; ds.forEach(function (z) { o[z[0]] = z[1]; });
    goc(FB + '/daquay.json', { method: 'PATCH', keepalive: true, body: JSON.stringify(o) }).catch(function () {});   // goc: khong qua bo boc nay => khong tu ghi nhat ky lai
  }
  function dauLo(d) {                                                        // 1 lenh ghi tich cua trang so (nhieu khoa) -> dau tung canh vua tich
    var ds = [];
    Object.keys(d || {}).forEach(function (k) {
      var o = d[k], p = String(k).split('|'); if (p.length !== 3 || !o || +o.x !== 1 || !moi(+o.t)) return;
      var c = parseInt(String(p[2]).replace(/^c/, ''), 10); if (!/^c\d+$/.test(p[2]) || !(c >= 0 && c < 10000)) return;
      var ban = function (off) { var z = d[p[0] + '|' + p[1] + '|c' + (off + c)]; return z && +z.x === 1; };
      if (ban(100000)) return;                                                // «mau khong tu quay duoc» — co rieng, khong phai tich tay
      ds.push(dauKhoa(ban(600000) ? 9 : 7, k, o.t));
    });
    ghiDau(ds);
  }
  function ghiMay(nhom, ma, v, t) {
    if (!MAY || !v) return;                                               // 25/11 sua: bo tich (v=0) KHONG ghi de dau may da tich
    goc(FB + '/tim/m' + MAY + '_t' + nhom + '/' + ma + '.json', { method: 'PUT', keepalive: true, body: JSON.stringify({ v: v ? 1 : 0, t: t }) }).catch(function () {});   // keepalive: iPhone chuyen sang app van gui xong
  }
  function tich(k, o) {
    var p = String(k).split('|');
    if (p.length !== 3 || !/^\d{19}$/.test(p[0]) || !o || typeof o !== 'object' || !moi(+o.t)) return;
    var kn = parseInt(p[2].replace(/\D/g, ''), 10) || 0;                  // so kenh (c501 -> 501)
    ghi('t' + (kn % 4), p[0], o.x, Math.floor(+o.t / 1000) * 10000 + (kn % 10000));   // 4 muc cho gon: t = giay*10000 + so kenh
    ghiMay(kn % 4, p[0], o.x, Math.floor(+o.t / 1000) * 10000 + (kn % 10000));          // 25/11: may nao tich
  }
  // 25/11 sua: QUAY BANG APP "Mai Thi Quay" - app tu ghi tich thang len Firebase, trang so khong thay lenh ghi => truoc day KHONG biet may nao.
  // So mo app bang 1 the <a href="maithiquay://quay?...&tick=<khoa>&ma=<ma 19 so>"> roi click => bat cu click do, ghi: may NAY dang quay ma do.
  document.addEventListener('click', function (e) {
    try {
      var a = e.target && e.target.closest && e.target.closest('a[href^="maithiquay:"]');
      if (!a || !MAY) return;
      var q = String(a.getAttribute('href')).split('?')[1] || '', o = {};
      q.split('&').forEach(function (x) { var i = x.indexOf('='); if (i > 0) o[x.slice(0, i)] = decodeURIComponent(x.slice(i + 1)); });
      var p = String(o.tick || '').split('|'), ma = /^\d{19}$/.test(o.ma || '') ? o.ma : p[0];
      if (!/^\d{19}$/.test(ma)) return;
      var kn = parseInt(String(p[2] || '').replace(/\D/g, ''), 10) || 0;
      ghiMay(kn % 4, ma, 1, Math.floor(Date.now() / 1000) * 10000 + (kn % 10000));
      if (p.length === 3) ghiDau([dauKhoa(8, o.tick, Date.now())]);       // 27/11: dau «may nay mo app quay canh nay» (khong bi ghi de)
    } catch (er) {}
  }, true);
  function tim(ma, o) {
    if (!/^\d{19}$/.test(ma) || !o || typeof o !== 'object' || !moi(+o.t)) return;
    ghi('h', ma, o.v, +o.t);
  }
  function xet(url, method, body) {
    if (url.indexOf(FB) !== 0 || (method !== 'PUT' && method !== 'PATCH')) return;
    var path = url.slice(FB.length).split('?')[0], d, m, k;
    try { d = JSON.parse(body); } catch (e) { return; }
    if (path === '/daquay.json' && method === 'PATCH') { for (k in d) tich(k, d[k]); dauLo(d); }
    else if ((m = /^\/daquay\/([^/]+)\.json$/.exec(path)) && method === 'PUT') { k = decodeURIComponent(m[1]); tich(k, d); var o1 = {}; o1[k] = d; dauLo(o1); }
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
