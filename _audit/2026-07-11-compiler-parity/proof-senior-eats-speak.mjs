import { parseMarkdown } from '../../tools/compiler/parse_md.mjs';
const FM = "---\nid: p\nprefix: P\ntitle: P\n---\n";
const card = (tail) => FM + `## Drill

### SDE2 | s

Q?

A.

` + tail;

// (a) EXACTLY as the format doc prints it -- Senior: and Speak: on consecutive lines
const docForm = card("Senior: name the delivery guarantee, not the queue.\nSpeak: commit to an answer before revealing.\n");
// (b) the SAME two fields separated by a BLANK LINE (two paragraphs)
const blankSep = card("Senior: name the delivery guarantee, not the queue.\n\nSpeak: commit to an answer before revealing.\n");

for (const [label, src] of [['DOC FORM (consecutive lines, as printed at TOPIC_MARKDOWN_FORMAT.md:200-201)', docForm], ['BLANK-LINE SEPARATED (2 paragraphs)', blankSep]]) {
  const d = parseMarkdown(src).views.drill;
  console.log('=== ' + label);
  console.log('  senior =', JSON.stringify(d.cards[0].senior));
  console.log('  speak  =', JSON.stringify(d.speak[0]));
  console.log('');
}
