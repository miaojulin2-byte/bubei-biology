(async()=>{
 const before=JSON.stringify(state), results={cards:0,books:[],routes:[]};
 const click=s=>{const el=document.querySelector(s);if(!el)throw Error('Missing '+s);el.click()};
 const width=()=>{if(document.documentElement.scrollWidth>innerWidth+1)throw Error('Horizontal overflow')};
 try{
  if(loadError)throw Error(loadError);
  for(const c of cards){
   state.session=AnkiCore.createSession([c]);page='study';render();
   if(document.querySelector('.basic-answer'))throw Error('Answer visible before reveal: '+c.id);
   click('[data-action=reveal]');
   await Promise.all([...document.images].map(i=>i.decode()));width();results.cards++;
  }
  state=ReviewedStore.empty();page='books';render();
  for(let b=0;b<5;b++){
   page='books';render();click('[data-book="'+b+'"]');click('[data-action=learn]');
   if(page!=='study'||!state.session.ids.every(id=>byId(id).book===b))throw Error('Wrong textbook '+b);
   if(b===0){click('[data-action=reveal]');click('[data-rating=good]');}
   if(state.attempts.length!==1)throw Error('Lost or fabricated rating');
   results.books.push(b);
  }
  const r=Object.values(state.records)[0];if(r.scheduler!=='FSRS-6'||!(r.due>Date.now()))throw Error('FSRS scheduling failed');
  for(const route of ['home','books','chapter','study','collection','stats','settings']){page=route;render();width();results.routes.push(route);}
  page='home';render();if(document.body.innerText.includes('继续上次')||document.body.innerText.includes('选择教材')||!document.querySelector('[aria-label="知识书"]'))throw Error('Unexpected home shortcut or missing book navigation');
  results.fsrs=true;results.switch_preserves_record=true;return results;
 }finally{state=JSON.parse(before);ReviewedStore.save(state);page='home';render();}
})()
