const fs=require('fs');

const file='Original Practice/History_Complete_Practice.html';
const src=fs.readFileSync(file,'utf8');
const tag='<script id="master-data" type="application/json">';
const s=src.indexOf(tag), e=src.indexOf('</script>',s+tag.length);
if(s<0||e<0) throw new Error('master-data not found');

const data=JSON.parse(src.slice(s+tag.length,e).trim());
const anc=data['Ancient History'];
const ch=anc['3. Indus Valley - सिंधु घाटी सभ्यता'];
if(!ch) throw new Error('Chapter 3 missing');

function qg(n){
  let i=0;
  for(const sec of ch) for(const q of (sec.questions||[])){
    i++;
    if(i===n) return q;
  }
  throw new Error('Missing global Q'+n);
}
function replaceOption(q,oldEn,en,hi){
  const o=(q.o||[]).find(x=>x.en===oldEn);
  if(!o) throw new Error('Old option missing: '+oldEn+' :: '+q.q.en);
  o.en=en; o.hi=hi;
}
function setAnswer(q,en,hi){
  if(!(q.o||[]).some(o=>o.en===en&&o.hi===hi)) throw new Error('New answer missing in options: '+en);
  q.a={en,hi};
}
function setQuestion(q,en,hi){q.q={en,hi};}
function setExp(q,en,hi){q.exp={en,hi};}

// G45 = Section 4 Q21 — Kalibangan: discovery vs excavation
{
  const q=qg(45);
  replaceOption(q,'Amlananda Ghosh, 1951','B.B. Lal and B.K. Thapar, 1961-69','बी. बी. लाल और बी. के. थापर, 1961-69');
  setAnswer(q,'B.B. Lal and B.K. Thapar, 1961-69','बी. बी. लाल और बी. के. थापर, 1961-69');
  setQuestion(q,'Who excavated Kalibangan and when?','कालीबंगा का उत्खनन किसने और कब किया?');
  setExp(q,
    'Amlananda Ghosh identified Kalibangan as a Harappan site in the early 1950s; the major ASI excavations were carried out by B.B. Lal and B.K. Thapar during 1961-69.',
    'अमलानंद घोष ने 1950 के दशक की शुरुआत में कालीबंगा को हड़प्पाई स्थल के रूप में पहचाना; प्रमुख ASI उत्खनन 1961-69 के दौरान बी. बी. लाल और बी. के. थापर ने किया।'
  );
}

// G60 = Section 4 Q36 — Lothal excavation period
{
  const q=qg(60);
  replaceOption(q,'S.R. Rao, 1955-63','S.R. Rao, 1955-60','एस. आर. राव, 1955-60');
  setAnswer(q,'S.R. Rao, 1955-60','एस. आर. राव, 1955-60');
  setExp(q,
    'Lothal was excavated by S.R. Rao and the Archaeological Survey of India from 1955 to 1960; the site had been identified in 1954.',
    'लोथल का उत्खनन एस. आर. राव और भारतीय पुरातत्व सर्वेक्षण ने 1955 से 1960 के बीच किया; स्थल की पहचान 1954 में हुई थी।'
  );
}

// G67 = Section 4 Q43 — Banawali current district
{
  const q=qg(67);
  replaceOption(q,'Saraswati, Hisar, Haryana','Ghaggar-Saraswati region, Fatehabad, Haryana','घग्गर-सरस्वती क्षेत्र, फतेहाबाद, हरियाणा');
  setAnswer(q,'Ghaggar-Saraswati region, Fatehabad, Haryana','घग्गर-सरस्वती क्षेत्र, फतेहाबाद, हरियाणा');
  setExp(q,
    'Banawali is in present-day Fatehabad district of Haryana in the Ghaggar-Saraswati region; older references may associate the area with the former Hisar district.',
    'बनावली वर्तमान हरियाणा के फतेहाबाद जिले में घग्गर-सरस्वती क्षेत्र में स्थित है; पुराने संदर्भों में यह क्षेत्र पूर्ववर्ती हिसार जिले से जुड़ा मिल सकता है।'
  );
}

// G101 = Section 7 Q2 — remove unsupported fixed four-class claim
{
  const q=qg(101);
  setQuestion(q,'What can be concluded about social divisions in Harappan society?','हड़प्पा समाज के सामाजिक विभाजन के बारे में क्या निष्कर्ष निकाला जा सकता है?');
  q.o=[
    {en:'A fixed four-class system is conclusively proved',hi:'निश्चित चार-वर्गीय व्यवस्था निर्णायक रूप से सिद्ध है'},
    {en:'The Vedic varna system was fully established',hi:'वैदिक वर्ण व्यवस्था पूरी तरह स्थापित थी'},
    {en:'Some social differentiation is suggested, but a fixed four-class scheme is not proved',hi:'कुछ सामाजिक भेद के संकेत मिलते हैं, लेकिन निश्चित चार-वर्गीय व्यवस्था सिद्ध नहीं है'},
    {en:'There were no social differences at all',hi:'कोई सामाजिक अंतर बिल्कुल नहीं था'}
  ];
  setAnswer(q,'Some social differentiation is suggested, but a fixed four-class scheme is not proved','कुछ सामाजिक भेद के संकेत मिलते हैं, लेकिन निश्चित चार-वर्गीय व्यवस्था सिद्ध नहीं है');
  setExp(q,
    'Archaeological evidence suggests some social differentiation, but it does not prove a fixed four-class occupational or varna system.',
    'पुरातात्विक साक्ष्य कुछ सामाजिक भेद का संकेत देते हैं, लेकिन निश्चित चार-वर्गीय व्यवसायिक या वर्ण व्यवस्था सिद्ध नहीं करते।'
  );
}

// G119 = Section 8 Q2 — NCERT/UPSC convention for sign count
{
  const q=qg(119);
  replaceOption(q,'64 basic signs + 250-400 pictographs','About 375-400 signs','लगभग 375-400 चिह्न');
  setAnswer(q,'About 375-400 signs','लगभग 375-400 चिह्न');
  setExp(q,
    'NCERT notes that the Harappan script was not alphabetic and had roughly 375-400 signs; it remains undeciphered.',
    'NCERT के अनुसार हड़प्पा लिपि वर्णमालात्मक नहीं थी और इसमें लगभग 375-400 चिह्न थे; यह अब तक अपठित है।'
  );
}

// G120 = Section 8 Q3 — main writing direction
{
  const q=qg(120);
  replaceOption(q,'Boustrophedon - first line Right-to-Left, second Left-to-Right','Mostly Right-to-Left; occasional boustrophedon','मुख्यतः दाएँ से बाएँ; कभी-कभी बूस्ट्रोफेडन');
  setAnswer(q,'Mostly Right-to-Left; occasional boustrophedon','मुख्यतः दाएँ से बाएँ; कभी-कभी बूस्ट्रोफेडन');
  setExp(q,
    'Harappan writing was generally from right to left. A few longer inscriptions show boustrophedon writing, with alternate lines reversing direction.',
    'हड़प्पा लेखन सामान्यतः दाएँ से बाएँ था। कुछ लंबे अभिलेखों में बूस्ट्रोफेडन शैली मिलती है, जिसमें अगली पंक्ति की दिशा उलट जाती है।'
  );
}

// G131 = Section 8 Q14 — modern view on decline
{
  const q=qg(131);
  setQuestion(q,'What is the most accurate view about the decline of the Harappan urban civilisation?','हड़प्पा नगरीय सभ्यता के पतन के बारे में सबसे सही दृष्टिकोण क्या है?');
  q.o=[
    {en:'It was conclusively destroyed by a single Aryan invasion',hi:'एक ही आर्य आक्रमण से इसका निर्णायक विनाश हुआ'},
    {en:'Only floods caused the decline everywhere',hi:'हर जगह केवल बाढ़ ही पतन का कारण थी'},
    {en:'There is no single conclusively accepted cause; multiple environmental and economic factors are considered',hi:'कोई एक निर्णायक रूप से स्वीकृत कारण नहीं है; अनेक पर्यावरणीय और आर्थिक कारक माने जाते हैं'},
    {en:'A single epidemic is conclusively proved',hi:'एक ही महामारी निर्णायक रूप से सिद्ध है'}
  ];
  setAnswer(q,'There is no single conclusively accepted cause; multiple environmental and economic factors are considered','कोई एक निर्णायक रूप से स्वीकृत कारण नहीं है; अनेक पर्यावरणीय और आर्थिक कारक माने जाते हैं');
  setExp(q,
    'There is no unanimity on one cause of Harappan urban decline. Environmental change, river shifts, ecological stress, weakening trade and gradual deurbanisation are among the factors discussed; a single invasion is not conclusively established.',
    'हड़प्पा नगरीय पतन के किसी एक कारण पर सर्वसम्मति नहीं है। पर्यावरणीय परिवर्तन, नदियों के मार्ग में बदलाव, पारिस्थितिक दबाव, व्यापार में कमी और क्रमिक नगरीय पतन जैसे कारकों पर विचार किया जाता है; एकमात्र आक्रमण निर्णायक रूप से सिद्ध नहीं है।'
  );
}

// G174 = Section 10 Q26 — rapid-fire duplicate of script direction
{
  const q=qg(174);
  replaceOption(q,'Boustrophedon (R→L then L→R)','Mostly Right-to-Left','मुख्यतः दाएँ से बाएँ');
  setAnswer(q,'Mostly Right-to-Left','मुख्यतः दाएँ से बाएँ');
  setExp(q,
    'Harappan writing is generally understood to run from right to left; boustrophedon occurs only in some longer examples.',
    'हड़प्पा लेखन सामान्यतः दाएँ से बाएँ माना जाता है; बूस्ट्रोफेडन शैली केवल कुछ लंबे उदाहरणों में मिलती है।'
  );
}

// Validate the full Ancient History dataset.
let total=0, ch3count=0;
for(const [chapterName,secs] of Object.entries(anc)){
  for(const sec of secs){
    for(const q of (sec.questions||[])){
      total++;
      if(chapterName.startsWith('3.')) ch3count++;
      if(!q.q?.en||!q.q?.hi||!q.exp?.en||!q.exp?.hi) throw new Error('Empty bilingual field');
      if((q.o||[]).length!==4) throw new Error('Option count != 4: '+q.q.en);
      if(!q.o.some(o=>o.en===q.a.en&&o.hi===q.a.hi)) throw new Error('Answer not in options: '+q.q.en);
      const opts=q.o.map(o=>o.en.trim().toLowerCase());
      if(new Set(opts).size!==opts.length) throw new Error('Duplicate English options: '+q.q.en);
    }
  }
}
if(total!==2216) throw new Error('Ancient total changed: '+total);
if(ch3count!==183) throw new Error('Chapter 3 total changed: '+ch3count);

const out=src.slice(0,s)+tag+'\n'+JSON.stringify(data)+'\n'+src.slice(e);
fs.writeFileSync(file,out,'utf8');
console.log('Corrected Ancient History Chapter 3; validated '+ch3count+' questions and '+total+' Ancient History questions.');
