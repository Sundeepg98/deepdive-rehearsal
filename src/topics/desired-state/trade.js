/* topics/desired-state/trade.js -- topic 7 trade-offs. decisions[] each {q (X vs Y,
   single-quoted with the literal class="vs" span), opts:[{n,when}], tell}. Entities only,
   no backslash escapes. 7-bit ASCII. */
var TOPIC_DS_TRADE = {
  lead:'The desired-state decisions an interviewer drills &mdash; each is a place where &lsquo;fast&rsquo; and &lsquo;safe&rsquo; (or &lsquo;simple&rsquo; and &lsquo;correct&rsquo;) pull against each other, and the answer is a switch condition, not a favorite.',
  decisions:[
    { q:'Hash the rendered output <span class="vs">vs</span> the template version',
      opts:[
        { n:'Hash the rendered output', when:'Effectively always &mdash; a config&rsquo;s identity is the bytes it produces, so drift tracks real output changes, immune to template refactors and version bookkeeping.' },
        { n:'Hash the template version', when:'Only if rendering genuinely can&rsquo;t be made deterministic (a last resort) &mdash; and accept false positives on refactors and false negatives on shared-partial changes.' }
      ],
      tell:'Content, not version. Hashing output means a refactor with identical bytes isn&rsquo;t drift and a value change that alters bytes is &mdash; but it demands deterministic rendering, or every reconcile is phantom drift.' },
    { q:'Converge to a goal <span class="vs">vs</span> command imperatively',
      opts:[
        { n:'Declarative converge (level-triggered)', when:'For a fleet where partial failure is the steady state &mdash; the loop re-measures and re-acts until reality matches, so retries and recovery are the normal path.' },
        { n:'Imperative command (edge-triggered)', when:'For a one-off action on a single device you can supervise &mdash; where there&rsquo;s no ongoing goal to maintain.' }
      ],
      tell:'Converge, don&rsquo;t command. A declarative goal plus a level-triggered loop is idempotent and self-healing; fire-and-forget commands accumulate silent divergence at fleet scale. Level-triggered survives dropped events; edge-triggered doesn&rsquo;t.' },
    { q:'Devices report state <span class="vs">vs</span> the platform polls them',
      opts:[
        { n:'Devices report (push)', when:'At fleet scale &mdash; devices push their running hash on check-in or change, so state is fresh and load is proportional to change, not to fleet size.' },
        { n:'Poll every device', when:'Only for a small fleet, or as a fallback probe for devices that have gone silent and stopped reporting.' }
      ],
      tell:'Push the state, don&rsquo;t poll 10,000 devices. Polling is load &times; poll-rate mostly finding nothing, staleness bounded by the interval; reported-on-change is fresh and cheap. Keep a slow poll only to catch the silent.' },
    { q:'Event-driven reconcile <span class="vs">vs</span> periodic full sweep',
      opts:[
        { n:'Event-driven (primary)', when:'Trigger on the events that change state &mdash; a config edit, a check-in, a window opening &mdash; so work is proportional to change and propagation is seconds.' },
        { n:'Periodic full sweep (backstop)', when:'As a low-frequency safety net to catch dropped events and silent local drift that produces no event at all.' }
      ],
      tell:'Both, layered. Events are the fast, cheap common path; the sweep is the eventual-consistency guarantee. Betting only on events means a dropped event is permanent drift; only sweeping means slow detection and wasted work.' },
    { q:'Per-tenant lock <span class="vs">vs</span> global or per-device',
      opts:[
        { n:'Per-tenant lock', when:'The default &mdash; it matches the isolation boundary: parallel across tenants, serialized within one, so tenants don&rsquo;t block each other and a tenant&rsquo;s reconcile is a coherent unit.' },
        { n:'Global or per-device lock', when:'Global only if the platform is tiny (it serializes everything); per-device or per-site sub-locks when a single tenant is too large to serialize as one unit.' }
      ],
      tell:'Granularity follows the isolation boundary. Global throws away parallelism; per-device multiplies lock ops and misses tenant-level coordination. Per-tenant is the sweet spot &mdash; sub-partition (per-site) only when one tenant outgrows a single lock.' },
    { q:'Correct drift immediately <span class="vs">vs</span> only in a maintenance window',
      opts:[
        { n:'Windowed correction', when:'For production devices where an untimed change is dangerous &mdash; a payment terminal mid-transaction, peak hours; detect always, correct when safe.' },
        { n:'Immediate correction', when:'For a truly urgent change (a security fix) via an emergency window, or for devices where a config change is always safe to apply.' }
      ],
      tell:'Detect always, correct in-window. Separating detection from correction lets drift be known-and-bounded rather than either invisible or unsafely fixed. The escape hatch is an emergency window for genuinely can&rsquo;t-wait changes.' },
    { q:'Assume the push worked <span class="vs">vs</span> measure the reported hash',
      opts:[
        { n:'Measure reported (closed loop)', when:'Always &mdash; converged means the device itself reports the matching hash; a transport-level success says nothing about the device actually running the config.' },
        { n:'Assume-success (open loop)', when:'Essentially never &mdash; it turns failed deploys, rollbacks, and offline devices into silent divergence your records can&rsquo;t see.' }
      ],
      tell:'Measure, don&rsquo;t assume. Closed-loop convergence on the reported hash is what makes the system self-healing; assume-success means your records say &lsquo;correct&rsquo; while the fleet runs the wrong thing. Reality is measured, not presumed.' }
  ]
};
