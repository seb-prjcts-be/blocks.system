import { system } from "../../blocks.system.mjs";

system.attach("#field");
system.setGrid(2, 2);
system.snap = true;

const colors = ["#ef3e36", "#2155ff", "#d600bc", "#008c55"];
for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const block = system.add(`<div class="center"><strong>block ${number}</strong><small>plain html</small></div>`, { id: `block-${number}` });
  block.menu(`block ${number}`, true);
  block.color = colors[index];
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
