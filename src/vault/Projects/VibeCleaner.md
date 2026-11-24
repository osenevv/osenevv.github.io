---
type: project
featured: true
order: 4
kind: AI security & evals
summary: Pre-ship security and anti-slop harness for AI-generated Python, TypeScript, and Supabase apps, pairing a local tree-sitter gate with semantic checks.
flow: Repo or PR diff > tree-sitter AST gate ($0, <1 s) > gemini-decision-1 checks > Fix Prompt & SARIF > agent autofix
proof: Layer 1 <1 s ($0) · 1.00 F1 / 0.00 FPR offline blind set · GitHub Action + SARIF · pytest + Hypothesis
usecase: You build with coding agents and want to catch leaked keys, missing Supabase RLS, open write routes, prompt injection, and AI code slop before pushing.
atwork: Automated PR security and quality gates in CI and agent hooks, with project rules that turn recurring review comments into hard checks.
tradeoff: Tree-sitter AST and regex checks run first at $0 and short-circuit critical hits, so the semantic model only inspects sliced route handlers and I/O functions.
stack: Python, tree-sitter, Gemini Decisions API, GitHub Actions, SARIF, pytest, Hypothesis
repo: github.com/osenevv/vibecleaner
tags: [project, security, evaluation, agents, cli, ast]
---
# VibeCleaner

VibeCleaner scans AI-generated Python, TypeScript, and Supabase apps before you deploy. A [[Local-first]] tree-sitter AST gate runs first, followed by atomic semantic checks that catch security bugs and AI code slop.

## What it does
- Runs deterministic tree-sitter AST and regex checks in under 1 second at $0. Layer 1 catches leaked secrets (with redaction), missing Supabase Row Level Security, wildcard CORS, silent exception handlers, god files, stuck state transitions, and 8 lanes of code and prose slop.
- Runs `gemini-decision-1` yes/no checks on sliced functions for missing auth, IDOR and client-trusted prices, prompt injection, stubbed logic, N+1 queries, and unvalidated boundary payloads. Without an API key, `--mode auto` falls back to a zero-network offline judge.
- Checks launch readiness (`vibecleaner preflight`, 42 read-only checks) and groups slop into 8 cleanup lanes (`vibecleaner deslop`, scored 0 to 100 across `dedupe`, `types`, `dead-code`, `cycles`, `weak-types`, `defensive-code`, `legacy`, and `ai-slop`).
- Stores team review corrections as deterministic Layer 1 pattern or import-boundary rules in `.vibecleaner/rules.json`, and assigns each PR to review tiers 1 to 4 by file risk and severity.
- Ships as a GitHub Action with SARIF 2.1.0 upload and an Antigravity plugin (`Stop` and `PostToolUse` hooks). Running `--autofix` hands a plain-English Fix Prompt to `claude`, `codex`, `gemini`, or `agy` and rejects edits that weaken or delete tests.

## How it's built
Function-level slicing sends only route handlers, server actions, tools, and I/O functions (plus a global auth summary) to Layer 2. On `--diff`, VibeCleaner judges only functions touching changed lines, caches results by `sha256` content hash, and skips Layer 2 when Layer 1 already flags a critical hit.

The CLI fails closed: missing paths, unknown git refs, failed Layer 2 requests, and broken rules files exit `2`, never `0`. It masks secret values in all reports and model payloads.

Tests run under `pytest` and `Hypothesis`. A benchmark script (`benchmarks/run_eval.py`) measures precision, recall, F1, false positive rate, and latency across labeled dev (30 cases), holdout (20 cases), and blind (24 cases) sets.

## Numbers
At threshold `0.75`, the offline judge reached **1.000 precision, 1.000 recall, 1.000 F1, and 0.000 FPR** on the dev (15+15), holdout (10+10), and blind (12+12) sets after fixes. First blind passes scored 0.720 F1 on holdout and 0.667 F1 on blind before tuning. You benchmark live `gemini-decision-1` accuracy with an API key via `--mode live --sweep`.

Related: [[LLM Evaluation]], [[Agentic Workflows]], [[Structured Outputs]], [[Local-first]]
