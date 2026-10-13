---
type: project
featured: true
order: 2
kind: AI + voice
summary: Local macOS voice assistant — on-device Whisper STT, quoted tasks, long-term memory, and Telegram audio capture.
flow: Voice > on-device Whisper > quoted tasks & memories > review > search / Obsidian
proof: On-device Whisper · macOS app · pytest unit tests · CI on Python 3.10–3.12
usecase: Think out loud on a walk, get back a clean task list and notes you can search later, while the audio itself stays on your Mac.
atwork: Turning meeting recordings into action items where every item quotes what was actually said.
tradeoff: Every task and memory must quote the transcript or it is dropped — fewer suggestions, but none the model made up.
stack: Python, Whisper, OpenAI structured outputs, SQLite, Obsidian, Telegram Bot API
image: /yapper-app.jpg
repo: github.com/osenevv/Yapper
tags: [project, voice, whisper, evaluation, speech]
---
# Yapper

Turn rambling voice memos into structured tasks and durable memory. **Raw audio never leaves your machine.**

## What it does
- **Tasks & Action Items** — Extracts concrete to-dos and deduplicates actions against existing notes.
- **Durable Memory** — Stores decisions and lessons that stay relevant; older notes fade unless reactivated by newer recordings.
- **Dual Capture** — Dictate locally into the macOS menu bar app, or forward voice memos via a paired Telegram bot.
- **Obsidian & Assistant Export** — Syncs directly into vault Kanban boards, plus exports clean context files (`Identity.md`, `Memory.md`) for other AI tools without sharing raw audio.

## How it's built
- **Local Whisper & Privacy**: Speech recognition runs entirely on-device; PII (phone numbers, emails) is stripped before any structured summary calls.
- **Crash-Proof Chunking**: Audio is streamed and saved in small segments, allowing sessions up to five hours to survive unexpected reboots.
- **Grounded [[RAG]] Loop**: Retrieves related prior memories by semantic similarity and exact keywords to keep recurring topics consistent.
- **Rigorous Testing**: Automated **pytest** test suite in CI across Python 3.10–3.12 covering transcription, extraction schemas, and storage.

Related: [[Local-first]], [[Full-text Search]], [[Agentic Workflows]], [[Personal Agentic Wiki]]
