const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const {resolve}=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href+'#/roadmap');
  await page.waitForFunction(()=>state.activeTab==='roadmap');
  await page.evaluate(()=>localStorage.setItem('roadmapBoard',JSON.stringify({version:3,fitView:true,zoom:.5,nodes:Array.from({length:17},(_,i)=>({id:'n'+i,kind:'area',ref:'test',title:'Alan '+i,x:40+(i%3)*300,y:20+i*130})),edges:[]})));
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===17);
  async function check(){
   const result=await page.evaluate(()=>{
    const v=document.querySelector('#rm-viewport'),r=v.getBoundingClientRect();
    return {zoom:document.querySelector('#rm-zoom-value').textContent,inside:[...document.querySelectorAll('.rm-node')].every(n=>{const b=n.getBoundingClientRect();return b.left>=r.left&&b.top>=r.top&&b.right<=r.left+v.clientWidth&&b.bottom<=r.top+v.clientHeight;})};
   });assert.equal(result.inside,true,JSON.stringify(result));
  }
  await check();
  await page.locator('#rm-zoom-in').click();
  await page.locator('#rm-fit').click();await check();
  await page.setViewportSize({width:1000,height:720});await page.waitForTimeout(200);await check();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('roadmapBoard')).fitView===true);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===17);await check();
  const viewport=page.locator('#rm-viewport');
  const rect=await viewport.boundingBox();const mouse={x:rect.x+250,y:rect.y+200};
  const anchor=()=>page.evaluate(({x,y})=>{
    const r=document.querySelector('#rm-surface').getBoundingClientRect();
    const z=new DOMMatrix(getComputedStyle(document.querySelector('#rm-surface')).transform).a;
    return {x:(x-r.left)/z,y:(y-r.top)/z,z};
  },mouse);
  const before=await anchor();
  await page.mouse.move(mouse.x,mouse.y);
  await page.mouse.wheel(0,100);await page.waitForTimeout(100);
  assert.equal((await anchor()).z,before.z,'ordinary scrolling changed zoom');
  await page.mouse.wheel(0,-100);await page.waitForTimeout(100);
  await page.mouse.down({button:'middle'});await page.mouse.wheel(0,-100);await page.mouse.up({button:'middle'});await page.waitForTimeout(180);
  const after=await anchor();assert.ok(after.z>before.z);assert.ok(Math.abs(after.x-before.x)<5&&Math.abs(after.y-before.y)<5,'cursor anchor moved');
  await viewport.dispatchEvent('wheel',{deltaY:60,deltaMode:0,clientX:mouse.x,clientY:mouse.y,ctrlKey:true});
  await page.waitForTimeout(180);assert.ok((await anchor()).z<after.z);
  await viewport.focus();await page.keyboard.press('0');assert.equal(await page.locator('#rm-zoom-value').textContent(),'80%');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('roadmapBoard')).zoom===.8);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===17);
  assert.equal(await page.locator('#rm-zoom-value').textContent(),'80%');
  await viewport.focus();await page.keyboard.press('f');await check();
  console.log('PASS: 17-card tall diagram fits on load, fit button, viewport resize and reload; wheel/pinch anchor, keyboard and persisted zoom');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
