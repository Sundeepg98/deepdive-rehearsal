import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport:{width:1440,height:900} });
await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html',{waitUntil:'load'});
await p.waitForTimeout(2200);
const r = await p.evaluate(() => {
  const ids = TopicRegistry.ids();
  const withViz = ids.filter(id => { const t = TopicRegistry.get(id); const v = t && t.data && t.data.viz;
    return v && (Array.isArray(v) ? v.length : Object.keys(v||{}).length); });
  return { total: ids.length, withViz: withViz.length, sample: withViz.slice(0,5) };
});
console.log(JSON.stringify(r,null,2));
await b.close();
