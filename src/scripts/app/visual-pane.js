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
      setTimeout(function () {
        if (self._data || !self._active || !window.goView) return;
        /* DEEP-LINK GUARD. On a "#<topic>/viz" deep link this handler ALSO runs at FIRST
           PAINT, while the registry still holds the DEFAULT topic -- whose data.visual is
           undefined. The old unconditional bounce therefore called goView('walk') ->
           pushState, overwriting the deep-linked hash BEFORE Router.init() ever parsed it;
           the router then read "#<default>/walk" and the user was silently stranded on the
           default topic. viz was the ONLY route that could not be deep-linked (measured:
           "#kafka-internals/viz" landed on "#content-pipeline/walk").
           So when the route names a topic the registry has not applied yet, decide from
           the PENDING topic's data, never from the stale current one. */
        var r = (window.Router && window.Router.current) ? window.Router.current() : null;
        var reg = (typeof TopicRegistry !== 'undefined') ? TopicRegistry : null;
        var curT = (reg && reg.current()) ? reg.current().id : null;
        if (r && r.topic && curT && reg && r.topic !== curT) {
          var pend = reg.get(r.topic);
          if (pend && pend.data && pend.data.visual) return;   /* it HAS a visual: stand down,
              let the router land the topic, and renderTopic runs again with real data. */
          /* Pending topic has NO visual either, so we do still bounce -- but land the topic
             FIRST. goView() builds the hash from the CURRENT topic's prefix, so bouncing
             while the default topic is still current would rewrite the deep-linked topic
             away a second time. Landing it here also means the router never queues a viz
             pane swap: switchTab('viz') and switchTab('walk') both defer their DOM mutation
             into startViewTransition(), and when they overlap the viz callback resolves LAST
             and wins -- leaving the viz pane visibly on under a "/walk" hash. */
          reg.setTopic(r.topic);
        }
        window.goView('walk');
      }, 0);
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
