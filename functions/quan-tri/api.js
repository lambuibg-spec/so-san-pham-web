// QUAN LY NHAN VIEN (11/11/2026): chi admin moi them / bo email trong chinh sach Cloudflare Access "gmail-nhan-vien".
// Chay tren Cloudflare Pages Functions, SAU Cloudflare Access (moi request deu da dang nhap). Van tu xac thuc lai JWT cua Access
// (chu ky RS256, aud, het han) roi doi chieu email admin, nen khong tin header tu do.
// Bien (Pages): CF_ACCESS_TOKEN (secret: Access Apps and Policies Edit) · CF_ACCOUNT_ID · ACCESS_APP_ID · ACCESS_TEAM · ADMIN_EMAILS · POLICY_NAME
const MAC_DINH = { team: 'raspy-band-ce97', policy: 'gmail-nhan-vien', admin: 'lambuibg@gmail.com', app: 'a9ce00bb-5926-4947-830b-40317fe65452', acc: '24aff499495ccd700a9ced595cccde47' };
const TOI_DA = 50;                                  // goi Free: toi da 50 nguoi
const RE_MAIL = /^[a-z0-9._%+\-]+@[a-z0-9\-]+(\.[a-z0-9\-]+)*\.[a-z]{2,}$/;

const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const cau = (env) => ({
  team: env.ACCESS_TEAM || MAC_DINH.team, policy: env.POLICY_NAME || MAC_DINH.policy,
  admin: (env.ADMIN_EMAILS || MAC_DINH.admin).toLowerCase().split(',').map((x) => x.trim()).filter(Boolean),
  app: env.ACCESS_APP_ID || MAC_DINH.app, acc: env.CF_ACCOUNT_ID || MAC_DINH.acc,
});

let _certs = null, _certsLuc = 0, _aud = null;

async function cf(env, c, method, path, body) {
  const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + c.acc + path, {
    method, headers: { Authorization: 'Bearer ' + env.CF_ACCESS_TOKEN, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error('Cloudflare: ' + JSON.stringify(j.errors || r.status).slice(0, 300));
  return j.result;
}

async function xacThuc(request, env, c) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion') || '';
  const p = jwt.split('.');
  if (p.length !== 3) return null;
  try {
    const head = JSON.parse(new TextDecoder().decode(b64u(p[0])));
    if (!_certs || Date.now() - _certsLuc > 3600e3) {
      _certs = await (await fetch('https://' + c.team + '.cloudflareaccess.com/cdn-cgi/access/certs')).json(); _certsLuc = Date.now();
    }
    const jwk = (_certs.keys || []).find((k) => k.kid === head.kid);
    if (!jwk || head.alg !== 'RS256') return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
    if (!ok) return null;
    const d = JSON.parse(new TextDecoder().decode(b64u(p[1])));
    if (!d.exp || d.exp * 1000 < Date.now() || d.iss !== 'https://' + c.team + '.cloudflareaccess.com') return null;
    if (env.CF_ACCESS_TOKEN) {                                                  // aud cua ung dung Access (lay 1 lan)
      if (!_aud) _aud = (await cf(env, c, 'GET', '/access/apps/' + c.app)).aud;
      const auds = [].concat(d.aud || []);
      if (!auds.includes(_aud)) return null;
    }
    return String(d.email || '').toLowerCase() || null;
  } catch (e) { return null; }
}

async function chinhSach(env, c) {
  const ds = await cf(env, c, 'GET', '/access/apps/' + c.app + '/policies');
  const p = ds.find((x) => x.name === c.policy);
  if (!p) throw new Error('Khong thay chinh sach ' + c.policy);
  return p;
}
const emailsCua = (p) => (p.include || []).filter((x) => x.email && x.email.email).map((x) => x.email.email.toLowerCase());
const khac = (p) => (p.include || []).filter((x) => !(x.email && x.email.email));

async function luu(env, c, p, emails) {
  const include = khac(p).concat(emails.map((e) => ({ email: { email: e } })));
  const body = { name: p.name, decision: p.decision, include, exclude: p.exclude || [], require: p.require || [] };
  if (p.session_duration) body.session_duration = p.session_duration;
  if (p.precedence != null && !p.reusable) body.precedence = p.precedence;
  const path = p.reusable ? '/access/policies/' + p.id : '/access/apps/' + c.app + '/policies/' + p.id;
  await cf(env, c, 'PUT', path, body);
}

export async function onRequest({ request, env }) {
  const c = cau(env);
  const email = await xacThuc(request, env, c);
  const laAdmin = !!email && c.admin.includes(email);
  if (request.method === 'GET') {
    if (!laAdmin) return json({ admin: false });
    if (!env.CF_ACCESS_TOKEN) return json({ admin: true, email, loi: 'Chua cai khoa CF_ACCESS_TOKEN cho Pages' });
    try { const p = await chinhSach(env, c); return json({ admin: true, email, emails: emailsCua(p), admin_list: c.admin, khac: khac(p).length, toi_da: TOI_DA }); }
    catch (e) { return json({ admin: true, email, loi: String(e.message || e) }); }
  }
  if (request.method !== 'POST') return json({ loi: 'Phuong thuc khong ho tro' }, 405);
  if (!laAdmin) return json({ loi: 'Chi quan tri vien moi duoc them / bo nhan vien' }, 403);
  const goc = request.headers.get('Origin');
  if (!goc || new URL(goc).host !== new URL(request.url).host) return json({ loi: 'Sai nguon goc yeu cau' }, 403);
  let b; try { b = await request.json(); } catch (e) { return json({ loi: 'Du lieu khong hop le' }, 400); }
  try {
    const p = await chinhSach(env, c);
    let ds = emailsCua(p);
    const ten = (v) => [].concat(v || []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    const them = ten(b.them), bo = ten(b.bo);
    const xau = them.filter((e) => !RE_MAIL.test(e));
    if (xau.length) return json({ loi: 'Email khong hop le: ' + xau.join(', ') }, 400);
    for (const e of them) if (!ds.includes(e)) ds.push(e);
    const giu = bo.filter((e) => c.admin.includes(e));
    if (giu.length) return json({ loi: 'Khong duoc bo email quan tri: ' + giu.join(', ') }, 400);
    ds = ds.filter((e) => !bo.includes(e));
    for (const a of c.admin) if (!ds.includes(a)) ds.unshift(a);               // luon giu admin
    if (ds.length > TOI_DA) return json({ loi: 'Qua ' + TOI_DA + ' email (goi Free toi da 50 nguoi)' }, 400);
    await luu(env, c, p, ds);
    return json({ ok: true, emails: ds, them: them.length, bo: bo.length });
  } catch (e) { return json({ loi: String(e.message || e) }, 500); }
}
