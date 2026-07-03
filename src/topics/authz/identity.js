/* ============ topics/authz/identity.js -- topic 3 (Tenant Authorization) ============
   The switchable light-DOM identity for topic 3, same contract as topic 1's
   TOPIC_CP_IDENTITY. applyIdentity() rewrites the locator / h1 / sub / thesis /
   spine / cram title / companion notes from this object on every switch. Grounded
   in the ICS / Invenco multi-tenant platform (50k+ terminals, Cognito tenant claim
   via a Lambda authorizer, DynamoDB LeadingKeys, shared data-access layer that
   injects the tenant predicate). Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_AUTHZ_IDENTITY = {
  index: 3,
  total: 8,
  locatorTail: 'access boundary',
  title: 'Tenant Authorization',
  h1: 'Tenant Authorization',
  sub: '<b>The authorization flow</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the access boundary sits, and the pivots an interviewer rides from a token into predicates, isolation models, and the confused-deputy attack.',
  companionTopic: 'Tenant Authorization',
  thesis: 'The layer that keeps one tenant out of another&rsquo;s data &mdash; identity from the verified token, scope injected into every query, deny-by-default so a forgotten filter fails loud.',
  spine: [
    'Tenant identity comes from the <b>verified token</b>, never client input &mdash; the claim is trusted because the token is signed.',
    'Authorization is a <b>query predicate</b>, not a one-time gate &mdash; the tenant scope is injected into every read and write.',
    '<b>Deny-by-default</b> &mdash; no tenant context throws, it never runs unscoped; a forgotten filter fails loud, not silent.',
    'A cross-tenant read returns <b>404, not 403</b> &mdash; a 403 would leak that the object exists.'
  ],
  cramTitle: 'Tenant Authorization',
  reportTitle: 'Tenant Authorization',
  cmpNotes: {
    walk: ['The authorization flow', 'Token to audit, one step at a time \u2014 the mechanics you narrate before anyone cuts in.', 'Say the reframe out loud \u2014 \u201Cauthorization isn\u2019t a gate we check, it\u2019s a predicate we inject into every query.\u201D That line is the whole design.'],
    drill: ['Probe Drill', 'Graded follow-ups on the trusted claim, isolation models, and the confused-deputy attack \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to an answer before you reveal \u2014 name the attack you\u2019re defending against (IDOR / BOLA), not just the mechanism.'],
    wb: ['Whiteboard', 'Rebuild the whole enforcement chain from memory \u2014 the cues, nothing in front of you.', 'Draw the boundary first \u2014 the request on one side, the tenant\u2019s data on the other, the verified claim crossing once. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: authorization sits between the identity that proves who you are and the data layer that enforces what you can touch.', 'Lead with the boundary, not the boxes \u2014 \u201Cthe token proves identity, the data layer enforces scope, the database is the backstop.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 silo vs pool, RLS vs app-layer, RBAC vs ABAC \u2014 each with the switch condition.', 'Always say \u201Cpick when\u201D \u2014 name the constraint that flips the choice, never defend one isolation model as universally right.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Cidentity from the token, scope in every query\u201D), then the one attack you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the isolation math \u2014 and know the blast radius of a single missing filter.', 'Lead with the blast radius \u2014 one forgotten WHERE exposes every other tenant\u2019s rows, and the tenant-leading index is what makes the scoped query fast.'],
    rf: ['Red Flags', 'What sinks the round \u2014 trusting a client-supplied tenant id, checking authz per endpoint, a 403 that leaks existence \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Ctrusts the client\u2019s tenant id\u201D is the fastest no-hire in a security round.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the access boundary, not the JWT library, and land on isolation-at-every-layer as the real hard part.']
  }
};
