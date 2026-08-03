"""W-ADDRESSES cycle 4 -- press the widened craft_hygiene channels ON THE REAL TREE.

Two kinds of press, and both are needed:
  A. LIVE PLANTS -- a real defect written into a real shipped file in each new channel's exact
     shape; the check must go RED and the tree is restored from an in-memory snapshot (never
     `git checkout`: cycle 3's first press deleted an uncommitted fix that way).
  B. CODE MUTANTS -- each new channel reverted to what cycle 3 shipped; the SELF-TEST must ABORT.
     A channel whose removal leaves the gate green is decoration.
"""
import os
import subprocess
import sys

ROOT = r'D:\claude-workspace\_worktrees\deepdive-rehearsal\w-addresses'
CH = os.path.join(ROOT, 'test', 'craft_hygiene.py')


def run():
    r = subprocess.run([sys.executable, '-X', 'utf8', CH], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return r.returncode, (r.stdout or '') + (r.stderr or '')


def read(p):
    return open(p, encoding='utf-8', newline='').read()


def write(p, s):
    open(p, 'w', encoding='utf-8', newline='').write(s)


rows = []


def press(name, path, old, new, want_abort=False):
    p = os.path.join(ROOT, path.replace('/', os.sep))
    snap = read(p)
    assert old in snap, (name, 'anchor not found')
    write(p, snap.replace(old, new, 1))
    try:
        code, out = run()
    finally:
        write(p, snap)
    aborted = 'SELF-TEST ABORT' in out
    crashed = 'Traceback' in out
    ok = (code == 1) and (aborted if want_abort else True) and not crashed
    rows.append((name, code, 'ABORT' if aborted else ('FAIL' if code else 'PASS'), ok))
    print('%-42s exit=%d %-6s %s' % (name, code, rows[-1][2], 'OK' if ok else '*** UNPRESSED ***'))
    if not ok:
        print('    ---- output tail ----')
        print('\n'.join(out.strip().split('\n')[-14:]))


code, out = run()
print('BASELINE (clean tree): exit=%d  %s\n' % (code, out.strip().split('\n')[-1][:90]))
assert code == 0, 'the tree is not green before the press'

# ---------------------------------------------------------------- A. LIVE PLANTS
# 1. the ternary text sink -- pomodoro's own shape, with a mark the app has NEVER shipped
press('A1 ternary sink, far branch',
      'src/scripts/app/pomodoro.js',
      "playBtn.textContent = running ? '\\u2759\\u2759' : '\\u25B6';",
      "playBtn.textContent = running ? '\\u2759\\u2759' : '\\u27a4';")
# 2. the ternary setAttribute -- the same statement, one line down
press('A2 ternary setAttribute, far branch',
      'src/scripts/app/pomodoro.js',
      "playBtn.setAttribute('aria-label', running ? 'Pause focus timer' : 'Start focus timer');",
      "playBtn.setAttribute('aria-label', running ? 'Pause focus timer' : 'Start \\u27a4 timer');")
# 3. a literal that is NOT a sink and NOT markup: a plain const, session-progress's sparkline shape
press('A3 plain const literal (no channel)',
      'src/scripts/app/session-progress.js',
      "const blocks = '\\u2581\\u2582\\u2583\\u2584\\u2585\\u2586\\u2587\\u2588';",
      "const blocks = '\\u2581\\u2582\\u2583\\u2584\\u2585\\u2586\\u2587\\u27a4';")
# 4. THE HEAD RUN, once per typeset rule, in the live debrief literal
for rule, bad in (('ellipsis', 'the signals ... a senior'),
                  ('apostrophe', "the signal" + chr(92) + "'s a senior"),
                  ('quote', 'the "signals" a senior'),
                  ('dash', 'the signals - a senior')):
    press('A4 head run, %s' % rule,
          'src/scripts/app/drill/logic.js',
          "verdict = 'You&rsquo;re carrying the signals a senior",
          "verdict = 'You&rsquo;re carrying %s" % bad)
# 5. THE TAGLESS LITERAL
press('A5 tagless whole sentence',
      'src/scripts/app/drill/logic.js',
      "note = 'Below bar &mdash; the happy path isn&rsquo;t enough.",
      "note = 'Below bar &mdash; the happy path isn" + chr(92) + "'t enough.")
press('A5b tagless, straight quotes',
      'src/scripts/app/drill/logic.js',
      "note = 'Below bar &mdash; the happy path",
      'note = \'Below bar &mdash; the "happy path"')
# 6. THE FILE BOUND still holds for a re-keyed mark: U+2318 is ruled in keyboard-overlay.js AND
#    in session-progress.js -- a THIRD file must not inherit either
press('A6 same mark, a third file',
      'src/scripts/app/scroll-to-top.js',
      "btn.setAttribute('aria-label',",
      "btn.title = 'Top \\u2318';\n    btn.setAttribute('aria-label',")
# 7. THE COUNT still holds under mark-keying: one more U+2039 in touch-swipe.js
press('A7 one more site of a ruled mark',
      'src/scripts/app/touch-swipe.js',
      "hintEl.textContent = dir === 'prev' ? '\\u2039' : '\\u203a';",
      "hintEl.textContent = dir === 'prev' ? '\\u2039' : '\\u2039';")

# ---------------------------------------------------------------- B. CODE MUTANTS
press('B1 glyph rule back inside its channels',
      'test/craft_hygiene.py',
      "        for g in glyph_runs(whole):\n            out.append((line, g, 'glyph'))",
      "        for m in HTML_TEXT.finditer(lit):\n            "
      "out.append((line, dec(m.group(1)), 'glyph'))",
      want_abort=True)
press('B2 sink back to its first token',
      'test/craft_hygiene.py',
      "                out.add(''.join(buf))",
      "                out.add(''.join(buf))\n                break",
      want_abort=True)
press('B3 the HEAD channel removed',
      'test/craft_hygiene.py',
      "((HTML_TEXT, 1), (ATTR, 2), (HEAD_TEXT, 1))",
      "((HTML_TEXT, 1), (ATTR, 2))",
      want_abort=True)
press('B4 the BARE-LITERAL channel removed',
      'test/craft_hygiene.py',
      "        if (raw in sinks or bare_prose(whole)) and whole not in prose:",
      "        if (raw in sinks) and whole not in prose:",
      want_abort=True)
press('B5 the bare-literal BOUND removed',
      'test/craft_hygiene.py',
      "    return len(_WORD.findall(s)) >= 4",
      "    return True",
      want_abort=True)
press('B6 the mark key back to the enclosing span',
      'test/craft_hygiene.py',
      "        for g in glyph_runs(whole):\n            out.append((line, g, 'glyph'))",
      "        out.append((line, whole, 'glyph'))",
      want_abort=False)

# ---------------------------------------------------------------- C. THE FAILURE PRINTER
# The win32 gate console is cp1252 and this check's findings ARE non-cp1252 marks. Cycle 3's
# stale/grew/shrank printers had no guard, so the one path that prints a ratcheted mark's text
# died with a UnicodeEncodeError instead of reporting. Pressed by forcing a STALE entry with a
# U+21BB in it and running WITHOUT -X utf8, i.e. on the console the gate actually uses.
allowp = os.path.join(ROOT, 'test', 'craft_hygiene_allow.json')
snap = read(allowp)
import json  # noqa: E402
a = json.loads(snap)
a['spans']['ffffffffffffffff'] = {'file': 'src/scripts/app/panels.js', 'lines': [1], 'count': 1,
                                  'rules': ['glyph'], 'text': '\u21bb ghost', 'why': 'press'}
with open(allowp, 'w', encoding='utf-8', newline='\n') as fh:
    json.dump(a, fh, indent=1, ensure_ascii=True)
    fh.write('\n')
env = dict(os.environ)
env.pop('PYTHONUTF8', None)
env.pop('PYTHONIOENCODING', None)
try:
    r = subprocess.run([sys.executable, CH], cwd=ROOT, capture_output=True, env=env)
    outb = (r.stdout or b'') + (r.stderr or b'')
    txt = outb.decode('utf-8', 'replace')
finally:
    write(allowp, snap)
crash = 'UnicodeEncodeError' in txt or 'Traceback' in txt
saidstale = 'STALE EXCEPTIONS' in txt
ok = (r.returncode == 1) and saidstale and not crash
rows.append(('C1 cp1252 console prints the stale mark', r.returncode,
             'FAIL' if r.returncode else 'PASS', ok))
print('%-42s exit=%d %-6s %s' % ('C1 cp1252 console prints stale mark', r.returncode,
                                 'FAIL', 'OK' if ok else '*** UNPRESSED ***'))
if not ok:
    print('\n'.join(txt.strip().split('\n')[-12:]))

code, out = run()
print('\nAFTER THE PRESS (tree restored): exit=%d  %s' % (code, out.strip().split('\n')[-1][:90]))
bad = [r for r in rows if not r[3]]
print('\n%d presses, %d unpressed' % (len(rows), len(bad)))
sys.exit(1 if bad or code != 0 else 0)
