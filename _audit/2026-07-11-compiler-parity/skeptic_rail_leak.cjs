#!/usr/bin/env node
/*
 * skeptic_rail_leak.cjs -- ISOLATED repro of the coaching-rail leak.
 *
 * shell.js:237   if (TOPIC_CMP_NOTES[tab]) { ...write the rail... }
 *                                          ^ no else. If THIS topic has no note for the ACTIVE
 * pane, the rail is never rewritten -- it keeps the last topic's note on screen. The 38 author
 * 2 companion notes out of 9 panes, so 7 panes out of 9 show a note that belongs to somebody else.
 *
 * The sequence below is what a user actually does: read a hand-coded topic, then switch to a
 * compiled one. Nothing exotic.
 */
const path = require('path');
const { chromium } = require('playwright');
const HTML = path.join(__dirname, '..', '..', 'dist', 'index.html');

const setTopic = async (p, id) => { await p.evaluate((i) => (window.TopicProtocol ? TopicProtocol.setTopic(i) : TopicRegistry.setTopic(i)), id); await p.waitForTimeout(200); };
const pane = async (p, t) => { await p.click(`.sidebar .seg button[data-tab="${t}"]`).catch(() => {}); await p.waitForTimeout(200); };
const railNote = (p) => p.evaluate(() => (document.getElementById('cmpNote').textContent || '').trim());

(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('file://' + HTML);
  await page.waitForTimeout(600);
  await page.evaluate(() => { if (window.IndexOverlay && IndexOverlay.isOpen && IndexOverlay.isOpen()) IndexOverlay.close(); });
  await page.waitForTimeout(300);

  const which = await page.evaluate(() => {
    const out = {};
    for (const id of TopicRegistry.ids()) out[id] = Object.keys(TopicRegistry.get(id).identity.cmpNotes || {});
    return out;
  });
  console.log('companion notes authored, by topic:');
  console.log('  notifications (hand-coded): [' + which.notifications.join(', ') + ']  = ' + which.notifications.length + '/9');
  console.log('  caching       (compiled)  : [' + which.caching.join(', ') + ']  = ' + which.caching.length + '/9');
  const missing = ['walk', 'drill', 'wb', 'sys', 'trade', 'model', 'num', 'rf', 'open'].filter((p) => !which.caching.includes(p));
  console.log('  panes where caching has NO note: ' + missing.join(', '));

  console.log('\n--- the repro: read notifications, then switch to caching ---');
  const victimPane = missing[0];
  await setTopic(page, 'notifications');
  await pane(page, victimPane);
  const noteA = await railNote(page);
  console.log('\n1. topic=notifications  pane=' + victimPane);
  console.log('   rail: ' + JSON.stringify(noteA.slice(0, 88)));

  await setTopic(page, 'caching');
  await pane(page, victimPane);
  const noteB = await railNote(page);
  console.log('\n2. topic=caching        pane=' + victimPane + '   (caching authors no note for this pane)');
  console.log('   rail: ' + JSON.stringify(noteB.slice(0, 88)));

  const owner = await page.evaluate((n) => {
    const norm = (s) => String(s).toLowerCase().replace(/&[a-z]+;|&#\d+;/g, ' ').replace(/[^a-z0-9]+/g, '');
    for (const id of TopicRegistry.ids()) {
      const cn = TopicRegistry.get(id).identity.cmpNotes || {};
      for (const [k, v] of Object.entries(cn)) if (Array.isArray(v) && norm(v[1]) === norm(n)) return id + ' [' + k + ']';
    }
    return null;
  }, noteB);

  console.log('\n   that note actually belongs to: ' + owner);
  const leaking = noteA === noteB && !which.caching.includes(victimPane);
  console.log('\n' + '='.repeat(70));
  if (leaking) {
    console.log('RAIL LEAK: CONFIRMED, STILL LIVE.');
    console.log('  While the user is on "caching", the coaching rail is showing NOTIFICATIONS\' note.');
    console.log('  Root cause: shell.js:237  if (TOPIC_CMP_NOTES[tab]) { ... }  -- no else branch.');
  } else {
    console.log('RAIL LEAK: not reproduced.');
  }
  await page.screenshot({ path: path.join(__dirname, 'shots', 'proof', 'RAIL-LEAK-caching-shows-notifications-note.png') });
  await browser.close();
  process.exit(leaking ? 1 : 0);
})();
