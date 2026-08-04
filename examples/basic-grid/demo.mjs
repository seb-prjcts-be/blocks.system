import { createBlocksSystem } from "../../blocks.system.mjs?v=0.1.5";

const blocks = createBlocksSystem({
  snap: true,
  blockDefaults: { menu: { close: true } }
});

blocks.attach("#field");
blocks.setGrid(2, 2);

for (let index = 0; index < 4; index += 1) {
  const number = index + 1;
  const blockItem = blocks.add(`<div class="center"><strong>block ${number}</strong><small>plain html</small></div>`, {
    id: `block-${number}`,
    title: `block ${number}`
  });
  blockItem.minimized = index === 1;
  if (index === 3) blockItem.variant = "magenta";
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
