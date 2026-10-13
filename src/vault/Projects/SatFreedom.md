---
type: project
featured: false
order: 4
kind: Desktop app
summary: Tracks multi-wallet Bitcoin savings and progress toward financial independence using public addresses, keeping all financial journals local without exchange logins or private keys.
flow: Watch-only addresses > Public balances (Esplora API) > Local SQLite journal > Independence milestone calculations
proof: Native macOS app · Clean layered architecture (Core, Services, API, Desktop) · Offline-first SQLite
usecase: Tracking Bitcoin savings toward a financial independence goal without trusting third parties with wallet credentials or private keys.
atwork: Desktop data management where sensitive financial records must remain completely private and offline on the user's local machine.
tradeoff: Native .NET 9 and Avalonia instead of Electron. Produces a fast, lightweight desktop binary with native memory characteristics, sacrificing web cross-compilation simplicity.
stack: C#, .NET 9, Avalonia, SQLite, Esplora API
image: /satfreedom-dashboard.jpg
repo: github.com/osenevv/SatFreedom
tags: [project, privacy, desktop, csharp]
---
# SatFreedom

Most portfolio tools ask for exchange API keys or wallet seed phrases. SatFreedom requires neither. You input watch-only public addresses, and the application queries open on-chain balances while keeping your financial records on your own hard drive.

![SatFreedom dashboard and wallet tracker](/satfreedom-dashboard.jpg)

## What it does
- **Portfolio Dashboard** — Calculates net worth, savings milestones, and target financial-independence dates in your selected fiat currency.
- **On-Chain Audit** — Compares current blockchain balances against your transaction log to surface unaccounted discrepancies.
- **Transaction Journal** — Logs purchases, fees, and transfers with historical cost-basis records in local SQLite storage.
- **Vault Export** — Generates monthly Markdown summary reports formatted directly for Obsidian vaults.

## How it's built
- **Layered Architecture**: Split into `Core`, `Services`, `Infrastructure`, `Export`, `API`, and `Desktop` assemblies to keep domain logic isolated from UI controls.
- **Private & Local-First**: Zero external telemetry. Blockchain data is fetched from public Esplora endpoints and cached locally.
- **Testing**: Automated unit tests in `SatFreedom.Tests` validate balance reconciliation math, SQLite migrations, and export formatting.

Related: [[Mafia Tracker]], [[Local-first]], [[Yapper]]
