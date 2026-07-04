/* topics/desired-state/num.js -- topic 7 numbers. inputs[] (4 sliders) + compute(vals,fmt)
   returning 6 rows; row 0 is the headline with over:true (the reconcile rate the loop must
   absorb). n-strings and units carry single-backslash \u00D7 / \u2014. Pure arithmetic; fmt.n
   rounds+locales. 7-bit ASCII. */
var TOPIC_DS_NUM = {
  lead:'The estimation for a reconciler isn\u2019t \u201Chow much config\u201D \u2014 it\u2019s the <b>reconcile rate</b> the loop must absorb and how much of it is a cheap no-op. Devices \u00D7 check-in frequency is the throughput; drift is the rare exception the deploys serve.',
  tell:'Lead with the reconcile rate \u2014 fleet over check-in interval \u2014 then show that most reconciles are no-ops confirming convergence, which is why the three-hash diff must be trivial and only the rare drifted device needs a lock and a deploy. The full-sweep cost is why you go event-driven.',
  inputs:[
    { id:'n_devices', label:'Devices per tenant', value:10000, min:100, step:100 },
    { id:'n_tenants', label:'Tenants', value:50, min:1, step:1 },
    { id:'n_checkin_min', label:'Check-in interval (min)', value:5, min:1, step:1 },
    { id:'n_change_pct', label:'Devices drifted per cycle (%)', value:2, min:1, step:1 }
  ],
  compute:function(vals, fmt){
    var D = vals.n_devices, T = vals.n_tenants, C = vals.n_checkin_min, p = vals.n_change_pct/100;
    var fleet = D * T;
    var events = fleet / (C * 60);
    var deploys = events * p;
    var noops = events * (1 - p);
    var perTenant = events / T;
    var sweep = fleet;
    return [
      { k:'Reconcile events/sec (platform)', v:fmt.n(events), u:'events/s', n:'fleet \u00D7 check-in frequency \u2014 each device report triggers a reconcile; this is the loop\u2019s steady throughput.', over:true },
      { k:'Total fleet (devices \u00D7 tenants)', v:fmt.n(fleet), u:'devices', n:'the population the loop keeps converged \u2014 the reconcile rate scales with it.' },
      { k:'Deploys/sec (only drifted devices)', v:fmt.n(deploys), u:'deploys/s', n:'drift is the exception \u2014 most reconciles confirm convergence, so actual config pushes are rare.' },
      { k:'No-op reconciles/sec (converged)', v:fmt.n(noops), u:'reconciles/s', n:'the cheap common path \u2014 this is why the three-hash diff must be trivial and read-only.' },
      { k:'Reconciles/sec per tenant', v:fmt.n(perTenant), u:'per tenant/s', n:'the per-tenant lock must absorb this \u2014 sub-partition (per-site) if one tenant\u2019s rate runs far higher.' },
      { k:'Full-sweep re-diff cost', v:fmt.n(sweep), u:'diffs', n:'what a periodic sweep touches \u2014 event-driven does the small rate instead; the sweep is only a backstop.' }
    ];
  }
};
