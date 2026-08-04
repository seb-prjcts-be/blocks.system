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
for (const apiName of ["createBlocksSystem", "blockDefaults", "attach", "setGrid", "snap", "draggable", "variant", "variants", "colorArray", "colorVariation", "inversionVariation", "add", "registerAdapter", "menu", "span", "place", "flow", "minimized", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl]]) {
  assert.doesNotMatch(content, /const\s+(?!block)[A-Za-z_$][\w$]*\s*=\s*blocks(?:\.system)?\.add\(/, `${file} must prefix returned controllers with block`);
}
assert.match(readme, /import \{ createBlocksSystem \}/, "README.md must show creation-time defaults");
assert.match(readmeNl, /import \{ createBlocksSystem \}/, "README_NL.md must show creation-time defaults");
assert.match(readme + readmeNl, /colorArray:\s*\["cyan",\s*"magenta",\s*"yellow"\]/, "README examples must use the CMY automatic series");
assert.doesNotMatch(readme + readmeNl, /colorArray:\s*\[[^\]]*\b(?:red|green|blue)\b/, "README examples must keep RGB out of the automatic series");

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const docsContent = JSON.parse(await readFile(resolve(root, "docs", "content.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const declarations = await readFile(resolve(root, "blocks.system.d.ts"), "utf8");
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const librarySource = await readFile(resolve(root, "blocks.system.mjs"), "utf8");
const mediaPoster = await readFile(resolve(root, "docs", "references", "media-contract-poster.svg"), "utf8");
const apiHtml = await readFile(resolve(root, "docs", "api.html"), "utf8");
const manualHtml = await readFile(resolve(root, "docs", "index.html"), "utf8");
const homeHtml = await readFile(resolve(root, "index.html"), "utf8");
const aliasTargets = {
  "manual.html": "system",
  "system.html": "system",
  "examples.html": "examples",
  "guide.html": "start",
  "guide-blocks.html": "compose",
  "guide-finish.html": "connect",
  "about.html": "boundary"
};
for (const [file, anchor] of Object.entries(aliasTargets)) {
  const alias = await readFile(resolve(root, "docs", file), "utf8");
  assert.match(alias, /rel="canonical" href="\.\/"/, `${file} must declare /docs/ canonical`);
  assert.ok(alias.includes(`location.replace(new URL("./#${anchor}"`), `${file} must replace history with #${anchor}`);
  assert.ok(alias.includes(`href="./#${anchor}"`), `${file} must retain a no-script link to #${anchor}`);
}
const siteDemoFiles = [
  "docs/home.mjs",
  "docs/manual.mjs",
  "docs/reference.mjs",
  "docs/shell.mjs",
  "examples/basic-grid/demo.mjs",
  "examples/mixed-content/demo.mjs",
  "examples/custom-adapter/demo.mjs"
];
const siteDemos = Object.fromEntries(await Promise.all(siteDemoFiles.map(async function (file) {
  return [file, await readFile(resolve(root, file), "utf8")];
})));
for (const file of ["examples/basic-grid/demo.mjs", "examples/mixed-content/demo.mjs", "examples/custom-adapter/demo.mjs"]) {
  assert.match(siteDemos[file], /import \{ createBlocksSystem \}/, `${file} must import the configurable system factory`);
  assert.match(siteDemos[file], /const blocks = createBlocksSystem\(/, `${file} must name its configured system blocks`);
  assert.doesNotMatch(siteDemos[file], /const\s+[A-Za-z_$][\w$]*Block\s*=/, `${file} must use block as a prefix, not a suffix`);
}
const exampleDirectories = (await readdir(resolve(root, "examples"), { withFileTypes: true }))
  .filter(function (entry) { return entry.isDirectory(); })
  .map(function (entry) { return entry.name; })
  .sort();
const standaloneExamples = Object.fromEntries(await Promise.all(exampleDirectories.map(async function (example) {
  return [example, await readFile(resolve(root, "examples", example, "index.html"), "utf8")];
})));
const navigationPages = [
  ["home", homeHtml, "home"],
  ["manual", manualHtml, "manual"],
  ["reference", apiHtml, "reference"],
  ...Object.entries(standaloneExamples).map(([name, html]) => [`example ${name}`, html, null])
];

const canonicalStylesheets = [
  ["home", homeHtml, ["blocks.system.css?v=0.1.5", "docs/style.css?v=0.1.5"]],
  ["manual", manualHtml, ["../blocks.system.css?v=0.1.5", "style.css?v=0.1.5"]],
  ["reference", apiHtml, ["../blocks.system.css?v=0.1.5", "style.css?v=0.1.5"]],
  ...Object.entries(standaloneExamples).map(([name, html]) => [
    `example ${name}`,
    html,
    ["../../blocks.system.css?v=0.1.5", "../../docs/style.css?v=0.1.5"]
  ])
];
for (const [page, html, expected] of canonicalStylesheets) {
  const stylesheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(stylesheets, expected, `${page} must load library then canonical consumer CSS exactly once`);
}

for (const [page, html, currentLabel] of navigationPages) {
  const navigation = html.match(/<nav id="navbar"[\s\S]*?<\/nav>/)?.[0] || "";
  const links = [...navigation.matchAll(/<li><a\b[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((match) => ({ href: match[1], label: match[2], current: /aria-current="page"/.test(match[0]) }));
  assert.ok(navigation, `${page} must expose the shared main navigation`);
  assert.deepEqual(links.map(({ label }) => label), ["home", "manual", "reference", "source"], `${page} must keep the index menu order`);
  assert.equal(links.some(({ href }) => href.includes("#")), false, `${page} main navigation must not use fragments`);
  assert.deepEqual(links.filter(({ current }) => current).map(({ label }) => label), currentLabel ? [currentLabel] : [], `${page} must expose only its real current page`);
  assert.equal((html.match(/<nav\b/g) || []).length, 1, `${page} must expose exactly one navigation landmark`);
}
const retiredAssets = [
  "demo.mjs",
  "docs/board.mjs",
  "docs/board.css",
  "docs/system.mjs",
  "docs/system.css",
  "docs/examples.mjs",
  "docs/examples.css",
  "docs/nav.mjs",
  "docs/home.css",
  "docs/manual.css",
  "docs/reference.css",
  "examples/example.css",
  "docs/references/micrographic-drag-snap-reference.png"
];
for (const file of retiredAssets) {
  await assert.rejects(access(resolve(root, file)), { code: "ENOENT" }, `${file} must remain retired`);
}

assert.equal(manifest.version, packageData.version, "manifest and package version must match");
assert.deepEqual(manifest.examples, exampleDirectories, "manifest examples must match the filesystem");
assert.ok(["attach", "setGrid", "snap", "draggable", "variant", "variants", "colorArray", "colorVariation", "inversionVariation", "labels", "add"].every(function (name) { return manifest.core_api.includes(name); }), "manifest misses the core API");
assert.equal(packageData.types, "./blocks.system.d.ts", "package metadata must expose the TypeScript declarations");
assert.ok(packageData.files.includes("blocks.system.d.ts"), "the published file list must include the TypeScript declarations");
for (const declaration of ["BlocksSystem", "BlockController", "BlockDefaults", "BlocksLabels", "BlocksReorderDetail", "createBlocksSystem"]) {
  assert.ok(declarations.includes(declaration), `blocks.system.d.ts misses ${declaration}`);
}

assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-field-color:\s*#e7e6e0;[^}]*--blocks-paper-color:\s*#efeee8;[^}]*--blocks-ink-color:\s*#000;/s, "the library must own the agreed out-of-the-box palette");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*--block-color:\s*var\(--blocks-ink-color\);[^}]*--block-paper-color:\s*var\(--blocks-paper-color\);[^}]*background:\s*var\(--block-paper-color\);/s, "the library must make black on warm paper the block default");
assert.doesNotMatch(siteCss, /#field \.blocks-system-object\s*\{[^}]*--block-color:/s, "the showcase must not recreate the library default");
assert.match(homeHtml, /<body class="home-page">/, "home needs its isolated canonical surface");
assert.match(homeHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "home must use the four-item shared navigation");
assert.match(homeHtml, /id="home-board"/, "home must expose one live proof surface");
assert.match(homeHtml, /src="docs\/home\.mjs/, "home must load its focused composition module");
assert.doesNotMatch(homeHtml + manualHtml + apiHtml, /board\.mjs|system\.mjs|examples\.mjs|nav\.mjs/, "canonical pages must not reference retired docs modules");
assert.equal((siteDemos["docs/home.mjs"].match(/blocks\.add\(/g) || []).length, 2, "home must contain only the title and one functional start block");
assert.equal((siteDemos["docs/home.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "home must use one shared blocks system");
assert.match(siteDemos["docs/home.mjs"], /blocks\.setGrid\(6, 8\)/, "home must preserve deliberate empty cells in a six-column field");
assert.match(siteDemos["docs/home.mjs"], /snap:\s*true/, "home must configure snap once when its system is created");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /blocks\.draggable = true/, "home must rely on the library's draggable default");
assert.match(siteDemos["docs/home.mjs"], /home-title[\s\S]*home-intro/, "home must lead from identity to one concise action");
assert.match(siteDemos["docs/home.mjs"], /title\.place\(2, 3\)[\s\S]*intro\.span\(1, 1\)[\s\S]*intro\.place\(4, 7\)/, "home must preserve its deliberate asymmetric anchors and compact intro");
assert.match(siteCss, /\.home-board\s*\{[^}]*background-image\s*:[^}]*linear-gradient/s, "home must expose the grid because the system itself is the subject");
assert.match(siteCss, /\.home-board\s*\{[^}]*--blocks-columns:\s*6/s, "home must start from six columns");
assert.match(siteCss, /\.home-title\s*\{[^}]*justify-self:\s*start;/s, "home must align its hero title with the left edge of its content area");
assert.match(siteCss, /@media \(max-width: 900px\)[\s\S]*?\.home-board\s*\{[^}]*--blocks-columns:\s*3 !important/s, "home must collapse to three columns on tablets");
assert.doesNotMatch(siteCss, /\.home-board\s*\{[^}]*--blocks-columns:\s*1 !important/s, "home must preserve its meaningful three-column mobile grid");
assert.doesNotMatch(libraryCss, /\.home-/, "the reusable library stylesheet must not absorb home composition");
assert.match(siteDemos["docs/shell.mjs"], /export async function loadDocsContent/, "the active docs shell must own the shared content loader");
assert.equal((siteCss.match(/@import\s+url\(/g) || []).length, 1, "consumer CSS must own one font import");
assert.doesNotMatch(siteCss, /\b(?:Inter|Oswald)\b/, "all site and example typography must use the canonical Instrument Sans family");
assert.doesNotMatch(siteCss, /\.hero-|\.demo-|#field|\.docs-pagination|\.api-table/, "shared CSS must not retain retired page systems");
assert.match(siteCss, /\.docs-board\s*\{[^}]*background:\s*var\(--docs-field\);[^}]*background-image:\s*none;/s, "manual and reference must share one invisible editorial grid owner");
assert.match(libraryCss, /\.blocks-system-menu\s*\{[^}]*min-height:\s*22px;[^}]*padding:\s*3px 7px;/s, "the menu must preserve the compact original proportions");
assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-font-family:\s*"Segoe UI",\s*Arial,\s*sans-serif;/s, "the core must use a delivered system fallback instead of implying an unloaded webfont");
assert.match(libraryCss, /\.blocks-system-menu\s*\{[^}]*font:\s*600 13px\/1 var\(--blocks-font-family\);/s, "the menu must use the configurable font family at its original weight");
assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-gap:\s*6px;[^}]*gap:\s*var\(--blocks-gap\);/s, "blocks must preserve the original six pixel interval");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*grid-column:\s*var\(--block-column\) \/ span var\(--block-span-columns\);[^}]*grid-row:\s*var\(--block-row\) \/ span var\(--block-span-rows\);/s, "blocks must occupy explicit or automatic grid units");
assert.match(libraryCss, /\.blocks-system-content\s*\{[^}]*flex:\s*1 1 auto;[^}]*padding:\s*var\(--blocks-content-padding\);/s, "the library must own the compact original inset");
assert.match(libraryCss, /\.blocks-system-content\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*safe center;[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*auto;/s, "block content must scroll internally when needed and otherwise chain trackpad scroll to the page");
assert.match(libraryCss, /data-block-minimized="true"[^}]*align-self:\s*start;[^}]*min-height:\s*0;/s, "a minimized block must override consumer minimum heights while keeping its grid area");
assert.match(libraryCss, /data-block-minimized="true"\]\s+\.blocks-system-content\s*\{[^}]*display:\s*none;/s, "a minimized block must show only its menu");
assert.doesNotMatch(libraryCss, /\b(?:animation|transition)\s*:/, "the base block stylesheet must remain separate from motion");
assert.match(libraryCss, /\.blocks-system-surface\[data-draggable="true"\]\s+\.blocks-system-object:hover\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "draggable blocks must expose a full non-layout-shifting hover frame");
assert.match(libraryCss, /\.blocks-system-object:has\(> \.blocks-system-menu:focus-visible\)\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "keyboard handles must expose the same full-block frame");
assert.match(libraryCss, /\.blocks-system-drop-preview\s*\{[^}]*border:\s*1px dashed var\(--blocks-ink-color\);[^}]*pointer-events:\s*none;/s, "pointer dragging must expose one non-interactive dashed landing preview");
assert.match(libraryCss, /data-drop-state="push"\]\[data-drop-direction="down"\][^}]*border-style:\s*solid;[^}]*background:\s*color-mix/s, "a downward collision must strengthen the magnetic preview");
assert.match(libraryCss, /data-drop-state="push"\]\[data-drop-direction="down"\]::after\s*\{[^}]*content:\s*"↓";/s, "a downward collision must show its direction");
assert.match(librarySource, /preview\.className = "blocks-system-drop-preview"/, "pointer dragging must create the shared landing preview");
assert.match(librarySource, /function pushedGridLayouts\([\s\S]*layout\.row \+= 1;/, "snapped collisions must cascade downward while preserving columns");
assert.match(librarySource, /DRAG_SETTLE_DURATION = 160[\s\S]*prefers-reduced-motion: reduce/, "drop settlement must match the donor timing and respect reduced motion");
assert.match(librarySource, /new CustomEvent\("blocks:reorder"/, "keyboard reordering must expose one stable event for docs status and consumers");
assert.match(librarySource, /mode:\s*detail\.mode[\s\S]*fromIndex:[\s\S]*toIndex:[\s\S]*direction:/, "reorder events must expose one stable detail shape");
assert.match(siteCss, /scrollbar-color:\s*rgba\(17, 17, 17, 0\.58\) transparent;/, "consumer CSS must use the shared neutral OS-like scrollbar");
assert.match(siteCss, /scrollbar-width:\s*thin;/, "consumer CSS must keep vertical scrollbars thin");
assert.match(siteCss, /::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*999px;[^}]*background-clip:\s*content-box;/s, "consumer CSS must expose the rounded overlay thumb in Chromium");
assert.match(siteCss, /@media \(forced-colors:\s*active\)[\s\S]*scrollbar-color:\s*auto;/, "consumer CSS must restore native forced-colors scrollbars");
assert.doesNotMatch(siteCss, /scrollbar-(?:color|thumb)[^;}]*magenta|::-webkit-scrollbar-thumb\s*\{[^}]*255, 0, 255/s, "consumer CSS must keep scrollbars neutral");
for (const variant of ["inverse", "red", "green", "blue", "cyan", "magenta", "yellow"]) {
  assert.match(libraryCss, new RegExp(`data-block-variant="${variant}"`), `missing built-in ${variant} variant`);
}
assert.match(libraryCss, /data-block-variant="yellow"\]\s*\{[^}]*--block-color:\s*rgb\(0, 0, 255\);[^}]*--block-paper-color:\s*rgb\(255, 255, 0\);[^}]*--block-content-color:\s*rgb\(0, 0, 255\);/s, "yellow must restore the blue block chrome and ink on yellow content");
assert.match(readme + readmeNl, /variant\s*=\s*"yellow"[\s\S]*color\s*=\s*"rgb\(0, 0, 255\)"/, "README examples must demonstrate the blue-yellow reversal");
assert.match(siteDemos["examples/basic-grid/demo.mjs"], /colorVariation:\s*0\.25,[\s\S]*inversionVariation:\s*0\.25,[\s\S]*random:/, "the basic grid must demonstrate reproducible system-level variation");
assert.doesNotMatch(siteDemos["examples/basic-grid/demo.mjs"], /blockItem\.variant\s*=/, "the basic grid must obtain variants from the configured system instead of local block exceptions");
assert.match(standaloneExamples["basic-grid"], /system-level color and inversion variation/, "the basic example copy must name its actual variation mode");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes("blockItem.minimized = index === 1"), "the basic grid must demonstrate a restorable minimized block");
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.match(standaloneExamples[example], /href="demo\.mjs" download/, `${example} must offer its copyable module explicitly`);
}
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/">← manual<\/a>/, `${example} must return to the canonical manual without a fragment`);
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/style\.css/, `${example} must load the shared navigation styles`);
  assert.match(standaloneExamples[example], /src="\.\.\/\.\.\/docs\/shell\.mjs/, `${example} must load the shared navigation behaviour`);
}

assert.match(manualHtml, /<body class="docs-page manual-page">/, "the experimental manual needs the shared docs shell and its page scope");
assert.match(manualHtml, /id="manual-board"/, "the experimental manual needs one shared board");
assert.match(manualHtml, /href="api\.html">open the complete reference/, "the manual must lead to its complete reference owner");
assert.match(manualHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the manual must use the four-item index navigation");
assert.doesNotMatch(manualHtml.match(/<nav id="navbar"[\s\S]*?<\/nav>/)?.[0] || "", /href="[^"]*#/, "the manual main navigation must not use chapter fragments");
assert.doesNotMatch(manualHtml, /manual-commandbar|manual-index/, "the retired second menu must not return");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the experimental manual must use one shared blocks system");
assert.equal((siteDemos["docs/manual.mjs"].match(/^(?:addBlock|const block(?:Canvas|Media) = addBlock)\(\{/gm) || []).length, 13, "the canonical manual must keep its concise direct-block composition");
for (const anchor of ["start", "compose", "arrange", "connect", "examples", "reference", "boundary"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes(`anchor: "${anchor}"`), `the canonical manual misses #${anchor}`);
}
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.ok(JSON.stringify(docsContent.manual).includes(`../examples/${example}/`), `the manual content misses the ${example} route`);
  assert.ok(JSON.stringify(docsContent.manual).includes(`../examples/${example}/demo.mjs`), `the manual content misses the ${example} module download`);
}
assert.match(JSON.stringify(docsContent.manual), /textContent/, "the manual content must preserve the untrusted-text safety note");
assert.match(siteDemos["docs/manual.mjs"], /blockDefaults:\s*\{[\s\S]*menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "the manual must configure its shared block menu once");
assert.match(siteDemos["docs/manual.mjs"], /colorVariation:\s*0\.2,[\s\S]*inversionVariation:\s*0\.2,[\s\S]*random:/, "the manual must visibly demonstrate reproducible system-level variation");
assert.match(siteDemos["docs/manual.mjs"], /colorArray:\s*\["cyan",\s*"magenta",\s*"yellow"\]/, "the manual must use the CMY automatic series");
assert.match(siteDemos["examples/basic-grid/demo.mjs"], /colorArray:\s*\["cyan",\s*"magenta",\s*"yellow"\]/, "the basic example must use the CMY automatic series");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /blocks\.draggable = true;[\s\S]*quantizeSurface/, "the manual must not repeat the library's initial draggable default");
assert.match(siteDemos["docs/manual.mjs"], /new ResizeObserver\(drawCanvas\)/, "the experimental manual must demonstrate responsive runtime content");
assert.match(siteDemos["docs/manual.mjs"], /quantizeSurface\(board\);/, "the manual must quantize its editorial grid outside the library core");
assert.match(siteDemos["docs/shell.mjs"], /Math\.floor\(\(available - borders - gap \* \(columns - 1\)\) \/ columns\)/, "the docs shell must quantize tracks to whole CSS pixels");
assert.match(siteDemos["docs/manual.mjs"], /document\.createElement\("video"\)[\s\S]*\.controls = true[\s\S]*\.muted = true[\s\S]*\.preload = "none"/, "the experimental manual must make the pending video contract visible");
assert.match(siteDemos["docs/manual.mjs"], /dataset\.videoLifecycle = "pause-on-minimize-remove-pagehide"/, "manual video must publish its tested lifecycle convention");
assert.match(siteDemos["docs/manual.mjs"], /\.poster = "references\/media-contract-poster\.svg\?v=0\.1\.1"/, "manual video must use the restrained form poster");
assert.match(siteDemos["docs/manual.mjs"], /new MutationObserver\([\s\S]*blockMedia\.minimized\) pauseMedia\(\)/, "manual video must pause when minimized or removed");
assert.match(siteDemos["docs/manual.mjs"], /addEventListener\("pagehide", pauseMedia\)/, "manual video must pause when the document exits");
assert.doesNotMatch(siteDemos["docs/shell.mjs"], /data-section-navigation|hashchange|location\.hash|initSectionNavigation/, "the shared main navigation must not own fragment state");
for (const [page, html] of [["home", homeHtml], ["manual", manualHtml], ["reference", apiHtml]]) {
  assert.match(html, /class="nav-hamburger"[^>]*aria-controls="primary-navigation"/, `${page} hamburger must identify the controlled navigation`);
  assert.match(html, /id="primary-navigation" class="nav-links"/, `${page} navigation must expose the controlled id`);
}
assert.match(siteDemos["docs/shell.mjs"], /function setNavigationOpen\(open/, "the shared shell must own one mobile navigation state setter");
assert.match(siteDemos["docs/shell.mjs"], /event\.key !== "Escape"/, "mobile navigation must close with Escape");
assert.match(siteDemos["docs/shell.mjs"], /mobileNavigation\.addEventListener\("change"/, "mobile navigation must reset when its breakpoint changes");
assert.match(siteCss, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*scroll-behavior:\s*auto/, "smooth anchor scrolling must respect reduced motion");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /createBlocksSystem\([\s\S]*createBlocksSystem\(/, "the experimental manual must not create a nested blocks system");
const manualStartPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-start"');
const manualFormsPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-forms"');
assert.ok(manualStartPosition >= 0 && manualFormsPosition > manualStartPosition,
"the manual must put the first instruction before its visual language specimen");
assert.deepEqual(docsContent.manual["manual-forms"].items.map(({ shape, caption }) => [shape, caption]), [
  ["circle", "state / circle"],
  ["rectangle", "content / rectangle"],
  ["triangle", "direction / triangle"]
], "the form specimen content must explain what each shape communicates");
assert.match(siteDemos["docs/manual.mjs"], /new Set\(\["circle", "rectangle", "triangle"\]\)/, "the manual composition must render exactly the three known forms");
assert.match(siteCss, /\.manual-code\s*\{[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*auto;/s, "long code must scroll locally and then chain trackpad scroll back to the page");
assert.match(siteCss, /\.manual-rectangle\s*\{[^}]*background:\s*#000;/s, "the Munari rectangle must remain black");
assert.match(siteCss, /\.manual-circle\s*\{[^}]*background:\s*#000;/s, "the Munari circle must remain neutral black");
assert.match(siteCss, /\.manual-triangle\s*\{[^}]*background:\s*#000;/s, "the Munari triangle must remain neutral black");
assert.doesNotMatch(docsContent.manual["manual-forms"].items.map(({ label }) => label).join(" "), /\b(?:red|green|blue|cyan|magenta|yellow)\b/i, "form labels must not assign block colors to content");
assert.match(siteDemos["examples/mixed-content/demo.mjs"], /context\.strokeStyle = "#000";/, "the mixed-content canvas must draw with neutral ink");
assert.match(standaloneExamples["mixed-content"], /content stays neutral[\s\S]*RGB\/CMY belongs to block variants/, "the mixed-content note must state the color ownership boundary");
const pureBlockColor = /(?:#(?:ff0000|00ff00|0000ff|00ffff|ff00ff|ffff00)|rgb\(\s*(?:255\s*,\s*0\s*,\s*0|0\s*,\s*255\s*,\s*0|0\s*,\s*0\s*,\s*255|0\s*,\s*255\s*,\s*255|255\s*,\s*0\s*,\s*255|255\s*,\s*255\s*,\s*0)\s*\))/i;
for (const [owner, source] of [
  ["consumer CSS", siteCss],
  ["manual canvas", siteDemos["docs/manual.mjs"]],
  ["mixed-content canvas", siteDemos["examples/mixed-content/demo.mjs"]],
  ["media poster", mediaPoster]
]) {
  assert.doesNotMatch(source, pureBlockColor, `${owner} must not use an RGB/CMY block color inside rendered content`);
}
assert.match(siteCss, /\.manual-media video\s*\{[^}]*object-fit:\s*contain;/s, "video must use an explicit contain prototype");
assert.match(siteCss, /@media \(max-width: 900px\)[\s\S]*\.docs-board\.blocks-system-surface[^}]*repeat\(3, minmax\(0, 1fr\)\)/, "the docs shell must collapse to three tablet columns");
assert.match(siteCss, /@media \(max-width: 560px\)[\s\S]*\.docs-board\.blocks-system-surface[^}]*grid-template-columns:\s*1fr;/, "the docs shell must collapse to one mobile column");
assert.doesNotMatch(libraryCss, /\.manual-/, "the reusable library stylesheet must not absorb the experimental manual composition");

assert.match(apiHtml, /<body class="docs-page reference-page">/, "the API route must use the shared docs shell and reference surface");
assert.match(apiHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the reference must use the four-item shared navigation");
assert.equal(docsContent.schema, "blocks.system/docs-content@2", "docs content must publish its supported schema");
assert.deepEqual(Object.keys(docsContent), ["schema", "home", "manual", "reference"], "docs content must expose only the three canonical block sections");
assert.deepEqual(Object.keys(docsContent.home), ["home-title", "home-intro"], "home content must own exactly two blocks in canonical reading order");
assert.deepEqual(Object.keys(docsContent.manual), [
  "manual-start",
  "manual-forms",
  "manual-content-contract",
  "manual-html",
  "manual-canvas",
  "manual-compose",
  "manual-connect",
  "manual-reference",
  "manual-hooks",
  "manual-media",
  "manual-examples",
  "manual-about",
  "manual-source"
], "manual content must own exactly thirteen blocks in canonical reading order");
assert.deepEqual(Object.keys(docsContent.reference), [
  "reference-system",
  "reference-block",
  "reference-adapters",
  "reference-definition",
  "reference-hooks",
  "reference-errors"
], "the reference content must own exactly six blocks in canonical reading order");
const docsContentKeys = new Set();
JSON.stringify(docsContent, function (key, value) {
  if (key) docsContentKeys.add(key);
  return value;
});
for (const forbiddenKey of ["adapter", "anchor", "class", "className", "defaults", "html", "lifecycle", "minimized", "renderer", "span", "variant"]) {
  assert.equal(docsContentKeys.has(forbiddenKey), false, `docs content must not own ${forbiddenKey}`);
}
assert.equal(Object.values(docsContent).slice(1).reduce((total, section) => total + Object.keys(section).length, 0), 21, "docs content must cover every living docblock exactly once");
for (const [sectionName, section] of Object.entries({ home: docsContent.home, manual: docsContent.manual, reference: docsContent.reference })) {
  for (const [id, block] of Object.entries(section)) {
    assert.equal(typeof block.title, "string", `${sectionName}.${id} needs one visible title`);
    assert.ok(block.title.length > 0, `${sectionName}.${id} title must not be empty`);
  }
}
for (const [moduleName, sectionName] of [["home", "home"], ["manual", "manual"], ["reference", "reference"]]) {
  assert.ok(siteDemos[`docs/${moduleName}.mjs`].includes(`loadDocsContent("${sectionName}"`), `${moduleName} must load its canonical JSON section`);
}
assert.match(siteDemos["docs/shell.mjs"], /fetch\(new URL\("\.\/content\.json\?v=0\.2\.4", import\.meta\.url\)\)/, "the docs shell must load the cache-busted canonical JSON file once");
assert.match(siteDemos["docs/shell.mjs"], /Missing \$\{sectionName\} content[\s\S]*Unused \$\{sectionName\} content/, "the docs loader must reject missing and unused block content");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /dependency-free esm|open manual/, "the home composition must not duplicate extracted copy");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /content is content|media keeps its lifecycle|build the next block/, "the manual composition must not duplicate extracted copy");
const serializedReferenceContent = JSON.stringify(docsContent.reference);
assert.doesNotMatch(siteDemos["docs/reference.mjs"], /Create an independent system|stable detail: id, input, mode/, "the reference module must not duplicate extracted prose");
assert.equal((siteDemos["docs/reference.mjs"].match(/const blocks = createBlocksSystem\(/g) || []).length, 1, "the reference must use one shared blocks system");
assert.match(siteDemos["docs/reference.mjs"], /draggable:\s*false/, "the lookup reference must configure its canonical reading order at creation");
assert.match(siteDemos["docs/reference.mjs"], /quantizeSurface\(board\);/, "the reference must use the shared whole-pixel geometry");
for (const anchor of ["shared-system", "block-controller", "adapters", "definition", "css-hooks", "errors"]) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(`anchor: "${anchor}"`), `the reference misses #${anchor}`);
}
for (const apiName of ["createBlocksSystem(options)", "attach(target)", "setGrid(x, y)", "draggable", "labels", "colorArray", "colorVariation", "inversionVariation", "add(content, options)", "menu(name, options)", "span(x, y)", "place(x, y)", "flow()", "registerAdapter(id, adapter)", "mount(id, target, overrides)", "unmount(target)", "address(id)"]) {
  assert.ok(serializedReferenceContent.includes(apiName), `the reference content misses ${apiName}`);
}
for (const hook of [".blocks-system-surface", ".blocks-system-object", ".blocks-system-menu", ".blocks-system-content", ".blocks-system-drop-preview", "[data-block-object]", "[data-block-variant]", "[data-block-minimized]", "[data-draggable]"]) {
  assert.ok(serializedReferenceContent.includes(hook), `the reference content misses stable hook ${hook}`);
}
assert.match(siteCss, /\.docs-board\s*\{[^}]*background:\s*var\(--docs-field\);[^}]*background-image:\s*none;/s, "the reference must use the shared invisible editorial grid");
assert.doesNotMatch(libraryCss, /\.reference-/, "the reusable library stylesheet must not absorb reference composition");

const canonicalDemos = ["docs/home.mjs", "docs/manual.mjs", "docs/reference.mjs"]
  .map((file) => siteDemos[file]).join("\n");
assert.doesNotMatch(canonicalDemos, pureBlockColor, "canonical docs must not assign RGB/CMY block colors to rendered content");

console.log(`blocks.system site — ok (${pages.length} pages, ${exampleDirectories.length} examples)`);
