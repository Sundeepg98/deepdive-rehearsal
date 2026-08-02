#!/usr/bin/env python3
"""CRAFT HYGIENE -- the typography the app PRINTS, held to the app's own hand.

WHAT IT CATCHES
Three marks that separate typeset copy from typed copy, and one that separates a
face the app owns from one the platform picked:

    a straight apostrophe   don't        where the typeset form is  don-U+2019-t
    a straight quote        "like this"  where the typeset form is  U+201C U+201D
    three periods           ...          where the typeset form is  U+2026
    a hyphen doing a dash's job          where the form is U+2013 / U+2014
    a codepoint no font in --sans carries, so the PLATFORM chooses the face

None of these is a bug in the ordinary sense. Every one of them renders, every one
of them is legible, and none of them can fail a correctness panel -- which is
exactly why the class grows one string at a time and why nothing in this gate could
see it. The home's own copy carried straight apostrophes on a surface whose whole
argument is that it was made with care.

WHY THIS IS A SOURCE CHECK AND NOT A BROWSER CHECK
The obvious shape -- walk the built deliverable's text nodes -- was tried first and
MEASURED: the shipped 12.3 MB HTML file contains 2,840 characters of text in real
HTML text nodes. Everything else is inside <script>, because the topic corpus and
every panel this app draws are compiled to JavaScript and emitted as markup at
runtime. A text-node walk would therefore have swept 0.02% of the copy and reported
it clean. So the corpus is the SOURCE, and the copy is found where the copy
actually lives: inside string literals that build markup.

HOW THE COPY IS FOUND, and this is the load-bearing part
A JavaScript scanner walks each file tracking whether it is inside a line comment,
a block comment, or a single/double/backtick string. COMMENTS ARE NOT COPY -- a
first attempt used a bare `>...<` regex over whole files and reported 523 straight
quotes, nearly all of them inside the long design comments this repo is written
in. Only string literals are considered, and inside a literal only:

    text between a '>' and the next '<'      the content of emitted markup
    title= / aria-label= / placeholder= /    copy that is spoken or hovered
    alt= attribute values

which excludes selectors, class names, storage keys and every other string that is
addressed to the machine rather than to a person. Entities are decoded before the
rules run, so `&mdash;` counts as an em dash and a bare `-` does not.

THE ASCII SOURCE LAW HOLDS. test/ascii_guard.py forbids a non-ASCII byte in src/,
so the typeset forms are written as entities or escapes exactly as the repo already
does (`&rsquo;` / `\\u2019`). This check reads through both.

THE ALLOWLIST IS A RATCHET, NOT AN AMNESTY
test/craft_hygiene_allow.json carries the spans that are ruled exceptions -- code
samples printed as prose, SQL and shell fragments, and the glyph inventory the app
has not yet fixed -- each with a REASON. An entry that no longer matches anything
is itself a failure: a stale exception is how a debt list turns into a permission
slip. The list may shrink without ceremony and may only grow with an argument.

SELF-TEST, EVERY RUN. This repo has shipped checks that could not fail, so the
analyser runs over synthetic fixtures first: the typeset forms must come back
clean, and every rule must flag its own planted defect. If any planted defect goes
undetected the check ABORTS rather than report a green it did not earn.

Usage: python3 test/craft_hygiene.py [--report]
Exit:  0 = pass, 1 = FAIL
"""
import html
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALLOW_FILE = os.path.join(ROOT, 'test', 'craft_hygiene_allow.json')
REPORT = '--report' in sys.argv

# --------------------------------------------------------------------------- #
# 1. THE SCANNER: string literals, with comments excluded                      #
# --------------------------------------------------------------------------- #


def js_literals(src):
    """Yield (line, text) for every string literal in a JS source.

    Deliberately simple and deliberately CONSERVATIVE: a regex literal that
    contains a quote could confuse it, so anything it is unsure about is skipped
    rather than guessed at. Missing a span costs coverage; inventing one costs a
    false failure, and a check that cries wolf is turned off.
    """
    i, n, line = 0, len(src), 1
    while i < n:
        c = src[i]
        if c == '\n':
            line += 1
            i += 1
        elif c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                i += 1
        elif c == '/' and i + 1 < n and src[i + 1] == '*':
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                if src[i] == '\n':
                    line += 1
                i += 1
            i += 2
        elif c in ('"', "'", '`'):
            q, start, buf = c, line, []
            i += 1
            while i < n:
                d = src[i]
                if d == '\\' and i + 1 < n:
                    buf.append(src[i:i + 2])
                    i += 2
                    continue
                if d == q:
                    i += 1
                    break
                if d == '\n':
                    line += 1
                    if q != '`':          # an unterminated quote: bail, do not guess
                        break
                buf.append(d)
                i += 1
            yield start, ''.join(buf)
        else:
            i += 1


# SINGLE-LINE, AND NO BRACES. Two of this repo's biggest files are SHADOW STYLESHEETS held in
# template literals -- `const BASE_SHEET = `... /* a long design comment */ .pill > .v {...}``
# -- and a stylesheet is full of `>` (child combinators) and `<` (prose about markup). A greedy
# `>...<` over one of those returns a paragraph of design commentary as though the app printed it,
# which is how the first draft reported 79 straight apostrophes that were all comment prose. Copy
# the app EMITS is a run of text between two tags on one line; a selector-to-comment run is not.
HTML_TEXT = re.compile(r'>([^<>{}\n]+)<')
ATTR = re.compile(r'\b(?:title|aria-label|placeholder|alt)\s*=\s*(["\'])(.*?)\1', re.S)


def unescape_js(s):
    """\\u2019 / \\x27 / \\' -> the character. Entities are handled separately."""
    def u(m):
        try:
            return chr(int(m.group(1), 16))
        except (ValueError, OverflowError):
            return m.group(0)          # not an escape after all; leave it alone
    s = re.sub(r'\\u([0-9a-fA-F]{4})', u, s)
    s = re.sub(r'\\u\{([0-9a-fA-F]{1,6})\}', u, s)
    s = re.sub(r'\\x([0-9a-fA-F]{2})', u, s)
    return s.replace("\\'", "'").replace('\\"', '"').replace('\\\\', '\\')


def copy_spans(path, text):
    """(line, span) for every run of RENDERED copy in one source file."""
    out = []
    if path.endswith(('.html', '.md')):
        body = re.sub(r'(?is)<(script|style)\b.*?</\1>', '', text)
        for i, ln in enumerate(body.split('\n'), 1):
            for m in HTML_TEXT.finditer(ln):
                out.append((i, m.group(1)))
            for m in ATTR.finditer(ln):
                out.append((i, m.group(2)))
        return out
    for line, lit in js_literals(text):
        lit = unescape_js(lit)
        for m in HTML_TEXT.finditer(lit):
            out.append((line, m.group(1)))
        for m in ATTR.finditer(lit):
            out.append((line, m.group(2)))
    return out


# --------------------------------------------------------------------------- #
# 2. THE RULES                                                                 #
# --------------------------------------------------------------------------- #

# A span is PROSE if it has a space and a letter. `9/21`, `hm-chip` and `&rarr;`
# are not prose and are not judged.
PROSE = re.compile(r'[A-Za-z]')

# ...AND CODE IS NOT PROSE, which is a rule about the subject rather than a convenience.
# Every rule in this file is a claim about TYPESET copy: an ellipsis is the typeset form of a
# trailing-off sentence, an em dash is the typeset form of an aside. Neither claim is true of
# `SELECT count(*) ... WHERE read_at IS NULL` or `// account-level AND bucket-level -- all four
# true`, where `...` is an elision in SQL and `--` is a comment marker. This app renders code
# samples as prose all over the walkthroughs, so without this the check would demand that the
# corpus's SQL be typeset, which is not a craft improvement -- it is a correctness regression.
CODE = re.compile(
    r'^\s*(?://|--|#|\$|>|\w+\s*[:=]\s*[\[{]|<)'          # a comment or a code line opener
    r'|;\s*$'                                              # a statement terminator
    r'|\b(SELECT|INSERT|UPDATE|DELETE|CREATE|WHERE|FROM|GRANT|RETURNING)\b'
    r'|\b(function|const|let|var|return|await|async|if|else)\b\s*[\(\{=]'
    r'|[{}\[\]]\s*$|=>|\+\+|===|!==|\|\||&&'
)

RULES = [
    ('ellipsis', re.compile(r'\.\.\.'),
     'three periods where the typeset form is an ellipsis (&hellip;)'),
    ('apostrophe', re.compile(r"[A-Za-z]'[A-Za-z]"),
     "a straight apostrophe inside a word where the typeset form is &rsquo;"),
    ('quote', re.compile(r'"[^"]{2,}"'),
     'straight double quotes around a phrase where the typeset form is &ldquo;/&rdquo;'),
    ('dash', re.compile(r'(?<=[A-Za-z0-9,\)]) -{1,2} (?=[A-Za-z0-9(])'),
     'a spaced hyphen doing an em dash\'s job (&mdash;)'),
]

# The glyph inventory the app OWNS. --sans is
# `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
# and the typographic marks below are carried by every one of those faces. Anything
# outside this set is a codepoint for which the PLATFORM picks the typeface -- which
# is how the home came to rasterise two marks in a face the app does not own.
OWNED = set(
    '\u2018\u2019\u201c\u201d'        # curly quotes
    '\u2013\u2014\u2026\u00b7\u00d7'  # en/em dash, ellipsis, middot, times
    '\u00a0\u00ad\u2192\u2190\u00b0'  # nbsp, shy, arrows, degree
    '\u00e9\u00e8\u00ea\u00fc\u00f6\u00e4\u00e7\u00f1'   # latin-1 letters
)


def judge(span):
    """[(rule, matched text)] for one decoded span."""
    hits = []
    if not PROSE.search(span) or ' ' not in span.strip():
        return hits
    if CODE.search(span):
        return hits
    for name, rx, _why in RULES:
        for m in rx.finditer(span):
            hits.append((name, m.group(0)))
    for ch in span:
        if ord(ch) > 127 and ch not in OWNED:
            hits.append(('glyph', 'U+%04X %s' % (ord(ch), ch)))
    return hits


# --------------------------------------------------------------------------- #
# 3. THE SELF-TEST -- every rule must flag its own planted defect               #
# --------------------------------------------------------------------------- #

CLEAN = (
    "var h = '<p class=\"hm-note\">The age is how long since you worked it "
    "&mdash; re-drill them until the signal comes.</p>';\n"
    "var q = '<h1 class=\"hm-q\">&ldquo;What is a dead-letter queue for?&rdquo;</h1>';\n"
    "var a = '<span title=\"Reset progress for this topic\">x</span>';\n"
    "/* a comment with \"straight quotes\", three dots ... and don't-do-this */\n"
    "var sel = '.hm-chip[data-topic=\"x\"]';\n"
)
PLANTS = {
    'ellipsis':   "var h = '<p>Loading the bank ... one moment</p>';",
    # escaped, because an unescaped ' would close the literal -- which is exactly the
    # form this defect takes in real source, and the scanner has to read through it
    'apostrophe': "var h = '<p>Here is the interviewer\\'s follow-up</p>';",
    'quote':      'var h = \'<p>She said "walk me through it" and waited</p>\';',
    'dash':       "var h = '<p>Staff is the thin rail - the level you rehearsed least</p>';",
    'glyph':      "var h = '<p>Starred \\u2605 topics appear first</p>';",
}


def self_test():
    problems = []
    hits = []
    for _ln, s in copy_spans('fixture.js', CLEAN):
        hits += judge(html.unescape(s))
    if hits:
        problems.append('the CLEAN fixture was flagged: %s -- the analyser fails correct '
                        'copy, so every green below is meaningless' % hits)
    for name, src in PLANTS.items():
        got = []
        for _ln, s in copy_spans('fixture.js', src):
            got += [h[0] for h in judge(html.unescape(s))]
        if name not in got:
            problems.append('PLANT "%s" UNDETECTED: %r produced %s' % (name, src, got or 'nothing'))
    code = "var h = '<pre>-- badge: SELECT count(*) ... WHERE user_id=$1; -- seek</pre>';"
    if any(judge(html.unescape(s)) for _l, s in copy_spans('fixture.js', code)):
        problems.append('a CODE SAMPLE was judged as prose -- the rules would demand that the '
                        'SQL in the corpus be typeset, which is a correctness regression rather '
                        'than a craft improvement')
    # and the comment exclusion, which is the whole reason this scans literals
    cmt = "/* the forks -- each decision, restated as the question you ask ... don't */"
    if any(judge(html.unescape(s)) for _l, s in copy_spans('fixture.js', cmt)):
        problems.append('a DESIGN COMMENT was judged as copy -- the literal scanner is not '
                        'excluding comments, which is what made the first draft report 523 '
                        'straight quotes that were all prose about the code')
    return problems


# --------------------------------------------------------------------------- #
# 4. THE SWEEP                                                                 #
# --------------------------------------------------------------------------- #


def tracked_sources():
    r = subprocess.run(['git', 'ls-files', 'src'], cwd=ROOT,
                       capture_output=True, text=True)
    files = [f.strip() for f in r.stdout.split('\n') if f.strip()]
    # SCOPE: authored source only. `npm run build` writes compiled topic slices and a
    # bundle into src/, and those carry copy nobody here typed. Same rule, and the same
    # reason, as typeface_census: it is a git question, not a path-pattern skip.
    return [f for f in files
            if f.endswith(('.js', '.mjs', '.html'))
            and '/_generated/' not in f
            and '/visuals/' not in f]


def main():
    problems = self_test()
    if problems:
        print('=== CRAFT HYGIENE ===')
        print('SELF-TEST ABORT -- the analyser does not do what it claims:')
        for p in problems:
            print('  ' + p)
        print('\nCRAFT HYGIENE: FAIL (self-test)')
        return 1

    try:
        allow = json.load(open(ALLOW_FILE, encoding='utf-8'))
    except FileNotFoundError:
        allow = {'spans': {}, 'note': ''}

    ruled = allow.get('spans', {})
    used = set()
    findings = []
    scanned = 0
    for f in tracked_sources():
        path = os.path.join(ROOT, f.replace('/', os.sep))
        try:
            text = open(path, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for line, raw in copy_spans(f, text):
            span = html.unescape(raw)
            scanned += 1
            hits = judge(span)
            if not hits:
                continue
            key = span.strip()[:120]
            if key in ruled:
                used.add(key)
                continue
            for rule, what in hits:
                findings.append((f, line, rule, what, key))

    stale = [k for k in ruled if k not in used]

    by_rule = {}
    for f, line, rule, what, key in findings:
        by_rule.setdefault(rule, []).append((f, line, what, key))

    print('=== CRAFT HYGIENE -- the typography the app prints ===')
    print('  copy spans scanned : %d, over %d authored source files' % (scanned, len(tracked_sources())))
    print('  ruled exceptions   : %d (all matched)' % len(ruled) if not stale
          else '  ruled exceptions   : %d, %d STALE' % (len(ruled), len(stale)))
    for rule, _rx, why in RULES + [('glyph', None, 'a codepoint no face in --sans carries')]:
        rows = by_rule.get(rule, [])
        print('  %-11s %4d   %s' % (rule, len(rows), why))
        for f, line, what, key in rows[:8 if REPORT else 3]:
            try:
                print('       %s:%d  %r  in  %r' % (f, line, what, key[:70]))
            except UnicodeEncodeError:
                print('       %s:%d  (unprintable)  in  %r' % (f, line, key[:70].encode('ascii', 'replace').decode()))

    if stale:
        print('\n  STALE EXCEPTIONS -- these match nothing any more and must be deleted:')
        for k in stale[:10]:
            print('       %r' % k[:80])

    bad = len(findings) + len(stale)
    if bad:
        print('\nCRAFT HYGIENE: FAIL (%d violation(s), %d stale exception(s))' % (len(findings), len(stale)))
        return 1
    print('\n  5 planted defects detected in the self-test (three periods, a straight '
          'apostrophe, straight quotes, a hyphen doing a dash\u2019s job, and a codepoint '
          'outside the app\u2019s own stack), plus a design comment that must NOT be judged')
    print('CRAFT HYGIENE: PASS  (%d rendered-copy spans, %d ruled exceptions, all of them '
          'still matching something)' % (scanned, len(ruled)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
