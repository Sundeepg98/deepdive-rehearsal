import fs from 'fs';
const OLD = (await import('../../tools/compiler/parse_md.mjs')).parseMarkdown;
const NEW = (await import('../../tools/compiler/_parse_md_FIXED.mjs')).parseMarkdown;
const files = fs.readdirSync('src/topics-md').filter(f=>f.endsWith('.md'));
let o={beats:0,model:0,int:0,int2:0,cvOK:0,cvTheme:new Set()}, n={beats:0,model:0,int:0,int2:0,cvOK:0,cvTheme:new Set()};
const tally=(t,bank)=>{ const mb=bank.mockBeats||[], cv=bank.curveballs||[];
  t.beats+=mb.length; t.model+=mb.filter(x=>x.model).length; t.int+=mb.filter(x=>x.int&&x.int.q&&x.int.a).length; t.int2+=mb.filter(x=>x.int2).length;
  cv.forEach(c=>{ t.cvTheme.add(c.theme); if(c.theme && c.theme!=='CURVEBALL' && !/\|/.test(c.cue)) t.cvOK++; }); };
for(const f of files){ const src=fs.readFileSync('src/topics-md/'+f,'utf8');
  tally(o, OLD(src).views.bank); tally(n, NEW(src).views.bank); }
const row=(k)=>String(k).padEnd(28);
console.log('=== PARSER OUTPUT OVER ALL 38 .md FILES ===');
console.log(row('metric'),'CURRENT'.padStart(8),'FIXED'.padStart(8),'RECOVERED'.padStart(10));
for(const k of ['beats','model','int','int2','cvOK']) console.log(row(k), String(o[k]).padStart(8), String(n[k]).padStart(8), String(n[k]-o[k]).padStart(10));
console.log('\ncurveball themes CURRENT:', [...o.cvTheme].slice(0,6), '(distinct:'+o.cvTheme.size+')');
console.log('curveball themes FIXED  :', [...n.cvTheme].slice(0,6), '(distinct:'+n.cvTheme.size+')');

const a = NEW(fs.readFileSync("src/topics-md/api-design.md","utf8")).views.bank;
console.log('\n=== api-design beat[0] AFTER FIX ===');
console.log('tag  :', a.mockBeats[0].tag);
console.log('cue  :', a.mockBeats[0].cue.slice(0,70));
console.log('task :', a.mockBeats[0].task.slice(0,70));
console.log('model:', (a.mockBeats[0].model||'(MISSING)').slice(0,70));
console.log('int.q:', (a.mockBeats[0].int?.q||'(MISSING)').slice(0,70));
console.log('int.a:', (a.mockBeats[0].int?.a||'(MISSING)').slice(0,70));
console.log('\n=== api-design curveball[0] AFTER FIX ===');
console.log('theme:', a.curveballs[0].theme);
console.log('cue  :', a.curveballs[0].cue.slice(0,70));
