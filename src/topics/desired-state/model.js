/* topics/desired-state/model.js -- topic 7 model answers. selectors[i] pairs answers[i];
   'Name the limits' is LAST. answers[6] is the Invenco desired-state-reconciler "one you built"
   story. openers use single-backslash \u201C .. \u201D curly quotes and \u2019 / \u2014. beats carry
   c-tags frame|head|sub|risk|trade|close. 7-bit ASCII. */
var TOPIC_DS_MODEL = {
  selectors: [
    'Design it',
    'Explain the three hashes',
    'Walk the loop',
    'Detect and localize drift',
    'Make correction safe',
    'Operate it at scale',
    'One you built',
    'Test it',
    'Name the limits'
  ],
  answers: [
    { opener:'\u201CI\u2019d model it as desired state \u2014 three hashes per device, drift as any mismatch, and an event-driven loop that converges reality toward a declared goal rather than firing config and hoping.\u201D',
      sub:'The whole design in one breath, then the loop.',
      beats:[
        { l:'Frame', c:'frame', t:'The problem is keeping tens of thousands of live terminals running the config we intend, continuously &mdash; where partial failure is the steady state. So I declare the goal and let a loop drive toward it, instead of pushing config imperatively.' },
        { l:'The three hashes', c:'head', t:'Per device: desired (what it should run), deployed (what we last pushed), reported (what it says it runs). All match = converged; any mismatch = drift, and which pair differs localizes it &mdash; a deploy owed vs a device that drifted.' },
        { l:'Hash the output', c:'sub', t:'The desired hash is SHA-256 of the rendered output, not the template version &mdash; a config&rsquo;s identity is the bytes it produces, so refactors aren&rsquo;t drift and real value changes are. That demands deterministic rendering.' },
        { l:'Resolve the hierarchy', c:'sub', t:'Desired config resolves tenant &rarr; site &rarr; tag &rarr; device, each overriding the last, storing every level so I can always explain where any value came from.' },
        { l:'The loop under a lock', c:'trade', t:'Convergence is an event-driven resolve &rarr; render &rarr; diff &rarr; deploy &rarr; report loop, guarded by a per-tenant lock so reconcilers don&rsquo;t fight, and gated by maintenance windows so deploys land only when safe.' },
        { l:'The hard part', c:'risk', t:'The cost I&rsquo;d name: it&rsquo;s only correct if rendering is deterministic and you measure the device&rsquo;s reported state rather than assuming the push worked. Get either wrong and you have phantom drift or silent divergence.' },
        { l:'Land it', c:'close', t:'So: three hashes over rendered output, hierarchical resolution stored for provenance, an event-driven loop under a lock, windowed correction, drift made visible &mdash; converge toward a goal, don&rsquo;t command.' }
      ] },
    { opener:'\u201CThree hashes per device \u2014 desired, deployed, reported \u2014 because the pair that differs tells you not just that there\u2019s drift, but what kind and whose fault.\u201D',
      sub:'Why three, and what each mismatch means.',
      beats:[
        { l:'Frame', c:'frame', t:'The state I track per device is three content hashes: desired (what it should run), deployed (what we last pushed to it), reported (what the device says it&rsquo;s actually running).' },
        { l:'Converged', c:'head', t:'When all three match, the device is converged &mdash; we intend X, we pushed X, it&rsquo;s running X. That&rsquo;s the steady state the loop maintains, and it keeps re-checking because a converged device can drift later.' },
        { l:'Deploy owed', c:'sub', t:'desired &ne; deployed (with deployed == reported) means the intended config changed and we haven&rsquo;t pushed it yet &mdash; a deploy is owed. The action is render and push, in-window.' },
        { l:'Device drifted', c:'sub', t:'deployed &ne; reported means we pushed one thing but the device runs another &mdash; it drifted locally, rolled back, or the deploy failed. The action is re-apply, and flag if it recurs.' },
        { l:'Why not two', c:'risk', t:'With only desired vs reported, a mismatch is ambiguous &mdash; you can&rsquo;t tell &lsquo;deploy the change&rsquo; from &lsquo;the deploy failed.&rsquo; The deployed hash is the record of our last action, and it&rsquo;s what disambiguates the two.' },
        { l:'Localized diagnosis', c:'trade', t:'So the three-way comparison turns &lsquo;something&rsquo;s wrong&rsquo; into a specific, actionable diagnosis &mdash; and the reconciler takes the right action for which pair diverged, rather than blindly redeploying on any mismatch.' },
        { l:'Close', c:'close', t:'Three hashes, one comparison &mdash; converged, deploy-owed, or device-drifted &mdash; is the whole drift model, and it&rsquo;s what makes the loop precise instead of just reactive.' }
      ] },
    { opener:'\u201CThe loop is resolve, render, hash, diff, deploy, report \u2014 a control loop that closes on the device\u2019s reported reality, not on the act of pushing.\u201D',
      sub:'The cycle, and what makes it a loop.',
      beats:[
        { l:'Frame', c:'frame', t:'A trigger &mdash; a config edit, a check-in, a window &mdash; kicks the loop for the affected devices. It&rsquo;s event-driven, so work is proportional to what changed, not a blind sweep of the fleet.' },
        { l:'Resolve and render', c:'head', t:'Resolve the hierarchy into a config, then render it to the exact output bytes the device will run &mdash; deterministically, so identical config always produces identical bytes.' },
        { l:'Hash and diff', c:'sub', t:'Hash the rendered output for desired, then three-way diff against deployed and reported. All of this is read-only and safe to do anytime.' },
        { l:'Gate the deploy', c:'sub', t:'If there&rsquo;s drift, acquire the per-tenant lock and check the maintenance window &mdash; the two gates on the one step that touches devices. Then push the config and record the deployed hash.' },
        { l:'Close the loop', c:'trade', t:'The device runs it and reports its actual hash; the next diff compares reported against desired. That feedback is what makes it a loop, not a pipeline &mdash; it continues until measured reality matches intent.' },
        { l:'The distinction', c:'risk', t:'A pipeline ends at &lsquo;deploy&rsquo; and assumes success; the loop keeps measuring and re-acting, so a failed deploy or a rollback is just drift the next cycle corrects. Measure, don&rsquo;t assume.' },
        { l:'Close', c:'close', t:'So: resolve, render, hash, diff, deploy in-window under a lock, report, repeat &mdash; a continuous convergence cycle where the report step closes the feedback and the loop rests only when reported == desired.' }
      ] },
    { opener:'\u201CDrift detection is continuous and event-driven, and the three-way diff doesn\u2019t just detect a mismatch \u2014 it localizes it to a deploy owed or a device that drifted.\u201D',
      sub:'How drift is found and diagnosed.',
      beats:[
        { l:'Frame', c:'frame', t:'Detection runs continuously &mdash; every trigger re-resolves and re-diffs the affected devices &mdash; so drift is caught in seconds, with a slow full sweep as a backstop for dropped events and silent local drift.' },
        { l:'The comparison', c:'head', t:'For each device, compare desired, deployed, reported. Any mismatch is drift; which two differ is the diagnosis.' },
        { l:'Deploy owed', c:'sub', t:'desired &ne; deployed: the config changed upstream and we owe a push. That&rsquo;s a config-delivery task &mdash; render and deploy in-window.' },
        { l:'Device drifted', c:'sub', t:'deployed &ne; reported: we pushed correctly but the device runs something else &mdash; a local change, a rollback, a failed apply. That&rsquo;s a device-health task &mdash; re-apply, and escalate if it keeps recurring.' },
        { l:'Visibility', c:'trade', t:'Every mismatch is surfaced through a drift-visibility API &mdash; which devices, which pair, how long, correction status. Drift is observable, not silent, so an operator can triage the stuck from the safely-pending.' },
        { l:'The risk avoided', c:'risk', t:'The failure I&rsquo;m avoiding is blind redeploy on any mismatch, or invisible self-healing &mdash; both hide what&rsquo;s actually wrong. Localized, visible drift means the right action and an auditable loop.' },
        { l:'Close', c:'close', t:'So detection is always-on and event-driven, the differing pair localizes the fault to delivery vs device, and the visibility API makes it observable &mdash; detect precisely, then act precisely.' }
      ] },
    { opener:'\u201CCorrection is the dangerous step, so it\u2019s gated three ways \u2014 a per-tenant lock, maintenance windows, and staged rollout \u2014 and it\u2019s reversible by just re-declaring the old desired.\u201D',
      sub:'How you fix drift without breaking the fleet.',
      beats:[
        { l:'Frame', c:'frame', t:'Detecting drift is safe and continuous; correcting it touches live payment terminals, so the loop separates the two &mdash; detect always, correct deliberately and gated.' },
        { l:'The lock', c:'head', t:'A per-tenant distributed lock serializes a tenant&rsquo;s deploys &mdash; parallel across tenants, one reconciler at a time within &mdash; so two loops never deploy the same device concurrently. A TTL frees a crashed holder.' },
        { l:'The window', c:'sub', t:'Deploys land only inside a maintenance window &mdash; you don&rsquo;t reconfigure a terminal mid-transaction or at peak. Drift is detected now, corrected when the window opens; an emergency window covers genuinely urgent fixes.' },
        { l:'Staged rollout', c:'sub', t:'A fleet-wide change goes out in canaried waves &mdash; a small set first, watch their reported hashes and health, then expand &mdash; so a bad config is caught on the canaries, not the whole fleet.' },
        { l:'Rollback', c:'trade', t:'Because it&rsquo;s declarative, rollback is trivial: re-declare the previous desired and the same loop converges the fleet back &mdash; symmetric with roll-forward, unlike fragile imperative compensation.' },
        { l:'The risk', c:'risk', t:'The failure I&rsquo;m preventing is a simultaneous fleet-wide push of bad config, or an untimed change interrupting transactions &mdash; both are outages. Gated, staged, reversible correction makes fixing drift as safe as detecting it.' },
        { l:'Close', c:'close', t:'So: lock for exclusivity, windows for timing, canaries for blast radius, and declarative rollback for recovery &mdash; correction that&rsquo;s deliberate and reversible, never a big-bang push.' }
      ] },
    { opener:'\u201CAt fleet scale the ceiling isn\u2019t the diff \u2014 it\u2019s deploy and report I/O and lock hold-time \u2014 so I reconcile incrementally and keep the locked critical section tiny.\u201D',
      sub:'Where it strains, and how you relieve it.',
      beats:[
        { l:'Frame', c:'frame', t:'With 10,000 devices per tenant across many tenants, the three-hash comparison is trivial CPU and embarrassingly parallel &mdash; so that&rsquo;s not where it strains. The pressure is touching reality and coordinating it.' },
        { l:'The real ceiling', c:'head', t:'Two places: the rate of deploys and reported check-ins the reconciler and datastore must absorb, and the per-tenant lock &mdash; if one tenant&rsquo;s fleet is large and its reconcile is slow, lock hold-time starves its own backlog.' },
        { l:'Incremental reconcile', c:'sub', t:'Each event touches only its affected devices, not the whole tenant under the lock &mdash; so the work done while holding the lock is tiny, not fleet-sized.' },
        { l:'Tiny critical section', c:'sub', t:'Resolve, render, hash, and diff are read-only &mdash; done outside the lock, concurrently. The lock covers only the exclusive deploy-and-record step, whose only job is &lsquo;never two reconcilers on the same device.&rsquo;' },
        { l:'Shard when needed', c:'trade', t:'If a single tenant still outgrows one lock, sub-partition it &mdash; per-site sub-locks along a non-overlapping device boundary &mdash; so independent slices reconcile in parallel while preserving one-device-one-lock. And shard reported-state ingestion.' },
        { l:'The mistake', c:'risk', t:'The classic error is optimizing the diff (the cheap part) or holding the lock across the whole reconcile (serializing work that never needed it). Profile the I/O and coordination, not the arithmetic.' },
        { l:'Close', c:'close', t:'So: incremental event-scoped reconcile, a minimal critical section, per-site lock partitioning, and sharded ingestion &mdash; scale the real bottlenecks (deploy, report, lock), because the drift comparison was never one.' }
      ] },
    { opener:'\u201CI built the desired-state reconciler for our payment-terminal platform \u2014 three hashes per device over rendered config, an event-driven convergence loop under a per-tenant lock, keeping tens of thousands of terminals converged to their intended config.\u201D',
      sub:'The real system, and what it taught me.',
      beats:[
        { l:'The problem', c:'frame', t:'We had a large fleet of terminals across many tenants, each needing a specific config that changed often, and pushing config imperatively meant silent divergence &mdash; deploys that failed, devices that rolled back, no way to know the fleet&rsquo;s true state. I needed the fleet to converge to intent and stay there.' },
        { l:'The three-hash model', c:'head', t:'So I modeled it as desired state: three SHA-256 hashes per device &mdash; desired, deployed, reported &mdash; where drift is any mismatch and the differing pair localizes it. Crucially, the hash was of the rendered output, not the template version, so a template refactor with identical output wasn&rsquo;t a fleet-wide redeploy.' },
        { l:'Hierarchical resolution', c:'sub', t:'Desired config resolved through a four-level hierarchy &mdash; tenant, site, tag, device, each overriding the last &mdash; and I stored every level, so we could always explain where a value came from and correctly re-resolve when a site default changed.' },
        { l:'The loop and the lock', c:'sub', t:'The reconcile ran event-driven &mdash; resolve, render, diff, deploy, report &mdash; guarded by a per-tenant distributed lock (a bounded TTL and acquire window) so two reconcilers never deployed the same fleet at once, and deploys were gated by maintenance windows because you can&rsquo;t reconfigure a terminal mid-transaction.' },
        { l:'Closed loop and visibility', c:'sub', t:'The device reported its running hash, so convergence was confirmed by measurement, not assumption &mdash; a failed deploy or offline terminal just stayed visibly drifted for the next loop. And a drift-visibility API surfaced exactly which devices were out of sync and why.' },
        { l:'What it taught me', c:'risk', t:'Two lessons stuck: rendering had to be deterministic or every reconcile was phantom drift, and convergence had to be measured from the device&rsquo;s reported state or the whole thing was just optimistic pushing. The subtle work wasn&rsquo;t the loop; it was making the drift signal trustworthy and the correction safe.' },
        { l:'The lesson', c:'close', t:'So the win wasn&rsquo;t &lsquo;we push config&rsquo; &mdash; it was a fleet that self-heals toward a declared goal, with drift observable and correction gated, instead of a pile of imperative deploys and hope. Converge, don&rsquo;t command &mdash; measured, and safely.' }
      ] },
    { opener:'\u201CTesting a reconciler is proving the invariants \u2014 deterministic rendering, idempotent convergence, correct drift localization, and safe gated correction \u2014 not just that a config reaches a device.\u201D',
      sub:'The invariants worth a test.',
      beats:[
        { l:'Frame', c:'frame', t:'The reconciler&rsquo;s value is its guarantees &mdash; the drift signal is precise, the loop is safe to re-run, correction is gated &mdash; so the tests target those, because a control loop over live devices fails in subtle, stateful ways.' },
        { l:'Deterministic render', c:'head', t:'The load-bearing test: render the same resolved config many times and assert byte-identical output, across processes and time, gated in CI &mdash; because non-deterministic rendering silently poisons the entire hash-based drift model.' },
        { l:'Idempotence', c:'sub', t:'Run a reconcile against an already-converged device and assert it does nothing; run it twice from a drifted state and assert the same converged result &mdash; proving re-runs after crashes or on the sweep are safe.' },
        { l:'Drift localization', c:'sub', t:'Construct each three-hash state &mdash; desired&ne;deployed, deployed&ne;reported, all-match &mdash; and assert the reconciler takes the right action for each (deploy, re-apply, rest), so the diagnosis is correct, not just the detection.' },
        { l:'Safe correction', c:'risk', t:'Assert deploys don&rsquo;t fire outside a maintenance window, that the per-tenant lock actually serializes concurrent reconciles (no two deploying the same device), and that a canary failure halts a rollout &mdash; the safety gates, adversarially.' },
        { l:'Crash recovery', c:'trade', t:'Kill the reconciler mid-deploy and assert the lock TTL frees the tenant and the next reconcile converges from the actual state &mdash; proving recovery is just re-reconcile, not a bespoke rollback.' },
        { l:'Close', c:'close', t:'So: deterministic rendering, idempotent convergence, correct localization, gated correction, and crash recovery &mdash; the invariants that make the loop trustworthy, verified in CI, not just a happy-path deploy.' }
      ] },
    { opener:'\u201CThe honest limits: the whole model rests on deterministic rendering and truthful device reporting, correction is deliberately slow, and it\u2019s the wrong tool for config that doesn\u2019t need continuous convergence.\u201D',
      sub:'What desired-state costs, said plainly.',
      beats:[
        { l:'Determinism dependency', c:'frame', t:'The biggest limit is the foundation: if rendering isn&rsquo;t perfectly deterministic, the content hash is unstable and every device looks drifted forever. The entire drift model is only as trustworthy as the render function&rsquo;s purity.' },
        { l:'Reporting dependency', c:'head', t:'It also depends on devices truthfully reporting their state. A device that lies, can&rsquo;t report, or reports stalely leaves the loop unable to confirm convergence &mdash; the closed loop is only as good as the measurement it closes on.' },
        { l:'Correction latency', c:'sub', t:'Correction is deliberately slow &mdash; gated by windows and staged in waves &mdash; so a device can be known-drifted for hours. That&rsquo;s the right trade for payment terminals, but it means desired-state is not a fast-remediation tool by design.' },
        { l:'Coordination cost', c:'risk', t:'The per-tenant lock, the windows, the staged rollout, the visibility &mdash; it&rsquo;s real machinery. For a small or homogeneous fleet, or config that rarely changes, all of that is overhead the problem doesn&rsquo;t warrant.' },
        { l:'When it&rsquo;s wrong', c:'sub', t:'So it&rsquo;s the wrong tool when there&rsquo;s no ongoing goal to maintain &mdash; a one-off action on one device is just a command &mdash; or when the &lsquo;fleet&rsquo; is a handful of stable machines. Desired-state earns its complexity at scale, with change, and with drift that matters.' },
        { l:'The mitigations', c:'trade', t:'Which is why the mitigations are the design: test rendering determinism in CI, treat a missing report as an explicit escalating state, use emergency windows for urgent fixes, and keep the machinery proportional to fleet size and change rate.' },
        { l:'Close', c:'close', t:'So I&rsquo;d use desired-state for a large, changing fleet where drift is real and correctness matters &mdash; name the determinism and reporting dependencies and the correction latency upfront &mdash; and reach for a simple command when there&rsquo;s no goal to converge toward. A powerful pattern with a real bill, not a default.' }
      ] }
  ]
};
