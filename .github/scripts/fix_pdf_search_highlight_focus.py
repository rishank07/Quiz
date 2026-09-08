from pathlib import Path

p=Path('Crux-Tricks/viewer-v2.js')
s=p.read_text(encoding='utf-8')

old="""    if(continuous){\n      page=next;ensureBatchAround(page);updateControls();updateUrl();markVisited();\n      var el=pageShell(page);\n      return renderContinuousPage(page,false).then(function(){if(el)pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:smooth===false?'auto':'smooth'});trimContinuous(page)});\n    }\n"""
new="""    if(continuous){\n      page=next;ensureBatchAround(page);updateControls();updateUrl();markVisited();\n      var el=pageShell(page);\n      var searchJumpPending=!!(searchQuery&&page===activeSearchPage&&searchFocusPending);\n      return renderContinuousPage(page,false).then(function(){if(el&&!searchJumpPending)pdfStage.scrollTo({top:Math.max(0,el.offsetTop-4),left:0,behavior:smooth===false?'auto':'smooth'});trimContinuous(page)});\n    }\n"""
if old not in s:
    raise SystemExit('continuous go anchor not found')
s=s.replace(old,new,1)

old="""      b.addEventListener('click',function(){\n        activeSearchPage=n;searchFocusPending=true;searchGeneration++;clearSearchHighlightLayers();\n        var moved=go(n,true);\n        if(continuous)Promise.resolve(moved).then(function(){return renderSearchHighlights(n)});\n      });\n"""
new="""      b.addEventListener('click',function(){\n        var samePage=n===page;\n        activeSearchPage=n;searchFocusPending=true;searchGeneration++;clearSearchHighlightLayers();\n        var moved=go(n,true);\n        if(continuous)Promise.resolve(moved).then(function(){return renderSearchHighlights(n)});\n        else if(samePage)renderSearchHighlights(n);\n      });\n"""
if old not in s:
    raise SystemExit('search hit anchor not found')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
