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

assert.match(manual, /blocks\.setGrid\(6, 43\)/, "manual must keep compact titlebar examples and two chance-result rows");
assert.equal((manual.match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one real library field");
assert.match(manual, /manual-reader[\s\S]*manual-reset[\s\S]*manual-layout/, "manual must retain its reading route, reset and size-position lesson");
assert.doesNotMatch(manual, /manual-layout-sandbox|sandboxBlocks|dragSpecimen/, "manual must not embed a second mini-app for lesson 04");
assert.match(manual, /function lockLessonBlock[\s\S]*dataset\.manualKind = protectedBlock \? "lesson"/, "manual must protect explanation and code blocks");
const chanceHelper = manual.match(/function chance\([\s\S]*?\n}\n/)?.[0] || "";
assert.match(chanceHelper, /padStart\(2, "0"\)/, "chance examples must retain their sober two-digit markers");
assert.doesNotMatch(chanceHelper, /small/, "chance examples must not restore redundant specimen labels");
assert.doesNotMatch(manual, /manual-matrix/, "manual must not restore the five-column lesson matrix");

assert.match(reference, /blocks\.setGrid\(6, 53\)/, "reference must use the wide, linear lookup field");
assert.doesNotMatch(reference, /reference-matrix|REFERENCE_COLUMNS|setFocusedColumn|reference-axis/, "reference must not compress contracts into a colour matrix");
assert.match(apiHtml, /class="reference-index"/, "reference must expose a direct linear lookup index");
assert.doesNotMatch(apiHtml, /reference-map|reference-focus/, "reference masthead must not contain matrix controls");
assert.doesNotMatch(css, /\.manual-matrix|\.reference-map|\.reference-axis|\.reference-focus/, "retired matrix styling must not remain active documentation code");
assert.match(css, /\.manual-reader/, "functional reading styles must remain available");
assert.doesNotMatch(css, /manual-layout-sandbox|manual-drag-status/, "retired lesson-04 sandbox styling must be removed");

for (const entry of Object.values(content.reference)) {
  assert.doesNotMatch(entry.title, /^[A-D]\d\s*\//, `reference title must be human-readable: ${entry.title}`);
}

const count = Object.values(content).slice(1).reduce((total, section) => total + Object.keys(section).length, 0);
assert.equal(count, 69, "documentation content must contain one adjustable chance lesson with twelve results");

console.log("blocks.system docs layout — linear recovery contract passed");
