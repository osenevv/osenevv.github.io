---
type: writing
date: 2026-10-07
tags: [writing, meta]
---
# How this vault works

This portfolio is a folder of Markdown notes rendered like Obsidian. No CMS, no backend, no database server.

## Build time
- Notes are plain `.md` files with frontmatter.
- [[Wikilinks]] are parsed into a link graph; backlinks and the [[Knowledge Graphs|graph view]] come from it.

## In your browser
- Each note is split into chunks by heading.
- A small sentence-embedding model (all-MiniLM-L6-v2, quantised, ~23 MB) loads once and is cached by the browser.
- Chunks become 384-dimensional [[Embeddings]] held in memory — a tiny vector database.
- Search, "related notes" and [[Match a job description]] all run exact cosine [[Vector Search]] over that index.
- If the model can't load, it falls back to TF-IDF vectors, so search still works offline.

## Why it's built this way
It costs nothing to host, it's fast, and it demonstrates the thing I do instead of describing it. It's also [[Local-first]]: your query never hits a server.

## Writing notes so JD match stays honest
Search and [[Match a job description]] cite whatever text is in a note. Rules that keep cites clean:

1. **Positive scope only** — say what the note *is* (e.g. “C# esolang interpreter”, “voice → text with Whisper”). Do not list foreign skills even to deny them (`not C++`, `no YOLO`); those tokens still match.
2. **One home per skill** — Matfyz languages / vision / video search live under [[Charles University]] (and [[Contact Manager]] for C++ coursework). Product notes own only their shipped stack.
3. **Coursework vs production** — class projects stay `kind: Coursework` / unfeatured so they can be Related, not Direct Match.
4. **Point sideways with links** — “see [[Charles University]]” is enough; don’t paste the other note’s keywords here.

Next on the list: an optional "ask the vault" chat using [[RAG]] behind a rate-limited serverless function.
