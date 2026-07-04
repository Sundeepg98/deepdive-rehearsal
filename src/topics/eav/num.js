/* topics/eav/num.js -- topic 6 numbers. inputs[] (4 sliders) + compute(vals,fmt) returning
   6 rows; row 0 is the headline with over:true (the EAV row explosion). n-strings and units
   carry single-backslash \u00D7 / \u2014. Pure arithmetic; fmt.n rounds+locales. 7-bit ASCII. */
var TOPIC_EAV_NUM = {
  lead:'The estimation for an attribute store isn\u2019t \u201Chow much data\u201D \u2014 it\u2019s the <b>row explosion you avoid</b> and the <b>pivot you pay</b>. Entities \u00D7 attributes is the dense table EAV never materializes; sparseness and opt-in indexing are what keep it cheap.',
  tell:'Lead with the cartesian product \u2014 entities \u00D7 attributes \u2014 then show sparseness collapsing it: only overrides are stored, so the table tracks deviation, not the product. The number that bites is per-entity reconstruction \u2014 fetch the override rows in one query and pivot, and cache the hot list views.',
  inputs:[
    { id:'n_entities', label:'Entities (devices)', value:50000, min:1000, step:1000 },
    { id:'n_attributes', label:'Attributes defined', value:200, min:10, step:10 },
    { id:'n_override_pct', label:'Values overridden (%)', value:15, min:1, step:1 },
    { id:'n_searchable', label:'Searchable attributes', value:10, min:1, step:1 }
  ],
  compute:function(vals, fmt){
    var E = vals.n_entities, A = vals.n_attributes, p = vals.n_override_pct/100, S = vals.n_searchable;
    var potential = E * A;
    var actual = potential * p;
    var avoided = potential - actual;
    var perEntity = A * p;
    var idx = E * S * p;
    var listView = 500 * A * p;
    return [
      { k:'Potential rows: entities \u00D7 attributes', v:fmt.n(potential), u:'rows', n:'the dense cartesian product \u2014 every device setting every value. EAV never materializes this.', over:true },
      { k:'Actual value rows (overrides only)', v:fmt.n(actual), u:'rows', n:'sparse \u2014 most devices run the default, so you store roughly the override fraction of the product.' },
      { k:'Rows avoided by sparseness', v:fmt.n(avoided), u:'rows', n:'the sparseness win \u2014 defaults live once on the definition, not as a row per device.' },
      { k:'Override rows to pivot, per entity', v:fmt.n(perEntity), u:'rows/entity', n:'one query fetches these, then pivot once \u2014 never a query per attribute (that\u2019s the N+1).' },
      { k:'Searchable partial-index entries', v:fmt.n(idx), u:'entries', n:'the partial index covers only the searchable few \u2014 not all entities \u00D7 attributes values.' },
      { k:'List view: 500 devices, rows pivoted', v:fmt.n(listView), u:'rows', n:'each page load pivots this \u2014 the hot path to cache, invalidated by CDC.' }
    ];
  }
};
