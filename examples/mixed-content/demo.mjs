import { system } from "../../blocks.system.mjs";

const colors = [
  [255, 0, 0],
  [0, 255, 0],
  [0, 0, 255],
  [0, 255, 255],
  [255, 0, 255],
  [255, 255, 0]
];

system.attach("#field");
system.setGrid(3, 1);
system.snap = true;
system.draggable = true;

const html = system.add("<div class=\"center\"><strong>html</strong><small>trusted string</small></div>", { id: "html" });
html.menu("html", true);

const canvas = document.createElement("canvas");
canvas.width = 300;
canvas.height = 180;
const context = canvas.getContext("2d");
context.fillStyle = "#f5f5f2";
context.fillRect(0, 0, canvas.width, canvas.height);
context.strokeStyle = `rgb(${colors[2].join(", ")})`;
context.lineWidth = 4;
context.beginPath();
for (let x = 0; x <= canvas.width; x += 3) {
  const y = canvas.height / 2 + Math.sin(x * 0.06) * 44;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
const drawing = system.add(canvas, { id: "canvas" });
drawing.menu("canvas", true);
drawing.color = `rgb(${colors[2].join(", ")})`;

if (!customElements.get("example-dot")) {
  customElements.define("example-dot", class extends HTMLElement {
    connectedCallback() {
      this.textContent = "custom element";
    }
  });
}
const custom = system.add(document.createElement("example-dot"), { id: "custom-element" });
custom.menu("custom element", true);
custom.color = `rgb(${colors[4].join(", ")})`;

document.querySelector("#field").setAttribute("data-example-ready", "true");
