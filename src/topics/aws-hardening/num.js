/* topics/aws-hardening/num.js -- topic 4 PARAMETRIC pane. compute(vals, fmt) is
   DOM-method-free (arithmetic + string building only). The ceiling this pane reveals
   is NOT throughput -- it's BLAST RADIUS: a public bucket has no boundary (every
   object, every tenant, indefinitely), while a leaked presigned URL is bounded to one
   object for one window. n-strings use \uXXXX. Offline-safe; 7-bit ASCII. */
var TOPIC_AWSHARD_NUM = {
  lead: "The estimation for a storage layer isn&rsquo;t throughput &mdash; it&rsquo;s <b>blast radius</b>. The number that matters is what <i>one</i> misconfiguration exposes, and how least privilege and Block Public Access turn an <b>unbounded</b> exposure into a <b>bounded</b> one.",
  tell: "The headline is that a <b>public bucket has no boundary</b> &mdash; one wrong setting exposes every object of every tenant, indefinitely. A leaked presigned URL exposes <b>one object for a few minutes</b>. Same class of failure; the difference is the entire design.",
  inputs: [
    { id: 'fw_objects', label: 'Firmware objects in the bucket', value: 200000, min: 0, step: 1000 },
    { id: 'fw_tenants', label: 'Tenants sharing the bucket', value: 500, min: 1 },
    { id: 'fw_expiry', label: 'Presigned URL expiry (min)', value: 5, min: 1 },
    { id: 'fw_dps', label: 'Peak downloads/sec', value: 5000, min: 0 }
  ],
  compute: function (vals, fmt) {
    var objs = vals.fw_objects, tenants = vals.fw_tenants, expiry = vals.fw_expiry, dps = vals.fw_dps;
    var ratio = objs;                 /* one public bucket exposes ALL objects vs a URL's 1 */
    return [
      { k: 'Objects exposed by ONE public bucket', v: fmt.n(objs), u: 'objects', n: 'a single wrong setting exposes EVERY object \u2014 the whole fleet\u2019s firmware, at once', over: true },
      { k: 'Tenants exposed by ONE public bucket', v: fmt.n(tenants), u: 'tenants', n: 'not one tenant \u2014 all of them; a public bucket has no tenant boundary', over: true },
      { k: 'Objects a leaked presigned URL exposes', v: '1', u: 'object', n: 'one object, for the expiry window \u2014 vs the entire bucket. This is the bounded failure.', over: false },
      { k: 'Exposure window of a leaked URL', v: fmt.n(expiry), u: 'min', n: 'then it\u2019s dead \u2014 a leaked presigned URL self-heals; a public bucket stays open until someone notices', over: false },
      { k: 'Public bucket vs a leaked URL', v: fmt.n(ratio), u: '\u00D7 worse', n: 'the SAME class of failure \u2014 exposure \u2014 unbounded vs bounded; least privilege + BPA is what buys the bound', over: true },
      { k: 'KMS Decrypt calls at peak', v: fmt.n(dps), u: '/s', n: 'per-object without S3 Bucket Keys \u2014 near the per-key quota you throttle at; Bucket Keys collapse this', over: dps > 10000 }
    ];
  }
};
