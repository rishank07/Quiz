from __future__ import annotations

import html
import json
import os
import re
from pathlib import Path

ROOT = Path(os.environ.get("GITHUB_WORKSPACE", Path(__file__).resolve().parents[1] / "ExamFusionRepo"))
TOPIC = ROOT / "Current Affairs/Topic Names/2026/Topic Wise/SCIENCETECH2026.html"
RAPID = ROOT / "Current Affairs/Topic Names/Rapid Practice/2026/Topic Wise/Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html"
RAPID_HUB = ROOT / "Current Affairs/Topic Names/Rapid Practice.html"
CA_INDEX = ROOT / "Current Affairs/Topic Names/search-index.js"
CA_SNIPPETS = ROOT / "search-snippets-current-affairs.js"
RAPID_SNIPPETS = ROOT / "search-snippets-current-affairs-rapid.js"
SERVICE_WORKER = ROOT / "service-worker.js"

TOPIC_PATH = "./Topic Names/2026/Topic Wise/SCIENCETECH2026.html"
TOPIC_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/2026/Topic%20Wise/SCIENCETECH2026.html"
RAPID_GLOBAL_PATH = "./Current%20Affairs/Topic%20Names/Rapid%20Practice/2026/Topic%20Wise/Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html"


def bullet(hi_label: str, hi_text: str, hi_mark: str, en_label: str, en_text: str, en_mark: str):
    assert hi_mark in hi_text, (hi_mark, hi_text)
    assert en_mark in en_text, (en_mark, en_text)
    return {
        "hi": (hi_label, hi_text, hi_mark),
        "en": (en_label, en_text, en_mark),
    }


MAIN = [
    {
        "qen": "The I-2SEA undersea cable will connect which three countries?",
        "qhi": "I-2SEA अंडरसी केबल किन तीन देशों को जोड़ेगी?",
        "opts": [("India, Sri Lanka and Singapore", "भारत, श्रीलंका एवं सिंगापुर"), ("India, Thailand and Indonesia", "भारत, थाईलैंड एवं इंडोनेशिया"), ("India, UAE and Singapore", "भारत, यूएई एवं सिंगापुर"), ("India, Malaysia and Singapore", "भारत, मलेशिया एवं सिंगापुर")],
        "correct": 3,
        "bullets": [
            bullet("पूरा नाम", "I-2SEA का आधिकारिक विस्तार India-Southeast Asia Submarine Cable System है।", "India-Southeast Asia", "Full form", "I-2SEA officially expands to the India-Southeast Asia Submarine Cable System.", "India-Southeast Asia"),
            bullet("मार्ग", "लगभग 3,600 किमी लंबी केबल भारत, मलेशिया एवं सिंगापुर को जोड़ेगी।", "भारत, मलेशिया एवं सिंगापुर", "Route", "The roughly 3,600-km cable will connect India, Malaysia and Singapore.", "India, Malaysia and Singapore"),
            bullet("कंसोर्टियम", "मुख्य भागीदार Lightstorm, Microsoft, Singtel और Tata Communications हैं।", "Lightstorm, Microsoft, Singtel और Tata Communications", "Consortium", "The principal partners are Lightstorm, Microsoft, Singtel and Tata Communications.", "Lightstorm, Microsoft, Singtel and Tata Communications"),
            bullet("समय-सीमा", "केबल का Ready-for-Service लक्ष्य 2029 की चौथी तिमाही है।", "2029 की चौथी तिमाही", "Timeline", "The cable is targeted to be ready for service in Q4 2029.", "Q4 2029"),
        ],
    },
    {
        "qen": "Which three countries signed the Makkah Joint Defence Agreement (MJDA)?",
        "qhi": "मक्का संयुक्त रक्षा समझौते (MJDA) पर किन तीन देशों ने हस्ताक्षर किए?",
        "opts": [("Saudi Arabia, Iran and Pakistan", "सऊदी अरब, ईरान एवं पाकिस्तान"), ("Saudi Arabia, Türkiye and Pakistan", "सऊदी अरब, तुर्किये एवं पाकिस्तान"), ("Türkiye, Qatar and Pakistan", "तुर्किये, कतर एवं पाकिस्तान"), ("Saudi Arabia, UAE and Türkiye", "सऊदी अरब, यूएई एवं तुर्किये")],
        "correct": 1,
        "bullets": [
            bullet("हस्ताक्षर", "समझौते पर 7 अगस्त 2026 को मक्का, सऊदी अरब में हस्ताक्षर हुए।", "7 अगस्त 2026", "Signing", "The agreement was signed in Makkah, Saudi Arabia, on 7 August 2026.", "7 August 2026"),
            bullet("मुख्य प्रावधान", "किसी एक देश पर सशस्त्र हमला तीनों देशों पर हमला माना जाएगा।", "तीनों देशों पर हमला", "Core provision", "An armed attack against any one member is to be regarded as an attack against all three.", "attack against all three"),
        ],
    },
    {
        "qen": "India signed a deal to buy Javelin anti-tank guided missile systems from which country?",
        "qhi": "भारत ने जैवलिन एंटी-टैंक गाइडेड मिसाइल सिस्टम किस देश से खरीदने का समझौता किया?",
        "opts": [("United States", "संयुक्त राज्य अमेरिका"), ("United Kingdom", "यूनाइटेड किंगडम"), ("France", "फ्रांस"), ("Israel", "इज़राइल")],
        "correct": 0,
        "bullets": [
            bullet("प्रणाली", "Javelin एक man-portable, shoulder-launched, fire-and-forget एंटी-टैंक गाइडेड मिसाइल सिस्टम है।", "fire-and-forget", "System", "Javelin is a man-portable, shoulder-launched, fire-and-forget anti-tank guided missile system.", "fire-and-forget"),
            bullet("सत्यापित स्थिति", "भारतीय सेना ने अगस्त 2026 में अमेरिकी Foreign Military Sales प्रक्रिया के तहत Letter of Offer and Acceptance पर हस्ताक्षर किए।", "Letter of Offer and Acceptance", "Verified status", "The Indian Army signed a Letter of Offer and Acceptance under the U.S. Foreign Military Sales process in August 2026.", "Letter of Offer and Acceptance"),
            bullet("मात्रा पर स्पष्टता", "नवीनतम समझौते की मात्रा आधिकारिक रूप से सार्वजनिक नहीं हुई; 60 मिसाइल का आंकड़ा मीडिया रिपोर्टों पर आधारित है।", "आधिकारिक रूप से सार्वजनिक नहीं", "Quantity clarification", "The latest agreement's quantity was not officially disclosed; the figure of 60 missiles comes from media reports.", "not officially disclosed"),
        ],
    },
    {
        "qen": "Which long-term framework did India and New Zealand launch in July 2026?",
        "qhi": "भारत और न्यूज़ीलैंड ने जुलाई 2026 में कौन-सा दीर्घकालिक ढांचा शुरू किया?",
        "opts": [("Vision 2040", "विज़न 2040"), ("Strategic Partnership: Roadmap to 2030", "रणनीतिक साझेदारी: रोडमैप टू 2030"), ("Indo-Pacific Growth Plan 2035", "इंडो-पैसिफिक ग्रोथ प्लान 2035"), ("Auckland Cooperation Agenda 2032", "ऑकलैंड सहयोग एजेंडा 2032")],
        "correct": 1,
        "bullets": [
            bullet("घोषणा", "प्रधानमंत्रियों ने 11 जुलाई 2026 को ऑकलैंड में India-New Zealand Strategic Partnership: Roadmap to 2030 का समर्थन किया।", "Roadmap to 2030", "Announcement", "The Prime Ministers endorsed the India-New Zealand Strategic Partnership: Roadmap to 2030 in Auckland on 11 July 2026.", "Roadmap to 2030"),
            bullet("व्यापार लक्ष्य", "2030 तक द्विपक्षीय वस्तु एवं सेवा व्यापार को NZ$7 अरब तक दोगुना करने का आकांक्षी लक्ष्य रखा गया।", "NZ$7 अरब", "Trade target", "The aspirational goal is to double two-way trade in goods and services to NZ$7 billion by 2030.", "NZ$7 billion"),
            bullet("समझौते", "यात्रा के दौरान 10 समझौते/व्यवस्थाएँ घोषित या हस्ताक्षरित की गईं।", "10 समझौते", "Outcomes", "Ten agreements and arrangements were signed or announced during the visit.", "Ten agreements"),
        ],
    },
    {
        "qen": "India signed an MoU to strengthen forest and wildlife cooperation with which country?",
        "qhi": "भारत ने वन एवं वन्यजीव सहयोग मजबूत करने के लिए किस देश के साथ समझौता ज्ञापन किया?",
        "opts": [("Bhutan", "भूटान"), ("Sri Lanka", "श्रीलंका"), ("Bangladesh", "बांग्लादेश"), ("Nepal", "नेपाल")],
        "correct": 3,
        "bullets": [
            bullet("समझौता", "भारत और नेपाल ने 25 फरवरी 2026 को वन, वन्यजीव, जैव विविधता एवं जलवायु परिवर्तन सहयोग के लिए MoU किया।", "25 फरवरी 2026", "Agreement", "India and Nepal signed the MoU on 25 February 2026 for cooperation on forests, wildlife, biodiversity and climate change.", "25 February 2026"),
            bullet("कॉरिडोर", "Khata Corridor नेपाल के Bardia National Park को भारत के Katarniaghat Wildlife Sanctuary से जोड़ता है।", "Bardia National Park", "Corridor", "The Khata Corridor links Nepal's Bardia National Park with India's Katarniaghat Wildlife Sanctuary.", "Bardia National Park"),
            bullet("लैंडस्केप", "Valmiki क्षेत्र नेपाल के Chitwan National Park एवं Parsa National Park से जुड़ा ट्रांस-बाउंड्री लैंडस्केप बनाता है।", "Chitwan National Park", "Landscape", "The Valmiki landscape connects with Nepal's Chitwan and Parsa national parks across the border.", "Chitwan"),
        ],
    },
    {
        "qen": "The RELOS logistics agreement has been operationalised between India and which country?",
        "qhi": "RELOS लॉजिस्टिक्स समझौता भारत और किस देश के बीच परिचालित हुआ?",
        "opts": [("United States", "संयुक्त राज्य अमेरिका"), ("France", "फ्रांस"), ("Russia", "रूस"), ("Japan", "जापान")],
        "correct": 2,
        "bullets": [
            bullet("पूरा नाम", "RELOS का अर्थ Reciprocal Exchange of Logistics Agreement है।", "Reciprocal Exchange of Logistics Agreement", "Full form", "RELOS stands for Reciprocal Exchange of Logistics Agreement.", "Reciprocal Exchange of Logistics Agreement"),
            bullet("कार्य", "यह भारत और रूस को एक-दूसरे की सैन्य सुविधाओं पर ईंधन, मरम्मत, रखरखाव एवं अन्य लॉजिस्टिक सहायता लेने देता है।", "लॉजिस्टिक सहायता", "Function", "It enables India and Russia to obtain refuelling, repair, maintenance and other logistics support at each other's military facilities.", "logistics support"),
        ],
    },
    {
        "qen": "Prime Minister Modi's visit on 15 May 2026 produced seven listed outcomes with which country?",
        "qhi": "15 मई 2026 को प्रधानमंत्री मोदी की यात्रा में किस देश के साथ सात प्रमुख परिणाम सूचीबद्ध किए गए?",
        "opts": [("Saudi Arabia", "सऊदी अरब"), ("United Arab Emirates", "संयुक्त अरब अमीरात"), ("Qatar", "कतर"), ("Oman", "ओमान")],
        "correct": 1,
        "bullets": [
            bullet("परिणाम", "भारत-UAE परिणाम सूची में ऊर्जा, रक्षा, जहाज मरम्मत, कौशल एवं सुपरकंप्यूटिंग सहित 7 बिंदु थे।", "7 बिंदु", "Outcomes", "The India-UAE outcomes list contained seven items spanning energy, defence, ship repair, skills and supercomputing.", "seven items"),
            bullet("निवेश", "तीन घोषणाओं का कुल UAE निवेश US$5 अरब था: ADIA-US$1 अरब, Emirates NBD-US$3 अरब और IHC-US$1 अरब।", "US$5 अरब", "Investment", "The three UAE investment announcements totalled US$5 billion: ADIA-US$1 billion, Emirates NBD-US$3 billion and IHC-US$1 billion.", "US$5 billion"),
            bullet("AI अवसंरचना", "CDAC और UAE की G42 के बीच 8-exaflop supercomputing cluster की term sheet भी परिणामों में शामिल थी।", "8-exaflop", "AI infrastructure", "The outcomes also included a term sheet for an 8-exaflop supercomputing cluster involving CDAC and UAE-based G42.", "8-exaflop"),
        ],
    },
    {
        "qen": "India's first Telecom Manufacturing Zone is to be established in which city?",
        "qhi": "भारत का पहला दूरसंचार विनिर्माण क्षेत्र किस शहर में स्थापित किया जाएगा?",
        "opts": [("Indore", "इंदौर"), ("Bhopal", "भोपाल"), ("Jabalpur", "जबलपुर"), ("Gwalior", "ग्वालियर")],
        "correct": 3,
        "bullets": [
            bullet("स्थान", "Telecom Manufacturing Zone (Phase-I) ग्वालियर, मध्य प्रदेश में स्थापित होगा।", "ग्वालियर", "Location", "The Telecom Manufacturing Zone (Phase-I) will be established at Gwalior, Madhya Pradesh.", "Gwalior"),
            bullet("समझौता", "MoU दूरसंचार विभाग (DoT) और मध्य प्रदेश सरकार के बीच हुआ।", "DoT", "Agreement", "The MoU was signed between the Department of Telecommunications (DoT) and the Government of Madhya Pradesh.", "DoT"),
            bullet("उद्देश्य", "यह दूरसंचार उपकरण, डेटा सेंटर और चिप विनिर्माण के लिए समर्पित इकोसिस्टम विकसित करेगा।", "दूरसंचार उपकरण", "Purpose", "It is designed as a dedicated ecosystem for telecom equipment, data centres and chip manufacturing.", "telecom equipment"),
        ],
    },
    {
        "qen": "Which institution will host India's first Centre of Design Excellence in Nuclear Engineering (CODENE)?",
        "qhi": "भारत का पहला सेंटर ऑफ डिजाइन एक्सीलेंस इन न्यूक्लियर इंजीनियरिंग (CODENE) किस संस्थान में स्थापित होगा?",
        "opts": [("IIT Bombay", "आईआईटी बॉम्बे"), ("IIT Hyderabad", "आईआईटी हैदराबाद"), ("IIT Madras", "आईआईटी मद्रास"), ("IIT Kanpur", "आईआईटी कानपुर")],
        "correct": 1,
        "bullets": [
            bullet("केंद्र", "CODENE का पूरा नाम Centre of Design Excellence in Nuclear Engineering है।", "Centre of Design Excellence in Nuclear Engineering", "Centre", "CODENE expands to Centre of Design Excellence in Nuclear Engineering.", "Centre of Design Excellence in Nuclear Engineering"),
            bullet("भागीदार", "त्रिपक्षीय MoU IIT Hyderabad, CEEPL India और Dassault Systèmes के बीच है।", "IIT Hyderabad, CEEPL India और Dassault Systèmes", "Partners", "The tripartite MoU brings together IIT Hyderabad, CEEPL India and Dassault Systèmes.", "IIT Hyderabad, CEEPL India and Dassault Systèmes"),
        ],
    },
    {
        "qen": "India launched the Critical Minerals Global Supply Chain Observatory with which country?",
        "qhi": "भारत ने क्रिटिकल मिनरल्स ग्लोबल सप्लाई चेन ऑब्ज़र्वेटरी किस देश के साथ शुरू की?",
        "opts": [("France", "फ्रांस"), ("Japan", "जापान"), ("United Kingdom", "यूनाइटेड किंगडम"), ("Australia", "ऑस्ट्रेलिया")],
        "correct": 2,
        "bullets": [
            bullet("नाम", "India-UK Critical Minerals Global Supply Chain Observatory (GSCO) जून 2026 में शुरू हुई।", "India-UK", "Name", "The India-UK Critical Minerals Global Supply Chain Observatory (GSCO) was launched in June 2026.", "India-UK"),
            bullet("संस्थान", "डेटा प्लेटफॉर्म सहयोग TEXMiN at IIT (ISM) Dhanbad और University of Cambridge से जुड़ा है।", "IIT (ISM) Dhanbad", "Institutions", "The data-platform collaboration involves TEXMiN at IIT (ISM) Dhanbad and the University of Cambridge.", "IIT (ISM) Dhanbad"),
            bullet("उद्देश्य", "यह National Critical Mineral Mission के लिए सप्लाई-चेन इंटेलिजेंस एवं नीति निर्माण को मजबूत करता है।", "National Critical Mineral Mission", "Purpose", "It strengthens supply-chain intelligence and policymaking for the National Critical Mineral Mission.", "National Critical Mineral Mission"),
        ],
    },
    {
        "qen": "India launched a joint ₹169-crore initiative for EV battery recycling with which organisation?",
        "qhi": "भारत ने EV बैटरी रीसाइक्लिंग के लिए ₹169 करोड़ की संयुक्त पहल किस संगठन के साथ शुरू की?",
        "opts": [("ASEAN", "आसियान"), ("European Union", "यूरोपीय संघ"), ("BRICS", "ब्रिक्स"), ("OECD", "ओईसीडी")],
        "correct": 1,
        "bullets": [
            bullet("सही राशि", "संयुक्त वित्तपोषण €15.2 मिलियन, लगभग ₹169 करोड़ है; PDF में दिया €18 मिलियन सही नहीं है।", "€15.2 मिलियन", "Correct amount", "The joint funding is €15.2 million, approximately ₹169 crore; the PDF's €18 million figure is incorrect.", "€15.2 million"),
            bullet("ढांचा", "पहल India-EU Trade and Technology Council के Working Group 2: Green and Clean Energy Technologies के तहत है।", "Working Group 2", "Framework", "The initiative sits under Working Group 2 on Green and Clean Energy Technologies of the India-EU Trade and Technology Council.", "Working Group 2"),
            bullet("फोकस", "यह उच्च-दक्षता सामग्री रिकवरी, सुरक्षित संग्रह और EV बैटरी रीसाइक्लिंग तकनीकों पर केंद्रित है।", "EV बैटरी रीसाइक्लिंग", "Focus", "It focuses on high-efficiency material recovery, safe collection and EV-battery recycling technologies.", "EV-battery recycling"),
        ],
    },
    {
        "qen": "Where was the Indo-French Centre for AI in Health (IF-CAIH) inaugurated?",
        "qhi": "इंडो-फ्रेंच सेंटर फॉर AI इन हेल्थ (IF-CAIH) का उद्घाटन कहाँ हुआ?",
        "opts": [("AIIMS New Delhi", "एम्स नई दिल्ली"), ("IIT Delhi", "आईआईटी दिल्ली"), ("PGIMER Chandigarh", "पीजीआईएमईआर चंडीगढ़"), ("NIMHANS Bengaluru", "निम्हांस बेंगलुरु")],
        "correct": 0,
        "bullets": [
            bullet("उद्घाटन", "18 फरवरी 2026 को फ्रांस के राष्ट्रपति Emmanuel Macron और केंद्रीय स्वास्थ्य मंत्री J. P. Nadda की उपस्थिति में उद्घाटन हुआ।", "18 फरवरी 2026", "Inauguration", "It was inaugurated on 18 February 2026 in the presence of French President Emmanuel Macron and Union Health Minister J. P. Nadda.", "18 February 2026"),
            bullet("सहयोग", "केंद्र AIIMS New Delhi, Sorbonne University और Paris Brain Institute का सहयोग है।", "AIIMS New Delhi", "Collaboration", "The centre is a collaboration among AIIMS New Delhi, Sorbonne University and the Paris Brain Institute.", "AIIMS New Delhi"),
        ],
    },
    {
        "qen": "Which state partnered with Starlink India for satellite internet connectivity?",
        "qhi": "किस राज्य ने सैटेलाइट इंटरनेट कनेक्टिविटी के लिए Starlink India के साथ साझेदारी की?",
        "opts": [("Meghalaya", "मेघालय"), ("Assam", "असम"), ("Sikkim", "सिक्किम"), ("Nagaland", "नागालैंड")],
        "correct": 0,
        "bullets": [
            bullet("समझौता", "मेघालय सरकार और Starlink India ने 1 अप्रैल 2026 को सहयोग समझौता किया।", "1 अप्रैल 2026", "Agreement", "The Government of Meghalaya and Starlink India entered into the collaboration on 1 April 2026.", "1 April 2026"),
            bullet("उद्देश्य", "सैटेलाइट-आधारित हाई-स्पीड इंटरनेट से दूरस्थ एवं ग्रामीण क्षेत्रों की कनेक्टिविटी बढ़ाना इसका लक्ष्य है।", "दूरस्थ एवं ग्रामीण क्षेत्रों", "Purpose", "It aims to expand satellite-based high-speed internet connectivity in remote and rural areas.", "remote and rural areas"),
        ],
    },
    {
        "qen": "The Ministry of Tourism signed an MoU with which company to promote Indian tourism digitally?",
        "qhi": "भारत के पर्यटन का डिजिटल प्रचार करने के लिए पर्यटन मंत्रालय ने किस कंपनी के साथ MoU किया?",
        "opts": [("Microsoft India", "माइक्रोसॉफ्ट इंडिया"), ("Google India", "गूगल इंडिया"), ("Meta India", "मेटा इंडिया"), ("Infosys", "इन्फोसिस")],
        "correct": 1,
        "bullets": [
            bullet("उद्देश्य", "MoU का लक्ष्य डिजिटल तकनीक, AI और डेटा एनालिटिक्स के माध्यम से भारतीय पर्यटन का प्रचार मजबूत करना है।", "AI और डेटा एनालिटिक्स", "Purpose", "The MoU seeks to strengthen promotion of Indian tourism through digital technologies, AI and data analytics.", "AI and data analytics"),
        ],
    },
    {
        "qen": "The Supreme Court of India signed a law-clerks exchange MoU with the apex court of which country?",
        "qhi": "भारत के सर्वोच्च न्यायालय ने किस देश के शीर्ष न्यायालय के साथ लॉ क्लर्क एक्सचेंज MoU किया?",
        "opts": [("Nepal", "नेपाल"), ("Sri Lanka", "श्रीलंका"), ("Bangladesh", "बांग्लादेश"), ("Bhutan", "भूटान")],
        "correct": 3,
        "bullets": [
            bullet("कार्यक्रम", "MoU के तहत भूटान के दो लॉ क्लर्क तीन महीने के लिए भारत के सर्वोच्च न्यायालय में कार्य करेंगे।", "दो लॉ क्लर्क", "Programme", "Under the MoU, two Bhutanese law clerks will work at the Supreme Court of India for three months.", "two Bhutanese law clerks"),
            bullet("घोषणा", "इस न्यायिक विनिमय की घोषणा भारत के मुख्य न्यायाधीश Surya Kant ने की।", "Surya Kant", "Announcement", "Chief Justice of India Surya Kant announced the judicial exchange arrangement.", "Surya Kant"),
        ],
    },
    {
        "qen": "The 'SESEL' Joint Vision was announced between India and which country?",
        "qhi": "'SESEL' संयुक्त विज़न भारत और किस देश के बीच घोषित हुआ?",
        "opts": [("Mauritius", "मॉरीशस"), ("Maldives", "मालदीव"), ("Seychelles", "सेशेल्स"), ("Sri Lanka", "श्रीलंका")],
        "correct": 2,
        "bullets": [
            bullet("पूरा नाम", "SESEL का विस्तार Sustainability, Economic Growth and Security through Enhanced Linkages है।", "Sustainability, Economic Growth and Security through Enhanced Linkages", "Full form", "SESEL expands to Sustainability, Economic Growth and Security through Enhanced Linkages.", "Sustainability, Economic Growth and Security through Enhanced Linkages"),
            bullet("स्वीकृति", "India-Seychelles Joint Vision को 9 फरवरी 2026 को अपनाया गया।", "9 फरवरी 2026", "Adoption", "The India-Seychelles Joint Vision was adopted on 9 February 2026.", "9 February 2026"),
        ],
    },
    {
        "qen": "The Ministry of Minority Affairs signed an MoU with which IIT under PM VIKAS?",
        "qhi": "अल्पसंख्यक कार्य मंत्रालय ने PM VIKAS के तहत किस IIT के साथ MoU किया?",
        "opts": [("IIT Delhi", "आईआईटी दिल्ली"), ("IIT Bombay", "आईआईटी बॉम्बे"), ("IIT Patna", "आईआईटी पटना"), ("IIT Kanpur", "आईआईटी कानपुर")],
        "correct": 2,
        "bullets": [
            bullet("प्रशिक्षण", "IIT Patna बिहार के 600 अल्पसंख्यक युवाओं को प्रशिक्षित करेगा।", "600 अल्पसंख्यक युवाओं", "Training", "IIT Patna will train 600 minority youth from Bihar.", "600 minority youth"),
            bullet("जॉब रोल", "प्रशिक्षण AI Technocrat और Business Analytics Executive जैसे उभरते जॉब रोल में होगा।", "AI Technocrat", "Job roles", "Training will cover emerging roles such as AI Technocrat and Business Analytics Executive.", "AI Technocrat"),
        ],
    },
    {
        "qen": "Which companies announced a venture to build India's largest gigawatt-scale AI factory infrastructure?",
        "qhi": "भारत की सबसे बड़ी गीगावॉट-स्केल AI फैक्ट्री अवसंरचना बनाने की पहल किन कंपनियों ने घोषित की?",
        "opts": [("TCS and Google", "टीसीएस एवं गूगल"), ("Larsen & Toubro and NVIDIA", "लार्सन एंड टुब्रो एवं NVIDIA"), ("Infosys and Microsoft", "इन्फोसिस एवं माइक्रोसॉफ्ट"), ("Reliance and Amazon", "रिलायंस एवं अमेज़न")],
        "correct": 1,
        "bullets": [
            bullet("घोषणा", "L&T ने NVIDIA के साथ 18 फरवरी 2026 को proposed venture की घोषणा की।", "L&T ने NVIDIA", "Announcement", "L&T announced the proposed venture with NVIDIA on 18 February 2026.", "L&T announced"),
            bullet("सही वर्णन", "आधिकारिक वर्णन India's largest gigawatt-scale AI factory है; PDF का 'first' दावा आधिकारिक wording नहीं है।", "largest", "Correct description", "The official description is India's largest gigawatt-scale AI factory; 'first' is not the official wording.", "largest"),
            bullet("मिशन", "यह sovereign एवं scalable AI infrastructure पहल IndiaAI Mission के अनुरूप है।", "IndiaAI Mission", "Mission", "The sovereign, scalable AI-infrastructure initiative aligns with the IndiaAI Mission.", "IndiaAI Mission"),
        ],
    },
    {
        "qen": "Which country expressed interest in a strategic partnership with Telangana around Bharat Future City?",
        "qhi": "भारत फ्यूचर सिटी के संबंध में तेलंगाना के साथ रणनीतिक साझेदारी में किस देश ने रुचि दिखाई?",
        "opts": [("Japan", "जापान"), ("United Arab Emirates", "संयुक्त अरब अमीरात"), ("France", "फ्रांस"), ("Singapore", "सिंगापुर")],
        "correct": 1,
        "bullets": [
            bullet("सत्यापित wording", "जनवरी 2026 में UAE सरकार ने तेलंगाना के साथ strategic partnership में रुचि व्यक्त की; औपचारिक development partnership signed होने का दावा नहीं करना चाहिए।", "रुचि व्यक्त की", "Verified wording", "In January 2026, the UAE government expressed interest in a strategic partnership with Telangana; this should not be overstated as a signed development partnership.", "expressed interest"),
            bullet("शहर", "Bharat Future City को भारत की पहली net-zero greenfield smart city के रूप में विकसित किया जा रहा है।", "पहली net-zero greenfield smart city", "City", "Bharat Future City is being developed as India's first net-zero greenfield smart city.", "first net-zero greenfield smart city"),
        ],
    },
]


def mark(text: str, important: str) -> str:
    before, after = text.split(important, 1)
    return html.escape(before) + "<span class='highlight-text'>" + html.escape(important) + "</span>" + html.escape(after)


def question_html(number: int, item: dict) -> str:
    options = []
    for index, (en, hi) in enumerate(item["opts"]):
        cls = "option correct-option" if index == item["correct"] else "option"
        suffix = " (सही उत्तर ✔)" if index == item["correct"] else ""
        letter = chr(65 + index)
        options.append(
            f'            <li class="{cls}"><span class="opt-en">{letter}. {html.escape(en)}</span>'
            f'<span class="opt-hi">{letter}. {html.escape(hi)}{suffix}</span></li>'
        )
    hi_bullets = []
    en_bullets = []
    for row in item["bullets"]:
        hi_label, hi_text, hi_mark = row["hi"]
        en_label, en_text, en_mark = row["en"]
        hi_bullets.append(f"<li><b>{html.escape(hi_label)}:</b> {mark(hi_text, hi_mark)}</li>")
        en_bullets.append(f"<li><b>{html.escape(en_label)}:</b> {mark(en_text, en_mark)}</li>")
    return f'''\n\n    <!-- QUESTION {number}: VERIFIED MoUs & Technology Partnerships -->
    <main class="question-card" id="q{number}">
        <div class="question-text">Q{number}. {html.escape(item['qhi'])}<span>{html.escape(item['qen'])}</span></div>
        <ul class="options">
{chr(10).join(options)}
        </ul>
        <div class="explanation-box">
            <div class="lang-section">
                <h4>📝 स्पष्टीकरण (Hindi)</h4>
                <ul>
                    {chr(10).join(hi_bullets)}
                </ul>
            </div>
            <div class="lang-section">
                <h4>📝 Explanation (English)</h4>
                <ul>
                    {chr(10).join(en_bullets)}
                </ul>
            </div>
        </div>
    </main>'''


def rapid_question(item: dict) -> dict:
    opts = [{"en": en, "hi": hi} for en, hi in item["opts"]]
    answer = opts[item["correct"]]
    en_facts = " ".join(row["en"][1] for row in item["bullets"])
    hi_facts = " ".join(row["hi"][1] for row in item["bullets"])
    return {
        "q": {"en": item["qen"], "hi": item["qhi"]},
        "o": opts,
        "a": answer,
        "exp": {
            "en": f"Answer: {answer['en']}. {en_facts}",
            "hi": f"उत्तर: {answer['hi']}। {hi_facts}",
        },
    }


DRILLS = []


def add_drill(qen: str, qhi: str, answer: tuple[str, str], distractors: list[tuple[str, str]], explanation: tuple[str, str] | None = None):
    assert len(distractors) == 3
    insert_at = len(DRILLS) % 4
    options = list(distractors)
    options.insert(insert_at, answer)
    assert len({x[0] for x in options}) == 4
    exp_en, exp_hi = explanation or (f"Verified fact: {answer[0]}.", f"सत्यापित तथ्य: {answer[1]}।")
    DRILLS.append({
        "q": {"en": qen, "hi": qhi},
        "o": [{"en": en, "hi": hi} for en, hi in options],
        "a": {"en": answer[0], "hi": answer[1]},
        "exp": {"en": exp_en, "hi": exp_hi},
    })


add_drill("What does I-2SEA officially stand for?", "I-2SEA का आधिकारिक विस्तार क्या है?", ("India-Southeast Asia", "इंडिया-साउथईस्ट एशिया"), [("India-International Subsea Express Asia", "इंडिया-इंटरनेशनल सबसी एक्सप्रेस एशिया"), ("Indian Ocean-South Europe Asia", "इंडियन ओशन-साउथ यूरोप एशिया"), ("Integrated Indo-Singapore Exchange Axis", "इंटीग्रेटेड इंडो-सिंगापुर एक्सचेंज एक्सिस")])
add_drill("What is the approximate length of the I-2SEA submarine cable?", "I-2SEA समुद्री केबल की अनुमानित लंबाई कितनी है?", ("3,600 km", "3,600 किमी"), [("1,800 km", "1,800 किमी"), ("2,300 km", "2,300 किमी"), ("5,200 km", "5,200 किमी")])
add_drill("Which set correctly lists the principal I-2SEA consortium partners?", "I-2SEA के मुख्य कंसोर्टियम भागीदारों का सही समूह कौन-सा है?", ("Lightstorm, Microsoft, Singtel and Tata Communications", "Lightstorm, Microsoft, Singtel एवं Tata Communications"), [("Google, Airtel, NEC and Meta", "Google, Airtel, NEC एवं Meta"), ("Amazon, Jio, Nokia and Orange", "Amazon, Jio, Nokia एवं Orange"), ("SpaceX, BSNL, Apple and Telstra", "SpaceX, BSNL, Apple एवं Telstra")])
add_drill("When is I-2SEA targeted to be ready for service?", "I-2SEA का Ready-for-Service लक्ष्य कब है?", ("Q4 2029", "2029 की चौथी तिमाही"), [("Q1 2027", "2027 की पहली तिमाही"), ("Q2 2028", "2028 की दूसरी तिमाही"), ("Q4 2031", "2031 की चौथी तिमाही")])
add_drill("When was the Makkah Joint Defence Agreement signed?", "मक्का संयुक्त रक्षा समझौते पर कब हस्ताक्षर हुए?", ("7 August 2026", "7 अगस्त 2026"), [("5 January 2026", "5 जनवरी 2026"), ("18 February 2026", "18 फरवरी 2026"), ("11 July 2026", "11 जुलाई 2026")])
add_drill("What is the core mutual-defence provision of the Makkah agreement?", "मक्का समझौते का मुख्य सामूहिक रक्षा प्रावधान क्या है?", ("An armed attack on one is treated as an attack on all three", "एक पर सशस्त्र हमला तीनों पर हमला माना जाएगा"), [("Only naval attacks are covered", "केवल नौसैनिक हमले शामिल हैं"), ("It applies only to UN missions", "यह केवल UN मिशनों पर लागू है"), ("It creates a common currency", "यह साझा मुद्रा बनाता है")])
add_drill("Which description best fits the Javelin missile system?", "Javelin मिसाइल सिस्टम का सही वर्णन कौन-सा है?", ("Man-portable, shoulder-launched, fire-and-forget ATGM", "मैन-पोर्टेबल, शोल्डर-लॉन्च्ड, फायर-एंड-फॉरगेट ATGM"), [("Ship-launched ballistic missile", "जहाज से छोड़ी जाने वाली बैलिस्टिक मिसाइल"), ("Air-to-air cruise missile", "एयर-टू-एयर क्रूज़ मिसाइल"), ("Submarine-launched torpedo", "पनडुब्बी से छोड़ा जाने वाला टॉरपीडो")])
add_drill("What did the 2025 U.S. notification describe as the maximum proposed Javelin package for India?", "2025 की अमेरिकी अधिसूचना में भारत के लिए अधिकतम प्रस्तावित Javelin पैकेज क्या था?", ("100 rounds, one fly-to-buy missile and 25 launch units", "100 राउंड, एक fly-to-buy मिसाइल एवं 25 लॉन्च यूनिट"), [("60 rounds and 60 launch units", "60 राउंड एवं 60 लॉन्च यूनिट"), ("200 rounds and 50 launch units", "200 राउंड एवं 50 लॉन्च यूनिट"), ("25 rounds and 100 launch units", "25 राउंड एवं 100 लॉन्च यूनिट")], ("The official 2025 U.S. notification described a maximum proposed package; the later Indian Army agreement did not publicly disclose its quantity.", "आधिकारिक 2025 अमेरिकी अधिसूचना में अधिकतम प्रस्तावित पैकेज था; बाद के भारतीय सेना समझौते की मात्रा सार्वजनिक नहीं की गई।"))
add_drill("Where was the India-New Zealand Roadmap to 2030 announced?", "भारत-न्यूज़ीलैंड रोडमैप टू 2030 कहाँ घोषित हुआ?", ("Auckland", "ऑकलैंड"), [("Wellington", "वेलिंगटन"), ("New Delhi", "नई दिल्ली"), ("Christchurch", "क्राइस्टचर्च")])
add_drill("What is the India-New Zealand aspirational two-way trade target for 2030?", "2030 के लिए भारत-न्यूज़ीलैंड का आकांक्षी द्विपक्षीय व्यापार लक्ष्य क्या है?", ("NZ$7 billion", "NZ$7 अरब"), [("NZ$3 billion", "NZ$3 अरब"), ("NZ$10 billion", "NZ$10 अरब"), ("NZ$15 billion", "NZ$15 अरब")])
add_drill("How many agreements and arrangements accompanied the July 2026 India-New Zealand visit?", "जुलाई 2026 की भारत-न्यूज़ीलैंड यात्रा के साथ कितने समझौते/व्यवस्थाएँ हुईं?", ("10", "10"), [("5", "5"), ("7", "7"), ("12", "12")])
add_drill("On which date did India and Nepal sign the 2026 forest and wildlife cooperation MoU?", "भारत और नेपाल ने 2026 का वन एवं वन्यजीव सहयोग MoU किस तारीख को किया?", ("25 February 2026", "25 फरवरी 2026"), [("9 February 2026", "9 फरवरी 2026"), ("20 April 2026", "20 अप्रैल 2026"), ("30 June 2026", "30 जून 2026")])
add_drill("The Khata Corridor links which protected areas?", "Khata Corridor किन संरक्षित क्षेत्रों को जोड़ता है?", ("Bardia National Park and Katarniaghat Wildlife Sanctuary", "Bardia National Park एवं Katarniaghat Wildlife Sanctuary"), [("Chitwan and Kaziranga", "Chitwan एवं Kaziranga"), ("Parsa and Jim Corbett", "Parsa एवं Jim Corbett"), ("Sundarbans and Buxa", "Sundarbans एवं Buxa")])
add_drill("India's Valmiki landscape connects across the border with which Nepalese protected areas?", "भारत का Valmiki लैंडस्केप सीमा पार नेपाल के किन संरक्षित क्षेत्रों से जुड़ता है?", ("Chitwan and Parsa national parks", "Chitwan एवं Parsa राष्ट्रीय उद्यान"), [("Bardia and Banke", "Bardia एवं Banke"), ("Sagarmatha and Langtang", "Sagarmatha एवं Langtang"), ("Rara and Shey Phoksundo", "Rara एवं Shey Phoksundo")])
add_drill("What does RELOS stand for?", "RELOS का पूरा नाम क्या है?", ("Reciprocal Exchange of Logistics Agreement", "Reciprocal Exchange of Logistics Agreement"), [("Regional Exchange of Land Operations System", "Regional Exchange of Land Operations System"), ("Reciprocal Emergency Liaison and Operations Scheme", "Reciprocal Emergency Liaison and Operations Scheme"), ("Russian-Indian Equipment Leasing Organisation Standard", "Russian-Indian Equipment Leasing Organisation Standard")])
add_drill("What does India-Russia RELOS primarily facilitate?", "भारत-रूस RELOS मुख्यतः क्या सुविधा देता है?", ("Reciprocal military logistics support", "परस्पर सैन्य लॉजिस्टिक्स सहायता"), [("A common defence currency", "साझा रक्षा मुद्रा"), ("Joint citizenship", "संयुक्त नागरिकता"), ("Civil aviation ticketing", "नागरिक उड्डयन टिकटिंग")])
add_drill("What was the total of the three UAE investment announcements during PM Modi's May 2026 visit?", "मई 2026 की PM मोदी UAE यात्रा में तीन निवेश घोषणाओं का कुल कितना था?", ("US$5 billion", "US$5 अरब"), [("US$2 billion", "US$2 अरब"), ("US$7 billion", "US$7 अरब"), ("US$10 billion", "US$10 अरब")])
add_drill("The India-UAE outcomes included a term sheet for a supercomputing cluster of what scale?", "भारत-UAE परिणामों में किस क्षमता के सुपरकंप्यूटिंग क्लस्टर की term sheet थी?", ("8 exaflop", "8 एक्साफ्लॉप"), [("1 petaflop", "1 पेटाफ्लॉप"), ("2 exaflop", "2 एक्साफ्लॉप"), ("50 petaflop", "50 पेटाफ्लॉप")])
add_drill("Which parties signed the MoU for India's first Telecom Manufacturing Zone?", "भारत के पहले Telecom Manufacturing Zone के लिए MoU किन पक्षों ने किया?", ("DoT and Government of Madhya Pradesh", "DoT एवं मध्य प्रदेश सरकार"), [("MeitY and Government of Gujarat", "MeitY एवं गुजरात सरकार"), ("TRAI and Government of Karnataka", "TRAI एवं कर्नाटक सरकार"), ("BSNL and Government of Telangana", "BSNL एवं तेलंगाना सरकार")])
add_drill("What ecosystem is the Gwalior Telecom Manufacturing Zone intended to support?", "ग्वालियर Telecom Manufacturing Zone किस इकोसिस्टम को समर्थन देगा?", ("Telecom equipment, data centres and chip manufacturing", "टेलीकॉम उपकरण, डेटा सेंटर एवं चिप विनिर्माण"), [("Only mobile-phone retail", "केवल मोबाइल-फोन रिटेल"), ("Textile exports", "कपड़ा निर्यात"), ("Shipbuilding and ports", "जहाज निर्माण एवं बंदरगाह")])
add_drill("Which three partners signed the CODENE tripartite MoU?", "CODENE त्रिपक्षीय MoU के तीन भागीदार कौन हैं?", ("IIT Hyderabad, CEEPL India and Dassault Systèmes", "IIT Hyderabad, CEEPL India एवं Dassault Systèmes"), [("IIT Bombay, BHEL and Siemens", "IIT Bombay, BHEL एवं Siemens"), ("IIT Madras, NPCIL and Google", "IIT Madras, NPCIL एवं Google"), ("IIT Kanpur, DRDO and Airbus", "IIT Kanpur, DRDO एवं Airbus")])
add_drill("CODENE is a centre of design excellence in which field?", "CODENE किस क्षेत्र का Centre of Design Excellence है?", ("Nuclear Engineering", "न्यूक्लियर इंजीनियरिंग"), [("Marine Biology", "समुद्री जीवविज्ञान"), ("Quantum Finance", "क्वांटम फाइनेंस"), ("Agricultural Robotics", "कृषि रोबोटिक्स")])
add_drill("Which institutions are central to the India-UK Critical Minerals Observatory's data-platform collaboration?", "India-UK Critical Minerals Observatory के डेटा-प्लेटफॉर्म सहयोग में कौन-से संस्थान प्रमुख हैं?", ("TEXMiN at IIT (ISM) Dhanbad and University of Cambridge", "IIT (ISM) Dhanbad का TEXMiN एवं University of Cambridge"), [("IIT Delhi and Oxford University", "IIT Delhi एवं Oxford University"), ("IISc and Imperial College", "IISc एवं Imperial College"), ("IIT Bombay and University of Edinburgh", "IIT Bombay एवं University of Edinburgh")])
add_drill("The India-UK Critical Minerals Observatory supports which Indian mission?", "India-UK Critical Minerals Observatory भारत के किस मिशन को समर्थन देती है?", ("National Critical Mineral Mission", "राष्ट्रीय महत्वपूर्ण खनिज मिशन"), [("National Green Hydrogen Mission", "राष्ट्रीय हरित हाइड्रोजन मिशन"), ("Deep Ocean Mission", "डीप ओशन मिशन"), ("India Semiconductor Mission", "इंडिया सेमीकंडक्टर मिशन")])
add_drill("What is the correct euro value of the India-EU EV-battery recycling initiative?", "India-EU EV बैटरी रीसाइक्लिंग पहल की सही यूरो राशि कितनी है?", ("€15.2 million", "€15.2 मिलियन"), [("€18 million", "€18 मिलियन"), ("€10 million", "€10 मिलियन"), ("€25.2 million", "€25.2 मिलियन")])
add_drill("Under which framework was the India-EU EV-battery recycling initiative launched?", "India-EU EV बैटरी रीसाइक्लिंग पहल किस ढांचे के तहत शुरू हुई?", ("India-EU TTC Working Group 2", "India-EU TTC Working Group 2"), [("G20 Disaster Working Group", "G20 आपदा कार्य समूह"), ("BRICS Energy Bank", "BRICS ऊर्जा बैंक"), ("OECD Transport Forum", "OECD परिवहन मंच")])
add_drill("Which institutions collaborate in IF-CAIH?", "IF-CAIH में कौन-से संस्थान सहयोग करते हैं?", ("AIIMS New Delhi, Sorbonne University and Paris Brain Institute", "AIIMS New Delhi, Sorbonne University एवं Paris Brain Institute"), [("IIT Delhi, WHO and Oxford", "IIT Delhi, WHO एवं Oxford"), ("PGIMER, UNESCO and Cambridge", "PGIMER, UNESCO एवं Cambridge"), ("NIMHANS, CERN and MIT", "NIMHANS, CERN एवं MIT")])
add_drill("When was IF-CAIH inaugurated at AIIMS New Delhi?", "AIIMS New Delhi में IF-CAIH का उद्घाटन कब हुआ?", ("18 February 2026", "18 फरवरी 2026"), [("1 April 2026", "1 अप्रैल 2026"), ("4 June 2026", "4 जून 2026"), ("30 July 2026", "30 जुलाई 2026")])
add_drill("What is the main connectivity purpose of the Meghalaya-Starlink collaboration?", "मेघालय-Starlink सहयोग का मुख्य कनेक्टिविटी उद्देश्य क्या है?", ("Satellite-based high-speed internet for remote and rural areas", "दूरस्थ एवं ग्रामीण क्षेत्रों के लिए सैटेलाइट-आधारित हाई-स्पीड इंटरनेट"), [("Undersea cable manufacturing", "अंडरसी केबल विनिर्माण"), ("Only urban 6G testing", "केवल शहरी 6G परीक्षण"), ("Railway signalling", "रेलवे सिग्नलिंग")])
add_drill("Which technologies are highlighted in the Tourism Ministry-Google India MoU?", "पर्यटन मंत्रालय-Google India MoU में किन तकनीकों पर जोर है?", ("AI, digital technologies and data analytics", "AI, डिजिटल तकनीक एवं डेटा एनालिटिक्स"), [("Blockchain mining only", "केवल ब्लॉकचेन माइनिंग"), ("Nuclear imaging", "न्यूक्लियर इमेजिंग"), ("Satellite launch systems", "सैटेलाइट लॉन्च सिस्टम")])
add_drill("Under the India-Bhutan judicial MoU, how many Bhutanese law clerks serve for what period?", "भारत-भूटान न्यायिक MoU के तहत कितने भूटानी लॉ क्लर्क कितनी अवधि के लिए सेवा देंगे?", ("Two law clerks for three months", "दो लॉ क्लर्क, तीन महीने"), [("One clerk for one year", "एक क्लर्क, एक वर्ष"), ("Four clerks for six months", "चार क्लर्क, छह महीने"), ("Ten clerks for two weeks", "दस क्लर्क, दो सप्ताह")])
add_drill("What does SESEL stand for in the India-Seychelles Joint Vision?", "India-Seychelles Joint Vision में SESEL का विस्तार क्या है?", ("Sustainability, Economic Growth and Security through Enhanced Linkages", "Sustainability, Economic Growth and Security through Enhanced Linkages"), [("Strategic Energy Security and Economic Logistics", "Strategic Energy Security and Economic Logistics"), ("Sustainable Education and Scientific Exchange Link", "Sustainable Education and Scientific Exchange Link"), ("Security and Environment Strategy for Eastern Littoral", "Security and Environment Strategy for Eastern Littoral")])
add_drill("What will IIT Patna provide under the PM VIKAS MoU?", "PM VIKAS MoU के तहत IIT Patna क्या प्रदान करेगा?", ("Training to 600 Bihar minority youth in AI Technocrat and Business Analytics roles", "बिहार के 600 अल्पसंख्यक युवाओं को AI Technocrat एवं Business Analytics भूमिकाओं का प्रशिक्षण"), [("Scholarships to 60 foreign students", "60 विदेशी छात्रों को छात्रवृत्ति"), ("Defence training to 6,000 recruits", "6,000 रंगरूटों को रक्षा प्रशिक्षण"), ("Tourism training to 200 guides", "200 गाइडों को पर्यटन प्रशिक्षण")])
add_drill("The L&T-NVIDIA gigawatt-scale AI factory initiative aligns with which mission?", "L&T-NVIDIA गीगावॉट-स्केल AI फैक्ट्री पहल किस मिशन के अनुरूप है?", ("IndiaAI Mission", "IndiaAI मिशन"), [("Deep Ocean Mission", "डीप ओशन मिशन"), ("National Solar Mission", "राष्ट्रीय सौर मिशन"), ("Gaganyaan Mission", "गगनयान मिशन")])
add_drill("How is Bharat Future City officially positioned?", "Bharat Future City को आधिकारिक रूप से किस रूप में प्रस्तुत किया गया है?", ("India's first net-zero greenfield smart city", "भारत की पहली नेट-ज़ीरो ग्रीनफील्ड स्मार्ट सिटी"), [("India's first floating capital", "भारत की पहली तैरती राजधानी"), ("Asia's largest port city", "एशिया का सबसे बड़ा बंदरगाह शहर"), ("A nuclear research township", "एक परमाणु अनुसंधान टाउनशिप")])


def parse_concat_file(path: Path):
    text = path.read_text(encoding="utf-8")
    start = text.index("concat(") + len("concat(")
    end = text.rfind(")")
    return text[:start], json.loads(text[start:end]), text[end:]


def save_concat_file(path: Path, prefix: str, data: list, suffix: str):
    prefix = re.sub(r"generated 2026-09-18", "generated 2026-09-23", prefix)
    path.write_text(prefix + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + suffix, encoding="utf-8")


def normalize_text(fragment: str) -> str:
    """Turn one question-card HTML fragment into compact searchable text."""
    text = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def update_topic():
    text = TOPIC.read_text(encoding="utf-8")
    assert 'id="q103"' in text and 'id="q104"' not in text
    divider = '''

    <section class="oneliner-card mou-section-heading" aria-labelledby="mou-tech-heading">
        <h2 id="mou-tech-heading">🤝 MoUs &amp; Strategic Technology Partnerships 2026</h2>
        <p class="oneliner-q"><span class="en-text">Web-verified MCQs from the uploaded MoU 2026 material</span><span class="hi-text">अपलोड की गई MoU 2026 सामग्री से वेब-सत्यापित प्रश्न</span></p>
    </section>'''
    new_cards = "".join(question_html(104 + i, item) for i, item in enumerate(MAIN))
    marker = "\n<footer>"
    assert text.count(marker) == 1
    text = text.replace(marker, divider + new_cards + marker)
    text = text.replace(
        "SCIENCE & TECH 2026 Current Affairs — Complete!",
        "SCIENCE & TECH 2026 Current Affairs — 122 Verified MCQs Complete!",
    )
    text = text.replace(
        "ExamFusion Prep - SCIENCE &amp; TECH 2026 Current Affairs: Q1. लाइसोसोमल.",
        "Science &amp; Technology 2026 Current Affairs: 122 bilingual MCQs including verified MoUs, AI, defence technology and strategic partnerships.",
    )
    TOPIC.write_text(text, encoding="utf-8")


def update_rapid():
    text = RAPID.read_text(encoding="utf-8")
    match = re.search(r'<script id="master-data" type="application/json">(.*?)</script>', text, re.S)
    assert match
    data = json.loads(match.group(1))
    assert sum(len(section["questions"]) for section in data) == 288
    assert len(data) == 11
    data[3]["questions"].extend(rapid_question(item) for item in MAIN)
    data[3]["title"] = {"en": "Main MCQs Q91–Q122", "hi": "मुख्य MCQ Q91–Q122"}
    data[10]["questions"].extend(DRILLS)
    data[10]["title"] = {"en": "Explanation Drill: Facts 181–220", "hi": "स्पष्टीकरण अभ्यास: तथ्य 181–220"}
    assert sum(len(section["questions"]) for section in data) == 342
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    text = text[: match.start(1)] + payload + text[match.end(1) :]
    text = text.replace('<div class="stat"><b>288</b><span>Total Practice</span></div>', '<div class="stat"><b>342</b><span>Total Practice</span></div>')
    text = text.replace('<div class="stat"><b>103</b><span>Main MCQs</span></div>', '<div class="stat"><b>122</b><span>Main MCQs</span></div>')
    text = text.replace('<div class="stat"><b>185</b><span>Explanation Drills</span></div>', '<div class="stat"><b>220</b><span>Explanation Drills</span></div>')
    RAPID.write_text(text, encoding="utf-8")
    return data


def update_hub():
    text = RAPID_HUB.read_text(encoding="utf-8")
    assert 'content="8906"' in text and '<b>8,906</b>' in text
    text = text.replace('content="8906"', 'content="8960"')
    text = text.replace('<b>8,906</b><span>Total practice questions</span>', '<b>8,960</b><span>Total practice questions</span>')
    text = text.replace("Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',288,11", "Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',342,11")
    RAPID_HUB.write_text(text, encoding="utf-8")


def update_service_worker():
    text = SERVICE_WORKER.read_text(encoding="utf-8")
    text, count = re.subn(
        r'\A// v\d+.*?\nconst CACHE_VERSION = "[^"]+";',
        '// v98 strict Maths search plus verified MoU Science & Technology expansion 20260923\n'
        'const CACHE_VERSION = "efp-pwa-2026-09-23-v98-maths-mou-scitech";',
        text,
        count=1,
    )
    assert count == 1
    SERVICE_WORKER.write_text(text, encoding="utf-8")


def update_indexes(rapid_data):
    topic_text = TOPIC.read_text(encoding="utf-8")
    cards = re.findall(
        r'<main class="question-card" id="q\d+">.*?</main>',
        topic_text,
        re.S,
    )
    assert len(cards) == 122

    ca_text = CA_INDEX.read_text(encoding="utf-8")
    ca_data = json.loads(ca_text.split("=", 1)[1].strip().rstrip(";"))
    positions = [i for i, item in enumerate(ca_data) if item.get("f") == TOPIC_PATH]
    assert len(positions) == 103
    insert_at = positions[0]
    ca_data = [item for item in ca_data if item.get("f") != TOPIC_PATH]
    replacements = [{"f": TOPIC_PATH, "t": "Science And Tech Current Affairs", "x": normalize_text(card)} for card in cards]
    ca_data[insert_at:insert_at] = replacements
    CA_INDEX.write_text("window.CA_SEARCH_INDEX = " + json.dumps(ca_data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")

    prefix, data, suffix = parse_concat_file(CA_SNIPPETS)
    matches = [i for i, item in enumerate(data) if item.get("f") == TOPIC_GLOBAL_PATH]
    assert len(matches) == 1
    data[matches[0]] = {
        "f": TOPIC_GLOBAL_PATH,
        "t": "SCIENCETECH2026",
        "b": "Current Affairs / 2026 / Topic Wise",
        "x": [f"\x01q{i + 1}\x02{normalize_text(card)}" for i, card in enumerate(cards)],
    }
    save_concat_file(CA_SNIPPETS, prefix, data, suffix)

    prefix, data, suffix = parse_concat_file(RAPID_SNIPPETS)
    matches = [i for i, item in enumerate(data) if item.get("f") == RAPID_GLOBAL_PATH]
    assert len(matches) == 1
    chunks = []
    for si, section in enumerate(rapid_data):
        for qi, question in enumerate(section["questions"]):
            options = " / ".join(f"{o['en']} / {o['hi']}" for o in question["o"])
            body = (
                f"{question['q']['en']} {question['q']['hi']} "
                f"Options: {options}. Answer: {question['a']['en']} / {question['a']['hi']}. "
                f"{question['exp']['en']} {question['exp']['hi']}"
            )
            chunks.append(f"\x01rp-{si}-{qi}\x02{re.sub(r'\\s+', ' ', body).strip()}")
    assert len(chunks) == 342
    data[matches[0]] = {
        "f": RAPID_GLOBAL_PATH,
        "t": "Science_and_Technology_2026_Current_Affairs_Rapid_Practice",
        "b": "Current Affairs / Rapid Practice / 2026 / Topic Wise",
        "x": chunks,
    }
    save_concat_file(RAPID_SNIPPETS, prefix, data, suffix)


def validate():
    topic = TOPIC.read_text(encoding="utf-8")
    ids = [int(x) for x in re.findall(r'<main class="question-card" id="q(\d+)">', topic)]
    assert ids == list(range(1, 123))
    assert topic.count("G-Q1WNRY8ECV") >= 2
    assert "black-mode.js" in topic
    assert "efpCopyrightYear" in topic

    rapid = RAPID.read_text(encoding="utf-8")
    match = re.search(r'<script id="master-data" type="application/json">(.*?)</script>', rapid, re.S)
    data = json.loads(match.group(1))
    assert sum(len(section["questions"]) for section in data) == 342
    assert len(data[3]["questions"]) == 32
    assert len(data[10]["questions"]) == 40
    for section in data:
        for question in section["questions"]:
            assert len(question["o"]) == 4
            assert len({o["en"] for o in question["o"]}) == 4
            assert sum(o["en"] == question["a"]["en"] for o in question["o"]) == 1

    hub = RAPID_HUB.read_text(encoding="utf-8")
    assert 'content="8960"' in hub and '<b>8,960</b>' in hub
    assert "Science_and_Technology_2026_Current_Affairs_Rapid_Practice.html',342,11" in hub

    service_worker = SERVICE_WORKER.read_text(encoding="utf-8")
    assert 'efp-pwa-2026-09-23-v98-maths-mou-scitech' in service_worker

    ca_data = json.loads(CA_INDEX.read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))
    assert sum(item.get("f") == TOPIC_PATH for item in ca_data) == 122

    for path, target, expected in [
        (CA_SNIPPETS, TOPIC_GLOBAL_PATH, 122),
        (RAPID_SNIPPETS, RAPID_GLOBAL_PATH, 342),
    ]:
        _, data, _ = parse_concat_file(path)
        match = [item for item in data if item.get("f") == target]
        assert len(match) == 1 and len(match[0]["x"]) == expected


def main():
    assert len(MAIN) == 19
    assert len(DRILLS) == 35
    update_topic()
    rapid_data = update_rapid()
    update_hub()
    update_indexes(rapid_data)
    update_service_worker()
    validate()
    print("Integrated 19 verified main MCQs + 35 explanation drills; rapid total 342; hub total 8,960.")


if __name__ == "__main__":
    main()
