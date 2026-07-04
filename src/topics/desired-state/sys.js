/* topics/desired-state/sys.js -- topic 7 system map. intro + stages[] (exactly one cur:true,
   the reconciler) + pivots[] (7; chips carry the 8-topic INDEX in parens for topic-refs,
   plain names for non-topic pivots) + heads. Chip arrows use single-backslash \u2192.
   7-bit ASCII. */
var TOPIC_DS_SYS = {
  intro:'Zoom out: the reconciler is the <b>boundary between config intent and fleet reality</b>, driving one toward the other continuously. Upstream, operators declare what the fleet <i>should</i> run; downstream, tens of thousands of live terminals run <i>something</i>. The loop measures the gap and closes it &mdash; converging reality to intent, safely, rather than firing config and hoping.',
  stages:[
    { n:'Config intent', d:'What the fleet should run &mdash; resolved through the tenant &rarr; site &rarr; tag &rarr; device hierarchy into a desired config per device, with every level stored for provenance.' },
    { n:'The reconciler', d:'The three-hash convergence loop &mdash; desired, deployed, reported; resolve, render, diff, deploy, report &mdash; driving each device toward its declared state. Content-hash drift, closed-loop correction.', cur:true },
    { n:'Drift detection', d:'The three-way diff runs continuously and event-driven, localizing any mismatch to deploy-owed (desired &ne; deployed) or device-drifted (deployed &ne; reported). Detection is always on.' },
    { n:'Safe correction', d:'Deploys are gated by a per-tenant lock and maintenance windows, and rolled out in canaried waves &mdash; correction is deliberate and reversible (re-declare the old desired), not immediate.' },
    { n:'Convergence', d:'The device reports its running hash; the loop confirms reported == desired or re-acts on the next trigger &mdash; closed-loop and self-healing, reality measured rather than assumed.' },
    { n:'Fleet reality', d:'Tens of thousands of live terminals, each running measured config, with drift observable through the visibility API &mdash; the reality the loop continuously drives intent into.' }
  ],
  pivots:[
    { q:'The reconciler renders a config from somewhere. Where do the per-device values it resolves actually come from?',
      chip:'\u2192 Attribute Store (6)',
      a:'The <b>attribute store</b> is a major input to the resolved config &mdash; per-device attributes (resolved override-over-default) feed the hierarchy the reconciler renders. That topic answers &lsquo;what value&rsquo;; this one answers &lsquo;how it becomes running reality and stays there.&rsquo; A change to an attribute&rsquo;s value changes desired, which the loop then detects as drift and converges.' },
    { q:'It&rsquo;s multi-tenant. How is one tenant&rsquo;s fleet isolated from another&rsquo;s, all the way through the loop?',
      chip:'\u2192 Tenant Authorization (3)',
      a:'Every part of the loop is <b>tenant-scoped</b> &mdash; the three-hash state, the resolution hierarchy, the visibility API, and the lock &mdash; the same per-tenant boundary the authorization topic enforces, made structural (tenant-rooted hierarchy, tenant-prefixed keys, an injected predicate). The per-tenant lock also gives cross-tenant parallelism, so isolation and scale come from the same boundary.' },
    { q:'You need the reported hash from tens of thousands of devices. How, without polling all of them?',
      chip:'\u2192 Notifications (5)',
      a:'Devices <b>report their state on check-in / push</b> rather than the platform polling 10,000 of them &mdash; the same push-not-poll reasoning as the notification topic. A reported-state change is an event that triggers a reconcile for that device. Polling the whole fleet for state would be the load-and-staleness anti-pattern; event-driven reporting keeps it fresh and cheap.' },
    { q:'This has a &lsquo;desired state&rsquo; and detects drift &mdash; how is it different from Terraform doing the same?',
      chip:'\u2192 IaC (8)',
      a:'<b>Same pattern, purpose-built engine.</b> IaC declares infrastructure and reconciles at deploy time via a human-run plan/apply against a readable state file; this reconciles <b>per-device runtime config continuously and autonomously</b> against device-<i>reported</i> reality, within maintenance windows, at fleet cardinality. You steal IaC&rsquo;s declarative philosophy (desired-as-data, plan-before-apply, idempotent converge, drift-as-first-class) and reject its execution model for a live fleet.' },
    { q:'The rendered config is pushed to a payment terminal. How does the device know to trust what it&rsquo;s told to run?',
      chip:'\u2192 Signing (2)',
      a:'The rendered config is an <b>artifact deployed to a terminal</b>, so it&rsquo;s signed and verified the same way the signing topic handles pushed packages &mdash; the device trusts config that carries a valid signature, not whatever arrives on the wire. Convergence delivers the <i>right</i> config; signing guarantees the device only runs config that&rsquo;s <i>authentic</i>. The deployed-hash record and the signature together make a push both correct and trusted.' },
    { q:'The whole drift model rests on the content hash. What makes that hash trustworthy in the first place?',
      chip:'\u2192 Deterministic render',
      a:'<b>Deterministic rendering</b> &mdash; the same resolved config must render to byte-identical output every time, or the hash is unstable and every device looks perpetually drifted. That means no timestamps, no unordered keys, no nonces in the render path: rendering is a pure function of the resolved config. It&rsquo;s the load-bearing invariant under the entire three-hash model, and it&rsquo;s testable (render twice, assert identical, gate in CI).' },
    { q:'This is a measure-diff-act loop. How does it relate to Kubernetes controllers and other control loops?',
      chip:'\u2192 Control loops',
      a:'It&rsquo;s the <b>same control-loop pattern</b>: observe actual state, compare to desired, act to close the gap, repeat &mdash; exactly how a Kubernetes controller reconciles resources. The shared ideas are declarative desired state, level-triggered (not edge-triggered) reconciliation, and idempotent convergence. What&rsquo;s specific here is the domain: real payment terminals whose state is <i>self-reported</i> (not a readable API object), windowed correction, and per-tenant fleet cardinality &mdash; a control loop over physical devices rather than cluster objects.' }
  ],
  heads:{
    whereHead:'Where the convergence boundary sits',
    pivHead:'Pivots an interviewer rides',
    pivSub:'From a drift check into hashing, resolution, safe correction, and the systems next door &mdash; each chip is a door a strong answer opens on purpose.'
  }
};
