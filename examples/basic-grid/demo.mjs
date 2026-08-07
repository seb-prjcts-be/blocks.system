import { createBlocksSystem } from "../../blocks.system.mjs?v=0.1.12";

const variationSamples = [0.4, 0.9, 0.1, 0.5];
let variationIndex = 0;
const blocks = createBlocksSystem({
  colorArray: ["cyan", "magenta", "yellow"],
  colorVariation: 0.25,
  inversionVariation: 0.25,
  random: () => variationSamples[variationIndex++ % variationSamples.length],
  snap: true,
  blockDefaults: { menu: { minimize: true, close: true } }
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
}

document.querySelector("#field").setAttribute("data-example-ready", "true");
