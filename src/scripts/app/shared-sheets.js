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
.opt{margin:var(--space-13) 0;padding:var(--space-10) var(--space-12);background:linear-gradient(135deg,var(--acc-a02) 0%,transparent 100%);border-radius:8px;border-left:2px solid var(--acc);transition:background var(--duration-base) var(--ease-base),padding var(--duration-base) var(--ease-base)}
.opt:hover{padding-left:var(--space-14);background:linear-gradient(135deg,var(--acc-a04) 0%,transparent 100%)}
.opt-n{display:inline-block;font:var(--font-weight-heavy) 10.5px -apple-system,sans-serif;letter-spacing:.3px;color:var(--accink);background:linear-gradient(135deg,var(--accbg) 0%,var(--acc-a04) 100%);border:1px solid var(--opt-n-bd);border-radius:6px;padding:var(--space-4) var(--space-10);margin-bottom:var(--space-6);box-shadow:0 1px 4px -2px var(--acc-a08)}
.opt-w{font-size:var(--font-size-small);line-height:var(--line-height-airy);color:var(--ink)}
.opt-w .pw{font-weight:var(--font-weight-heavy);color:var(--mut2);text-transform:uppercase;font-size:var(--font-size-nano);letter-spacing:.5px;margin-right:var(--space-7)}
.opt-w b{color:inherit;font-weight:var(--font-weight-semibold)}
`);

var ANS_SHEET = new CSSStyleSheet();
ANS_SHEET.replaceSync(`
.qq{font-size:var(--font-size-title);font-weight:var(--font-weight-bold);color:var(--ink);line-height:var(--line-height-relaxed);letter-spacing:-.01em;max-width:var(--measure-tight);text-wrap:balance}
.ans{font-size:var(--font-size-reading);color:var(--ans-fg);max-width:var(--measure);margin-top:var(--space-14);padding:var(--space-14) var(--space-17);background:linear-gradient(135deg,var(--ans-bg) 0%,var(--acc-a03) 100%);border-left:3px solid var(--acc);border-radius:9px;animation:pop var(--duration-base) var(--ease-base);box-shadow:0 1px 4px -2px var(--acc-a06);line-height:var(--line-height-spacious)}
.ans b{color:inherit;font-weight:var(--font-weight-semibold)}
.fu{margin-top:var(--space-14);animation:pop var(--duration-moderate) var(--ease-base)}
.fu .lab{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;color:var(--amber);display:flex;align-items:center;gap:var(--space-7);margin-bottom:var(--space-7)}
.fu .lab::before{content:"\\21B3";font-size:var(--font-size-body)}
.fu .fq{font-size:var(--font-size-body);font-weight:var(--font-weight-semibold);color:var(--ink);line-height:var(--line-height-relaxed)}
.fu .fa{font-size:var(--font-size-caption);color:var(--ans-fg);margin-top:var(--space-10);padding:var(--space-12) var(--space-16);background:linear-gradient(135deg,var(--fa-bg) 0%,rgba(176,108,20,.03) 100%);border-left:3px solid var(--amber);border-radius:9px;line-height:var(--line-height-spacious)}
.fu .fa b{color:var(--fa-b-fg);font-weight:var(--font-weight-bold)}
.senior{margin-top:var(--space-15);font-size:var(--font-size-caption);color:var(--senior-fg);background:linear-gradient(135deg,var(--tealbg) 0%,rgba(10,133,100,.04) 100%);border:1px solid var(--senior-bd);border-radius:10px;padding:var(--space-13) var(--space-16);animation:pop var(--duration-moderate) var(--ease-base);box-shadow:0 1px 4px -2px rgba(10,133,100,.06)}
.senior .sl{font-size:var(--font-size-nano);font-weight:var(--font-weight-heavy);letter-spacing:.8px;text-transform:uppercase;color:var(--teal);display:flex;align-items:center;gap:var(--space-7);margin-bottom:var(--space-5)}
.senior .sl::before{content:"\\2605"}
.senior b{color:var(--fb-t-fg);font-weight:var(--font-weight-bold)}
.push{margin-top:var(--space-15);width:100%;border:0;color:var(--push-fg);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-13);border-radius:11px;cursor:pointer;transition:transform var(--duration-base) var(--ease-glide),box-shadow var(--duration-moderate) var(--ease-base),filter var(--duration-base) var(--ease-base);background:linear-gradient(135deg,var(--acc),var(--acc2));box-shadow:0 5px 15px var(--acc-a26),inset 0 1px 0 rgba(255,255,255,.14);position:relative;overflow:hidden}
.push::after{content:"";position:absolute;inset:0;background:linear-gradient(135deg,transparent 30%,rgba(255,255,255,.1) 50%,transparent 70%);opacity:0;transition:opacity var(--duration-slow) var(--ease-base)}
.push:hover::after{opacity:1}
.push.more{background:linear-gradient(135deg,var(--amber),#b9740f);box-shadow:0 5px 15px rgba(176,108,20,.30),inset 0 1px 0 rgba(255,255,255,.16)}
.push:hover:not(.more){box-shadow:0 10px 28px var(--acc-a45),inset 0 1px 0 rgba(255,255,255,.14),0 0 40px -10px var(--acc-a20);transform:translateY(-2px);filter:brightness(1.05)}
/* pushGlow (2s infinite hover pulse) deleted -- the hover box-shadow is the feedback. */
.push.more:hover{box-shadow:0 10px 28px rgba(176,108,20,.45),inset 0 1px 0 rgba(255,255,255,.14);transform:translateY(-2px);filter:brightness(1.05)}
.push:active:not(.more),.push.more:active{transform:translateY(1px) scale(.99);box-shadow:0 2px 7px rgba(30,28,24,.18),inset 0 1px 0 rgba(255,255,255,.1);filter:brightness(.97)}
.judge{display:flex;gap:var(--space-10);margin-top:var(--space-15)}
.judge button{flex:1;border:1.5px solid;background:var(--judge-btn-bg);font:var(--font-weight-bold) 13px -apple-system,sans-serif;padding:var(--space-12);border-radius:11px;cursor:pointer;transition:transform var(--duration-fast) var(--ease-glide),box-shadow var(--duration-base) var(--ease-base),background var(--duration-fast) var(--ease-base)}
.judge .got{border-color:var(--teal);color:var(--teal)} .judge .got:hover{background:var(--tealbg);box-shadow:0 4px 14px -4px rgba(10,133,100,.25);transform:translateY(-1px)}
.judge .shk{border-color:var(--amber);color:var(--amber)} .judge .shk:hover{background:var(--amberbg);box-shadow:0 4px 14px -4px rgba(176,108,20,.25);transform:translateY(-1px)}
.judge .miss{border-color:var(--red);color:var(--red)} .judge .miss:hover{background:var(--redbg);box-shadow:0 4px 14px -4px rgba(163,45,45,.25);transform:translateY(-1px)}
.judge .hint{font-size:var(--font-size-nano);font-weight:var(--font-weight-bold)}
.got:active,.shk:active{transform:translateY(1px) scale(.98);filter:brightness(.96)}
`);

var MOCK_SHEET = new CSSStyleSheet();
MOCK_SHEET.replaceSync(`
.mock-body{padding:var(--space-19) var(--space-18) var(--space-22)}
`);

var MBEAT_SHEET = new CSSStyleSheet();
MBEAT_SHEET.replaceSync(`
.mbeat{margin:var(--space-13) 0;font-size:var(--font-size-reading);line-height:var(--line-height-spacious);color:var(--ink)}
.mbeat{display:flex;gap:var(--space-12);padding:var(--space-12) 0;border-bottom:1px solid var(--bd)}
.mbeat:last-child{border-bottom:0;padding-bottom:var(--space-2)}
.mbeat b{color:inherit;font-weight:var(--font-weight-semibold)}
`);

var DISC_SHEET = new CSSStyleSheet();
DISC_SHEET.replaceSync(`
details.disc{margin-top:var(--space-12);border:1px solid var(--bd);border-radius:10px;overflow:hidden;background:linear-gradient(135deg,var(--disc-bg) 0%,var(--acc-a02) 100%);transition:box-shadow var(--duration-moderate) var(--ease-base),border-color var(--duration-base) var(--ease-base);animation:discIn var(--duration-slow) var(--ease-base) backwards}
@keyframes discIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
details.disc[open]{border-color:var(--acc-a20);box-shadow:0 0 0 1px var(--acc-a06),var(--surf-sh)}
details.disc summary{cursor:pointer;font:var(--font-weight-bold) 12px -apple-system,sans-serif;color:var(--acc);padding:var(--space-11) var(--space-15);list-style:none;display:flex;align-items:center;gap:var(--space-8);transition:background var(--duration-base) var(--ease-base),padding var(--duration-base) var(--ease-base)}
details.disc summary::-webkit-details-marker{display:none}
details.disc summary::before{content:"\\25B8";transition:transform var(--duration-moderate) var(--ease-spring);font-size:var(--font-size-micro);display:inline-flex;align-items:center;justify-content:center;width:var(--space-18);height:var(--space-18);border-radius:5px;background:var(--accbg)}
details.disc[open] summary::before{transform:rotate(90deg)}
details.disc summary:hover{background:var(--acc2-a07);padding-left:var(--space-17)}
details.disc .body{padding:var(--space-2) var(--space-16) var(--space-14);font-size:var(--font-size-reading-sm);max-width:var(--measure);color:var(--disc-body-fg);line-height:var(--line-height-spacious)}
`);
