#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CHESS = ROOT / "chess.html"
SW = ROOT / "service-worker.js"

CSS_MARKER = "/* EFP chess captured-pieces strip */"
CSS = r'''

/* EFP chess captured-pieces strip */
.playerbar>span:first-child{display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden}
.playerbar>span:first-child>.dot{flex:0 0 auto;margin-right:1px}
.captured-pieces{display:inline-flex;align-items:center;gap:4px;min-width:0;max-width:62%;overflow:hidden;white-space:nowrap;color:#cbd5e1}
.capture-prefix{flex:0 0 auto;color:#718096;font-size:8px;font-weight:800;letter-spacing:.02em;text-transform:uppercase}
.capture-glyphs{display:inline-flex;align-items:center;min-width:0;overflow:hidden;font-family:"Segoe UI Symbol","Noto Sans Symbols 2","Arial Unicode MS",serif;font-size:15px;line-height:1;letter-spacing:-1px;color:#e5e7eb;filter:drop-shadow(0 1px 1px rgba(0,0,0,.45))}
.capture-empty{color:#64748b;font-size:10px;font-weight:750}
.capture-advantage{flex:0 0 auto;color:#86efac;font-size:9.5px;font-weight:900}
@media(max-width:430px){
  .playerbar>span:first-child{gap:4px;max-width:80%}
  .captured-pieces{gap:3px;max-width:58%}
  .capture-prefix{display:none}
  .capture-glyphs{font-size:14px;letter-spacing:-1.2px}
  .capture-advantage{font-size:9px}
}
'''

TOP_OLD = '          <span><span class="dot"></span><strong id="topName">Stockfish 18</strong></span>\n'
TOP_NEW = '          <span><span class="dot"></span><strong id="topName">Stockfish 18</strong><span class="captured-pieces" id="topCaptured" aria-label="Captured pieces"></span></span>\n'
BOTTOM_OLD = '          <span><span class="dot"></span><strong id="bottomName">You</strong></span>\n'
BOTTOM_NEW = '          <span><span class="dot"></span><strong id="bottomName">You</strong><span class="captured-pieces" id="bottomCaptured" aria-label="Captured pieces"></span></span>\n'

DECL_ANCHOR = '    const reviewPosition = document.getElementById("reviewPosition");\n'
DECL_ADD = DECL_ANCHOR + '    const topCaptured = document.getElementById("topCaptured");\n    const bottomCaptured = document.getElementById("bottomCaptured");\n'

CAPTURE_FUNCS = r'''

    const CAPTURE_GLYPHS = {
      w:{q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},
      b:{q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}
    };
    const CAPTURE_NAMES = {q:"queen",r:"rook",b:"bishop",n:"knight",p:"pawn"};
    const CAPTURE_VALUES = {q:9,r:5,b:3,n:3,p:1};
    const CAPTURE_ORDER = {q:0,r:1,b:2,n:3,p:4};

    function capturedState() {
      const hist = game.history({verbose:true});
      const limit = reviewPly === null ? hist.length : Math.max(0, Math.min(hist.length, reviewPly));
      const out = {you:{pieces:[],score:0},computer:{pieces:[],score:0}};
      for (let i = 0; i < limit; i++) {
        const m = hist[i];
        if (!m.captured) continue;
        const actor = m.color === human ? out.you : out.computer;
        const color = m.color === "w" ? "b" : "w";
        actor.pieces.push({type:m.captured,color,index:i});
        actor.score += CAPTURE_VALUES[m.captured] || 0;
      }
      for (const side of [out.you,out.computer]) {
        side.pieces.sort((a,b) => (CAPTURE_ORDER[a.type] ?? 9) - (CAPTURE_ORDER[b.type] ?? 9) || a.index - b.index);
      }
      return out;
    }

    function renderCaptured(el, actorLabel, data, advantage) {
      if (!el) return;
      el.textContent = "";
      const prefix = document.createElement("span");
      prefix.className = "capture-prefix";
      prefix.textContent = "captured";
      el.appendChild(prefix);

      if (data.pieces.length) {
        const glyphs = document.createElement("span");
        glyphs.className = "capture-glyphs";
        glyphs.textContent = data.pieces.map(p => (CAPTURE_GLYPHS[p.color] || {})[p.type] || "").join("");
        el.appendChild(glyphs);
      } else {
        const empty = document.createElement("span");
        empty.className = "capture-empty";
        empty.textContent = "—";
        el.appendChild(empty);
      }

      if (advantage > 0) {
        const adv = document.createElement("span");
        adv.className = "capture-advantage";
        adv.textContent = `+${advantage}`;
        el.appendChild(adv);
      }

      const names = data.pieces.map(p => `${p.color === "w" ? "white" : "black"} ${CAPTURE_NAMES[p.type] || p.type}`);
      el.setAttribute("aria-label", `${actorLabel} captured: ${names.length ? names.join(", ") : "none"}${advantage > 0 ? `; material advantage +${advantage}` : ""}`);
      el.title = `${actorLabel} captured: ${names.length ? names.join(", ") : "none"}${advantage > 0 ? ` · +${advantage}` : ""}`;
    }

    function updateCapturedPieces() {
      if (!topCaptured || !bottomCaptured) return;
      const state = capturedState();
      const diff = state.you.score - state.computer.score;
      const engineTop = board.getOrientation() === colorObj(human);
      if (engineTop) {
        renderCaptured(topCaptured, "Computer", state.computer, Math.max(0, -diff));
        renderCaptured(bottomCaptured, "You", state.you, Math.max(0, diff));
      } else {
        renderCaptured(topCaptured, "You", state.you, Math.max(0, diff));
        renderCaptured(bottomCaptured, "Computer", state.computer, Math.max(0, -diff));
      }
    }
'''


def patch_chess(text: str) -> str:
    if CSS_MARKER not in text:
        if "</style>" not in text:
            raise SystemExit("Chess style closing tag not found")
        text = text.replace("</style>", CSS + "  </style>", 1)

    if 'id="topCaptured"' not in text:
        if TOP_OLD not in text:
            raise SystemExit("Top playerbar anchor not found")
        text = text.replace(TOP_OLD, TOP_NEW, 1)
    if 'id="bottomCaptured"' not in text:
        if BOTTOM_OLD not in text:
            raise SystemExit("Bottom playerbar anchor not found")
        text = text.replace(BOTTOM_OLD, BOTTOM_NEW, 1)

    if 'const topCaptured = document.getElementById("topCaptured")' not in text:
        if DECL_ANCHOR not in text:
            raise SystemExit("Review declaration anchor not found")
        text = text.replace(DECL_ANCHOR, DECL_ADD, 1)

    if "function updateCapturedPieces()" not in text:
        anchor = "    function updateMoves() {\n"
        if anchor not in text:
            raise SystemExit("updateMoves anchor not found")
        text = text.replace(anchor, CAPTURE_FUNCS + "\n" + anchor, 1)

    if "bottomPlayer.classList.toggle(\"active\", engineTop ? turnIsHuman : !turnIsHuman);\n      updateCapturedPieces();" not in text:
        anchor = '      bottomPlayer.classList.toggle("active", engineTop ? turnIsHuman : !turnIsHuman);\n'
        if anchor not in text:
            raise SystemExit("updatePlayerBars anchor not found")
        text = text.replace(anchor, anchor + "      updateCapturedPieces();\n", 1)

    if 'paintMoveArrow(reviewPly > 0 ? hist[reviewPly - 1] : null, "review");\n        updateReviewControls();\n        updateCapturedPieces();' not in text:
        anchor = '        paintMoveArrow(reviewPly > 0 ? hist[reviewPly - 1] : null, "review");\n        updateReviewControls();\n'
        if anchor not in text:
            raise SystemExit("review render anchor not found")
        text = text.replace(anchor, anchor + "        updateCapturedPieces();\n", 1)

    required = [
        'id="topCaptured"', 'id="bottomCaptured"',
        "function capturedState()", "function updateCapturedPieces()",
        "CAPTURE_GLYPHS", CSS_MARKER,
    ]
    missing = [x for x in required if x not in text]
    if missing:
        raise SystemExit("Captured-pieces patch missing markers: " + ", ".join(missing))
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v62-chess-captured-pieces";',
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
