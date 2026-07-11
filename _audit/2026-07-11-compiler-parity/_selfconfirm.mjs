import fs from 'fs';
import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';
// The equivalence assertion prove_md.mjs OMITS: parsed bank vs the hand-authored bank.
const g={}; eval(fs.readFileSync('src/topics/notifications/drill.js','utf8').replace('var TOPIC_NOTIF_DRILL','g.D'));
var NOTIF_CARDS=[],NOTIF_SPEAK=[];
eval(fs.readFileSync('src/topics/notifications/bank.js','utf8').replace('var TOPIC_NOTIF_BANK','g.B'));
const md = parseMarkdown(fs.readFileSync('tools/compiler/samples/notifications.md','utf8'),{index:5,total:8}).views.bank;
const hand = g.B;
let pass=0, fail=0;
const eq=(n,a,b)=>{const ok=JSON.stringify(a)===JSON.stringify(b); ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n+'   md='+JSON.stringify(a)+'  hand='+JSON.stringify(b));};
console.log('-- bank equivalence: samples/notifications.md  vs  src/topics/notifications/bank.js --');
eq('mockBeats.length', md.mockBeats.length, hand.mockBeats.length);
eq('curveballs.length', md.curveballs.length, hand.curveballs.length);
eq('frames.length', md.frames.length, hand.frames.length);
eq('beats with model', md.mockBeats.filter(b=>b.model).length, hand.mockBeats.filter(b=>b.model).length);
eq('beats with int',   md.mockBeats.filter(b=>b.int).length,   hand.mockBeats.filter(b=>b.int).length);
eq('beats with int2',  md.mockBeats.filter(b=>b.int2).length,  hand.mockBeats.filter(b=>b.int2).length);
console.log(`\nBank data-equivalence: ${pass} pass, ${fail} fail   <-- the assertion the gate never makes`);
