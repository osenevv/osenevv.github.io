---
type: concept
tags: [concept, retrieval, algorithms]
---
# HNSW

Hierarchical Navigable Small World — the approximate nearest-neighbour index behind most vector databases (FAISS, Qdrant, pgvector, Weaviate).

## Intuition
A stack of proximity graphs. The top layer has few nodes and long jumps; each layer below is denser. A query greedily walks toward the target on the top layer, then drops down and refines. Search is roughly logarithmic instead of linear.

## Knobs that matter
- `M` — edges per node. Higher means better recall and more memory.
- `ef_construction` — effort at build time.
- `ef_search` — effort at query time; the main recall/latency dial.

I used `usearch` (an HNSW implementation) in [[ZettelLinker]]. This site's index is small enough for exact search, which is the honest choice under ~10k vectors — see [[Vector Search]].
