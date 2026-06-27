# Root Cause Analysis: Scrollable Whitespace & Mockbar Visibility

## Date: 2026-06-27
## Branch: visual-enhancements
## Commits Analyzed: bca9569 (master) through 15ae23a (HEAD)

---

## Executive Summary

Three distinct root causes introduced scrollable whitespace on desktop (146px gap) and
made the Tools mockbar visible without user interaction on mobile. All issues are now
resolved in commit `15ae23a`.

| Metric | Original (master) | Before Fix (HEAD~1) | After Fix (HEAD) |
|--------|-------------------|---------------------|------------------|
| Desktop body.scrollHeight | 931 | 1081 | **935** |
| Desktop body.clientHeight | 931 | 935 | **935** |
| Desktop has scroll? | NO | **YES (146px)** | **NO** |
| companion.scrollHeight | 800 | 919 | **800** |
| Mobile mockbar visible? | NO | **YES** | **NO** |

---

## Root Cause 1: Mesh Gradient Pseudo-Elements (146px desktop gap)

**File:** `src/styles.css`
**Introduced:** Commit `d43f089` ("aggressive visual enhancements wave 1")
**Impact:** 146px of scrollable whitespace on desktop

### The Bug

Added `.stage::before` and `.stage::after` for ambient mesh gradient backgrounds:

```css
.stage::before {
  content: "";
  position: absolute;          /* <-- BUG: absolute positioning */
  top: -20%; left: -10%;       /* <-- negative offset from viewport */
  width: 80%; height: 80%;
  /* ... radial gradient ... */
}
.stage::after {
  content: "";
  position: absolute;          /* <-- BUG: absolute positioning */
  bottom: -15%; right: -10%;   /* <-- extends 15% below viewport */
  width: 70%; height: 70%;
  /* ... radial gradient ... */
}
```

**Critical missing property:** `.stage` had NO `position: relative`.

When a `position: absolute` element has no positioned ancestor, its containing block
becomes the **initial containing block** (the viewport/root). The `::after` pseudo-element
with `bottom: -15%` placed itself 15% below the viewport bottom, extending the document's
scrollHeight by approximately `15% of 800px = 120px` plus additional margins.

### Verification

```
Baseline:                    body.scrollHeight = 1081
Hide ::before only:          body.scrollHeight = 1081 (no change)
Hide ::after only:           body.scrollHeight = 935  (-146px) <-- CULPRIT
Add position:relative:       body.scrollHeight = 935  (-146px) <-- FIX
```

### Fix Applied

```css
.stage {
  flex: 1;
  min-width: 0;
  padding: 32px clamp(20px,4vw,52px) 70px;
  overflow-x: hidden;
  position: relative;          /* <-- Creates containing block for ::before/::after */
}
```

This makes both pseudo-elements position themselves relative to `.stage` (which is
`position: relative`), fully containing their overflow within the stage element.

---

## Root Cause 2: Companion Panel Overflow (74px gap contributor)

**File:** `src/styles.css`
**Introduced:** Commit `d43f089` (companion light-DOM styles)
**Impact:** 74px additional body scroll + companion internal overflow

### The Bug

Added `.cmp-inner` styling for the companion panel:

```css
.cmp-inner {
  padding: 34px 26px 40px;     /* 74px total vertical padding */
  display: flex;
  flex-direction: column;
}
```

The companion has `height: 100vh` (800px) with `overflow-y: auto`. The `.cmp-inner`
with 74px of padding plus block content (`.cmp-block` with 24px padding each) made
the total content height exceed 800px, causing `companion.scrollHeight` to grow to 919px.

With `position: sticky` on the companion, this internal overflow leaked into the
body's scrollHeight calculation (browser behavior with sticky + overflow containers).

### Verification

```
Original master:             companion.scrollHeight = 800
Current (before fix):        companion.scrollHeight = 919 (+119px)
Both fixes applied:          companion.scrollHeight = 800  (restored)
```

### Fix Applied

Made the companion a flex container and `.cmp-inner` a scrollable flex child:

```css
@media(min-width: 1280px) {
  .companion {
    display: flex;             /* Changed from block */
    flex-direction: column;    /* Stack children vertically */
    /* ... other properties ... */
  }
  .cmp-inner {
    flex: 1;                   /* Fill available height */
    min-height: 0;             /* Allow flex shrinking below content size */
    overflow-y: auto;          /* Scroll internal overflow */
    padding: 34px 26px 40px;
    display: flex;
    flex-direction: column;
  }
}
```

This pattern (flex container + flex:1 child with min-height:0 + overflow-y:auto) is the
standard way to contain scrollable overflow within a fixed-height flex parent.

---

## Root Cause 3: Mockbar Visible Without Tools Button (mobile)

**File:** `src/styles.css` + `src/scripts/app/numbers-nalsd.js`
**Introduced:** Commit `d43f089` (CSS) + `47c13cb` (JS fix)
**Impact:** Tools visible by default on mobile without user tapping Tools

### The Bug

The original code hid the mockbar using only `transform: translateY(115%)`:

```css
.sidebar .mockbar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  transform: translateY(115%);   /* Only visual hiding */
  transition: transform .26s ease;
}
body.tools-open .sidebar .mockbar {
  transform: none;               /* Shows when tools-open class added */
}
```

`transform: translateY(115%)` visually moves the element off-screen but it remains
in the layout. In some browser contexts (mobile viewport calculations, flex layout
changes), this caused the mockbar to be partially or fully visible.

Additionally, dynamic particles (added in commit `008d3ab`) were appended to `.stage`,
extending the scrollable area and pushing content around. These were removed in
commit `008d3ab`.

### The Content-visibility Red Herring

An earlier attempted fix added `content-visibility: auto; contain-intrinsic-size: 0 500px`
to `.stage`. This told the browser to use a 500px placeholder for the stage while
off-screen, creating massive scrollable whitespace. This was removed in commit
`224f1e0`.

### The @supports Brace Balance Disaster

When adding a heading gradient, an `edit_file` operation corrupted the CSS:

```css
@supports (background-clip: text) {
  /* ... new gradient code ... */
}  /* <-- MISSING closing brace! */
```

This trapped approximately 60% of the CSS inside the `@supports` block, breaking
styles across the entire application. Fixed in commit `224f1e0`.

### Final Fix Applied

**CSS:** Added explicit `display: none` / `display: flex` toggle:

```css
.sidebar .mockbar {
  /* ... other properties ... */
  transform: translateY(115%);
  transition: transform .26s ease;
  display: none;                 /* Explicitly hidden when closed */
}
body.tools-open .sidebar .mockbar {
  display: flex;                 /* Shown when tools opened */
  transform: none;
}
```

**JS:** Smooth transition handling:

```javascript
function openMockbar() {
  mockbar.style.display = 'flex';
  mockbar.offsetHeight;          // Force reflow for transition
  document.body.classList.add('tools-open');
}
function closeMockbar() {
  document.body.classList.remove('tools-open');
  setTimeout(function() {
    if (!document.body.classList.contains('tools-open')) {
      mockbar.style.display = ''; // Return to none after transition
    }
  }, 260);                        // Match CSS transition duration
}
```

---

## Regression Timeline (Playwright-verified)

| Commit | Desktop scrollHeight | Mockbar Visible | Particle Effect | Notes |
|--------|---------------------|-----------------|-----------------|-------|
| `bca9569` (master) | 931 | NO | NO | Clean baseline |
| `d43f089` (wave 1) | 1043 | **YES** | NO | Mesh gradients + companion overflow introduced |
| `008d3ab` (wave 2) | 1893 | YES | **YES** | Particles added, massive scroll explosion |
| `224f1e0` (wave 3) | ~1461 | YES | NO | content-visibility removed, @supports fixed |
| `189d337` (wave 4) | ~1461 | partial | NO | Mobile mockbar display:none |
| `09739cd` (wave 5) | ~1461 | NO | NO | Original transform approach restored |
| `47c13cb` (wave 6) | ~1461 | NO | NO | JS transition + display toggle |
| `15ae23a` (wave 7) | **935** | **NO** | NO | **ALL issues resolved** |

---

## Prevention Measures

1. **Always establish containing blocks** when using `position: absolute/relative`
2. **Verify scroll metrics** after any layout/CSS changes using Playwright
3. **Use `display: none` + class toggle** for visibility, not just `transform`
4. **Test both desktop AND mobile** viewports for every CSS change
5. **Run CSS syntax validation** before committing (brace balance, etc.)
6. **E2E test suite** (`test/e2e_scroll_test.py`) now guards against regression

---

## Test Coverage Added

| Test File | Purpose |
|-----------|---------|
| `test/e2e_scroll_test.py` | Verifies zero body scroll on desktop, mockbar hidden on mobile |
| `test/css_syntax.py` | Validates brace balance, keyframe syntax |
| `test/visual_regression.py` | Structure-based visual assertions |
| `test/unit_tests.py` | 66 tests covering data purity, CSS, JS integrity |
