# Extracts every FR/EN string of ../fr-en.md with its slot (width, font, max lines).
# Run: python3 extract.py && node measure.js  (needs Playwright + Chromium)
import re,json,os
D=os.path.dirname(os.path.abspath(__file__))
t=open(os.path.join(D,'..','fr-en.md')).read()
SL={'reason.long':(288,14,20,400,2),'reason.short':(200,14,20,500,1),'help':(320,15,22,400,4),'banner':(230,13,18,400,2),'button':(280,15,20,600,1),'toast':(240,14,20,500,1),'dialog.title':(272,18,26,600,2),'dialog.body':(272,15,22,400,4),'field':(280,15,20,400,1),'empty.title':(320,18,26,600,2),'empty.body':(320,15,22,400,2)}
def guess(k):
    k=k.lower()
    if k.startswith('line'): return (320,13,18,400,3)
    if re.search(r'title',k): return (320,24,32,600,2)
    if re.search(r'badge|tag|chip|pill',k): return (200,12,16,600,1)
    if re.search(r'button|cta|yes|no\b|call|close|link|action|retry|create|add|show|confirm',k): return (280,15,20,600,1)
    return (320,14,20,400,3)
P={'x':'6','heure':'03:10','time':'03:10','catégorie':'Restaurant','category':'Restaurant','n':'12','m':'23','k':'1','montant':'1 250 000 F','amount':'1 250 000 F','left':'1 250 000 F','budgeted':'1 250 000 F','v':'12,4','date':'18 nov.','date1':'18 nov. 2025','date2':'3 févr. 2026','banque':'Banque Baobab','bank':'Banque Baobab','actif':'Obligation État CI 2030','asset':'Obligation État CI 2030','seuil':'25','threshold':'25','indice':'BRVM Composite','index':'BRVM Composite','élément 1':'le rythme des opérations','élément 2':'le jour de la semaine','feature 1':'the pace of payments','feature 2':'the day of the week','share':'32','payee':'Awa K.','op_type':'Transfert','operator':'Savane Pay','last_day':'30 novembre','month':'novembre','objet':'vos placements','object':'your investments','total':'8,2','zone':'À confirmer'}
def fill(s):
    s=s.replace('**','').replace('`','')
    return re.sub(r'\{([^}]+)\}',lambda m:P.get(m.group(1),'Xxxxxxxx'),s)
items=[];sec='';hdr=None
for line in t.split('\n'):
    if line.startswith('#'): sec=line.strip('# ');hdr=None;continue
    if not line.startswith('|'): hdr=None;continue
    cells=[c.strip() for c in line.strip().strip('|').split('|')]
    if hdr is None: hdr=[c.lower() for c in cells];continue
    if re.match(r'^-+$',cells[0].replace(':','')): continue
    if 'fr' not in hdr or 'en' not in hdr: continue
    fi,ei=hdr.index('fr'),hdr.index('en')
    if len(cells)<=max(fi,ei): continue
    key=cells[hdr.index('key')] if 'key' in hdr else cells[0] if fi>0 else ''
    slot=cells[hdr.index('slot')] if 'slot' in hdr else None
    if slot in ('feature','param'): continue
    spec=SL.get(slot) or guess(key+' '+(slot or ''))
    fr,en=cells[fi],cells[ei]
    frs=[fr];ens=[en]
    if ' / ' in fr and fr.count(' / ')==en.count(' / '): frs=fr.split(' / ');ens=en.split(' / ')
    if sec.startswith('N —'):
        for a,b in zip(frs,ens):
            for lang,s in (('FR',a),('EN',b)):
                lim=40 if ('title' in key and a is frs[0]) else 90
                n=len(fill(s.strip()))
                if n>lim: print('NOTIF',lang,n,lim,key,s)
        continue
    for i,(a,b) in enumerate(zip(frs,ens)):
        sp=spec
        if i>0 and 'title' in key and 'text' in key: sp=(320,14,20,400,3)
        for lang,s in (('FR',a),('EN',b)):
            s=s.strip().strip('"«» ')
            if not s or s=='—': continue
            items.append({'sec':sec,'key':key,'slot':slot or 'guess','lang':lang,'text':fill(s),'raw':s,'spec':sp})
json.dump(items,open(os.path.join(D,'items.json'),'w'),ensure_ascii=False)
print(len(items))
