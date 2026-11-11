# -*- coding: utf-8 -*-
r"""CLOUDFLARE PAGES CHO SO SAN PHAM (04/11/2026, chu du an: "khoa so, ai co gmail moi xem duoc, mien phi").
Trang so nam tren Cloudflare Pages, KHOA bang Cloudflare Access (chi gmail trong danh sach moi mo duoc).
Kho GitHub dung trang la kho CONG KHAI (de GitHub Actions mien phi) nen tuyet doi khong in ma / ten san pham ra log.

  python dang_cf.py chuan_bi    -> GITHUB_OUTPUT: url, khoa (1/0), da_dang (dau build dang chay)
                                   chua co project thi tao. CUA CHAN: trang CHUA KHOA thi KHONG dang du lieu that.
  python dang_cf.py kiem_khoa   -> thoat 1 neu trang dang mo cho nguoi la (dung cho giam sat)
Bien moi truong: CLOUDFLARE_API_TOKEN · CLOUDFLARE_ACCOUNT_ID · CF_PROJECT (mac dinh so-san-pham)"""
import json, os, sys, urllib.error, urllib.request

API = 'https://api.cloudflare.com/client/v4'
TOKEN = os.environ.get('CLOUDFLARE_API_TOKEN', '')
ACC = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '')
PROJ = os.environ.get('CF_PROJECT') or 'so-san-pham'


def goi(method, path, body=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json'})
    try:
        return json.loads(urllib.request.urlopen(req, timeout=60).read() or b'{}')
    except urllib.error.HTTPError as e:
        return json.loads(e.read() or b'{}') | {'_status': e.code}


class KhongTheoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def trang_da_khoa(url):
    """Cloudflare Access chan nguoi la: tra 302 sang trang dang nhap *.cloudflareaccess.com (hoac 401/403). Tra 200 = DANG MO."""
    op = urllib.request.build_opener(KhongTheoRedirect)
    try:
        r = op.open(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html'}), timeout=60)
        return False, r.status
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', '') or ''
        if e.code in (301, 302, 303, 307, 308):
            return 'cloudflareaccess.com' in loc, e.code
        return e.code in (401, 403), e.code


def project():
    r = goi('GET', '/accounts/%s/pages/projects/%s' % (ACC, PROJ))
    if r.get('success'):
        return r['result'], False
    r = goi('POST', '/accounts/%s/pages/projects' % ACC, {'name': PROJ, 'production_branch': 'main'})
    if not r.get('success'):
        sys.exit('LOI: khong tao duoc project Cloudflare Pages: %s' % r.get('errors'))
    return r['result'], True


def da_dang():
    r = goi('GET', '/accounts/%s/pages/projects/%s/deployments?env=production&per_page=1' % (ACC, PROJ))
    try:
        return ((r['result'][0].get('deployment_trigger') or {}).get('metadata') or {}).get('commit_message', '')
    except (KeyError, IndexError, TypeError):
        return ''


def ra(k, v):
    print('%s=%s' % (k, v), flush=True)
    if os.environ.get('GITHUB_OUTPUT'):
        open(os.environ['GITHUB_OUTPUT'], 'a', encoding='utf-8').write('%s=%s\n' % (k, v))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if not TOKEN or not ACC:
        sys.exit('LOI: chua co secret CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID')
    p, moi = project()
    url = 'https://%s/' % p['subdomain']
    khoa, ma = trang_da_khoa(url)
    print('project %s%s | %s | tra ve %s | %s' % (PROJ, ' (vua tao)' if moi else '', url, ma, 'DA KHOA' if khoa else 'CHUA KHOA'), flush=True)
    if sys.argv[1:] == ['kiem_khoa']:
        if not khoa and da_dang() != 'cho-khoa':
            sys.exit('LECH: trang so dang MO cho nguoi la (Cloudflare Access bi tat?)')
        sys.exit(0)
    ra('url', url)
    ra('khoa', '1' if khoa else '0')
    ra('da_dang', da_dang())
