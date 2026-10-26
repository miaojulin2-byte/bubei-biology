const BOOKS = [
 {name:'分子与细胞',sub:'必修 1',en:'MOLECULES & CELLS',color:'#a4b4a2'},
 {name:'遗传与进化',sub:'必修 2',en:'GENETICS & EVOLUTION',color:'#b2a3a9'},
 {name:'稳态与调节',sub:'选择性必修 1',en:'HOMEOSTASIS',color:'#b6aa8f'},
 {name:'生物与环境',sub:'选择性必修 2',en:'ECOLOGY',color:'#879e95'},
 {name:'生物技术与工程',sub:'选择性必修 3',en:'BIOTECHNOLOGY',color:'#899ba9'}
];

const leaf=`<svg viewBox="0 0 260 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="l" x2="1" y2="1"><stop stop-color="#586b54"/><stop offset="1" stop-color="#a1ad8a"/></linearGradient></defs><path d="M142 355C99 221 151 138 175 10" fill="none" stroke="#7f8d6b" stroke-width="2"/><g fill="url(#l)"><path d="M151 235C75 250 42 206 24 158c56-7 103 17 127 77Z"/><path d="M147 204C206 199 242 155 249 100c-68 7-95 44-102 104Z"/><path d="M154 154C100 158 68 115 64 72c53 11 85 42 90 82Z"/><path d="M165 104c40-15 58-52 53-89-40 13-53 43-53 89Z"/><path d="M137 302c-75-7-117-52-125-100 72 11 109 43 125 100Z"/></g><g stroke="#ced2b3" stroke-width=".7" opacity=".5" fill="none"><path d="M149 234 28 161M148 203l97-99M154 153 67 75M166 102l50-83M136 300 16 206"/></g></svg>`;

const CHAPTER_NAMES=[
 ['走近细胞','组成细胞的分子','细胞的基本结构','细胞的物质输入和输出','细胞的能量供应和利用','细胞的生命历程'],
 ['遗传因子的发现','基因和染色体的关系','基因的本质','基因的表达','基因突变及其他变异','生物的进化'],
 ['人体的内环境与稳态','神经调节','体液调节','免疫调节','植物生命活动的调节'],
 ['种群及其动态','群落及其演替','生态系统及其稳定性','人与环境'],
 ['发酵工程','细胞工程','基因工程','生物技术的安全性与伦理问题']
];
BOOKS.forEach((b,i)=>b.chapters=CHAPTER_NAMES[i]);
