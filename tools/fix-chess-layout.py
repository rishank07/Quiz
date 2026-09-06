#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHESS = ROOT / "chess.html"

CSS_MARKER = "/* EFP chess first-view layout */"
LAST_MOVE_MARKER = "/* EFP chess last-move arrow */"

LAYOUT_CSS = r'''

/* EFP chess first-view layout */
.setup-card{
  display:grid;
  grid-template-columns:minmax(220px,1.55fr) minmax(130px,.8fr) repeat(4,minmax(96px,.68fr));
  gap:8px;align-items:end;margin:0 0 12px;padding:10px;
  border:1px solid var(--line);
  background:linear-gradient(160deg,rgba(21,31,49,.97),rgba(8,13,24,.97));
  border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.22)
}
.setup-card .field select,.setup-card .btn{width:100%;min-height:42px}
@media(min-width:861px){
  body{padding-top:10px;padding-bottom:20px}
  .brand{margin-bottom:3px;padding:5px 9px}
  .brand img{width:40px;height:40px}
  .brand-name{font-size:15px}.brand-tag{font-size:9px}
  .hero{padding:3px 8px 9px}
  .eyebrow{font-size:9px}
  h1{margin:3px 0 0;font-size:clamp(24px,3vw,34px)}
  .hero .sub{display:none}
  #board{width:min(100%,calc(100dvh - 285px));max-width:700px;min-width:420px}
  .board-card{justify-self:center;width:max-content;max-width:100%}
  .panel{max-height:calc(100dvh - 250px);overflow:auto}
}
@media(max-width:860px){
  body{padding-top:8px}
  .brand{margin-bottom:3px;padding:5px 9px}
  .brand img{width:40px;height:40px}
  .brand-name{font-size:15px}.brand-tag{font-size:9px}
  .hero{padding:3px 6px 9px}
  .eyebrow{font-size:9px}
  h1{margin:4px 0 0;font-size:25px}
  .hero .sub{display:none}
  .setup-card{grid-template-columns:minmax(0,1.35fr) minmax(0,.85fr);gap:7px;margin-bottom:10px;padding:8px}
  .setup-card .field select,.setup-card .btn{min-height:41px;padding:8px 9px}
}
@media(max-width:430px){
  .setup-card{border-radius:14px}
  .setup-card .field label{font-size:8.8px}
  .setup-card .field select,.setup-card .btn{font-size:12px}
}
'''

LAST_MOVE_CSS = r'''

/* EFP chess last-move arrow */
#board{position:relative}
.efp-last-move-arrow{position:absolute;inset:0;width:100%;height:100%;z-index:8;pointer-events:none;overflow:visible}
.efp-last-move-arrow .move-line{stroke:#f6d98a;stroke-width:2.15;stroke-linecap:round;opacity:.94;filter:drop-shadow(0 1px 1.5px rgba(0,0,0,.72))}
.last-move-note{margin:6px auto 1px;width:max-content;max-width:96%;padding:5px 9px;border-radius:999px;border:1px solid rgba(246,217,138,.22);background:rgba(246,217,138,.07);color:#f6d98a;font-size:10.5px;font-weight:850;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.last-move-note[hidden]{display:none!important}
@media(max-width:430px){.last-move-note{font-size:9.8px;padding:4px 8px;margin-top:5px}}
'''

OLD_CONTROLS = r'''
        <div class="controls">
          <div class="row">
            <div class="field">
              <label for="level">COMPUTER LEVEL</label>
              <select id="level">
                <option value="1">1 · Beginner</option>
                <option value="2">2 · Easy</option>
                <option value="3">3 · Easy+</option>
                <option value="4">4 · Casual</option>
                <option value="5">5 · Medium</option>
                <option value="6">6 · Medium+</option>
                <option value="7">7 · Strong</option>
                <option value="8">8 · Strong+</option>
                <option value="9">9 · Expert</option>
                <option value="10">10 · Stockfish Challenge</option>
              </select>
            </div>
            <div class="field">
              <label for="side">PLAY AS</label>
              <select id="side">
                <option value="w">White</option>
                <option value="b">Black</option>
              </select>
            </div>
          </div>

          <div class="row">
            <button id="newGame" class="btn primary" type="button">New Game</button>
            <button id="undo" class="btn" type="button">↶ Undo</button>
          </div>
          <div class="row">
            <button id="hint" class="btn hint" type="button">💡 Hint</button>
            <button id="flip" class="btn" type="button">⇅ Flip Board</button>
          </div>
        </div>
'''

SETUP_BLOCK = r'''    <section class="setup-card" aria-label="Game setup and controls">
      <div class="field">
        <label for="level">COMPUTER LEVEL</label>
        <select id="level">
          <option value="1">1 · Beginner</option>
          <option value="2">2 · Easy</option>
          <option value="3">3 · Easy+</option>
          <option value="4">4 · Casual</option>
          <option value="5">5 · Medium</option>
          <option value="6">6 · Medium+</option>
          <option value="7">7 · Strong</option>
          <option value="8">8 · Strong+</option>
          <option value="9">9 · Expert</option>
          <option value="10">10 · Stockfish Challenge</option>
        </select>
      </div>
      <div class="field">
        <label for="side">PLAY AS</label>
        <select id="side">
          <option value="w">White</option>
          <option value="b">Black</option>
        </select>
      </div>
      <button id="newGame" class="btn primary" type="button">New Game</button>
      <button id="undo" class="btn" type="button">↶ Undo</button>
      <button id="hint" class="btn hint" type="button">💡 Hint</button>
      <button id="flip" class="btn" type="button">⇅ Flip Board</button>
    </section>

'''

BOARD_HTML = '        <div id="board" aria-label="Interactive chess board"></div>\n'
BOARD_HTML_WITH_NOTE = BOARD_HTML + '        <div class="last-move-note" id="lastMoveNote" hidden aria-live="polite"></div>\n'

OLD_SHOW_LAST = r'''    function showLastMove() {
      if (!board.removeMarkers) return;
      board.removeMarkers(MARKER_TYPE.square);
      const hist = game.history({verbose:true});
      const m = hist[hist.length - 1];
      if (m) {
        board.addMarker(MARKER_TYPE.square, m.from);
        board.addMarker(MARKER_TYPE.square, m.to);
      }
    }
'''

NEW_SHOW_LAST = r'''    function ensureLastMoveArrow() {
      let svg = document.getElementById("lastMoveArrow");
      if (svg) return svg;
      const host = document.getElementById("board");
      if (!host) return null;
      const ns = "http://www.w3.org/2000/svg";
      svg = document.createElementNS(ns, "svg");
      svg.id = "lastMoveArrow";
      svg.classList.add("efp-last-move-arrow");
      svg.setAttribute("viewBox", "0 0 100 100");
      svg.setAttribute("preserveAspectRatio", "none");
      svg.setAttribute("aria-hidden", "true");
      const defs = document.createElementNS(ns, "defs");
      const marker = document.createElementNS(ns, "marker");
      marker.id = "lastMoveArrowHead";
      marker.setAttribute("viewBox", "0 0 10 10");
      marker.setAttribute("refX", "8.2");
      marker.setAttribute("refY", "5");
      marker.setAttribute("markerWidth", "5");
      marker.setAttribute("markerHeight", "5");
      marker.setAttribute("orient", "auto-start-reverse");
      const head = document.createElementNS(ns, "path");
      head.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      head.setAttribute("fill", "#f6d98a");
      marker.appendChild(head);
      defs.appendChild(marker);
      svg.appendChild(defs);
      const line = document.createElementNS(ns, "line");
      line.classList.add("move-line");
      line.setAttribute("marker-end", "url(#lastMoveArrowHead)");
      svg.appendChild(line);
      host.appendChild(svg);
      return svg;
    }

    function squarePoint(square) {
      const file = square.charCodeAt(0) - 97;
      const rank = Number(square[1]);
      const black = board.getOrientation() === COLOR.black;
      return {
        x: ((black ? 7 - file : file) + .5) * 12.5,
        y: ((black ? rank - 1 : 8 - rank) + .5) * 12.5
      };
    }

    function showLastMove() {
      if (board.removeMarkers) board.removeMarkers(MARKER_TYPE.square);
      const hist = game.history({verbose:true});
      const m = hist[hist.length - 1];
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
        lastMoveNote.textContent = `Latest · ${actor}: ${m.from} → ${m.to}`;
        lastMoveNote.hidden = false;
      }
    }
'''

OLD_FLIP = r'''    flipBtn.addEventListener("click", () => {
      const next = board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white;
      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        persist();
      });
    });
'''

NEW_FLIP = r'''    flipBtn.addEventListener("click", () => {
      const next = board.getOrientation() === COLOR.white ? COLOR.black : COLOR.white;
      board.setOrientation(next, true).then(() => {
        updatePlayerBars();
        showLastMove();
        persist();
      });
    });
'''


def patch(text: str) -> str:
    if CSS_MARKER not in text:
        if "</style>" not in text:
            raise SystemExit("Chess style closing tag not found")
        text = text.replace("</style>", LAYOUT_CSS + "  </style>", 1)

    if LAST_MOVE_MARKER not in text:
        if "</style>" not in text:
            raise SystemExit("Chess style closing tag not found for last-move CSS")
        text = text.replace("</style>", LAST_MOVE_CSS + "  </style>", 1)

    if 'class="setup-card"' not in text:
        anchor = '    <section class="game-shell">\n'
        if anchor not in text:
            raise SystemExit("Chess game-shell anchor not found")
        if OLD_CONTROLS not in text:
            raise SystemExit("Chess controls block not found")
        text = text.replace(anchor, SETUP_BLOCK + anchor, 1)
        text = text.replace(OLD_CONTROLS, "\n", 1)

    if 'id="lastMoveNote"' not in text:
        if BOARD_HTML not in text:
            raise SystemExit("Chess board HTML anchor not found")
        text = text.replace(BOARD_HTML, BOARD_HTML_WITH_NOTE, 1)

    if 'const lastMoveNote = document.getElementById("lastMoveNote");' not in text:
        anchor = '    const sideLabel = document.getElementById("sideLabel");\n'
        if anchor not in text:
            raise SystemExit("Chess sideLabel JS anchor not found")
        text = text.replace(anchor, anchor + '    const lastMoveNote = document.getElementById("lastMoveNote");\n', 1)

    if "function ensureLastMoveArrow()" not in text:
        if OLD_SHOW_LAST not in text:
            raise SystemExit("Chess showLastMove function not found")
        text = text.replace(OLD_SHOW_LAST, NEW_SHOW_LAST, 1)

    if 'showLastMove();\n        persist();' not in text:
        if OLD_FLIP not in text:
            raise SystemExit("Chess flip handler not found")
        text = text.replace(OLD_FLIP, NEW_FLIP, 1)

    for ident in ("level", "side", "newGame", "undo", "hint", "flip", "lastMoveNote"):
        count = text.count(f'id="{ident}"')
        if count != 1:
            raise SystemExit(f"Chess control id {ident!r} appears {count} times")
    return text


def main() -> None:
    old = CHESS.read_text(encoding="utf-8")
    new = patch(old)
    if new == old:
        print("Updated: nothing")
        return
    CHESS.write_text(new, encoding="utf-8", newline="\n")
    print("Updated: chess.html")


if __name__ == "__main__":
    main()
