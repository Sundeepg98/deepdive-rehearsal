/* ============ WHITEBOARD ============ */
var wbSteps=[
  {c:'Entry box &mdash; the handler signature and what fires it.', a:'<code>processUpload(key, bucket)</code> &mdash; the Lambda / API handler, triggered by the S3 <b>ObjectCreated</b> event.'},
  {c:'Routing &mdash; how a file type picks its handler.', a:'<code>extname(key)</code> &rarr; the <code>strategies</code> map (jpg, mp4, ttf, bin, zip&hellip;). An <b>O(1) lookup</b>, never a switch.'},
  {c:'The branch for an unrecognized type.', a:'unknown ext &rarr; <code>skip</code> (a logged no-op); a match &rarr; the format handler.'},
  {c:'Inside a handler &mdash; the single-read data flow.', a:'<code>readStream &rarr; PassThrough &rarr; [hash | s3.upload] &rarr; Promise.all</code>. <b>One disk read</b>, forked two ways.'},
  {c:'The export path, and its memory property.', a:'<code>cursor(batch 100) &rarr; csv &rarr; res</code>, the backpressure loop drawn back from socket to cursor &mdash; <b>constant memory</b> at any row count.'},
  {c:'The import path &mdash; the id-collision algorithm.', a:'The 4-tier ladder &mdash; <b>REUSE / REMAP / REGEN / INSERT</b> &mdash; plus the <code>oldId&rarr;newId</code> FK remap applied before each child insert.'},
  {c:'The dual-write caveat, and its fix.', a:'Two stores, no shared txn &rarr; track the S3 keys, <b>compensating-delete</b> on rollback. (The one people forget.)'},
  {c:'The backstop for orphans &mdash; and its one guard.', a:'A <b>reconciler</b> sweeps S3 for keys with no DB row &rarr; delete &mdash; but only past a grace window / <b>PENDING</b> marker, so it never touches an in-flight upload.'},
  {c:'How a redelivered event avoids double work.', a:'At-least-once delivery &rarr; a <b>processed-marker</b> (conditional put on the content hash). A replay sees it and no-ops &mdash; the effect is idempotent.'}
];
const wblist = document.getElementById('wblist');
const wbcount = document.getElementById('wbcount');
const wbverdict = document.getElementById('wbverdict');

/* Update the "X recalled / Y missed / Z left" line; once every cue is graded,
   show the verdict (all-recalled, or a prompt to reset the missed ones). */
function updCount() {
  const recalled = wblist.querySelectorAll('li.got').length;
  const missed = wblist.querySelectorAll('li.missed').length;
  const total = wbSteps.length;
  const graded = recalled + missed;
  wbcount.textContent = recalled + ' recalled \u00b7 ' + missed + ' missed \u00b7 ' + (total - graded) + ' left';
  if (graded < total) { wbverdict.style.display = 'none'; return; }
  wbverdict.style.display = 'block';
  if (missed === 0) {
    wbverdict.className = 'wb-verdict ok';
    wbverdict.innerHTML = '<b>All nine cold.</b> You can rebuild this system on a whiteboard from memory \u2014 the design round is yours to lose, not to pass.';
  } else {
    wbverdict.className = 'wb-verdict warn';
    wbverdict.innerHTML = '<b>' + recalled + ' / ' + total + ' recalled.</b> ' + missed + ' still soft \u2014 drill just those until they\u2019re automatic.<button id="wbrerun" type="button">Reset the ' + missed + ' miss' + (missed > 1 ? 'es' : '') + '</button>';
    document.getElementById('wbrerun').onclick = wbRerun;
  }
}
/* Reset one cue back to its un-revealed, ungraded state. */
function wbReset(item) {
  item.classList.remove('got', 'missed');
  item.querySelector('.wb-ans').classList.remove('show');
  const revealBtn = item.querySelector('.wb-rev');
  revealBtn.disabled = false;
  revealBtn.textContent = 'Reveal';
  item.querySelector('.wb-got').disabled = true;
  item.querySelector('.wb-miss').disabled = true;
}

/* Reset just the missed cues and scroll to the first one still to recall. */
function wbRerun() {
  const missedItems = wblist.querySelectorAll('li.missed');
  for (let i = 0; i < missedItems.length; i++) wbReset(missedItems[i]);
  updCount();
  const firstUngraded = wblist.querySelector('li:not(.got)');
  if (firstUngraded) {
    firstUngraded.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth',
      block: 'center'
    });
  }
}

/* Build one <li> per cue: a prompt, the hidden answer, and reveal/got/missed
   buttons. Reveal exposes the answer and enables the two self-grade buttons. */
wbSteps.forEach(function (step, i) {
  const item = document.createElement('li');
  item.innerHTML = '<div class="wb-cue"><span class="num"></span><span class="wb-ct">' + step.c + '</span></div>' +
    '<div class="wb-ans">' + step.a + '</div>' +
    '<div class="wb-act"><button class="wb-rev" type="button">Reveal</button>' +
    '<button class="wb-got" type="button" disabled>Drew it</button>' +
    '<button class="wb-miss" type="button" disabled>Missed</button></div>';
  const answer = item.querySelector('.wb-ans');
  const revealBtn = item.querySelector('.wb-rev');
  const gotBtn = item.querySelector('.wb-got');
  const missBtn = item.querySelector('.wb-miss');
  revealBtn.onclick = function () {
    answer.classList.add('show');
    revealBtn.disabled = true;
    revealBtn.textContent = 'Revealed';
    gotBtn.disabled = false;
    missBtn.disabled = false;
  };
  gotBtn.onclick = function () { item.classList.add('got'); item.classList.remove('missed'); updCount(); };
  missBtn.onclick = function () { item.classList.add('missed'); item.classList.remove('got'); updCount(); };
  wblist.appendChild(item);
});
updCount();
