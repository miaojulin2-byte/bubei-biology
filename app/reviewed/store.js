'use strict';
const ReviewedStore = (() => {
  const key = 'bubei-biology-reviewed-v1';
  const empty = () => ({schema:3, ui:{...UI_DEFAULTS}, book:0, goal:10, reviewLimit:20, ranges:{}, records:{}, attempts:[], exposures:{}, notes:{}, stars:[], checkins:[], session:null});
  const copy = value => JSON.parse(JSON.stringify(value));
  const ids = new Set(REVIEWED.cards.map(c=>c.id));
  function validate(data) {
    const plain=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
    const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
    if (!plain(data)||data.schema!==3||!plain(data.records)||!Array.isArray(data.attempts)||data.attempts.length>50000||!plain(data.exposures)||!plain(data.notes)||!Array.isArray(data.stars)||!Array.isArray(data.checkins)) throw Error('不是已审核题库的有效备份');
    if(!Number.isInteger(data.book)||data.book<0||data.book>4||![5,10,15,20].includes(data.goal))throw Error('学习设置无效');
    if(data.reviewLimit!==undefined&&![5,10,20,50].includes(data.reviewLimit))throw Error('每组复习数量无效');
    if(data.ui!==undefined){const u=data.ui;if(!plain(u)||!['rose','sage','sand'].includes(u.theme)||![1,1.1,1.2].includes(u.textSize)||typeof u.motion!=='boolean'||typeof u.compact!=='boolean')throw Error('界面偏好无效')}
    if(data.ranges!==undefined){if(!plain(data.ranges))throw Error('章节范围无效');for(const [book,chapters]of Object.entries(data.ranges)){if(!/^[0-4]$/.test(book)||!Array.isArray(chapters)||new Set(chapters).size!==chapters.length||chapters.some(ch=>!Number.isInteger(ch)||!REVIEWED.cards.some(c=>c.book===Number(book)&&c.chapter===ch)))throw Error('章节范围无效')}}
    for(const [id,r] of Object.entries(data.records))if(!ids.has(id)||!plain(r)||!BioScheduler.valid(r.fsrs)||!number(r.lastAt)||!number(r.due)||r.due!==Date.parse(r.fsrs.due))throw Error('复习状态无效');
    for(const a of data.attempts)if(!plain(a)||!ids.has(a.id)||!number(a.at)||!['again','hard','good','easy'].includes(a.rating)||!['learn','review','practice'].includes(a.kind))throw Error('评分记录无效');
    for(const [id,at] of Object.entries(data.exposures))if(!ids.has(id)||!number(at))throw Error('曝光记录无效');
    for(const [id,note] of Object.entries(data.notes))if(!ids.has(id)||typeof note!=='string'||note.length>100000)throw Error('笔记无效');
    if(data.stars.some(id=>!ids.has(id))||data.checkins.some(x=>typeof x!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(x)))throw Error('收藏或签到无效');
    if(data.session){const s=data.session;if(!plain(s)||!Array.isArray(s.ids)||!s.ids.length||s.ids.some(id=>!ids.has(id))||new Set(s.ids).size!==s.ids.length||!Number.isInteger(s.pos)||s.pos<0||s.pos>s.ids.length||!['learn','review','practice'].includes(s.kind)||typeof s.revealed!=='boolean'||typeof s.rated!=='boolean'||(s.rated&&!s.revealed))throw Error('学习进度无效')}
    return data;
  }
  function save(state){validate(state);localStorage.setItem(key,JSON.stringify(state));return state}
  function load(){const raw=localStorage.getItem(key);return raw?{...empty(),...validate(JSON.parse(raw))}:empty()}
  function transact(state,change){const next=copy(state);change(next);save(next);return next}
  function merge(current,incoming){validate(incoming);return transact(current,next=>{
    for(const [id,r]of Object.entries(incoming.records))if(!next.records[id]||r.lastAt>next.records[id].lastAt)next.records[id]=copy(r);
    const seen=new Set(next.attempts.map(a=>[a.id,a.at,a.rating].join('|')));
    for(const a of incoming.attempts){const k=[a.id,a.at,a.rating].join('|');if(!seen.has(k)){next.attempts.push(copy(a));seen.add(k)}}
    next.attempts.sort((a,b)=>a.at-b.at);
    for(const [id,at]of Object.entries(incoming.exposures))next.exposures[id]=Math.min(next.exposures[id]??Infinity,at);
    for(const [id,n]of Object.entries(incoming.notes))if(n&&!next.notes[id])next.notes[id]=n;else if(n&&next.notes[id]!==n&&!next.notes[id].includes('\n\n—— 导入笔记 ——\n'+n))next.notes[id]+='\n\n—— 导入笔记 ——\n'+n;
    next.stars=[...new Set([...next.stars,...incoming.stars])];next.checkins=[...new Set([...next.checkins,...incoming.checkins])];
  })}
  return {key,empty,load,save,transact,validate,merge};
})();
