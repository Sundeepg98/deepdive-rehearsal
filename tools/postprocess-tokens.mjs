// Post-processes the Style-Dictionary CSS: adds @property typing (2026 cutting-edge --
// type-safety + animatability + safe fallbacks) and a density scale for the spacing tokens.
import fs from 'fs';
const p = 'src/tokens.generated.css';
let css = fs.readFileSync(p, 'utf8');
const props = ['@property --density-scale{syntax:"<number>";inherits:true;initial-value:1}'];
const add = (re, syntax) => { for (const m of css.matchAll(re)) props.push(`@property ${m[1]}{syntax:"${syntax}";inherits:true;initial-value:${m[2]}}`); };
add(/(--space-\d+):\s*(\d+px)/g, '<length>');
add(/(--size-font-\d+):\s*(\d+px)/g, '<length>');
add(/(--z-[a-z-]+):\s*(-?\d+)\b/g, '<number>');
add(/(--duration-[a-z]+):\s*(\d+ms)/g, '<time>');
add(/(--line-height-[a-z]+):\s*([\d.]+)/g, '<number>');
add(/(--font-weight-[a-z]+):\s*(\d+)/g, '<number>');
// density: spacing overrides at two comfort levels (compact / cozy), driven by a toggle
const spaces = [...css.matchAll(/--space-(\d+):\s*(\d+)px/g)].map(m => [m[1], +m[2]]);
const dens = (name, k) => `html[data-density=${name}]{` + spaces.map(([n,v]) => `--space-${n}:${Math.max(1,Math.round(v*k))}px`).join(';') + '}';
fs.writeFileSync(p, props.join('\n') + '\n' + css + '\n' + dens('compact', .82) + '\n' + dens('cozy', 1.15) + '\n');
console.log(`@property: typed ${props.length} tokens | density: compact(.82) + cozy(1.15)`);
