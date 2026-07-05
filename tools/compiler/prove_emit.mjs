// Proof: emit(parsed) -> module JS -> eval -> data equal to parsed (round-trip); modules ASCII.
import fs from 'node:fs';
import { parseTopic } from './parse.mjs';
import { emit } from './emit.mjs';

const topic = parseTopic(fs.readFileSync('tools/compiler/samples/notifications.topic','utf8'), { index:5, total:8 });
const files = emit(topic);

let pass=0, fail=0;
const check=(n,c)=>{ c?pass++:fail++; console.log((c?'OK   ':'FAIL ')+n); };

for(const [name, body] of Object.entries(files)) check('ascii '+name, !/[^\x00-\x7F]/.test(body));

const g={};
eval(files['identity.js'].replace('var TOPIC_NOTIF_IDENTITY','g.ID'));
eval(files['walk.js'].replace('var TOPIC_NOTIF_WALK','g.WALK'));
check('identity round-trips', JSON.stringify(g.ID)===JSON.stringify(topic.identity));
check('walk round-trips', JSON.stringify(g.WALK)===JSON.stringify(topic.views.walk));

// register: eval identity+walk+register together so the vars share one scope
let captured=null;
const TopicRegistry={register:(x)=>{captured=x;}};
eval(files['identity.js'] + files['walk.js'] + files['register.js']);
check("register id='notifications'", captured && captured.id==='notifications');
check('register wires walk', captured && JSON.stringify(captured.data.walk)===JSON.stringify(topic.views.walk));

console.log('\nEmitter round-trip: '+pass+' pass, '+fail+' fail');
console.log('\n--- emitted register.js ---\n'+files['register.js']);
process.exit(fail===0?0:1);
