---
type: concept
tags: [concept, retrieval]
---
# Vector Search

Find items by meaning instead of exact words: turn text into [[Embeddings]], then return the stored vectors closest to the query vector, usually by cosine similarity.

## In practice
- **Exact search** is fine up to tens of thousands of vectors — a matrix multiply.
- Beyond that, use an approximate index like [[HNSW]] and trade a little recall for a lot of speed.
- Pure vector search misses exact identifiers (error codes, names). Hybrid search with [[Full-text Search]] fixes that.

## Where I use it
- [[ZettelLinker]] — note-to-note similarity
- This site — the search box, "related notes", and [[Match a job description]]
- [[RAG]] pipelines in the [[Personal Agentic Wiki]]
