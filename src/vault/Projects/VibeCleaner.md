---
type: project
featured: true
order: 4
kind: AI security & evals
summary: Stops AI-generated apps from shipping leaked keys, broken auth, or code slop. Pairs a sub-second local tree-sitter gate with under-$0.001/PR semantic checks.
flow: Repo or PR diff > tree-sitter AST gate ($0, <1 s) > gemini-decision-1 checks > Fix Prompt & SARIF > tamper-guarded autofix
proof: <1 s local AST gate ($0) · <$0.001/PR semantic checks · 74-case eval (1.00 F1 / 0.00 FPR offline) · GitHub Action + agent hooks
usecase: Your team ships with coding agents and wants to block leaked keys, missing Supabase RLS, client-trusted prices, and AI slop before code hits main.
atwork: Cuts senior review load on AI-heavy PRs by gating deterministic bugs at $0, routing high-risk files to humans, and turning repeated review comments into permanent rules.
tradeoff: Tree-sitter AST checks run first for $0 and short-circuit critical hits. The semantic model inspects sliced route handlers and I/O functions, keeping a typical PR diff under $0.001.
stack: Python, tree-sitter, Gemini Decisions API, GitHub Actions, SARIF, pytest, Hypothesis
repo: github.com/osenevv/vibecleaner
tags: [project, security, evaluation, agents, cli, ast]
---
# VibeCleaner

Coding agents write features in minutes, and they ship the same bugs over and over: exposed API keys, Supabase tables with no Row Level Security, open write routes, client-trusted prices, and dead code. Running a frontier LLM over a whole repo on every PR burns tokens and misses deterministic checks.

I built VibeCleaner as a pre-ship security and anti-slop harness for Python, TypeScript, and Supabase repos. It pairs a sub-second [[Local-first]] tree-sitter gate with targeted semantic checks and an agent autofix loop.

## What makes it work
- Deterministic checks run before any model call. Layer 1 parses ASTs with tree-sitter in under 1 second for $0, catching leaked secrets (with redaction), missing Supabase RLS, wildcard CORS, stuck retries, and 8 categories of code and prose slop. Any critical hit short-circuits Layer 2.
- Token spend stays under $0.001 per PR diff. Layer 2 slices changed route handlers, server actions, tools, and I/O functions (with a global auth summary) and sends them to `gemini-decision-1` with zero output tokens. A `sha256` content-hash cache keeps unchanged functions at $0, and repos without an API key fall back to a zero-network offline judge.
- Fixes run in a closed loop with a tamper guard. VibeCleaner plugs into GitHub Actions (with SARIF upload) and coding-agent hooks (`Stop` and `PostToolUse`). Running `--autofix` passes a plain-English Fix Prompt to `claude`, `codex`, `gemini`, or `agy`, re-scans the diff, and rejects any edit that weakens or deletes tests.
- Review comments compound into hard checks. One CLI command turns a recurring PR mistake into a deterministic Layer 1 pattern or import-boundary rule in `.vibecleaner/rules.json`, while review tiers 1 to 4 route risky auth, billing, and migration diffs to human reviewers.

## Eval rigor
Most LLM-judge tools ship on vibes. I built a 74-case labeled eval harness across separate dev (30), holdout (20), and blind (24) sets, backed by a `pytest` and `Hypothesis` test suite and fail-closed exit contracts (missing paths, bad git refs, or failed API calls exit `2`, never `0`).

First blind passes scored 0.720 F1 on holdout and 0.667 F1 on blind. After fixing those failure modes, the zero-network offline judge hit 1.000 precision, 1.000 recall, 1.000 F1, and 0.000 FPR across all three sets at threshold `0.75`. Teams with an API key tune live `gemini-decision-1` thresholds via `--mode live --sweep`.

Related: [[LLM Evaluation]], [[Agentic Workflows]], [[Structured Outputs]], [[Local-first]]
