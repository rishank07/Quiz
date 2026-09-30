const fs = require('fs');

const file = 'Original Practice/History_Complete_Practice.html';
const src = fs.readFileSync(file, 'utf8');

const startTag = '<script id="master-data" type="application/json">';
const endTag = '</script>';
const start = src.indexOf(startTag);
const end = src.indexOf(endTag, start + startTag.length);
if (start < 0 || end < 0) throw new Error('master-data not found');

const data = JSON.parse(src.slice(start + startTag.length, end).trim());
const anc = data['Ancient History'];

function getQ(prefix, n) {
  const found = Object.entries(anc).find(([k]) => k.startsWith(prefix));
  if (!found) throw new Error('Missing chapter: ' + prefix);
  let i = 0;
  for (const sec of found[1]) {
    for (const q of (sec.questions || [])) {
      i++;
      if (i === n) return q;
    }
  }
  throw new Error('Missing question: ' + prefix + ' #' + n);
}

const changed = [];
function setExp(p,n,en,hi) {
  getQ(p,n).exp = {en,hi};
  changed.push(p+'#'+n+':exp');
}
function setAnswerAndOption(p,n,en,hi) {
  const q = getQ(p,n);
  const oldEn = q.a.en, oldHi = q.a.hi;
  q.a = {en,hi};
  let replaced = false;
  for (const o of q.o || []) {
    if (o.en === oldEn || o.hi === oldHi) {
      o.en = en; o.hi = hi; replaced = true; break;
    }
  }
  if (!replaced) throw new Error('Old correct option not found: '+p+' #'+n);
  changed.push(p+'#'+n+':answer');
}
function setQuestion(p,n,en,hi) {
  getQ(p,n).q = {en,hi};
  changed.push(p+'#'+n+':question');
}

// Jainism: first disciple / Ganadhara
for (const n of [30,114]) {
  setAnswerAndOption(
    '5. Jainism', n,
    'Indrabhuti Gautama (Gautama Swami)',
    'इंद्रभूति गौतम (गौतम स्वामी)'
  );
  setExp(
    '5. Jainism', n,
    "Indrabhuti Gautama (Gautama Swami) was the eldest and first prominent Ganadhara (chief disciple) of Mahavira. Jamali was Mahavira's son-in-law and is associated with the first schism, not with being the first Ganadhara.",
    "इंद्रभूति गौतम (गौतम स्वामी) महावीर के सबसे वरिष्ठ और प्रथम प्रमुख गणधर (मुख्य शिष्य) थे। जमाली महावीर के दामाद थे और जैन परंपरा में पहले मतभेद/विभाजन से जुड़े हैं, प्रथम गणधर नहीं।"
  );
}

// Jain councils: remove overstatement about all 12 Angas and an immediate final sect split
setAnswerAndOption(
  '5. Jainism', 54,
  'Compilation of 11 Angas; the 12th Anga was lost',
  '11 अंगों का संकलन; 12वाँ अंग लुप्त हो गया'
);
setExp(
  '5. Jainism', 54,
  "At the Pataliputra council under Sthulabhadra, the surviving Jain teachings were collected by recollection. Shvetambara tradition holds that eleven Angas could be compiled, while the twelfth, Drishtivada, was lost; the Digambara-Shvetambara separation developed gradually rather than being completed at this single council.",
  "स्थूलभद्र के नेतृत्व में पाटलिपुत्र परिषद में स्मृति के आधार पर उपलब्ध जैन शिक्षाओं को संकलित किया गया। श्वेतांबर परंपरा के अनुसार 11 अंग संकलित हो सके, जबकि 12वाँ दृष्टिवाद लुप्त हो गया; दिगंबर-श्वेतांबर विभाजन एक ही परिषद में अचानक पूरा नहीं हुआ, बल्कि धीरे-धीरे विकसित हुआ।"
);
setAnswerAndOption(
  '5. Jainism', 58,
  'Final redaction and writing of the available Jain Agamas',
  'उपलब्ध जैन आगमों का अंतिम संपादन और लेखन'
);
setExp(
  '5. Jainism', 58,
  "At Vallabhi under Devardhigani Kshamashramana, the available Shvetambara Jain canonical texts were collected, standardized and committed to writing. Exact lists and council numbering vary across Jain traditions.",
  "वल्लभी में देवर्धिगणि क्षमाश्रमण के नेतृत्व में उपलब्ध श्वेतांबर जैन आगमों को एकत्र कर व्यवस्थित किया गया और लिखित रूप दिया गया। अलग-अलग जैन परंपराओं में ग्रंथ-सूची और परिषदों की क्रम-संख्या में अंतर मिलता है।"
);

// Buddhism terminology: enlightenment, not Kaivalya/Nirvana at age 35
for (const n of [35,146]) {
  setExp(
    '6. Buddhism', n,
    "After giving up extreme asceticism and adopting the Middle Way, Siddhartha Gautama attained enlightenment (Bodhi) at about the age of 35 at Bodh Gaya. Nirvana in the sense of final passing (Mahaparinirvana) is associated with his death at Kushinagar.",
    "कठोर तपस्या छोड़कर मध्यम मार्ग अपनाने के बाद सिद्धार्थ गौतम ने लगभग 35 वर्ष की आयु में बोधगया में ज्ञान (बोधि) प्राप्त किया। अंतिम निर्वाण/महापरिनिर्वाण उनके कुशीनगर में देहांत से जुड़ा है।"
  );
}

// Gupta science: Dhanvantari/Sushruta and Aryabhata
setQuestion(
  '10. Gupta Empire', 136,
  "Which famous Ayurvedic text preserves teachings attributed to Dhanvantari?",
  "धन्वंतरि से संबद्ध शिक्षाओं को संरक्षित करने वाला प्रसिद्ध आयुर्वेदिक ग्रंथ कौन-सा है?"
);
setAnswerAndOption(
  '10. Gupta Empire', 136,
  'Sushruta Samhita',
  'सुश्रुत संहिता'
);
setExp(
  '10. Gupta Empire', 136,
  "The Sushruta Samhita presents Ayurveda as teachings delivered by Divodasa Dhanvantari to Sushruta and other disciples. The work is associated with Sushruta as its compiler, so calling a separate 'Dhanvantari Samhita' his book is misleading.",
  "सुश्रुत संहिता में आयुर्वेद की शिक्षाएँ दिवोदास धन्वंतरि द्वारा सुश्रुत और अन्य शिष्यों को दी गई बताई गई हैं। ग्रंथ का संकलन सुश्रुत से जुड़ा है, इसलिए किसी अलग 'धन्वंतरि संहिता' को उनकी पुस्तक कहना भ्रामक है।"
);
setExp(
  '10. Gupta Empire', 137,
  "Aryabhata described the Earth as spherical and explained the apparent daily motion of the sky through the Earth's rotation. His astronomical system should not be described as the modern heliocentric model.",
  "आर्यभट्ट ने पृथ्वी को गोलाकार बताया और आकाश की दैनिक प्रतीत होने वाली गति को पृथ्वी के घूर्णन से समझाया। उनकी खगोलीय व्यवस्था को आधुनिक सूर्यकेंद्रीय मॉडल कहना सही नहीं है।"
);
setAnswerAndOption(
  '10. Gupta Empire', 138,
  'The Earth rotates on its axis',
  'पृथ्वी अपनी धुरी पर घूमती है'
);
setExp(
  '10. Gupta Empire', 138,
  "Aryabhata argued that the Earth rotates on its axis, which explains the apparent westward motion of the stars. He did not present the modern claim that the Earth revolves around the Sun as the centre of the planetary system.",
  "आर्यभट्ट ने कहा कि पृथ्वी अपनी धुरी पर घूमती है, जिससे तारों की पश्चिम की ओर प्रतीत होने वाली गति समझाई जा सकती है। उन्होंने आधुनिक अर्थ में पृथ्वी के सूर्य के चारों ओर घूमने वाले सूर्यकेंद्रीय ग्रह-मॉडल का प्रतिपादन नहीं किया था।"
);

// Full Ancient History structural validation
let total = 0;
for (const [,secs] of Object.entries(anc)) {
  for (const sec of secs) {
    for (const q of (sec.questions || [])) {
      total++;
      if (!q.q?.en || !q.q?.hi || !q.a?.en || !q.a?.hi || !q.exp?.en || !q.exp?.hi)
        throw new Error('Empty bilingual field: '+(q.q?.en || 'unknown'));
      if ((q.o || []).length !== 4)
        throw new Error('Question without four options: '+q.q.en);
      if (!q.o.some(o => o.en === q.a.en && o.hi === q.a.hi))
        throw new Error('Correct answer missing from options: '+q.q.en);
      const en = q.o.map(o => o.en.trim().toLowerCase());
      if (new Set(en).size !== 4)
        throw new Error('Duplicate English option: '+q.q.en);
    }
  }
}
if (total !== 2216) throw new Error('Unexpected question count: '+total);

// Target assertions
if (getQ('5. Jainism',30).a.en !== 'Indrabhuti Gautama (Gautama Swami)') throw new Error('Jain Q30 not fixed');
if (getQ('5. Jainism',54).a.en.indexOf('11 Angas') < 0) throw new Error('Jain council Q54 not fixed');
if (getQ('10. Gupta Empire',136).a.en !== 'Sushruta Samhita') throw new Error('Dhanvantari Q136 not fixed');
if (getQ('10. Gupta Empire',138).a.en !== 'The Earth rotates on its axis') throw new Error('Aryabhata Q138 not fixed');

const json = JSON.stringify(data);
const replacement = startTag + '\n' + json + '\n' + endTag;
const out = src.slice(0,start) + replacement + src.slice(end + endTag.length);
JSON.parse(json);
fs.writeFileSync(file, out, 'utf8');
console.log('Applied '+changed.length+' final Ancient History factual edits; validated '+total+' questions.');
