# Topic Contract

Adding a topic is pure content-filling: author the files below to the shape here,
then `npm run build && npm run gate`. The **`topic_contract` gate check**
(`test/topic_contract.cjs`) fails the build if a topic is malformed, so drift
cannot ship -- no redesign, no shared-file surgery.

## Files (13) in `src/topics/<name>/`
- **11 data slices**: `identity.js`, `walk.js`, `drill.js`, `wb.js`, `sys.js`,
  `trade.js`, `model.js`, `num.js`, `rf.js`, `open.js`, `bank.js`
- **`register.js`** -- `TopicRegistry.register({ id, identity, data:{...10 slices...} })`
- **`src/topics/<name>.js` bundle** -- 12 `@build:include` lines: the 11 slices
  then `register.js` LAST, with `drill.js` included BEFORE `bank.js`
- plus **one** `@build:include` line for the bundle in `src/scripts/app.js`

## `identity.js` -- required fields
`index`, `group`, `title`, `h1`, `locatorTail`, `thesis` (plus `sub`,
`companionTopic`, `spine[4]`, `cramTitle`, `reportTitle`, `cmpNotes`).
`group` MUST be one of the `TOPIC_GROUPS` ids in `src/scripts/app/groups.js`:
`messaging-events`, `data-storage`, `reliability-observability`,
`platform-infra`, `architecture-apis`, `security-tenancy`.

## `drill.js` -- cards
An array of **>= 18 cards** (target 21). Each card `{ tier, signal, q, a, f, senior }`.
Tiers: the three **core tiers** `SDE2` / `SDE3` / `Staff` must each have **>= 3**
cards (canonical split 5 / 11 / 5); `EXTEND` is an allowed extra tier. Every card
needs a `signal` and a `q`.

## `sys.js` -- pivot cross-refs
A pivot chip becomes a one-click jump when its text carries a `(N)` index
(N = a topic's `identity.index`) OR contains another topic's exact title. Chips
for not-yet-built topics stay plain text -- that's fine.

## Enforced by the gate
`npm run gate` runs `topic_contract`, which asserts all of the above for every
registered topic. A missing slice, missing identity field, non-existent group,
too few cards, or a missing core tier fails the build and names the offending
topic. Adding a topic to a group is automatic: the grouped nav, index overlay,
cross-topic search, group colour, and locator all pick it up from `identity.group`.
