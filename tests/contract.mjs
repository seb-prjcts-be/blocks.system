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

console.log("blocks.system contract — ok");
