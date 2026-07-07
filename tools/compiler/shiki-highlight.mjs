// tools/compiler/shiki-highlight.mjs -- Layer C (part 4): syntax highlighting for the
// languages the minimal highlighter (code.mjs) does NOT handle -- SQL, YAML, bash, JSON,
// Python, Go. JS/TS deliberately stay on the minimal highlighter, whose ==emphasis== spans
// are author-chosen and no grammar highlighter can infer.
//
// Shiki highlights with a real TextMate grammar. Its output is adapted to plug straight
// into the app's existing <pre class="code"> container: we strip Shiki's own <pre>/<code>
// wrapper and keep only the colored token spans (inline styles -> self-contained and
// shadow-DOM safe, the same property as the mermaid/math SVGs). A custom theme maps tokens
// to the app's exact code palette, so a SQL block looks native next to a JS block.
//
// createHighlighter is async, so this renders in the async build pass (compile.mjs),
// mirroring how mermaid diagrams are deferred and rendered there.

// The app's code palette (from the .code shadow styles): keyword/function/keys #C9A2F0,
// string #9DD9B6, comment #9b95c9, number/constant #FFD479, base ink #E7E4F5.
const DDR_THEME = {
  name: 'ddr',
  type: 'dark',
  colors: { 'editor.foreground': '#E7E4F5', 'editor.background': '#00000000' },
  tokenColors: [
    { scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.logical',
              'support.type', 'entity.name.tag', 'support.type.property-name'],
      settings: { foreground: '#C9A2F0' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call'],
      settings: { foreground: '#C9A2F0' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'],
      settings: { foreground: '#9DD9B6' } },
    { scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: '#9b95c9', fontStyle: 'italic' } },
    { scope: ['constant.numeric', 'constant.language', 'constant', 'support.constant'],
      settings: { foreground: '#FFD479' } },
  ],
};

// Fence lang -> canonical Shiki lang, or null if the minimal highlighter should keep it.
const CANON = { sh: 'bash', shell: 'bash', yml: 'yaml', py: 'python', golang: 'go' };
const SHIKI_SET = new Set(['sql', 'yaml', 'yml', 'bash', 'sh', 'shell', 'json', 'python', 'py', 'go', 'golang']);
const LOAD_LANGS = ['sql', 'yaml', 'bash', 'json', 'python', 'go'];

// Returns the canonical Shiki language for a fence that should be Shiki-highlighted, or
// null if it should stay on the minimal highlighter (JS/TS, blank, or anything unknown --
// the fallback never throws).
export function shikiLang(lang) {
  const l = String(lang).toLowerCase().trim();
  if (l === '' || l === 'js' || l === 'ts' || l === 'javascript' || l === 'typescript') return null;
  if (SHIKI_SET.has(l)) return CANON[l] || l;
  return null;
}

let _hl = null;
async function highlighter() {
  if (!_hl) {
    const { createHighlighter } = await import('shiki'); // dynamic: Shiki loads only when a topic uses it
    _hl = await createHighlighter({ themes: [DDR_THEME], langs: LOAD_LANGS });
  }
  return _hl;
}

// Highlight one non-JS/TS code block to the inner HTML the app drops into <pre class="code">.
export async function renderShiki(code, lang) {
  const hl = await highlighter();
  const html = hl.codeToHtml(String(code), { lang, theme: 'ddr' });
  // Drop Shiki's own <pre class="shiki" ...><code> ... </code></pre> wrapper; keep the inner
  // lines (colored token spans + newlines) so they render in the app's own code container.
  return html.replace(/^<pre[^>]*><code>/, '').replace(/<\/code><\/pre>\s*$/, '');
}

export async function closeShiki() { if (_hl && _hl.dispose) { _hl.dispose(); _hl = null; } }
