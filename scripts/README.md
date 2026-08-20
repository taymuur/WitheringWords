# scripts/

Tooling that turns raw source material into content-collection entries.
Raw sources live in `data/raw/` and `ebooks/` — both gitignored, never
committed.

## Pipeline

0. **Fetch** the public-domain source volumes (a fresh checkout has none —
   `data/raw/` is gitignored):

   ```
   node scripts/fetch-sources.mjs [name …]
   ```

   `scripts/sources.json` lists every volume with its Project Gutenberg
   text (via the GITenberg mirrors), so any poem sliced from them can be
   re-derived from scratch. Add new volumes there rather than by hand.

1. **Flatten** an ebook to plain text for curation (for local `ebooks/`
   material; Gutenberg sources are already plain text):

   ```
   node scripts/epub-to-text.mjs "ebooks/…/Book.epub" data/raw/author.txt
   ```

2. **Curate** in `scripts/manifest.json`: one entry per poem, giving the
   exact first and last lines as they appear in the raw text. Optional
   keys, each for a specific way editions mangle verse:

   | key | for |
   | --- | --- |
   | `occurrence` / `endOccurrence` | anthologies that print a poem (or a refrain) more than once |
   | `unwrap` | long lines the edition wrapped mid-verse |
   | `breaks` | stanza breaks lost in flattening |
   | `stripLineNumbers` | editions with marginal line numbers |
   | `stripVerseNumbers` | editions numbering verses at line start (`13. My heart…`) |
   | `paragraphs` | prose-poetry hard-wrapped to the page, verses split by blank lines (Gitanjali, The Prophet) |
   | `stripPageMarkers` | scans carrying inline page numbers (`{22}`) and `*****` section rules |

   Retyping a start/end line by hand invites typos; read it out of the
   source instead (`sed -n '949p' data/raw/yeats-reeds.txt`).

3. **Extract**:

   ```
   node scripts/extract-poems.mjs [slug …]
   ```

   Poem text is sliced verbatim from the raw source — never transcribed
   from memory. The script refuses `rights: excerpt` entries longer than
   8 lines (the copyright hard rule), and the content schema then requires
   `findTheBook` + `source` for any excerpt.

Rights review stays manual: only add full poems for public-domain
authors/works (`publicDomain` flag on the author record; for authors like
Frost, check the individual work's publication date).
