#!/usr/bin/env python3
"""HOME RHYTHM -- the home route's stack gaps and content measure come from the
semantic layer, not from a pixel primitive picked per site.

WHAT IT CATCHES
A structural gap chosen one declaration at a time. MEASURED on the pre-fix tree
(2026-07-29 frontend audit, P3-11):

    Home's stacked sections used a different gap each:  24 16 18 26 30 26 26 20
    and all of them repeated the same content width:    max-width:var(--space-980)

Every one of those reads as disciplined -- `var(--space-26)` looks like a scale
decision -- and not one of them was. The audit's sentence is the whole finding:
`var(--space-13)` "looks disciplined and means 13px, chosen ad hoc". The spacing
layer is a 1:1 pixel passthrough, so a spacing token carries a NUMBER and no
INTENT, and a reviewer reading `margin:0 auto var(--space-30)` cannot tell
whether 30 was reasoned or typed.

WHAT THE SEMANTIC LAYER CHANGES, AND WHAT IT DELIBERATELY DOES NOT
Each stack slot now names its ROLE -- --gap-home-header, --gap-home-decision,
--gap-home-rooms -- and each role ALIASES the exact primitive that site already
used. Resolved values are identical; VR is 16/16 byte-identical; the wave moved
no pixels by construction.

It does NOT collapse 24/16/18/26/30/20 onto one value. That is normalisation, it
is a design judgement, and the audit explicitly PARKED it ("not to open a wave
that changes many pixels for no felt improvement"). What this layer buys is that
the judgement is now POSSIBLE: the eight slots that were scattered over 140 lines
of stylesheet are one block in one token file, a reviewer can see the whole
rhythm at once, and the future pass that wants a uniform stack edits nine values
in one place and reads a nine-line diff instead of hunting call sites.

Three slots share a value today (decision / section / telemetry are all 26px) and
they still get three names. That is not redundancy -- it is the honest record
that three different roles independently landed on the same number, which is
exactly the thing a normalisation pass needs to know and exactly the thing a
shared `var(--space-26)` hides.

THE RULE, inside this check's scope:
    a stack-rhythm gap   -> var(--gap-home-*)     nothing else
    a content measure    -> var(--measure-home)   nothing else
A raw literal (`26px`) fails. A bare primitive (`var(--space-26)`) fails too, and
that is the point: the primitive is still exactly what the semantic token
resolves to, so the failure is not about pixels, it is about whether the
declaration says WHY.

THE SCOPE BOUNDARY, stated honestly, and it is DERIVED rather than declared.
A home block is IN scope exactly when it participates in the home's centred
content column -- that is, when it declares the content measure (max-width). For
those blocks, and only those, two things are checked: the content measure itself,
and the stack-rhythm gap (a non-zero margin-top or margin-bottom, including the
top/bottom slots of a `margin` shorthand).

Defining the population by the measure rather than by a hand-written list is what
makes the boundary honest: the blocks that share the column ARE the stack, so the
same property that puts a block in the column is the one that puts it in scope,
and the two arms cover one population instead of two overlapping ones.

That boundary was CORRECTED BY THIS CHECK, on its first run. The first version
scoped by selector alone -- any `#home` / `.hm-*` rule with a non-zero margin --
and discovery immediately turned up two sites a hand-written list had missed and
that do NOT belong: `.hm-h{margin:0 0 var(--space-12)}`, the gap between a
section heading and its own body, and `.hm-cta-d{margin-top:2px}`, a two-pixel
optical nudge on a line of text INSIDE the hero button. Both are
component-internal, neither is stack rhythm, and a check that demanded a
`--gap-home-*` role name for a 2px nudge inside a button would have been the
noise this scope note exists to prevent. `#home .ix-foot{margin-top:...}` leaves
scope for the same reason: it is an override of the shared panel component, not a
member of the home column.

It is NOT an all-src gap ratchet, and that restraint is deliberate. `gap:` and
`margin:` appear in the hundreds across this stylesheet, the overwhelming
majority of them internal to a component -- the space between a brand mark and
its buttons, between a label and its bar -- where a primitive is the RIGHT answer
and a semantic name would be ceremony. A ratchet over all of it would fire
constantly, mean nothing, and be switched off within a month. The home stack is
the audit's own exemplar and a complete, self-contained structural surface: one
route, one document scroll, nine stacked blocks. Scoping to it is what makes the
green mean something.

INSIDE the scope the check is exhaustive by DISCOVERY, not by list. It parses the
stylesheet, finds every home block carrying a rhythm gap or a measure, and
requires every one to use the semantic layer -- so a NEW home section cannot ship
with a raw primitive by simply not being in a registry. The registry is then
cross-checked BOTH ways (a site that disappears goes STALE), which is the ratchet
pattern phantom_tokens.py and parity_debt.json already use here.

INTERNAL padding and inner flex/grid `gap` are OUT of scope by the same argument:
`gap:var(--space-14)` on .hm-top separates the brand from the actions INSIDE the
header, which is component-internal, not stack rhythm.

SELF-TEST, every run. This repo has shipped four checks that could not fail, so
the analyser runs over synthetic fixtures first: the legitimate shapes must stay
clean, and SIX planted defects must each be flagged -- a raw px gap, a bare
primitive gap, a raw measure, a bare primitive measure, a rhythm gap inside an
@media block, and a NEW home block that no registry entry covers. The shorthand
slot arithmetic is asserted separately (a 3-value margin's bottom is its third
slot, a 2-value margin's bottom is its first). If any is missed, or any
legitimate shape is flagged, the check ABORTS rather than report a green it did
not earn.

Usage:  python3 test/home_rhythm.py [--verbose]
Exit:   0 = pass, 1 = FAIL
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STYLES = os.path.join(ROOT, 'src', 'styles.css')
VERBOSE = '--verbose' in sys.argv

COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)
# a selector that names the home route or one of its blocks
HOME_SEL_RE = re.compile(r'(^|[\s,>+~])(#home\b|\.hm-[A-Za-z0-9_-]+)')
GAP_TOKEN_RE = re.compile(r'^var\(\s*--gap-home-[a-z0-9-]+\s*\)$')
MEASURE_TOKEN_RE = re.compile(r'^var\(\s*--measure-home\s*\)$')
ZERO_RE = re.compile(r'^0[a-z%]*$', re.I)

# THE REGISTRY. Cross-checked both ways against what DISCOVERY finds: an entry
# nothing matches is STALE, a discovered site with no entry is NEW. Both fail.
# This is not the enforcement mechanism -- discovery is -- it is the record that
# makes a change to the home stack's shape deliberate and reviewable.
REGISTRY = {
    ('.hm-top', 'margin-bottom'): '--gap-home-header',
    ('.hm-lead', 'margin-bottom'): '--gap-home-lead',
    ('.hm-state', 'margin-bottom'): '--gap-home-state',
    ('.hm-cta', 'margin-bottom'): '--gap-home-decision',
    ('.hm-rooms', 'margin-bottom'): '--gap-home-rooms',
    ('.hm-sec', 'margin-bottom'): '--gap-home-section',
    ('.hm-tele', 'margin-bottom'): '--gap-home-telemetry',
    ('.hm-skip', 'margin-bottom'): '--gap-home-skip',
}


def strip_comments(text):
    """Prose is not code. Replace each comment with the newlines it spanned so
    reported line numbers still point at the real file. This stylesheet carries
    long design notes that quote declarations verbatim, and a sibling check in
    this repo has already been tripped by exactly that."""
    return COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)


def rules(text):
    """Yield (lineno, selector, body, at_context) for every style rule.

    Brace-matched rather than line-based, so a rule inside @media is found with
    its context attached instead of being missed or mis-attributed."""
    clean = strip_comments(text)
    out, stack, start, i, n = [], [], 0, 0, len(clean)
    while i < n:
        c = clean[i]
        if c == '{':
            sel = clean[start:i].strip()
            if sel.startswith('@'):
                stack.append(sel)
                start = i + 1
                i += 1
                continue
            depth, j = 1, i + 1
            while j < n and depth:
                if clean[j] == '{':
                    depth += 1
                elif clean[j] == '}':
                    depth -= 1
                j += 1
            out.append((clean.count('\n', 0, i) + 1, sel, clean[i + 1:j - 1],
                        ' '.join(stack)))
            i = j
            start = i
            continue
        if c == '}':
            if stack:
                stack.pop()
            start = i + 1
        i += 1
    return out


def split_top(value):
    """Split a shorthand value on whitespace, but never inside parentheses --
    `var(--x, 4px)` is ONE slot, not two."""
    parts, depth, cur = [], 0, ''
    for ch in value:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch.isspace() and depth == 0:
            if cur:
                parts.append(cur)
                cur = ''
            continue
        cur += ch
    if cur:
        parts.append(cur)
    return parts


def margin_slots(value):
    """{'margin-top': v, 'margin-bottom': v} from a `margin` shorthand.

    CSS shorthand arithmetic, and it is worth spelling out because getting it
    wrong reads as a clean pass: 1 value sets all four; 2 values are
    top/bottom then left/right, so the BOTTOM is slot 0; 3 values are
    top, left/right, bottom, so the bottom is slot 2; 4 values are
    top right bottom left."""
    p = split_top(value)
    if len(p) == 1:
        return {'margin-top': p[0], 'margin-bottom': p[0]}
    if len(p) == 2:
        return {'margin-top': p[0], 'margin-bottom': p[0]}
    if len(p) == 3:
        return {'margin-top': p[0], 'margin-bottom': p[2]}
    if len(p) >= 4:
        return {'margin-top': p[0], 'margin-bottom': p[2]}
    return {}


def declarations(body):
    """[(prop, value)] from a rule body, parens-safe."""
    out, depth, cur = [], 0, ''
    for ch in body:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        if ch == ';' and depth == 0:
            out.append(cur)
            cur = ''
            continue
        cur += ch
    out.append(cur)
    got = []
    for d in out:
        if ':' not in d:
            continue
        prop, _, val = d.partition(':')
        got.append((prop.strip().lower(), val.strip()))
    return got


def sites(text):
    """Every in-scope (lineno, selector, prop, value, at_context) on a home block.

    A block is in scope exactly when it declares the content measure, i.e. when it
    is a member of the home's centred column -- see the SCOPE BOUNDARY note above
    for why the population is derived from the measure rather than listed. For
    those blocks: the measure, and any non-zero stack-rhythm margin slot. Padding
    and inner `gap` are never in scope."""
    found = []
    for lineno, sel, body, at in rules(text):
        if not HOME_SEL_RE.search(sel):
            continue
        slots = {}
        measure = None
        for prop, val in declarations(body):
            if prop == 'margin':
                slots.update(margin_slots(val))
            elif prop in ('margin-top', 'margin-bottom'):
                slots[prop] = val
            elif prop == 'max-width':
                measure = val
        if measure is None or ZERO_RE.match(measure) \
                or measure in ('none', 'auto', 'inherit', '100%'):
            continue          # not a column member: component-internal, out of scope
        for prop, val in sorted(slots.items()):
            if ZERO_RE.match(val) or val in ('auto', 'inherit'):
                continue
            found.append((lineno, sel, prop, val, at))
        found.append((lineno, sel, 'max-width', measure, at))
    return found


def judge(prop, val, expect=None):
    """None if the declaration is compliant, else why it is not.

    `expect` is the token the REGISTRY assigns to this exact slot. Checking the
    family alone is not enough and the reason is specific to this stack: three
    slots resolve to the same 26px, so --gap-home-section sitting on .hm-cta
    would render byte-identically and read as correct forever, while the token
    file quietly said the decision hero and the topic library are the same role.
    A semantic layer whose names can be swapped without consequence is not a
    semantic layer."""
    if prop == 'max-width':
        if MEASURE_TOKEN_RE.match(val):
            return None
        if val.startswith('var('):
            return ('the home content measure written as a bare primitive. It is the '
                    'same width nine blocks share; var(--measure-home) says so, '
                    'var(--space-980) says "980, for reasons unrecorded"')
        return ('a RAW home content measure. Nine blocks share this width and none '
                'of them said so. Use var(--measure-home)')
    if GAP_TOKEN_RE.match(val):
        if expect and val != 'var(%s)' % expect:
            return ('the WRONG semantic slot: this block is %s, but the declaration '
                    'reads %s. Three home slots resolve to the same 26px, so a swapped '
                    'name renders byte-identically and stays wrong forever -- the token '
                    'file would be asserting these are one role when they are three'
                    % (expect, val))
        return None
    if val.startswith('var(--gap-home-'):
        return ('a semantic slot carrying a hardcoded FALLBACK. The slot exists so '
                'this gap has exactly one answer; a fallback gives it two, and the '
                'one that renders is whichever the build happens to leave defined')
    if val.startswith('var('):
        return ('a home stack gap written as a bare pixel primitive. The primitive '
                'carries a number and no intent -- var(--space-26) looks like a scale '
                'decision and is not one. Use the var(--gap-home-*) slot for this '
                'block')
    return ('a RAW home stack gap. This is the declaration class the audit measured '
            'as 24/16/18/26/30 across five stacked sections. Use the '
            'var(--gap-home-*) slot for this block')


# --- self-test ----------------------------------------------------------------
FIXTURE_OK = '''
.hm-top{display:flex;gap:var(--space-14);max-width:var(--measure-home);
  margin:0 auto var(--gap-home-header)}
.hm-lead{max-width:var(--measure-home);margin:0 auto var(--gap-home-lead)}
.hm-room{gap:var(--space-8);padding:var(--space-14) var(--space-16)}
.hm-h{margin:0 0 var(--space-12)}
.hm-cta-d{margin-top:2px}
#home .ix-foot{margin-top:var(--space-28)}
#home .ix-panel{width:100%;max-width:var(--measure-home);margin:0 auto}
/* prose: this rule used to say margin:0 auto var(--space-24) -- not a declaration */
'''
# The three OUT-OF-SCOPE shapes above are the correction this check made to its own
# boundary on first run, pinned as fixtures so it cannot be undone quietly:
# .hm-h is a heading's gap to its own body, .hm-cta-d is a 2px optical nudge inside
# the hero button, #home .ix-foot is an override of the shared panel component.
# None is a member of the centred column, so none carries stack rhythm.
FIXTURE_BAD = '''
.hm-state{max-width:var(--measure-home);margin:0 auto 18px}
.hm-cta{margin:0 auto var(--space-26);max-width:var(--measure-home)}
.hm-rooms{max-width:980px;margin:0 auto var(--gap-home-rooms)}
.hm-sec{max-width:var(--space-980);margin:0 auto var(--gap-home-section)}
@media(max-width:919px){
  .hm-tele{max-width:var(--measure-home);margin:0 auto 12px}
}
.hm-brandnew{max-width:var(--measure-home);margin:0 auto var(--gap-home-brandnew)}
'''


def self_test():
    problems = []

    # shorthand arithmetic, asserted directly -- a wrong slot reads as a clean pass
    if margin_slots('0 auto var(--space-24)').get('margin-bottom') != 'var(--space-24)':
        problems.append('3-value margin: the bottom is the THIRD slot')
    if margin_slots('0 auto').get('margin-bottom') != '0':
        problems.append('2-value margin: the bottom is the FIRST slot')
    if margin_slots('1px 2px 3px 4px').get('margin-bottom') != '3px':
        problems.append('4-value margin: the bottom is the THIRD slot')
    if split_top('0 auto var(--x, 4px)') != ['0', 'auto', 'var(--x, 4px)']:
        problems.append('split_top() breaks a var() with a fallback into two slots: %s'
                        % split_top('0 auto var(--x, 4px)'))
    if judge('margin-bottom', 'var(--gap-home-header, 24px)') is None:
        problems.append('a fallback on a semantic slot passed as compliant -- a '
                        'hardcoded fallback is a second answer to the question the '
                        'slot exists to answer once')
    # a swapped slot renders byte-identically between the three 26px roles, so
    # nothing but this assertion can catch it
    if judge('margin-bottom', 'var(--gap-home-section)', '--gap-home-decision') is None:
        problems.append('a semantic slot carrying ANOTHER slot name passed as '
                        'compliant -- --gap-home-section on the decision hero renders '
                        'identically (both 26px) and would stay wrong forever')
    if judge('margin-bottom', 'var(--gap-home-decision)', '--gap-home-decision') is not None:
        problems.append('the correct slot for a block was rejected')

    found = sites(FIXTURE_OK)
    bad = [(s, p, v, judge(p, v)) for _, s, p, v, _ in found if judge(p, v)]
    if bad:
        problems.append('false positive on a legitimate shape: %s'
                        % ', '.join('%s %s:%s' % (b[0], b[1], b[2]) for b in bad))
    if not any(s == '.hm-top' and p == 'margin-bottom' for _, s, p, _, _ in found):
        problems.append('missed the rhythm gap in a 3-value margin shorthand')
    if any(s == '.hm-room' for _, s, _, _, _ in found):
        problems.append('component-internal padding/gap was pulled INTO scope '
                        '(.hm-room) -- the boundary is the point')
    if any(p == 'margin-top' and s == '#home .ix-panel' for _, s, p, _, _ in found):
        problems.append('a zero margin slot was treated as a rhythm gap')
    # the boundary correction, pinned: a home block with a margin but NO measure is
    # not a member of the centred column and carries no stack rhythm
    for sel, what in (('.hm-h', "a heading's gap to its own body"),
                      ('.hm-cta-d', 'a 2px optical nudge inside the hero button'),
                      ('#home .ix-foot', 'an override of the shared panel component')):
        if any(s == sel for _, s, _, _, _ in found):
            problems.append('%s (%s) was pulled INTO scope -- a home block that does '
                            'not declare the content measure is not a member of the '
                            'stack, and demanding a role name for it is the noise the '
                            'scope note exists to prevent' % (sel, what))

    found = sites(FIXTURE_BAD)
    whys = dict(((s, p), judge(p, v)) for _, s, p, v, _ in found)
    for key, want, why in ((('.hm-state', 'margin-bottom'), 'RAW home stack gap',
                            'a raw px gap'),
                           (('.hm-cta', 'margin-bottom'), 'bare pixel primitive',
                            'a gap left on the bare primitive'),
                           (('.hm-rooms', 'max-width'), 'RAW home content measure',
                            'a raw px measure'),
                           (('.hm-sec', 'max-width'), 'bare primitive',
                            'a measure left on the bare primitive'),
                           (('.hm-tele', 'margin-bottom'), 'RAW home stack gap',
                            'a rhythm gap inside an @media block')):
        if key not in whys or not whys[key]:
            problems.append('missed %s (%s %s)' % (why, key[0], key[1]))
        elif want not in whys[key]:
            problems.append('caught %s but blamed the wrong thing: %s'
                            % (why, whys[key]))
    if not any(s == '.hm-tele' and at for _, s, _, _, at in found):
        problems.append('a rule inside @media lost its at-rule context')
    # a NEW home block must be discovered even though no registry entry covers it
    if ('.hm-brandnew', 'margin-bottom') not in whys:
        problems.append('a NEW home block was not discovered -- the check would be a '
                        'fixed list, and a new section could ship unguarded')
    return problems


def main():
    problems = self_test()
    if problems:
        print('=== HOME RHYTHM ===')
        print('SELF-TEST ABORT -- the analyser does not do what it claims:')
        for p in problems:
            print('  ' + p)
        return 1

    if not os.path.exists(STYLES):
        print('HOME RHYTHM: FAIL -- src/styles.css not found')
        return 1
    with open(STYLES, 'r', encoding='utf-8', errors='replace') as fh:
        text = fh.read()

    found = sites(text)
    fails, seen = [], set()
    for lineno, sel, prop, val, at in found:
        why = judge(prop, val, REGISTRY.get((sel, prop)))
        if prop != 'max-width':
            seen.add((sel, prop))
        if why:
            fails.append((lineno, sel, prop, val, at, why))

    gaps = [f for f in found if f[2] != 'max-width']
    measures = [f for f in found if f[2] == 'max-width']

    print('=== HOME RHYTHM -- home stack gaps and measure come from the semantic layer ===')
    print('    scanned      : src/styles.css, rules naming #home or .hm-*')
    print('    scope        : blocks that declare the content measure, i.e. members')
    print('                   of the home centred column. On those: the measure, and')
    print('                   the stack-rhythm gap (non-zero margin-top/bottom, incl.')
    print('                   shorthand slots). A home block with NO measure is')
    print('                   component-internal and out of scope, as are padding')
    print('                   and inner gap -- see the SCOPE BOUNDARY note in this file.')
    print('    rhythm gaps  : %d discovered' % len(gaps))
    print('    measures     : %d discovered' % len(measures))
    print('    registry     : %d slot(s)' % len(REGISTRY))
    print('    self-test    : 6 planted defects found (raw gap; bare-primitive gap;')
    print('                   raw measure; bare-primitive measure; a gap inside')
    print('                   @media; an unregistered NEW home block) + shorthand')
    print('                   slot arithmetic asserted. Legitimate shapes,')
    print('                   component-internal gap/padding, a zero margin slot')
    print('                   and comment-prose all stayed clean')

    # --- the registry cross-check, both directions
    new = sorted(k for k in seen if k not in REGISTRY)
    stale = sorted(k for k in REGISTRY if k not in seen)
    for sel, prop in new:
        fails.append((0, sel, prop, '', '',
                      'a home block carrying a stack-rhythm gap that the REGISTRY does '
                      'not cover. Give the slot a role name in design-tokens/tokens.json '
                      'under gap.home and add it here -- a new section joining the stack '
                      'is exactly the moment its rhythm should be a decision'))
    for sel, prop in stale:
        fails.append((0, sel, prop, '', '',
                      'a STALE registry entry: no such home block carries this gap any '
                      'more. Delete the entry (and the token, which tracking-style '
                      'mint-on-use rules would otherwise leave orphaned)'))
    print('    cross-check  : %d NEW, %d STALE' % (len(new), len(stale)))

    if VERBOSE:
        for lineno, sel, prop, val, at in found:
            print('      %-22s %-14s %-26s %s'
                  % (sel[:22], prop, val[:26], ('[' + at + ']') if at else ''))

    if not fails:
        print('\nHOME RHYTHM: PASS  (%d rhythm gap(s) + %d measure(s), all from the '
              'semantic layer; registry matches discovery exactly)'
              % (len(gaps), len(measures)))
        return 0

    print('\n  %d violation(s):' % len(fails))
    for lineno, sel, prop, val, at, why in sorted(fails, key=lambda f: (f[1], f[2])):
        where = 'styles.css:%d' % lineno if lineno else 'registry'
        print('    %-24s %-14s %-24s %s' % (sel[:24], prop, val[:24], where))
        print('        %s%s' % (why, ('   [in %s]' % at) if at else ''))
    print('\n  Home stack roles live in design-tokens/tokens.json under `gap.home` and')
    print('  `measure.home`, and reach the app through the generator. Never hand-edit')
    print('  src/tokens.generated.css.')
    print('\nHOME RHYTHM: FAIL')
    return 1


if __name__ == '__main__':
    sys.exit(main())
