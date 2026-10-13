---
type: concept
tags: [concept, privacy]
---
# Local-first

Software where **your device owns the data** and the network is optional sync, not the source of truth. Privacy follows from architecture: if audio never leaves the laptop, there is no retention policy to negotiate.

Trade-offs I care about in practice:
- **Offline** — read and search notes on a plane; sync catches up later.
- **Latency** — no round trip for every query; embeddings and STT run where the files already live.
- **Sync** — when needed, explicit export/import or git beats opaque cloud mirrors; CRDTs matter for multi-device editors, less for personal vaults.

Applied in [[Yapper]] (on-device Whisper + local SQLite), [[ZettelLinker]] (local MiniLM embeddings), [[SatFreedom]] (portfolio data on disk), and this site (in-browser transformer search — no upload of your pasted job post to my server).

Related: [[Wikilinks]], [[Personal Agentic Wiki]]
