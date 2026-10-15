---
type: tool
tags: [tool, retrieval]
---
# Match a job description

Paste a job post (bullets, a careers-page copy, or a public job URL). URLs are fetched via a text reader because browsers cannot open most job boards directly (CORS); matching still runs in your browser on the returned text. The matcher splits the post into requirements, drops benefits and company fluff, then checks each line against this vault.

```jd-match
```

## How matching works
- Each requirement is routed to the notes that are supposed to prove it — e.g. RAG → [[ZettelLinker]], evals → [[Outlier.AI]], agents → [[Hegelmann Group]], degrees → [[Charles University]].
- A note is only cited when its text literally supports the claim (language, model, tool, or proof phrase). No stretch citations.
- Results land in four buckets: **Direct Match** (shipped work), **Related Experience** (coursework, soft skills, tenure lines), **Fast Ramp** (engineering skills I can pick up, with a short counterpoint), **Out of Scope** (not in this portfolio).
- Embeddings power search elsewhere on the site; here they help rank chunks inside a route. Matching runs in your browser against this vault. If you paste a URL, only that public page is fetched (via a reader); the fit report itself is not uploaded. See [[How this vault works]] and [[Vector Search]].
