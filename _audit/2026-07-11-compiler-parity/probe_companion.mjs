import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';
const mk = (v,n=3) => `### ${v}\n\n` + Array.from({length:n},(_,i)=>`Para ${i+1} for ${v}.`).join('\n\n') + '\n\n';
const md9 = `# T\n\n## Companion Notes\n\n` + ['walk','drill','wb','sys','trade','model','num','rf','open'].map(v=>mk(v)).join('');
const r9 = parseMarkdown(md9,{index:1,total:1});
console.log('PROBE 1 -- 9 views x 3 paras  => keys:', Object.keys(r9.identity.cmpNotes).join(' '));
console.log('   count:', Object.keys(r9.identity.cmpNotes).length, '| sys =', JSON.stringify(r9.identity.cmpNotes.sys));

const md2 = `# T\n\n## Companion Notes\n\n` + mk('walk',3) + mk('sys',2) + mk('num',4);
const r2 = parseMarkdown(md2,{index:1,total:1});
console.log('\nPROBE 2 -- walk=3, sys=2, num=4 paras => keys:', Object.keys(r2.identity.cmpNotes).join(' '));
console.log('   sys survived?', 'sys' in r2.identity.cmpNotes, '| num arity:', (r2.identity.cmpNotes.num||[]).length, '(want 3)');

const md3 = `# T\n\n## Companion Notes\n\n` + mk('Whiteboard',3) + mk('System Map',3);
const r3 = parseMarkdown(md3,{index:1,total:1});
console.log('\nPROBE 3 -- "### Whiteboard"/"### System Map" => keys:', JSON.stringify(Object.keys(r3.identity.cmpNotes)));
