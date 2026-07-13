#!/usr/bin/env python3
"""ROOM CONTRAST -- the contract is the contrast, not the hex (Phase 6).

The six rooms' inks are contrast-SOLVED. This check re-derives WCAG contrast from the
literal hex values in src/styles.css and fails if any room's ink/bg or white/solid drops
below AA (4.5). It has an INDEPENDENT reference (the WCAG formula), so it can catch a hex
that was mistyped or a palette that drifts -- the kind of thing a screenshot cannot.

If this fails, do NOT lower the floor. Re-solve the offending ink/solid and update the hex.
"""
import re, os, sys

BASE = os.path.join(os.path.dirname(__file__), '..')
CSS = os.path.join(BASE, 'src', 'styles.css')

def lum(hex_):
    hex_ = hex_.lstrip('#')
    r, g, b = (int(hex_[i:i+2], 16) / 255 for i in (0, 2, 4))
    def lin(c): return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)

def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

GROUPS = ['messaging-events', 'data-storage', 'reliability-observability',
          'platform-infra', 'architecture-apis', 'security-tenancy']

def parse_rooms(css):
    """Pull each room's ink/solid from the html[data-group=...] blocks, light + dark."""
    out = {'light': {}, 'dark': {}}
    for g in GROUPS:
        # light: html[data-group="G"]{...}  (not preceded by data-theme)
        ml = re.search(r'html\[data-group="' + re.escape(g) + r'"\]\s*\{([^}]*)\}', css)
        md = re.search(r'html\[data-theme="dark"\]\[data-group="' + re.escape(g) + r'"\]\s*\{([^}]*)\}', css)
        for key, m in (('light', ml), ('dark', md)):
            if not m:
                continue
            body = m.group(1)
            ink = re.search(r'--topic-ink:(#[0-9A-Fa-f]{6})', body)
            sol = re.search(r'--topic-solid:(#[0-9A-Fa-f]{6})', body)
            if ink and sol:
                out[key][g] = {'ink': ink.group(1), 'solid': sol.group(1)}
    return out

def parse_bg(css):
    light = re.search(r':root\{[^}]*?--bg:(#[0-9A-Fa-f]{6})', css, re.S)
    dark = re.search(r'html\[data-theme="dark"\]\{[^}]*?--bg:(#[0-9A-Fa-f]{6})', css, re.S)
    return (light.group(1) if light else '#FAF9F5'), (dark.group(1) if dark else '#15141A')

def main():
    css = open(CSS, encoding='utf-8').read()
    rooms = parse_rooms(css)
    bg_light, bg_dark = parse_bg(css)

    INK_FLOOR = 4.5
    # THE ON-SLAB FLOOR IS 5.0, NOT AA's 4.5 -- AND THAT EXTRA 0.5 IS THE WHOLE POINT.
    # --topic-solid is the BRIGHT endpoint of `linear-gradient(135deg, var(--acc), var(--acc2))`,
    # which is the paint under every primary CTA (.mockbtn, .push, and the .arc-n/.dn-n/.num/.dot
    # chips). The six solids used to be solved to the bare 4.5 and landed at 4.51-4.53 -- so the
    # rendered CTA measured 4.77:1: passing, by 0.27, with nothing left for a rounding error.
    #
    # Holding the ENDPOINT at 5.0 lifts every glyph on every gradient CTA at once, and that is a
    # theorem rather than a hope: CSS interpolates a legacy gradient in gamma-encoded sRGB and
    # sRGB->linear is convex, so by Jensen every interior colour is DARKER than the linear
    # interpolation of the endpoints -- i.e. carries MORE contrast against white. The minimum over
    # the slab is therefore reached AT an endpoint, and --topic-solid is the brighter one.
    # test/cta_contrast.cjs decodes the actual pixels; this check pins the endpoint they depend on.
    SLAB_FLOOR = 5.0

    # The ink that sits on --topic-solid flips with the theme, because --topic-solid does: a dark
    # hue in light, a light tint in dark. That is var(--on-slab). Test the colour actually used.
    ON_SOLID = {'light': '#ffffff', 'dark': '#1A1622'}
    fails, rows = [], []
    for theme, bg in (('light', bg_light), ('dark', bg_dark)):
        fg = ON_SOLID[theme]
        for g in GROUPS:
            v = rooms[theme].get(g)
            if not v:
                fails.append(f'{theme}/{g}: room block not found')
                continue
            c_ink = contrast(v['ink'], bg)
            c_text = contrast(fg, v['solid'])
            rows.append(f"  {theme:5} {g:26} ink/bg={c_ink:.2f}  on-slab/solid={c_text:.2f} (ink {fg})")
            if c_ink < INK_FLOOR:
                fails.append(f'{theme}/{g}: ink {v["ink"]} on bg {bg} = {c_ink:.2f} < {INK_FLOOR}')
            if c_text < SLAB_FLOOR:
                fails.append(f'{theme}/{g}: {fg} on solid {v["solid"]} = {c_text:.2f} < {SLAB_FLOOR} '
                             f'-- the CTA gradient\'s bright endpoint. Re-solve the solid; do not lower the floor.')
    print('=== Room contrast (bg light=%s dark=%s) ===' % (bg_light, bg_dark))
    print('\n'.join(rows))
    if fails:
        print('\nFAIL %d:' % len(fails))
        for f in fails:
            print('  - ' + f)
        sys.exit(1)
    print('\nROOM CONTRAST: PASS  (12 rooms: ink/bg >= %.1f, on-slab/solid >= %.1f)' % (INK_FLOOR, SLAB_FLOOR))

if __name__ == '__main__':
    main()
