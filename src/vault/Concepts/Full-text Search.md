---
type: concept
tags: [concept, retrieval]
---
# Full-text Search

Keyword search with ranking — usually **BM25** over an inverted index. Each term gets a score from document frequency (rare terms matter more) and field length normalization (short titles beat long bodies for the same hit).

SQLite **FTS5** gives you this in a single file: tokenizers handle prefixes (`note*` matches `notes`), diacritics depend on config, and you can mix `MATCH` queries with relational filters in one transaction.

When to use it vs vectors:
- **FTS** — exact names, ticket IDs, error strings, acronyms.
- **Vectors** — paraphrases and “same idea, different words.”

[[Yapper]] indexes transcript chunks in FTS5 for grep-speed lookup. **This portfolio** runs in-browser **MiniLM embeddings** with exact cosine similarity (TF-IDF fallback if the model cannot load) — no BM25 reranker in the site bundle. **[[ZettelLinker]]** pairs exact cosine over sentence-transformer vectors with optional HNSW prefilters; production vaults often add BM25-style keyword paths for hybrid [[RAG]] coverage.
