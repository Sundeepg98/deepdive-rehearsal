#!/usr/bin/env python3
"""Solve the security-tenancy hue. Every candidate must clear FOUR gates at once, so it is
cheaper to search than to guess:

  1. ink/bg     >= 4.5 in BOTH themes            (room_contrast.py's contract)
  2. text/solid >= 4.5 in BOTH themes            (white on light solid, #1A1622 on dark)
  3. HUE-DISTINCT from the other five rooms      (it is still a wayfinding signal)
  4. NOT in the alarm band                       (the whole point: a "Reveal answer" slab at
                                                  hue ~0-20 with high chroma reads DESTRUCTIVE)

Gate 4 is the requirement; gates 1-3 are what makes it hard. Prints the incumbent for
comparison so the trade is explicit.
"""
import colorsys

BG_L, BG_D = '#FAF9F5', '#0F0E13'
ON_SOLID_L, ON_SOLID_D = '#ffffff', '#1A1622'

OTHERS = {                       # (light ink, dark ink) of the five rooms we must not collide with
    'messaging-events':          ('#006B63', '#13BAAC'),
    'data-storage':              ('#315BB4', '#7DA6F3'),
    'reliability-observability': ('#924E00', '#E19556'),
    'platform-infra':            ('#694EB0', '#AD9AEE'),
    'architecture-apis':         ('#963D86', '#DA8DCA'),
}
STATUS = {'ok-light': '#1D6F3F', 'ok-dark': '#5BD08A', 'warn-light': '#9A5B0B', 'warn-dark': '#E5A24A'}


def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def lum(h):
    def f(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb(h)
    return .2126 * f(r) + .7152 * f(g) + .0722 * f(b)


def cr(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + .05) / (lo + .05)


def hue(h):
    r, g, b = rgb(h)
    return colorsys.rgb_to_hls(r, g, b)[0] * 360


def hue_gap(a, b):
    d = abs(hue(a) - hue(b)) % 360
    return min(d, 360 - d)


def report(name, ink_l, sol_l, ink_d, sol_d):
    rows = [
        ('ink/bg   light', cr(ink_l, BG_L)),
        ('white/solid  L', cr(ON_SOLID_L, sol_l)),
        ('ink/bg    dark', cr(ink_d, BG_D)),
        ('#1A1622/sol  D', cr(ON_SOLID_D, sol_d)),
    ]
    ok = all(v >= 4.5 for _, v in rows)
    print(f'\n=== {name}  ink={ink_l}/{ink_d}  solid={sol_l}/{sol_d} ===')
    print('   ' + '  '.join(f'{k}={v:.2f}' for k, v in rows) + ('   [CONTRAST OK]' if ok else '   [CONTRAST FAIL]'))
    print(f'   hue: light={hue(ink_l):5.1f}deg  dark={hue(ink_d):5.1f}deg')
    gaps = []
    for g, (ol, od) in OTHERS.items():
        gl, gd = hue_gap(ink_l, ol), hue_gap(ink_d, od)
        gaps.append(min(gl, gd))
        flag = '  <-- TIGHT' if min(gl, gd) < 22 else ''
        print(f'     vs {g:26} light {gl:5.1f}deg  dark {gd:5.1f}deg{flag}')
    for k, v in STATUS.items():
        print(f'     vs STATUS {k:11}       hue gap {hue_gap(ink_l, v):5.1f}deg (light ink)')
    print(f'   -> min hue gap to a room: {min(gaps):.1f}deg')
    alarm = min(abs(hue(sol_l) - 0) % 360, 360 - (abs(hue(sol_l) - 0) % 360))
    print(f'   -> distance of the SOLID slab from pure red (0deg): {alarm:.1f}deg  '
          + ('*** ALARM BAND ***' if alarm < 18 else 'clear of the alarm band'))


report('INCUMBENT security-tenancy (fire-engine red)', '#AA3832', '#E0322E', '#EC8C81', '#EC8C81')

# Candidates. The wheel is crowded (teal/blue/orange/violet/magenta already placed), so the
# only room to move is the magenta->red->orange arc. Push security-tenancy off pure red and
# into a deep ROSE/MULBERRY: still warm and "serious", but decisively not a delete button.
for nm, il, sl, idk, sdk in [
    ('CAND A  rose/mulberry ', '#A93A63', '#C43A72', '#EB8CB0', '#EB8CB0'),
    ('CAND B  deep raspberry', '#A73A57', '#C53A66', '#EE8CA4', '#EE8CA4'),
    ('CAND C  wine/claret   ', '#9E3A55', '#B93E63', '#E890A6', '#E890A6'),
]:
    report(nm, il, sl, idk, sdk)
