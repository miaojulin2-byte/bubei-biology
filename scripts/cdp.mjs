// QA package only: adb forward tcp:9223 localabstract:webview_devtools_remote_<QA_PID>
import fs from 'node:fs/promises';
const pages=await(await fetch('http://127.0.0.1:9223/json')).json();
const target=pages.find(p=>p.url==='file:///android_asset/index.html');
if(!target)throw Error('QA WebView not found');
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject});
let seq=0;const pending=new Map();
ws.onmessage=e=>{const r=JSON.parse(e.data);if(pending.has(r.id)){const {resolve,reject}=pending.get(r.id);pending.delete(r.id);r.error?reject(Error(JSON.stringify(r.error))):resolve(r.result)}};
function call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})}
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
async function capture(name){await new Promise(r=>setTimeout(r,120));const r=await call('Page.captureScreenshot',{format:'png'});await fs.writeFile('output/qa/'+name+'.png',Buffer.from(r.data,'base64'))}
try {
 if(process.argv[2]==='ui'){
  const original=await evaluate('JSON.stringify({page,scroll:scrollY})');
  const reports=[];
  try{
   for(const route of ['home','books','chapter','stats','settings','appearance','calendar','collection']){
    reports.push(await evaluate(`(async()=>{page='${route}';render();window.scrollTo(0,0);await Promise.all([...document.images].map(i=>i.decode()));await Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})));return {page,overflow:document.documentElement.scrollWidth>innerWidth+1}})()`));
    await capture('ui-v060-'+route);
   }
   await evaluate(`page='settings';render();actions['learn-size']();Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{})))`);
   await capture('ui-v060-sheet');
  }finally{await evaluate(`document.querySelector('.modal-backdrop')?.remove();const prior=${original};page=prior.page;render();window.scrollTo(0,prior.scroll)`)}
  console.log(JSON.stringify(reports,null,2));
 } else if(process.argv[2]==='suite'){
  const reports=[];
  for(const page of ['content','books','chapter','preferences','morePrefs','appearance','topics','cloze','stats','calendar','backup','profile']){
   reports.push(await evaluate(`(()=>{page='${page}';render();return {page,overflow:document.documentElement.scrollWidth>innerWidth+1,buttons:document.querySelectorAll('button').length,text:document.body.innerText.length}})()`));await capture('v2-'+page);
  }
  const result=await evaluate(`(()=>{
   const click=s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click()};
   session=null;state.ranges[0]=[6];state.book=0;state.prefs.learnGroup=5;page='home';render();click('[data-start="learn"]');if(session.ids.length!==2)throw Error('Chapter range');
   click('[data-action="quiz"]');click('[data-answer="'+((questionFor(current())[2]+1)%4)+'"]');if(!state.records[current().id].wrong)throw Error('Wrong not saved');
   const first=JSON.stringify(state.attempts[0]);click('[data-action="note"]');document.querySelector('#note').value='真机测试：区分染色体数与 DNA 数';click('[data-action="save-note"]');
   click('[data-action="star"]');click('[data-action="add-folder"]');click('[data-action="new-folder"]');document.querySelector('#edit-text').value='易混概念';click('[data-action="save-folder"]');
   if(state.folders[0].ids[0]!==current().id)throw Error('Folder not populated');click('[data-action="exit"]');click('[data-action="pause-home"]');if(!document.querySelector('[data-action="resume"]'))throw Error('Resume missing');
   const raw=JSON.stringify({...state,schema:2});mergeImport(validateImport(raw));if(JSON.stringify(state.attempts[0])!==first)throw Error('First changed');
   return {attempts:state.attempts.length,notes:state.notes,folders:state.folders,activeSession:state.activeSession.pos,range:state.ranges[0]};
  })()`);await capture('v2-paused');
  console.log(JSON.stringify({reports,result},null,2));
 } else if(process.argv[2]==='capture'){console.log(await evaluate(process.argv[4]||'document.body.innerText'));await capture(process.argv[3]);}
 else console.log(JSON.stringify(await evaluate(process.argv[2]),null,2));
} finally {ws.close()}
