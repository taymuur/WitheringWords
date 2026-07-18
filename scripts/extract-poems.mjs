#!/usr/bin/env node
/**
 * Extract curated poems from flattened raw texts into content entries.
 *
 *   node scripts/extract-poems.mjs [slug ...]
 *
 * Reads scripts/manifest.json. Each entry names a raw text file in data/raw/
 * and the exact first and last lines of the poem; the poem text is sliced
 * verbatim from the source, so nothing is transcribed from memory. Entries
 * with rights: 'excerpt' are refused if they exceed MAX_EXCERPT_LINES —
 * the copyright hard rule, enforced before the zod schema ever sees them.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_EXCERPT_LINES = 8;
const root = new URL('..', import.meta.url).pathname;
const manifest = JSON.parse(readFileSync(join(root, 'scripts/manifest.json'), 'utf8'));

const only = process.argv.slice(2);
const rawCache = new Map();
let written = 0;

for (const poem of manifest.poems) {
  if (only.length && !only.includes(poem.slug)) continue;

  if (!rawCache.has(poem.raw)) {
    rawCache.set(poem.raw, readFileSync(join(root, 'data/raw', poem.raw), 'utf8').split('\n'));
  }
  const lines = rawCache.get(poem.raw);

  const norm = (s) => (poem.stripLineNumbers ? s.trim().replace(/\s+\d+$/, '') : s.trim());
  const matches = (needle) =>
    lines.reduce((hits, line, i) => (norm(line) === needle ? [...hits, i] : hits), []);

  const starts = matches(poem.start);
  const ends = matches(poem.end);
  // Anthologies can contain a poem more than once; `occurrence` (1-based)
  // picks which copy, and must be given explicitly when there are several.
  const nth = poem.occurrence ?? (starts.length === 1 ? 1 : NaN);
  if (!starts[nth - 1] || ends.length < 1) {
    throw new Error(
      `${poem.slug}: start matched ${starts.length}x (occurrence: ${poem.occurrence ?? 'unset'}), end matched ${ends.length}x in ${poem.raw}`
    );
  }
  const start = starts[nth - 1];
  // `endOccurrence` (1-based, among matches at/after start) covers poems
  // whose closing line is a refrain repeated mid-poem.
  const end = ends.filter((i) => i >= start)[(poem.endOccurrence ?? 1) - 1];
  if (end === undefined) throw new Error(`${poem.slug}: end line not found after start`);

  // The flattened epubs put a blank line after every verse line and lose
  // stanza breaks, so: drop blanks, then re-apply structure from the manifest.
  let poemLines = lines
    .slice(start, end + 1)
    .map((l) => l.trim())
    .filter(Boolean);

  // Editions that print marginal line numbers ("...fold, fallow, and plough;   5")
  if (poem.stripLineNumbers) {
    poemLines = poemLines.map((l) => l.replace(/\s+\d+$/, ''));
  }

  // Long lines the epub wrapped mid-verse: join each named line with the next.
  for (const frag of poem.unwrap ?? []) {
    const i = poemLines.findIndex((l) => l === frag);
    if (i === -1 || i + 1 >= poemLines.length) {
      throw new Error(`${poem.slug}: unwrap line not found: ${frag}`);
    }
    poemLines.splice(i, 2, `${poemLines[i]} ${poemLines[i + 1]}`);
  }

  const poemLineCount = poemLines.length;

  // Stanza breaks (1-based line indexes to break after), lost in flattening.
  for (const [n, at] of (poem.breaks ?? []).entries()) {
    poemLines.splice(at + n, 0, '');
  }
  const body = poemLines.join('\n');
  if (poem.rights === 'excerpt' && poemLineCount > MAX_EXCERPT_LINES) {
    throw new Error(
      `${poem.slug}: excerpt is ${poemLineCount} lines; hard rule allows max ${MAX_EXCERPT_LINES}`
    );
  }

  const fm = [
    '---',
    `title: ${JSON.stringify(poem.title)}`,
    `author: ${poem.author}`,
    ...(poem.year ? [`year: ${poem.year}`] : []),
    ...(poem.translator ? [`translator: ${JSON.stringify(poem.translator)}`] : []),
    ...(poem.source ? [`source: ${JSON.stringify(poem.source)}`] : []),
    `rights: ${poem.rights}`,
    ...(poem.findTheBook ? [`findTheBook: ${JSON.stringify(poem.findTheBook)}`] : []),
    ...(poem.moods?.length ? ['moods:', ...poem.moods.map((m) => `  - ${m}`)] : []),
    '---',
  ].join('\n');

  writeFileSync(join(root, 'src/content/poems', `${poem.slug}.md`), `${fm}\n${body}\n`);
  written += 1;
  console.log(`✓ ${poem.slug} (${poemLineCount} lines)`);
}

console.log(`${written} poem(s) written to src/content/poems/`);
