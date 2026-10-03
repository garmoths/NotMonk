const{chromium}=require('playwright');const{pathToFileURL}=require('node:url');const{resolve}=require('node:path');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}});await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href+'#/c');await page.waitForFunction(()=>state.selectedCategory?.startsWith('15.'));
const stars=page.locator('.note-tree-today');assert.ok(await stars.count()>1);
const title=await page.locator('.note-tree-open span').nth(1).textContent();
await stars.nth(1).click();await page.waitForFunction(()=>state.topics.some(t=>t.today));assert.equal(await stars.nth(1).getAttribute('aria-pressed'),'true');
await page.locator('#tab-today').click();assert.ok((await page.locator('#today-list').textContent()).includes(title));
await page.reload();await page.waitForFunction(()=>state.activeTab==='today');assert.ok((await page.locator('#today-list').textContent()).includes(title));
await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href+'#/c');await page.waitForFunction(()=>state.selectedCategory?.startsWith('15.'));assert.equal(await stars.nth(1).getAttribute('aria-pressed'),'true');
await stars.nth(1).click();await page.waitForFunction(()=>!state.topics.some(t=>t.today));
// Verify the existing local map viewport persistence with a nonzero position.
await page.evaluate(()=>localStorage.setItem('roadmapBoard',JSON.stringify({version:3,zoom:.8,fitView:false,scrollX:230,scrollY:640,nodes:[{id:'n',kind:'area',ref:'C',title:'C',x:1800,y:2000}],edges:[]})));
await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(pathToFileURL(resolve('index.html')).href+'#/roadmap');await page.reload();await page.waitForTimeout(250);
assert.equal(await page.locator('#rm-viewport').evaluate(v=>v.scrollTop),640);
await page.locator('#rm-viewport').evaluate(v=>{v.scrollLeft=310;v.scrollTop=820;});await page.waitForTimeout(250);
await page.reload();await page.waitForTimeout(250);assert.equal(await page.locator('#rm-viewport').evaluate(v=>v.scrollTop),820);
await page.locator('#tab-today').click();await page.locator('#tab-roadmap').click();await page.waitForTimeout(250);assert.equal(await page.locator('#rm-viewport').evaluate(v=>v.scrollLeft),310);assert.equal(await page.locator('#rm-viewport').evaluate(v=>v.scrollTop),820);
console.log('PASS: note-tree star add/remove and reload; map viewport restored after refresh and tab switch');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
