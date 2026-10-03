const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:1050}});
    if (process.env.EXTENSION_STORAGE) await page.addInitScript(() => {
      globalThis.chrome = {runtime:{},storage:{local:{
        get(keys,callback) {
          const result={};for(const key of keys) {const value=localStorage.getItem(key);if(value!==null)result[key]=JSON.parse(value);}
          setTimeout(()=>callback(result),0);
        },
        set(values,callback) {
          Object.entries(values).forEach(([key,value])=>localStorage.setItem(key,JSON.stringify(value)));
          setTimeout(callback,0);
        }
      },onChanged:{addListener(){}}}};
    });
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=pathToFileURL(resolve('index.html')).href;
    await page.addInitScript(require('./fixtures.cjs').seed);await page.goto(url+'#/roadmap');
    await page.waitForFunction(()=>state.activeTab==='roadmap' && document.querySelectorAll('.rm-source').length>0);
    assert.equal(await page.locator('#roadmap-view').isVisible(),true);
    assert.equal(await page.locator('#modules-view').isVisible(),false);
    assert.equal(await page.locator('#rm-empty').isVisible(),true);
    await page.locator('.rm-source').nth(0).click();
    await page.locator('.rm-source').nth(1).click();
    assert.equal(await page.locator('.rm-node').count(),2);
    // Move with real pointer events.
    let cards=page.locator('.rm-node');
    const first=await cards.nth(0).boundingBox();
    await page.mouse.move(first.x+12,first.y+12);await page.mouse.down();
    await page.mouse.move(first.x-160,first.y-90,{steps:8});await page.mouse.up();
    const moved=await cards.nth(0).boundingBox();assert.ok(moved.x<first.x-100);
    const second=await cards.nth(1).boundingBox();
    await page.mouse.move(second.x+40,second.y+40);await page.mouse.down();
    await page.mouse.move(second.x+150,second.y+130,{steps:8});await page.mouse.up();
    // Accessible click-to-connect and duplicate rejection.
    await cards.nth(0).locator('.out').click();await cards.nth(1).locator('.in').click();
    assert.equal(await page.locator('.rm-edge:not(.preview)').count(),1);
    await cards.nth(0).locator('.out').click();await cards.nth(1).locator('.in').click();
    assert.equal(await page.locator('.rm-edge:not(.preview)').count(),1);
    // Search and add a real topic via drag/drop payload.
    await page.locator('#rm-topics').click();await page.locator('#rm-search').fill('char');
    await page.locator('.rm-source').first().waitFor();
    await page.locator('.rm-source').first().evaluate((source)=> {
      const dataTransfer=new DataTransfer();
      source.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer}));
      const surface=document.querySelector('#rm-surface').getBoundingClientRect();
      document.querySelector('#rm-viewport').dispatchEvent(new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer,clientX:surface.left+350,clientY:surface.top+140}));
    });
    assert.equal(await cards.count(),3);
    // Connect by dragging from the new topic to an area.
    let from=await cards.nth(2).locator('.out').boundingBox(),to=await cards.nth(0).locator('.in').boundingBox();
    await page.mouse.move(from.x+8,from.y+8);await page.mouse.down();await page.mouse.move(to.x+8,to.y+8,{steps:10});await page.mouse.up();
    assert.equal(await page.locator('.rm-edge:not(.preview)').count(),2);
    // Remove one edge, undo it, then remove a node and restore it.
    await page.locator('.rm-edge-hit').first().focus();await page.keyboard.press('Enter');
    await page.locator('#rm-delete').click();assert.equal(await page.locator('.rm-edge:not(.preview)').count(),1);
    await page.locator('#rm-undo').click();assert.equal(await page.locator('.rm-edge:not(.preview)').count(),2);
    await cards.nth(0).click({position:{x:30,y:30}});await page.locator('#rm-delete').click();
    assert.equal(await cards.count(),2);assert.equal(await page.locator('.rm-edge:not(.preview)').count(),0);
    await page.locator('#rm-undo').click();assert.equal(await cards.count(),3);assert.equal(await page.locator('.rm-edge:not(.preview)').count(),2);
    await page.locator('#rm-zoom-out').click();assert.equal(await page.locator('#rm-zoom-value').textContent(),'70%');
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('roadmapBoard'))?.zoom > .69 && JSON.parse(localStorage.getItem('roadmapBoard')).zoom < .71);
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('roadmapBoard')));
    await page.reload();
    await page.waitForFunction(()=>document.querySelectorAll('.rm-node').length===3);
    assert.equal(await page.locator('.rm-edge:not(.preview)').count(),2);
    assert.equal(await page.locator('#rm-zoom-value').textContent(),'70%');
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('roadmapBoard')).nodes),saved.nodes);
    // A Notion-driven render must not switch the user away from the canvas.
    await page.evaluate(()=>render());assert.equal(await page.locator('#roadmap-view').isVisible(),true);
    await page.locator('#rm-fit').click();
    if(process.env.SCREENSHOT)await page.screenshot({path:process.env.SCREENSHOT,fullPage:true});
    await page.locator('#tab-today').click();assert.equal(await page.locator('#roadmap-view').isVisible(),false);
    await page.goBack();await page.waitForFunction(()=>state.activeTab==='roadmap');
    await page.locator('#tab-modules').click();await page.waitForFunction(()=>location.hash==='#/');
    assert.equal(await page.locator('#roadmap-view').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: roadmap route, area/topic add, drag, click/drag connections, duplicate guard, delete/undo, zoom, reload and navigation');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
