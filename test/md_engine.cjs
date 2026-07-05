/* GATE: the MD inline-markdown renderer. Verifies the supported subset renders, and --
   critically -- that already-authored HTML+entity content passes through byte-identically
   (so adopting markdown needs no migration), plus code protection, idempotency, and that
   non-emphasis punctuation is left alone. */
const path = require('path');
const MD = require(path.join(__dirname, '..', 'src', 'scripts', 'app', 'markdown.js'));
let pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) pass++;
  else { fail++; console.log('FAIL ' + name + '\n   want: ' + JSON.stringify(want) + '\n    got: ' + JSON.stringify(got)); }
}
// subset renders
eq('bold', MD.render('the **verified token** here'), 'the <b>verified token</b> here');
eq('italic', MD.render('a *derived* value'), 'a <i>derived</i> value');
eq('code', MD.render('use `findOrders()` now'), 'use <code>findOrders()</code> now');
eq('link', MD.render('see [the docs](https://x.io/y)'), 'see <a href="https://x.io/y">the docs</a>');
eq('emdash', MD.render('token -- a claim'), 'token &mdash; a claim');
eq('dquote', MD.render('he said "no" today'), 'he said &ldquo;no&rdquo; today');
eq('apos', MD.render("don't and token's"), 'don&rsquo;t and token&rsquo;s');
eq('bold+ital', MD.render('**bold** and *ital*'), '<b>bold</b> and <i>ital</i>');
// CRITICAL: existing authored HTML+entities pass through unchanged
const real = 'From the <b>verified token</b> &mdash; a signed claim like <code>custom:tenant_id</code> &mdash; and <b>never</b> from a header the client controls.';
eq('passthrough-real', MD.render(real), real);
eq('passthrough-rsquo', MD.render('the <b>confused-deputy</b> attack on attacker&rsquo;s scope.'), 'the <b>confused-deputy</b> attack on attacker&rsquo;s scope.');
eq('passthrough-3', MD.render('if RLS is <b>enabled but no policy matches</b>, Postgres returns <b>zero rows</b> &mdash; deny-by-default.'), 'if RLS is <b>enabled but no policy matches</b>, Postgres returns <b>zero rows</b> &mdash; deny-by-default.');
// mixed old HTML + new markdown
eq('mixed', MD.render('a <b>gate</b> plus **predicate** and `code`'), 'a <b>gate</b> plus <b>predicate</b> and <code>code</code>');
// code protects + escapes its content
eq('code-protect-md', MD.render('`a**b**c`'), '<code>a**b**c</code>');
eq('code-escape-lt', MD.render('`a<b & c>d`'), '<code>a&lt;b &amp; c&gt;d</code>');
eq('code-protect-dash', MD.render('`npm run -- x`'), '<code>npm run -- x</code>');
// non-emphasis punctuation untouched
eq('lone-star', MD.render('files *.js and *.ts here'), 'files *.js and *.ts here');
eq('arith-star', MD.render('a * b * c'), 'a * b * c');
eq('no-md', MD.render('plain sentence, nothing.'), 'plain sentence, nothing.');
eq('empty', MD.render(''), '');
eq('null', MD.render(null), '');
// bold spanning inline code, emphasis with punctuation
eq('bold-spans-code', MD.render('**use `x` now**'), '<b>use <code>x</code> now</b>');
eq('bold-punct', MD.render('(**scoped**), done'), '(<b>scoped</b>), done');
// idempotency (safe to render repeatedly)
['the **verified token** -- a `claim`', 'plain', "don't stop", 'a <b>gate</b> plus **x**'].forEach(function (c) {
  eq('idempotent:' + c.slice(0, 12), MD.render(MD.render(c)), MD.render(c));
});
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
