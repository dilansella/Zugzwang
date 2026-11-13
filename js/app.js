/**
 * Chess.com Free Game Review & Match Simulator — Frontend Controller
 */

const FILES = "abcdefgh";

const INITIAL_BOARD_POSITION = {
  a8: "bR", b8: "bN", c8: "bB", d8: "bQ", e8: "bK", f8: "bB", g8: "bN", h8: "bR",
  a7: "bP", b7: "bP", c7: "bP", d7: "bP", e7: "bP", f7: "bP", g7: "bP", h7: "bP",
  a2: "wP", b2: "wP", c2: "wP", d2: "wP", e2: "wP", f2: "wP", g2: "wP", h2: "wP",
  a1: "wR", b1: "wN", c1: "wB", d1: "wQ", e1: "wK", f1: "wB", g1: "wN", h1: "wR"
};

const App = {
  currentView: "review",
  games: [],
  currentGame: null,
  currentPly: 0,
  isFlipped: false,
  autoplayTimer: null,
  libraryFilter: "all",
  latestGameId: 1,

  // Match Simulator State
  simState: {
    fen: "",
    turn: "w",
    moveNumber: 1,
    position: { ...INITIAL_BOARD_POSITION },
    evalCp: 20,
    evalStr: "+0.20",
    winPctWhite: 52.0,
    topCandidates: [],
    legalMoves: [],
    history: [],
    lastMove: null,
    selectedSquare: null,
    autoTimer: null,
    gameOver: false
  },

  async init() {
    this.bindKeyboard();
    await window.ChessStore.init();
    await this.loadStatus();
    await this.loadSidebarGames();
    if (this.games.length > 0) {
      const firstUrl = String(this.games[0].chess_com_url || "");
      const startPly = firstUrl.startsWith("https://www.chess.com/game/live/100001") ? 19 : null;
      await this.selectGame(this.games[0].id, startPly);
    }
    this.startNewSimulation().catch(() => {});

    // Silently pre-warm recent unreviewed games via Web Workers
    const settings = window.ChessStore.getSettings();
    const warmUser = (settings.username && settings.username !== "DilanChess") ? settings.username : "";
    setTimeout(() => {
      window.ChessComClient.triggerBackgroundWarmer(warmUser, 15).catch(() => {});
    }, 800);

    // Background Auto-Sync Poll
    setInterval(() => this.pollSyncStatus(), 15000);
  },

  bindKeyboard() {
    window.addEventListener("keydown", (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;
      if (this.currentView === "review") {
        if (e.key === "ArrowRight") { e.preventDefault(); this.stepPly(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); this.stepPly(-1); }
        else if (e.key === "ArrowUp") { e.preventDefault(); this.goToPly(0); }
        else if (e.key === "ArrowDown") { e.preventDefault(); this.goToLastPly(); }
      } else if (this.currentView === "simulate") {
        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          this.stepSimulation();
        }
      }
    });
  },

  playTone(freq = 320, duration = 0.06, type = "triangle") {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (_) {}
  },

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll(".app-view").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".rail-btn").forEach(el => el.classList.remove("active"));

    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add("active");
    const targetNav = document.getElementById(`nav-${viewName}`);
    if (targetNav) targetNav.classList.add("active");

    if (viewName === "library") {
      this.loadLibraryGames();
    }
  },

  async loadStatus() {
    try {
      const s = window.ChessStore.getSettings();
      const theme = s.board_theme || "green";
      document.documentElement.setAttribute("data-board-theme", theme);
      document.querySelectorAll(".theme-btn").forEach((b) => {
        const oc = b.getAttribute("onclick") || "";
        b.classList.toggle("active", oc.includes(`'${theme}'`) || oc.includes(`"${theme}"`));
      });

      const pollSel = document.getElementById("settings-poll-interval");
      if (pollSel && s.poll_interval !== undefined) {
        pollSel.value = String(s.poll_interval);
      }

      const user = s.username;
      if (user && user !== "DilanChess") {
        document.getElementById("sidebar-username").textContent = user;
        const av = document.getElementById("sidebar-avatar");
        if (av) {
          if (s.avatar_url) {
            av.innerHTML = `<img src="${s.avatar_url}" alt="${user}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
          } else {
            av.textContent = user[0].toUpperCase();
          }
        }
        const badge = document.getElementById("sidebar-rating-badge");
        if (badge) {
          badge.textContent = s.rating_rapid
            ? `⚡ ${s.rating_rapid} Rapid`
            : (s.rating_blitz ? `⚡ ${s.rating_blitz} Blitz` : (s.rating_bullet ? `⚡ ${s.rating_bullet} Bullet` : ""));
        }
        if (document.getElementById("sidebar-player-input")) {
          document.getElementById("sidebar-player-input").value = user;
        }
        if (document.getElementById("lib-username-input")) {
          document.getElementById("lib-username-input").value = user;
        }
        if (document.getElementById("settings-username")) {
          document.getElementById("settings-username").value = user;
        }
        const ep = document.getElementById("library-api-endpoint");
        if (ep) {
          ep.textContent =
            `Free Public API Polling · GET https://api.chess.com/pub/player/${user.toLowerCase()}/games/archives`;
        }
      }
    } catch (e) {
      console.error("Failed to load status:", e);
    }
  },

  async pollSyncStatus() {
    try {
      const s = window.ChessStore.getSettings();
      const pollSec = parseInt(s.poll_interval || "30", 10);
      const syncEl = document.getElementById("sidebar-sync-text");
      if (!pollSec || pollSec <= 0) {
        if (syncEl) syncEl.textContent = "Manual Sync Only";
        return;
      }

      const user = s.username;
      if (!user || user === "DilanChess" || this._isSyncing) {
        return;
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const lastSec = parseInt(s.last_sync_time || "0", 10);
      if (nowSec - lastSec < Math.max(15, pollSec)) {
        if (syncEl && syncEl.textContent === "Live Sync Ready") {
          syncEl.textContent = "Auto-Sync ON";
        }
        return;
      }

      this._isSyncing = true;
      try {
        const res = await window.ChessComClient.syncChessComAccount(user, true);
        if (res.success && res.new_games > 0) {
          if (syncEl) syncEl.textContent = `+${res.new_games} New Game(s)!`;
          await this.loadSidebarGames();
          if (this.currentView === "library") await this.loadLibraryGames();
        } else if (res.success && syncEl) {
          syncEl.textContent = "Auto-Sync ON";
        }
      } finally {
        this._isSyncing = false;
      }
    } catch (_) {}
  },

  async loadPlayerFromSidebar() {
    const input = document.getElementById("sidebar-player-input");
    const name = input?.value?.trim().replace(/^@/, "");
    if (!name) {
      alert("Please enter a Chess.com username (e.g. Hikaru, GothamChess, or your own username).");
      return;
    }
    await this.triggerSync(false, name);
  },

  openImportModal() {
    const m = document.getElementById("import-game-modal");
    if (m) {
      m.style.display = "flex";
      const txt = document.getElementById("import-input-field");
      if (txt) { txt.value = ""; txt.focus(); }
    }
  },

  closeImportModal() {
    const m = document.getElementById("import-game-modal");
    if (m) m.style.display = "none";
  },

  promptImportGame() {
    this.openImportModal();
  },

  async submitImportModal() {
    const txt = document.getElementById("import-input-field");
    const raw = txt?.value?.trim();
    if (!raw) {
      alert("Please enter a Chess.com game link or paste a PGN.");
      return;
    }
    const btn = document.getElementById("btn-submit-import");
    if (btn) btn.textContent = "Analyzing...";

    const user = document.getElementById("sidebar-username")?.textContent || "";
    try {
      const data = await window.ChessComClient.importGameFromInput(raw, user);
      this.closeImportModal();
      document.getElementById("sidebar-sync-text").textContent = "Game Analyzed!";
      await this.loadSidebarGames();
      if (this.currentView === "library") await this.loadLibraryGames();
      await this.selectGame(data.id, 1);
    } catch (e) {
      alert(e.message || "Failed to load game.");
    } finally {
      if (btn) btn.textContent = "Analyze & Review →";
    }
  },

  async clearDemoGames() {
    try {
      await window.ChessStore.clearDemoGames();
      alert("Demo placeholder games removed. Sync any Chess.com username to load real games.");
      await this.loadSidebarGames();
      if (this.currentView === "library") await this.loadLibraryGames();
      if (this.games.length === 0) {
        this.currentGame = null;
        document.getElementById("review-matchup-title").textContent = "No Games Loaded";
        document.getElementById("review-opening-subtitle").textContent = "Enter a Chess.com username or + Link/PGN to analyze a game";
      }
    } catch (e) {
      console.error(e);
    }
  },

  async triggerSync(simulateNew = false, explicitUser = null) {
    let user = explicitUser || document.getElementById("sidebar-player-input")?.value ||
               document.getElementById("lib-username-input")?.value ||
               document.getElementById("sidebar-username")?.textContent || "";
    user = user.trim().replace(/^@/, "");

    if (!user || user === "Select Player" || user === "Active Player") {
      const prompted = prompt("Enter ANY Chess.com username (e.g. Hikaru, GothamChess, or your username):", "");
      if (!prompted || !prompted.trim()) {
        return;
      }
      user = prompted.trim().replace(/^@/, "");
    }

    document.getElementById("sidebar-username").textContent = user;
    document.getElementById("sidebar-avatar").textContent = user[0].toUpperCase();
    if (document.getElementById("sidebar-player-input")) {
      document.getElementById("sidebar-player-input").value = user;
    }
    if (document.getElementById("lib-username-input")) {
      document.getElementById("lib-username-input").value = user;
    }
    if (document.getElementById("library-api-endpoint")) {
      document.getElementById("library-api-endpoint").textContent =
        `Free Public API Polling · GET https://api.chess.com/pub/player/${user.toLowerCase()}/games/archives`;
    }

    document.getElementById("sidebar-sync-text").textContent = `Fetching @${user}...`;
    this._isSyncing = true;
    try {
      const data = await window.ChessComClient.syncChessComAccount(user, true);
      if (!data || data.success === false) {
        const errMsg = data?.error || "Failed to connect to Chess.com API.";
        document.getElementById("sidebar-sync-text").textContent = "API Error";
        alert(`Chess.com Player Lookup Error:\n${errMsg}`);
        return;
      }

      document.getElementById("sidebar-sync-text").textContent =
        data.new_games > 0 ? `+${data.new_games} Games Synced!` : "Up to date with Chess.com";
      if (data.latest_game_id) {
        this.latestGameId = data.latest_game_id;
      }

      // Display player ratings badge if available
      if (data.stats) {
        const rapid = data.stats.chess_rapid?.last?.rating;
        const blitz = data.stats.chess_blitz?.last?.rating;
        const bullet = data.stats.chess_bullet?.last?.rating;
        const badge = document.getElementById("sidebar-rating-badge");
        if (badge) {
          badge.textContent = rapid ? `⚡ ${rapid} Rapid` : (blitz ? `⚡ ${blitz} Blitz` : (bullet ? `⚡ ${bullet} Bullet` : ""));
        }
      }

      // Display avatar if available
      if (data.profile?.avatar) {
        const av = document.getElementById("sidebar-avatar");
        if (av) {
          av.innerHTML = `<img src="${data.profile.avatar}" alt="${user}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />`;
        }
      }

      const toastText = document.getElementById("library-toast-text");
      if (toastText) {
        toastText.textContent = data.new_games > 0
          ? `Synced ${data.new_games} real game(s) from Chess.com API for @${data.username}!`
          : `Connected to Chess.com for @${data.username}. All recent archives are up to date (${data.new_games} new).`;
      }
      await this.loadSidebarGames();
      if (this.currentView === "library") {
        await this.loadLibraryGames();
      }
      if (this.games.length > 0) {
        await this.selectGame(this.games[0].id);
      }
    } catch (e) {
      document.getElementById("sidebar-sync-text").textContent = "Sync Failed";
      alert(`Could not connect to Chess.com API: ${e.message}`);
    } finally {
      this._isSyncing = false;
    }
  },

  async loadSidebarGames() {
    const user = document.getElementById("sidebar-username")?.textContent || "";
    const filterUser = (user && user !== "Select Player" && user !== "Active Player") ? user : "";
    const data = await window.ChessStore.listGames({ username: filterUser });
    this.games = data.games || [];
    document.getElementById("sidebar-games-count").textContent = this.games.length;

    const container = document.getElementById("sidebar-games-list");
    container.innerHTML = "";

    this.games.forEach(g => {
      const card = document.createElement("div");
      card.dataset.gameId = g.id;
      card.className = `sidebar-game-card ${this.currentGame?.id === g.id ? "selected" : ""}`;
      card.onclick = () => this.selectGame(g.id);

      const isWin = g.result_string.toLowerCase().includes("won") || g.result_string.includes("+");
      const isLoss = g.result_string.toLowerCase().includes("lost") || g.result_string.includes("-");
      const resClass = isWin ? "res-win" : (isLoss ? "res-loss" : "res-draw");

      let badgeText = "Review";
      let badgeColor = "#81B64C";
      let badgeBg = "rgba(129, 182, 76, 0.22)";
      if (g.brilliants > 0) {
        badgeText = `${g.brilliants} !!`;
        badgeColor = "#1BADA6";
        badgeBg = "rgba(27, 173, 166, 0.22)";
      } else if (g.blunders > 0) {
        badgeText = `${g.blunders} ??`;
        badgeColor = "#FA412D";
        badgeBg = "rgba(250, 65, 45, 0.22)";
      } else if (g.great > 0) {
        badgeText = `${g.great} !`;
        badgeColor = "#5C8BB0";
        badgeBg = "rgba(92, 139, 176, 0.22)";
      }

      const accStr = g.accuracy_white ? `${g.accuracy_white}% Acc` : "Click to Review";

      card.innerHTML = `
        <div class="sgc-top">
          <span class="tc-pill">${g.time_class} ${g.time_control}</span>
          <span class="res-label ${resClass}">${g.result_string.split("(")[0].trim()}</span>
        </div>
        <div class="sgc-players">${g.white_username} vs ${g.black_username}</div>
        <div class="sgc-bottom">
          <span>${accStr}</span>
          <span class="badge-chip" style="color:${badgeColor}; background:${badgeBg};">${badgeText}</span>
        </div>
      `;
      container.appendChild(card);
    });
  },

  async selectGame(gameId, initialPly = null) {
    this.stopAutoplay();
    const token = (this._selectToken = (this._selectToken || 0) + 1);
    const meta = this.games.find(g => g.id === gameId);
    const wasReviewed = Boolean(meta && meta.is_reviewed);

    document.querySelectorAll("#sidebar-games-list .sidebar-game-card").forEach(el => {
      el.classList.toggle("selected", Number(el.dataset.gameId) === gameId);
    });

    const loadTimer = setTimeout(() => {
      if (token !== this._selectToken) return;
      const titleEl = document.getElementById("coach-title");
      const subEl = document.getElementById("coach-subtitle");
      if (titleEl) {
        titleEl.textContent = "Analyzing game moves...";
        titleEl.style.color = "#FFFFFF";
      }
      if (subEl) {
        subEl.textContent = "Computing CAPS2 accuracy & best-move lines...";
      }
    }, 120);

    let game = null;
    try {
      game = await window.ChessStore.getGameWithReview(gameId);
    } finally {
      clearTimeout(loadTimer);
    }
    if (token !== this._selectToken) return;
    if (!game) {
      this.renderReviewStep();
      return;
    }

    this.currentGame = game;
    this.latestGameId = game.id;

    // Default to first Brilliant or Blunder move if initialPly not specified, or ply 1
    const moves = game.review?.moves || [];
    if (initialPly !== null && initialPly <= moves.length) {
      this.currentPly = initialPly;
    } else {
      const keyMove = moves.find(m => m.classification === "brilliant" || m.classification === "blunder");
      this.currentPly = keyMove ? keyMove.ply : (moves.length > 0 ? 1 : 0);
    }

    // Auto-orient board to perspective of the chosen player
    const activeUser = (document.getElementById("sidebar-username")?.textContent || "").toLowerCase();
    if (activeUser && game.black_username.toLowerCase() === activeUser) {
      this.isFlipped = true;
    } else {
      this.isFlipped = false;
    }

    const topPlayer = this.isFlipped ? game.white_username : game.black_username;
    const topRating = this.isFlipped ? game.white_rating : game.black_rating;
    const botPlayer = this.isFlipped ? game.black_username : game.white_username;
    const botRating = this.isFlipped ? game.black_rating : game.white_rating;

    document.getElementById("top-player-name").textContent = topPlayer;
    document.getElementById("top-player-rating").textContent = `(${topRating})`;
    document.getElementById("top-player-avatar").textContent = topPlayer[0].toUpperCase();

    document.getElementById("bottom-player-name").textContent = botPlayer;
    document.getElementById("bottom-player-rating").textContent = `(${botRating})`;
    document.getElementById("bottom-player-avatar").textContent = botPlayer[0].toUpperCase();

    // Update header & player bars
    document.getElementById("review-matchup-title").textContent =
      `${game.white_username} (${game.white_rating}) vs ${game.black_username} (${game.black_rating})`;
    document.getElementById("review-opening-subtitle").textContent =
      `${game.review?.opening || game.eco_name} · ${game.time_class.toUpperCase()} (${game.time_control}) · ${game.result_string}`;

    // Accuracy cards
    const rev = game.review || {};
    document.getElementById("acc-white-val").textContent = `${rev.accuracy_white || 85.0}%`;
    document.getElementById("acc-white-sub").textContent = `${game.white_username} · Est. ${rev.estimated_rating_white || 1800}`;
    document.getElementById("acc-black-val").textContent = `${rev.accuracy_black || 82.0}%`;
    document.getElementById("acc-black-sub").textContent = `${game.black_username} · Est. ${rev.estimated_rating_black || 1750}`;

    this.renderBreakdownTable(rev.counts);
    this.renderMoveList(moves);
    this.renderEvalGraph(moves);
    this.renderReviewStep();
    if (!wasReviewed) {
      this.loadSidebarGames();
    }
  },

  renderBreakdownTable(counts) {
    const table = document.getElementById("breakdown-table");
    if (!counts) return;
    const order = [
      "brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "miss", "blunder"
    ];
    table.innerHTML = order.map(key => {
      const b = window.CHESS_ASSETS.badges[key];
      const wCnt = counts.w?.[key] ?? 0;
      const bCnt = counts.b?.[key] ?? 0;
      return `
        <div class="breakdown-row">
          <span class="bd-label" style="color:${b.color};">${b.label}</span>
          <span class="bd-count">${wCnt}</span>
          <div class="bd-icon">${b.svg}</div>
          <span class="bd-count" style="color:var(--text-secondary);">${bCnt}</span>
        </div>
      `;
    }).join("");
  },

  renderMoveList(moves) {
    const container = document.getElementById("review-move-list");
    container.innerHTML = "";
    for (let i = 0; i < moves.length; i += 2) {
      const wMove = moves[i];
      const bMove = moves[i + 1];
      const row = document.createElement("div");
      row.className = "move-pair-row";

      const wBadge = window.CHESS_ASSETS.badges[wMove.classification];
      const wSym = ["brilliant", "great", "inaccuracy", "mistake", "miss", "blunder"].includes(wMove.classification)
        ? wBadge.symbol : "";

      let bHtml = `<div></div>`;
      if (bMove) {
        const bBadge = window.CHESS_ASSETS.badges[bMove.classification];
        const bSym = ["brilliant", "great", "inaccuracy", "mistake", "miss", "blunder"].includes(bMove.classification)
          ? bBadge.symbol : "";
        bHtml = `
          <button class="move-btn" id="ply-btn-${bMove.ply}" onclick="App.goToPly(${bMove.ply})">
            <span>${bMove.san}${bSym}</span>
            <span style="color:${bBadge.color}; font-size:10px;">●</span>
          </button>
        `;
      }

      row.innerHTML = `
        <span class="move-num">${wMove.move_number}.</span>
        <button class="move-btn" id="ply-btn-${wMove.ply}" onclick="App.goToPly(${wMove.ply})">
          <span>${wMove.san}${wSym}</span>
          <span style="color:${wBadge.color}; font-size:10px;">●</span>
        </button>
        ${bHtml}
      `;
      container.appendChild(row);
    }
  },

  renderEvalGraph(moves) {
    const svg = document.getElementById("eval-graph-svg");
    if (!moves || moves.length === 0) {
      svg.innerHTML = "";
      return;
    }
    const w = 380;
    const h = 86;
    const midY = h / 2;

    const pts = moves.map((m, i) => {
      const x = (i / Math.max(1, moves.length - 1)) * w;
      const y = h - (m.win_pct_white / 100) * (h - 10) - 5;
      return { x, y, m };
    });

    const lineD = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
    const areaD = `M 0,${midY} L ${lineD} L ${w},${midY} Z`;

    const curIdx = Math.max(0, Math.min(moves.length - 1, this.currentPly - 1));
    const curPt = pts[curIdx];
    const curBadge = window.CHESS_ASSETS.badges[curPt.m.classification] || window.CHESS_ASSETS.badges.best;

    // Key dots for Brilliant / Blunder
    const keyDots = pts
      .filter(p => ["brilliant", "blunder"].includes(p.m.classification))
      .map(p => {
        const col = window.CHESS_ASSETS.badges[p.m.classification].color;
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${col}" />`;
      }).join("");

    svg.innerHTML = `
      <line x1="0" y1="${midY}" x2="${w}" y2="${midY}" stroke="#4A4742" stroke-width="1" stroke-dasharray="4 4"/>
      <path d="${areaD}" fill="rgba(234, 233, 228, 0.22)"/>
      <path d="M ${lineD}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linejoin="round"/>
      ${keyDots}
      <line x1="${curPt.x.toFixed(1)}" y1="0" x2="${curPt.x.toFixed(1)}" y2="${h}" stroke="${curBadge.color}" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="${curPt.x.toFixed(1)}" cy="${curPt.y.toFixed(1)}" r="6" fill="${curBadge.color}" stroke="#1E1D1B" stroke-width="2"/>
    `;

    const box = document.getElementById("eval-graph-box");
    box.onclick = (e) => {
      const rect = box.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      const targetPly = Math.max(1, Math.min(moves.length, Math.round(ratio * moves.length)));
      this.goToPly(targetPly);
    };
  },

  renderReviewStep() {
    if (!this.currentGame) return;
    const moves = this.currentGame.review?.moves || [];
    const step = this.currentPly > 0 ? moves[this.currentPly - 1] : null;
    const position = step ? step.position : INITIAL_BOARD_POSITION;

    // Update top/bottom player bars based on flip
    const topUser = this.isFlipped ? this.currentGame.white_username : this.currentGame.black_username;
    const topRating = this.isFlipped ? this.currentGame.white_rating : this.currentGame.black_rating;
    const botUser = this.isFlipped ? this.currentGame.black_username : this.currentGame.white_username;
    const botRating = this.isFlipped ? this.currentGame.black_rating : this.currentGame.white_rating;

    document.getElementById("top-player-name").textContent = topUser;
    document.getElementById("top-player-rating").textContent = `(${topRating})`;
    document.getElementById("top-player-avatar").textContent = topUser[0].toUpperCase();
    document.getElementById("bottom-player-name").textContent = botUser;
    document.getElementById("bottom-player-rating").textContent = `(${botRating})`;
    document.getElementById("bottom-player-avatar").textContent = botUser[0].toUpperCase();

    // Update Eval Bar
    const winPct = step ? step.win_pct_white : 52.0;
    const evalStr = step ? step.eval_str : "+0.20";
    document.getElementById("eval-bar-fill").style.height = `${winPct}%`;
    if (winPct >= 50) {
      document.getElementById("eval-label-bottom").textContent = evalStr;
      document.getElementById("eval-label-top").textContent = "";
    } else {
      document.getElementById("eval-label-top").textContent = evalStr;
      document.getElementById("eval-label-bottom").textContent = "";
    }

    // Highlight active move in Move List
    document.querySelectorAll("#review-move-list .move-btn").forEach(b => b.classList.remove("active"));
    if (step) {
      const activeBtn = document.getElementById(`ply-btn-${step.ply}`);
      if (activeBtn) {
        activeBtn.classList.add("active");
        activeBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    // Update Coach Card
    const coachCard = document.getElementById("coach-card");
    if (step) {
      const badge = window.CHESS_ASSETS.badges[step.classification] || window.CHESS_ASSETS.badges.best;
      coachCard.style.borderColor = badge.color;
      document.getElementById("coach-badge-icon").innerHTML = badge.svg;
      document.getElementById("coach-title").textContent = step.coach.title;
      document.getElementById("coach-title").style.color = badge.color;
      document.getElementById("coach-subtitle").textContent =
        `Move Accuracy: ${step.accuracy}% · Eval: ${step.eval_str}`;
      document.getElementById("coach-body").textContent = step.coach.body;
      document.getElementById("best-move-footer-label").textContent =
        `Engine Best Move: ${step.best_move.san} (Line: ${step.coach.best_line})`;
    } else {
      const badge = window.CHESS_ASSETS.badges.book;
      coachCard.style.borderColor = badge.color;
      document.getElementById("coach-badge-icon").innerHTML = badge.svg;
      document.getElementById("coach-title").textContent = "Starting Position";
      document.getElementById("coach-title").style.color = "#FFFFFF";
      document.getElementById("coach-subtitle").textContent = "Use > or right arrow key to step through moves";
      document.getElementById("coach-body").textContent =
        "Review every move with CAPS2 accuracy, tactical sacrifice detection (!!), and best-move arrows.";
    }

    // Render 8x8 Grid + Badges + Arrows
    const highlights = {};
    let cornerBadge = null;
    const arrows = [];

    if (step) {
      let hlClass = "hl-normal";
      if (step.classification === "brilliant") hlClass = "hl-brilliant";
      else if (step.classification === "great") hlClass = "hl-great";
      else if (step.classification === "blunder") hlClass = "hl-blunder";
      else if (step.classification === "mistake" || step.classification === "miss") hlClass = "hl-mistake";
      else if (step.classification === "inaccuracy") hlClass = "hl-inaccuracy";

      highlights[step.from] = hlClass;
      highlights[step.to] = hlClass;

      cornerBadge = {
        sq: step.to,
        classification: step.classification
      };

      const showBest = document.getElementById("toggle-best-arrow")?.checked ?? true;
      if (showBest && step.best_move) {
        if (step.best_move.uci !== step.uci) {
          // Show Green Arrow for the Best Move alternative that was missed, plus Red/Orange arrow for played move
          arrows.push({ from: step.from, to: step.to, color: window.CHESS_ASSETS.badges[step.classification].color, opacity: 0.55 });
          arrows.push({ from: step.best_move.from, to: step.best_move.to, color: "#81B64C", opacity: 0.92 });
        } else {
          // Played move WAS the best move!
          const col = step.classification === "brilliant" ? "#1BADA6" : "#81B64C";
          arrows.push({ from: step.from, to: step.to, color: col, opacity: 0.82 });
        }
      }
    }

    this.renderBoardDOM(
      "review-board-grid",
      "review-arrows-svg",
      position,
      highlights,
      cornerBadge,
      arrows,
      [],
      null
    );
    this.renderEvalGraph(moves);
  },

  renderBoardDOM(gridId, svgId, position, highlights, cornerBadge, arrows, legalTargets = [], onSquareClick = null) {
    const grid = document.getElementById(gridId);
    const svg = document.getElementById(svgId);
    grid.innerHTML = "";

    const ranks = this.isFlipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1];
    const files = this.isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

    ranks.forEach((rank, rIdx) => {
      files.forEach((fIdx, cIdx) => {
        const sq = FILES[fIdx] + rank;
        const isLight = (fIdx + rank) % 2 === 1;
        const sqEl = document.createElement("div");
        const hl = highlights[sq] || "";
        sqEl.className = `board-square ${isLight ? "light" : "dark"} ${hl}`;

        if (cIdx === 0) {
          const rk = document.createElement("span");
          rk.className = "coord-rank";
          rk.textContent = rank;
          sqEl.appendChild(rk);
        }
        if (rIdx === 7) {
          const fl = document.createElement("span");
          fl.className = "coord-file";
          fl.textContent = FILES[fIdx];
          sqEl.appendChild(fl);
        }

        const pieceCode = position[sq];
        if (pieceCode && window.CHESS_ASSETS.pieces[pieceCode]) {
          const pWrap = document.createElement("div");
          pWrap.className = "piece-svg-wrap";
          pWrap.innerHTML = window.CHESS_ASSETS.pieces[pieceCode];
          sqEl.appendChild(pWrap);
        }

        if (legalTargets.includes(sq)) {
          const dot = document.createElement("div");
          dot.className = pieceCode ? "legal-capture-ring" : "legal-dot";
          sqEl.appendChild(dot);
        }

        if (cornerBadge && cornerBadge.sq === sq) {
          const badgeObj = window.CHESS_ASSETS.badges[cornerBadge.classification];
          if (badgeObj) {
            const bEl = document.createElement("div");
            bEl.className = "square-corner-badge";
            bEl.innerHTML = badgeObj.svg;
            sqEl.appendChild(bEl);
          }
        }

        if (onSquareClick) {
          sqEl.onclick = () => onSquareClick(sq);
        }

        grid.appendChild(sqEl);
      });
    });

    // Draw SVG Arrows
    const sqSize = 520 / 8;
    const sqCenter = (sq) => {
      const f = FILES.indexOf(sq[0]);
      const r = parseInt(sq[1], 10);
      const col = this.isFlipped ? (7 - f) : f;
      const row = this.isFlipped ? (r - 1) : (8 - r);
      return {
        x: col * sqSize + sqSize / 2,
        y: row * sqSize + sqSize / 2
      };
    };

    svg.innerHTML = arrows.map(a => {
      const c1 = sqCenter(a.from);
      const c2 = sqCenter(a.to);
      const dx = c2.x - c1.x;
      const dy = c2.y - c1.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) return "";
      const ux = dx / len;
      const uy = dy / len;
      const px = -uy;
      const py = ux;

      const sx = c1.x + ux * (sqSize * 0.20);
      const sy = c1.y + uy * (sqSize * 0.20);
      const headLen = sqSize * 0.34;
      const headW = sqSize * 0.23;
      const shaftW = sqSize * 0.13;
      const ex = c2.x - ux * (headLen * 0.72);
      const ey = c2.y - uy * (headLen * 0.72);

      const pts = [
        `${(sx + px * shaftW / 2).toFixed(1)},${(sy + py * shaftW / 2).toFixed(1)}`,
        `${(ex + px * shaftW / 2).toFixed(1)},${(ey + py * shaftW / 2).toFixed(1)}`,
        `${(ex + px * headW).toFixed(1)},${(ey + py * headW).toFixed(1)}`,
        `${c2.x.toFixed(1)},${c2.y.toFixed(1)}`,
        `${(ex - px * headW).toFixed(1)},${(ey - py * headW).toFixed(1)}`,
        `${(ex - px * shaftW / 2).toFixed(1)},${(ey - py * shaftW / 2).toFixed(1)}`,
        `${(sx - px * shaftW / 2).toFixed(1)},${(sy - py * shaftW / 2).toFixed(1)}`
      ].join(" L ");

      return `<path d="M ${pts} Z" fill="${a.color}" fill-opacity="${a.opacity ?? 0.85}" />`;
    }).join("");
  },

  goToPly(ply) {
    if (!this.currentGame) return;
    const moves = this.currentGame.review?.moves || [];
    this.currentPly = Math.max(0, Math.min(moves.length, ply));
    const step = this.currentPly > 0 ? moves[this.currentPly - 1] : null;
    if (step?.classification === "brilliant") {
      this.playTone(580, 0.12, "sine");
    } else if (step?.classification === "blunder") {
      this.playTone(180, 0.14, "sawtooth");
    } else {
      this.playTone(320, 0.05, "triangle");
    }
    this.renderReviewStep();
  },

  stepPly(delta) {
    this.goToPly(this.currentPly + delta);
  },

  goToLastPly() {
    const moves = this.currentGame?.review?.moves || [];
    this.goToPly(moves.length);
  },

  flipBoard() {
    this.isFlipped = !this.isFlipped;
    if (this.currentView === "review") this.renderReviewStep();
    else if (this.currentView === "simulate") this.renderSimulatorBoard();
  },

  toggleAutoplay() {
    if (this.autoplayTimer) {
      this.stopAutoplay();
      return;
    }
    document.getElementById("btn-autoplay").textContent = "Pause";
    this.autoplayTimer = setInterval(() => {
      const moves = this.currentGame?.review?.moves || [];
      if (this.currentPly >= moves.length) {
        this.stopAutoplay();
      } else {
        this.stepPly(1);
      }
    }, 1100);
  },

  stopAutoplay() {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
    const btn = document.getElementById("btn-autoplay");
    if (btn) btn.textContent = "Play";
  },

  jumpToNextKeyMoment() {
    const moves = this.currentGame?.review?.moves || [];
    if (!moves.length) return;
    const keyTypes = ["brilliant", "great", "blunder", "mistake", "inaccuracy"];
    for (let i = this.currentPly; i < moves.length; i++) {
      if (keyTypes.includes(moves[i].classification)) {
        this.goToPly(moves[i].ply);
        return;
      }
    }
    for (let i = 0; i < this.currentPly; i++) {
      if (keyTypes.includes(moves[i].classification)) {
        this.goToPly(moves[i].ply);
        return;
      }
    }
  },

  previewBestMoveLine() {
    const chk = document.getElementById("toggle-best-arrow");
    if (chk) chk.checked = true;
    this.renderReviewStep();
  },

  /* ========================================================================
     MATCH SIMULATOR & LIVE BEST-MOVE VISUALIZER
     ======================================================================== */
  async startNewSimulation() {
    this.stopSimAutoRun();
    const opening = document.getElementById("sim-opening-select")?.value || "italian";
    const mode = document.getElementById("sim-mode-select")?.value || "ai_vs_ai";

    const data = window.ChessEngine.simulateNew(opening);

    this.simState = {
      fen: data.fen,
      turn: data.turn,
      moveNumber: data.move_number,
      position: data.position,
      evalCp: data.eval_cp,
      evalStr: data.eval_str,
      winPctWhite: data.win_pct_white,
      topCandidates: data.top_candidates || [],
      legalMoves: data.legal_moves || [],
      history: data.history || [],
      lastMove: data.history?.length ? data.history[data.history.length - 1] : null,
      selectedSquare: null,
      autoTimer: null,
      gameOver: false
    };

    document.getElementById("sim-white-name").textContent =
      mode === "play_vs_bot" ? "You (White)" : "GrandmasterSim_W";
    document.getElementById("sim-black-name").textContent = "CoachBot_Black";

    const badge = window.CHESS_ASSETS.badges.best;
    document.getElementById("sim-coach-badge").innerHTML = badge.svg;
    document.getElementById("sim-coach-title").textContent = data.opening_name;
    document.getElementById("sim-coach-sub").textContent =
      `Top Engine Move: ${this.simState.topCandidates[0]?.san || "e4"} (${this.simState.topCandidates[0]?.eval_str || "+0.25"})`;
    document.getElementById("sim-coach-body").textContent =
      mode === "play_vs_bot"
        ? "Your turn! The arrows on the board show the Top 3 Best Moves. Click a piece on the board or click any candidate card above to play it."
        : "Click 'Auto-Simulate' or 'Step 1 Move' to watch the simulated match with real-time Best Move arrows.";

    this.renderSimulatorBoard();
  },

  async stepSimulation() {
    if (this.simState.gameOver) return;
    const style = document.getElementById("sim-style-select")?.value || "tactical";

    const data = window.ChessEngine.simulateStep(this.simState.fen, style, 2);

    if (data.game_over && !data.played) {
      this.simState.gameOver = true;
      this.stopSimAutoRun();
      document.getElementById("sim-turn-indicator").textContent = data.reason || "Game Over";
      return;
    }

    this.applySimMoveResponse(data);
  },

  applySimMoveResponse(data) {
    this.simState.fen = data.fen_after;
    this.simState.turn = data.color === "w" ? "b" : "w";
    this.simState.position = data.position;
    this.simState.evalCp = data.eval_cp;
    this.simState.evalStr = data.eval_str;
    this.simState.winPctWhite = data.win_pct_white;
    this.simState.topCandidates = data.next_best_candidates || [];
    this.simState.legalMoves = data.legal_moves || [];
    this.simState.lastMove = data.played;
    this.simState.selectedSquare = null;
    this.simState.history.push(data.played);

    if (data.game_over) {
      this.simState.gameOver = true;
      this.stopSimAutoRun();
    }

    this.playTone(data.played.classification === "best" ? 420 : 300, 0.06);

    // Update Coach card in Simulator
    const badge = window.CHESS_ASSETS.badges[data.played.classification] || window.CHESS_ASSETS.badges.best;
    document.getElementById("sim-coach-card").style.borderColor = badge.color;
    document.getElementById("sim-coach-badge").innerHTML = badge.svg;
    document.getElementById("sim-coach-title").textContent = data.coach.title;
    document.getElementById("sim-coach-title").style.color = badge.color;
    document.getElementById("sim-coach-sub").textContent =
      `Move Accuracy: ${data.played.accuracy}% · Next Best: ${this.simState.topCandidates[0]?.san || "-"}`;
    document.getElementById("sim-coach-body").textContent = data.coach.body;

    this.renderSimulatorBoard();
  },

  async executeSimPlayerMove(fromSq, toSq) {
    if (this.simState.gameOver) return;
    const data = window.ChessEngine.simulatePlayerMove(this.simState.fen, fromSq, toSq);
    if (!data) return;
    this.applySimMoveResponse(data);

    // If in Play vs Coach Bot mode and game not over, let the Coach Bot reply automatically!
    const mode = document.getElementById("sim-mode-select")?.value;
    if (mode === "play_vs_bot" && !this.simState.gameOver && this.simState.turn === "b") {
      setTimeout(() => this.stepSimulation(), 480);
    }
  },

  handleSimSquareClick(sq) {
    if (this.simState.gameOver) return;
    const sel = this.simState.selectedSquare;

    if (sel) {
      const matchingLegal = this.simState.legalMoves.find(m => m.from === sel && m.to === sq);
      if (matchingLegal) {
        this.executeSimPlayerMove(sel, sq);
        return;
      }
    }

    const piece = this.simState.position[sq];
    if (piece && piece[0] === this.simState.turn) {
      this.simState.selectedSquare = (sel === sq) ? null : sq;
    } else {
      this.simState.selectedSquare = null;
    }
    this.renderSimulatorBoard();
  },

  renderSimulatorBoard() {
    const s = this.simState;
    document.getElementById("sim-turn-indicator").textContent =
      s.gameOver ? "Match Complete" : (s.turn === "w" ? "White to Move" : "Black to Move");
    document.getElementById("sim-white-status").textContent = s.turn === "w" ? "Thinking / Active" : "Waiting";
    document.getElementById("sim-black-status").textContent = s.turn === "b" ? "Thinking / Active" : "Waiting";

    // Eval Bar & Win Probability
    document.getElementById("sim-eval-fill").style.height = `${s.winPctWhite}%`;
    document.getElementById("sim-eval-bottom").textContent = s.winPctWhite >= 50 ? s.evalStr : "";
    document.getElementById("sim-eval-top").textContent = s.winPctWhite < 50 ? s.evalStr : "";
    document.getElementById("sim-win-pct-text").textContent = `${s.winPctWhite}%`;
    document.getElementById("sim-win-pct-bar").style.width = `${s.winPctWhite}%`;

    // Highlights & Corner Badge for Last Played Simulated Move
    const highlights = {};
    let cornerBadge = null;
    if (s.lastMove) {
      highlights[s.lastMove.from] = "hl-normal";
      highlights[s.lastMove.to] = "hl-normal";
      cornerBadge = { sq: s.lastMove.to, classification: s.lastMove.classification || "best" };
    }
    if (s.selectedSquare) {
      highlights[s.selectedSquare] = "hl-selected";
    }

    const legalTargets = s.selectedSquare
      ? s.legalMoves.filter(m => m.from === s.selectedSquare).map(m => m.to)
      : [];

    // Draw Top 3 Best Candidate Arrows (Rank 3 first so Rank 1 is on top!)
    const rankColors = ["#81B64C", "#5C8BB0", "#F7C631"];
    const rankOpacities = [0.92, 0.65, 0.48];
    const arrows = [...s.topCandidates]
      .reverse()
      .map(c => ({
        from: c.from,
        to: c.to,
        color: rankColors[c.rank - 1] || "#81B64C",
        opacity: rankOpacities[c.rank - 1] || 0.7
      }));

    this.renderBoardDOM(
      "sim-board-grid",
      "sim-arrows-svg",
      s.position,
      highlights,
      cornerBadge,
      arrows,
      legalTargets,
      (sq) => this.handleSimSquareClick(sq)
    );

    // Render Top 3 Candidate Cards on Right Panel
    const candList = document.getElementById("sim-candidates-list");
    if (s.topCandidates.length === 0) {
      candList.innerHTML = `<div class="sim-controls-card">No legal moves available (Game Over).</div>`;
    } else {
      const rankLabels = ["Best Move ★", "2nd Best Candidate", "3rd Candidate"];
      candList.innerHTML = s.topCandidates.map((c, idx) => `
        <div class="candidate-card rank-${c.rank}" onclick="App.executeSimPlayerMove('${c.from}', '${c.to}')">
          <div class="cand-left">
            <div class="cand-rank-pill">#${c.rank}</div>
            <div class="cand-info">
              <h4>${c.san} <span style="font-weight:500; font-size:11px; color:var(--text-muted);">(${rankLabels[idx]})</span></h4>
              <p>Line: ${(c.pv || [c.san]).join(" → ")}</p>
            </div>
          </div>
          <div class="cand-eval">${c.eval_str}</div>
        </div>
      `).join("");
    }

    // Render Simulated Match Log in Left Sidebar
    document.getElementById("sim-ply-counter").textContent = `${s.history.length} moves`;
    const logEl = document.getElementById("sim-move-log");
    logEl.innerHTML = s.history.map((m, i) => {
      const b = window.CHESS_ASSETS.badges[m.classification] || window.CHESS_ASSETS.badges.best;
      const moveLabel = i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m.san}` : `${Math.floor(i / 2) + 1}... ${m.san}`;
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#2C2A27; padding:6px 10px; border-radius:7px; font-size:12px;">
          <span style="font-weight:700;">${moveLabel}</span>
          <span style="color:${b.color}; font-weight:700; font-size:11px;">${b.symbol} ${b.label}</span>
        </div>
      `;
    }).join("");
    logEl.scrollTop = logEl.scrollHeight;
  },

  toggleSimAutoRun() {
    if (this.simState.autoTimer) {
      this.stopSimAutoRun();
      return;
    }
    const speed = parseInt(document.getElementById("sim-speed-select")?.value || "1100", 10);
    document.getElementById("btn-sim-auto").textContent = "⏸ Pause Sim";
    this.simState.autoTimer = setInterval(() => {
      if (this.simState.gameOver || this.simState.history.length >= 60) {
        this.stopSimAutoRun();
      } else {
        this.stepSimulation();
      }
    }, speed);
  },

  stopSimAutoRun() {
    if (this.simState.autoTimer) {
      clearInterval(this.simState.autoTimer);
      this.simState.autoTimer = null;
    }
    const btn = document.getElementById("btn-sim-auto");
    if (btn) btn.textContent = "▶ Auto-Simulate";
  },

  async sendSimToFullReview() {
    this.stopSimAutoRun();
    if (this.simState.history.length === 0) return;
    const wName = document.getElementById("sim-white-name")?.textContent || "GrandmasterSim_W";
    const bName = document.getElementById("sim-black-name")?.textContent || "CoachBot_Black";
    const movesSan = this.simState.history.map(m => m.san);

    const movePairs = [];
    for (let i = 0; i < movesSan.length; i += 2) {
      const turnNum = Math.floor(i / 2) + 1;
      movePairs.push(movesSan[i + 1] ? `${turnNum}. ${movesSan[i]} ${movesSan[i + 1]}` : `${turnNum}. ${movesSan[i]}`);
    }
    const ts = Math.floor(Date.now() / 1000);
    const pgn = `[Event "Match Simulator Game"]\n[White "${wName}"]\n[Black "${bName}"]\n[Result "*"]\n\n${movePairs.join(" ")} *`;

    const review = await window.ChessEngine.analyzeGamePgnAsync(pgn, 2);
    const { id } = await window.ChessStore.insertImportedGame({
      chess_com_url: `https://www.chess.com/game/simulated/${ts}`,
      end_time: ts,
      time_control: "600",
      time_class: "rapid",
      rated: false,
      white_username: wName,
      white_rating: 2000,
      black_username: bName,
      black_rating: 2000,
      result_string: "Simulated Match",
      eco_name: review.opening || "Simulated Match",
      pgn
    }, review);

    if (id) {
      this.switchView("review");
      await this.loadSidebarGames();
      await this.selectGame(id, 1);
    }
  },

  /* ========================================================================
     LIBRARY & SETTINGS VIEWS
     ======================================================================== */
  filterLibrary(tc, btnEl) {
    this.libraryFilter = tc;
    document.querySelectorAll(".filter-tabs .tab-pill").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    this.loadLibraryGames();
  },

  async loadLibraryGames() {
    const search = document.getElementById("lib-search-input")?.value || "";
    const user = document.getElementById("lib-username-input")?.value ||
                 document.getElementById("sidebar-username")?.textContent || "";
    const filterUser = (user && user !== "Select Player" && user !== "Active Player") ? user : "";
    const data = await window.ChessStore.listGames({
      timeClass: this.libraryFilter,
      searchQuery: search,
      username: filterUser
    });
    const games = data.games || [];
    const kpis = data.kpis || {};

    document.getElementById("kpi-total-games").textContent = kpis.total_games ?? games.length;
    document.getElementById("kpi-avg-acc").textContent = `${kpis.avg_accuracy ?? 84.5}%`;
    document.getElementById("kpi-brilliants").textContent = kpis.total_brilliants ?? 1;
    document.getElementById("kpi-blunders").textContent = kpis.avg_blunders ?? 1.0;

    const tbody = document.getElementById("library-table-body");
    tbody.innerHTML = games.map(g => {
      const isWin = g.result_string.toLowerCase().includes("won") || g.result_string.includes("+");
      const isLoss = g.result_string.toLowerCase().includes("lost") || g.result_string.includes("-");
      const resCol = isWin ? "#81B64C" : (isLoss ? "#FA412D" : "#9E9B95");
      const accText = g.accuracy_white ? `${g.accuracy_white}% / ${g.accuracy_black}%` : "Ready to Analyze";
      const hiText = `${g.brilliants || 0} !! · ${g.blunders || 0} ??`;

      return `
        <tr>
          <td><span class="tc-pill">${g.time_class} ${g.time_control}</span></td>
          <td style="font-weight:600;">${g.white_username} (${g.white_rating}) vs ${g.black_username} (${g.black_rating})</td>
          <td style="color:${resCol}; font-weight:700;">${g.result_string}</td>
          <td style="color:var(--text-secondary);">${g.eco_name || "Standard"}</td>
          <td style="font-weight:800; color:var(--brand-green-light);">${accText}</td>
          <td style="font-size:12px; color:var(--text-secondary);">${hiText}</td>
          <td>
            <button class="btn-primary" onclick="App.openGameFromLibrary(${g.id})">
              ${g.is_reviewed ? "View Review" : "Analyze Free"}
            </button>
          </td>
        </tr>
      `;
    }).join("");
  },

  async openGameFromLibrary(gameId) {
    this.switchView("review");
    await this.selectGame(gameId);
  },

  async openLatestGameReview() {
    this.switchView("review");
    await this.selectGame(this.latestGameId || 1);
  },

  setBoardTheme(themeName, btnEl) {
    document.documentElement.setAttribute("data-board-theme", themeName);
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");
    window.ChessStore.updateSettings({ board_theme: themeName });
  },

  async saveSettings() {
    const username = document.getElementById("settings-username").value.trim() || "DilanChess";
    const pollInterval = document.getElementById("settings-poll-interval").value;
    const theme = document.documentElement.getAttribute("data-board-theme") || "green";
    window.ChessStore.updateSettings({
      username,
      poll_interval: pollInterval,
      board_theme: theme
    });
    await this.loadStatus();
    await this.triggerSync(false, username);
    this.switchView("review");
  }
};

window.App = App;
window.addEventListener("DOMContentLoaded", () => App.init());
