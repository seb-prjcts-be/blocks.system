import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.36";
import { mountEli10Schema } from "./eli10-schema.mjs?v=0.1.1";

const board = document.querySelector("#manual-board");
const reader = document.querySelector("#manual-reader");
const resetButton = document.querySelector("#manual-reset");
const manualVariationSamples = [0.05, 0.1, 0.6, 0.05, 0.8, 0.6, 0.05, 0.4, 0.8, 0.6];
let manualVariationIndex = 0;

const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  random: () => manualVariationSamples[manualVariationIndex++ % manualVariationSamples.length],
  labels: { move: "move" },
  blockDefaults: {
    menu: { minimize: true, close: true }
  }
});

const manualIds = [
  "manual-eli10",
  "manual-start",
  "manual-start-result",
  "manual-finish",
  "manual-content-html-code",
  "manual-content-html",
  "manual-content-object-code",
  "manual-content-object",
  "manual-content-factory-code",
  "manual-content-factory",
  "manual-menu",
  "manual-menu-both",
  "manual-menu-minimize",
  "manual-menu-close",
  "manual-menu-none",
  "manual-menu-title",
  "manual-layout",
  "manual-layout-wide",
  "manual-layout-small",
  "manual-compact",
  "manual-compact-result",
  "manual-appearance",
  "manual-appearance-regular",
  "manual-appearance-inverse",
  "manual-colors",
  "manual-color-cyan",
  "manual-color-magenta",
  "manual-color-yellow",
  "manual-random",
  "manual-random-column-0",
  "manual-random-column-50",
  "manual-random-column-100",
  "manual-random-row-color",
  "manual-random-row-inverse",
  "manual-random-color-0",
  "manual-random-color-50",
  "manual-random-color-100",
  "manual-random-inverse-0",
  "manual-random-inverse-50",
  "manual-random-inverse-100",
  "manual-random-combined",
  "manual-random-mix-1",
  "manual-random-mix-2",
  "manual-random-mix-3",
  "manual-random-mix-4",
  "manual-next"
];
const content = await loadDocsContent("manual", manualIds);

blocks.attach(board);
blocks.setGrid(5, 57);
quantizeSurface(board);

function createTextElement(name, text, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function appendExactContract(root, entry) {
  if (!entry.contract) return;
  const line = document.createElement("p");
  line.className = "manual-contract";
  const link = createTextElement("a", "exact contract →");
  link.href = entry.contract;
  line.append(link);
  root.append(line);
}

function createExplanationContent(entry) {
  const root = document.createElement("div");
  root.className = "manual-explanation-card";
  if (entry.intro) root.append(createTextElement("p", entry.intro));
  if (entry.examples) {
    const examples = document.createElement("ul");
    examples.className = "manual-content-spectrum";
    for (const example of entry.examples) examples.append(createTextElement("li", example));
    root.append(examples);
  }
  appendExactContract(root, entry);
  return root;
}

function createCodeContent({ code }) {
  const root = document.createElement("div");
  root.className = "manual-code-card";
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(createTextElement("code", Array.isArray(code) ? code.join("\n") : code));
  root.append(pre);
  return root;
}

function createLessonContent({ eyebrow, statement, body, code }) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-result";
  if (eyebrow) root.append(createTextElement("small", eyebrow));
  if (statement) root.append(createTextElement("strong", statement));
  if (body) root.append(createTextElement("p", body));
  if (code) {
    const pre = document.createElement("pre");
    pre.className = "manual-card-code";
    pre.append(createTextElement("code", code));
    root.append(pre);
  }
  return root;
}

function createDragContent({ eyebrow, statement, body, statusLabel }) {
  const root = createLessonContent({ eyebrow, statement, body });
  root.classList.add("manual-drag-lesson");
  const status = document.createElement("p");
  status.className = "manual-drag-status";
  const output = document.createElement("output");
  output.setAttribute("aria-live", "polite");
  status.append(createTextElement("span", statusLabel), output);
  root.append(status);
  return root;
}

function updateDragStatus(blockElement, position) {
  const output = blockElement.querySelector(".manual-drag-status output");
  output.textContent = `column ${position.column} · row ${position.row}`;
}

function createEli10SchemaContent(entry) {
  const root = document.createElement("div");
  root.className = "manual-eli10";
  const host = document.createElement("div");
  host.id = "eli10-schema";
  host.className = "eli10-schema";
  root.append(host);
  appendExactContract(root, entry);
  return root;
}

function createTrustedHtmlContent({ eyebrow, statement, footer }) {
  return `
    <article class="manual-content-demo manual-content-html-demo">
      <small>${eyebrow}</small>
      <strong>${statement}</strong>
      <span>${footer}</span>
    </article>
  `;
}

function createImageObjectContent({ alt, caption }) {
  const figure = document.createElement("figure");
  figure.className = "manual-content-demo manual-content-image-demo";
  const image = document.createElement("img");
  image.src = new URL("./img/pexels-peter-dyllong-2158803154-37352130.jpg", import.meta.url).href;
  image.width = 5184;
  image.height = 3456;
  image.alt = alt;
  image.decoding = "async";
  figure.append(image, createTextElement("figcaption", caption));
  return figure;
}

function createFactoryContent({ eyebrow, states, action }) {
  if (!Array.isArray(states) || states.length === 0) throw new TypeError("Factory content needs visible states.");
  return function createFreshElement() {
    const root = document.createElement("article");
    root.className = "manual-content-demo manual-content-factory-demo";
    const label = createTextElement("small", eyebrow);
    const readout = document.createElement("div");
    readout.className = "manual-factory-readout";
    const index = createTextElement("span", "", "manual-factory-index");
    index.setAttribute("aria-hidden", "true");
    const state = createTextElement("strong", "", "manual-factory-state");
    state.setAttribute("aria-live", "polite");
    const button = createTextElement("button", action, "manual-factory-action");
    button.type = "button";
    let activeIndex = 0;

    function renderState() {
      index.textContent = String(activeIndex + 1).padStart(2, "0");
      state.textContent = states[activeIndex];
      root.dataset.state = states[activeIndex];
    }

    button.addEventListener("click", function () {
      activeIndex = (activeIndex + 1) % states.length;
      renderState();
    });
    renderState();
    readout.append(index, state);
    root.append(label, readout, button);
    return root;
  };
}

function createNextContent(entry) {
  const root = createLessonContent(entry);
  const links = document.createElement("div");
  links.className = "manual-next-links";
  for (const item of entry.items) {
    const link = createTextElement("a", item.label);
    link.href = item.href;
    links.append(link);
  }
  root.append(links);
  appendExactContract(root, entry);
  return root;
}

function createChanceContent({ statement }, rowLabel = "") {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  if (rowLabel) root.append(createTextElement("small", rowLabel));
  root.append(createTextElement("strong", statement));
  return root;
}

function createFieldPreview(className) {
  const root = document.createElement("div");
  root.className = className;
  for (let index = 0; index < 6; index += 1) root.append(document.createElement("span"));
  return root;
}

function createLayoutSandboxContent() {
  const root = document.createElement("div");
  root.className = "manual-layout-sandbox-result";
  const host = document.createElement("div");
  host.id = "manual-layout-sandbox";
  host.className = "manual-layout-sandbox";
  host.setAttribute("aria-label", "lesson 04 drag sandbox");
  root.append(host);
  return root;
}

function createMatrixLabel(title) {
  return createTextElement("div", title, "manual-matrix-label");
}

function lockLessonBlock(block) {
  const menu = block.element.querySelector(":scope > .blocks-system-menu");
  const title = menu?.querySelector(".blocks-system-title");
  menu?.addEventListener("pointerdown", function (event) { event.stopPropagation(); });
  menu?.addEventListener("keydown", function (event) { event.stopPropagation(); });
  if (!title) return;
  title.tabIndex = -1;
  title.removeAttribute("role");
  title.removeAttribute("aria-label");
  title.removeAttribute("aria-keyshortcuts");
}

function addBlock({ id, title, content: blockContent, span, place, variant = "regular", menu, anchor = "", kind = "demo", classes = [] }) {
  const options = {
    id,
    title,
    variant,
    menu: menu ?? (kind === "lesson"
      ? { minimize: false, close: false }
      : undefined)
  };
  const block = blocks.add(blockContent, options);
  block.span(...span);
  block.place(...place);
  block.element.dataset.manualKind = kind;
  block.element.classList.add(...classes);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  if (kind === "lesson") lockLessonBlock(block);
  return block;
}

function appendReaderEntry(root, entry, level) {
  const heading = createTextElement(level, entry.title);
  root.append(heading);
  if (entry.intro) root.append(createTextElement("p", entry.intro));
  if (entry.statement) root.append(createTextElement("p", entry.statement));
  if (entry.body) root.append(createTextElement("p", entry.body));
  if (entry.code) {
    const pre = document.createElement("pre");
    pre.append(createTextElement("code", Array.isArray(entry.code) ? entry.code.join("\n") : entry.code));
    root.append(pre);
  }
  if (entry.examples) root.append(createTextElement("p", entry.examples.join(" · ")));
  if (entry.items) {
    const list = document.createElement("ul");
    for (const item of entry.items) {
      const link = createTextElement("a", item.label);
      link.href = item.href;
      const itemNode = document.createElement("li");
      itemNode.append(link);
      list.append(itemNode);
    }
    root.append(list);
  }
  appendExactContract(root, entry);
}

function createReaderArticle() {
  const lessons = [
    ["manual-eli10", []],
    ["manual-start", []],
    ["manual-finish", ["manual-content-html-code", "manual-content-html", "manual-content-object-code", "manual-content-object", "manual-content-factory-code", "manual-content-factory"]],
    ["manual-menu", ["manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none", "manual-menu-title"]],
    ["manual-layout", ["manual-layout-wide", "manual-layout-small"]],
    ["manual-compact", []],
    ["manual-appearance", ["manual-appearance-regular", "manual-appearance-inverse"]],
    ["manual-colors", ["manual-color-cyan", "manual-color-magenta", "manual-color-yellow"]],
    ["manual-random", ["manual-random-color-0", "manual-random-color-50", "manual-random-color-100", "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100", "manual-random-combined"]],
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

function resetManual() {
  window.location.reload();
}

createReaderArticle();
resetButton.addEventListener("click", resetManual);

const eli10Block = addBlock({
  id: "manual-eli10",
  title: content["manual-eli10"].title,
  content: createEli10SchemaContent(content["manual-eli10"]),
  span: [3, 3],
  place: [3, 1],
  anchor: "eli10",
  classes: ["manual-demo-block", "manual-eli10-block"]
});
mountEli10Schema(eli10Block.element.querySelector("#eli10-schema"));

addBlock({
  id: "manual-start",
  title: content["manual-start"].title,
  content: createExplanationContent(content["manual-start"]),
  span: [1, 3],
  place: [1, 5],
  anchor: "start",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-start-code",
  title: content["manual-start"].title,
  content: createCodeContent(content["manual-start"]),
  span: [1, 3],
  place: [2, 5],
  kind: "lesson",
  classes: ["manual-code-block"]
});
addBlock({
  id: "manual-start-result",
  title: content["manual-start-result"].title,
  content: createFieldPreview("manual-field-preview"),
  span: [3, 3],
  place: [3, 5],
  classes: ["manual-demo-block"]
});

addBlock({
  id: "manual-finish",
  title: content["manual-finish"].title,
  content: createExplanationContent(content["manual-finish"]),
  span: [1, 6],
  place: [1, 9],
  anchor: "content",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
for (const [index, name] of ["html", "object", "factory"].entries()) {
  const row = 9 + index * 2;
  const codeId = `manual-content-${name}-code`;
  const resultId = `manual-content-${name}`;
  const resultContent = name === "html"
    ? createTrustedHtmlContent(content[resultId])
    : name === "object"
      ? createImageObjectContent(content[resultId])
      : createFactoryContent(content[resultId]);
  addBlock({
    id: codeId,
    title: content[codeId].title,
    content: createCodeContent(content[codeId]),
    span: [1, 2],
    place: [2, row],
    kind: "lesson",
    classes: ["manual-code-block", "manual-sublesson-code"]
  });
  addBlock({
    id: resultId,
    title: content[resultId].title,
    content: resultContent,
    span: [3, 2],
    place: [3, row],
    classes: ["manual-demo-block", "manual-sublesson-result"]
  });
}

addBlock({
  id: "manual-menu",
  title: content["manual-menu"].title,
  content: createExplanationContent(content["manual-menu"]),
  span: [1, 10],
  place: [1, 16],
  anchor: "menu",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-menu-code",
  title: content["manual-menu"].title,
  content: createCodeContent(content["manual-menu"]),
  span: [1, 10],
  place: [2, 16],
  kind: "lesson",
  classes: ["manual-code-block"]
});
for (const [index, id, menu] of [
  [0, "manual-menu-both", { minimize: true, close: true }],
  [1, "manual-menu-minimize", { minimize: true, close: false }],
  [2, "manual-menu-close", { minimize: false, close: true }],
  [3, "manual-menu-none", { minimize: false, close: false }],
  [4, "manual-menu-title", { minimize: true, close: true }]
]) {
  addBlock({
    id,
    title: content[id].title,
    content: createLessonContent(content[id]),
    span: [3, 2],
    place: [3, 16 + index * 2],
    menu,
    classes: ["manual-demo-block"]
  });
}

addBlock({
  id: "manual-layout",
  title: content["manual-layout"].title,
  content: createExplanationContent(content["manual-layout"]),
  span: [1, 3],
  place: [1, 27],
  anchor: "layout",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-layout-code",
  title: content["manual-layout"].title,
  content: createCodeContent(content["manual-layout"]),
  span: [1, 3],
  place: [2, 27],
  kind: "lesson",
  classes: ["manual-code-block"]
});
const layoutResult = addBlock({
  id: "manual-layout-result",
  title: "04 / result",
  content: createLayoutSandboxContent(),
  span: [3, 3],
  place: [3, 27],
  classes: ["manual-demo-block", "manual-layout-result-block"]
});
const sandboxHost = layoutResult.element.querySelector("#manual-layout-sandbox");
const sandboxBlocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  labels: { move: "move" },
  blockDefaults: { menu: { minimize: true, close: true } }
});
sandboxBlocks.attach(sandboxHost).setGrid(3, 4);
quantizeSurface(sandboxHost, { maxWidth: 620 });
const dragPracticeBlock = sandboxBlocks.add(createDragContent(content["manual-layout-wide"]), {
  id: "manual-layout-wide",
  title: content["manual-layout-wide"].title
});
dragPracticeBlock.span(2, 2).place(1, 1);
updateDragStatus(dragPracticeBlock.element, { column: 1, row: 1 });
const flowPracticeBlock = sandboxBlocks.add(createLessonContent(content["manual-layout-small"]), {
  id: "manual-layout-small",
  title: content["manual-layout-small"].title
});
flowPracticeBlock.span(1, 2).place(3, 1);
sandboxHost.addEventListener("blocks:reorder", function (event) {
  if (event.detail.id !== "manual-layout-wide" || !event.detail.to) return;
  updateDragStatus(dragPracticeBlock.element, event.detail.to);
});

addBlock({
  id: "manual-compact",
  title: content["manual-compact"].title,
  content: createExplanationContent(content["manual-compact"]),
  span: [1, 3],
  place: [1, 31],
  anchor: "compact",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-compact-code",
  title: content["manual-compact"].title,
  content: createCodeContent(content["manual-compact"]),
  span: [1, 3],
  place: [2, 31],
  kind: "lesson",
  classes: ["manual-code-block"]
});
addBlock({
  id: "manual-compact-result",
  title: content["manual-compact-result"].title,
  content: createFieldPreview("manual-compact-preview"),
  span: [3, 3],
  place: [3, 31],
  classes: ["manual-demo-block"]
});

addBlock({
  id: "manual-appearance",
  title: content["manual-appearance"].title,
  content: createExplanationContent(content["manual-appearance"]),
  span: [1, 4],
  place: [1, 35],
  anchor: "appearance",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-appearance-code",
  title: content["manual-appearance"].title,
  content: createCodeContent(content["manual-appearance"]),
  span: [1, 4],
  place: [2, 35],
  kind: "lesson",
  classes: ["manual-code-block"]
});
for (const [index, id] of ["manual-appearance-regular", "manual-appearance-inverse"].entries()) {
  addBlock({
    id,
    title: content[id].title,
    content: createLessonContent(content[id]),
    span: [3, 2],
    place: [3, 35 + index * 2],
    variant: index === 1 ? "inverse" : "regular",
    classes: ["manual-demo-block"]
  });
}

addBlock({
  id: "manual-colors",
  title: content["manual-colors"].title,
  content: createExplanationContent(content["manual-colors"]),
  span: [1, 3],
  place: [1, 40],
  anchor: "colors",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-colors-code",
  title: content["manual-colors"].title,
  content: createCodeContent(content["manual-colors"]),
  span: [1, 3],
  place: [2, 40],
  kind: "lesson",
  classes: ["manual-code-block"]
});
for (const [column, id, color] of [[3, "manual-color-cyan", "cyan"], [4, "manual-color-magenta", "magenta"], [5, "manual-color-yellow", "yellow"]]) {
  const block = addBlock({
    id,
    title: content[id].title,
    content: createLessonContent(content[id]),
    span: [1, 3],
    place: [column, 40],
    classes: ["manual-demo-block", "manual-color-result"]
  });
  block.color = color;
}

addBlock({
  id: "manual-random",
  title: content["manual-random"].title,
  content: createExplanationContent(content["manual-random"]),
  span: [1, 9],
  place: [1, 44],
  anchor: "chance",
  kind: "lesson",
  classes: ["manual-explanation-block"]
});
addBlock({
  id: "manual-random-code",
  title: content["manual-random"].title,
  content: createCodeContent(content["manual-random"]),
  span: [1, 3],
  place: [2, 44],
  kind: "lesson",
  classes: ["manual-code-block"]
});
for (const [column, id] of [[3, "manual-random-column-0"], [4, "manual-random-column-50"], [5, "manual-random-column-100"]]) {
  addBlock({
    id,
    title: content[id].title,
    content: createMatrixLabel(content[id].title),
    span: [1, 1],
    place: [column, 44],
    menu: false,
    kind: "lesson",
    classes: ["manual-matrix-axis"]
  });
}

blocks.variant = "random";
blocks.colorArray = ["cyan", "magenta", "yellow"];
blocks.inversionVariation = 0;
for (const [column, id, variation] of [[3, "manual-random-color-0", 0], [4, "manual-random-color-50", 0.5], [5, "manual-random-color-100", 1]]) {
  blocks.colorVariation = variation;
  addBlock({
    id,
    title: content[id].title,
    content: createChanceContent(content[id], column === 3 ? content["manual-random-row-color"].title : ""),
    span: [1, 1],
    place: [column, 45],
    classes: ["manual-demo-block", "manual-chance-result"]
  });
}
blocks.colorVariation = 0;
for (const [column, id, variation] of [[3, "manual-random-inverse-0", 0], [4, "manual-random-inverse-50", 0.5], [5, "manual-random-inverse-100", 1]]) {
  blocks.inversionVariation = variation;
  addBlock({
    id,
    title: content[id].title,
    content: createChanceContent(content[id], column === 3 ? content["manual-random-row-inverse"].title : ""),
    span: [1, 1],
    place: [column, 46],
    classes: ["manual-demo-block", "manual-chance-result"]
  });
}
addBlock({
  id: "manual-random-combined",
  title: content["manual-random-combined"].title,
  content: createCodeContent(content["manual-random-combined"]),
  span: [1, 3],
  place: [2, 48],
  kind: "lesson",
  classes: ["manual-code-block"]
});
blocks.colorVariation = 0.5;
blocks.inversionVariation = 0.5;
for (const [id, column, row] of [["manual-random-mix-1", 3, 48], ["manual-random-mix-2", 4, 48], ["manual-random-mix-3", 3, 49], ["manual-random-mix-4", 4, 49]]) {
  addBlock({
    id,
    title: content[id].title,
    content: createChanceContent(content[id]),
    span: [1, 1],
    place: [column, row],
    classes: ["manual-demo-block", "manual-chance-result"]
  });
}

addBlock({
  id: "manual-next",
  title: content["manual-next"].title,
  content: createNextContent(content["manual-next"]),
  span: [3, 3],
  place: [3, 54],
  anchor: "next",
  classes: ["manual-demo-block", "manual-next-block"]
});

board.dataset.manualReady = "true";
