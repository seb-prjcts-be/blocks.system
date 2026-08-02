import { createBlocksSystem } from "../blocks.system.mjs";
import { createDocsBoard, nodeFromHtml } from "./board.mjs?v=0.1.1";

const examplesSystem = createBlocksSystem({ variant: "regular" });
const examplesBoard = createDocsBoard({ system: examplesSystem, closeable: true });
const { addBlock } = examplesBoard;

addBlock({
  id: "learning-path",
  title: "00 / thesis",
  span: [2, 2],
  place: [1, 1],
  content: nodeFromHtml(`
    <div class="examples-intro">
      <small>three examples / three decisions</small>
      <strong><span>form</span><span>follows</span><span>relation.</span></strong>
      <p>start small.<br>combine freely.<br>extend cleanly.</p>
    </div>
  `)
});

for (const spec of [
  { id: "basic-1", title: "01.1 / html", place: [3, 1] },
  { id: "basic-2", title: "01.2 / minimized", place: [4, 1], minimized: true },
  { id: "basic-3", title: "01.3 / movable", place: [3, 2] },
  { id: "basic-4", title: "01.4 / variant", place: [4, 2], variant: "magenta" }
]) {
  const number = spec.id.at(-1);
  addBlock({
    ...spec,
    content: nodeFromHtml(`<div class="nested-center"><strong>${number}</strong><small>html</small></div>`)
  });
}

addBlock({
  id: "basic-route",
  title: "principle / 01",
  span: [2, 1],
  place: [3, 3],
  content: nodeFromHtml(`
    <div class="example-route">
      <small>attach / grid / place</small>
      <strong>the grid is a decision.</strong>
      <nav class="example-actions" aria-label="basic grid links">
        <a href="../examples/basic-grid/">run</a>
        <a href="../examples/basic-grid/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

addBlock({
  id: "mixed-html",
  title: "02.1 / html",
  span: [1, 2],
  place: [5, 1],
  content: nodeFromHtml(`<div class="nested-center"><strong>html</strong><small>string</small></div>`)
});

const canvas = document.createElement("canvas");
canvas.width = 240;
canvas.height = 140;
const context = canvas.getContext("2d");
context.fillStyle = "#efeee8";
context.fillRect(0, 0, canvas.width, canvas.height);
context.strokeStyle = "rgb(255, 0, 255)";
context.lineWidth = 3;
context.beginPath();
for (let x = 0; x <= canvas.width; x += 3) {
  const y = canvas.height / 2 + Math.sin(x * 0.08) * 34;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
addBlock({
  id: "mixed-canvas",
  title: "02.2 / canvas",
  span: [2, 2],
  place: [6, 1],
  content: canvas
});

if (!customElements.get("example-signal")) {
  customElements.define("example-signal", class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `<div class="nested-center"><strong>&lt;signal&gt;</strong><small>custom element</small></div>`;
    }
  });
}
addBlock({
  id: "mixed-custom",
  title: "02.3 / element",
  span: [1, 2],
  place: [8, 1],
  content: document.createElement("example-signal")
});

addBlock({
  id: "mixed-route",
  title: "principle / 02",
  span: [3, 1],
  place: [6, 3],
  content: nodeFromHtml(`
    <div class="example-route">
      <small>one API / no hierarchy</small>
      <strong>content is content.</strong>
      <nav class="example-actions" aria-label="mixed content links">
        <a href="../examples/mixed-content/">run</a>
        <a href="../examples/mixed-content/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

examplesSystem.registerAdapter("counter", {
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
examplesSystem.register({ id: "example-counter", adapter: "counter", defaults: { start: 3 } });
const blockAdapterHost = document.createElement("div");
blockAdapterHost.className = "adapter-host";
addBlock({
  id: "adapter-counter",
  title: "03 / counter adapter",
  span: [4, 2],
  place: [1, 5],
  content: blockAdapterHost
});
await examplesSystem.mount("example-counter", blockAdapterHost);

addBlock({
  id: "adapter-route",
  title: "principle / 03",
  span: [2, 2],
  place: [5, 5],
  content: nodeFromHtml(`
    <div class="example-route">
      <small>register / mount / settings</small>
      <strong>extend the contract. not the core.</strong>
      <nav class="example-actions" aria-label="custom adapter links">
        <a href="../examples/custom-adapter/">run</a>
        <a href="../examples/custom-adapter/demo.mjs" download>module ↓</a>
      </nav>
    </div>
  `)
});

addBlock({
  id: "next-step",
  title: "continue / 04",
  span: [2, 1],
  place: [7, 6],
  content: nodeFromHtml(`
    <div class="examples-next">
      <small>the fourth statement is yours</small>
      <strong>build the next block.</strong>
      <a href="guide.html">guide →</a>
    </div>
  `)
});

examplesBoard.ready();
