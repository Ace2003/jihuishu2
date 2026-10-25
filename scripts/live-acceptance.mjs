// 真实端到端验收：仅请求实际运行的 Node 服务，不注入模拟响应。
import fs from 'node:fs';
const base=process.env.ACCEPTANCE_URL||'http://127.0.0.1:3000';
const cases=[
  {id:'statistics',about:'我是应用统计学大三学生，会 Python 和数据分析，做过 AI 产品原型，希望寻找研究或实习交流。',goal:'想认识清华大学从事机器学习和数据科学的教授，了解公开讲座或研究交流入口。'},
  {id:'game-art',about:'我在上海做独立游戏美术，会 Blender、角色建模和 Unity，正在制作国风游戏原型。',goal:'想认识上海独立游戏制作人和游戏美术负责人，寻找公开活动交流与作品合作机会。'},
  {id:'coffee',about:'我在杭州经营咖啡小店，做本地品牌与短视频，希望提高咖啡烘焙与门店运营能力。',goal:'想认识中国精品咖啡品牌创始人、咖啡烘焙师，了解公开赛事或培训交流入口。'}
];
fs.mkdirSync('artifacts/live',{recursive:true});
for(const item of cases.filter(item=>!process.argv.some(arg=>arg.startsWith('--case='))||process.argv.includes('--case='+item.id))){
  const existing=`artifacts/live/${item.id}.json`;
  if(fs.existsSync(existing)){fs.mkdirSync('artifacts/live/attempts',{recursive:true});fs.copyFileSync(existing,`artifacts/live/attempts/${item.id}-${Date.now()}.json`);}
  const started=Date.now();const events=[];let httpStatus;
  console.log(`START ${item.id}`);
  try{
    const response=await fetch(base+'/api/explore-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({about:item.about,goal:item.goal}),signal:AbortSignal.timeout(195000)});httpStatus=response.status;
    if(!response.ok)throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
    while(true){const {done,value}=await reader.read();buffer+=decoder.decode(value||new Uint8Array(),{stream:!done});const frames=buffer.split('\n\n');buffer=frames.pop()||'';
      for(const frame of frames){const data=frame.split('\n').find(x=>x.startsWith('data: '));if(!data)continue;const event=JSON.parse(data.slice(6));events.push(event);if(event.type==='progress')console.log(`${item.id}: ${event.details}`);}
      if(done)break;
    }
    const result=events.find(x=>x.type==='result')?.data,error=events.find(x=>x.type==='error');
    const people=result?.groups.flatMap(g=>g.people)||[];
    const integrity=people.every(p=>p.sources.length&&p.evidence?.identity&&p.evidence?.organization&&Object.values(p.evidence).every(e=>p.sources.some(s=>s.id===e.source_id&&[s.title,s.excerpt].some(text=>text.includes(e.quote)))));
    const passed=!!result&&!error&&result.mode==='live'&&integrity&&people.length>0;
    const record={input:item,base,httpStatus,elapsedMs:Date.now()-started,status:passed?'VERIFIED':result?'LIVE_DEGRADED':'FAILED',integrity,events};
    fs.writeFileSync(`artifacts/live/${item.id}.json`,JSON.stringify(record,null,2));
    console.log(JSON.stringify({case:item.id,status:record.status,people:people.map(p=>({name:p.name,identity:p.identity,organization:p.organization,sources:p.sources.map(s=>s.url)})),usage:result?.usage,error:error?.error},null,2));
    if(!passed)process.exitCode=1;
  }catch(error){fs.writeFileSync(`artifacts/live/${item.id}.json`,JSON.stringify({input:item,base,httpStatus,status:'FAILED',error:error.message,events},null,2));console.error(item.id,error.message);process.exitCode=1;}
}
