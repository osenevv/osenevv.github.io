---
type: project
featured: true
order: 4
kind: AI security & evals
summary: Turns messy AI-generated repos into production-ready code. Finds structural bugs, broken auth, and code slop, then runs a tamper-guarded autofix loop to clean them up.
flow: Vibe-coded repo > <1 s tree-sitter gate ($0) > semantic bug & slop audit > plain-English Fix Prompt > tamper-guarded autofix
proof: <1 s local AST gate ($0) · <$0.001/PR semantic audit · 74-case eval (1.00 F1 / 0.00 FPR offline) · closed-loop autofix
usecase: A novice or coding agent built an app in a weekend, leaving a tangle of stubbed routes, silent failures, broken auth, and dead code. VibeCleaner finds what breaks in production and drives the fixes.
atwork: Turns fragile AI-generated PRs and prototypes into maintainable, production-ready code without burning senior engineering hours on manual cleanup.
tradeoff: Tree-sitter AST checks run first for $0 and handle structural slop and hard bugs. The semantic model inspects sliced route handlers and I/O functions, keeping a typical PR diff under $0.001.
stack: Python, tree-sitter, Gemini Decisions API, GitHub Actions, SARIF, pytest, Hypothesis
repo: github.com/osenevv/vibecleaner
tags: [project, security, evaluation, agents, cli, ast]
---
# VibeCleaner

Vibe-coding gets a prototype working in an afternoon, then leaves behind a broken mess: god files mixing SQL and HTTP, silent exception handlers, stubbed production paths, open write routes, N+1 queries, and piles of dead code. A novice cannot tell what will break under real users, and dumping the whole repo into an LLM burns tokens without fixing root causes.

I built VibeCleaner as a pre-ship cleanup and security harness that turns AI-generated Python, TypeScript, and Supabase repos into production-ready code. It pairs a sub-second [[Local-first]] tree-sitter pass with targeted semantic checks and an agent autofix loop.

## How it turns a mess into production code
- Cleans up structural slop in one pass. Layer 1 parses ASTs with tree-sitter in under 1 second for $0, flagging god files, silent catches, stuck retry loops, weak types, dead code, circular imports, missing Supabase RLS, and leaked keys. Running `vibecleaner deslop` groups findings into 8 cleanup lanes with a 0 to 100 health score, and `vibecleaner preflight` runs 42 launch-readiness checks.
- Catches logic bugs that break in production. Layer 2 slices changed route handlers, server actions, tools, and I/O functions (with a global auth summary) and sends them to `gemini-decision-1` with zero output tokens. It flags unauthenticated writes, client-trusted prices, prompt injection, stubbed handlers, unbounded queries, and unvalidated payloads at under $0.001 per PR diff, caching unchanged functions by `sha256` hash. Repos without an API key fall back to a zero-network offline judge.
- Fixes the code in a closed loop with a tamper guard. Running `--autofix` turns findings into a plain-English Fix Prompt, hands it to `claude`, `codex`, `gemini`, or `agy`, re-scans the diff, and rejects any edit that weakens or deletes tests. The same engine runs in GitHub Actions (with SARIF upload) and coding-agent hooks (`Stop` and `PostToolUse`).
- Locks in fixes so agents stop repeating mistakes. One CLI command turns a recurring review catch into a deterministic Layer 1 pattern or import-boundary rule in `.vibecleaner/rules.json`, while review tiers 1 to 4 route high-risk auth, billing, and migration diffs to human reviewers.

## Eval rigor
Most LLM-judge tools ship on vibes. I built a 74-case labeled eval harness across separate dev (30), holdout (20), and blind (24) sets, backed by a `pytest` and `Hypothesis` test suite and fail-closed exit contracts (missing paths, bad git refs, or failed API calls exit `2`, never `0`).

First blind passes scored 0.720 F1 on holdout and 0.667 F1 on blind. After fixing those failure modes, the zero-network offline judge hit 1.000 precision, 1.000 recall, 1.000 F1, and 0.000 FPR across all three sets at threshold `0.75`. Teams with an API key tune live `gemini-decision-1` thresholds via `--mode live --sweep`.

Related: [[LLM Evaluation]], [[Agentic Workflows]], [[Structured Outputs]], [[Local-first]]
