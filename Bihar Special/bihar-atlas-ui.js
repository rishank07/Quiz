/* Bihar map layers, PDF chapter reader and river walkthrough for the shared atlas. */
(() => {
  'use strict';
  const D = window.MAPPING_DATA;
  const {index, chaptersByPlace, tours, timeline} = window.BiharAtlasData;
  const chapters = new Map(D.lessons.map(lesson=>[lesson.id,lesson]));
  const questions = new Map(D.questions.map(q=>[q.id,q]));
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colours = {rivers:'#0879ae',districts:'#417b74',divisions:'#8261ac',physical:'#b07a37',population:'#93539f',nature:'#347c4f',ancient:'#7351ac',medieval:'#a45e24',modern:'#b24450',culture:'#a24777',economy:'#5969a4'};
  const divisionColours = ['#b2d9d2','#d8c8e4','#f1d4b6','#d6e3a9','#c6cdef','#efd687','#efc2cc','#ecdba0','#bbd5ae'];
  const darkDivisionColours = ['#315b5b','#554666','#68513c','#4e6035','#434c73','#6a5938','#6c4351','#5c5436','#3e5a43'];
  const nearbyAreas = [
    ['Nepal','नेपाल',85.81,27.39], ['Uttar Pradesh','उत्तर प्रदेश',83.45,26.85],
    ['Jharkhand','झारखंड',85.64,24.13], ['West Bengal','पश्चिम बंगाल',88.26,25.38],
    ['Bangladesh','बांग्लादेश',90.12,24.00], ['Uttarakhand','उत्तराखंड',79.48,30.32],
    ['Bay of Bengal','बंगाल की खाड़ी',89.82,21.35], ['Madhya Pradesh','मध्य प्रदेश',81.5,23.58]
  ];
  const aliases = {geography:'physical',history:'ancient',water:'nature'};
  let api, route = null, hindi = false, directoryMode = 'chapters';

  const defaultView = () => ({x:83.10,y:-27.68,w:5.37,h:3.68});
  const isArea = f => f?.path || f?.members;
  const title = (en,hi) => hindi ? hi : en;
  const bilingual = (en,hi) => hindi
    ? '<span lang="hi">'+esc(hi)+'</span><small lang="en">'+esc(en)+'</small>'
    : '<span lang="en">'+esc(en)+'</span><small lang="hi">'+esc(hi)+'</small>';
  const pairLabel = (en,hi) => title(en,hi)+' · '+title(hi,en);
  const getTopic = id => D.topics.find(t=>t.id===id) || D.topics[0];
  const landmarkIds = lesson => [...new Set([...lesson.places,...lesson.questions.flatMap(q=>q.featureIds)])];

  function track(event, data) {
    if(!window.EFP_ANALYTICS_EXCLUDED && typeof window.gtag==='function') window.gtag('event',event,data);
  }
  function readHash(p) {
    const legacyTopic = p.get('layer');
    const rawTopic = p.get('topic') || legacyTopic;
    const chapter = chapters.get(p.get('lesson'));
    const mode = ['learn','locate','practice','mistakes'].includes(p.get('mode')) ? p.get('mode') : 'learn';
    let item = p.get('place') || p.get('item');
    if(legacyTopic==='districts' && /^\d+$/.test(item||'')) item = 'br-d-'+item;
    if(legacyTopic==='divisions' && item) item = 'br-v-'+item;
    const requestedTopic = D.topics.find(t=>t.id===rawTopic)?.id || (Object.hasOwn(aliases,rawTopic) ? aliases[rawTopic] : '');
    let selected = index.get(item);
    if(chapter && !landmarkIds(chapter).includes(selected?.id)) selected = index.get(chapter.places[0]);
    const topic = chapter?.topic || (legacyTopic && selected ? selected.topic : requestedTopic) || selected?.topic || (mode==='learn'?'rivers':'all');
    return {region:'Bihar',topic,mode,chapter:chapter?.id||'',selected:selected?.id||chapter?.places[0]||(topic==='rivers'?'ganga':'')};
  }
  function regionFeatures(state) {
    if(state.search.trim() || !state.chapter) return D.features;
    return landmarkIds(chapters.get(state.chapter)).map(id=>index.get(id));
  }

  function renderControls(state,q,session,filteredFeatures) {
    for(const b of $('modeTabs').querySelectorAll('button')) b.tabIndex = b.dataset.mode===state.mode ? 0 : -1;
    const t = getTopic(state.topic), chapter = chapters.get(state.chapter);
    const select=$('biharTopic');
    if(select.dataset.lang!==String(hindi)){
      select.innerHTML=D.topics.map(topic=>'<option value="'+topic.id+'">'+esc(pairLabel(topic.en,topic.hi))+'</option>').join('');
      select.dataset.lang=String(hindi);
    }
    select.value=state.topic;
    $('mapTitle').textContent = title(t.en,t.hi);
    $('mapSubtitle').textContent = q ? pairLabel('Question '+(session.index+1)+' / '+session.items.length,'प्रश्न '+(session.index+1)+' / '+session.items.length)
      : title('38 districts · 9 divisions','38 जिले · 9 प्रमंडल');
    const hidden = Boolean(q&&state.mode!=='learn'&&session.answered===null);
    $('namesToggle').checked = state.names && !hidden;
    $('namesToggle').disabled = hidden;
    $('focusPlace').disabled = state.mode!=='learn' || !index.has(state.selected);
    $('placeSearch').disabled = state.mode!=='learn';
    $('randomBtn').disabled = state.mode!=='learn' || !filteredFeatures().length;
    $('clearSearch').hidden = !state.search;
    $('mapHint').textContent = q?.type==='locate' && hidden
      ? title('Tap a numbered marker.','संख्या वाले चिह्न को चुनें।')
      : hidden ? title('Check an answer to reveal the map connection.','उत्तर जाँचने पर उसका मानचित्र संबंध दिखेगा।')
      : title('Tap to explore. Drag to pan, or use + and −.','पढ़ने के लिए मानचित्र छुएँ। खिसकाएँ या + और − का प्रयोग करें।');
    $('mobilePrompt').hidden = q?.type!=='locate' || !hidden;
    $('mobilePrompt').innerHTML = q ? '<b>'+bilingual(q.en,q.hi)+'</b>' : '';
    $('biharAllQuestions').textContent=pairLabel('All '+D.questions.length+' questions','सभी '+D.questions.length+' प्रश्न');
    $('biharAllQuestions').hidden=state.mode==='locate'||state.mode==='mistakes'||state.topic==='all';
    const f = index.get(state.selected);
    const chapterBar = $('biharChapterBar');
    const river = f?.study?.river && state.mode==='learn';
    chapterBar.hidden = !chapter && !river;
    chapterBar.innerHTML = (chapter ? '<div class="bihar-active-chapter">'+bilingual(chapter.en,chapter.hi)+
      '<button type="button" class="quiet small" data-bihar-action="clear-chapter" aria-label="Clear chapter filter">×</button></div>' : '')+
      (river ? '<div class="bihar-river-actions"><button type="button" class="primary" data-bihar-action="start-route">'+
      bilingual('Follow the river','नदी के साथ चलें')+'</button><button type="button" class="quiet" data-action="study-course">'+
      bilingual('Source to mouth','उद्गम से मुहाना')+'</button></div>' : '');
    const onRivers = state.topic==='rivers'||state.topic==='all'||q?.featureIds.some(id=>index.get(id)?.study?.river);
    $('featureLegend').innerHTML = '<span><i class="selected-key"></i>'+esc(pairLabel('Selected','चयनित'))+'</span>'+
      (onRivers ? '<span><i class="source-key"></i>'+esc(pairLabel('Source','उद्गम'))+'</span><span><i class="mouth-key"></i>'+
      esc(pairLabel('Confluence / mouth','संगम / मुहाना'))+'</span><span><i class="dashed-key"></i>'+esc(pairLabel('Schematic course','सांकेतिक धारा'))+'</span>' : '')+
      (state.topic==='divisions' ? '<span>'+esc(pairLabel('One colour per division','हर प्रमंडल का अलग रंग'))+'</span>' : '');
    if(route && (state.mode!=='learn' || state.selected!==route.id)) clearRoute();
  }

  function renderPlaceList(state,features,saved) {
    const el = $('placeList');
    const chapter = chapters.get(state.chapter);
    el.hidden = state.mode!=='learn';
    el.classList.toggle('has-search',Boolean(state.search));
    if(el.hidden)return;
    const visible = features;
    el.innerHTML = (state.search || chapter ? '<p class="bihar-place-caption">'+esc(pairLabel(state.search?'Matching places':'Places in this chapter',state.search?'मिलने वाले स्थल':'इस अध्याय के स्थल'))+'</p>' : '')+
      (visible.length ? visible.map(f=>'<button type="button" class="place-chip '+(f.id===state.selected?'active':'')+
        '" aria-pressed="'+(f.id===state.selected)+'" data-bihar-place="'+f.id+'">'+bilingual(f.name,f.hi)+(saved.bookmarks.includes(f.id)?' ★':'')+'</button>').join('') :
        '<p class="empty-inline">'+esc(pairLabel(state.savedOnly?'No saved places yet':'No matching places',state.savedOnly?'अभी कोई सहेजा स्थल नहीं':'कोई मेल खाता स्थल नहीं'))+'</p>');
  }

  function featureButton(f) {
    return '<button type="button" class="study-related" data-bihar-place="'+f.id+'">'+bilingual(f.name,f.hi)+'</button>';
  }
  function questionNote(q) {
    return '<div class="bihar-lesson-note"><p>'+bilingual(q.explanation,q.explanationHi)+'</p>'+
      '<div class="bihar-note-actions"><button type="button" class="text-button" data-bihar-fact="'+q.id+'">'+
      esc(pairLabel('Show on map','मानचित्र पर दिखाएँ'))+'</button><small>'+esc(pairLabel('PDF p. '+q.source.page,'पीडीएफ पृ. '+q.source.page))+'</small></div></div>';
  }
  function renderDetail(f,state,saved,featureStudy) {
    const panel = $('detailPanel');
    const chapter = chapters.get(state.chapter);
    if(!f) {
      panel.innerHTML = '<div class="empty-state"><h3>'+esc(pairLabel('Choose a place','कोई स्थल चुनें'))+'</h3>'+
        '<button class="primary" data-action="expand">'+esc(pairLabel('All topics','सभी विषय'))+'</button></div>';
      return;
    }
    const relevant = (chaptersByPlace.get(f.id)||[]).filter(l=>l.id!==state.chapter);
    const available = D.questions.filter(q=>q.featureIds.includes(f.id)).length;
    const savedPlace = saved.bookmarks.includes(f.id);
    const membership = f.division ? [index.get(f.division)] : (f.members||[]).map(id=>index.get(id));
    panel.innerHTML = '<div class="detail-eyebrow"><span>'+esc(pairLabel(chapter?'CHAPTER MAP':'PLACE IN FOCUS',chapter?'अध्याय का मानचित्र':'चुना हुआ स्थल'))+
      '</span><button type="button" class="bookmark" data-bookmark="'+f.id+'" aria-pressed="'+savedPlace+'" aria-label="'+
      esc(savedPlace?'Remove bookmark':'Bookmark place')+'">'+(savedPlace?'★':'☆')+'</button></div>'+
      '<h2 class="detail-title">'+esc(title(f.name,f.hi))+'</h2><p class="detail-hindi" lang="'+(hindi?'en':'hi')+'">'+esc(title(f.hi,f.name))+'</p>'+
      '<div class="place-meta"><span class="pill">'+esc(pairLabel(f.area,f.areaHi))+'</span><span class="pill gold">'+esc(title(getTopic(f.topic).en,getTopic(f.topic).hi))+'</span></div>'+
      '<div class="fact-block"><p>'+bilingual(f.fact,f.factHi)+'</p></div>'+
      (membership.length ? '<div class="study-related-list">'+membership.map(featureButton).join('')+'</div>' : '')+
      '<div class="detail-actions">'+(!f.statewide ? '<button type="button" class="quiet" data-action="locate-place">'+
      bilingual('Locate this place','मानचित्र पर पहचानें')+'</button>' : '')+(available ? '<button type="button" class="secondary" data-bihar-practice-place="'+f.id+'">'+
      bilingual('Practice this place','इस स्थल के प्रश्न')+'</button>' : '')+'</div>'+
      (!chapter && f.study?.river ? featureStudy(f) : '')+
      (chapter ? '<section class="bihar-chapter-notes"><h3>'+bilingual(chapter.en,chapter.hi)+'</h3><p class="muted">'+
      esc(pairLabel('PDF pages '+chapter.pages,'पीडीएफ पृष्ठ '+chapter.pages))+'</p><div class="detail-actions"><button type="button" class="primary" data-bihar-practice-chapter="'+chapter.id+'">'+
      bilingual('Practice this chapter','इस अध्याय का अभ्यास')+'</button><button type="button" class="quiet" data-bihar-action="chapter-map">'+bilingual('See all chapter sites','अध्याय के सभी स्थल देखें')+'</button></div>'+
      chapter.questions.map(questionNote).join('')+'</section>' : '')+
      (relevant.length ? '<section class="bihar-chapter-notes"><h3>'+bilingual('Chapters for this place','इस स्थल के अध्याय')+
      '</h3><div class="study-related-list">'+relevant.map(l=>'<button type="button" class="study-related" data-bihar-chapter="'+l.id+'">'+bilingual(l.en,l.hi)+'</button>').join('')+'</div></section>' : '');
  }

  function makeLocate(f,pool,shuffle) {
    const sameTopic=g=>g.id!==f.id && g.topic===f.topic && !g.statewide && g.area!=='Jharkhand';
    const distant=g=>Math.hypot(f.lon-g.lon,f.lat-g.lat)>.20;
    const preferred=pool.filter(g=>sameTopic(g)&&distant(g));
    const backup=D.features.filter(g=>sameTopic(g)&&distant(g)&&!preferred.includes(g));
    const fallback=D.features.filter(g=>g.id!==f.id && !g.statewide && g.topic!==f.topic && !isArea(g) && distant(g));
    // Do not put two distractors on almost the same pixel when the map is fitted.
    const choices=[f];
    for(const g of [...shuffle(preferred),...shuffle(backup),...shuffle(fallback)]){
      if(choices.every(x=>Math.hypot(x.lon-g.lon,x.lat-g.lat)>.20))choices.push(g);
      if(choices.length===4)break;
    }
    const candidates=shuffle(choices);
    return {id:'locate-'+f.id,type:'locate',topic:f.topic,region:'Bihar',featureIds:[f.id],
      en:'Find '+f.name+' on the map.',hi:'मानचित्र पर '+f.hi+' पहचानें।',
      options:candidates.map((_,i)=>({en:'Marker '+(i+1),hi:'चिह्न '+(i+1)})),
      answer:candidates.indexOf(f),candidates:candidates.map(g=>g.id),explanation:f.fact,explanationHi:f.factHi,source:f.source};
  }
  function sessionItems(mode,state,target,features,saved,makeLocate) {
    const inChapter=q=>!state.chapter || q.chapter===state.chapter;
    const inTopic=q=>state.topic==='all'||q.topic===state.topic||state.chapter;
    const matchesTarget=q=>!target || q.featureIds.includes(target);
    const focus=index.get(target);
    const locateAllowed=f=>f && !f.statewide;
    if(mode==='locate')return (focus?[focus]:features).filter(locateAllowed).map(makeLocate);
    if(mode==='mistakes')return Object.keys(saved.answers).filter(id=>!saved.answers[id].correct)
      .map(id=>questions.get(id)||(id.startsWith('locate-')&&locateAllowed(index.get(id.slice(7)))?makeLocate(index.get(id.slice(7))):null))
      .filter(q=>q && inTopic(q) && (q.type==='locate' ? !state.chapter||features.some(f=>f.id===q.featureIds[0]) : inChapter(q)));
    return D.questions.filter(q=>matchesTarget(q)&&(target||inTopic(q)&&inChapter(q)));
  }
  function shuffleOptions(q,shuffle) {
    const indices=shuffle(q.options.map((_,i)=>i));
    return {...q,options:indices.map(i=>q.options[i]),answer:indices.indexOf(q.answer)};
  }
  function highlightAnswer(text,answer) {
    if(!answer || answer.length>65)return esc(text);
    const at=text.toLocaleLowerCase().indexOf(answer.toLocaleLowerCase());
    if(at<0)return esc(text);
    return esc(text.slice(0,at))+'<mark>'+esc(text.slice(at,at+answer.length))+'</mark>'+esc(text.slice(at+answer.length));
  }
  function renderSessionStatus(session,state) {
    const panel=$('detailPanel');
    if(!session?.items.length){
      const message=state.mode==='mistakes'?['No mistakes to review here','यहाँ दोहराने के लिए कोई गलती नहीं है']:['No questions in this selection','इस चयन में प्रश्न नहीं हैं'];
      panel.innerHTML='<div class="empty-state"><h3>'+bilingual(...message)+'</h3><button type="button" class="primary" data-action="expand">'+bilingual('All topics','सभी विषय')+'</button></div>';
      return;
    }
    panel.innerHTML='<div class="empty-state"><h3>'+bilingual('Session complete','अभ्यास पूरा')+'</h3><p>'+
      esc(pairLabel(session.correct+' correct · '+session.wrong+' to review · '+session.skipped+' skipped',
        session.correct+' सही · '+session.wrong+' दोहराएँ · '+session.skipped+' छोड़े'))+'</p>'+
      '<div class="detail-actions"><button type="button" class="primary" data-action="restart">'+bilingual('New session','नया अभ्यास')+'</button>'+
      '<button type="button" class="quiet" data-action="previous">'+bilingual('Previous question','पिछला प्रश्न')+'</button>'+
      '<button type="button" class="quiet" data-action="mistakes">'+bilingual('Review mistakes','गलतियाँ दोहराएँ')+'</button>'+
      '<button type="button" class="quiet" data-action="learn">'+bilingual('Return to Learn','पढ़ने पर लौटें')+'</button></div></div>';
  }
  function renderQuestion(q,session,sourceButton) {
    const answered=session.answered!==null,right=session.answered===q.answer;
    const label=q.type==='locate' ? ['Locate on the map','मानचित्र पर पहचानें'] : ['PDF practice','पीडीएफ अभ्यास'];
    const correct=q.options[q.answer], chapter=chapters.get(q.chapter);
    const feedback=answered ? '<div class="answer-box '+(right?'':'is-wrong')+'"><strong>'+
      esc(pairLabel(right?'Correct ✓':'Review this answer',right?'सही ✓':'उत्तर दोहराएँ'))+'</strong><p lang="'+(hindi?'hi':'en')+'">• '+
      highlightAnswer(title(q.explanation,q.explanationHi),title(correct.en,correct.hi))+'</p><p class="hindi" lang="'+(hindi?'en':'hi')+'">• '+
      highlightAnswer(title(q.explanationHi,q.explanation),title(correct.hi,correct.en))+'</p></div><div class="detail-source">'+
      (q.source?.id==='bihar-pdf' ? esc(pairLabel('PDF page '+q.source.page,'पीडीएफ पृष्ठ '+q.source.page)) : sourceButton(q.source))+'</div>' : '';
    $('detailPanel').innerHTML='<div class="question-topline"><span>'+esc(pairLabel(...label))+'</span><span>'+
      (session.index+1)+' / '+session.items.length+' · '+session.available+' '+esc(title('available','उपलब्ध'))+'</span></div>'+
      '<div class="session-progress"><span style="width:'+((session.index+Number(answered))/session.items.length*100)+'%"></span></div>'+
      (chapter?'<p class="q-kind">'+esc(title(chapter.en,chapter.hi))+'</p>':'')+
      '<p class="q-en" lang="'+(hindi?'hi':'en')+'">'+esc(title(q.en,q.hi))+'</p><p class="q-hi" lang="'+(hindi?'en':'hi')+'">'+esc(title(q.hi,q.en))+'</p>'+
      '<div class="option-list">'+q.options.map((o,i)=>'<button type="button" class="option '+(answered&&i===q.answer?'correct':'')+
      (answered&&i===session.answered&&!right?' wrong':'')+'" data-answer="'+i+'" '+(answered?'disabled':'')+'><span class="option-letter">'+
      'ABCD'[i]+'</span><span>'+bilingual(o.en,o.hi)+(answered&&i===q.answer?'<small class="correct-label" lang="hi">(सही उत्तर ✔)</small>':'')+'</span></button>').join('')+'</div>'+
      feedback+'<div class="session-actions"><button type="button" class="quiet" data-action="previous" '+(session.index===0?'disabled':'')+
      '>'+esc(title('← Previous','← पिछला'))+'</button>'+(answered?'<button type="button" class="quiet" data-action="show-map">'+
      esc(title('Show on map','मानचित्र पर देखें'))+'</button><button type="button" class="primary" data-action="next">'+esc(title('Next →','अगला →'))+'</button>':
      '<button type="button" class="quiet" data-action="skip">'+esc(title('Skip','छोड़ें'))+'</button>')+'</div>'+
      '<div class="session-score"><span>✓ '+session.correct+' '+esc(title('correct','सही'))+'</span><span>↺ '+session.wrong+' '+
      esc(title('to revise','दोहराएँ'))+'</span><span>'+session.skipped+' '+esc(title('skipped','छोड़े'))+'</span></div>';
  }

  function bounds(coords,padding) {
    if(!coords.length)return null;
    const xs=coords.map(p=>p[0]),ys=coords.map(p=>-p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const w=Math.max(.55,maxX-minX)*(1+2*padding),h=Math.max(.46,maxY-minY)*(1+2*padding);
    return {x:(maxX+minX-w)/2,y:(maxY+minY-h)/2,w,h};
  }
  const pointOf=f=>[f.lon,f.lat];
  function focusPlace(f) {
    if(!f)return;
    if(f.statewide) {api.setView(defaultView());return;}
    if(f.members) {api.boundsView(f.members.map(id=>pointOf(index.get(id))),.38);return;}
    if(f.study?.river) {
      const nearby=(f.related||[]).map(id=>index.get(id)).filter(Boolean).map(pointOf);
      api.boundsView([pointOf(f),...nearby],.36);
      return;
    }
    api.boundsView([pointOf(f)],f.path?.length>3500?.65:.38);
  }
  function fitFeatures(features,padding=.28) {
    const anchors=features.filter(f=>!f.statewide).flatMap(f=>f.members?f.members.map(id=>pointOf(index.get(id))):[pointOf(f)]);
    if(anchors.length)api.boundsView(anchors,padding);
    else api.setView(defaultView());
  }
  function showAnswerOnMap(q) {
    if(q.type==='locate') {fitFeatures(q.candidates.map(id=>index.get(id)),.30);return;}
    const anchors=q.featureIds.map(id=>index.get(id));
    if(anchors.length===1 && anchors[0].study?.river){focusPlace(anchors[0]);return;}
    fitFeatures(anchors,.35);
  }

  let districtRenderKey='';
  const districtColours=new Map(D.divisions.map((v,i)=>[v.id,[divisionColours[i],darkDivisionColours[i]]]));
  function renderDistricts(state,selected,q,session,svg) {
    const layer=$('biharDistrictLayer');
    const locate=q?.type==='locate', revealed=!q || session?.answered!==null;
    const isDivision=state.topic==='divisions'||(locate&&q.topic==='divisions');
    const chapter=chapters.get(state.chapter);
    const areaIds=chapter&&state.mode==='learn' ? new Set(landmarkIds(chapter).filter(id=>isArea(index.get(id)))) : new Set();
    const fullState=selected.has('br-overview')&&(state.mode!=='learn'||chapter);
    const clickable=state.mode==='learn'&&['districts','divisions','all'].includes(state.topic);
    const wrong=locate&&revealed?q.candidates[session.answered]:'';
    const containing=new Set([...selected].map(id=>index.get(id)?.district).filter(Boolean));
    const key=JSON.stringify([state.mode,state.topic,state.chapter,hindi,revealed,isDivision,[...selected],wrong]);
    if(key===districtRenderKey)return;
    districtRenderKey=key;
    layer.replaceChildren();
    for (const d of D.districts) {
      const id=isDivision?d.division:d.id;
      const chosen=selected.has(d.id)||selected.has(d.division);
      const linked=areaIds.has(d.id)||areaIds.has(d.division)||containing.has(d.id);
      const active=clickable||(state.mode==='learn'&&linked);
      const f=index.get(id);
      const [light,dark]=districtColours.get(d.division);
      const cls=['bihar-district',isDivision&&'division',chosen&&'is-selected',linked&&'is-linked',
        fullState&&'statewide',(wrong===d.id||wrong===d.division)&&'is-wrong',active&&'can-select'].filter(Boolean).join(' ');
      const attrs={class:cls,d:d.path,'data-district-code':d.code,'data-division':d.division,
        style:'--division-light:'+light+';--division-dark:'+dark};
      if(active)Object.assign(attrs,{'data-marker':id,role:'button',tabindex:isDivision&&f.members[0]!==d.id?-1:0,
        'aria-label':pairLabel(f.name,f.hi)});
      layer.append(svg('path',attrs));
    }
  }

  function renderAreaLabels(state,selected,q,metrics,boxes,svg) {
    if(!state.names || (q&&state.mode!=='learn'&&selected.size===0))return;
    const {unit,width,height,left,top}=metrics;
    const districtMode=state.topic==='districts', divisionMode=state.topic==='divisions';
    const labelFont=width<580?10:12;
    const layer=$('stateLabelLayer');
    const labels=[];
    if((districtMode||divisionMode)&&state.mode==='learn') {
      const areas=divisionMode?D.divisions:D.districts;
      const ranked=[...areas].sort((a,b)=>Number(selected.has(b.id))-Number(selected.has(a.id)));
      for(const f of ranked)labels.push({x:f.lon,y:-f.lat,text:divisionMode?title(f.shortName,f.shortHi):title(f.name,f.hi),selected:selected.has(f.id),font:labelFont});
    } else {
      for(const id of selected){
        const f=index.get(id);
        if(!isArea(f))continue;
        labels.push({x:f.lon,y:-f.lat,text:title(f.shortName||f.name,f.shortHi||f.hi),selected:true,font:labelFont});
      }
    }
    for(const [en,hi,lon,lat] of nearbyAreas)labels.push({x:lon,y:-lat,text:title(en,hi),context:true,font:width<580?10:13});
    for(const label of labels){
      const x=(label.x-left)/unit,y=(label.y-top)/unit,w=label.text.length*label.font*.56,h=label.font+5;
      const b={x:x-w/2,y:y-h/2,w,h};
      if(b.x<6||b.x+w>width-9||b.y<28||b.y+h>height-40)continue;
      if(boxes.some(o=>b.x<o.x+o.w+2&&b.x+w+2>o.x&&b.y<o.y+o.h+2&&b.y+h+2>o.y))continue;
      boxes.push(b);
      const t=svg('text',{x:label.x,y:label.y,'font-size':label.font*unit,'stroke-width':2.7*unit,
        'text-anchor':'middle',class:'bihar-area-label'+(label.selected?' is-selected':'')+(label.context?' context':'')});
      t.textContent=label.text;layer.append(t);
    }
  }
  function renderRiverDirection(r,layer,m,svg) {
    const lines=r.geometry.type==='LineString'?[r.geometry.coordinates]:r.geometry.coordinates;
    const {unit,width,height,left,top}=m;
    const onScreen=([lon,lat])=>lon>left+unit*25&&lon<left+(width-25)*unit&&-lat>top+unit*24&&-lat<top+(height-45)*unit;
    const steps=[];
    for(const segment of lines){
      const line=r.id==='ganga'&&!r.schematic&&segment[0][0]>segment.at(-1)[0]?[...segment].reverse():segment;
      let distance=0;
      for(let i=1;i<line.length;i++){
        const [x1,y1]=line[i-1],[x2,y2]=line[i];
        distance+=Math.hypot(x2-x1,y2-y1)/unit;
        const p=[(x1+x2)/2,(y1+y2)/2];
        if(distance<58||!onScreen(p)||steps.some(old=>Math.hypot(old[0]-p[0],old[1]-p[1])/unit<58))continue;
        distance=0;steps.push(p);
        const angle=Math.atan2(y1-y2,x2-x1)*180/Math.PI;
        layer.append(svg('path',{d:'M-3,-3L3,0L-3,3',transform:'translate('+p[0]+','+(-p[1])+') rotate('+angle+') scale('+unit+')',class:'bihar-flow-arrow'}));
      }
    }
  }
  function labelStatus(state,unrevealed,isLocate,shown,total) {
    if(unrevealed)return title(isLocate?'Choose a numbered marker':'Answer labels hidden',isLocate?'संख्या वाला चिह्न चुनें':'उत्तर के नाम छिपे हैं');
    if(!state.names)return title('Map labels hidden','मानचित्र के नाम छिपे हैं');
    if(state.topic==='districts'||state.topic==='divisions')return title('Bihar district boundaries','बिहार की जिला सीमाएँ');
    return title('Bihar atlas','बिहार मानचित्र')+(total>shown&&!isLocate?' · '+title('Zoom for more labels','और नामों के लिए ज़ूम करें'):'');
  }
  function selectFeature(state,f,filteredFeatures) {
    const chapter=chapters.get(state.chapter);
    if(chapter&&!landmarkIds(chapter).includes(f.id))state.chapter='';
    if(!state.chapter&&state.topic!=='all'&&f.topic!==state.topic){state.topic=f.topic;state.savedOnly=false;}
    if(state.savedOnly&&!filteredFeatures(false).some(g=>g.id===f.id))state.savedOnly=false;
    state.search='';$('placeSearch').value='';state.noteIds=[];
    state.selected=f.id;state.mode='learn';
    if(route&&route.id!==f.id)clearRoute();
    track('bihar_map_select',{map_layer:state.topic,map_item:f.id});
  }

  function currentRoute() {
    const stop=route.stops[route.step],target=index.get(stop.target);
    return {...stop,coord:target?pointOf(target):stop.target};
  }
  function clearRoute() {
    route=null;
    $('biharRoute').hidden=true;
    $('biharRouteLayer').replaceChildren();
  }
  function renderRoute() {
    if(!route)return;
    const stop=currentRoute(),el=$('biharRoute');
    el.hidden=false;
    el.innerHTML='<div class="bihar-route-controls"><button type="button" class="quiet small" data-bihar-action="prev-stop" '+
      (route.step===0?'disabled':'')+' aria-label="Previous stop">←</button>'+
      '<select id="biharStopSelect" aria-label="Choose a river stop">'+route.stops.map((s,i)=>'<option value="'+i+'" '+(i===route.step?'selected':'')+'>'+
      (i+1)+'. '+esc(pairLabel(s.label.en,s.label.hi))+'</option>').join('')+'</select>'+
      '<button type="button" class="quiet small" data-bihar-action="next-stop" '+(route.step===route.stops.length-1?'disabled':'')+
      ' aria-label="Next stop">→</button><button type="button" class="quiet small" data-bihar-action="end-route" aria-label="Close river walkthrough">×</button></div>'+
      '<p class="bihar-route-text" aria-live="polite">'+bilingual(stop.details.en,stop.details.hi)+'</p>';
  }
  function stepTo(i) {
    if(!route||i<0||i>=route.stops.length)return;
    const focus=document.activeElement?.dataset.biharAction;
    const wasPicker=document.activeElement?.id==='biharStopSelect';
    route.step=i;renderRoute();
    api.boundsView([currentRoute().coord],.65);
    if(wasPicker)$('biharStopSelect').focus({preventScroll:true});
    if(focus==='prev-stop'||focus==='next-stop'){
      const control=$('biharRoute').querySelector('[data-bihar-action="'+focus+'"]');
      (control.disabled?$('biharStopSelect'):control).focus({preventScroll:true});
    }
  }
  function startRoute() {
    const f=index.get(api.state.selected),r=f?.study?.river;
    if(!r)return;
    const stops=tours[f.id]||[
      {label:{en:'Source',hi:'उद्गम'},details:r.origin,target:r.start},
      ...f.related.map(id=>index.get(id)).filter(Boolean).map(g=>({label:{en:g.name,hi:g.hi},details:{en:g.fact,hi:g.factHi},target:g.id})),
      {label:{en:'Mouth / confluence',hi:'मुहाना / संगम'},details:r.mouth,target:r.end}
    ];
    route={id:f.id,stops,step:0};
    stepTo(0);scrollMap();
  }
  function showCourse(f) {
    if(!f?.study?.river)return;
    clearRoute();
    const paths=D.rivers.filter(r=>r.id===f.id).flatMap(r=>r.geometry.type==='LineString'?r.geometry.coordinates:r.geometry.coordinates.flat());
    api.boundsView([f.study.river.start,f.study.river.end,...paths],.10);
  }
  function renderRoutePoint(state,m,svg) {
    const layer=$('biharRouteLayer');
    layer.replaceChildren();
    if(!route||state.mode!=='learn')return;
    const {unit}=m;
    for(const [i,stop] of route.stops.entries()){
      const f=index.get(stop.target);
      const [lon,lat]=f?pointOf(f):stop.target;
      const x=(lon-m.left)/unit,y=(-lat-m.top)/unit;
      if(x<8||y<8||x>m.width-8||y>m.height-8)continue;
      const g=svg('g',{transform:'translate('+lon+','+(-lat)+')',class:'bihar-stop'+(i===route.step?' is-current':''),
        'data-bihar-stop':i,role:'button',tabindex:0,'aria-label':pairLabel(stop.label.en,stop.label.hi)});
      g.append(svg('circle',{r:16*unit,class:'touch-target'}));
      g.append(svg('circle',{r:(i===route.step?12:9)*unit,class:'bihar-stop-circle'}));
      const t=svg('text',{y:3.5*unit,'text-anchor':'middle','font-size':10*unit});
      t.textContent=String(i+1);g.append(t);layer.append(g);
    }
  }
  function handleMapClick(e,state) {
    const stop=e.target.closest('[data-bihar-stop]');
    if(stop&&state.mode==='learn'){stepTo(Number(stop.dataset.biharStop));return true;}
    return false;
  }

  function scrollMap() {
    $('mapWrap').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
  }
  function bringQuizIntoView() {
    if(innerWidth<=1000)$('detailPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function pickPlace(id) {
    const f=index.get(id);
    if(!f)return;
    api.selectFeature(id);focusPlace(f);scrollMap();
  }
  function changeTopic(id) {
    const {state}=api;
    state.noteIds=[];state.chapter='';state.topic=id;state.selected=id==='rivers'?'ganga':'';state.savedOnly=false;state.search='';
    $('placeSearch').value='';clearRoute();
    track('bihar_map_layer',{map_layer:id});
    if(state.mode==='learn'){api.setDefaultView();api.refresh(true);}
    else api.beginSession(state.mode);
  }
  function openChapter(id,place) {
    const lesson=chapters.get(id);
    if(!lesson)return;
    const {state}=api;
    state.noteIds=[];state.chapter=id;state.topic=lesson.topic;state.savedOnly=false;state.search='';$('placeSearch').value='';
    clearRoute();
    const selected=landmarkIds(lesson).includes(place)?place:lesson.places[0];
    api.selectFeature(selected);
    if(place)focusPlace(index.get(selected));
    else fitFeatures(landmarkIds(lesson).map(p=>index.get(p)));
    track('bihar_map_chapter',{map_chapter:id,map_layer:state.topic});
    scrollMap();
  }
  function renderDirectory() {
    const search=$('biharChapterSearch').value.trim().toLocaleLowerCase(),timelineMode=directoryMode==='timeline';
    $('biharDirectoryTitle').innerHTML=timelineMode?bilingual('History timeline','इतिहास की समयरेखा'):bilingual('PDF chapters','पीडीएफ के अध्याय');
    $('biharChapterSearch').hidden=timelineMode;
    const rows=timelineMode?timeline.map(e=>({...e.label,id:e.chapter,place:e.place})):D.lessons.filter(l=>[l.en,l.hi,getTopic(l.topic).en,getTopic(l.topic).hi,l.pages].join(' ').toLocaleLowerCase().includes(search));
    $('biharChapterList').innerHTML=rows.length?rows.map(l=>'<button type="button" class="bihar-chapter-entry quiet" data-bihar-chapter="'+l.id+
      '" '+(l.place?'data-bihar-landmark="'+l.place+'"':'')+'>'+bilingual(l.en,l.hi)+'<small>'+
      esc(l.place?title('Show on map','मानचित्र पर देखें'):title('PDF pp. ','पीडीएफ पृ. ')+l.pages)+'</small></button>').join(''):
      '<p class="muted">'+esc(pairLabel('No matching chapters','कोई मेल खाता अध्याय नहीं'))+'</p>';
  }
  function openDirectory(mode) {
    directoryMode=mode;$('biharChapterSearch').value='';renderDirectory();
    $('biharChapterDialog').showModal();
  }
  function openCredits() {
    $('reviewNotes').innerHTML='<p>'+D.lessons.length+' PDF lessons and '+D.questions.length+' original bilingual practice questions. Dashed river paths and mapped study locations are approximate.</p>'+
      '<p lang="hi">'+D.lessons.length+' पीडीएफ अध्याय और '+D.questions.length+' द्विभाषी अभ्यास प्रश्न। टूटी रेखाओं वाली नदी धाराएँ और अध्ययन स्थल अनुमानित हैं।</p>'+
      '<ul>'+D.meta.sources.map(s=>'<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title)+' ↗</a></li>').join('')+'</ul>';
    $('notesDialog').showModal();
  }
  function bind(actions) {
    api=actions;
    $('biharTopic').onchange=e=>changeTopic(e.target.value);
    $('biharChapters').onclick=()=>openDirectory('chapters');
    $('biharTimeline').onclick=()=>openDirectory('timeline');
    $('biharChapterSearch').oninput=renderDirectory;
    $('language').onclick=()=>{
      track('bihar_map_language',{map_language:hindi?'en':'hi'});
      window.toggleHindiTranslate?.();
    };
    const applyLanguage=on=>{
      if(hindi===on)return;
      hindi=on;
      document.documentElement.lang=hindi?'hi':'en';
      $('language').lang=hindi?'en':'hi';
      $('language').textContent=hindi?'English':'हिंदी';
      $('language').setAttribute('aria-label',hindi?'Read in English':'Read in Hindi');
      if(api.state.region==='Bihar'){api.refresh();renderRoute();}
    };
    document.addEventListener('efp-translate-state',e=>applyLanguage(e.detail.hindi));
    applyLanguage(window.efpIsHindiOn?.()||false);
    $('biharRoute').addEventListener('change',e=>{if(e.target.id==='biharStopSelect')stepTo(Number(e.target.value));});
    document.addEventListener('click',e=>{
      const b=e.target.closest('button');
      if(!b)return;
      const d=b.dataset;
      if(d.biharChapter){
        if($('biharChapterDialog').open)$('biharChapterDialog').close();
        openChapter(d.biharChapter,d.biharLandmark);
      }
      if(d.biharPlace)pickPlace(d.biharPlace);
      if(d.biharPracticePlace){
        api.state.chapter='';
        api.beginSession('practice',d.biharPracticePlace);
        bringQuizIntoView();
      }
      if(d.biharPracticeChapter){api.beginSession('practice');bringQuizIntoView();}
      if(d.biharAction==='all-practice') {
        api.state.chapter='';api.state.topic='all';api.state.savedOnly=false;
        api.beginSession('practice');bringQuizIntoView();
      }
      if(d.biharFact){
        const q=questions.get(d.biharFact),id=q.featureIds[0];
        if(api.state.selected!==id)api.selectFeature(id);
        api.state.noteIds=q.featureIds;
        fitFeatures(q.featureIds.map(id=>index.get(id)),.39);scrollMap();
      }
      if(d.biharAction==='clear-chapter')changeTopic(api.state.topic);
      if(d.biharAction==='chapter-map'){
        const lesson=chapters.get(api.state.chapter);
        if(lesson){fitFeatures(landmarkIds(lesson).map(id=>index.get(id)));scrollMap();}
      }
      if(d.biharAction==='start-route')startRoute();
      if(d.biharAction==='prev-stop')stepTo(route.step-1);
      if(d.biharAction==='next-stop')stepTo(route.step+1);
      if(d.biharAction==='end-route'){clearRoute();api.setDefaultView();api.renderMap();}
    });
  }
  const mapName=(f,secondary=false)=>secondary ? title(f.hi,f.name) : title(f.name,f.hi);
  window.BiharAtlasUI={colours,mapName,secondLanguage:()=>hindi?'en':'hi',readHash,defaultView,bounds,regionFeatures,renderControls,renderPlaceList,renderDetail,renderQuestion,renderSessionStatus,
    makeLocate,sessionItems,shuffleOptions,renderDistricts,renderAreaLabels,renderRiverDirection,renderRoutePoint,handleMapClick,
    labelStatus,selectFeature,focusPlace,showCourse,showAnswerOnMap,clearRoute,bind,track,openCredits};
})();
