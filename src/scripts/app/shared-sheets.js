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
                rendered by both <deep-drill> and <deep-mixed-fire>. */
var OPT_SHEET = new CSSStyleSheet();
OPT_SHEET.replaceSync(`
.opt{margin:11px 0}
.opt-n{display:inline-block;font:800 10.5px -apple-system,sans-serif;letter-spacing:.3px;color:var(--accink);background:var(--accbg);border:1px solid var(--opt-n-bd);border-radius:6px;padding:4px 9px;margin-bottom:5px}
.opt-w{font-size:12.8px;line-height:1.57;color:var(--ink)}
.opt-w .pw{font-weight:800;color:var(--mut2);text-transform:uppercase;font-size:9.5px;letter-spacing:.5px;margin-right:6px}
.opt-w b{color:var(--accink)}
`);

var ANS_SHEET = new CSSStyleSheet();
ANS_SHEET.replaceSync(`
.qq{font-size:15.5px;font-weight:680;color:var(--ink);line-height:1.45}
.ans{font-size:13px;color:var(--ans-fg);margin-top:13px;padding:13px 15px;background:var(--ans-bg);border-left:3px solid var(--acc);border-radius:8px;animation:pop .22s ease}
.ans b{color:var(--accink)}
.fu{margin-top:13px;animation:pop .24s ease}
.fu .lab{font-size:10px;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:var(--amber);display:flex;align-items:center;gap:6px;margin-bottom:6px}
.fu .lab::before{content:"\\21B3";font-size:14px}
.fu .fq{font-size:14px;font-weight:650;color:var(--ink);line-height:1.45}
.fu .fa{font-size:12.5px;color:var(--ans-fg);margin-top:9px;padding:11px 14px;background:var(--fa-bg);border-left:3px solid var(--amber);border-radius:8px}
.fu .fa b{color:var(--fa-b-fg)}
.senior{margin-top:14px;font-size:12.5px;color:var(--senior-fg);background:var(--tealbg);border:1px solid var(--senior-bd);border-radius:9px;padding:12px 14px;animation:pop .24s ease}
.senior .sl{font-size:10px;font-weight:800;letter-spacing:.8px;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:6px;margin-bottom:5px}
.senior .sl::before{content:"\\2605"}
.senior b{color:var(--fb-t-fg)}
.push{margin-top:15px;width:100%;border:0;color:var(--push-fg);font:700 13px -apple-system,sans-serif;padding:13px;border-radius:11px;cursor:pointer;transition:.12s;background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 5px 15px rgba(83,74,183,.27),inset 0 1px 0 rgba(255,255,255,.14)}
.push.more{background:linear-gradient(135deg,var(--amber),#b9740f);box-shadow:0 5px 15px rgba(176,108,20,.30),inset 0 1px 0 rgba(255,255,255,.16)}
.push:hover:not(.more){box-shadow:0 9px 26px rgba(83,74,183,.42),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-1px)}
.push.more:hover{box-shadow:0 9px 26px rgba(176,108,20,.42),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-1px)}
.push:active:not(.more),.push.more:active{transform:translateY(1px);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.1)}
.judge{display:flex;gap:10px;margin-top:15px}
.judge button{flex:1;border:1.5px solid;background:var(--judge-btn-bg);font:700 13px -apple-system,sans-serif;padding:12px;border-radius:11px;cursor:pointer;transition:.12s}
.judge .got{border-color:var(--teal);color:var(--teal)} .judge .got:hover{background:var(--tealbg)}
.judge .shk{border-color:var(--amber);color:var(--amber)} .judge .shk:hover{background:var(--amberbg)}
.judge .hint{font-size:9px;font-weight:700}
.got:active,.shk:active{transform:translateY(1px);filter:brightness(.96)}
`);
