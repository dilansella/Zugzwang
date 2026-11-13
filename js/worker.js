/* Web Worker for parallel single-ply chess search evaluation */
importScripts("engine.js");

self.onmessage = function (e) {
  const msg = e.data;
  if (!msg || msg.type === "ping") {
    self.postMessage({ id: msg ? msg.id : null, ok: true });
    return;
  }
  try {
    const board = new self.ChessEngine.ChessBoard(msg.fenBefore);
    const legal = board.legalMoves();
    const res = self.ChessEngine._searchRoot(board, msg.depth, msg.mv, legal);
    self.postMessage({ id: msg.id, ok: true, result: res });
  } catch (err) {
    self.postMessage({ id: msg.id, ok: false, error: err ? String(err) : "Worker search error" });
  }
};
