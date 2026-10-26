"""Extract an Anki candidate for a private, evidence-based textbook audit.
Never execute card templates. Never mark a note reviewed automatically.
"""
import argparse,collections,hashlib,html,json,re,sqlite3,zipfile
from html.parser import HTMLParser
from pathlib import Path
class Text(HTMLParser):
 def __init__(self):super().__init__();self.parts=[];self.hidden=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'):self.hidden+=1
  if not self.hidden and tag in ('br','p','div','li','tr'):self.parts.append('\n')
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.hidden=max(0,self.hidden-1)
  if not self.hidden and tag in ('p','div','li','tr'):self.parts.append('\n')
 def handle_data(self,data):
  if not self.hidden:self.parts.append(data)
def clean(s):
 p=Text();p.feed(s);return re.sub(r'\n{3,}','\n\n',html.unescape(''.join(p.parts))).strip()
def book_index(name):
 for marker,n in [('选必1',2),('选必2',3),('选必3',4),('必修1',0),('必修2',1)]:
  if marker in name:return n
 return None
parser=argparse.ArgumentParser();parser.add_argument('apkg');parser.add_argument('--out',default='private-content');args=parser.parse_args()
out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.apkg) as z:
 name='collection.anki21' if 'collection.anki21' in z.namelist() else 'collection.anki2'
 db=out/'candidate.sqlite';db.write_bytes(z.read(name))
 media=json.loads(z.read('media'));md=out/'media';md.mkdir(exist_ok=True)
 for key,filename in media.items():
  if not isinstance(filename,str) or Path(filename).name!=filename or '\\' in filename:raise ValueError('Unsafe media filename')
  if len(z.read(key))>30_000_000:raise ValueError('Media too large')
  (md/filename).write_bytes(z.read(key))
c=sqlite3.connect(f'file:{db.resolve()}?mode=ro',uri=True);c.row_factory=sqlite3.Row
col=c.execute('select models,decks from col').fetchone();models=json.loads(col['models']);decks=json.loads(col['decks'])
by_note=collections.defaultdict(list)
for card in c.execute('select id,nid,did,ord from cards order by id'):by_note[card['nid']].append(dict(card))
notes=[]
for n in c.execute('select id,mid,tags,flds from notes order by id'):
 model=models[str(n['mid'])];cards=by_note[n['id']];paths=sorted({decks[str(x['did'])]['name'] for x in cards});fields=n['flds'].split('\x1f');text_fields=[clean(x) for x in fields];chapter=re.search(r'第\s*(\d+)\s*章',' '.join(paths));book=book_index(' '.join(paths));images=re.findall(r'<img[^>]+src=[\"\']([^\"\']+)',n['flds'],re.I)
 notes.append({'note_id':str(n['id']),'model':model['name'],'model_type':model['type'],'field_names':[f['name'] for f in model['flds']],'fields':text_fields,'raw_fields':fields,'card_ids':[str(x['id']) for x in cards],'ordinals':[x['ord'] for x in cards],'decks':paths,'book':book,'chapter':int(chapter.group(1)) if chapter else None,'tags':n['tags'].split(),'media':images,'audit':{'status':'pending','reference_edition':None,'evidence':[],'reason':None}})
(out/'candidate-notes.json').write_text(json.dumps(notes,ensure_ascii=False,indent=2))
counts=collections.Counter(n['model'] for n in notes);summary={'source':'https://ankiweb.net/shared/info/112165574','sha256':hashlib.sha256(Path(args.apkg).read_bytes()).hexdigest(),'notes':len(notes),'cards':sum(len(n['card_ids']) for n in notes),'models':dict(counts),'books':dict(collections.Counter(str(n['book']) for n in notes)),'media_files':len(media),'approved':0,'pending':len(notes)}
(out/'candidate-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print(json.dumps(summary,ensure_ascii=False,indent=2))
