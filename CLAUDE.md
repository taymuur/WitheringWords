# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Withering Words

A minimalist, public poetry web app. Aesthetic: quiet, reminiscing, unhurried — lots of whitespace, serif type, soft/sepia palette, gentle motion only.

## Hard rules

- EXCERPTS ONLY for in-copyright authors: max ~8 lines OR one short poem per work, always with title/author/translator + a "find the book" link. Never paste full copyrighted texts.
- Public-domain authors (Dickinson, Whitman, Hopkins, Shelley, Pushkin[old trans], Frost pre-1929) may show full short poems.
- Accessibility first: readable contrast, keyboard nav, prefers-reduced-motion respected.
- Ship minimal JS. Astro islands only where interaction is needed.
- `ebooks/`, `poetry-ebooks/`, `data/raw/`, and `*.epub|pdf|mobi` are gitignored raw source material. Never commit them or paste their contents into the site.

## Commands

- `npm run dev` — dev server at localhost:4321
- `npm run build` — static build to `dist/`, then Pagefind indexes it (search only works against a built site, not the dev server)
- `npm run preview` — serve the built `dist/`
- `npm run check` — astro check

## Architecture

Astro 5 static site (deploy target: Cloudflare Pages). No framework runtime ships by default; add React/vanilla islands only where interaction demands it.

Content is the core. Two collections defined in `src/content.config.ts` (Astro 5 glob loaders):

- `poems` — Markdown in `src/content/poems/`. Frontmatter: `title`, `author` (a `reference('authors')` — the author JSON filename slug), `rights: 'public-domain' | 'excerpt'`, optional `year`/`translator`/`source`/`findTheBook`/`moods`. The zod schema **enforces the copyright rule**: `rights: excerpt` fails the build without a `findTheBook` URL and a `source`. The poem text is the Markdown body; line breaks render via `white-space: pre-line` (`.poem-body`), so poems are written as plain lines with no double-spacing tricks.
- `authors` — JSON in `src/content/authors/`, keyed by slug (e.g. `emily-dickinson.json`), carrying `publicDomain: boolean` which governs what may be published for that author.

Pages resolve the author reference with `getEntry(poem.data.author)`. `src/pages/poems/[...id].astro` renders one poem (tagged `data-pagefind-body` — only poem pages are search-indexed) and shows the "find the book" line for excerpts.

Styling: single global stylesheet `src/styles/global.css` — CSS custom properties define the sepia palette (with a `prefers-color-scheme: dark` variant), the system serif stack, and the `--measure` reading width. All motion sits inside `@media (prefers-reduced-motion: no-preference)`.

`scripts/` holds (future) extraction tooling that turns raw sources in `data/raw/` into content-collection entries; see `scripts/README.md` for the intended pipeline.

Sound (all opt-in, persisted in localStorage, no audio assets): `src/lib/audio.ts` synthesizes everything with the Web Audio API — typewriter key clicks, page-turn swoosh, and birdsong/stream/rain ambience. `src/lib/narration.ts` wraps the browser's `speechSynthesis` voices, grouped female/male by name heuristic. `src/components/SoundDock.astro` is the UI plus the title-typewriter effect (visual part gated on `prefers-reduced-motion`; screen readers get the full title immediately). `Base.astro` includes Astro's `<ClientRouter />` so ambience keeps playing across page navigations and the page-turn sound fires on `astro:after-swap`. Audio can only start from a user gesture — never make sound autoplay.
