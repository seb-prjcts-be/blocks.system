import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.8";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.11";

const board = document.querySelector("#manual-board");
const manualVariationSamples = [0.05, 0.4, 0.8, 0.05, 0.25, 0.45, 0.55, 0.75, 0.6];
let manualVariationIndex = 0;

const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  draggable: false,
  random: () => manualVariationSamples[manualVariationIndex++ % manualVariationSamples.length],
  blockDefaults: {
    menu: { minimize: false, close: false }
  }
});

const manualIds = [
  "manual-start",
  "manual-content-html",
  "manual-content-node",
  "manual-content-factory",
  "manual-finish",
  "manual-result-regular",
  "manual-result-inverse",
  "manual-layout",
  "manual-layout-wide",
  "manual-layout-small",
  "manual-colors",
  "manual-color-cyan",
  "manual-color-magenta",
  "manual-color-yellow",
  "manual-random",
  "manual-random-1",
  "manual-random-2",
  "manual-random-3",
  "manual-random-4",
  "manual-random-5",
  "manual-random-6",
  "manual-next"
];
const content = await loadDocsContent("manual", manualIds);

blocks.attach(board);
blocks.setGrid(6, 28);
quantizeSurface(board);

function createTextElement(name, text, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = text;
  return element;
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

function addBlock({ id, title, content: blockContent, span, place, variant, anchor = "", classes = [] }) {
  const block = blocks.add(blockContent, { id, title, variant });
  block.span(...span);
  block.place(...place);
  block.element.classList.add(...classes);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  return block;
}

addBlock({
  id: "manual-start",
  title: content["manual-start"].title,
  content: createCodeContent(content["manual-start"]),
  span: [6, 3],
  place: [1, 1],
  anchor: "start",
  classes: ["manual-code-block"]
});

addBlock({
  id: "manual-content-html",
  title: content["manual-content-html"].title,
  content: createLessonContent(content["manual-content-html"]),
  span: [2, 2],
  place: [1, 4],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-node",
  title: content["manual-content-node"].title,
  content: createLessonContent(content["manual-content-node"]),
  span: [2, 2],
  place: [3, 4],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-factory",
  title: content["manual-content-factory"].title,
  content: createLessonContent(content["manual-content-factory"]),
  span: [2, 2],
  place: [5, 4],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-finish",
  title: content["manual-finish"].title,
  content: createCodeContent(content["manual-finish"]),
  span: [6, 2],
  place: [1, 6],
  classes: ["manual-code-block"]
});

addBlock({
  id: "manual-result-regular",
  title: content["manual-result-regular"].title,
  content: createLessonContent(content["manual-result-regular"]),
  span: [3, 2],
  place: [1, 9],
  variant: "regular",
  anchor: "result",
  classes: ["manual-half", "manual-chapter-start"]
});

addBlock({
  id: "manual-result-inverse",
  title: content["manual-result-inverse"].title,
  content: createLessonContent(content["manual-result-inverse"]),
  span: [3, 2],
  place: [4, 9],
  variant: "inverse",
  classes: ["manual-half", "manual-chapter-start"]
});

addBlock({
  id: "manual-layout",
  title: content["manual-layout"].title,
  content: createCodeContent(content["manual-layout"]),
  span: [6, 2],
  place: [1, 12],
  anchor: "layout",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-layout-wide",
  title: content["manual-layout-wide"].title,
  content: createLessonContent(content["manual-layout-wide"]),
  span: [4, 2],
  place: [1, 14],
  classes: ["manual-two-thirds"]
});

addBlock({
  id: "manual-layout-small",
  title: content["manual-layout-small"].title,
  content: createLessonContent(content["manual-layout-small"]),
  span: [2, 2],
  place: [5, 14],
  variant: "inverse",
  classes: ["manual-third"]
});

addBlock({
  id: "manual-colors",
  title: content["manual-colors"].title,
  content: createCodeContent(content["manual-colors"]),
  span: [6, 2],
  place: [1, 17],
  variant: "regular",
  anchor: "colors",
  classes: ["manual-code-block", "manual-chapter-start"]
});

blocks.colorArray = ["cyan", "magenta", "yellow"];
blocks.colorVariation = 1;
blocks.variant = "random";

addBlock({
  id: "manual-color-cyan",
  title: content["manual-color-cyan"].title,
  content: createLessonContent(content["manual-color-cyan"]),
  span: [2, 2],
  place: [1, 19],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-color-magenta",
  title: content["manual-color-magenta"].title,
  content: createLessonContent(content["manual-color-magenta"]),
  span: [2, 2],
  place: [3, 19],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-color-yellow",
  title: content["manual-color-yellow"].title,
  content: createLessonContent(content["manual-color-yellow"]),
  span: [2, 2],
  place: [5, 19],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-random",
  title: content["manual-random"].title,
  content: createCodeContent(content["manual-random"]),
  span: [6, 2],
  place: [1, 22],
  variant: "regular",
  anchor: "random",
  classes: ["manual-code-block", "manual-chapter-start"]
});

blocks.variant = "random";
blocks.colorVariation = 0.5;
blocks.inversionVariation = 0.5;

addBlock({
  id: "manual-random-1",
  title: content["manual-random-1"].title,
  content: createLessonContent(content["manual-random-1"]),
  span: [1, 2],
  place: [1, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-2",
  title: content["manual-random-2"].title,
  content: createLessonContent(content["manual-random-2"]),
  span: [1, 2],
  place: [2, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-3",
  title: content["manual-random-3"].title,
  content: createLessonContent(content["manual-random-3"]),
  span: [1, 2],
  place: [3, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-4",
  title: content["manual-random-4"].title,
  content: createLessonContent(content["manual-random-4"]),
  span: [1, 2],
  place: [4, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-5",
  title: content["manual-random-5"].title,
  content: createLessonContent(content["manual-random-5"]),
  span: [1, 2],
  place: [5, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-6",
  title: content["manual-random-6"].title,
  content: createLessonContent(content["manual-random-6"]),
  span: [1, 2],
  place: [6, 24],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-next",
  title: content["manual-next"].title,
  content: createNextContent(content["manual-next"]),
  span: [6, 2],
  place: [1, 27],
  variant: "inverse",
  anchor: "next",
  classes: ["manual-code-block", "manual-chapter-start"]
});

board.dataset.manualReady = "true";
