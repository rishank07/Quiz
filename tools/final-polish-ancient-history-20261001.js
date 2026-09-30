const fs = require('fs');

const file='Original Practice/History_Complete_Practice.html';
const src=fs.readFileSync(file,'utf8');
const startTag='<script id="master-data" type="application/json">';
const endTag='</script>';
const start=src.indexOf(startTag);
const end=src.indexOf(endTag,start+startTag.length);
if(start<0||end<0) throw new Error('master-data not found');
const data=JSON.parse(src.slice(start+startTag.length,end).trim());
const anc=data['Ancient History'];

function getQ(prefix,n){
  const found=Object.entries(anc).find(([k])=>k.startsWith(prefix));
  if(!found) throw new Error('Missing chapter '+prefix);
  let i=0;
  for(const sec of found[1]) for(const q of (sec.questions||[])){i++; if(i===n) return q;}
  throw new Error('Missing question '+prefix+' #'+n);
}
function setExp(p,n,en,hi){getQ(p,n).exp={en,hi};}
function setQuestion(p,n,en,hi){getQ(p,n).q={en,hi};}
function setAnswerAndOption(p,n,en,hi){
  const q=getQ(p,n), oldEn=q.a.en, oldHi=q.a.hi;
  const opt=(q.o||[]).find(o=>o.en===oldEn||o.hi===oldHi);
  if(!opt) throw new Error('Old correct option missing '+p+' #'+n);
  q.a={en,hi}; opt.en=en; opt.hi=hi;
}

// Remove the last four adjacent exact explanation repeats by making each explanation question-specific.
setExp('7. Mahajanapadas & Magadha',111,
  "Rajgir, ancient Girivraja, was the early capital of Magadha. Its surrounding hills gave the city strong natural protection.",
  "राजगीर, जिसका प्राचीन नाम गिरिव्रज था, मगध की प्रारंभिक राजधानी थी। चारों ओर की पहाड़ियों के कारण इसे मजबूत प्राकृतिक सुरक्षा मिलती थी।");
setExp('7. Mahajanapadas & Magadha',112,
  "Pataliputra became the later capital of Magadha. Udayin is traditionally credited with shifting the capital there, at a strategically important location near major river routes.",
  "पाटलिपुत्र मगध की बाद की राजधानी बना। परंपरागत रूप से उदयन को राजधानी वहाँ स्थानांतरित करने का श्रेय दिया जाता है; यह प्रमुख नदी मार्गों के पास रणनीतिक स्थान था।");

setExp('10. Gupta Empire',114,
  "Abhijnanashakuntalam was written by Kalidasa. The Sanskrit drama tells the story of King Dushyanta and Shakuntala, drawing on an episode from the Mahabharata.",
  "अभिज्ञानशाकुंतलम् कालिदास द्वारा रचित संस्कृत नाटक है। इसमें राजा दुष्यंत और शकुंतला की कथा है, जिसका आधार महाभारत का एक प्रसंग है।");
setAnswerAndOption('10. Gupta Empire',115,
  "Translated into English by Sir William Jones in 1789",
  "1789 में सर विलियम जोन्स ने इसका अंग्रेज़ी अनुवाद किया");
setExp('10. Gupta Empire',115,
  "Sir William Jones published an English translation of Abhijnanashakuntalam in 1789. It became highly influential in introducing Kalidasa's drama to European readers.",
  "सर विलियम जोन्स ने 1789 में अभिज्ञानशाकुंतलम् का अंग्रेज़ी अनुवाद प्रकाशित किया। इससे कालिदास का यह नाटक यूरोपीय पाठकों के बीच व्यापक रूप से प्रसिद्ध हुआ।");
setQuestion('10. Gupta Empire',168,
  "Who wrote Abhijnanashakuntalam, translated into English by Sir William Jones in 1789?",
  "अभिज्ञानशाकुंतलम् किसने लिखा, जिसका 1789 में सर विलियम जोन्स ने अंग्रेज़ी अनुवाद किया?");
setExp('10. Gupta Empire',168,
  "Kalidasa wrote Abhijnanashakuntalam. Sir William Jones's 1789 English translation later helped make the play widely known in Europe.",
  "अभिज्ञानशाकुंतलम् कालिदास की रचना है। सर विलियम जोन्स के 1789 के अंग्रेज़ी अनुवाद ने बाद में इस नाटक को यूरोप में व्यापक पहचान दिलाई।");

setExp('12. History of South India',230,
  "Rajendra I is commonly described in exam-oriented history material as the 'Napoleon of the South' because of his extensive land and naval campaigns that carried Chola power far beyond its earlier limits.",
  "राजेंद्र प्रथम को व्यापक स्थल और नौसैनिक अभियानों के कारण परीक्षा-केंद्रित इतिहास सामग्री में प्रायः 'दक्षिण का नेपोलियन' कहा जाता है; उसके अभियानों ने चोल शक्ति का बहुत विस्तार किया।");
setExp('12. History of South India',231,
  "Rajendra I assumed the title Gangaikonda Chola after his successful northern campaign reached the Ganges region; the title means 'the Chola who conquered the Ganga'.",
  "राजेंद्र प्रथम ने उत्तर भारत के अभियान के गंगा क्षेत्र तक पहुँचने के बाद 'गंगईकोंड चोल' की उपाधि धारण की; इसका अर्थ है 'गंगा को जीतने वाला चोल'।");

setExp('13. Early Medieval Period',132,
  "Vikramashila was founded by the Pala ruler Dharmapala in present-day Bihar and developed into a major Buddhist centre of higher learning.",
  "विक्रमशिला की स्थापना पाल शासक धर्मपाल ने वर्तमान बिहार में की थी और यह आगे चलकर बौद्ध उच्च शिक्षा का प्रमुख केंद्र बना।");
setQuestion('13. Early Medieval Period',133,
  "Who succeeded Gopala as the Pala ruler?",
  "पाल शासक गोपाल के बाद कौन शासक बना?");
setExp('13. Early Medieval Period',133,
  "Dharmapala succeeded Gopala as the second major ruler of the Pala dynasty. He greatly expanded Pala power and was an important patron of Buddhist learning.",
  "धर्मपाल गोपाल के बाद पाल वंश का दूसरा प्रमुख शासक बना। उसने पाल शक्ति का व्यापक विस्तार किया और बौद्ध शिक्षा का महत्वपूर्ण संरक्षक था।");

// Validate all Ancient History questions and ensure no adjacent exact duplicate explanations remain.
let total=0, adjacent=0;
const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,' ');
for(const [,secs] of Object.entries(anc)){
  const flat=[];
  for(const sec of secs) for(const q of (sec.questions||[])){
    total++; flat.push(q);
    if(!q.q?.en||!q.q?.hi||!q.a?.en||!q.a?.hi||!q.exp?.en||!q.exp?.hi) throw new Error('Empty bilingual field');
    if((q.o||[]).length!==4) throw new Error('Not 4 options: '+q.q.en);
    if(!q.o.some(o=>o.en===q.a.en&&o.hi===q.a.hi)) throw new Error('Answer missing from options: '+q.q.en);
    const en=q.o.map(o=>norm(o.en));
    if(new Set(en).size!==4) throw new Error('Duplicate English options: '+q.q.en);
  }
  for(let i=0;i<flat.length-1;i++) if(norm(flat[i].exp.en)===norm(flat[i+1].exp.en)) adjacent++;
}
if(total!==2216) throw new Error('Unexpected question count '+total);
if(adjacent!==0) throw new Error('Adjacent duplicate explanations remain: '+adjacent);

const json=JSON.stringify(data);
const out=src.slice(0,start)+startTag+'\n'+json+'\n'+endTag+src.slice(end+endTag.length);
fs.writeFileSync(file,out,'utf8');
console.log('Ancient History final polish complete; '+total+' questions validated; adjacent duplicate explanations: '+adjacent);
