import { createBlocksSystem } from "../../blocks.system.mjs?v=0.1.8";

const blocks = createBlocksSystem({
  snap: true,
  blockDefaults: { menu: { minimize: true, close: true } }
});

blocks.attach("#field");
blocks.setGrid(1, 1);

blocks.registerAdapter("counter", {
  mount({ host, settings }) {
    const button = document.createElement("button");
    let value = settings.start;
    button.textContent = `count: ${value}`;
    button.addEventListener("click", function () {
      value += 1;
      button.textContent = `count: ${value}`;
    });
    host.appendChild(button);
    return button;
  },
  snippet({ settings }) {
    return `<button>count: ${settings.start}</button>`;
  }
});

blocks.register({
  id: "click-counter",
  label: "click counter",
  adapter: "counter",
  medium: "html",
  category: "controls",
  defaults: { start: 0 }
});

const blockCounterHost = document.createElement("div");
blockCounterHost.className = "center";
blocks.add(blockCounterHost, { id: "counter", title: "click counter" });
await blocks.mount("click-counter", blockCounterHost, { start: 3 });

document.querySelector("#field").setAttribute("data-example-ready", "true");
