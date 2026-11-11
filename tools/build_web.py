# -*- coding: utf-8 -*-
r"""DUNG TRANG SO SAN PHAM TREN GITHUB TU GIT (20/10/2026 — chu du an: "tren may dung tu git truoc roi moi keo ve may").
Mot noi dung duy nhat: GitHub Actions. May / phien Claude KHONG day trang len web nua.

Vao  (tat ca nam trong git):
  $TPL_GZ (mac dinh template/so_ma_san_pham.html.gz)  mau trang (the san pham + anh bia), nam o KHO RIENG TU; Actions tu them the moi roi commit lai
  LAW/so-san-pham/danh_muc.json     so goc (STT <-> ma <-> ten <-> link anh)       [kho luat]
  LAW/cat-ghep-video/...            phieu quay, bo loc hien web, CAU_HINH.json    [kho luat]
  CODE/<02_MODULE_DUNG_CHUNG>/*.py  SO_SP_DONG_BO / the_quay_web / so_giao_dien / lich_su_tim (CHINH cac file may dang dung)  [kho code]
Ra:
  site/index.html (+ dau ban ma 'build' o cuoi)  ·  site/.nojekyll  ·  template/ moi neu co the moi
Bien moi truong: TIKTOK_LUAT (thu muc kho luat) · CODE_DIR (thu muc 02_MODULE_DUNG_CHUNG) · TPL_GZ · TZ
04/11/2026: trang khong con dang len GitHub Pages ma len Cloudflare Pages co khoa gmail (xem dang_cf.py, tach_file.py)."""
import gzip, hashlib, io, json, os, shutil, sys, time

LAW = os.environ['TIKTOK_LUAT']
CODE = os.environ['CODE_DIR']
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TPL_GZ = os.environ.get('TPL_GZ') or os.path.join(HERE, 'template', 'so_ma_san_pham.html.gz')
WORK = os.path.join(HERE, '_work')
SITE = os.path.join(HERE, 'site')
os.environ.setdefault('TZ', 'Asia/Ho_Chi_Minh')
try:
    time.tzset()
except AttributeError:
    pass
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.path.insert(0, CODE)
import SO_SP_DONG_BO as S      # noqa: E402  (chinh file may PC dang dung)

os.makedirs(WORK, exist_ok=True)
os.makedirs(SITE, exist_ok=True)
html_p = os.path.join(WORK, 'so_ma_san_pham.html')
with gzip.open(TPL_GZ, 'rb') as f, open(html_p, 'wb') as o:
    shutil.copyfileobj(f, o)
json_p = os.path.join(LAW, 'so-san-pham', 'danh_muc.json')
d = S._doc_json(json_p)
k = S.kiem(json_p, html_p)
print('so goc %d ma | mau trang %d the | thieu the %d | the thua %d' % (k['json'], k['trang'], len(k['thieu_the']), len(k['the_thua'])), flush=True)

them = S._dong_bo_the(json_p, html_p)          # them the con thieu (tai anh bia theo link trong so)
if them:
    print('da them %d the moi' % len(them), flush=True)   # kho dung la kho CONG KHAI: khong in ma ra log
    with open(html_p, 'rb') as f, gzip.GzipFile(TPL_GZ + '.moi', 'wb', compresslevel=9, mtime=0) as g:
        shutil.copyfileobj(f, g)
    os.replace(TPL_GZ + '.moi', TPL_GZ)         # Actions commit lai mau moi (neu chay that)
    open(os.path.join(WORK, 'TEMPLATE_DOI'), 'w').write('1')

ra = os.path.join(SITE, 'index.html')
n, size = S.xuat_ban_tinh(ra, json_p, html_p, giu_khung=True)
open(os.path.join(SITE, '.nojekyll'), 'w').close()
s = open(ra, encoding='utf-8').read()
tail = ''
import re                                        # noqa: E402
m = re.search(r'<!-- tq-ban:[0-9a-f]+ -->\s*$', s)
if m:                                            # dau ban phieu quay phai o TAN CUOI trang (trang tu len ban moi doc o day) — chen dau build TRUOC no
    tail = m.group(0); s = s[:m.start()]
sha = hashlib.sha256(s.encode('utf-8')).hexdigest()[:16]
s = s + '<!-- build:%s -->' % sha + tail
open(ra, 'w', encoding='utf-8').write(s)
print('XONG: %d the | %.2f MB | build %s' % (n, len(s.encode('utf-8')) / 1e6, sha), flush=True)
open(os.path.join(WORK, 'BUILD_SHA'), 'w').write(sha)
