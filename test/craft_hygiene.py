#!/usr/bin/env python3
"""CRAFT HYGIENE -- the typography the app PRINTS, held to the app's own hand.

WHAT IT CATCHES
Four marks that separate typeset copy from typed copy, and one that separates a
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

THE GLYPH RULE IS NOT A PROSE RULE, AND CYCLE 1 SHIPPED IT AS ONE
The first four rules are claims about TYPESET PROSE, so they are gated behind
"this span is prose" (a letter and a space) and "this span is not code". The fifth
is a claim about FONT OWNERSHIP, which is a fact about the codepoint and the
stylesheet -- it has nothing to do with whether the span reads as a sentence. Cycle
1 put all five behind the prose gate, and a cycle-2 press found the hole exactly
where the shape of the gate predicts: restoring the deleted
`<span class="ix-star-ic">&#9733;</span>` -- one bare glyph, no letter, no space --
left the check PASS while the span count rose by one. The scanner saw it and
declined to judge it. The glyph rule now runs on EVERY span, unconditionally,
BEFORE the prose gate; the four prose rules keep their gate.

IT READS CSS TOO, FOR THE SAME REASON
`content:" \\2605"` prints a star on the screen exactly as a `<span>` does, and
cycle 1's `tracked_sources()` took only .js/.mjs/.html -- so a planted
`content:"\\2605 flagged for review"` in src/styles.css left the check green, while
six real un-ratcheted marks were already shipping there. CSS is now in scope: the
`content:` declarations of every tracked stylesheet are read, CSS backslash escapes
are decoded (`\\2605` -> the character, with the one optional whitespace terminator
consumed), and the ALT-TEXT half of `content: "x" / "alt"` is skipped -- that half
is the accessible name, not a printed mark, and judging it would demand a font for
a string no font ever rasterises.

WHY THIS IS A SOURCE CHECK AND NOT A BROWSER CHECK
The obvious shape -- walk the built deliverable's text nodes -- was tried first and
MEASURED on the committed build (12,323,503 bytes): it holds 2,799 characters of
copy in 177 real HTML text nodes, 0.023% of the file. Everything else is inside
<script> or <style> -- 12,290,458 of those bytes, 99.73% -- because the topic corpus
and every panel this app draws are compiled to JavaScript and emitted as markup at
runtime. A text-node walk would therefore have swept a rounding error of the copy
and reported it clean. (THE METHOD, because three different numbers have been
quoted for this: html.parser over the built file; <script> and <style> elements
dropped whole; the remaining character data entity-decoded, each whitespace run
collapsed to one space, each node stripped. Raw, uncollapsed, the same walk gives
4,028 characters -- which is the same finding either way, and the collapsed figure
is the one this file and the wave ledger both quote.) So the corpus is the SOURCE,
and the copy is found where the copy actually lives: inside string literals that
build markup, and inside `content:` declarations that print marks.

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
rules run, so `&mdash;` counts as an em dash and a bare `-` does not. CSS comments
are stripped the same way and for the same reason.

THE ASCII SOURCE LAW HOLDS. test/ascii_guard.py forbids a non-ASCII byte in src/,
so the typeset forms are written as entities or escapes exactly as the repo already
does (`&rsquo;` / `\\u2019` / `\\2019`). This check reads through all three.

THE ALLOWLIST IS A RATCHET, NOT AN AMNESTY -- AND CYCLE 1'S WAS NEITHER
test/craft_hygiene_allow.json carries the spans that are ruled exceptions -- code
samples printed as prose, SQL and shell fragments, and the glyph inventory the app
has not yet fixed -- each with a REASON, the FILE it is excused in, HOW MANY sites
there are, and the list of RULES it is excused from. Three defects in how that was
keyed and read, all three pressed and all three fixed here:

  * THE KEY WAS A 120-CHARACTER PREFIX. 20 of 77 entries were longer than that, so
    1,668 characters of corpus prose sat past the guarded key and were outside the
    ratchet entirely: a NEW `ellipsis` defect planted 251 characters into an
    allowlisted span left the check PASS, and the staleness detector did not fire
    either, because the prefix still matched. The key now hashes the whole stripped
    span; the readable text is kept beside it in a `text` field, so the file still
    reads as a list of the strings it excuses and anyone can recompute the key.
  * THE DECLARED `rules` WERE NEVER READ. Every entry carried them and main()
    skipped the span outright, so an allowlisted span was exempt from ALL FIVE
    rules for its whole length. The hit set is now INTERSECTED with the declared
    rules: a hit whose rule the entry does not declare is a finding, not an
    amnesty, and a declared rule that no longer hits anything is stale.
  * THE KEY WAS SITE-BLIND, and this one was found by pressing the fix for the
    first two. Hashing the span alone made every ratcheted mark a global amnesty:
    the U+2605 excused in src/styles.css silently excused a REINSTATED
    `<span class="ix-star-ic">&#9733;</span>` in panels.js, because both strip to
    the same one character -- so "the class cannot grow" was still false, in the
    exact place R1 named. The key now includes the FILE, and each entry declares a
    `count`: the same mark in another file, or one more time in the same file, is a
    finding rather than an inheritance.

An entry that no longer matches anything is itself a failure, and so is a count that
no longer matches: a stale exception is how a debt list turns into a permission slip.
The list may shrink without ceremony and may only grow with an argument.

SELF-TEST, EVERY RUN. This repo has shipped checks that could not fail, so the
analyser runs over synthetic fixtures first: the typeset forms must come back
clean, and every rule must flag its own planted defect -- including the two the
cycle-2 press found (a bare glyph span with no prose around it, and a glyph inside
a CSS `content:` declaration). If any planted defect goes undetected the check
ABORTS rather than report a green it did not earn.

Usage: python3 test/craft_hygiene.py [--report]
Exit:  0 = pass, 1 = FAIL
"""
import hashlib
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
CSS_CONTENT = re.compile(r'\bcontent\s*:\s*([^;{}]+)', re.I)


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


def unescape_css(s):
    r"""CSS escapes -> characters. `\2605 ` is the star and the ONE following space is the
    escape's terminator, not copy -- getting that wrong turns `\2605 flagged` into a star
    followed by a stray space and quietly changes what the rules are judging."""
    def u(m):
        try:
            return chr(int(m.group(1), 16))
        except (ValueError, OverflowError):
            return m.group(0)
    s = re.sub(r'\\([0-9a-fA-F]{1,6})[ \t\n]?', u, s)
    return re.sub(r'\\(.)', r'\1', s)


def css_strings(value):
    r"""The printed strings of one `content:` value, alt text excluded.

    `content: "\2605" / ""` is TWO halves: the mark that is painted, and the accessible
    alternative a screen reader hears instead. Only the first half is rasterised, so only the
    first half is a font-ownership question. Split on a `/` that is OUTSIDE a string, because
    `url("a/b.png")` has one inside and a naive split truncates it.
    """
    out, i, n, alt = [], 0, len(value), False
    while i < n:
        c = value[i]
        if c in ('"', "'"):
            q, buf = c, []
            i += 1
            while i < n:
                if value[i] == '\\' and i + 1 < n:
                    buf.append(value[i:i + 2])
                    i += 2
                    continue
                if value[i] == q:
                    i += 1
                    break
                buf.append(value[i])
                i += 1
            if not alt:
                out.append(''.join(buf))
        elif c == '/':
            alt = True
            i += 1
        else:
            i += 1
    return out


def css_marks(text):
    """(line, decoded string) for every printed string in a stylesheet's `content:` rules."""
    # comments out, line numbers kept: a design comment that quotes a declaration is not one
    body = re.sub(r'/\*.*?\*/', lambda m: '\n' * m.group(0).count('\n'), text, flags=re.S)
    out = []
    for i, ln in enumerate(body.split('\n'), 1):
        for m in CSS_CONTENT.finditer(ln):
            for lit in css_strings(m.group(1)):
                if lit:
                    out.append((i, unescape_css(lit)))
    return out


def copy_spans(path, text):
    """(line, span) for every run of RENDERED copy in one source file."""
    out = []
    if path.endswith('.css'):
        return css_marks(text)
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
# are not prose and are not judged BY THE FOUR TYPESET RULES. The glyph rule is
# not one of them -- see judge().
PROSE = re.compile(r'[A-Za-z]')

# ...AND CODE IS NOT PROSE, which is a rule about the subject rather than a convenience.
# Every one of the four rules below is a claim about TYPESET copy: an ellipsis is the typeset form
# of a trailing-off sentence, an em dash is the typeset form of an aside. Neither claim is true of
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
RULE_NAMES = [r[0] for r in RULES] + ['glyph']

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
    """[(rule, matched text)] for one decoded span.

    THE ORDER IS THE POINT. Font ownership is a fact about the codepoint and the font stack,
    not about whether the string around it reads as a sentence -- so the glyph rule runs FIRST
    and runs on EVERY span. The four typeset rules keep the prose gate under them, because
    each of those IS a claim about prose and would otherwise demand that the corpus's SQL be
    retypeset. Cycle 1 had all five behind the gate; a bare `<span>&#9733;</span>` therefore
    carried no letter and no space and was never judged at all.
    """
    hits = []
    for ch in span:
        if ord(ch) > 127 and ch not in OWNED:
            hits.append(('glyph', 'U+%04X %s' % (ord(ch), ch)))
    if not PROSE.search(span) or ' ' not in span.strip():
        return hits
    if CODE.search(span):
        return hits
    for name, rx, _why in RULES:
        for m in rx.finditer(span):
            hits.append((name, m.group(0)))
    return hits


def key_of(path, span):
    """The ratchet key: a hash of the WHOLE stripped span, BOUND TO THE FILE it sits in.

    Two separate holes closed here, and the second was found by pressing the fix for the first.

    THE SPAN MUST BE WHOLE. The key was `span.strip()[:120]`, which excused everything past
    character 120 of an entry -- 1,668 characters of corpus prose across 20 entries -- and a
    defect planted at offset 251 inside an allowlisted span went undetected while the staleness
    detector stayed quiet, because the prefix still matched.

    THE KEY MUST NAME A SITE. Hashing the span ALONE then made every ratcheted mark a
    site-independent amnesty: the U+2605 excused in `src/styles.css` (`.crambtn.starred` prints
    it from CSS) silently excused a REINSTATED `<span class="ix-star-ic">&#9733;</span>` in
    panels.js, because both strip to the same one character. Pressed, and it passed -- the exact
    claim R1 exists to make true. The file is in the key and the number of sites is declared, so
    the same mark at a NEW file, or one more time in the SAME file, is a finding.
    """
    return hashlib.sha256((path + '\n' + span.strip()).encode('utf-8')).hexdigest()[:16]


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
CLEAN_CSS = (
    "/* a design comment about content:\"\\2605\" that must not be judged */\n"
    ".a::after{content:\"\\2014\"}\n"
    ".b::after{content:\"\\25B8\" / \"\"}\n"      # the mark is ratcheted; the ALT half is empty
    ".c::before{content:\"\"}\n"
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
# THE TWO THE CYCLE-2 PRESS FOUND. Both were PASSES on the shipped check, and both are the
# exact defect the wave's own item 6b had just deleted from the source, put back.
PLANTS_PRESSED = {
    # a bare glyph span: no letter, no space -- cycle 1's prose gate skipped it outright
    'glyph-bare': ("var h = '<span class=\"ix-star-ic\" aria-hidden=\"true\">&#9733;</span>';",
                   'fixture.js'),
    # a glyph the OWNED set has never carried, in a span that IS prose: proves the class is
    # closed rather than merely quiet about the codepoints that happen to ship today
    'glyph-new':  ("var h = '<p>Next step \\u27a4 keep going</p>';", 'fixture.js'),
    # a printed mark in a stylesheet: cycle 1's tracked_sources() took no .css at all
    'glyph-css':  (".hm-lbl::after{content:\"\\2620 flagged for review\"}", 'fixture.css'),
}


def self_test():
    problems = []
    hits = []
    for _ln, s in copy_spans('fixture.js', CLEAN):
        hits += judge(html.unescape(s))
    if hits:
        problems.append('the CLEAN fixture was flagged: %s -- the analyser fails correct '
                        'copy, so every green below is meaningless' % hits)
    css_hits = []
    for _ln, s in copy_spans('fixture.css', CLEAN_CSS):
        css_hits += judge(s)
    if [h for h in css_hits if h[0] != 'glyph' or 'U+25B8' not in h[1]]:
        problems.append('the CLEAN CSS fixture was flagged beyond its one ratcheted mark: %s '
                        '-- either the comment stripper or the alt-text split is wrong, and a '
                        'stylesheet check that fails correct CSS gets turned off' % css_hits)
    if not [h for h in css_hits if 'U+25B8' in h[1]]:
        problems.append('the CLEAN CSS fixture\'s one real mark (U+25B8) was NOT seen -- the '
                        'CSS reader is not decoding escapes, so every green it reports is empty')
    for name, src in PLANTS.items():
        got = []
        for _ln, s in copy_spans('fixture.js', src):
            got += [h[0] for h in judge(html.unescape(s))]
        if name not in got:
            problems.append('PLANT "%s" UNDETECTED: %r produced %s' % (name, src, got or 'nothing'))
    for name, (src, fx) in PLANTS_PRESSED.items():
        got = []
        for _ln, s in copy_spans(fx, src):
            got += [h[0] for h in judge(html.unescape(s) if fx.endswith('.js') else s)]
        if 'glyph' not in got:
            problems.append('PRESSED PLANT "%s" UNDETECTED: %r produced %s -- this is a defect '
                            'the shipped check passed, and it is back' % (name, src, got or 'nothing'))
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
    # THE RATCHET ITSELF, PRESSED. An allowlisted span must still be judged past its 120th
    # character, outside its declared rules, and at a file it was not excused for -- all three
    # of those were free passes at some point in this check's two cycles.
    long_span = 'x' * 200 + " the interviewer's question ... and then some"
    k = key_of('a.js', long_span)
    ent = {'rules': ['apostrophe']}
    undeclared = [r for r, _w in judge(long_span) if r not in set(ent['rules'])]
    if 'ellipsis' not in undeclared:
        problems.append('THE RATCHET IS NOT INTERSECTED WITH ITS DECLARED RULES: a span excused '
                        'for "apostrophe" swallowed an ellipsis defect 200 characters in. That is '
                        'the exact hole the 120-char prefix key left open.')
    if k == key_of('a.js', long_span[:120]):
        problems.append('THE RATCHET KEY IS NOT WHOLE-SPAN: a 120-character prefix hashes to the '
                        'same key as the full span, so everything past it is unguarded.')
    if k == key_of('b.js', long_span):
        problems.append('THE RATCHET KEY IS SITE-BLIND: the same span in another file takes the '
                        'same key, so one ratcheted mark excuses every future copy of itself -- '
                        'which is how a CSS star quietly excused a reinstated star span in JS.')
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
    # .css IS IN SCOPE: `content:` prints marks on the screen exactly as a <span> does, and
    # leaving stylesheets out let six un-ratcheted codepoints ship and a planted seventh pass.
    return [f for f in files
            if f.endswith(('.js', '.mjs', '.html', '.css'))
            and '/_generated/' not in f
            and '.generated.' not in f
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
    used = {}          # key -> {'rules': set of rules that fired, 'n': occurrences}
    findings = []
    scanned = 0
    sources = tracked_sources()
    for f in sources:
        path = os.path.join(ROOT, f.replace('/', os.sep))
        try:
            text = open(path, encoding='utf-8', errors='replace').read()
        except OSError:
            continue
        for line, raw in copy_spans(f, text):
            span = html.unescape(raw) if not f.endswith('.css') else raw
            scanned += 1
            hits = judge(span)
            if not hits:
                continue
            key = key_of(f, span)
            ent = ruled.get(key)
            if ent is not None:
                declared = set(ent.get('rules') or [])
                u = used.setdefault(key, {'rules': set(), 'n': 0})
                u['rules'].update(r for r, _w in hits)
                u['n'] += 1
                hits = [(r, w) for r, w in hits if r not in declared]
                if not hits:
                    continue
            for rule, what in hits:
                findings.append((f, line, rule, what, span.strip()[:120]))

    stale = [k for k in ruled if k not in used]
    # a rule declared on a live entry that no longer fires is dead debt on a live line
    over = []
    for k, ent in ruled.items():
        if k not in used:
            continue
        for r in (ent.get('rules') or []):
            if r not in used[k]['rules']:
                over.append((k, r))
    # THE COUNT IS THE HALF THAT MAKES "the class cannot grow" TRUE. Without it, one excused
    # mark excuses every future copy of itself inside the same file.
    grew, shrank = [], []
    for k, ent in ruled.items():
        if k not in used:
            continue
        want, got = int(ent.get('count', 1)), used[k]['n']
        if got > want:
            grew.append((k, ent, want, got))
        elif got < want:
            shrank.append((k, ent, want, got))

    by_rule = {}
    for f, line, rule, what, key in findings:
        by_rule.setdefault(rule, []).append((f, line, what, key))

    print('=== CRAFT HYGIENE -- the typography the app prints ===')
    print('  copy spans scanned : %d, over %d authored source files (js/mjs/html/css)'
          % (scanned, len(sources)))
    print('  ruled exceptions   : %d (all matched, at their declared sites and counts)' % len(ruled)
          if not (stale or over or grew or shrank)
          else '  ruled exceptions   : %d, %d STALE, %d over-declared, %d GREW, %d shrank'
          % (len(ruled), len(stale), len(over), len(grew), len(shrank)))
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
            t = (ruled[k].get('text') or '')[:80]
            print('       %s  %r' % (k, t))
    if over:
        print('\n  OVER-DECLARED RULES -- the span is still here, this rule is not:')
        for k, r in over[:10]:
            print('       %s  declares %r, which no longer fires' % (k, r))
    if grew:
        print('\n  THE CLASS GREW -- more sites than the entry excuses. Fix them, or argue for'
              '\n  the higher count in `why`; a ratchet that silently absorbs new sites is not one:')
        for k, ent, want, got in grew[:10]:
            print('       %s  %s  excuses %d, found %d' % (k, ent.get('file', '?'), want, got))
    if shrank:
        print('\n  THE DEBT SHRANK -- fewer sites than declared, which is good news the file'
              '\n  has not been told. Lower the count (the list shortens without ceremony):')
        for k, ent, want, got in shrank[:10]:
            print('       %s  %s  excuses %d, found %d' % (k, ent.get('file', '?'), want, got))

    bad = len(findings) + len(stale) + len(over) + len(grew) + len(shrank)
    if bad:
        print('\nCRAFT HYGIENE: FAIL (%d violation(s), %d stale, %d over-declared, %d grew, %d shrank)'
              % (len(findings), len(stale), len(over), len(grew), len(shrank)))
        return 1
    print('\n  8 planted defects detected in the self-test (three periods, a straight '
          'apostrophe, straight quotes, a hyphen doing a dash\u2019s job, a codepoint outside '
          'the app\u2019s own stack, a BARE glyph span with no prose around it, an unowned '
          'codepoint the app has never shipped, and a glyph printed from CSS content:), plus '
          'three negative controls -- a design comment and a CSS comment that must NOT be '
          'judged, and an allowlisted span that must still be judged past its 120th character '
          'and outside its declared rules, and at a file it was not excused for')
    print('CRAFT HYGIENE: PASS  (%d rendered-copy spans, %d ruled exceptions, every one still '
          'matching something, each excused only from the rules it declares, only in the file '
          'it names, and only as many times as it declares)'
          % (scanned, len(ruled)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
