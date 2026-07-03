/* topics/signing/wb.js -- topic 2 whiteboard. steps:[{c,a}x9]; diagram = the .dgm
   inner; foot; sub + okVerdict carry the step-count-specific copy as data. Rebuilds
   the trust boundary from memory. Offline-safe; 7-bit ASCII (entities + \uXXXX). */
var TOPIC_SIGN_WB = {
  steps: [
    {c:'Entry &mdash; what hands work to the signer, and in what form.', a:'<code>signPackage(hash, tenant, productType)</code> &mdash; the pipeline already computed the package <b>SHA&#8209;256</b>, so the signer receives the <b>digest</b>, not the bytes.'},
    {c:'Key resolution &mdash; how a package picks its key.', a:'The <b>four-table lookup</b>: <code>product_type &rarr; company_product_type &rarr; company_device_keys</code>. The key is scoped to <b>one company&rsquo;s one product type</b>.'},
    {c:'The signing operation &mdash; where the private key lives.', a:'The service sends the hash to the <b>HSM</b>; the HSM signs with the <b>non-exportable</b> private key and returns a signature. The key <b>never leaves</b>.'},
    {c:'Algorithm by device family &mdash; why one scheme won&rsquo;t do.', a:'<b>G6</b> verifies PKCS#1 v1.5, <b>G7</b> verifies RSA-PSS. You sign with what the <b>device&rsquo;s verifier</b> implements &mdash; the family decides the padding, not you.'},
    {c:'Stamping &mdash; where the signature goes.', a:'The signature <b>+ version + key id</b> is written into the package <b>header</b>; the payload is untouched. Header carries proof, payload carries content.'},
    {c:'Device receives it &mdash; the first thing it checks.', a:'It <b>hashes the payload</b>, then verifies the header signature against its <b>burned-in public key</b>. Match &rarr; trusted; mismatch or missing &rarr; <b>reject</b>.'},
    {c:'The reject path &mdash; what a bad signature does.', a:'The device <b>refuses to flash</b> and keeps its current image. With <b>A/B partitions</b>, rejection is the <b>safe</b> path &mdash; never a brick. (The one people frame backwards.)'},
    {c:'Downgrade defense &mdash; an old package is still validly signed.', a:'A <b>monotonic version</b> inside the <i>signed</i> header; the device refuses any version below what it&rsquo;s running. Signature proves <b>authenticity, not freshness</b>.'},
    {c:'Key compromise &mdash; how the blast radius is bounded.', a:'<b>Per-tenant, per-product-type</b> keys + <b>rotation</b>: a leak hits one company&rsquo;s one product line, and the device&rsquo;s <b>trust anchor</b> bounds what a leaked signing key can forge.'}
  ],
  diagram: `
          <div class="dgm-node"><div class="dgm-t">content pipeline</div><div class="dgm-s">produces the package + its SHA&#8209;256 digest</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">hands over the <code>hash</code> (not the bytes)</span></div>
          <div class="dgm-node"><div class="dgm-t"><code>signPackage(hash, tenant, productType)</code></div><div class="dgm-s">key resolved via product_type &rarr; company_product_type &rarr; company_device_keys</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">send hash to HSM</span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">HSM &middot; <span class="dgm-em">key never leaves</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; sign(hash)</span><span class="dgm-br">&rarr; signature</span></div><div class="dgm-s">non-exportable private key &middot; G6 PKCS#1 v1.5 / G7 PSS</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">stamp signature + version + key id into the <b>header</b></span></div>
          <div class="dgm-node"><div class="dgm-t">signed package</div><div class="dgm-s">header = proof &middot; payload = content (untouched)</div></div>
          <div class="dgm-note">&mdash;&mdash;&mdash; trust boundary: signer holds the <b>private</b> key &middot; device holds the <b>public</b> key &mdash;&mdash;&mdash;</div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">deployed to device</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">device: verify BEFORE flash</div><div class="dgm-s">hash payload &rarr; verify vs burned-in public key &rarr; version &ge; current? &mdash; else <b>reject</b> (keep current image, A/B rollback)</div></div>
          <div class="dgm-foot">valid + newer &rarr; flash &middot; invalid / unsigned / older &rarr; reject &middot; rejection is the <b>safe</b> path</div>
        `,
  foot: "<b>The one people forget:</b> step 8. A signature proves the package is <i>authentic</i>, not that it&rsquo;s the <i>latest</i> &mdash; if you don&rsquo;t volunteer the monotonic-version downgrade defense, the interviewer knows you&rsquo;ve read about signing, not shipped OTA to a fleet.",
  sub: "For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run the trust boundary on a whiteboard.",
  okVerdict: "<b>All nine cold.</b> You can rebuild the trust chain on a whiteboard from memory \u2014 the signing round is yours to lose, not to pass."
};
