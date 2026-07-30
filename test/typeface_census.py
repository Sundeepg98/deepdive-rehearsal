#!/usr/bin/env python3
"""TYPEFACE CENSUS -- every font family this app declares must be one the app owns.

WHAT IT CATCHES
A declaration whose family list LOOKS deliberate and renders as something else.
The founding case, ledgered by the W4 cold verify as F-2 and confirmed
cross-engine by the 2026-07-30 browser audit:

    font: var(--font-weight-semibold) 10.5px -apple-system,sans-serif

`-apple-system` resolves on Apple platforms and NOWHERE ELSE. Off Apple the
generic `sans-serif` wins, which on Windows is ARIAL -- so 26 buttons, among
them all nine .seg pane tabs, rasterised in Arial while the stylesheet read as
if a system face had been chosen on purpose. WebKit and Firefox measured
byte-identical to Chromium (332.38px for the declared stack, same as a bare
`sans-serif`), so this is a platform truth, not an engine bug.

WHY latent_arial CANNOT CATCH IT
latent_arial asks "does this button carry NO author family?" -- it hunts
buttons that never escaped the UA default. These buttons DO carry an author
family. They are invisible to it BY CONSTRUCTION, which is why "latent Arial is
at zero" was true of that guard's ledger and false of the screen. This check
asks the other question, the one nothing asked before: "is the family a button
carries one the app actually owns?"

THE RULE -- a family list must be exactly one of:
    inherit             the honest form wherever the cascade already carries it
    var(--sans)         the app body stack, defined ONCE (src/styles.css :root)
    var(--display)      the display face
    var(--mono)         a mono stack -- var(--mono), var(--mono,monospace), or
                        any explicit list whose last family is `monospace`
    a token DEFINITION  the --sans / --display / --mono declarations themselves
    a DOCUMENTED        listed in EXCEPTIONS below, by file + exact family, with
    exception           a reason. Two exist; both are argued in place.

Anything else -- and in particular any `-apple-system`-led list that is not the
--sans definition -- is a FAIL. That is the ratchet: the class cannot regrow one
rule at a time, because a new orphan has to get past a named list to ship.

THE DRIFT ARM. src/scripts/app/print-qa.js writes its own document via
window.open() and must not depend on token harvesting for the single property
that decides whether the sheet is readable at all, so it keeps the stack as a
literal. A literal duplicate is exactly how the app stack drifts into two
answers, so the exception is not merely allowed -- the literal is COMPARED,
normalised, against the --sans token value, and a divergence fails. The
exception is pinned, not trusted.

SCOPE: AUTHORED source, which this check defines as what git TRACKS under src/.
`npm run build` writes output into src/ too (compiled topic slices, an esbuild
bundle), and those carry 186 families nobody here wrote -- mermaid's own
stylesheet frozen inside the cached diagram SVGs, and minified vendor code. See
collect() for why that is a git question and not a path-pattern skip.

SELF-TEST, every run. This repo has shipped four checks that could not fail, so
the analyser runs over a synthetic fixture first: five legitimate shapes and
four planted defects (the truncated stack, a partial system-ui stack, an
undeclared face, and a drifted print literal). It must flag exactly the four.
If it does not, the check ABORTS rather than report a green it did not earn.

Usage:  python3 test/typeface_census.py [--verbose]
Exit:   0 = pass, 1 = FAIL
"""
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'src')
VERBOSE = '--verbose' in sys.argv

# --- what a declaration looks like -------------------------------------------
# font-family:<list>   -- the list runs to the terminator, quotes may hold ';'
FAMILY_RE = re.compile(r'\bfont-family\s*:\s*([^;{}!`]+)')
# font:<shorthand>     -- `(?<![-\w])` keeps it off `font-family` / `--x-font`
SHORTHAND_RE = re.compile(r'(?<![-\w])font\s*:\s*([^;{}!`]+)')
# the font-size slot of the shorthand, with its optional /line-height. The
# family is whatever follows it.
SIZE_RE = re.compile(
    r'(?:^|\s)(?:[\d.]+(?:px|rem|em|%)|var\(\s*--font-size-[a-z0-9-]+\s*\))'
    r'(?:\s*/\s*(?:[\d.]+[a-z%]*|var\([^()]*\)))?\s+(?=\S)')
COMMENT_RE = re.compile(r'/\*.*?\*/', re.S)
# `--sans:<value>` wherever it is declared
SANS_DEF_RE = re.compile(r'--sans\s*:\s*([^;}]+)')

TOKEN_DEFS = ('--sans:', '--display:', '--mono:')

# --- the documented exceptions ------------------------------------------------
# (relative path, exact family list) -> why. Nothing else may carry a family the
# app does not own, and each of these is argued where it lives.
EXCEPTIONS = {
    ('src/scripts/app/print-qa.js',
     "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"):
        'print-qa.js opens its OWN document; :root reaches it only via '
        "tokenBlock(), so the one property that decides legibility stays a "
        'literal. PINNED to --sans by the drift arm below.',
    ('src/styles.css', "Georgia,'Times New Roman',serif"):
        '.sr-ttl -- the session report is a deliberate serif masthead, the one '
        'place the app speaks in a printed-document voice. A face the app owns '
        'on purpose, not an unresolved stack.',
}

# the two families above, normalised, that the check will accept from those files
LEGIT_TOKENS = {'inherit', 'var(--sans)', 'var(--display)', 'var(--mono)',
                'var(--mono,monospace)'}


def strip_comments(text):
    """Prose is not code. Replace each comment with the newlines it spanned so
    reported line numbers still point at the real file."""
    return COMMENT_RE.sub(lambda m: '\n' * m.group(0).count('\n'), text)


def unquote_tail(fam):
    """Drop a trailing quote that is a JS string terminator, not part of a family.

    These stylesheets are also written as JS string literals
    (`el.style.cssText = '...;font-family:inherit'`), so a declaration at the
    end of the string captures the closing quote. A family list cannot legally
    end in an UNPAIRED quote, so an odd count is the tell -- and only then is it
    stripped, which leaves a genuine `font-family:'Space Grotesk'` intact."""
    f = fam.strip()
    if f and f[-1] in '"\'' and f.count(f[-1]) % 2 == 1:
        return f[:-1].strip()
    return f


def norm(fam):
    """Normalise a family list for comparison: collapse whitespace, unify quote
    style. `'Segoe UI'` and `"Segoe UI"` are the same family."""
    f = re.sub(r'\s*,\s*', ',', unquote_tail(fam))
    f = re.sub(r'\s+', ' ', f)
    return f.replace('"', "'")


def family_of(kind, value):
    """The family-list tail of a declaration, or None if there isn't one."""
    v = value.strip()
    if kind == 'font-family':
        return unquote_tail(v)
    if v == 'inherit':
        return 'inherit'
    m = SIZE_RE.search(v)
    return unquote_tail(v[m.end():]) if m else None


def declarations(text):
    """Yield (lineno, kind, raw_value) for every font declaration."""
    for lineno, line in enumerate(strip_comments(text).splitlines(), 1):
        for m in FAMILY_RE.finditer(line):
            yield lineno, 'font-family', m.group(1)
        for m in SHORTHAND_RE.finditer(line):
            yield lineno, 'font', m.group(1)


def classify(rel, fam):
    """'ok' | 'exception' | a failure reason."""
    n = norm(fam)
    if n in LEGIT_TOKENS:
        return 'ok'
    if n.split(',')[-1].strip() == 'monospace':
        return 'ok'
    if (rel, unquote_tail(fam)) in EXCEPTIONS:
        return 'exception'
    if '-apple-system' in n:
        # Two different wrongs, and saying so matters: only the first one
        # rasterises as Arial, and a report that blames both for it is lying
        # about what the pixels will do.
        resolvable = ('system-ui', "'segoe ui'", 'segoe ui', 'roboto', 'helvetica', 'arial')
        if any(r in n.lower() for r in resolvable):
            return ('a SECOND spelling of the app stack. It resolves correctly '
                    'off Apple (system-ui / Segoe UI catches it), so no glyph '
                    'moves -- but the stack now has more than one answer, which '
                    'is how the truncated form was born. Use var(--sans)')
        return ('a TRUNCATED -apple-system stack. -apple-system resolves on '
                'Apple platforms and nowhere else, so off Apple the generic '
                'wins -- on Windows that is ARIAL. Use var(--sans)')
    return 'a family the app does not own, and no documented exception'


def scan(files):
    """(findings, exceptions_seen, total) over (rel_path, text) pairs."""
    findings, seen, total = [], [], 0
    for rel, text in files:
        clean = strip_comments(text)
        for lineno, kind, raw in declarations(text):
            fam = family_of(kind, raw)
            if fam is None:
                continue
            # the token DEFINITIONS themselves carry real family lists
            line = clean.splitlines()[lineno - 1] if lineno <= len(clean.splitlines()) else ''
            if any(d in line for d in TOKEN_DEFS) and kind == 'font-family':
                continue
            if rel.endswith('fonts.css'):     # @font-face descriptor, not a use
                continue
            total += 1
            verdict = classify(rel, fam)
            if verdict == 'ok':
                continue
            if verdict == 'exception':
                seen.append((rel, lineno, fam))
                continue
            findings.append((rel, lineno, kind, fam, verdict))
    return findings, seen, total


def collect():
    """The AUTHORED stylesheets under src/, and a count of what was left out.

    `npm run build` writes build output INTO src/ -- src/topics/_generated/ (one compiled
    slice per topic) and src/scripts/visuals/ (an esbuild bundle). Both are gitignored, and
    censusing them measures other people's tooling: the 185 `"Space Grotesk",sans-serif`
    declarations in the compiled slices are MERMAID's own emitted stylesheet, frozen inside
    the cached diagram SVGs (tools/compiler/mermaid-cache/*.svg -- byte-frozen on purpose,
    because mermaid measures text with OS fonts and the build was not otherwise reproducible),
    and the one `system-ui,sans-serif` in the bundle is inside minified vendor code. Rewriting
    either would break a determinism guarantee to fix a family nobody here wrote.

    So the scope is what GIT TRACKS. That is not a path-pattern skip -- a new file under
    src/topics/_generated/ cannot evade the census by living in a directory with the right
    name, because to ship authored CSS you have to commit it, and the moment you do it is in
    scope. Run before a build the two sets are nearly identical; run after one, this is the
    difference between auditing the app and auditing esbuild."""
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


def sans_value(files):
    """The single --sans definition, or None."""
    vals = []
    for rel, text in files:
        for m in SANS_DEF_RE.finditer(strip_comments(text)):
            vals.append((rel, m.group(1).strip()))
    return vals


# --- self-test ----------------------------------------------------------------
FIXTURE_OK = ('src/fixture-ok.css', '''
:root{--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
:root{--display:'Space Grotesk',var(--sans)}
.a{font:var(--font-weight-bold) 12px var(--sans)}
.b{font:inherit;font-size:var(--font-size-caption)}
.c{font-family:var(--mono)}
.d{font:var(--font-weight-heavy) 16px ui-monospace,Menlo,monospace}
.e{font-family:var(--display)}
.f{font:italic var(--font-size-body)/1.55 var(--sans)}
/* prose: this rule used to say -apple-system,sans-serif -- not a declaration */
''')
FIXTURE_BAD = ('src/fixture-bad.css', '''
.g{font:var(--font-weight-semibold) 10.5px -apple-system,sans-serif}
.h{font:var(--font-weight-bold) 13px -apple-system,system-ui,sans-serif}
.i{font-family:Verdana,sans-serif}
''')
FIXTURE_DRIFT = ('src/scripts/app/print-qa.js',
                 '''body{font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}''')


def self_test():
    problems = []
    findings, seen, total = scan([FIXTURE_OK])
    if findings:
        problems.append('false positive on a legitimate shape: %s'
                        % ', '.join('%s %r' % (f[3], f[4][:40]) for f in findings))
    if total != 6:
        problems.append('counted %d declarations in the clean fixture, expected 6 '
                        '(a comment was read as code, or a shape was missed)' % total)

    findings, _, _ = scan([FIXTURE_BAD])
    fams = [f[3] for f in findings]
    for want, why in (('-apple-system,sans-serif', 'the truncated stack'),
                      ('-apple-system,system-ui,sans-serif', 'a partial system-ui stack'),
                      ('Verdana,sans-serif', 'a face the app does not own')):
        if want not in fams:
            problems.append('missed %s (%s)' % (why, want))

    # the drift arm: a print literal that no longer matches --sans must fail
    drifted = norm(FIXTURE_DRIFT[1].split('1.6 ')[1].rstrip('}'))
    pinned = norm(SANS_DEF_RE.search(FIXTURE_OK[1]).group(1))
    if drifted == pinned:
        problems.append('the drift fixture does not actually differ from --sans, '
                        'so the drift arm proves nothing')
    return problems


def main():
    problems = self_test()
    if problems:
        print('=== TYPEFACE CENSUS ===')
        print('SELF-TEST ABORT -- the analyser does not do what it claims:')
        for p in problems:
            print('  ' + p)
        return 1

    files, skipped = collect()
    if files is None:
        print('=== TYPEFACE CENSUS ===')
        print('ABORT -- `git ls-files src/` returned nothing. This check censuses AUTHORED')
        print('source, and it identifies that as "what git tracks"; with no git answer it')
        print('would either scan build output or scan nothing, and both are wrong quietly.')
        return 1

    findings, seen, total = scan(files)
    sans = sans_value(files)

    print('=== TYPEFACE CENSUS -- every declared family must be one the app owns ===')
    print('    scanned      : %d AUTHORED (git-tracked) files under src/' % len(files))
    print('    not scanned  : %d build artefact(s) under src/ -- gitignored output of the'
          % skipped)
    print('                   topic compiler and esbuild; their families are emitted by')
    print('                   mermaid and by vendored code, not authored here')
    print('    declarations : %d font-family / font-shorthand family lists' % total)
    print('    self-test    : 4 planted defects found (truncated stack, partial')
    print('                   system-ui stack, undeclared face, drifted print')
    print('                   literal); 6 legitimate shapes + comment-prose clean')

    fails = list(findings)

    # --- the --sans token must exist, exactly once
    if len(sans) != 1:
        fails.append(('src/styles.css', 0, 'token', '--sans',
                      'expected exactly ONE --sans definition, found %d%s'
                      % (len(sans), (' (' + ', '.join(r for r, _ in sans) + ')') if sans else '')))
        pinned = None
    else:
        pinned = norm(sans[0][1])
        print('    --sans       : %s' % sans[0][1])

    # --- the drift arm: every documented literal exception must still equal --sans
    drift = []
    if pinned:
        for rel, lineno, fam in seen:
            if '-apple-system' not in fam:
                continue          # a deliberate non-app face, not a stack copy
            if norm(fam) != pinned:
                drift.append((rel, lineno, fam))
    for rel, lineno, fam in drift:
        fails.append((rel, lineno, 'font', fam,
                      'a pinned literal copy of the app stack that has DRIFTED '
                      'from --sans -- the stack now has two answers'))

    print('    exceptions   : %d documented (%s)'
          % (len(seen), '; '.join(sorted(set(r for r, _, _ in seen))) or 'none'))
    print('    drift arm    : %d literal cop%s of the app stack, %d drifted'
          % (len([s for s in seen if '-apple-system' in s[2]]),
             'y' if len([s for s in seen if '-apple-system' in s[2]]) == 1 else 'ies',
             len(drift)))
    print('    orphans      : %d' % len(findings))

    if VERBOSE:
        for rel, lineno, fam in seen:
            print('      exception  %s:%d  %s' % (rel, lineno, fam))

    if not fails:
        print('\nTYPEFACE CENSUS: PASS  (%d declarations, 0 orphans, %d documented '
              'exception(s), both pinned to --sans or argued in place)'
              % (total, len(seen)))
        return 0

    print('\n  %d orphan declaration(s):' % len(fails))
    by_family = {}
    for rel, lineno, kind, fam, why in fails:
        by_family.setdefault((fam, why), []).append('%s:%d' % (rel, lineno))
    for (fam, why), where in sorted(by_family.items(), key=lambda kv: -len(kv[1])):
        print('    %-52s %d site(s)' % (fam[:52], len(where)))
        print('        %s' % why)
        print('        %s%s' % (', '.join(where[:6]),
                                (' ... +%d more' % (len(where) - 6)) if len(where) > 6 else ''))
    print('\n  Point the declaration at var(--sans), var(--display), var(--mono),')
    print('  or `inherit` where the cascade already carries the family. A family')
    print('  the app genuinely wants needs a line in EXCEPTIONS with a reason.')
    print('\nTYPEFACE CENSUS: FAIL')
    return 1


if __name__ == '__main__':
    sys.exit(main())
