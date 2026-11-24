---
type: project
featured: true
order: 4
kind: AI security & evals
summary: Turns messy AI-generated repos into production-ready code. Deletes provable code and UI slop, probes live behavior, and repairs bugs on isolated git worktrees.
flow: Vibe-coded repo > <1 s tree-sitter gate ($0) > multi-judge semantic audit > Docker & browser probes > worktree-isolated autofix
proof: <1 s local AST gate ($0) · <$0.001/PR semantic audit · 74-case eval (1.00 F1 / 0.00 FPR offline) · worktree fixer + tamper guard
usecase: A novice or coding agent built an app in a weekend, leaving a tangle of stubbed routes, silent failures, broken auth, UI slop, and dead code. VibeCleaner finds what breaks in production and fixes the repo on an isolated branch.
atwork: Turns fragile AI-generated PRs and prototypes into maintainable, production-ready code without burning senior engineering hours on manual cleanup.
tradeoff: Deterministic AST and regex passes run first for $0 and delete provable slop without touching public APIs. Semantic judges inspect sliced route handlers and I/O functions, keeping a typical PR diff under $0.001.
stack: Python, tree-sitter, Docker, Playwright, Multi-Judge Decision APIs, GitHub Actions, SARIF, pytest, Hypothesis
repo: github.com/osenevv/vibecleaner
tags: [project, security, evaluation, agents, cli, ast]
---
# VibeCleaner

Vibe-coding gets a prototype working in an afternoon, then leaves behind a broken mess: god files mixing SQL and HTTP, silent exception handlers, stubbed routes, broken auth, N+1 queries, UI slop, and piles of dead code. A novice cannot tell what will break under real users, and dumping the whole repo into an LLM burns tokens without fixing root causes.

I built VibeCleaner as a pre-ship cleanup, security, and repair harness for AI-generated repositories. It audits Python, TypeScript, JavaScript, HTML/CSS, and SQL, runs project tests in Docker across Python, Node, Go, Rust, and JVM, and repairs failing code on isolated git worktrees.

## How it turns a mess into production code
- Removes provable slop in one pass. Layer 1 parses ASTs with tree-sitter in under 1 second for $0, flagging god files, silent catches, stuck retries, weak types, dead code, circular imports, missing Supabase RLS, and leaked keys. Running `vibecleaner fix .` deletes provable code, prose, and UI residue (debug leftovers, AI comment tics, unused privates, duplicate bodies, lorem text, redundant glass/gradients) with per-rule revert checkpoints and intact public APIs.
- Catches logic bugs that break in production. Layer 2 slices changed route handlers, server actions, tools, and I/O functions (with a global auth summary) and routes zero-output-token yes/no checks across Gemini, OpenAI Decisions, Perplexity, Liquid, Cloudflare, Azure OpenAI, or Laya. It flags unauthenticated writes, client-trusted prices, prompt injection, stubbed handlers, unbounded queries, and unvalidated payloads at under $0.001 per PR diff, caching unchanged functions by `sha256` hash. Repos without an API key fall back to a zero-network offline judge.
- Repairs and verifies on isolated git worktrees. Running `vibecleaner start .` runs the static scan, executes the repo's own test, lint, and type checks in Docker, and runs localhost HTTP and Playwright desktop/mobile layout probes. When a gate fails, it snapshots tests, config, and public signatures, repairs code in a separate worktree with a tamper guard, jury review, and repeat-diff stopping, and commits passing fixes to a clean branch.
- Locks in fixes so agents stop repeating mistakes. One CLI command turns a recurring review catch into a deterministic Layer 1 pattern or import-boundary rule in `.vibecleaner/rules.json`. The same engine plugs into GitHub Actions (with SARIF upload) and coding-agent hooks (`Stop` and `PostToolUse`), while review tiers 1 to 4 route high-risk auth, billing, and migration diffs to human reviewers.

## Eval rigor
Most LLM-judge tools ship on vibes. I built a 74-case labeled eval harness across separate dev (30), holdout (20), and blind (24) sets, backed by a `pytest` and `Hypothesis` test suite and fail-closed exit contracts (missing paths, bad git refs, or failed API calls exit `2`, never `0`).

First blind passes scored 0.720 F1 on holdout and 0.667 F1 on blind. After fixing those failure modes, the zero-network offline judge hit 1.000 precision, 1.000 recall, 1.000 F1, and 0.000 FPR across all three sets at threshold `0.75`. Teams with an API key tune live judge thresholds via `--mode live --sweep`.

Related: [[LLM Evaluation]], [[Agentic Workflows]], [[Structured Outputs]], [[Local-first]]
