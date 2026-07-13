/* Format a number of seconds as "M:SS". */
function mockFmt(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
}

/* SHARED overlay helpers (used by every overlay, here and in cram-sheet.js).
   Each overlay element carries two private handles for the pending hide: "_exT" (the fallback
   timer) and "_exH" (the animationend listener). BOTH must be cancelled to cancel a hide. */

/* ONE resolver for the animating panel, used by ovShow and ovHide alike. They MUST agree: an
   addEventListener on one node and a removeEventListener on another is a silent no-op that looks
   like a cancel -- exactly the bug class this file already carries scars from. */
function ovPanel(overlay) { return overlay.querySelector('.mock-panel,.cram-panel') || overlay; }

/* Is `node` inside `overlay`, ACROSS the shadow boundary? Node.contains() stops at a shadow root,
   and every one of these dialogs keeps its controls in one -- so hop out through each root's host.
   A light-DOM contains() on a shadow-DOM app silently answers "no" and skips the work. */
function ovContains(overlay, node) {
  var n = node;
  while (n) {
    if (overlay.contains(n)) return true;
    var root = n.getRootNode && n.getRootNode();
    n = root && root.host;
  }
  return false;
}

function ovShow(overlay) {
  if (overlay._exT) { clearTimeout(overlay._exT); overlay._exT = null; }
  /* CANCEL THE PENDING HIDE -- BOTH ARMS OF IT.
     ovHide() arms finishHide TWICE: on the panel's `animationend`, and on a 500ms fallback timer.
     This used to clear only the TIMER, leaving the listener live -- and that listener is not scoped
     to the close animation. It fires on the NEXT animationend on that panel, which after a reopen
     is the OPEN animation's. finishHide then ran classList.remove('open','closing') against the
     dialog we had just opened, and THE DIALOG CLOSED ITSELF.
     MEASURED on the shipped build (pre-fix, verbatim from HEAD): close the mock run and reopen it
     at any gap -- 0, 50, 150, 400ms -- and `.open` is stripped 446-700ms later with no user action
     at all. Every overlay shares these two helpers, so every overlay had it. */
  if (overlay._exH) {
    ovPanel(overlay).removeEventListener('animationend', overlay._exH);
    overlay._exH = null;
  }
  overlay.classList.remove('closing');
  overlay.classList.add('open');
}
function ovHide(overlay) {
  if (!overlay.classList.contains('open')) { overlay.classList.remove('closing'); return; }
  overlay.classList.add('closing');
  /* `.closing` = painted but NOT interactive (THE INTERACTIVITY INVARIANT, styles.css). Focus must
     leave SYNCHRONOUSLY, in the same tick -- shell.js's focus manager reads the same predicate, but
     it is a MutationObserver, i.e. a microtask, so it cannot restore focus until the current task
     ends. Blur here and the invariant holds at EVERY instant: focus is never inside a layer the
     user can no longer use. shell.js then returns focus to the trigger a microtask later.
     READ FOCUS THROUGH THE SHADOW BOUNDARY: document.activeElement reports the HOST
     (<deep-mock-run>) for anything focused inside the run, and now that a dialog can open focused
     on a node in its own shadow root, blurring the host is not the same thing as blurring what is
     actually focused. */
  const _a = window.KeyGuard.deepActiveElement();
  if (_a && _a.blur && ovContains(overlay, _a)) { try { _a.blur(); } catch (e) {} }
  const panel = ovPanel(overlay);
  const finishHide = function () {
    overlay.classList.remove('open', 'closing');
    if (overlay._exT) { clearTimeout(overlay._exT); overlay._exT = null; }
    panel.removeEventListener('animationend', finishHide);
    overlay._exH = null;
  };
  overlay._exH = finishHide;                 /* so a reopen can cancel THIS listener, not just the timer */
  panel.addEventListener('animationend', finishHide, { once: true });
  overlay._exT = setTimeout(finishHide, 500); /* fallback if animationend never fires */
}

/* ===================== THE MOCK RUN'S KEYBOARD CONTRACT =====================
   THE BUG THIS EXISTS TO KILL (WCAG 2.1.1): the keydown handler below used to gate on
   "is the overlay open" and then preventDefault() Enter. Enter on the mock overlay's OWN
   close button therefore clicked #mbnext and DID NOT CLOSE -- measured; preventDefault() on
   keydown also suppresses the button's native activation, so the key was stolen twice over.
   Space on the close button fired #mbrev the same way. Identical disease to the drill's.

   WHY THE DRILL'S ONE-LINE FIX DOES NOT TRANSPLANT. The drill's cure was "gate on focus, not on
   pane" (KeyGuard.ownsActivationKeys). Dropped in here verbatim it would have DISABLED
   Space-to-reveal outright, because focus inside this modal was ALWAYS parked on a control:
   shell.js's focus trap scanned the light DOM only, found exactly ONE focusable in this dialog
   (#mockx), and so pinned focus to the close button forever -- first === last, every Tab bounced
   back. A previous agent correctly refused the one-liner and called for a design decision. This
   is it, and it is three coupled parts, because each is load-bearing for the others:

     1. THE RING CROSSES THE SHADOW BOUNDARY (shell.js getFocusable). Without it there is nowhere
        to focus but the close button, and any focus-based gate is a dead Space key.
     2. THE RUN OPENS FOCUSED ON ITS SURFACE, not on a control (__initialFocus below). #mockbody
        already exists for this -- role="region", tabindex="0", "Mock run content". The user lands
        IN THE RUN. Space reveals and Enter advances from there, with nothing stolen from anyone.
     3. THE KEYS GATE ON FOCUS (mockRunOwnsKeys). Tab to Reveal/Next/Close and that control owns
        its own Enter and Space, natively, exactly once -- so the close button closes.

   Rejected: rebinding reveal to a non-colliding key. Space-to-reveal IS the interaction, it is
   printed on screen in .mb-keys, and rebinding it would not have restored the tab ring -- the
   user still could not have reached a single control. The collision was never the disease. */

/* Space/Enter/-> belong to the RUN only when focus is on the run SURFACE, or nowhere (<body>) --
   never when it is parked on a control that handles the key itself. */
function mockRunOwnsKeys(event) {
  /* The surface is a REGION, not a control. It carries tabindex="0" so it can be focused and
     scrolled -- and that is precisely what KeyGuard.isActivatable() reads as "this element wants
     its own keys". A correct default; wrong for this one node. The surface IS the run, so it
     owns the run's keys. Everything else defers to the shared rule. */
  if (mockbody && window.KeyGuard.eventTarget(event) === mockbody) return true;
  return window.KeyGuard.ownsActivationKeys(event);
}

/* Is focus currently INSIDE the mock overlay? Read through the shadow boundary on BOTH sides:
   the deep active element, and a contains() that crosses roots. */
function mockHoldsFocus() { return ovContains(mockov, window.KeyGuard.deepActiveElement()); }
/* Every beat render REPLACES the body (mockbody.innerHTML = ...), destroying whatever the user had
   focused -- so focus fell to <body>, and both the keyboard user's place and the screen reader's
   were lost mid-round, every single beat. Put focus back on the run surface: the user stays IN the
   run, and the run keeps owning Space/Enter (contract point 2).
   ONLY when focus was already inside the overlay. The FIRST render runs from openMock(), while the
   TRIGGER button still holds focus -- and shell.js's modal observer reads document.activeElement at
   the end of that same task to remember where to restore focus on close. Steal focus there and the
   overlay captures ITSELF as its own return target, so closing it would strand focus in a hidden
   dialog. Guard on "did this render actually destroy the user's focus", and it cannot happen. */
function mockRestoreFocus(held) {
  if (held && mockbody) { try { mockbody.focus(); } catch (e) {} }
}

/* Open the mock-interview overlay: reset the clock/beat, randomly pick this
   run's curveball + frame cue + interrupt set, start the timer, bind the
   space/enter shortcuts ( AbortController for clean removal ), then render
   the first beat. Timer uses performance.now() + requestAnimationFrame for
   drift-free timing across a 22-minute mock run. */
function openMock() {
  closeMockClock();
  mockBeat = 0;
  mockSec = 0;
  mockclockEl.textContent = '0:00';
  /* THIS RUN'S BEATS, rebuilt from the pristine topic bank (see resetMockBeats).
     Every run starts from the authored arc -- reruns cannot compound, and the two
     rolls below write only into this run's private copies. */
  resetMockBeats();
  /* Roll the curveball. CLONE it out of the pool before it enters mockBeats: the
     pool is what mixed-fire draws from, so an aliased entry here turns any later
     beat write into pool corruption (which is exactly what the frame-cue roll below
     used to be -- on all 38 markdown topics mockCurveIdx and mockFrameIdx were both
     0, so `mockBeats[0].cue = ...` wrote straight through into the curveball pool). */
  if (curveballPool.length) {
    var cb = cloneBeat(curveballPool[Math.floor(Math.random() * curveballPool.length)]);
    if (mockCurveIdx >= 0) mockBeats[mockCurveIdx] = cb;   /* the topic authored a CURVEBALL slot -> rotate what fills it */
    else { mockBeats.push(cb); mockCurveIdx = mockBeats.length - 1; } /* no slot -> the curveball is an EXTRA beat; it must never evict an authored one */
  }
  /* Roll the frame cue -- only where the topic actually authored a FRAME beat. */
  if (mockFrameIdx >= 0 && framePool.length) mockBeats[mockFrameIdx].cue = framePool[Math.floor(Math.random() * framePool.length)];
  mockIntSet = mockInterrupt ? pickInterrupts() : {};
  /* THE RUN SURFACE, not the close button (contract point 2). shell.js's modal observer reads this
     on open; without it, focusable[0] is #mockx and the user starts the round on "close". */
  mockov.__initialFocus = function () { return mockbody; };
  ovShow(mockov);
  mockov.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  /* Drift-free timer: record start timestamp, then each frame compute elapsed */
  mockStartMs = performance.now();
  function tickMock() {
    if (!mockov.classList.contains('open')) return;
    var elapsed = Math.floor((performance.now() - mockStartMs) / 1000);
    if (elapsed !== mockSec) { mockSec = elapsed; mockclockEl.textContent = mockFmt(mockSec); }
    mockClock = requestAnimationFrame(tickMock);
  }
  mockClock = requestAnimationFrame(tickMock);
  /* Bind keyboard shortcuts with AbortController so they can be cleanly removed */
  if (!mockKeyCtrl) mockKeyCtrl = new AbortController();
  document.addEventListener('keydown', function (event) {
    if (!mockov.classList.contains('open')) return;
    /* THE GATE (contract point 3). Gating on the overlay alone stole Enter and Space from every
       control INSIDE the overlay -- including the close button, which is where this modal put the
       user's focus. If the key belongs to the focused control, let it have it: the browser then
       activates that control natively, exactly once. Guarding the WHOLE handler (-> included) also
       means any typing surface added to this overlay later is safe by construction -- this handler
       never consulted KeyGuard.isTyping, and would have eaten a text field's keys. */
    if (!mockRunOwnsKeys(event)) return;
    if (event.key === ' ') {
      event.preventDefault();
      var revealBtn = mockRoot.getElementById('mbrev');
      if (revealBtn && !revealBtn.disabled) { revealBtn.click(); return; }
      var interruptBtn = mockRoot.getElementById('mbirev');
      if (interruptBtn && !interruptBtn.disabled) { interruptBtn.click(); return; }
      var interruptBtn2 = mockRoot.getElementById('mbirev2');
      if (interruptBtn2 && !interruptBtn2.disabled) interruptBtn2.click();
      return;
    }
    if (event.key === 'Enter' || event.key === 'ArrowRight') {
      event.preventDefault();
      var nextBtn = mockRoot.getElementById('mbnext');
      if (nextBtn) nextBtn.click();
    }
  }, { signal: mockKeyCtrl.signal });
  renderMockBeat();
}

function closeMockClock() {
  if (mockClock) { cancelAnimationFrame(mockClock); mockClock = null; }
}
function closeMock() {
  ovHide(mockov);
  mockov.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  closeMockClock();
  if (mockKeyCtrl) { mockKeyCtrl.abort(); mockKeyCtrl = null; }
}

/* ===== MOCK RUN as a shadow component =====
   The body moves into this shadow; renderMockBeat/renderMockEnd (in mixed-fire.js)
   and openMock's keyboard shortcuts target it via the mockbody global / mockRoot.
   The frame, clock, open/close, and the shared ovShow/ovHide stay light. */
var MOCK_STYLE = `
.mb-prog{font:var(--font-weight-heavy) 11px -apple-system,sans-serif;letter-spacing:.6px;color:var(--mut2)}
.mb-tag{display:inline-block;margin-left:var(--space-9);font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.6px;color:var(--acc);background:var(--accbg);border-radius:5px;padding:var(--space-2) var(--space-9);vertical-align:middle}
.mb-cue{font-size:var(--font-size-subhead);font-weight:var(--font-weight-bold);color:var(--ink);line-height:var(--line-height-normal);margin:var(--space-13) 0 0}
.mb-task{font-size:var(--font-size-small);color:var(--mut);line-height:var(--line-height-airy);margin:var(--space-10) 0 0;font-style:italic}
.mb-task b{color:var(--accink);font-style:normal}
.mb-model{display:none;margin:var(--space-16) 0 0;padding:var(--space-15) var(--space-17);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border-radius:12px;font-size:var(--font-size-small);color:var(--ink);line-height:var(--line-height-spacious);box-shadow:0 1px 6px -2px var(--acc-a10)}
.mb-model.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.mb-model b{color:var(--accink);font-weight:var(--font-weight-bold)}
.mb-model code{font-size:var(--font-size-micro)}
.mb-ml{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.6px;color:var(--acc);text-transform:uppercase;margin-bottom:var(--space-7)}
.mb-act{display:flex;gap:var(--space-9);align-items:center;margin:var(--space-17) 0 0}
.mb-keys{margin-top:var(--space-13);font-size:var(--font-size-micro);color:var(--mut2);text-align:center;letter-spacing:.2px}
.mb-rev,.mb-next{font:var(--font-weight-bold) 12.5px -apple-system,sans-serif;padding:var(--space-9) var(--space-16);border-radius:9px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),border-color var(--duration-base) var(--ease-base),background var(--duration-base) var(--ease-base)}
.mb-rev:hover,.mb-next:hover{transform:translateY(-1px);box-shadow:0 4px 12px -3px var(--acc-a12)}
.mb-rev:active,.mb-next:active{transform:translateY(1px) scale(.98)}
.mb-rev{border:1px solid #cfc7f0;background:var(--accbg);color:var(--accink)}
.mb-rev:disabled{opacity:.5;cursor:default}
.mb-next{border:0;background:var(--acc);color:var(--mb-next-fg);margin-left:auto}
.mb-next:hover{background:var(--accink)}
.mb-end{text-align:center;padding:var(--space-6) var(--space-2)}
.mb-end-h{font:var(--font-weight-heavy) 19px -apple-system,sans-serif;color:var(--accink)}
.mb-end-t{font-size:var(--font-size-small);color:var(--mut);margin:var(--space-9) auto 0;max-width:var(--space-420);line-height:var(--line-height-airy)}
.mb-end-time{font-weight:var(--font-weight-heavy);color:var(--acc);font-family:ui-monospace,Menlo,monospace}
.mb-score-q{font-size:var(--font-size-small);color:var(--ink);font-weight:var(--font-weight-semibold);margin:var(--space-19) 0 var(--space-11)}
.mb-score{display:flex;gap:var(--space-6);justify-content:center;flex-wrap:wrap}
.mb-score button{width:var(--space-40);height:var(--space-40);border-radius:10px;border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,var(--acc-a02) 100%);color:var(--ink);font:var(--font-weight-heavy) 14px ui-monospace,monospace;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base)}
.mb-score button:hover{border-color:var(--acc);color:var(--acc);transform:translateY(-2px);box-shadow:0 4px 12px -3px var(--acc-a15)}
.mb-verdict{display:none;margin:var(--space-15) auto 0;max-width:var(--space-430);padding:var(--space-14) var(--space-17);border-radius:11px;font-size:var(--font-size-small);line-height:var(--line-height-airy);box-shadow:0 1px 6px -2px var(--acc-a08)}
.mb-verdict.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.mb-verdict b{font-weight:var(--font-weight-bold)}
.mb-again{display:flex;gap:var(--space-9);justify-content:center;margin-top:var(--space-19)}
.mb-again button{font:var(--font-weight-bold) 12px -apple-system,sans-serif;padding:var(--space-9) var(--space-17);border-radius:9px;cursor:pointer;border:1.5px solid var(--bd);background:linear-gradient(135deg,var(--card) 0%,var(--acc-a02) 100%);color:var(--mut);transition:transform var(--duration-fast) var(--ease-base),border-color var(--duration-base) var(--ease-base),box-shadow var(--duration-base) var(--ease-base),color var(--duration-base) var(--ease-base)}
.mb-again button:hover{border-color:var(--acc);color:var(--accink);transform:translateY(-1px);box-shadow:0 4px 12px -3px var(--acc-a10)}
.mb-again button:active{transform:translateY(1px) scale(.98)}
.mb-again button:hover{border-color:var(--acc);color:var(--acc)}
.mb-again .pri{border:0;background:var(--acc);color:var(--on-slab)}
.mb-again .pri:hover{background:var(--accink);color:var(--on-slab)}
.mb-end-int{margin-top:var(--space-12);font-size:var(--font-size-caption);line-height:var(--line-height-loose);color:var(--amber);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%);border:1px solid #e6c89a;border-radius:10px;padding:var(--space-10) var(--space-14)}
.mb-end-cv{margin-top:var(--space-12);font-size:var(--font-size-caption);line-height:var(--line-height-loose);color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border:1px solid var(--mb-cv-bd);border-radius:10px;padding:var(--space-10) var(--space-14)}
.mb-end-int b{font-weight:var(--font-weight-heavy)}
.mb-int{display:none;margin:var(--space-14) 0 0;padding:var(--space-14) var(--space-17);background:linear-gradient(135deg,var(--redbg) 0%,rgba(239,68,68,.04) 100%);border:1px solid #e8c5c0;border-left:3px solid var(--red);border-radius:12px;box-shadow:0 1px 6px -2px rgba(239,68,68,.1)}
.mb-int.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.mb-int-h{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;color:var(--red);text-transform:uppercase;margin-bottom:var(--space-7)}
.mb-int-q{font-size:var(--font-size-body);font-weight:var(--font-weight-bold);color:var(--mb-intq-fg);line-height:var(--line-height-relaxed)}
.mb-irev{margin-top:var(--space-12);border:1.5px solid var(--mb-irev-bd);background:linear-gradient(135deg,var(--mb-irev-bg) 0%,rgba(239,68,68,.04) 100%);color:var(--red);font:var(--font-weight-bold) 11.5px -apple-system,sans-serif;padding:var(--space-8) var(--space-14);border-radius:9px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base),color var(--duration-fast) var(--ease-base),border-color var(--duration-fast) var(--ease-base)}
.mb-irev:hover{background:var(--red);color:var(--on-slab);border-color:var(--red);transform:translateY(-1px)}
.mb-irev:active{transform:translateY(1px) scale(.98)}
.mb-irev:disabled{opacity:.5;cursor:default;background:var(--mb-irev-bg);color:var(--red);transform:none}
.mb-int-a{display:none;margin-top:var(--space-12);padding-top:var(--space-12);border-top:1px dashed #e3bdb8;font-size:var(--font-size-small);color:var(--ink);line-height:var(--line-height-spacious)}
.mb-int2{display:none;margin-top:var(--space-13);padding-top:var(--space-13);border-top:1px solid #e8c5c0}
.mb-int2.show{display:block;animation:pop var(--duration-moderate) var(--ease-base)}
.mb-int-h2{font:var(--font-weight-heavy) 10px -apple-system,sans-serif;letter-spacing:.5px;color:var(--red);text-transform:uppercase;margin-bottom:var(--space-7)}
.mb-int-a.show{display:block}
.mb-int-al{font:var(--font-weight-heavy) 9.5px -apple-system,sans-serif;letter-spacing:.5px;color:var(--teal);text-transform:uppercase;margin-bottom:var(--space-6)}
.mb-rev{transition:filter var(--duration-fast) var(--ease-base)}
.mb-rev:hover{filter:brightness(.96)}
.mb-rev:active,.mb-next:active,.mb-again:active,.pri:active{transform:translateY(1px);filter:brightness(.96)}`;
class DeepMockRun extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, MOCK_SHEET];
    root.innerHTML = '<style>' + MOCK_STYLE + '</style><div style="display:flex;flex-direction:column;height:100%"><div class="mock-body" id="mockbody" tabindex="0" role="region" aria-label="Mock run content" style="overflow-y:auto;flex:1;min-height:0;padding:var(--space-18) var(--space-20) var(--space-24)"></div></div>';
    mockbody = root.getElementById('mockbody');
    mockRoot = root;
  }
}
customElements.define('deep-mock-run', DeepMockRun);
