import { createBlocksSystem } from "../../blocks.system.mjs?v=0.1.8";

const blocks = createBlocksSystem({
  snap: true,
  blockDefaults: { menu: { minimize: true, close: true } }
});

blocks.attach("#field");
blocks.setGrid(3, 2);

blocks.add("<div class=\"center\"><strong>html</strong><small>trusted string</small></div>", {
  id: "html",
  title: "html"
});

const blockCanvasObject = document.createElement("canvas");
blockCanvasObject.width = 300;
blockCanvasObject.height = 180;
const context = blockCanvasObject.getContext("2d");
context.fillStyle = "#f5f5f2";
context.fillRect(0, 0, blockCanvasObject.width, blockCanvasObject.height);
context.strokeStyle = "#000";
context.lineWidth = 4;
context.beginPath();
for (let x = 0; x <= blockCanvasObject.width; x += 3) {
  const y = blockCanvasObject.height / 2 + Math.sin(x * 0.06) * 44;
  if (x === 0) context.moveTo(x, y);
  else context.lineTo(x, y);
}
context.stroke();
blocks.add(blockCanvasObject, { id: "canvas", title: "canvas" });

if (!customElements.get("example-dot")) {
  customElements.define("example-dot", class extends HTMLElement {
    connectedCallback() {
      this.textContent = "custom element";
    }
  });
}
blocks.add(document.createElement("example-dot"), {
  id: "custom-element",
  title: "custom element"
});

document.querySelector("#field").setAttribute("data-example-ready", "true");
