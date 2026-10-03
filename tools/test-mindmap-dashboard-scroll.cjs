// EFP_LAYOUT_CHROMIUM=/path/to/chromium EFP_PLAYWRIGHT=/path/to/playwright
// node tools/test-mindmap-dashboard-scroll.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.EFP_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const views = [
  { width: 360, height: 780, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 844, height: 390, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 1024, height: 768, touch: true },
  { width: 1366, height: 900, touch: false }
];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.EFP_LAYOUT_CHROMIUM, args: ['--no-sandbox', '--disable-gpu'], headless: true });
  let cases = 0;
  try {
    for (const view of views) for (const mode of ['off', 'on']) {
      const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, hasTouch: view.touch, isMobile: view.touch });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== 'https://examfusionprep.com' || url.pathname === '/service-worker.js') return route.abort();
        const file = path.join(root, decodeURIComponent(url.pathname));
        if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
        const ext = path.extname(file);
        await route.fulfill({ body: fs.readFileSync(file), contentType: ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' })[ext] || 'application/octet-stream' });
      });
      await context.addInitScript(mode => localStorage.setItem('efp_black_mode', mode), mode);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://examfusionprep.com/Mind%20Maps/SubjectName.html');
      await page.locator('#efp-home-button').waitFor();
      const headers = page.locator('.card-header');
      await headers.first().click();
      assert.equal(await page.locator('.card').first().evaluate(el => el.classList.contains('active')), true);
      // Repeated scroll and dynamic viewport-height changes exercise the
      // lower canvas with closed/open subject cards and browser toolbar sizes.
      for (const height of [view.height, view.height - 80, view.height]) {
        await page.setViewportSize({ width: view.width, height });
        for (const position of ['middle', 'bottom', 'top']) {
          await page.evaluate(position => {
            const height = document.documentElement.scrollHeight;
            scrollTo({ top: position === 'bottom' ? height : position === 'middle' ? height / 2 : 0, behavior: 'instant' });
          }, position);
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const canvas = await page.evaluate(() => ({
            root: getComputedStyle(document.documentElement).backgroundColor,
            body: getComputedStyle(document.body).backgroundColor,
            overflow: document.documentElement.scrollWidth - innerWidth,
            blur: getComputedStyle(document.querySelector('.container')).backdropFilter,
            attachment: getComputedStyle(document.body).backgroundAttachment
          }));
          assert.ok(!/rgba\([^)]*, 0\)|transparent/.test(canvas.root), 'Transparent root canvas');
          assert.ok(!/rgba\([^)]*, 0\)|transparent/.test(canvas.body), 'Transparent body canvas');
          assert.ok(canvas.overflow <= 2, 'Horizontal overflow');
          if (view.touch) { assert.equal(canvas.blur, 'none'); assert.ok(!canvas.attachment.includes('fixed')); }
          cases++;
        }
      }
      const hover = await page.locator('.submenu a').first().evaluate(el => {
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 15, clientY: 15 }));
        const background = el.style.background;
        el.dispatchEvent(new MouseEvent('mouseleave'));
        return { background, cleared: el.style.background };
      });
      if (view.touch) assert.equal(hover.background, '');
      else assert.ok(hover.background.includes('radial-gradient'));
      assert.equal(hover.cleared, '');
      await headers.first().click();
      assert.equal(await page.locator('.card').first().evaluate(el => el.classList.contains('active')), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log(`PASS: ${cases} scroll/viewport/theme cases, touch-hover guard and working subject toggles.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
