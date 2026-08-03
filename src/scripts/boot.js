/* === Boot: theme detection + loading splash === */
try{var _dk=matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.dataset.theme=_dk?'dark':'light';var _tc=document.querySelector('meta[name="theme-color"]');if(_tc)_tc.setAttribute('content',_dk?'#15141A':'#FAF9F5');}catch(e){}
/* === THE DOOR ROOM, STAMPED BEFORE ANYTHING PAINTS =========================================
   MASTER: home-view.js doorRoom() -> Panels.resumeTarget() (panels.js:289) -> the resume
   topic's identity.group. What follows is a duplicate of that derivation, and the duplication is
   FORCED: boot runs before every app module, so it cannot call its master. index.html used to
   paper over the gap by hard-coding data-group="architecture-apis" on <html> -- a CONSTANT, so
   the door lit MAGENTA for every returning user who was not in that room. MEASURED on the
   shipped build, three cold loads on a security-tenancy record: 5-6 frames of architecture-apis
   before the home re-stamped. That constant is gone; there is no room left for it to be wrong in.

   THE CONSTANT WAS NOT SIMPLY WRONG -- IT WAS RIGHT ABOUT A DIFFERENT QUESTION, and deleting it
   without noticing that cost one measured regression before this comment was written. Two routes
   ask two things. A TOPIC route asks "which room is the topic I am about to show", and at boot
   TopicRegistry.current() is `content-pipeline` -- architecture-apis, exactly the constant. The
   HOME asks "which room am I RETURNING to", which is the resume target's, and when there is
   nothing to resume it is TopicRegistry.ids()[0] (`event-driven`, messaging-events) -- the topic
   the cold START card points at. Those two answers DISAGREE, and one attribute was being asked to
   carry both. Dropping the constant with only the door's answer in hand left every topic route
   roomless for the whole session (nothing else stamps it: applyIdentity runs on SWITCHES, so a
   session that boots straight onto the default topic never calls it) -- caught by
   test/room_browser.cjs arm 1, which is what that arm is for.

   THREE FACTS LIVE IN THE REGISTRY AND NOT IN localStorage, so they are the only things carried
   here rather than read: the id->room table, the boot topic, and the cold door's topic. None of
   them is allowed to drift -- test/home_claims.cjs compares all three against TopicRegistry and
   goes red on the first disagreement, in either direction.

   THE HASH WINS WHEN IT NAMES A TOPIC, because a deep link names the room the browser is actually
   loading, and stamping the resume room over it would be the same defect with a nicer source.
   IF localStorage IS DENIED (private mode -- the case scripts/app/store.js already defends) the
   inner catch leaves the record unread and the route's own fallback still answers. */
window.__doorRooms={'messaging-events':'cdc event-driven kafka-internals notifications real-time-delivery saga stream-batch-processing','data-storage':'caching consistency-models consistent-hashing eav probabilistic-structures replication sharding-strategies shared-definition soft-delete storage-engines','reliability-observability':'backpressure circuit-breaker debugging error-propagation idempotency observability retries-timeouts slos','platform-infra':'autoscaling aws-hardening desired-state developer-platform devices-dispatch distributed-locks iac lambda-organization leader-election load-balancing multi-region','architecture-apis':'api-design content-pipeline feature-flags microfrontend rate-limiting rules-engine state-machine','security-tenancy':'authz multi-tenant signing'};
window.__doorBoot='content-pipeline';window.__doorCold='event-driven';
try{
  var _rm=function(i){if(!i)return '';for(var g in window.__doorRooms){if((' '+window.__doorRooms[g]+' ').indexOf(' '+i+' ')>-1)return g;}return '';},_h=(location.hash.match(/^#([a-z0-9-]+)/)||[])[1]||'',_nl=null,_bt=0,_bi='',_k,_p,_i;
  try{_nl=JSON.parse(localStorage.getItem('ddr.v1.nav.last')||'null');for(_i=0;_i<localStorage.length;_i++){_k=localStorage.key(_i);if(_k&&_k.indexOf('ddr.v1.progress.')===0){_p=JSON.parse(localStorage.getItem(_k)||'null');if(_p&&_p.ts>_bt){_bt=_p.ts;_bi=_k.slice(16);}}}}catch(e2){}
  var _dg=_rm(_h)||_rm(_nl&&_nl.id)||_rm(_bi)||_rm((!_h||_h==='home')?window.__doorCold:window.__doorBoot);
  if(_dg)document.documentElement.setAttribute('data-group',_dg);
}catch(e){}
/* v147: Loading splash -- removed by app.js when ready */
(function(){
  var s=document.createElement('div');
  s.id='_bootsplash';
  s.innerHTML='<div class="_bs-ring"><div></div><div></div><div></div><div></div></div>';
  s.style.cssText='position:fixed;inset:0;z-index:9999;background:var(--bg,#FAF9F5);display:flex;align-items:center;justify-content:center;transition:opacity .4s ease,visibility .4s ease';
  var st=document.createElement('style');
  /* THE FIRST CLICK. `_bs-done` starts a 400ms fade -- and a `visibility` transition to `hidden`
     holds `visible` for the ENTIRE 400ms. The splash is position:fixed; inset:0; z-index:9999, so
     without `pointer-events:none` it keeps HIT-TESTING while it is 99% transparent: measured, a
     real trusted click at +87ms landed on #_bootsplash and did nothing. That is the literal first
     tap of every session, for EVERY user (the returning one and the deep-linker never see the
     index overlay at all) -- and at 9999 it outranks even the overlays (--z-popup = 1000), so the
     first-run start screen's own "Start" CTA was dead too. Opacity is a paint property; it does
     not stop hit-testing. Only this does. See test/overlay_deadzone.cjs. */
  st.textContent='._bs-ring{display:inline-block;position:relative;width:48px;height:48px}._bs-ring div{box-sizing:border-box;display:block;position:absolute;width:36px;height:36px;margin:6px;border:3px solid transparent;border-top-color:var(--acc,#534AB7);border-radius:50%;animation:_bs-spin 1.2s cubic-bezier(.5,0,.5,1) infinite}._bs-ring div:nth-child(1){animation-delay:-.45s}._bs-ring div:nth-child(2){animation-delay:-.3s}._bs-ring div:nth-child(3){animation-delay:-.15s}@keyframes _bs-spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}#_bootsplash._bs-done{opacity:0;visibility:hidden;pointer-events:none}';
  document.head.appendChild(st);
  (document.body||document.documentElement).appendChild(s);
  window._hideBootSplash=function(){var el=document.getElementById('_bootsplash');if(el){el.classList.add('_bs-done');setTimeout(function(){el.remove()},400)}};
  setTimeout(window._hideBootSplash,3000);
})();
