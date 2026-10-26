'use strict';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cards=REVIEWED.cards,byId=id=>cards.find(c=>c.id===id),$=s=>document.querySelector(s);
const dateKey=(at=Date.now())=>{const d=new Date(at);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
let state,page='home',selected=null,query='',pending=null,loadError=null;
let lastRender=null,detailBack='collection';const routeScroll={};
try{state=ReviewedStore.load()}catch(e){state=ReviewedStore.empty();loadError=e.message}
function toast(message){$('#toast').textContent=message;$('#toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').style.display='none',3200)}
function change(fn){if(loadError)throw Error('已有记录无法读取，请先导出原始记录再恢复有效备份');state=ReviewedStore.transact(state,fn)}
const due=()=>cards.filter(c=>state.records[c.id]?.due<=Date.now()).sort((a,b)=>state.records[a.id].due-state.records[b.id].due);
const inRange=c=>!Object.hasOwn(state.ranges||{},c.book)||(state.ranges[c.book]||[]).includes(c.chapter);
function reviewQueue(){const seen=new Map();for(const a of state.attempts)if(dateKey(a.at)===dateKey()){const note=byId(a.id)?.note_id;if(note&&!seen.has(note))seen.set(note,a.id)}return due().filter(c=>{if(seen.has(c.note_id)&&seen.get(c.note_id)!==c.id)return false;seen.set(c.note_id,c.id);return true})}
const learnedToday=()=>new Set(state.attempts.filter(a=>a.kind==='learn'&&dateKey(a.at)===dateKey()).map(a=>a.id)).size;
// Do not expose sibling clozes as separate unseen items in the same day's study.
function unseen(){const siblings=new Set(state.attempts.filter(a=>dateKey(a.at)===dateKey()).map(a=>byId(a.id)?.note_id));const chosen=new Set();return cards.filter(c=>{if(c.book!==state.book||!inRange(c)||state.records[c.id]||siblings.has(c.note_id)||chosen.has(c.note_id))return false;chosen.add(c.note_id);return true})}
const title=c=>c.parts.map(p=>p.hidden?' […] ':p.text).join('').replace(/\s+/g,' ').slice(0,62);
const button=(label,action,cls='secondary')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
const head=(label,back='home')=>`<header class="top"><button data-go="${back}" aria-label="返回">${uiIcon('back')}</button><h1>${label}</h1><span class="small">不背生物</span></header>`;
const wrap=(label,body,back='home')=>`<main class="page original-content">${head(label,back)}${body}</main>`;
function item(c){return `<button class="list-item" data-card="${c.id}"><span class="spacer"><b>${esc(title(c))}</b><div class="subtitle">${BOOKS[c.book].sub} · 第 ${c.chapter} 章</div></span><span class="small">${state.records[c.id]?'已学':'未学'} ›</span></button>`}

function home(){const d=new Date();return `<main class="original-home"><button class="profile-bubble" data-go="profile" aria-label="个人中心"><span>生</span></button><div class="botanical-wallpaper">${leaf}</div><button class="checkin-card" data-action="checkin">${uiIcon('calendar')}<b>${state.checkins.includes(dateKey())?'已签到':'签到'}</b><span>${d.getMonth()+1}/${d.getDate()} ${['Sun.','Mon.','Tue.','Wed.','Thu.','Fri.','Sat.'][d.getDay()]}</span></button><div class="home-learn-pair"><button data-action="learn"><strong>Learn</strong><span>${Math.min(unseen().length,state.goal)}</span></button><button data-action="review"><strong>Review</strong><span>${reviewQueue().length}</span></button></div><nav class="home-nav"><button data-go="books" aria-label="知识书">${uiIcon('books')}</button><button data-go="collection" aria-label="我的内容">${uiIcon('collection')}</button><button data-go="stats" aria-label="学习数据">${uiIcon('chart')}</button></nav></main>`}
function study(){const s=state.session;if(!s)return wrap('学习','<p>还没有开始学习。</p>'+button('开始学习','learn'));if(s.pos>=s.ids.length)return wrap('本组完成',`<div class="welcome"><h2>今天，又记住了一点。</h2><p>完成 ${s.ids.length} 张卡片，后续复习已安排。</p></div>${button('返回首页','finish','primary wide')}<div class="completion-actions"><button data-go="stats">查看我的学习</button><button data-go="books">知识书</button></div>`);const c=byId(s.ids[s.pos]),b=BOOKS[c.book];let ratings='';if(s.revealed&&!s.rated){const now=Date.now();ratings=BioScheduler.preview(state.records[c.id],now).map((r,i)=>`<button data-rating="${r.rating}"><b>${['忘记','困难','记得','轻松'][i]}</b><small>${interval(r.due-now)}</small></button>`).join('')}
return `<main class="study reviewed-study"><header class="top"><button data-go="home" aria-label="退出并保存进度">${uiIcon('down')}</button><span class="small">${s.pos+1} / ${s.ids.length}</span><span class="spacer"></span><button data-action="star" aria-label="${state.stars.includes(c.id)?'取消收藏':'收藏'}">${uiIcon('star',state.stars.includes(c.id)?'is-starred':'')}</button></header><div class="progress"><i style="width:${s.pos/s.ids.length*100}%"></i></div><div class="study-heading"><div class="en">${s.kind==='review'?'REVIEW':'LEARN'}</div><h1>${b.name}</h1><div class="tagline">${b.sub} · ${chapterName(c.book,c.chapter)}</div></div><section class="study-box cloze-body">${AnkiCore.render(c,s.revealed)}</section>${s.revealed?`<p class="small study-reminder">按刚才的回想选择记忆程度</p>${button('写笔记','note')}${state.notes[c.id]?`<p class="note-text">${esc(state.notes[c.id])}</p>`:''}`:'<p class="small">先回想完整答案，再翻开核对。</p>'}${s.rated?'<p class="small">评分已保存，下一次复习时间已更新。</p>':''}</main><footer class="study-bottom reviewed-bottom">${!s.revealed?button('显示答案','reveal','primary wide'):s.rated?button('下一张','next','primary wide'):`<div class="ratings">${ratings}</div>`}</footer>`}
function interval(ms){const m=Math.max(1,Math.round(ms/60000));return m<60?m+' 分钟':m<1440?Math.round(m/60)+' 小时':Math.round(m/1440)+' 天'}
function detail(){const c=byId(selected);return wrap('卡片详情',`<section class="study-box cloze-body">${AnkiCore.render(c,true)}</section><div class="detail-tools">${button(state.stars.includes(c.id)?'取消收藏':'收藏','star')}${button('写笔记','note')}${button('记忆','practice')}</div><p class="note-text">${esc(state.notes[c.id]||'')}</p>`,detailBack)}
function render(){
 const root=$('#app'),pref=uiPrefs();
 if(document.body){document.body.dataset.theme=pref.theme;document.body.dataset.motion=pref.motion?'on':'off';document.body.dataset.compact=pref.compact?'on':'off'}
 document.documentElement?.style?.setProperty?.('--memory-text-scale',pref.textSize);
 if(loadError){root.innerHTML=wrap('记录读取失败',`<p>${esc(loadError)}</p><p>原始数据已保留，请先导出以便修复。</p>${button('导出原始记录','raw')}`);return}
 const currentCard=page==='study'?state.session?.ids[state.session.pos]:null;
 const current={page,card:currentCard,revealed:state.session?.revealed};
 const offset=window.scrollY||0;if(lastRender&&lastRender.page!==page)routeScroll[lastRender.page]=offset;
 root.innerHTML=({home,books:uiBooks,chapter:uiChapter,study,detail,collection:uiCollection,stats:uiStats,settings:uiSettings,more:uiMore,appearance:uiAppearance,calendar:uiCalendar,profile:uiProfile,about:uiAbout}[page]||home)();
 let kind=null;
 if(lastRender?.page!==page)kind=['stats','settings'].includes(page)&&['stats','settings'].includes(lastRender?.page)?'tab':'route';
 else if(currentCard&&lastRender.card!==currentCard)kind='card';
 else if(page==='study'&&current.revealed&&!lastRender?.revealed)kind='reveal';
 if(kind){const el=kind==='reveal'?root.querySelector?.('.basic-answer')||root.querySelector?.('.cloze-body'):kind==='card'?root.querySelector?.('.cloze-body'):root.querySelector?.('main');BioMotion.enter(el,kind,pref)}
 window.scrollTo(0,page==='study'&&(['route','card'].includes(kind))?0:lastRender?.page===page?offset:routeScroll[page]||0);
 lastRender=current;
}
function start(kind,ids){let list=ids?ids.map(byId):kind==='review'?reviewQueue().slice(0,state.reviewLimit||20):unseen().slice(0,state.goal);if(!list.length){toast(kind==='review'?(due().length?'同笔记的其他填空留待明天复习':'暂时没有到期复习'):'所选章节暂无新卡，可以选择其他教材或章节');return}change(s=>{s.session=AnkiCore.createSession(list,kind)});page='study';render()}
function exportText(text){if(window.Android?.saveRecord){window.Android.saveRecord(text);return}const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download='不背生物-'+dateKey()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function showModal(html){
 document.querySelector('.modal-backdrop')?.remove();
 const el=document.createElement('div');el.className='modal-backdrop';
 el.innerHTML=`<section class="sheet memory-sheet" role="dialog" aria-modal="true" tabindex="-1"><div class="sheet-handle" aria-hidden="true"></div>${html}<button class="sheet-close" data-action="close" aria-label="关闭">${uiIcon('close')}</button></section>`;
 el.addEventListener('click',event=>{if(event.target===el)closeModal()});
 document.body.append(el);el.querySelector('.sheet').focus({preventScroll:true});
}
function closeModal(){const el=document.querySelector('.modal-backdrop');if(!el||el.dataset.closing)return;el.dataset.closing='true';el.classList.add('is-closing');setTimeout(()=>el.remove(),BioMotion.enabled(uiPrefs())?460:0)}
function preferenceChoices(kind,label,values,current){showModal(`<h3>${label}</h3><div class="sheet-options">${values.map(([value,text])=>`<button data-pref-choice="${kind}" data-value="${value}" aria-pressed="${String(value)===String(current)}"><span>${text}</span>${String(value)===String(current)?uiIcon('check'):''}</button>`).join('')}</div>`)}
function setUi(key,value){change(s=>{s.ui={...UI_DEFAULTS,...s.ui,[key]:value}})}
window.receiveBackup=raw=>{try{if(typeof raw!=='string'||raw.length>8000000)throw Error('文件过大');pending=ReviewedStore.validate(JSON.parse(raw));showModal(`<h3>恢复预览</h3><p>${Object.keys(pending.records).length} 张卡片，${pending.attempts.length} 次评分。</p><p>合并记录、保留笔记，不替换当前学习组和偏好。</p>${button('确认合并','merge','primary wide')}`)}catch(e){pending=null;toast('无法恢复：'+e.message)}};
const actions={
 'all-chapters':()=>{change(s=>{s.ranges||={};delete s.ranges[s.book]});render()},
 learn:()=>start('learn'),review:()=>start('review'),practice:()=>start('practice',[selected]),
 reveal:()=>{change(s=>AnkiCore.reveal(s.session,s));render();$('#app').querySelector?.('.basic-answer')?.scrollIntoView({block:'nearest',behavior:BioMotion.enabled(uiPrefs())?'smooth':'auto'})},
 next:()=>{change(s=>AnkiCore.next(s.session));render()},
 finish:()=>{change(s=>{s.session=null});page='home';render()},
 checkin:()=>{change(s=>{if(!s.checkins.includes(dateKey()))s.checkins.push(dateKey())});render();showModal(`<div class="checkin-success">${uiIcon('calendar')}<h3>今日已签到</h3><p>每一次回想，都会留下积累。</p><button class="primary wide" data-go="calendar">查看学习日历</button></div>`)},
 star:()=>{const id=page==='study'?state.session.ids[state.session.pos]:selected;change(s=>{s.stars=s.stars.includes(id)?s.stars.filter(x=>x!==id):[...s.stars,id]});render()},
 note:()=>{const id=page==='study'?state.session.ids[state.session.pos]:selected;selected=id;showModal(`<h3>我的笔记</h3><textarea id="note" maxlength="100000" aria-label="笔记内容">${esc(state.notes[id]||'')}</textarea>${button('保存笔记','save-note','primary wide')}`)},
 'save-note':()=>{const value=$('#note').value;change(s=>{s.notes[selected]=value});actions.close();render()},
 close:closeModal,
 'learn-size':()=>preferenceChoices('goal','学习节奏',[5,10,15,20].map(n=>[n,n+' 张／小结']),state.goal),
 'review-size':()=>preferenceChoices('reviewLimit','复习节奏',[5,10,20,50].map(n=>[n,n+' 张／组']),state.reviewLimit||20),
 'font-size':()=>preferenceChoices('textSize','字体大小',[[1,'标准'],[1.1,'大'],[1.2,'更大']],uiPrefs().textSize),
 mode:()=>preferenceChoices('compact','学习模式',[[false,'丰富模式'],[true,'简洁模式']],uiPrefs().compact),
 algorithm:()=>showModal('<h3>FSRS-6</h3><p class="sheet-caption">根据每张卡片的记忆记录安排复习，目标保持率为90%。翻开答案后，选择忘记、困难、记得或轻松。</p>'),
 'collection-more':()=>{collectionLimit+=40;render()},
 export:()=>exportText(JSON.stringify(state,null,2)),legacy:()=>exportText(localStorage.getItem('bubei-biology-v1')),raw:()=>exportText(localStorage.getItem(ReviewedStore.key)),
 import:()=>{if(window.Android?.openRecord){window.Android.openRecord();return}const input=document.createElement('input');input.type='file';input.accept='.json';input.onchange=async()=>{if(input.files[0])window.receiveBackup(await input.files[0].text())};input.click()},
 merge:()=>{if(!pending)return;state=ReviewedStore.merge(state,pending);pending=null;actions.close();render();toast('备份已合并')}
};
document.addEventListener('click',event=>{
 const el=event.target.closest('button');if(!el)return;
 try{
  if(el.dataset.go){document.querySelector('.modal-backdrop')?.remove();page=el.dataset.go;render()}
  else if(el.dataset.book!==undefined){change(s=>{s.book=Number(el.dataset.book)});query='';page='chapter';render()}
  else if(el.dataset.bookFilter){bookFilter=el.dataset.bookFilter;render()}
  else if(el.dataset.collectionTab){collectionTab=el.dataset.collectionTab;collectionLimit=40;render()}
  else if(el.dataset.theme){setUi('theme',el.dataset.theme);render()}
  else if(el.dataset.month){calendarMonth=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(el.dataset.month),1);render()}
  else if(el.dataset.day){calendarDay=el.dataset.day;render()}
  else if(el.dataset.prefChoice){const key=el.dataset.prefChoice,value=el.dataset.value;if(['goal','reviewLimit'].includes(key))change(s=>{s[key]=Number(value)});else if(key==='compact')setUi(key,value==='true');else if(key==='textSize')setUi(key,Number(value));closeModal();render()}
  else if(el.dataset.card){detailBack=page;selected=el.dataset.card;change(s=>{s.exposures[selected]??=Date.now()});page='detail';render()}
  else if(el.dataset.rating){change(s=>AnkiCore.rate(s.session,s,el.dataset.rating));render()}
  else if(el.dataset.action)actions[el.dataset.action]?.();
 }catch(e){toast('未保存：'+e.message)}
});
document.addEventListener('change',e=>{try{if(e.target.id==='motion-toggle'){setUi('motion',e.target.checked);render()}else if(e.target.id==='goal')change(s=>{s.goal=Number(e.target.value)});else if(e.target.id==='review-limit')change(s=>{s.reviewLimit=Number(e.target.value)});else if(e.target.dataset.chapter){const ch=Number(e.target.dataset.chapter),checked=e.target.checked;change(s=>{s.ranges||={};const current=s.ranges[s.book]||[...new Set(cards.filter(c=>c.book===s.book).map(c=>c.chapter))];s.ranges[s.book]=checked?[...new Set([...current,ch])]:current.filter(x=>x!==ch)})}}catch(err){toast(err.message);render()}});
document.addEventListener('input',e=>{const id=e.target.id;if(!['search','book-search','collection-search'].includes(id))return;const pos=e.target.selectionStart;if(id==='search')query=e.target.value;else if(id==='book-search')bookQuery=e.target.value;else {collectionQuery=e.target.value;collectionLimit=40}render();$('#'+id).focus();$('#'+id).setSelectionRange(pos,pos)});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();if(e.key==='Tab'){const sheet=document.querySelector('.modal-backdrop .sheet');if(!sheet)return;const nodes=[...sheet.querySelectorAll('button,input,textarea,select,[tabindex="0"]')].filter(x=>!x.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===sheet)){last.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===last){first.focus();e.preventDefault()}}});
window.appBack=()=>{if(document.querySelector('.modal-backdrop')){closeModal();return true}if(page==='home')return false;page=({chapter:'books',detail:detailBack,more:'settings',appearance:'settings',calendar:'stats',about:'profile'})[page]||'home';render();return true};
render();
