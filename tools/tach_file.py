# -*- coding: utf-8 -*-
r"""TACH TRANG SO SAN PHAM THANH NHIEU FILE CHO CLOUDFLARE PAGES (04/11/2026).
Cloudflare Pages chi nhan file <= 25 MiB; trang dung xong ~91 MB vi anh bia nhung base64 (~72 MB) + khoi the quay (~16 MB).
Lam: anh trong src="data:image/..;base64,.." -> a/<bam>.<duoi> · <script> trong trang > 1 MB -> j/<bam>.js (<script src>, giu id, giu thu tu chay).
Ten file theo bam noi dung => doi noi dung la doi ten, trinh duyet khong dung ban cu. Dau 'build:' va 'tq-ban' van o cuoi index.html.
Chay: python tach_file.py <thu muc vao (co index.html)> <thu muc ra>"""
import base64, hashlib, os, re, shutil, sys

GIOI_HAN = 25 * 1024 * 1024
SCRIPT_TACH = 1024 * 1024
DUOI = {'jpeg': 'jpg', 'jpg': 'jpg', 'png': 'png', 'webp': 'webp', 'gif': 'gif', 'svg+xml': 'svg'}


def bam(b):
    return hashlib.sha256(b).hexdigest()[:20]


def tach(vao, ra):
    s = open(os.path.join(vao, 'index.html'), encoding='utf-8').read()
    if os.path.isdir(ra):
        shutil.rmtree(ra)
    os.makedirs(os.path.join(ra, 'a'))
    os.makedirs(os.path.join(ra, 'j'))
    da_ghi = set()

    def ghi(rel, b):
        if rel not in da_ghi:
            open(os.path.join(ra, rel), 'wb').write(b)
            da_ghi.add(rel)
        return rel

    def anh(m):
        loai, du_lieu = m.group(2), m.group(3)
        b = base64.b64decode(du_lieu)
        return '%s%s"' % (m.group(1), ghi('a/%s.%s' % (bam(b), DUOI.get(loai, 'bin')), b))

    s, so_anh = re.subn(r'(\bsrc=")data:image/([a-z+]+);base64,([A-Za-z0-9+/=]+)"', anh, s)

    def script(m):
        attrs, than = m.group(1), m.group(2)
        if len(than) < SCRIPT_TACH or re.search(r'\bsrc\s*=', attrs):
            return m.group(0)
        b = than.encode('utf-8')
        return '<script%s src="%s"></script>' % (attrs, ghi('j/%s.js' % bam(b), b))

    s, _ = re.subn(r'<script([^>]*)>(.*?)</script>', script, s, flags=re.S)
    open(os.path.join(ra, 'index.html'), 'w', encoding='utf-8').write(s)
    for f in os.listdir(vao):                                   # file khac cua site (vd .nojekyll) giu nguyen
        p = os.path.join(vao, f)
        if f != 'index.html' and os.path.isfile(p):
            shutil.copy2(p, os.path.join(ra, f))
    lon = []
    for goc, _, files in os.walk(ra):
        for f in files:
            n = os.path.getsize(os.path.join(goc, f))
            if n > GIOI_HAN:
                lon.append((f, n))
    so_js = sum(1 for x in da_ghi if x.startswith('j/'))
    print('TACH: %d anh -> a/ (%d file) | %d script -> j/ | index.html %.1f MB' % (
        so_anh, sum(1 for x in da_ghi if x.startswith('a/')), so_js, os.path.getsize(os.path.join(ra, 'index.html')) / 1e6), flush=True)
    if lon:
        sys.exit('LOI: file qua 25 MiB, Cloudflare khong nhan: %s' % lon)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    tach(sys.argv[1], sys.argv[2])
