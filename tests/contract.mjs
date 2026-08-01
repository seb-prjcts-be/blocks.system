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
assert.ok(["attach", "setGrid", "add", "register", "registerAdapter", "mount", "unmount"]
  .every(function (name) { return typeof singleton[name] === "function"; }), "the approved public API is incomplete");
assert.equal(singleton.snap, false, "snap must be disabled by default");
assert.equal(singleton.draggable, false, "dragging must be disabled by default");

const minUrl = pathToFileURL(minPath);
minUrl.searchParams.set("parity", Date.now());
const { system: minSingleton } = await import(minUrl.href);
assert.deepEqual(Object.keys(minSingleton).sort(), Object.keys(singleton).sort(), "source and minified API must match");
assert.ok(minified.length < source.length, "the minified module must be smaller than the source");

const local = createBlocksSystem({ catalogUrl: "https://example.test/catalog.html" });
local.registerAdapter("html", {
  mount() {},
  snippet({ block }) { return block.markup; }
});
local.register({
  id: "plain-html",
  label: "plain html",
  adapter: "html",
  medium: "html",
  markup: "<p>test</p>"
});

assert.equal(local.get("plain-html").markup, "<p>test</p>", "free block data must be preserved");
assert.deepEqual(local.listAdapters(), ["html"], "custom adapters must be registerable");
assert.equal(local.list({ medium: "html" }).length, 1, "content type must be filterable");
assert.equal(local.address("plain-html"), "https://example.test/catalog.html?block=plain-html", "addresses use the block parameter");
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
    this.parentElement = null;
    this.style = new TestStyle();
  }
  addEventListener() {}
  removeEventListener() {}
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  removeAttribute(name) { this.attributes.delete(name); }
  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }
  insertBefore(child, reference) {
    const currentIndex = this.children.indexOf(child);
    if (currentIndex >= 0) this.children.splice(currentIndex, 1);
    const referenceIndex = reference ? this.children.indexOf(reference) : -1;
    child.parentElement = this;
    this.children.splice(referenceIndex >= 0 ? referenceIndex : this.children.length, 0, child);
    return child;
  }
  remove() {
    if (!this.parentElement) return;
    const index = this.parentElement.children.indexOf(this);
    if (index >= 0) this.parentElement.children.splice(index, 1);
    this.parentElement = null;
  }
}

globalThis.Element = TestElement;
globalThis.document = {
  createElement() { return new TestElement(); },
  querySelector() { return null; }
};

const field = new TestElement();
local.attach(field);
local.setGrid(4, 4);
const object = local.add("<p>span</p>", { id: "span-test" });
assert.equal(typeof object.span, "function", "every block must expose span(x, y)");
assert.equal(object.span(2, 1), object, "span must remain chainable");
assert.equal(object.element.style.getPropertyValue("--block-span-columns"), "2", "span x must set whole column units");
assert.equal(object.element.style.getPropertyValue("--block-span-rows"), "1", "span y must set whole row units");
assert.throws(function () { object.span(0, 1); }, /positieve gehele/, "invalid spans must fail early");
assert.throws(function () { object.span(5, 1); }, /past niet/, "a block cannot span beyond its grid");
assert.throws(function () { local.setGrid(1, 4); }, /te klein/, "a grid cannot shrink below an existing span");
object.remove();
assert.doesNotThrow(function () { local.setGrid(1, 1); }, "removed blocks must release their span constraint");
assert.throws(function () { object.span(1, 1); }, /verwijderd/, "removed blocks cannot re-enter span state");

console.log("blocks.system contract — ok");
