/**
 * Browser Chess.com Published-Data Public API Client
 * Fetches real profiles, ratings, and monthly archives directly from api.chess.com
 * without a backend proxy, plus silent background pre-warming of recent games.
 */
(function (root) {
  "use strict";

  let warmerActive = false;

  async function triggerBackgroundWarmer(username = "", limit = 15) {
    if (warmerActive) return;
    warmerActive = true;
    try {
      const gids = await root.ChessStore.getGameIdsNeedingReview(username, 3, limit);
      for (const gid of gids) {
        await root.ChessStore.getGameWithReview(gid, false);
        // Yield briefly to keep UI silky smooth
        await new Promise((r) => setTimeout(r, 40));
      }
    } catch (_) {
      // Silent best-effort pre-warm
    } finally {
      warmerActive = false;
    }
  }

  function parsePgnMetadata(pgnText) {
    const headers = {};
    const lines = pgnText.split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith("[") && line.endsWith("]")) {
        const m = line.match(/^\[(\w+)\s+"(.*)"\]$/);
        if (m) headers[m[1]] = m[2];
      }
    }
    return headers;
  }

  async function syncChessComAccount(username, clearDemo = true) {
    const usernameClean = String(username || "").trim().replace(/^@+/, "");
    if (!usernameClean) {
      return { success: false, error: "Username cannot be empty." };
    }
    const uLower = usernameClean.toLowerCase();

    try {
      // 1. Fetch Profile (verify player exists)
      const profResp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(uLower)}`);
      if (profResp.status === 404) {
        throw new Error(`Chess.com account '${usernameClean}' was not found. Please check spelling.`);
      }
      if (!profResp.ok) {
        throw new Error(`Chess.com API returned HTTP ${profResp.status}`);
      }
      const profileData = await profResp.json();

      // 2. Fetch Stats
      let statsData = {};
      try {
        const sResp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(uLower)}/stats`);
        if (sResp.ok) statsData = await sResp.json();
      } catch (_) {}

      // 3. Fetch Archives & guarantee active UTC month is checked
      let archives = [];
      const aResp = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(uLower)}/games/archives`);
      if (aResp.ok) {
        const aJson = await aResp.json();
        archives = Array.isArray(aJson.archives) ? aJson.archives.slice().sort() : [];
      } else if (aResp.status === 404) {
        throw new Error(`Chess.com account '${usernameClean}' was not found.`);
      }

      const now = new Date();
      const ym = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const currMonthUrl = `https://api.chess.com/pub/player/${uLower}/games/${ym}`;
      if (!archives.includes(currMonthUrl)) archives.push(currMonthUrl);

      const recentArchives = archives.slice(-3);
      const uniqueArchives = Array.from(new Set(recentArchives));

      const fetchedGames = [];
      for (const archUrl of uniqueArchives) {
        try {
          const mResp = await fetch(archUrl);
          if (mResp.ok) {
            const mJson = await mResp.json();
            if (Array.isArray(mJson.games)) fetchedGames.push(...mJson.games);
          }
        } catch (_) {}
      }

      // Deduplicate & sort strictly ascending by end_time (newest last)
      const seenUrls = new Set();
      const deduped = [];
      for (const g of fetchedGames) {
        const u = g.url || g.uuid || `${g.end_time}_${(g.white || {}).username || ""}`;
        if (!seenUrls.has(u)) {
          seenUrls.add(u);
          deduped.push(g);
        }
      }
      deduped.sort((a, b) => (Number(a.end_time) || 0) - (Number(b.end_time) || 0));

      if (deduped.length > 0 && clearDemo) {
        await root.ChessStore.clearDemoGames();
      }

      const gamesToImport = deduped.slice(-40);
      const totalImport = gamesToImport.length;
      let newCount = 0;
      let latestId = null;
      const fallbackNow = Math.floor(Date.now() / 1000);

      for (let idx = 0; idx < totalImport; idx++) {
        const g = gamesToImport[idx];
        const pgn = g.pgn;
        if (!pgn) continue;

        const w = g.white || {};
        const b = g.black || {};
        const wRes = w.result || "";
        const bRes = b.result || "";
        let resStr;
        if (wRes === "win") resStr = `White Won (${bRes})`;
        else if (bRes === "win") resStr = `Black Won (${wRes})`;
        else resStr = `Draw (${wRes})`;

        const et = (typeof g.end_time === "number" && g.end_time > 0) ? Math.floor(g.end_time) : fallbackNow;

        // Analyze only newest game synchronously so sync feels instantaneous
        const review = (idx >= totalImport - 1) ? await root.ChessEngine.analyzeGamePgnAsync(pgn, 2) : null;

        const { id, isNew } = await root.ChessStore.insertImportedGame({
          chess_com_url: g.url || `https://www.chess.com/game/live/${et}_${idx}`,
          end_time: et,
          time_control: g.time_control || "600",
          time_class: g.time_class || "rapid",
          rated: g.rated !== undefined ? g.rated : true,
          white_username: w.username || "White",
          white_rating: w.rating || 1500,
          black_username: b.username || "Black",
          black_rating: b.rating || 1500,
          result_string: resStr,
          white_result: wRes,
          black_result: bRes,
          pgn,
        }, review);

        latestId = id;
        if (isNew) newCount += 1;
      }

      const updates = { last_sync_time: String(fallbackNow), username: usernameClean };
      if (profileData.avatar) updates.avatar_url = profileData.avatar;
      const rapid = statsData.chess_rapid?.last?.rating;
      const blitz = statsData.chess_blitz?.last?.rating;
      const bullet = statsData.chess_bullet?.last?.rating;
      if (rapid) updates.rating_rapid = String(rapid);
      if (blitz) updates.rating_blitz = String(blitz);
      if (bullet) updates.rating_bullet = String(bullet);
      root.ChessStore.updateSettings(updates);

      // Kick off silent background pre-warm for remaining games
      triggerBackgroundWarmer(usernameClean, 15);

      return {
        success: true,
        username: usernameClean,
        new_games: newCount,
        latest_game_id: latestId,
        last_sync_time: fallbackNow,
        stats: statsData,
        profile: profileData,
      };
    } catch (err) {
      return {
        success: false,
        username: usernameClean,
        error: err.message || String(err),
      };
    }
  }

  async function importGameFromInput(rawInput, activeUser = "") {
    const raw = String(rawInput || "").trim();
    if (!raw) throw new Error("Chess.com game link, game ID, or PGN is required.");

    if (raw.startsWith("[") || raw.includes("1.")) {
      const headers = parsePgnMetadata(raw);
      const whiteU = headers.White || "WhitePlayer";
      const blackU = headers.Black || "BlackPlayer";
      const wElo = /^\d+$/.test(headers.WhiteElo || "") ? parseInt(headers.WhiteElo, 10) : 1500;
      const bElo = /^\d+$/.test(headers.BlackElo || "") ? parseInt(headers.BlackElo, 10) : 1500;
      const res = headers.Result || "*";
      const tc = headers.TimeControl || "600";
      const eco = headers.ECO || "Custom PGN";
      const ts = Math.floor(Date.now() / 1000);

      const review = await root.ChessEngine.analyzeGamePgnAsync(raw, 2);
      const { id } = await root.ChessStore.insertImportedGame({
        chess_com_url: headers.Link || `https://www.chess.com/game/custom/${ts}`,
        end_time: ts,
        time_control: tc,
        time_class: "custom",
        rated: true,
        white_username: whiteU,
        white_rating: wElo,
        black_username: blackU,
        black_rating: bElo,
        result_string: `Result: ${res}`,
        eco_name: eco,
        pgn: raw,
      }, review);
      return await root.ChessStore.getGameWithReview(id);
    }

    const idMatch = raw.match(/(\d{7,})/);
    if (!idMatch) {
      throw new Error("Please paste a valid Chess.com game URL (e.g. chess.com/game/live/12345678), game ID, or full PGN.");
    }
    const gameId = idMatch[1];

    // Check active user's recent public API archives (CORS-allowed directly in browsers)
    const userClean = String(activeUser || "").trim().replace(/^@+/, "").toLowerCase();
    if (userClean && userClean !== "select player" && userClean !== "active player") {
      const now = new Date();
      const currY = now.getUTCFullYear();
      const currM = now.getUTCMonth() + 1;
      const prevDate = new Date(Date.UTC(currY, currM - 2, 1));
      const urls = [
        `https://api.chess.com/pub/player/${encodeURIComponent(userClean)}/games/${currY}/${String(currM).padStart(2, "0")}`,
        `https://api.chess.com/pub/player/${encodeURIComponent(userClean)}/games/${prevDate.getUTCFullYear()}/${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`,
      ];
      for (const monthUrl of urls) {
        try {
          const resp = await fetch(monthUrl);
          if (!resp.ok) continue;
          const mData = await resp.json();
          const match = (mData.games || []).find((g) => String(g.url || "").includes(gameId));
          if (match && match.pgn) {
            const review = await root.ChessEngine.analyzeGamePgnAsync(match.pgn, 2);
            const { id } = await root.ChessStore.insertImportedGame({
              chess_com_url: match.url,
              end_time: match.end_time || Math.floor(Date.now() / 1000),
              time_control: match.time_control || "600",
              time_class: match.time_class || "rapid",
              rated: match.rated !== undefined ? match.rated : true,
              white_username: match.white?.username || "White",
              white_rating: match.white?.rating || 1500,
              black_username: match.black?.username || "Black",
              black_rating: match.black?.rating || 1500,
              result_string: "Live Game",
              pgn: match.pgn,
            }, review);
            return await root.ChessStore.getGameWithReview(id);
          }
        } catch (_) {}
      }
    }

    throw new Error(
      `Game #${gameId} was not found in recent public archives. On Chess.com, click Share > PGN > Copy and paste the PGN text here to review immediately!`
    );
  }

  root.ChessComClient = {
    syncChessComAccount,
    importGameFromInput,
    triggerBackgroundWarmer,
  };
})(window);
