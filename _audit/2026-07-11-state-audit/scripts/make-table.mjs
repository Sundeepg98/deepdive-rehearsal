import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/topic-inventory.json', 'utf8'));
const LEGACY = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];
const GL = Object.fromEntries(j.groups.map(g => [g.id, g.label]));
const rows = j.rows.slice().sort((a, b) => j.order.indexOf(a.id) - j.order.indexOf(b.id));

const line = [];
line.push('| # | id | Title | Group | Source | Drill (SDE2/SDE3/Staff) | walk | wb | sys stages | sys pivots | trade | model | num | rf | open | bank CB/MB | Visual | Quality |');
line.push('|---|----|-------|-------|--------|------------------------|------|----|-----------|-----------|-------|-------|-----|----|------|-----------|--------|---------|');
rows.forEach(r => {
  const leg = LEGACY.includes(r.id);
  const t = r.tiers;
  const split = `${r.drillCards} (${t.SDE2 || 0}/${t.SDE3 || 0}/${t.Staff || 0}${t.EXTEND ? '/+' + t.EXTEND : ''})`;
  const flags = [];
  if (!leg) {
    flags.push('SYS-CHAIN EMPTY');
    flags.push('no closer');
    flags.push('rail notes 2/9');
  }
  line.push(`| ${r.index} | \`${r.id}\` | ${r.title} | ${GL[r.group]} | ${leg ? 'legacy dir' : 'markdown'} | ${split} | ${r.walkSteps} | ${r.wbSteps} | **${r.sysStages}** | ${r.sysPivots} | ${r.tradeDecisions} | ${r.modelAnswers} | ${r.numInputs} | ${r.rfFlags} | ${r.openCards} | ${r.bankCurveballs}/${r.bankMockBeats} | ${r.hasVisual ? '**YES**' : '-'} | ${flags.length ? flags.join(', ') : 'full-depth'} |`);
});
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/_table.md', line.join('\n'));

// summary stats
const md = rows.filter(r => !LEGACY.includes(r.id)), lg = rows.filter(r => LEGACY.includes(r.id));
const avg = (a, k) => (a.reduce((s, r) => s + r[k], 0) / a.length).toFixed(1);
console.log('CLASS         n   walk  wb   sysStg sysPiv trade model num  rf   open bankCB bankMB');
for (const [nm, a] of [['legacy dir', lg], ['markdown  ', md]]) {
  console.log(nm.padEnd(13), String(a.length).padStart(2),
    avg(a, 'walkSteps').padStart(5), avg(a, 'wbSteps').padStart(4), avg(a, 'sysStages').padStart(5),
    avg(a, 'sysPivots').padStart(6), avg(a, 'tradeDecisions').padStart(5), avg(a, 'modelAnswers').padStart(5),
    avg(a, 'numInputs').padStart(4), avg(a, 'rfFlags').padStart(4), avg(a, 'openCards').padStart(4),
    avg(a, 'bankCurveballs').padStart(6), avg(a, 'bankMockBeats').padStart(6));
}
console.log('');
const gc = {};
rows.forEach(r => { gc[GL[r.group]] = (gc[GL[r.group]] || 0) + 1; });
console.log('GROUPS:', Object.entries(gc).map(([k, v]) => `${k}=${v}`).join(', '), '| total', rows.length);
console.log('DRILL CARDS TOTAL:', rows.reduce((s, r) => s + r.drillCards, 0));
console.log('TIER SPLIT: markdown all 7/7/7 =', md.every(r => r.tiers.SDE2 === 7 && r.tiers.SDE3 === 7 && r.tiers.Staff === 7),
  '| legacy 5/11/5-ish =', lg.map(r => `${r.tiers.SDE2}/${r.tiers.SDE3}/${r.tiers.Staff}`).join(' '));
