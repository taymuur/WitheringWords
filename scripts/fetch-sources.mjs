#!/usr/bin/env node
/**
 * Re-fetch the public-domain source volumes listed in sources.json into
 * data/raw/, so extract-poems.mjs can slice from them.
 *
 * data/raw/ is gitignored (raw source material never belongs in the repo),
 * which means a fresh checkout has no sources at all. Run this first:
 *
 *   node scripts/fetch-sources.mjs          # all volumes
 *   node scripts/fetch-sources.mjs blake    # just the ones whose raw name matches
 *
 * Texts come from Project Gutenberg via the GITenberg mirrors, shallow-cloned
 * into a scratch directory, then normalised to UTF-8 under data/raw/.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { sources } = JSON.parse(readFileSync(join(root, 'scripts/sources.json'), 'utf8'));
const only = process.argv.slice(2);
const wanted = only.length
  ? sources.filter((s) => only.some((o) => s.raw.includes(o)))
  : sources;

if (!wanted.length) {
  console.error(`No sources matched ${only.join(', ')}`);
  process.exit(1);
}

mkdirSync(join(root, 'data/raw'), { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), 'ww-sources-'));

for (const src of wanted) {
  const dir = join(scratch, src.raw.replace('.txt', ''));
  execFileSync(
    'git',
    ['clone', '--quiet', '--depth', '1', `https://github.com/${src.repo}`, dir],
    { stdio: ['ignore', 'ignore', 'inherit'], env: { ...process.env, GIT_LFS_SKIP_SMUDGE: '1' } }
  );
  // Project Gutenberg ships some volumes as ISO-8859-1; the extractor reads UTF-8.
  const bytes = readFileSync(join(dir, src.file));
  const text = bytes.toString(src.encoding === 'iso-8859-1' ? 'latin1' : 'utf8');
  writeFileSync(join(root, 'data/raw', src.raw), text, 'utf8');
  console.log(`✓ ${src.raw.padEnd(20)} ${src.title}`);
}

rmSync(scratch, { recursive: true, force: true });
console.log(`${wanted.length} source volume(s) in data/raw/`);
