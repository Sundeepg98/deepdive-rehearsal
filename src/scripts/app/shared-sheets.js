/* ===== shared pane stylesheets: class families rendered by more than one component =====
   A few interactive panes share a content vocabulary. Rather than copy the identical
   rules into each shadow root's inline <style>, every shared family is defined ONCE
   here as a constructable stylesheet and adopted (alongside BASE_SHEET) by exactly the
   components that render it -- the same pattern as CS_SHEET in content-sheet.js. Each
   sheet's rules were verified byte-identical across the components before being lifted
   here, so consolidation changes nothing visually. Every colour is a theme token, so
   light/dark needs no variants.

   OPT_SHEET -- the .opt trade-option family: <deep-trade-offs> + <deep-mixed-fire>.
   ANS_SHEET -- the question / answer / follow-up / senior / push / judge family,
                rendered by both <deep-drill> and <deep-mixed-fire>.
   MOCK_SHEET -- the .mock-body shadow-body container, shared by the two beat-runner
                shadows <deep-mock-run> (mockbody) and <deep-mixed-fire> (mixbody).
   MBEAT_SHEET -- the base .mbeat "beat row" rules (the two-column beat layout),
                shared by <deep-model-answers> and <deep-walkthrough>.
   DISC_SHEET -- the details.disc disclosure-widget family (the collapsible
                "go deeper / see the code" boxes): <deep-walkthrough> + <deep-whiteboard>. */
var OPT_SHEET = new CSSStyleSheet();
OPT_SHEET.replaceSync(`
.opt{margin:13px 0;padding:10px 12px;background:linear-gradient(135deg,rgba(83,74,183,.02) 0%,transparent 100%);border-radius:8px;border-left:2px solid var(--acc);transition:background .2s ease,padding .2s ease}
.opt:hover{padding-left:14px;background:linear-gradient(135deg,rgba(83,74,183,.04) 0%,transparent 100%)}
.opt-n{display:inline-block;font:800 10.5px -apple-system,sans-serif;letter-spacing:.3px;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border:1px solid var(--opt-n-bd);border-radius:6px;padding:4px 10px;margin-bottom:6px;box-shadow:0 1px 4px -2px rgba(83,74,183,.08)}
.opt-w{font-size:12.8px;line-height:1.57;color:var(--ink);transition:color .2s ease}
.opt-w .pw{font-weight:800;color:var(--mut2);text-transform:uppercase;font-size:9.5px;letter-spacing:.5px;margin-right:7px}
.opt-w b{color:var(--accink);font-weight:700}
`);

var ANS_SHEET = new CSSStyleSheet();
ANS_SHEET.replaceSync(`
.qq{font-size:15.5px;font-weight:680;color:var(--ink);line-height:1.45;letter-spacing:-.01em}t:1.45;letter-spacing:-.01em}
.ans{font-size:13px;color:var(--ans-fg);margin-top:14px;padding:14px 17px;background:linear-gradient(135deg,var(--ans-bg) 0%,rgba(83,74,183,.03) 100%);border-left:3px solid var(--acc);border-radius:9px;animation:pop .22s ease;box-shadow:0 1px 4px -2px rgba(83,74,183,.06);line-height:1.6}
.ans b{color:var(--accink);font-weight:700}
.fu{margin-top:14px;animation:pop .24s ease}
.fu .lab{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--amber);display:flex;align-items:center;gap:7px;margin-bottom:7px}
.fu .lab::before{content:"\\21B3";font-size:14px}
.fu .fq{font-size:14px;font-weight:650;color:var(--ink);line-height:1.45;letter-spacing:-.01em}1.45}
.fu .fa{font-size:12.5px;color:var(--ans-fg);margin-top:10px;padding:12px 16px;background:linear-gradient(135deg,var(--fa-bg) 0%,rgba(176,108,20,.03) 100%);border-left:3px solid var(--amber);border-radius:9px;line-height:1.6}
.fu .fa b{color:var(--fa-b-fg);font-weight:700}
.senior{margin-top:15px;font-size:12.5px;color:var(--senior-fg);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);border:1px solid var(--senior-bd);border-radius:10px;padding:13px 16px;animation:pop .24s ease;box-shadow:0 1px 4px -2px rgba(10,133,100,.06)}
.senior .sl{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:7px;margin-bottom:5px}
.senior .sl::before{content:"\\2605"}
.senior b{color:var(--fb-t-fg);font-weight:700}
.push{margin-top:15px;width:100%;border:0;color:var(--push-fg);font:700 13px -apple-system,sans-serif;padding:13px;border-radius:11px;cursor:pointer;transition:transform .18s cubic-bezier(.22,.61,.36,1),box-shadow .25s ease,filter .2s ease;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 5px 15px rgba(83,74,183,.27),inset 0 1px 0 rgba(255,255,255,.14);position:relative;overflow:hidden}
.push::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,.1) 50%,transparent 70%);opacity:0;transition:opacity .3s ease}
.push:hover::after{opacity:1}
.push.more{background:linear-gradient(135deg,var(--amber),#b9740f);box-shadow:0 5px 15px rgba(176,108,20,.30),inset 0 1px 0 rgba(255,255,255,.16)}
.push:hover:not(.more){box-shadow:0 10px 28px rgba(83,74,183,.45),inset 0 1px 0 rgba(255,255,255,.14),0 0 40px -10px rgba(83,74,183,.2);transform:translateY(-2px);filter:brightness(1.05);animation:pushGlow 2s ease-in-out infinite}
@keyframes pushGlow{0%,100%{box-shadow:0 10px 28px rgba(83,74,183,.45),inset 0 1px 0 rgba(255,255,255,.14),0 0 40px -10px rgba(83,74,183,.15)}50%{box-shadow:0 10px 28px rgba(83,74,183,.5),inset 0 1px 0 rgba(255,255,255,.14),0 0 60px -10px rgba(83,74,183,.25)}}
.push.more:hover{box-shadow:0 10px 28px rgba(176,108,20,.45),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-2px);filter:brightness(1.05)}
.push:active:not(.more),.push.more:active{transform:translateY(1px) scale(.99);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.1);filter:brightness(.97)}
.judge{display:flex;gap:10px;margin-top:15px}
.judge button{flex:1;border:1.5px solid;background:var(--judge-btn-bg);font:700 13px -apple-system,sans-serif;padding:12px;border-radius:11px;cursor:pointer;transition:transform .15s cubic-bezier(.22,.61,.36,1),box-shadow .2s ease,background .15s ease}
.judge .got{border-color:var(--teal);color:var(--teal);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%)} .judge .got:hover{background:var(--tealbg);box-shadow:0 4px 14px -4px rgba(10,133,100,.25);transform:translateY(-1px)}
.judge .shk{border-color:var(--amber);color:var(--amber);background:linear-gradient(135deg,var(--amberbg) 0%,rgba(176,108,20,.04) 100%)} .judge .shk:hover{background:var(--amberbg);box-shadow:0 4px 14px -4px rgba(176,108,20,.25);transform:translateY(-1px)}
.judge .hint{font-size:9px;font-weight:700}
.got:active,.shk:active{transform:translateY(1px) scale(.98);filter:brightness(.96)}
`);

var MOCK_SHEET = new CSSStyleSheet();
MOCK_SHEET.replaceSync(`
.mock-body{padding:19px 18px 22px}
`);

var MBEAT_SHEET = new CSSStyleSheet();
MBEAT_SHEET.replaceSync(`
.mbeat{margin:13px 0;font-size:13.5px;line-height:1.62;color:var(--ink);background:linear-gradient(135deg,transparent 0%,rgba(83,74,183,.015) 100%);border-radius:8px;padding:10px 12px;transition:background .2s ease,padding .2s ease}
.mbeat{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--bd);transition:padding .2s ease,background .2s ease} var(--bd)}
.mbeat:last-child{border-bottom:0;padding-bottom:2px}
.mbeat b{color:var(--accink)}
`);

var DISC_SHEET = new CSSStyleSheet();
DISC_SHEET.replaceSync(`
details.disc{margin-top:12px;border:1px solid var(--bd);border-radius:10px;overflow:hidden;background:linear-gradient(135deg,var(--disc-bg) 0%,rgba(83,74,183,.02) 100%);transition:box-shadow .25s ease,border-color .2s ease;animation:discIn .3s ease backwards}
@keyframes discIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
details.disc[open]{border-color:rgba(83,74,183,.2);box-shadow:0 0 0 1px rgba(83,74,183,.06),var(--surf-sh)}
details.disc summary{cursor:pointer;font:700 12px -apple-system,sans-serif;color:var(--acc);padding:11px 15px;list-style:none;display:flex;align-items:center;gap:8px;transition:background .18s ease,padding .2s ease}
details.disc summary::-webkit-details-marker{display:none}
details.disc summary::before{content:"\\25B8";transition:transform .25s cubic-bezier(.34,1.56,.64,1);font-size:11px;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:5px;background:var(--accbg)}
details.disc[open] summary::before{transform:rotate(90deg)}
details.disc summary:hover{background:rgba(109,95,214,.07);padding-left:17px}
details.disc .body{padding:2px 16px 14px;font-size:12.5px;color:var(--disc-body-fg);line-height:1.6}
`);
