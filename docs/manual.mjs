import { createBlocksSystem } from "../blocks.system.mjs";
import { nodeFromHtml } from "./board.mjs?v=0.1.1";
import { initSectionNavigation, quantizeSurface } from "./shell.mjs?v=0.1.0";

const board = document.querySelector("#manual-board");
const status = document.querySelector("#manual-status");
const lock = document.querySelector("#manual-lock");
const reset = document.querySelector("#manual-reset");

const blocks = createBlocksSystem({ variant: "regular" });
const controllers = [];

blocks.attach(board);
blocks.setGrid(6, 24);
blocks.snap = true;
blocks.draggable = true;
quantizeSurface(board);

function addBlock({ id, title, content, span = [1, 1], variant = "regular", minimized = false, anchor = "" }) {
  const block = blocks.add(content, { id, variant, minimized });
  block.menu(title, { minimize: true });
  block.span(...span);
  if (anchor) {
    block.element.id = anchor;
    block.element.classList.add("manual-anchor");
  }
  controllers.push({ block, minimized });
  return block;
}

addBlock({
  id: "manual-cycle",
  title: "form / circle",
  span: [2, 2],
  content: nodeFromHtml(`
    <div class="manual-form-stage" role="img" aria-label="Magenta circle: live state, cycle and interaction">
      <div class="manual-circle" aria-hidden="true"></div>
    </div>
  `)
});

addBlock({
  id: "manual-rectangle",
  title: "form / rectangle",
  span: [2, 2],
  content: nodeFromHtml(`
    <div class="manual-form-stage" role="img" aria-label="Black rectangle: information, code and content">
      <div class="manual-rectangle" aria-hidden="true"></div>
    </div>
  `)
});

addBlock({
  id: "manual-direction",
  title: "form / triangle",
  span: [2, 2],
  content: nodeFromHtml(`
    <div class="manual-form-stage" role="img" aria-label="Black triangle: direction, action and next step">
      <div class="manual-triangle" aria-hidden="true"></div>
    </div>
  `)
});

addBlock({
  id: "manual-start",
  title: "01 / start",
  span: [3, 2],
  anchor: "start",
  content: nodeFromHtml(`<pre class="manual-code"><code>&lt;link rel="stylesheet" href="./blocks.system.css"&gt;
&lt;div id="blocks-field"&gt;&lt;/div&gt;

&lt;script type="module"&gt;
import { system as blocks } from
"./blocks.system.mjs";

blocks.attach("#blocks-field");
blocks.setGrid(6, 8);
blocks.snap = true;
blocks.draggable = true;

const blockHello = blocks.add("&lt;p&gt;hello&lt;/p&gt;", {
  id: "block-hello"
});

blockHello.menu("hello", { close: true });
blockHello.span(2, 1);
blockHello.place(1, 1);
&lt;/script&gt;</code></pre>`)
});

addBlock({
  id: "manual-content-contract",
  title: "02 / content",
  span: [3, 1],
  anchor: "compose",
  content: nodeFromHtml(`
    <div class="manual-statement">
      <small>trusted html / dom node / content factory</small>
      <strong>content is content.</strong>
      <p>Use <code>textContent</code> for untrusted text. One host contract keeps renderer knowledge outside the core.</p>
      <b>3</b>
    </div>
  `)
});

const htmlDemo = nodeFromHtml(`
  <div class="manual-html-demo">
    <button type="button">native html control</button>
  </div>
`);
htmlDemo.querySelector("button").addEventListener("click", (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent === "native html control"
    ? "clicked · still html"
    : "native html control";
});
addBlock({
  id: "manual-html",
  title: "html / interactive",
  span: [1, 1],
  content: htmlDemo
});

const canvas = document.createElement("canvas");
canvas.className = "manual-canvas";
canvas.setAttribute("aria-label", "Responsive canvas with a rectangle, circle and triangle");
const blockCanvas = addBlock({
  id: "manual-canvas",
  title: "canvas / resize observer",
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
  title: "03 / arrange",
  span: [2, 2],
  anchor: "arrange",
  content: nodeFromHtml(`
    <div class="manual-grid-language">
      <div><small>size</small><strong>span</strong><code>block.span(x, y)</code></div>
      <div><small>place</small><strong>grid</strong><code>block.place(x, y)</code></div>
      <div><small>state</small><strong>menu</strong><code>close / minimize</code></div>
      <div><small>tone</small><strong>variant</strong><code>block.variant</code></div>
      <div><small>move</small><strong>drag</strong><code>header / keyboard</code></div>
      <div><small>remove</small><strong>close</strong><code>block.remove()</code></div>
    </div>
  `)
});

blocks.registerAdapter("manual-counter", {
  mount({ host, settings }) {
    const root = nodeFromHtml(`
      <div class="manual-adapter">
        <small>adapter mount() / live state</small>
        <strong>extend the contract.</strong>
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
blocks.register({ id: "manual-live-counter", adapter: "manual-counter", defaults: { start: 3 } });
const adapterHost = document.createElement("div");
adapterHost.className = "manual-adapter-host";
addBlock({
  id: "manual-connect",
  title: "04 / connect",
  span: [2, 2],
  anchor: "connect",
  content: adapterHost
});
await blocks.mount("manual-live-counter", adapterHost);

addBlock({
  id: "manual-reference",
  title: "05 / reference",
  span: [2, 2],
  anchor: "reference",
  content: nodeFromHtml(`
    <div class="manual-api">
      <small>shared system / one controller</small>
      <ul>
        <li>blocks.attach()</li><li>block.menu()</li>
        <li>blocks.setGrid()</li><li>block.span()</li>
        <li>blocks.snap</li><li>block.place()</li>
        <li>blocks.draggable</li><li>block.minimized</li>
        <li>blocks.add()</li><li>block.variant</li>
        <li>blocks.register()</li><li>block.color</li>
        <li>blocks.mount()</li><li>block.remove()</li>
      </ul>
      <a href="api.html">complete signatures →</a>
    </div>
  `)
});

addBlock({
  id: "manual-hooks",
  title: "advanced / css hooks",
  span: [3, 2],
  content: nodeFromHtml(`
    <div class="manual-hooks">
      <small>candidate stable styling hooks / audit before promise</small>
      <pre><code>.blocks-system-surface
.blocks-system-object
.blocks-system-menu
.blocks-system-content

[data-block-object="block-id"]
[data-block-variant="magenta"]
[data-block-minimized="true"]
[data-draggable="true"]</code></pre>
    </div>
  `)
});

const blockMedia = addBlock({
  id: "manual-media",
  title: "media / bounded lifecycle",
  span: [3, 2],
  content: nodeFromHtml(`
    <div class="manual-media">
      <video controls muted preload="none" poster="references/micrographic-drag-snap-reference.png" aria-label="Video content sizing prototype" data-video-lifecycle="pause-on-minimize-remove-pagehide"></video>
      <div>
        <small>natural / contain / cover</small>
        <strong>media keeps its lifecycle.</strong>
        <p>The consumer owns source and captions. The manual proves contain sizing and pauses on minimize, removal and page exit.</p>
      </div>
    </div>
  `)
});

addBlock({
  id: "manual-examples",
  title: "examples / run the source",
  span: [3, 2],
  anchor: "examples",
  content: nodeFromHtml(`
    <div class="manual-examples">
      <div><small>01 / start</small><strong>basic grid</strong><nav><a href="../examples/basic-grid/">run</a><a href="../examples/basic-grid/demo.mjs" download>module ↓</a></nav></div>
      <div><small>02 / compose</small><strong>mixed content</strong><nav><a href="../examples/mixed-content/">run</a><a href="../examples/mixed-content/demo.mjs" download>module ↓</a></nav></div>
      <div><small>03 / connect</small><strong>custom adapter</strong><nav><a href="../examples/custom-adapter/">run</a><a href="../examples/custom-adapter/demo.mjs" download>module ↓</a></nav></div>
    </div>
  `)
});

addBlock({
  id: "manual-about",
  title: "about / boundary",
  span: [2, 2],
  anchor: "boundary",
  content: nodeFromHtml(`
    <div class="manual-about">
      <small>from visual elements to one object model</small>
      <strong>the core knows blocks, not renderers.</strong>
      <p>HTML, canvas, video and future runtimes keep their own lifecycle. Concept and direction by Sebastien Vanblaere.</p>
    </div>
  `)
});

addBlock({
  id: "manual-source",
  title: "source / continue",
  span: [2, 1],
  variant: "inverse",
  content: nodeFromHtml(`
    <div class="manual-about">
      <small>mit / native esm / source first</small>
      <strong>build the next block.</strong>
      <a href="https://github.com/seb-prjcts-be/blocks.system">view source →</a>
    </div>
  `)
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
  initialOrder.forEach((element) => board.appendChild(element));
  controllers.forEach(({ block, minimized }) => { block.minimized = minimized; });
  blocks.draggable = true;
  updateLock();
  updateStatus("layout reset · drag on");
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  board.addEventListener(eventName, () => requestAnimationFrame(() => updateStatus()));
}
board.addEventListener("blocks:reorder", () => updateStatus("keyboard reorder · drag on"));

updateLock();
updateStatus();
initSectionNavigation();
board.dataset.manualReady = "true";
