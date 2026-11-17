// CHEN TEXT + ANH VAO VIDEO ONE SHORT (18/11/2026, chu du an: "them muc chen text vao video one short, muc tai anh len,
// anh phai dong bo tren may tinh vi tai tu dien thoai len").
// Chay tren Cloudflare Pages Functions, SAU Cloudflare Access (moi request deu da dang nhap bang Gmail). Van tu xac thuc lai
// JWT cua Access (chu ky RS256, iss, het han) nen khong tin header tu do.
// Luu o R2 (bucket so-san-pham-chen, rieng tu, tu xoa sau 30 ngay) qua binding CHEN:
//   chen/<ma19>/<AD|MT|EM>/<noi dung>/text.json       {text, t, by}
//   chen/<ma19>/<AD|MT|EM>/<noi dung>/anh/<t>_<rand>.<jpg|png|webp>   (customMetadata: ten, by, t)
// GET  ?ma=&kenh=        -> {"<noi dung>": {text, t, anh:[{k, t, ten}]}}
// GET  ?anh=<khoa>       -> noi dung anh
// POST json {ma,kenh,l,text}                     -> luu text
// POST ?ma=&kenh=&l=&ten=  (body = anh)          -> them anh
// DELETE ?k=<khoa anh>                           -> xoa 1 anh
const TEAM = 'raspy-band-ce97';
const RE_MA = /^\d{19}$/, RE_KENH = /^(AD|MT|EM)$/;
const TOI_DA_ANH = 12, TOI_DA_BYTE = 8 * 1024 * 1024, TOI_DA_CHU = 4000;
const KIEU = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
let _certs = null, _certsLuc = 0;

async function xacThuc(request) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || '';
  const p = jwt.split('.');
  if (p.length !== 3) return null;
  try {
    const head = JSON.parse(new TextDecoder().decode(b64u(p[0])));
    if (!_certs || Date.now() - _certsLuc > 3600e3) {
      _certs = await (await fetch('https://' + TEAM + '.cloudflareaccess.com/cdn-cgi/access/certs')).json(); _certsLuc = Date.now();
    }
    const jwk = (_certs.keys || []).find((k) => k.kid === head.kid);
    if (!jwk || head.alg !== 'RS256') return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(b64u(p[1])));
    if (!d.exp || d.exp * 1000 < Date.now() || d.iss !== 'https://' + TEAM + '.cloudflareaccess.com') return null;
    return String(d.email || '').toLowerCase() || null;
  } catch (e) { return null; }
}

async function danhSach(env, ma, kenh) {
  const tien = 'chen/' + ma + '/' + kenh + '/';
  const ra = {};
  let cursor;
  do {
    const r = await env.CHEN.list({ prefix: tien, cursor, include: ['customMetadata'] });
    for (const o of r.objects) {
      const rest = o.key.slice(tien.length).split('/');
      const l = rest[0];
      if (!/^\d{1,2}$/.test(l)) continue;
      const e = (ra[l] = ra[l] || { text: '', t: 0, anh: [] });
      if (rest[1] === 'text.json') {
        try { const j = await (await env.CHEN.get(o.key)).json(); e.text = String(j.text || ''); e.t = +j.t || 0; } catch (_) {}
      } else if (rest[1] === 'anh' && rest[2]) {
        const m = o.customMetadata || {};
        e.anh.push({ k: o.key, t: +m.t || o.uploaded.getTime(), ten: m.ten || '' });
      }
    }
    cursor = r.truncated ? r.cursor : undefined;
  } while (cursor);
  Object.values(ra).forEach((e) => e.anh.sort((a, b) => a.t - b.t));
  return ra;
}

export async function onRequest({ request, env }) {
  const email = await xacThuc(request);
  if (!email) return json({ loi: 'Chua dang nhap' }, 401);
  if (!env.CHEN) return json({ loi: 'Chua gan kho R2 (binding CHEN) cho Pages' }, 503);
  const u = new URL(request.url), q = u.searchParams;
  try {
    if (request.method === 'GET') {
      const k = q.get('anh');
      if (k) {
        if (!/^chen\/\d{19}\/(AD|MT|EM)\/\d{1,2}\/anh\/[\w.\-]+$/.test(k)) return json({ loi: 'Khoa anh sai' }, 400);
        const o = await env.CHEN.get(k);
        if (!o) return json({ loi: 'Khong thay anh' }, 404);
        return new Response(o.body, { headers: { 'content-type': (o.httpMetadata && o.httpMetadata.contentType) || 'image/jpeg', 'cache-control': 'private, max-age=86400' } });
      }
      const ma = q.get('ma') || '', kenh = q.get('kenh') || '';
      if (!RE_MA.test(ma) || !RE_KENH.test(kenh)) return json({ loi: 'Thieu ma / kenh' }, 400);
      return json(await danhSach(env, ma, kenh));
    }
    const goc = request.headers.get('Origin');
    if (!goc || new URL(goc).host !== u.host) return json({ loi: 'Sai nguon goc yeu cau' }, 403);
    if (request.method === 'DELETE') {
      const k = q.get('k') || '';
      if (!/^chen\/\d{19}\/(AD|MT|EM)\/\d{1,2}\/anh\/[\w.\-]+$/.test(k)) return json({ loi: 'Khoa anh sai' }, 400);
      await env.CHEN.delete(k);
      return json({ ok: true });
    }
    if (request.method !== 'POST') return json({ loi: 'Phuong thuc khong ho tro' }, 405);
    const kieu = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (kieu === 'application/json') {
      const b = await request.json();
      const ma = String(b.ma || ''), kenh = String(b.kenh || ''), l = +b.l;
      if (!RE_MA.test(ma) || !RE_KENH.test(kenh) || !(l >= 1 && l <= 30)) return json({ loi: 'Thieu ma / kenh / noi dung' }, 400);
      const text = String(b.text == null ? '' : b.text).slice(0, TOI_DA_CHU);
      await env.CHEN.put('chen/' + ma + '/' + kenh + '/' + l + '/text.json', JSON.stringify({ text, t: Date.now(), by: email }), { httpMetadata: { contentType: 'application/json' } });
      return json({ ok: true });
    }
    const ext = KIEU[kieu];
    if (!ext) return json({ loi: 'Chi nhan anh jpg / png / webp / gif' }, 415);
    const ma = q.get('ma') || '', kenh = q.get('kenh') || '', l = +q.get('l');
    if (!RE_MA.test(ma) || !RE_KENH.test(kenh) || !(l >= 1 && l <= 30)) return json({ loi: 'Thieu ma / kenh / noi dung' }, 400);
    const dai = +request.headers.get('content-length') || 0;
    if (dai > TOI_DA_BYTE) return json({ loi: 'Anh qua lon (toi da 8 MB)' }, 413);
    const hien = (await danhSach(env, ma, kenh))[l];
    if (hien && hien.anh.length >= TOI_DA_ANH) return json({ loi: 'Moi noi dung toi da ' + TOI_DA_ANH + ' anh' }, 400);
    const buf = await request.arrayBuffer();
    if (buf.byteLength > TOI_DA_BYTE) return json({ loi: 'Anh qua lon (toi da 8 MB)' }, 413);
    if (!buf.byteLength) return json({ loi: 'Anh rong' }, 400);
    const t = Date.now(), rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)), (x) => x.toString(16).padStart(2, '0')).join('');
    const k = 'chen/' + ma + '/' + kenh + '/' + l + '/anh/' + t + '_' + rnd + '.' + ext;
    await env.CHEN.put(k, buf, { httpMetadata: { contentType: kieu }, customMetadata: { ten: (q.get('ten') || '').slice(0, 80), by: email, t: String(t) } });
    return json({ ok: true, k });
  } catch (e) { return json({ loi: String((e && e.message) || e) }, 500); }
}
