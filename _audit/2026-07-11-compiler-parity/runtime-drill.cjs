const { chromium } = require('playwright');
const URL = 'file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html';

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const probe = async (topic, label) => {
    await p.goto(URL + '#' + topic + '/drill', { waitUntil: 'load' });
    await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const tn = q('#tiernote');
      const adv = q('#adv');
      return {
        tiernoteHTML: tn ? tn.innerHTML.slice(0, 70) : '(no #tiernote)',
        advButtonText: adv ? adv.textContent.trim() : '(none)',
        qq: q('.qq') ? q('.qq').textContent.slice(0, 40) : '(none)',
      };
    });
    // reveal answer, then keep clicking advance to walk the follow-up chain
    let clicks = 0;
    for (let i = 0; i < 8; i++) {
      const adv = await p.$('#adv');
      if (!adv) break;
      await adv.click(); clicks++; await p.waitForTimeout(160);
    }
    const after = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      return {
        followUpBlocks: document.querySelectorAll('.fu').length,
        seniorHTML: q('.senior') ? q('.senior').innerHTML.replace(/<div class="sl">.*?<\/div>/, '').trim().slice(0, 46) : '(no .senior)',
        speakHTML: q('.speak') ? q('.speak').innerHTML.replace(/<div class="sl">.*?<\/div>/, '').trim().slice(0, 46) : '(no .speak)',
        mustHitPoints: document.querySelectorAll('.mhp-i').length,
      };
    });
    console.log('--- ' + label + '  (#' + topic + '/drill)');
    console.log('   tiernote strip   : ' + JSON.stringify(r.tiernoteHTML));
    console.log('   advance clicks    : ' + clicks + '   (1 = "Reveal answer" only, no push)');
    console.log('   .fu follow blocks : ' + after.followUpBlocks);
    console.log('   .senior body      : ' + JSON.stringify(after.seniorHTML));
    console.log('   .speak  body      : ' + JSON.stringify(after.speakHTML));
    console.log('   must-hit points   : ' + after.mustHitPoints);
    console.log('');
  };
  await probe('content-pipeline', 'THE 8  (hand-coded JS)');
  await probe('idempotency',      'THE 38 (compiled from .md)');
  await probe('caching',          'THE 38 (compiled from .md)');
  await b.close();
})();
