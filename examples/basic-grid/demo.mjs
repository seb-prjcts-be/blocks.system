import { system } from "../../blocks.system.mjs";

system.attach("#field");
system.setGrid(2, 2);
system.snap = true;
system.draggable = true;

for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const block = system.add(`<div class="center"><strong>block ${number}</strong><small>plain html</small></div>`, { id: `block-${number}` });
  block.menu(`block ${number}`, true);
  block.minimized = index === 1;
  if (index === 3) block.variant = "red";
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
