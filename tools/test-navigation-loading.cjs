// Real Chromium, production Pages output and real topic/search/Back handlers.
// Add three seconds of network latency only after warming the selected pages.
// EFP_TEST_SW_FILE can select an earlier worker to reproduce the regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium, devices} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'cloudflare-dist');
const topic = '/Bihar%20Special/Topic%20Names/ANCIENT%20HISTORY%20OF%20BIHAR.html';
const hub = '/Bihar%20Special/Bihar%20Special.html';
const requests = [];
let delay = 0;
const mime = {'.js':'application/javascript','.html':'text/html','.css':'text/css',
  '.json':'application/json','.png':'image/png','.webmanifest':'application/manifest+json'};
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const decoded = decodeURIComponent(url.pathname);
  requests.push(url.pathname);
  if (delay && (decoded.endsWith('.html') || !path.extname(decoded) ||
      /^\/(?:home-nav|back-nav|app-session|search-context|search-logic)\.js$/.test(decoded))) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  if (res.destroyed) return;
  // Reproduce Pages' automatic canonical redirects.
  if (decoded.endsWith('.html')) {
    res.writeHead(301, {Location: url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '') + url.search});
    res.end(); return;
  }
  let filename = path.join(out, decoded);
  if (!filename.startsWith(out + path.sep) && filename !== out) {res.writeHead(403);res.end();return;}
  if (fs.existsSync(filename) && fs.statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
  if (!fs.existsSync(filename) && fs.existsSync(filename + '.html')) filename += '.html';
  if (url.pathname === '/service-worker.js' && process.env.EFP_TEST_SW_FILE) filename = process.env.EFP_TEST_SW_FILE;
  if (!fs.existsSync(filename)) {res.writeHead(404);res.end('Not found');return;}
  res.setHeader('Content-Type', mime[path.extname(filename)] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store'); // The service worker must own reuse.
  fs.createReadStream(filename).pipe(res);
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const portable = process.env.EFP_CHROMIUM_MODULE ? require(process.env.EFP_CHROMIUM_MODULE) : null;
  const browser = await chromium.launch({headless:true, args:portable ? portable.args : ['--no-sandbox'],
    executablePath:portable ? await portable.executablePath() : process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || chromium.executablePath()});
  try {
    for (const viewport of [{width:390,height:844}, {width:1366,height:768}]) {
      delay = 0;
      const context = await browser.newContext({...viewport.width < 600 ? devices['Pixel 7'] : {}, viewport});
      const page = await context.newPage();
      // Playwright routing marks normal requests as reloads. Use CDP Fetch to
      // block external traffic while preserving ordinary link/cache semantics.
      const cdp = await context.newCDPSession(page);
      cdp.on('Fetch.requestPaused', event => {
        const local = event.request.url.startsWith(origin);
        cdp.send(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
          requestId:event.requestId, ...(local ? {} : {errorReason:'BlockedByClient'})
        }).catch(() => {});
      });
      await cdp.send('Fetch.enable', {patterns:[{urlPattern:'*',requestStage:'Request'}]});
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      if (process.env.EFP_PERF_DEBUG) page.on('console', message => console.log('PAGE', message.text()));
      await page.goto(origin + '/?efpWorkPreview=1');
      if (process.env.EFP_PERF_DEBUG) console.log('HOME loaded');
      await page.evaluate(async () => {await navigator.serviceWorker.ready;});
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const worker = context.serviceWorkers()[0];
      if (process.env.EFP_PERF_DEBUG) await worker.evaluate(() => {
        self.__perfRequests = [];
        const original = cachedNetworkFirst;
        cachedNetworkFirst = async function(event, request, cache, options, policy) {
          self.__perfRequests.push({url:event.request.url, cache:event.request.cache,
            mode:event.request.mode, policy, hit:!!await cache.match(policy && policy.key || request)});
          return original(event, request, cache, options, policy);
        };
      });
      const open = async url => {
        await Promise.all([page.waitForNavigation({waitUntil:'domcontentloaded'}),
          page.evaluate(href => location.assign(href), origin + url)]);
      };
      for (const url of [hub, topic, hub]) {
        await open(url);
        await page.locator('#efp-app-back-button').waitFor();
      }
      const marker = JSON.stringify({'bookmark':'kept','answered':17});
      await page.evaluate(value => localStorage.setItem('efp_perf_saved_state', value), marker);
      delay = 3000;
      const timings = {};
      let start = Date.now();
      await open(topic);
      await page.locator('#efp-app-back-button').waitFor();
      timings.topic = Date.now() - start;
      if (process.env.EFP_PERF_DEBUG) console.log(await worker.evaluate(() => self.__perfRequests));
      assert(timings.topic < 1800, 'Warm topic waited for the network: ' + timings.topic + 'ms');
      await page.evaluate(source => sessionStorage.setItem('efp_search_return_v1:perf', JSON.stringify({
        token:'perf', source:location.origin + source, inputs:[{index:0,value:'Stupa'}], filters:[], results:[], presentation:[], scroll:0
      })), hub);
      start = Date.now();
      await open(topic + '?efSearchReturn=perf&efSearchQuery=Stupa&efsearch=Stupa#bihar-fact-29');
      try {await page.locator('#bihar-fact-29 mark.efp-context-match').first().waitFor({timeout:5000});}
      catch (error) {
        console.log('SEARCH STATE', await page.evaluate(() => ({url:location.href, ready:document.readyState,
          query:document.getElementById('searchInput')?.value, marks:document.querySelectorAll('mark').length,
          context:!!document.querySelector('.efp-search-context'), target:document.getElementById('bihar-fact-29')?.outerHTML.slice(0,800),
          scripts:Array.from(document.scripts,s=>s.src).filter(Boolean)})), errors);
        throw error;
      }
      await page.locator('.efp-search-context').waitFor();
      timings.searchEntry = Date.now() - start;
      assert(timings.searchEntry < 1800, 'Search entry waited for the network: ' + timings.searchEntry + 'ms');
      assert.equal(new URL(page.url()).searchParams.get('efSearchReturn'), 'perf');
      start = Date.now();
      await Promise.all([
        page.waitForURL(url => decodeURIComponent(url.pathname) === decodeURIComponent(hub)),
        page.locator('#efp-app-back-button').click()
      ]);
      await page.locator('#efp-app-back-button').waitFor();
      timings.back = Date.now() - start;
      assert(timings.back < 1800, 'Back waited for the network: ' + timings.back + 'ms');
      assert.equal(await page.evaluate(() => localStorage.getItem('efp_perf_saved_state')), marker);
      assert.deepEqual(errors, [], 'No page runtime errors');
      delay = 0;
      // A cold document must fetch the final Pages route with one request.
      const cold = '/support.html?efpWorkPreview=1';
      const before = requests.length;
      await page.evaluate(async () => {
        for (const name of await caches.keys()) {
          if (!name.startsWith('efp-pwa-')) continue;
          const cache = await caches.open(name);
          for (const key of await cache.keys()) if (new URL(key.url).pathname === '/support.html') await cache.delete(key);
        }
      });
      await open(cold);
      assert(!requests.slice(before).includes('/support.html'), 'Pages navigation must skip the .html redirect');
      assert(requests.slice(before).includes('/support'), 'Cold navigation must fetch the final static route');
      console.log('PASS real Pages navigation', viewport.width + 'px', JSON.stringify(timings), 'with 3000ms network latency; search target, Back source, storage and direct cold route');
      await context.close();
    }
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;}).finally(() => {
  server.closeAllConnections();server.close();
});
