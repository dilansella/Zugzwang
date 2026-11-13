# Chess.com Free Game Review & Match Simulator (Web / GitHub Pages Edition)

A 100% browser-based Chess.com Game Review & AI Match Simulator powered by Web Workers, IndexedDB caching, and the public Chess.com API — designed to run directly on **GitHub Pages** with no backend server required.

## Features
- **CAPS2 Game Review Engine:** Evaluates full games right in your browser (using parallel Web Workers when available) with Brilliant (`!!`), Great (`!`), Best (`★`), Excellent, Good, Book, Inaccuracy (`?!`), Mistake (`?`), Miss (`×`), and Blunder (`??`) classifications.
- **Live Chess.com Sync:** Enter any Chess.com username to fetch recent games, ratings, and profile info directly from `https://api.chess.com/pub/...`, or paste any Chess.com game PGN / game ID via **+ Link/PGN**.
- **Interactive Match Simulator:** Watch AI vs. AI games or play White vs. the Coach Bot with Top-3 engine best-move arrows and win probability tracking.
- **Private Browser Storage:** Games and reviews are cached locally in each visitor's browser via IndexedDB + `localStorage`.

## Publish as a Public Link with GitHub Pages
1. Push this folder to a GitHub repository.
2. Open your repository on GitHub and go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, select branch **`main`** and folder **`/ (root)`**, then click **Save**.
4. After ~1 minute, GitHub will display your live public link (for example, `https://<your-username>.github.io/<repo-name>/`).
