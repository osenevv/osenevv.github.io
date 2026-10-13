---
type: concept
tags: [concept, retrieval]
---
# Embeddings

A model maps text to a fixed-length vector so that similar meanings land near each other. Everything in [[Vector Search]] depends on how good this mapping is for your domain.

## Notes from building with them
- Small models (MiniLM, 384 dims) are fast enough to run in a browser — this site does exactly that.
- Chunking decides quality more than model choice. Embed sections, not whole documents.
- Normalise vectors once; then cosine similarity is a dot product.
- Re-embed when the model changes. Vectors from different models are not comparable.

Used in [[ZettelLinker]], [[RAG]], [[How this vault works]].
