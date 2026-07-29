# W15 CODA DELTA-CHECK — VERDICT

**VERDICT: CLEAN. Zero findings. The coda ships as frozen.**

**Attribution (unusual, stated plainly):** the measurement receipts are w3-verifier's, produced
across two instances both killed mid-pass by API 500s (2026-07-30 ~01:15–01:24 IST); a fresh
finisher agent was also killed by the same 500 storm before contributing. The remaining ~20% —
executing the two negative-control scripts, the source adjudication, and this synthesis — was
completed directly by the team-lead (the only stable session during the incident). Every receipt
consumed is on disk in this directory; nothing below rests on memory.

## Adjudication

1. **Receipts (w3-verifier):** `w15-red-repro.txt` — the new `room_browser` arms reproduce their
   watched red on the pre-fix build, both arms, both themes, cause-naming output (boot-constant
   architecture-apis ink identified by name). `w15-cen-*.json` ×4 — census runs both builds/themes.
   `w15-base-*.png` — pre-fix renders of record.
2. **VR (w3-verifier, `w15-vr.txt`):** home-light/home-dark changed **642 px each**, identical
   bbox `107x9 @ (150,46)` (the "DEEP REHEARSAL" glyphs), worst channel delta 67/61 — matching the
   freeze exactly; the identical count across themes is the signature of a pure colour change.
   **All other 14 baselines byte-identical** to `8d1e73d`. Manifest diff = 2 shas + timestamp.
3. **Negative controls (team-lead, executed 02:05 IST):** `w15-ctlA.cjs` — the mutant (brand forced
   to a room ink) goes **RED on both arms, both themes, exit 1**: the arms can fail, and fail with
   the right cause text. `w15-ctlB.cjs` — the same logic against the shipped build: **PASS, exit 0**,
   all five `room_browser` assertions.
4. **Source (team-lead):** `3666f3e` adds exactly one selector (`#home .hm-brand`) to each of the
   two neutralisation rules (light + dark), **zero new literals** (the pair already lives in those
   rules as the documented brand indigo / badge colour / roomless default), and rewrites the
   membership comment honestly ("must not claim a room") with the `.tn-trigger` counter-case stated.
   `test/room_browser.cjs` contains **zero hex literals** — references probe-resolved, as claimed.
5. **Pair + gate:** the four review PNGs are committed with a framing-asserting script that
   validated identical clips at capture time; the committed gate capture reads **67/67 PASS** with
   `room_browser` at five assertions. Accepted at freeze-record depth (proportionate to a
   one-selector coda whose live receipts triangulate three independent ways).

## Hazards pre-cleared

- **A check that cannot fail:** ctlA proves both new arms fail on a wrong colour, with exit 1.
- **A hidden second change:** the deliverable diff beyond the selector additions is the inlined
  copy of the same styles + the test file — no other rule moved; the 14-baseline byte-identity is
  the pixel-level proof.
- **Token theatre:** the freeze's rejection of `--indigo` (light value `#4338CA` ≠ brand) was
  verified against the census values — binding it would have shipped a non-brand hue.
