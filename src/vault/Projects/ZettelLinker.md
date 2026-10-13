---
type: project
featured: true
order: 1
kind: AI search
summary: Reads your Obsidian vault, scores notes by semantic similarity, and suggests wikilinks you missed — all on-device, no API keys.
flow: Notes > local embeddings > similarity rank > suggested wikilinks > undoable write-back
proof: 0.38 ms median HNSW on 10k vectors (approx mode) · macOS, Windows, Linux · pytest suite · LangGraph pipeline
usecase: You have hundreds of notes and keep rewriting ideas you already wrote down. ZettelLinker finds the old note and links it, so your past work is reused instead of forgotten.
atwork: Connecting related wiki pages, docs and tickets, so people find existing work before they redo it.
tradeoff: Exact cosine by default, HNSW-style approximate index only for large vaults — under ~10k notes, exact is fast enough and never misses a match.
stack: Python, sentence-transformers, LangChain, LangGraph, usearch
image: /zettellinker-app.jpg
repo: github.com/osenevv/zettlellinker
tags: [project, retrieval, obsidian]
---
# ZettelLinker

A [[Zettelkasten]] is only as good as its links, and after a few hundred notes nobody remembers what they wrote two years ago. ZettelLinker finds those missing connections by meaning and writes wikilinks for you.

## What it does
- Suggests related notes by meaning, using local [[Embeddings]] — no internet, no API keys.
- Writes links inline (Obsidian `[[Target|phrase]]` syntax) when confidence is high, or under a `## Connections` heading otherwise.
- Audits the vault for ghost links, ambiguous links and orphan notes.
- Every write can be reverted with one click or `Cmd+Z`.
- **[Interactive GUI Snapshot Preview](/zettellinker-ui-snapshot.html)** — standalone web preview of the desktop application UI.

## How it's built
Scan, suggest and audit run as LangGraph state graphs, so the same pipeline drives the CLI, the desktop GUI and any LangChain code: discover notes → build the link graph → audit → embed and index → rank suggestions → optionally write.

**Unit tests:** pytest suite covering vault parsing, semantic ranking, writer/undo, LangChain adapters, CLI e2e and UI server routes — run in CI.

## Numbers
Default mode is **exact cosine** (fast enough for typical personal vaults). To validate enterprise-scale latency, I benchmarked **optional HNSW** on 10,000 synthetic 384-dimension vectors: **0.38 ms median, 0.61 ms p95** warm queries, 2.6 s index build, 13 ms index load. See [[HNSW]] and [[Vector Search]].

The "Similar topics" panel and the dashed lines in this site's graph are the same idea, running in your browser.

Related: [[Knowledge Graphs]], [[Personal Agentic Wiki]], [[Local-first]]
