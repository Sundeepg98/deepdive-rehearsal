#!/usr/bin/env python3
"""GUARD: source is ASCII-only. No byte > 0x7F in any src/ .js/.css/.html file.

This is the single enforced invariant that makes per-edit character censuses
obsolete. The same glyph used to be written three ways (raw UTF-8 bytes, \\u
escapes, HTML entities); raw bytes are the silent-corruption vector (a hyphen
typed in place of an em-dash is visually identical and slips past review). The
standard: markup contexts (.html, and .js strings used as innerHTML) use HTML
entities; JS plain-text sinks (.textContent/.value) use \\u escapes; raw bytes
are forbidden. Entities and escapes are both ASCII and both fail loudly (a typo
renders as visible literal text, or is a parse error) — so banning raw bytes and
enforcing it here converts manual vigilance into an automatic gate.
"""
import os, sys
bad = []
for dp, _, fns in os.walk('src'):
    for fn in sorted(fns):
        if not fn.endswith(('.js', '.css', '.html')):
            continue
        p = os.path.join(dp, fn)
        for ln, line in enumerate(open(p, encoding='utf-8', errors='replace'), 1):
            for col, ch in enumerate(line, 1):
                if ord(ch) > 0x7F:
                    bad.append((p.replace('src/', ''), ln, col, ch))
if bad:
    print('ASCII GUARD: FAIL  (%d non-ASCII char(s) in source)' % len(bad))
    for p, ln, col, ch in bad[:60]:
        print('  %s:%d:%d  U+%04X %r' % (p, ln, col, ord(ch), ch))
    if len(bad) > 60:
        print('  ... and %d more' % (len(bad) - 60))
    sys.exit(1)
print('ASCII GUARD: PASS  (every src/ .js/.css/.html file is 7-bit ASCII)')
