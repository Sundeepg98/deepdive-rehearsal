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
    "h1{font-size:var(--font-size-display);font-weight:800;letter-spacing:-.01em}" +
    ".sub{font-size:var(--font-size-body);color:#555;font-weight:600;margin-top:var(--space-4)}" +
    ".meta{font-size:var(--font-size-micro);color:#888;margin-top:var(--space-9);text-transform:uppercase;letter-spacing:.07em;font-weight:700}" +
    "article{margin-bottom:var(--space-26);padding-bottom:var(--space-22);border-bottom:1px solid #e2e2e2;break-inside:avoid;page-break-inside:avoid}" +
    ".sig{font-size:var(--font-size-nano);font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#534AB7;margin-bottom:var(--space-6)}" +
    "h2{font-size:var(--font-size-subhead);font-weight:700;line-height:1.45;margin-bottom:var(--space-11)}" +
    ".qn{color:#534AB7}" +
    ".a{font-size:var(--font-size-small);line-height:1.62;margin-bottom:var(--space-12)}" +
    ".fu{font-size:var(--font-size-caption);line-height:1.55;margin:var(--space-9) 0 var(--space-9) var(--space-18);padding-left:var(--space-13);border-left:2px solid #d0d0d0}" +
    ".fl{font-weight:700;color:#666}" +
    ".fa{margin-top:var(--space-3);color:#555}" +
    ".sr{font-size:var(--font-size-caption);line-height:1.55;margin-top:var(--space-11);padding:var(--space-11) var(--space-15);background:#eef6f3;border:1px solid #b8ddd2;border-radius:7px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".sl{font-weight:700;color:#0F6E56}" +
    "footer{margin-top:var(--space-20);font-size:var(--font-size-nano);color:#aaa;text-align:center}" +
    "b,strong{font-weight:700}em,i{font-style:italic}" +
    "code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.9em;background:#f3f3f3;padding:var(--space-1) var(--space-4);border-radius:3px}" +
    "@media print{body{padding:0}}";

  function curTopic() { return (typeof TopicRegistry !== 'undefined' && TopicRegistry.current) ? TopicRegistry.current() : null; }

  function buildHtml() {
    var r = curTopic();
    if (!r || !r.data || !r.data.bank || !r.data.bank.cards) return null;
    var idn = r.identity, cards = r.data.bank.cards;
    var h = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>' + idn.title + ' \u2014 Q&A</title><style>' + CSS + '</style></head><body>';
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
