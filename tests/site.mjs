import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pages = [
  "index.html",
  "docs/system.html",
  "docs/examples.html",
  "docs/api.html",
  "docs/guide.html",
  "docs/about.html",
  "examples/basic-grid/index.html",
  "examples/mixed-content/index.html",
  "examples/custom-adapter/index.html"
];

for (const page of pages) {
  const absolutePage = resolve(root, page);
  const html = await readFile(absolutePage, "utf8");
  assert.match(html, /<meta name="viewport"/, `${page} needs a viewport declaration`);
  assert.doesNotMatch(html, /\bBlocks\.System\b/, `${page} must preserve lowercase public naming`);

  const navigableHtml = html.replace(/<pre\b[\s\S]*?<\/pre>/gi, "");
  const references = [...navigableHtml.matchAll(/(?:href|src)="([^"]+)"/g)].map(function (match) { return match[1]; });
  for (const reference of references) {
    if (/^(?:https?:|data:|#)/.test(reference)) continue;
    const clean = reference.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = resolve(dirname(absolutePage), clean);
    if (!extname(target)) target = resolve(target, "index.html");
    await access(target);
  }
}

const readme = await readFile(resolve(root, "README.md"), "utf8");
const readmeNl = await readFile(resolve(root, "README_NL.md"), "utf8");
for (const apiName of ["attach", "setGrid", "snap", "draggable", "variant", "variants", "add", "registerAdapter", "menu", "span", "place", "minimized", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const boardCss = await readFile(resolve(root, "docs", "board.css"), "utf8");
const systemCss = await readFile(resolve(root, "docs", "system.css"), "utf8");
const examplesCss = await readFile(resolve(root, "docs", "examples.css"), "utf8");
const exampleCss = await readFile(resolve(root, "examples", "example.css"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const systemHtml = await readFile(resolve(root, "docs", "system.html"), "utf8");
const examplesHtml = await readFile(resolve(root, "docs", "examples.html"), "utf8");
const siteDemoFiles = [
  "demo.mjs",
  "docs/board.mjs",
  "docs/system.mjs",
  "docs/examples.mjs",
  "examples/basic-grid/demo.mjs",
  "examples/mixed-content/demo.mjs",
  "examples/custom-adapter/demo.mjs"
];
const siteDemos = Object.fromEntries(await Promise.all(siteDemoFiles.map(async function (file) {
  return [file, await readFile(resolve(root, file), "utf8")];
})));
const exampleDirectories = (await readdir(resolve(root, "examples"), { withFileTypes: true }))
  .filter(function (entry) { return entry.isDirectory(); })
  .map(function (entry) { return entry.name; })
  .sort();
const standaloneExamples = Object.fromEntries(await Promise.all(exampleDirectories.map(async function (example) {
  return [example, await readFile(resolve(root, "examples", example, "index.html"), "utf8")];
})));

assert.equal(manifest.version, packageData.version, "manifest and package version must match");
assert.deepEqual(manifest.examples, exampleDirectories, "manifest examples must match the filesystem");
assert.ok(["attach", "setGrid", "snap", "draggable", "variant", "variants", "add"].every(function (name) { return manifest.core_api.includes(name); }), "manifest misses the core API");

assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-field-color:\s*#e7e6e0;[^}]*--blocks-paper-color:\s*#efeee8;[^}]*--blocks-ink-color:\s*#000;/s, "the library must own the agreed out-of-the-box palette");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*--block-color:\s*var\(--blocks-ink-color\);[^}]*--block-paper-color:\s*var\(--blocks-paper-color\);[^}]*background:\s*var\(--block-paper-color\);/s, "the library must make black on warm paper the block default");
assert.doesNotMatch(siteCss, /#field \.blocks-system-object\s*\{[^}]*--block-color:/s, "the showcase must not recreate the library default");
assert.doesNotMatch(exampleCss, /\.blocks-system-object\s*\{[^}]*--block-color:/s, "examples must not recreate the library default");
assert.match(libraryCss, /\.blocks-system-menu\s*\{[^}]*min-height:\s*22px;[^}]*padding:\s*3px 7px;/s, "the menu must preserve the compact original proportions");
assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-font-family:\s*"Oswald";/s, "the original Oswald family must remain the CSS default");
assert.match(libraryCss, /\.blocks-system-menu\s*\{[^}]*font:\s*600 13px\/1 var\(--blocks-font-family\),\s*"Arial Narrow",\s*sans-serif;/s, "the menu must use the configurable font family at its original weight");
assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-gap:\s*6px;[^}]*gap:\s*var\(--blocks-gap\);/s, "blocks must preserve the original six pixel interval");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*grid-column:\s*var\(--block-column\) \/ span var\(--block-span-columns\);[^}]*grid-row:\s*var\(--block-row\) \/ span var\(--block-span-rows\);/s, "blocks must occupy explicit or automatic grid units");
assert.match(libraryCss, /\.blocks-system-content\s*\{[^}]*flex:\s*1 1 auto;[^}]*padding:\s*var\(--blocks-content-padding\);/s, "the library must own the compact original inset");
assert.match(libraryCss, /\.blocks-system-content\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*safe center;[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*contain;/s, "block content must center safely and scroll internally when needed");
assert.match(libraryCss, /data-block-minimized="true"[^}]*align-self:\s*start;[^}]*min-height:\s*0;/s, "a minimized block must override consumer minimum heights while keeping its grid area");
assert.match(libraryCss, /data-block-minimized="true"\]\s+\.blocks-system-content\s*\{[^}]*display:\s*none;/s, "a minimized block must show only its menu");
assert.doesNotMatch(libraryCss, /\b(?:animation|transition)\s*:/, "the base block stylesheet must remain separate from motion");
assert.match(libraryCss, /\.blocks-system-object:hover\s*\{[^}]*outline:\s*2px solid var\(--block-color\);[^}]*outline-offset:\s*-3px;/s, "hover must reproduce the original thicker inset line without layout shift");
for (const variant of ["inverse", "red", "green", "blue", "cyan", "magenta", "yellow"]) {
  assert.match(libraryCss, new RegExp(`data-block-variant="${variant}"`), `missing built-in ${variant} variant`);
}
assert.match(siteCss, /\.demo-layout\s*\{[^}]*746px[^}]*max-width:\s*1020px;/s, "the showcase field must preserve the original compact width rhythm");
assert.match(siteCss, /#field\s*\{[^}]*height:\s*370px;/s, "the showcase field must preserve four compact rows");
assert.match(siteCss, /@media \(max-width: 560px\)[\s\S]*--block-column:\s*auto !important;[\s\S]*--block-row:\s*auto !important;[\s\S]*--block-span-columns:\s*1 !important;[\s\S]*--block-span-rows:\s*1 !important;/, "the mobile showcase must return blocks to automatic single grid units");
assert.ok(siteDemos["demo.mjs"].includes("system.setGrid(8, 4)"), "the showcase must expose the original eight-column rhythm");
assert.ok(siteDemos["demo.mjs"].includes("canvasBlock.span(2, 1)"), "the showcase must demonstrate a wider block");
assert.ok(siteDemos["demo.mjs"].includes("customBlock.span(2, 2)"), "the showcase must demonstrate a taller block");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes('block.variant = "red"'), "the basic grid must demonstrate an explicit built-in variant");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes("block.minimized = index === 1"), "the basic grid must demonstrate a restorable minimized block");
assert.ok(["htmlBlock.place(1, 1)", "canvasBlock.place(3, 2)", "customBlock.place(7, 1)", "controlsBlock.place(5, 4)"].every(function (line) { return siteDemos["demo.mjs"].includes(line); }), "the showcase must preserve deliberate empty grid cells");
assert.match(systemHtml, /<option value="8,6" selected>8 × 6<\/option>/, "the docs prototype must start from the reference eight-by-six board");
assert.ok(siteDemos["docs/system.mjs"].includes("minimized: true"), "the docs prototype must keep its minimized navigation experiment");
assert.ok(siteDemos["docs/system.mjs"].includes("await docsSystem.mount"), "the docs prototype must demonstrate the adapter contract through the real system");
assert.match(boardCss, /\.docs-board-surface/, "one-screen docs pages must share one isolated board stylesheet");
assert.match(boardCss, /@media \(max-width: 560px\)[\s\S]*--blocks-columns:\s*1 !important;[\s\S]*grid-template-columns:\s*1fr;/, "shared docs boards must collapse to one narrow column");
assert.match(systemCss, /\.system-board/, "the system page must keep only its page-specific board rules");
assert.match(examplesCss, /\.examples-board/, "the examples page must keep only its page-specific board rules");
assert.match(examplesCss, /\.example-actions\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ span 2;/s, "example actions must remain visible beside compact route content");
assert.doesNotMatch(libraryCss, /\.docs-board-surface|\.system-board|\.examples-board/, "the reusable library stylesheet must not absorb docs page composition");
assert.doesNotMatch(examplesHtml, /<iframe\b/i, "the examples index must use live systems instead of passive iframe cards");
assert.ok(siteDemos["docs/examples.mjs"].includes("basicSystem.setGrid(2, 2)"), "the examples board must include a real basic grid");
assert.ok(siteDemos["docs/examples.mjs"].includes("mixedSystem.setGrid(3, 1)"), "the examples board must include real mixed content");
assert.ok(siteDemos["docs/examples.mjs"].includes('await adapterSystem.mount("example-counter"'), "the examples board must include a live adapter");
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.ok(siteDemos["docs/examples.mjs"].includes(`../examples/${example}/`), `the examples board must link to the ${example} standalone page`);
  assert.ok(siteDemos["docs/examples.mjs"].includes(`../examples/${example}/demo.mjs`), `the examples board must link to the ${example} source module`);
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/examples\.html"/, `${example} must return to the examples learning path`);
  assert.match(standaloneExamples[example], /href="demo\.mjs" download/, `${example} must offer its copyable module explicitly`);
}
assert.equal((siteDemos["docs/examples.mjs"].match(/demo\.mjs" download/g) || []).length, 3, "each examples route must explicitly download its local source module");

const combinedDemos = Object.values(siteDemos).join("\n");
for (const color of [
  "[255, 0, 0]",
  "[0, 255, 0]",
  "[0, 0, 255]",
  "[0, 255, 255]",
  "[255, 0, 255]",
  "[255, 255, 0]"
]) {
  assert.ok(combinedDemos.includes(color), `site palette misses ${color}`);
}
assert.doesNotMatch(combinedDemos, /#(?:ef3e36|2155ff|d600bc|008c55)\b/i, "site demos must use the pure RGB/CMY palette");

console.log(`blocks.system site — ok (${pages.length} pages, ${exampleDirectories.length} examples)`);
