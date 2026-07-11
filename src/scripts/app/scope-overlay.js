(function () {
/* E1a: IIFE-scoped -- this module leaks no symbols other files use.
   The web-component class + its customElements.define run inside; the tag
   still registers globally, only the private consts/helpers stop leaking. */
/* ============ SCOPE-IT-FIRST OVERLAY (web component) ============
   Frame (.mock-ov/.mock-panel/.mock-top/close/.cram-body) + open-close wiring
   (cram-sheet.js openScope -> ovShow) stay light-DOM; the content lives in this
   shadow, styled by BASE_SHEET + the shared CS_SHEET.

   PER-TOPIC (bug fix): the content used to be a baked Content Pipeline template
   string -- so "the questions that fork THIS architecture" asked about file types
   and GB media on all 46 topics. It is now DERIVED from the current topic's own
   authored trade-off forks + Numbers inputs by deriveScope() (cram-derive.js), and
   re-derived on every `deeptopicchange`. It never shows another topic's content. */
class DeepScope extends HTMLElement {
  connectedCallback() {
    if (this._built) return;
    this._built = true;
    const root = this.attachShadow({ mode: 'open' });
    root.adoptedStyleSheets = [BASE_SHEET, CS_SHEET];
    this._root = root;
    this._render();
    this._onTopic = function () { this._render(); }.bind(this);
    window.addEventListener('deeptopicchange', this._onTopic);
  }
  _render() { this._root.innerHTML = deriveScope(TopicRegistry.current()); }
  disconnectedCallback() {
    if (this._onTopic) { window.removeEventListener('deeptopicchange', this._onTopic); this._onTopic = null; }
  }
}
customElements.define('deep-scope', DeepScope);
})();
