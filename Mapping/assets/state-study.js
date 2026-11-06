/* State reading UI and shared HTML renderer for searchable, static revision pages. */
(() => {
  'use strict';
  const N=window.MAPPING_STATE_NOTES,D=window.MAPPING_DATA;
  if(!N||!D)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const profiles=new Map(N.profiles.map(p=>[p.id,p]));
  const norm=value=>String(value).toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
  const slug=p=>p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
  const geometry=window.MAPPING_STATES||[];
  const riverRegions={
    ganga:['uttarakhand','UP','Bihar','jharkhand','west-bengal'],yamuna:['uttarakhand','himachal-pradesh','haryana','delhi','UP'],
    brahmaputra:['arunachal-pradesh','assam'],godavari:['maharashtra','telangana','andhra-pradesh'],krishna:['maharashtra','karnataka','telangana','andhra-pradesh'],
    narmada:['madhya-pradesh','maharashtra','gujarat'],tapi:['madhya-pradesh','maharashtra','gujarat'],kaveri:['karnataka','tamil-nadu'],
    mahanadi:['chhattisgarh','odisha'],gandak:['Bihar','UP'],kosi:['Bihar'],ghaghara:['UP','Bihar'],son:['madhya-pradesh','chhattisgarh','UP','jharkhand','Bihar'],gomati:['UP'],
    'in-jhelum':['jammu-kashmir'],'in-chenab':['himachal-pradesh','jammu-kashmir'],'in-ravi':['himachal-pradesh','punjab'],
    'in-beas':['himachal-pradesh','punjab'],'in-sutlej':['himachal-pradesh','punjab'],'in-chambal':['madhya-pradesh','rajasthan','UP'],
    'in-damodar':['jharkhand','west-bengal'],'in-mahananda':['west-bengal','Bihar'],'in-brahmani':['odisha'],
    'in-sabarmati':['rajasthan','gujarat'],'in-mahi':['madhya-pradesh','rajasthan','gujarat'],'in-luni':['rajasthan','gujarat'],
    'in-periyar-river':['kerala'],'in-palar':['karnataka','andhra-pradesh','tamil-nadu'],'in-ponnaiyar':['karnataka','tamil-nadu'],'in-zanskar-river':['ladakh']
  };
  const legacy={Bihar:['ganga','ghaghara','gandak','kosi','son','patna','bodhgaya','rajgir','nalanda','vaishali','vikramshila','kanwar','rohtasgarh','valmiki'],UP:['ganga','yamuna','gomati','ghaghara','son','lucknow','prayagraj','varanasi','sarnath','dudhwa','agra']};
  function insideRing(lon,lat,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if(((a[1]>lat)!==(b[1]>lat))&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function inside(f,g){const ps=g.type==='Polygon'?[g.coordinates]:g.coordinates;return ps.some(p=>insideRing(f.lon,f.lat,p[0])&&!p.slice(1).some(r=>insideRing(f.lon,f.lat,r)));}
  for(const p of N.profiles){
    const capital=p.capital.split(/[;/]/)[0].trim();
    let f=D.features.find(f=>f.region==='India'&&norm(f.name)===norm(capital));
    if(!f){f={id:'capital-'+p.id.toLowerCase(),name:capital,hi:p.capitalHi.split(/[;/]/)[0].trim(),lat:p.lat,lon:p.lon,area:p.name,areaHi:p.hi,topic:'state',region:'India',fact:`${p.capital} — ${p.name}. Read the state notes for rivers, wetlands, wildlife, minerals and physical geography.`,factHi:`${p.capitalHi} — ${p.hi}। नदियों, आर्द्रभूमियों, वन्यजीव, खनिज और भौतिक भूगोल के लिए राज्य के नोट्स पढ़ें।`,stateNoteSource:'profiles'};D.features.push(f);}
    p.capitalId=f.id;
    f.noteStateIds=[...new Set([...(f.noteStateIds||[]),p.id])];
    // Shared capitals are study connections even when outside the state's polygon.
  }
  for(const [id,s]of Object.entries(N.sources))if(!D.sources.some(source=>source.id==='state-notes-'+id))D.sources.push({id:'state-notes-'+id,filename:s.title,kind:'Official state-note reference',url:s.url});
  for(const f of D.features)if(f.stateNoteSource)f.source={id:'state-notes-'+f.stateNoteSource};
  const memberships=new Map();
  for(const p of N.profiles){
    const st=geometry.find(s=>s.name===p.name);
    memberships.set(p.id,new Set(D.features.filter(f=>f.region==='India'&&(
      f.noteStateIds?.includes(p.id)||riverRegions[f.id]?.includes(p.id)||legacy[p.id]?.includes(f.id)||
      f.area?.toLowerCase().includes(p.name.toLowerCase())||
      (st&&inside(f,st.geometry))
    )).map(f=>f.id)));
  }
  function featuresFor(id){const ids=memberships.get(id);return ids?D.features.filter(f=>ids.has(f.id)):[];}
  function relatedFeatures(p,row,category){
    if(category==='overview')return row.name==='Location'?D.features.filter(f=>f.id===p.capitalId):[];
    if(!['rivers','water','ramsar','parks','minerals','terrain'].includes(category))return [];
    const topic=({ramsar:'water',terrain:'mountains'})[category]||category;
    const parts=row.name.split(/\s+(?:and|&)\s+|[;,/]|—/).map(norm).filter(v=>v.length>3);
    const aliases={cauvery:'kaveri',tapi:'tapti',kanwar:'kabartal',tsomoriri:'tsomoriri'};
    return featuresFor(p.id).filter(f=>{
      if(f.topic!==topic)return false;
      const name=norm(f.name), short=norm(f.name.replace(/\b(?:river|lake|national park|wildlife sanctuary|wetland)\b/gi,''));
      return parts.some(part=>name===part||short===part||part===aliases[short]||(part.length>5&&(name.includes(part)||part.includes(name))));
    }).slice(0,3);
  }
  function sectionRows(p,id){return id==='ramsar'?p.ramsar:p.sections[id]||[];}
  function rowHtml(p,row,category,interactive){
    const maps=interactive?(row.featureId?D.features.filter(f=>f.id===row.featureId):relatedFeatures(p,row,category)):[];
    return `<article class="state-note-row"><h4>${esc(row.name)}<span lang="hi">${esc(row.hi)}</span></h4>${row.fact?`<p>${esc(row.fact)}</p><p class="state-note-hi" lang="hi">${esc(row.factHi)}</p>`:''}${maps.length?`<div class="note-map-links">${maps.map(f=>`<button type="button" data-note-place="${esc(f.id)}">Locate ${esc(f.name)} <span aria-hidden="true">↗</span></button>`).join('')}</div>`:''}</article>`;
  }
  function profileHtml(p,interactive=true){
    const source=N.sources;
    const count=Object.values(p.sections).flat().length+p.ramsar.length;
    return `<div class="state-study-heading"><div><div class="eyebrow">${p.ut?'UNION TERRITORY':'STATE'} STUDY NOTES · ENGLISH + हिंदी</div><h2 id="stateNotesTitle">${esc(p.name)} <span lang="hi">${esc(p.hi)}</span></h2><p>Short exam notes. Read a topic, connect it with the map, then practise.</p></div><div class="state-study-badges"><span>Capital <b>${esc(p.capital)}</b></span><span>Topics <b>8</b></span><span>Revision entries <b>${count}</b></span></div></div>
    <div class="state-capital-hi" lang="hi">राजधानी: <strong>${esc(p.capitalHi)}</strong></div>
    <nav class="state-mindmap" aria-label="${esc(p.name)} note topics">${N.categories.map(c=>`<${interactive?'button type="button"':'a'} ${interactive?'data-notes-section="'+c.id+'"':'href="#state-note-'+c.id+'"'} style="--note-accent:${c.colour}"><span class="state-topic-symbol" aria-hidden="true">${c.icon}</span><span><b>${c.en}</b><small lang="hi">${c.hi}</small></span><em>${sectionRows(p,c.id).length}</em></${interactive?'button':'a'}>`).join('')}</nav>
    ${interactive?`<div class="state-reading-tools"><label class="state-notes-search">Search these notes <input id="stateNotesSearch" type="search" placeholder="River, mineral, park · नदी, खनिज…" aria-label="Search ${esc(p.name)} notes"></label><div><button type="button" class="quiet small" data-notes-open="true">Expand all</button><button type="button" class="quiet small" data-notes-open="false">Collapse all</button><button type="button" class="quiet small" data-state-map="${esc(p.id)}">Explore state map ↑</button></div></div><p id="stateNotesEmpty" class="empty-inline" role="status" hidden>No matching notes. Try a place name or clear the search.</p>`:''}
    <div class="state-notes-grid">${N.categories.map(c=>{
      const entries=sectionRows(p,c.id),s=source[c.source];
      return `<details class="state-note-section" id="state-note-${c.id}" style="--note-accent:${c.colour}" open><summary><span aria-hidden="true">${c.icon}</span><span>${c.en}<small lang="hi">${c.hi}</small></span><em>${entries.length}</em></summary><div class="state-note-content">${c.id==='ramsar'?`<p class="state-note-date">Official list dated 25 October 2026; RSIS details reviewed 7 November 2026 · ${entries.length} ${entries.length===1?'site':'sites'} listed for this ${p.ut?'UT':'state'}.</p>${!entries.length?'<p>No Ramsar site is listed for this state / UT in this dated reference.</p><p lang="hi" class="state-note-hi">इस दिनांकित आधिकारिक सूची में इस राज्य / केंद्रशासित प्रदेश का कोई रामसर स्थल नहीं है।</p>':''}`:''}${entries.map(row=>rowHtml(p,row,c.id,interactive)).join('')}<p class="state-section-source"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)} ↗</a>${c.id==='parks'&&p.id==='assam'?` · <a href="${esc(source.assam.url)}" target="_blank" rel="noopener">Assam Economic Survey ↗</a>`:''}</p></div></details>`;
    }).join('')}</div><div class="state-study-footer"><p>Selected exam-relevant notes · reviewed 7 November 2026. Ramsar designations, national parks, sanctuaries and tiger reserves are different categories.</p>${interactive?`<a href="/Mapping/states/${slug(p)}/">Open reading page / share these notes ↗</a>`:'<a href="/Mapping/">Back to the interactive atlas ↗</a>'}</div>`;
  }
  let api=null,renderedRegion='',root=null;
  function setDirectory(open){const directory=document.getElementById('stateDirectory'),button=document.getElementById('allStatesBtn');directory.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)document.getElementById('stateDirectorySearch').focus();}
  function select(id){setDirectory(false);api.selectRegion(id,{learn:true});}
  function filterDirectory(value){const term=value.trim().toLocaleLowerCase();let count=0;for(const button of document.querySelectorAll('#stateDirectoryGrid [data-state-choice]')){const match=button.textContent.toLocaleLowerCase().includes(term)||button.dataset.search.includes(term);button.hidden=!match;if(match)count++;}document.getElementById('stateDirectoryStatus').textContent=`${count} of 36 states & UTs`;}
  function filterNotes(value){const term=value.trim().toLocaleLowerCase();let found=0;for(const section of root.querySelectorAll('.state-note-section')){let matches=0;for(const row of section.querySelectorAll('.state-note-row')){row.hidden=!!term&&!row.textContent.toLocaleLowerCase().includes(term);if(!row.hidden)matches++;}section.hidden=!!term&&!matches;if(!section.hidden){found++;if(term)section.open=true;}}document.getElementById('stateNotesEmpty').hidden=found>0;}
  function init(callbacks){
    api=callbacks;root=document.getElementById('stateStudy');
    const sorted=[...N.profiles].sort((a,b)=>Number(a.ut)-Number(b.ut)||a.name.localeCompare(b.name));
    const selectEl=document.getElementById('stateSelect');
    selectEl.innerHTML='<option value="India">All India · भारत</option>'+[false,true].map(ut=>`<optgroup label="${ut?'Union territories · केंद्रशासित प्रदेश':'States · राज्य'}">${sorted.filter(p=>p.ut===ut).map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · ${esc(p.hi)}</option>`).join('')}</optgroup>`).join('');
    selectEl.onchange=e=>{if(e.target.value==='India'){api.selectRegion('India',{learn:true});return;}select(e.target.value);};
    document.getElementById('stateDirectoryGrid').innerHTML=sorted.map(p=>`<button type="button" data-state-choice="${esc(p.id)}" data-search="${esc((p.capital+' '+p.capitalHi).toLocaleLowerCase())}"><b>${esc(p.name)}</b><span lang="hi">${esc(p.hi)}</span><small>${p.ut?'UT · ':''}${esc(p.capital)}</small></button>`).join('');
    document.getElementById('allStatesBtn').onclick=()=>setDirectory(document.getElementById('stateDirectory').hidden);
    document.getElementById('closeStateDirectory').onclick=()=>{setDirectory(false);document.getElementById('allStatesBtn').focus();};
    document.getElementById('stateDirectorySearch').oninput=e=>filterDirectory(e.target.value);
    document.getElementById('stateDirectory').addEventListener('keydown',e=>{if(e.key==='Escape'){setDirectory(false);document.getElementById('allStatesBtn').focus();}});
    document.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.stateChoice){select(b.dataset.stateChoice);return;}
      if(b.dataset.notesSection){const section=document.getElementById('state-note-'+b.dataset.notesSection);if(!section)return;const search=document.getElementById('stateNotesSearch');search.value='';filterNotes('');section.open=true;section.scrollIntoView({behavior:'smooth',block:'start'});section.querySelector('summary').focus({preventScroll:true});}
      if(b.dataset.notesOpen!==undefined)root.querySelectorAll('.state-note-section').forEach(section=>section.open=b.dataset.notesOpen==='true');
      if(b.dataset.notePlace){api.focusFeature(b.dataset.notePlace);document.getElementById('mapWrap').scrollIntoView({behavior:'smooth',block:'center'});}
      if(b.dataset.stateMap){document.getElementById('mapWrap').scrollIntoView({behavior:'smooth',block:'start'});document.getElementById('map').focus({preventScroll:true});}
    });
    filterDirectory('');
  }
  function render(state){
    if(!root)return;
    const p=profiles.get(state.region);root.hidden=!p||state.mode!=='learn';
    const selectEl=document.getElementById('stateSelect');selectEl.value=p?.id||'India';
    document.getElementById('stateSelector').hidden=state.region==='World';
    document.getElementById('allStatesBtn').classList.toggle('active',!!p);
    document.querySelectorAll('#stateDirectoryGrid [data-state-choice]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stateChoice===p?.id)));
    document.getElementById('backToStateNotes').hidden=!p||state.mode!=='learn';
    if(!p){renderedRegion='';return;}
    if(renderedRegion!==p.id){root.innerHTML=profileHtml(p);renderedRegion=p.id;document.getElementById('stateNotesTitle').tabIndex=-1;document.getElementById('stateNotesSearch').oninput=e=>filterNotes(e.target.value);}
  }
  window.MappingStateStudy={init,render,profiles,featuresFor,memberships,profileHtml,slug,esc,resolveRegion:value=>profiles.has(value)?value:N.profiles.find(p=>p.name===value)?.id||null};
})();


