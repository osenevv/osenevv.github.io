---
type: project
featured: true
order: 3
kind: Real-time web & algorithms
summary: Live tournament platform for 10-player Mafia: the judge runs the table from one screen, every display updates over WebSockets, and a ratio-based Elo engine tracks seasons.
flow: Judge action > Django view (HTTP) > Channels broadcast > Every screen updates > Elo + season standings
proof: Django Channels WebSockets · ratio Elo · Docker
usecase: Running a 10-player tournament night without paper — timers, nominations, votes, fouls and standings all live, with the judge in control.
atwork: Any system where many clients must see the same state change at the same moment — live auctions, ops dashboards, shared game rooms.
tradeoff: Judge actions stay plain HTTP posts and the WebSocket only pushes state out, so there is one source of truth and no drift between screens. The channel layer is in-memory by default; Redis is only needed once you run more than one worker.
stack: Python, Django, Django Channels, Daphne (ASGI), WebSockets, SQLite / PostgreSQL, Docker
image: /mafia-tracker-live.jpg
repo: github.com/osenevv/mafia-tracker
tags: [project, backend, websockets, algorithms]
---
# Mafia Tracker

A Django platform for club Mafia nights and tournaments. Ten seats — six citizens, two mafia, a sheriff and a don. The table judge runs day and night phases, the voting pool, fouls, kills and sheriff checks, while every connected screen sees the game move in real time. Afterwards the site updates Elo, XP and season standings.

## Use cases
1. **Live tournaments without paper** — speech timer, nominations, voting ties, fouls and eliminations are tracked live, and standings are ready the moment a game ends.
2. **Fair ratings for multiplayer games** — standard 1-v-1 chess Elo doesn't fit a 10-player game with hidden roles, so ratings come from every pairwise result at the table.
3. **Many screens, one truth** — the judge's view, the players' view and a spectator display stay in sync. The same pattern fits live auctions, operations dashboards and shared rooms.
4. **League management** — seasons, tournament series, registration, scheduling and judge permissions.

![Tournament dashboard and match history](/mafia-tracker-app.jpg)

## How it's built
- **Real time:** a `GameConsumer` (`AsyncWebsocketConsumer`) opens one WebSocket room per game. Judge actions go through normal Django views, then the new state is broadcast to the room.
- **The rating math:** `utils/elo.py` implements the ratio-based International Mafia system. Beating a stronger player earns \(R_{opp} / R_{self}\); losing to a weaker one costs \(R_{self} / R_{opp}\). Upsets move ratings a lot, expected results barely at all.
- **Running it:** SQLite by default, PostgreSQL via environment variables, and a Docker Compose setup.

Related: [[SatFreedom]]
