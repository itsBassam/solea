// Run with Playwright available: node scripts/check-site.cjs [preview URL]
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 const page = await browser.newPage({viewport:{width:1440,height:900}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 const url=process.argv[2] || 'http://localhost:3000';
 await page.goto(url);await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.frame==='0');
 const frame=()=>page.locator('canvas').getAttribute('data-frame').then(Number);
 await page.mouse.wheel(0,1000);
 await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frame)>80);
 const forward=await frame();
 await page.mouse.wheel(0,-700);
 await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frame)<40);
 const reverse=await frame();assert(reverse<forward);
 await page.getByRole('button',{name:'Pause motion'}).click();
 const frozen=await frame();await page.mouse.wheel(0,300);await page.waitForTimeout(400);assert.equal(await frame(),frozen);
 await page.getByRole('button',{name:'Enable motion'}).click();
 await page.getByRole('button',{name:'Book an appointment'}).click();
 assert(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');assert(!(await page.getByRole('dialog').isVisible()));
 for(const width of [390,320]) {
  await page.setViewportSize({width,height:844});
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
  await page.mouse.wheel(0,700);await page.waitForFunction(()=>Number(document.querySelector('canvas').dataset.frame)>30);
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.frame==='0');
 assert.equal(await page.locator('.hero').evaluate(el=>getComputedStyle(el).position),'relative');
 await page.mouse.wheel(0,500);assert.equal(await frame(),0);
 const fallback=await browser.newPage({viewport:{width:390,height:844}});
 await fallback.route('**/media/frames/**',route=>route.request().resourceType()==='fetch'?route.abort():route.continue());
 await fallback.goto(url);assert(await fallback.locator('.film-poster').evaluate(img=>img.complete&&img.naturalWidth>0));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log(JSON.stringify({forward,reverse,pause:'passed',booking:'passed',mobile:'390/320 passed',reducedMotion:'passed',failedFrameFallback:'passed',runtimeErrors:errors}));
 await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});

