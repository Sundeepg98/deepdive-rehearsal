# Re-applies the PROJECT'S OWN calibrated thresholds (visual-trainer/_verify_pixels.py,
# verbatim math: bg=(13,17,23), sum-abs-diff>30, non-bg floor 3%, change floor 0.2%)
# to the screenshots *I* captured, not the original agent's.
import warnings; warnings.filterwarnings('ignore')
from PIL import Image, ImageChops
import sys, os

BASE = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-visual-trainer-verify'

def verdict(tag):
    pa, pb = f'{BASE}/{tag}-canvas-a.png', f'{BASE}/{tag}-canvas-b.png'
    if not os.path.exists(pa):
        print(f'{tag}: MISSING'); return
    a = Image.open(pa).convert('RGB'); b = Image.open(pb).convert('RGB')
    px = list(a.getdata()); bg = (13, 17, 23)
    nonbg = sum(1 for p in px if abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]) > 30) / len(px)
    diff = ImageChops.difference(a, b); dpx = list(diff.getdata())
    moved = sum(1 for p in dpx if p[0]+p[1]+p[2] > 30) / len(dpx)
    ok = nonbg > 0.03 and moved > 0.002
    print(f'{tag:22s} size={a.size}  non-bg={nonbg:6.2%} (floor 3%)  changed={moved:6.2%} (floor 0.2%)  -> {"PASS" if ok else "FAIL"}')

verdict('shipped-desktop')
verdict('resized-desktop')
