/* topics/iac/trade.js -- topic 8 trade-offs. decisions[] each {q (X vs Y, single-quoted with
   the literal class="vs" span), opts:[{n,when}], tell}. Entities only, no backslash escapes.
   7-bit ASCII. */
var TOPIC_IAC_TRADE = {
  lead:'The IaC decisions an interviewer drills &mdash; each is a place where &lsquo;convenient&rsquo; and &lsquo;controllable&rsquo; (or &lsquo;simple&rsquo; and &lsquo;safe&rsquo;) pull against each other, and the answer is a switch condition, not a favorite.',
  decisions:[
    { q:'Declarative infra <span class="vs">vs</span> imperative provisioning scripts',
      opts:[
        { n:'Declarative (desired state)', when:'Effectively always for infrastructure &mdash; you declare the end state and get idempotence, convergence, a reviewable diff, and drift detection for free.' },
        { n:'Imperative scripts', when:'Only for genuine one-off procedural steps a declarative tool can&rsquo;t express &mdash; and even then wrapped and made idempotent, as a last resort.' }
      ],
      tell:'Declare, don&rsquo;t script. Desired-state gives idempotent re-runs, a diff you can review, and drift detection; imperative steps are order-dependent and fragile to partial completion. Same converge-not-command reasoning as a reconciler.' },
    { q:'Remote state <span class="vs">vs</span> local state file',
      opts:[
        { n:'Remote state', when:'Any time more than one person (or CI) touches the infra &mdash; shared, versioned, lockable, access-controlled, durable. The default for anything real.' },
        { n:'Local state', when:'Only a throwaway solo experiment &mdash; and even then it breaks the instant a second person or CI joins.' }
      ],
      tell:'Remote, always, on a team. Infra state is inherently shared &mdash; there&rsquo;s one real cloud &mdash; so it needs one shared, locked, versioned record. Local state assumes a single operator, which is false the moment anyone else applies.' },
    { q:'One big state <span class="vs">vs</span> split by blast radius',
      opts:[
        { n:'Split state', when:'As the estate grows &mdash; separate stateful from churny, per environment, per ownership &mdash; to bound blast radius, locking contention, and plan time.' },
        { n:'Single state', when:'For a small, single-team, single-environment estate where the whole thing is one coherent unit and splitting adds only coordination overhead.' }
      ],
      tell:'State is the unit of blast radius, locking, and plan time. Split at real seams (env, risk, ownership, change-rate) and wire via published outputs &mdash; but don&rsquo;t over-split, since each boundary is a cross-state dependency you must apply in order.' },
    { q:'Config DSL (HCL) <span class="vs">vs</span> general-purpose language (CDK / Pulumi)',
      opts:[
        { n:'Config DSL', when:'When you want the config to stay close to declarative and legible &mdash; the plan reflects the code, and reviewers read intent without running a program.' },
        { n:'General-purpose language', when:'When infrastructure genuinely needs real abstraction &mdash; loops over complex data, typed constructs, unit tests, reuse of team language skills.' }
      ],
      tell:'Match the tool to the need. A DSL&rsquo;s constraint keeps infra reviewable (config = intent); a real language adds power but invites cleverness that hides what gets created. If you use a language, keep the logic thin so the synthesized infra stays legible.' },
    { q:'Managed state (CloudFormation) <span class="vs">vs</span> self-owned state (Terraform)',
      opts:[
        { n:'Managed state', when:'All-in on one cloud (AWS) and you want the provider to own state, locking, and rollback &mdash; no state file to run or protect.' },
        { n:'Self-owned state', when:'Multi-cloud or heterogeneous, or you want one tool and ecosystem across everything &mdash; accepting that you manage the state backend.' }
      ],
      tell:'Trade convenience for control. Managed state removes the backend burden but ties you to one cloud&rsquo;s tool; self-owned state spans clouds with a huge ecosystem but you must make it remote, locked, and encrypted yourself.' },
    { q:'High-level curated construct <span class="vs">vs</span> raw resources',
      opts:[
        { n:'Curated (L2 / L3, shared module)', when:'For standard, well-trodden infrastructure &mdash; you want best-practice defaults for free and don&rsquo;t need to control every detail.' },
        { n:'Raw resources (L1)', when:'For anything unusual, security-sensitive, or that must be fully auditable &mdash; where hidden defaults are a risk and you need every resource explicit.' }
      ],
      tell:'Default to the highest level whose opinions you agree with; drop lower for control. High-level is fast and encodes best practice but is leaky &mdash; when the default misfits you hit a wall &mdash; and can create resources you didn&rsquo;t ask for. Let the plan confirm what it produced.' },
    { q:'Mutate in place <span class="vs">vs</span> immutable replace',
      opts:[
        { n:'Immutable replace', when:'For stateless compute &mdash; build a fresh artifact and swap the instance (blue-green), so every box is identical and reproducible with no in-place drift.' },
        { n:'Mutate in place', when:'Rarely, and mostly forced &mdash; for genuinely persistent resources, or where a full replace is impractical; accept that in-place changes accumulate drift.' }
      ],
      tell:'Replace, don&rsquo;t mutate, for the stateless tier. Immutable instances kill snowflakes and give clean rollbacks; in-place patching accumulates drift no two boxes share. Keep persistent state in separate long-lived resources the disposable compute attaches to.' }
  ]
};
