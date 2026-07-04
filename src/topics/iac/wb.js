/* topics/iac/wb.js -- topic 8 whiteboard. steps[] are {c:cue, a:answer} recall prompts
   rebuilding the provision loop from blank; diagram is a template literal (backticks; literal
   double-quotes inside) using the dgm-* class vocabulary. okVerdict uses a single-backslash
   \u2014 / \u201C. 7-bit ASCII. */
var TOPIC_IAC_WB = {
  steps: [
    { c:"Entry: the model &mdash; declare, don&rsquo;t script", a:"Draw config as the entry: you write the <b>desired shape</b> of infrastructure, not the steps to build it. Say the model out loud &mdash; &lsquo;declare the end state, the tool converges reality to it&rsquo; &mdash; the same converge-not-command idea as a reconciler, applied to cloud resources." },
    { c:"The three-way tie: config, state, reality", a:"Draw <b>three</b> things and the links: <b>config</b> (what you declared), <b>state</b> (the tool&rsquo;s record mapping config to real IDs), <b>real resources</b> (what actually exists). State is the middle &mdash; it&rsquo;s how the tool knows what exists. Everything else is diffs between these three." },
    { c:"The resource graph: how order is derived", a:"References between resources are <b>edges</b>; the tool builds a dependency graph and topologically sorts it &mdash; dependencies first, independents in <b>parallel</b>, reverse order for destroy. Draw a couple of nodes with an edge and note: you declare relationships, the order falls out." },
    { c:"Plan: the diff before anything happens", a:"Draw <code>plan</code> as the diff between <b>config and state</b>: <span class=\"hl\">+</span> create, <span class=\"hl\">~</span> update, <span class=\"hl\">-</span> destroy &mdash; a dry run that touches nothing. Say it: plan is the review artifact, the machine-generated statement of consequences you read before you act." },
    { c:"Review: catch the destroy", a:"Someone reviews the plan; the verb that matters is <span class=\"hl\">-</span> <b>destroy</b> (and <code>-/+</code> replace). An immutable-attribute change forces replacement &mdash; data loss on a stateful resource. Draw the review gate before apply, and say: this is the last chance to catch a destroy before it&rsquo;s real." },
    { c:"Lock: serialize the apply", a:"Before apply mutates state, take a <b>lock</b> (a DynamoDB item for an S3 backend). Draw it wrapping apply. Say why: two concurrent applies corrupt the shared state file &mdash; the second clobbers the first &mdash; so one apply at a time, per state. Same problem as any distributed lock." },
    { c:"Apply: execute and record", a:"<code>apply</code> makes the API calls in graph order and <b>writes each real resource ID back into state</b>. Draw the arrow from apply to both real resources and state. Say the key bit: recording IDs is what makes apply idempotent (empty plan next time) and a crash recoverable." },
    { c:"State discipline: remote, locked, encrypted, split", a:"State is precious and dangerous. Draw it as remote (shared, versioned), <b>locked</b> (no corruption), <b>encrypted</b> (it holds plaintext secrets), and <b>split</b> by blast radius (stateful apart from churny, per environment). Say it: lose state or leak it and the whole practice fails." },
    { c:"Drift: plan-time declared-vs-actual", a:"Draw a back-edge: run <code>plan</code> with no config change and a diff = <b>drift</b> (someone clicked in the console). Say the tie: this is the exact same declared-vs-actual convergence a reconciler runs &mdash; just deploy-time and human-run instead of continuous and autonomous." }
  ],
  diagram: `<div class="dgm">
  <div class="dgm-node dgm-src"><div class="dgm-t">config (declared infra)</div><div class="dgm-s">resources + relationships as code &mdash; the desired end state, not the steps</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">parse &rarr; dependency graph</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-def"><div class="dgm-t">resource graph</div><div class="dgm-s">references are edges &middot; topological order &middot; independents in parallel &middot; reverse to destroy</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">plan: diff config vs state</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-fork">
    <div class="dgm-branches">
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">config</div><div class="dgm-s">what you declared</div></div></div>
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">state</div><div class="dgm-s">config &harr; real IDs (locked, encrypted)</div></div></div>
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">real resources</div><div class="dgm-s">what actually exists</div></div></div>
    </div>
    <div class="dgm-note">plan = the diff &middot; + create &middot; ~ update &middot; - destroy &middot; review before apply</div>
  </div>
  <div class="dgm-conn"><span class="dgm-lbl">review the destroy &rarr; acquire lock</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-recon"><div class="dgm-t">apply &middot; write real IDs to state</div><div class="dgm-s">execute in graph order, parallel where safe &mdash; idempotent, crash-recoverable</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">plan with NO config change &rarr; diff = drift (console change)</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-out"><div class="dgm-t">converge reality back to declared &middot; or adopt the change</div><div class="dgm-s">same declared-vs-actual convergence as a reconciler &mdash; deploy-time, human-run</div></div>
  <div class="dgm-foot">declare, don&rsquo;t script &middot; plan before apply &middot; lock your state &middot; state is precious and secret</div>
</div>`,
  foot:'The one people forget: <b>state is the source of truth, and it must be locked.</b> A weak answer treats state as an implementation detail; the strong one names it as the config-to-reality mapping the whole tool depends on &mdash; remote so a team shares it, locked so concurrent applies can&rsquo;t corrupt it, encrypted because it holds plaintext secrets. Corrupt or lost state poisons every future plan.',
  sub:'Rebuild the provisioning boundary on a whiteboard &mdash; config, state, and reality; the graph; plan as the diff; review, lock, apply; and drift as the plan-time convergence &mdash; from the cues, not from a diagram you saw.',
  okVerdict:'If you drew the config / state / reality triangle, said \u201Cplan is the diff, reviewed before apply,\u201D named the state lock, and tied drift to the reconciler\u2019s convergence \u2014 that\u2019s the passing whiteboard. The rest (modules, state splitting, CI gating, immutable infra, tool choice) are the layers that make a correct practice scale and stay safe.'
};
