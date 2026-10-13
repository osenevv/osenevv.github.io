---
type: concept
tags: [concept, agents, llm]
---
# Structured Outputs

Constraining a language model so its output always matches a strict schema (JSON Schema or Pydantic models) instead of hoping it does.

## Why asking nicely fails
"Please return valid JSON" works most of the time — which means in an automated pipeline it fails regularly. One trailing comma or invented key and the next step breaks.

## How production systems handle it
- **Constrained decoding:** the schema becomes a grammar applied at generation time, so tokens that would break it can't be produced.
- **Validate at the boundary:** every tool call and extraction is checked against a typed model before application code touches it.
- **Fail fast and drop:** if output is truncated or invalid, discard it rather than regex-patching a half-object.

## In my work
- In [[Yapper]], every task and memory comes back through a schema and must quote the transcript; anything that fails validation is dropped, so nothing the model made up reaches the user.
- In [[Agentic Workflows]], tools take typed arguments and enums rather than free text.

Related: [[Agentic Workflows]], [[LLM Evaluation]], [[Yapper]]
