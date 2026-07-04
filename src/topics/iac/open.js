/* topics/iac/open.js -- topic 8 opener + closer. cards[0] kind:"open" (one-breath +
   thirty-seconds for IaC, 3 hook threads); cards[1] kind:"close" (spine + 3 risks, hooks:null).
   Entities only, no backslash escapes. 7-bit ASCII. */
var TOPIC_IAC_OPEN = {
  cards: [
    { kind:'open',
      k:'30-Second Version',
      t:'Infrastructure as code, at altitude',
      lead:'Asked to design infrastructure management, open at the <b>provisioning boundary</b> &mdash; not the CLI &mdash; then give the model and the one trade.',
      items:[
        { n:'One breath', ht:'the single sentence',
          a:'&ldquo;Infrastructure as code: declare the desired infrastructure as a dependency graph, diff it against a locked, remote state file, and apply the reviewed plan &mdash; so provisioning is <b>reproducible, reviewable, and drift-detectable</b> instead of clicked.&rdquo;' },
        { n:'Thirty seconds', ht:'the model, then the trade',
          a:'You <b>declare</b> resources and their relationships; the tool builds a dependency graph, derives create / update / destroy order, and diffs your config against <b>state</b> &mdash; the locked, encrypted record mapping config to real resource IDs. <b>Plan</b> shows exactly what would change and you review it before <b>apply</b> executes; the same diff against reality detects <b>drift</b>. The trade I&rsquo;d name upfront: state is precious and dangerous &mdash; lose it or leak it and the practice fails &mdash; and the plan is your only chance to catch a destroy before it&rsquo;s real.' }
      ],
      hooks:{
        lead:'Three threads an interviewer pulls from that opener, and where each leads:',
        items:[
          { q:'&ldquo;What&rsquo;s in the state file, and why does it matter so much?&rdquo;',
            d:'It maps config to real resource IDs &mdash; how the tool knows what exists &mdash; and it holds plaintext secrets, so it&rsquo;s remote, locked, and encrypted. Lose it and the tool wants to recreate everything.',
            tab:'State' },
          { q:'&ldquo;How do you avoid an accidental destroy of production?&rdquo;',
            d:'The plan. A -/+ replacement on a stateful resource is data loss; you catch it in review, guard with prevent_destroy, isolate state, and gate applies in CI. The plan is the last chance.',
            tab:'The plan' },
          { q:'&ldquo;How is this different from your device-fleet reconciler?&rdquo;',
            d:'Same converge / diff / drift pattern, opposite cadence &mdash; IaC is deploy-time and human-run against readable state; the reconciler is continuous and autonomous against device-reported state.',
            tab:'The reconciler' }
        ]
      },
      foot:'Open at the provisioning boundary, give the declare-diff-apply loop, and name state management and destroy-safety as the real hard parts before they do &mdash; that framing signals you&rsquo;ve <i>operated</i> an estate as code, not just written some HCL.' },
    { kind:'close',
      k:'The Close',
      t:'Land it, and name what bites',
      lead:'Closing IaC, compress to the spine &mdash; declare a graph, protect state, plan before apply &mdash; then name the three risks that separate a real practice from a fragile one.',
      items:[
        { n:'Corrupt or lost state', ht:'the source-of-truth risk',
          a:'Concurrent applies corrupt state, and a lost state file makes the tool want to recreate everything &mdash; and unlike a failed apply, corrupt state poisons every future plan. Lock it (serialize applies), keep it remote and versioned (restore, don&rsquo;t delete), and never treat it as a disposable cache.' },
        { n:'A destroy you didn&rsquo;t catch', ht:'the review-gate risk',
          a:'An immutable-attribute change forces a -/+ replacement, and on a stateful resource that&rsquo;s data loss &mdash; the plan tells you, but only if you read it. Review the plan for destroys, guard critical resources with prevent_destroy, isolate them in their own state, and block auto-apply on any plan that destroys.' },
        { n:'Secrets in the clear', ht:'the exposure risk',
          a:'State stores attributes in plaintext, including generated passwords and keys &mdash; so an unencrypted or committed state file is a secret store leaked to everyone with access. Encrypt the backend, access-control it like a credential, keep it out of git, and prefer runtime secret-manager references over embedding secrets where they land in state.' }
      ],
      hooks:null,
      foot:'What&rsquo;s next with more time: state-splitting strategy and cross-state references, the module and abstraction-level design, and the CI policy-as-code gates. What I&rsquo;d cut first: the tool-comparison details and provider internals &mdash; real, but not the core of a safe practice.' }
  ]
};
