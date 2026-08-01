import { system } from "../../blocks.system.mjs";

system.attach("#field");
system.setGrid(1, 1);
system.snap = true;
system.draggable = true;

system.registerAdapter("counter", {
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

system.register({
  id: "click-counter",
  label: "click counter",
  adapter: "counter",
  medium: "html",
  category: "controls",
  defaults: { start: 0 }
});

const host = document.createElement("div");
host.className = "center";
const block = system.add(host, { id: "counter" });
block.menu("click counter", true);
await system.mount("click-counter", host, { start: 3 });

document.querySelector("#field").setAttribute("data-example-ready", "true");
