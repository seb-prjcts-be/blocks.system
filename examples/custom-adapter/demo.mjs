import { system as blocks } from "../../blocks.system.mjs";

blocks.attach("#field");
blocks.setGrid(1, 1);
blocks.snap = true;
blocks.draggable = true;

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
const blockCounter = blocks.add(blockCounterHost, { id: "counter" });
blockCounter.menu("click counter", true);
await blocks.mount("click-counter", blockCounterHost, { start: 3 });

document.querySelector("#field").setAttribute("data-example-ready", "true");
