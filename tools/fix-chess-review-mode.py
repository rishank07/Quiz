#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHESS = ROOT / "chess.html"
SW = ROOT / "service-worker.js"

CSS_MARKER = "/* EFP chess move-review mode */"
CSS = r'''

/* EFP chess move-review mode */
.review-controls{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin:0 0 9px}
.review-btn{min-height:34px;border-radius:9px;border:1px solid rgba(246,217,138,.18);background:rgba(255,255,255,.035);color:var(--text);font:800 10px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;cursor:pointer;padding:7px 8px}
.review-btn:hover{border-color:rgba(246,217,138,.48)}.review-btn:disabled{opacity:.38;cursor:not-allowed}
.review-btn.live{border-color:rgba(88,199,138,.26);color:#a7f3d0}.review-btn.live.active{background:rgba(88,199,138,.12);border-color:rgba(88,199,138,.5)}
.review-position{grid-column:1/-1;text-align:center;color:var(--muted);font-size:9.5px;font-weight:750;min-height:13px;margin-top:-1px}
.move-list{white-space:normal;display:grid;grid-template-columns:1fr 1fr;gap:4px;align-content:start}
.move-entry{display:flex;align-items:center;gap:5px;min-width:0;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--muted);font:700 10.5px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace;padding:6px 7px;text-align:left;cursor:pointer}
.move-entry:hover{background:rgba(255,255,255,.045);color:var(--text)}.move-entry.active{background:rgba(246,217,138,.11);border-color:rgba(246,217,138,.24);color:var(--gold2)}
.move-entry .move-no{flex:0 0 auto;color:#718096;font-size:9px}.move-entry .move-san{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
@media(max-width:430px){.review-btn{font-size:9.4px;padding:6px 5px}.move-entry{font-size:10px;padding:5px 6px}.review-position{font-size:9px}}
'''

REVIEW_HTML = r'''          <div class="review-controls" aria-label="Move review controls">
            <button class="review-btn" id="reviewPrev" type="button">← Previous</button>
            <button class="review-btn" id="reviewNext" type="button">Next →</button>
            <button class="review-btn live active" id="reviewLive" type="button">● Live</button>
            <div class="review-position" id="reviewPosition">Live position</div>
          </div>
'''

DECL_ANCHOR = '    const gameOverClose = document.getElementById("gameOverClose");\n'
DECL_NEW = DECL_ANCHOR + '''    const reviewPrev = document.getElementById("reviewPrev");
    const reviewNext = document.getElementById("reviewNext");
    const reviewLive = document.getElementById("reviewLive");
    const reviewPosition = document.getElementById("reviewPosition");
'''

STATE_ANCHOR = '    let gameOverModalKey = "";\n'
STATE_NEW = STATE_ANCHOR + '    let reviewPly = null;\n'

UPDATE_MOVES = r'''    function updateMoves() {
      const h = game.history({verbose:true});
      moveCountEl.textContent = `${h.length} ${h.length === 1 ? "move" : "moves"}`;
      moveListEl.innerHTML = "";
      if (!h.length) {
        const empty = document.createElement("div");
        empty.textContent = "No moves yet.";
        empty.style.gridColumn = "1 / -1";
        moveListEl.appendChild(empty);
        updateReviewControls();
        return;
      }
      h.forEach((m, i) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "move-entry";
        button.dataset.ply = String(i + 1);
        button.title = `View position after ${m.from} → ${m.to}`;
        const no = document.createElement("span");
        no.className = "move-no";
        no.textContent = m.color === "w" ? `${Math.floor(i/2)+1}.` : `${Math.floor(i/2)+1}...`;
        const san = document.createElement("span");
        san.className = "move-san";
        san.textContent = m.san || `${m.from}-${m.to}`;
        button.append(no, san);
        moveListEl.appendChild(button);
      });
      if (reviewPly === null) moveListEl.scrollTop = moveListEl.scrollHeight;
      updateReviewControls();
    }
'''

ARROW_REVIEW = r'''    function paintMoveArrow(m, mode="latest") {
      if (board.removeMarkers) board.removeMarkers(MARKER_TYPE.square);
      const svg = ensureLastMoveArrow();
      const line = svg ? svg.querySelector(".move-line") : null;
      if (!m) {
        if (line) line.setAttribute("visibility", "hidden");
        if (lastMoveNote) lastMoveNote.hidden = true;
        return;
      }
      if (board.addMarker) {
        board.addMarker(MARKER_TYPE.square, m.from);
        board.addMarker(MARKER_TYPE.square, m.to);
      }
      const a = squarePoint(m.from), b = squarePoint(m.to);
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      if (line) {
        line.setAttribute("x1", String(a.x + ux * 2.6));
        line.setAttribute("y1", String(a.y + uy * 2.6));
        line.setAttribute("x2", String(b.x - ux * 4.2));
        line.setAttribute("y2", String(b.y - uy * 4.2));
        line.removeAttribute("visibility");
      }
      if (lastMoveNote) {
        const actor = m.color === human ? "You" : "Computer";
        lastMoveNote.textContent = `${mode === "review" ? "Review" : "Latest"} · ${actor}: ${m.from} → ${m.to}`;
        lastMoveNote.hidden = false;
      }
    }

    function showLastMove() {
      const hist = game.history({verbose:true});
      paintMoveArrow(hist[hist.length - 1] || null, "latest");
    }

    function reviewGameAt(ply) {
      const temp = new Chess();
      const hist = game.history({verbose:true});
      for (let i = 0; i < Math.min(ply, hist.length); i++) {
        const m = hist[i];
        temp.move({from:m.from, to:m.to, promotion:m.promotion});
      }
      return temp;
    }

    function updateReviewControls() {
      const total = game.history().length;
      const reviewing = reviewPly !== null;
      if (reviewPrev) reviewPrev.disabled = thinking || !total || (reviewing && reviewPly <= 0);
      if (reviewNext) reviewNext.disabled = thinking || !reviewing;
      if (reviewLive) {
        reviewLive.disabled = !reviewing;
        reviewLive.classList.toggle("active", !reviewing);
      }
      if (reviewPosition) reviewPosition.textContent = reviewing ? `Reviewing ${reviewPly} / ${total} moves` : "Live position";
      if (moveListEl) {
        moveListEl.querySelectorAll(".move-entry").forEach(el => {
          const ply = Number(el.dataset.ply || 0);
          el.classList.toggle("active", reviewing && ply === reviewPly);
        });
      }
    }

    function renderReview(ply, animated=true) {
      const hist = game.history({verbose:true});
      const total = hist.length;
      reviewPly = Math.max(0, Math.min(total, Number(ply) || 0));
      clearHintMarkers();
      clearMatedKing();
      hideGameOver();
      board.disableMoveInput();
      const temp = reviewGameAt(reviewPly);
      return board.setPosition(temp.fen(), animated).then(() => {
        paintMoveArrow(reviewPly > 0 ? hist[reviewPly - 1] : null, "review");
        updateReviewControls();
        setStatus(`Reviewing move ${reviewPly} of ${total} · tap Live to continue`);
      });
    }

    function setReviewPly(ply) {
      if (thinking) {
        toast("Stockfish is thinking — review after its move.");
        return;
      }
      if (!game.history().length) return;
      renderReview(ply, true);
    }

    function goLive() {
      if (reviewPly === null) return;
      reviewPly = null;
      return board.setPosition(game.fen(), true).then(() => {
        showLastMove();
        if (game.isCheckmate()) showMatedKing();
        updateReviewControls();
        if (!game.isGameOver() && game.turn() === human && !thinking) enableHumanInput();
        else updateStatus();
      });
    }
'''

STATUS_OLD = '''      updatePlayerBars();
      updateMoves();
      undoBtn.disabled = !game.history({verbose:true}).some(m => m.color === human);
      hintBtn.disabled = thinking || game.isGameOver() || game.turn() !== human;
'''
STATUS_NEW = '''      updatePlayerBars();
      updateMoves();
      undoBtn.disabled = reviewPly !== null || !game.history({verbose:true}).some(m => m.color === human);
      hintBtn.disabled = reviewPly !== null || thinking || game.isGameOver() || game.turn() !== human;
      if (reviewPly !== null) {
        board.disableMoveInput();
        setStatus(`Reviewing move ${reviewPly} of ${game.history().length} · tap Live to continue`);
        updateReviewControls();
        return;
      }
'''

ENABLE_OLD = '''    function enableHumanInput() {
      if (thinking || game.isGameOver() || game.turn() !== human) {
'''
ENABLE_NEW = '''    function enableHumanInput() {
      if (reviewPly !== null) {
        board.disableMoveInput();
        updateStatus();
        return;
      }
      if (thinking || game.isGameOver() || game.turn() !== human) {
'''

NEW_GAME_OLD = '''      thinking = false;
      pendingMode = null;
      queuedAction = null;
      clearHintMarkers();
      clearGameEndState();
'''
NEW_GAME_NEW = '''      thinking = false;
      pendingMode = null;
      queuedAction = null;
      reviewPly = null;
      clearHintMarkers();
      clearGameEndState();
'''

FLIP_OLD = '''      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        showLastMove();
        if (game.isCheckmate()) showMatedKing();
        persist();
      });
'''
FLIP_NEW = '''      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        if (reviewPly !== null) renderReview(reviewPly, false);
        else {
          showLastMove();
          if (game.isCheckmate()) showMatedKing();
        }
        persist();
      });
'''

EVENT_ANCHOR = '    if (gameOverNew) gameOverNew.addEventListener("click", newGame);\n'
EVENTS = '''    if (reviewPrev) reviewPrev.addEventListener("click", () => {
      const total = game.history().length;
      setReviewPly(reviewPly === null ? Math.max(0, total - 1) : Math.max(0, reviewPly - 1));
    });
    if (reviewNext) reviewNext.addEventListener("click", () => {
      if (reviewPly === null) return;
      const total = game.history().length;
      if (reviewPly >= total) goLive();
      else setReviewPly(reviewPly + 1);
    });
    if (reviewLive) reviewLive.addEventListener("click", goLive);
    if (moveListEl) moveListEl.addEventListener("click", event => {
      const button = event.target && event.target.closest ? event.target.closest(".move-entry[data-ply]") : null;
      if (!button) return;
      setReviewPly(Number(button.dataset.ply));
    });
    if (gameOverNew) gameOverNew.addEventListener("click", newGame);
'''


def replace_function(text: str, name: str, replacement: str, next_name: str) -> str:
    pattern = rf'    function {re.escape(name)}\(\) \{{.*?\n    \}}\n\n    function {re.escape(next_name)}'
    m = re.search(pattern, text, flags=re.S)
    if not m:
        raise SystemExit(f"Chess function block {name} not found")
    return text[:m.start()] + replacement + "\n    function " + next_name + text[m.end():]


def patch_chess(text: str) -> str:
    if CSS_MARKER not in text:
        text = text.replace("</style>", CSS + "  </style>", 1)

    if 'id="reviewPrev"' not in text:
        anchor = '          <div class="moves-head"><h2>MOVES</h2><small id="moveCount">0 moves</small></div>\n'
        if anchor not in text:
            raise SystemExit("Chess moves header anchor not found")
        text = text.replace(anchor, anchor + REVIEW_HTML, 1)

    if 'const reviewPrev = document.getElementById("reviewPrev")' not in text:
        if DECL_ANCHOR not in text:
            raise SystemExit("Chess review declaration anchor not found")
        text = text.replace(DECL_ANCHOR, DECL_NEW, 1)

    if 'let reviewPly = null;' not in text:
        if STATE_ANCHOR not in text:
            raise SystemExit("Chess review state anchor not found")
        text = text.replace(STATE_ANCHOR, STATE_NEW, 1)

    if 'button.className = "move-entry";' not in text:
        text = replace_function(text, "updateMoves", UPDATE_MOVES.rstrip(), "clearHintMarkers")

    if 'function paintMoveArrow(' not in text:
        pattern = r'    function showLastMove\(\) \{.*?\n    \}\n\n    function isDraw\(\)'
        m = re.search(pattern, text, flags=re.S)
        if not m:
            raise SystemExit("Chess last-move block not found")
        text = text[:m.start()] + ARROW_REVIEW.rstrip() + "\n\n    function isDraw()" + text[m.end():]

    if 'undoBtn.disabled = reviewPly !== null' not in text:
        if STATUS_OLD not in text:
            raise SystemExit("Chess status review anchor not found")
        text = text.replace(STATUS_OLD, STATUS_NEW, 1)

    if 'if (reviewPly !== null) {\n        board.disableMoveInput();\n        updateStatus();' not in text:
        if ENABLE_OLD not in text:
            raise SystemExit("Chess enable-input anchor not found")
        text = text.replace(ENABLE_OLD, ENABLE_NEW, 1)

    if 'queuedAction = null;\n      reviewPly = null;' not in text:
        if NEW_GAME_OLD not in text:
            raise SystemExit("Chess new-game review anchor not found")
        text = text.replace(NEW_GAME_OLD, NEW_GAME_NEW, 1)

    if 'if (reviewPly !== null) renderReview(reviewPly, false);' not in text:
        if FLIP_OLD not in text:
            raise SystemExit("Chess flip review anchor not found")
        text = text.replace(FLIP_OLD, FLIP_NEW, 1)

    if 'reviewPrev.addEventListener("click"' not in text:
        if EVENT_ANCHOR not in text:
            raise SystemExit("Chess review event anchor not found")
        text = text.replace(EVENT_ANCHOR, EVENTS, 1)

    required = [
        'id="reviewPrev"', 'id="reviewNext"', 'id="reviewLive"',
        'function renderReview(', 'function goLive()', 'button.className = "move-entry"',
        'reviewPly !== null', 'move-entry[data-ply]'
    ]
    missing = [x for x in required if x not in text]
    if missing:
        raise SystemExit("Chess review patch missing markers: " + ", ".join(missing))
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v61-chess-review-mode";',
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
