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

assert.match(manual, /blocks\.setGrid\(6, 24\)/, "manual must use the compact 24-row grid field");
assert.equal((manual.match(/createBlocksSystem\(/g) || []).length, 2, "manual must keep its readable field plus one isolated practice field");
assert.match(manual, /manual-reader[\s\S]*manual-reset[\s\S]*manual-layout-sandbox/, "manual must restore its reading route, reset and isolated practice field");
assert.match(manual, /function lockLessonBlock[\s\S]*dataset\.manualKind = protectedBlock \? "lesson"/, "manual must protect explanation and code blocks");
assert.match(manual, /function chance\([\s\S]*small/, "chance examples must retain visible labels");
assert.doesNotMatch(manual, /manual-matrix/, "manual must not restore the five-column lesson matrix");

assert.match(reference, /blocks\.setGrid\(6, 47\)/, "reference must use the wide, linear lookup field");
assert.doesNotMatch(reference, /reference-matrix|REFERENCE_COLUMNS|setFocusedColumn|reference-axis/, "reference must not compress contracts into a colour matrix");
assert.match(apiHtml, /class="reference-index"/, "reference must expose a direct linear lookup index");
assert.doesNotMatch(apiHtml, /reference-map|reference-focus/, "reference masthead must not contain matrix controls");
assert.doesNotMatch(css, /\.manual-matrix|\.reference-map|\.reference-axis|\.reference-focus/, "retired matrix styling must not remain active documentation code");
assert.match(css, /\.manual-reader[\s\S]*\.manual-layout-sandbox/, "functional reading and practice-field styles must remain available");

for (const entry of Object.values(content.reference)) {
  assert.doesNotMatch(entry.title, /^[A-D]\d\s*\//, `reference title must be human-readable: ${entry.title}`);
}

const count = Object.values(content).slice(1).reduce((total, section) => total + Object.keys(section).length, 0);
assert.equal(count, 52, "documentation content must contain only live visible blocks");

console.log("blocks.system docs layout — linear recovery contract passed");
