// EFP_PLAYWRIGHT=/path/to/playwright EFP_CHROMIUM=/path/to/chromium node this-file
const pw = require(process.env.EFP_PLAYWRIGHT || 'playwright');
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}
const files = htmlFiles(path.join(root, 'Current Affairs/Topic Names')).filter(n => !n.includes('Rapid Practice'));
const server = http.createServer((req, res) => {
  const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json' }[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await pw.chromium.launch({ executablePath: process.env.EFP_CHROMIUM, headless: true, args: ['--no-sandbox'] });
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
      const context = await browser.newContext({ viewport });
      await context.route('**/*', r => r.request().url().startsWith(origin) ? r.continue() : r.abort());
      const page = await context.newPage();
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      for (const file of files.filter(file => !process.env.EFP_READING_FILE || file.includes(process.env.EFP_READING_FILE))) {
        const label = path.relative(root, file), url = origin + '/' + label;
        await page.goto(url);
        await page.waitForFunction(() => window.EFP_QUIZ_CONTINUITY);
        const target = await page.locator('.question-card').nth(4).getAttribute('id');
        assert(target, label + ' stable reading ID');
        await page.evaluate(id => {
          const card = document.getElementById(id);
          card.scrollIntoView({ block: 'start', behavior: 'instant' });
        }, target);
        await page.waitForTimeout(400);
        const record = await page.evaluate(() => {
          const keys = Object.keys(localStorage).filter(k => k.startsWith('efp_reading_position_v1:') && k.includes(encodeURIComponent(decodeURIComponent(location.pathname))));
          return keys.map(k => JSON.parse(localStorage.getItem(k))).find(r => r.id);
        });
        assert(record, label + ' normal scroll saves reading position');
        assert.equal(record.id, target, label + ' correct reading card saved');
        await page.goto(origin + '/support.html');
        await page.goto(url);
        await page.waitForTimeout(800);
        const top = await page.locator('#' + target).evaluate(n => n.getBoundingClientRect().top);
        assert(top >= -1 && top < viewport.height * .6, label + ' reopened reading card in view, top=' + top);
        console.log('PASS ' + viewport.width + 'px ' + label);
      }
      for (const [name, selector, offset] of [
        ['2026/Topic Wise/SPORTS2026.html', '#q5', 350],
        ['2026/Topic Wise/AWARDS2026_PROPER_BILINGUAL.html', '.table-scroll', 100],
        ['2026/Topic Wise/DRDOANDDEFENCE2026.html', '.oneliner-row', 0],
        ['2025/Month Wise/AUGUST2025.html', '.oneliner-item', 0]
      ]) {
        const url = origin + '/Current Affairs/Topic Names/' + name;
        await page.goto(url);
        await page.waitForFunction(() => window.EFP_QUIZ_CONTINUITY);
        // Real user input cancels a pending entry restore before changing the
        // reading position; these pages scroll their body, not window.
        await page.mouse.wheel(0, 1);
        await page.locator(selector).first().evaluate((n, offset) => {
          n.scrollIntoView({ block: 'start', behavior: 'instant' });
          document.body.scrollTop += offset;
        }, offset);
        await page.waitForTimeout(450);
        const before = await page.evaluate(() => document.body.scrollTop);
        assert(before > 100, 'Real reading container must have scrolled');
        await page.goto(origin + '/support.html');
        await page.goto(url);
        await page.waitForTimeout(900);
        const after = await page.evaluate(() => document.body.scrollTop);
        assert(Math.abs(before - after) < 4, name + ' exact reading offset preserved: ' + before + ' -> ' + after);
        if (name.includes('SPORTS')) {
          await page.goto(origin + '/support.html');
          await page.goto(url + '#q1');
          await page.waitForTimeout(800);
          const box = await page.locator('#q1').boundingBox();
          assert(box.y + box.height > 0 && box.y < viewport.height, 'Bookmark entry overrides saved reading position');
          await page.goto(origin + '/support.html');
          await page.goto(url);
          await page.waitForTimeout(900);
          assert(Math.abs(before - await page.evaluate(() => document.body.scrollTop)) < 4, 'Bookmark entry preserves previous reading checkpoint');
        }
        console.log('PASS ' + viewport.width + 'px exact reading offset: ' + name + ' ' + selector);
      }
      assert.deepEqual(errors, []);
      await context.close();
    }
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); server.close(); process.exitCode = 1; });
