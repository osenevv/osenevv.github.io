---
type: project
featured: true
order: 4
kind: AI security & evals
summary: Pre-ship security and anti-slop harness for AI-generated Python, TypeScript, and Supabase apps — fast local tree-sitter gate plus atomic semantic checks (CLI alias vibeguard).
flow: Repo or PR diff > tree-sitter AST gate ($0, <1 s) > gemini-decision-1 checks > Fix Prompt & SARIF > agent autofix
proof: Layer 1 <1 s ($0) · 1.00 F1 / 0.00 FPR offline blind benchmark · GitHub Action + SARIF · pytest + Hypothesis
usecase: You ship code with coding agents and want to catch leaked secrets, missing Supabase RLS, unauthenticated write routes, prompt injection, and AI code slop before pushing.
atwork: Automated PR security and quality gating in CI and agent hooks, with deterministic project rules that turn recurring code-review corrections into hard checks.
tradeoff: Two-layer design — deterministic tree-sitter AST and regex checks run first at $0 and short-circuit critical hits, so the semantic judge only inspects sliced route handlers and I/O functions.
stack: Python, tree-sitter, Gemini Decisions API, GitHub Actions, SARIF, pytest, Hypothesis
repo: github.com/osenevv/vibecleaner
tags: [project, security, evaluation, agents, cli, ast]
---
# VibeCleaner

Pre-ship security and anti-slop scanner for AI-generated Python, TypeScript, and Supabase apps (also installed under the `vibeguard` CLI alias). It pairs a fast, [[Local-first]] tree-sitter AST gate with atomic semantic checks to catch vulnerabilities and AI code slop before deploy.

## What it does
- **Two-layer scanning** — Layer 1 runs deterministic tree-sitter AST and regex detectors in under 1 second at $0 (leaked secrets with automatic redaction, missing Supabase Row Level Security, wildcard CORS, silent exception handlers, god files, stuck state transitions, and 8 lanes of code/prose slop). Layer 2 runs `gemini-decision-1` atomic yes/no checks on sliced functions for missing auth, IDOR / client-trusted prices, prompt injection, stubbed logic, N+1 queries, and unvalidated boundary payloads — or falls back to a zero-network offline judge when no API key is set.
- **Launch preflight & deslop** — `vibecleaner preflight` runs 42 read-only launch checks; `vibecleaner deslop` groups slop into 8 cleanup lanes (`dedupe`, `types`, `dead-code`, `cycles`, `weak-types`, `defensive-code`, `legacy`, `ai-slop`) with a 0–100 score.
- **Project rules & review routing** — Turn recurring code-review corrections into deterministic Layer 1 pattern or import-boundary rules (`.vibecleaner/rules.json`), and route PRs into review tiers 1–4 by file risk and severity.
- **CI & agent hooks** — Ships as a GitHub Action with SARIF 2.1.0 upload, an Antigravity plugin (`Stop` and `PostToolUse` hooks), and `--autofix` that hands a plain-English Fix Prompt to `claude`, `codex`, `gemini`, or `agy` and rejects edits that weaken or delete tests.

## How it's built
- **Token & cost controls**: Function-level slicing sends only route handlers, server actions, tools, and I/O functions (plus a global auth-context summary) to Layer 2. On `--diff`, only functions overlapping changed lines are judged; results are cached by `sha256` content hash, and critical Layer 1 hits short-circuit Layer 2.
- **Fail-closed contract**: Missing paths, unknown git refs, failed Layer 2 requests, or invalid rules files exit `2`, never `0`. Secret values are masked in all reports and model payloads.
- **Testing & evals**: Automated `pytest` + `Hypothesis` test suite plus a dedicated benchmark harness (`benchmarks/run_eval.py`) measuring case-level precision, recall, F1, FPR, and latency across labeled dev (30 cases), holdout (20 cases), and blind (24 cases) sets.

## Numbers
On the zero-network offline judge at threshold `0.75`, the scanner reached **1.000 precision, 1.000 recall, 1.000 F1, and 0.000 FPR** across the dev (15+15), holdout (10+10), and blind (12+12) sets after iterative fixes (initial blind runs surfaced 0.720 holdout F1 and 0.667 blind F1 before tuning). Live `gemini-decision-1` accuracy requires an API key and is evaluated via `--mode live --sweep`.

Related: [[LLM Evaluation]], [[Agentic Workflows]], [[Structured Outputs]], [[Local-first]]
