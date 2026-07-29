#!/usr/bin/env python3
"""GUARD: every source and content file is strict 7-bit printable ASCII.

This is the single enforced invariant that makes per-edit character censuses
obsolete. The same glyph used to be written three ways (raw UTF-8 bytes, \\u
escapes, HTML entities); raw bytes are the silent-corruption vector (a hyphen
typed in place of an em-dash is visually identical and slips past review). The
standard: markup contexts (.html, and .js strings used as innerHTML) use HTML
entities; JS plain-text sinks (.textContent/.value) use \\u escapes; raw bytes
are forbidden. Entities and escapes are both ASCII and both fail loudly (a typo
renders as visible literal text, or is a parse error) -- so banning raw bytes and
enforcing it here converts manual vigilance into an automatic gate.

TWO WIDENINGS, each paid for by something that actually got through.

1. SCOPE. This walked src/ .js/.css/.html only. That left the entire authored
   markdown corpus -- the 38 topic files that ARE the product -- outside the one
   check that guards encoding, and it left the checks themselves outside too.
   Three waves verified the corpus by hand instead; hand-verification is what
   this file exists to replace. Scope is now declared in SCOPE below, and a
   scope entry matching ZERO files is a FAIL, not a quiet pass: a guard that
   silently scans nothing is worse than no guard, because it reports green.

2. THE CONTROL CLASS. The old test was `ord(ch) > 0x7F` over a TEXT-mode read.
   That cannot see a NUL. A raw NUL byte has ord 0, sails through a `> 0x7F`
   test, is invisible in every editor and in most diffs, and one was in fact
   sitting in tools/compiler/mermaid.mjs as a hash separator. Text mode also
   translates newlines, so CR could never be reasoned about at all. This now
   reads BYTES and bans two classes: anything above 0x7E (high bytes AND DEL
   0x7F), and anything below 0x20 that is not tab, LF or CR.

A legitimate need for one of these bytes is met by ESCAPING it, never by typing
it -- '\\u0000' in JS is the same string as a raw NUL, and it is reviewable.
"""
import os, sys

# (directory, extensions). Every entry MUST match at least one file.
SCOPE = (
    ('src',           ('.js', '.css', '.html')),
    ('src/topics-md', ('.md',)),
    ('test',          ('.py', '.cjs', '.mjs', '.json')),
    ('tools',         ('.py', '.cjs', '.mjs', '.js', '.json')),
)
PRUNE = ('node_modules', '.git')
ALLOWED_CTRL = (0x09, 0x0A, 0x0D)   # tab, LF, CR


def classify(b):
    if b == 0x00:
        return 'NUL'
    if b < 0x20:
        return 'CTRL'
    if b == 0x7F:
        return 'DEL'
    return 'HIGH'


def scan(path):
    """Return [(line, col, byte)] for every byte outside printable ASCII."""
    with open(path, 'rb') as fh:
        data = fh.read()
    out = []
    line, col = 1, 1
    for b in data:
        if b > 0x7E or (b < 0x20 and b not in ALLOWED_CTRL):
            out.append((line, col, b))
        if b == 0x0A:
            line, col = line + 1, 1
        else:
            col += 1
    return out


bad, empty, counts, seen = [], [], [], set()
for base, exts in SCOPE:
    n = 0
    for dp, dns, fns in os.walk(base):
        dns[:] = [d for d in dns if d not in PRUNE]
        for fn in sorted(fns):
            if not fn.endswith(exts):
                continue
            p = os.path.join(dp, fn)
            key = os.path.normcase(os.path.abspath(p))
            if key in seen:
                continue
            seen.add(key)
            n += 1
            rel = p.replace(os.sep, '/')
            for ln, col, b in scan(p):
                bad.append((rel, ln, col, b))
    counts.append((base, n))
    if n == 0:
        empty.append(base)

if empty:
    print('ASCII GUARD: FAIL  (scope covers no files: %s -- a guard that scans '
          'nothing reports a green it did not earn)' % ', '.join(empty))
    sys.exit(1)

if bad:
    print('ASCII GUARD: FAIL  (%d non-ASCII byte(s) in %d file(s))'
          % (len(bad), len(set(b[0] for b in bad))))
    for rel, ln, col, b in bad[:60]:
        print('  %s:%d:%d  0x%02X  %s' % (rel, ln, col, b, classify(b)))
    if len(bad) > 60:
        print('  ... and %d more' % (len(bad) - 60))
    sys.exit(1)

print('ASCII GUARD: PASS  (%d files strict 7-bit ASCII: %s)'
      % (len(seen), ', '.join('%s %d' % (d, n) for d, n in counts)))
