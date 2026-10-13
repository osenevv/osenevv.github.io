---
type: project
order: 7
kind: Systems
summary: CLI address book for searching, categorizing, and deduplicating personal and business contacts, with paged browsing and two-way CSV and Markdown sync.
flow: Contact Input > Validation & Classification > Paged Terminal Views > Duplicate Merge > RFC 4180 CSV / Markdown Sync
proof: Modern C++20 · Zero third-party dependencies · 140 automated test assertions · CMake build
usecase: Managing and cleaning contact records locally from a terminal without relying on cloud services or proprietary databases.
atwork: Portable data manipulation utilities where external libraries are restricted and raw memory safety, schema validation, and file I/O must remain deterministic.
tradeoff: Built entirely on standard C++ STL instead of external libraries like nlohmann/json or boost. It keeps builds instant and portable across Unix and Windows at the cost of hand-writing the CSV parser.
stack: C++, C++20, CMake, STL
repo: github.com/osenevv/ContactManager-Cplusplus
tags: [project, systems, cpp, matfyz]
---
# Contact Manager

A zero-dependency **C++20** command-line address book designed for structured record storage, terminal navigation, and bi-directional file synchronization.

## What it does
- **Record Classification** — Distinguishes personal contacts (nicknames, birthdays) from business contacts (company names, department roles) using clean class polymorphism.
- **Search & Filtering** — Queries contacts across fields, tags, and favorite flags with instant substring matching.
- **Paged Terminal View** — Renders records in formatted terminal tables with configurable page sizes, sort orders, and operation logs.
- **Duplicate Detection & Merge** — Flags identical emails or phone numbers across records and provides guided resolution before persisting.
- **Export Formats** — Writes and imports RFC 4180 compliant CSV files, as well as formatted Markdown tables ready for an Obsidian vault.

## Architecture & Validation
- **Zero Third-Party Libraries**: Implemented with standard C++20 libraries only (`<memory>`, `<filesystem>`, `<algorithm>`, `<chrono>`). Builds in milliseconds on any compliant compiler.
- **Automated Test Suite**: 140 unit test assertions covering file parsing edge cases, invalid phone formats, corrupted CSV lines, and memory lifecycle verification.
- **Origin**: Built and validated as coursework at Charles University (Faculty of Mathematics and Physics / Matfyz).

Code: [github.com/osenevv/ContactManager-Cplusplus](https://github.com/osenevv/ContactManager-Cplusplus)
