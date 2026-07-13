/* ===== PAINTED PIXELS -- the only honest answer to "did it render?" =====
 *
 * WHY THIS FILE EXISTS
 * This repo has shipped an a11y audit that certified a COMPLETELY BLANK PAGE as PASSING, and a
 * "visible text node" counter that reports 276 visible nodes on a blank page. Both measured the
 * DOM. The DOM is not the screen.
 *
 * The specific trap, and it is not obvious: `opacity:0` on <body> DOES NOT PROPAGATE to
 * descendants. Every descendant still computes `opacity:1`, still has a layout box, still has a
 * non-null offsetParent, still returns its full innerText. Every DOM-side "is it visible?"
 * predicate -- offsetParent, checkVisibility, innerText.length, getBoundingClientRect -- answers
 * YES for a page that paints NOTHING. The compositor multiplies the whole subtree by zero at the
 * very end, and no DOM API models that.
 *
 * So: screenshot the viewport, decode it, and COUNT THE PIXELS THAT ARE NOT THE BACKGROUND.
 * A blank page has one colour. A rendered page has thousands.
 *
 * NO DEPENDENCIES. node_modules has no PNG decoder (checked), adding one to a gate that must run
 * offline is a liability, and a PNG screenshot from Playwright is a narrow, well-specified subset:
 * 8-bit, non-interlaced, colour-type 2 (RGB) or 6 (RGBA). zlib is in node's stdlib. ~60 lines.
 */
'use strict';
const zlib = require('zlib');

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/* Paeth predictor -- PNG filter type 4 (RFC 2083 s6.6). */
function paeth(a, b, c) {
  const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/* PNG Buffer -> { w, h, data: Buffer(RGBA, w*h*4) }. Throws on anything it cannot honestly
   decode -- a decoder that guesses is a check that cannot fail. */
function decodePng(buf) {
  if (!Buffer.isBuffer(buf) || !buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('not a PNG');
  let off = 8, w = 0, h = 0, depth = 0, ctype = 0, interlace = 0;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      depth = data[8]; ctype = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;                                  /* len + type(4) + data + crc(4) */
  }
  if (depth !== 8) throw new Error('unsupported PNG bit depth ' + depth + ' (expected 8)');
  if (ctype !== 2 && ctype !== 6) throw new Error('unsupported PNG colour type ' + ctype);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  if (!idat.length) throw new Error('PNG has no IDAT');

  const bpp = ctype === 6 ? 4 : 3;                    /* bytes per pixel in the FILTERED stream */
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(w * h * 4);
  let prev = Buffer.alloc(stride);                    /* scanline above, un-filtered */
  let p = 0;
  for (let y = 0; y < h; y++) {
    const ft = raw[p++];
    const line = Buffer.from(raw.subarray(p, p + stride));
    p += stride;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? line[i - bpp] : 0;         /* left   */
      const b = prev[i];                              /* up     */
      const c = i >= bpp ? prev[i - bpp] : 0;         /* upleft */
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) v += paeth(a, b, c);
      else if (ft !== 0) throw new Error('bad PNG filter ' + ft + ' on row ' + y);
      line[i] = v & 0xff;
    }
    for (let x = 0; x < w; x++) {
      const s = x * bpp, d = (y * w + x) * 4;
      out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2];
      out[d + 3] = bpp === 4 ? line[s + 3] : 255;
    }
    prev = line;
  }
  return { w, h, data: out };
}

/* ===== ENCODE ==============================================================================
 * The decoder above answers "did it render?". The ENCODER exists so a failing pixel check can
 * hand a human the EVIDENCE -- the actual frame and a diff map with the changed pixels burned in
 * red -- instead of a number. A visual check whose only output is "4,812 pixels changed" makes a
 * human re-run it; one that hands over an image makes them look at it.
 * 8-bit RGBA, colour type 6, filter 0 on every row. Round-trips through decodePng() above.
 */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(w, h, rgba) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;                                   /* filter: none */
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;    /* bit depth   */
  ihdr[9] = 6;    /* colour type: RGBA */
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/* The modal colour = the background, by definition: on any real page the background is the single
   most common colour, and on a BLANK page it is the ONLY one. Quantised to 8 levels per channel so
   a subpixel-antialiased gradient background still reads as one bucket. */
function dominant(img) {
  const hist = new Map();
  const { data } = img;
  for (let i = 0; i < data.length; i += 4) {
    const k = ((data[i] >> 5) << 6) | ((data[i + 1] >> 5) << 3) | (data[i + 2] >> 5);
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  let best = 0, bestN = -1;
  for (const [k, n] of hist) if (n > bestN) { bestN = n; best = k; }
  return { bucket: best, n: bestN, total: data.length / 4, distinct: hist.size };
}

/* THE MEASUREMENT. Fraction of pixels that are NOT the background colour, i.e. the fraction of the
   screen that something actually painted. `ink` is a count; `inkPct` is 0..100.
   A blank page: inkPct ~0, distinct ~1. A rendered page: inkPct in the tens, distinct in the
   hundreds. `box` (optional {x,y,w,h}) restricts the count to a region. */
function ink(png, box) {
  const img = Buffer.isBuffer(png) ? decodePng(png) : png;
  const dom = dominant(img);
  const x0 = box ? Math.max(0, box.x | 0) : 0;
  const y0 = box ? Math.max(0, box.y | 0) : 0;
  const x1 = box ? Math.min(img.w, (box.x | 0) + (box.w | 0)) : img.w;
  const y1 = box ? Math.min(img.h, (box.y | 0) + (box.h | 0)) : img.h;
  let n = 0, tot = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * img.w + x) * 4;
      const k = ((img.data[i] >> 5) << 6) | ((img.data[i + 1] >> 5) << 3) | (img.data[i + 2] >> 5);
      tot++;
      if (k !== dom.bucket) n++;
    }
  }
  return { w: img.w, h: img.h, ink: n, tot, inkPct: tot ? +(100 * n / tot).toFixed(2) : 0, distinct: dom.distinct };
}

module.exports = { decodePng, encodePng, dominant, ink };
