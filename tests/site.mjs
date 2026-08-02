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

const guideFiles = ["docs/guide.html", "docs/guide-blocks.html", "docs/guide-finish.html"];
const guidePages = await Promise.all(guideFiles.map(function (file) {
  return readFile(resolve(root, file), "utf8");
}));
for (const [index, html] of guidePages.entries()) {
  assert.match(html, /class="docs-pagination"/, `${guideFiles[index]} needs the shared pager`);
  for (const page of ["guide.html", "guide-blocks.html", "guide-finish.html"]) {
    assert.ok(html.includes(`href="${page}"`), `${guideFiles[index]} must link to ${page}`);
  }
}
assert.match(guidePages[0], /guide 01 · start/, "guide page one must be the start");
assert.match(guidePages[1], /guide 02 · middle/, "guide page two must be the middle");
assert.match(guidePages[2], /guide 03 · end/, "guide page three must be the end");

for (const [file, content] of [["README.md", readme], ["README_NL.md", readmeNl], ...guideFiles.map(function (file, index) { return [file, guidePages[index]]; })]) {
  assert.doesNotMatch(content, /const\s+(?!block)[A-Za-z_$][\w$]*\s*=\s*blocks(?:\.system)?\.add\(/, `${file} must prefix returned controllers with block`);
}
assert.match(readme, /import \{ system as blocks \}/, "README.md must alias the shared system to blocks");
assert.match(readmeNl, /import \{ system as blocks \}/, "README_NL.md must alias the shared system to blocks");

const manifest = JSON.parse(await readFile(resolve(root, "docs", "blocks.system.manifest.json"), "utf8"));
const packageData = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const siteCss = await readFile(resolve(root, "docs", "style.css"), "utf8");
const boardCss = await readFile(resolve(root, "docs", "board.css"), "utf8");
const systemCss = await readFile(resolve(root, "docs", "system.css"), "utf8");
const examplesCss = await readFile(resolve(root, "docs", "examples.css"), "utf8");
const manualCss = await readFile(resolve(root, "docs", "manual.css"), "utf8");
const referenceCss = await readFile(resolve(root, "docs", "reference.css"), "utf8");
const exampleCss = await readFile(resolve(root, "examples", "example.css"), "utf8");
const libraryCss = await readFile(resolve(root, "blocks.system.css"), "utf8");
const systemHtml = await readFile(resolve(root, "docs", "system.html"), "utf8");
const examplesHtml = await readFile(resolve(root, "docs", "examples.html"), "utf8");
const apiHtml = await readFile(resolve(root, "docs", "api.html"), "utf8");
const manualHtml = await readFile(resolve(root, "docs", "manual.html"), "utf8");
const siteDemoFiles = [
  "demo.mjs",
  "docs/board.mjs",
  "docs/system.mjs",
  "docs/examples.mjs",
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
for (const file of ["demo.mjs", "examples/basic-grid/demo.mjs", "examples/mixed-content/demo.mjs", "examples/custom-adapter/demo.mjs"]) {
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
assert.match(libraryCss, /\.blocks-system-surface\[data-draggable="true"\]\s+\.blocks-system-object:hover\s*\{[^}]*outline:\s*3px solid var\(--blocks-ink-color\);[^}]*outline-offset:\s*-3px;/s, "draggable blocks must expose a full non-layout-shifting hover frame");
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
assert.match(siteCss, /\.demo-layout\s*\{[^}]*746px[^}]*max-width:\s*1020px;/s, "the showcase field must preserve the original compact width rhythm");
assert.match(siteCss, /#field\s*\{[^}]*--blocks-demo-row-size:\s*110px;[^}]*height:\s*auto;[^}]*min-height:\s*0;/s, "the showcase must grow instead of crushing demo content into short rows");
assert.match(siteCss, /#field\.blocks-system-surface\[data-snap="true"\]\s*\{[^}]*grid-template-rows:\s*repeat\(var\(--blocks-rows\),\s*var\(--blocks-demo-row-size\)\);/s, "every showcase row must use the same fixed grid unit");
assert.match(siteCss, /#field \[data-block-object="canvas"\] \.blocks-system-content\s*\{[^}]*position:\s*relative;/s, "the showcase canvas needs a bounded content host");
assert.match(siteCss, /\.demo-canvas\s*\{[^}]*position:\s*absolute;[^}]*inset:\s*var\(--blocks-content-padding\);[^}]*max-height:\s*none;/s, "the showcase canvas must remain inside its block content area");
assert.match(siteCss, /\.native-controls\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*100%;/s, "native controls must remain inside their block content area");
assert.match(siteCss, /@media \(max-width: 560px\)[\s\S]*--block-column:\s*auto !important;[\s\S]*--block-row:\s*auto !important;[\s\S]*--block-span-columns:\s*1 !important;[\s\S]*--block-span-rows:\s*1 !important;/, "the mobile showcase must return blocks to automatic single grid units");
assert.ok(siteDemos["demo.mjs"].includes("blocks.setGrid(8, 4)"), "the showcase must expose the original eight-column rhythm");
assert.ok(siteDemos["demo.mjs"].includes("blockCanvas.span(2, 1)"), "the showcase must demonstrate a wider block");
assert.ok(siteDemos["demo.mjs"].includes("blockCustom.span(2, 2)"), "the showcase must demonstrate a taller block");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes('blockItem.variant = "magenta"'), "the basic grid must demonstrate magenta as its single explicit variant");
assert.ok(siteDemos["examples/basic-grid/demo.mjs"].includes("blockItem.minimized = index === 1"), "the basic grid must demonstrate a restorable minimized block");
assert.ok(["blockHtml.place(1, 1)", "blockCanvas.place(3, 2)", "blockCustom.place(7, 1)", "blockControls.place(5, 4)"].every(function (line) { return siteDemos["demo.mjs"].includes(line); }), "the showcase must preserve deliberate empty grid cells");
assert.match(systemHtml, /<option value="8,6" selected>8 × 6<\/option>/, "the docs prototype must start from the reference eight-by-six board");
assert.ok(siteDemos["docs/system.mjs"].includes("minimized: true"), "the docs prototype must keep its minimized navigation experiment");
assert.ok(siteDemos["docs/system.mjs"].includes("await docsSystem.mount"), "the docs prototype must demonstrate the adapter contract through the real system");
assert.match(boardCss, /\.docs-board-surface/, "one-screen docs pages must share one isolated board stylesheet");
assert.match(boardCss, /@media \(max-width: 560px\)[\s\S]*--blocks-columns:\s*1 !important;[\s\S]*grid-template-columns:\s*1fr;/, "shared docs boards must collapse to one narrow column");
assert.match(systemCss, /\.system-board/, "the system page must keep only its page-specific board rules");
assert.match(systemCss, /\.prototype-link\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;[^}]*align-content:\s*center;/s, "short system links must center a compact horizontal layout");
assert.match(systemCss, /\.prototype-canvas,\s*\.prototype-reference\s*\{[^}]*min-height:\s*0;[^}]*max-height:\s*100%;/s, "intrinsic system media must be allowed to shrink and center inside its cell");
assert.match(examplesCss, /\.examples-board/, "the examples page must keep only its page-specific board rules");
assert.match(examplesCss, /\.example-actions\s*\{[^}]*grid-column:\s*2;[^}]*grid-row:\s*1 \/ span 2;/s, "example actions must remain visible beside compact route content");
assert.doesNotMatch(examplesCss, /\.example-live(?:-board)?/, "the examples page must not recreate nested live windows");
assert.match(examplesHtml, /<body class="docs-board-body examples-page">/, "the examples composition needs an isolated page scope");
assert.match(examplesHtml, /<h1 id="examples-title"><span>examples<\/span><em>small systems, clearly seen\.<\/em><\/h1>/, "the examples masthead must remain a restrained typographic statement");
assert.match(examplesHtml, /13 blocks · 1 minimized/, "the flat examples board must expose all direct blocks in its initial status");
assert.match(examplesHtml, /start → combine → extend \/ 13 grid cells intentionally empty/, "the examples footer must name the deliberate empty grid space");
assert.match(examplesCss, /--accent-magenta:\s*rgb\(255, 0, 255\);/, "the examples composition must expose magenta as its one accent");
for (const color of ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)", "rgb(0, 255, 255)", "rgb(255, 255, 0)"]) {
  assert.ok(!examplesCss.includes(color) && !siteDemos["docs/examples.mjs"].includes(color), `the examples composition combines magenta with ${color}`);
}
assert.match(examplesCss, /\.examples-page \.docs-board-toolbar\s*\{[^}]*grid-template-columns:[^}]*border-bottom:\s*1px solid var\(--ink\);/s, "the examples masthead must keep its quiet asymmetric construction line");
assert.match(examplesCss, /\.examples-board\s*\{[^}]*--blocks-gap:\s*6px;[^}]*border:\s*1px solid var\(--ink\);/s, "the examples board must keep the restrained system grid");
assert.ok(["the grid is a decision.", "content is content.", "extend the contract. not the core."].every(function (statement) {
  return siteDemos["docs/examples.mjs"].includes(statement);
}), "each learning path must carry its own statement");
assert.match(siteDemos["docs/examples.mjs"], /id:\s*"basic-4"[\s\S]*?variant:\s*"magenta"/, "the examples page must use magenta for its single variant proof");
assert.match(siteDemos["docs/examples.mjs"], /createDocsBoard\(\{ system: examplesSystem, closeable: true \}\)/, "the examples page must expose the real close control on every block");
assert.match(siteDemos["docs/board.mjs"], /if \(!blocks\[index\]\?\.element\.isConnected\) mountBlock\(spec, index\);/, "docs reset must remount a block removed by its close control");
assert.match(siteDemos["docs/board.mjs"], /blocks\.forEach\(\(block\) => board\.appendChild\(block\.element\)\);/, "docs reset must restore the canonical DOM reading order after close");
assert.doesNotMatch(examplesCss, /--statement-accent|border-left:\s*5px/, "example blocks must not contain vertical color strips");
assert.doesNotMatch(libraryCss, /\.docs-board-surface|\.system-board|\.examples-board/, "the reusable library stylesheet must not absorb docs page composition");
assert.doesNotMatch(examplesHtml, /<iframe\b/i, "the examples index must use live systems instead of passive iframe cards");
assert.equal((siteDemos["docs/examples.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the examples page must use one shared blocks system");
assert.doesNotMatch(siteDemos["docs/examples.mjs"], /data-live-example|example-live-board|blocksBasic|blocksMixed|blocksAdapter/, "the examples page must not create nested block systems");
for (const directBlock of ["basic-1", "basic-2", "basic-3", "basic-4", "mixed-html", "mixed-canvas", "mixed-custom", "adapter-counter"]) {
  assert.ok(siteDemos["docs/examples.mjs"].includes(`id: "${directBlock}"`), `the flat examples board misses ${directBlock}`);
}
assert.ok(siteDemos["docs/examples.mjs"].includes('await examplesSystem.mount("example-counter"'), "the shared examples board must include a live adapter");
for (const example of ["basic-grid", "mixed-content", "custom-adapter"]) {
  assert.ok(siteDemos["docs/examples.mjs"].includes(`../examples/${example}/`), `the examples board must link to the ${example} standalone page`);
  assert.ok(siteDemos["docs/examples.mjs"].includes(`../examples/${example}/demo.mjs`), `the examples board must link to the ${example} source module`);
  assert.match(standaloneExamples[example], /href="\.\.\/\.\.\/docs\/examples\.html"/, `${example} must return to the examples learning path`);
  assert.match(standaloneExamples[example], /href="demo\.mjs" download/, `${example} must offer its copyable module explicitly`);
}
assert.equal((siteDemos["docs/examples.mjs"].match(/demo\.mjs" download/g) || []).length, 3, "each examples route must explicitly download its local source module");

assert.match(manualHtml, /<body class="manual-page">/, "the experimental manual needs an isolated page scope");
assert.match(manualHtml, /id="manual-board"/, "the experimental manual needs one shared board");
assert.match(manualHtml, /href="api\.html">open the complete reference/, "the manual must lead to its complete reference owner");
assert.match(manualHtml, /<li><a href="\.\.\/index\.html">home<\/a><\/li>[\s\S]*manual[\s\S]*reference[\s\S]*source/, "the manual must use the four-item shared navigation");
assert.equal((siteDemos["docs/manual.mjs"].match(/createBlocksSystem\(/g) || []).length, 1, "the experimental manual must use one shared blocks system");
assert.equal((siteDemos["docs/manual.mjs"].match(/^(?:addBlock|const blockCanvas = addBlock)\(\{/gm) || []).length, 15, "the canonical manual must keep its complete direct-block composition");
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
