
(() => {
  'use strict';
  const D = window.MAPPING_DATA, $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
  const F = new Map(D.features.map(f => [f.id, f])), Q = new Map(D.questions.map(q => [q.id, q]));
  const SOURCE = new Map(D.sources.map(s => [s.id, s])), KEY = 'examfusion.mapping.v1';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const blank = () => ({version:1, bookmarks:[], answers:{}, theme:'light'});
  let saved;
  try { saved = validateSaved(JSON.parse(localStorage.getItem(KEY)) || blank()); } catch { saved = blank(); }
  const STATES = window.MAPPING_STATES || [], STATE_STUDY = window.MappingStateStudy;
  const topicColours={rivers:'#0879ae',minerals:'#9651b2',mountains:'#a56322',water:'#087e8b',parks:'#318144',ports:'#b14f7b',state:'#6764b5',seas:'#2776bb',worldphysical:'#8d6a21',worldresources:'#93539f',worldpolitical:'#506bb2'};
  let state = {region:'India', topic:'rivers', mode:'learn', selected:'ganga', search:'', continent:'', country:'', names:true, stateNames:true, savedOnly:false};
  let session = null, view = {x:66,y:-39,w:34,h:35}, drag = null, dragged = false, toastTimer, storageWarning = false;
  // The homepage theme preference is applied by site-theme.js.

  function validateSaved(input) {
    if (!input || input.version !== 1 || !Array.isArray(input.bookmarks) || !input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)) throw Error('This is not a mapping progress backup.');
    const clean = blank(); clean.theme = input.theme === 'dark' ? 'dark' : 'light';
    clean.bookmarks = [...new Set(input.bookmarks.filter(id => typeof id === 'string' && F.has(id)))];
    for (const [id,a] of Object.entries(input.answers)) {
      if (a && typeof a.correct === 'boolean' && (Q.has(id) || (id.startsWith('locate-') && F.has(id.slice(7))))) {
        clean.answers[id] = {correct:a.correct, at:Number.isFinite(a.at) ? a.at : 0, targetId:F.has(a.targetId) ? a.targetId : Q.get(id)?.featureIds[0] || id.slice(7)};
      }
    }
    return clean;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch { if (!storageWarning) { storageWarning = true; toast('Browser storage is full or unavailable. Download a progress backup.'); } } }
  function toast(message) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 3500); }
  function shuffle(arr) { const a = [...arr]; for (let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function topicName(id) { return D.topics.find(t => t.id===id)?.en || 'All topics'; }
  function countryCoords(geometry) { if (!geometry) return []; return geometry.type==='Polygon' ? geometry.coordinates.flat() : geometry.coordinates.flat(2); }
  function insideRing(lon, lat, ring) { let c=false; for(let i=0,j=ring.length-1;i<ring.length;j=i++) { const a=ring[i],b=ring[j]; if (((a[1]>lat)!==(b[1]>lat)) && lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]) c=!c; } return c; }
  function insideCountry(f, c) { const ps=c.geometry.type==='Polygon'?[c.geometry.coordinates]:c.geometry.coordinates; return ps.some(p=>insideRing(f.lon,f.lat,p[0]) && !p.slice(1).some(r=>insideRing(f.lon,f.lat,r))); }
  const biharIDs = new Set(['ganga','ghaghara','gandak','kosi','son','patna','bodhgaya','rajgir','nalanda','vaishali','vikramshila','kanwar','rohtasgarh','valmiki']);
  const upIDs = new Set(['ganga','yamuna','gomati','ghaghara','son','lucknow','prayagraj','varanasi','sarnath','dudhwa','agra']);
  function regionFeatures() {
    let a=D.features.filter(f=>state.region==='World'?f.region==='World':f.region==='India');
    if(STATE_STUDY?.profiles.has(state.region)) a=STATE_STUDY.featuresFor(state.region);
    if(state.region==='World' && state.continent) { const cs=D.countries.filter(c=>c.continent===state.continent); a=a.filter(f=>f.continents?.includes(state.continent)||f.area.includes(state.continent)||cs.some(c=>insideCountry(f,c))); }
    if(state.country) { const c=D.countries.find(c=>c.id===state.country); if(c){const alias={USA:'United States',TUR:'Türkiye',GBR:'United Kingdom',COD:'Democratic Republic of the Congo'}[c.id]||c.name;a=a.filter(f=>insideCountry(f,c)||f.area.toLocaleLowerCase().includes(alias.toLocaleLowerCase()));} }
    return a;
  }
  function filteredFeatures(includeSearch=true) {
    let a=regionFeatures();
    if(state.topic!=='all') a=a.filter(f=>f.topic===state.topic);
    if(state.savedOnly) a=a.filter(f=>saved.bookmarks.includes(f.id));
    if(includeSearch && state.search.trim()) { const s=state.search.trim().toLocaleLowerCase(); a=a.filter(f=>(f.name+' '+f.hi+' '+f.area+' '+f.areaHi+' '+f.fact+' '+f.factHi).toLocaleLowerCase().includes(s)); }
    return a;
  }
  function mistakeIDs() { return Object.keys(saved.answers).filter(id=>!saved.answers[id].correct); }
  function activeQ() { return session && !session.complete && session.items[session.index]; }
  function activeFeatureIDs() { const q=activeQ(); if(state.mode!=='learn' && q && session.answered!==null) return q.featureIds; return state.mode==='learn' && F.has(state.selected) ? [state.selected] : []; }
  function updateHash(push=false) {
    const p=new URLSearchParams({region:state.region, topic:state.topic, mode:state.mode});
    if(state.selected) p.set('place',state.selected);
    if(state.continent) p.set('continent',state.continent); if(state.country) p.set('country',state.country);
    const h='#'+p.toString(); if(location.hash!==h) history[push&&!expanded?'pushState':'replaceState'](history.state,'',h);
  }
  function readHash() {
    Object.assign(state,{region:'India',topic:'rivers',mode:'learn',selected:'',continent:'',country:'',savedOnly:false,search:''});
    const p=new URLSearchParams(location.hash.slice(1));
    const region=p.get('region')||new URLSearchParams(location.search).get('state');
    if(['India','World'].includes(region))state.region=region;
    else if(STATE_STUDY?.resolveRegion(region)){state.region=STATE_STUDY.resolveRegion(region);state.topic='all';state.selected=STATE_STUDY.profiles.get(state.region).capitalId;}
    if(D.topics.some(t=>t.id===p.get('topic')))state.topic=p.get('topic');
    if(['learn','locate','practice','pyq','mistakes'].includes(p.get('mode')))state.mode=p.get('mode');
    if(F.has(p.get('place')))state.selected=p.get('place');
    state.continent=['Asia','Africa','Europe','North America','South America','Oceania'].includes(p.get('continent'))?p.get('continent'):'';
    state.country=state.region==='World'&&D.countries.some(c=>c.id===p.get('country'))?p.get('country'):'';
    if(state.region!=='World')state.continent='';
  }
  function refresh(push=false) {
    const features=filteredFeatures();
    if(state.mode==='learn' && !features.some(f=>f.id===state.selected)) state.selected=features[0]?.id||'';
    renderTopics();renderControls();renderPlaceList();renderDetail();renderMap();renderStats();STATE_STUDY?.render(state);updateHash(push);
  }
  function renderStats() {
    $('placeCount').textContent=D.features.length; $('questionCount').textContent=D.questions.length;
    $('masteredCount').textContent=new Set(Object.values(saved.answers).filter(a=>a.correct).map(a=>a.targetId)).size;
    $('mistakeCount').textContent=mistakeIDs().length; $('savedCount').textContent=saved.bookmarks.length;
  }
  function renderControls() {
    document.body.dataset.mode=state.mode;
    document.body.dataset.region=state.region;
    document.querySelectorAll('[data-region]').forEach(b=>b.classList.toggle('active',b.dataset.region===state.region));
    document.querySelectorAll('#modeTabs [data-mode]').forEach(b=>{const on=b.dataset.mode===state.mode;b.classList.toggle('active',on);b.setAttribute('aria-selected',on);});
    $('worldSelects').hidden=state.region!=='World'; $('sessionControls').hidden=state.mode==='learn';
    $('continentSelect').value=state.continent;
    const countries=D.countries.filter(c=>!state.continent||c.continent===state.continent).sort((a,b)=>a.name.localeCompare(b.name));
    $('countrySelect').innerHTML='<option value="">All countries<\/option>'+countries.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}<\/option>`).join('');
    $('countrySelect').value=state.country;
    const c=D.countries.find(c=>c.id===state.country);
    $('mapTitle').textContent=state.savedOnly?'Saved places':topicName(state.topic);
    $('mapSubtitle').textContent=`${c?.name||state.continent||(STATE_STUDY?.profiles.get(state.region)?.name||state.region)} · ${filteredFeatures().length} study places`;
    const unrevealed=state.mode!=='learn'&&activeQ()&&session.answered===null;
    $('namesToggle').checked=state.names&&!unrevealed; $('namesToggle').disabled=!!unrevealed;
    $('stateNamesToggle').checked=state.stateNames&&!unrevealed&&state.region!=='World';
    $('stateNamesToggle').disabled=!!unrevealed||state.region==='World';
    $('focusPlace').disabled=unrevealed||!F.has(state.selected)||state.mode!=='learn';
    $('islandShortcuts').hidden=state.region!=='India'||state.mode!=='learn';
    $('featureLegend').innerHTML=D.topics.filter(t=>t.id!=='all'&&(state.topic==='all'||t.id===state.topic)&&regionFeatures().some(f=>f.topic===t.id)).map(t=>`<span><i style="background:${topicColours[t.id]}"></i>${esc(t.en)}</span>`).join('')+'<span><i class="selected-key"></i>Selected place</span><span><i class="solid-key"></i>River course</span><span><i class="dashed-key"></i>Approximate course</span>';
    document.querySelectorAll('#regionTabs [data-region],#topicList [data-topic]').forEach(b=>b.setAttribute('aria-pressed',b.classList.contains('active')));
    $('placeSearch').disabled=state.mode!=='learn'; $('randomBtn').disabled=state.mode!=='learn';
    $('placeSearch').placeholder=state.mode==='learn'?'Search a place · नदी, खदान, झील…':'Place search returns in Learn mode';
    $('clearSearch').hidden=!state.search;
    $('mapHint').textContent=state.mode==='locate'&&activeQ()&&session.answered===null?'Tap a numbered marker to choose your answer.':unrevealed?'Answer first. The relevant places appear after checking.':'Tap a marker to explore. Drag the map or use + / −.';
    const lq=activeQ();$('mobilePrompt').hidden=state.mode!=='locate'||!lq||session.complete;
    $('mobilePrompt').innerHTML=lq?`<b>${esc(lq.en)}<\/b><span>${esc(lq.hi)}<\/span>`:'';
  }
  function renderTopics() {
    const regional=regionFeatures();
    const topics=D.topics.filter(t=>t.id==='all'||regional.some(f=>f.topic===t.id));
    $('topicCount').textContent=topics.length-1;
    $('topicList').innerHTML=topics.map(t=>`<button class="topic-button ${state.topic===t.id?'active':''}" data-topic="${t.id}"><span class="topic-icon" aria-hidden="true">${t.icon}<\/span><span><b>${esc(t.en)}<\/b><small>${esc(t.hi)}<\/small><\/span><span class="topic-num">${t.id==='all'?regional.length:regional.filter(f=>f.topic===t.id).length}<\/span><\/button>`).join('');
  }
  function renderPlaceList() {
    if(state.mode!=='learn') { $('placeList').innerHTML='<span class="empty-inline">Question explanations connect back to the map. Explore all places in Learn mode.<\/span>';return; }
    const a=filteredFeatures();
    $('placeList').innerHTML=a.length?a.map(f=>`<button class="place-chip ${state.selected===f.id?'active':''}" data-place="${f.id}"><span class="pin"><\/span>${esc(f.name)}${saved.bookmarks.includes(f.id)?' ★':''}<\/button>`).join(''):'<span class="empty-inline">No places in this selection. Clear the search or choose All topics.<\/span>';
  }
  function sourceButton(source) {
    if(!source)return '<span>Editorial study note.<\/span>';
    const s=SOURCE.get(source.id);if(s?.url)return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.filename)} ↗</a>`;return s?`<span>${esc(s.filename.replace(/_/g,' '))} · source page ${Number(source.page)||1}<\/span>`:'';
  }
  function emptyDetail(title,text,action='All topics') {
    return `<div class="empty-state"><div class="empty-symbol">◎<\/div><h3>${esc(title)}<\/h3><p>${esc(text)}<\/p><button class="primary" data-action="expand">${esc(action)}<\/button><\/div>`;
  }
  function renderDetail() {
    const el=$('detailPanel');
    if(state.mode!=='learn'){renderQuestion();return;}
    const f=F.get(state.selected);
    if(!f) {
      const c=D.countries.find(c=>c.id===state.country);
      el.innerHTML=c?`<div class="detail-eyebrow">COUNTRY EXPLORER<\/div><h2 class="detail-title">${esc(c.name)}<\/h2><div class="place-meta"><span class="pill">${esc(c.continent)}<\/span><\/div><p class="muted">This country is on the base map. No curated study places match the current filters.<\/p><button class="primary" data-action="expand">Show all topics<\/button>`:emptyDetail('Explore a little wider','No study places match this selection. Try another topic, clear the search or leave the saved-only view.'); return;
    }
    const pyqs=D.questions.filter(q=>q.type==='pyq'&&q.featureIds.includes(f.id));
    el.innerHTML=`<div class="detail-eyebrow"><span>PLACE IN FOCUS<\/span><button class="bookmark" data-bookmark="${f.id}" aria-label="${saved.bookmarks.includes(f.id)?'Remove bookmark':'Bookmark place'}" aria-pressed="${saved.bookmarks.includes(f.id)}">${saved.bookmarks.includes(f.id)?'★':'☆'}<\/button><\/div><h2 class="detail-title">${esc(f.name)}<\/h2><p class="detail-hindi">${esc(f.hi)}<\/p><div class="place-meta"><span class="pill">${esc(f.area)}<\/span><span class="pill gold">${esc(topicName(f.topic))}<\/span><\/div><div class="mini-label">EXAM CONNECTION<\/div><div class="fact-block"><p>${esc(f.fact)}<\/p><p class="hindi">${esc(f.factHi)}<\/p><\/div><div class="connection-card"><div class="mini-label">MAKE IT STICK<\/div><p>First read the name. Hide the labels. Then find it on the map again.<\/p><p class="muted">पहले नाम देखो, फिर बिना नाम के स्थान पहचानो।<\/p><\/div><div class="detail-actions"><button class="primary" data-action="locate-place">Find this place →<\/button><button class="secondary" data-action="practice-place">Practise related questions<\/button>${pyqs.length?`<button class="quiet" data-action="pyq-place">${pyqs.length} related PYQ${pyqs.length>1?'s':''} ↗<\/button>`:''}<a class="quiet" href="https://earth.google.com/web/search/${encodeURIComponent(f.lat+','+f.lon)}" target="_blank" rel="noopener">Open terrain in Google Earth ↗<\/a><\/div><div class="coordinates">${Math.abs(f.lat).toFixed(2)}° ${f.lat<0?'S':'N'} · ${Math.abs(f.lon).toFixed(2)}° ${f.lon<0?'W':'E'}<br>Approximate study marker<\/div><div class="detail-source">SOURCE REFERENCE${sourceButton(f.source)}<\/div>`;
  }
  function makeLocate(f) {
    let pool=filteredFeatures(false).filter(x=>x.id!==f.id && Math.hypot(x.lat-f.lat,x.lon-f.lon)>.7);
    if(pool.length<3) pool=D.features.filter(x=>x.region===f.region&&x.id!==f.id&&Math.hypot(x.lat-f.lat,x.lon-f.lon)>1);
    pool.sort((a,b)=>(a.topic===f.topic?-1:0)-(b.topic===f.topic?-1:0));
    const preferred=pool.filter(x=>x.topic===f.topic);
    const alternatives=shuffle(preferred.length>=3?preferred:pool).slice(0,3);
    const candidates=shuffle([f,...alternatives]);
    return {id:'locate-'+f.id,type:'locate',topic:f.topic,region:f.region,featureIds:[f.id],en:`Find ${f.name} on the map.`,hi:`मानचित्र पर ${f.hi} पहचानें।`,options:candidates.map((_,i)=>({en:`Marker ${i+1}`,hi:`चिह्न ${i+1}`})),answer:candidates.findIndex(x=>x.id===f.id),candidates:candidates.map(x=>x.id),explanation:f.fact,explanationHi:f.factHi,source:f.source,verification:'Original location practice. Markers are approximate.'};
  }
  function beginSession(mode,target=null,keepOrder=false,push=true) {
    state.mode=mode;state.search='';$('placeSearch').value='';
    const fs=filteredFeatures(false),ids=new Set(fs.map(f=>f.id));let items=[];
    if(mode==='locate')items=fs.filter(f=>!target||f.id===target).map(makeLocate);
    else if(mode==='practice'||mode==='pyq')items=D.questions.filter(q=>(mode==='pyq'?q.type==='pyq':q.type!=='pyq')&&(state.topic==='all'||q.topic===state.topic)&&q.featureIds.some(id=>ids.has(id))&&(!target||q.featureIds.includes(target)));
    else if(mode==='mistakes')items=mistakeIDs().map(id=>Q.get(id)||(F.has(id.slice(7))?makeLocate(F.get(id.slice(7))):null)).filter(q=>q&&q.featureIds.some(id=>ids.has(id)));
    if(!keepOrder)items=shuffle(items);
    const available=items.length;const limit=Number($('sessionSize').value)||available;session={available,items:items.slice(0,limit),index:0,answered:null,responses:Array(Math.min(items.length,limit||items.length)).fill(null),correct:0,wrong:0,skipped:0,complete:false,target};
    setDefaultView();refresh(push);
    if(mode==='locate')fitQuestion();
    if(innerWidth<=650)(mode==='locate'?$('mobilePrompt'):$('detailPanel')).scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderQuestion() {
    const el=$('detailPanel');
    if(!session||!session.items.length) {
      const title=state.mode==='mistakes'?'No mistakes to revise here':state.mode==='pyq'?'No linked PYQs in this topic':'No questions in this selection';
      el.innerHTML=emptyDetail(title,state.mode==='mistakes'?'Mistakes from your attempts appear here. Broaden the topic to see other saved mistakes.':'Choose All topics for a broader session. This review includes selected UPSC PYQs; other exam banks have not been added.');return;
    }
    if(session.complete) {
      el.innerHTML=`<div class="detail-eyebrow">SESSION COMPLETE<\/div><div class="empty-state"><div class="empty-symbol">✦<\/div><h3>${session.correct} correct · ${session.wrong} to revise<\/h3><p>${session.items.length} questions in this session. ${session.skipped} skipped. Your progress has been saved on this device.<\/p><div class="detail-actions"><button class="quiet" data-action="previous">← Review last question<\/button><button class="primary" data-action="restart">Start another session<\/button><button class="secondary" data-action="mistakes">Revise mistakes<\/button><button class="quiet" data-action="learn">Back to the map<\/button><\/div><\/div>`;return;
    }
    const q=activeQ(),answered=session.answered!==null,good=session.answered===q.answer;
    el.innerHTML=`<div class="question-topline"><span>${state.mode==='mistakes'?'MISTAKE REVISION':q.type==='locate'?'LOCATE THE PLACE':q.type==='pyq'?'SOURCE-CITED PREVIOUS YEAR QUESTION':q.type==='source'?'SOURCE PRACTICE':'ORIGINAL PRACTICE'}<\/span><span>${session.index+1} / ${session.items.length} · ${session.available} available<\/span><\/div><div class="session-progress"><span style="width:${session.index/session.items.length*100}%"><\/span><\/div><div class="q-kind">${q.type==='pyq'?`${esc(q.exam||'Source-cited PYQ')} · ${q.year||'year not specified'}`:q.type==='source'?'SOURCE PRACTICE':esc(topicName(q.topic))}<\/div><p class="q-en">${esc(q.en)}<\/p><p class="q-hi">${esc(q.hi)}<\/p><div class="option-list">${q.options.map((o,i)=>`<button class="option ${answered&&i===q.answer?'correct':''} ${answered&&i===session.answered&&!good?'wrong':''}" data-answer="${i}" ${answered?'disabled':''}><span class="option-letter">${'ABCD'[i]}<\/span><span><b>${esc(o.en)}<\/b><small>${esc(o.hi)}<\/small>${answered&&i===q.answer?'<small class="correct-label">(सही उत्तर ✔)<\/small>':''}<\/span><\/button>`).join('')}<\/div>${answered?`<div class="answer-box ${good?'':'is-wrong'}"><strong>${good?'Correct ✓':'Revise this connection'}<\/strong><p>• ${esc(q.explanation)}<\/p><p class="hindi">• ${esc(q.explanationHi)}<\/p><\/div><div class="verification">${esc(q.verification)}${q.officialPage?` <a href="${q.officialUrl}#page=${q.officialPage}" target="_blank" rel="noopener">Official paper · page ${q.officialPage} ↗<\/a>`:''}<\/div><div class="detail-source">${sourceButton(q.source)}<\/div>`:''}<div class="session-actions"><button class="quiet previous-question" data-action="previous" ${session.index===0?'disabled':''}>← Previous<\/button>${answered?'<button class="quiet" data-action="show-map">Map पर समझो<\/button><button class="primary" data-action="next">Next →<\/button>':'<button class="quiet" data-action="skip">Skip<\/button><button class="quiet" data-action="learn">Explore map<\/button>'}<\/div><div class="session-score"><span>✓ ${session.correct} correct<\/span><span>↺ ${session.wrong} to revise<\/span><span>${session.skipped} skipped<\/span><\/div>`;
  }
  function syncSessionScore() {
    if(!session)return;
    session.correct=0;session.wrong=0;session.skipped=0;
    session.responses.forEach((record,i)=>{
      if(!record)return;
      if(record.skipped){session.skipped++;return;}
      if(record.answer===session.items[i].answer)session.correct++;
      else session.wrong++;
    });
  }
  function openQuestion(index) {
    if(!session||!session.items.length||index<0||index>=session.items.length)return;
    session.index=index;session.complete=false;
    const record=session.responses[index];
    session.answered=record&&!record.skipped?record.answer:null;
    renderDetail();renderControls();renderMap();
    if(state.mode==='locate')fitQuestion();
  }
  function answer(i) {
    const q=activeQ();if(!q||session.complete||session.answered!==null||i<0||i>=q.options.length)return;
    session.answered=i;
    session.responses[session.index]={answer:i};
    syncSessionScore();
    saved.answers[q.id]={correct:i===q.answer,at:Date.now(),targetId:q.featureIds[0]};persist();
    renderDetail();renderControls();renderMap();renderStats();
    if(innerWidth<=650&&q.type==='locate')$('detailPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function next(skip=false) {
    if(!activeQ()||session.complete)return;
    if(skip&&session.answered===null)session.responses[session.index]={skipped:true};
    syncSessionScore();
    if(session.index+1>=session.items.length){session.complete=true;renderDetail();renderControls();renderMap();return;}
    openQuestion(session.index+1);
  }
  function previous() {
    if(!session||!session.items.length)return;
    if(session.complete)openQuestion(session.items.length-1);
    else if(session.index>0)openQuestion(session.index-1);
  }
  function resetSession() {
    if(!session)return;
    if(session.responses.some(Boolean)&&!confirm('Restart this quiz session? Current session answers will be cleared; saved mapping progress and bookmarks will stay.'))return;
    session.responses=Array(session.items.length).fill(null);
    session.correct=0;session.wrong=0;session.skipped=0;
    openQuestion(0);
    toast('Session restarted. Saved progress was kept.');
  }
  function resetProgress() {
    if(!confirm('Reset all saved mapping answers, mistakes and bookmarks on this device? This cannot be undone unless you have a backup.'))return;
    const theme=saved.theme;saved=blank();saved.theme=theme;persist();
    session=null;state.mode='learn';state.savedOnly=false;
    refresh();
    if($('settingsDialog').open)$('settingsDialog').close();
    toast('Mapping progress reset.');
  }
  function makeSvg(tag,attrs={}){const e=document.createElementNS(NS,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;}
  function ringPath(r){return r.map((p,i)=>(i?'L':'M')+p[0].toFixed(4)+','+(-p[1]).toFixed(4)).join('')+'Z';}
  function geometryPath(g){if(g.type==='Polygon')return g.coordinates.map(ringPath).join('');if(g.type==='MultiPolygon')return g.coordinates.flatMap(p=>p.map(ringPath)).join('');const lines=g.type==='LineString'?[g.coordinates]:g.coordinates;return lines.map(l=>l.map((p,i)=>(i?'L':'M')+p[0].toFixed(4)+','+(-p[1]).toFixed(4)).join('')).join('');}
  function setView(v){view=v;$('map').setAttribute('viewBox',`${v.x} ${v.y} ${v.w} ${v.h}`);renderMap();}
  function boundsView(coords,padding=.1){if(!coords.length)return;let xs=coords.map(p=>p[0]),ys=coords.map(p=>-p[1]);let x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;w=Math.max(w,3);h=Math.max(h,3);setView({x:x-w*padding,y:y-h*padding,w:w*(1+2*padding),h:h*(1+2*padding)});}
  function setDefaultView(){
    const profile=STATE_STUDY?.profiles.get(state.region),st=profile&&STATES.find(s=>s.name===profile.name);
    if(st){const points=countryCoords(st.geometry),xs=points.map(p=>p[0]),ys=points.map(p=>-p[1]);const w=Math.max(1.8,Math.max(...xs)-Math.min(...xs)),h=Math.max(1.8,Math.max(...ys)-Math.min(...ys));const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;view={x:cx-w*.62,y:cy-h*.62,w:w*1.24,h:h*1.24};}
    else if(state.region==='World'){view={x:-180,y:-82,w:360,h:145};
      const cs=state.country?D.countries.filter(c=>c.id===state.country):state.continent?D.countries.filter(c=>c.continent===state.continent):[];
      if(cs.length){let points=cs.flatMap(c=>countryCoords(c.geometry));if(state.continent==='Asia')points=points.filter(p=>p[0]>20);if(state.continent==='Oceania')points=points.filter(p=>p[0]>100);if(points.length){const xs=points.map(p=>p[0]),ys=points.map(p=>-p[1]);const w=Math.max(5,Math.max(...xs)-Math.min(...xs)),h=Math.max(5,Math.max(...ys)-Math.min(...ys));view={x:Math.min(...xs)-w*.08,y:Math.min(...ys)-h*.08,w:w*1.16,h:h*1.16};}}
    }else view={x:67,y:-38,w:32,h:33};
  }
  function fitQuestion(){const q=activeQ();if(q?.type==='locate')boundsView(q.candidates.map(id=>[F.get(id).lon,F.get(id).lat]),.3);}
  let baseMapKey='';
  function mapMetrics(){
    const r=$('map').getBoundingClientRect(),unit=Math.max(view.w/(r.width||900),view.h/(r.height||650));
    return {unit,width:r.width||900,height:r.height||650,left:view.x+view.w/2-(r.width||900)*unit/2,top:view.y+view.h/2-(r.height||650)*unit/2};
  }
  function renderMap(){
    const svg=$('map');svg.setAttribute('viewBox',`${view.x} ${view.y} ${view.w} ${view.h}`);
    const selected=new Set(activeFeatureIDs()),a=filteredFeatures(),q=activeQ();
    const unrevealed=!!(state.mode!=='learn'&&q&&session.answered===null),indiaOnly=state.region!=='World';
    const {unit,width,height,left,top}=mapMetrics();
    const baseKey=state.region+'|'+state.country+'|'+state.mode+'|'+unrevealed;
    if(baseMapKey!==baseKey){
      baseMapKey=baseKey;
      const defs=$('mapDefs');defs.replaceChildren();
      const clip=makeSvg('clipPath',{id:'indiaClip',clipPathUnits:'userSpaceOnUse'});
      clip.append(makeSvg('path',{d:D.indiaRings.map(ringPath).join(''),'clip-rule':'evenodd'}));defs.append(clip);
      const countries=$('countryLayer');countries.replaceChildren();
      if(!indiaOnly)for(const c of D.countries){
        if(c.id==='IND')continue;
        const p=makeSvg('path',{d:geometryPath(c.geometry),class:'country'+(c.id===state.country?' focused':''),'data-country':c.id});
        if(!unrevealed){const t=makeSvg('title');t.textContent=c.name;p.append(t);}countries.append(p);
      }
      countries.append(makeSvg('path',{d:D.indiaRings.map(ringPath).join(''),class:'country india','data-country':'IND','fill-rule':'evenodd'}));
      const states=$('stateLayer');states.replaceChildren();
      states.setAttribute('clip-path','url(#indiaClip)');
      if(indiaOnly)for(const st of STATES){
        const regional=STATE_STUDY?.profiles.has(state.region);
        const focus=st.name===STATE_STUDY?.profiles.get(state.region)?.name;
        const p=makeSvg('path',{d:geometryPath(st.geometry),class:`state-boundary state-colour-${st.color}${regional&&!focus?' muted-state':''}${focus?' focused-state':''}`});
        const profile=[...(STATE_STUDY?.profiles.values()||[])].find(profile=>profile.name===st.name);
        if(profile&&!unrevealed&&state.mode==='learn'){p.dataset.stateRegion=profile.id;p.setAttribute('role','button');p.setAttribute('tabindex','0');p.setAttribute('aria-label','Open '+st.name+' geography notes');}
        if(!unrevealed){const t=makeSvg('title');t.textContent=st.name;p.append(t);}states.append(p);
      }
      // Redraw the official national outline above the state fills.
      if(indiaOnly)states.append(makeSvg('path',{d:D.indiaRings.map(ringPath).join(''),class:'national-outline','fill-rule':'evenodd'}));
    }
    const grid=$('gridLayer');grid.replaceChildren();
    if(!indiaOnly){
      for(let lon=-180;lon<=180;lon+=30)grid.append(makeSvg('path',{d:`M${lon},-85V80`,class:'gridline'}));
      for(let lat=-60;lat<=60;lat+=30)grid.append(makeSvg('path',{d:`M-180,${-lat}H180`,class:'gridline'}));
    }
    const riverLayer=$('riverLayer');riverLayer.replaceChildren();
    if(indiaOnly)riverLayer.setAttribute('clip-path','url(#indiaClip)');else riverLayer.removeAttribute('clip-path');
    const featureIDs=new Set(a.map(f=>f.id)),drawn=new Set();
    if(!unrevealed)for(const r of D.rivers){
      if(!featureIDs.has(r.id)&&!selected.has(r.id))continue;
      const d=geometryPath(r.geometry),key=r.id+'|'+d;if(drawn.has(key))continue;drawn.add(key);
      const hit=makeSvg('path',{d,class:'river-hit','data-marker':r.id});
      const p=makeSvg('path',{d,class:'river'+(r.schematic?' schematic':'')+(selected.has(r.id)?' highlight':''),'data-marker':r.id});
      riverLayer.append(hit,p);
    }
    const markerLayer=$('markerLayer');markerLayer.replaceChildren();
    const stateLabels=$('stateLabelLayer');stateLabels.replaceChildren();
    const isLocate=!!(q?.type==='locate'&&state.mode!=='learn'&&!session.complete);
    let visible=isLocate?q.candidates.map(id=>F.get(id)):unrevealed?[]:[...new Map([...a,...[...selected].map(id=>F.get(id)).filter(Boolean)].map(f=>[f.id,f])).values()];
    visible=visible.filter(Boolean).filter(f=>f.lon>=left-unit*20&&f.lon<=left+(width+20)*unit&&-f.lat>=top-unit*20&&-f.lat<=top+(height+20)*unit);
    // Place the selected label first and reserve its box before other labels.
    visible.sort((a,b)=>Number(selected.has(b.id))-Number(selected.has(a.id))||a.lat-b.lat);
    const boxes=[],markers=[],labels=[];
    const overlaps=(a,b)=>a.x<b.x+b.w+4&&a.x+a.w+4>b.x&&a.y<b.y+b.h+3&&a.y+a.h+3>b.y;
    const points=visible.map(f=>({x:(f.lon-left)/unit,y:(-f.lat-top)/unit}));
    function labelPosition(x,y,w,h,priority=false){
      for(const distance of [12,24,42,64,90,120])for(const [dx,dy] of [[distance,0],[-distance-w,0],[0,-distance],[-w/2,distance],[-w/2,-distance],[distance,distance],[-distance-w,-distance],[distance,-distance],[-distance-w,distance]]){
        const b={x:x+dx,y:y+dy-h/2,w,h};
        if(b.x<7||b.x+w>width-10||b.y<12||b.y+h>height-44)continue;
        if(boxes.some(other=>overlaps(b,other)))continue;
        if(points.some(p=>p.x>b.x-5&&p.x<b.x+w+5&&p.y>b.y-5&&p.y<b.y+h+5))continue;
        boxes.push(b);return b;
      }
      if(priority){const b={x:Math.max(8,Math.min(width-w-10,x+12)),y:Math.max(14,Math.min(height-h-45,y-10)),w,h};boxes.push(b);return b;}
      return null;
    }
    let shown=0;
    for(const f of visible){
      const index=q?.candidates?.indexOf(f.id),isSelected=selected.has(f.id);
      let cls='marker'+(isSelected?' selected':'');
      if(isLocate&&session.answered!==null){if(index===q.answer)cls+=' answer-correct';else if(index===session.answered)cls+=' answer-wrong';}
      const g=makeSvg('g',{transform:`translate(${f.lon},${-f.lat})`,class:cls,'data-marker':f.id,role:'button',tabindex:0,'aria-label':unrevealed?`Choose marker ${index+1}`:`${f.name}, ${f.hi}`,style:`--feature-colour:${topicColours[f.topic]||'#6e64ae'}`});
      g.append(makeSvg('circle',{r:(isLocate?15:10)*unit,class:'touch-target'}));
      g.append(makeSvg('circle',{r:(isLocate?12:isSelected?7:5)*unit,class:'halo'}));
      if(isLocate){const n=makeSvg('text',{class:'number',y:4*unit,'font-size':12*unit,'text-anchor':'middle'});n.textContent=String(index+1);g.append(n);}
      else g.append(makeSvg('circle',{r:2.5*unit,class:'dot'}));
      markers.push(g);
      if(!unrevealed&&!isLocate&&state.names){
        const p={x:(f.lon-left)/unit,y:(-f.lat-top)/unit},font=width<480?11.5:12.5;
        const lw=Math.max(30,f.name.length*font*.58)+10,lh=20;
        const b=labelPosition(p.x,p.y,lw,lh,isSelected);if(!b)continue;shown++;
        const label=makeSvg('g',{class:'feature-label'+(isSelected?' selected':''),'data-marker':f.id,style:`--feature-colour:${topicColours[f.topic]||'#6e64ae'}`});
        const anchorX=b.x>p.x?b.x:b.x+b.w,anchorY=Math.max(b.y+3,Math.min(b.y+b.h-3,p.y));
        label.append(makeSvg('path',{d:`M${f.lon},${-f.lat}L${left+anchorX*unit},${top+anchorY*unit}`,class:'label-leader'}));
        label.append(makeSvg('rect',{x:left+b.x*unit,y:top+b.y*unit,width:b.w*unit,height:b.h*unit,rx:3*unit}));
        const t=makeSvg('text',{x:left+(b.x+5)*unit,y:top+(b.y+14)*unit,'font-size':font*unit});t.textContent=f.name;label.append(t);labels.push(label);
      }
    }
    for(const g of markers)markerLayer.append(g);for(const g of labels)markerLayer.append(g);
    if(indiaOnly&&state.stateNames&&!unrevealed){
      for(const st of STATES){
        const x=(st.label[0]-left)/unit,y=(-st.label[1]-top)/unit;
        if(x<20||x>width-20||y<25||y>height-55)continue;
        const regional=STATE_STUDY?.profiles.has(state.region);if(regional&&st.name!==STATE_STUDY.profiles.get(state.region).name)continue;
        const stateFont=width<650?13:15,w=st.name.length*stateFont*.61;
        let labelBox=null,labelX=x,labelY=y;
        for(const [dx,dy] of [[0,0],[0,-stateFont*1.5],[0,stateFont*1.5],[-stateFont*2,0],[stateFont*2,0],[0,-stateFont*3],[0,stateFont*3]]){
          const cx=x+dx,cy=y+dy,b={x:cx-w/2,y:cy-stateFont*.8,w,h:stateFont+4};
          if(b.x<7||b.x+b.w>width-10||b.y<12||b.y+b.h>height-44||boxes.some(box=>overlaps(b,box)))continue;
          if((dx||dy)&&!insideCountry({lon:left+cx*unit,lat:-(top+cy*unit)},st))continue;
          labelBox=b;labelX=cx;labelY=cy;break;
        }
        if(!labelBox)continue;
        const t=makeSvg('text',{x:left+labelX*unit,y:top+labelY*unit,'font-size':stateFont*unit,'text-anchor':'middle',class:'state-name'});t.textContent=st.name;stateLabels.append(t);boxes.push(labelBox);
      }
    }
    $('labelStatus').textContent=unrevealed?'Answer labels hidden':state.names&&!isLocate?`${shown} / ${visible.length} visible feature names${shown<visible.length?' · Zoom in for more':''}`:'Feature names hidden';
    $('mapTooltip').hidden=true;
  }

  function selectFeature(id,push=true){if(!F.has(id))return;state.selected=id;state.mode='learn';session=null;refresh(push);}
  function focusSelected(){const f=F.get(state.selected);if(!f)return;setView({x:f.lon-4,y:-f.lat-4,w:8,h:8});}
  let expanded=false,priorOverflow='',closingExpansion=false,afterExpansion=null;
  function applyExpansion(on){
    if(on===expanded)return;
    expanded=on;$('mapWrap').classList.toggle('expanded',on);$('fullMap').setAttribute('aria-pressed',on);
    $('fullMap').textContent=on?'Collapse map':'Expand map';
    if(on){priorOverflow=document.body.style.overflow;document.body.style.overflow='hidden';$('closeMap').focus({preventScroll:true});}
    else{document.body.style.overflow=priorOverflow;$('fullMap').focus({preventScroll:true});}
    requestAnimationFrame(renderMap);
  }
  function closeExpansion(after=null){
    if(closingExpansion){if(after)afterExpansion=after;return true;}
    if(!expanded){after?.();return false;}
    applyExpansion(false);
    if(history.state?.efpMappingExpanded){closingExpansion=true;afterExpansion=after;history.back();}
    else after?.();
    return true;
  }
  function expandMap(on){
    if(!on)return closeExpansion();
    if(expanded||closingExpansion)return;
    history.pushState({...history.state,efpMappingExpanded:true},'',location.href);applyExpansion(true);
  }
  window.EFP_MAPPING_OVERLAY={
    back:()=>closeExpansion(),
    pop(){
      if(closingExpansion){closingExpansion=false;updateHash();const after=afterExpansion;afterExpansion=null;after?.();return true;}
      if(expanded){applyExpansion(false);updateHash();return true;}
      if(history.state?.efpMappingExpanded){applyExpansion(true);return true;}
      return false;
    }
  };
  function openStateNotes(id){
    const focus=document.activeElement;if(focus&&$('map').contains(focus))focus.blur();
    const open=()=>{changeRegion(id,{learn:true});requestAnimationFrame(()=>{$('stateNotesTitle')?.focus({preventScroll:true});$('stateStudy').scrollIntoView({behavior:'instant',block:'start'});});};
    if(expanded||closingExpansion)closeExpansion(open);else open();
  }
  function selectCountry(id){if(state.region!=='World'||dragged)return;const c=D.countries.find(c=>c.id===id);if(!c)return;state.country=id;state.continent=c.continent;state.topic='all';state.savedOnly=false;state.search='';$('placeSearch').value='';session=null;state.mode='learn';setDefaultView();refresh(true);}
  function zoom(factor){const w=Math.min(420,Math.max(2,view.w*factor)),h=view.h*w/view.w;setView({x:view.x+(view.w-w)/2,y:view.y+(view.h-h)/2,w,h});}
  function renderSources(){const term=$('sourceSearch').value.toLowerCase().trim();const ss=D.sources.filter(s=>(s.filename+' '+s.kind).toLowerCase().includes(term));$('sourceList').innerHTML=ss.map(s=>`<div class="source-card"><div><b>${esc(s.filename.replace(/_/g,' '))}<\/b><p>${esc(s.kind)}${s.pages?' · '+s.pages+' source pages':''}<\/p><\/div><\/div>`).join('')||'<p class="muted">No matching references.<\/p>';}
  function openNotes(){const original=D.questions.filter(q=>q.type==='original').length,pyq=D.questions.filter(q=>q.type==='pyq').length,compiled=D.questions.filter(q=>q.type==='source').length;$('reviewNotes').innerHTML=`<p><strong>${D.features.length} mapped study places<\/strong> · ${original} original questions · ${pyq} source-cited PYQs${compiled?' · '+compiled+' other source questions':''}.<\/p><ul><li>The supplied PDFs were used as references. This package contains the interactive map, questions and explanations.<\/li><li>Source names and page numbers are retained for review. Original PDF files are not bundled.<\/li><li>Question provenance is shown per item. A source-cited PYQ label is not a claim of official answer-key verification.<\/li><li>Study markers are approximate. Dashed river paths are schematic.<\/li><li>Core maps and questions work offline. Google Earth and external references need the internet.<\/li><\/ul>${D.meta.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗<\/a>`).join('')}`;$('notesDialog').showModal();}
  function progressDialog(){const total=Object.keys(saved.answers).length,correct=Object.values(saved.answers).filter(a=>a.correct).length;$('progressStats').innerHTML=`<div><strong>${total}<\/strong>questions attempted<\/div><div><strong>${correct}<\/strong>latest correct<\/div><div><strong>${saved.bookmarks.length}<\/strong>bookmarks<\/div>`;$('settingsDialog').showModal();}

  function changeRegion(region,{learn=false}={}){
    if(!['India','World'].includes(region)&&!STATE_STUDY?.profiles.has(region))return;
    state.region=region;state.topic=STATE_STUDY?.profiles.has(region)?'all':region==='World'?'seas':'rivers';
    state.selected=STATE_STUDY?.profiles.get(region)?.capitalId||'';state.continent='';state.country='';state.search='';state.savedOnly=false;$('placeSearch').value='';session=null;
    if(learn)state.mode='learn';setDefaultView();if(state.mode!=='learn')beginSession(state.mode);else refresh(true);
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('button,a');if(!b)return;
    if(b.dataset.region)changeRegion(b.dataset.region,{learn:true});
    if(b.dataset.topic){state.topic=b.dataset.topic;state.savedOnly=false;state.search='';$('placeSearch').value='';if(state.mode!=='learn')beginSession(state.mode);else refresh(true);}
    if(b.dataset.mode){state.savedOnly=false;if(b.dataset.mode==='learn'){state.mode='learn';session=null;refresh(true);}else beginSession(b.dataset.mode);}
    if(b.dataset.place)selectFeature(b.dataset.place);
    if(b.dataset.bookmark){const id=b.dataset.bookmark;saved.bookmarks=saved.bookmarks.includes(id)?saved.bookmarks.filter(x=>x!==id):[...saved.bookmarks,id];persist();refresh();}
    if(b.dataset.answer!==undefined)answer(Number(b.dataset.answer));
    if(b.dataset.close){$(b.dataset.close).close();}
    const action=b.dataset.action;if(!action)return;
    if(action==='locate-place')beginSession('locate',state.selected);
    if(action==='practice-place')beginSession('practice',state.selected);
    if(action==='pyq-place')beginSession('pyq',state.selected);
    if(action==='restart')beginSession(state.mode,session?.target);
    if(action==='mistakes')beginSession('mistakes');
    if(action==='saved-places'){$('settingsDialog').close();state.savedOnly=true;state.mode='learn';state.topic='all';state.search='';$('placeSearch').value='';refresh(true);}
    if(action==='learn'){state.mode='learn';session=null;refresh(true);}
    if(action==='expand'){state.topic='all';state.search='';state.savedOnly=false;$('placeSearch').value='';if(state.mode!=='learn')beginSession(state.mode);else refresh(true);}
    if(action==='previous')previous();if(action==='next')next();if(action==='skip')next(true);
    if(action==='show-map'){const q=activeQ();if(q){boundsView(q.featureIds.map(id=>[F.get(id).lon,F.get(id).lat]),.4);$('mapWrap').scrollIntoView({behavior:'smooth',block:'center'});}}
  });
  $('backToStateNotes').onclick=e=>{e.preventDefault();$('stateStudy').scrollIntoView({behavior:'smooth',block:'start'});};
  $('sessionSize').onchange=()=>{if(state.mode!=='learn')beginSession(state.mode);};
  $('resetSessionBtn').onclick=resetSession;
  $('resetDataInlineBtn').onclick=resetProgress;
  $('sourcesBtn').onclick=()=>{renderSources();$('sourceDialog').showModal();};$('sourceSearch').oninput=renderSources;
  $('settingsBtn').onclick=progressDialog;
  $('namesToggle').onchange=e=>{state.names=e.target.checked;renderMap();};
  $('stateNamesToggle').onchange=e=>{state.stateNames=e.target.checked;renderMap();};
  $('focusPlace').onclick=focusSelected;
  $('fullMap').onclick=()=>expandMap(!expanded);
  $('closeMap').onclick=()=>expandMap(false);
  $('islandShortcuts').onclick=e=>{const v=e.target.closest('[data-view]')?.dataset.view;if(!v)return;setView(({mainland:{x:67,y:-38,w:32,h:31},andaman:{x:91,y:-14.2,w:3.5,h:8},lakshadweep:{x:70,y:-13.5,w:5,h:6}})[v]);};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded)expandMap(false);});
  $('map').addEventListener('keydown',e=>{if(e.target!==$('map'))return;const d=view.w*.12;const keys={ArrowLeft:[-d,0],ArrowRight:[d,0],ArrowUp:[0,-d],ArrowDown:[0,d]};if(keys[e.key]){e.preventDefault();const [x,y]=keys[e.key];setView({...view,x:view.x+x,y:view.y+y});}else if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.8);}else if(e.key==='-'){e.preventDefault();zoom(1.25);}else if(e.key==='Home'){e.preventDefault();setDefaultView();renderMap();}});
  $('modeTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const tabs=[...$('modeTabs').querySelectorAll('[data-mode]')],i=tabs.indexOf(e.target);if(i<0)return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[n].focus();tabs[n].click();});
  $('resetMap').onclick=()=>{setDefaultView();renderMap();if(state.mode==='locate')fitQuestion();};
  $('zoomIn').onclick=()=>zoom(.75);$('zoomOut').onclick=()=>zoom(1.33);
  $('placeSearch').oninput=e=>{state.search=e.target.value;refresh();};
  $('clearSearch').onclick=()=>{state.search='';$('placeSearch').value='';refresh();};
  $('randomBtn').onclick=()=>{const a=filteredFeatures();if(a.length)selectFeature(a[Math.floor(Math.random()*a.length)].id);};
  $('savedBtn').onclick=()=>{state.savedOnly=!state.savedOnly;state.mode='learn';state.topic='all';state.search='';$('placeSearch').value='';refresh(true);};
  $('mapNotesBtn').onclick=openNotes;$('reviewNotesBtn').onclick=openNotes;
  $('continentSelect').onchange=e=>{state.continent=e.target.value;state.country='';setDefaultView();if(state.mode==='learn')refresh(true);else beginSession(state.mode);};
  $('countrySelect').onchange=e=>{state.country=e.target.value;setDefaultView();if(state.mode==='learn')refresh(true);else beginSession(state.mode);};
  $('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({...saved,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ExamFusion_Mapping_Progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Progress backup downloaded.');};
  $('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>5e6)throw Error('Backup is too large.');const incoming=validateSaved(JSON.parse(await file.text()));saved.bookmarks=[...new Set([...saved.bookmarks,...incoming.bookmarks])];for(const [id,a]of Object.entries(incoming.answers)){if(!saved.answers[id]||a.at>=saved.answers[id].at)saved.answers[id]=a;}persist();refresh();$('settingsDialog').close();toast('Progress restored and merged.');}catch(err){toast(err.message||'Could not read this backup.');}finally{e.target.value='';}};
  $('resetProgressBtn').onclick=resetProgress;
  $('map').addEventListener('click',e=>{if(dragged){dragged=false;return;}const marker=e.target.closest('[data-marker]');if(marker){const id=marker.dataset.marker,q=activeQ();if(q?.type==='locate'&&state.mode!=='learn'&&session.answered===null)answer(q.candidates.indexOf(id));else if(state.mode==='learn')selectFeature(id);return;}const stateShape=e.target.closest('[data-state-region]');if(stateShape&&state.mode==='learn'){openStateNotes(stateShape.dataset.stateRegion);return;}const country=e.target.closest('[data-country]');if(country)selectCountry(country.dataset.country);});
  $('map').addEventListener('keydown',e=>{const marker=e.target.closest('[data-marker],[data-state-region]');if(marker&&(e.key==='Enter'||e.key===' ')){e.preventDefault();marker.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
  $('map').addEventListener('pointerover',e=>{const m=e.target.closest('[data-marker]');if(!m||state.mode!=='learn')return;const f=F.get(m.dataset.marker);$('mapTooltip').textContent=f.name+' · '+f.hi;$('mapTooltip').hidden=false;});
  $('map').addEventListener('pointerout',e=>{if(e.target.closest('[data-marker]'))$('mapTooltip').hidden=true;});
  const pointers=new Map();let pinch=null,panFrame=0;
  $('map').addEventListener('pointerdown',e=>{if(e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});dragged=false;if(pointers.size===1)drag={x:e.clientX,y:e.clientY,view:{...view}};if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),view:{...view}};drag=null;}});
  window.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(distance<5)return;const w=Math.max(2,Math.min(420,pinch.view.w*pinch.distance/distance)),h=pinch.view.h*w/pinch.view.w;view={x:pinch.view.x+(pinch.view.w-w)/2,y:pinch.view.y+(pinch.view.h-h)/2,w,h};dragged=true;}
    else if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)<=5)return;dragged=true;const r=$('map').getBoundingClientRect(),scale=Math.max(drag.view.w/r.width,drag.view.h/r.height);view={...drag.view,x:drag.view.x-dx*scale,y:drag.view.y-dy*scale};}
    if(!panFrame)panFrame=requestAnimationFrame(()=>{panFrame=0;renderMap();});
  });
  function endPointer(e){if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);pinch=null;drag=null;if(pointers.size===1){const p=[...pointers.values()][0];drag={...p,view:{...view}};}if(!pointers.size&&dragged){renderMap();setTimeout(()=>dragged=false,0);}}
  window.addEventListener('pointerup',endPointer);window.addEventListener('pointercancel',endPointer);
  window.addEventListener('blur',()=>{pointers.clear();drag=null;pinch=null;});
  $('map').addEventListener('wheel',e=>{if(e.ctrlKey){e.preventDefault();zoom(e.deltaY>0?1.1:.9);}},{passive:false});
  let resizeFrame=0;function resizeMap(){cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(renderMap);}
  window.addEventListener('resize',resizeMap);
  if('ResizeObserver' in window)new ResizeObserver(resizeMap).observe($('mapWrap'));
  window.addEventListener('popstate',()=>{readHash();session=null;setDefaultView();if(state.mode!=='learn')beginSession(state.mode,null,false,false);else refresh();});
  window.addEventListener('hashchange',()=>{if(location.hash&&!location.hash.includes('='))return;readHash();$('placeSearch').value='';session=null;setDefaultView();if(state.mode!=='learn')beginSession(state.mode,null,false,false);else refresh();});
  STATE_STUDY?.init({selectRegion:changeRegion,focusFeature(id){const f=F.get(id);if(!f||!regionFeatures().some(x=>x.id===id))return;state.topic=f.topic;state.savedOnly=false;state.search='';$('placeSearch').value='';selectFeature(id);focusSelected();}});
  readHash();setDefaultView();if(state.mode!=='learn')beginSession(state.mode,null,false,false);else refresh();
  if(history.state?.efpMappingExpanded)applyExpansion(true);
  if('serviceWorker' in navigator && ['http:','https:'].includes(location.protocol))navigator.serviceWorker.register('sw.js?v=20261106mapnav2',{scope:'./'}).catch(()=>{});
})();
