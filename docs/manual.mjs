import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.8";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.22";

const board = document.querySelector("#manual-board");
const manualVariationSamples = [0.05, 0.4, 0.8, 0.05, 0.25, 0.45, 0.55, 0.75, 0.6];
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
  "manual-eli10-steps",
  "manual-start",
  "manual-content-html",
  "manual-content-object",
  "manual-content-factory",
  "manual-finish",
  "manual-result-regular",
  "manual-result-inverse",
  "manual-menu",
  "manual-menu-both",
  "manual-menu-minimize",
  "manual-menu-close",
  "manual-menu-none",
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
blocks.setGrid(6, 38);
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

function createEli10Content({ statement, body }) {
  const root = document.createElement("article");
  root.className = "manual-eli10";
  root.append(
    createTextElement("strong", statement),
    createTextElement("p", body)
  );
  return root;
}

function createEli10StepsContent({ steps }) {
  if (!Array.isArray(steps) || steps.length !== 3) throw new TypeError("ELI10 content needs three visible steps.");
  const root = document.createElement("article");
  root.className = "manual-eli10-steps";
  const list = document.createElement("ol");
  for (const step of steps) list.append(createTextElement("li", step));
  root.append(list);
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

function addBlock({ id, title, content: blockContent, span, place, variant, menu, anchor = "", classes = [] }) {
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

const eli10Block = addBlock({
  id: "manual-eli10",
  title: content["manual-eli10"].title,
  content: createEli10Content(content["manual-eli10"]),
  span: [4, 2],
  place: [1, 1],
  anchor: "eli10",
  classes: ["manual-two-thirds", "manual-eli10-block"]
});
eli10Block.color = "cyan";

addBlock({
  id: "manual-eli10-steps",
  title: content["manual-eli10-steps"].title,
  content: createEli10StepsContent(content["manual-eli10-steps"]),
  span: [2, 2],
  place: [5, 1],
  classes: ["manual-third", "manual-eli10-steps-block"]
});

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
  id: "manual-content-html",
  title: content["manual-content-html"].title,
  content: createTrustedHtmlContent(content["manual-content-html"]),
  span: [2, 2],
  place: [1, 7],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-object",
  title: content["manual-content-object"].title,
  content: createImageObjectContent(content["manual-content-object"]),
  span: [2, 2],
  place: [3, 7],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-factory",
  title: content["manual-content-factory"].title,
  content: createFactoryContent(content["manual-content-factory"]),
  span: [2, 2],
  place: [5, 7],
  variant: "inverse",
  classes: ["manual-third"]
});

addBlock({
  id: "manual-finish",
  title: content["manual-finish"].title,
  content: createCodeContent(content["manual-finish"]),
  span: [6, 2],
  place: [1, 9],
  classes: ["manual-code-block"]
});

addBlock({
  id: "manual-result-regular",
  title: content["manual-result-regular"].title,
  content: createLessonContent(content["manual-result-regular"]),
  span: [3, 2],
  place: [1, 12],
  variant: "regular",
  anchor: "result",
  classes: ["manual-half", "manual-chapter-start"]
});

addBlock({
  id: "manual-result-inverse",
  title: content["manual-result-inverse"].title,
  content: createLessonContent(content["manual-result-inverse"]),
  span: [3, 2],
  place: [4, 12],
  variant: "inverse",
  classes: ["manual-half", "manual-chapter-start"]
});

addBlock({
  id: "manual-menu",
  title: content["manual-menu"].title,
  content: createCodeContent(content["manual-menu"]),
  span: [6, 2],
  place: [1, 15],
  anchor: "menu",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-menu-both",
  title: content["manual-menu-both"].title,
  content: createLessonContent(content["manual-menu-both"]),
  span: [3, 2],
  place: [1, 17],
  menu: { minimize: true, close: true },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-minimize",
  title: content["manual-menu-minimize"].title,
  content: createLessonContent(content["manual-menu-minimize"]),
  span: [3, 2],
  place: [4, 17],
  menu: { minimize: true, close: false },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-close",
  title: content["manual-menu-close"].title,
  content: createLessonContent(content["manual-menu-close"]),
  span: [3, 2],
  place: [1, 19],
  menu: { minimize: false, close: true },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-menu-none",
  title: content["manual-menu-none"].title,
  content: createLessonContent(content["manual-menu-none"]),
  span: [3, 2],
  place: [4, 19],
  menu: { minimize: false, close: false },
  classes: ["manual-half"]
});

addBlock({
  id: "manual-layout",
  title: content["manual-layout"].title,
  content: createCodeContent(content["manual-layout"]),
  span: [6, 2],
  place: [1, 22],
  anchor: "layout",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-layout-wide",
  title: content["manual-layout-wide"].title,
  content: createLessonContent(content["manual-layout-wide"]),
  span: [4, 2],
  place: [1, 24],
  classes: ["manual-two-thirds"]
});

addBlock({
  id: "manual-layout-small",
  title: content["manual-layout-small"].title,
  content: createLessonContent(content["manual-layout-small"]),
  span: [2, 2],
  place: [5, 24],
  variant: "inverse",
  classes: ["manual-third"]
});

addBlock({
  id: "manual-colors",
  title: content["manual-colors"].title,
  content: createCodeContent(content["manual-colors"]),
  span: [6, 2],
  place: [1, 27],
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
  place: [1, 29],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-color-magenta",
  title: content["manual-color-magenta"].title,
  content: createLessonContent(content["manual-color-magenta"]),
  span: [2, 2],
  place: [3, 29],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-color-yellow",
  title: content["manual-color-yellow"].title,
  content: createLessonContent(content["manual-color-yellow"]),
  span: [2, 2],
  place: [5, 29],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-random",
  title: content["manual-random"].title,
  content: createCodeContent(content["manual-random"]),
  span: [6, 2],
  place: [1, 32],
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
  place: [1, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-2",
  title: content["manual-random-2"].title,
  content: createLessonContent(content["manual-random-2"]),
  span: [1, 2],
  place: [2, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-3",
  title: content["manual-random-3"].title,
  content: createLessonContent(content["manual-random-3"]),
  span: [1, 2],
  place: [3, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-4",
  title: content["manual-random-4"].title,
  content: createLessonContent(content["manual-random-4"]),
  span: [1, 2],
  place: [4, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-5",
  title: content["manual-random-5"].title,
  content: createLessonContent(content["manual-random-5"]),
  span: [1, 2],
  place: [5, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-6",
  title: content["manual-random-6"].title,
  content: createLessonContent(content["manual-random-6"]),
  span: [1, 2],
  place: [6, 34],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-next",
  title: content["manual-next"].title,
  content: createNextContent(content["manual-next"]),
  span: [6, 2],
  place: [1, 37],
  variant: "inverse",
  anchor: "next",
  classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"]
});

board.dataset.manualReady = "true";
