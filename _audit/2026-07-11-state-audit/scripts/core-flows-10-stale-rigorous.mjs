/* LENS: core flows — RIGOROUS stale-content certification.
   Coarse "text changed" can mask PARTIAL staleness. So: for each pane, derive the
   INVARIANT skeleton (text nodes common to every topic's render), then for each
   topic-pair check that no NON-invariant fragment of topic A survives into topic B. */
import { chromium } from 'playwright';

const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE-ERROR: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => IndexOverlay.close());
await p.waitForTimeout(400);

const PANES = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'];
const TOPICS = ['content-pipeline', 'caching', 'kafka-internals', 'saga', 'rate-limiting', 'idempotency', 'observability', 'multi-tenant', 'sharding-strategies', 'feature-flags'];

// collect TEXT NODES (natural fragments), skipping <style>
async function frags() {
  return await p.evaluate((PANES) => {
    const out = {};
    for (const id of PANES) {
      const host = document.querySelector('#' + id + ' > *');
      const set = [];
      if (host && host.shadowRoot) {
        const walk = document.createTreeWalker(host.shadowRoot, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = walk.nextNode())) {
          if (n.parentNode && n.parentNode.nodeName === 'STYLE') continue;
          const t = (n.nodeValue || '').replace(/\s+/g, ' ').trim();
          if (t.length >= 18) set.push(t);   // long enough to be content, not chrome glyphs
        }
      }
      out[id] = set;
    }
    // light DOM identity too
    out.__light = {
      h1: (document.querySelector('.hdr h1') || {}).textContent,
      sub: (document.querySelector('.hdr .sub') || {}).textContent,
      thesis: (document.querySelector('.cmp-thesis') || {}).textContent,
      spine: [...document.querySelectorAll('.cmp-spine li')].map(x => x.textContent.trim()),
      cram: (document.querySelector('.cram-title') || {}).textContent,
      cmpNote: (document.getElementById('cmpNote') || {}).textContent,
    };
    out.__id = TopicRegistry.current().id;
    return out;
  }, PANES);
}

const snaps = {};
for (const t of TOPICS) {
  await p.evaluate((id) => TopicRegistry.setTopic(id), t);
  await p.waitForTimeout(650);
  snaps[t] = await frags();
}

// invariant = fragments present in EVERY topic's render of that pane (the skeleton)
const invariant = {};
for (const pane of PANES) {
  const sets = TOPICS.map(t => new Set(snaps[t][pane]));
  invariant[pane] = new Set([...sets[0]].filter(f => sets.every(s => s.has(f))));
}
console.log('########## INVARIANT SKELETON per pane (fragments identical across all 10 topics) ##########');
for (const pane of PANES) console.log(`  ${pane.padEnd(6)} ${String(invariant[pane].size).padStart(3)} invariant fragments / ${snaps[TOPICS[0]][pane].length} total in topic 1`);

console.log('\n########## LEAK TEST: does any TOPIC-SPECIFIC fragment of topic A survive into topic B? ##########');
let leaks = 0, checked = 0;
for (let i = 0; i < TOPICS.length; i++) {
  for (let j = 0; j < TOPICS.length; j++) {
    if (i === j) continue;
    const A = TOPICS[i], B = TOPICS[j];
    for (const pane of PANES) {
      const aSpecific = snaps[A][pane].filter(f => !invariant[pane].has(f));
      const bSet = new Set(snaps[B][pane]);
      const survived = aSpecific.filter(f => bSet.has(f));
      checked++;
      if (survived.length) {
        // a fragment can legitimately be shared by 2 topics (same phrasing). Only flag if
        // the fragment is genuinely distinctive: long and not present in a 3rd topic.
        const distinctive = survived.filter(f => {
          const others = TOPICS.filter(t => t !== A && t !== B);
          const inOthers = others.filter(t => new Set(snaps[t][pane]).has(f)).length;
          return f.length >= 40 && inOthers === 0;
        });
        if (distinctive.length) {
          leaks++;
          console.log(`  LEAK ${A} -> ${B} in pane "${pane}": ${distinctive.length} fragment(s)`);
          distinctive.slice(0, 2).forEach(f => console.log(`      "${f.slice(0, 90)}"`));
        }
      }
    }
  }
}
console.log(`\n  ${checked} (topic-pair x pane) combinations checked -> ${leaks} leaks`);
console.log(`  >>> PANE STALENESS ACROSS TOPIC SWITCH: ${leaks === 0 ? 'NONE — the TopicPane contract holds' : '*** ' + leaks + ' LEAKS ***'}`);

console.log('\n########## LIGHT-DOM identity: does every topic get its own header/thesis/spine/cram? ##########');
const seenH1 = {}, seenThesis = {}, seenSpine = {};
for (const t of TOPICS) {
  const L = snaps[t].__light;
  console.log(`  ${t.padEnd(22)} h1="${String(L.h1).slice(0, 30)}" cram="${String(L.cram).slice(0, 34)}" spine=${L.spine.length} items`);
  seenH1[L.h1] = (seenH1[L.h1] || 0) + 1;
  seenThesis[L.thesis] = (seenThesis[L.thesis] || 0) + 1;
  seenSpine[JSON.stringify(L.spine)] = (seenSpine[JSON.stringify(L.spine)] || 0) + 1;
}
const dupH1 = Object.entries(seenH1).filter(([, n]) => n > 1);
const dupTh = Object.entries(seenThesis).filter(([, n]) => n > 1);
const dupSp = Object.entries(seenSpine).filter(([, n]) => n > 1);
console.log('  duplicate h1 across topics    :', dupH1.length ? '*** ' + JSON.stringify(dupH1.map(x => x[0])) : 'none — all unique OK');
console.log('  duplicate thesis across topics:', dupTh.length ? '*** ' + JSON.stringify(dupTh.map(x => String(x[0]).slice(0, 40))) : 'none — all unique OK');
console.log('  duplicate spine across topics :', dupSp.length ? '*** ' + dupSp.length + ' dup groups' : 'none — all unique OK');

console.log('\n--- ERRORS (' + errs.length + ') ---');
errs.forEach(e => console.log(e));
await b.close();
