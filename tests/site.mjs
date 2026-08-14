import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderReferenceFallback } from "../tools/render-reference-fallback.mjs";
import { DOCS_RELEASE } from "../docs/release.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const pages = [
  "index.html",
  "docs/index.html",
  "docs/system.html",
  "docs/examples.html",
  "docs/api.html",
  "docs/reference-fallback.html",
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
const packageLockData = JSON.parse(await read("package-lock.json"));
const docsContent = JSON.parse(await read("docs/content.json"));
assert.equal(pageHtml["docs/reference-fallback.html"], renderReferenceFallback(docsContent), "the no-JavaScript reference must be generated from the canonical JSON content");
const declarations = await read("blocks.system.d.ts");
const librarySource = await read("blocks.system.mjs");
const libraryCss = await read("blocks.system.css");
const siteCss = await read("docs/style.css");
const homeHtml = pageHtml["index.html"];
const manualHtml = pageHtml["docs/index.html"];
const apiHtml = pageHtml["docs/api.html"];
const exampleIndexHtml = pageHtml["examples/index.html"];
const developmentGuide = await read("docs/development.md");
const releaseNotes = await read("docs/releases/v0.3.0.md");
const eli10Source = await read("docs/eli10-schema.mjs");
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
const referenceSectionsSource = await read("docs/reference-sections.mjs");
const exampleDirectories = (await readdir(resolve(root, "examples"), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const standaloneExamples = Object.fromEntries(await Promise.all(exampleDirectories.map(async (example) => [
  example,
  await read(`examples/${example}/index.html`)
])));

assert.deepEqual(DOCS_RELEASE, {
  sourceRef: "main",
  releaseStatus: "unreleased",
  packageVersion: "0.3.0",
  stableRef: "v0.3.0",
  nextRelease: null,
  stableCdnBase: "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.3.0"
}, "docs release metadata must distinguish the current main branch from stable v0.3.0");
assert.equal(DOCS_RELEASE.packageVersion, packageData.version, "docs metadata must reflect the current package version");
assert.equal(packageLockData.version, packageData.version, "package lock must use the release version");
assert.equal(packageLockData.packages[""].version, packageData.version, "root lock package must use the release version");
for (const contractChange of ["margin", "listAdapters()", "replace: true", "definition.url", "describe({ url })", "fully occupied grid row"]) {
  assert.ok(releaseNotes.includes(contractChange), `v0.3.0 release notes miss ${contractChange}`);
}
for (const [page, html] of [["manual", manualHtml], ["reference", apiHtml], ["examples", exampleIndexHtml]]) {
  assert.match(html, /data-docs-source-prefix/, `${page} must visibly identify its current source line`);
}

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
  assert.match(content, /https:\/\/seb-prjcts-be\.github\.io\/blocks\.system\/examples\//, `${file} examples link must land on the standalone example index`);
  assert.match(content, /block(?:Canvas|Canvas)\.place\(3, 1\)/, `${file} sequential Start and Middle snippets must not overlap`);
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
const examplesAlias = pageHtml["docs/examples.html"];
assert.match(examplesAlias, /rel="canonical" href="\.\.\/examples\/"/, "examples.html must declare the standalone examples index as canonical");
assert.ok(examplesAlias.includes('location.replace(new URL("../examples/"'), "examples.html must redirect to the standalone examples index");
assert.ok(examplesAlias.includes('href="../examples/"'), "examples.html must retain a no-script link to the standalone examples index");

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
assert.deepEqual([...styleVersions], ["0.2.42"], "one consumer stylesheet must use one cache version across all pages");
const examplesCss = siteCss.slice(siteCss.indexOf("/* Examples */"));
assert.match(examplesCss, /var\(--system-field\)/, "example pages must use the shared system field token");
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

assert.equal(docsContent.schema, "blocks.system/docs-content@3", "docs content must publish its schema");
assert.deepEqual(Object.keys(docsContent), ["schema", "home", "manual", "reference"], "docs content must expose canonical sections only");
const sectionModules = { home: "docs/home.mjs", manual: "docs/manual.mjs", reference: "docs/reference.mjs" };
for (const [sectionName, moduleName] of Object.entries(sectionModules)) {
  const section = docsContent[sectionName];
  const source = sectionName === "reference" ? siteDemos[moduleName] + "\n" + referenceSectionsSource : siteDemos[moduleName];
  assert.match(siteDemos[moduleName], new RegExp(`loadDocsContent\\("${sectionName}"`), `${moduleName} must load canonical ${sectionName} content`);
  for (const [id, block] of Object.entries(section)) {
    assert.equal(typeof block.title, "string", `${sectionName}.${id} needs a visible title`);
    assert.ok(block.title.length > 0, `${sectionName}.${id} title must not be empty`);
    assert.ok(source.includes(`"${id}"`), `${moduleName} misses content block ${id}`);
  }
}
const docsContentKeys = new Set();
JSON.stringify(docsContent, (key, value) => {
  if (key) docsContentKeys.add(key);
  return value;
});
for (const forbiddenKey of ["adapter", "anchor", "class", "className", "defaults", "html", "lifecycle", "minimized", "renderer", "variant"]) {
  assert.equal(docsContentKeys.has(forbiddenKey), false, `docs content must not own ${forbiddenKey}`);
}
assert.deepEqual(docsContent.manual["manual-start-a"].layout, { place: [3, 4], span: [4, 1] }, "manual CDN step must be four columns wide and aligned right");
assert.deepEqual(docsContent.manual["manual-start-a"].code, [
  `${DOCS_RELEASE.stableCdnBase}/blocks.system.css`,
  `${DOCS_RELEASE.stableCdnBase}/blocks.system.mjs`
], "manual CDN step must show both real tagged release URLs");
assert.deepEqual(docsContent.manual["manual-start-div"].layout, { place: [1, 5], span: [2, 1] }, "manual DIV step must own its requested proportions");
assert.deepEqual(docsContent.manual["manual-start-blocks"].layout, { place: [1, 6], span: [2, 1] }, "manual BLOCKS step must own its requested proportions");
assert.deepEqual(docsContent.manual["manual-start-grid"].layout, { place: [1, 7], span: [2, 1] }, "manual GRID step must own its requested proportions");
assert.deepEqual(docsContent.manual["manual-start-b"].layout, { place: [3, 5], span: [4, 4] }, "manual setup code must align with the four visual setup steps");
assert.deepEqual(docsContent.manual["manual-finish"].layout, { place: [1, 10], span: [5, 2] }, "manual 02 statement must be five columns wide");
for (const [name, row] of [["html", 12], ["object", 14], ["factory", 16]]) {
  assert.deepEqual(docsContent.manual[`manual-content-${name}-intro`].layout, { place: [1, row], span: [1, 2] }, `manual ${name} intro must be 1×2`);
  assert.deepEqual(docsContent.manual[`manual-content-${name}-code`].layout, { place: [2, row], span: [2, 2] }, `manual ${name} code must be 2×2`);
  assert.deepEqual(docsContent.manual[`manual-content-${name}`].layout, { place: [4, row], span: [3, 2] }, `manual ${name} result must be 3×2`);
}
const jsonLayoutIds = new Set([
  "manual-start-a", "manual-start-div", "manual-start-blocks", "manual-start-grid", "manual-start-b", "manual-finish",
  "manual-content-html-intro", "manual-content-html-code", "manual-content-html",
  "manual-content-object-intro", "manual-content-object-code", "manual-content-object",
  "manual-content-factory-intro", "manual-content-factory-code", "manual-content-factory",
  "manual-menu", "manual-menu-code", "manual-layout",
  "manual-drag", "manual-drag-code",
  "manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3", "manual-drag-fixed-4", "manual-drag-fixed-5",
  "manual-drag-result", "manual-base-colors", "manual-base-colors-code", "manual-appearance", "manual-appearance-code",
  "manual-colors", "manual-colors-code", "manual-random", "manual-random-code", "manual-random-action"
]);
for (const [id, entry] of Object.entries(docsContent.manual)) {
  if (!jsonLayoutIds.has(id)) assert.equal("layout" in entry, false, `${id} must keep layout in composition code`);
}
assert.match(siteDemos["docs/shell.mjs"], /content\.json\?v=\d+\.\d+\.\d+/, "docs content must use a cache-busted request");
assert.match(siteDemos["docs/shell.mjs"], /Missing \$\{sectionName\} content[\s\S]*Unused \$\{sectionName\} content/, "docs loader must reject missing and unused content");
assert.match(siteDemos["docs/shell.mjs"], /function setNavigationOpen\(open/, "shared shell must own mobile navigation state");
assert.match(siteDemos["docs/shell.mjs"], /event\.key !== "Escape"/, "mobile navigation must close with Escape");

assert.equal((siteDemos["docs/home.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "home must use one system");
assert.equal((siteDemos["docs/home.mjs"].match(/blocks\.add\(/g) || []).length, 3, "home must contain three functional blocks");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "manual must use one real library field");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /manual-layout-sandbox|sandboxBlocks|dragSpecimen/, "lesson 04 must not create a nested mini-app");
assert.match(siteDemos["docs/manual.mjs"], /eli10Block\.element\.style\.setProperty\("--blocks-content-padding", "0px"\)/, "ELI10 must use the library padding hook for an edge-to-edge visual");
assert.doesNotMatch(eli10Source, /step\.code|code:\s*['"]/, "ELI10 must not show implementation snippets below its four panels");
assert.match(eli10Source, /p\.textSize\(18\)[\s\S]*step\.title\.toUpperCase\(\)/, "ELI10 step titles must remain readable at the rendered scale");
assert.match(eli10Source, /1 \/ container[\s\S]*2 \/ blocks[\s\S]*3 \/ grid[\s\S]*4 \/ block/, "ELI10 must show the same four steps as manual setup");
assert.match(siteDemos["docs/manual.mjs"], /function lockLessonBlock[\s\S]*protectedBlock/, "explanation and code blocks must be protected from accidental movement or removal");
assert.match(siteDemos["docs/manual.mjs"], /for \(const id of \["manual-start-a", "manual-start-div", "manual-start-blocks", "manual-start-grid"\]\)[\s\S]*?span: content\[id\]\.layout\.span[\s\S]*?place: content\[id\]\.layout\.place/, "manual setup steps must consume their JSON proportions");
assert.match(siteDemos["docs/manual.mjs"], /id: "manual-start-b"[\s\S]*?span: content\["manual-start-b"\]\.layout\.span[\s\S]*?place: content\["manual-start-b"\]\.layout\.place/, "manual 01b must consume its JSON proportions");
assert.match(siteDemos["docs/manual.mjs"], /id: "manual-finish"[\s\S]*?span: content\["manual-finish"\]\.layout\.span[\s\S]*?place: content\["manual-finish"\]\.layout\.place/, "manual 02 statement must consume its JSON proportions");
assert.match(siteDemos["docs/manual.mjs"], /manual-content-statement[\s\S]*?text\("strong", entry\.statement\)/, "manual 02 must render its complete sentence as one strong typographic element");
assert.match(siteDemos["docs/manual.mjs"], /introId[\s\S]*?span: content\[introId\]\.layout\.span[\s\S]*?codeId[\s\S]*?span: content\[codeId\]\.layout\.span[\s\S]*?resultId[\s\S]*?span: content\[resultId\]\.layout\.span/, "manual 02.1–02.3 must consume their three-part JSON layouts");
assert.deepEqual(docsContent.manual["manual-menu"].layout, { place: [1, 19], span: [2, 2] }, "manual 03 explanation must be 2×2");
assert.deepEqual(docsContent.manual["manual-menu-code"].layout, { place: [3, 19], span: [4, 2] }, "manual 03 code must be 4×2");
assert.equal(docsContent.manual["manual-menu"].title, "03 / titlebar controls", "manual 03 must use the human-facing titlebar term");
assert.match(docsContent.manual["manual-menu"].intro, /top-right corner[\s\S]*API[\s\S]*menu/, "manual 03 must locate the buttons and bridge to the real menu API term");
for (const id of ["manual-menu-both", "manual-menu-minimize", "manual-menu-close", "manual-menu-none"]) {
  assert.equal("eyebrow" in docsContent.manual[id], false, `${id} must not repeat the titlebar label inside its compact result`);
  assert.equal("statement" in docsContent.manual[id], false, `${id} must not repeat its title inside its compact result`);
  assert.match(docsContent.manual[id].body, /^minimize: (?:true|false) · close: (?:true|false)$/, `${id} must state its exact menu settings on one line`);
}
assert.match(siteDemos["docs/manual.mjs"], /\["manual-menu-both", 1, 21[\s\S]*\["manual-menu-minimize", 4, 21[\s\S]*\["manual-menu-close", 1, 22[\s\S]*\["manual-menu-none", 4, 22[\s\S]*span: \[3, 1\]/, "manual 03 must compare four compact 3×1 titlebar examples in two rows");
assert.deepEqual(docsContent.manual["manual-menu-code"].code, [
  "const block = blocks.add(content, {",
  '  title: "minimize + close",',
  "  menu: { minimize: true, close: true }",
  "});",
  "",
  "block.minimized = true;",
  "block.minimized = false;",
  "block.remove();"
], "manual 03 must show one non-redundant menu route that matches its first result block");
assert.deepEqual(docsContent.manual["manual-layout"].layout, { place: [1, 8], span: [2, 1] }, "size and position must be one row high under setup");
assert.equal(docsContent.manual["manual-layout"].title, "block size and position", "the setup sublesson must name the block that span and place control");
assert.equal("manual-layout-code" in docsContent.manual, false, "size and position must not duplicate setup code in a separate block");
assert.equal("manual-layout-result" in docsContent.manual, false, "setup must not show a result whose documentation-grid position obscures the example position");
assert.ok(docsContent.manual["manual-start-b"].code.includes("block.span(4, 2);"), "setup code must own the size example");
assert.ok(docsContent.manual["manual-start-b"].code.includes("block.place(1, 1);"), "setup code must own the position example");
assert.ok(docsContent.manual["manual-start-b"].code.some((line) => line.includes("menu: { minimize: true, close: true }")), "setup code must give added blocks the standard minimize and close actions");
assert.deepEqual(docsContent.manual["manual-drag"].layout, { place: [1, 24], span: [2, 1] }, "manual 04 dragging explanation must be compact 2×1");
assert.deepEqual(docsContent.manual["manual-drag-code"].layout, { place: [3, 24], span: [4, 1] }, "manual 04 dragging code must be compact 4×1");
assert.deepEqual([
  docsContent.manual["manual-drag-fixed-1"].layout.place,
  docsContent.manual["manual-drag-fixed-2"].layout.place,
  docsContent.manual["manual-drag-fixed-3"].layout.place,
  docsContent.manual["manual-drag-result"].layout.place,
  docsContent.manual["manual-drag-fixed-4"].layout.place,
  docsContent.manual["manual-drag-fixed-5"].layout.place
], [[1, 25], [2, 25], [3, 25], [5, 26], [4, 25], [6, 25]], "manual 04 must form the compact 111101 / 000010 challenge");
for (const id of ["manual-drag-fixed-1", "manual-drag-fixed-2", "manual-drag-fixed-3", "manual-drag-fixed-4", "manual-drag-fixed-5", "manual-drag-result"]) {
  assert.deepEqual(docsContent.manual[id].layout.span, [1, 1], `${id} must remain a 1×1 puzzle piece`);
}
assert.equal(docsContent.manual["manual-drag-result"].title, "block", "manual 04 must name the movable piece like the other blocks");
assert.equal("statement" in docsContent.manual["manual-drag-result"], false, "manual 04 must let the misplaced block communicate without an arrow or instruction");
assert.deepEqual(docsContent.manual["manual-drag-code"].code, ["blocks.draggable = true;", "blocks.snap = true;"], "manual 04 must teach dragging separately from size and position");
assert.equal("manual-compact" in docsContent.manual, false, "compact() must stay in the API reference instead of the beginner manual");
assert.equal("manual-compact-code" in docsContent.manual, false, "the beginner manual must not carry a separate compact() code lesson");
assert.deepEqual(docsContent.manual["manual-base-colors"].layout, { place: [1, 28], span: [2, 2] }, "manual 05 base-color explanation must be 2×2");
assert.deepEqual(docsContent.manual["manual-base-colors-code"].layout, { place: [3, 28], span: [2, 2] }, "manual 05 base-color code must be 2×2 beside its explanation");
assert.deepEqual(docsContent.manual["manual-base-colors-code"].code, [
  "#blocks-field {",
  "  --blocks-field-color: #e7e6e0;",
  "  --blocks-paper-color: #efeee8;",
  "  --blocks-ink-color: #000;",
  "  --blocks-text-color: #14140f;",
  "}"
], "manual 05 must show all four public base-color variables on the container");
assert.deepEqual(docsContent.manual["manual-appearance"].layout, { place: [1, 31], span: [2, 1] }, "manual 06 explanation must be compact 2×1");
assert.deepEqual(docsContent.manual["manual-appearance-code"].layout, { place: [3, 31], span: [4, 1] }, "manual 06 code must be compact 4×1 beside its explanation");
assert.deepEqual(docsContent.manual["manual-colors"].layout, { place: [1, 35], span: [2, 2] }, "manual 07 explanation must be 2×2");
assert.deepEqual(docsContent.manual["manual-colors-code"].layout, { place: [3, 35], span: [4, 2] }, "manual 07 code must be 4×2 beside its explanation");
assert.ok(docsContent.manual["manual-colors-code"].code.includes('const colors = ["cyan", "magenta", "yellow"];'), "manual 07 must define the three demonstrated colors");
assert.ok(docsContent.manual["manual-colors-code"].code.some((line) => line.trim() === "block.color = color;"), "manual 07 must apply each defined color to its block");
assert.deepEqual(docsContent.manual["manual-random"].layout, { place: [1, 40], span: [2, 2] }, "manual 08 explanation must be 2×2");
assert.deepEqual(docsContent.manual["manual-random-code"].layout, { place: [3, 40], span: [3, 2] }, "manual 08 code must be 3×2 beside its explanation");
assert.deepEqual(docsContent.manual["manual-random-action"].layout, { place: [6, 40], span: [1, 2] }, "manual 08 rerun action must occupy the freed sixth column");
assert.equal(docsContent.manual["manual-random-action"].action, "random", "manual 07 action must describe a fresh random draw");
assert.deepEqual(docsContent.manual["manual-random-action"].fields, [
  { name: "colorVariation", label: "colorVariation", min: 0, max: 1, step: 0.1, value: 0.5 },
  { name: "inversionVariation", label: "colorInverse", min: 0, max: 1, step: 0.1, value: 0.5 }
], "manual 07 must expose both chance parameters through the same control shape");
assert.deepEqual(docsContent.manual["manual-random-code"].code, [
  'blocks.variant = "random";',
  'blocks.colorArray = ["cyan", "magenta", "yellow"];',
  "",
  "blocks.colorVariation = 0.5;",
  "blocks.inversionVariation = 0.5;",
  "",
  "for (let index = 0; index < 12; index += 1) {",
  '  blocks.add("your content");',
  "}"
], "manual 07 must show one complete settings-to-results route");
for (const id of [
  "manual-random-color-0", "manual-random-color-50", "manual-random-color-100",
  "manual-random-inverse-0", "manual-random-inverse-50", "manual-random-inverse-100",
  "manual-random-combined", "manual-random-combined-code"
]) assert.equal(id in docsContent.manual, false, `manual 07 must not duplicate its adjustable settings in ${id}`);
for (const id of Array.from({ length: 12 }, (_, index) => `manual-random-mix-${index + 1}`)) {
  assert.equal("statement" in docsContent.manual[id], false, `${id} must remain a typographic result`);
}
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /const samples|sampleIndex|random:\s*\(\)/, "manual 07 must use the real default random source");
assert.match(siteDemos["docs/manual.mjs"], /manual-random-control[\s\S]*colorVariation[\s\S]*inversionVariation/, "manual 07 must render both parameters in one control block");
assert.match(siteDemos["docs/manual.mjs"], /function randomizeChanceSettings[\s\S]*Math\.random[\s\S]*rerollChanceResults/, "manual 07 random action must choose and display new slider settings");
assert.match(siteDemos["docs/manual.mjs"], /useSystemVariant[\s\S]*delete options\.variant/, "chance results must inherit the configured random system variant");
assert.match(siteDemos["docs/manual.mjs"], /function addChanceResult[\s\S]*title: ""/, "all twelve chance results must keep an empty visible titlebar");
assert.match(siteDemos["docs/manual.mjs"], /id: "manual-random-action", title: ""/, "manual 08 action block must keep an empty visible titlebar");
assert.match(siteDemos["docs/manual.mjs"], /manual-random-trigger[\s\S]*rerollChanceResults/, "manual 07 must expose a button that reruns the chance code");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /🎲|Re-roll Randomness/, "manual 07 must not use decorative AI-style casino copy");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /manual-contract|exact contract →|function contract\(/, "manual must not render exact-contract separator rows");
assert.match(siteDemos["docs/manual.mjs"], /manual-chapter-heading/, "manual chapters must expose real h2 headings for assistive navigation");
assert.deepEqual(docsContent.manual["manual-next"], {
  title: "09 / unblocked",
  statement: "So, the blocks are unblocked now."
}, "manual 09 must end with one dry Swiss punchline and no example navigation");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /function next\(|manual-next-links/, "manual 08 must not retain the old examples-link renderer");
assert.match(siteDemos["docs/manual.mjs"], /manual-next[\s\S]*blockContent: overviewText\(content\["manual-next"\]\)/, "manual 08 must use the same large neutral statement architecture as chapter 02");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /ResizeObserver|MutationObserver|registerAdapter|document\.createElement\("video"\)/, "advanced lifecycle examples must stay outside the beginner route");
for (const anchor of ["eli10", "start", "content", "menu", "dragging", "base-colors", "appearance", "colors", "chance", "next"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes('"' + anchor + '"'), "manual misses #" + anchor);
}
const manualCopy = JSON.stringify(docsContent.manual).toLowerCase();
assert.doesNotMatch(manualCopy, /same object/, "manual copy must speak about the reader's content, not its own test fixture");
assert.ok((manualCopy.match(/\byour\b/g) || []).length >= 10, "manual copy must address the reader without repeating generic filler inside chance specimens");
for (const anchor of [
  "exports", "options", "container", "system-methods", "grid", "system-state", "blocks", "add-options",
  "block-layout", "block-methods", "content", "titlebar-controls", "dragging", "reorder-event",
  "appearance", "colors", "chance", "block-controller", "adapters", "adapter-methods", "field-dom", "css-hooks", "errors"
]) {
  assert.ok(referenceSectionsSource.includes('"' + anchor + '"'), "reference sections miss #" + anchor);
}

const referenceOrder = [
  "reference-system-create", "reference-container", "reference-grid", "reference-block-create",
  "reference-block-layout", "reference-content", "reference-titlebar", "reference-dragging",
  "reference-appearance", "reference-color", "reference-chance", "reference-block-controller",
  "reference-definition-create", "reference-adapter-methods", "reference-field-signals", "reference-system-errors"
];
assert.deepEqual(Object.keys(docsContent.reference), referenceOrder, "reference content must follow the manual's educational sequence");
assert.ok(referenceOrder.every((id, index) => index === 0 || referenceSectionsSource.indexOf('"' + referenceOrder[index - 1] + '"') < referenceSectionsSource.indexOf('"' + id + '"')), "reference section topology must preserve the educational sequence");

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

const typedReferenceRows = Object.values(docsContent.reference).flatMap((entry) => entry.rows || []);
for (const row of typedReferenceRows) {
  assert.match(row.cells[0], /^(?:method|property|event|option|content|hook|filter|adapter|lifecycle|override) · /, `reference row must name its contract kind: ${row.cells[0]}`);
}
assert.match(docsContent.reference["reference-system-create"].code.join("\n"), /createBlocksSystem\(\{[\s\S]*catalogUrl[\s\S]*random[\s\S]*snap[\s\S]*draggable[\s\S]*font[\s\S]*labels[\s\S]*variant[\s\S]*colorArray[\s\S]*colorVariation[\s\S]*inversionVariation[\s\S]*blockDefaults[\s\S]*blocks/, "createBlocksSystem(options?) must show every supported option beside the call");
assert.match(docsContent.reference["reference-block-create"].code.join("\n"), /blocks\.add\(content, \{[\s\S]*id[\s\S]*title[\s\S]*menu[\s\S]*variant[\s\S]*minimized/, "add(content, options?) must show every supported option beside the call");
assert.match(docsContent.reference["reference-titlebar"].code.join("\n"), /block\.menu\("hello", \{[\s\S]*minimize[\s\S]*close/, "menu(name, options?) must show its complete options object");
assert.match(docsContent.reference["reference-block-controller"].code.join("\n"), /block\.describe\(\{[\s\S]*url/, "describe(options?) must show its complete options object");
const definitionContracts = JSON.stringify(docsContent.reference["reference-definition-create"]);
for (const key of ["options.replace", "filters.query", "filters.adapter", "filters.medium", "filters.category"]) {
  assert.ok(definitionContracts.includes(key), `reference must spell out ${key} beside its optional object`);
}
assert.match(JSON.stringify(docsContent.reference["reference-adapter-methods"]), /override · overrides[\s\S]*adapter-specific[\s\S]*definition\.defaults/i, "adapter overrides must state why their keys cannot be exhaustively listed");

const mainCdnBase = DOCS_RELEASE.stableCdnBase;
const manualStartContent = JSON.stringify([docsContent.manual["manual-start-a"], docsContent.manual["manual-start-b"]]);
assert.ok(manualStartContent.includes(mainCdnBase), "manual installation snippets must use the immutable stable ref");
assert.match(siteDemos["docs/shell.mjs"], /docsSourceLabel\(\)/, "the shared shell must render canonical source metadata");
assert.doesNotMatch(apiHtml, /v0\.2\.0 · released/, "the current main reference must not claim to be the stable release");
assert.deepEqual(packageData.exports["."], {
  types: "./blocks.system.d.ts",
  default: "./blocks.system.mjs"
}, "the root package export must resolve runtime and declarations together");
assert.deepEqual(packageData.exports["./min"], {
  types: "./blocks.system.d.ts",
  default: "./blocks.system.min.mjs"
}, "the minified package export must resolve the same declarations");
assert.equal(packageData.exports["./style"], "./blocks.system.css", "the stylesheet package export must remain stable");
assert.deepEqual(
  ["manual-start-a", "manual-start-div", "manual-start-blocks", "manual-start-grid"].map((id) => [docsContent.manual[id].title, docsContent.manual[id].body]),
  [
    ["01 / set up the CDN", "Start by loading the latest release. The CDN brings the library's stylesheet and JavaScript module into your page."],
    ["div", "Add an empty div to your HTML. This is the field where the blocks will appear."],
    ["blocks", "Create the system and attach it to that div. From then on, blocks controls the field."],
    ["grid", "Set the field to a 4 × 4 grid before adding content. That gives you four columns and four rows."]
  ],
  "manual setup must follow the code in four focused steps"
);
assert.ok(docsContent.manual["manual-start-b"].code.includes(`<link rel="stylesheet" href="${mainCdnBase}/blocks.system.css">`), "manual must load the tagged stylesheet");
assert.ok(docsContent.manual["manual-start-b"].code.includes(`import { createBlocksSystem } from "${mainCdnBase}/blocks.system.mjs";`), "manual must load the tagged module");
assert.equal(docsContent.manual["manual-start-b"].title, "setup code", "manual setup code must have its explicit title");
for (const entry of Object.values(docsContent.manual)) {
  assert.doesNotMatch(entry.title, /^\d+(?:[a-z]|\.\d+)\s*\//, `manual sublesson title must not carry temporary numbering: ${entry.title}`);
}
assert.ok(docsContent.manual["manual-start-b"].code.includes("blocks.setGrid(4, 4);"), "manual must create the requested four-by-four example grid");
assert.ok(docsContent.manual["manual-content-html-code"].code.includes("    <strong>Structure makes movement visible.</strong>"), "02.1 HTML code must create the text shown in its result");
assert.ok(docsContent.manual["manual-content-object-code"].code.some((line) => line.includes("pexels-peter-dyllong-2158803154-37352130.jpg")), "02 object code must load the photo shown in its result");
assert.ok(docsContent.manual["manual-content-object-code"].code.some((line) => line.includes("02 / direction")), "02 object code must create the caption shown in its result");
assert.ok(docsContent.manual["manual-content-factory-code"].code.some((line) => line.includes("structure") && line.includes("contrast")), "02 factory code must define the states shown in its result");
assert.ok(docsContent.manual["manual-content-factory-code"].code.some((line) => line.includes("addEventListener")), "02 factory code must create the interaction shown in its result");
assert.doesNotMatch(JSON.stringify(Object.values(docsContent.manual)), /\b(?:DOM node|Node|node)\b/, "beginner copy must say object instead of node");
assert.doesNotMatch(JSON.stringify(Object.values(docsContent.manual)), /"contract"/, "manual content must not retain unused legacy contract links");

const definitionReference = JSON.stringify(docsContent.reference["reference-definition-create"]);
assert.match(definitionReference, /filters\.query[\s\S]*adapter/, "reference query search must name adapter among its searchable fields");
const adapterReference = JSON.stringify(docsContent.reference["reference-adapter-methods"]);
assert.match(adapterReference, /mount\(context\)[\s\S]*block, host, settings and adapter/i, "reference must describe the full mount context");
assert.match(adapterReference, /snippet\(context\)[\s\S]*block and settings only/i, "reference must distinguish the smaller snippet context");
for (const token of ["--blocks-gap", "--blocks-field-color", "--blocks-paper-color", "--blocks-ink-color", "--blocks-text-color", "--blocks-font-family", "--blocks-content-padding"]) {
  assert.ok(JSON.stringify(docsContent.reference["reference-field-signals"]).includes(token), `reference CSS hooks miss ${token}`);
}
assert.doesNotMatch(pageHtml["docs/reference-fallback.html"], /data-reference-(?:column|aspect)="undefined"/, "reference fallback must not emit undefined legacy metadata");
assert.match(eli10Source, /container[\s\S]*blocks[\s\S]*grid[\s\S]*block/i, "ELI10 source comment must describe all four teaching steps");

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
