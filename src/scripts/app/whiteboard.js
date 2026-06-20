/* ============ WHITEBOARD ============ */
var wbSteps=[
  {c:'Entry box &mdash; the handler signature and what fires it.', a:'<code>processUpload(key, bucket)</code> &mdash; the Lambda / API handler, triggered by the S3 <b>ObjectCreated</b> event.'},
  {c:'Routing &mdash; how a file type picks its handler.', a:'<code>extname(key)</code> &rarr; the <code>strategies</code> map (jpg, mp4, ttf, bin, zip&hellip;). An <b>O(1) lookup</b>, never a switch.'},
  {c:'The branch for an unrecognized type.', a:'unknown ext &rarr; <code>skip</code> (a logged no-op); a match &rarr; the format handler.'},
  {c:'Inside a handler &mdash; the single-read data flow.', a:'<code>readStream &rarr; PassThrough &rarr; [hash | s3.upload] &rarr; Promise.all</code>. <b>One disk read</b>, forked two ways.'},
  {c:'The export path, and its memory property.', a:'<code>cursor(batch 100) &rarr; csv &rarr; res</code>, the backpressure loop drawn back from socket to cursor &mdash; <b>constant memory</b> at any row count.'},
  {c:'The import path &mdash; the id-collision algorithm.', a:'The 4-tier ladder &mdash; <b>REUSE / REMAP / REGEN / INSERT</b> &mdash; plus the <code>oldId&rarr;newId</code> FK remap applied before each child insert.'},
  {c:'The dual-write caveat, and its fix.', a:'Two stores, no shared txn &rarr; track the S3 keys, <b>compensating-delete</b> on rollback. (The one people forget.)'},
  {c:'The backstop for orphans &mdash; and its one guard.', a:'A <b>reconciler</b> sweeps S3 for keys with no DB row &rarr; delete &mdash; but only past a grace window / <b>PENDING</b> marker, so it never touches an in-flight upload.'},
  {c:'How a redelivered event avoids double work.', a:'At-least-once delivery &rarr; a <b>processed-marker</b> (conditional put on the content hash). A replay sees it and no-ops &mdash; the effect is idempotent.'}
];
var wblist=document.getElementById('wblist'),wbcount=document.getElementById('wbcount');
var wbverdict=document.getElementById('wbverdict');
function updCount(){
  var got=wblist.querySelectorAll('li.got').length,
      miss=wblist.querySelectorAll('li.missed').length,
      total=wbSteps.length,graded=got+miss;
  wbcount.textContent=got+' recalled \u00b7 '+miss+' missed \u00b7 '+(total-graded)+' left';
  if(graded<total){wbverdict.style.display='none';return;}
  wbverdict.style.display='block';
  if(miss===0){
    wbverdict.className='wb-verdict ok';
    wbverdict.innerHTML='<b>All nine cold.</b> You can rebuild this system on a whiteboard from memory \u2014 the design round is yours to lose, not to pass.';
  }else{
    wbverdict.className='wb-verdict warn';
    wbverdict.innerHTML='<b>'+got+' / '+total+' recalled.</b> '+miss+' still soft \u2014 drill just those until they\u2019re automatic.<button id="wbrerun" type="button">Reset the '+miss+' miss'+(miss>1?'es':'')+'</button>';
    document.getElementById('wbrerun').onclick=wbRerun;
  }
}
function wbReset(li){
  li.classList.remove('got','missed');
  li.querySelector('.wb-ans').classList.remove('show');
  var r=li.querySelector('.wb-rev');r.disabled=false;r.textContent='Reveal';
  li.querySelector('.wb-got').disabled=true;
  li.querySelector('.wb-miss').disabled=true;
}
function wbRerun(){
  var m=wblist.querySelectorAll('li.missed');
  for(var i=0;i<m.length;i++)wbReset(m[i]);
  updCount();
  var first=wblist.querySelector('li:not(.got)');
  if(first)first.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth',block:'center'});
}
wbSteps.forEach(function(s,i){
  var li=document.createElement('li');
  li.innerHTML='<div class="wb-cue"><span class="num"></span><span class="wb-ct">'+s.c+'</span></div>'+
    '<div class="wb-ans">'+s.a+'</div>'+
    '<div class="wb-act"><button class="wb-rev" type="button">Reveal</button>'+
    '<button class="wb-got" type="button" disabled>Drew it</button>'+
    '<button class="wb-miss" type="button" disabled>Missed</button></div>';
  var ans=li.querySelector('.wb-ans'),rev=li.querySelector('.wb-rev'),
      got=li.querySelector('.wb-got'),miss=li.querySelector('.wb-miss');
  rev.onclick=function(){ans.classList.add('show');rev.disabled=true;rev.textContent='Revealed';got.disabled=false;miss.disabled=false;};
  got.onclick=function(){li.classList.add('got');li.classList.remove('missed');updCount();};
  miss.onclick=function(){li.classList.add('missed');li.classList.remove('got');updCount();};
  wblist.appendChild(li);
});
updCount();
