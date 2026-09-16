#!/usr/bin/env python3
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/'PYQ'/'data'/'pdf-catalog.json'

RRB={
2025:[
('prelims-dec-06','Prelims · 06 Dec 2025','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-dec-06-2025-1785754606.pdf'),
('prelims-dec-07','Prelims · 07 Dec 2025','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-dec-07-2025-1785754606.pdf'),
('prelims-dec-13','Prelims · 13 Dec 2025','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-dec-13-2025-1785754606.pdf'),
('prelims-dec-14','Prelims · 14 Dec 2025','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-dec-14-2025-1785754606.pdf'),
('mains-feb-01-2026','Mains · 01 Feb 2026','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-mains-memory-based-paper-pdf-feb-01-2026-1785754618.pdf')],
2024:[
('prelims-aug-10','Prelims · 10 Aug 2024','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-10-2024-1785754610.pdf'),
('prelims-aug-17','Prelims · 17 Aug 2024','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-17-2024-1785754608.pdf'),
('prelims-aug-18','Prelims · 18 Aug 2024','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-18-2024-1785754608.pdf'),
('mains-oct-06','Mains · 06 Oct 2024','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-mains-memory-based-paper-pdf-oct-06-2024-1785754616.pdf')],
2023:[
('prelims-aug-05','Prelims · 05 Aug 2023','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-05-2023-1785754611.pdf'),
('prelims-aug-06','Prelims · 06 Aug 2023','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-06-2023-1785754611.pdf'),
('prelims-aug-12','Prelims · 12 Aug 2023','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-12-2023-1785754610.pdf'),
('prelims-aug-13','Prelims · 13 Aug 2023','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-13-2023-1785754610.pdf'),
('mains-sep-16','Mains · 16 Sep 2023','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-mains-memory-based-paper-pdf-sep-16-2023-1785754616.pdf')],
2022:[
('prelims-aug-07','Prelims · 07 Aug 2022','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-07-2022-1785754610.pdf'),
('prelims-aug-13','Prelims · 13 Aug 2022','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-13-2022-1785754610.pdf'),
('prelims-aug-14','Prelims · 14 Aug 2022','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-14-2022-1785754609.pdf'),
('mains-oct-01','Mains · 01 Oct 2022','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-mains-memory-based-paper-pdf-oct-01-2022-1785754616.pdf')],
2021:[
('prelims-jan-02','Prelims · 02 Jan 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-jan-02-2021-1785754606.pdf'),
('prelims-jan-04','Prelims · 04 Jan 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-jan-04-2021-1785754606.pdf'),
('prelims-aug-01','Prelims · 01 Aug 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-01-2021-1785754611.pdf'),
('prelims-aug-07','Prelims · 07 Aug 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-07-2021-1785754610.pdf'),
('prelims-aug-08','Prelims · 08 Aug 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-08-2021-1785754610.pdf'),
('prelims-aug-14','Prelims · 14 Aug 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-14-2021-1785754609.pdf'),
('prelims-aug-21','Prelims · 21 Aug 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-prelims-memory-based-paper-pdf-aug-21-2021-1785754608.pdf'),
('mains-oct-03','Mains · 03 Oct 2021','https://cdn-images.prepp.in/public/image/ibps-rrb-clerk-mains-memory-based-paper-pdf-oct-03-2021-1785754616.pdf')]
}

UPSC_MAINS={
2025:[
('gs1','Mains · General Studies Paper I','https://www.upsc.gov.in/sites/default/files/GENERAL-STUDIES-PAPER%20I-QP-CSM-25-010925.pdf'),
('gs2','Mains · General Studies Paper II','https://www.upsc.gov.in/sites/default/files/GENERAL-STUDIES-PAPER-II-QP-CSM-25-010925.pdf'),
('gs3','Mains · General Studies Paper III','https://www.upsc.gov.in/sites/default/files/GENERAL-STUDIES-PAPER-III-QP-CSM-25-010925.pdf'),
('gs4','Mains · General Studies Paper IV','https://www.upsc.gov.in/sites/default/files/GENERAL-STUDIES-PAPER-IV-QP-CSM-25-010925.pdf'),
('essay','Mains · Essay','https://www.upsc.gov.in/sites/default/files/ESSAY-QP-CSM-25-010925.pdf')],
2024:[
('gs1','Mains · General Studies Paper I','https://www.upsc.gov.in/sites/default/files/QP_CSM_2024_GenStud_I_03102024.pdf'),
('gs2','Mains · General Studies Paper II','https://www.upsc.gov.in/sites/default/files/QP_CSM_2024_GenStud_II_03102024.pdf'),
('gs3','Mains · General Studies Paper III','https://www.upsc.gov.in/sites/default/files/QP_CSM_2024_GenStud_III_03102024.pdf'),
('gs4','Mains · General Studies Paper IV','https://www.upsc.gov.in/sites/default/files/QP_CSM_2024_GenStud_IV_03102024.pdf'),
('essay','Mains · Essay','https://www.upsc.gov.in/sites/default/files/QP_CSM_2024_Essay_03102024.pdf')]
}

def add_unique(year,papers):
    seen={p['id'] for p in year['papers']}
    for p in papers:
        if p['id'] not in seen:
            year['papers'].append(p); seen.add(p['id'])

def main():
    data=json.loads(CAT.read_text(encoding='utf-8'))
    bank=next(e for e in data['exams'] if e['id']=='banking')
    for y,rows in RRB.items():
        ym=next(x for x in bank['years'] if x['year']==y)
        add_unique(ym,[{'id':f'ibps-rrb-clerk-{y}-{slug}','label':f'IBPS RRB Clerk {label} · Memory-based','stage':'Mains' if 'mains' in slug else 'Prelims','paper':'IBPS RRB Clerk','pdf':url,'source':'Memory-based paper collected from exam takers · Prepp'} for slug,label,url in rows])
    upsc=next(e for e in data['exams'] if e['id']=='upsc')
    for y,rows in UPSC_MAINS.items():
        ym=next(x for x in upsc['years'] if x['year']==y)
        add_unique(ym,[{'id':f'cse-mains-{y}-{slug}','label':label,'stage':'Mains','paper':label.replace('Mains · ',''),'pdf':url,'source':'Official UPSC question paper'} for slug,label,url in rows])
    data['version']=max(int(data.get('version',1)),4)
    CAT.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    total=sum(len(y.get('papers',[])) for e in data['exams'] for y in e.get('years',[]))
    bank_count=sum(len(y['papers']) for y in bank['years'])
    print(f'Catalog expanded: total={total}, banking={bank_count}')

if __name__=='__main__': main()
