import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.41";
import { mountEli10Schema } from "./eli10-schema.mjs?v=0.1.1";

const board = document.querySelector("#manual-board");
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
  "manual-eli10", "manual-start", "manual-finish",
  "manual-content-html-code", "manual-content-html",
  "manual-content-object-code", "manual-content-object",
  "manual-content-factory-code", "manual-content-factory",
  "manual-menu", "manual-menu-both", "manual-menu-minimize",
  "manual-menu-close", "manual-menu-none", "manual-menu-title",
  "manual-layout", "manual-layout-wide", "manual-layout-small",
  "manual-compact", "manual-appearance", "manual-appearance-regular",
  "manual-appearance-inverse", "manual-colors", "manual-color-cyan",
  "manual-color-magenta", "manual-color-yellow", "manual-random",
  "manual-random-color-0", "manual-random-color-50", "manual-random-color-100",
  "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100",
  "manual-random-combined", "manual-random-mix-1", "manual-random-mix-2",
  "manual-random-mix-3", "manual-random-mix-4", "manual-next"
];
const content = await loadDocsContent("manual", manualIds);
blocks.attach(board);
blocks.setGrid(6, 58);
quantizeSurface(board);

function text(name, value, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function contract(entry) {
  if (!entry.contract) return null;
  const line = text("p", "", "manual-contract");
  const link = text("a", "exact contract →");
  link.href = entry.contract;
  line.append(link);
  return line;
}

function codeCard(entry) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-lesson-code";
  const explanation = document.createElement("div");
  if (entry.intro) explanation.append(text("p", entry.intro, "manual-explanation"));
  const link = contract(entry);
  if (link) explanation.append(link);
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(text("code", Array.isArray(entry.code) ? entry.code.join("\n") : entry.code));
  root.append(explanation, pre);
  return root;
}

function overview(entry) {
  const root = document.createElement("div");
  root.className = "manual-content-overview";
  root.append(text("p", entry.intro, "manual-content-overview-copy"));
  const list = document.createElement("ul");
  list.className = "manual-content-spectrum";
  for (const item of entry.examples) list.append(text("li", item));
  root.append(list);
  const link = contract(entry);
  if (link) root.append(link);
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

function dragSpecimen(entry) {
  const root = specimen(entry);
  root.classList.add("manual-drag-lesson");
  const status = text("p", "", "manual-drag-status");
  const output = document.createElement("output");
  output.setAttribute("aria-live", "polite");
  status.append(text("span", entry.statusLabel), output);
  root.append(status);
  return root;
}

function updateDrag(block, position) {
  block.querySelector(".manual-drag-status output").textContent = "column " + position.column + " · row " + position.row;
}

function eli10(entry) {
  const root = document.createElement("article");
  root.className = "manual-eli10";
  const host = document.createElement("div");
  host.id = "eli10-schema";
  host.className = "eli10-schema";
  root.append(host);
  const link = contract(entry);
  if (link) root.append(link);
  return root;
}

function trustedHtml({ eyebrow, statement, footer }) {
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
  const exact = contract(entry);
  if (exact) root.append(exact);
  return root;
}

function chance(entry) {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  root.append(text("strong", entry.statement));
  return root;
}

function add({ id, title, blockContent, span, place, variant = "regular", menu, anchor = "", classes = [] }) {
  if (anchor && blockContent instanceof Node) blockContent.prepend(text("h2", title, "manual-chapter-heading"));
  const options = { id, title, variant };
  if (menu !== undefined) options.menu = menu;
  const block = blocks.add(blockContent, options);
  block.span(...span);
  block.place(...place);
  block.element.classList.add(...classes);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  return block;
}

const eli10Block = add({
  id: "manual-eli10",
  title: content["manual-eli10"].title,
  blockContent: eli10(content["manual-eli10"]),
  span: [3, 2],
  place: [1, 1],
  anchor: "eli10",
  classes: ["manual-half", "manual-eli10-block"]
});
mountEli10Schema(eli10Block.element.querySelector("#eli10-schema"));

add({
  id: "manual-start",
  title: content["manual-start"].title,
  blockContent: codeCard(content["manual-start"]),
  span: [6, 3],
  place: [1, 4],
  anchor: "start",
  classes: ["manual-code-block", "manual-chapter-start"]
});
add({
  id: "manual-finish",
  title: content["manual-finish"].title,
  blockContent: overview(content["manual-finish"]),
  span: [6, 2],
  place: [1, 8],
  anchor: "content",
  classes: ["manual-full", "manual-content-overview-block", "manual-chapter-start"]
});

for (const [name, row] of [["html", 10], ["object", 12], ["factory", 14]]) {
  const codeId = "manual-content-" + name + "-code";
  const resultId = "manual-content-" + name;
  const result = name === "html" ? trustedHtml(content[resultId]) : name === "object" ? imageObject(content[resultId]) : factory(content[resultId]);
  add({ id: codeId, title: content[codeId].title, blockContent: codeCard(content[codeId]), span: [3, 2], place: [1, row], classes: ["manual-half", "manual-content-code-block"] });
  add({ id: resultId, title: content[resultId].title, blockContent: result, span: [3, 2], place: [4, row], classes: ["manual-half", "manual-content-result-block"] });
}

add({ id: "manual-menu", title: content["manual-menu"].title, blockContent: codeCard(content["manual-menu"]), span: [6, 3], place: [1, 17], anchor: "menu", classes: ["manual-code-block", "manual-chapter-start"] });
for (const [id, column, row, menu] of [
  ["manual-menu-both", 1, 20, { minimize: true, close: true }],
  ["manual-menu-minimize", 4, 20, { minimize: true, close: false }],
  ["manual-menu-close", 1, 22, { minimize: false, close: true }],
  ["manual-menu-none", 4, 22, { minimize: false, close: false }]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 2], place: [column, row], menu, classes: ["manual-half"] });
add({ id: "manual-menu-title", title: content["manual-menu-title"].title, blockContent: specimen(content["manual-menu-title"]), span: [6, 2], place: [1, 24], classes: ["manual-full"] });

add({ id: "manual-layout", title: content["manual-layout"].title, blockContent: codeCard(content["manual-layout"]), span: [6, 3], place: [1, 27], anchor: "layout", classes: ["manual-code-block", "manual-chapter-start"] });
const dragBlock = add({ id: "manual-layout-wide", title: content["manual-layout-wide"].title, blockContent: dragSpecimen(content["manual-layout-wide"]), span: [4, 2], place: [1, 30], classes: ["manual-two-thirds", "manual-drag-demo"] });
updateDrag(dragBlock.element, { column: 1, row: 30 });
board.addEventListener("blocks:reorder", (event) => {
  if (event.detail.id === "manual-layout-wide" && event.detail.to) updateDrag(dragBlock.element, event.detail.to);
});
add({ id: "manual-layout-small", title: content["manual-layout-small"].title, blockContent: specimen(content["manual-layout-small"]), span: [2, 2], place: [5, 30], classes: ["manual-third"] });

for (const [id, row, anchor] of [
  ["manual-compact", 33, "compact"],
  ["manual-appearance", 37, "appearance"],
  ["manual-colors", 43, "colors"],
  ["manual-random", 49, "chance"]
]) add({ id, title: content[id].title, blockContent: codeCard(content[id]), span: [6, 3], place: [1, row], anchor, classes: ["manual-code-block", "manual-chapter-start"] });

for (const [id, column, variant] of [
  ["manual-appearance-regular", 1, "regular"],
  ["manual-appearance-inverse", 4, "inverse"]
]) add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [3, 2], place: [column, 40], variant, classes: ["manual-half"] });

for (const [id, column, color] of [
  ["manual-color-cyan", 1, "cyan"],
  ["manual-color-magenta", 3, "magenta"],
  ["manual-color-yellow", 5, "yellow"]
]) {
  const block = add({ id, title: content[id].title, blockContent: specimen(content[id]), span: [2, 2], place: [column, 46], classes: ["manual-third"] });
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
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 52], classes: ["manual-sixth"] });
}
blocks.colorVariation = 0;
for (const [id, column, variation] of [
  ["manual-random-inverse-0", 4, 0],
  ["manual-random-inverse-50", 5, 0.5],
  ["manual-random-inverse-100", 6, 1]
]) {
  blocks.inversionVariation = variation;
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 52], classes: ["manual-sixth"] });
}
add({ id: "manual-random-combined", title: content["manual-random-combined"].title, blockContent: codeCard(content["manual-random-combined"]), span: [6, 2], place: [1, 53], classes: ["manual-code-block"] });
blocks.colorVariation = 0.5;
blocks.inversionVariation = 0.5;
for (const [index, column] of [1, 2, 3, 4].entries()) {
  const id = "manual-random-mix-" + (index + 1);
  add({ id, title: content[id].title, blockContent: chance(content[id]), span: [1, 1], place: [column, 55], classes: ["manual-sixth"] });
}
add({ id: "manual-next", title: content["manual-next"].title, blockContent: next(content["manual-next"]), span: [6, 2], place: [1, 57], anchor: "next", classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"] });

board.dataset.manualReady = "true";
