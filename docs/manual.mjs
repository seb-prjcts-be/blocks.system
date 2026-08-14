import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface, scrollToCurrentHash } from "./shell.mjs?v=0.1.85";
import { mountEli10Schema } from "./eli10-schema.mjs?v=0.1.6";

const board = document.querySelector("#manual-board");
const reader = document.querySelector("#manual-reader");
const resetButton = document.querySelector("#manual-reset");
const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
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
  "manual-base-colors", "manual-base-colors-code",
  "manual-appearance", "manual-appearance-code", "manual-appearance-regular",
  "manual-appearance-inverse", "manual-colors", "manual-colors-code", "manual-color-cyan",
  "manual-color-magenta", "manual-color-yellow", "manual-random", "manual-random-code", "manual-random-action",
  "manual-random-mix-1", "manual-random-mix-2",
  "manual-random-mix-3", "manual-random-mix-4", "manual-random-mix-5", "manual-random-mix-6",
  "manual-random-mix-7", "manual-random-mix-8", "manual-random-mix-9", "manual-random-mix-10",
  "manual-random-mix-11", "manual-random-mix-12", "manual-next"
];
const content = await loadDocsContent("manual", manualIds);
blocks.attach(board);
blocks.setGrid(6, 46);
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

function factory({ states }) {
  return function createFreshElement() {
    const button = text("button", states[0], "manual-content-demo manual-content-factory-demo");
    button.type = "button";
    let active = 0;
    button.dataset.state = states[active];
    button.addEventListener("click", () => {
      active = (active + 1) % states.length;
      button.textContent = states[active];
      button.dataset.state = states[active];
    });
    return button;
  };
}

function chance(index) {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  root.append(text("strong", String(index + 1).padStart(2, "0")));
  return root;
}

function randomControls(entry) {
  const root = document.createElement("div");
  root.className = "manual-random-controls";
  const inputs = {};
  const outputs = {};
  for (const field of entry.fields) {
    const label = document.createElement("label");
    label.className = "manual-random-field";
    const labelRow = document.createElement("span");
    labelRow.className = "manual-random-label";
    const output = document.createElement("output");
    output.htmlFor = "manual-" + field.name;
    const input = document.createElement("input");
    input.id = "manual-" + field.name;
    input.name = field.name;
    input.type = "range";
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(field.value);
    labelRow.append(text("span", field.label), output);
    label.append(labelRow, input);
    root.append(label);
    inputs[field.name] = input;
    outputs[field.name] = output;
  }
  const button = text("button", entry.action, "manual-random-trigger");
  button.type = "button";
  root.append(button);
  return { root, inputs, outputs, button };
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

function add({ id, title, blockContent, span, place, variant = "regular", useSystemVariant = false, menu, anchor = "", protectedBlock = false, classes = [] }) {
  if (anchor && blockContent instanceof Node) blockContent.prepend(text("h2", title, "manual-chapter-heading"));
  const options = {
    id,
    title,
    variant,
    menu: protectedBlock ? { minimize: false, close: false } : menu
  };
  if (useSystemVariant) delete options.variant;
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
  if (entry.action) root.append(text("p", entry.action));
  if (entry.fields) root.append(text("p", entry.fields.map((field) => field.label + " " + field.min + "–" + field.max).join(" · ")));
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
    ["manual-base-colors", ["manual-base-colors-code"]],
    ["manual-appearance", ["manual-appearance-code", "manual-appearance-regular", "manual-appearance-inverse"]],
    ["manual-colors", ["manual-colors-code", "manual-color-cyan", "manual-color-magenta", "manual-color-yellow"]],
    ["manual-random", ["manual-random-code", "manual-random-action"]],
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
  place: [2, 1],
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
  ["manual-menu-close", 1, 22, { minimize: false, close: true }],
  ["manual-menu-none", 4, 22, { minimize: false, close: false }]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 1], place: [column, row], menu, classes: ["manual-half"] });
add({ id: "manual-layout", title: content["manual-layout"].title, blockContent: introCard(content["manual-layout"]), span: content["manual-layout"].layout.span, place: content["manual-layout"].layout.place, protectedBlock: true });
add({ id: "manual-drag", title: content["manual-drag"].title, blockContent: introCard(content["manual-drag"]), span: content["manual-drag"].layout.span, place: content["manual-drag"].layout.place, anchor: "dragging", protectedBlock: true, classes: ["manual-chapter-start"] });
add({ id: "manual-drag-code", title: content["manual-drag-code"].title, blockContent: codeOnlyCard(content["manual-drag-code"]), span: content["manual-drag-code"].layout.span, place: content["manual-drag-code"].layout.place, protectedBlock: true });
for (const id of ["manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3", "manual-drag-fixed-4", "manual-drag-fixed-5"]) {
  const fixed = add({ id, title: content[id].title, blockContent: "", span: content[id].layout.span, place: content[id].layout.place, menu: { minimize: false, close: false } });
  lockLessonBlock(fixed);
}
add({ id: "manual-drag-result", title: content["manual-drag-result"].title, blockContent: specimen(content["manual-drag-result"]), span: content["manual-drag-result"].layout.span, place: content["manual-drag-result"].layout.place });

for (const [id, codeId, anchor] of [
  ["manual-base-colors", "manual-base-colors-code", "base-colors"],
  ["manual-appearance", "manual-appearance-code", "appearance"],
  ["manual-colors", "manual-colors-code", "colors"]
]) {
  add({ id, title: content[id].title, blockContent: introCard(content[id]), span: content[id].layout.span, place: content[id].layout.place, anchor, protectedBlock: true, classes: ["manual-chapter-start"] });
  add({ id: codeId, title: content[codeId].title, blockContent: codeOnlyCard(content[codeId]), span: content[codeId].layout.span, place: content[codeId].layout.place, protectedBlock: true });
}

for (const [id, column, variant] of [
  ["manual-appearance-regular", 1, "regular"],
  ["manual-appearance-inverse", 4, "inverse"]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 2], place: [column, 32], variant, classes: ["manual-half"] });

for (const [id, column, color] of [
  ["manual-color-cyan", 1, "cyan"],
  ["manual-color-magenta", 3, "magenta"],
  ["manual-color-yellow", 5, "yellow"]
]) {
  const block = add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [2, 2], place: [column, 37], classes: ["manual-third"] });
  block.color = color;
}

const chanceControls = randomControls(content["manual-random-action"]);
const chanceCode = codeOnlyCard(content["manual-random-code"]);
const chanceCodeElement = chanceCode.querySelector("code");
add({ id: "manual-random", title: content["manual-random"].title, blockContent: introCard(content["manual-random"]), span: content["manual-random"].layout.span, place: content["manual-random"].layout.place, anchor: "chance", protectedBlock: true, classes: ["manual-chapter-start"] });
add({ id: "manual-random-code", title: content["manual-random-code"].title, blockContent: chanceCode, span: content["manual-random-code"].layout.span, place: content["manual-random-code"].layout.place, protectedBlock: true });
add({ id: "manual-random-action", title: "", blockContent: chanceControls.root, span: content["manual-random-action"].layout.span, place: content["manual-random-action"].layout.place, protectedBlock: true, classes: ["manual-random-action-block"] });

let chanceResults = [];

function addChanceResult(id, column, row, index) {
  const block = add({
    id,
    title: "",
    blockContent: chance(index),
    span: [1, 1],
    place: [column, row],
    useSystemVariant: true,
    menu: { minimize: false, close: false },
    classes: ["manual-sixth", "manual-chance-result"]
  });
  lockLessonBlock(block);
  chanceResults.push(block);
}

function rerollChanceResults() {
  if (chanceResults.length > 0) {
    const snap = blocks.snap;
    blocks.snap = false;
    for (const block of chanceResults) block.remove();
    blocks.snap = snap;
    chanceResults = [];
  }

  const colorVariation = Number(chanceControls.inputs.colorVariation.value);
  const inversionVariation = Number(chanceControls.inputs.inversionVariation.value);
  chanceControls.outputs.colorVariation.value = colorVariation.toFixed(1);
  chanceControls.outputs.inversionVariation.value = inversionVariation.toFixed(1);
  const code = [...content["manual-random-code"].code];
  code[3] = "blocks.colorVariation = " + colorVariation.toFixed(1) + ";";
  code[4] = "blocks.inversionVariation = " + inversionVariation.toFixed(1) + ";";
  chanceCodeElement.textContent = code.join("\n");

  blocks.variant = "random";
  blocks.colorArray = ["cyan", "magenta", "yellow"];
  blocks.colorVariation = colorVariation;
  blocks.inversionVariation = inversionVariation;
  for (let index = 0; index < 12; index += 1) {
    const column = (index % 6) + 1;
    const row = 42 + Math.floor(index / 6);
    addChanceResult("manual-random-mix-" + (index + 1), column, row, index);
  }

  blocks.variant = "regular";
  blocks.colorVariation = 0;
  blocks.inversionVariation = 0;
}

function randomizeChanceSettings() {
  for (const input of Object.values(chanceControls.inputs)) {
    const min = Number(input.min);
    const max = Number(input.max);
    const step = Number(input.step);
    const stepCount = Math.round((max - min) / step);
    const stepIndex = Math.floor(Math.random() * (stepCount + 1));
    input.value = String(Number((min + stepIndex * step).toFixed(10)));
  }
  rerollChanceResults();
}

chanceControls.button.addEventListener("click", randomizeChanceSettings);
for (const input of Object.values(chanceControls.inputs)) input.addEventListener("input", rerollChanceResults);
rerollChanceResults();
add({ id: "manual-next", title: content["manual-next"].title, blockContent: overviewText(content["manual-next"]), span: [6, 2], place: [1, 45], anchor: "next", protectedBlock: true, classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"] });

board.dataset.manualReady = "true";
scrollToCurrentHash();
