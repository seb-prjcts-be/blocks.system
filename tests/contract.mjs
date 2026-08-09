import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, resolve } from "node:path";
import { createBlocksSystem, system as singleton } from "../blocks.system.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const sourcePath = resolve(root, "blocks.system.mjs");
const minPath = resolve(root, "blocks.system.min.mjs");
const source = await readFile(sourcePath, "utf8");
const minified = await readFile(minPath, "utf8");

assert.doesNotMatch(source, /vanilla\.waves|p5\.waves|VanillaWaves|WavesLoader|P5WindowSketches|\bWEL\b/, "the core must not know a local runtime");
assert.ok(["attach", "setGrid", "compact", "add", "register", "registerAdapter", "mount", "unmount"]
  .every(function (name) { return typeof singleton[name] === "function"; }), "the approved public API is incomplete");
assert.equal(singleton.snap, false, "snap must be disabled by default");
assert.equal(singleton.columns, 1, "grid columns must be readable from the default system");
assert.equal(singleton.rows, 1, "grid rows must be readable from the default system");
assert.equal(singleton.draggable, true, "dragging must be enabled by default");
assert.equal(singleton.font, null, "external fonts must remain opt-in");
assert.equal(singleton.variant, "random", "visual variants must be random by default");
assert.deepEqual(singleton.variants, ["regular", "inverse"], "only the monochrome library variants must be discoverable");
assert.deepEqual(singleton.colorArray, [], "the library must not choose a color palette for the consumer");
assert.equal(singleton.colorVariation, 0, "automatic color variation must remain opt-in");
assert.equal(singleton.inversionVariation, 1 / 3, "automatic inversion must preserve the existing one-in-three monochrome distribution");
assert.equal("colorVary" in singleton, false, "the abbreviated colorVary name must leave the public API");
assert.deepEqual(singleton.labels, {
  move: "move with the arrow keys",
  restore: "restore",
  minimize: "minimize",
  close: "close"
}, "the environment-neutral singleton must expose English UI labels");

const minUrl = pathToFileURL(minPath);
minUrl.searchParams.set("parity", Date.now());
const { createBlocksSystem: createMinBlocksSystem, system: minSingleton } = await import(minUrl.href);
assert.deepEqual(Object.keys(minSingleton).sort(), Object.keys(singleton).sort(), "source and minified API must match");
assert.ok(minified.length < source.length, "the minified module must be smaller than the source");

let adapterUnmounts = 0;
const local = createBlocksSystem({ catalogUrl: "https://example.test/catalog.html", random: () => 0.99 });
const adapterRegistration = local.registerAdapter("html", {
  mount({ host, settings }) {
    const node = document.createElement("p");
    node.setAttribute("data-value", settings.value || "mounted");
    host.appendChild(node);
    return node;
  },
  unmount() { adapterUnmounts += 1; },
  snippet({ block }) { return block.markup; }
}, { replace: true });
const blockRegistration = local.register({
  id: "plain-html",
  label: "plain html",
  adapter: "html",
  medium: "html",
  markup: "<p>test</p>"
});

assert.equal(adapterRegistration, local, "registerAdapter must remain chainable on the public system");
assert.equal(blockRegistration, local, "register must remain chainable on the public system");
assert.equal(local.get("plain-html").markup, "<p>test</p>", "free block data must be preserved");
assert.deepEqual(local.listAdapters(), ["html"], "a consumer adapter must be able to replace the built-in html adapter");
assert.equal(local.list({ medium: "html" }).length, 1, "content type must be filterable");
assert.equal(local.address("plain-html"), "https://example.test/catalog.html?block=plain-html", "addresses use the block parameter");
assert.equal(local.snippet("plain-html"), "<p>test</p>", "snippet requests must stay inside the registered catalog");
const isolated = createBlocksSystem();
assert.equal(isolated.get("plain-html"), null, "each system must own an isolated catalog");
assert.deepEqual(isolated.listAdapters(), ["html"], "each system must ship only the built-in html adapter; consumer adapters must not leak between systems");

local.register({ id: "hub-detail", adapter: "html", url: "praktische-info.html" });
assert.equal(
  local.address("hub-detail"),
  "https://example.test/praktische-info.html?block=hub-detail",
  "a relative block url must resolve against the catalog base"
);
local.register({ id: "extern-detail", adapter: "html", url: "https://elders.test/pagina.html" });
assert.equal(
  local.address("extern-detail"),
  "https://elders.test/pagina.html?block=extern-detail",
  "a block that names its own page must be addressed on that page"
);
const headless = createBlocksSystem();
headless.register({ id: "los", adapter: "html", url: "https://example.test/detail.html", markup: "<p>los</p>" });
assert.equal(
  headless.address("los"),
  "https://example.test/detail.html?block=los",
  "an absolute block url must not require a catalogUrl or a window"
);
assert.equal(headless.snippet("los"), "<p>los</p>", "a markup definition must snippet on the built-in html adapter");
headless.register({ id: "zwevend", adapter: "html", url: "detail.html" });
assert.throws(function () { headless.address("zwevend"); }, /catalogUrl/, "a relative block url without any base must fail with the catalogUrl error");
headless.register({ id: "zonder-markup", adapter: "html" });
assert.throws(function () { headless.snippet("zonder-markup"); }, /markup-string/, "the built-in html adapter must reject definitions without markup");
assert.throws(function () { local.setGrid(0, 2); }, /positieve gehele/, "invalid grids must fail early");

class TestStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  removeProperty(name) { this.values.delete(name); }
  getPropertyValue(name) { return this.values.get(name) || ""; }
}

class TestElement {
  constructor() {
    this.attributes = new Map();
    this.children = [];
    this.classList = { add() {}, remove() {} };
    this.listeners = new Map();
    this.parentElement = null;
    this.parentNode = null;
    this.style = new TestStyle();
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || [];
    this.listeners.set(type, listeners.filter((item) => item !== listener));
  }
  dispatchEvent(event) {
    for (const listener of this.listeners.get(event.type) || []) listener.call(this, event);
    return true;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  matches(selector) {
    if (selector !== ".blocks-system-object") return false;
    return String(this.className || "").split(/\s+/).includes("blocks-system-object");
  }
  querySelectorAll(selector) {
    if (selector !== 'link[rel="stylesheet"]') return [];
    return this.children.filter((child) => child.getAttribute("rel") === "stylesheet");
  }
  appendChild(child) {
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, reference) {
    const currentIndex = this.children.indexOf(child);
    if (currentIndex >= 0) this.children.splice(currentIndex, 1);
    const referenceIndex = reference ? this.children.indexOf(reference) : -1;
    child.parentElement = this;
    child.parentNode = this;
    this.children.splice(referenceIndex >= 0 ? referenceIndex : this.children.length, 0, child);
    return child;
  }
  contains(node) {
    return this === node || this.children.some((child) =>
      child === node || (typeof child.contains === "function" && child.contains(node))
    );
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index < 0) throw new Error("child not found");
    this.children.splice(index, 1);
    child.parentElement = null;
    child.parentNode = null;
    return child;
  }
  remove() {
    if (!this.parentElement) return;
    this.parentElement.removeChild(this);
  }
}

globalThis.Element = TestElement;
globalThis.document = {
  documentElement: { lang: "en" },
  head: new TestElement(),
  createElement() { return new TestElement(); },
  querySelector() { return null; }
};

const transcluded = createBlocksSystem({ variant: "regular" });
const transcludedField = new TestElement();
transcluded.attach(transcludedField);
const describedBlock = transcluded.add("<p>Het dagverloop.</p>", { id: "dagverloop", title: "DAGVERLOOP" });
const describedDefinition = describedBlock.describe({ url: "https://example.test/praktische-info.html" });
assert.deepEqual(describedDefinition, {
  id: "dagverloop",
  adapter: "html",
  label: "DAGVERLOOP",
  markup: "<p>Het dagverloop.</p>",
  url: "https://example.test/praktische-info.html"
}, "a live add() block must describe itself as a registerable html definition");
const hub = createBlocksSystem({
  catalogUrl: "https://example.test/kaart.html",
  blocks: JSON.parse(JSON.stringify([describedDefinition]))
});
assert.equal(
  hub.snippet("dagverloop"),
  "<p>Het dagverloop.</p>",
  "a described block must snippet on another page without a consumer adapter"
);
assert.equal(
  hub.address("dagverloop"),
  "https://example.test/praktische-info.html?block=dagverloop",
  "a described block must deep-link to the page it lives on"
);
const hubHost = new TestElement();
const hubNode = await hub.mount("dagverloop", hubHost);
assert.equal(hubNode.innerHTML, "<p>Het dagverloop.</p>", "the built-in html adapter must mount markup into a host");
assert.equal(hubHost.getAttribute("data-block-mounted"), "dagverloop", "the host must record the mounted block");

const configured = createBlocksSystem({
  snap: true,
  draggable: false,
  variant: "regular",
  colorArray: ["yellow", "blue", "yellow"],
  colorVariation: 0.2,
  inversionVariation: 0.5,
  blockDefaults: {
    menu: { close: true, minimize: true }
  }
});
assert.equal(configured.snap, true, "snap must be configurable when a system is created");
assert.equal(configured.draggable, false, "dragging must be configurable when a system is created");
assert.deepEqual(configured.colorArray, ["yellow", "blue"], "creation-time color arrays must normalize and deduplicate CSS colors");
assert.equal(configured.colorVariation, 0.2, "creation-time color variation must remain readable");
assert.equal(configured.inversionVariation, 0.5, "creation-time inversion variation must remain readable");
const configuredField = new TestElement();
configured.attach(configuredField);
const defaultMenuBlock = configured.add("<p>default menu</p>", {
  id: "default-menu",
  title: "default menu"
});
assert.equal(defaultMenuBlock.element.children[0].children[0].textContent, "default menu", "an automatic menu must use the block title");
assert.equal(defaultMenuBlock.element.children[0].children[1].children.length, 2, "blockDefaults.menu must apply shared minimize and close controls");
assert.equal(defaultMenuBlock.element.children[0].children[0].tabIndex, -1, "an initially locked system must keep automatic menu handles outside the tab order");
assert.equal(defaultMenuBlock.element.children[0].getAttribute("role"), null, "a menu containing action buttons must remain a structural header");
const untitledMenuBlock = configured.add("<p>untitled menu</p>", {
  id: "untitled-menu"
});
assert.equal(
  untitledMenuBlock.element.children[0].children[0].textContent,
  "",
  "an omitted title must not turn the block id into visible menu text"
);
assert.match(
  untitledMenuBlock.element.children[0].children[1].children[1].getAttribute("aria-label"),
  /untitled-menu.*close/,
  "an untitled menu must retain the id as its accessible action name"
);
const overriddenMenuBlock = configured.add("<p>overridden menu</p>", {
  id: "overridden-menu",
  title: "overridden menu",
  menu: { minimize: false }
});
assert.equal(overriddenMenuBlock.element.children[0].children[1].children.length, 1, "a local menu override must inherit close while disabling minimize");
const menuFreeBlock = configured.add("<p>no menu</p>", {
  id: "no-menu",
  menu: false
});
assert.equal(menuFreeBlock.element.children.length, 1, "menu: false must disable an inherited automatic menu");
const configuredChildren = configuredField.children.length;
assert.throws(function () {
  configured.add("<p>invalid menu</p>", { id: "invalid-menu", menu: "yes" });
}, /add\(\).*menu/, "invalid local menu defaults must fail at the add boundary");
assert.equal(configuredField.children.length, configuredChildren, "invalid menu settings must not append a partial block");
assert.throws(function () {
  createBlocksSystem({ blockDefaults: "menu" });
}, /blockDefaults/, "blockDefaults must be an object");
assert.throws(function () {
  createBlocksSystem({ blockDefaults: { menu: "yes" } });
}, /blockDefaults\.menu/, "blockDefaults.menu must be boolean or an options object");

const compacting = createBlocksSystem({ variant: "regular" });
const compactingField = new TestElement();
const compactChanges = [];
compactingField.addEventListener("blocks:change", function (event) {
  compactChanges.push(event.detail);
});
compacting.attach(compactingField).setGrid(1, 6);
const compactFirst = compacting.add("first", { id: "compact-first" }).place(1, 1);
const compactSecond = compacting.add("second", { id: "compact-second" }).place(1, 3);
const compactThird = compacting.add("third", { id: "compact-third" }).span(1, 2).place(1, 5);
assert.equal(compacting.compact(), compacting, "compact must remain chainable on the system");
assert.equal(compactFirst.element.style.getPropertyValue("--block-row"), "1", "compact must keep already tight blocks in place");
assert.equal(compactSecond.element.style.getPropertyValue("--block-row"), "2", "compact must fill the first vertical gap");
assert.equal(compactThird.element.style.getPropertyValue("--block-row"), "3", "compact must preserve spans while moving upward");
assert.equal(compactingField.style.getPropertyValue("--blocks-rows"), "6", "compact must not silently shrink the configured grid");
assert.deepEqual(compactChanges.pop(), {
  type: "compact",
  id: null,
  ids: ["compact-second", "compact-third"]
}, "compact must publish the moved block ids");
compacting.compact();
assert.equal(compactChanges.length, 0, "a no-op compact must not publish a change event");

const closingCollapse = createBlocksSystem({ snap: true, variant: "regular" });
const closingCollapseField = new TestElement();
closingCollapse.attach(closingCollapseField).setGrid(1, 6);
closingCollapse.add("top", { id: "close-collapse-top" }).place(1, 1);
const closingGap = closingCollapse.add("gap", { id: "close-collapse-gap" }).place(1, 2);
const closingLower = closingCollapse.add("lower", { id: "close-collapse-lower" }).place(1, 4);
closingGap.remove();
assert.equal(
  closingLower.element.style.getPropertyValue("--block-row"),
  "2",
  "closing a placed block must pull a later block into its released grid cell"
);

const closingRowCollapse = createBlocksSystem({ snap: true, variant: "regular" });
const closingRowCollapseField = new TestElement();
const closingRowChanges = [];
closingRowCollapseField.addEventListener("blocks:change", function (event) {
  closingRowChanges.push(event.detail);
});
closingRowCollapse.attach(closingRowCollapseField).setGrid(3, 6);
closingRowCollapse.add("top", { id: "close-row-top" }).span(3, 1).place(1, 1);
const closingPartialRow = closingRowCollapse.add("gap", { id: "close-row-gap" }).span(2, 1).place(1, 2);
const closingWideLower = closingRowCollapse.add("lower", { id: "close-row-lower" }).span(3, 1).place(1, 4);
closingPartialRow.remove();
assert.equal(
  closingWideLower.element.style.getPropertyValue("--block-row"),
  "2",
  "closing the only block on a row must let a wider later block jump into that now-empty row"
);
assert.deepEqual(closingRowChanges[0].ids, ["close-row-gap", "close-row-lower"], "row collapse must report the wider block that moved upward");

const intentionalSpace = createBlocksSystem({ snap: true, variant: "regular" });
const intentionalSpaceField = new TestElement();
intentionalSpace.attach(intentionalSpaceField).setGrid(1, 6);
const intentionalLower = intentionalSpace.add("lower", { id: "intentional-lower" }).place(1, 4);
assert.equal(
  intentionalLower.element.style.getPropertyValue("--block-row"),
  "4",
  "a grid cell that was never closed must remain intentional empty space"
);

compactSecond.minimized = true;
compactSecond.minimized = true;
compactSecond.minimized = false;
compactThird.remove();
assert.throws(function () { compactThird.remove(); }, /verwijderd/, "removed blocks must not publish duplicate remove events");
assert.deepEqual(compactChanges.map((change) => change.type), ["minimize", "restore", "remove"], "state changes must publish one stable change event");
assert.deepEqual(compactChanges.map((change) => change.id), ["compact-second", "compact-second", "compact-third"], "state change events must identify their block");

assert.deepEqual(createBlocksSystem({ colorArray: [] }).colorArray, [], "an empty user color array must be valid while color variation is disabled");
assert.deepEqual(
  createBlocksSystem({ colorArray: [" #00ffff ", "var(--accent-color)", "#00ffff"] }).colorArray,
  ["#00ffff", "var(--accent-color)"],
  "colorArray must preserve and deduplicate user-supplied CSS colors"
);
assert.throws(function () {
  createBlocksSystem({ colorArray: [""] });
}, /colorArray/, "colorArray must reject empty color values");
assert.throws(function () {
  createBlocksSystem({ colorArray: [123] });
}, /colorArray/, "colorArray must require CSS colors as strings");
assert.throws(function () {
  createBlocksSystem({ colorVariation: 0.2 });
}, /colorArray/, "color variation must require user-supplied colors");
assert.throws(function () {
  createBlocksSystem({ colorVariation: 1.01 });
}, /colorVariation/, "colorVariation must stay inside the normalized probability range");
assert.throws(function () {
  createBlocksSystem({ inversionVariation: -0.01 });
}, /inversionVariation/, "inversionVariation must stay inside the normalized probability range");
assert.throws(function () {
  createBlocksSystem({ colorVary: 0.2 });
}, /colorVary heet nu colorVariation/, "the retired colorVary option must fail with its replacement name");
const minConfigured = createMinBlocksSystem({
  snap: true,
  draggable: false,
  variant: "regular",
  colorArray: ["yellow", "blue", "yellow"],
  colorVariation: 0.2,
  inversionVariation: 0.5,
  blockDefaults: { menu: { close: true } }
});
const minConfiguredField = new TestElement();
minConfigured.attach(minConfiguredField);
const minDefaultMenuBlock = minConfigured.add("<p>min default menu</p>", {
  id: "min-default-menu",
  title: "min default menu"
});
defaultMenuBlock.color = "cyan";
minDefaultMenuBlock.color = "cyan";
assert.equal(minConfigured.snap, configured.snap, "source and minified creation-time snap must match");
assert.equal(minConfigured.draggable, configured.draggable, "source and minified creation-time dragging must match");
assert.deepEqual(minConfigured.colorArray, configured.colorArray, "source and minified creation-time color arrays must match");
assert.equal(minConfigured.colorVariation, configured.colorVariation, "source and minified creation-time color variation must match");
assert.equal(minConfigured.inversionVariation, configured.inversionVariation, "source and minified creation-time inversion variation must match");
assert.equal(minDefaultMenuBlock.element.children[0].children[1].children.length, 2, "source and minified block menu defaults must match");
assert.equal(minDefaultMenuBlock.element.style.getPropertyValue("--block-color"), defaultMenuBlock.element.style.getPropertyValue("--block-color"), "source and minified direct block colors must match");
assert.equal(minDefaultMenuBlock.element.style.getPropertyValue("--block-menu-color"), "var(--blocks-ink-color)", "direct block colors must keep a readable neutral menu fallback outside a rendered browser");

const colorSamples = [0, 0.199999, 0.2, 0.999999];
const colorful = createBlocksSystem({
  colorArray: ["yellow", "blue"],
  colorVariation: 0.2,
  inversionVariation: 1 / 3,
  random: () => colorSamples.shift()
});
const colorfulField = new TestElement();
colorful.attach(colorfulField);
colorful.setGrid(5, 1);
const yellowRandom = colorful.add("<p>yellow</p>", { id: "yellow-random" });
const blueRandom = colorful.add("<p>blue</p>", { id: "blue-random" });
const regularRandom = colorful.add("<p>regular</p>", { id: "regular-random" });
const inverseRandom = colorful.add("<p>inverse</p>", { id: "inverse-random" });
const explicitColor = colorful.add("<p>explicit</p>", { id: "explicit-color", variant: "magenta" });
assert.deepEqual(
  [yellowRandom.variant, blueRandom.variant, regularRandom.variant, inverseRandom.variant, explicitColor.variant],
  ["color", "color", "regular", "inverse", "magenta"],
  "colorVariation and inversionVariation must divide one stable random range without affecting explicit variants"
);
assert.equal(yellowRandom.element.getAttribute("data-block-color"), "yellow", "a selected user color must be exposed independently from the generic color variant");
assert.equal(yellowRandom.element.style.getPropertyValue("--block-array-color"), "yellow", "a selected user color must feed the generic CSS hook");
assert.equal(blueRandom.element.getAttribute("data-block-color"), "blue", "each colored block must retain its selected user value");
assert.equal(regularRandom.element.getAttribute("data-block-color"), null, "monochrome blocks must not expose a user color");
assert.equal(explicitColor.element.getAttribute("data-block-color"), null, "custom explicit variants must remain consumer CSS hooks, not library colors");
colorful.colorArray = ["cyan", "cyan"];
colorful.colorVariation = 1;
assert.deepEqual(colorful.colorArray, ["cyan"], "runtime color arrays must stay normalized and deduplicated as CSS colors");
assert.equal(colorful.colorVariation, 1, "runtime color variation must remain writable for future blocks");
assert.equal(yellowRandom.element.getAttribute("data-block-color"), "yellow", "changing system color settings must not recolor existing blocks");
const cyanRandom = colorful.add("<p>cyan</p>", { id: "cyan-random" });
assert.equal(cyanRandom.variant, "color", "runtime color settings must use the generic library color variant");
assert.equal(cyanRandom.element.getAttribute("data-block-color"), "cyan", "runtime color settings must apply the user's value to future random blocks");
cyanRandom.variant = "inverse";
assert.equal(cyanRandom.element.getAttribute("data-block-color"), null, "switching to a monochrome variant must clear the selected user color");
assert.equal(cyanRandom.element.style.getPropertyValue("--block-array-color"), "", "switching variants must clear the generic color CSS hook");
assert.throws(function () { colorful.colorArray = []; }, /colorArray/, "an active color variation must not lose its user color source");
colorful.colorVariation = 0;
colorful.colorArray = [];
assert.deepEqual(colorful.colorArray, [], "the user must be able to clear the palette after disabling color variation");
assert.throws(function () { colorful.colorVariation = 0.2; }, /colorArray/, "runtime color variation must require a non-empty user array");
colorful.inversionVariation = 1;
assert.equal(colorful.add("<p>inverse</p>", { id: "future-inverse" }).variant, "inverse", "runtime inversion variation must apply to future monochrome blocks");
assert.throws(function () { colorful.colorVariation = "0.2"; }, /colorVariation/, "runtime color variation must require a number");
assert.throws(function () { colorful.inversionVariation = "0.2"; }, /inversionVariation/, "runtime inversion variation must require a number");

const inversionSamples = [0, 0.799999, 0.8, 0.999999];
const monochrome = createBlocksSystem({
  colorVariation: 0,
  inversionVariation: 0.2,
  random: () => inversionSamples.shift()
});
const monochromeField = new TestElement();
monochrome.attach(monochromeField);
assert.deepEqual(
  ["a", "b", "c", "d"].map((id) => monochrome.add("<p>mono</p>", { id }).variant),
  ["regular", "regular", "inverse", "inverse"],
  "inversionVariation must reserve the upper share of the non-color range for inverse blocks"
);

const adapterHost = new TestElement();
const mountedNode = await local.mount("plain-html", adapterHost, { value: "ready" });
assert.equal(mountedNode.getAttribute("data-value"), "ready", "mount must pass overrides to the registered adapter");
assert.equal(adapterHost.getAttribute("data-block-mounted"), "plain-html", "mount must expose the active definition on its host");
assert.equal(local.unmount(adapterHost), true, "unmount must report a mounted adapter");
assert.equal(adapterUnmounts, 1, "unmount must run the registered adapter cleanup");
assert.equal(adapterHost.children.length, 0, "unmount must remove the mounted adapter root");
assert.equal(adapterHost.getAttribute("data-block-mounted"), null, "unmount must clear the host state");

const field = new TestElement();
const font = {
  href: "https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&display=swap",
  family: "Oswald"
};
local.font = font;
local.font = font;
assert.deepEqual(local.font, font, "font configuration must remain readable");
assert.equal(document.head.children.length, 1, "the same font stylesheet must load only once");
assert.equal(document.head.children[0].getAttribute("data-blocks-system-font"), "", "injected font links must be identifiable");
assert.throws(function () { local.font = { family: "" }; }, /family mag niet leeg/, "empty font families must fail early");
local.attach(field);
assert.equal(field.style.getPropertyValue("--blocks-font-family"), '"Oswald"', "the configured font must reach the attached field");
local.font = null;
assert.equal(field.style.getPropertyValue("--blocks-font-family"), "", "resetting font must restore the CSS default");
local.setGrid(4, 4);
assert.equal(local.columns, 4, "setGrid must expose the current column count");
assert.equal(local.rows, 4, "setGrid must expose the current row count");
assert.throws(function () { local.columns = 9; }, TypeError, "grid columns must remain read-only");
assert.throws(function () { local.rows = 9; }, TypeError, "grid rows must remain read-only");
const object = local.add("<p>span</p>", { id: "span-test" });
assert.equal(object.element.children.length, 1, "blocks without blockDefaults must not gain an automatic menu");
assert.equal(object.minimized, false, "blocks must start restored unless configured otherwise");
assert.equal(object.variant, "inverse", "an unspecified block must receive a stable random monochrome variant");
assert.equal(object.element.getAttribute("data-block-variant"), "inverse", "the resolved variant must be exposed to CSS");
object.variant = "default";
assert.equal(object.variant, "regular", "the default alias must resolve to regular");
object.variant = "random";
assert.equal(object.variant, "inverse", "an explicit random assignment must reroll the block");
assert.throws(function () { object.variant = "not valid"; }, /Ongeldige blockvariant/, "invalid variant names must fail early");
assert.equal(typeof object.span, "function", "every block must expose span(x, y)");
assert.equal(object.span(2, 1), object, "span must remain chainable");
assert.equal(object.element.style.getPropertyValue("--block-span-columns"), "2", "span x must set whole column units");
assert.equal(object.element.style.getPropertyValue("--block-span-rows"), "1", "span y must set whole row units");
assert.equal(object.place(2, 2), object, "place must remain chainable");
assert.equal(object.element.style.getPropertyValue("--block-column"), "2", "place x must set a one-based column");
assert.equal(object.element.style.getPropertyValue("--block-row"), "2", "place y must set a one-based row");
assert.equal(object.flow(), object, "flow must remain chainable");
assert.equal(object.element.style.getPropertyValue("--block-column"), "", "flow must clear the fixed column");
assert.equal(object.element.style.getPropertyValue("--block-row"), "", "flow must clear the fixed row");
object.place(2, 2);
object.menu("span", true);
assert.equal(object.element.children[0].children[1].children.length, 2, "a menu must expose minimize and optional close controls together");
assert.equal(object.element.children[0].children[0].tabIndex, 0, "a draggable title handle must be keyboard-focusable");
assert.equal(object.element.children[0].children[0].getAttribute("role"), "button", "a draggable title handle must expose its interaction role");
assert.match(object.element.children[0].children[0].getAttribute("aria-label"), /arrow keys/, "a draggable title handle must explain its keyboard control in the configured language");
assert.equal(object.element.children[0].children[0].getAttribute("aria-keyshortcuts"), "ArrowLeft ArrowUp ArrowRight ArrowDown", "a draggable title handle must publish its supported keys");
assert.equal(object.element.children[0].getAttribute("role"), null, "the menu header must not wrap action buttons in an interactive role");
assert.match(object.element.children[0].children[1].children[0].getAttribute("aria-label"), /minimize/, "the minimize control must use the configured label");
assert.match(object.element.children[0].children[1].children[1].getAttribute("aria-label"), /close/, "the close control must use the configured label");
local.draggable = false;
assert.equal(object.element.children[0].children[0].tabIndex, -1, "a locked title handle must leave the keyboard tab order");
assert.equal(object.element.children[0].children[0].getAttribute("role"), null, "a locked title must not promise a button interaction");
assert.equal(object.element.children[0].children[0].getAttribute("aria-label"), null, "a locked title must not promise arrow-key movement");
assert.equal(object.element.children[0].children[0].getAttribute("aria-keyshortcuts"), null, "a locked title must not publish inactive shortcuts");
local.draggable = true;
assert.equal(object.element.children[0].children[0].tabIndex, 0, "unlocking must restore the keyboard handle");
object.minimized = true;
assert.equal(object.element.getAttribute("data-block-minimized"), "true", "minimize state must be exposed to CSS");
assert.equal(object.content.getAttribute("aria-hidden"), "true", "minimized content must leave the accessibility tree");
assert.equal(object.element.style.getPropertyValue("--block-span-columns"), "2", "minimizing must preserve the configured span");
object.minimized = false;
assert.equal(object.element.getAttribute("data-block-minimized"), "false", "restoring must expose the normal state");
assert.equal(object.content.getAttribute("aria-hidden"), "false", "restoring must reveal content accessibly");
assert.throws(function () { object.span(0, 1); }, /positieve gehele/, "invalid spans must fail early");
assert.throws(function () { object.span(5, 1); }, /past niet/, "a block cannot span beyond its grid");
assert.throws(function () { object.place(0, 1); }, /positieve gehele/, "invalid positions must fail early");
assert.throws(function () { object.place(4, 2); }, /past niet/, "a placed span cannot exceed the grid edge");
local.variant = "blue";
const neighbour = local.add("<p>neighbour</p>", { id: "place-test" });
assert.equal(neighbour.variant, "blue", "an explicit system variant must apply to new blocks");
assert.throws(function () { local.variant = "not valid"; }, /Ongeldige blockvariant/, "invalid system variants must fail early");
assert.throws(function () { neighbour.place(2, 2); }, /overlapt/, "explicitly placed blocks cannot overlap");
neighbour.place(1, 1);
assert.throws(function () { local.setGrid(2, 4); }, /past niet/, "a grid cannot shrink below an existing placed span");
object.remove();
assert.doesNotThrow(function () { local.setGrid(1, 1); }, "removed blocks must release their span constraint");
assert.equal(local.columns, 1, "shrinking the grid must update readable columns");
assert.equal(local.rows, 1, "shrinking the grid must update readable rows");
assert.throws(function () { object.remove(); }, /verwijderd/, "removed blocks cannot publish duplicate remove events");
assert.throws(function () { object.menu("removed", true); }, /verwijderd/, "removed blocks cannot recreate menus");
assert.throws(function () { object.span(1, 1); }, /verwijderd/, "removed blocks cannot re-enter span state");
assert.throws(function () { object.place(1, 1); }, /verwijderd/, "removed blocks cannot re-enter position state");
assert.throws(function () { object.minimized = false; }, /verwijderd/, "removed blocks cannot change minimized state");

const dutch = createBlocksSystem({
  labels: {
    move: "bewegen",
    restore: "openen",
    minimize: "inklappen",
    close: "verwijderen"
  }
});
assert.equal(dutch.labels.close, "verwijderen", "consumers must be able to configure accessible labels");
assert.throws(function () { createBlocksSystem({ labels: { close: "" } }); }, /labels\.close mag niet leeg/, "empty accessible labels must fail early");
assert.match(source, /mode:\s*detail\.mode[\s\S]*fromIndex:[\s\S]*toIndex:[\s\S]*direction:/, "reorder events must expose one stable detail shape");

console.log("blocks.system contract — ok");
