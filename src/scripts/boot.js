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
   inner catch leaves the record unread and the route's own fallback still answers.

   THE DERIVATION IS SPLIT BY ROUTE SHAPE, AND CYCLE 2 WIRED ONLY HALF OF IT -- which put this
   wave's own defect back on the route family the gate itself drives. Cycle 2's one-line chain was
   `_rm(_h) || _rm(nav.last) || _rm(newest) || _rm(home ? cold : boot)`: the RECORD was consulted
   BEFORE the route was, so the __doorBoot branch could only ever fire on an EMPTY record. On any
   BARE-VIEW route -- #walk, #drill, #wb, the routes the gate drives -- a user with a record got
   the HOME's answer: the whole document lit in the resume topic's room while the app showed the
   boot topic, for the entire session, because applyIdentity() runs on SWITCHES and a bare-view
   boot never switches. MEASURED on the committed cycle-2 deliverable, seed = caching
   (data-storage): #walk stamped data-storage while the app showed content-pipeline
   (architecture-apis) -- --acc rgb(49,91,180) against a room-of-shown rgb(150,61,134), and the
   MutationObserver log held that ONE value for the whole load. Master's deleted
   data-group="architecture-apis" constant made this route CORRECT, which is the uncomfortable
   part: deleting a constant is only an improvement if what replaces it answers every question the
   constant was answering. The comment above names the TWO questions; the code asked one.

   So the hash is resolved FIRST and alone, and the fallback is chosen by route shape:
     a topic hash          -> that topic's room (a deep link names what is loading)
     nothing, or #home     -> the DOOR's answer: resume pointer, else newest graded, else cold door
     any other hash        -> a BARE VIEW of the boot topic, so the BOOT topic's room
   router.js:155 states the app's own rule for the third line -- "#walk resolves to the boot
   topic" -- and this is that sentence, at boot, before anything paints.

   THE CLASSIFIER READS THE HASH'S EMPTINESS, NEVER THE PARSED TOPIC (cycle 6, R16). Until this
   line it read `_h`, a `/^#([a-z0-9-]+)/` match -- so EVERY hash the pattern refused collapsed to
   the empty string and took the `!_h` branch, which is the DOOR's answer. "No hash" and "a hash
   this regex cannot parse" are not the same route, and four shapes proved it on the committed
   build: `#Walk`, `#Saga/walk`, `#/walk`, `#!walk` and `#Nonsense` are all BARE VIEWS -- the
   router lower-cases the view id and falls back to `walk` for an unknown one (router.js:50-51) --
   and every one of them lit the RESUME room while the app showed the boot topic, which is exactly
   the cycle-2 defect this comment already describes, arriving through a different door.
   SO THE TEST IS ON `_raw`, THE WHOLE HASH, and the two lookups match the router's own case rules:
   the TOPIC lookup is case-SENSITIVE, because the router's is (`TopicRegistry.get(parts[0])`, and
   the registry's ids are lower-case slugs), so `#Saga/walk` is NOT a topic route; the VIEW test is
   case-INSENSITIVE, because the router's is, so `#HOME` is the home. Measured expectations:
   `#Saga/walk` `#Walk` `#/walk` `#!walk` `#Nonsense` -> the BOOT topic's room; `#HOME` `#home` and
   an empty hash -> the DOOR's; `#saga/walk` -> saga's room; `#walk` `#drill` `#nonsense`
   unchanged. test/home_claims.cjs drives the mixed-case and malformed cells against the room the
   app actually shows.

   AND A TOPIC-PREFIXED HOME IS A HOME (cycle 7, R19). `#authz/home` is a real shape: router.js's
   own comment records a replaceState that leaves a topic prefix on a TOPICLESS view, and
   copy-link.js copies location.href verbatim, so URLs of that shape exist in the wild and get
   pasted back. The app RESOLVES them to the home -- the view segment decides the view -- and
   until this line the door lit `authz`'s room on one, because the topic lookup ran FIRST and won.
   That is the wave's own defect with the operands swapped: the document wearing the room of a
   topic the app is not showing, on the one surface whose whole question is "which room am I
   RETURNING to". So the HOME test is asked BEFORE the topic lookup, and it reads the second
   segment as well as the first. The deeper repair -- the router not writing that URL in the first
   place, by stripping a topic prefix off a topicless view at replaceState -- is a W2 candidate
   and is deliberately NOT done here: this file's job is to light the door correctly on the URLs
   that exist, and a stale link in someone's notes will outlive any router fix.

   AND THE SECOND-SEGMENT TEST IS GATED ON THE PREFIX BEING A TOPIC (cycle 8, R21 -- which AMENDS
   R19). R19's line asked `(_raw.split('/')[1]||'').toLowerCase()==='home'` with no condition on
   the FIRST segment, and that shipped this wave's own defect class one door over: `#walk/home`,
   `#drill/home`, `#viz/home`, `#wb/home`, `#/home`, `#Walk/home`, `#walk/HOME`, `#nonsense/home`
   and `#AUTHZ/home` all took the DOOR's answer, so on a seeded record the whole document wore the
   RESUME room while the app was showing a bare view of the BOOT topic -- permanently, since a
   bare-view boot never switches and never re-stamps. Measured on the built page: nine shapes, the
   wrong room as the ONLY value in the document_start mutation log and across 90 painted frames.
   parseHash strips segment 0 ONLY when `TopicRegistry.get(parts[0]) && !ROUTES[parts[0]]`
   (router.js:41), so a second segment is a VIEW only when the first is a registered topic; on
   every other shape segment 0 IS the view and `home` in segment 1 is a sub-state, not a route.
   `_hr` is precisely that predicate -- the id->room lookup is case-sensitive over the registry's
   lower-case slugs and router.js's own comment records that a topic slug can never equal one of
   the view ids -- so the test is `_hr && segment-1 is home`, which is the router's condition and
   not a second guess at it. */
window.__doorRooms={'messaging-events':'cdc event-driven kafka-internals notifications real-time-delivery saga stream-batch-processing','data-storage':'caching consistency-models consistent-hashing eav probabilistic-structures replication sharding-strategies shared-definition soft-delete storage-engines','reliability-observability':'backpressure circuit-breaker debugging error-propagation idempotency observability retries-timeouts slos','platform-infra':'autoscaling aws-hardening desired-state developer-platform devices-dispatch distributed-locks iac lambda-organization leader-election load-balancing multi-region','architecture-apis':'api-design content-pipeline feature-flags microfrontend rate-limiting rules-engine state-machine','security-tenancy':'authz multi-tenant signing'};
window.__doorBoot='content-pipeline';window.__doorCold='event-driven';
try{
  var _rm=function(i){if(!i)return '';for(var g in window.__doorRooms){if((' '+window.__doorRooms[g]+' ').indexOf(' '+i+' ')>-1)return g;}return '';},_raw=(location.hash||'').replace(/^#/,''),_seg=_raw.split('/')[0]||'',_nl=null,_bt=0,_bi='',_k,_p,_i;
  try{_nl=JSON.parse(localStorage.getItem('ddr.v1.nav.last')||'null');for(_i=0;_i<localStorage.length;_i++){_k=localStorage.key(_i);if(_k&&_k.indexOf('ddr.v1.progress.')===0){_p=JSON.parse(localStorage.getItem(_k)||'null');if(_p&&_p.ts>_bt){_bt=_p.ts;_bi=_k.slice(16);}}}}catch(e2){}
  var _hr=_rm(_seg),_door=_rm(_nl&&_nl.id)||_rm(_bi)||_rm(window.__doorCold);
  var _dg=(!_raw||_seg.toLowerCase()==='home'||(_hr&&(_raw.split('/')[1]||'').toLowerCase()==='home'))?_door:(_hr||_rm(window.__doorBoot));
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
