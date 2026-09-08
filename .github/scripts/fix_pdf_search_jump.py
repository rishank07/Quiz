from pathlib import Path

p=Path('Crux-Tricks/viewer.html')
s=p.read_text(encoding='utf-8')
old='<a class="tool-link search-jump" href="#docSearch" aria-label="Search this PDF" title="Search this PDF">🔍</a>'
new='<button id="desktopSearchJump" class="search-jump" type="button" aria-label="Search this PDF" title="Search this PDF">🔍</button>'
if old not in s:
    raise SystemExit('search jump anchor not found')
s=s.replace(old,new,1)
anchor='<script>(function(){var mobileReset=document.getElementById(\'mobileResetProgress\');if(mobileReset)mobileReset.addEventListener(\'click\',function(){var reset=document.getElementById(\'resetProgressBtn\');if(reset)reset.click()})})();</script>'
extra="""<script>(function(){var b=document.getElementById('desktopSearchJump'),s=document.getElementById('docSearch');if(location.hash==='#docSearch'){try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}setTimeout(function(){window.scrollTo(0,0)},0)}if(b&&s)b.addEventListener('click',function(e){e.preventDefault();try{s.focus({preventScroll:true})}catch(err){s.focus()} });})();</script>"""
if anchor not in s:
    raise SystemExit('inline script anchor not found')
s=s.replace(anchor,anchor+'\n'+extra,1)
p.write_text(s,encoding='utf-8')

p=Path('Crux-Tricks/viewer.css')
s=p.read_text(encoding='utf-8')
needle='.doc-search input{width:100%;'
if needle not in s:
    raise SystemExit('doc-search css anchor not found')
s=s.replace(needle,'.doc-search input{scroll-margin-top:132px;width:100%;',1)
p.write_text(s,encoding='utf-8')

p=Path('service-worker.js')
s=p.read_text(encoding='utf-8')
import re
s=re.sub(r'const CACHE_VERSION = "[^"]+";', 'const CACHE_VERSION = "efp-pwa-2026-09-09-v95-pdf-search-jump";', s, count=1)
p.write_text(s,encoding='utf-8')
