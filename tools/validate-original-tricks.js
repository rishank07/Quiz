"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const expected = [
  { id: "ct0471", title: "Economics Tricks", subject: "Economics", branch: "", pages: 59, query: "MARSHALL-1890" },
  { id: "ct0472", title: "Indian Geography Tricks", subject: "Geography", branch: "Indian Geography", pages: 101, query: "RCUCBAIAA" },
  { id: "ct0473", title: "World Geography Tricks", subject: "Geography", branch: "World Geography", pages: 93, query: "HE-ERA-HUM-SAU-THA" },
  { id: "ct0474", title: "Environment & Ecology Tricks", subject: "Environment & Ecology", branch: "", pages: 31, query: "WNGU" },
];

function loadWindowFile(relativePath) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, relativePath), "utf8"), context, { filename: relativePath });
  return context.window;
}

function validateInlineScripts(relativePath) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    if (/\bsrc\s*=/.test(match[1]) || /type\s*=\s*["'][^"']*json[^"']*["']/i.test(match[1])) continue;
    new vm.Script(match[2], { filename: `${relativePath}:inline` });
  }
}

const manifest = loadWindowFile("Crux-Tricks/crux-manifest.js").EF_CRUX_DOCS;
assert(manifest.length >= 474, "Crux manifest lost documents from the Original Tricks baseline");
const newDocs = manifest.filter((doc) => expected.some((item) => item.id === doc.id));
assert.strictEqual(newDocs.length, 4, "All four latest Original Tricks documents must be present");

for (const item of expected) {
  const doc = newDocs.find((candidate) => candidate.id === item.id);
  assert(doc, `Missing manifest document ${item.id}`);
  assert.strictEqual(doc.kind, "tricks", `${item.id} must be a Tricks document`);
  assert.strictEqual(doc.source, "ExamFusion Original", `${item.id} has the wrong source`);
  assert.strictEqual(doc.sourceTitle, item.title, `${item.id} has the wrong title`);
  assert.strictEqual(doc.subject, item.subject, `${item.id} has the wrong subject`);
  assert.strictEqual(doc.branch, item.branch, `${item.id} has the wrong part`);
  assert.strictEqual(doc.pages, item.pages, `${item.id} has the wrong page count`);

  const pdfPath = path.join(root, "Crux-Tricks", decodeURIComponent(doc.pdf));
  assert(fs.existsSync(pdfPath), `Missing PDF for ${item.id}`);
  const pageData = loadWindowFile(`Crux-Tricks/pages/${item.id}.js`);
  assert.strictEqual(pageData.EF_CRUX_DOC_ID, item.id, `Wrong page payload ID for ${item.id}`);
  assert.strictEqual(pageData.EF_CRUX_DOC_PAGES.length, item.pages, `Wrong page payload count for ${item.id}`);
  assert(pageData.EF_CRUX_DOC_PAGES.every((page) => String(page).trim()), `Empty searchable page in ${item.id}`);
}

const snippets = loadWindowFile("Crux-Tricks/search-snippets-original-geo-economics-tricks.js").EF_CRUX_TRICKS_SNIPPET_INDEX;
const newSnippets = snippets.filter((item) => expected.some((entry) => item.f.includes(`id=${entry.id}`)));
assert.strictEqual(newSnippets.length, 4, "Latest Original Tricks search must contain all four PDFs");
assert.strictEqual(newSnippets.reduce((sum, item) => sum + item.x.length, 0), 284, "Latest Original Tricks search must contain all 284 pages");

const messages = [];
const workerContext = { console, setTimeout, clearTimeout, postMessage(message) { messages.push(message); } };
workerContext.self = workerContext;
workerContext.window = workerContext;
workerContext.importScripts = function importScripts(url) {
  let file;
  if (url.includes("search-snippets-original-geo-economics-tricks.js")) file = "Crux-Tricks/search-snippets-original-geo-economics-tricks.js";
  else if (url.includes("crux-search-route.js")) file = "Crux-Tricks/crux-search-route.js";
  else if (url.includes("crux-manifest.js")) file = "Crux-Tricks/crux-manifest.js";
  else throw new Error(`Unexpected worker import: ${url}`);
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), workerContext, { filename: file });
};
vm.createContext(workerContext);
vm.runInContext(fs.readFileSync(path.join(root, "search-worker.js"), "utf8"), workerContext);
workerContext.onmessage({ data: { type: "init", options: {
  indexUrl: "/Crux-Tricks/search-snippets-original-geo-economics-tricks.js",
  globalName: "EF_CRUX_TRICKS_SNIPPET_INDEX",
  sectionPrefix: "./Crux-Tricks/",
  mode: "snippet",
  limit: 80,
} } });
expected.forEach((item, index) => workerContext.onmessage({ data: { type: "search", id: index + 1, query: item.query } }));
for (let index = 0; index < expected.length; index += 1) {
  const item = expected[index];
  const response = messages.find((message) => message.type === "result" && message.id === index + 1);
  assert(response && response.results.some((hit) => hit.f.includes(`id=${item.id}`)), `Full-text search did not find ${item.id}`);
}

const searchContext = {};
vm.createContext(searchContext);
vm.runInContext(`${fs.readFileSync(path.join(root, "search-index-main.js"), "utf8")};this.index=SEARCH_INDEX`, searchContext);
for (const item of expected) {
  assert(searchContext.index.some((entry) => entry.url === `./Crux-Tricks/viewer.html?id=${item.id}`), `Main search is missing ${item.id}`);
}

const version = "20260912ecologytricks1";
const hub = fs.readFileSync(path.join(root, "Crux-Tricks/index.html"), "utf8");
const viewer = fs.readFileSync(path.join(root, "Crux-Tricks/viewer.html"), "utf8");
const myPages = fs.readFileSync(path.join(root, "Crux-Tricks/my-pages.html"), "utf8");
const controller = fs.readFileSync(path.join(root, "Crux-Tricks/crux-tricks.js"), "utf8");
const serviceWorker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
assert(hub.includes(`crux-manifest.js?v=${version}`) && hub.includes(`crux-tricks.js?v=${version}`), "Crux hub cache keys are stale");
assert(viewer.includes(`crux-manifest.js?v=${version}`) && viewer.includes(`viewer-v2.js?v=${version}`), "Viewer cache keys are stale");
assert(myPages.includes(`crux-manifest.js?v=${version}`), "Saved Pages cache key is stale");
assert(controller.includes(`search-snippets-original-geo-economics-tricks.js?v=${version}`), "Full-text search cache key is stale");
assert(hub.includes("'Environment & Ecology':'🌿'") && hub.includes("'Environment & Ecology':'पर्यावरण एवं पारिस्थितिकी'"), "Environment & Ecology subject card is not wired");
assert(serviceWorker.includes("v71-ecology-tricks") && serviceWorker.includes(`viewer-v2.js?v=${version}`), "PWA cache was not refreshed");

validateInlineScripts("index.html");
validateInlineScripts("Crux-Tricks/index.html");
validateInlineScripts("Crux-Tricks/viewer.html");

console.log("Original Tricks validation passed: 4 PDFs, 284 searchable pages, viewer/study/PWA wiring complete");
