// Byte-composition analyzer for the single-file build.
// Segments the raw HTML into <style>, <script>, and markup, then sub-classifies
// script bodies by identifiable payload (base64 data URIs, three.js kit, topic modules...).
// Pure measurement: no guessing, every byte must land in exactly one bucket.
import fs from 'node:fs';
import zlib from 'node:zlib';

const path = process.argv[2];
const label = process.argv[3] || path;
const src = fs.readFileSync(path, 'utf8');
const bytes = Buffer.byteLength(src, 'utf8');

// ---------- 1. top-level segmentation: style / script / markup ----------
const segs = [];
const tagRe = /<(style|script)\b([^>]*)>/gi;
let m;
while ((m = tagRe.exec(src)) !== null) {
  const kind = m[1].toLowerCase();
  const attrs = m[2] || '';
  const openStart = m.index;
  const bodyStart = m.index + m[0].length;
  const closeRe = new RegExp(`</${kind}\\s*>`, 'i');
  closeRe.lastIndex = bodyStart;
  const rest = src.slice(bodyStart);
  const cm = rest.match(closeRe);
  if (!cm) continue;
  const bodyEnd = bodyStart + cm.index;
  const end = bodyEnd + cm[0].length;
  segs.push({ kind, attrs, openStart, bodyStart, bodyEnd, end,
              body: src.slice(bodyStart, bodyEnd) });
  tagRe.lastIndex = end;
}

let styleBytes = 0, scriptBytes = 0;
for (const s of segs) {
  const n = Buffer.byteLength(src.slice(s.openStart, s.end), 'utf8');
  if (s.kind === 'style') styleBytes += n; else scriptBytes += n;
}
const markupBytes = bytes - styleBytes - scriptBytes;

// ---------- 2. base64 / data-URI payloads, wherever they live ----------
// Fonts, images, wasm... anything inlined as a data: URI.
const dataUriRe = /data:([a-z0-9.+/-]+)?(;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]{200,})/gi;
const dataUri = new Map(); // mime -> {count, bytes}
let dataUriTotal = 0;
while ((m = dataUriRe.exec(src)) !== null) {
  const mime = (m[1] || 'unknown').toLowerCase();
  const n = Buffer.byteLength(m[0], 'utf8');
  const cur = dataUri.get(mime) || { count: 0, bytes: 0 };
  cur.count++; cur.bytes += n;
  dataUri.set(mime, cur);
  dataUriTotal += n;
}

// ---------- 3. sub-classify script bodies ----------
// Heuristic-free where possible: use the build's own module markers.
const scriptDetail = [];
for (const s of segs) {
  if (s.kind !== 'script') continue;
  const n = Buffer.byteLength(src.slice(s.openStart, s.end), 'utf8');
  const body = s.body;
  const typeM = s.attrs.match(/type\s*=\s*["']?([^"'\s>]+)/i);
  const idM = s.attrs.match(/id\s*=\s*["']([^"']+)/i);
  // how much of this script is base64 data-uri payload?
  let b64 = 0;
  const r = /data:([a-z0-9.+/-]+)?(;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]{200,})/gi;
  let mm; while ((mm = r.exec(body)) !== null) b64 += Buffer.byteLength(mm[0], 'utf8');
  scriptDetail.push({
    id: idM ? idM[1] : null,
    type: typeM ? typeM[1] : 'classic',
    bytes: n,
    b64,
    head: body.slice(0, 240).replace(/\s+/g, ' ').trim(),
  });
}
scriptDetail.sort((a, b) => b.bytes - a.bytes);

// ---------- 4. named payload probes (count actual bytes, not vibes) ----------
// three.js: find its bundle by signature and measure the enclosing script.
const probes = {};
function probeScript(name, sig) {
  const hits = scriptDetail.filter(() => false); // placeholder
  for (const s of segs) {
    if (s.kind !== 'script') continue;
    if (sig.test(s.body)) {
      const n = Buffer.byteLength(src.slice(s.openStart, s.end), 'utf8');
      probes[name] = (probes[name] || 0) + n;
    }
  }
}
probeScript('three.js bundle', /THREE\.|WebGLRenderer|PerspectiveCamera/);

// topic payloads: the compiled topic modules. Find the registry/consts.
const topicIdRe = /(?:^|[\s{,"'])(?:id|slug)\s*:\s*["']([a-z0-9][a-z0-9-]{3,})["']/g;

// ---------- 5. compression ----------
const gz = zlib.gzipSync(Buffer.from(src, 'utf8'), { level: 9 }).length;
const br = zlib.brotliCompressSync(Buffer.from(src, 'utf8'), {
  params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
}).length;

const pct = (n) => ((n / bytes) * 100).toFixed(1).padStart(5) + '%';
const kb = (n) => (n / 1024).toFixed(0).padStart(8) + ' KB';

console.log(`\n##### ${label}`);
console.log(`total ${bytes.toLocaleString()} bytes  (gzip ${gz.toLocaleString()}, brotli ${br.toLocaleString()})`);
console.log(`\n-- top-level segmentation (exhaustive, sums to 100%) --`);
console.log(`  <script> (${segs.filter(s=>s.kind==='script').length} tags) ${kb(scriptBytes)}  ${pct(scriptBytes)}`);
console.log(`  <style>  (${segs.filter(s=>s.kind==='style').length} tags) ${kb(styleBytes)}  ${pct(styleBytes)}`);
console.log(`  markup/other        ${kb(markupBytes)}  ${pct(markupBytes)}`);

console.log(`\n-- inlined base64 data URIs (subset of the above) --`);
if (dataUriTotal === 0) console.log('  NONE. Zero base64 payloads in the file.');
for (const [mime, v] of [...dataUri.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log(`  ${mime.padEnd(28)} x${String(v.count).padStart(3)}  ${kb(v.bytes)}  ${pct(v.bytes)}`);
}
console.log(`  ${'TOTAL base64'.padEnd(28)}      ${kb(dataUriTotal)}  ${pct(dataUriTotal)}`);

console.log(`\n-- named probes --`);
for (const [k, v] of Object.entries(probes)) console.log(`  ${k.padEnd(28)} ${kb(v)}  ${pct(v)}`);

console.log(`\n-- largest script tags --`);
for (const s of scriptDetail.slice(0, 14)) {
  console.log(`  ${kb(s.bytes)} ${pct(s.bytes)}  type=${(s.type||'').padEnd(16)} id=${(s.id||'-').padEnd(22)} b64=${(s.b64/1024).toFixed(0)}KB`);
  console.log(`            ${s.head.slice(0, 150)}`);
}
console.log('');
