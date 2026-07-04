/* topics/desired-state/open.js -- topic 7 opener + closer. cards[0] kind:"open" (one-breath +
   thirty-seconds for the reconciler, 3 hook threads); cards[1] kind:"close" (spine + 3 risks,
   hooks:null). Entities only, no backslash escapes. 7-bit ASCII. */
var TOPIC_DS_OPEN = {
  cards: [
    { kind:'open',
      k:'30-Second Version',
      t:'The reconciler, at altitude',
      lead:'Asked to design a fleet config system, open at the <b>convergence boundary</b> &mdash; not the loop &mdash; then give the three hashes and the one trade.',
      items:[
        { n:'One breath', ht:'the single sentence',
          a:'&ldquo;A desired-state reconciler: three hashes per device &mdash; desired, deployed, reported &mdash; and an event-driven loop that <b>converges reality toward a declared goal</b> rather than pushing config and hoping.&rdquo;' },
        { n:'Thirty seconds', ht:'the model, then the trade',
          a:'Each device carries three hashes: <b>desired</b> (what it should run, the SHA-256 of the <i>rendered output</i>), <b>deployed</b> (what we last pushed), <b>reported</b> (what it says it runs). Drift is any mismatch, and which pair differs localizes it. An event-driven <b>resolve &rarr; render &rarr; diff &rarr; deploy &rarr; report</b> loop drives each device to converge, under a per-tenant lock and inside maintenance windows. The trade I&rsquo;d name upfront: it&rsquo;s only correct if rendering is <b>deterministic</b> and you <b>measure the reported state</b> rather than assuming the push worked.' }
      ],
      hooks:{
        lead:'Three threads an interviewer pulls from that opener, and where each leads:',
        items:[
          { q:'&ldquo;What exactly do you hash?&rdquo;',
            d:'The rendered output, not the template version &mdash; content, not bookkeeping &mdash; so a refactor isn&rsquo;t drift and a real value change is. It demands deterministic rendering, or every reconcile is phantom drift.',
            tab:'The hash' },
          { q:'&ldquo;How do you know a device is actually running the config?&rdquo;',
            d:'You wait for its reported hash &mdash; converged means the device itself confirms desired, not that the push returned OK. That closed loop is what makes it self-healing.',
            tab:'Closed loop' },
          { q:'&ldquo;A terminal is drifted at peak &mdash; do you fix it now?&rdquo;',
            d:'No &mdash; detect always, correct in-window. The device is visibly drifted and the fix lands in its maintenance window. Reconfiguring a terminal mid-transaction is worse than brief staleness.',
            tab:'Safe fix' }
        ]
      },
      foot:'Open at the convergence boundary, give the three hashes over rendered output, and name the determinism and reported-measurement dependencies before they do &mdash; that framing signals you&rsquo;ve <i>run</i> a reconciler, not just read about control loops.' },
    { kind:'close',
      k:'The Close',
      t:'Land it, and name what bites',
      lead:'Closing the reconciler, compress to the spine &mdash; three hashes over rendered output, converge not command, correct safely &mdash; then name the three risks that separate a real design from a naive one.',
      items:[
        { n:'Phantom drift', ht:'the determinism risk',
          a:'If rendering isn&rsquo;t a pure function &mdash; a timestamp, unordered keys, a nonce &mdash; identical config hashes differently and every device looks perpetually drifted, so you redeploy the fleet forever. Make rendering deterministic and test it (render twice, assert identical, gate in CI).' },
        { n:'Silent divergence', ht:'the open-loop risk',
          a:'If you assume the push worked instead of measuring the reported hash, failed deploys, rollbacks, and offline devices become divergence your records can&rsquo;t see. Confirm convergence only when the device <i>reports</i> desired; treat a missing report as an explicit escalating state.' },
        { n:'Unsafe correction', ht:'the timing risk',
          a:'If you correct drift the instant you detect it, you risk reconfiguring a live terminal mid-transaction. Separate detection (continuous) from correction (windowed, staged), with declarative rollback (re-declare the old desired) &mdash; a big-bang fleet-wide push is an outage waiting to happen.' }
      ],
      hooks:null,
      foot:'What&rsquo;s next with more time: the hierarchical-resolution provenance model, per-site lock partitioning for the largest tenants, and the drift-visibility API&rsquo;s fields. What I&rsquo;d cut first: the maintenance-window scheduler details and the sweep-frequency tuning &mdash; real, but not the core of the loop.' }
  ]
};
