"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadPageFile(id) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, "Crux-Tricks", "pages", id + ".js"), "utf8"), context);
  assert.strictEqual(context.window.EF_CRUX_DOC_ID, id);
  return {
    pages: context.window.EF_CRUX_DOC_PAGES,
    aliases: context.window.EF_CRUX_DOC_PAGE_ALIASES,
  };
}

const arithmeticData = loadPageFile("ct0467");
const advanceData = loadPageFile("ct0468");
const arithmetic = arithmeticData.pages;
const advance = advanceData.pages;
assert.strictEqual(arithmetic.length, 73);
assert.strictEqual(advance.length, 282);
assert.strictEqual(arithmeticData.aliases.length, 73);
assert.strictEqual(advanceData.aliases.length, 282);
assert(arithmetic.every(Boolean), "Arithmetic has an empty searchable page");
assert(advance.every(Boolean), "Advance Maths has an empty searchable page");
assert.strictEqual(
  Array.from(advanceData.aliases).map((text, i) => /\balgebra\b/i.test(text) ? i + 1 : 0).filter(Boolean).join(","),
  "2",
  "Broad Algebra alias must point to its opening page only"
);

function pagesFor(pages, query) {
  const q = query.toLowerCase();
  return pages.map((text, i) => String(text).toLowerCase().includes(q) ? i + 1 : 0).filter(Boolean);
}

[
  [arithmetic, "election", 16],
  [arithmetic, "compound interest", 31],
  [arithmetic, "train", 61],
  [arithmetic, "cistern", 72],
  [advance, "quadratic equation", 13],
  [advance, "orthocenter", 86],
  [advance, "frustum", 186],
  [advance, "playing cards", 229],
  [advance, "variance", 236],
  [advance, "divisibility rule 11", 255],
].forEach(([pages, query, expected]) => {
  const matches = pagesFor(pages, query);
  assert(matches.includes(expected), `${query} did not include page ${expected}: ${matches}`);
});

const routeCode = fs.readFileSync(path.join(root, "Crux-Tricks", "crux-search-route.js"), "utf8");
const indexCode = fs.readFileSync(path.join(root, "Crux-Tricks", "search-snippets-maths-ocr.js"), "utf8");
const workerCode = fs.readFileSync(path.join(root, "search-worker.js"), "utf8");
const viewerCode = fs.readFileSync(path.join(root, "Crux-Tricks", "viewer-v2.js"), "utf8");
assert(viewerCode.includes("return renderSearchHighlights(next).then(function(highlighted)"), "OCR deep link must verify whether a real PDF highlight exists");
assert(viewerCode.includes("if(highlighted!==true)exactPageFallback()"), "OCR deep link must fall back to the exact page when the scanned PDF has no native text layer");
const messages = [];
const context = {
  console,
  setTimeout,
  clearTimeout,
  postMessage(message) { messages.push(message); }
};
context.self = context;
context.window = context;
context.importScripts = function (url) {
  if (url.includes("crux-search-route.js")) {
    vm.runInContext(routeCode, context);
  } else if (url.includes("crux-manifest.js")) {
    context.EF_CRUX_DOCS = [
      { id: "ct0467", title: "01 Arithmetic Maths Formulae", sourceTitle: "Arithmetic Maths Formulae", source: "ExamFusion Original", subject: "Maths" },
      { id: "ct0468", title: "02 Advance Maths Formula Book", sourceTitle: "Advance Maths Formula Book", source: "ExamFusion Original", subject: "Maths" },
    ];
  } else if (url.includes("search-snippets-maths-ocr.js")) {
    vm.runInContext(indexCode, context);
  } else {
    throw new Error("Unexpected import: " + url);
  }
};

vm.createContext(context);
vm.runInContext(workerCode, context);
context.onmessage({ data: { type: "init", options: {
  indexUrl: "/Crux-Tricks/search-snippets-maths-ocr.js",
  globalName: "EF_CRUX_TRICKS_SNIPPET_INDEX",
  sectionPrefix: "./Crux-Tricks/",
  mode: "snippet",
  strictOcr: true,
  limit: 80,
} } });

function globalSearch(id, query, expectedId, expectedPage) {
  context.onmessage({ data: { type: "search", id, query } });
  const response = messages.find((message) => message.type === "result" && message.id === id);
  assert(response && response.results.length, `No global result for ${query}`);
  const result = response.results.find((hit) => hit.f.includes(`id=${expectedId}`) && hit.x.charCodeAt(0) - 0xE000 + 1 === expectedPage);
  assert(result, `Global ${query} result did not route to ${expectedId} page ${expectedPage}`);
  const firstPageResult = response.results.find((hit) => {
    const code = String(hit.x || "").charCodeAt(0);
    return code >= 0xE000 && code <= 0xF8FF;
  });
  assert(firstPageResult, `Global ${query} did not return a page result`);
  assert.strictEqual(firstPageResult.x.charCodeAt(0) - 0xE000 + 1, expectedPage, `Global ${query} ranked the wrong page first`);
}

globalSearch(1, "election", "ct0467", 16);
globalSearch(2, "orthocenter", "ct0468", 86);
globalSearch(3, "frustum", "ct0468", 186);
globalSearch(4, "divisibility rule 11", "ct0468", 255);
globalSearch(5, "quadratic equation", "ct0468", 13);
globalSearch(6, "algebra", "ct0468", 2);

console.log("Maths OCR validation passed: 355/355 pages, strict ranking and exact-page routes.");
