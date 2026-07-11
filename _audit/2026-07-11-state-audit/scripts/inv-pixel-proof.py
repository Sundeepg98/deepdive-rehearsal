# Quantified pixel proof, using the SAME method as the project's own
# visual-trainer/_verify_pixels.py (non-background fraction, floor 3%).
# We crop the IDENTICAL rectangle -- the region where the canvas SHOULD live --
# from the as-shipped shot and the after-fix shot, and compare.
from PIL import Image

D = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/inv-rt-visual-trainer/'

# The canvas's laid-out rect after the fix (measured): x 346..939, y 126..459
BOX = (346, 126, 939, 459)

def nonbg(path, box, label):
    im = Image.open(path).convert('RGB').crop(box)
    px = list(im.getdata())
    # background = the app's light page bg, measured live: rgb(250,249,245)
    bg = (250, 249, 245)
    n = sum(1 for p in px
            if abs(p[0]-bg[0]) + abs(p[1]-bg[1]) + abs(p[2]-bg[2]) > 30)
    frac = n / len(px)
    print(f'{label:34s} non-background: {frac:6.1%}  ({n}/{len(px)} px)  '
          f'{"PASS" if frac > 0.03 else "FAIL"} vs the project\'s own 3% floor')
    return frac

print(f'Crop box (where the viz canvas belongs): {BOX}\n')
a = nonbg(D + 'A-desktop-asshipped.png',          BOX, 'AS SHIPPED (what users get)')
b = nonbg(D + 'B-desktop-after-resize-event.png', BOX, 'AFTER one resize event (the fix)')
print(f'\nratio after/before = {b/max(a,1e-9):.1f}x')
