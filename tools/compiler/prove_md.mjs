// Proof: pure-markdown source -> parsed data == hand-authored module data.
import fs from 'node:fs';
import { parseMarkdown } from './parse_md.mjs';

const g={};
eval(fs.readFileSync('src/topics/notifications/identity.js','utf8').replace('var TOPIC_NOTIF_IDENTITY','g.ID'));
eval(fs.readFileSync('src/topics/notifications/walk.js','utf8').replace('var TOPIC_NOTIF_WALK','g.WALK'));

const out=parseMarkdown(fs.readFileSync('tools/compiler/samples/notifications.md','utf8'),{index:5,total:8});

let pass=0,fail=0;
const eq=(n,a,b)=>{const ok=JSON.stringify(a)===JSON.stringify(b);ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);if(!ok){console.log('   want: '+JSON.stringify(b));console.log('   got : '+JSON.stringify(a));}};

console.log('-- identity --');
for(const f of ['index','total','locatorTail','group','title','h1','cramTitle','reportTitle','companionTopic','sub','thesis']) eq('identity.'+f,out.identity[f],g.ID[f]);
eq('identity.spine',out.identity.spine,g.ID.spine);
eq('identity.cmpNotes.walk',out.identity.cmpNotes.walk,g.ID.cmpNotes.walk);
eq('identity.cmpNotes.drill',out.identity.cmpNotes.drill,g.ID.cmpNotes.drill);

console.log('-- walk steps 1-2 (content fields) --');
for(let s=0;s<2;s++) for(const f of ['t','flow','ins','deep','cap','code']) if(g.WALK.steps[s][f]!==undefined) eq(`walk.step${s+1}.${f}`,out.views.walk.steps[s][f],g.WALK.steps[s][f]);

console.log(`\nMarkdown-parser data-equivalence: ${pass} pass, ${fail} fail`);
process.exit(fail===0?0:1);
