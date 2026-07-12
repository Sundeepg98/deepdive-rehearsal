#!/usr/bin/env python3
"""ROOM STATIC INVARIANTS (Phase 6). Cheap grep-level guards that would each have caught a
bug that shipped for months:
  1. the accent codemod cannot regrow (no hardcoded indigo rgba literal returns)
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

# 1. the 226-literal codemod cannot regrow
lit = 0
for root, _, files in os.walk(SRC):
    for f in files:
        if f.endswith(('.js', '.css', '.html')):
            txt = open(os.path.join(root, f), encoding='utf-8', errors='replace').read()
            lit += len(re.findall(r'83,74,183|109,95,214', txt))
if lit:
    fails.append('%d hardcoded indigo rgba literal(s) regrew -- use an --acc-aNN rung' % lit)

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
