/* ===== shared content stylesheet: the .cs-* "scope / game-plan / cram" family =====
   These three overlays share one content vocabulary (.cs-one / .cs-sec / .cs-ha / ...).
   Defined ONCE as a constructable stylesheet and adopted (alongside BASE_SHEET) by
   each of <deep-scope>, <deep-gameplan>, <deep-cram>, so the shared rules live in a
   single place rather than being copied into every shadow root. The generic `b` rule
   replaces the light-DOM `.cram-body b` frame rule, which cannot cross the shadow
   boundary; `b.cs-ha-l` replicates that frame rule out-ranking the .cs-ha-l label
   color (a <b class=cs-ha-l> renders accink, not acc, in the original cascade).
   Every color is a theme token, so it flips light/dark with no variants. */
var CS_SHEET = new CSSStyleSheet();
CS_SHEET.replaceSync(`
.cs-one{background:linear-gradient(135deg,var(--accbg) 0%,rgba(83,74,183,.04) 100%);border-radius:12px;padding:14px 17px;font-size:13px;line-height:1.55;color:var(--ink);box-shadow:0 1px 6px -2px rgba(83,74,183,.06)}
.cs-one b{color:var(--accink);font-weight:700;text-shadow:0 0 8px rgba(83,74,183,.08)}
.cs-one-l{display:block;font:800 9.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);margin-bottom:6px;text-shadow:0 0 10px rgba(83,74,183,.1)}
.cs-sec{margin-top:18px}
.cs-st{font:800 10.5px -apple-system,sans-serif;letter-spacing:.7px;text-transform:uppercase;color:var(--acc);border-bottom:2px solid var(--accbg);padding-bottom:5px;margin-bottom:10px;text-shadow:0 0 10px rgba(83,74,183,.1)}
.cs-spine{margin:0;padding-left:20px}
.cs-spine li{font-size:12.2px;line-height:1.55;margin-bottom:6px;color:var(--ink);transition:color .2s ease}
.cs-dec{font-size:12.2px;line-height:1.55;margin-bottom:7px;color:var(--ink);transition:color .2s ease}
.cs-dec b{color:var(--accink);font-weight:700;text-shadow:0 0 6px rgba(83,74,183,.06)}
.cs-arr{color:var(--mut2);font-weight:800;margin:0 5px;text-shadow:0 0 8px rgba(83,74,183,.08)}
.cs-num{font-size:12.2px;line-height:1.55;margin-bottom:6px;color:var(--ink);transition:color .2s ease}
.cs-ha{font-size:12px;line-height:1.55;margin-bottom:7px;color:var(--ink);transition:color .2s ease}
.cs-ha-l{color:var(--acc);font-weight:800;text-shadow:0 0 8px rgba(83,74,183,.1)}
.cs-num b{color:var(--ink);font-weight:700;text-shadow:0 0 8px rgba(83,74,183,.08)}
.cs-dim{color:var(--mut2);font-size:11.5px;margin-top:8px;transition:color .2s ease}
.cs-trap{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:baseline;margin-bottom:7px;padding:6px 0;background:linear-gradient(180deg,transparent 0%,rgba(83,74,183,.01) 100%);transition:box-shadow .25s ease,transform .2s ease}
.cs-bad{text-align:right;color:var(--red);font-size:11.7px;line-height:1.4;transition:color .2s ease}
.cs-arr2{color:var(--mut2);font-weight:800;text-shadow:0 0 8px rgba(83,74,183,.08)}
.cs-fix{text-align:left;color:var(--teal);font-weight:600;font-size:11.7px;line-height:1.4;transition:color .2s ease}
.cs-tells{margin:0;padding-left:20px}
.cs-tells li{font-size:12.2px;line-height:1.55;margin-bottom:6px;color:var(--ink);transition:color .2s ease}
.cs-30{background:linear-gradient(135deg,var(--cs30-bg) 0%,rgba(83,74,183,.02) 100%);border:1px solid var(--bd);border-radius:11px;padding:13px 15px;font-size:12.3px;line-height:1.58;color:var(--ink)}
b{color:var(--accink);font-weight:700;text-shadow:0 0 8px rgba(83,74,183,.08)}
b.cs-ha-l{color:var(--accink);font-weight:700;text-shadow:0 0 8px rgba(83,74,183,.08)}
`);
