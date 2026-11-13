(() => {
  'use strict';

  const byId = id => document.getElementById(id);
  const map = byId('bihar-map');
  const selector = byId('district-list');
  const notes = byId('notes');
  const featureList = byId('feature-list');
  const key = byId('map-key');
  const layers = [...document.querySelectorAll('[data-layer]')];
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

  function readHash() {
    const query = new URLSearchParams(location.hash.slice(1));
    const target = query.get('layer');
    const id = query.get('item');
    layer = Object.hasOwn(topics, target) ? target : 'districts';
    selected = entries(layer).has(id) ? id : '';
  }

  function pick(topic, id = '') {
    if (layer === topic && selected === id) return;
    const previous = layer;
    layer = topic;
    selected = id;
    const hash = new URLSearchParams({layer});
    if (id) hash.set('item', id);
    history.replaceState(history.state, '', '#' + hash);
    if (previous !== topic) track('bihar_map_layer', {map_layer:topic});
    if (id) track('bihar_map_select', {map_layer:topic, map_item:id});
    render();
  }

  function project(lon, lat) {
    return [25 + (lon - 83.32013078) * 167.03911, 24 + (27.52124872 - lat) * 185.554];
  }

  function makeMap() {
    const districtsGroup = svg('g', {'aria-hidden':'true'});
    const overlayGroup = svg('g', {'aria-hidden':'true'});
    const labels = svg('g', {'aria-hidden':'true'});
    map.append(districtsGroup, overlayGroup, labels);
    for (const [id, [x, y, d]] of Object.entries(shapes)) {
      const district = districts.get(id);
      const path = svg('path', {d, class:'district', 'data-district':id});
      path.style.setProperty('--division-color', 'var(--division-' + divisions.get(district[3])[3] + ')');
      const title = svg('title');
      const label = svg('text', {x, y, class:'map-label'});
      path.append(title);
      districtsGroup.append(path);
      labels.append(label);
      districtNodes.set(id, {path, title, label});
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
      group.append(line, svg('polyline', {points:path,class:'river-hit'}), label, title);
      overlayGroup.append(group);
      overlays.set(id, {group, accent:line, label, title, record:river});
    }
    for (const [id, place] of places) {
      const [x, y] = project(place[7], place[8]);
      const group = svg('g', {transform:'translate(' + x + ',' + y + ')', class:'pin', 'data-id':id, 'data-topic':place[5]});
      const title = svg('title');
      group.append(svg('circle', {r:15}), svg('circle', {r:7}), title);
      overlayGroup.append(group);
      overlays.set(id, {group, accent:group, title, record:place});
    }
  }

  function renderMap() {
    for (const [id, {path, title, label}] of districtNodes) {
      const district = districts.get(id);
      const isDivision = layer === 'divisions';
      const isSelected = isDivision ? district[3] === selected : layer === 'districts' && id === selected;
      path.classList.toggle('division', isDivision);
      path.classList.toggle('selected', isSelected);
      title.textContent = isDivision ? name(divisions.get(district[3])) : name(district);
      label.toggleAttribute('hidden', layer !== 'districts');
      label.textContent = name(district);
      label.classList.toggle('long', label.textContent.length > 11);
    }
    for (const {en, hi, label} of neighbors) label.textContent = tr(en, hi);
    for (const [id, {group, accent, title, label, record}] of overlays) {
      group.toggleAttribute('hidden', group.dataset.topic !== layer);
      accent.classList.toggle('selected', selected === id);
      title.textContent = name(record);
      if (label) label.textContent = name(record);
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
    for (const button of layers) button.setAttribute('aria-pressed', String(button.dataset.layer === layer));
    selector.value = layer === 'districts' ? selected : '';
    renderMap();
    renderNotes();
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
    const placeholder = node('option',tr('Select a district','जिला चुनें'));
    placeholder.value = '';
    selector.replaceChildren(placeholder);
    const sorted = [...districts.values()].sort((a,b) => name(a).localeCompare(name(b),tr('en','hi')));
    for (const district of sorted) {
      const option = node('option',name(district));
      option.value = district[0];
      selector.append(option);
    }
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
  map.addEventListener('pointerdown', event => {
    moved = false;
    if (view.zoom > 1 && event.isPrimary && event.button === 0) {
      drag = {id:event.pointerId,x:event.clientX,y:event.clientY,viewX:view.x,viewY:view.y};
    }
  });
  map.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!moved && Math.hypot(dx,dy) < 5) return;
    if (!moved) map.setPointerCapture(event.pointerId);
    moved = true;
    map.classList.add('dragging');
    const scale = 880 / view.zoom / map.clientWidth;
    setView(drag.viewX - dx * scale,drag.viewY - dy * scale,view.zoom);
  });
  function endDrag(event) {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    map.classList.remove('dragging');
  }
  map.addEventListener('pointerup',endDrag);
  map.addEventListener('pointercancel',endDrag);
  map.addEventListener('pointerleave',event => { if (!moved) endDrag(event); });
  map.addEventListener('click', event => {
    if (moved) return;
    const item = event.target.closest('[data-id]');
    const district = event.target.closest('[data-district]');
    if (item) pick(layer,item.dataset.id);
    else if (district && layer === 'divisions') pick(layer,districts.get(district.dataset.district)[3]);
    else if (district) pick('districts',district.dataset.district);
  });

  for (const button of layers) button.addEventListener('click',() => pick(button.dataset.layer));
  selector.addEventListener('change',() => pick('districts',selector.value));
  document.querySelector('.notes').addEventListener('click', event => {
    const button = event.target.closest('[data-pick]');
    if (!button) return;
    pick(button.dataset.topic,button.dataset.pick);
    const next = [...featureList.querySelectorAll('[data-pick]')].find(item => item.dataset.pick === button.dataset.pick);
    (next || byId('notes-title')).focus({preventScroll:true});
  });
  window.addEventListener('hashchange',() => { readHash(); render(); });

  makeMap();
  fit();
  readHash();
  useHindi(window.efpIsHindiOn?.() || false);
})();
