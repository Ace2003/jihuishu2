// 单独验证腾讯云元宝 SearchPro；只调用一次，不需要大模型。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const filename of ['.env.local','.env']){
  const f=path.join(root,filename);
  if(!fs.existsSync(f))continue;
  for(const line of fs.readFileSync(f,'utf8').split(/\r?\n/)){
    const match=line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*)\s*$/);
    if(!match||Object.hasOwn(process.env,match[1]))continue;
    const v=match[2].trim();
    process.env[match[1]]=v.replace(/^("|')(.*)\1$/,'$2');
  }
}
const key=String(process.env.YUANBAO_API_KEY||'').trim();
if(!key||key.startsWith('请填写')){
  console.error('缺少 YUANBAO_API_KEY。请在 .env.local 中填写已轮换的密钥。');
  process.exit(2);
}
const query=process.argv.slice(2).join(' ').trim()||'腾讯云元宝搜索 API 官方文档';
const ctrl=new AbortController();
const timer=setTimeout(()=>ctrl.abort(),20000);
try{
  const res=await fetch(process.env.YUANBAO_ENDPOINT||'https://api.wsa.cloud.tencent.com/SearchPro',{
    method:'POST',headers:{'Content-Type':'application/json; charset=UTF-8','Authorization':`Bearer ${key}`},
    body:JSON.stringify({Query:query}),signal:ctrl.signal
  });
  const payload=await res.json();
  if(!res.ok||payload?.Response?.Error){
    const e=payload?.Response?.Error||{};
    const code=String(e.Code||'request_failed').replace(/[^a-zA-Z0-9_.]/g,'').slice(0,65);
    throw new Error(`HTTP ${res.status} ${code}；请检查服务 API KEY、开通状态和账户额度。`);
  }
  if(!Array.isArray(payload?.Response?.Pages))throw new Error('接口返回结构中不存在 Response.Pages');
  const pages=payload.Response.Pages.map(x=>{try{return typeof x==='string'?JSON.parse(x):x;}catch{return null;}}).filter(p=>p&&p.title&&/^https?:\/\//.test(p.url));
  console.log(`元宝搜索连接成功，查询获得 ${pages.length} 条结果；以下仅显示前 3 条公开来源：`);
  pages.slice(0,3).forEach((p,i)=>console.log(`${i+1}. ${String(p.title||'无标题').slice(0,80)}\n   ${p.url||'无链接'}`));
}catch(e){
  console.error('元宝搜索连通测试失败：'+String(e?.message||e));
  process.exitCode=1;
}finally{clearTimeout(timer);}
