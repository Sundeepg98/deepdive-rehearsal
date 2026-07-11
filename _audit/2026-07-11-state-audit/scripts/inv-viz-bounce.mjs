// Prove/refute the MECHANISM of finding #2: the visual-pane bounce guard
// (visual-pane.js:35-40) fires at boot and navigates away from the deep-linked topic.
// Method: intercept window.goView the instant the bundle assigns it, log every call
// with a stack + timestamp. No source edits.
import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const b = await chromium.launch();
const out = {};

const SPY = `
  window.__NAV = [];
  let _g;
  Object.defineProperty(window, 'goView', {
    configurable: true,
    get() { return _g; },
    set(fn) {
      _g = function (t) {
        window.__NAV.push({ to: t, t: Math.round(performance.now()),
          fromTimer: /Timeout|setTimeout|<anonymous>/.test(new Error().stack.split('\\n')[2] || ''),
          stack: new Error().stack.split('\\n').slice(1, 4).map((s) => s.trim()).join(' | ') });
        return fn.apply(this, arguments);
      };
    },
  });
`;

for (const hash of ['kafka-internals/viz', 'kafka-internals/walk']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.addInitScript(SPY);
  await p.goto(BASE + '#' + hash, { waitUntil: 'load' });
  await p.waitForTimeout(2600);
  out[hash] = await p.evaluate(() => ({
    navCalls: window.__NAV,
    endHash: location.hash,
    seedTopicWasFirstRegistered: TopicRegistry.current() ? TopicRegistry.current().id : null,
  }));
  await ctx.close();
}

// What topic does a NO-HASH cold boot seed? (== the first register() call, per
// topic-protocol.js:104 `if (cur === null) cur = t.id`)
{
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(BASE, { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  out.noHashBootSeed = await p.evaluate(() => ({
    current: TopicRegistry.current().id,          // the SEED = first registered
    idsFirst: TopicRegistry.ids()[0],             // the SORTED curriculum head
    same: TopicRegistry.current().id === TopicRegistry.ids()[0],
  }));
  await ctx.close();
}
await b.close();
console.log(JSON.stringify(out, null, 1));
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-11-state-audit/scripts/_inv-viz-bounce.json', JSON.stringify(out, null, 1));
