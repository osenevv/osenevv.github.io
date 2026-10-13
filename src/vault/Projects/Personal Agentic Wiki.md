---
type: project
order: 5
kind: AI agents
summary: Self-maintaining knowledge base where local AI agents triage incoming notes, discover missing connections across the graph, and keep active GTD boards in sync.
flow: Inbox Capture > Agentic Triage > Graph Entity Linking > Dataview Surface Sync > Verification Audits
proof: Local-first Markdown · Multi-agent system · Zero vendor lock-in · Powers this portfolio
usecase: Maintaining a personal knowledge repository of thousands of documents without manual filing overhead or broken links.
atwork: Structuring team wikis, knowledge bases, and operational boards where information rot and orphaned documents usually require hours of administrative maintenance.
tradeoff: Plain Markdown files over proprietary databases. Guarantees complete data sovereignty and zero vendor lock-in, requiring file-system operations and graph parsers instead of relational queries.
stack: Obsidian, Python, Dataview, Agentic Workflows, Markdown
tags: [project, agents, obsidian, local-first]
---
# Personal Agentic Wiki

A local-first second brain running in Obsidian where autonomous agents handle filing, structure, and synchronization. It unites GTD task boards, a [[Zettelkasten]] for concepts, learning review cycles, and project delivery dashboards.

## What the agents do
- **Inbox Triage** — Reads raw captures, transcripts, and source links, extracting actionable tasks and filing research notes into the correct domain folders.
- **Graph Connection** — Discovers semantic intersections between new entries and existing knowledge, generating bidirectional links with context notes.
- **Board Synchronization** — Keeps GTD Kanban boards and active project statuses aligned with actual file states without manual updates.
- **Evidence Retrieval** — Answers cross-vault queries by retrieving source citations first before generating conclusions (see [[RAG]]).

> [!quote] Design principle
> Agents write plain Markdown. If the AI systems are removed tomorrow, every note and link remains fully readable and functional.

This portfolio website is a direct public export of that architecture: sharing the same note conventions, link mechanics, and graph relationships.

Related: [[Agentic Workflows]], [[ZettelLinker]], [[Yapper]]
