// Coordinate-preserving search over PDF.js text items. Uses the same bilingual
// normalization and term matching as global search; never paints filler text.
(function(root){
  'use strict';
  function stream(items,geometry){
    var text='',map=[];
    function append(value,source){
      for(var c=0;c<value.length;c++){
        var ch=value[c];if(ch===' '&&(!text||text[text.length-1]===' '))continue;
        text+=ch;map.push(source);
      }
    }
    for(var i=0;i<items.length;i++){
      var item=items[i]||{},raw=String(item.str||''),prev=items[i-1],join=false;
      if(geometry&&prev&&prev.transform&&item.transform&&!prev.hasEOL){
        var h=Math.max(1,Math.hypot(prev.transform[2],prev.transform[3]));
        var gap=item.transform[4]-prev.transform[4]-(Number(prev.width)||0);
        join=Math.abs(item.transform[5]-prev.transform[5])<h*.25&&gap>=-h*.2&&gap<h*.12;
      }
      if(i&&!join)append(' ',null);
      // Keep combining marks with their base before compatibility normalization.
      var units=raw.matchAll(/.\p{M}*/gu);
      for(var unit of units){
        var normalized=unit[0].normalize('NFKC').replace(/[०-९]/g,function(d){return String('०१२३४५६७८९'.indexOf(d))})
          .replace(/[\u200B-\u200D\u2060\uFEFF'’‘`´"]/g,'').toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g,' ');
        append(normalized,{item:i,start:unit.index,end:unit.index+unit[0].length});
      }
    }
    if(text.endsWith(' ')){text=text.slice(0,-1);map.pop()}
    return {text:text,map:map};
  }
  function ranges(items,query,mode){
    var parsed=efRelevanceQuery(query),views=[stream(items,true),stream(items,false)],found=[],kind='words';
    function occurrences(view,term,quality){
      var out=[],from=0,pos;
      while((pos=view.text.indexOf(term,from))>=0){
        var before=pos===0||view.text[pos-1]===' ',after=pos+term.length===view.text.length||view.text[pos+term.length]===' ';
        if(quality===undefined||quality===2||(before&&(quality===1||after)))out.push({view:view,start:pos,end:pos+term.length});
        from=pos+Math.max(1,term.length);
      }
      return out;
    }
    if(!parsed.phrase)return {ranges:{},kind:'none'};
    views.forEach(function(view){found=found.concat(occurrences(view,parsed.phrase,0))});
    if(found.length)kind='phrase';
    else parsed.alternatives.forEach(function(alternatives){
      var bestQuality=Infinity,best=[];
      views.forEach(function(view){alternatives.forEach(function(term,a){
        var match=efRelevanceTerm(view.text,term),hits=[],quality;
        if(match){quality=Math.max(match.quality,a?3:0);hits=occurrences(view,term,match.quality)}
        else if(mode==='compact'){
          var chars=[],positions=[];for(var p=0;p<view.text.length;p++)if(view.text[p]!==' '){chars.push(view.text[p]);positions.push(p)}
          var compact=chars.join(''),needle=term.replace(/ /g,''),from=0,at;
          while((at=compact.indexOf(needle,from))>=0){hits.push({view:view,start:positions[at],end:positions[at+needle.length-1]+1});from=at+needle.length}
          quality=4;
        }else if(mode==='typo'){
          var fuzzy=efFindSingleTermInPreparedText({normalized:view.text,compact:null,tokens:null},term,true,false);
          if(fuzzy){quality=5;hits=occurrences(view,fuzzy.word,0)}
        }
        if(hits.length&&quality<=bestQuality){if(quality<bestQuality)best=[];bestQuality=quality;best=best.concat(hits)}
      })});
      found=found.concat(best);
    });
    var rawRanges={},result={};
    found.forEach(function(hit){for(var p=hit.start;p<hit.end;p++){
      var source=hit.view.map[p];if(!source)continue;
      (rawRanges[source.item]||(rawRanges[source.item]=[])).push({start:source.start,end:source.end});
    }});
    Object.keys(rawRanges).forEach(function(key){
      var rows=rawRanges[key].sort(function(a,b){return a.start-b.start||a.end-b.end}),merged=[];
      rows.forEach(function(row){var last=merged[merged.length-1];if(last&&(row.start<=last.end||/^[\u200B-\u200D\u2060\uFEFF'’‘`´"]*$/.test(String(items[key].str||'').slice(last.end,row.start))))last.end=Math.max(last.end,row.end);else merged.push({start:row.start,end:row.end})});
      var length=Math.max(1,String(items[key].str||'').length);
      result[key]=merged.map(function(row){return {start:row.start/length,end:row.end/length}});
    });
    return {ranges:result,kind:Object.keys(result).length?kind:'none'};
  }
  root.EFP_PDF_TEXT_SEARCH={ranges:ranges};
})(typeof window==='undefined'?globalThis:window);
