// Proof: does Layer B (markdown -> app HTML) reproduce hand-authored prose byte-for-byte?
// Each case is (markdown a human would write) vs (the exact HTML in notifications/walk.js).
import { prose } from './prose.mjs';

const cases = [
  {
    name: 'walk Step1 ins',
    md: `A producer calls \`notify(user, event)\` --- it emits 'this user should know about this event,' and stops there. It never names email or in-app; the notification system owns channel selection, so adding a channel is **zero producer change**.`,
    want: `A producer calls <code>notify(user, event)</code> &mdash; it emits &lsquo;this user should know about this event,&rsquo; and stops there. It never names email or in-app; the notification system owns channel selection, so adding a channel is <b>zero producer change</b>.`,
  },
  {
    name: 'walk Step1 deep',
    md: `This is the boundary that makes the whole thing maintainable. A producer --- an order service, a firmware-rollout job --- shouldn't know or care whether the user gets an email, an in-app badge, or both; it emits a **domain event** and the notification system decides delivery. So preferences, channel routing, batching, and fallback all live on *one* side of the boundary, and producers stay ignorant. The alternative --- each producer calling SES directly --- scatters channel logic across every service and makes 'add a channel' a fleet-wide change instead of one.`,
    want: `This is the boundary that makes the whole thing maintainable. A producer &mdash; an order service, a firmware-rollout job &mdash; shouldn&rsquo;t know or care whether the user gets an email, an in-app badge, or both; it emits a <b>domain event</b> and the notification system decides delivery. So preferences, channel routing, batching, and fallback all live on <i>one</i> side of the boundary, and producers stay ignorant. The alternative &mdash; each producer calling SES directly &mdash; scatters channel logic across every service and makes &lsquo;add a channel&rsquo; a fleet-wide change instead of one.`,
  },
  {
    name: 'walk Step1 cap',
    md: `The id is *content-derived*, not random --- so a retry of the exact same notification computes the exact same id and collides. That collision is what turns at-least-once machinery into **effectively exactly-once** delivery, without the producer thinking about it.`,
    want: `The id is <i>content-derived</i>, not random &mdash; so a retry of the exact same notification computes the exact same id and collides. That collision is what turns at-least-once machinery into <b>effectively exactly-once</b> delivery, without the producer thinking about it.`,
  },
];

let pass = 0;
for (const c of cases) {
  const got = prose(c.md);
  const ok = got === c.want;
  if (ok) pass++;
  console.log((ok ? 'PASS ' : 'FAIL ') + c.name);
  if (!ok) {
    // show first divergence
    let i = 0; while (i < Math.min(got.length, c.want.length) && got[i] === c.want[i]) i++;
    console.log('  want: ...' + JSON.stringify(c.want.slice(Math.max(0, i - 25), i + 35)));
    console.log('  got : ...' + JSON.stringify(got.slice(Math.max(0, i - 25), i + 35)));
  }
}
console.log(`\nLayer B prose reproduction: ${pass}/${cases.length} byte-identical`);
process.exit(pass === cases.length ? 0 : 1);
