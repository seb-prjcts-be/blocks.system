import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.12";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.31";

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
  "manual-eli10-steps",
  "manual-start",
  "manual-finish",
  "manual-content-html",
  "manual-content-object",
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
blocks.setGrid(6, 55);
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

function createChanceContent({ statement }) {
  const root = document.createElement("div");
  root.className = "manual-chance-cell";
  root.append(createTextElement("strong", statement));
  return root;
}

function addBlock({ id, title, content: blockContent, span, place, variant, menu, anchor = "", classes = [] }) {
  const options = { id, title, variant };
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
  id: "manual-finish",
  title: content["manual-finish"].title,
  content: createCodeContent(content["manual-finish"]),
  span: [6, 3],
  place: [1, 8],
  anchor: "content",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-content-html",
  title: content["manual-content-html"].title,
  content: createTrustedHtmlContent(content["manual-content-html"]),
  span: [2, 2],
  place: [1, 11],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-object",
  title: content["manual-content-object"].title,
  content: createImageObjectContent(content["manual-content-object"]),
  span: [2, 2],
  place: [3, 11],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-content-factory",
  title: content["manual-content-factory"].title,
  content: createFactoryContent(content["manual-content-factory"]),
  span: [2, 2],
  place: [5, 11],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-menu",
  title: content["manual-menu"].title,
  content: createCodeContent(content["manual-menu"]),
  span: [6, 3],
  place: [1, 14],
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
  id: "manual-menu-title",
  title: content["manual-menu-title"].title,
  content: createLessonContent(content["manual-menu-title"]),
  span: [6, 2],
  place: [1, 21],
  classes: ["manual-full"]
});

addBlock({
  id: "manual-layout",
  title: content["manual-layout"].title,
  content: createCodeContent(content["manual-layout"]),
  span: [6, 3],
  place: [1, 24],
  anchor: "layout",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-layout-wide",
  title: content["manual-layout-wide"].title,
  content: createLessonContent(content["manual-layout-wide"]),
  span: [4, 2],
  place: [1, 27],
  classes: ["manual-two-thirds"]
});

addBlock({
  id: "manual-layout-small",
  title: content["manual-layout-small"].title,
  content: createLessonContent(content["manual-layout-small"]),
  span: [2, 2],
  place: [5, 27],
  classes: ["manual-third"]
});

addBlock({
  id: "manual-compact",
  title: content["manual-compact"].title,
  content: createCodeContent(content["manual-compact"]),
  span: [6, 3],
  place: [1, 30],
  anchor: "compact",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-appearance",
  title: content["manual-appearance"].title,
  content: createCodeContent(content["manual-appearance"]),
  span: [6, 3],
  place: [1, 34],
  variant: "regular",
  anchor: "appearance",
  classes: ["manual-code-block", "manual-chapter-start"]
});

addBlock({
  id: "manual-appearance-regular",
  title: content["manual-appearance-regular"].title,
  content: createLessonContent(content["manual-appearance-regular"]),
  span: [3, 2],
  place: [1, 37],
  variant: "regular",
  classes: ["manual-half"]
});

addBlock({
  id: "manual-appearance-inverse",
  title: content["manual-appearance-inverse"].title,
  content: createLessonContent(content["manual-appearance-inverse"]),
  span: [3, 2],
  place: [4, 37],
  variant: "inverse",
  classes: ["manual-half"]
});

addBlock({
  id: "manual-colors",
  title: content["manual-colors"].title,
  content: createCodeContent(content["manual-colors"]),
  span: [6, 3],
  place: [1, 40],
  variant: "regular",
  anchor: "colors",
  classes: ["manual-code-block", "manual-chapter-start"]
});

const colorCyanBlock = addBlock({
  id: "manual-color-cyan",
  title: content["manual-color-cyan"].title,
  content: createLessonContent(content["manual-color-cyan"]),
  span: [2, 2],
  place: [1, 43],
  variant: "regular",
  classes: ["manual-third"]
});
colorCyanBlock.color = "cyan";

const colorMagentaBlock = addBlock({
  id: "manual-color-magenta",
  title: content["manual-color-magenta"].title,
  content: createLessonContent(content["manual-color-magenta"]),
  span: [2, 2],
  place: [3, 43],
  variant: "regular",
  classes: ["manual-third"]
});
colorMagentaBlock.color = "magenta";

const colorYellowBlock = addBlock({
  id: "manual-color-yellow",
  title: content["manual-color-yellow"].title,
  content: createLessonContent(content["manual-color-yellow"]),
  span: [2, 2],
  place: [5, 43],
  variant: "regular",
  classes: ["manual-third"]
});
colorYellowBlock.color = "yellow";

addBlock({
  id: "manual-random",
  title: content["manual-random"].title,
  content: createCodeContent(content["manual-random"]),
  span: [6, 3],
  place: [1, 46],
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
  place: [1, 49],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 0.5;
addBlock({
  id: "manual-random-color-50",
  title: content["manual-random-color-50"].title,
  content: createChanceContent(content["manual-random-color-50"]),
  span: [1, 1],
  place: [2, 49],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 1;
addBlock({
  id: "manual-random-color-100",
  title: content["manual-random-color-100"].title,
  content: createChanceContent(content["manual-random-color-100"]),
  span: [1, 1],
  place: [3, 49],
  classes: ["manual-sixth"]
});

blocks.colorVariation = 0;
blocks.inversionVariation = 0;
addBlock({
  id: "manual-random-inverse-0",
  title: content["manual-random-inverse-0"].title,
  content: createChanceContent(content["manual-random-inverse-0"]),
  span: [1, 1],
  place: [4, 49],
  classes: ["manual-sixth"]
});

blocks.inversionVariation = 0.5;
addBlock({
  id: "manual-random-inverse-50",
  title: content["manual-random-inverse-50"].title,
  content: createChanceContent(content["manual-random-inverse-50"]),
  span: [1, 1],
  place: [5, 49],
  classes: ["manual-sixth"]
});

blocks.inversionVariation = 1;
addBlock({
  id: "manual-random-inverse-100",
  title: content["manual-random-inverse-100"].title,
  content: createChanceContent(content["manual-random-inverse-100"]),
  span: [1, 1],
  place: [6, 49],
  classes: ["manual-sixth"]
});

addBlock({
  id: "manual-random-combined",
  title: content["manual-random-combined"].title,
  content: createCodeContent(content["manual-random-combined"]),
  span: [6, 2],
  place: [1, 50],
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
    place: [column, 52],
    classes: ["manual-sixth"]
  });
}

addBlock({
  id: "manual-next",
  title: content["manual-next"].title,
  content: createNextContent(content["manual-next"]),
  span: [6, 2],
  place: [1, 54],
  variant: "regular",
  anchor: "next",
  classes: ["manual-code-block", "manual-next-block", "manual-chapter-start"]
});

board.dataset.manualReady = "true";
