#!/usr/bin/env node
/**
 * Flatten an epub into one plain-text file for curation.
 *
 *   node scripts/epub-to-text.mjs <file.epub> <out.txt>
 *
 * Unzips the epub, strips HTML from its documents in filename order, and
 * concatenates the result. Output goes to data/raw/ (gitignored) — this is
 * source material, never site content.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [epub, out] = process.argv.slice(2);
if (!epub || !out) {
  console.error('usage: node scripts/epub-to-text.mjs <file.epub> <out.txt>');
  process.exit(1);
}

const listing = execFileSync('unzip', ['-Z1', epub], { encoding: 'utf8' });
const docs = listing
  .split('\n')
  .filter((f) => /\.(x?html?|htm)$/i.test(f))
  .sort();

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(m|n)dash;/g, (_, m) => (m === 'm' ? '—' : '–'))
    .replace(/&(l|r)squo;/g, (_, m) => (m === 'l' ? '‘' : '’'))
    .replace(/&(l|r)dquo;/g, (_, m) => (m === 'l' ? '“' : '”'))
    .replace(/&hellip;/g, '…');

const toText = (html) =>
  decode(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<(br|\/p|\/h[1-6]|\/div|\/li|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, '')
  )
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

let text = '';
for (const doc of docs) {
  const html = execFileSync('unzip', ['-p', epub, doc], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  text += `\n\n===== ${doc} =====\n\n${toText(html)}`;
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`${docs.length} documents → ${out} (${(text.length / 1024).toFixed(0)} KB)`);
