const $=id=>document.getElementById(id);
const POSITIONS=[{x:54.0,y:25.0},{x:32.0,y:32.0},{x:78.0,y:35.4},{x:23.5,y:47.5},{x:54.9,y:51.1},{x:82.1,y:51.0}];
const state={report:null,abort:null,selected:null,mode:'',lastFocus:null};
const safeText=x=>String(x??'');
const line=(text,n=60)=>safeText(text).replace(/\s+/g,' ').trim().slice(0,n);
const element=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
const emptyReport=notice=>({mode:'empty',summary:'填写上方两个输入框，种下你的机会树',goal:'等待你的目标',keywords:[],sourceCount:0,groups:[],notice:notice||'尚未发起搜索，当前没有人物推荐。可点击「体验示例数据」查看明确标注的静态案例。'});
function setPage(id){
  // 输入页与结果树在同一长页面中，加载信息只在输入区下方临时显示。
  $('entryPage').hidden=false; $('resultPage').hidden=false; $('loadingPage').hidden=id!=='loadingPage';
  if(id==='resultPage')$('resultPage').scrollIntoView({behavior:'smooth',block:'start'});
  if(id==='entryPage')$('exploreForm').scrollIntoView({behavior:'smooth',block:'center'});
}
function toast(text){const el=$('toast');el.textContent=text;el.hidden=false;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.hidden=true,4200);}
async function refreshStatus(){try{const res=await fetch('/api/status',{cache:'no-store'});const d=await res.json();const live=d.searchConfigured&&d.modelConfigured;const info=$('apiStatus');info.textContent=live?'● 两项配置已读取；连通性和额度以实际搜索结果为准。':`○ 真实搜索尚未就绪（元宝搜索：${d.searchConfigured?'已配置':'缺少 Key'}；大模型：${d.modelConfigured?'已配置':'缺少 Key'}）。需在服务端 .env.local 中配置后启动。`;info.classList.toggle('warn',!live);}catch{$('apiStatus').textContent='请通过本地 Node 服务运行本页；直接双击 HTML 无法调用 API。';$('apiStatus').classList.add('warn');}}
function demoReport(){
  // Curated public-source sample, not from a live Yuanbao request. Each factual profile links to an official source.
  const about='对 AI 产品、创业和增长感兴趣的大学生（示例）';
  const goal='希望认识 AI 创业者、投资人与创业导师（示例）';
  return {mode:'curated',summary:line(about,55),goal:line(goal,65),keywords:['AI 产品','创业','合作探索'],sourceCount:5,notice:'这是已附公开原始资料的静态案例，不是本次输入的实时匹配；真实个性化推荐请配置两个 API Key 后点击「种下我的机会树」。',groups:[
    {id:'r1',label:'AI 创业者',people:[{id:'real-1',name:'王小川',identity:'百川智能创始人',organization:'百川智能',intro:'百川智能官方介绍显示，公司由前搜狗创始人兼 CEO 王小川创立，专注人工智能技术与应用。',common:['如果你有 AI 产品或用户增长经历，与百川智能的 AI 应用方向存在主题交集，不代表双方认识。'],collaborate:['可以从 AI 应用场景、用户反馈和产品体验研究准备讨论材料。'],connection:['百川智能官方招聘网站列有日常实习入口，面向在校生；具体岗位以官网实时公告为准。'],conclusion:'如果希望进入 AI 产品领域，公开实习与作品案例是比直接联系创始人更现实的起点。',sources:[{title:'百川智能官网 · 关于我们',url:'https://www.baichuan-ai.com/',site:'百川智能'},{title:'百川智能官方校园与日常实习招聘',url:'https://careers.baichuan-inc.com/',site:'百川智能招聘'}]}]},
    {id:'r2',label:'投资人',people:[{id:'real-2',name:'徐小平',identity:'真格基金创始人',organization:'真格基金',intro:'真格基金官方团队页面介绍徐小平为创始人，机构长期关注早期创业者。',common:['如果你正在做创业项目，早期创业投资是你的目标领域，但这并不是既有社交联系。'],collaborate:['先准备可验证的用户需求、产品演示与早期增长数据，再判断项目是否适合接触早期投资机构。'],connection:['真格基金官方网站公开提供 BP 投递入口；是否适合投递及机构是否回复需以实际情况为准。'],conclusion:'先形成有数据、有验证的项目材料，再通过真格基金的公开商业渠道接触。',sources:[{title:'真格基金 · 创始团队',url:'https://www.zhenfund.com/Team.aspx',site:'真格基金'},{title:'真格基金官方网站 · 商业计划书渠道',url:'https://www.zhenfund.com/zh',site:'真格基金'}]}]},
    {id:'r3',label:'行业导师',people:[{id:'real-3',name:'李善友',identity:'混沌学园创办人',organization:'混沌学园',intro:'混沌学园官网介绍，李善友是混沌创办人，聚焦创新思维与创业教育。',common:['如果你关注创新创业，可通过其公开课程和创新方法了解同一主题。'],collaborate:['先把自己的产品问题整理成明确案例，通过公开学习与交流场景研究其创新方法。'],connection:['混沌学园官网公开了课程和学习产品；课程参与不等于能够直接认识本人。'],conclusion:'从公开课程与实践案例入手，建立可讨论的话题，再寻找合规公开活动。',sources:[{title:'混沌学园 · 关于我们',url:'https://b.hundun.cn/about',site:'混沌学园'},{title:'混沌学园 · 第二曲线课程',url:'https://b.hundun.cn/course/intro/be19f14be704d03553d99e1052654272',site:'混沌学园'}]}]}
  ]};
}
function updatePoster(report){
  const groups=report.groups||[];
  const layer=$('fruitLayer');layer.replaceChildren();
  for(let i=0;i<6;i++){
    const role=groups[i];const pos=POSITIONS[i];const btn=element('button','fruit');btn.type='button';btn.style.left=pos.x+'%';btn.style.top=pos.y+'%';btn.dataset.index=String(i);
    const label=role?.label||'等待发现',count=role?.people?.length||0;
    btn.setAttribute('aria-label',`${label}：${count} 位人物`);
    btn.append(element('span','fruitName'+(!role?' fruitLabelSecondary':''),line(label,9)),element('span','fruitCount',count?`${count} 位人物`:'尚无线索'));
    btn.addEventListener('click',()=>showGroup(i));layer.append(btn);
  }
  $('summaryText').textContent=report.summary||'从你填写的经历出发';
  $('goalText').textContent=report.goal||'寻找值得探索的人物与机会';
  const keywordLayer=$('keywordChips');keywordLayer.replaceChildren();
  (report.keywords||[]).slice(0,3).forEach(k=>keywordLayer.append(element('span','',line(k,10))));
  const n=groups.reduce((acc,r)=>acc+(r.people?.length||0),0),cats=groups.filter(r=>r.people?.length).length;
  $('countsText').textContent=`${cats} 个有线索的方向  ·  ${n} 位值得了解的人`;
  $('posterMark').hidden=report.mode==='live';$('posterMark').textContent=report.mode==='curated'?'静态公开案例 · 非实时匹配':'尚未生成实时结果';
  $('savePoster').disabled=report.mode==='empty';
  $('reportSummary').textContent=[report.notice||`本次检索获得 ${report.sourceCount} 条去重公开来源。`,report.verificationBasis,...(report.warnings||[])].filter(Boolean).join(' ');
}
function showResult(report){state.report=report;updatePoster(report);setPage('resultPage');}
function listItems(items){const ul=element('ul');items.forEach(item=>ul.append(element('li','',item)));return ul;}
function section(parent,title,contents){const s=element('section','detailSection');s.append(element('h3','',title));if(Array.isArray(contents)){s.append(contents.length?listItems(contents):element('p','','暂无可靠信息。'));}else{s.append(element('p','',contents||'暂无可靠信息。'));}parent.append(s);return s;}
function openDrawer(){if(!$('drawer').classList.contains('open'))state.lastFocus=document.activeElement;$('modalOverlay').hidden=false;$('drawer').classList.add('open');$('drawer').setAttribute('aria-hidden','false');$('drawer').inert=false;document.querySelector('main').inert=true;document.body.style.overflow='hidden';$('drawer').focus();}
function closeDrawer(){document.body.style.overflow='';$('modalOverlay').hidden=true;$('drawer').classList.remove('open');$('drawer').setAttribute('aria-hidden','true');$('drawer').inert=true;document.querySelector('main').inert=false;state.selected=null;state.lastFocus?.focus?.();}
function showGroup(i){if(!state.report)return;state.selected=i;const group=state.report.groups[i];$('drawerHeading').textContent=group?.label||'尚未发现';$('drawerBack').hidden=true;const area=$('drawerContents');area.replaceChildren();area.append(element('p','sheetEyebrow','CONNECTION / ROLE'),element('h2','sheetTitle',group?.label||'等待发现'));
  if(!group?.people?.length){area.append(element('div','empty','这个方向还没找到具名且有可靠来源的公开人物。可以补充背景，或者换一个目标重新探索。'));}
  else {area.append(element('p','sheetSubtitle',`找到 ${group.people.length} 位有公开资料的人物。点击人物，查看共同点与可能的连接入口。`));
    group.people.forEach((p,j)=>{const btn=element('button','personBtn');btn.type='button';btn.append(element('span','personAvatar',String(j+1).padStart(2,'0')));const body=element('span','personBtnText');body.append(element('div','personBtnName',p.name),element('div','personBtnRole',p.identity+(p.organization?` · ${p.organization}`:'')));btn.append(body,element('span','', '›'));btn.addEventListener('click',()=>showPerson(i,j));area.append(btn);});}
  if(state.report.mode==='curated')area.append(element('div','evidenceNote','静态公开案例：真实人物及官方来源，但不是当前输入的实时匹配或元宝搜索结果。'));
  openDrawer();
}
function showPerson(i,j){const p=state.report?.groups?.[i]?.people?.[j];if(!p)return;state.selected=i;$('drawerHeading').textContent='人物连接报告';$('drawerBack').hidden=false;const area=$('drawerContents');area.replaceChildren();area.append(element('p','sheetEyebrow','CONNECTION / PROFILE'),element('h2','sheetTitle',p.name),element('p','sheetSubtitle',[p.identity,p.organization].filter(Boolean).join(' · ')));
  const info=section(area,'01 · 人物信息（公开资料）',p.intro||`${p.name}｜${p.identity}`);
  if(p.evidence){for(const [field,title] of [['identity','职位证据'],['organization','机构证据']]){const proof=p.evidence[field];if(proof){const a=element('a','',`${title}：${proof.quote} [${proof.source_id}]`);a.href=proof.url;a.target='_blank';a.rel='noopener noreferrer';info.append(a,element('p','',`资料日期：${proof.date||'未提供'}；仅核对搜索摘要，未核验原文全文。`));}}}
  section(area,'02 · 你们的共同点（背景交集推断）',p.common);
  section(area,'03 · 潜在合作点（AI 建议）',p.collaborate);
  const connection=section(area,'04 · 如何建立连接',p.connection);
  (p.entryPoints||[]).forEach(point=>{const a=element('a','',`查看公开入口资料：${point.title}`);a.href=point.url;a.target='_blank';a.rel='noopener noreferrer';connection.append(a);});
  const sources=element('section','detailSection');sources.append(element('h3','','05 · 公开来源'));
  if(p.sources?.length){p.sources.forEach(s=>{const card=element('div','sourceCard');const a=element('a','',s.title||s.url);a.href=s.url;a.target='_blank';a.rel='noopener noreferrer nofollow';card.append(a,element('small','',[s.site,s.date].filter(Boolean).join(' · ')));if(s.excerpt)card.append(element('p','',line(s.excerpt,170)));sources.append(card);});}
  else sources.append(element('p','','本条演示人物没有真实来源；正式结果必须由元宝搜索返回可点击网页。'));
  area.append(sources);
  section(area,'06 · 一句话结论',p.conclusion||'暂未找到足够可靠的下一步行动线索。');
  area.append(element('div','evidenceNote',state.report.mode==='curated'?'静态案例由公开官网资料整理，并非实时搜索；共同点是条件式推测，不能视为实际合作关系。':'公开背景与建议并不意味着双方已建立关系或对方愿意合作。请通过来源页面自行核实最新信息。'));
  $('drawerContents').scrollTop=0;
}
async function submitLive(e){e.preventDefault();const about=$('about').value.trim(),goal=$('goal').value.trim();if(!about||!goal){toast('请填写两个输入框');return;}
  if(state.abort)return;
  const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(new DOMException('等待超时，请重试','TimeoutError')),190000);state.abort=ctrl;state.report=emptyReport('本次搜索进行中，尚未生成结果。');updatePoster(state.report);setPage('loadingPage');$('liveButton').disabled=true;$('previewButton').disabled=true;$('progressText').textContent='正在连接搜索服务…';$('loadingPage').scrollIntoView({behavior:'smooth',block:'center'});
  try{
    const response=await fetch('/api/explore-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({about,goal}),signal:ctrl.signal});
    if(!response.ok){let msg=`请求失败（HTTP ${response.status}）`;try{const d=await response.json();msg=d.error||msg;}catch{}throw new Error(msg);}
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='',got=false;
    while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});const frames=buffer.split('\n\n');buffer=frames.pop()||'';for(const frame of frames){const content=frame.split('\n').filter(x=>x.startsWith('data: ')).map(x=>x.slice(6)).join('');if(!content)continue;let evt;try{evt=JSON.parse(content);}catch{continue;}
      if(evt.type==='progress')$('progressText').textContent=evt.details||'正在查找公开资料…';
      if(evt.type==='error')throw new Error(evt.error||'检索失败');
      if(evt.type==='result'){got=true;showResult(evt.data);}
    }if(done)break;}
    if(!got)throw new Error('接口未返回完整调查报告');
  }catch(ex){const message=ex?.name==='AbortError'?'已结束这次探索':ex.message||'搜索失败，请检查配置和网络';toast(message);$('apiStatus').textContent=message;$('apiStatus').classList.add('warn');state.report=emptyReport(`本次未生成实时结果：${message}`);updatePoster(state.report);setPage('entryPage');}
  finally{clearTimeout(timeout);state.abort=null;$('liveButton').disabled=false;$('previewButton').disabled=false;$('loadingPage').hidden=true;}
}

// Export real dynamic HTML overlay data on top of the watercolor source at its native 3:4 resolution.
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function textFit(ctx,s,x,y,maxWidth,fontSize,{weight='normal',color='#24442b',center=false}={}){
  ctx.fillStyle=color;ctx.textAlign=center?'center':'left';ctx.textBaseline='middle';let size=fontSize;
  do{ctx.font=`${weight} ${size}px 'Microsoft YaHei',sans-serif`;if(ctx.measureText(s).width<=maxWidth||size<=11)break;size-=1;}while(true);
  ctx.fillText(s,x,y,maxWidth);}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3,font='23px sans-serif'){
  ctx.font=font;ctx.textAlign='left';ctx.textBaseline='top';let row='',lines=[];for(const char of safeText(text)){if(char==='\n'||ctx.measureText(row+char).width>maxWidth){lines.push(row);row=char==='\n'?'':char;if(lines.length>=maxLines)break;}else row+=char;}if(row&&lines.length<maxLines)lines.push(row);
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight,maxWidth));
}
async function savePoster(){if(!state.report)return;
  const img=$('artwork');if(!img.complete)await img.decode();const cv=document.createElement('canvas');cv.width=1086;cv.height=1448;const ctx=cv.getContext('2d');ctx.drawImage(img,0,0,1086,1448);textFit(ctx,'YOUR OPPORTUNITY TREE   ✳',65,86,470,21,{weight:'bold',color:'#28533b'});
  const groups=state.report.groups;
  POSITIONS.forEach((p,i)=>{const group=groups[i],name=group?.label||'等待发现',count=group?.people?.length||0;const x=p.x/100*1086,y=p.y/100*1448,w=206,h=108;
    ctx.save();ctx.shadowColor='#563d1b40';ctx.shadowBlur=8;ctx.shadowOffsetY=2;ctx.fillStyle='#fff9e8';ctx.strokeStyle='#eadbb7';ctx.lineWidth=2;roundRect(ctx,x-w/2,y-h/2,w,h,25);ctx.fill();ctx.stroke();ctx.restore();
    textFit(ctx,name,x,y-13,w-14,24,{weight:'bold',center:true});textFit(ctx,count?`${count} 位人物`:'尚无线索',x,y+19,w-12,18,{center:true,color:'#60744b'});
  });
  const px=119,py=1074,pw=848,ph=296;ctx.fillStyle='#fff8e9';ctx.strokeStyle='#ead7b2';ctx.lineWidth=3;roundRect(ctx,px,py,pw,ph,29);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(546,py+28);ctx.lineTo(546,py+205);ctx.moveTo(px+25,py+218);ctx.lineTo(px+pw-25,py+218);ctx.strokeStyle='#e2d5b6';ctx.lineWidth=2;ctx.stroke();
  textFit(ctx,'这棵树，从你开始。',158,1129,355,28,{weight:'bold'});textFit(ctx,'我想认识',576,1129,328,26,{weight:'bold'});
  ctx.fillStyle='#485741';wrapText(ctx,state.report.summary,158,1160,335,33,3,'22px sans-serif');wrapText(ctx,state.report.goal,576,1160,322,32,2,'21px sans-serif');
  (state.report.keywords||[]).slice(0,3).forEach((tag,i)=>{const x=576+i*103;ctx.fillStyle='#e4ead5';roundRect(ctx,x,1237,98,36,16);ctx.fill();textFit(ctx,tag,x+49,1255,92,18,{center:true});});
  const n=groups.reduce((a,r)=>a+(r.people?.length||0),0),cats=groups.filter(g=>g.people?.length).length;
  textFit(ctx,`${cats} 个有线索的方向  ·  ${n} 位值得了解的人`,543,1325,755,24,{center:true,weight:'bold'});
  if(state.report.mode!=='live'){ctx.save();ctx.translate(912,185);ctx.rotate(-.10);ctx.fillStyle='#fff7e5ef';roundRect(ctx,-110,-28,220,55,12);ctx.fill();textFit(ctx,state.report.mode==='curated'?'静态公开案例 · 非实时':'尚未生成实时结果',0,0,208,20,{color:'#995740',weight:'bold',center:true});ctx.restore();}
  const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));if(!blob){toast('保存失败：无法生成图片');return;}const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='我的机会树-3x4.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),15000);
  toast('3:4 海报已生成');
}
$('exploreForm').addEventListener('submit',submitLive);
$('previewButton').addEventListener('click',()=>showResult(demoReport()));
$('resetButton').addEventListener('click',()=>{closeDrawer();setPage('entryPage');});
$('cancelBtn').addEventListener('click',()=>state.abort?.abort());
$('savePoster').addEventListener('click',()=>savePoster().catch(e=>toast(e.message)));
$('drawerClose').addEventListener('click',closeDrawer);
$('modalOverlay').addEventListener('click',closeDrawer);
$('drawerBack').addEventListener('click',()=>{if(state.selected!==null)showGroup(state.selected);});
window.addEventListener('keydown',e=>{if(!$('drawer').classList.contains('open'))return;if(e.key==='Escape')closeDrawer();if(e.key==='Tab'){const nodes=[...$('drawer').querySelectorAll('button:not([hidden]),a[href]')];const first=nodes[0],last=nodes.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===$('drawer'))){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===$('drawer'))){e.preventDefault();first?.focus();}}});
state.report=emptyReport();updatePoster(state.report);$('drawer').inert=true;
refreshStatus();
