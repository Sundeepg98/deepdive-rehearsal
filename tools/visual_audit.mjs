// tools/visual_audit.mjs -- systematic visual capture of the app.
// Usage: CHROME=<path> PLAYWRIGHT_BROWSERS_PATH=<dir> node tools/visual_audit.mjs [outDir]
// Enumerates pane routes and overlays AT RUNTIME (ground truth, no hardcoded
// selectors beyond the topic-nav classes), then captures:
//   - topic dropdown open
//   - every pane route x N sample topics (+ mid-scroll for long panes)
//   - every overlay it can open (button-text probes + key probes)
//   - a mobile-width sample
// Output: PNGs + manifest.json in outDir. Pair with a contact-sheet step and
// human/model eyes -- this tool captures, it does not judge.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const APP = 'file://' + ROOT + '/deepdive_content_pipeline_rehearsal.html';
const OUT = resolve(process.argv[2] || '/home/claude/audit_shots');
mkdirSync(OUT, { recursive: true });
const TOPICS = ['Event-Driven Backbone', 'Probabilistic'];   // one legacy, one newest
const LONG_PANES = ['walk', 'answers', 'drill'];             // also capture mid-scroll
const OVERLAY_TAGS = ['deep-mock-run', 'deep-mixed-fire', 'deep-cram', 'deep-session',
  'deep-keyboard', 'deep-scope', 'deep-gameplan'];
const manifest = { shots: [], overlays: {}, routes: [], errors: [] };

const b = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox', '--disable-dev-shm-usage'] });

async function boot(viewport) {
  const p = await b.newPage({ viewport });
  p.on('pageerror', (e) => manifest.errors.push('PE:' + e.message.slice(0, 120)));
  await p.goto(APP, { waitUntil: 'load' });
  await p.waitForTimeout(2200);
  return p;
}
async function shot(p, name, opts = {}) {
  await p.screenshot({ path: OUT + '/' + name + '.png', ...opts });
  manifest.shots.push(name);
}
async function closeOverlays(p) {
  for (let i = 0; i < 4; i++) {
    const open = await p.evaluate(() => {
      const d = document.querySelector('[role=dialog].open, .ix-ov.open, .mock-ov.open, .cram-ov.open');
      return !!(d && d.offsetWidth > 40);
    });
    if (!open) return;
    await p.keyboard.press('Escape');
    await p.waitForTimeout(250);
  }
}
async function selectTopic(p, needle) {
  await closeOverlays(p);
  await p.evaluate(() => document.querySelector('.tn-trigger').click());
  await p.waitForTimeout(350);
  const ok = await p.evaluate((n) => {
    const it = [...document.querySelectorAll('.tn-item')].find((e) => e.textContent.includes(n));
    if (it) { it.click(); return true; }
    return false;
  }, needle);
  await p.waitForTimeout(600);
  return ok;
}

const page = await boot({ width: 1280, height: 900 });

// --- runtime route enumeration ---------------------------------------------
manifest.routes = await page.evaluate(() => {
  const hs = [...document.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute('href')).filter((h) => h && h.length > 2);
  return [...new Set(hs)];
});
if (manifest.routes.length < 5) {
  // ground truth from src/scripts/app/shell.js tabKeys (q..o)
  manifest.routes = ['#walk', '#drill', '#wb', '#sys', '#trade', '#model', '#num', '#rf', '#open'];
}

// --- topic dropdown open (nav itself is an audit surface) -------------------
await page.evaluate(() => document.querySelector('.tn-trigger').click());
await page.waitForTimeout(350);
await shot(page, '00_topic_dropdown');
await page.keyboard.press('Escape');

// --- panes x topics ----------------------------------------------------------
for (const t of TOPICS) {
  const short = t.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  if (!(await selectTopic(page, t))) { manifest.errors.push('topic not found: ' + t); continue; }
  for (const route of manifest.routes) {
    const tok = route.replace('#', '');
    try {
      await page.evaluate((r) => { location.hash = r; }, route);
      await page.waitForTimeout(650);
      await shot(page, `10_${short}_${tok}`);
      if (LONG_PANES.includes(tok)) {
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.45));
        await page.waitForTimeout(300);
        await shot(page, `10_${short}_${tok}_mid`);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await closeOverlays(page);
    } catch (e) { manifest.errors.push(tok + ': ' + e.message.slice(0, 80)); await closeOverlays(page); }
  }
}

// --- overlays: probe buttons by text, then keys ------------------------------
async function visibleOverlay(p) {
  return p.evaluate((tags) => {
    for (const t of tags) {
      const el = document.querySelector(t);
      if (el && el.offsetWidth > 40 && el.offsetHeight > 40) return t;
      if (el && el.shadowRoot) { const r = el.getBoundingClientRect(); if (r.width > 40) return t; }
    }
    const classic = document.querySelector('.mock-ov.open, .cram-ov.open, .ix-ov.open');
    if (classic && classic.offsetWidth > 40) return classic.className;
    return null;
  }, OVERLAY_TAGS);
}
const probes = [
  ...['Mock', 'Mixed', 'Cram', 'Session', 'Scope', 'Game', 'Plan', 'Keys', 'Keyboard'].map((t) => ({ kind: 'text', v: t })),
  ...['?', 'p', 'g', 'm', 'k', 's', '/'].map((k) => ({ kind: 'key', v: k })),
];
for (const probe of probes) {
  try {
    if (probe.kind === 'text') {
      const hit = await page.evaluate((t) => {
        const el = [...document.querySelectorAll('button, [role=button], a')]
          .find((e) => (e.textContent || '').trim().toLowerCase().startsWith(t.toLowerCase()));
        if (el) { el.click(); return true; }
        return false;
      }, probe.v);
      if (!hit) continue;
    } else {
      await page.keyboard.press(probe.v);
    }
    await page.waitForTimeout(450);
    const tag = await visibleOverlay(page);
    if (tag && !manifest.overlays[tag]) {
      manifest.overlays[tag] = probe.kind + ':' + probe.v;
      await shot(page, '20_overlay_' + tag.replace(/[^a-z-]/g, ''));
    }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
  } catch (e) { manifest.errors.push('probe ' + probe.v + ': ' + e.message.slice(0, 60)); }
}

// --- retry missing overlays with shadow-piercing probes ---------------------
const missing = OVERLAY_TAGS.filter((t) => !manifest.overlays[t]);
for (const term of ['mock', 'cram', 'run', 'sheet']) {
  if (!missing.some((t) => !manifest.overlays[t])) break;
  try {
    const hit = await page.evaluate((needle) => {
      const pools = [document];
      document.querySelectorAll('*').forEach((e) => { if (e.shadowRoot) pools.push(e.shadowRoot); });
      for (const root of pools) {
        const el = [...root.querySelectorAll('button, [role=button], a')]
          .find((e) => (e.textContent || '').trim().toLowerCase().includes(needle));
        if (el) { el.click(); return needle + ' -> ' + (el.textContent || '').trim().slice(0, 25); }
      }
      return null;
    }, term);
    if (!hit) continue;
    await page.waitForTimeout(500);
    const tag = await visibleOverlay(page);
    if (tag && !manifest.overlays[tag]) {
      manifest.overlays[tag] = 'shadow-probe:' + hit;
      await shot(page, '20_overlay_' + tag.replace(/[^a-z-]/g, ''));
    }
    await closeOverlays(page);
  } catch (e) { manifest.errors.push('retry ' + term + ': ' + e.message.slice(0, 60)); }
}
await page.close();

// --- mobile sample -----------------------------------------------------------
const m = await boot({ width: 390, height: 844 });
await shot(m, '30_mobile_walk');
await m.evaluate(() => { location.hash = '#drill'; });
await m.waitForTimeout(600);
await shot(m, '30_mobile_drill');
await m.evaluate(() => document.querySelector('.tn-trigger').click()); await m.waitForTimeout(350);
await shot(m, '30_mobile_dropdown');
await m.close();

await b.close();
writeFileSync(OUT + '/manifest.json', JSON.stringify(manifest, null, 1));
console.log('routes:', manifest.routes.join(' '));
console.log('overlays opened:', JSON.stringify(manifest.overlays));
console.log('shots:', manifest.shots.length, '| errors:', manifest.errors.length);
manifest.errors.slice(0, 6).forEach((e) => console.log('  err:', e));
