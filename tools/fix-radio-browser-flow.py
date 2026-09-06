#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
MUSIC = ROOT / "music.html"
SW = ROOT / "service-worker.js"

MARKER = "function efpBrowserKeepPlayingAndBack()"

BROWSER_FLOW = r'''
function efpBrowserKeepPlayingAndBack(){
  if(efpInstalledAndroid){efpOpenStudyShell();return}
  if(audio.paused){say('Pehle koi gaana Play karo, phir Keep Playing & Go Back dabao.',true);return}
  if(!tracks.length||pos<0||!tracks[pos]){say('Current song abhi ready nahi hai.',true);return}

  var w=null;
  try{w=window.open('','efpRetroRadioPlayer','popup=yes,width=430,height=640,resizable=yes,scrollbars=yes')}catch(e){}
  if(!w){say('Radio player window block ho gaya. Browser me pop-ups allow karke dobara try karo.',true);return}

  try{
    w.document.open();
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Retro Radio | ExamFusion Prep</title><style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#070a13;color:#e8ecf6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}.box{max-width:390px;margin:auto}.brand{display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:18px}.brand img{width:42px;height:42px;border-radius:11px}.brand b{font-size:17px}.card{background:#111827;border:1px solid #1f2a44;border-radius:18px;padding:17px;box-shadow:0 18px 42px #0006}.ey{color:#f5b301;font-size:10px;font-weight:800;letter-spacing:.12em}.title{font-size:18px;font-weight:800;line-height:1.35;margin-top:6px}.meta{font-size:12px;color:#94a3c4;margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.controls{display:flex;justify-content:center;gap:11px;margin:22px 0 16px}.controls button{width:52px;height:52px;border-radius:50%;border:1px solid #29364f;background:#0d1322;color:#e8ecf6;font-size:20px;cursor:pointer}.controls .play{width:64px;height:64px;background:#f5b301;color:#111;border-color:#f5b301}.seek{display:grid;grid-template-columns:40px 1fr 40px;gap:7px;align-items:center;color:#94a3c4;font-size:11px}.seek input,.vol input{width:100%;accent-color:#f5b301}.vol{display:flex;align-items:center;gap:9px;margin-top:14px}.status{text-align:center;color:#94a3c4;font-size:11px;margin-top:13px;min-height:16px}.hint{font-size:11.5px;color:#94a3c4;line-height:1.55;text-align:center;margin:16px 4px 0}.links{display:flex;gap:8px;margin-top:15px}.links a{flex:1;text-align:center;text-decoration:none;color:#e8ecf6;border:1px solid #29364f;background:#0d1322;border-radius:10px;padding:10px 8px;font-size:11.5px}</style></head><body><div class="box"><div class="brand"><img src="/logo.png" alt=""><b>ExamFusion Prep</b></div><div class="card"><div class="ey">RETRO RADIO · KEEP PLAYING</div><div class="title" id="kaTitle">Loading…</div><div class="meta" id="kaMeta">ExamFusion Prep</div><div class="controls"><button id="kaPrev">⏮</button><button class="play" id="kaPlay">⏸</button><button id="kaNext">⏭</button></div><div class="seek"><span id="kaCur">0:00</span><input id="kaSeek" type="range" min="0" max="100" value="0" step="0.1"><span id="kaDur">0:00</span></div><div class="vol"><span>🔊</span><input id="kaVol" type="range" min="0" max="100" value="85"></div><div class="status" id="kaStatus">Starting…</div><div class="hint">Is Radio window/tab ko open rakho. ExamFusion ke dusre tab me quiz, Crux aur Current Affairs use kar sakte ho.</div><div class="links"><a href="/" target="_blank">Open ExamFusion</a><a href="/music.html">Full Radio</a></div></div></div><audio id="kaAudio" preload="metadata"></audio></body></html>');
    w.document.close();

    w.eval(`(function(){
      var state=null,a=document.getElementById('kaAudio'),ttl=document.getElementById('kaTitle'),meta=document.getElementById('kaMeta'),pp=document.getElementById('kaPlay'),pr=document.getElementById('kaPrev'),nx=document.getElementById('kaNext'),seek=document.getElementById('kaSeek'),cur=document.getElementById('kaCur'),dur=document.getElementById('kaDur'),vol=document.getElementById('kaVol'),stat=document.getElementById('kaStatus');
      function fmt(s){if(!isFinite(s)||s<0)return'0:00';s=Math.floor(s);var m=Math.floor(s/60),r=s%60;return m+':'+(r<10?'0':'')+r}
      function media(t){if(!('mediaSession'in navigator)||typeof MediaMetadata==='undefined'||!t)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:t.title||'Retro Radio',artist:t.album||'ExamFusion Prep',album:'ExamFusion Prep · Retro Radio',artwork:[{src:location.origin+'/pwa-icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:location.origin+'/pwa-icons/icon-512.png',sizes:'512x512',type:'image/png'}]})}catch(e){}}
      function render(){if(!state||!state.tracks||!state.tracks[state.pos])return;var t=state.tracks[state.pos];ttl.textContent=t.title||'Retro Radio';meta.textContent=t.album||'ExamFusion Prep';media(t)}
      function load(auto,at){if(!state||!state.tracks.length)return Promise.reject(new Error('no tracks'));var t=state.tracks[state.pos];render();a.src=t.url;a.volume=state.volume;vol.value=Math.round(state.volume*100);var wanted=Math.max(0,+at||0);a.addEventListener('loadedmetadata',function once(){a.removeEventListener('loadedmetadata',once);seek.max=a.duration||0;dur.textContent=fmt(a.duration);if(wanted>0&&isFinite(a.duration)){try{a.currentTime=Math.min(wanted,Math.max(0,a.duration-1))}catch(e){}}},{once:true});return auto?a.play():Promise.resolve()}
      function step(d){if(!state||!state.tracks.length)return;var i;if(state.shuffle){i=Math.floor(Math.random()*state.tracks.length);if(state.tracks.length>1&&i===state.pos)i=(i+1)%state.tracks.length}else{i=(state.pos+d+state.tracks.length)%state.tracks.length}state.pos=i;load(true,0).catch(function(){stat.textContent='Track failed — trying next…';setTimeout(function(){step(1)},500)})}
      window.EFP_START_RADIO=function(s){state=s;render();return load(true,s.currentTime||0)};
      pp.onclick=function(){if(a.paused)a.play();else a.pause()};pr.onclick=function(){if(a.currentTime>3){a.currentTime=0;return}step(-1)};nx.onclick=function(){step(1)};
      vol.oninput=function(){a.volume=(+vol.value||0)/100;if(state)state.volume=a.volume};seek.oninput=function(){cur.textContent=fmt(+seek.value)};seek.onchange=function(){if(isFinite(+seek.value))a.currentTime=+seek.value};
      a.addEventListener('playing',function(){pp.textContent='⏸';stat.textContent='Playing'});a.addEventListener('pause',function(){pp.textContent='▶'});a.addEventListener('waiting',function(){stat.textContent='Buffering…'});a.addEventListener('timeupdate',function(){seek.value=a.currentTime;cur.textContent=fmt(a.currentTime)});a.addEventListener('loadedmetadata',function(){seek.max=a.duration||0;dur.textContent=fmt(a.duration)});a.addEventListener('ended',function(){if(state&&state.repeat){a.currentTime=0;a.play();return}step(1)});a.addEventListener('error',function(){stat.textContent='Track failed — trying next…';setTimeout(function(){step(1)},500)});
      if('mediaSession'in navigator){try{navigator.mediaSession.setActionHandler('play',function(){a.play()});navigator.mediaSession.setActionHandler('pause',function(){a.pause()});navigator.mediaSession.setActionHandler('previoustrack',function(){step(-1)});navigator.mediaSession.setActionHandler('nexttrack',function(){step(1)})}catch(e){}}
    })();`);

    var payload={tracks:tracks.map(function(t){return{title:t.title,album:t.album,url:t.url}}),pos:pos,shuffle:shuffleOn,repeat:repeatOne,volume:audio.volume,currentTime:audio.currentTime||0};
    var started=w.EFP_START_RADIO(payload);
    Promise.resolve(started).then(function(){
      audio.pause();save();
      try{w.blur();window.focus()}catch(e){}
      try{if(typeof gtag==='function')gtag('event','radio_keep_playing',{mode:'browser_player_back'})}catch(e){}
      setTimeout(function(){if(window.history.length>1)window.history.back();else window.location.href='/'},80);
    }).catch(function(e){
      try{w.close()}catch(_){}
      say('Separate Radio player start nahi ho paya. Dobara try karo.',true);
    });
  }catch(e){
    try{w.close()}catch(_){}
    say('Radio player open nahi ho paya. Dobara try karo.',true);
  }
}

if(!efpInstalledAndroid){
  if(efpKeepStudy)efpKeepStudy.textContent='🎧 Keep Playing & Go Back';
  if(efpKeepStudyHint)efpKeepStudyHint.textContent='Radio separate player me chalta rahega; ye tab pichhle quiz/page par wapas jayega.';
}
if(efpKeepStudy)efpKeepStudy.onclick=function(){
  if(audio.paused){say('Pehle koi gaana Play karo, phir Keep Playing & Go Back dabao.',true);return}
  save();
  if(efpInstalledAndroid){efpOpenStudyShell();return}
  efpBrowserKeepPlayingAndBack();
};

document.addEventListener('click',function(e){
  if(efpInstalledAndroid||audio.paused||!e.target||!e.target.closest)return;
  var b=e.target.closest('#efp-app-back-button');
  if(!b)return;
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  efpBrowserKeepPlayingAndBack();
},true);
'''


def patch_music(text: str) -> str:
    text = text.replace('>🎧 Keep Playing &amp; Study</button>', '>🎧 Keep Playing &amp; Go Back</button>')
    text = text.replace('Music yahin chalta rahega; ExamFusion study ek new tab me khulega.', 'Radio separate player me chalta rahega; ye tab pichhle quiz/page par wapas jayega.')

    if MARKER not in text:
        pattern = re.compile(r"if\(efpKeepStudy\)efpKeepStudy\.onclick=function\(\)\{.*?\n\};\nif\(efpStudyClose\)", re.S)
        replacement = BROWSER_FLOW + "\nif(efpStudyClose)"
        text, count = pattern.subn(lambda _: replacement, text, count=1)
        if count != 1:
            raise SystemExit("Could not find existing Retro Radio browser flow")
    return text


def patch_sw(text: str) -> str:
    text, count = re.subn(
        r'const CACHE_VERSION = "efp-pwa-[^"]+";',
        'const CACHE_VERSION = "efp-pwa-2026-09-07-v41-radio-browser-back";',
        text,
        count=1,
    )
    if count != 1:
        raise SystemExit("CACHE_VERSION marker not found")
    return text


def main():
    music_old = MUSIC.read_text(encoding="utf-8")
    sw_old = SW.read_text(encoding="utf-8")
    music_new = patch_music(music_old)
    sw_new = patch_sw(sw_old)
    changed = []
    if music_new != music_old:
        MUSIC.write_text(music_new, encoding="utf-8", newline="\n")
        changed.append("music.html")
    if sw_new != sw_old:
        SW.write_text(sw_new, encoding="utf-8", newline="\n")
        changed.append("service-worker.js")
    print("Updated: " + (", ".join(changed) if changed else "nothing"))


if __name__ == "__main__":
    main()
