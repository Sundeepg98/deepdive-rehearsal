// tools/compiler/flow.mjs -- Layer C (part 1) of the authoring compiler: flow shorthand ->
// the app's flow-diagram HTML.
//
// A flow diagram is authored as boxes joined by connectors:
//     n[service] -> p[notify(user, event)] -> t[notification request] . a[producer knows no channels]
//   box:        TYPE[TEXT]         TYPE in {n,p,t,a,r}; brackets delimit text unambiguously
//   connectors: ` -> ` = &rarr;    ` . ` = &middot;    ` / ` = /
// Inside a box, ` -> ` renders as an in-line &rarr; (for the rare "already sent -> skip" case).
//
// This replaces the ~63 hand-built `<span class="fb n">...<span class="arr">&rarr;</span>`
// structures per topic. Non-ASCII in box text is mapped to entities, same as Layer B.

const ENT = {
  '\u2014': '&mdash;', '\u2013': '&ndash;', '\u2019': '&rsquo;', '\u2018': '&lsquo;',
  '\u201C': '&ldquo;', '\u201D': '&rdquo;', '\u2026': '&hellip;', '\u2192': '&rarr;',
  '\u00B7': '&middot;', '\u00A0': '&nbsp;', '\u00D7': '&times;',
};
const toAscii = (s) => s.replace(/[^\x00-\x7F]/g, (c) =>
  ENT[c] || ('&#x' + c.codePointAt(0).toString(16).toUpperCase() + ';'));

const CONN = { '->': '&rarr;', '.': '&middot;', '/': '/' };

export function flow(src) {
  const boxRe = /([a-z]+)\[([^\]]*)\]/g;
  const boxes = [];
  let m;
  while ((m = boxRe.exec(src))) boxes.push({ type: m[1], text: m[2], start: m.index, end: boxRe.lastIndex });
  if (!boxes.length) throw new Error('flow: no boxes parsed from ' + JSON.stringify(src));

  let html = '';
  for (let i = 0; i < boxes.length; i++) {
    if (i > 0) {
      const gap = src.slice(boxes[i - 1].end, boxes[i].start).trim();
      if (!(gap in CONN)) throw new Error('flow: unknown connector ' + JSON.stringify(gap));
      html += '<span class="arr">' + CONN[gap] + '</span>';
    }
    const text = toAscii(boxes[i].text.replace(/ -> /g, ' &rarr; '));
    html += '<span class="fb ' + boxes[i].type + '">' + text + '</span>';
  }
  return html;
}
