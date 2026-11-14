# -*- coding: utf-8 -*-
"""Them trang /quan-tri/ (quan ly nhan vien) + nut chi admin thay vao ban dung (site_cf). Chay sau tach_file.py: python tools/them_quan_tri.py site_cf"""
import os, shutil, sys
ra = sys.argv[1]
nguon = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quan_tri')
dich = os.path.join(ra, 'quan-tri')
os.makedirs(dich, exist_ok=True)
for f in ('index.html', 'nut.js', 'moi.js', 'nhat_ky.js'):
    shutil.copy2(os.path.join(nguon, f), os.path.join(dich, f))
p = os.path.join(ra, 'index.html')
s = open(p, encoding='utf-8').read()
tag = '<script src="/quan-tri/nut.js" defer></script><script src="/quan-tri/moi.js" defer></script><script src="/quan-tri/nhat_ky.js" defer></script>'   # moi.js: the moi tuc thi qua Firebase /tim/moi
if tag not in s:
    i = s.rfind('</body>')
    s = (s[:i] + tag + s[i:]) if i >= 0 else s + tag
    open(p, 'w', encoding='utf-8').write(s)
print('QUAN TRI: da them /quan-tri/ + nut admin')

# ---- TIM THEO ANH (14/11/2026): mo hinh DINOv2 + van tay san (kho luat so-san-pham/tim_anh) -> /tim-anh/ ----
luat = os.environ.get('TIKTOK_LUAT', '')
vt = os.path.join(luat, 'so-san-pham', 'tim_anh') if luat else ''
ta = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tim_anh')
if vt and os.path.exists(os.path.join(vt, 'emb.bin')) and os.path.exists(os.path.join(ta, 'model.onnx')):
    d2 = os.path.join(ra, 'tim-anh'); os.makedirs(d2, exist_ok=True)
    shutil.copy2(os.path.join(ta, 'model.onnx'), os.path.join(d2, 'model.onnx'))
    shutil.copy2(os.path.join(ta, 'tim_anh.js'), os.path.join(d2, 'tim_anh.js'))
    for f in ('emb.bin', 'ma.json'):
        shutil.copy2(os.path.join(vt, f), os.path.join(d2, f))
    s = open(os.path.join(ra, "index.html"), encoding="utf-8").read()
    tg = '<script src="/tim-anh/tim_anh.js" defer></script>'
    if tg not in s:
        i = s.rfind('</body>')
        s = (s[:i] + tg + s[i:]) if i >= 0 else s + tg
        open(os.path.join(ra, 'index.html'), 'w', encoding='utf-8').write(s)
    print('TIM ANH: da them /tim-anh/ (mo hinh + van tay)')
else:
    print('TIM ANH: chua co van tay trong kho luat -> bo qua (tim theo anh dung cach cu)')
