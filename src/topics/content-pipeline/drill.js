/* topics/content-pipeline/drill.js -- FOUNDATION Phase-0 thin alias.
   cards/speakLines are the drill working-set globals, populated by drill/cards.js +
   drill/speak-lines.js which load BEFORE this bundle (app.js order), so the alias
   captures real data. bank.js + publishBanks read this at boot (mock-run/mixed-fire).
   tierNotes references DRILL_TIER_NOTES (assigned later, in drill/logic.js) -- unused
   in Phase 0 (drill stays plain). The drill agent inlines the real arrays in Phase 1. */
var TOPIC_CP_DRILL = { cards: cards, speak: speakLines, tierNotes: DRILL_TIER_NOTES };
