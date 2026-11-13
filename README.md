# Chess.com Free Game Review & Match Simulator 

A 100% browser-based Chess.com Game Review & AI Match Simulator powered by Web Workers, IndexedDB caching

## Features
- **CAPS2 Game Review Engine:** Evaluates full games right in your browser (using parallel Web Workers when available) with Brilliant (`!!`), Great (`!`), Best (`★`), Excellent, Good, Book, Inaccuracy (`?!`), Mistake (`?`), Miss (`×`), and Blunder (`??`) classifications.
- **Live Chess.com Sync:** Enter any Chess.com username to fetch recent games, ratings, and profile info directly from `https://api.chess.com/pub/...`, or paste any Chess.com game PGN / game ID via **+ Link/PGN**.
- **Interactive Match Simulator:** Watch AI vs. AI games or play White vs. the Coach Bot with Top-3 engine best-move arrows and win probability tracking.
- **Private Browser Storage:** Games and reviews are cached locally in each visitor's browser via IndexedDB + `localStorage`.
