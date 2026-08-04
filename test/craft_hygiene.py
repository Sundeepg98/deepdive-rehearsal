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
declined to judge it. Cycle 2's fix ran the glyph rule on EVERY SPAN before the
prose gate; the four prose rules keep their gate.

...AND CYCLE 3 SHIPPED IT AS A CHANNEL RULE, WHICH IS THE SAME MISTAKE ONE LEVEL UP
"Every span" is only as wide as the SPAN CHANNELS, and cycle 3's were four bounded
ones. R10 finishes the arc: THE GLYPH RULE IS CHANNEL-FREE. It runs over every
contiguous non-ASCII run of every string literal the scanner yields, of every CSS
`content:` string, of every markdown line and of every HTML text and attribute run.
A codepoint is a fact wherever it lives.
The hole this closed was not hypothetical -- five marks, three files, all shipping:

    playBtn.textContent = running ? '\\u2759\\u2759' : '\\u25B6';   pomodoro.js:70
    hintEl.textContent  = dir === 'prev' ? '\\u2039' : '\\u203a';   touch-swipe.js:47
    b.textContent       = ok ? 'Copied' : 'Press \\u2318C';        session-progress.js:855
    const blocks = '\\u2581\\u2582\\u2583\\u2584\\u2585\\u2586\\u2587\\u2588';  session-progress.js:656
    decBtn = makeBtn('A\\u2212', 'Decrease text size', -1);        text-zoom.js:104

The first three are TEXT SINKS whose literal is not the first token after the
opener, so cycle 3's `.textContent\\s*=\\s*<string>` matched nothing at all (R10
widened that pattern too -- see sink_bodies). The last two are not sinks, not
markup, not attributes: a `const` and a call argument, which no bounded channel
could ever reach. `A\\u2212` is the sharpest of them -- the ASCII hyphen in the
"A+" button beside it is owned and the MINUS SIGN in "A-" is not, so two buttons of
one control are rasterised by two different faces.

AND THE SPAN IS THE MARK, WHICH IS WHAT MAKES A CHANNEL-FREE RULE RATCHETABLE.
Keying a glyph on its enclosing literal would make the entry STALE -- a gate
FAILURE -- the first time anyone edited an unrelated word of that sentence. R8 met
this in markdown and settled it: the mark is the stable carrier and `count` carries
site multiplicity. Generalising that RETIRES the tail channel, which existed only
to carry glyphs past the `>text<` bound and is now subsumed; the same marks, at the
same sites, in the same files. It also means a span is judged by the glyph rule OR
by the four typeset rules and never by both, so the ratchet's per-site arithmetic
stays honest.

RETRACTION -- TWO SENTENCES CYCLE 3 PRINTED HERE WERE TRUE OF ITS CHANNELS ONLY
Both are corrected in place rather than quietly rewritten, because the whole subject
of this file is a claim that was true where it was measured and nowhere else.

  RETRACTED: "The chrome's FOUR un-owned glyphs live here (U+2715, U+21BB, U+2191,
  U+2318)." Four was the sink channel's count, not the chrome's. On the
  channel-free rule the chrome carries 53 SITES over 38 entries and 29 DISTINCT
  MARKS, in 16 files. Cycle 3 also reported its chrome figure as "38 sites" when 38
  was the ENTRY count; sites and entries are different numbers and the `count`
  field is what separates them.
  (CORRECTED IN CYCLE 5: this said "14 files". Fourteen is the count of .js files
  and the chrome debt is not JS-only -- src/index.html carries 6 entries over 9
  sites and src/styles.css 5 over 9, and both are inside the 38/53/29 the same
  sentence quotes. Re-derived from the allowlist by bucketing on the file prefix
  and counting distinct files: 16. A correction that carries a fresh unverified
  number is the defect it is correcting.)

  RETRACTED: "0 ellipsis / 0 apostrophe / 0 quote / 0 dash ... with zero prose
  exceptions ruled anywhere outside src/topics." The second half held and still
  holds -- 160 prose exceptions, every one in src/topics. The first half did not:
  FOUR straight apostrophes were live in the drill and mock debrief verdicts
  (drill/logic.js:1016, :1018, :1186, :1189), in head runs and in one tagless
  literal, which no channel cycle 3 had could read. RESTATED ON THE WIDENED
  CHANNELS: all four are typeset, and the sweep now reports 0 / 0 / 0 / 0 / 0
  across the channel-free glyph rule and six bounded prose channels, with the
  ratcheted corpus standing at 111 apostrophes, 49 quotes and 2 dashes -- which is
  also a correction, since cycle 3's "52 apostrophes, 2 dashes, 2 quotes" was the
  same figure taken through narrower channels.

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
MEASURED on the committed build: it holds 2,799 characters of copy in 177 real HTML
text nodes, 0.023% of the file, and 99.73% of the bytes are inside <script> or
<style>, because the topic corpus and every panel this app draws are compiled to
JavaScript and emitted as markup at runtime. A text-node walk would therefore have
swept a rounding error of the copy and reported it clean. (THE METHOD, because
three different numbers have been quoted for this: html.parser over the built file;
<script> and <style> elements dropped whole; the remaining character data
entity-decoded, each whitespace run collapsed to one space, each node stripped.
Raw, uncollapsed, the same walk gives 4,028 characters -- the same finding either
way, and the collapsed figure is the one this file and the wave ledger both quote.)
NO CURRENT BUILD'S BYTE COUNT IS QUOTED HERE, and that is deliberate: cycle 2 wrote
this paragraph against build 12,323,503 and the very commit that carried it shipped
a 12,334,544-byte build (both figures verified against git: 437fdb5 and 00f1962), so
the sentence was stale the moment it landed -- the third time in this file's short
life that a receipt has named a build that no longer existed. Those two numbers are
FROZEN HISTORY and stay; what is gone is any figure attributed to the build this
check is looking at. (Cycle 3 wrote the opener as "NO ABSOLUTE BYTE COUNT IS QUOTED
HERE" while quoting two, so the sentence contradicted its own next clause -- a
finding that was sound about the attribution and wrong about the prose. Corrected
here rather than deleted, because the correction is the smaller claim.) The derived
figures (177 / 2,799 / 0.023% / 99.73%) reproduce on both builds to the character;
the byte count is the only part that could go stale, so no live one is in the prose.
So the corpus is the SOURCE, and the copy is found where the
copy actually lives: inside string literals that build markup, inside `content:`
declarations that print marks, and inside the text SINKS that assign copy directly.

HOW THE COPY IS FOUND, and this is the load-bearing part
A JavaScript scanner walks each file tracking whether it is inside a line comment,
a block comment, or a single/double/backtick string. COMMENTS ARE NOT COPY -- a
first attempt used a bare `>...<` regex over whole files and reported 523 straight
quotes, nearly all of them inside the long design comments this repo is written
in. Only string literals are considered. The GLYPH rule then takes the literal
WHOLE (see above); the four TYPESET rules take only these bounded runs:

    text between a '>' and the next '<'      the content of emitted markup
    the run BEFORE the literal's first '<'   a sentence that opens a literal (R11)
    title= / aria-label= / placeholder= /    copy that is spoken or hovered
    alt= attribute values
    a text sink's literals                   copy assigned straight onto a node
    a TAGLESS whole sentence                 copy with no markup in it at all (R11)

which excludes selectors, class names, storage keys and every other string that is
addressed to the machine rather than to a person. Entities are decoded before the
rules run, so `&mdash;` counts as an em dash and a bare `-` does not. CSS comments
are stripped the same way and for the same reason.

THE HEAD RUN AND THE TAGLESS LITERAL (R11), and why the tail's argument does NOT
transfer to them. `>...<` only sees copy with a tag on BOTH sides inside ONE
literal, and cycle 3 added the TAIL run -- the copy after the last '>' -- for the
GLYPH rule only, on the ground that a tail has no closing tag to bound it and
routinely stops mid-sentence or mid-SQL. That argument is about the RIGHT-HAND
bound, so it says nothing about a head run, which starts where the literal starts
and stops at a markup boundary the author wrote. Measured on the real tree: the
four live sites are debrief verdicts,

    verdict = 'You&rsquo;re carrying the signals ... <b>senior-signal line</b> ...'

where the whole sentence sits before the first tag and `>text<` saw only the two
words INSIDE the bold. All four typeset rules are pressed on this channel, one
fixture each -- a channel that carries four rules while only one of them can fire
there is a check that cannot fail.
The TAGLESS literal is the residual: `drill/logic.js:1189` is rendered copy with an
apostrophe in it and no markup at all, so head, tail and `>text<` all miss it by
construction. It is bounded at four conditions -- no markup characters, no newline,
four or more words, and a TERMINAL punctuation mark -- because "every literal" is
how a prose check starts demanding that identifiers be punctuated, and because a
fragment that ends mid-thought is exactly what the tail channel refused to judge.
All four sites are TYPESET now, not ratcheted; the negative control is a one-word
label, an unpunctuated placeholder and a storage key, none of which may be judged.

THE TEXT SINKS, which are the third way this app prints a string (R7, widened R10)
`el.textContent = '...'`, `.innerText`, `.placeholder`, `.value` and
`setAttribute('title'|'aria-label'|'placeholder'|'alt', '...')` all put copy on the
screen without ever passing through markup, so a scanner that only reads `>text<`
and `attr="..."` is blind to them by construction. Two straight ellipses were
shipping in the search overlay's own placeholder and empty state and are typeset
now. CYCLE 3 MATCHED THE FIRST TOKEN AFTER THE OPENER AND R10 MATCHES THE WHOLE
STATEMENT: `running ? '\\u2759\\u2759' : '\\u25B6'` begins with an identifier, so
the shipped pattern matched none of the three ternary sinks listed above. Every
literal from the opener to the terminating ';' at depth 0 is read now. Only STRING
LITERALS are read: `x.textContent = t.title` is a variable and is not copy this
file can judge.

THE MARKDOWN DOOR (R8), and why the four prose rules stay OUT of it
src/topics-md/*.md is authored prose, and the compiler runs it through markdown-it
with `typographer:true` (tools/compiler/prose.mjs:18) -- which is what converts the
15,703 raw apostrophes in the corpus into the typeset form on the way to the
screen. Those are therefore NOT defects, and a check that reported them would be
demanding that a solved problem be solved twice, by hand, in 38 files. What the
typographer does NOT do is choose a font: a codepoint outside --sans is exactly as
unowned in markdown as it is in a span. So .md is in scope for THE GLYPH RULE ONLY.
The span yielded is each contiguous run of non-ASCII characters after entity
decoding, one per site -- 447 runs across 38 files, of which two are outside the
OWNED set (U+25BC x3 in multi-region.md's diagram chevrons, U+00E0 x1 in
leader-election.md), both ratcheted. KEYING AT THE MARK RATHER THAN AT THE LINE is
a deliberate deviation from "inline-HTML spans": the ratchet key is the whole
stripped span, so a line-keyed markdown entry would go STALE -- a gate failure --
the first time anyone edited a word of that sentence. The mark is the stable
carrier, the `count` field already carries site multiplicity, and the arithmetic is
identical (3 + 1).

THE ASCII SOURCE LAW HOLDS. test/ascii_guard.py forbids a non-ASCII byte in src/,
so the typeset forms are written as entities or escapes exactly as the repo already
does (`&rsquo;` / `\\u2019` / `\\2019`). This check reads through all three.

THE ALLOWLIST IS A RATCHET, NOT AN AMNESTY -- AND CYCLE 1'S WAS NEITHER
test/craft_hygiene_allow.json carries the spans that are ruled exceptions -- code
samples printed as prose, SQL and shell fragments, and the glyph inventory the app
has not yet fixed -- each with a REASON, the FILE it is excused in, HOW MANY sites
there are, and the list of RULES it is excused from. Three defects in how that was
keyed and read, all three pressed and all three fixed here:

  * THE KEY WAS A 120-CHARACTER PREFIX. 20 of 77 entries at the time (cycle 1; the
    allowlist holds 237 today) were longer than that, so
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
a CSS `content:` declaration), the two SHIPPED TERNARY SINKS cycle 3's first-token
pattern could not reach, all four typeset rules on a HEAD run, and an apostrophe in
a TAGLESS sentence. If any planted defect goes undetected the check ABORTS rather
than report a green it did not earn. THE TERNARY FIXTURES CARRY THEIR MARK IN THE
FAR BRANCH deliberately: a scanner that walked to the first literal after the
opener and stopped would go green on both.

AND THE RATCHET'S OWN MACHINERY IS NOW DRIVEN THROUGH THE REAL DECISION (cycle 3).
Cycle 2 pressed the rule INTERSECTION with an expression the self-test wrote
itself -- `[r for r, _w in judge(span) if r not in set(ent['rules'])]` -- which is
a test of a list comprehension, not of the check. Mutation-tested: reverting main()
to the cycle-1 defect (skip an allowlisted span outright) left the gate GREEN and
exit 0, still printing "each excused only from the rules it declares". The same was
true of the `count` GREW check, the STALE detector and the SHRANK check: all three
could be deleted without turning anything red, because the only thing that had ever
exercised them was an out-of-band press script that is not part of the gate. The
per-span decision and the ledger audit are now `decide()` and `audit()`, and
`self_test()` drives BOTH over synthetic file+allowlist pairs -- so an entry
declaring ['apostrophe'] over a span that also hits `ellipsis` must produce a
finding, a file with two sites under a count of one must GREW, one site under a
count of two must SHRANK, and an entry matching nothing must go STALE. Delete any
of the four and the check aborts on itself.

Usage: python3 test/craft_hygiene.py [--report]
       --report also REWRITES craft_hygiene_allow.json's informational `lines`
       arrays from the current tree. They are a human index, not part of the key,
       and cycle 2's had drifted 13-29 lines against the file they index -- so the
       instrument that reads the list is the thing that refreshes it.
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
# THE HEAD RUN (R11), the mirror of the tail and NOT its twin. `'You&rsquo;re carrying the
# signals a senior loop grades on ... <b>senior-signal line</b>'` opens with a whole sentence
# that `>...<` cannot see, because its first tag is on the RIGHT. Unlike a tail, a head run is
# BOUNDED ON THE RIGHT BY ITS OWN TAG -- it starts where the literal starts and stops at a
# markup boundary the author wrote -- so it routinely ends a complete sentence and the four
# typeset rules are well-founded on it. The tail's glyph-only argument does not transfer.
HEAD_TEXT = re.compile(r'^([^<>{}\n]+)<')
# a JS string literal, with escapes -- shared by both sink patterns below
_STR = r"""(['"`])((?:\\.|(?!\1)[^\\])*)\1"""
# THE SINK SHAPE: copy assigned straight onto a node, never passing through markup. These match
# the STATEMENT OPENER only; every literal from the match to the statement's terminating ';' at
# depth 0 is the sink's copy -- see sink_bodies().
SINK_ASSIGN = re.compile(r'\.(?:textContent|innerText|placeholder|value)\s*=')
SINK_SETATTR = re.compile(r"""\.setAttribute\(\s*(['"])(?:title|aria-label|placeholder|alt)\1\s*,""")
# every contiguous non-ASCII run: THE GLYPH CHANNEL'S span everywhere, and the stable ratchet
# key for a mark. See glyph_runs().
NON_ASCII = re.compile(r'[^\x00-\x7f]+')
# THE BARE LITERAL (R11): a literal with no markup in it at all, which therefore reaches no
# tag-bounded channel. Bounded deliberately -- see bare_prose().
_WORD = re.compile(r'[A-Za-z][A-Za-z0-9&;]*')


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


def blank_comments(src):
    """The source with comments replaced by spaces, newlines and offsets preserved.

    The sink patterns are matched against the SOURCE rather than against a literal, because a
    sink is a statement shape (`x.textContent = '...'`) and js_literals() has already thrown the
    statement away by the time it yields the string. Blanking rather than deleting keeps every
    offset and every line number exactly where it was -- and keeps COMMENTS OUT, which is the
    whole doctrine of this file: `/* el.placeholder = "don't do this" */` is not copy.
    """
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            while i < n and src[i] != '\n':
                out.append(' ')
                i += 1
        elif c == '/' and i + 1 < n and src[i + 1] == '*':
            out.append('  ')
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                out.append('\n' if src[i] == '\n' else ' ')
                i += 1
            out.append('  ')
            i += 2
        elif c in ('"', "'", '`'):
            q = c
            out.append(c)
            i += 1
            while i < n:
                if src[i] == '\\' and i + 1 < n:
                    out.append(src[i:i + 2])
                    i += 2
                    continue
                out.append(src[i])
                if src[i] == q:
                    i += 1
                    break
                if src[i] == '\n' and q != '`':      # unterminated: bail, do not guess
                    i += 1
                    break
                i += 1
        else:
            out.append(c)
            i += 1
    return ''.join(out)


def sink_bodies(src):
    """The raw bodies of every string literal that sits in a TEXT-SINK statement.

    R10 WIDENED THIS FROM "THE FIRST TOKEN" TO "THE WHOLE STATEMENT", and the three sites it was
    blind to are the reason. The pattern used to be `.textContent\\s*=\\s*<string>` -- an opener
    followed IMMEDIATELY by a literal -- so the commonest shape this app actually writes,

        playBtn.textContent = running ? '\\u2759\\u2759' : '\\u25B6';
        el.setAttribute('aria-label', on ? 'Pause focus timer' : 'Start focus timer');

    matched NOTHING, because the token after `=` is an identifier. Three live sites printed five
    unowned marks through that hole. The shape is matched against blank_comments(src) -- a sink
    is a STATEMENT, and js_literals() has thrown the statement away by the time it yields a
    string -- and every literal from the opener to the terminating ';' at depth 0 is yielded, not
    just the first. Depth is tracked over (), [] and {} so a `;` inside a nested call or an object
    literal cannot end the statement early, and comments are already blanked so a `;` in prose
    about the code cannot either.
    """
    out = set()
    n = len(src)
    starts = [m.end() for rx in (SINK_ASSIGN, SINK_SETATTR) for m in rx.finditer(src)]
    for i0 in starts:
        i, depth = i0, 0
        while i < n:
            c = src[i]
            if c in '([{':
                depth += 1
            elif c in ')]}':
                if depth == 0:
                    break                 # the enclosing call closed: the argument list is over
                depth -= 1
            elif c == ';' and depth == 0:
                break
            elif c == '\n' and depth == 0:
                # a bare newline at depth 0 with no ';' -- ASI territory; stop rather than run on
                nxt = src[i + 1:i + 400].lstrip()
                if not nxt.startswith((':', '?', '+', '.', ',', '&', '|')):
                    break
            elif c in ('"', "'", '`'):
                q, buf = c, []
                i += 1
                while i < n:
                    if src[i] == '\\' and i + 1 < n:
                        buf.append(src[i:i + 2])
                        i += 2
                        continue
                    if src[i] == q:
                        break
                    if src[i] == '\n' and q != '`':
                        break
                    buf.append(src[i])
                    i += 1
                out.add(''.join(buf))
            i += 1
    return out


def glyph_runs(decoded):
    """Every contiguous non-ASCII run in one decoded carrier -- THE GLYPH CHANNEL'S span.

    R10: THE GLYPH RULE IS CHANNEL-FREE, and the span is the MARK. Two separate arguments meet
    here and they point the same way.

    WHY EVERY CARRIER. Font ownership is a fact about a codepoint and a font stack; it is not a
    fact about whether the string around it sits between two tags. Cycle 3 had it on four bounded
    channels and the holes were exactly where the bounds were: `running ? '\\u2759\\u2759' :
    '\\u25B6'` is a sink whose literal is not the first token, and `hintEl.textContent = dir ===
    'prev' ? '\\u2039' : '\\u203a'` is the same shape. Every string literal is a carrier now --
    the R1 principle ("the class cannot grow silently") finishing its arc.

    WHY THE MARK AND NOT THE LITERAL. The ratchet key is the whole stripped span, so keying a
    glyph on its enclosing literal makes the entry STALE -- a gate FAILURE -- the first time
    anyone edits an unrelated word of that sentence. R8 already met this in markdown and settled
    it: the mark is the stable carrier and `count` carries site multiplicity. Generalising that
    to every channel also RETIRES the tail channel, which existed only to carry glyphs past the
    `>text<` bound and is now subsumed: a codepoint after the last tag is a codepoint in the
    literal. The arithmetic is unchanged -- the same marks, at the same sites, in the same files.
    """
    return [m.group(0) for m in NON_ASCII.finditer(decoded)]


def bare_prose(decoded):
    """True if a TAGLESS literal is a whole thought worth holding to the four typeset rules (R11).

    THE RESIDUAL CLASS, and it is not hypothetical: `drill/logic.js:1189` is
    `note = 'Below bar &mdash; the happy path isn\\'t enough. Work Walkthrough + See-the-code,
    then run the round again.'` -- rendered copy, a straight apostrophe in it, and NO markup at
    all, so `>text<`, the head run and the tail run all miss it by construction. It reaches the
    screen through `innerHTML` a few lines later.

    BOUNDED, because "every literal" is how a prose check starts demanding that identifiers be
    punctuated. FOUR conditions, each one load-bearing: no markup characters at all (a literal
    with a tag belongs to a tag-bounded channel and would double-count), no newline (a template
    literal spanning lines is a document, not a sentence), FOUR OR MORE WORDS (`hm-chip`, `9/21`
    and `Copy` are not sentences), and a TERMINAL PUNCTUATION MARK -- which is the discriminator
    that matters, because a fragment that ends mid-thought is exactly what the tail channel
    refused to judge, and for the same reason. `judge()`'s prose and CODE gates still apply on
    top of all four.

    AND THE ONE EXEMPTION FROM ALL FOUR (cycle 5, judge item 7): a SEPARATOR-ONLY literal. Every
    bound above is a bound on a SENTENCE, and a joiner is not a sentence -- it is a mark with its
    context in the concatenation instead of in the string. `' -- '` therefore satisfied none of
    them and reached the screen 138 times from one site while this check printed `dash 0`. It is
    admitted to the channel here and judged by SEP_ONLY in judge(), which applies the dash and
    ellipsis rules to the mark itself and judges a lone hyphen not at all.
    """
    if any(c in decoded for c in '<>{}\n'):
        return False
    if SEP_ONLY.match(decoded):
        return True
    s = decoded.strip()
    if not s.endswith(('.', '!', '?', '."', ".'", '.)', '?"', '!"')):
        return False
    return len(_WORD.findall(s)) >= 4


def copy_spans(path, text):
    """(line, span, mode) for every run of RENDERED copy in one source file.

    MODE names WHICH RULES the span is held to, and after R10 it is a two-channel split rather
    than a per-span exception:

        'glyph'  -- a contiguous non-ASCII run, from ANY carrier. Font ownership is a fact about
                    a codepoint, so this channel is unbounded: every string literal, every CSS
                    `content:` string, every markdown line, every HTML text and attribute run.
        'prose'  -- a bounded run of copy that is a whole thought, held to the FOUR TYPESET
                    RULES ONLY. Bounded because each of those rules is a claim about prose:
                    markup between two tags, the HEAD run before a literal's first tag, an
                    attribute value, a text sink's literals, a tagless whole sentence, and a CSS
                    `content:` string.

    THE TWO CHANNELS DO NOT OVERLAP, which is what keeps the ratchet's `count` arithmetic honest:
    a mark inside a `>text<` span is judged ONCE, by the glyph channel, keyed at the mark.

    EVERY SPAN COMES OUT FULLY DECODED, here and nowhere else. main() used to entity-decode
    everything except .css, which was correct for two channels and a latent double-decode for
    any third (`&amp;lt;` -> `&lt;` -> `<` decodes twice into a character the source never
    printed). One decoder per channel, at the point the channel is read.
    """
    out = []
    dec = html.unescape
    if path.endswith('.css'):
        for ln, s in css_marks(text):
            for g in glyph_runs(s):
                out.append((ln, g, 'glyph'))
            out.append((ln, s, 'prose'))
        return out
    if path.endswith('.md'):
        # GLYPH RULE ONLY, and the span is the MARK. tools/compiler/prose.mjs runs markdown-it
        # with typographer:true, so the apostrophes and dashes in this corpus are typeset on the
        # way to the screen and are not defects here. The font is the part no compiler chooses.
        for i, ln in enumerate(text.split('\n'), 1):
            for g in glyph_runs(dec(ln)):
                out.append((i, g, 'glyph'))
        return out
    if path.endswith('.html'):
        body = re.sub(r'(?is)<(script|style)\b.*?</\1>', '', text)
        for i, ln in enumerate(body.split('\n'), 1):
            for rx, gi in ((HTML_TEXT, 1), (ATTR, 2)):
                for m in rx.finditer(ln):
                    s = dec(m.group(gi))
                    for g in glyph_runs(s):
                        out.append((i, g, 'glyph'))
                    out.append((i, s, 'prose'))
        return out
    sinks = sink_bodies(blank_comments(text))
    for line, raw in js_literals(text):
        lit = unescape_js(raw)
        whole = dec(lit)
        # THE GLYPH CHANNEL: the literal itself, whole and undivided. No bound, no gate.
        for g in glyph_runs(whole):
            out.append((line, g, 'glyph'))
        # THE PROSE CHANNELS: bounded, and deduplicated WITHIN the literal so a sink whose copy
        # is also a bare sentence is one site rather than two.
        prose = []
        for rx, gi in ((HTML_TEXT, 1), (ATTR, 2), (HEAD_TEXT, 1)):
            for m in rx.finditer(lit):
                prose.append(dec(m.group(gi)))
        if (raw in sinks or bare_prose(whole)) and whole not in prose:
            prose.append(whole)
        for s in prose:
            out.append((line, s, 'prose'))
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

# THE SEPARATOR-ONLY LITERAL (cycle 5, judge item 7). A literal that is NOTHING BUT separator
# marks is a joiner -- `a.title + ' -- ' + rest` -- and until this cycle no channel could judge one,
# in either direction:
#   the TAGLESS channel refused it (four words and a terminal mark, and it has neither);
#   the PROSE GATE refused it (no letter, no internal space after stripping);
#   the DASH RULE refused it (its lookarounds want alphanumerics on both sides, and a joiner has
#   its context in the CONCATENATION rather than in the string).
# The cost was 138 spaced double hyphens rendered on the home from ONE literal in
# src/scripts/app/home-view.js, while this file printed `dash 0` -- a claim true of the channel and
# false of the app, which is the exact class this wave exists to close. So a separator-only literal
# is judged on ITS OWN, by the marks it is made of, with no word count and no context:
#   '--' (or '---')  a hyphen run doing an em dash's job                     -> dash
#   '...'            three periods where the typeset form is an ellipsis     -> ellipsis
#   '-'              NOT judged. A lone hyphen between two figures is a RANGE (`p50 - p99`), and a
#                    separator-only literal carries no context to tell a range from an aside. That
#                    is the negative control in CLEAN_SEP, and it is what bounds this rule.
#   an em/en dash, a real ellipsis, a middot -- already typeset; nothing to say.
SEP_ONLY = re.compile('^\\s*([-.\\u2013\\u2014\\u2026\\u00b7]{1,3})\\s*$')
SEP_DASH = re.compile(r'^-{2,3}$')

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


def judge(span, mode='glyph'):
    """[(rule, matched text)] for one decoded span.

    TWO CHANNELS, TWO RULE SETS, NO OVERLAP (R10). Cycle 3 ran the glyph rule FIRST and on every
    span, with a `glyph_only` flag suppressing the four typeset rules on fragments -- correct as
    far as it went, but the glyph rule's reach was still whatever the SPAN CHANNELS happened to
    cover, and three live sites printed five unowned marks outside them. The glyph rule now has
    its own channel (every contiguous non-ASCII run of every carrier -- see glyph_runs) and the
    four typeset rules keep theirs (bounded runs of copy that are whole thoughts). A span is
    therefore judged by one set or the other and never by both, which is what stops a mark
    inside a `>text<` run from being counted twice by a ratchet that counts sites.

    The prose gate and the CODE gate stay under the four typeset rules, because each of those IS
    a claim about prose and would otherwise demand that the corpus's SQL be retypeset. Font
    ownership needs neither gate: a codepoint is unowned whether or not the string around it
    reads as a sentence, which is why cycle 1's `<span>&#9733;</span>` went unjudged.
    """
    if mode == 'glyph':
        return [('glyph', 'U+%04X %s' % (ord(ch), ch))
                for ch in span if ord(ch) > 127 and ch not in OWNED]
    # THE SEPARATOR-ONLY LITERAL, JUDGED BEFORE THE PROSE GATE AND NOT BY IT (cycle 5, item 7).
    # It has to come first because both gates below are written for sentences and a joiner is not
    # one: it has no letter and no internal space, so `' -- '` fell through every rule this file
    # has while printing 138 marks on the home. See SEP_ONLY for why '-' alone is not judged.
    sep = SEP_ONLY.match(span)
    if sep:
        run = sep.group(1)
        if '...' in run:
            return [('ellipsis', run)]
        if SEP_DASH.match(run):
            return [('dash', run)]
        return []
    if not PROSE.search(span) or ' ' not in span.strip():
        return []
    if CODE.search(span):
        return []
    return [(name, m.group(0)) for name, rx, _why in RULES for m in rx.finditer(span)]


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
# 2b. THE DECISION, EXTRACTED SO THE SELF-TEST CAN DRIVE IT                     #
# --------------------------------------------------------------------------- #
# WHY THIS IS A FUNCTION AND NOT FOUR LINES INSIDE main(). Cycle 2 shipped the rules
# INTERSECTION, the `count` GREW check, the STALE detector and the SHRANK check, wrote them
# into the PASS line, and guarded NONE of them: every one of the four could be deleted and the
# gate stayed green at exit 0. The self-test's "ratchet press" pressed an expression it had
# written itself, and the wave's own press receipt covered the intersection only by accident --
# a defect planted INSIDE an allowlisted span changes that span's hash, so it is caught 100% by
# the whole-span KEY whether the intersection exists or not. Mutation-tested both ways: with a
# sixth rule declared, the shipped code reports 8 findings and the no-intersection code reports
# 5, so the property is load-bearing and was simply unguarded. It is guarded now, by driving
# THIS function -- the one main() calls -- over synthetic file+allowlist pairs.


def decide(path, line, span, mode, ruled, used):
    """The per-span decision: judge -> key -> allow lookup -> rule intersection -> count tally.

    Mutates `used` (key -> {'rules': set that fired, 'n': sites, 'lines': [line]}), which is
    what audit() then reads. Returns this span's findings, which may be empty.
    """
    hits = judge(span, mode)
    if not hits:
        return []
    key = key_of(path, span)
    ent = ruled.get(key)
    if ent is not None:
        declared = set(ent.get('rules') or [])
        u = used.setdefault(key, {'rules': set(), 'n': 0, 'lines': []})
        u['rules'].update(r for r, _w in hits)
        u['n'] += 1
        u['lines'].append(line)
        hits = [(r, w) for r, w in hits if r not in declared]
    return [(path, line, r, w, span.strip()[:120]) for r, w in hits]


def sweep(files, ruled):
    """files: iterable of (path, text). -> (findings, used, scanned)."""
    findings, used, scanned = [], {}, 0
    for path, text in files:
        for line, span, mode in copy_spans(path, text):
            scanned += 1
            findings += decide(path, line, span, mode, ruled, used)
    return findings, used, scanned


def audit(ruled, used):
    """The four ledger failures: an entry that matches nothing, a declared rule that no longer
    fires, more sites than the entry excuses, fewer sites than it declares.

    A stale exception is how a debt list turns into a permission slip; an uncounted new site is
    how "the class cannot grow" stops being true inside one file.
    """
    stale = [k for k in ruled if k not in used]
    over, grew, shrank = [], [], []
    for k, ent in ruled.items():
        if k not in used:
            continue
        for r in (ent.get('rules') or []):
            if r not in used[k]['rules']:
                over.append((k, r))
        want, got = int(ent.get('count', 1)), used[k]['n']
        if got > want:
            grew.append((k, ent, want, got))
        elif got < want:
            shrank.append((k, ent, want, got))
    return stale, over, grew, shrank


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
# THE PRESSES. Every one of these was a PASS on some shipped version of this check, and each is
# the exact defect that version's ledger claimed was impossible, put back.
PLANTS_PRESSED = {
    # a bare glyph span: no letter, no space -- cycle 1's prose gate skipped it outright
    'glyph-bare': ("var h = '<span class=\"ix-star-ic\" aria-hidden=\"true\">&#9733;</span>';",
                   'fixture.js'),
    # a glyph the OWNED set has never carried, in a span that IS prose: proves the class is
    # closed rather than merely quiet about the codepoints that happen to ship today
    'glyph-new':  ("var h = '<p>Next step \\u27a4 keep going</p>';", 'fixture.js'),
    # a printed mark in a stylesheet: cycle 1's tracked_sources() took no .css at all
    'glyph-css':  (".hm-lbl::after{content:\"\\2620 flagged for review\"}", 'fixture.css'),
    # CYCLE 3. THE TAIL RUN -- the commonest emit shape in this codebase, and a free pass until
    # now: the same mark inside `>text<` went RED while this one went green, span count unchanged
    'glyph-tail': ("var h = '<button class=\"t\">Next step \\u27a4' + t.title + '</button>';",
                   'fixture.js'),
    # CYCLE 3. THE TEXT SINK -- copy that never passes through markup at all
    'glyph-sink': ("icon.textContent = '\\u2318';", 'fixture.js'),
    'glyph-attr': ("el.setAttribute('aria-label', 'Reset \\u21bb this topic');", 'fixture.js'),
    # CYCLE 4 (R10). THE SINK WHOSE LITERAL IS NOT THE FIRST TOKEN, in the EXACT shipped shapes.
    # `.textContent\s*=\s*<string>` matched neither of these, so pomodoro.js:70 printed U+2759 x2
    # and U+25B6, touch-swipe.js:47 printed U+2039/U+203A, and session-progress.js:855 printed
    # U+2318 -- five marks, three files, through a channel whose ledger said it read text sinks.
    # BOTH FIXTURES CARRY THE MARK IN THE SECOND BRANCH, which is the half "the first token"
    # could never reach; a check that stopped at the first literal would go green on both.
    'glyph-ternary-sink': ("playBtn.textContent = running ? 'PAUSE' : '\\u25B6';", 'fixture.js'),
    'glyph-ternary-attr': ("el.setAttribute('aria-label', on ? 'Pause' : 'Start \\u21bb');",
                           'fixture.js'),
    # CYCLE 3. THE MARKDOWN DOOR -- 38 authored files that tracked_sources() did not take
    # NOTE THE FORM: markdown carries ENTITIES, not JS escapes, and ascii_guard forbids a raw
    # non-ASCII byte in src/topics-md -- so this is how an unowned mark actually reaches the
    # corpus, in both the shapes it takes there (inside an inline-HTML span, and in bare prose).
    'glyph-md':   ("A diagram chevron: <span class=\"dgm-v\">&#9660;</span> and a mark &#10148; "
                   "in plain prose.", 'fixture.md'),
}
# CYCLE 4 (R11). THE HEAD RUN, PRESSED ONCE PER TYPESET RULE. A head run is bounded on the right
# by its own tag, so unlike a tail it routinely ends a complete sentence and all four rules are
# well-founded on it -- which means all four have to be shown to fire there, not just one. These
# are the shape of the four live debrief sites (drill/logic.js:1016/:1018/:1186), where a whole
# verdict sentence sits before the literal's first <b>, and `>text<` saw only the two words
# INSIDE the bold tag. Each entry names the rule that must come back.
PLANTS_HEAD = {
    # escaped, exactly as the live site writes it -- an unescaped ' would close the literal, and
    # the scanner has to read through the escape to see the defect at all
    'head-apostrophe': ("var v = 'You\\'re carrying the signals a senior loop grades on "
                        "<b>unprompted</b>.';", 'apostrophe'),
    'head-ellipsis':   ("var v = 'Loading the bank ... one moment <b>now</b>.';", 'ellipsis'),
    'head-quote':      ('var v = \'She said "walk me through it" and <b>waited</b>.\';', 'quote'),
    'head-dash':       ("var v = 'Staff is the thin rail - the level you <b>rehearsed</b> "
                        "least.';", 'dash'),
}
# CYCLE 4 (R11). THE TAGLESS LITERAL. drill/logic.js:1189 is rendered copy with no markup in it
# at all, so every tag-bounded channel misses it by construction; it reaches the screen through
# an innerHTML a few lines later. The negative control beside it is the whole argument for the
# bound: a three-word fragment and an unpunctuated one must NOT be judged.
PLANT_BARE = ("var n = 'Below bar - the happy path isn\\'t enough. Work Walkthrough + "
              "See-the-code, then run the round again.';", 'apostrophe')
CLEAN_BARE = ("var a = 'Copy'; var b = 'don\\'t'; var c = 'Filter topics by name or tag';\n"
              "var d = 'ddr.v1.progress.caching'; var e = 'no-store, max-age=0';\n"
              # THE WORD BOUND'S OWN CONTROL, and it needs a literal that clears every OTHER
              # condition -- tagless, punctuated, prose-shaped -- so that only the four-word
              # bound is standing between it and a false failure. A range label is the honest
              # case: the hyphen in `p50 - p99.` separates two endpoints and is not a hyphen
              # doing an em dash's job, and a two-word label is not a sentence.
              "var lbl = 'p50 - p99.'; var v = 'Rev. 3 - draft.';\n")
# CYCLE 4 (R10). THE WIDENED SINK, PRESSED FOR THE THING ONLY IT CAN DO. The two ternary GLYPH
# fixtures above are satisfied by the channel-free glyph rule whether the sink walks the whole
# statement or stops at its first literal -- so they do NOT press the widening. What only the
# widened sink can reach is a TYPESET defect in a far-branch literal that is too short for the
# bare-literal channel and carries no tag: three words, no terminal mark, in the far branch.
PLANTS_SINK = {
    'sink-ternary-prose': ("el.placeholder = compact ? 'Filter' : 'the interviewer\\'s list';",
                           'apostrophe'),
    'attr-ternary-prose': ("el.setAttribute('title', on ? 'Pause' : 'the interviewer\\'s cue');",
                           'apostrophe'),
}
# CYCLE 5 (judge item 7). THE SEPARATOR-ONLY LITERAL, IN THE EXACT SHIPPED SHAPE. home-view.js's
# segLabel() was `s.title + ' -- ' + ...` and put 138 spaced double hyphens on the home -- first
# through a title attribute, then, this wave, through a rendered text node as well -- while this
# file printed `dash 0`. Every bound in bare_prose() is a bound on a sentence and a joiner is not
# one, so the mark was unreachable by construction rather than merely unnoticed.
PLANTS_SEP = {
    'sep-dash':     ("var s = t.title + ' -- ' + rest;", 'dash'),
    'sep-ellipsis': ("var s = head + '...' + tail;", 'ellipsis'),
}
# ...AND ITS BOUND, which is the whole argument for judging the mark rather than the string: a LONE
# hyphen between two figures is a RANGE, and a separator-only literal carries no context that could
# tell a range from an aside. A joiner made of marks the app already owns has nothing to say either.
CLEAN_SEP = ("var r = p50 + ' - ' + p99;\n"
             "var a = a1 + ' \\u2014 ' + a2; var b = b1 + ' \\u00b7 ' + b2;\n"
             "var c = lo + '.' + hi;\n")
# EVERY CHANNEL PLANT THE SELF-TEST DRIVES, IN ONE PLACE -- because the receipt is computed from
# THIS and the loop iterates THIS. Cycle 4's receipt was `len(PLANTS) + len(PLANTS_PRESSED) +
# len(PLANTS_HEAD) + 1` while the loop also ran PLANTS_SINK, so emptying PLANTS_SINK left the gate
# green and the PASS line printing the IDENTICAL count -- and those two fixtures are the only thing
# standing between R10's widened sink and a silent revert. A receipt that cannot report the loss of
# the plants it is a receipt for is not one.
CHANNEL_PLANTS = (list(PLANTS_HEAD.items()) + list(PLANTS_SINK.items())
                  + list(PLANTS_SEP.items()) + [('bare-literal', PLANT_BARE)])
# THE MARKDOWN NEGATIVE CONTROL. markdown-it runs with typographer:true, so these ARE typeset on
# the way to the screen; reporting them would demand that a solved problem be solved again by
# hand in 38 files, and 15,703 of them ship today.
CLEAN_MD = (
    "The interviewer's follow-up is the one that matters ... and the dash - it uses - is fine.\n"
    "A \"quoted phrase\" in markdown prose, plus owned marks: a RAW em dash "
    + chr(0x2014) + ", an ENTITY em dash &mdash;, and an arrow " + chr(0x2192) + ".\n"
)


def rules_of(path, src):
    """[rule names] over one synthetic source, through the real scanner and the real judge."""
    return [h[0] for _l, s, g in copy_spans(path, src) for h in judge(s, g)]


def hits_of(path, src):
    """[(rule, matched text)] over one synthetic source -- rules_of with the evidence kept."""
    return [h for _l, s, g in copy_spans(path, src) for h in judge(s, g)]


# ===== THE CROSS-REFERENCE RESOLVER (W-ADDRESSES cycle 10, carried item 9 -- half one) ========
# THE DEFECT CLASS, stated from the three times it has now been found by hand. src/styles.css
# argues for its own solves by NAMING the instrument that measures them -- "test/
# scoreboard_salience.cjs's KEY arm reads all four of these off the pixels" -- and those names
# are prose: nothing resolves them. Cycle 5 found one pointing at a file that contained no
# `.hm-k` selector at all; cycle 9 found the sentence beside it still saying FOUR while the key
# rendered five; cycle 10 found six more copies of the same number in four files. A citation
# nobody can follow is worse than no citation, because it is read as evidence.
# THIS HALF IS THE CHEAP ONE AND IT IS EXACT: every `test/<file>` any stylesheet comment names
# must EXIST. It cannot judge whether the named arm still asserts what the sentence claims -- no
# regex can -- but it makes the file the sentence points at a checked fact instead of a memory.
XREF_RE = re.compile(r'\btest/[A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:cjs|mjs|py|json|md)\b')


def comment_bodies(src):
    """[(line, text)] for every /* ... */ block in a CSS source. CSS has no line comment."""
    out, i, n, line = [], 0, len(src), 1
    while i < n:
        if src[i] == '/' and i + 1 < n and src[i + 1] == '*':
            start, at = i + 2, line
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i + 1] == '/'):
                if src[i] == '\n':
                    line += 1
                i += 1
            out.append((at, src[start:i]))
            i += 2
        else:
            if src[i] == '\n':
                line += 1
            i += 1
    return out


def dead_xrefs(name, src, exists):
    """[(name, line, path)] for every test/... path a comment names that `exists` denies."""
    bad = []
    for at, body in comment_bodies(src):
        for m in XREF_RE.finditer(body):
            p = m.group(0)
            if not exists(p):
                bad.append((name, at + body[:m.start()].count('\n'), p))
    return bad


def self_test(controls=None):
    """[problems]. `controls` (a list, if given) collects the NAME of every negative control that
    actually ran, so the PASS line's figure is derived from the assertions rather than typed --
    both receipts said "six" while seven ran, and a hand-typed count is the same defect class as a
    hand-typed plant count (see CHANNEL_PLANTS)."""
    problems = []
    ctl = controls if controls is not None else []
    ctl.append('the CLEAN fixture')
    hits = rules_of('fixture.js', CLEAN)
    if hits:
        problems.append('the CLEAN fixture was flagged: %s -- the analyser fails correct '
                        'copy, so every green below is meaningless' % hits)
    ctl.append('the CLEAN CSS fixture')
    css_hits = [h for _l, s, g in copy_spans('fixture.css', CLEAN_CSS) for h in judge(s, g)]
    if [h for h in css_hits if h[0] != 'glyph' or 'U+25B8' not in h[1]]:
        problems.append('the CLEAN CSS fixture was flagged beyond its one ratcheted mark: %s '
                        '-- either the comment stripper or the alt-text split is wrong, and a '
                        'stylesheet check that fails correct CSS gets turned off' % css_hits)
    if not [h for h in css_hits if 'U+25B8' in h[1]]:
        problems.append('the CLEAN CSS fixture\'s one real mark (U+25B8) was NOT seen -- the '
                        'CSS reader is not decoding escapes, so every green it reports is empty')
    # THE MARKDOWN NEGATIVE CONTROL, and it is the whole argument for the .md door's shape: the
    # four typeset rules must NOT fire on a corpus the typographer already typesets, or this
    # check would report 15,703 findings and be turned off within the hour.
    ctl.append('the CLEAN MARKDOWN fixture')
    md_clean = rules_of('fixture.md', CLEAN_MD)
    if md_clean:
        problems.append('the CLEAN MARKDOWN fixture was flagged %s -- .md is in scope for the '
                        'GLYPH RULE ONLY. tools/compiler/prose.mjs runs markdown-it with '
                        'typographer:true, so the apostrophes, ellipses, quotes and hyphens in '
                        'the corpus are typeset on the way to the screen and are not defects '
                        'here; a check that demanded they be hand-typeset in 38 files would be '
                        'asking for a solved problem to be solved twice.' % md_clean)
    for name, src in PLANTS.items():
        got = rules_of('fixture.js', src)
        if name not in got:
            problems.append('PLANT "%s" UNDETECTED: %r produced %s' % (name, src, got or 'nothing'))
    for name, (src, fx) in PLANTS_PRESSED.items():
        got = rules_of(fx, src)
        if 'glyph' not in got:
            problems.append('PRESSED PLANT "%s" UNDETECTED: %r produced %s -- this is a defect '
                            'the shipped check passed, and it is back' % (name, src, got or 'nothing'))
    # ---- R11: THE HEAD RUN, ONCE PER TYPESET RULE, AND THE TAGLESS LITERAL ------------------
    # A head run carries the four typeset rules (it ends at a tag the author wrote), so all four
    # have to be shown to fire on it. An undetected one ABORTS: shipping a channel that carries
    # four rules while only one of them can fire there is the "check that cannot fail" class
    # this whole wave exists to close.
    # THE LOOP AND THE RECEIPT NOW READ THE SAME LIST. See CHANNEL_PLANTS: cycle 4's receipt was a
    # hand-typed sum that omitted PLANTS_SINK, so deleting both sink plants left the gate green and
    # the printed figure unchanged -- while reverting sink_bodies() to cycle 3's first-token
    # behaviour still aborted, i.e. those two fixtures were the only guard on R10's widening and
    # the receipt could not report their loss.
    for name, (src, rule) in CHANNEL_PLANTS:
        got = rules_of('fixture.js', src)
        if rule not in got:
            problems.append('CHANNEL PLANT "%s" UNDETECTED: %r produced %s -- the rule %r is '
                            'declared to run on this channel and does not fire there, so the '
                            'channel carries fewer rules than its PASS line claims'
                            % (name, src, got or 'nothing', rule))
    # THE SEPARATOR RULE'S BOUND (cycle 5, item 7): a lone hyphen between two figures is a RANGE,
    # and marks the app already owns are already typeset. Without this control the rule would start
    # demanding that every joiner in the codebase be re-punctuated.
    ctl.append('the CLEAN SEPARATOR fixture (a range hyphen, an owned em dash, a middot, a dot)')
    clean_sep = hits_of('fixture.js', CLEAN_SEP)
    if clean_sep:
        problems.append('THE SEPARATOR RULE IS UNBOUNDED: %s. `p50 - p99` is a RANGE, and an em '
                        'dash, a middot and a decimal point are joiners with nothing wrong with '
                        'them. The rule judges a hyphen RUN of two or more and three periods, and '
                        'nothing else -- without that bound it reports every joiner in the tree.'
                        % clean_sep)
    ctl.append('the CLEAN BARE-LITERAL fixture')
    clean_bare = hits_of('fixture.js', CLEAN_BARE)
    if clean_bare:
        problems.append('THE BARE-LITERAL CHANNEL IS UNBOUNDED: %s. A one-word label, an '
                        'unpunctuated placeholder, a storage key and a two-word RANGE label '
                        '(`p50 - p99.`, where the hyphen separates two endpoints) are not '
                        'sentences. The bound is four words AND a terminal mark, and without '
                        'it this channel starts demanding that labels be typeset.' % clean_bare)
    ctl.append('a CODE SAMPLE')
    code = "var h = '<pre>-- badge: SELECT count(*) ... WHERE user_id=$1; -- seek</pre>';"
    if rules_of('fixture.js', code):
        problems.append('a CODE SAMPLE was judged as prose -- the rules would demand that the '
                        'SQL in the corpus be typeset, which is a correctness regression rather '
                        'than a craft improvement')
    # and the comment exclusion, which is the whole reason this scans literals -- now doubled,
    # because the SINK channel matches statement SHAPES against the source rather than against a
    # literal, so `/* el.placeholder = "don't ..." */` is a live way back in
    ctl.append('a DESIGN COMMENT')
    cmt = "/* the forks -- each decision, restated as the question you ask ... don't */"
    if rules_of('fixture.js', cmt):
        problems.append('a DESIGN COMMENT was judged as copy -- the literal scanner is not '
                        'excluding comments, which is what made the first draft report 523 '
                        'straight quotes that were all prose about the code')
    ctl.append('a COMMENTED-OUT SINK')
    scmt = "/* el.placeholder = 'Filter topics ... don\\'t'; */\n// x.textContent = 'a ... b';"
    if rules_of('fixture.js', scmt):
        problems.append('a SINK INSIDE A COMMENT was judged as copy -- blank_comments() is not '
                        'blanking, so every design comment that quotes an assignment is copy now')

    # ---- THE RATCHET'S OWN MACHINERY, DRIVEN THROUGH decide() AND audit() -------------------
    # Cycle 2 pressed the intersection with an expression the test wrote itself, so all four of
    # these could be deleted with the gate still green at exit 0. They are pressed through the
    # REAL functions now, over synthetic file+allowlist pairs.
    long_span = 'x' * 200 + " the interviewer's question ... and then some"
    k = key_of('a.js', long_span)
    if k == key_of('a.js', long_span[:120]):
        problems.append('THE RATCHET KEY IS NOT WHOLE-SPAN: a 120-character prefix hashes to the '
                        'same key as the full span, so everything past it is unguarded.')
    if k == key_of('b.js', long_span):
        problems.append('THE RATCHET KEY IS SITE-BLIND: the same span in another file takes the '
                        'same key, so one ratcheted mark excuses every future copy of itself -- '
                        'which is how a CSS star quietly excused a reinstated star span in JS.')

    # a DOUBLE-quoted JS literal, because long_span carries the apostrophe the fixture is about
    # and a single-quoted one would be terminated by it -- which js_literals correctly refuses to
    # guess past, and which silently emptied the first draft of these four fixtures
    two = ('var a = "<p>' + long_span + '</p>";\n'
           'var b = "<p>' + long_span + '</p>";\n')
    one = 'var a = "<p>' + long_span + '</p>";\n'
    kk = key_of('a.js', long_span)

    # (i) RULES INTERSECTION -- excused for `apostrophe`, still judged for `ellipsis`
    f, u, _n = sweep([('a.js', one)], {kk: {'rules': ['apostrophe'], 'count': 1}})
    if 'ellipsis' not in [r for _f, _l, r, _w, _k in f]:
        problems.append('THE RATCHET IS NOT INTERSECTED WITH ITS DECLARED RULES: an entry '
                        'declaring only "apostrophe" swallowed an ellipsis defect in the same '
                        'span, so an allowlisted span is exempt from ALL five rules -- which is '
                        'cycle 1\'s defect, and reverting main() to it left the gate GREEN.')
    if [r for _f, _l, r, _w, _k in f if r == 'apostrophe']:
        problems.append('THE RATCHET DOES NOT EXCUSE WHAT IT DECLARES: the entry declares '
                        '"apostrophe" and the sweep reported one anyway, so the list is not a '
                        'ratchet, it is a no-op and every entry in it is noise.')
    # (ii) THE COUNT GREW -- one entry, two sites
    _f, u2, _n = sweep([('a.js', two)], {kk: {'rules': ['apostrophe', 'ellipsis'], 'count': 1}})
    if not audit({kk: {'rules': ['apostrophe', 'ellipsis'], 'count': 1}}, u2)[2]:
        problems.append('THE COUNT IS NOT ENFORCED UPWARD: two sites under an entry excusing one '
                        'did not register as GREW, so one excused mark excuses every future copy '
                        'of itself inside the same file and "the class cannot grow" is false.')
    # (iii) THE DEBT SHRANK -- one entry declaring two sites, one site present
    _f, u3, _n = sweep([('a.js', one)], {kk: {'rules': ['apostrophe', 'ellipsis'], 'count': 2}})
    if not audit({kk: {'rules': ['apostrophe', 'ellipsis'], 'count': 2}}, u3)[3]:
        problems.append('THE COUNT IS NOT ENFORCED DOWNWARD: one site under an entry declaring '
                        'two did not register as SHRANK, so debt that was paid stays on the '
                        'books and the list drifts away from the tree it describes.')
    # (iv) STALE, and OVER-DECLARED -- an entry matching nothing, and a rule that no longer fires
    ghost = {'zzzzzzzzzzzzzzzz': {'rules': ['glyph'], 'count': 1},
             kk: {'rules': ['apostrophe', 'ellipsis', 'quote'], 'count': 1}}
    _f, u4, _n = sweep([('a.js', one)], ghost)
    st, ov, _g, _s = audit(ghost, u4)
    if 'zzzzzzzzzzzzzzzz' not in st:
        problems.append('THE STALE DETECTOR DOES NOT FIRE: an entry matching nothing in the tree '
                        'survived the audit, which is how a debt list turns into a permission '
                        'slip -- the entries outlive the defects and nobody is told.')
    if not [r for _k, r in ov if r == 'quote']:
        problems.append('THE OVER-DECLARED DETECTOR DOES NOT FIRE: a live entry declaring a rule '
                        'that no longer hits anything is dead debt on a live line, and it is how '
                        'an entry quietly widens to cover rules it was never argued for.')
    # ---- (v) THE CROSS-REFERENCE RESOLVER, BOTH WAYS (cycle 10, carried item 9) -------------
    # Two fixtures rather than one, because a resolver that flags EVERYTHING is as useless as a
    # resolver that flags nothing -- and this one runs over a 300KB stylesheet whose comments are
    # its argument, so a false positive would be paid for in deleted prose.
    ctl.append('a stylesheet comment citing a test file that DOES exist')
    live = ('/* the KEY arm in test/scoreboard_salience.cjs reads it, and test/home_claims.cjs\n'
            '   presses it; neither of these is a dead pointer. */\n.a{color:red}')
    if dead_xrefs('fixture.css', live, lambda p: True):
        problems.append('THE CROSS-REFERENCE RESOLVER FLAGGED A LIVE CITATION: it would red the '
                        'gate for naming a file that exists, so it gets turned off within the '
                        'hour and carried item 9 comes back.')
    dead = '/* measured by test/no_such_check.cjs, which is where the 4.79:1 comes from */\n.a{}'
    got = dead_xrefs('fixture.css', dead, lambda p: p != 'test/no_such_check.cjs')
    if not got:
        problems.append('THE CROSS-REFERENCE RESOLVER DOES NOT FIRE: a stylesheet comment citing '
                        'a test file that is not in the tree resolved clean, so the "references '
                        'that no longer resolve" half of carried item 9 is asserted by nothing.')
    # AND IT MUST READ COMMENTS ONLY. A CSS content: string or a url() naming a path is not a
    # citation, and flagging one would be the alt-text confusion this file already fixed once.
    if dead_xrefs('fixture.css', '.a::after{content:"test/nope.cjs"}', lambda p: False):
        problems.append('THE CROSS-REFERENCE RESOLVER READ OUTSIDE A COMMENT: it matched a path '
                        'inside a declaration, so it is scanning CSS rather than prose.')
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
    # .md IS IN SCOPE FOR THE GLYPH RULE ONLY (R8): 38 authored topic files, 447 non-ASCII runs,
    # of which two are outside OWNED. The four typeset rules stay OUT -- the compiler's
    # typographer owns those, which is why 15,703 raw apostrophes in that corpus are not defects.
    return [f for f in files
            if f.endswith(('.js', '.mjs', '.html', '.css', '.md'))
            and '/_generated/' not in f
            and '.generated.' not in f
            and '/visuals/' not in f]


def main():
    controls = []
    problems = self_test(controls)
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
    sources = tracked_sources()
    files = []
    for f in sources:
        path = os.path.join(ROOT, f.replace('/', os.sep))
        try:
            files.append((f, open(path, encoding='utf-8', errors='replace').read()))
        except OSError:
            continue
    # ONE sweep, ONE audit, and both are the functions the self-test presses -- see decide().
    findings, used, scanned = sweep(files, ruled)
    stale, over, grew, shrank = audit(ruled, used)

    # ---- THE CROSS-REFERENCE PASS, over every stylesheet in the tree (cycle 10, item 9) -----
    # Every CSS file, not just src/styles.css: the defect is "a comment cites an instrument", and
    # nothing makes that a property of one file. `exists` is asked of the real tree.
    def _resolves(rel):
        return os.path.exists(os.path.join(ROOT, rel.replace('/', os.sep)))
    xrefs = []
    for f, text in files:
        if f.endswith('.css'):
            xrefs.extend(dead_xrefs(f, text, _resolves))

    if REPORT:
        # THE INFORMATIONAL INDEX, REFRESHED BY THE THING THAT READS IT. `lines` is a pointer and
        # is not part of the key (line numbers move, and that must not break a ratchet) -- so
        # nothing enforced it, and cycle 2's had drifted 13-29 lines against the shipped file it
        # indexes. An index that cannot be enforced has to be REGENERATED, or it is a comment
        # that lies. Enforcing it instead was considered and rejected: it would red the gate for
        # inserting a line above a mark, which is a check that cries wolf.
        for k, ent in ruled.items():
            if k in used:
                ent['lines'] = sorted(set(used[k]['lines']))
        with open(ALLOW_FILE, 'w', encoding='utf-8', newline='\n') as fh:
            json.dump(allow, fh, indent=1, ensure_ascii=True)
            fh.write('\n')
        print('  (--report) refreshed the `lines` index of %d live entries in %s'
              % (len(used), os.path.relpath(ALLOW_FILE, ROOT)))

    def say(s):
        """print, on a console that cannot encode the marks this check is ABOUT.

        The win32 gate console is cp1252, so `print` of a U+21BB raises UnicodeEncodeError --
        which took the FAILURE branch down with a traceback instead of a report. The findings
        loop already had a guard; the stale/grew/shrank loops did not, so the one path that
        prints a ratcheted mark's own text was the one path that could crash. A check whose
        failure output cannot be printed has no failure output.
        """
        try:
            print(s)
        except UnicodeEncodeError:
            enc = getattr(sys.stdout, 'encoding', None) or 'ascii'
            print(s.encode(enc, 'backslashreplace').decode(enc))

    by_rule = {}
    for f, line, rule, what, key in findings:
        by_rule.setdefault(rule, []).append((f, line, what, key))

    print('=== CRAFT HYGIENE -- the typography the app prints ===')
    print('  copy spans scanned : %d, over %d authored source files (js/mjs/html/css/md)'
          % (scanned, len(sources)))
    print('  the GLYPH channel  : CHANNEL-FREE -- every contiguous non-ASCII run of every string')
    print('                       literal, every CSS content: string, every markdown line and')
    print('                       every HTML text/attribute run. Keyed at the MARK, bound to the')
    print('                       FILE, counted per site.')
    print('  the PROSE channels : markup between two tags, the HEAD run before a literal\'s first')
    print('                       tag, title|aria-label|placeholder|alt values, a text sink\'s')
    print('                       literals (.textContent/.innerText/.placeholder/.value and')
    print('                       setAttribute -- the WHOLE statement, not its first token), a')
    print('                       tagless whole sentence, and CSS content:. Four typeset rules,')
    print('                       behind the prose gate and the CODE gate. Markdown is OUT: the')
    print('                       compiler\'s typographer owns its apostrophes and dashes.')
    print('  ruled exceptions   : %d (all matched, at their declared sites and counts)' % len(ruled)
          if not (stale or over or grew or shrank)
          else '  ruled exceptions   : %d, %d STALE, %d over-declared, %d GREW, %d shrank'
          % (len(ruled), len(stale), len(over), len(grew), len(shrank)))
    for rule, _rx, why in RULES + [('glyph', None, 'a codepoint no face in --sans carries')]:
        rows = by_rule.get(rule, [])
        print('  %-11s %4d   %s' % (rule, len(rows), why))
        for f, line, what, key in rows[:8 if REPORT else 3]:
            say('       %s:%d  %r  in  %r' % (f, line, what, key[:70]))

    if stale:
        print('\n  STALE EXCEPTIONS -- these match nothing any more and must be deleted:')
        for k in stale[:10]:
            t = (ruled[k].get('text') or '')[:80]
            say('       %s  %s  %r' % (k, ruled[k].get('file', '?'), t))
    if over:
        print('\n  OVER-DECLARED RULES -- the span is still here, this rule is not:')
        for k, r in over[:10]:
            say('       %s  declares %r, which no longer fires' % (k, r))
    if grew:
        print('\n  THE CLASS GREW -- more sites than the entry excuses. Fix them, or argue for'
              '\n  the higher count in `why`; a ratchet that silently absorbs new sites is not one:')
        for k, ent, want, got in grew[:10]:
            say('       %s  %s  excuses %d, found %d  %r'
                % (k, ent.get('file', '?'), want, got, (ent.get('text') or '')[:40]))
    if shrank:
        print('\n  THE DEBT SHRANK -- fewer sites than declared, which is good news the file'
              '\n  has not been told. Lower the count (the list shortens without ceremony):')
        for k, ent, want, got in shrank[:10]:
            say('       %s  %s  excuses %d, found %d  %r'
                % (k, ent.get('file', '?'), want, got, (ent.get('text') or '')[:40]))

    if xrefs:
        print('\n  DEAD CROSS-REFERENCES -- a stylesheet comment cites an instrument that is not'
              '\n  in the tree. A citation nobody can follow reads as evidence and is not:')
        for f, line, p in xrefs[:10]:
            say('       %s:%d  cites %s' % (f, line, p))

    bad = len(findings) + len(stale) + len(over) + len(grew) + len(shrank) + len(xrefs)
    if bad:
        print('\nCRAFT HYGIENE: FAIL (%d violation(s), %d stale, %d over-declared, %d grew, '
              '%d shrank, %d dead cross-reference(s))'
              % (len(findings), len(stale), len(over), len(grew), len(shrank), len(xrefs)))
        return 1
    # BOTH FIGURES ARE DERIVED, NOT TYPED (cycle 5, judge item 6). The plant count reads the same
    # lists the self-test loops iterate -- so deleting a plant CHANGES THIS LINE, which is the one
    # thing cycle 4's hand-typed sum could not do -- and the control count is the length of the
    # roster self_test() appends to as each control actually runs.
    print('\n  %d planted defects detected in the self-test (three periods, a straight '
          'apostrophe, straight quotes, a hyphen doing a dash\u2019s job, a codepoint outside '
          'the app\u2019s own stack, a BARE glyph span with no prose around it, an unowned '
          'codepoint the app has never shipped, a glyph printed from CSS content:, a glyph at '
          'the TAIL of a concatenated literal, a glyph assigned through .textContent, one '
          'through setAttribute, one in a markdown file, a glyph in the FAR BRANCH of a ternary '
          'sink and one in the far branch of a ternary setAttribute -- the exact two shipped '
          'shapes cycle 3\u2019s first-token sink could not reach -- a straight apostrophe in '
          'the FAR BRANCH of a ternary text sink and another in a ternary setAttribute -- the '
          'two PROSE fixtures, and the only ones that press the widening rather than the glyph '
          'rule -- a spaced double hyphen and three periods in a SEPARATOR-ONLY literal, which '
          'every sentence-shaped bound in this file refused while 138 of them rendered on the '
          'home, all FOUR typeset rules pressed on a HEAD run, and a straight apostrophe in a '
          'TAGLESS sentence), plus %d negative controls -- %s, and the '
          'ratchet\u2019s own machinery driven through decide() and audit(): rules intersected, '
          'count enforced in BOTH directions, stale and over-declared entries caught, and the '
          'key whole-span and site-bound'
          % (len(PLANTS) + len(PLANTS_PRESSED) + len(CHANNEL_PLANTS),
             len(controls), ', '.join(controls)))
    print('CRAFT HYGIENE: PASS  (%d rendered-copy spans; the glyph rule CHANNEL-FREE over every '
          'string literal and the four typeset rules on six bounded prose channels; %d ruled '
          'exceptions, every one still matching something, each excused only from the rules it '
          'declares, only in the file it names, and only as many times as it declares; and every '
          '`test/...` instrument a stylesheet comment CITES resolves on disk -- %d citation(s) '
          'across %d stylesheet(s), pressed both ways so it can neither miss a dead pointer nor '
          'red a live one)'
          % (scanned, len(ruled), sum(len(list(XREF_RE.finditer(b))) for f, t in files
                                      if f.endswith('.css') for _l, b in comment_bodies(t)),
             len([1 for f, _t in files if f.endswith('.css')])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
