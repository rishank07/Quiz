// EFP_TEST_JSDOM=/path/to/jsdom EFP_LAYOUT_CHROMIUM=/path/to/chromium
// EFP_PLAYWRIGHT=/path/to/playwright node tools/test-mindmap-reader.cjs
// Serve repository files to a local test browser; never contact the live site.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require(process.env.EFP_TEST_JSDOM || 'jsdom');
const { chromium } = require(process.env.EFP_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const files = [
  'Mind Maps/History/Modern History/ChapterNames/european_companies_mindmap.html',
  'Mind Maps/History/Medieval History/ChapterNames/15_delhi_sultanate_mindmap.html',
  'Mind Maps/History/Ancient History/ChapterNames/04_vedic_age_mindmap.html',
  'Mind Maps/Polity/ChapterNames/01_constitutional_development_of_india_mindmap.html',
  'Mind Maps/Science/Physics/ChapterNames/01_physical_quantities_units_mindmap.html',
  'Mind Maps/Computer/01_history_generation_of_computer_mindmap.html',
  'Mind Maps/Static GK/ChapterNames/16_computer_mindmap.html',
  'Mind Maps/Economics/ChapterNames/02_economy_introduction_mindmap.html'
].filter(file => fs.existsSync(path.join(root, file)));
const panels = '.tab-content[id],.tab-panel[id],.panel[id],.tab[id]';
const widths = [360, 390, 768, 844, 1366];
const normalize = text => text.replace(/\s+/g, ' ').trim();
(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.EFP_LAYOUT_CHROMIUM,
    args: ['--no-sandbox', '--disable-gpu'], headless: true
  });
  let cases = 0;
  try {
    for (const file of files) {
      const parsed = new JSDOM(fs.readFileSync(path.join(root, file), 'utf8'));
      const targets = [...parsed.window.document.querySelectorAll(panels)];
      const target = targets[1] || targets[0];
      assert.ok(target, 'Missing panel: ' + file);
      const key = target.id.replace(/^(?:tab|panel|section)-/, '');
      const term = target.querySelector('b,em,strong')?.textContent.trim() || target.textContent.match(/[A-Za-z]{5,}/)[0];
      const query = file.includes('european_companies') ? 'Vasco da Gama' : term.slice(0, 60);
      const original = normalize(target.textContent);
      const id = target.id;
      parsed.window.close();
      const views = widths.map(width => ({ width, theme: 'off' })).concat([{ width: 390, theme: 'on' }]);
      for (const { width, theme } of views) {
        const context = await browser.newContext({ viewport: { width, height: width === 844 ? 390 : 844 }, colorScheme: theme === 'on' ? 'dark' : 'light' });
        await context.route('**/*', async route => {
          const url = new URL(route.request().url());
          if (url.origin !== 'https://examfusionprep.com' || url.pathname === '/service-worker.js') return route.abort();
          const local = path.join(root, decodeURIComponent(url.pathname));
          if (!fs.existsSync(local) || !fs.statSync(local).isFile()) return route.abort();
          const ext = path.extname(local);
          await route.fulfill({ body: fs.readFileSync(local), contentType: ({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[ext] || 'application/octet-stream' });
        });
        await context.addInitScript(({ query, theme }) => {
          localStorage.setItem('efp_black_mode', theme);
          sessionStorage.setItem('efp_search_return_v1:reader-test', JSON.stringify({
            token: 'reader-test', source: location.origin + '/Mind%20Maps/SubjectName.html', inputs: [{ id: 'searchInput', value: query }], filters: []
          }));
        }, { query, theme });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto('https://examfusionprep.com/' + encodeURI(file) + '?efSearchReturn=reader-test#' + key);
        await page.locator('.efp-mm-current-match').waitFor();
        const result = await page.evaluate(({ id }) => {
          const target = document.getElementById(id);
          const clone = target.cloneNode(true);
          clone.querySelectorAll('.efp-mindmap-search-context').forEach(el => el.remove());
          const mark = target.querySelector('.efp-mm-current-match');
          const rect = mark.getBoundingClientRect();
          const text = target.querySelector('.fact-text,li,td,.trap-body,.ra,.ans');
          return {
            text: clone.textContent, visible: getComputedStyle(target).display !== 'none',
            banners: document.querySelectorAll('.efp-mindmap-search-context').length,
            overflow: document.documentElement.scrollWidth - innerWidth,
            matchTop: rect.top, matchBottom: rect.bottom, height: innerHeight,
            matchLeft: rect.left, matchRight: rect.right,
            font: text && getComputedStyle(text).fontSize,
            markCount: target.querySelectorAll('.efp-mindmap-match').length
          };
        }, { id });
        assert.equal(result.visible, true, file);
        assert.equal(result.banners, 1, file);
        assert.equal(normalize(result.text), original, 'Content changed: ' + file);
        assert.ok(result.overflow <= 2, `Overflow ${result.overflow}px at ${width}: ${file}`);
        assert.ok(result.matchTop >= 0 && result.matchBottom <= result.height, 'Match is outside viewport: ' + file);
        assert.ok(result.matchLeft >= 0 && result.matchRight <= width, 'Match needs horizontal scrolling: ' + file);
        if (width <= 767 && result.font) assert.equal(result.font, '16px', file);
        assert.deepEqual(errors, [], file);
        if (result.markCount > 1) {
          await page.getByRole('button', { name: 'Next search match / अगला खोज परिणाम' }).click();
          assert.ok((await page.locator('.efp-mm-next').textContent()).startsWith('2/'));
        }
        if (file.includes('european_companies') && width === 390 && process.env.EFP_LAYOUT_OUTPUT) {
          await page.screenshot({ path: theme === 'on' ? process.env.EFP_LAYOUT_OUTPUT.replace(/\.png$/, '-dark.png') : process.env.EFP_LAYOUT_OUTPUT });
        }
        // A restored page must retain the learner's current scroll/match.
        const before = await page.locator('.efp-mm-next').textContent();
        await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        assert.equal(await page.locator('.efp-mm-next').textContent(), before);
        const urlBefore = page.url();
        const bannerHeight = await page.locator('.efp-mindmap-search-context').evaluate(el => el.getBoundingClientRect().height + parseFloat(getComputedStyle(el).marginBottom));
        const anchor = await page.locator('.efp-mm-current-match').evaluate(el => {
          el.parentElement.dataset.dismissAnchor = 'true';
          return el.parentElement.getBoundingClientRect().top;
        });
        const closeRect = await page.getByRole('button', { name: 'Clear search highlights / खोज हाइलाइट हटाएँ' }).boundingBox();
        assert.ok(closeRect && closeRect.y >= 0 && closeRect.y + closeRect.height <= (width === 844 ? 390 : 844), 'Dismiss control is outside viewport');
        // Click the visible control directly so automation does not first
        // scroll a sticky button and change the reading position itself.
        await page.mouse.click(closeRect.x + closeRect.width / 2, closeRect.y + closeRect.height / 2);
        assert.equal(await page.locator('.efp-mindmap-search-context,.efp-mindmap-match,.efp-deep-focus').count(), 0, `Dismiss not clicked: ${file}, ${width}, ${theme}, ${JSON.stringify(closeRect)}`);
        assert.equal(page.url(), urlBefore);
        const anchorAfter = await page.locator('[data-dismiss-anchor]').evaluate(el => el.getBoundingClientRect().top);
        // Near the document top, removing the banner can exhaust the scroll
        // offset. Otherwise the same text must stay at its reading position.
        const atTop = await page.evaluate(() => scrollY === 0);
        assert.ok(Math.abs(anchorAfter - anchor) <= 2 ||
          (atTop && anchorAfter < anchor && anchor - anchorAfter <= bannerHeight + 2),
          `Dismiss moved text: ${file}, ${width}, ${theme}: ${anchor} -> ${anchorAfter}`);
        assert.equal(normalize(await page.locator('#' + id).textContent()), original);
        assert.equal(await page.evaluate(() => EFP_SEARCH_RETURN.isActive()), true);
        await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
        assert.equal(await page.locator('.efp-mindmap-search-context,.efp-mindmap-match').count(), 0);
        await context.close(); cases++;
      }
    }
    console.log(`PASS: ${cases} chapter/viewport layout cases, unchanged content, exact matches, next-match, dismissal/reading position, search-return state and BFCache checks.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
