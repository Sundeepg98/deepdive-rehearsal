/* topics/desired-state/wb.js -- topic 7 whiteboard. steps[] are {c:cue, a:answer} recall
   prompts rebuilding the reconciliation loop from blank; diagram is a template literal
   (backticks; literal double-quotes inside) using the dgm-* class vocabulary. okVerdict
   uses a single-backslash \u2014 / \u201C. 7-bit ASCII. */
var TOPIC_DS_WB = {
  steps: [
    { c:"Entry: what triggers a reconcile, and the model", a:"A <b>trigger</b> &mdash; a config change, a device check-in, a window opening &mdash; kicks the loop; it&rsquo;s <b>event-driven</b>, not a blind sweep. Draw the trigger entering, and say the model out loud: &lsquo;declare a goal and drive reality toward it&rsquo; &mdash; converge, not command." },
    { c:"The three hashes: what you track per device", a:"Draw <b>three</b>: <b>desired</b> (what it should run), <b>deployed</b> (what we last pushed), <b>reported</b> (what it says it runs). All match = converged; any mismatch = drift. Say why three &mdash; deployed disambiguates &lsquo;deploy owed&rsquo; from &lsquo;device drifted.&rsquo;" },
    { c:"Resolve the hierarchy: where desired comes from", a:"<b>tenant &rarr; site &rarr; tag &rarr; device</b>, each level overriding the one above; store every level. Draw the four levels collapsing into one resolved config, and note the provenance is what makes it explainable (&lsquo;the site set this, not the tenant&rsquo;)." },
    { c:"Render and hash: what &lsquo;desired&rsquo; actually is", a:"Render the resolved config to <b>output bytes</b>, then <b>SHA-256 the rendered output</b> &mdash; not the template version. Draw render &rarr; hash. Say the sharp bit: a template refactor with identical output is <i>not</i> drift; a value change that alters output is. And rendering must be deterministic." },
    { c:"Diff: how drift is detected and localized", a:"<b>Three-way compare.</b> desired == deployed == reported &rarr; converged. desired &ne; deployed &rarr; deploy owed. deployed &ne; reported &rarr; device drifted. Draw the comparison and label which pair means what &mdash; drift isn&rsquo;t just detected, it&rsquo;s diagnosed." },
    { c:"Lock: what guards the deploy", a:"Before pushing, take a <b>per-tenant distributed lock</b> (TTL ~30s, acquire ~4min). Draw it wrapping the deploy step. Say why per-tenant: parallel across tenants, serial within &mdash; so two reconcilers never deploy the same fleet at once; the TTL frees a crashed holder." },
    { c:"Deploy in-window: how correction is gated", a:"Push the rendered config and <b>record the deployed hash</b> &mdash; but only inside a <b>maintenance window</b>. Draw the window gate before deploy. Say it: detect always, correct in-window &mdash; you don&rsquo;t reconfigure a payment terminal mid-transaction; drift waits, visibly, for its window." },
    { c:"Report and converge: how the loop closes", a:"The device runs the config and <b>reports its actual hash</b>; when <b>reported == desired</b>, it&rsquo;s converged. Draw the report arrow feeding back into the diff. Say the difference from commanding: you measure reality, you don&rsquo;t assume the push worked &mdash; that&rsquo;s what makes it self-healing." },
    { c:"Visibility: how drift stays observable", a:"Surface every mismatch through a <b>drift-visibility API</b> &mdash; which devices, which pair differs, how long, correction status. Draw it reading the three-hash state. Say it: a loop you can&rsquo;t see is one you can&rsquo;t trust; visibility is what earns the loop the right to run autonomously." }
  ],
  diagram: `<div class="dgm">
  <div class="dgm-node dgm-src"><div class="dgm-t">trigger</div><div class="dgm-s">config change &middot; device check-in &middot; window opens &mdash; event-driven, not a sweep</div></div>
  <div class="dgm-conn"><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-def"><div class="dgm-t">resolve hierarchy</div><div class="dgm-s">tenant &rarr; site &rarr; tag &rarr; device &middot; later overrides earlier &middot; store every level</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">render &rarr; SHA-256(output)</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-fork">
    <div class="dgm-branches">
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">desired</div><div class="dgm-s">hash of the rendered output</div></div></div>
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">deployed</div><div class="dgm-s">what we last pushed</div></div></div>
      <div class="dgm-br"><div class="dgm-node dgm-val"><div class="dgm-t">reported</div><div class="dgm-s">what the device says it runs</div></div></div>
    </div>
    <div class="dgm-note">three-way diff &middot; any mismatch = drift &middot; which pair differs localizes it</div>
  </div>
  <div class="dgm-conn"><span class="dgm-lbl">drift? &middot; per-tenant lock + maintenance window</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-recon"><div class="dgm-t">deploy &middot; record deployed hash</div><div class="dgm-s">only in-window, under the lock &mdash; correction is gated; detection never is</div></div>
  <div class="dgm-conn"><span class="dgm-lbl">device reports its hash &rarr; reported == desired?</span><span class="dgm-v">&#9660;</span></div>
  <div class="dgm-node dgm-out"><div class="dgm-t">converged &middot; or still drifted &rarr; next loop re-acts</div><div class="dgm-s">drift-visibility API: which devices, which pair, how long, correction status</div></div>
  <div class="dgm-foot">converge toward a declared goal, don&rsquo;t command &middot; measure the reported hash, don&rsquo;t assume the push worked</div>
</div>`,
  foot:'The one people forget: <b>convergence is confirmed by the reported hash, not by the deploy.</b> A command-based answer stops at &lsquo;push the config&rsquo;; the desired-state loop keeps measuring reported against desired and re-acts until they match &mdash; so a failed deploy, a rollback, or an offline terminal all self-correct on the next loop instead of becoming silent divergence.',
  sub:'Rebuild the convergence boundary on a whiteboard &mdash; the three hashes, hierarchical resolution, rendered-output hashing, the three-way diff, the lock and window, and the reported-hash feedback &mdash; from the cues, not from a diagram you saw.',
  okVerdict:'If you drew the three hashes, said \u201Chash the rendered output, not the template,\u201D localized drift by which pair differs, and closed the loop on the reported hash \u2014 that\u2019s the passing whiteboard. The rest (the per-tenant lock, maintenance windows, visibility, the sweep backstop) are the layers that make a correct loop safe and operable at fleet scale.'
};
