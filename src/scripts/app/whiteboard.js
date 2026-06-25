/* ============ WHITEBOARD (web component) ============
   Reconstruct-from-blank recall: nine self-graded cues + a verdict + the
   assembled-diagram disclosure. Encapsulated in a shadow root adopting
   BASE_SHEET. Coupled to session-progress, which now drives it through a public
   API instead of reaching for the old globals:
     resetAll()      reset every cue to ungraded
     rerunMissed()   reset just the missed cues and scroll to the first ungraded
     getStats()      { total, items:[{got, missed, cue}] } (cue is the raw string)
   Eight colors had html[data-theme=dark] overrides (disc bg/body, wb-foot bg/fg,
   wb li border, verdict ok / ok-bold / warn); each is a flip token, since
   ancestor selectors cannot cross the shadow boundary. The diagram (.dgm-*) uses
   only auto-flipping tokens. #wbrerun and the disc/diagram styles move here too. */
var WB_STEPS = [
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
var WB_STYLE = `
details.disc{margin-top:11px;border:1px solid var(--bd);border-radius:9px;overflow:hidden;background:var(--disc-bg)}
details.disc summary{cursor:pointer;font:700 11.5px -apple-system,sans-serif;color:var(--acc);padding:10px 14px;list-style:none;display:flex;align-items:center;gap:7px}
details.disc summary::-webkit-details-marker{display:none}
details.disc summary::before{content:"\\25B8";transition:.2s;font-size:10px}
details.disc[open] summary::before{transform:rotate(90deg)}
details.disc summary:hover{background:rgba(109,95,214,.06)}
details.disc .body{padding:0 14px 13px;font-size:12px;color:var(--disc-body-fg)}
.dgm{display:flex;flex-direction:column;align-items:center;gap:0;padding:4px 0 6px}
.dgm-node{background:var(--accbg);border:1.5px solid var(--acc2);border-radius:9px;padding:8px 14px;text-align:center;max-width:290px;width:100%;box-sizing:border-box}
.dgm-t{font:700 12.5px -apple-system,sans-serif;color:var(--accink);line-height:1.3}
.dgm-t code{font-family:'Courier New',monospace;font-size:11px;color:var(--accink);background:none;padding:0}
.dgm-s{font-size:10.5px;color:var(--mut);margin-top:2px;line-height:1.4}
.dgm-s code{font-family:'Courier New',monospace;font-size:10px;color:var(--mut);background:none;padding:0}
.dgm-conn{display:flex;flex-direction:column;align-items:center;padding:3px 0}
.dgm-v{color:var(--acc2);font-size:14px;line-height:1}
.dgm-lbl{font-size:10px;color:var(--mut2);margin-top:1px;text-align:center;max-width:270px}
.dgm-lbl code{font-family:'Courier New',monospace;font-size:9.5px;color:var(--mut);background:none;padding:0}
.dgm-up .dgm-v{color:var(--teal)}
.dgm-fork .dgm-branches{display:flex;justify-content:center;gap:10px;margin:5px 0 2px}
.dgm-br{font:700 10.5px 'Courier New',monospace;color:var(--acc);background:var(--card);border:1px solid var(--acc2);border-radius:6px;padding:2px 8px}
.dgm-em{color:var(--teal);font-weight:800}
.dgm-stores{display:flex;align-items:stretch;justify-content:center;gap:6px;width:100%;max-width:290px}
.dgm-store{max-width:140px}
.dgm-link{color:var(--mut2);font-size:15px;align-self:center}
.dgm-note,.dgm-foot{font-size:10px;color:var(--mut);text-align:center;max-width:290px;margin-top:6px;line-height:1.45}
.dgm-recon{border-color:var(--teal);background:var(--tealbg)}
.dgm-recon .dgm-t{color:var(--teal)}
.dgm-foot{margin-top:9px;border-top:1px dashed var(--bd);padding-top:8px}
.wb-count{font-family:var(--mono);font-size:11px;font-weight:800;color:var(--acc);letter-spacing:.3px;margin-bottom:14px}
.wb{list-style:none;counter-reset:wb}
.wb li{counter-increment:wb;display:block;padding:14px 0;border-bottom:1px solid var(--wb-li-bd)}
.wb li:last-child{border-bottom:0}
.wb-cue{display:flex;gap:13px;align-items:flex-start}
.wb li .num{flex:none;width:27px;height:27px;border-radius:50%;border:1.5px solid var(--acc);color:var(--acc);font:700 12px ui-monospace,monospace;display:flex;align-items:center;justify-content:center;transition:.15s}
.wb li .num::before{content:counter(wb)}
.wb-ct{font-size:13.5px;color:var(--ink);font-weight:600;padding-top:3px;line-height:1.5}
.wb-ans{display:none;margin:9px 0 0 40px;padding:10px 13px;background:var(--accbg);border-radius:8px;font-size:12.7px;color:var(--ink);line-height:1.56}
.wb-ans.show{display:block}
.wb-ans code{font-size:11px}
.wb-ans b{color:var(--accink)}
.wb-act{display:flex;gap:8px;margin:10px 0 0 40px}
.wb-rev,.wb-got,.wb-miss{font:700 11.5px -apple-system,sans-serif;padding:6px 13px;border-radius:7px;border:1px solid var(--bd);background:var(--card);color:var(--mut);cursor:pointer;transition:.12s}
.wb-rev{color:var(--accink);border-color:#cfc7f0;background:var(--accbg)}
.wb-rev:disabled{opacity:.5;cursor:default}
.wb-got:not(:disabled):hover{border-color:var(--teal);color:var(--teal)}
.wb-miss:not(:disabled):hover{border-color:var(--red);color:var(--red)}
.wb-rev:not(:disabled):hover,.wb-got:not(:disabled):hover,.wb-miss:not(:disabled):hover{filter:brightness(.96)}
.wb-rev:not(:disabled):active,.wb-got:not(:disabled):active,.wb-miss:not(:disabled):active{transform:translateY(1px);filter:brightness(.96)}
.wb-got:disabled,.wb-miss:disabled{opacity:.4;cursor:default}
.wb li.got .num{background:var(--acc);color:#fff;border-color:var(--acc)}
.wb li.got .num::before{content:"\\2713"}
.wb li.missed .num{background:var(--red);color:#fff;border-color:var(--red)}
.wb li.missed .num::before{content:"\\2717"}
.wb li.got .wb-ct,.wb li.missed .wb-ct{color:var(--mut2)}
.wb li.got .wb-got{background:var(--tealbg);color:var(--teal);border-color:var(--teal);opacity:1}
.wb li.missed .wb-miss{background:var(--redbg);color:var(--red);border-color:var(--red);opacity:1}
.wb-verdict{display:none;margin-top:15px;padding:13px 15px;border-radius:10px;font-size:12.7px;line-height:1.55}
.wb-verdict.ok{background:var(--tealbg);color:var(--wb-ok-fg);border-left:3px solid var(--teal)}
.wb-verdict.ok b{color:var(--wb-ok-b-fg)}
#wbrerun{display:block;margin-top:11px;font:700 11.5px -apple-system,sans-serif;padding:7px 14px;border-radius:7px;border:1px solid var(--amber);background:#fff;color:var(--amber);cursor:pointer}
#wbrerun:hover{background:var(--amber);color:#fff}
.wb-foot{margin-top:16px;font-size:12px;color:var(--wb-foot-fg);background:var(--wb-foot-bg);border-left:3px solid var(--acc);border-radius:8px;padding:12px 14px}
.wb-foot b{color:var(--accink)}
.wb-verdict.warn{background:var(--amberbg);color:var(--wb-warn-fg);border-left:3px solid var(--amber)}
.wb-verdict.warn b{color:var(--wb-warn-fg)}
`;
var WB_HTML = `<div class="card">
      <div class="step-k">Reconstruct from blank</div>
      <div class="step-t">What you draw, in order</div>
      <div class="step-sub">For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run this system on a whiteboard.</div>
      <div class="wb-count" id="wbcount">0 recalled &middot; 0 missed &middot; 9 left</div>
      <ol class="wb" id="wblist"></ol>
      <div class="wb-verdict" id="wbverdict"></div>
      <div class="wb-foot"><b>The one people forget:</b> step 7. Two stores, no shared transaction &mdash; if you don't volunteer the compensating S3 delete, the interviewer knows you've only read about this, not shipped it.</div>
    </div>
    <details class="disc">
      <summary>The assembled diagram &mdash; what you draw on the board</summary>
      <div class="body">
        <div class="dgm">
          <div class="dgm-node"><div class="dgm-t">operator &rarr; S3 bucket</div><div class="dgm-s">the upload lands as an object</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">S3 <code>ObjectCreated</code> event</span></div>
          <div class="dgm-node"><div class="dgm-t"><code>processUpload(key, bucket)</code></div><div class="dgm-s">Lambda / handler entry</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>extname</code> &rarr; strategies map &middot; O(1)</span></div>
          <div class="dgm-node"><div class="dgm-t">format handler</div><div class="dgm-s">jpg &middot; mp4 &middot; ttf &middot; bin &mdash; unknown ext &rarr; <i>skip</i></div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>readStream</code></span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">PassThrough &middot; <span class="dgm-em">one read</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; hash</span><span class="dgm-br">&rarr; s3.upload</span></div><div class="dgm-s"><code>Promise.all</code> &mdash; forked, single read</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">persist across two stores</span></div>
          <div class="dgm-stores"><div class="dgm-node dgm-store"><div class="dgm-t">DB record</div><div class="dgm-s">catalog row</div></div><div class="dgm-link">&harr;</div><div class="dgm-node dgm-store"><div class="dgm-t">S3 blob</div><div class="dgm-s">object bytes</div></div></div>
          <div class="dgm-note">no shared transaction &rarr; track keys + <b>compensating-delete</b> on rollback</div>
          <div class="dgm-conn dgm-up"><span class="dgm-v">&#9650;</span><span class="dgm-lbl">backstops the two stores</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">reconciler</div><div class="dgm-s">sweeps orphans past a grace window / <b>PENDING</b> marker &mdash; never touches an in-flight upload</div></div>
          <div class="dgm-foot">redelivered event &rarr; <b>processed-marker</b> (conditional put) &rarr; replay no-ops &middot; idempotent</div>
        </div>
      </div>
    </details>`;

class DeepWhiteboard extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + WB_STYLE + '</style>' + WB_HTML;
    this._list = root.getElementById('wblist');
    this._count = root.getElementById('wbcount');
    this._verdict = root.getElementById('wbverdict');
    const self = this;
    WB_STEPS.forEach(function (step, i) {
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
      gotBtn.onclick = function () { item.classList.add('got'); item.classList.remove('missed'); self._updCount(); };
      missBtn.onclick = function () { item.classList.add('missed'); item.classList.remove('got'); self._updCount(); };
      self._list.appendChild(item);
    });
    this._updCount();
  }
  _updCount() {
    const recalled = this._list.querySelectorAll('li.got').length;
    const missed = this._list.querySelectorAll('li.missed').length;
    const total = WB_STEPS.length;
    const graded = recalled + missed;
    this._count.textContent = recalled + ' recalled \u00b7 ' + missed + ' missed \u00b7 ' + (total - graded) + ' left';
    if (graded < total) { this._verdict.style.display = 'none'; return; }
    this._verdict.style.display = 'block';
    if (missed === 0) {
      this._verdict.className = 'wb-verdict ok';
      this._verdict.innerHTML = '<b>All nine cold.</b> You can rebuild this system on a whiteboard from memory \u2014 the design round is yours to lose, not to pass.';
    } else {
      this._verdict.className = 'wb-verdict warn';
      this._verdict.innerHTML = '<b>' + recalled + ' / ' + total + ' recalled.</b> ' + missed + ' still soft \u2014 drill just those until they\u2019re automatic.<button id="wbrerun" type="button">Reset the ' + missed + ' miss' + (missed > 1 ? 'es' : '') + '</button>';
      const v = this;
      this._verdict.querySelector('#wbrerun').onclick = function () { v.rerunMissed(); };
    }
  }
  _resetItem(item) {
    item.classList.remove('got', 'missed');
    item.querySelector('.wb-ans').classList.remove('show');
    const revealBtn = item.querySelector('.wb-rev');
    revealBtn.disabled = false;
    revealBtn.textContent = 'Reveal';
    item.querySelector('.wb-got').disabled = true;
    item.querySelector('.wb-miss').disabled = true;
  }
  resetAll() {
    const items = this._list.querySelectorAll('li');
    for (let i = 0; i < items.length; i++) this._resetItem(items[i]);
    this._updCount();
  }
  rerunMissed() {
    const missedItems = this._list.querySelectorAll('li.missed');
    for (let i = 0; i < missedItems.length; i++) this._resetItem(missedItems[i]);
    this._updCount();
    const firstUngraded = this._list.querySelector('li:not(.got)');
    if (firstUngraded) {
      firstUngraded.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    }
  }
  getStats() {
    const items = this._list.querySelectorAll('li');
    return {
      total: WB_STEPS.length,
      items: WB_STEPS.map(function (s, i) {
        const li = items[i];
        return { got: !!(li && li.classList.contains('got')), missed: !!(li && li.classList.contains('missed')), cue: s.c };
      })
    };
  }
}
customElements.define('deep-whiteboard', DeepWhiteboard);
