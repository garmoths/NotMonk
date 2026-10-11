const {chromium}=require('playwright');const {pathToFileURL}=require('node:url');const {resolve}=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(pathToFileURL(resolve('index.html')).href);await page.waitForFunction(()=>localStorage.getItem('preferences'));
assert.deepEqual(await page.evaluate(()=>({topics:state.topics,categories:state.categories,seed:NOTMONK_ROADMAP})),{topics:[],categories:[],seed:[]});
await page.reload();await page.waitForFunction(()=>state.topics.length===0);assert.equal(await page.locator('.module-card').count(),0);
await page.evaluate(()=>{localStorage.setItem('topics',JSON.stringify([{id:'private-fixture',title:'Private test note',category:'Test area',notes:'<p>LOCAL ONLY TEST DATA</p>',today:true,status:'learning'}]));localStorage.setItem('categories',JSON.stringify(['Test area']));localStorage.setItem('preferences',JSON.stringify({roadmapVersion:8}));});
await page.reload();await page.waitForFunction(()=>state.topics.length===1);assert.equal(await page.evaluate(()=>state.topics[0].notes),'<p>LOCAL ONLY TEST DATA</p>');assert.deepEqual(await page.evaluate(()=>state.categories),['Test area']);
await page.locator('#tab-roadmap').click();assert.equal(await page.locator('#roadmap-view').isVisible(),true);assert.deepEqual(errors,[]);
console.log('PASS: fresh install and reload are empty; existing local notes/categories survive upgrade; roadmap works');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
