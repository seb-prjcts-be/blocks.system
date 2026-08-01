import { system } from "./blocks.system.mjs";

const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 0]
];

system.attach("#field");
system.setGrid(4, 4);
system.snap = true;
system.draggable = true;

const htmlBlock = system.add(`
  <div class="demo-copy">
    <strong>html</strong>
    <small>string → dom</small>
  </div>
`, { id: "html" });
htmlBlock.menu("html", true);

const canvas = document.createElement("canvas");
canvas.className = "demo-canvas";
canvas.width = 480;
canvas.height = 260;
const context = canvas.getContext("2d");
context.fillStyle = "#f7f7f4";
context.fillRect(0, 0, canvas.width, canvas.height);
context.strokeStyle = `rgb(${colors[2].join(", ")})`;
context.lineWidth = 4;
context.beginPath();
for (let x = 0; x <= canvas.width; x += 4) {
  const y = canvas.height / 2 + Math.sin(x * 0.045) * 62;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
const canvasBlock = system.add(canvas, { id: "canvas" });
canvasBlock.menu("canvas", true);
canvasBlock.color = `rgb(${colors[2].join(", ")})`;
canvasBlock.span(2, 1);

if (!customElements.get("system-badge")) {
  customElements.define("system-badge", class extends HTMLElement {
    connectedCallback() {
      this.innerHTML = "<strong>custom element</strong><small>&lt;system-badge&gt;</small>";
    }
  });
}
const customBlock = system.add(document.createElement("system-badge"), { id: "custom-element" });
customBlock.menu("custom element", true);
customBlock.color = `rgb(${colors[4].join(", ")})`;
customBlock.span(1, 2);

const controls = document.createElement("div");
controls.className = "native-controls";
controls.innerHTML = `
  <label>text <input value="edit me"></label>
  <label>range <input type="range" value="68"></label>
  <button type="button">native button</button>
`;
const controlsBlock = system.add(controls, { id: "controls" });
controlsBlock.menu("native controls", true);

const columns = document.querySelector("#columns");
const rows = document.querySelector("#rows");
const snap = document.querySelector("#snap");

function updateGrid() {
  const x = Number(columns.value);
  const y = Number(rows.value);
  system.setGrid(x, y);
  system.snap = snap.checked;
  document.querySelector("#columns-value").value = x;
  document.querySelector("#rows-value").value = y;
}

columns.addEventListener("input", updateGrid);
rows.addEventListener("input", updateGrid);
snap.addEventListener("change", updateGrid);
document.querySelector("#field").setAttribute("data-demo-ready", "true");
