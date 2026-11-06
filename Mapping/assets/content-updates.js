/* ExamFusion atlas additions: supplied mapping handouts and linked official references. Reviewed 7 Nov 2026. */
(() => {
 'use strict';
 const D=window.MAPPING_DATA,N=window.MAPPING_STATE_NOTES,profile=id=>N.profiles.find(p=>p.id===id);
 const pair=(en,hi)=>({en,hi});
 const addSource=(id,filename,url)=>{if(!D.sources.some(s=>s.id===id))D.sources.push({id,filename,url,kind:'Geography review reference'});};
 addSource('rsis-atlas-review','Ramsar Sites Information Service — India annotated summary','https://rsis.ramsar.org/sites/default/files/rsiswp_search/exports/Ramsar-Sites-annotated-summary-India.pdf');
 addSource('wii-parks-review','Wildlife Institute of India — national park database','https://v1.wii.gov.in/nwdc_national_parks');
 addSource('assam-survey-review','Assam Economic Survey 2025–26 — national parks','https://des.assam.gov.in/sites/default/files/swf_utility_folder/departments/ecostat_medhassu_in_oid_3/this_comm/economic_survey_assam_2025-26.pdf');
 addSource('odisha-similipal-review','Odisha government — Similipal announcement, 24 April 2025','https://inpr.odisha.gov.in/sites/default/files/2025-04/News-Forest_24042025EEEE.pdf');
 addSource('ramsar-milestones-review','PIB — Ramsar milestones, 25 October 2026','https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=160558&lang=2&reg=48');
 function mountain(id,name,hi,lat,lon,stateId,setting,settingHi,connection,connectionHi,page=13){
  if(D.features.some(f=>f.id===id))return;
  const p=profile(stateId),area=p?.name||stateId;
  const f={id,name,hi,lat,lon,region:'India',topic:'mountains',area,areaHi:p?.hi||area,noteStateIds:p?[p.id]:[],fact:connection,factHi:connectionHi,source:{id:'pdf-12',page},mountainStudy:{setting:pair(setting,settingHi),connections:pair(connection,connectionHi)}};
  D.features.push(f);
  if(p&&!p.sections.terrain.some(r=>r.name===name))p.sections.terrain.push({name,hi,fact:setting+'. '+connection,factHi:settingHi+'। '+connectionHi,featureId:id});
 }
 // J&K and Ladakh are separate current UT study views.
 mountain('pass-banihal','Banihal Pass','बनिहाल दर्रा',33.51,75.2,'jammu-kashmir','Pir Panjal Range, Banihal–Qazigund corridor','पीर पंजाल श्रेणी, बनिहाल–काज़ीगुंड मार्ग','Connects the Jammu side with the Kashmir Valley; associated with the Jawahar Tunnel corridor.','जम्मू क्षेत्र को कश्मीर घाटी से जोड़ता है; जवाहर सुरंग मार्ग से संबंधित।');
 mountain('pass-pir-panjal','Pir Panjal / Pir Ki Gali','पीर पंजाल / पीर की गली',33.63,74.4,'jammu-kashmir','Pir Panjal Range; Mughal Road','पीर पंजाल श्रेणी; मुगल रोड','Crossing between the Poonch side and Shopian in the Kashmir Valley.','पुंछ क्षेत्र और कश्मीर घाटी के शोपियाँ के बीच का मार्ग।',14);
 mountain('pass-sinthan','Sinthan Pass','सिंथन दर्रा',33.57,75.5,'jammu-kashmir','Kishtwar–Anantnag route','किश्तवाड़–अनंतनाग मार्ग','High pass linking the Kishtwar side of Jammu with the Kashmir Valley.','जम्मू के किश्तवाड़ क्षेत्र को कश्मीर घाटी से जोड़ने वाला ऊँचा दर्रा।',14);
 mountain('pass-razdan','Razdan Pass','राज़दान दर्रा',34.56,74.65,'jammu-kashmir','Bandipora–Gurez road','बांदीपोरा–गुरेज़ सड़क','Gateway from Bandipora to the Gurez Valley and the Kishanganga region.','बांदीपोरा से गुरेज़ घाटी और किशनगंगा क्षेत्र की ओर प्रवेश मार्ग।',14);
 mountain('pass-sadhna','Sadhna / Nasta Chun Pass','साधना / नस्ता चुन दर्रा',34.37,74.02,'jammu-kashmir','Kupwara–Karnah route, Pir Panjal','कुपवाड़ा–करनाह मार्ग, पीर पंजाल','Links the Kupwara side with Tangdhar and the Karnah Valley.','कुपवाड़ा क्षेत्र को तंगधार और करनाह घाटी से जोड़ता है।',14);
 mountain('pass-khardung','Khardung La','खारदुंग ला',34.278,77.604,'ladakh','Ladakh Range, north of Leh','लेह के उत्तर में लद्दाख श्रेणी','Leh–Nubra route; connects towards the Shyok and Nubra valleys.','लेह–नुब्रा मार्ग; श्योक और नुब्रा घाटियों की ओर जोड़ता है।');
 mountain('pass-chang','Chang La','चांग ला',34.05,77.93,'ladakh','Ladakh highlands, Karu–Durbuk route','लद्दाख उच्चभूमि, कारू–दुरबुक मार्ग','Crossing used on the Leh–Pangong Tso route via Karu and Durbuk.','कारू और दुरबुक के रास्ते लेह–पैंगोंग त्सो मार्ग का दर्रा।');
 mountain('pass-pensi','Pensi La','पेंसी ला',33.87,76.35,'ladakh','Between Suru and Zanskar valleys','सुरू और ज़ांस्कर घाटियों के बीच','Connects the Suru Valley towards Padum in Zanskar; near Drang-Drung Glacier.','सुरू घाटी को ज़ांस्कर के पदुम क्षेत्र से जोड़ता है; द्रंग-द्रुंग हिमनद के पास।',14);
 mountain('pass-fotu','Fotu La','फोतू ला',34.28,76.7,'ladakh','Zanskar Range, Srinagar–Leh corridor','ज़ांस्कर श्रेणी, श्रीनगर–लेह मार्ग','A high crossing on the Kargil–Lamayuru–Leh road.','कारगिल–लामायुरू–लेह सड़क पर ऊँचा दर्रा।',14);
 mountain('pass-namika','Namika La','नामिका ला',34.37,76.58,'ladakh','Kargil–Leh road, near the Mulbekh sector','मुलबेख क्षेत्र के पास कारगिल–लेह सड़क','A crossing west of Fotu La on the Srinagar–Leh route.','श्रीनगर–लेह मार्ग पर फोतू ला के पश्चिम का दर्रा।',14);
 mountain('pass-karakoram','Karakoram Pass','काराकोरम दर्रा',35.51,77.82,'ladakh','Karakoram Range, Ladakh–Xinjiang border region','काराकोरम श्रेणी, लद्दाख–शिनजियांग सीमा क्षेत्र','Historic caravan crossing between Ladakh and the Tarim Basin / Yarkand region.','लद्दाख और तारिम बेसिन / यारकंद क्षेत्र के बीच ऐतिहासिक कारवाँ मार्ग।',14);
 mountain('pass-tanglang','Tanglang La','तंगलंग ला',33.5,77.77,'ladakh','Ladakh, Manali–Leh road','लद्दाख, मनाली–लेह सड़क','Crossing between the Rumtse side and the More Plains.','रुमत्से क्षेत्र और मोरे मैदान के बीच का दर्रा।',14);
 mountain('pass-lanak','Lanak La','लानक ला',34.4,79.54,'ladakh','Aksai Chin / Changthang border region','अक्साई चिन / चांगथांग सीमा क्षेत्र','Historic pass in the eastern Ladakh–Tibet mapping region.','पूर्वी लद्दाख–तिब्बत मानचित्रण क्षेत्र का ऐतिहासिक दर्रा।',14);
 mountain('pass-imis','Imis La','इमिस ला',32.38,79.04,'ladakh','Southeastern Ladakh–Tibet border region','दक्षिण-पूर्वी लद्दाख–तिब्बत सीमा क्षेत्र','High Himalayan crossing associated with the Changthang region.','चांगथांग क्षेत्र से संबंधित उच्च हिमालयी मार्ग।',14);
 mountain('pass-bara-lacha','Bara-lacha La','बारालाचा ला',32.76,77.42,'himachal-pradesh','Lahaul, Himachal Pradesh','लाहौल, हिमाचल प्रदेश','On the Manali–Leh route; Suraj Tal and the Bhaga headwater region lie nearby.','मनाली–लेह मार्ग पर; पास में सूरज ताल और भागा का उद्गम क्षेत्र।',15);
 mountain('pass-kunzum','Kunzum La','कुंजुम ला',32.39,77.64,'himachal-pradesh','Lahaul and Spiti district','लाहौल और स्पीति जिला','Links Lahaul with Spiti; Chandra Tal is nearby in the upper Chandra valley.','लाहौल को स्पीति से जोड़ता है; ऊपरी चंद्रा घाटी में पास ही चंद्रताल है।',15);
 mountain('pass-pin-parvati','Pin Parvati Pass','पिन पार्वती दर्रा',31.79,77.78,'himachal-pradesh','Kullu–Spiti Himalayan divide','कुल्लू–स्पीति हिमालयी जलविभाजक','Trekking crossing between the Parvati Valley and the Pin Valley.','पार्वती घाटी और पिन घाटी के बीच ट्रेकिंग मार्ग।',15);
 mountain('pass-niti','Niti Pass','नीति दर्रा',30.94,79.86,'uttarakhand','Chamoli, Uttarakhand–Tibet border','चमोली, उत्तराखंड–तिब्बत सीमा','Pass beyond Niti village in the upper Dhauliganga valley.','ऊपरी धौलीगंगा घाटी में नीति गाँव से आगे का दर्रा।',16);
 mountain('pass-muling','Muling La','मुलिंग ला',31.26,79.07,'uttarakhand','Northern Uttarakhand–Tibet Himalayan border','उत्तरी उत्तराखंड–तिब्बत हिमालयी सीमा','High-altitude crossing north of the Gangotri region.','गंगोत्री क्षेत्र के उत्तर में उच्च पर्वतीय दर्रा।',16);
 mountain('pass-mangsha','Mangsha Dhura','मांगशा धुरा',30.4,80.65,'uttarakhand','Pithoragarh Himalayan border region','पिथौरागढ़ का हिमालयी सीमा क्षेत्र','An old Himalayan route associated with travel towards Kailash–Mansarovar.','कैलाश–मानसरोवर की ओर जाने वाले पुराने हिमालयी मार्गों से संबंधित।',16);
 mountain('pass-jelep','Jelep La','जेलेप ला',27.36,88.85,'sikkim','Sikkim–Tibet border, Chumbi Valley approach','सिक्किम–तिब्बत सीमा, चुंबी घाटी मार्ग','Historic Kalimpong–Lhasa trade route through the Chumbi Valley.','चुंबी घाटी से होकर ऐतिहासिक कालिम्पोंग–ल्हासा व्यापार मार्ग।',17);
 mountain('pass-sela','Sela Pass','सेला दर्रा',27.5,92.1,'arunachal-pradesh','Tawang–West Kameng Himalayan corridor','तवांग–पश्चिम कामेंग हिमालयी मार्ग','Connects the Tawang side with the Dirang / West Kameng side.','तवांग क्षेत्र को दिरांग / पश्चिम कामेंग क्षेत्र से जोड़ता है।',17);
 mountain('pass-bomdi','Bomdi La','बोमडि ला',27.26,92.42,'arunachal-pradesh','West Kameng, eastern Himalaya','पश्चिम कामेंग, पूर्वी हिमालय','Mountain-pass region around Bomdila on the route towards Tawang.','तवांग की ओर जाने वाले मार्ग पर बोमडिला का पर्वतीय दर्रा क्षेत्र।',17);
 mountain('pass-bum','Bum La','बुम ला',27.72,91.86,'arunachal-pradesh','Tawang–Tibet border','तवांग–तिब्बत सीमा','High border pass north of Tawang.','तवांग के उत्तर में ऊँचा सीमावर्ती दर्रा।',17);
 mountain('pass-pangsau','Pangsau Pass','पांगसौ दर्रा',27.25,96.18,'arunachal-pradesh','Patkai Hills, India–Myanmar border','पटकाई पहाड़ियाँ, भारत–म्यांमार सीमा','Crossing near Nampong on the historic Stilwell / Ledo Road.','नमपोंग के पास ऐतिहासिक स्टिलवेल / लेडो सड़क का दर्रा।',18);
 mountain('pass-diphu','Diphu Pass','दीफू दर्रा',28.2,97.2,'arunachal-pradesh','Eastern Himalayan India–China–Myanmar border region','पूर्वी हिमालय का भारत–चीन–म्यांमार सीमा क्षेत्र','High pass associated with the northeastern trijunction region.','उत्तर-पूर्व के त्रिसंधि सीमा क्षेत्र से संबंधित ऊँचा दर्रा।',18);
 mountain('pass-shencottah','Shencottah / Sengottai Gap','शेनकोट्टा / सेनगोट्टई दर्रा',8.98,77.15,'tamil-nadu','Southern Western Ghats, Kerala–Tamil Nadu','दक्षिणी पश्चिमी घाट, केरल–तमिलनाडु','Connects the Kollam–Punalur side with Sengottai / Tenkasi.','कोल्लम–पुनलूर क्षेत्र को सेनगोट्टई / तेनकासी से जोड़ता है।',19);
 const belts=[
 ['range-karakoram','Karakoram Range','काराकोरम श्रेणी',35.2,76.5,'ladakh','Northern high-mountain belt; K2, Siachen and the Karakoram Pass are key map connections.','उत्तरी उच्च पर्वतीय पट्टी; के2, सियाचिन और काराकोरम दर्रा प्रमुख मानचित्र संबंध हैं।'],
 ['range-ladakh','Ladakh Range','लद्दाख श्रेणी',34.3,77.6,'ladakh','Between the Indus and Shyok systems; Khardung La is a major crossing.','सिंधु और श्योक तंत्रों के बीच; खारदुंग ला प्रमुख दर्रा है।'],
 ['range-zanskar','Zanskar Range','ज़ांस्कर श्रेणी',33.7,77.1,'ladakh','Trans-Himalayan highlands associated with the Zanskar River and northern Himachal–Ladakh region.','ज़ांस्कर नदी और उत्तरी हिमाचल–लद्दाख क्षेत्र से जुड़ी पराहिमालयी उच्चभूमि।'],
 ['range-pir-panjal','Pir Panjal Range','पीर पंजाल श्रेणी',33.5,74.9,'jammu-kashmir','Separates much of the Kashmir Valley from the Jammu side; Banihal and Pir Ki Gali are crossings.','कश्मीर घाटी के बड़े भाग को जम्मू क्षेत्र से अलग करती है; बनिहाल और पीर की गली प्रमुख मार्ग हैं।'],
 ['range-dhauladhar','Dhauladhar Range','धौलाधार श्रेणी',32.2,76.4,'himachal-pradesh','Lesser Himalayan range rising above the Kangra Valley.','काँगड़ा घाटी के ऊपर स्थित लघु हिमालय की श्रेणी।'],
 ['range-shivalik','Shivalik Hills','शिवालिक पहाड़ियाँ',30.6,77.5,'uttarakhand','Outer Himalayan foothill belt; duns lie between Shivalik and the Lesser Himalaya.','बाह्य हिमालय की तलहटी; शिवालिक और लघु हिमालय के बीच दून घाटियाँ हैं।'],
 ['range-aravalli','Aravalli Range','अरावली श्रेणी',25.2,73.3,'rajasthan','Old mountain belt extending from the Delhi region towards Gujarat; Guru Shikhar is its highest summit.','दिल्ली क्षेत्र से गुजरात की ओर प्राचीन पर्वतीय पट्टी; गुरु शिखर इसका सर्वोच्च शिखर है।'],
 ['range-vindhya','Vindhya Range','विंध्य श्रेणी',23.4,79.5,'madhya-pradesh','Highlands north of the Narmada Valley; the Kaimur system extends eastwards.','नर्मदा घाटी के उत्तर की उच्चभूमि; कैमूर तंत्र पूर्व की ओर फैला है।'],
 ['range-satpura','Satpura Range','सतपुड़ा श्रेणी',22.4,78.4,'madhya-pradesh','Between Narmada and Tapi; Mahadeo and Maikal are important associated hills.','नर्मदा और तापी के बीच; महादेव और मैकाल संबंधित प्रमुख पहाड़ियाँ हैं।'],
 ['range-western-ghats','Western Ghats / Sahyadri','पश्चिमी घाट / सह्याद्रि',15.4,74.7,'karnataka','Western peninsular escarpment; source region of several east-flowing and short west-flowing rivers.','प्रायद्वीप की पश्चिमी कगार; कई पूर्ववाहिनी और छोटी पश्चिमवाहिनी नदियों का उद्गम क्षेत्र।'],
 ['range-eastern-ghats','Eastern Ghats','पूर्वी घाट',16.2,79.2,'andhra-pradesh','Discontinuous eastern peninsular hills cut by the Mahanadi, Godavari, Krishna and Kaveri systems.','महानदी, गोदावरी, कृष्णा और कावेरी तंत्रों से कटी प्रायद्वीप की असतत पूर्वी पहाड़ियाँ।'],
 ['range-anaimalai','Anaimalai Hills','अन्नामलाई पहाड़ियाँ',10.3,77.05,'tamil-nadu','Southern Western Ghats; Anamudi and Eravikulam lie in the adjoining Kerala highlands.','दक्षिणी पश्चिमी घाट; पास की केरल उच्चभूमि में अनामुडी और एराविकुलम हैं।'],
 ['range-cardamom','Cardamom Hills','इलायची पहाड़ियाँ',9.5,77.1,'kerala','Southern Western Ghats, associated with the Periyar landscape and spice-growing highlands.','दक्षिणी पश्चिमी घाट; पेरियार क्षेत्र और मसाला उत्पादक उच्चभूमि से संबंधित।'],
 ['range-garo','Garo Hills','गारो पहाड़ियाँ',25.5,90.3,'meghalaya','Western Meghalaya uplands; Nokrek and Balpakram are important protected landscapes.','पश्चिमी मेघालय की उच्चभूमि; नोकरेक और बालपक्रम प्रमुख संरक्षित क्षेत्र हैं।'],
 ['range-khasi','Khasi Hills','खासी पहाड़ियाँ',25.5,91.7,'meghalaya','Central Meghalaya plateau; Shillong, Cherrapunji and Mawsynram are key connections.','मध्य मेघालय पठार; शिलांग, चेरापूँजी और मौसिनराम प्रमुख संबंध हैं।'],
 ['range-jaintia','Jaintia Hills','जयंतिया पहाड़ियाँ',25.35,92.35,'meghalaya','Eastern part of the Meghalaya plateau, with limestone and karst landscapes.','मेघालय पठार का पूर्वी भाग; चूना पत्थर और कार्स्ट स्थलाकृति से संबंधित।'],
 ['range-patkai','Patkai Hills','पटकाई पहाड़ियाँ',27.2,95.9,'arunachal-pradesh','India–Myanmar hill system; Pangsau Pass is a major map connection.','भारत–म्यांमार का पर्वतीय तंत्र; पांगसौ दर्रा प्रमुख मानचित्र संबंध है।'],
 ['range-naga','Naga Hills','नागा पहाड़ियाँ',26,94.5,'nagaland','Part of the Purvanchal hills; Saramati lies on the India–Myanmar border.','पूर्वांचल पहाड़ियों का भाग; सारामती भारत–म्यांमार सीमा पर स्थित है।'],
 ['range-mizo','Mizo / Lushai Hills','मिज़ो / लुशाई पहाड़ियाँ',23.5,92.8,'mizoram','North–south ridges in Mizoram, forming the southern Purvanchal hill system.','मिज़ोरम की उत्तर–दक्षिण पहाड़ियाँ; दक्षिणी पूर्वांचल पर्वतीय तंत्र का भाग।'],
 ['range-rajmahal','Rajmahal Hills','राजमहल पहाड़ियाँ',24.9,87.6,'jharkhand','Eastern Indian hills near the Ganga bend in the Sahibganj region.','साहिबगंज क्षेत्र में गंगा के मोड़ के पास पूर्वी भारत की पहाड़ियाँ।']
 ];
 for(const [id,name,hi,lat,lon,stateId,connection,connectionHi] of belts)mountain(id,name,hi,lat,lon,stateId,'Mountain range / hill belt','पर्वत श्रेणी / पहाड़ी पट्टी',connection,connectionHi,7);
 // Each district field describes the park or park landscape; it is not an entry-gate coordinate.
 const parks=[
 ['np-hemis','Hemis','हेमिस',33.9,77.45,'ladakh','Leh','Snow leopard; high-altitude Trans-Himalayan habitat.','हिम तेंदुआ; उच्च पर्वतीय पराहिमालयी आवास।'],
 ['np-dachigam','Dachigam','दाचीगाम',34.13,75.03,'jammu-kashmir','Srinagar','Hangul / Kashmir stag; Zabarwan landscape.','हंगुल / कश्मीरी बारहसिंगा; ज़बरवन क्षेत्र।'],
 ['np-kishtwar','Kishtwar High Altitude','किश्तवाड़ हाई एल्टीट्यूड',33.6,75.9,'jammu-kashmir','Kishtwar','High-altitude Chenab catchment landscape.','चिनाब जलग्रहण क्षेत्र की उच्च पर्वतीय स्थलाकृति।'],
 ['np-kazinag','Kazinag','काजीनाग',34.2,74.1,'jammu-kashmir','Baramulla','Western Kashmir mountain habitat associated with markhor.','मारखोर से संबंधित पश्चिमी कश्मीर का पर्वतीय आवास।'],
 ['np-great-himalayan','Great Himalayan','ग्रेट हिमालयन',31.8,77.5,'himachal-pradesh','Kullu','Western Himalayan temperate and alpine habitats; UNESCO World Heritage landscape.','पश्चिमी हिमालय के शीतोष्ण और अल्पाइन आवास; यूनेस्को विश्व धरोहर क्षेत्र।'],
 ['np-pin-valley','Pin Valley','पिन वैली',31.97,77.95,'himachal-pradesh','Lahaul and Spiti','Cold-desert habitat in the Pin–Spiti drainage.','पिन–स्पीति अपवाह क्षेत्र का शीत मरुस्थलीय आवास।'],
 ['np-nanda-devi','Nanda Devi','नंदा देवी',30.42,79.84,'uttarakhand','Chamoli','Nanda Devi sanctuary basin and Rishi Ganga gorge.','नंदा देवी अभय क्षेत्र और ऋषि गंगा गॉर्ज।'],
 ['np-valley-flowers','Valley of Flowers','फूलों की घाटी',30.73,79.61,'uttarakhand','Chamoli','Alpine flower meadows in the upper Alaknanda region.','ऊपरी अलकनंदा क्षेत्र में अल्पाइन पुष्प घासभूमि।'],
 ['np-gangotri','Gangotri','गंगोत्री',30.95,79.15,'uttarakhand','Uttarkashi','Bhagirathi headwaters and Gangotri glacier landscape.','भागीरथी की स्रोत-धाराएँ और गंगोत्री हिमनद क्षेत्र।'],
 ['np-rajaji','Rajaji','राजाजी',30.05,78.15,'uttarakhand','Dehradun, Haridwar and Pauri Garhwal','Shivalik foothills; elephant and tiger habitat.','शिवालिक की तलहटी; हाथी और बाघ का आवास।'],
 ['np-dudhwa','Dudhwa','दुधवा',28.49,80.63,'UP','Lakhimpur Kheri','Terai grasslands near the Nepal border.','नेपाल सीमा के पास तराई की घासभूमि।'],
 ['np-kuno','Kuno','कूनो',25.85,77.08,'madhya-pradesh','Sheopur','Kuno River landscape; cheetah reintroduction site.','कूनो नदी का क्षेत्र; चीता पुनर्स्थापन स्थल।'],
 ['np-kanha','Kanha','कान्हा',22.33,80.63,'madhya-pradesh','Mandla and Balaghat','Hard-ground barasingha and sal forest landscape.','कठोर भूमि वाला बारहसिंगा और साल वन क्षेत्र।'],
 ['np-bandhavgarh','Bandhavgarh','बांधवगढ़',23.7,81.03,'madhya-pradesh','Umaria','Vindhyan forest landscape associated with tiger conservation.','बाघ संरक्षण से संबंधित विंध्य का वन क्षेत्र।'],
 ['np-panna','Panna','पन्ना',24.72,79.97,'madhya-pradesh','Panna and Chhatarpur','Ken River gorge and dry deciduous forests.','केन नदी की गॉर्ज और शुष्क पर्णपाती वन।'],
 ['np-satpura','Satpura','सतपुड़ा',22.5,78.4,'madhya-pradesh','Narmadapuram','Central Indian highlands near Pachmarhi and the Denwa drainage.','पचमढ़ी और देनवा अपवाह क्षेत्र के पास मध्य भारतीय उच्चभूमि।'],
 ['np-pench','Pench','पेंच',21.75,79.3,'madhya-pradesh','Seoni and Chhindwara','Pench River landscape; adjoining protected areas extend into Maharashtra.','पेंच नदी क्षेत्र; पास के संरक्षित क्षेत्र महाराष्ट्र तक फैले हैं।'],
 ['np-ranthambore','Ranthambore','रणथंभौर',26.02,76.5,'rajasthan','Sawai Madhopur','Tiger landscape near the Aravalli–Vindhyan transition.','अरावली–विंध्य संक्रमण क्षेत्र के पास बाघ का आवास।'],
 ['np-sariska','Sariska','सरिस्का',27.33,76.43,'rajasthan','Alwar','Dry Aravalli forest and tiger habitat.','अरावली का शुष्क वन और बाघ का आवास।'],
 ['np-desert','Desert','डेज़र्ट',26.8,70.6,'rajasthan','Jaisalmer and Barmer','Thar Desert landscape; Great Indian bustard.','थार मरुस्थल का क्षेत्र; गोडावण / ग्रेट इंडियन बस्टर्ड।'],
 ['np-bhitarkanika','Bhitarkanika','भितरकनिका',20.7,86.87,'odisha','Kendrapara','Mangroves and saltwater crocodile; the broader mangrove wetland is a Ramsar site.','मैंग्रोव और खारे पानी के मगरमच्छ; व्यापक मैंग्रोव आर्द्रभूमि रामसर स्थल है।'],
 ['np-manas','Manas','मानस',26.75,91,'assam','Chirang–Baksa landscape','Bhutan foothills; Manas river system and grassland–forest habitats.','भूटान की तलहटी; मानस नदी तंत्र और घासभूमि–वन आवास।'],
 ['np-raimona','Raimona','रायमोना',26.65972,89.97611,'assam','Kokrajhar','Assam’s 6th national park, announced in June 2021; golden langur landscape.','जून 2021 में घोषित असम का छठा राष्ट्रीय उद्यान; सुनहरे लंगूर का क्षेत्र।'],
 ['np-dihing-patkai','Dihing Patkai','दिहिंग पटकाई',27.3,95.5,'assam','Dibrugarh and Tinsukia','Assam’s 7th national park, notified in June 2021; lowland rainforest.','जून 2021 में अधिसूचित असम का सातवाँ राष्ट्रीय उद्यान; निम्नभूमि वर्षावन।'],
 ['np-sikhna','Sikhna Jwhwlao','सिखना ज्व्ह्व्लाओ',26.74,90.3,'assam','Kokrajhar and Chirang','Recorded as Assam’s 8th national park in the State Economic Survey 2025–26.','राज्य आर्थिक सर्वेक्षण 2025–26 में असम का आठवाँ राष्ट्रीय उद्यान दर्ज है।'],
 ['np-namdapha','Namdapha','नामदाफा',27.5,96.4,'arunachal-pradesh','Changlang','Eastern Himalayan forest landscape along the Noa-Dihing system.','नोआ-दिहिंग तंत्र के साथ पूर्वी हिमालय का वन क्षेत्र।'],
 ['np-keibul','Keibul Lamjao','केइबुल लामजाओ',24.47,93.82,'manipur','Bishnupur','Floating phumdi habitat on Loktak Lake; Sangai deer.','लोकटक झील की तैरती फुमदी पर आवास; संगाई हिरण।'],
 ['np-balpakram','Balpakram','बालपक्रम',25.25,90.87,'meghalaya','South Garo Hills','Southern Garo Hills plateau and gorge landscape.','दक्षिणी गारो पहाड़ियों का पठार और गॉर्ज क्षेत्र।'],
 ['np-nokrek','Nokrek','नोकरेक',25.45,90.3,'meghalaya','West Garo Hills','Garo Hills forest landscape and wild citrus diversity.','गारो पहाड़ियों का वन क्षेत्र और जंगली नींबू प्रजातियों की विविधता।'],
 ['np-khangchendzonga','Khangchendzonga','कंचनजंगा',27.7,88.2,'sikkim','Gyalshing and Mangan','India’s first mixed UNESCO World Heritage Site; Himalayan glaciers and peaks.','भारत का पहला मिश्रित यूनेस्को विश्व धरोहर स्थल; हिमालयी हिमनद और शिखर।'],
 ['np-bandipur','Bandipur','बांदीपुर',11.67,76.63,'karnataka','Chamarajanagar','Nilgiri landscape; adjoining Mudumalai, Wayanad and Nagarhole forests.','नीलगिरि क्षेत्र; पास में मुदुमलाई, वायनाड और नागरहोल वन।'],
 ['np-nagarhole','Nagarhole / Rajiv Gandhi','नागरहोल / राजीव गांधी',12.05,76.15,'karnataka','Kodagu and Mysuru','Nilgiri forest landscape near the Kabini River.','काबिनी नदी के पास नीलगिरि का वन क्षेत्र।'],
 ['np-kudremukh','Kudremukh','कुद्रेमुख',13.15,75.25,'karnataka','Chikkamagaluru, Dakshina Kannada and Udupi','Western Ghats shola–grassland and evergreen forest landscape.','पश्चिमी घाट का शोला–घासभूमि और सदाबहार वन क्षेत्र।'],
 ['np-eravikulam','Eravikulam','एराविकुलम',10.2,77.05,'kerala','Idukki','Anamudi landscape near Munnar; Nilgiri tahr.','मुन्नार के पास अनामुडी क्षेत्र; नीलगिरि तहर।'],
 ['np-silent-valley','Silent Valley','साइलेंट वैली',11.09,76.43,'kerala','Palakkad','Kunthipuzha catchment and tropical evergreen forests.','कुंतीपुझा जलग्रहण क्षेत्र और उष्णकटिबंधीय सदाबहार वन।'],
 ['np-guindy','Guindy','गिंडी',13,80.23,'tamil-nadu','Chennai','Urban national park; dry evergreen scrub and blackbuck habitat.','नगरीय राष्ट्रीय उद्यान; शुष्क सदाबहार झाड़ी वन और कृष्णमृग का आवास।'],
 ['np-mudumalai','Mudumalai','मुदुमलाई',11.58,76.55,'tamil-nadu','The Nilgiris','Nilgiri landscape adjoining Bandipur and Wayanad.','बांदीपुर और वायनाड से लगा नीलगिरि का क्षेत्र।'],
 ['np-mukurthi','Mukurthi','मुकुर्थी',11.27,76.51,'tamil-nadu','The Nilgiris','High-altitude shola–grassland habitat of the Nilgiri tahr.','नीलगिरि तहर का उच्च पर्वतीय शोला–घासभूमि आवास।'],
 ['np-gulf-mannar','Gulf of Mannar Marine','मन्नार की खाड़ी मरीन',9.1,78.9,'tamil-nadu','Ramanathapuram and Thoothukudi coast','Marine national park; coral reefs, seagrass and dugong habitat.','समुद्री राष्ट्रीय उद्यान; प्रवाल, समुद्री घास और डुगोंग का आवास।'],
 ['np-tadoba','Tadoba','ताडोबा',20.2,79.4,'maharashtra','Chandrapur','Central Indian deciduous forest and tiger landscape.','मध्य भारत का पर्णपाती वन और बाघ का क्षेत्र।'],
 ['np-sanjay-gandhi','Sanjay Gandhi','संजय गांधी',19.22,72.91,'maharashtra','Mumbai Suburban and Thane','Protected forest within the Mumbai metropolitan landscape.','मुंबई महानगरीय क्षेत्र का संरक्षित वन।'],
 ['np-mollem','Mollem','मोलेम',15.38,74.26,'goa','South Goa','Western Ghats forest adjoining Bhagwan Mahavir Wildlife Sanctuary.','भगवान महावीर वन्यजीव अभयारण्य से लगा पश्चिमी घाट का वन।'],
 ['np-betla','Betla','बेतला',23.89,84.19,'jharkhand','Latehar','Chota Nagpur forest landscape within the Palamau region.','पलामू क्षेत्र में छोटानागपुर का वन क्षेत्र।'],
 ['np-kanger','Kanger Valley','कांगेर घाटी',18.85,81.98,'chhattisgarh','Bastar','Kanger River landscape; limestone caves and evergreen forest patches.','कांगेर नदी का क्षेत्र; चूना पत्थर की गुफाएँ और सदाबहार वन खंड।']
 ];
 for(const [id,short,hi,lat,lon,stateId,district,fact,factHi]of parks){
  const p=profile(stateId),name=short+' National Park';
  const f={id,name,hi:hi+' राष्ट्रीय उद्यान',lat,lon,region:'India',topic:'parks',area:p.name,areaHi:p.hi,noteStateIds:[stateId],fact,factHi,source:{id:stateId==='assam'?'assam-survey-review':'wii-parks-review'},placeDetails:{district,kind:'National park',kindHi:'राष्ट्रीय उद्यान'}};
  D.features.push(f);p.sections.parks.push({name,hi:f.hi,fact:'District / region: '+district+'. '+fact,factHi:'जिला / क्षेत्र: '+district+'। '+factHi,featureId:id});
 }
 const existingParkDistricts={kaziranga:'Golaghat, Nagaon and adjoining Sonitpur / Biswanath additions',gir:'Gir Somnath / Junagadh landscape',sundarbans:'South 24 Parganas',corbett:'Nainital and Pauri Garhwal',keoladeo:'Bharatpur',periyar:'Idukki and Pathanamthitta',simlipal:'Mayurbhanj',valmiki:'West Champaran'};
 for(const [id,district]of Object.entries(existingParkDistricts)){const f=D.features.find(f=>f.id===id);if(f)f.placeDetails={district,kind:'National park / protected landscape',kindHi:'राष्ट्रीय उद्यान / संरक्षित क्षेत्र'};}
 D.features.find(f=>f.id==='corbett').placeDetails.milestone='India’s oldest national park; established in 1936';
 const simlipal=D.features.find(f=>f.id==='simlipal');simlipal.placeDetails.milestone='Described as India’s 107th national park in the Odisha announcement of 24 April 2025';simlipal.placeDetails.reference='odisha-similipal-review';
 for(const [id,order]of [['np-raimona','Assam’s 6th national park'],['np-dihing-patkai','Assam’s 7th national park'],['np-sikhna','Assam’s 8th national park']])D.features.find(f=>f.id===id).placeDetails.milestone=order;
 for(const r of window.MAPPING_RAMSAR||[]){
  const p=profile(r.stateId),row=p.ramsar.find(row=>row.name===r.displayName);
  const f=D.features.find(f=>f.id===r.featureId)||{id:r.featureId,name:r.displayName,hi:r.hi,lat:r.lat,lon:r.lon,region:'India',topic:'water',area:p.name,areaHi:p.hi,noteStateIds:[p.id],fact:'Ramsar wetland in '+r.district+', '+p.name+'.',factHi:p.hi+' में '+r.district+' का रामसर आर्द्रभूमि स्थल।',source:{id:'rsis-atlas-review',page:r.sourcePage}};
  if(!D.features.includes(f))D.features.push(f);
  f.ramsar=r;f.noteStateIds=[...new Set([...(f.noteStateIds||[]),p.id])];
  f.placeDetails={...(f.placeDetails||{}),district:r.district,ramsar:r};
  if(r.rsis===2595||r.rsis===2597)f.mapBadge='India '+r.milestone;
  if(r.rsis===2602||r.rsis===2603)f.mapBadge='102–103 batch';
  row.featureId=f.id;row.ramsar=r;
  row.fact='District / region: '+r.district+'. Ramsar designation: '+r.designation+'. Global RSIS site no. '+r.rsis+'.'+(r.milestone?' India milestone: '+r.milestone+'; announced '+r.announced+'.':'');
  row.factHi='जिला / क्षेत्र: '+r.district+'। रामसर नामांकन: '+r.designation+'। वैश्विक RSIS स्थल संख्या '+r.rsis+'।'+(r.milestone?' भारत में: '+r.milestoneHi+'; घोषणा '+r.announced+'।':'');
 }
 if(!D.topics.some(t=>t.id==='ramsar'))D.topics.splice(D.topics.findIndex(t=>t.id==='water')+1,0,{id:'ramsar',en:'Ramsar wetlands',hi:'रामसर आर्द्रभूमियाँ',icon:'◈'});
 D.meta.reviewed='2026-11-07';
})();
