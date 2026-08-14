import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReferenceFallback } from "../tools/render-reference-fallback.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const [homeHtml, manualHtml, apiHtml, manual, eli10, reference, sections, css, libraryCss, contentText] = await Promise.all([
  read("index.html"),
  read("docs/index.html"),
  read("docs/api.html"),
  read("docs/manual.mjs"),
  read("docs/eli10-schema.mjs"),
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
  assert.match(html, /style\.css\?v=0\.2\.45/, label + " must load the current docs stylesheet");
}

assert.match(homeHtml, /id="home-board"/, "home keeps its live proof field");
assert.doesNotMatch(manualHtml, /class="docs-chapters"/, "manual masthead must not repeat the lesson sequence as a TOC");
assert.doesNotMatch(manualHtml, /id="manual-convention"/, "manual masthead must not explain the visible lesson flow twice");
assert.match(manualHtml, /manual-reader[\s\S]*manual-field/, "manual must retain a continuous reading route before the interactive field");
assert.doesNotMatch(manualHtml, /id="manual-reset"/, "manual must not duplicate the reset block in its masthead");
assert.match(manual, /manual-reset-block[\s\S]*resetControl/, "manual must retain its recovery action in the field");
assert.doesNotMatch(manualHtml, /manual-matrix/, "manual must not restore the dense lesson matrix");
assert.match(manual, /blocks\.setGrid\(6, 48\)/, "manual must keep the compact ASCII row, base-color lesson and two chance-result rows before chapter 09");
assert.equal((manual.match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one real library field");
assert.match(manual, /manual-reader[\s\S]*manual-layout/, "manual code must retain the reading route and size-position lesson");
assert.doesNotMatch(manual, /manual-layout-sandbox|sandboxBlocks|dragSpecimen/, "manual must not embed a second mini-app for lesson 04");
assert.doesNotMatch(manual, /manual-matrix/, "manual code must not reintroduce the matrix composition");
for (const anchor of ["eli10", "start", "content", "menu", "dragging", "base-colors", "appearance", "colors", "chance", "next"]) {
  assert.ok(manual.includes('"' + anchor + '"'), "manual misses #" + anchor);
}
assert.match(manual, /manual-content-html-code[\s\S]*manual-content-object-code[\s\S]*manual-content-factory-code[\s\S]*manual-content-waves-code/, "manual must keep the four focused content examples");
assert.match(manual, /manual-random-controls/, "manual must keep the adjustable chance controls");
assert.match(manual, /manual-random-mix-12/, "manual must keep all twelve results of the adjustable chance example");

assert.doesNotMatch(apiHtml, /class="reference-index"/, "reference masthead must not repeat the thematic sequence as a TOC");
assert.doesNotMatch(apiHtml, /class="reference-introduction"/, "reference masthead must not explain the visible learning route twice");
assert.doesNotMatch(apiHtml, /reference-map|reference-focus/, "reference masthead must not contain matrix controls");
assert.doesNotMatch(css, /\.docs-masthead\s*\{[^}]*border-bottom/, "manual and reference mastheads must not draw a horizontal rule below their titles");
assert.match(reference, /blocks\.setGrid\(6, 79\)/, "reference must use the wide thematic field without internal table scrolling");
assert.equal((reference.match(/createBlocksSystem\(/g) || []).length, 1, "reference must use one shared lookup field");
assert.doesNotMatch(reference + sections, /reference-matrix|REFERENCE_COLUMNS|reference-axis|setFocusedColumn/, "reference must not compress contracts into a matrix");
for (const id of Object.keys(content.reference)) {
  assert.ok(sections.includes('"' + id + '"'), "reference section topology misses " + id);
}
for (const entry of Object.values(content.reference)) {
  assert.doesNotMatch(entry.title, /^[A-D]\d\s*\//, "reference title must be human-readable: " + entry.title);
}
for (const anchor of [
  "exports", "options", "container", "system-methods", "grid", "system-state", "blocks", "add-options",
  "block-layout", "block-methods", "content", "titlebar-controls", "dragging", "reorder-event",
  "appearance", "colors", "chance", "block-controller", "adapters", "adapter-methods", "field-dom", "css-hooks", "errors"
]) {
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
assert.equal(count, 82, "content must keep the thematic reference, vanilla.waves row, two layout invitations, base-color lesson and one adjustable chance lesson");
const cssToken = (source, name) => source.match(new RegExp(name + ":\\s*(#[0-9a-f]+)", "i"))?.[1].toLowerCase() ?? null;
assert.equal(cssToken(css, "--system-field"), cssToken(libraryCss, "--blocks-field-color"), "the home field must define the shared library and documentation field color");
assert.equal(cssToken(css, "--system-paper"), cssToken(libraryCss, "--blocks-paper-color"), "the home blocks must define the shared library and documentation paper color");
assert.doesNotMatch(css, /--home-field|--docs-field|--docs-paper/, "home and documentation must not keep separate color standards");
assert.match(eli10, /const PAPER = "#efeee8";/, "ELI10 must use the standard home and library paper color");
assert.match(eli10, /const FIELD = "#e7e6e0";/, "ELI10 must use the standard home and library field color");
assert.doesNotMatch(eli10, /#f5f5f2|#d9d8d2/, "ELI10 must not keep retired page-specific colors");
assert.equal(await read("docs/reference-fallback.html"), renderReferenceFallback(content), "the no-JavaScript reference must be generated from the same content");
assert.match(css, /\.manual-board\s*\{\s*--blocks-columns:\s*6;/, "manual desktop field must keep six columns");
assert.match(css, /\.reference-board\s*\{\s*--blocks-columns:\s*6;/, "reference desktop field must keep six columns");
assert.match(css, /\.manual-reader/, "manual must retain functional reader styles");
assert.doesNotMatch(css, /manual-layout-sandbox|manual-drag-status/, "retired lesson-04 sandbox styling must be removed");
assert.doesNotMatch(css, /manual-next-links/, "the Swiss closing block must not retain examples-link styling");
assert.doesNotMatch(css, /manual-next-block \.manual-result/, "the Swiss closing block must not inherit the old result-card typography");
assert.doesNotMatch(css, /\.manual-matrix|\.reference-map|\.reference-axis|\.reference-focus/, "matrix styling must not remain active");
assert.doesNotMatch(libraryCss, /\.(?:manual|reference)-/, "the library stylesheet must not absorb docs composition");
await access(resolve(root, "docs", "img", "skatepark.jpg"));

console.log("blocks.system site presentation — linear docs composition OK");
