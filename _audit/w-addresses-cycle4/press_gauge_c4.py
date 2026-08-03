"""W-ADDRESSES cycle 4 -- press the R12 guards in scoreboard_salience ON THE REAL TREE.

Every mutant also narrows the gauge sweep to 390/light -- the cell the flake was found in --
because the guards are per-cell and a four-cell run costs four times as much to say the same
thing. That narrowing is part of the HARNESS, not part of the claim; the shipped file sweeps all
four and the gate run of record proves it.

  P1  the entrance fade held at a known alpha, with the cycle-3 code (no fade wait, no ground
      invariant): the run must go GREEN and report a SHIFTED ramp -- this is the defect, live.
  P2  the same veil against the SHIPPED code: the fade wait must catch it (the run never gets to
      measure), i.e. it must FAIL, naming the condition.
  P3  the veil applied AFTER the fade wait, with the ground invariant present: it must FAIL
      naming the VEIL rather than reporting a grade.
  P4  the same, with the ground invariant reverted: it must go GREEN on a veiled shot -- which is
      what makes P3 a press of the invariant and not of something else.
  P5  a layout shift injected BETWEEN the geometry read and the first shot: the shoot() guard,
      which cycle 3 anchored on the first shot and could therefore never see this, must FAIL.
  P6  the cold reading forced to differ from the warm one: the cold-run identity arm must FAIL.
"""
import os
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
SS = os.path.join(ROOT, 'test', 'scoreboard_salience.cjs')

NARROW = ("const GAUGE_WIDTHS = [\n  { w: 1280, dsf: 2, vh: 2400 },\n"
          "  { w: 390, dsf: 3, vh: 2400 },\n];")
NARROW_TO = "const GAUGE_WIDTHS = [\n  { w: 390, dsf: 3, vh: 2400 },\n];"
THEMES = "for (const G of GAUGE_WIDTHS) for (const theme of ['light', 'dark']) {"
THEMES_TO = "for (const G of GAUGE_WIDTHS) for (const theme of ['light']) {"

FADE_WAIT_HEAD = "    await B.until(page, () => {\n      const el = document.querySelector('.hm-alt');"
GROUND_HEAD = "      const tDecl = Y_OF_CSS(geo.trackBg);"
VEIL = ("    await page.addStyleTag({ content: "
        "'body{animation:none!important;opacity:.9117!important}' });\n")


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


snap = read(SS)


def base(src):
    src = src.replace(NARROW, NARROW_TO, 1)
    src = src.replace(THEMES, THEMES_TO, 1)
    return src


def drop_fade_wait(src):
    i = src.index(FADE_WAIT_HEAD)
    j = src.index("    await B.settle(page);", i)
    return src[:i] + src[j:]


def drop_ground(src):
    i = src.index(GROUND_HEAD)
    j = src.index("      const keelBoxes = [], keelTags = [], ruleBoxes = [];", i)
    return src[:i] + src[j:]


def veil_before_geo(src):
    a = "    const geo = await page.evaluate(() => {"
    return src.replace(a, VEIL + a, 1)


def veil_after_wait(src):
    """inject the veil after the fade wait but before the geometry read"""
    return veil_before_geo(src)


MUT = {}
MUT['P1 cycle-3 code + veil (the defect, live)'] = \
    veil_before_geo(drop_ground(drop_fade_wait(base(snap))))
MUT['P2 shipped fade wait + veil'] = veil_before_geo(base(snap))
MUT['P3 ground invariant vs a veil past the wait'] = \
    veil_after_wait(drop_fade_wait(base(snap)))
MUT['P4 ground invariant REVERTED, same veil'] = \
    veil_after_wait(drop_ground(drop_fade_wait(base(snap))))
MUT['P5 layout shift between geo and shot A'] = base(snap).replace(
    "    let shotAt = { x: geo.track.x, y: geo.track.y };",
    "    await page.addStyleTag({ content: '#home{margin-top:3px}' });\n"
    "    await B.settle(page);\n"
    "    let shotAt = { x: geo.track.x, y: geo.track.y };", 1)
MUT['P6 warm re-read forced to differ'] = base(snap).replace(
    "    const late = grade((await readMarks(null)).fill);",
    "    await style('_veil', 'body{opacity:.97!important}');\n"
    "    const late = grade((await readMarks(null)).fill);\n"
    "    await style('_veil', '');", 1)

MUT['P7 veil BEFORE the fade wait (the wait itself)'] = base(snap).replace(
    "    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,",
    VEIL + "    await B.until(page, () => !document.getElementById('_bootsplash'), null, B.ACT_MS,",
    1)

WANT = {'P7 veil BEFORE the fade wait (the wait itself)': 1,
        'P1 cycle-3 code + veil (the defect, live)': 0,
        'P2 shipped fade wait + veil': 1,
        'P3 ground invariant vs a veil past the wait': 1,
        'P4 ground invariant REVERTED, same veil': 0,
        'P5 layout shift between geo and shot A': 1,
        'P6 warm re-read forced to differ': 1}

rows = []
try:
    ONLY = sys.argv[1] if len(sys.argv) > 1 else ''
    for name, src in MUT.items():
        if ONLY and not name.startswith(ONLY):
            continue
        assert src != snap, name
        write(SS, src)
        r = subprocess.run(['node', 'test/scoreboard_salience.cjs'], cwd=ROOT,
                           capture_output=True, text=True, encoding='utf-8', errors='replace')
        out = (r.stdout or '') + (r.stderr or '')
        ok = (1 if r.returncode else 0) == WANT[name]
        rows.append((name, r.returncode, ok))
        print('%-46s exit=%d  want=%d  %s' % (name, r.returncode, WANT[name],
                                              'OK' if ok else '*** UNPRESSED ***'))
        for ln in out.split('\n'):
            s = ln.strip()
            if s.startswith('- [') or 'fill strip' in s or 'tightest adjacent' in s \
               or 'timed out' in s:
                print('      ' + s[:230])
finally:
    write(SS, snap)
    print('\nRESTORED -- re-running the shipped file to confirm the tree is clean')
    r = subprocess.run(['node', 'test/scoreboard_salience.cjs'], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print('AFTER THE PRESS: exit=%d  %s' % (r.returncode, (r.stdout or '').strip().split('\n')[-1][:100]))

bad = [x for x in rows if not x[2]]
print('\n%d presses, %d unpressed' % (len(rows), len(bad)))
sys.exit(1 if bad or r.returncode else 0)
