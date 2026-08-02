import { createBlocksSystem } from "../blocks.system.mjs";
import { createDocsBoard, nodeFromHtml } from "./board.mjs";

const docsSystem = createBlocksSystem({ variant: "random" });
const docsBoard = createDocsBoard({ system: docsSystem });
const { addBlock } = docsBoard;

addBlock({
  id: "identity",
  title: "blocks.system",
  span: [2, 2],
  place: [1, 1],
  content: nodeFromHtml(`
    <div class="prototype-mark">
      <span>b</span>
      <strong>blocks.system</strong>
      <small>small objects · any content · one system</small>
    </div>
  `)
});

addBlock({
  id: "quick-start",
  title: "esm · quick start",
  span: [2, 2],
  place: [4, 1],
  content: nodeFromHtml(`
    <pre class="prototype-code"><code>import { system } from
"./blocks.system.mjs";

system.attach("#field");
system.setGrid(8, 6);
system.snap = true;

const block = system.add(content);
block.menu("test");
block.span(2, 1);
block.place(3, 2);</code></pre>
  `)
});

const canvas = document.createElement("canvas");
canvas.className = "prototype-canvas";
canvas.width = 640;
canvas.height = 360;
const context = canvas.getContext("2d");
context.fillStyle = "#efeee8";
context.fillRect(0, 0, canvas.width, canvas.height);
context.strokeStyle = "#000";
context.lineWidth = 4;
for (let x = 50; x < 260; x += 18) {
  context.beginPath();
  context.moveTo(x, 90);
  context.lineTo(x, 270);
  context.stroke();
}
context.beginPath();
context.arc(455, 215, 82, Math.PI, 2 * Math.PI);
context.stroke();
context.beginPath();
context.moveTo(455, 215);
context.lineTo(510, 154);
context.stroke();
context.fillStyle = "#000";
context.beginPath();
context.arc(455, 215, 7, 0, 2 * Math.PI);
context.fill();

addBlock({
  id: "canvas",
  title: "canvas · micrographic",
  span: [2, 2],
  place: [7, 1],
  content: canvas
});

addBlock({
  id: "guide",
  title: "guide",
  span: [2, 1],
  place: [1, 3],
  content: nodeFromHtml(`
    <a class="prototype-link" href="guide.html">
      <small>01 · learn the contract</small>
      <strong>guide</strong>
      <span>open →</span>
    </a>
  `)
});

const controls = document.createElement("div");
controls.className = "prototype-controls-demo";
controls.innerHTML = `
  ${Array.from({ length: 16 }, (_, index) => `<input type="checkbox" aria-label="cell ${index + 1}" ${index === 4 || index === 10 ? "checked" : ""}>`).join("")}
  <span class="prototype-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
`;
addBlock({
  id: "dom-controls",
  title: "html · native controls",
  span: [2, 2],
  place: [4, 3],
  content: controls
});

const reference = document.createElement("img");
reference.className = "prototype-reference";
reference.src = "references/micrographic-drag-snap-reference.png";
reference.alt = "Original micrographic drag and snap composition reference";
addBlock({
  id: "image",
  title: "image · reference",
  span: [2, 1],
  place: [7, 3],
  content: reference
});

addBlock({
  id: "api",
  title: "api · restore",
  span: [2, 1],
  place: [1, 4],
  minimized: true,
  content: nodeFromHtml(`
    <a class="prototype-link" href="api.html">
      <small>system + block</small>
      <strong>api</strong>
      <span>open →</span>
    </a>
  `)
});

addBlock({
  id: "examples",
  title: "examples",
  span: [2, 1],
  place: [7, 4],
  content: nodeFromHtml(`
    <a class="prototype-link" href="examples.html">
      <small>html · canvas · adapters</small>
      <strong>examples</strong>
      <span>open →</span>
    </a>
  `)
});

addBlock({
  id: "type",
  title: "type",
  span: [1, 2],
  place: [1, 5],
  variant: "inverse",
  content: nodeFromHtml(`<div class="prototype-typography" aria-label="lowercase letter a">a</div>`)
});

const adapterHost = document.createElement("div");
adapterHost.className = "prototype-adapter";
addBlock({
  id: "adapter",
  title: "custom adapter",
  span: [2, 1],
  place: [3, 5],
  variant: "cyan",
  content: adapterHost
});

docsSystem.registerAdapter("counter", {
  mount({ host, settings }) {
    const root = nodeFromHtml(`
      <div class="prototype-adapter">
        <span>adapter mount()</span>
        <output>${settings.start}</output>
        <small>individually addressable</small>
        <button type="button" aria-label="increase counter">+</button>
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
docsSystem.register({ id: "live-counter", adapter: "counter", defaults: { start: 3 } });
await docsSystem.mount("live-counter", adapterHost);

addBlock({
  id: "github",
  title: "source",
  span: [2, 1],
  place: [3, 6],
  content: nodeFromHtml(`
    <a class="prototype-link" href="https://github.com/seb-prjcts-be/blocks.system">
      <small>mit · native esm · zero dependencies</small>
      <strong>github</strong>
      <span>view source →</span>
    </a>
  `)
});

const manifestContent = nodeFromHtml(`
  <div class="prototype-manifest">
    <small>generated manifest</small>
    <strong>loading…</strong>
    <span>public contract</span>
  </div>
`);
addBlock({
  id: "manifest",
  title: "manifest · json",
  span: [2, 2],
  place: [7, 5],
  content: manifestContent
});

try {
  const response = await fetch("blocks.system.manifest.json");
  if (!response.ok) throw new Error(String(response.status));
  const manifest = await response.json();
  manifestContent.querySelector("strong").textContent = `v${manifest.version}`;
  manifestContent.querySelector("span").textContent = `${manifest.core_api.length} core methods · ${manifest.content_types.length} content types`;
} catch {
  manifestContent.querySelector("strong").textContent = "local";
  manifestContent.querySelector("span").textContent = "manifest unavailable";
}

docsBoard.ready();
