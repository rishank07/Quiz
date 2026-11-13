(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const map = byId('bihar-map');
  const selector = byId('layer-list');
  const notes = byId('notes');
  const featureList = byId('feature-list');
  const key = byId('map-key');
  const modes = [...document.querySelectorAll('[data-mode]')];
  const search = byId('place-search');
  const results = byId('search-results');
  const panel = byId('study-panel');
  const mapCard = byId('map-card');
  const prompt = byId('locate-prompt');
  const expandButton = byId('expand-map');
  const language = byId('language');
  const data = window.BIHAR_GK;
  const shapes = window.BIHAR_DISTRICTS;
  let hindi = false;
  const tr = (en, hi) => hindi ? hi : en;
  const name = record => tr(record[1], record[2]);

  const topics = {
    districts: ['Bihar at a glance','बिहार एक नज़र में','Select a district to read its headquarters, division and exam facts.','मुख्यालय, प्रमंडल और परीक्षा के लिए प्रमुख तथ्य देखने के लिए जिला चुनें।'],
    divisions: ['Administrative divisions','प्रशासनिक प्रमंडल','Each color represents a division.','हर रंग एक प्रमंडल दिखाता है।'],
    rivers: ['Rivers of Bihar','बिहार की नदियाँ','Dashed lines show approximate tributary courses.','टूटी रेखाएँ सहायक नदियों के लगभग मार्ग दिखाती हैं।'],
    geography: ['Landforms and irrigation','स्थलरूप और सिंचाई','Explore the southern hills, waterfalls and river projects.','दक्षिण की पहाड़ियाँ, जलप्रपात और नदी परियोजनाएँ देखें।'],
    history: ['History and heritage','इतिहास और विरासत','Explore ancient sites, medieval landmarks and the freedom movement.','प्राचीन स्थल, मध्यकालीन धरोहर और स्वतंत्रता आंदोलन से जुड़े स्थान देखें।'],
    nature: ['Wildlife and wetlands','वन्यजीव और आर्द्रभूमि','Explore protected areas and selected wetlands.','संरक्षित क्षेत्र और चुनिंदा आर्द्रभूमियाँ देखें।'],
    culture: ['Fairs and culture','मेले और संस्कृति','Explore places associated with fairs, temples and regional arts.','मेलों, मंदिरों और क्षेत्रीय कलाओं से जुड़े स्थान देखें।'],
    economy: ['Farms and industry','कृषि और उद्योग','Connect crops, crafts, industry and minerals with districts.','फसलों, शिल्प, उद्योग और खनिजों को उनके जिलों से जोड़ें।']
  };

  const districts = new Map((data?.districts || []).map(district => [String(district[0]), district]));
  const divisions = new Map((data?.divisions || []).map((division, color) => [division[0], [...division, color]]));
  const rivers = new Map((data?.rivers || []).map(river => [river[0], river]));
  const places = new Map((data?.places || []).map(([id, topic, district, lon, lat, en, hi, factEn, factHi]) =>
    [id, [id, en, hi, factEn, factHi, topic, String(district), lon, lat]]
  ));
  const districtNodes = new Map();
  const overlays = new Map();
  const neighbors = [];
  const view = {x:0, y:0, zoom:1};
  let layer = 'districts';
  let selected = '';
  let mode = 'explore';
  let session = null;
  let expanded = false;

  function node(tag, label) {
    const el = document.createElement(tag);
    if (label) el.textContent = label;
    return el;
  }

  function svg(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    return el;
  }

  function track(event, values) {
    if (typeof window.gtag === 'function' && !window['ga-disable-G-Q1WNRY8ECV']) {
      window.gtag('event', event, {section:'bihar_special', ...values});
    }
  }

  function entries(topic) {
    if (topic === 'districts') return districts;
    if (topic === 'divisions') return divisions;
    if (topic === 'rivers') return rivers;
    return new Map([...places].filter(([, place]) => place[5] === topic));
  }

  function shuffled(values) {
    const items = [...values];
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function startSession() {
    const deck = shuffled(entries(layer).keys()).slice(0, 10);
    session = {deck, index:0, score:0, answer:null, options:[]};
    prepareQuestion();
  }

  function prepareQuestion() {
    session.answer = null;
    const target = session.deck[session.index];
    const pool = entries(layer);
    session.options = shuffled([target, ...shuffled([...pool.keys()].filter(id => id !== target)).slice(0, 3)]);
  }

  function finishAnswer(answer) {
    if (!session || session.answer !== null || session.index >= session.deck.length) return;
    session.answer = answer;
    const correct = answer === session.deck[session.index];
    if (correct) session.score++;
    track('bihar_map_answer', {map_layer:layer, map_mode:mode, correct});
    render();
    if (mode === 'practice') notes.querySelector('.quiz-feedback').focus({preventScroll:true});
  }

  function advance() {
    if (session.index >= session.deck.length) startSession();
    else if (session.answer !== null && ++session.index < session.deck.length) prepareQuestion();
    fit();
    render();
    if (mode === 'locate' && session.index < session.deck.length) map.focus({preventScroll:true});
    else byId('notes-title').focus({preventScroll:true});
  }

  function readHash() {
    const query = new URLSearchParams(location.hash.slice(1));
    const target = query.get('layer');
    const id = query.get('item');
    layer = Object.hasOwn(topics, target) ? target : 'districts';
    selected = entries(layer).has(id) ? id : '';
  }

  function saveSelection() {
    const hash = new URLSearchParams({layer});
    if (selected) hash.set('item', selected);
    history.replaceState(history.state, '', '#' + hash);
  }

  function pick(topic, id = '') {
    if (layer === topic && selected === id) return;
    const previous = layer;
    layer = topic;
    selected = id;
    saveSelection();
    if (previous !== topic) track('bihar_map_layer', {map_layer:topic});
    if (id) track('bihar_map_select', {map_layer:topic, map_item:id});
    if (mode !== 'explore') startSession();
    render();
  }

  function project(lon, lat) {
    return [25 + (lon - 83.32013078) * 167.03911, 24 + (27.52124872 - lat) * 185.554];
  }

  function makeMap() {
    const districtsGroup = svg('g');
    const overlayGroup = svg('g');
    const labels = svg('g', {'aria-hidden':'true'});
    map.append(districtsGroup, overlayGroup, labels);
    for (const [id, [x, y, d]] of Object.entries(shapes)) {
      const district = districts.get(id);
      const path = svg('path', {d, class:'district', 'data-district':id, role:'button'});
      path.style.setProperty('--division-color', 'var(--division-' + divisions.get(district[3])[3] + ')');
      const title = svg('title');
      const label = svg('text', {x, y, class:'map-label'});
      path.append(title);
      districtsGroup.append(path);
      labels.append(label);
      districtNodes.set(id, {path, title, label, x, y});
    }
    for (const [en, hi, x, y] of [
      ['Nepal','नेपाल',485,110], ['Uttar Pradesh','उत्तर प्रदेश',102,191],
      ['Jharkhand','झारखंड',486,613], ['West Bengal','पश्चिम बंगाल',810,456]
    ]) {
      const label = svg('text', {x, y, class:'map-label neighbor'});
      labels.append(label);
      neighbors.push({en, hi, label});
    }
    const labelPositions = {
      ganga:[489,367], ghaghara:[119,283], gandak:[232,262], 'burhi-gandak':[389,273],
      bagmati:[389,188], kamla:[516,210], kosi:[604,305], mahananda:[782,350],
      son:[201,459], punpun:[287,485]
    };
    for (const [id, river] of rivers) {
      const points = id === 'ganga' ? window.BIHAR_GANGA : river[5];
      const path = points.map(([lon, lat]) => project(lon, lat).map(v => v.toFixed(1)).join(',')).join(' ');
      const group = svg('g', {'data-id':id,'data-topic':'rivers'});
      const line = svg('polyline', {points:path, class:'river-line' + (id === 'ganga' ? '' : ' schematic')});
      const [x, y] = labelPositions[id];
      const label = svg('text', {x, y, class:'map-label river-label'});
      const title = svg('title');
      const hit = svg('polyline', {points:path,class:'river-hit',role:'button'});
      group.append(line, hit, label, title);
      overlayGroup.append(group);
      overlays.set(id, {group, control:hit, accent:line, label, title, record:river, x, y});
    }
    for (const [id, place] of places) {
      const [x, y] = project(place[7], place[8]);
      const group = svg('g', {transform:'translate(' + x + ',' + y + ')', class:'pin', 'data-id':id, 'data-topic':place[5],role:'button'});
      const title = svg('title');
      const label = svg('text', {x, y:y-15, class:'map-label pin-label','data-id':id});
      group.append(svg('circle', {r:15}), svg('circle', {r:7}), title);
      overlayGroup.append(group);
      labels.append(label);
      overlays.set(id, {group, control:group, accent:group, title, label, record:place, x, y:y-15});
    }
  }

  function renderMap() {
    const target = session?.deck[session.index];
    const revealed = mode === 'explore' || (session && session.answer !== null);
    const highlight = mode === 'explore' ? selected : (mode === 'practice' || revealed ? target : '');
    const canLocate = mode === 'locate' && target && session.answer === null;
    const candidates = [];
    let index = 0;
    for (const [id, {path, title, label, x, y}] of districtNodes) {
      const district = districts.get(id);
      const isDivision = layer === 'divisions';
      const mapId = isDivision ? district[3] : id;
      const isSelected = (isDivision || layer === 'districts') && mapId === highlight;
      const interactive = mode === 'explore' || canLocate && (isDivision || layer === 'districts');
      const itemName = isDivision ? name(divisions.get(district[3])) : name(district);
      path.classList.toggle('division', isDivision);
      path.classList.toggle('selected', isSelected);
      path.classList.toggle('incorrect', mode === 'locate' && (isDivision || layer === 'districts') && !isSelected && session?.answer === mapId);
      path.setAttribute('tabindex', interactive ? '0' : '-1');
      path.setAttribute('aria-hidden', String(!interactive));
      path.setAttribute('aria-label', revealed ? itemName : tr('Map area ', 'मानचित्र क्षेत्र ') + ++index);
      title.textContent = revealed ? itemName : '';
      label.textContent = name(district);
      label.classList.toggle('selected', isSelected);
      label.toggleAttribute('hidden', true);
      if ((mode === 'explore' && layer === 'districts') || (revealed && isSelected && !isDivision)) candidates.push({label,x,y,isSelected});
    }
    for (const {en, hi, label} of neighbors) label.textContent = tr(en, hi);
    for (const [id, {group, control, accent, title, label, record, x, y}] of overlays) {
      const active = group.dataset.topic === layer;
      const isSelected = active && id === highlight;
      const interactive = active && (mode === 'explore' || canLocate);
      group.toggleAttribute('hidden', !active);
      control.setAttribute('tabindex', interactive ? '0' : '-1');
      control.setAttribute('aria-hidden', String(!interactive));
      control.setAttribute('aria-label', revealed ? name(record) : tr('Map feature ', 'मानचित्र स्थल ') + ++index);
      accent.classList.toggle('selected', isSelected);
      accent.classList.toggle('incorrect', mode === 'locate' && active && !isSelected && session?.answer === id);
      title.textContent = revealed ? name(record) : '';
      label.textContent = name(record);
      label.classList.toggle('selected', isSelected);
      label.toggleAttribute('hidden', true);
      if (active && (mode === 'explore' || revealed && isSelected)) candidates.push({label,x,y,isSelected});
    }
    showLabels(candidates);
  }

  function showLabels(candidates) {
    const bounds = map.getBoundingClientRect();
    const unit = Math.max(880 / (bounds.width || 880), 649 / (bounds.height || 649)) / view.zoom;
    const size = Math.max(5, 11 * unit);
    const occupied = [];
    candidates.sort((a,b) => Number(b.isSelected) - Number(a.isSelected));
    for (const {label,x,y,isSelected} of candidates) {
      if (x < view.x || y < view.y || x > view.x + 880/view.zoom || y > view.y + 649/view.zoom) continue;
      label.style.setProperty('--label-size', size + 'px');
      label.toggleAttribute('hidden', false);
      const width = label.getComputedTextLength() || size * label.textContent.length * .6;
      const box = {left:x-width/2-3*unit,right:x+width/2+3*unit,top:y-size*.7,bottom:y+size*.7};
      const fits = box.left >= view.x && box.right <= view.x + 880/view.zoom;
      const overlaps = occupied.some(b => b.left < box.right && b.right > box.left && b.top < box.bottom && b.bottom > box.top);
      if (!isSelected && (!fits || overlaps)) label.toggleAttribute('hidden', true);
      else occupied.push(box);
    }
  }

  function listButtons(collection, topic, heading, parent) {
    const list = node('ul');
    list.className = 'note-list';
    for (const item of collection) {
      const li = node('li');
      const button = node('button', name(item));
      button.type = 'button';
      button.dataset.pick = String(item[0]);
      button.dataset.topic = topic;
      button.setAttribute('aria-pressed', String(layer === topic && selected === String(item[0])));
      if (topic === 'divisions') {
        const swatch = node('span');
        swatch.className = 'division-swatch';
        swatch.setAttribute('aria-hidden','true');
        swatch.style.setProperty('--division-color','var(--division-' + item[3] + ')');
        button.prepend(swatch);
      }
      li.append(button);
      list.append(li);
    }
    parent.append(node('h3', heading), list);
  }

  function districtNotes(district) {
    const facts = node('dl');
    const headquarters = district.length > 4 ? tr(district[4], district[5]) : name(district);
    facts.append(node('dt',tr('Headquarters','मुख्यालय')), node('dd',headquarters),
      node('dt',tr('Division','प्रमंडल')), node('dd',name(divisions.get(district[3]))));
    notes.append(facts);
    const fact = data.districtFacts[district[0]];
    if (fact) notes.append(node('p',tr(...fact)));
    const found = [...places.values()].filter(place => place[6] === String(district[0]));
    if (!found.length) return;
    const list = node('ul');
    for (const place of found) {
      const li = node('li');
      li.append(node('strong',name(place)), ' — ' + tr(place[3], place[4]));
      list.append(li);
    }
    notes.append(node('h3',tr('Key places and facts','प्रमुख स्थल और तथ्य')), list);
  }

  function detail(record) {
    if (layer === 'districts') return districtNotes(record);
    if (layer === 'divisions') {
      const names = data.districts.filter(district => district[3] === record[0]).map(name);
      notes.append(node('p',names.join(' · ')));
    } else notes.append(node('p',tr(record[3],record[4])));
  }

  function action(label, handler) {
    const button = node('button',label);
    button.type = 'button';
    button.className = 'study-action';
    button.addEventListener('click',handler);
    return button;
  }

  function renderSession() {
    const collection = entries(layer);
    const target = session.deck[session.index];
    const finished = !target;
    const answered = session.answer !== null;
    const correct = session.answer === target;
    const heading = node('h2', finished ? tr('Session complete','अभ्यास पूरा') : mode === 'locate'
      ? tr('Locate on the map','मानचित्र पर खोजें') : tr('Identify the highlighted area or feature','चिह्नित क्षेत्र या स्थल पहचानें'));
    heading.id = 'notes-title';
    heading.tabIndex = -1;
    const score = node('p', tr('Score','स्कोर') + ' ' + session.score + ' / ' + session.deck.length);
    score.className = 'quiz-score';
    notes.replaceChildren(heading,score);
    featureList.hidden = true;
    prompt.replaceChildren();
    prompt.hidden = mode !== 'locate' || finished;
    const nextLabel = finished ? tr('Play again','फिर से अभ्यास करें') : tr('Next question','अगला प्रश्न');
    if (finished) {
      notes.append(action(nextLabel,advance));
      key.textContent = tr('Session complete','अभ्यास पूरा');
      return;
    }
    const record = collection.get(target);
    key.textContent = tr('Question','प्रश्न') + ' ' + (session.index + 1) + ' / ' + session.deck.length;
    if (mode === 'locate') {
      prompt.append(tr('Find ', 'खोजें '),node('strong',name(record)));
      notes.append(node('p',tr('Tap the area, river or marker on the map.','मानचित्र पर क्षेत्र, नदी या चिह्न चुनें।')));
    } else {
      const choices = node('ul');
      choices.className = 'note-list';
      for (const id of session.options) {
        const li = node('li');
        const button = node('button',name(collection.get(id)));
        button.type = 'button';
        button.disabled = answered;
        if (answered && id === target) button.className = 'answer-correct';
        if (answered && id === session.answer && !correct) button.className = 'answer-wrong';
        button.addEventListener('click',() => finishAnswer(id));
        li.append(button);
        choices.append(li);
      }
      notes.append(choices);
    }
    if (!answered) return;
    const feedback = correct ? tr('Correct','सही उत्तर') : tr('Answer','उत्तर') + ' · ' + name(record);
    const box = node('p',feedback);
    box.className = 'quiz-feedback ' + (correct ? 'correct' : 'wrong');
    box.tabIndex = -1;
    notes.append(box);
    detail(record);
    notes.append(action(nextLabel,advance));
    if (mode === 'locate') prompt.replaceChildren(node('strong',feedback), action(nextLabel,advance));
  }

  const searchEntries = Object.keys(topics).flatMap(topic =>
    [...entries(topic)].map(([id, item]) => ({topic,id,item})));
  function renderSearch() {
    const query = search.value.toLocaleLowerCase().trim();
    results.replaceChildren();
    results.hidden = !query;
    if (!query) return;
    const matches = searchEntries.filter(({topic,item}) =>
      (topic === 'districts' ? [item[1],item[2],item[4],item[5]] : [item[1],item[2]])
        .some(value => value?.toLocaleLowerCase().includes(query)));
    for (const {topic,id,item} of matches.slice(0, 12)) {
      const li = node('li');
      const button = node('button',name(item) + ' · ' + tr(topics[topic][0],topics[topic][1]));
      button.type = 'button';
      button.addEventListener('click',() => {
        search.value = '';
        renderSearch();
        pick(topic,id);
        byId('notes-title').focus({preventScroll:true});
      });
      li.append(button);
      results.append(li);
    }
    if (!matches.length) results.append(node('li',tr('No matching places','कोई स्थान नहीं मिला')));
  }

  function renderNotes() {
    const collection = entries(layer);
    const record = collection.get(selected);
    const heading = node('h2', record ? name(record) : tr(topics[layer][0], topics[layer][1]));
    heading.id = 'notes-title';
    heading.tabIndex = -1;
    notes.replaceChildren(heading);
    featureList.replaceChildren();
    featureList.hidden = layer === 'districts';
    key.textContent = record ? name(record) : tr(topics[layer][2], topics[layer][3]);

    if (layer === 'districts') {
      if (record) {
        districtNotes(record);
      } else {
        const overview = [
          ['Patna is the capital. Bihar has 38 districts and nine divisions.','पटना राजधानी है। बिहार में 38 जिले और नौ प्रमंडल हैं।'],
          ['Bihar Day is observed on 22 March, the date Bihar and Orissa became a province in 1912. Jharkhand was formed from southern Bihar in 2000.','22 मार्च 1912 को बिहार और उड़ीसा प्रांत की स्थापना हुई। इसी तारीख को बिहार दिवस मनाया जाता है। 2000 में दक्षिणी बिहार से झारखंड बना।'],
          ['The Ganga flows between the northern and southern plains. Bihar borders Nepal, Uttar Pradesh, Jharkhand and West Bengal.','गंगा उत्तरी और दक्षिणी मैदानों के बीच बहती है। बिहार की सीमा नेपाल, उत्तर प्रदेश, झारखंड और पश्चिम बंगाल से लगती है।']
        ];
        notes.append(...overview.map(text => node('p',tr(...text))));
        const symbols = node('dl');
        for (const [en, hi, value, hindiValue] of [
          ['State bird','राज्य पक्षी','House sparrow','गौरैया'],
          ['State animal','राज्य पशु','Gaur','गौर'],
          ['State tree','राज्य वृक्ष','Peepal','पीपल'],
          ['State flower','राज्य पुष्प','Marigold','गेंदा']
        ]) symbols.append(node('dt',tr(en,hi)),node('dd',tr(value,hindiValue)));
        notes.append(node('h3',tr('State symbols','राज्य प्रतीक')),symbols);
      }
      const directory = node('details');
      directory.append(node('summary',tr('District directory','जिलों की सूची')));
      const sorted = [...collection.values()].sort((a,b) => name(a).localeCompare(name(b),tr('en','hi')));
      listButtons(sorted,'districts',tr('Districts','जिले'),directory);
      featureList.append(directory);
      featureList.hidden = false;
      return;
    }
    if (layer === 'divisions' && record) {
      const members = data.districts.filter(district => district[3] === record[0]);
      listButtons(members,'districts',tr('Districts in this division','इस प्रमंडल के जिले'),notes);
    } else {
      notes.append(node('p', record ? tr(record[3],record[4]) : tr(topics[layer][2],topics[layer][3])));
      if (record?.[6]) listButtons([districts.get(record[6])],'districts',tr('District','जिला'),notes);
    }
    listButtons(collection.values(),layer,tr('On this map','मानचित्र पर'),featureList);
  }

  function render() {
    if (!data || !shapes || !window.BIHAR_GANGA) return;
    for (const button of modes) button.setAttribute('aria-pressed',String(button.dataset.mode === mode));
    byId('explore-controls').hidden = mode !== 'explore';
    selector.value = layer;
    renderMap();
    if (mode === 'explore') {
      prompt.hidden = true;
      renderNotes();
    } else renderSession();
  }

  function useHindi(on) {
    hindi = on;
    document.documentElement.lang = tr('en','hi');
    language.textContent = tr('हिंदी','English');
    language.lang = tr('hi','en');
    language.setAttribute('aria-label',tr('Read in Hindi','अंग्रेज़ी में पढ़ें'));
    for (const el of document.querySelectorAll('[data-en][data-hi]')) el.textContent = tr(el.dataset.en,el.dataset.hi);
    for (const el of document.querySelectorAll('[data-en-aria][data-hi-aria]')) {
      el.setAttribute('aria-label',tr(el.dataset.enAria,el.dataset.hiAria));
    }
    search.placeholder = tr('Search districts, rivers and places','जिले, नदियाँ और स्थल खोजें');
    expandButton.setAttribute('aria-label',expanded ? tr('Close expanded map','बड़ा मानचित्र बंद करें') : tr('Expand map','मानचित्र बड़ा करें'));
    renderSearch();
    render();
  }

  language.addEventListener('click', () => {
    track('bihar_map_language', {map_language:tr('hi','en')});
    if (typeof window.toggleHindiTranslate === 'function') window.toggleHindiTranslate();
    else useHindi(!hindi);
  });
  document.addEventListener('efp-translate-state', event => {
    if (event.detail.hindi !== hindi) useHindi(event.detail.hindi);
  });

  if (!data || !shapes || !window.BIHAR_GANGA) {
    byId('map-error').hidden = false;
    selector.disabled = true;
    document.querySelectorAll('.map-card button').forEach(button => { button.disabled = true; });
    return;
  }

  function setView(x, y, zoom) {
    const width = 880 / zoom;
    const height = 649 / zoom;
    view.x = Math.max(0,Math.min(880 - width,x));
    view.y = Math.max(0,Math.min(649 - height,y));
    view.zoom = zoom;
    map.setAttribute('viewBox',[view.x,view.y,width,height].join(' '));
    map.classList.toggle('zoomed',zoom > 1);
    byId('zoom-in').disabled = zoom >= 4;
    byId('zoom-out').disabled = zoom <= 1;
    renderMap();
  }

  function zoomBy(factor) {
    const zoom = Math.min(4,Math.max(1,view.zoom * factor));
    const offset = (1 / view.zoom - 1 / zoom) / 2;
    setView(view.x + 880 * offset,view.y + 649 * offset,zoom);
  }

  const fit = () => setView(0,0,1);
  byId('zoom-in').addEventListener('click',() => zoomBy(1.4));
  byId('zoom-out').addEventListener('click',() => zoomBy(1 / 1.4));
  byId('reset-map').addEventListener('click',fit);
  map.addEventListener('keydown', event => {
    if (event.target !== map && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      pickFromMap(event.target);
      return;
    }
    const offsets = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if (event.key === '+' || event.key === '=') zoomBy(1.4);
    else if (event.key === '-') zoomBy(1 / 1.4);
    else if (event.key === 'Home') fit();
    else if (view.zoom > 1 && offsets[event.key]) {
      const [dx,dy] = offsets[event.key];
      setView(view.x + dx * 60 / view.zoom,view.y + dy * 60 / view.zoom,view.zoom);
    } else return;
    event.preventDefault();
  });

  let drag;
  let moved = false;
  let pinch = null;
  const touches = new Map();
  map.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && (expanded || view.zoom > 1)) {
      touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (touches.size === 2) {
        const [a,b] = touches.values();
        pinch = {distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:view.zoom};
        drag = null;
        moved = true;
        for (const id of touches.keys()) map.setPointerCapture(id);
        return;
      }
    }
    moved = false;
    if (view.zoom > 1 && event.isPrimary && event.button === 0) {
      drag = {id:event.pointerId,x:event.clientX,y:event.clientY,viewX:view.x,viewY:view.y};
    }
  });
  map.addEventListener('pointermove', event => {
    if (touches.has(event.pointerId)) touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pinch && touches.size === 2) {
      const [a,b] = touches.values();
      const zoom = pinch.zoom * Math.hypot(a.x-b.x,a.y-b.y) / Math.max(1,pinch.distance);
      zoomBy(zoom / view.zoom);
      return;
    }
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!moved && Math.hypot(dx,dy) < 5) return;
    if (!moved) map.setPointerCapture(event.pointerId);
    moved = true;
    map.classList.add('dragging');
    const scale = Math.max(880 / map.clientWidth, 649 / map.clientHeight) / view.zoom;
    setView(drag.viewX - dx * scale,drag.viewY - dy * scale,view.zoom);
  });
  function endDrag(event) {
    touches.delete(event.pointerId);
    if (touches.size < 2) pinch = null;
    if (drag?.id !== event.pointerId) return;
    drag = null;
    map.classList.remove('dragging');
  }
  map.addEventListener('pointerup',endDrag);
  map.addEventListener('pointercancel',endDrag);
  map.addEventListener('pointerleave',event => { if (!moved) endDrag(event); });
  function pickFromMap(element) {
    const item = element.closest('[data-id]');
    const district = element.closest('[data-district]');
    const topic = district && layer !== 'divisions' ? 'districts' : layer;
    const id = item?.dataset.id || (district && (layer === 'divisions'
      ? districts.get(district.dataset.district)[3] : district.dataset.district));
    if (!id) return;
    if (mode === 'locate' && topic === layer) finishAnswer(id);
    if (mode === 'explore') pick(topic,id);
  }
  map.addEventListener('click', event => { if (!moved) pickFromMap(event.target); });

  for (const button of modes) button.addEventListener('click',() => {
    const next = button.dataset.mode;
    if (next === mode) return;
    mode = next;
    if (mode === 'explore') session = null;
    else startSession();
    fit();
    track('bihar_map_mode',{map_mode:mode,map_layer:layer});
    render();
  });
  selector.addEventListener('change',() => { fit(); pick(selector.value); });
  search.addEventListener('input',renderSearch);
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-pick]');
    if (!button) return;
    const wasDirectory = !!button.closest('details');
    pick(button.dataset.topic,button.dataset.pick);
    if (wasDirectory) featureList.querySelector('details').open = true;
    const next = [...featureList.querySelectorAll('[data-pick]')].find(item => item.dataset.pick === button.dataset.pick && !item.closest('details:not([open])'));
    (next || byId('notes-title')).focus({preventScroll:true});
  });

  function showExpanded(open) {
    expanded = open;
    mapCard.classList.toggle('expanded',open);
    document.body.classList.toggle('atlas-expanded',open);
    expandButton.textContent = open ? '×' : '⛶';
    expandButton.setAttribute('aria-label',open ? tr('Close expanded map','बड़ा मानचित्र बंद करें') : tr('Expand map','मानचित्र बड़ा करें'));
    expandButton.setAttribute('aria-expanded',String(open));
    for (const part of document.querySelectorAll('.atlas-header, .atlas-main > h1, .sources, #study-panel')) part.inert = open;
    requestAnimationFrame(renderMap);
  }
  expandButton.addEventListener('click',() => {
    if (expanded) history.back();
    else {
      history.pushState({...history.state,biharMapExpanded:true},'',location.href);
      showExpanded(true);
    }
  });
  window.addEventListener('popstate',() => {
    const open = Boolean(history.state?.biharMapExpanded);
    if (expanded && !open) {
      saveSelection();
      expandButton.focus({preventScroll:true});
    }
    if (open !== expanded) showExpanded(open);
  });
  document.addEventListener('keydown',event => {
    if (event.key === 'Escape' && expanded) history.back();
  });
  byId('jump-notes').addEventListener('click',() => {
    if (expanded) {
      window.addEventListener('popstate',() => panel.scrollIntoView({block:'start'}),{once:true});
      history.back();
    } else panel.scrollIntoView({block:'start'});
  });
  window.addEventListener('hashchange',() => {
    const previous = layer;
    readHash();
    if (mode !== 'explore' && previous !== layer) startSession();
    render();
  });
  new ResizeObserver(() => renderMap()).observe(map);

  makeMap();
  fit();
  readHash();
  if (history.state?.biharMapExpanded) showExpanded(true);
  useHindi(window.efpIsHindiOn?.() || false);
})();
