# Pixel-level render verification (paired with _pw_verify.mjs, which writes
# _shot_a.png / _shot_b.png 1.5s apart, clipped to the canvas rect).
# Thresholds (calibrated, not aspirational):
#   non-background > 3%  -- proves the scene actually draws (not a blank canvas)
#   changed > 0.2%       -- proves animation (order of magnitude above zero;
#                           small particles 1.5s apart yield ~0.5% here)
# This proves "renders and animates". It does NOT judge aesthetics -- that is
# human-eye review (see CLAUDE.md).
import warnings; warnings.filterwarnings('ignore')
from PIL import Image, ImageChops
import sys
a = Image.open('_shot_a.png').convert('RGB'); b = Image.open('_shot_b.png').convert('RGB')
px = list(a.getdata()); bg = (13, 17, 23)
nonbg = sum(1 for p in px if abs(p[0]-bg[0])+abs(p[1]-bg[1])+abs(p[2]-bg[2]) > 30) / len(px)
diff = ImageChops.difference(a, b); dpx = list(diff.getdata())
moved = sum(1 for p in dpx if p[0]+p[1]+p[2] > 30) / len(dpx)
ok = nonbg > 0.03 and moved > 0.002
print(f"pixels -- non-background: {nonbg:.1%} (floor 3%) | changed: {moved:.1%} (floor 0.2%)")
print("PIXEL VERIFY:", "PASS" if ok else "FAIL")
sys.exit(0 if ok else 1)
