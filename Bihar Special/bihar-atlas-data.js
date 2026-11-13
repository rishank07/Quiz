/* Bihar-only atlas data for the shared map engine. Coordinates are study references. */
(() => {
  'use strict';
  const base = window.MAPPING_DATA;
  const old = window.BIHAR_GK;
  const shapeData = window.BIHAR_DISTRICTS;
  const lessons = window.BiharAtlasLessons;
  const pdf = page => ({id:'bihar-pdf', page});
  const pair = text => {
    const [en, hi] = text.split('|');
    return {en, hi};
  };
  const topics = [
    ['all','All topics','सभी विषय','▦'], ['rivers','Rivers','नदियाँ','≈'],
    ['districts','Districts','जिले','▤'], ['divisions','Divisions','प्रमंडल','◈'],
    ['physical','Landforms & irrigation','स्थलरूप और सिंचाई','▲'], ['population','Population & communities','जनसंख्या और समुदाय','◎'],
    ['nature','Forests & wetlands','वन और आर्द्रभूमियाँ','✿'], ['ancient','Ancient history','प्राचीन इतिहास','◆'],
    ['medieval','Medieval history','मध्यकालीन इतिहास','▧'], ['modern','Modern history','आधुनिक इतिहास','✦'],
    ['culture','Culture & GI','संस्कृति और जीआई','✣'], ['economy','Economy & transport','अर्थव्यवस्था और परिवहन','▥']
  ].map(([id,en,hi,icon]) => ({id,en,hi,icon}));

  function unproject(x, y) {
    return [83.32013078+(x-25)/167.03911, 27.52124872-(y-24)/185.554];
  }
  const districtKey = code => 'br-d-' + code;
  const divisionKey = id => 'br-v-' + id;
  const districtSource = pdf(6);
  const divisions = old.divisions.map(([id,name,hi]) => ({id:divisionKey(id),key:id,name,hi}));
  const districts = old.districts.map(([code,name,hi,key,hq=name,hqHi=hi]) => {
    const [x,y,d] = shapeData[code];
    const [lon,lat] = unproject(x,y);
    const path = d.replace(/(-?[\d.]+),(-?[\d.]+)/g, (_,a,b) => {
      const [lon,lat] = unproject(Number(a),Number(b));
      return lon.toFixed(4)+','+(-lat).toFixed(4);
    });
    const division = divisions.find(v => v.key===key);
    const notes = old.districtFacts[code];
    return {id:districtKey(code), code, region:'Bihar', topic:'districts', name, hi, lon, lat, path, hq, hqHi,
      division:division.id, area:division.name+' division', areaHi:division.hi+' प्रमंडल', source:districtSource,
      fact:'District headquarters: '+hq+'.'+(notes?' '+notes[0]:''), factHi:'जिला मुख्यालय '+hqHi+' है।'+(notes?' '+notes[1]:'')};
  });
  const byDistrict = new Map(districts.map(d => [d.code,d]));
  const hqCodes = {patna:212,saran:218,tirhut:208,purnia:214,bhagalpur:192,darbhanga:195,kosi:216,magadh:196,munger:207};
  divisions.forEach(d => {
    const hq = byDistrict.get(hqCodes[d.key]);
    const members = districts.filter(x => x.division===d.id);
    Object.assign(d,{name:d.name+' Division',hi:d.hi+' प्रमंडल',shortName:d.name,shortHi:d.hi,region:'Bihar',topic:'divisions',
      lon:hq.lon,lat:hq.lat,area:'Bihar',areaHi:'बिहार',source:districtSource,members:members.map(x=>x.id),hq:hq.hq,hqHi:hq.hqHi,
      fact:'Headquarters: '+hq.hq+'. Districts: '+members.map(x=>x.name).join(', ')+'.',
      factHi:'मुख्यालय '+hq.hqHi+' है। जिले: '+members.map(x=>x.hi).join(', ')+'।'});
  });

  const overview = {id:'br-overview',region:'Bihar',topic:'districts',name:'Bihar at a glance',hi:'बिहार एक नज़र',
    area:'Statewide',areaHi:'पूरा राज्य',lon:85.7,lat:25.9,statewide:true,source:pdf(6),
    fact:'Bihar has 38 districts and nine divisions. Patna is the capital. The Ganga flows across the state from west to east.',
    factHi:'बिहार में 38 जिले और नौ प्रमंडल हैं। राजधानी पटना है। गंगा राज्य में पश्चिम से पूर्व बहती है।'};

  const historyTopics = {kumhrar:'ancient',nalanda:'ancient',rajgir:'ancient',pawapuri:'ancient','bodh-gaya':'ancient',
    barabar:'ancient',vaishali:'ancient',kesaria:'ancient',vikramshila:'ancient',sasaram:'medieval',chausa:'medieval'};
  const topicOf = {history:'modern',geography:'physical',culture:'culture',nature:'nature',economy:'economy'};
  function place([id, topic, district, lon, lat, name, hi, fact, factHi, page, region, regionHi]) {
    const d = byDistrict.get(district);
    return {id, topic:historyTopics[id] || topicOf[topic] || topic, region:'Bihar', district:d?.id, lon, lat, name, hi,
      fact, factHi, area:region||d?.name||'Bihar', areaHi:regionHi||d?.hi||'बिहार',
      source:page ? pdf(page) : {id:'bihar-atlas',page:0}};
  }
  const extraPlaces = [
    ['patna-college','modern',212,85.169,25.62,'Patna College','पटना कॉलेज','The Bihar and Orissa Legislative Council first met here in 1913.','बिहार और उड़ीसा विधान परिषद की पहली बैठक यहाँ 1913 में हुई।',7],
    ['someshwar','physical',211,84.51,27.31,'Someshwar Range','सोमेश्वर श्रेणी','The Himalayan foothill ridge follows part of the Nepal border.','हिमालय की तलहटी की यह श्रेणी नेपाल सीमा के एक भाग के साथ है।',10],
    ['ramnagar','physical',211,84.29,27.23,'Ramnagar Dun','रामनगर दून','A foothill valley in northwestern Bihar.','उत्तर-पश्चिमी बिहार की तलहटी की घाटी।',10],
    ['maner','medieval',212,84.88,25.65,'Maner','मनेर','Maner is near the Son–Ganga confluence and appears in medieval accounts of the approach to Patna.','मनेर सोन–गंगा संगम के पास है और मध्यकालीन विवरणों में पटना के मार्ग पर आता है।',56],
    ['sultanganj','physical',192,86.73,25.25,'Sultanganj','सुल्तानगंज','The western end of the Ganga reach protected by the Vikramshila Dolphin Sanctuary.','विक्रमशिला डॉल्फिन अभयारण्य में संरक्षित गंगा के हिस्से का पश्चिमी सिरा।',32],
    ['kahalgaon','physical',192,87.23,25.27,'Kahalgaon','कहलगाँव','The eastern end of the protected dolphin reach. Vikramshila’s ruins are nearby.','डॉल्फिन वाले संरक्षित भाग का पूर्वी सिरा। पास में विक्रमशिला के अवशेष हैं।',32],
    ['kursela','physical',201,87.25,25.39,'Kursela','कुरसेला','The Kosi meets the Ganga near this town.','इस नगर के पास कोसी गंगा से मिलती है।',13],
    ['fatuha','physical',212,85.31,25.51,'Fatuha','फतुहा','The Punpun joins the Ganga near Fatuha.','फतुहा के पास पुनपुन गंगा से मिलती है।',14],
    ['sitakund','physical',207,86.53,25.38,'Sitakund hot spring','सीताकुंड गर्म जलकुंड','A hot spring near Munger.','मुंगेर के पास गर्म जलकुंड।',14],
    ['indrapuri','physical',215,84.14,24.86,'Indrapuri Barrage','इंद्रपुरी बैराज','The barrage across the Son feeds the canal network.','सोन पर बना बैराज नहर तंत्र को पानी देता है।',17],
    ['mandal-dam','physical',null,84.11,23.69,'Mandal Dam','मंडल बाँध','Part of the inter-state North Koel irrigation project.','अंतरराज्यीय उत्तरी कोयल सिंचाई परियोजना का भाग।',17,'Jharkhand','झारखंड'],
    ['banjari','economy',215,83.97,24.67,'Banjari cement works','बंजारी सीमेंट कारखाना','A cement-industry site in the Rohtas limestone belt.','रोहतास की चूना पत्थर पट्टी का सीमेंट उद्योग स्थल।',28],
    ['karmatia','economy',198,86.23,24.77,'Karmatia mineral belt','करमटिया खनिज क्षेत्र','Reported gold mineralisation in the Jamui district; marker shows the district study area.','जमुई में स्वर्ण खनिजीकरण की रिपोर्ट है। चिह्न जिला अध्ययन क्षेत्र को दिखाता है।',26],
    ['marhaura','economy',218,84.87,25.97,'Marhaura','मढ़ौरा','Associated with an early sugar mill and later industry.','शुरुआती चीनी मिल और बाद के उद्योग से जुड़ा।',28],
    ['simri-lake','nature',216,86.59,25.72,'Simri Bakhtiyarpur lake area','सिमरी बख्तियारपुर झील क्षेत्र','The source maps this lake area within Saharsa.','स्रोत इस झील क्षेत्र को सहरसा में दिखाता है।',31],
    ['chirand','ancient',218,84.85,25.74,'Chirand','चिरांद','Prehistoric archaeological site near the Ganga–Ghaghara confluence.','गंगा–घाघरा संगम के पास प्रागैतिहासिक पुरातात्त्विक स्थल।',37],
    ['chechar','ancient',224,85.36,25.65,'Chechar','चेचर','Archaeological site on the northern side of the Ganga.','गंगा के उत्तरी किनारे का पुरातात्त्विक स्थल।',37],
    ['champa','ancient',192,86.92,25.25,'Champa / Champanagar','चंपा / चंपानगर','The capital of Anga is associated with the Champanagar area near Bhagalpur.','अंग की राजधानी भागलपुर के पास चंपानगर क्षेत्र से जुड़ी है।',38],
    ['lauriya-araraj','ancient',213,84.68,26.55,'Lauriya Araraj','लौरिया अरेराज','Ashokan pillar site in East Champaran.','पूर्वी चंपारण का अशोक स्तंभ स्थल।',50],
    ['lauriya-nandangarh','ancient',211,84.40,26.99,'Lauriya Nandangarh','लौरिया नंदनगढ़','Ashokan pillar and mound site in West Champaran.','पश्चिम चंपारण का अशोक स्तंभ और टीला स्थल।',50],
    ['rampurva','ancient',211,84.54,27.27,'Rampurva','रामपुरवा','Site of two Ashokan pillars near the Nepal frontier.','नेपाल सीमा के पास दो अशोक स्तंभों का स्थल।',50],
    ['odantapuri','medieval',209,85.52,25.20,'Odantapuri area','ओदंतपुरी क्षेत्र','The Buddhist learning centre is generally placed in the Bihar Sharif area.','बौद्ध शिक्षा केंद्र सामान्यतः बिहार शरीफ क्षेत्र में माना जाता है।',53],
    ['bihar-sharif','medieval',209,85.51,25.19,'Bihar Sharif','बिहार शरीफ','Associated with the Sufi saint Sharafuddin Yahya Maneri.','सूफी संत शरफुद्दीन याह्या मनेरी से जुड़ा।',57],
    ['rohtasgarh','medieval',215,83.92,24.63,'Rohtasgarh Fort','रोहतासगढ़ किला','A hill fort in the Kaimur uplands above the Son valley.','सोन घाटी के ऊपर कैमूर उच्चभूमि का पहाड़ी किला।',59],
    ['danapur','modern',212,85.04,25.64,'Danapur Cantonment','दानापुर छावनी','Rebels from Danapur joined the 1857 resistance in the Shahabad area.','दानापुर के विद्रोही 1857 में शाहाबाद क्षेत्र के प्रतिरोध से जुड़े।',64],
    ['pir-ali','modern',212,85.18,25.62,'Pir Ali Khan, Patna','पीर अली खान, पटना','Patna remembers Pir Ali Khan for his role in the 1857 uprising.','पटना में पीर अली खान को 1857 के विद्रोह में उनकी भूमिका के लिए याद किया जाता है।',64],
    ['bhognadih','modern',null,87.62,24.88,'Bhognadih','भोगनाडीह','Associated with the Santhal Hul in the then undivided region.','तत्कालीन अविभाजित क्षेत्र में संथाल हूल से जुड़ा स्थल।',63,'Jharkhand','झारखंड'],
    ['bankipore','modern',212,85.15,25.61,'Bankipore','बाँकीपुर','Site of the 1912 Indian National Congress session in Patna.','पटना में 1912 के भारतीय राष्ट्रीय कांग्रेस अधिवेशन का स्थल।',65],
    ['gaya-congress','modern',196,85.005,24.79,'Gaya Congress session','गया कांग्रेस अधिवेशन','Gaya hosted the 1922 session of the Indian National Congress.','गया में 1922 का भारतीय राष्ट्रीय कांग्रेस अधिवेशन हुआ।',65],
    ['bhagalpur-conference','modern',192,87.00,25.24,'Bhagalpur Provincial Conference','भागलपुर प्रांतीय सम्मेलन','Bhagalpur hosted the second Bihar Provincial Conference in 1909.','भागलपुर में 1909 में दूसरा बिहार प्रांतीय सम्मेलन हुआ।',65],
    ['bhitiharwa','modern',211,84.48,27.24,'Bhitiharwa Ashram','भितिहरवा आश्रम','A Champaran Satyagraha site associated with Gandhi’s educational work.','गांधीजी के शिक्षा कार्य से जुड़ा चंपारण सत्याग्रह स्थल।',67],
    ['bihar-vidyapeeth','modern',212,85.098,25.63,'Bihar Vidyapeeth','बिहार विद्यापीठ','A national education centre inaugurated by Gandhi in 1921. The map marks its Sadaqat Ashram campus.','1921 में गांधीजी द्वारा उद्घाटित राष्ट्रीय शिक्षा केंद्र। मानचित्र पर सदाकत आश्रम का परिसर चिह्नित है।',68],
    ['bihta','modern',212,84.87,25.56,'Bihta and the Kisan Sabha','बिहटा और किसान सभा','Sahajanand Saraswati’s ashram is linked to peasant organisation.','सहजानंद सरस्वती का आश्रम किसान संगठन से जुड़ा है।',70],
    ['rajgir-ropeway','economy',209,85.445,25.004,'Rajgir Ropeway','राजगीर रोपवे','Connects visitors to the Ratnagiri hill area in Rajgir.','राजगीर में यात्रियों को रत्नागिरि पहाड़ी क्षेत्र तक ले जाता है।',78],
    ['raxaul','economy',213,84.85,26.98,'Raxaul','रक्सौल','Border town and named endpoint of the proposed Raxaul–Haldia corridor.','सीमावर्ती नगर और प्रस्तावित रक्सौल–हल्दिया गलियारे का नामित सिरा।',79],
    ['patna-airport','economy',212,85.09,25.59,'Patna Airport','पटना हवाई अड्डा','Named after Jayaprakash Narayan.','जयप्रकाश नारायण के नाम पर है।',78],
    ['darbhanga-airport','economy',195,85.92,26.19,'Darbhanga Airport','दरभंगा हवाई अड्डा','Civil air link serving the Darbhanga and Mithila region.','दरभंगा और मिथिला क्षेत्र के लिए नागरिक हवाई संपर्क।',78],
    ['simaria','culture',191,86.00,25.37,'Simaria Ghat','सिमरिया घाट','A Ganga bank fair site in Begusarai.','बेगूसराय में गंगा तट पर मेला स्थल।',86],
    ['saurath','culture',206,86.03,26.39,'Saurath Sabha','सौराठ सभा','Traditional Maithil gathering in Madhubani district.','मधुबनी जिले का पारंपरिक मैथिल आयोजन।',86],
    ['sitatdiara','modern',218,84.56,25.75,'Sitab Diara','सिताब दियारा','The riverine birthplace associated with Jayaprakash Narayan.','जयप्रकाश नारायण से जुड़ा नदी तटीय जन्मस्थल।',88],
    ['silao','culture',209,85.43,25.08,'Silao Khaja','सिलाव खाजा','A layered sweet with a GI registration associated with Silao.','सिलाव से जुड़ी जीआई पंजीकृत परतदार मिठाई।',89],
    ['manjusha','culture',192,86.997,25.259,'Manjusha art','मंजूषा कला','A Bhagalpur folk art associated with the Bihula story.','बिहुला कथा से जुड़ी भागलपुर की लोककला।',89],
    ['katarni','culture',192,87.14,25.16,'Katarni rice region','कतरनी चावल क्षेत्र','An aromatic rice associated with the Bhagalpur–Banka belt.','भागलपुर–बांका क्षेत्र से जुड़ा सुगंधित चावल।',89],
    ['magahi-paan','culture',196,85.18,24.91,'Magahi Paan region','मगही पान क्षेत्र','A betel leaf associated with the Magadh belt.','मगध क्षेत्र से जुड़ा पान पत्ता।',89],
    ['zardalu','culture',192,86.85,25.24,'Zardalu mango region','जर्दालु आम क्षेत्र','An aromatic mango associated with Bhagalpur.','भागलपुर से जुड़ा सुगंधित आम।',89]
  ];
  const places = [...old.places, ...extraPlaces].map(place);

  const riverMeta = {
    ganga: [
      'Gaumukh, Gangotri Glacier; Ganga named after the Devprayag confluence|गोमुख, गंगोत्री हिमनद; देवप्रयाग के संगम के बाद गंगा नाम',
      'Uttarakhand → Uttar Pradesh → Chausa → Patna → Munger → Bhagalpur → Bengal delta|उत्तराखंड → उत्तर प्रदेश → चौसा → पटना → मुंगेर → भागलपुर → बंगाल डेल्टा',
      'Bay of Bengal via the Padma–Meghna delta|पद्मा–मेघना डेल्टा से बंगाल की खाड़ी',
      'Gandak, Ghaghara, Burhi Gandak and Kosi from the north; Son, Punpun and Karmanasa from the south.|उत्तर से गंडक, घाघरा, बूढ़ी गंडक और कोसी; दक्षिण से सोन, पुनपुन और कर्मनाशा।',
      [79.08,30.93],[90.58,22.2], 'chausa maner sonepur fatuha simaria munger-fort sultanganj kahalgaon kursela',
      [[78.60,30.15],[78.28,30.10],[78.16,29.95]]],
    ghaghara: ['Himalayan headwaters on the Tibetan–Nepal side|तिब्बत–नेपाल की ओर हिमालयी स्रोत क्षेत्र','Karnali in Nepal → Uttar Pradesh → Chhapra|नेपाल में कर्णाली → उत्तर प्रदेश → छपरा','Ganga near Chhapra|छपरा के पास गंगा','The Ayodhya reach is called Sarayu.|अयोध्या का भाग सरयू कहलाता है।',[81.30,30.50],[84.66,25.75],'br-d-218 chirand',[[81.3,29],[81.1,28],[82.2,26.8]]],
    gandak: ['Nepal Himalayan headstreams, including the Kali Gandaki system|नेपाल हिमालय की स्रोत धाराएँ, जिनमें काली गंडकी तंत्र है','Narayani in Nepal → Valmikinagar → northwest Bihar → Sonpur|नेपाल में नारायणी → वाल्मीकिनगर → उत्तर-पश्चिम बिहार → सोनपुर','Ganga near Sonpur–Hajipur|सोनपुर–हाजीपुर के पास गंगा','The Gandak Barrage feeds the Triveni canals.|गंडक बैराज त्रिवेणी नहरों को पानी देता है।',[83.80,29.10],[85.18,25.66],'valmikinagar valmiki sonepur br-d-224',[[83.7,28.37],[84.13,27.93]]],
    'burhi-gandak': ['Chautarwa Chaur, West Champaran|चौतरवा चौर, पश्चिम चंपारण','Champaran → Muzaffarpur → Samastipur → Khagaria|चंपारण → मुजफ्फरपुर → समस्तीपुर → खगड़िया','Ganga in the Khagaria area|खगड़िया क्षेत्र में गंगा','The Burhi Gandak is a separate channel from the Gandak.|बूढ़ी गंडक का प्रवाह गंडक से अलग है।',[84.29,27.05],[86.53,25.50],'br-d-208 pusa kabartal br-d-202',[]],
    bagmati: ['Shivapuri hills near Kathmandu|काठमांडू के पास शिवपुरी पहाड़ियाँ','Nepal → Sitamarhi → Sheohar → lower Bagmati|नेपाल → सीतामढ़ी → शिवहर → निचली बागमती','Kosi system near Badlaghat|बदलाघाट के पास कोसी तंत्र','The lower basin is linked to the Adhwara and Kamla–Balan systems.|निचला बेसिन अधवारा और कमला–बलान तंत्र से जुड़ा है।',[85.28,27.78],[86.59,25.66],'br-d-221 br-d-220 kusheshwar',[[85.31,27.65],[85.47,27.15]]],
    kamla: ['Mahabharat Range near Sindhuli, Nepal|नेपाल के सिंधुली के पास महाभारत श्रेणी','Nepal → Jaynagar → Madhubani → lower Mithila plain|नेपाल → जयनगर → मधुबनी → निचला मिथिला मैदान','Kareh–Bagmati near Badlaghat|बदलाघाट के पास करेह–बागमती','The Kamla enters India near Jaynagar.|कमला जयनगर के पास भारत में प्रवेश करती है।',[85.95,27.25],[86.52,25.71],'br-d-206 kusheshwar',[[86.09,26.99],[86.23,26.78]]],
    kosi: ['Sapta Kosi Himalayan headstreams in Nepal and Tibet|नेपाल और तिब्बत में सप्तकोसी की हिमालयी स्रोत धाराएँ','Nepal → Kosi Barrage → north Bihar alluvial fan → Kursela|नेपाल → कोसी बैराज → उत्तर बिहार का जलोढ़ पंख → कुरसेला','Ganga near Kursela, Katihar|कटिहार के कुरसेला के पास गंगा','The alluvial fan records shifts in the course. The Kosi project includes the Rajpur Canal.|जलोढ़ पंख में नदी के मार्ग में आए बदलाव दिखाई देते हैं। कोसी परियोजना में राजपुर नहर शामिल है।',[87.20,27.80],[87.26,25.40],'bhimnagar br-d-223 br-d-216 kursela',[[87.29,27.34],[87.17,26.95]]],
    mahananda: ['Darjeeling Hills, West Bengal|दार्जिलिंग की पहाड़ियाँ, पश्चिम बंगाल','Siliguri → eastern Bihar → West Bengal → Bangladesh|सिलीगुड़ी → पूर्वी बिहार → पश्चिम बंगाल → बांग्लादेश','Ganga / Padma near Godagari, Bangladesh|बांग्लादेश के गोदागाड़ी के पास गंगा / पद्मा','Bihar’s eastern reach crosses the Kishanganj–Purnia–Katihar belt.|बिहार का पूर्वी भाग किशनगंज–पूर्णिया–कटिहार क्षेत्र से गुजरता है।',[88.40,26.95],[88.33,24.47],'br-d-203 br-d-214 br-d-201',[[88.42,26.71],[88.23,26.53]],[[88.10,25.00],[88.15,24.74]]],
    son: ['Amarkantak, Madhya Pradesh|अमरकंटक, मध्य प्रदेश','Central Indian uplands → Rohtas → Maner|मध्य भारत की उच्चभूमि → रोहतास → मनेर','Ganga near Maner|मनेर के पास गंगा','Indrapuri Barrage and the eastern and western Son canals are connected to this river.|इंद्रपुरी बैराज और पूर्वी व पश्चिमी सोन नहरें इस नदी से जुड़ी हैं।',[81.76,22.70],[84.98,25.70],'rohtasgarh indrapuri dehri maner',[[81.42,23.30],[81.31,24.08],[82.36,24.49],[83.05,24.49]]],
    punpun: ['Palamu plateau area, Jharkhand|पलामू का पठारी क्षेत्र, झारखंड','Jharkhand → southern Bihar plain → Fatuha|झारखंड → दक्षिण बिहार का मैदान → फतुहा','Ganga at Fatuha|फतुहा में गंगा','The river enters the Ganga downstream of Patna city.|नदी पटना शहर से आगे गंगा में मिलती है।',[84.35,24.45],[85.32,25.52],'fatuha br-d-189 br-d-212',[[84.38,24.54]]],
    karmanasa: ['Kaimur uplands|कैमूर उच्चभूमि','Kaimur → Bihar–Uttar Pradesh boundary → Chausa|कैमूर → बिहार–उत्तर प्रदेश सीमा → चौसा','Ganga near Chausa|चौसा के पास गंगा','A south-bank tributary near Bihar’s western approach.|बिहार के पश्चिमी प्रवेश क्षेत्र में दक्षिणी तट की सहायक नदी।',[83.62,24.66],[83.86,25.52],'kaimur chausa br-d-194',[[83.48,24.88],[83.36,25.10],[83.62,25.32],[83.76,25.40]]],
    falgu: ['Niranjana and Mohana confluence near Bodh Gaya|बोधगया के पास निरंजना और मोहाना का संगम','Bodh Gaya → Gaya → north through the South Bihar plain|बोधगया → गया → दक्षिण बिहार के मैदान से उत्तर की ओर','Punpun drainage system in the northern plain|उत्तरी मैदान में पुनपुन अपवाह तंत्र','The river is associated with pilgrimage in the Gaya region.|नदी का संबंध गया क्षेत्र की तीर्थ परंपरा से है।',[85.01,24.71],[85.02,25.41],'bodh-gaya br-d-196 br-d-199',[[85.01,24.80],[85.07,24.96],[85.06,25.13],[85.01,25.30]]],
    kiul: ['Jharkhand plateau uplands|झारखंड की पठारी उच्चभूमि','Jamui → Lakhisarai → Kiul–Harohar drainage|जमुई → लखीसराय → किऊल–हरोहर अपवाह','Ganga system in the Surajgarha area|सूरजगढ़ा क्षेत्र में गंगा तंत्र','The Kiul–Harohar basin drains parts of the South Bihar plain.|किऊल–हरोहर बेसिन दक्षिण बिहार के मैदान के कुछ हिस्सों का जल निकालता है।',[86.18,24.30],[86.20,25.31],'br-d-198 br-d-204',[[86.37,24.58],[86.31,24.85],[86.10,25.17],[86.18,25.25]]],
    ajay: ['Southern Bihar uplands near the Jharkhand border|झारखंड सीमा के पास दक्षिण बिहार की उच्चभूमि','Southern Bihar → Jharkhand → West Bengal|दक्षिण बिहार → झारखंड → पश्चिम बंगाल','Bhagirathi in West Bengal|पश्चिम बंगाल में भागीरथी','A southeastern drainage connection from the plateau belt.|पठारी क्षेत्र से दक्षिण-पूर्वी अपवाह संबंध।',[86.31,24.44],[88.13,23.64],'br-d-198 br-d-190',[[86.66,24.35],[86.80,24.08],[87.15,23.76],[87.62,23.59]]]
  };

  const oldRivers = new Map(old.rivers.map(row=>[row[0],row]));
  const names = {karmanasa:'Karmanasa|कर्मनाशा',falgu:'Falgu|फल्गु',kiul:'Kiul|किऊल',ajay:'Ajay|अजय'};
  const riverFeatures = Object.entries(riverMeta).map(([id,[origin,route,mouth,connections,start,end,linked,upstream,downstream=[]]]) => {
    const oldRiver = oldRivers.get(id);
    const [name,hi] = oldRiver ? oldRiver.slice(1,3) : names[id].split('|');
    const local = id==='ganga' ? window.BIHAR_GANGA : oldRiver?.[5]||[];
    const line = [start,...upstream,...local,...downstream,end];
    if(id!=='ganga') base.rivers.push({id,schematic:true,geometry:{type:'LineString',coordinates:line}});
    const marker = local.length ? local[Math.floor(local.length/2)] : line[2];
    const [lon,lat] = id==='ganga' ? [85.3,25.57] : marker;
    const river = {origin:pair(origin),route:pair(route),mouth:pair(mouth),connections:pair(connections),start,end};
    return {id,name,hi,lon,lat,region:'Bihar',topic:'rivers',area:'Bihar drainage',areaHi:'बिहार का अपवाह तंत्र',
      fact:oldRiver?.[3]||river.route.en,factHi:oldRiver?.[4]||river.route.hi,source:pdf(id==='ganga'?12:13),related:linked.split(' '),study:{river}};
  });
  // Add the headstream and estuary connectors omitted at this scale in Natural Earth.
  base.rivers.push({id:'ganga',schematic:true,geometry:{type:'MultiLineString',coordinates:[
    [[79.08,30.93],[78.66,30.73],[78.43,30.36],[78.60,30.15],[78.28,30.10],[78.17,29.94],[78.17,29.88]],
    [[90.57,23.20],[90.64,22.88],[90.56,22.60],[90.58,22.2]]
  ]}});

  const features = [...riverFeatures, overview, ...districts, ...divisions, ...places];
  const index = new Map(features.map(f=>[f.id,f]));
  for(const lesson of lessons) {
    for(const q of lesson.questions) {
      for(const id of q.featureIds) {
        const f = index.get(id);
        if(f && f.source?.id==='bihar-atlas') f.source=q.source;
      }
    }
  }
  const chaptersByPlace = new Map();
  for (const lesson of lessons) {
    const ids = new Set([...lesson.places, ...lesson.questions.flatMap(q=>q.featureIds)]);
    for (const id of ids) {
      if (!chaptersByPlace.has(id)) chaptersByPlace.set(id, []);
      chaptersByPlace.get(id).push(lesson);
    }
  }
  const districtQuestions = districts.map((d,i) => {
    const v = index.get(d.division);
    const closest = divisions.filter(x=>x.id!==v.id)
      .sort((a,b)=>Math.hypot(d.lon-a.lon,d.lat-a.lat)-Math.hypot(d.lon-b.lon,d.lat-b.lat)).slice(0,3);
    const options = closest.map(x=>({en:x.name,hi:x.hi}));
    const answer = i%4;
    options.splice(answer,0,{en:v.name,hi:v.hi});
    return {id:'br-division-of-'+d.code,region:'Bihar',type:'source',chapter:'state-profile',topic:'districts',
      featureIds:[d.id,v.id],en:'Which division contains '+d.name+' district?',hi:d.hi+' जिला किस प्रमंडल में है?',
      options,answer,explanation:d.name+' is in '+v.name+', headquartered at '+v.hq+'.',
      explanationHi:d.hi+' जिला '+v.hi+' में है। इस प्रमंडल का मुख्यालय '+v.hqHi+' है।',source:districtSource};
  });
  const divisionQuestions = divisions.map((v,i) => {
    const closest = divisions.filter(x=>x.id!==v.id)
      .sort((a,b)=>Math.hypot(v.lon-a.lon,v.lat-a.lat)-Math.hypot(v.lon-b.lon,v.lat-b.lat)).slice(0,3);
    const options = closest.map(x=>({en:x.hq,hi:x.hqHi}));
    const answer = i%4;
    options.splice(answer,0,{en:v.hq,hi:v.hqHi});
    return {id:'br-hq-of-'+v.key,region:'Bihar',type:'source',chapter:'state-profile',topic:'divisions',
      featureIds:[v.id],en:'Where is the headquarters of '+v.name+'?',hi:v.hi+' का मुख्यालय कहाँ है?',
      options,answer,explanation:v.hq+' is the headquarters. '+v.fact.split('Districts: ')[1],
      explanationHi:v.hqHi+' इसका मुख्यालय है। '+v.factHi.split('जिले: ')[1],source:districtSource};
  });
  const seatDistricts = districts.filter(d=>d.hq!==d.name && d.code!==196);
  const headquartersQuestions = seatDistricts.map((d,i) => {
    const alternatives = seatDistricts.filter(x=>x.id!==d.id)
      .sort((a,b)=>Math.hypot(d.lon-a.lon,d.lat-a.lat)-Math.hypot(d.lon-b.lon,d.lat-b.lat)).slice(0,3);
    const options = alternatives.map(x=>({en:x.hq,hi:x.hqHi}));
    const answer = (i+2)%4;
    options.splice(answer,0,{en:d.hq,hi:d.hqHi});
    return {id:'br-district-hq-'+d.code,region:'Bihar',type:'source',chapter:'state-profile',topic:'districts',
      featureIds:[d.id],en:'Where is the headquarters of '+d.name+' district?',hi:d.hi+' जिले का मुख्यालय कहाँ है?',
      options,answer,explanation:d.fact,explanationHi:d.factHi,source:districtSource};
  });

  const stops = (...rows) => rows.map(([label,details,target])=>({label:pair(label),details:pair(details),target}));
  const tours = {
    ganga: stops(
      ['Gaumukh|गोमुख','The Bhagirathi headstream emerges from the Gangotri Glacier.|भागीरथी की स्रोत धारा गंगोत्री हिमनद से निकलती है।',[79.08,30.93]],
      ['Devprayag|देवप्रयाग','The Bhagirathi and Alaknanda meet. The downstream river takes the name Ganga.|भागीरथी और अलकनंदा मिलती हैं। इसके बाद की धारा गंगा कहलाती है।',[78.60,30.15]],
      ['Chausa|चौसा','The Karmanasa meets the Ganga on Bihar’s western approach.|बिहार के पश्चिमी प्रवेश पर कर्मनाशा गंगा में मिलती है।','chausa'],
      ['Maner|मनेर','The Son joins the Ganga from the south near Maner.|मनेर के पास सोन दक्षिण से गंगा में मिलती है।','maner'],
      ['Sonpur–Hajipur|सोनपुर–हाजीपुर','The Gandak enters the Ganga from the north.|गंडक उत्तर से गंगा में मिलती है।','sonepur'],
      ['Fatuha|फतुहा','The Punpun meets the Ganga east of Patna.|पटना के पूर्व पुनपुन गंगा में मिलती है।','fatuha'],
      ['Munger|मुंगेर','The fort overlooks the river on the south bank.|किला नदी के दक्षिणी किनारे पर है।','munger-fort'],
      ['Sultanganj|सुल्तानगंज','The protected dolphin reach starts here and extends to Kahalgaon.|संरक्षित डॉल्फिन क्षेत्र यहाँ से कहलगाँव तक है।','sultanganj'],
      ['Kahalgaon|कहलगाँव','The ruins of Vikramshila lie nearby at Antichak.|अंतीचक में विक्रमशिला के अवशेष पास में हैं।','kahalgaon'],
      ['Kursela|कुरसेला','The Kosi joins from the north in the Katihar region.|कटिहार क्षेत्र में कोसी उत्तर से मिलती है।','kursela'],
      ['Bay of Bengal|बंगाल की खाड़ी','The Padma–Meghna delta carries the waters to the sea.|पद्मा–मेघना डेल्टा जल को समुद्र तक ले जाता है।',[90.58,22.2]]),
    gandak: stops(['Himalayan headwaters|हिमालयी स्रोत','The Gandak drainage includes the Kali Gandaki system.|गंडक के अपवाह में काली गंडकी तंत्र है।',[83.8,29.1]],
      ['Valmikinagar|वाल्मीकिनगर','The barrage feeds the Triveni canals.|बैराज त्रिवेणी नहरों को पानी देता है।','valmikinagar'],
      ['Sonpur–Hajipur|सोनपुर–हाजीपुर','The Gandak meets the Ganga.|गंडक गंगा में मिलती है।','sonepur']),
    ghaghara: stops(['Tibetan–Nepal Himalayas|तिब्बत–नेपाल हिमालय','Originates near Nampa (Nepal); known as Karnali in Nepal and Sarayu in Ayodhya.|नेपाल के नम्पा से उद्गम; नेपाल में कर्णाली व अयोध्या में सरयू कहलाती है।',[81.30,30.50]],
      ['Saran Entry|सारण प्रवेश','Enters Bihar in Saran district (83 km course in Bihar).|सारण जिले से बिहार में प्रवेश (बिहार में 83 किमी लंबाई)।','br-d-218'],
      ['Chhapra Confluence|छपरा संगम','Joins the Ganga near Chhapra (Chirand nearby).|छपरा (चिरांद) के पास गंगा में मिलती है।','chirand']),
    'burhi-gandak': stops(['Chautarwa Chaur|चौतरवा चौर','Originates at Chautarwa Chaur near Someshwar Hills in West Champaran.|पश्चिम चंपारण की सोमेश्वर पहाड़ियों के पास चौतरवा चौर से उद्गम।',[84.29,27.05]],
      ['Muzaffarpur & Pusa|मुजफ्फरपुर व पूसा','Flows southeast through Champaran, Muzaffarpur and Samastipur (320 km).|चंपारण, मुजफ्फरपुर और समस्तीपुर से बहती है (320 किमी)।','pusa'],
      ['Khagaria Confluence|खगड़िया संगम','Originates and ends in Bihar, meeting the Ganga in Khagaria.|बिहार में ही उद्गम व खगड़िया में गंगा से संगम।','br-d-202']),
    bagmati: stops(['Shivapuri Range|शिवपुरी श्रेणी','Originates in the Shivapuri hills near Kathmandu, Nepal (589 km total).|नेपाल के काठमांडू के पास शिवपुरी पहाड़ियों से उद्गम (कुल 589 किमी)।',[85.28,27.78]],
      ['Sitamarhi–Sheohar|सीतामढ़ी–शिवहर','Enters Bihar via Sitamarhi and Sheohar; linked with Adhwara group.|सीतामढ़ी–शिवहर से बिहार में प्रवेश; अधवारा समूह से जुड़ी।','br-d-221'],
      ['Badlaghat Confluence|बदलाघाट संगम','Joins the Kosi system near Badlaghat.|बदलाघाट के पास कोसी तंत्र में मिलती है।','kusheshwar']),
    kamla: stops(['Mahabharat Range|महाभारत श्रेणी','Originates in the Mahabharat Range near Sindhuli, Nepal.|नेपाल के सिंधुली के पास महाभारत श्रेणी से उद्गम।',[85.95,27.25]],
      ['Jaynagar & Madhubani|जयनगर व मधुबनी','Enters India near Jaynagar and flows across the Mithila plain.|जयनगर के पास प्रवेश कर मधुबनी व मिथिला मैदान में बहती है।','br-d-206'],
      ['Badlaghat Confluence|बदलाघाट संगम','Joins the Kareh–Bagmati / Kosi drainage near Badlaghat.|बदलाघाट के पास करेह–बागमती / कोसी तंत्र से मिलती है।','kusheshwar']),
    mahananda: stops(['Darjeeling Hills|दार्जिलिंग पहाड़ियाँ','Originates in Kurseong, Darjeeling Hills (West Bengal).|पश्चिम बंगाल के दार्जिलिंग (कुर्सियांग) से उद्गम।',[88.40,26.95]],
      ['Kishanganj–Purnia–Katihar|किशनगंज–पूर्णिया–कटिहार','Easternmost river of North Bihar; enters via Kishanganj.|उत्तर बिहार की सबसे पूर्वी नदी; किशनगंज से प्रवेश।','br-d-203'],
      ['Godagari, Bangladesh|गोदागाड़ी, बांग्लादेश','Last left-bank tributary joining the Ganga/Padma in Bangladesh.|बांग्लादेश के गोदागाड़ी में गंगा/पद्मा से मिलने वाली अंतिम बाईं सहायक नदी।',[88.33,24.47]]),
    punpun: stops(['Palamu Plateau|पलामू पठार','Originates from the Chotanagpur plateau (Palamu, Jharkhand).|झारखंड के पलामू (छोटानागपुर पठार) से उद्गम।',[84.35,24.45]],
      ['Aurangabad–Arwal–Patna|औरंगाबाद–अरवल–पटना','Flows northeast across the southern Bihar plain.|दक्षिण बिहार के मैदान से उत्तर-पूर्व की ओर बहती है।','br-d-189'],
      ['Fatuha Confluence|फतुहा संगम','Joins the Ganga at Fatuha, east of Patna.|पटना के पूर्व फतुहा में गंगा से मिलती है।','fatuha']),
    falgu: stops(['Chotanagpur Plateau|छोटानागपुर पठार','Main stream Niranjana meets Mohana near Bodh Gaya to form Falgu.|मुख्य धारा निरंजना बोधगया के पास मोहाना से मिलकर फल्गु बनती है।',[85.01,24.71]],
      ['Gaya & Jehanabad|गया व जहानाबाद','Flows past Gaya (major Pitru Paksha pilgrimage river) and Jehanabad.|गया (पितृपक्ष तीर्थ) और जहानाबाद से होकर बहती है।','bodh-gaya'],
      ['Punpun Basin|पुनपुन बेसिन','Merges into the Punpun drainage system in the south Bihar plain.|दक्षिण बिहार के मैदान में पुनपुन अपवाह तंत्र में मिलती है।',[85.02,25.41]]),
    kosi: stops(['Sapta Kosi headstreams|सप्तकोसी की स्रोत धाराएँ','Several Himalayan streams feed the Kosi system.|कई हिमालयी धाराएँ कोसी तंत्र को जल देती हैं।',[87.2,27.8]],
      ['Kosi Barrage|कोसी बैराज','The barrage is near Bhimnagar on the India–Nepal border area.|बैराज भारत–नेपाल सीमा क्षेत्र में भीमनगर के पास है।','bhimnagar'],
      ['Kursela|कुरसेला','The Kosi joins the Ganga in the Katihar region.|कटिहार क्षेत्र में कोसी गंगा में मिलती है।','kursela']),
    son: stops(['Amarkantak|अमरकंटक','The Son rises in the Amarkantak upland.|सोन अमरकंटक उच्चभूमि से निकलती है।',[81.76,22.70]],
      ['Indrapuri|इंद्रपुरी','The barrage is connected to the eastern and western Son canal network.|बैराज पूर्वी और पश्चिमी सोन नहर तंत्र से जुड़ा है।','indrapuri'],
      ['Maner|मनेर','The river joins the Ganga west of Patna.|नदी पटना के पश्चिम में गंगा से मिलती है।','maner'])
  };

  const timeline = [
    ['Ancient Mahajanapadas|प्राचीन महाजनपद','early-bihar','rajgir'],
    ['Buddhist councils|बौद्ध संगीतियाँ','buddhism','vaishali'],
    ['Mauryan Empire|मौर्य साम्राज्य','maurya','kumhrar'],
    ['Gupta period|गुप्त काल','gupta','nalanda'],
    ['Pala period|पाल काल','pala-sena','vikramshila'],
    ['Medieval Mithila|मध्यकालीन मिथिला','karnat-sultanate','mithila-painting'],
    ['1539 · Chausa|1539 · चौसा','sur-mughal','chausa'],
    ['1764 · Buxar|1764 · बक्सर','company-rule','buxar'],
    ['1857 · Jagdishpur|1857 · जगदीशपुर','uprisings','jagdishpur'],
    ['1912 · Bankipore|1912 · बाँकीपुर','province-congress','bankipore'],
    ['1917 · Champaran|1917 · चंपारण','champaran','motihari'],
    ['1942 · Patna Secretariat|1942 · पटना सचिवालय','mass-movements','secretariat']
  ].map(([label,chapter,place])=>({label:pair(label),chapter,place}));

  Object.assign(base,{scope:'bihar',topics,features,districts,divisions,lessons,
    questions:[...lessons.flatMap(l=>l.questions),...districtQuestions,...divisionQuestions,...headquartersQuestions],
    sources:[
      {id:'bihar-pdf',filename:'Bihar Special Through Map · English medium · 2nd edition (2025–26)',kind:'Supplied PDF · page numbers from the viewer',pages:91},
      {id:'bihar-atlas',filename:'ExamFusion Bihar Atlas · supplementary study notes',kind:'Editorial notes and public references'}
    ],
    meta:{sources:[
      {title:'Bihar Government district directory',url:'https://bvm.bihar.gov.in/district/'},
      {title:'Bihar Water Resources Department · river basins',url:'https://fmiscwrdbihar.gov.in/fmis/riverbasin.aspx'},
      {title:'Bihar Tourism',url:'https://tourism.bihar.gov.in/en/destinations'},
      {title:'Bihar Budget 2025–26 analysis',url:'https://prsindia.org/budgets/states/bihar-budget-analysis-2025-26'},
      {title:'Ramsar Sites Information Service',url:'https://rsis.ramsar.org/'},
      {title:'Geographical Indications Registry',url:'https://search.ipindia.gov.in/GIRPublicSearch/'}
    ]}});

  const thematicLayers = [
    {id:'none', en:'Default', hi:'सामान्य', page:'3–5', items:[]},
    {id:'borders', en:'Borders', hi:'सीमाएँ', page:'8–9', items:[
      {key:'nepal', en:'Nepal Border (7)', hi:'नेपाल सीमा (7)', light:'#b9e2d8', dark:'#2d6b62'},
      {key:'up', en:'UP Border (8)', hi:'यूपी सीमा (8)', light:'#c9d8f5', dark:'#3b5280'},
      {key:'jh', en:'Jharkhand Border (8)', hi:'झारखंड सीमा (8)', light:'#f4d3b2', dark:'#7a502d'},
      {key:'wb', en:'West Bengal (3)', hi:'पश्चिम बंगाल (3)', light:'#e5c6ea', dark:'#664373'},
      {key:'multi', en:'2-Border Corner', hi:'दोहरी सीमा जिला', light:'#f6df8f', dark:'#7d6624'},
      {key:'patna-adj', en:'Patna-Adjoining (9)', hi:'पटना से सटे (9)', light:'#d5ebc1', dark:'#3f6336'},
      {key:'internal', en:'Interior', hi:'आंतरिक जिला', light:'#e2e7e6', dark:'#36484b'}
    ]},
    {id:'rainfall', en:'Rainfall', hi:'वर्षा', page:'35', items:[
      {key:'>160', en:'> 160 cm (Highest)', hi:'> 160 सेमी (सर्वाधिक)', light:'#6eb5df', dark:'#1d5b85'},
      {key:'140-160', en:'140–160 cm', hi:'140–160 सेमी', light:'#9bd0eb', dark:'#286f94'},
      {key:'120-140', en:'120–140 cm', hi:'120–140 सेमी', light:'#cbe6f2', dark:'#387185'},
      {key:'100-120', en:'100–120 cm', hi:'100–120 सेमी', light:'#f5e2a8', dark:'#6e5d2c'},
      {key:'<100', en:'< 100 cm (Driest)', hi:'< 100 सेमी (न्यूनतम)', light:'#f0b89c', dark:'#784231'}
    ]},
    {id:'soils', en:'Soils', hi:'मिट्टी', page:'18–19', items:[
      {key:'lowland', en:'Mountain / Terai Lowland', hi:'पर्वतीय / तराई', light:'#b7d7a8', dark:'#3b5e36'},
      {key:'bhangar', en:'Bhangar / Balsundari', hi:'भांगर / बलसुंदरी', light:'#ebd79e', dark:'#6b5a2e'},
      {key:'khadar', en:'Khadar (Flood Plain)', hi:'खादर (बाढ़ मैदान)', light:'#a9d6e5', dark:'#2b5f73'},
      {key:'taal', en:'Taal Soil', hi:'ताल मिट्टी', light:'#b9c8ec', dark:'#3b4d78'},
      {key:'karail', en:'Karail-Kewal (Old Alluvial)', hi:'करैल-केवाल', light:'#d9c4e6', dark:'#59426b'},
      {key:'red-sandy', en:'Red Sandy Soil', hi:'लाल बलुई मिट्टी', light:'#f1b69e', dark:'#78412f'},
      {key:'red-yellow', en:'Red Yellow Soil', hi:'लाल-पीली मिट्टी', light:'#f3c78d', dark:'#7a5024'}
    ]},
    {id:'forests', en:'Forests', hi:'वन क्षेत्र', page:'32–34', items:[
      {key:'high', en:'High / Sanctuary Belt', hi:'सर्वाधिक वन / अभयारण्य', light:'#88cfa0', dark:'#28663f'},
      {key:'moderate', en:'Moderate Cover', hi:'मध्यम वन क्षेत्र', light:'#c4e4c1', dark:'#3c6340'},
      {key:'low', en:'Low / Minimum Cover', hi:'न्यूनतम वन क्षेत्र', light:'#efe4c4', dark:'#5c5338'}
    ]},
    {id:'floods', en:'Floods', hi:'बाढ़ क्षेत्र', page:'15', items:[
      {key:'high', en:'High Flood-Affected (North)', hi:'अधिक बाढ़ प्रभावित (उत्तर)', light:'#f2a6a2', dark:'#7d363a'},
      {key:'moderate', en:'Ganga-Bank / Moderate', hi:'गंगा तटीय / मध्यम', light:'#f6d59b', dark:'#755627'},
      {key:'low', en:'Low / Seasonal (South)', hi:'कम प्रभावित (दक्षिण)', light:'#c6e3d3', dark:'#2f5c4a'}
    ]},
    {id:'census', en:'Census 2011', hi:'जनगणना 2011', page:'22–24', items:[
      {key:'top', en:'Highest Extremes', hi:'शीर्ष जिले (साक्षरता/घनत्व/लिंगानुपात)', light:'#9bd4b5', dark:'#296b4b'},
      {key:'low', en:'Lowest Extremes', hi:'न्यूनतम जिले', light:'#f2b3b0', dark:'#7d3a3d'},
      {key:'sc-st', en:'Max / Min SC–ST', hi:'SC/ST प्रमुख जिले', light:'#d6c2ec', dark:'#574073'},
      {key:'other', en:'Other Districts', hi:'अन्य जिले', light:'#dce4e3', dark:'#35474a'}
    ]},
    {id:'resources', en:'Minerals & GI', hi:'खनिज व GI', page:'25–29, 89', items:[
      {key:'gi', en:'GI Tag Hub', hi:'GI टैग केंद्र', light:'#e7c2ef', dark:'#643e73'},
      {key:'mineral', en:'Major Mineral Belt', hi:'प्रमुख खनिज क्षेत्र', light:'#f2cc95', dark:'#785223'},
      {key:'both', en:'Both Mineral & GI / Industry', hi:'खनिज + GI / उद्योग', light:'#9dd7c6', dark:'#2b6959'},
      {key:'agri', en:'Agri / Handloom Belt', hi:'कृषि / हथकरघा', light:'#dce7e4', dark:'#35494b'}
    ]},
    {id:'expressways', en:'Expressways', hi:'एक्सप्रेसवे', page:'79', items:[
      {key:'vk', en:'Varanasi–Kolkata', hi:'वाराणसी–कोलकाता', light:'#f2be96', dark:'#7a4b25'},
      {key:'gs', en:'Gorakhpur–Siliguri', hi:'गोरखपुर–सिलीगुड़ी', light:'#a3d4ed', dark:'#285e7a'},
      {key:'pp', en:'Patna–Purnia', hi:'पटना–पूर्णिया', light:'#b7e1b5', dark:'#336638'},
      {key:'rh', en:'Raxaul–Haldia', hi:'रक्सौल–हल्दिया', light:'#dfc1ec', dark:'#5e3e70'},
      {key:'multi', en:'2+ Expressways Junction', hi:'2+ एक्सप्रेसवे जंक्शन', light:'#f6df87', dark:'#786220'},
      {key:'none', en:'Other Districts', hi:'अन्य जिले', light:'#e2e7e6', dark:'#35474a'}
    ]}
  ];

  // Comprehensive district-level profiles grounded in the 91-page PDF
  const districtProfiles = {
    211:{borders:'multi',borderNote:'Nepal & Uttar Pradesh|नेपाल व उत्तर प्रदेश',rainfall:'>160',soil:'lowland',forest:'high',forestNote:'Valmiki NP & Tiger Reserve (2nd highest forest)|वाल्मीकि राष्ट्रीय उद्यान व टाइगर रिजर्व',flood:'high',census:'sc-st',censusNote:'Max ST (6.4%) · Largest district by area · Northernmost|सर्वाधिक ST (6.4%) · क्षेत्रफल में सबसे बड़ा · सबसे उत्तरी',resources:'mineral',resNote:'Placer Gold (Valmikinagar), Leather, Handloom|प्लेसर सोना (वाल्मीकिनगर), चमड़ा, हथकरघा',expressway:'gs',expNote:'Gorakhpur–Siliguri Expressway|गोरखपुर–सिलीगुड़ी एक्सप्रेसवे',rivers:'Gandak, Burhi Gandak|गंडक, बूढ़ी गंडक'},
    213:{borders:'nepal',borderNote:'Nepal|नेपाल',rainfall:'140-160',soil:'bhangar',forest:'moderate',forestNote:'High forest growth vs 2019|2019 की तुलना में उच्च वन वृद्धि',flood:'high',census:'other',censusNote:'2nd Highest Population (2011)|जनसंख्या में दूसरा स्थान (2011)',resources:'mineral',resNote:'Saltpetre, Dhaka & Teur Canals|शोरा, ढाका व तेउर नहर',expressway:'multi',expNote:'Gorakhpur–Siliguri & Raxaul–Haldia|गोरखपुर–सिलीगुड़ी व रक्सौल–हल्दिया',rivers:'Gandak, Burhi Gandak, Bagmati|गंडक, बूढ़ी गंडक, बागमती'},
    220:{borders:'internal',borderNote:'Internal (Sitamarhi, East Champaran, Muzaffarpur)|आंतरिक जिला',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Least irrigated · Smallest district by area|सबसे कम सिंचित · क्षेत्रफल में सबसे छोटा',flood:'high',census:'top',censusNote:'Highest Density (1880/sq km) · 2nd Lowest Pop|सर्वाधिक जनघनत्व (1880) · दूसरी न्यूनतम जनसंख्या',resources:'agri',resNote:'Agriculture & Handloom|कृषि व हथकरघा',expressway:'multi',expNote:'Gorakhpur–Siliguri & Raxaul–Haldia|गोरखपुर–सिलीगुड़ी व रक्सौल–हल्दिया',rivers:'Bagmati|बागमती'},
    221:{borders:'nepal',borderNote:'Nepal|नेपाल',rainfall:'140-160',soil:'bhangar',forest:'low',forestNote:'Low forest cover|न्यूनतम वन क्षेत्र',flood:'high',census:'low',censusNote:'2nd Lowest Literacy Rate|न्यूनतम साक्षरता में दूसरा स्थान',resources:'agri',resNote:'Handloom & Agriculture|हथकरघा व कृषि',expressway:'multi',expNote:'Gorakhpur–Siliguri & Raxaul–Haldia|गोरखपुर–सिलीगुड़ी व रक्सौल–हल्दिया',rivers:'Bagmati, Adhwara|बागमती, अधवारा'},
    208:{borders:'internal',borderNote:'Internal (Tirhut HQ)|आंतरिक (तिरहुत मुख्यालय)',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'other',censusNote:'3rd Highest Population|जनसंख्या में तीसरा स्थान',resources:'gi',resNote:'Shahi Litchi (GI 2018), Railway Wagon, Leather|शाही लीची (GI 2018), रेलवे वैगन, चमड़ा',expressway:'rh',expNote:'Raxaul–Haldia Expressway|रक्सौल–हल्दिया एक्सप्रेसवे',rivers:'Burhi Gandak, Bagmati|बूढ़ी गंडक, बागमती'},
    224:{borders:'patna-adj',borderNote:'Patna-adjoining (Ganga bank)|पटना से सटा (गंगा तट)',rainfall:'120-140',soil:'khadar',forest:'low',forestNote:'Salim Ali Bird Sanctuary (Baraila)|सलीम अली पक्षी अभयारण्य',flood:'moderate',census:'other',censusNote:'Ancient Vaishali Republic · Hajipur HQ|प्राचीन वैशाली गणराज्य · हाजीपुर मुख्यालय',resources:'agri',resNote:'Medicine factory (Hajipur), Bananas|दवा कारखाना (हाजीपुर), केला',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Ganga, Gandak|गंगा, गंडक'},
    197:{borders:'up',borderNote:'Uttar Pradesh|उत्तर प्रदेश',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'top',censusNote:'Highest Sex Ratio (1021) · SC LS Seat|सर्वाधिक लिंगानुपात (1021) · SC लोकसभा सीट',resources:'agri',resNote:'Sugarcane & Agriculture|गन्ना व कृषि',expressway:'none',expNote:'NH-27 Corridor|NH-27 कॉरिडोर',rivers:'Gandak|गंडक'},
    222:{borders:'up',borderNote:'Uttar Pradesh|उत्तर प्रदेश',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'top',censusNote:'2nd Highest Sex Ratio · Ziradei (Rajendra Prasad)|दूसरा सर्वाधिक लिंगानुपात · जीरादेई',resources:'agri',resNote:'Yarn spinning, Handloom|सूत कताई, हथकरघा',expressway:'none',expNote:'Regional NH network|क्षेत्रीय राजमार्ग',rivers:'Ghaghara, Gandak|घाघरा, गंडक'},
    218:{borders:'multi',borderNote:'UP & Patna-adjoining (Ganga bank)|यूपी व पटना से सटा (गंगा तट)',rainfall:'120-140',soil:'khadar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'top',censusNote:'3rd Highest Sex Ratio · Sonepur Fair · Chirand|तीसरा सर्वाधिक लिंगानुपात · सोनपुर मेला · चिरांद',resources:'agri',resNote:'Oldest sugar mill (Marhaura 1904)|सबसे पुरानी चीनी मिल (मढ़ौरा 1904)',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Ganga, Ghaghara, Gandak|गंगा, घाघरा, गंडक'},
    206:{borders:'nepal',borderNote:'Nepal|नेपाल',rainfall:'140-160',soil:'bhangar',forest:'low',forestNote:'High forest growth vs 2019|2019 की तुलना में वन वृद्धि',flood:'high',census:'other',censusNote:'2nd Highest Rural Pop · Saurath Sabha|दूसरी सर्वाधिक ग्रामीण जनसंख्या · सौराठ सभा',resources:'gi',resNote:'Mithila Painting (GI 2007), Fine Cotton, Kamla Canal|मिथिला पेंटिंग (GI 2007), कमला नहर',expressway:'gs',expNote:'Gorakhpur–Siliguri Expressway|गोरखपुर–सिलीगुड़ी एक्सप्रेसवे',rivers:'Kamla–Balan, Kosi|कमला–बलान, कोसी'},
    195:{borders:'internal',borderNote:'Internal (Darbhanga HQ)|आंतरिक (दरभंगा मुख्यालय)',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Kusheshwar Sthan Bird Sanctuary|कुशेश्वर स्थान पक्षी अभयारण्य',flood:'high',census:'top',censusNote:'3rd Highest Density · DMCH (1946)|तीसरा सर्वाधिक जनघनत्व · DMCH (1946)',resources:'agri',resNote:'Kamla Canal, Makhana, Handloom|कमला नहर, मखाना, हथकरघा',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Bagmati, Kamla–Balan|बागमती, कमला–बलान'},
    217:{borders:'patna-adj',borderNote:'Patna-adjoining (Ganga bank)|पटना से सटा (गंगा तट)',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'top',censusNote:'Highest Rural Population · Pusa Agri Univ|सर्वाधिक ग्रामीण जनसंख्या · पूसा कृषि वि.वि.',resources:'mineral',resNote:'Saltpetre, Jute, Paper factory|शोरा, जूट, कागज उद्योग',expressway:'multi',expNote:'Patna–Purnia & Raxaul–Haldia|पटना–पूर्णिया व रक्सौल–हल्दिया',rivers:'Ganga, Burhi Gandak|गंगा, बूढ़ी गंडक'},
    223:{borders:'nepal',borderNote:'Nepal|नेपाल',rainfall:'140-160',soil:'bhangar',forest:'low',forestNote:'Kosi Barrage (Bhimnagar) nearby|कोसी बैराज (भीमनगर) क्षेत्र',flood:'high',census:'other',censusNote:'Kosi division northernmost district|कोसी प्रमंडल का उत्तरी जिला',resources:'agri',resNote:'Kosi Project & Canals|कोसी परियोजना व नहरें',expressway:'gs',expNote:'Gorakhpur–Siliguri Expressway|गोरखपुर–सिलीगुड़ी एक्सप्रेसवे',rivers:'Kosi|कोसी'},
    216:{borders:'internal',borderNote:'Internal (Kosi HQ)|आंतरिक (कोसी मुख्यालय)',rainfall:'120-140',soil:'bhangar',forest:'low',forestNote:'Simri Bakhtiyarpur Lake (Horseshoe)|सिमरी बख्तियारपुर झील',flood:'high',census:'other',censusNote:'Kosi alluvial fan belt|कोसी जलोढ़ पंख क्षेत्र',resources:'agri',resNote:'Makhana & Fisheries|मखाना व मत्स्य पालन',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Kosi|कोसी'},
    205:{borders:'internal',borderNote:'Internal (Kosi division)|आंतरिक (कोसी प्रमंडल)',rainfall:'120-140',soil:'khadar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'other',censusNote:'Kosi plain|कोसी मैदान',resources:'agri',resNote:'Maize & Jute belt|मक्का व जूट क्षेत्र',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Kosi|कोसी'},
    188:{borders:'nepal',borderNote:'Nepal|नेपाल',rainfall:'140-160',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'other',censusNote:'Northeastern plain|उत्तर-पूर्वी मैदान',resources:'agri',resNote:'Jute & Maize|जूट व मक्का',expressway:'gs',expNote:'Gorakhpur–Siliguri Expressway|गोरखपुर–सिलीगुड़ी एक्सप्रेसवे',rivers:'Mahananda, Kosi|महानंदा, कोसी'},
    203:{borders:'multi',borderNote:'Nepal & West Bengal|नेपाल व पश्चिम बंगाल',rainfall:'>160',soil:'lowland',forest:'low',forestNote:'Easternmost district · Max rainfall|सबसे पूर्वी जिला · सर्वाधिक वर्षा',flood:'high',census:'sc-st',censusNote:'Minimum SC (6.7%)|न्यूनतम SC (6.7%)',resources:'agri',resNote:'Tea cultivation, Jute|चाय की खेती, जूट',expressway:'gs',expNote:'Gorakhpur–Siliguri Expressway|गोरखपुर–सिलीगुड़ी एक्सप्रेसवे',rivers:'Mahananda|महानंदा'},
    214:{borders:'wb',borderNote:'West Bengal|पश्चिम बंगाल',rainfall:'140-160',soil:'bhangar',forest:'low',forestNote:'Low forest cover|कम वन क्षेत्र',flood:'high',census:'low',censusNote:'Lowest Literacy Rate (51.1%)|न्यूनतम साक्षरता दर (51.1%)',resources:'agri',resNote:'Jute & Jute bags, Makhana Board|जूट उद्योग, राष्ट्रीय मखाना बोर्ड',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Mahananda, Kosi|महानंदा, कोसी'},
    201:{borders:'multi',borderNote:'West Bengal & Jharkhand (Ganga bank)|प. बंगाल व झारखंड (गंगा तट)',rainfall:'140-160',soil:'khadar',forest:'low',forestNote:'Gogabeel Lake (1st Community Reserve & Ramsar)|गोगाबील झील (रामसर स्थल)',flood:'high',census:'sc-st',censusNote:'2nd Highest ST · Manihari ST Seat|दूसरा सर्वाधिक ST · मनिहारी ST सीट',resources:'agri',resNote:'Jute industry, Kursela confluence|जूट उद्योग, कुरसेला संगम',expressway:'none',expNote:'Eastern rail & NH hub|पूर्वी रेल व राजमार्ग केंद्र',rivers:'Ganga, Kosi, Mahananda|गंगा, कोसी, महानंदा'},
    192:{borders:'jh',borderNote:'Jharkhand (Ganga bank)|झारखंड (गंगा तट)',rainfall:'120-140',soil:'khadar',forest:'moderate',forestNote:'Vikramshila Dolphin Sanctuary · Jagatpura Lake|विक्रमशिला डॉल्फिन अभयारण्य · जगतपुरा झील',flood:'moderate',census:'low',censusNote:'2nd Lowest Sex Ratio · 3rd Lowest Rural Pop|दूसरा न्यूनतम लिंगानुपात',resources:'gi',resNote:'Bhagalpuri Silk (GI 2009), Manjusha (2017), Katarni, Zardalu (2018)|भागलपुरी सिल्क, मंजूषा, कतरनी, जर्दालु',expressway:'none',expNote:'Buxar–Bhagalpur Corridor|बक्सर–भागलपुर कॉरिडोर',rivers:'Ganga|गंगा'},
    190:{borders:'jh',borderNote:'Jharkhand|झारखंड',rainfall:'100-120',soil:'red-yellow',forest:'high',forestNote:'3rd Lowest Density · Mandar Hill Ropeway|मंदार हिल रोपवे · वन क्षेत्र',flood:'low',census:'low',censusNote:'3rd Lowest Density · Katoria ST Seat|तीसरा न्यूनतम घनत्व · कटोरिया ST सीट',resources:'both',resNote:'Ceramic, Lead-Zinc, Tasar Silk, Katarni Rice|सिरेमिक, सीसा-जस्ता, तसर रेशम',expressway:'rh',expNote:'Raxaul–Haldia Expressway|रक्सौल–हल्दिया एक्सप्रेसवे',rivers:'Chanan, Ajay|चांदन, अजय'},
    212:{borders:'internal',borderNote:'State Capital (Ganga bank, 9 adjoining)|राजधानी (गंगा तट, 9 सटे जिले)',rainfall:'100-120',soil:'taal',forest:'low',forestNote:'Only Metropolitan City · Richest District|एकमात्र महानगर · सबसे अमीर जिला',flood:'moderate',census:'top',censusNote:'Highest Pop & Urbanisation · 2nd Literacy · 2nd Density|सर्वाधिक जनसंख्या व शहरीकरण · दूसरी साक्षरता',resources:'agri',resNote:'PMCH (1925), Golghar, Kumhrar, Patna Sahib|PMCH, गोलघर, कुम्हरार, पटना साहिब',expressway:'pp',expNote:'Patna–Purnia Expressway|पटना–पूर्णिया एक्सप्रेसवे',rivers:'Ganga, Son, Punpun|गंगा, सोन, पुनपुन'},
    193:{borders:'multi',borderNote:'UP & Patna-adjoining (Ganga bank)|यूपी व पटना से सटा (गंगा तट)',rainfall:'100-120',soil:'karail',forest:'low',forestNote:'Western Son Canal beneficiary|पश्चिमी सोन नहर क्षेत्र',flood:'moderate',census:'top',censusNote:'3rd Highest Literacy · Jagdishpur (1857)|तीसरी सर्वाधिक साक्षरता · जगदीशपुर',resources:'agri',resNote:'Agriculture & Handloom|कृषि व हथकरघा',expressway:'none',expNote:'Arrah–Buxar NH Corridor|आरा–बक्सर राजमार्ग',rivers:'Ganga, Son|गंगा, सोन'},
    194:{borders:'up',borderNote:'Uttar Pradesh (Ganga bank)|उत्तर प्रदेश (गंगा तट)',rainfall:'100-120',soil:'karail',forest:'low',forestNote:'Gokul Jalashay (Ramsar) · 3rd Lowest Forest|गोकुल जलाशय (रामसर) · तीसरा न्यूनतम वन',flood:'moderate',census:'other',censusNote:'Battle of Buxar (1764) & Chausa (1539)|बक्सर (1764) व चौसा (1539) युद्ध',resources:'agri',resNote:'First Open Jail · Western Son Canal|पहली खुली जेल · पश्चिमी सोन नहर',expressway:'none',expNote:'Buxar–Bhagalpur Corridor|बक्सर–भागलपुर कॉरिडोर',rivers:'Ganga, Karmanasa|गंगा, कर्मनाशा'},
    200:{borders:'up',borderNote:'Uttar Pradesh (Westernmost)|उत्तर प्रदेश (सबसे पश्चिमी)',rainfall:'100-120',soil:'red-sandy',forest:'high',forestNote:'Max Forest Cover (31.56%) · Kaimur TR (2nd) · Telhar|सर्वाधिक वन (31.56%) · कैमूर टाइगर रिजर्व',flood:'low',census:'low',censusNote:'Lowest Density (488/sq km) · Min Rainfall|न्यूनतम जनघनत्व (488) · न्यूनतम वर्षा',resources:'mineral',resNote:'Vindhyan Sandstone, Woollen Carpet, Banarasi Sari|विंध्यन बलुआ पत्थर, कालीन',expressway:'vk',expNote:'Varanasi–Ranchi–Kolkata (Mohania)|वाराणसी–रांची–कोलकाता (मोहनिया)',rivers:'Karmanasa, Durgavati|कर्मनाशा, दुर्गावती'},
    215:{borders:'multi',borderNote:'UP & Jharkhand|यूपी व झारखंड',rainfall:'100-120',soil:'red-sandy',forest:'high',forestNote:'Most Irrigated District · Dhuankund & Manjhar Kund|सर्वाधिक सिंचित जिला · धुआँकुंड',flood:'low',census:'top',censusNote:'Highest Literacy Rate (73.4%) · Sher Shah Tomb|सर्वाधिक साक्षरता (73.4%) · शेरशाह मकबरा',resources:'mineral',resNote:'Pyrite (Amjhore), Limestone, Cement (Banjari), Son Canal|पाइराइट, चूना पत्थर, सीमेंट',expressway:'vk',expNote:'Varanasi–Ranchi–Kolkata (Sasaram)|वाराणसी–रांची–कोलकाता (सासाराम)',rivers:'Son|सोन'},
    209:{borders:'patna-adj',borderNote:'Patna-adjoining|पटना से सटा',rainfall:'100-120',soil:'taal',forest:'moderate',forestNote:'Pant Wildlife Sanctuary · Rajgir Hot Springs|पंत अभयारण्य · राजगीर गर्म जलकुंड',flood:'low',census:'other',censusNote:'Ancient Nalanda & Rajgir · Glass Bridge · Film City|नालंदा व राजगीर · ग्लास ब्रिज',resources:'gi',resNote:'Silao Khaja (GI 2018), Magahi Paan (GI 2018), Silk|सिलाव खाजा व मगही पान (GI 2018)',expressway:'none',expNote:'Rajgir–Bakhtiyarpur Corridor|राजगीर–बख्तियारपुर कॉरिडोर',rivers:'Falgu, Panchane|फल्गु, पंचाने'},
    189:{borders:'jh',borderNote:'Jharkhand|झारखंड',rainfall:'100-120',soil:'red-yellow',forest:'moderate',forestNote:'Deo Sun Temple · Punpun Barrage (Hamidnagar)|देव सूर्य मंदिर · पुनपुन बैराज',flood:'low',census:'sc-st',censusNote:'3rd Highest SC · Min Rainfall belt|तीसरा सर्वाधिक SC · कम वर्षा क्षेत्र',resources:'agri',resNote:'Eastern Son Canal, Woollen Carpet|पूर्वी सोन नहर, ऊनी कालीन',expressway:'vk',expNote:'Varanasi–Ranchi–Kolkata Expressway|वाराणसी–रांची–कोलकाता एक्सप्रेसवे',rivers:'Son, Punpun|सोन, पुनपुन'},
    196:{borders:'jh',borderNote:'Jharkhand (Southernmost)|झारखंड (सबसे दक्षिणी)',rainfall:'<100',soil:'karail',forest:'moderate',forestNote:'Hottest place & Min rainfall · Bodh Gaya · Barabar|सबसे गर्म व न्यूनतम वर्षा · बोधगया',flood:'low',census:'sc-st',censusNote:'Max SC (30.39%) · 1922 INC Session|सर्वाधिक SC (30.39%) · 1922 कांग्रेस अधिवेशन',resources:'both',resNote:'Mica, Uranium, Feldspar, Magahi Paan (GI 2018), Tilkut|अभ्रक, यूरेनियम, फेल्सपार, मगही पान',expressway:'vk',expNote:'Varanasi–Ranchi–Kolkata Expressway|वाराणसी–रांची–कोलकाता एक्सप्रेसवे',rivers:'Falgu (Niranjana–Mohana)|फल्गु (निरंजना–मोहाना)'},
    210:{borders:'jh',borderNote:'Jharkhand|झारखंड',rainfall:'100-120',soil:'red-yellow',forest:'high',forestNote:'Kakolat Waterfall · Forest-rich hills|ककोलत जलप्रपात · वन क्षेत्र',flood:'low',census:'sc-st',censusNote:'2nd Highest SC population|दूसरा सर्वाधिक SC आबादी',resources:'mineral',resNote:'Mica & Asbestos (Highest in Bihar), Tasar Silk|अभ्रक व एस्बेस्टस (सर्वाधिक)',expressway:'none',expNote:'Regional NH network|क्षेत्रीय राजमार्ग',rivers:'Sakri, Khuri|सकरी, खुरी'},
    199:{borders:'patna-adj',borderNote:'Patna-adjoining|पटना से सटा',rainfall:'<100',soil:'karail',forest:'moderate',forestNote:'1st Rank IDSP Health (2025) · Barabar/Nagarjuni nearby|IDSP में प्रथम · बराबर पहाड़ियाँ',flood:'low',census:'other',censusNote:'Dharnai (First Solar Village)|धरनई (पहला सौर गाँव)',resources:'agri',resNote:'Yamuna & Eastern Son Canals|यमुना व पूर्वी सोन नहर',expressway:'none',expNote:'Patna–Gaya NH Corridor|पटना–गया राजमार्ग',rivers:'Falgu, Punpun|फल्गु, पुनपुन'},
    611:{borders:'patna-adj',borderNote:'Patna-adjoining (38th District)|पटना से सटा (38वाँ जिला)',rainfall:'<100',soil:'karail',forest:'low',forestNote:'2nd Lowest Forest Cover · 3rd Lowest Pop|दूसरा न्यूनतम वन · तीसरी न्यूनतम जनसंख्या',flood:'low',census:'low',censusNote:'3rd Lowest Pop · Carved from Jehanabad (2001)|तीसरी न्यूनतम जनसंख्या (गठन 2001)',resources:'agri',resNote:'Eastern Son Canal irrigation|पूर्वी सोन नहर सिंचाई',expressway:'none',expNote:'Son basin road link|सोन बेसिन संपर्क मार्ग',rivers:'Son, Punpun|सोन, पुनपुन'},
    191:{borders:'patna-adj',borderNote:'Patna-adjoining (Ganga bank)|पटना से सटा (गंगा तट)',rainfall:'120-140',soil:'khadar',forest:'low',forestNote:'Kabartal / Kanwar Lake (1st Ramsar Site 2020)|काबरताल / काँवर झील (पहला रामसर 2020)',flood:'moderate',census:'other',censusNote:'Simaria Fair · Chowkidari Tax Movement|सिमरिया मेला · चौकीदारी कर आंदोलन',resources:'mineral',resNote:'Barauni Refinery (1964), Thermal Power (1962), Saltpetre|बरौनी रिफाइनरी, ताप विद्युत, शोरा',expressway:'multi',expNote:'Patna–Purnia & Raxaul–Haldia|पटना–पूर्णिया व रक्सौल–हल्दिया',rivers:'Ganga, Burhi Gandak|गंगा, बूढ़ी गंडक'},
    202:{borders:'internal',borderNote:'Internal (Ganga bank)|आंतरिक (गंगा तट)',rainfall:'120-140',soil:'khadar',forest:'low',forestNote:'Confluence floodplain|नदी संगम बाढ़ क्षेत्र',flood:'high',census:'sc-st',censusNote:'Minimum ST · 3rd Lowest Sex Ratio|न्यूनतम ST · तीसरा न्यूनतम लिंगानुपात',resources:'agri',resNote:'Maize & Banana hub|मक्का व केला केंद्र',expressway:'none',expNote:'NH-31 Corridor|NH-31 कॉरिडोर',rivers:'Ganga, Burhi Gandak, Kosi, Bagmati|गंगा, बूढ़ी गंडक, कोसी, बागमती'},
    204:{borders:'patna-adj',borderNote:'Patna-adjoining (Ganga bank)|पटना से सटा (गंगा तट)',rainfall:'100-120',soil:'taal',forest:'low',forestNote:'Kajra 301 MW Solar-Battery Project · Ashok Dham|कजरा सोलर प्रोजेक्ट · अशोक धाम',flood:'moderate',census:'other',censusNote:'Surajgarha Kiul–Ganga confluence|सूरजगढ़ा किऊल–गंगा संगम',resources:'agri',resNote:'Taal pulses & agriculture|ताल दलहन व कृषि',expressway:'rh',expNote:'Raxaul–Haldia Expressway|रक्सौल–हल्दिया एक्सप्रेसवे',rivers:'Ganga, Kiul|गंगा, किऊल'},
    219:{borders:'internal',borderNote:'Internal (Munger division)|आंतरिक (मुंगेर प्रमंडल)',rainfall:'100-120',soil:'taal',forest:'low',forestNote:'Minimum Forest Cover (0.17%) · Girihinda Hill|न्यूनतम वन क्षेत्र (0.17%) · गिरिहिंडा पहाड़ी',flood:'low',census:'low',censusNote:'Lowest Population (2011) · Least Forest|न्यूनतम जनसंख्या (2011)',resources:'agri',resNote:'Agriculture & Stone quarrying|कृषि व पत्थर उद्योग',expressway:'none',expNote:'Regional highway network|क्षेत्रीय राजमार्ग',rivers:'Harohar|हरोहर'},
    207:{borders:'internal',borderNote:'Internal (Munger HQ, Ganga bank)|आंतरिक (मुंगेर मुख्यालय, गंगा तट)',rainfall:'100-120',soil:'red-yellow',forest:'high',forestNote:'Bhimbandh Sanctuary · Hot Springs (Sitakund etc.)|भीमबांध अभयारण्य · गर्म जलकुंड',flood:'moderate',census:'low',censusNote:'Lowest Sex Ratio (876) · 2nd Lowest Rural Pop|न्यूनतम लिंगानुपात (876)',resources:'mineral',resNote:'Bauxite, Silica, Gun & Cigarette Factory, Jamalpur Rail|बॉक्साइट, बंदूक-सिगरेट कारखाना, जमालपुर',expressway:'none',expNote:'Ganga Pathway (Marine Drive) Munger–Sabour|गंगा पाथवे (मुंगेर–सबौर)',rivers:'Ganga|गंगा'},
    198:{borders:'jh',borderNote:'Jharkhand|झारखंड',rainfall:'100-120',soil:'red-yellow',forest:'high',forestNote:'3rd Highest Forest · Nagi–Nakti Ramsar Sites · 2nd Lowest Density|नगी–नकटी रामसर स्थल · तीसरा सर्वाधिक वन',flood:'low',census:'sc-st',censusNote:'3rd Highest ST · 2nd Lowest Density|तीसरा सर्वाधिक ST · दूसरा न्यूनतम घनत्व',resources:'mineral',resNote:'Gold Reserves (Karmatiya), Feldspar|सोना भंडार (करमटिया), फेल्सपार',expressway:'rh',expNote:'Raxaul–Haldia Expressway|रक्सौल–हल्दिया एक्सप्रेसवे',rivers:'Kiul, Ajay|किऊल, अजय'}
  };

  const cheatsheet = [
    {id:'symbols', en:'State Symbols & Firsts', hi:'राजकीय प्रतीक व प्रथम', cards:[
      {en:'State Symbols (PDF p. 4)', hi:'राजकीय प्रतीक (पृ. 4)', items:[
        'State Song: Mere Bharat Ke Kanth-Haar (Satya Narayan; Music: H.P. Chaurasia & Shivkumar Sharma, March 2012)~राजकीय गीत: मेरे भारत के कंठहार (सत्य नारायण)',
        'Official Languages: Hindi (1st), Urdu (2nd, 1981); Regional: Bhojpuri, Magahi, Angika, Maithili~राजभाषा: हिंदी, उर्दू (द्वितीय, 1981)',
        'State Symbol: Bodhi Tree (1930–35) · State Tree: Peepal (Ficus religiosa)~राजकीय चिह्न: बोधि वृक्ष · राजकीय वृक्ष: पीपल',
        'State Animal: Bull (Bos taurus, before 2013 Bear) · State Bird: Sparrow (20 March Sparrow Day)~पशु: बैल · पक्षी: गौरैया (20 मार्च)',
        'State Fish: Mangur · Aquatic Animal: Gangetic Dolphin (2009) · Flower: Marigold~मछली: मांगुर · जलीय जीव: डॉल्फिन · फूल: गेंदा'
      ]},
      {en:'Polity & Firsts (PDF pp. 7, 36)', hi:'राजव्यवस्था व प्रथम (पृ. 7, 36)', items:[
        '38 Districts, 9 Divisions, 101 Sub-divisions, 534 Blocks, 19 Municipal Corp~38 जिले, 9 प्रमंडल, 101 अनुमंडल, 534 प्रखंड',
        'Seats: 40 Lok Sabha (6 SC), 16 Rajya Sabha, 243 Assembly (38 SC, 2 ST), 75 Council~लोकसभा 40, राज्यसभा 16, विधानसभा 243, विधान परिषद 75',
        '1st CM: Shri Krishna Singh · 1st Woman CM: Rabri Devi · 1st Dalit CM: Bhola Paswan Shastri~प्रथम CM: श्रीकृष्ण सिंह · महिला CM: राबड़ी देवी',
        '1st Muslim CM: Abdul Ghafoor · 1st Governor: Jairamdas Daulatram · 1st Woman Governor: Ram Dulari Sinha~प्रथम मुस्लिम CM: अब्दुल गफूर · राज्यपाल: जयरामदास दौलतराम',
        '1st Solar Village: Dharnai (Jehanabad) · 1st Open Jail: Buxar · 1st Film City: Rajgir~पहला सौर गाँव: धरनई · पहली खुली जेल: बक्सर'
      ]}
    ]},
    {id:'geography', en:'Borders, Ganga & Hot Springs', hi:'सीमाएँ, गंगा व जलकुंड', cards:[
      {en:'Bordering States & Country (PDF p. 9)', hi:'सीमावर्ती राज्य व देश (पृ. 9)', items:[
        'Nepal (7): W. Champaran, E. Champaran, Sitamarhi, Madhubani, Supaul, Araria, Kishanganj~नेपाल (7): प. चंपारण से किशनगंज',
        'Uttar Pradesh (8): W. Champaran, Gopalganj, Siwan, Saran, Bhojpur, Buxar, Kaimur, Rohtas~यूपी (8): प. चंपारण से रोहतास',
        'Jharkhand (8): Rohtas, Aurangabad, Gaya, Nawada, Jamui, Banka, Bhagalpur, Katihar~झारखंड (8): रोहतास से कटिहार',
        'West Bengal (3): Kishanganj, Purnia, Katihar~पश्चिम बंगाल (3): किशनगंज, पूर्णिया, कटिहार',
        'Patna Adjoining (9): Arwal, Jehanabad, Nalanda, Lakhisarai, Begusarai, Samastipur, Vaishali, Saran, Bhojpur~पटना से सटे (9)'
      ]},
      {en:'12 Districts on Ganga Banks (PDF p. 87)', hi:'गंगा तट पर बसे 12 जिले (पृ. 87)', items:[
        'West to East: Buxar, Bhojpur, Saran, Patna, Vaishali, Samastipur, Begusarai, Lakhisarai, Munger, Khagaria, Bhagalpur, Katihar~बक्सर, भोजपुर, सारण, पटना, वैशाली, समस्तीपुर, बेगूसराय, लखीसराय, मुंगेर, खगड़िया, भागलपुर, कटिहार',
        'Ganga length in Bihar: 445 km (Entry: Chausa, Buxar · Exit: Katihar)~बिहार में गंगा की लंबाई: 445 किमी (प्रवेश: चौसा, बक्सर)'
      ]},
      {en:'Hot Springs: Rajgir & Munger (PDF p. 14)', hi:'गर्म जलकुंड: राजगीर व मुंगेर (पृ. 14)', items:[
        'Rajgir (>70°C): Brahma Kund (hottest), Surya Kund, Nanak Kund, Makhdum Kund, Saptadhara~राजगीर (>70°C): ब्रह्मकुंड, सूर्यकुंड, नानक, मखदूम, सप्तधारा',
        'Munger (>58°C): Sitakund, Rameshwarkund, Laxmankund, Rishikund, Gaumukh Kund~मुंगेर (>58°C): सीताकुंड, रामेश्वर, लक्ष्मण, ऋषिकुंड, गोमुख कुंड'
      ]}
    ]},
    {id:'census', en:'Census 2011 & Forests', hi:'जनगणना 2011 व वन', cards:[
      {en:'Census 2011 Extremes (PDF pp. 22–24)', hi:'जनगणना 2011 शीर्ष/न्यूनतम (पृ. 22–24)', items:[
        'Population: 10,40,99,452 (3rd) · Max: Patna · Min: Sheikhpura~जनसंख्या: 10.41 करोड़ (तीसरा) · सर्वाधिक: पटना · न्यूनतम: शेखपुरा',
        'Density: 1106/sq km (1st in India) · Max: Sheohar (1880) · Min: Kaimur (488)~घनत्व: 1106 · सर्वाधिक: शिवहर (1880) · न्यूनतम: कैमूर (488)',
        'Literacy: 61.8% (M 71.2%, F 51.5%) · Max: Rohtas (73.4%) · Min: Purnia (51.1%)~साक्षरता: 61.8% · सर्वाधिक: रोहतास (73.4%) · न्यूनतम: पूर्णिया (51.1%)',
        'Sex Ratio: 918 (Child 935) · Max: Gopalganj (1021) · Min: Munger (876)~लिंगानुपात: 918 · सर्वाधिक: गोपालगंज (1021) · न्यूनतम: मुंगेर (876)',
        'SC (15.72%): Max Gaya (30.39%), Min Kishanganj (6.7%) · ST (1.3%): Max W. Champaran (6.4%), Min Khagaria~SC: गया/किशनगंज · ST: प. चंपारण/खगड़िया'
      ]},
      {en:'Forests & Ramsar Sites (PDF pp. 31–34)', hi:'वन व रामसर स्थल (पृ. 31–34)', items:[
        'ISFR 2023 Forest Cover: 7,532.45 sq km (8%) · Total Forest+Tree: 9,903 sq km (10.52%)~वन आवरण: 7,532.45 वर्ग किमी (8%)',
        'Max Forest: Kaimur (31.56%), W. Champaran, Jamui · Min Forest: Sheikhpura (0.17%), Arwal, Buxar~सर्वाधिक: कैमूर · न्यूनतम: शेखपुरा',
        'Ramsar Sites: Kabartal (Begusarai, 2020), Nagi & Nakti (Jamui, 2024), Gokul Jalashay (Buxar), Udaipur Lake (W. Champaran), Gogabeel (Katihar)~रामसर स्थल: काबरताल, नागी-नकटी, गोकुल, उदयपुर, गोगाबील'
      ]}
    ]},
    {id:'economy', en:'GI Tags, Minerals & Expressways', hi:'GI टैग, खनिज व एक्सप्रेसवे', cards:[
      {en:'8 GI Tags of Bihar (PDF p. 89)', hi:'बिहार के 8 GI टैग (पृ. 89)', items:[
        'Mithila Painting (Madhubani, 2007) · Bhagalpuri Silk (Bhagalpur, 2009) · Manjusha Art (Bhagalpur, 2017)~मिथिला पेंटिंग (2007) · भागलपुरी सिल्क (2009) · मंजूषा (2017)',
        'Katarni Rice (Bhagalpur–Banka, 2018) · Zardalu Mango (Bhagalpur, 2018)~कतरनी चावल (2018) · जर्दालु आम (2018)',
        'Magahi Paan (Nalanda–Gaya–Munger, 2018) · Shahi Litchi (Muzaffarpur, 2018) · Silao Khaja (Nalanda, 2018)~मगही पान · शाही लीची · सिलाव खाजा (2018)'
      ]},
      {en:'4 Major Expressways (PDF p. 79)', hi:'4 प्रमुख एक्सप्रेसवे (पृ. 79)', items:[
        '1. Varanasi–Ranchi–Kolkata: Mohania (Kaimur), Rohtas, Aurangabad, Gaya~1. वाराणसी–रांची–कोलकाता: कैमूर, रोहतास, औरंगाबाद, गया',
        '2. Gorakhpur–Siliguri: W. Champaran, E. Champaran, Sheohar, Sitamarhi, Madhubani, Supaul, Araria, Kishanganj~2. गोरखपुर–सिलीगुड़ी: उत्तर बिहार के 8 सीमावर्ती जिले',
        '3. Patna–Purnia: Patna, Saran, Vaishali, Samastipur, Begusarai, Darbhanga, Saharsa, Madhepura, Purnia~3. पटना–पूर्णिया: 9 जिले',
        '4. Raxaul–Haldia: Muzaffarpur, Sheohar, E. Champaran, Sitamarhi, Samastipur, Begusarai, Lakhisarai, Jamui, Banka~4. रक्सौल–हल्दिया: 9 जिले'
      ]}
    ]}
  ];

  window.BiharAtlasData = {index,chaptersByPlace,tours,timeline,thematicLayers,districtProfiles,cheatsheet};
})();
