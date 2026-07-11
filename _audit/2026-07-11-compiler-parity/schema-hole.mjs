// PROVE the schema floor is absent: build a parsed-topic object whose 5 lens panes are
// EMPTY (and whose wb/trade arrays are outright missing) and run the REAL validator on it.
// If it passes, the compiler cannot tell a full-depth topic from a hollow one.
import { validateTopic } from '../../tools/compiler/topic-schema.mjs';

const drillCards = Array.from({ length: 18 }, (_, i) => ({
  tier: ['SDE2', 'SDE3', 'Staff'][i % 3], signal: 's', q: 'q', a: 'a', f: [], senior: '',
}));

const hollow = {
  id: 'hollow', prefix: 'HOLLOW',
  identity: {
    index: 1, total: 1, locatorTail: 'x', group: 'data-storage', title: 't', h1: 't',
    thesis: 'th', sub: '', spine: [], cramTitle: 't', reportTitle: 't', companionTopic: 't', cmpNotes: {},
  },
  views: {
    drill: { cards: drillCards },
    walk: { steps: [] },
    sys: { stages: [], pivots: [] },
    model: { selectors: [] },
    bank: { mockBeats: [], curveballs: [], frames: [] },
    // --- the 5 lens panes, deliberately hollow ---
    wb: { /* steps: MISSING ENTIRELY */ foot: '', sub: '', okVerdict: '' },
    rf: { lead: '', flags: [] },                    // ZERO red flags
    trade: { lead: '' /* decisions: MISSING ENTIRELY */ },
    open: { cards: [] },                            // ZERO opener cards
    num: { lead: '', tell: '', inputs: [], compute: 'function (v, f) { return []; }' }, // ZERO metrics
  },
};

try {
  validateTopic(hollow, 'hollow');
  console.log('*** VALIDATOR PASSED A HOLLOW TOPIC ***');
  console.log('    wb.steps        : MISSING ENTIRELY  -> accepted');
  console.log('    trade.decisions : MISSING ENTIRELY  -> accepted');
  console.log('    rf.flags        : []                -> accepted');
  console.log('    open.cards      : []                -> accepted');
  console.log('    num.inputs      : []                -> accepted (compute returns [] rows)');
  console.log('\n    The ONLY populated-ness floor in the whole schema is drill.min(18) (topic-schema.mjs:40).');
} catch (e) {
  console.log('validator REJECTED it:\n' + e.message);
}

// Now show what the app does with wb.steps missing: whiteboard.js:136 does d.steps.map(...)
console.log('\n--- consequence: whiteboard.js:136 renderTopic does `d.steps.map(...)` ---');
try { (hollow.views.wb.steps).map(x => x); } catch (e) { console.log('    runtime: ' + e.constructor.name + ': ' + e.message + '  <-- would throw on first tab click'); }
