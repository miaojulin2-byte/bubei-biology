(async()=>{
 const before=JSON.stringify(state),reports={};
 const click=s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click()};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const noOverflow=label=>{if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Overflow '+label)};
 try{
  state=ReviewedStore.empty();bookQuery='';bookFilter='all';collectionQuery='';collectionTab='stars';collectionLimit=40;
  page='books';render();await Promise.all([...document.images].map(i=>i.decode()));
  if(document.images.length!==5)throw Error('Five textbook covers expected');
  click('[data-book-filter=optional]');if(document.images.length!==3)throw Error('Book filter');
  click('[data-book-filter=all]');const search=document.querySelector('#book-search');search.value='遗传';search.dispatchEvent(new Event('input',{bubbles:true}));
  if(document.images.length!==1||!document.images[0].src.endsWith('/covers/b2.jpg'))throw Error('Book search');
  bookQuery='';render();click('[data-book="2"]');click('[data-action=learn]');click('[data-action=reveal]');click('[data-rating=good]');
  const record=JSON.stringify(state.records),attempts=JSON.stringify(state.attempts);
  page='settings';render();click('[data-action=learn-size]');
  const modal=document.querySelector('.sheet');
  if(getComputedStyle(modal).animationDuration!=='0.5s')throw Error('Sheet entrance duration');
  click('[data-pref-choice=goal][data-value="15"]');await wait(520);if(state.goal!==15||document.querySelector('.modal-backdrop'))throw Error('Preference sheet did not save/close');
  click('[data-action=font-size]');click('[data-pref-choice=textSize][data-value="1.2"]');await wait(520);
  click('[data-action=mode]');click('[data-pref-choice=compact][data-value=true]');await wait(520);
  page='appearance';render();click('[data-theme=sage]');state=ReviewedStore.load();render();
  if(state.ui.textSize!==1.2||state.ui.theme!=='sage'||!state.ui.compact)throw Error('UI preference persistence');
  page='settings';render();const toggle=document.querySelector('#motion-toggle');toggle.checked=false;toggle.dispatchEvent(new Event('change',{bubbles:true}));
  if(BioMotion.enabled(uiPrefs())||document.body.dataset.motion!=='off')throw Error('Motion toggle');
  actions['review-size']();if(getComputedStyle(document.querySelector('.sheet')).animationName!=='none')throw Error('Motion disabled');window.appBack();await wait(30);if(document.querySelector('.modal-backdrop'))throw Error('Back did not close sheet');
  if(JSON.stringify(state.records)!==record||JSON.stringify(state.attempts)!==attempts)throw Error('Preferences changed memory records');
  for(const route of ['home','books','chapter','study','collection','stats','settings','more','appearance','calendar','profile','about']){page=route;render();await Promise.all([...document.images].map(i=>i.decode()));noOverflow(route);if(!document.querySelector('main'))throw Error('Route missing '+route)}
  page='home';render();if(document.body.innerText.includes('选择教材')||document.body.innerText.includes('继续上次'))throw Error('Unwanted home entry');
  reports.textbook_covers=5;reports.search_filter=true;reports.routes=12;reports.sheet_entrance_ms=500;reports.preferences_persisted=true;reports.records_unchanged=true;reports.motion_off=true;return reports;
 }finally{state=JSON.parse(before);ReviewedStore.save(state);bookQuery='';bookFilter='all';collectionQuery='';collectionTab='stars';page='home';render()}
})()
