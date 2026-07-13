#!/usr/bin/env python3
"""SLAB INK -- a literal white must never be painted on a theme-flipping slab.

THE BUG THIS EXISTS TO MAKE IMPOSSIBLE
Every colour this app fills a slab with INVERTS ITS LIGHTNESS between the two themes:

    --acc / --acc2   (the room)      light: a dark hue      dark: a light tint
    --teal / --red / --amber / --indigo (verdicts)   same inversion, for the same reason --
                                     each must stay legible against its OWN background.

So `color:#fff` on top of one of them is correct in exactly ONE theme and a hard AA failure in
the other, and nothing about the rule looks wrong when you read it. 26 rules hardcoded it; 25 sat
on a flipping slab. Decoding the rendered pixels (test/cta_contrast.cjs) put white-on-.dn-n at
2.35-2.44:1 in dark, across all six rooms -- about HALF the AA floor, on the "you are here"
marker of the drill nav, the walkthrough, the system map and the whiteboard. It shipped.

WHY A GREP, WHEN cta_contrast ALREADY DECODES PIXELS
Because the browser check can only measure what it can NAVIGATE to. Half this family lives behind
a :hover, a :focus, an overlay, or a state (.wb li.missed) that a smoke test does not reach --
and ::selection cannot be screenshotted at all. A grep cannot see contrast, but it CAN see the
one thing this bug has in common every single time: a literal white, in the same rule as a
background built from a token that flips. That shape is checkable everywhere, cheaply, forever.

The two checks are deliberately redundant and neither subsumes the other: this one has TOTAL
coverage and no ability to measure; cta_contrast measures truly and reaches less.

THE CONTRACT: a background built from a flipping token takes var(--on-slab) -- #fff in light,
#1A1622 in dark. If this fails, do NOT add an exemption; use the token.
"""
import re, os, sys, glob

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Tokens whose LIGHTNESS INVERTS between themes. Anything filled with one of these needs an ink
# that inverts with it.
FLIPPING = re.compile(r'--acc\b|--acc2\b|--accink\b|--teal\b|--red\b|--amber\b|--indigo\b'
                      r'|--topic-ink\b|--topic-solid\b')
WHITE = re.compile(r'color:\s*(#fff\b|#ffffff\b|white\b)', re.I)

# Rules whose background is a FIXED literal (does not flip), so a literal white is correct in both
# themes. Each needs a reason, and the reason is checked below -- an allowlist nobody re-validates
# is just a slower way to ship the bug.
FIXED_BG_OK = {
    '.ix-weak-n': '#dc2626',   # a fixed alarm red, identical in both themes
}

# Backgrounds inherited from sibling rules rather than declared inline: selector -> the rules that
# actually paint it. Kept explicit so a reader can re-derive the classification.
INHERITED_BG = {
    '.sigrow .mk': '--teal / --amber / --red (via .sigrow.ok|.no|.miss .mk)',
}


def sources():
    out = [os.path.join(BASE, 'src', 'styles.css')]
    for pat in ('src/scripts/app/*.js', 'src/scripts/app/*/*.js', 'src/panes/*.js', 'src/overlays/*.js'):
        out += sorted(glob.glob(os.path.join(BASE, pat)))
    return [p for p in out if os.path.exists(p)]


def main():
    fails, ok = [], []
    for path in sources():
        with open(path, encoding='utf-8') as fh:
            txt = fh.read()
        rel = os.path.relpath(path, BASE).replace('\\', '/')
        for m in re.finditer(r'([^{}\n]+)\{([^}]*)\}', txt):
            sel, body = m.group(1).strip(), m.group(2)
            if not WHITE.search(body):
                continue
            line = txt[:m.start()].count('\n') + 1
            bg = re.search(r'background(?:-color|-image)?:([^;]*)', body)
            bg_val = bg.group(1).strip() if bg else ''
            inherited = sel in INHERITED_BG
            flips = bool(FLIPPING.search(bg_val)) or inherited

            if sel in FIXED_BG_OK:
                want = FIXED_BG_OK[sel]
                # Re-validate the exemption instead of trusting it: the bg must STILL be that fixed
                # literal, and must STILL not flip. If someone re-points it at var(--red), this fires.
                if want not in bg_val or FLIPPING.search(bg_val):
                    fails.append('%s:%d  %s -- exempted as a fixed %s background, but its background '
                                 'is now "%s". The exemption no longer holds.' % (rel, line, sel, want, bg_val))
                else:
                    ok.append('%s:%d  %s (exempt: fixed %s, does not flip)' % (rel, line, sel, want))
                continue

            if flips:
                src = INHERITED_BG[sel] if inherited else bg_val
                fails.append('%s:%d  %s\n        literal white on a FLIPPING background: %s\n'
                             '        -> use color:var(--on-slab)  (#fff light / #1A1622 dark)'
                             % (rel, line, sel, src[:88]))

    print('=== SLAB INK -- literal white on a theme-flipping slab ===')
    for o in ok:
        print('  ALLOWED  ' + o)
    if fails:
        print('\nSLAB INK: FAIL %d' % len(fails))
        for f in fails:
            print('  - ' + f)
        print('\n  A slab colour that flips lightness between themes needs an ink that flips with it.')
        sys.exit(1)
    print('  no literal white on any --acc/--acc2/--teal/--red/--amber/--indigo background')
    print('\nSLAB INK: PASS')


if __name__ == '__main__':
    main()
