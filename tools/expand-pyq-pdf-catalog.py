#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'PYQ' / 'data' / 'pdf-catalog.json'

CGL = [
('09-sep','2024-09-09','https://drive.google.com/file/d/1aj_g_I7CTeT6YY_yXyof97Fcc1ut1fpU/view?usp=drive_link'),
('10-sep','2024-09-10','https://drive.google.com/file/d/1sz2mdtWFt7gel7gDdVL50jJWzNXaeuQq/view?usp=drive_link'),
('11-sep','2024-09-11','https://drive.google.com/file/d/17nOrtHiDOTGLS7b2jTJu2yN5_oFy-kS4/view?usp=drive_link'),
('12-sep','2024-09-12','https://drive.google.com/file/d/1baNFoCWh4EPqX2yHPu5D3Pay54q_tH38/view?usp=drive_link'),
('13-sep','2024-09-13','https://drive.google.com/file/d/1hJpF5cjzsqcLL-aBCki3zhrZSbXqkIWH/view?usp=drive_link'),
('17-sep','2024-09-17','https://drive.google.com/file/d/1FNmxtDwhzDMdhOFGNtlzdRTjtcIbIqE3/view?usp=drive_link'),
('18-sep','2024-09-18','https://drive.google.com/file/d/1NkWB8OvcqIqkyrZTNVrkc3gNkBeTO-OB/view?usp=drive_link'),
('19-sep','2024-09-19','https://drive.google.com/file/d/1fC8kBv1kYPEh5jUJzh2TFMtnKqL8t0Fu/view?usp=drive_link'),
('23-sep','2024-09-23','https://drive.google.com/file/d/10-bbULuP2k0OGkB6jj_8QiuLdNOv8iQI/view?usp=drive_link'),
('24-sep','2024-09-24','https://drive.google.com/file/d/1IrXFSDij_LAZH5GNuQGOVoEiJuz2G28e/view?usp=drive_link'),
('25-sep','2024-09-25','https://drive.google.com/file/d/1yxdV7oWq1bNWjrWhG5m-yrZ94prD2E0L/view?usp=drive_link'),
('26-sep','2024-09-26','https://drive.google.com/file/d/1b3CaPvQc0Mj2FaYk66QyyQ5esW22E8Qq/view?usp=drive_link'),
]
GD = [
('20-feb','2024-02-20','https://drive.google.com/file/d/18BsYZ6WpeeI3sZSYysjyEiy_2yWLQKdW/view?usp=sharing'),
('21-feb','2024-02-21','https://drive.google.com/file/d/1V9lAlMNmSFModNNCcY_tfKKNX-44TuCq/view?usp=sharing'),
('22-feb','2024-02-22','https://drive.google.com/file/d/1XiA5Qsw3BP7fVjzcwTEsTisN6foY7Kgw/view?usp=sharing'),
('23-feb','2024-02-23','https://drive.google.com/file/d/1m8AV0a6YaxhSBwoLmIZAf3HUxwc2ebm0/view?usp=sharing'),
('24-feb','2024-02-24','https://drive.google.com/file/d/1vvUfGv84rOc1QYlcAuLSXGTX3ZJeajmd/view?usp=sharing'),
('26-feb','2024-02-26','https://drive.google.com/file/d/1G7fD00ijbuTrMvZ84XoTBumsuKS1RtXg/view?usp=sharing'),
('27-feb','2024-02-27','https://drive.google.com/file/d/10otMV-sPSdeAVdeO9xDNgAs44rFDvbrf/view?usp=sharing'),
('28-feb','2024-02-28','https://drive.google.com/file/d/15jBUfEZm0zJgmiQAqR0obaWBfI9v87E5/view?usp=sharing'),
('29-feb','2024-02-29','https://drive.google.com/file/d/1ZaTWExQ8YD2OLJ1qqvM_DqKubP7vu_Kn/view?usp=sharing'),
('01-mar','2024-03-01','https://drive.google.com/file/d/1AmG-9CK_-FLVQkm3hJ38deRQTMdisk_E/view?usp=sharing'),
('05-mar','2024-03-05','https://drive.google.com/file/d/1FbRY-V-1jwm_HeA6lRyBEV6QyoDSVufD/view?usp=sharing'),
('06-mar','2024-03-06','https://drive.google.com/file/d/1RNWl-q5utjskCnq93_go03kCCQMyYXg2/view?usp=sharing'),
('07-mar','2024-03-07','https://drive.google.com/file/d/1gI_GOBGiJyu0cE1E4S42fi7r5f1-6S_5/view?usp=sharing'),
('30-mar','2024-03-30','https://drive.google.com/file/d/1UzZ150keBtZKRi-fT786dFz9FL5iHFQO/view?usp=sharing'),
]
MTS = [
('30-sep-01-oct','30 Sep–01 Oct','2024-09-30','https://drive.google.com/file/d/1N-WvQ0u1tQUbtoLsIKrcmZrcx8HEfqJz/view?usp=drive_link'),
('07-08-oct','07–08 Oct','2024-10-07','https://drive.google.com/file/d/14_3u3-7FW1kD7NtC5GDq6EiL0Iqcc11J/view?usp=drive_link'),
('09-14-oct','09 & 14 Oct','2024-10-09','https://drive.google.com/file/d/19x3WYYFjWPwRPr3KvjVAj6S_GEl-keVJ/view?usp=drive_link'),
('15-16-oct','15–16 Oct','2024-10-15','https://drive.google.com/file/d/17shfqTJUT6mrKTOXt0sdEh1aYOfUo_g_/view?usp=drive_link'),
('17-18-oct','17–18 Oct','2024-10-17','https://drive.google.com/file/d/1sBVnp3MJ88JonGXYuqTXqGkH6G2fDtfI/view?usp=drive_link'),
('21-22-oct','21–22 Oct','2024-10-21','https://drive.google.com/file/d/1l4lUzvlM0AMaHIk_LyWslLFxZYaU2CLg/view?usp=drive_link'),
('23-28-oct','23 & 28 Oct','2024-10-23','https://drive.google.com/file/d/1b2kIQzKGFbe-QeIw_u6cxmNyM6n5GUEl/view?usp=drive_link'),
('29-30-oct','29–30 Oct','2024-10-29','https://drive.google.com/file/d/1j9mjZisfPWRWeYLAdnSUiVKFv7-mS4wH/view?usp=drive_link'),
('04-05-nov','04–05 Nov','2024-11-04','https://drive.google.com/file/d/1OPrybuUDZeuId5pB_XKfuGyQTSmcsurb/view?usp=drive_link'),
('11-12-nov','11–12 Nov','2024-11-11','https://drive.google.com/file/d/1n92FaLZkkXsIrn74jv6eBEYrcdlujJBY/view?usp=drive_link'),
('13-14-nov','13–14 Nov','2024-11-13','https://drive.google.com/file/d/1dq6Dd0rWX3Eco4Tt0Fph20ob1NLOIR0q/view?usp=drive_link'),
]

def main():
    data = json.loads(CATALOG.read_text(encoding='utf-8'))
    ssc = next(x for x in data['exams'] if x['id'] == 'ssc')
    ssc['name'] = 'SSC'
    ssc['hi'] = 'एसएससी'
    y2024 = next(x for x in ssc['years'] if x['year'] == 2024)
    papers = []
    for slug, date, url in CGL:
        day = int(date[-2:])
        papers.append({'id':f'cgl-2024-{slug}-all-shifts-en','label':f'CGL Tier-I · {day} Sep · All Shifts · English','stage':'Tier I','paper':'CGL · All Shifts · English','date':date,'pdf':url,'source':'SSC CGL all-shifts compilation · SSC Study'})
    for slug, date, url in GD:
        day = int(date[-2:]); mon = 'Feb' if date[5:7] == '02' else 'Mar'
        papers.append({'id':f'gd-2024-{slug}-all-shifts-en','label':f'GD Constable · {day} {mon} · All Shifts · English','stage':'CBT','paper':'GD Constable · All Shifts · English','date':date,'pdf':url,'source':'SSC GD all-shifts compilation · SSC Study'})
    for slug, labeldate, date, url in MTS:
        papers.append({'id':f'mts-2024-{slug}-all-shifts-en','label':f'MTS · {labeldate} · All Shifts · English','stage':'CBT','paper':'MTS · All Shifts · English','date':date,'pdf':url,'source':'SSC MTS all-shifts compilation · SSC Study'})
    if len(papers) != 37:
        raise SystemExit(f'expected 37 SSC 2024 bundles, got {len(papers)}')
    ids = [p['id'] for p in papers]
    if len(ids) != len(set(ids)):
        raise SystemExit('duplicate paper id found')
    y2024['papers'] = papers
    data['version'] = max(int(data.get('version', 1)), 3)
    data['updated'] = '2026-09-16'
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    total = sum(len(y.get('papers', [])) for e in data['exams'] for y in e.get('years', []))
    print(f'Catalog expanded: SSC 2024={len(papers)}, total={total}')

if __name__ == '__main__':
    main()
