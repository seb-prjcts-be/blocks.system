import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const manual = await read("docs/manual.mjs");
const reference = await read("docs/reference.mjs");
const apiHtml = await read("docs/api.html");
const css = await read("docs/style.css");
const content = JSON.parse(await read("docs/content.json"));

assert.match(manual, /blocks\.setGrid\(6, 48\)/, "manual must keep the compact ASCII row, base-color lesson and two chance-result rows");
assert.equal((manual.match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one real library field");
assert.match(manual, /manual-reader[\s\S]*manual-reset-block[\s\S]*manual-layout/, "manual must retain its reading route, reset block and size-position lesson");
assert.doesNotMatch(manual, /manual-layout-sandbox|sandboxBlocks|dragSpecimen/, "manual must not embed a second mini-app for lesson 04");
assert.doesNotMatch(manual, /lockLessonBlock|protectedBlock|manualKind/, "manual must use the public library interaction instead of private locks");
assert.match(manual, /draggable: false/, "manual must demonstrate one explicit per-block drag exception");
const chanceHelper = manual.match(/function chance\([\s\S]*?\n}\n/)?.[0] || "";
assert.match(chanceHelper, /padStart\(2, "0"\)/, "chance examples must retain their sober two-digit markers");
assert.doesNotMatch(chanceHelper, /small/, "chance examples must not restore redundant specimen labels");
assert.doesNotMatch(manual, /manual-matrix/, "manual must not restore the five-column lesson matrix");

assert.match(reference, /blocks\.setGrid\(6, 84\)/, "reference must use the wide thematic lookup field without internal table scrolling");
assert.doesNotMatch(reference, /reference-matrix|REFERENCE_COLUMNS|setFocusedColumn|reference-axis/, "reference must not compress contracts into a colour matrix");
assert.doesNotMatch(apiHtml, /class="reference-index"/, "reference masthead must not repeat the thematic sequence as a TOC");
assert.doesNotMatch(apiHtml, /reference-map|reference-focus/, "reference masthead must not contain matrix controls");
assert.doesNotMatch(css, /\.manual-matrix|\.reference-map|\.reference-axis|\.reference-focus/, "retired matrix styling must not remain active documentation code");
assert.match(css, /\.manual-reader/, "functional reading styles must remain available");
assert.doesNotMatch(css, /manual-layout-sandbox|manual-drag-status/, "retired lesson-04 sandbox styling must be removed");

for (const entry of Object.values(content.reference)) {
  assert.doesNotMatch(entry.title, /^[A-D]\d\s*\//, `reference title must be human-readable: ${entry.title}`);
}

const referenceOrder = [
  "reference-system-create", "reference-container", "reference-grid", "reference-block-create",
  "reference-block-layout", "reference-content", "reference-titlebar", "reference-dragging",
  "reference-appearance", "reference-color", "reference-chance", "reference-block-controller",
  "reference-definition-create", "reference-adapter-methods", "reference-field-signals", "reference-system-errors"
];
assert.deepEqual(Object.keys(content.reference), referenceOrder, "reference content must follow the same setup-to-block-to-appearance route as the manual");

const count = Object.values(content).slice(1).reduce((total, section) => total + Object.keys(section).length, 0);
assert.equal(count, 83, "documentation content must contain the thematic reference, vanilla.waves row, both drag specimens, two layout invitations, base-color lesson and one adjustable chance lesson");

console.log("blocks.system docs layout — linear recovery contract passed");
