import { chromium } from 'playwright';
const b = await chromium.launch();
const cases = [
  '#kafka-internals/viz',
  '#kafka-internals/drill',
  '#kafka-internals/walk',
  '#api-design/num',
  '#content-pipeline/drill',
];
console.log('deep link (fresh load)          -> final hash          MATCH?');
for (const h of cases) {
  const p = await b.newPage({viewport:{width:1280,height:900}});
  await p.goto('file:///D:/claude-workspace/deepdive-rehearsal/dist/index.html'+h,{waitUntil:'load'});
  await p.waitForTimeout(2500);
  const fin = await p.evaluate(()=>location.hash);
  const ok = fin === h;
  console.log(h.padEnd(32)+'-> '+fin.padEnd(22)+(ok?'YES':'*** NO ***'));
  await p.close();
}
await b.close();
