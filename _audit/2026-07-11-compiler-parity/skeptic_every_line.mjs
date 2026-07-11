#!/usr/bin/env node
/*
 * skeptic_every_line.mjs -- an INDEPENDENT check, written by the verifier, not the fixer.
 *
 * WHY THIS AND NOT prove_conservation.mjs:
 * prove_conservation's reference (scanSource) only fingerprints lines it RECOGNIZES as a field.
 * If the parser is blind to a construct AND scanSource is blind to the same construct, the two
 * agree on a lower number and conservation reports PASS while the author's content is gone.
 * That is the "second place for the same omission to hide" its own comment warns about
 * (conservation-scan.mjs:133-135).
 *
 * THIS check makes NO structural assumption. It takes EVERY authored line of every .md, and asks
 * one question: does this text appear ANYWHERE in the emitted data? A line does not have to land
 * in the right field -- it just has to EXIST. Anything that vanishes entirely is content the whole
 * apparatus (parser AND its reference) is blind to.
 *
 * Conservative in the same way LAW 2 is: a line is only judged if it has a substantial
 * alphanumeric run (>=25 chars) to fingerprint. Short/structural lines are un-fingerprintable and
 * are reported separately, never as failures.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

// CALIBRATION: a test that cannot fail proves nothing. PARSER_MODULE swaps in the PRE-FIX parser
// so this instrument must be shown to SCREAM on the old one before its PASS on the new one is
// worth anything.
const PARSER = process.env.PARSER_MODULE
  ? url.pathToFileURL(path.resolve(process.env.PARSER_MODULE)).href
  : '../../tools/compiler/parse_md.mjs';
const { parseMarkdown } = await import(PARSER);

const DIR = 'src/topics-md';
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');
const stripTags = (s) => String(s).replace(/<[^>]+>/g, ' ');
function flatten(o, acc = []) {
  if (o == null) return acc;
  if (typeof o === 'string') { acc.push(o); return acc; }
  if (typeof o !== 'object') return acc;
  if (Array.isArray(o)) { for (const v of o) flatten(v, acc); return acc; }
  for (const k of Object.keys(o)) flatten(o[k], acc);
  return acc;
}
// longest plain-alphanumeric run, so prose()/flow() markup injection cannot split it
function fingerprint(raw) {
  const runs = String(raw).split(/[^A-Za-z0-9 ]+/).map((s) => s.trim()).filter((s) => s.length >= 25);
  if (!runs.length) return null;
  runs.sort((a, b) => b.length - a.length);
  return norm(runs[0]).slice(0, 50);
}
const show = (s, n = 78) => JSON.stringify(String(s).slice(0, n))
  .replace(/[-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0').toUpperCase());

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).sort();
let judged = 0, lost = 0, skipped = 0;
const losses = [];

for (const f of files) {
  const src = fs.readFileSync(path.join(DIR, f), 'utf8');
  const parsed = parseMarkdown(src, { index: 1, total: files.length });
  const leaves = flatten(parsed);
  const flatRaw = norm(leaves.join(' '));
  const flatStripped = norm(leaves.map(stripTags).join(' '));
  const survives = (fp) => flatRaw.includes(fp) || flatStripped.includes(fp);

  const lines = src.split('\n');
  let fmSeen = 0, inFm = false, sawH2 = false;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const ln = i + 1;
    // front matter: id/title/etc are metadata, not authored prose -- excluded, they are
    // separately proven by the schema validator (a missing id fails the build outright).
    if (/^---\s*$/.test(t) && fmSeen < 2 && !sawH2) { fmSeen++; inFm = fmSeen === 1; continue; }
    if (inFm) continue;
    if (/^## /.test(t)) sawH2 = true;
    if (!t) continue;
    if (/^```/.test(t)) continue;               // the fence MARKER carries no text; its BODY is a line like any other and IS judged
    const fp = fingerprint(t);
    if (!fp) { skipped++; continue; }           // nothing substantial to fingerprint
    judged++;
    if (!survives(fp)) { lost++; losses.push({ f, ln, text: t }); }
  }
}

console.log('EVERY-LINE SURVIVAL -- an independent check (no structural assumptions)');
console.log('reference: every authored line of all %d topics. question: does its text exist ANYWHERE in the emitted data?\n', files.length);
console.log('  lines judged (fingerprintable): %d', judged);
console.log('  lines with no trace in output : %d', lost);
console.log('  lines too short to fingerprint: %d  (not judged, never failures)', skipped);

if (lost) {
  console.log('\nCONTENT THAT VANISHES ENTIRELY:');
  const byFile = {};
  losses.forEach((l) => { (byFile[l.f] ??= []).push(l); });
  for (const [f, list] of Object.entries(byFile)) {
    console.log('  %s: %d', f, list.length);
    list.slice(0, 3).forEach((l) => console.log('      %s:%d  %s', l.f, l.ln, show(l.text)));
  }
}
console.log('\n' + '='.repeat(64));
console.log(lost ? 'EVERY-LINE: FAIL -- ' + lost + ' authored line(s) exist in no field of the output.'
                 : 'EVERY-LINE: PASS -- every fingerprintable authored line survives into the data.');
process.exit(lost ? 1 : 0);
