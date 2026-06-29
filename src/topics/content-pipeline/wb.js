/* topics/content-pipeline/wb.js -- Phase 1: REAL whiteboard data (extracted from the
   former baked WB_STEPS + WB_HTML). steps:[{c,a}x9]; diagram = the .dgm inner; foot;
   sub + okVerdict are the schema EXTENSION (both hard-coded "nine" -> now data, so a
   topic with a different step count reads correctly). Offline-safe; 7-bit ASCII. */
var TOPIC_CP_WB = {
  steps: [
    {c:'Entry box &mdash; the handler signature and what fires it.', a:'<code>processUpload(key, bucket)</code> &mdash; the Lambda / API handler, triggered by the S3 <b>ObjectCreated</b> event.'},
    {c:'Routing &mdash; how a file type picks its handler.', a:'<code>extname(key)</code> &rarr; the <code>strategies</code> map (jpg, mp4, ttf, bin, zip&hellip;). An <b>O(1) lookup</b>, never a switch.'},
    {c:'The branch for an unrecognized type.', a:'unknown ext &rarr; <code>skip</code> (a logged no-op); a match &rarr; the format handler.'},
    {c:'Inside a handler &mdash; the single-read data flow.', a:'<code>readStream &rarr; PassThrough &rarr; [hash | s3.upload] &rarr; Promise.all</code>. <b>One disk read</b>, forked two ways.'},
    {c:'The export path, and its memory property.', a:'<code>cursor(batch 100) &rarr; csv &rarr; res</code>, the backpressure loop drawn back from socket to cursor &mdash; <b>constant memory</b> at any row count.'},
    {c:'The import path &mdash; the id-collision algorithm.', a:'The 4-tier ladder &mdash; <b>REUSE / REMAP / REGEN / INSERT</b> &mdash; plus the <code>oldId&rarr;newId</code> FK remap applied before each child insert.'},
    {c:'The dual-write caveat, and its fix.', a:'Two stores, no shared txn &rarr; track the S3 keys, <b>compensating-delete</b> on rollback. (The one people forget.)'},
    {c:'The backstop for orphans &mdash; and its one guard.', a:'A <b>reconciler</b> sweeps S3 for keys with no DB row &rarr; delete &mdash; but only past a grace window / <b>PENDING</b> marker, so it never touches an in-flight upload.'},
    {c:'How a redelivered event avoids double work.', a:'At-least-once delivery &rarr; a <b>processed-marker</b> (conditional put on the content hash). A replay sees it and no-ops &mdash; the effect is idempotent.'}
  ],
  diagram: `
          <div class="dgm-node"><div class="dgm-t">operator &rarr; S3 bucket</div><div class="dgm-s">the upload lands as an object</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">S3 <code>ObjectCreated</code> event</span></div>
          <div class="dgm-node"><div class="dgm-t"><code>processUpload(key, bucket)</code></div><div class="dgm-s">Lambda / handler entry</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>extname</code> &rarr; strategies map &middot; O(1)</span></div>
          <div class="dgm-node"><div class="dgm-t">format handler</div><div class="dgm-s">jpg &middot; mp4 &middot; ttf &middot; bin &mdash; unknown ext &rarr; <i>skip</i></div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl"><code>readStream</code></span></div>
          <div class="dgm-node dgm-fork"><div class="dgm-t">PassThrough &middot; <span class="dgm-em">one read</span></div><div class="dgm-branches"><span class="dgm-br">&rarr; hash</span><span class="dgm-br">&rarr; s3.upload</span></div><div class="dgm-s"><code>Promise.all</code> &mdash; forked, single read</div></div>
          <div class="dgm-conn"><span class="dgm-v">&#9660;</span><span class="dgm-lbl">persist across two stores</span></div>
          <div class="dgm-stores"><div class="dgm-node dgm-store"><div class="dgm-t">DB record</div><div class="dgm-s">catalog row</div></div><div class="dgm-link">&harr;</div><div class="dgm-node dgm-store"><div class="dgm-t">S3 blob</div><div class="dgm-s">object bytes</div></div></div>
          <div class="dgm-note">no shared transaction &rarr; track keys + <b>compensating-delete</b> on rollback</div>
          <div class="dgm-conn dgm-up"><span class="dgm-v">&#9650;</span><span class="dgm-lbl">backstops the two stores</span></div>
          <div class="dgm-node dgm-recon"><div class="dgm-t">reconciler</div><div class="dgm-s">sweeps orphans past a grace window / <b>PENDING</b> marker &mdash; never touches an in-flight upload</div></div>
          <div class="dgm-foot">redelivered event &rarr; <b>processed-marker</b> (conditional put) &rarr; replay no-ops &middot; idempotent</div>
        `,
  foot: "<b>The one people forget:</b> step 7. Two stores, no shared transaction &mdash; if you don't volunteer the compensating S3 delete, the interviewer knows you've only read about this, not shipped it.",
  sub: "For each cue, draw it from memory first &mdash; then reveal to check. Produce all nine cold and you can run this system on a whiteboard.",
  okVerdict: "<b>All nine cold.</b> You can rebuild this system on a whiteboard from memory \\u2014 the design round is yours to lose, not to pass."
};
