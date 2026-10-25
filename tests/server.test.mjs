// 本文件仅使用本地上游测试替身，不属于真实 API 验收。
import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

const plan={summary:'统计学学生',keywords:['数据分析'],roles:[{label:'研究者',query:'统计研究者 公开讲座'}]};
const page={title:'张明教授公开讲座',url:'https://university.example/people/zhang',site:'大学官网',date:'2025-09-01',passage:'张明是甲大学教授，研究统计学。甲大学面向公众开放张明教授的公开讲座报名。'};
const report={groups:[{role_id:'r1',people:[{name:'张明',identity:'教授',organization:'甲大学',intro:'未经核实的获奖经历',common:['统计研究方向'],collaborate:['讨论统计研究'],connection:['添加私人微信'],conclusion:'可私下联系',source_ids:['S1'],evidence:{identity:{value:'教授',source_id:'S1',quote:'张明是甲大学教授'},organization:{value:'甲大学',source_id:'S1',quote:'张明是甲大学教授'}},entry_points:[{source_id:'S1',quote:'甲大学面向公众开放张明教授的公开讲座报名',kind:'activity'}]}]}]};

async function fixture(t,{search='ok',output=report,config={},source=page}={}){
  const upstream=http.createServer(async(req,res)=>{
    let body='';for await(const c of req)body+=c;
    const data=JSON.parse(body||'{}');
    res.setHeader('Content-Type','application/json');
    if(req.url==='/SearchPro'){
      assert.equal(req.headers.authorization,'Bearer test-search-secret');
      assert.equal(typeof data.Query,'string');
      if(search==='unauthorized')return res.end(JSON.stringify({Response:{Error:{Code:'UnauthorizedOperation',Message:'test-search-secret should never leak'}}}));
      if(search==='malformed')return res.end(JSON.stringify({Response:{Msg:'missing pages'}}));
      if(search==='empty')return res.end(JSON.stringify({Response:{Pages:[],RequestId:'fixture-empty'}}));
      return res.end(JSON.stringify({Response:{Pages:['{broken',JSON.stringify(source)],RequestId:'fixture-ok'}}));
    }
    assert.equal(req.headers.authorization,'Bearer test-model-secret');
    if(data.response_format?.type!=='json_object'){res.statusCode=400;res.end(JSON.stringify({error:{code:'json_mode_required'}}));return;}
    const isPlan=String(data.messages?.[0]?.content).includes('职业角色与公开人脉');
    res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(isPlan?plan:output)}}]}));
  });
  await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
  const portFinder=http.createServer();await new Promise(r=>portFinder.listen(0,'127.0.0.1',r));
  const port=portFinder.address().port;await new Promise(r=>portFinder.close(r));
  const base=`http://127.0.0.1:${port}`;
  const upstreamBase=`http://127.0.0.1:${upstream.address().port}`;
  const child=spawn(process.execPath,['server.mjs'],{env:{...process.env,PORT:String(port),YUANBAO_API_KEY:'test-search-secret',LLM_API_KEY:'test-model-secret',YUANBAO_ENDPOINT:upstreamBase+'/SearchPro',LLM_CHAT_URL:upstreamBase+'/chat',...config},stdio:['ignore','pipe','pipe']});
  let logs='';child.stderr.on('data',x=>logs+=x);
  t.after(async()=>{child.kill();upstream.closeAllConnections();await new Promise(r=>upstream.close(r));});
  for(let i=0;i<100;i++){try{if((await fetch(base+'/api/status')).ok)break;}catch{}if(child.exitCode!==null)throw new Error(logs);await delay(30);}
  return {base,run:async()=>{const res=await fetch(base+'/api/explore-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({about:'统计学学生',goal:'认识统计研究者'})});const body=await res.text();return {status:res.status,body,events:body.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)))};}};
}

test('仅出现姓名不应接受伪造职位、机构、简介或私人渠道',async t=>{
  const forged=structuredClone(report);const p=forged.groups[0].people[0];
  p.identity='首席科学家';p.organization='不存在公司';delete p.evidence;delete p.entry_points;
  const f=await fixture(t,{output:forged});const r=await f.run();
  const person=r.events.find(x=>x.type==='result')?.data.groups[0].people[0];
  assert.ok(!person||(!person.organization&&person.identity==='职位未核实'));
  assert.ok(!r.body.includes('添加私人微信'));assert.ok(!r.body.includes('未经核实的获奖经历'));
});
test('证据必须为来源原文，不能把虚构引文标为已核验',async t=>{
  const forged=structuredClone(report);for(const e of Object.values(forged.groups[0].people[0].evidence))e.quote='张明担任不存在公司的首席科学家';
  const f=await fixture(t,{output:forged});const r=await f.run();const p=r.events.find(x=>x.type==='result')?.data.groups[0].people[0];
  assert.ok(!p||p.identity==='职位未核实');
});
test('毕业院校证据不能被当作工作机构',async t=>{
  const forged=structuredClone(report);forged.groups[0].people[0].evidence.identity.quote='张明是乙公司教授';forged.groups[0].people[0].evidence.organization.quote='张明教育背景：甲大学学士';
  const f=await fixture(t,{output:forged,source:{...page,passage:'张明是乙公司教授。张明教育背景：甲大学学士。'}});const r=await f.run();
  assert.equal(r.events.find(x=>x.type==='result')?.data.groups[0].people.length,0);
});
test('记者采访他人和合作机构不构成本人的职位或任职证据',async t=>{
  for(const text of ['张明采访了甲大学教授李四','张明是乙公司教授，与甲大学开展合作']){
    const forged=structuredClone(report);for(const evidence of Object.values(forged.groups[0].people[0].evidence))evidence.quote=text;
    const f=await fixture(t,{output:forged,source:{...page,title:'公开报道',passage:text}});const r=await f.run();
    assert.equal(r.events.find(x=>x.type==='result')?.data.groups[0].people.length,0,text);
  }
});
test('已取消或关闭的报名不应被推荐为连接入口',async t=>{
  const text=page.passage+'张明公开讲座报名已取消，不接受申请。';
  const forged=structuredClone(report);forged.groups[0].people[0].entry_points[0].quote='张明公开讲座报名已取消，不接受申请。';
  const f=await fixture(t,{output:forged,source:{...page,passage:text}});const r=await f.run();
  assert.equal(r.events.find(x=>x.type==='result')?.data.groups[0].people[0].entryPoints.length,0);
});
test('模型不实既有人际关系和录用保证不应传入报告',async t=>{
  const forged=structuredClone(report);forged.groups[0].people[0].common=['你们已经认识，是合作过的朋友'];forged.groups[0].people[0].collaborate=['张明保证愿意录用你'];
  const f=await fixture(t,{output:forged});const r=await f.run();const p=r.events.find(x=>x.type==='result')?.data.groups[0].people[0];
  assert.ok(!p.common.join('').includes('已经认识'));assert.ok(!p.collaborate.join('').includes('保证'));
});
test('别的机构招聘不能被拼成当前人物的连接入口',async t=>{
  const text='甲大学提供学术资料下载。乙公司公开招聘，请到乙公司投递申请';
  const forged=structuredClone(report);forged.groups[0].people[0].entry_points[0].quote=text;
  const f=await fixture(t,{output:forged,source:{...page,passage:page.passage+text}});const r=await f.run();
  assert.equal(r.events.find(x=>x.type==='result')?.data.groups[0].people[0].entryPoints.length,0);
});
test('有效逐字段证据被保留，报告不把模型简介当公开事实',async t=>{
  const f=await fixture(t);const r=await f.run();const p=r.events.find(x=>x.type==='result')?.data.groups[0].people[0];
  assert.equal(p?.identity,'教授');assert.equal(p.organization,'甲大学');assert.equal(p.evidence.identity.source_id,'S1');
  assert.ok(!p.intro.includes('未经核实'));assert.ok(!p.connection.join('').includes('微信'));
  assert.equal(p.entryPoints[0].url,'https://university.example/people/zhang');
});
test('SearchPro 业务鉴权错误是失败，且不泄露密钥',async t=>{
  const f=await fixture(t,{search:'unauthorized'});const r=await f.run();
  assert.ok(r.events.some(x=>x.type==='error'));assert.ok(!r.events.some(x=>x.type==='result'));assert.ok(!r.body.includes('test-search-secret'));
});
test('缺失 Response.Pages 是协议错误，不能伪装为空搜索成功',async t=>{
  const f=await fixture(t,{search:'malformed'});const r=await f.run();
  assert.ok(r.events.some(x=>x.type==='error'));assert.ok(!r.events.some(x=>x.type==='result'));
});
test('真实空 Pages 正常降级为空树并结束 SSE',async t=>{
  const f=await fixture(t,{search:'empty'});const r=await f.run();const data=r.events.find(x=>x.type==='result')?.data;
  assert.equal(data?.mode,'live');assert.equal(data.sourceCount,0);assert.equal(data.groups[0].people.length,0);
});
test('本地秘密不能通过静态路径访问，非法输入不触发搜索',async t=>{
  const f=await fixture(t);assert.equal((await fetch(f.base+'/.env.local')).status,404);
  const r=await fetch(f.base+'/api/explore-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:'null'});assert.equal(r.status,400);
});
test('取消调查释放并发槽位，并发超限明确拒绝',async t=>{
  const f=await fixture(t,{config:{MAX_CONCURRENT:'1'}});const controller=new AbortController();
  const first=await fetch(f.base+'/api/explore-stream',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({about:'统计学学生',goal:'认识统计研究者'}),signal:controller.signal});
  assert.equal(first.status,200);const busy=await f.run();assert.equal(busy.status,429);
  controller.abort();await delay(100);const next=await f.run();assert.equal(next.status,200);
});
test('单进程日调查上限在调用外部服务前拒绝后续请求',async t=>{
  const f=await fixture(t,{config:{DAILY_INVESTIGATION_LIMIT:'1'}});assert.equal((await f.run()).status,200);assert.equal((await f.run()).status,429);
});
