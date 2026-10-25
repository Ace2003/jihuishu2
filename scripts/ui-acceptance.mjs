// 本地应用的无头浏览器验收；真实搜索与静态案例分别记录。
import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire((process.env.BROWSER_NODE_MODULES||'C:/Users/dishi/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')+'/');
const {chromium}=require('playwright');
fs.mkdirSync('artifacts/browser',{recursive:true});
const executablePath=process.env.BROWSER_EXECUTABLE||['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(file=>fs.existsSync(file));
const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
const context=await browser.newContext({viewport:{width:1120,height:870},acceptDownloads:true});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
const base=process.env.ACCEPTANCE_URL||'http://127.0.0.1:3000';
const results={initialEmpty:false,staticExample:false,mobile:false,export:false,realBrowser:false,errors};
try{
  await page.goto(base);await page.locator('#fruitLayer .fruit').first().waitFor();
  assert.equal(await page.locator('.fruit').count(),6);
  assert.match(await page.locator('#countsText').innerText(),/0 位/);assert.ok(await page.locator('#savePoster').isDisabled());results.initialEmpty=true;
  await page.screenshot({path:'artifacts/browser/desktop-initial.png',fullPage:true});
  await page.locator('#previewButton').click();await page.locator('.fruit').first().click();await page.locator('.personBtn').first().click();
  assert.equal(await page.locator('.detailSection').count(),6);assert.ok(await page.locator('.sourceCard a').count()>0);
  assert.match(await page.locator('#drawerContents').innerText(),/静态/);
  await page.keyboard.press('Escape');assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'true');
  await page.locator('.fruit').nth(5).click();assert.ok(await page.locator('.empty').isVisible());await page.locator('#modalOverlay').click({position:{x:20,y:20}});
  assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'true');results.staticExample=true;
  const downloadPromise=page.waitForEvent('download');await page.locator('#savePoster').click();const download=await downloadPromise;await download.saveAs('artifacts/browser/static-example-poster.png');
  const png=fs.readFileSync('artifacts/browser/static-example-poster.png');assert.equal(png.readUInt32BE(16),1086);assert.equal(png.readUInt32BE(20),1448);results.export=true;
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/browser/mobile-example.png',fullPage:true});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.locator('.fruit').first().click();await page.locator('.personBtn').first().click();assert.equal(await page.locator('.detailSection').count(),6);await page.locator('#drawerClose').click();results.mobile=true;
  if(process.argv.includes('--live')){
    await page.locator('#about').fill('我是应用统计学大三学生，会 Python 和数据分析，做过 AI 产品原型，希望寻找研究或实习交流。');
    await page.locator('#goal').fill('想认识清华大学从事机器学习和数据科学的教授，了解公开讲座或研究交流入口。');
    const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/explore-stream'),{timeout:195000});
    await page.locator('#liveButton').click();const response=await responsePromise;const body=await response.text();
    const frames=body.split('\n\n').flatMap(f=>{const text=f.split('\n').find(l=>l.startsWith('data: '));return text?[JSON.parse(text.slice(6))]:[];});
    const data=frames.find(f=>f.type==='result')?.data;fs.writeFileSync('artifacts/browser/real-browser-result.json',JSON.stringify({kind:'actual-browser-real-API',events:frames},null,2));
    assert.equal(data?.mode,'live');const index=data.groups.findIndex(g=>g.people.length);assert.ok(index>=0,'真实 API 必须返回至少一名有证据的人物才能算完整通过');
    await page.waitForFunction(()=>document.getElementById('loadingPage').hidden,{timeout:195000});
    assert.equal(await page.locator('#posterMark').isVisible(),false);
    await page.screenshot({path:'artifacts/browser/real-mobile-tree.png',fullPage:true});
    await page.locator('#posterCanvas').screenshot({path:'artifacts/browser/real-tree-closeup.png'});
    await page.locator('.fruit').nth(index).click();await page.locator('.personBtn').first().click();assert.equal(await page.locator('.detailSection').count(),6);
    await page.screenshot({path:'artifacts/browser/real-mobile-report.png'});
    await page.locator('#drawerContents').evaluate(el=>el.scrollTop=el.scrollHeight);
    await page.screenshot({path:'artifacts/browser/real-mobile-report-sources.png'});
    assert.ok(await page.locator('.detailSection a').count()>=3);
    await page.locator('#drawerClose').click();
    const pngPromise=page.waitForEvent('download');await page.locator('#savePoster').click();await (await pngPromise).saveAs('artifacts/browser/real-poster.png');
    const realPng=fs.readFileSync('artifacts/browser/real-poster.png');assert.equal(realPng.readUInt32BE(16),1086);assert.equal(realPng.readUInt32BE(20),1448);
    results.realBrowser=true;console.log('真实浏览器人物：'+data.groups.flatMap(g=>g.people.map(p=>p.name)).join('、'));
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify(results,null,2));
}finally{fs.writeFileSync('artifacts/browser/checks.json',JSON.stringify(results,null,2));await browser.close();}
