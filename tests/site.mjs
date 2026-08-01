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
for (const apiName of ["attach", "setGrid", "snap", "draggable", "add", "registerAdapter", "menu", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const exampleCss = await readFile(resolve(root, "examples", "example.css"), "utf8");
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

assert.match(siteCss, /#field \.blocks-system-object\s*\{[^}]*--block-color:\s*#000;/s, "showcase blocks must default to black");
assert.match(exampleCss, /\.blocks-system-object\s*\{[^}]*--block-color:\s*#000;/s, "example blocks must default to black");

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
