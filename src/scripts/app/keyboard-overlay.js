(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ KEYBOARD SHORTCUTS OVERLAY (web component) ============
   The keyboard-shortcuts panel content, encapsulated. The overlay frame
   (.mock-ov / .mock-panel / .mock-top / close button / .cram-body) stays in light
   DOM with its open/close wiring (cram-sheet.js: openKeys -> ovShow); only the
   shortcut content moves into this shadow root, styled by the shared BASE_SHEET
   plus the .ks-* rules below. Every color is an existing theme token, so it
   themes across the shadow boundary with no extra tokens. (#keybody kbd -> kbd
   because the id selector cannot reach into the shadow.) */
var KBD_STYLE = `
.ks-sec{margin-bottom:var(--space-18)}
.ks-sec:last-of-type{margin-bottom:0}
.ks-h{font-size:var(--font-size-micro);font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--acc);margin:0 0 var(--space-12)}
.ks-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-9) var(--space-18)}
.ks-row{display:flex;align-items:center;gap:var(--space-10);font-size:var(--font-size-small);color:var(--ink);transition:transform var(--duration-fast) var(--ease-base)}
.ks-row:hover{transform:translateX(3px)}
.ks-list{display:flex;flex-direction:column;gap:var(--space-11)}
.ks-row2{display:flex;align-items:center;gap:var(--space-14);font-size:var(--font-size-small);color:var(--ink);transition:transform var(--duration-fast) var(--ease-base)}
.ks-row2:hover{transform:translateX(3px)}
.ks-keys{flex:none;display:flex;align-items:center;gap:var(--space-6);min-width:var(--space-92)}
.ks-or{font-size:var(--font-size-micro);color:var(--mut);font-weight:600}
kbd{display:inline-flex;align-items:center;justify-content:center;min-width:var(--space-24);height:var(--space-24);padding:0 var(--space-7);font-family:inherit;font-size:var(--font-size-micro);font-weight:700;line-height:1;color:var(--ink);background:linear-gradient(180deg,var(--side) 0%,rgba(83,74,183,.06) 100%);border:1px solid var(--bd);border-bottom-width:2px;border-radius:6px;box-shadow:0 2px 0 rgba(30,28,24,.08),0 1px 3px rgba(83,74,183,.08);transition:transform var(--duration-fast) var(--ease-base),box-shadow var(--duration-fast) var(--ease-base),background var(--duration-fast) var(--ease-base)}
kbd.ks-mini{min-width:var(--space-18);height:var(--space-18);font-size:var(--font-size-nano);padding:0 var(--space-4)}
/* v153: Keyboard shortcut press feedback */
.kb-press kbd,.kb-press kbd.ks-mini{background:linear-gradient(180deg,var(--accbg) 0%,rgba(83,74,183,.1) 100%);color:var(--accink);border-color:var(--acc);transform:translateY(1px);box-shadow:0 0 0 2px rgba(83,74,183,.15),0 0 12px -2px rgba(83,74,183,.2)}
.ks-row:hover kbd,.ks-row2:hover kbd{transform:translateY(-1px);box-shadow:0 3px 0 rgba(30,28,24,.06),0 2px 4px rgba(83,74,183,.1)}
.ks-note{margin-top:var(--space-14);font-size:var(--font-size-micro);line-height:1.55;color:var(--mut2);padding:var(--space-10) var(--space-13);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.02) 100%);border-radius:8px}
.ks-foot{margin-top:var(--space-18);padding-top:var(--space-14);border-top:1px solid var(--bd);font-size:var(--font-size-micro);line-height:1.55;color:var(--mut)}
`;
var KBD_HTML = `<div class="ks-sec">
        <div class="ks-h">Jump straight to any view</div>
        <div class="ks-grid">
          <div class="ks-row"><kbd>Q</kbd><span>Walkthrough</span></div>
          <div class="ks-row"><kbd>W</kbd><span>Probe Drill</span></div>
          <div class="ks-row"><kbd>E</kbd><span>Whiteboard</span></div>
          <div class="ks-row"><kbd>R</kbd><span>System Map</span></div>
          <div class="ks-row"><kbd>T</kbd><span>Trade-offs</span></div>
          <div class="ks-row"><kbd>Y</kbd><span>Model Answers</span></div>
          <div class="ks-row"><kbd>U</kbd><span>Numbers</span></div>
          <div class="ks-row"><kbd>I</kbd><span>Red Flags</span></div>
          <div class="ks-row"><kbd>O</kbd><span>30-Second</span></div>
        </div>
        <div class="ks-note"><kbd class="ks-mini">Q</kbd> to <kbd class="ks-mini">O</kbd> run left-to-right across the top row, in pane order &mdash; just reach, no memorizing.</div>
      </div>
      <div class="ks-sec">
        <div class="ks-h">Move through the one you&rsquo;re on</div>
        <div class="ks-list">
          <div class="ks-row2"><span class="ks-keys"><kbd>&larr;</kbd><kbd>&rarr;</kbd></span><span>Step back &amp; forward through the walkthrough</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>Space</kbd><span class="ks-or">/</span><kbd>Enter</kbd></span><span>Reveal the answer &middot; advance the next beat</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>1</kbd><kbd>2</kbd></span><span>In the drill, score the probe &mdash; Solid or Revisit</span></div>
        </div>
      </div>
      <div class="ks-sec">
        <div class="ks-h">Anywhere</div>
        <div class="ks-list">
          <div class="ks-row2"><span class="ks-keys"><kbd>/</kbd></span><span>Search topics, concepts &amp; views</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>\\</kbd></span><span>Open the Topic index</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>[</kbd><kbd>]</kbd></span><span>Previous &middot; next topic</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>G</kbd></span><span>Start the guided tour</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>D</kbd></span><span>Cycle spacing density &mdash; compact &middot; cozy &middot; default</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>Esc</kbd></span><span>Close any open panel</span></div>
          <div class="ks-row2"><span class="ks-keys"><kbd>?</kbd></span><span>Bring up this list</span></div>
        </div>
      </div>
      <div class="ks-foot">These pause while a panel like this one is open &mdash; close it and they&rsquo;re live again.</div>`;
class DeepKeyboard extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET];
    root.innerHTML = '<style>' + KBD_STYLE + '</style>' + KBD_HTML;
  }
}
customElements.define('deep-keyboard', DeepKeyboard);
})();
