import subprocess,sys,xml.etree.ElementTree as E,re,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ADB=str(ROOT/'tools/platform-tools/adb')
def adb(*a):return subprocess.check_output([ADB,*a])
mode=sys.argv[1]
if mode=='capture':
 name=sys.argv[2];folder=ROOT/('reference' if name.startswith('original-') else 'output/qa');folder.mkdir(parents=True,exist_ok=True)
 adb('shell','uiautomator','dump','/sdcard/bio-ui-check.xml')
 xml=adb('exec-out','cat','/sdcard/bio-ui-check.xml');(folder/(name+'.xml')).write_bytes(xml)
 (folder/(name+'.png')).write_bytes(adb('exec-out','screencap','-p'))
 nodes=[]
 for e in E.fromstring(xml).iter('node'):
  t=e.get('text') or e.get('content-desc');bounds=e.get('bounds')
  if t and bounds!='[0,0][0,0]':nodes.append({'text':t,'bounds':bounds,'clickable':e.get('clickable')=='true'})
 print(json.dumps({'image':str(folder/(name+'.png')),'nodes':nodes},ensure_ascii=False))
elif mode=='tap':print(adb('shell','input','tap',sys.argv[2],sys.argv[3]).decode())
elif mode=='back':print(adb('shell','input','keyevent','4').decode())
elif mode=='swipe':print(adb('shell','input','swipe',*sys.argv[2:6],'350').decode())
