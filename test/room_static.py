#!/usr/bin/env python3
"""ROOM STATIC INVARIANTS (Phase 6). Cheap grep-level guards that would each have caught a
bug that shipped for months:
  1. the accent codemod cannot regrow (no hardcoded indigo rgb()/rgba() literal returns, in any
     spacing or in modern slash syntax -- hex is NOT matched and rule 1 says why)
  2. no ambient infinite animation in styles.css (the instrument stays still)
  3. the six-room palette is actually present (a never-set --topic-accent shipped dead once)
  4. the boot room is pre-stamped on <html> (applyIdentity does not run at boot)
"""
import re, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, 'src')
GROUPS = ['messaging-events', 'data-storage', 'reliability-observability',
          'platform-infra', 'architecture-apis', 'security-tenancy']
fails = []

# 1. the 226-literal codemod cannot regrow.
#
# W23 (ledger L2), closing W20's recorded hazard H-1. This matched only the bare UNSPACED triple,
# which is one of the four ways to write the retired indigo -- so `rgba(83, 74, 183, .2)` and the
# modern `rgb(83 74 183 / 20%)` both walked past a rule whose docstring promises "no hardcoded
# indigo rgba literal returns". The gap was not hypothetical: widening it found a live escapee on
# the first run, src/tw.css:49, where .badge's own box-shadow had re-typed the digits of the
# --color-acc token its background uses two declarations further up.
#
# THE BARE-TRIPLE PATTERN IS KEPT VERBATIM, deliberately. It is what catches the digits written in
# a COMMENT, and W20 ruled (_audit/2026-07-30-w20-hue.md 7.1) that teaching this rule to skip
# comments would weaken a live guard to accommodate prose that can simply be written differently.
# Widening must not quietly narrow.
#
# HEX IS DELIBERATELY NOT MATCHED, and the residual that leaves is recorded rather than hidden.
# #534AB7 is the palette's OWN definition notation (styles.css:200, :1564; tw.css:17) and -- per
# that same W20 ruling -- the sanctioned way to name this colour in prose. Matching it would fail
# the tree on its own token declarations. So a hex literal in a CONSUMER position stays invisible
# here; src/scripts/app/print-qa.js:15,17 carry one today. That is a known gap, not a covered one.
RETIRED_INDIGO = ((83, 74, 183), (109, 95, 214))
_alts = []
for _r, _g, _b in RETIRED_INDIGO:
    # Functional notation FIRST: alternatives are tried left-to-right at the leftmost matching
    # position, and `rgba(` starts before its own digits, so a spaced or unspaced call is reported
    # once as the call it is rather than twice. `[,\s]` covers legacy commas and modern spaces.
    _alts.append(r'rgba?\(\s*%d\s*[,\s]\s*%d\s*[,\s]\s*%d\b' % (_r, _g, _b))
    _alts.append(r'%d,%d,%d' % (_r, _g, _b))
LITERAL = re.compile('|'.join(_alts), re.I)

hits = []
for root, _, files in os.walk(SRC):
    for f in sorted(files):
        if f.endswith(('.js', '.css', '.html')):
            p = os.path.join(root, f)
            txt = open(p, encoding='utf-8', errors='replace').read()
            for m in LITERAL.finditer(txt):
                hits.append('%s:%d  %s' % (os.path.relpath(p, BASE).replace(os.sep, '/'),
                                           txt.count('\n', 0, m.start()) + 1, m.group(0)))
if hits:
    # Naming the site is half the fix: W20 spent a gate run locating a single unattributed hit.
    fails.append('%d hardcoded indigo literal(s) regrew -- use an --acc-aNN rung, or '
                 'color-mix(in srgb, var(--color-acc) N%%, transparent) for a brand-fixed rung'
                 % len(hits))
    fails.extend('  at ' + h for h in hits)

css = open(os.path.join(SRC, 'styles.css'), encoding='utf-8').read()

# 2. no infinite animation in styles.css (match real animation declarations, not comments)
inf = re.findall(r'animation[^;{}]*\binfinite\b', css)
if inf:
    fails.append('%d infinite animation(s) in styles.css: %s' % (len(inf), inf[:3]))

# 3. the six-room palette block is present
for g in GROUPS:
    if ('data-group="' + g + '"') not in css:
        fails.append('room block missing from styles.css: ' + g)
if '--topic-ink' not in css or '--acc:var(--topic-ink)' not in css:
    fails.append('the --acc -> --topic-ink rebind is missing (rooms would not retint)')

# 4. boot is pre-stamped (index.html <html> carries data-group)
html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
head = html.split('<head>', 1)[0]
if 'data-group=' not in head:
    fails.append('index.html <html> is not stamped with data-group -- first paint boots roomless')

if fails:
    print('ROOM STATIC: FAIL')
    for f in fails:
        print('  - ' + f)
    sys.exit(1)
print('ROOM STATIC: PASS  (codemod=0, styles.css infinite=0, 6 room blocks + rebind, boot stamped)')
