(function () {
    'use strict';

    // Read only the JSON blocks from the original upload.
    const bankUrl = new URL('./computer-bank-4b3b04b.dat', document.currentScript.src);
    const chapterHindi = {
        "1. Computer Fundamentals — History, Generations & Types": "कंप्यूटर की मूल बातें — इतिहास, पीढ़ियाँ और प्रकार",
        "2. Computer Organization — CPU, I/O, Memory, Buses & Ports": "कंप्यूटर संगठन — CPU, इनपुट/आउटपुट, मेमोरी, बसें और पोर्ट",
        "3. Software & Operating Systems — Programming Languages, Translators & Operating Systems": "सॉफ्टवेयर और ऑपरेटिंग सिस्टम — प्रोग्रामिंग भाषाएँ, अनुवादक और ऑपरेटिंग सिस्टम",
        "4. Microsoft Office — Word, Excel, PowerPoint & Access": "माइक्रोसॉफ्ट ऑफिस — वर्ड, एक्सेल, पावरपॉइंट और एक्सेस",
        "5. Internet, Email & E-Banking — Web Browsers, Search, Protocols & Online Payments": "इंटरनेट, ई-मेल और ई-बैंकिंग — वेब ब्राउज़र, खोज, प्रोटोकॉल और ऑनलाइन भुगतान",
        "6. Data Communication & Computer Networks — Signals, Topologies, Devices, Addresses & Malware": "डेटा संचार और कंप्यूटर नेटवर्क — संकेत, टोपोलॉजी, उपकरण, पते और मैलवेयर",
        "7. Cybersecurity — CIA Triad, Malware, Hacking, Network Attacks & Controls": "साइबर सुरक्षा — CIA त्रय, मैलवेयर, हैकिंग, नेटवर्क हमले और नियंत्रण",
        "8. Data Representation & Number Systems — Data Processing, Statistics, Encoding & Base Conversions": "डेटा निरूपण और संख्या पद्धतियाँ — डेटा प्रसंस्करण, सांख्यिकी, एन्कोडिंग और आधार परिवर्तन",
        "9. Computer Codes, Boolean Data & Logic Gates": "कंप्यूटर कोड, बूलियन डेटा और लॉजिक गेट",
        "10. OSI, TCP/IP Models & Protocols": "OSI, TCP/IP मॉडल और प्रोटोकॉल",
        "11. Supercomputers, Computer Pioneers, Companies & Inventions": "सुपरकंप्यूटर, कंप्यूटर के अग्रदूत, कंपनियाँ और आविष्कार",
        "12. Computer Abbreviations & Technical Terms": "कंप्यूटर के संक्षिप्त रूप और तकनीकी शब्द",
        "13. Zoho, Data Sovereignty & DBMS": "ज़ोहो, डेटा संप्रभुता और DBMS",
        "14. Artificial Intelligence, AI Tools & IndiaAI": "कृत्रिम बुद्धिमत्ता, AI उपकरण और IndiaAI"
    };
    let pending;

    function readBlock(source, id) {
        const start = source.indexOf('<script id="' + id + '"');
        const open = start < 0 ? -1 : source.indexOf('>', start);
        const close = open < 0 ? -1 : source.indexOf('</script>', open);
        if (close < 0) throw new Error('Missing Computer bank block: ' + id);
        return JSON.parse(source.slice(open + 1, close));
    }

    function load() {
        if (!pending) {
            pending = fetch(bankUrl).then(function (response) {
                if (!response.ok) throw new Error('Could not load Computer practice (' + response.status + ')');
                return response.text();
            }).then(function (source) {
                const master = readBlock(source, 'master-data');
                const visuals = readBlock(source, 'visual-data');
                for (const [chapter, sections] of Object.entries(master.Computer)) {
                    const figures = visuals[parseInt(chapter, 10)] || {};
                    for (const section of sections) {
                        for (const question of section.questions) {
                            if (figures[question.num]) question.visual = figures[question.num];
                        }
                    }
                }
                return master;
            }).catch(function (error) {
                pending = undefined;
                throw error;
            });
        }
        return pending;
    }

    function formatText(value) {
        return String(value ?? '').replace(/<(?!\/?(?:u|b|i|sup|sub|em|strong|br)\s*\/?>)/gi, '&lt;').replace(/\r?\n/g, '<br>');
    }

    function visualHtml(question) {
        return question.visual ? '<div class="efp-question-visual">' + question.visual + '</div>' : '';
    }

    window.EFPComputerBank = { load, chapterHindi, formatText, visualHtml };
})();
