/* topics/signing/num.js -- topic 2 PARAMETRIC pane. compute(vals, fmt) is
   DOM-method-free (arithmetic + string building only). The ceiling this pane exists
   to reveal is HSM sign-ops/sec: signing is cheap and size-independent (you sign the
   32-byte digest, not the package), so the wall isn't CPU or bandwidth -- it's how
   many Sign calls the HSM will do per second. Offline-safe; 7-bit ASCII. */
var TOPIC_SIGN_NUM = {
  lead: "The estimation an interviewer makes you do for a signing service. The trap is sizing it like the pipeline &mdash; but you sign a <b>32-byte digest</b>, not the package, so bandwidth and file size don&rsquo;t matter. The one ceiling that does is <b>HSM sign-ops per second</b>.",
  tell: "The number that matters is <b>HSM utilization at peak</b>. Signing is size-independent and verify is nearly free &mdash; so when the arithmetic says you&rsquo;re past one partition, the answer is &lsquo;queue the hash and batch,&rsquo; or &lsquo;add HSM partitions,&rsquo; never &lsquo;a bigger box.&rsquo;",
  inputs: [
    { id: 's_pkg', label: 'Packages signed / day', value: 200000, min: 0 },
    { id: 's_size', label: 'Avg package (MB)', value: 40, min: 0, step: 1 },
    { id: 's_hsm', label: 'HSM sign ops/sec', value: 1200, min: 1 },
    { id: 's_peak', label: 'Peak : average', value: 20, min: 1 }
  ],
  compute: function (vals, fmt) {
    var perDay = vals.s_pkg, sizeMB = vals.s_size, hsmOps = vals.s_hsm, peakR = vals.s_peak;
    var avg = perDay / 86400, peak = avg * peakR, util = peak / hsmOps;
    var bytesMoved = perDay * sizeMB / 1e6;     /* TB/day of package bytes the signer NEVER reads */
    return [
      { k: 'Average signing rate', v: fmt.n(avg), u: '/s', n: 'packages/day \u00F7 86,400 seconds', over: false },
      { k: 'Peak signing rate', v: fmt.n(peak), u: '/s', n: 'average \u00D7 ' + fmt.n(peakR) + ' \u2014 releases cluster, they don\u2019t arrive evenly', over: false },
      { k: 'HSM utilization at peak', v: fmt.n(util * 100), u: '%', n: util > 1 ? 'past one HSM partition \u2014 queue the hash + batch, or add partitions' : 'within one HSM partition\u2019s throughput', over: util > 1 },
      { k: 'Bytes signed per package', v: '32', u: 'B', n: 'the SHA\u2011256 digest, not the ' + fmt.n(sizeMB) + ' MB package \u2014 signing time is size-independent', over: false },
      { k: 'Package bytes the signer reads', v: '0', u: '', n: fmt.tb(bytesMoved) + '/day flows past it \u2014 the pipeline already hashed it; the signer only touches the digest', over: false },
      { k: 'Device-side verify cost', v: '~1', u: 'x', n: 'RSA verify is ~100\u20131000\u00D7 cheaper than sign \u2014 the device is never the bottleneck', over: false }
    ];
  }
};
