import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReferenceFallback } from "../tools/render-reference-fallback.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [homeHtml, manualHtml, apiHtml, manual, reference, sections, css, libraryCss, contentText] = await Promise.all([
  read("index.html"),
  read("docs/index.html"),
  read("docs/api.html"),
  read("docs/manual.mjs"),
  read("docs/reference.mjs"),
  read("docs/reference-sections.mjs"),
  read("docs/style.css"),
  read("blocks.system.css"),
  read("docs/content.json")
]);
const content = JSON.parse(contentText);

for (const [label, html, current] of [
  ["home", homeHtml, "home"],
  ["manual", manualHtml, "manual"],
  ["reference", apiHtml, "reference"]
]) {
  assert.match(html, /<meta name="viewport"/, label + " needs a viewport declaration");
  assert.match(html, /<nav id="navbar"/, label + " needs the shared navigation");
  assert.match(html, new RegExp('aria-current="page">\\s*' + current), label + " needs its current navigation state");
  assert.match(html, /style\.css\?v=0\.2\.36/, label + " must load the current docs stylesheet");
}

assert.match(homeHtml, /id="home-board"/, "home keeps its live proof field");
assert.match(manualHtml, /class="docs-chapters"/, "manual keeps its direct lesson index");
assert.match(manualHtml, /manual-reader[\s\S]*manual-field/, "manual must retain a continuous reading route before the interactive field");
assert.match(manualHtml, /id="manual-reset"/, "manual must retain its recovery action");
assert.doesNotMatch(manualHtml, /manual-matrix/, "manual must not restore the dense lesson matrix");
assert.match(manual, /blocks\.setGrid\(6, 43\)/, "manual must keep compact titlebar examples and two chance-result rows before chapter 08");
assert.equal((manual.match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one real library field");
assert.match(manual, /manual-reader[\s\S]*manual-layout/, "manual code must retain the reading route and size-position lesson");
assert.doesNotMatch(manual, /manual-layout-sandbox|sandboxBlocks|dragSpecimen/, "manual must not embed a second mini-app for lesson 04");
assert.doesNotMatch(manual, /manual-matrix/, "manual code must not reintroduce the matrix composition");
for (const anchor of ["eli10", "start", "content", "menu", "dragging", "appearance", "colors", "chance", "next"]) {
  assert.ok(manual.includes('"' + anchor + '"'), "manual misses #" + anchor);
}
assert.match(manual, /manual-content-html-code[\s\S]*manual-content-object-code[\s\S]*manual-content-factory-code/, "manual must keep the three focused content examples");
assert.match(manual, /manual-random-controls/, "manual must keep the adjustable chance controls");
assert.match(manual, /manual-random-mix-12/, "manual must keep all twelve results of the adjustable chance example");

assert.match(apiHtml, /class="reference-index"/, "reference needs a direct lookup index");
assert.doesNotMatch(apiHtml, /reference-map|reference-focus/, "reference masthead must not contain matrix controls");
assert.match(reference, /blocks\.setGrid\(6, 53\)/, "reference must use the wide linear field");
assert.equal((reference.match(/createBlocksSystem\(/g) || []).length, 1, "reference must use one shared lookup field");
assert.doesNotMatch(reference + sections, /reference-matrix|REFERENCE_COLUMNS|reference-axis|setFocusedColumn/, "reference must not compress contracts into a matrix");
for (const id of Object.keys(content.reference)) {
  assert.ok(sections.includes('"' + id + '"'), "reference section topology misses " + id);
}
for (const entry of Object.values(content.reference)) {
  assert.doesNotMatch(entry.title, /^[A-D]\d\s*\//, "reference title must be human-readable: " + entry.title);
}
for (const anchor of ["exports", "options", "system-state", "system-methods", "block-controller", "add-options", "adapters", "adapter-methods", "reorder-event", "css-hooks", "errors"]) {
  assert.ok(sections.includes('"' + anchor + '"'), "reference section topology misses #" + anchor);
}

const serializedReference = JSON.stringify(content.reference);
for (const apiName of [
  "createBlocksSystem(options?)", "add(content, options?)", "describe(options?)",
  "registerAdapter(id, adapter, options?)", "address(id)", "mount(id, target, overrides?)",
  "blocks:reorder", "blocks:change"
]) assert.ok(serializedReference.includes(apiName), "reference content misses " + apiName);
assert.match(serializedReference, /definition\.url[\s\S]*address\(\) prefers it/, "reference must retain the new per-block address contract");
assert.match(serializedReference, /adapter \\"html\\"[\s\S]*trusted definition\.markup/, "reference must retain the built-in html adapter contract");

const count = Object.values(content).slice(1).reduce((total, section) => total + Object.keys(section).length, 0);
assert.equal(count, 69, "content must keep one adjustable chance lesson with twelve results");
assert.equal(await read("docs/reference-fallback.html"), renderReferenceFallback(content), "the no-JavaScript reference must be generated from the same content");
assert.match(css, /\.manual-board\s*\{\s*--blocks-columns:\s*6;/, "manual desktop field must keep six columns");
assert.match(css, /\.reference-board\s*\{\s*--blocks-columns:\s*6;/, "reference desktop field must keep six columns");
assert.match(css, /\.manual-reader/, "manual must retain functional reader styles");
assert.doesNotMatch(css, /manual-layout-sandbox|manual-drag-status/, "retired lesson-04 sandbox styling must be removed");
assert.doesNotMatch(css, /manual-next-links/, "the Swiss closing block must not retain examples-link styling");
assert.doesNotMatch(css, /manual-next-block \.manual-result/, "the Swiss closing block must not inherit the old result-card typography");
assert.doesNotMatch(css, /\.manual-matrix|\.reference-map|\.reference-axis|\.reference-focus/, "matrix styling must not remain active");
assert.doesNotMatch(libraryCss, /\.(?:manual|reference)-/, "the library stylesheet must not absorb docs composition");
await access(resolve(root, "docs", "img", "pexels-peter-dyllong-2158803154-37352130.jpg"));

console.log("blocks.system site presentation — linear docs composition OK");
