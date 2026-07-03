/* topics/authz/num.js -- topic 3 PARAMETRIC pane. compute(vals, fmt) is
   DOM-method-free (arithmetic + string building only). Authorization is cheap, so
   the ceiling this pane reveals is NOT throughput -- it's BLAST RADIUS: what a single
   missing tenant filter exposes (essentially every other tenant's rows), and why the
   tenant-leading index makes the scoped query a seek. Offline-safe; 7-bit ASCII. */
var TOPIC_AUTHZ_NUM = {
  lead: "The estimation for a multi-tenant system isn&rsquo;t about throughput &mdash; authorization is cheap. It&rsquo;s about <b>blast radius</b>: what a single missing tenant filter exposes, and why the tenant-leading index is what keeps the scoped query fast.",
  tell: "The number that matters is the <b>blast radius of one forgotten WHERE</b> &mdash; it exposes essentially <i>every other tenant&rsquo;s</i> rows. That&rsquo;s why isolation is layered and deny-by-default: the cost of a single slip is the whole dataset, so you make the slip unwritable.",
  inputs: [
    { id: 'a_tenants', label: 'Tenants', value: 5000, min: 1 },
    { id: 'a_rows', label: 'Total rows (millions)', value: 500, min: 0, step: 1 },
    { id: 'a_whale', label: 'Largest tenant (% of rows)', value: 15, min: 0, step: 1 },
    { id: 'a_rps', label: 'Peak requests/sec', value: 20000, min: 0 }
  ],
  compute: function (vals, fmt) {
    var N = vals.a_tenants, Rm = vals.a_rows, share = Math.min(vals.a_whale, 100), rps = vals.a_rps;
    var rowsPerTenant = Rm * 1e6 / N;
    var blastM = Rm * (N - 1) / N;               /* millions of OTHER tenants' rows a missing filter exposes */
    var crossPct = (N - 1) / N * 100;
    var whaleM = Rm * share / 100;
    var auditM = rps * 86400 / 1e6;
    return [
      { k: 'Rows per average tenant', v: fmt.n(rowsPerTenant), u: 'rows', n: 'total rows \u00F7 tenants \u2014 the scoped query\u2019s working set', over: false },
      { k: 'Tenant-index speedup', v: fmt.n(N), u: '\u00D7', n: 'a tenant-leading index seeks 1 tenant\u2019s rows instead of scanning all ' + fmt.n(Rm) + 'M', over: false },
      { k: 'Blast radius of ONE missing filter', v: fmt.n(blastM), u: 'M rows', n: 'a single forgotten WHERE exposes every OTHER tenant\u2019s rows \u2014 this is the whole risk', over: true },
      { k: 'Cross-tenant share of the dataset', v: fmt.n(crossPct), u: '%', n: 'of all rows belong to other tenants \u2014 the fraction a missing filter leaks', over: crossPct > 90 },
      { k: 'The whale\u2019s rows', v: fmt.n(whaleM), u: 'M rows', n: 'largest tenant \u2014 a tenant-led index no longer narrows here; add targeted indexes or silo it', over: false },
      { k: 'Access events/day to audit', v: fmt.n(auditM), u: 'M/day', n: 'peak rps \u00D7 86,400 \u2014 the trail that lets you scope a breach and catch id-scanning', over: false }
    ];
  }
};
