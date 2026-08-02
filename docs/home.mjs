import { createBlocksSystem } from "../blocks.system.mjs";
import { nodeFromHtml } from "./board.mjs?v=0.1.1";
import { quantizeSurface } from "./shell.mjs?v=0.1.0";

const board = document.querySelector("#home-board");
const status = document.querySelector("#home-status");
const reset = document.querySelector("#home-reset");
const blocks = createBlocksSystem({ variant: "regular" });
const controllers = [];

blocks.attach(board);
blocks.setGrid(6, 8);
blocks.snap = true;
blocks.draggable = true;
quantizeSurface(board);

function addHome({ id, title, content, span, place, variant = "regular" }) {
  const block = blocks.add(content, { id, variant });
  block.menu(title, { minimize: true });
  block.span(...span);
  block.place(...place);
  controllers.push(block);
  return block;
}

addHome({
  id: "home-thesis",
  title: "blocks.system / object model",
  span: [3, 2],
  place: [1, 1],
  content: nodeFromHtml(`
    <div class="home-thesis">
      <small>the object is the interface</small>
      <strong>add any DOM content.<br>address every block.</strong>
      <p>The core knows fields, objects and lifecycle — never your renderer.</p>
    </div>
  `)
});

addHome({
  id: "home-facts",
  title: "three facts",
  span: [3, 1],
  place: [4, 1],
  content: nodeFromHtml(`
    <div class="home-facts">
      <p><strong>0</strong><span>runtime dependencies</span></p>
      <p><strong>esm</strong><span>native modules</span></p>
      <p><strong>any</strong><span>DOM content</span></p>
    </div>
  `)
});

const canvas = document.createElement("canvas");
canvas.className = "home-canvas";
canvas.setAttribute("aria-label", "Responsive magenta wave drawn on canvas");
const blockCanvas = addHome({
  id: "home-canvas",
  title: "canvas / live resize",
  span: [2, 2],
  place: [5, 3],
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
  context.strokeStyle = "rgb(255, 0, 255)";
  context.lineWidth = 3;
  context.beginPath();
  for (let x = 0; x <= width; x += 3) {
    const y = height / 2 + Math.sin(x * 0.055) * Math.min(44, height * 0.28);
    if (x === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
}

new ResizeObserver(drawCanvas).observe(blockCanvas.content);
window.addEventListener("resize", drawCanvas, { passive: true });

addHome({
  id: "home-principles",
  title: "generic / direct / extensible",
  span: [3, 2],
  place: [1, 4],
  content: nodeFromHtml(`
    <div class="home-principles">
      <p><small>01</small><strong>generic core</strong><span>No framework or renderer knowledge.</span></p>
      <p><small>02</small><strong>real DOM</strong><span>Strings, nodes, canvas and custom elements.</span></p>
      <p><small>03</small><strong>optional adapters</strong><span>Add lifecycle only when content needs it.</span></p>
    </div>
  `)
});

addHome({
  id: "home-next",
  title: "start / source",
  span: [2, 1],
  place: [4, 6],
  variant: "inverse",
  content: nodeFromHtml(`
    <nav class="home-next" aria-label="next steps">
      <a href="docs/#start"><small>learn</small><strong>manual →</strong></a>
      <a href="https://github.com/seb-prjcts-be/blocks.system"><small>inspect</small><strong>source →</strong></a>
    </nav>
  `)
});

const initialOrder = controllers.map((block) => block.element);

function updateStatus(message = "") {
  const order = Array.from(board.querySelectorAll(":scope > .blocks-system-object"))
    .map((block) => block.dataset.blockObject);
  status.textContent = message || `${order.length} direct blocks · drag on · ${order.join(" → ")}`;
}

reset.addEventListener("click", () => {
  initialOrder.forEach((element) => board.appendChild(element));
  controllers.forEach((block) => { block.minimized = false; });
  blocks.draggable = true;
  updateStatus("surface reset · drag on");
});

for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
  board.addEventListener(eventName, () => requestAnimationFrame(() => updateStatus()));
}
board.addEventListener("blocks:reorder", () => updateStatus("keyboard reorder · drag on"));

updateStatus();
board.dataset.homeReady = "true";
