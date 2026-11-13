/**
 * Client-Side Browser Storage Layer (IndexedDB + localStorage)
 * Separates lightweight game summaries ("games" store) from full move reviews ("reviews" store)
 * so game list filtering and KPI computation are instantaneous.
 */
(function (root) {
  "use strict";

  const DB_NAME = "FreeChessReviewDB";
  const DB_VERSION = 1;
  const SETTINGS_KEY = "fcr_settings_v1";

  const nowSec = () => Math.floor(Date.now() / 1000);

  const SEED_GAMES = [
    {
      chess_com_url: "https://www.chess.com/game/live/100001",
      end_time: nowSec() - 720,
      time_control: "600",
      time_class: "rapid",
      rated: 1,
      white_username: "DilanChess",
      white_rating: 1865,
      black_username: "GM_Alex99",
      black_rating: 1842,
      result_string: "Won by Checkmate (+8)",
      white_result: "win",
      black_result: "checkmated",
      eco_name: "C11 French Defense: Classical",
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[White "DilanChess"]
[Black "GM_Alex99"]
[Result "1-0"]
[WhiteElo "1865"]
[BlackElo "1842"]
[TimeControl "600"]

1. e4 e6 2. d4 d5 3. Nc3 Nf6 4. e5 Nfd7 5. Nf3 c5 6. Bd3 Nc6 7. O-O Be7 8. Re1 O-O 9. Bf4 a6 10. Bxh7+!! Kxh7 11. Ng5+! Kg6 12. Qd3+ f5 13. Qg3 Bxg5 14. h4 Nxd4 15. Bxg5 Qe8 16. h5+ Kxh5 17. Qh4+ Kg6 18. Re3 Kf7 19. Qh5+ g6 20. Qh7# 1-0`,
    },
    {
      chess_com_url: "https://www.chess.com/game/live/100002",
      end_time: nowSec() - 3600,
      time_control: "180+2",
      time_class: "blitz",
      rated: 1,
      white_username: "DilanChess",
      white_rating: 1857,
      black_username: "KnightRider",
      black_rating: 1855,
      result_string: "Lost by Checkmate (-7)",
      white_result: "checkmated",
      black_result: "win",
      eco_name: "D30 Queen's Gambit Declined",
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[White "DilanChess"]
[Black "KnightRider"]
[Result "0-1"]
[WhiteElo "1857"]
[BlackElo "1855"]
[TimeControl "180+2"]

1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7 7. Rc1 c6 8. Bd3 dxc4 9. Bxc4 Nd5 10. Bxe7 Qxe7 11. O-O Nxc3 12. Rxc3 e5 13. dxe5 Nxe5 14. Nxe5 Qxe5 15. Rd3?? Qxb2?! 16. Rd8?? Bg4! 17. Rxf8+ Rxf8 18. Qxg4 Rd8 19. Rd1?? Rxd1+ 20. Qxd1 Qc1 0-1`,
    },
    {
      chess_com_url: "https://www.chess.com/game/live/100003",
      end_time: nowSec() - 10800,
      time_control: "180+2",
      time_class: "blitz",
      rated: 1,
      white_username: "SicilianQueen",
      white_rating: 1830,
      black_username: "DilanChess",
      black_rating: 1864,
      result_string: "Won by Resignation (+9)",
      white_result: "resigned",
      black_result: "win",
      eco_name: "C50 Italian Game: Giuoco Piano",
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[White "SicilianQueen"]
[Black "DilanChess"]
[Result "0-1"]
[WhiteElo "1830"]
[BlackElo "1864"]
[TimeControl "180+2"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 Nxe4 8. O-O Bxc3 9. d5 Bf6 10. Re1 Ne7 11. Rxe4 d6 12. Bg5 Bxg5 13. Nxg5 O-O 14. Nxh7! Kxh7 15. Qh5+ Kg8 16. Rh4 f5 0-1`,
    },
    {
      chess_com_url: "https://www.chess.com/game/live/100004",
      end_time: nowSec() - 24000,
      time_control: "600",
      time_class: "rapid",
      rated: 1,
      white_username: "DilanChess",
      white_rating: 1855,
      black_username: "RookLift",
      black_rating: 1828,
      result_string: "Draw by Agreement (0)",
      white_result: "agreed",
      black_result: "agreed",
      eco_name: "C65 Ruy Lopez: Berlin Defense",
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[White "DilanChess"]
[Black "RookLift"]
[Result "1/2-1/2"]
[WhiteElo "1855"]
[BlackElo "1828"]
[TimeControl "600"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 Nf6 4. O-O Nxe4 5. d4 Nd6 6. Bxc6 dxc6 7. dxe5 Nf5 8. Qxd8+ Kxd8 9. Nc3 Ke8 10. h3 Be7 11. Bf4 Be6 1/2-1/2`,
    },
    {
      chess_com_url: "https://www.chess.com/game/live/100005",
      end_time: nowSec() - 42000,
      time_control: "60",
      time_class: "bullet",
      rated: 1,
      white_username: "SpeedPawn",
      white_rating: 1790,
      black_username: "DilanChess",
      black_rating: 1855,
      result_string: "Won on Time (+6)",
      white_result: "timeout",
      black_result: "win",
      eco_name: "B12 Caro-Kann Defense",
      pgn: `[Event "Live Chess"]
[Site "Chess.com"]
[White "SpeedPawn"]
[Black "DilanChess"]
[Result "0-1"]
[WhiteElo "1790"]
[BlackElo "1855"]
[TimeControl "60"]

1. e4 c6 2. d4 d5 3. e5 Bf5 4. Nf3 e6 5. Be2 Nd7 6. O-O Ne7 7. Nbd2 h6 8. Nb3 g5 9. c3 Bg7 10. Be3 O-O 0-1`,
    },
  ];

  function buildReviewSummary(review) {
    if (!review || !review.counts) return {};
    const w = review.counts.w || {};
    const b = review.counts.b || {};
    return {
      review_version: review.review_version || 1,
      brilliants: (w.brilliant || 0) + (b.brilliant || 0),
      great: (w.great || 0) + (b.great || 0),
      blunders: (w.blunder || 0) + (b.blunder || 0),
      mistakes: (w.mistake || 0) + (b.mistake || 0),
    };
  }

  // Memory fallback if IndexedDB is disabled in browser
  const memGames = new Map();
  const memReviews = new Map();
  let memNextId = 1;
  let useMemoryOnly = false;
  let dbPromise = null;
  let initDone = false;
  const inFlightAnalysis = new Map();

  function openDb() {
    if (useMemoryOnly) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      if (typeof indexedDB === "undefined") {
        useMemoryOnly = true;
        resolve(null);
        return;
      }
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains("games")) {
            const gs = db.createObjectStore("games", { keyPath: "id", autoIncrement: true });
            gs.createIndex("by_url", "chess_com_url", { unique: true });
          }
          if (!db.objectStoreNames.contains("reviews")) {
            db.createObjectStore("reviews", { keyPath: "game_id" });
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => {
          useMemoryOnly = true;
          resolve(null);
        };
      } catch (_) {
        useMemoryOnly = true;
        resolve(null);
      }
    });
    return dbPromise;
  }

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function getSettings() {
    const defaults = {
      username: "DilanChess",
      poll_interval: "30",
      engine_depth: "18",
      board_theme: "green",
      auto_sync: "true",
      last_sync_time: String(nowSec()),
    };
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(defaults));
        return defaults;
      }
      return { ...defaults, ...JSON.parse(raw) };
    } catch (_) {
      return defaults;
    }
  }

  function updateSettings(updates) {
    const next = { ...getSettings() };
    for (const [k, v] of Object.entries(updates || {})) {
      if (v !== undefined && v !== null) next[k] = String(v);
    }
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch (_) {}
    return next;
  }

  async function _getAllGamesRaw() {
    const db = await openDb();
    if (!db) return Array.from(memGames.values());
    const tx = db.transaction("games", "readonly");
    return await idbReq(tx.objectStore("games").getAll());
  }

  async function _getGameByIdRaw(id) {
    const numId = Number(id);
    const db = await openDb();
    if (!db) return memGames.get(numId) || null;
    const tx = db.transaction("games", "readonly");
    return (await idbReq(tx.objectStore("games").get(numId))) || null;
  }

  async function _getReviewRaw(gameId) {
    const numId = Number(gameId);
    const db = await openDb();
    if (!db) return memReviews.get(numId) || null;
    const tx = db.transaction("reviews", "readonly");
    const rec = await idbReq(tx.objectStore("reviews").get(numId));
    return rec ? rec.review : null;
  }

  async function _saveGameRecord(gameRec, reviewObj = null) {
    const db = await openDb();
    if (!db) {
      if (!gameRec.id) gameRec.id = memNextId++;
      memGames.set(gameRec.id, { ...gameRec });
      if (reviewObj) memReviews.set(gameRec.id, reviewObj);
      return gameRec.id;
    }
    const stores = reviewObj ? ["games", "reviews"] : ["games"];
    const tx = db.transaction(stores, "readwrite");
    const gStore = tx.objectStore("games");
    const gid = await idbReq(gStore.put(gameRec));
    gameRec.id = gid;
    if (reviewObj) {
      await idbReq(tx.objectStore("reviews").put({ game_id: gid, review: reviewObj }));
    }
    return gid;
  }

  async function init() {
    if (initDone) return;
    initDone = true;
    const existing = await _getAllGamesRaw();
    if (existing.length === 0) {
      for (let idx = 0; idx < SEED_GAMES.length; idx++) {
        const g = SEED_GAMES[idx];
        // Pre-analyze first game at depth=2 (fast ~100ms in V8) so initial render is accurate & instant
        const review = idx === 0 ? root.ChessEngine.analyzeGamePgn(g.pgn, 2) : null;
        await insertImportedGame(g, review);
      }
    }
  }

  async function insertImportedGame(gameDict, precomputedReview = null) {
    const existing = await _getAllGamesRaw();
    const dup = existing.find((g) => g.chess_com_url === gameDict.chess_com_url);
    if (dup) return { id: dup.id, isNew: false };

    const rec = {
      chess_com_url: gameDict.chess_com_url,
      end_time: gameDict.end_time || nowSec(),
      time_control: gameDict.time_control || "600",
      time_class: gameDict.time_class || "rapid",
      rated: gameDict.rated !== undefined ? (gameDict.rated ? 1 : 0) : 1,
      white_username: gameDict.white_username || "White",
      white_rating: gameDict.white_rating || 1500,
      black_username: gameDict.black_username || "Black",
      black_rating: gameDict.black_rating || 1500,
      result_string: gameDict.result_string || "Completed",
      white_result: gameDict.white_result || "win",
      black_result: gameDict.black_result || "checkmated",
      eco_name: precomputedReview ? precomputedReview.opening : (gameDict.eco_name || "Standard Chess"),
      pgn: gameDict.pgn,
      accuracy_white: precomputedReview ? precomputedReview.accuracy_white : null,
      accuracy_black: precomputedReview ? precomputedReview.accuracy_black : null,
      is_reviewed: Boolean(precomputedReview),
      summary: precomputedReview ? buildReviewSummary(precomputedReview) : null,
    };

    const id = await _saveGameRecord(rec, precomputedReview);
    return { id, isNew: true };
  }

  async function clearDemoGames() {
    const all = await _getAllGamesRaw();
    const demoIds = all
      .filter((g) => String(g.chess_com_url || "").startsWith("https://www.chess.com/game/live/10000"))
      .map((g) => g.id);
    if (demoIds.length === 0) return;

    const db = await openDb();
    if (!db) {
      demoIds.forEach((id) => { memGames.delete(id); memReviews.delete(id); });
      return;
    }
    const tx = db.transaction(["games", "reviews"], "readwrite");
    for (const id of demoIds) {
      tx.objectStore("games").delete(id);
      tx.objectStore("reviews").delete(id);
    }
    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  async function listGames({ timeClass = "all", searchQuery = "", reviewedOnly = false, username = "" } = {}) {
    await init();
    let rows = await _getAllGamesRaw();
    const userLower = (username || "").trim().toLowerCase();
    const tcLower = (timeClass || "all").toLowerCase();
    const qLower = (searchQuery || "").trim().toLowerCase();

    rows = rows.filter((g) => {
      if (userLower &&
          String(g.white_username || "").toLowerCase() !== userLower &&
          String(g.black_username || "").toLowerCase() !== userLower) {
        return false;
      }
      if (tcLower && tcLower !== "all" && String(g.time_class || "").toLowerCase() !== tcLower) {
        return false;
      }
      if (reviewedOnly && !g.is_reviewed) return false;
      if (qLower) {
        const hay = `${g.white_username} ${g.black_username} ${g.eco_name || ""}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });

    rows.sort((a, b) => ((b.end_time || 0) - (a.end_time || 0)) || ((b.id || 0) - (a.id || 0)));
    rows = rows.slice(0, 100);

    let totalBrilliants = 0;
    let totalBlunders = 0;
    const accValues = [];

    const games = rows.map((g) => {
      const s = g.summary || {};
      const item = {
        ...g,
        is_reviewed: Boolean(g.is_reviewed),
        brilliants: g.is_reviewed ? (s.brilliants || 0) : 0,
        great: g.is_reviewed ? (s.great || 0) : 0,
        blunders: g.is_reviewed ? (s.blunders || 0) : 0,
        mistakes: g.is_reviewed ? (s.mistakes || 0) : 0,
      };
      delete item.pgn;
      if (item.is_reviewed) {
        totalBrilliants += item.brilliants;
        totalBlunders += item.blunders;
        if (item.accuracy_white) accValues.push(item.accuracy_white);
      }
      return item;
    });

    const avgAcc = accValues.length
      ? Math.round((accValues.reduce((a, b) => a + b, 0) / accValues.length) * 10) / 10
      : 85.4;
    const avgBlunders = Math.round((totalBlunders / Math.max(1, accValues.length)) * 10) / 10;

    return {
      games,
      kpis: {
        total_games: games.length,
        avg_accuracy: avgAcc,
        total_brilliants: totalBrilliants,
        avg_blunders: avgBlunders,
      },
    };
  }

  async function getGameIdsNeedingReview(username = "", targetVersion = 3, limit = 15) {
    const { games } = await listGames({ username });
    const ids = [];
    for (const g of games) {
      if (!g.is_reviewed || !g.summary || g.summary.review_version !== targetVersion) {
        ids.push(g.id);
        if (ids.length >= limit) break;
      }
    }
    return ids;
  }

  async function getGameWithReview(gameId, forceReanalyze = false) {
    const numId = Number(gameId);
    if (!forceReanalyze && inFlightAnalysis.has(numId)) {
      return await inFlightAnalysis.get(numId);
    }

    const work = (async () => {
      const gameRec = await _getGameByIdRaw(numId);
      if (!gameRec) return null;

      const cached = await _getReviewRaw(numId);
      if (cached && cached.review_version === 3 && !forceReanalyze) {
        return { ...gameRec, review: cached };
      }

      const review = await root.ChessEngine.analyzeGamePgnAsync(gameRec.pgn, 2);
      gameRec.accuracy_white = review.accuracy_white;
      gameRec.accuracy_black = review.accuracy_black;
      gameRec.eco_name = review.opening;
      gameRec.is_reviewed = true;
      gameRec.summary = buildReviewSummary(review);
      await _saveGameRecord(gameRec, review);
      return { ...gameRec, review };
    })();

    inFlightAnalysis.set(numId, work);
    try {
      return await work;
    } finally {
      inFlightAnalysis.delete(numId);
    }
  }

  root.ChessStore = {
    init,
    getSettings,
    updateSettings,
    listGames,
    getGameWithReview,
    getGameIdsNeedingReview,
    insertImportedGame,
    clearDemoGames,
  };
})(window);
