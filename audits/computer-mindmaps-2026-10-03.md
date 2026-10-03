# Computer mindmap audit — 3 October 2026

Reviewed and corrected all 25 chapters in `Mind Maps/Computer`. The original PDF remains the content base; inaccurate facts, contradictory tables and graphics, and unsupported absolute claims have been corrected rather than preserved as revision facts.

## Changes by chapter

| Chapter | Main corrections |
| --- | --- |
| 01 History and generations | Lovelace/Babbage, working-machine versus design dates, commercial-computer firsts, transistor/IC facts, and approximate generation boundaries. |
| 02 Fundamentals | FLOPS, C-DAC/PARAM, dated supercomputer comparisons, quantum-computing qualifications and computer-type examples. |
| 03 Number systems | Decimal-place arithmetic and fractional conversion examples. |
| 04 Logic gates | OR/XOR/NOR rules, NOT versus universal gates, verified truth tables; replaced inaccurate PDF graphics. |
| 05 Hardware | Memory/firmware/virtual memory, display and printer distinctions, storage capacities and experimental HVD claims; corrected memory hierarchy graphic. |
| 06 Software | Open-source licensing, system/application/utility distinctions, operating-system history and obsolete-version claims. |
| 07 Operating systems | Kernel/shell, operating-system classifications and mobile-OS descriptions. |
| 08 Windows | Release dates, application-specific shortcuts, CUI terminology and file extensions; replacement extension diagram. |
| 09 MS Office | PROPER/AVERAGE/TIME, Excel format limits and version labels, PowerPoint history and shortcut contexts. |
| 10 Programming languages | Language levels, translator roles, portability/performance qualifications and generation-versus-paradigm distinctions; replaced four misleading graphics. |
| 11 Internet | Internet versus Web, ARPANET/NSFNET, Web history, Wi-Fi naming, communications and technology-dependent range/speed claims. |
| 12 Networking | OSPF protocol number versus transport ports, routing protocols, mail/FTP ports, TLS, IP/MAC addressing and device roles; added missing tree-topology diagram. |
| 13 Cybersecurity | Virus/worm/Trojan/rootkit definitions, hacker categories, phishing and Indian IT-law references. |
| 14 Email | Email/Web chronology, BCC/Reply-To, aliases, POP3/IMAP and transport encryption limitations. |
| 15 IoT | Functional components versus implementation items, UDP, OAuth/OIDC and sensor/actuator descriptions. |
| 16 Machine learning | Samuel/Turing chronology, logistic regression as classification and algorithm/metric categories. |
| 17 Artificial intelligence | Dartmouth proposal/workshop distinction, DRDO Daksh, activation/backpropagation and qualified AI claims. |
| 18 Big data | Missing unstructured-data definition, Kafka/Hive roles and structured versus NoSQL distinctions. |
| 19 Digital finance | BHIM versus wallet, dated NEFT/RTGS availability, payment limits/charges, IMPS identifiers and SWIFT/BIC location code. |
| 20 E-governance | NeGP history, e-Hospital ORS and electronic voting versus Internet voting. |
| 21 Social networking | Founding versus launch years, cofounders, Douyin/TikTok and non-guaranteed ranking outcomes. |
| 22 Indian IT achievements | HEC-2M installation, Aaditya location, historical AIRAWAT HPL performance versus AI-operation metrics. |
| 23 Shortcuts | Windows/Word/browser contexts, Ctrl+M, Ctrl+Q and closing/minimizing distinctions. |
| 24 Full forms | Standard acronyms, non-acronym/backronym labels, storage-unit spellings, bits/bytes and context-dependent entries. |
| 25 Practice questions | Restored 37 Hindi prompts, missing matching item, trial-software wording, worksheet protection, MAC qualifications, zero-day definition, SUBTOTAL filtering and DNS transports. |

## Graphics and search

- Added 11 local, scalable SVG assets: logic rules, truth tables, universal-gate constructions, memory hierarchy, file extensions, Excel dimensions, four programming diagrams and tree topology.
- Corrected factual labels in existing embedded SVGs and repaired unescaped ampersands that invalidated SVG XML.
- Advanced the PWA cache version so cached app pages and search data can refresh.
- Refreshed all 25 Computer records in `search-snippets-mindmaps.js`, including panel anchors and complete question/answer snippets.
- Kept chapter routes, panel IDs, all 37 question IDs and answer letters, and all 238 full-form rows. Short answer-bearing facts retain highlighting; long yellow prose spans were shortened.

## Validation before push

- Parsed every chapter and checked ID preservation and uniqueness against the starting commit.
- Decoded and validated all 228 image elements: raster decoding or SVG XML parsing; checked local asset paths.
- Checked that table rows have cells, search anchors resolve to actual panels, and question answer letters match the marked correct options.
- Compiled all 50 inline JavaScript blocks and loaded the 241-record shared snippet index.
- `git diff --check` passed.
- Local Playwright rendering was unavailable because this workspace has no browser binary and the official browser download did not provide a valid archive. Live browser smoke checks are performed after deployment; no local desktop/mobile rendering pass is claimed.

## Principal verification references

- Computer History Museum: [computer timeline](https://www.computerhistory.org/timeline/computers/) and [Babbage](https://www.computerhistory.org/babbage/overview/).
- NIST: [Ada Lovelace](https://www.nist.gov/blogs/taking-measure/ada-lovelace-worlds-first-computer-programmer-who-predicted-artificial), [Trojan horse](https://csrc.nist.gov/glossary/term/trojan_horse), [rootkit](https://csrc.nist.gov/glossary/term/rootkit).
- Microsoft: [Windows shortcuts](https://support.microsoft.com/en-us/accessibility/windows/keyboard-shortcuts-in-windows), [PowerPoint shortcuts](https://support.microsoft.com/en-us/accessibility/powerpoint/use-keyboard-shortcuts-to-create-powerpoint-presentations), [PROPER](https://support.microsoft.com/en-us/excel/functions/proper-function), [SUBTOTAL](https://support.microsoft.com/en-us/excel/functions/subtotal-function), [font size](https://support.microsoft.com/en-us/office/fonts/change-the-font-size).
- Intel: [4004 history](https://www.intel.com/content/www/us/en/history/virtual-vault/articles/the-intel-4004.html).
- CERN: [birth of the Web](https://home.cern/science/computing/the-birth-of-the-web/).
- IANA: [Internet protocol numbers](https://www.iana.org/assignments/protocol-numbers).
- Open Source Initiative: [Open Source Definition](https://opensource.org/osd).
- RBI: [NEFT directions](https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=11750), [RTGS FAQ](https://www.rbi.org.in/scripts/FS_FAQs.aspx?Id=65).
- NPCI: [BHIM](https://www.npci.org.in/product/bhim), [IMPS](https://www.npci.org.in/product/imps).
- Stanford: [1955 Dartmouth proposal](https://www-formal.stanford.edu/jmc/history/dartmouth/dartmouth.html).
- scikit-learn: [LogisticRegression classifier](https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html).
- Apache: [Kafka](https://kafka.apache.org/documentation/index.html), [Hive](https://hive.apache.org/docs/latest/introduction-to-apache-hive/).
- ISI: [HEC-2M installation history](https://oldweb.isical.ac.in/~repro/history/public/notepage/HEC-2M-F.html).
- TOP500: [June 2022 benchmark list](https://www.top500.org/lists/top500/2022/06/); C-DAC: [historical AIRAWAT announcement](https://www.cdac.in/index.aspx?id=print_page&print=pk_itn_spot1332).
- Oracle: [Java Application Descriptor](https://docs.oracle.com/javame/dev-tools/jme-sdk-3.0-win/html-helpset/z400007746934.html); 3GPP: [UMTS specifications](https://portal.3gpp.org/Specifications.aspx?q=1).

Rankings and product examples explicitly marked historical should not be treated as current rankings or availability guarantees.
