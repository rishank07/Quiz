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
  window.BiharAtlasData = {index,chaptersByPlace,tours,timeline};
})();
