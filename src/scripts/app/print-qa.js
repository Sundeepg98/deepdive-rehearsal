/* ===== scripts/app/print-qa.js -- printable Q&A export (O4) =====
   Opens a clean new window with the current topic's full probe bank (question,
   answer, interviewer follow-ups, what-sounds-senior) formatted for print / Save
   as PDF. Uses its own document so no @media-print scoping of the app chrome or
   shadow-DOM is needed. */
(function () {
  var CSS =
    "*{margin:0;padding:0;box-sizing:border-box}" +
    "body{font:14px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;max-width:760px;margin:0 auto;padding:40px 32px 60px}" +
    "header{border-bottom:2px solid #1a1a1a;padding-bottom:16px;margin-bottom:28px}" +
    "h1{font-size:27px;font-weight:800;letter-spacing:-.01em}" +
    ".sub{font-size:14px;color:#555;font-weight:600;margin-top:4px}" +
    ".meta{font-size:10.5px;color:#888;margin-top:9px;text-transform:uppercase;letter-spacing:.07em;font-weight:700}" +
    "article{margin-bottom:26px;padding-bottom:22px;border-bottom:1px solid #e2e2e2;break-inside:avoid;page-break-inside:avoid}" +
    ".sig{font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#534AB7;margin-bottom:6px}" +
    "h2{font-size:15.5px;font-weight:700;line-height:1.45;margin-bottom:11px}" +
    ".qn{color:#534AB7}" +
    ".a{font-size:13.5px;line-height:1.62;margin-bottom:12px}" +
    ".fu{font-size:12.5px;line-height:1.55;margin:9px 0 9px 18px;padding-left:13px;border-left:2px solid #d0d0d0}" +
    ".fl{font-weight:700;color:#666}" +
    ".fa{margin-top:3px;color:#555}" +
    ".sr{font-size:12.5px;line-height:1.55;margin-top:11px;padding:11px 15px;background:#eef6f3;border:1px solid #b8ddd2;border-radius:7px;-webkit-print-color-adjust:exact;print-color-adjust:exact}" +
    ".sl{font-weight:700;color:#0F6E56}" +
    "footer{margin-top:20px;font-size:10px;color:#aaa;text-align:center}" +
    "b,strong{font-weight:700}em,i{font-style:italic}" +
    "code{font-family:'SF Mono',Menlo,Consolas,monospace;font-size:.9em;background:#f3f3f3;padding:1px 4px;border-radius:3px}" +
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
