// tools/compiler/prose.mjs -- Layer B of the authoring compiler: prose -> the app's HTML.
//
// The topic source writes prose as markdown; this converts it to the exact HTML shape the
// hand-authored modules use, under the 7-bit-ASCII constraint the whole app obeys:
//   - markdown-it renders inline markdown (bold/italic/code) with the typographer on, so
//     `---` -> em-dash, `--` -> en-dash, straight quotes -> curly, `...` -> ellipsis;
//   - <strong>/<em> are rewritten to the app's <b>/<i>;
//   - every non-ASCII char the typographer produced is mapped back to the named HTML entity
//     the app uses (&mdash; &lsquo; &rsquo; &hellip; ...), with a numeric-entity fallback.
//
// This is the workhorse: it kills the ~1,350 hand-typed entities and the manual <b>/<code>
// wrapping per topic. Flow diagrams and highlighted code are Layer C (separate); this is
// prose only.

import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: true, typographer: true, linkify: false });

// Unicode the typographer / authors may emit -> the app's named entities.
const ENT = {
  '\u2014': '&mdash;',  '\u2013': '&ndash;',  '\u2019': '&rsquo;',  '\u2018': '&lsquo;',
  '\u201C': '&ldquo;',  '\u201D': '&rdquo;',  '\u2026': '&hellip;', '\u2192': '&rarr;',
  '\u2190': '&larr;',   '\u00B7': '&middot;', '\u00A0': '&nbsp;',   '\u2212': '&minus;',
  '\u00A9': '&copy;',   '\u00AE': '&reg;',    '\u2122': '&trade;',  '\u00B1': '&plusmn;',
  '\u00D7': '&times;',  '\u00BD': '&frac12;',
};

function toAscii(s) {
  return s.replace(/[^\x00-\x7F]/g, (c) =>
    ENT[c] || ('&#x' + c.codePointAt(0).toString(16).toUpperCase() + ';'));
}

// Convert one markdown prose string to the app's inline HTML.
export function prose(srcMd) {
  let html = md.renderInline(String(srcMd));
  html = html
    .replace(/<strong>/g, '<b>').replace(/<\/strong>/g, '</b>')
    .replace(/<em>/g, '<i>').replace(/<\/em>/g, '</i>');
  return toAscii(html);
}
