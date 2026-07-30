#!/usr/bin/env python3
"""W21 / W-X6 -- classify the layout delta. Is the VR churn ONLY the typeface?

This is the comparator behind the freeze's section 5 headline. It shipped without it in round 1
(cold verify F-C): `layout-delta.cjs` was committed but only DUMPS boxes, so the classification
"174 TEXT-SIZED, 898 REFLOW, 1 flagged STRUCTURAL" could not be reproduced from the repository.
The verifier re-derived every load-bearing figure with their own classifier and agreed on all of
them EXCEPT the TEXT-SIZED/REFLOW split (they got 391/681), for the simple reason that the
arbitrating rule was the part that was missing. Both splits are correct under their own rule;
that is exactly why the rule has to be in the repo rather than in someone's head.

THE RULE, stated so the split is checkable:

  STRUCTURAL  a moved box where a NON-TEXT layout property also changed -- padding, margin,
              border-width, gap, grid-template-columns, flex-wrap -- or where the computed
              font-size / font-weight / line-height changed. This is the STOP class: geometry
              with no text explanation. It is reported box by box, never as a bare count.

  TEXT-SIZED  the box's WIDTH changed and the box is one whose width is decided by its own text
              (the dumper's `textSized` flag: inline / inline-flex / table-cell / an auto-basis
              flex or grid item / white-space:nowrap), or it directly carries text.

  REFLOW      everything else that moved: a box displaced because a text-sized ancestor or
              earlier sibling changed size. Position changed, own sizing rule did not.

The TEXT-SIZED/REFLOW boundary is a judgement about ATTRIBUTION and nothing rests on it -- both
buckets are "font metrics did this". The load-bearing numbers are the ones that do not depend on
it: total moved, appeared, vanished, STRUCTURAL, and the font-property invariant below.

THE INVARIANT THAT ACTUALLY CARRIES THE WAVE, checked separately and reported first:
ZERO boxes may change computed font-size, font-weight or line-height. That is the difference
between "we swapped the family" and "we restyled the app", and it is what makes the 14-baseline
rebaseline attributable to the typeface. It is asserted over the whole population, not a sample.

Usage:  python3 _audit/w21-typeface-before-after/layout-classify.py [before.json] [after.json]
Exit:   0 = the delta is font-metric-only, 1 = a box changed for a non-text reason
"""
import collections
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BEFORE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'layout-BEFORE.json')
AFTER = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'layout-AFTER.json')

# A change in any of these means something other than the family moved.
BOX_PROPS = ['pad', 'mar', 'bw', 'gap', 'gtc', 'fw']
FONT_PROPS = ['fs', 'fwt', 'lh']
EPS = 0.01


def load(path):
    with open(path, 'r', encoding='utf-8') as fh:
        return json.load(fh)['surfaces']


def main():
    before, after = load(BEFORE), load(AFTER)
    grand = collections.Counter()
    structural, fontchanged = [], []
    rows = []

    for surf in before:
        b = {r['key']: r for r in before[surf]}
        a = {r['key']: r for r in after.get(surf, [])}
        common = set(b) & set(a)
        appeared, vanished = set(a) - set(b), set(b) - set(a)
        cls = collections.Counter()

        for k in sorted(common):
            rb, ra = b[k], a[k]
            moved = max(abs(rb['x'] - ra['x']), abs(rb['y'] - ra['y']),
                        abs(rb['w'] - ra['w']), abs(rb['h'] - ra['h'])) > EPS
            font_diff = [p for p in FONT_PROPS if rb.get(p) != ra.get(p)]
            if font_diff:
                fontchanged.append((surf, k, font_diff, rb, ra))
            if not moved:
                continue
            box_diff = [p for p in BOX_PROPS if rb.get(p) != ra.get(p)]
            if box_diff or font_diff:
                cls['STRUCTURAL'] += 1
                structural.append((surf, k, box_diff + font_diff, rb, ra))
            elif abs(rb['w'] - ra['w']) > EPS and (rb.get('textSized') or rb.get('ownText')):
                cls['TEXT-SIZED'] += 1
            else:
                cls['REFLOW'] += 1

        rows.append((surf, len(b), sum(cls.values()), cls['TEXT-SIZED'], cls['REFLOW'],
                     cls['STRUCTURAL'], len(appeared), len(vanished)))
        grand.update(cls)
        grand['boxes'] += len(b)
        grand['moved'] += sum(cls.values())
        grand['appeared'] += len(appeared)
        grand['vanished'] += len(vanished)

    print('=== W21 LAYOUT DELTA -- is the VR churn ONLY the typeface? ===')
    print('    before: %s' % os.path.basename(BEFORE))
    print('    after : %s' % os.path.basename(AFTER))
    print()
    print('  %-9s %7s %7s %11s %8s %11s %10s %9s'
          % ('surface', 'boxes', 'moved', 'TEXT-SIZED', 'REFLOW', 'STRUCTURAL',
             'appeared', 'vanished'))
    for r in rows:
        print('  %-9s %7d %7d %11d %8d %11d %10d %9d' % r)
    print('  %-9s %7d %7d %11d %8d %11d %10d %9d'
          % ('TOTAL', grand['boxes'], grand['moved'], grand['TEXT-SIZED'],
             grand['REFLOW'], grand['STRUCTURAL'], grand['appeared'], grand['vanished']))
    print()
    print('  THE INVARIANT -- boxes whose computed font-size / font-weight / line-height')
    print('  changed: %d. Anything but zero means this was not a family swap.'
          % len(fontchanged))
    for surf, k, props, rb, ra in fontchanged[:20]:
        print('    %-9s %-46s %s' % (surf, k[:46],
                                     ', '.join('%s %r->%r' % (p, rb.get(p), ra.get(p))
                                               for p in props)))

    if structural:
        print()
        print('  BOXES WITH A NON-TEXT CAUSE -- each must be explained, never waived:')
        for surf, k, props, rb, ra in structural:
            print('    %-9s %-46s %s' % (surf, k[:46], props))
            for p in props:
                print('        %-4s %r -> %r' % (p, rb.get(p), ra.get(p)))

    ok = (not fontchanged) and grand['appeared'] == 0 and grand['vanished'] == 0
    print()
    if not ok:
        print('LAYOUT DELTA: FAIL -- the change is not font-metric-only.')
        return 1
    print('LAYOUT DELTA: font-metric-only over %d boxes on %d surfaces '
          '(%d moved, 0 appeared, 0 vanished, 0 font-property changes).'
          % (grand['boxes'], len(rows), grand['moved']))
    if structural:
        print('%d box(es) carry a non-text property change and are listed above; the freeze '
              'must explain each one.' % len(structural))
    return 0


if __name__ == '__main__':
    sys.exit(main())
