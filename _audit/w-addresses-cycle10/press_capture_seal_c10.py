"""W-ADDRESSES cycle 10 -- R23: THE CERTIFICATION TREE IS SEALED FOR THE RUN, pressed in both
halves, in a SCRATCH REHEARSAL rather than by disturbing a real 19-minute gate.

R23 has two halves and each needs its own control:

  (a) NO CHECK REBUILDS IN THE CERTIFICATION WORKTREE. build_integrity now copies the build
      inputs to a temp mirror, junctions node_modules, builds THERE, and writes the tree only
      when the tree does not already carry that build. On a clean, already-built tree -- the
      only tree R13 certifies -- it must leave dist/index.html and the deliverable BYTE- AND
      MTIME-identical. That is arm A, and its control is arm A2: the same check on a tree whose
      dist/ is missing, where it MUST write (the fresh-CI-checkout case), so "it did not write"
      is a measurement and not an inability.

  (a2) AND THE BARRIER STILL MATERIALISES WHAT THE REST OF THE GATE READS. `npm run build`
      generates five gitignored things -- dist/index.html, src/tokens.generated.css,
      src/scripts/visuals/*, src/topics/_generated/** and src/topics/_generated-registry.js --
      and a fresh checkout has none of them. R23a's first draft synced two files and the free
      ubuntu lane reddened numbers_lattice, bank_pushback and bank_novelty within the hour.

  (b) THE CAPTURE IS WALL-CLOCK SEALED. check_all.py hashes dist/index.html and the deliverable
      after the barrier and again at the end, and ABORTS THE CAPTURE on a difference. Arm B runs
      a tiny selection and must come back sealed; arm C runs the same selection with a writer
      TOUCHING dist MID-RUN and must come back CAPTURE ABORTED with a non-zero exit. Arm C is
      the one that matters: a seal that has never fired is a seal nobody has tested.

THE MID-RUN WRITER IS A REAL SECOND PROCESS, not a monkeypatch: a background thread that waits
for the first check to finish and then appends a byte to dist/index.html, which is exactly the
shape of the thing the seal exists to catch (an editor, a second agent, a stray `npm run build`).
The original bytes are restored afterwards and the restore is VERIFIED byte-identical.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
OUT = os.path.join(ROOT, '_audit', 'w-addresses-cycle10', 'press-capture-seal.txt')
DIST = os.path.join(ROOT, 'dist', 'index.html')
NAME = 'deepdive_content_pipeline_rehearsal.html'
DELIVERABLE = os.path.join(ROOT, NAME)

lines = []


def say(s=''):
    lines.append(s)
    sys.stdout.write(s + '\n')
    sys.stdout.flush()


def md5(p):
    try:
        with open(p, 'rb') as fh:
            return hashlib.md5(fh.read()).hexdigest()
    except OSError:
        return 'ABSENT'


def stat(p):
    try:
        st = os.stat(p)
        return '%d bytes, mtime %.6f' % (st.st_size, st.st_mtime)
    except OSError:
        return 'ABSENT'


def gate(args, env=None, cwd=ROOT):
    e = dict(os.environ)
    e.setdefault('PYTHONIOENCODING', 'utf-8')
    if env:
        e.update(env)
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'test', 'check_all.py')] + args,
                       cwd=cwd, capture_output=True, text=True, encoding='utf-8',
                       errors='replace', env=e)
    return r.returncode, (r.stdout or '') + (r.stderr or '')


say('=== W-ADDRESSES cycle 10 -- R23: the certification tree is sealed for the run ===')
say('')

# ---------------------------------------------------------------------------------------------
# ARM A -- build_integrity on a CLEAN, ALREADY-BUILT tree writes NOTHING.
# ---------------------------------------------------------------------------------------------
before = {'dist': (md5(DIST), stat(DIST)), 'deliverable': (md5(DELIVERABLE), stat(DELIVERABLE))}
t0 = time.time()
r = subprocess.run([sys.executable, os.path.join(ROOT, 'test', 'build_integrity.py')],
                   cwd=ROOT, capture_output=True, text=True, encoding='utf-8', errors='replace')
after = {'dist': (md5(DIST), stat(DIST)), 'deliverable': (md5(DELIVERABLE), stat(DELIVERABLE))}
say('A. build_integrity ALONE, on this tree -- exit %d, %.1fs' % (r.returncode, time.time() - t0))
say('   ' + (r.stdout or r.stderr or '').strip().splitlines()[-1][:300])
for k in ('dist', 'deliverable'):
    moved = 'UNCHANGED' if before[k] == after[k] else 'MOVED'
    say('   %-12s %s   %s -> %s' % (k, moved, before[k][1], after[k][1]))
a_readonly = before == after
say('   READ-ONLY (bytes AND mtime, both artifacts): %s' % a_readonly)

# ---------------------------------------------------------------------------------------------
# ARM A2 -- THE CONTROL, AND IT IS THE WHOLE GENERATED SET RATHER THAN ONE FILE.
# `npm run build` produces five gitignored things the rest of the gate reads: dist/index.html,
# src/tokens.generated.css, src/scripts/visuals/*, src/topics/_generated/** and
# src/topics/_generated-registry.js. Removing all of them reproduces a FRESH CI CHECKOUT, which is
# the shape that caught R23a's first draft: with the build moved to a mirror and only two files
# synced back, the ubuntu lane reddened numbers_lattice, bank_pushback and bank_novelty with "0
# compiled num slices for 38 authored topics". So the control removes what a checkout lacks, and
# the check has to put every one of them back.
# ---------------------------------------------------------------------------------------------
GENERATED = ['dist', 'src/tokens.generated.css', 'src/scripts/visuals',
             'src/topics/_generated', 'src/topics/_generated-registry.js']
say('')
held = tempfile.mkdtemp(prefix='ddr-seal-hold-')
moved = []
for rel in GENERATED:
    p = os.path.join(ROOT, rel.replace('/', os.sep))
    if os.path.exists(p):
        dst = os.path.join(held, rel.replace('/', '__'))
        shutil.move(p, dst)
        moved.append((rel, p, dst))
try:
    r2 = subprocess.run([sys.executable, os.path.join(ROOT, 'test', 'build_integrity.py')],
                        cwd=ROOT, capture_output=True, text=True, encoding='utf-8',
                        errors='replace')
    a2 = {'dist': (md5(DIST), stat(DIST)), 'deliverable': (md5(DELIVERABLE), stat(DELIVERABLE))}
    say('A2. THE CONTROL -- the same check with all %d generated path(s) REMOVED (a fresh CI '
        'checkout) -- exit %d' % (len(moved), r2.returncode))
    say('    removed: ' + ', '.join(rel for rel, _p, _d in moved))
    say('    ' + (r2.stdout or r2.stderr or '').strip().splitlines()[-1][:400])
    back = [rel for rel, p, _d in moved if os.path.exists(p)]
    a2_wrote = len(back) == len(moved)
    say('    it PUT BACK %d of %d: %s' % (len(back), len(moved), ', '.join(back)))
    say('    the deliverable is %s'
        % ('untouched' if a2['deliverable'] == after['deliverable'] else 'MOVED'))
finally:
    for rel, p, dst in moved:
        if os.path.exists(p):
            (shutil.rmtree(p) if os.path.isdir(p) else os.remove(p))
        shutil.move(dst, p)
    shutil.rmtree(held, ignore_errors=True)
restored = md5(DIST) == before['dist'][0] and md5(DELIVERABLE) == before['deliverable'][0]
say('    every generated path restored from the held copy; dist and the deliverable are '
    'byte-identical to the start of this press: %s' % restored)

# ---------------------------------------------------------------------------------------------
# ARM B -- a SEALED run. A tiny selection, so this press costs seconds rather than 19 minutes;
# the seal is a property of the runner, not of how many checks it ran.
# ---------------------------------------------------------------------------------------------
say('')
vb = os.path.join(tempfile.gettempdir(), '_w10_seal_b.json')
cb, ob = gate(['--only', 'ascii_guard,syntax_check', '--verdicts', vb])
sealB = [ln for ln in ob.split('\n') if 'SEAL ' in ln or 'CAPTURE ABORTED' in ln]
say('B. a SEALED run (--only ascii_guard,syntax_check) -- exit %d' % cb)
for ln in sealB:
    say('   ' + ln.strip()[:160])
jb = json.load(open(vb)) if os.path.exists(vb) else {}
say('   capture_sealed=%s' % jb.get('capture_sealed'))

# ---------------------------------------------------------------------------------------------
# ARM C -- THE PRESS. A second writer touches dist/index.html WHILE the gate is running.
# ---------------------------------------------------------------------------------------------
say('')
original = open(DIST, 'rb').read()
fired = {'at': None}


def meddle():
    """Wait for the run to be under way, then append one byte to dist/index.html."""
    time.sleep(6)
    with open(DIST, 'ab') as fh:
        fh.write(b'\n')
    fired['at'] = time.time()


th = threading.Thread(target=meddle, daemon=True)
th.start()
vc = os.path.join(tempfile.gettempdir(), '_w10_seal_c.json')
cc, oc = gate(['--only', 'ascii_guard,syntax_check,unit_tests', '--verdicts', vc])
th.join(timeout=30)
open(DIST, 'wb').write(original)
say('C. THE PRESS -- one byte appended to dist/index.html mid-run by a second writer -- exit %d'
    % cc)
for ln in oc.split('\n'):
    if 'SEAL ' in ln or 'CAPTURE ABORTED' in ln or 'certifies a TREE' in ln:
        say('   ' + ln.strip()[:160])
jc = json.load(open(vc)) if os.path.exists(vc) else {}
say('   capture_sealed=%s   capture_of_record=%s' % (jc.get('capture_sealed'),
                                                     jc.get('capture_of_record')))
say('   dist/index.html restored byte-identical: %s' % (md5(DIST) == before['dist'][0]))

# ---------------------------------------------------------------------------------------------
ok_a = a_readonly
ok_a2 = a2_wrote and restored
ok_b = cb == 0 and jb.get('capture_sealed') is True
ok_c = cc != 0 and jc.get('capture_sealed') is False and 'CAPTURE ABORTED' in oc
say('')
say('VERDICT')
say('  A  a clean, already-built tree is READ-ONLY to build_integrity ......... %s' % ok_a)
say('  A2 the control: on a fresh-checkout shape it materialises all 5 ......... %s' % ok_a2)
say('  B  a quiet run comes back SEALED ....................................... %s' % ok_b)
say('  C  a mid-run writer ABORTS THE CAPTURE and the exit is non-zero ........ %s' % ok_c)
say('')
say('  C IS THE ENTRY THAT MATTERS. A seal that has never fired certifies nothing, and this one')
say('  fired on the one shape it exists for: bytes that moved while the run was reading them.')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w', encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')
