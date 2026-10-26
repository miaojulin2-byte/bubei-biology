'use strict';
const UI_DEFAULTS=Object.freeze({theme:'rose',textSize:1,motion:true,compact:false});
const ICON_PATHS={
 back:'M15 5 8 12l7 7',down:'m5 9 7 7 7-7',next:'m9 5 7 7-7 7',
 book:'M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Zm9 1v15',
 books:'m3 8 9-5 9 5-9 5-9-5Zm3 3v7l6 3 6-3v-7',
 collection:'M5 8h14a1 1 0 0 1 1 1l-1 12H5L4 9a1 1 0 0 1 1-1ZM7 3h10M5 5h14M10 14h4',
 chart:'M4 3v18h17M8 15l4-5 4 2 5-8',calendar:'M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-3v6m10-6v6M3 10h18M7 14h.01m5 0h.01m5 0h.01M7 17h.01m5 0h.01',
 settings:'m9 3 1-2h4l1 2 2 1 2-.2 2 3-1 2v3l1 2-2 3-2-.2-2 1-1 2h-4l-1-2-2-1-2 .2-2-3 1-2V9L3 7l2-3 2 .2ZM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 search:'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15ZM16 16l5 5',star:'m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z',
 note:'M5 3h10l4 4v14H5ZM9 11h6m-6 4h6m-6 3h4',check:'m5 12 4 4L19 6',close:'m6 6 12 12M6 18 18 6',type:'M4 5h16M12 5v15M8 20h8',palette:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-4c-1-1 0-3 2-3h2a3 3 0 0 0 3-3 9 9 0 0 0-9-8ZM7 9h.01m4-3h.01m5 2h.01M6 14h.01'
};
const uiIcon=(name,cls='')=>`<svg class="ui-icon ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON_PATHS[name]||ICON_PATHS.book}"/></svg>`;
const BioMotion=Object.freeze({
 enabled(prefs){return prefs.motion!==false&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches},
 enter(el,kind,prefs){
  if(!el?.animate||!this.enabled(prefs))return;
  const frames=kind==='card'?[{opacity:0,transform:'translateX(24px)'},{opacity:1,transform:'translateX(0)'}]:kind==='reveal'?[{opacity:.2,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}]:kind==='tab'?[{opacity:.5,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}]:[{opacity:.2,transform:'translateY(24px)'},{opacity:1,transform:'translateY(0)'}];
  return el.animate(frames,{duration:kind==='card'?300:kind==='reveal'?220:kind==='tab'?200:360,easing:'cubic-bezier(.22,1,.36,1)'});
 }
});
