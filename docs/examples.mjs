import { createBlocksSystem } from "../blocks.system.mjs";
import { createDocsBoard, nodeFromHtml } from "./board.mjs?v=0.1.0";

const examplesSystem = createBlocksSystem({ variant: "regular" });
const examplesBoard = createDocsBoard({ system: examplesSystem });
const { addBlock } = examplesBoard;

addBlock({
  id: "learning-path",
  title: "start here",
  span: [3, 1],
  place: [1, 1],
  variant: "inverse",
  content: nodeFromHtml(`
    <div class="examples-intro">
      <small>three examples · three decisions</small>
      <strong>start → combine → extend</strong>
    </div>
  `)
});

const basicPreview = nodeFromHtml(`
  <div class="example-live">
    <div class="example-live-board" data-live-example="basic" aria-label="live basic grid preview"></div>
    <small>drag a header · restore block 2 · one explicit red exception</small>
  </div>
`);
addBlock({
  id: "basic-live",
  title: "01 · basic grid · live",
  span: [3, 2],
  place: [1, 2],
  content: basicPreview
});

const blocksBasic = createBlocksSystem({ variant: "random" });
blocksBasic.attach(basicPreview.querySelector("[data-live-example]"));
blocksBasic.setGrid(2, 2);
blocksBasic.snap = true;
blocksBasic.draggable = true;
for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const blockBasic = blocksBasic.add(`<div class="nested-center"><strong>${number}</strong><small>html</small></div>`, { id: `basic-${number}` });
  blockBasic.menu(`block ${number}`);
  blockBasic.minimized = index === 1;
  if (index === 3) blockBasic.variant = "red";
}

addBlock({
  id: "basic-route",
  title: "01 · start small",
  span: [2, 1],
  place: [2, 4],
  content: nodeFromHtml(`
    <div class="example-route">
      <small>attach · grid · menu · drag · variant</small>
      <strong>basic grid</strong>
      <nav class="example-actions" aria-label="basic grid links">
        <a href="../examples/basic-grid/">run</a>
        <a href="../examples/basic-grid/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

const mixedPreview = nodeFromHtml(`
  <div class="example-live">
    <div class="example-live-board" data-live-example="mixed" aria-label="live mixed content preview"></div>
    <small>one object contract · html + canvas + custom element</small>
  </div>
`);
addBlock({
  id: "mixed-live",
  title: "02 · mixed content · live",
  span: [3, 2],
  place: [5, 1],
  content: mixedPreview
});

const blocksMixed = createBlocksSystem({ variant: "regular" });
blocksMixed.attach(mixedPreview.querySelector("[data-live-example]"));
blocksMixed.setGrid(3, 1);
blocksMixed.snap = true;
const blockHtml = blocksMixed.add(`<div class="nested-center"><strong>html</strong><small>string</small></div>`, { id: "mixed-html" });
blockHtml.menu("html");

const canvas = document.createElement("canvas");
canvas.width = 240;
canvas.height = 140;
const context = canvas.getContext("2d");
context.fillStyle = "rgb(0, 0, 255)";
context.fillRect(0, 0, canvas.width, canvas.height);
context.strokeStyle = "#fff";
context.lineWidth = 3;
context.beginPath();
for (let x = 0; x <= canvas.width; x += 3) {
  const y = canvas.height / 2 + Math.sin(x * 0.08) * 34;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
const blockCanvas = blocksMixed.add(canvas, { id: "mixed-canvas", variant: "blue" });
blockCanvas.menu("canvas");

if (!customElements.get("example-signal")) {
  customElements.define("example-signal", class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="nested-center"><strong>&lt;signal&gt;</strong><small>custom</small></div>`;
    }
  });
}
const blockCustom = blocksMixed.add(document.createElement("example-signal"), { id: "mixed-custom", variant: "magenta" });
blockCustom.menu("element");

addBlock({
  id: "mixed-route",
  title: "02 · combine content",
  span: [2, 1],
  place: [6, 3],
  content: nodeFromHtml(`
    <div class="example-route">
      <small>one API · html · canvas · custom element</small>
      <strong>mixed content</strong>
      <nav class="example-actions" aria-label="mixed content links">
        <a href="../examples/mixed-content/">run</a>
        <a href="../examples/mixed-content/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

const adapterPreview = nodeFromHtml(`
  <div class="example-live">
    <div class="example-live-board" data-live-example="adapter" aria-label="live custom adapter preview"></div>
    <small>the outer board does not know how the counter renders</small>
  </div>
`);
addBlock({
  id: "adapter-live",
  title: "03 · custom adapter · live",
  span: [3, 2],
  place: [3, 5],
  content: adapterPreview
});

const blocksAdapter = createBlocksSystem({ variant: "regular" });
const blocksAdapterField = adapterPreview.querySelector("[data-live-example]");
blocksAdapter.attach(blocksAdapterField);
blocksAdapter.setGrid(1, 1);
blocksAdapter.snap = true;
blocksAdapter.registerAdapter("counter", {
  mount({ host, settings }) {
    const root = nodeFromHtml(`
      <div class="adapter-live-root">
        <span>adapter mount()</span>
        <output>${settings.start}</output>
        <button type="button">increment</button>
      </div>
    `);
    const output = root.querySelector("output");
    root.querySelector("button").addEventListener("click", () => {
      output.value = String(Number(output.value) + 1);
    });
    host.appendChild(root);
    return root;
  }
});
blocksAdapter.register({ id: "example-counter", adapter: "counter", defaults: { start: 3 } });
const blockAdapterHost = document.createElement("div");
blockAdapterHost.className = "nested-center";
const blockAdapter = blocksAdapter.add(blockAdapterHost, { id: "adapter-counter" });
blockAdapter.menu("counter");
await blocksAdapter.mount("example-counter", blockAdapterHost);

addBlock({
  id: "adapter-route",
  title: "03 · extend cleanly",
  span: [2, 1],
  place: [6, 5],
  variant: "cyan",
  content: nodeFromHtml(`
    <div class="example-route">
      <small>register · mount · settings</small>
      <strong>custom adapter</strong>
      <nav class="example-actions" aria-label="custom adapter links">
        <a href="../examples/custom-adapter/">run</a>
        <a href="../examples/custom-adapter/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

addBlock({
  id: "next-step",
  title: "next",
  span: [2, 1],
  place: [7, 6],
  content: nodeFromHtml(`
    <div class="examples-next">
      <small>after the example</small>
      <strong>guide + api</strong>
      <a href="guide.html">open guide →</a>
    </div>
  `)
});

examplesBoard.ready();
