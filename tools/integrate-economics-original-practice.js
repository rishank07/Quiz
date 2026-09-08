#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const practiceDir = path.join(root, "Original Practice");
const economicsFile = "Economics_Complete_Practice.html";
const economicsPath = path.join(practiceDir, economicsFile);

const subjectFiles = [
  { key: "history", filename: "History_Complete_Practice.html", label: "History", hi: "इतिहास", slug: "history", icon: "fa-landmark" },
  { key: "polity", filename: "Polity_Complete_Practice.html", label: "Polity", hi: "राजव्यवस्था", slug: "polity", icon: "fa-scale-balanced" },
  { key: "science", filename: "Science_Complete_Practice.html", label: "Science", hi: "विज्ञान", slug: "science", icon: "fa-flask" },
  { key: "geography", filename: "Geography_Complete_Practice.html", label: "Geography", hi: "भूगोल", slug: "geography", icon: "fa-earth-asia" },
  { key: "economics", filename: economicsFile, label: "Economics", hi: "अर्थशास्त्र", slug: "economics", icon: "fa-coins" },
];

function readMaster(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const match = html.match(/<script id="master-data" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);
  if (!match) throw new Error(`master-data not found in ${filePath}`);
  return JSON.parse(match[1]);
}

function requireText(value, where) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing bilingual text: ${where}`);
}

function validateEconomics(master) {
  const subjects = Object.keys(master);
  if (subjects.length !== 1 || subjects[0] !== "Economics / अर्थशास्त्र") {
    throw new Error("Economics master-data must contain exactly the bilingual Economics subject");
  }
  const chapters = master[subjects[0]];
  if (Object.keys(chapters).length !== 19) throw new Error("Economics must contain exactly 19 chapters");

  let questions = 0;
  let sections = 0;
  Object.entries(chapters).forEach(([chapter, chapterSections]) => {
    if (!/^\d{2}\.\s/.test(chapter) || !/[\u0900-\u097f]/.test(chapter)) {
      throw new Error(`Chapter name/number is not bilingual and two-digit: ${chapter}`);
    }
    if (!Array.isArray(chapterSections) || !chapterSections.length) throw new Error(`No sections: ${chapter}`);
    chapterSections.forEach((section, sectionIndex) => {
      sections += 1;
      requireText(section?.title?.en, `${chapter} section ${sectionIndex + 1} English title`);
      requireText(section?.title?.hi, `${chapter} section ${sectionIndex + 1} Hindi title`);
      if (!Array.isArray(section.questions) || !section.questions.length) {
        throw new Error(`No questions: ${chapter}, section ${sectionIndex + 1}`);
      }
      section.questions.forEach((question, questionIndex) => {
        const where = `${chapter}, section ${sectionIndex + 1}, question ${questionIndex + 1}`;
        ["q", "a", "exp"].forEach((field) => {
          requireText(question?.[field]?.en, `${where} ${field}.en`);
          requireText(question?.[field]?.hi, `${where} ${field}.hi`);
        });
        if (!Array.isArray(question.o) || question.o.length < 2) throw new Error(`Missing options: ${where}`);
        question.o.forEach((option, optionIndex) => {
          requireText(option?.en, `${where} option ${optionIndex + 1}.en`);
          requireText(option?.hi, `${where} option ${optionIndex + 1}.hi`);
        });
        if (!question.o.some((option) => option.en === question.a.en)) {
          throw new Error(`Correct English answer is not present in options: ${where}`);
        }
        questions += 1;
      });
    });
  });
  return { subjects: 1, chapters: 19, sections, questions };
}

function splitChapter(chapter) {
  const parts = String(chapter).split(" - ");
  if (parts.length > 1 && /[\u0900-\u097f]/.test(parts[parts.length - 1])) {
    return { en: parts.slice(0, -1).join(" - "), hi: parts[parts.length - 1] };
  }
  return { en: String(chapter), hi: "" };
}

function query(params) {
  return new URLSearchParams(params).toString();
}

function loadWindowArray(filePath, globalName) {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(filePath, "utf8"), context, { filename: filePath });
  const value = context.window[globalName];
  if (!Array.isArray(value)) throw new Error(`${globalName} was not an array`);
  return value;
}

function loadSearchIndex(filePath) {
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${fs.readFileSync(filePath, "utf8")};this.__index=SEARCH_INDEX`, context, { filename: filePath });
  if (!Array.isArray(context.__index)) throw new Error("SEARCH_INDEX was not an array");
  return context.__index;
}

function economicsChapterRecords(master, rootRelative) {
  const records = [];
  Object.entries(master).forEach(([subject, chapters]) => {
    Object.keys(chapters).forEach((chapter) => {
      const names = splitChapter(chapter);
      records.push({
        title: `${names.en}${names.hi ? ` / ${names.hi}` : ""}`,
        url: `${rootRelative}${economicsFile}?${query({ subject, chapter })}`,
        section: "Original Practice",
        breadcrumb: `Original Practice / Economics / ${subject}`,
        leaf: true,
        hi: names.hi,
      });
    });
    records.push({
      title: subject,
      url: `${rootRelative}${economicsFile}?${query({ subject })}`,
      section: "Original Practice",
      breadcrumb: "Original Practice / Economics",
      leaf: false,
      hi: "अर्थशास्त्र",
    });
  });
  return records;
}

function questionSearchText(question, questionIndex) {
  const parts = [String.fromCharCode(0xe000 + questionIndex) + question.q.en];
  if (question.q.hi !== question.q.en) parts.push(question.q.hi);
  parts.push(`Answer: ${question.a.en}`);
  if (question.a.hi !== question.a.en) parts.push(`उत्तर: ${question.a.hi}`);
  parts.push(`Explanation: ${question.exp.en}`);
  if (question.exp.hi !== question.exp.en) parts.push(`व्याख्या: ${question.exp.hi}`);
  return parts.join(" ");
}

function economicsSnippetRecords(master) {
  const records = [];
  Object.entries(master).forEach(([subject, chapters]) => {
    Object.entries(chapters).forEach(([chapter, sections]) => {
      sections.forEach((section, sectionIndex) => {
        records.push({
          f: `./Original%20Practice/${economicsFile}?${query({ subject, chapter })}&section=${sectionIndex + 1}`,
          t: `${section.title.en}${section.title.hi !== section.title.en ? ` / ${section.title.hi}` : ""}`,
          b: `Original Practice / Economics / ${subject} / ${chapter}`,
          x: section.questions.map(questionSearchText),
        });
      });
    });
  });
  return records;
}

function writeQuestionCounts() {
  const subjects = {};
  let totalQuestions = 0;
  let totalChapters = 0;
  subjectFiles.forEach((meta) => {
    const master = readMaster(path.join(practiceDir, meta.filename));
    let pageQuestions = 0;
    let pageChapters = 0;
    const groups = [];
    Object.entries(master).forEach(([name, chapters]) => {
      let groupQuestions = 0;
      Object.values(chapters).forEach((sections) => {
        pageChapters += 1;
        sections.forEach((section) => { groupQuestions += section.questions.length; });
      });
      pageQuestions += groupQuestions;
      groups.push({ name, chapters: Object.keys(chapters).length, questions: groupQuestions });
    });
    totalQuestions += pageQuestions;
    totalChapters += pageChapters;
    subjects[meta.key] = {
      filename: meta.filename,
      label: meta.label,
      hi: meta.hi,
      slug: meta.slug,
      icon: meta.icon,
      questions: pageQuestions,
      chapters: pageChapters,
      subjects: groups,
    };
  });
  const payload = { total_questions: totalQuestions, total_chapters: totalChapters, subjects };
  fs.writeFileSync(path.join(practiceDir, "question-counts.json"), `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function updateIndexes(master) {
  const practiceIndexPath = path.join(practiceDir, "original-practice-index.js");
  const practiceIndex = loadWindowArray(practiceIndexPath, "EFP_ORIGINAL_PRACTICE_INDEX")
    .filter((record) => !String(record.url || "").includes(economicsFile));
  practiceIndex.push(...economicsChapterRecords(master, "./"));
  fs.writeFileSync(practiceIndexPath, `window.EFP_ORIGINAL_PRACTICE_INDEX = ${JSON.stringify(practiceIndex)};\n`);

  const mainIndexPath = path.join(root, "search-index-main.js");
  const mainIndex = loadSearchIndex(mainIndexPath).filter((record) => !String(record.url || "").includes(economicsFile));
  let insertion = -1;
  for (let i = 0; i < mainIndex.length; i += 1) {
    if (mainIndex[i].section === "Original Practice") insertion = i + 1;
  }
  mainIndex.splice(insertion < 0 ? mainIndex.length : insertion, 0, ...economicsChapterRecords(master, "./Original%20Practice/"));
  fs.writeFileSync(mainIndexPath, `var SEARCH_INDEX = ${JSON.stringify(mainIndex)};\n`);

  const snippetsPath = path.join(root, "search-snippets-original-practice.js");
  const snippets = loadWindowArray(snippetsPath, "EF_ORIGINAL_PRACTICE_SNIPPET_INDEX")
    .filter((record) => !String(record.f || "").includes(economicsFile));
  const header = [
    "// Full-text global-search index for ExamFusion Prep Original Practice.",
    "// Generated from the four Original Practice master-data blocks.",
    "// Grouped by section; each x[] entry is one MCQ (question + correct answer + explanation).",
    "// Loaded only inside search-worker.js after the user actually searches, so the homepage remains responsive.",
  ].join("\n");
  fs.writeFileSync(snippetsPath, `${header}\nwindow.EF_ORIGINAL_PRACTICE_SNIPPET_INDEX = ${JSON.stringify(snippets)};\n`);

  const economicsSnippets = economicsSnippetRecords(master);
  const economicsSnippetsPath = path.join(root, "search-snippets-economics-original-practice.js");
  const economicsHeader = [
    "// Full-text global-search index for Economics Original Practice.",
    "// Grouped by section; each x[] entry is one MCQ (question + correct answer + explanation).",
    "// Loaded only after the user searches, keeping the homepage responsive.",
  ].join("\n");
  fs.writeFileSync(economicsSnippetsPath, `${economicsHeader}\nwindow.EF_ECONOMICS_ORIGINAL_PRACTICE_SNIPPET_INDEX = ${JSON.stringify(economicsSnippets)};\n`);
}

function updateBackParentMap() {
  const mapPath = path.join(root, "back-parent-map.js");
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(mapPath, "utf8"), context, { filename: mapPath });
  const current = context.window.EFP_BACK_PARENT_MAP;
  if (!current || typeof current !== "object") throw new Error("EFP_BACK_PARENT_MAP was not an object");
  const map = { ...current, "/Original Practice/Economics_Complete_Practice.html": "/Original Practice/index.html" };
  const sorted = Object.fromEntries(Object.entries(map).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0));
  const logicalParents = Object.keys(sorted).length;
  const header = [
    "/* Generated by tools/update-back-parent-map.py. Do not edit manually. */",
    `/* HTML pages scanned: ${logicalParents + 1}; logical parents: ${logicalParents} */`,
  ].join("\n");
  fs.writeFileSync(mapPath, `${header}\nwindow.EFP_BACK_PARENT_MAP = Object.freeze(${JSON.stringify(sorted)});\n`);
}

function main() {
  const economicsMaster = readMaster(economicsPath);
  const validated = validateEconomics(economicsMaster);
  const counts = writeQuestionCounts();
  updateIndexes(economicsMaster);
  updateBackParentMap();
  console.log(JSON.stringify({ validated, totals: { questions: counts.total_questions, chapters: counts.total_chapters } }, null, 2));
}

main();
