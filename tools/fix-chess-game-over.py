#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHESS = ROOT / "chess.html"
SW = ROOT / "service-worker.js"

CSS_MARKER = "/* EFP chess game-over overlay */"
CSS = r'''

/* EFP chess game-over overlay */
.efp-mated-king{
  position:absolute;width:12.5%;height:12.5%;transform:translate(-50%,-50%);z-index:10;pointer-events:none;
  border-radius:12%;border:2px solid rgba(255,92,92,.98);background:rgba(239,68,68,.34);
  box-shadow:inset 0 0 0 2px rgba(127,29,29,.35),0 0 0 3px rgba(239,68,68,.15),0 0 22px rgba(239,68,68,.78);
  animation:efpMateKingPulse 1.05s ease-in-out infinite alternate
}
@keyframes efpMateKingPulse{from{background:rgba(239,68,68,.28);box-shadow:inset 0 0 0 2px rgba(127,29,29,.32),0 0 0 3px rgba(239,68,68,.12),0 0 14px rgba(239,68,68,.54)}to{background:rgba(239,68,68,.48);box-shadow:inset 0 0 0 2px rgba(127,29,29,.46),0 0 0 4px rgba(239,68,68,.20),0 0 28px rgba(239,68,68,.94)}}
.game-over-overlay{position:fixed;inset:0;z-index:2147482600;display:grid;place-items:center;padding:18px;background:rgba(2,6,23,.72);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
.game-over-overlay[hidden]{display:none!important}
.game-over-card{width:min(92vw,390px);padding:22px 19px 18px;border-radius:22px;text-align:center;background:linear-gradient(160deg,rgba(24,34,52,.99),rgba(7,12,23,.99));border:1px solid rgba(246,217,138,.28);box-shadow:0 28px 70px rgba(0,0,0,.58)}
.game-over-kicker{font-size:9px;font-weight:900;letter-spacing:.15em;color:var(--gold2)}
.game-over-icon{font-size:34px;line-height:1;margin:10px 0 7px}.game-over-title{margin:0;font-size:27px;line-height:1.12}.game-over-reason{margin-top:7px;color:var(--muted);font-size:13px;font-weight:700}.game-over-score{margin:13px auto 0;width:max-content;min-width:92px;padding:8px 12px;border-radius:999px;background:rgba(246,217,138,.09);border:1px solid rgba(246,217,138,.18);color:var(--gold2);font-size:18px;font-weight:900;letter-spacing:.04em}
.game-over-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:17px}.game-over-actions .btn{width:100%}.game-over-actions .btn.primary{background:linear-gradient(135deg,#473615,#6a4c17)}
@media(max-width:430px){.game-over-card{padding:20px 16px 16px;border-radius:19px}.game-over-title{font-size:24px}.game-over-icon{font-size:31px}.game-over-actions{grid-template-columns:1fr}.game-over-score{font-size:17px}}
'''

OVERLAY_HTML = r'''
  <div class="game-over-overlay" id="gameOverOverlay" hidden role="dialog" aria-modal="true" aria-labelledby="gameOverTitle">
    <div class="game-over-card">
      <div class="game-over-kicker">GAME OVER</div>
      <div class="game-over-icon" id="gameOverIcon" aria-hidden="true">♚</div>
      <h2 class="game-over-title" id="gameOverTitle">Game Over</h2>
      <div class="game-over-reason" id="gameOverReason">Result</div>
      <div class="game-over-score" id="gameOverScore">½–½</div>
      <div class="game-over-actions">
        <button class="btn primary" id="gameOverNew" type="button">New Game</button>
        <button class="btn" id="gameOverClose" type="button">View Board</button>
      </div>
    </div>
  </div>
'''

DECL_OLD = '    const lastMoveNote = document.getElementById("lastMoveNote");\n'
DECL_NEW = '''    const lastMoveNote = document.getElementById("lastMoveNote");
    const gameOverOverlay = document.getElementById("gameOverOverlay");
    const gameOverIcon = document.getElementById("gameOverIcon");
    const gameOverTitle = document.getElementById("gameOverTitle");
    const gameOverReason = document.getElementById("gameOverReason");
    const gameOverScore = document.getElementById("gameOverScore");
    const gameOverNew = document.getElementById("gameOverNew");
    const gameOverClose = document.getElementById("gameOverClose");
'''

STATE_OLD = '    let audioCtx = null;\n'
STATE_NEW = '    let audioCtx = null;\n    let gameOverModalKey = "";\n'

SQUARE_POINT_BLOCK = '''    function squarePoint(square) {
      const file = square.charCodeAt(0) - 97;
      const rank = Number(square[1]);
      const black = board.getOrientation() === COLOR.black;
      return {
        x: ((black ? 7 - file : file) + .5) * 12.5,
        y: ((black ? rank - 1 : 8 - rank) + .5) * 12.5
      };
    }
'''

GAME_OVER_FUNCS = r'''

    function findKingSquare(color) {
      for (const file of "abcdefgh") {
        for (let rank = 1; rank <= 8; rank++) {
          const square = file + rank;
          const piece = game.get(square);
          if (piece && piece.type === "k" && piece.color === color) return square;
        }
      }
      return null;
    }

    function clearMatedKing() {
      const old = document.getElementById("matedKingGlow");
      if (old) old.remove();
    }

    function showMatedKing() {
      clearMatedKing();
      if (!game.isCheckmate()) return;
      const square = findKingSquare(game.turn());
      const host = document.getElementById("board");
      if (!square || !host) return;
      const point = squarePoint(square);
      const glow = document.createElement("div");
      glow.id = "matedKingGlow";
      glow.className = "efp-mated-king";
      glow.setAttribute("aria-hidden", "true");
      glow.style.left = point.x + "%";
      glow.style.top = point.y + "%";
      host.appendChild(glow);
    }

    function hideGameOver() {
      if (!gameOverOverlay) return;
      gameOverOverlay.hidden = true;
    }

    function clearGameEndState() {
      hideGameOver();
      gameOverModalKey = "";
      clearMatedKing();
    }

    function drawReason() {
      if (game.isStalemate()) return "Stalemate";
      if (game.isThreefoldRepetition()) return "Threefold repetition";
      if (game.isInsufficientMaterial()) return "Insufficient material";
      if (typeof game.isDrawByFiftyMoves === "function" && game.isDrawByFiftyMoves()) return "50-move rule";
      return "Draw";
    }

    function showGameOver() {
      if (!gameOverOverlay || !game.isGameOver()) return;
      const key = game.fen();
      if (gameOverModalKey === key) return;
      gameOverModalKey = key;

      if (game.isCheckmate()) {
        const winner = game.turn() === "w" ? "b" : "w";
        const youWon = winner === human;
        gameOverIcon.textContent = youWon ? "🏆" : "♚";
        gameOverTitle.textContent = youWon ? "You Win!" : "Stockfish Wins";
        gameOverReason.textContent = "Checkmate";
        gameOverScore.textContent = winner === "w" ? "1–0" : "0–1";
        showMatedKing();
      } else {
        clearMatedKing();
        gameOverIcon.textContent = "½";
        gameOverTitle.textContent = "Draw";
        gameOverReason.textContent = drawReason();
        gameOverScore.textContent = "½–½";
      }
      gameOverOverlay.hidden = false;
    }
'''

UPDATE_STATUS_OLD = '''      if (game.isCheckmate()) {
        setStatus(game.turn() === human ? "Checkmate — Stockfish wins." : "Checkmate — You win! 🎉");
        board.disableMoveInput();
        return;
      }
      if (isDraw()) {
        setStatus("Game drawn.");
        board.disableMoveInput();
        return;
      }
'''
UPDATE_STATUS_NEW = '''      if (game.isCheckmate()) {
        const winner = game.turn() === "w" ? "b" : "w";
        setStatus(winner === human ? "Checkmate — You win! 🎉" : "Checkmate — Stockfish wins.");
        board.disableMoveInput();
        showMatedKing();
        showGameOver();
        return;
      }
      if (game.isStalemate()) {
        setStatus("Draw — Stalemate.");
        board.disableMoveInput();
        showGameOver();
        return;
      }
      if (isDraw()) {
        setStatus("Game drawn — " + drawReason() + ".");
        board.disableMoveInput();
        showGameOver();
        return;
      }
'''

NEW_GAME_OLD = '''      clearHintMarkers();
      if (board.removeMarkers) board.removeMarkers(MARKER_TYPE.square);
      board.setOrientation(colorObj(human), false);
'''
NEW_GAME_NEW = '''      clearHintMarkers();
      clearGameEndState();
      if (board.removeMarkers) board.removeMarkers(MARKER_TYPE.square);
      board.setOrientation(colorObj(human), false);
'''

UNDO_OLD = '''      const count = hist.length - humanIndex;
      for (let i = 0; i < count; i++) game.undo();
      syncBoard(true).then(() => {
'''
UNDO_NEW = '''      const count = hist.length - humanIndex;
      for (let i = 0; i < count; i++) game.undo();
      clearGameEndState();
      syncBoard(true).then(() => {
'''

FLIP_OLD = '''      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        showLastMove();
        persist();
      });
'''
FLIP_NEW = '''      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        showLastMove();
        if (game.isCheckmate()) showMatedKing();
        persist();
      });
'''

EVENT_ANCHOR = '    sideEl.addEventListener("change", newGame);\n'
EVENTS = '''    sideEl.addEventListener("change", newGame);
    if (gameOverNew) gameOverNew.addEventListener("click", newGame);
    if (gameOverClose) gameOverClose.addEventListener("click", hideGameOver);
    if (gameOverOverlay) gameOverOverlay.addEventListener("click", event => {
      if (event.target === gameOverOverlay) hideGameOver();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && gameOverOverlay && !gameOverOverlay.hidden) hideGameOver();
    });
'''


def patch_chess(text: str) -> str:
    if CSS_MARKER not in text:
        if "</style>" not in text:
            raise SystemExit("Chess style closing tag not found")
        text = text.replace("</style>", CSS + "  </style>", 1)

    if 'id="gameOverOverlay"' not in text:
        anchor = '  <div class="toast" id="toast" role="status" aria-live="polite"></div>\n'
        if anchor not in text:
            raise SystemExit("Chess toast anchor not found")
        text = text.replace(anchor, anchor + OVERLAY_HTML, 1)

    if 'const gameOverOverlay = document.getElementById("gameOverOverlay")' not in text:
        if DECL_OLD not in text:
            raise SystemExit("Chess declaration anchor not found")
        text = text.replace(DECL_OLD, DECL_NEW, 1)

    if 'let gameOverModalKey = "";' not in text:
        if STATE_OLD not in text:
            raise SystemExit("Chess state anchor not found")
        text = text.replace(STATE_OLD, STATE_NEW, 1)

    if 'function showGameOver()' not in text:
        if SQUARE_POINT_BLOCK not in text:
            raise SystemExit("Chess squarePoint block not found")
        text = text.replace(SQUARE_POINT_BLOCK, SQUARE_POINT_BLOCK + GAME_OVER_FUNCS, 1)

    if 'showGameOver();\n        return;\n      }\n      if (game.isStalemate())' not in text:
        if UPDATE_STATUS_OLD not in text:
            raise SystemExit("Chess game-over status block not found")
        text = text.replace(UPDATE_STATUS_OLD, UPDATE_STATUS_NEW, 1)

    if 'clearHintMarkers();\n      clearGameEndState();' not in text:
        if NEW_GAME_OLD not in text:
            raise SystemExit("Chess new-game marker not found")
        text = text.replace(NEW_GAME_OLD, NEW_GAME_NEW, 1)

    if 'for (let i = 0; i < count; i++) game.undo();\n      clearGameEndState();' not in text:
        if UNDO_OLD not in text:
            raise SystemExit("Chess undo marker not found")
        text = text.replace(UNDO_OLD, UNDO_NEW, 1)

    if 'if (game.isCheckmate()) showMatedKing();' not in text:
        if FLIP_OLD not in text:
            raise SystemExit("Chess flip marker not found")
        text = text.replace(FLIP_OLD, FLIP_NEW, 1)

    if 'gameOverNew.addEventListener("click", newGame)' not in text:
        if EVENT_ANCHOR not in text:
            raise SystemExit("Chess event anchor not found")
        text = text.replace(EVENT_ANCHOR, EVENTS, 1)

    required = [
        'id="gameOverOverlay"',
        'id="gameOverNew"',
        'function showMatedKing()',
        'function showGameOver()',
        'game.isStalemate()',
        'clearGameEndState()',
    ]
    missing = [x for x in required if x not in text]
    if missing:
        raise SystemExit("Chess game-over patch missing markers: " + ", ".join(missing))
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v60-chess-game-over";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service worker cache version marker not found")
    return text


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding="utf-8")
    if old == new:
        return False
    path.write_text(new, encoding="utf-8", newline="\n")
    return True


def main() -> None:
    changed = []
    if write(CHESS, patch_chess(CHESS.read_text(encoding="utf-8"))):
        changed.append("chess.html")
    if write(SW, patch_sw(SW.read_text(encoding="utf-8"))):
        changed.append("service-worker.js")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))


if __name__ == "__main__":
    main()
