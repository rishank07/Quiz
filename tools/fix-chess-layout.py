#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHESS = ROOT / "chess.html"

CSS_MARKER = "/* EFP chess first-view layout */"

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


def patch(text: str) -> str:
    if CSS_MARKER not in text:
        if "</style>" not in text:
            raise SystemExit("Chess style closing tag not found")
        text = text.replace("</style>", LAYOUT_CSS + "  </style>", 1)

    if 'class="setup-card"' not in text:
        anchor = '    <section class="game-shell">\n'
        if anchor not in text:
            raise SystemExit("Chess game-shell anchor not found")
        if OLD_CONTROLS not in text:
            raise SystemExit("Chess controls block not found")
        text = text.replace(anchor, SETUP_BLOCK + anchor, 1)
        text = text.replace(OLD_CONTROLS, "\n", 1)

    for ident in ("level", "side", "newGame", "undo", "hint", "flip"):
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
