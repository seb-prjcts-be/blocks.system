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
system.setGrid(2, 2);
system.snap = true;
system.draggable = true;

for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const block = system.add(`<div class="center"><strong>block ${number}</strong><small>plain html</small></div>`, { id: `block-${number}` });
  block.menu(`block ${number}`, true);
  if (index === 3) block.color = `rgb(${colors[0].join(", ")})`;
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
