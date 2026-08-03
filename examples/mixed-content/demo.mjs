import { system as blocks } from "../../blocks.system.mjs?v=0.1.1";

const accent = [255, 0, 255];

blocks.attach("#field");
blocks.setGrid(3, 2);
blocks.snap = true;
blocks.draggable = true;

const blockHtml = blocks.add("<div class=\"center\"><strong>html</strong><small>trusted string</small></div>", { id: "html" });
blockHtml.menu("html", true);

const blockCanvasNode = document.createElement("canvas");
blockCanvasNode.width = 300;
blockCanvasNode.height = 180;
const context = blockCanvasNode.getContext("2d");
context.fillStyle = "#f5f5f2";
context.fillRect(0, 0, blockCanvasNode.width, blockCanvasNode.height);
context.strokeStyle = `rgb(${accent.join(", ")})`;
context.lineWidth = 4;
context.beginPath();
for (let x = 0; x <= blockCanvasNode.width; x += 3) {
  const y = blockCanvasNode.height / 2 + Math.sin(x * 0.06) * 44;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
const blockCanvas = blocks.add(blockCanvasNode, { id: "canvas" });
blockCanvas.menu("canvas", true);

if (!customElements.get("example-dot")) {
  customElements.define("example-dot", class extends HTMLElement {
    connectedCallback() {
      this.textContent = "custom element";
    }
  });
}
const blockCustom = blocks.add(document.createElement("example-dot"), { id: "custom-element" });
blockCustom.menu("custom element", true);

document.querySelector("#field").setAttribute("data-example-ready", "true");
