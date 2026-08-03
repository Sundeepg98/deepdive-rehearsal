"""W-ADDRESSES cycle 4 -- press print_truth ARM F on the real tree (judge items 2 and 4).

MUTANT 1: the six GRADE-BEARING selectors R9 added, deleted from the print-color-adjust rule.
          The BYTE arm must stay green (that is the finding: it is worth 14 bytes) and ARM F2
          must go RED. If both stay green the survey's contribution is still decorative.
MUTANT 2: the whole rule deleted. The byte arm must FAIL *and so must the noise CONTROL* --
          cycle 3's control printed PASS on this mutant ("0 bytes against a 0-byte effect").
Snapshots in memory; never `git checkout`.
"""
import os
import re
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
CSS = os.path.join(ROOT, 'src', 'styles.css')
DELIVERABLE = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


def build():
    r = subprocess.run(['npm', 'run', 'build'], cwd=ROOT, capture_output=True, text=True,
                       shell=True, encoding='utf-8', errors='replace')
    if r.returncode:
        print(r.stdout[-2000:], r.stderr[-2000:])
    return r.returncode


def run():
    r = subprocess.run([r'node', 'test/print_truth.cjs'], cwd=ROOT, capture_output=True,
                       text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def arm(out, needle):
    for ln in out.split('\n'):
        if needle in ln:
            return 'PASS' if ln.strip().startswith('PASS') else 'FAIL'
    return 'ABSENT'


snap_css = read(CSS)
snap_html = read(DELIVERABLE)
RULE = ('.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,.hm-k i,.hm-k i::after,'
        '.hm-gr-t,\n.hm-room-n,.hm-room-bar,.hm-room-bar i,.ix-goal-bar,.ix-goal-bar span{')
assert RULE in snap_css, 'anchor not found in styles.css'

MUTANTS = [
    ('M1 six grade selectors deleted',
     snap_css.replace(RULE, '.hm-seg,.hm-seg::after,.hm-seg.open,.hm-seg.keel::before,'
                            '.hm-k i,.hm-k i::after{', 1)),
    ('M2 the whole rule deleted',
     re.sub(re.escape(RULE) + r'[^}]*\}', '.hm-nothing-at-all{color:inherit}', snap_css, count=1)),
]

try:
    print('BASELINE')
    assert build() == 0
    code, out = run()
    print('  exit=%d  bytes-arm=%s  noise-ctl=%s  prop-arm=%s  prop-ctl=%s' % (
        code, arm(out, '[lattice] the altitude gauge'), arm(out, '[lattice] CONTROL: there IS'),
        arm(out, '[lattice/prop] the room counts'),
        arm(out, '[lattice/prop] CONTROL: the surfaces')))
    rows = [('BASELINE', code, arm(out, '[lattice] the altitude gauge'),
             arm(out, '[lattice] CONTROL: there IS'), arm(out, '[lattice/prop] the room counts'))]
    for name, css in MUTANTS:
        write(CSS, css)
        assert build() == 0, name
        code, out = run()
        r = (name, code, arm(out, '[lattice] the altitude gauge'),
             arm(out, '[lattice] CONTROL: there IS'), arm(out, '[lattice/prop] the room counts'))
        rows.append(r)
        print('%-32s exit=%d  bytes=%s  noise-ctl=%s  prop=%s' % r)
        for ln in out.split('\n'):
            if 'lattice' in ln and ('exact' in ln or 'differs' in ln or '=' in ln):
                print('      ' + ln.strip()[:190])
finally:
    write(CSS, snap_css)
    write(DELIVERABLE, snap_html)
    print('\nRESTORED. rebuilding to confirm the tree is clean...')
    build()
    code, out = run()
    print('AFTER: exit=%d  bytes=%s prop=%s' % (code, arm(out, '[lattice] the altitude gauge'),
                                                arm(out, '[lattice/prop] the room counts')))

print('\n--- verdict ---')
print('M1 must show bytes=PASS and prop=FAIL (the byte arm cannot see those six selectors)')
print('M2 must show bytes=FAIL and noise-ctl=FAIL (cycle 3 the control PASSED on the null)')
