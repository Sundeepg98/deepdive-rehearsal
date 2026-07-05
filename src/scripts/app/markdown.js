/* ===== scripts/app/markdown.js -- MD: a constrained inline markdown renderer =====
   Turns an authoring-friendly inline markdown subset into the HTML+entity strings the
   content layer already speaks, so a card answer can be written as

       "the **verified token** -- a claim like `custom:tenant_id` -- and **never** ..."

   instead of the hand-tagged

       "the <b>verified token</b> &mdash; a claim like <code>custom:tenant_id</code> ..."

   WHY THIS SHAPE:
   - It is a PURE function (string in, string out), so it works at runtime (the chosen
     seam: rendered once per topic-load in publishBanks) or at build time if ever wanted.
   - It is a SUPERSET-passthrough: any existing HTML tag, HTML entity, or code-span
     content is protected and emitted verbatim, so the already-authored topics render
     byte-identically and new + old syntax can be mixed in one string. Adoption needs
     no migration.
   - It fits the ASCII-only guard: the SOURCE you type is ASCII (-- ** ` " '), and the
     renderer emits the em-dash / entity / tag. Markdown reduces the entity burden while
     staying ascii-clean.

   SUPPORTED SUBSET (inline only -- structure is owned by the card schema, not markdown):
     **bold**            -> <b>bold</b>
     *italic*            -> <i>italic</i>
     `code`              -> <code>code</code>   (content is HTML-escaped, not re-parsed)
     [text](url)         -> <a href="url">text</a>
     spaced  --          -> &mdash;             (only " -- " with flanking spaces)
     "quoted"            -> &ldquo;quoted&rdquo; (balanced pairs)
     don't / token's     -> don&rsquo;t         (apostrophe between letters)

   NOT supported on purpose: headings, lists, tables, blockquotes, block code. The schema
   owns block structure; this is emphasis only. Literal * ` " that must NOT render go in a
   code span or as a numeric entity (&#42; &#96; &#34;).

   Offline-safe: no network, storage, DOM, or dependencies. */
var MD = (function () {
  'use strict';

  /* code-span content is literal text -> escape the three HTML-significant chars so a
     span like `a<b & c` renders as text, never as markup. */
  function escCode(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render(src) {
    if (src == null) return '';
    src = String(src);

    /* ---- 1. PROTECT: pull out spans that must pass through untouched, leaving an
            opaque placeholder (control chars that cannot occur in real content and
            match none of the emphasis patterns). Order matters: code first (it may
            legitimately contain < & and markdown chars), then existing tags, then
            existing entities. ---- */
    var slots = [];
    function stash(html) { slots.push(html); return '\u0001' + (slots.length - 1) + '\u0002'; }

    src = src.replace(/`([^`]+)`/g, function (_m, c) { return stash('<code>' + escCode(c) + '</code>'); });
    src = src.replace(/<\/?[a-zA-Z][^>]*>/g, function (t) { return stash(t); });
    src = src.replace(/&(?:[a-zA-Z]+|#[0-9]+);/g, function (e) { return stash(e); });
    /* links: render now and protect the anchor so later rules can't touch the href */
    src = src.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_m, t, u) {
      return stash('<a href="' + u + '">' + t + '</a>');
    });

    /* ---- 2. PROCESS the remaining plain-text skeleton ---- */
    /* bold before italic; both require non-space flanking the delimiter (markdown
       convention) so a lone or arithmetic * / spaced * does not accidentally emphasise. */
    src = src.replace(/\*\*(\S[^*]*?\S|\S)\*\*/g, '<b>$1</b>');
    src = src.replace(/\*(\S[^*]*?\S|\S)\*/g, '<i>$1</i>');
    src = src.replace(/ -- /g, ' &mdash; ');
    src = src.replace(/"([^"]*)"/g, '&ldquo;$1&rdquo;');
    src = src.replace(/([A-Za-z])'([A-Za-z])/g, '$1&rsquo;$2');

    /* ---- 3. RESTORE protected spans ---- */
    src = src.replace(/\u0001([0-9]+)\u0002/g, function (_m, i) { return slots[+i]; });
    return src;
  }

  return { render: render };
})();
if (typeof window !== 'undefined') window.MD = MD;
if (typeof module !== 'undefined' && module.exports) module.exports = MD;
