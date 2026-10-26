"""Download the five publicly offered PEP textbooks, verify catalog hashes, extract pages."""
import concurrent.futures,hashlib,json,subprocess,shutil
from pathlib import Path
from pypdf import PdfReader
root=Path('private-content/textbooks');root.mkdir(parents=True,exist_ok=True)
catalog=json.loads(Path('/tmp/bio-school-downloads.json').read_text())
rows=[r for r in catalog['downloads'] if r['publisher']=='人民教育出版社']
assert len(rows)==5
manifest=[]
existing_path=Path('reference/textbook-sources.json')
existing={m['edition_id']:m for m in json.loads(existing_path.read_text())} if existing_path.exists() else {}
for r in rows:
 title=r['title'];key=('x'+title.split('选择性必修')[1][0]) if '选择性必修' in title else 'b'+title.split('必修')[1][0]
 src=next(s for s in r['sources'] if s['kind']=='vps')
 manifest.append({**existing.get(r['edition_id'],{}),'key':key,'title':title,'edition_id':r['edition_id'],'url':'https://sun.bdfz.net'+src['url'],'bytes':src['bytes'],'pages':src['pages'],'catalog_platform_current':r['platform_current'],'acquired_at':src['acquired_at'],'newer_edition':r['newer_edition'],'sha_prefix':r['edition_id'].split('-')[-1],'catalog_current_claim_as_of':'2026-10-10'})
Path('reference/textbook-sources.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
def download(m):
 final=root/(m['key']+'.pdf');part=root/(m['key']+'.part')
 if m['key']=='x2' and not part.exists() and not final.exists():shutil.copy('/tmp/bubei-textbooks/x2.pdf',part)
 if not final.exists():
  for attempt in range(4):
   result=subprocess.run(['curl','-L','--fail','--continue-at','-','--max-time','180','-sS',m['url'],'-o',str(part)],capture_output=True,text=True)
   size=part.stat().st_size if part.exists() else 0
   print(m['key'],'download',size,'/',m['bytes'],flush=True)
   if result.returncode==0 and size==m['bytes']:part.rename(final);break
   if result.returncode not in [0,18,28,56]:raise RuntimeError(result.stderr[:200])
  if not final.exists():raise RuntimeError(m['key']+' incomplete')
 digest=hashlib.sha256(final.read_bytes()).hexdigest()
 assert final.stat().st_size==m['bytes'] and digest.startswith(m['sha_prefix']),(m['key'],'file hash mismatch')
 reader=PdfReader(final);assert len(reader.pages)==m['pages']
 pages=[{'pdf_page':i+1,'text':p.extract_text()} for i,p in enumerate(reader.pages)]
 (root/(m['key']+'.pages.json')).write_text(json.dumps(pages,ensure_ascii=False,indent=2))
 m['sha256']=digest;m['actual_pages']=len(reader.pages)
 print(m['key'],'COMPLETE',len(reader.pages),'pages',digest,flush=True)
 return m
completed=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
 futures=[pool.submit(download,m) for m in manifest]
 for f in concurrent.futures.as_completed(futures):completed.append(f.result());(root/'verified-files.json').write_text(json.dumps(completed,ensure_ascii=False,indent=2))
print('ALL FIVE TEXTBOOKS READY',flush=True)
