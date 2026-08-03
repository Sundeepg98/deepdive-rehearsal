"""W-ADDRESSES cycle 5, judge item 1 -- press the veil guard in the scheme where it was inert.

The judges reproduced R12's own defect INSIDE the cycle that closed it: on the clean tree, three
consecutive runs, run 3's 390/dark fill strip came back at 0.9101x runs 1-2 with max residual
0.0004 -- a compositing veil over a near-black ground -- and the arm exited 0, printing "cold vs
warm re-read: identical" because the veil sat across both reads.

P8   THE CONSTRUCTED VEIL, PAST THE FADE WAIT, IN BOTH SCHEMES. `body{animation:none;opacity:.9101}`
     injected after the wait that would otherwise have caught it, so the state AT the shot is
     veiled and the state BEFORE it was clean. Both schemes must FAIL naming the veil. On the
     cycle-4 code light FAILED (the ground invariant caught it) and DARK EXITED 0.
P9   THE SAME VEIL WITH THE SHOT-TIME READ DELETED -- the control that makes P8 a press of the new
     guard and not of something else. It found something nobody planted: in DARK the run still
     fails, and the arm that catches it is the CYCLE-5 KEY ARM, whose ground cross-check compares
     a measured pixel against .hm-panel's declared colour. That lever is |Y(panel) - Y(canvas)| =
     0.0163 in dark, 4.3x the trough/canvas gap the ground invariant levers on, so it clears the
     epsilon at alpha 0.91 where the trough cannot. A second, independent veil detector, arrived
     at sideways.
P9b  BOTH CYCLE-5 GUARDS DELETED -- the shot-time read AND the key arm's ground cross-check, which
     is exactly cycle-4's coverage. THIS is the reproduction of the judges' finding: dark GREEN,
     reporting a shifted ramp as though it were a measurement.
P10  THE INERTNESS BRANCH. The compositing ground is forced to the trough's own colour, so the gap
     the ground invariant levers on is zero and no alpha could cross the epsilon. The arm must FAIL
     saying it is inert -- not pass. No pixel is touched: this presses the guard's arithmetic.

Snapshots in memory; never `git checkout`. The shipped file is re-run green at the end.
"""
import os
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SS = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')

WIDTHS = ("const GAUGE_WIDTHS = [\n  { w: 1280, dsf: 2, vh: 2400 },\n"
          "  { w: 390, dsf: 3, vh: 2400 },\n];")
W390 = "const GAUGE_WIDTHS = [\n  { w: 390, dsf: 3, vh: 2400 },\n];"
THEMES = "for (const G of GAUGE_WIDTHS) for (const theme of ['light', 'dark']) {"
FADE_HEAD = "    await B.until(page, () => {\n      const el = document.querySelector('.hm-alt');"
FADE_TAIL = "    await B.settle(page);"
VEIL = ("    await page.addStyleTag({ content: "
        "'body{animation:none!important;opacity:.9101!important}' });\n")
GEO = "    const geo = await page.evaluate(() => {"
PRE = "      veilCheck(r, 'before');\n"
POST = "      veilCheck(await page.evaluate(SHOT_STATE), 'after');\n"
CANVAS = "        canvasBg: opaque(htmlBg) ? htmlBg : bodyBg,"
KEYGROUND = "        if (panelDecl !== null && Math.abs(k.groundY - panelDecl) > GROUND_EPS) {"
KEYGROUND_OFF = "        if (false && Math.abs(k.groundY - panelDecl) > GROUND_EPS) {"


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def run():
    r = subprocess.run(['node', 'test/scoreboard_salience.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


snap = read(SS)
for a in (WIDTHS, THEMES, FADE_HEAD, GEO, PRE, POST, CANVAS, KEYGROUND):
    assert a in snap, 'anchor not found: %r' % a[:60]


def drop_fade(src):
    i = src.index(FADE_HEAD)
    j = src.index(FADE_TAIL, i)
    return src[:i] + src[j:]


def narrow(src, theme):
    return (src.replace(WIDTHS, W390, 1)
            .replace(THEMES, "for (const G of GAUGE_WIDTHS) for (const theme of ['%s']) {" % theme, 1))


def veiled(theme, shot_time_read=True, key_ground=True):
    s = narrow(drop_fade(snap), theme)
    s = s.replace(GEO, VEIL + GEO, 1)
    if not shot_time_read:
        s = s.replace(PRE, '').replace(POST, '')
    if not key_ground:
        s = s.replace(KEYGROUND, KEYGROUND_OFF, 1)
    return s


CASES = [
    ('P8  veil .9101 past the fade wait, light@390', lambda: veiled('light'), 1),
    ('P8  veil .9101 past the fade wait, DARK@390', lambda: veiled('dark'), 1),
    ('P9  the same veil, shot-time read DELETED, light@390',
     lambda: veiled('light', False), 1),
    ('P9  the same veil, shot-time read DELETED, DARK@390',
     lambda: veiled('dark', False), 1),
    ('P9b BOTH cycle-5 guards deleted = cycle-4 s coverage, DARK@390',
     lambda: veiled('dark', False, False), 0),
    ('P10 compositing ground forced to the trough s own colour, light@390',
     lambda: narrow(snap, 'light').replace(CANVAS, "        canvasBg: tcs.backgroundColor,", 1), 1),
]

rows = []
try:
    for name, build, want in CASES:
        write(SS, build())
        code, out = run()
        verdict = 'as expected' if code == want else '*** UNEXPECTED (wanted exit %d) ***' % want
        rows.append('%-58s exit %d  %s' % (name, code, verdict))
        print(rows[-1], flush=True)
        for ln in out.split('\n'):
            t = ln.strip()
            if t.startswith('- [') or 'tightest adjacent' in t or 'trough/canvas gap' in t:
                print('     ' + t[:230], flush=True)
finally:
    write(SS, snap)
    code, out = run()
    print('\nRESTORED (identical to snapshot: %s): exit %d  %s'
          % (read(SS) == snap, code, out.strip().split('\n')[-1][:110]))

print('\n'.join(rows))
