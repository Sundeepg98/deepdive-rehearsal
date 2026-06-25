/* ===== shared pane stylesheets: class families rendered by more than one component =====
   A few interactive panes share a content vocabulary. Rather than copy the identical
   rules into each shadow root's inline <style>, every shared family is defined ONCE
   here as a constructable stylesheet and adopted (alongside BASE_SHEET) by exactly the
   components that render it -- the same pattern as CS_SHEET in content-sheet.js. Each
   sheet's rules were verified byte-identical across the components before being lifted
   here, so consolidation changes nothing visually. Every colour is a theme token, so
   light/dark needs no variants.

   OPT_SHEET -- the .opt trade-option family: <deep-trade-offs> + <deep-mixed-fire>. */
var OPT_SHEET = new CSSStyleSheet();
OPT_SHEET.replaceSync(`
.opt{margin:11px 0}
.opt-n{display:inline-block;font:800 10.5px -apple-system,sans-serif;letter-spacing:.3px;color:var(--accink);background:var(--accbg);border:1px solid var(--opt-n-bd);border-radius:6px;padding:4px 9px;margin-bottom:5px}
.opt-w{font-size:12.8px;line-height:1.57;color:var(--ink)}
.opt-w .pw{font-weight:800;color:var(--mut2);text-transform:uppercase;font-size:9.5px;letter-spacing:.5px;margin-right:6px}
.opt-w b{color:var(--accink)}
`);
