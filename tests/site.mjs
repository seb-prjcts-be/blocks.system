import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pages = [
  "index.html",
  "docs/index.html",
  "docs/system.html",
  "docs/examples.html",
  "docs/api.html",
  "docs/guide.html",
  "docs/guide-blocks.html",
  "docs/guide-finish.html",
  "docs/about.html",
  "docs/manual.html",
  "examples/index.html",
  "examples/basic-grid/index.html",
  "examples/mixed-content/index.html",
  "examples/custom-adapter/index.html"
];

async function read(path) {
  return readFile(resolve(root, path), "utf8");
}

const pageHtml = Object.fromEntries(await Promise.all(pages.map(async (page) => [page, await read(page)])));
for (const [page, html] of Object.entries(pageHtml)) {
  assert.match(html, /<meta name="viewport"/, `${page} needs a viewport declaration`);
  assert.doesNotMatch(html, /\bBlocks\.System\b/, `${page} must preserve lowercase public naming`);

  const navigableHtml = html.replace(/<pre\b[\s\S]*?<\/pre>/gi, "");
  const references = [...navigableHtml.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(?:https?:|data:|#)/.test(reference)) continue;
    const clean = reference.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = resolve(dirname(resolve(root, page)), clean);
    if (!extname(target)) target = resolve(target, "index.html");
    await access(target);
  }
}

const readme = await read("README.md");
const readmeNl = await read("README_NL.md");
const packageData = JSON.parse(await read("package.json"));
const docsContent = JSON.parse(await read("docs/content.json"));
const declarations = await read("blocks.system.d.ts");
const librarySource = await read("blocks.system.mjs");
const libraryCss = await read("blocks.system.css");
const siteCss = await read("docs/style.css");
const homeHtml = pageHtml["index.html"];
const manualHtml = pageHtml["docs/index.html"];
const apiHtml = pageHtml["docs/api.html"];
const exampleIndexHtml = pageHtml["examples/index.html"];
const developmentGuide = await read("docs/development.md");
const siteDemoFiles = [
  "docs/home.mjs",
  "docs/manual.mjs",
  "docs/reference.mjs",
  "docs/shell.mjs",
  "examples/basic-grid/demo.mjs",
  "examples/mixed-content/demo.mjs",
  "examples/custom-adapter/demo.mjs"
];
const siteDemos = Object.fromEntries(await Promise.all(siteDemoFiles.map(async (file) => [file, await read(file)])));
const exampleDirectories = (await readdir(resolve(root, "examples"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const standaloneExamples = Object.fromEntries(await Promise.all(exampleDirectories.map(async (example) => [
  example,
  await read(`examples/${example}/index.html`)
])));

const documentedApi = [
  "createBlocksSystem", "blockDefaults", "attach", "setGrid", "compact", "columns", "rows",
  "snap", "draggable", "variant", "variants", "colorArray", "colorVariation",
  "inversionVariation", "add", "registerAdapter", "menu", "span", "place", "flow",
  "minimized", "color"
];
for (const apiName of documentedApi) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}
for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl]]) {
  assert.match(content, /import \{ createBlocksSystem \}/, `${file} must show the configurable factory`);
  assert.doesNotMatch(content, /const\s+(?!block)[A-Za-z_$][\w$]*\s*=\s*blocks(?:\.system)?\.add\(/, `${file} must prefix returned controllers with block`);
  assert.match(content, /\[Home\]\(https:\/\/seb-prjcts-be\.github\.io\/blocks\.system\/\)/, `${file} must link to the public homepage`);
  assert.match(content, /https:\/\/seb-prjcts-be\.github\.io\/blocks\.system\/docs\/#next/, `${file} examples link must land on the example index`);
}
assert.doesNotMatch(readmeNl, /\b(?:DOM-)?node\b/i, "README_NL beginnerstaal must say object or element instead of node");

assert.equal(packageData.types, "./blocks.system.d.ts", "package metadata must expose declarations");
assert.ok(packageData.files.includes("blocks.system.d.ts"), "package files must include declarations");
assert.equal(packageData.private, true, "the package must remain private because npm is not its distribution channel");
assert.match(developmentGuide, /`private`: true[\s\S]*niet via npm publiceren/i, "development docs must explain the private npm boundary");
assert.match(developmentGuide, /GitHub-release-tag[\s\S]*jsDelivr/i, "development docs must name the public tag-and-CDN distribution channel");
assert.equal(packageData.scripts["test:presentation"], "node tests/site-presentation.mjs", "presentation locks must remain available outside the core gate");
for (const declaration of ["BlocksSystem", "BlockController", "BlocksReorderDetail", "BlocksChangeDetail", "createBlocksSystem"]) {
  assert.ok(declarations.includes(declaration), `blocks.system.d.ts misses ${declaration}`);
}
assert.match(declarations, /readonly columns:\s*number;[\s\S]*readonly rows:\s*number;/, "grid dimensions must stay read-only in TypeScript");
assert.doesNotMatch(declarations, /\bmargin\??\s*:/, "margin must remain ordinary consumer CSS, not a library setting");

const aliasTargets = {
  "manual.html": "start",
  "system.html": "start",
  "examples.html": "next",
  "guide.html": "start",
  "guide-blocks.html": "content",
  "guide-finish.html": "next",
  "about.html": "next"
};
for (const [file, anchor] of Object.entries(aliasTargets)) {
  const alias = pageHtml[`docs/${file}`];
  assert.match(alias, /rel="canonical" href="\.\/"/, `${file} must declare /docs/ canonical`);
  assert.ok(alias.includes(`location.replace(new URL("./#${anchor}"`), `${file} must replace history with #${anchor}`);
  assert.ok(alias.includes(`href="./#${anchor}"`), `${file} must retain a no-script link`);
}

const navigationPages = [
  ["home", homeHtml, "home"],
  ["manual", manualHtml, "manual"],
  ["reference", apiHtml, "reference"],
  ["examples index", exampleIndexHtml, null],
  ...Object.entries(standaloneExamples).map(([name, html]) => [`example ${name}`, html, null])
];
for (const [page, html, currentLabel] of navigationPages) {
  const navigation = html.match(/<nav id="navbar"[\s\S]*?<\/nav>/)?.[0] || "";
  const links = [...navigation.matchAll(/<li><a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((match) => ({ href: match[1], label: match[2], current: /aria-current="page"/.test(match[0]) }));
  assert.ok(navigation, `${page} must expose the shared navigation`);
  assert.deepEqual(links.map(({ label }) => label), ["home", "manual", "reference", "source"], `${page} must keep the shared menu order`);
  assert.equal(links.some(({ href }) => href.includes("#")), false, `${page} main navigation must not use fragments`);
  assert.deepEqual(links.filter(({ current }) => current).map(({ label }) => label), currentLabel ? [currentLabel] : [], `${page} must expose its real current page`);
  assert.equal((html.match(/<nav\b/g) || []).length, 1, `${page} must expose one navigation landmark`);
}
for (const [page, html, label] of [["manual", manualHtml, "manual"], ["reference", apiHtml, "reference"]]) {
  assert.match(html, /<a class="skip-link" href="#main-content">skip to /, `${page} must expose a keyboard skiplink`);
  assert.match(html, /<main id="main-content"[^>]*tabindex="-1"/, `${page} must expose a focusable skiplink target`);
  assert.match(html, new RegExp(`skip to ${label}`), `${page} skiplink must name its destination`);
}
const styleVersions = new Set(Object.entries(pageHtml)
  .filter(([page]) => page === "index.html" || page === "docs/index.html" || page === "docs/api.html" || page.startsWith("examples/"))
  .flatMap(([, html]) => [...html.matchAll(/<link rel="stylesheet" href="(?:[^"]*\/)?style\.css\?v=([\d.]+)"/g)].map((match) => match[1])));
assert.deepEqual([...styleVersions], ["0.2.14"], "one consumer stylesheet must use one cache version across all pages");
const examplesCss = siteCss.slice(siteCss.indexOf("/* Examples */"));
assert.match(examplesCss, /var\(--docs-field\)/, "example pages must use the shared docs field token");
assert.match(examplesCss, /var\(--ink\)/, "example pages must use the shared ink token");
for (const [page, html] of [["home", homeHtml], ["manual", manualHtml], ["reference", apiHtml]]) {
  assert.match(html, /class="nav-hamburger"[^>]*aria-controls="primary-navigation"/, `${page} hamburger must identify its navigation`);
  assert.match(html, /id="primary-navigation" class="nav-links"/, `${page} navigation must expose the controlled id`);
}

for (const file of ["examples/basic-grid/demo.mjs", "examples/mixed-content/demo.mjs", "examples/custom-adapter/demo.mjs"]) {
  const source = siteDemos[file];
  assert.match(source, /import \{ createBlocksSystem \}/, `${file} must import the factory`);
  assert.match(source, /blocks\.system\.mjs\?v=\d+\.\d+\.\d+/, `${file} must cache-bust the library source`);
  assert.match(source, /const blocks = createBlocksSystem\(/, `${file} must name its configured system blocks`);
  assert.match(source, /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, `${file} must expose both menu actions`);
  assert.doesNotMatch(source, /const\s+[A-Za-z_$][\w$]*Block\s*=/, `${file} must use block as a prefix`);
}
for (const example of exampleDirectories) {
  const html = standaloneExamples[example];
  assert.doesNotMatch(html, /href="demo\.mjs" download/, `${example} must not offer a module download that cannot run on its own`);
  assert.match(html, /href="\.\.\/\.\.\/docs\/">← manual<\/a>/, `${example} must return to the manual`);
  assert.match(html, /src="\.\.\/\.\.\/docs\/shell\.mjs\?v=\d+\.\d+\.\d+/, `${example} must load cache-busted shared navigation behavior`);
}
const customAdapterSource = siteDemos["examples/custom-adapter/demo.mjs"];
assert.match(customAdapterSource, /snippet\(\{ settings \}\)[\s\S]*document\.createElement\("button"\)[\s\S]*button\.textContent[\s\S]*return button\.outerHTML/, "custom adapter snippets must serialize text through a DOM element");
assert.doesNotMatch(customAdapterSource, /return\s+`<button>[\s\S]*\$\{settings\./, "custom adapter snippets must not interpolate settings directly into HTML");

const retiredAssets = [
  "demo.mjs", "docs/board.mjs", "docs/board.css", "docs/system.mjs", "docs/system.css",
  "docs/examples.mjs", "docs/examples.css", "docs/nav.mjs", "docs/home.css", "docs/manual.css",
  "docs/reference.css", "examples/example.css", "docs/references/micrographic-drag-snap-reference.png"
];
for (const file of retiredAssets) {
  await assert.rejects(access(resolve(root, file)), { code: "ENOENT" }, `${file} must remain retired`);
}

assert.equal(docsContent.schema, "blocks.system/docs-content@2", "docs content must publish its schema");
assert.deepEqual(Object.keys(docsContent), ["schema", "home", "manual", "reference"], "docs content must expose canonical sections only");
const sectionModules = { home: "docs/home.mjs", manual: "docs/manual.mjs", reference: "docs/reference.mjs" };
for (const [sectionName, moduleName] of Object.entries(sectionModules)) {
  const section = docsContent[sectionName];
  assert.match(siteDemos[moduleName], new RegExp(`loadDocsContent\\("${sectionName}"`), `${moduleName} must load canonical ${sectionName} content`);
  for (const [id, block] of Object.entries(section)) {
    assert.equal(typeof block.title, "string", `${sectionName}.${id} needs a visible title`);
    assert.ok(block.title.length > 0, `${sectionName}.${id} title must not be empty`);
    assert.ok(siteDemos[moduleName].includes(`"${id}"`), `${moduleName} misses content block ${id}`);
  }
}
const docsContentKeys = new Set();
JSON.stringify(docsContent, (key, value) => {
  if (key) docsContentKeys.add(key);
  return value;
});
for (const forbiddenKey of ["adapter", "anchor", "class", "className", "defaults", "html", "lifecycle", "minimized", "renderer", "span", "variant"]) {
  assert.equal(docsContentKeys.has(forbiddenKey), false, `docs content must not own ${forbiddenKey}`);
}
assert.match(siteDemos["docs/shell.mjs"], /content\.json\?v=\d+\.\d+\.\d+/, "docs content must use a cache-busted request");
assert.match(siteDemos["docs/shell.mjs"], /Missing \$\{sectionName\} content[\s\S]*Unused \$\{sectionName\} content/, "docs loader must reject missing and unused content");
assert.match(siteDemos["docs/shell.mjs"], /function setNavigationOpen\(open/, "shared shell must own mobile navigation state");
assert.match(siteDemos["docs/shell.mjs"], /event\.key !== "Escape"/, "mobile navigation must close with Escape");

assert.equal((siteDemos["docs/home.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "home must use one system");
assert.equal((siteDemos["docs/home.mjs"].match(/blocks\.add\(/g) || []).length, 3, "home must contain three functional blocks");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one system");
assert.match(siteDemos["docs/manual.mjs"], /createElement\("h2"\)/, "manual chapters must expose real h2 headings for assistive navigation");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /ResizeObserver|MutationObserver|registerAdapter|document\.createElement\("video"\)/, "advanced lifecycle examples must stay outside the beginner route");
for (const anchor of ["eli10", "start", "content", "menu", "layout", "compact", "appearance", "colors", "chance", "next"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes(`anchor: "${anchor}"`), `manual misses #${anchor}`);
}
const manualCopy = JSON.stringify(docsContent.manual).toLowerCase();
assert.doesNotMatch(manualCopy, /same object/, "manual copy must speak about the reader's content, not its own test fixture");
assert.ok((manualCopy.match(/\byour\b/g) || []).length >= 15, "manual copy must repeatedly address the reader where appearance varies");
for (const anchor of ["exports", "options", "system-state", "system-methods", "block-controller", "add-options", "adapters", "reorder-event", "css-hooks", "errors"]) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(`anchor: "${anchor}"`), `reference misses #${anchor}`);
}

const serializedReference = JSON.stringify(docsContent.reference);
for (const apiName of [
  "createBlocksSystem(options?)", "system", "attach(target)", "setGrid(columns, rows)", "compact()",
  "columns", "rows", "draggable", "labels", "colorArray", "colorVariation", "inversionVariation",
  "add(content, options?)", "menu(name, options?)", "span(columns, rows)", "place(column, row)",
  "flow()", "registerAdapter(id, adapter, options?)", "mount(id, target, overrides?)",
  "unmount(target)", "address(id)", "blocks:reorder", "blocks:change"
]) {
  assert.ok(serializedReference.includes(apiName), `reference misses ${apiName}`);
}
assert.match(serializedReference, /columns[\s\S]*readonly number[\s\S]*rows[\s\S]*may also grow after dragging/i, "reference must explain readable grid dimensions");
assert.match(serializedReference, /Do not call element\.remove\(\); use remove\(\)/, "reference must prevent direct DOM removal that leaves a stale layout");
assert.match(serializedReference, /snap true[\s\S]*place\(\)[\s\S]*span\(\)[\s\S]*compact\(\)[\s\S]*visual grid layout/i, "reference must explain snap-dependent layout");
assert.match(serializedReference, /Never pass untrusted text as HTML[\s\S]*textContent/i, "reference must warn about trusted string HTML");

const mainCdnBase = "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.2.0";
const manualStartContent = JSON.stringify(docsContent.manual["manual-start"]);
const manualPinsRelease = new RegExp(`blocks\\.system@v${packageData.version}\\b`).test(manualStartContent);
const documentsMainOnlyApi = /\bcompact\b/.test(JSON.stringify({
  manual: docsContent.manual,
  reference: docsContent.reference
}));
const referencePinsRelease = apiHtml.includes(`reference · v${packageData.version}`);
assert.ok(manualPinsRelease && documentsMainOnlyApi, "the tagged manual must document the APIs included in its release");
assert.ok(referencePinsRelease, "the reference must expose its released source ref");
assert.deepEqual(packageData.exports["."], {
  types: "./blocks.system.d.ts",
  default: "./blocks.system.mjs"
}, "the root package export must resolve runtime and declarations together");
assert.deepEqual(packageData.exports["./min"], {
  types: "./blocks.system.d.ts",
  default: "./blocks.system.min.mjs"
}, "the minified package export must resolve the same declarations");
assert.equal(packageData.exports["./style"], "./blocks.system.css", "the stylesheet package export must remain stable");
assert.ok(docsContent.manual["manual-start"].intro.includes("released v0.2.0 build"), "manual must label its immutable source ref");
assert.ok(docsContent.manual["manual-start"].code.includes(`<link rel="stylesheet" href="${mainCdnBase}/blocks.system.css">`), "manual must load the tagged stylesheet");
assert.ok(docsContent.manual["manual-start"].code.includes(`import { createBlocksSystem } from "${mainCdnBase}/blocks.system.mjs";`), "manual must load the tagged module");
assert.doesNotMatch(JSON.stringify(Object.values(docsContent.manual)), /\b(?:DOM node|Node|node)\b/, "beginner copy must say object instead of node");

assert.doesNotMatch(libraryCss, /\.(?:home|manual|reference)-/, "library CSS must not own docs composition");
assert.doesNotMatch(libraryCss, /\b(?:animation|transition)\s*:/, "base CSS must remain separate from motion");
assert.doesNotMatch(libraryCss, /data-block-variant="(?:red|green|blue|cyan|magenta|yellow)"/, "library CSS must not own an RGB or CMY palette");
assert.match(librarySource, /new CustomEvent\("blocks:reorder"/, "core must expose reorder events");
assert.match(siteCss, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto/, "site motion must respect reduced motion");

const pureBlockColor = /(?:#(?:ff0000|00ff00|0000ff|00ffff|ff00ff|ffff00)|rgb\(\s*(?:255\s*,\s*0\s*,\s*0|0\s*,\s*255\s*,\s*0|0\s*,\s*0\s*,\s*255|0\s*,\s*255\s*,\s*255|255\s*,\s*0\s*,\s*255|255\s*,\s*255\s*,\s*0)\s*\))/i;
for (const [owner, source] of [
  ["consumer CSS", siteCss],
  ["manual composition", siteDemos["docs/manual.mjs"]],
  ["mixed-content canvas", siteDemos["examples/mixed-content/demo.mjs"]]
]) {
  assert.doesNotMatch(source, pureBlockColor, `${owner} must keep rendered content neutral`);
}

console.log(`blocks.system site structure — ok (${pages.length} pages, ${exampleDirectories.length} examples)`);
