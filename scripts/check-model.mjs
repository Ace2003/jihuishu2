// 一次真实模型连通检查；不输出密钥或供应商原始错误正文。
import fs from 'node:fs';
for(const name of ['.env.local','.env']){
  if(!fs.existsSync(name))continue;
  for(const line of fs.readFileSync(name,'utf8').split(/\r?\n/)){
    const m=line.match(/^\s*([A-Z_][A-Z_0-9]*)\s*=\s*(.*)$/);if(!m||Object.hasOwn(process.env,m[1]))continue;
    process.env[m[1]]=m[2].trim().replace(/^(["'])(.*)\1$/,'$2');
  }
}
if(!process.env.LLM_API_KEY?.trim()){console.error('缺少 LLM_API_KEY');process.exit(2);}
try{
  const response=await fetch(process.env.LLM_CHAT_URL||'https://api.deepseek.com/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.LLM_API_KEY.trim()}`},body:JSON.stringify({model:process.env.LLM_MODEL||'deepseek-chat',max_tokens:40,messages:[{role:'user',content:'仅回复 JSON：{"connected":true}'}]}),signal:AbortSignal.timeout(55000)});
  const payload=await response.json();
  console.log(JSON.stringify({service:'LLM',httpStatus:response.status,ok:response.ok&&!!payload?.choices?.[0]?.message?.content,model:payload.model||process.env.LLM_MODEL,output:response.ok?payload?.choices?.[0]?.message?.content:undefined,errorCode:response.ok?undefined:String(payload?.error?.code||'request_failed').slice(0,60)}));
  if(!response.ok)process.exitCode=1;
}catch(error){console.error(JSON.stringify({service:'LLM',ok:false,error:error.name,networkCode:error.cause?.code}));process.exitCode=1;}
