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
    FLOOR = 4.5
    # The text colour that sits on --topic-solid differs by theme: light uses WHITE
    # (.mockbtn), dark uses the near-black --push-fg (#1A1622) -- a light tint serves as
    # both ink and solid in dark. Test the colour that is actually used.
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
            rows.append(f"  {theme:5} {g:26} ink/bg={c_ink:.2f}  text/solid={c_text:.2f} (text {fg})")
            if c_ink < FLOOR:
                fails.append(f'{theme}/{g}: ink {v["ink"]} on bg {bg} = {c_ink:.2f} < {FLOOR}')
            if c_text < FLOOR:
                fails.append(f'{theme}/{g}: {fg} on solid {v["solid"]} = {c_text:.2f} < {FLOOR}')
    print('=== Room contrast (bg light=%s dark=%s) ===' % (bg_light, bg_dark))
    print('\n'.join(rows))
    if fails:
        print('\nFAIL %d:' % len(fails))
        for f in fails:
            print('  - ' + f)
        sys.exit(1)
    print('\nROOM CONTRAST: PASS  (12 rooms x ink/bg + white/solid, all >= %.1f)' % FLOOR)

if __name__ == '__main__':
    main()
