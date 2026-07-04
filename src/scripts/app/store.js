/* ===== scripts/app/store.js -- persistence layer =====
   A thin, defensive wrapper over localStorage. Everything the app persists
   (progress, bookmarks, notes, preferences, visited state) goes through here.
   Keys are namespaced under one prefix + schema version so they never collide
   and future migrations have a hook. If localStorage is unavailable (private
   mode, disabled, quota exceeded), every call degrades to an in-memory fallback
   so the app keeps working -- persistence is an enhancement, never a dependency. */
/* Captured before the router normalizes the URL: an empty boot hash means a
   fresh landing (open the home), a non-empty one means a deep-link (honor it). */
window.__bootHash = (typeof window !== 'undefined' && window.location) ? window.location.hash : '';

var Store = (function () {
  var PREFIX = 'ddr.v1.';
  var mem = {};
  var ok = (function () {
    try {
      var k = PREFIX + '__probe__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  function full(key) { return PREFIX + key; }

  function get(key, dflt) {
    var d = dflt === undefined ? null : dflt, raw;
    try { raw = ok ? window.localStorage.getItem(full(key)) : mem[full(key)]; }
    catch (e) { raw = mem[full(key)]; }
    if (raw == null) return d;
    try { return JSON.parse(raw); } catch (e) { return d; }
  }

  function set(key, value) {
    var raw;
    try { raw = JSON.stringify(value); } catch (e) { return false; }
    try {
      if (ok) window.localStorage.setItem(full(key), raw); else mem[full(key)] = raw;
      return true;
    } catch (e) { mem[full(key)] = raw; return false; }
  }

  function remove(key) {
    try { if (ok) window.localStorage.removeItem(full(key)); } catch (e) {}
    delete mem[full(key)];
  }

  /* keys under a sub-prefix, returned without the global PREFIX */
  function keys(sub) {
    var out = [], pre = full(sub || '');
    try {
      if (ok) {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(pre) === 0) out.push(k.slice(PREFIX.length));
        }
      }
    } catch (e) {}
    for (var mk in mem) { if (mk.indexOf(pre) === 0 && out.indexOf(mk.slice(PREFIX.length)) === -1) out.push(mk.slice(PREFIX.length)); }
    return out;
  }

  function available() { return ok; }

  /* wipe everything under our prefix -- backs a "reset all data" affordance */
  function clearAll() {
    try {
      if (ok) {
        var del = [];
        for (var i = 0; i < window.localStorage.length; i++) { var k = window.localStorage.key(i); if (k && k.indexOf(PREFIX) === 0) del.push(k); }
        for (var j = 0; j < del.length; j++) window.localStorage.removeItem(del[j]);
      }
    } catch (e) {}
    mem = {};
  }

  return { get: get, set: set, remove: remove, keys: keys, available: available, clearAll: clearAll };
})();
window.Store = Store;
