// Proof: does Layer C code reproduce the hand-authored highlighted HTML byte-for-byte?
// Uses single-quoted line arrays so the backticks/${} in the code stay literal.
import { code } from './code.mjs';

const cases = [
  {
    name: 'walk Step2 code (JS: const/await/if/return, ==hl==, // comments)',
    src: [
      '// deterministic id -- same event + user + channel always collides',
      'const id = sha256(`${userId}:${eventId}:${channel}`);',
      'const fresh = await dedup.==setNX==(id, ==1==, { ttl: ==7== * DAY });  // SET if Not eXists',
      'if (!fresh) return ack();          // already sent -- ack the retry, send nothing',
    ].join('\n'),
    want: [
      '<span class="c">// deterministic id -- same event + user + channel always collides</span>',
      '<span class="k">const</span> id = sha256(`${userId}:${eventId}:${channel}`);',
      '<span class="k">const</span> fresh = <span class="k">await</span> dedup.<span class="hl">setNX</span>(id, <span class="hl">1</span>, { ttl: <span class="hl">7</span> * DAY });  <span class="c">// SET if Not eXists</span>',
      '<span class="k">if</span> (!fresh) <span class="k">return</span> ack();          <span class="c">// already sent -- ack the retry, send nothing</span>',
    ].join('\n'),
  },
  {
    name: 'walk Step4 code (for/of/const/await)',
    src: [
      'const prefs = await getPrefs(userId);       // cached, ~1ms',
      'const channels = resolveChannels(prefs, event.category); // e.g. [in-app, email]',
      'for (const ch of channels)',
      '  await deliver(ch, userId, event);      // each deliver() is independently idempotent',
    ].join('\n'),
    want: [
      '<span class="k">const</span> prefs = <span class="k">await</span> getPrefs(userId);       <span class="c">// cached, ~1ms</span>',
      '<span class="k">const</span> channels = resolveChannels(prefs, event.category); <span class="c">// e.g. [in-app, email]</span>',
      '<span class="k">for</span> (<span class="k">const</span> ch <span class="k">of</span> channels)',
      '  <span class="k">await</span> deliver(ch, userId, event);      <span class="c">// each deliver() is independently idempotent</span>',
    ].join('\n'),
  },
  {
    name: 'walk Step5 code (SQL: INSERT INTO/VALUES/NULL, -- comments)',
    src: [
      '// one row per recipient -- the read is the partial index, not a scan',
      'INSERT INTO notifications (user_id, event_id, body, read_at, created_at)',
      'VALUES ($1, $2, $3, NULL, now());',
    ].join('\n'),
    want: [
      '<span class="c">// one row per recipient -- the read is the partial index, not a scan</span>',
      '<span class="k">INSERT INTO</span> notifications (user_id, event_id, body, read_at, created_at)',
      '<span class="k">VALUES</span> ($1, $2, $3, <span class="k">NULL</span>, now());',
    ].join('\n'),
  },
];

let pass = 0;
for (const c of cases) {
  const got = code(c.src);
  const ok = got === c.want;
  if (ok) pass++;
  console.log((ok ? 'PASS ' : 'FAIL ') + c.name);
  if (!ok) {
    let i = 0; while (i < Math.min(got.length, c.want.length) && got[i] === c.want[i]) i++;
    console.log('  want: ...' + JSON.stringify(c.want.slice(Math.max(0, i - 20), i + 45)));
    console.log('  got : ...' + JSON.stringify(got.slice(Math.max(0, i - 20), i + 45)));
  }
}
console.log(`\nLayer C code reproduction: ${pass}/${cases.length} byte-identical`);
process.exit(pass === cases.length ? 0 : 1);
