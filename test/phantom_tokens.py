#!/usr/bin/env python3
"""PHANTOM TOKENS -- var(--x, <literal>) where --x does not exist.

WHAT IT CATCHES
A custom property that is never defined, read through var() with a hardcoded
fallback. It renders exactly as intended, forever, so nothing ever looks wrong:
the page paints the fallback and the declaration reads as if it were on the
design scale. It is a scale bypass wearing the costume of compliance.

MEASURED on the pre-fix build (2026-07-29 frontend audit, P3-12):

    --font-size-h3   0 definitions, 2 use sites   .hm-cta-t / .hm-cta-ar
    --space-980      0 definitions, 9 use sites   every home max-width

.hm-cta-t is the LARGEST TYPE ON THE HOME SCREEN. It sized itself from a token
that has never existed, to 20px, a value the type scale does not contain (the
scale runs 18 -> 21 -> 24). Renaming or retiring a real token is caught by
review; a token that was never real is caught by nothing, because every
consumer already carries its own answer.

THE RULE
    var(--x, <fallback>)  and --x is defined somewhere   -> FINE. That is what
                                                            fallbacks are for.
    var(--x)              and --x is defined somewhere   -> FINE.
    var(--x, <fallback>)  and --x is defined NOWHERE     -> phantom.
    var(--x)              and --x is defined NOWHERE     -> phantom, and worse:
                                                            it renders nothing.

"Defined somewhere" is deliberately GENEROUS. All four of these count, because
in each one the token genuinely exists at render time and the fallback is doing
the job fallbacks are for:

    --x: <value>                     any CSS declaration, anywhere
    @property --x { ... }            a registered token
    style="--x:var(--y)"             an inline style attribute written by JS
                                     (this is how the app binds a room to an
                                     element: --rm on .hm-room / .ix-group)
    el.style.setProperty('--x', v)   a token whose whole purpose is to be set at
                                     runtime (--fb / --fl scroll shadows,
                                     --read-zoom). A static fallback is the
                                     CORRECT way to write those.

The check is looking for tokens that do not exist AT ALL, not for tokens
declared somewhere it dislikes.

THREE PARSING TRAPS, all three hit on real runs over the real deliverable:
  1. A var() name built by string concatenation in JS --
     "'var(--room-' + g.id + ')'" -- is not a reference to a token called
     "--room-". A name is only counted when the var() actually CLOSES (the next
     non-space character is ',' or ')'), so a concatenation is skipped.
  2. setProperty('--x', v) writes the name as a quoted argument with no colon,
     so a colon-based definition scan cannot see it. It is scanned for by name.
  3. PROSE IS NOT CODE. styles.css is inlined verbatim into the deliverable, so
     a comment explaining "this used to say var(--font-size-h3,20px)" scans as a
     live reference to a token that no longer has one -- the check reports the
     fix it just verified. (visual_regression.py has the same wound from the
     other side: it once read a class name written inside a comment as markup.)
     Comments are stripped before analysis, on both sides of the ledger: a token
     defined only inside a comment is not defined either.

THE RATCHET (test/phantom_tokens_debt.json), copied from parity_debt.json's
proven pattern. Three phantoms outside this wave's scope are ALLOWLISTED BY NAME
with a reason; the check fails on:
    NEW      a phantom that is not in the debt file  -- the real guard
    STALE    a debt entry that is no longer a phantom -- fixed, so delete it
The list can only shrink. Refresh deliberately with:
    python3 test/phantom_tokens.py --write-debt

SELF-TEST, every run. This repo has shipped four checks that could not fail, so
the analyser runs over a synthetic fixture first: two genuine phantoms and five
legitimate shapes (defined+fallback, defined-plain, @property, inline-style,
setProperty) plus one JS concatenation. It must flag exactly the two phantoms.
If it does not, the check ABORTS instead of reporting a green it did not earn.

Usage:  python3 test/phantom_tokens.py [deliverable.html] [--write-debt]
Exit:   0 = pass, 1 = FAIL
"""
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
WRITE_DEBT = '--write-debt' in sys.argv
DELIVERABLE = ARGS[0] if ARGS else os.path.join(
    ROOT, 'deepdive_content_pipeline_rehearsal.html')
DEBT_FILE = os.path.join(ROOT, 'test', 'phantom_tokens_debt.json')

# A var() reference that actually CLOSES: `var(--x)` or `var(--x, ...`. The
# trailing group is what rejects "'var(--room-' + g.id" -- see trap 1.
USE_RE = re.compile(r'var\(\s*(--[A-Za-z0-9_-]+)\s*([,)])')
# A definition: `--name:` in declaration position. Matches CSS blocks, @property
# bodies, and inline style attributes alike.
DEF_RE = re.compile(r'(--[A-Za-z0-9_-]+)\s*:')
# @property --x { ... } registers a token even if nothing assigns it here.
PROP_RE = re.compile(r'@property\s+(--[A-Za-z0-9_-]+)')
# el.style.setProperty('--x', v) -- a definition with no colon. See trap 2.
SET_RE = re.compile(r'setProperty\(\s*[\'"`](--[A-Za-z0-9_-]+)[\'"`]')
# /* ... */ comments, in both the CSS and the JS. See trap 3.
COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)


def strip_comments(text):
    """Prose that quotes a token is not a reference to it. See trap 3.
    Each comment is replaced by the newlines it spanned, so the reported line
    numbers still point at the real file."""
    return COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)


def phantoms(raw):
    """Return (list of (name, uses, uses_with_fallback), defined, uses)."""
    text = strip_comments(raw)
    defined = (set(DEF_RE.findall(text))
               | set(PROP_RE.findall(text))
               | set(SET_RE.findall(text)))
    uses = {}
    for name, closer in USE_RE.findall(text):
        uses.setdefault(name, []).append(closer == ',')
    out = []
    for name in sorted(uses):
        if name in defined:
            continue
        fb = uses[name]
        out.append((name, len(fb), sum(1 for f in fb if f)))
    return out, defined, uses


FIXTURE = '''
:root{--real-size:14px;--other:2px}
@property --typed{syntax:"<length>";inherits:true;initial-value:0px}
.a{font-size:var(--real-size,13px)}          /* defined + fallback   -- fine */
.b{margin:var(--other)}                      /* defined, no fallback -- fine */
.c{width:var(--typed,10px)}                  /* @property registered -- fine */
.d{font-size:var(--ghost-size,20px)}         /* PHANTOM, with fallback */
.e{color:var(--ghost-plain)}                 /* PHANTOM, no fallback  */
/* prose: this rule used to say var(--commented-ghost,4px) -- not a reference */
'''
FIXTURE_RUNTIME = '''
<button style="--rm:var(--room-x)"></button>
.f{box-shadow:inset 3px 0 0 var(--rm)}
bar.style.setProperty('--runtime-set', '24px');
.g{height:var(--runtime-set,0px)}
var s = 'style="--rm:var(--room-' + g.id + ')"';
'''


def self_test():
    """Flag exactly the planted phantoms; never the legitimate shapes."""
    problems = []
    found, _, _ = phantoms(FIXTURE)
    names = [n for n, _, _ in found]
    if '--ghost-size' not in names:
        problems.append('missed a phantom WITH a fallback (--ghost-size)')
    if '--ghost-plain' not in names:
        problems.append('missed a phantom with NO fallback (--ghost-plain)')
    for legit in ('--real-size', '--other', '--typed'):
        if legit in names:
            problems.append('false positive on a defined token (%s)' % legit)
    if '--commented-ghost' in names:
        problems.append('false positive on a token named only inside a comment '
                        '(--commented-ghost) -- prose is not code')

    found2 = [n for n, _, _ in phantoms(FIXTURE + FIXTURE_RUNTIME)[0]]
    if '--rm' in found2:
        problems.append('false positive on a token defined by an inline style (--rm)')
    if '--runtime-set' in found2:
        problems.append('false positive on a token defined by setProperty (--runtime-set)')
    if '--room-' in found2:
        problems.append('false positive on a var() name built by JS concatenation (--room-)')
    if '--room-x' not in found2:
        problems.append('missed a phantom referenced only from an inline style (--room-x)')
    return problems


def main():
    problems = self_test()
    if problems:
        print('=== PHANTOM TOKENS ===')
        print('SELF-TEST ABORT -- the analyser does not do what it claims:')
        for p in problems:
            print('  ' + p)
        return 1

    if not os.path.exists(DELIVERABLE):
        print('PHANTOM TOKENS: FAIL -- deliverable not found: %s' % DELIVERABLE)
        return 1
    with open(DELIVERABLE, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()

    found, defined, uses = phantoms(text)
    clean = strip_comments(text)
    live = dict((name, (n, fb)) for name, n, fb in found)

    if WRITE_DEBT:
        old = {}
        if os.path.exists(DEBT_FILE):
            with open(DEBT_FILE, 'r', encoding='ascii') as fh:
                old = json.load(fh)
        out = {}
        for name in sorted(live):
            out[name] = old.get(name, 'TODO: state why this one is not fixed here')
        with open(DEBT_FILE, 'w', encoding='ascii', newline='\n') as fh:
            fh.write(json.dumps(out, indent=2) + '\n')
        print('wrote %d allowlisted phantom(s) to %s' % (len(out), DEBT_FILE))
        return 0

    debt = {}
    if os.path.exists(DEBT_FILE):
        with open(DEBT_FILE, 'r', encoding='ascii') as fh:
            debt = json.load(fh)

    is_new = [n for n in sorted(live) if n not in debt]
    stale = [n for n in sorted(debt) if n not in live]

    print('=== PHANTOM TOKENS -- var(--x) where --x is defined nowhere ===')
    print('    scanned       : %s (%d bytes)'
          % (os.path.basename(DELIVERABLE), len(text)))
    print('    tokens defined: %d   referenced: %d' % (len(defined), len(uses)))
    print('    self-test     : 2 planted phantoms found; defined / @property / '
          'inline-style / setProperty / JS-concatenation / comment-prose all clean')
    print('    phantoms      : %d   allowlisted: %d   NEW: %d   STALE: %d'
          % (len(live), len(debt), len(is_new), len(stale)))
    for name in sorted(live):
        n, fb = live[name]
        tag = 'debt' if name in debt else 'NEW '
        print('      %s  %-22s %d use site(s), %d with a hardcoded fallback%s'
              % (tag, name, n, fb,
                 ('   -- ' + debt[name]) if name in debt else ''))

    if not is_new and not stale:
        print('\nPHANTOM TOKENS: PASS  (%d known phantom(s) allowlisted in '
              'phantom_tokens_debt.json; no new one, none left stale)' % len(debt))
        return 0

    if is_new:
        print('\n  %d NEW phantom token(s):' % len(is_new))
        for name in is_new:
            n, fb = live[name]
            print('    %-24s %d use site(s), %d with a hardcoded fallback'
                  % (name, n, fb))
            m = re.search(re.escape('var(' + name) + r'[,)]', text)
            if m:
                line = text.count('\n', 0, m.start()) + 1
                snip = text[max(0, m.start() - 40):m.start() + 60].replace('\n', ' ')
                print('        line %-7d ...%s...' % (line, snip))
        print('\n  A var() fallback is for a token that MIGHT be absent, not for one')
        print('  that never existed. Point the declaration at a real scale token, or')
        print('  add the token to design-tokens/tokens.json (it is generated -- never')
        print('  hand-edit src/tokens.generated.css).')
    if stale:
        print('\n  %d STALE allowlist entr(ies) -- no longer a phantom, so delete '
              'from phantom_tokens_debt.json:' % len(stale))
        for name in stale:
            print('    ' + name)

    print('\nPHANTOM TOKENS: FAIL')
    return 1


if __name__ == '__main__':
    sys.exit(main())
