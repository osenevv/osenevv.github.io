---
type: concept
tags: [concept, evaluation, llm]
---
# LLM Evaluation

Measuring whether a model or an LLM system actually does the job — and catching when a change makes it worse.

## What I've learned doing it at scale
- **Categorise failures**, don't just score them. "Wrong tool argument" and "hallucinated fact" need different fixes.
- **Rubrics beat vibes.** A good rubric makes two reviewers agree.
- **Automate the boring 80%** — schema checks, tool-call validation, reference matching — and keep humans for judgement calls.
- **Agents fail in the middle.** Multi-step tasks need step-level checks, not just final-answer grading.

From [[Outlier.AI]]: post-training reasoning alignment, reference code targets, and chain-of-thought verification for frontier models.

Related: [[RAG]], [[Agentic Workflows]]
