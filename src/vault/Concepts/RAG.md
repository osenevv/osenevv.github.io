---
type: concept
tags: [concept, retrieval, llm]
---
# RAG

Retrieval-augmented generation: a pipeline that fetches relevant passages from your documents first, then lets the LLM answer using them. It grounds answers in your own data and makes them citable.

## Where it breaks
- **Retrieval misses** — the right chunk never reaches the model. Fix with better chunking, hybrid search, reranking.
- **Context stuffing** — too many weak chunks dilute the good one.
- **No evaluation** — without a question set and expected sources, you can't tell if a change helped. See [[LLM Evaluation]].

## My stack
[[Embeddings]] → [[Vector Search]] (+ [[Full-text Search]] for exact terms) → rerank → LLM with citations back to note titles. Used across the [[Personal Agentic Wiki]].
