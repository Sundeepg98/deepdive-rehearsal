/* topics/content-pipeline/num.js -- Phase 1: REAL num data (the PARAMETRIC pane).
   Unlike the array-driven panes, num carries a compute(vals, fmt) FUNCTION -- the
   back-of-envelope arithmetic plus the Lambda-1,000 / Postgres-100 ceilings -- as the
   explicit escape hatch (design 3.2). compute is DOM-METHOD-FREE (arithmetic + string
   building only, no innerHTML/createElement) so it stays pure data; each row's `v` is
   a DISPLAY STRING the pane renders verbatim. lead/tell/inputs were lifted from the
   former NUM_HTML. vals = {<id>: parsed number}; fmt = {n: _fmtN, tb: _fmtTB} (the
   pane's pure formatters). cmpNotes.num lives in identity.js, not here.
   Offline-safe; 7-bit ASCII (entities + \uXXXX escapes). */
var TOPIC_CP_NUM = {
  lead: "The estimation an interviewer makes you do at the whiteboard. State your assumptions and the <b>ceilings fall out of the arithmetic</b> &mdash; adjust any input and the math recomputes.",
  tell: "The number you say isn't the point &mdash; the <b>ceiling</b> it reveals is. Concurrency past 1,000 says &lsquo;buffer through SQS&rsquo;; connections past the pool say &lsquo;RDS Proxy.&rsquo;",
  inputs: [
    { id: 'n_obj', label: 'Objects / day', value: 10000000, min: 0 },
    { id: 'n_size', label: 'Avg size (MB)', value: 2, min: 0, step: 0.1 },
    { id: 'n_proc', label: 'Processing (sec)', value: 2, min: 0, step: 0.1 },
    { id: 'n_peak', label: 'Peak : average', value: 10, min: 1 }
  ],
  compute: function (vals, fmt) {
    var perDay = vals.n_obj, sizeMB = vals.n_size, procS = vals.n_proc, peakR = vals.n_peak;
    var avg = perDay / 86400, peak = avg * peakR, conc = peak * procS, conn = conc;
    var stDay = perDay * sizeMB / 1e6, stYr = stDay * 365, puts = perDay, putCost = puts / 1000 * 0.005;
    return [
      { k: 'Average throughput', v: fmt.n(avg), u: '/s', n: 'objects/day \u00F7 86,400 seconds', over: false },
      { k: 'Peak throughput', v: fmt.n(peak), u: '/s', n: 'average \u00D7 ' + fmt.n(peakR) + ' peak ratio', over: false },
      { k: 'Lambda concurrency at peak', v: fmt.n(conc), u: '', n: conc > 1000 ? 'exceeds the 1,000 default \u2014 RDS Proxy, or buffer through SQS' : 'peak/s \u00D7 processing time \u2014 within the 1,000 default', over: conc > 1000 },
      { k: 'DB connections at peak', v: fmt.n(conn), u: '', n: conn > 100 ? 'far past a Postgres pool (~100) \u2014 needs RDS Proxy or a queue' : '\u2248 one connection per invocation \u2014 a pool can hold this', over: conn > 100 },
      { k: 'Storage written / day', v: fmt.tb(stDay).split(' ')[0], u: fmt.tb(stDay).split(' ')[1], n: fmt.tb(stYr) + ' per year of raw objects', over: false },
      { k: 'S3 PUTs / day', v: fmt.n(puts), u: '', n: '\u2248 $' + putCost.toFixed(2) + '/day in PUT requests alone', over: false }
    ];
  }
};
