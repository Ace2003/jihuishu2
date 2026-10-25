import http from 'node:http';
const PORT=9123;
http.createServer(async (req,res)=>{
  let body='';for await (const c of req)body+=c;
  const data=JSON.parse(body||'{}');
  res.writeHead(200,{'Content-Type':'application/json'});
  if(req.url==='/SearchPro'){
    const term=data.Query||'';
    const label=/投资/.test(term)?'投资人':/增长/.test(term)?'增长负责人':'AI 创始人';
    const name=label==='投资人'?'林远航':label==='增长负责人'?'姚又文':'许辰光';
    res.end(JSON.stringify({Response:{Pages:[JSON.stringify({title:`${name}：${label}出席公开行业交流会`,url:`https://example.com/open/${encodeURIComponent(name)}`,site:'示例测试新闻网',date:'2026-10-22',passage:`${name}以${label}身份参与了2026公开行业交流会，公开分享了产品与创业经验。`,score:0.91})]}}));return;
  }
  const input=String(data.messages?.[1]?.content||'');
  const plan={summary:'应用统计学学生，做过 AI 产品和内容增长项目',keywords:['AI 产品','数据分析','内容增长'],roles:[{label:'AI 创业者',query:'AI 创始人 公开行业交流会'},{label:'投资人',query:'投资人 公开行业交流会'},{label:'增长负责人',query:'增长负责人 公开行业交流会'}]};
  const report={groups:[
    {role_id:'r1',people:[{name:'许辰光',identity:'AI 创始人',organization:'测试机构',intro:'在公开行业交流活动中分享产品创业经验。',common:['关注 AI 产品与实践'],collaborate:['交流用户研究与产品增长'],connection:['查看公开交流会的活动介绍'],conclusion:'可以以产品实践案例作为公开交流的切入点。',source_ids:['S1']}]},
    {role_id:'r2',people:[{name:'林远航',identity:'投资人',organization:'测试基金',intro:'参加公开创业交流活动。',common:['关注科技创业方向'],collaborate:['交流产品验证与早期增长方法'],connection:['通过公开活动了解投资领域'],conclusion:'先准备能验证用户需求的作品。',source_ids:['S2']}]},
    {role_id:'r3',people:[{name:'姚又文',identity:'增长负责人',organization:'测试公司',intro:'出席公开增长主题活动。',common:['关注产品增长'],collaborate:['交流内容与增长实验'],connection:['查看活动公开资料'],conclusion:'以增长案例作为连接起点。',source_ids:['S3']},{name:'根本不存在',identity:'伪造人物',source_ids:['S3']}]}]};
  res.end(JSON.stringify({choices:[{message:{content:JSON.stringify(input.includes('元宝真实搜索摘要')?report:plan)}}]}));
}).listen(PORT,'127.0.0.1',()=>console.log('MOCK SERVICE',PORT));
