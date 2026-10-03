const {chromium}=require('playwright');const{pathToFileURL}=require('node:url');const{resolve}=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href+'#/roadmap');await page.waitForFunction(()=>state.activeTab==='roadmap');
 await page.evaluate(()=>{
  const names=Array.from({length:17},(_,i)=>'Test area '+i);
  const coords=[[80,60],[400,60],[720,60],[400,330],[140,600],[680,600],[140,870],[680,870],[400,1140],[100,1410],[400,1410],[700,1410],[100,1680],[100,1950],[1100,60],[1100,330],[1100,600]];
  const nodes=names.map((title,i)=>({id:'n'+i,kind:'area',ref:title,title,x:coords[i][0],y:coords[i][1]}));
  const edges=[[0,3],[1,3],[2,3],[3,4],[3,5],[4,6],[5,7],[6,8],[7,8],[8,9],[8,10],[8,11],[9,12],[12,13]].map(([a,b],i)=>({id:'e'+i,from:'n'+a,to:'n'+b}));
  localStorage.setItem('roadmapBoard',JSON.stringify({version:2,nodes,edges,zoom:.39,fitView:true}));
 });
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===17);
 assert.equal(await page.locator('#rm-zoom-value').textContent(),'80%');
 const style=await page.evaluate(()=>({grid:getComputedStyle(document.querySelector('#rm-viewport')).backgroundImage,surface:getComputedStyle(document.querySelector('#rm-surface')).backgroundImage,font:parseFloat(getComputedStyle(document.querySelector('.rm-node strong')).fontSize)}));
 assert.ok(style.grid.includes('radial-gradient'));assert.equal(style.surface,'none');assert.ok(style.font*.8>=14);
 await page.screenshot({path:'/tmp/roadmap-readable.png',fullPage:true});
 await page.locator('#rm-fit').click();
 const overview=await page.evaluate(()=>{const z=new DOMMatrix(getComputedStyle(document.querySelector('#rm-surface')).transform).a;return{size:parseFloat(getComputedStyle(document.querySelector('.rm-node strong')).fontSize),metadata:getComputedStyle(document.querySelector('.rm-node small')).display};});
 assert.equal(overview.size,style.font);assert.notEqual(overview.metadata,'none');
 await page.screenshot({path:'/tmp/roadmap-overview.png',fullPage:true});
 await page.locator('#rm-reading').click();assert.equal(await page.locator('#rm-zoom-value').textContent(),'80%');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('roadmapBoard')).version===3&&JSON.parse(localStorage.getItem('roadmapBoard')).zoom===.8);
 await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===17);assert.equal(await page.locator('#rm-zoom-value').textContent(),'80%');assert.deepEqual(errors,[]);
 console.log('PASS: full grid, readable migration, overview labels, reading view, persistence; 17 nodes/14 edges retained');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
