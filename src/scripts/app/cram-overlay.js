(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ CRAM SHEET OVERLAY (web component) ============
   The densest overlay; uses the full .cs-* vocabulary. Frame (cram-ov/cram-panel/
   cram-top/cram-print/close) + open-close + Print wiring (cram-sheet.js openCram ->
   ovShow) stay light-DOM. Content lives in this shadow, styled by BASE_SHEET + the
   shared CS_SHEET. One cram-specific rule below: the inline :host code styling, which
   restores the light-DOM `.cram-body code` look (BASE_SHEET's code rule differs in
   size/bg/color), with color:var(--accink) matching the global code rule the original
   code inherits, not BASE_SHEET's accink and dark via token.

   PER-TOPIC (bug fix): the body used to be a baked Content Pipeline template string,
   so every one of the 46 topics served topic 1's sheet under its own header. It is now
   DERIVED from the current topic's own authored slices by deriveCram() (cram-derive.js)
   and re-derived on every `deeptopicchange`. It never shows another topic's content. */
class DeepCram extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, CS_SHEET];
    this._root = root;
    /* Lazy-render: defer the heaviest DOM in the app until the overlay is visible.
       `_dirty` is the re-render gate -- set at boot and on every topic switch, so a
       switch made while the overlay is CLOSED still repaints before it is next seen. */
    this._dirty = true;
    this._onTopic = function () { this._dirty = true; this._maybeRender(); }.bind(this);
    window.addEventListener('deeptopicchange', this._onTopic);
    this._maybeRender();
  }
  /* Render now if we are visible; otherwise arm the observer and render on reveal.
     PERF (perf/chunk-proto): the visibility probe used to be `this.offsetParent !== null`,
     which forces a full style+layout flush on EVERY deeptopicchange (~55ms of each entry
     task at 4x CPU). The overlay frame already OWNS visibility as state: .cram-ov is
     display:none until ovShow() stamps `.open` (cram-sheet.js) -- so the class answers
     "visible now?" with zero layout work. offsetParent remains only as the fallback for
     a host mounted outside the overlay frame. */
  _maybeRender() {
    if (!this._dirty) return;
    if (this._ovBox === undefined) this._ovBox = this.closest('.cram-ov');
    if (this._ovBox ? this._ovBox.classList.contains('open') : this.offsetParent !== null) { this._renderNow(); return; }
    if (this._io) return;
    this._io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { this._renderNow(); }
    }.bind(this), { rootMargin: '200px' });
    this._io.observe(this);
  }
  _renderNow() {
    if (!this._dirty) return;
    this._dirty = false;
    if (this._io) { this._io.disconnect(); this._io = null; }
    const STYLE = '<style>:host code{font-size:var(--font-size-micro);background:linear-gradient(135deg,var(--cram-code-bg) 0%,var(--acc-a04) 100%);border-radius:5px;padding:var(--space-2) var(--space-6);font-family:ui-monospace,Menlo,monospace;color:var(--accink);border:1px solid var(--acc-a08)}:host b{color:var(--accink);font-weight:var(--font-weight-bold)}</style>';
    this._root.innerHTML = STYLE + deriveCram(TopicRegistry.current());
  }
  disconnectedCallback() {
    if (this._io) { this._io.disconnect(); this._io = null; }
    if (this._onTopic) { window.removeEventListener('deeptopicchange', this._onTopic); this._onTopic = null; }
  }
}
customElements.define('deep-cram', DeepCram);
})();
