# -*- coding: utf-8 -*-
r"""GIAM SAT DONG BO SO SAN PHAM (20/10/2026, chu du an: "tao can 100% moi sua doi deu cap nhat dong bo ko sai").
Chay tren GitHub moi 10 phut, KHONG phu thuoc PC. Lech ⇒ thoat 1 (workflow do ⇒ email chu kho).
Kiem:
  1. Firebase doc duoc, du lieu dung khuon.
  2. Ban chup Firebase -> git (so-san-pham/online/*.json): moi muc Firebase moi hon ban chup QUA 20 PHUT ma chua vao git ⇒ LECH.
  3. Lan DUNG WEB thanh cong gan nhat (workflow dung-web-tu-git) cach day QUA 30 PHUT ⇒ LECH.
  4. (04/11/2026) Web nam sau khoa gmail (Cloudflare Access), khong tai truc tiep duoc: workflow kiem rieng bang
     dang_cf.py kiem_khoa (trang dang MO cho nguoi la => LECH).
Kho nay CONG KHAI: log chi in so dem, khong in ma san pham.
"""
import datetime as dt, json, os, re, subprocess, sys, time, urllib.request

FB = 'https://project-c3d8a9ea-5303-4e42-969-default-rtdb.asia-southeast1.firebasedatabase.app'
LAW = os.environ['TIKTOK_LUAT']
REPO = os.environ.get('REPO', 'lambuibg-spec/so-san-pham')
CHO_PHEP_GIT = 20 * 60
CHO_PHEP_DUNG = 90 * 60      # lich cua GitHub thuc te 27-38 phut / lan (khong phai 10) ⇒ cho phep 90 phut moi bao; PC kich dung ngay khi git doi nen binh thuong nhanh hon nhieu
loi, ghi = [], []
sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def get(url, timeout=60, rng=None):
    h = {'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache'}
    if rng:
        h['Range'] = rng
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=timeout).read()


def jget(url):
    for lan in range(3):
        try:
            return json.loads(get(url).decode('utf-8') or 'null')
        except Exception as e:
            if lan == 2:
                raise
            time.sleep(3)


now = time.time()
# 1+2: Firebase <-> git
try:
    dq = jget(FB + '/daquay.json') or {}
    tim = jget(FB + '/tim/chung.json') or {}
    ghi.append('Firebase: %d khoa tich (x=1: %d) | %d tim' % (len(dq), sum(1 for v in dq.values() if v.get('x') == 1), len(tim)))
    for ten, fb in (('da_quay', dq), ('tim_chung', tim)):
        p = os.path.join(LAW, 'so-san-pham', 'online', ten + '.json')
        git = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {}
        khoa_t = (lambda v: v.get('t', 0))
        chua = [k for k, v in fb.items() if k not in git or khoa_t(v) > khoa_t(git[k]) or (v.get('x', v.get('v')) != git[k].get('x', git[k].get('v')) and khoa_t(v) >= khoa_t(git[k]))]
        cu = [k for k in chua if fb[k].get('t', 0) > 10 ** 11 and now - fb[k]['t'] / 1000 > CHO_PHEP_GIT]
        mat = [k for k in git if k not in fb]
        ghi.append('%s: git %d khoa | Firebase moi hon git: %d khoa (qua 20 phut: %d) | co o git ma Firebase khong co: %d' % (ten, len(git), len(chua), len(cu), len(mat)))
        if cu:
            loi.append('%s: %d muc o Firebase da QUA 20 PHUT ma chua vao git (nguoi gac online tren PC co the da tat)' % (ten, len(cu)))
        if mat:
            loi.append('%s: git co %d khoa Firebase khong co (Firebase bi xoa/mat du lieu?)' % (ten, len(mat)))
except Exception as e:
    loi.append('Firebase/git: khong kiem duoc: %s' % str(e)[:150])

# 3: lan dung web gan nhat
try:
    out = subprocess.run(['gh', 'api', 'repos/%s/actions/workflows/build.yml/runs?status=success&per_page=1' % REPO, '--jq', '.workflow_runs[0] | [.created_at, .head_sha] | @tsv'],
                         capture_output=True, text=True, encoding='utf-8').stdout.strip()
    if not out:
        loi.append('Chua co lan dung web nao thanh cong (workflow dung-web-tu-git)')
    else:
        t = dt.datetime.fromisoformat(out.split('\t')[0].replace('Z', '+00:00')).timestamp()
        tuoi = now - t
        ghi.append('Lan dung web thanh cong gan nhat: %d phut truoc' % (tuoi // 60))
        if tuoi > CHO_PHEP_DUNG:
            loi.append('Lan dung web thanh cong gan nhat cach day %d phut (cho phep 90) — GitHub tu dung bi dung?' % (tuoi // 60))
except Exception as e:
    loi.append('Khong doc duoc lich su dung web: %s' % str(e)[:120])

# 4: web dang chay — tu 04/11/2026 nam sau khoa gmail; buoc 'dang_cf.py kiem_khoa' trong workflow kiem khoa con bat.

print('\n'.join('  ' + x for x in ghi))
if os.environ.get('GITHUB_STEP_SUMMARY'):
    open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8').write('### Giam sat dong bo\n' + '\n'.join('- ' + x for x in ghi) + '\n' + ('\n### LECH\n' + '\n'.join('- ' + x for x in loi) if loi else '\n**TAT CA KHOP**\n'))
if loi:
    print('LECH:')
    print('\n'.join('  ! ' + x for x in loi))
    sys.exit(1)
print('TAT CA KHOP')
