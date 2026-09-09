"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadWindowFile(relativePath) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(root, relativePath), "utf8"), context, { filename: relativePath });
  return context.window;
}

function validateInlineScripts(relativePath) {
  const html = fs.readFileSync(path.join(root, relativePath), "utf8");
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let count = 0;
  while ((match = scriptPattern.exec(html))) {
    if (/\bsrc\s*=/.test(match[1]) || /type\s*=\s*["'][^"']*json[^"']*["']/i.test(match[1])) continue;
    new vm.Script(match[2], { filename: `${relativePath}:inline-${count + 1}` });
    count += 1;
  }
  assert(count > 0, `No inline scripts checked in ${relativePath}`);
}

const manifest = loadWindowFile("Crux-Tricks/crux-manifest.js").EF_CRUX_DOCS;
assert(Array.isArray(manifest), "Crux manifest is not an array");
assert(manifest.length >= 466, "Crux manifest lost documents from the Economics baseline");

const economics = manifest.filter((doc) =>
  doc.kind === "crux" && doc.source === "Ghatnachakra" && doc.subject === "Economics"
);
assert.strictEqual(economics.length, 19, "Economics Crux must contain 19 documents");
assert.strictEqual(economics.reduce((sum, doc) => sum + doc.pages, 0), 123, "Economics page total must be 123");
assert.strictEqual(
  economics.map((doc) => doc.id).join(","),
  Array.from({ length: 19 }, (_, i) => `ct${String(448 + i).padStart(4, "0")}`).join(","),
  "Economics document IDs must be stable and consecutive",
);

for (const doc of economics) {
  const pdfPath = path.join(root, "Crux-Tricks", decodeURIComponent(doc.pdf));
  assert(fs.existsSync(pdfPath), `Missing PDF: ${doc.pdf}`);
  const pageWindow = loadWindowFile(`Crux-Tricks/pages/${doc.id}.js`);
  assert.strictEqual(pageWindow.EF_CRUX_DOC_ID, doc.id, `Wrong page index ID for ${doc.id}`);
  assert.strictEqual(pageWindow.EF_CRUX_DOC_PAGES.length, doc.pages, `Wrong page index count for ${doc.id}`);
  assert(pageWindow.EF_CRUX_DOC_PAGES.every((page) => String(page).trim()), `Empty searchable page in ${doc.id}`);
}

const snippets = loadWindowFile("Crux-Tricks/search-snippets-economics-crux.js").EF_CRUX_TRICKS_SNIPPET_INDEX;
assert.strictEqual(snippets.length, 19, "Economics full-text index must contain 19 documents");
assert.strictEqual(snippets.reduce((sum, item) => sum + item.x.length, 0), 123, "Economics full-text index must contain 123 pages");

const messages = [];
const workerContext = {
  console,
  setTimeout,
  clearTimeout,
  postMessage(message) { messages.push(message); },
};
workerContext.self = workerContext;
workerContext.window = workerContext;
workerContext.importScripts = function importScripts(url) {
  let file;
  if (url.includes("search-snippets-economics-crux.js")) file = "Crux-Tricks/search-snippets-economics-crux.js";
  else if (url.includes("crux-search-route.js")) file = "Crux-Tricks/crux-search-route.js";
  else if (url.includes("crux-manifest.js")) file = "Crux-Tricks/crux-manifest.js";
  else throw new Error(`Unexpected worker import: ${url}`);
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), workerContext, { filename: file });
};
vm.createContext(workerContext);
vm.runInContext(fs.readFileSync(path.join(root, "search-worker.js"), "utf8"), workerContext);
workerContext.onmessage({ data: { type: "init", options: {
  indexUrl: "/Crux-Tricks/search-snippets-economics-crux.js",
  globalName: "EF_CRUX_TRICKS_SNIPPET_INDEX",
  sectionPrefix: "./Crux-Tricks/",
  mode: "snippet",
  limit: 20,
} } });
workerContext.onmessage({ data: { type: "search", id: 1, query: "repo rate" } });
const response = messages.find((message) => message.type === "result" && message.id === 1);
assert(response && response.results.length, "Economics full-text search returned no result for repo rate");
assert(/^\/Crux-Tricks\/viewer\.html\?id=ct\d+$/.test(response.results[0].f), "Economics search did not route to the PDF reader");

const searchContext = {};
vm.createContext(searchContext);
vm.runInContext(`${fs.readFileSync(path.join(root, "search-index-main.js"), "utf8")};this.index=SEARCH_INDEX`, searchContext);
const mainEconomics = searchContext.index.filter((item) => item.breadcrumb === "Crux & Tricks / Ghatnachakra / Economics");
assert.strictEqual(mainEconomics.length, 19, "Main site search must contain all Economics Crux chapters");

const hub = fs.readFileSync(path.join(root, "Crux-Tricks/index.html"), "utf8");
const cruxController = fs.readFileSync(path.join(root, "Crux-Tricks/crux-tricks.js"), "utf8");
assert(hub.includes("Economics:'₹'"), "Economics subject card is not wired");
assert(hub.includes("Ghatnachakra Purvalokan/Economics/ChapterName.html"), "Economics Hindi chapter map is not wired");
assert(cruxController.includes("search-snippets-economics-crux.js"), "Economics full-text search worker is not wired");

validateInlineScripts("index.html");
validateInlineScripts("Crux-Tricks/index.html");
validateInlineScripts("Crux-Tricks/viewer.html");

console.log(`Economics Crux validation passed: 19 PDFs, 123 searchable pages, ${manifest.length} total PDFs`);
