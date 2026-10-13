---
type: concept
tags: [concept, agents, llm]
---
# Agentic Workflows

LLMs that plan, call tools and act over multiple steps instead of answering once.

## How I build them
- Start with a fixed pipeline. Add autonomy only where a fixed step keeps failing.
- Tools get strict schemas and validated outputs — most agent bugs are tool-call bugs.
- Every agent writes to a format humans can read and fix (Markdown, SQL rows), never an opaque state blob.
- Evaluate step by step: see [[LLM Evaluation]].

## In my work
- Lead collection pipelines at [[Hegelmann Group]]
- Inbox triage and note writing in the [[Personal Agentic Wiki]]
- Structured memo extraction in [[Yapper]]
