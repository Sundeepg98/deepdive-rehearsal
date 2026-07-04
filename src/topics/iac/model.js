/* topics/iac/model.js -- topic 8 model answers. selectors[i] pairs answers[i]; 'Name the limits'
   is LAST. answers[6] is the Invenco AWS-IaC "one you built" story. openers use single-backslash
   \u201C .. \u201D curly quotes and \u2019 / \u2014. beats carry c-tags frame|head|sub|risk|trade|close.
   7-bit ASCII. */
var TOPIC_IAC_MODEL = {
  selectors: [
    'Design it',
    'Explain state and locking',
    'Walk plan and apply',
    'Detect and handle drift',
    'Make changes safe',
    'Structure it at scale',
    'One you built',
    'Test it',
    'Name the limits'
  ],
  answers: [
    { opener:'\u201CI\u2019d declare the infrastructure as code \u2014 a dependency graph the tool diffs against a locked, remote state file and applies as a reviewed plan \u2014 so provisioning is reproducible, reviewable, and drift is detectable.\u201D',
      sub:'The whole approach in one breath, then the loop.',
      beats:[
        { l:'Frame', c:'frame', t:'The problem is managing cloud infrastructure &mdash; networks, databases, functions, IAM &mdash; reproducibly and reviewably, not by clicking a console. So I declare the desired infrastructure as code and let the tool converge reality to it.' },
        { l:'Declare as a graph', c:'head', t:'You write resources and their relationships; the tool builds a dependency graph and derives create / update / destroy order &mdash; independents in parallel, dependents ordered. You declare where, not how.' },
        { l:'State', c:'sub', t:'State is the source of truth &mdash; it maps config to real resource IDs so the tool knows what exists. It has to be remote, locked so two applies don&rsquo;t corrupt it, and encrypted because it holds secrets.' },
        { l:'Plan before apply', c:'sub', t:'Apply is two-phase: plan computes the diff &mdash; create, change, destroy &mdash; and you review it before executing. In CI the plan goes on the PR and a human approves the diff, so a surprise destroy is caught first.' },
        { l:'Compose and scale', c:'trade', t:'Compose with versioned modules across isolated per-environment, per-account states, so environments are consistent but a mistake can&rsquo;t escape its blast radius. And detect drift on a schedule.' },
        { l:'The hard part', c:'risk', t:'The costs I&rsquo;d name: state is precious and dangerous &mdash; lose it or leak it and the practice fails &mdash; and the plan is your only chance to catch a destroy before it&rsquo;s real. State management and destructive-change safety are the hard parts, not the syntax.' },
        { l:'Land it', c:'close', t:'So: declare a graph, keep state remote-locked-encrypted-split, plan-and-review before every gated apply, and treat drift as the same converge problem a reconciler solves. Two rules: plan before apply, lock your state.' }
      ] },
    { opener:'\u201CState is how the tool knows what exists \u2014 the mapping from config to real resource IDs \u2014 and it has to be remote, locked, and encrypted, because a corrupt or leaked state file breaks everything.\u201D',
      sub:'What state is, and why it must be protected.',
      beats:[
        { l:'Frame', c:'frame', t:'State is the tool&rsquo;s record of what it manages: it maps each config address to a real resource ID and caches attributes. It&rsquo;s how, on the next run, the tool knows whether a resource already exists or needs creating.' },
        { l:'Why it&rsquo;s needed', c:'head', t:'Without state, the tool can&rsquo;t link &lsquo;the table in my code&rsquo; to &lsquo;the table in AWS,&rsquo; so it can&rsquo;t compute a correct diff &mdash; a lost state file makes it want to recreate everything from scratch.' },
        { l:'Remote', c:'sub', t:'So state is remote and versioned &mdash; one authoritative copy the team shares, that you can roll back if corrupted &mdash; not a local file that diverges the moment a second person applies.' },
        { l:'Locked', c:'sub', t:'And locked: two concurrent applies read the same state, each changes it, and the second clobbers the first &mdash; corrupt state that matches neither reality nor intent. A lock (a DynamoDB item for an S3 backend) serializes applies, one at a time.' },
        { l:'Encrypted', c:'risk', t:'And encrypted, because state stores attributes in the clear &mdash; generated passwords, keys, connection strings. An unencrypted state file is a plaintext secret store, so you encrypt the backend and access-control it like a credential.' },
        { l:'Why corruption is worse', c:'trade', t:'The reason locking is non-negotiable: a failed apply is a retry, but corrupt state is a forensic cleanup &mdash; it poisons every future plan, so the tool operates on a false map of reality until you manually reconcile it.' },
        { l:'Close', c:'close', t:'So state is the config-to-reality mapping the whole tool depends on &mdash; remote, versioned, locked, encrypted, and split by blast radius. Treat it as precious and secret, because everything the tool does rests on it being correct and safe.' }
      ] },
    { opener:'\u201CApply is two-phase on purpose \u2014 plan computes the diff and you review it, then apply executes \u2014 so you always see the consequences, especially a destroy, before anything is real.\u201D',
      sub:'The cycle, and why the separation matters.',
      beats:[
        { l:'Frame', c:'frame', t:'You declare desired config; the tool needs to turn that into changes. It does it in two phases &mdash; plan then apply &mdash; and the separation is the whole safety story.' },
        { l:'Plan', c:'head', t:'Plan diffs your config against state and shows exactly what it would do &mdash; create, update in place, destroy &mdash; without touching anything. It&rsquo;s a machine-generated statement of consequences, a dry run.' },
        { l:'Review', c:'sub', t:'Someone reviews the plan, hunting for destroys and replacements &mdash; especially on stateful resources &mdash; and for blast radius larger than intended. In CI the plan is posted to the PR, so a human approves the diff, not just the code.' },
        { l:'Lock and apply', c:'sub', t:'Apply acquires the state lock, then executes the reviewed plan against the real cloud in dependency order &mdash; parallel where the graph allows &mdash; and writes each real resource ID back into state as it goes.' },
        { l:'Idempotent and recoverable', c:'trade', t:'Recording IDs is what makes apply idempotent &mdash; run it again with no change and the plan is empty &mdash; and crash-recoverable: a partial apply&rsquo;s successes are in state, so re-running converges from actual state, not from scratch.' },
        { l:'The risk it prevents', c:'risk', t:'The failure this prevents is a destructive surprise: a small config edit that forces a database replacement shows up as a destroy in the plan even when the code diff looked innocent. Reviewing the plan catches what reviewing the code misses.' },
        { l:'Close', c:'close', t:'So plan-then-apply is look-before-you-leap, built into the workflow &mdash; the diff is your review artifact, the lock serializes the change, and apply converges reality and records what it did. The plan is your last chance to stop a destroy.' }
      ] },
    { opener:'\u201CDrift is a plan-time diff with no config change \u2014 someone edited a resource by hand \u2014 and it\u2019s the same declared-vs-actual convergence a reconciler runs, just human-triggered and occasional.\u201D',
      sub:'How manual changes surface, and what you do.',
      beats:[
        { l:'Frame', c:'frame', t:'Drift is when reality no longer matches the declared state &mdash; usually a manual console change. IaC surfaces it the same way it surfaces any change: through the diff.' },
        { l:'Detection', c:'head', t:'Run plan with no config change; the tool refreshes actual state from the cloud, compares it to config and state, and a non-empty diff is drift &mdash; it shows exactly what it would do to converge reality back to declared.' },
        { l:'Resolve', c:'sub', t:'You resolve it two ways: apply to revert the manual change back to code, or update the config to adopt the change. Either way, code and reality are brought back into agreement.' },
        { l:'The reconciler tie', c:'sub', t:'This is exactly the declared-vs-actual convergence a runtime reconciler does &mdash; refresh, diff, converge &mdash; but deploy-time and human-run rather than continuous and autonomous. Same pattern, opposite cadence.' },
        { l:'Proactive detection', c:'trade', t:'So you don&rsquo;t wait to stumble on drift mid-deploy: run scheduled drift detection against production and alert on a non-empty diff, and reduce drift at the source by restricting console write access so changes go through code.' },
        { l:'The risk', c:'risk', t:'The failure I&rsquo;m avoiding is discovering drift inside an unrelated apply &mdash; where a manual change complicates a real deploy under pressure &mdash; or letting drift accumulate invisibly until it breaks something. Proactive detection makes drift a calm triage, not a surprise.' },
        { l:'Close', c:'close', t:'So drift is the plan-time form of convergence: detect it on a schedule, resolve by converge-or-adopt, and cut it off at the source with restricted console access. Same idea as the fleet reconciler, tuned for infrastructure&rsquo;s slower cadence.' }
      ] },
    { opener:'\u201CThe dangerous move is a destroy or a replacement, so safety is layered \u2014 review the plan, guard critical resources, isolate state, and gate applies in CI \u2014 and rollback is re-declaring the old config.\u201D',
      sub:'How you change infrastructure without breaking it.',
      beats:[
        { l:'Frame', c:'frame', t:'Most infra changes are safe; the ones that aren&rsquo;t are destroys and replacements &mdash; a change to an immutable attribute forces destroy-then-create, which on a stateful resource is data loss. So safety centers on catching those.' },
        { l:'Review the plan', c:'head', t:'First line: the plan. A ~ update is usually fine, but a -/+ &lsquo;forces replacement&rsquo; on a database is the stop line &mdash; you catch it in review and don&rsquo;t apply, or plan a real migration instead of a blind replace.' },
        { l:'Guard critical resources', c:'sub', t:'prevent_destroy lifecycle on critical resources makes any plan that would destroy them fail outright &mdash; a hard stop &mdash; and cloud-level deletion protection is a second line the tool must contend with.' },
        { l:'Isolate blast radius', c:'sub', t:'Split stateful resources into their own state so an apply on app infra can&rsquo;t reach the database, and separate environments and accounts so a mistake can&rsquo;t escape its boundary.' },
        { l:'Gate in CI', c:'trade', t:'In the pipeline, block auto-apply on any plan containing a destroy, require explicit approval, and run policy-as-code so non-compliant or destructive changes can&rsquo;t merge. Applies run from CI, serialized and audited, not from laptops.' },
        { l:'Rollback', c:'risk', t:'And because it&rsquo;s declarative, rollback is re-declaring the previous config and applying &mdash; the same converge mechanism in reverse. The thing to never do is a blind apply of a plan you didn&rsquo;t read.' },
        { l:'Close', c:'close', t:'So: review catches it, prevent_destroy hard-stops it, isolation contains it, CI policy forces a conscious approval, and declarative rollback recovers &mdash; defense in depth, so no single accident deletes a production datastore.' }
      ] },
    { opener:'\u201CAt scale it\u2019s shared versioned modules, per-environment and per-account isolated state, and version-promotion \u2014 so environments are consistent by construction but can\u2019t touch each other.\u201D',
      sub:'How the estate stays consistent and isolated.',
      beats:[
        { l:'Frame', c:'frame', t:'The scale problem is many environments across many accounts that must be consistent but isolated &mdash; and must not drift apart from each other by hand-editing. Two levers: shared definitions and hard boundaries.' },
        { l:'Shared modules', c:'head', t:'Put the actual infrastructure in versioned modules, so every environment builds from the same definitions &mdash; consistency by construction &mdash; instantiated per environment with different inputs.' },
        { l:'Isolated state', c:'sub', t:'Separate state per environment and account, so a prod apply can never reach dev, plan time stays bounded, and blast radius is contained &mdash; state is the unit of isolation.' },
        { l:'Separate accounts', c:'sub', t:'Separate AWS accounts for hard security and billing isolation &mdash; independent credentials, quotas, and incident blast radius &mdash; which state boundaries alone can&rsquo;t give. Serious setups use both accounts and per-account state.' },
        { l:'Version promotion', c:'trade', t:'Promote changes by version, not by copy: bump the module in dev and apply, verify, then staging, then prod &mdash; each a reviewed plan &mdash; so the change that ran in dev is literally the same code in prod, never a re-implementation.' },
        { l:'The risk', c:'risk', t:'The failure I&rsquo;m preventing is environments drifting apart &mdash; prod hand-edited until it no longer matches staging &mdash; and applies with over-broad blast radius. Shared modules plus isolation plus promotion eliminate both.' },
        { l:'Close', c:'close', t:'So: same versioned modules everywhere, separate state and accounts per environment, and staged version-promotion with a reviewed plan at each step &mdash; consistent by construction, isolated by boundary, differing only in inputs and version.' }
      ] },
    { opener:'\u201CI managed our payment-platform\u2019s AWS infrastructure as code \u2014 Terraform for the estate, remote state in S3 locked with a DynamoDB table, plan gated in CI, and per-environment modules \u2014 so provisioning was reproducible and reviewed instead of clicked.\u201D',
      sub:'The real setup, and what it taught me.',
      beats:[
        { l:'The problem', c:'frame', t:'Our platform ran on a lot of AWS &mdash; DynamoDB tables, S3 firmware buckets, Lambda functions, IAM, networking &mdash; across multiple environments, and managing it by hand meant environments drifted, changes were unrecorded, and standing up a new region was a manual ordeal. I moved it to infrastructure as code.' },
        { l:'The engine and state', c:'head', t:'We used Terraform, with remote state in an S3 backend locked by a DynamoDB table, and encryption on the backend because state holds secrets. That gave us one shared, versioned, locked source of truth &mdash; no more &lsquo;works from my laptop,&rsquo; no concurrent-apply corruption.' },
        { l:'Modules and environments', c:'sub', t:'The actual infrastructure lived in versioned modules &mdash; a network module, a service module wiring a Lambda to its DynamoDB table &mdash; instantiated per environment with different inputs and separate state, so dev, staging, and prod were the same definitions differing only in parameters.' },
        { l:'Plan in CI', c:'sub', t:'Changes went through pull requests; CI ran plan and posted the diff to the PR, so we reviewed the actual consequences &mdash; especially any destroy on a stateful resource &mdash; and only applied after approval, from CI with scoped credentials, not from anyone&rsquo;s machine.' },
        { l:'Hardening and drift', c:'sub', t:'The S3 firmware buckets were provisioned hardened by default from the module &mdash; block-public-access, encryption, TLS-only &mdash; so security was consistent and any drift back to insecure showed up in a plan. Manual console changes surfaced as drift the next time we planned.' },
        { l:'What it taught me', c:'risk', t:'Two lessons stuck: state is the most precious and most dangerous artifact &mdash; we treated it like a credential &mdash; and the plan is the moment that matters, because a careless config edit can force a destroy-and-recreate on a production table. Reviewing the plan, not just the code, is what caught those.' },
        { l:'The lesson', c:'close', t:'So the win wasn&rsquo;t &lsquo;we use Terraform&rsquo; &mdash; it was infrastructure that was reproducible, reviewed, and drift-detectable, with a hardened baseline and a real gate before every apply, instead of a pile of console clicks nobody could audit. Plan before apply, lock your state &mdash; the two rules that made it safe.' }
      ] },
    { opener:'\u201CTesting IaC is validating before you apply \u2014 format and validate, security and policy checks, plan review, and for modules real automated tests \u2014 because the plan is your safety net but not your only one.\u201D',
      sub:'How you keep infra changes from breaking prod.',
      beats:[
        { l:'Frame', c:'frame', t:'IaC&rsquo;s value is safe, reviewable change, so the &lsquo;tests&rsquo; are the checks that run before apply &mdash; catching bad config, insecure defaults, and destructive changes at review time, not in production.' },
        { l:'Static checks', c:'head', t:'First, the cheap gates in CI: format and validate (syntax and internal consistency), and security linters like tfsec or checkov that flag insecure patterns &mdash; a public bucket, an open security group &mdash; before they merge.' },
        { l:'Policy as code', c:'sub', t:'Then policy-as-code &mdash; OPA/Conftest or Sentinel &mdash; evaluating the plan JSON against your rules: encryption required, approved instance types, mandatory tags, no destroys of critical resources. Non-compliant infra fails the pipeline.' },
        { l:'Plan review', c:'sub', t:'The plan itself is the core test: a machine-generated diff a human reviews for destroys, replacements, and unexpected blast radius. In CI it&rsquo;s posted to the PR, and auto-apply is blocked when destroys are present.' },
        { l:'Module tests', c:'trade', t:'For reusable modules, real automated tests &mdash; frameworks that actually provision the module in a sandbox account, assert the resources come up correctly, and tear it down &mdash; plus cost estimation on the PR to flag a change that balloons spend.' },
        { l:'The risk', c:'risk', t:'The failure I&rsquo;m guarding against is a change that looks fine in code but is destructive or non-compliant in effect &mdash; exactly what static code review misses and plan-plus-policy catches. And an untested shared module breaks every environment that uses it.' },
        { l:'Close', c:'close', t:'So: format and validate, security lint, policy-as-code against the plan, human plan review with destroy-gating, and provisioning tests for modules &mdash; layered checks that move safety and compliance left to review time, with the plan as the last, human gate.' }
      ] },
    { opener:'\u201CThe honest limits: state is a fragile, sensitive single point of truth; the tooling has real learning-curve and drift-management cost; and it\u2019s the wrong tool for runtime, fast-changing, or one-off work.\u201D',
      sub:'What IaC costs, said plainly.',
      beats:[
        { l:'State fragility', c:'frame', t:'The biggest limit is state itself &mdash; it&rsquo;s a single source of truth that can be corrupted (concurrent applies), lost (recreate-everything risk), and leaked (it holds plaintext secrets). Much of operating IaC is protecting this one fragile, precious artifact.' },
        { l:'Drift and escape hatches', c:'head', t:'It also can&rsquo;t stop drift, only detect it &mdash; someone with console access can always change things out of band &mdash; and imperative escape hatches (provisioners) break the declarative guarantees when you reach for them.' },
        { l:'Learning curve and ceremony', c:'sub', t:'There&rsquo;s real overhead: the tooling, state backends, module design, and CI pipeline are a learning curve, and every change goes through plan-review-apply ceremony &mdash; exactly right for production but heavy for a quick experiment.' },
        { l:'Not for runtime', c:'risk', t:'And it&rsquo;s deploy-time and human-triggered, so it&rsquo;s the wrong tool for continuous runtime reconciliation &mdash; a live device fleet or a cluster that needs constant convergence needs a purpose-built reconciler, not cron&rsquo;d plan/apply.' },
        { l:'When it&rsquo;s wrong', c:'sub', t:'So it&rsquo;s the wrong choice for genuinely one-off actions, for tiny throwaway setups where the ceremony outweighs the benefit, and for runtime control loops. IaC earns its cost on infrastructure that&rsquo;s shared, long-lived, and changes deliberately.' },
        { l:'The mitigations', c:'trade', t:'Which is why the mitigations are the discipline: remote-locked-encrypted-versioned state, scheduled drift detection plus restricted console access, policy-as-code for guardrails, and knowing when to reach for a reconciler instead.' },
        { l:'Close', c:'close', t:'So I&rsquo;d use IaC for a real, shared, evolving cloud estate &mdash; naming the state fragility, the drift-and-secret management cost, and the ceremony upfront &mdash; and reach for a runtime reconciler or a simple command when the problem isn&rsquo;t deploy-time declarative provisioning. A powerful practice with a real bill, not a default.' }
      ] }
  ]
};
