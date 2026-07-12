import { chromium } from 'playwright';
import fs from 'fs';

const AFTER = 'D:/claude-workspace/deepdive-rehearsal/dist/index.html';
const BEFORE = 'D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/BEFORE.html';
const TOPICS = {
  'messaging-events': 'event-driven', 'data-storage': 'caching', 'reliability-observability': 'retries-timeouts',
  'platform-infra': 'iac', 'architecture-apis': 'state-machine', 'security-tenancy': 'signing',
};
const relLum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const CR = (a, b) => { const L1 = relLum(a), L2 = relLum(b); const [h, l] = L1 > L2 ? [L1, L2] : [L2, L1]; return (h + .05) / (l + .05); };
const P = s => { const m = (s || '').match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2]] : null; };

const br = await chromium.launch();
const rows = [];

for (const [build, path] of [['BEFORE', BEFORE], ['AFTER', AFTER]]) {
  const p = await (await br.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('file:///' + path);
  await p.waitForTimeout(2000);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);

  for (const theme of ['light', 'dark']) {
    for (const [g, topic] of Object.entries(TOPICS)) {
      await p.evaluate(t => { location.hash = '#' + t + '/drill'; }, topic);
      await p.waitForTimeout(800);
      await p.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await p.waitForTimeout(350);

      const s = await p.evaluate(() => {
        const pick = re => [...document.querySelectorAll('button,a')].find(e => re.test((e.innerText || '').trim()) && e.getBoundingClientRect().width > 60);
        const rd = pick(/^Reveal answer/i);
        const mk = pick(/Mock run/i);
        const grab = e => { if (!e) return null; const c = getComputedStyle(e); const r = e.getBoundingClientRect(); return { fg: c.color, bg: c.backgroundColor, bgImg: (c.backgroundImage || 'none').slice(0, 60), fs: c.fontSize, fw: c.fontWeight, w: Math.round(r.width), h: Math.round(r.height) }; };
        return { reveal: grab(rd), mock: grab(mk) };
      });

      for (const [label, o] of Object.entries(s)) {
        if (!o) continue;
        const fg = P(o.fg), bg = P(o.bg);
        const gradient = o.bgImg !== 'none' && /gradient/.test(o.bgImg);
        const ratio = (fg && bg && !/rgba\(0, 0, 0, 0\)/.test(o.bg)) ? +CR(fg, bg).toFixed(2) : null;
        rows.push({ build, theme, group: g, el: label, fg: o.fg, bg: o.bg, gradient, ratio, AA: ratio ? ratio >= 4.5 : null, AA_large: ratio ? ratio >= 3 : null, size: `${o.fs}/${o.fw}`, box: `${o.w}x${o.h}` });
      }
    }
  }
  await p.close();
}
fs.writeFileSync('D:/claude-workspace/deepdive-rehearsal/_audit/2026-07-12-preflight/cta.json', JSON.stringify(rows, null, 2));

console.log('=== PRIMARY CTA CONTRAST (text on the room-coloured slab) ===\n');
for (const build of ['BEFORE', 'AFTER']) {
  for (const theme of ['light', 'dark']) {
    console.log(`--- ${build} / ${theme} ---`);
    rows.filter(r => r.build === build && r.theme === theme).forEach(r => {
      const flag = r.ratio == null ? 'n/a ' : (r.AA ? 'PASS' : (r.AA_large ? 'FAIL-AA (ok large)' : 'FAIL'));
      console.log(`  ${r.el.padEnd(7)} ${r.group.padEnd(26)} ${String(r.ratio ?? '-').padStart(5)}:1  ${flag.padEnd(18)} ${r.gradient ? 'gradient' : 'flat'}  ${r.size}  ${r.box}`);
    });
  }
}
const fails = rows.filter(r => r.ratio && !r.AA);
console.log(`\nCTA text failing WCAG AA 4.5:1 -> ${fails.length} / ${rows.filter(r => r.ratio).length}`);
await br.close();
