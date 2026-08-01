import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pages = [
  "index.html",
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
for (const apiName of ["attach", "setGrid", "snap", "draggable", "add", "registerAdapter", "menu", "span", "place", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const exampleCss = await readFile(resolve(root, "examples", "example.css"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const siteDemos = await Promise.all([
  "demo.mjs",
  "examples/basic-grid/demo.mjs",
  "examples/mixed-content/demo.mjs",
  "examples/custom-adapter/demo.mjs"
].map(function (file) { return readFile(resolve(root, file), "utf8"); }));
const exampleDirectories = (await readdir(resolve(root, "examples"), { withFileTypes: true }))
  .filter(function (entry) { return entry.isDirectory(); })
  .map(function (entry) { return entry.name; })
  .sort();

assert.equal(manifest.version, packageData.version, "manifest and package version must match");
assert.deepEqual(manifest.examples, exampleDirectories, "manifest examples must match the filesystem");
assert.ok(["attach", "setGrid", "snap", "draggable", "add"].every(function (name) { return manifest.core_api.includes(name); }), "manifest misses the core API");

assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-field-color:\s*#e7e6e0;[^}]*--blocks-paper-color:\s*#efeee8;[^}]*--blocks-ink-color:\s*#000;/s, "the library must own the agreed out-of-the-box palette");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*--block-color:\s*var\(--blocks-ink-color\);[^}]*background:\s*var\(--blocks-paper-color\);/s, "the library must make black on warm paper the block default");
assert.doesNotMatch(siteCss, /#field \.blocks-system-object\s*\{[^}]*--block-color:/s, "the showcase must not recreate the library default");
assert.doesNotMatch(exampleCss, /\.blocks-system-object\s*\{[^}]*--block-color:/s, "examples must not recreate the library default");
assert.match(libraryCss, /\.blocks-system-menu\s*\{[^}]*min-height:\s*22px;[^}]*padding:\s*3px 7px;/s, "the menu must preserve the compact original proportions");
assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-gap:\s*6px;[^}]*gap:\s*var\(--blocks-gap\);/s, "blocks must preserve the original six pixel interval");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*grid-column:\s*var\(--block-column\) \/ span var\(--block-span-columns\);[^}]*grid-row:\s*var\(--block-row\) \/ span var\(--block-span-rows\);/s, "blocks must occupy explicit or automatic grid units");
assert.match(libraryCss, /\.blocks-system-content\s*\{[^}]*flex:\s*1 1 auto;[^}]*padding:\s*var\(--blocks-content-padding\);/s, "the library must own the compact original inset");
assert.match(siteCss, /\.demo-layout\s*\{[^}]*746px[^}]*max-width:\s*1020px;/s, "the showcase field must preserve the original compact width rhythm");
assert.match(siteCss, /#field\s*\{[^}]*height:\s*370px;/s, "the showcase field must preserve four compact rows");
assert.match(siteCss, /@media \(max-width: 560px\)[\s\S]*--block-column:\s*auto !important;[\s\S]*--block-row:\s*auto !important;[\s\S]*--block-span-columns:\s*1 !important;[\s\S]*--block-span-rows:\s*1 !important;/, "the mobile showcase must return blocks to automatic single grid units");
assert.ok(siteDemos[0].includes("system.setGrid(8, 4)"), "the showcase must expose the original eight-column rhythm");
assert.ok(siteDemos[0].includes("canvasBlock.span(2, 1)"), "the showcase must demonstrate a wider block");
assert.ok(siteDemos[0].includes("customBlock.span(2, 2)"), "the showcase must demonstrate a taller block");
assert.ok(["htmlBlock.place(1, 1)", "canvasBlock.place(3, 2)", "customBlock.place(7, 1)", "controlsBlock.place(5, 4)"].every(function (line) { return siteDemos[0].includes(line); }), "the showcase must preserve deliberate empty grid cells");

const combinedDemos = siteDemos.join("\n");
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
