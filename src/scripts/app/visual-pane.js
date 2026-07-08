/* ===== deep-visual: the Visualize pane (TopicPane contract, dataKey 'visual').
   A topic opts in by authoring a ## Visual section in its own markdown; the
   compiler emits TOPIC_<P>_VISUAL and the registry republishes it as
   topic.data.visual. This pane lazily mounts the VisualKit (WebGL2) when the
   viz route is active AND the topic has a config; disposes on leave/switch so
   exactly one GL context lives. The nav tab shows only for opted-in topics. */
class DeepVisual extends TopicPane {
  static dataKey = 'visual';
  styleText() {
    return ':host{display:block}#vzhost{display:block}' +
      '#vzempty{color:var(--tx-dim,#8b949e);font-size:14px;padding:24px 8px}';
  }
  skeleton() { return '<div id="vzhost"></div><p id="vzempty" hidden>This topic has no visual mode.</p>'; }
  init(root) {
    this._host = root.getElementById('vzhost');
    this._empty = root.getElementById('vzempty');
    this._inst = null;
    var seg = (window.location.hash || '').replace(/^#/, '').split('/');
    this._active = (seg[1] || seg[0]) === 'viz';
    var self = this;
    window.addEventListener('routechange', function (e) {
      var d = e.detail || {};
      var id = d.view || (d.route && d.route.id) || d.id;
      var was = self._active;
      self._active = id === 'viz';
      if (self._active && !was) self._mount();
      if (!self._active && was) self._unmount();
    });
  }
  renderTopic(d) {
    this._data = d || null;
    var btn = document.querySelector('.seg button[data-tab="viz"], button[data-tab="viz"]');
    if (btn) btn.hidden = !d;
    this._empty.hidden = !!d;
    if (!d && this._active) {                            /* bounce off a viz-less topic --
      deferred: the topic protocol rewrites the hash AFTER this handler, so an
      immediate navigate gets overwritten back to #viz */
      var self = this;
      setTimeout(function () { if (!self._data && self._active && window.goView) window.goView('walk'); }, 0);
    }
    if (this._active) this._mount();
  }
  teardownTopic() { this._unmount(); }
  _mount() {
    if (this._inst || !this._data || !window.VisualKit) return;
    try {
      this._inst = window.VisualKit.mount(this._host, this._data);
      window.__VIZ = this._inst;
    } catch (e) { this._empty.hidden = false; this._empty.textContent = 'Visual failed: ' + e.message; }
  }
  _unmount() {
    if (!this._inst) return;
    try { this._inst.dispose(); } catch (e) {}
    this._inst = null;
    window.__VIZ = null;
  }
}
customElements.define('deep-visual', DeepVisual);
