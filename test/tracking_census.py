#!/usr/bin/env python3
"""TRACKING CENSUS -- every letter-spacing this app declares must come from the
token layer, and the token layer may hold nothing the app does not use.

WHAT IT CATCHES
A hand-written tracking literal. At 9-10px uppercase, letter-spacing IS the craft
variable -- it is the difference between a label that reads as designed and one
that reads as typed -- and it was the single least governed property in the
stylesheet. MEASURED on the pre-fix tree (2026-07-29 frontend audit, P3-10):

    110 letter-spacing declarations, 0 of them tokenised, across 21 files.
    The 9-10px uppercase label -- ONE role -- was rendered ~29 ways.

Type and colour are contract-enforced pillars in this repo (typeface_census.py,
room_contrast.py). Space was the hollow one: nothing anywhere could tell you how
many tracking values the app had, so the answer grew one declaration at a time
and nobody was ever wrong. This check makes the set COUNTABLE and CLOSED.

WHAT THIS CHECK IS NOT
It is not a normalisation check. The W22 wave named reality AS-IS: every distinct
value in use got a token, at exactly the value it already had, so no glyph moved
(VR 16/16 byte-identical). Collapsing ~29 values onto two or three is a design
judgement the audit deliberately PARKED, and this check does not pre-judge it.
What it does is hand that future pass a countable set, one file to edit, and a
guard that stops the set regrowing while it waits.

THE RULE -- a letter-spacing value must be exactly one of:
    var(--track-*)          the token layer. The only source of a tracking length.
    var(--track-*, <fb>)    allowed, and PINNED: the fallback is compared against
                            the token's real value and a divergence FAILS. A
                            fallback is for a token that might be absent, not a
                            second answer to the same question.
    normal | inherit        keywords, not lengths. `normal` is the CSS initial
                            value and `inherit` is the honest form wherever the
                            cascade already carries it.
Anything else fails: a raw length (`.3px`, `-.02em`), a CSS-wide reset keyword
that is not `inherit`, or a var() pointing at some OTHER token family -- tracking
has one family, and a second one is how a scale grows two answers.

SIX ARMS, and the fifth is the one that matters
    1. LITERAL          a raw length. The ratchet: the set cannot grow.
    2. FOREIGN TOKEN    letter-spacing sourced from a non---track-* token.
    3. DRIFT            var(--track-x, FB) where FB is not the token's value.
    4. UNDEFINED        var(--track-x) where --track-x is in no token file.
    5. ORPHAN           a --track-* token that NOTHING uses.
    6. EM REGISTRATION  an `@property --track-em-*` in the built deliverable.

ARM 5 IS WHY THIS TIER IS NOT --space-N ALL OVER AGAIN. The audit's complaint
about the spacing layer is exact and it applies to any value-named tier:
`--space-19/39/43 exist only because someone once wrote 19/39/43px`, and
`var(--space-13)` "looks disciplined and means 13px, chosen ad hoc". A tracking
tier named after its own values would earn that same criticism -- EXCEPT for one
structural difference, and arm 5 is that difference. The space scale was minted
speculatively (every integer 1 to 20, used or not) and nothing ever removes a
rung. This tier is MINT-ON-USE: a token with zero call sites is a FAILURE, so the
set is exactly the set the app renders, today, provably. That is a property
--space-N has never had and cannot claim.

ARM 6 IS A ZERO-PIXEL TRIPWIRE, and it guards a real mechanism in this repo.
tools/postprocess-tokens.mjs walks the generated CSS and emits an `@property`
declaration for every token matching --space-N / --size-font-N / --z-* /
--duration-* / --line-height-* / --font-weight-*. Registration is load-bearing
elsewhere (print-qa.js:43 relies on it so getComputedStyle returns tokens fully
resolved). But a REGISTERED `<length>` custom property computes at its
DECLARATION site -- so `@property --track-em-0-08{syntax:"<length>"}` would
resolve `.08em` against the font-size of :root, once, and every uppercase label
in the app would silently take that one absolute px value instead of tracking its
own type size. Every em label would move, in a build whose token file did not
change. The em tokens are deliberately UNREGISTERED, and this arm is what keeps a
future one-line widening of that regex from moving pixels nobody asked to move.

SCOPE: AUTHORED source, defined exactly as typeface_census.py defines it -- what
git TRACKS under src/. `npm run build` writes output into src/ (compiled topic
slices, an esbuild bundle) and src/tokens.generated.css is itself generated and
gitignored, so the token DEFINITIONS are read from design-tokens/tokens.json --
the file a human edits. Never hand-edit src/tokens.generated.css.

SELF-TEST, every run. This repo has shipped four checks that could not fail, so
the analyser runs over synthetic fixtures first: the legitimate shapes (bare
token, pinned fallback, normal, inherit, comment prose) must stay clean, and SIX
planted defects must each be flagged -- a px literal, an em literal, a
no-leading-zero literal, a spaced-out literal, a foreign token, and a drifted
fallback. If any is missed, or any legitimate shape is flagged, the check ABORTS
rather than report a green it did not earn.

Usage:  python3 test/tracking_census.py [--verbose]
Exit:   0 = pass, 1 = FAIL
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
TOKENS_REL = 'design-tokens/tokens.json'
TOKENS = os.path.join(ROOT, 'design-tokens', 'tokens.json')
DELIVERABLE = os.path.join(ROOT, 'deepdive_content_pipeline_rehearsal.html')
VERBOSE = '--verbose' in sys.argv

# `letter-spacing:<value>` -- the value runs to the declaration terminator. These
# stylesheets are also written as JS string literals, so a backtick or a quote can
# end the declaration as surely as a semicolon can. Case-insensitive: CSS property
# names are, and typeface_census.py shipped a bug for exactly that reason.
DECL_RE = re.compile(r'\bletter-spacing\s*:\s*([^;{}!`\r\n"\']*)', re.I)
# A var() that actually CLOSES. Mirrors phantom_tokens.py: a name built by JS
# string concatenation is not a reference to a token.
VAR_RE = re.compile(r'^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,\s*(.*?)\s*)?\)$', re.S)
# /* ... */ in both the CSS and the JS. PROSE IS NOT CODE.
COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)
# a CSS length: optional sign, optional leading zero, a unit
LEN_RE = re.compile(r'^[+-]?(?:\d+\.?\d*|\.\d+)(px|em|rem|ex|ch|pt|pc|mm|cm|in|q|'
                    r'vw|vh|vmin|vmax)$', re.I)
# an @property registration in the built deliverable
ATPROP_RE = re.compile(r'@property\s+(--track-[A-Za-z0-9_-]+)')

FAMILY = '--track-'
KEYWORDS = ('normal', 'inherit')
# `initial`/`unset`/`revert` compute to `normal` here or to whatever the cascade
# had -- but they say nothing about intent, and this property is exactly where
# intent is the whole content. `inherit` is the honest form.
RESET_KEYWORDS = ('initial', 'unset', 'revert', 'revert-layer')


def strip_comments(text):
    """Replace each comment with the newlines it spanned, so reported line
    numbers still point at the real file."""
    return COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)


def norm_len(v):
    """Normalise a length for comparison. `.3px` and `0.30px` are one value;
    `0.3px` and `0.3em` are NOT -- the unit is part of the answer."""
    v = (v or '').strip().lower()
    m = LEN_RE.match(v)
    if not m:
        return None
    unit = m.group(1)
    try:
        return '%g%s' % (float(v[:-len(unit)]), unit)
    except ValueError:
        return None


def declarations(text):
    """Yield (lineno, raw_value) for every live letter-spacing declaration."""
    clean = strip_comments(text)
    for m in DECL_RE.finditer(clean):
        yield clean.count('\n', 0, m.start()) + 1, m.group(1).strip()


def track_tokens():
    """{css-name: normalised-value} from design-tokens/tokens.json.

    The DEFINITIONS are read from the authored token file, not from the generated
    CSS: src/tokens.generated.css is build output and gitignored, so on a clean
    checkout it does not exist at all, and a check that needs a build to have run
    before it can tell right from wrong is a check that reports SKIP-shaped greens
    on CI."""
    with open(TOKENS, 'r', encoding='utf-8') as fh:
        data = json.load(fh)
    out = {}

    def walk(node, path):
        if not isinstance(node, dict):
            return
        if '$value' in node:
            out['--' + '-'.join(path)] = norm_len(str(node['$value']))
            return
        for k, v in node.items():
            if not k.startswith('$'):
                walk(v, path + [k])

    walk(data.get('track', {}), ['track'])
    return out


def analyse(files, defined):
    """(findings, used) over (rel_path, text) pairs.

    findings: (rel, lineno, value, reason)
    used:     {token-name: [ 'rel:line', ... ]}
    """
    findings, used, total = [], {}, 0
    for rel, text in files:
        for lineno, raw in declarations(text):
            total += 1
            where = '%s:%d' % (rel, lineno)
            low = raw.lower()
            if low in KEYWORDS:
                continue
            if low in RESET_KEYWORDS:
                findings.append((rel, lineno, raw,
                                 'a CSS-wide reset keyword. It says nothing about '
                                 'intent, and tracking is a property where intent is '
                                 'the whole content -- `inherit` is the honest form'))
                continue
            m = VAR_RE.match(raw)
            if not m:
                if norm_len(raw) is not None:
                    findings.append((rel, lineno, raw,
                                     'a RAW TRACKING LITERAL. At 9-10px uppercase this '
                                     'is the craft variable, and an untokenised one is '
                                     'how the app reached ~29 values for one role. Use '
                                     'a var(--track-*) token'))
                else:
                    findings.append((rel, lineno, raw,
                                     'a letter-spacing value this check COULD NOT PARSE. '
                                     'Unreadable is not clean -- if this is a legitimate '
                                     'shape, teach the parser about it'))
                continue
            name, fallback = m.group(1), m.group(2)
            if not name.startswith(FAMILY):
                findings.append((rel, lineno, raw,
                                 'tracking sourced from a token OUTSIDE the --track-* '
                                 'family. Tracking has one family; a second one is how a '
                                 'scale grows two answers to the same question'))
                continue
            if name not in defined:
                findings.append((rel, lineno, raw,
                                 'references --track-* token %s, which is defined in no '
                                 'token file. Add it to design-tokens/tokens.json (it is '
                                 'generated -- never hand-edit src/tokens.generated.css)'
                                 % name))
                continue
            if fallback is not None:
                want, got = defined[name], norm_len(fallback)
                if got is None or want is None or got != want:
                    findings.append((rel, lineno, raw,
                                     'a PINNED fallback that has DRIFTED: %s is %s, the '
                                     'fallback says %s. A fallback is for a token that '
                                     'might be absent, not a second answer'
                                     % (name, want, fallback.strip())))
                    continue
            used.setdefault(name, []).append(where)
    return findings, used, total


def collect():
    """The AUTHORED files under src/, and a count of what was left out.

    Scope is what GIT TRACKS, for the reason typeface_census.py:260 argues at
    length: `npm run build` writes into src/, and a path-pattern skip can be
    evaded by a new file in a conveniently-named directory, whereas to ship
    authored source you have to commit it -- and the moment you do, it is in
    scope."""
    try:
        out = subprocess.run(['git', '-C', ROOT, 'ls-files', '--', 'src/'],
                             capture_output=True, text=True, timeout=60)
        tracked = [p.strip() for p in out.stdout.splitlines() if p.strip()]
    except Exception:
        return None, 0
    if not tracked:
        return None, 0
    wanted = [p for p in tracked if p.endswith(('.css', '.js', '.mjs', '.html'))]
    files = []
    for rel in sorted(wanted):
        path = os.path.join(ROOT, rel.replace('/', os.sep))
        if not os.path.exists(path):
            continue
        with open(path, 'r', encoding='utf-8', errors='replace') as fh:
            files.append((rel, fh.read()))
    on_disk = 0
    for root, _, names in os.walk(SRC):
        on_disk += sum(1 for n in names if n.endswith(('.css', '.js', '.mjs', '.html')))
    return files, on_disk - len(files)


# --- self-test ----------------------------------------------------------------
FIXTURE_TOKENS = {'--track-px-0-3': '0.3px', '--track-em-0-08': '0.08em',
                  '--track-px-neg-0-5': '-0.5px'}
FIXTURE_OK = ('src/fixture-ok.css', '''
.a{letter-spacing:var(--track-px-0-3)}
.b{letter-spacing:var(--track-em-0-08,.08em)}
.c{letter-spacing:normal}
.d{letter-spacing:inherit}
.e{letter-spacing: var(--track-px-neg-0-5) }
/* prose: this rule used to say letter-spacing:.3px -- not a declaration */
''')
FIXTURE_BAD = ('src/fixture-bad.css', '''
.f{letter-spacing:0.3px}
.g{letter-spacing:.08em}
.h{letter-spacing:-.5px}
.i{letter-spacing: 1.6px ;}
.j{letter-spacing:var(--space-2)}
.k{letter-spacing:var(--track-px-0-3,.9px)}
''')


def self_test():
    problems = []
    findings, used, total = analyse([FIXTURE_OK], FIXTURE_TOKENS)
    if findings:
        problems.append('false positive on a legitimate shape: %s'
                        % ', '.join('%r %s' % (f[2], f[3][:40]) for f in findings))
    if total != 5:
        problems.append('counted %d declarations in the clean fixture, expected 5 '
                        '(a comment was read as code, or a shape was missed)' % total)
    if sorted(used) != ['--track-em-0-08', '--track-px-0-3', '--track-px-neg-0-5']:
        problems.append('use-site attribution wrong on the clean fixture: %s'
                        % sorted(used))

    findings, _, _ = analyse([FIXTURE_BAD], FIXTURE_TOKENS)
    got = dict((f[2].strip(), f[3]) for f in findings)
    for want, why in (('0.3px', 'a px literal'),
                      ('.08em', 'an em literal with no leading zero'),
                      ('-.5px', 'a negative literal with no leading zero'),
                      ('1.6px', 'a literal written with surrounding spaces')):
        if want not in got:
            problems.append('missed %s (%s)' % (why, want))
        elif 'RAW TRACKING LITERAL' not in got[want]:
            problems.append('caught %s but blamed the wrong thing: %s' % (want, got[want]))
    if not any('OUTSIDE the --track-* family' in w for w in got.values()):
        problems.append('missed tracking sourced from a foreign token (var(--space-2))')
    if not any('DRIFTED' in w for w in got.values()):
        problems.append('missed a fallback that disagrees with its own token '
                        '(var(--track-px-0-3,.9px) while the token is 0.3px)')

    # the unit must never be collapsed: 0.3px and 0.3em are different answers
    if norm_len('.3px') == norm_len('.3em'):
        problems.append('norm_len() collapses px and em -- they are different values')
    if norm_len('.3px') != norm_len('0.30px'):
        problems.append('norm_len() fails to equate .3px and 0.30px')
    return problems


def main():
    problems = self_test()
    if problems:
        print('=== TRACKING CENSUS ===')
        print('SELF-TEST ABORT -- the analyser does not do what it claims:')
        for p in problems:
            print('  ' + p)
        return 1

    if not os.path.exists(TOKENS):
        print('=== TRACKING CENSUS ===')
        print('ABORT -- design-tokens/tokens.json not found. The token DEFINITIONS are')
        print('the thing this check measures against; without them it would report')
        print('every site undefined, which is noise, not a finding.')
        return 1
    defined = track_tokens()

    files, skipped = collect()
    if files is None:
        print('=== TRACKING CENSUS ===')
        print('ABORT -- `git ls-files src/` returned nothing. This check censuses')
        print('AUTHORED source and identifies that as "what git tracks"; with no git')
        print('answer it would either scan build output or scan nothing, and both are')
        print('wrong quietly.')
        return 1

    findings, used, total = analyse(files, defined)
    fails = list(findings)

    print('=== TRACKING CENSUS -- every letter-spacing comes from the token layer ===')
    print('    scanned      : %d AUTHORED (git-tracked) files under src/' % len(files))
    print('    not scanned  : %d build artefact(s) under src/ -- gitignored output of'
          % skipped)
    print('                   the topic compiler and esbuild')
    print('    declarations : %d live letter-spacing values' % total)
    print('    token layer  : %d --track-* tokens in design-tokens/tokens.json'
          % len(defined))
    print('    self-test    : 6 planted defects found (px literal; em literal;')
    print('                   no-leading-zero literal; spaced literal; foreign')
    print('                   token; drifted fallback). Bare token, pinned')
    print('                   fallback, normal, inherit and comment-prose stayed')
    print('                   clean; px/em never collapsed')

    # --- arm 5: MINT-ON-USE. A token nothing uses is a failure, and this is the
    # property that makes this tier something --space-N is not.
    orphans = [n for n in sorted(defined) if n not in used]
    for n in orphans:
        fails.append((TOKENS_REL, 0, n,
                      'an ORPHAN token: defined, used by NOTHING. This tier is '
                      'mint-on-use -- that is the whole difference between it and a '
                      'speculative scale like --space-19, which exists only because '
                      'someone once wrote 19px. Delete it, or use it'))

    # --- arm 6: the em tokens must stay UNREGISTERED
    registered = []
    if os.path.exists(DELIVERABLE):
        with open(DELIVERABLE, 'r', encoding='utf-8', errors='replace') as fh:
            registered = sorted(set(ATPROP_RE.findall(fh.read())))
        for n in registered:
            fails.append(('deepdive_content_pipeline_rehearsal.html', 0, n,
                          'a --track-* token REGISTERED with @property. A registered '
                          '<length> computes at its DECLARATION site, so an em token '
                          'would resolve against :root font-size once and every '
                          'uppercase label in the app would stop tracking its own type '
                          'size. Widen tools/postprocess-tokens.mjs and pixels move in '
                          'a build whose token file did not change'))
        print('    @property arm: %d --track-* token(s) registered in the deliverable '
              '(must be 0)' % len(registered))
    else:
        print('    @property arm: deliverable absent -- arm not run')

    print('    use sites    : %d token(s) used, %d orphan(s)' % (len(used), len(orphans)))
    print('    violations   : %d' % len(findings))

    if VERBOSE:
        for n in sorted(used):
            print('      %-24s %-9s %d site(s)  %s'
                  % (n, defined.get(n), len(used[n]), ', '.join(used[n][:4])))

    if not fails:
        print('\nTRACKING CENSUS: PASS  (%d declarations, %d from the token layer, '
              '0 literals, 0 orphans, 0 registered)' % (total, len(used)))
        return 0

    print('\n  %d violation(s):' % len(fails))
    by_reason = {}
    for rel, lineno, val, why in fails:
        by_reason.setdefault((val if lineno == 0 else val, why), []).append(
            '%s:%d' % (rel, lineno) if lineno else rel)
    for (val, why), where in sorted(by_reason.items(), key=lambda kv: -len(kv[1])):
        print('    %-30s %d site(s)' % (str(val)[:30], len(where)))
        print('        %s' % why)
        print('        %s%s' % (', '.join(where[:6]),
                                (' ... +%d more' % (len(where) - 6)) if len(where) > 6 else ''))
    print('\n  Tracking values live in design-tokens/tokens.json under `track`, and')
    print('  reach the app through the generator. Never hand-edit')
    print('  src/tokens.generated.css.')
    print('\nTRACKING CENSUS: FAIL')
    return 1


TOKENS_REL = 'design-tokens/tokens.json'

if __name__ == '__main__':
    sys.exit(main())
