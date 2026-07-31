/* ===== scripts/app/print-qa.js -- printable Q&A export (O4) =====
   Opens a clean new window with the current topic's full probe bank (question,
   answer, interviewer follow-ups, what-sounds-senior) formatted for print / Save
   as PDF. Uses its own document so no @media-print scoping of the app chrome or
   shadow-DOM is needed. */
(function () {
  var CSS =
    "*{margin:0;padding:0;box-sizing:border-box}" +
    "body{font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:var(--space-760);margin:0 auto;padding:var(--space-40) var(--space-32) var(--space-60)}" +
    "header{border-bottom:2px solid #1a1a1a;padding-bottom:var(--space-16);margin-bottom:var(--space-28)}" +
    "h1{font-size:var(--font-size-display);font-weight:var(--font-weight-heavy);letter-spacing:var(--track-em-neg-0-01)}" +
    ".sub{font-size:var(--font-size-body);color:#555;font-weight:var(--font-weight-semibold);margin-top:var(--space-4)}" +
    ".meta{font-size:var(--font-size-micro);color:#888;margin-top:var(--space-9);text-transform:uppercase;letter-spacing:var(--track-em-0-07);font-weight:var(--font-weight-bold)}" +
    "article{margin-bottom:var(--space-26);padding-bottom:var(--space-22);border-bottom:1px solid #e2e2e2;break-inside:avoid;page-break-inside:avoid}" +
    ".sig{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:var(--track-em-0-06);text-transform:uppercase;color:#534AB7;margin-bottom:var(--space-6)}" +
    "h2{font-size:var(--font-size-subhead);font-weight:var(--font-weight-bold);line-height:var(--line-height-relaxed);margin-bottom:var(--space-11)}" +
    ".qn{color:#534AB7}" +
    ".a{font-size:var(--font-size-small);line-height:var(--line-height-spacious);margin-bottom:var(--space-12)}" +
    ".fu{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin:var(--space-9) 0 var(--space-9) var(--space-18);padding-left:var(--space-13);border-left:2px solid #d0d0d0}" +
    ".fl{font-weight:var(--font-weight-bold);color:#666}" +
    ".fa{margin-top:var(--space-3);color:#555}" +
    ".sr{font-size:var(--font-size-caption);line-height:var(--line-height-airy);margin-top:var(--space-11);padding:var(--space-11) var(--space-15);background:#eef6f3;border:1px solid #b8ddd2;border-radius:7px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".sl{font-weight:var(--font-weight-bold);color:#0F6E56}" +
    "footer{margin-top:var(--space-20);font-size:var(--font-size-nano);color:#aaa;text-align:center}" +
    "b,strong{font-weight:var(--font-weight-bold)}em,i{font-style:italic}" +
    "code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.9em;background:#f3f3f3;padding:var(--space-1) var(--space-4);border-radius:3px}" +
    "@media print{body{padding:0}}";

  /* THE TOKENS THIS DOCUMENT NEVER HAD. The CSS above is authored in the app's design tokens, but
     it is injected into a window.open() document whose only content is that one <style> -- there is
     no :root anywhere in it, so EVERY var() above resolved to nothing. Measured in the shipped
     artifact: --space-760, --space-40, --font-size-display, --font-weight-heavy and
     --line-height-spacious all (UNDEFINED); h1 computed 14px/400 and h2 14px -- byte-identical to
     body copy, so a 22-probe sheet printed with NO typographic hierarchy at all, and no measure
     (body max-width:none -> 1280px lines) and no gap between Q&A blocks (article margin 0).
     It is a second print surface and it owns Ctrl/Cmd+P (see wire() below), so this is what the
     keyboard shortcut has always produced.

     Harvest the values from the LIVE app document rather than hardcoding them here. The token names
     are read back out of the CSS string itself, so a token added to that string tomorrow is carried
     across automatically and this cannot rot into a stale hardcoded list -- the failure mode that
     produced the bug in the first place was a copy of the design system that nobody kept in sync.
     The tokens are @property-registered with a <length>/<number> syntax, so getComputedStyle
     returns them fully resolved (--font-size-display -> "24px", not "var(--size-font-24)"), and a
     one-level copy is therefore complete. It also means the printed sheet follows the reader's own
     density setting: html[data-density=compact] and =cozy redefine the whole space scale. */
  function tokenBlock() {
    /* Matches var(--x) AND var(--x, fallback) -- the closing paren is deliberately NOT required.
       Requiring it dropped any token written with a fallback, silently, which is the same class of
       quiet omission this whole function exists to fix. There are none today (45 of 45 references
       in the CSS above are bare), so this is guarding the next edit, not a live bug. */
    var refs = CSS.match(/var\(\s*(--[a-z0-9-]+)\s*[,)]/g) || [];
    var root = document.documentElement;
    var cs = window.getComputedStyle(root);
    var seen = {}, decls = [];
    for (var i = 0; i < refs.length; i++) {
      var name = refs[i].replace(/^var\(\s*/, '').replace(/\s*[,)]$/, '');
      if (seen[name]) continue;
      seen[name] = 1;
      var v = cs.getPropertyValue(name).trim();
      if (v) decls.push(name + ':' + v);
    }
    return decls.length ? ':root{' + decls.join(';') + '}' : '';
  }

  function curTopic() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null; }

  function buildHtml() {
    var r = curTopic();
    if (!r || !r.data || !r.data.bank || !r.data.bank.cards) return null;
    var idn = r.identity, cards = r.data.bank.cards;
    var h = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + idn.title + ' \u2014 Q&A</title><style>' + tokenBlock() + CSS + '</style></head><body>';
    h += '<header><h1>' + idn.title + '</h1>' + (idn.h1 ? '<p class="sub">' + idn.h1 + '</p>' : '') + '<p class="meta">' + cards.length + ' interview probes &middot; Deep Rehearsal Q&amp;A</p></header>';
    cards.forEach(function (c, i) {
      h += '<article><div class="sig">' + (c.signal || '') + '</div><h2><span class="qn">Q' + (i + 1) + '.</span> ' + c.q + '</h2><div class="a">' + c.a + '</div>';
      if (c.f && c.f.length) c.f.forEach(function (x) { h += '<div class="fu"><span class="fl">Follow-up:</span> ' + x.q + '<div class="fa">' + x.a + '</div></div>'; });
      if (c.senior) h += '<div class="sr"><span class="sl">What sounds senior:</span> ' + c.senior + '</div>';
      h += '</article>';
    });
    h += '<footer>Generated from Deep Rehearsal &middot; ' + idn.title + '</footer></body></html>';
    return h;
  }

  function openPrint() {
    var html = buildHtml(); if (!html) return;
    var w = window.open('', '_blank');
    if (!w) { try { window.alert('Please allow pop-ups to open the printable Q&A.'); } catch (e) {} return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 350);
  }

  function wire() {
    var b = document.getElementById('printqa'); if (b) b.addEventListener('click', openPrint);
    /* Native browser print of a topic view comes out blank -- the shadow-DOM panes
       don't render to print -- so route Ctrl/Cmd+P to the working printable Q&A. */
    document.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'p' || e.key === 'P')) { e.preventDefault(); openPrint(); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
  window.PrintQA = { print: openPrint };
})();
