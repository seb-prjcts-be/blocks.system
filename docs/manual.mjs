import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.15";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.35";
import { mountEli10Schema } from "./eli10-schema.mjs?v=0.1.1";

const board = document.querySelector("#manual-board");
const manualVariationSamples = [0.05, 0.1, 0.6, 0.05, 0.8, 0.6, 0.05, 0.4, 0.8, 0.6];
let manualVariationIndex = 0;

const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  random: () => manualVariationSamples[manualVariationIndex++ % manualVariationSamples.length],
  blockDefaults: {
    menu: { minimize: true, close: true }
  }
});

const manualIds = [
  "manual-eli10",
  "manual-start",
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
  "manual-appearance",
  "manual-appearance-regular",
  "manual-appearance-inverse",
  "manual-colors",
  "manual-color-cyan",
  "manual-color-magenta",
  "manual-color-yellow",
  "manual-random",
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
blocks.setGrid(6, 58);
quantizeSurface(board);

function createTextElement(name, text, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createChapterHeading(title) {
  const heading = document.createElement("h2");
  heading.className = "manual-chapter-heading";
  heading.textContent = title;
  return heading;
}

function createCodeContent({ intro, code }) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-lesson-code";
  if (intro) root.append(createTextElement("p", intro, "manual-explanation"));
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(createTextElement("code", Array.isArray(code) ? code.join("\n") : code));
  root.append(pre);
  return root;
}

function createContentOverviewContent({ intro, examples }) {
  const root = document.createElement("div");
  root.className = "manual-content-overview";
  root.append(createTextElement("p", intro, "manual-content-overview-copy"));
  const spectrum = document.createElement("ul");
  spectrum.className = "manual-content-spectrum";
  for (const example of examples) spectrum.append(createTextElement("li", example));
  root.append(spectrum);
  return root;
}

function createContentCodeContent({ intro, code }) {
  const root = document.createElement("div");
  root.className = "manual-lesson manual-content-code";
  root.append(createTextElement("p", intro, "manual-explanation"));
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(createTextElement("code", code.join("\n")));
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

function createEli10SchemaContent() {
  const root = document.createElement("article");
  root.className = "manual-eli10";
  const host = document.createElement("div");
  host.id = "eli10-schema";
  host.className = "eli10-schema";
  root.append(host);
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

function createNextContent({ eyebrow, statement, body, items }) {
  const root = createLessonContent({ eyebrow, statement, body });
  const links = document.createElement("div");
  links.className = "manual-next-links";
  for (const item of items) {
    const link = createTextElement("a", item.label);
    link.href = item.href;
    links.append(link);
  }
  root.append(links);
  return root;
}

function createChanceContent({ statement }) {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  root.append(createTextElement("strong", statement));
  return root;
}

function addBlock({ id, title, content: blockContent, span, place, variant, menu, anchor = "", classes = [] }) {
  const options = { id, variant };
  if (title !== undefined) options.title = title;
  if (menu !== undefined) options.menu = menu;
  if (anchor && blockContent instanceof Node) blockContent.prepend(createChapterHeading(title));
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

const eli10Block = addBlock({
  id: "manual-eli10",
  title: content["manual-eli10"].title,
  content: createEli10SchemaContent(),
  span: [3, 2],
  place: [1, 1],
  anchor: "eli10",
  classes: ["manual-half", "manual-eli10-block"]
});

mountEli10Schema(eli10Block.element.querySelector("#eli10-schema"));

addBlock({
  id: "manual-start",
  title: content["manual-start"].title,
  content: createCodeContent(content["manual-start"]),
  span: [6, 3],
  place: [1, 4],
  anchor: "start",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-finish",
  title: content["manual-finish"].title,
  content: createContentOverviewContent(content["manual-finish"]),
  span: [6, 2],
  place: [1, 8],
  anchor: "content",
  classes: ["manual-full", "manual-content-overview-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-content-html-code",
  title: content["manual-content-html-code"].title,
  content: createContentCodeContent(content["manual-content-html-code"]),
  span: [3, 2],
  place: [1, 10],
  classes: ["manual-half", "manual-content-code-block"]
});

addBlock({
  id: "manual-content-html",
  title: content["manual-content-html"].title,
  content: createTrustedHtmlContent(content["manual-content-html"]),
  span: [3, 2],
  place: [4, 10],
  classes: ["manual-half", "manual-content-result-block"]
});

addBlock({
  id: "manual-content-object-code",
  title: content["manual-content-object-code"].title,
  content: createContentCodeContent(content["manual-content-object-code"]),
  span: [3, 2],
  place: [1, 12],
  classes: ["manual-half", "manual-content-code-block"]
});

addBlock({
  id: "manual-content-object",
  title: content["manual-content-object"].title,
  content: createImageObjectContent(content["manual-content-object"]),
  span: [3, 2],
  place: [4, 12],
  classes: ["manual-half", "manual-content-result-block"]
});

addBlock({
  id: "manual-content-factory-code",
  title: content["manual-content-factory-code"].title,
  content: createContentCodeContent(content["manual-content-factory-code"]),
  span: [3, 2],
  place: [1, 14],
  classes: ["manual-half", "manual-content-code-block"]
});

addBlock({
  id: "manual-content-factory",
  title: content["manual-content-factory"].title,
  content: createFactoryContent(content["manual-content-factory"]),
  span: [3, 2],
  place: [4, 14],
  classes: ["manual-half", "manual-content-result-block"]
});

addBlock({
  id: "manual-menu",
  title: content["manual-menu"].title,
  content: createCodeContent(content["manual-menu"]),
  span: [6, 3],
  place: [1, 17],
  anchor: "menu",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-menu-both",
  content: createLessonContent(content["manual-menu-both"]),
  span: [3, 2],
  place: [1, 20],
  menu: { minimize: true, close: true },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-minimize",
  content: createLessonContent(content["manual-menu-minimize"]),
  span: [3, 2],
  place: [4, 20],
  menu: { minimize: true, close: false },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-close",
  content: createLessonContent(content["manual-menu-close"]),
  span: [3, 2],
  place: [1, 22],
  menu: { minimize: false, close: true },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-none",
  content: createLessonContent(content["manual-menu-none"]),
  span: [3, 2],
  place: [4, 22],
  menu: { minimize: false, close: false },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-title",
  content: createLessonContent(content["manual-menu-title"]),
  span: [6, 2],
  place: [1, 24],
  classes: ["manual-full"]
});

addBlock({
  id: "manual-layout",
  title: content["manual-layout"].title,
  content: createCodeContent(content["manual-layout"]),
  span: [6, 3],
  place: [1, 27],
  anchor: "layout",
  classes: ["manual-code-block", "manual-chapter-start"]
});

const dragPracticeBlock = addBlock({
  id: "manual-layout-wide",
  title: content["manual-layout-wide"].title,
  content: createDragContent(content["manual-layout-wide"]),
  span: [4, 2],
  place: [1, 30],
  classes: ["manual-two-thirds", "manual-drag-demo"]
});
updateDragStatus(dragPracticeBlock.element, { column: 1, row: 30 });
board.addEventListener("blocks:reorder", function (event) {
  if (event.detail.id !== "manual-layout-wide" || !event.detail.to) return;
  updateDragStatus(dragPracticeBlock.element, event.detail.to);
});

addBlock({
  id: "manual-layout-small",
  content: createLessonContent(content["manual-layout-small"]),
  span: [2, 2],
  place: [5, 30],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-compact",
  title: content["manual-compact"].title,
  content: createCodeContent(content["manual-compact"]),
  span: [6, 3],
  place: [1, 33],
  anchor: "compact",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-appearance",
  title: content["manual-appearance"].title,
  content: createCodeContent(content["manual-appearance"]),
  span: [6, 3],
  place: [1, 37],
  variant: "regular",
  anchor: "appearance",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-appearance-regular",
  content: createLessonContent(content["manual-appearance-regular"]),
  span: [3, 2],
  place: [1, 40],
  variant: "regular",
  classes: ["manual-half"]
});

addBlock({
  id: "manual-appearance-inverse",
  content: createLessonContent(content["manual-appearance-inverse"]),
  span: [3, 2],
  place: [4, 40],
  variant: "inverse",
  classes: ["manual-half"]
});

addBlock({
  id: "manual-colors",
  title: content["manual-colors"].title,
  content: createCodeContent(content["manual-colors"]),
  span: [6, 3],
  place: [1, 43],
  variant: "regular",
  anchor: "colors",
  classes: ["manual-code-block", "manual-chapter-start"]
});

const colorCyanBlock = addBlock({
  id: "manual-color-cyan",
  content: createLessonContent(content["manual-color-cyan"]),
  span: [2, 2],
  place: [1, 46],
  variant: "regular",
  classes: ["manual-third"]
});
colorCyanBlock.color = "cyan";

const colorMagentaBlock = addBlock({
  id: "manual-color-magenta",
  content: createLessonContent(content["manual-color-magenta"]),
  span: [2, 2],
  place: [3, 46],
  variant: "regular",
  classes: ["manual-third"]
});
colorMagentaBlock.color = "magenta";

const colorYellowBlock = addBlock({
  id: "manual-color-yellow",
  content: createLessonContent(content["manual-color-yellow"]),
  span: [2, 2],
  place: [5, 46],
  variant: "regular",
  classes: ["manual-third"]
});
colorYellowBlock.color = "yellow";

addBlock({
  id: "manual-random",
  title: content["manual-random"].title,
  content: createCodeContent(content["manual-random"]),
  span: [6, 3],
  place: [1, 49],
  variant: "regular",
  anchor: "chance",
  classes: ["manual-code-block", "manual-chapter-start"]
});

blocks.variant = "random";
blocks.colorArray = ["cyan", "magenta", "yellow"];
blocks.inversionVariation = 0;

blocks.colorVariation = 0;
addBlock({
  id: "manual-random-color-0",
  title: content["manual-random-color-0"].title,
  content: createChanceContent(content["manual-random-color-0"]),
  span: [1, 1],
  place: [1, 52],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 0.5;
addBlock({
  id: "manual-random-color-50",
  title: content["manual-random-color-50"].title,
  content: createChanceContent(content["manual-random-color-50"]),
  span: [1, 1],
  place: [2, 52],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 1;
addBlock({
  id: "manual-random-color-100",
  title: content["manual-random-color-100"].title,
  content: createChanceContent(content["manual-random-color-100"]),
  span: [1, 1],
  place: [3, 52],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 0;
blocks.inversionVariation = 0;
addBlock({
  id: "manual-random-inverse-0",
  title: content["manual-random-inverse-0"].title,
  content: createChanceContent(content["manual-random-inverse-0"]),
  span: [1, 1],
  place: [4, 52],
  classes: ["manual-sixth"]
});

blocks.inversionVariation = 0.5;
addBlock({
  id: "manual-random-inverse-50",
  title: content["manual-random-inverse-50"].title,
  content: createChanceContent(content["manual-random-inverse-50"]),
  span: [1, 1],
  place: [5, 52],
  classes: ["manual-sixth"]
});

blocks.inversionVariation = 1;
addBlock({
  id: "manual-random-inverse-100",
  title: content["manual-random-inverse-100"].title,
  content: createChanceContent(content["manual-random-inverse-100"]),
  span: [1, 1],
  place: [6, 52],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-combined",
  title: content["manual-random-combined"].title,
  content: createCodeContent(content["manual-random-combined"]),
  span: [6, 2],
  place: [1, 53],
  variant: "regular",
  classes: ["manual-code-block"]
});

blocks.colorVariation = 0.5;
blocks.inversionVariation = 0.5;

for (const [index, column] of [1, 2, 3, 4].entries()) {
  const id = `manual-random-mix-${index + 1}`;
  addBlock({
    id,
    title: content[id].title,
    content: createChanceContent(content[id]),
    span: [1, 1],
    place: [column, 55],
    classes: ["manual-sixth"]
  });
}

addBlock({
  id: "manual-next",
  title: content["manual-next"].title,
  content: createNextContent(content["manual-next"]),
  span: [6, 2],
  place: [1, 57],
  variant: "regular",
  anchor: "next",
  classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"]
});

board.dataset.manualReady = "true";
