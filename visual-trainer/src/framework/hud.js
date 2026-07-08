// framework/hud.js -- shared HUD: status badge, event banner, caption bar,
// story-mode driver, control locking. Pure DOM, no Three.js, no sim logic.
export function createHUD({ badgeId = 'status', bannerId = 'banner', captionId = 'caption' } = {}) {
  const $ = (id) => document.getElementById(id);
  return {
    setBadge(text, tone) { const b = $(badgeId); b.textContent = text; b.className = 'badge ' + tone; },
    banner(text) { const el = $(bannerId);
      if (text) { el.style.display = 'block'; el.textContent = text; } else el.style.display = 'none'; },
    caption(text) { const el = $(captionId);
      if (text == null) { el.style.display = 'none'; el.textContent = ''; }
      else { el.style.display = 'block'; el.textContent = text; } },
  };
}

// Story driver: timed steps { t, cap?, do? } against a monotonically
// advancing clock (usually sim time). Modes supply init/onEnd.
export function createStoryDriver({ now, hud, lockControls }) {
  let story = null;
  return {
    active: () => !!story,
    currentCaption: () => (story ? story.lastCap || '' : ''),
    run(steps, { init, onEnd } = {}) {
      if (story) return;
      if (init) init();
      story = { steps, i: 0, start: now(), onEnd, lastCap: '' };
      lockControls(true);
      hud.caption('');
    },
    stop() {
      if (!story) return;
      const end = story.onEnd;
      story = null;
      hud.caption(null);
      lockControls(false);
      if (end) end();
    },
    tick() {
      if (!story) return;
      const el = now() - story.start;
      while (story.i < story.steps.length && el >= story.steps[story.i].t) {
        const st = story.steps[story.i];
        if (st.cap) { hud.caption(st.cap); story.lastCap = st.cap; }
        if (st.do) st.do();
        story.i += 1;
      }
      if (story.i >= story.steps.length) this.stop();
    },
  };
}

export function makeControlLocker({ panelSelector = '.panel', exceptId = 'stopStory' } = {}) {
  return (dis) => {
    for (const el of document.querySelectorAll(panelSelector + ' input, ' + panelSelector + ' button')) {
      if (el.id !== exceptId) el.disabled = dis;
    }
    const stop = document.getElementById(exceptId);
    if (stop) stop.style.display = dis ? 'inline-block' : 'none';
  };
}
