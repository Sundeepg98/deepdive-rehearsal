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
3. renders any `mermaid` fenced block to inline SVG,
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

Each `## <Heading>` maps to one view. Only `## Drill` is required; omitting any
other pane simply omits its slice from the bundle.

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
paragraph is `ins`; the paragraph immediately before a fenced code block is
`deep`; the paragraph immediately after it is `cap`. A step may carry a fenced
`flow`, `ts`, or `mermaid` block.

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

Optional tier-note bullets first (`<tier> | <note>`), then one card per
`### <tier> | <signal>`. The first paragraph under a card is the question, the
second is the answer. Optional per-card lines: `Follow: <q>` (answer on the next
line or the following paragraph), `Senior: <text>`, `Speak: <text>`.

    ## Drill

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
bullets `<n>: <d>`, with a trailing `[*]` marking the current stage. The second
`### <heading>` opens the pivots: an optional sub paragraph, then per pivot a
`#### <question>` carrying a `-> <chip>` line and an answer paragraph. A pivot
chip becomes a jump when its text contains a `(N)` index or another topic's
title.

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

## Validation

Every topic is validated at compile time (zod). A failure throws with the topic
id and the failing field path, before any files are written. Enforced:

- identity fields present and non-empty; `group` one of the six;
- `index` and `total` positive integers;
- drill has at least 18 cards, with each core tier (SDE2 / SDE3 / Staff) at least 3;
- an unknown `## <Heading>` throws `unknown section heading(s)` listing the valid
  headings (catches typo'd panes that zod alone would miss).

## Build integration

- `src/topics-md/<id>.md` -> slices in `src/topics/<id>/`, a bundle
  `src/topics/<id>.js`, and one entry in `src/topics/_generated-registry.js`
  (ordered by `index`). `app.js` includes the registry once.
- The registry is generated at `buildStart` and gitignored; the build
  regenerates it every time.
- The gate (`make check`) runs the compiler proof tests -- `compiler_md`,
  `compiler_emit`, `compiler_assembly`, `compiler_prose`, `compiler_flow`,
  `compiler_code` -- so a parser or emitter regression fails the build.

## The eight existing hand-JS topics

The eight topics that predate this pipeline (content-pipeline, signing, authz,
aws-hardening, notifications, eav, desired-state, iac) are still authored as hand
-written JS slices with manual bundles and `app.js` includes. Migrating them to
markdown is a separate effort; new topics should use this markdown format.
