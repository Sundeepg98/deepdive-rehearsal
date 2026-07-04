/* ============ topics/desired-state/identity.js -- topic 7 (Desired State) ============
   Switchable light-DOM identity for topic 7, same contract as topic 1's TOPIC_CP_IDENTITY.
   applyIdentity() rewrites locator / h1 / sub / thesis / spine / cram title / companion
   notes on every switch. Grounded in the ICS desired-state reconciler (three-state model:
   desired/deployed/reported SHA-256 hashes; hash of RENDERED output not template version;
   4-level hierarchical resolution tenant->site->tag->device storing every level; event-driven
   calculate->render->diff->deploy->report; per-tenant distributed lock; maintenance windows).
   Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_DS_IDENTITY = {
  index: 7,
  total: 8,
  locatorTail: 'convergence boundary',
  group: 'platform-infra',
  title: 'Desired State',
  h1: 'Desired State',
  sub: '<b>The reconciliation loop</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the convergence boundary sits, and the pivots an interviewer rides from a drift check into hashing, hierarchical resolution, and the lock.',
  companionTopic: 'Desired State',
  thesis: 'A desired-state reconciler that keeps a fleet converged &mdash; three hashes (desired, deployed, reported), drift as any mismatch, and an event-driven loop that renders, diffs, and deploys under a per-tenant lock &mdash; so config intent becomes running reality and stays there.',
  spine: [
    '<b>Three hashes, not one</b> &mdash; desired (what config should be), deployed (what we last pushed), reported (what the device says it runs). Drift is any mismatch, and <i>which pair</i> differs localizes the fault.',
    'The hash is of the <b>rendered output, not the template version</b> &mdash; a config&rsquo;s identity is the SHA-256 of its fully-resolved bytes, so a template bump that changes nothing isn&rsquo;t drift, and a value change that alters output is.',
    'Desired config is <b>resolved through a hierarchy</b> &mdash; tenant &rarr; site &rarr; tag &rarr; device, each level overriding the last &mdash; and every level is stored, so you can always explain where a value came from.',
    'Convergence is an <b>event-driven loop under a lock</b> &mdash; calculate &rarr; render &rarr; diff &rarr; deploy &rarr; report, guarded by a per-tenant distributed lock and gated by maintenance windows, so reconcilers don&rsquo;t fight and deploys land when they&rsquo;re allowed to.'
  ],
  cramTitle: 'Desired State',
  reportTitle: 'Desired State',
  cmpNotes: {
    walk: ['The reconciliation loop', 'Resolve, render, hash, diff, deploy, report \u2014 one turn of the loop, the mechanics you narrate before anyone cuts in.', 'Say the three-hash line out loud \u2014 \u201Cdesired, deployed, reported; drift is any mismatch, and which pair differs localizes the fault.\u201D That\u2019s the whole model.'],
    drill: ['Probe Drill', 'Graded follow-ups on the three-hash model, rendered-not-template hashing, hierarchical resolution, and the lock \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to the invariant before the mechanism \u2014 \u201Cthe system converges reported to desired\u201D \u2014 not just \u201Cwe push config to devices.\u201D'],
    wb: ['Whiteboard', 'Rebuild the desired / deployed / reported triangle and the resolve \u2192 render \u2192 diff \u2192 deploy \u2192 report loop from memory \u2014 the cues, nothing in front of you.', 'Draw the three hashes first, then the arrows that drive them together. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: the reconciler sits between config intent and fleet reality, driving one toward the other continuously.', 'Lead with convergence, not the boxes \u2014 \u201Cdesired is the goal, reported is reality, the loop closes the gap.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 hash rendered vs template, poll vs push reporting, level- vs edge-triggered, lock scope \u2014 each with the switch condition.', 'Always say \u201Cconverge, don\u2019t command\u201D \u2014 the reconciler drives toward a goal state, it doesn\u2019t fire one-shot commands and hope.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Cthree hashes, rendered output, converge under a lock\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the reconciler \u2014 and know which number sets how often the loop can run.', 'Lead with the reconcile rate \u2014 devices \u00D7 check-in frequency is the load the loop and the lock have to absorb.'],
    rf: ['Red Flags', 'What sinks the round \u2014 hashing the template, commanding not converging, no lock, drift you can\u2019t see \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Ctwo reconcilers deploying the same device at once\u201D is the fastest no-hire in the room.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the convergence boundary, not the loop, and land on drift-detection and the lock as the real hard parts.']
  }
};
