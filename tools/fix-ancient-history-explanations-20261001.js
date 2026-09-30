const fs = require('fs');

const file = 'Original Practice/History_Complete_Practice.html';
const src = fs.readFileSync(file, 'utf8');
const startTag = '<script id="master-data" type="application/json">';
const start = src.indexOf(startTag);
const endTag = '</script>';
const end = src.indexOf(endTag, start + startTag.length);
if (start < 0 || end < 0) throw new Error('master-data not found');
const rawJson = src.slice(start + startTag.length, end).trim();
const data = JSON.parse(rawJson);
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
function E(p,n,en,hi){ getQ(p,n).exp={en,hi}; changed.push(p+'#'+n); }
function AO(p,n,en,hi){
  const q=getQ(p,n), oldEn=q.a.en, oldHi=q.a.hi;
  q.a={en,hi};
  for(const o of q.o||[]) if(o.en===oldEn || o.hi===oldHi){o.en=en;o.hi=hi;}
  changed.push(p+'#'+n+':answer');
}

// 5. Jainism
E("5. Jainism",81,"The Gommateshwara (Bahubali) statue at Shravanabelagola was commissioned by Chamundaraya, a minister and commander of the Western Ganga dynasty.","श्रवणबेलगोला की गोम्मटेश्वर (बाहुबली) प्रतिमा का निर्माण पश्चिमी गंग वंश के मंत्री एवं सेनापति चामुंडराय ने करवाया था।");
E("5. Jainism",87,"Naminatha, the 21st Jain Tirthankara, is traditionally represented by the Blue Lotus symbol.","जैन परंपरा में 21वें तीर्थंकर नमिनाथ का प्रतीक नीला कमल माना जाता है।");
E("5. Jainism",133,"The Gommateshwara (Bahubali) statue at Shravanabelagola was commissioned by Chamundaraya, a minister and commander of the Western Ganga dynasty.","श्रवणबेलगोला की गोम्मटेश्वर (बाहुबली) प्रतिमा का निर्माण पश्चिमी गंग वंश के मंत्री एवं सेनापति चामुंडराय ने करवाया था।");
AO("5. Jainism",97,"Ajivika - NOT Jain (father Chandragupta was associated with Jainism; son Ashoka with Buddhism)","आजीवक - जैन नहीं (पिता चंद्रगुप्त जैन धर्म से जुड़े थे; पुत्र अशोक बौद्ध धर्म से)");

// 6. Buddhism
E("6. Buddhism",99,"The answer used here is the 3rd Buddhist Council at Pataliputra under Ashoka; Buddhist tradition associates this council with the formal organization of Abhidhamma material.","यहाँ सही उत्तर अशोक के समय पाटलिपुत्र में हुई तीसरी बौद्ध संगीति है; बौद्ध परंपरा इस संगीति को अभिधम्म सामग्री के व्यवस्थित रूप से संकलन से जोड़ती है।");
E("6. Buddhism",100,"The Sutta and Vinaya Pitakas are traditionally associated with the 1st Buddhist Council at Rajagriha after the Buddha's Mahaparinirvana; Ananda recited the Suttas and Upali the Vinaya.","सुत्त और विनय पिटक को परंपरागत रूप से बुद्ध के महापरिनिर्वाण के बाद राजगृह में हुई पहली बौद्ध संगीति से जोड़ा जाता है; आनंद ने सुत्त और उपालि ने विनय का पाठ किया।");
E("6. Buddhism",110,"A Saririka stupa contains bodily relics of the Buddha or another revered Buddhist figure, such as ashes, bones or teeth.","शारीरिक स्तूप में बुद्ध या किसी पूज्य बौद्ध व्यक्तित्व के शारीरिक अवशेष—जैसे अस्थियाँ, राख या दाँत—रखे जाते हैं।");
E("6. Buddhism",111,"A Paribhogika stupa is associated with objects personally used by the Buddha, rather than with his bodily relics.","पारिभोगिक स्तूप बुद्ध द्वारा व्यक्तिगत रूप से उपयोग की गई वस्तुओं से जुड़ा होता है, न कि उनके शारीरिक अवशेषों से।");
E("6. Buddhism",112,"An Uddesika stupa is symbolic or commemorative: it represents the Buddha or an event connected with him without requiring bodily relics.","उद्देशिक स्तूप प्रतीकात्मक या स्मारक स्वरूप का होता है; इसमें शारीरिक अवशेष आवश्यक नहीं होते, बल्कि यह बुद्ध या उनसे जुड़ी किसी घटना का स्मरण कराता है।");
E("6. Buddhism",113,"Kesariya Stupa in Bihar is identified in this material as the largest stupa; it is noted for its enormous surviving mound and multiple terraces.","इस सामग्री में बिहार के केसरिया स्तूप को सबसे बड़ा स्तूप बताया गया है; इसका विशाल अवशेष-टीला और कई स्तर इसकी प्रमुख विशेषताएँ हैं।");
E("6. Buddhism",114,"Dhamek Stupa is at Sarnath in Uttar Pradesh and commemorates the place associated with the Buddha's First Sermon.","धमेख स्तूप उत्तर प्रदेश के सारनाथ में है और उस स्थान की स्मृति से जुड़ा है जहाँ बुद्ध ने प्रथम उपदेश दिया था।");
E("6. Buddhism",115,"The original Sanchi Stupa in Madhya Pradesh was commissioned by Emperor Ashoka; it was enlarged and embellished in later periods.","मध्य प्रदेश का मूल साँची स्तूप सम्राट अशोक द्वारा बनवाया गया था; बाद के कालों में इसका विस्तार और अलंकरण हुआ।");
E("6. Buddhism",116,"Bharhut Stupa in Madhya Pradesh is especially famous for its carved stone railings and narrative sculptures.","मध्य प्रदेश का भरहुत स्तूप अपनी नक्काशीदार पत्थर की रेलिंग और कथात्मक मूर्तिकला के लिए विशेष रूप से प्रसिद्ध है।");
E("6. Buddhism",117,"Ramabhar Stupa is at Kushinagar in Uttar Pradesh and is traditionally associated with the Buddha's cremation after Mahaparinirvana.","रामाभार स्तूप उत्तर प्रदेश के कुशीनगर में है और परंपरागत रूप से बुद्ध के महापरिनिर्वाण के बाद उनके दाह-संस्कार स्थल से जुड़ा है।");
E("6. Buddhism",119,"Bavikonda is a Buddhist monastic and stupa site near Visakhapatnam in present-day Andhra Pradesh.","बाविकोंडा वर्तमान आंध्र प्रदेश में विशाखापत्तनम के निकट स्थित एक बौद्ध मठ और स्तूप स्थल है।");
E("6. Buddhism",120,"Piprahwa Stupa in Uttar Pradesh is identified in this material as the oldest stupa and is associated with relics linked to ancient Kapilavastu.","इस सामग्री में उत्तर प्रदेश के पिपरहवा स्तूप को सबसे पुराना स्तूप बताया गया है; इसे प्राचीन कपिलवस्तु से जुड़े अवशेषों से जोड़ा जाता है।");
E("6. Buddhism",121,"The Dharmarajika Stupa at Taxila is traditionally attributed to Emperor Ashoka and formed an important Buddhist sacred complex.","तक्षशिला का धर्मराजिका स्तूप परंपरागत रूप से सम्राट अशोक से जोड़ा जाता है और यह एक महत्वपूर्ण बौद्ध पवित्र परिसर था।");
E("6. Buddhism",131,"Yes. The two labels refer to different categories: Kesariya in Bihar is treated here as the largest stupa, while Borobudur in Indonesia is a vast Buddhist temple-monument.","हाँ। दोनों अलग श्रेणियाँ हैं: यहाँ बिहार के केसरिया को सबसे बड़ा स्तूप माना गया है, जबकि इंडोनेशिया का बोरोबुदुर एक विशाल बौद्ध मंदिर-स्मारक है।");
E("6. Buddhism",133,"Siddhartha left home at about 29 years of age in the Great Renunciation and attained enlightenment at about 35 at Bodh Gaya.","सिद्धार्थ ने लगभग 29 वर्ष की आयु में महाभिनिष्क्रमण के समय गृहत्याग किया और लगभग 35 वर्ष की आयु में बोधगया में ज्ञान प्राप्त किया।");
E("6. Buddhism",162,"The answer used here is the 3rd Buddhist Council at Pataliputra under Ashoka; Buddhist tradition associates this council with the formal organization of Abhidhamma material.","यहाँ सही उत्तर अशोक के समय पाटलिपुत्र में हुई तीसरी बौद्ध संगीति है; बौद्ध परंपरा इस संगीति को अभिधम्म सामग्री के व्यवस्थित रूप से संकलन से जोड़ती है।");
E("6. Buddhism",165,"Kesariya Stupa in Bihar is identified in this material as the largest stupa; it is noted for its enormous surviving mound and multiple terraces.","इस सामग्री में बिहार के केसरिया स्तूप को सबसे बड़ा स्तूप बताया गया है; इसका विशाल अवशेष-टीला और कई स्तर इसकी प्रमुख विशेषताएँ हैं।");
E("6. Buddhism",167,"Piprahwa Stupa in Uttar Pradesh is identified in this material as the oldest stupa and is associated with relics linked to ancient Kapilavastu.","इस सामग्री में उत्तर प्रदेश के पिपरहवा स्तूप को सबसे पुराना स्तूप बताया गया है; इसे प्राचीन कपिलवस्तु से जुड़े अवशेषों से जोड़ा जाता है।");
E("6. Buddhism",168,"The original Sanchi Stupa in Madhya Pradesh was commissioned by Emperor Ashoka; it was enlarged and embellished in later periods.","मध्य प्रदेश का मूल साँची स्तूप सम्राट अशोक द्वारा बनवाया गया था; बाद के कालों में इसका विस्तार और अलंकरण हुआ।");

// 7. Mahajanapadas & Magadha
E("7. Mahajanapadas & Magadha",22,"The Battle of Hydaspes was fought on the banks of the Jhelum River, called Hydaspes by the Greeks, between Alexander and King Porus in 326 BCE.","हाइडेस्पेस का युद्ध 326 ईसा पूर्व में सिकंदर और राजा पोरस के बीच झेलम नदी के तट पर लड़ा गया था; यूनानी झेलम को Hydaspes कहते थे।");

// 8. Mauryan Empire
E("8. Mauryan Empire",43,"Ashoka's Major Rock Edict XIII states that about 100,000 people were killed and 150,000 were deported or taken away in the Kalinga War, with many more dying afterward.","अशोक के प्रमुख शिलालेख XIII के अनुसार कलिंग युद्ध में लगभग 1 लाख लोग मारे गए और 1.5 लाख लोगों को बंदी बनाकर ले जाया गया; इसके बाद भी बहुत से लोगों की मृत्यु हुई।");
E("8. Mauryan Empire",44,"The Kalinga War deeply affected Ashoka. He emphasized conquest through Dhamma rather than warfare—commonly summarized as replacing Bherighosha with Dhammaghosha.","कलिंग युद्ध ने अशोक को गहराई से प्रभावित किया। उसने युद्ध-विजय के स्थान पर धम्म-विजय पर जोर दिया—इसे सामान्यतः भेरीघोष के स्थान पर धम्मघोष के रूप में याद किया जाता है।");
E("8. Mauryan Empire",59,"Major Rock Edict II provides for medical treatment for humans and animals and refers to medicinal herbs and facilities; it also names southern polities such as the Cholas and Pandyas.","प्रमुख शिलालेख II मनुष्यों और पशुओं के लिए चिकित्सा, औषधीय वनस्पतियों और सुविधाओं का उल्लेख करता है; इसमें चोल और पांड्य जैसे दक्षिणी राज्यों का भी उल्लेख है।");
E("8. Mauryan Empire",60,"Major Rock Edict III orders periodic, five-year tours by officials to promote Dhamma and proper conduct among the people.","प्रमुख शिलालेख III अधिकारियों को धम्म और सदाचार के प्रचार के लिए हर पाँच वर्ष में दौरा करने का आदेश देता है।");
E("8. Mauryan Empire",61,"Major Rock Edict IV contrasts the old emphasis on royal power and warfare with the growing 'sound of Dhamma', expressing Ashoka's preference for moral conquest.","प्रमुख शिलालेख IV पुराने युद्ध और राजकीय शक्ति के जोर की तुलना बढ़ते 'धम्मघोष' से करता है और अशोक की नैतिक विजय की नीति को दर्शाता है।");
E("8. Mauryan Empire",63,"Major Rock Edict VI mentions Prativedakas, or reporters, who were to keep the emperor informed so that public business could be attended to promptly.","प्रमुख शिलालेख VI में प्रतिवेदकों का उल्लेख है, जिनका काम सम्राट को समाचार देना था ताकि जनकार्य पर शीघ्र ध्यान दिया जा सके।");
E("8. Mauryan Empire",64,"Major Rock Edict VII stresses coexistence and tolerance among different religious sects and encourages self-control and purity of mind.","प्रमुख शिलालेख VII विभिन्न धार्मिक संप्रदायों के बीच सह-अस्तित्व और सहिष्णुता पर जोर देता है तथा आत्मसंयम और मन की शुद्धता को प्रोत्साहित करता है।");
E("8. Mauryan Empire",65,"Major Rock Edict VIII describes Ashoka's Dhammayatra, replacing pleasure tours with pilgrimages and moral visits; Bodh Gaya is associated with this change.","प्रमुख शिलालेख VIII अशोक की धम्मयात्रा का वर्णन करता है, जिसमें मनोरंजन यात्राओं की जगह तीर्थ और नैतिक यात्राओं ने ली; बोधगया की यात्रा इससे जुड़ी है।");
E("8. Mauryan Empire",66,"Major Rock Edict IX criticizes empty or wasteful ceremonies and recommends meaningful practices based on Dhamma instead.","प्रमुख शिलालेख IX निरर्थक या अपव्ययी कर्मकांडों की आलोचना करता है और उनकी जगह धम्म-आधारित सार्थक आचरण की सलाह देता है।");
E("8. Mauryan Empire",68,"Major Rock Edict XI explains the value of Dhamma and presents the 'gift of Dhamma' as superior to ordinary material gifts.","प्रमुख शिलालेख XI धम्म के महत्व को समझाता है और 'धम्मदान' को सामान्य भौतिक दान से श्रेष्ठ बताता है।");
E("8. Mauryan Empire",69,"Major Rock Edict XII is chiefly about religious harmony: it asks people to respect other sects and restrain speech that needlessly disparages them.","प्रमुख शिलालेख XII का मुख्य विषय धार्मिक सद्भाव है; यह दूसरे संप्रदायों का सम्मान करने और अनावश्यक निंदा से बचने की शिक्षा देता है।");
E("8. Mauryan Empire",70,"Major Rock Edict XIII gives the fullest account of the Kalinga War, Ashoka's remorse, and his preference for conquest through Dhamma and diplomacy.","प्रमुख शिलालेख XIII कलिंग युद्ध, अशोक के पश्चाताप तथा धम्म और कूटनीति द्वारा विजय की उसकी नीति का सबसे विस्तृत विवरण देता है।");
E("8. Mauryan Empire",71,"Major Rock Edict XIV explains that Ashoka's edicts were issued in different forms and lengths so that the message of Dhamma could be communicated widely.","प्रमुख शिलालेख XIV बताता है कि धम्म का संदेश व्यापक रूप से पहुँचाने के लिए अशोक के अभिलेख अलग-अलग रूप और लंबाई में जारी किए गए।");
E("8. Mauryan Empire",131,"Mauryan silver punch-marked coins carried stamped symbols such as the peacock, hill and crescent moon rather than portrait designs.","मौर्यकालीन चाँदी के आहत सिक्कों पर चित्र-प्रतिमा के बजाय मोर, पहाड़ी और अर्धचंद्र जैसे मुद्रांकित प्रतीक पाए जाते थे।");
E("8. Mauryan Empire",143,"Ashoka's accession is dated here to 273 BCE, while his formal coronation is dated to 269 BCE—a gap of about four years.","यहाँ अशोक का राज्यारोहण 273 ईसा पूर्व और औपचारिक राज्याभिषेक 269 ईसा पूर्व माना गया है—दोनों के बीच लगभग चार वर्ष का अंतर था।");
E("8. Mauryan Empire",169,"Ashoka's Major Rock Edict XIII states that about 100,000 people were killed and 150,000 were deported or taken away in the Kalinga War, with many more dying afterward.","अशोक के प्रमुख शिलालेख XIII के अनुसार कलिंग युद्ध में लगभग 1 लाख लोग मारे गए और 1.5 लाख लोगों को बंदी बनाकर ले जाया गया; इसके बाद भी बहुत से लोगों की मृत्यु हुई।");

// 9. Post Mauryan Empire
E("9. Post Mauryan Empire",4,"The main overland entry into north-western India for these Central Asian and Hellenistic groups was through the Hindu Kush and adjoining north-western passes.","इन मध्य एशियाई और हेल्लेनिस्टिक समूहों के लिए उत्तर-पश्चिम भारत में प्रवेश का प्रमुख स्थलमार्ग हिंदूकुश और उससे जुड़े उत्तर-पश्चिमी दर्रे थे।");
E("9. Post Mauryan Empire",79,"Rudradaman's Junagadh inscription, dated to about 150 CE, is important as one of the earliest extensive inscriptions composed in polished classical Sanskrit prose.","रुद्रदामन का लगभग 150 ईस्वी का जूनागढ़ अभिलेख परिष्कृत शास्त्रीय संस्कृत गद्य में लिखे गए सबसे प्रारंभिक विस्तृत अभिलेखों में से एक माना जाता है।");
E("9. Post Mauryan Empire",90,"The Junagadh inscription of Rudradaman is written in Sanskrit using the Brahmi script.","रुद्रदामन का जूनागढ़ अभिलेख ब्राह्मी लिपि में संस्कृत भाषा में लिखा गया है।");
E("9. Post Mauryan Empire",107,"Kujula Kadphises is associated in this material with copper coinage, including issues influenced by or imitating earlier Roman and regional coin types.","इस सामग्री में कुजुल कडफिसेस को ताँबे के सिक्कों से जोड़ा गया है, जिनमें कुछ पर रोमन और क्षेत्रीय सिक्का-प्रकारों का प्रभाव दिखाई देता है।");
E("9. Post Mauryan Empire",109,"Vima Kadphises is credited with introducing regular Kushan gold coinage on a substantial scale.","विम कडफिसेस को बड़े पैमाने पर नियमित कुषाण स्वर्ण सिक्के जारी करने का श्रेय दिया जाता है।");
E("9. Post Mauryan Empire",110,"Vima Kadphises is associated with Shaivism; his coins depict Shiva, the bull Nandi and the trident, and use the title Maheshwara.","विम कडफिसेस को शैव धर्म से जोड़ा जाता है; उसके सिक्कों पर शिव, नंदी और त्रिशूल के चित्र मिलते हैं तथा महेश्वर उपाधि का प्रयोग मिलता है।");
E("9. Post Mauryan Empire",118,"Kujula Kadphises consolidated Kushan power in the north-west and extended control into territories of present-day Afghanistan and north-western India.","कुजुल कडफिसेस ने उत्तर-पश्चिम में कुषाण शक्ति को संगठित किया और वर्तमान अफगानिस्तान तथा उत्तर-पश्चिम भारत के क्षेत्रों तक नियंत्रण बढ़ाया।");
E("9. Post Mauryan Empire",119,"Some coins of Kujula Kadphises carry Buddhist-associated symbols such as the Triratna, reflecting the varied religious imagery used on early Kushan coinage.","कुजुल कडफिसेस के कुछ सिक्कों पर त्रिरत्न जैसे बौद्ध प्रतीक मिलते हैं, जो आरंभिक कुषाण सिक्कों की विविध धार्मिक प्रतीक-परंपरा को दर्शाते हैं।");
E("9. Post Mauryan Empire",120,"Kujula Kadphises used grand royal titles such as Maharajadhiraja; this material also lists Dharmamitra among his titles.","कुजुल कडफिसेस ने महाराजाधिराज जैसी उच्च राजकीय उपाधियाँ धारण कीं; इस सामग्री में धर्ममित्र को भी उसकी उपाधियों में रखा गया है।");
E("9. Post Mauryan Empire",121,"Chinese historical accounts use the name 'Shen-tee' for the Indian territory connected here with Vima Kadphises' expansion.","चीनी ऐतिहासिक विवरणों में विम कडफिसेस के विस्तार से जुड़े भारतीय क्षेत्र के लिए यहाँ 'शेन-टी' नाम दिया गया है।");
E("9. Post Mauryan Empire",122,"Vima Kadphises extended Kushan control across the Indus into important north-western centres including Taxila and parts of Punjab.","विम कडफिसेस ने सिंधु पार करके तक्षशिला और पंजाब के हिस्सों सहित महत्वपूर्ण उत्तर-पश्चिमी क्षेत्रों पर कुषाण नियंत्रण बढ़ाया।");
E("9. Post Mauryan Empire",123,"Vima Kadphises' coinage used a bilingual design tradition: Greek script appeared on one side and Kharoshthi on the other.","विम कडफिसेस के सिक्कों में द्विभाषी परंपरा दिखाई देती है—एक ओर यूनानी लिपि और दूसरी ओर खरोष्ठी लिपि का प्रयोग मिलता है।");
E("9. Post Mauryan Empire",128,"The 4th Buddhist Council associated with Kanishka is generally placed in the 1st century CE in this material.","कनिष्क से जुड़ी चौथी बौद्ध संगीति को इस सामग्री में सामान्यतः पहली शताब्दी ईस्वी में रखा गया है।");
E("9. Post Mauryan Empire",132,"Ashwaghosha is listed here as the vice-president of the 4th Buddhist Council, while Vasumitra served as president.","यहाँ चौथी बौद्ध संगीति के उपाध्यक्ष के रूप में अश्वघोष और अध्यक्ष के रूप में वसुमित्र का उल्लेख है।");
E("9. Post Mauryan Empire",151,"Rudradaman's Junagadh inscription, dated to about 150 CE, is important as one of the earliest extensive inscriptions composed in polished classical Sanskrit prose.","रुद्रदामन का लगभग 150 ईस्वी का जूनागढ़ अभिलेख परिष्कृत शास्त्रीय संस्कृत गद्य में लिखे गए सबसे प्रारंभिक विस्तृत अभिलेखों में से एक माना जाता है।");
E("9. Post Mauryan Empire",182,"Vima Kadphises is associated with Shaivism and the title Maheshwara; Shaiva symbols also appear on his coins.","विम कडफिसेस को शैव धर्म और महेश्वर उपाधि से जोड़ा जाता है; उसके सिक्कों पर भी शैव प्रतीक मिलते हैं।");
E("9. Post Mauryan Empire",188,"Rudradaman's Junagadh inscription, dated to about 150 CE, is important as one of the earliest extensive inscriptions composed in polished classical Sanskrit prose.","रुद्रदामन का लगभग 150 ईस्वी का जूनागढ़ अभिलेख परिष्कृत शास्त्रीय संस्कृत गद्य में लिखे गए सबसे प्रारंभिक विस्तृत अभिलेखों में से एक माना जाता है।");

// 10. Gupta Empire
E("10. Gupta Empire",4,"Shri Gupta is regarded as the dynastic founder, but Chandragupta I is often called the real founder of Gupta imperial power because his reign marks the dynasty's major political expansion and the start of the Gupta Era.","श्रीगुप्त को वंश का संस्थापक माना जाता है, लेकिन गुप्त साम्राज्य की वास्तविक साम्राज्यवादी शक्ति के संस्थापक के रूप में चंद्रगुप्त प्रथम को कहा जाता है; उसके शासन से बड़े राजनीतिक विस्तार और गुप्त संवत की शुरुआत जुड़ी है।");
E("10. Gupta Empire",15,"Chandragupta II is best known by the title Vikramaditya, which became closely associated with his reign and later tradition.","चंद्रगुप्त द्वितीय की प्रसिद्ध उपाधि विक्रमादित्य थी, जो उसके शासन और बाद की परंपरा से विशेष रूप से जुड़ी।");
E("10. Gupta Empire",37,"During Samudragupta's southern campaign, his army advanced as far as Kanchi in present-day Tamil Nadu before the defeated southern rulers were restored under his suzerainty.","समुद्रगुप्त के दक्षिणी अभियान में उसकी सेना वर्तमान तमिलनाडु के कांची तक पहुँची; पराजित दक्षिणी शासकों को उसकी अधीनता स्वीकार कराने के बाद उनके राज्य वापस कर दिए गए।");
E("10. Gupta Empire",39,"Chandragupta II is dated here to approximately 380-412 CE, the period of major Gupta expansion in western India.","यहाँ चंद्रगुप्त द्वितीय का शासन लगभग 380-412 ईस्वी माना गया है; इसी काल में पश्चिमी भारत में गुप्त शक्ति का बड़ा विस्तार हुआ।");
E("10. Gupta Empire",141,"The Udayagiri Varaha relief is associated with the reign and patronage of Chandragupta II.","उदयगिरि की वराह प्रतिमा/शैल-उत्कीर्णन को चंद्रगुप्त द्वितीय के शासन और संरक्षण से जोड़ा जाता है।");
E("10. Gupta Empire",142,"The Udayagiri Varaha image represents Vishnu in his Varaha, or boar, incarnation rescuing the Earth.","उदयगिरि की वराह प्रतिमा विष्णु के वराह अवतार को दर्शाती है, जिसमें वे पृथ्वी का उद्धार करते हैं।");

// 11. Post Gupta Empire
E("11. Post Gupta Empire",95,"The Vesara style developed prominently in the Deccan, with important early examples at Aihole, Badami and Pattadakal in present-day Karnataka.","वेसर शैली का प्रमुख विकास दक्कन में हुआ; वर्तमान कर्नाटक के ऐहोल, बादामी और पट्टदकल इसके महत्वपूर्ण प्रारंभिक केंद्र हैं।");
E("11. Post Gupta Empire",133,"In this material, Skandagupta is named as the officer in charge of Harsha's elephant corps; this is an official's name and should not be confused with the Gupta emperor Skandagupta.","इस सामग्री में हर्ष की हाथी-सेना के प्रमुख अधिकारी का नाम स्कंदगुप्त दिया गया है; इसे गुप्त सम्राट स्कंदगुप्त से भ्रमित नहीं करना चाहिए।");

// Structural validation of all 2,216 Ancient History questions
let total=0;
for(const [,secs] of Object.entries(anc)){
  for(const sec of secs) for(const q of sec.questions||[]){
    total++;
    if(!q.q?.en || !q.q?.hi || !q.exp?.en || !q.exp?.hi) throw new Error('Empty bilingual field');
    if((q.o||[]).length!==4) throw new Error('Question without 4 options: '+q.q.en);
    if(!q.o.some(o=>o.en===q.a.en)) throw new Error('Correct answer missing from options: '+q.q.en);
    const en=q.o.map(o=>o.en.trim().toLowerCase());
    const hi=q.o.map(o=>o.hi.trim());
    if(new Set(en).size!==4 || new Set(hi).size!==4) throw new Error('Duplicate option: '+q.q.en);
  }
}
if(total!==2216) throw new Error('Unexpected Ancient History question count: '+total);
if(changed.length!==65) throw new Error('Unexpected patch count: '+changed.length);

const json=JSON.stringify(data);
const replacement=startTag+'\n'+json+'\n'+endTag;
const out=src.slice(0,start)+replacement+src.slice(end+endTag.length);
JSON.parse(json);
fs.writeFileSync(file,out,'utf8');
console.log('Patched '+changed.length+' Ancient History entries; validated '+total+' questions.');
