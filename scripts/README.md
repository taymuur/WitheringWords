# scripts/

Tooling for building the poem library. Raw source material (ebooks, scans,
plain-text dumps) lives in `data/raw/` and `ebooks/` — both gitignored, never
committed.

Intended pipeline:

1. Extract candidate poems from raw sources into structured drafts.
2. Check rights: public-domain authors → full short poems; in-copyright
   authors → max ~8 lines, with source + "find the book" link.
3. Emit Markdown into `src/content/poems/` and author records into
   `src/content/authors/` matching the schemas in `src/content.config.ts`
   (the schema itself rejects excerpts without source/link).
