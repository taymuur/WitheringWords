# Withering Words

A minimalist, public poetry web app — a quiet place to read poems. Lots of
whitespace, serif type, a soft sepia palette, gentle motion only.

**Stack:** Astro 5 static site · content collections · Pagefind search ·
Web Audio-synthesized sound (no audio assets) · Cloudflare Pages.

## Reading experience

- One poem per page, typeset in EB Garamond at a comfortable measure.
- Wander by **mood** (`/moods/`), by **author**, by **search**, or let the
  day decide (`/today/`).
- Opt-in sound from the ♪ dock: typewriter titles, page-turn sounds on
  prev/next (or arrow keys), ambient birdsong/stream/rain — all
  synthesized in the browser — and read-aloud narration using the
  device's own voices.
- `prefers-reduced-motion` is respected throughout; nothing ever
  autoplays.

## Rights

Public-domain authors may appear in full. In-copyright authors appear as
short excerpts only (max ~8 lines), always credited and linked to the
book. This is enforced twice: the extraction tooling refuses longer
excerpts, and the content schema fails the build if an excerpt lacks its
source and "find the book" link. Raw source material (`ebooks/`,
`data/raw/`) is gitignored and never committed.

## Develop

```
npm install
npm run dev        # localhost:4321
npm run build      # static build + Pagefind index (search needs this)
npm run preview    # serve the built site
```

To add poems, see `scripts/README.md` — poems are sliced verbatim from
raw sources via a curated manifest, never transcribed from memory.
