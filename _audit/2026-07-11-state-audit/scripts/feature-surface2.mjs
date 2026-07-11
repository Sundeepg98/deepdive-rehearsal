import { chromium } from 'playwright';
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const SHOTS = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/shots/feature-surface';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on('pageerror', e => errs.push('PAGE-ERROR: ' + e.message));
await p.goto(URL, { waitUntil: 'load' });
await p.waitForTimeout(800);
await p.evaluate(() => window.IndexOverlay.close());
await p.waitForTimeout(400);

// A. cmpNotes coverage across all 46 topics (the companion-coaching map)
const cmp = await p.evaluate(() => {
  const VIEWS = ['walk','drill','wb','sys','trade','model','num','rf','open'];
  const rows = TopicRegistry.ids().map(id => {
    const t = TopicRegistry.get(id);
    const keys = Object.keys(t.identity.cmpNotes || {});
    return { id, title: t.identity.title, n: keys.length,
             missing: VIEWS.filter(v => !keys.includes(v)),
             walkLabel: (t.identity.cmpNotes.walk || [])[0] };
  });
  return {
    full9: rows.filter(r => r.n === 9).map(r => r.id),
    only2: rows.filter(r => r.n === 2).map(r => r.id),
    other: rows.filter(r => r.n !== 9 && r.n !== 2),
    sampleFull: rows.find(r => r.n === 9),
    sampleThin: rows.find(r => r.n === 2),
  };
});

// B. THE COMPANION GOES STALE: on a generated topic, walk -> trade must not change the coaching
await p.evaluate(() => TopicRegistry.setTopic('caching'));
await p.waitForTimeout(600);
const stale = [];
for (const v of ['walk','drill','wb','sys','trade','model','num','rf','open']) {
  await p.evaluate(t => window.Router.navigate(t), v);
  await p.waitForTimeout(180);
  stale.push(await p.evaluate(v => ({
    view: v,
    tabLabel: document.querySelector('.seg button.on span:not(.n)')?.textContent,
    cmpView: document.getElementById('cmpView')?.textContent,
    cmpNote: (document.getElementById('cmpNote')?.textContent || '').slice(0, 55),
  }), v));
}
await p.evaluate(() => window.Router.navigate('rf'));
await p.waitForTimeout(300);
await p.screenshot({ path: `${SHOTS}/companion-stale-caching-rf.png` });

// C. CRAM BODY: real content text (skip <style>), CP vs a generated topic
async function cramText() {
  await p.click('#cramopen'); await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-cram').shadowRoot;
    return {
      title: document.querySelector('#cramov .cram-title').textContent.trim(),
      oneLiner: (sr.querySelector('.cs-one')?.textContent || '').replace(/\s+/g,' ').trim().slice(0,150),
      firstSpine: (sr.querySelector('.cs-spine li')?.textContent || '').replace(/\s+/g,' ').trim(),
    };
  });
  await p.click('#cramx'); await p.waitForTimeout(400);
  return r;
}
async function scopeText() {
  await p.click('#scopeopen'); await p.waitForTimeout(450);
  const r = await p.evaluate(() => {
    const sr = document.querySelector('deep-scope').shadowRoot;
    return {
      sections: [...sr.querySelectorAll('.cs-st')].map(e => e.textContent.trim()),
      firstQ: (sr.querySelector('.cs-ha-l')?.textContent || '').trim(),
    };
  });
  await p.click('#scopex'); await p.waitForTimeout(400);
  return r;
}
const cramOnCaching = await cramText();
const scopeOnCaching = await scopeText();
await p.evaluate(() => TopicRegistry.setTopic('content-pipeline'));
await p.waitForTimeout(600);
const cramOnCP = await cramText();
const scopeOnCP = await scopeText();

// D. Bare-hash default-topic mismatch: registry boot topic vs router's ids()[0]
const routerDefault = await p.evaluate(() => ({
  bootCurrent: 'content-pipeline (first REGISTERED, per app.js include order)',
  idsFirst: TopicRegistry.ids()[0],
  registrationOrderFirst: 'content-pipeline',
}));
// deep-link a bare #walk in a fresh page and see which topic loads
const p2 = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p2.goto(URL + '#walk', { waitUntil: 'load' });
await p2.waitForTimeout(900);
const bareHash = await p2.evaluate(() => ({
  hash: location.hash,
  topic: TopicRegistry.current().id,
  h1: document.querySelector('.hdr h1').textContent.trim(),
}));
// now: on event-driven (ids[0]) what does Copy link produce?
await p2.evaluate(() => TopicRegistry.setTopic('event-driven'));
await p2.waitForTimeout(500);
const edLink = await p2.evaluate(() => ({ hash: location.hash, topic: TopicRegistry.current().id, h1: document.querySelector('.hdr h1').textContent.trim() }));
await p2.close();

// E. Print Q&A + tour + cross-drill reachability (do they open?)
const reach = await p.evaluate(() => {
  const out = {};
  out.printQA = typeof window.PrintQA?.print === 'function';
  out.tourGuide = typeof window.TourGuide?.start === 'function';
  out.crossDrillPool = (() => { try { return true; } catch { return false; } })();
  return out;
});
// CrossDrill: only entry is inside the index overlay
await p.evaluate(() => window.CrossDrill.open('1'));
await p.waitForTimeout(500);
const xd = await p.evaluate(() => ({
  open: window.CrossDrill.isOpen(),
  title: document.querySelector('.xd-title')?.textContent,
  prog: document.querySelector('.xd-prog')?.textContent,
  from: document.querySelector('.xd-from')?.textContent,
}));
await p.screenshot({ path: `${SHOTS}/crossdrill-open.png` });
await p.evaluate(() => window.CrossDrill.close());
await p.waitForTimeout(300);

// F. Tour guide
await p.evaluate(() => window.TourGuide.start());
await p.waitForTimeout(700);
const tour = await p.evaluate(() => ({ active: window.TourGuide.isActive(), step: document.querySelector('.tg-step,.tour-step,[class*=tour]')?.className }));
await p.screenshot({ path: `${SHOTS}/tour-guide.png` });

console.log(JSON.stringify({ cmp, stale, cramOnCaching, cramOnCP, scopeOnCaching, scopeOnCP, routerDefault, bareHash, edLink, reach, xd, tour, errs }, null, 2));
await b.close();
