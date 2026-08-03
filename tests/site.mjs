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
for (const apiName of ["attach", "setGrid", "snap", "draggable", "variant", "variants", "add", "registerAdapter", "menu", "span", "place", "minimized", "color"]) {
  assert.ok(readme.includes(apiName), `README.md misses ${apiName}`);
  assert.ok(readmeNl.includes(apiName), `README_NL.md misses ${apiName}`);
}

for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl]]) {
  assert.doesNotMatch(content, /const\s+(?!block)[A-Za-z_$][\w$]*\s*=\s*blocks(?:\.system)?\.add\(/, `${file} must prefix returned controllers with block`);
}
assert.match(readme, /import \{ system as blocks \}/, "README.md must alias the shared system to blocks");
assert.match(readmeNl, /import \{ system as blocks \}/, "README_NL.md must alias the shared system to blocks");

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const homeCss = await readFile(resolve(root, "docs", "home.css"), "utf8");
const manualCss = await readFile(resolve(root, "docs", "manual.css"), "utf8");
const referenceCss = await readFile(resolve(root, "docs", "reference.css"), "utf8");
const exampleCss = await readFile(resolve(root, "examples", "example.css"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const librarySource = await readFile(resolve(root, "blocks.system.mjs"), "utf8");
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
  assert.match(siteDemos[file], /import \{ system as blocks \}/, `${file} must alias the shared system to blocks`);
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
  "docs/references/micrographic-drag-snap-reference.png"
];
for (const file of retiredAssets) {
  await assert.rejects(access(resolve(root, file)), { code: "ENOENT" }, `${file} must remain retired`);
}

assert.equal(manifest.version, packageData.version, "manifest and package version must match");
assert.deepEqual(manifest.examples, exampleDirectories, "manifest examples must match the filesystem");
assert.ok(["attach", "setGrid", "snap", "draggable", "variant", "variants", "add"].every(function (name) { return manifest.core_api.includes(name); }), "manifest misses the core API");

assert.match(libraryCss, /\.blocks-system-surface\s*\{[^}]*--blocks-field-color:\s*#e7e6e0;[^}]*--blocks-paper-color:\s*#efeee8;[^}]*--blocks-ink-color:\s*#000;/s, "the library must own the agreed out-of-the-box palette");
assert.match(libraryCss, /\.blocks-system-object\s*\{[^}]*--block-color:\s*var\(--blocks-ink-color\);[^}]*--block-paper-color:\s*var\(--blocks-paper-color\);[^}]*background:\s*var\(--block-paper-color\);/s, "the library must make black on warm paper the block default");
assert.doesNotMatch(siteCss, /#field \.blocks-system-object\s*\{[^}]*--block-color:/s, "the showcase must not recreate the library default");
assert.doesNotMatch(exampleCss, /\.blocks-system-object\s*\{[^}]*--block-color:/s, "examples must not recreate the library default");
assert.match(homeHtml, /<body class="home-page">/, "home needs its isolated canonical surface");
assert.match(homeHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "home must use the four-item shared navigation");
assert.match(homeHtml, /id="home-board"/, "home must expose one live proof surface");
assert.match(homeHtml, /src="docs\/home\.mjs/, "home must load its focused composition module");
assert.doesNotMatch(homeHtml + manualHtml + apiHtml, /board\.mjs|system\.mjs|examples\.mjs|nav\.mjs/, "canonical pages must not reference retired docs modules");
assert.equal((siteDemos["docs/home.mjs"].match(/^(?:addHome|const blockCanvas = addHome)\(\{/gm) || []).length, 5, "home must contain exactly five direct blocks");
assert.equal((siteDemos["docs/home.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "home must use one shared blocks system");
assert.match(siteDemos["docs/home.mjs"], /blocks\.setGrid\(6, 8\)/, "home must preserve deliberate empty cells in a six-column field");
assert.match(siteDemos["docs/home.mjs"], /blocks\.draggable = true/, "home must be draggable by default");
assert.match(siteDemos["docs/home.mjs"], /new ResizeObserver\(drawCanvas\)/, "home must prove responsive canvas content");
assert.match(siteDemos["docs/home.mjs"], /blocks:reorder/, "home status must follow keyboard reordering");
assert.match(siteDemos["docs/home.mjs"], /quantizeSurface\(board\)/, "home must use whole-pixel grid geometry");
assert.doesNotMatch(homeCss, /background-image\s*:/, "home must not draw grid lines");
assert.match(homeCss, /--blocks-columns:\s*6/, "home must start from six columns");
assert.match(homeCss, /@media \(max-width: 900px\)[\s\S]*--blocks-columns:\s*3 !important/, "home must collapse to three columns on tablets");
assert.match(homeCss, /@media \(max-width: 560px\)[\s\S]*--blocks-columns:\s*1 !important/, "home must collapse to one column on phones");
assert.doesNotMatch(libraryCss, /\.home-/, "the reusable library stylesheet must not absorb home composition");
assert.match(siteDemos["docs/shell.mjs"], /export function nodeFromHtml/, "the active docs shell must own the shared content helper");
assert.match(siteCss, /Oswald:wght@400;500;600/, "the inactive Oswald comparison link must remain in its comment");
assert.doesNotMatch(siteCss, /\.hero-|\.demo-|#field|\.docs-pagination|\.api-table/, "shared CSS must not retain retired page systems");
assert.doesNotMatch(siteCss, /background-image\s*:/, "shared docs CSS must not draw a grid");
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
assert.match(libraryCss, /\.blocks-system-surface\[data-draggable="true"\]\s+\.blocks-system-object:hover\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "draggable blocks must expose a full non-layout-shifting hover frame");
assert.match(libraryCss, /\.blocks-system-object:has\(> \.blocks-system-menu:focus-visible\)\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "keyboard handles must expose the same full-block frame");
assert.match(librarySource, /new CustomEvent\("blocks:reorder"/, "keyboard reordering must expose one stable event for docs status and consumers");
for (const [name, css] of [["docs", siteCss], ["standalone examples", exampleCss]]) {
  assert.match(css, /scrollbar-color:\s*rgba\(17, 17, 17, 0\.58\) transparent;/, `${name} must use the shared neutral OS-like scrollbar`);
  assert.match(css, /scrollbar-width:\s*thin;/, `${name} must keep vertical scrollbars thin`);
  assert.match(css, /::-webkit-scrollbar-thumb\s*\{[^}]*border-radius:\s*999px;[^}]*background-clip:\s*content-box;/s, `${name} must expose the rounded overlay thumb in Chromium`);
  assert.match(css, /@media \(forced-colors:\s*active\)[\s\S]*scrollbar-color:\s*auto;/, `${name} must restore native forced-colors scrollbars`);
  assert.doesNotMatch(css, /scrollbar-(?:color|thumb)[^;}]*magenta|::-webkit-scrollbar-thumb\s*\{[^}]*255, 0, 255/s, `${name} must keep scrollbars neutral`);
}
for (const variant of ["inverse", "red", "green", "blue", "cyan", "magenta", "yellow"]) {
  assert.match(libraryCss, new RegExp(`data-block-variant="${variant}"`), `missing built-in ${variant} variant`);
}
assert.match(libraryCss, /data-block-variant="yellow"\]\s*\{[^}]*--block-color:\s*#000;[^}]*--block-paper-color:\s*rgb\(255, 255, 0\);[^}]*--block-content-color:\s*#000;/s, "yellow must use black ink instead of blue-on-yellow");
assert.doesNotMatch(readme + readmeNl, /variant\s*=\s*"(?:red|green|blue)"|color\s*=\s*"rgb\((?:255, 0, 0|0, 255, 0|0, 0, 255)\)"/, "README examples must demonstrate CMY rather than RGB");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes('blockItem.variant = "magenta"'), "the basic grid must demonstrate magenta as its single explicit variant");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes("blockItem.minimized = index === 1"), "the basic grid must demonstrate a restorable minimized block");
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.match(standaloneExamples[example], /href="demo\.mjs" download/, `${example} must offer its copyable module explicitly`);
}
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/">← manual<\/a>/, `${example} must return to the canonical manual without a fragment`);
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/style\.css/, `${example} must load the shared navigation styles`);
  assert.match(standaloneExamples[example], /src="\.\.\/\.\.\/docs\/shell\.mjs/, `${example} must load the shared navigation behaviour`);
}

assert.match(manualHtml, /<body class="manual-page">/, "the experimental manual needs an isolated page scope");
assert.match(manualHtml, /id="manual-board"/, "the experimental manual needs one shared board");
assert.match(manualHtml, /href="api\.html">open the complete reference/, "the manual must lead to its complete reference owner");
assert.match(manualHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the manual must use the four-item index navigation");
assert.doesNotMatch(manualHtml.match(/<nav id="navbar"[\s\S]*?<\/nav>/)?.[0] || "", /href="[^"]*#/, "the manual main navigation must not use chapter fragments");
assert.doesNotMatch(manualHtml, /manual-commandbar|manual-index/, "the retired second menu must not return");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the experimental manual must use one shared blocks system");
assert.equal((siteDemos["docs/manual.mjs"].match(/^(?:addBlock|const block(?:Canvas|Media) = addBlock)\(\{/gm) || []).length, 15, "the canonical manual must keep its complete direct-block composition");
for (const anchor of ["start", "compose", "arrange", "connect", "examples", "reference", "boundary"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes(`anchor: "${anchor}"`), `the canonical manual misses #${anchor}`);
}
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.ok(siteDemos["docs/manual.mjs"].includes(`../examples/${example}/`), `the manual misses the ${example} route`);
  assert.ok(siteDemos["docs/manual.mjs"].includes(`../examples/${example}/demo.mjs`), `the manual misses the ${example} module download`);
}
assert.match(siteDemos["docs/manual.mjs"], /textContent/, "the manual must preserve the untrusted-text safety note");
assert.match(siteDemos["docs/manual.mjs"], /blocks\.draggable = true;/, "the experimental manual must start with dragging enabled");
assert.match(siteDemos["docs/manual.mjs"], /new ResizeObserver\(drawCanvas\)/, "the experimental manual must demonstrate responsive runtime content");
assert.match(siteDemos["docs/manual.mjs"], /quantizeSurface\(board\);/, "the manual must quantize its editorial grid outside the library core");
assert.match(siteDemos["docs/shell.mjs"], /Math\.floor\(\(available - borders - gap \* \(columns - 1\)\) \/ columns\)/, "the docs shell must quantize tracks to whole CSS pixels");
assert.match(siteDemos["docs/manual.mjs"], /<video controls muted preload="none"/, "the experimental manual must make the pending video contract visible");
assert.match(siteDemos["docs/manual.mjs"], /data-video-lifecycle="pause-on-minimize-remove-pagehide"/, "manual video must publish its tested lifecycle convention");
assert.match(siteDemos["docs/manual.mjs"], /poster="references\/media-contract-poster\.svg"/, "manual video must use the restrained form poster");
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
const manualFormPositions = [
  'id: "manual-cycle"',
  'id: "manual-rectangle"',
  'id: "manual-direction"'
].map(function (marker) { return siteDemos["docs/manual.mjs"].indexOf(marker); });
assert.ok(manualFormPositions.every(function (position) { return position >= 0; }) &&
  manualFormPositions[0] < manualFormPositions[1] && manualFormPositions[1] < manualFormPositions[2],
"the manual must open with circle, rectangle and triangle in that order");
for (const formClass of ["manual-circle", "manual-rectangle", "manual-triangle"]) {
  assert.match(siteDemos["docs/manual.mjs"], new RegExp(`class="${formClass}"`), `the manual misses ${formClass}`);
}
assert.match(manualCss, /\.manual-code\s*\{[^}]*overflow:\s*auto;/s, "long code must scroll inside its own block");
assert.match(manualCss, /\.manual-board\s*\{[^}]*background-image:\s*none;/s, "the canonical manual must not draw a background grid");
assert.match(manualCss, /\.manual-rectangle\s*\{[^}]*background:\s*#000;/s, "the Munari rectangle must remain black");
assert.match(manualCss, /--manual-accent:\s*rgb\(255, 0, 255\);/, "the manual must define magenta as its one accent");
assert.match(manualCss, /\.manual-circle\s*\{[^}]*background:\s*var\(--manual-accent\);/s, "the Munari circle must carry the isolated magenta accent");
assert.match(manualCss, /\.manual-triangle\s*\{[^}]*background:\s*#000;/s, "the Munari triangle must remain neutral black");
for (const color of ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)", "rgb(0, 255, 255)", "rgb(255, 255, 0)"]) {
  assert.ok(!manualCss.includes(color) && !siteDemos["docs/manual.mjs"].includes(color), `the manual combines magenta with ${color}`);
}
assert.match(manualCss, /\.manual-media video\s*\{[^}]*object-fit:\s*contain;/s, "video must use an explicit contain prototype");
assert.match(manualCss, /@media \(max-width: 900px\)[\s\S]*repeat\(3, minmax\(0, 1fr\)\)/, "the experimental manual must collapse to three tablet columns");
assert.match(manualCss, /@media \(max-width: 560px\)[\s\S]*grid-template-columns:\s*1fr;/, "the experimental manual must collapse to one mobile column");
assert.doesNotMatch(libraryCss, /\.manual-/, "the reusable library stylesheet must not absorb the experimental manual composition");

assert.match(apiHtml, /<body class="reference-page">/, "the API route must use the canonical reference surface");
assert.match(apiHtml, /home[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the reference must use the four-item shared navigation");
assert.equal((siteDemos["docs/reference.mjs"].match(/^addReference\(\{/gm) || []).length, 6, "the reference must use six direct API blocks");
assert.equal((siteDemos["docs/reference.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the reference must use one shared blocks system");
assert.match(siteDemos["docs/reference.mjs"], /blocks\.draggable = false;/, "the lookup reference must preserve its canonical reading order");
assert.match(siteDemos["docs/reference.mjs"], /quantizeSurface\(board\);/, "the reference must use the shared whole-pixel geometry");
for (const anchor of ["shared-system", "block-controller", "adapters", "definition", "css-hooks", "errors"]) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(`anchor: "${anchor}"`), `the reference misses #${anchor}`);
}
for (const apiName of ["attach(target)", "setGrid(x, y)", "draggable", "add(content, options)", "menu(name, options)", "span(x, y)", "place(x, y)", "registerAdapter(id, adapter)", "mount(id, target, overrides)", "unmount(target)", "address(id)"]) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(apiName), `the reference misses ${apiName}`);
}
for (const hook of [".blocks-system-surface", ".blocks-system-object", ".blocks-system-menu", ".blocks-system-content", "[data-block-object]", "[data-block-variant]", "[data-block-minimized]", "[data-draggable]"]) {
  assert.ok(siteDemos["docs/reference.mjs"].includes(hook), `the reference misses stable hook ${hook}`);
}
assert.match(referenceCss, /\.reference-board\s*\{[^}]*background:\s*var\(--reference-field\);/s, "the reference must use an invisible editorial grid");
assert.doesNotMatch(referenceCss, /background-image\s*:/, "the reference must not draw background grid lines");
assert.doesNotMatch(libraryCss, /\.reference-/, "the reusable library stylesheet must not absorb reference composition");

const canonicalDemos = ["docs/home.mjs", "docs/manual.mjs", "docs/reference.mjs"]
  .map((file) => siteDemos[file]).join("\n");
assert.match(canonicalDemos, /255, 0, 255/, "canonical docs must retain magenta as their one accent");
assert.doesNotMatch(canonicalDemos, /(?:255, 0, 0|0, 255, 0|0, 0, 255|0, 255, 255|255, 255, 0)/, "canonical docs must not combine magenta with another RGB/CMY accent");

console.log(`blocks.system site — ok (${pages.length} pages, ${exampleDirectories.length} examples)`);
