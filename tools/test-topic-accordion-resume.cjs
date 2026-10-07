// EFP_PLAYWRIGHT=/path/to/playwright EFP_CHROMIUM=/path/to/chromium node this-file
const pw = require(process.env.EFP_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function framed(page, selector) {
  await page.waitForFunction(sel => {
    const box = document.querySelector(sel)?.getBoundingClientRect();
    return box && box.top >= 0 && box.top < innerHeight * .6;
  }, selector);
  await page.waitForTimeout(500);
  const box = await page.locator(selector).boundingBox();
  assert(box.y >= 0 && box.y < await page.evaluate(() => innerHeight * .6), 'Reading target remains visible');
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await pw.chromium.launch({ executablePath: process.env.EFP_CHROMIUM, headless: true, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
      const context = await browser.newContext({ viewport });
      // Block analytics and every other external resource before navigation.
      await context.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const url = origin + '/Bihar Special/Topic Names/Current Affairs for BPSC Pre 72.html';
      await page.goto(url);
      await page.waitForFunction(() => window.EFP_QUIZ_CONTINUITY && document.getElementById('bihar-ca-1'));
      await page.locator('#sec-0 > .state-title').click();
      await page.locator('#sec-1 > .state-title').click();
      const target = '#sec-1 .data-list > li:nth-child(25)';
      await page.evaluate(sel => {
        const card = document.querySelector(sel);
        window.scrollTo({ top: scrollY + card.getBoundingClientRect().top - 12, behavior: 'instant' });
      }, target);
      await page.waitForTimeout(400);
      const entry = await page.evaluate(() => {
        const key = Object.keys(localStorage).find(k => k.startsWith('efp_reading_position_v1:'));
        return key && JSON.parse(localStorage.getItem(key));
      });
      assert(entry, 'Reading position is saved by normal scrolling');
      assert.deepEqual(entry.expanded, ['sec-0', 'sec-1']);
      const factId = await page.locator(target).getAttribute('id');
      assert.equal(entry.id, factId, 'Save actual visible fact rather than clipped facts in closed sections');
      await page.goto(origin + '/support.html');
      await page.goto(url);
      await framed(page, target);
      assert.deepEqual(await page.locator('.state-section.open').evaluateAll(nodes => nodes.map(n => n.id)), ['sec-0', 'sec-1']);
      await page.reload();
      await framed(page, target);
      const positionKey = await page.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('efp_reading_position_v1:')));
      const checkpoint = await page.evaluate(k => { const entry = JSON.parse(localStorage.getItem(k)); delete entry.ts; return entry; }, positionKey);
      await page.goto(url + '?efsearch=Darbhanga#bihar-ca-2');
      await framed(page, '#bihar-ca-2');
      assert.equal(await page.locator('#searchInput').inputValue(), 'Darbhanga');
      await page.waitForTimeout(500);
      assert.deepEqual(await page.evaluate(k => { const entry = JSON.parse(localStorage.getItem(k)); delete entry.ts; return entry; }, positionKey), checkpoint, 'Search entry preserves unfiltered reading checkpoint');
      await page.goto(url + '#bihar-ca-2');
      await framed(page, '#bihar-ca-2');
      assert.equal(await page.locator('#sec-1').evaluate(n => n.classList.contains('open')), false, 'Explicit bookmark wins over saved dropdowns');
      await page.goto(url);
      await framed(page, target);
      await page.getByRole('button', { name: /Collapse All/ }).click();
      const heading = '#sec-12 > .state-title';
      await page.evaluate(sel => window.scrollTo({ top: scrollY + document.querySelector(sel).getBoundingClientRect().top - 120, behavior: 'instant' }), heading);
      await page.waitForTimeout(400);
      await page.goto(origin + '/support.html');
      await page.goto(url);
      await framed(page, heading);
      assert.equal(await page.locator('.state-section.open').count(), 0, 'Collapsed headings resume without opening unread lists');
      assert.deepEqual(errors, []);
      console.log('PASS ' + viewport.width + 'px Bihar CA: reopen/reload, multiple dropdowns, exact fact, search/bookmark priority, collapsed headings');
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
