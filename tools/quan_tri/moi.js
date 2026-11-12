/* THE MOI TUC THI (12/11/2026, chu du an: "phai cap nhat so len web ngay lap tuc").
   Tool them ma (so_them_ma.them_ma) bao Firebase /tim/moi/<ma> = {v:1, t:<STT>} NGAY khi them vao so.
   Trang doc danh sach nay moi 4 giay va VE THE TAM (ma + STT + anh bia Kalodata) cho ma chua co tren trang.
   Vai phut sau GitHub dung lai trang day du (ten, anh that) — the that thay the the tam khi tai lai. Khong dong vao du lieu nao khac. */
(function () {
  var FB = 'https://project-c3d8a9ea-5303-4e42-969-default-rtdb.asia-southeast1.firebasedatabase.app';
  var luoi = document.getElementById('luoi');
  if (!luoi) return;
  var co = {};
  function lamMoi() {
    co = {};
    var ds = luoi.querySelectorAll('button.ma');
    for (var i = 0; i < ds.length; i++) co[ds[i].getAttribute('data-ma')] = 1;
  }
  lamMoi();
  function veThe(ma, stt) {
    var a = document.createElement('article');
    a.className = 'the';
    a.setAttribute('data-moi', '1');
    a.setAttribute('data-tim', ma + ' sản phẩm mới stt ' + stt);
    a.dataset.stt = String(stt);
    var img = document.createElement('img');
    img.alt = ''; img.referrerPolicy = 'no-referrer';
    img.src = 'https://img.kalocdn.com/tiktok.product/' + ma + '/cover.png';
    img.onerror = function () { img.removeAttribute('src'); };
    var than = document.createElement('div'); than.className = 'than';
    var b = document.createElement('button'); b.className = 'ma'; b.setAttribute('data-ma', ma); b.textContent = ma;
    var s = document.createElement('span'); s.className = 'goc'; s.title = 'link gốc chủ dự án gửi — STT ' + stt; s.textContent = '★';
    var p = document.createElement('p'); p.className = 'ten'; p.textContent = 'STT ' + stt + ' — mới thêm, đang cập nhật tên + ảnh (vài phút)';
    var l = document.createElement('a'); l.className = 'lk'; l.target = '_blank'; l.rel = 'noopener';
    l.href = 'https://shop.tiktok.com/vn/pdp/' + ma; l.textContent = 'mở trang sản phẩm →';
    than.appendChild(b); than.appendChild(document.createTextNode(' ')); than.appendChild(s); than.appendChild(p); than.appendChild(l);
    a.appendChild(img); a.appendChild(than);
    return a;
  }
  function xet(j) {
    if (!j) return;
    var moi = [];
    for (var ma in j) {
      if (!/^\d{19}$/.test(ma) || !j[ma] || j[ma].v !== 1 || co[ma]) continue;
      moi.push({ ma: ma, stt: parseInt(j[ma].t, 10) || 0 });
    }
    if (!moi.length) return;
    moi.sort(function (x, y) { return x.stt - y.stt; });       // STT nho chen truoc, lon nhat nam tren cung
    for (var i = 0; i < moi.length; i++) {
      var el = veThe(moi[i].ma, moi[i].stt);
      luoi.insertBefore(el, luoi.firstChild);
      co[moi[i].ma] = 1;
      try { if (typeof the !== 'undefined' && the && the.unshift) the.unshift(el); } catch (e) {}   // mang `the` cua trang (loc / dem)
    }
    try { if (typeof loc === 'function') loc(); } catch (e) {}
  }
  function lay() {
    if (document.hidden) return;
    fetch(FB + '/tim/moi.json', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(xet).catch(function () {});
  }
  lay();
  setInterval(lay, 4000);
  document.addEventListener('visibilitychange', lay);
})();
