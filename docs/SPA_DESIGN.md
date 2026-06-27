# SPA Architecture Design — Content Pipeline Deep-Dive Rehearsal

## Goals
- True SPA feel within single-file HTML
- Hash-based routing: `#walk`, `#drill`, `#wb`, `#sys`, `#trade`, `#model`, `#num`, `#rf`, `#open`
- Deep linking: `#drill/probe-3` opens drill at probe 3
- Browser back/forward works across all views
- Each view preserves its own state (scroll, open details, step position)
- Loading skeletons during view initialization
- Smooth enter/leave transitions
- Document title updates per view
- Focus management on view change

## Architecture

### Module: HashRouter (`router.js`)
- Parses `window.location.hash` to determine route
- Emits `routechange` events
- Handles `hashchange` and `popstate`
- Guards invalid routes (fallback to `#walk`)
- Normalizes routes (e.g., `#walk/` → `#walk`)

### Module: ViewManager (`view-manager.js`)
- Maintains registry of 9 views with metadata
- Handles enter/leave lifecycle:
  - `beforeLeave()` — save state
  - `beforeEnter()` — prepare DOM
  - `enter()` — animate in (with transition)
  - `afterEnter()` — restore state, set focus
- Loading skeleton integration
- Transition lock (prevents rapid switching)

### Module: StateStore (`state-store.js`)
- Per-view state:
  - `scrollTop` — scroll position
  - `openDetails` — which details elements are open
  - `currentStep` — walkthrough step, drill probe number
  - `inputValues` — any form inputs
  - `timestamp` — when last visited
- Auto-save on view leave
- Auto-restore on view enter
- LRU eviction if memory concerns

### Module: ViewTransitions (`view-transitions.js` — updated)
- Integrates with ViewManager lifecycle hooks
- Provides cross-fade + slide animation
- Supports both View Transitions API and CSS fallback
- Coordinates with loading skeletons

### Module: TitleManager
- Maps routes to document titles
- Updates `document.title` on route change
- Example: "Walkthrough — Content Pipeline Deep Rehearsal"

### Module: FocusManager
- Saves focus before view leave
- Restores focus after view enter
- Sets initial focus to first interactive element
- Announces view change to screen readers (aria-live)

## View Registry
```
walk     → Walkthrough     → title: "Walkthrough"
drill    → Probe Drill     → title: "Probe Drill"  
wb       → Whiteboard      → title: "Whiteboard"
sys      → System Map      → title: "System Map"
trade    → Trade-offs      → title: "Trade-offs"
model    → Model Answers   → title: "Model Answers"
num      → Numbers         → title: "Numbers"
rf       → Red Flags       → title: "Red Flags"
open     → 30-Second       → title: "30-Second"
```

## Deep Linking Format
```
#drill           → Drill view, default state
#drill/probe-3   → Drill view, jump to probe 3
#walk/step-5     → Walkthrough, jump to step 5
```

## Integration Points
- Replaces current `switchTab()` function
- Intercepts all nav button clicks → router.navigate()
- Intercepts keyboard shortcuts → router.navigate()
- Works with existing Web Components (no changes needed)
- Works with existing overlay system

## CSS Additions
- `.skeleton` — loading placeholder blocks
- `.view-enter` / `.view-leave` — animation classes
- `.view-loading` — loading state
- `.view-loaded` — loaded state

## Test Plan
- Router: route parsing, normalization, guards, events
- ViewManager: enter/leave lifecycle, transition lock
- StateStore: save/restore, LRU eviction
- Deep linking: URL → correct view + state
- History: back/forward across views
- Title: correct title per view
- Focus: saved and restored correctly
- Accessibility: aria-live announcements
