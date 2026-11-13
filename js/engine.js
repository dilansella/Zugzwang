/**
 * Chess Rules, PGN Parser, Tactical Engine, CAPS2 Classifier, & Match Simulator
 * Pure-JavaScript client-side engine matching the calibrated review_version=3 logic,
 * with Web Worker multi-core parallelization and non-blocking async fallback.
 */
(function (root) {
  "use strict";

  const FILES = "abcdefgh";
  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const PIECE_VALUES = {
    P: 100,
    N: 320,
    B: 330,
    R: 500,
    Q: 900,
    K: 20000,
  };

  const PST = {
    P: [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5,  5, 10, 27, 27, 10,  5,  5],
      [0,  0,  0, 24, 24,  0,  0,  0],
      [5, -5,-10,  0,  0,-10, -5,  5],
      [5, 10, 10,-24,-24, 10, 10,  5],
      [0,  0,  0,  0,  0,  0,  0,  0],
    ],
    N: [
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50],
    ],
    B: [
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  8, 12, 12,  8,  0,-10],
      [-10,  6,  6, 12, 12,  6,  6,-10],
      [-10,  0, 12, 12, 12, 12,  0,-10],
      [-10, 12, 12, 12, 12, 12, 12,-10],
      [-10,  6,  0,  0,  0,  0,  6,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20],
    ],
    R: [
      [0,  0,  0,  0,  0,  0,  0,  0],
      [5, 15, 15, 15, 15, 15, 15,  5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [-5,  0,  0,  0,  0,  0,  0, -5],
      [0,  0,  0,  8,  8,  0,  0,  0],
    ],
    Q: [
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [-5,  0,  5,  5,  5,  5,  0, -5],
      [0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20],
    ],
    K: [
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [20, 20,  0,  0,  0,  0, 20, 20],
      [20, 30, 10,  0,  0, 10, 30, 20],
    ],
  };

  const OPENING_BOOK = {
    "e4 e5 Nf3 Nc6": "C44 King's Knight Opening",
    "e4 e5 Nf3 Nc6 Bb5": "C60 Ruy Lopez",
    "e4 e5 Nf3 Nc6 Bc4": "C50 Italian Game",
    "e4 e5 Nf3 Nc6 Bc4 Bc5": "C50 Italian Game: Giuoco Piano",
    "e4 e5 Nf3 Nc6 Bc4 Nf6": "C55 Two Knights Defense",
    "e4 e5 Nf3 Nc6 d4": "C44 Scotch Game",
    "e4 e5 Nc3": "C25 Vienna Game",
    "e4 e5 Nc3 Nf6": "C26 Vienna Game: Falkbeer Variation",
    "e4 e5 Nc3 Nf6 d4 Nc6": "C47 Four Knights Scotch",
    "e4 e5 Nc3 Nf6 d4 Nc6 Nf3 Bb4": "C47 Four Knights Scotch",
    "e4 e5 Nc3 Nf6 Nf3 Nc6": "C46 Four Knights Game",
    "e4 e5 Nc3 Nf6 Nf3 Bb4": "C46 Four Knights Game",
    "e4 c5": "B20 Sicilian Defense",
    "e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6": "B90 Sicilian Defense: Najdorf",
    "e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 g6": "B34 Sicilian Defense: Accelerated Dragon",
    "e4 e6": "C00 French Defense",
    "e4 e6 d4 d5": "C01 French Defense",
    "e4 e6 d4 d5 Nc3 Nf6": "C11 French Defense: Classical",
    "e4 c6": "B10 Caro-Kann Defense",
    "e4 c6 d4 d5": "B12 Caro-Kann Defense",
    "d4 d5 c4": "D06 Queen's Gambit",
    "d4 d5 c4 e6": "D30 Queen's Gambit Declined",
    "d4 d5 c4 c6": "D10 Slav Defense",
    "d4 d5 Bf4": "D02 London System",
    "d4 Nf6 c4 g6 Nc3 Bg7": "E60 King's Indian Defense",
    "d4 Nf6 c4 e6 Nc3 Bb4": "E20 Nimzo-Indian Defense",
    "c4": "A10 English Opening",
    "Nf3 d5 g3": "A07 King's Indian Attack",
  };

  const SIMULATION_OPENINGS = {
    standard: { name: "Standard Starting Position", moves: [] },
    italian: { name: "C50 Italian Game: Giuoco Piano", moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6"] },
    french_tactical: { name: "C11 French Defense: Kingside Attack", moves: ["e4", "e6", "d4", "d5", "Nc3", "Nf6", "e5", "Nfd7", "Nf3", "c5", "Bd3", "Nc6", "O-O", "Be7"] },
    sicilian: { name: "B90 Sicilian Defense: Open", moves: ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6"] },
    queens_gambit: { name: "D30 Queen's Gambit Declined", moves: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5", "Be7"] },
  };

  const MVV_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

  function rcToSq(r, c) {
    return FILES[c] + String(8 - r);
  }

  function sqToRc(sq) {
    return [8 - parseInt(sq[1], 10), FILES.indexOf(sq[0])];
  }

  function sameMove(a, b) {
    return (
      a != null &&
      b != null &&
      a[0] === b[0] &&
      a[1] === b[1] &&
      a[2] === b[2] &&
      a[3] === b[3] &&
      a[4] === b[4]
    );
  }

  // Precompute jump/ray/PST tables once
  const KNIGHT_SQS = [];
  const KING_SQS = [];
  const ORTHO_RAYS = [];
  const DIAG_RAYS = [];
  for (let r = 0; r < 8; r++) {
    KNIGHT_SQS[r] = [];
    KING_SQS[r] = [];
    ORTHO_RAYS[r] = [];
    DIAG_RAYS[r] = [];
    for (let c = 0; c < 8; c++) {
      const nList = [];
      const nOffs = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
      for (let i = 0; i < nOffs.length; i++) {
        const nr = r + nOffs[i][0];
        const nc = c + nOffs[i][1];
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) nList.push([nr, nc]);
      }
      KNIGHT_SQS[r][c] = nList;

      const kList = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) kList.push([nr, nc]);
        }
      }
      KING_SQS[r][c] = kList;

      const oRays = [];
      const oDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (let i = 0; i < oDirs.length; i++) {
        const ray = [];
        let nr = r + oDirs[i][0];
        let nc = c + oDirs[i][1];
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          ray.push([nr, nc]);
          nr += oDirs[i][0];
          nc += oDirs[i][1];
        }
        if (ray.length) oRays.push(ray);
      }
      ORTHO_RAYS[r][c] = oRays;

      const dRays = [];
      const dDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (let i = 0; i < dDirs.length; i++) {
        const ray = [];
        let nr = r + dDirs[i][0];
        let nc = c + dDirs[i][1];
        while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          ray.push([nr, nc]);
          nr += dDirs[i][0];
          nc += dDirs[i][1];
        }
        if (ray.length) dRays.push(ray);
      }
      DIAG_RAYS[r][c] = dRays;
    }
  }

  const ALL_PST = {};
  for (const pt of Object.keys(PST)) {
    const tbl = PST[pt];
    const pval = PIECE_VALUES[pt];
    const wGrid = [];
    const bGrid = [];
    for (let r = 0; r < 8; r++) {
      const wRow = [];
      const bRow = [];
      for (let c = 0; c < 8; c++) {
        wRow.push(pval + tbl[r][c]);
        bRow.push(-(pval + tbl[7 - r][c]));
      }
      wGrid.push(wRow);
      bGrid.push(bRow);
    }
    ALL_PST["w" + pt] = wGrid;
    ALL_PST["b" + pt] = bGrid;
  }

  class ChessBoard {
    constructor(fen = START_FEN) {
      this.grid = [];
      this.turn = "w";
      this.castling = "KQkq";
      this.ep = "-";
      this.halfmove = 0;
      this.fullmove = 1;
      this._score = null;
      this._wk = null;
      this._bk = null;
      this._wb = 0;
      this._bb = 0;
      this.loadFen(fen);
    }

    clone() {
      const b = Object.create(ChessBoard.prototype);
      const og = this.grid;
      b.grid = [
        og[0].slice(), og[1].slice(), og[2].slice(), og[3].slice(),
        og[4].slice(), og[5].slice(), og[6].slice(), og[7].slice(),
      ];
      b.turn = this.turn;
      b.castling = this.castling;
      b.ep = this.ep;
      b.halfmove = this.halfmove;
      b.fullmove = this.fullmove;
      b._score = null;
      b._wk = null;
      b._bk = null;
      b._wb = 0;
      b._bb = 0;
      return b;
    }

    loadFen(fen) {
      const parts = fen.trim().split(/\s+/);
      const rows = parts[0].split("/");
      this.grid = Array.from({ length: 8 }, () => new Array(8).fill(null));
      for (let r = 0; r < rows.length && r < 8; r++) {
        let c = 0;
        const rowStr = rows[r];
        for (let i = 0; i < rowStr.length; i++) {
          const ch = rowStr[i];
          if (ch >= "1" && ch <= "8") {
            c += parseInt(ch, 10);
          } else {
            const color = ch === ch.toUpperCase() ? "w" : "b";
            this.grid[r][c] = color + ch.toUpperCase();
            c += 1;
          }
        }
      }
      this.turn = parts.length > 1 ? parts[1] : "w";
      this.castling = parts.length > 2 ? (parts[2] === "-" ? "" : parts[2]) : "KQkq";
      this.ep = parts.length > 3 ? parts[3] : "-";
      this.halfmove = parts.length > 4 && /^\d+$/.test(parts[4]) ? parseInt(parts[4], 10) : 0;
      this.fullmove = parts.length > 5 && /^\d+$/.test(parts[5]) ? parseInt(parts[5], 10) : 1;
      this._score = null;
      this._wk = null;
      this._bk = null;
      this._wb = 0;
      this._bb = 0;
    }

    toFen() {
      const rows = [];
      for (let r = 0; r < 8; r++) {
        let empty = 0;
        let s = "";
        for (let c = 0; c < 8; c++) {
          const p = this.grid[r][c];
          if (p == null) {
            empty += 1;
          } else {
            if (empty) {
              s += String(empty);
              empty = 0;
            }
            s += p[0] === "w" ? p[1] : p[1].toLowerCase();
          }
        }
        if (empty) s += String(empty);
        rows.push(s);
      }
      const cast = this.castling ? this.castling : "-";
      return `${rows.join("/")} ${this.turn} ${cast} ${this.ep} ${this.halfmove} ${this.fullmove}`;
    }

    toPositionDict() {
      const pos = {};
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.grid[r][c]) {
            pos[rcToSq(r, c)] = this.grid[r][c];
          }
        }
      }
      return pos;
    }

    findKing(color) {
      const target = color + "K";
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.grid[r][c] === target) return [r, c];
        }
      }
      return null;
    }

    isSquareAttacked(r, c, byColor) {
      const grid = this.grid;
      let pr, oppP, oppN, oppK, oppR, oppB, oppQ;
      if (byColor === "w") {
        pr = r + 1;
        oppP = "wP"; oppN = "wN"; oppK = "wK"; oppR = "wR"; oppB = "wB"; oppQ = "wQ";
      } else {
        pr = r - 1;
        oppP = "bP"; oppN = "bN"; oppK = "bK"; oppR = "bR"; oppB = "bB"; oppQ = "bQ";
      }

      if (pr >= 0 && pr < 8) {
        const prow = grid[pr];
        if ((c > 0 && prow[c - 1] === oppP) || (c < 7 && prow[c + 1] === oppP)) {
          return true;
        }
      }
      const nList = KNIGHT_SQS[r][c];
      for (let i = 0; i < nList.length; i++) {
        const sq = nList[i];
        if (grid[sq[0]][sq[1]] === oppN) return true;
      }
      const kList = KING_SQS[r][c];
      for (let i = 0; i < kList.length; i++) {
        const sq = kList[i];
        if (grid[sq[0]][sq[1]] === oppK) return true;
      }
      const oRays = ORTHO_RAYS[r][c];
      for (let i = 0; i < oRays.length; i++) {
        const ray = oRays[i];
        for (let j = 0; j < ray.length; j++) {
          const sq = ray[j];
          const p = grid[sq[0]][sq[1]];
          if (p) {
            if (p === oppR || p === oppQ) return true;
            break;
          }
        }
      }
      const dRays = DIAG_RAYS[r][c];
      for (let i = 0; i < dRays.length; i++) {
        const ray = dRays[i];
        for (let j = 0; j < ray.length; j++) {
          const sq = ray[j];
          const p = grid[sq[0]][sq[1]];
          if (p) {
            if (p === oppB || p === oppQ) return true;
            break;
          }
        }
      }
      return false;
    }

    inCheck(color) {
      const kp = this.findKing(color);
      if (!kp) return false;
      return this.isSquareAttacked(kp[0], kp[1], color === "w" ? "b" : "w");
    }

    pseudoMoves() {
      const moves = [];
      const grid = this.grid;
      const color = this.turn;
      const opp = color === "w" ? "b" : "w";
      let epR = -1, epC = -1;
      if (this.ep && this.ep !== "-") {
        epR = 8 - parseInt(this.ep[1], 10);
        epC = this.ep.charCodeAt(0) - 97;
      }

      const step = color === "w" ? -1 : 1;
      const startR = color === "w" ? 6 : 1;
      const promoR = color === "w" ? 0 : 7;

      for (let r = 0; r < 8; r++) {
        const row = grid[r];
        for (let c = 0; c < 8; c++) {
          const p = row[c];
          if (!p || p[0] !== color) continue;
          const pt = p[1];
          if (pt === "P") {
            const nr = r + step;
            if (nr >= 0 && nr < 8) {
              const nrow = grid[nr];
              if (nrow[c] == null) {
                if (nr === promoR) {
                  moves.push([r, c, nr, c, "Q"]);
                  moves.push([r, c, nr, c, "R"]);
                  moves.push([r, c, nr, c, "B"]);
                  moves.push([r, c, nr, c, "N"]);
                } else {
                  moves.push([r, c, nr, c, null]);
                  if (r === startR && grid[r + 2 * step][c] == null) {
                    moves.push([r, c, r + 2 * step, c, null]);
                  }
                }
              }
              for (const dc of [-1, 1]) {
                const nc = c + dc;
                if (nc >= 0 && nc < 8) {
                  const target = nrow[nc];
                  if (target && target[0] === opp) {
                    if (nr === promoR) {
                      moves.push([r, c, nr, nc, "Q"]);
                      moves.push([r, c, nr, nc, "R"]);
                      moves.push([r, c, nr, nc, "B"]);
                      moves.push([r, c, nr, nc, "N"]);
                    } else {
                      moves.push([r, c, nr, nc, null]);
                    }
                  } else if (nr === epR && nc === epC) {
                    moves.push([r, c, nr, nc, "EP"]);
                  }
                }
              }
            }
          } else if (pt === "N") {
            const list = KNIGHT_SQS[r][c];
            for (let i = 0; i < list.length; i++) {
              const nr = list[i][0], nc = list[i][1];
              const t = grid[nr][nc];
              if (!t || t[0] === opp) moves.push([r, c, nr, nc, null]);
            }
          } else if (pt === "B") {
            const rays = DIAG_RAYS[r][c];
            for (let i = 0; i < rays.length; i++) {
              const ray = rays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (!t) {
                  moves.push([r, c, nr, nc, null]);
                } else {
                  if (t[0] === opp) moves.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
          } else if (pt === "R") {
            const rays = ORTHO_RAYS[r][c];
            for (let i = 0; i < rays.length; i++) {
              const ray = rays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (!t) {
                  moves.push([r, c, nr, nc, null]);
                } else {
                  if (t[0] === opp) moves.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
          } else if (pt === "Q") {
            const oRays = ORTHO_RAYS[r][c];
            for (let i = 0; i < oRays.length; i++) {
              const ray = oRays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (!t) {
                  moves.push([r, c, nr, nc, null]);
                } else {
                  if (t[0] === opp) moves.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
            const dRays = DIAG_RAYS[r][c];
            for (let i = 0; i < dRays.length; i++) {
              const ray = dRays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (!t) {
                  moves.push([r, c, nr, nc, null]);
                } else {
                  if (t[0] === opp) moves.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
          } else if (pt === "K") {
            const list = KING_SQS[r][c];
            for (let i = 0; i < list.length; i++) {
              const nr = list[i][0], nc = list[i][1];
              const t = grid[nr][nc];
              if (!t || t[0] === opp) moves.push([r, c, nr, nc, null]);
            }
            const cast = this.castling;
            if (cast) {
              if (color === "w" && r === 7 && c === 4 && !this.isSquareAttacked(7, 4, "b")) {
                if (cast.includes("K") && grid[7][5] == null && grid[7][6] == null) {
                  if (!this.isSquareAttacked(7, 5, "b") && !this.isSquareAttacked(7, 6, "b")) {
                    moves.push([7, 4, 7, 6, "CASTLE"]);
                  }
                }
                if (cast.includes("Q") && grid[7][3] == null && grid[7][2] == null && grid[7][1] == null) {
                  if (!this.isSquareAttacked(7, 3, "b") && !this.isSquareAttacked(7, 2, "b")) {
                    moves.push([7, 4, 7, 2, "CASTLE"]);
                  }
                }
              } else if (color === "b" && r === 0 && c === 4 && !this.isSquareAttacked(0, 4, "w")) {
                if (cast.includes("k") && grid[0][5] == null && grid[0][6] == null) {
                  if (!this.isSquareAttacked(0, 5, "w") && !this.isSquareAttacked(0, 6, "w")) {
                    moves.push([0, 4, 0, 6, "CASTLE"]);
                  }
                }
                if (cast.includes("q") && grid[0][3] == null && grid[0][2] == null && grid[0][1] == null) {
                  if (!this.isSquareAttacked(0, 3, "w") && !this.isSquareAttacked(0, 2, "w")) {
                    moves.push([0, 4, 0, 2, "CASTLE"]);
                  }
                }
              }
            }
          }
        }
      }
      return moves;
    }

    applyMove(move) {
      const [r1, c1, r2, c2, special] = move;
      const p = this.grid[r1][c1];
      const color = p[0];
      const pt = p[1];
      let captured = this.grid[r2][c2];
      this.grid[r1][c1] = null;

      if (special === "EP") {
        captured = this.grid[r1][c2];
        this.grid[r1][c2] = null;
        this.grid[r2][c2] = p;
      } else if (special === "CASTLE") {
        this.grid[r2][c2] = p;
        if (c2 === 6) {
          this.grid[r2][5] = this.grid[r2][7];
          this.grid[r2][7] = null;
        } else if (c2 === 2) {
          this.grid[r2][3] = this.grid[r2][0];
          this.grid[r2][0] = null;
        }
      } else if (special === "Q" || special === "R" || special === "B" || special === "N") {
        this.grid[r2][c2] = color + special;
      } else {
        this.grid[r2][c2] = p;
      }

      if (pt === "P" && Math.abs(r2 - r1) === 2) {
        this.ep = rcToSq((r1 + r2) >> 1, c1);
      } else {
        this.ep = "-";
      }

      let cast = this.castling;
      if (cast) {
        if (pt === "K") {
          cast = color === "w" ? cast.replace("K", "").replace("Q", "") : cast.replace("k", "").replace("q", "");
        }
        if ((r1 === 7 && c1 === 0) || (r2 === 7 && c2 === 0)) cast = cast.replace("Q", "");
        if ((r1 === 7 && c1 === 7) || (r2 === 7 && c2 === 7)) cast = cast.replace("K", "");
        if ((r1 === 0 && c1 === 0) || (r2 === 0 && c2 === 0)) cast = cast.replace("q", "");
        if ((r1 === 0 && c1 === 7) || (r2 === 0 && c2 === 7)) cast = cast.replace("k", "");
        this.castling = cast;
      }

      this.halfmove = (pt === "P" || captured != null) ? 0 : this.halfmove + 1;
      if (color === "b") this.fullmove += 1;
      this.turn = color === "w" ? "b" : "w";
      this._score = null;
      this._wk = null;
      this._bk = null;
      return captured;
    }

    legalMoves() {
      const legal = [];
      const color = this.turn;
      const pm = this.pseudoMoves();
      for (let i = 0; i < pm.length; i++) {
        const nb = fastCloneApply(this, pm[i]);
        if (!inCheckFast(nb, color)) {
          legal.push(pm[i]);
        }
      }
      return legal;
    }

    moveToUci(move) {
      const [r1, c1, r2, c2, sp] = move;
      const promo = (sp === "Q" || sp === "R" || sp === "B" || sp === "N") ? sp.toLowerCase() : "";
      return rcToSq(r1, c1) + rcToSq(r2, c2) + promo;
    }

    moveToSan(move, legalList = null, includeCheckSuffix = true) {
      if (legalList == null) legalList = this.legalMoves();
      const [r1, c1, r2, c2, sp] = move;
      const p = this.grid[r1][c1];
      const pt = p[1];
      let san;
      if (sp === "CASTLE") {
        san = c2 === 6 ? "O-O" : "O-O-O";
      } else {
        const isCap = (this.grid[r2][c2] != null) || (sp === "EP");
        if (pt === "P") {
          san = (isCap ? FILES[c1] + "x" : "") + rcToSq(r2, c2);
          if (sp === "Q" || sp === "R" || sp === "B" || sp === "N") {
            san += "=" + sp;
          }
        } else {
          const amb = [];
          for (let i = 0; i < legalList.length; i++) {
            const m = legalList[i];
            if (!sameMove(m, move) && m[2] === r2 && m[3] === c2 && this.grid[m[0]][m[1]] === p) {
              amb.push(m);
            }
          }
          let dis = "";
          if (amb.length > 0) {
            const sameFile = amb.some((m) => m[1] === c1);
            const sameRank = amb.some((m) => m[0] === r1);
            if (!sameFile) dis = FILES[c1];
            else if (!sameRank) dis = String(8 - r1);
            else dis = rcToSq(r1, c1);
          }
          san = pt + dis + (isCap ? "x" : "") + rcToSq(r2, c2);
        }
      }

      if (includeCheckSuffix) {
        const nb = fastCloneApply(this, move);
        if (inCheckFast(nb, nb.turn)) {
          san += nb.legalMoves().length === 0 ? "#" : "+";
        }
      }
      return san;
    }

    parseSan(sanStr, legalList = null) {
      const clean = sanStr.trim();
      const base = clean.replace(/[!?+#]+$/, "");
      const legal = legalList != null ? legalList : this.legalMoves();
      for (let i = 0; i < legal.length; i++) {
        if (this.moveToSan(legal[i], legal, false) === base) return legal[i];
      }
      const lowerBase = base.toLowerCase();
      for (let i = 0; i < legal.length; i++) {
        if (this.moveToUci(legal[i]) === lowerBase) return legal[i];
      }
      return null;
    }
  }

  function syncBoardState(board) {
    let wk = null, bk = null;
    let wb = 0, bb = 0, score = 0;
    const grid = board.grid;
    for (let r = 0; r < 8; r++) {
      const row = grid[r];
      for (let c = 0; c < 8; c++) {
        const p = row[c];
        if (!p) continue;
        score += ALL_PST[p][r][c];
        if (p === "wK") wk = [r, c];
        else if (p === "bK") bk = [r, c];
        else if (p === "wB") wb += 1;
        else if (p === "bB") bb += 1;
      }
    }
    board._wk = wk;
    board._bk = bk;
    board._wb = wb;
    board._bb = bb;
    board._score = score;
  }

  function fastCloneApply(board, mv) {
    if (board._score == null) syncBoardState(board);
    let sc = board._score;
    let wb = board._wb;
    let bb = board._bb;
    let wk = board._wk;
    let bk = board._bk;

    const nb = Object.create(ChessBoard.prototype);
    const og = board.grid;
    const ngrid = [
      og[0].slice(), og[1].slice(), og[2].slice(), og[3].slice(),
      og[4].slice(), og[5].slice(), og[6].slice(), og[7].slice(),
    ];
    nb.grid = ngrid;

    const [r1, c1, r2, c2, special] = mv;
    const row1 = ngrid[r1];
    const p = row1[c1];
    const color = p[0];
    const pt = p[1];
    row1[c1] = null;
    sc -= ALL_PST[p][r1][c1];

    const row2 = ngrid[r2];
    let captured = row2[c2];

    if (special == null) {
      if (captured != null) {
        sc -= ALL_PST[captured][r2][c2];
        if (captured === "wB") wb -= 1;
        else if (captured === "bB") bb -= 1;
      }
      row2[c2] = p;
      sc += ALL_PST[p][r2][c2];
    } else if (special === "EP") {
      captured = row1[c2];
      row1[c2] = null;
      sc -= ALL_PST[captured][r1][c2];
      row2[c2] = p;
      sc += ALL_PST[p][r2][c2];
    } else if (special === "CASTLE") {
      row2[c2] = p;
      sc += ALL_PST[p][r2][c2];
      if (c2 === 6) {
        const rk = row2[7];
        row2[5] = rk;
        row2[7] = null;
        const rkPst = ALL_PST[rk][r2];
        sc += rkPst[5] - rkPst[7];
      } else if (c2 === 2) {
        const rk = row2[0];
        row2[3] = rk;
        row2[0] = null;
        const rkPst = ALL_PST[rk][r2];
        sc += rkPst[3] - rkPst[0];
      }
    } else {
      if (captured != null) {
        sc -= ALL_PST[captured][r2][c2];
        if (captured === "wB") wb -= 1;
        else if (captured === "bB") bb -= 1;
      }
      const npCode = color + special;
      row2[c2] = npCode;
      sc += ALL_PST[npCode][r2][c2];
      if (special === "B") {
        if (color === "w") wb += 1;
        else bb += 1;
      }
    }

    if (p === "wK") wk = [r2, c2];
    else if (p === "bK") bk = [r2, c2];

    if (pt === "P" && (r2 - r1 === 2 || r1 - r2 === 2)) {
      nb.ep = FILES[c1] + String(8 - ((r1 + r2) >> 1));
    } else {
      nb.ep = "-";
    }

    let cast = board.castling;
    if (cast) {
      if (pt === "K") {
        cast = color === "w" ? cast.replace("K", "").replace("Q", "") : cast.replace("k", "").replace("q", "");
      }
      if ((r1 === 7 && c1 === 0) || (r2 === 7 && c2 === 0)) cast = cast.replace("Q", "");
      if ((r1 === 7 && c1 === 7) || (r2 === 7 && c2 === 7)) cast = cast.replace("K", "");
      if ((r1 === 0 && c1 === 0) || (r2 === 0 && c2 === 0)) cast = cast.replace("q", "");
      if ((r1 === 0 && c1 === 7) || (r2 === 0 && c2 === 7)) cast = cast.replace("k", "");
    }
    nb.castling = cast;
    nb.halfmove = (pt === "P" || captured != null) ? 0 : board.halfmove + 1;
    nb.fullmove = color === "b" ? board.fullmove + 1 : board.fullmove;
    nb.turn = color === "w" ? "b" : "w";
    nb._wk = wk;
    nb._bk = bk;
    nb._wb = wb;
    nb._bb = bb;
    nb._score = sc;
    return nb;
  }

  function inCheckFast(board, color) {
    if (board._score == null) syncBoardState(board);
    let kpos = color === "w" ? board._wk : board._bk;
    if (!kpos) {
      kpos = board.findKing(color);
      if (!kpos) return false;
    }
    return board.isSquareAttacked(kpos[0], kpos[1], color === "w" ? "b" : "w");
  }

  function fastEval(board) {
    if (board._score == null) syncBoardState(board);
    let sc = board._score;
    if (board._wb >= 2) sc += 30;
    if (board._bb >= 2) sc -= 30;
    return sc;
  }

  function orderMoves(board, moves) {
    const grid = board.grid;
    const opp = board.turn === "w" ? "b" : "w";
    if (board._score == null) syncBoardState(board);
    const ek = (opp === "b" ? board._bk : board._wk) || board.findKing(opp);
    const ekr = ek ? ek[0] : 4;
    const ekc = ek ? ek[1] : 4;

    const scored = new Array(moves.length);
    for (let i = 0; i < moves.length; i++) {
      const mv = moves[i];
      const [r1, c1, r2, c2, sp] = mv;
      let score = 0;
      const target = grid[r2][c2];
      if (target) {
        score += 10000 + 10 * MVV_VALUES[target[1]] - Math.floor(MVV_VALUES[grid[r1][c1][1]] / 10);
      }
      if (sp) {
        if (sp === "EP") score += 10900;
        else if (sp === "CASTLE") score += 140;
        else score += 9000 + MVV_VALUES[sp];
      }
      if (r2 >= 2 && r2 <= 5 && c2 >= 2 && c2 <= 5) score += 15;
      if (Math.abs(r2 - ekr) <= 2 && Math.abs(c2 - ekc) <= 2) score += 25;
      scored[i] = { mv, score };
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.mv);
  }

  function pseudoCapturesFast(board) {
    const grid = board.grid;
    const turn = board.turn;
    const opp = turn === "w" ? "b" : "w";
    const caps = [];
    const pDir = turn === "w" ? -1 : 1;
    const promR = turn === "w" ? 0 : 7;
    let epR = -1, epC = -1;
    if (board.ep && board.ep !== "-") {
      epR = 8 - parseInt(board.ep[1], 10);
      epC = board.ep.charCodeAt(0) - 97;
    }

    for (let r = 0; r < 8; r++) {
      const row = grid[r];
      for (let c = 0; c < 8; c++) {
        const p = row[c];
        if (!p || p[0] !== turn) continue;
        const pt = p[1];
        if (pt === "P") {
          const nr = r + pDir;
          if (nr >= 0 && nr < 8) {
            const nrow = grid[nr];
            if (nrow[c] == null && nr === promR) {
              caps.push([r, c, nr, c, "Q"]);
            }
            if (c > 0) {
              const t = nrow[c - 1];
              if (t && t[0] === opp) caps.push([r, c, nr, c - 1, nr === promR ? "Q" : null]);
              else if (nr === epR && c - 1 === epC) caps.push([r, c, nr, c - 1, "EP"]);
            }
            if (c < 7) {
              const t = nrow[c + 1];
              if (t && t[0] === opp) caps.push([r, c, nr, c + 1, nr === promR ? "Q" : null]);
              else if (nr === epR && c + 1 === epC) caps.push([r, c, nr, c + 1, "EP"]);
            }
          }
        } else if (pt === "N") {
          const list = KNIGHT_SQS[r][c];
          for (let i = 0; i < list.length; i++) {
            const nr = list[i][0], nc = list[i][1];
            const t = grid[nr][nc];
            if (t && t[0] === opp) caps.push([r, c, nr, nc, null]);
          }
        } else if (pt === "K") {
          const list = KING_SQS[r][c];
          for (let i = 0; i < list.length; i++) {
            const nr = list[i][0], nc = list[i][1];
            const t = grid[nr][nc];
            if (t && t[0] === opp) caps.push([r, c, nr, nc, null]);
          }
        } else {
          if (pt !== "B") {
            const oRays = ORTHO_RAYS[r][c];
            for (let i = 0; i < oRays.length; i++) {
              const ray = oRays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (t != null) {
                  if (t[0] === opp) caps.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
          }
          if (pt !== "R") {
            const dRays = DIAG_RAYS[r][c];
            for (let i = 0; i < dRays.length; i++) {
              const ray = dRays[i];
              for (let j = 0; j < ray.length; j++) {
                const nr = ray[j][0], nc = ray[j][1];
                const t = grid[nr][nc];
                if (t != null) {
                  if (t[0] === opp) caps.push([r, c, nr, nc, null]);
                  break;
                }
              }
            }
          }
        }
      }
    }
    return caps;
  }

  function quiesce(board, alpha, beta, maximizing, qdepth = 3) {
    const standPat = fastEval(board);
    if (qdepth <= 0) return standPat;

    const turnC = board.turn;
    const inChk = inCheckFast(board, turnC);
    const grid = board.grid;

    if (inChk) {
      const evasions = orderMoves(board, board.pseudoMoves());
      let legalCnt = 0;
      if (maximizing) {
        let bestV = -99999;
        for (let i = 0; i < evasions.length; i++) {
          const nb = fastCloneApply(board, evasions[i]);
          if (inCheckFast(nb, turnC)) continue;
          legalCnt += 1;
          const sc = quiesce(nb, alpha, beta, false, qdepth - 1);
          if (sc > bestV) bestV = sc;
          if (bestV > alpha) alpha = bestV;
          if (alpha >= beta || legalCnt >= 6) break;
        }
        return legalCnt === 0 ? -29000 - qdepth : bestV;
      } else {
        let bestV = 99999;
        for (let i = 0; i < evasions.length; i++) {
          const nb = fastCloneApply(board, evasions[i]);
          if (inCheckFast(nb, turnC)) continue;
          legalCnt += 1;
          const sc = quiesce(nb, alpha, beta, true, qdepth - 1);
          if (sc < bestV) bestV = sc;
          if (bestV < beta) beta = bestV;
          if (alpha >= beta || legalCnt >= 6) break;
        }
        return legalCnt === 0 ? 29000 + qdepth : bestV;
      }
    }

    const caps = pseudoCapturesFast(board);
    const cands = [];
    if (maximizing) {
      if (standPat >= beta) return beta;
      if (alpha < standPat) alpha = standPat;

      for (let i = 0; i < caps.length; i++) {
        const m = caps[i];
        const t = grid[m[2]][m[3]];
        const v = t ? MVV_VALUES[t[1]] : 900;
        if (standPat + v + 180 < alpha) continue;
        cands.push([10 * v - MVV_VALUES[grid[m[0]][m[1]][1]], m]);
      }
      if (cands.length === 0) return alpha;
      cands.sort((a, b) => b[0] - a[0]);
      const limit = Math.min(5, cands.length);
      for (let i = 0; i < limit; i++) {
        const nb = fastCloneApply(board, cands[i][1]);
        if (inCheckFast(nb, "w")) continue;
        const sc = quiesce(nb, alpha, beta, false, qdepth - 1);
        if (sc >= beta) return beta;
        if (sc > alpha) alpha = sc;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (beta > standPat) beta = standPat;

      for (let i = 0; i < caps.length; i++) {
        const m = caps[i];
        const t = grid[m[2]][m[3]];
        const v = t ? MVV_VALUES[t[1]] : 900;
        if (standPat - v - 180 > beta) continue;
        cands.push([10 * v - MVV_VALUES[grid[m[0]][m[1]][1]], m]);
      }
      if (cands.length === 0) return beta;
      cands.sort((a, b) => b[0] - a[0]);
      const limit = Math.min(5, cands.length);
      for (let i = 0; i < limit; i++) {
        const nb = fastCloneApply(board, cands[i][1]);
        if (inCheckFast(nb, "b")) continue;
        const sc = quiesce(nb, alpha, beta, true, qdepth - 1);
        if (sc <= alpha) return alpha;
        if (sc < beta) beta = sc;
      }
      return beta;
    }
  }

  function alphabeta(board, d, alpha, beta, maximizing) {
    if (d <= 0) {
      return [quiesce(board, alpha, beta, maximizing, 3), []];
    }

    const turnC = board.turn;
    const mvs = orderMoves(board, board.pseudoMoves());
    let bestPv = [];
    let legalCnt = 0;

    if (maximizing) {
      let val = -99999;
      for (let i = 0; i < mvs.length; i++) {
        const m = mvs[i];
        const nb = fastCloneApply(board, m);
        if (inCheckFast(nb, turnC)) continue;
        legalCnt += 1;
        const [childVal, childPv] = alphabeta(nb, d - 1, alpha, beta, false);
        if (childVal > val) {
          val = childVal;
          bestPv = [m].concat(childPv);
        }
        if (val > alpha) alpha = val;
        if (alpha >= beta || legalCnt >= 16) break;
      }
      if (legalCnt === 0) {
        return inCheckFast(board, turnC) ? [-29000 - d, []] : [0, []];
      }
      return [val, bestPv];
    } else {
      let val = 99999;
      for (let i = 0; i < mvs.length; i++) {
        const m = mvs[i];
        const nb = fastCloneApply(board, m);
        if (inCheckFast(nb, turnC)) continue;
        legalCnt += 1;
        const [childVal, childPv] = alphabeta(nb, d - 1, alpha, beta, true);
        if (childVal < val) {
          val = childVal;
          bestPv = [m].concat(childPv);
        }
        if (val < beta) beta = val;
        if (alpha >= beta || legalCnt >= 16) break;
      }
      if (legalCnt === 0) {
        return inCheckFast(board, turnC) ? [29000 + d, []] : [0, []];
      }
      return [val, bestPv];
    }
  }

  function formatPvSan(board, pvMoves) {
    const sans = [];
    let cur = board;
    const lim = Math.min(4, pvMoves.length);
    for (let i = 0; i < lim; i++) {
      const mv = pvMoves[i];
      const legal = cur.legalMoves();
      if (!legal.some((m) => sameMove(m, mv))) break;
      sans.push(cur.moveToSan(mv, legal));
      cur = fastCloneApply(cur, mv);
    }
    return sans;
  }

  function _searchRoot(board, depth = 2, playedMv = null, legalMoves = null) {
    if (board._score == null) syncBoardState(board);
    const legal = legalMoves != null ? legalMoves : board.legalMoves();
    if (!legal || legal.length === 0) {
      const ev = inCheckFast(board, board.turn) ? (board.turn === "w" ? -29000 : 29000) : 0;
      return [ev, [], ev];
    }

    const ordered = orderMoves(board, legal);
    const isWhite = board.turn === "w";
    let rootMoves = depth <= 2 ? ordered : ordered.slice(0, 20);
    if (playedMv != null && !rootMoves.some((m) => sameMove(m, playedMv))) {
      rootMoves = rootMoves.concat([playedMv]);
    }

    const scored = [];
    let playedEval = null;
    let bestSoFar = isWhite ? -99999 : 99999;

    for (let idxM = 0; idxM < rootMoves.length; idxM++) {
      const mv = rootMoves[idxM];
      const nb = fastCloneApply(board, mv);
      let ev, pv;
      const isPlayed = playedMv != null && sameMove(mv, playedMv);
      if (isWhite) {
        const lo = (idxM >= 3 && !isPlayed) ? Math.max(-99999, bestSoFar - 350) : -99999;
        [ev, pv] = alphabeta(nb, Math.max(1, depth - 1), lo, 99999, false);
        if (ev > bestSoFar) bestSoFar = ev;
      } else {
        const hi = (idxM >= 3 && !isPlayed) ? Math.min(99999, bestSoFar + 350) : 99999;
        [ev, pv] = alphabeta(nb, Math.max(1, depth - 1), -99999, hi, true);
        if (ev < bestSoFar) bestSoFar = ev;
      }
      scored.push({ move: mv, evalCp: ev, pv: [mv].concat(pv) });
      if (isPlayed) playedEval = ev;
    }

    scored.sort((a, b) => (isWhite ? b.evalCp - a.evalCp : a.evalCp - b.evalCp));
    const top3 = [];
    const topLim = Math.min(3, scored.length);
    for (let i = 0; i < topLim; i++) {
      const item = scored[i];
      const mv = item.move;
      top3.push({
        move: mv,
        uci: board.moveToUci(mv),
        san: board.moveToSan(mv, legal),
        from: rcToSq(mv[0], mv[1]),
        to: rcToSq(mv[2], mv[3]),
        eval_cp: item.evalCp,
        pv: formatPvSan(board, item.pv),
      });
    }
    const bestEval = scored[0].evalCp;
    if (playedEval == null) playedEval = bestEval;
    return [bestEval, top3, playedEval];
  }

  function searchPosition(board, depth = 2, mustIncludeMv = null, legalMoves = null) {
    const [bestEval, top3] = _searchRoot(board, depth, mustIncludeMv, legalMoves);
    return [bestEval, top3];
  }

  function cpToWinPct(cp) {
    const clamped = Math.max(-4000, Math.min(4000, cp));
    return 50.0 + 50.0 * (2.0 / (1.0 + Math.exp(-0.00368208 * clamped)) - 1.0);
  }

  function computeMoveAccuracy(winBefore, winAfter) {
    const loss = Math.max(0.0, winBefore - winAfter);
    if (loss <= 0.05) return 100.0;
    const acc = 102.5 * Math.exp(-0.070 * loss) - 2.5;
    return Math.max(0.0, Math.min(100.0, Math.round(acc * 10) / 10));
  }

  function formatEval(cp) {
    if (Math.abs(cp) >= 20000) {
      const mateMoves = Math.max(1, Math.floor((29500 - Math.abs(cp)) / 200));
      return cp > 0 ? `+M${mateMoves}` : `-M${mateMoves}`;
    }
    const val = cp / 100.0;
    return (val >= 0 ? "+" : "") + val.toFixed(2);
  }

  function detectOpening(sanMoves) {
    let matched = "A00 Uncommon Opening";
    const prefix = [];
    const lim = Math.min(12, sanMoves.length);
    for (let i = 0; i < lim; i++) {
      const clean = sanMoves[i].replace(/[!?+#]+$/, "");
      prefix.push(clean);
      const key = prefix.join(" ");
      if (OPENING_BOOK[key]) matched = OPENING_BOOK[key];
    }
    return matched;
  }

  function parsePgnMoves(pgnText) {
    const lines = [];
    const headers = {};
    const rawLines = pgnText.split(/\r?\n/);
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim();
      if (line.startsWith("[") && line.endsWith("]")) {
        const m = line.match(/^\[(\w+)\s+"(.*)"\]$/);
        if (m) headers[m[1]] = m[2];
      } else if (line) {
        lines.push(line);
      }
    }
    let body = lines.join(" ");
    body = body.replace(/\{[^}]*\}/g, " ");
    while (/\([^()]*\)/.test(body)) {
      body = body.replace(/\([^()]*\)/g, " ");
    }
    body = body.replace(/\b\d+\.+/g, " ");
    const tokens = body.trim().split(/\s+/);
    const moves = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok || tok === "1-0" || tok === "0-1" || tok === "1/2-1/2" || tok === "*") continue;
      if (tok.startsWith("$")) continue;
      moves.push(tok);
    }
    return [headers, moves];
  }

  function isPieceSacrifice(boardBefore, mv) {
    const [r1, c1, r2, c2, sp] = mv;
    const mover = boardBefore.grid[r1][c1];
    if (!mover || !["N", "B", "R", "Q"].includes(mover[1])) return false;
    const moverVal = PIECE_VALUES[mover[1]];
    const target = boardBefore.grid[r2][c2];
    const capV = target ? PIECE_VALUES[target[1]] : (sp === "EP" ? 100 : 0);

    const nb = fastCloneApply(boardBefore, mv);
    const oppC = nb.turn;
    if (!nb.isSquareAttacked(r2, c2, oppC)) return false;
    const defended = nb.isSquareAttacked(r2, c2, mover[0]);
    if (capV + 140 < moverVal) {
      if (!defended) return true;
      const omvs = nb.legalMoves();
      for (let i = 0; i < omvs.length; i++) {
        const omv = omvs[i];
        if (omv[2] === r2 && omv[3] === c2) {
          const oppP = nb.grid[omv[0]][omv[1]];
          if (oppP && PIECE_VALUES[oppP[1]] + 100 < moverVal) return true;
        }
      }
    } else if (!defended && moverVal >= 300 && capV === 0) {
      return true;
    }
    return false;
  }

  function buildCoachCommentary(classification, san, moveNum, color, bestCand, evalAfter, winLoss) {
    const prefix = color === "w" ? `${moveNum}. ${san}` : `${moveNum}... ${san}`;
    const bestSan = bestCand.san;
    const pvLine = (bestCand.pv && bestCand.pv.length ? bestCand.pv : [bestSan]).join(" ");

    if (classification === "brilliant") {
      return {
        title: `${prefix}!! is a Brilliant Move!`,
        body: `A bold tactical sacrifice that seizes the initiative and breaks open the opponent's defense. Best continuation: ${pvLine}.`,
        best_line: pvLine,
      };
    } else if (classification === "great") {
      return {
        title: `${prefix}! is a Great Move!`,
        body: `You found the critical only move in a sharp position, maintaining maximum pressure (${formatEval(evalAfter)}).`,
        best_line: pvLine,
      };
    } else if (classification === "best") {
      return {
        title: `${prefix} is the Best Move`,
        body: `Matches the engine's #1 recommendation. Keeps the position optimal (${formatEval(evalAfter)}).`,
        best_line: pvLine,
      };
    } else if (classification === "book") {
      return {
        title: `${prefix} is a Book Move`,
        body: "Standard opening theory developing pieces harmoniously toward the center.",
        best_line: pvLine,
      };
    } else if (classification === "excellent") {
      return {
        title: `${prefix} is an Excellent Move`,
        body: `Nearly as strong as the top engine choice (${bestSan}), keeping a solid position.`,
        best_line: pvLine,
      };
    } else if (classification === "good") {
      return {
        title: `${prefix} is a Good Move`,
        body: `A playable move, though ${bestSan} was slightly more accurate (${formatEval(evalAfter)}).`,
        best_line: pvLine,
      };
    } else if (classification === "inaccuracy") {
      return {
        title: `${prefix}?! is an Inaccuracy`,
        body: `Allows the opponent to improve their coordination. ${bestSan} was stronger here (line: ${pvLine}).`,
        best_line: pvLine,
      };
    } else if (classification === "mistake") {
      return {
        title: `${prefix}? is a Mistake`,
        body: `Drops ${winLoss.toFixed(1)}% win probability. Playing ${bestSan} would have preserved a much better position.`,
        best_line: pvLine,
      };
    } else if (classification === "miss") {
      return {
        title: `${prefix} is a Missed Win`,
        body: `Missed a tactical opportunity! ${bestSan} was winning on the spot (${pvLine}).`,
        best_line: pvLine,
      };
    }
    return {
      title: `${prefix}?? is a Blunder`,
      body: `Severe tactical error losing ${winLoss.toFixed(1)}% win probability. The engine strongly preferred ${bestSan} (${pvLine}).`,
      best_line: pvLine,
    };
  }

  function _collectSnapshots(pgnText) {
    const [headers, rawSans] = parsePgnMoves(pgnText);
    const board = new ChessBoard();
    const openingName = detectOpening(rawSans);
    const whiteElo = /^\d+$/.test(String(headers.WhiteElo || "")) ? parseInt(headers.WhiteElo, 10) : 1200;
    const blackElo = /^\d+$/.test(String(headers.BlackElo || "")) ? parseInt(headers.BlackElo, 10) : 1200;

    const snapshots = [];
    let lastTo = null;
    let lastCaptured = 0;

    for (let plyIdx = 0; plyIdx < rawSans.length; plyIdx++) {
      const rawSan = rawSans[plyIdx];
      const color = board.turn;
      const moveNum = board.fullmove;
      const fenBefore = board.toFen();

      const legalList = board.legalMoves();
      const mv = board.parseSan(rawSan, legalList);
      if (!mv) break;

      const cleanSan = board.moveToSan(mv, legalList);
      const uciPlayed = board.moveToUci(mv);
      const fromSq = rcToSq(mv[0], mv[1]);
      const toSq = rcToSq(mv[2], mv[3]);

      const [, , r2, c2, sp] = mv;
      const capturedPiece = board.grid[r2][c2];
      const capturedVal = capturedPiece ? PIECE_VALUES[capturedPiece[1]] : (sp === "EP" ? 100 : 0);
      const isRecapture = lastTo != null && r2 === lastTo[0] && c2 === lastTo[1] && lastCaptured > 0;
      const sac = isPieceSacrifice(board, mv);
      const boardBefore = board.clone();

      board.applyMove(mv);
      const fenAfter = board.toFen();
      let evalOverride = null;
      if (plyIdx === rawSans.length - 1 && board.legalMoves().length === 0) {
        evalOverride = inCheckFast(board, board.turn) ? (color === "w" ? 29000 : -29000) : 0;
      }

      snapshots.push({
        plyIdx,
        rawSan,
        color,
        moveNum,
        fenBefore,
        boardBefore,
        legalList,
        legalCnt: legalList.length,
        mv,
        cleanSan,
        uciPlayed,
        fromSq,
        toSq,
        isRecapture,
        sac,
        fenAfter,
        position: board.toPositionDict(),
        evalOverride,
      });

      lastTo = [r2, c2];
      lastCaptured = capturedVal;
    }

    return { openingName, whiteElo, blackElo, snapshots };
  }

  function _finalizeAnalysis(meta, searchResults) {
    const { openingName, whiteElo, blackElo, snapshots } = meta;
    const emptyCounts = () => ({
      brilliant: 0, great: 0, best: 0, excellent: 0, good: 0,
      book: 0, inaccuracy: 0, mistake: 0, blunder: 0, miss: 0,
    });
    const counts = { w: emptyCounts(), b: emptyCounts() };
    const analyzedMoves = [];
    const whiteAccs = [];
    const blackAccs = [];
    const prefixSans = [];
    const winPcts = [];
    let prevWinLoss = 0.0;

    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      let [bestEvalBefore, topCandidates, evalAfter] = searchResults[i];
      if (s.evalOverride != null) evalAfter = s.evalOverride;

      const plyIdx = s.plyIdx;
      const rawSan = s.rawSan;
      const color = s.color;
      const moveNum = s.moveNum;
      const cleanSan = s.cleanSan;
      const uciPlayed = s.uciPlayed;
      const fromSq = s.fromSq;
      const toSq = s.toSq;

      const explicitBrilliant = rawSan.includes("!!");
      const explicitBlunder = rawSan.includes("??");
      const explicitGreat = rawSan.includes("!") && !explicitBrilliant && !rawSan.includes("?!");
      const explicitInaccuracy = rawSan.includes("?!");
      const explicitMistake = rawSan.includes("?") && !explicitBlunder && !explicitInaccuracy;

      const wPctBefore = cpToWinPct(bestEvalBefore);
      const wPctAfter = cpToWinPct(evalAfter);
      const moverWinBefore = color === "w" ? wPctBefore : 100.0 - wPctBefore;
      const moverWinAfter = color === "w" ? wPctAfter : 100.0 - wPctAfter;

      const winLoss = Math.max(0.0, moverWinBefore - moverWinAfter);
      const cpLoss = Math.max(0, color === "w" ? bestEvalBefore - evalAfter : evalAfter - bestEvalBefore);
      let moveAcc = computeMoveAccuracy(moverWinBefore, moverWinAfter);

      const bestCand = topCandidates.length > 0 ? topCandidates[0] : {
        uci: uciPlayed,
        san: cleanSan,
        from: fromSq,
        to: toSq,
        eval_cp: evalAfter,
        pv: [cleanSan],
      };

      let secondGapWin = 0.0;
      if (topCandidates.length >= 2) {
        const sw = cpToWinPct(topCandidates[1].eval_cp);
        const s2 = color === "w" ? sw : 100.0 - sw;
        secondGapWin = Math.max(0.0, moverWinBefore - s2);
      }

      const isTop = (uciPlayed === bestCand.uci) || (cpLoss <= 5);
      prefixSans.push(cleanSan.replace(/[!?+#]+$/, ""));
      const prefixStr = prefixSans.join(" ");
      const inBook = (Boolean(OPENING_BOOK[prefixStr]) && plyIdx < 10) || (plyIdx < 6 && winLoss <= 3.5);

      let classification;
      if (explicitBrilliant || (
        !inBook &&
        s.sac &&
        !s.isRecapture &&
        winLoss <= 5.5 &&
        moverWinAfter >= 52.0 &&
        moverWinBefore < 93.5 &&
        s.legalCnt > 2
      )) {
        classification = "brilliant";
        moveAcc = Math.max(moveAcc, 99.0);
      } else if (explicitBlunder) {
        classification = "blunder";
        moveAcc = Math.min(moveAcc, 24.5);
      } else if (explicitMistake) {
        classification = "mistake";
        moveAcc = Math.min(moveAcc, 55.0);
      } else if (explicitInaccuracy) {
        classification = "inaccuracy";
        moveAcc = Math.min(moveAcc, 74.0);
      } else if (explicitGreat) {
        classification = "great";
        moveAcc = Math.max(moveAcc, 96.5);
      } else if (inBook) {
        classification = "book";
        moveAcc = Math.max(moveAcc, 96.0);
      } else if (isTop && secondGapWin >= 12.0 && s.legalCnt >= 4 && !s.isRecapture && moverWinAfter >= 40.0) {
        classification = "great";
      } else if (isTop) {
        classification = "best";
      } else if (winLoss <= 2.3) {
        classification = "excellent";
      } else if (winLoss <= 5.5) {
        classification = "good";
      } else if (winLoss >= 18.5 || (winLoss >= 12.0 && cpLoss >= 350 && moverWinBefore >= 14.0)) {
        classification = "blunder";
      } else if (winLoss >= 6.8 && winLoss <= 13.5 && moverWinBefore >= 68.0 && prevWinLoss >= 9.0 && moverWinAfter >= 52.0) {
        classification = "miss";
      } else if (winLoss <= 10.0) {
        classification = "inaccuracy";
      } else {
        classification = "mistake";
      }

      counts[color][classification] += 1;
      winPcts.push(wPctAfter);
      if (color === "w") whiteAccs.push([moveAcc, plyIdx]);
      else blackAccs.push([moveAcc, plyIdx]);

      prevWinLoss = winLoss;

      const coachText = buildCoachCommentary(
        classification, cleanSan, moveNum, color, bestCand, evalAfter, winLoss
      );

      analyzedMoves.push({
        ply: plyIdx + 1,
        move_number: moveNum,
        color,
        san: cleanSan,
        uci: uciPlayed,
        from: fromSq,
        to: toSq,
        fen_before: s.fenBefore,
        fen_after: s.fenAfter,
        position: s.position,
        eval_cp: evalAfter,
        eval_str: formatEval(evalAfter),
        win_pct_white: Math.round(wPctAfter * 10) / 10,
        accuracy: moveAcc,
        classification,
        best_move: {
          san: bestCand.san,
          uci: bestCand.uci,
          from: bestCand.from,
          to: bestCand.to,
          pv: bestCand.pv,
        },
        top_candidates: topCandidates.map((c, idx) => ({
          rank: idx + 1,
          san: c.san,
          uci: c.uci,
          from: c.from,
          to: c.to,
          eval_cp: c.eval_cp,
          eval_str: formatEval(c.eval_cp),
          pv: c.pv,
        })),
        coach: coachText,
      });
    }

    function caps2Total(sideAccs) {
      if (sideAccs.length === 0) return 85.0;
      const weights = [];
      for (let i = 0; i < sideAccs.length; i++) {
        const idx = sideAccs[i][1];
        const lo = Math.max(0, idx - 2);
        const hi = Math.min(winPcts.length, idx + 3);
        const segLen = Math.max(1, hi - lo);
        let sumS = 0;
        for (let k = lo; k < hi; k++) sumS += winPcts[k];
        const meanS = sumS / segLen;
        let varS = 0;
        for (let k = lo; k < hi; k++) varS += (winPcts[k] - meanS) ** 2;
        varS /= segLen;
        weights.push(Math.max(0.8, Math.min(12.0, Math.sqrt(varS))));
      }
      let weightedSum = 0, wSum = 0, invSum = 0;
      for (let i = 0; i < sideAccs.length; i++) {
        const a = sideAccs[i][0];
        const w = weights[i];
        weightedSum += a * w;
        wSum += w;
        invSum += 1.0 / Math.max(5.0, a);
      }
      const wMean = weightedSum / wSum;
      const harm = sideAccs.length / invSum;
      return Math.round((0.5 * wMean + 0.5 * harm) * 10) / 10;
    }

    function estRating(acc, oppElo, sideCounts, totalMoves) {
      if (totalMoves <= 0) return oppElo;
      const errScore = (
        sideCounts.inaccuracy * 0.35 +
        sideCounts.miss * 0.9 +
        sideCounts.mistake * 1.1 +
        sideCounts.blunder * 1.6
      ) / totalMoves;
      const perfOpp = oppElo + (acc - 74.0) * 26.0 - Math.min(420.0, errScore * 2200.0);
      const accBand = 350.0 + Math.max(0.0, acc - 45.0) * 32.0 - Math.min(650.0, errScore * 3200.0);
      const blended = 0.40 * perfOpp + 0.60 * accBand;
      return Math.max(200, Math.min(3200, Math.round(blended / 50.0) * 50));
    }

    const avgW = caps2Total(whiteAccs);
    const avgB = caps2Total(blackAccs);

    return {
      review_version: 3,
      opening: openingName,
      accuracy_white: avgW,
      accuracy_black: avgB,
      estimated_rating_white: estRating(avgW, blackElo, counts.w, whiteAccs.length),
      estimated_rating_black: estRating(avgB, whiteElo, counts.b, blackAccs.length),
      counts,
      moves: analyzedMoves,
    };
  }

  function analyzeGamePgn(pgnText, depth = 2) {
    const meta = _collectSnapshots(pgnText);
    const searchResults = meta.snapshots.map((s) =>
      _searchRoot(s.boardBefore, depth, s.mv, s.legalList)
    );
    return _finalizeAnalysis(meta, searchResults);
  }

  // Lazy Web Worker pool for non-blocking parallel browser analysis
  let _workers = null;
  let _workerUnsupported = false;
  let _nextMsgId = 1;
  let _rrIdx = 0;

  function _getWorkers() {
    if (_workerUnsupported) return null;
    if (typeof window === "undefined" || typeof Worker === "undefined" || window.location.protocol === "file:") {
      _workerUnsupported = true;
      return null;
    }
    if (_workers) return _workers;
    try {
      const count = Math.max(2, Math.min((navigator.hardwareConcurrency || 4), 6));
      const pool = [];
      for (let i = 0; i < count; i++) {
        const w = new Worker("js/worker.js");
        const entry = { worker: w, pending: new Map(), dead: false };
        w.onmessage = (e) => {
          const msg = e.data;
          if (!msg || msg.id == null) return;
          const cb = entry.pending.get(msg.id);
          if (cb) {
            entry.pending.delete(msg.id);
            if (msg.ok) cb.resolve(msg.result);
            else cb.reject(new Error(msg.error || "Worker error"));
          }
        };
        w.onerror = () => {
          entry.dead = true;
          for (const cb of entry.pending.values()) cb.reject(new Error("Worker failed"));
          entry.pending.clear();
        };
        pool.push(entry);
      }
      _workers = pool;
      return _workers;
    } catch (_) {
      _workerUnsupported = true;
      return null;
    }
  }

  async function analyzeGamePgnAsync(pgnText, depth = 2) {
    const meta = _collectSnapshots(pgnText);
    const snaps = meta.snapshots;
    const pool = (snaps.length >= 16 && depth >= 2) ? _getWorkers() : null;

    if (pool && pool.some((w) => !w.dead)) {
      try {
        const activePool = pool.filter((w) => !w.dead);
        const promises = snaps.map((s) => {
          const slot = activePool[_rrIdx % activePool.length];
          _rrIdx += 1;
          return new Promise((resolve, reject) => {
            const id = _nextMsgId++;
            slot.pending.set(id, { resolve, reject });
            slot.worker.postMessage({ id, fenBefore: s.fenBefore, depth, mv: s.mv });
          });
        });
        const results = await Promise.all(promises);
        return _finalizeAnalysis(meta, results);
      } catch (_) {
        // Fall back to chunked main-thread async execution seamlessly
      }
    }

    const searchResults = new Array(snaps.length);
    for (let i = 0; i < snaps.length; i++) {
      const s = snaps[i];
      searchResults[i] = _searchRoot(s.boardBefore, depth, s.mv, s.legalList);
      if ((i + 1) % 8 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }
    return _finalizeAnalysis(meta, searchResults);
  }

  // Simulator APIs (mirrors server.py endpoints cleanly)
  function simulateNew(openingKey = "italian") {
    const spec = SIMULATION_OPENINGS[openingKey] || SIMULATION_OPENINGS.standard;
    const board = new ChessBoard();
    const history = [];
    for (let i = 0; i < spec.moves.length; i++) {
      const san = spec.moves[i];
      const mv = board.parseSan(san);
      if (mv) {
        const uci = board.moveToUci(mv);
        const fromSq = rcToSq(mv[0], mv[1]);
        const toSq = rcToSq(mv[2], mv[3]);
        board.applyMove(mv);
        history.push({ san, uci, from: fromSq, to: toSq, classification: "book" });
      }
    }
    const [ev, topCands] = searchPosition(board, 2);
    const legalList = board.legalMoves();
    return {
      opening_name: spec.name,
      fen: board.toFen(),
      turn: board.turn,
      move_number: board.fullmove,
      position: board.toPositionDict(),
      eval_cp: ev,
      eval_str: formatEval(ev),
      win_pct_white: Math.round(cpToWinPct(ev) * 10) / 10,
      history,
      legal_moves: legalList.map((m) => ({
        from: rcToSq(m[0], m[1]),
        to: rcToSq(m[2], m[3]),
        san: board.moveToSan(m, legalList),
        uci: board.moveToUci(m),
      })),
      top_candidates: topCands.map((c, i) => ({
        rank: i + 1,
        san: c.san,
        uci: c.uci,
        from: c.from,
        to: c.to,
        eval_cp: c.eval_cp,
        eval_str: formatEval(c.eval_cp),
        pv: c.pv,
      })),
    };
  }

  function simulateStep(fen, botStyle = "tactical", depth = 2) {
    const board = new ChessBoard(fen);
    const legal = board.legalMoves();
    if (legal.length === 0) {
      const inChk = inCheckFast(board, board.turn);
      return {
        game_over: true,
        reason: inChk ? "Checkmate" : "Stalemate / Draw",
        winner: inChk ? (board.turn === "w" ? "Black" : "White") : "Draw",
      };
    }

    const [evalBefore, topCands] = searchPosition(board, depth);
    if (topCands.length === 0) {
      return { game_over: true, reason: "No legal moves", winner: "Draw" };
    }

    let chosen = topCands[0];
    if (botStyle === "tactical" && topCands.length > 1) {
      if (Math.abs(topCands[0].eval_cp - topCands[1].eval_cp) < 55 && Math.random() < 0.25) {
        chosen = topCands[1];
      }
    } else if (botStyle === "club" && topCands.length > 1) {
      const weights = [0.60, 0.28, 0.12].slice(0, topCands.length);
      const totalW = weights.reduce((a, b) => a + b, 0);
      let roll = Math.random() * totalW;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { chosen = topCands[i]; break; }
      }
    }

    const color = board.turn;
    const moveNum = board.fullmove;
    board.applyMove(chosen.move);
    const fenAfter = board.toFen();
    const [evalAfter, nextTop] = searchPosition(board, depth);

    const wPctBefore = cpToWinPct(evalBefore);
    const wPctAfter = cpToWinPct(evalAfter);
    const moverWinBefore = color === "w" ? wPctBefore : 100.0 - wPctBefore;
    const moverWinAfter = color === "w" ? wPctAfter : 100.0 - wPctAfter;
    const winLoss = Math.max(0.0, moverWinBefore - moverWinAfter);

    let classification;
    if (chosen.uci === topCands[0].uci) classification = "best";
    else if (winLoss <= 4.0) classification = "excellent";
    else if (winLoss <= 9.0) classification = "good";
    else if (winLoss <= 16.0) classification = "inaccuracy";
    else classification = "mistake";

    const coach = buildCoachCommentary(classification, chosen.san, moveNum, color, topCands[0], evalAfter, winLoss);
    const nextLegal = board.legalMoves();
    const gameOver = nextLegal.length === 0 || board.halfmove >= 100;
    let reason = "";
    if (gameOver) {
      reason = inCheckFast(board, board.turn)
        ? `Checkmate! ${color === "w" ? "White" : "Black"} wins`
        : "Draw by Stalemate / 50-move rule";
    }

    return {
      game_over: gameOver,
      reason,
      color,
      move_number: moveNum,
      played: {
        san: chosen.san,
        uci: chosen.uci,
        from: chosen.from,
        to: chosen.to,
        classification,
        accuracy: computeMoveAccuracy(moverWinBefore, moverWinAfter),
      },
      fen_before: fen,
      fen_after: fenAfter,
      position: board.toPositionDict(),
      eval_cp: evalAfter,
      eval_str: formatEval(evalAfter),
      win_pct_white: Math.round(wPctAfter * 10) / 10,
      top_candidates_before: topCands.map((c, idx) => ({
        rank: idx + 1, san: c.san, uci: c.uci, from: c.from, to: c.to,
        eval_cp: c.eval_cp, eval_str: formatEval(c.eval_cp), pv: c.pv,
      })),
      next_best_candidates: nextTop.map((c, idx) => ({
        rank: idx + 1, san: c.san, uci: c.uci, from: c.from, to: c.to,
        eval_cp: c.eval_cp, eval_str: formatEval(c.eval_cp), pv: c.pv,
      })),
      legal_moves: gameOver ? [] : nextLegal.map((m) => ({
        from: rcToSq(m[0], m[1]),
        to: rcToSq(m[2], m[3]),
        san: board.moveToSan(m, nextLegal),
        uci: board.moveToUci(m),
      })),
      coach,
    };
  }

  function simulatePlayerMove(fen, fromSq, toSq) {
    const board = new ChessBoard(fen);
    const legal = board.legalMoves();
    let chosenMv = null;
    for (let i = 0; i < legal.length; i++) {
      const m = legal[i];
      if (rcToSq(m[0], m[1]) === fromSq && rcToSq(m[2], m[3]) === toSq) {
        if (m[4] === null || m[4] === "CASTLE" || m[4] === "EP" || m[4] === "Q") {
          chosenMv = m;
          break;
        }
      }
    }
    if (!chosenMv) return null;

    const color = board.turn;
    const moveNum = board.fullmove;
    const [evalBefore, topCands] = searchPosition(board, 2);
    const sanPlayed = board.moveToSan(chosenMv, legal);
    const uciPlayed = board.moveToUci(chosenMv);
    board.applyMove(chosenMv);
    const fenAfter = board.toFen();
    const [evalAfter, nextTop] = searchPosition(board, 2);

    const wBefore = cpToWinPct(evalBefore);
    const wAfter = cpToWinPct(evalAfter);
    const mBefore = color === "w" ? wBefore : 100.0 - wBefore;
    const mAfter = color === "w" ? wAfter : 100.0 - wAfter;
    const winLoss = Math.max(0.0, mBefore - mAfter);

    const bestCand = topCands.length > 0 ? topCands[0] : {
      uci: uciPlayed, san: sanPlayed, from: fromSq, to: toSq, pv: [sanPlayed],
    };

    let classification;
    if (uciPlayed === bestCand.uci || winLoss <= 1.5) classification = "best";
    else if (winLoss <= 4.0) classification = "excellent";
    else if (winLoss <= 8.0) classification = "good";
    else if (winLoss <= 15.0) classification = "inaccuracy";
    else if (winLoss <= 25.0) classification = "mistake";
    else classification = "blunder";

    const coach = buildCoachCommentary(classification, sanPlayed, moveNum, color, bestCand, evalAfter, winLoss);
    const nextLegal = board.legalMoves();
    const gameOver = nextLegal.length === 0;

    return {
      game_over: gameOver,
      color,
      move_number: moveNum,
      played: {
        san: sanPlayed,
        uci: uciPlayed,
        from: fromSq,
        to: toSq,
        classification,
        accuracy: computeMoveAccuracy(mBefore, mAfter),
      },
      fen_after: fenAfter,
      position: board.toPositionDict(),
      eval_cp: evalAfter,
      eval_str: formatEval(evalAfter),
      win_pct_white: Math.round(wAfter * 10) / 10,
      top_candidates_before: topCands.map((c, idx) => ({
        rank: idx + 1, san: c.san, uci: c.uci, from: c.from, to: c.to,
        eval_cp: c.eval_cp, eval_str: formatEval(c.eval_cp), pv: c.pv,
      })),
      next_best_candidates: nextTop.map((c, idx) => ({
        rank: idx + 1, san: c.san, uci: c.uci, from: c.from, to: c.to,
        eval_cp: c.eval_cp, eval_str: formatEval(c.eval_cp), pv: c.pv,
      })),
      legal_moves: nextLegal.map((m) => ({
        from: rcToSq(m[0], m[1]),
        to: rcToSq(m[2], m[3]),
        san: board.moveToSan(m, nextLegal),
        uci: board.moveToUci(m),
      })),
      coach,
    };
  }

  root.ChessEngine = {
    START_FEN,
    PIECE_VALUES,
    OPENING_BOOK,
    ChessBoard,
    _searchRoot,
    searchPosition,
    analyzeGamePgn,
    analyzeGamePgnAsync,
    parsePgnMoves,
    detectOpening,
    formatEval,
    cpToWinPct,
    computeMoveAccuracy,
    buildCoachCommentary,
    simulateNew,
    simulateStep,
    simulatePlayerMove,
  };
})(typeof window !== "undefined" ? window : self);
