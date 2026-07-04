/* ============ topics/iac/identity.js -- topic 8 (Infrastructure as Code) ============
   Switchable light-DOM identity for topic 8, same contract as topic 1's TOPIC_CP_IDENTITY.
   applyIdentity() rewrites locator / h1 / sub / thesis / spine / cram title / companion notes
   on every switch. Grounded in the Invenco AWS estate managed as code (Terraform/CDK):
   declarative resource graph, remote+locked+encrypted state (S3 backend + DynamoDB lock table),
   plan-before-apply, drift detection (the deploy-time cousin of topic 7's reconciler), construct
   levels (L1/L2/L3) and modules, provider abstraction. Offline-safe; 7-bit ASCII. */
var TOPIC_IAC_IDENTITY = {
  index: 8,
  total: 8,
  locatorTail: 'provisioning boundary',
  group: 'platform-infra',
  title: 'Infrastructure as Code',
  h1: 'Infrastructure as Code',
  sub: '<b>The provision loop</b> &rarr; <b>graded follow-up chains</b> &rarr; <b>whiteboard</b> &rarr; <b>zoom out</b> to where the provisioning boundary sits, and the pivots an interviewer rides from a plan/apply question into state, locking, drift, and abstraction levels.',
  companionTopic: 'Infrastructure as Code',
  thesis: 'Infrastructure as code &mdash; declare the desired shape of your infrastructure, let the tool build a dependency graph and diff it against a locked, remote state file, then apply the plan &mdash; so provisioning is reviewable, repeatable, and drift is detectable, instead of clicking through a console and hoping.',
  spine: [
    '<b>Declare infrastructure, don&rsquo;t script it</b> &mdash; you write the desired end state (resources and their relationships), and the tool builds a dependency graph and computes the create / update / delete order. The same converge-not-command idea as a reconciler, applied to cloud resources.',
    '<b>State is the source of truth</b> &mdash; a state file maps your config to real resource IDs, so the tool knows what exists. It must be remote, <b>locked</b> (so two applies don&rsquo;t corrupt it), and encrypted (it holds secrets).',
    '<b>Plan before apply</b> &mdash; apply is two-phase: compute the diff (what will create, change, destroy), review it, then execute. That same diff against reality detects <b>drift</b> &mdash; declared vs actual &mdash; the deploy-time, human-run cousin of the reconciler&rsquo;s loop.',
    '<b>Abstract and compose</b> &mdash; construct levels (raw resources vs curated vs patterns) and modules let you build reusable, parameterized infrastructure. The trade is curated-abstraction vs raw-control, and DRY vs explicit.'
  ],
  cramTitle: 'Infrastructure as Code',
  reportTitle: 'Infrastructure as Code',
  cmpNotes: {
    walk: ['The provision loop', 'Write, init, plan, review, apply \u2014 and how state ties config to real resources. One turn of the loop, the mechanics you narrate.', 'Say the plan-before-apply line out loud \u2014 \u201Ccompute the diff, review it, then execute; the same diff against reality is drift.\u201D That\u2019s the discipline.'],
    drill: ['Probe Drill', 'Graded follow-ups on state and locking, plan / apply, drift, and abstraction levels \u2014 the ones that separate a passing answer from a Staff signal.', 'Commit to the model before the tool \u2014 \u201Cdeclare desired infra, diff against state, apply the plan\u201D \u2014 not \u201CTerraform makes the AWS stuff.\u201D'],
    wb: ['Whiteboard', 'Rebuild config \u2192 state \u2192 real resources and the plan / apply cycle from memory \u2014 the cues, nothing in front of you.', 'Draw the three-way tie first \u2014 config, state, reality \u2014 then plan as the diff between them. Recall is the test, not recognition.'],
    sys: ['System Map', 'Zoom out: IaC sits between declared infrastructure and provisioned reality, driving one into the other at deploy time.', 'Lead with the boundary, not the syntax \u2014 \u201Cconfig is intent, state is the record, the cloud is reality; plan diffs them.\u201D'],
    trade: ['Trade-offs', 'The decisions they drill \u2014 Terraform vs CloudFormation vs CDK vs Pulumi, module granularity, state layout, abstraction level \u2014 each with the switch condition.', 'Always say \u201Cplan before apply\u201D and \u201Cstate must be locked\u201D \u2014 the two disciplines that separate IaC from a fragile deploy script.'],
    model: ['Model Answers', 'Full spoken scripts \u2014 the beats, in order, the way you\u2019d actually say them.', 'Steal the frame, not the words \u2014 headline first (\u201Cdeclare, diff against locked state, apply the plan\u201D), then the one risk you\u2019d name.'],
    num: ['Numbers', 'Back-of-envelope the IaC estate \u2014 and know which number sets your blast radius and plan time.', 'Lead with blast radius \u2014 resources per state file is what a bad apply can take down, so state granularity is a real number, not a style choice.'],
    rf: ['Red Flags', 'What sinks the round \u2014 local unlocked state, apply-without-plan, click-ops drift, secrets in plaintext state \u2014 and what to say instead.', 'Name what the interviewer hears \u2014 \u201Cwe keep state on someone\u2019s laptop\u201D is the fastest no-hire in the room.'],
    open: ['30-Second', 'The opener and the close \u2014 matched to the altitude the question is asked at.', 'Match the altitude \u2014 open at the provisioning boundary, not the CLI, and land on state / locking and drift as the real hard parts.']
  }
};
