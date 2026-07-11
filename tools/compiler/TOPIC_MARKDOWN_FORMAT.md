# Topic Markdown Format

Author-facing reference for writing a topic as a single markdown file. The
compiler (`tools/compiler/`) parses this format and emits the 13-file topic
structure documented in `TOPIC_CONTRACT.md`. This file documents the **input**;
`TOPIC_CONTRACT.md` documents the **output**.

## Overview

A topic can be authored as one file, `src/topics-md/<id>.md`. At build time the
Vite plugin `compileTopicsPlugin`:

1. parses the markdown to a topic object,
2. validates it (zod) and fails the build with a precise error if it's malformed,
3. renders any `mermaid` fenced block (and any `$...$` / `$$...$$` LaTeX) to inline SVG,
4. emits the per-slice `.js` files into `src/topics/<id>/`,
5. generates the include bundle `src/topics/<id>.js`,
6. generates the single ordered registration partial `src/topics/_generated-registry.js`.

Order and total are derived from each file's frontmatter `index` (files are
sorted by it) -- nothing is hardcoded. Dropping a `.md` in `src/topics-md/` with
a frontmatter `index` is all the wiring a new topic needs.

The generated slices, bundle, and registry are build artifacts. The registry is
gitignored (like `src/tokens.generated.css`); the build regenerates it, so a
fresh clone builds correctly with no committed registry.

## Frontmatter (YAML)

Required: `id`, `prefix`, `group`, `title`, `locatorTail`, `index`.
Optional: `h1` (defaults to `title`), `total`, `cramTitle` / `reportTitle` /
`companionTopic` (each default to `title`).

- `id` -- kebab-case topic id; also the filename and the emitted directory name.
- `prefix` -- UPPERCASE token used in the emitted global names (e.g. `NOTIF` ->
  `TOPIC_NOTIF_IDENTITY`, `TOPIC_NOTIF_WALK`, ...).
- `group` -- one of the six taxonomy groups (see Drill rules below).
- `title` -- display title.
- `locatorTail` -- sidebar locator suffix; the locator renders as
  `group-label - locatorTail`.
- `index` -- 1-based position. Drives build order and the System-pane `(N)`
  pivot-jump resolution, so it must be unique across topics.

Example:

    ---
    id: notifications
    prefix: NOTIF
    group: messaging-events
    title: Notifications
    locatorTail: delivery boundary
    index: 5
    ---

## Prose

Body text is rendered with markdown-it inline: `**bold**`, `*italic*`,
`` `code` ``, `[link](url)`. Three hyphens `---` become an em-dash. (Companion
Notes bodies are plain text, not inline markdown.)

### Math (LaTeX)

Inline math is `$...$` and a centered display equation is `$$...$$`, both usable
anywhere prose is rendered (thesis, spine, drill answers, the Numbers tell, ...).
LaTeX is rendered to a **self-contained inline SVG at build time** (MathJax) --
glyphs as vector paths with `currentColor` and `ex` sizing, so a formula inherits
the surrounding text's color and size and ships with no web fonts and nothing at
runtime (the same model as `mermaid` -> SVG). The full TeX package set is
available (`\frac`, `\sum`, `O(\log n)`, Greek, ...).

The inline form requires a non-space character just inside each `$`, so ordinary
currency is never mistaken for math: `$5`, `$5 to $9`, and a lone `$` are left
untouched. Write `$R + W > N$`, not `$ R + W > N $`.

## Identity sections

### `## Thesis`

One paragraph -> `identity.thesis`.

### `## Sub`

One paragraph -> `identity.sub`.

### `## Spine`

A bullet list (four items) -> `identity.spine[]`.

    ## Spine

    - Fan-out **at the boundary** --- producers emit `notify(user, event)`.
    - Exactly-once by **idempotency** --- a deterministic id plus a dedup store.
    - Two channels, one **fallback** --- in-app default, email backup.
    - A **row per recipient** --- ~100-byte rows with a partial unread index.

### `## Companion Notes`

Per view, a `### <view>` sub-heading followed by exactly three paragraphs ->
`cmpNotes[view] = [title, desc, tip]` (plain text). `<view>` is a pane key
(`walk`, `drill`, ...).

    ## Companion Notes

    ### walk

    The delivery flow

    Event to seen-by-the-user, one step at a time.

    Say the split out loud before anyone cuts in.

## View sections

Each `## <Heading>` maps to one view. **All view panes are required** -- the app
has a tab for every one, so omitting a pane is rejected at compile time (it would
otherwise render blank and throw when its tab is first clicked).

| Heading            | View  |
| ------------------ | ----- |
| `## Walk`          | walk  |
| `## Drill`         | drill |
| `## Whiteboard`    | wb    |
| `## System`        | sys   |
| `## Trade-offs`    | trade |
| `## Model Answers` | model |
| `## Numbers`       | num   |
| `## Red Flags`     | rf    |
| `## Opener`        | open  |
| `## Bank`          | bank  |

A `## <Heading>` that is not in this table (or the identity set) throws
`unknown section heading(s)` at parse time -- so a typo like `## Tradeoffs` is
caught, never silently dropped.

### `## Walk`

Per step: `### <step title>`, then a fenced `flow` diagram, then prose. The first
paragraph is `ins`; a paragraph before any fenced code block is `deep`; the
paragraph immediately after a code block is that block's caption (`cap`). A step
may carry a fenced `flow` or `mermaid` diagram, and **one or more** code blocks --
a second code block and its caption are kept (they render into the same "See the
code" disclosure), not silently dropped in favour of the last.

Code fences are highlighted by language. `js`/`ts` (or an unlabelled fence) use
the minimal highlighter, where the author marks the tokens the eye should land on
with `==emphasis==` (no grammar highlighter can infer those). Other languages --
`sql`, `yaml`, `bash`, `json`, `python`, `go` -- are highlighted by Shiki with a
full grammar, themed to match the app's code palette so a SQL or YAML block looks
native next to a JS one. Both render into the same `pre.code` container.

    ## Walk

    ### The producer emits an event

    ```flow
    n[service] -> p[notify(user, event)] -> t[request] . a[knows no channels]
    ```

    A producer calls `notify(user, event)` and stops there.

    This is the boundary that keeps channel logic on one side.

    ```ts
    const id = sha256(`${userId}:${eventId}:${channel}`);
    ```

    The id is content-derived, so a retry collides.

Optionally, a `### Model Script` heading ends the steps and begins the spoken
model-answer beats -- a bullet list where each `<label> | <spoken text>` is a
beat, a bullet starting `Interviewer:` is the interviewer's interjection, and
the last beat is automatically the closing answer (`ans`). The walk pane's
model-answer view renders these; omit the section and that view is simply empty.

    ### Model Script

    - Frame it | "A producer emits an event; the system owns delivery."
    - Interviewer: "A retry double-sends. How?"
    - Trace the key | "The idempotency key wasn't applied on the send path."

### `## Drill`  (required)

Optional tier notes first -- one `<tier> | <note>` **per line** (a bullet list of
the same items is also accepted) -- then one card per `### <tier> | <signal>`.
The first paragraph under a card is the question, the second is the answer.
Optional per-card lines: `Follow: <q>` (answer on the next line or the following
paragraph), `Senior: <text>`, `Speak: <text>`. These labelled lines may sit
directly beneath one another with no blank line between them; each owns its own
line(s).

The tier key `all` is the note shown on the drill LANDING view, before any tier is
picked -- the hand-coded topics all carry it. Omit it and the pane falls back to a
generic line. (This example shipped without `all` for months, so all 38 compiled
topics are missing it; the drill pane used to render the literal word "undefined"
there.)

    ## Drill

    all | All four levels, mixed --- the way a real loop actually comes at you
    SDE2 | baseline mechanics
    SDE3 | failure modes
    Staff | organizational leverage

    ### SDE2 | idempotency basics

    How do you stop a retry from double-sending?

    Compute a deterministic id and dedup on it.

    Follow: what makes the id deterministic?
    It is content-derived: hash(user, event, channel).

    Senior: name the delivery guarantee, not the queue.
    Speak: commit to an answer before revealing.

Rules (enforced by validation):

- at least 18 cards (target 21);
- tiers `SDE2` / `SDE3` / `Staff` each appear at least 3 times (canonical 5 / 11 / 5);
- `group` (frontmatter) is one of: `messaging-events`, `data-storage`,
  `reliability-observability`, `platform-infra`, `architecture-apis`,
  `security-tenancy`.

### `## Whiteboard`

An optional lead paragraph becomes `sub`. Per cue: `### <cue>` plus an answer
paragraph. A fenced `mermaid` block renders to inline SVG at build; any other
fenced block is kept verbatim as the diagram. `Foot: <text>` and
`Verdict: <text>` set the footer and verdict.

    ## Whiteboard

    Sketch the delivery path end to end.

    ### Where does dedup sit?

    Before any send, keyed by the deterministic id.

    ```mermaid
    flowchart LR
      A["notify(user, event)"] --> B[dedup]
      B --> C[in-app]
      B --> D[email]
    ```

    Verdict: one write path, two channels.

### `## System`

An intro paragraph. The first `### <heading>` opens the "where it sits" stages:
one `<n>: <d>` **per line**, with a trailing `[*]` marking the current stage (a
bullet list of the same `<n>: <d>` items is also accepted). The second
`### <heading>` opens the pivots: an optional sub paragraph, then per pivot a
`#### <question>` carrying a `-> <chip>` line with **the answer on the next
line**. A pivot chip becomes a jump when its text contains a `(N)` index or
another topic's title.

The chip is a short LABEL, not a sentence -- the hand-coded topics run 8-39
characters. Long chips wrap rather than crop, but they crowd the question.

    ## System

    Zoom out to where this sits.

    ### Where it sits

    Producers: emit events
    Notification service: channels + delivery [*]
    Channels: in-app, email

    ### Pivots an interviewer rides

    From a notification they push on guarantees.

    #### How do you guarantee delivery?

    -> at-least-once + idempotent
    At-least-once from the queue; dedup makes it effectively once.

### `## Trade-offs`

A lead paragraph. Per decision: `### <question>` (any ` vs ` becomes a styled
span), a bullet list of `<name>: <when>` options, then a paragraph = `tell`.

    ## Trade-offs

    The calls that separate levels.

    ### At-least-once vs exactly-once

    - At-least-once: simple, needs idempotent consumers
    - Exactly-once: expensive, rarely worth it

    Prefer at-least-once plus a dedup store.

### `## Model Answers`

Per answer: `### <selector> | <opener>`, an optional sub paragraph, then beat
bullets `<l> | <c> | <t>` where `<c>` is a CSS class name.

    ## Model Answers

    ### idempotency | The core guarantee

    How I frame it under time pressure.

    - Deterministic id | key | hash(user, event, channel)
    - Dedup store | store | SET NX with a TTL

### `## Numbers`

A lead paragraph, then a "tell" paragraph, then a bullet list of inputs
`<id> | <label> | <value> | <min> | <step?>`, then a fenced block holding a
compute **function expression** -- `function (vals, fmt) { ... }`. It is emitted
verbatim as the `compute` value, so it must be a function, not a bare `return`.
`vals` is an object keyed by input id (`vals.users`); `fmt.n(x)` formats a
number. It returns an array of metric rows `{ k, v, u, n, over }` -- `k` label,
`v` formatted value, `u` unit, `n` note, `over` true to flag a ceiling. Use
`\uXXXX` for non-ASCII inside its strings (e.g. `\u2014` for an em-dash).

    ## Numbers

    Back-of-envelope the storage.

    Each notification is a row; unread gets a partial index.

    - users | Users | 1000000 | 0 | 1000
    - perUser | Notifications/user | 100 | 0 | 10

    ```js
    function (vals, fmt) {
      var rows = vals.users * vals.perUser;
      return [
        { k: 'Rows', v: fmt.n(rows), u: 'rows', n: 'one row per notification', over: false },
        { k: 'Storage', v: fmt.n(Math.round(rows * 100 / 1e9)), u: 'GB', n: 'at ~100 bytes/row', over: false }
      ];
    }
    ```

### `## Red Flags`

A lead paragraph. Per flag: `### <bad phrasing>`, first paragraph = `tell` (why
it is bad), second = `fix`, optional `Note: <text>`.

    ## Red Flags

    What makes an interviewer wince.

    ### "I'll just call SES from each service"

    Scatters channel logic across every producer.

    Emit a domain event; the notification system owns delivery.

    Note: adding a channel should be one change, not fleet-wide.

### `## Opener`

The first `### <k> | <t>` is the open card; subsequent ones are close cards.
Each card has a lead paragraph, `#### <item heading>` items (auto-numbered) each
with an answer paragraph, an optional `##### Hooks` sub-section (a lead paragraph
plus `<q> | <d> | <tab>` bullets), and `Foot: <text>`.

    ## Opener

    ### 30s | The one-liner

    How I open when asked to design notifications.

    #### What is the boundary?

    Producers emit events; the system owns channels.

    ##### Hooks

    Where an interviewer usually pushes.

    - Guarantees? | delivery-once | drill
    - Fan-out? | channel routing | walk

    Foot: keep it to two sentences.

### `## Bank`

Mock-interview beats. `### <tag> | <cue>` (or `### <tag> | <theme> | <cue>`) per
beat, each with `Task: <text>`, `Model: <text>`, `Int: <q>` (answer on the next
line), and `Int2: <q>` (answer on the next line). A `### Frames` heading switches
to frame bullets; a heading whose text contains `Curveball` switches to curveball
beats (`### CURVEBALL | <theme> | <cue>`).

    ## Bank

    ### SCALE | A million notifications a day

    Task: size the storage and the read path.
    Model: ~100-byte rows, partial index on unread.
    Int: what dominates cost?
    Storage, not compute.

    ### Extra Curveballs

    ### CURVEBALL | outage | The dedup store is down -- now what?

    Model: fail open with a short TTL, reconcile later.

    ### Frames

    - Delivery guarantee first, mechanism second
    - One boundary, many channels

## Fenced blocks

- **`flow`** -- a small flow-diagram DSL. `a[label] -> b[label]` chains nodes;
  ` . ` marks an aside; ` / ` marks a branch. A node id is the token in front of
  `[...]`.
- **`ts`** (or another language) -- a code block. Wrap a span in `==...==` to
  emphasize it in the rendered output; comments and keywords are highlighted
  automatically.
- **`mermaid`** -- rendered to inline SVG at build time (Playwright + mermaid),
  available in Walk steps and the Whiteboard. Quote any label containing special
  characters, e.g. `B["notify(user, event)"]`, or mermaid parsing fails.

## Conservation: the compiler never drops what you wrote

**Nothing you author is discarded.** If the compiler cannot place a line, it
**stops the build** and names the pane, the source line and the fix -- it does not
compile two-thirds of your topic and say nothing.

This is a rule with a history. Until 2026-07-11 the parser demanded a bullet list
for System stages and Drill tier notes while this document's own worked examples
wrote them as plain lines, and it matched a `Task:` / `Senior:` / `-> ` prefix and
then swallowed every line beneath it into that one field. **571 authored items --
189 system-map stages, 114 tier notes, 76 pivot answers, 76 bank model answers, 76
interviewer questions, a code block and its caption -- were destroyed on every
build, silently, while the gate reported 19/19 green.** The tests could not see it
because each compared the parser against a fixture trimmed to the panes that
happened to work, or against the parser's own output.

Two checks now hold references the compiler cannot influence, and they run on
every build:

- **`compiler_conservation`** (`tools/compiler/prove_conservation.mjs`) -- the
  reference is **your raw bytes**. A line scanner reads `src/topics-md/*.md`
  without importing the parser, and four laws must hold: every authored item is
  emitted (COUNT), every authored text survives somewhere in the output
  (SURVIVAL), no single-value field contains a newline -- i.e. no field swallowed
  the next (FUSION), and a value parsed from a structured heading equals what you
  wrote (VALUE).
- **`compiler_doc_examples`** (`tools/compiler/prove_doc_examples.mjs`) -- the
  reference is **the worked examples in this file**. Every example below is fed to
  the real parser and must survive intact. If this document and the parser ever
  disagree again, the build fails and names the example. What you are told to copy
  is guaranteed to compile.

So the format is defined by the examples, and the examples are executable.

## Validation

Every topic is validated at compile time (zod). A failure throws with the topic
id and the failing field path, before any files are written. Enforced:

- identity fields present and non-empty; `group` one of the six;
- `index` and `total` positive integers;
- all nine non-drill view panes present (a missing one is named in the error);
- drill has at least 18 cards, with each core tier (SDE2 / SDE3 / Staff) at least 3;
- the render-critical view arrays are arrays -- `walk.steps`, `sys.stages` /
  `sys.pivots`, `model.selectors`, `num.inputs`, `rf.flags`, `open.cards`,
  `bank.mockBeats` / `curveballs` / `frames`, and `opts` on each trade decision;
- the Numbers compute is a function expression, not a bare `return` body;
- an unknown `## <Heading>` throws `unknown section heading(s)` listing the valid
  headings (catches typo'd panes that zod alone would miss).

## Build integration

- `src/topics-md/<id>.md` -> slices in `src/topics/<id>/`, a bundle
  `src/topics/<id>.js`, and one entry in `src/topics/_generated-registry.js`
  (ordered by `index`). `app.js` includes the registry once.
- The registry is generated at `buildStart` and gitignored; the build
  regenerates it every time.
- The gate (`python3 test/check_all.py`) runs the compiler proof tests. Two hold
  an INDEPENDENT reference and are the only ones able to detect a silent drop:
  `compiler_conservation` (your raw bytes) and `compiler_doc_examples` (this
  file's examples). `compiler_md` compares the parser against the hand-coded
  `notifications` topic across **all ten panes** and fails if the fixture stops
  exercising one -- a pane the fixture omits is a pane the test is blind to, which
  is how 23 green assertions once coexisted with a compiler that dropped a third
  of every topic. `compiler_prose` / `compiler_flow` / `compiler_code` pin the
  Layer B/C renderers.
  `compiler_emit_serializer` round-trips the parser against ITSELF and
  `compiler_legacy_topic` exercises the `.topic` parser (zero shipping topics
  use it): neither can detect a parser bug, and they are named so nobody reads
  them as if they could. **Never add a compiler check whose expected value comes
  from the compiler.**

## The eight existing hand-JS topics

The eight topics that predate this pipeline (content-pipeline, signing, authz,
aws-hardening, notifications, eav, desired-state, iac) are still authored as hand
-written JS slices with manual bundles and `app.js` includes. Migrating them to
markdown is a separate effort; new topics should use this markdown format.
