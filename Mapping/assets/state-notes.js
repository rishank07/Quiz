/* Original bilingual revision notes. See category references and the dated Ramsar list. */
(() => {
  'use strict';
  const rows = text => text.trim().split('\n').map(line => {
    const [name, hi, fact, factHi] = line.trim().split('|');
    return {name, hi, fact, factHi};
  });
  const profiles = [];
  function add(id, name, hi, capital, capitalHi, lat, lon, sections, ut = false) {
    profiles.push({id, name, hi, capital, capitalHi, lat, lon, ut, sections:Object.fromEntries(Object.entries(sections).map(([key,value]) => [key,rows(value)]))});
  }
  add('andhra-pradesh','Andhra Pradesh','आंध्र प्रदेश','Amaravati','अमरावती',16.54,80.52,{
    overview:`Location|स्थिति|Southeastern India; the Bay of Bengal lies to the east.|दक्षिण-पूर्वी भारत; पूर्व में बंगाल की खाड़ी है।
Neighbours|पड़ोसी राज्य|Odisha, Chhattisgarh, Telangana, Karnataka and Tamil Nadu.|ओडिशा, छत्तीसगढ़, तेलंगाना, कर्नाटक और तमिलनाडु।`,
    rivers:`Godavari|गोदावरी|Crosses the state towards its delta near Rajamahendravaram; drains into the Bay of Bengal.|राजमहेंद्रवरम के पास डेल्टा बनाती है और बंगाल की खाड़ी में गिरती है।
Krishna|कृष्णा|Flows past Vijayawada; the Godavari and Krishna deltas are important rice-growing areas.|विजयवाड़ा से बहती है; गोदावरी और कृष्णा डेल्टा धान के महत्वपूर्ण क्षेत्र हैं।
Pennar|पेन्नार|Rises in Karnataka and reaches the Bay of Bengal near Nellore.|कर्नाटक में निकलती है और नेल्लोर के पास बंगाल की खाड़ी में गिरती है।`,
    water:`Kolleru and Pulicat|कोल्लेरू और पुलिकट|Kolleru is a freshwater lake between the Krishna and Godavari deltas. Pulicat is a brackish lagoon shared with Tamil Nadu.|कोल्लेरू कृष्णा-गोदावरी डेल्टा के बीच मीठे पानी की झील है। पुलिकट तमिलनाडु के साथ साझा खारे पानी की लैगून है।
Srisailam and Nagarjuna Sagar|श्रीशैलम और नागार्जुन सागर|Major Krishna projects on the Andhra Pradesh–Telangana boundary.|आंध्र प्रदेश–तेलंगाना सीमा पर कृष्णा नदी की प्रमुख परियोजनाएँ।
Polavaram|पोलावरम|A multipurpose irrigation project on the Godavari.|गोदावरी पर बहुउद्देशीय सिंचाई परियोजना।`,
    parks:`Sri Venkateswara|श्री वेंकटेश्वर|National park in the Eastern Ghats near Tirupati.|तिरुपति के पास पूर्वी घाट में राष्ट्रीय उद्यान।
Papikonda and Rajiv Gandhi (Rameswaram)|पापिकोंडा और राजीव गांधी (रामेश्वरम)|National parks; Papikonda protects the Godavari hill landscape.|राष्ट्रीय उद्यान; पापिकोंडा गोदावरी के पहाड़ी क्षेत्र को संरक्षित करता है।
Coringa and Sri Lankamalleswara|कोरिंगा और श्री लंकामल्लेश्वर|Coringa is associated with mangroves; Sri Lankamalleswara sanctuary with Jerdon's courser.|कोरिंगा मैंग्रोव और श्री लंकामल्लेश्वर अभयारण्य जर्डन कोर्सर पक्षी से संबंधित है।`,
    minerals:`Barytes|बैराइट्स|Mangampeta in the Kadapa region is an important barytes deposit.|कडपा क्षेत्र का मंगमपेटा बैराइट्स का महत्वपूर्ण निक्षेप है।
Limestone and mica|चूना पत्थर और अभ्रक|Limestone supports cement production; the Nellore belt is associated with mica.|चूना पत्थर सीमेंट उद्योग का आधार है; नेल्लोर क्षेत्र अभ्रक से जुड़ा है।`,
    terrain:`Eastern Ghats|पूर्वी घाट|Discontinuous hills include the Nallamala and Seshachalam ranges.|खंडित पर्वतीय क्षेत्र में नल्लमाला और शेषाचलम श्रेणियाँ शामिल हैं।
Rayalaseema|रायलसीमा|Interior plateau region; contrast it with the wetter irrigated coastal deltas.|आंतरिक पठारी क्षेत्र; इसकी तुलना अधिक सिंचित तटीय डेल्टा से करें।`,
    economy:`Agriculture|कृषि|Rice, tobacco, chillies, groundnut and aquaculture are important.|धान, तंबाकू, मिर्च, मूँगफली और जलीय कृषि महत्वपूर्ण हैं।
Ports and space|पत्तन और अंतरिक्ष|Visakhapatnam is a major port; Sriharikota hosts the Satish Dhawan Space Centre.|विशाखापत्तनम प्रमुख पत्तन है; श्रीहरिकोटा में सतीश धवन अंतरिक्ष केंद्र है।`
  });
  add('arunachal-pradesh','Arunachal Pradesh','अरुणाचल प्रदेश','Itanagar','ईटानगर',27.10,93.62,{
    overview:`Location|स्थिति|Northeastern Himalayan state; international borders with Bhutan, China and Myanmar.|पूर्वोत्तर हिमालयी राज्य; भूटान, चीन और म्यांमार से अंतरराष्ट्रीय सीमा।
Neighbours|पड़ोसी राज्य|Assam and Nagaland.|असम और नागालैंड।`,
    rivers:`Siang|सियांग|The Yarlung Tsangpo enters India as Siang; the Brahmaputra system continues into Assam.|यारलुंग त्सांगपो भारत में सियांग कहलाती है; ब्रह्मपुत्र तंत्र आगे असम जाता है।
Dibang and Lohit|दिबांग और लोहित|Major eastern tributary systems of the Brahmaputra.|ब्रह्मपुत्र की प्रमुख पूर्वी सहायक नदी प्रणालियाँ।
Subansiri and Kameng|सुबनसिरी और कामेंग|Important north-bank tributaries of the Brahmaputra.|ब्रह्मपुत्र की उत्तर तट की महत्वपूर्ण सहायक नदियाँ।`,
    water:`Sela and Sangetsar|सेला और संगेसर|High-altitude lakes of the Tawang region.|तवांग क्षेत्र की उच्च हिमालयी झीलें।
Parshuram Kund|परशुराम कुंड|A pilgrimage site on the Lohit River.|लोहित नदी पर तीर्थस्थल।`,
    parks:`Namdapha|नामदाफा|National park and tiger reserve in the eastern Himalayan landscape.|पूर्वी हिमालयी क्षेत्र में राष्ट्रीय उद्यान और बाघ अभयारण्य।
Mouling|मौलिंग|National park in the Siang region.|सियांग क्षेत्र का राष्ट्रीय उद्यान।
Eaglenest and Pakke|ईगलनेस्ट और पक्के|Eaglenest is important for birds; Pakke is associated with hornbill conservation.|ईगलनेस्ट पक्षियों और पक्के हॉर्नबिल संरक्षण के लिए महत्वपूर्ण है।`,
    minerals:`Resources|संसाधन|Coal, limestone and petroleum occurrences are important mineral associations.|कोयला, चूना पत्थर और पेट्रोलियम के निक्षेप महत्वपूर्ण हैं।
Energy|ऊर्जा|Steep Himalayan rivers give the state substantial hydropower potential.|तेज ढाल वाली हिमालयी नदियाँ जलविद्युत की व्यापक संभावना देती हैं।`,
    terrain:`Eastern Himalaya|पूर्वी हिमालय|High mountains grade into foothills towards Assam.|ऊँचे पर्वत असम की ओर तलहटी में बदलते हैं।
Sela and Bomdi La|सेला और बोमडिला|Important passes; Tawang lies north of the Sela route.|महत्वपूर्ण दर्रे; तवांग सेला मार्ग के उत्तर में है।`,
    economy:`Farming|कृषि|Rice, maize, millet, horticulture and local shifting cultivation are important.|धान, मक्का, मोटे अनाज, बागवानी और स्थानीय झूम खेती महत्वपूर्ण हैं।
Heritage|विरासत|Tawang Monastery and Ziro Valley are key location associations.|तवांग मठ और जीरो घाटी महत्वपूर्ण स्थान-संबंध हैं।`
  });
  add('assam','Assam','असम','Dispur','दिसपुर',26.14,91.79,{
    overview:`Location|स्थिति|The Brahmaputra Valley and Barak Valley form the two main river-valley regions.|ब्रह्मपुत्र और बराक घाटियाँ दो प्रमुख नदी-घाटी क्षेत्र हैं।
Borders|सीमाएँ|International borders with Bhutan and Bangladesh; land links with seven Indian states.|भूटान और बांग्लादेश से अंतरराष्ट्रीय सीमा; सात भारतीय राज्यों से स्थल संपर्क।`,
    rivers:`Brahmaputra|ब्रह्मपुत्र|Flows west through Assam; Majuli is a river island in this system.|असम में पश्चिम की ओर बहती है; माजुली इसी तंत्र का नदी-द्वीप है।
Barak|बराक|Drains southern Assam before dividing into Surma and Kushiyara in Bangladesh.|दक्षिणी असम को अपवाहित करके बांग्लादेश में सुरमा और कुशियारा में बँटती है।
Tributaries|सहायक नदियाँ|Subansiri, Manas, Jia Bharali and Dhansiri are important Brahmaputra tributaries.|सुबनसिरी, मानस, जिया भराली और धनसिरी ब्रह्मपुत्र की महत्वपूर्ण सहायक नदियाँ हैं।`,
    water:`Deepor Beel|दीपोर बील|Freshwater wetland southwest of Guwahati, connected to the Brahmaputra floodplain.|गुवाहाटी के दक्षिण-पश्चिम में ब्रह्मपुत्र बाढ़मैदान से जुड़ी मीठे पानी की आर्द्रभूमि।
Floodplain lakes|बाढ़मैदानी झीलें|Beels and seasonal wetlands are characteristic features of the valley.|बील और मौसमी आर्द्रभूमियाँ घाटी की विशेषताएँ हैं।`,
    parks:`Kaziranga and Manas|काजीरंगा और मानस|Both are UNESCO World Heritage sites; Kaziranga is strongly associated with the one-horned rhinoceros.|दोनों यूनेस्को विश्व धरोहर हैं; काजीरंगा एक सींग वाले गैंडे से विशेष रूप से जुड़ा है।
Other national parks|अन्य राष्ट्रीय उद्यान|Nameri, Orang, Dibru-Saikhowa, Raimona and Dehing Patkai are important names.|नामेरी, ओरांग, डिब्रू-सैखोवा, रायमोना और देहिंग पटकाई महत्वपूर्ण नाम हैं।
Sikhna Jwhwlao|सिखना ज्व्ह्वलाओ|Listed in the Assam Economic Survey 2025–26 protected-area context; remember its Kokrajhar–Chirang location.|असम आर्थिक सर्वेक्षण 2025–26 के संरक्षित क्षेत्र संदर्भ में शामिल; कोकराझार–चिरांग स्थिति याद रखें।`,
    minerals:`Petroleum|पेट्रोलियम|Digboi, Naharkatiya, Moran and Duliajan are important oil and gas associations.|डिगबोई, नाहरकटिया, मोरान और दुलियाजान तेल-गैस से जुड़े प्रमुख स्थान हैं।
Coal and limestone|कोयला और चूना पत्थर|Makum coalfield and the hill-district limestone deposits are important.|माकुम कोयला क्षेत्र और पहाड़ी जिलों के चूना पत्थर निक्षेप महत्वपूर्ण हैं।`,
    terrain:`Valleys and hills|घाटियाँ और पहाड़ियाँ|Alluvial valleys contrast with the Karbi Anglong and Dima Hasao hills.|जलोढ़ घाटियाँ कार्बी आंगलोंग और दीमा हसाओ पहाड़ियों से भिन्न हैं।
River hazards|नदीजनित आपदाएँ|Flooding, bank erosion and channel shifts are central geographical issues.|बाढ़, तट कटाव और नदी मार्ग बदलना प्रमुख भौगोलिक मुद्दे हैं।`,
    economy:`Tea and silk|चाय और रेशम|Tea plantations and muga silk are important economic and cultural associations.|चाय बागान और मूगा रेशम महत्वपूर्ण आर्थिक-सांस्कृतिक संबंध हैं।
Agriculture|कृषि|Rice and jute are important; alluvial plains support intensive farming.|धान और जूट महत्वपूर्ण हैं; जलोढ़ मैदान सघन कृषि का आधार हैं।`
  });
  add('Bihar','Bihar','बिहार','Patna','पटना',25.61,85.14,{
    overview:`Location|स्थिति|Eastern India; Nepal lies to the north. The Ganga divides the northern and southern plains.|पूर्वी भारत; उत्तर में नेपाल। गंगा उत्तरी और दक्षिणी मैदानों को विभाजित करती है।
Neighbours|पड़ोसी राज्य|Uttar Pradesh, Jharkhand and West Bengal.|उत्तर प्रदेश, झारखंड और पश्चिम बंगाल।`,
    rivers:`Ganga|गंगा|Flows west to east past Patna, Munger and Bhagalpur.|पटना, मुंगेर और भागलपुर से पश्चिम से पूर्व बहती है।
Gandak and Kosi|गंडक और कोसी|Himalayan tributaries entering from Nepal; Kosi is associated with frequent channel shifts and floods.|नेपाल से आने वाली हिमालयी सहायक नदियाँ; कोसी मार्ग परिवर्तन और बाढ़ से जुड़ी है।
Son|सोन|A right-bank tributary joining the Ganga near Maner.|मनेर के पास गंगा में मिलने वाली दाहिने तट की सहायक नदी।
Other rivers|अन्य नदियाँ|Ghaghara, Burhi Gandak, Bagmati, Kamla Balan, Mahananda, Punpun and Falgu are important.|घाघरा, बूढ़ी गंडक, बागमती, कमला बलान, महानंदा, पुनपुन और फल्गु महत्वपूर्ण हैं।`,
    water:`Kanwar / Kabartal|काँवर / काबरताल|Begusarai wetland; an important oxbow-lake and bird-habitat association.|बेगूसराय की आर्द्रभूमि; गोखुर झील और पक्षी आवास का महत्वपूर्ण संबंध।
Nagi and Nakti|नागी और नकटी|Reservoir-based bird sanctuaries in Jamui district.|जमुई जिले में जलाशय आधारित पक्षी अभयारण्य।
Barrages|बैराज|Gandak barrage at Valmikinagar and Kosi barrage at Bhimnagar are important irrigation and flood-control associations.|वाल्मीकिनगर का गंडक और भीमनगर का कोसी बैराज सिंचाई-बाढ़ नियंत्रण से जुड़े हैं।`,
    parks:`Valmiki|वाल्मीकि|Bihar's national park and tiger reserve, in West Champaran along the Nepal border.|नेपाल सीमा पर पश्चिम चंपारण में बिहार का राष्ट्रीय उद्यान और बाघ अभयारण्य।
Vikramshila Gangetic Dolphin Sanctuary|विक्रमशिला गंगा डॉल्फिन अभयारण्य|A protected Ganga stretch in Bhagalpur district.|भागलपुर जिले में गंगा नदी का संरक्षित भाग।
Other sanctuaries|अन्य अभयारण्य|Kaimur, Bhimbandh, Gautam Buddha and Pant (Rajgir) are important names.|कैमूर, भीमबांध, गौतम बुद्ध और पंत (राजगीर) महत्वपूर्ण नाम हैं।`,
    minerals:`Limestone and pyrite|चूना पत्थर और पाइराइट|Kaimur–Rohtas is associated with limestone; Amjhore with pyrite.|कैमूर–रोहतास चूना पत्थर और अमझोर पाइराइट से जुड़ा है।
Mica belt|अभ्रक क्षेत्र|Southern Bihar, including Nawada and Jamui, has mica occurrences; do not place Jharkhand's major coalfields in present-day Bihar.|नवादा-जमुई सहित दक्षिण बिहार में अभ्रक मिलता है; झारखंड के प्रमुख कोयला क्षेत्र वर्तमान बिहार में न रखें।`,
    terrain:`North Bihar|उत्तर बिहार|Young alluvial plains, Himalayan rivers and recurrent floods.|नवीन जलोढ़ मैदान, हिमालयी नदियाँ और बार-बार बाढ़।
South Bihar|दक्षिण बिहार|Alluvial plains meet the Kaimur plateau and Rajgir hills towards the south.|दक्षिण में जलोढ़ मैदान कैमूर पठार और राजगीर पहाड़ियों से मिलते हैं।`,
    economy:`Crops|फसलें|Rice, wheat, maize, pulses, litchi and makhana are important.|धान, गेहूँ, मक्का, दलहन, लीची और मखाना महत्वपूर्ण हैं।
Location pairs|स्थान-संबंध|Muzaffarpur—litchi; Mithila—makhana; Bhagalpur—silk.|मुजफ्फरपुर—लीची; मिथिला—मखाना; भागलपुर—रेशम।
Heritage|विरासत|Bodh Gaya, Nalanda, Rajgir, Vaishali and Vikramshila are key historical locations.|बोधगया, नालंदा, राजगीर, वैशाली और विक्रमशिला प्रमुख ऐतिहासिक स्थल हैं।`
  });
  add('chhattisgarh','Chhattisgarh','छत्तीसगढ़','Raipur','रायपुर',21.25,81.63,{
    overview:`Location|स्थिति|Central-eastern India; the Chhattisgarh plain is bordered by plateaus and hills.|मध्य-पूर्वी भारत; छत्तीसगढ़ मैदान के चारों ओर पठार और पहाड़ियाँ हैं।
Neighbours|पड़ोसी राज्य|Madhya Pradesh, Maharashtra, Telangana, Andhra Pradesh, Odisha, Jharkhand and Uttar Pradesh.|मध्य प्रदेश, महाराष्ट्र, तेलंगाना, आंध्र प्रदेश, ओडिशा, झारखंड और उत्तर प्रदेश।`,
    rivers:`Mahanadi|महानदी|Rises in the Sihawa hills and flows towards Odisha.|सिहावा पहाड़ियों से निकलकर ओडिशा की ओर बहती है।
Indravati|इंद्रावती|Flows through Bastar and joins the Godavari.|बस्तर से बहकर गोदावरी में मिलती है।
Tributaries|सहायक नदियाँ|Shivnath is a major Mahanadi tributary; Hasdeo is important for coal-belt drainage.|शिवनाथ महानदी की प्रमुख सहायक नदी है; हसदेव कोयला क्षेत्र का अपवाह करती है।`,
    water:`Chitrakote and Tirathgarh|चित्रकोट और तीरथगढ़|Chitrakote waterfall is on the Indravati; Tirathgarh lies in the Kanger landscape.|चित्रकोट इंद्रावती पर है; तीरथगढ़ कांगेर क्षेत्र में है।
Gangrel|गंगरेल|Ravishankar Sagar reservoir on the Mahanadi.|महानदी पर रविशंकर सागर जलाशय।`,
    parks:`Indravati and Kanger Valley|इंद्रावती और कांगेर घाटी|National parks associated with the Bastar region.|बस्तर क्षेत्र से संबंधित राष्ट्रीय उद्यान।
Guru Ghasidas|गुरु घासीदास|National park in northern Chhattisgarh; part of the Guru Ghasidas–Tamor Pingla tiger-reserve landscape.|उत्तरी छत्तीसगढ़ का राष्ट्रीय उद्यान; गुरु घासीदास–तमोर पिंगला बाघ क्षेत्र का भाग।`,
    minerals:`Iron ore|लौह अयस्क|Bailadila and Dalli-Rajhara are important iron-ore locations.|बैलाडीला और दल्ली-राजहरा महत्वपूर्ण लौह अयस्क क्षेत्र हैं।
Coal and bauxite|कोयला और बॉक्साइट|Korba and the Hasdeo-Arand belt are linked with coal; Mainpat with bauxite.|कोरबा और हसदेव-अरण्ड कोयले तथा मैनपाट बॉक्साइट से जुड़े हैं।`,
    terrain:`Physical divisions|भौतिक विभाग|Chhattisgarh plain, northern hills and the Bastar plateau.|छत्तीसगढ़ मैदान, उत्तरी पहाड़ियाँ और बस्तर पठार।
Forests|वन|Sal and mixed deciduous forests are characteristic.|साल और मिश्रित पर्णपाती वन प्रमुख हैं।`,
    economy:`Rice and industry|धान और उद्योग|The plains are important for rice; Bhilai is a major steel centre.|मैदान धान के लिए और भिलाई इस्पात उद्योग के लिए महत्वपूर्ण है।
Power|ऊर्जा|Coalfields underpin thermal-power generation in the Korba region.|कोरबा क्षेत्र में कोयला तापविद्युत का आधार है।`
  });
  add('goa','Goa','गोवा','Panaji','पणजी',15.49,73.83,{
    overview:`Location|स्थिति|Small western coastal state on the Arabian Sea.|अरब सागर पर छोटा पश्चिमी तटीय राज्य।
Neighbours|पड़ोसी राज्य|Maharashtra and Karnataka.|महाराष्ट्र और कर्नाटक।`,
    rivers:`Mandovi and Zuari|मांडवी और जुआरी|Two principal estuarine river systems of Goa.|गोवा की दो प्रमुख ज्वारनदमुखीय नदी प्रणालियाँ।
Terekhol|तेरेखोल|Forms part of Goa's northern boundary with Maharashtra.|महाराष्ट्र के साथ गोवा की उत्तरी सीमा का एक भाग बनाती है।`,
    water:`Dudhsagar|दूधसागर|Waterfall on the Mandovi river system in the Western Ghats.|पश्चिमी घाट में मांडवी नदी तंत्र का जलप्रपात।
Nanda Lake|नंदा झील|A freshwater wetland in South Goa.|दक्षिण गोवा की मीठे पानी की आर्द्रभूमि।`,
    parks:`Mollem|मोलेम|National park adjoining the Bhagwan Mahavir wildlife sanctuary landscape.|भगवान महावीर वन्यजीव अभयारण्य क्षेत्र से जुड़ा राष्ट्रीय उद्यान।
Bondla, Cotigao and Salim Ali|बोंडला, कोटीगाँव और सलीम अली|Important sanctuaries; Salim Ali Bird Sanctuary lies on Chorao Island.|महत्वपूर्ण अभयारण्य; सलीम अली पक्षी अभयारण्य चोराओ द्वीप पर है।`,
    minerals:`Iron ore and manganese|लौह अयस्क और मैंगनीज|Important mineral associations; production depends on permissions and mining status.|महत्वपूर्ण खनिज संबंध; उत्पादन अनुमति और खनन स्थिति पर निर्भर है।
Laterite|लेटराइट|Common weathered material used in local construction.|स्थानीय निर्माण में प्रयुक्त सामान्य अपक्षयित पदार्थ।`,
    terrain:`Konkan and Sahyadri|कोंकण और सह्याद्रि|A narrow coastal plain rises eastward into the Western Ghats.|संकरी तटीय पट्टी पूर्व में पश्चिमी घाट की ओर ऊँची होती है।
Soils|मृदा|Lateritic soils are widespread; alluvium occurs in river valleys.|लेटराइट मिट्टी व्यापक है; नदी घाटियों में जलोढ़ मिट्टी मिलती है।`,
    economy:`Port|पत्तन|Mormugao is the important major port.|मोरमुगाओ महत्वपूर्ण प्रमुख पत्तन है।
Economy and heritage|अर्थव्यवस्था और विरासत|Tourism, fisheries, cashew and the Churches and Convents of Goa are key associations.|पर्यटन, मत्स्यन, काजू और गोवा के चर्च व कॉन्वेंट महत्वपूर्ण हैं।`
  });
  add('gujarat','Gujarat','गुजरात','Gandhinagar','गांधीनगर',23.22,72.65,{
    overview:`Location|स्थिति|Western India; borders Pakistan and the Arabian Sea.|पश्चिमी भारत; पाकिस्तान और अरब सागर से सीमा।
Neighbours|पड़ोसी राज्य|Rajasthan, Madhya Pradesh and Maharashtra; also adjoins Dadra and Nagar Haveli and Daman and Diu UT.|राजस्थान, मध्य प्रदेश और महाराष्ट्र; दादरा और नगर हवेली तथा दमन और दीव केंद्रशासित प्रदेश से भी सटा है।`,
    rivers:`Narmada|नर्मदा|Flows west into the Gulf of Khambhat; Sardar Sarovar is built on it.|पश्चिम की ओर खंभात की खाड़ी में गिरती है; इस पर सरदार सरोवर बाँध है।
Tapi|ताप्ती|Flows through the Surat region to the Gulf of Khambhat; Ukai dam is on this river.|सूरत क्षेत्र से खंभात की खाड़ी में गिरती है; उकाई बाँध इसी पर है।
Sabarmati and Mahi|साबरमती और माही|Sabarmati flows through Ahmedabad; both systems drain towards the Gulf of Khambhat.|साबरमती अहमदाबाद से बहती है; दोनों तंत्र खंभात की खाड़ी की ओर जाते हैं।
Luni|लूनी|A river of arid Rajasthan that terminates in the Rann region.|शुष्क राजस्थान की नदी जो कच्छ के रण क्षेत्र में समाप्त होती है।`,
    water:`Nal Sarovar and Thol|नल सरोवर और थोल|Important bird-rich wetlands; both have Ramsar recognition.|पक्षियों से समृद्ध महत्वपूर्ण आर्द्रभूमियाँ; दोनों रामसर स्थल हैं।
Sardar Sarovar and Ukai|सरदार सरोवर और उकाई|Associate them with Narmada and Tapi respectively.|इन्हें क्रमशः नर्मदा और ताप्ती से जोड़ें।`,
    parks:`Gir|गिर|National park and adjoining sanctuary landscape associated with the Asiatic lion.|एशियाई सिंह से जुड़ा राष्ट्रीय उद्यान और समीपवर्ती अभयारण्य क्षेत्र।
Other national parks|अन्य राष्ट्रीय उद्यान|Blackbuck (Velavadar), Marine (Gulf of Kutch) and Vansda.|ब्लैकबक (वेलावदर), मरीन (कच्छ की खाड़ी) और वंसदा।
Wild Ass Sanctuary|वन्य गधा अभयारण्य|Little Rann of Kutch; associated with the Indian wild ass.|कच्छ का छोटा रण; भारतीय जंगली गधे से संबंधित।`,
    minerals:`Oil and gas|तेल और गैस|Ankleshwar, Kalol and Cambay basin are important associations.|अंकलेश्वर, कलोल और खंभात बेसिन महत्वपूर्ण संबंध हैं।
Lignite and bauxite|लिग्नाइट और बॉक्साइट|Kutch and Bharuch are important lignite areas; bauxite occurs in Kutch and Saurashtra.|कच्छ-भरूच महत्वपूर्ण लिग्नाइट क्षेत्र हैं; कच्छ-सौराष्ट्र में बॉक्साइट मिलता है।
Salt|नमक|The Rann and coastal saline environments support salt production.|रण और तटीय लवणीय क्षेत्र नमक उत्पादन का आधार हैं।`,
    terrain:`Three regions|तीन क्षेत्र|Kutch, Saurashtra peninsula and mainland Gujarat.|कच्छ, सौराष्ट्र प्रायद्वीप और मुख्यभूमि गुजरात।
Gulfs and hills|खाड़ियाँ और पहाड़ियाँ|Gulf of Kutch, Gulf of Khambhat and Girnar hills are important map locations.|कच्छ की खाड़ी, खंभात की खाड़ी और गिरनार पहाड़ियाँ महत्वपूर्ण मानचित्र स्थल हैं।`,
    economy:`Crops and industry|फसलें और उद्योग|Cotton and groundnut; textiles, petrochemicals and dairy cooperatives.|कपास और मूँगफली; वस्त्र, पेट्रोकेमिकल और दुग्ध सहकारी उद्योग।
Ports and heritage|पत्तन और विरासत|Deendayal (Kandla) and Mundra ports; Dholavira and Rani-ki-Vav heritage sites.|दीनदयाल (कांडला) और मुंद्रा पत्तन; धोलावीरा और रानी की वाव धरोहर स्थल।`
  });
  add('haryana','Haryana','हरियाणा','Chandigarh','चंडीगढ़',30.74,76.79,{
    overview:`Location|स्थिति|Landlocked northwestern state; Chandigarh is also Punjab's capital.|उत्तर-पश्चिमी स्थलरुद्ध राज्य; चंडीगढ़ पंजाब की भी राजधानी है।
Neighbours|पड़ोसी क्षेत्र|Punjab, Himachal Pradesh, Uttarakhand, Uttar Pradesh, Rajasthan and Delhi.|पंजाब, हिमाचल प्रदेश, उत्तराखंड, उत्तर प्रदेश, राजस्थान और दिल्ली।`,
    rivers:`Yamuna|यमुना|Forms much of the eastern boundary; Western Yamuna Canal is an important irrigation link.|पूर्वी सीमा का बड़ा भाग बनाती है; पश्चिमी यमुना नहर महत्वपूर्ण सिंचाई स्रोत है।
Ghaggar|घग्गर|Seasonal river draining parts of northern Haryana.|उत्तरी हरियाणा के भागों की मौसमी नदी।`,
    water:`Sultanpur and Bhindawas|सुल्तानपुर और भिंडावास|Important bird wetlands in the Gurugram and Jhajjar regions respectively.|क्रमशः गुरुग्राम और झज्जर क्षेत्र की महत्वपूर्ण पक्षी आर्द्रभूमियाँ।
Canal irrigation|नहर सिंचाई|Western Yamuna Canal and Bhakra canal systems support agriculture.|पश्चिमी यमुना और भाखड़ा नहर प्रणालियाँ कृषि का आधार हैं।`,
    parks:`Sultanpur and Kalesar|सुल्तानपुर और कलेसर|The state's national parks; Kalesar lies in the Shivalik foothills.|राज्य के राष्ट्रीय उद्यान; कलेसर शिवालिक तलहटी में है।
Bhindawas|भिंडावास|Wildlife sanctuary and Ramsar wetland.|वन्यजीव अभयारण्य और रामसर आर्द्रभूमि।`,
    minerals:`Building minerals|निर्माण खनिज|Stone, silica sand and quartzite are important associations; check legal mining status separately.|पत्थर, सिलिका बालू और क्वार्टजाइट महत्वपूर्ण हैं; वैध खनन स्थिति अलग जाँचें।
Resource pattern|संसाधन स्वरूप|Agriculture and manufacturing matter more than a large metallic-ore base.|बड़े धात्विक अयस्क आधार की अपेक्षा कृषि-विनिर्माण अधिक महत्वपूर्ण हैं।`,
    terrain:`Plains and hills|मैदान और पहाड़ियाँ|Alluvial plains dominate; Shivaliks in the northeast and Aravalli outliers in the south.|जलोढ़ मैदान प्रमुख; उत्तर-पूर्व में शिवालिक और दक्षिण में अरावली के अवशेष।
Soils|मृदा|Alluvial soils grade into sandy soils towards the southwest.|दक्षिण-पश्चिम की ओर जलोढ़ मिट्टी रेतीली मिट्टी में बदलती है।`,
    economy:`Agriculture|कृषि|Wheat, rice, mustard and cotton; intensive irrigation and Green Revolution associations.|गेहूँ, धान, सरसों और कपास; सघन सिंचाई और हरित क्रांति से संबंध।
Industry and heritage|उद्योग और विरासत|Gurugram–Manesar automotive belt; Rakhigarhi and Kurukshetra.|गुरुग्राम–मानेसर वाहन उद्योग क्षेत्र; राखीगढ़ी और कुरुक्षेत्र।`
  });
  add('himachal-pradesh','Himachal Pradesh','हिमाचल प्रदेश','Shimla; Dharamshala (winter)','शिमला; धर्मशाला (शीतकालीन)',31.10,77.17,{
    overview:`Location|स्थिति|Western Himalaya; shares an international border with China.|पश्चिमी हिमालय; चीन से अंतरराष्ट्रीय सीमा।
Neighbours|पड़ोसी क्षेत्र|Jammu and Kashmir, Ladakh, Punjab, Haryana, Uttar Pradesh and Uttarakhand.|जम्मू-कश्मीर, लद्दाख, पंजाब, हरियाणा, उत्तर प्रदेश और उत्तराखंड।`,
    rivers:`Indus basin rivers|सिंधु बेसिन की नदियाँ|Chenab, Ravi, Beas and Sutlej drain large parts of the state.|चिनाब, रावी, ब्यास और सतलुज राज्य के बड़े भाग का अपवाह करती हैं।
Chenab|चिनाब|Formed by the Chandra and Bhaga near Tandi in Lahaul.|लाहौल के तांदी के पास चंद्रा और भागा से बनती है।
Yamuna tributaries|यमुना की सहायक नदियाँ|Giri and Pabbar belong to the Yamuna drainage system.|गिरि और पब्बर यमुना अपवाह तंत्र में हैं।`,
    water:`Pong and Gobind Sagar|पोंग और गोविंद सागर|Pong is on Beas; Gobind Sagar is the Bhakra reservoir on Sutlej.|पोंग ब्यास पर; गोविंद सागर सतलुज के भाखड़ा बाँध का जलाशय है।
Chandra Tal and Renuka|चंद्रताल और रेणुका|Chandra Tal is a high-altitude lake; Renuka lies in Sirmaur.|चंद्रताल उच्च हिमालयी झील है; रेणुका सिरमौर में है।`,
    parks:`Great Himalayan|ग्रेट हिमालयन|National park in Kullu; a UNESCO World Heritage site.|कुल्लू का राष्ट्रीय उद्यान; यूनेस्को विश्व धरोहर।
Other national parks|अन्य राष्ट्रीय उद्यान|Pin Valley, Khirganga, Inderkilla and Simbalbara.|पिन वैली, खीरगंगा, इंदरकिला और सिम्बलबारा।`,
    minerals:`Limestone and rock salt|चूना पत्थर और सेंधा नमक|Limestone supports cement; Drang and Guma in Mandi are rock-salt associations.|चूना पत्थर सीमेंट का आधार; मंडी के द्रंग और गुम्मा सेंधा नमक से जुड़े हैं।
Hydropower|जलविद्युत|Bhakra, Nathpa Jhakri and Koldam are important Sutlej projects.|भाखड़ा, नाथपा झाकड़ी और कोलडैम सतलुज की प्रमुख परियोजनाएँ हैं।`,
    terrain:`Ranges and passes|श्रेणियाँ और दर्रे|Shivalik, Dhauladhar, Pir Panjal; Rohtang, Baralacha La, Shipki La and Kunzum passes.|शिवालिक, धौलाधार, पीर पंजाल; रोहतांग, बारालाचा ला, शिपकी ला और कुंजुम दर्रे।
Cold desert|शीत मरुस्थल|Lahaul–Spiti lies in the Himalayan rain-shadow zone.|लाहौल–स्पीति हिमालय के वृष्टिछाया क्षेत्र में है।`,
    economy:`Horticulture|बागवानी|Apples and temperate fruits are important; Kangra is associated with tea.|सेब और शीतोष्ण फल महत्वपूर्ण; कांगड़ा चाय से जुड़ा है।
Tourism|पर्यटन|Kullu, Manali, Shimla, Dharamshala and Spiti are important locations.|कुल्लू, मनाली, शिमला, धर्मशाला और स्पीति महत्वपूर्ण स्थान हैं।`
  });
  add('jharkhand','Jharkhand','झारखंड','Ranchi','राँची',23.34,85.31,{
    overview:`Location|स्थिति|Eastern plateau state formed from Bihar in 2000.|वर्ष 2000 में बिहार से बना पूर्वी पठारी राज्य।
Neighbours|पड़ोसी राज्य|Bihar, West Bengal, Odisha, Chhattisgarh and Uttar Pradesh.|बिहार, पश्चिम बंगाल, ओडिशा, छत्तीसगढ़ और उत्तर प्रदेश।`,
    rivers:`Damodar|दामोदर|Flows through the coal belt to West Bengal; associated with the Damodar Valley Corporation.|कोयला क्षेत्र से पश्चिम बंगाल जाती है; दामोदर घाटी निगम से संबंधित।
Subarnarekha|सुबर्णरेखा|Flows past the Ranchi–Jamshedpur region towards the Bay of Bengal.|राँची–जमशेदपुर क्षेत्र से बंगाल की खाड़ी की ओर बहती है।
Other rivers|अन्य नदियाँ|North Koel, South Koel, Barakar and Mayurakshi are important.|उत्तरी कोयल, दक्षिणी कोयल, बराकर और मयूराक्षी महत्वपूर्ण हैं।`,
    water:`Falls|जलप्रपात|Hundru—Subarnarekha; Dassam—Kanchi; Lodh—Burha river.|हुंडरू—सुबर्णरेखा; दशम—कांची; लोध—बूढ़ा नदी।
Reservoirs|जलाशय|Maithon on Barakar; Tenughat on Damodar.|बराकर पर मैथन; दामोदर पर तेनुघाट।`,
    parks:`Betla|बेतला|National park in the Palamau tiger-reserve landscape.|पलामू बाघ क्षेत्र में राष्ट्रीय उद्यान।
Dalma and Udhwa|दलमा और उधवा|Dalma is associated with elephants; Udhwa Lake with waterbirds.|दलमा हाथियों और उधवा झील जलपक्षियों से जुड़ी है।`,
    minerals:`Coal|कोयला|Jharia—coking coal; Bokaro, Giridih and North/South Karanpura—coalfields.|झरिया—कोकिंग कोयला; बोकारो, गिरिडीह और उत्तरी-दक्षिणी कर्णपुरा—कोयला क्षेत्र।
Metallic minerals|धात्विक खनिज|Noamundi and Gua—iron ore; Singhbhum—copper; Jaduguda—uranium.|नोआमुंडी और गुआ—लोहा; सिंहभूम—ताँबा; जादूगोड़ा—यूरेनियम।
Mica and bauxite|अभ्रक और बॉक्साइट|Koderma–Giridih mica belt; Lohardaga bauxite.|कोडरमा–गिरिडीह अभ्रक क्षेत्र; लोहरदगा बॉक्साइट।`,
    terrain:`Chota Nagpur|छोटानागपुर|Plateau of old crystalline rocks, dissected by river valleys.|प्राचीन क्रिस्टलीय शैलों का पठार, नदी घाटियों से विच्छेदित।
Hills|पहाड़ियाँ|Parasnath and Rajmahal hills are important map associations.|पारसनाथ और राजमहल पहाड़ियाँ महत्वपूर्ण मानचित्र संबंध हैं।`,
    economy:`Industry|उद्योग|Jamshedpur and Bokaro—steel; Ranchi—engineering and administration.|जमशेदपुर-बोकारो—इस्पात; राँची—अभियांत्रिकी और प्रशासन।
Crops and forests|फसलें और वन|Rice, pulses, lac and tasar silk; sal forests are important.|धान, दलहन, लाख और तसर रेशम; साल वन महत्वपूर्ण हैं।`
  });
  add('karnataka','Karnataka','कर्नाटक','Bengaluru','बेंगलुरु',12.97,77.59,{
    overview:`Location|स्थिति|Southwestern India; the Arabian Sea lies to the west.|दक्षिण-पश्चिमी भारत; पश्चिम में अरब सागर।
Neighbours|पड़ोसी राज्य|Goa, Maharashtra, Telangana, Andhra Pradesh, Tamil Nadu and Kerala.|गोवा, महाराष्ट्र, तेलंगाना, आंध्र प्रदेश, तमिलनाडु और केरल।`,
    rivers:`Krishna system|कृष्णा तंत्र|Krishna, Bhima, Ghataprabha, Malaprabha and Tungabhadra drain northern and central areas.|कृष्णा, भीमा, घटप्रभा, मलप्रभा और तुंगभद्रा उत्तरी-मध्य क्षेत्रों का अपवाह करती हैं।
Kaveri|कावेरी|Rises at Talakaveri in Kodagu and flows towards Tamil Nadu.|कोडगु के तालकावेरी से निकलकर तमिलनाडु की ओर जाती है।
West-flowing rivers|पश्चिमवाहिनी नदियाँ|Sharavathi, Kali and Netravati reach the Arabian Sea.|शरावती, काली और नेत्रावती अरब सागर में गिरती हैं।`,
    water:`Jog and Shivanasamudra|जोग और शिवनसमुद्र|Jog falls—Sharavathi; Shivanasamudra—Kaveri.|जोग जलप्रपात—शरावती; शिवनसमुद्र—कावेरी।
Dams|बाँध|Almatti—Krishna; Tungabhadra dam—Tungabhadra; Krishnaraja Sagar—Kaveri.|अलमट्टी—कृष्णा; तुंगभद्रा बाँध—तुंगभद्रा; कृष्णराज सागर—कावेरी।`,
    parks:`National parks|राष्ट्रीय उद्यान|Bandipur, Nagarahole (Rajiv Gandhi), Bannerghatta, Kudremukh and Anshi (Kali landscape).|बांदीपुर, नागरहोल (राजीव गांधी), बन्नेरघट्टा, कुद्रेमुख और अंशी (काली क्षेत्र)।
Wildlife links|वन्यजीव संबंध|Bandipur and Nagarahole are important tiger and elephant habitats; Ranganathittu is a bird sanctuary on the Kaveri.|बांदीपुर-नागरहोल बाघ-हाथी आवास; रंगनाथिट्टू कावेरी पर पक्षी अभयारण्य है।`,
    minerals:`Iron ore and manganese|लौह अयस्क और मैंगनीज|Ballari–Hospet, Sandur and Chitradurga are important mineral belts.|बल्लारी–होसपेट, संदूर और चित्रदुर्ग महत्वपूर्ण खनिज क्षेत्र हैं।
Gold|सोना|Hutti is a gold-mining centre; Kolar is a historic goldfield.|हुट्टी स्वर्ण खनन केंद्र; कोलार ऐतिहासिक स्वर्ण क्षेत्र है।`,
    terrain:`Three divisions|तीन विभाग|Coastal plain, Malnad/Western Ghats and the interior plateau.|तटीय मैदान, मलनाड/पश्चिमी घाट और आंतरिक पठार।
Peak and soils|शिखर और मृदा|Mullayanagiri is the highest peak in the state; red, black and lateritic soils occur.|मुल्लयनगिरि राज्य का सर्वोच्च शिखर है; लाल, काली और लेटराइट मिट्टियाँ मिलती हैं।`,
    economy:`Crops|फसलें|Coffee in Kodagu–Chikkamagaluru; ragi, rice, sugarcane and plantation crops.|कोडगु–चिक्कमगलुरु में कॉफी; रागी, धान, गन्ना और बागानी फसलें।
Industry and ports|उद्योग और पत्तन|Bengaluru—IT; New Mangalore—major port; Hampi—heritage.|बेंगलुरु—आईटी; न्यू मंगलौर—प्रमुख पत्तन; हम्पी—विरासत।`
  });
  add('kerala','Kerala','केरल','Thiruvananthapuram','तिरुवनंतपुरम',8.52,76.94,{
    overview:`Location|स्थिति|Southwestern coastal state between the Arabian Sea and Western Ghats.|अरब सागर और पश्चिमी घाट के बीच दक्षिण-पश्चिमी तटीय राज्य।
Neighbours|पड़ोसी क्षेत्र|Karnataka and Tamil Nadu; Mahe is a Puducherry enclave on the Kerala coast.|कर्नाटक और तमिलनाडु; माहे केरल तट पर पुडुचेरी का अंतःक्षेत्र है।`,
    rivers:`Periyar|पेरियार|Kerala's longest river; Idukki and Mullaperiyar projects are associated with it.|केरल की सबसे लंबी नदी; इडुक्की और मुल्लापेरियार परियोजनाएँ इसी से जुड़ी हैं।
Bharathapuzha and Pamba|भरतपुझा और पंबा|Important west-flowing rivers; Pamba is linked with the Sabarimala region.|महत्वपूर्ण पश्चिमवाहिनी नदियाँ; पंबा सबरीमला क्षेत्र से जुड़ी है।
Chaliyar and Chalakudy|चालियार और चालाकुडी|Drain from the Western Ghats towards the Arabian Sea.|पश्चिमी घाट से अरब सागर की ओर बहती हैं।`,
    water:`Vembanad|वेम्बनाड|A large backwater system; Kuttanad's below-sea-level farming is associated with this region.|विस्तृत बैकवाटर तंत्र; कुट्टनाड की समुद्रतल से नीचे खेती इस क्षेत्र से जुड़ी है।
Ashtamudi and Sasthamkotta|अष्टमुडी और शास्तामकोट्टा|Ashtamudi is an estuarine backwater; Sasthamkotta is a freshwater lake.|अष्टमुडी ज्वारनदमुखीय बैकवाटर; शास्तामकोट्टा मीठे पानी की झील है।
Idukki and Athirappilly|इडुक्की और अथिराप्पिल्ली|Idukki is a Periyar dam complex; Athirappilly falls is on Chalakudy.|इडुक्की पेरियार का बाँध परिसर; अथिराप्पिल्ली चालाकुडी पर जलप्रपात है।`,
    parks:`National parks|राष्ट्रीय उद्यान|Eravikulam, Silent Valley, Periyar, Anamudi Shola, Mathikettan Shola and Pambadum Shola.|एराविकुलम, साइलेंट वैली, पेरियार, अनामुडी शोला, मथिकेत्तन शोला और पंबाडुम शोला।
Species links|प्रजाति संबंध|Eravikulam—Nilgiri tahr; Silent Valley—evergreen forest and lion-tailed macaque.|एराविकुलम—नीलगिरि तहर; साइलेंट वैली—सदाबहार वन और सिंहपूँछ मकाक।
Reserves|अभयारण्य|Periyar and Parambikulam are tiger reserves; Wayanad is a wildlife sanctuary.|पेरियार और परंबिकुलम बाघ अभयारण्य; वायनाड वन्यजीव अभयारण्य है।`,
    minerals:`Beach-sand minerals|तटीय बालू खनिज|Chavara coast is associated with ilmenite and monazite-bearing mineral sands.|चवरा तट इल्मेनाइट और मोनाजाइट युक्त खनिज बालू से संबंधित है।
Other resources|अन्य संसाधन|China clay and laterite are important non-metallic resource associations.|चीनी मिट्टी और लेटराइट महत्वपूर्ण अधात्विक संसाधन हैं।`,
    terrain:`Relief|उच्चावच|Coastal lowlands, midlands and highlands rise towards the Western Ghats.|तटीय निम्नभूमि, मध्यभूमि और उच्चभूमि पश्चिमी घाट की ओर ऊँची होती हैं।
Anamudi and Palakkad Gap|अनामुडी और पालक्काड दर्रा|Anamudi is the highest peak in peninsular India; Palakkad Gap links Kerala with Tamil Nadu.|अनामुडी प्रायद्वीपीय भारत का सर्वोच्च शिखर; पालक्काड दर्रा केरल को तमिलनाडु से जोड़ता है।`,
    economy:`Plantations|बागानी कृषि|Rubber, coconut, pepper, cardamom, tea and coffee are important.|रबर, नारियल, काली मिर्च, इलायची, चाय और कॉफी महत्वपूर्ण हैं।
Ports|पत्तन|Kochi is a major port; Vizhinjam is associated with container transshipment.|कोच्चि प्रमुख पत्तन; विझिंजम कंटेनर ट्रांसशिपमेंट से जुड़ा है।`
  });
  add('madhya-pradesh','Madhya Pradesh','मध्य प्रदेश','Bhopal','भोपाल',23.26,77.41,{
    overview:`Location|स्थिति|Central India; the Tropic of Cancer crosses the state.|मध्य भारत; कर्क रेखा राज्य से गुजरती है।
Neighbours|पड़ोसी राज्य|Uttar Pradesh, Chhattisgarh, Maharashtra, Gujarat and Rajasthan.|उत्तर प्रदेश, छत्तीसगढ़, महाराष्ट्र, गुजरात और राजस्थान।`,
    rivers:`Narmada|नर्मदा|Rises at Amarkantak and flows west in a rift valley between Vindhya and Satpura.|अमरकंटक से निकलकर विंध्य-सतपुड़ा के बीच भ्रंश घाटी में पश्चिम बहती है।
Tapi and Son|ताप्ती और सोन|Tapi rises near Multai; Son rises in the Amarkantak region and joins the Ganga in Bihar.|ताप्ती मुलताई के पास; सोन अमरकंटक क्षेत्र से निकलकर बिहार में गंगा में मिलती है।
Chambal, Betwa and Ken|चंबल, बेतवा और केन|North-flowing systems that join the Yamuna drainage.|उत्तर की ओर बहने वाले तंत्र जो यमुना अपवाह में मिलते हैं।`,
    water:`Bhoj Wetlands|भोज आर्द्रभूमि|Upper and Lower Lakes in Bhopal.|भोपाल की ऊपरी और निचली झीलें।
Dams and falls|बाँध और जलप्रपात|Indira Sagar—Narmada; Gandhi Sagar—Chambal; Dhuandhar—Narmada near Jabalpur.|इंदिरा सागर—नर्मदा; गांधी सागर—चंबल; धुआँधार—जबलपुर के पास नर्मदा।`,
    parks:`Tiger landscapes|बाघ क्षेत्र|Kanha, Bandhavgarh, Pench, Panna, Satpura, Sanjay and Madhav are important national parks.|कान्हा, बांधवगढ़, पेंच, पन्ना, सतपुड़ा, संजय और माधव प्रमुख राष्ट्रीय उद्यान हैं।
Other national parks|अन्य राष्ट्रीय उद्यान|Kuno, Van Vihar, Ghughua Fossil and Dinosaur Fossils are important names.|कूनो, वन विहार, घुघुआ जीवाश्म और डायनासोर जीवाश्म महत्वपूर्ण नाम हैं।
Species links|प्रजाति संबंध|Kanha—hard-ground barasingha; Kuno—cheetah reintroduction.|कान्हा—कठोर भूमि बारहसिंगा; कूनो—चीता पुनर्स्थापन।`,
    minerals:`Diamonds and copper|हीरा और ताँबा|Panna—diamonds; Malanjkhand in Balaghat—copper.|पन्ना—हीरा; बालाघाट का मलांजखंड—ताँबा।
Coal and manganese|कोयला और मैंगनीज|Singrauli—coal; Balaghat—manganese; limestone supports cement.|सिंगरौली—कोयला; बालाघाट—मैंगनीज; चूना पत्थर सीमेंट का आधार है।`,
    terrain:`Plateaus and ranges|पठार और श्रेणियाँ|Malwa, Bundelkhand and Baghelkhand; Vindhya, Satpura and Maikal ranges.|मालवा, बुंदेलखंड और बघेलखंड; विंध्य, सतपुड़ा और मैकाल श्रेणियाँ।
Dhupgarh|धूपगढ़|Highest point of the state, near Pachmarhi in the Satpura range.|सतपुड़ा में पचमढ़ी के पास राज्य का सर्वोच्च बिंदु।`,
    economy:`Crops|फसलें|Soybean, wheat, pulses and cotton; black soils are important in Malwa.|सोयाबीन, गेहूँ, दलहन और कपास; मालवा में काली मिट्टी महत्वपूर्ण है।
Heritage|विरासत|Sanchi, Bhimbetka and Khajuraho are UNESCO World Heritage locations.|साँची, भीमबेटका और खजुराहो यूनेस्को विश्व धरोहर स्थल हैं।`
  });
  add('maharashtra','Maharashtra','महाराष्ट्र','Mumbai','मुंबई',19.08,72.88,{
    overview:`Location|स्थिति|Western peninsular state with an Arabian Sea coast.|अरब सागर तट वाला पश्चिमी प्रायद्वीपीय राज्य।
Neighbours|पड़ोसी राज्य|Gujarat, Madhya Pradesh, Chhattisgarh, Telangana, Karnataka and Goa.|गुजरात, मध्य प्रदेश, छत्तीसगढ़, तेलंगाना, कर्नाटक और गोवा।`,
    rivers:`Godavari|गोदावरी|Rises at Trimbakeshwar near Nashik and flows east.|नासिक के पास त्र्यंबकेश्वर से निकलकर पूर्व बहती है।
Krishna and Bhima|कृष्णा और भीमा|Krishna rises near Mahabaleshwar; Bhima is its important tributary.|कृष्णा महाबलेश्वर के पास निकलती है; भीमा इसकी प्रमुख सहायक नदी है।
Tapi and Wardha–Wainganga|ताप्ती और वर्धा–वैनगंगा|Tapi flows west; Wardha and Wainganga form the Pranhita system of the Godavari.|ताप्ती पश्चिम बहती है; वर्धा-वैनगंगा गोदावरी का प्राणहिता तंत्र बनाती हैं।`,
    water:`Lonar|लोनार|A saline-alkaline lake in a meteorite impact crater in basaltic terrain.|बेसाल्ट क्षेत्र के उल्कापिंड आघात क्रेटर में लवणीय-क्षारीय झील।
Dams|बाँध|Koyna—Koyna river; Jayakwadi—Godavari; Ujani—Bhima.|कोयना—कोयना नदी; जायकवाड़ी—गोदावरी; उजनी—भीमा।`,
    parks:`National parks|राष्ट्रीय उद्यान|Sanjay Gandhi, Tadoba, Pench, Gugamal, Navegaon and Chandoli.|संजय गांधी, ताडोबा, पेंच, गुगामल, नवेगाँव और चांदोली।
Tiger reserves|बाघ अभयारण्य|Tadoba-Andhari, Melghat and Sahyadri are important; national park and tiger reserve boundaries are not identical.|ताडोबा-अंधारी, मेलघाट और सह्याद्रि महत्वपूर्ण; राष्ट्रीय उद्यान और बाघ अभयारण्य की सीमाएँ समान नहीं होतीं।`,
    minerals:`Manganese and coal|मैंगनीज और कोयला|Nagpur–Bhandara—manganese; Chandrapur and Wardha Valley—coal.|नागपुर–भंडारा—मैंगनीज; चंद्रपुर और वर्धा घाटी—कोयला।
Iron and bauxite|लोहा और बॉक्साइट|Iron ore occurs in eastern districts; bauxite is associated with the western plateau margins.|पूर्वी जिलों में लौह अयस्क; पश्चिमी पठारी किनारों पर बॉक्साइट।
Mumbai High|मुंबई हाई|An offshore petroleum field in the Arabian Sea, west of Mumbai.|मुंबई के पश्चिम में अरब सागर का अपतटीय पेट्रोलियम क्षेत्र।`,
    terrain:`Three regions|तीन क्षेत्र|Konkan coast, Sahyadri/Western Ghats and the Deccan plateau.|कोंकण तट, सह्याद्रि/पश्चिमी घाट और दक्कन पठार।
Peak and passes|शिखर और दर्रे|Kalsubai—highest peak; Bhor Ghat and Thal Ghat—important passes.|कलसुबाई—सर्वोच्च शिखर; भोर घाट और थाल घाट—महत्वपूर्ण दर्रे।`,
    economy:`Crops|फसलें|Cotton in black-soil areas; sugarcane, grapes and oranges are important.|काली मिट्टी में कपास; गन्ना, अंगूर और संतरा महत्वपूर्ण हैं।
Ports and heritage|पत्तन और विरासत|Mumbai and Jawaharlal Nehru ports; Ajanta and Ellora caves.|मुंबई और जवाहरलाल नेहरू पत्तन; अजंता और एलोरा गुफाएँ।`
  });
  add('manipur','Manipur','मणिपुर','Imphal','इंफाल',24.82,93.94,{
    overview:`Location|स्थिति|Northeastern state bordering Myanmar.|म्यांमार से सीमा वाला पूर्वोत्तर राज्य।
Neighbours|पड़ोसी राज्य|Nagaland, Assam and Mizoram.|नागालैंड, असम और मिजोरम।`,
    rivers:`Barak|बराक|Rises in the state's hill region and drains towards Assam.|राज्य के पहाड़ी क्षेत्र से निकलकर असम की ओर बहती है।
Manipur River system|मणिपुर नदी तंत्र|Imphal and other valley streams drain south towards the Chindwin basin.|इंफाल और अन्य घाटी धाराएँ दक्षिण में चिंदविन बेसिन की ओर जाती हैं।`,
    water:`Loktak|लोकटक|Freshwater lake known for floating phumdis; located south of Imphal.|तैरते फुमदी के लिए प्रसिद्ध मीठे पानी की झील; इंफाल के दक्षिण में।
Ithai barrage|इथाई बैराज|Associated with the Loktak hydroelectric project and lake-water regulation.|लोकटक जलविद्युत परियोजना और झील जल नियंत्रण से संबंधित।`,
    parks:`Keibul Lamjao|केइबुल लामजाओ|National park on floating phumdi habitat; associated with the Sangai deer.|तैरते फुमदी आवास पर राष्ट्रीय उद्यान; संगाई हिरण से संबंधित।
Shirui|शिरुई|National park in the Ukhrul hill landscape; Shirui lily is an important association.|उखरुल पहाड़ी क्षेत्र का राष्ट्रीय उद्यान; शिरुई लिली महत्वपूर्ण संबंध है।`,
    minerals:`Mineral occurrences|खनिज निक्षेप|Chromite, limestone and other minerals occur in the hill belts; occurrence does not imply large commercial output.|पहाड़ी क्षेत्रों में क्रोमाइट-चूना पत्थर आदि मिलते हैं; निक्षेप का अर्थ बड़ा व्यावसायिक उत्पादन नहीं है।
Resource base|संसाधन आधार|Forests, bamboo and water resources are important.|वन, बाँस और जल संसाधन महत्वपूर्ण हैं।`,
    terrain:`Relief|उच्चावच|A central intermontane valley surrounded by north–south hill ranges.|उत्तर-दक्षिण पहाड़ियों से घिरी मध्यवर्ती अंतरापर्वतीय घाटी।
Climate|जलवायु|Valley and hill elevations produce local climatic differences.|घाटी और पहाड़ियों की ऊँचाई स्थानीय जलवायु भिन्नता लाती है।`,
    economy:`Farming and crafts|कृषि और शिल्प|Rice, horticulture, handloom and bamboo crafts.|धान, बागवानी, हथकरघा और बाँस शिल्प।
Location links|स्थान-संबंध|Imphal—capital; Moreh—India–Myanmar border trade point.|इंफाल—राजधानी; मोरेह—भारत-म्यांमार सीमा व्यापार बिंदु।`
  });
  add('meghalaya','Meghalaya','मेघालय','Shillong','शिलांग',25.58,91.89,{
    overview:`Location|स्थिति|Northeastern plateau state; borders Bangladesh to the south and west.|पूर्वोत्तर पठारी राज्य; दक्षिण-पश्चिम में बांग्लादेश से सीमा।
Neighbour|पड़ोसी राज्य|Assam surrounds it on the remaining landward sides.|अन्य स्थलीय दिशाओं में असम से घिरा है।`,
    rivers:`Simsang|सिमसांग|Rises in the Nokrek region and flows towards Bangladesh, where it is called Someshwari.|नोकरेक क्षेत्र से निकलकर बांग्लादेश जाती है, जहाँ सोमेश्वरी कहलाती है।
Southern drainage|दक्षिणी अपवाह|Umngot and Myntdu drain towards the Bangladesh plains.|उमंगोट और मिंटडू बांग्लादेश के मैदानों की ओर बहती हैं।`,
    water:`Umiam|उमियाम|Reservoir north of Shillong; associated with hydropower.|शिलांग के उत्तर में जलाशय; जलविद्युत से संबंधित।
Waterfalls|जलप्रपात|Nohkalikai near Sohra and Elephant Falls near Shillong are important.|सोहरा के पास नोहकलिकाई और शिलांग के पास एलिफेंट फॉल्स महत्वपूर्ण हैं।`,
    parks:`Nokrek|नोकरेक|National park and biosphere-reserve landscape in the Garo Hills.|गारो पहाड़ियों में राष्ट्रीय उद्यान और जैवमंडल क्षेत्र।
Balpakram|बलपक्रम|National park in the southern Garo Hills.|दक्षिणी गारो पहाड़ियों में राष्ट्रीय उद्यान।`,
    minerals:`Coal and limestone|कोयला और चूना पत्थर|Important mineral resources of the Khasi, Jaintia and Garo hill belts.|खासी, जयंतिया और गारो पहाड़ी क्षेत्रों के महत्वपूर्ण खनिज।
Conservation issue|संरक्षण मुद्दा|Mining effects on water and caves are important environmental themes.|खनन का जल और गुफाओं पर प्रभाव महत्वपूर्ण पर्यावरण विषय है।`,
    terrain:`Three hill divisions|तीन पहाड़ी विभाग|Garo, Khasi and Jaintia Hills, from west to east.|पश्चिम से पूर्व गारो, खासी और जयंतिया पहाड़ियाँ।
Rainfall|वर्षा|Mawsynram and Sohra/Cherrapunji are associated with very high orographic rainfall.|मौसिनराम और सोहरा/चेरापूँजी अत्यधिक पर्वतीय वर्षा से संबंधित हैं।`,
    economy:`Farming|कृषि|Rice, maize, potato, pineapple, orange and spices.|धान, मक्का, आलू, अनानास, संतरा और मसाले।
Heritage and ecology|विरासत और पारिस्थितिकी|Living root bridges and limestone caves are characteristic features.|जीवित जड़ पुल और चूना पत्थर की गुफाएँ प्रमुख विशेषताएँ हैं।`
  });
  add('mizoram','Mizoram','मिजोरम','Aizawl','आइजोल',23.73,92.72,{
    overview:`Location|स्थिति|Northeastern hill state with borders with Bangladesh and Myanmar.|बांग्लादेश और म्यांमार से सीमा वाला पूर्वोत्तर पहाड़ी राज्य।
Neighbours|पड़ोसी राज्य|Tripura, Assam and Manipur.|त्रिपुरा, असम और मणिपुर।`,
    rivers:`Chhimtuipui / Kaladan|छिमतुइपुई / कलादान|Drains southern Mizoram towards Myanmar and the Bay of Bengal.|दक्षिण मिजोरम से म्यांमार और बंगाल की खाड़ी की ओर बहती है।
Tlawng and Tuivawl|त्लावंग और तुइवॉल|Important rivers draining the hill state.|राज्य की महत्वपूर्ण पहाड़ी नदियाँ।`,
    water:`Pala / Palak|पाला / पलक|A natural lake and wetland in the southern part of the state.|राज्य के दक्षिणी भाग में प्राकृतिक झील और आर्द्रभूमि।
Tam Dil|ताम दिल|A lake near Saitual, important for local geography.|सैतुअल के पास स्थानीय भूगोल की महत्वपूर्ण झील।`,
    parks:`Murlen and Phawngpui|मुरलेन और फौंगपुई|National parks; Phawngpui is associated with the Blue Mountain landscape.|राष्ट्रीय उद्यान; फौंगपुई ब्लू माउंटेन क्षेत्र से संबंधित है।
Dampa|दाम्पा|Tiger reserve in western Mizoram near Bangladesh.|बांग्लादेश के पास पश्चिमी मिजोरम में बाघ अभयारण्य।`,
    minerals:`Mineral occurrences|खनिज निक्षेप|Sandstone, shale and limestone are important geological associations.|बलुआ पत्थर, शेल और चूना पत्थर महत्वपूर्ण भूवैज्ञानिक संबंध हैं।
Energy|ऊर्जा|Petroleum exploration and hydropower potential are resource themes; do not equate exploration with production.|पेट्रोलियम अन्वेषण और जलविद्युत संभावना प्रमुख विषय; अन्वेषण को उत्पादन न मानें।`,
    terrain:`Relief|उच्चावच|Closely spaced north–south folded hill ranges and narrow valleys.|पास-पास उत्तर-दक्षिण वलित पहाड़ियाँ और संकरी घाटियाँ।
Phawngpui|फौंगपुई|The state's highest peak, also called Blue Mountain.|राज्य का सर्वोच्च शिखर, जिसे ब्लू माउंटेन भी कहते हैं।`,
    economy:`Bamboo and farming|बाँस और कृषि|Bamboo, horticulture and shifting cultivation are important.|बाँस, बागवानी और झूम खेती महत्वपूर्ण हैं।
Mautam|मौताम|Bamboo flowering is linked with rodent population surges and crop loss.|बाँस के पुष्पन का संबंध कृंतक वृद्धि और फसल हानि से है।`
  });
  add('nagaland','Nagaland','नागालैंड','Kohima','कोहिमा',25.67,94.11,{
    overview:`Location|स्थिति|Northeastern state bordering Myanmar.|म्यांमार से सीमा वाला पूर्वोत्तर राज्य।
Neighbours|पड़ोसी राज्य|Arunachal Pradesh, Assam and Manipur.|अरुणाचल प्रदेश, असम और मणिपुर।`,
    rivers:`Doyang|दोयांग|Important river and reservoir system, associated with Amur falcon migration.|महत्वपूर्ण नदी-जलाशय तंत्र; अमूर बाज के प्रवास से संबंधित।
Dhansiri, Dikhu and Tizu|धनसिरी, दिखू और तिजू|Dhansiri and Dikhu connect with the Brahmaputra system; Tizu drains towards Myanmar.|धनसिरी-दिखू ब्रह्मपुत्र तंत्र से जुड़ी हैं; तिजू म्यांमार की ओर जाती है।`,
    water:`Doyang Reservoir|दोयांग जलाशय|Hydropower reservoir in Wokha district.|वोखा जिले में जलविद्युत जलाशय।
Shilloi Lake|शिलोई झील|Natural lake in Phek district.|फेक जिले की प्राकृतिक झील।`,
    parks:`Intanki / Ntangki|इंटांकी / न्तांकी|National park in the Peren region.|पेरेन क्षेत्र में राष्ट्रीय उद्यान।
Conservation|संरक्षण|Community conservation and protection of migratory Amur falcons are important themes.|सामुदायिक संरक्षण और प्रवासी अमूर बाज की सुरक्षा महत्वपूर्ण विषय हैं।`,
    minerals:`Resources|संसाधन|Coal, limestone and petroleum occurrences are important associations.|कोयला, चूना पत्थर और पेट्रोलियम निक्षेप महत्वपूर्ण हैं।
Resource distinction|संसाधन भेद|A mineral occurrence is different from an operating commercial mine.|खनिज निक्षेप और चालू व्यावसायिक खदान अलग बातें हैं।`,
    terrain:`Naga Hills|नागा पहाड़ियाँ|Folded hills form part of the Purvanchal hill system.|वलित पहाड़ियाँ पूर्वांचल पर्वतीय तंत्र का भाग हैं।
Saramati and Dzukou|सरामती और जुकोऊ|Saramati is the highest peak; Dzukou Valley lies near the Manipur border.|सरामती सर्वोच्च शिखर; जुकोऊ घाटी मणिपुर सीमा के पास है।`,
    economy:`Agriculture|कृषि|Rice, maize, millet and horticulture; jhum cultivation is important.|धान, मक्का, मोटे अनाज और बागवानी; झूम खेती महत्वपूर्ण है।
Culture|संस्कृति|Hornbill Festival at Kisama near Kohima is a key location association.|कोहिमा के पास किसामा का हॉर्नबिल महोत्सव महत्वपूर्ण स्थान-संबंध है।`
  });
  add('odisha','Odisha','ओडिशा','Bhubaneswar','भुवनेश्वर',20.30,85.82,{
    overview:`Location|स्थिति|Eastern coastal state on the Bay of Bengal.|बंगाल की खाड़ी पर पूर्वी तटीय राज्य।
Neighbours|पड़ोसी राज्य|West Bengal, Jharkhand, Chhattisgarh and Andhra Pradesh.|पश्चिम बंगाल, झारखंड, छत्तीसगढ़ और आंध्र प्रदेश।`,
    rivers:`Mahanadi|महानदी|Forms a major delta; Hirakud dam is near Sambalpur.|प्रमुख डेल्टा बनाती है; हीराकुंड बाँध संबलपुर के पास है।
Brahmani and Baitarani|ब्राह्मणी और बैतरणी|Important river systems feeding the coastal delta and mangrove landscape.|तटीय डेल्टा और मैंग्रोव क्षेत्र को जल देने वाले प्रमुख नदी तंत्र।
Other rivers|अन्य नदियाँ|Subarnarekha, Rushikulya and Vamsadhara are important.|सुबर्णरेखा, रुशिकुल्या और वंशधारा महत्वपूर्ण हैं।`,
    water:`Chilika|चिलिका|A brackish coastal lagoon connected with the Bay of Bengal; associated with Irrawaddy dolphins.|बंगाल की खाड़ी से जुड़ी खारे पानी की तटीय लैगून; इरावदी डॉल्फिन से संबंधित।
Hirakud|हीराकुंड|Multipurpose reservoir on the Mahanadi.|महानदी पर बहुउद्देशीय जलाशय।
Ansupa|अंसुपा|An oxbow lake associated with the Mahanadi.|महानदी से संबंधित गोखुर झील।`,
    parks:`Similipal and Bhitarkanika|सिमिलिपाल और भितरकनिका|National parks; Similipal—tiger and sal forests; Bhitarkanika—mangroves and saltwater crocodiles.|राष्ट्रीय उद्यान; सिमिलिपाल—बाघ-साल वन; भितरकनिका—मैंग्रोव और खारे पानी के मगरमच्छ।
Olive ridley turtles|ऑलिव रिडले कछुए|Gahirmatha and Rushikulya coast are important mass-nesting locations.|गहिरमाथा और रुशिकुल्या तट सामूहिक अंडे देने के महत्वपूर्ण स्थल हैं।`,
    minerals:`Iron ore and chromite|लौह अयस्क और क्रोमाइट|Keonjhar–Mayurbhanj—iron ore; Sukinda Valley—chromite.|केंदुझर–मयूरभंज—लौह अयस्क; सुकिंदा घाटी—क्रोमाइट।
Coal and bauxite|कोयला और बॉक्साइट|Talcher and Ib Valley—coal; Koraput and Kalahandi uplands—bauxite.|तालचेर और इब घाटी—कोयला; कोरापुट-कालाहांडी उच्चभूमि—बॉक्साइट।`,
    terrain:`Relief|उच्चावच|Coastal plains, central tablelands and Eastern Ghats highlands.|तटीय मैदान, मध्यवर्ती पठार और पूर्वी घाट उच्चभूमि।
Deomali|देवमाली|Highest peak of the state, in Koraput district.|कोरापुट जिले में राज्य का सर्वोच्च शिखर।`,
    economy:`Crops and industry|फसलें और उद्योग|Rice; Rourkela—steel; Angul—aluminium and energy industries.|धान; राउरकेला—इस्पात; अंगुल—एल्युमिनियम और ऊर्जा उद्योग।
Port and heritage|पत्तन और विरासत|Paradip—major port; Konark Sun Temple—UNESCO heritage.|पारादीप—प्रमुख पत्तन; कोणार्क सूर्य मंदिर—यूनेस्को धरोहर।`
  });
  add('punjab','Punjab','पंजाब','Chandigarh','चंडीगढ़',30.74,76.79,{
    overview:`Location|स्थिति|Northwestern alluvial state bordering Pakistan.|पाकिस्तान से सीमा वाला उत्तर-पश्चिमी जलोढ़ राज्य।
Neighbours|पड़ोसी क्षेत्र|Jammu and Kashmir, Himachal Pradesh, Haryana and Rajasthan; Chandigarh is a separate UT.|जम्मू-कश्मीर, हिमाचल प्रदेश, हरियाणा और राजस्थान; चंडीगढ़ अलग केंद्रशासित प्रदेश है।`,
    rivers:`Sutlej, Beas and Ravi|सतलुज, ब्यास और रावी|The three principal rivers of present-day Indian Punjab.|वर्तमान भारतीय पंजाब की तीन प्रमुख नदियाँ।
Harike confluence|हरिके संगम|Beas meets Sutlej near Harike.|हरिके के पास ब्यास सतलुज से मिलती है।`,
    water:`Harike and Ropar|हरिके और रोपड़|Harike lies near the Beas–Sutlej confluence; Ropar is associated with the Sutlej barrage.|हरिके ब्यास-सतलुज संगम के पास; रोपड़ सतलुज बैराज से जुड़ा है।
Kanjli and Nangal|कांजली और नंगल|Kanjli is linked with Kali Bein; Nangal with the Sutlej reservoir landscape.|कांजली काली बेईं और नंगल सतलुज जलाशय क्षेत्र से जुड़ा है।`,
    parks:`Protected-area distinction|संरक्षित क्षेत्र का भेद|Punjab's exam-relevant protected areas include sanctuaries and conservation/community reserves; do not label Harike a national park.|पंजाब के प्रमुख संरक्षित क्षेत्रों में अभयारण्य और संरक्षण-सामुदायिक रिजर्व हैं; हरिके को राष्ट्रीय उद्यान न लिखें।
Examples|उदाहरण|Harike, Abohar and Bir Moti Bagh sanctuaries; Beas Conservation Reserve.|हरिके, अबोहर और बीर मोती बाग अभयारण्य; ब्यास संरक्षण रिजर्व।`,
    minerals:`Resources|संसाधन|Sand, gravel and brick clay are important; the state is not a major metallic-ore belt.|बालू, बजरी और ईंट मिट्टी महत्वपूर्ण; राज्य प्रमुख धात्विक अयस्क क्षेत्र नहीं है।
Energy links|ऊर्जा संबंध|Bhakra–Nangal supplies irrigation and power; the main Bhakra dam is in Himachal Pradesh.|भाखड़ा-नंगल सिंचाई-ऊर्जा देता है; मुख्य भाखड़ा बाँध हिमाचल प्रदेश में है।`,
    terrain:`Regions|क्षेत्र|Majha, Doaba and Malwa are important regional names.|माझा, दोआबा और मालवा महत्वपूर्ण क्षेत्रीय नाम हैं।
Landforms|स्थलरूप|Fertile alluvial plains with Shivalik foothills in the northeast.|उपजाऊ जलोढ़ मैदान; उत्तर-पूर्व में शिवालिक तलहटी।`,
    economy:`Agriculture|कृषि|Wheat–rice cropping, canal irrigation and Green Revolution associations.|गेहूँ-धान फसल क्रम, नहर सिंचाई और हरित क्रांति से संबंध।
Industry and heritage|उद्योग और विरासत|Ludhiana—hosiery; Jalandhar—sports goods; Amritsar—Golden Temple.|लुधियाना—होजरी; जालंधर—खेल सामग्री; अमृतसर—स्वर्ण मंदिर।`
  });
  add('rajasthan','Rajasthan','राजस्थान','Jaipur','जयपुर',26.91,75.79,{
    overview:`Location|स्थिति|Northwestern India; largest Indian state by area; borders Pakistan.|उत्तर-पश्चिमी भारत; क्षेत्रफल में भारत का सबसे बड़ा राज्य; पाकिस्तान से सीमा।
Neighbours|पड़ोसी राज्य|Punjab, Haryana, Uttar Pradesh, Madhya Pradesh and Gujarat.|पंजाब, हरियाणा, उत्तर प्रदेश, मध्य प्रदेश और गुजरात।`,
    rivers:`Chambal|चंबल|Flows through southeastern Rajasthan; tributary of the Yamuna.|दक्षिण-पूर्वी राजस्थान से बहती है; यमुना की सहायक नदी।
Luni|लूनी|Rises near Ajmer and drains towards the Rann of Kutch.|अजमेर के पास निकलकर कच्छ के रण की ओर जाती है।
Banas and Mahi|बनास और माही|Banas joins Chambal; Mahi flows towards Gujarat and the Gulf of Khambhat.|बनास चंबल में मिलती है; माही गुजरात से खंभात की खाड़ी की ओर जाती है।`,
    water:`Sambhar|सांभर|Large inland saline lake associated with salt production.|नमक उत्पादन से जुड़ी बड़ी अंतर्देशीय लवणीय झील।
Udaipur and Ajmer lakes|उदयपुर और अजमेर की झीलें|Pichola, Fateh Sagar, Jaisamand, Rajsamand and Ana Sagar are important location pairs.|पिछोला, फतेह सागर, जयसमंद, राजसमंद और आना सागर महत्वपूर्ण स्थान-संबंध हैं।
Bisalpur and Rana Pratap Sagar|बीसलपुर और राणा प्रताप सागर|Associate them with Banas and Chambal respectively.|इन्हें क्रमशः बनास और चंबल से जोड़ें।`,
    parks:`National parks|राष्ट्रीय उद्यान|Ranthambore, Sariska, Keoladeo Ghana, Desert and Mukundra Hills.|रणथंभौर, सरिस्का, केवलादेव घना, मरु और मुकुंदरा हिल्स।
Species links|प्रजाति संबंध|Desert National Park—Great Indian bustard; Keoladeo—waterbirds and UNESCO heritage.|मरु राष्ट्रीय उद्यान—गोडावण; केवलादेव—जलपक्षी और यूनेस्को धरोहर।`,
    minerals:`Copper and zinc|ताँबा और जस्ता|Khetri—copper; Zawar and Rampura Agucha—lead-zinc associations.|खेतड़ी—ताँबा; जावर और रामपुरा आगूचा—सीसा-जस्ता।
Other minerals|अन्य खनिज|Makrana—marble; Jhamarkotra—rock phosphate; Bikaner–Nagaur—gypsum; Barmer—petroleum.|मकराना—संगमरमर; झामरकोटड़ा—रॉक फॉस्फेट; बीकानेर-नागौर—जिप्सम; बाड़मेर—पेट्रोलियम।`,
    terrain:`Aravalli and Thar|अरावली और थार|Aravalli divides the arid northwest from relatively wetter southeastern areas.|अरावली शुष्क उत्तर-पश्चिम और अपेक्षाकृत नम दक्षिण-पूर्व को अलग करती है।
Guru Shikhar|गुरु शिखर|Highest peak of the Aravalli range, near Mount Abu.|माउंट आबू के पास अरावली का सर्वोच्च शिखर।`,
    economy:`Crops and irrigation|फसलें और सिंचाई|Bajra, mustard, wheat and cotton; Indira Gandhi Canal supports northwestern irrigation.|बाजरा, सरसों, गेहूँ और कपास; इंदिरा गांधी नहर उत्तर-पश्चिम में सिंचाई देती है।
Heritage|विरासत|Jaipur, hill forts and the Jantar Mantar are important heritage associations.|जयपुर, पहाड़ी दुर्ग और जंतर मंतर महत्वपूर्ण धरोहर संबंध हैं।`
  });
  add('sikkim','Sikkim','सिक्किम','Gangtok','गंगटोक',27.33,88.61,{
    overview:`Location|स्थिति|Himalayan state between Nepal, China and Bhutan.|नेपाल, चीन और भूटान के बीच हिमालयी राज्य।
Neighbour|पड़ोसी राज्य|West Bengal is its only Indian state neighbour.|पश्चिम बंगाल इसका एकमात्र भारतीय पड़ोसी राज्य है।`,
    rivers:`Teesta|तीस्ता|Principal river of Sikkim; continues into West Bengal and Bangladesh.|सिक्किम की प्रमुख नदी; पश्चिम बंगाल और बांग्लादेश जाती है।
Rangeet|रंगीत|Important tributary joining Teesta.|तीस्ता में मिलने वाली महत्वपूर्ण सहायक नदी।`,
    water:`High-altitude lakes|उच्च हिमालयी झीलें|Tsomgo, Gurudongmar and Cholamu are important names.|त्सोमगो, गुरुडोंगमार और चोलामू महत्वपूर्ण नाम हैं।
Khecheopalri|खेचियोपलरी|Sacred lake and wetland in western Sikkim.|पश्चिमी सिक्किम की पवित्र झील और आर्द्रभूमि।`,
    parks:`Khangchendzonga|खांगचेंदजोंगा|National park and UNESCO mixed World Heritage site.|राष्ट्रीय उद्यान और यूनेस्को की मिश्रित विश्व धरोहर।
Species links|प्रजाति संबंध|Red panda, snow leopard and high-altitude Himalayan habitats are important.|लाल पांडा, हिम तेंदुआ और उच्च हिमालयी आवास महत्वपूर्ण हैं।`,
    minerals:`Copper and other occurrences|ताँबा और अन्य निक्षेप|Rangpo area is associated with copper; dolomite and other non-metallic resources occur.|रंगपो क्षेत्र ताँबे से जुड़ा है; डोलोमाइट और अन्य अधात्विक संसाधन मिलते हैं।
Hydropower|जलविद्युत|Teesta and Rangeet river projects are key energy associations.|तीस्ता और रंगीत परियोजनाएँ प्रमुख ऊर्जा संबंध हैं।`,
    terrain:`Himalayan relief|हिमालयी उच्चावच|Steep valleys rise to the Khangchendzonga massif.|तीव्र घाटियाँ खांगचेंदजोंगा पर्वत समूह तक ऊँची होती हैं।
Passes|दर्रे|Nathu La and Jelep La are important India–Tibet route associations.|नाथू ला और जेलेप ला भारत-तिब्बत मार्ग से संबंधित महत्वपूर्ण दर्रे हैं।`,
    economy:`Agriculture|कृषि|Large cardamom, horticulture and organic farming are important.|बड़ी इलायची, बागवानी और जैविक कृषि महत्वपूर्ण हैं।
Tourism|पर्यटन|Gangtok, monasteries and Himalayan trekking landscapes.|गंगटोक, मठ और हिमालयी ट्रेकिंग क्षेत्र।`
  });
  add('tamil-nadu','Tamil Nadu','तमिलनाडु','Chennai','चेन्नई',13.08,80.27,{
    overview:`Location|स्थिति|Southeastern peninsular state; Bay of Bengal, Palk Strait and Gulf of Mannar are important.|दक्षिण-पूर्वी प्रायद्वीपीय राज्य; बंगाल की खाड़ी, पाक जलडमरूमध्य और मन्नार की खाड़ी महत्वपूर्ण हैं।
Neighbours|पड़ोसी राज्य|Kerala, Karnataka and Andhra Pradesh; Puducherry has enclaves on the coast.|केरल, कर्नाटक और आंध्र प्रदेश; तट पर पुडुचेरी के अंतःक्षेत्र हैं।`,
    rivers:`Kaveri|कावेरी|Forms a fertile delta; Mettur dam is an important project.|उपजाऊ डेल्टा बनाती है; मेट्टूर प्रमुख बाँध है।
Vaigai and Tamiraparani|वैगई और तामिरापरनी|Vaigai flows through Madurai; Tamiraparani drains the far south.|वैगई मदुरै से बहती है; तामिरापरनी सुदूर दक्षिण का अपवाह करती है।
Palar and Ponnaiyar|पालार और पोन्नैयार|Important east-flowing rivers of the northern part of the state.|राज्य के उत्तरी भाग की महत्वपूर्ण पूर्ववाहिनी नदियाँ।`,
    water:`Pulicat and urban reservoirs|पुलिकट और शहरी जलाशय|Pulicat is shared with Andhra Pradesh; Chembarambakkam is important for Chennai water supply.|पुलिकट आंध्र प्रदेश के साथ साझा; चेम्बरमबक्कम चेन्नई जलापूर्ति के लिए महत्वपूर्ण है।
Mettur and Bhavanisagar|मेट्टूर और भवानीसागर|Mettur—Kaveri; Bhavanisagar—Bhavani.|मेट्टूर—कावेरी; भवानीसागर—भवानी।
Waterfalls|जलप्रपात|Hogenakkal—Kaveri; Courtallam—Western Ghats river landscape.|होगेनक्कल—कावेरी; कुट्रालम—पश्चिमी घाट नदी क्षेत्र।`,
    parks:`National parks|राष्ट्रीय उद्यान|Guindy, Gulf of Mannar Marine, Indira Gandhi (Anamalai), Mudumalai and Mukurthi.|गिंडी, मन्नार की खाड़ी मरीन, इंदिरा गांधी (अनामलाई), मुदुमलाई और मुकुर्थी।
Species links|प्रजाति संबंध|Mukurthi—Nilgiri tahr; Gulf of Mannar—corals, seagrass and dugong.|मुकुर्थी—नीलगिरि तहर; मन्नार की खाड़ी—प्रवाल, समुद्री घास और डुगोंग।`,
    minerals:`Lignite and magnesite|लिग्नाइट और मैग्नेसाइट|Neyveli—lignite; Salem—magnesite.|नेवेली—लिग्नाइट; सलेम—मैग्नेसाइट।
Other resources|अन्य संसाधन|Limestone, granite and coastal heavy-mineral sands are important.|चूना पत्थर, ग्रेनाइट और तटीय भारी खनिज बालू महत्वपूर्ण हैं।`,
    terrain:`Ghats and coast|घाट और तट|Western and Eastern Ghats meet in the Nilgiri region; the eastern coastal plain is broad.|नीलगिरि क्षेत्र में पश्चिमी-पूर्वी घाट मिलते हैं; पूर्वी तटीय मैदान चौड़ा है।
Rainfall|वर्षा|The northeast monsoon is especially important for the state's rainfall.|राज्य की वर्षा में उत्तर-पूर्वी मानसून विशेष महत्वपूर्ण है।`,
    economy:`Crops and industry|फसलें और उद्योग|Rice, cotton, sugarcane and millets; textiles, automobiles and leather.|धान, कपास, गन्ना और मोटे अनाज; वस्त्र, वाहन और चमड़ा उद्योग।
Ports and heritage|पत्तन और विरासत|Chennai, Kamarajar (Ennore) and V.O. Chidambaranar ports; Great Living Chola Temples.|चेन्नई, कामराजर (एन्नोर) और वी.ओ. चिदंबरनार पत्तन; महान चोल मंदिर।`
  });
  add('telangana','Telangana','तेलंगाना','Hyderabad','हैदराबाद',17.39,78.49,{
    overview:`Location|स्थिति|Landlocked Deccan state formed in 2014.|वर्ष 2014 में बना स्थलरुद्ध दक्कन राज्य।
Neighbours|पड़ोसी राज्य|Maharashtra, Chhattisgarh, Andhra Pradesh and Karnataka.|महाराष्ट्र, छत्तीसगढ़, आंध्र प्रदेश और कर्नाटक।`,
    rivers:`Godavari and Krishna|गोदावरी और कृष्णा|The two principal river basins; Manjira is a Godavari tributary.|दो प्रमुख नदी बेसिन; मंजीरा गोदावरी की सहायक नदी है।
Musi|मूसी|Flows through Hyderabad and joins the Krishna system.|हैदराबाद से बहती है और कृष्णा तंत्र में मिलती है।`,
    water:`Nagarjuna Sagar and Srisailam|नागार्जुन सागर और श्रीशैलम|Krishna projects on the Andhra Pradesh boundary.|आंध्र प्रदेश सीमा पर कृष्णा की परियोजनाएँ।
Tanks and lakes|तालाब और झीलें|Hussain Sagar, Osman Sagar, Himayat Sagar, Pakhal and Ramappa are important.|हुसैन सागर, उस्मान सागर, हिमायत सागर, पाखल और रामप्पा महत्वपूर्ण हैं।`,
    parks:`National parks|राष्ट्रीय उद्यान|Kasu Brahmananda Reddy, Mahavir Harina Vanasthali and Mrugavani.|कासु ब्रह्मानंद रेड्डी, महावीर हरिण वनस्थली और मृगवनी।
Tiger reserves|बाघ अभयारण्य|Amrabad in the Nallamala landscape; Kawal in northern Telangana.|नल्लमाला क्षेत्र में अमराबाद; उत्तरी तेलंगाना में कवाल।`,
    minerals:`Coal|कोयला|Singareni coalfields occupy the Godavari Valley belt.|सिंगरेनी कोयला क्षेत्र गोदावरी घाटी क्षेत्र में हैं।
Other resources|अन्य संसाधन|Limestone and granite are important non-metallic resources.|चूना पत्थर और ग्रेनाइट महत्वपूर्ण अधात्विक संसाधन हैं।`,
    terrain:`Deccan plateau|दक्कन पठार|Undulating plateau with granite outcrops and river valleys.|ग्रेनाइट शैल उभार और नदी घाटियों वाला लहरदार पठार।
Soils|मृदा|Red and black soils support different cropping systems.|लाल और काली मिट्टियाँ भिन्न फसल प्रणालियों का आधार हैं।`,
    economy:`Agriculture and industry|कृषि और उद्योग|Rice, cotton and maize; Hyderabad—IT, pharmaceuticals and services.|धान, कपास और मक्का; हैदराबाद—आईटी, औषधि और सेवाएँ।
Heritage|विरासत|Ramappa/Rudreshwara Temple near Warangal is a UNESCO World Heritage site.|वारंगल के पास रामप्पा/रुद्रेश्वर मंदिर यूनेस्को विश्व धरोहर है।`
  });
  add('tripura','Tripura','त्रिपुरा','Agartala','अगरतला',23.83,91.28,{
    overview:`Location|स्थिति|Northeastern state bordered by Bangladesh on three sides.|तीन दिशाओं में बांग्लादेश से घिरा पूर्वोत्तर राज्य।
Neighbours|पड़ोसी राज्य|Assam and Mizoram.|असम और मिजोरम।`,
    rivers:`Gomati|गोमती|Important river with its headwater region near Dumboor; continues towards Bangladesh.|डंबूर के पास उद्गम क्षेत्र वाली प्रमुख नदी; बांग्लादेश की ओर जाती है।
Other rivers|अन्य नदियाँ|Manu, Khowai, Dhalai, Haora and Feni are important.|मनु, खोवाई, धलाई, हाओरा और फेनी महत्वपूर्ण हैं।`,
    water:`Rudrasagar|रुद्रसागर|Lake near Melaghar; Neermahal palace is located within it.|मेलाघर के पास झील; नीरमहल इसी में है।
Dumboor|डंबूर|Reservoir associated with the Gomati hydel project.|गोमती जलविद्युत परियोजना से संबंधित जलाशय।`,
    parks:`Clouded Leopard and Bison (Rajbari)|क्लाउडेड लेपर्ड और बाइसन (राजबाड़ी)|National parks within the Sipahijala and Trishna landscapes respectively.|क्रमशः सिपाहीजला और तृष्णा क्षेत्रों के राष्ट्रीय उद्यान।
Wildlife|वन्यजीव|Phayre's leaf monkey and the state's primate diversity are important associations.|फायरे पत्ती बंदर और राज्य की प्राइमेट विविधता महत्वपूर्ण हैं।`,
    minerals:`Natural gas|प्राकृतिक गैस|An important energy resource; associated with gas-based electricity and fertiliser activity.|महत्वपूर्ण ऊर्जा संसाधन; गैस आधारित बिजली और उर्वरक गतिविधि से संबंध।
Other resources|अन्य संसाधन|Clay, sand and building materials occur.|मिट्टी, बालू और निर्माण सामग्री मिलती है।`,
    terrain:`Hill ranges|पहाड़ी श्रेणियाँ|North–south ranges include Jampui, Longtharai, Atharamura and Baramura.|उत्तर-दक्षिण श्रेणियों में जंपुई, लोंगथराई, अथारामुरा और बरामुरा शामिल हैं।
Valleys|घाटियाँ|Narrow river valleys separate the parallel hill ranges.|संकरी नदी घाटियाँ समानांतर पहाड़ियों को अलग करती हैं।`,
    economy:`Crops|फसलें|Rubber, bamboo, tea, pineapple and rice are important.|रबर, बाँस, चाय, अनानास और धान महत्वपूर्ण हैं।
Heritage|विरासत|Unakoti rock carvings, Ujjayanta Palace and Neermahal.|उनाकोटी शैल नक्काशी, उज्जयंत महल और नीरमहल।`
  });
  add('UP','Uttar Pradesh','उत्तर प्रदेश','Lucknow','लखनऊ',26.85,80.95,{
    overview:`Location|स्थिति|Northern India; Nepal lies to the north. The Ganga–Yamuna plain dominates.|उत्तरी भारत; उत्तर में नेपाल। गंगा-यमुना मैदान प्रमुख है।
Neighbours|पड़ोसी राज्य व क्षेत्र|Uttarakhand, Himachal Pradesh, Haryana, Delhi, Rajasthan, Madhya Pradesh, Chhattisgarh, Jharkhand and Bihar.|उत्तराखंड, हिमाचल प्रदेश, हरियाणा, दिल्ली, राजस्थान, मध्य प्रदेश, छत्तीसगढ़, झारखंड और बिहार।
Regions|क्षेत्र|Western UP, Awadh, Purvanchal, Bundelkhand and the Terai are useful revision divisions.|पश्चिमी यूपी, अवध, पूर्वांचल, बुंदेलखंड और तराई उपयोगी पुनरावृत्ति विभाग हैं।
State symbols|राज्य प्रतीक|Swamp deer—state animal; sarus crane—state bird.|बारहसिंगा—राज्य पशु; सारस—राज्य पक्षी।`,
    rivers:`Ganga|गंगा|Enters UP near Bijnor; important cities include Kanpur, Prayagraj and Varanasi.|बिजनौर के पास यूपी में प्रवेश; कानपुर, प्रयागराज और वाराणसी प्रमुख नगर हैं।
Yamuna|यमुना|Flows past Mathura and Agra; meets the Ganga at Prayagraj.|मथुरा-आगरा से बहकर प्रयागराज में गंगा से मिलती है।
Gomti|गोमती|Rises near the Gomat Taal/Fulhar Jheel area in Pilibhit; flows through Lucknow and joins the Ganga near Kaithi.|पीलीभीत के गोमत ताल/फुलहर झील क्षेत्र से निकलती है; लखनऊ से बहकर कैथी के पास गंगा में मिलती है।
Ghaghara / Saryu|घाघरा / सरयू|Himalayan river system; the Ayodhya stretch is associated with the name Saryu.|हिमालयी नदी तंत्र; अयोध्या क्षेत्र सरयू नाम से जुड़ा है।
Rapti|राप्ती|A Ghaghara tributary associated with the Gorakhpur region and flooding.|घाघरा की सहायक नदी; गोरखपुर क्षेत्र और बाढ़ से संबंध।
Ramaganga|रामगंगा|Himalayan tributary joining the Ganga near Kannauj.|कन्नौज के पास गंगा से मिलने वाली हिमालयी सहायक नदी।
Chambal, Betwa and Ken|चंबल, बेतवा और केन|Right-bank tributaries of the Yamuna; important for Bundelkhand and ravine geography.|यमुना की दाहिने तट की सहायक नदियाँ; बुंदेलखंड और बीहड़ भूगोल में महत्वपूर्ण।
Son|सोन|A Ganga tributary associated with the southeastern plateau margin; meets the Ganga in Bihar.|दक्षिण-पूर्वी पठारी किनारे से जुड़ी गंगा की सहायक नदी; बिहार में गंगा से मिलती है।`,
    water:`Rihand / Govind Ballabh Pant Sagar|रिहंद / गोविंद बल्लभ पंत सागर|Reservoir on the Rihand in Sonbhadra; Rihand is a Son tributary.|सोनभद्र में रिहंद पर जलाशय; रिहंद सोन की सहायक नदी है।
Matatila and Rajghat|माताटीला और राजघाट|Betwa river projects on the UP–Madhya Pradesh boundary.|यूपी-मध्य प्रदेश सीमा पर बेतवा की परियोजनाएँ।
Ramganga dam|रामगंगा बाँध|Kalagarh dam is on the Ramganga in Uttarakhand; its benefits extend into UP.|कालागढ़ बाँध उत्तराखंड में रामगंगा पर है; इसका लाभ यूपी को भी मिलता है।
Sur Sarovar / Keetham|सूर सरोवर / कीठम|Reservoir wetland near Agra; important bird habitat.|आगरा के पास जलाशय आर्द्रभूमि; महत्वपूर्ण पक्षी आवास।
Bakhira and Surha Tal|बखीरा और सुरहा ताल|Bakhira—Sant Kabir Nagar; Surha Tal—Ballia.|बखीरा—संत कबीर नगर; सुरहा ताल—बलिया।`,
    parks:`Dudhwa|दुधवा|National park in Lakhimpur Kheri's Terai; associated with swamp deer and tigers.|लखीमपुर खीरी की तराई में राष्ट्रीय उद्यान; बारहसिंगा और बाघ से संबंध।
Dudhwa Tiger Reserve|दुधवा बाघ अभयारण्य|Includes Dudhwa National Park and the Kishanpur and Katerniaghat sanctuaries.|दुधवा राष्ट्रीय उद्यान तथा किशनपुर-कतर्नियाघाट अभयारण्य शामिल हैं।
Pilibhit Tiger Reserve|पीलीभीत बाघ अभयारण्य|Terai forest landscape along the Sharda river region.|शारदा नदी क्षेत्र के साथ तराई वन क्षेत्र।
Ranipur Tiger Reserve|रानीपुर बाघ अभयारण्य|Located in Chitrakoot's Bundelkhand/Vindhyan landscape.|चित्रकूट के बुंदेलखंड-विंध्य क्षेत्र में स्थित।
National Chambal Sanctuary|राष्ट्रीय चंबल अभयारण्य|Shared with Madhya Pradesh and Rajasthan; associated with gharial and Gangetic dolphin.|मध्य प्रदेश-राजस्थान के साथ साझा; घड़ियाल और गंगा डॉल्फिन से संबंध।
Other sanctuaries|अन्य अभयारण्य|Hastinapur, Chandraprabha, Kaimur, Sohelwa and Sohagibarwa.|हस्तिनापुर, चंद्रप्रभा, कैमूर, सोहेलवा और सोहागीबरवा।`,
    minerals:`Limestone and dolomite|चूना पत्थर और डोलोमाइट|Important associations of the Sonbhadra–Mirzapur plateau belt.|सोनभद्र-मिर्जापुर पठारी क्षेत्र के महत्वपूर्ण खनिज।
Silica sand|सिलिका बालू|Shankargarh in Prayagraj is an important silica-sand association.|प्रयागराज का शंकरगढ़ सिलिका बालू से जुड़ा महत्वपूर्ण क्षेत्र है।
Coal and energy|कोयला और ऊर्जा|Southern Sonbhadra lies in the Singrauli coal-power region, shared with Madhya Pradesh.|दक्षिणी सोनभद्र मध्य प्रदेश के साथ साझा सिंगरौली कोयला-ऊर्जा क्षेत्र में है।
Building minerals|निर्माण खनिज|Sandstone and building stone occur in the Vindhyan and Bundelkhand belts.|विंध्य-बुंदेलखंड क्षेत्रों में बलुआ पत्थर और निर्माण पत्थर मिलते हैं।`,
    terrain:`Bhabar and Terai|भाबर और तराई|Foothill belts in northern UP; Terai has moist alluvium, forests and wetlands.|उत्तरी यूपी के पादपर्वतीय क्षेत्र; तराई में नम जलोढ़, वन और आर्द्रभूमियाँ हैं।
Ganga–Yamuna Doab|गंगा-यमुना दोआब|Interfluve between the two rivers; important agricultural region.|दोनों नदियों के बीच का क्षेत्र; महत्वपूर्ण कृषि प्रदेश।
Bhangar and khadar|बांगर और खादर|Bhangar—older alluvium; khadar—younger floodplain alluvium.|बांगर—पुराना जलोढ़; खादर—नया बाढ़मैदानी जलोढ़।
Bundelkhand and Vindhyan plateau|बुंदेलखंड और विंध्य पठार|Rocky uplands of southern UP contrast with the alluvial plains.|दक्षिणी यूपी की पथरीली उच्चभूमि जलोढ़ मैदानों से भिन्न है।
Ravines|बीहड़|Chambal–Yamuna drainage near Etawah is associated with badland erosion.|इटावा के पास चंबल-यमुना अपवाह क्षेत्र अवनालिका/बीहड़ अपरदन से जुड़ा है।`,
    economy:`Crops|फसलें|Wheat, rice, sugarcane, potato, pulses and oilseeds; western UP is an important sugarcane belt.|गेहूँ, धान, गन्ना, आलू, दलहन और तिलहन; पश्चिमी यूपी प्रमुख गन्ना क्षेत्र है।
Industry pairs|उद्योग-स्थान संबंध|Kanpur—leather; Moradabad—brassware; Firozabad—glass; Bhadohi—carpets.|कानपुर—चमड़ा; मुरादाबाद—पीतल; फिरोजाबाद—काँच; भदोही—कालीन।
Craft and fruit pairs|शिल्प और फल संबंध|Lucknow—chikankari; Varanasi—silk; Aligarh—locks; Malihabad—mangoes.|लखनऊ—चिकनकारी; वाराणसी—रेशम; अलीगढ़—ताले; मलिहाबाद—आम।
UNESCO sites|यूनेस्को स्थल|Taj Mahal, Agra Fort and Fatehpur Sikri are World Heritage sites.|ताजमहल, आगरा किला और फतेहपुर सीकरी विश्व धरोहर हैं।
Buddhist geography|बौद्ध भूगोल|Sarnath—first sermon; Kushinagar—Mahaparinirvana; Shravasti—important monastic centre.|सारनाथ—प्रथम उपदेश; कुशीनगर—महापरिनिर्वाण; श्रावस्ती—प्रमुख बौद्ध केंद्र।`
  });
  add('uttarakhand','Uttarakhand','उत्तराखंड','Dehradun; Gairsain (summer)','देहरादून; गैरसैंण (ग्रीष्मकालीन)',30.32,78.03,{
    overview:`Location|स्थिति|Central Himalayan state bordering China and Nepal.|चीन और नेपाल से सीमा वाला मध्य हिमालयी राज्य।
Neighbours|पड़ोसी राज्य|Himachal Pradesh and Uttar Pradesh.|हिमाचल प्रदेश और उत्तर प्रदेश।`,
    rivers:`Ganga headstreams|गंगा की उद्गम धाराएँ|Bhagirathi and Alaknanda meet at Devprayag; the combined river is called Ganga.|देवप्रयाग में भागीरथी-अलकनंदा मिलती हैं; संयुक्त नदी गंगा कहलाती है।
Yamuna|यमुना|Rises from the Yamunotri glacier region; Tons is an important tributary.|यमुनोत्री हिमनद क्षेत्र से निकलती है; टोंस प्रमुख सहायक नदी है।
Kali / Sharda|काली / शारदा|Forms part of the India–Nepal boundary.|भारत-नेपाल सीमा का एक भाग बनाती है।`,
    water:`Lakes|झीलें|Naini, Bhimtal, Sattal, Naukuchiatal and Roopkund are important names.|नैनी, भीमताल, सातताल, नौकुचियाताल और रूपकुंड महत्वपूर्ण नाम हैं।
Tehri|टिहरी|Major dam on the Bhagirathi.|भागीरथी पर प्रमुख बाँध।
Asan|आसन|Wetland at the Asan–Yamuna confluence near Dehradun.|देहरादून के पास आसन-यमुना संगम की आर्द्रभूमि।`,
    parks:`National parks|राष्ट्रीय उद्यान|Corbett, Rajaji, Nanda Devi, Valley of Flowers, Gangotri and Govind.|कॉर्बेट, राजाजी, नंदा देवी, फूलों की घाटी, गंगोत्री और गोविंद।
Heritage and species|धरोहर और प्रजातियाँ|Nanda Devi and Valley of Flowers are UNESCO heritage; Corbett is associated with India's first national park.|नंदा देवी-फूलों की घाटी यूनेस्को धरोहर; कॉर्बेट भारत के प्रथम राष्ट्रीय उद्यान से संबंधित है।`,
    minerals:`Resources|संसाधन|Limestone, magnesite and other non-metallic minerals occur.|चूना पत्थर, मैग्नेसाइट और अन्य अधात्विक खनिज मिलते हैं।
Energy|ऊर्जा|Himalayan river hydropower is important; environmental sensitivity is a key issue.|हिमालयी नदी जलविद्युत महत्वपूर्ण; पर्यावरणीय संवेदनशीलता प्रमुख मुद्दा है।`,
    terrain:`Regions and peaks|क्षेत्र और शिखर|Garhwal and Kumaon; Nanda Devi, Kamet and Trisul are important peaks.|गढ़वाल और कुमाऊँ; नंदा देवी, कामेत और त्रिशूल प्रमुख शिखर हैं।
Passes|दर्रे|Mana, Niti and Lipulekh are important high Himalayan passes.|माणा, नीति और लिपुलेख महत्वपूर्ण उच्च हिमालयी दर्रे हैं।`,
    economy:`Farming|कृषि|Terrace farming, millets, horticulture and medicinal plants.|सीढ़ीदार खेती, मोटे अनाज, बागवानी और औषधीय पौधे।
Pilgrimage geography|तीर्थ भूगोल|Badrinath, Kedarnath, Gangotri, Yamunotri, Haridwar and Rishikesh.|बद्रीनाथ, केदारनाथ, गंगोत्री, यमुनोत्री, हरिद्वार और ऋषिकेश।`
  });
  add('west-bengal','West Bengal','पश्चिम बंगाल','Kolkata','कोलकाता',22.57,88.36,{
    overview:`Location|स्थिति|Extends from the Himalaya to the Bay of Bengal; borders Nepal, Bhutan and Bangladesh.|हिमालय से बंगाल की खाड़ी तक विस्तृत; नेपाल, भूटान और बांग्लादेश से सीमा।
Neighbours|पड़ोसी राज्य|Sikkim, Assam, Bihar, Jharkhand and Odisha.|सिक्किम, असम, बिहार, झारखंड और ओडिशा।`,
    rivers:`Ganga–Bhagirathi–Hooghly|गंगा-भागीरथी-हुगली|Farakka is associated with the Ganga diversion; Hooghly flows past Kolkata.|फरक्का गंगा जल मोड़ने से जुड़ा है; हुगली कोलकाता से बहती है।
Teesta and Mahananda|तीस्ता और महानंदा|Important rivers of northern Bengal.|उत्तरी बंगाल की महत्वपूर्ण नदियाँ।
Damodar|दामोदर|Flows from Jharkhand into the lower Bengal drainage system.|झारखंड से निचले बंगाल के अपवाह तंत्र में बहती है।`,
    water:`East Kolkata Wetlands|पूर्वी कोलकाता आर्द्रभूमियाँ|Wastewater-fed fisheries and wetland agriculture are important functions.|अपशिष्ट जल आधारित मत्स्यन और आर्द्रभूमि कृषि महत्वपूर्ण कार्य हैं।
Farakka and DVC|फरक्का और डीवीसी|Farakka—Ganga barrage; DVC—Damodar Valley projects.|फरक्का—गंगा बैराज; डीवीसी—दामोदर घाटी परियोजनाएँ।`,
    parks:`National parks|राष्ट्रीय उद्यान|Sundarbans, Buxa, Jaldapara, Gorumara, Neora Valley and Singalila.|सुंदरबन, बक्सा, जलदापाड़ा, गोरुमारा, नियोरा वैली और सिंगालीला।
Species links|प्रजाति संबंध|Sundarbans—mangroves and tiger; Jaldapara—one-horned rhinoceros; Singalila—red panda.|सुंदरबन—मैंग्रोव-बाघ; जलदापाड़ा—एक सींग वाला गैंडा; सिंगालीला—लाल पांडा।`,
    minerals:`Coal|कोयला|Raniganj coalfield in the Damodar Valley is a major historical coal association.|दामोदर घाटी का रानीगंज महत्वपूर्ण ऐतिहासिक कोयला क्षेत्र है।
Other resources|अन्य संसाधन|China clay, fireclay and building minerals occur.|चीनी मिट्टी, अग्निसह मिट्टी और निर्माण खनिज मिलते हैं।`,
    terrain:`Physical divisions|भौतिक विभाग|Darjeeling Himalaya, Terai–Dooars, alluvial plains, western plateau fringe and delta.|दार्जिलिंग हिमालय, तराई-डुआर्स, जलोढ़ मैदान, पश्चिमी पठारी किनारा और डेल्टा।
Sundarbans|सुंदरबन|Tidal mangrove delta shared with Bangladesh.|बांग्लादेश के साथ साझा ज्वारीय मैंग्रोव डेल्टा।`,
    economy:`Crops and industry|फसलें और उद्योग|Rice, jute and Darjeeling tea; jute mills and Durgapur–Asansol industry.|धान, जूट और दार्जिलिंग चाय; जूट मिलें और दुर्गापुर-आसनसोल उद्योग।
Port and heritage|पत्तन और विरासत|Syama Prasad Mookerjee Port includes Kolkata–Haldia docks; Santiniketan is a UNESCO site.|श्यामा प्रसाद मुखर्जी पत्तन में कोलकाता-हल्दिया डॉक; शांतिनिकेतन यूनेस्को स्थल है।`
  });
  add('andaman-nicobar','Andaman and Nicobar Islands','अंडमान और निकोबार द्वीपसमूह','Sri Vijaya Puram','श्री विजयपुरम',11.67,92.74,{
    overview:`Location|स्थिति|Island UT between the Bay of Bengal and Andaman Sea.|बंगाल की खाड़ी और अंडमान सागर के बीच द्वीपीय केंद्रशासित प्रदेश।
Capital name|राजधानी का नाम|Sri Vijaya Puram was formerly called Port Blair.|श्री विजयपुरम का पूर्व नाम पोर्ट ब्लेयर था।`,
    rivers:`Island drainage|द्वीपीय अपवाह|Short island streams; Kalpong is an important North Andaman river.|छोटी द्वीपीय धाराएँ; कल्पोंग उत्तरी अंडमान की महत्वपूर्ण नदी है।
Great Nicobar|ग्रेट निकोबार|Galathea and Alexandra are important river names.|गैलाथिया और अलेक्जेंड्रा महत्वपूर्ण नदी नाम हैं।`,
    water:`Channels|चैनल|Ten Degree Channel separates Andaman from Nicobar; Duncan Passage lies within the Andaman group.|दस डिग्री चैनल अंडमान-निकोबार को अलग करता है; डंकन मार्ग अंडमान समूह के भीतर है।
Marine waters|समुद्री जल|Coral reefs, mangroves and coastal lagoons are important habitats.|प्रवाल भित्तियाँ, मैंग्रोव और तटीय लैगून महत्वपूर्ण आवास हैं।`,
    parks:`National parks|राष्ट्रीय उद्यान|Mahatma Gandhi Marine, Rani Jhansi Marine, Mount Manipur, Saddle Peak, Campbell Bay and Galathea Bay.|महात्मा गांधी मरीन, रानी झाँसी मरीन, माउंट मणिपुर, सैडल पीक, कैंपबेल बे और गैलाथिया बे।
Island parks and species|द्वीपीय उद्यान और प्रजातियाँ|North, Middle and South Button Island parks; Nicobar megapode and leatherback turtle are important species associations.|नॉर्थ, मिडिल और साउथ बटन द्वीप उद्यान; निकोबार मेगापोड और लेदरबैक कछुआ महत्वपूर्ण हैं।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Marine biological resources are more important for revision than a large terrestrial metallic-mineral belt.|बड़े स्थलीय धात्विक खनिज क्षेत्र से अधिक समुद्री जैव संसाधन महत्वपूर्ण हैं।
Energy|ऊर्जा|Kalpong is a hydropower association; offshore resources require separate verification.|कल्पोंग जलविद्युत से जुड़ा है; अपतटीय संसाधनों की अलग पुष्टि आवश्यक है।`,
    terrain:`Volcanic and island features|ज्वालामुखीय और द्वीपीय स्थल|Barren Island—active volcano; Narcondam—volcanic island; Saddle Peak—highest Andaman peak.|बैरन द्वीप—सक्रिय ज्वालामुखी; नारकोंडम—ज्वालामुखीय द्वीप; सैडल पीक—अंडमान का सर्वोच्च शिखर।
Southern point|दक्षिणी बिंदु|Indira Point is on Great Nicobar.|इंदिरा प्वाइंट ग्रेट निकोबार पर है।`,
    economy:`Economy|अर्थव्यवस्था|Fisheries, coconut, arecanut and tourism.|मत्स्यन, नारियल, सुपारी और पर्यटन।
Heritage|विरासत|Cellular Jail in Sri Vijaya Puram is an important freedom-struggle location.|श्री विजयपुरम की सेल्युलर जेल स्वतंत्रता संग्राम का महत्वपूर्ण स्थल है।`
  },true);
  add('chandigarh','Chandigarh','चंडीगढ़','Chandigarh','चंडीगढ़',30.74,76.79,{
    overview:`Administrative role|प्रशासनिक भूमिका|Separate UT and shared capital of Punjab and Haryana.|अलग केंद्रशासित प्रदेश तथा पंजाब-हरियाणा की साझा राजधानी।
Location|स्थिति|At the Shivalik foothills, adjoining Punjab and Haryana.|शिवालिक तलहटी में पंजाब और हरियाणा से सटा।`,
    rivers:`Seasonal drainage|मौसमी अपवाह|Sukhna Choe and Patiali Rao are important seasonal streams.|सुखना चो और पटियाली राव महत्वपूर्ण मौसमी धाराएँ हैं।
Catchment|जलग्रहण|Shivalik runoff and sediment affect the Sukhna catchment.|शिवालिक का अपवाह-अवसाद सुखना जलग्रहण को प्रभावित करता है।`,
    water:`Sukhna Lake|सुखना झील|Human-made reservoir at the Shivalik foothills.|शिवालिक तलहटी में मानव निर्मित जलाशय।
Wetland function|आर्द्रभूमि का कार्य|Important for waterbirds, urban recreation and environmental education.|जलपक्षियों, शहरी मनोरंजन और पर्यावरण शिक्षा के लिए महत्वपूर्ण।`,
    parks:`Sukhna Wildlife Sanctuary|सुखना वन्यजीव अभयारण्य|Protects the foothill catchment above the lake; it is not a national park.|झील के ऊपर तलहटी जलग्रहण को संरक्षित करता है; यह राष्ट्रीय उद्यान नहीं है।
Urban ecology|शहरी पारिस्थितिकी|Sukhna's bird habitat and catchment conservation are key revision themes.|सुखना का पक्षी आवास और जलग्रहण संरक्षण प्रमुख विषय हैं।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Not a major metallic-mineral-producing territory.|प्रमुख धात्विक खनिज उत्पादक क्षेत्र नहीं है।
Energy and water|ऊर्जा और जल|Urban water supply and energy services are more relevant than mining belts.|खनन क्षेत्रों से अधिक शहरी जलापूर्ति और ऊर्जा सेवाएँ प्रासंगिक हैं।`,
    terrain:`Shivalik foothills|शिवालिक तलहटी|Piedmont setting with seasonal streams and erosion-prone catchments.|मौसमी धाराओं और अपरदनशील जलग्रहण वाला पादपर्वतीय क्षेत्र।
Planned city|नियोजित नगर|Sector-based urban layout is an important settlement-geography association.|सेक्टर आधारित नगरीय विन्यास महत्वपूर्ण बस्ती-भूगोल संबंध है।`,
    economy:`Services|सेवाएँ|Administration, education, healthcare and services dominate.|प्रशासन, शिक्षा, स्वास्थ्य और सेवाएँ प्रमुख हैं।
Heritage|विरासत|Capitol Complex is part of the UNESCO listing of Le Corbusier's architectural work.|कैपिटल कॉम्प्लेक्स ले कोर्बुज़िए के वास्तु कार्यों की यूनेस्को सूची का भाग है।`
  },true);
  add('dadra-nagar-haveli-daman-diu','Dadra and Nagar Haveli and Daman and Diu','दादरा और नगर हवेली तथा दमन और दीव','Daman','दमन',20.40,72.83,{
    overview:`Administrative form|प्रशासनिक स्वरूप|Merged union territory since 2020; its parts are geographically separated.|वर्ष 2020 से विलयित केंद्रशासित प्रदेश; इसके भाग भौगोलिक रूप से अलग हैं।
Location|स्थिति|Western India; Daman and Diu are coastal, while Dadra and Nagar Haveli is inland.|पश्चिमी भारत; दमन-दीव तटीय और दादरा-नगर हवेली अंतर्देशीय है।`,
    rivers:`Daman Ganga|दमन गंगा|Flows through the Silvassa region and reaches the Arabian Sea at Daman.|सिलवासा क्षेत्र से बहकर दमन में अरब सागर में गिरती है।
Estuarine setting|ज्वारनदमुखीय स्थिति|Coastal creeks and estuaries shape the Daman and Diu landscape.|तटीय खाड़ियाँ और ज्वारनदमुख दमन-दीव के भूगोल को आकार देते हैं।`,
    water:`Madhuban reservoir|मधुबन जलाशय|Daman Ganga project near the Gujarat–Dadra and Nagar Haveli region.|गुजरात-दादरा और नगर हवेली क्षेत्र के पास दमन गंगा परियोजना।
Coast|तट|Diu and Daman face the Arabian Sea; remember their separate coastal locations.|दीव और दमन अरब सागर पर हैं; इनके अलग तटीय स्थान याद रखें।`,
    parks:`Wildlife areas|वन्यजीव क्षेत्र|Satmalia and Vasona are local wildlife-tourism associations in Dadra and Nagar Haveli.|दादरा और नगर हवेली में सतमालिया और वासोना स्थानीय वन्यजीव-पर्यटन स्थल हैं।
Classification|वर्गीकरण|Do not equate a safari or deer park with a notified national park.|सफारी या हिरण पार्क को अधिसूचित राष्ट्रीय उद्यान न मानें।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Not a major metallic-ore belt; local construction materials are more relevant.|प्रमुख धात्विक अयस्क क्षेत्र नहीं; स्थानीय निर्माण सामग्री अधिक प्रासंगिक है।
Marine resources|समुद्री संसाधन|Fisheries are important in the coastal parts.|तटीय भागों में मत्स्यन महत्वपूर्ण है।`,
    terrain:`Contrasting parts|अलग भूभाग|Coastal plains and Diu island contrast with the hilly forested inland tract.|तटीय मैदान और दीव द्वीप, पहाड़ी वनाच्छादित अंतर्देशीय भाग से भिन्न हैं।
Map trap|मानचित्र सावधानी|The merged UT is not one continuous polygon on the map.|विलयित केंद्रशासित प्रदेश मानचित्र पर एक सतत बहुभुज नहीं है।`,
    economy:`Industry|उद्योग|Silvassa and Daman are important manufacturing centres.|सिलवासा और दमन महत्वपूर्ण विनिर्माण केंद्र हैं।
Tourism and farming|पर्यटन और कृषि|Coastal tourism, fisheries, rice and horticulture.|तटीय पर्यटन, मत्स्यन, धान और बागवानी।`
  },true);
  add('delhi','Delhi','दिल्ली','New Delhi','नई दिल्ली',28.61,77.21,{
    overview:`Administrative form|प्रशासनिक स्वरूप|National Capital Territory; New Delhi is India's capital.|राष्ट्रीय राजधानी क्षेत्र; नई दिल्ली भारत की राजधानी है।
Neighbours|पड़ोसी राज्य|Haryana and Uttar Pradesh.|हरियाणा और उत्तर प्रदेश।`,
    rivers:`Yamuna|यमुना|Principal river flowing through Delhi; a tributary of the Ganga.|दिल्ली से बहने वाली प्रमुख नदी; गंगा की सहायक नदी।
Floodplain|बाढ़मैदान|Yamuna floodplain management, pollution and urban encroachment are important issues.|यमुना बाढ़मैदान प्रबंधन, प्रदूषण और शहरी अतिक्रमण महत्वपूर्ण मुद्दे हैं।`,
    water:`Najafgarh Jheel|नजफगढ़ झील|Wetland landscape shared with adjoining Haryana.|निकटवर्ती हरियाणा के साथ साझा आर्द्रभूमि क्षेत्र।
Barrages|बैराज|Wazirabad, ITO and Okhla are Yamuna barrage associations.|वजीराबाद, आईटीओ और ओखला यमुना बैराज से जुड़े हैं।`,
    parks:`Asola Bhatti|असोला भट्टी|Wildlife sanctuary in the southern Delhi Ridge landscape.|दक्षिणी दिल्ली रिज क्षेत्र में वन्यजीव अभयारण्य।
Location trap|स्थान संबंधी सावधानी|Okhla Bird Sanctuary lies in Uttar Pradesh, beside Delhi; it is not a Delhi national park.|ओखला पक्षी अभयारण्य दिल्ली के पास उत्तर प्रदेश में है; दिल्ली का राष्ट्रीय उद्यान नहीं है।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Quartzite of the Delhi Ridge is a geological association; Delhi is not a major mining economy.|दिल्ली रिज का क्वार्टजाइट भूवैज्ञानिक संबंध है; दिल्ली प्रमुख खनन अर्थव्यवस्था नहीं है।
Urban resources|शहरी संसाधन|Water, land and energy demand are central geographical themes.|जल, भूमि और ऊर्जा माँग प्रमुख भौगोलिक विषय हैं।`,
    terrain:`Delhi Ridge|दिल्ली रिज|Northern extension of the Aravalli system.|अरावली तंत्र का उत्तरी विस्तार।
Plains|मैदान|Alluvial plains along the Yamuna contrast with the rocky ridge.|यमुना के जलोढ़ मैदान पथरीली रिज से भिन्न हैं।`,
    economy:`Economy|अर्थव्यवस्था|Government, trade, services, transport and manufacturing.|सरकार, व्यापार, सेवाएँ, परिवहन और विनिर्माण।
UNESCO heritage|यूनेस्को धरोहर|Red Fort Complex, Qutb Minar complex and Humayun's Tomb.|लाल किला परिसर, कुतुब मीनार परिसर और हुमायूँ का मकबरा।`
  },true);
  add('jammu-kashmir','Jammu and Kashmir','जम्मू और कश्मीर','Srinagar / Jammu','श्रीनगर / जम्मू',34.08,74.80,{
    overview:`Administrative form|प्रशासनिक स्वरूप|Union territory since 2019; Ladakh is a separate UT.|वर्ष 2019 से केंद्रशासित प्रदेश; लद्दाख अलग केंद्रशासित प्रदेश है।
Regions|क्षेत्र|Jammu region and Kashmir Valley; do not include Leh in present-day J&K UT.|जम्मू क्षेत्र और कश्मीर घाटी; लेह को वर्तमान जम्मू-कश्मीर में न रखें।`,
    rivers:`Jhelum|झेलम|Rises at Verinag and flows through Srinagar and Wular Lake.|वेरीनाग से निकलकर श्रीनगर और वुलर झील से बहती है।
Chenab and Tawi|चिनाब और तवी|Chenab crosses the Jammu region; Tawi flows through Jammu city.|चिनाब जम्मू क्षेत्र से; तवी जम्मू नगर से बहती है।`,
    water:`Lakes|झीलें|Wular, Dal, Nigeen, Mansar and Surinsar are important.|वुलर, डल, निगीन, मानसर और सुरिनसर महत्वपूर्ण हैं।
Hydropower|जलविद्युत|Salal, Dulhasti and Baglihar are Chenab projects.|सलाल, दुलहस्ती और बगलिहार चिनाब की परियोजनाएँ हैं।`,
    parks:`National parks|राष्ट्रीय उद्यान|Dachigam, Kishtwar High Altitude, Kazinag and Salim Ali (City Forest).|दाचीगाम, किश्तवाड़ हाई एल्टीट्यूड, काजीनाग और सलीम अली (सिटी फॉरेस्ट)।
Species and boundary trap|प्रजाति और सीमा सावधानी|Dachigam—hangul; Hemis National Park lies in Ladakh, not present-day J&K.|दाचीगाम—हंगुल; हेमिस राष्ट्रीय उद्यान लद्दाख में है, वर्तमान जम्मू-कश्मीर में नहीं।`,
    minerals:`Resources|संसाधन|Limestone, gypsum and sapphire occurrences are important; Paddar is associated with sapphire.|चूना पत्थर, जिप्सम और नीलम महत्वपूर्ण; पाडर नीलम से जुड़ा है।
Reasi lithium|रियासी लिथियम|Exploration/inferred resource announcements are not the same as proven mineable reserves or active production.|अन्वेषण/अनुमानित संसाधन घोषणा, सिद्ध खननीय भंडार या चालू उत्पादन के बराबर नहीं है।`,
    terrain:`Ranges|श्रेणियाँ|Pir Panjal separates the Kashmir Valley from much of the Jammu region.|पीर पंजाल कश्मीर घाटी को जम्मू के बड़े भाग से अलग करता है।
Passes|दर्रे|Banihal and Pir Panjal routes are important; Zoji La connects towards Ladakh.|बनिहाल और पीर पंजाल मार्ग महत्वपूर्ण; जोजी ला लद्दाख की ओर जोड़ता है।`,
    economy:`Crops and crafts|फसलें और शिल्प|Apples, walnuts, saffron, horticulture, handicrafts and tourism.|सेब, अखरोट, केसर, बागवानी, हस्तशिल्प और पर्यटन।
Saffron|केसर|Pampore is an important saffron-growing association.|पंपोर केसर उत्पादन का महत्वपूर्ण क्षेत्र है।`
  },true);
  add('ladakh','Ladakh','लद्दाख','Leh','लेह',34.16,77.58,{
    overview:`Administrative form|प्रशासनिक स्वरूप|Union territory since 2019; Leh and Kargil are important administrative centres.|वर्ष 2019 से केंद्रशासित प्रदेश; लेह और कारगिल महत्वपूर्ण प्रशासनिक केंद्र हैं।
Location|स्थिति|Trans-Himalayan high-altitude region adjoining Jammu and Kashmir and Himachal Pradesh.|जम्मू-कश्मीर और हिमाचल प्रदेश से सटा उच्च तिब्बत-पार हिमालयी क्षेत्र।`,
    rivers:`Indus|सिंधु|Flows through the Leh region before continuing northwest.|लेह क्षेत्र से बहकर उत्तर-पश्चिम की ओर जाती है।
Zanskar and Shyok|जांस्कर और श्योक|Zanskar joins Indus near Nimmu; Shyok is an important Indus-system tributary.|जांस्कर निम्मू के पास सिंधु से मिलती है; श्योक सिंधु तंत्र की प्रमुख सहायक नदी है।`,
    water:`Lakes|झीलें|Pangong Tso, Tso Moriri and Tso Kar are high-altitude lakes; Pangong is transboundary.|पैंगोंग त्सो, त्सो मोरीरी और त्सो कार उच्च झीलें; पैंगोंग सीमापार झील है।
Nimoo Bazgo|निमू बाजगो|Hydropower project on the Indus.|सिंधु पर जलविद्युत परियोजना।`,
    parks:`Hemis|हेमिस|High-altitude national park, strongly associated with snow leopard.|उच्च हिमालयी राष्ट्रीय उद्यान; हिम तेंदुए से विशेष संबंध।
Changthang|चांगथांग|High-altitude wildlife sanctuary; kiang and black-necked crane are important associations.|उच्च हिमालयी वन्यजीव अभयारण्य; कियांग और काली गर्दन वाला सारस महत्वपूर्ण हैं।`,
    minerals:`Resources|संसाधन|Borax and geothermal occurrences in the Puga region are important associations.|पुगा क्षेत्र में बोरेक्स और भू-तापीय संसाधन महत्वपूर्ण संबंध हैं।
Solar energy|सौर ऊर्जा|High sunshine and cold-desert conditions make solar-energy potential important.|अधिक धूप और शीत मरुस्थलीय दशाएँ सौर ऊर्जा की संभावना बढ़ाती हैं।`,
    terrain:`Cold desert|शीत मरुस्थल|Rain-shadow region with sparse vegetation and large altitude ranges.|कम वनस्पति और अधिक ऊँचाई वाला वृष्टिछाया क्षेत्र।
Ranges and passes|श्रेणियाँ और दर्रे|Karakoram, Ladakh and Zanskar ranges; Khardung La, Chang La and Karakoram Pass.|काराकोरम, लद्दाख और जांस्कर श्रेणियाँ; खारदुंग ला, चांग ला और काराकोरम दर्रा।`,
    economy:`Livelihoods|आजीविका|Barley, apricot, pastoralism, pashmina and tourism.|जौ, खुबानी, पशुपालन, पश्मीना और पर्यटन।
Location links|स्थान-संबंध|Nubra Valley—Shyok/Nubra system; Drass—cold mountain settlement.|नुब्रा घाटी—श्योक/नुब्रा तंत्र; द्रास—शीत पर्वतीय बस्ती।`
  },true);
  add('lakshadweep','Lakshadweep','लक्षद्वीप','Kavaratti','कवरत्ती',10.57,72.64,{
    overview:`Location|स्थिति|Coral-island UT in the Arabian Sea, west of Kerala.|केरल के पश्चिम में अरब सागर का प्रवाल द्वीपीय केंद्रशासित प्रदेश।
Island type|द्वीप प्रकार|Atolls, reefs and lagoons; unlike the largely tectonic Andaman–Nicobar island chain.|एटॉल, भित्तियाँ और लैगून; मुख्यतः विवर्तनिक अंडमान-निकोबार श्रृंखला से भिन्न।`,
    rivers:`Island hydrology|द्वीपीय जलविज्ञान|No large perennial river system; small freshwater lenses are crucial.|बड़ी बारहमासी नदी प्रणाली नहीं; छोटे मीठे जल लेंस महत्वपूर्ण हैं।
Water vulnerability|जल संवेदनशीलता|Saltwater intrusion and limited land area constrain freshwater availability.|खारे जल का प्रवेश और सीमित भूमि मीठे जल की उपलब्धता सीमित करते हैं।`,
    water:`Lagoons|लैगून|Coral atolls enclose shallow lagoons used for fisheries and tourism.|प्रवाल एटॉल उथली लैगून बनाते हैं; मत्स्यन-पर्यटन में उपयोग।
Channels|चैनल|Nine Degree Channel separates Minicoy from the main island group; Eight Degree Channel lies towards Maldives.|नौ डिग्री चैनल मिनिकॉय को मुख्य समूह से अलग करता है; आठ डिग्री चैनल मालदीव की ओर है।`,
    parks:`Pitti / Pakshipitti|पिट्टी / पक्षीपिट्टी|Bird sanctuary; remember the seabird and coral-island setting.|पक्षी अभयारण्य; समुद्री पक्षी और प्रवाल द्वीपीय स्थिति याद रखें।
Marine ecology|समुद्री पारिस्थितिकी|Coral reefs, seagrass and turtles are important conservation themes.|प्रवाल भित्तियाँ, समुद्री घास और कछुए महत्वपूर्ण संरक्षण विषय हैं।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Not a major terrestrial metallic-mineral belt; coral ecosystems need protection.|प्रमुख स्थलीय धात्विक खनिज क्षेत्र नहीं; प्रवाल पारिस्थितिकी की रक्षा जरूरी है।
Marine resources|समुद्री संसाधन|Tuna fisheries and coconut-based resources are important.|टूना मत्स्यन और नारियल आधारित संसाधन महत्वपूर्ण हैं।`,
    terrain:`Low relief|निम्न उच्चावच|Low-lying coral islands are vulnerable to coastal erosion and sea-level changes.|नीचे प्रवाल द्वीप तटीय कटाव और समुद्रतल परिवर्तन के प्रति संवेदनशील हैं।
Important islands|महत्वपूर्ण द्वीप|Kavaratti, Minicoy, Agatti, Andrott and Kalpeni.|कवरत्ती, मिनिकॉय, अगत्ती, अंद्रोत और कल्पेनी।`,
    economy:`Livelihoods|आजीविका|Fishing, coconut, coir and regulated tourism.|मत्स्यन, नारियल, नारियल रेशा (कॉयर) और नियंत्रित पर्यटन।
Map revision|मानचित्र पुनरावृत्ति|Locate Lakshadweep in the Arabian Sea, not the Bay of Bengal.|लक्षद्वीप को अरब सागर में रखें, बंगाल की खाड़ी में नहीं।`
  },true);
  add('puducherry','Puducherry','पुडुचेरी','Puducherry','पुडुचेरी',11.94,79.81,{
    overview:`Four enclaves|चार अंतःक्षेत्र|Puducherry and Karaikal in Tamil Nadu; Mahe in Kerala; Yanam in Andhra Pradesh.|तमिलनाडु में पुडुचेरी-कराईकल; केरल में माहे; आंध्र प्रदेश में यानम।
Administrative form|प्रशासनिक स्वरूप|A union territory with geographically separated districts.|भौगोलिक रूप से अलग जिलों वाला केंद्रशासित प्रदेश।`,
    rivers:`River pairs|नदी-क्षेत्र संबंध|Karaikal—Kaveri distributaries; Mahe—Mahe River; Yanam—Godavari delta.|कराईकल—कावेरी वितरिकाएँ; माहे—माहे नदी; यानम—गोदावरी डेल्टा।
Puducherry region|पुडुचेरी क्षेत्र|Gingee/Sankaraparani and Ariyankuppam are important local river names.|जिंजी/शंकरापरणी और अरियानकुप्पम महत्वपूर्ण स्थानीय नदियाँ हैं।`,
    water:`Ousteri / Oussudu|ऊसुदु / ऊस्टेरी|Lake and bird habitat shared with Tamil Nadu.|तमिलनाडु के साथ साझा झील और पक्षी आवास।
Coasts|तट|Mahe faces the Arabian Sea; the other three regions lie on the eastern coast.|माहे अरब सागर पर; अन्य तीन क्षेत्र पूर्वी तट पर हैं।`,
    parks:`Oussudu Bird Sanctuary|ऊसुदु पक्षी अभयारण्य|Important wetland bird habitat; do not label it a national park.|महत्वपूर्ण आर्द्रभूमि पक्षी आवास; इसे राष्ट्रीय उद्यान न लिखें।
Coastal ecology|तटीय पारिस्थितिकी|Estuaries, mangroves and coastal wetlands are important.|ज्वारनदमुख, मैंग्रोव और तटीय आर्द्रभूमियाँ महत्वपूर्ण हैं।`,
    minerals:`Resource pattern|संसाधन स्वरूप|Not a major metallic-ore belt; local clay and construction materials are more relevant.|प्रमुख धात्विक अयस्क क्षेत्र नहीं; स्थानीय मिट्टी-निर्माण सामग्री अधिक प्रासंगिक हैं।
Energy link|ऊर्जा संबंध|Karaikal's Cauvery-basin setting is a petroleum-region association.|कराईकल का कावेरी बेसिन पेट्रोलियम क्षेत्र से जुड़ा है।`,
    terrain:`Coastal plains|तटीय मैदान|Low-lying coastal and deltaic tracts; the four parts are not contiguous.|निम्न तटीय-डेल्टाई क्षेत्र; चारों भाग जुड़े नहीं हैं।
Cyclone exposure|चक्रवात संवेदनशीलता|The east-coast enclaves face Bay of Bengal cyclone risks.|पूर्वी तटीय अंतःक्षेत्र बंगाल की खाड़ी के चक्रवातों से प्रभावित होते हैं।`,
    economy:`Economy|अर्थव्यवस्था|Rice, fisheries, industry, education and tourism.|धान, मत्स्यन, उद्योग, शिक्षा और पर्यटन।
Heritage|विरासत|French colonial urban heritage and Auroville near Puducherry are important associations.|फ्रांसीसी औपनिवेशिक नगर विरासत और पुडुचेरी के पास ऑरोविल महत्वपूर्ण हैं।`
  },true);

  // Site names are factual reference data, grouped from the dated official list.
  const ramsar = {
    'andhra-pradesh':'Kolleru Lake|कोल्लेरू झील',
    'arunachal-pradesh':'Glaw Lake|ग्लॉ झील',
    'assam':'Deepor Beel|दीपोर बील',
    'Bihar':'Kabartal (Kanwar Jheel)|काबरताल (काँवर झील);Nagi Bird Sanctuary|नागी पक्षी अभयारण्य;Nakti Bird Sanctuary|नकटी पक्षी अभयारण्य;Gokul Jalashay|गोकुल जलाशय;Udaipur Jheel|उदयपुर झील;Gogabil Lake|गोगाबिल झील',
    'chhattisgarh':'Kopra Jalashay|कोपरा जलाशय',
    'goa':'Nanda Lake|नंदा झील',
    'gujarat':'Nalsarovar|नल सरोवर;Wadhvana Wetland|वधवाना आर्द्रभूमि;Thol Lake Wildlife Sanctuary|थोल झील वन्यजीव अभयारण्य;Khijadia Wildlife Sanctuary|खिजड़िया वन्यजीव अभयारण्य;Chhari Dhand|छारी ढांढ',
    'haryana':'Sultanpur National Park|सुल्तानपुर राष्ट्रीय उद्यान;Bhindawas Wildlife Sanctuary|भिंडावास वन्यजीव अभयारण्य',
    'himachal-pradesh':'Pong Dam Lake|पोंग बाँध झील;Chandertal Wetland|चंद्रताल आर्द्रभूमि;Renuka Wetland|रेणुका आर्द्रभूमि',
    'jharkhand':'Udhwa Lake Bird Sanctuary|उधवा झील पक्षी अभयारण्य',
    'karnataka':'Ranganathittu Bird Sanctuary|रंगनाथिट्टू पक्षी अभयारण्य;Aghanashini Estuary|अघनाशिनी ज्वारनदमुख;Magadi Kere Conservation Reserve|मगडी केरे संरक्षण रिजर्व;Ankasamudra Bird Conservation Reserve|अंकसमुद्र पक्षी संरक्षण रिजर्व',
    'kerala':'Ashtamudi Wetland|अष्टमुडी आर्द्रभूमि;Sasthamkotta Lake|शास्तामकोट्टा झील;Vembanad-Kol Wetland|वेम्बनाड-कोल आर्द्रभूमि',
    'madhya-pradesh':'Bhoj Wetlands|भोज आर्द्रभूमियाँ;Sirpur Wetland|सिरपुर आर्द्रभूमि;Sakhya Sagar|साख्य सागर;Yashwant Sagar|यशवंत सागर;Tawa Reservoir|तवा जलाशय',
    'maharashtra':'Nandur Madhameshwar|नांदुर मध्यमेश्वर;Lonar Lake|लोनार झील;Thane Creek|ठाणे क्रीक',
    'manipur':'Loktak Lake|लोकटक झील',
    'mizoram':'Pala Wetland|पाला आर्द्रभूमि',
    'odisha':'Chilika Lake|चिलिका झील;Bhitarkanika Mangroves|भितरकनिका मैंग्रोव;Satkosia Gorge|सतकोसिया गॉर्ज;Tampara Lake|ताम्परा झील;Hirakud Reservoir|हीराकुंड जलाशय;Ansupa Lake|अंसुपा झील',
    'punjab':'Harike Lake|हरिके झील;Kanjli Lake|कांजली झील;Ropar Lake|रोपड़ झील;Beas Conservation Reserve|ब्यास संरक्षण रिजर्व;Keshopur-Miani Community Reserve|केशोपुर-मियानी सामुदायिक रिजर्व;Nangal Wildlife Sanctuary|नंगल वन्यजीव अभयारण्य',
    'rajasthan':'Keoladeo National Park|केवलादेव राष्ट्रीय उद्यान;Sambhar Lake|सांभर झील;Menar Wetland Complex|मेनार आर्द्रभूमि परिसर;Khichan Wetland|खीचन आर्द्रभूमि;Siliserh Lake|सिलिसेढ़ झील',
    'sikkim':'Khecheopalri Wetland|खेचियोपलरी आर्द्रभूमि',
    'tamil-nadu':'Point Calimere Wildlife and Bird Sanctuary|पॉइंट कैलिमेर वन्यजीव-पक्षी अभयारण्य;Koonthankulam Bird Sanctuary|कून्थनकुलम पक्षी अभयारण्य;Chitrangudi Bird Sanctuary|चित्रांगुडी पक्षी अभयारण्य;Karikili Bird Sanctuary|करिकिली पक्षी अभयारण्य;Pichavaram Mangrove|पिचावरम मैंग्रोव;Pallikaranai Marsh Reserve Forest|पल्लिकरनई मार्श रिजर्व वन;Gulf of Mannar Marine Biosphere Reserve|मन्नार की खाड़ी मरीन जैवमंडल रिजर्व;Vembannur Wetland Complex|वेम्बन्नूर आर्द्रभूमि परिसर;Vellode Bird Sanctuary|वेलोड पक्षी अभयारण्य;Udhayamarthandapuram Bird Sanctuary|उदयमार्थंडपुरम पक्षी अभयारण्य;Vedanthangal Bird Sanctuary|वेदांतंगल पक्षी अभयारण्य;Suchindram Theroor Wetland Complex|सुचिंद्रम थेरूर आर्द्रभूमि परिसर;Vaduvur Bird Sanctuary|वडुवूर पक्षी अभयारण्य;Kanjirankulam Bird Sanctuary|कांजीरनकुलम पक्षी अभयारण्य;Karaivetti Bird Sanctuary|कराईवेट्टी पक्षी अभयारण्य;Longwood Shola Reserve Forest|लॉन्गवुड शोला रिजर्व वन;Kazhuveli Bird Sanctuary|काझुवेली पक्षी अभयारण्य;Nanjarayan Bird Sanctuary|नंजरायन पक्षी अभयारण्य;Sakkarakottai Bird Sanctuary|सक्करकोट्टई पक्षी अभयारण्य;Therthangal Bird Sanctuary|थेरथंगल पक्षी अभयारण्य',
    'tripura':'Rudrasagar Lake|रुद्रसागर झील',
    'UP':'Upper Ganga River (Brijghat to Narora)|ऊपरी गंगा नदी (बृजघाट से नरौरा);Nawabganj Bird Sanctuary|नवाबगंज पक्षी अभयारण्य;Sarsai Nawar Jheel|सरसई नावर झील;Sandi Bird Sanctuary|सांडी पक्षी अभयारण्य;Samaspur Bird Sanctuary|समसपुर पक्षी अभयारण्य;Parvati Arga Bird Sanctuary|पार्वती अरगा पक्षी अभयारण्य;Saman Bird Sanctuary|समान पक्षी अभयारण्य;Sur Sarovar|सूर सरोवर;Haiderpur Wetland|हैदरपुर आर्द्रभूमि;Bakhira Wildlife Sanctuary|बखीरा वन्यजीव अभयारण्य;Patna Bird Sanctuary|पटना पक्षी अभयारण्य;Shekha Jheel Bird Sanctuary|शेखा झील पक्षी अभयारण्य;Jai Prakash Narayan Bird Sanctuary (Surha Tal)|जय प्रकाश नारायण पक्षी अभयारण्य (सुरहा ताल);Sauj Jheel|सौज झील',
    'uttarakhand':'Asan Conservation Reserve|आसन संरक्षण रिजर्व',
    'west-bengal':'East Kolkata Wetlands|पूर्वी कोलकाता आर्द्रभूमियाँ;Sundarban Wetland|सुंदरबन आर्द्रभूमि',
    'chandigarh':'Sukhna Wetland|सुखना आर्द्रभूमि',
    'jammu-kashmir':'Wular Lake|वुलर झील;Surinsar-Mansar Lakes|सुरिनसर-मानसर झीलें;Hokera Wetland|होकरा आर्द्रभूमि;Hygam Wetland Conservation Reserve|हाइगम आर्द्रभूमि संरक्षण रिजर्व;Shallbugh Wetland Conservation Reserve|शालबुग आर्द्रभूमि संरक्षण रिजर्व',
    'ladakh':'Tsomoriri|त्सो मोरीरी;Tso Kar Wetland Complex|त्सो कार आर्द्रभूमि परिसर'
  };
  for(const p of profiles) p.ramsar=(ramsar[p.id]||'').split(';').filter(Boolean).map(item=>{const [name,hi]=item.split('|');return {name,hi};});
  window.MAPPING_STATE_NOTES = {
    reviewed:'2026-11-05',ramsarAsOf:'2026-10-25',profiles,
    categories:[
      {id:'overview',en:'State at a glance',hi:'राज्य एक नज़र में',icon:'⌂',colour:'#c19236',source:'profiles'},
      {id:'rivers',en:'Rivers & tributaries',hi:'नदियाँ और सहायक नदियाँ',icon:'≈',colour:'#258fba',source:'rivers'},
      {id:'water',en:'Lakes, dams & waterfalls',hi:'झीलें, बाँध और जलप्रपात',icon:'◌',colour:'#3c9eaa',source:'profiles'},
      {id:'ramsar',en:'Ramsar wetlands',hi:'रामसर आर्द्रभूमियाँ',icon:'❋',colour:'#77a86a',source:'ramsar'},
      {id:'parks',en:'National parks & wildlife',hi:'राष्ट्रीय उद्यान और वन्यजीव',icon:'♧',colour:'#58a17f',source:'parks'},
      {id:'minerals',en:'Minerals & energy',hi:'खनिज और ऊर्जा',icon:'◆',colour:'#a184cb',source:'minerals'},
      {id:'terrain',en:'Relief, soils & climate',hi:'उच्चावच, मृदा और जलवायु',icon:'△',colour:'#be916b',source:'profiles'},
      {id:'economy',en:'Crops, industry & heritage',hi:'फसलें, उद्योग और विरासत',icon:'⚑',colour:'#d08493',source:'profiles'}
    ],
    sources:{
      profiles:{title:'Government of India — State / UT profiles',url:'https://knowindia.india.gov.in/states-uts/'},
      rivers:{title:'Central Water Commission — river basins',url:'https://cwc.gov.in/'},
      parks:{title:'Wildlife Institute of India — protected areas',url:'https://wii.gov.in/envis/envis_pa_network/index.htm'},
      minerals:{title:'Indian Bureau of Mines — Indian Minerals Yearbook',url:'https://ibm.gov.in/IBMPortal/pages/Indian_Minerals_Yearbook'},
      ramsar:{title:'PIB — state-wise Ramsar list, 25 October 2026',url:'https://www.pib.gov.in/PressNoteDetails.aspx?ModuleId=3&NoteId=160558&lang=2&reg=48'},
      assam:{title:'Government of Assam — Economic Survey 2025–26',url:'https://des.assam.gov.in/sites/default/files/swf_utility_folder/departments/ecostat_medhassu_in_oid_3/menu/document/economic_survey_assam_2025-26.pdf'},
      capital:{title:'Andaman and Nicobar Administration — UT profile',url:'https://andamannicobar.gov.in/about'}
    }
  };
})();
