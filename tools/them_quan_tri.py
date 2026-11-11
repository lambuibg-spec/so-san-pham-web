# -*- coding: utf-8 -*-
"""Them trang /quan-tri/ (quan ly nhan vien) + nut chi admin thay vao ban dung (site_cf). Chay sau tach_file.py: python tools/them_quan_tri.py site_cf"""
import os, shutil, sys
ra = sys.argv[1]
nguon = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'quan_tri')
dich = os.path.join(ra, 'quan-tri')
os.makedirs(dich, exist_ok=True)
for f in ('index.html', 'nut.js'):
    shutil.copy2(os.path.join(nguon, f), os.path.join(dich, f))
p = os.path.join(ra, 'index.html')
s = open(p, encoding='utf-8').read()
tag = '<script src="/quan-tri/nut.js" defer></script>'
if tag not in s:
    i = s.rfind('</body>')
    s = (s[:i] + tag + s[i:]) if i >= 0 else s + tag
    open(p, 'w', encoding='utf-8').write(s)
print('QUAN TRI: da them /quan-tri/ + nut admin')
