#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

OLD_PICKER = '''    <div class="playlist-picker">\n      <div class="playlist-picker-title">🎶 Choose a Playlist</div>\n      <div class="playlist-picker-help">Har option ek alag playlist hai. Apni pasand ki playlist select karein:</div>\n      <div class="chips" id="chips"></div>\n    </div>'''

NEW_PICKER = '''    <div class="playlist-picker">\n      <div class="playlist-picker-title">🎶 Playlist</div>\n      <div class="playlist-picker-help">Playlist badalne ke liye neeche tap karein:</div>\n      <details class="playlist-dropdown" id="playlistDropdown">\n        <summary aria-label="Choose playlist">\n          <span class="playlist-dropdown-copy">\n            <span class="playlist-dropdown-caption">SELECTED PLAYLIST</span>\n            <strong id="playlistDropdownLabel">Choose a Playlist</strong>\n          </span>\n          <span class="playlist-dropdown-arrow" aria-hidden="true">⌄</span>\n        </summary>\n        <div class="playlist-dropdown-menu">\n          <div class="chips" id="chips"></div>\n        </div>\n      </details>\n    </div>'''

DROPDOWN_CSS = r'''
/* Compact custom playlist dropdown */
.playlist-dropdown{margin-top:2px}
.playlist-dropdown>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:58px;padding:10px 13px;border:1px solid rgba(245,179,1,.42);border-radius:13px;background:linear-gradient(135deg,rgba(245,179,1,.12),rgba(62,166,255,.06));cursor:pointer;user-select:none}
.playlist-dropdown>summary::-webkit-details-marker{display:none}
.playlist-dropdown-copy{display:flex;flex-direction:column;min-width:0;text-align:left}
.playlist-dropdown-caption{font-size:8.5px;letter-spacing:.12em;color:var(--accent);font-weight:900;line-height:1.2}
.playlist-dropdown-copy strong{margin-top:4px;font-size:14px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
.playlist-dropdown-arrow{flex:0 0 auto;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.05);color:var(--accent);font-size:21px;font-weight:800;transition:transform .18s ease}
.playlist-dropdown[open] .playlist-dropdown-arrow{transform:rotate(180deg)}
.playlist-dropdown[open]>summary{border-bottom-left-radius:10px;border-bottom-right-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18)}
.playlist-dropdown-menu{margin-top:8px;padding:8px;border:1px solid var(--line);border-radius:12px;background:rgba(7,10,19,.96);box-shadow:0 16px 34px rgba(0,0,0,.28)}
.playlist-dropdown .chips{margin:0;grid-template-columns:repeat(2,minmax(0,1fr))}
@media(max-width:430px){.playlist-dropdown .chips{grid-template-columns:1fr}.playlist-dropdown>summary{min-height:55px;padding:9px 11px}.playlist-dropdown-copy strong{font-size:13.5px}}
'''

DROPDOWN_SYNC = r'''<script id="efp-playlist-dropdown-sync">
(function(){
  var box=document.getElementById('playlistDropdown');
  var label=document.getElementById('playlistDropdownLabel');
  var chips=document.getElementById('chips');
  if(!box||!label||!chips)return;
  function syncLabel(){
    var selected=chips.querySelector('.chip[aria-pressed="true"]');
    label.textContent=selected?(selected.textContent||'').trim():'Choose a Playlist';
  }
  chips.addEventListener('click',function(e){
    var b=e.target&&e.target.closest?e.target.closest('.chip'):null;
    if(!b)return;
    setTimeout(function(){syncLabel();box.open=false},0);
  });
  try{
    new MutationObserver(syncLabel).observe(chips,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed']});
  }catch(e){}
  syncLabel();
})();
</script>
'''


def patch_music(text: str) -> str:
    if 'id="playlistDropdown"' not in text:
        if OLD_PICKER not in text:
            raise SystemExit("Playlist picker marker not found in music.html")
        text = text.replace(OLD_PICKER, NEW_PICKER, 1)

    if '/* Compact custom playlist dropdown */' not in text:
        if '</style>' not in text:
            raise SystemExit("music.html style end marker not found")
        text = text.replace('</style>', DROPDOWN_CSS + '</style>', 1)

    # Remove any previous copy first. The page also contains a literal </body>
    # inside the separate-player HTML string, so always insert before the LAST
    # </body> tag, which is the real Retro Radio document body.
    text = text.replace(DROPDOWN_SYNC, '')
    idx = text.rfind('</body>')
    if idx == -1:
        raise SystemExit("music.html real body end marker not found")
    text = text[:idx] + DROPDOWN_SYNC + text[idx:]
    return text


def patch_sw(text: str) -> str:
    text, n = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v56-radio-playlist-dropdown-fix";',
        text,
        count=1,
    )
    if n != 1:
        raise SystemExit("service-worker cache version marker not found")
    return text


def write(path: Path, new: str) -> bool:
    old = path.read_text(encoding='utf-8')
    if old == new:
        return False
    path.write_text(new, encoding='utf-8', newline='\n')
    return True


def main():
    changed=[]
    if write(MUSIC, patch_music(MUSIC.read_text(encoding='utf-8'))): changed.append('music.html')
    if write(SW, patch_sw(SW.read_text(encoding='utf-8'))): changed.append('service-worker.js')
    print('Updated: ' + (', '.join(changed) if changed else 'nothing'))

if __name__ == '__main__':
    main()
