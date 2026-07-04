/* ============ topics/eav/identity.js -- topic 6 (Attribute Store / EAV) ============
   The switchable light-DOM identity for topic 6, same contract as topic 1's
   TOPIC_CP_IDENTITY. applyIdentity() rewrites the locator / h1 / sub / thesis /
   spine / cram title / companion notes from this object on every switch. Grounded
   in the ICS device-attribute store (3-table EAV: definition/entity_value/group,
   COALESCE(override,default) resolution, JSON-Schema validation, secret masking +
   KMS, is_staged staging, searchable composite partial index, CSV import, CDC).
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_EAV_IDENTITY = {
  index: 6,
  total: 8,
  locatorTail: 'attribute boundary',
  title: 'Attribute Store',
  h1: 'Attribute Store',
  sub: '<b>The attribute flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the attribute boundary sits, and the pivots an interviewer rides from a flexible attribute into typing, resolution, and the EAV tax.',
  companionTopic: 'Attribute Store',
  thesis: 'A schema-flexible attribute store &mdash; per-device config as rows, not columns &mdash; so a new setting is a definition row, not a migration; typed and JSON-Schema-validated at write, resolved as override-over-default.',
  spine: [
    'Attributes are <b>rows, not columns</b> &mdash; a new setting is a definition row, so product adds config without a schema migration and a deploy.',
    'A <b>definition / value split</b> &mdash; the definition holds the schema (name, type, default, validation); the value table holds per-entity overrides. A device&rsquo;s value is <code>COALESCE(override, default)</code>.',
    'Schemaless in shape, <b>typed and validated</b> in substance &mdash; every attribute has a type and a JSON-Schema checked at write, and secrets are masked and KMS-encrypted.',
    'The <b>EAV tax</b> &mdash; flexibility is bought with query complexity: reconstructing an entity is a pivot, and searchability needs a composite partial index. You choose EAV on purpose, not by default.'
  ],
  cramTitle: 'Attribute Store',
  reportTitle: 'Attribute Store',
  cmpNotes: {
    walk: ['The attribute flow', 'Define an attribute, then resolve a device&rsquo;s value, one step at a time \u2014 the mechanics you narrate before anyone cuts in.', 'Say the split out loud \u2014 \u201Ca new setting is a definition row, not a schema migration; the value is override-over-default.\u201D That line is the whole design.'],
    drill: ['Probe Drill', 'Graded follow-ups on the EAV tax, typing, resolution, and validation \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit before you reveal \u2014 name the trade you\u2019re making (flexibility for queryability), not just \u201Cwe store attributes in a table.\u201D'],
    wb: ['Whiteboard', 'Rebuild the definition / value / resolution path from memory \u2014 the cues, nothing in front of you.', 'Draw the two tables first \u2014 definition on one side, per-entity value on the other, COALESCE across them. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: the attribute store sits between a fixed schema and the per-device config that changes faster than migrations can keep up.', 'Lead with the boundary, not the boxes \u2014 \u201Ca new setting is a row, not a migration, and the value resolves override-over-default.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 EAV vs JSON vs real column, typed vs stringly, validate-on-write vs read \u2014 each with the switch condition.', 'Always say \u201Cpick when\u201D \u2014 name the constraint that flips the choice, never defend EAV as universally right; it\u2019s a tax you pay on purpose.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Crows not columns, override-over-default, typed\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the attribute store \u2014 and know which number makes the reconstruction pivot the ceiling.', 'Lead with the row count \u2014 entities \u00D7 attributes is the EAV row explosion, and that\u2019s what makes the reconstruction query expensive.'],
    rf: ['Red Flags', 'What sinks the round \u2014 EAV for everything, stringly-typed values, no validation, the pivot N+1 \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Cwould turn one entity read into N queries\u201D is the fastest no-hire in the room.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the attribute boundary, not the table, and land on the EAV tax and typing as the real hard parts.']
  }
};
