# Content Pipeline Deep-Dive Rehearsal — Change Log

## Session: 2026-06-26

### Branch: `visual-enhancements` (master is clean/original)

---

### Phase 1: Visual Polish (49 CSS/Shadow DOM features)

**Ambient Effects**
- @property --accent-hue, --glow-opacity (animatable custom properties)
- Mesh gradient: dual animated ::before/::after pseudo-elements on stage
- Dot grid background on working surface
- Glassmorphism sidebar (backdrop-filter: blur(20px))
- Badge shimmer animation
- Rail fill gradient + glow pulse
- Body entrance animation

**Card System**
- 4-tier --glow / --glow-hover shadow system
- Card ::before radial-gradient spotlight (mouse-tracking via CSS vars)
- 3D tilt on hover (rotateX + rotateY)
- will-change for smoother transforms
- border-color transition on hover
- Spring cubic-bezier easing (.22,.61,.36,1)

**CSS Engineering**
- color-mix() oklab theming
- color(display-p3) wide gamut
- View Transitions API support
- Container queries (@container)
- Subgrid support (@supports)
- prefers-contrast / prefers-reduced-transparency / forced-colors
- @page print styles with badge hiding
- Scrollbar styling
- Mobile nav edge fade (-webkit-mask-image)

**Engineering Improvements**
- Drift-free timer: performance.now() + RAF replaces setInterval
- AbortController for clean keyboard shortcut removal
- disconnectedCallback() on DeepDrill (timer cleanup)
- disconnectedCallback() on DeepCram (IO cleanup)
- IntersectionObserver lazy render on DeepCram

---

### Phase 3: Theatrical Overlays + Critical Bug Fixes

**Overlay Experience**
- Dramatic panel entrance: translateY(28px) scale(.96) translateZ(-30px)
- Improved exit: translateY(12px) scale(.98) translateZ(-20px)
- Backdrop blur animates with overlay opacity (0→8px)
- Enhanced panel glow: 0 0 80px -20px rgba(83,74,183,.15)
- Sticky top bars on cram and mock panels
- Close button: scale(1.1) + rotate(90deg) on hover
- Print button: translateY(-1px) lift on hover

**Bug Fixes**
- Companion panel unstyled (CSS trapped in shadow DOM)
- drill/logic.js truncation broke all JS
- Overlay content couldn't scroll

### Phase 4: Infrastructure

- ARCHITECTURE_MAP.md: Complete component architecture
- test/file_integrity.py: Pre-commit truncation check
- test/lint.py: Full local lint
- CI_WORKFLOW.md: GitHub Actions setup

---

### Phase 2: Aggressive Refinements (25 micro-interaction features)

**Shadow DOM**
- Flow chip hover: lift + glow
- Arc-step hover: lift + glow + smoother transitions
- Dot spring easing (1.56 overshoot)
- Nav button arrow hover animation
- Push button shimmer ::after overlay
- Judge button hover glow + scale feedback
- Drill pill hover lift
- Drill dn-step hover: lift + glow
- Drill progress bar shimmer animation
- Whiteboard num hover scale + glow
- Whiteboard button hover lift

**Light DOM**
- Sidebar seg button: slide-right hover + accent bar
- Sidebar seg button on: glow shadow
- Crambtn hover: lift + enhanced shadow
- Mockbtn shimmer on hover
- Inttog spring toggle easing
- Pane entrance: var(--ease-out) easing

---

### Phase 3: Bug Fixes (3 critical fixes)

**Bug 1: Companion panel completely unstyled**
- Root cause: .cmp-* styles in session-progress.js (shadow DOM) but companion is in index.html (light DOM)
- Fix: Moved all 14 .cmp-* classes to styles.css
- Impact: Right-side panel now properly rendered with eyebrow, topic, bullets, drive section

**Bug 2: drill/logic.js file truncation**
- Root cause: edit_file matched string inside file and corrupted ending
- Effect: class not closed, customElements.define missing → ALL JavaScript broke
- Fix: Restored proper file ending
- Prevention: test/file_integrity.py now checks all 31 JS files

**Bug 3: Overlay content not scrolling**
- Root cause: .cram-panel overflow:hidden with no internal scroll
- Effect: Cram sheet content cut off at viewport bottom
- Fix: Added overflow-y:auto + max-height to cram-body and mock-panel

---

### Phase 4: Infrastructure

**Architecture Map**
- ARCHITECTURE_MAP.md: Complete component map
  - 14 Web Components with Shadow DOM usage
  - 4 shared CSSStyleSheet objects
  - Style domain classification (light vs shadow)
  - Identified bug history with root causes

**Testing Tools**
- test/file_integrity.py: Checks 31 JS files for truncation
- test/lint.py: Full local lint (build + syntax + CSS + integrity)
- CI_WORKFLOW.md: GitHub Actions setup instructions

---

### Statistics

| Metric | Value |
|--------|-------|
| Original styles.css rules | 225 |
| Current styles.css rules | 335 |
| Rules added | 111 |
| Rules removed | 1 |
| Original base-styles.js lines | 19 |
| Current base-styles.js lines | 36 |
| JS files checked by integrity | 31 |
| Git commits on feature branch | 4 |
| Master branch status | Clean (original) |

### Audit Score: 74/74 features verified ✅

### Branches
| Branch | Status |
|--------|--------|
| `master` | Clean original (bca9569) |
| `visual-enhancements` | All enhancements + fixes |
| `gh-pages` | Built HTML (needs updating) |

### GitHub Pages Setup
1. Go to Settings → Pages
2. Source: Branch `gh-pages` / Folder: root
3. Click Save

### Local Development
```bash
# Before every commit:
python3 test/lint.py

# Manual build:
python3 build.py

# File integrity only:
python3 test/file_integrity.py
```
