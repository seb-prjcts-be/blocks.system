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
for (const apiName of ["createBlocksSystem", "blockDefaults", "attach", "setGrid", "compact", "columns", "rows", "snap", "draggable", "variant", "variants", "colorArray", "colorVariation", "inversionVariation", "add", "registerAdapter", "menu", "span", "place", "flow", "minimized", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl]]) {
  assert.doesNotMatch(content, /const\s+(?!block)[A-Za-z_$][\w$]*\s*=\s*blocks(?:\.system)?\.add\(/, `${file} must prefix returned controllers with block`);
}
assert.match(readme, /import \{ createBlocksSystem \}/, "README.md must show creation-time defaults");
assert.match(readmeNl, /import \{ createBlocksSystem \}/, "README_NL.md must show creation-time defaults");
for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl]]) {
  assert.match(content, /\[Home\]\(https:\/\/seb-prjcts-be\.github\.io\/blocks\.system\/\)/, `${file} must link to the public homepage before page two`);
  assert.match(content, /https:\/\/seb-prjcts-be\.github\.io\/blocks\.system\/docs\/#next/, `${file} examples link must land on the real example index`);
  assert.doesNotMatch(content, /docs\/#examples/, `${file} must not retain the removed examples anchor`);
}
assert.match(readme, /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "README.md must explicitly show both menu actions");
assert.match(readmeNl, /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "README_NL.md must explicitly show both menu actions");
assert.match(readme + readmeNl, /colorArray:\s*\["cyan",\s*"magenta",\s*"yellow"\]/, "README examples must show a concrete user-supplied color array");
assert.doesNotMatch(readme + readmeNl, /(?:defaults? to|standaard(?:reeks|array)?)[^\n]*(?:CMY|cyan)/i, "README must not present CMY as library-owned defaults");

const docsContent = JSON.parse(await readFile(resolve(root, "docs", "content.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const mainCdnBase = "https://cdn.jsdelivr.net/gh/seb-prjcts-be/blocks.system@v0.2.0";
const declarations = await readFile(resolve(root, "blocks.system.d.ts"), "utf8");
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const eli10Schema = await readFile(resolve(root, "docs", "eli10-schema.mjs"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const librarySource = await readFile(resolve(root, "blocks.system.mjs"), "utf8");
const mediaPoster = await readFile(resolve(root, "docs", "references", "media-contract-poster.svg"), "utf8");
const apiHtml = await readFile(resolve(root, "docs", "api.html"), "utf8");
const manualHtml = await readFile(resolve(root, "docs", "index.html"), "utf8");
const homeHtml = await readFile(resolve(root, "index.html"), "utf8");
const exampleIndexHtml = await readFile(resolve(root, "examples", "index.html"), "utf8");
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
  assert.match(siteDemos[file], /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, `${file} must explicitly expose minimize and close controls`);
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
  ["examples index", exampleIndexHtml, null],
  ...Object.entries(standaloneExamples).map(([name, html]) => [`example ${name}`, html, null])
];

const canonicalStylesheets = [
  ["home", homeHtml, ["blocks.system.css?v=0.1.13", "docs/style.css?v=0.2.18"]],
  ["manual", manualHtml, ["../blocks.system.css?v=0.1.13", "style.css?v=0.2.18"]],
  ["reference", apiHtml, ["../blocks.system.css?v=0.1.13", "style.css?v=0.2.18"]],
  ["examples index", exampleIndexHtml, ["../blocks.system.css?v=0.1.13", "../docs/style.css?v=0.2.18"]],
  ...Object.entries(standaloneExamples).map(([name, html]) => [
    `example ${name}`,
    html,
    ["../../blocks.system.css?v=0.1.13", "../../docs/style.css?v=0.2.18"]
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

assert.ok(apiHtml.includes("blocks.system · reference · v0.2.0 · released"), "reference footer must label its immutable source ref");
assert.equal(packageData.types, "./blocks.system.d.ts", "package metadata must expose the TypeScript declarations");
assert.ok(packageData.files.includes("blocks.system.d.ts"), "the published file list must include the TypeScript declarations");
for (const declaration of ["BlocksSystem", "BlockController", "BlockDefaults", "BlocksLabels", "BlocksReorderDetail", "BlocksChangeDetail", "createBlocksSystem"]) {
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
assert.equal((siteDemos["docs/home.mjs"].match(/blocks\.add\(/g) || []).length, 3, "home must contain the title, one adjacent photograph and one functional start block");
assert.equal((siteDemos["docs/home.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "home must use one shared blocks system");
assert.match(siteDemos["docs/home.mjs"], /blocks\.setGrid\(6, 8\)/, "home must preserve deliberate empty cells in a six-column field");
assert.match(siteDemos["docs/home.mjs"], /snap:\s*true/, "home must configure snap once when its system is created");
assert.match(siteDemos["docs/home.mjs"], /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "home must expose both block actions by default");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /blocks\.add\([\s\S]*?menu:\s*\{/, "home blocks must not hide inherited menu actions locally");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /\btitle\s*:/, "home blocks must not render visible menu titles");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /blocks\.draggable = true/, "home must rely on the library's draggable default");
assert.match(siteDemos["docs/home.mjs"], /home-title[\s\S]*home-photo[\s\S]*home-intro/, "home must lead from identity through the adjacent image to one concise action");
assert.match(siteDemos["docs/home.mjs"], /title\.place\(2, 2\)[\s\S]*photo\.span\(1, 3\)[\s\S]*photo\.place\(5, 2\)[\s\S]*intro\.span\(2, 2\)[\s\S]*intro\.place\(4, 6\)/, "home must keep all three blocks one row above their original composition and give the start block two rows");
assert.match(siteDemos["docs/home.mjs"], /new URL\("\.\/img\/pexels-peter-dyllong-2158803154-37466849\.jpg", import\.meta\.url\)/, "home must load the selected photograph relative to its module");
assert.match(siteCss, /\.home-board\s*\{[^}]*background-image\s*:[^}]*linear-gradient/s, "home must expose the grid because the system itself is the subject");
assert.match(siteCss, /\.home-board\s*\{[^}]*--blocks-columns:\s*6/s, "home must start from six columns");
assert.doesNotMatch(siteCss, /\.home-board\s*\{[^}]*--blocks-gap:/s, "home must demonstrate the library's default block interval without an opening exception");
assert.match(siteCss, /\.home-title\s*\{[^}]*justify-self:\s*start;/s, "home must align its hero title with the left edge of its content area");
assert.match(siteCss, /\.home-intro-object\s*\{[^}]*font:\s*600[^;]*\/1\s+"Instrument Sans"[^}]*white-space:\s*nowrap;/s, "home must keep object. intact inside a full-height typographic line box");
assert.match(siteCss, /\.home-photo\s*\{[^}]*overflow:\s*hidden;/s, "home photograph must own a bounded block content frame");
assert.match(siteCss, /\.home-photo img\s*\{[^}]*object-fit:\s*cover;/s, "home photograph must crop inside its 1 by 3 block");
assert.match(siteCss, /\[data-block-object="home-intro"\][^{]*> \.blocks-system-content\s*\{[^}]*overflow:\s*hidden;/s, "home start block must suppress its fractional internal scrollbar");
assert.match(siteCss, /@media \(max-width: 900px\)[\s\S]*?\.home-board\s*\{[^}]*--blocks-columns:\s*3 !important/s, "home must collapse to three columns on tablets");
assert.doesNotMatch(siteCss, /\.home-board\s*\{[^}]*--blocks-columns:\s*1 !important/s, "home must preserve its meaningful three-column mobile grid");
assert.doesNotMatch(libraryCss, /\.home-/, "the reusable library stylesheet must not absorb home composition");
assert.match(siteDemos["docs/shell.mjs"], /export async function loadDocsContent/, "the active docs shell must own the shared content loader");
assert.equal((siteCss.match(/@import\s+url\(/g) || []).length, 1, "consumer CSS must own one font import");
assert.doesNotMatch(siteCss, /\b(?:Inter|Oswald)\b/, "all site and example typography must use the canonical Instrument Sans family");
assert.doesNotMatch(siteCss, /\.hero-|\.demo-|#field|\.docs-pagination|\.api-table/, "shared CSS must not retain retired page systems");
assert.match(siteCss, /\.docs-board\s*\{[^}]*background:\s*var\(--docs-field\);[^}]*background-image:[^}]*linear-gradient\(to right,[^}]*linear-gradient\(to bottom,[^}]*background-position:[^}]*background-size:/s, "manual and reference must temporarily expose their shared editorial grid");
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
assert.match(libraryCss, /\.blocks-system-surface\[data-draggable="true"\]\s+\.blocks-system-object:hover\s*\{[^}]*outline:\s*3px solid var\(--block-color\);[^}]*outline-offset:\s*-3px;/s, "draggable blocks must expose a full hover frame in their resolved block color");
assert.match(libraryCss, /\.blocks-system-object:has\(> \.blocks-system-menu > \.blocks-system-title:focus-visible\)\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "keyboard handles must expose the same full-block frame");
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
for (const variant of ["inverse", "color"]) {
  assert.match(libraryCss, new RegExp(`data-block-variant="${variant}"`), `missing built-in ${variant} variant`);
}
assert.doesNotMatch(libraryCss, /data-block-variant="(?:red|green|blue|cyan|magenta|yellow)"/, "the library CSS must not own an RGB or CMY palette");
assert.match(libraryCss, /data-block-variant="color"\]\[data-block-color\]\s*\{[^}]*--block-color:\s*var\(--block-array-color\);[^}]*--block-paper-color:\s*var\(--blocks-paper-color\);[^}]*--block-content-color:\s*var\(--blocks-text-color\);[^}]*--block-menu-color:\s*var\(--blocks-ink-color\);/s, "the generic color variant must color only the block shell and keep its content plane neutral");
assert.match(siteDemos["examples/basic-grid/demo.mjs"], /colorVariation:\s*0\.25,[\s\S]*inversionVariation:\s*0\.25,[\s\S]*random:/, "the basic grid must demonstrate reproducible system-level variation");
assert.doesNotMatch(siteDemos["examples/basic-grid/demo.mjs"], /blockItem\.variant\s*=/, "the basic grid must obtain variants from the configured system instead of local block exceptions");
assert.match(standaloneExamples["basic-grid"], /system-level color and inversion variation/, "the basic example copy must name its actual variation mode");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes("blockItem.minimized = index === 1"), "the basic grid must demonstrate a restorable minimized block");
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.doesNotMatch(standaloneExamples[example], /href="demo\.mjs" download/, `${example} must not offer a module download that cannot run on its own`);
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
assert.match(manualHtml, /class="docs-chapters"[\s\S]*#eli10[\s\S]*#start[\s\S]*#content[\s\S]*#menu[\s\S]*#layout[\s\S]*#compact[\s\S]*#appearance[\s\S]*#colors[\s\S]*#chance[\s\S]*#next/, "the manual masthead must list compacting, variants, direct color and chance as separate steps");
assert.doesNotMatch(manualHtml + siteCss, /manual-hero-image/, "the photograph belongs to the homepage block composition, not the manual masthead");
assert.doesNotMatch(manualHtml, /manual-toolbar|manual-status|lock layout|reset/, "the beginner manual must not present layout tooling before the lesson");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the experimental manual must use one shared blocks system");
assert.match(siteDemos["docs/manual.mjs"], /id:\s*"manual-eli10"[\s\S]*?span:\s*\[3,\s*2\][\s\S]*?place:\s*\[1,\s*1\][\s\S]*?classes:\s*\["manual-half",\s*"manual-eli10-block"\][\s\S]*?id:\s*"manual-start"[\s\S]*?place:\s*\[1,\s*4\]/, "ELI10 must use the left three columns, leave visual space at right and start part 1 on row 4");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /manual-eli10-steps/, "ELI10 must not repeat the same explanation in a second text block");
assert.match(siteDemos["docs/manual.mjs"], /blocks\.setGrid\(6,\s*58\)[\s\S]*?id:\s*"manual-start"[\s\S]*?place:\s*\[1,\s*4\][\s\S]*?id:\s*"manual-finish"[\s\S]*?place:\s*\[1,\s*8\][\s\S]*?id:\s*"manual-content-html-code"[\s\S]*?place:\s*\[1,\s*10\][\s\S]*?id:\s*"manual-content-html"[\s\S]*?place:\s*\[4,\s*10\][\s\S]*?id:\s*"manual-content-object-code"[\s\S]*?place:\s*\[1,\s*12\][\s\S]*?id:\s*"manual-content-object"[\s\S]*?place:\s*\[4,\s*12\][\s\S]*?id:\s*"manual-content-factory-code"[\s\S]*?place:\s*\[1,\s*14\][\s\S]*?id:\s*"manual-content-factory"[\s\S]*?place:\s*\[4,\s*14\]/, "manual 02 must follow one open grid row and pair each focused code example with its result");
assert.match(manualHtml, /p5-1\.11\.13\.min\.js[\s\S]*shell\.mjs\?v=0\.1\.35[\s\S]*manual\.mjs\?v=0\.1\.50/, "the manual must load its pinned local p5 runtime before the visual schema module");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /eli10Block\.color\s*=/, "the first manual block must keep the standard regular black shell");
for (const anchor of ["eli10", "start", "content", "menu", "layout", "compact", "appearance", "colors", "chance", "next"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes(`anchor: "${anchor}"`), `the canonical manual misses #${anchor}`);
}
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.ok(JSON.stringify(docsContent.manual).includes(`../examples/${example}/`), `the manual content misses the ${example} route`);
}
assert.match(siteDemos["docs/manual.mjs"], /function createTextElement[\s\S]*element\.textContent\s*=\s*text/, "dynamic manual text must still use textContent without turning the content card into an explanation");
assert.match(siteDemos["docs/manual.mjs"], /function createEli10SchemaContent\(\)[\s\S]*id\s*=\s*"eli10-schema"/, "ELI10 must mount one dedicated visual host instead of explanatory duplicate copy");
assert.match(siteDemos["docs/manual.mjs"], /mountEli10Schema\(eli10Block\.element\.querySelector\("#eli10-schema"\)\)/, "the visual ELI10 host must mount after its block exists");
assert.match(siteDemos["docs/manual.mjs"], /eli10-schema\.mjs\?v=0\.1\.1/, "the changed ELI10 module must use a new cache version");
assert.match(eli10Schema, /const block = blocks\.add\(\\n\s*"<p>Hello\.<\/p>"\\n\)/, "ELI10 must show that blocks.add creates and returns the individual block");
assert.match(siteDemos["docs/manual.mjs"], /variant:\s*"regular"[\s\S]*snap:\s*true[\s\S]*menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "the manual must expose both block actions while staying monochrome");
for (const [minimize, close] of [[true, true], [true, false], [false, true], [false, false]]) {
  assert.match(siteDemos["docs/manual.mjs"], new RegExp(`menu:\\s*\\{\\s*minimize:\\s*${minimize},\\s*close:\\s*${close}\\s*\\}`), `the manual must render menu actions with minimize ${minimize} and close ${close}`);
}
assert.match(docsContent.manual["manual-menu"].code.join("\n"), /block\.menu\([\s\S]*block\.minimized = true[\s\S]*block\.minimized = false[\s\S]*block\.remove\(\)/, "the menu lesson must show title/actions, minimize, restore and close through the returned controller");
assert.match(docsContent.manual["manual-menu"].intro, /Close removes this example; reload the page to restore the full manual\./, "the menu lesson must explain how a learner restores a closed example");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /draggable:\s*false/, "the manual must inherit the library's interactive dragging, hover and keyboard defaults");
const layoutPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-layout"');
const compactPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-compact"');
const appearancePosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-appearance"');
const firstInversePosition = siteDemos["docs/manual.mjs"].indexOf('variant: "inverse"');
assert.ok(layoutPosition >= 0 && compactPosition > layoutPosition && appearancePosition > compactPosition, "compact must sit between layout and appearance in the beginner route");
assert.ok(appearancePosition >= 0 && firstInversePosition > appearancePosition, "inverse must not appear before the appearance lesson explains it");
assert.doesNotMatch(siteDemos["docs/manual.mjs"].slice(0, appearancePosition), /variant:\s*"inverse"/, "content, menu and layout examples must stay regular");
const colorPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-colors"');
const chancePosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-random"');
assert.ok(colorPosition > appearancePosition && chancePosition > colorPosition, "direct color must follow variants and precede chance");
assert.match(docsContent.manual["manual-compact"].code.join("\n"), /first\.remove\(\)[\s\S]*blocks\.compact\(\)/, "the compact lesson must show the public compact() call after a gap-making change");
assert.doesNotMatch(siteDemos["docs/manual.mjs"].slice(appearancePosition, colorPosition), /\.color\s*=/, "the appearance lesson must stay strictly regular and inverse");
assert.match(siteDemos["docs/manual.mjs"], /colorCyanBlock\.color\s*=\s*"cyan"[\s\S]*colorMagentaBlock\.color\s*=\s*"magenta"[\s\S]*colorYellowBlock\.color\s*=\s*"yellow"/, "the color lesson must restore three direct consumer colors");
assert.equal(new Set(["manual-color-cyan", "manual-color-magenta", "manual-color-yellow"].map((id) => JSON.stringify({
  eyebrow: docsContent.manual[id].eyebrow,
  statement: docsContent.manual[id].statement,
  body: docsContent.manual[id].body
}))).size, 1, "the direct color lesson must compare three shells around one fixed object");
assert.match(siteDemos["docs/manual.mjs"], /blocks\.variant\s*=\s*"random"[\s\S]*blocks\.colorArray\s*=\s*\["cyan",\s*"magenta",\s*"yellow"\][\s\S]*blocks\.inversionVariation\s*=\s*0[\s\S]*blocks\.colorVariation\s*=\s*0[\s\S]*blocks\.colorVariation\s*=\s*0\.5[\s\S]*blocks\.colorVariation\s*=\s*1[\s\S]*blocks\.colorVariation\s*=\s*0[\s\S]*blocks\.inversionVariation\s*=\s*0[\s\S]*blocks\.inversionVariation\s*=\s*0\.5[\s\S]*blocks\.inversionVariation\s*=\s*1/, "the two mini-grids must change color and inverse probability separately through 0, .5 and 1");
assert.match(siteDemos["docs/manual.mjs"], /id:\s*"manual-random-combined"[\s\S]*blocks\.colorVariation\s*=\s*0\.5[\s\S]*blocks\.inversionVariation\s*=\s*0\.5/, "the manual must combine the two random settings only after the separate mini-grids");
function manualSpecimen(example) {
  return { statement: example.statement };
}
const fixedSpecimenIds = Object.keys(docsContent.manual).filter((id) => id.startsWith("manual-random-color-") || id.startsWith("manual-random-inverse-") || id.startsWith("manual-random-mix-"));
const fixedSpecimens = fixedSpecimenIds.map((id) => manualSpecimen(docsContent.manual[id]));
assert.equal(fixedSpecimens.length, 10, "random must expose six isolated settings and four combined results");
assert.equal(new Set(fixedSpecimens.map((example) => JSON.stringify(example))).size, 1, "random comparisons must keep one fixed content specimen");
assert.ok(Object.values(fixedSpecimens[0]).every((value) => typeof value === "string" && value.trim() !== ""), "the fixed comparison specimen must contain real visible content");
assert.match(siteDemos["docs/manual.mjs"], /id:\s*"manual-random-color-0"[\s\S]*span:\s*\[1,\s*1\][\s\S]*id:\s*"manual-random-inverse-100"[\s\S]*span:\s*\[1,\s*1\]/, "the six isolated chance results must use small one-cell blocks");
assert.equal((siteDemos["docs/manual.mjs"].match(/span:\s*\[1,\s*1\]/g) || []).length, 7, "the six isolated chance calls and the combined chance loop must all use one-cell spans");
assert.match(siteDemos["examples/basic-grid/demo.mjs"], /colorArray:\s*\["cyan",\s*"magenta",\s*"yellow"\]/, "the basic example must supply its own CMY example array");
assert.match(siteDemos["docs/manual.mjs"], /quantizeSurface\(board\);/, "the manual must quantize its editorial grid outside the library core");
assert.match(siteDemos["docs/shell.mjs"], /Math\.floor\(\(available - borders - gap \* \(columns - 1\)\) \/ columns\)/, "the docs shell must quantize tracks to whole CSS pixels");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /ResizeObserver|MutationObserver|registerAdapter|document\.createElement\("video"\)/, "advanced lifecycle demonstrations belong in examples, not the beginner route");
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
const manualEli10Position = siteDemos["docs/manual.mjs"].indexOf('id: "manual-eli10"');
const manualStartPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-start"');
const manualHtmlCodePosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-html-code"');
const manualHtmlPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-html"');
const manualObjectCodePosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-object-code"');
const manualObjectPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-object"');
const manualFactoryCodePosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-factory-code"');
const manualFactoryPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-content-factory"');
const manualFinishPosition = siteDemos["docs/manual.mjs"].indexOf('id: "manual-finish"');
assert.ok(manualEli10Position >= 0 && manualStartPosition > manualEli10Position && manualFinishPosition > manualStartPosition && manualHtmlCodePosition > manualFinishPosition && manualHtmlPosition > manualHtmlCodePosition && manualObjectCodePosition > manualHtmlPosition && manualObjectPosition > manualObjectCodePosition && manualFactoryCodePosition > manualObjectPosition && manualFactoryPosition > manualFactoryCodePosition,
"the manual must read ELI10, runnable start, content overview, then three code-to-result pairs");
assert.match(siteDemos["docs/manual.mjs"], /function createTrustedHtmlContent[\s\S]*return `[\s\S]*manual-content-html-demo/, "trusted HTML must render as the first content example");
assert.match(siteDemos["docs/manual.mjs"], /function createImageObjectContent[\s\S]*document\.createElement\("figure"\)[\s\S]*pexels-peter-dyllong-2158803154-37352130\.jpg/, "an actual image object must render as the second content example");
assert.match(siteDemos["docs/manual.mjs"], /function createFactoryContent[\s\S]*return function createFreshElement\(\)[\s\S]*addEventListener\("click"/, "an interactive fresh element must render as the factory example");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /createLessonContent\(content\["manual-content-(?:html|object|factory)"\]\)/, "content examples must not fall back to explanatory lesson cards");
assert.equal(docsContent.manual["manual-start"].code.at(-1), "</script>", "the start lesson must be runnable without borrowing its closing script from the next chapter");
assert.equal(docsContent.manual["manual-finish"].title, "02 / content can be anything", "the content chapter must lead with the browser-rendering idea");
assert.deepEqual(docsContent.manual["manual-finish"].examples, ["text", "image", "SVG", "canvas", "form", "audio", "video", "custom UI"], "the content overview must make the range of browser content concrete");
assert.equal(docsContent.manual["manual-finish"].code, undefined, "the content overview must not compress all three input forms into one code wall");
const contentLessonCodes = [
  docsContent.manual["manual-content-html-code"].code.join("\n"),
  docsContent.manual["manual-content-object-code"].code.join("\n"),
  docsContent.manual["manual-content-factory-code"].code.join("\n")
];
assert.match(contentLessonCodes[0], /const trustedHtml[\s\S]*blocks\.add\(trustedHtml/, "the trusted HTML pair must define and add its own value");
assert.match(contentLessonCodes[1], /document\.createElement\("img"\)[\s\S]*blocks\.add\(image/, "the element-object pair must define and add its own image");
assert.match(contentLessonCodes[2], /const factory[\s\S]*document\.createElement\("button"\)[\s\S]*blocks\.add\(factory/, "the factory pair must define and add its own fresh element");
assert.ok(contentLessonCodes.every((code) => !/blocks\.add\(content\b/.test(code)), "beginner content snippets must not depend on an undefined content variable");
assert.match(siteDemos["docs/manual.mjs"], /function createContentOverviewContent[\s\S]*manual-content-spectrum/, "the manual must render the broader content range as a distinct overview");
assert.match(siteDemos["docs/manual.mjs"], /function createContentCodeContent[\s\S]*manual-content-code/, "each accepted content form must own a focused code card");
assert.match(siteDemos["docs/manual.mjs"], /function createDragContent[\s\S]*manual-drag-status[\s\S]*blocks:reorder/, "the movement lesson must connect the visible drag cue to live reorder feedback");
await access(resolve(root, "docs", "img", "pexels-peter-dyllong-2158803154-37352130.jpg"));
assert.match(siteCss, /\.manual-content-image-demo img\s*\{[^}]*object-fit:\s*cover;/s, "the object example must present the supplied image as full-bleed content");
assert.match(siteCss, /\.manual-content-spectrum\s*\{[^}]*display:\s*grid;/s, "the broader content range must use one legible visual spectrum");
assert.match(siteCss, /\.manual-drag-demo\s+\.blocks-system-title::after\s*\{[^}]*border-top:\s*1px dashed currentColor;/s, "the drag practice titlebar must carry the requested dotted guide line");
assert.match(siteCss, /\.manual-eli10\s*\{[^}]*display:\s*grid;[^}]*place-items:\s*center;[^}]*padding:\s*clamp\(/s, "the ELI10 visual must retain a centered readable inset");
assert.match(siteCss, /\.eli10-schema canvas\s*\{[^}]*max-width:\s*100%;[^}]*height:\s*auto;/s, "the ELI10 canvas must remain contained in its responsive host");
assert.doesNotMatch(siteCss, /manual-eli10-steps/, "the ELI10 visual must not retain CSS for a duplicated step card");
assert.match(siteCss, /\.manual-code\s*\{[^}]*overflow:\s*auto;[^}]*overscroll-behavior:\s*auto;/s, "long code must scroll locally and then chain trackpad scroll back to the page");
assert.match(siteCss, /\.manual-lesson-code\s*\{[^}]*padding:\s*0;/s, "manual code must use the complete content plane without an extra inner margin");
assert.match(siteCss, /\.manual-explanation\s*\{[^}]*padding:\s*clamp\(14px,\s*1\.6vw,\s*24px\);/s, "manual explanations must share the code inset instead of touching the block edges");
assert.doesNotMatch(siteCss, /\.manual-chapter-start\s*\{\s*margin-top:\s*18px;/s, "desktop chapter spacing must come from an open grid row, not an inset margin");
assert.doesNotMatch(siteCss, /\.manual-page\s*\{[^}]*--docs-chapter-space:\s*162px;/s, "manual masthead spacing must match the same open-row interval as the grid");
assert.match(siteCss, /@media \(max-width:\s*900px\)[\s\S]*\.manual-chapter-start\s*\{[^}]*margin-top:\s*54px;/s, "the responsive auto-flow layout must retain its separate compact chapter spacing");
assert.match(siteCss, /\.manual-code-block\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s, "lesson code must use the complete editorial width");
assert.match(siteDemos["examples/mixed-content/demo.mjs"], /context\.strokeStyle = "#000";/, "the mixed-content canvas must draw with neutral ink");
assert.match(standaloneExamples["mixed-content"], /content stays neutral[\s\S]*(?:user|consumer) owns colorArray/i, "the mixed-content note must state that the consumer owns the block colors");
const pureBlockColor = /(?:#(?:ff0000|00ff00|0000ff|00ffff|ff00ff|ffff00)|rgb\(\s*(?:255\s*,\s*0\s*,\s*0|0\s*,\s*255\s*,\s*0|0\s*,\s*0\s*,\s*255|0\s*,\s*255\s*,\s*255|255\s*,\s*0\s*,\s*255|255\s*,\s*255\s*,\s*0)\s*\))/i;
for (const [owner, source] of [
  ["consumer CSS", siteCss],
  ["manual canvas", siteDemos["docs/manual.mjs"]],
  ["mixed-content canvas", siteDemos["examples/mixed-content/demo.mjs"]],
  ["media poster", mediaPoster]
]) {
  assert.doesNotMatch(source, pureBlockColor, `${owner} must not use an RGB/CMY block color inside rendered content`);
}
assert.match(siteCss, /@media \(max-width: 900px\)[\s\S]*\.docs-board\.blocks-system-surface[^}]*repeat\(3, minmax\(0, 1fr\)\)/, "the docs shell must collapse to three tablet columns");
assert.match(siteCss, /@media \(max-width: 560px\)[\s\S]*\.docs-board\.blocks-system-surface[^}]*grid-template-columns:\s*1fr;/, "the docs shell must collapse to one mobile column");
assert.doesNotMatch(libraryCss, /\.manual-/, "the reusable library stylesheet must not absorb the experimental manual composition");

assert.match(apiHtml, /<body class="docs-page reference-page">/, "the API route must use the shared docs shell and reference surface");
assert.match(apiHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the reference must use the four-item shared navigation");
assert.match(apiHtml, /class="reference-index"[\s\S]*#exports[\s\S]*#options[\s\S]*#system-state[\s\S]*#system-methods[\s\S]*#block-controller[\s\S]*#adapters[\s\S]*#reorder-event[\s\S]*#css-hooks[\s\S]*#errors/, "the reference masthead must expose a complete lookup index");
assert.equal(docsContent.schema, "blocks.system/docs-content@2", "docs content must publish its supported schema");
assert.deepEqual(Object.keys(docsContent), ["schema", "home", "manual", "reference"], "docs content must expose only the three canonical block sections");
assert.deepEqual(Object.keys(docsContent.home), ["home-title", "home-photo", "home-intro"], "home content must own title, photograph and action in canonical reading order");
assert.deepEqual(docsContent.home["home-intro"], {
  title: "object / start",
  lead: "your content becomes an",
  statement: "object.",
  sequence: "add · span · place",
  action: { label: "open manual →", href: "docs/" }
}, "home must explain the system through one graphic object statement");
assert.deepEqual(Object.keys(docsContent.manual), [
  "manual-eli10",
  "manual-start",
  "manual-finish",
  "manual-content-html-code",
  "manual-content-html",
  "manual-content-object-code",
  "manual-content-object",
  "manual-content-factory-code",
  "manual-content-factory",
  "manual-menu",
  "manual-menu-both",
  "manual-menu-minimize",
  "manual-menu-close",
  "manual-menu-none",
  "manual-menu-title",
  "manual-layout",
  "manual-layout-wide",
  "manual-layout-small",
  "manual-compact",
  "manual-appearance",
  "manual-appearance-regular",
  "manual-appearance-inverse",
  "manual-colors",
  "manual-color-cyan",
  "manual-color-magenta",
  "manual-color-yellow",
  "manual-random",
  "manual-random-color-0",
  "manual-random-color-50",
  "manual-random-color-100",
  "manual-random-inverse-0",
  "manual-random-inverse-50",
  "manual-random-inverse-100",
  "manual-random-combined",
  "manual-random-mix-1",
  "manual-random-mix-2",
  "manual-random-mix-3",
  "manual-random-mix-4",
  "manual-next"
], "manual content must own the complete beginner sequence in reading order");
assert.deepEqual(docsContent.manual["manual-eli10"], {
  title: "00 / ELI10"
}, "ELI10 must leave its container, system and block explanation to the visual itself");
assert.ok(docsContent.manual["manual-start"].intro.includes("released v0.2.0 build"), "the manual must label its immutable source ref");
assert.ok(docsContent.manual["manual-start"].code.includes(`<link rel="stylesheet" href="${mainCdnBase}/blocks.system.css">`), "the manual must load the tagged stylesheet from jsDelivr");
assert.ok(docsContent.manual["manual-start"].code.includes(`import { createBlocksSystem } from "${mainCdnBase}/blocks.system.mjs";`), "the manual must import the tagged ESM module from jsDelivr");
assert.doesNotMatch(JSON.stringify(Object.values(docsContent.manual)), /\b(?:DOM node|Node|node)\b/, "beginner-facing manual copy must say object instead of node");
const referenceOrder = [
  "reference-exports",
  "reference-options",
  "reference-state",
  "reference-methods",
  "reference-add-options",
  "reference-block",
  "reference-adapters",
  "reference-event",
  "reference-hooks",
  "reference-errors"
];
assert.deepEqual(Object.keys(docsContent.reference), referenceOrder, "the reference content must own the complete lookup sequence in reading order");
assert.deepEqual(
  referenceOrder.map((id) => docsContent.reference[id].title),
  [
    "01 / module",
    "02 / BlocksSystem options",
    "03 / BlocksSystem state",
    "04 / BlocksSystem methods",
    "05 / add() options",
    "06 / BlockController",
    "07 / BlockDefinition + BlockAdapter",
    "08 / events",
    "09 / CSS hooks",
    "10 / errors and boundaries"
  ],
  "the reference must group its public contracts by module and API object"
);
const docsContentKeys = new Set();
JSON.stringify(docsContent, function (key, value) {
  if (key) docsContentKeys.add(key);
  return value;
});
for (const forbiddenKey of ["adapter", "anchor", "class", "className", "defaults", "html", "lifecycle", "minimized", "renderer", "span", "variant"]) {
  assert.equal(docsContentKeys.has(forbiddenKey), false, `docs content must not own ${forbiddenKey}`);
}
assert.equal(Object.values(docsContent).slice(1).reduce((total, section) => total + Object.keys(section).length, 0), 52, "docs content must cover every living docblock exactly once");
for (const [sectionName, section] of Object.entries({ home: docsContent.home, manual: docsContent.manual, reference: docsContent.reference })) {
  for (const [id, block] of Object.entries(section)) {
    assert.equal(typeof block.title, "string", `${sectionName}.${id} needs one visible title`);
    assert.ok(block.title.length > 0, `${sectionName}.${id} title must not be empty`);
  }
}
for (const [moduleName, sectionName] of [["home", "home"], ["manual", "manual"], ["reference", "reference"]]) {
  assert.ok(siteDemos[`docs/${moduleName}.mjs`].includes(`loadDocsContent("${sectionName}"`), `${moduleName} must load its canonical JSON section`);
}
assert.match(siteDemos["docs/shell.mjs"], /fetch\(new URL\("\.\/content\.json\?v=0\.3\.31", import\.meta\.url\)\)/, "the docs shell must load the cache-busted canonical JSON file once");
assert.match(siteDemos["docs/shell.mjs"], /Missing \$\{sectionName\} content[\s\S]*Unused \$\{sectionName\} content/, "the docs loader must reject missing and unused block content");
assert.doesNotMatch(siteDemos["docs/home.mjs"], /dependency-free esm|open manual/, "the home composition must not duplicate extracted copy");
assert.doesNotMatch(siteDemos["docs/manual.mjs"], /content is content|media keeps its lifecycle|build the next block/, "the manual composition must not duplicate extracted copy");
const serializedReferenceContent = JSON.stringify(docsContent.reference);
assert.doesNotMatch(siteDemos["docs/reference.mjs"], /Create an independent system|stable detail: id, input, mode/, "the reference module must not duplicate extracted prose");
assert.equal((siteDemos["docs/reference.mjs"].match(/const blocks = createBlocksSystem\(/g) || []).length, 1, "the reference must use one shared blocks system");
assert.match(siteDemos["docs/reference.mjs"], /draggable:\s*false/, "the lookup reference must configure its canonical reading order at creation");
assert.match(siteDemos["docs/reference.mjs"], /menu:\s*\{\s*minimize:\s*true,\s*close:\s*true\s*\}/, "the reference must expose both block actions");
assert.match(siteDemos["docs/reference.mjs"], /quantizeSurface\(board\);/, "the reference must use the shared whole-pixel geometry");
assert.match(siteDemos["docs/reference.mjs"], /root\.append\(createTextElement\("h2", entry\.title, "reference-section-heading"\)\);/, "the reference must expose every JSON-owned object group as a real semantic chapter heading");
assert.match(siteCss, /\.manual-chapter-heading,\s*\.reference-section-heading\s*\{[^}]*clip-path:\s*inset\(50%\)/s, "manual and reference chapter headings must use the same visually quiet accessible pattern");
assert.match(apiHtml, /reference\.mjs\?v=0\.1\.22/, "the changed reference module must use a new cache version");
const referenceIndex = [
  ["exports", "module"],
  ["options", "BlocksSystem options"],
  ["system-state", "BlocksSystem state"],
  ["system-methods", "BlocksSystem methods"],
  ["add-options", "add() options"],
  ["block-controller", "BlockController"],
  ["adapters", "BlockDefinition + BlockAdapter"],
  ["reorder-event", "reorder event"],
  ["css-hooks", "CSS hooks"],
  ["errors", "errors"]
];
const referenceAnchors = referenceIndex.map(([anchor]) => anchor);
assert.deepEqual(
  Array.from(siteDemos["docs/reference.mjs"].matchAll(/\{ id: "([^"]+)", anchor:/g), (match) => match[1]),
  referenceOrder,
  "the reference composition must use the canonical reading order"
);
assert.deepEqual(
  Array.from(apiHtml.matchAll(/<li><a href="#([^"]+)">([^<]+)<\/a><\/li>/g), (match) => [match[1], match[2]]),
  referenceIndex,
  "the reference index must name and order the canonical API groups"
);
for (const anchor of referenceAnchors) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(`anchor: "${anchor}"`), `the reference misses #${anchor}`);
}
for (const apiName of ["createBlocksSystem(options?)", "system", "attach(target)", "setGrid(columns, rows)", "compact()", "columns", "rows", "draggable", "labels", "colorArray", "colorVariation", "inversionVariation", "add(content, options?)", "menu(name, options?)", "span(columns, rows)", "place(column, row)", "flow()", "registerAdapter(id, adapter, options?)", "mount(id, target, overrides?)", "unmount(target)", "address(id)", "blocks:reorder", "blocks:change"]) {
  assert.ok(serializedReferenceContent.includes(apiName), `the reference content misses ${apiName}`);
}
assert.match(serializedReferenceContent, /User-owned CSS colors[\s\S]*?defaults to empty/i, "the reference must identify colorArray as empty and consumer-owned");
assert.match(serializedReferenceContent, /built-in variants are regular and inverse/i, "the reference must limit the library-owned variant set");
assert.match(serializedReferenceContent, /columns[\s\S]*readonly number[\s\S]*rows[\s\S]*may also grow after dragging/i, "the reference must expose readable grid dimensions and row growth");
assert.match(serializedReferenceContent, /snap true[\s\S]*place\(\)[\s\S]*span\(\)[\s\S]*compact\(\)[\s\S]*visual grid layout/i, "the reference must explain that visual grid placement depends on snap");
assert.match(serializedReferenceContent, /Never pass untrusted text as HTML[\s\S]*textContent/i, "the reference must warn that string content is trusted HTML");
for (const hook of [".blocks-system-surface", ".blocks-system-object", ".blocks-system-menu", ".blocks-system-title", ".blocks-system-content", ".blocks-system-drop-preview", "[data-block-object]", "[data-block-variant]", "[data-block-color]", "[data-block-minimized]", "[data-draggable]"]) {
  assert.ok(serializedReferenceContent.includes(hook), `the reference content misses stable hook ${hook}`);
}
assert.match(siteCss, /\.docs-board\s*\{[^}]*background:\s*var\(--docs-field\);[^}]*background-image:[^}]*linear-gradient\(to right,[^}]*linear-gradient\(to bottom,[^}]*background-position:[^}]*background-size:/s, "the reference must use the shared temporarily visible editorial grid");
assert.doesNotMatch(libraryCss, /\.reference-/, "the reusable library stylesheet must not absorb reference composition");

const canonicalDemoFiles = ["docs/home.mjs", "docs/manual.mjs", "docs/reference.mjs"];
const canonicalDemos = canonicalDemoFiles.map((file) => siteDemos[file]).join("\n");
assert.doesNotMatch(canonicalDemos, pureBlockColor, "canonical docs must not assign RGB/CMY block colors to rendered content");

console.log(`blocks.system site presentation — ok (${pages.length} pages, ${exampleDirectories.length} examples)`);
