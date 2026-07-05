// tools/compiler/code.mjs -- Layer C (part 2) of the authoring compiler: fenced code ->
// the app's highlighted HTML (<span class="k"> keywords, <span class="c"> comments,
// <span class="hl"> author-chosen emphasis).
//
// Deliberately NOT Shiki: the app highlights minimally and its `hl` spans are *manual*
// emphasis (the tokens the author wants the eye to land on), which no grammar highlighter
// can infer. So the source marks those with ==emphasis==, and this tokenizer adds only
// keyword + comment spans -- matching the hand-authored look exactly instead of Shiki's
// full-grammar coloring. Handles both // and -- comment styles (JS and SQL in one block).

const KEYWORDS = [
  // multi-word first so they win over their parts
  'INSERT INTO', 'CREATE INDEX', 'ORDER BY', 'GROUP BY',
  // JS / TS
  'const', 'let', 'var', 'async', 'await', 'function', 'return', 'if', 'else', 'for', 'of',
  'while', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends', 'try', 'catch',
  'finally', 'throw', 'typeof', 'instanceof', 'import', 'export', 'default', 'yield',
  // SQL
  'SELECT', 'FROM', 'WHERE', 'VALUES', 'UPDATE', 'DELETE', 'SET', 'NULL', 'AND', 'OR', 'NOT', 'ON',
].sort((a, b) => b.length - a.length);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');

// A single ordered alternation (longest-first) so we tokenize in ONE pass over the original
// text -- added <span> markup is never re-scanned, so a keyword like `class` can't corrupt it.
const KW_ALT = KEYWORDS.map((k) => k.replace(/ /g, '\\s+')).join('|');
const TOKEN = new RegExp('==([^=]+)==|\\b(' + KW_ALT + ')\\b', 'g');

function highlightCode(codePart) {
  let out = '', last = 0, m;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(codePart))) {
    out += esc(codePart.slice(last, m.index));
    out += m[1] !== undefined
      ? '<span class="hl">' + esc(m[1]) + '</span>'   // ==manual emphasis==
      : '<span class="k">' + m[2] + '</span>';        // keyword
    last = TOKEN.lastIndex;
  }
  return out + esc(codePart.slice(last));
}

function highlightLine(l) {
  // comment starts at the first // or -- (either style); the rest of the line is comment
  const marks = [l.indexOf('//'), l.indexOf('--')].filter((x) => x >= 0);
  const ci = marks.length ? Math.min(...marks) : -1;
  const codePart = ci >= 0 ? l.slice(0, ci) : l;
  const comment = ci >= 0 ? l.slice(ci) : '';
  const hl = highlightCode(codePart);
  return comment ? hl + '<span class="c">' + esc(comment) + '</span>' : hl;
}

export function code(src) {
  return String(src).split('\n').map(highlightLine).join('\n');
}
