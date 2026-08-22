import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startBrowserHarness } from "./support/browser-harness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const browser = await startBrowserHarness(root, { width: 900, height: 700 });

try {
  const result = await browser.protocol.send("Runtime.evaluate", {
    expression: `(async () => {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/blocks.system.css";
      document.head.append(stylesheet);
      await new Promise((done) => { stylesheet.onload = done; });

      const { createBlocksSystem } = await import("/blocks.system.mjs?auto-fit-test");
      const field = document.createElement("main");
      field.style.width = "600px";
      field.style.height = "534px";
      document.body.replaceChildren(field);

      const blocks = createBlocksSystem({ layout: "fixed-grid", draggable: false });
      blocks.attach(field).setGrid(2, 4);
      const block = blocks.add(
        '<div style="font: 16px/24px sans-serif"><p>Een</p><p>Twee</p><p>Drie</p><p>Vier</p><p>Vijf</p></div>',
        { id: "article", title: "Artikel", menu: { close: false, minimize: false } }
      ).span(1, 1);
      const fixedMedia = blocks.add(
        '<div style="font: 16px/24px sans-serif">Vaste media-uitsnede</div>',
        { id: "media", title: "Media", menu: { close: false, minimize: false } }
      ).span(1, 3);

      const before = {
        rows: blocks.exportLayout().blocks[0].span[1],
        overflow: block.content.scrollHeight - block.content.clientHeight
      };
      const allMeasurement = blocks.fitHeight();
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const afterAll = {
        rows: blocks.exportLayout().blocks.map((entry) => entry.span[1]),
        overflow: block.content.scrollHeight - block.content.clientHeight
      };

      block.span(1, 1);
      fixedMedia.span(1, 3);
      const selectedMeasurement = blocks.fitHeight(["article"]);
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      const afterSelected = {
        rows: blocks.exportLayout().blocks.map((entry) => entry.span[1]),
        overflow: block.content.scrollHeight - block.content.clientHeight
      };
      return { before, allMeasurement, afterAll, selectedMeasurement, afterSelected };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  assert.ok(result.result.value.before.overflow > 1, "de proefinhoud moet eerst aantoonbaar te hoog zijn");
  assert.deepEqual(result.result.value.allMeasurement, [
    { id: "article", columns: 1, rows: 2, changed: true },
    { id: "media", columns: 1, rows: 1, changed: true }
  ]);
  assert.deepEqual(result.result.value.afterAll, { rows: [2, 1], overflow: 0 });
  assert.deepEqual(result.result.value.selectedMeasurement, [
    { id: "article", columns: 1, rows: 2, changed: true }
  ]);
  assert.deepEqual(result.result.value.afterSelected, { rows: [2, 3], overflow: 0 });
  browser.assertNoPageErrors();
  console.log("blocks.system auto-fit — volledige en op ID geselecteerde systeemmeting bewaren hun contract OK");
} finally {
  await browser.close();
}
