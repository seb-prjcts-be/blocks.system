import { createBlocksSystem } from "../blocks.system.mjs?v=0.1.4";
import { loadDocsContent, quantizeSurface } from "./shell.mjs?v=0.1.3";

const board = document.querySelector("#manual-board");
const status = document.querySelector("#manual-status");
const lock = document.querySelector("#manual-lock");
const reset = document.querySelector("#manual-reset");

const blocks = createBlocksSystem({
  variant: "regular",
  snap: true,
  blockDefaults: {
    menu: { minimize: true, close: true }
  }
});
const controllers = [];
const manualIds = [
  "manual-start",
  "manual-forms",
  "manual-content-contract",
  "manual-html",
  "manual-canvas",
  "manual-compose",
  "manual-connect",
  "manual-reference",
  "manual-hooks",
  "manual-media",
  "manual-examples",
  "manual-about",
  "manual-source"
];
const content = await loadDocsContent("manual", manualIds);

blocks.attach(board);
blocks.setGrid(6, 24);
quantizeSurface(board);

function createTextElement(name, text, className = "") {
  const element = document.createElement(name);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function createAction({ label, href }, { download = false } = {}) {
  const action = createTextElement("a", label);
  action.href = href;
  if (download) action.download = "";
  return action;
}

function appendInlineContent(target, parts) {
  if (!Array.isArray(parts)) throw new Error("Manual inline content must be an array.");
  for (const part of parts) {
    if (typeof part?.text === "string") {
      target.append(document.createTextNode(part.text));
    } else if (typeof part?.code === "string") {
      target.append(createTextElement("code", part.code));
    } else {
      throw new Error("Manual inline content parts must contain text or code.");
    }
  }
}

function createStartContent({ code }) {
  const pre = document.createElement("pre");
  pre.className = "manual-code";
  pre.append(createTextElement("code", code.join("\n")));
  return pre;
}

function createFormsContent({ groupLabel, items }) {
  const root = document.createElement("div");
  root.className = "manual-forms";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", groupLabel);

  const knownShapes = new Set(["circle", "rectangle", "triangle"]);
  for (const item of items) {
    if (!knownShapes.has(item.shape)) throw new Error(`Unknown manual form: ${item.shape}.`);
    const figure = document.createElement("figure");
    figure.className = "manual-form-item";
    const stage = document.createElement("div");
    stage.className = "manual-form-stage";
    stage.setAttribute("role", "img");
    stage.setAttribute("aria-label", item.label);
    const shape = document.createElement("div");
    shape.className = `manual-${item.shape}`;
    shape.setAttribute("aria-hidden", "true");
    stage.append(shape);
    figure.append(stage, createTextElement("figcaption", item.caption));
    root.append(figure);
  }
  return root;
}

function createStatementContent({ eyebrow, statement, body, number }) {
  const root = document.createElement("div");
  root.className = "manual-statement";
  const paragraph = document.createElement("p");
  appendInlineContent(paragraph, body);
  root.append(
    createTextElement("small", eyebrow),
    createTextElement("strong", statement),
    paragraph,
    createTextElement("b", number)
  );
  return root;
}

function createGridLanguage({ items }) {
  const root = document.createElement("div");
  root.className = "manual-grid-language";
  for (const item of items) {
    const line = document.createElement("div");
    line.append(
      createTextElement("small", item.eyebrow),
      createTextElement("strong", item.statement),
      createTextElement("code", item.code)
    );
    root.append(line);
  }
  return root;
}

function createReferenceContent({ eyebrow, members, action }) {
  const root = document.createElement("div");
  root.className = "manual-api";
  const list = document.createElement("ul");
  for (const member of members) list.append(createTextElement("li", member));
  root.append(createTextElement("small", eyebrow), list, createAction(action));
  return root;
}

function createHooksContent({ eyebrow, code }) {
  const root = document.createElement("div");
  root.className = "manual-hooks";
  const pre = document.createElement("pre");
  pre.append(createTextElement("code", code.join("\n")));
  root.append(createTextElement("small", eyebrow), pre);
  return root;
}

function createExamplesContent({ items }) {
  const root = document.createElement("div");
  root.className = "manual-examples";
  for (const item of items) {
    const example = document.createElement("div");
    const actions = document.createElement("div");
    actions.className = "manual-example-actions";
    actions.append(createAction(item.run), createAction(item.download, { download: true }));
    example.append(
      createTextElement("small", item.eyebrow),
      createTextElement("strong", item.statement),
      actions
    );
    root.append(example);
  }
  return root;
}

function createAboutContent({ eyebrow, statement, body, action }) {
  const root = document.createElement("div");
  root.className = "manual-about";
  root.append(createTextElement("small", eyebrow), createTextElement("strong", statement));
  if (body) root.append(createTextElement("p", body));
  if (action) root.append(createAction(action));
  return root;
}

function addBlock({ id, title, content, span, variant, anchor = "" }) {
  const block = blocks.add(content, { id, title, variant });
  if (span) block.span(...span);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  controllers.push({ block, minimized: block.minimized });
  return block;
}

addBlock({
  id: "manual-start",
  title: content["manual-start"].title,
  span: [3, 2],
  anchor: "start",
  content: createStartContent(content["manual-start"])
});

addBlock({
  id: "manual-forms",
  title: content["manual-forms"].title,
  span: [3, 2],
  content: createFormsContent(content["manual-forms"])
});

addBlock({
  id: "manual-content-contract",
  title: content["manual-content-contract"].title,
  span: [3, 1],
  anchor: "compose",
  content: createStatementContent(content["manual-content-contract"])
});

const htmlContent = content["manual-html"];
const htmlDemo = document.createElement("div");
htmlDemo.className = "manual-html-demo";
const htmlButton = createTextElement("button", htmlContent.button.idle);
htmlButton.type = "button";
htmlButton.addEventListener("click", (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent === htmlContent.button.idle
    ? htmlContent.button.active
    : htmlContent.button.idle;
});
htmlDemo.append(htmlButton);
addBlock({
  id: "manual-html",
  title: htmlContent.title,
  content: htmlDemo
});

const canvas = document.createElement("canvas");
canvas.className = "manual-canvas";
canvas.setAttribute("aria-label", content["manual-canvas"].label);
const blockCanvas = addBlock({
  id: "manual-canvas",
  title: content["manual-canvas"].title,
  span: [2, 1],
  content: canvas
});

function drawCanvas() {
  const bounds = blockCanvas.content.getBoundingClientRect();
  const scale = Math.max(1, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#efeee8";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#000";
  context.fillStyle = "#000";
  context.lineWidth = 2;
  const size = Math.min(width, height) * 0.36;
  context.strokeRect(width * 0.08, height * 0.24, size, size);
  context.beginPath();
  context.arc(width * 0.58, height * 0.5, size * 0.5, 0, Math.PI * 2);
  context.fillStyle = "rgb(255, 0, 255)";
  context.fill();
  context.fillStyle = "#000";
  context.beginPath();
  context.moveTo(width * 0.82, height * 0.22);
  context.lineTo(width * 0.95, height * 0.78);
  context.lineTo(width * 0.69, height * 0.78);
  context.closePath();
  context.fill();
}

const canvasObserver = new ResizeObserver(drawCanvas);
canvasObserver.observe(blockCanvas.content);
window.addEventListener("resize", drawCanvas, { passive: true });

addBlock({
  id: "manual-compose",
  title: content["manual-compose"].title,
  span: [2, 2],
  anchor: "arrange",
  content: createGridLanguage(content["manual-compose"])
});

const connectContent = content["manual-connect"];
blocks.registerAdapter("manual-counter", {
  mount({ host, settings }) {
    const root = document.createElement("div");
    root.className = "manual-adapter";
    const output = document.createElement("output");
    output.value = String(settings.start);
    const button = createTextElement("button", connectContent.action);
    button.type = "button";
    button.addEventListener("click", () => {
      output.value = String(Number(output.value) + 1);
    });
    root.append(
      createTextElement("small", connectContent.eyebrow),
      createTextElement("strong", connectContent.statement),
      output,
      button
    );
    host.appendChild(root);
    return root;
  }
});
blocks.register({ id: "manual-live-counter", adapter: "manual-counter", defaults: { start: connectContent.initial } });
const adapterHost = document.createElement("div");
adapterHost.className = "manual-adapter-host";
addBlock({
  id: "manual-connect",
  title: connectContent.title,
  span: [2, 2],
  anchor: "connect",
  content: adapterHost
});
await blocks.mount("manual-live-counter", adapterHost);

addBlock({
  id: "manual-reference",
  title: content["manual-reference"].title,
  span: [2, 2],
  anchor: "reference",
  content: createReferenceContent(content["manual-reference"])
});

addBlock({
  id: "manual-hooks",
  title: content["manual-hooks"].title,
  span: [3, 2],
  content: createHooksContent(content["manual-hooks"])
});

const mediaContent = content["manual-media"];
const mediaRoot = document.createElement("div");
mediaRoot.className = "manual-media";
const mediaVideoElement = document.createElement("video");
mediaVideoElement.controls = true;
mediaVideoElement.muted = true;
mediaVideoElement.preload = "none";
mediaVideoElement.poster = "references/media-contract-poster.svg";
mediaVideoElement.setAttribute("aria-label", mediaContent.label);
mediaVideoElement.dataset.videoLifecycle = "pause-on-minimize-remove-pagehide";
const mediaCopy = document.createElement("div");
mediaCopy.append(
  createTextElement("small", mediaContent.eyebrow),
  createTextElement("strong", mediaContent.statement),
  createTextElement("p", mediaContent.body)
);
mediaRoot.append(mediaVideoElement, mediaCopy);
const blockMedia = addBlock({
  id: "manual-media",
  title: mediaContent.title,
  span: [3, 2],
  content: mediaRoot
});

addBlock({
  id: "manual-examples",
  title: content["manual-examples"].title,
  span: [3, 2],
  anchor: "examples",
  content: createExamplesContent(content["manual-examples"])
});

addBlock({
  id: "manual-about",
  title: content["manual-about"].title,
  span: [2, 2],
  anchor: "boundary",
  content: createAboutContent(content["manual-about"])
});

addBlock({
  id: "manual-source",
  title: content["manual-source"].title,
  span: [2, 1],
  variant: "inverse",
  content: createAboutContent(content["manual-source"])
});

const initialOrder = controllers.map(({ block }) => block.element);
const mediaVideo = blockMedia.content.querySelector("video");

function pauseMedia() {
  mediaVideo?.pause();
}

const mediaLifecycle = new MutationObserver(() => {
  if (!blockMedia.element.isConnected || blockMedia.minimized) pauseMedia();
});
mediaLifecycle.observe(board, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-block-minimized"] });
window.addEventListener("pagehide", pauseMedia);

function updateLock() {
  const locked = !blocks.draggable;
  lock.setAttribute("aria-pressed", String(locked));
  lock.textContent = locked ? "unlock layout" : "lock layout";
}

function updateStatus(message) {
  const names = Array.from(board.children)
    .filter((node) => node.matches(".blocks-system-object"))
    .map((node) => node.getAttribute("data-block-object"));
  status.textContent = message || `${names.length} direct blocks · ${blocks.draggable ? "drag on" : "layout locked"} · ${names.join(" → ")}`;
}

lock.addEventListener("click", () => {
  blocks.draggable = !blocks.draggable;
  updateLock();
  updateStatus();
});

reset.addEventListener("click", () => {
  if (controllers.some(({ block }) => !block.element.isConnected)) {
    window.location.reload();
    return;
  }
  controllers.forEach(({ block }) => block.flow());
  initialOrder.forEach((element) => board.appendChild(element));
  blocks.setGrid(6, 24);
  controllers.forEach(({ block, minimized }) => { block.minimized = minimized; });
  blocks.draggable = true;
  updateLock();
  updateStatus("layout reset · drag on");
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  board.addEventListener(eventName, () => requestAnimationFrame(() => updateStatus()));
}
board.addEventListener("blocks:reorder", () => updateStatus("keyboard reorder · drag on"));
board.addEventListener("click", (event) => {
  if (event.target.closest(".blocks-system-close")) requestAnimationFrame(() => updateStatus());
});

updateLock();
updateStatus();
board.dataset.manualReady = "true";
