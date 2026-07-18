# scripts/

Tooling that turns raw source material into content-collection entries.
Raw sources live in `data/raw/` and `ebooks/` — both gitignored, never
committed.

## Pipeline

1. **Flatten** an ebook to plain text for curation:

   ```
   node scripts/epub-to-text.mjs "ebooks/…/Book.epub" data/raw/author.txt
   ```

2. **Curate** in `scripts/manifest.json`: one entry per poem, giving the
   exact first and last lines as they appear in the raw text (plus optional
   `occurrence` when an anthology repeats a poem, `unwrap` for lines the
   epub wrapped mid-verse, `stripLineNumbers` for editions with marginal
   numbering, and `breaks` to restore stanza breaks lost in flattening).

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
