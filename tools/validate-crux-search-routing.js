"use strict";

const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const root = path.resolve(__dirname, "..");
const routeCode = fs.readFileSync(path.join(root, "Crux-Tricks", "crux-search-route.js"), "utf8");
const workerCode = fs.readFileSync(path.join(root, "search-worker.js"), "utf8");
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
  if (url.indexOf("crux-search-route.js") !== -1) {
    vm.runInContext(routeCode, context);
  } else if (url.indexOf("crux-manifest.js") !== -1) {
    context.EF_CRUX_DOCS = [{
      id: "ct0001",
      title: "01.i Area",
      sourceTitle: "1.i Area",
      source: "Ghatnachakra",
      subject: "Geography",
      branch: "Indian Geography",
      pdf: "pdfs/Books%20CRUX/Ghatnachakra/Geography/Indian%20Geography/1.i%20Area.pdf"
    }];
  } else if (url.indexOf("search-snippets") !== -1) {
    context.EF_CRUX_TRICKS_SNIPPET_INDEX = [{
      f: "./Crux-Tricks/legacy/1.i%20Area.html",
      t: "01.i Area",
      b: "Crux & Tricks / Ghatnachakra / Geography / Indian Geography",
      x: [String.fromCharCode(0xE000) + "India ranks seventh by area"]
    }];
  } else {
    throw new Error("Unexpected import: " + url);
  }
};

vm.createContext(context);
vm.runInContext(workerCode, context);
context.onmessage({ data: { type: "init", options: {
  indexUrl: "/Crux-Tricks/search-snippets-crux-tricks.js",
  globalName: "EF_CRUX_TRICKS_SNIPPET_INDEX",
  sectionPrefix: "./Crux-Tricks/",
  mode: "snippet"
} } });
context.onmessage({ data: { type: "search", id: 1, query: "seventh area" } });

const response = messages.find((message) => message.type === "result" && message.id === 1);
assert(response && response.results.length, "Crux worker returned no matching result");
assert.strictEqual(response.results[0].f, "/Crux-Tricks/viewer.html?id=ct0001");

const fromHome = new URL(response.results[0].f + "&page=1", "https://examfusionprep.com/").href;
const fromCrux = new URL(response.results[0].f + "&page=1", "https://examfusionprep.com/Crux-Tricks/index.html").href;
assert.strictEqual(fromCrux, fromHome, "Crux route changes when resolved from the hub");
assert(!fromCrux.includes("/Crux-Tricks/Crux-Tricks/"), "Crux route contains a doubled folder");

console.log("Crux search routing validation passed:", fromCrux);
