/* ===== scripts/app/card-id.js -- STABLE, CONTENT-DERIVED CARD IDENTITY =====
   The identity a persisted grade is keyed by. Loads immediately after store.js and
   before progress.js / drill / whiteboard, so every writer and reader agrees.

   THE BUG THIS EXISTS TO KILL (P0, silent, and armed right now).
   Grades were keyed by the card's INDEX IN THE BANK -- progress.<id>.cards was
   { 0:3, 1:2, ... } against _allCards, and wbprog.<id>.steps the same against the
   whiteboard's steps. An index is a position, not an identity. Insert one probe at
   the top of a bank and every stored grade below it silently slides onto the WRONG
   question: your "solid" on the Bloom-filter probe becomes a "solid" on whatever
   now sits at that slot. Nothing errors. The record still looks complete. The user
   is told they have mastered a question they have never seen. With 38 topics about
   to be heavily authored -- cards WILL be inserted and reordered -- that is not a
   hypothetical, it is a scheduled detonation.

   THE FIX. A card's identity is DERIVED FROM ITS OWN CONTENT: a short hash of the
   question text (the whiteboard's is its cue). Reordering a bank does not change a
   question's text, and inserting a card does not change any OTHER card's text, so
   every id survives both -- which is exactly the property an index lacks. It is
   derived, never authored: there is no id field for a human to forget, copy-paste,
   or collide, because authors WILL get that wrong (and a wrong manual id fails the
   same silent way the index does).

   WHAT THE HASH DELIBERATELY IGNORES (normalize()).
   The id must track the QUESTION, not its typography. An author who bolds a term,
   fixes an em-dash, rewraps a line, or wraps a token in <code> has not asked a new
   question, and must not lose the user's grade for it. So normalize() reduces the
   text to its WORDS: tags dropped, HTML entities dropped (the ASCII guard forces
   every dash/quote/arrow to be an entity, so entity churn is a live risk -- a
   compiler tweak from &mdash; to &#8212; must not nuke every grade in the app),
   punctuation and case folded away. What survives is the lowercase word sequence.
   Change the words -- ask a different question -- and the id moves, which is the
   correct and intended outcome: that grade is about a question that no longer
   exists, and progress.js drops exactly it and keeps every other.

   COLLISIONS ARE HANDLED, NOT MERELY IMPROBABLE. Ids are only ever minted for a
   whole bank at once (list()), so a repeat hash inside one bank gets a deterministic
   "~1", "~2" ordinal. Two cards can only collide by (a) genuinely identical question
   words -- an authoring duplicate, where mixing up the two is a semantic no-op --
   or (b) a 32-bit FNV collision inside a ~20-card bank (~1e-7). Neither can corrupt
   a different card's grade, which is the invariant that matters.

   Offline-safe: pure string math. No DOM, no network, no storage. */
var CardId = (function () {

  /* Text -> the bare lowercase words that MAKE it that question. Order matters:
     tags before entities (a stripped <code> must not leave its &lt; behind), and
     every drop becomes a SPACE, never nothing -- gluing "a<b>b</b>" into "ab"
     would invent a word that is in neither the old text nor the new. */
  function normalize(s) {
    return String(s == null ? '' : s)
      .replace(/<[^>]*>/g, ' ')           /* markup: <b>, <code>, <i> ... */
      .replace(/&[#a-zA-Z0-9]{1,10};/g, ' ') /* entities: &mdash; &rsquo; &#8212; ... */
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')        /* punctuation, symbols, whitespace */
      .replace(/^ | $/g, '');
  }

  /* FNV-1a, 32-bit. Chosen for being tiny, dependency-free, well-dispersed on short
     ASCII, and identical in every JS engine -- an id computed here must equal the id
     computed by the regression guard and by any future migration, forever. The
     multiply is the classic shift-add decomposition of 16777619 to stay in int32.
     >>> 0 after every step keeps it unsigned; base36 keeps the key short (<= 7
     chars), which matters because these ids are localStorage keys repeated across
     46 topics. */
  function hash32(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h >>> 0;
  }

  /* The id of ONE text, ignoring collisions. Callers that own a whole bank must use
     list() instead -- an id is only disambiguated relative to its bank. */
  function of(text) { return hash32(normalize(text)).toString(36); }

  /* Mint ids for a WHOLE bank, in bank order, disambiguating repeats. The returned
     ids are position-independent: ids[i] depends only on texts[i]'s own words (and,
     for a genuine duplicate, on how many identical texts precede it). */
  function list(texts) {
    var out = [], seen = Object.create(null), i, base, n;
    if (!texts || !texts.length) return out;
    for (i = 0; i < texts.length; i++) {
      base = of(texts[i]);
      n = seen[base] || 0;
      seen[base] = n + 1;
      out.push(n === 0 ? base : base + '~' + n);
    }
    return out;
  }

  /* The two banks that carry graded cards. A drill probe IS its question (q); a
     whiteboard step IS its cue (c) -- the thing you are asked to draw. Both read
     the card's OWN content, so neither can be thrown off by a sibling's edit. */
  function forCards(cards) {
    return list((cards || []).map(function (c) { return c ? c.q : ''; }));
  }
  function forSteps(steps) {
    return list((steps || []).map(function (s) { return s ? s.c : ''; }));
  }

  /* Own-property read for an id-keyed map. Ids are <= 7 chars of [0-9a-z] (plus an
     optional "~n"), so none can spell an Object.prototype member -- but a persisted
     map is JSON that came back from disk, and reading it through the prototype chain
     is the kind of assumption that only breaks once, in production, silently. */
  function has(map, k) { return !!map && Object.prototype.hasOwnProperty.call(map, k); }
  function level(map, k) { return has(map, k) ? map[k] : 0; }

  return { of: of, list: list, forCards: forCards, forSteps: forSteps, has: has, level: level, normalize: normalize };
})();
window.CardId = CardId;
