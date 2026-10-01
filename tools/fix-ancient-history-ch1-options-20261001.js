const fs=require('fs');
const file='Original Practice/History_Complete_Practice.html';
const src=fs.readFileSync(file,'utf8');
const startTag='<script id="master-data" type="application/json">';
const endTag='</script>';
const start=src.indexOf(startTag), end=src.indexOf(endTag,start+startTag.length);
if(start<0||end<0) throw new Error('master-data not found');
const data=JSON.parse(src.slice(start+startTag.length,end).trim());
const anc=data['Ancient History'];
const ch=anc['1. Sources of Ancient History - प्राचीन इतिहास के स्रोत'];
if(!ch) throw new Error('Ancient History chapter 1 missing');

function getQ(n){let i=0;for(const sec of ch)for(const q of(sec.questions||[])){i++;if(i===n)return q;}throw new Error('Missing Ch1 Q'+n);}
function replaceOption(q,oldEn,newEn,newHi){const o=(q.o||[]).find(x=>x.en===oldEn);if(!o)throw new Error('Missing old option '+oldEn+' :: '+q.q.en);o.en=newEn;o.hi=newHi;}
function setAnswer(q,en,hi){if(!(q.o||[]).some(o=>o.en===en&&o.hi===hi))throw new Error('Answer option missing '+en);q.a={en,hi};}
function setExp(q,en,hi){q.exp={en,hi};}
function setQuestion(q,en,hi){q.q={en,hi};}

// S2 Q6 (global 15)
{
 const q=getQ(15);
 replaceOption(q,'Devanampriya','Devanampriya Piyadassi (Priyadarshi)','देवानांप्रिय पियदस्सी (प्रियदर्शी)');
 replaceOption(q,'Priyadarshi','Devaputra','देवपुत्र');
 setAnswer(q,'Devanampriya Piyadassi (Priyadarshi)','देवानांप्रिय पियदस्सी (प्रियदर्शी)');
 setQuestion(q,'By what title-form is Ashoka commonly referred to in his inscriptions?','अशोक को उसके अभिलेखों में सामान्यतः किस उपाधि-रूप से संबोधित किया गया है?');
 setExp(q,"Ashokan inscriptions commonly use the titles Devanampiya (Beloved of the Gods) and Piyadassi/Priyadarshi (Pleasant to Behold). Some inscriptions, such as Maski, also name him as Ashoka.","अशोक के अभिलेखों में सामान्यतः देवानांप्रिय और पियदस्सी/प्रियदर्शी उपाधियाँ मिलती हैं। मास्की जैसे कुछ अभिलेखों में अशोक का व्यक्तिगत नाम भी मिलता है।");
}

// S3 Q3 (global 24)
{
 const q=getQ(24);
 setAnswer(q,'Kushan Period','कुषाण काल');
 setExp(q,"NCERT notes that the first gold coins were issued around the 1st century CE by the Kushanas. Indo-Greeks are noted for the first coins bearing rulers' names and images.","NCERT के अनुसार लगभग पहली शताब्दी ईस्वी में कुषाणों ने प्रथम स्वर्ण सिक्के जारी किए। इंडो-ग्रीक शासक शासकों के नाम और चित्र वाले प्रथम सिक्कों के लिए प्रसिद्ध हैं।");
}

// S3 Q7 (global 28)
{
 const q=getQ(28);
 replaceOption(q,'For making the first gold coins',"For the first coins bearing rulers' names and images",'शासकों के नाम और चित्र वाले प्रथम सिक्कों के लिए');
 setAnswer(q,"For the first coins bearing rulers' names and images",'शासकों के नाम और चित्र वाले प्रथम सिक्कों के लिए');
 setExp(q,"The Indo-Greeks issued the first coins in the Indian subcontinent that bore the names and images of rulers.",'इंडो-ग्रीक शासकों ने भारतीय उपमहाद्वीप में शासकों के नाम और चित्र वाले प्रथम सिक्के जारी किए।');
}

// S4 Q7 (global 37)
{
 const q=getQ(37);
 replaceOption(q,'Gopi, Vedika, Cave of Vapiya','Gopika, Vadathika and Vapiyaka','गोपिका, वदथिका और वापियका');
 setAnswer(q,'Gopika, Vadathika and Vapiyaka','गोपिका, वदथिका और वापियका');
 setExp(q,'The three Nagarjuni Hill caves associated with Dasharatha are Gopika, Vadathika and Vapiyaka; they were dedicated to the Ajivikas.','दशरथ से संबंधित नागार्जुनी पहाड़ी की तीन गुफाएँ गोपिका, वदथिका और वापियका हैं; इन्हें आजीविकों को समर्पित किया गया था।');
}

// S4 Q11 (global 41)
{
 const q=getQ(41);
 replaceOption(q,'1st Century CE to 7th Century CE','2nd Century BCE to 6th Century CE','दूसरी शताब्दी ईसा पूर्व से छठी शताब्दी ईस्वी तक');
 setAnswer(q,'2nd Century BCE to 6th Century CE','दूसरी शताब्दी ईसा पूर्व से छठी शताब्दी ईस्वी तक');
 setExp(q,'The Ajanta caves and their artistic phases span roughly from the 2nd century BCE to the 6th century CE, with major surviving paintings belonging especially to the later phase.','अजंता की गुफाओं और उनकी कलात्मक अवस्थाओं का काल मोटे तौर पर दूसरी शताब्दी ईसा पूर्व से छठी शताब्दी ईस्वी तक फैला है; प्रमुख संरक्षित चित्र विशेषकर बाद के चरण से हैं।');
}

// S9 Q3 (global 74)
{
 const q=getQ(74);
 setAnswer(q,'10 years','10 साल');
 setExp(q,"Faxian's wider journey lasted longer, but standard exam references place about 10 years of it in India during the time of Chandragupta II.",'फाह्यान की पूरी यात्रा इससे अधिक लंबी थी, लेकिन मानक परीक्षा-संदर्भों में चंद्रगुप्त द्वितीय के समय भारत में उनका प्रवास लगभग 10 वर्ष माना जाता है।');
}

// S9 Q11 (global 82)
{
 const q=getQ(82);
 replaceOption(q,'In Nalanda and Vikramshila universities','At Nalanda University','नालंदा विश्वविद्यालय में');
 setAnswer(q,'At Nalanda University','नालंदा विश्वविद्यालय में');
 setExp(q,'I-Tsing (Yijing), the 7th-century Chinese Buddhist pilgrim, studied at Nalanda. Vikramshila was founded later under the Pala ruler Dharmapala.','7वीं शताब्दी के चीनी बौद्ध यात्री इत्सिंग (यीजिंग) ने नालंदा में अध्ययन किया। विक्रमशिला की स्थापना बाद में पाल शासक धर्मपाल के समय हुई।');
}

// S9 Q12 (global 83)
{
 const q=getQ(83);
 setQuestion(q,'Who spent about 10 years in India during his Buddhist pilgrimage?','अपनी बौद्ध तीर्थयात्रा के दौरान लगभग 10 वर्ष भारत में किसने बिताए?');
 setExp(q,'Faxian spent about 10 years in India during his longer journey through Central, South and Southeast Asia and recorded his observations in A Record of Buddhist Kingdoms (Fo-Kuo-Ki).','फाह्यान ने मध्य, दक्षिण और दक्षिण-पूर्व एशिया की अपनी लंबी यात्रा के दौरान लगभग 10 वर्ष भारत में बिताए और अपने अनुभव Fo-Kuo-Ki (A Record of Buddhist Kingdoms) में लिखे।');
}

// S10 Q3 (global 87)
{
 const q=getQ(87);
 replaceOption(q,'From modern-day Turkmenistan','From present-day Uzbekistan','वर्तमान उज़्बेकिस्तान के');
 setAnswer(q,'From present-day Uzbekistan','वर्तमान उज़्बेकिस्तान के');
 setExp(q,'Al-Biruni was born in Khwarizm, at Kath, a place generally identified with present-day Uzbekistan.','अल-बिरूनी का जन्म ख्वारिज्म के काथ में हुआ था, जिसे सामान्यतः वर्तमान उज़्बेकिस्तान में माना जाता है।');
}

// S10 Q9 (global 93)
{
 const q=getQ(93);
 replaceOption(q,'Kangyur & Tangyur','History of Buddhism in India','भारत में बौद्ध धर्म का इतिहास');
 setAnswer(q,'History of Buddhism in India','भारत में बौद्ध धर्म का इतिहास');
 setQuestion(q,'Which well-known historical work is associated with Taranatha?','तारानाथ से कौन-सा प्रसिद्ध ऐतिहासिक ग्रंथ संबंधित है?');
 setExp(q,"Taranatha, the Tibetan Buddhist scholar, is known for his History of Buddhism in India. The Kangyur and Tengyur are Tibetan Buddhist canonical collections, not books authored by Taranatha.","तिब्बती बौद्ध विद्वान तारानाथ 'भारत में बौद्ध धर्म का इतिहास' के लिए प्रसिद्ध हैं। कंग्युर और तेंग्युर तिब्बती बौद्ध धर्म के प्रामाणिक ग्रंथ-संग्रह हैं, तारानाथ की लिखी पुस्तकें नहीं।");
}

// S11 Q1 (global 96)
{
 const q=getQ(96);
 setQuestion(q,'Who issued the first gold coins in India?','भारत में प्रथम स्वर्ण सिक्के किसने जारी किए?');
 replaceOption(q,'Kushans purest','Kushanas - First gold coins','कुषाण - प्रथम स्वर्ण सिक्के');
 replaceOption(q,'Indo-Greeks - First gold coins','Indo-Greeks - First ruler-name/image coins','इंडो-ग्रीक - शासक के नाम/चित्र वाले प्रथम सिक्के');
 setAnswer(q,'Kushanas - First gold coins','कुषाण - प्रथम स्वर्ण सिक्के');
 setExp(q,"NCERT places the first gold coins around the 1st century CE under the Kushanas; Indo-Greeks are distinguished for the first coins bearing rulers' names and images.",'NCERT के अनुसार लगभग पहली शताब्दी ईस्वी में कुषाणों ने प्रथम स्वर्ण सिक्के जारी किए; इंडो-ग्रीक शासक शासकों के नाम और चित्र वाले प्रथम सिक्कों के लिए जाने जाते हैं।');
}

// S12 Q5 (global 111)
{
 const q=getQ(111);
 setAnswer(q,'Kushan','कुषाण');
 setExp(q,"NCERT places the first gold coins around the 1st century CE under the Kushanas. Indo-Greeks are associated with the first coins bearing rulers' names and images.",'NCERT के अनुसार लगभग पहली शताब्दी ईस्वी में कुषाणों ने प्रथम स्वर्ण सिक्के जारी किए। इंडो-ग्रीक शासक शासकों के नाम और चित्र वाले प्रथम सिक्कों से जुड़े हैं।');
}

// S12 Q18 (global 124)
{
 const q=getQ(124);
 replaceOption(q,'Chandragupta II - 402 CE, 14 years','Chandragupta II (Vikramaditya)','चंद्रगुप्त द्वितीय (विक्रमादित्य)');
 setAnswer(q,'Chandragupta II (Vikramaditya)','चंद्रगुप्त द्वितीय (विक्रमादित्य)');
 setExp(q,'Faxian visited India during the reign of the Gupta emperor Chandragupta II (Vikramaditya).','फाह्यान ने गुप्त सम्राट चंद्रगुप्त द्वितीय (विक्रमादित्य) के शासनकाल में भारत की यात्रा की।');
}

let total=0,ch1total=0;
for(const [chapterName,secs] of Object.entries(anc)){
 for(const sec of secs)for(const q of(sec.questions||[])){
  total++; if(chapterName.startsWith('1.'))ch1total++;
  if(!q.q?.en||!q.q?.hi||!q.a?.en||!q.a?.hi||!q.exp?.en||!q.exp?.hi)throw new Error('Empty bilingual field');
  if((q.o||[]).length!==4)throw new Error('Not 4 options: '+q.q.en);
  if(!q.o.some(o=>o.en===q.a.en&&o.hi===q.a.hi))throw new Error('Answer missing from options: '+q.q.en);
  const opts=q.o.map(o=>String(o.en).trim().toLowerCase());
  if(new Set(opts).size!==4)throw new Error('Duplicate English options: '+q.q.en);
 }
}
if(total!==2216)throw new Error('Unexpected Ancient History count '+total);
if(ch1total!==130)throw new Error('Unexpected Chapter 1 count '+ch1total);

const checks={15:'Devanampriya Piyadassi (Priyadarshi)',24:'Kushan Period',28:"For the first coins bearing rulers' names and images",37:'Gopika, Vadathika and Vapiyaka',41:'2nd Century BCE to 6th Century CE',74:'10 years',82:'At Nalanda University',83:'Faxian',87:'From present-day Uzbekistan',93:'History of Buddhism in India',96:'Kushanas - First gold coins',111:'Kushan',124:'Chandragupta II (Vikramaditya)'};
for(const [n,a] of Object.entries(checks))if(getQ(+n).a.en!==a)throw new Error('Spot check failed '+n);

const json=JSON.stringify(data);
const out=src.slice(0,start)+startTag+'\n'+json+'\n'+endTag+src.slice(end+endTag.length);
fs.writeFileSync(file,out,'utf8');
console.log('Chapter 1 option audit fixes applied; 13 records corrected; '+total+' Ancient History questions validated.');
