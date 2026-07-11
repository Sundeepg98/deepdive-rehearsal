const { chromium } = require('playwright');
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const DEEP = `(sel) => {
  const out = [];
  const walk = (root) => {
    out.push(...root.querySelectorAll(sel));
    root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
  };
  walk(document);
  return out;
}`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.addInitScript(() => {
    window.__deep = (sel) => {
      const out = [];
      const walk = (root) => {
        out.push(...root.querySelectorAll(sel));
        root.querySelectorAll('*').forEach(e => { if (e.shadowRoot) walk(e.shadowRoot); });
      };
      walk(document);
      return out;
    };
  });
  const probe = async (topic, label) => {
    await p.goto(URL + '#' + topic + '/drill', { waitUntil: 'load' });
    await p.waitForTimeout(1000);
    const tn = await p.evaluate(() => {
      const e = window.__deep('#tiernote')[0];
      return e ? e.innerHTML : '(not found)';
    });
    let clicks = 0;
    for (let i = 0; i < 8; i++) {
      const found = await p.evaluate(() => {
        const a = window.__deep('#adv')[0];
        if (!a) return false; a.click(); return true;
      });
      if (!found) break; clicks++; await p.waitForTimeout(200);
    }
    const after = await p.evaluate(() => {
      const one = (s) => window.__deep(s)[0];
      const strip = (e) => e ? e.innerHTML.replace(/<div class="sl">[\s\S]*?<\/div>/, '').trim() : null;
      return {
        fu: window.__deep('.fu').length,
        senior: strip(one('.senior')),
        speak: strip(one('.speak')),
        mhp: window.__deep('.mhp-i').length,
        mhpCov: one('.mhp-cov') ? one('.mhp-cov').textContent.trim() : null,
      };
    });
    console.log('--- ' + label + '   (#' + topic + '/drill)');
    console.log('   #tiernote strip    : ' + JSON.stringify(String(tn).slice(0, 62)));
    console.log('   advance clicks     : ' + clicks + '  (= 1 + follow-ups)');
    console.log('   .fu follow blocks  : ' + after.fu);
    console.log('   .senior body       : ' + JSON.stringify(String(after.senior).slice(0, 50)));
    console.log('   .speak  body       : ' + JSON.stringify(String(after.speak).slice(0, 50)));
    console.log('   must-hit checkboxes: ' + after.mhp + '   [' + after.mhpCov + ']');
    console.log('');
  };
  await probe('content-pipeline', 'THE 8  (hand-coded JS)');
  await probe('idempotency',      'THE 38 (compiled .md)');
  await probe('kafka-internals',  'THE 38 (compiled .md)');
  await b.close();
})();
