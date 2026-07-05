// Proof: does Layer C flow shorthand reproduce the hand-authored flow HTML byte-for-byte?
import { flow } from './flow.mjs';

const cases = [
  { name: 'walk Step1 flow (arrow + middot)',
    src: `n[service] -> p[notify(user, event)] -> t[notification request] . a[producer knows no channels]`,
    want: `<span class="fb n">service</span><span class="arr">&rarr;</span><span class="fb p">notify(user, event)</span><span class="arr">&rarr;</span><span class="fb t">notification request</span><span class="arr">&middot;</span><span class="fb a">producer knows no channels</span>` },
  { name: 'walk Step2 flow (slash + box-internal arrow)',
    src: `n[request] -> p[id = hash(user, event, channel)] -> t[dedup store (SET NX)] / r[already sent -> skip]`,
    want: `<span class="fb n">request</span><span class="arr">&rarr;</span><span class="fb p">id = hash(user, event, channel)</span><span class="arr">&rarr;</span><span class="fb t">dedup store (SET NX)</span><span class="arr">/</span><span class="fb r">already sent &rarr; skip</span>` },
  { name: 'walk Step3 flow',
    src: `n[event target] -> p[role-based resolution] -> t[concrete users + channels] . a[per-tenant sender]`,
    want: `<span class="fb n">event target</span><span class="arr">&rarr;</span><span class="fb p">role-based resolution</span><span class="arr">&rarr;</span><span class="fb t">concrete users + channels</span><span class="arr">&middot;</span><span class="fb a">per-tenant sender</span>` },
];

let pass = 0;
for (const c of cases) {
  const got = flow(c.src);
  const ok = got === c.want;
  if (ok) pass++;
  console.log((ok ? 'PASS ' : 'FAIL ') + c.name);
  if (!ok) {
    let i = 0; while (i < Math.min(got.length, c.want.length) && got[i] === c.want[i]) i++;
    console.log('  want: ...' + JSON.stringify(c.want.slice(Math.max(0, i - 20), i + 40)));
    console.log('  got : ...' + JSON.stringify(got.slice(Math.max(0, i - 20), i + 40)));
  }
}
console.log(`\nLayer C flow reproduction: ${pass}/${cases.length} byte-identical`);
process.exit(pass === cases.length ? 0 : 1);
