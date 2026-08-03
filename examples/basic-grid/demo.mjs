import { system as blocks } from "../../blocks.system.mjs?v=0.1.3";

blocks.attach("#field");
blocks.setGrid(2, 2);
blocks.snap = true;
blocks.draggable = true;

for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const blockItem = blocks.add(`<div class="center"><strong>block ${number}</strong><small>plain html</small></div>`, { id: `block-${number}` });
  blockItem.menu(`block ${number}`, true);
  blockItem.minimized = index === 1;
  if (index === 3) blockItem.variant = "magenta";
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
