const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await pg.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html');
  await pg.waitForTimeout(1500);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.evaluate(() => { const o=document.getElementById('_index-overlay'); if(o){o.classList.remove('open','vis'); o.style.display='none';} });
  const ids  = await pg.evaluate(() => TopicRegistry.ids());
  const tabs = await pg.evaluate(() => [...document.querySelectorAll('button[data-tab]')].map(b=>b.dataset.tab));
  console.log('tabs:', tabs.join(' '));
  const hits = [];
  for (const id of ids) {
    await pg.evaluate((i) => TopicRegistry.setTopic(i), id);
    for (const tab of tabs) {
      await pg.evaluate((t) => document.querySelector(`button[data-tab="${t}"]`).click(), tab);
      await pg.waitForTimeout(60);
      const found = await pg.evaluate(() => {
        const res = [];
        const walk = (root, path) => {
          for (const el of root.querySelectorAll('*')) {
            if (el.shadowRoot) walk(el.shadowRoot, path + '>' + el.tagName.toLowerCase());
            for (const n of el.childNodes) {
              if (n.nodeType === 3 && /\bundefined\b/.test(n.nodeValue)) {
                const off = el.offsetParent !== null || el.getClientRects().length > 0;
                res.push({ sel: path + '>' + el.tagName.toLowerCase() + (el.id?'#'+el.id:'') + (el.className && typeof el.className==='string'?'.'+el.className.trim().split(/\s+/).join('.'):''),
                           txt: n.nodeValue.trim().slice(0,60), visible: off });
              }
            }
          }
        };
        walk(document, '');
        return res;
      });
      for (const f of found) hits.push({ topic: id, tab, ...f });
    }
  }
  console.log('\n=== literal "undefined" TEXT NODES across 46 topics x', tabs.length, 'panes ===');
  console.log('total hits:', hits.length);
  const byKey = {};
  for (const h of hits) { const k = h.tab + ' | ' + h.sel; (byKey[k] ||= []).push(h.topic); }
  for (const [k, tps] of Object.entries(byKey)) {
    const ex = hits.find(h => h.tab+' | '+h.sel === k);
    console.log(`\n  SITE: ${k}`);
    console.log(`    text    : "${ex.txt}"   visible=${ex.visible}`);
    console.log(`    topics  : ${tps.length} -> ${tps.slice(0,6).join(', ')}${tps.length>6?' ...':''}`);
  }
  if (!hits.length) console.log('  NONE FOUND anywhere.');
  await b.close();
})();
