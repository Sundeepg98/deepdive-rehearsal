(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ WHITEBOARD (web component) ============
   Reconstruct-from-blank recall: self-graded cues + verdict + the assembled-diagram
   disclosure. Phase 1: converted to the TopicPane contract -- the cues / diagram / foot /
   sub and the OK-verdict are now data (topics/content-pipeline/wb.js), rendered into child
   mounts; the 27 per-item closures collapse to ONE delegated #wblist listener (native
   disabled-button gating). Public API resetAll() / rerunMissed() / getStats() unchanged
   (session-progress drives it). sheets()=[BASE_SHEET,DISC_SHEET]; the disc family lives in
   DISC_SHEET. Offline-safe. */
var WB_STYLE = `
.dgm{display:flex;flex-direction:column;align-items:center;gap:0;padding:var(--space-4) 0 var(--space-6)}
.dgm-node{background:var(--accbg);border:1.5px solid var(--acc2);border-radius:9px;padding:var(--space-8) var(--space-14);text-align:center;max-width:var(--space-290);width:100%;box-sizing:border-box}
.dgm-t{font:700 12.5px -apple-system,sans-serif;color:var(--accink);line-height:1.3}
.dgm-t code{font-family:'Courier New',monospace;font-size:var(--font-size-micro);color:var(--accink);background:none;padding:0}
.dgm-s{font-size:var(--font-size-micro);color:var(--mut);margin-top:var(--space-2);line-height:1.4}
.dgm-s code{font-family:'Courier New',monospace;font-size:var(--font-size-nano);color:var(--mut);background:none;padding:0}
.dgm-conn{display:flex;flex-direction:column;align-items:center;padding:var(--space-3) 0}
.dgm-v{color:var(--acc2);font-size:var(--font-size-body);line-height:1}
.dgm-lbl{font-size:var(--font-size-nano);color:var(--mut2);margin-top:var(--space-1);text-align:center;max-width:var(--space-270)}
.dgm-lbl code{font-family:'Courier New',monospace;font-size:var(--font-size-nano);color:var(--mut);background:none;padding:0}
.dgm-up .dgm-v{color:var(--teal)}
.dgm-fork .dgm-branches{display:flex;justify-content:center;gap:var(--space-10);margin:var(--space-5) 0 var(--space-2)}
.dgm-br{font:700 10.5px 'Courier New',monospace;color:var(--acc);background:var(--card);border:1px solid var(--acc2);border-radius:6px;padding:var(--space-2) var(--space-8)}
.dgm-em{color:var(--teal);font-weight:var(--font-weight-heavy)}
.dgm-stores{display:flex;align-items:stretch;justify-content:center;gap:var(--space-6);width:100%;max-width:var(--space-290)}
.dgm-store{max-width:var(--space-140)}
.dgm-link{color:var(--mut2);font-size:var(--font-size-body);align-self:center}
.dgm-note,.dgm-foot{font-size:var(--font-size-nano);color:var(--mut);text-align:center;max-width:var(--space-290);margin-top:var(--space-6);line-height:1.45}
.dgm-recon{border-color:var(--teal);background:var(--tealbg)}
.dgm-recon .dgm-t{color:var(--teal)}
.dgm-foot{margin-top:var(--space-9);border-top:1px dashed var(--bd);padding-top:var(--space-8)}
.wb-count{font-family:var(--mono);font-size:var(--font-size-micro);font-weight:var(--font-weight-heavy);color:var(--acc);letter-spacing:.3px;margin-bottom:var(--space-14)}
.wb{list-style:none;counter-reset:wb}
.wb li{counter-increment:wb;display:block;padding:var(--space-15) 0;border-bottom:1px solid var(--wb-li-bd);transition:padding var(--duration-base) var(--ease-base)}
.wb li:last-child{border-bottom:0}
.wb li:hover{padding-left:var(--space-4)}
.wb-cue{display:flex;gap:var(--space-14);align-items:flex-start}
.wb li .num{flex:none;width:var(--space-30);height:var(--space-30);border-radius:50%;border:2px solid var(--acc);color:var(--acc);font:700 13px ui-monospace,monospace;display:flex;align-items:center;justify-content:center;transition:transform var(--duration-slow) var(--ease-spring),box-shadow var(--duration-slow) var(--ease-base),background var(--duration-moderate) var(--ease-base);background:linear-gradient(135deg,transparent 0%,rgba(83,74,183,.04) 100%)}
.wb li:hover .num{transform:scale(1.15);box-shadow:0 0 0 4px rgba(83,74,183,.12),0 0 16px -2px rgba(83,74,183,.2);background:linear-gradient(135deg,rgba(83,74,183,.06) 0%,rgba(109,95,214,.1) 100%)}
.wb li .num::before{content:counter(wb)}
.wb-ct{font-size:var(--font-size-small);color:var(--ink);font-weight:var(--font-weight-semibold);padding-top:var(--space-4);line-height:1.5;transition:color var(--duration-base) var(--ease-base)}
.wb li:hover .wb-ct{color:var(--accink)}
.wb-ans{display:none;margin:var(--space-10) 0 0 var(--space-42);padding:var(--space-12) var(--space-15);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:9px;font-size:var(--font-size-small);color:var(--ink);line-height:1.56;box-shadow:0 1px 4px -2px rgba(83,74,183,.06)}
.wb-ans.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.wb-ans code{font-size:var(--font-size-micro)}
.wb-ans b{color:var(--accink);font-weight:var(--font-weight-bold)}
.wb-act{display:flex;gap:var(--space-9);margin:var(--space-11) 0 0 var(--space-42)}
.wb-rev,.wb-got,.wb-miss{font:700 11.5px -apple-system,sans-serif;padding:var(--space-7) var(--space-14);border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--mut);cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),border-color var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base)}
.wb-rev:not(:disabled):hover,.wb-got:not(:disabled):hover,.wb-miss:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 4px 12px -3px rgba(83,74,183,.14)}
.wb-rev{color:var(--accink);border-color:#cfc7f0;background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.03) 100%)}
.wb-rev:disabled{opacity:.5;cursor:default}
.wb-got:not(:disabled):hover{border-color:var(--teal);color:var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.03) 100%)}
.wb-miss:not(:disabled):hover{border-color:var(--red);color:var(--red);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.03) 100%)}

.wb-rev:not(:disabled):active,.wb-got:not(:disabled):active,.wb-miss:not(:disabled):active{transform:translateY(1px) scale(.98);filter:brightness(.96)}
.wb-got:disabled,.wb-miss:disabled{opacity:.4;cursor:default}
.wb li.got .num{background:linear-gradient(135deg,var(--acc),var(--acc2));color:#fff;border-color:var(--acc);box-shadow:0 2px 8px -2px rgba(83,74,183,.3)}
.wb li.got .num::before{content:"\\2713"}
.wb li.missed .num{background:linear-gradient(135deg,var(--red),#e07070);color:#fff;border-color:var(--red);box-shadow:0 2px 8px -2px rgba(239,68,68,.3)}
.wb li.missed .num::before{content:"\\2717"}
.wb li.got .wb-ct,.wb li.missed .wb-ct{color:var(--mut2)}
.wb li.got .wb-got{background:var(--tealbg);color:var(--teal);border-color:var(--teal);opacity:1}
.wb li.missed .wb-miss{background:var(--redbg);color:var(--red);border-color:var(--red);opacity:1}
.wb-verdict{display:none;margin-top:var(--space-18);padding:var(--space-14) var(--space-17);border-radius:11px;font-size:var(--font-size-small);line-height:1.55}
.wb-verdict.ok{background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);color:var(--wb-ok-fg);border-left:3px solid var(--teal);box-shadow:0 1px 4px -2px rgba(10,133,100,.08)}
.wb-verdict.ok::before{content:"\\2714";margin-right:var(--space-6);font-size:var(--font-size-body)}
.wb-verdict.ok b{color:var(--wb-ok-b-fg)}
#wbrerun{display:block;margin-top:var(--space-12);font:700 12px -apple-system,sans-serif;padding:var(--space-8) var(--space-16);border-radius:8px;border:1.5px solid var(--amber);background:linear-gradient(135deg,#fff 0%,var(--amberbg) 100%);color:var(--amber);cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base)}
#wbrerun:hover{background:linear-gradient(135deg,var(--amber) 0%,#d4902a 100%);color:#fff;box-shadow:0 4px 14px -4px rgba(176,108,20,.25);transform:translateY(-1px)}
#wbrerun:active{transform:translateY(1px) scale(.98)}
.wb-foot{margin-top:var(--space-18);font-size:var(--font-size-caption);color:var(--wb-foot-fg);background:linear-gradient(135deg,var(--wb-foot-bg) 0%,rgba(83,74,183,.03) 100%);border-left:3px solid var(--acc);border-radius:9px;padding:var(--space-13) var(--space-16);line-height:1.6}
.wb-foot b{color:var(--accink);font-weight:var(--font-weight-bold)}
.wb-verdict.warn{background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%);color:var(--wb-warn-fg);border-left:3px solid var(--amber);box-shadow:0 1px 4px -2px rgba(176,108,20,.08)}
.wb-verdict.warn::before{content:"\\26A0";margin-right:var(--space-6);font-size:var(--font-size-body)}
.wb-verdict.warn b{color:var(--wb-warn-fg)}
`;
var WB_HTML = `<div class="card">
      <div class="step-k">Reconstruct from blank</div>
      <div class="step-t">What you draw, in order</div>
      <div class="step-sub"></div>
      <div class="wb-count" id="wbcount"></div>
      <ol class="wb" id="wblist"></ol>
      <div class="wb-verdict" id="wbverdict"></div>
      <div class="wb-foot"></div>
    </div>
    <details class="disc">
      <summary>The assembled diagram &mdash; what you draw on the board</summary>
      <div class="body">
        <div class="dgm"></div>
      </div>
    </details>`;

class DeepWhiteboard extends TopicPane {
  static dataKey = 'wb';
  sheets()    { return [BASE_SHEET, DISC_SHEET]; }
  styleText() { return WB_STYLE; }
  skeleton()  { return WB_HTML; }
  init(root) {
    this._list = root.getElementById('wblist');
    this._count = root.getElementById('wbcount');
    this._verdict = root.getElementById('wbverdict');
    this._sub = root.querySelector('.step-sub');
    this._foot = root.querySelector('.wb-foot');
    this._dgm = root.querySelector('.dgm');
    var self = this;
    /* ONE delegated listener on the stable #wblist replaces 27 per-item closures;
       disabled Drew-it / Missed buttons emit no click (native gating), so no guard. */
    this._list.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var li = btn.closest('li');
      if (!li) return;
      if (btn.classList.contains('wb-rev')) {
        li.querySelector('.wb-ans').classList.add('show');
        btn.disabled = true;
        btn.textContent = 'Revealed';
        li.querySelector('.wb-got').disabled = false;
        li.querySelector('.wb-miss').disabled = false;
      } else if (btn.classList.contains('wb-got')) {
        li.classList.add('got'); li.classList.remove('missed'); self._updCount(); self._emitGraded();
      } else if (btn.classList.contains('wb-miss')) {
        li.classList.add('missed'); li.classList.remove('got'); self._updCount(); self._emitGraded();
      }
    });
  }
  renderTopic(d) {
    this._steps = d.steps;
    this._okVerdict = d.okVerdict;
    this._sub.innerHTML = d.sub;
    this._foot.innerHTML = d.foot;
    this._dgm.innerHTML = d.diagram;
    this._list.innerHTML = d.steps.map(function (step) {
      return '<li><div class="wb-cue"><span class="num"></span><span class="wb-ct">' + step.c + '</span></div>' +
        '<div class="wb-ans">' + step.a + '</div>' +
        '<div class="wb-act"><button class="wb-rev" type="button">Reveal</button>' +
        '<button class="wb-got" type="button" disabled>Drew it</button>' +
        '<button class="wb-miss" type="button" disabled>Missed</button></div></li>';
    }).join('');
    this._updCount();
  }
  _updCount() {
    const recalled = this._list.querySelectorAll('li.got').length;
    const missed = this._list.querySelectorAll('li.missed').length;
    const total = this._steps.length;
    const graded = recalled + missed;
    this._count.textContent = recalled + ' recalled \u00b7 ' + missed + ' missed \u00b7 ' + (total - graded) + ' left';
    if (graded < total) { this._verdict.style.display = 'none'; return; }
    this._verdict.style.display = 'block';
    if (missed === 0) {
      this._verdict.className = 'wb-verdict ok';
      this._verdict.innerHTML = this._okVerdict;
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
  _emitGraded() { try { this.dispatchEvent(new CustomEvent('whiteboardgraded', { bubbles: true })); } catch (e) {} }
  getStats() {
    const items = this._list.querySelectorAll('li');
    return {
      total: this._steps.length,
      items: this._steps.map(function (s, i) {
        const li = items[i];
        return { got: !!(li && li.classList.contains('got')), missed: !!(li && li.classList.contains('missed')), cue: s.c };
      })
    };
  }
}
customElements.define('deep-whiteboard', DeepWhiteboard);
})();
