/* TIM THEO ANH CHINH XAC HON (14/11/2026, chu du an: "code de tim theo anh chinh xac di").
   Thay ham timTheoAnh cua trang (MobileNet alpha 0.5 + so mau, tinh lai van tay moi lan) bang:
     - DINOv2-small (ONNX luong tu hoa, ~24 MB, tai tu CHINH trang nay /tim-anh/model.onnx, trinh duyet luu lai) chay bang onnxruntime-web;
     - van tay SAN cua moi anh trong so (/tim-anh/emb.bin + ma.json, do tim_anh_nhung.py tinh o may PC) => bam nut la ra ket qua, khong tinh lai 1000 anh;
     - so cosine that, hien DIEM THAT (khong phai % quy doi lam tron len 100), va chi dam bao "rat co the" khi diem cao + cach xa hang 2.
   Do tren 16 khung video quay that (cat tay nhu nguoi dung): DINOv2 dung hang <=10 o 81 %, hang <=20 o 100 %; MobileNet cu hang <=20 chi 10-28 %.
   Tien xu ly PHAI giong tim_anh_nhung.py: dem VUONG nen xam 128 -> 224x224 -> chuan hoa ImageNet -> CLS (token dau) -> chuan hoa L2. */
(function () {
  var BASE = '/tim-anh/';
  var ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
  var DIM = 384, TOP = 20;
  var MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
  var st = { nap: null, sess: null, emb: null, ma: null, loi: false };

  function script(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('khong tai duoc ' + src)); };
      document.head.appendChild(s);
    });
  }
  function nap(bao) {
    if (st.nap) return st.nap;
    st.nap = (async function () {
      bao('Đang tải bộ nhận diện ảnh (lần đầu ~25 MB, các lần sau dùng bản đã lưu trong máy)…');
      if (typeof ort === 'undefined') await script(ORT + 'ort.min.js');
      ort.env.wasm.wasmPaths = ORT;
      ort.env.wasm.numThreads = 1;                           // trang khong bat cross-origin isolation => 1 luong
      var r = await Promise.all([fetch(BASE + 'model.onnx'), fetch(BASE + 'emb.bin'), fetch(BASE + 'ma.json')]);
      if (!r[0].ok || !r[1].ok || !r[2].ok) throw new Error('thieu tep nhan dien tren may chu');
      var model = new Uint8Array(await r[0].arrayBuffer());
      var emb = new Float32Array(await r[1].arrayBuffer());
      var meta = await r[2].json();
      if (meta.dim !== DIM || emb.length !== meta.ma.length * DIM) throw new Error('van tay khong khop (' + emb.length + ' / ' + meta.ma.length + ')');
      st.emb = emb; st.ma = meta.ma;
      bao('Đang khởi động mô hình…');
      st.sess = await ort.InferenceSession.create(model, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    })();
    st.nap.catch(function () { st.nap = null; });
    return st.nap;
  }

  // vung (toa do PIXEL tren anh goc) -> canvas 224x224: dem vuong nen xam 128 (giu dung ti le, khong mat mep)
  function canvasTu(img, vung) {
    var sx = 0, sy = 0, sw = img.naturalWidth || img.width, sh = img.naturalHeight || img.height;
    if (vung) { sx = vung.sx; sy = vung.sy; sw = vung.sw; sh = vung.sh; }
    var co = Math.max(sw, sh);
    var c = document.createElement('canvas'); c.width = 224; c.height = 224;
    var x = c.getContext('2d', { willReadFrequently: true });
    x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, 224, 224);
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    var k = 224 / co;
    x.drawImage(img, sx, sy, sw, sh, Math.round((co - sw) / 2 * k), Math.round((co - sh) / 2 * k), Math.max(1, Math.round(sw * k)), Math.max(1, Math.round(sh * k)));
    return c;
  }
  async function nhung(canvas) {
    var d = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, 224, 224).data;
    var f = new Float32Array(3 * 224 * 224), n = 224 * 224;
    for (var i = 0; i < n; i++) {
      f[i] = (d[i * 4] / 255 - MEAN[0]) / STD[0];
      f[n + i] = (d[i * 4 + 1] / 255 - MEAN[1]) / STD[1];
      f[2 * n + i] = (d[i * 4 + 2] / 255 - MEAN[2]) / STD[2];
    }
    var out = await st.sess.run({ pixel_values: new ort.Tensor('float32', f, [1, 3, 224, 224]) });
    var h = out.last_hidden_state.data;                      // [1, 257, 384] -> token CLS = 384 so dau
    var v = new Float32Array(DIM), s = 0;
    for (var j = 0; j < DIM; j++) { v[j] = h[j]; s += h[j] * h[j]; }
    s = Math.sqrt(s) + 1e-9;
    for (var j2 = 0; j2 < DIM; j2++) v[j2] /= s;
    return v;
  }
  function xepHang(q) {
    var N = st.ma.length, E = st.emb, sc = new Float32Array(N);
    for (var i = 0; i < N; i++) { var s = 0, o = i * DIM; for (var j = 0; j < DIM; j++) s += q[j] * E[o + j]; sc[i] = s; }
    var idx = Array.prototype.map.call(sc, function (_, i) { return i; }).sort(function (a, b) { return sc[b] - sc[a]; });
    return idx.slice(0, TOP).map(function (i) { return { ma: st.ma[i], diem: sc[i] }; });
  }
  window.__timAnh = { nap: nap, canvasTu: canvasTu, nhung: nhung, xepHang: xepHang, st: st };

  function chu(ds) {
    var a = ds[0], b = ds[1] || { diem: 0 }, cach = a.diem - b.diem;
    if (a.diem >= 0.80 && cach >= 0.06) return { c: '#1b7a3a', t: 'Rất có thể là mã #1 (điểm cao, cách xa mã #2)' };
    if (a.diem >= 0.62) return { c: '#b4531d', t: 'Gợi ý — mã #1 khá giống nhưng còn mã tương tự, TỰ NHÌN ẢNH để xác nhận' };
    return { c: '#b3261e', t: 'Chưa chắc mã nào — đây là ' + ds.length + ' sản phẩm giống nhất, xem từng ảnh (ảnh quay thật thường nằm trong top 10–20; khoanh SÁT sản phẩm sẽ chính xác hơn)' };
  }

  var xoaCu = window.xoaKetQuaTimAnh;                      // xoa ket qua: tra thu tu hien thi ve nhu cu
  window.xoaKetQuaTimAnh = function () {
    for (var i = 0; i < the.length; i++) the[i].style.order = '';
    if (xoaCu) xoaCu();
  };
  var cu = window.timTheoAnh;                                // ham cu, dung khi bo nhan dien moi loi
  window.timTheoAnh = async function (file, vung) {
    var bao = document.getElementById('baoAnh');
    bao.hidden = false; bao.innerHTML = 'Đang chuẩn bị…';
    try {
      await nap(function (t) { bao.innerHTML = t; });
      var img = _anhDangCat;                                 // anh nguoi dung vua chon (bien cuc bo cua trang)
      if (!img) { bao.innerHTML = 'Không đọc được ảnh này, thử ảnh khác xem.'; return; }
      bao.innerHTML = 'Đang so với ' + st.ma.length + ' sản phẩm…';
      var q = await nhung(canvasTu(img, vung));
      var kq = xepHang(q), theo = {};
      kq.forEach(function (x, i) { theo[x.ma] = { i: i, diem: x.diem }; });
      for (var k = 0; k < the.length; k++) {
        var t = the[k]; t.hidden = true; t.classList.remove('hang-anh');
        var dd = t.querySelector('.diem-anh'); if (dd) dd.remove();
      }
      var chon = [];
      for (var m = 0; m < the.length; m++) {
        var mb = the[m].querySelector('.ma'); var ma = mb && mb.dataset.ma;
        if (ma && theo[ma]) chon.push({ t: the[m], i: theo[ma].i, diem: theo[ma].diem });
      }
      chon.sort(function (a, b) { return a.i - b.i; });
      chon.forEach(function (x) {
        x.t.hidden = false; x.t.classList.add('hang-anh');
        var nhan = document.createElement('span'); nhan.className = 'diem-anh';
        nhan.textContent = '#' + (x.i + 1) + ' · điểm ' + x.diem.toFixed(2);
        x.t.style.position = 'relative'; x.t.prepend(nhan);
        x.t.style.order = String(x.i - 1000);                  // xep theo hang giong (CSS order, khong doi vi tri that trong so)
      });
      if (typeof dem !== 'undefined') dem.textContent = 'Tìm theo ảnh: ' + chon.length + ' sản phẩm giống nhất (điểm 0–1, càng cao càng giống)';
      var c = chu(kq.filter(function (x) { return theo[x.ma]; }));
      bao.innerHTML = '<b style="color:' + c.c + '">' + c.t + '.</b> Điểm là độ giống thật của hai ảnh (không phải %). Khoanh SÁT sản phẩm (bỏ tay, nền) thì kết quả đúng hơn nhiều. ' +
        '<span id="xoaTimAnh">Xóa kết quả, xem lại toàn bộ sổ</span>';
      document.getElementById('xoaTimAnh').addEventListener('click', xoaKetQuaTimAnh);
      if (typeof o !== 'undefined') o.value = '';
    } catch (e) {
      st.loi = true;
      bao.innerHTML = '⚠ Bộ nhận diện mới không chạy được (' + String(e && e.message || e).slice(0, 80) + ') — tạm dùng cách cũ, kém chính xác hơn.';
      if (cu) return cu(file, vung);
    }
  };
})();
