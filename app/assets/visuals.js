// Data panels mirror the quantities in the question; no answer is embedded.
const MATERIALS={
 '净光合速率':{q:{title:'叶片每小时气体交换记录',headers:['测量项目','CO₂ 量'],rows:[['净吸收','8 mg'],['同条件呼吸释放','2 mg']]}},
 '基因频率与隔离':{q:{title:'二倍体种群抽样结果',headers:['基因型','所占比例'],rows:[['AA','40%'],['Aa','40%'],['aa','20%']]}},
 '能量传递计算':{q:{title:'相邻营养级的同化能量',headers:['营养级','同化量'],rows:[['生产者','10 000 kJ'],['初级消费者','1 500 kJ']]},v:{title:'某动物能量收支记录',headers:['项目','能量'],rows:[['摄入','100 kJ'],['粪便排出','30 kJ']]}},
 '种群密度调查':{v:{title:'标记重捕记录',headers:['项目','数量'],rows:[['首次捕获并标记','40 只'],['第二次捕获','50 只'],['第二次其中已标记','10 只']]}},
 '群落结构与生态位':{q:{title:'两个样地的调查结果',headers:['样地','物种数','个体数'],rows:[['甲','10 种','100 株'],['乙','5 种','200 株']]}},
 '遗传病调查':{q:{title:'随机抽样调查记录',headers:['项目','人数'],rows:[['调查总人数','2 000'],['患者人数','4']]}},
 'DNA 双螺旋':{q:{title:'双链 DNA 的碱基组成',headers:['碱基','占全部碱基比例'],rows:[['A','20%'],['T','待推断'],['G','待推断'],['C','待推断']]}},
 '测交':{v:{title:'杂交组合',flow:['AaBb','×','aabb'],caption:'两对基因独立遗传'}},
 '伴 X 隐性遗传':{v:{title:'亲本基因型',flow:['母 XᴬXᵃ','×','父 XᴬY'],caption:'仅计算儿子中的隐性性状比例'}},
 '食物链与营养级':{q:{title:'捕食食物链',flow:['草','→','兔','→','狐'],caption:'箭头表示物质与能量的传递方向'}}
};
function materialFor(c,variant){const m=MATERIALS[c.title]?.[variant];if(!m)return '';return `<figure class="question-material"><figcaption>${m.title}</figcaption>${m.rows?`<table><thead><tr>${m.headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${m.rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`:`<div class="flow-material">${m.flow.map((x,i)=>`<span class="${i%2?'arrow':'node'}">${x}</span>`).join('')}</div><small>${m.caption}</small>`}</figure>`}
