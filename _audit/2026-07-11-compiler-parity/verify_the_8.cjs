#!/usr/bin/env node
/*
 * verify_the_8.cjs -- "THE 8 MUST KEEP WORKING" is a constraint, so it gets a measurement.
 *
 * Loads the OLD committed deliverable and the NEW build in a real browser, reads every one of the
 * 8 hand-coded topics out of the live TopicRegistry, and compares their data byte-for-byte. Also
 * renders the walkthrough pane for each (the one shared component this change touched) and diffs
 * the produced DOM.
 *
 * A parser fix cannot reach the 8 in principle -- they are hand-written JS, they never enter the
 * compiler. But the RENDERER fix (walkthrough/logic.js, multi-block steps) is shared by all 46,
 * and "in principle" is not evidence.
 *
 *   node _audit/2026-07-11-compiler-parity/verify_the_8.cjs <old.html> <new.html>
 */
const path = require('path');
const { chromium } = require('playwright');

const OLD = path.resolve(process.argv[2]);
const NEW = path.resolve(process.argv[3]);
const THE_8 = ['content-pipeline', 'signing', 'authz', 'aws-hardening', 'notifications', 'eav', 'desired-state', 'iac'];

async function snap(browser, file) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e.message)));
  await page.goto('file://' + file);
  await page.waitForTimeout(400);
  const out = await page.evaluate((ids) => {
    const res = { topics: {}, walkDom: {}, all: [] };
    res.all = TopicRegistry.ids();
    ids.forEach((id) => {
      const t = TopicRegistry.get(id);
      res.topics[id] = JSON.stringify({ identity: t.identity, data: t.data });
    });
    return res;
  }, THE_8);

  // Render the walkthrough pane (the shared component this change touched) for each of the 8,
  // stepping through EVERY step, and capture the shadow DOM it produces.
  for (const id of THE_8) {
    out.walkDom[id] = await page.evaluate((topicId) => {
      const el = document.createElement('deep-walkthrough');
      document.body.appendChild(el);
      const t = TopicRegistry.get(topicId);
      el.renderTopic ? el.renderTopic(t.data.walk) : null;
      const root = el.shadowRoot;
      const frames = [];
      const n = t.data.walk.steps.length;
      for (let i = 0; i < n; i++) {
        el._wi = i; el._renderW();
        frames.push(root.getElementById('wcard').innerHTML);
      }
      el.remove();
      return frames.join('\n@@STEP@@\n');
    }, id);
  }
  await page.close();
  return { out, errs };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
  const a = await snap(browser, OLD);
  const b = await snap(browser, NEW);
  await browser.close();

  let bad = 0;
  console.log('THE 8 -- hand-coded topics, OLD deliverable vs NEW build\n');
  console.log('  ' + 'topic'.padEnd(20) + 'data'.padEnd(14) + 'walk DOM (every step)');
  console.log('  ' + '-'.repeat(58));
  for (const id of THE_8) {
    const dataSame = a.out.topics[id] === b.out.topics[id];
    const domSame = a.out.walkDom[id] === b.out.walkDom[id];
    if (!dataSame || !domSame) bad++;
    console.log('  ' + id.padEnd(20) + (dataSame ? 'identical' : 'CHANGED').padEnd(14) + (domSame ? 'identical' : 'CHANGED'));
    if (!dataSame) {
      const x = a.out.topics[id], y = b.out.topics[id];
      let i = 0; while (i < x.length && x[i] === y[i]) i++;
      console.log('        first data delta @' + i + ':\n          old: ' + JSON.stringify(x.slice(i - 60, i + 90)) + '\n          new: ' + JSON.stringify(y.slice(i - 60, i + 90)));
    }
    if (!domSame) {
      const x = a.out.walkDom[id], y = b.out.walkDom[id];
      let i = 0; while (i < x.length && x[i] === y[i]) i++;
      console.log('        first DOM delta @' + i + ':\n          old: ' + JSON.stringify(x.slice(i - 60, i + 90)) + '\n          new: ' + JSON.stringify(y.slice(i - 60, i + 90)));
    }
  }
  console.log('\n  topics registered: old ' + a.out.all.length + ', new ' + b.out.all.length);
  console.log('  page errors: old ' + a.errs.length + ', new ' + b.errs.length);
  if (a.errs.length) console.log('    OLD: ' + a.errs.join('; '));
  if (b.errs.length) console.log('    NEW: ' + b.errs.join('; '));

  const fail = bad || b.errs.length || a.out.all.length !== b.out.all.length;
  console.log('\n' + (fail
    ? 'THE 8: REGRESSED -- ' + bad + ' topic(s) changed'
    : 'THE 8: INTACT -- data byte-identical, walkthrough DOM byte-identical across every step, 0 page errors'));
  process.exit(fail ? 1 : 0);
})();
