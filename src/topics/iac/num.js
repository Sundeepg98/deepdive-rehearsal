/* topics/iac/num.js -- topic 8 numbers. inputs[] (4 sliders) + compute(vals,fmt) returning 6
   rows; row 0 is the headline with over:true (blast radius -- resources per state file). n-strings
   and units carry single-backslash \u00D7 / \u2014. Pure arithmetic; fmt.n rounds+locales. 7-bit
   ASCII. */
var TOPIC_IAC_NUM = {
  lead:'The estimation for IaC isn\u2019t lines of config \u2014 it\u2019s <b>blast radius</b>: how many resources one apply can take down, and how long a plan takes. Resources per state file is the number, and it\u2019s why state granularity is a real decision, not a style choice.',
  tell:'Lead with blast radius \u2014 resources per state \u2014 then show the contrast: split state bounds both what a bad apply can damage and how long a plan takes, while one giant state means every change risks the whole environment and waits on the whole refresh.',
  inputs:[
    { id:'n_resources', label:'Resources per environment', value:800, min:50, step:50 },
    { id:'n_states', label:'State files per environment', value:8, min:1, step:1 },
    { id:'n_envs', label:'Environments', value:3, min:1, step:1 },
    { id:'n_plan_sec_per_100', label:'Plan seconds per 100 resources', value:20, min:1, step:1 }
  ],
  compute:function(vals, fmt){
    var R = vals.n_resources, S = vals.n_states, E = vals.n_envs, P = vals.n_plan_sec_per_100;
    var blast = R / S;
    var total = R * E;
    var giantBlast = R;
    var planSplit = (R / S) / 100 * P;
    var planGiant = R / 100 * P;
    var stateFiles = S * E;
    return [
      { k:'Blast radius (resources / state)', v:fmt.n(blast), u:'resources', n:'the most resources one bad apply can take down \u2014 this is why you split state by risk and change-rate.', over:true },
      { k:'Total managed resources', v:fmt.n(total), u:'resources', n:'the full estate across environments \u2014 the population under management, not the blast radius of any one change.' },
      { k:'Blast radius, one giant state', v:fmt.n(giantBlast), u:'resources', n:'no split \u2014 a single apply risks the whole environment; splitting into N states cuts this N-fold.' },
      { k:'Plan time per split state', v:fmt.n(planSplit), u:'seconds', n:'refresh + diff for one bounded state \u2014 fast, because plan only walks that state\u2019s resources.' },
      { k:'Plan time, one giant state', v:fmt.n(planGiant), u:'seconds', n:'every change waits on refreshing the whole environment \u2014 the plan-time cost of not splitting.' },
      { k:'State files across all envs', v:fmt.n(stateFiles), u:'state files', n:'each is a unit of locking, plan time, and blast radius \u2014 and can apply in parallel with the others.' }
    ];
  }
};
