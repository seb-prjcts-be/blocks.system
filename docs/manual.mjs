import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.79";
import { mountEli10Schema } from "./eli10-schema.mjs?v=0.1.5";

const board = document.querySelector("#manual-board");
const reader = document.querySelector("#manual-reader");
const resetButton = document.querySelector("#manual-reset");
const samples = [0.05, 0.1, 0.6, 0.05, 0.8, 0.6, 0.05, 0.4, 0.8, 0.6];
let sampleIndex = 0;
const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  random: () => samples[sampleIndex++ % samples.length],
  labels: { move: "move" },
  blockDefaults: { menu: { minimize: true, close: true } }
});

const manualIds = [
  "manual-eli10", "manual-start-a", "manual-start-div", "manual-start-blocks", "manual-start-grid", "manual-start-b", "manual-finish",
  "manual-content-html-intro", "manual-content-html-code", "manual-content-html",
  "manual-content-object-intro", "manual-content-object-code", "manual-content-object",
  "manual-content-factory-intro", "manual-content-factory-code", "manual-content-factory",
  "manual-menu", "manual-menu-code", "manual-menu-both", "manual-menu-minimize",
  "manual-menu-close", "manual-menu-none",
  "manual-layout",
  "manual-drag", "manual-drag-code",
  "manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3", "manual-drag-fixed-4", "manual-drag-fixed-5",
  "manual-drag-result",
  "manual-compact", "manual-compact-code", "manual-appearance", "manual-appearance-code", "manual-appearance-regular",
  "manual-appearance-inverse", "manual-colors", "manual-colors-code", "manual-color-cyan",
  "manual-color-magenta", "manual-color-yellow", "manual-random", "manual-random-code",
  "manual-random-color-0", "manual-random-color-50", "manual-random-color-100",
  "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100",
  "manual-random-combined", "manual-random-combined-code", "manual-random-mix-1", "manual-random-mix-2",
  "manual-random-mix-3", "manual-random-mix-4", "manual-next"
];
const content = await loadDocsContent("manual", manualIds);
blocks.attach(board);
blocks.setGrid(6, 50);
quantizeSurface(board);

function text(name, value, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function codeCard(entry) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-lesson-code";
  const explanation = document.createElement("div");
  if (entry.intro) explanation.append(text("p", entry.intro, "manual-explanation"));
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(text("code", Array.isArray(entry.code) ? entry.code.join("\n") : entry.code));
  root.append(explanation, pre);
  return root;
}

function setupStep(entry) {
  const root = document.createElement("div");
  root.className = "manual-explanation-card";
  root.append(text("p", entry.body));
  if (entry.code) {
    const pre = document.createElement("pre");
    pre.className = "manual-cdn-code";
    pre.append(text("code", entry.code.join("\n")));
    root.append(pre);
  }
  return root;
}

function introCard(entry) {
  const root = document.createElement("div");
  root.className = "manual-explanation-card";
  root.append(text("p", entry.intro));
  return root;
}

function codeOnlyCard(entry) {
  const root = document.createElement("div");
  root.className = "manual-code-card";
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(text("code", Array.isArray(entry.code) ? entry.code.join("\n") : entry.code));
  root.append(pre);
  return root;
}

function overviewText(entry) {
  const root = document.createElement("article");
  root.className = "manual-content-statement";
  root.append(text("strong", entry.statement));
  return root;
}

function specimen({ eyebrow, statement, body, code }) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-result";
  if (eyebrow) root.append(text("small", eyebrow));
  if (statement) root.append(text("strong", statement));
  if (body) root.append(text("p", body));
  if (code) {
    const pre = document.createElement("pre");
    pre.className = "manual-card-code";
    pre.append(text("code", code));
    root.append(pre);
  }
  return root;
}

function eli10(entry) {
  const root = document.createElement("article");
  root.className = "manual-eli10";
  const host = document.createElement("div");
  host.id = "eli10-schema";
  host.className = "eli10-schema";
  root.append(host);
  return root;
}

function htmlResult({ eyebrow, statement, footer }) {
  const root = document.createElement("article");
  root.className = "manual-content-demo manual-content-html-demo";
  root.append(text("small", eyebrow), text("strong", statement), text("span", footer));
  return root;
}

function imageObject({ alt, caption }) {
  const figure = document.createElement("figure");
  figure.className = "manual-content-demo manual-content-image-demo";
  const image = document.createElement("img");
  image.src = new URL("./img/pexels-peter-dyllong-2158803154-37352130.jpg", import.meta.url).href;
  image.width = 5184;
  image.height = 3456;
  image.alt = alt;
  image.decoding = "async";
  figure.append(image, text("figcaption", caption));
  return figure;
}

function factory({ eyebrow, states, action }) {
  return function createFreshElement() {
    const root = document.createElement("article");
    root.className = "manual-content-demo manual-content-factory-demo";
    const index = text("span", "", "manual-factory-index");
    index.setAttribute("aria-hidden", "true");
    const state = text("strong", "", "manual-factory-state");
    state.setAttribute("aria-live", "polite");
    const button = text("button", action, "manual-factory-action");
    button.type = "button";
    let active = 0;
    const render = () => {
      index.textContent = String(active + 1).padStart(2, "0");
      state.textContent = states[active];
      root.dataset.state = states[active];
    };
    button.addEventListener("click", () => {
      active = (active + 1) % states.length;
      render();
    });
    render();
    const readout = document.createElement("div");
    readout.className = "manual-factory-readout";
    readout.append(index, state);
    root.append(text("small", eyebrow), readout, button);
    return root;
  };
}

function next(entry) {
  const root = specimen(entry);
  const links = document.createElement("div");
  links.className = "manual-next-links";
  for (const item of entry.items) {
    const link = text("a", item.label);
    link.href = item.href;
    links.append(link);
  }
  root.append(links);
  return root;
}

function chance(entry) {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  root.append(
    text("small", entry.title.replace(/^\d+(?:\.\d+)?\s*\/\s*/, "")),
    text("strong", entry.statement)
  );
  return root;
}

function lockLessonBlock(block) {
  const menu = block.element.querySelector(":scope > .blocks-system-menu");
  const title = menu?.querySelector(".blocks-system-title");
  menu?.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu?.addEventListener("keydown", (event) => event.stopPropagation());
  if (!title) return;
  title.tabIndex = -1;
  title.removeAttribute("role");
  title.removeAttribute("aria-label");
  title.removeAttribute("aria-keyshortcuts");
}

function add({ id, title, blockContent, span, place, variant = "regular", menu, anchor = "", protectedBlock = false, classes = [] }) {
  if (anchor && blockContent instanceof Node) blockContent.prepend(text("h2", title, "manual-chapter-heading"));
  const options = {
    id,
    title,
    variant,
    menu: protectedBlock ? { minimize: false, close: false } : menu
  };
  if (options.menu === undefined) delete options.menu;
  const block = blocks.add(blockContent, options);
  block.span(...span);
  block.place(...place);
  block.element.dataset.manualKind = protectedBlock ? "lesson" : "demo";
  block.element.classList.add(...classes);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  if (protectedBlock) lockLessonBlock(block);
  return block;
}

function appendReaderEntry(root, entry, headingName) {
  if (entry.title) root.append(text(headingName, entry.title));
  if (entry.intro) root.append(text("p", entry.intro));
  if (entry.statement) root.append(text("p", entry.statement));
  if (entry.body) root.append(text("p", entry.body));
  if (entry.code) {
    const pre = document.createElement("pre");
    pre.append(text("code", Array.isArray(entry.code) ? entry.code.join("\n") : entry.code));
    root.append(pre);
  }
  if (entry.examples) root.append(text("p", entry.examples.join(" · ")));
  if (entry.items) {
    const list = document.createElement("ul");
    for (const item of entry.items) {
      const listItem = document.createElement("li");
      const link = text("a", item.label);
      link.href = item.href;
      listItem.append(link);
      list.append(listItem);
    }
    root.append(list);
  }
}

function createReaderArticle() {
  const lessons = [
    ["manual-eli10", []],
    ["manual-start-a", ["manual-start-div", "manual-start-blocks", "manual-start-grid", "manual-start-b", "manual-layout"]],
    ["manual-finish", ["manual-content-html-intro", "manual-content-html-code", "manual-content-html", "manual-content-object-intro", "manual-content-object-code", "manual-content-object", "manual-content-factory-intro", "manual-content-factory-code", "manual-content-factory"]],
    ["manual-menu", ["manual-menu-code", "manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none"]],
    ["manual-drag", ["manual-drag-code", "manual-drag-result"]],
    ["manual-compact", ["manual-compact-code"]],
    ["manual-appearance", ["manual-appearance-code", "manual-appearance-regular", "manual-appearance-inverse"]],
    ["manual-colors", ["manual-colors-code", "manual-color-cyan", "manual-color-magenta", "manual-color-yellow"]],
    ["manual-random", ["manual-random-code", "manual-random-color-0", "manual-random-color-50", "manual-random-color-100", "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100", "manual-random-combined", "manual-random-combined-code"]],
    ["manual-next", []]
  ];
  const fragment = document.createDocumentFragment();
  for (const [lessonId, sublessonIds] of lessons) {
    const section = document.createElement("section");
    appendReaderEntry(section, content[lessonId], "h2");
    for (const sublessonId of sublessonIds) appendReaderEntry(section, content[sublessonId], "h3");
    fragment.append(section);
  }
  reader.replaceChildren(fragment);
}

createReaderArticle();
resetButton.addEventListener("click", () => window.location.reload());

const eli10Block = add({
  id: "manual-eli10",
  title: content["manual-eli10"].title,
  blockContent: eli10(content["manual-eli10"]),
  span: [3, 2],
  place: [1, 1],
  anchor: "eli10",
  protectedBlock: true,
  classes: ["manual-half", "manual-eli10-block"]
});
eli10Block.element.style.setProperty("--blocks-content-padding", "0px");
mountEli10Schema(eli10Block.element.querySelector("#eli10-schema"));

for (const id of ["manual-start-a", "manual-start-div", "manual-start-blocks", "manual-start-grid"]) {
  add({
    id,
    title: content[id].title,
    blockContent: setupStep(content[id]),
    span: content[id].layout.span,
    place: content[id].layout.place,
    anchor: id === "manual-start-a" ? "start" : "",
    protectedBlock: true,
    classes: id === "manual-start-a" ? ["manual-chapter-start", "manual-cdn-step"] : []
  });
}
add({
  id: "manual-start-b",
  title: content["manual-start-b"].title,
  blockContent: codeOnlyCard(content["manual-start-b"]),
  span: content["manual-start-b"].layout.span,
  place: content["manual-start-b"].layout.place,
  protectedBlock: true
});
add({
  id: "manual-finish",
  title: content["manual-finish"].title,
  blockContent: overviewText(content["manual-finish"]),
  span: content["manual-finish"].layout.span,
  place: content["manual-finish"].layout.place,
  anchor: "content",
  protectedBlock: true,
  classes: ["manual-chapter-start"]
});
for (const name of ["html", "object", "factory"]) {
  const introId = "manual-content-" + name + "-intro";
  const codeId = "manual-content-" + name + "-code";
  const resultId = "manual-content-" + name;
  const result = name === "html" ? htmlResult(content[resultId]) : name === "object" ? imageObject(content[resultId]) : factory(content[resultId]);
  add({ id: introId, title: content[introId].title, blockContent: introCard(content[introId]), span: content[introId].layout.span, place: content[introId].layout.place, protectedBlock: true });
  add({ id: codeId, title: content[codeId].title, blockContent: codeOnlyCard(content[codeId]), span: content[codeId].layout.span, place: content[codeId].layout.place, protectedBlock: true, classes: ["manual-content-code-block"] });
  add({ id: resultId, title: content[resultId].title, blockContent: result, span: content[resultId].layout.span, place: content[resultId].layout.place, classes: ["manual-content-result-block"] });
}

add({ id: "manual-menu", title: content["manual-menu"].title, blockContent: introCard(content["manual-menu"]), span: content["manual-menu"].layout.span, place: content["manual-menu"].layout.place, anchor: "menu", protectedBlock: true, classes: ["manual-chapter-start"] });
add({ id: "manual-menu-code", title: content["manual-menu-code"].title, blockContent: codeOnlyCard(content["manual-menu-code"]), span: content["manual-menu-code"].layout.span, place: content["manual-menu-code"].layout.place, protectedBlock: true });
for (const [id, column, row, menu] of [
  ["manual-menu-both", 1, 21, { minimize: true, close: true }],
  ["manual-menu-minimize", 4, 21, { minimize: true, close: false }],
  ["manual-menu-close", 1, 23, { minimize: false, close: true }],
  ["manual-menu-none", 4, 23, { minimize: false, close: false }]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 2], place: [column, row], menu, classes: ["manual-half"] });
add({ id: "manual-layout", title: content["manual-layout"].title, blockContent: introCard(content["manual-layout"]), span: content["manual-layout"].layout.span, place: content["manual-layout"].layout.place, protectedBlock: true });
add({ id: "manual-drag", title: content["manual-drag"].title, blockContent: introCard(content["manual-drag"]), span: content["manual-drag"].layout.span, place: content["manual-drag"].layout.place, anchor: "dragging", protectedBlock: true, classes: ["manual-chapter-start"] });
add({ id: "manual-drag-code", title: content["manual-drag-code"].title, blockContent: codeOnlyCard(content["manual-drag-code"]), span: content["manual-drag-code"].layout.span, place: content["manual-drag-code"].layout.place, protectedBlock: true });
for (const id of ["manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3", "manual-drag-fixed-4", "manual-drag-fixed-5"]) {
  const fixed = add({ id, title: content[id].title, blockContent: "", span: content[id].layout.span, place: content[id].layout.place, menu: { minimize: false, close: false } });
  lockLessonBlock(fixed);
}
add({ id: "manual-drag-result", title: content["manual-drag-result"].title, blockContent: specimen(content["manual-drag-result"]), span: content["manual-drag-result"].layout.span, place: content["manual-drag-result"].layout.place });

for (const [id, codeId, anchor] of [
  ["manual-compact", "manual-compact-code", "compact"],
  ["manual-appearance", "manual-appearance-code", "appearance"],
  ["manual-colors", "manual-colors-code", "colors"],
  ["manual-random", "manual-random-code", "chance"]
]) {
  add({ id, title: content[id].title, blockContent: introCard(content[id]), span: content[id].layout.span, place: content[id].layout.place, anchor, protectedBlock: true, classes: ["manual-chapter-start"] });
  add({ id: codeId, title: content[codeId].title, blockContent: codeOnlyCard(content[codeId]), span: content[codeId].layout.span, place: content[codeId].layout.place, protectedBlock: true });
}

for (const [id, column, variant] of [
  ["manual-appearance-regular", 1, "regular"],
  ["manual-appearance-inverse", 4, "inverse"]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 2], place: [column, 34], variant, classes: ["manual-half"] });

for (const [id, column, color] of [
  ["manual-color-cyan", 1, "cyan"],
  ["manual-color-magenta", 3, "magenta"],
  ["manual-color-yellow", 5, "yellow"]
]) {
  const block = add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [2, 2], place: [column, 39], classes: ["manual-third"] });
  block.color = color;
}

blocks.variant = "random";
blocks.colorArray = ["cyan", "magenta", "yellow"];
blocks.inversionVariation = 0;
for (const [id, column, variation] of [
  ["manual-random-color-0", 1, 0],
  ["manual-random-color-50", 2, 0.5],
  ["manual-random-color-100", 3, 1]
]) {
  blocks.colorVariation = variation;
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 44], classes: ["manual-sixth"] });
}
blocks.colorVariation = 0;
for (const [id, column, variation] of [
  ["manual-random-inverse-0", 4, 0],
  ["manual-random-inverse-50", 5, 0.5],
  ["manual-random-inverse-100", 6, 1]
]) {
  blocks.inversionVariation = variation;
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 44], classes: ["manual-sixth"] });
}
add({ id: "manual-random-combined", title: content["manual-random-combined"].title, blockContent: introCard(content["manual-random-combined"]), span: content["manual-random-combined"].layout.span, place: content["manual-random-combined"].layout.place, protectedBlock: true });
add({ id: "manual-random-combined-code", title: content["manual-random-combined-code"].title, blockContent: codeOnlyCard(content["manual-random-combined-code"]), span: content["manual-random-combined-code"].layout.span, place: content["manual-random-combined-code"].layout.place, protectedBlock: true });
blocks.colorVariation = 0.5;
blocks.inversionVariation = 0.5;
for (const [index, column] of [1, 2, 3, 4].entries()) {
  const id = "manual-random-mix-" + (index + 1);
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 47], classes: ["manual-sixth"] });
}
add({ id: "manual-next", title: content["manual-next"].title, blockContent: next(content["manual-next"]), span: [6, 2], place: [1, 49], anchor: "next", protectedBlock: true, classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"] });

board.dataset.manualReady = "true";
